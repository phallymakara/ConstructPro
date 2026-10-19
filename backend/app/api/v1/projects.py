from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Project, ProjectItem, Customer, Material, ProjectMaterialRequirement
)
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    ProjectItemCreate, ProjectItemOut, MaterialRequirementOut
)
from app.services.material_planning_service import (
    calculate_and_sync_project_materials, reserve_project_materials
)

router = APIRouter()

def _format_project(p: Project) -> dict:
    reqs = []
    for r in p.material_requirements:
        mat = r.material
        reqs.append({
            "id": r.id,
            "project_id": r.project_id,
            "material_id": r.material_id,
            "material_name": mat.name if mat else "Unknown",
            "material_code": mat.code if mat else "-",
            "material_unit": mat.unit if mat else "-",
            "required_qty": r.required_qty,
            "allocated_qty": r.allocated_qty,
            "wastage_percent": r.wastage_percent,
            "status": r.status,
            "available_stock": mat.available_stock if mat else 0.0,
        })
    return {
        "id": p.id,
        "project_number": p.project_number,
        "project_name": p.project_name,
        "customer_id": p.customer_id,
        "location": p.location,
        "status": p.status,
        "assigned_manager": p.assigned_manager,
        "start_date": p.start_date,
        "deadline_date": p.deadline_date,
        "estimated_cost": p.estimated_cost or 0.0,
        "actual_cost": p.actual_cost or 0.0,
        "contract_amount": p.contract_amount or 0.0,
        "notes": p.notes,
        "created_at": p.created_at,
        "customer": p.customer,
        "items": p.items,
        "material_requirements": reqs
    }

@router.get("/", response_model=List[ProjectOut])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [_format_project(p) for p in projects]

@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    # Optional customer validation
    if payload.customer_id:
        customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
        if not customer:
            raise HTTPException(status_code=400, detail="Customer does not exist")

    # Auto-generate project number if not provided
    project_number = payload.project_number.strip() if payload.project_number else None
    if not project_number:
        from datetime import datetime
        year_month = datetime.utcnow().strftime("%Y%m")
        count = db.query(Project).count() + 1
        project_number = f"PRJ-{year_month}-{str(count).zfill(4)}"
        while db.query(Project).filter(Project.project_number == project_number).first():
            count += 1
            project_number = f"PRJ-{year_month}-{str(count).zfill(4)}"
    else:
        existing = db.query(Project).filter(Project.project_number == project_number).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Project number {project_number} already exists")

    project = Project(
        project_number=project_number,
        project_name=payload.project_name,
        customer_id=payload.customer_id,
        location=payload.location,
        status=payload.status,
        assigned_manager=payload.assigned_manager,
        start_date=payload.start_date,
        deadline_date=payload.deadline_date,
        contract_amount=payload.contract_amount,
        notes=payload.notes
    )
    db.add(project)
    db.flush()

    if payload.items:
        for item_data in payload.items:
            item = ProjectItem(
                project_id=project.id,
                **item_data.model_dump()
            )
            db.add(item)
        db.flush()
        # Automatically calculate initial material requirements
        calculate_and_sync_project_materials(db, project)

    db.commit()
    db.refresh(project)
    return _format_project(project)

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _format_project(project)

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, val)

    db.commit()
    db.refresh(project)
    return _format_project(project)

@router.post("/{project_id}/items", response_model=ProjectItemOut, status_code=status.HTTP_201_CREATED)
def add_project_item(project_id: int, payload: ProjectItemCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    item = ProjectItem(project_id=project.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    # Recalculate material requirements after item addition
    calculate_and_sync_project_materials(db, project)
    return item

@router.delete("/{project_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_item(project_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(ProjectItem).filter(
        ProjectItem.id == item_id,
        ProjectItem.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    project = item.project
    db.delete(item)
    db.commit()

    # Recalculate requirements
    calculate_and_sync_project_materials(db, project)
    return None

@router.post("/{project_id}/calculate-materials", response_model=List[MaterialRequirementOut])
def trigger_material_calculation(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = calculate_and_sync_project_materials(db, project)
    formatted = []
    for r in requirements:
        mat = r.material
        formatted.append({
            "id": r.id,
            "project_id": r.project_id,
            "material_id": r.material_id,
            "material_name": mat.name if mat else "Unknown",
            "material_code": mat.code if mat else "-",
            "material_unit": mat.unit if mat else "-",
            "required_qty": r.required_qty,
            "allocated_qty": r.allocated_qty,
            "wastage_percent": r.wastage_percent,
            "status": r.status,
            "available_stock": mat.available_stock if mat else 0.0,
        })
    return formatted

@router.post("/{project_id}/reserve-materials")
def trigger_material_reservation(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reserve_project_materials(db, project)
    return {"message": "Materials successfully reserved for project", "project_status": project.status}

@router.post("/{project_id}/consume-materials", response_model=ProjectOut)
def record_project_material_consumption(
    project_id: int,
    payload: dict,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    items = payload.get("items", [])
    total_added_actual_cost = 0.0

    for it in items:
        req_id = it.get("material_requirement_id")
        consumed_qty = float(it.get("consumed_qty", 0.0))
        wastage_qty = float(it.get("wastage_qty", 0.0))
        notes = it.get("notes") or f"Production issue for {project.project_number}"

        req = db.query(ProjectMaterialRequirement).filter(
            ProjectMaterialRequirement.id == req_id,
            ProjectMaterialRequirement.project_id == project.id
        ).first()

        if req and consumed_qty > 0:
            mat = req.material
            if mat:
                # Deduct physical current stock
                mat.current_stock = max(0.0, mat.current_stock - (consumed_qty + wastage_qty))
                # Release reserved stock
                mat.reserved_stock = max(0.0, (mat.reserved_stock or 0.0) - consumed_qty)

                # Log Issue movement
                mov_issue = StockMovement(
                    material_id=mat.id,
                    project_id=project.id,
                    movement_type="Issue",
                    quantity=consumed_qty,
                    unit_cost=mat.unit_cost,
                    reference_note=notes
                )
                db.add(mov_issue)

                # Log Wastage movement if applicable
                if wastage_qty > 0:
                    mov_waste = StockMovement(
                        material_id=mat.id,
                        project_id=project.id,
                        movement_type="Wastage",
                        quantity=wastage_qty,
                        unit_cost=mat.unit_cost,
                        reference_note=f"Scrap/Wastage recorded: {notes}"
                    )
                    db.add(mov_waste)

                total_added_actual_cost += (consumed_qty + wastage_qty) * mat.unit_cost

            req.status = "Issued"

    project.actual_cost = round((project.actual_cost or 0.0) + total_added_actual_cost, 2)
    db.commit()
    db.refresh(project)
    return _format_project(project)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None
