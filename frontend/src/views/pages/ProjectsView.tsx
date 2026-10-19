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
  ChevronDown
} from 'lucide-react';
import { useProjectsController } from '../../controllers/useProjectsController';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Project, ProjectStatus, ProjectFormData, ProjectItemFormData } from '../../models/types';

const STATUS_OPTIONS: ProjectStatus[] = [
  'Draft',
  'Quotation',
  'Approved',
  'Material Preparation',
  'Production',
  'Ready for Delivery',
  'Installation',
  'Completed',
  'Cancelled'
];

const getProjectProgress = (status: ProjectStatus): number => {
  switch (status) {
    case 'Draft': return 5;
    case 'Quotation': return 15;
    case 'Approved': return 25;
    case 'Material Preparation': return 45;
    case 'Production': return 65;
    case 'Ready for Delivery': return 85;
    case 'Installation': return 95;
    case 'Completed': return 100;
    case 'Cancelled': return 0;
    default: return 0;
  }
};

export const ProjectsView: React.FC = () => {
  const {
    projects,
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
    selectProject,
    createProject,
    updateProject,
    deleteProject,
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

  // Edit Project Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<{
    project_name: string;
    location: string;
    start_date: string;
    deadline_date: string;
  }>({
    project_name: '',
    location: '',
    start_date: '',
    deadline_date: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Delete Project Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

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
    status: 'Draft',
    assigned_manager: '',
    start_date: '',
    deadline_date: '',
    contract_amount: 0,
    notes: '',
  });

  // Add Item Form State
  const [newItem, setNewItem] = useState<ProjectItemFormData>({
    product_type: 'Sliding Window 2-Track',
    description: '',
    width_mm: 1800,
    height_mm: 1500,
    quantity: 1,
    glass_specification: '6mm Clear Tempered',
    frame_color: 'Black Powder Coated',
    unit_estimated_cost: 250,
    unit_selling_price: 380,
  });

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
      start_date: proj.start_date ? proj.start_date.split('T')[0] : '',
      deadline_date: proj.deadline_date ? proj.deadline_date.split('T')[0] : '',
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
    });

    if (success) {
      setIsEditModalOpen(false);
      setProjectToEdit(null);
    }
  };

  const handleOpenDeleteModal = (proj: Project) => {
    setProjectToDelete(proj);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    const success = await deleteProject(projectToDelete.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
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
    const success = await createProject({
      ...newProject,
      start_date: newProject.start_date || undefined,
      deadline_date: newProject.deadline_date || undefined,
    });
    if (success) {
      setNewProject({
        project_name: '',
        location: '',
        status: 'Draft',
        assigned_manager: '',
        start_date: '',
        deadline_date: '',
        contract_amount: 0,
        notes: '',
      });
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const errors: Record<string, string> = {};
    if (newItem.width_mm <= 0) errors.width_mm = 'Width must be greater than 0';
    if (newItem.height_mm <= 0) errors.height_mm = 'Height must be greater than 0';
    if (newItem.quantity <= 0) errors.quantity = 'Quantity must be at least 1';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    await addItemToProject(selectedProject.id, newItem);
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

        <button
          className="erp-btn erp-btn-primary"
          onClick={() => {
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Full-Width Project Table */}
      <div className="erp-table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Project ID</th>
              <th>Project Name</th>
              <th>Site Location</th>
              <th>Progress</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading projects...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                  No projects found. Click "New Project" to create one.
                </td>
              </tr>
            ) : (
              projects.map(proj => {
                const progress = getProjectProgress(proj.status);
                return (
                  <tr key={proj.id}>
                    <td style={{ fontWeight: 600 }}>{proj.project_number}</td>
                    <td>{proj.project_name}</td>
                    <td>{proj.location || '-'}</td>
                    <td>
                      <div className="erp-progress-wrapper">
                        <div className="erp-progress-track">
                          <div
                            className={`erp-progress-bar ${progress === 100 ? 'completed' : ''}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="erp-progress-label">{progress}%</span>
                      </div>
                    </td>
                    <td>{proj.start_date ? new Date(proj.start_date).toLocaleDateString() : '-'}</td>
                    <td>{proj.deadline_date ? new Date(proj.deadline_date).toLocaleDateString() : '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="erp-dropdown-container">
                        <button
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProjectId(openMenuProjectId === proj.id ? null : proj.id);
                          }}
                        >
                          <SlidersHorizontal size={12} />
                          <span>Manage</span>
                          <ChevronDown size={11} style={{ marginLeft: 2, opacity: 0.7 }} />
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
                                selectProject(proj);
                                setIsManageModalOpen(true);
                              }}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Workflow & BOM</span>
                            </button>
                            <div className="erp-dropdown-divider" />
                            <button
                              type="button"
                              className="erp-dropdown-item danger"
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                handleOpenDeleteModal(proj);
                              }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
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
                <select
                  className="erp-select"
                  style={{ height: '30px', padding: '0 24px 0 10px', fontSize: '11.5px' }}
                  value={selectedProject.status}
                  onChange={e => updateStatus(selectedProject.id, e.target.value as ProjectStatus)}
                  disabled={actionLoading}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
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
                placeholder="Enter project name"
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

            <div className="erp-form-group">
              <label className="erp-form-label">Site Location *</label>
              <input
                type="text"
                placeholder="Enter site location"
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
                  placeholder="Enter width in mm"
                  className={`erp-input ${formErrors.width_mm ? 'erp-input-error' : ''}`}
                  value={newItem.width_mm}
                  onChange={e => setNewItem({ ...newItem, width_mm: Number(e.target.value) })}
                />
                {formErrors.width_mm && <span className="erp-form-error">{formErrors.width_mm}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Height (mm) *</label>
                <input
                  type="number"
                  placeholder="Enter height in mm"
                  className={`erp-input ${formErrors.height_mm ? 'erp-input-error' : ''}`}
                  value={newItem.height_mm}
                  onChange={e => setNewItem({ ...newItem, height_mm: Number(e.target.value) })}
                />
                {formErrors.height_mm && <span className="erp-form-error">{formErrors.height_mm}</span>}
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Quantity *</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                  value={newItem.quantity}
                  onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                />
                {formErrors.quantity && <span className="erp-form-error">{formErrors.quantity}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Frame Color Finish</label>
                <input
                  type="text"
                  placeholder="Enter frame color finish"
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
                placeholder="Enter glass specification"
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
                        placeholder="Enter consumed quantity"
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
                        placeholder="Enter scrap quantity"
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
                placeholder="Enter project name"
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
              <div className="erp-input-group">
                <MapPin className="erp-input-icon" />
                <input
                  type="text"
                  placeholder="Enter site location"
                  className={`erp-input erp-input-with-icon ${editFormErrors.location ? 'erp-input-error' : ''}`}
                  value={editFormData.location}
                  onChange={e => {
                    setEditFormData({ ...editFormData, location: e.target.value });
                    if (editFormErrors.location) {
                      setEditFormErrors(prev => ({ ...prev, location: '' }));
                    }
                  }}
                />
              </div>
              {editFormErrors.location && (
                <span className="erp-form-error">{editFormErrors.location}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Start Date *</label>
                <div className="erp-input-group">
                  <Calendar className="erp-input-icon" />
                  <input
                    type="date"
                    className={`erp-input erp-input-with-icon ${editFormErrors.start_date ? 'erp-input-error' : ''}`}
                    value={editFormData.start_date}
                    onChange={e => {
                      setEditFormData({ ...editFormData, start_date: e.target.value });
                      if (editFormErrors.start_date) {
                        setEditFormErrors(prev => ({ ...prev, start_date: '' }));
                      }
                    }}
                  />
                </div>
                {editFormErrors.start_date && (
                  <span className="erp-form-error">{editFormErrors.start_date}</span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">End Date *</label>
                <div className="erp-input-group">
                  <Calendar className="erp-input-icon" />
                  <input
                    type="date"
                    className={`erp-input erp-input-with-icon ${editFormErrors.deadline_date ? 'erp-input-error' : ''}`}
                    value={editFormData.deadline_date}
                    onChange={e => {
                      setEditFormData({ ...editFormData, deadline_date: e.target.value });
                      if (editFormErrors.deadline_date) {
                        setEditFormErrors(prev => ({ ...prev, deadline_date: '' }));
                      }
                    }}
                  />
                </div>
                {editFormErrors.deadline_date && (
                  <span className="erp-form-error">{editFormErrors.deadline_date}</span>
                )}
              </div>
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

      {/* Modal: Delete Project Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen && !!projectToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        title="Delete Project"
        maxWidth="460px"
      >
        <div className="erp-modal-body">
          <p style={{ fontSize: '13px', color: 'var(--erp-text-main)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
            Are you sure you want to delete project <strong>{projectToDelete?.project_number}</strong> ({projectToDelete?.project_name})?
          </p>
          <p style={{ fontSize: '12px', color: 'var(--erp-text-muted)', margin: 0, lineHeight: 1.5 }}>
            This action cannot be undone. All associated items, material requirements, and production movements for this project will be removed.
          </p>
        </div>
        <div className="erp-modal-footer">
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setProjectToDelete(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="erp-btn erp-btn-danger"
            disabled={actionLoading}
            onClick={handleDeleteConfirm}
          >
            {actionLoading ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
