import React from 'react';

interface StatusBadgeProps {
  status: string;
  style?: React.CSSProperties;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style, className = '' }) => {
  let badgeClass = 'erp-badge-draft';


  switch (status) {
    case 'Draft':
      badgeClass = 'erp-badge-draft';
      break;
    case 'Starting':
      badgeClass = 'erp-badge-blue';
      break;
    case 'In Progress':
    case 'Inprogress':
      badgeClass = 'erp-badge-amber';
      break;
    case 'Overdue':
      badgeClass = 'erp-badge-rose';
      break;
    case 'Quotation':
    case 'Sent':
      badgeClass = 'erp-badge-quotation';
      break;
    case 'Approved':
    case 'Completed':
    case 'Reserved':
      badgeClass = 'erp-badge-emerald';
      break;
    case 'Material Preparation':
    case 'Issued':
      badgeClass = 'erp-badge-purple';
      break;
    case 'Production':
    case 'Installation':
    case 'Ready for Delivery':
      badgeClass = 'erp-badge-amber';
      break;
    case 'Cancelled':
    case 'Canceled':
    case 'Rejected':
    case 'Shortage':
      badgeClass = 'erp-badge-rose';
      break;
    default:
      badgeClass = 'erp-badge-draft';
  }

  return <span className={`erp-badge ${badgeClass} ${className}`.trim()} style={style}>{status}</span>;
};
