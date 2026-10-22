import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DelayedProjectReportItem } from '../../../models/types';

export interface DelaysTabProps {
  delays?: DelayedProjectReportItem[];
  isLoading?: boolean;
}

export const DelaysTab: React.FC<DelaysTabProps> = ({
  delays = [],
  isLoading = false,
}) => {
  return (
    <div className="erp-tab-panel">
      {/* Tab Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--erp-text-main)', margin: 0 }}>
          Project Delays Analysis
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--erp-text-muted)', margin: '4px 0 0 0' }}>
          Monitor timeline variances, delayed project milestones, and critical delivery paths.
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
            color: delays.length > 0 ? '#ef4444' : '#64748b',
          }}
        >
          <AlertTriangle size={20} />
        </div>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '4px' }}>
            {isLoading ? 'Checking project schedules...' : 'Delays Tab Ready'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', lineHeight: 1.5 }}>
            {delays.length > 0
              ? `${delays.length} delayed projects tracked. This component is ready for your analysis. Specify what metrics or tables you would like to display.`
              : 'This component is ready for your analysis. Specify which schedule metrics, delay indicators, or overdue project listings should be displayed in this tab.'}
          </div>
        </div>
      </div>
    </div>
  );
};
