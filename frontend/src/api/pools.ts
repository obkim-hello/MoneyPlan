import { api } from './auth';
import type { Pool, PoolCategory } from '../types';

export type { Pool };

export interface PoolHistoryEntry {
  date: string;
  pools: { pool_id: string; pool_name: string; value: number }[];
  total: number;
}

export const getPools = async (): Promise<Pool[]> => {
  const response = await api.get('/pools/');
  return response.data;
};

export const createPool = async (data: { name: string; category: PoolCategory; description?: string }): Promise<Pool> => {
  const response = await api.post('/pools/', data);
  return response.data;
};

export const updatePool = async (poolId: string, data: { name?: string; category?: PoolCategory; description?: string }): Promise<Pool> => {
  const response = await api.put(`/pools/${poolId}/`, data);
  return response.data;
};

export const deletePool = async (poolId: string): Promise<void> => {
  await api.delete(`/pools/${poolId}/`);
};

export const assignHoldingToPool = async (holdingId: string, poolId: string | null): Promise<{ id: string; pool_id: string | null }> => {
  const response = await api.put(`/pools/holdings/${holdingId}/pool/`, { pool_id: poolId });
  return response.data;
};

export const assignHoldingAllocation = async (holdingId: string, allocationId: string | null): Promise<{ id: string; allocation_id: string | null }> => {
  const response = await api.put(`/pools/holdings/${holdingId}/allocation/`, { allocation_id: allocationId });
  return response.data;
};

export const getPoolCategories = async (): Promise<{ categories: string[] }> => {
  const response = await api.get('/pools/categories/');
  return response.data;
};

export const getPoolHistory = async (months: number = 12): Promise<PoolHistoryEntry[]> => {
  const response = await api.get(`/pools/history/?months=${months}`);
  return response.data;
};

export const createPoolSnapshot = async (): Promise<{ status: string; date: string }> => {
  const response = await api.post('/pools/snapshot/');
  return response.data;
};
