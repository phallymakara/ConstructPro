import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  QrCode as QrIcon,
  SlidersHorizontal,
  FolderTree,
  MoreHorizontal,
  Package,
  Layers,
  MapPin,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useMaterialsController } from '../../controllers/useMaterialsController';
import { Modal } from '../components/Modal';
import { BarcodeMovementModal } from '../components/BarcodeMovementModal';
import { BarcodeLabelModal } from '../components/BarcodeLabelModal';
import { CategoryManageModal } from '../components/CategoryManageModal';
import { StockOutModal } from '../components/StockOutModal';
import type { Material, MaterialFormData } from '../../models/types';

export const MaterialsView: React.FC = () => {
  const {
    materials,
    allMaterials,
    categories,
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
    isStockOutModalOpen,
    selectedMaterialForBarcodeLabel,
    projects,
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
    setIsStockOutModalOpen,
    setSelectedMaterialForBarcodeLabel,
    createCategory,
    updateCategory,
    deleteCategory,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    adjustStock,
    recordStockMovement,
    batchStockMovement,
    findMaterialByBarcode,
  } = useMaterialsController();



  // Active three-dot action dropdown ID
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Summary operational metrics
  const totalStockUnits = useMemo(() => {
    return allMaterials.reduce((sum, m) => sum + (m.current_stock || 0), 0);
  }, [allMaterials]);

  const lowStockCount = useMemo(() => {
    return allMaterials.filter(m => (m.current_stock || 0) <= (m.minimum_stock || 0)).length;
  }, [allMaterials]);

  // Direct stockout from mobile camera URL parameter (?picklist=... or ?stockout=...)
  const [urlStockoutMaterial, setUrlStockoutMaterial] = useState<Material | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetCode =
      params.get('picklist') ||
      params.get('stockout') ||
      params.get('scan') ||
      params.get('code');
    if (targetCode && materials.length > 0) {
      const trimmed = targetCode.trim().toLowerCase();
      const matched = materials.find(
        m =>
          (m.barcode && m.barcode.toLowerCase() === trimmed) ||
          m.code.toLowerCase() === trimmed
      );
      if (matched) {
        setUrlStockoutMaterial(matched);
        setIsStockOutModalOpen(true);
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {}
      }
    }
  }, [materials, setIsStockOutModalOpen]);

  // New / Edit Product Form State
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    barcode: '',
    category: 'ដែក',
    product_type: 'Standard',
    unit: 'm',
    unit_cost: 0,
    current_stock: 0,
    minimum_stock: 0,
    storage_location: '',
    notes: '',
  });

  // Structured warehouse location state (Row, Bay, Level)
  const [warehouseLoc, setWarehouseLoc] = useState({
    row: '',
    bay: '',
    level: '',
  });

  const handleWarehouseLocChange = (field: 'row' | 'bay' | 'level', val: string) => {
    const updated = { ...warehouseLoc, [field]: val };
    setWarehouseLoc(updated);
    const r = updated.row.trim().toLowerCase().replace(/^r/i, '');
    const b = updated.bay.trim().toLowerCase().replace(/^b/i, '');
    const l = updated.level.trim().toLowerCase().replace(/^l/i, '');
    const parts: string[] = [];
    if (r) parts.push(`r${r}`);
    if (b) parts.push(`b${b}`);
    if (l) parts.push(`l${l}`);
    setFormData(prev => ({
      ...prev,
      storage_location: parts.join('-'),
    }));
  };

  // Quick Manual Adjust Form State
  const [adjustData, setAdjustData] = useState<{
    movementType: string;
    quantity: number;
    notes: string;
  }>({
    movementType: 'Stock In',
    quantity: 1,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});


  const handleOpenCreateModal = (defaultCategory?: string) => {
    setFormErrors({});
    const initialCategory = defaultCategory || '';

    setWarehouseLoc({ row: '', bay: '', level: '' });
    setFormData({
      code: '',
      name: '',
      barcode: '',
      category: initialCategory,
      product_type: '',
      unit: 'm',
      unit_cost: '' as any,
      current_stock: '' as any,
      minimum_stock: '' as any,
      storage_location: '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (mat: Material) => {
    setFormErrors({});
    const parsedLoc = parseWarehouseLocation(mat.storage_location);
    setWarehouseLoc({
      row: parsedLoc.row,
      bay: parsedLoc.bay,
      level: parsedLoc.level,
    });
    setFormData({
      code: mat.code,
      name: mat.name,
      barcode: mat.barcode || mat.code,
      category: mat.category,
      product_type: mat.product_type || 'Standard',
      unit: mat.unit,
      unit_cost: mat.unit_cost,
      current_stock: mat.current_stock,
      minimum_stock: mat.minimum_stock,
      storage_location: mat.storage_location || '',
      notes: mat.notes || '',
    });
    setEditingMaterial(mat);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Product code is required';
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.category.trim()) errors.category = 'Category is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, formData);
    } else {
      await createMaterial(formData);
    }
  };

  const handleOpenQuickAdjust = (mat: Material) => {
    setSelectedMaterialForAdjust(mat);
    setAdjustData({
      movementType: 'Stock In',
      quantity: 1,
      notes: '',
    });
    setIsStockAdjustmentModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustData.quantity <= 0) {
      setFormErrors({ quantity: 'Quantity must be greater than 0' });
      return;
    }
    setFormErrors({});
    await adjustStock(adjustData.movementType, adjustData.quantity, adjustData.notes);
  };

  const parseWarehouseLocation = (locStr?: string) => {
    if (!locStr || !locStr.trim()) {
      return { row: '', bay: '', level: '', code: '' };
    }
    const text = locStr.trim().toLowerCase();

    // Match r01-b01-l01 or r01_b01_l01
    const rblMatch = text.match(/r([a-z0-9]+)[-_]b([a-z0-9]+)[-_]l([a-z0-9]+)/i);
    if (rblMatch) {
      return {
        row: rblMatch[1],
        bay: rblMatch[2],
        level: rblMatch[3],
        code: `r${rblMatch[1]}-b${rblMatch[2]}-l${rblMatch[3]}`,
      };
    }

    // Match verbose text: Row 01, Bay 01, Level 01 or Row A-01, Bay 01, Level 02
    const rowMatch = text.match(/(?:row|r)\s*[:#-]?\s*([a-z0-9]+)/i);
    const bayMatch = text.match(/(?:bay|b|rack)\s*[:#-]?\s*([a-z0-9]+)/i);
    const levelMatch = text.match(/(?:level|lvl|l)\s*[:#-]?\s*([a-z0-9]+)/i);

    if (rowMatch || bayMatch || levelMatch) {
      const r = rowMatch ? rowMatch[1] : '';
      const b = bayMatch ? bayMatch[1] : '';
      const l = levelMatch ? levelMatch[1] : '';
      const parts: string[] = [];
      if (r) parts.push(`r${r}`);
      if (b) parts.push(`b${b}`);
      if (l) parts.push(`l${l}`);
      return {
        row: r,
        bay: b,
        level: l,
        code: parts.join('-'),
      };
    }

    return { row: '', bay: '', level: '', code: text };
  };

  const renderMaterialRow = (item: Material, showCategory: boolean = true) => {
    const isLow = (item.current_stock || 0) <= (item.minimum_stock || 0);
    const parsedLoc = parseWarehouseLocation(item.storage_location);
    const bufferMax = Math.max((item.minimum_stock || 1) * 2, item.current_stock || 1);
    const bufferPct = Math.min(100, Math.round(((item.current_stock || 0) / bufferMax) * 100));

    return (
      <tr key={item.id}>
        {/* Material Name */}
        <td>
          <span style={{ color: 'var(--erp-text-main)', fontSize: '14px', fontWeight: 500 }}>
            {item.name}
          </span>
        </td>

        {/* Code */}
        <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: 'var(--erp-mono-font, monospace)', fontSize: '12.5px', color: 'var(--erp-text-muted)' }}>
            {item.code}
          </span>
        </td>

        {/* Category & Product Type */}
        {showCategory && (
          <td style={{ width: '150px', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', color: 'var(--erp-text-main)' }}>
                {item.category}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                {item.product_type || 'Standard'}
              </span>
            </div>
          </td>
        )}

        {/* Storage Location */}
        <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
          {parsedLoc.code ? (
            <span style={{ fontSize: '13.5px', color: 'var(--erp-text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="var(--erp-text-muted)" />
              <span>{parsedLoc.code}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--erp-text-light)', fontSize: '13px' }}>—</span>
          )}
        </td>

        {/* Stock Level & Buffer Depletion */}
        <td style={{ width: '180px', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span
                style={{
                  fontSize: '14.5px',
                  fontWeight: 500,
                  color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-main)',
                }}
              >
                {item.current_stock.toLocaleString()} {item.unit}
              </span>
              <span style={{ fontSize: '11.5px', color: isLow ? 'var(--erp-text-error)' : 'var(--erp-text-muted)' }}>
                {isLow ? `Low (min ${item.minimum_stock})` : `Min: ${item.minimum_stock}`}
              </span>
            </div>
            {/* Visual Buffer Bar */}
            <div
              style={{
                width: '100%',
                height: '3px',
                backgroundColor: 'var(--erp-border)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${bufferPct}%`,
                  height: '100%',
                  backgroundColor: isLow ? '#ef4444' : '#10b981',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>
        </td>

        {/* Unit Cost */}
        <td style={{ width: '110px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '14.5px', color: 'var(--erp-text-main)' }}>
            ${(item.unit_cost || 0).toFixed(2)}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', marginLeft: '3px' }}>
            /{item.unit}
          </span>
        </td>

        {/* Action (Three-Dot Dropdown) */}
        <td style={{ width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <div className="erp-dropdown-container">
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === item.id ? null : item.id);
              }}
              title="Actions"
              aria-label="Actions"
            >
              <MoreHorizontal size={15} />
            </button>

            {openMenuId === item.id && (
              <div className="erp-dropdown-menu" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    handleOpenQuickAdjust(item);
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Stock In / Out</span>
                </button>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    setSelectedMaterialForBarcodeLabel(item);
                  }}
                >
                  <QrIcon size={13} />
                  <span>Print Barcode Label</span>
                </button>
                <button
                  type="button"
                  className="erp-dropdown-item"
                  onClick={() => {
                    setOpenMenuId(null);
                    handleOpenEditModal(item);
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit Product</span>
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--erp-border)', margin: '4px 0' }} />
                <button
                  type="button"
                  className="erp-dropdown-item"
                  style={{ color: 'var(--erp-text-error)' }}
                  onClick={() => {
                    setOpenMenuId(null);
                    if (window.confirm(`Delete product "${item.name}"?`)) {
                      deleteMaterial(item.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Product</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };



  return (
    <div className="erp-content" style={{ animation: 'erpFadeIn 0.2s ease-out', gap: '6px', padding: '6px 10px' }}>
      {/* Operational Inventory Telemetry Strip */}
      <div className="erp-kpi-grid-4" style={{ gap: '6px', marginBottom: '0px' }}>
        {/* Catalog Items */}
        <div className="erp-kpi-card" style={{ padding: '6px 10px', gap: '2px' }}>
          <div className="erp-kpi-header" style={{ marginBottom: 0 }}>
            <span className="erp-kpi-label">Catalog Products</span>
            <div className="erp-kpi-icon">
              <Package size={14} color="#0284c7" />
            </div>
          </div>
          <div className="erp-kpi-body">
            <div className="erp-kpi-value" style={{ fontSize: '20px', lineHeight: 1.1 }}>
              {allMaterials.length}
            </div>
          </div>
        </div>

        {/* Physical Stock Units */}
        <div className="erp-kpi-card" style={{ padding: '6px 10px', gap: '2px' }}>
          <div className="erp-kpi-header" style={{ marginBottom: 0 }}>
            <span className="erp-kpi-label">Warehouse Units</span>
            <div className="erp-kpi-icon">
              <Layers size={14} color="#0284c7" />
            </div>
          </div>
          <div className="erp-kpi-body">
            <div className="erp-kpi-value" style={{ fontSize: '20px', lineHeight: 1.1 }}>
              {totalStockUnits.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Buffer Alerts (Interactive Filter) */}
        <div
          className="erp-kpi-card"
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          style={{
            cursor: 'pointer',
            borderColor: showLowStockOnly ? '#ef4444' : undefined,
            padding: '6px 10px',
            gap: '2px',
          }}
          title="Click to toggle low stock filter"
        >
          <div className="erp-kpi-header" style={{ marginBottom: 0 }}>
            <span className="erp-kpi-label">Buffer Alerts</span>
            <div className="erp-kpi-icon">
              <AlertTriangle size={14} color={lowStockCount > 0 ? '#dc2626' : 'var(--erp-text-muted)'} />
            </div>
          </div>
          <div className="erp-kpi-body">
            <div className="erp-kpi-value" style={{ color: lowStockCount > 0 ? 'var(--erp-text-error, #dc2626)' : 'inherit', fontSize: '20px', lineHeight: 1.1 }}>
              {lowStockCount}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div
          className="erp-kpi-card"
          onClick={() => setIsCategoryModalOpen(true)}
          style={{ cursor: 'pointer', padding: '6px 10px', gap: '2px' }}
          title="Click to manage categories"
        >
          <div className="erp-kpi-header" style={{ marginBottom: 0 }}>
            <span className="erp-kpi-label">Product Categories</span>
            <div className="erp-kpi-icon">
              <FolderTree size={14} color="#0284c7" />
            </div>
          </div>
          <div className="erp-kpi-body">
            <div className="erp-kpi-value" style={{ fontSize: '20px', lineHeight: 1.1 }}>
              {categories.length || existingCategories.length}
            </div>
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div
        className="erp-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '6px',
          padding: '5px 8px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          {/* Search Box */}
          <div className="erp-input-group" style={{ width: '280px', flexShrink: 0 }}>
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search materials..."
              className="erp-input erp-input-with-icon"
              style={{ width: '100%', height: '30px', fontSize: '13px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="erp-select"
            style={{ width: '140px', flexShrink: 0, height: '30px', fontSize: '12.5px', padding: '0 8px' }}
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setProductTypeFilter('All');
            }}
          >
            <option value="All">All Categories</option>
            {existingCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Product Type Filter */}
          <select
            className="erp-select"
            style={{ width: '130px', flexShrink: 0, height: '30px', fontSize: '12.5px', padding: '0 8px' }}
            value={productTypeFilter}
            onChange={e => setProductTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {existingProductTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          {/* Categories Button */}
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{ height: '30px', padding: '0 8px', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}
            title="Manage Categories"
          >
            <FolderTree size={13} />
            <span>Categories</span>
          </button>

          {/* Add Product Button */}
          <button
            type="button"
            className="erp-btn erp-btn-primary"
            onClick={() => handleOpenCreateModal()}
            style={{ height: '30px', padding: '0 10px', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}
            title="Add Product"
          >
            <Plus size={13} />
            <span>Product</span>
          </button>
        </div>
      </div>

      {/* Clean Uncontained Error Message */}
      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '0 4px', marginBottom: '4px' }}>
          {errorMessage}
        </div>
      )}

      {/* Main View Area */}
      {isLoading ? (
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
          Loading inventory catalog...
        </div>
      ) : materials.length === 0 ? (
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
          <div>No inventory products found matching your search.</div>
          {showLowStockOnly && (
            <button
              type="button"
              className="erp-btn erp-btn-secondary erp-btn-sm"
              style={{ marginTop: '10px' }}
              onClick={() => setShowLowStockOnly(false)}
            >
              Clear Low Stock Filter
            </button>
          )}
        </div>
      ) : (
        /* Unified Table Container with Native Vertical & Horizontal Scroll and Sticky Header */
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ fontWeight: 400 }}>Material</th>
                <th style={{ width: '130px', fontWeight: 400 }}>Code</th>
                <th style={{ width: '150px', fontWeight: 400 }}>Category & Type</th>
                <th style={{ width: '130px', fontWeight: 400 }}>Location</th>
                <th style={{ width: '180px', fontWeight: 400 }}>Stock & Buffer</th>
                <th style={{ width: '110px', textAlign: 'right', fontWeight: 400 }}>Price</th>
                <th style={{ width: '80px', textAlign: 'right', fontWeight: 400 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(item => renderMaterialRow(item, true))}
            </tbody>
          </table>
        </div>
      )}

      {/* Barcode Movement Scanner Modal */}
      <BarcodeMovementModal
        isOpen={isBarcodeMovementModalOpen}
        onClose={() => {
          setIsBarcodeMovementModalOpen(false);
          setUrlStockoutMaterial(null);
        }}
        findMaterialByBarcode={findMaterialByBarcode}
        recordStockMovement={recordStockMovement}
        actionLoading={actionLoading}
        initialMaterial={urlStockoutMaterial}
        initialMode="Stock Out"
      />

      {/* Take Materials Batch Picklist Modal */}
      <StockOutModal
        isOpen={isStockOutModalOpen}
        onClose={() => {
          setIsStockOutModalOpen(false);
          setUrlStockoutMaterial(null);
        }}
        materials={materials}
        projects={projects}
        onBatchStockMovement={batchStockMovement}
        actionLoading={actionLoading}
        initialScannedItem={urlStockoutMaterial}
      />

      {/* Barcode / QR Label Modal */}
      <BarcodeLabelModal
        material={selectedMaterialForBarcodeLabel}
        onClose={() => setSelectedMaterialForBarcodeLabel(null)}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingMaterial}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingMaterial(null);
        }}
        title={editingMaterial ? `Edit Product: ${editingMaterial.name}` : 'Add Inventory Product'}
      >
        <form onSubmit={handleProductSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Item Code *</label>
                <input
                  type="text"
                  placeholder="Item Code"
                  className={`erp-input ${formErrors.code ? 'erp-input-error' : ''}`}
                  value={formData.code}
                  onChange={e => {
                    setFormData({ ...formData, code: e.target.value });
                    if (formErrors.code) setFormErrors({ ...formErrors, code: '' });
                  }}
                />
                {formErrors.code && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {formErrors.code}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Barcode (Optional)</label>
                <input
                  type="text"
                  placeholder="Barcode"
                  className="erp-input"
                  value={formData.barcode || ''}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Product Name *</label>
              <input
                type="text"
                placeholder="Product Name"
                className={`erp-input ${formErrors.name ? 'erp-input-error' : ''}`}
                value={formData.name}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
              />
              {formErrors.name && (
                <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                  {formErrors.name}
                </span>
              )}
            </div>

            {/* Category & Product Type with Custom On-the-Fly support */}
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Category * (Select or Type New)</label>
                <input
                  type="text"
                  list="inventory-categories-list"
                  placeholder="Category"
                  className={`erp-input ${formErrors.category ? 'erp-input-error' : ''}`}
                  value={formData.category}
                  onChange={e => {
                    setFormData({ ...formData, category: e.target.value });
                    if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                  }}
                />
                <datalist id="inventory-categories-list">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {formErrors.category}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Product Type (Select or Type New)</label>
                <input
                  type="text"
                  list="inventory-types-list"
                  placeholder="Product Type"
                  className="erp-input"
                  value={formData.product_type || ''}
                  onChange={e => setFormData({ ...formData, product_type: e.target.value })}
                />
                <datalist id="inventory-types-list">
                  {existingProductTypes.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Unit of Measure</label>
                <select
                  className="erp-select"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="m">Meters (m)</option>
                  <option value="sq_m">Square Meters (sq_m)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="set">Sets (set)</option>
                  <option value="roll">Rolls (roll)</option>
                  <option value="box">Boxes (box)</option>
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  className="erp-input"
                  value={formData.unit_cost ?? ''}
                  onChange={e => setFormData({ ...formData, unit_cost: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">
                  {editingMaterial ? 'Current Stock' : 'Initial Stock'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={editingMaterial ? 'Current Stock' : 'Initial Stock'}
                  className="erp-input"
                  value={formData.current_stock ?? ''}
                  onChange={e => setFormData({ ...formData, current_stock: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Minimum Safety Stock</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Minimum Safety Stock"
                  className="erp-input"
                  value={formData.minimum_stock ?? ''}
                  onChange={e => setFormData({ ...formData, minimum_stock: e.target.value === '' ? ('' as any) : (parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Warehouse Storage Place (r-b-l)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <input
                    type="text"
                    placeholder="Row"
                    className="erp-input"
                    value={warehouseLoc.row}
                    onChange={e => handleWarehouseLocChange('row', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Bay"
                    className="erp-input"
                    value={warehouseLoc.bay}
                    onChange={e => handleWarehouseLocChange('bay', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Level"
                    className="erp-input"
                    value={warehouseLoc.level}
                    onChange={e => handleWarehouseLocChange('level', e.target.value)}
                  />
                </div>
              </div>
              {formData.storage_location && (
                <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '4px', display: 'block' }}>
                  Location Code: {formData.storage_location}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Notes / Specs</label>
              <textarea
                rows={2}
                placeholder="Notes"
                className="erp-input"
                style={{ height: 'auto', resize: 'vertical' }}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingMaterial(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={isStockAdjustmentModalOpen}
        onClose={() => {
          setIsStockAdjustmentModalOpen(false);
          setSelectedMaterialForAdjust(null);
        }}
        title={`Adjust Stock: ${selectedMaterialForAdjust?.name}`}
      >
        <form onSubmit={handleAdjustSubmit}>
          <div className="erp-modal-body">
            <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--erp-text-muted)' }}>
              Current Physical Stock: <strong style={{ color: 'var(--erp-text-main)' }}>{selectedMaterialForAdjust?.current_stock} {selectedMaterialForAdjust?.unit}</strong>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Movement Type *</label>
              <select
                className="erp-select"
                value={adjustData.movementType}
                onChange={e => setAdjustData({ ...adjustData, movementType: e.target.value })}
              >
                <option value="Stock In">Stock In (Intake / Add)</option>
                <option value="Stock Out">Stock Out (Dispatch / Deduct)</option>
                <option value="Adjustment">Direct Adjustment (Set Exact Value)</option>
                <option value="Return">Return to Stock</option>
                <option value="Wastage">Wastage / Scrap</option>
              </select>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">
                {adjustData.movementType === 'Adjustment' ? 'New Exact Stock Level' : 'Quantity'} *
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                value={adjustData.quantity}
                onChange={e => {
                  setAdjustData({ ...adjustData, quantity: parseFloat(e.target.value) || 0 });
                  if (formErrors.quantity) setFormErrors({ ...formErrors, quantity: '' });
                }}
              />
              {formErrors.quantity && (
                <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                  {formErrors.quantity}
                </span>
              )}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Reference Note / Reason</label>
              <input
                type="text"
                placeholder="Reference Note"
                className="erp-input"
                value={adjustData.notes}
                onChange={e => setAdjustData({ ...adjustData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsStockAdjustmentModalOpen(false);
                setSelectedMaterialForAdjust(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="erp-btn erp-btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Updating...' : 'Confirm Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        actionLoading={actionLoading}
      />

    </div>
  );
};
