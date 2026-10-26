import React from 'react';
import {
  DollarSign,
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useReportsController } from '../../controllers/useReportsController';
import { ProfitabilityTab } from './reports/ProfitabilityTab';
import { MaterialUsageTab } from './reports/MaterialUsageTab';
import { DelaysTab } from './reports/DelaysTab';

export const ReportsView: React.FC = () => {
  const {
    profitability,
    materialUsage,
    delays,
    activeTab,
    isLoading,
    errorMessage,
    totalRevenue,
    totalCosts,
    totalGrossProfit,
    averageMargin,
    setActiveTab,
  } = useReportsController();

  return (
    <div className="erp-content">
      {/* Modern Underline Tab Bar */}
      <div
        className="erp-underline-tabs"
        style={{
          border: '1px solid var(--erp-border)',
          borderRadius: 'var(--erp-radius-card)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          height: '46px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', height: '100%' }}>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'profitability' ? 'active' : ''}`}
            onClick={() => setActiveTab('profitability')}
            style={{ height: '100%' }}
          >
            <DollarSign size={14} />
            <span>Profitability</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
            style={{ height: '100%' }}
          >
            <PackageCheck size={14} />
            <span>Material Usage</span>
          </button>
          <button
            type="button"
            className={`erp-underline-tab ${activeTab === 'delays' ? 'active' : ''}`}
            onClick={() => setActiveTab('delays')}
            style={{ height: '100%' }}
          >
            <AlertTriangle size={14} />
            <span>Delays</span>
          </button>
        </div>

        <button
          type="button"
          className="erp-btn erp-btn-secondary erp-btn-sm"
          onClick={() => window.print()}
          title="Print or export current report"
        >
          <FileSpreadsheet size={13} />
          <span>Print / Export</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '4px 0' }}>
          {errorMessage}
        </div>
      )}

      {/* Tab Panels with Dedicated Components */}
      {activeTab === 'profitability' && (
        <div className="erp-tab-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ProfitabilityTab
            profitability={profitability}
            isLoading={isLoading}
            totalRevenue={totalRevenue}
            totalCosts={totalCosts}
            totalGrossProfit={totalGrossProfit}
            averageMargin={averageMargin}
          />
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="erp-tab-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <MaterialUsageTab
            materialUsage={materialUsage}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeTab === 'delays' && (
        <div className="erp-tab-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DelaysTab
            delays={delays}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
};
