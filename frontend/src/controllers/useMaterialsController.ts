import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type { Material, MaterialFormData, StockMovement } from '../models/types';

export function useMaterialsController() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState<boolean>(false);
  const [selectedMaterialForAdjust, setSelectedMaterialForAdjust] = useState<Material | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [matData, movData] = await Promise.all([
        api.get<Material[]>('/materials/'),
        api.get<StockMovement[]>('/materials/movements/all'),
      ]);
      setMaterials(matData);
      setMovements(movData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load materials catalog');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const createMaterial = async (data: MaterialFormData) => {
    setActionLoading(true);
    try {
      const newMat = await api.post<Material>('/materials/', data);
      setMaterials(prev => [...prev, newMat]);
      setIsCreateModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add material');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const adjustStock = async (movementType: string, quantity: number, notes?: string) => {
    if (!selectedMaterialForAdjust) return false;
    setActionLoading(true);
    try {
      await api.post('/materials/movements', {
        material_id: selectedMaterialForAdjust.id,
        movement_type: movementType,
        quantity: quantity,
        unit_cost: selectedMaterialForAdjust.unit_cost,
        reference_note: notes || `Manual stock ${movementType}`,
      });
      await fetchMaterials();
      setIsStockAdjustmentModalOpen(false);
      setSelectedMaterialForAdjust(null);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Stock adjustment failed');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = showLowStockOnly ? m.current_stock <= m.minimum_stock : true;
    return matchesCategory && matchesSearch && matchesLowStock;
  });

  return {
    materials: filteredMaterials,
    totalCount: materials.length,
    movements,
    categoryFilter,
    searchQuery,
    showLowStockOnly,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    isStockAdjustmentModalOpen,
    selectedMaterialForAdjust,
    setCategoryFilter,
    setSearchQuery,
    setShowLowStockOnly,
    setIsCreateModalOpen,
    setIsStockAdjustmentModalOpen,
    setSelectedMaterialForAdjust,
    createMaterial,
    adjustStock,
    refresh: fetchMaterials,
  };
}
