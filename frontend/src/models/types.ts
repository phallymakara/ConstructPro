export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  contact_person?: string;
  preferred_contact_method?: string;
  notes?: string;
  created_at: string;
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  contact_person?: string;
  preferred_contact_method?: string;
  notes: string;
}

export type MaterialCategory = 'Profile' | 'Glass' | 'Seal' | 'Hardware' | 'Accessory' | 'Panel' | (string & {});

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  product_count?: number;
  total_stock?: number;
}

export interface ProductCategoryFormData {
  name: string;
  description?: string;
}

export interface Material {
  id: number;
  code: string;
  name: string;
  barcode?: string;
  category: string;
  category_id?: number;
  product_type?: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  minimum_stock: number;
  storage_location?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
}

export interface MaterialFormData {
  code: string;
  name: string;
  barcode?: string;
  category: string;
  category_id?: number;
  product_type?: string;
  unit: string;
  unit_cost: number;
  current_stock: number;
  minimum_stock: number;
  storage_location: string;
  notes: string;
  image_url?: string;
}

export interface StockMovement {
  id: number;
  material_id: number;
  material_code?: string;
  material_name?: string;
  material_barcode?: string;
  material_category?: string;
  material_product_type?: string;
  material_unit?: string;
  project_id?: number;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  reference_note?: string;
  created_at: string;
}

export interface StockMovementItemPayload {
  material_id: number;
  quantity: number;
  unit_cost?: number;
}

export interface StockMovementBatchPayload {
  movement_type: string;
  project_id?: number | null;
  recipient_worker?: string;
  reference_note?: string;
  items: StockMovementItemPayload[];
}

export interface ProjectItem {
  id: number;
  project_id: number;
  product_type: string;
  description?: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  glass_specification?: string;
  frame_color?: string;
  unit_estimated_cost: number;
  unit_selling_price: number;
  created_at: string;
}

export interface ProjectItemFormData {
  product_type: string;
  description: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  glass_specification: string;
  frame_color: string;
  unit_estimated_cost: number;
  unit_selling_price: number;
}

export interface MaterialRequirement {
  id: number;
  project_id: number;
  material_id: number;
  material_name: string;
  material_code: string;
  material_unit: string;
  required_qty: number;
  allocated_qty: number;
  wastage_percent: number;
  status: 'Pending' | 'Reserved' | 'Shortage' | 'Issued';
  available_stock: number;
  unit_cost?: number;
}

