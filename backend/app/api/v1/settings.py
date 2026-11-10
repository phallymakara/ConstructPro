import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import CompanyProfile, PaymentTerm
from app.schemas.schemas import (
    CompanyProfileSchema, CompanyProfileOut,
    PaymentTermCreate, PaymentTermUpdate, PaymentTermOut, PaymentTermMilestone
)

router = APIRouter()

DEFAULT_PAYMENT_TERMS = [
    {
        "name_en": "Deposit 50% / Balance on delivery",
        "name_kh": "កក់ ៥០% / នៅសល់ពេលដឹកជញ្ជូន",
        "customer_count": 3,
        "is_default": True,
        "milestones": [
            {"milestone": "Deposit 50%", "trigger": "Order confirmed", "percent": 50.0, "due": "Same day"},
            {"milestone": "Balance on delivery", "trigger": "Delivery", "percent": 50.0, "due": "Same day"}
        ]
    },
    {
        "name_en": "50% Deposit / 40% Delivery / 10% After installation",
        "name_kh": "កក់ ៥០% / ដឹក ៤០% / ក្រោយដំឡើង ១០%",
        "customer_count": 1,
        "is_default": False,
        "milestones": [
            {"milestone": "Deposit 50%", "trigger": "Order confirmed", "percent": 50.0, "due": "Same day"},
            {"milestone": "On delivery 40%", "trigger": "Delivery", "percent": 40.0, "due": "+3 days"},
            {"milestone": "After installation 10%", "trigger": "Installation done", "percent": 10.0, "due": "+7 days"}
        ]
    },
    {
        "name_en": "Net 15 days after delivery",
        "name_kh": "បង់ក្នុងរយៈពេល ១៥ថ្ងៃ",
        "customer_count": 1,
        "is_default": False,
        "milestones": [
            {"milestone": "Full payment (Net 15)", "trigger": "Delivery", "percent": 100.0, "due": "+15 days"}
        ]
    },
    {
        "name_en": "Net 30 days after delivery",
        "name_kh": "បង់ក្នុងរយៈពេល ៣០ថ្ងៃ",
        "customer_count": 2,
        "is_default": False,
        "milestones": [
            {"milestone": "Full payment (Net 30)", "trigger": "Delivery", "percent": 100.0, "due": "+30 days"}
        ]
    },
    {
        "name_en": "100% before delivery",
        "name_kh": "បង់ ១០០% មុនដឹកជញ្ជូន",
        "customer_count": 0,
        "is_default": False,
        "milestones": [
            {"milestone": "Full payment in advance", "trigger": "Order confirmed", "percent": 100.0, "due": "Same day"}
        ]
    }
]

DEFAULT_RATING_RULES = json.dumps([
    {"rating": "A", "label": "Excellent", "description": "Always pays on time"},
    {"rating": "B", "label": "Good", "description": "Slightly late (1–15 days)"},
    {"rating": "C", "label": "Watch", "description": "Late 16–30 days"},
    {"rating": "D", "label": "High risk", "description": "More than 30 days late"},
    {"rating": "New", "label": "New customer", "description": "No payment history yet"}
])

def _format_payment_term(t: PaymentTerm) -> dict:
    try:
        miles = json.loads(t.milestones) if t.milestones else []
    except Exception:
        miles = []
    return {
        "id": t.id,
        "name_en": t.name_en,
        "name_kh": t.name_kh,
        "customer_count": t.customer_count or 0,
        "is_default": bool(t.is_default),
        "milestones": miles,
        "created_at": t.created_at
    }

# --- Company Profile Endpoints ---

@router.get("/company-profile", response_model=CompanyProfileOut)
def get_company_profile(db: Session = Depends(get_db)):
    profile = db.query(CompanyProfile).first()
    if not profile:
        profile = CompanyProfile(
            company_name_kh="ដេប៉ូ វឌ្ឍនា កញ្ចក់ និងអាលុយមីញ៉ូម",
            company_name_en="WATTANA GLASS & ALUMINIUM",
            address="#31-33, National Road 1, Chbar Ampov, Phnom Penh",
            phone="0XX XXX XXX",
            telegram="@wattana",
            vat_tin="K00X-XXXXXXXXX",
            bank_name="ABA Bank",
            account_name="WATTANA GLASS & ALUMINIUM",
            account_number="000 000 000",
            doc_numbering_quotation="QT-YYMM-###",
            doc_numbering_sales_order="SO-YYMM-###",
            doc_numbering_delivery_note="DN-YYMM-###",
            doc_numbering_invoice="INV-YYMM-###",
            doc_numbering_receipt="RC-YYMM-###",
            payment_rating_rules=DEFAULT_RATING_RULES
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/company-profile", response_model=CompanyProfileOut)
def update_company_profile(payload: CompanyProfileSchema, db: Session = Depends(get_db)):
    profile = db.query(CompanyProfile).first()
    if not profile:
        profile = CompanyProfile(**payload.model_dump())
        db.add(profile)
    else:
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile


# --- Payment Terms Endpoints ---

@router.get("/payment-terms", response_model=List[PaymentTermOut])
def get_payment_terms(db: Session = Depends(get_db)):
    terms = db.query(PaymentTerm).order_by(PaymentTerm.id.asc()).all()
    if not terms:
        for d in DEFAULT_PAYMENT_TERMS:
            pt = PaymentTerm(
                name_en=d["name_en"],
                name_kh=d["name_kh"],
                customer_count=d["customer_count"],
                is_default=d["is_default"],
                milestones=json.dumps(d["milestones"])
            )
            db.add(pt)
        db.commit()
        terms = db.query(PaymentTerm).order_by(PaymentTerm.id.asc()).all()

    return [_format_payment_term(t) for t in terms]

@router.post("/payment-terms", response_model=PaymentTermOut, status_code=status.HTTP_201_CREATED)
def create_payment_term(payload: PaymentTermCreate, db: Session = Depends(get_db)):
    miles_json = json.dumps([m.model_dump() for m in payload.milestones])
    pt = PaymentTerm(
        name_en=payload.name_en,
        name_kh=payload.name_kh,
        customer_count=payload.customer_count,
        is_default=payload.is_default,
        milestones=miles_json
    )
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return _format_payment_term(pt)

@router.put("/payment-terms/{term_id}", response_model=PaymentTermOut)
def update_payment_term(term_id: int, payload: PaymentTermUpdate, db: Session = Depends(get_db)):
    pt = db.query(PaymentTerm).filter(PaymentTerm.id == term_id).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Payment term not found")

    if payload.name_en is not None:
        pt.name_en = payload.name_en
    if payload.name_kh is not None:
        pt.name_kh = payload.name_kh
    if payload.customer_count is not None:
        pt.customer_count = payload.customer_count
    if payload.is_default is not None:
        pt.is_default = payload.is_default
    if payload.milestones is not None:
        pt.milestones = json.dumps([m.model_dump() for m in payload.milestones])

    db.commit()
    db.refresh(pt)
    return _format_payment_term(pt)

@router.delete("/payment-terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_term(term_id: int, db: Session = Depends(get_db)):
    pt = db.query(PaymentTerm).filter(PaymentTerm.id == term_id).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Payment term not found")
    db.delete(pt)
    db.commit()
    return None

