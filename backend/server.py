import asyncio
import datetime
import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
from arq import create_pool
from arq.connections import RedisSettings

from backend.database import init_db, AsyncSessionLocal, AnalysisModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE = Path(__file__).resolve().parent.parent
ANALYSES_DIR = BASE / "analyses"
ANALYSES_DIR.mkdir(exist_ok=True)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

def get_analysis_dir(analyze_id: str):
    d = ANALYSES_DIR / analyze_id
    d.mkdir(parents=True, exist_ok=True)
    return d

# --- Pydantic Schemas ---
class AnalyzePayload(BaseModel):
    url: str

# --- On-demand/startup migration logic ---
async def migrate_disk_analyses_to_db(db: AsyncSession):
    if not ANALYSES_DIR.exists():
        return
    for d in ANALYSES_DIR.iterdir():
        if d.is_dir():
            analyze_id = d.name
            db_analysis = await db.get(AnalysisModel, analyze_id)
            if not db_analysis:
                result_file = d / "result.json"
                if result_file.exists():
                    try:
                        data = json.loads(result_file.read_text(encoding="utf-8"))
                        db_analysis = AnalysisModel(
                            id=analyze_id,
                            url=data.get("url", ""),
                            status="complete",
                            progress=100,
                            stage="complete",
                            detail="Analysis complete!",
                            done=True,
                            title=data.get("title", ""),
                            dna=data.get("dna", {}),
                            colors={
                                "count": data.get("colors", {}).get("count", 0),
                                "palette": data.get("colors", {}).get("palette", {}),
                            },
                            typography={
                                "families": data.get("typography", {}).get("families", []),
                                "primary_font": data.get("typography", {}).get("primary_font"),
                            },
                            components=[
                                c for c in data.get("components", [])
                                if isinstance(c, dict)
                            ],
                            patterns=data.get("patterns", []),
                            layout={
                                "responsive": data.get("layout", {}).get("responsive"),
                                "uses_grid": data.get("layout", {}).get("uses_grid"),
                                "uses_flexbox": data.get("layout", {}).get("uses_flexbox"),
                                "max_container_width": data.get("layout", {}).get("max_container_width"),
                            }
                        )
                        db.add(db_analysis)
                        logger.info(f"Migrated analysis {analyze_id} from disk to DB.")
                    except Exception as e:
                        logger.error(f"Failed to migrate on-disk analysis {analyze_id}: {e}")
    await db.commit()

# --- DB Dependency ---
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    await init_db()
    
    # Migrate old directory runs into DB for seamless backwards compatibility
    async with AsyncSessionLocal() as db:
        await migrate_disk_analyses_to_db(db)
        
    # Connect to Redis
    app.state.redis_pool = await create_pool(RedisSettings(host=REDIS_HOST, port=REDIS_PORT))
    app.state.redis_client = await aioredis.from_url(f"redis://{REDIS_HOST}:{REDIS_PORT}", decode_responses=True)
    logger.info("FastAPI resources initialized.")
    yield
    # Cleanup Redis
    await app.state.redis_pool.close()
    await app.state.redis_client.close()
    logger.info("FastAPI resources cleaned up.")

app = FastAPI(lifespan=lifespan)

# --- API Routes ---

@app.get("/api/health")
async def api_health():
    return {"status": "ok", "service": "design-oracle-api"}

@app.post("/api/analyze")
async def api_analyze(payload: AnalyzePayload, db: AsyncSession = Depends(get_db)):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL manquante")

    analyze_id = str(uuid.uuid4())[:8]
    get_analysis_dir(analyze_id) # Prepare output directory
    
    # Create DB record in pending state
    status_record = AnalysisModel(
        id=analyze_id,
        url=url,
        status="pending",
        progress=0,
        stage="Enqueued",
        detail="Waiting for background worker...",
        done=False,
    )
    db.add(status_record)
    await db.commit()
    
    # Enqueue in ARQ worker queue
    await app.state.redis_pool.enqueue_job('run_analysis_task', analyze_id, url)
    return {"analyze_id": analyze_id, "status": "started"}

