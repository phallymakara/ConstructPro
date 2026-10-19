import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  FolderKanban,
  AlertTriangle,
  FileCheck2,
  DollarSign,
  TrendingUp,
  PackageX,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useDashboardController } from '../../controllers/useDashboardController';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { summary, recentProjects, lowStockMaterials, isLoading, errorMessage } = useDashboardController();

  if (isLoading && !summary) {
    return <div className="erp-empty-state">Loading executive metrics...</div>;
  }

  return (
    <div className="erp-content">
      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '6px 0' }}>
          {errorMessage}
        </div>
      )}

      {/* 1. Business Performance KPIs */}
      <div className="erp-metrics-grid">
        <MetricCard
          label="Active Projects"
          value={summary?.active_projects ?? 0}
          subtext={`of ${summary?.total_projects ?? 0} total projects`}
          icon={<FolderKanban size={16} />}
        />
        <MetricCard
          label="Pending Quotes"
          value={summary?.pending_quotations ?? 0}
          subtext="Quotations awaiting customer decision"
          icon={<FileCheck2 size={16} />}
        />
        <MetricCard
          label="Contract Revenue"
          value={`$${(summary?.total_contract_value ?? 0).toLocaleString()}`}
          subtext="Total contracted project value"
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          label="Projected Margin"
          value={`$${(summary?.projected_profit ?? 0).toLocaleString()}`}
          subtext="Est. gross margin after direct costs"
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          label="Low Stock Items"
          value={summary?.low_stock_count ?? 0}
          subtext={summary?.low_stock_count ? 'Materials below safety stock' : 'Optimal inventory levels'}
          icon={<AlertTriangle size={16} color={summary?.low_stock_count ? '#dc2626' : undefined} />}
        />
        <MetricCard
          label="Material Shortages"
          value={summary?.shortage_count ?? 0}
          subtext={summary?.shortage_count ? 'Projects waiting on materials' : 'All active demands allocated'}
          icon={<PackageX size={16} color={summary?.shortage_count ? '#dc2626' : undefined} />}
        />
      </div>

      {/* 2. Urgent Tasks & Problems Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Urgent Tasks & Project Schedules */}
        <div className="erp-table-container">
          <div className="erp-drawer-header">
            <div>
              <span className="erp-drawer-title">Active Projects & Fabrication Workflow</span>
              <div style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>
                Urgent project deadlines and production stages
              </div>
            </div>
            <button
              onClick={() => navigate({ to: '/projects' })}
              className="erp-btn erp-btn-secondary erp-btn-sm"
            >
              <span>Manage Projects</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Project #</th>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--erp-text-muted)', padding: '24px' }}>
                    No projects found. Create a project to begin tracking.
                  </td>
                </tr>
              ) : (
                recentProjects.map(proj => (
                  <tr key={proj.id}>
                    <td style={{ fontWeight: 600 }}>{proj.project_number}</td>
                    <td>{proj.project_name}</td>
                    <td>{proj.customer?.name || 'N/A'}</td>
                    <td>
                      {proj.deadline_date ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="var(--erp-text-muted)" />
                          {new Date(proj.deadline_date).toLocaleDateString()}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={proj.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Problems That Need Attention: Material Shortages & Low Stock */}
        <div className="erp-table-container">
          <div className="erp-drawer-header">
            <div>
              <span className="erp-drawer-title">Critical Inventory Alerts</span>
              <div style={{ fontSize: '11px', color: 'var(--erp-text-muted)' }}>
                Stock below minimum safety thresholds
              </div>
            </div>
            <button
              onClick={() => navigate({ to: '/inventory' })}
              className="erp-btn erp-btn-secondary erp-btn-sm"
            >
              <span>Inventory Control</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Material</th>
                <th>Available</th>
                <th>Min Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--erp-text-muted)', padding: '24px' }}>
                    All materials are currently above safety stock levels.
                  </td>
                </tr>
              ) : (
                lowStockMaterials.map(mat => (
                  <tr key={mat.id}>
                    <td style={{ fontWeight: 600 }}>{mat.code}</td>
                    <td>{mat.name}</td>
                    <td style={{ color: 'var(--erp-text-error)', fontWeight: 600 }}>
                      {mat.current_stock} {mat.unit}
                    </td>
                    <td>{mat.minimum_stock} {mat.unit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
