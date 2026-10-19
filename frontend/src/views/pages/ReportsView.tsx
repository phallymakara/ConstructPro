import React from 'react';
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { useReportsController } from '../../controllers/useReportsController';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';

export const ReportsView: React.FC = () => {
  const {
    profitability,
    materialUsage,
    delays,
    activeTab,
    isLoading,
    errorMessage,
    totalRevenue,
    totalCosts,
    totalGrossProfit,
    averageMargin,
    setActiveTab,
  } = useReportsController();

  return (
    <div className="erp-content">
      {/* Action / Tab Bar */}
      <div className="erp-action-bar">
        <div className="erp-tab-group">
          <button
            className={`erp-btn erp-btn-sm ${activeTab === 'profitability' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
            onClick={() => setActiveTab('profitability')}
          >
            <DollarSign size={12} />
            <span>Project Profitability</span>
          </button>
          <button
            className={`erp-btn erp-btn-sm ${activeTab === 'materials' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
            onClick={() => setActiveTab('materials')}
          >
            <PackageCheck size={12} />
            <span>Material Usage & Wastage</span>
          </button>
          <button
            className={`erp-btn erp-btn-sm ${activeTab === 'delays' ? 'erp-btn-primary' : 'erp-btn-secondary'}`}
            onClick={() => setActiveTab('delays')}
          >
            <AlertTriangle size={12} />
            <span>Delayed Projects ({delays.length})</span>
          </button>
        </div>

        <button
          className="erp-btn erp-btn-secondary erp-btn-sm"
          onClick={() => window.print()}
          title="Print or export current report"
        >
          <FileSpreadsheet size={13} />
          <span>Print / Export</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--erp-text-error)', fontSize: '12px' }}>
          {errorMessage}
        </div>
      )}

      {/* Financial Summary Cards for Profitability */}
      {activeTab === 'profitability' && (
        <div className="erp-metrics-grid">
          <MetricCard
            label="Total Contract Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            subtext="Contracted billing across all projects"
            icon={<DollarSign size={16} />}
          />
          <MetricCard
            label="Total Project Costs"
            value={`$${totalCosts.toLocaleString()}`}
            subtext="Actual + estimated direct costs"
            icon={<Layers size={16} />}
          />
          <MetricCard
            label="Gross Realized Margin"
            value={`$${totalGrossProfit.toLocaleString()}`}
            subtext="Total project margin"
            icon={<TrendingUp size={16} />}
          />
          <MetricCard
            label="Average Profit Margin"
            value={`${averageMargin.toFixed(1)}%`}
            subtext="Net margin percentage"
            icon={<TrendingUp size={16} color="#047857" />}
          />
        </div>
      )}

      {/* Tab 1: Project Profitability Report */}
      {activeTab === 'profitability' && (
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Project #</th>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Contract Amount</th>
                <th>Estimated Cost</th>
                <th>Actual Cost</th>
                <th>Gross Profit</th>
                <th>Margin %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px' }}>
                    Generating financial report...
                  </td>
                </tr>
              ) : profitability.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No project financial records available yet.
                  </td>
                </tr>
              ) : (
                profitability.map(p => (
                  <tr key={p.project_id}>
                    <td style={{ fontWeight: 600 }}>{p.project_number}</td>
                    <td>{p.project_name}</td>
                    <td>{p.customer_name}</td>
                    <td>${p.contract_amount.toLocaleString()}</td>
                    <td>${p.estimated_cost.toLocaleString()}</td>
                    <td>${p.actual_cost.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: p.gross_profit >= 0 ? '#047857' : 'var(--erp-text-error)' }}>
                      ${p.gross_profit.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.profit_margin_percent}%</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Material Usage & Wastage Report */}
      {activeTab === 'materials' && (
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Material Description</th>
                <th>Category</th>
                <th>Current In-Stock</th>
                <th>Committed/Reserved</th>
                <th>Total Consumed</th>
                <th>Total Scrap / Wastage</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    Loading material consumption summary...
                  </td>
                </tr>
              ) : materialUsage.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--erp-text-muted)' }}>
                    No material usage recorded yet.
                  </td>
                </tr>
              ) : (
                materialUsage.map(m => (
                  <tr key={m.material_id}>
                    <td style={{ fontWeight: 600 }}>{m.material_code}</td>
                    <td>{m.material_name}</td>
                    <td>
                      <span className="erp-badge erp-badge-draft">{m.category}</span>
                    </td>
                    <td>{m.current_stock} {m.unit}</td>
                    <td>{m.reserved_stock} {m.unit}</td>
                    <td style={{ fontWeight: 600 }}>{m.total_consumed_qty} {m.unit}</td>
                    <td style={{ color: m.total_wastage_qty > 0 ? 'var(--erp-text-error)' : 'inherit' }}>
                      {m.total_wastage_qty} {m.unit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Delayed Projects Report */}
      {activeTab === 'delays' && (
        <div className="erp-table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Project #</th>
                <th>Project Name</th>
                <th>Customer</th>
                <th>Responsible Manager</th>
                <th>Target Deadline</th>
                <th>Days Overdue</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    Checking schedule delays...
                  </td>
                </tr>
              ) : delays.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#047857' }}>
                    Excellent! There are no overdue or delayed projects.
                  </td>
                </tr>
              ) : (
                delays.map(d => (
                  <tr key={d.project_id}>
                    <td style={{ fontWeight: 600 }}>{d.project_number}</td>
                    <td>{d.project_name}</td>
                    <td>{d.customer_name}</td>
                    <td>{d.assigned_manager || '-'}</td>
                    <td>{new Date(d.deadline_date).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--erp-text-error)', fontWeight: 700 }}>
                      +{d.days_overdue} days
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
