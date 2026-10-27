import React from 'react';
import { User, ChevronRight, Hammer } from 'lucide-react';

import { Link } from '@tanstack/react-router';

interface HeaderProps {
  currentPath: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const isProjectWorkflowPath = (path: string): boolean => {
  return /^\/projects\/\d+/.test(path);
};

const getBreadcrumbTitle = (path: string): string => {
  if (path.startsWith('/sale')) return 'Sales & Project Intake';
  if (path.startsWith('/projects')) return 'Projects Management';
  if (path.startsWith('/warehouse') || path.startsWith('/inventory') || path.startsWith('/materials')) return 'Warehouse';
  if (path.startsWith('/purchasing')) return 'Suppliers & Purchasing';
  return 'Dashboard';
};

export const Header: React.FC<HeaderProps> = ({ currentPath }) => {
  const isWorkflow = isProjectWorkflowPath(currentPath);
  const title = getBreadcrumbTitle(currentPath);

  return (
    <header className="erp-header">
      <div className="erp-header-left">
        <div className="erp-breadcrumb">
          <Link
            to="/dashboard"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
            }}
          >
            <span
              style={{
                width: '22px',
                height: '22px',
                backgroundColor: 'var(--erp-primary)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                flexShrink: 0,
              }}
            >
              <Hammer size={13} />
            </span>
            <span style={{ fontWeight: 600 }}>ConstructPro</span>
          </Link>
          <ChevronRight size={15} style={{ color: 'var(--erp-text-light)' }} />
          {isWorkflow ? (
            <>
              <Link to="/projects" style={{ textDecoration: 'none', color: 'inherit', fontSize: '16px' }}>
                <span>Projects</span>
              </Link>
              <ChevronRight size={15} style={{ color: 'var(--erp-text-light)' }} />
              <span className="erp-breadcrumb-active">Project Workspace</span>
            </>
          ) : (
            <span className="erp-breadcrumb-active">{title}</span>
          )}
        </div>
      </div>

      <div className="erp-header-right">
        <div className="erp-user-avatar" title="User Profile" aria-label="User Profile">
          <User size={16} />
        </div>
      </div>
    </header>
  );
};
