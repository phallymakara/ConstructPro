import React, { useState } from 'react';
import {
  Plus,
  Search,
  Truck,
  Building2,
  Calendar,
  PackageCheck
} from 'lucide-react';
import { usePurchasingController } from '../../controllers/usePurchasingController';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { SupplierFormData, PurchaseOrderFormData } from '../../models/types';

export const PurchasingView: React.FC = () => {
  const {
    suppliers,
    rawSuppliers,
    orders,
    materials,
    activeTab,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateSupplierModalOpen,
    isCreatePOModalOpen,
    setActiveTab,
    setSearchQuery,
    setIsCreateSupplierModalOpen,
    setIsCreatePOModalOpen,
    createSupplier,
    createPurchaseOrder,
    receivePurchaseOrder,
  } = usePurchasingController();

  // Create Supplier Form State
  const [newSupplier, setNewSupplier] = useState<SupplierFormData>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    supplier_type: 'Local',
    materials_supplied: '',
    lead_time_days: 7,
    rating: 5,
    notes: '',
  });

  // Create Purchase Order Form State
  const [newPO, setNewPO] = useState<PurchaseOrderFormData>({
    po_number: '',
    supplier_id: rawSuppliers[0]?.id || 1,
    project_id: undefined,
    status: 'Ordered',
    expected_delivery_date: '',
    notes: '',
    items: [{ material_id: materials[0]?.id || 1, quantity: 50, unit_cost: 15.0 }],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newSupplier.name.trim()) errors.name = 'Supplier name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const success = await createSupplier(newSupplier);
    if (success) {
      setNewSupplier({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        supplier_type: 'Local',
        materials_supplied: '',
        lead_time_days: 7,
        rating: 5,
        notes: '',
      });
    }
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newPO.po_number.trim()) errors.po_number = 'PO number is required';
    if (!newPO.supplier_id) errors.supplier_id = 'Please select a supplier';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const success = await createPurchaseOrder(newPO);
    if (success) {
      setNewPO({
        po_number: '',
        supplier_id: rawSuppliers[0]?.id || 1,
        project_id: undefined,
        status: 'Ordered',
        expected_delivery_date: '',
        notes: '',
        items: [{ material_id: materials[0]?.id || 1, quantity: 50, unit_cost: 15.0 }],
      });
    }
  };

  return (
    <div className="erp-content">
      {/* Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder={activeTab === 'orders' ? 'Search PO # or supplier...' : 'Search supplier or material...'}
              className="erp-input erp-input-with-icon"
              style={{ width: '250px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="erp-tab-group">
            <button
              className={`erp-btn erp-btn-sm ${activeTab === 'orders' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
              onClick={() => setActiveTab('orders')}
            >
              <Truck size={12} />
              <span>Purchase Orders</span>
            </button>
            <button
              className={`erp-btn erp-btn-sm ${activeTab === 'suppliers' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
              onClick={() => setActiveTab('suppliers')}
            >
              <Building2 size={12} />
              <span>Suppliers</span>
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'orders' ? (
            <button
              className="erp-btn erp-btn-primary"
              onClick={() => {
                setFormErrors({});
                setIsCreatePOModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>New Purchase Order</span>
            </button>
          ) : (
            <button
              className="erp-btn erp-btn-primary"
              onClick={() => {
                setFormErrors({});
                setIsCreateSupplierModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Main Tab View */}
      {activeTab === 'orders' ? (
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Arrival</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No purchase orders found. Create one or order shortages from a Project.
                  </td>
                </tr>
              ) : (
                orders.map(po => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600 }}>{po.po_number}</td>
                    <td>{po.supplier?.name || 'N/A'}</td>
                    <td>{new Date(po.order_date).toLocaleDateString()}</td>
                    <td>
                      {po.expected_delivery_date ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--erp-text-muted)" />
                          {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>${po.total_cost.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td>
                      {po.status !== 'Received' ? (
                        <button
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={() => receivePurchaseOrder(po.id)}
                          disabled={actionLoading}
                          title="Confirm material receipt into inventory"
                        >
                          <PackageCheck size={12} color="#047857" />
                          <span>Receive Stock</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>
                          Received & Added to Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Suppliers Table */
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Classification</th>
                <th>Materials Supplied</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No suppliers found. Click "Add Supplier" to register one.
                  </td>
                </tr>
              ) : (
                suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>
                      <span className={`erp-badge ${s.supplier_type === 'Local' ? 'erp-badge-draft' : 'erp-badge-blue'}`}>
                        {s.supplier_type}
                      </span>
                    </td>
                    <td>{s.materials_supplied || 'Aluminum profiles, glass & hardware'}</td>
                    <td>{s.contact_person || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.lead_time_days} days</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Supplier */}
      <Modal
        isOpen={isCreateSupplierModalOpen}
        onClose={() => setIsCreateSupplierModalOpen(false)}
        title="Register Material Supplier"
      >
        <form onSubmit={handleCreateSupplierSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="Enter supplier name"
                  className={`erp-input ${formErrors.name ? 'erp-input-error' : ''}`}
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                />
                {formErrors.name && <span className="erp-form-error">{formErrors.name}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Classification</label>
                <select
                  className="erp-select"
                  value={newSupplier.supplier_type}
                  onChange={e => setNewSupplier({ ...newSupplier, supplier_type: e.target.value as 'Local' | 'Overseas' })}
                >
                  <option value="Local">Local Supplier</option>
                  <option value="Overseas">Overseas Supplier</option>
                </select>
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Contact Person</label>
                <input
                  type="text"
                  placeholder="Enter contact person name"
                  className="erp-input"
                  value={newSupplier.contact_person}
                  onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Phone Number</label>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className="erp-input"
                  value={newSupplier.phone}
                  onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Materials Supplied</label>
                <input
                  type="text"
                  placeholder="Enter materials supplied (e.g. Profiles, Hardware)"
                  className="erp-input"
                  value={newSupplier.materials_supplied}
                  onChange={e => setNewSupplier({ ...newSupplier, materials_supplied: e.target.value })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Standard Lead Time (Days)</label>
                <input
                  type="number"
                  placeholder="Enter lead time in days"
                  className="erp-input"
                  value={newSupplier.lead_time_days}
                  onChange={e => setNewSupplier({ ...newSupplier, lead_time_days: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsCreateSupplierModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Purchase Order */}
      <Modal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        title="Create Purchase Order"
      >
        <form onSubmit={handleCreatePOSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">PO Number *</label>
                <input
                  type="text"
                  placeholder="Enter PO number"
                  className={`erp-input ${formErrors.po_number ? 'erp-input-error' : ''}`}
                  value={newPO.po_number}
                  onChange={e => setNewPO({ ...newPO, po_number: e.target.value })}
                />
                {formErrors.po_number && <span className="erp-form-error">{formErrors.po_number}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Supplier *</label>
                <select
                  className={`erp-select ${formErrors.supplier_id ? 'erp-input-error' : ''}`}
                  value={newPO.supplier_id}
                  onChange={e => setNewPO({ ...newPO, supplier_id: Number(e.target.value) })}
                >
                  {rawSuppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.supplier_type})</option>
                  ))}
                </select>
                {formErrors.supplier_id && <span className="erp-form-error">{formErrors.supplier_id}</span>}
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Material to Order</label>
                <select
                  className="erp-select"
                  value={newPO.items[0]?.material_id}
                  onChange={e =>
                    setNewPO({
                      ...newPO,
                      items: [{ ...newPO.items[0], material_id: Number(e.target.value) }],
                    })
                  }
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Order Quantity</label>
                <input
                  type="number"
                  placeholder="Enter order quantity"
                  className="erp-input"
                  value={newPO.items[0]?.quantity}
                  onChange={e =>
                    setNewPO({
                      ...newPO,
                      items: [{ ...newPO.items[0], quantity: Number(e.target.value) }],
                    })
                  }
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter unit price"
                  className="erp-input"
                  value={newPO.items[0]?.unit_cost}
                  onChange={e =>
                    setNewPO({
                      ...newPO,
                      items: [{ ...newPO.items[0], unit_cost: Number(e.target.value) }],
                    })
                  }
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="erp-input"
                  value={newPO.expected_delivery_date}
                  onChange={e => setNewPO({ ...newPO, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsCreatePOModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading || rawSuppliers.length === 0}
            >
              Save Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
