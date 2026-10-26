from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.entities import Material, StockMovement, ProductCategory
from app.schemas.schemas import (
    MaterialCreate, MaterialUpdate, MaterialOut,
    ProductCategoryCreate, ProductCategoryUpdate, ProductCategoryOut,
    StockMovementCreate, StockMovementBatchCreate, StockMovementOut
)

router = APIRouter()

# --- Category Endpoints ---

@router.get("/categories", response_model=List[ProductCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(ProductCategory).order_by(ProductCategory.name.asc()).all()
    result = []
    for cat in cats:
        items = db.query(Material).filter(
            or_(Material.category_id == cat.id, Material.category == cat.name)
        ).all()
        count = len(items)
        total_stock = sum(m.current_stock or 0.0 for m in items)
        result.append(ProductCategoryOut(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            created_at=cat.created_at,
            product_count=count,
            total_stock=total_stock
        ))
    return result

@router.post("/categories", response_model=ProductCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: ProductCategoryCreate, db: Session = Depends(get_db)):
    trimmed_name = payload.name.strip()
    existing = db.query(ProductCategory).filter(ProductCategory.name.ilike(trimmed_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{trimmed_name}' already exists")
    
    cat = ProductCategory(name=trimmed_name, description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return ProductCategoryOut(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        created_at=cat.created_at,
        product_count=0,
        total_stock=0.0
    )

@router.put("/categories/{category_id}", response_model=ProductCategoryOut)
def update_category(category_id: int, payload: ProductCategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    old_name = cat.name
    if payload.name:
        new_name = payload.name.strip()
        existing = db.query(ProductCategory).filter(ProductCategory.name.ilike(new_name), ProductCategory.id != category_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Category '{new_name}' already exists")
        cat.name = new_name
        # Keep materials synchronized
        db.query(Material).filter(
            or_(Material.category_id == category_id, Material.category == old_name)
        ).update({"category": new_name, "category_id": cat.id}, synchronize_session=False)

    if payload.description is not None:
        cat.description = payload.description

    db.commit()
    db.refresh(cat)

    items = db.query(Material).filter(Material.category_id == cat.id).all()
    count = len(items)
    total_stock = sum(m.current_stock or 0.0 for m in items)

    return ProductCategoryOut(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        created_at=cat.created_at,
        product_count=count,
        total_stock=total_stock
    )

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    item_count = db.query(Material).filter(
        or_(Material.category_id == cat.id, Material.category == cat.name)
    ).count()
    if item_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{cat.name}' because it contains {item_count} products. Please reassign or delete the products first."
        )

    db.delete(cat)
    db.commit()
    return None

# --- Product / Material Endpoints ---

@router.get("/", response_model=List[MaterialOut])
def get_materials(
    category: Optional[str] = None,
    product_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Material)
    if category and category != "All":
        query = query.filter(Material.category == category)
    if product_type and product_type != "All":
        query = query.filter(Material.product_type == product_type)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Material.name.ilike(term),
                Material.code.ilike(term),
                Material.barcode.ilike(term),
                Material.storage_location.ilike(term)
            )
        )
    return query.order_by(Material.category.asc(), Material.product_type.asc(), Material.name.asc()).all()

@router.get("/barcode/{code_or_barcode}", response_model=MaterialOut)
def get_material_by_barcode(code_or_barcode: str, db: Session = Depends(get_db)):
    trimmed = code_or_barcode.strip()
    material = db.query(Material).filter(
        or_(
            Material.barcode == trimmed,
            Material.code == trimmed
        )
    ).first()
    if not material:
        raise HTTPException(
            status_code=404,
            detail=f"No inventory product found with barcode or code: {code_or_barcode}"
        )
    return material

@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(payload: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Material with code {payload.code} already exists")
    
    barcode_val = payload.barcode.strip() if payload.barcode and payload.barcode.strip() else payload.code
    if payload.barcode:
        existing_barcode = db.query(Material).filter(Material.barcode == barcode_val).first()
        if existing_barcode:
            raise HTTPException(status_code=400, detail=f"Material with barcode {barcode_val} already exists")

    data = payload.model_dump()
    data["barcode"] = barcode_val

    # Ensure category and category_id sync
    if data.get("category_id"):
        cat = db.query(ProductCategory).filter(ProductCategory.id == data["category_id"]).first()
        if cat:
            data["category"] = cat.name
    elif data.get("category"):
        cat = db.query(ProductCategory).filter(ProductCategory.name == data["category"]).first()
        if cat:
            data["category_id"] = cat.id

    material = Material(**data)
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
    
    update_data = payload.model_dump(exclude_unset=True)
    if "barcode" in update_data and update_data["barcode"]:
        bc = update_data["barcode"].strip()
        existing_bc = db.query(Material).filter(Material.barcode == bc, Material.id != material_id).first()
        if existing_bc:
            raise HTTPException(status_code=400, detail=f"Barcode {bc} is already assigned to another material")
        update_data["barcode"] = bc

    # Sync category and category_id
    if "category_id" in update_data and update_data["category_id"]:
        cat = db.query(ProductCategory).filter(ProductCategory.id == update_data["category_id"]).first()
        if cat:
            update_data["category"] = cat.name
    elif "category" in update_data and update_data["category"]:
        cat = db.query(ProductCategory).filter(ProductCategory.name == update_data["category"]).first()
        if cat:
            update_data["category_id"] = cat.id

    for key, val in update_data.items():
        setattr(material, key, val)
    db.commit()
    db.refresh(material)
    return material

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    db.delete(material)
    db.commit()
    return None

@router.post("/movements", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED)
def create_stock_movement(payload: StockMovementCreate, db: Session = Depends(get_db)):
    material = db.query(Material).filter(Material.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    movement = StockMovement(**payload.model_dump())

    # Adjust material stock according to movement type (including Stock In & Stock Out)
    mov_type = payload.movement_type.strip()
    if mov_type in ["Stock In", "Receipt", "Return"]:
        material.current_stock = (material.current_stock or 0.0) + payload.quantity
    elif mov_type in ["Stock Out", "Issue", "Wastage"]:
        material.current_stock = max(0.0, (material.current_stock or 0.0) - payload.quantity)
        if mov_type == "Issue":
            material.reserved_stock = max(0.0, (material.reserved_stock or 0.0) - payload.quantity)
    elif mov_type == "Adjustment":
        material.current_stock = payload.quantity

    db.add(movement)
    db.commit()
    db.refresh(movement)

    return StockMovementOut(
        id=movement.id,
        material_id=movement.material_id,
        material_code=material.code,
        material_name=material.name,
        material_barcode=material.barcode or material.code,
        material_category=material.category,
        material_product_type=material.product_type,
        material_unit=material.unit,
        project_id=movement.project_id,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        unit_cost=movement.unit_cost or material.unit_cost or 0.0,
        reference_note=movement.reference_note,
        created_at=movement.created_at,
    )

@router.get("/movements/all", response_model=List[StockMovementOut])
def get_stock_movements(db: Session = Depends(get_db)):
    movements = db.query(StockMovement).order_by(StockMovement.created_at.desc()).limit(200).all()
    results = []
    for mov in movements:
        mat = mov.material
        results.append(StockMovementOut(
            id=mov.id,
            material_id=mov.material_id,
            material_code=mat.code if mat else None,
            material_name=mat.name if mat else None,
            material_barcode=(mat.barcode or mat.code) if mat else None,
            material_category=mat.category if mat else None,
            material_product_type=mat.product_type if mat else None,
            material_unit=mat.unit if mat else None,
            project_id=mov.project_id,
            movement_type=mov.movement_type,
            quantity=mov.quantity,
            unit_cost=mov.unit_cost,
            reference_note=mov.reference_note,
            created_at=mov.created_at,
        ))
    return results

@router.post("/movements/batch", response_model=List[StockMovementOut], status_code=status.HTTP_201_CREATED)
def create_batch_stock_movements(payload: StockMovementBatchCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="No items provided for stock dispatch.")

    materials_map = {}
    mov_type = payload.movement_type.strip()
    is_stock_out = mov_type in ["Stock Out", "Issue", "Wastage"]

    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity {item.quantity}. Must be greater than 0.")
        mat = db.query(Material).filter(Material.id == item.material_id).first()
        if not mat:
            raise HTTPException(status_code=404, detail=f"Material with ID {item.material_id} not found.")
        materials_map[item.material_id] = mat

        if is_stock_out:
            available = mat.available_stock
            if item.quantity > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{mat.name}' ({mat.code}). Requested: {item.quantity} {mat.unit}, Available: {available} {mat.unit}."
                )

    ref_parts = []
    if payload.recipient_worker:
        ref_parts.append(f"Worker: {payload.recipient_worker.strip()}")
    if payload.reference_note:
        ref_parts.append(payload.reference_note.strip())
    final_ref_note = " | ".join(ref_parts) if ref_parts else None

    created_movements = []
    for item in payload.items:
        mat = materials_map[item.material_id]
        if is_stock_out:
            mat.current_stock = max(0.0, (mat.current_stock or 0.0) - item.quantity)
            if mov_type == "Issue":
                mat.reserved_stock = max(0.0, (mat.reserved_stock or 0.0) - item.quantity)
        elif mov_type in ["Stock In", "Receipt", "Return"]:
            mat.current_stock = (mat.current_stock or 0.0) + item.quantity
        elif mov_type == "Adjustment":
            mat.current_stock = item.quantity

        movement = StockMovement(
            material_id=mat.id,
            project_id=payload.project_id,
            movement_type=mov_type,
            quantity=item.quantity,
            unit_cost=item.unit_cost or mat.unit_cost or 0.0,
            reference_note=final_ref_note,
        )
        db.add(movement)
        db.flush()
        db.refresh(movement)

        created_movements.append(
            StockMovementOut(
                id=movement.id,
                material_id=movement.material_id,
                material_code=mat.code,
                material_name=mat.name,
                material_barcode=mat.barcode or mat.code,
                material_category=mat.category,
                material_product_type=mat.product_type,
                material_unit=mat.unit,
                project_id=movement.project_id,
                movement_type=movement.movement_type,
                quantity=movement.quantity,
                unit_cost=movement.unit_cost or mat.unit_cost or 0.0,
                reference_note=movement.reference_note,
                created_at=movement.created_at,
            )
        )

    db.commit()
    return created_movements
