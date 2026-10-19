import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProjectStatus(str, enum.Enum):
    DRAFT = "Draft"
    QUOTATION = "Quotation"
    APPROVED = "Approved"
    MATERIAL_PREPARATION = "Material Preparation"
    PRODUCTION = "Production"
    READY_FOR_DELIVERY = "Ready for Delivery"
    INSTALLATION = "Installation"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class QuotationStatus(str, enum.Enum):
    DRAFT = "Draft"
    SENT = "Sent"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class MaterialCategory(str, enum.Enum):
    PROFILE = "Profile"
    GLASS = "Glass"
    SEAL = "Seal"
    HARDWARE = "Hardware"
    ACCESSORY = "Accessory"
    PANEL = "Panel"

class StockMovementType(str, enum.Enum):
    RECEIPT = "Receipt"
    RESERVATION = "Reservation"
    RELEASE = "Release"
    ISSUE = "Issue"
    WASTAGE = "Wastage"
    RETURN = "Return"
    ADJUSTMENT = "Adjustment"

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    company = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="customer", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="customer")

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), default=MaterialCategory.PROFILE.value)
    unit = Column(String(20), nullable=False)  # m, sq_m, pcs, kg, set
    unit_cost = Column(Float, default=0.0)
    current_stock = Column(Float, default=0.0)
    reserved_stock = Column(Float, default=0.0)
    minimum_stock = Column(Float, default=0.0)
    storage_location = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    movements = relationship("StockMovement", back_populates="material")
    requirements = relationship("ProjectMaterialRequirement", back_populates="material")

    @property
    def available_stock(self) -> float:
        return max(0.0, (self.current_stock or 0.0) - (self.reserved_stock or 0.0))

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_number = Column(String(50), unique=True, index=True, nullable=False)
    project_name = Column(String(255), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default=ProjectStatus.DRAFT.value)
    assigned_manager = Column(String(100), nullable=True)
    start_date = Column(DateTime, nullable=True)
    deadline_date = Column(DateTime, nullable=True)
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)
    contract_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="projects")
    items = relationship("ProjectItem", back_populates="project", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="project")
    material_requirements = relationship("ProjectMaterialRequirement", back_populates="project", cascade="all, delete-orphan")

class ProjectItem(Base):
    __tablename__ = "project_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    product_type = Column(String(100), nullable=False)  # Sliding Window, Casement Window, Glass Door, etc.
    description = Column(String(255), nullable=True)
    width_mm = Column(Float, nullable=False)
    height_mm = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    glass_specification = Column(String(100), default="6mm Clear Tempered")
    frame_color = Column(String(50), default="Black Anodized")
    unit_estimated_cost = Column(Float, default=0.0)
    unit_selling_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="items")

class ProjectMaterialRequirement(Base):
    __tablename__ = "project_material_requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    required_qty = Column(Float, nullable=False)
    allocated_qty = Column(Float, default=0.0)
    wastage_percent = Column(Float, default=5.0)
    status = Column(String(50), default="Pending") # Pending, Reserved, Shortage, Issued
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="material_requirements")
    material = relationship("Material", back_populates="requirements")

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String(50), unique=True, index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String(50), default=QuotationStatus.DRAFT.value)
    material_cost = Column(Float, default=0.0)
    labor_cost = Column(Float, default=0.0)
    transport_cost = Column(Float, default=0.0)
    installation_cost = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_percent = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    expected_profit = Column(Float, default=0.0)
    valid_until = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="quotations")
    project = relationship("Project", back_populates="quotations")

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    movement_type = Column(String(50), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0.0)
    reference_note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="movements")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    supplier_type = Column(String(50), default="Local")  # Local or Overseas
    materials_supplied = Column(String(255), nullable=True)
    lead_time_days = Column(Integer, default=7)
    rating = Column(Float, default=5.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    status = Column(String(50), default="Draft")  # Draft, Ordered, In Transit, Received, Cancelled
    total_cost = Column(Float, default=0.0)
    order_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery_date = Column(DateTime, nullable=True)
    actual_delivery_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    project = relationship("Project")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0.0)
    received_qty = Column(Float, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    material = relationship("Material")

