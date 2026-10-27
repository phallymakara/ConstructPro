import React, { useState } from 'react';
import { Plus, Search, CheckCircle2, FileDown } from 'lucide-react';
import { useQuotationsController } from '../../controllers/useQuotationsController';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { exportQuotationToPDF } from '../../utils/exportTemplate';
import type { QuotationFormData } from '../../models/types';

export const QuotationsView: React.FC = () => {
  const {
    quotations,
    customers,
    statusFilter,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    setStatusFilter,
    setSearchQuery,
    setIsCreateModalOpen,
    createQuotation,
    convertToProject,
  } = useQuotationsController();

  const emptyQuote: QuotationFormData = {
    quotation_number: '',
    customer_id: '' as unknown as number,
    status: 'Draft',
    material_cost: '' as unknown as number,
    labor_cost: '' as unknown as number,
    transport_cost: '' as unknown as number,
    installation_cost: '' as unknown as number,
    discount_amount: '' as unknown as number,
    tax_percent: '' as unknown as number,
    valid_until: '',
    notes: '',
  };

  const [newQuote, setNewQuote] = useState<QuotationFormData>(emptyQuote);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dynamic calculation for quotation modal
  const subtotal =
    (Number(newQuote.material_cost) || 0) +
    (Number(newQuote.labor_cost) || 0) +
    (Number(newQuote.transport_cost) || 0) +
    (Number(newQuote.installation_cost) || 0);

  const afterDiscount = Math.max(0, subtotal - (Number(newQuote.discount_amount) || 0));
  const taxAmount = afterDiscount * ((Number(newQuote.tax_percent) || 0) / 100);
  const totalAmount = afterDiscount + taxAmount;
  const directCosts = (Number(newQuote.material_cost) || 0) + (Number(newQuote.transport_cost) || 0);
  const projectedProfit = Math.max(0, totalAmount - directCosts);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newQuote.quotation_number.trim()) errors.quotation_number = 'Quotation number is required';
    if (!newQuote.customer_id) errors.customer_id = 'Please select a customer';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const success = await createQuotation({
      ...newQuote,
      customer_id: Number(newQuote.customer_id),
      material_cost: Number(newQuote.material_cost) || 0,
      labor_cost: Number(newQuote.labor_cost) || 0,
      transport_cost: Number(newQuote.transport_cost) || 0,
      installation_cost: Number(newQuote.installation_cost) || 0,
      discount_amount: Number(newQuote.discount_amount) || 0,
      tax_percent: Number(newQuote.tax_percent) || 0,
    });
    if (success) {
      setNewQuote(emptyQuote);
    }
  };

  return (
    <div className="erp-content">
      {/* Action Bar */}
      <div className="erp-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="erp-input-group">
            <Search className="erp-input-icon" />
            <input
              type="text"
              placeholder="Search quotation # or customer..."
              className="erp-input erp-input-with-icon"
              style={{ width: '260px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="erp-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <button
          className="erp-btn erp-btn-primary"
          onClick={() => {
            setNewQuote(emptyQuote);
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>New Quotation</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Quotation Table */}
      <div className="erp-table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Quotation #</th>
              <th>Customer</th>
              <th>Direct Materials</th>
              <th>Labor & Install</th>
              <th>Total Amount</th>
              <th>Expected Margin</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading quotations...
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                  No quotations found.
                </td>
              </tr>
            ) : (
              quotations.map(quote => (
                <tr key={quote.id}>
                  <td style={{ fontWeight: 400 }}>{quote.quotation_number}</td>
                  <td>{quote.customer?.name || 'N/A'}</td>
                  <td>${quote.material_cost.toLocaleString()}</td>
                  <td>${(quote.labor_cost + quote.installation_cost).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>${quote.total_amount.toLocaleString()}</td>
                  <td style={{ color: 'var(--erp-text-main)' }}>${quote.expected_profit.toLocaleString()}</td>
                  <td>
                    <StatusBadge status={quote.status} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        onClick={() => exportQuotationToPDF(quote, quote.customer?.name || 'Customer')}
                        title="Export Quotation as PDF"
                      >
                        <FileDown size={12} />
                        <span>PDF</span>
                      </button>
                      {quote.status !== 'Approved' ? (
                        <button
                          className="erp-btn erp-btn-secondary erp-btn-sm"
                          onClick={() => convertToProject(quote.id)}
                          disabled={actionLoading}
                          title="Approve and convert into an active Project"
                        >
                          <CheckCircle2 size={12} color="#047857" />
                          <span>Convert</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>
                          Converted
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Quotation */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Quotation & Cost Estimate"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Quotation Number *</label>
                <input
                  type="text"
                  placeholder="Quotation Number"
                  className={`erp-input ${formErrors.quotation_number ? 'erp-input-error' : ''}`}
                  value={newQuote.quotation_number}
                  onChange={e => setNewQuote({ ...newQuote, quotation_number: e.target.value })}
                />
                {formErrors.quotation_number && (
                  <span className="erp-form-error">{formErrors.quotation_number}</span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Customer *</label>
                <select
                  className={`erp-select ${formErrors.customer_id ? 'erp-input-error' : ''}`}
                  value={newQuote.customer_id || ''}
                  onChange={e => setNewQuote({ ...newQuote, customer_id: Number(e.target.value) })}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formErrors.customer_id && (
                  <span className="erp-form-error">{formErrors.customer_id}</span>
                )}
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Estimated Materials ($)</label>
                <input
                  type="number"
                  placeholder="Material Cost"
                  className="erp-input"
                  value={newQuote.material_cost ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, material_cost: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Labor & Fabrication ($)</label>
                <input
                  type="number"
                  placeholder="Labor and Fabrication Cost"
                  className="erp-input"
                  value={newQuote.labor_cost ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, labor_cost: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Transportation ($)</label>
                <input
                  type="number"
                  placeholder="Transportation Cost"
                  className="erp-input"
                  value={newQuote.transport_cost ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, transport_cost: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Site Installation ($)</label>
                <input
                  type="number"
                  placeholder="Site Installation Cost"
                  className="erp-input"
                  value={newQuote.installation_cost ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, installation_cost: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Discount Amount ($)</label>
                <input
                  type="number"
                  placeholder="Discount Amount"
                  className="erp-input"
                  value={newQuote.discount_amount ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, discount_amount: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  placeholder="Tax Rate"
                  className="erp-input"
                  value={newQuote.tax_percent ?? ''}
                  onChange={e => setNewQuote({ ...newQuote, tax_percent: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="erp-info-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <strong>${subtotal.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Quotation Price (inc. Tax):</span>
                <strong style={{ color: 'var(--erp-primary)' }}>${totalAmount.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Expected Profit Margin:</span>
                <span style={{ color: '#047857', fontWeight: 600 }}>${projectedProfit.toLocaleString()}</span>
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Terms & Warranty Notes</label>
              <textarea
                className="erp-input"
                style={{ height: '50px', padding: '6px' }}
                placeholder="Terms and Warranty Notes"
                value={newQuote.notes}
                onChange={e => setNewQuote({ ...newQuote, notes: e.target.value })}
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
              Save Quotation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
