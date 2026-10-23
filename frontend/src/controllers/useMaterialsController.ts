import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './apiClient';
import type { Material, MaterialFormData, StockMovement, ProductCategory, ProductCategoryFormData } from '../models/types';

export function useMaterialsController() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState<boolean>(false);
  const [selectedMaterialForAdjust, setSelectedMaterialForAdjust] = useState<Material | null>(null);
  const [isBarcodeMovementModalOpen, setIsBarcodeMovementModalOpen] = useState<boolean>(false);
  const [selectedMaterialForBarcodeLabel, setSelectedMaterialForBarcodeLabel] = useState<Material | null>(null);

  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [matData, catData, movData] = await Promise.all([
        api.get<Material[]>('/materials/'),
        api.get<ProductCategory[]>('/materials/categories'),
        api.get<StockMovement[]>('/materials/movements/all'),
      ]);
      setMaterials(matData);
      setCategories(catData);
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

  // Categories list
  const existingCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.map(c => c.name);
    }
    const defaultCats = ['Profiles', 'Glass', 'Hardware', 'Rubber & Seals', 'Accessories', 'Panels'];
    const fromData = materials.map(m => m.category).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...fromData])).sort();
  }, [categories, materials]);

  const existingProductTypes = useMemo(() => {
    const types = materials.map(m => m.product_type || 'Standard').filter(Boolean);
    return Array.from(new Set(['Standard', ...types])).sort();
  }, [materials]);

  // Category CRUD
  const createCategory = async (data: ProductCategoryFormData): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const created = await api.post<ProductCategory>('/materials/categories', data);
      setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create category');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateCategory = async (id: number, data: ProductCategoryFormData): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const updated = await api.put<ProductCategory>(`/materials/categories/${id}`, data);
      setCategories(prev => prev.map(c => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
      // Also update affected materials locally
      setMaterials(prev =>
        prev.map(m => (m.category_id === id ? { ...m, category: updated.name } : m))
      );
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update category');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.delete(`/materials/categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete category');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const createMaterial = async (data: MaterialFormData): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const newMat = await api.post<Material>('/materials/', data);
      setMaterials(prev => [...prev, newMat]);
      setIsCreateModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add inventory item');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateMaterial = async (materialId: number, data: Partial<MaterialFormData>): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const updated = await api.put<Material>(`/materials/${materialId}`, data);
      setMaterials(prev => prev.map(m => (m.id === materialId ? updated : m)));
      setEditingMaterial(null);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update inventory item');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteMaterial = async (materialId: number): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.delete(`/materials/${materialId}`);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete inventory item');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const adjustStock = async (movementType: string, quantity: number, notes?: string): Promise<boolean> => {
    if (!selectedMaterialForAdjust) return false;
    return recordStockMovement(selectedMaterialForAdjust.id, movementType, quantity, notes);
  };

  const recordStockMovement = async (
    materialId: number,
    movementType: string,
    quantity: number,
    notes?: string
  ): Promise<boolean> => {
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const targetMat = materials.find(m => m.id === materialId);
      const newMovement = await api.post<StockMovement>('/materials/movements', {
        material_id: materialId,
        movement_type: movementType,
        quantity: quantity,
        unit_cost: targetMat?.unit_cost || 0,
        reference_note: notes || `Stock ${movementType}`,
      });

      // Update local material stock in real-time
      setMaterials(prev =>
        prev.map(m => {
          if (m.id !== materialId) return m;
          let newStock = m.current_stock;
          if (movementType === 'Stock In' || movementType === 'Receipt' || movementType === 'Return') {
            newStock += quantity;
          } else if (movementType === 'Stock Out' || movementType === 'Issue' || movementType === 'Wastage') {
            newStock = Math.max(0, newStock - quantity);
          } else if (movementType === 'Adjustment') {
            newStock = quantity;
          }
          return {
            ...m,
            current_stock: newStock,
            available_stock: Math.max(0, newStock - (m.reserved_stock || 0)),
          };
        })
      );

      setMovements(prev => [newMovement, ...prev]);
      setIsStockAdjustmentModalOpen(false);
      setSelectedMaterialForAdjust(null);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Stock movement failed');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const findMaterialByBarcode = async (barcodeOrCode: string): Promise<Material | null> => {
    const query = barcodeOrCode.trim().toLowerCase();
    if (!query) return null;

    // Search local cache first
    const foundLocal = materials.find(
      m =>
        (m.barcode && m.barcode.toLowerCase() === query) ||
        m.code.toLowerCase() === query
    );
    if (foundLocal) return foundLocal;

    // Query backend barcode endpoint
    try {
      const fetched = await api.get<Material>(`/materials/barcode/${encodeURIComponent(barcodeOrCode.trim())}`);
      return fetched;
    } catch {
      return null;
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;
      const matchesType = productTypeFilter === 'All' || (m.product_type || 'Standard') === productTypeFilter;
      const term = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.code.toLowerCase().includes(term) ||
        (m.barcode && m.barcode.toLowerCase().includes(term)) ||
        (m.storage_location && m.storage_location.toLowerCase().includes(term)) ||
        (m.product_type && m.product_type.toLowerCase().includes(term));
      const matchesLowStock = showLowStockOnly ? m.current_stock <= m.minimum_stock : true;
      return matchesCategory && matchesType && matchesSearch && matchesLowStock;
    });
  }, [materials, categoryFilter, productTypeFilter, searchQuery, showLowStockOnly]);

  // Hierarchical Grouping: Category -> Product Type -> Materials[]
  const groupedInventory = useMemo(() => {
    const categoryMap = new Map<string, Map<string, Material[]>>();

    // If not searching, include registered categories so newly created categories are immediately visible
    if (!searchQuery.trim()) {
      for (const catName of existingCategories) {
        if (categoryFilter === 'All' || categoryFilter === catName) {
          if (!categoryMap.has(catName)) {
            categoryMap.set(catName, new Map<string, Material[]>());
          }
        }
      }
    }

    for (const mat of filteredMaterials) {
      const cat = mat.category || 'General';
      const pType = mat.product_type || 'Standard';

      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, new Map<string, Material[]>());
      }
      const typeMap = categoryMap.get(cat)!;
      if (!typeMap.has(pType)) {
        typeMap.set(pType, []);
      }
      typeMap.get(pType)!.push(mat);
    }

    const result: Array<{
      category: string;
      categoryId?: number;
      totalItems: number;
      totalStock: number;
      types: Array<{
        productType: string;
        items: Material[];
        totalStock: number;
      }>;
    }> = [];

    for (const [category, typeMap] of categoryMap.entries()) {
      let categoryTotalStock = 0;
      let categoryTotalItems = 0;
      const typesList: Array<{ productType: string; items: Material[]; totalStock: number }> = [];

      for (const [pType, items] of typeMap.entries()) {
        const typeStock = items.reduce((sum, item) => sum + (item.current_stock || 0), 0);
        categoryTotalStock += typeStock;
        categoryTotalItems += items.length;
        typesList.push({
          productType: pType,
          items,
          totalStock: typeStock,
        });
      }

      const matchedCategoryObj = categories.find(c => c.name.toLowerCase() === category.toLowerCase());

      result.push({
        category,
        categoryId: matchedCategoryObj?.id,
        totalItems: categoryTotalItems,
        totalStock: categoryTotalStock,
        types: typesList,
      });
    }

    return result.sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredMaterials, existingCategories, searchQuery, categoryFilter, categories]);

  return {
    materials: filteredMaterials,
    allMaterials: materials,
    categories,
    groupedInventory,
    totalCount: materials.length,
    filteredCount: filteredMaterials.length,
    movements,
    categoryFilter,
    productTypeFilter,
    existingCategories,
    existingProductTypes,
    searchQuery,
    showLowStockOnly,
    isLoading,
    actionLoading,
    errorMessage,
    isCategoryModalOpen,
    isCreateModalOpen,
    editingMaterial,
    isStockAdjustmentModalOpen,
    selectedMaterialForAdjust,
    isBarcodeMovementModalOpen,
    selectedMaterialForBarcodeLabel,
    setCategoryFilter,
    setProductTypeFilter,
    setSearchQuery,
    setShowLowStockOnly,
    setIsCategoryModalOpen,
    setIsCreateModalOpen,
    setEditingMaterial,
    setIsStockAdjustmentModalOpen,
    setSelectedMaterialForAdjust,
    setIsBarcodeMovementModalOpen,
    setSelectedMaterialForBarcodeLabel,
    setErrorMessage,
    createCategory,
    updateCategory,
    deleteCategory,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    adjustStock,
    recordStockMovement,
    findMaterialByBarcode,
    refresh: fetchMaterials,
  };
}
