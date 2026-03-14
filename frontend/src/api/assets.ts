import { api } from './auth';
import type { AssetSummary, Holding, Account, AccountType, Pool } from '../types';
import type { PoolHistoryEntry } from './pools';

export type { Pool };
export type { PoolHistoryEntry };

export const getAssetSummary = async (): Promise<AssetSummary> => {
  const response = await api.get('/assets/summary/');
  return response.data;
};

export const getHoldings = async (): Promise<Holding[]> => {
  const response = await api.get('/assets/holdings/');
  return response.data;
};

export const getAccounts = async (): Promise<Account[]> => {
  const response = await api.get('/accounts/');
  return response.data;
};

export const updateAccount = async (accountId: string, data: { account_type?: AccountType; category?: string }): Promise<Account> => {
  const response = await api.put(`/accounts/${accountId}/`, data);
  return response.data;
};

export const getAccountTypes = async (): Promise<{ account_types: string[]; categories: string[] }> => {
  const response = await api.get('/accounts/types/');
  return response.data;
};