export interface ProjectPayment {
  id: number;
  project_id: number;
  amount: number;
  payment_date?: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface ProjectWorkerLog {
  id: number;
  project_id: number;
  worker_name: string;
  hours_worked: number;
  work_date?: string;
  task_description?: string;
  created_at: string;
}

export type ProjectStatus =
  | 'Inquiry'
  | 'Discussion'
  | 'Quotation'
  | 'Negotiation'
  | 'Accepted'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Incoming Project'
  | 'Starting'
  | 'In Progress'
  | 'Overdue'
  | 'Completed'
  | 'Cancelled'
  | 'Canceled'
  | 'Draft'
  | 'Approved'
  | 'Material Preparation'
  | 'Production'
  | 'Ready for Delivery'
  | 'Installation';


export interface Project {
  id: number;
  project_number: string;
  project_name: string;
  customer_id?: number;
  location?: string;
  status: ProjectStatus;
  assigned_manager?: string;
  start_date?: string;
  deadline_date?: string;
  estimated_cost: number;
  actual_cost: number;
  contract_amount: number;
  architect?: string;
  worker?: string;
  sales_person?: string;
  project_type?: string;
  customer_paid?: number;
  service_selling?: number;
  service_cost?: number;
  effort_hours?: number;
  effort_completed_hours?: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  customer_representative?: string;
  site_supervisor?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  material_cost?: number;
  labor_cost?: number;
  other_expenses?: number;
  preferred_contact_method?: string;
  notes?: string;
  description?: string;
  source?: string;
  created_at: string;
  customer?: Customer;
  items: ProjectItem[];
  material_requirements: MaterialRequirement[];
  payments?: ProjectPayment[];
  worker_logs?: ProjectWorkerLog[];
  tasks?: ProjectTask[];
  documents?: ProjectDocument[];
}

export interface ProjectFormData {
  project_number?: string;
  project_name: string;
  customer_id?: number;
  location?: string;
  status?: ProjectStatus;
  assigned_manager?: string;
  start_date?: string;
  deadline_date?: string;
  contract_amount?: number;
  architect?: string;
  worker?: string;
  sales_person?: string;
  project_type?: string;
  customer_paid?: number;
  service_selling?: number;
  service_cost?: number;
  effort_hours?: number;
  effort_completed_hours?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
  customer_representative?: string;
  site_supervisor?: string;
  preferred_contact_method?: string;
  material_cost?: number;
  labor_cost?: number;
  other_expenses?: number;
  notes?: string;
  source?: string;
  items?: ProjectItemFormData[];
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected';

export interface Quotation {
  id: number;
  quotation_number: string;
  project_id?: number;
  customer_id: number;
  status: QuotationStatus;
  material_cost: number;
  labor_cost: number;
  transport_cost: number;
  installation_cost: number;
  subtotal: number;
  discount_amount: number;
  tax_percent: number;
  total_amount: number;
  expected_profit: number;
  valid_until?: string;
  notes?: string;
  created_at: string;
  customer?: Customer;
}

export interface QuotationFormData {
  quotation_number: string;
  project_id?: number;
  customer_id: number;
  status: QuotationStatus;
  material_cost: number;
  labor_cost: number;
  transport_cost: number;
  installation_cost: number;
  discount_amount: number;
  tax_percent: number;
  valid_until: string;
  notes: string;
}

export interface DashboardShortageItem {
  id: number;
  code: string;
  name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export interface DashboardUpcomingDelivery {
  id: number;
  po_number: string;
  supplier_name: string;
  channel: string;
  expected_delivery_date?: string;
  total_cost: number;
  status: string;
}

export interface DashboardSummary {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  delayed_projects: number;
  pending_quotations: number;
  total_contract_value: number;
  total_estimated_costs: number;
  projected_profit: number;
  low_stock_count: number;
  shortage_count: number;
  total_collected_cash?: number;
  total_receivable?: number;
  total_inventory_value?: number;
  open_po_count?: number;
  open_po_value?: number;
  overseas_in_transit_count?: number;
  shortage_items?: DashboardShortageItem[];
  upcoming_deliveries?: DashboardUpcomingDelivery[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  supplier_type: 'Local' | 'Overseas';
  materials_supplied?: string;
  lead_time_days: number;
  rating: number;
  notes?: string;
  created_at: string;
}

export interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  supplier_type: 'Local' | 'Overseas';
  materials_supplied: string;
  lead_time_days: number;
  rating: number;
  notes: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  material_id: number;
  material_name?: string;
  material_code?: string;
  material_unit?: string;
  quantity: number;
  unit_cost: number;
  received_qty: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  project_id?: number;
  status: 'Draft' | 'Ordered' | 'In Transit' | 'Received' | 'Cancelled';
  total_cost: number;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  created_at: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderFormData {
  po_number: string;
  supplier_id: number;
  project_id?: number;
  status: 'Draft' | 'Ordered' | 'In Transit' | 'Received' | 'Cancelled';
  expected_delivery_date: string;
  notes: string;
  items: { material_id: number; quantity: number; unit_cost: number }[];
}

export interface ProjectProfitabilityReportItem {
  project_id: number;
  project_number: string;
  project_name: string;
  customer_name: string;
  status: string;
  contract_amount: number;
  estimated_cost: number;
  actual_cost: number;
  gross_profit: number;
  profit_margin_percent: number;
}

export interface MaterialUsageReportItem {
  material_id: number;
  material_code: string;
  material_name: string;
  category: string;
  unit: string;
  current_stock: number;
  reserved_stock: number;
  total_consumed_qty: number;
  total_wastage_qty: number;
}

export interface DelayedProjectReportItem {
  project_id: number;
  project_number: string;
  project_name: string;
  customer_name: string;
  status: string;
  deadline_date: string;
  days_overdue: number;
  assigned_manager?: string;
}

export interface ProjectSubTask {
  id: string;
  title: string;
  progress: number;
  completed?: boolean;
  start_date?: string;
  est_end_date?: string;
  description?: string;
}

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Completed';
  subtasks: ProjectSubTask[];
  created_at?: string;
  start_date?: string;
  end_date?: string;
  est_end_date?: string;
}

export interface ProjectDocument {
  id: number;
  project_id?: number;
  name: string;
  document_type?: string;
  category?: string;
  file_name?: string;
  file_url?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  is_default?: boolean;
  created_at?: string;
}
