import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Reconfigure stdout/stderr to UTF-8 to prevent charmap encoding errors on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.database import SessionLocal, Base, engine
from app.models.entities import (
    Customer,
    ProductCategory,
    Material,
    Project,
    ProjectItem,
    ProjectMaterialRequirement,
    ProjectPayment,
    ProjectWorkerLog,
    ProjectTask,
    ProjectSubtask,
    ProjectDocument,
    Quotation,
    StockMovement,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
)

def clear_all_data(db):
    """Safely clear all existing data from tables in reverse dependency order."""
    print("Clearing all existing database records...")
    db.query(PurchaseOrderItem).delete()
    db.query(PurchaseOrder).delete()
    db.query(StockMovement).delete()
    db.query(ProjectMaterialRequirement).delete()
    db.query(ProjectItem).delete()
    db.query(ProjectPayment).delete()
    db.query(ProjectWorkerLog).delete()
    db.query(ProjectSubtask).delete()
    db.query(ProjectTask).delete()
    db.query(ProjectDocument).delete()
    db.query(Quotation).delete()
    db.query(Project).delete()
    db.query(Customer).delete()
    db.query(Material).delete()
    db.query(ProductCategory).delete()
    db.query(Supplier).delete()
    db.commit()
    print("All existing records cleared successfully.")

