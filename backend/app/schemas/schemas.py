from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    preferred_contact_method: Optional[str] = "Phone"
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    notes: Optional[str] = None

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Material Schemas ---
class MaterialBase(BaseModel):
    code: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    category: str = "Profile"
    unit: str = "m"
    unit_cost: float = Field(0.0, ge=0)
    current_stock: float = Field(0.0, ge=0)
    reserved_stock: float = Field(0.0, ge=0)
    minimum_stock: float = Field(0.0, ge=0)
    storage_location: Optional[str] = None
    notes: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    current_stock: Optional[float] = None
    reserved_stock: Optional[float] = None
    minimum_stock: Optional[float] = None
    storage_location: Optional[str] = None
    notes: Optional[str] = None

class MaterialOut(MaterialBase):
    id: int
    available_stock: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Stock Movement Schemas ---
class StockMovementCreate(BaseModel):
    material_id: int
    project_id: Optional[int] = None
    movement_type: str  # Receipt, Reservation, Release, Issue, Wastage, Adjustment
    quantity: float
    unit_cost: Optional[float] = 0.0
    reference_note: Optional[str] = None

class StockMovementOut(BaseModel):
    id: int
    material_id: int
    project_id: Optional[int] = None
    movement_type: str
    quantity: float
    unit_cost: float
    reference_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Project Item Schemas ---
class ProjectItemBase(BaseModel):
    product_type: str
    description: Optional[str] = None
    width_mm: float = Field(..., gt=0)
    height_mm: float = Field(..., gt=0)
    quantity: int = Field(1, ge=1)
    glass_specification: Optional[str] = "6mm Clear Tempered"
    frame_color: Optional[str] = "Black Anodized"
    unit_estimated_cost: float = Field(0.0, ge=0)
    unit_selling_price: float = Field(0.0, ge=0)

class ProjectItemCreate(ProjectItemBase):
    pass

