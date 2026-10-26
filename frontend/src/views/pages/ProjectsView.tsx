import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calculator,
  ShieldCheck,
  Trash2,
  Calendar,
  MapPin,
  ShoppingCart,
  Hammer,
  SlidersHorizontal,
  Pencil,
  FileText,
  FileDown,
  MoreHorizontal,
  Ban,
  RotateCcw,
  LayoutGrid,
  List,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useProjectsController } from '../../controllers/useProjectsController';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../../controllers/apiClient';
import type { Project, ProjectStatus, ProjectFormData, ProjectItemFormData, Customer } from '../../models/types';
import { exportProjectToPDF, exportProjectToWord } from '../../utils/exportTemplate';
import { getProjectCalculatedProgress } from '../../utils/taskProgress';

const STATUS_OPTIONS: ProjectStatus[] = [
  'Incoming Project',
  'Accepted',
  'Starting',
  'In Progress',
  'Overdue',
  'Completed',
  'Cancelled'
];

const formatDateForInput = (dateVal?: string | null): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    return '';
  }
  return '';
};

interface ProjectPersonnelItem {
  name: string;
  role: string;
  scope: string;
}

interface ExportValidationResult {
  canExport: boolean;
  hasPersonnel: boolean;
  hasMaterials: boolean;
  reason?: string;
  personnelList: ProjectPersonnelItem[];
  materialsList: any[];
}

