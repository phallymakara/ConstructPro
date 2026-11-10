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
  Printer,
  CheckCircle2,
  Calculator,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import type { Project, Customer, ProjectStatus, Quotation, QuotationFormData, PaymentTerm } from '../../models/types';
import { calculateProjectDuration } from '../../controllers/useSalesController';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { exportQuotationToPDF } from '../../utils/exportTemplate';

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

  // Three tabs: Customer Info, Quotation & Document
  const [activeTab, setActiveTab] = useState<'customer_info' | 'quotation' | 'document'>('customer_info');

  // Quotation state
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState<boolean>(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState<boolean>(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [isReleasingQuote, setIsReleasingQuote] = useState<boolean>(false);
  const [quoteForm, setQuoteForm] = useState<QuotationFormData>({
    quotation_number: '',
    customer_id: 0,
    project_id: undefined,
    status: 'Draft',
    material_cost: 0,
    labor_cost: 0,
    transport_cost: 0,
    installation_cost: 0,
    discount_amount: 0,
    tax_percent: 0,
    valid_until: '',
    notes: '',
  });
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [availablePaymentTerms, setAvailablePaymentTerms] = useState<PaymentTerm[]>([]);

  useEffect(() => {
    api.get<PaymentTerm[]>('/settings/payment-terms')
      .then(res => setAvailablePaymentTerms(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  const loadQuotation = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingQuotation(true);
    try {
      const res = await api.get<Quotation[]>(`/quotations/?project_id=${projectId}`);
      if (Array.isArray(res) && res.length > 0) {
        setQuotation(res[0]);
      } else {
        setQuotation(null);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setIsLoadingQuotation(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadQuotation();
  }, [loadQuotation]);

  const handleOpenCreateQuote = () => {
    const rawNum = project?.project_number ? project.project_number.replace(/^PRJ-/, '') : String(projectId);
    const defaultQuoteNum = `QT-${rawNum}`;
    const defaultValidDate = new Date();
    defaultValidDate.setDate(defaultValidDate.getDate() + 30);
    const validUntilStr = defaultValidDate.toISOString().split('T')[0];

    const matCost = Number(project?.material_cost) || 0;
    const labCost = Number(project?.labor_cost) || 0;
    const otherCost = Number(project?.other_expenses) || 0;

    setQuoteForm({
      quotation_number: defaultQuoteNum,
      customer_id: formData.customer_id || (project?.customer_id ?? 0),
      project_id: projectId,
      status: 'Draft',
      material_cost: matCost,
      labor_cost: labCost,
      transport_cost: otherCost,
      installation_cost: 0,
      discount_amount: 0,
      tax_percent: 0,
      valid_until: validUntilStr,
      notes: 'Standard terms: 50% deposit upon confirmation, 50% upon delivery/handover. Warranty 2 years for materials and hardware.',
    });
    setQuoteErrors({});
    setIsQuoteModalOpen(true);
  };

  const handleOpenEditQuote = () => {
    if (!quotation) return;
    setQuoteForm({
      quotation_number: quotation.quotation_number,
      customer_id: quotation.customer_id,
      project_id: quotation.project_id,
      status: quotation.status,
      material_cost: quotation.material_cost || 0,
      labor_cost: quotation.labor_cost || 0,
      transport_cost: quotation.transport_cost || 0,
      installation_cost: quotation.installation_cost || 0,
      discount_amount: quotation.discount_amount || 0,
      tax_percent: quotation.tax_percent || 0,
      valid_until: quotation.valid_until ? formatDateForInput(quotation.valid_until) : '',
      notes: quotation.notes || '',
    });
    setQuoteErrors({});
    setIsQuoteModalOpen(true);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!quoteForm.quotation_number.trim()) errs.quotation_number = 'Quotation number is required.';
    const custId = Number(quoteForm.customer_id) || formData.customer_id || (project?.customer_id ?? 0);
    if (!custId) errs.customer_id = 'A valid customer must be selected on the project.';

    if (Object.keys(errs).length > 0) {
      setQuoteErrors(errs);
      return;
    }

    try {
      const payload = {
        quotation_number: quoteForm.quotation_number.trim(),
        customer_id: custId,
        project_id: projectId,
        status: quoteForm.status || 'Draft',
        material_cost: Number(quoteForm.material_cost) || 0,
        labor_cost: Number(quoteForm.labor_cost) || 0,
        transport_cost: Number(quoteForm.transport_cost) || 0,
        installation_cost: Number(quoteForm.installation_cost) || 0,
        discount_amount: Number(quoteForm.discount_amount) || 0,
        tax_percent: Number(quoteForm.tax_percent) || 0,
        valid_until: quoteForm.valid_until ? new Date(quoteForm.valid_until).toISOString() : null,
        notes: quoteForm.notes || '',
      };

      let saved: Quotation;
      if (quotation && quotation.id) {
        saved = await api.put<Quotation>(`/quotations/${quotation.id}`, payload);
      } else {
        saved = await api.post<Quotation>('/quotations/', payload);
      }
      setQuotation(saved);
      setIsQuoteModalOpen(false);
    } catch (err: any) {
      setQuoteErrors({ form: err.message || 'Failed to save quotation.' });
    }
  };

  const handleReleaseAndPrintPDF = async () => {
    if (!quotation) return;
    setIsReleasingQuote(true);
    try {
      const custName =
        customers.find(c => c.id === formData.customer_id)?.name ||
        project?.customer?.name ||
        formData.customer_name ||
        'Client';

      if (quotation.status === 'Draft') {
        const updated = await api.put<Quotation>(`/quotations/${quotation.id}`, { status: 'Sent' });
        setQuotation(updated);
        exportQuotationToPDF(updated, custName);
      } else {
        exportQuotationToPDF(quotation, custName);
      }
    } catch (err: any) {
      setPageError(err.message || 'Failed to release quotation');
    } finally {
      setIsReleasingQuote(false);
    }
  };

  const handleApproveQuotation = async () => {
    if (!quotation) return;
    try {
      const approved = await api.post<Quotation>(`/quotations/${quotation.id}/approve`, {});
      setQuotation(approved);
      setFormData(prev => ({
        ...prev,
        status: 'Closed Won',
      }));
      if (project) {
        setProject({
          ...project,
          status: 'Closed Won',
          contract_amount: approved.total_amount,
          service_selling: approved.total_amount,
          source: 'sales_won',
        });
      }
      setIsApproveModalOpen(false);
    } catch (err: any) {
      setPageError(err.message || 'Failed to approve quotation.');
    }
  };

  // Document management state
  const [projectDocuments, setProjectDocuments] = useState<ProjectDoc[]>([]);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState<boolean>(false);
  const [selectedDocForView, setSelectedDocForView] = useState<ProjectDoc | null>(null);
  const [newDoc, setNewDoc] = useState({
    name: '',
    document_type: 'Quotation',
    file_name: '',
  });

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      const docs = await api.get<ProjectDoc[]>(`/projects/${projectId}/documents`);
      if (Array.isArray(docs)) {
        const userOnly = docs.filter(
          d => !d.is_default && d.uploaded_by !== 'Default' && d.uploaded_at !== 'Default' && d.id !== 1 && d.id !== 2
        );
        setProjectDocuments(userOnly);
        return;
      }
    } catch {
      try {
        const saved = localStorage.getItem(`project_documents_${projectId}`);
        if (saved) {
          const parsed: ProjectDoc[] = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const userOnly = parsed.filter(
              d => !d.is_default && d.uploaded_by !== 'Default' && d.uploaded_at !== 'Default' && d.id !== 1 && d.id !== 2
            );
            setProjectDocuments(userOnly);
            return;
          }
        }
      } catch { }
    }

    setProjectDocuments([]);
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name.trim() || !projectId) return;

    try {
      const payload = {
        name: newDoc.name.trim(),
        document_type: newDoc.document_type,
        uploaded_by: formData.sales_person || 'Sales Representative',
        file_name: newDoc.file_name || `${newDoc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        uploaded_at: new Date().toISOString().split('T')[0],
      };
      const created = await api.post<ProjectDoc>(`/projects/${projectId}/documents`, payload);
      const updated = [created, ...projectDocuments];
      setProjectDocuments(updated);
      try {
        localStorage.setItem(`project_documents_${projectId}`, JSON.stringify(updated));
      } catch { }
    } catch (err: any) {
      setPageError(err.message || 'Failed to save document to database');
    }

    setNewDoc({ name: '', document_type: 'Quotation', file_name: '' });
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!projectId) return;
    try {
      await api.delete(`/projects/${projectId}/documents/${docId}`);
      const updated = projectDocuments.filter(d => d.id !== docId);
      setProjectDocuments(updated);
      try {
        localStorage.setItem(`project_documents_${projectId}`, JSON.stringify(updated));
      } catch { }
    } catch (err: any) {
      setPageError(err.message || 'Failed to delete document from database');
    }
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
      if (proj.source === 'sales_won' || proj.status === 'Closed Won' || proj.status === 'Accepted' || proj.status === 'Completed') {
        initialStatus = 'Closed Won';
      } else if (proj.status === 'Closed Lost') {
        initialStatus = 'Closed Lost';
      } else if (
        proj.status === 'In Progress' ||
        (proj.status as string) === 'Inprogress' ||
        proj.status === 'Incoming Project' ||
        proj.status === 'Starting' ||
        proj.status === 'Material Preparation' ||
        proj.status === 'Production' ||
        proj.status === 'Ready for Delivery' ||
        proj.status === 'Installation'
      ) {
        initialStatus = 'In Progress';
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

      // Isolate customer record updates strictly to this project to avoid mutating other projects
      if (formData.customer_name.trim()) {
        if (project?.customer_id) {
          resolvedCustomerId = project.customer_id;
          try {
            await api.put<Customer>(`/customers/${project.customer_id}`, {
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
              notes: `Customer for project ${formData.project_name.trim()}`,
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
                  className={`erp-underline-tab ${activeTab === 'quotation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('quotation')}
                  style={{
                    height: '48px',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13.5px',
                  }}
                >
                  <Calculator size={14} />
                  <span>Quotation</span>
                  {quotation && (
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: activeTab === 'quotation' ? 'var(--erp-primary)' : 'var(--erp-surface-hover)',
                        color: activeTab === 'quotation' ? '#ffffff' : 'var(--erp-text-muted)',
                        border: '1px solid var(--erp-border)',
                        fontWeight: 600,
                      }}
                    >
                      {quotation.status}
                    </span>
                  )}
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
              ) : activeTab === 'quotation' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {quotation ? (
                    <>
                      <button
                        type="button"
                        onClick={handleReleaseAndPrintPDF}
                        disabled={isReleasingQuote}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ height: '32px', gap: '6px' }}
                        title="Print or export PDF and mark as Sent"
                      >
                        <Printer size={14} />
                        <span>{quotation.status === 'Draft' ? 'Release & Print PDF' : 'Print PDF'}</span>
                      </button>

                      {quotation.status !== 'Approved' && (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenEditQuote}
                            className="erp-btn erp-btn-secondary erp-btn-sm"
                            style={{ height: '32px', gap: '6px' }}
                          >
                            <Pencil size={14} />
                            <span>Edit Quotation</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsApproveModalOpen(true)}
                            className="erp-btn erp-btn-primary erp-btn-sm"
                            style={{ height: '32px', gap: '6px' }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve Quotation</span>
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenCreateQuote}
                      className="erp-btn erp-btn-primary erp-btn-sm"
                      style={{ height: '32px', gap: '6px' }}
                    >
                      <Plus size={14} />
                      <span>Create Quotation</span>
                    </button>
                  )}
                </div>
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

          {/* TAB 2: QUOTATION */}
          {activeTab === 'quotation' && (
            <div
              className="erp-tab-content"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                gap: '20px',
              }}
            >
              {isLoadingQuotation ? (
                <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '13px' }}>
                  Loading quotation information...
                </div>
              ) : !quotation ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <Calculator size={28} style={{ color: 'var(--erp-text-muted)', marginBottom: '12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '16px' }}>
                    No Official Quotation Released Yet
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateQuote}
                    className="erp-btn erp-btn-primary erp-btn-sm"
                    style={{ height: '34px', padding: '0 16px', gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Create Quotation</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Top Bar with Number, Status, Dates */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--erp-border)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
                          {quotation.quotation_number}
                        </span>
                        <StatusBadge status={quotation.status} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '4px', display: 'flex', gap: '14px' }}>
                        <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                        {quotation.valid_until && (
                          <span>Valid Until: {new Date(quotation.valid_until).toLocaleDateString()}</span>
                        )}
                        <span>Customer: {customers.find(c => c.id === quotation.customer_id)?.name || formData.customer_name || 'Client'}</span>
                      </div>
                    </div>

                    {quotation.status === 'Approved' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12.5px',
                          color: '#16a34a',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Quotation Approved & Deal Won</span>
                        <button
                          type="button"
                          onClick={() => navigate({ to: `/projects/${projectId}` })}
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          style={{ height: '28px', fontSize: '12px', gap: '4px', marginLeft: '6px' }}
                        >
                          <span>Go to Projects Workspace</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cost Breakdown Table */}
                  <div>
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                        Cost Breakdown & Pricing Structure
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                        Amounts in USD ($)
                      </span>
                    </div>

                    <table className="erp-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60%' }}>Cost Component</th>
                          <th style={{ width: '40%', textAlign: 'right' }}>Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Direct Material Cost</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            ${(quotation.material_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td>Labor & Workshop Assembly Cost</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            ${(quotation.labor_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td>Transportation & Delivery Logistics</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            ${(quotation.transport_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td>Site Installation</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            ${(quotation.installation_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ borderTop: '2px solid var(--erp-border)', fontWeight: 600 }}>
                          <td>Subtotal</td>
                          <td style={{ textAlign: 'right' }}>
                            ${(quotation.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {Number(quotation.discount_amount) > 0 && (
                          <tr style={{ color: '#b91c1c' }}>
                            <td>Discount</td>
                            <td style={{ textAlign: 'right' }}>
                              -${(quotation.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {Number(quotation.tax_percent) > 0 && (
                          <tr>
                            <td>VAT / Tax ({quotation.tax_percent}%)</td>
                            <td style={{ textAlign: 'right' }}>
                              +${(
                                ((quotation.subtotal - quotation.discount_amount) * (quotation.tax_percent / 100)) || 0
                              ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        <tr
                          style={{
                            borderTop: '2px solid var(--erp-border)',
                            backgroundColor: 'var(--erp-surface-hover)',
                            fontSize: '14.5px',
                            fontWeight: 700,
                          }}
                        >
                          <td style={{ color: 'var(--erp-primary)' }}>Total Contract Amount</td>
                          <td style={{ textAlign: 'right', color: 'var(--erp-primary)' }}>
                            ${(quotation.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ fontSize: '12.5px', color: '#16a34a' }}>
                          <td>Projected Profit Margin</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            ${(quotation.expected_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quotation Notes / Scope */}
                  {quotation.notes && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '6px' }}>
                        Quotation Terms, Warranty & Payment Conditions
                      </span>
                      <div
                        style={{
                          padding: '12px 14px',
                          border: '1px solid var(--erp-border)',
                          borderRadius: 'var(--erp-radius-input)',
                          backgroundColor: 'var(--erp-surface-hover)',
                          fontSize: '12.5px',
                          color: 'var(--erp-text-main)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                        }}
                      >
                        {quotation.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENT */}
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
                              <span style={{ fontWeight: 400 }}>{doc.name}</span>
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

      {/* Create / Edit Quotation Modal */}
      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title={quotation ? `Edit Quotation: ${quotation.quotation_number}` : 'Create Official Quotation'}
        maxWidth="620px"
      >
        <form onSubmit={handleQuoteSubmit}>
          <div className="erp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {quoteErrors.form && (
              <div style={{ color: '#b91c1c', fontSize: '12px' }}>
                {quoteErrors.form}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="erp-form-group">
                <label className="erp-form-label">Quotation Number *</label>
                <input
                  type="text"
                  required
                  className={`erp-input ${quoteErrors.quotation_number ? 'error' : ''}`}
                  value={quoteForm.quotation_number}
                  onChange={e => setQuoteForm(prev => ({ ...prev, quotation_number: e.target.value }))}
                />
                {quoteErrors.quotation_number && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {quoteErrors.quotation_number}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Valid Until</label>
                <input
                  type="date"
                  className="erp-input"
                  value={quoteForm.valid_until}
                  onChange={e => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '8px' }}>
                Cost Breakdown ($ USD)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="erp-form-group">
                  <label className="erp-form-label">Material Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="erp-input"
                    value={quoteForm.material_cost}
                    onChange={e => setQuoteForm(prev => ({ ...prev, material_cost: e.target.value as any }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-form-label">Labor & Assembly ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="erp-input"
                    value={quoteForm.labor_cost}
                    onChange={e => setQuoteForm(prev => ({ ...prev, labor_cost: e.target.value as any }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-form-label">Transportation ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="erp-input"
                    value={quoteForm.transport_cost}
                    onChange={e => setQuoteForm(prev => ({ ...prev, transport_cost: e.target.value as any }))}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-form-label">Installation ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="erp-input"
                    value={quoteForm.installation_cost}
                    onChange={e => setQuoteForm(prev => ({ ...prev, installation_cost: e.target.value as any }))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="erp-form-group">
                <label className="erp-form-label">Discount Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="erp-input"
                  value={quoteForm.discount_amount}
                  onChange={e => setQuoteForm(prev => ({ ...prev, discount_amount: e.target.value as any }))}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="erp-input"
                  value={quoteForm.tax_percent}
                  onChange={e => setQuoteForm(prev => ({ ...prev, tax_percent: e.target.value as any }))}
                />
              </div>
            </div>

            {/* Dynamic Live Cost Summary */}
            {(() => {
              const mat = Number(quoteForm.material_cost) || 0;
              const lab = Number(quoteForm.labor_cost) || 0;
              const trn = Number(quoteForm.transport_cost) || 0;
              const ins = Number(quoteForm.installation_cost) || 0;
              const disc = Number(quoteForm.discount_amount) || 0;
              const taxRate = Number(quoteForm.tax_percent) || 0;

              const sub = mat + lab + trn + ins;
              const afterDisc = Math.max(0, sub - disc);
              const taxAmt = afterDisc * (taxRate / 100);
              const tot = afterDisc + taxAmt;
              const direct = mat + trn;
              const profit = Math.max(0, tot - direct);

              return (
                <div
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--erp-surface-hover)',
                    border: '1px solid var(--erp-border)',
                    borderRadius: 'var(--erp-radius-input)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--erp-text-muted)' }}>Subtotal: </span>
                    <strong>${sub.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--erp-text-muted)' }}>Total Amount: </span>
                    <strong style={{ color: 'var(--erp-primary)', fontSize: '13.5px' }}>
                      ${tot.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--erp-text-muted)' }}>Est. Profit: </span>
                    <strong style={{ color: '#16a34a' }}>${profit.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })()}

            <div className="erp-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="erp-form-label" style={{ margin: 0 }}>Terms, Scope & Payment Conditions</label>
                {availablePaymentTerms.length > 0 && (
                  <select
                    className="erp-select"
                    style={{ height: '26px', fontSize: '11.5px', maxWidth: '320px', padding: '0 8px' }}
                    defaultValue=""
                    onChange={e => {
                      const selected = availablePaymentTerms.find(t => t.id === Number(e.target.value));
                      if (selected) {
                        const milestoneStr = (selected.milestones || [])
                          .map(m => `• ${m.milestone}: ${m.percent}% (${m.trigger}, Due: ${m.due})`)
                          .join('\n');
                        const termText = `${selected.name_en}${selected.name_kh ? ` (${selected.name_kh})` : ''}\n${milestoneStr}\nWarranty: 2 years standard on aluminium frames & accessories.`;
                        setQuoteForm(prev => ({ ...prev, notes: termText }));
                      }
                    }}
                  >
                    <option value="" disabled>Load from Payment Term template...</option>
                    {availablePaymentTerms.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name_en} {t.name_kh ? `(${t.name_kh})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                className="erp-input"
                rows={3}
                value={quoteForm.notes}
                onChange={e => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsQuoteModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
            >
              {quotation ? 'Save Changes' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve Quotation Confirmation Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Quotation & Win Deal"
        maxWidth="480px"
      >
        <div>
          <div className="erp-modal-body">
            <p style={{ fontSize: '13px', color: 'var(--erp-text-main)', marginBottom: '14px', lineHeight: 1.5 }}>
              Are you sure you want to approve quotation <strong>{quotation?.quotation_number}</strong>?
            </p>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--erp-surface-hover)',
                border: '1px solid var(--erp-border)',
                borderRadius: 'var(--erp-radius-input)',
                fontSize: '12.5px',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>• Deal status will be marked as <strong style={{ color: '#16a34a' }}>Closed Won</strong>.</div>
              <div>• Agreed contract value will be synced to <strong>${(quotation?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.</div>
              <div>• This project will become active in the <strong>Projects Workspace</strong> for workshop production.</div>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsApproveModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveQuotation}
              className="erp-btn erp-btn-primary"
            >
              <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
              <span>Confirm & Win Deal</span>
            </button>
          </div>
        </div>
      </Modal>


    </div>
  );
};