class ProjectItemOut(ProjectItemBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Project Material Requirement Schemas ---
class MaterialRequirementOut(BaseModel):
    id: int
    project_id: int
    material_id: int
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    material_unit: Optional[str] = None
    required_qty: float
    allocated_qty: float
    wastage_percent: float
    status: str
    available_stock: Optional[float] = 0.0
    unit_cost: Optional[float] = 0.0

    class Config:
        from_attributes = True


class MaterialRequirementCreate(BaseModel):
    material_id: int
    required_qty: float
    wastage_percent: Optional[float] = 0.0


# --- Project Payment Schemas ---
class ProjectPaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    payment_date: Optional[datetime] = None
    payment_method: str = Field("Bank Transfer")
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ProjectPaymentCreate(ProjectPaymentBase):
    pass

class ProjectPaymentOut(ProjectPaymentBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Project Worker Log Schemas ---
class ProjectWorkerLogBase(BaseModel):
    worker_name: str
    hours_worked: float = Field(..., gt=0)
    work_date: Optional[datetime] = None
    task_description: Optional[str] = None

class ProjectWorkerLogCreate(ProjectWorkerLogBase):
    pass

class ProjectWorkerLogOut(ProjectWorkerLogBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Project Schemas ---
class ProjectBase(BaseModel):
    project_number: Optional[str] = None
    project_name: str
    customer_id: Optional[int] = None
    location: Optional[str] = None
    status: str = "Starting"
    assigned_manager: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    contract_amount: float = Field(0.0, ge=0)
    architect: Optional[str] = None
    worker: Optional[str] = None
    sales_person: Optional[str] = None
    project_type: Optional[str] = "Window & Door Installation"
    customer_paid: float = Field(0.0, ge=0)
    service_selling: float = Field(0.0, ge=0)
    service_cost: float = Field(0.0, ge=0)
    effort_hours: float = Field(0.0, ge=0)
    effort_completed_hours: float = Field(0.0, ge=0)
    notes: Optional[str] = None
    priority: Optional[str] = "Medium"
    customer_representative: Optional[str] = None
    site_supervisor: Optional[str] = None
    material_cost: Optional[float] = Field(0.0, ge=0)
    labor_cost: Optional[float] = Field(0.0, ge=0)
    other_expenses: Optional[float] = Field(0.0, ge=0)
    preferred_contact_method: Optional[str] = "Phone"

    @field_validator("start_date", "deadline_date", "actual_start_date", "actual_end_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

class ProjectCreate(ProjectBase):
    items: Optional[List[ProjectItemCreate]] = []

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    customer_id: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    assigned_manager: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline_date: Optional[datetime] = None
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    contract_amount: Optional[float] = None
    architect: Optional[str] = None
    worker: Optional[str] = None
    sales_person: Optional[str] = None
    project_type: Optional[str] = None
    customer_paid: Optional[float] = None
    service_selling: Optional[float] = None
    service_cost: Optional[float] = None
    effort_hours: Optional[float] = None
    effort_completed_hours: Optional[float] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    customer_representative: Optional[str] = None
    site_supervisor: Optional[str] = None
    material_cost: Optional[float] = None
    labor_cost: Optional[float] = None
    other_expenses: Optional[float] = None
    preferred_contact_method: Optional[str] = None

    @field_validator("start_date", "deadline_date", "actual_start_date", "actual_end_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

class ProjectOut(ProjectBase):
    id: int
    estimated_cost: float
    actual_cost: float
    created_at: datetime
    customer: Optional[CustomerOut] = None
    items: List[ProjectItemOut] = []
    material_requirements: List[MaterialRequirementOut] = []
    payments: List[ProjectPaymentOut] = []
    worker_logs: List[ProjectWorkerLogOut] = []

    class Config:
        from_attributes = True


# --- Quotation Schemas ---
class QuotationBase(BaseModel):
    quotation_number: str
    project_id: Optional[int] = None
    customer_id: int
    status: str = "Draft"
    material_cost: float = 0.0
    labor_cost: float = 0.0
    transport_cost: float = 0.0
    installation_cost: float = 0.0
    subtotal: float = 0.0
    discount_amount: float = 0.0
    tax_percent: float = 0.0
    total_amount: float = 0.0
    expected_profit: float = 0.0
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(BaseModel):
    status: Optional[str] = None
    material_cost: Optional[float] = None
    labor_cost: Optional[float] = None
    transport_cost: Optional[float] = None
    installation_cost: Optional[float] = None
    discount_amount: Optional[float] = None
    tax_percent: Optional[float] = None
    notes: Optional[str] = None

class QuotationOut(QuotationBase):
    id: int
    created_at: datetime
    customer: Optional[CustomerOut] = None

    class Config:
        from_attributes = True


# --- Dashboard KPI Schema ---
class DashboardSummaryOut(BaseModel):
    total_projects: int
    active_projects: int
    completed_projects: int
    delayed_projects: int
    pending_quotations: int
    total_contract_value: float
    total_estimated_costs: float
    projected_profit: float
    low_stock_count: int
    shortage_count: int


# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    supplier_type: str = "Local"  # Local or Overseas
    materials_supplied: Optional[str] = None
    lead_time_days: int = 7
    rating: float = 5.0
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    supplier_type: Optional[str] = None
    materials_supplied: Optional[str] = None
    lead_time_days: Optional[int] = None
    rating: Optional[float] = None
    notes: Optional[str] = None

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Purchase Order Schemas ---
class PurchaseOrderItemCreate(BaseModel):
    material_id: int
    quantity: float = Field(..., gt=0)
    unit_cost: float = Field(0.0, ge=0)

class PurchaseOrderItemOut(BaseModel):
    id: int
    purchase_order_id: int
    material_id: int
    material_name: Optional[str] = None
    material_code: Optional[str] = None
    material_unit: Optional[str] = None
    quantity: float
    unit_cost: float
    received_qty: float

    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    po_number: str
    supplier_id: int
    project_id: Optional[int] = None
    status: str = "Ordered"
    expected_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate] = []

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    project_id: Optional[int] = None
    status: str
    total_cost: float
    order_date: datetime
    expected_delivery_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    supplier: Optional[SupplierOut] = None
    items: List[PurchaseOrderItemOut] = []

    class Config:
        from_attributes = True


# --- Material Consumption Payload ---
class MaterialConsumptionItem(BaseModel):
    material_requirement_id: int
    consumed_qty: float = Field(..., gt=0)
    wastage_qty: float = Field(0.0, ge=0)
    notes: Optional[str] = None

class ProjectConsumptionCreate(BaseModel):
    items: List[MaterialConsumptionItem]


# --- Reports Schemas ---
class ProjectProfitabilityReportItem(BaseModel):
    project_id: int
    project_number: str
    project_name: str
    customer_name: str
    status: str
    contract_amount: float
    estimated_cost: float
    actual_cost: float
    gross_profit: float
    profit_margin_percent: float

class MaterialUsageReportItem(BaseModel):
    material_id: int
    material_code: str
    material_name: str
    category: str
    unit: str
    current_stock: float
    reserved_stock: float
    total_consumed_qty: float
    total_wastage_qty: float

class DelayedProjectReportItem(BaseModel):
    project_id: int
    project_number: str
    project_name: str
    customer_name: str
    status: str
    deadline_date: datetime
    days_overdue: int
    assigned_manager: Optional[str] = None
