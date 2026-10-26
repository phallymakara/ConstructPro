import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Clock,
  Save,
  User,
  FileText,
  Plus,
  Eye,
  Trash2,
  Lock,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import type { Project, Customer, ProjectStatus } from '../../models/types';
import { calculateProjectDuration } from '../../controllers/useSalesController';
import { Modal } from '../components/Modal';

interface ProjectDoc {
  id: number;
  name: string;
  document_type?: string;
  uploaded_by?: string;
  category?: string;
  file_name?: string;
  uploaded_at: string;
  is_default?: boolean;
}

const PROJECT_TYPE_OPTIONS = [
  'Window & Door Installation',
  'Curtain Wall Glazing',
  'Custom Fabrication',
];

const SALES_STATUS_OPTIONS: ProjectStatus[] = [
  'Draft',
  'In Progress',
  'Closed Won',
  'Closed Lost',
];

const CONTACT_METHOD_OPTIONS = ['Phone', 'Telegram', 'Email', 'In-Person'];

const formatDateForInput = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const SaleDetailView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = Number(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Two tabs: Customer Info & Document
  const [activeTab, setActiveTab] = useState<'customer_info' | 'document'>('customer_info');

  // Document management state
  const [projectDocuments, setProjectDocuments] = useState<ProjectDoc[]>([]);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState<boolean>(false);
  const [selectedDocForView, setSelectedDocForView] = useState<ProjectDoc | null>(null);
  const [newDoc, setNewDoc] = useState({
    name: '',
    document_type: 'Quotation',
    file_name: '',
  });

  const loadDocuments = useCallback(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`project_documents_${projectId}`);
      if (saved) {
        const parsed: ProjectDoc[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Exclude default placeholder documents
          const userOnly = parsed.filter(
            d => !d.is_default && d.uploaded_by !== 'Default' && d.uploaded_at !== 'Default' && d.id !== 1 && d.id !== 2
          );
          setProjectDocuments(userOnly);
          return;
        }
      }
    } catch {}

    setProjectDocuments([]);
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;

    const doc: ProjectDoc = {
      id: Date.now(),
      name: newDoc.name.trim(),
      document_type: newDoc.document_type,
      uploaded_by: formData.sales_person || 'Sales Representative',
      file_name: newDoc.file_name || `${newDoc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      uploaded_at: new Date().toISOString().split('T')[0],
    };

    const updated = [doc, ...projectDocuments];
    setProjectDocuments(updated);
    try {
      localStorage.setItem(`project_documents_${projectId}`, JSON.stringify(updated));
    } catch {}

    setNewDoc({ name: '', document_type: 'Quotation', file_name: '' });
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteDoc = (docId: number) => {
    const updated = projectDocuments.filter(d => d.id !== docId);
    setProjectDocuments(updated);
    try {
      localStorage.setItem(`project_documents_${projectId}`, JSON.stringify(updated));
    } catch {}
  };

  const [formData, setFormData] = useState({
    project_name: '',
    project_number: '',
    customer_id: null as number | null,
    customer_name: '',
    project_type: 'Window & Door Installation',
    status: 'Draft' as ProjectStatus,
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
  });

  const loadData = useCallback(async () => {
    if (!projectId || isNaN(projectId)) {
      setPageError('Invalid project identifier.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);
    try {
      const [proj, custData] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<Customer[]>('/customers/'),
      ]);

      setProject(proj);
      setCustomers(custData);

      // Normalize status to sales stages: Draft, In Progress, Closed Won, or Closed Lost
      let initialStatus: ProjectStatus = 'Draft';
      if (proj.source === 'sales_won' || proj.status === 'Closed Won' || proj.status === 'Incoming Project' || proj.status === 'Accepted' || proj.status === 'Completed') {
        initialStatus = 'Closed Won';
      } else if (proj.status === 'In Progress' || (proj.status as string) === 'Inprogress') {
        initialStatus = 'In Progress';
      } else if (proj.status === 'Closed Lost') {
        initialStatus = 'Closed Lost';
      } else {
        initialStatus = 'Draft';
      }

      setFormData({
        project_name: proj.project_name || '',
        project_number: proj.project_number || '',
        customer_id: proj.customer_id || null,
        customer_name: proj.customer?.name || '',
        project_type: proj.project_type || 'Window & Door Installation',
        status: initialStatus,
        location: proj.location || '',
        sales_person: proj.sales_person || '',
        contact_person: proj.customer_representative || proj.customer?.contact_person || '',
        customer_address: proj.customer?.address || '',
        customer_phone: proj.customer?.phone || '',
        customer_email: proj.customer?.email || '',
        preferred_contact_method: proj.preferred_contact_method || proj.customer?.preferred_contact_method || 'Phone',
        start_date: formatDateForInput(proj.start_date),
        deadline_date: formatDateForInput(proj.deadline_date),
        actual_start_date: formatDateForInput(proj.actual_start_date),
        actual_end_date: formatDateForInput(proj.actual_end_date),
        notes: proj.notes || '',
      });
    } catch (err: any) {
      setPageError(err.message || 'Failed to load project details.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAlreadyClosedWon =
    project?.source === 'sales_won' ||
    project?.status === 'Closed Won' ||
    project?.status === 'Incoming Project' ||
    project?.status === 'Accepted' ||
    project?.status === 'Completed';

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Project Name is always required
    if (!formData.project_name.trim()) {
      errors.project_name = 'Project Name is required.';
    }

    // When status is not Draft, enforce full requirements
    if (formData.status !== 'Draft') {
      if (!formData.customer_name.trim()) {
        errors.customer = 'Customer name is required.';
      }
      if (!formData.deadline_date) {
        errors.deadline_date = 'Est End Date is required.';
      }
      if (!formData.sales_person.trim()) {
        errors.sales_person = 'Sales Person is required.';
      }
      if (!formData.location.trim()) {
        errors.location = 'Site Location is required.';
      }
      if (!formData.contact_person.trim()) {
        errors.contact_person = 'Contact Person is required.';
      }
      if (!formData.customer_phone.trim()) {
        errors.customer_phone = 'Telephone is required.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (isAlreadyClosedWon && formData.status !== 'Closed Won') {
      setFormErrors(prev => ({ ...prev, status: 'Status cannot be changed once marked as Closed Won.' }));
      return;
    }

    setIsSaving(true);
    setPageError(null);

    try {
      let resolvedCustomerId = formData.customer_id;

      if (formData.customer_name.trim()) {
        const found = customers.find(
          c => c.name.toLowerCase() === formData.customer_name.trim().toLowerCase()
        );
        if (found) {
          resolvedCustomerId = found.id;
          try {
            await api.put<Customer>(`/customers/${found.id}`, {
              name: formData.customer_name.trim(),
              contact_person: formData.contact_person || '',
              phone: formData.customer_phone || '',
              email: formData.customer_email || '',
              address: formData.customer_address || '',
              preferred_contact_method: formData.preferred_contact_method || 'Phone',
            });
          } catch (syncErr: any) {
            console.warn('Could not update customer info:', syncErr);
          }
        } else {
          try {
            const newCust = await api.post<Customer>('/customers/', {
              name: formData.customer_name.trim(),
              contact_person: formData.contact_person || '',
              phone: formData.customer_phone || '',
              email: formData.customer_email || '',
              address: formData.customer_address || '',
              preferred_contact_method: formData.preferred_contact_method || 'Phone',
              company: '',
              notes: 'Created from Sales Portal',
            });
            resolvedCustomerId = newCust.id;
            setCustomers(prev => [...prev, newCust]);
          } catch (custErr: any) {
            console.warn('Could not auto-create customer:', custErr);
          }
        }
      }

      const statusToSend = formData.status === 'Closed Won' ? 'Incoming Project' : formData.status;
      const sourceToSend = formData.status === 'Closed Won' ? 'sales_won' : (project?.source === 'sales_won' ? 'sales_won' : 'sales');

      const payload = {
        project_name: formData.project_name.trim(),
        customer_id: resolvedCustomerId || undefined,
        project_type: formData.project_type,
        status: statusToSend,
        source: sourceToSend,
        location: formData.location || '',
        sales_person: formData.sales_person || '',
        customer_representative: formData.contact_person || '',
        preferred_contact_method: formData.preferred_contact_method,
        start_date: formData.start_date || undefined,
        deadline_date: formData.deadline_date || undefined,
        actual_start_date: formData.actual_start_date || undefined,
        actual_end_date: formData.actual_end_date || undefined,
        notes: formData.notes || '',
      };

      const updated = await api.put<Project>(`/projects/${projectId}`, payload);
      setProject(updated);

      if (formData.status === 'Closed Won') {
        navigate({ to: '/projects' });
        return;
      }
    } catch (err: any) {
      setPageError(err.message || 'Failed to save project updates.');
    } finally {
      setIsSaving(false);
    }
  };


  const liveDuration = calculateProjectDuration(formData.start_date, formData.deadline_date);

  if (isLoading) {
    return (
      <div className="erp-content" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
        Loading project information...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="erp-content" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--erp-text-muted)' }}>Project not found.</p>
        <button
          onClick={() => navigate({ to: '/sale' })}
          className="erp-btn erp-btn-secondary"
          style={{ marginTop: '12px' }}
        >
          <ArrowLeft size={14} />
          <span>Return to Sales</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="erp-content"
      style={{
        animation: 'erpFadeIn 0.2s ease-out',
        paddingTop: '16px',
        paddingBottom: '20px',
        overflow: 'hidden',
        minHeight: 0,
        height: '100%',
        flex: 1,
        gap: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Direct Editable Page Form in Single Unified Container */}
      <form onSubmit={handleSave} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
        <div
          style={{
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-card)',
            backgroundColor: 'var(--erp-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
            height: '100%',
          }}
        >
          {/* Header Action Row: Sales Portal, Underline Tabs & Primary Actions */}
          <div
            style={{
              padding: '0 18px',
              borderBottom: '1px solid var(--erp-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--erp-surface)',
              minHeight: '48px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate({ to: '/sale' })}
                className="erp-btn erp-btn-secondary erp-btn-sm"
                style={{ height: '30px', padding: '0 10px', fontSize: '12.5px', gap: '6px' }}
                title="Back to Sales Portal"
              >
                <ArrowLeft size={13} />
                <span>Sales Portal</span>
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--erp-border)', margin: '0 2px' }} />

              {/* Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className={`erp-underline-tab ${activeTab === 'customer_info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('customer_info')}
                  style={{
                    height: '48px',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                  }}
                >
                  <User size={14} />
                  <span>Customer Info</span>
                </button>

                <button
                  type="button"
                  className={`erp-underline-tab ${activeTab === 'document' ? 'active' : ''}`}
                  onClick={() => setActiveTab('document')}
                  style={{
                    height: '48px',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                  }}
                >
                  <FileText size={14} />
                  <span>Document</span>
                  {projectDocuments.length > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: activeTab === 'document' ? 'var(--erp-primary)' : 'var(--erp-surface-hover)',
                        color: activeTab === 'document' ? '#ffffff' : 'var(--erp-text-muted)',
                        border: '1px solid var(--erp-border)',
                        fontWeight: 600,
                      }}
                    >
                      {projectDocuments.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
              {activeTab === 'customer_info' ? (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="erp-btn erp-btn-primary erp-btn-sm"
                  style={{ height: '32px', gap: '6px' }}
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(true)}
                  className="erp-btn erp-btn-primary erp-btn-sm"
                  style={{ height: '32px', gap: '6px' }}
                >
                  <Plus size={14} />
                  <span>Upload Document</span>
                </button>
              )}
            </div>
          </div>

          {/* Page Error (plain text without outer card container) */}
          {pageError && (
            <div style={{ padding: '6px 20px 0 20px', color: '#b91c1c', fontSize: '12.5px' }}>
              {pageError}
            </div>
          )}

          {/* TAB 1: CUSTOMER INFO */}
          {activeTab === 'customer_info' && (
            <div
              className="erp-tab-content"
              style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
              }}
            >
              {/* Section 1: General Information */}
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                  General Information
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {/* Project Name */}
                <div>
                  <label className="erp-label">Project Name *</label>
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={formData.project_name}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, project_name: e.target.value }));
                      if (formErrors.project_name) setFormErrors(prev => ({ ...prev, project_name: '' }));
                    }}
                    className={`erp-input ${formErrors.project_name ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.project_name && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.project_name}
                    </span>
                  )}
                </div>

                {/* Project Number (Read-only) */}
                <div>
                  <label className="erp-label">Project Number / ID</label>
                  <input
                    type="text"
                    value={formData.project_number}
                    readOnly
                    className="erp-input"
                    style={{ width: '100%', backgroundColor: 'var(--erp-surface-hover)', color: 'var(--erp-text-muted)' }}
                  />
                </div>

                {/* Customer Manual Input First */}
                <div>
                  <label className="erp-label">Customer *</label>
                  <input
                    type="text"
                    list="customer-suggestions"
                    placeholder="Customer Name"
                    value={formData.customer_name}
                    onChange={e => {
                      const val = e.target.value;
                      const matched = customers.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
                      setFormData(prev => ({
                        ...prev,
                        customer_name: val,
                        customer_id: matched ? matched.id : null,
                        contact_person: matched ? (matched.contact_person || prev.contact_person) : prev.contact_person,
                        customer_address: matched ? (matched.address || prev.customer_address) : prev.customer_address,
                        customer_phone: matched ? (matched.phone || prev.customer_phone) : prev.customer_phone,
                        customer_email: matched ? (matched.email || prev.customer_email) : prev.customer_email,
                        preferred_contact_method: matched ? (matched.preferred_contact_method || prev.preferred_contact_method || 'Phone') : prev.preferred_contact_method,
                      }));
                      if (formErrors.customer) {
                        setFormErrors(prev => ({ ...prev, customer: '' }));
                      }
                    }}
                    className={`erp-input ${formErrors.customer ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  <datalist id="customer-suggestions">
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.phone ? `${c.name} (${c.phone})` : c.name}
                      </option>
                    ))}
                  </datalist>
                  {formErrors.customer && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.customer}
                    </span>
                  )}
                </div>

                {/* Project Type */}
                <div>
                  <label className="erp-label">Project Type</label>
                  <select
                    value={formData.project_type}
                    onChange={e => setFormData(prev => ({ ...prev, project_type: e.target.value }))}
                    className="erp-select"
                    style={{ width: '100%' }}
                  >
                    {PROJECT_TYPE_OPTIONS.map(pt => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                {/* Sales Status: Draft, Closed Won, Closed Lost */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="erp-label" style={{ marginBottom: 0 }}>Status</label>
                    {isAlreadyClosedWon && (
                      <span style={{ fontSize: '11px', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <Lock size={11} /> Locked
                      </span>
                    )}
                  </div>
                  <select
                    value={formData.status}
                    disabled={isAlreadyClosedWon}
                    onChange={async e => {
                      if (isAlreadyClosedWon) {
                        setFormErrors(prev => ({ ...prev, status: 'Status cannot be changed once marked as Closed Won.' }));
                        return;
                      }

                      const newStatus = e.target.value as ProjectStatus;
                      setFormData(prev => ({ ...prev, status: newStatus }));
                      if (formErrors.status) setFormErrors(prev => ({ ...prev, status: '' }));

                      if (newStatus === 'Closed Won') {
                        const errors: Record<string, string> = {};
                        if (!formData.project_name.trim()) errors.project_name = 'Project Name is required.';
                        if (!formData.customer_name.trim()) errors.customer = 'Customer name is required.';
                        if (!formData.deadline_date) errors.deadline_date = 'Est End Date is required.';
                        if (!formData.sales_person.trim()) errors.sales_person = 'Sales Person is required.';
                        if (!formData.location.trim()) errors.location = 'Site Location is required.';
                        if (!formData.contact_person.trim()) errors.contact_person = 'Contact Person is required.';
                        if (!formData.customer_phone.trim()) errors.customer_phone = 'Telephone is required.';

                        if (Object.keys(errors).length > 0) {
                          setFormErrors(errors);
                          setFormData(prev => ({ ...prev, status: (project?.status as ProjectStatus) || 'Draft' }));
                          return;
                        }

                        setIsSaving(true);
                        setPageError(null);
                        try {
                          let resolvedCustomerId = formData.customer_id;
                          if (formData.customer_name.trim()) {
                            const found = customers.find(c => c.name.toLowerCase() === formData.customer_name.trim().toLowerCase());
                            if (found) resolvedCustomerId = found.id;
                          }

                          await api.put<Project>(`/projects/${projectId}`, {
                            project_name: formData.project_name.trim(),
                            customer_id: resolvedCustomerId || undefined,
                            project_type: formData.project_type,
                            status: 'Incoming Project',
                            source: 'sales_won',
                            location: formData.location || '',
                            sales_person: formData.sales_person || '',
                            customer_representative: formData.contact_person || '',
                            preferred_contact_method: formData.preferred_contact_method,
                            start_date: formData.start_date || undefined,
                            deadline_date: formData.deadline_date || undefined,
                            notes: formData.notes || '',
                          });

                          navigate({ to: '/projects' });
                        } catch (err: any) {
                          setPageError(err.message || 'Failed to update project status.');
                        } finally {
                          setIsSaving(false);
                        }
                      }
                    }}
                    className={`erp-select ${formErrors.status ? 'erp-input-error' : ''}`}
                    style={{
                      width: '100%',
                      fontWeight: 500,
                      cursor: isAlreadyClosedWon ? 'not-allowed' : 'default',
                      backgroundColor: isAlreadyClosedWon ? 'var(--erp-surface-hover)' : 'inherit',
                      color: isAlreadyClosedWon ? 'var(--erp-text-muted)' : 'inherit',
                    }}
                  >
                    {SALES_STATUS_OPTIONS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  {formErrors.status && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '4px', display: 'block' }}>
                      {formErrors.status}
                    </span>
                  )}
                  {isAlreadyClosedWon && !formErrors.status && (
                    <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginTop: '4px', display: 'block' }}>
                      Status cannot be changed once marked as Closed Won.
                    </span>
                  )}
                </div>

                {/* Sales Person */}
                <div>
                  <label className="erp-label">Sales Person *</label>
                  <input
                    type="text"
                    placeholder="Salesperson Name"
                    value={formData.sales_person}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, sales_person: e.target.value }));
                      if (formErrors.sales_person) setFormErrors(prev => ({ ...prev, sales_person: '' }));
                    }}
                    className={`erp-input ${formErrors.sales_person ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.sales_person && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.sales_person}
                    </span>
                  )}
                </div>

                {/* Site Location */}
                <div>
                  <label className="erp-label">Site Location *</label>
                  <input
                    type="text"
                    placeholder="Site Location"
                    value={formData.location}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, location: e.target.value }));
                      if (formErrors.location) setFormErrors(prev => ({ ...prev, location: '' }));
                    }}
                    className={`erp-input ${formErrors.location ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.location && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Section 2: Customer Info */}
              <div
                style={{
                  marginTop: '24px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                  Customer Info
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {/* Contact Person */}
                <div>
                  <label className="erp-label">Contact Person *</label>
                  <input
                    type="text"
                    placeholder="Contact Person Name"
                    value={formData.contact_person}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, contact_person: e.target.value }));
                      if (formErrors.contact_person) setFormErrors(prev => ({ ...prev, contact_person: '' }));
                    }}
                    className={`erp-input ${formErrors.contact_person ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.contact_person && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.contact_person}
                    </span>
                  )}
                </div>

                {/* Telephone */}
                <div>
                  <label className="erp-label">Telephone *</label>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={formData.customer_phone}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, customer_phone: e.target.value }));
                      if (formErrors.customer_phone) setFormErrors(prev => ({ ...prev, customer_phone: '' }));
                    }}
                    className={`erp-input ${formErrors.customer_phone ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.customer_phone && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.customer_phone}
                    </span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="erp-label">Email</label>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={formData.customer_email}
                    onChange={e => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="erp-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Preferred Contact Method */}
                <div>
                  <label className="erp-label">Preferred Contact Method</label>
                  <select
                    value={formData.preferred_contact_method}
                    onChange={e => setFormData(prev => ({ ...prev, preferred_contact_method: e.target.value }))}
                    className="erp-select"
                    style={{ width: '100%' }}
                  >
                    {CONTACT_METHOD_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="erp-label">Customer Address</label>
                  <input
                    type="text"
                    placeholder="Delivery or Billing Address"
                    value={formData.customer_address}
                    onChange={e => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                    className="erp-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Section 3: Schedule & Duration */}
              <div
                style={{
                  marginTop: '24px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                  Schedule & Duration
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                {/* Start Date */}
                <div>
                  <label className="erp-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="erp-input"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Est End Date */}
                <div>
                  <label className="erp-label">Est End Date *</label>
                  <input
                    type="date"
                    value={formData.deadline_date}
                    onChange={e => {
                      setFormData(prev => ({ ...prev, deadline_date: e.target.value }));
                      if (formErrors.deadline_date) setFormErrors(prev => ({ ...prev, deadline_date: '' }));
                    }}
                    className={`erp-input ${formErrors.deadline_date ? 'erp-input-error' : ''}`}
                    style={{ width: '100%' }}
                  />
                  {formErrors.deadline_date && (
                    <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                      {formErrors.deadline_date}
                    </span>
                  )}
                </div>

                {/* Duration Live Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span className="erp-label">Calculated Duration</span>
                  <div
                    style={{
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      backgroundColor: 'var(--erp-surface-hover)',
                      border: '1px solid var(--erp-border)',
                      borderRadius: 'var(--erp-radius-input)',
                      fontWeight: 600,
                      color: 'var(--erp-primary)',
                      fontSize: '13.5px',
                    }}
                  >
                    <Clock size={14} style={{ marginRight: '6px' }} />
                    {liveDuration}
                  </div>
                </div>
              </div>

              {/* Section 4: Notes / Remarks */}
              <div
                style={{
                  marginTop: '24px',
                }}
              >
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                    Project Notes & Requirements
                  </span>
                </div>
                <textarea
                  placeholder="Project Notes and Requirements"
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="erp-input"
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENT */}
          {activeTab === 'document' && (
            <div className="erp-tab-content" style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <table
                  className="erp-table"
                  style={{
                    width: '100%',
                    height: projectDocuments.length === 0 ? '100%' : 'auto',
                    flex: projectDocuments.length === 0 ? 1 : 'none',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Document Name</th>
                      <th style={{ width: '18%' }}>Type</th>
                      <th style={{ width: '18%' }}>Uploaded By</th>
                      <th style={{ width: '15%' }}>Date</th>
                      <th style={{ textAlign: 'right', width: '14%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody style={projectDocuments.length === 0 ? { height: '100%' } : undefined}>
                    {projectDocuments.length === 0 ? (
                      <tr style={{ height: '100%' }}>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: 'center',
                            padding: '60px 16px',
                            color: 'var(--erp-text-muted)',
                            fontSize: '13px',
                            height: '100%',
                            verticalAlign: 'middle',
                          }}
                        >
                          No documents found.
                        </td>
                      </tr>
                    ) : (
                      projectDocuments.map(doc => (
                        <tr key={doc.id}>
                          <td>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                              onClick={() => setSelectedDocForView(doc)}
                              title={`View ${doc.name}`}
                            >
                              <FileText size={15} style={{ color: 'var(--erp-primary)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 500 }}>{doc.name}</span>
                              {doc.file_name && (
                                <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                                  ({doc.file_name})
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 500,
                                backgroundColor: 'var(--erp-surface-hover)',
                                border: '1px solid var(--erp-border)',
                                color: 'var(--erp-text-main)',
                              }}
                            >
                              {doc.document_type || 'General'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--erp-text-muted)', fontSize: '13px' }}>
                            {doc.uploaded_by || 'Sales Rep'}
                          </td>
                          <td style={{ color: 'var(--erp-text-muted)', fontSize: '13px' }}>
                            {doc.uploaded_at}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ height: '28px', padding: '0 8px', fontSize: '12px', gap: '4px' }}
                                onClick={() => setSelectedDocForView(doc)}
                                title="View details"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ height: '28px', padding: '0 8px', fontSize: '12px', color: '#b91c1c' }}
                                onClick={() => handleDeleteDoc(doc.id)}
                                title="Remove document"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Project Document"
        maxWidth="480px"
      >
        <form onSubmit={handleUploadDocSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Document Name *</label>
              <input
                type="text"
                required
                placeholder="Document Title or Reference"
                className="erp-input"
                value={newDoc.name}
                onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Document Type</label>
              <select
                className="erp-select"
                value={newDoc.document_type}
                onChange={e => setNewDoc({ ...newDoc, document_type: e.target.value })}
              >
                <option value="Quotation">Quotation</option>
                <option value="Contract">Contract</option>
                <option value="Drawing">Drawing</option>
                <option value="Specification">Specification</option>
                <option value="Invoice">Invoice</option>
                <option value="Photo">Photo</option>
                <option value="Report">Report</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Attach File</label>
              <input
                type="file"
                className="erp-input"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setNewDoc(prev => ({
                      ...prev,
                      file_name: f.name,
                      name: prev.name || f.name.replace(/\.[^/.]+$/, ''),
                    }));
                  }
                }}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsUploadDocModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={!newDoc.name.trim()}
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>

      {/* View Document Modal */}
      <Modal
        isOpen={!!selectedDocForView}
        onClose={() => setSelectedDocForView(null)}
        title={selectedDocForView?.name || 'Document Details'}
        maxWidth="480px"
      >
        {selectedDocForView && (
          <div>
            <div className="erp-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    backgroundColor: 'var(--erp-surface-hover)',
                    borderRadius: 'var(--erp-radius-card)',
                    border: '1px solid var(--erp-border)',
                  }}
                >
                  <FileText size={26} style={{ color: 'var(--erp-primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--erp-text-main)', fontSize: '14px' }}>
                      {selectedDocForView.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                      {selectedDocForView.file_name || 'project_file.pdf'}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--erp-surface)',
                      border: '1px solid var(--erp-border)',
                      color: 'var(--erp-text-main)',
                    }}
                  >
                    {selectedDocForView.document_type || 'General'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--erp-text-muted)', display: 'block', fontSize: '12px' }}>Uploaded By:</span>
                    <span style={{ fontWeight: 500 }}>{selectedDocForView.uploaded_by || 'Sales Rep'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--erp-text-muted)', display: 'block', fontSize: '12px' }}>Date:</span>
                    <span style={{ fontWeight: 500 }}>{selectedDocForView.uploaded_at}</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    border: '1px dashed var(--erp-border)',
                    borderRadius: 'var(--erp-radius-card)',
                    textAlign: 'center',
                    color: 'var(--erp-text-muted)',
                    fontSize: '12.5px',
                  }}
                >
                  Document reference is recorded and synchronized with this sales project.
                </div>
              </div>
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setSelectedDocForView(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
};
