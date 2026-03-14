import { useEffect, useState } from 'react';
import { getAccounts, getHoldings, updateAccount, getAccountTypes } from '../api/assets';
import { getPools, createPool, updatePool, deletePool, assignHoldingToPool, assignHoldingAllocationCategory, getPoolCategories } from '../api/pools';
import type { Account, Holding, Pool, PoolCategory, AccountType } from '../types';

const ALLOCATION_CATEGORIES = ['Stock', 'Bond', 'Cash', 'Crypto', 'Other'];

interface AccountWithHoldings extends Account {
  holdings: Holding[];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountWithHoldings[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolCategories, setPoolCategories] = useState<string[]>([]);
  const [accountTypes, setAccountTypes] = useState<{ account_types: string[]; categories: string[] }>({ account_types: [], categories: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [poolFormData, setPoolFormData] = useState<{ name: string; category: PoolCategory; description: string }>({ name: '', category: 'growth', description: '' });
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, holdingsData, poolsData, categoriesData, typesData] = await Promise.all([
        getAccounts(),
        getHoldings(),
        getPools(),
        getPoolCategories(),
        getAccountTypes()
      ]);

      setAccountTypes({ account_types: typesData.account_types || [], categories: typesData.categories || [] });

      const holdingsByAccount: Record<string, Holding[]> = {};
      for (const holding of holdingsData) {
        if (!holdingsByAccount[holding.account_id]) {
          holdingsByAccount[holding.account_id] = [];
        }
        holdingsByAccount[holding.account_id].push(holding);
      }

      const accountsWithHoldings: AccountWithHoldings[] = accountsData.map((account) => ({
        ...account,
        holdings: holdingsByAccount[account.id] || []
      }));

      setAccounts(accountsWithHoldings);
      setPools(poolsData);
      setPoolCategories(categoriesData.categories);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleUpdate = async (accountId: string, field: 'account_type' | 'category', value: string) => {
    try {
      const updateData: { account_type?: AccountType; category?: string } = {};
      if (field === 'account_type') {
        updateData.account_type = value as AccountType;
      } else if (field === 'category') {
        updateData.category = value;
      }
      await updateAccount(accountId, updateData);
      const accountsData = await getAccounts();
      const holdingsData = await getHoldings();
      const holdingsByAccount: Record<string, Holding[]> = {};
      for (const holding of holdingsData) {
        if (!holdingsByAccount[holding.account_id]) {
          holdingsByAccount[holding.account_id] = [];
        }
        holdingsByAccount[holding.account_id].push(holding);
      }
      const accountsWithHoldings: AccountWithHoldings[] = accountsData.map((account) => ({
        ...account,
        holdings: holdingsByAccount[account.id] || []
      }));
      setAccounts(accountsWithHoldings);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleCreatePool = async () => {
    if (!poolFormData.name || !poolFormData.category) return;
    try {
      await createPool({
        name: poolFormData.name,
        category: poolFormData.category,
        description: poolFormData.description || undefined
      });
      setShowPoolForm(false);
      setPoolFormData({ name: '', category: 'growth', description: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to create pool:', error);
    }
  };

  const handleUpdatePool = async (poolId: string) => {
    if (!poolFormData.name || !poolFormData.category) return;
    try {
      await updatePool(poolId, {
        name: poolFormData.name,
        category: poolFormData.category,
        description: poolFormData.description || undefined
      });
      setEditingPoolId(null);
      setPoolFormData({ name: '', category: 'growth', description: '' });
      await loadData();
    } catch (error) {
      console.error('Failed to update pool:', error);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this pool?')) return;
    try {
      await deletePool(poolId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete pool:', error);
    }
  };

  const handleAssignHolding = async (holdingId: string, poolId: string | null) => {
    try {
      await assignHoldingToPool(holdingId, poolId);
      await loadData();
    } catch (error) {
      console.error('Failed to assign holding:', error);
    }
  };

  const handleAssignAllocationCategory = async (holdingId: string, allocationCategory: string | null) => {
    try {
      await assignHoldingAllocationCategory(holdingId, allocationCategory);
      await loadData();
    } catch (error) {
      console.error('Failed to assign allocation category:', error);
    }
  };

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const totalAssets = accounts
    .filter(a => a.category === 'asset')
    .reduce((sum, a) => sum + a.current_balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.category === 'liability')
    .reduce((sum, a) => sum + a.current_balance, 0);

  const groupHoldingsByPool = (holdings: Holding[], accountPools: Pool[]) => {
    const grouped: Record<string, Holding[]> = { unassigned: [] };
    for (const pool of accountPools) {
      grouped[pool.id] = [];
    }
    for (const holding of holdings) {
      if (holding.pool_id && grouped[holding.pool_id]) {
        grouped[holding.pool_id].push(holding);
      } else {
        grouped.unassigned.push(holding);
      }
    }
    return grouped;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Accounts</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="summary-card card">
          <h3>Total Assets</h3>
          <p className="text-emerald-500">${totalAssets.toLocaleString()}</p>
        </div>
        <div className="summary-card card">
          <h3>Total Liabilities</h3>
          <p className="text-red-500">${totalLiabilities.toLocaleString()}</p>
        </div>
        <div className="summary-card card">
          <h3>Net Worth</h3>
          <p>${(totalAssets - totalLiabilities).toLocaleString()}</p>
        </div>
      </div>

      {/* Pool Management */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pools</h2>
          <button
            onClick={() => { setShowPoolForm(true); setEditingPoolId(null); setPoolFormData({ name: '', category: 'growth', description: '' }); }}
            className="btn btn-primary btn-sm"
          >
            + New Pool
          </button>
        </div>

        {(showPoolForm || editingPoolId) && (
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Pool name"
                  value={poolFormData.name}
                  onChange={(e) => setPoolFormData({ ...poolFormData, name: e.target.value })}
                />
              </div>
              <div className="min-w-[150px]">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={poolFormData.category}
                  onChange={(e) => setPoolFormData({ ...poolFormData, category: e.target.value as PoolCategory })}
                >
                  {poolCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional"
                  value={poolFormData.description}
                  onChange={(e) => setPoolFormData({ ...poolFormData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                {editingPoolId ? (
                  <>
                    <button onClick={() => handleUpdatePool(editingPoolId)} className="btn btn-success btn-sm">Save</button>
                    <button onClick={() => { setEditingPoolId(null); setPoolFormData({ name: '', category: 'growth', description: '' }); }} className="btn btn-secondary btn-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleCreatePool} className="btn btn-success btn-sm">Create</button>
                    <button onClick={() => { setShowPoolForm(false); setPoolFormData({ name: '', category: 'growth', description: '' }); }} className="btn btn-secondary btn-sm">Cancel</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {pools.map(pool => (
            <div
              key={pool.id}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
            >
              <span className="font-medium">{pool.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">({pool.category})</span>
              <button
                onClick={() => { setEditingPoolId(pool.id); setPoolFormData({ name: pool.name, category: pool.category, description: pool.description || '' }); }}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeletePool(pool.id)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          ))}
          {pools.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400 text-sm">No pools yet. Create a pool to organize your holdings.</p>
          )}
        </div>
      </div>

      {/* Accounts Section */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Click on the type or category to edit. Click on an account to see its holdings.
        </p>

        <div className="space-y-4">
          {accounts.map(account => {
            const isExpanded = expandedAccounts.has(account.id);
            const isBank = account.account_type === 'bank';
            const groupedHoldings = groupHoldingsByPool(account.holdings, pools);

            return (
              <div key={account.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div
                  onClick={() => toggleAccount(account.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                    <div>
                      <div className="font-semibold">{account.name}</div>
                      {account.institution && <div className="text-sm text-slate-500">{account.institution}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-semibold">${account.current_balance.toLocaleString()}</span>
                    <div className="flex gap-2">
                      {editingId === `${account.id}-type` ? (
                        <select
                          value={account.account_type}
                          onChange={(e) => { e.stopPropagation(); handleUpdate(account.id, 'account_type', e.target.value); }}
                          onBlur={(e) => { e.stopPropagation(); setEditingId(null); }}
                          onClick={(e) => e.stopPropagation()}
                          className="form-input py-1 px-2 text-sm"
                        >
                          {accountTypes.account_types.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingId(`${account.id}-type`); }}
                          className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs cursor-pointer"
                        >
                          {account.account_type}
                        </span>
                      )}
                      {editingId === `${account.id}-category` ? (
                        <select
                          value={account.category}
                          onChange={(e) => { e.stopPropagation(); handleUpdate(account.id, 'category', e.target.value); }}
                          onBlur={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="form-input py-1 px-2 text-sm"
                        >
                          {accountTypes.categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingId(`${account.id}-category`); }}
                          className={`px-2 py-1 rounded text-xs cursor-pointer ${
                            account.category === 'asset' ? 'badge-asset' : 'badge-liability'
                          }`}
                        >
                          {account.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    {account.holdings.length === 0 ? (
                      <p className="text-center text-slate-500 py-4">
                        {isBank ? 'Cash balance will appear here after sync' : 'No holdings. Connect an account to sync holdings.'}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {pools.map(pool => {
                          const poolHoldings = groupedHoldings[pool.id] || [];
                          if (poolHoldings.length === 0) return null;
                          return (
                            <div key={pool.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <span className="text-blue-500">Pool:</span> {pool.name}
                                <span className="text-xs text-slate-500">({pool.category})</span>
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {poolHoldings.map(holding => (
                                  <HoldingCard key={holding.id} holding={holding} pools={pools} onAssignPool={handleAssignHolding} onAssignAllocation={handleAssignAllocationCategory} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {groupedHoldings.unassigned.length > 0 && (
                          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <h4 className="font-medium mb-3 text-slate-500">Unassigned</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groupedHoldings.unassigned.map(holding => (
                                <HoldingCard key={holding.id} holding={holding} pools={pools} onAssignPool={handleAssignHolding} onAssignAllocation={handleAssignAllocationCategory} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <div className="empty-state">
            <p>No accounts found. Connect a bank account in Settings first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HoldingCard({
  holding,
  pools,
  onAssignPool,
  onAssignAllocation
}: {
  holding: Holding;
  pools: Pool[];
  onAssignPool: (holdingId: string, poolId: string | null) => void;
  onAssignAllocation: (holdingId: string, allocationCategory: string | null) => void;
}) {
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);
  const [showAllocDropdown, setShowAllocDropdown] = useState(false);
  const assignedPool = pools.find(p => p.id === holding.pool_id);

  return (
    <div className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono font-bold text-lg">{holding.symbol}</span>
          <span className="text-xs text-slate-500 ml-2">({holding.asset_type})</span>
        </div>
        <div className="text-right">
          <div className="font-semibold">${holding.current_value?.toLocaleString() || '0'}</div>
          <div className="text-xs text-slate-500">${holding.current_price?.toLocaleString() || '0'} x {holding.quantity}</div>
        </div>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-3 truncate">{holding.name}</div>

      {/* Allocation Category Selector */}
      <div className="mb-2 relative">
        <button
          onClick={() => { setShowAllocDropdown(!showAllocDropdown); setShowPoolDropdown(false); }}
          className={`w-full px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between ${
            holding.allocation_category
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          <span>{holding.allocation_category ? `Category: ${holding.allocation_category}` : 'Assign to Category...'}</span>
          <span className="text-xs">▼</span>
        </button>
        {showAllocDropdown && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
            <div
              onClick={() => { onAssignAllocation(holding.id, null); setShowAllocDropdown(false); }}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm ${
                !holding.allocation_category ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
            >
              None
            </div>
            {ALLOCATION_CATEGORIES.map(cat => (
              <div
                key={cat}
                onClick={() => { onAssignAllocation(holding.id, cat); setShowAllocDropdown(false); }}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm ${
                  holding.allocation_category === cat ? 'bg-slate-100 dark:bg-slate-700' : ''
                }`}
              >
                {cat}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pool Selector */}
      <div className="relative">
        <button
          onClick={() => { setShowPoolDropdown(!showPoolDropdown); setShowAllocDropdown(false); }}
          className={`w-full px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between ${
            assignedPool
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          <span>{assignedPool ? `Pool: ${assignedPool.name}` : 'Assign to Pool...'}</span>
          <span className="text-xs">▼</span>
        </button>
        {showPoolDropdown && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
            <div
              onClick={() => { onAssignPool(holding.id, null); setShowPoolDropdown(false); }}
              className={`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm ${
                !holding.pool_id ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
            >
              None
            </div>
            {pools.map(pool => (
              <div
                key={pool.id}
                onClick={() => { onAssignPool(holding.id, pool.id); setShowPoolDropdown(false); }}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center justify-between ${
                  holding.pool_id === pool.id ? 'bg-slate-100 dark:bg-slate-700' : ''
                }`}
              >
                <span>{pool.name}</span>
                <span className="text-xs text-slate-500">({pool.category})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
