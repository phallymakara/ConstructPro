import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type {
  Supplier,
  SupplierFormData,
  PurchaseOrder,
  PurchaseOrderFormData,
  Material,
  Project
} from '../models/types';

export function usePurchasingController() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState<boolean>(false);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState<boolean>(false);

  const fetchPurchasingData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [supData, poData, matData, projData] = await Promise.all([
        api.get<Supplier[]>('/purchasing/suppliers'),
        api.get<PurchaseOrder[]>('/purchasing/orders'),
        api.get<Material[]>('/materials/'),
        api.get<Project[]>('/projects/'),
      ]);
      setSuppliers(supData);
      setOrders(poData);
      setMaterials(matData);
      setProjects(projData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load purchasing records');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchasingData();
  }, [fetchPurchasingData]);

  const createSupplier = async (data: SupplierFormData) => {
    setActionLoading(true);
    try {
      const newSup = await api.post<Supplier>('/purchasing/suppliers', data);
      setSuppliers(prev => [...prev, newSup]);
      setIsCreateSupplierModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add supplier');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const createPurchaseOrder = async (data: PurchaseOrderFormData) => {
    setActionLoading(true);
    try {
      const newPO = await api.post<PurchaseOrder>('/purchasing/orders', data);
      setOrders(prev => [newPO, ...prev]);
      setIsCreatePOModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create purchase order');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updatePurchaseOrder = async (poId: number, data: any) => {
    setActionLoading(true);
    try {
      const updated = await api.put<PurchaseOrder>(`/purchasing/orders/${poId}`, data);
      setOrders(prev => prev.map(po => po.id === poId ? updated : po));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update purchase order');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const receivePurchaseOrder = async (poId: number) => {
    setActionLoading(true);
    try {
      const updated = await api.post<PurchaseOrder>(`/purchasing/orders/${poId}/receive`, {});
      setOrders(prev => prev.map(po => po.id === poId ? updated : po));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to receive purchase delivery');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrders = orders.filter(po => {
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.supplier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredSuppliers = suppliers.filter(s => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contact_person || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.materials_supplied || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return {
    suppliers: filteredSuppliers,
    rawSuppliers: suppliers,
    orders: filteredOrders,
    materials,
    projects,
    activeTab,
    statusFilter,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateSupplierModalOpen,
    isCreatePOModalOpen,
    setActiveTab,
    setStatusFilter,
    setSearchQuery,
    setIsCreateSupplierModalOpen,
    setIsCreatePOModalOpen,
    createSupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    refresh: fetchPurchasingData,
  };
}