def seed_khmer_database():
    """Seed comprehensive, realistic data in Khmer language across the entire system."""
    # Step 0: Ensure all database tables exist (crucial for clean production databases)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Step 1: Wipe old data
        clear_all_data(db)

        now = datetime.utcnow()

        # Step 2: Seed Product Categories (ភាសាខ្មែរ)
        print("Seeding product categories in Khmer...")
        categories_data = [
            {
                "name": "កញ្ចក់ស្ថាបត្យកម្ម",
                "description": "កញ្ចក់សុវត្ថិភាព កញ្ចក់សាយ កញ្ចក់ស្រទាប់ និងកញ្ចក់ការពារកម្តៅសម្រាប់អគារ"
            },
            {
                "name": "អាលុយមីញ៉ូម និងដែកសំណង់",
                "description": "ស៊ុមអាលុយមីញ៉ូមទ្វារ-បង្អួច សសរ Curtain Wall និងដែកប្រអប់កាល់វ៉ាណាយ"
            },
            {
                "name": "កាវស៊ីលីកូន និងគ្រឿងបន្លាស់",
                "description": "កាវស៊ីលីកូនការពារជម្រាបទឹក ដៃទ្វារអ៊ីណុក ត្រចៀកកង្កែប និងកៅស៊ូទ្រនាប់ EPDM"
            }
        ]
        cat_map = {}
        for c in categories_data:
            cat = ProductCategory(name=c["name"], description=c["description"])
            db.add(cat)
            db.flush()
            cat_map[c["name"]] = cat

        # Step 3: Seed Materials (ភាសាខ្មែរ) with image paths matching frontend assets
        print("Seeding materials in Khmer with product images...")
        materials_data = [
            # 1. Glass (កញ្ចក់)
            {
                "code": "GLS-FROST-06",
                "name": "កញ្ចក់សាយ ៦មីលីម៉ែត្រ",
                "barcode": "8850001001",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់សាយ",
                "unit": "ម²",
                "unit_cost": 22.0,
                "current_stock": 44.0,
                "reserved_stock": 10.0,
                "minimum_stock": 25.0,
                "storage_location": "r03-b02-l03",
                "image_url": "/products/frosted_glass.jpg",
                "notes": "កញ្ចក់សាយផ្តល់ភាពឯកជន សម្រាប់បន្ទប់ទឹកនិងជញ្ជាំងការិយាល័យ",
            },
            {
                "code": "GLS-TMP-06",
                "name": "កញ្ចក់សុវត្ថិភាពថ្លា ៦មីលីម៉ែត្រ",
                "barcode": "8850001002",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់សុវត្ថិភាព",
                "unit": "ម²",
                "unit_cost": 16.5,
                "current_stock": 75.0,
                "reserved_stock": 20.0,
                "minimum_stock": 30.0,
                "storage_location": "r03-b01-l01",
                "image_url": "/products/tempered_glass.jpg",
                "notes": "កញ្ចក់ Tempered កម្លាំងរឹងមាំខ្ពស់ ធន់នឹងការប៉ះទង្គិច សម្រាប់បង្អួចរុញ",
            },
            {
                "code": "GLS-TMP-10",
                "name": "កញ្ចក់សុវត្ថិភាពថ្លា ១០មីលីម៉ែត្រ",
                "barcode": "8850001003",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់សុវត្ថិភាព",
                "unit": "ម²",
                "unit_cost": 26.5,
                "current_stock": 18.0,
                "reserved_stock": 5.0,
                "minimum_stock": 45.0,  # Shortage for Radar
                "storage_location": "r03-b01-l02",
                "image_url": "/products/tempered_glass.jpg",
                "notes": "កញ្ចក់សុវត្ថិភាពកម្រាស់ ១០មម សម្រាប់ទ្វារបន្ទប់ទឹក និងជញ្ជាំងកញ្ចក់ធំៗ",
            },
            {
                "code": "GLS-TMP-12",
                "name": "កញ្ចក់សុវត្ថិភាពថ្លា ១២មីលីម៉ែត្រ",
                "barcode": "8850001004",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់សុវត្ថិភាព",
                "unit": "ម²",
                "unit_cost": 34.0,
                "current_stock": 35.0,
                "reserved_stock": 15.0,
                "minimum_stock": 30.0,
                "storage_location": "r03-b01-l03",
                "image_url": "/products/tempered_glass.jpg",
                "notes": "កញ្ចក់ Tempered កម្រាស់ក្រាស់ពិសេស សម្រាប់ទ្វារកញ្ចក់គ្មានស៊ុម និងបង្កាន់ដៃ",
            },
            {
                "code": "GLS-LAM-838",
                "name": "កញ្ចក់សុវត្ថិភាពស្រទាប់ ៨.៣៨មីលីម៉ែត្រ",
                "barcode": "8850001005",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់ស្រទាប់",
                "unit": "ម²",
                "unit_cost": 29.0,
                "current_stock": 28.0,
                "reserved_stock": 8.0,
                "minimum_stock": 25.0,
                "storage_location": "r03-b02-l01",
                "image_url": "/products/tempered_glass.jpg",
                "notes": "កញ្ចក់ Laminated ការពារសំឡេង និងសុវត្ថិភាពខ្ពស់ពេលបែកមិនធ្លាក់",
            },
            {
                "code": "GLS-TINT-06",
                "name": "កញ្ចក់ពណ៌ខ្មៅស្រាល ៦មីលីម៉ែត្រ",
                "barcode": "8850001006",
                "category": "Glass",
                "category_id": cat_map["កញ្ចក់ស្ថាបត្យកម្ម"].id,
                "product_type": "កញ្ចក់ពណ៌",
                "unit": "ម²",
                "unit_cost": 19.0,
                "current_stock": 50.0,
                "reserved_stock": 12.0,
                "minimum_stock": 30.0,
                "storage_location": "r03-b02-l02",
                "image_url": "/products/tinted_glass.jpg",
                "notes": "កញ្ចក់ពណ៌ជួយកាត់បន្ថយកម្តៅថ្ងៃ និងការពារកាំរស្មីយូវី",
            },

            # 2. Aluminum & Steel Profiles (អាលុយមីញ៉ូម និងដែកសំណង់)
            {
                "code": "PRF-AL50-01",
                "name": "ស៊ុមអាលុយមីញ៉ូម ស៊េរី ៥០ (ពណ៌ខ្មៅ)",
                "barcode": "8850002001",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ស៊ុមអាលុយមីញ៉ូម",
                "unit": "ដើម",
                "unit_cost": 11.5,
                "current_stock": 95.0,
                "reserved_stock": 30.0,
                "minimum_stock": 50.0,
                "storage_location": "r01-b01-l01",
                "image_url": "/products/aluminum_profile_black.jpg",
                "notes": "ស៊ុមអាលុយមីញ៉ូមស្ដង់ដារសម្រាប់បង្អួចរុញ និងទ្វារបន្ទប់",
            },
            {
                "code": "PRF-AL50-02",
                "name": "ស៊ុមអាលុយមីញ៉ូម ស៊េរី ៥០ (ពណ៌ប្រផេះទំនើប)",
                "barcode": "8850002002",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ស៊ុមអាលុយមីញ៉ូម",
                "unit": "ដើម",
                "unit_cost": 12.0,
                "current_stock": 110.0,
                "reserved_stock": 40.0,
                "minimum_stock": 40.0,
                "storage_location": "r01-b01-l02",
                "image_url": "/products/aluminum_profile_grey.jpg",
                "notes": "ស៊ុមអាលុយមីញ៉ូមពណ៌ប្រផេះស្រោប Anodized គុណភាពខ្ពស់",
            },
            {
                "code": "PRF-AL-MULL",
                "name": "សសរអាលុយមីញ៉ូម Mullion កម្លាំងរឹងមាំ",
                "barcode": "8850002003",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ស៊ុមអាលុយមីញ៉ូម",
                "unit": "ដើម",
                "unit_cost": 18.5,
                "current_stock": 35.0,
                "reserved_stock": 20.0,
                "minimum_stock": 80.0,  # Shortage for Radar
                "storage_location": "r01-b02-l01",
                "image_url": "/products/curtain_wall_mullion.jpg",
                "notes": "សសរបញ្ឈរ Mullion ទ្រទ្រង់កញ្ចក់សម្រាប់ជញ្ជាំងកញ្ចក់ Curtain Wall",
            },
            {
                "code": "PRF-AL-TRK",
                "name": "ផ្លូវរត់ទ្វាររុញអាលុយមីញ៉ូម ២ជាន់",
                "barcode": "8850002004",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ផ្លូវរត់រុញ",
                "unit": "ដើម",
                "unit_cost": 9.8,
                "current_stock": 65.0,
                "reserved_stock": 15.0,
                "minimum_stock": 35.0,
                "storage_location": "r01-b02-l02",
                "image_url": "/products/aluminum_profiles.jpg",
                "notes": "ផ្លូវរត់រអិលយ៉ាងរលូនសម្រាប់ទ្វារ និងបង្អួចរុញ",
            },
            {
                "code": "PRF-AL-SUB45",
                "name": "ស៊ុមអាលុយមីញ៉ូមទ្វារចំហៀង ស៊េរី ៤៥",
                "barcode": "8850002005",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ស៊ុមអាលុយមីញ៉ូម",
                "unit": "ដើម",
                "unit_cost": 10.8,
                "current_stock": 70.0,
                "reserved_stock": 25.0,
                "minimum_stock": 40.0,
                "storage_location": "r01-b03-l01",
                "image_url": "/products/aluminum_profiles.jpg",
                "notes": "ស៊ុមរឹងមាំសម្រាប់ទ្វារចំហៀងនិងទ្វារបង្អួចបើកហើប",
            },
            {
                "code": "STL-BOX-50",
                "name": "ដែកប្រអប់ ៥០x៥០x១.៤ មម កាល់វ៉ាណាយ",
                "barcode": "8850002006",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ដែកសំណង់",
                "unit": "ដើម",
                "unit_cost": 14.2,
                "current_stock": 80.0,
                "reserved_stock": 20.0,
                "minimum_stock": 40.0,
                "storage_location": "r02-b01-l01",
                "image_url": "/products/steel_box_tube.jpg",
                "notes": "ដែកប្រអប់កាល់វ៉ាណាយការពារច្រែះ សម្រាប់រចនាសម្ព័ន្ធទ្រទ្រង់ខាងក្នុង",
            },
            {
                "code": "STL-BOX-100",
                "name": "ដែកប្រអប់ ១០០x៥០x២.០ មម កាល់វ៉ាណាយ",
                "barcode": "8850002007",
                "category": "Profile",
                "category_id": cat_map["អាលុយមីញ៉ូម និងដែកសំណង់"].id,
                "product_type": "ដែកសំណង់",
                "unit": "ដើម",
                "unit_cost": 22.5,
                "current_stock": 12.0,
                "reserved_stock": 5.0,
                "minimum_stock": 30.0,  # Shortage for Radar
                "storage_location": "r02-b01-l02",
                "image_url": "/products/steel_box_tube.jpg",
                "notes": "ដែកប្រអប់ធំរឹងមាំខ្ពស់ សម្រាប់គ្រោងឆ្អឹងជញ្ជាំងកញ្ចក់និងដំបូល",
            },

            # 3. Adhesives & Sealants & Accessories (កាវស៊ីលីកូន និងគ្រឿងបន្លាស់)
            {
                "code": "SIL-BLK-300",
                "name": "កាវស៊ីលីកូនខ្មៅ Weatherproof ៣០០មីលីលីត្រ",
                "barcode": "8850003001",
                "category": "Seal",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "កាវស៊ីលីកូន",
                "unit": "ដប",
                "unit_cost": 3.5,
                "current_stock": 180.0,
                "reserved_stock": 40.0,
                "minimum_stock": 100.0,
                "storage_location": "r04-b01-l01",
                "image_url": "/products/black_silicone.jpg",
                "notes": "ស៊ីលីកូនការពារជម្រាបទឹកធន់នឹងកម្តៅថ្ងៃ សម្រាប់បាញ់គែមបង្អួចនិងទ្វារខាងក្រៅ",
            },
            {
                "code": "SIL-CLR-300",
                "name": "កាវស៊ីលីកូនថ្លា Clear Silicone ៣០០មីលីលីត្រ",
                "barcode": "8850003002",
                "category": "Seal",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "កាវស៊ីលីកូន",
                "unit": "ដប",
                "unit_cost": 3.6,
                "current_stock": 150.0,
                "reserved_stock": 30.0,
                "minimum_stock": 80.0,
                "storage_location": "r04-b01-l02",
                "image_url": "/products/sealants.jpg",
                "notes": "ស៊ីលីកូនថ្លាស្អាត សម្រាប់បាញ់តំណរភ្ជាប់កញ្ចក់ក្នុងបន្ទប់ទឹកនិងការិយាល័យ",
            },
            {
                "code": "GLU-STR-600",
                "name": "កាវស៊ីលីកូនស្ថាបត្យកម្ម Structural Glazing ៦០០មីលីលីត្រ",
                "barcode": "8850003003",
                "category": "Seal",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "កាវស៊ីលីកូន",
                "unit": "កញ្ចប់",
                "unit_cost": 7.8,
                "current_stock": 22.0,
                "reserved_stock": 10.0,
                "minimum_stock": 60.0,  # Shortage for Radar
                "storage_location": "r04-b02-l01",
                "image_url": "/products/sealants.jpg",
                "notes": "កាវស៊ីលីកូនកម្លាំងស្អិតខ្ពស់ពិសេស សម្រាប់បិទភ្ជាប់បន្ទះកញ្ចក់អគារខ្ពស់",
            },
            {
                "code": "HDW-HDL-SS",
                "name": "ដៃទ្វារទាញ អ៊ីណុក ៣០៤ ប្រវែង ៦០០មម",
                "barcode": "8850003004",
                "category": "Hardware",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "គ្រឿងបន្លាស់",
                "unit": "គូ",
                "unit_cost": 24.0,
                "current_stock": 45.0,
                "reserved_stock": 10.0,
                "minimum_stock": 20.0,
                "storage_location": "r04-b03-l01",
                "image_url": "/products/stainless_door_handle.jpg",
                "notes": "ដៃទ្វារអ៊ីណុក ៣០៤ ប្រឆាំងការច្រែះ សម្រាប់ទ្វារកញ្ចក់ការិយាល័យ",
            },
            {
                "code": "HDW-FLR-HINGE",
                "name": "ត្រចៀកកង្កែបទ្វារកញ្ចក់បាតក្រោម Floor Spring",
                "barcode": "8850003005",
                "category": "Hardware",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "គ្រឿងបន្លាស់",
                "unit": "ឈុត",
                "unit_cost": 48.0,
                "current_stock": 30.0,
                "reserved_stock": 8.0,
                "minimum_stock": 15.0,
                "storage_location": "r04-b03-l02",
                "image_url": "/products/floor_spring_hinge.jpg",
                "notes": "ឧបករណ៍ទប់លំនឹងនិងបិទទ្វារកញ្ចក់ស្វ័យប្រវត្តិកប់ក្នុងកម្រាលឥដ្ឋ",
            },
            {
                "code": "GSK-EPDM-01",
                "name": "កៅស៊ូទ្រនាប់កញ្ចក់ EPDM ធន់កម្តៅថ្ងៃ",
                "barcode": "8850003006",
                "category": "Seal",
                "category_id": cat_map["កាវស៊ីលីកូន និងគ្រឿងបន្លាស់"].id,
                "product_type": "កៅស៊ូទ្រនាប់",
                "unit": "ម៉ែត្រ",
                "unit_cost": 0.85,
                "current_stock": 350.0,
                "reserved_stock": 120.0,
                "minimum_stock": 200.0,
                "storage_location": "r04-b02-l02",
                "image_url": "/products/epdm_gasket_seal.jpg",
                "notes": "កៅស៊ូ EPDM គុណភាពខ្ពស់មិនងាយស្រួយ សម្រាប់ទ្រាប់គែមកញ្ចក់ការពារទឹក",
            },
        ]

        mat_map = {}
        for m_data in materials_data:
            mat = Material(**m_data)
            db.add(mat)
            db.flush()
            mat_map[m_data["code"]] = mat

        # Step 4: Seed Customers (ភាសាខ្មែរ)
        print("Seeding Cambodian customers in Khmer...")
        customers_data = [
            {
                "name": "ចាន់ សុភា",
                "company": "ក្រុមហ៊ុន បុរី ប៉េង ហួត",
                "contact_person": "លោក ចាន់ សុភា",
                "phone": "012 888 776",
                "email": "chan.s@penghuoth.com",
                "address": "មហាវិថីព្រះមុនីវង្ស សង្កាត់ច្បារអំពៅ ខណ្ឌច្បារអំពៅ រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "អតិថិជនគម្រោងលំនៅឋានប្រណិតធំប្រចាំរាជធានីភ្នំពេញ"
            },
            {
                "name": "សុខ លីដា",
                "company": "ក្រុមហ៊ុន ជីប ម៉ុង លែន",
                "contact_person": "កញ្ញា សុខ លីដា",
                "phone": "098 765 654",
                "email": "lida.s@chipmongland.com",
                "address": "មហាវិថីសម្ដេចតេជោ ហ៊ុន សែន (ផ្លូវ ៦០ម៉ែត្រ) រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "ដៃគូអភិវឌ្ឍន៍អគារពាណិជ្ជកម្ម និងបុរីទំនើប"
            },
            {
                "name": "សេង វណ្ណា",
                "company": "ក្រុមហ៊ុន អូស៊ីអាយស៊ី ខេមបូឌា",
                "contact_person": "លោក សេង វណ្ណា",
                "phone": "017 999 332",
                "email": "vanna.seng@ocic.com.kh",
                "address": "ទីក្រុងកោះពេជ្រ សង្កាត់ទន្លេបាសាក់ ខណ្ឌចំការមន រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Email",
                "notes": "គម្រោងខុនដូ និងមជ្ឈមណ្ឌលសន្និបាតទំនើប"
            },
            {
                "name": "ជា ពិសិដ្ឋ",
                "company": "ក្រុមហ៊ុន ភ្នំពេញ រៀលធី",
                "contact_person": "លោក ជា ពិសិដ្ឋ",
                "phone": "092 334 556",
                "email": "piseth.chea@pprealty.com",
                "address": "ផ្លូវ ៣១០ សង្កាត់បឹងកេងកង១ ខណ្ឌបឹងកេងកង រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "គម្រោងកែប្រែនិងតុបតែងការិយាល័យទំនើប"
            },
            {
                "name": "សម្បត្តិ",
                "company": "សម្បត្តិ ត្រេឌីង",
                "contact_person": "ចាន់ណា",
                "phone": "098 765 444",
                "email": "channa@sombath.com.kh",
                "address": "ផ្លូវជាតិលេខ ៣ សង្កាត់ចោមចៅ ខណ្ឌពោធិ៍សែនជ័យ រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "អតិថិជនបញ្ជាទិញទ្វារកញ្ចក់ និងបង្អួចអាលុយមីញ៉ូមជាប់លាប់"
            },
            {
                "name": "ម៉េង គីមសួរ",
                "company": "ក្រុមហ៊ុន វឌ្ឍនៈ ប្រផឹធី",
                "contact_person": "អ្នកស្រី ម៉េង គីមសួរ",
                "phone": "011 223 344",
                "email": "kimsour.m@vattanac.com",
                "address": "មហាវិថីព្រះមុនីវង្ស សង្កាត់វត្តភ្នំ ខណ្ឌដូនពេញ រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "គម្រោងដំឡើងកញ្ចក់សុវត្ថិភាពនិងបង្កាន់ដៃកញ្ចក់អគារពាណិជ្ជកម្ម"
            },
            {
                "name": "លោក ឡុង វិបុល",
                "company": "ក្រុមហ៊ុន អង្គរ អភិវឌ្ឍន៍ រីហ្សត",
                "contact_person": "លោក ឡុង វិបុល",
                "phone": "063 965 888",
                "email": "vibol.long@angkorresort.com",
                "address": "ផ្លូវស៊ីវត្ថា សង្កាត់ស្វាយដង្គំ ក្រុងសៀមរាប ខេត្តសៀមរាប",
                "preferred_contact_method": "Phone",
                "notes": "គម្រោងសណ្ឋាគារនិងរីសតប្រណិតក្រុងសៀមរាប"
            },
            {
                "name": "បុរីកីឡា",
                "company": "បុរីកីឡា",
                "contact_person": "ប្រូចេន",
                "phone": "098 765 6543",
                "email": "brochen@boreykeila.kh",
                "address": "បុរីកីឡា សង្កាត់វាលវង់ ខណ្ឌ៧មករា រាជធានីភ្នំពេញ",
                "preferred_contact_method": "Phone",
                "notes": "គម្រោងផ្ទះចល័តកញ្ចក់ និងអាលុយមីញ៉ូម"
            }
        ]

        cust_map = {}
        for c_data in customers_data:
            cust = Customer(**c_data)
            db.add(cust)
            db.flush()
            cust_map[c_data["name"]] = cust

        # Step 5: Seed Suppliers (ភាសាខ្មែរ: Local & Overseas)
        print("Seeding suppliers in Khmer (Local & Overseas)...")
        suppliers_data = [
            {
                "name": "ក្រុមហ៊ុន ភ្នំពេញ កញ្ចក់ និងអាលុយមីញ៉ូម",
                "supplier_type": "Local",
                "contact_person": "លោក សុខា ចាន់",
                "phone": "023 888 123",
                "email": "orders@ppglass.com.kh",
                "materials_supplied": "កញ្ចក់សុវត្ថិភាព កញ្ចក់សាយ កញ្ចក់ឆ្លុះ និងកញ្ចក់ពណ៌",
                "lead_time_days": 3,
                "rating": 4.9,
                "notes": "អ្នកចែកចាយកញ្ចក់សំណង់ធំជាងគេក្នុងរាជធានីភ្នំពេញ ដឹកជញ្ជូនរហ័សដល់ឃ្លាំង"
            },
            {
                "name": "ក្រុមហ៊ុន អង្គរ ដែក និងលោហៈធាតុសំណង់",
                "supplier_type": "Local",
                "contact_person": "អ្នកស្រី សុភា ម៉េង",
                "phone": "012 456 789",
                "email": "sales@angkorsteel.com.kh",
                "materials_supplied": "ដែកប្រអប់កាល់វ៉ាណាយ ដែកអក្សរ C និងដែកសន្លឹក",
                "lead_time_days": 4,
                "rating": 4.8,
                "notes": "ដេប៉ូដែកសំណង់ធំប្រចាំខណ្ឌសែនសុខ គុណភាពដែកកម្រាស់ស្តង់ដារ"
            },
            {
                "name": "ក្រុមហ៊ុន មេគង្គ ហាតវែរ និងកាវស៊ីលីកូន",
                "supplier_type": "Local",
                "contact_person": "លោក ប៊ុនរឿន ជា",
                "phone": "092 112 334",
                "email": "info@mekonghardware.kh",
                "materials_supplied": "កាវស៊ីលីកូនការពារជម្រាបទឹក ដៃទ្វារ ត្រចៀកកង្កែប និងកៅស៊ូ EPDM",
                "lead_time_days": 2,
                "rating": 5.0,
                "notes": "តំណាងចែកចាយផ្លូវការនៃកាវស៊ីលីកូនស្ថាបត្យកម្ម និងគ្រឿងបន្លាស់ទ្វារកញ្ចក់"
            },
            {
                "name": "ក្រុមហ៊ុន ក្វាងទុង ស៊ីងហ្វា អាលុយមីញ៉ូម (ប្រទេសចិន)",
                "supplier_type": "Overseas",
                "contact_person": "លោក David Zhang",
                "phone": "+86 757 8888 9999",
                "email": "export@xingfa-alu.cn",
                "materials_supplied": "ស៊ុមអាលុយមីញ៉ូមស្ថាបត្យកម្ម ស៊េរី ៥០ គ្រោង Curtain Wall",
                "lead_time_days": 18,
                "rating": 4.9,
                "notes": "នាំចេញដោយផ្ទាល់ពីរោងចក្រក្រុង Foshan ប្រទេសចិន ដឹកជញ្ជូនតាមកប៉ាល់មកកំពង់ផែក្រុងព្រះសីហនុ"
            },
            {
                "name": "ក្រុមហ៊ុន បាងកក កញ្ចក់ស្ថាបត្យកម្ម (ប្រទេសថៃ)",
                "supplier_type": "Overseas",
                "contact_person": "លោក Somchai Prasert",
                "phone": "+66 2 765 4321",
                "email": "intertrade@bkkglazing.co.th",
                "materials_supplied": "កញ្ចក់សុវត្ថិភាពកម្រាស់ក្រាស់ កញ្ចក់ Laminated និង Low-E",
                "lead_time_days": 12,
                "rating": 4.8,
                "notes": "រោងចក្រកញ្ចក់ស្ដង់ដារអន្តរជាតិនៅបាងកក ដឹកជញ្ជូនតាមរថយន្តកុងតឺន័រកាត់ច្រកទ្វារប៉ោយប៉ែត"
            },
            {
                "name": "ក្រុមហ៊ុន វៀតណាម សាន់មេថល (ប្រទេសវៀតណាម)",
                "supplier_type": "Overseas",
                "contact_person": "លោក Nguyen Van Minh",
                "phone": "+84 28 3912 3456",
                "email": "sales@sunmetal.vn",
                "materials_supplied": "ផ្លូវរត់ទ្វាររុញ ស៊ុមអាលុយមីញ៉ូមបន្ទាប់បន្សំ និងគ្រឿងតំណរ",
                "lead_time_days": 14,
                "rating": 4.7,
                "notes": "រោងចក្រអាលុយមីញ៉ូមខេត្ត Binh Duong ដឹកជញ្ជូនតាមរថយន្តឆ្លងកាត់ច្រកទ្វារព្រំដែនបាវិត"
            }
        ]

        sup_map = {}
        for s_data in suppliers_data:
            sup = Supplier(**s_data)
            db.add(sup)
            db.flush()
            sup_map[s_data["name"]] = sup

        # Step 6: Seed Projects (ទាំង Sales និង Operations ក្នុងភាសាខ្មែរ)
        print("Seeding projects in Khmer across Sales & Operations...")
        projects_data = [
            # 1. Operational In-Progress Project
            {
                "project_number": "PRJ-202610-0001",
                "project_name": "គម្រោងដំឡើងទ្វារ-បង្អួចអាលុយមីញ៉ូម បុរី ប៉េង ហួត",
                "customer_name": "ចាន់ សុភា",
                "location": "បុរី ប៉េង ហួត ច្បារអំពៅ, រាជធានីភ្នំពេញ",
                "status": "In Progress",
                "source": "project",
                "project_type": "Window & Door Installation",
                "assigned_manager": "វិស្វករ ប៊ុនថន",
                "architect": "ស្ថាបត្យករ ចាន់ថន",
                "worker": "ក្រុមជាង ពិសិដ្ឋ (៥ នាក់)",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "លោក ចាន់ សុភា",
                "site_supervisor": "មេការ សុវណ្ណ",
                "start_date": now - timedelta(days=25),
                "deadline_date": now + timedelta(days=20),
                "contract_amount": 38500.0,
                "customer_paid": 25000.0,
                "estimated_cost": 24200.0,
                "actual_cost": 16800.0,
                "material_cost": 14000.0,
                "labor_cost": 2400.0,
                "other_expenses": 400.0,
                "priority": "High",
                "preferred_contact_method": "Phone",
                "notes": "ការងារដំឡើងស៊ុមអាលុយមីញ៉ូមពណ៌ប្រផេះ និងកញ្ចក់សុវត្ថិភាព ៦មម សម្រាប់វីឡាចំនួន ៨ ខ្នង"
            },
            # 2. Operational In-Progress Curtain Wall
            {
                "project_number": "PRJ-202610-0002",
                "project_name": "គម្រោងជញ្ជាំងកញ្ចក់អគារពាណិជ្ជកម្ម ជីប ម៉ុង ថៅវើ",
                "customer_name": "សុខ លីដា",
                "location": "ផ្លូវ ៦០ម៉ែត្រ, រាជធានីភ្នំពេញ",
                "status": "In Progress",
                "source": "project",
                "project_type": "Curtain Wall & Facade",
                "assigned_manager": "វិស្វករ សុខុម",
                "architect": "ស្ថាបត្យករ វិសាល",
                "worker": "ក្រុមជាង គឹមសាន (៨ នាក់)",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "កញ្ញា សុខ លីដា",
                "site_supervisor": "មេការ វីរៈ",
                "start_date": now - timedelta(days=15),
                "deadline_date": now + timedelta(days=35),
                "contract_amount": 58000.0,
                "customer_paid": 35000.0,
                "estimated_cost": 38000.0,
                "actual_cost": 22500.0,
                "material_cost": 18500.0,
                "labor_cost": 3500.0,
                "other_expenses": 500.0,
                "priority": "High",
                "preferred_contact_method": "Phone",
                "notes": "ជញ្ជាំងកញ្ចក់ខាងក្រៅ Curtain Wall ដោយប្រើកញ្ចក់ Laminated ៨.៣៨មម និងសសរអាលុយមីញ៉ូម Mullion"
            },
            # 3. Operational Starting Project
            {
                "project_number": "PRJ-202610-0003",
                "project_name": "គម្រោងទ្វារកញ្ចក់បន្ទប់ការិយាល័យ និងបន្ទប់ប្រជុំ អូស៊ីអាយស៊ី",
                "customer_name": "សេង វណ្ណា",
                "location": "អគារកោះពេជ្រ, ខណ្ឌចំការមន, រាជធានីភ្នំពេញ",
                "status": "Starting",
                "source": "project",
                "project_type": "Glass Partition & Interior",
                "assigned_manager": "វិស្វករ ធារ៉ា",
                "architect": "ស្ថាបត្យករ ចាន់ថន",
                "worker": "ក្រុមជាង សុខា (៤ នាក់)",
                "sales_person": "កញ្ញា ដាលីន",
                "customer_representative": "លោក សេង វណ្ណា",
                "site_supervisor": "មេការ សម្បត្តិ",
                "start_date": now - timedelta(days=5),
                "deadline_date": now + timedelta(days=40),
                "contract_amount": 26800.0,
                "customer_paid": 10000.0,
                "estimated_cost": 17500.0,
                "actual_cost": 2100.0,
                "material_cost": 1800.0,
                "labor_cost": 300.0,
                "other_expenses": 0.0,
                "priority": "Medium",
                "preferred_contact_method": "Email",
                "notes": "ជញ្ជាំងកញ្ចក់សាយ ៦មម និងទ្វារកញ្ចក់គ្មានស៊ុមប្រើត្រចៀកកង្កែប Floor Spring"
            },
            # 4. Completed Project
            {
                "project_number": "PRJ-202610-0004",
                "project_name": "គម្រោងដំឡើងទ្វារកញ្ចក់ និងបង្អួចហាងទំនិញ ទួលគោក",
                "customer_name": "ជា ពិសិដ្ឋ",
                "location": "ផ្លូវ ៣១៥, ខណ្ឌទួលគោក, រាជធានីភ្នំពេញ",
                "status": "Completed",
                "source": "project",
                "project_type": "Commercial Storefront",
                "assigned_manager": "វិស្វករ ប៊ុនថន",
                "architect": "ស្ថាបត្យករ វិសាល",
                "worker": "ក្រុមជាង ពិសិដ្ឋ (៤ នាក់)",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "លោក ជា ពិសិដ្ឋ",
                "site_supervisor": "មេការ សុវណ្ណ",
                "start_date": now - timedelta(days=80),
                "deadline_date": now - timedelta(days=10),
                "actual_end_date": now - timedelta(days=10),
                "contract_amount": 42000.0,
                "customer_paid": 42000.0,
                "estimated_cost": 28000.0,
                "actual_cost": 27400.0,
                "material_cost": 23000.0,
                "labor_cost": 3800.0,
                "other_expenses": 600.0,
                "priority": "Medium",
                "preferred_contact_method": "Phone",
                "notes": "បានបញ្ចប់ការដំឡើង ១០០% និងប្រគល់ការងារជូនអតិថិជនយ៉ាងជោគជ័យ"
            },
            # 5. Overdue Project
            {
                "project_number": "PRJ-202610-0005",
                "project_name": "គម្រោងបង្អួចអាលុយមីញ៉ូមសណ្ឋាគាររីវើសាយ ដូនពេញ",
                "customer_name": "ម៉េង គីមសួរ",
                "location": "តំបន់មាត់ទន្លេ, សង្កាត់ផ្សារកណ្តាល, ខណ្ឌដូនពេញ, រាជធានីភ្នំពេញ",
                "status": "Overdue",
                "source": "project",
                "project_type": "Window & Door Installation",
                "assigned_manager": "វិស្វករ ធារ៉ា",
                "architect": "ស្ថាបត្យករ ចាន់ថន",
                "worker": "ក្រុមជាង គឹមសាន (៤ នាក់)",
                "sales_person": "កញ្ញា ដាលីន",
                "customer_representative": "អ្នកស្រី ម៉េង គីមសួរ",
                "site_supervisor": "មេការ វីរៈ",
                "start_date": now - timedelta(days=50),
                "deadline_date": now - timedelta(days=5),
                "contract_amount": 19500.0,
                "customer_paid": 12000.0,
                "estimated_cost": 13200.0,
                "actual_cost": 11500.0,
                "material_cost": 9500.0,
                "labor_cost": 1800.0,
                "other_expenses": 200.0,
                "priority": "High",
                "preferred_contact_method": "Phone",
                "notes": "ពន្យារពេលដោយសារអាកាសធាតុភ្លៀងខ្លាំង កំពុងពន្លឿនការងារដំឡើងបញ្ចប់"
            },
            # 6. Sales In Progress Project (ផ្ទះចល័ត)
            {
                "project_number": "PRJ-202610-0006",
                "project_name": "គម្រោងផ្ទះចល័តកញ្ចក់ និងអាលុយមីញ៉ូម បុរីកីឡា",
                "customer_name": "បុរីកីឡា",
                "location": "បុរីកីឡា, ភ្នំពេញ",
                "status": "In Progress",
                "source": "sales",
                "project_type": "Window & Door Installation",
                "assigned_manager": "វិស្វករ សុខុម",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "ប្រូចេន",
                "start_date": now - timedelta(days=3),
                "deadline_date": now + timedelta(days=11),
                "contract_amount": 18000.0,
                "customer_paid": 8000.0,
                "estimated_cost": 12000.0,
                "actual_cost": 4500.0,
                "material_cost": 3800.0,
                "labor_cost": 700.0,
                "priority": "Medium",
                "preferred_contact_method": "Phone",
                "notes": "ការផ្គុំរចនាសម្ព័ន្ធផ្ទះចល័តកញ្ចក់ Tempered ១០មម សម្រាប់តាំងពិព័រណ៍"
            },
            # 7. Sales Draft Project (ទ្វាកញ្ចក់)
            {
                "project_number": "PRJ-202610-0007",
                "project_name": "គម្រោងទ្វារកញ្ចក់ស្វ័យប្រវត្តិ ចោមចៅ",
                "customer_name": "សម្បត្តិ",
                "location": "ចោមចៅ, ភ្នំពេញ",
                "status": "Draft",
                "source": "sales",
                "project_type": "Glass Partition & Interior",
                "assigned_manager": "វិស្វករ ប៊ុនថន",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "ចាន់ណា",
                "start_date": now - timedelta(days=1),
                "deadline_date": now + timedelta(days=14),
                "contract_amount": 9500.0,
                "customer_paid": 0.0,
                "estimated_cost": 6500.0,
                "actual_cost": 0.0,
                "priority": "Low",
                "preferred_contact_method": "Phone",
                "notes": "សេចក្តីព្រាងសម្រង់តម្លៃសម្រាប់ទ្វារកញ្ចក់ស្វ័យប្រវត្តិ Sensor"
            },
            # 8. Sales In Progress Project (បង្អួច)
            {
                "project_number": "PRJ-202610-0008",
                "project_name": "គម្រោងបង្អួចអាលុយមីញ៉ូមប្រណិត ក្រុងបាវិត ស្វាយរៀង",
                "customer_name": "សម្បត្តិ",
                "location": "ស្វាយរៀង",
                "status": "In Progress",
                "source": "sales",
                "project_type": "Window & Door Installation",
                "assigned_manager": "វិស្វករ ធារ៉ា",
                "sales_person": "កញ្ញា ដាលីន",
                "customer_representative": "ចាន់ណា",
                "start_date": now - timedelta(days=2),
                "deadline_date": now + timedelta(days=12),
                "contract_amount": 22000.0,
                "customer_paid": 11000.0,
                "estimated_cost": 15000.0,
                "actual_cost": 5000.0,
                "material_cost": 4200.0,
                "labor_cost": 800.0,
                "priority": "High",
                "preferred_contact_method": "Phone",
                "notes": "ដំឡើងបង្អួចអាលុយមីញ៉ូមស៊េរី ៥០ សម្រាប់អគារបុគ្គលិកនៅក្រុងបាវិត"
            },
            # 9. Sales Won Project
            {
                "project_number": "PRJ-202610-0009",
                "project_name": "គម្រោងបង្កាន់ដៃកញ្ចក់ និងដំបូល Skylight សណ្ឋាគារអង្គរ",
                "customer_name": "លោក ឡុង វិបុល",
                "location": "ក្រុងសៀមរាប, ខេត្តសៀមរាប",
                "status": "Closed Won",
                "source": "sales_won",
                "project_type": "Custom Glazing & Metal Works",
                "assigned_manager": "វិស្វករ ប៊ុនថន",
                "sales_person": "លោក រដ្ឋា",
                "customer_representative": "លោក ឡុង វិបុល",
                "start_date": now - timedelta(days=10),
                "deadline_date": now + timedelta(days=25),
                "contract_amount": 45000.0,
                "customer_paid": 20000.0,
                "estimated_cost": 30000.0,
                "actual_cost": 8000.0,
                "material_cost": 6500.0,
                "labor_cost": 1500.0,
                "priority": "High",
                "preferred_contact_method": "Phone",
                "notes": "ការដេញថ្លៃឈ្នះកិច្ចសន្យាដំឡើងបង្កាន់ដៃកញ្ចក់អាងហែលទឹក និងដំបូលកញ្ចក់ Skylight"
            }
        ]

        proj_map = {}
        for p_data in projects_data:
            cust = cust_map.get(p_data["customer_name"])
            p_dict = dict(p_data)
            del p_dict["customer_name"]
            p_dict["customer_id"] = cust.id if cust else None
            proj = Project(**p_dict)
            db.add(proj)
            db.flush()
            proj_map[proj.project_number] = proj

        # Step 7: Seed Project Tasks & Subtasks (Kanban in Khmer)
        print("Seeding project tasks & subtasks in Khmer...")
        main_proj = proj_map["PRJ-202610-0001"]
        tasks_data = [
            {
                "task_id": "TSK-01",
                "name": "ការវាស់វែង និងពិនិត្យប្លង់ទីតាំងជាក់ស្តែង",
                "description": "ចុះវាស់វែងទំហំប្រហោងជញ្ជាំង និងផ្ទៀងផ្ទាត់កម្រាស់ជញ្ជាំងនៅការដ្ឋាន",
                "status": "Done",
                "start_date": (now - timedelta(days=24)).strftime("%Y-%m-%d"),
                "end_date": (now - timedelta(days=22)).strftime("%Y-%m-%d"),
                "est_end_date": (now - timedelta(days=22)).strftime("%Y-%m-%d"),
                "sort_order": 1,
                "subtasks": [
                    {
                        "subtask_id": "ST-01-1",
                        "title": "វាស់ខ្នាតទំហំប្រហោងជញ្ជាំងជាក់ស្តែងតាមជាន់នីមួយៗ",
                        "description": "កត់ត្រាទទឹង កម្ពស់ និងកម្រាស់បៀក",
                        "progress": 100.0,
                        "completed": True,
                        "sort_order": 1
                    },
                    {
                        "subtask_id": "ST-01-2",
                        "title": "ផ្ទៀងផ្ទាត់ប្លង់ស្ថាបត្យកម្មជាមួយវិស្វករការដ្ឋាន",
                        "description": "ចុះហត្ថលេខាឯកភាពលើទំហំកាត់ជាក់ស្តែង",
                        "progress": 100.0,
                        "completed": True,
                        "sort_order": 2
                    }
                ]
            },
            {
                "task_id": "TSK-02",
                "name": "ការកាត់និងផ្គុំគ្រោងស៊ុមអាលុយមីញ៉ូម",
                "description": "កាត់អាលុយមីញ៉ូមស៊េរី ៥០ តាមរោងជាង និងដំឡើងត្រចៀកកង្កែប",
                "status": "In Progress",
                "start_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
                "end_date": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
                "est_end_date": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
                "sort_order": 2,
                "subtasks": [
                    {
                        "subtask_id": "ST-02-1",
                        "title": "កាត់ស៊ុមអាលុយមីញ៉ូមស៊េរី ៥០ តាមប្រវែងប្លង់",
                        "description": "កាត់មុំ ៤៥ ដឺក្រេយ៉ាងរលោងស្អាត",
                        "progress": 85.0,
                        "completed": False,
                        "sort_order": 1
                    },
                    {
                        "subtask_id": "ST-02-2",
                        "title": "ចោះប្រហោងខ្ចៅ និងដំឡើងគន្លឹះចាក់សោ",
                        "description": "ដំឡើងគ្រឿងសម្ភារចាក់សោសុវត្ថិភាព",
                        "progress": 60.0,
                        "completed": False,
                        "sort_order": 2
                    }
                ]
            },
            {
                "task_id": "TSK-03",
                "name": "ការកាត់និងដំឡើងបន្ទះកញ្ចក់សុវត្ថិភាព",
                "description": "លើកបន្ទះកញ្ចក់ Tempered ៦មម ចូលក្នុងស៊ុម និងរៀបកៅស៊ូ EPDM",
                "status": "Todo",
                "start_date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
                "end_date": (now + timedelta(days=10)).strftime("%Y-%m-%d"),
                "est_end_date": (now + timedelta(days=10)).strftime("%Y-%m-%d"),
                "sort_order": 3,
                "subtasks": [
                    {
                        "subtask_id": "ST-03-1",
                        "title": "ត្រួតពិនិត្យផ្ទៃកញ្ចក់ Tempered មុនដំឡើង",
                        "description": "ធានាថាមិនមានស្នាមឆ្កូតឬប្រេះស្រាំ",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 1
                    },
                    {
                        "subtask_id": "ST-03-2",
                        "title": "ដាក់កៅស៊ូទ្រនាប់ EPDM និងលើកកញ្ចក់ចូលក្នុងស៊ុម",
                        "description": "រឹតខ្ចៅឱ្យណែនតាមស្តង់ដារបច្ចេកទេស",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 2
                    }
                ]
            },
            {
                "task_id": "TSK-04",
                "name": "ការបាញ់កាវស៊ីលីកូនការពារជម្រាបទឹក Weatherproofing",
                "description": "បាញ់កាវស៊ីលីកូនខ្មៅតាមគែមស៊ុមខាងក្រៅអគារ និងតេស្តជម្រាបទឹក",
                "status": "Todo",
                "start_date": (now + timedelta(days=11)).strftime("%Y-%m-%d"),
                "end_date": (now + timedelta(days=16)).strftime("%Y-%m-%d"),
                "est_end_date": (now + timedelta(days=16)).strftime("%Y-%m-%d"),
                "sort_order": 4,
                "subtasks": [
                    {
                        "subtask_id": "ST-04-1",
                        "title": "បាញ់កាវស៊ីលីកូនខ្មៅតាមគែមស៊ុមខាងក្រៅអគារ",
                        "description": "បាញ់ឱ្យស្មើដៃនិងរលោងស្អាត",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 1
                    },
                    {
                        "subtask_id": "ST-04-2",
                        "title": "តេស្តសាកល្បងបាញ់ទឹកពិនិត្យការជ្រាបទឹក",
                        "description": "បាញ់ទឹកសម្ពាធខ្ពស់រយៈពេល ៣០ នាទី",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 2
                    }
                ]
            },
            {
                "task_id": "TSK-05",
                "name": "ការត្រួតពិនិត្យគុណភាព និងប្រគល់ការងារជូនអតិថិជន",
                "description": "សម្អាតស្នាមកាវ ជូតផ្ទៃកញ្ចក់ឱ្យភ្លឺថ្លា និងចុះហត្ថលេខាទទួលស្គាល់",
                "status": "Todo",
                "start_date": (now + timedelta(days=17)).strftime("%Y-%m-%d"),
                "end_date": (now + timedelta(days=20)).strftime("%Y-%m-%d"),
                "est_end_date": (now + timedelta(days=20)).strftime("%Y-%m-%d"),
                "sort_order": 5,
                "subtasks": [
                    {
                        "subtask_id": "ST-05-1",
                        "title": "សម្អាតស្នាមកាវ និងជូតផ្ទៃកញ្ចក់ឱ្យភ្លឺថ្លា",
                        "description": "ប្រើទឹកជូតកញ្ចក់ស្តង់ដារ",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 1
                    },
                    {
                        "subtask_id": "ST-05-2",
                        "title": "ចុះហត្ថលេខាលើកំណត់ហេតុប្រគល់ការងារជាមួយអតិថិជន",
                        "description": "ប្រគល់សោ និងប័ណ្ណធានាគុណភាពរយៈពេល ២ ឆ្នាំ",
                        "progress": 0.0,
                        "completed": False,
                        "sort_order": 2
                    }
                ]
            }
        ]

        for t_info in tasks_data:
            pt = ProjectTask(
                task_id=t_info["task_id"],
                project_id=main_proj.id,
                name=t_info["name"],
                description=t_info["description"],
                status=t_info["status"],
                start_date=t_info["start_date"],
                end_date=t_info["end_date"],
                est_end_date=t_info["est_end_date"],
                sort_order=t_info["sort_order"],
            )
            db.add(pt)
            db.flush()
            for st_info in t_info["subtasks"]:
                pst = ProjectSubtask(
                    subtask_id=st_info["subtask_id"],
                    task_id=pt.id,
                    title=st_info["title"],
                    description=st_info["description"],
                    progress=st_info["progress"],
                    completed=st_info["completed"],
                    sort_order=st_info["sort_order"],
                )
                db.add(pst)

        # Step 8: Seed Project Material Requirements
        print("Seeding material requirements for projects...")
        reqs_data = [
            {"project_id": main_proj.id, "mat_code": "PRF-AL50-02", "qty": 45.0, "status": "Issued"},
            {"project_id": main_proj.id, "mat_code": "GLS-TMP-06", "qty": 35.0, "status": "Issued"},
            {"project_id": main_proj.id, "mat_code": "SIL-BLK-300", "qty": 50.0, "status": "Reserved"},
            {"project_id": main_proj.id, "mat_code": "GSK-EPDM-01", "qty": 120.0, "status": "Reserved"},
            {"project_id": proj_map["PRJ-202610-0002"].id, "mat_code": "PRF-AL-MULL", "qty": 60.0, "status": "Shortage"},
            {"project_id": proj_map["PRJ-202610-0002"].id, "mat_code": "GLS-LAM-838", "qty": 40.0, "status": "Reserved"},
        ]
        for r in reqs_data:
            m = mat_map.get(r["mat_code"])
            if m:
                pmr = ProjectMaterialRequirement(
                    project_id=r["project_id"],
                    material_id=m.id,
                    required_qty=r["qty"],
                    allocated_qty=r["qty"] if r["status"] in ["Issued", "Reserved"] else 0.0,
                    status=r["status"]
                )
                db.add(pmr)

        # Step 9: Seed Project Payments (ភាសាខ្មែរ)
        print("Seeding project payments in Khmer...")
        payments_data = [
            {
                "project_id": main_proj.id,
                "amount": 15000.0,
                "payment_date": now - timedelta(days=22),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (ABA)",
                "reference_number": "ABA-TXN-202601",
                "notes": "ប្រាក់កក់ដំណាក់កាលទី១ (៤០%) បន្ទាប់ពីចុះកិច្ចសន្យា"
            },
            {
                "project_id": main_proj.id,
                "amount": 10000.0,
                "payment_date": now - timedelta(days=10),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (ABA)",
                "reference_number": "ABA-TXN-202608",
                "notes": "ប្រាក់ទូទាត់ដំណាក់កាលទី២ (២៥%) ពេលសម្ភារដឹកមកដល់ការដ្ឋាន"
            },
            {
                "project_id": proj_map["PRJ-202610-0002"].id,
                "amount": 35000.0,
                "payment_date": now - timedelta(days=12),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (Canadia)",
                "reference_number": "CNB-TXN-88192",
                "notes": "ប្រាក់កក់កិច្ចសន្យាជញ្ជាំងកញ្ចក់ Curtain Wall (៦០%)"
            },
            {
                "project_id": proj_map["PRJ-202610-0003"].id,
                "amount": 10000.0,
                "payment_date": now - timedelta(days=4),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (ABA)",
                "reference_number": "ABA-TXN-99120",
                "notes": "ប្រាក់កក់ចាប់ផ្តើមគម្រោង (៣៧%)"
            },
            {
                "project_id": proj_map["PRJ-202610-0004"].id,
                "amount": 42000.0,
                "payment_date": now - timedelta(days=10),
                "payment_method": "មូលប្បទានបត្រធនាគារ (Cheque)",
                "reference_number": "CHQ-FTB-00441",
                "notes": "ទូទាត់បញ្ចប់ការងារ ១០០% បន្ទាប់ពីការត្រួតពិនិត្យទទួលយក"
            },
            {
                "project_id": proj_map["PRJ-202610-0005"].id,
                "amount": 12000.0,
                "payment_date": now - timedelta(days=30),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (Wing)",
                "reference_number": "WING-TXN-3341",
                "notes": "ប្រាក់កក់ដំណាក់កាលទី១ (៦១%)"
            },
            {
                "project_id": proj_map["PRJ-202610-0009"].id,
                "amount": 20000.0,
                "payment_date": now - timedelta(days=8),
                "payment_method": "ផ្ទេរប្រាក់តាមធនាគារ (ABA)",
                "reference_number": "ABA-TXN-77123",
                "notes": "ប្រាក់កក់កិច្ចសន្យាដំបូលកញ្ចក់ Skylight និងបង្កាន់ដៃ"
            }
        ]
        for pm in payments_data:
            payment = ProjectPayment(**pm)
            db.add(payment)

        # Step 10: Seed Purchase Orders (ភាសាខ្មែរ: Local & Overseas channels)
        print("Seeding purchase orders in Khmer across Local and Overseas channels...")
        orders_data = [
            {
                "po_number": "PO-2026-001",
                "supplier_name": "ក្រុមហ៊ុន ភ្នំពេញ កញ្ចក់ និងអាលុយមីញ៉ូម",
                "status": "Received",
                "order_date": now - timedelta(days=16),
                "expected_delivery_date": now - timedelta(days=12),
                "actual_delivery_date": now - timedelta(days=12),
                "notes": "ការបញ្ជាទិញកញ្ចក់សាយ និងកញ្ចក់សុវត្ថិភាព ដឹកចូលឃ្លាំងស្តុកជួរ B-02 រួចរាល់",
                "items": [
                    {"code": "GLS-FROST-06", "qty": 50, "cost": 22.0},
                    {"code": "GLS-TMP-06", "qty": 40, "cost": 16.5},
                ]
            },
            {
                "po_number": "PO-2026-002",
                "supplier_name": "ក្រុមហ៊ុន ក្វាងទុង ស៊ីងហ្វា អាលុយមីញ៉ូម (ប្រទេសចិន)",
                "status": "In Transit",
                "order_date": now - timedelta(days=14),
                "expected_delivery_date": now + timedelta(days=4),
                "actual_delivery_date": None,
                "notes": "ដឹកជញ្ជូនតាមកប៉ាល់សមុទ្រមកកំពង់ផែស្វយ័តក្រុងព្រះសីហនុ ទូកុងតឺន័រ #COSU7291823",
                "items": [
                    {"code": "PRF-AL50-02", "qty": 120, "cost": 11.0},
                    {"code": "PRF-AL-MULL", "qty": 80, "cost": 18.5},
                ]
            },
            {
                "po_number": "PO-2026-003",
                "supplier_name": "ក្រុមហ៊ុន អង្គរ ដែក និងលោហៈធាតុសំណង់",
                "status": "Ordered",
                "order_date": now - timedelta(days=4),
                "expected_delivery_date": now + timedelta(days=2),
                "actual_delivery_date": None,
                "notes": "បញ្ជាទិញដែកប្រអប់កាល់វ៉ាណាយសម្រាប់គម្រោងអគារពាណិជ្ជកម្មថ្មី",
                "items": [
                    {"code": "STL-BOX-50", "qty": 60, "cost": 14.2},
                    {"code": "STL-BOX-100", "qty": 40, "cost": 22.5},
                ]
            },
            {
                "po_number": "PO-2026-004",
                "supplier_name": "ក្រុមហ៊ុន បាងកក កញ្ចក់ស្ថាបត្យកម្ម (ប្រទេសថៃ)",
                "status": "Ordered",
                "order_date": now - timedelta(days=6),
                "expected_delivery_date": now + timedelta(days=9),
                "actual_delivery_date": None,
                "notes": "ការដឹកជញ្ជូនតាមរថយន្តកុងតឺន័រឆ្លងកាត់ច្រកទ្វារព្រំដែនអន្តរជាតិប៉ោយប៉ែត",
                "items": [
                    {"code": "GLS-TMP-10", "qty": 50, "cost": 26.5},
                    {"code": "GLS-LAM-838", "qty": 30, "cost": 29.0},
                ]
            },
            {
                "po_number": "PO-2026-005",
                "supplier_name": "ក្រុមហ៊ុន មេគង្គ ហាតវែរ និងកាវស៊ីលីកូន",
                "status": "Received",
                "order_date": now - timedelta(days=11),
                "expected_delivery_date": now - timedelta(days=8),
                "actual_delivery_date": now - timedelta(days=9),
                "notes": "ទំនិញបានមកដល់ និងរៀបចំទុកដាក់ក្នុងធ្នើរឃ្លាំង A-01 រួចរាល់",
                "items": [
                    {"code": "SIL-BLK-300", "qty": 100, "cost": 3.5},
                    {"code": "GLU-STR-600", "qty": 60, "cost": 7.8},
                ]
            },
            {
                "po_number": "PO-2026-006",
                "supplier_name": "ក្រុមហ៊ុន វៀតណាម សាន់មេថល (ប្រទេសវៀតណាម)",
                "status": "Ordered",
                "order_date": now - timedelta(days=2),
                "expected_delivery_date": now + timedelta(days=13),
                "actual_delivery_date": None,
                "notes": "ការដឹកជញ្ជូនតាមផ្លូវគោកឆ្លងកាត់ច្រកទ្វារព្រំដែនបាវិត កំពុងរង់ចាំបែបបទគយ",
                "items": [
                    {"code": "PRF-AL-TRK", "qty": 90, "cost": 9.8},
                    {"code": "PRF-AL-SUB45", "qty": 70, "cost": 10.8},
                ]
            },
            {
                "po_number": "PO-2026-007",
                "supplier_name": "ក្រុមហ៊ុន ភ្នំពេញ កញ្ចក់ និងអាលុយមីញ៉ូម",
                "status": "Draft",
                "order_date": now - timedelta(days=1),
                "expected_delivery_date": now + timedelta(days=3),
                "actual_delivery_date": None,
                "notes": "សេចក្តីព្រាងបញ្ជាទិញកញ្ចក់ពណ៌ខ្មៅស្រាល រង់ចាំការបញ្ជាក់ចំនួនពីវិស្វករការដ្ឋាន",
                "items": [
                    {"code": "GLS-TINT-06", "qty": 35, "cost": 19.0},
                ]
            }
        ]

        for o_data in orders_data:
            supplier = sup_map.get(o_data["supplier_name"])
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

            for it in o_data["items"]:
                mat = mat_map.get(it["code"])
                if mat:
                    po_item = PurchaseOrderItem(
                        purchase_order_id=po.id,
                        material_id=mat.id,
                        quantity=it["qty"],
                        unit_cost=it["cost"],
                        received_qty=it["qty"] if o_data["status"] == "Received" else 0.0
                    )
                    db.add(po_item)

        # Step 11: Seed Quotations (ភាសាខ្មែរ)
        print("Seeding quotations in Khmer...")
        quotes_data = [
            {
                "quotation_number": "QT-2026-001",
                "project_id": main_proj.id,
                "customer_id": cust_map["ចាន់ សុភា"].id,
                "status": "Approved",
                "subtotal": 38500.0,
                "total_amount": 38500.0,
                "expected_profit": 14300.0,
                "material_cost": 14000.0,
                "labor_cost": 2400.0,
                "installation_cost": 1200.0,
                "valid_until": now + timedelta(days=30),
                "notes": "សម្រង់តម្លៃគម្រោងដំឡើងទ្វារ-បង្អួចអាលុយមីញ៉ូម ស៊េរី ៥០ រួមទាំងកញ្ចក់សុវត្ថិភាព"
            },
            {
                "quotation_number": "QT-2026-002",
                "project_id": proj_map["PRJ-202610-0007"].id,
                "customer_id": cust_map["សម្បត្តិ"].id,
                "status": "Draft",
                "subtotal": 9500.0,
                "total_amount": 9500.0,
                "expected_profit": 3000.0,
                "material_cost": 4500.0,
                "labor_cost": 1200.0,
                "installation_cost": 800.0,
                "valid_until": now + timedelta(days=15),
                "notes": "សម្រង់តម្លៃគម្រោងទ្វារកញ្ចក់ស្វ័យប្រវត្តិចោមចៅ"
            }
        ]
        for q in quotes_data:
            quote = Quotation(**q)
            db.add(quote)

        # Step 12: Seed Stock Movements (ភាសាខ្មែរ)
        print("Seeding stock movements in Khmer...")
        stock_movements = [
            {
                "material_id": mat_map["GLS-FROST-06"].id,
                "movement_type": "Receipt",
                "quantity": 50.0,
                "unit_cost": 22.0,
                "reference_note": "នាំទំនិញចូលឃ្លាំងពីការបញ្ជាទិញ PO-2026-001"
            },
            {
                "material_id": mat_map["SIL-BLK-300"].id,
                "movement_type": "Receipt",
                "quantity": 100.0,
                "unit_cost": 3.5,
                "reference_note": "នាំទំនិញចូលឃ្លាំងពីការបញ្ជាទិញ PO-2026-005"
            },
            {
                "material_id": mat_map["PRF-AL50-02"].id,
                "project_id": main_proj.id,
                "movement_type": "Issue",
                "quantity": 45.0,
                "unit_cost": 12.0,
                "reference_note": "ដកសម្ភារចេញសម្រាប់គម្រោងដំឡើង បុរី ប៉េង ហួត"
            }
        ]
        for sm in stock_movements:
            movement = StockMovement(**sm)
            db.add(movement)

        db.commit()
        print("\nAll database data has been successfully removed and re-seeded in 100% Khmer language!")
        print(f"Categories: {len(cat_map)}")
        print(f"Materials: {len(mat_map)}")
        print(f"Customers: {len(cust_map)}")
        print(f"Suppliers: {len(sup_map)}")
        print(f"Projects: {len(proj_map)}")
        print(f"Purchase Orders: {len(orders_data)}")
        print(f"Project Tasks: {len(tasks_data)}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_khmer_database()
