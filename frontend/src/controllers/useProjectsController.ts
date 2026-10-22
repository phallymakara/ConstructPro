import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type {
  Project,
  ProjectFormData,
  ProjectItemFormData,
  ProjectStatus,
  Customer,
  Supplier
} from '../models/types';
import { calculateDynamicProjectStatus } from '../utils/taskProgress';


export function useProjectsController() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'materials' | 'production'>('items');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState<boolean>(false);
  const [isShortagePOModalOpen, setIsShortagePOModalOpen] = useState<boolean>(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projData, custData, supData] = await Promise.all([
        api.get<Project[]>('/projects/?source=project'),
        api.get<Customer[]>('/customers/'),
        api.get<Supplier[]>('/purchasing/suppliers'),
      ]);
      // PM Projects Page receives projects created directly for operations or Closed Won from Sales
      const pmProjects = projData
        .filter(p => (p.source || 'project') !== 'sales' || p.status === 'Closed Won' || p.status === 'Accepted' || p.status === 'Completed')
        .map(p => ({
          ...p,
          status: calculateDynamicProjectStatus(p),
        }));
      setProjects(pmProjects);
      setCustomers(custData);
      setSuppliers(supData);
      if (selectedProject) {
        const updated = pmProjects.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectProject = async (project: Project) => {
    setSelectedProject(project);
    setActiveTab('items');
  };

  const createProject = async (data: ProjectFormData) => {
    setActionLoading(true);
    try {
      const payload = {
        ...data,
        source: 'project',
        status: data.status || 'Starting',
      };
      const newProj = await api.post<Project>('/projects/', payload);
      const dynamicNewProj = {
        ...newProj,
        status: calculateDynamicProjectStatus(newProj),
      };
      setProjects(prev => [dynamicNewProj, ...prev]);
      setSelectedProject(dynamicNewProj);
      setIsCreateModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create project');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (projectId: number, newStatus: ProjectStatus) => {
    setActionLoading(true);
    try {
      await api.put<Project>(`/projects/${projectId}`, { status: newStatus });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, status: newStatus } : null);
      }
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project status');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateProject = async (projectId: number, data: Partial<ProjectFormData>) => {
    setActionLoading(true);
    try {
      const updated = await api.put<Project>(`/projects/${projectId}`, data);
      const dynUpdated = {
        ...updated,
        status: calculateDynamicProjectStatus(updated),
      };
      setProjects(prev => prev.map(p => p.id === projectId ? dynUpdated : p));
      if (selectedProject?.id === projectId) setSelectedProject(dynUpdated);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteProject = async (projectId: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) setSelectedProject(null);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete project');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const addItemToProject = async (projectId: number, itemData: ProjectItemFormData) => {
    setActionLoading(true);
    try {
      await api.post(`/projects/${projectId}/items`, itemData);
      const updated = await api.get<Project>(`/projects/${projectId}`);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProject(updated);
      setIsAddItemModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add item to project');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteItem = async (projectId: number, itemId: number) => {
    setActionLoading(true);
    try {
      await api.delete(`/projects/${projectId}/items/${itemId}`);
      const updated = await api.get<Project>(`/projects/${projectId}`);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove item');
    } finally {
      setActionLoading(false);
    }
  };

  const calculateMaterials = async (projectId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/projects/${projectId}/calculate-materials`, {});
      const updated = await api.get<Project>(`/projects/${projectId}`);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Material calculation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const reserveMaterials = async (projectId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/projects/${projectId}/reserve-materials`, {});
      const updated = await api.get<Project>(`/projects/${projectId}`);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Material reservation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const consumeMaterials = async (
    projectId: number,
    items: { material_requirement_id: number; consumed_qty: number; wastage_qty: number; notes?: string }[]
  ) => {
    setActionLoading(true);
    try {
      const updated = await api.post<Project>(`/projects/${projectId}/consume-materials`, { items });
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProject(updated);
      setIsConsumeModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record material consumption');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const createShortagePO = async (projectId: number, supplierId: number) => {
    setActionLoading(true);
    try {
      await api.post(`/purchasing/create-from-project-shortages/${projectId}?supplier_id=${supplierId}`, {});
      setIsShortagePOModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create purchase order for shortages');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesSearch =
      p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.project_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return {
    projects: filteredProjects,
    rawCount: projects.length,
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
    setSelectedProject,
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
    refresh: fetchProjects,
  };
}
