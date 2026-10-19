import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type { Quotation, QuotationFormData, Customer, Project } from '../models/types';

export function useQuotationsController() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [quoteData, custData, projData] = await Promise.all([
        api.get<Quotation[]>('/quotations/'),
        api.get<Customer[]>('/customers/'),
        api.get<Project[]>('/projects/'),
      ]);
      setQuotations(quoteData);
      setCustomers(custData);
      setProjects(projData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const createQuotation = async (data: QuotationFormData) => {
    setActionLoading(true);
    try {
      const newQuote = await api.post<Quotation>('/quotations/', data);
      setQuotations(prev => [newQuote, ...prev]);
      setIsCreateModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create quotation');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const convertToProject = async (quotationId: number) => {
    setActionLoading(true);
    try {
      const updated = await api.post<Quotation>(`/quotations/${quotationId}/convert-to-project`, {});
      setQuotations(prev => prev.map(q => q.id === quotationId ? updated : q));
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to convert quotation to active project');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return {
    quotations: filteredQuotations,
    rawCount: quotations.length,
    customers,
    projects,
    statusFilter,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    setStatusFilter,
    setSearchQuery,
    setIsCreateModalOpen,
    createQuotation,
    convertToProject,
    refresh: fetchQuotations,
  };
}