@app.get("/api/analyze/{analyze_id}/events")
async def api_analyze_events(analyze_id: str, db: AsyncSession = Depends(get_db)):
    validate_analyze_id(analyze_id)
    # Retrieve current/initial state from DB
    db_analysis = await db.get(AnalysisModel, analyze_id)
    if db_analysis is None:
        async def not_found_generator():
            yield f"event: error\ndata: {json.dumps({'error': 'Analysis not found'})}\n\n"
        return StreamingResponse(not_found_generator(), media_type="text/event-stream")

    async def event_generator():
        # Yield the current DB status immediately to start the connection
        initial_data = {
            "status": db_analysis.status,
            "progress": db_analysis.progress,
            "stage": db_analysis.stage,
            "detail": db_analysis.detail,
        }
        
        if db_analysis.status == "error":
            initial_data["error"] = db_analysis.error
            yield f"event: error\ndata: {json.dumps(initial_data)}\n\n"
            return
            
        yield f"event: progress\ndata: {json.dumps(initial_data)}\n\n"
        
        if db_analysis.done:
            yield f"event: complete\ndata: {json.dumps(initial_data)}\n\n"
            return

        # Subscribe to Pub/Sub for live status updates if not done
        pubsub = app.state.redis_client.pubsub()
        await pubsub.subscribe(f"analysis_events:{analyze_id}")
        
        last_progress = -1
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    data = json.loads(message["data"])
                    if data.get("status") == "error":
                        yield f"event: error\ndata: {json.dumps(data)}\n\n"
                        break
                    if data.get("progress") != last_progress or data.get("status") == "complete":
                        yield f"event: progress\ndata: {json.dumps(data)}\n\n"
                        last_progress = data["progress"]
                    if data.get("status") == "complete" or data.get("done"):
                        yield f"event: complete\ndata: {json.dumps(data)}\n\n"
                        break
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info(f"SSE Client disconnected from event stream for {analyze_id}")
        finally:
            await pubsub.unsubscribe(f"analysis_events:{analyze_id}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@app.get("/api/analyze/{analyze_id}/status")
async def api_analyze_status(analyze_id: str, db: AsyncSession = Depends(get_db)):
    validate_analyze_id(analyze_id)
    db_analysis = await db.get(AnalysisModel, analyze_id)
    if db_analysis is None:
        # Check files for backwards compatibility fallback
        d = ANALYSES_DIR / analyze_id
        if (d / "result.json").exists():
            return {"status": "complete", "done": True}
        raise HTTPException(status_code=404, detail="Analysis not found")

    status_dict = {
        "analyze_id": db_analysis.id,
        "url": db_analysis.url,
        "status": db_analysis.status,
        "progress": db_analysis.progress,
        "stage": db_analysis.stage,
        "detail": db_analysis.detail,
        "error": db_analysis.error,
        "done": db_analysis.done,
    }

    if db_analysis.status == "complete":
        status_dict.update({
            "title": db_analysis.title,
            "dna": db_analysis.dna,
            "colors": db_analysis.colors,
            "typography": db_analysis.typography,
            "components": db_analysis.components,
            "patterns": db_analysis.patterns,
            "layout": db_analysis.layout,
        })
    return status_dict

def validate_analyze_id(analyze_id: str):
    # Current IDs are 8-char alnum from uuid4()[:8]
    if not analyze_id or len(analyze_id) < 8:
        raise HTTPException(status_code=400, detail="Invalid analyze ID format")
    # Allow alphanumeric and hyphens (for potential full UUIDs in future)
    if not all(c.isalnum() or c == "-" for c in analyze_id):
        raise HTTPException(status_code=400, detail="Invalid analyze ID format")

@app.get("/api/analyze/{analyze_id}/result")
async def api_analyze_result(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    result_file = d / "result.json"
    if not result_file.exists():
        raise HTTPException(status_code=404, detail="Analysis not found or still running")
    data = await asyncio.to_thread(result_file.read_text, encoding="utf-8")
    return json.loads(data)

@app.get("/api/analyze/{analyze_id}/screenshot")
async def api_analyze_screenshot(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    screenshot_file = d / "screenshot.png"
    if not screenshot_file.exists():
        raise HTTPException(status_code=404, detail="Screenshot not available")
    return FileResponse(str(screenshot_file), media_type="image/png")

@app.get("/api/analyze/{analyze_id}/screenshot/overlay")
async def api_analyze_screenshot_overlay(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    overlay_file = d / "screenshot-overlay.png"
    if not overlay_file.exists():
        raise HTTPException(status_code=404, detail="Overlay not available")
    return FileResponse(str(overlay_file), media_type="image/png")

@app.get("/api/analyze/{analyze_id}/export/tailwind")
async def api_export_tailwind(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    tw_file = d / "tailwind.config.js"
    if not tw_file.exists():
        raise HTTPException(status_code=404, detail="Tailwind config not available")
    return FileResponse(
        str(tw_file),
        media_type="text/javascript",
        headers={"Content-Disposition": "attachment; filename=tailwind.config.js"}
    )

@app.get("/api/analyze/{analyze_id}/export/components")
async def api_export_react_components(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    comp_file = d / "components.jsx"
    if not comp_file.exists():
        raise HTTPException(status_code=404, detail="Components not available")
    return FileResponse(
        str(comp_file),
        media_type="text/jsx",
        headers={"Content-Disposition": "attachment; filename=components.jsx"}
    )

@app.get("/api/analyze/{analyze_id}/export/tokens")
async def api_export_tokens(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    tok_file = d / "design-tokens.json"
    if not tok_file.exists():
        raise HTTPException(status_code=404, detail="Tokens not available")
    return FileResponse(
        str(tok_file),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=design-tokens.json"}
    )

@app.get("/api/analyze/{analyze_id}/export/design.md")
async def api_export_design_md(analyze_id: str):
    validate_analyze_id(analyze_id)
    d = ANALYSES_DIR / analyze_id
    md_file = d / "DESIGN.md"
    if not md_file.exists():
        raise HTTPException(status_code=404, detail="Design doc not available")
    return FileResponse(
        str(md_file),
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=DESIGN.md"}
    )

@app.delete("/api/analyze/{analyze_id}")
async def api_delete_analysis(analyze_id: str, db: AsyncSession = Depends(get_db)):
    validate_analyze_id(analyze_id)
    from sqlalchemy import select
    stmt = select(AnalysisModel).where(AnalysisModel.id == analyze_id)
    res = await db.execute(stmt)
    analysis = res.scalar_one_or_none()
    if analysis:
        await db.delete(analysis)
        await db.commit()

    d = ANALYSES_DIR / analyze_id
    if d.exists():
        shutil.rmtree(str(d))
    return {"deleted": analyze_id}

async def cleanup_old_analyses(days: int = 7):
    """Delete analysis directories older than X days"""
    try:
        now = datetime.datetime.now().timestamp()
        cutoff = now - (days * 86400)

        if not ANALYSES_DIR.exists():
            return 0

        count = 0
        for d in ANALYSES_DIR.iterdir():
            if d.is_dir() and d.name != ".gitkeep":
                # Check directory mtime
                if d.stat().st_mtime < cutoff:
                    shutil.rmtree(str(d))
                    count += 1
        return count
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return 0

@app.post("/api/maintenance/cleanup")
async def api_maintenance_cleanup(days: int = 7):
    count = await cleanup_old_analyses(days)
    return {"deleted_count": count}

@app.get("/api/designs")
async def api_designs(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    stmt = select(AnalysisModel).order_by(AnalysisModel.created_at.desc())
    res = await db.execute(stmt)
    analyses_list = res.scalars().all()
    
    designs = []
    for a in analyses_list:
        designs.append({
            "id": a.id,
            "url": a.url,
            "title": a.title or "",
            "style": a.dna.get("style") if a.dna else None,
            "visual_score": a.dna.get("visual_score") if a.dna else None,
            "complexity": a.dna.get("complexity") if a.dna else None,
        })
    return designs

if __name__ == "__main__":
    import uvicorn
    reload = os.getenv("UVICORN_RELOAD", "1") == "1"
    uvicorn.run("backend.server:app", host="0.0.0.0", port=5000, reload=reload)
