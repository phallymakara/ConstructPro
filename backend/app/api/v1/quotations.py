from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Quotation, Project, Customer, ProjectStatus, QuotationStatus
from app.schemas.schemas import QuotationCreate, QuotationUpdate, QuotationOut

router = APIRouter()

@router.get("/", response_model=List[QuotationOut])
def get_quotations(db: Session = Depends(get_db)):
    return db.query(Quotation).order_by(Quotation.created_at.desc()).all()

@router.post("/", response_model=QuotationOut, status_code=status.HTTP_201_CREATED)
def create_quotation(payload: QuotationCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    existing = db.query(Quotation).filter(Quotation.quotation_number == payload.quotation_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Quotation number {payload.quotation_number} already exists")

    # Compute subtotal and total
    subtotal = (
        payload.material_cost +
        payload.labor_cost +
        payload.transport_cost +
        payload.installation_cost
    )
    after_discount = max(0.0, subtotal - payload.discount_amount)
    tax_amount = after_discount * (payload.tax_percent / 100.0)
    total_amount = round(after_discount + tax_amount, 2)
    # Expected profit = total - (material + transport)
    direct_cost = payload.material_cost + payload.transport_cost
    profit = round(max(0.0, total_amount - direct_cost), 2)

    quotation = Quotation(
        quotation_number=payload.quotation_number,
        project_id=payload.project_id,
        customer_id=payload.customer_id,
        status=payload.status,
        material_cost=payload.material_cost,
        labor_cost=payload.labor_cost,
        transport_cost=payload.transport_cost,
        installation_cost=payload.installation_cost,
        subtotal=round(subtotal, 2),
        discount_amount=payload.discount_amount,
        tax_percent=payload.tax_percent,
        total_amount=total_amount,
        expected_profit=profit,
        valid_until=payload.valid_until,
        notes=payload.notes
    )
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation

@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quote

@router.put("/{quotation_id}", response_model=QuotationOut)
def update_quotation(quotation_id: int, payload: QuotationUpdate, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(quote, key, val)

    # Re-calculate amounts
    subtotal = quote.material_cost + quote.labor_cost + quote.transport_cost + quote.installation_cost
    after_discount = max(0.0, subtotal - quote.discount_amount)
    tax_amount = after_discount * (quote.tax_percent / 100.0)
    quote.subtotal = round(subtotal, 2)
    quote.total_amount = round(after_discount + tax_amount, 2)
    direct_cost = quote.material_cost + quote.transport_cost
    quote.expected_profit = round(max(0.0, quote.total_amount - direct_cost), 2)

    db.commit()
    db.refresh(quote)
    return quote

@router.post("/{quotation_id}/convert-to-project", response_model=QuotationOut)
def convert_quotation_to_project(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    quote.status = QuotationStatus.APPROVED.value

    # If already linked to a project, set project status to Approved
    if quote.project_id:
        proj = db.query(Project).filter(Project.id == quote.project_id).first()
        if proj:
            proj.status = ProjectStatus.APPROVED.value
            proj.contract_amount = quote.total_amount
    else:
        # Create a new active project from this approved quotation
        new_proj_num = f"PRJ-{quote.quotation_number.replace('QT-', '')}"
        project = Project(
            project_number=new_proj_num,
            project_name=f"Project for {quote.customer.name}",
            customer_id=quote.customer_id,
            location=quote.customer.address or "Site Location",
            status=ProjectStatus.APPROVED.value,
            contract_amount=quote.total_amount,
            estimated_cost=quote.material_cost + quote.labor_cost,
            notes=f"Converted from approved quotation {quote.quotation_number}"
        )
        db.add(project)
        db.flush()
        quote.project_id = project.id

    db.commit()
    db.refresh(quote)
    return quote

@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    db.delete(quote)
    db.commit()
    return None
