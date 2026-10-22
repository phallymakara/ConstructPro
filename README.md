# ConstructPro

Project and Stock Management System for Window and House Material Manufacturing and Installation.

## Overview

ConstructPro is a specialized operations platform engineered for window fabricators, door manufacturers, and building material contractors. It coordinates the entire workflow from initial customer inquiries and quotations to bill of materials (BOM) calculations, inventory reservations, workshop fabrication, job site delivery, and final installation.

## Core Capabilities

### Project Lifecycle Workflow
- Multi-stage pipeline: Draft, Quotation, Approved, Material Preparation, Production, Ready for Delivery, Installation, Completed, and Cancelled.
- Status transitions with automated milestone timestamp tracking.
- Site address and installation schedule management.

### Quotation and Estimating
- Dynamic quotation generation with customer associations.
- Itemized pricing, dimensions, specifications, and discount calculations.
- Seamless conversion of approved quotations into operational projects.

### Material and Inventory Control
- Comprehensive material catalog supporting profiles, glass, seals, hardware, accessories, and panels.
- Real-time stock level monitoring with physical balance and reserved allocation tracking.
- Automated safety stock alerts to prevent production bottlenecks.
- Complete audit trail of stock movements: Receipts, Reservations, Releases, Issues, Wastage, Returns, and Adjustments.

### Bill of Materials (BOM) and Workshop Production
- Automatic material requirement calculation based on project dimensions and specifications.
- Material allocation and reservation prior to production release.
- Production stage progress monitoring: cutting, assembly, glazing, and quality inspection.

### Purchasing and Supplier Management
- Supplier directory with contact points and payment term records.
- Purchase order creation, status tracking, and automated stock intake upon receipt.

### Customer Directory
- Customer profiles with communication history, project links, and quotation archives.

### Reports and Operational Analytics
- Project completion metrics and progress tracking.
- Inventory valuation and low-stock analysis.
- Purchasing volume and financial summaries.

## System Architecture

The platform is designed with a decoupled client-server architecture:

- Frontend: Single-page application built with React, TypeScript, TanStack Router, and Lucide icons.
- Backend: High-performance REST API built with FastAPI, SQLAlchemy 2.0, and Pydantic v2.
- Database: PostgreSQL 16 containerized via Docker Compose, with SQLite fallback support for local testing.

## Directory Structure

```text
ConstructPro/
├── docker-compose.yml          # Container configuration (PostgreSQL, backend, frontend)
├── docker-compose.dev.yml      # Development database container (PostgreSQL only)
├── docker/
│   ├── backend/
│   │   └── Dockerfile.dev      # Development container for FastAPI backend
│   └── frontend/
│       └── Dockerfile.dev      # Development container for React frontend
├── backend/
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (projects, materials, quotations, etc.)
│   │   ├── core/               # Configuration, database connection, and settings
│   │   ├── models/             # SQLAlchemy ORM entities
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Business logic layer
│   │   └── main.py             # FastAPI entry point
│   ├── pyproject.toml          # Python dependencies and packaging configuration
│   ├── main.py                 # Backend launcher with auto-port conflict detection
│   └── seed.py                 # Schema initialization utility
├── frontend/
│   ├── src/
│   │   ├── controllers/        # State management hooks and data fetching logic
│   │   ├── models/             # TypeScript domain definitions and API client
│   │   ├── utils/              # Export templates & PDF generation
│   │   ├── views/
│   │   │   ├── components/     # Reusable UI elements (Header, Sidebar, Modals)
│   │   │   └── pages/          # Application views (Projects, Materials, etc.)
│   │   ├── index.css           # Design system styles and custom properties
│   │   ├── router.tsx          # TanStack Router configuration
│   │   └── main.tsx            # React application entry point
│   ├── package.json            # Node.js dependencies and build scripts
│   └── vite.config.ts          # Vite build configuration
└── Documents/                  # Product specifications and documentation
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (version 20 LTS or higher recommended)
- Python (version 3.13 or higher)
- uv package manager (recommended) or standard Python virtual environment

### 1. Database Setup

Start only the PostgreSQL database service for local development (enables fast live reload for backend & frontend on host):

```bash
docker compose -f docker-compose.dev.yml up -d
```

*(Alternatively, to run the entire stack including backend and frontend in containers, run `docker compose up -d`)*

This launches a PostgreSQL container named `constructpro_db` on port `5432`.

To verify database status:

```bash
docker compose -f docker-compose.dev.yml ps
```

### 2. Backend Setup

Navigate to the `backend` directory:

```bash
cd backend
```

Create and activate a virtual environment:

Using uv:
```bash
uv venv
.venv\Scripts\activate   # Windows PowerShell
# or: source .venv/bin/activate (Linux/macOS)
uv sync
```

Or using standard pip:
```bash
python -m venv .venv
.venv\Scripts\activate   # Windows PowerShell
# or: source .venv/bin/activate (Linux/macOS)
pip install -r pyproject.toml
```

Configure environment variables:
Create a `.env` file in the `backend` directory if custom parameters are required:

```env
PROJECT_NAME="ConstructPro API"
API_V1_STR="/api/v1"
DATABASE_URL="postgresql://constructpro:constructpro_dev@localhost:5432/constructpro"
```

Start the FastAPI application:

Using uv (recommended with auto port conflict detection):
```bash
uv run python main.py
```

Or from the repository root:
```bash
uv run --directory backend python main.py
```

Or using uvicorn directly:
```bash
uv run uvicorn app.main:app --reload --port 8001
```

The interactive API documentation is available at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`
- Health check: `http://localhost:8001/health`

### 3. Frontend Setup

In a separate terminal, navigate to the `frontend` directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

## Configuration Options

### Backend Settings

| Environment Variable | Default Value | Description |
|----------------------|---------------|-------------|
| `PROJECT_NAME` | `ConstructPro API` | Application title reported in OpenAPI docs |
| `API_V1_STR` | `/api/v1` | URL prefix for version 1 API endpoints |
| `DATABASE_URL` | `postgresql://constructpro:constructpro_dev@localhost:5432/constructpro` | Connection string for PostgreSQL database |

### Frontend Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Compiles TypeScript and creates optimized production bundle |
| `npm run lint` | Runs Oxlint linter across JavaScript/TypeScript code |
| `npm run preview` | Previews production build locally |

## Development Guidelines

- Consistent Design: Follow the existing color tokens, spacing scale, and border styles defined in `frontend/src/index.css`.
- Error Handling: Ensure input errors display inline near the responsible fields with appropriate validation styling.
- Backend Validation: Use Pydantic schemas to validate all payloads prior to database persistence.
- Data Consistency: Maintain transactional integrity during stock movements and project workflow transitions.
