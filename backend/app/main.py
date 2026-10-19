import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1 import api_router

logger = logging.getLogger("uvicorn.error")

def init_db(retries: int = 10, delay: int = 2):
    for i in range(retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables initialized successfully.")
            return
        except Exception as e:
            logger.warning(f"Database connection attempt {i+1}/{retries} failed: {e}. Retrying in {delay}s...")
            time.sleep(delay)
    raise RuntimeError("Failed to connect to the database after multiple retries.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize clean database schema on startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ConstructPro - Window & House Material Manufacturing and Installation Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API V1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
