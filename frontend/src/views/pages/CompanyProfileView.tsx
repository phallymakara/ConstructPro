import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../controllers/apiClient';
import type { CompanyProfile } from '../../models/types';

export const CompanyProfileView: React.FC = () => {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    company_name_kh: 'ដេប៉ូ វឌ្ឍនា កញ្ចក់ និងអាលុយមីញ៉ូម',
    company_name_en: 'WATTANA GLASS & ALUMINIUM',
    address: '#31-33, National Road 1, Chbar Ampov, Phnom Penh',
    phone: '0XX XXX XXX',
    telegram: '@wattana',
    vat_tin: 'K00X-XXXXXXXXX',
    bank_name: 'ABA Bank',
    account_name: 'WATTANA GLASS & ALUMINIUM',
    account_number: '000 000 000',
    doc_numbering_quotation: 'QT-YYMM-###',
    doc_numbering_sales_order: 'SO-YYMM-###',
    doc_numbering_delivery_note: 'DN-YYMM-###',
    doc_numbering_invoice: 'INV-YYMM-###',
    doc_numbering_receipt: 'RC-YYMM-###',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const loadCompanyProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const data = await api.get<CompanyProfile>('/settings/company-profile');
      if (data) {
        setCompanyProfile(data);
      }
    } catch (err: any) {
      console.error('Failed to load company profile', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadCompanyProfile();
  }, [loadCompanyProfile]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const updated = await api.put<CompanyProfile>('/settings/company-profile', companyProfile);
      setCompanyProfile(updated);
      setProfileSuccessMsg('Company profile saved successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to save company profile.');
    } finally {
      setIsSavingProfile(false);
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
            <Building2 size={15} style={{ color: 'var(--erp-primary)' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--erp-text-main)' }}>
              Company Profile
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSaveProfile()}
            disabled={isSavingProfile}
            className="erp-btn erp-btn-primary erp-btn-sm"
            style={{ height: '32px', gap: '6px' }}
          >
            <Save size={14} />
            <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>

        {/* Content Area */}
        <form
          onSubmit={handleSaveProfile}
          className="erp-tab-content"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            gap: '24px',
          }}
        >
          {/* Header Subtitle */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
              Company Profile
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
              Printed on every quotation, delivery note, invoice and receipt
            </div>
          </div>

          {profileSuccessMsg && (
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid #86efac',
                backgroundColor: '#f0fdf4',
                borderRadius: 'var(--erp-radius-input)',
                color: '#15803d',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div style={{ color: '#b91c1c', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          {isLoadingProfile ? (
            <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '13px' }}>
              Loading company profile...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Section 1: General Info */}
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '12px' }}>
                  Company Identity
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="erp-form-group">
                    <label className="erp-form-label">Company name (Khmer)</label>
                    <input
                      type="text"
                      className="erp-input"
                      style={{ fontFamily: "'Kantumruy Pro', 'Siemreap', sans-serif" }}
                      value={companyProfile.company_name_kh}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, company_name_kh: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Company name (English)</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.company_name_en}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, company_name_en: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="erp-form-label">Address</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.address}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Phone</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.phone}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Telegram</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.telegram}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, telegram: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">VAT TIN</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.vat_tin}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, vat_tin: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--erp-border)' }} />

              {/* Section 2: Bank Details */}
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '12px' }}>
                  Bank & Settlement Account
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div className="erp-form-group">
                    <label className="erp-form-label">Bank</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.bank_name}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, bank_name: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Account name</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.account_name}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, account_name: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Account number</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.account_number}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, account_number: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--erp-border)' }} />

              {/* Section 3: Document Numbering */}
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '12px' }}>
                  Document numbering
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                  <div className="erp-form-group">
                    <label className="erp-form-label">Quotation</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.doc_numbering_quotation}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, doc_numbering_quotation: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Sales order</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.doc_numbering_sales_order}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, doc_numbering_sales_order: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Delivery note</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.doc_numbering_delivery_note}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, doc_numbering_delivery_note: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Invoice</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.doc_numbering_invoice}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, doc_numbering_invoice: e.target.value }))}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label className="erp-form-label">Receipt</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={companyProfile.doc_numbering_receipt}
                      onChange={e => setCompanyProfile(prev => ({ ...prev, doc_numbering_receipt: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--erp-border)' }} />

              {/* Section 4: Payment rating rule */}
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--erp-text-main)', display: 'block', marginBottom: '12px' }}>
                  Payment rating rule
                </span>

                <table className="erp-table" style={{ width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Grade</th>
                      <th style={{ width: '28%' }}>Classification</th>
                      <th style={{ width: '60%' }}>Criteria / Behavior</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>A</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>Excellent</td>
                      <td style={{ color: 'var(--erp-text-muted)' }}>Always pays on time</td>
                    </tr>
                    <tr>
                      <td>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>B</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>Good</td>
                      <td style={{ color: 'var(--erp-text-muted)' }}>Slightly late (1–15 days)</td>
                    </tr>
                    <tr>
                      <td>
                        <span style={{ fontWeight: 700, color: '#d97706' }}>C</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>Watch</td>
                      <td style={{ color: 'var(--erp-text-muted)' }}>Late 16–30 days</td>
                    </tr>
                    <tr>
                      <td>
                        <span style={{ fontWeight: 700, color: '#dc2626' }}>D</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>High risk</td>
                      <td style={{ color: 'var(--erp-text-muted)' }}>More than 30 days late</td>
                    </tr>
                    <tr>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--erp-text-muted)' }}>New</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>New customer</td>
                      <td style={{ color: 'var(--erp-text-muted)' }}>No payment history yet</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

