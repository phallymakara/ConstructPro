import React, { useState } from 'react';
import {
  Plus,
  Search,
  PackagePlus,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useMaterialsController } from '../../controllers/useMaterialsController';
import { Modal } from '../components/Modal';
import type { MaterialFormData, MaterialCategory } from '../../models/types';

export const MaterialsView: React.FC = () => {
  const {
    materials,
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
  } = useMaterialsController();

  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');

  // New Material Form State
  const [newMaterial, setNewMaterial] = useState<MaterialFormData>({
    code: '',
    name: '',
    category: 'Profile',
    unit: 'm',
    unit_cost: 0,
    current_stock: 0,
    minimum_stock: 0,
    storage_location: '',
    notes: '',
  });

  // Adjust Stock Form State
  const [adjustData, setAdjustData] = useState<{
    movementType: string;
    quantity: number;
    notes: string;
  }>({
    movementType: 'Receipt',
    quantity: 10,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newMaterial.code.trim()) errors.code = 'Material code is required';
    if (!newMaterial.name.trim()) errors.name = 'Material name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const success = await createMaterial(newMaterial);
    if (success) {
      setNewMaterial({
        code: '',
        name: '',
        category: 'Profile',
        unit: 'm',
        unit_cost: 0,
        current_stock: 0,
        minimum_stock: 0,
        storage_location: '',
        notes: '',
      });
    }
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
    <div className="erp-content">
      {/* Top Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search code or description..."
              className="erp-input erp-input-with-icon"
              style={{ width: '220px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="erp-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Profile">Profiles</option>
            <option value="Glass">Glass</option>
            <option value="Seal">Rubber & Seals</option>
            <option value="Hardware">Hardware</option>
            <option value="Accessory">Accessories</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={e => setShowLowStockOnly(e.target.checked)}
            />
            <span style={{ color: showLowStockOnly ? 'var(--erp-text-error)' : 'inherit' }}>
              Low Stock Only
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="erp-btn erp-btn-secondary"
            onClick={() => setActiveTab(activeTab === 'inventory' ? 'movements' : 'inventory')}
          >
            <History size={14} />
            <span>{activeTab === 'inventory' ? 'Stock Movements Log' : 'Back to Inventory'}</span>
          </button>

          <button
            className="erp-btn erp-btn-primary"
            onClick={() => {
              setFormErrors({});
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Main Table: Inventory Catalog or Movements */}
      {activeTab === 'inventory' ? (
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Material Description</th>
                <th>Category</th>
                <th>Location</th>
                <th>Physical Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Min Safety</th>
                <th>Unit Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No materials found matching criteria.
                  </td>
                </tr>
              ) : (
                materials.map(mat => {
                  const isLow = mat.current_stock <= mat.minimum_stock;
                  return (
                    <tr key={mat.id}>
                      <td style={{ fontWeight: 600 }}>{mat.code}</td>
                      <td>{mat.name}</td>
                      <td>
                        <span className="erp-badge erp-badge-draft">{mat.category}</span>
                      </td>
                      <td>{mat.storage_location || '-'}</td>
                      <td style={{ color: isLow ? 'var(--erp-text-error)' : 'inherit', fontWeight: isLow ? 700 : 400 }}>
                        {mat.current_stock} {mat.unit}
                        {isLow && <AlertTriangle size={12} color="#dc2626" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />}
                      </td>
                      <td>{mat.reserved_stock} {mat.unit}</td>
                      <td style={{ fontWeight: 600 }}>{mat.available_stock} {mat.unit}</td>
                      <td>{mat.minimum_stock} {mat.unit}</td>
                      <td>${mat.unit_cost.toFixed(2)}</td>
                      <td>
                        <button
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={() => {
                            setSelectedMaterialForAdjust(mat);
                            setAdjustData({ movementType: 'Receipt', quantity: 20, notes: '' });
                            setFormErrors({});
                            setIsStockAdjustmentModalOpen(true);
                          }}
                        >
                          <PackagePlus size={12} />
                          <span>Receive / Issue</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Stock Movements Log Table */
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Reference / Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map(mov => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`erp-badge ${mov.movement_type === 'Receipt' ? 'erp-badge-emerald' : mov.movement_type === 'Reservation' ? 'erp-badge-purple' : 'erp-badge-draft'}`}>
                        {mov.movement_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{mov.quantity}</td>
                    <td>${(mov.unit_cost || 0).toFixed(2)}</td>
                    <td>{mov.reference_note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: New Material */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Material to Catalog"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Material Code *</label>
                <input
                  type="text"
                  placeholder="Enter material code"
                  className={`erp-input ${formErrors.code ? 'erp-input-error' : ''}`}
                  value={newMaterial.code}
                  onChange={e => setNewMaterial(m => ({ ...m, code: e.target.value }))}
                />
                {formErrors.code && <span className="erp-form-error">{formErrors.code}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Category</label>
                <select
                  className="erp-select"
                  value={newMaterial.category}
                  onChange={e => setNewMaterial(m => ({ ...m, category: e.target.value as MaterialCategory }))}
                >
                  <option value="Profile">Profile</option>
                  <option value="Glass">Glass</option>
                  <option value="Seal">Seal</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Accessory">Accessory</option>
                </select>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Material Name *</label>
              <input
                type="text"
                placeholder="Enter material name"
                className={`erp-input ${formErrors.name ? 'erp-input-error' : ''}`}
                value={newMaterial.name}
                onChange={e => setNewMaterial(m => ({ ...m, name: e.target.value }))}
              />
              {formErrors.name && <span className="erp-form-error">{formErrors.name}</span>}
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Measurement Unit</label>
                <select
                  className="erp-select"
                  value={newMaterial.unit}
                  onChange={e => setNewMaterial(m => ({ ...m, unit: e.target.value }))}
                >
                  <option value="m">Meters (m)</option>
                  <option value="sq_m">Square Meters (sq_m)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="set">Sets (set)</option>
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter unit cost"
                  className="erp-input"
                  value={newMaterial.unit_cost}
                  onChange={e => setNewMaterial(m => ({ ...m, unit_cost: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Initial Physical Stock</label>
                <input
                  type="number"
                  placeholder="Enter initial physical stock"
                  className="erp-input"
                  value={newMaterial.current_stock}
                  onChange={e => setNewMaterial(m => ({ ...m, current_stock: Number(e.target.value) }))}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Minimum Safety Stock</label>
                <input
                  type="number"
                  placeholder="Enter minimum safety stock"
                  className="erp-input"
                  value={newMaterial.minimum_stock}
                  onChange={e => setNewMaterial(m => ({ ...m, minimum_stock: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Warehouse Storage Location</label>
              <input
                type="text"
                placeholder="Enter warehouse storage location"
                className="erp-input"
                value={newMaterial.storage_location}
                onChange={e => setNewMaterial(m => ({ ...m, storage_location: e.target.value }))}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Save Material
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock */}
      <Modal
        isOpen={isStockAdjustmentModalOpen}
        onClose={() => setIsStockAdjustmentModalOpen(false)}
        title={`Stock Transaction: ${selectedMaterialForAdjust?.name || ''}`}
      >
        <form onSubmit={handleAdjustSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-group">
              <label className="erp-form-label">Transaction Type</label>
              <select
                className="erp-select"
                value={adjustData.movementType}
                onChange={e => setAdjustData(d => ({ ...d, movementType: e.target.value }))}
              >
                <option value="Receipt">Receipt (Incoming Delivery from Supplier)</option>
                <option value="Issue">Issue (Issued to Fabrication Workshop)</option>
                <option value="Wastage">Wastage / Scrap Recording</option>
                <option value="Adjustment">Direct Physical Inventory Count Adjustment</option>
              </select>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">
                Quantity ({selectedMaterialForAdjust?.unit || 'units'}) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter transaction quantity"
                className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                value={adjustData.quantity}
                onChange={e => setAdjustData(d => ({ ...d, quantity: Number(e.target.value) }))}
              />
              {formErrors.quantity && <span className="erp-form-error">{formErrors.quantity}</span>}
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Transaction Reference / Delivery Note</label>
              <input
                type="text"
                placeholder="Enter reference or delivery note"
                className="erp-input"
                value={adjustData.notes}
                onChange={e => setAdjustData(d => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsStockAdjustmentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Post Transaction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
