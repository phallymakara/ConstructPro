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
            # Ensure new columns exist on existing databases
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            table_names = inspector.get_table_names()

            with engine.begin() as conn:
                if "materials" in table_names:
                    existing_cols = [c["name"] for c in inspector.get_columns("materials")]
                    if "barcode" not in existing_cols:
                        conn.execute(text("ALTER TABLE materials ADD COLUMN barcode VARCHAR(100)"))
                    if "product_type" not in existing_cols:
                        conn.execute(text("ALTER TABLE materials ADD COLUMN product_type VARCHAR(100) DEFAULT 'Standard'"))
                    if "category_id" not in existing_cols:
                        conn.execute(text("ALTER TABLE materials ADD COLUMN category_id INTEGER"))

                if "product_categories" in table_names:
                    count_res = conn.execute(text("SELECT count(*) FROM product_categories")).scalar()
                    if count_res == 0:
                        default_categories = [
                            ("Profiles", "Aluminium profiles, window & door frames, tracks"),
                            ("Glass", "Tempered, laminated, double-glazed & clear glass"),
                            ("Hardware", "Locks, handles, hinges, multi-point gears & rollers"),
                            ("Rubber & Seals", "EPDM weather seals, glazing rubber, silicone"),
                            ("Accessories", "Screws, anchors, corner connectors & end caps"),
                            ("Panels", "Aluminium composite panels, louvers & infill sheets"),
                        ]
                        for name, desc in default_categories:
                            conn.execute(
                                text("INSERT INTO product_categories (name, description, created_at) VALUES (:n, :d, CURRENT_TIMESTAMP)"),
                                {"n": name, "d": desc}
                            )
                        logger.info("Default product categories seeded.")

                    # Synchronize materials category_id if null
                    conn.execute(text("""
                        UPDATE materials 
                        SET category_id = (SELECT id FROM product_categories WHERE product_categories.name = materials.category LIMIT 1)
                        WHERE category_id IS NULL AND category IS NOT NULL
                    """))

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
