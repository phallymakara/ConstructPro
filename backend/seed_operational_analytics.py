import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.entities import Project, Material, ProjectPayment, Customer, Quotation

def enrich_operational_data():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print("Enriching projects with realistic financial figures, dates, and locations...")

        # 1. Update existing projects with realistic contract values and payments
        projects = db.query(Project).all()
        project_financial_configs = [
            {
                "id": 7,  # In Progress
                "contract_amount": 38500.0,
                "customer_paid": 25000.0,
                "estimated_cost": 24200.0,
                "actual_cost": 16800.0,
                "location": "BKK1 Commercial Tower, Phnom Penh",
                "start_date": now - timedelta(days=25),
                "deadline_date": now + timedelta(days=35),
            },
            {
                "id": 8,  # Starting / Inbound
                "contract_amount": 26800.0,
                "customer_paid": 10000.0,
                "estimated_cost": 17500.0,
                "actual_cost": 2100.0,
                "location": "Villa Borey Peng Huoth, Chbar Ampov",
                "start_date": now - timedelta(days=5),
                "deadline_date": now + timedelta(days=45),
            },
            {
                "id": 5,  # Completed
                "contract_amount": 42000.0,
                "customer_paid": 42000.0,
                "estimated_cost": 28000.0,
                "actual_cost": 27400.0,
                "location": "Toul Kork Retail Storefront",
                "start_date": now - timedelta(days=80),
                "deadline_date": now - timedelta(days=10),
            },
            {
                "id": 6,  # Overdue or In Progress
                "contract_amount": 19500.0,
                "customer_paid": 12000.0,
                "estimated_cost": 13200.0,
                "actual_cost": 11500.0,
                "location": "Riverside Boutique Hotel, Daun Penh",
                "start_date": now - timedelta(days=50),
                "deadline_date": now - timedelta(days=5),  # Overdue
            },
        ]

        for p_conf in project_financial_configs:
            p = db.query(Project).filter(Project.id == p_conf["id"]).first()
            if p:
                p.contract_amount = p_conf["contract_amount"]
                p.customer_paid = p_conf["customer_paid"]
                p.estimated_cost = p_conf["estimated_cost"]
                p.actual_cost = p_conf["actual_cost"]
                p.location = p_conf["location"]
                p.start_date = p_conf["start_date"]
                p.deadline_date = p_conf["deadline_date"]
                if p_conf["id"] == 6:
                    p.status = "Overdue"

                # Ensure payment record exists for collection tracking
                existing_pm = db.query(ProjectPayment).filter(ProjectPayment.project_id == p.id).first()
                if not existing_pm and p_conf["customer_paid"] > 0:
                    pm = ProjectPayment(
                        project_id=p.id,
                        amount=p_conf["customer_paid"],
                        payment_date=now - timedelta(days=10),
                        payment_method="Bank Transfer",
                        reference_number=f"TXN-{p.id}-2026",
                        notes="Initial project milestone deposit payment"
                    )
                    db.add(pm)

        # 2. Add an additional active project if less than 5 projects
        if len(projects) < 6:
            cust = db.query(Customer).first()
            if cust:
                new_p = Project(
                    project_number="PRJ-202610-0006",
                    project_name="Diamond Island Glazing Facade",
                    customer_id=cust.id,
                    location="Koh Pich / Diamond Island",
                    status="In Progress",
                    start_date=now - timedelta(days=15),
                    deadline_date=now + timedelta(days=20),
                    contract_amount=56000.0,
                    customer_paid=30000.0,
                    estimated_cost=36000.0,
                    actual_cost=21000.0,
                    assigned_manager="Eng. Bunthorn",
                    project_type="Curtain Wall & Facade",
                )
                db.add(new_p)
                db.flush()
                pm2 = ProjectPayment(
                    project_id=new_p.id,
                    amount=30000.0,
                    payment_date=now - timedelta(days=12),
                    payment_method="Bank Transfer",
                    reference_number=f"TXN-{new_p.id}-2026",
                    notes="Contract deposit payment 53%"
                )
                db.add(pm2)

        # 3. Create realistic material buffer shortages for the Shortage Radar
        shortage_adjustments = [
            ("PRF-AL-MULL", 35.0, 80.0),    # Current 35m, Min 80m -> Deficit -45m
            ("GLS-TMP-10", 18.0, 45.0),     # Current 18 sq_m, Min 45 sq_m -> Deficit -27 sq_m
            ("GLU-STR-600", 22.0, 60.0),    # Current 22 pcs, Min 60 pcs -> Deficit -38 pcs
            ("STL-BOX-100", 12.0, 30.0),    # Current 12 pcs, Min 30 pcs -> Deficit -18 pcs
        ]

        for code, stock, min_stock in shortage_adjustments:
            mat = db.query(Material).filter(Material.code == code).first()
            if mat:
                mat.current_stock = stock
                mat.minimum_stock = min_stock

        db.commit()
        print("Operational analytics data successfully enriched!")

    except Exception as e:
        db.rollback()
        print(f"Error enriching operational data: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    enrich_operational_data()
