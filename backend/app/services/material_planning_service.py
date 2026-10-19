from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import Project, ProjectItem, Material, ProjectMaterialRequirement, StockMovement

def calculate_and_sync_project_materials(db: Session, project: Project) -> List[ProjectMaterialRequirement]:
    """
    Calculates material requirements for all items in the project based on window/door specifications,
    detects shortages against current stock, and updates ProjectMaterialRequirement records.
    """
    # 1. Clear existing requirements if re-calculating (or update)
    db.query(ProjectMaterialRequirement).filter(
        ProjectMaterialRequirement.project_id == project.id
    ).delete()

    # Aggregate material demands across all items
    total_profile_length_m = 0.0
    total_glass_area_sqm = 0.0
    total_seal_length_m = 0.0
    total_locksets_pcs = 0
    total_corner_joints_pcs = 0

    for item in project.items:
        w_m = item.width_mm / 1000.0
        h_m = item.height_mm / 1000.0
        qty = item.quantity

        # Perimeter for outer frame
        frame_perimeter = 2.0 * (w_m + h_m)
        # Inner sash perimeter for movable pane
        sash_perimeter = 2.0 * (w_m + h_m) * 0.95
        item_profiles = (frame_perimeter + sash_perimeter) * qty
        total_profile_length_m += item_profiles

        # Glass area
        glass_area = (w_m * h_m) * qty
        total_glass_area_sqm += glass_area

        # Rubber weather seal: roughly 2x total profile perimeter
        total_seal_length_m += (frame_perimeter + sash_perimeter) * 2.0 * qty

        # Hardware: 1 lockset per unit, 4 corner joints per unit
        total_locksets_pcs += 1 * qty
        total_corner_joints_pcs += 8 * qty

    # 2. Match with inventory materials by code or category
    materials = db.query(Material).all()
    mat_map = {m.category.lower(): m for m in materials}
    code_map = {m.code.upper(): m for m in materials}

    demands: List[Dict[str, Any]] = []

    # Profile (e.g. ALU-PRF-01 or category Profile)
    profile_mat = code_map.get("ALU-PRF-BLK") or mat_map.get("profile")
    if profile_mat and total_profile_length_m > 0:
        demands.append({
            "material": profile_mat,
            "qty": round(total_profile_length_m * 1.05, 2), # 5% wastage
            "wastage": 5.0
        })

    # Glass (e.g. GLS-6MM-TMP or category Glass)
    glass_mat = code_map.get("GLS-6MM-CLR") or mat_map.get("glass")
    if glass_mat and total_glass_area_sqm > 0:
        demands.append({
            "material": glass_mat,
            "qty": round(total_glass_area_sqm * 1.05, 2), # 5% wastage
            "wastage": 5.0
        })

    # Rubber Seal (e.g. RUB-EPDM-SEAL or category Seal)
    seal_mat = code_map.get("RUB-EPDM-01") or mat_map.get("seal")
    if seal_mat and total_seal_length_m > 0:
        demands.append({
            "material": seal_mat,
            "qty": round(total_seal_length_m * 1.05, 2),
            "wastage": 5.0
        })

    # Hardware locksets
    lock_mat = code_map.get("HW-LOCK-01") or mat_map.get("hardware")
    if lock_mat and total_locksets_pcs > 0:
        demands.append({
            "material": lock_mat,
            "qty": float(total_locksets_pcs),
            "wastage": 0.0
        })

    # Corner joints
    corner_mat = code_map.get("ACC-CRN-01") or mat_map.get("accessory")
    if corner_mat and total_corner_joints_pcs > 0:
        demands.append({
            "material": corner_mat,
            "qty": float(total_corner_joints_pcs),
            "wastage": 0.0
        })

    # 3. Create requirements records and evaluate status
    created_requirements = []
    total_est_cost = 0.0

    for d in demands:
        mat: Material = d["material"]
        req_qty = d["qty"]
        available = mat.available_stock
        status = "Reserved" if available >= req_qty else "Shortage"

        req = ProjectMaterialRequirement(
            project_id=project.id,
            material_id=mat.id,
            required_qty=req_qty,
            allocated_qty=min(available, req_qty),
            wastage_percent=d["wastage"],
            status=status
        )
        db.add(req)
        created_requirements.append(req)
        total_est_cost += req_qty * mat.unit_cost

    # Update project estimated cost if items were configured
    project.estimated_cost = round(total_est_cost * 1.35, 2) # Adding baseline labor + fabrication buffer
    db.commit()

    return created_requirements

def reserve_project_materials(db: Session, project: Project) -> bool:
    """
    Reserves stock for an approved project by incrementing reserved_stock on Materials
    and logging StockMovement records.
    """
    for req in project.material_requirements:
        mat = db.query(Material).filter(Material.id == req.material_id).first()
        if mat:
            qty_to_reserve = req.required_qty
            mat.reserved_stock = (mat.reserved_stock or 0.0) + qty_to_reserve
            req.allocated_qty = qty_to_reserve
            req.status = "Reserved"

            # Create movement audit log
            movement = StockMovement(
                material_id=mat.id,
                project_id=project.id,
                movement_type="Reservation",
                quantity=qty_to_reserve,
                unit_cost=mat.unit_cost,
                reference_note=f"Material reservation for Project {project.project_number}"
            )
            db.add(movement)

    db.commit()
    return True
