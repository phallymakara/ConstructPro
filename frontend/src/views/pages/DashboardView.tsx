import React, { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  FolderKanban,
  XCircle,
  AlertTriangle,
  Boxes,
  ChevronRight
} from 'lucide-react';
import { useDashboardController } from '../../controllers/useDashboardController';

// Generates smooth cubic Bezier path for SVG line charts
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function generateAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (points.length === 0) return '';
  const linePath = generateSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    summary,
    allProjects,
    allMaterials,
    isLoading,
    errorMessage
  } = useDashboardController();

  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // 1. Calculate Monthly Trend Points (6 rolling months)
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        fullLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map((m, idx) => {
      // Find projects created in this month or active
      const matched = allProjects.filter(p => {
        if (!p.created_at) return false;
        const pDate = new Date(p.created_at);
        return pDate.getFullYear() === m.year && pDate.getMonth() === m.month;
      });

      const totalContract = matched.reduce((sum, p) => sum + (p.contract_amount || 0), 0);
      const volume = matched.length;

      // In case data is only recent, provide proportional realistic velocity baseline
      const isLatestMonth = idx === 5;
      const displayRevenue = totalContract > 0 
        ? totalContract 
        : isLatestMonth 
        ? (summary?.total_contract_value ?? 0) 
        : 0;

      const displayVolume = volume > 0 
        ? volume 
        : isLatestMonth 
        ? (summary?.total_projects ?? 0) 
        : 0;

      return {
        ...m,
        revenue: displayRevenue,
        volume: displayVolume,
      };
    });
  }, [allProjects, summary]);

  // Chart coordinate mapping
  const chartWidth = 620;
  const chartHeight = 180;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const baselineY = chartHeight - paddingBottom;

  const maxVal = useMemo(() => {
    if (chartMetric === 'revenue') {
      const max = Math.max(...monthlyData.map(d => d.revenue), 1000);
      return Math.ceil(max * 1.15);
    } else {
      const max = Math.max(...monthlyData.map(d => d.volume), 5);
      return Math.ceil(max * 1.25);
    }
  }, [monthlyData, chartMetric]);

  const points = useMemo(() => {
    if (monthlyData.length === 0) return [];
    const step = usableWidth / (monthlyData.length - 1);
    return monthlyData.map((d, i) => {
      const val = chartMetric === 'revenue' ? d.revenue : d.volume;
      const x = paddingLeft + i * step;
      const y = baselineY - (val / (maxVal || 1)) * usableHeight;
      return { x, y, data: d };
    });
  }, [monthlyData, chartMetric, maxVal, usableWidth, usableHeight, baselineY]);

  const linePath = useMemo(() => generateSmoothPath(points), [points]);
  const areaPath = useMemo(() => generateAreaPath(points, baselineY), [points, baselineY]);

  // 2. Project Lifecycle Stage Breakdown
  const stageBreakdown = useMemo(() => {
    const total = allProjects.length || (summary?.total_projects ?? 0);
    const stages = [
      {
        id: 'inquiry',
        label: 'Inquiry & Draft',
        statuses: ['Draft', 'Quotation'],
        color: '#f59e0b',
        badgeClass: 'erp-badge-amber',
      },
      {
        id: 'approved',
        label: 'Approved & Prep',
        statuses: ['Approved', 'Material Preparation'],
        color: '#0284c7',
        badgeClass: 'erp-badge-blue',
      },
      {
        id: 'production',
        label: 'Production & Delivery',
        statuses: ['Production', 'Ready for Delivery'],
        color: '#6366f1',
        badgeClass: 'erp-badge-purple',
      },
      {
        id: 'installation',
        label: 'Site Installation',
        statuses: ['Installation'],
        color: '#8b5cf6',
        badgeClass: 'erp-badge-purple',
      },
      {
        id: 'completed',
        label: 'Completed & Delivered',
        statuses: ['Completed'],
        color: '#10b981',
        badgeClass: 'erp-badge-emerald',
      },
    ];

    return stages.map(s => {
      const count = allProjects.filter(p => s.statuses.includes(p.status)).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return {
        ...s,
        count,
        percent: pct,
      };
    });
  }, [allProjects, summary]);

  // Donut chart stroke segments
  const donutRadius = 60;
  const donutStrokeWidth = 20;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedDonutOffset = 0;
  const donutSegments = useMemo(() => {
    const total = stageBreakdown.reduce((sum, s) => sum + s.count, 0);
    let currentOffset = 0;

    return stageBreakdown.map(s => {
      const fraction = total > 0 ? s.count / total : 0;
      const strokeDash = `${(fraction * donutCircumference).toFixed(2)} ${donutCircumference.toFixed(2)}`;
      const strokeOffset = (-currentOffset * donutCircumference).toFixed(2);
      currentOffset += fraction;

      return {
        ...s,
        fraction,
        strokeDash,
        strokeOffset,
      };
    });
  }, [stageBreakdown, donutCircumference]);

  // KPI calculations
  const totalMaterialItems = allMaterials.length;
  const lowStockCount = summary?.low_stock_count ?? 0;
  const optimalPercent = totalMaterialItems > 0 
    ? Math.round(((totalMaterialItems - lowStockCount) / totalMaterialItems) * 100) 
    : 100;
  
  const totalProjects = summary?.total_projects ?? allProjects.length;
  const totalContract = summary?.total_contract_value ?? 0;
  const cancelledProjectsCount = allProjects.filter(p => p.status === 'Cancelled').length;
  const now = new Date();
  const overdueProjectsCount = summary?.delayed_projects ?? allProjects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled' || !p.deadline_date) return false;
    return new Date(p.deadline_date).getTime() < now.getTime();
  }).length;

  if (isLoading && !summary) {
    return (
      <div className="erp-content">
        <div className="erp-empty-state">Loading executive analytics & operations metrics...</div>
      </div>
    );
  }

  return (
    <div className="erp-content">
      <div className="erp-dashboard-scroll">

        {errorMessage && (
          <div style={{ color: 'var(--erp-text-error)', fontSize: '12px', padding: '6px 0' }}>
            {errorMessage}
          </div>
        )}

        {/* 1. Executive KPI Cards */}
        <div className="erp-kpi-grid">
          {/* KPI 1: Active Projects */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Active Projects</span>
              <div className="erp-kpi-icon">
                <FolderKanban size={15} color="var(--erp-primary)" />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value">{summary?.active_projects ?? 0}</div>
              {/* Mini Sparkline Curve */}
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 22 Q 18 18, 30 12 T 52 14 T 70 4"
                    fill="none"
                    stroke="var(--erp-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="70" cy="4" r="2.5" fill="var(--erp-primary)" />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI 2: Canceled Projects */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Canceled Projects</span>
              <div className="erp-kpi-icon">
                <XCircle size={15} color="#ef4444" />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: cancelledProjectsCount > 0 ? '#ef4444' : 'inherit' }}>
                {cancelledProjectsCount}
              </div>
              {/* Mini Status Sparkline */}
              <div className="erp-kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', paddingBottom: '2px' }}>
                <div style={{ width: '8px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '16px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '22px', backgroundColor: cancelledProjectsCount > 0 ? '#ef4444' : '#94a3b8', borderRadius: '2px' }} />
              </div>
            </div>
          </div>

          {/* KPI 3: Overdue Projects */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Overdue Projects</span>
              <div className="erp-kpi-icon">
                <AlertTriangle size={15} color={overdueProjectsCount > 0 ? '#dc2626' : '#64748b'} />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: overdueProjectsCount > 0 ? 'var(--erp-text-error)' : 'inherit' }}>
                {overdueProjectsCount}
              </div>
              {/* Mini Upward Alert Trend */}
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 24 L 22 20 L 40 16 L 56 12 L 70 6"
                    fill="none"
                    stroke={overdueProjectsCount > 0 ? '#ef4444' : '#94a3b8'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="70" cy="6" r="2.5" fill={overdueProjectsCount > 0 ? '#ef4444' : '#94a3b8'} />
                </svg>
              </div>
            </div>
          </div>

          {/* KPI 4: Inventory Health */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Inventory Health</span>
              <div className="erp-kpi-icon">
                <Boxes size={15} color={lowStockCount > 0 ? '#dc2626' : '#059669'} />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: lowStockCount > 0 ? 'var(--erp-text-error)' : 'inherit' }}>
                {lowStockCount} {lowStockCount === 1 ? 'Alert' : 'Alerts'}
              </div>
              {/* Health Mini Meter */}
              <div style={{ width: '70px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="erp-progress-track" style={{ height: '7px' }}>
                  <div
                    className="erp-progress-fill"
                    style={{
                      width: `${optimalPercent}%`,
                      backgroundColor: optimalPercent > 80 ? '#10b981' : optimalPercent > 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visual Graphs & Charts Section */}
        <div className="erp-charts-grid">
          {/* Chart 1: Financial & Production Velocity Timeline Area Chart */}
          <div className="erp-chart-card">
            <div className="erp-chart-header">
              <div className="erp-chart-title">
                <span>Pipeline & Revenue Velocity</span>
              </div>

              {/* Metric Toggle Buttons */}
              <div className="erp-chart-toggle-group">
                <button
                  type="button"
                  className={`erp-chart-toggle-btn ${chartMetric === 'revenue' ? 'active' : ''}`}
                  onClick={() => setChartMetric('revenue')}
                >
                  Revenue ($)
                </button>
                <button
                  type="button"
                  className={`erp-chart-toggle-btn ${chartMetric === 'volume' ? 'active' : ''}`}
                  onClick={() => setChartMetric('volume')}
                >
                  Project Volume
                </button>
              </div>
            </div>

            {/* Interactive SVG Area Curve Chart */}
            <div className="erp-chart-canvas-wrapper">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="erp-chart-svg"
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis labels */}
                {[0, 0.33, 0.66, 1].map((pct, i) => {
                  const y = baselineY - pct * usableHeight;
                  const labelVal = Math.round(pct * maxVal);
                  return (
                    <g key={i}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray={i === 0 ? '0' : '4 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="var(--erp-mono-font)"
                      >
                        {chartMetric === 'revenue'
                          ? labelVal >= 1000
                            ? `$${(labelVal / 1000).toFixed(0)}k`
                            : `$${labelVal}`
                          : labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                <path d={areaPath} fill="url(#areaGradient)" />

                {/* Smooth Curve Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--erp-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points & Invisible hover columns */}
                {points.map((p, idx) => {
                  const isHovered = hoveredPointIndex === idx;
                  const colWidth = usableWidth / points.length;
                  const colX = p.x - colWidth / 2;

                  return (
                    <g key={idx}>
                      {/* X-Axis Month Label */}
                      <text
                        x={p.x}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isHovered ? '600' : '500'}
                        fill={isHovered ? 'var(--erp-text-main)' : 'var(--erp-text-muted)'}
                      >
                        {p.data.label}
                      </text>

                      {/* Vertical Guideline on hover */}
                      {isHovered && (
                        <line
                          x1={p.x}
                          y1={paddingTop}
                          x2={p.x}
                          y2={baselineY}
                          stroke="var(--erp-primary)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Circle marker */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? '6' : '3.5'}
                        fill="#ffffff"
                        stroke="var(--erp-primary)"
                        strokeWidth={isHovered ? '2.5' : '2'}
                        style={{ transition: 'all 0.15s ease' }}
                      />

                      {/* Invisible hover trigger zone */}
                      <rect
                        x={colX}
                        y={paddingTop}
                        width={colWidth}
                        height={usableHeight + 15}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip Box */}
              {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                <div
                  className="erp-chart-tooltip"
                  style={{
                    left: `${(points[hoveredPointIndex].x / chartWidth) * 100}%`,
                    top: `${(points[hoveredPointIndex].y / chartHeight) * 100}%`,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '3px' }}>
                    {points[hoveredPointIndex].data.fullLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--erp-primary)' }}>
                    <span>Contract Revenue:</span>
                    <strong style={{ fontFamily: 'var(--erp-mono-font)' }}>
                      ${points[hoveredPointIndex].data.revenue.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--erp-text-muted)' }}>
                    <span>Registered Projects:</span>
                    <strong>{points[hoveredPointIndex].data.volume}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Chart Summary Footnote */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--erp-text-muted)', borderTop: '1px solid var(--erp-border)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--erp-primary)' }} />
                  {chartMetric === 'revenue' ? 'Contract Value Realized' : 'Total Work Orders'}
                </span>
                <span>Active 6-Month Trajectory</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--erp-text-main)' }}>
                Total: ${totalContract.toLocaleString()} ({totalProjects} Projects)
              </span>
            </div>
          </div>

          {/* Chart 2: Project Lifecycle Stage Distribution (Donut & Stage Bars) */}
          <div className="erp-chart-card">
            <div className="erp-chart-header">
              <div className="erp-chart-title">
                <span>Workflow & Lifecycle Distribution</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Modern SVG Donut Chart */}
              <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto' }}>
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track Circle */}
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRadius * 0.7}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth={donutStrokeWidth * 0.7}
                  />

                  {/* Slices */}
                  {donutSegments.map((seg, i) => {
                    const isHovered = hoveredStage === seg.id;
                    const r = donutRadius * 0.7;
                    const c = 2 * Math.PI * r;
                    const sDash = `${(seg.fraction * c).toFixed(2)} ${c.toFixed(2)}`;
                    const sOffset = (-accumulatedDonutOffset * c).toFixed(2);
                    accumulatedDonutOffset += seg.fraction;

                    return (
                      <circle
                        key={i}
                        cx="70"
                        cy="70"
                        r={r}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={(donutStrokeWidth * 0.7) + (isHovered ? 3 : 0)}
                        strokeDasharray={sDash}
                        strokeDashoffset={sOffset}
                        strokeLinecap="round"
                        style={{
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          opacity: hoveredStage && !isHovered ? 0.35 : 1,
                        }}
                        onMouseEnter={() => setHoveredStage(seg.id)}
                        onMouseLeave={() => setHoveredStage(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Display */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--erp-text-main)', lineHeight: 1 }}>
                    {totalProjects}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--erp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px' }}>
                    Works
                  </div>
                </div>
              </div>

              {/* Stage Progress Bars & Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stageBreakdown.map(s => {
                  const isHovered = hoveredStage === s.id;
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 'var(--erp-radius-sm)',
                        backgroundColor: isHovered ? '#f8fafc' : 'transparent',
                        border: isHovered ? '1px solid var(--erp-border)' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredStage(s.id)}
                      onMouseLeave={() => setHoveredStage(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              backgroundColor: s.color,
                            }}
                          />
                          <span style={{ fontWeight: isHovered ? 600 : 500, color: 'var(--erp-text-main)' }}>
                            {s.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--erp-text-main)' }}>{s.count}</span>
                          <span style={{ color: 'var(--erp-text-muted)', fontSize: '10.5px' }}>
                            ({s.percent.toFixed(0)}%)
                          </span>
                        </div>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="erp-progress-track" style={{ height: '4px' }}>
                        <div
                          className="erp-progress-fill"
                          style={{
                            width: `${s.percent}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Link Footer */}
            <div style={{ borderTop: '1px solid var(--erp-border)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--erp-text-muted)' }}>
              <span>{summary?.active_projects ?? 0} actively in production pipeline</span>
              <button
                onClick={() => navigate({ to: '/projects' })}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--erp-primary)',
                  fontWeight: 600,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span>Pipeline View</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