const checkProjectExportValidation = (proj: Project): ExportValidationResult => {
  // 1. Check personnel
  let personnel: ProjectPersonnelItem[] = [];
  try {
    const saved = localStorage.getItem(`project_personnel_${proj.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        personnel = parsed
          .filter(p => p && p.name && p.name.trim() !== '' && p.name.trim() !== 'Not assigned')
          .map(p => ({
            name: p.name.trim(),
            role: p.role || 'Personnel',
            scope: p.scope || 'Project execution'
          }));
      }
    }
  } catch {}

  // Fallback to project record fields
  if (personnel.length === 0) {
    if (proj.assigned_manager && proj.assigned_manager.trim() !== '' && proj.assigned_manager !== 'Not assigned') {
      personnel.push({
        name: proj.assigned_manager.trim(),
        role: 'Project Manager',
        scope: 'Project coordination, technical specifications & site liaison'
      });
    }
    if (proj.architect && proj.architect.trim() !== '' && proj.architect !== 'Not assigned') {
      personnel.push({
        name: proj.architect.trim(),
        role: 'Architecture',
        scope: 'Architectural specifications & opening dimensions'
      });
    }
    if (proj.worker && proj.worker.trim() !== '' && proj.worker !== 'Not assigned') {
      const splitWorkers = proj.worker.split(',').map(w => w.trim()).filter(w => w && w !== 'Not assigned');
      splitWorkers.forEach(w => {
        personnel.push({
          name: w,
          role: 'Worker',
          scope: 'Aluminum fabrication, frame assembly, cutting & on-site glazing'
        });
      });
    }
    if (proj.sales_person && proj.sales_person.trim() !== '' && proj.sales_person !== 'Not assigned') {
      personnel.push({
        name: proj.sales_person.trim(),
        role: 'Salesperson',
        scope: 'Client communications & commercial representation'
      });
    }
    if (proj.site_supervisor && proj.site_supervisor.trim() !== '' && proj.site_supervisor !== 'Not assigned') {
      personnel.push({
        name: proj.site_supervisor.trim(),
        role: 'Site Supervisor',
        scope: 'Site safety inspection, installation quality & crew oversight'
      });
    }
  }

  // 2. Check materials
  let materials: any[] = [];
  if (proj.material_requirements && proj.material_requirements.length > 0) {
    materials = proj.material_requirements;
  } else {
    try {
      const savedMat = localStorage.getItem(`project_materials_${proj.id}`);
      if (savedMat) {
        const parsedMat = JSON.parse(savedMat);
        if (Array.isArray(parsedMat) && parsedMat.length > 0) {
          materials = parsedMat;
        }
      }
    } catch {}
  }

  const hasPersonnel = personnel.length > 0;
  const hasMaterials = materials.length > 0;
  const canExport = hasPersonnel && hasMaterials;

  let reason = '';
  if (!hasPersonnel && !hasMaterials) {
    reason = 'Work personnel and project materials have not been assigned yet.';
  } else if (!hasPersonnel) {
    reason = 'Work personnel has not been assigned yet.';
  } else if (!hasMaterials) {
    reason = 'Project materials have not been assigned yet.';
  }

  return {
    canExport,
    hasPersonnel,
    hasMaterials,
    reason,
    personnelList: personnel,
    materialsList: materials
  };
};



export const ProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const {
    projects,
    customers,
    suppliers,
    selectedProject,
    activeTab,
    statusFilter,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    isAddItemModalOpen,
    isConsumeModalOpen,
    isShortagePOModalOpen,
    setActiveTab,
    setStatusFilter,
    setSearchQuery,
    setIsCreateModalOpen,
    setIsAddItemModalOpen,
    setIsConsumeModalOpen,
    setIsShortagePOModalOpen,
    createProject,
    updateProject,
    updateStatus,
    addItemToProject,
    deleteItem,
    calculateMaterials,
    reserveMaterials,
    consumeMaterials,
    createShortagePO,
  } = useProjectsController();

  // Manage Dropdown Menu State
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);

  // View Mode: card (default) vs table
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Edit Project Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<{
    project_name: string;
    location: string;
    start_date: string;
    deadline_date: string;
    status: ProjectStatus;
  }>({
    project_name: '',
    location: '',
    start_date: '',
    deadline_date: '',
    status: 'Starting',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Status Change Modal State
  const [statusModalProject, setStatusModalProject] = useState<Project | null>(null);
  const [statusModalValue, setStatusModalValue] = useState<ProjectStatus>('In Progress');

  const handleOpenStatusModal = (proj: Project) => {
    setStatusModalProject(proj);
    setStatusModalValue(proj.status);
  };

  const handleSaveStatusModal = async () => {
    if (!statusModalProject) return;
    const success = await updateStatus(statusModalProject.id, statusModalValue);
    if (success) {
      setStatusModalProject(null);
    }
  };

  // Close popup dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuProjectId(null);
    };
    if (openMenuProjectId !== null) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuProjectId]);

  // Create Project Form State
  const [newProject, setNewProject] = useState<ProjectFormData>({
    project_name: '',
    location: '',
    status: 'Starting',
    assigned_manager: '',
    start_date: '',
    deadline_date: '',
    contract_amount: 0,
    notes: '',
    project_type: 'Window & Door Installation',
  });
  const [customerNameInput, setCustomerNameInput] = useState<string>('');

  // Add Item Form State
  const initialNewItem: ProjectItemFormData = {
    product_type: 'Sliding Window 2-Track',
    description: '',
    width_mm: '' as any,
    height_mm: '' as any,
    quantity: '' as any,
    glass_specification: '',
    frame_color: '',
    unit_estimated_cost: 0,
    unit_selling_price: 0,
  };
  const [newItem, setNewItem] = useState<ProjectItemFormData>(initialNewItem);

  // Material Consumption Form State
  const [consumptionInputs, setConsumptionInputs] = useState<Record<number, { consumed: number; wastage: number }>>({});

  // Shortage PO State
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(suppliers[0]?.id || 1);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenEditModal = (proj: Project) => {
    setProjectToEdit(proj);
    setEditFormData({
      project_name: proj.project_name || '',
      location: proj.location || '',
      start_date: formatDateForInput(proj.start_date),
      deadline_date: formatDateForInput(proj.deadline_date),
      status: proj.status || 'Starting',
    });
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    const errors: Record<string, string> = {};
    if (!editFormData.project_name.trim()) errors.project_name = 'Project name is required';
    if (!editFormData.location.trim()) errors.location = 'Site location is required';
    if (!editFormData.start_date.trim()) errors.start_date = 'Start date is required';
    if (!editFormData.deadline_date.trim()) {
      errors.deadline_date = 'End date is required';
    } else if (editFormData.start_date && editFormData.deadline_date < editFormData.start_date) {
      errors.deadline_date = 'End date cannot be earlier than start date';
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setEditFormErrors({});
    const success = await updateProject(projectToEdit.id, {
      project_name: editFormData.project_name.trim(),
      location: editFormData.location.trim(),
      start_date: editFormData.start_date || undefined,
      deadline_date: editFormData.deadline_date || undefined,
      status: editFormData.status,
    });

    if (success) {
      setIsEditModalOpen(false);
      setProjectToEdit(null);
    }
  };


  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newProject.project_name.trim()) errors.project_name = 'Project name is required';
    if (!newProject.location?.trim()) errors.location = 'Site location is required';
    if (!newProject.start_date?.trim()) errors.start_date = 'Start date is required';
    if (!newProject.deadline_date?.trim()) {
      errors.deadline_date = 'End date is required';
    } else if (newProject.start_date && newProject.deadline_date < newProject.start_date) {
      errors.deadline_date = 'End date cannot be earlier than start date';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    let customerId = newProject.customer_id;
    const trimmedCustomer = customerNameInput.trim();
    if (trimmedCustomer) {
      const existing = customers.find(c => c.name.toLowerCase() === trimmedCustomer.toLowerCase());
      if (existing) {
        customerId = existing.id;
      } else {
        try {
          const newCust = await api.post<Customer>('/customers/', { name: trimmedCustomer });
          customerId = newCust.id;
        } catch {
          // If customer creation fails, continue without customer_id
        }
      }
    }

    const success = await createProject({
      ...newProject,
      customer_id: customerId,
      start_date: newProject.start_date || undefined,
      deadline_date: newProject.deadline_date || undefined,
    });
    if (success) {
      setNewProject({
        project_name: '',
        location: '',
        status: 'Starting',
        assigned_manager: '',
        start_date: '',
        deadline_date: '',
        contract_amount: 0,
        notes: '',
        project_type: 'Window & Door Installation',
      });
      setCustomerNameInput('');
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const errors: Record<string, string> = {};
    if (!newItem.width_mm || Number(newItem.width_mm) <= 0) errors.width_mm = 'Width must be greater than 0';
    if (!newItem.height_mm || Number(newItem.height_mm) <= 0) errors.height_mm = 'Height must be greater than 0';
    if (!newItem.quantity || Number(newItem.quantity) <= 0) errors.quantity = 'Quantity must be at least 1';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    await addItemToProject(selectedProject.id, {
      ...newItem,
      width_mm: Number(newItem.width_mm),
      height_mm: Number(newItem.height_mm),
      quantity: Number(newItem.quantity),
    });
    setNewItem(initialNewItem);
  };

  const handleOpenConsumeModal = () => {
    if (!selectedProject) return;
    const initialInputs: Record<number, { consumed: number; wastage: number }> = {};
    selectedProject.material_requirements?.forEach(r => {
      initialInputs[r.id] = { consumed: r.required_qty, wastage: 0 };
    });
    setConsumptionInputs(initialInputs);
    setIsConsumeModalOpen(true);
  };

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const payloadItems = Object.entries(consumptionInputs).map(([reqId, val]) => ({
      material_requirement_id: Number(reqId),
      consumed_qty: Number(val.consumed) || 0,
      wastage_qty: Number(val.wastage) || 0,
      notes: `Production issue for project ${selectedProject.project_number}`,
    }));

    await consumeMaterials(selectedProject.id, payloadItems);
  };

  const handleShortagePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    await createShortagePO(selectedProject.id, selectedSupplierId);
  };

  const hasShortages = selectedProject?.material_requirements?.some(r => r.status === 'Shortage');

  return (
    <div className="erp-content">
      {/* Top Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search project ID, name, or location..."
              className="erp-input erp-input-with-icon"
              style={{ width: '380px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="erp-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--erp-border)', borderRadius: 'var(--erp-radius-sm)', overflow: 'hidden' }}>
            <button
              type="button"
              className={`erp-btn ${viewMode === 'card' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
              style={{ height: '32px', padding: '0 10px', borderRadius: 0, border: 'none', gap: '5px', fontSize: '12px' }}
              onClick={() => setViewMode('card')}
              title="Card View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`erp-btn ${viewMode === 'table' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
              style={{ height: '32px', padding: '0 10px', borderRadius: 0, border: 'none', borderLeft: '1px solid var(--erp-border)', gap: '5px', fontSize: '12px' }}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {viewMode === 'card' ? (
        isLoading ? (
          <div
            className="erp-table-container"
            style={{ padding: '36px 20px', textAlign: 'center', fontSize: '14.5px', color: 'var(--erp-text-muted)' }}
          >
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            className="erp-table-container"
            style={{ padding: '36px 20px', textAlign: 'center', fontSize: '14.5px', color: 'var(--erp-text-muted)' }}
          >
            No projects found. Projects will appear here automatically when sales deals are Closed Won.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {projects.map(proj => {
              const progress = getProjectCalculatedProgress(proj.id, proj.status);
              const exportValidation = checkProjectExportValidation(proj);
              const customerName = proj.customer?.name || customers.find(c => c.id === proj.customer_id)?.name || '-';

              return (
                <div
                  key={proj.id}
                  className="erp-project-card"
                  onClick={() => navigate({ to: `/projects/${proj.id}` })}
                >
                  <div>
                    {/* Card Header: Project Number, Name, Status Badge, and Action dropdown */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                          {proj.project_number || `PRJ-${String(proj.id).padStart(4, '0')}`}
                        </div>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--erp-text-main)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={proj.project_name}
                        >
                          {proj.project_name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <StatusBadge status={proj.status} style={{ fontSize: '12px', padding: '2px 8px' }} />

                        <div className="erp-dropdown-container">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuProjectId(openMenuProjectId === proj.id ? null : proj.id);
                            }}
                            title="Actions"
                            aria-label="Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {openMenuProjectId === proj.id && (
                            <div className="erp-dropdown-menu" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  handleOpenEditModal(proj);
                                }}
                              >
                                <Pencil size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  navigate({ to: `/projects/${proj.id}` });
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Project Workspace</span>
                              </button>
                              <div className="erp-dropdown-divider" />
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  handleOpenStatusModal(proj);
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Change Status</span>
                              </button>

                              <div className="erp-dropdown-divider" />
                              {proj.status !== 'In Progress' && proj.status !== 'Completed' && proj.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#d97706' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <Clock size={13} />
                                  <span>Mark In Progress</span>
                                </button>
                              )}
                              {proj.status !== 'Completed' && proj.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#047857' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'Completed');
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Mark Completed</span>
                                </button>
                              )}
                              {proj.status !== 'Cancelled' ? (
                                <button
                                  type="button"
                                  className="erp-dropdown-item danger"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'Cancelled');
                                  }}
                                >
                                  <Ban size={13} />
                                  <span>Cancel Project</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Reactivate Project</span>
                                </button>
                              )}
                              {proj.status === 'Completed' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Reopen as In Progress</span>
                                </button>
                              )}
                              <div className="erp-dropdown-divider" />
                              <button
                                type="button"
                                className={`erp-dropdown-item ${!exportValidation.canExport ? 'disabled' : ''}`}
                                disabled={!exportValidation.canExport}
                                title={
                                  exportValidation.canExport
                                    ? 'Export project specification as PDF'
                                    : `Cannot export: ${exportValidation.reason}`
                                }
                                onClick={() => {
                                  if (!exportValidation.canExport) return;
                                  setOpenMenuProjectId(null);
                                  exportProjectToPDF(
                                    proj,
                                    customerName,
                                    exportValidation.personnelList,
                                    exportValidation.materialsList
                                  );
                                }}
                              >
                                <FileText size={13} />
                                <span>Export as PDF</span>
                              </button>
                              <button
                                type="button"
                                className={`erp-dropdown-item ${!exportValidation.canExport ? 'disabled' : ''}`}
                                disabled={!exportValidation.canExport}
                                title={
                                  exportValidation.canExport
                                    ? 'Export project specification as Word (.doc)'
                                    : `Cannot export: ${exportValidation.reason}`
                                }
                                onClick={() => {
                                  if (!exportValidation.canExport) return;
                                  setOpenMenuProjectId(null);
                                  exportProjectToWord(
                                    proj,
                                    customerName,
                                    exportValidation.personnelList,
                                    exportValidation.materialsList
                                  );
                                }}
                              >
                                <FileDown size={13} />
                                <span>Export as Word</span>
                              </button>

                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata: Location & Dates */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-main)' }}>
                        <MapPin size={14} style={{ color: 'var(--erp-text-muted)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.location || 'Not Specified'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                        <Calendar size={14} style={{ flexShrink: 0 }} />
                        <span>
                          {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : '-'}
                          {' – '}
                          {proj.deadline_date ? new Date(proj.deadline_date).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div style={{ borderTop: '1px solid var(--erp-border)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--erp-text-muted)' }}>Progress</span>
                      <span style={{ fontWeight: 600, color: progress === 100 ? '#059669' : 'var(--erp-text-main)' }}>
                        {progress}%
                      </span>
                    </div>
                    <div className="erp-progress-track" style={{ height: '6px', margin: 0 }}>
                      <div
                        className={`erp-progress-bar ${progress === 100 ? 'completed' : ''}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Full-Width Project Table */
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ fontSize: '13.5px' }}>Project Name</th>
                <th style={{ fontSize: '13.5px' }}>Site Location</th>
                <th style={{ fontSize: '13.5px' }}>Progress</th>
                <th style={{ fontSize: '13.5px' }}>Start Date</th>
                <th style={{ fontSize: '13.5px' }}>End Date</th>
                <th style={{ fontSize: '13.5px' }}>Status</th>
                <th style={{ textAlign: 'right', fontSize: '13.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', fontSize: '14.5px' }}>
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)', fontSize: '14.5px' }}>
                    No projects found. Projects will appear here automatically when sales deals are Closed Won.
                  </td>
                </tr>
              ) : (
                projects.map(proj => {
                  const progress = getProjectCalculatedProgress(proj.id, proj.status);
                  const exportValidation = checkProjectExportValidation(proj);
                  const customerName = proj.customer?.name || customers.find(c => c.id === proj.customer_id)?.name || '-';
                  return (
                    <tr key={proj.id}>
                      <td
                        style={{
                          fontWeight: 400,
                          fontSize: '15.5px',
                          color: 'var(--erp-text-main)',
                          cursor: 'pointer'
                        }}
                        title={`Open Workflow & BOM for ${proj.project_name}`}
                        onClick={() => navigate({ to: `/projects/${proj.id}` })}
                      >
                        {proj.project_name}
                      </td>
                      <td style={{ fontSize: '14.5px' }}>{proj.location || '-'}</td>
                      <td>
                        <div className="erp-progress-wrapper">
                          <div className="erp-progress-track" style={{ height: '7px' }}>
                            <div
                              className={`erp-progress-bar ${progress === 100 ? 'completed' : ''}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="erp-progress-label" style={{ fontSize: '14px' }}>{progress}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '14.5px' }}>{proj.start_date ? new Date(proj.start_date).toLocaleDateString() : '-'}</td>
                      <td style={{ fontSize: '14.5px' }}>{proj.deadline_date ? new Date(proj.deadline_date).toLocaleDateString() : '-'}</td>
                      <td>
                        <StatusBadge status={proj.status} style={{ fontSize: '12.5px', padding: '2.5px 8.5px' }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="erp-dropdown-container">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProjectId(openMenuProjectId === proj.id ? null : proj.id);
                            }}
                            title="Actions"
                            aria-label="Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {openMenuProjectId === proj.id && (
                            <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  handleOpenEditModal(proj);
                                }}
                              >
                                <Pencil size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  navigate({ to: `/projects/${proj.id}` });
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Project Workspace</span>
                              </button>
                              <div className="erp-dropdown-divider" />
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  handleOpenStatusModal(proj);
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Change Status</span>
                              </button>

                              <div className="erp-dropdown-divider" />
                              {proj.status !== 'In Progress' && proj.status !== 'Completed' && proj.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#d97706' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <Clock size={13} />
                                  <span>Mark In Progress</span>
                                </button>
                              )}
                              {proj.status !== 'Completed' && proj.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#047857' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'Completed');
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Mark Completed</span>
                                </button>
                              )}
                              {proj.status !== 'Cancelled' ? (
                                <button
                                  type="button"
                                  className="erp-dropdown-item danger"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'Cancelled');
                                  }}
                                >
                                  <Ban size={13} />
                                  <span>Cancel Project</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Reactivate Project</span>
                                </button>
                              )}
                              {proj.status === 'Completed' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateStatus(proj.id, 'In Progress');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Reopen as In Progress</span>
                                </button>
                              )}
                              <div className="erp-dropdown-divider" />
                              <button
                                type="button"
                                className={`erp-dropdown-item ${!exportValidation.canExport ? 'disabled' : ''}`}
                                disabled={!exportValidation.canExport}
                                title={
                                  exportValidation.canExport
                                    ? 'Export project specification as PDF'
                                    : `Cannot export: ${exportValidation.reason}`
                                }
                                onClick={() => {
                                  if (!exportValidation.canExport) return;
                                  setOpenMenuProjectId(null);
                                  exportProjectToPDF(
                                    proj,
                                    customerName,
                                    exportValidation.personnelList,
                                    exportValidation.materialsList
                                  );
                                }}
                              >
                                <FileText size={13} />
                                <span>Export as PDF</span>
                              </button>
                              <button
                                type="button"
                                className={`erp-dropdown-item ${!exportValidation.canExport ? 'disabled' : ''}`}
                                disabled={!exportValidation.canExport}
                                title={
                                  exportValidation.canExport
                                    ? 'Export project specification as Word (.doc)'
                                    : `Cannot export: ${exportValidation.reason}`
                                }
                                onClick={() => {
                                  if (!exportValidation.canExport) return;
                                  setOpenMenuProjectId(null);
                                  exportProjectToWord(
                                    proj,
                                    customerName,
                                    exportValidation.personnelList,
                                    exportValidation.materialsList
                                  );
                                }}
                              >
                                <FileDown size={13} />
                                <span>Export as Word</span>
                              </button>

                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Project Management & Lifecycle Workflow */}
      <Modal
        isOpen={isManageModalOpen && !!selectedProject}
        onClose={() => setIsManageModalOpen(false)}
        title={selectedProject ? `Project: ${selectedProject.project_number} - ${selectedProject.project_name}` : 'Manage Project'}
        maxWidth="820px"
      >
        {selectedProject && (
          <div>
            {/* Quick Context Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              borderBottom: '1px solid var(--erp-border)',
              backgroundColor: 'var(--erp-bg)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} color="var(--erp-text-muted)" />
                  <strong>Location:</strong> {selectedProject.location || '-'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} color="var(--erp-text-muted)" />
                  <strong>Timeline:</strong>{' '}
                  {selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : '-'}
                  {' '}&rarr;{' '}
                  {selectedProject.deadline_date ? new Date(selectedProject.deadline_date).toLocaleDateString() : '-'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="erp-form-label" style={{ margin: 0 }}>Workflow:</span>
                <StatusBadge status={selectedProject.status} />
              </div>
            </div>

            {/* Workflow Navigation Tabs */}
            <div className="erp-drawer-tabs">
              <button
                className={`erp-drawer-tab ${activeTab === 'items' ? 'active' : ''}`}
                onClick={() => setActiveTab('items')}
              >
                Products ({selectedProject.items?.length || 0})
              </button>
              <button
                className={`erp-drawer-tab ${activeTab === 'materials' ? 'active' : ''}`}
                onClick={() => setActiveTab('materials')}
              >
                BOM Planning
              </button>
              <button
                className={`erp-drawer-tab ${activeTab === 'production' ? 'active' : ''}`}
                onClick={() => setActiveTab('production')}
              >
                Production & Cost
              </button>
            </div>

            <div className="erp-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Tab: Products */}
              {activeTab === 'items' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Configured Openings & Products</span>
                    <button
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      onClick={() => {
                        setNewItem(initialNewItem);
                        setFormErrors({});
                        setIsAddItemModalOpen(true);
                      }}
                    >
                      <Plus size={12} />
                      <span>Add Product</span>
                    </button>
                  </div>

                  {selectedProject.items?.length === 0 ? (
                    <div style={{ color: 'var(--erp-text-muted)', fontSize: '12px', padding: '24px 0', textAlign: 'center' }}>
                      No products added yet. Click "Add Product" to configure window or door openings and calculate materials.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedProject.items.map(item => (
                        <div
                          key={item.id}
                          className="erp-card-item"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12.5px' }}>{item.product_type}</strong>
                            <button
                              onClick={() => deleteItem(selectedProject.id, item.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--erp-text-muted)', cursor: 'pointer' }}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                            Dimensions: {item.width_mm}mm W &times; {item.height_mm}mm H | Qty: {item.quantity}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                            Glass: {item.glass_specification} | Color: {item.frame_color}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: BOM Planning */}
              {activeTab === 'materials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Calculated Material Requirements</span>
                    <button
                      className="erp-btn erp-btn-secondary erp-btn-sm"
                      onClick={() => calculateMaterials(selectedProject.id)}
                      disabled={actionLoading}
                      title="Recalculate BOM based on opening dimensions"
                    >
                      <Calculator size={12} />
                      <span>Recalculate BOM</span>
                    </button>
                  </div>

                  {selectedProject.material_requirements?.length === 0 ? (
                    <div style={{ color: 'var(--erp-text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                      No material requirements calculated yet. Click "Recalculate BOM" to generate materials list from configured products.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedProject.material_requirements.map(req => (
                        <div
                          key={req.id}
                          className="erp-card-item"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{req.material_name}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                              Required: {req.required_qty} {req.material_unit} | Available: {req.available_stock} {req.material_unit}
                            </div>
                          </div>
                          <StatusBadge status={req.status} />
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          className="erp-btn erp-btn-primary erp-btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => reserveMaterials(selectedProject.id)}
                          disabled={actionLoading}
                        >
                          <ShieldCheck size={14} />
                          <span>Reserve Available Stock</span>
                        </button>

                        {hasShortages && (
                          <button
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ borderColor: 'var(--erp-border-error)', color: 'var(--erp-text-error)' }}
                            onClick={() => setIsShortagePOModalOpen(true)}
                            disabled={actionLoading}
                          >
                            <ShoppingCart size={14} />
                            <span>Order Shortages</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Production */}
              {activeTab === 'production' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Production & Material Consumption</span>
                    <button
                      className="erp-btn erp-btn-primary erp-btn-sm"
                      onClick={handleOpenConsumeModal}
                      disabled={actionLoading || selectedProject.material_requirements?.length === 0}
                    >
                      <Hammer size={12} />
                      <span>Record Consumption</span>
                    </button>
                  </div>

                  <div className="erp-info-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Actual Material Cost Recorded:</span>
                      <strong style={{ color: 'var(--erp-primary)' }}>
                        ${(selectedProject.actual_cost || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                    Recording material consumption will issue items from reserved inventory, log scrap/wastage, and track real-time workshop material usage.
                  </div>
                </div>
              )}
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setIsManageModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: New Project */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="erp-modal-body">

            <div className="erp-form-group">
              <label className="erp-form-label">Project Name *</label>
              <input
                type="text"
                placeholder="Project Name"
                className={`erp-input ${formErrors.project_name ? 'erp-input-error' : ''}`}
                value={newProject.project_name}
                onChange={e => {
                  setNewProject({ ...newProject, project_name: e.target.value });
                  if (formErrors.project_name) setFormErrors({ ...formErrors, project_name: '' });
                }}
              />
              {formErrors.project_name && (
                <span className="erp-form-error">{formErrors.project_name}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Customer Name</label>
                <input
                  type="text"
                  list="project-customers-list"
                  placeholder="Customer Name"
                  className="erp-input"
                  value={customerNameInput}
                  onChange={e => setCustomerNameInput(e.target.value)}
                />
                <datalist id="project-customers-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Project Type</label>
                <select
                  className="erp-select"
                  value={newProject.project_type || 'Window & Door Installation'}
                  onChange={e => setNewProject({ ...newProject, project_type: e.target.value })}
                >
                  <option value="Window & Door Installation">Window & Door Installation</option>
                  <option value="Curtain Wall & Facade">Curtain Wall & Facade</option>
                  <option value="Glass Partition & Interior">Glass Partition & Interior</option>
                  <option value="Commercial Storefront">Commercial Storefront</option>
                  <option value="Residential Glazing">Residential Glazing</option>
                  <option value="Aluminum Fabrication">Aluminum Fabrication</option>
                  <option value="Custom Glazing & Metal Works">Custom Glazing & Metal Works</option>
                </select>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Site Location *</label>
              <input
                type="text"
                placeholder="Site Location"
                className={`erp-input ${formErrors.location ? 'erp-input-error' : ''}`}
                value={newProject.location}
                onChange={e => {
                  setNewProject({ ...newProject, location: e.target.value });
                  if (formErrors.location) setFormErrors({ ...formErrors, location: '' });
                }}
              />
              {formErrors.location && (
                <span className="erp-form-error">{formErrors.location}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Start Date *</label>
                <input
                  type="date"
                  className={`erp-input ${formErrors.start_date ? 'erp-input-error' : ''}`}
                  value={newProject.start_date}
                  onChange={e => {
                    setNewProject({ ...newProject, start_date: e.target.value });
                    if (formErrors.start_date) setFormErrors({ ...formErrors, start_date: '' });
                  }}
                />
                {formErrors.start_date && (
                  <span className="erp-form-error">{formErrors.start_date}</span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">End Date *</label>
                <input
                  type="date"
                  className={`erp-input ${formErrors.deadline_date ? 'erp-input-error' : ''}`}
                  value={newProject.deadline_date}
                  onChange={e => {
                    setNewProject({ ...newProject, deadline_date: e.target.value });
                    if (formErrors.deadline_date) setFormErrors({ ...formErrors, deadline_date: '' });
                  }}
                />
                {formErrors.deadline_date && (
                  <span className="erp-form-error">{formErrors.deadline_date}</span>
                )}
              </div>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Save Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Product Item */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title="Add Product Specification"
      >
        <form onSubmit={handleAddItemSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Product Type</label>
              <select
                className="erp-select"
                value={newItem.product_type}
                onChange={e => setNewItem({ ...newItem, product_type: e.target.value })}
              >
                <option value="Sliding Window 2-Track">Sliding Window 2-Track</option>
                <option value="Casement Window with Awning">Casement Window with Awning</option>
                <option value="Sliding Balcony Door">Sliding Balcony Door</option>
                <option value="Tempered Glass Partition">Tempered Glass Partition</option>
                <option value="Commercial Entrance Pivot Door">Commercial Entrance Pivot Door</option>
              </select>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Width (mm) *</label>
                <input
                  type="number"
                  placeholder="Width (mm)"
                  className={`erp-input ${formErrors.width_mm ? 'erp-input-error' : ''}`}
                  value={newItem.width_mm ?? ''}
                  onChange={e => setNewItem({ ...newItem, width_mm: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
                {formErrors.width_mm && <span className="erp-form-error">{formErrors.width_mm}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Height (mm) *</label>
                <input
                  type="number"
                  placeholder="Height (mm)"
                  className={`erp-input ${formErrors.height_mm ? 'erp-input-error' : ''}`}
                  value={newItem.height_mm ?? ''}
                  onChange={e => setNewItem({ ...newItem, height_mm: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
                {formErrors.height_mm && <span className="erp-form-error">{formErrors.height_mm}</span>}
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Quantity *</label>
                <input
                  type="number"
                  placeholder="Quantity"
                  className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                  value={newItem.quantity ?? ''}
                  onChange={e => setNewItem({ ...newItem, quantity: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
                {formErrors.quantity && <span className="erp-form-error">{formErrors.quantity}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Frame Color Finish</label>
                <input
                  type="text"
                  placeholder="Frame Color Finish"
                  className="erp-input"
                  value={newItem.frame_color}
                  onChange={e => setNewItem({ ...newItem, frame_color: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Glass Specification</label>
              <input
                type="text"
                placeholder="Glass Specification"
                className="erp-input"
                value={newItem.glass_specification}
                onChange={e => setNewItem({ ...newItem, glass_specification: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsAddItemModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Add Item to Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Material Consumption */}
      <Modal
        isOpen={isConsumeModalOpen}
        onClose={() => setIsConsumeModalOpen(false)}
        title="Record Production Material Consumption"
      >
        <form onSubmit={handleConsumeSubmit}>
          <div className="erp-modal-body">
            <div style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>
              Enter the actual quantities issued and any fabrication scrap/wastage.
            </div>

            {selectedProject?.material_requirements?.map(req => {
              const currentInput = consumptionInputs[req.id] || { consumed: req.required_qty, wastage: 0 };
              return (
                <div
                  key={req.id}
                  className="erp-card-item"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <strong>{req.material_name}</strong>
                    <span>Planned: {req.required_qty} {req.material_unit}</span>
                  </div>

                  <div className="erp-form-row">
                    <div className="erp-form-group">
                      <label className="erp-form-label">Consumed ({req.material_unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Consumed Quantity"
                        className="erp-input"
                        value={currentInput.consumed}
                        onChange={e =>
                          setConsumptionInputs({
                            ...consumptionInputs,
                            [req.id]: { ...currentInput, consumed: Number(e.target.value) },
                          })
                        }
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-form-label">Scrap/Wastage ({req.material_unit})</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Scrap or Wastage Quantity"
                        className="erp-input"
                        value={currentInput.wastage}
                        onChange={e =>
                          setConsumptionInputs({
                            ...consumptionInputs,
                            [req.id]: { ...currentInput, wastage: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsConsumeModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Post Material Consumption
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Shortage Purchase Order */}
      <Modal
        isOpen={isShortagePOModalOpen}
        onClose={() => setIsShortagePOModalOpen(false)}
        title="Create Purchase Order for Material Shortages"
      >
        <form onSubmit={handleShortagePOSubmit}>
          <div className="erp-modal-body">
            <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
              This will automatically compile all shortage quantities for <strong>{selectedProject?.project_name}</strong> into a purchase order.
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Select Supplier *</label>
              <select
                className="erp-select"
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(Number(e.target.value))}
              >
                {suppliers.length === 0 ? (
                  <option value="">No suppliers registered yet</option>
                ) : (
                  suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplier_type})</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsShortagePOModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading || suppliers.length === 0}
            >
              Generate Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Project */}
      <Modal
        isOpen={isEditModalOpen && !!projectToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setProjectToEdit(null);
        }}
        title={projectToEdit ? `Edit Project: ${projectToEdit.project_number}` : 'Edit Project'}
      >
        <form onSubmit={handleEditSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Project Name *</label>
              <input
                type="text"
                placeholder="Project Name"
                className={`erp-input ${editFormErrors.project_name ? 'erp-input-error' : ''}`}
                value={editFormData.project_name}
                onChange={e => {
                  setEditFormData({ ...editFormData, project_name: e.target.value });
                  if (editFormErrors.project_name) {
                    setEditFormErrors(prev => ({ ...prev, project_name: '' }));
                  }
                }}
              />
              {editFormErrors.project_name && (
                <span className="erp-form-error">{editFormErrors.project_name}</span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Site Location *</label>
              <input
                type="text"
                placeholder="Site Location"
                className={`erp-input ${editFormErrors.location ? 'erp-input-error' : ''}`}
                value={editFormData.location}
                onChange={e => {
                  setEditFormData({ ...editFormData, location: e.target.value });
                  if (editFormErrors.location) {
                    setEditFormErrors(prev => ({ ...prev, location: '' }));
                  }
                }}
              />
              {editFormErrors.location && (
                <span className="erp-form-error">{editFormErrors.location}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Start Date *</label>
                <input
                  type="date"
                  className={`erp-input ${editFormErrors.start_date ? 'erp-input-error' : ''}`}
                  value={editFormData.start_date}
                  onChange={e => {
                    setEditFormData({ ...editFormData, start_date: e.target.value });
                    if (editFormErrors.start_date) {
                      setEditFormErrors(prev => ({ ...prev, start_date: '' }));
                    }
                  }}
                />
                {editFormErrors.start_date && (
                  <span className="erp-form-error">{editFormErrors.start_date}</span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">End Date *</label>
                <input
                  type="date"
                  className={`erp-input ${editFormErrors.deadline_date ? 'erp-input-error' : ''}`}
                  value={editFormData.deadline_date}
                  onChange={e => {
                    setEditFormData({ ...editFormData, deadline_date: e.target.value });
                    if (editFormErrors.deadline_date) {
                      setEditFormErrors(prev => ({ ...prev, deadline_date: '' }));
                    }
                  }}
                />
                {editFormErrors.deadline_date && (
                  <span className="erp-form-error">{editFormErrors.deadline_date}</span>
                )}
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Status</label>
              <select
                className="erp-select"
                value={editFormData.status || 'Starting'}
                onChange={e => setEditFormData({ ...editFormData, status: e.target.value as ProjectStatus })}
              >
                <option value="Incoming Project">Incoming Project</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Starting">Starting</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>

          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setProjectToEdit(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={!!statusModalProject}
        onClose={() => setStatusModalProject(null)}
        title="Change Project Status"
        maxWidth="480px"
      >
        {statusModalProject && (
          <div>
            <div className="erp-modal-body">
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--erp-surface-hover)',
                  borderRadius: 'var(--erp-radius-sm)',
                  border: '1px solid var(--erp-border)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--erp-text-main)' }}>
                  {statusModalProject.project_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                  {statusModalProject.project_number} • Customer: {statusModalProject.customer?.name || 'Walk-in / Direct Client'}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>Current Status:</span>
                  <StatusBadge status={statusModalProject.status} />
                </div>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">New Status *</label>
                <select
                  className="erp-select"
                  value={statusModalValue}
                  onChange={e => setStatusModalValue(e.target.value as ProjectStatus)}
                >
                  <option value="Incoming Project">Incoming Project</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Starting">Starting</option>
                  <option value="Accepted">Accepted</option>
                </select>
              </div>

              {statusModalValue === 'Cancelled' && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--erp-radius-sm)',
                    fontSize: '12px',
                    color: '#b91c1c',
                    lineHeight: 1.4,
                  }}
                >
                  Marking as <strong>Cancelled</strong> will halt operations on this project.
                </div>
              )}

              {statusModalValue === 'Completed' && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--erp-radius-sm)',
                    fontSize: '12px',
                    color: '#047857',
                    lineHeight: 1.4,
                  }}
                >
                  Marking as <strong>Completed</strong> signifies that site fabrication, installation, and inspection are done.
                </div>
              )}
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setStatusModalProject(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={handleSaveStatusModal}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
