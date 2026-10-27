import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  PackageCheck,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import type { PurchaseOrder } from '../../models/types';

export const PurchaseOrderDetailView: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { poId?: string };
  const poId = params.poId ? Number(params.poId) : null;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPO = useCallback(async () => {
    if (!poId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get<PurchaseOrder>(`/purchasing/orders/${poId}`);
      setPo(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load purchase order details');
    } finally {
      setIsLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    fetchPO();
  }, [fetchPO]);

  const handleReceiveStock = async () => {
    if (!poId) return;
    setActionLoading(true);
    try {
      const updated = await api.post<PurchaseOrder>(`/purchasing/orders/${poId}/receive`, {});
      setPo(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to receive purchase order stock');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="erp-content">
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-muted)' }}>
          Loading purchase order details...
        </div>
      </div>
    );
  }

  if (!po || errorMessage) {
    return (
      <div className="erp-content">
        <div className="erp-action-bar">
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate({ to: '/purchasing' })}
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Purchasing</span>
          </button>
        </div>
        <div className="erp-table-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--erp-text-error)' }}>
          {errorMessage || 'Purchase order not found.'}
        </div>
      </div>
    );
  }

  const isOverseas =
    po.supplier?.supplier_type === 'Overseas' ||
    (po.notes?.toLowerCase() || '').includes('oversea');

  const totalQuantity = (po.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <div className="erp-content" style={{ animation: 'erpFadeIn 0.2s ease-out' }}>
      {/* Top Action & Navigation Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="erp-btn erp-btn-secondary"
            onClick={() => navigate({ to: '/purchasing' })}
            style={{ gap: '6px', height: '35px' }}
          >
            <ArrowLeft size={14} />
            <span>Purchasing</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
              {po.po_number}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor:
                  po.status === 'Received'
                    ? '#10b981'
                    : po.status === 'In Transit'
                    ? '#0284c7'
                    : '#f59e0b',
                color: '#ffffff',
              }}
            >
              {po.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {po.status !== 'Received' ? (
            <button
              type="button"
              className="erp-btn erp-btn-primary"
              disabled={actionLoading}
              onClick={handleReceiveStock}
              style={{ gap: '6px', height: '35px' }}
            >
              <PackageCheck size={14} />
              <span>{actionLoading ? 'Receiving...' : 'Receive Stock'}</span>
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '9999px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={15} color="#ffffff" />
              <span>Stock Received into Warehouse</span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Detail Container: Order Information + Items Table + Notes */}
      <div className="erp-table-container" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Order Details Information Section */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--erp-border)', backgroundColor: 'var(--erp-surface)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '24px',
              alignItems: 'flex-start',
            }}
          >
            {/* Supplier */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                Supplier
              </div>
              <div style={{ fontSize: '15px', fontWeight: 400, color: 'var(--erp-text-main)' }}>
                {po.supplier?.name || 'N/A'}
              </div>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isOverseas ? 'var(--erp-primary)' : 'var(--erp-text-muted)',
                  }}
                >
                  {isOverseas ? 'Overseas' : 'Local'}
                </span>
              </div>
            </div>

            {/* Order Date */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                Order Date
              </div>
              <div style={{ fontSize: '15.5px', fontWeight: 400, color: 'var(--erp-text-main)' }}>
                {new Date(po.order_date).toLocaleDateString()}
              </div>
            </div>

            {/* Expected Arrival */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                Expected Arrival
              </div>
              <div style={{ fontSize: '15.5px', fontWeight: 400, color: 'var(--erp-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {po.expected_delivery_date ? (
                  <>
                    <Calendar size={14} color="var(--erp-text-muted)" />
                    {new Date(po.expected_delivery_date).toLocaleDateString()}
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            {/* Total Value */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--erp-text-muted)', marginBottom: '4px' }}>
                Total Value
              </div>
              <div style={{ fontSize: '23px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
                ${po.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Items Table Header */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--erp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--erp-surface-subtle, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} color="var(--erp-primary)" />
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
              Ordered Items & Line Values
            </span>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--erp-text-muted)' }}>
            {(po.items || []).length} item{(po.items || []).length !== 1 ? 's' : ''} • {totalQuantity} units total
          </span>
        </div>

        {/* Ordered Items Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Item Name</th>
                <th>Item Code</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Line Total</th>
                <th style={{ textAlign: 'center' }}>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, idx) => {
                const lineTotal = (item.quantity || 0) * (item.unit_cost || 0);
                const isItemReceived = (item.received_qty || 0) >= (item.quantity || 0);

                return (
                  <tr key={item.id || idx}>
                    <td style={{ color: 'var(--erp-text-muted)', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ fontSize: '15px', fontWeight: 500, color: 'var(--erp-text-main)' }}>
                      {item.material_name || 'Material Item'}
                    </td>
                    <td style={{ fontSize: '13.5px', color: 'var(--erp-text-muted)' }}>
                      {item.material_code || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '15px', fontWeight: 600 }}>
                      {item.quantity}
                    </td>
                    <td style={{ fontSize: '13.5px', color: 'var(--erp-text-muted)' }}>
                      {item.material_unit || 'pcs'}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '14.5px' }}>
                      ${(item.unit_cost || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '15.5px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
                      ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {po.status === 'Received' || isItemReceived ? (
                        <span style={{ color: '#059669', fontSize: '12.5px', fontWeight: 600 }}>
                          Received ({item.quantity})
                        </span>
                      ) : (
                        <span style={{ color: '#d97706', fontSize: '12.5px', fontWeight: 600 }}>
                          Pending Receipt
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--erp-border)', backgroundColor: 'var(--erp-surface-subtle, #f8fafc)' }}>
                <td colSpan={3} style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--erp-text-main)', padding: '12px 14px' }}>
                  Total
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: 'var(--erp-text-main)' }}>
                  {totalQuantity}
                </td>
                <td colSpan={2} />
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '17px', color: 'var(--erp-text-main)' }}>
                  ${po.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes & Logistics Reference Section */}
        {po.notes && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--erp-border)', backgroundColor: 'var(--erp-surface)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--erp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
              Notes & Logistics Reference
            </div>
            <div style={{ fontSize: '14px', color: 'var(--erp-text-main)', lineHeight: 1.5 }}>
              {po.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
