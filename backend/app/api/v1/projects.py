from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import (
    Project, ProjectItem, Customer, Material, ProjectMaterialRequirement, ProjectPayment, ProjectWorkerLog
)
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut,
    ProjectItemCreate, ProjectItemOut, MaterialRequirementOut, MaterialRequirementCreate,
    ProjectPaymentCreate, ProjectPaymentOut,
    ProjectWorkerLogCreate, ProjectWorkerLogOut
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
            "unit_cost": mat.unit_cost if mat else 0.0,
        })
    payments_data = []
    for pay in (getattr(p, "payments", []) or []):
        payments_data.append({
            "id": pay.id,
            "project_id": pay.project_id,
            "amount": pay.amount,
            "payment_date": pay.payment_date,
            "payment_method": pay.payment_method,
            "reference_number": pay.reference_number,
            "notes": pay.notes,
            "created_at": pay.created_at,
        })

    worker_logs_data = []
    for wl in (getattr(p, "worker_logs", []) or []):
        worker_logs_data.append({
            "id": wl.id,
            "project_id": wl.project_id,
            "worker_name": wl.worker_name,
            "hours_worked": wl.hours_worked,
            "work_date": wl.work_date,
            "task_description": wl.task_description,
            "created_at": wl.created_at,
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
        "actual_start_date": getattr(p, "actual_start_date", None),
        "actual_end_date": getattr(p, "actual_end_date", None),
        "estimated_cost": p.estimated_cost or 0.0,
        "actual_cost": p.actual_cost or 0.0,
        "contract_amount": p.contract_amount or 0.0,
        "architect": p.architect,
        "worker": p.worker,
        "sales_person": p.sales_person,
        "project_type": p.project_type or "Window & Door Installation",
        "customer_paid": p.customer_paid or 0.0,
        "service_selling": p.service_selling or 0.0,
        "service_cost": p.service_cost or 0.0,
        "effort_hours": p.effort_hours or 0.0,
        "effort_completed_hours": p.effort_completed_hours or 0.0,
        "notes": p.notes,
        "priority": getattr(p, "priority", None) or "Medium",
        "customer_representative": getattr(p, "customer_representative", None),
        "site_supervisor": getattr(p, "site_supervisor", None),
        "material_cost": getattr(p, "material_cost", 0.0) or 0.0,
        "labor_cost": getattr(p, "labor_cost", 0.0) or 0.0,
        "other_expenses": getattr(p, "other_expenses", 0.0) or 0.0,
        "created_at": p.created_at,
        "customer": p.customer,
        "items": p.items,
        "material_requirements": reqs,
        "payments": payments_data,
        "worker_logs": worker_logs_data,
        "preferred_contact_method": getattr(p, "preferred_contact_method", None) or (getattr(p.customer, 'preferred_contact_method', None) if p.customer else "Phone") or "Phone",
        "source": getattr(p, "source", None) or "project",
    }

@router.get("/", response_model=List[ProjectOut])
def get_projects(source: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Project)
    if source == "sales":
        query = query.filter(Project.source.in_(["sales", "sales_won"]))
    elif source == "project":
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Project.source == "project",
                Project.source == "sales_won",
                (Project.source == "sales") & (Project.status.in_(["Closed Won", "Accepted", "Completed", "Incoming Project", "In Progress", "Cancelled", "Starting"]))
            )
        )
    elif source:
        query = query.filter(Project.source == source)
    projects = query.order_by(Project.created_at.desc()).all()
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
        status=payload.status or "Starting",
        assigned_manager=payload.assigned_manager,
        start_date=payload.start_date,
        deadline_date=payload.deadline_date,
        actual_start_date=payload.actual_start_date,
        actual_end_date=payload.actual_end_date,
        contract_amount=payload.contract_amount,
        notes=payload.notes,
        project_type=payload.project_type or "Window & Door Installation",
        sales_person=payload.sales_person,
        customer_representative=payload.customer_representative,
        preferred_contact_method=payload.preferred_contact_method or "Phone",
        priority=payload.priority or "Medium",
        architect=payload.architect,
        worker=payload.worker,
        site_supervisor=payload.site_supervisor,
        source=payload.source or "project"
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

    update_dict = payload.model_dump(exclude_unset=True)

    # Validation: Closed Won deals cannot have their status reverted back to Draft or Closed Lost
    if "status" in update_dict:
        new_status = update_dict["status"]
        current_status = project.status.value if hasattr(project.status, "value") else str(project.status)
        if project.source in ("sales_won",) or current_status in ("Closed Won", "Incoming Project", "Accepted", "Completed"):
            if new_status in ("Draft", "Closed Lost"):
                raise HTTPException(
                    status_code=400,
                    detail="Status cannot be changed back to Draft or Closed Lost once marked as Closed Won."
                )

    # Automatically set sales_won source when sales project reaches won/incoming project status
    if project.source in ("sales", "sales_won"):
        if update_dict.get("status") in ("Incoming Project", "Closed Won") or project.status in ("Incoming Project", "Closed Won"):
            update_dict["source"] = "sales_won"

    for key, val in update_dict.items():
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

