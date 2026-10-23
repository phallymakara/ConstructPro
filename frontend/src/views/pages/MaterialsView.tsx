import React, { useState } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  ScanLine,
  Barcode as BarcodeIcon,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Boxes,
  FolderTree,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useMaterialsController } from '../../controllers/useMaterialsController';
import { Modal } from '../components/Modal';
import { BarcodeMovementModal } from '../components/BarcodeMovementModal';
import { BarcodeLabelModal } from '../components/BarcodeLabelModal';
import { CategoryManageModal } from '../components/CategoryManageModal';
import type { Material, MaterialFormData } from '../../models/types';

export const MaterialsView: React.FC = () => {
  const {
    materials,
    categories,
    groupedInventory,
    totalCount,
    filteredCount,
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
  } = useMaterialsController();

  // Collapsed state for category sections
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // New / Edit Product Form State
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    barcode: '',
    category: 'Profiles',
    product_type: 'Standard',
    unit: 'm',
    unit_cost: 0,
    current_stock: 0,
    minimum_stock: 0,
    storage_location: '',
    notes: '',
  });

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

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleOpenCreateModal = (defaultCategory?: string) => {
    setFormErrors({});
    const initialCategory =
      defaultCategory ||
      (categoryFilter !== 'All' ? categoryFilter : (existingCategories[0] || 'Profiles'));

    setFormData({
      code: '',
      name: '',
      barcode: '',
      category: initialCategory,
      product_type: productTypeFilter !== 'All' ? productTypeFilter : 'Standard',
      unit: 'm',
      unit_cost: 0,
      current_stock: 0,
      minimum_stock: 5,
      storage_location: '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (mat: Material) => {
    setFormErrors({});
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

  return (
    <div className="erp-content" style={{ animation: 'erpFadeIn 0.2s ease-out' }}>
      {/* Top Action Bar */}
      <div
        className="erp-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: '12px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {/* Search Box */}
          <div className="erp-input-group" style={{ width: '380px', flexShrink: 0 }}>
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search"
              className="erp-input erp-input-with-icon"
              style={{ width: '100%' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="erp-select"
            style={{ width: '145px', flexShrink: 0 }}
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
            style={{ width: '135px', flexShrink: 0 }}
            value={productTypeFilter}
            onChange={e => setProductTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {existingProductTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={e => setShowLowStockOnly(e.target.checked)}
            />
            <span style={{ color: showLowStockOnly ? 'var(--erp-text-error)' : 'inherit' }}>
              Low Stock Alert
            </span>
          </label>
        </div>

        {/* Action Buttons: Categories, Barcode Scan (Icon only), Product */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {/* Categories Button */}
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{ gap: '6px', whiteSpace: 'nowrap' }}
            title="Manage Categories"
          >
            <FolderTree size={14} />
            <span>Categories</span>
          </button>

          {/* Barcode Movement Button (Icon Only) */}
          <button
            className="erp-btn"
            style={{
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              width: '36px',
              height: '36px',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--erp-radius-sm)',
              flexShrink: 0,
            }}
            onClick={() => setIsBarcodeMovementModalOpen(true)}
            title="Scan Barcode (Stock In / Out)"
          >
            <ScanLine size={16} />
          </button>

          {/* Product Button */}
          <button
            className="erp-btn erp-btn-primary"
            onClick={() => handleOpenCreateModal()}
            style={{ gap: '6px', whiteSpace: 'nowrap' }}
            title="Add Product"
          >
            <Plus size={14} />
            <span>Product</span>
          </button>
        </div>
      </div>

      {/* Clean Uncontained Error Message */}
      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '0 4px' }}>
          {errorMessage}
        </div>
      )}

      {/* Main View Area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isLoading ? (
          <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
            Loading inventory catalog...
          </div>
        ) : groupedInventory.length === 0 ? (
          <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
            No inventory products found matching your search.
          </div>
        ) : (
          groupedInventory.map(group => {
            const isCollapsed = !!collapsedCategories[group.category];
            return (
              <div
                key={group.category}
                style={{
                  border: '1px solid var(--erp-border)',
                  borderRadius: 'var(--erp-radius-card)',
                  backgroundColor: 'var(--erp-surface)',
                  overflow: 'hidden',
                }}
              >
                {/* Category Header Row */}
                <div
                  onClick={() => toggleCategoryCollapse(group.category)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--erp-surface-hover)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--erp-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
                      {group.category}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                      ({group.totalItems} items)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--erp-text-muted)' }}>
                      On-hand Stock: <strong style={{ color: 'var(--erp-text-main)' }}>{group.totalStock.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Category Content: Subgrouped by Product Type */}
                {!isCollapsed && (
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {group.types.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '12.5px' }}>
                        No products in this category yet.
                      </div>
                    ) : (
                      group.types.map(subType => (
                        <div key={subType.productType}>
                          {/* Product Type Sub-header */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '6px',
                              paddingBottom: '4px',
                              borderBottom: '1px dashed var(--erp-border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Boxes size={14} style={{ color: 'var(--erp-primary)' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                                {subType.productType}
                              </span>
                              <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)' }}>
                                ({subType.items.length} items)
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--erp-text-muted)' }}>
                              Type Stock: <strong>{subType.totalStock.toLocaleString()}</strong>
                            </span>
                          </div>

                          {/* 3-Column Table: Name, Qty, Action */}
                          <div className="erp-table-container" style={{ margin: 0 }}>
                            <table className="erp-table" style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '60%' }}>Name</th>
                                  <th style={{ width: '25%' }}>Qty</th>
                                  <th style={{ width: '15%', textAlign: 'right' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {subType.items.map(item => {
                                  const isLow = (item.current_stock || 0) <= (item.minimum_stock || 0);
                                  return (
                                    <tr key={item.id}>
                                      {/* Name Column: Product Name, Item Code, Barcode, Location */}
                                      <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                          <span style={{ fontWeight: 600, color: 'var(--erp-text-main)' }}>
                                            {item.name}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--erp-text-muted)' }}>
                                              Code: {item.code}
                                            </span>
                                            <span
                                              style={{
                                                fontFamily: 'monospace',
                                                fontSize: '11px',
                                                padding: '1px 5px',
                                                borderRadius: 'var(--erp-radius-sm)',
                                                backgroundColor: 'var(--erp-surface-hover)',
                                                color: 'var(--erp-text-main)',
                                                border: '1px solid var(--erp-border)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                              }}
                                              title={`Barcode: ${item.barcode || item.code}`}
                                            >
                                              <BarcodeIcon size={11} />
                                              {item.barcode || item.code}
                                            </span>
                                            {item.storage_location && (
                                              <span style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>
                                                {item.storage_location}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Qty Column with Unit and Low Stock Alert */}
                                      <td>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: isLow ? 'var(--erp-text-error)' : 'inherit', fontWeight: isLow ? 700 : 500, fontSize: '14px' }}>
                                            {item.current_stock} {item.unit}
                                          </span>
                                          {isLow && (
                                            <span
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '11px',
                                                color: 'var(--erp-text-error)',
                                              }}
                                              title={`Low stock alert! Min required: ${item.minimum_stock} ${item.unit}`}
                                            >
                                              <AlertTriangle size={12} color="#dc2626" />
                                              <span>Low</span>
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Action Column */}
                                      <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                          <button
                                            type="button"
                                            className="erp-btn erp-btn-secondary erp-btn-sm"
                                            style={{ padding: '3px 6px' }}
                                            onClick={() => handleOpenQuickAdjust(item)}
                                            title="Quick Stock In / Out"
                                          >
                                            <SlidersHorizontal size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            className="erp-btn erp-btn-secondary erp-btn-sm"
                                            style={{ padding: '3px 6px' }}
                                            onClick={() => setSelectedMaterialForBarcodeLabel(item)}
                                            title="Print Barcode Label"
                                          >
                                            <BarcodeIcon size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            className="erp-btn erp-btn-secondary erp-btn-sm"
                                            style={{ padding: '3px 6px' }}
                                            onClick={() => handleOpenEditModal(item)}
                                            title="Edit Product"
                                          >
                                            <Edit2 size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            className="erp-btn erp-btn-secondary erp-btn-sm"
                                            style={{ padding: '3px 6px', color: '#b91c1c' }}
                                            onClick={() => {
                                              if (window.confirm(`Delete product "${item.name}"?`)) {
                                                deleteMaterial(item.id);
                                              }
                                            }}
                                            title="Delete Product"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Barcode Movement Scanner Modal */}
      <BarcodeMovementModal
        isOpen={isBarcodeMovementModalOpen}
        onClose={() => setIsBarcodeMovementModalOpen(false)}
        findMaterialByBarcode={findMaterialByBarcode}
        recordStockMovement={recordStockMovement}
        actionLoading={actionLoading}
      />

      {/* Barcode Label Modal */}
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
                <label className="erp-form-label">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="erp-input"
                  value={formData.unit_cost}
                  onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
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
                  className="erp-input"
                  value={formData.current_stock}
                  onChange={e => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Minimum Safety Stock</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="erp-input"
                  value={formData.minimum_stock}
                  onChange={e => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Storage Location</label>
              <input
                type="text"
                placeholder="Storage Location"
                className="erp-input"
                value={formData.storage_location}
                onChange={e => setFormData({ ...formData, storage_location: e.target.value })}
              />
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
