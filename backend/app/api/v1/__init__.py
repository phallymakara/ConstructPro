from fastapi import APIRouter
from app.api.v1 import customers, materials, projects, quotations, dashboard, purchasing, reports

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Quotations"])
api_router.include_router(materials.router, prefix="/materials", tags=["Materials & Stock"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers"])
api_router.include_router(purchasing.router, prefix="/purchasing", tags=["Purchasing & Suppliers"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Analytics"])
