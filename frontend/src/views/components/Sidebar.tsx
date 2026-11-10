import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  ShoppingCart,
  Hammer,
  Briefcase,
  CreditCard,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const operationItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="erp-nav-item-icon" /> },
    { to: '/sale', label: 'Sales', icon: <Briefcase className="erp-nav-item-icon" /> },
    { to: '/projects', label: 'Projects', icon: <FolderKanban className="erp-nav-item-icon" /> },
    { to: '/warehouse', label: 'Warehouse', icon: <Package className="erp-nav-item-icon" /> },
    { to: '/purchasing', label: 'Purchasing', icon: <ShoppingCart className="erp-nav-item-icon" /> },
  ];

  const settingItems = [
    { to: '/settings/payment-terms', label: 'Payment Terms', icon: <CreditCard className="erp-nav-item-icon" /> },
    { to: '/settings/company-profile', label: 'Company Profile', icon: <Building2 className="erp-nav-item-icon" /> },
  ];

  return (
    <aside className="erp-sidebar">
      <div className="erp-brand-header">
        <div className="erp-brand-logo">
          <Hammer size={16} />
        </div>
        <span className="erp-brand-title">ConstructPro</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="erp-nav-section-label">Operations</div>

        <ul className="erp-nav-list" style={{ flex: 'none', overflowY: 'visible' }}>
          {operationItems.map(item => {
            const isActive =
              currentPath === item.to ||
              (item.to !== '/dashboard' && currentPath.startsWith(item.to)) ||
              (item.to === '/warehouse' && (currentPath.startsWith('/inventory') || currentPath.startsWith('/materials')));
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`erp-nav-item ${isActive ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  {item.icon}
                  <span className="erp-nav-text">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="erp-nav-section-label" style={{ padding: '10px 16px 4px', margin: 0 }}>Settings</div>

        <ul className="erp-nav-list" style={{ flex: 'none', overflowY: 'visible' }}>
          {settingItems.map(item => {
            const isActive = currentPath.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`erp-nav-item ${isActive ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  {item.icon}
                  <span className="erp-nav-text">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};
