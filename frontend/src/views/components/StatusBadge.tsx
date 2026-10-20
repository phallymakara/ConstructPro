import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeClass = 'erp-badge-draft';

  switch (status) {
    case 'Draft':
      badgeClass = 'erp-badge-draft';
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
    case 'Rejected':
    case 'Shortage':
      badgeClass = 'erp-badge-rose';
      break;
    default:
      badgeClass = 'erp-badge-draft';
  }

  return <span className={`erp-badge ${badgeClass}`}>{status}</span>;
};