@router.post("/{project_id}/materials", response_model=MaterialRequirementOut, status_code=status.HTTP_201_CREATED)
def add_project_material(
    project_id: int,
    payload: MaterialRequirementCreate,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    material = db.query(Material).filter(Material.id == payload.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    existing = db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.project_id == project_id,
        ProjectMaterialRequirement.material_id == payload.material_id
    ).first()

    if existing:
        existing.required_qty += payload.required_qty
        if payload.wastage_percent is not None:
            existing.wastage_percent = payload.wastage_percent
        db.commit()
        db.refresh(existing)
        req = existing
    else:
        req = ProjectMaterialRequirement(
            project_id=project.id,
            material_id=material.id,
            required_qty=payload.required_qty,
            allocated_qty=0.0,
            wastage_percent=payload.wastage_percent or 0.0,
            status="Pending"
        )
        db.add(req)
        db.commit()
        db.refresh(req)

    return {
        "id": req.id,
        "project_id": req.project_id,
        "material_id": req.material_id,
        "material_name": material.name,
        "material_code": material.code,
        "material_unit": material.unit,
        "required_qty": req.required_qty,
        "allocated_qty": req.allocated_qty,
        "wastage_percent": req.wastage_percent,
        "status": req.status,
        "available_stock": material.available_stock,
    }

@router.delete("/{project_id}/materials/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_material(
    project_id: int,
    req_id: int,
    db: Session = Depends(get_db)
):
    req = db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.id == req_id,
        ProjectMaterialRequirement.project_id == project_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Material requirement not found")

    db.delete(req)
    db.commit()
    return None

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

    current_status = project.status.value if hasattr(project.status, "value") else str(project.status)
    if getattr(project, "source", None) in ("sales", "sales_won") and current_status != "Draft":
        raise HTTPException(
            status_code=400,
            detail="Only draft projects can be deleted from the sales portal."
        )

    db.delete(project)
    db.commit()
    return None

@router.post("/{project_id}/payments", response_model=ProjectPaymentOut, status_code=status.HTTP_201_CREATED)
def record_project_payment(project_id: int, payload: ProjectPaymentCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    payment = ProjectPayment(
        project_id=project_id,
        amount=payload.amount,
        payment_date=payload.payment_date or datetime.utcnow(),
        payment_method=payload.payment_method or "Bank Transfer",
        reference_number=payload.reference_number,
        notes=payload.notes,
    )
    db.add(payment)
    # Sync customer_paid on project
    project.customer_paid = round((project.customer_paid or 0.0) + payload.amount, 2)
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{project_id}/worker-logs", response_model=ProjectWorkerLogOut, status_code=status.HTTP_201_CREATED)
def log_worker_hours(project_id: int, payload: ProjectWorkerLogCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    log = ProjectWorkerLog(
        project_id=project_id,
        worker_name=payload.worker_name.strip(),
        hours_worked=payload.hours_worked,
        work_date=payload.work_date or datetime.utcnow(),
        task_description=payload.task_description,
    )
    db.add(log)
    # Sync effort_completed_hours on project
    project.effort_completed_hours = round((project.effort_completed_hours or 0.0) + payload.hours_worked, 2)
    db.commit()
    db.refresh(log)
    return log


