import React from 'react';
import { User, ChevronRight } from 'lucide-react';

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
  if (path.startsWith('/projects')) return 'Projects Management';
  if (path.startsWith('/inventory') || path.startsWith('/materials')) return 'Inventory Control';
  if (path.startsWith('/purchasing')) return 'Suppliers & Purchasing';
  if (path.startsWith('/reports')) return 'Operational & Financial Reports';
  return 'Dashboard';
};

export const Header: React.FC<HeaderProps> = ({ currentPath }) => {
  const isWorkflow = isProjectWorkflowPath(currentPath);
  const title = getBreadcrumbTitle(currentPath);

  return (
    <header className="erp-header">
      <div className="erp-header-left">
        <div className="erp-breadcrumb">
          <span>ConstructPro</span>
          <ChevronRight size={14} />
          {isWorkflow ? (
            <>
              <Link to="/projects" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span>Projects</span>
              </Link>
              <ChevronRight size={14} />
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
