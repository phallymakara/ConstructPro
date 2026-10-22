import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import type { Project, Customer, ProjectStatus } from '../../models/types';
import { calculateProjectDuration } from '../../controllers/useSalesController';

const PROJECT_TYPE_OPTIONS = [
  'Window & Door Installation',
  'Curtain Wall Glazing',
  'Aluminium Partition',
  'Sliding & Folding Door',
  'Shopfront & Facade',
  'Custom Fabrication',
];

const SALES_STATUS_OPTIONS: ProjectStatus[] = [
  'Draft',
  'In Progress',
  'Closed Won',
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
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    project_name: '',
    project_number: '',
    customer_id: null as number | null,
    new_customer_name: '',
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
      setNotification({ text: 'Invalid project identifier.', type: 'error' });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotification(null);
    try {
      const [proj, custData] = await Promise.all([
        api.get<Project>(`/projects/${projectId}`),
        api.get<Customer[]>('/customers/'),
      ]);

      setProject(proj);
      setCustomers(custData);
      setIsNewCustomerMode(false);

      // Normalize status to sales trio: Draft, In Progress, or Closed Won
      let initialStatus: ProjectStatus = 'Draft';
      if (proj.status === 'Closed Won' || proj.status === 'Completed' || proj.status === 'Accepted') {
        initialStatus = 'Closed Won';
      } else if (proj.status === 'In Progress' || proj.status === 'Starting') {
        initialStatus = 'In Progress';
      } else {
        initialStatus = (['Draft', 'In Progress', 'Closed Won'].includes(proj.status)
          ? proj.status
          : 'Draft') as ProjectStatus;
      }

      setFormData({
        project_name: proj.project_name || '',
        project_number: proj.project_number || '',
        customer_id: proj.customer_id || null,
        new_customer_name: '',
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
      setNotification({ text: err.message || 'Failed to load project details.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCustomerSelect = (val: string) => {
    if (val === 'new') {
      setIsNewCustomerMode(true);
      setFormData(prev => ({
        ...prev,
        customer_id: null,
        new_customer_name: '',
        contact_person: '',
        customer_address: '',
        customer_phone: '',
        customer_email: '',
      }));
      return;
    }

    setIsNewCustomerMode(false);
    const id = parseInt(val, 10);
    const found = customers.find(c => c.id === id);
    if (found) {
      setFormData(prev => ({
        ...prev,
        customer_id: found.id,
        new_customer_name: '',
        contact_person: found.contact_person || '',
        customer_address: found.address || '',
        customer_phone: found.phone || '',
        customer_email: found.email || '',
        preferred_contact_method: found.preferred_contact_method || 'Phone',
      }));
    } else {
      setFormData(prev => ({ ...prev, customer_id: null }));
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.project_name.trim()) {
      errors.project_name = 'Project Name is required.';
    }
    if (!formData.customer_id && !formData.new_customer_name.trim()) {
      errors.customer = 'Please select or add a customer.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setNotification(null);

    try {
      let resolvedCustomerId = formData.customer_id;

      if (!resolvedCustomerId && formData.new_customer_name.trim()) {
        try {
          const newCust = await api.post<Customer>('/customers/', {
            name: formData.new_customer_name.trim(),
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

      const payload = {
        project_name: formData.project_name.trim(),
        customer_id: resolvedCustomerId || undefined,
        project_type: formData.project_type,
        status: formData.status,
        source: 'sales',
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
      setNotification({ text: 'Project information updated successfully.', type: 'success' });
    } catch (err: any) {
      setNotification({ text: err.message || 'Failed to save project updates.', type: 'error' });
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
        paddingBottom: '48px',
        overflowY: 'auto',
        minHeight: 0,
        height: '100%',
      }}
    >
      {/* Top Breadcrumb & Action Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--erp-bg)',
          paddingTop: '4px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--erp-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate({ to: '/sale' })}
            className="erp-btn erp-btn-secondary erp-btn-sm"
            style={{ height: '34px', gap: '6px' }}
            title="Back to Sales Portal"
          >
            <ArrowLeft size={14} />
            <span>Sales Portal</span>
          </button>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="erp-btn erp-btn-primary"
            style={{ height: '34px', gap: '6px' }}
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: notification.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${notification.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: notification.type === 'success' ? '#15803d' : '#b91c1c',
            borderRadius: 'var(--erp-radius)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: notification.type === 'success' ? '#15803d' : '#b91c1c',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Direct Editable Page Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Section 1: General Information */}
        <fieldset
          style={{
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-card)',
            padding: '16px 20px',
            backgroundColor: 'var(--erp-surface)',
          }}
        >
          <legend
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--erp-primary)',
              padding: '0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            General Information
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginTop: '8px',
            }}
          >
            {/* Project Name */}
            <div>
              <label className="erp-label">Project Name *</label>
              <input
                type="text"
                placeholder="Project title"
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

            {/* Customer Selection */}
            <div>
              <label className="erp-label">Customer *</label>
              <select
                value={isNewCustomerMode ? 'new' : (formData.customer_id || '')}
                onChange={e => handleCustomerSelect(e.target.value)}
                className="erp-select"
                style={{ width: '100%' }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
                <option value="new">+ Add New Customer</option>
              </select>
              {formErrors.customer && (
                <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                  {formErrors.customer}
                </span>
              )}
            </div>

            {/* If New Customer, show Name Field */}
            {isNewCustomerMode && (
              <div>
                <label className="erp-label">New Customer Name *</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={formData.new_customer_name}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, new_customer_name: e.target.value }));
                    if (formErrors.customer) setFormErrors(prev => ({ ...prev, customer: '' }));
                  }}
                  className="erp-input"
                  style={{ width: '100%' }}
                />
              </div>
            )}

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

            {/* Sales Status: Draft, In Progress, Completed */}
            <div>
              <label className="erp-label">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
                className="erp-select"
                style={{ width: '100%', fontWeight: 500 }}
              >
                {SALES_STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Sales Person */}
            <div>
              <label className="erp-label">Sales Person / Representative</label>
              <input
                type="text"
                placeholder="Salesperson name"
                value={formData.sales_person}
                onChange={e => setFormData(prev => ({ ...prev, sales_person: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Site Location */}
            <div>
              <label className="erp-label">Project Site Location</label>
              <input
                type="text"
                placeholder="e.g. Phnom Penh, Street / District"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </fieldset>

        {/* Section 2: Customer Contact Info */}
        <fieldset
          style={{
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-card)',
            padding: '16px 20px',
            backgroundColor: 'var(--erp-surface)',
          }}
        >
          <legend
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--erp-primary)',
              padding: '0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Customer Contact Info
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginTop: '8px',
            }}
          >
            {/* Contact Person */}
            <div>
              <label className="erp-label">Contact Person</label>
              <input
                type="text"
                placeholder="Representative name"
                value={formData.contact_person}
                onChange={e => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Telephone */}
            <div>
              <label className="erp-label">Telephone</label>
              <input
                type="text"
                placeholder="Phone number"
                value={formData.customer_phone}
                onChange={e => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="erp-label">Email</label>
              <input
                type="email"
                placeholder="email@example.com"
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
                placeholder="Office or delivery address"
                value={formData.customer_address}
                onChange={e => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </fieldset>

        {/* Section 3: Schedule & Timeline */}
        <fieldset
          style={{
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-card)',
            padding: '16px 20px',
            backgroundColor: 'var(--erp-surface)',
          }}
        >
          <legend
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--erp-primary)',
              padding: '0 8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Schedule & Duration
          </legend>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginTop: '8px',
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

            {/* Estimated End Date */}
            <div>
              <label className="erp-label">Estimated End Date</label>
              <input
                type="date"
                value={formData.deadline_date}
                onChange={e => setFormData(prev => ({ ...prev, deadline_date: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Actual Start Date */}
            <div>
              <label className="erp-label">Actual Start Date</label>
              <input
                type="date"
                value={formData.actual_start_date}
                onChange={e => setFormData(prev => ({ ...prev, actual_start_date: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Actual End Date */}
            <div>
              <label className="erp-label">Actual End Date</label>
              <input
                type="date"
                value={formData.actual_end_date}
                onChange={e => setFormData(prev => ({ ...prev, actual_end_date: e.target.value }))}
                className="erp-input"
                style={{ width: '100%' }}
              />
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
        </fieldset>

        {/* Section 4: Notes / Remarks */}
        <div
          style={{
            border: '1px solid var(--erp-border)',
            borderRadius: 'var(--erp-radius-card)',
            padding: '16px 20px',
            backgroundColor: 'var(--erp-surface)',
          }}
        >
          <label className="erp-label" style={{ fontWeight: 600 }}>Project Notes & Requirements</label>
          <textarea
            placeholder="Special customer specifications, requirements, or meeting notes..."
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="erp-input"
            rows={3}
            style={{ width: '100%', resize: 'vertical', marginTop: '6px' }}
          />
        </div>
      </form>
    </div>
  );
};
