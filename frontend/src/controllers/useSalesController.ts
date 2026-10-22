import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type { Project, Customer, ProjectStatus } from '../models/types';
import { calculateDynamicProjectStatus } from '../utils/taskProgress';
import { getProjectTasks, calculateProjectTaskProgress } from '../utils/taskProgress';

export interface SalesProjectFormData {
  project_name: string;
  project_number?: string;
  customer_id?: number | null;
  new_customer_name?: string;
  project_type: string;
  status: ProjectStatus;
  location: string;
  sales_person: string;
  contact_person: string;
  customer_address: string;
  customer_phone: string;
  customer_email: string;
  preferred_contact_method: string;
  start_date: string;
  deadline_date: string;
  actual_end_date?: string;
  actual_start_date?: string;
  notes?: string;
}

export function calculateProjectDuration(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '0 Days';
  return `${diffDays} Days`;
}

export function calculateProjectProgressText(project: Project): { percent: number; text: string } {
  const tasks = getProjectTasks(project.id);
  const metrics = calculateProjectTaskProgress(tasks, project.status);

  if (metrics.hasTasks && metrics.totalUnits > 0) {
    const pct = Math.round(metrics.percent);
    return {
      percent: pct,
      text: `${pct}% (${metrics.completedUnits}/${metrics.totalUnits} completed)`,
    };
  }

  // Fallback representation based on status
  if (project.status === 'Completed') {
    return { percent: 100, text: '100% (6/6 completed)' };
  }
  if (project.status === 'Starting') {
    return { percent: 0, text: '0% (0/6 completed)' };
  }
  if (project.status === 'In Progress' || project.status === 'Production') {
    return { percent: 50, text: '50% (3/6 completed)' };
  }
  if (project.status === 'Ready for Delivery' || project.status === 'Installation') {
    return { percent: 85, text: '85% (5/6 completed)' };
  }
  if (project.status === 'Approved' || project.status === 'Material Preparation') {
    return { percent: 33, text: '33% (2/6 completed)' };
  }
  const pct = Math.round(metrics.percent);
  return {
    percent: pct,
    text: `${pct}% (${Math.round((pct / 100) * 6)}/6 completed)`,
  };
}

export function useSalesController() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projData, custData] = await Promise.all([
        api.get<Project[]>('/projects/?source=sales'),
        api.get<Customer[]>('/customers/'),
      ]);
      const mapped = projData
        .filter(p => p.source === 'sales')
        .map(p => ({
          ...p,
          status: calculateDynamicProjectStatus(p),
        }));
      setProjects(mapped);
      setCustomers(custData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sales projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createSalesProject = async (data: SalesProjectFormData): Promise<Project | null> => {
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let resolvedCustomerId = data.customer_id;

      // If new customer name was provided and no existing customer id
      if (!resolvedCustomerId && data.new_customer_name && data.new_customer_name.trim()) {
        try {
          const newCust = await api.post<Customer>('/customers/', {
            name: data.new_customer_name.trim(),
            contact_person: data.contact_person || '',
            phone: data.customer_phone || '',
            email: data.customer_email || '',
            address: data.customer_address || '',
            preferred_contact_method: data.preferred_contact_method || 'Phone',
            company: '',
            notes: 'Created from Sales portal',
          });
          resolvedCustomerId = newCust.id;
          setCustomers(prev => [...prev, newCust]);
        } catch (custErr: any) {
          console.warn('Could not auto-create customer record:', custErr);
        }
      }

      const payload = {
        project_name: data.project_name.trim(),
        project_number: data.project_number ? data.project_number.trim() : undefined,
        customer_id: resolvedCustomerId || undefined,
        project_type: data.project_type || 'Window & Door Installation',
        status: data.status || 'Draft',
        source: 'sales',
        location: data.location || '',
        sales_person: data.sales_person || '',
        customer_representative: data.contact_person || '',
        preferred_contact_method: data.preferred_contact_method || 'Phone',
        start_date: data.start_date || undefined,
        deadline_date: data.deadline_date || undefined,
        actual_start_date: data.actual_start_date || undefined,
        actual_end_date: data.actual_end_date || undefined,
        notes: data.notes || '',
      };

      const newProj = await api.post<Project>('/projects/', payload);
      const dynamicNewProj = {
        ...newProj,
        status: calculateDynamicProjectStatus(newProj),
      };

      setProjects(prev => [dynamicNewProj, ...prev]);
      setIsCreateModalOpen(false);
      setSuccessMessage(`Project "${newProj.project_name}" created successfully.`);
      return dynamicNewProj;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project from Sales portal');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const updateSalesProjectInfo = async (
    projectId: number,
    data: Partial<SalesProjectFormData>
  ): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload: any = {};
      if (data.project_name !== undefined) payload.project_name = data.project_name.trim();
      if (data.customer_id !== undefined) payload.customer_id = data.customer_id;
      if (data.project_type !== undefined) payload.project_type = data.project_type;
      if (data.status !== undefined) payload.status = data.status;
      if (data.location !== undefined) payload.location = data.location;
      if (data.sales_person !== undefined) payload.sales_person = data.sales_person;
      if (data.contact_person !== undefined) payload.customer_representative = data.contact_person;
      if (data.preferred_contact_method !== undefined) payload.preferred_contact_method = data.preferred_contact_method;
      if (data.start_date !== undefined) payload.start_date = data.start_date;
      if (data.deadline_date !== undefined) payload.deadline_date = data.deadline_date;
      if (data.actual_start_date !== undefined) payload.actual_start_date = data.actual_start_date;
      if (data.actual_end_date !== undefined) payload.actual_end_date = data.actual_end_date;
      if (data.notes !== undefined) payload.notes = data.notes;

      const updated = await api.put<Project>(`/projects/${projectId}`, payload);
      const dynamicUpdated = {
        ...updated,
        status: calculateDynamicProjectStatus(updated),
      };

      setProjects(prev => prev.map(p => (p.id === projectId ? dynamicUpdated : p)));
      setEditingProject(null);
      setSuccessMessage(`Project "${dynamicUpdated.project_name}" updated.`);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project info');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateSalesProjectStatus = async (projectId: number, newStatus: ProjectStatus): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await api.put<Project>(`/projects/${projectId}`, { status: newStatus });
      const dynamicUpdated = {
        ...updated,
        status: newStatus,
      };
      setProjects(prev => prev.map(p => (p.id === projectId ? dynamicUpdated : p)));
      if (newStatus === 'Closed Won' || newStatus === 'Accepted') {
        setSuccessMessage(`Project "${updated.project_name}" marked as Closed Won and handed over to Projects page.`);
      } else {
        setSuccessMessage(`Project status updated to ${newStatus}.`);
      }
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project status');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      (p.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.project_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return {
    projects: filteredProjects,
    totalCount: projects.length,
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
    editingProject,
    setEditingProject,
    fetchData,
    createSalesProject,
    updateSalesProjectInfo,
    updateSalesProjectStatus,
  };
}
