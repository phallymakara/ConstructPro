import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Plus,
  Trash2,
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Pencil
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Project } from '../../models/types';

interface ProjectDoc {
  id: number;
  name: string;
  category: string;
  file_name?: string;
  uploaded_at: string;
}

interface AssignedPersonnel {
  id: string;
  name: string;
  role: string;
  scope: string;
}

interface AssignedMaterialRequirement {
  id: string | number;
  material_name: string;
  material_code?: string;
  material_unit?: string;
  required_qty: number;
  allocated_qty?: number;
  wastage_percent?: number;
  available_stock?: number;
  unit_cost?: number;
  status: string;
}

const getProjectProgress = (status: string): number => {
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

const calculateDurationDays = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '-';
  try {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return '-';
    const diffDays = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
  } catch {
    return '-';
  }
};


export const ProjectWorkflowView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = Number(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'resource' | 'document'>('summary');
  const [resourceSubTab, setResourceSubTab] = useState<'personnel' | 'materials'>('personnel');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Resource tab state: Work & Personnel
  const [isAssignPersonnelModalOpen, setIsAssignPersonnelModalOpen] = useState<boolean>(false);
  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [personnelNameInput, setPersonnelNameInput] = useState('');
  const [personnelRoleInput, setPersonnelRoleInput] = useState('Lead Engineer / Project Manager');
  const [personnelScopeInput, setPersonnelScopeInput] = useState('');
  const [personnelList, setPersonnelList] = useState<AssignedPersonnel[]>([]);

  // Resource tab state: Material Allocation (Manual Entry)
  const [isAssignMaterialModalOpen, setIsAssignMaterialModalOpen] = useState<boolean>(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | number | null>(null);
  const [materialNameInput, setMaterialNameInput] = useState<string>('');
  const [materialQtyInput, setMaterialQtyInput] = useState<string>('');
  const [materialStatusInput, setMaterialStatusInput] = useState<string>('Ready');
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});
  const [materialsList, setMaterialsList] = useState<AssignedMaterialRequirement[]>([]);

  // Document tab state
  const [projectDocuments, setProjectDocuments] = useState<ProjectDoc[]>([]);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: '', category: 'Contract', file_name: '' });

  // Payment modal state
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState<boolean>(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: '',
  });
  const [paymentFormErrors, setPaymentFormErrors] = useState<Record<string, string>>({});

  const fetchProjectData = useCallback(async () => {
    if (!projectId || isNaN(projectId)) {
      setErrorMessage('Invalid project ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const projData = await api.get<Project>(`/projects/${projectId}`);
      setProject(projData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Synchronize assigned personnel from storage or project record
  useEffect(() => {
    if (!project) return;
    try {
      const saved = localStorage.getItem(`project_personnel_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPersonnelList(parsed);
          return;
        }
      }
    } catch {}

    const list: AssignedPersonnel[] = [];
    if (project.assigned_manager && project.assigned_manager !== 'Not assigned') {
      list.push({
        id: 'manager',
        name: project.assigned_manager,
        role: 'Lead Engineer / Project Manager',
        scope: 'Project coordination, technical specifications & site liaison',
      });
    }
    if (project.architect && project.architect !== 'Not assigned') {
      list.push({
        id: 'architect',
        name: project.architect,
        role: 'Architect / Designer',
        scope: 'Architectural specifications & opening dimensions',
      });
    }
    if (project.worker && project.worker !== 'Not assigned') {
      const splitWorkers = project.worker.split(',').map(w => w.trim()).filter(Boolean);
      splitWorkers.forEach((wName, idx) => {
        list.push({
          id: `worker_${idx}_${Date.now()}`,
          name: wName,
          role: 'Workers / Installation Crew',
          scope: 'Aluminum fabrication, frame assembly, cutting & on-site glazing',
        });
      });
    }
    if (project.sales_person && project.sales_person !== 'Not assigned') {
      list.push({
        id: 'salesperson',
        name: project.sales_person,
        role: 'Salesperson',
        scope: 'Client communications & commercial representation',
      });
    }
    if (project.site_supervisor && project.site_supervisor !== 'Not assigned') {
      list.push({
        id: 'supervisor',
        name: project.site_supervisor,
        role: 'Site Supervisor',
        scope: 'Site safety inspection, installation quality & crew oversight',
      });
    }
    setPersonnelList(list);
  }, [project?.id, project?.assigned_manager, project?.architect, project?.worker, project?.sales_person, project?.site_supervisor]);

  // Synchronize assigned materials from storage or project record
  useEffect(() => {
    if (!project) return;
    try {
      const saved = localStorage.getItem(`project_materials_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMaterialsList(parsed);
          return;
        }
      }
    } catch {}

    if (project.material_requirements && project.material_requirements.length > 0) {
      setMaterialsList(project.material_requirements);
    } else {
      setMaterialsList([]);
    }
  }, [project?.id, project?.material_requirements]);

  // Tab 2: Personnel Handlers
  const handleOpenAssignPersonnel = (person?: AssignedPersonnel) => {
    if (person) {
      setEditingPersonnelId(person.id);
      setPersonnelNameInput(person.name);
      setPersonnelRoleInput(person.role);
      setPersonnelScopeInput(person.scope);
    } else {
      setEditingPersonnelId(null);
      setPersonnelNameInput('');
      setPersonnelRoleInput('Lead Engineer / Project Manager');
      setPersonnelScopeInput('');
    }
    setIsAssignPersonnelModalOpen(true);
  };

  const handleAssignPersonnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const trimmedName = personnelNameInput.trim();
    if (!trimmedName) return;
    const trimmedScope = personnelScopeInput.trim() || 'General project coordination & execution';

    let updatedList: AssignedPersonnel[];
    if (editingPersonnelId) {
      updatedList = personnelList.map(p =>
        p.id === editingPersonnelId
          ? { ...p, name: trimmedName, role: personnelRoleInput, scope: trimmedScope }
          : p
      );
    } else {
      const newItem: AssignedPersonnel = {
        id: Date.now().toString(),
        name: trimmedName,
        role: personnelRoleInput,
        scope: trimmedScope,
      };
      updatedList = [...personnelList, newItem];
    }

    setPersonnelList(updatedList);
    try {
      localStorage.setItem(`project_personnel_${project.id}`, JSON.stringify(updatedList));
    } catch {}

    const manager = updatedList.find(p => p.role.includes('Engineer') || p.role.includes('Manager'));
    const architect = updatedList.find(p => p.role.includes('Architect') || p.role.includes('Designer'));
    const workers = updatedList
      .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
      .map(p => p.name.trim())
      .filter(Boolean);
    const salesperson = updatedList.find(p => p.role.includes('Sales') || p.role.includes('Salesperson'));
    const supervisor = updatedList.find(p => p.role.includes('Supervisor'));

    setActionLoading(true);
    try {
      const updated = await api.put<Project>(`/projects/${project.id}`, {
        assigned_manager: manager ? manager.name : null,
        architect: architect ? architect.name : null,
        worker: workers.length > 0 ? workers.join(', ') : null,
        sales_person: salesperson ? salesperson.name : null,
        site_supervisor: supervisor ? supervisor.name : null,
      });
      setProject(updated);
      setIsAssignPersonnelModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update assigned personnel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePersonnel = async (personId: string) => {
    if (!project) return;
    const updatedList = personnelList.filter(p => p.id !== personId);
    setPersonnelList(updatedList);
    try {
      localStorage.setItem(`project_personnel_${project.id}`, JSON.stringify(updatedList));
    } catch {}

    const manager = updatedList.find(p => p.role.includes('Engineer') || p.role.includes('Manager'));
    const architect = updatedList.find(p => p.role.includes('Architect') || p.role.includes('Designer'));
    const workers = updatedList
      .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
      .map(p => p.name.trim())
      .filter(Boolean);
    const salesperson = updatedList.find(p => p.role.includes('Sales') || p.role.includes('Salesperson'));
    const supervisor = updatedList.find(p => p.role.includes('Supervisor'));

    setActionLoading(true);
    try {
      const updated = await api.put<Project>(`/projects/${project.id}`, {
        assigned_manager: manager ? manager.name : null,
        architect: architect ? architect.name : null,
        worker: workers.length > 0 ? workers.join(', ') : null,
        sales_person: salesperson ? salesperson.name : null,
        site_supervisor: supervisor ? supervisor.name : null,
      });
      setProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove personnel');
    } finally {
      setActionLoading(false);
    }
  };

  // Tab 2: Material Handlers (Manual Input)
  const handleOpenAssignMaterial = (item?: AssignedMaterialRequirement) => {
    if (item) {
      setEditingMaterialId(item.id);
      setMaterialNameInput(item.material_name);
      setMaterialQtyInput(String(item.required_qty));
      setMaterialStatusInput(item.status || 'Ready');
    } else {
      setEditingMaterialId(null);
      setMaterialNameInput('');
      setMaterialQtyInput('');
      setMaterialStatusInput('Ready');
    }
    setMaterialErrors({});
    setIsAssignMaterialModalOpen(true);
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const trimmedName = materialNameInput.trim();
    const qty = parseFloat(materialQtyInput);

    const errors: Record<string, string> = {};
    if (!trimmedName) {
      errors.name = 'Please enter a material name.';
    }
    if (isNaN(qty) || qty <= 0) {
      errors.qty = 'Please enter a valid required quantity greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
      setMaterialErrors(errors);
      return;
    }

    setMaterialErrors({});
    let updated: AssignedMaterialRequirement[];

    if (editingMaterialId) {
      updated = materialsList.map(m =>
        String(m.id) === String(editingMaterialId)
          ? { ...m, material_name: trimmedName, required_qty: qty, status: materialStatusInput }
          : m
      );
    } else {
      const newRequirement: AssignedMaterialRequirement = {
        id: Date.now().toString(),
        material_name: trimmedName,
        required_qty: qty,
        status: materialStatusInput,
      };
      updated = [...materialsList, newRequirement];
    }

    setMaterialsList(updated);
    try {
      localStorage.setItem(`project_materials_${project.id}`, JSON.stringify(updated));
    } catch {}

    setProject(prev => prev ? { ...prev, material_requirements: updated as any } : null);
    setIsAssignMaterialModalOpen(false);
    setEditingMaterialId(null);
    setMaterialNameInput('');
    setMaterialQtyInput('');
    setMaterialStatusInput('Ready');
  };

  const handleRemoveMaterialFromProject = async (reqId: number | string) => {
    if (!project) return;
    const updated = materialsList.filter(m => String(m.id) !== String(reqId));
    setMaterialsList(updated);
    try {
      localStorage.setItem(`project_materials_${project.id}`, JSON.stringify(updated));
    } catch {}
    setProject(prev => prev ? { ...prev, material_requirements: updated as any } : null);

    // If it was a backend requirement with numeric ID, try removing on backend gracefully
    if (typeof reqId === 'number' && reqId < 1000000000) {
      try {
        await api.delete(`/projects/${project.id}/materials/${reqId}`);
      } catch {}
    }
  };

  // Tab 3: Document Handlers
  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;
    const docItem: ProjectDoc = {
      id: Date.now(),
      name: newDoc.name.trim(),
      category: newDoc.category,
      file_name: newDoc.file_name || `${newDoc.name.trim().toLowerCase().replace(/\s+/g, '_')}.pdf`,
      uploaded_at: new Date().toLocaleDateString(),
    };
    setProjectDocuments(prev => [...prev, docItem]);
    setNewDoc({ name: '', category: 'Contract', file_name: '' });
    setIsUploadDocModalOpen(false);
  };

  const handleDeleteDoc = (id: number) => {
    setProjectDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Payment Recording Handler
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (newPayment.amount <= 0) {
      setPaymentFormErrors({ amount: 'Payment amount must be greater than 0' });
      return;
    }

    setPaymentFormErrors({});
    setActionLoading(true);
    try {
      await api.post(`/projects/${project.id}/payments`, {
        amount: Number(newPayment.amount),
        payment_date: newPayment.payment_date ? new Date(newPayment.payment_date).toISOString() : new Date().toISOString(),
        payment_method: newPayment.payment_method || 'Bank Transfer',
        reference_number: newPayment.reference_number.trim() || undefined,
        notes: newPayment.notes.trim() || undefined,
      });
      setIsRecordPaymentModalOpen(false);
      setNewPayment({
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        reference_number: '',
        notes: '',
      });
      await fetchProjectData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };



  if (isLoading) {
    return (
      <div className="erp-content">
        <div className="erp-empty-state">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="erp-content">
        <div className="erp-empty-state">
          <p>{errorMessage || 'Project not found.'}</p>
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => navigate({ to: '/projects' })}
          >
            <ArrowLeft size={14} />
            <span>Return to Projects</span>
          </button>
        </div>
      </div>
    );
  }

  const durationText = calculateDurationDays(
    project.actual_start_date || project.start_date,
    project.actual_end_date || project.deadline_date
  );
  const completionPercent = getProjectProgress(project.status);



  // Group 3: Financial Calculations
  const contractAmount = project.contract_amount || 0;
  const payments = project.payments || [];
  const recordedPaymentsTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const customerPaid = payments.length > 0 ? recordedPaymentsTotal : (project.customer_paid || 0);
  const outstandingBalance = Math.max(0, contractAmount - customerPaid);
  const serviceCost = project.service_cost || 0;

  // Material cost calculated from requirements if not explicitly overridden
  const materialReqCost = (project.material_requirements || []).reduce((sum, r) => {
    return sum + (r.required_qty * (r.unit_cost || 0));
  }, 0);
  const materialCost = project.material_cost || materialReqCost;
  const laborCost = project.labor_cost || 0;
  const otherExpenses = project.other_expenses || 0;

  // Total Project Cost = Material Cost + Labor Cost + Service Cost + Other Expenses
  const totalCostComponents = materialCost + laborCost + serviceCost + otherExpenses;
  const totalProjectCost = totalCostComponents > 0
    ? totalCostComponents
    : (project.actual_cost || project.estimated_cost || 0);

  // Estimated Profit = Contract Amount - Total Project Cost
  const estimatedProfit = contractAmount - totalProjectCost;

  // Payment Status = Unpaid, Partially Paid, Paid
  const paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' =
    (contractAmount > 0 && customerPaid >= contractAmount)
      ? 'Paid'
      : customerPaid > 0
      ? 'Partially Paid'
      : 'Unpaid';

  return (
    <div className="erp-content">
      {/* Top Navigation & Clean Underline Tabs */}
      <div
        className="erp-underline-tabs"
        style={{
          borderRadius: 'var(--erp-radius-card) var(--erp-radius-card) 0 0',
          border: '1px solid var(--erp-border)',
          borderBottom: '1px solid var(--erp-border)',
          gap: '12px',
        }}
      >
        <button
          className="erp-btn erp-btn-secondary erp-btn-sm"
          style={{ height: '28px', padding: '0 10px', fontSize: '12px', gap: '5px' }}
          onClick={() => navigate({ to: '/projects' })}
          title="Back to all projects"
        >
          <ArrowLeft size={13} />
          <span>Back to Projects</span>
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--erp-border)', margin: '0 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <LayoutDashboard size={14} />
            <span>Summary</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'resource' ? 'active' : ''}`}
            onClick={() => setActiveTab('resource')}
          >
            <Users size={14} />
            <span>Resource</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'document' ? 'active' : ''}`}
            onClick={() => setActiveTab('document')}
          >
            <FileText size={14} />
            <span>Document</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12.5px', padding: '2px 0' }}>
          {errorMessage}
        </div>
      )}

      {/* Workspace Canvas Container */}
      <div
        className="erp-table-container"
        style={{
          borderTop: 'none',
          borderRadius: '0 0 var(--erp-radius-card) var(--erp-radius-card)',
          padding: activeTab === 'resource' ? '0' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: activeTab === 'resource' ? '0' : '12px'
        }}
      >
        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="project-summary-grid">
            {/* Left Column: General Information & Financial Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. General Information Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>General Information</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Name:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Number / ID:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_number || `PRJ-${String(project.id).padStart(4, '0')}`}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400, color: project.customer ? 'var(--erp-primary)' : 'var(--erp-text-main)' }}>
                    {project.customer?.name || 'Walk-in / Direct Client'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Type:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.project_type || 'Window & Door Installation'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Status:</span>
                  <div style={{ textAlign: 'left' }}>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Site Location:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.location || 'Not Specified'}</span>
                </div>

                {/* Stakeholders Section within General Information */}
                <div style={{ borderTop: '1px solid var(--erp-border)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Stakeholders</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Project Manager:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.assigned_manager || personnelList.find(p => p.role.includes('Engineer') || p.role.includes('Manager'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Architect:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.architect || personnelList.find(p => p.role.includes('Architect') || p.role.includes('Designer'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Workers:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {(() => {
                      const workerNames = personnelList
                        .filter(p => p.role.includes('Worker') || p.role.includes('Crew'))
                        .map(p => p.name.trim())
                        .filter(Boolean);
                      if (workerNames.length > 0) return workerNames.join(', ');
                      return project.worker || '-';
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Salesperson:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.sales_person || personnelList.find(p => p.role.includes('Sales'))?.name || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Site Supervisor:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.site_supervisor || personnelList.find(p => p.role.includes('Supervisor'))?.name || '-'}
                  </span>
                </div>
              </div>

              {/* 2. Financial Information Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Financial Information</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Contract Amount:</span>
                  <span style={{ color: 'var(--erp-primary)', textAlign: 'left', fontWeight: 400 }}>
                    ${contractAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer Paid:</span>
                  <span style={{ color: '#059669', textAlign: 'left', fontWeight: 400 }}>
                    ${customerPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Outstanding Balance:</span>
                  <span style={{ color: outstandingBalance > 0 ? 'var(--erp-text-main)' : 'var(--erp-text-muted)', textAlign: 'left', fontWeight: 400 }}>
                    ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Service Cost:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    ${serviceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Total Project Cost:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    ${totalProjectCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Estimated Profit:</span>
                  <span style={{ color: estimatedProfit >= 0 ? '#059669' : 'var(--erp-text-error)', textAlign: 'left', fontWeight: 400 }}>
                    ${estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Payment Status:</span>
                  <div style={{ textAlign: 'left' }}>
                    <span className={`erp-badge ${
                      paymentStatus === 'Paid'
                        ? 'erp-badge-emerald'
                        : paymentStatus === 'Partially Paid'
                        ? 'erp-badge-amber'
                        : 'erp-badge-rose'
                    }`} style={{ fontWeight: 400 }}>
                      {paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Customer Info & Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 3. Customer Info Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Customer Info</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Contact Person:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.customer?.contact_person || project.customer_representative || '-'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Customer Address:</span>
                  <span style={{ textAlign: 'left', wordBreak: 'break-word', flex: 1, fontWeight: 400 }}>
                    {project.customer?.address || 'Not Recorded'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Telephone:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.customer?.phone || 'No phone recorded'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Email:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.customer?.email || 'No email recorded'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Preferred Contact Method:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>
                    {project.customer?.preferred_contact_method || project.preferred_contact_method || 'Phone'}
                  </span>
                </div>
              </div>

              {/* 4. Schedule Container */}
              <div
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  padding: '14px 16px',
                  backgroundColor: 'var(--erp-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--erp-border)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>Schedule</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Start Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Estimated End Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.deadline_date ? new Date(project.deadline_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Actual End Date:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Duration:</span>
                  <span style={{ textAlign: 'left', fontWeight: 400 }}>{durationText}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--erp-text-muted)', width: '165px', flexShrink: 0 }}>Completion Percentage:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--erp-border)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${completionPercent}%`, height: '100%', backgroundColor: 'var(--erp-primary)' }} />
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 400 }}>{completionPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESOURCE */}
        {activeTab === 'resource' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: '360px' }}>
            {/* Sub-tab Toolbar: Selection on Left, Action on Right */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--erp-border)',
                padding: '6px 16px',
                backgroundColor: 'var(--erp-surface)',
              }}
            >
              <div
                className="erp-underline-tabs"
                style={{
                  borderBottom: 'none',
                  background: 'transparent',
                  padding: 0,
                  gap: '16px',
                  margin: 0,
                }}
              >
                <button
                  type="button"
                  className={`erp-underline-tab ${resourceSubTab === 'personnel' ? 'active' : ''}`}
                  onClick={() => setResourceSubTab('personnel')}
                  style={{ padding: '6px 4px' }}
                >
                  <span>Work & Personnel</span>
                </button>
                <button
                  type="button"
                  className={`erp-underline-tab ${resourceSubTab === 'materials' ? 'active' : ''}`}
                  onClick={() => setResourceSubTab('materials')}
                  style={{ padding: '6px 4px' }}
                >
                  <span>Project Materials</span>
                </button>
              </div>

              <div>
                {resourceSubTab === 'personnel' ? (
                  <button
                    type="button"
                    className="erp-btn erp-btn-primary erp-btn-sm"
                    onClick={() => handleOpenAssignPersonnel()}
                  >
                    <UserCheck size={14} />
                    <span>Assign Personnel</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="erp-btn erp-btn-primary erp-btn-sm"
                    onClick={() => handleOpenAssignMaterial()}
                  >
                    <Plus size={14} />
                    <span>Assign Material</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tab 1: Work & Personnel (Full Width & Height Table) */}
            {resourceSubTab === 'personnel' && (
              personnelList.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    minHeight: '320px',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
                    No personnel assigned to this project yet.
                  </span>
                  <button
                    type="button"
                    className="erp-btn erp-btn-secondary erp-btn-sm"
                    onClick={() => handleOpenAssignPersonnel()}
                  >
                    <UserCheck size={14} />
                    <span>Assign Personnel</span>
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
                  <table className="erp-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Name</th>
                        <th style={{ width: '25%' }}>Role</th>
                        <th style={{ width: '35%' }}>Scope</th>
                        <th style={{ width: '15%', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnelList.map(person => (
                        <tr key={person.id}>
                          <td style={{ fontWeight: 500, fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
                            {person.name}
                          </td>
                          <td style={{ fontWeight: 400, fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
                            {person.role}
                          </td>
                          <td style={{ color: 'var(--erp-text-muted)', fontSize: '13.5px' }}>
                            {person.scope}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                className="erp-badge erp-badge-green"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleOpenAssignPersonnel(person)}
                                title="Click to edit assignment"
                              >
                                Assigned
                              </span>
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ borderColor: 'var(--erp-border-error)', color: 'var(--erp-text-error)', padding: '2px 6px' }}
                                onClick={() => handleRemovePersonnel(person.id)}
                                disabled={actionLoading}
                                title="Remove personnel"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Sub-tab 2: Project Materials (Full Width & Height Table) */}
            {resourceSubTab === 'materials' && (
              materialsList.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    minHeight: '320px',
                    gap: '12px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
                    No materials assigned to this project yet.
                  </span>
                  <button
                    type="button"
                    className="erp-btn erp-btn-secondary erp-btn-sm"
                    onClick={() => handleOpenAssignMaterial()}
                  >
                    <Plus size={14} />
                    <span>Assign Material</span>
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', flex: 1 }}>
                  <table className="erp-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialsList.map(req => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 500, fontSize: '14px' }}>{req.material_name}</td>
                          <td style={{ fontSize: '13.5px' }}>{req.required_qty}</td>
                          <td>
                            <StatusBadge status={req.status || 'Ready'} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ padding: '2px 6px' }}
                                onClick={() => handleOpenAssignMaterial(req)}
                                title="Edit material assignment"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                className="erp-btn erp-btn-secondary erp-btn-sm"
                                style={{ borderColor: 'var(--erp-border-error)', color: 'var(--erp-text-error)', padding: '2px 6px' }}
                                onClick={() => handleRemoveMaterialFromProject(req.id)}
                                title="Remove material"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENT */}
        {activeTab === 'document' && (
          projectDocuments.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '320px',
                width: '100%',
              }}
            >
              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => setIsUploadDocModalOpen(true)}
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                <Plus size={15} />
                <span>Upload Document</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Project Documents ({projectDocuments.length})</span>
                <button
                  type="button"
                  className="erp-btn erp-btn-primary erp-btn-sm"
                  onClick={() => setIsUploadDocModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Upload Document</span>
                </button>
              </div>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>File Name</th>
                    <th>Uploaded Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projectDocuments.map(doc => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 500 }}>{doc.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-blue">{doc.category}</span>
                      </td>
                      <td style={{ color: 'var(--erp-text-muted)', fontFamily: 'var(--erp-mono-font)', fontSize: '12px' }}>
                        {doc.file_name}
                      </td>
                      <td>{doc.uploaded_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          style={{ borderColor: 'var(--erp-border-error)', color: 'var(--erp-text-error)' }}
                          onClick={() => handleDeleteDoc(doc.id)}
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>


      {/* Modal 1: Assign Personnel */}
      <Modal
        isOpen={isAssignPersonnelModalOpen}
        onClose={() => setIsAssignPersonnelModalOpen(false)}
        title={editingPersonnelId ? "Edit Personnel Assignment" : "Assign Work & Personnel"}
        maxWidth="480px"
      >
        <form onSubmit={handleAssignPersonnelSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Name <span style={{ color: 'var(--erp-text-error)' }}>*</span></label>
              <input
                type="text"
                required
                placeholder="Enter person or team name"
                className="erp-input"
                value={personnelNameInput}
                onChange={e => setPersonnelNameInput(e.target.value)}
              />
            </div>
            <div className="erp-form-group">
              <label className="erp-form-label">Role <span style={{ color: 'var(--erp-text-error)' }}>*</span></label>
              <select
                className="erp-input"
                value={personnelRoleInput}
                onChange={e => setPersonnelRoleInput(e.target.value)}
              >
                <option value="Lead Engineer / Project Manager">Lead Engineer / Project Manager</option>
                <option value="Architect / Designer">Architect / Designer</option>
                <option value="Workers / Installation Crew">Workers / Installation Crew</option>
                <option value="Salesperson">Salesperson</option>
                <option value="Site Supervisor">Site Supervisor</option>
                <option value="Quality Control Specialist">Quality Control Specialist</option>
              </select>
            </div>
            <div className="erp-form-group">
              <label className="erp-form-label">Scope</label>
              <input
                type="text"
                placeholder="Enter assignment scope"
                className="erp-input"
                value={personnelScopeInput}
                onChange={e => setPersonnelScopeInput(e.target.value)}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsAssignPersonnelModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : (editingPersonnelId ? 'Update Personnel' : 'Save Personnel')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Assign Material (Manual Input) */}
      <Modal
        isOpen={isAssignMaterialModalOpen}
        onClose={() => {
          setIsAssignMaterialModalOpen(false);
          setEditingMaterialId(null);
        }}
        title={editingMaterialId ? 'Edit Project Material' : 'Assign Project Material'}
        maxWidth="500px"
      >
        <form onSubmit={handleAddMaterialSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">
                Material Name <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="text"
                className={`erp-input ${materialErrors.name ? 'erp-input-error' : ''}`}
                placeholder="Enter material name"
                value={materialNameInput}
                onChange={e => {
                  setMaterialNameInput(e.target.value);
                  if (materialErrors.name) setMaterialErrors(prev => ({ ...prev, name: '' }));
                }}
                autoFocus
              />
              {materialErrors.name && (
                <span className="erp-form-error">{materialErrors.name}</span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">
                Required Quantity <span style={{ color: 'var(--erp-text-error)' }}>*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="Enter required quantity"
                className={`erp-input ${materialErrors.qty ? 'erp-input-error' : ''}`}
                value={materialQtyInput}
                onChange={e => {
                  setMaterialQtyInput(e.target.value);
                  if (materialErrors.qty) setMaterialErrors(prev => ({ ...prev, qty: '' }));
                }}
              />
              {materialErrors.qty && (
                <span className="erp-form-error">{materialErrors.qty}</span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Status</label>
              <select
                className="erp-select"
                value={materialStatusInput}
                onChange={e => setMaterialStatusInput(e.target.value)}
              >
                <option value="Ready">Ready</option>
                <option value="Reserved">Reserved</option>
                <option value="Material Preparation">Material Preparation</option>
                <option value="Shortage">Shortage</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsAssignMaterialModalOpen(false);
                setEditingMaterialId(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={!materialNameInput.trim() || !materialQtyInput}
            >
              {editingMaterialId ? 'Update Material' : 'Assign Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upload Document */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Project Document"
      >
        <form onSubmit={handleUploadDocSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Document Name *</label>
              <input
                type="text"
                required
                placeholder="Enter document title or reference"
                className="erp-input"
                value={newDoc.name}
                onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Category</label>
              <select
                className="erp-select"
                value={newDoc.category}
                onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
              >
                <option value="Contract">Contract / Agreement</option>
                <option value="Drawing">Architectural Drawing / Blueprint</option>
                <option value="Quotation">Quotation / Proposal</option>
                <option value="Specification">Technical Specification</option>
                <option value="Site Photo">Site Photo / Survey</option>
                <option value="Other">Other Document</option>
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
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Project Payment */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title="Record Project Payment"
      >
        <form onSubmit={handleRecordPaymentSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Payment Amount ($) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className={`erp-input ${paymentFormErrors.amount ? 'erp-input-error' : ''}`}
                value={newPayment.amount || ''}
                onChange={e => {
                  setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 });
                  if (paymentFormErrors.amount) setPaymentFormErrors(prev => ({ ...prev, amount: '' }));
                }}
              />
              {paymentFormErrors.amount && (
                <span className="erp-form-error">{paymentFormErrors.amount}</span>
              )}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Payment Date</label>
                <input
                  type="date"
                  className="erp-input"
                  value={newPayment.payment_date}
                  onChange={e => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Payment Method</label>
                <select
                  className="erp-select"
                  value={newPayment.payment_method}
                  onChange={e => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Reference Number (Optional)</label>
              <input
                type="text"
                placeholder="Enter transaction or cheque reference number"
                className="erp-input"
                value={newPayment.reference_number}
                onChange={e => setNewPayment({ ...newPayment, reference_number: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Enter payment notes or terms"
                className="erp-textarea"
                value={newPayment.notes}
                onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsRecordPaymentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
