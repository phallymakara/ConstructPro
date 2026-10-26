import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useCustomersController } from '../../controllers/useCustomersController';
import { Modal } from '../components/Modal';
import type { CustomerFormData } from '../../models/types';

export const CustomersView: React.FC = () => {
  const {
    customers,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    setSearchQuery,
    setIsCreateModalOpen,
    createCustomer,
  } = useCustomersController();

  const [newCust, setNewCust] = useState<CustomerFormData>({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!newCust.name.trim()) errors.name = 'Customer / Contact name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const success = await createCustomer(newCust);
    if (success) {
      setNewCust({
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    }
  };

  return (
    <div className="erp-content">
      {/* Action Bar */}
      <div className="erp-action-bar">
        <div className="erp-input-group">
          <Search className="erp-input-icon" />
          <input
            type="text"
            placeholder="Search customer, company or phone..."
            className="erp-input erp-input-with-icon"
            style={{ width: '280px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          className="erp-btn erp-btn-primary"
          onClick={() => {
            setNewCust({ name: '', company: '', phone: '', email: '', address: '', notes: '' });
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>New Customer</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Customer Directory Table */}
      <div className="erp-table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Customer / Account Name</th>
              <th>Company Organization</th>
              <th>Direct Phone</th>
              <th>Email</th>
              <th>Project Site Location</th>
              <th>Special Notes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                  Loading customer directory...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                  No customer records found.
                </td>
              </tr>
            ) : (
              customers.map(cust => (
                <tr key={cust.id}>
                  <td style={{ fontWeight: 600 }}>{cust.name}</td>
                  <td>{cust.company || '-'}</td>
                  <td>{cust.phone || '-'}</td>
                  <td>{cust.email || '-'}</td>
                  <td>{cust.address || '-'}</td>
                  <td style={{ color: 'var(--erp-text-muted)' }}>{cust.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Customer */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Customer Account"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="erp-modal-body">
            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Customer / Contact Name *</label>
                <input
                  type="text"
                  placeholder="Customer or Contact Name"
                  className={`erp-input ${formErrors.name ? 'erp-input-error' : ''}`}
                  value={newCust.name}
                  onChange={e => setNewCust({ ...newCust, name: e.target.value })}
                />
                {formErrors.name && <span className="erp-form-error">{formErrors.name}</span>}
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Company / Developer</label>
                <input
                  type="text"
                  placeholder="Company or Developer"
                  className="erp-input"
                  value={newCust.company}
                  onChange={e => setNewCust({ ...newCust, company: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-row">
              <div className="erp-form-group">
                <label className="erp-form-label">Phone Number</label>
                <input
                  type="text"
                  placeholder="Phone Number"
                  className="erp-input"
                  value={newCust.phone}
                  onChange={e => setNewCust({ ...newCust, phone: e.target.value })}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-form-label">Email Address</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  className="erp-input"
                  value={newCust.email}
                  onChange={e => setNewCust({ ...newCust, email: e.target.value })}
                />
              </div>
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Site Delivery / Billing Address</label>
              <input
                type="text"
                placeholder="Delivery or Billing Address"
                className="erp-input"
                value={newCust.address}
                onChange={e => setNewCust({ ...newCust, address: e.target.value })}
              />
            </div>

            <div className="erp-form-group">
              <label className="erp-form-label">Customer Preferences / Notes</label>
              <textarea
                className="erp-input"
                style={{ height: '50px', padding: '6px' }}
                placeholder="Customer Preferences or Notes"
                value={newCust.notes}
                onChange={e => setNewCust({ ...newCust, notes: e.target.value })}
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
