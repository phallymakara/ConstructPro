import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.entities import Supplier, PurchaseOrder, PurchaseOrderItem, Material

def seed_purchasing_data():
    db = SessionLocal()
    try:
        print("Checking existing suppliers and purchase orders...")
        existing_orders = db.query(PurchaseOrder).count()
        if existing_orders > 0:
            print(f"Database already contains {existing_orders} purchase orders.")
            return

        # 1. Fetch materials to associate with POs
        materials_by_code = {m.code: m for m in db.query(Material).all()}
        if not materials_by_code:
            print("Error: No materials found in database.")
            return

        # 2. Seed Suppliers (Local & Overseas)
        suppliers_data = [
            {
                "name": "Phnom Penh Glass & Aluminum Co., Ltd.",
                "supplier_type": "Local",
                "contact_person": "Mr. Sokha Chan",
                "phone": "+855 23 888 123",
                "email": "orders@ppglass.com.kh",
                "materials_supplied": "Architectural Flat Glass, Float Glass, Mirrors",
                "lead_time_days": 3,
                "rating": 4.9,
                "notes": "Primary local glass distributor with quick warehouse delivery"
            },
            {
                "name": "Angkor Steel & Metal Supply",
                "supplier_type": "Local",
                "contact_person": "Mrs. Sophea Meng",
                "phone": "+855 12 456 789",
                "email": "sales@angkorsteel.com.kh",
                "materials_supplied": "Square Box Steel, Structural Steel, Angles",
                "lead_time_days": 4,
                "rating": 4.8,
                "notes": "Reliable local steel stockist based in Sen Sok district"
            },
            {
                "name": "Mekong Hardware & Sealants Trading",
                "supplier_type": "Local",
                "contact_person": "Mr. Bunroeun Chea",
                "phone": "+855 92 112 334",
                "email": "info@mekonghardware.kh",
                "materials_supplied": "Silicone Sealants, Adhesives, Gaskets, Screws",
                "lead_time_days": 2,
                "rating": 5.0,
                "notes": "Official distributor of industrial structural silicone and weather sealants"
            },
            {
                "name": "Guangdong Xingfa Aluminium Co., Ltd.",
                "supplier_type": "Overseas",
                "contact_person": "David Zhang",
                "phone": "+86 757 8888 9999",
                "email": "export@xingfa-alu.cn",
                "materials_supplied": "Extruded Architectural Aluminum Profiles, Curtain Wall Frames",
                "lead_time_days": 18,
                "rating": 4.9,
                "notes": "Direct factory export from Foshan, China. Sea freight to Sihanoukville"
            },
            {
                "name": "Singapore Glazing & Architectural Glass Ltd.",
                "supplier_type": "Overseas",
                "contact_person": "Michael Tan",
                "phone": "+65 6789 1234",
                "email": "sales@singaporeglazing.sg",
                "materials_supplied": "Laminated Safety Glass, Double Glazing, Low-E Glass",
                "lead_time_days": 14,
                "rating": 4.8,
                "notes": "Premium Singaporean glazing manufacturer. Sea freight container shipping to Sihanoukville Port"
            },
            {
                "name": "Vietnam Sun Metal Profiles JSC",
                "supplier_type": "Overseas",
                "contact_person": "Nguyen Van Minh",
                "phone": "+84 28 3912 3456",
                "email": "sales@sunmetal.vn",
                "materials_supplied": "Aluminum Sub-frames, Sliding Tracks, Louvers",
                "lead_time_days": 14,
                "rating": 4.7,
                "notes": "High precision extrusion supplier from Binh Duong. Truck freight via Bavet"
            }
        ]

        suppliers_map = {}
        for s_data in suppliers_data:
            existing_sup = db.query(Supplier).filter(Supplier.name == s_data["name"]).first()
            if not existing_sup:
                sup = Supplier(**s_data)
                db.add(sup)
                db.flush()
                suppliers_map[s_data["name"]] = sup
            else:
                suppliers_map[s_data["name"]] = existing_sup

        db.commit()
        print(f"Suppliers ready: {len(suppliers_map)}")

        # 3. Seed Purchase Orders
        today = datetime.utcnow()
        orders_data = [
            {
                "po_number": "PO-2026-001",
                "supplier_name": "Phnom Penh Glass & Aluminum Co., Ltd.",
                "status": "Received",
                "order_date": today - timedelta(days=16),
                "expected_delivery_date": today - timedelta(days=12),
                "actual_delivery_date": today - timedelta(days=12),
                "notes": "Local order received and stocked into warehouse bay B-02",
                "items": [
                    {"code": "GLS-FROST-06", "qty": 50, "cost": 22.0},
                    {"code": "GLS-TMP-06", "qty": 40, "cost": 16.5},
                ]
            },
            {
                "po_number": "PO-2026-002",
                "supplier_name": "Guangdong Xingfa Aluminium Co., Ltd.",
                "status": "In Transit",
                "order_date": today - timedelta(days=14),
                "expected_delivery_date": today + timedelta(days=4),
                "actual_delivery_date": None,
                "notes": "Overseas sea freight via Sihanoukville Port. Container #COSU7291823",
                "items": [
                    {"code": "PRF-AL50-02", "qty": 120, "cost": 11.0},
                    {"code": "PRF-AL-MULL", "qty": 80, "cost": 18.5},
                ]
            },
            {
                "po_number": "PO-2026-003",
                "supplier_name": "Angkor Steel & Metal Supply",
                "status": "Ordered",
                "order_date": today - timedelta(days=4),
                "expected_delivery_date": today + timedelta(days=2),
                "actual_delivery_date": None,
                "notes": "Local replenishment for upcoming commercial storefront project",
                "items": [
                    {"code": "STL-BOX-50", "qty": 60, "cost": 14.2},
                    {"code": "STL-BOX-100", "qty": 40, "cost": 22.5},
                ]
            },
            {
                "po_number": "PO-2026-004",
                "supplier_name": "Singapore Glazing & Architectural Glass Ltd.",
                "status": "Ordered",
                "order_date": today - timedelta(days=6),
                "expected_delivery_date": today + timedelta(days=9),
                "actual_delivery_date": None,
                "notes": "Overseas sea freight container shipping via Sihanoukville Autonomous Port",
                "items": [
                    {"code": "GLS-TMP-10", "qty": 50, "cost": 26.5},
                    {"code": "GLS-LAM-838", "qty": 30, "cost": 29.0},
                ]
            },
            {
                "po_number": "PO-2026-005",
                "supplier_name": "Mekong Hardware & Sealants Trading",
                "status": "Received",
                "order_date": today - timedelta(days=11),
                "expected_delivery_date": today - timedelta(days=8),
                "actual_delivery_date": today - timedelta(days=9),
                "notes": "Immediate stock in at warehouse rack A-01",
                "items": [
                    {"code": "SIL-BLK-300", "qty": 100, "cost": 3.5},
                    {"code": "GLU-STR-600", "qty": 60, "cost": 7.8},
                ]
            },
            {
                "po_number": "PO-2026-006",
                "supplier_name": "Vietnam Sun Metal Profiles JSC",
                "status": "Ordered",
                "order_date": today - timedelta(days=2),
                "expected_delivery_date": today + timedelta(days=13),
                "actual_delivery_date": None,
                "notes": "Overseas Bavet border road freight shipment pending customs clearance",
                "items": [
                    {"code": "PRF-AL-TRK", "qty": 90, "cost": 9.8},
                    {"code": "PRF-AL-SUB45", "qty": 70, "cost": 10.8},
                ]
            },
            {
                "po_number": "PO-2026-007",
                "supplier_name": "Phnom Penh Glass & Aluminum Co., Ltd.",
                "status": "Draft",
                "order_date": today - timedelta(days=1),
                "expected_delivery_date": today + timedelta(days=3),
                "actual_delivery_date": None,
                "notes": "Draft requisition awaiting site supervisor quantity confirmation",
                "items": [
                    {"code": "GLS-TINT-06", "qty": 35, "cost": 19.0},
                ]
            }
        ]

        created_count = 0
        for o_data in orders_data:
            supplier = suppliers_map.get(o_data["supplier_name"])
            if not supplier:
                continue

            total_cost = sum(it["qty"] * it["cost"] for it in o_data["items"])
            po = PurchaseOrder(
                po_number=o_data["po_number"],
                supplier_id=supplier.id,
                status=o_data["status"],
                total_cost=round(total_cost, 2),
                order_date=o_data["order_date"],
                expected_delivery_date=o_data["expected_delivery_date"],
                actual_delivery_date=o_data["actual_delivery_date"],
                notes=o_data["notes"]
            )
            db.add(po)
            db.flush()

            for item_info in o_data["items"]:
                mat = materials_by_code.get(item_info["code"])
                if mat:
                    po_item = PurchaseOrderItem(
                        purchase_order_id=po.id,
                        material_id=mat.id,
                        quantity=item_info["qty"],
                        unit_cost=item_info["cost"],
                        received_qty=item_info["qty"] if o_data["status"] == "Received" else 0.0
                    )
                    db.add(po_item)
            created_count += 1

        db.commit()
        print(f"Successfully seeded {created_count} purchase orders across Local and Overseas channels!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding purchasing data: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_purchasing_data()
