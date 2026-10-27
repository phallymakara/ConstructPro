FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for PostgreSQL driver and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv directly from official Astral binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency definitions
COPY pyproject.toml uv.lock* /app/

# Install dependencies using uv
RUN uv sync --no-dev --no-install-project

# Copy application source code and seed script
COPY . /app

# Finalize project install
RUN uv sync --no-dev

EXPOSE 8001

# Run with uvicorn in production mode (no auto-reload, multiple workers)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
