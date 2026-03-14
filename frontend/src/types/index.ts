// Asset types for the MoneyPlan frontend

// Asset Summary from /assets/summary/
export interface AssetSummary {
  total_assets: number;
  cash_total: number;
  emergency_fund: number;
  investment_total: number;
}

// Asset Type enum (matches backend AssetType)
export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'bond'
  | 'cash'
  | 'crypto'
  | 'commodity'
  | 'real_estate'
  | 'other';

// Holding Category enum (matches backend HoldingCategory)
export type HoldingCategory = 'equity' | 'fixed_income' | 'cash' | 'alternative';

// Holding from /assets/holdings/
export interface Holding {
  id: string;
  account_id: string;
  pool_id: string | null;
  allocation_category: string | null;
  symbol: string;
  name: string;
  asset_type: AssetType;
  category: HoldingCategory;
  quantity: number;
  cost_basis: number | null;
  current_price: number | null;
  current_value: number | null;
  currency: string;
  purchase_date: string | null;
}

// Account Type enum (matches backend AccountType)
export type AccountType =
  | 'investment'
  | 'bank'
  | 'credit'
  | 'loan'
  | 'mortgage'
  | 'insurance'
  | 'crypto'
  | 'other';

// Account Category enum (matches backend AccountCategoryType)
export type AccountCategoryType = 'asset' | 'liability';

// Account from /accounts/
export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  category: AccountCategoryType;
  institution: string | null;
  account_number: string | null;
  current_balance: number;
  currency: string;
  is_active: string;
  monarch_id: string | null;
  created_at: string;
  updated_at: string;
}

// Pool Category enum (matches backend PoolCategory)
export type PoolCategory =
  | 'growth'
  | 'dividend'
  | 'income'
  | 'speculative'
  | 'cash'
  | 'spending'
  | 'emergency';

// Pool from /pools/
export interface Pool {
  id: string;
  name: string;
  category: PoolCategory;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Pool with value (used in Dashboard for calculations)
export interface PoolValue {
  id: string;
  name: string;
  category: string;
  value: number;
  percentage: number;
}

// Allocation from /allocations/
export interface Allocation {
  id: string;
  name: string;
  asset_types: string;
  sort_order: number;
}

// Allocation Breakdown from /allocations/breakdown/
export interface AllocationBreakdown {
  name: string;
  percentage: number;
  value: number;
}

// Allocation History Entry from /allocations/history/
export interface AllocationHistory {
  date: string;
  breakdown: AllocationBreakdown[];
  total_value: number;
}
