import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type { DashboardSummary, Project, Material } from '../models/types';

export function useDashboardController() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [sumData, projData, matData] = await Promise.all([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get<Project[]>('/projects/'),
        api.get<Material[]>('/materials/'),
      ]);
      setSummary(sumData);
      setRecentProjects(projData.slice(0, 5));
      setLowStockMaterials(matData.filter(m => m.current_stock <= m.minimum_stock));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    summary,
    recentProjects,
    lowStockMaterials,
    isLoading,
    errorMessage,
    refresh: fetchDashboardData,
  };
}
