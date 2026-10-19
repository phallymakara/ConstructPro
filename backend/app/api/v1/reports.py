from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.entities import (
    Project, Material, ProjectMaterialRequirement, StockMovement, Customer, ProjectStatus
)
from app.schemas.schemas import (
    ProjectProfitabilityReportItem, MaterialUsageReportItem, DelayedProjectReportItem
)

router = APIRouter()

@router.get("/profitability", response_model=List[ProjectProfitabilityReportItem])
def get_profitability_report(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        contract = p.contract_amount or 0.0
        est_cost = p.estimated_cost or 0.0
        # If actual cost is recorded use it, otherwise use estimated cost
        cost_to_use = p.actual_cost if (p.actual_cost and p.actual_cost > 0) else est_cost
        gross_profit = round(contract - cost_to_use, 2)
        margin_pct = round((gross_profit / contract * 100.0) if contract > 0 else 0.0, 1)

        results.append(ProjectProfitabilityReportItem(
            project_id=p.id,
            project_number=p.project_number,
            project_name=p.project_name,
            customer_name=p.customer.name if p.customer else "Unknown",
            status=p.status,
            contract_amount=round(contract, 2),
            estimated_cost=round(est_cost, 2),
            actual_cost=round(p.actual_cost or 0.0, 2),
            gross_profit=gross_profit,
            profit_margin_percent=margin_pct
        ))
    return results

@router.get("/material-usage", response_model=List[MaterialUsageReportItem])
def get_material_usage_report(db: Session = Depends(get_db)):
    materials = db.query(Material).order_by(Material.category.asc(), Material.name.asc()).all()
    results = []

    for m in materials:
        # Sum Issue and Wastage movements
        issue_sum = db.query(func.sum(StockMovement.quantity)).filter(
            StockMovement.material_id == m.id,
            StockMovement.movement_type == "Issue"
        ).scalar() or 0.0

        waste_sum = db.query(func.sum(StockMovement.quantity)).filter(
            StockMovement.material_id == m.id,
            StockMovement.movement_type == "Wastage"
        ).scalar() or 0.0

        results.append(MaterialUsageReportItem(
            material_id=m.id,
            material_code=m.code,
            material_name=m.name,
            category=m.category,
            unit=m.unit,
            current_stock=m.current_stock or 0.0,
            reserved_stock=m.reserved_stock or 0.0,
            total_consumed_qty=round(issue_sum, 2),
            total_wastage_qty=round(waste_sum, 2)
        ))
    return results

@router.get("/delays", response_model=List[DelayedProjectReportItem])
def get_delays_report(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Active projects where deadline has passed
    delayed_projects = db.query(Project).filter(
        Project.deadline_date != None,
        Project.deadline_date < now,
        Project.status.notin_([ProjectStatus.COMPLETED.value, ProjectStatus.CANCELLED.value])
    ).all()

    results = []
    for p in delayed_projects:
        days_over = (now - p.deadline_date).days if p.deadline_date else 0
        results.append(DelayedProjectReportItem(
            project_id=p.id,
            project_number=p.project_number,
            project_name=p.project_name,
            customer_name=p.customer.name if p.customer else "Unknown",
            status=p.status,
            deadline_date=p.deadline_date,
            days_overdue=days_over,
            assigned_manager=p.assigned_manager
        ))
    return results
