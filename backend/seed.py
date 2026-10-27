import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine
from seed_khmer_data import seed_khmer_database

def init_clean_db():
    print("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    print("Database schema ready. Seeding initial data in Khmer...")
    seed_khmer_database()

if __name__ == "__main__":
    init_clean_db()
