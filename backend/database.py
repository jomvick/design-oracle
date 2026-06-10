import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime

DATABASE_URL = "sqlite+aiosqlite:///./analyses/analyses.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class AnalysisModel(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, index=True)
    url = Column(String, nullable=False)
    status = Column(String, default="pending")
    progress = Column(Integer, default=0)
    stage = Column(String, default="")
    detail = Column(String, default="")
    error = Column(String, nullable=True)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Scraped metadata & design system details
    title = Column(String, nullable=True)
    colors = Column(JSON, nullable=True)
    typography = Column(JSON, nullable=True)
    components = Column(JSON, nullable=True)
    patterns = Column(JSON, nullable=True)
    layout = Column(JSON, nullable=True)
    dna = Column(JSON, nullable=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # WAL mode and long timeout help with concurrent SQLite access
        await conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        await conn.exec_driver_sql("PRAGMA synchronous=NORMAL")
        await conn.exec_driver_sql("PRAGMA busy_timeout=10000")
