import asyncio
import datetime
import json
import logging
import os
from pathlib import Path
from arq.connections import RedisSettings
import redis.asyncio as aioredis

from backend.analyzer.core import run_analysis
from backend.database import AsyncSessionLocal, AnalysisModel
from backend.generators import generate_tailwind_config, generate_react_components, generate_design_md

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis settings
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_SETTINGS = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)

# File paths
BASE = Path(__file__).resolve().parent.parent
ANALYSES_DIR = BASE / "analyses"
ANALYSES_DIR.mkdir(exist_ok=True)

def get_analysis_dir(analyze_id: str):
    d = ANALYSES_DIR / analyze_id
    d.mkdir(parents=True, exist_ok=True)
    return d

async def run_analysis_task(ctx, analyze_id: str, url: str):
    logger.info(f"Starting analysis task for {analyze_id} ({url})")
    
    redis_conn = ctx.get('pubsub') or ctx['redis']
    d = get_analysis_dir(analyze_id)
    
    loop = asyncio.get_running_loop()
    progress_tasks = set()
    
    def progress_callback(stage: str, pct: int, detail: str = ""):
        # Define the async operation to update SQLite and publish to Redis
        async def update_progress():
            try:
                # 1. Update SQLite
                async with AsyncSessionLocal() as session:
                    db_analysis = await session.get(AnalysisModel, analyze_id)
                    if db_analysis:
                        db_analysis.stage = stage
                        db_analysis.progress = pct
                        db_analysis.detail = detail
                        db_analysis.status = "running"
                        await session.commit()
                
                # 2. Publish to Redis Pub/Sub
                event_data = {
                    "status": "running",
                    "progress": pct,
                    "stage": stage,
                    "detail": detail,
                }
                await redis_conn.publish(f"analysis_events:{analyze_id}", json.dumps(event_data))
            except Exception as e:
                logger.error(f"Error in progress_callback update: {e}")

        # Schedule the coroutine on the running loop and keep a strong reference
        task = loop.create_task(update_progress())
        progress_tasks.add(task)
        task.add_done_callback(progress_tasks.discard)

    try:
        # Run the async analysis pipeline
        result = await run_analysis(url, progress_callback)
        
        # Await any remaining progress updates before finalizing
        if progress_tasks:
            await asyncio.gather(*progress_tasks, return_exceptions=True)
        
        if "error" in result:
            logger.error(f"Analysis task failed for {analyze_id}: {result['error']}")
            async with AsyncSessionLocal() as session:
                db_analysis = await session.get(AnalysisModel, analyze_id)
                if db_analysis:
                    db_analysis.status = "error"
                    db_analysis.error = result["error"]
                    db_analysis.done = True
                    await session.commit()
            
            event_data = {
                "status": "error",
                "progress": 0,
                "error": result["error"],
                "done": True,
            }
            await redis_conn.publish(f"analysis_events:{analyze_id}", json.dumps(event_data))
            return

        # Save files to disk
        screenshot_bytes = result.pop("screenshot", b"")
        (d / "screenshot.png").write_bytes(screenshot_bytes)

        overlay_bytes = result.pop("screenshot_overlay", b"") or screenshot_bytes
        (d / "screenshot-overlay.png").write_bytes(overlay_bytes)

        tailwind_config = generate_tailwind_config(result)
        (d / "tailwind.config.js").write_text(tailwind_config, encoding="utf-8")

        react_components = generate_react_components(result)
        (d / "components.jsx").write_text(react_components, encoding="utf-8")

        design_tokens = result.get("design_tokens")
        if design_tokens:
            (d / "design-tokens.json").write_text(
                json.dumps(design_tokens, indent=2), encoding="utf-8"
            )

        md = generate_design_md(result)
        (d / "DESIGN.md").write_text(md, encoding="utf-8")
        result["design_md"] = md

        result_json = json.dumps(result, indent=2, default=str)
        (d / "result.json").write_text(result_json, encoding="utf-8")

        # Update database with complete data
        async with AsyncSessionLocal() as session:
            db_analysis = await session.get(AnalysisModel, analyze_id)
            if db_analysis:
                db_analysis.status = "complete"
                db_analysis.progress = 100
                db_analysis.done = True
                db_analysis.title = result.get("title", "")
                db_analysis.dna = result.get("dna", {})
                db_analysis.colors = {
                    "count": result.get("colors", {}).get("count", 0),
                    "palette": result.get("colors", {}).get("palette", {}),
                }
                db_analysis.typography = {
                    "families": result.get("typography", {}).get("families", []),
                    "primary_font": result.get("typography", {}).get("primary_font"),
                }
                db_analysis.components = [
                    c for c in result.get("components", [])
                    if isinstance(c, dict)
                ]
                db_analysis.patterns = result.get("patterns", [])
                db_analysis.layout = {
                    "responsive": result.get("layout", {}).get("responsive"),
                    "uses_grid": result.get("layout", {}).get("uses_grid"),
                    "uses_flexbox": result.get("layout", {}).get("uses_flexbox"),
                    "max_container_width": result.get("layout", {}).get("max_container_width"),
                }
                await session.commit()
                
        event_data = {
            "status": "complete",
            "progress": 100,
            "stage": "complete",
            "detail": "Analysis complete!",
            "done": True,
        }
        await redis_conn.publish(f"analysis_events:{analyze_id}", json.dumps(event_data))
        logger.info(f"Successfully completed analysis task for {analyze_id}")
        
    except Exception as e:
        logger.exception(f"Exception raised in analysis task {analyze_id}: {e}")
        # Await any remaining progress updates before finalizing the error state
        if progress_tasks:
            await asyncio.gather(*progress_tasks, return_exceptions=True)
            
        async with AsyncSessionLocal() as session:
            db_analysis = await session.get(AnalysisModel, analyze_id)
            if db_analysis:
                db_analysis.status = "error"
                db_analysis.error = str(e)
                db_analysis.done = True
                await session.commit()
                
        event_data = {
            "status": "error",
            "progress": 0,
            "error": str(e),
            "done": True,
        }
        await redis_conn.publish(f"analysis_events:{analyze_id}", json.dumps(event_data))

async def startup(ctx):
    # Setup standard redis.asyncio connection in arq context
    host = os.getenv("REDIS_HOST", "localhost")
    port = int(os.getenv("REDIS_PORT", 6379))
    ctx['pubsub'] = await aioredis.from_url(f"redis://{host}:{port}", decode_responses=True)
    logger.info("Worker Redis Pub/Sub client connected.")

async def shutdown(ctx):
    if 'pubsub' in ctx:
        await ctx['pubsub'].close()
        logger.info("Worker Redis Pub/Sub client disconnected.")

class WorkerSettings:
    functions = [run_analysis_task]
    redis_settings = REDIS_SETTINGS
    on_startup = startup
    on_shutdown = shutdown
