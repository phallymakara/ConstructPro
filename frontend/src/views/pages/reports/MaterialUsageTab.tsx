import React from 'react';
import { PackageCheck } from 'lucide-react';
import type { MaterialUsageReportItem } from '../../../models/types';

export interface MaterialUsageTabProps {
  materialUsage?: MaterialUsageReportItem[];
  isLoading?: boolean;
}

export const MaterialUsageTab: React.FC<MaterialUsageTabProps> = ({
  materialUsage = [],
  isLoading = false,
}) => {
  return (
    <div className="erp-tab-panel">
      {/* Tab Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--erp-text-main)', margin: 0 }}>
          Material Usage Analysis
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--erp-text-muted)', margin: '4px 0 0 0' }}>
          Track inventory consumption, project material reservations, and scrap/wastage ratios.
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
          <PackageCheck size={20} />
        </div>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '4px' }}>
            {isLoading ? 'Loading records...' : 'Material Usage Tab Ready'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', lineHeight: 1.5 }}>
            {materialUsage.length > 0
              ? `${materialUsage.length} material records connected. This component is ready for your analysis. Specify what metrics or tables you would like to display.`
              : 'This component is ready for your analysis. Specify which material consumption metrics, inventory breakdown, or scrap tracking tables should be displayed in this tab.'}
          </div>
        </div>
      </div>
    </div>
  );
};
