import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  PackageCheck,
  MoreHorizontal,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import { usePurchasingController } from '../../controllers/usePurchasingController';
import { Modal } from '../components/Modal';
import type { Supplier, Material, PurchaseOrder } from '../../models/types';
import { api } from '../../controllers/apiClient';

export const PurchasingView: React.FC = () => {
  const {
    rawSuppliers,
    orders,
    materials,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreatePOModalOpen,
    setSearchQuery,
    setIsCreatePOModalOpen,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    refresh,
  } = usePurchasingController();

  // Three-dot action menu state
  const [openMenuPOId, setOpenMenuPOId] = useState<number | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuPOId(null);
    };
    if (openMenuPOId !== null) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [openMenuPOId]);

  // Channel filter on main toolbar: 'All' | 'Local' | 'Overseas'
  const [channelFilter, setChannelFilter] = useState<'All' | 'Local' | 'Overseas'>('All');

  // Create / Edit Purchase Order Form State
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [supplierTypeTab, setSupplierTypeTab] = useState<'Local' | 'Overseas'>('Local');
  const [manualPONumber, setManualPONumber] = useState('');
  const [manualSupplierName, setManualSupplierName] = useState('');
  const [manualMaterialText, setManualMaterialText] = useState('');
  const [manualQuantity, setManualQuantity] = useState<number | string>('');
  const [manualUnitPrice, setManualUnitPrice] = useState<number | string>('');
  const [manualDeliveryDate, setManualDeliveryDate] = useState('');
  const [manualTrackingNo, setManualTrackingNo] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreatePO = () => {
    setFormErrors({});
    setEditingPO(null);
    setSupplierTypeTab('Local');
    setManualPONumber('');
    setManualSupplierName('');
    setManualMaterialText('');
    setManualQuantity('');
    setManualUnitPrice('');
    setManualDeliveryDate('');
    setManualTrackingNo('');
    setIsCreatePOModalOpen(true);
  };

  const handleOpenEditPO = (po: PurchaseOrder) => {
    setFormErrors({});
    setEditingPO(po);
    const isOverseas =
      po.supplier?.supplier_type === 'Overseas' ||
      (po.notes?.toLowerCase() || '').includes('oversea');
    setSupplierTypeTab(isOverseas ? 'Overseas' : 'Local');
    setManualPONumber(po.po_number);
    setManualSupplierName(po.supplier?.name || '');

    const firstItem = po.items && po.items.length > 0 ? po.items[0] : null;
    if (firstItem) {
      const matchingMat = materials.find(m => m.id === firstItem.material_id);
      setManualMaterialText(
        matchingMat ? `${matchingMat.code} - ${matchingMat.name}` : (firstItem.material_name || '')
      );
      setManualQuantity(firstItem.quantity);
      setManualUnitPrice(firstItem.unit_cost);
    } else {
      setManualMaterialText('');
      setManualQuantity('');
      setManualUnitPrice('');
    }

    setManualDeliveryDate(
      po.expected_delivery_date ? po.expected_delivery_date.slice(0, 10) : ''
    );
    setManualTrackingNo(po.notes || '');
    setIsCreatePOModalOpen(true);
  };

  const handleSelectTab = (type: 'Local' | 'Overseas') => {
    setSupplierTypeTab(type);
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!manualPONumber.trim()) errors.po_number = 'PO number is required';
    if (!manualSupplierName.trim()) errors.supplier = 'Supplier name is required';
    if (!manualMaterialText.trim()) errors.material = 'Material is required';
    if (Number(manualQuantity) <= 0) errors.quantity = 'Quantity must be greater than 0';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    // 1. Resolve or create supplier
    let supplierId: number | undefined;
    const existingSup = rawSuppliers.find(
      s => s.name.trim().toLowerCase() === manualSupplierName.trim().toLowerCase()
    );

    if (existingSup) {
      supplierId = existingSup.id;
    } else {
      try {
        const createdSup = await api.post<Supplier>('/purchasing/suppliers', {
          name: manualSupplierName.trim(),
          supplier_type: supplierTypeTab,
          lead_time_days: supplierTypeTab === 'Overseas' ? 21 : 7,
        });
        supplierId = createdSup.id;
        refresh();
      } catch (err: any) {
        setFormErrors({ supplier: err.message || 'Failed to register supplier' });
        return;
      }
    }

    // 2. Resolve or create material
    let materialId: number | undefined;
    const existingMat = materials.find(m => {
      const combined = `${m.code} - ${m.name}`.toLowerCase();
      const query = manualMaterialText.trim().toLowerCase();
      return combined === query || m.code.toLowerCase() === query || m.name.toLowerCase() === query;
    });

    if (existingMat) {
      materialId = existingMat.id;
    } else {
      try {
        const parts = manualMaterialText.split(' - ');
        const code = parts.length > 1 ? parts[0].trim() : `MAT-${Date.now().toString().slice(-4)}`;
        const name = parts.length > 1 ? parts.slice(1).join(' - ').trim() : manualMaterialText.trim();
        const createdMat = await api.post<Material>('/materials/', {
          code,
          name,
          category: 'Profile',
          unit: 'pcs',
          unit_cost: Number(manualUnitPrice) || 0,
          current_stock: 0,
          minimum_stock: 0,
        });
        materialId = createdMat.id;
        refresh();
      } catch {
        materialId = materials[0]?.id || 1;
      }
    }

    // 3. Create or Update Purchase Order
    const notesContent = manualTrackingNo.trim()
      ? (manualTrackingNo.trim().toLowerCase().includes('order')
          ? manualTrackingNo.trim()
          : `${supplierTypeTab} order | ${manualTrackingNo.trim()}`)
      : `${supplierTypeTab} order`;

    const itemsPayload = [
      {
        material_id: materialId,
        quantity: Number(manualQuantity) || 1,
        unit_cost: Number(manualUnitPrice) || 0,
      },
    ];

    let success = false;
    if (editingPO) {
      success = await updatePurchaseOrder(editingPO.id, {
        po_number: manualPONumber.trim(),
        supplier_id: supplierId,
        expected_delivery_date: manualDeliveryDate ? new Date(manualDeliveryDate).toISOString() : null,
        notes: notesContent,
        items: itemsPayload,
      });
    } else {
      success = await createPurchaseOrder({
        po_number: manualPONumber.trim(),
        supplier_id: supplierId,
        status: 'Ordered',
        expected_delivery_date: manualDeliveryDate || '',
        notes: notesContent,
        items: itemsPayload,
      });
    }

    if (success) {
      setIsCreatePOModalOpen(false);
      setEditingPO(null);
    }
  };

  // Filter orders by channel (Local vs Overseas)
  const displayedOrders = orders.filter(po => {
    if (channelFilter === 'All') return true;
    const isOverseas =
      po.supplier?.supplier_type === 'Overseas' ||
      (po.notes?.toLowerCase() || '').includes('oversea');
    return channelFilter === 'Overseas' ? isOverseas : !isOverseas;
  });

  return (
    <div className="erp-content">
      {/* Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Field */}
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search PO # or supplier..."
              className="erp-input erp-input-with-icon"
              style={{ width: '360px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Procurement Channel Dropdown Filter */}
          <select
            className="erp-select"
            style={{ width: '150px', flexShrink: 0 }}
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value as 'All' | 'Local' | 'Overseas')}
          >
            <option value="All">All Orders</option>
            <option value="Local">Local Orders</option>
            <option value="Overseas">Overseas Orders</option>
          </select>
        </div>

        <div>
          <button
            className="erp-btn erp-btn-primary"
            onClick={handleOpenCreatePO}
            style={{ gap: '6px' }}
          >
            <Plus size={14} />
            <span>Purchase Order</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Purchase Orders Table */}
      <div className="erp-table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Channel</th>
              <th>Order Date</th>
              <th>Expected Arrival</th>
              <th>Total Value</th>
              <th>Status</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading purchase orders...
                </td>
              </tr>
            ) : displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                  No {channelFilter !== 'All' ? channelFilter.toLowerCase() : ''} purchase orders found.
                </td>
              </tr>
            ) : (
              displayedOrders.map(po => {
                const isOverseas =
                  po.supplier?.supplier_type === 'Overseas' ||
                  (po.notes?.toLowerCase() || '').includes('oversea');
                return (
                  <tr key={po.id}>
                    <td style={{ fontSize: '15px', color: 'var(--erp-text-main)' }}>{po.po_number}</td>
                    <td style={{ fontSize: '15px' }}>{po.supplier?.name || 'N/A'}</td>
                    <td>
                      {isOverseas ? (
                        <span style={{ color: 'var(--erp-primary)', fontWeight: 500 }}>Overseas</span>
                      ) : (
                        <span style={{ color: 'var(--erp-text-muted)', fontWeight: 500 }}>Local</span>
                      )}
                    </td>
                    <td style={{ fontSize: '14.5px' }}>{new Date(po.order_date).toLocaleDateString()}</td>
                    <td>
                      {po.expected_delivery_date ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14.5px' }}>
                          <Calendar size={12} color="var(--erp-text-muted)" />
                          {new Date(po.expected_delivery_date).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ fontSize: '15px' }}>${po.total_cost.toLocaleString()}</td>
                    <td>
                      {po.status === 'Received' ? (
                        <span style={{ color: '#059669', fontWeight: 500 }}>Received</span>
                      ) : po.status === 'In Transit' ? (
                        <span style={{ color: 'var(--erp-primary)', fontWeight: 500 }}>In Transit</span>
                      ) : po.status === 'Ordered' ? (
                        <span style={{ color: '#d97706', fontWeight: 500 }}>Ordered</span>
                      ) : (
                        <span style={{ color: 'var(--erp-text-muted)', fontWeight: 500 }}>{po.status}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="erp-dropdown-container">
                        <button
                          type="button"
                          className="erp-btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPOId(openMenuPOId === po.id ? null : po.id);
                          }}
                          title="Actions"
                          aria-label="Actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openMenuPOId === po.id && (
                          <div className="erp-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            {po.status === 'Ordered' && (
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                onClick={() => {
                                  setOpenMenuPOId(null);
                                  handleOpenEditPO(po);
                                }}
                              >
                                <Pencil size={13} />
                                <span>Edit Order</span>
                              </button>
                            )}

                            {po.status !== 'Received' ? (
                              <button
                                type="button"
                                className="erp-dropdown-item"
                                style={{ color: '#047857' }}
                                disabled={actionLoading}
                                onClick={() => {
                                  setOpenMenuPOId(null);
                                  receivePurchaseOrder(po.id);
                                }}
                              >
                                <PackageCheck size={14} color="#047857" />
                                <span>Receive Stock</span>
                              </button>
                            ) : (
                              <div
                                className="erp-dropdown-item disabled"
                                style={{ color: '#047857', opacity: 0.85 }}
                              >
                                <CheckCircle2 size={14} color="#047857" />
                                <span>Received & Added</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create or Edit Purchase Order */}
      <Modal
        isOpen={isCreatePOModalOpen}
        onClose={() => {
          setIsCreatePOModalOpen(false);
          setEditingPO(null);
        }}
        title={editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
      >
        <form onSubmit={handleCreatePOSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">PO Number *</label>
                <input
                  type="text"
                  placeholder="PO Number"
                  className={`erp-input ${formErrors.po_number ? 'erp-input-error' : ''}`}
                  value={manualPONumber}
                  onChange={e => setManualPONumber(e.target.value)}
                />
                {formErrors.po_number && <span className="erp-form-error">{formErrors.po_number}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Type</label>
                <select
                  className="erp-select"
                  value={supplierTypeTab}
                  onChange={e => handleSelectTab(e.target.value as 'Local' | 'Overseas')}
                >
                  <option value="Local">Local</option>
                  <option value="Overseas">Oversea</option>
                </select>
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Supplier *</label>
                <input
                  type="text"
                  list="supplier-suggestions"
                  placeholder="Supplier Name"
                  className={`erp-input ${formErrors.supplier ? 'erp-input-error' : ''}`}
                  value={manualSupplierName}
                  onChange={e => setManualSupplierName(e.target.value)}
                />
                <datalist id="supplier-suggestions">
                  {rawSuppliers
                    .filter(s => s.supplier_type === supplierTypeTab)
                    .map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                </datalist>
                {formErrors.supplier && <span className="erp-form-error">{formErrors.supplier}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Material to Order *</label>
                <input
                  type="text"
                  list="material-suggestions"
                  placeholder="Material Name or Code"
                  className={`erp-input ${formErrors.material ? 'erp-input-error' : ''}`}
                  value={manualMaterialText}
                  onChange={e => {
                    const val = e.target.value;
                    setManualMaterialText(val);
                    const matched = materials.find(
                      m => `${m.code} - ${m.name}`.toLowerCase() === val.toLowerCase() || m.code.toLowerCase() === val.toLowerCase()
                    );
                    if (matched && matched.unit_cost) {
                      setManualUnitPrice(matched.unit_cost);
                    }
                  }}
                />
                <datalist id="material-suggestions">
                  {materials.map(m => (
                    <option key={m.id} value={`${m.code} - ${m.name}`} />
                  ))}
                </datalist>
                {formErrors.material && <span className="erp-form-error">{formErrors.material}</span>}
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Order Quantity</label>
                <input
                  type="number"
                  placeholder="Order Quantity"
                  className={`erp-input ${formErrors.quantity ? 'erp-input-error' : ''}`}
                  value={manualQuantity}
                  onChange={e => setManualQuantity(e.target.value)}
                />
                {formErrors.quantity && <span className="erp-form-error">{formErrors.quantity}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Price</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className="erp-input"
                  value={manualUnitPrice}
                  onChange={e => setManualUnitPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="erp-input"
                  value={manualDeliveryDate}
                  onChange={e => setManualDeliveryDate(e.target.value)}
                />
              </div>

              {supplierTypeTab === 'Overseas' && (
                <div className="erp-form-group">
                  <label className="erp-form-label">Container / Tracking # (Optional)</label>
                  <input
                    type="text"
                    placeholder="Container or Tracking Number"
                    className="erp-input"
                    value={manualTrackingNo}
                    onChange={e => setManualTrackingNo(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => {
                setIsCreatePOModalOpen(false);
                setEditingPO(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
            >
              {editingPO ? 'Update Purchase Order' : 'Save Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
