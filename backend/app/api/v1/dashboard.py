from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Project, Quotation, Material, ProjectMaterialRequirement, ProjectStatus, QuotationStatus,
    ProjectPayment, PurchaseOrder
)
from app.schemas.schemas import DashboardSummaryOut, DashboardShortageItem, DashboardUpcomingDelivery

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # 1. Projects
    all_projects = db.query(Project).all()
    total_projects = len(all_projects)
    active_projects = sum(
        1 for p in all_projects
        if p.status not in [ProjectStatus.COMPLETED.value, ProjectStatus.CANCELLED.value, "Canceled"]
    )
    completed_projects = sum(1 for p in all_projects if p.status == ProjectStatus.COMPLETED.value)
    delayed_projects = sum(
        1 for p in all_projects
        if p.status == ProjectStatus.OVERDUE.value or (
            p.deadline_date and p.deadline_date < now and p.status not in [ProjectStatus.COMPLETED.value, ProjectStatus.CANCELLED.value, "Canceled"]
        )
    )

    # 2. Quotations & Sales
    pending_quotes = db.query(Quotation).filter(
        Quotation.status.in_([QuotationStatus.DRAFT.value, QuotationStatus.SENT.value])
    ).count()

    total_contract_value = sum((p.contract_amount or 0.0) for p in all_projects)
    total_estimated_costs = sum((p.estimated_cost or 0.0) for p in all_projects)
    projected_profit = max(0.0, total_contract_value - total_estimated_costs)

    # Payments & Cash Collections
    all_payments = db.query(ProjectPayment).all()
    total_collected_cash = sum((pm.amount or 0.0) for pm in all_payments)
    total_receivable = max(0.0, total_contract_value - total_collected_cash)

    # 3. Materials & Inventory Valuation
    materials = db.query(Material).all()
    total_inventory_value = sum((m.current_stock or 0.0) * (m.unit_cost or 0.0) for m in materials)
    low_stock_count = sum(1 for m in materials if (m.current_stock or 0.0) <= (m.minimum_stock or 0.0))

    shortage_count = db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.status == "Shortage"
    ).count()

    shortage_materials = [
        m for m in materials if (m.current_stock or 0.0) <= (m.minimum_stock or 0.0)
    ]
    shortage_materials.sort(key=lambda m: (m.current_stock or 0.0) - (m.minimum_stock or 0.0))
    shortage_items_out = [
        DashboardShortageItem(
            id=m.id,
            code=m.code,
            name=m.name,
            category=m.category or "Profile",
            current_stock=round(m.current_stock or 0.0, 2),
            minimum_stock=round(m.minimum_stock or 0.0, 2),
            unit=m.unit or "m",
        )
        for m in shortage_materials[:5]
    ]

    # 4. Purchasing & Deliveries
    all_pos = db.query(PurchaseOrder).all()
    active_pos = [po for po in all_pos if po.status in ["Ordered", "In Transit", "Draft"]]
    open_po_count = len(active_pos)
    open_po_value = sum((po.total_cost or 0.0) for po in active_pos)

    overseas_in_transit_count = sum(
        1 for po in active_pos
        if po.status == "In Transit" and ((po.supplier and po.supplier.supplier_type == "Overseas") or ("oversea" in (po.notes or "").lower()))
    )

    dated_pos = [po for po in active_pos if po.expected_delivery_date]
    dated_pos.sort(key=lambda po: po.expected_delivery_date)
    upcoming_deliveries_out = []
    for po in dated_pos[:4]:
        channel = "Overseas" if (po.supplier and po.supplier.supplier_type == "Overseas") or ("oversea" in (po.notes or "").lower()) else "Local"
        upcoming_deliveries_out.append(
            DashboardUpcomingDelivery(
                id=po.id,
                po_number=po.po_number,
                supplier_name=po.supplier.name if po.supplier else "N/A",
                channel=channel,
                expected_delivery_date=po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
                total_cost=round(po.total_cost or 0.0, 2),
                status=po.status,
            )
        )

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
        shortage_count=shortage_count,
        total_collected_cash=round(total_collected_cash, 2),
        total_receivable=round(total_receivable, 2),
        total_inventory_value=round(total_inventory_value, 2),
        open_po_count=open_po_count,
        open_po_value=round(open_po_value, 2),
        overseas_in_transit_count=overseas_in_transit_count,
        shortage_items=shortage_items_out,
        upcoming_deliveries=upcoming_deliveries_out,
    )
