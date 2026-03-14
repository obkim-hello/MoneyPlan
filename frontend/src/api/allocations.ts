import { api } from './auth';
import type { Allocation, AllocationBreakdown, AllocationHistory } from '../types';

export type { Allocation, AllocationBreakdown, AllocationHistory };

export const getAllocations = async (): Promise<Allocation[]> => {
  const response = await api.get('/allocations/');
  return response.data;
};

export const createAllocation = async (data: { name: string; asset_types: string; sort_order?: number }): Promise<Allocation> => {
  const response = await api.post('/allocations/', data);
  return response.data;
};

export const updateAllocation = async (allocationId: string, data: { name?: string; asset_types?: string; sort_order?: number }): Promise<Allocation> => {
  const response = await api.put(`/allocations/${allocationId}/`, data);
  return response.data;
};

export const deleteAllocation = async (allocationId: string): Promise<void> => {
  await api.delete(`/allocations/${allocationId}/`);
};

export const getAllocationBreakdown = async (): Promise<AllocationBreakdown[]> => {
  const response = await api.get('/allocations/breakdown/');
  return response.data;
};

export const getAllocationHistory = async (months: number = 12): Promise<AllocationHistory[]> => {
  const response = await api.get(`/allocations/history/?months=${months}`);
  return response.data;
};

export const createAllocationSnapshot = async (): Promise<{ status: string; date: string }> => {
  const response = await api.post('/allocations/snapshot/');
  return response.data;
};
