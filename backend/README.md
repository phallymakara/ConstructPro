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

Using uv (recommended - includes automatic port conflict detection):

```bash
uv run python main.py
```

Or using uvicorn directly:

```bash
uv run uvicorn app.main:app --reload --port 8001
```

Or using an activated virtual environment:

```bash
python main.py
```

Access API documentation at `http://localhost:8001/docs`.
