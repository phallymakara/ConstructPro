import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  User,
  Phone,
  Building2,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  RotateCcw,
  Ban,
  Clock,
} from 'lucide-react';
import {
  useSalesController,
  calculateProjectDuration,
  type SalesProjectFormData,
} from '../../controllers/useSalesController';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { ProjectStatus, Project } from '../../models/types';

const PROJECT_TYPE_OPTIONS = [
  'Window & Door Installation',
  'Curtain Wall & Facade',
  'Glass Partition & Interior',
  'Commercial Storefront',
  'Residential Glazing',
  'Aluminum Fabrication',
  'Custom Glazing & Metal Works',
];

const STATUS_OPTIONS: ProjectStatus[] = [
  'Draft',
  'In Progress',
  'Closed Won',
  'Closed Lost',
];

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  const d = new Date(str);
  if (isNaN(d.getTime())) return '-';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

export const SalesView: React.FC = () => {
  const {
    projects,
    totalCount,
    customers,
    isLoading,
    actionLoading,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isCreateModalOpen,
    setIsCreateModalOpen,
    createSalesProject,
    updateSalesProjectStatus,
  } = useSalesController();

  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [statusModalProject, setStatusModalProject] = useState<Project | null>(null);
  const [statusModalValue, setStatusModalValue] = useState<ProjectStatus>('Draft');

  // Manage Dropdown Menu State
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | null>(null);

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

  // Form State
  const initialFormState: SalesProjectFormData = {
    project_name: '',
    project_number: '',
    customer_id: null,
    new_customer_name: '',
    project_type: 'Window & Door Installation',
    status: 'Draft',
    location: '',
    sales_person: '',
    contact_person: '',
    customer_address: '',
    customer_phone: '',
    customer_email: '',
    preferred_contact_method: 'Phone',
    start_date: '',
    deadline_date: '',
    actual_start_date: '',
    actual_end_date: '',
    notes: '',
  };

  const [formData, setFormData] = useState<SalesProjectFormData>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customerNameInput, setCustomerNameInput] = useState<string>('');

  const openCreateModal = () => {
    setErrorMessage(null);
    setFormErrors({});
    setCustomerNameInput('');
    setFormData({
      ...initialFormState,
      project_name: '',
      location: '',
      project_type: 'Window & Door Installation',
      status: 'Draft',
      start_date: '',
      deadline_date: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.project_name.trim()) errors.project_name = 'Project name is required';
    if (!formData.location?.trim()) errors.location = 'Site location is required';
    if (!formData.start_date?.trim()) errors.start_date = 'Start date is required';
    if (!formData.deadline_date?.trim()) {
      errors.deadline_date = 'End date is required';
    } else if (formData.start_date && formData.deadline_date < formData.start_date) {
      errors.deadline_date = 'End date cannot be earlier than start date';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    let customerId: number | null = null;
    let newCustomerName = '';
    const trimmedCustomer = customerNameInput.trim();
    if (trimmedCustomer) {
      const existing = customers.find(c => c.name.toLowerCase() === trimmedCustomer.toLowerCase());
      if (existing) {
        customerId = existing.id;
      } else {
        newCustomerName = trimmedCustomer;
      }
    }

    const created = await createSalesProject({
      ...formData,
      customer_id: customerId,
      new_customer_name: newCustomerName,
    });

    if (created && created.id) {
      setIsCreateModalOpen(false);
      navigate({ to: '/sale/$projectId', params: { projectId: String(created.id) } });
    }
  };

  const handleOpenStatusModal = (project: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStatusModalProject(project);
    setStatusModalValue(project.status as ProjectStatus);
  };

  const handleSaveStatusModal = async () => {
    if (!statusModalProject) return;
    const success = await updateSalesProjectStatus(statusModalProject.id, statusModalValue);
    if (success) {
      setStatusModalProject(null);
    }
  };

  return (
    <div className="erp-content" style={{ animation: 'erpFadeIn 0.22s ease-out' }}>
      {/* Top Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="erp-input erp-input-with-icon"
              style={{ width: '380px' }}
            />
          </div>

          {/* Status Filter (right next to search field) */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="erp-select"
          >
            <option value="All">All Statuses ({totalCount})</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Cards / Table View Toggle */}
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

          {/* New Project Button moved back to the right */}
          <button
            onClick={openCreateModal}
            className="erp-btn erp-btn-primary"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Global Alerts / Messages */}
      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: 'var(--erp-radius)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: 'var(--erp-radius)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div
            className="erp-table-container"
            style={{ padding: '36px 20px', textAlign: 'center', fontSize: '14.5px', color: 'var(--erp-text-muted)' }}
          >
            Loading sales projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              border: '1px dashed var(--erp-border)',
              borderRadius: 'var(--erp-radius-card)',
              backgroundColor: 'var(--erp-surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--erp-surface-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-text-muted)',
              }}
            >
              <Briefcase size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                No projects found
              </div>
              <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', marginTop: '4px' }}>
                {searchQuery || statusFilter !== 'All'
                  ? 'No projects match your search or status filter.'
                  : 'Start by registering your first project from the sales portal.'}
              </div>
            </div>
            <button onClick={openCreateModal} className="erp-btn erp-btn-primary" style={{ marginTop: '8px' }}>
              <Plus size={15} />
              <span>Create Project</span>
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* Card Grid View Template (Matching ProjectsView) */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}
          >
            {projects.map(project => {
              const duration = calculateProjectDuration(project.start_date, project.deadline_date);

              const customerName = project.customer?.name || (project.customer_id ? `Customer #${project.customer_id}` : 'Unassigned Customer');
              const contactPerson = project.customer_representative || project.customer?.contact_person || '-';
              const telephone = project.customer?.phone || 'No phone recorded';
              const preferredMethod = project.preferred_contact_method || project.customer?.preferred_contact_method || 'Phone';

              return (
                <div
                  key={project.id}
                  onClick={() => navigate({ to: '/sale/$projectId', params: { projectId: String(project.id) } })}
                  style={{
                    backgroundColor: 'var(--erp-surface)',
                    border: '1px solid var(--erp-border)',
                    borderRadius: 'var(--erp-radius-card)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--erp-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--erp-border)')}
                  title={`Click to view and edit details for ${project.project_name}`}
                >
                  <div>
                    {/* Card Header: Project Number, Name, Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                          {project.project_number}
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
                          title={project.project_name}
                        >
                          {project.project_name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <StatusBadge status={project.status} style={{ fontSize: '12px', padding: '2px 8px' }} />

                        <div className="erp-dropdown-container">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={e => {
                              e.stopPropagation();
                              setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id);
                            }}
                            title="Actions"
                            aria-label="Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {openMenuProjectId === project.id && (
                            <div className="erp-dropdown-menu" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  navigate({ to: '/sale/$projectId', params: { projectId: String(project.id) } });
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
                                  handleOpenStatusModal(project);
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Change Status</span>
                              </button>

                              <div className="erp-dropdown-divider" />

                              {project.status !== 'Closed Won' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#047857' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Closed Won');
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Mark Closed Won</span>
                                </button>
                              )}

                              {project.status !== 'In Progress' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'In Progress');
                                  }}
                                >
                                  <Clock size={13} />
                                  <span>Mark In Progress</span>
                                </button>
                              )}

                              {project.status !== 'Draft' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Draft');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Mark as Draft</span>
                                </button>
                              )}

                              {project.status !== 'Closed Lost' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item danger"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Closed Lost');
                                  }}
                                >
                                  <Ban size={13} />
                                  <span>Mark Closed Lost</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      {/* Customer & Contact Person */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-main)' }}>
                        <User size={14} style={{ color: 'var(--erp-text-muted)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {customerName}
                        </span>
                        {contactPerson !== '-' && (
                          <span style={{ color: 'var(--erp-text-muted)', fontSize: '12px' }}>
                            ({contactPerson})
                          </span>
                        )}
                      </div>

                      {/* Project Type */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                        <Building2 size={14} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.project_type || 'Window & Door Installation'}
                        </span>
                      </div>

                      {/* Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-main)' }}>
                        <MapPin size={14} style={{ color: 'var(--erp-text-muted)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.location || 'Not Specified'}
                        </span>
                      </div>

                      {/* Phone & Contact Method */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                        <Phone size={14} style={{ flexShrink: 0 }} />
                        <span>{telephone}</span>
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--erp-border)', backgroundColor: '#ffffff' }}>
                          {preferredMethod}
                        </span>
                      </div>

                      {/* Schedule: Dates & Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                        <Calendar size={14} style={{ flexShrink: 0 }} />
                        <span>
                          {formatDateDisplay(project.start_date)} – {formatDateDisplay(project.deadline_date)}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--erp-primary)', marginLeft: 'auto' }}>
                          {duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View Template (Matching ProjectsView) */
          <div className="erp-table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th style={{ fontSize: '13.5px' }}>Project Name</th>
                  <th style={{ fontSize: '13.5px' }}>Customer</th>
                  <th style={{ fontSize: '13.5px' }}>Project Type</th>
                  <th style={{ fontSize: '13.5px' }}>Site Location</th>
                  <th style={{ fontSize: '13.5px' }}>Schedule & Duration</th>
                  <th style={{ fontSize: '13.5px' }}>Status</th>
                  <th style={{ fontSize: '13.5px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const duration = calculateProjectDuration(project.start_date, project.deadline_date);
                  const customerName = project.customer?.name || (project.customer_id ? `Customer #${project.customer_id}` : 'Unassigned Customer');
                  const telephone = project.customer?.phone || 'No phone recorded';

                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate({ to: '/sale/$projectId', params: { projectId: String(project.id) } })}
                      style={{ cursor: 'pointer' }}
                      title={`Click to view and edit details for ${project.project_name}`}
                    >
                      <td>
                        <div style={{ fontWeight: 400, fontSize: '15.5px', color: 'var(--erp-text-main)' }}>
                          {project.project_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                          {project.project_number}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '14.5px', color: 'var(--erp-text-main)', fontWeight: 500 }}>
                          {customerName}
                        </div>
                        {telephone !== 'No phone recorded' && (
                          <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>{telephone}</div>
                        )}
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--erp-text-muted)' }}>
                        {project.project_type || 'Window & Door Installation'}
                      </td>
                      <td style={{ fontSize: '14.5px' }}>
                        {project.location || '-'}
                      </td>
                      <td style={{ fontSize: '14.5px' }}>
                        <div>{formatDateDisplay(project.start_date)} – {formatDateDisplay(project.deadline_date)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--erp-primary)', fontWeight: 500 }}>{duration}</div>
                      </td>
                      <td>
                        <StatusBadge status={project.status} style={{ fontSize: '12.5px', padding: '2.5px 8.5px' }} />
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div className="erp-dropdown-container">
                          <button
                            type="button"
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id);
                            }}
                            title="Actions"
                            aria-label="Actions"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          {openMenuProjectId === project.id && (
                            <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuProjectId(null);
                                  navigate({ to: '/sale/$projectId', params: { projectId: String(project.id) } });
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
                                  handleOpenStatusModal(project);
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Change Status</span>
                              </button>

                              <div className="erp-dropdown-divider" />

                              {project.status !== 'Closed Won' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  style={{ color: '#047857' }}
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Closed Won');
                                  }}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Mark Closed Won</span>
                                </button>
                              )}

                              {project.status !== 'In Progress' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'In Progress');
                                  }}
                                >
                                  <Clock size={13} />
                                  <span>Mark In Progress</span>
                                </button>
                              )}

                              {project.status !== 'Draft' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Draft');
                                  }}
                                >
                                  <RotateCcw size={13} />
                                  <span>Mark as Draft</span>
                                </button>
                              )}

                              {project.status !== 'Closed Lost' && (
                                <button
                                  type="button"
                                  className="erp-dropdown-item danger"
                                  onClick={async () => {
                                    setOpenMenuProjectId(null);
                                    await updateSalesProjectStatus(project.id, 'Closed Lost');
                                  }}
                                >
                                  <Ban size={13} />
                                  <span>Mark Closed Lost</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                value={formData.project_name}
                onChange={e => {
                  setFormData({ ...formData, project_name: e.target.value });
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
                  list="sales-customers-list"
                  placeholder="Select or enter customer name"
                  className="erp-input"
                  value={customerNameInput}
                  onChange={e => setCustomerNameInput(e.target.value)}
                />
                <datalist id="sales-customers-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Project Type</label>
                <select
                  className="erp-select"
                  value={formData.project_type || 'Window & Door Installation'}
                  onChange={e => setFormData({ ...formData, project_type: e.target.value })}
                >
                  {PROJECT_TYPE_OPTIONS.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Site Location *</label>
              <input
                type="text"
                placeholder="Enter site location"
                className={`erp-input ${formErrors.location ? 'erp-input-error' : ''}`}
                value={formData.location}
                onChange={e => {
                  setFormData({ ...formData, location: e.target.value });
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
                  value={formData.start_date}
                  onChange={e => {
                    setFormData({ ...formData, start_date: e.target.value });
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
                  value={formData.deadline_date}
                  onChange={e => {
                    setFormData({ ...formData, deadline_date: e.target.value });
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
              {actionLoading ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Change Status */}
      <Modal
        isOpen={!!statusModalProject}
        onClose={() => setStatusModalProject(null)}
        title="Change Project Status"
      >
        {statusModalProject && (
          <div>
            <div className="erp-modal-body">
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                    {statusModalProject.project_name}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                    {statusModalProject.project_number} • Customer: {statusModalProject.customer?.name || 'Unassigned'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>Current:</span>
                  <StatusBadge status={statusModalProject.status} />
                </div>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Project Status (Sales Stage) *</label>
                <select
                  className="erp-select"
                  value={statusModalValue}
                  onChange={e => setStatusModalValue(e.target.value as ProjectStatus)}
                >
                  <option value="Draft">Draft</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              {statusModalValue === 'Closed Won' && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--erp-radius)',
                    color: '#065f46',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Marking as <strong>Closed Won</strong> will automatically hand over this project to the <strong>Projects</strong> execution board.
                  </span>
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
