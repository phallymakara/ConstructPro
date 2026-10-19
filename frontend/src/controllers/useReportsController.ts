import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type {
  ProjectProfitabilityReportItem,
  MaterialUsageReportItem,
  DelayedProjectReportItem
} from '../models/types';

export function useReportsController() {
  const [profitability, setProfitability] = useState<ProjectProfitabilityReportItem[]>([]);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsageReportItem[]>([]);
  const [delays, setDelays] = useState<DelayedProjectReportItem[]>([]);
  const [activeTab, setActiveTab] = useState<'profitability' | 'materials' | 'delays'>('profitability');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [profData, matData, delayData] = await Promise.all([
        api.get<ProjectProfitabilityReportItem[]>('/reports/profitability'),
        api.get<MaterialUsageReportItem[]>('/reports/material-usage'),
        api.get<DelayedProjectReportItem[]>('/reports/delays'),
      ]);
      setProfitability(profData);
      setMaterialUsage(matData);
      setDelays(delayData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate operational reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Aggregate stats
  const totalRevenue = profitability.reduce((sum, p) => sum + p.contract_amount, 0);
  const totalCosts = profitability.reduce((sum, p) => sum + (p.actual_cost > 0 ? p.actual_cost : p.estimated_cost), 0);
  const totalGrossProfit = totalRevenue - totalCosts;
  const averageMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  return {
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
    refresh: fetchReports,
  };
}
