import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  PlayCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Calendar,
  ChevronDown,
  Check
} from 'lucide-react';
import { useDashboardController } from '../../controllers/useDashboardController';
import { calculateDynamicProjectStatus } from '../../utils/taskProgress';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    summary,
    allProjects,
    isLoading,
    errorMessage
  } = useDashboardController();

  // Filter States for Project Volume Chart
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('6m');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState<boolean>(false);
  const [isCustomPopupOpen, setIsCustomPopupOpen] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [tempEndDate, setTempEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
        setIsCustomPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePeriodLabel = useMemo(() => {
    if (datePreset === '30d') return 'Last 30 Days';
    if (datePreset === '6m') return 'Last 6 Months';
    if (datePreset === '1y') return 'This Year';
    if (datePreset === 'all') return 'All Time';
    if (datePreset === 'custom') {
      if (startDate && endDate) return `${startDate} → ${endDate}`;
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
      return 'Custom Range';
    }
    return 'Last 6 Months';
  }, [datePreset, startDate, endDate]);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === '30d') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setIsPeriodMenuOpen(false);
      setIsCustomPopupOpen(false);
    } else if (preset === '6m') {
      const past = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setIsPeriodMenuOpen(false);
      setIsCustomPopupOpen(false);
    } else if (preset === '1y') {
      const past = new Date(now.getFullYear(), 0, 1);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setIsPeriodMenuOpen(false);
      setIsCustomPopupOpen(false);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setIsPeriodMenuOpen(false);
      setIsCustomPopupOpen(false);
    } else if (preset === 'custom') {
      setTempStartDate(startDate || todayStr);
      setTempEndDate(endDate || todayStr);
      setIsCustomPopupOpen(true);
    }
  };

  // 1. Filter Projects by Status & Date Range
  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const dynamicStatus = calculateDynamicProjectStatus(p);
        const sf = statusFilter.toLowerCase();
        const ds = dynamicStatus.toLowerCase();
        const ps = (p.status || '').toLowerCase();
        if (ds !== sf && ps !== sf) return false;
      }

      // 2. Date Filter
      const pDateStr = p.created_at || p.start_date;
      if (pDateStr) {
        const pDate = new Date(pDateStr);
        if (startDate) {
          const sDate = new Date(startDate + 'T00:00:00');
          if (pDate < sDate) return false;
        }
        if (endDate) {
          const eDate = new Date(endDate + 'T23:59:59.999');
          if (pDate > eDate) return false;
        }
      }

      return true;
    });
  }, [allProjects, statusFilter, startDate, endDate]);

  // 2. Generate Volume Trend Timeline Buckets
  const volumeTrendData = useMemo(() => {
    const buckets: {
      key: string;
      label: string;
      fullLabel: string;
      start: Date;
      end: Date;
      volume: number;
    }[] = [];

    const now = new Date();

    if (datePreset === '30d') {
      // 5 intervals across 30 days
      for (let i = 4; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - (i + 1) * 6);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now);
        end.setDate(now.getDate() - i * 6);
        end.setHours(23, 59, 59, 999);

        const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const fullLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        buckets.push({
          key: `30d-${i}`,
          label,
          fullLabel,
          start,
          end,
          volume: 0,
        });
      }
    } else if (datePreset === 'custom' && startDate && endDate) {
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T23:59:59.999');
      const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 45) {
        const steps = Math.min(6, Math.max(2, Math.ceil(diffDays / 7)));
        const stepDays = Math.ceil(diffDays / steps);
        for (let i = 0; i < steps; i++) {
          const bStart = new Date(s);
          bStart.setDate(s.getDate() + i * stepDays);
          const bEnd = new Date(bStart);
          bEnd.setDate(bStart.getDate() + stepDays - 1);
          if (bEnd > e) bEnd.setTime(e.getTime());

          buckets.push({
            key: `custom-${i}`,
            label: bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullLabel: `${bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            start: bStart,
            end: bEnd,
            volume: 0,
          });
        }
      } else {
        let curr = new Date(s.getFullYear(), s.getMonth(), 1);
        while (curr <= e && buckets.length < 12) {
          const bEnd = new Date(curr.getFullYear(), curr.getMonth() + 1, 0, 23, 59, 59, 999);
          buckets.push({
            key: `${curr.getFullYear()}-${curr.getMonth()}`,
            label: curr.toLocaleDateString('en-US', { month: 'short' }),
            fullLabel: curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            start: new Date(curr),
            end: bEnd,
            volume: 0,
          });
          curr.setMonth(curr.getMonth() + 1);
        }
      }
    } else if (datePreset === '1y') {
      const year = now.getFullYear();
      for (let m = 0; m <= now.getMonth(); m++) {
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
        buckets.push({
          key: `${year}-${m}`,
          label: start.toLocaleDateString('en-US', { month: 'short' }),
          fullLabel: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start,
          end,
          volume: 0,
        });
      }
      while (buckets.length < 6) {
        const prevStart = new Date(year, -(6 - buckets.length), 1);
        const prevEnd = new Date(year, -(6 - buckets.length) + 1, 0, 23, 59, 59, 999);
        buckets.unshift({
          key: `prev-${buckets.length}`,
          label: prevStart.toLocaleDateString('en-US', { month: 'short' }),
          fullLabel: prevStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start: prevStart,
          end: prevEnd,
          volume: 0,
        });
      }
    } else {
      // Default: 6 rolling months
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        buckets.push({
          key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
          label: start.toLocaleDateString('en-US', { month: 'short' }),
          fullLabel: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start,
          end,
          volume: 0,
        });
      }
    }

    // Tally filtered projects into buckets
    filteredProjects.forEach(p => {
      const pDateStr = p.created_at || p.start_date;
      if (!pDateStr) return;
      const pDate = new Date(pDateStr);

      for (const b of buckets) {
        if (pDate >= b.start && pDate <= b.end) {
          b.volume++;
          break;
        }
      }
    });

    return buckets;
  }, [filteredProjects, datePreset, startDate, endDate]);

  // Chart coordinate mapping
  const chartWidth = 620;
  const chartHeight = 180;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const baselineY = chartHeight - paddingBottom;

  const maxVal = useMemo(() => {
    const max = Math.max(...volumeTrendData.map(d => d.volume), 0);
    if (max <= 4) return 4;
    if (max <= 8) return 8;
    return Math.ceil(max * 1.25);
  }, [volumeTrendData]);

  const barItems = useMemo(() => {
    if (volumeTrendData.length === 0) return [];
    const slotWidth = usableWidth / volumeTrendData.length;
    const barWidth = Math.min(16, Math.max(8, slotWidth * 0.2));

    return volumeTrendData.map((d, i) => {
      const centerX = paddingLeft + (i + 0.5) * slotWidth;
      const barX = centerX - barWidth / 2;
      const height = maxVal > 0 ? (d.volume / maxVal) * usableHeight : 0;
      const barY = baselineY - (d.volume > 0 ? Math.max(6, height) : 0);

      return {
        centerX,
        barX,
        barWidth,
        barY,
        barHeight: d.volume > 0 ? Math.max(6, height) : 0,
        slotX: paddingLeft + i * slotWidth,
        slotWidth,
        data: d,
      };
    });
  }, [volumeTrendData, maxVal, usableWidth, usableHeight, baselineY, paddingLeft]);

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

  // Project Status Counts
  const statusCounts = useMemo(() => {
    const counts = {
      starting: 0,
      inProgress: 0,
      overdue: 0,
      completed: 0,
      cancelled: 0,
    };

    allProjects.forEach(p => {
      const st = calculateDynamicProjectStatus(p);
      if (st === 'Starting') counts.starting++;
      else if (st === 'In Progress') counts.inProgress++;
      else if (st === 'Overdue') counts.overdue++;
      else if (st === 'Completed') counts.completed++;
      else if (st === 'Cancelled' || st === 'Canceled') counts.cancelled++;
      else counts.starting++;
    });

    return counts;
  }, [allProjects]);

  const totalProjects = summary?.total_projects ?? allProjects.length;

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

        {/* 1. Executive KPI Cards - Project Statuses */}
        <div className="erp-kpi-grid">
          {/* Status 1: Starting */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Starting</span>
              <div className="erp-kpi-icon">
                <PlayCircle size={15} color="#2563eb" />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: statusCounts.starting > 0 ? '#2563eb' : 'inherit' }}>
                {statusCounts.starting}
              </div>
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 24 L 20 24 L 38 18 L 54 18 L 70 10"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="70" cy="10" r="2.5" fill="#2563eb" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status 2: In Progress */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">In Progress</span>
              <div className="erp-kpi-icon">
                <TrendingUp size={15} color="#d97706" />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: statusCounts.inProgress > 0 ? '#d97706' : 'inherit' }}>
                {statusCounts.inProgress}
              </div>
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 22 Q 18 18, 30 12 T 52 14 T 70 4"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="70" cy="4" r="2.5" fill="#d97706" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status 3: Overdue */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Overdue</span>
              <div className="erp-kpi-icon">
                <AlertTriangle size={15} color={statusCounts.overdue > 0 ? '#dc2626' : '#64748b'} />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: statusCounts.overdue > 0 ? 'var(--erp-text-error)' : 'inherit' }}>
                {statusCounts.overdue}
              </div>
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 24 L 22 20 L 40 16 L 56 12 L 70 6"
                    fill="none"
                    stroke={statusCounts.overdue > 0 ? '#ef4444' : '#94a3b8'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="70" cy="6" r="2.5" fill={statusCounts.overdue > 0 ? '#ef4444' : '#94a3b8'} />
                </svg>
              </div>
            </div>
          </div>

          {/* Status 4: Completed */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Completed</span>
              <div className="erp-kpi-icon">
                <CheckCircle2 size={15} color="#059669" />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: statusCounts.completed > 0 ? '#059669' : 'inherit' }}>
                {statusCounts.completed}
              </div>
              <div className="erp-kpi-sparkline">
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
                  <path
                    d="M 2 22 Q 22 18, 40 10 T 70 4"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="70" cy="4" r="2.5" fill="#10b981" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status 5: Cancelled */}
          <div className="erp-kpi-card">
            <div className="erp-kpi-header">
              <span className="erp-kpi-label">Cancelled</span>
              <div className="erp-kpi-icon">
                <XCircle size={15} color={statusCounts.cancelled > 0 ? '#ef4444' : '#64748b'} />
              </div>
            </div>
            <div className="erp-kpi-body">
              <div className="erp-kpi-value" style={{ color: statusCounts.cancelled > 0 ? '#ef4444' : 'inherit' }}>
                {statusCounts.cancelled}
              </div>
              <div className="erp-kpi-sparkline" style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', paddingBottom: '2px' }}>
                <div style={{ width: '8px', height: '14px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '16px', backgroundColor: '#cbd5e1', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                <div style={{ width: '8px', height: '22px', backgroundColor: statusCounts.cancelled > 0 ? '#ef4444' : '#94a3b8', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Visual Graphs & Charts Section */}
        <div className="erp-charts-grid">
          {/* Chart 1: Project Volume Velocity & Timeline Filters */}
          <div className="erp-chart-card">
            <div className="erp-chart-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="erp-chart-title">
                  <span>Project Volume</span>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                {/* Status Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', fontWeight: 500 }}>Status:</span>
                  <select
                    className="erp-select"
                    style={{ height: '30px', padding: '0 26px 0 8px', fontSize: '12px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Starting">Starting</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Period Filter with Button & Dropdown / Custom Date Popup */}
                <div ref={periodDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--erp-text-muted)', fontWeight: 500 }}>Period:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPeriodMenuOpen(prev => !prev);
                      if (isCustomPopupOpen) setIsCustomPopupOpen(false);
                    }}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      border: '1px solid var(--erp-border, #cbd5e1)',
                      borderRadius: '4px',
                      backgroundColor: '#ffffff',
                      color: 'var(--erp-text-main, #0f172a)',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                    }}
                  >
                    <Calendar size={13} color="var(--erp-text-muted)" />
                    <span>{activePeriodLabel}</span>
                    <ChevronDown
                      size={12}
                      color="var(--erp-text-muted)"
                      style={{
                        transform: isPeriodMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {/* Dropdown Menu or Custom Date Popup anchored near the button */}
                  {isPeriodMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        zIndex: 60,
                        minWidth: isCustomPopupOpen ? '260px' : '180px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--erp-border, #cbd5e1)',
                        borderRadius: '6px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      {!isCustomPopupOpen ? (
                        <>
                          {/* List of preset buttons */}
                          {[
                            { id: '6m', label: 'Last 6 Months' },
                            { id: '30d', label: 'Last 30 Days' },
                            { id: '1y', label: 'This Year' },
                            { id: 'all', label: 'All Time' },
                          ].map(item => {
                            const isSelected = datePreset === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleDatePresetChange(item.id)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  fontSize: '12px',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderRadius: '4px',
                                  border: isSelected ? '1px solid var(--erp-border, #e2e8f0)' : '1px solid #ffffff',
                                  backgroundColor: isSelected ? '#f1f5f9' : '#ffffff',
                                  color: isSelected ? 'var(--erp-primary)' : 'var(--erp-text-main)',
                                  fontWeight: isSelected ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                                }}
                              >
                                <span>{item.label}</span>
                                {isSelected && <Check size={13} color="var(--erp-primary)" />}
                              </button>
                            );
                          })}

                          <div style={{ height: '1px', backgroundColor: 'var(--erp-border, #e2e8f0)', margin: '4px 0' }} />

                          {/* Custom Date Range Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              setTempStartDate(startDate || todayStr);
                              setTempEndDate(endDate || todayStr);
                              setIsCustomPopupOpen(true);
                            }}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              fontSize: '12px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderRadius: '4px',
                              border: datePreset === 'custom' ? '1px solid var(--erp-border, #e2e8f0)' : '1px solid #ffffff',
                              backgroundColor: datePreset === 'custom' ? '#f1f5f9' : '#ffffff',
                              color: datePreset === 'custom' ? 'var(--erp-primary)' : 'var(--erp-text-main)',
                              fontWeight: datePreset === 'custom' ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (datePreset !== 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (datePreset !== 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
                            }}
                          >
                            <span>Custom Range...</span>
                            {datePreset === 'custom' && <Check size={13} color="var(--erp-primary)" />}
                          </button>
                        </>
                      ) : (
                        /* Custom Date Range Picker View near the button */
                        <div style={{ padding: '4px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '8px',
                              paddingBottom: '6px',
                              borderBottom: '1px solid var(--erp-border, #e2e8f0)',
                            }}
                          >
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                              Custom Date Range
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsCustomPopupOpen(false)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                border: '1px solid var(--erp-border, #cbd5e1)',
                                borderRadius: '4px',
                                color: 'var(--erp-text-main)',
                                fontSize: '11px',
                                cursor: 'pointer',
                                padding: '2px 8px',
                              }}
                            >
                              Presets
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                                Start Date:
                              </label>
                              <input
                                type="date"
                                className="erp-input"
                                style={{
                                  width: '100%',
                                  height: '30px',
                                  padding: '0 8px',
                                  fontSize: '12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid var(--erp-border, #cbd5e1)',
                                  borderRadius: '4px',
                                  color: 'var(--erp-text-main)',
                                }}
                                value={tempStartDate}
                                onChange={(e) => setTempStartDate(e.target.value)}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                                End Date:
                              </label>
                              <input
                                type="date"
                                className="erp-input"
                                style={{
                                  width: '100%',
                                  height: '30px',
                                  padding: '0 8px',
                                  fontSize: '12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid var(--erp-border, #cbd5e1)',
                                  borderRadius: '4px',
                                  color: 'var(--erp-text-main)',
                                }}
                                value={tempEndDate}
                                onChange={(e) => setTempEndDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                fontSize: '11.5px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid var(--erp-border, #cbd5e1)',
                                borderRadius: '4px',
                                color: 'var(--erp-text-main)',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setIsCustomPopupOpen(false);
                                setIsPeriodMenuOpen(false);
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              style={{
                                height: '28px',
                                padding: '0 12px',
                                fontSize: '11.5px',
                                backgroundColor: 'var(--erp-primary, #0284c7)',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#ffffff',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (tempStartDate && tempEndDate) {
                                  setStartDate(tempStartDate);
                                  setEndDate(tempEndDate);
                                  setDatePreset('custom');
                                  setIsCustomPopupOpen(false);
                                  setIsPeriodMenuOpen(false);
                                }
                              }}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive SVG Bar Chart */}
            <div className="erp-chart-canvas-wrapper">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="erp-chart-svg"
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                {/* Horizontal Gridlines & Y-Axis labels (Clean Project Volume integer counts, NO dollar signs) */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
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
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Bars & X-Axis Columns */}
                {barItems.map((b, idx) => {
                  const isHovered = hoveredPointIndex === idx;
                  const hasVolume = b.data.volume > 0;

                  return (
                    <g key={idx}>
                      {/* Active Project Volume Bar (only rendered when data exists) */}
                      {hasVolume && (
                        <rect
                          x={b.barX}
                          y={b.barY}
                          width={b.barWidth}
                          height={b.barHeight}
                          rx="3"
                          fill={isHovered ? 'var(--erp-primary-hover, #0284c7)' : 'var(--erp-primary, #0369a1)'}
                          style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                      )}

                      {/* Top Volume Count Label (visible when bar has volume or hovered) */}
                      {hasVolume && (
                        <text
                          x={b.centerX}
                          y={b.barY - 5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill={isHovered ? 'var(--erp-primary)' : 'var(--erp-text-main)'}
                          fontFamily="var(--erp-mono-font)"
                        >
                          {b.data.volume}
                        </text>
                      )}

                      {/* X-Axis Month / Date Label */}
                      <text
                        x={b.centerX}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isHovered ? '600' : '500'}
                        fill={isHovered ? 'var(--erp-text-main)' : 'var(--erp-text-muted)'}
                      >
                        {b.data.label}
                      </text>

                      {/* Invisible Hover Zone */}
                      <rect
                        x={b.slotX}
                        y={paddingTop}
                        width={b.slotWidth}
                        height={usableHeight + 18}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip Box */}
              {hoveredPointIndex !== null && barItems[hoveredPointIndex] && (
                <div
                  className="erp-chart-tooltip"
                  style={{
                    left: `${(barItems[hoveredPointIndex].centerX / chartWidth) * 100}%`,
                    top: `${(Math.max(paddingTop + 10, barItems[hoveredPointIndex].barY - 35) / chartHeight) * 100}%`,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--erp-text-main)', marginBottom: '3px' }}>
                    {barItems[hoveredPointIndex].data.fullLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--erp-primary)' }}>
                    <span>Project Volume:</span>
                    <strong style={{ fontFamily: 'var(--erp-mono-font)' }}>
                      {barItems[hoveredPointIndex].data.volume} {barItems[hoveredPointIndex].data.volume === 1 ? 'Project' : 'Projects'}
                    </strong>
                  </div>
                  {statusFilter !== 'all' && (
                    <div style={{ fontSize: '10.5px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                      Status: <strong style={{ color: 'var(--erp-text-main)' }}>{statusFilter}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chart Summary Footnote */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--erp-text-muted)', borderTop: '1px solid var(--erp-border)', paddingTop: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--erp-text-main)' }}>
                Total: {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
                {statusFilter !== 'all' ? ` (${statusFilter})` : ''}
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
