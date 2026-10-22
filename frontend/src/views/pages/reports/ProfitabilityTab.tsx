import React from 'react';
import { DollarSign } from 'lucide-react';
import type { ProjectProfitabilityReportItem } from '../../../models/types';

export interface ProfitabilityTabProps {
  profitability?: ProjectProfitabilityReportItem[];
  isLoading?: boolean;
  totalRevenue?: number;
  totalCosts?: number;
  totalGrossProfit?: number;
  averageMargin?: number;
}

export const ProfitabilityTab: React.FC<ProfitabilityTabProps> = ({
  profitability = [],
  isLoading = false,
}) => {
  return (
    <div className="erp-tab-panel">
      {/* Tab Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--erp-text-main)', margin: 0 }}>
          Profitability Analysis
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--erp-text-muted)', margin: '4px 0 0 0' }}>
          Evaluate project revenue, direct execution costs, and gross profit margins.
        </p>
      </div>

      {/* Analysis Workspace Container */}
      <div
        style={{
          border: '1px solid var(--erp-border)',
          borderRadius: 'var(--erp-radius-card)',
          backgroundColor: 'var(--erp-surface)',
          padding: '24px',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--erp-radius-sm)',
            border: '1px solid var(--erp-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            color: 'var(--erp-primary)',
          }}
        >
          <DollarSign size={20} />
        </div>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '4px' }}>
            {isLoading ? 'Loading records...' : 'Profitability Tab Ready'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', lineHeight: 1.5 }}>
            {profitability.length > 0
              ? `${profitability.length} project records connected. This component is ready for your analysis. Specify what metrics or tables you would like to display.`
              : 'This component is ready for your analysis. Specify which metrics, charts, or project breakdown tables should be displayed in this tab.'}
          </div>
        </div>
      </div>
    </div>
  );
};
