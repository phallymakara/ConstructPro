# ConstructPro Backend API

FastAPI backend service for ConstructPro project and stock management system.

## Overview

Provides RESTful endpoints for projects, materials, stock movements, quotations, customers, suppliers, purchasing, and business analytics.

## Tech Stack

- Python 3.13+
- FastAPI
- SQLAlchemy 2.0
- Pydantic v2
- PostgreSQL (via psycopg)
- Uvicorn

## Quickstart

### 1. Database

Ensure PostgreSQL is running:

```bash
docker compose up -d
```

### 2. Virtual Environment and Dependencies

Using uv:

```bash
uv venv
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate (Linux/macOS)
uv sync
```

Or using pip:

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate (Linux/macOS)
pip install -r pyproject.toml
```

### 3. Run the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

Access API documentation at `http://localhost:8000/docs`.
