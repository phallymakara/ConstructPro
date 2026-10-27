import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Truck,
  CheckCircle2,
  ChevronRight,
  Calendar,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { useDashboardController } from '../../controllers/useDashboardController';
import { calculateDynamicProjectStatus } from '../../utils/taskProgress';

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    summary,
    allProjects,
    isLoading,
    errorMessage,
    receivePurchaseOrder
  } = useDashboardController();

  const [receivingPoId, setReceivingPoId] = useState<number | null>(null);

  const handleQuickReceive = async (poId: number) => {
    setReceivingPoId(poId);
    try {
      await receivePurchaseOrder(poId);
    } finally {
      setReceivingPoId(null);
    }
  };

  const formatEtaDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Pending';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const formatUnitLabel = (unit?: string) => {
    if (!unit) return '';
    if (unit === 'sq_m' || unit === 'sqm') return 'm²';
    return unit;
  };

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
        <div className="erp-empty-state">Loading operations metrics & workflow tracking...</div>
      </div>
    );
  }

  return (
    <div className="erp-content">
      <div className="erp-dashboard-scroll">

        {errorMessage && (
          <div style={{ color: 'var(--erp-text-error)', fontSize: '12.5px', padding: '6px 0' }}>
            {errorMessage}
          </div>
        )}

        {/* 1. Key Metrics - 4 Compact KPI Cards */}
        <div className="erp-kpi-grid-4">
          {/* Card 1: Contract Value */}
          <div
            className="erp-kpi-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '14px 18px',
              gap: '4px',
              minHeight: '84px',
              textAlign: 'left',
            }}
          >
            <span className="erp-kpi-label" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--erp-text-muted)' }}>
              Contract Value
            </span>
            <div className="erp-kpi-value" style={{ fontSize: '24px', lineHeight: 1.15, fontWeight: 700, textAlign: 'left' }}>
              ${(summary?.total_contract_value ?? 0).toLocaleString()}
            </div>
          </div>

          {/* Card 2: Collected */}
          <div
            className="erp-kpi-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '14px 18px',
              gap: '4px',
              minHeight: '84px',
              textAlign: 'left',
            }}
          >
            <span className="erp-kpi-label" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--erp-text-muted)' }}>
              Collected
            </span>
            <div className="erp-kpi-value" style={{ fontSize: '24px', lineHeight: 1.15, fontWeight: 700, textAlign: 'left' }}>
              ${(summary?.total_collected_cash ?? 0).toLocaleString()}
            </div>
          </div>

          {/* Card 3: Projected Profit */}
          <div
            className="erp-kpi-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '14px 18px',
              gap: '4px',
              minHeight: '84px',
              textAlign: 'left',
            }}
          >
            <span className="erp-kpi-label" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--erp-text-muted)' }}>
              Projected Profit
            </span>
            <div className="erp-kpi-value" style={{ fontSize: '24px', lineHeight: 1.15, fontWeight: 700, color: '#10b981', textAlign: 'left' }}>
              ${(summary?.projected_profit ?? 0).toLocaleString()}
            </div>
          </div>

          {/* Card 4: Active Projects */}
          <div
            className="erp-kpi-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '14px 18px',
              gap: '4px',
              minHeight: '84px',
              textAlign: 'left',
            }}
          >
            <span className="erp-kpi-label" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--erp-text-muted)' }}>
              Active Projects
            </span>
            <div className="erp-kpi-value" style={{ fontSize: '24px', lineHeight: 1.15, fontWeight: 700, textAlign: 'left' }}>
              {summary?.active_projects ?? statusCounts.inProgress}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--erp-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
              {statusCounts.overdue > 0 && (
                <span style={{ color: '#dc2626', fontWeight: 500 }}>
                  {statusCounts.overdue} overdue •
                </span>
              )}
              <span>{statusCounts.completed} done</span>
              <span>• {totalProjects} total</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Status Filter Dropdown */}
                <select
                  className="erp-select"
                  style={{ height: '32px', padding: '0 28px 0 10px', fontSize: '13px' }}
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

                {/* Period Filter with Button & Dropdown / Custom Date Popup */}
                <div ref={periodDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPeriodMenuOpen(prev => !prev);
                      if (isCustomPopupOpen) setIsCustomPopupOpen(false);
                    }}
                    className="erp-btn erp-btn-secondary erp-btn-sm"
                    style={{
                      height: '32px',
                      padding: '0 10px',
                      fontSize: '13px',
                      gap: '6px',
                      fontWeight: 500,
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
                        border: '1px solid var(--erp-border)',
                        borderRadius: 'var(--erp-radius-sm)',
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
                                  fontSize: '13px',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  borderRadius: 'var(--erp-radius-xs)',
                                  border: isSelected ? '1px solid var(--erp-border)' : '1px solid transparent',
                                  backgroundColor: isSelected ? 'var(--erp-surface-hover)' : '#ffffff',
                                  color: isSelected ? 'var(--erp-primary)' : 'var(--erp-text-main)',
                                  fontWeight: isSelected ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--erp-surface-hover)';
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

                          <div style={{ height: '1px', backgroundColor: 'var(--erp-border)', margin: '4px 0' }} />

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
                              fontSize: '13px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderRadius: 'var(--erp-radius-xs)',
                              border: datePreset === 'custom' ? '1px solid var(--erp-border)' : '1px solid transparent',
                              backgroundColor: datePreset === 'custom' ? 'var(--erp-surface-hover)' : '#ffffff',
                              color: datePreset === 'custom' ? 'var(--erp-primary)' : 'var(--erp-text-main)',
                              fontWeight: datePreset === 'custom' ? 600 : 400,
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (datePreset !== 'custom') (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--erp-surface-hover)';
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
                              borderBottom: '1px solid var(--erp-border)',
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--erp-text-main)' }}>
                              Custom Date Range
                            </span>
                            <button
                              type="button"
                              className="erp-btn erp-btn-secondary erp-btn-sm"
                              onClick={() => setIsCustomPopupOpen(false)}
                              style={{
                                height: '26px',
                                fontSize: '12.5px',
                                padding: '0 8px',
                              }}
                            >
                              Presets
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                                Start Date:
                              </label>
                              <input
                                type="date"
                                className="erp-input"
                                style={{
                                  width: '100%',
                                  height: '32px',
                                  padding: '0 8px',
                                  fontSize: '13px',
                                }}
                                value={tempStartDate}
                                onChange={(e) => setTempStartDate(e.target.value)}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--erp-text-muted)', marginBottom: '3px' }}>
                                End Date:
                              </label>
                              <input
                                type="date"
                                className="erp-input"
                                style={{
                                  width: '100%',
                                  height: '32px',
                                  padding: '0 8px',
                                  fontSize: '13px',
                                }}
                                value={tempEndDate}
                                onChange={(e) => setTempEndDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              type="button"
                              className="erp-btn erp-btn-secondary erp-btn-sm"
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                fontSize: '12.5px',
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
                              className="erp-btn erp-btn-primary erp-btn-sm"
                              style={{
                                height: '28px',
                                padding: '0 12px',
                                fontSize: '12.5px',
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
                        fontSize="11"
                        fill="#94a3b8"
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
                          className="erp-chart-bar"
                          x={b.barX}
                          y={b.barY}
                          width={b.barWidth}
                          height={b.barHeight}
                          rx="3"
                          fill={isHovered ? 'var(--erp-primary-hover, #0284c7)' : 'var(--erp-primary, #0369a1)'}
                        />
                      )}

                      {/* Top Volume Count Label (visible when bar has volume or hovered) */}
                      {hasVolume && (
                        <text
                          x={b.centerX}
                          y={b.barY - 5}
                          textAnchor="middle"
                          fontSize="11"
                          fill={isHovered ? 'var(--erp-primary)' : 'var(--erp-text-main)'}
                        >
                          {b.data.volume}
                        </text>
                      )}

                      {/* X-Axis Month / Date Label */}
                      <text
                        x={b.centerX}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        fontSize="12"
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
                  <div style={{ color: 'var(--erp-text-main)', marginBottom: '3px', fontSize: '13px' }}>
                    {barItems[hoveredPointIndex].data.fullLabel}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--erp-primary)', fontSize: '13px' }}>
                    <span>Project Volume:</span>
                    <span>
                      {barItems[hoveredPointIndex].data.volume} {barItems[hoveredPointIndex].data.volume === 1 ? 'Project' : 'Projects'}
                    </span>
                  </div>
                  {statusFilter !== 'all' && (
                    <div style={{ fontSize: '12px', color: 'var(--erp-text-muted)', marginTop: '2px' }}>
                      Status: <span style={{ color: 'var(--erp-text-main)' }}>{statusFilter}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Project Lifecycle Stage Distribution (Donut & Stage Bars) */}
          <div className="erp-chart-card">
            <div className="erp-chart-header">
              <div className="erp-chart-title">
                <span style={{ fontSize: '16px' }}>Workflow Stages</span>
              </div>
              <button
                type="button"
                className="erp-link-btn"
                onClick={() => navigate({ to: '/projects' })}
                style={{ fontSize: '13.5px' }}
              >
                <span>Pipeline</span>
                <ChevronRight size={13} />
              </button>
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
                  <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--erp-text-main)', lineHeight: 1 }}>
                    {totalProjects}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '3px' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14.5px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              backgroundColor: s.color,
                            }}
                          />
                          <span style={{ color: 'var(--erp-text-main)', fontWeight: 500 }}>
                            {s.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--erp-text-main)', fontWeight: 600, fontSize: '14.5px' }}>{s.count}</span>
                          <span style={{ color: 'var(--erp-text-muted)', fontSize: '13px' }}>
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
          </div>
        </div>

        {/* 3. Operational Radar Grid (1.6fr / 1.1fr) */}
        <div className="erp-dashboard-radar-grid" style={{ marginTop: '14px' }}>
          {/* Left Panel: Material Shortages */}
          <div className="erp-chart-card">
            <div className="erp-chart-header" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="erp-chart-title" style={{ fontSize: '16px' }}>
                  Material Shortages
                </span>
                {(summary?.shortage_items?.length ?? 0) > 0 ? (
                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '13.5px' }}>
                    • {summary?.shortage_items?.length} Action Required
                  </span>
                ) : (
                  <span style={{ color: '#059669', fontWeight: 600, fontSize: '13.5px' }}>
                    • Buffer Healthy
                  </span>
                )}
              </div>
              <button
                type="button"
                className="erp-link-btn"
                onClick={() => navigate({ to: '/warehouse' })}
                style={{ fontSize: '13.5px' }}
              >
                <span>Warehouse</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {(!summary?.shortage_items || summary.shortage_items.length === 0) ? (
              <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '14px' }}>
                <CheckCircle2 size={24} color="#059669" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                All warehouse stock levels are above minimum safety buffer.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {summary.shortage_items.map((item) => {
                  const deficit = Math.max(0, item.minimum_stock - item.current_stock);
                  const fillPct = Math.min(100, Math.round((item.current_stock / item.minimum_stock) * 100));
                  const unitDisplay = formatUnitLabel(item.unit);

                  return (
                    <div
                      key={item.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(160px, 1.8fr) minmax(130px, 1.2fr) 95px 80px',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 8px',
                        borderBottom: '1px solid var(--erp-border)',
                        transition: 'background-color 0.15s ease',
                        borderRadius: 'var(--erp-radius-xs)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--erp-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Name & SKU */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 400, color: 'var(--erp-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--erp-text-muted)', marginTop: '2px', fontFamily: 'var(--erp-mono-font)' }}>
                          {item.code}
                        </div>
                      </div>

                      {/* Stock Level & Visual Progress Track */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{item.current_stock} {unitDisplay}</span>
                          <span style={{ color: 'var(--erp-text-muted)' }}>min {item.minimum_stock}</span>
                        </div>
                        <div className="erp-progress-track" style={{ height: '4px', backgroundColor: '#fee2e2' }}>
                          <div
                            className="erp-progress-fill"
                            style={{
                              width: `${fillPct}%`,
                              backgroundColor: '#dc2626',
                            }}
                          />
                        </div>
                      </div>

                      {/* Deficit */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '14.5px' }}>
                          -{deficit} {unitDisplay}
                        </span>
                      </div>

                      {/* Action */}
                      <div style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="erp-link-btn"
                          onClick={() => navigate({ to: '/purchasing' })}
                          style={{ fontSize: '13.5px' }}
                          title="Reorder material"
                        >
                          <span>Reorder</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Inbound Deliveries */}
          <div className="erp-chart-card">
            <div className="erp-chart-header" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="erp-chart-title" style={{ fontSize: '16px' }}>
                  Inbound Deliveries
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--erp-text-muted)' }}>
                  • {summary?.upcoming_deliveries?.length ?? 0} Pending
                </span>
              </div>
              <button
                type="button"
                className="erp-link-btn"
                onClick={() => navigate({ to: '/purchasing' })}
                style={{ fontSize: '13.5px' }}
              >
                <span>Purchasing</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {(!summary?.upcoming_deliveries || summary.upcoming_deliveries.length === 0) ? (
              <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--erp-text-muted)', fontSize: '14px' }}>
                <Truck size={24} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                No inbound shipments scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '4px' }}>
                {(summary.upcoming_deliveries ?? []).map((delivery, index, arr) => {
                  const isReceiving = receivingPoId === delivery.id;
                  const isOverseas = delivery.channel === 'Overseas';
                  const formattedEta = formatEtaDate(delivery.expected_delivery_date);
                  const isLast = index === arr.length - 1;

                  return (
                    <div
                      key={delivery.id}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        position: 'relative',
                        paddingBottom: isLast ? '0' : '6px',
                      }}
                    >
                      {/* Timeline track */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          paddingTop: '6px',
                          width: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {/* Dot */}
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: `2px solid ${isOverseas ? 'var(--erp-primary)' : 'var(--erp-text-light)'}`,
                            background: 'var(--erp-surface)',
                            flexShrink: 0,
                            zIndex: 1,
                          }}
                        />
                        {/* Connector line */}
                        {!isLast && (
                          <div
                            style={{
                              width: '2px',
                              flex: 1,
                              background: 'var(--erp-border)',
                              marginTop: '4px',
                            }}
                          />
                        )}
                      </div>

                      {/* Delivery content */}
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: 'var(--erp-radius-xs)',
                          marginBottom: isLast ? '0' : '4px',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--erp-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--erp-text-main)', fontFamily: 'var(--erp-mono-font)' }}>
                              {delivery.po_number}
                            </span>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 500,
                                color: isOverseas ? 'var(--erp-primary)' : 'var(--erp-text-muted)',
                              }}
                            >
                              {delivery.channel}
                            </span>
                          </div>
                          <div style={{ fontSize: '13.5px', color: 'var(--erp-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {delivery.supplier_name}
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--erp-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>ETA: {formattedEta}</span>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                          <button
                            type="button"
                            className="erp-link-btn"
                            disabled={isReceiving}
                            onClick={() => handleQuickReceive(delivery.id)}
                            style={{
                              fontSize: '13.5px',
                              opacity: isReceiving ? 0.6 : 1,
                              pointerEvents: isReceiving ? 'none' : 'auto',
                            }}
                          >
                            {isReceiving ? (
                              <Loader2 size={13} className="erp-spin" />
                            ) : null}
                            <span>Receive</span>
                            {!isReceiving && <ChevronRight size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
