from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Material, StockMovement
from app.schemas.schemas import (
    MaterialCreate, MaterialUpdate, MaterialOut,
    StockMovementCreate, StockMovementOut
)

router = APIRouter()

@router.get("/", response_model=List[MaterialOut])
def get_materials(db: Session = Depends(get_db)):
    materials = db.query(Material).order_by(Material.category.asc(), Material.name.asc()).all()
    # Pydantic MaterialOut will read available_stock property
    return materials

@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Material with code {payload.code} already exists")
    material = Material(**payload.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: int, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/{material_id}", response_model=MaterialOut)
def update_material(material_id: int, payload: MaterialUpdate, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(material, key, val)
    db.commit()
    db.refresh(material)
    return material

@router.post("/movements", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED)
def create_stock_movement(payload: StockMovementCreate, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    movement = StockMovement(**payload.model_dump())

    # Adjust material stock according to movement type
    if payload.movement_type in ["Receipt", "Return"]:
        material.current_stock += payload.quantity
    elif payload.movement_type in ["Issue", "Wastage"]:
        material.current_stock = max(0.0, material.current_stock - payload.quantity)
        # If it was issued against reserved stock, reduce reserved stock as well
        if payload.movement_type == "Issue":
            material.reserved_stock = max(0.0, material.reserved_stock - payload.quantity)
    elif payload.movement_type == "Adjustment":
        material.current_stock = payload.quantity

    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

@router.get("/movements/all", response_model=List[StockMovementOut])
def get_stock_movements(db: Session = Depends(get_db)):
    return db.query(StockMovement).order_by(StockMovement.created_at.desc()).limit(100).all()
