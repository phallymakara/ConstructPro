import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  ShoppingCart,
  BarChart3,
  Hammer
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="erp-nav-item-icon" /> },
    { to: '/projects', label: 'Projects', icon: <FolderKanban className="erp-nav-item-icon" /> },
    { to: '/inventory', label: 'Inventory', icon: <Package className="erp-nav-item-icon" /> },
    { to: '/purchasing', label: 'Purchasing', icon: <ShoppingCart className="erp-nav-item-icon" /> },
    { to: '/reports', label: 'Reports', icon: <BarChart3 className="erp-nav-item-icon" /> },
  ];

  return (
    <aside className="erp-sidebar">
      <div className="erp-brand-header">
        <div className="erp-brand-logo">
          <Hammer size={16} />
        </div>
        <span className="erp-brand-title">ConstructPro</span>
      </div>

      <div className="erp-nav-section-label">Operations</div>

      <ul className="erp-nav-list">
        {navItems.map(item => {
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
    </aside>
  );
};
