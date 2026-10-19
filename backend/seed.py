import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine

def init_clean_db():
    print("Initializing clean database schema (no mock data)...")
    Base.metadata.create_all(bind=engine)
    print("Database ready for production/business operations.")

if __name__ == "__main__":
    init_clean_db()
