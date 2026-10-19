import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, icon }) => {
  return (
    <div className="erp-metric-card">
      <div className="erp-metric-header">
        <span>{label}</span>
        {icon}
      </div>
      <div className="erp-metric-value">{value}</div>
      {subtext && <div className="erp-metric-footer">{subtext}</div>}
    </div>
  );
};
