from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.entities import (
    Project, Quotation, Material, ProjectMaterialRequirement, ProjectStatus, QuotationStatus
)
from app.schemas.schemas import DashboardSummaryOut

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # Projects
    all_projects = db.query(Project).all()
    total_projects = len(all_projects)
    active_projects = sum(
        1 for p in all_projects
        if p.status not in [ProjectStatus.COMPLETED.value, ProjectStatus.CANCELLED.value, ProjectStatus.DRAFT.value]
    )
    completed_projects = sum(1 for p in all_projects if p.status == ProjectStatus.COMPLETED.value)
    delayed_projects = sum(
        1 for p in all_projects
        if p.deadline_date and p.deadline_date < now and p.status != ProjectStatus.COMPLETED.value
    )

    # Quotations
    pending_quotes = db.query(Quotation).filter(
        Quotation.status.in_([QuotationStatus.DRAFT.value, QuotationStatus.SENT.value])
    ).count()

    # Financials
    total_contract_value = sum((p.contract_amount or 0.0) for p in all_projects)
    total_estimated_costs = sum((p.estimated_cost or 0.0) for p in all_projects)
    projected_profit = max(0.0, total_contract_value - total_estimated_costs)

    # Materials
    materials = db.query(Material).all()
    low_stock_count = sum(1 for m in materials if (m.current_stock or 0.0) <= (m.minimum_stock or 0.0))

    shortage_count = db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.status == "Shortage"
    ).count()

    return DashboardSummaryOut(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        delayed_projects=delayed_projects,
        pending_quotations=pending_quotes,
        total_contract_value=round(total_contract_value, 2),
        total_estimated_costs=round(total_estimated_costs, 2),
        projected_profit=round(projected_profit, 2),
        low_stock_count=low_stock_count,
        shortage_count=shortage_count
    )
