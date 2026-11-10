import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import { Modal } from '../components/Modal';
import type { PaymentTerm, PaymentTermFormData, PaymentTermMilestone } from '../../models/types';

const TRIGGER_OPTIONS = [
  'Order confirmed',
  'Delivery',
  'Installation done',
  'Invoice issued',
  'Project completion',
];

const DUE_OPTIONS = [
  'Same day',
  '+3 days',
  '+7 days',
  '+15 days',
  '+30 days',
  '+45 days',
  '+60 days',
];

const DEFAULT_MILESTONES: PaymentTermMilestone[] = [
  { milestone: 'Deposit 50%', trigger: 'Order confirmed', percent: 50, due: 'Same day' },
  { milestone: 'Balance on delivery', trigger: 'Delivery', percent: 50, due: 'Same day' },
];

export const PaymentTermsView: React.FC = () => {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [isLoadingTerms, setIsLoadingTerms] = useState<boolean>(true);
  const [isTermModalOpen, setIsTermModalOpen] = useState<boolean>(false);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [termForm, setTermForm] = useState<PaymentTermFormData>({
    name_en: '',
    name_kh: '',
    customer_count: 0,
    is_default: false,
    milestones: DEFAULT_MILESTONES,
  });
  const [termErrors, setTermErrors] = useState<Record<string, string>>({});
  const [isDeletingTermId, setIsDeletingTermId] = useState<number | null>(null);

  const loadPaymentTerms = useCallback(async () => {
    setIsLoadingTerms(true);
    try {
      const data = await api.get<PaymentTerm[]>('/settings/payment-terms');
      setPaymentTerms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load payment terms', err);
    } finally {
      setIsLoadingTerms(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentTerms();
  }, [loadPaymentTerms]);

  const handleOpenNewTerm = () => {
    setEditingTermId(null);
    setTermForm({
      name_en: '',
      name_kh: '',
      customer_count: 0,
      is_default: false,
      milestones: [
        { milestone: 'Deposit 50%', trigger: 'Order confirmed', percent: 50, due: 'Same day' },
        { milestone: 'Balance on delivery', trigger: 'Delivery', percent: 50, due: 'Same day' },
      ],
    });
    setTermErrors({});
    setIsTermModalOpen(true);
  };

  const handleOpenEditTerm = (term: PaymentTerm) => {
    setEditingTermId(term.id);
    setTermForm({
      name_en: term.name_en,
      name_kh: term.name_kh || '',
      customer_count: term.customer_count || 0,
      is_default: term.is_default || false,
      milestones: term.milestones && term.milestones.length > 0 ? [...term.milestones] : DEFAULT_MILESTONES,
    });
    setTermErrors({});
    setIsTermModalOpen(true);
  };

  const handleAddMilestone = () => {
    setTermForm(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { milestone: 'Next Milestone', trigger: 'Delivery', percent: 0, due: 'Same day' },
      ],
    }));
  };

  const handleRemoveMilestone = (index: number) => {
    if (termForm.milestones.length <= 1) return;
    setTermForm(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  const handleMilestoneChange = (index: number, field: keyof PaymentTermMilestone, value: any) => {
    setTermForm(prev => {
      const updated = [...prev.milestones];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, milestones: updated };
    });
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!termForm.name_en.trim()) errs.name_en = 'English name is required.';

    const totalPercent = termForm.milestones.reduce((sum, m) => sum + (Number(m.percent) || 0), 0);
    if (Math.round(totalPercent) !== 100) {
      errs.milestones = `Milestone percentages must total exactly 100% (currently ${totalPercent}%).`;
    }

    if (Object.keys(errs).length > 0) {
      setTermErrors(errs);
      return;
    }

    try {
      const payload = {
        ...termForm,
        milestones: termForm.milestones.map(m => ({
          ...m,
          percent: Number(m.percent) || 0,
        })),
      };

      if (editingTermId) {
        const updated = await api.put<PaymentTerm>(`/settings/payment-terms/${editingTermId}`, payload);
        setPaymentTerms(prev => prev.map(t => (t.id === editingTermId ? updated : t)));
      } else {
        const created = await api.post<PaymentTerm>('/settings/payment-terms', payload);
        setPaymentTerms(prev => [...prev, created]);
      }
      setIsTermModalOpen(false);
    } catch (err: any) {
      setTermErrors({ form: err.message || 'Failed to save payment term.' });
    }
  };

  const handleDeleteTerm = async (termId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment term?')) return;
    setIsDeletingTermId(termId);
    try {
      await api.delete(`/settings/payment-terms/${termId}`);
      setPaymentTerms(prev => prev.filter(t => t.id !== termId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment term');
    } finally {
      setIsDeletingTermId(null);
    }
  };

  return (
    <div
      className="erp-content"
      style={{
        animation: 'erpFadeIn 0.2s ease-out',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Unified Frame */}
      <div
        style={{
          border: '1px solid var(--erp-border)',
          borderRadius: 'var(--erp-radius-card)',
          backgroundColor: 'var(--erp-surface)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header Action Row */}
        <div
          style={{
            padding: '0 18px',
            borderBottom: '1px solid var(--erp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'var(--erp-surface)',
            minHeight: '48px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={15} style={{ color: 'var(--erp-primary)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
              Payment Terms
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenNewTerm}
            className="erp-btn erp-btn-primary erp-btn-sm"
            style={{ height: '32px', gap: '6px' }}
          >
            <Plus size={14} />
            <span>New Term</span>
          </button>
        </div>

        {/* Content Area */}
        <div
          className="erp-tab-content"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            gap: '18px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
              Payment Terms
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
              Templates used on quotations. Invoices and due dates are generated from these automatically.
            </div>
          </div>

          {isLoadingTerms ? (
            <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '13px' }}>
              Loading payment terms...
            </div>
          ) : paymentTerms.length === 0 ? (
            <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '13px' }}>
              No payment terms configured. Click <strong>New Term</strong> above to create one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {paymentTerms.map(term => (
                <div
                  key={term.id}
                  style={{
                    border: '1px solid var(--erp-border)',
                    borderRadius: 'var(--erp-radius-card)',
                    backgroundColor: 'var(--erp-surface)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Top Row: Title, Khmer Subtitle & Usage */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                        {term.name_en}
                      </div>
                      {term.name_kh && (
                        <div
                          style={{
                            fontFamily: "'Kantumruy Pro', 'Siemreap', sans-serif",
                            fontSize: '13px',
                            color: 'var(--erp-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {term.name_kh}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--erp-surface-hover)',
                          border: '1px solid var(--erp-border)',
                          color: 'var(--erp-text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        Used by {term.customer_count ?? 0} customers as default
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenEditTerm(term)}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ height: '28px', padding: '0 8px', gap: '4px', fontSize: '12px' }}
                        title="Edit Payment Term"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(term.id)}
                        disabled={isDeletingTermId === term.id}
                        className="erp-btn erp-btn-secondary erp-btn-sm"
                        style={{ height: '28px', padding: '0 8px', color: '#b91c1c' }}
                        title="Delete Payment Term"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Milestones Table */}
                  <table className="erp-table" style={{ width: '100%', fontSize: '12.5px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Milestone</th>
                        <th style={{ width: '30%' }}>Trigger</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>%</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(term.milestones || []).map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{m.milestone}</td>
                          <td style={{ color: 'var(--erp-text-muted)' }}>{m.trigger}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.percent}%</td>
                          <td style={{ textAlign: 'right', color: 'var(--erp-text-muted)' }}>{m.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New / Edit Payment Term Modal */}
      <Modal
        isOpen={isTermModalOpen}
        onClose={() => setIsTermModalOpen(false)}
        title={editingTermId ? 'Edit Payment Term' : 'New Payment Term'}
        maxWidth="620px"
      >
        <form onSubmit={handleSaveTerm}>
          <div className="erp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {termErrors.form && (
              <div style={{ color: '#b91c1c', fontSize: '12px' }}>
                {termErrors.form}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="erp-form-group">
                <label className="erp-form-label">Term Name (English) *</label>
                <input
                  type="text"
                  required
                  className={`erp-input ${termErrors.name_en ? 'error' : ''}`}
                  value={termForm.name_en}
                  onChange={e => setTermForm(prev => ({ ...prev, name_en: e.target.value }))}
                />
                {termErrors.name_en && (
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '3px', display: 'block' }}>
                    {termErrors.name_en}
                  </span>
                )}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Term Name (Khmer)</label>
                <input
                  type="text"
                  className="erp-input"
                  style={{ fontFamily: "'Kantumruy Pro', 'Siemreap', sans-serif" }}
                  value={termForm.name_kh}
                  onChange={e => setTermForm(prev => ({ ...prev, name_kh: e.target.value }))}
                />
              </div>
            </div>

            {/* Milestones list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                  Milestone Schedule
                </span>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="erp-btn erp-btn-secondary erp-btn-sm"
                  style={{ height: '26px', fontSize: '12px', gap: '4px' }}
                >
                  <Plus size={12} />
                  <span>Add Milestone</span>
                </button>
              </div>

              {termErrors.milestones && (
                <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>
                  {termErrors.milestones}
                </div>
              )}

              <table className="erp-table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Milestone</th>
                    <th style={{ width: '30%' }}>Trigger</th>
                    <th style={{ width: '18%' }}>%</th>
                    <th style={{ width: '16%' }}>Due</th>
                    <th style={{ width: '6%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {termForm.milestones.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          required
                          className="erp-input"
                          style={{ height: '28px', fontSize: '12px' }}
                          value={m.milestone}
                          onChange={e => handleMilestoneChange(idx, 'milestone', e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <select
                          className="erp-select"
                          style={{ height: '28px', fontSize: '12px' }}
                          value={m.trigger}
                          onChange={e => handleMilestoneChange(idx, 'trigger', e.target.value)}
                        >
                          {TRIGGER_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="100"
                          required
                          className="erp-input"
                          style={{ height: '28px', fontSize: '12px', textAlign: 'center' }}
                          value={m.percent}
                          onChange={e => handleMilestoneChange(idx, 'percent', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <select
                          className="erp-select"
                          style={{ height: '28px', fontSize: '12px' }}
                          value={m.due}
                          onChange={e => handleMilestoneChange(idx, 'due', e.target.value)}
                        >
                          {DUE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        {termForm.milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                            title="Delete Row"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total percentage check */}
              {(() => {
                const total = termForm.milestones.reduce((acc, m) => acc + (Number(m.percent) || 0), 0);
                const is100 = Math.round(total) === 100;
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      marginTop: '6px',
                      color: is100 ? '#16a34a' : '#b91c1c',
                      fontWeight: 600,
                    }}
                  >
                    <span>Total Allocated: {total}%</span>
                    {is100 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="erp-modal-footer">
            <button
              type="button"
              className="erp-btn erp-btn-secondary"
              onClick={() => setIsTermModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="erp-btn erp-btn-primary"
            >
              {editingTermId ? 'Update Term' : 'Save Term'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

