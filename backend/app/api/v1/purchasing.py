from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Supplier, PurchaseOrder, PurchaseOrderItem, Material, Project,
    ProjectMaterialRequirement, StockMovement
)
from app.schemas.schemas import (
    SupplierCreate, SupplierUpdate, SupplierOut,
    PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderItemOut
)

router = APIRouter()

def _format_po(po: PurchaseOrder) -> dict:
    items_out = []
    for item in po.items:
        mat = item.material
        items_out.append({
            "id": item.id,
            "purchase_order_id": item.purchase_order_id,
            "material_id": item.material_id,
            "material_name": mat.name if mat else "Unknown",
            "material_code": mat.code if mat else "-",
            "material_unit": mat.unit if mat else "-",
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "received_qty": item.received_qty,
        })
    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_id": po.supplier_id,
        "project_id": po.project_id,
        "status": po.status,
        "total_cost": po.total_cost,
        "order_date": po.order_date,
        "expected_delivery_date": po.expected_delivery_date,
        "actual_delivery_date": po.actual_delivery_date,
        "notes": po.notes,
        "created_at": po.created_at,
        "supplier": po.supplier,
        "items": items_out
    }

# --- Suppliers ---
@router.get("/suppliers", response_model=List[SupplierOut])
def get_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.name.asc()).all()

@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreate, db: Session = Depends(get_db)):
    supplier = Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, payload: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, key, val)
    db.commit()
    db.refresh(supplier)
    return supplier

# --- Purchase Orders ---
@router.get("/orders", response_model=List[PurchaseOrderOut])
def get_purchase_orders(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()
    return [_format_po(po) for po in orders]

@router.post("/orders", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(payload: PurchaseOrderCreate, db: Session = Depends(get_db)):
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.po_number == payload.po_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"PO number {payload.po_number} already exists")

    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=400, detail="Supplier not found")

    total_cost = sum(item.quantity * item.unit_cost for item in payload.items)

    po = PurchaseOrder(
        po_number=payload.po_number,
        supplier_id=payload.supplier_id,
        project_id=payload.project_id,
        status=payload.status,
        total_cost=round(total_cost, 2),
        expected_delivery_date=payload.expected_delivery_date,
        notes=payload.notes
    )
    db.add(po)
    db.flush()

    for item_data in payload.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            material_id=item_data.material_id,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost,
            received_qty=0.0
        )
        db.add(po_item)

    db.commit()
    db.refresh(po)
    return _format_po(po)

@router.post("/orders/{po_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == "Received":
        raise HTTPException(status_code=400, detail="Purchase order is already received")

    # Process arrival of all materials into inventory
    for item in po.items:
        mat = db.query(Material).filter(Material.id == item.material_id).first()
        if mat:
            qty_to_receive = item.quantity - item.received_qty
            if qty_to_receive > 0:
                mat.current_stock += qty_to_receive
                item.received_qty = item.quantity

                movement = StockMovement(
                    material_id=mat.id,
                    project_id=po.project_id,
                    movement_type="Receipt",
                    quantity=qty_to_receive,
                    unit_cost=item.unit_cost or mat.unit_cost,
                    reference_note=f"Received PO {po.po_number} from {po.supplier.name}"
                )
                db.add(movement)

    po.status = "Received"
    po.actual_delivery_date = datetime.utcnow()
    db.commit()
    db.refresh(po)
    return _format_po(po)

@router.post("/create-from-project-shortages/{project_id}", response_model=PurchaseOrderOut)
def create_po_from_project_shortages(
    project_id: int,
    supplier_id: int,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=400, detail="Supplier not found")

    shortages = [r for r in project.material_requirements if r.status == "Shortage"]
    if not shortages:
        raise HTTPException(status_code=400, detail="No material shortages found for this project")

    po_num = f"PO-{project.project_number.replace('PRJ-', '')}-{int(datetime.utcnow().timestamp()) % 10000}"
    total_cost = 0.0

    po = PurchaseOrder(
        po_number=po_num,
        supplier_id=supplier.id,
        project_id=project.id,
        status="Ordered",
        notes=f"Auto-generated for shortage materials in Project {project.project_number}"
    )
    db.add(po)
    db.flush()

    for req in shortages:
        mat = req.material
        missing_qty = max(0.0, req.required_qty - req.allocated_qty)
        if missing_qty > 0 and mat:
            unit_cost = mat.unit_cost
            total_cost += missing_qty * unit_cost
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                material_id=mat.id,
                quantity=round(missing_qty, 2),
                unit_cost=unit_cost,
                received_qty=0.0
            )
            db.add(po_item)

    po.total_cost = round(total_cost, 2)
    db.commit()
    db.refresh(po)
    return _format_po(po)
