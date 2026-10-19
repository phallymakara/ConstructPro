import { useState, useEffect, useCallback } from 'react';
import { api } from './apiClient';
import type { Customer, CustomerFormData } from '../models/types';

export function useCustomersController() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.get<Customer[]>('/customers/');
      setCustomers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load customer list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = async (data: CustomerFormData) => {
    setActionLoading(true);
    try {
      const newCust = await api.post<Customer>('/customers/', data);
      setCustomers(prev => [...prev, newCust]);
      setIsCreateModalOpen(false);
      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save customer');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery)
    );
  });

  return {
    customers: filteredCustomers,
    rawCount: customers.length,
    searchQuery,
    isLoading,
    actionLoading,
    errorMessage,
    isCreateModalOpen,
    setSearchQuery,
    setIsCreateModalOpen,
    createCustomer,
    refresh: fetchCustomers,
  };
}
