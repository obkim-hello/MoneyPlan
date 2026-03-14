import React, { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { CurrencyDollarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { getAccounts, getHoldings, getAccountTypes } from '../api/assets';
import { getPools, createPool, updatePool, deletePool, assignHoldingToPool, assignHoldingAllocation, getPoolCategories } from '../api/pools';
import { getAllocations } from '../api/allocations';
import type { Account, Holding, Pool, PoolCategory, Allocation } from '../types';

const ALLOCATION_CATEGORIES = ['Stock', 'Bond', 'Cash', 'Crypto', 'Other'];

interface AccountWithHoldings extends Account {
  holdings: Holding[];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountWithHoldings[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [poolCategories, setPoolCategories] = useState<string[]>([]);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [poolFormData, setPoolFormData] = useState<{ name: string; category: PoolCategory; description: string }>({ name: '', category: 'growth', description: '' });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'pool' | 'category'>('pool');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, holdingsData, poolsData, categoriesData, typesData, allocationsData] = await Promise.all([
        getAccounts(),
        getHoldings(),
        getPools(),
        getPoolCategories(),
        getAccountTypes(),
        getAllocations()
      ]);

      // Keep accountTypes available for future use
      void typesData;

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
      setAllocations(allocationsData);
      setPoolCategories(categoriesData.categories || []);

      // Auto-select first account if none selected
      if (!selectedAccountId && accountsWithHoldings.length > 0) {
        setSelectedAccountId(accountsWithHoldings[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const handleAssignAllocationCategory = async (holdingId: string, allocationName: string | null) => {
    try {
      // Find allocation ID by name
      const allocation = allocations.find(a => a.name === allocationName);
      const allocationId = allocation?.id || null;
      await assignHoldingAllocation(holdingId, allocationId);
      await loadData();
    } catch (error) {
      console.error('Failed to assign allocation:', error);
    }
  };

  const assetAccounts = accounts.filter(a => a.category === 'asset');
  const liabilityAccounts = accounts.filter(a => a.category === 'liability');
  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.current_balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.current_balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Group asset accounts by account_type for display
  const groupAccountsByType = (accs: AccountWithHoldings[]) => {
    const groups: Record<string, AccountWithHoldings[]> = {};
    accs.forEach(acc => {
      const type = acc.account_type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(acc);
    });
    return groups;
  };

  const assetGroups = groupAccountsByType(assetAccounts);
  const liabilityGroups = groupAccountsByType(liabilityAccounts);

  const getHoldingsByPool = () => {
    if (!selectedAccount) return { unassigned: [] };

    const grouped: Record<string, Holding[]> = {};
    pools.forEach(pool => {
      grouped[pool.id] = [];
    });
    grouped.unassigned = [];

    selectedAccount?.holdings.forEach(holding => {
      if (holding.pool_id && grouped[holding.pool_id]) {
        grouped[holding.pool_id].push(holding);
      } else {
        grouped.unassigned.push(holding);
      }
    });

    return grouped;
  };

  const holdingsByPool = getHoldingsByPool();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Assets</p>
            <p className="text-xl font-black font-mono text-emerald-500">
              ${totalAssets >= 1000 ? `${(totalAssets / 1000).toFixed(0)}k` : totalAssets.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liabilities</p>
            <p className="text-xl font-black font-mono text-rose-500">
              ${totalLiabilities >= 1000 ? `-${(totalLiabilities / 1000).toFixed(1)}k` : `-${totalLiabilities.toLocaleString()}`}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-600 p-4 shadow-lg shadow-indigo-500/20 text-white col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Net Worth</p>
                <p className="text-xl font-black font-mono">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-colors">
                Analyze
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Accounts & Pools */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Investment Accounts */}
            <div>
              <h3 className="px-2 mb-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Net Worth</h3>
              <button
                onClick={() => setSelectedAccountId(null)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all mb-4 ${
                  selectedAccountId === null
                    ? 'bg-indigo-600 ring-2 ring-indigo-500 shadow-md text-white'
                    : 'bg-white ring-1 ring-slate-200 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <div>
                    <p className="text-sm font-bold">Total Net Worth</p>
                    <p className={`text-[10px] font-bold uppercase ${selectedAccountId === null ? 'text-indigo-200' : 'text-emerald-500'}`}>
                      Assets - Liabilities
                    </p>
                  </div>
                </div>
                <p className="font-mono text-sm font-bold">${netWorth.toLocaleString()}</p>
              </button>

              {/* Asset Accounts */}
              <h3 className="px-2 mb-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Assets</h3>
              <div className="space-y-2 mb-6">
                {Object.entries(assetGroups).map(([type, accs]) => (
                  <div key={type} className='flex flex-col justify-start items-center gap-3'>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider px-2 mb-1 text-left">{type}</div>
                    {accs.map(account => (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          selectedAccountId === account.id
                            ? 'bg-white ring-2 ring-indigo-500 shadow-md dark:bg-slate-800'
                            : 'bg-white/50 ring-1 ring-slate-200 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                          <p className="text-sm font-bold">{account.name}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-emerald-600">${account.current_balance.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Liability Accounts */}
              <h3 className="px-2 mb-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Liabilities</h3>
              <div className="space-y-2">
                {Object.entries(liabilityGroups).map(([type, accs]) => (
                  <div key={type} className='flex flex-col justify-start items-center gap-3'>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider px-2 mb-1 flex flex-col justify-center items-center gap-3">{type}</div>
                    {accs.map(account => (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                          selectedAccountId === account.id
                            ? 'bg-white ring-2 ring-indigo-500 shadow-md dark:bg-slate-800'
                            : 'bg-white/50 ring-1 ring-slate-200 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                          <p className="text-sm font-bold">{account.name}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-rose-600">-${account.current_balance.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {accounts.length === 0 && (
                <div className="p-4 text-center text-slate-400">
                  <p className="text-sm">No accounts</p>
                  <Link to="/settings" className="text-xs text-indigo-500 hover:underline">Connect in Settings</Link>
                </div>
              )}
            </div>

            {/* Pools */}
            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pools</h3>
                <button
                  onClick={() => { setShowPoolForm(true); setEditingPoolId(null); setPoolFormData({ name: '', category: 'growth', description: '' }); }}
                  className="text-xs font-bold text-indigo-500 hover:underline"
                >
                  + New
                </button>
              </div>

              {(showPoolForm || editingPoolId) && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Pool name"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-700 border-0"
                    value={poolFormData.name}
                    onChange={(e) => setPoolFormData({ ...poolFormData, name: e.target.value })}
                  />
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-700 border-0"
                    value={poolFormData.category}
                    onChange={(e) => setPoolFormData({ ...poolFormData, category: e.target.value as PoolCategory })}
                  >
                    {poolCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    {editingPoolId ? (
                      <>
                        <button onClick={() => handleUpdatePool(editingPoolId)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-bold">Save</button>
                        <button onClick={() => { setEditingPoolId(null); setShowPoolForm(false); }} className="flex-1 bg-slate-300 dark:bg-slate-600 py-1.5 rounded-lg text-xs font-bold">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleCreatePool} className="flex-1 bg-indigo-600 text-white py-1.5 rounded-lg text-xs font-bold">Create</button>
                        <button onClick={() => setShowPoolForm(false)} className="flex-1 bg-slate-300 dark:bg-slate-600 py-1.5 rounded-lg text-xs font-bold">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {pools.map(pool => (
                  <div
                    key={pool.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/50 ring-1 ring-slate-200 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{pool.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{pool.category}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingPoolId(pool.id); setPoolFormData({ name: pool.name, category: pool.category, description: pool.description || '' }); setShowPoolForm(true); }}
                        className="text-[10px] text-slate-400 hover:text-indigo-500"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="text-[10px] text-slate-400 hover:text-red-500"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
                {pools.length === 0 && (
                  <p className="text-xs text-slate-400 px-2">No pools yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Net Worth Overview or Holdings Table */}
          <div className="flex-1 min-w-0">
            <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 overflow-hidden">
              {selectedAccountId === null ? (
                /* Net Worth Overview */
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-black mb-2">Total Net Worth</h2>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Assets - Liabilities</p>
                  </div>

                  {/* Net Worth Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white shadow-2xl mb-6">
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Net Worth</p>
                      <p className="text-5xl font-bold mt-2">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[100px]"></div>
                    <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-[100px]"></div>
                  </div>

                  {/* Assets & Liabilities Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-6">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Assets</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${totalAssets.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-6">
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Total Liabilities</p>
                      <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">${totalLiabilities.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Account Breakdown */}
                  <div className="mt-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Breakdown</h3>
                    <div className="space-y-3">
                      {/* Asset Accounts */}
                      {Object.entries(assetGroups).map(([type, accs]) => (
                        <div key={type}>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">{type}</p>
                          {accs.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 mb-2">
                              <div className="flex items-center gap-2">
                                <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                                <p className="text-sm font-bold">{account.name}</p>
                              </div>
                              <p className="font-mono text-sm font-bold text-emerald-600">${account.current_balance.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                      {/* Liability Accounts */}
                      {Object.entries(liabilityGroups).map(([type, accs]) => (
                        <div key={type}>
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-2">{type}</p>
                          {accs.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 mb-2">
                              <div className="flex items-center gap-2">
                                <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                                <p className="text-sm font-bold">{account.name}</p>
                              </div>
                              <p className="font-mono text-sm font-bold text-rose-600">-${account.current_balance.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black">
                          Holdings <span className="ml-2 text-sm font-normal text-slate-400 font-mono">
                            ({selectedAccount?.holdings.length || 0})
                          </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">
                          {selectedAccount?.name || 'Select an account'}
                        </p>
                      </div>

                      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl self-start md:self-center">
                        <button
                          onClick={() => setViewMode('pool')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
                            viewMode === 'pool'
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          BY POOL
                        </button>
                        <button
                          onClick={() => setViewMode('category')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
                            viewMode === 'category'
                              ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          BY CATEGORY
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Holdings Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-700">
                        <th className="px-6 py-4">Security</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Allocation Pool</th>
                        <th className="px-6 py-4 text-right">Price / Qty</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {viewMode === 'pool' ? (
                        <>
                          {/* Pool Groups */}
                          {pools.map(pool => {
                            const poolHoldings = holdingsByPool[pool.id] || [];
                            if (poolHoldings.length === 0) return null;
                            return (
                              <React.Fragment key={pool.id}>
                                <tr className="bg-indigo-50/30 dark:bg-indigo-900/10">
                                  <td colSpan={5} className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                      <span className="text-[11px] font-black uppercase text-indigo-600 tracking-wider">{pool.name}</span>
                                    </div>
                                  </td>
                                </tr>
                                {poolHoldings.map(holding => (
                                  <HoldingRow
                                    key={holding.id}
                                    holding={holding}
                                    pools={pools}
                                    onAssignPool={handleAssignHolding}
                                    onAssignAllocation={handleAssignAllocationCategory}
                                  />
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {/* Unassigned */}
                          {holdingsByPool.unassigned.length > 0 && (
                            <React.Fragment key="unassigned">
                              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                <td colSpan={5} className="px-6 py-2">
                                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider italic">Unassigned Holdings</span>
                                </td>
                              </tr>
                              {holdingsByPool.unassigned.map(holding => (
                                <HoldingRow
                                  key={holding.id}
                                  holding={holding}
                                  pools={pools}
                                  onAssignPool={handleAssignHolding}
                                  onAssignAllocation={handleAssignAllocationCategory}
                                  isUnassigned
                                />
                              ))}
                            </React.Fragment>
                          )}
                        </>
                      ) : (
                        /* Category View */
                        <>
                          {ALLOCATION_CATEGORIES.map(category => {
                            const categoryHoldings = selectedAccount?.holdings.filter(h => h.allocation_category === category);
                            if (!categoryHoldings || categoryHoldings.length === 0) return null;
                            return (
                              <React.Fragment key={category}>
                                <tr className="bg-indigo-50/30 dark:bg-indigo-900/10">
                                  <td colSpan={5} className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                      <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">{category}</span>
                                    </div>
                                  </td>
                                </tr>
                                {categoryHoldings.map(holding => (
                                  <HoldingRow
                                    key={holding.id}
                                    holding={holding}
                                    pools={pools}
                                    onAssignPool={handleAssignHolding}
                                    onAssignAllocation={handleAssignAllocationCategory}
                                  />
                                ))}
                              </React.Fragment>
                            );
                          })}
                          {/* Unassigned in Category View */}
                          {(selectedAccount?.holdings?.filter(h => !h.allocation_category)?.length || 0) > 0 && (
                            <React.Fragment key="unassigned-category">
                              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                <td colSpan={5} className="px-6 py-2">
                                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider italic">Unassigned</span>
                                </td>
                              </tr>
                              {selectedAccount?.holdings?.filter(h => !h.allocation_category)?.map(holding => (
                                <HoldingRow
                                  key={holding.id}
                                  holding={holding}
                                  pools={pools}
                                  onAssignPool={handleAssignHolding}
                                  onAssignAllocation={handleAssignAllocationCategory}
                                  isUnassigned
                                />
                              ))}
                            </React.Fragment>
                          )}
                        </>
                      )}

                      {selectedAccount?.holdings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            <p className="text-sm">No holdings in this account</p>
                            <p className="text-xs mt-1">Connect an account in Settings to sync holdings</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
              </div>

              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 text-center">
                <button className="text-xs font-bold text-indigo-600 hover:underline tracking-widest">
                  + ADD HOLDING MANUALLY
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function HoldingRow({
  holding,
  pools,
  onAssignPool,
  onAssignAllocation,
  isUnassigned = false
}: {
  holding: Holding;
  pools: Pool[];
  onAssignPool: (holdingId: string, poolId: string | null) => void;
  onAssignAllocation: (holdingId: string, allocationCategory: string | null) => void;
  isUnassigned?: boolean;
}) {
  const assignedPool = pools.find(p => p.id === holding.pool_id);
  const isCash = holding.symbol === 'CASH' || holding.symbol === 'Cash' || holding.asset_type === 'cash';

  return (
    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${
             'bg-blue-100 dark:bg-blue-900/50 text-blue-600'
          }`}>
            {isCash ? 'C' : (holding.symbol?.charAt(0) || '?')}
          </div>
          <div>
            <p className="text-sm font-bold">{isCash ? 'CASH' : holding.symbol}</p>
            <p className="text-[10px] text-slate-400">{holding.name?.substring(0, 30)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 ">
        <Menu as="div" className="">
          <Menu.Button className={`'px-4 py-1 w-full rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors relative'`}>
            {holding.allocation_category || 'Assign'}
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute z-20 mt-1 w-32 origin-top-left rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg focus:outline-none">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onAssignAllocation(holding.id, null)}
                      className={`${active ? 'bg-slate-100 dark:bg-slate-700' : ''} w-full px-3 py-2 text-left text-xs`}
                    >
                      None
                    </button>
                  )}
                </Menu.Item>
                {ALLOCATION_CATEGORIES.map(cat => (
                  <Menu.Item key={cat}>
                    {({ active }) => (
                      <button
                        onClick={() => onAssignAllocation(holding.id, cat)}
                        className={`${active ? 'bg-slate-100 dark:bg-slate-700' : ''} w-full px-3 py-2 text-left text-xs`}
                      >
                        {cat}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </td>
      <td className="px-6 py-4">
        <Menu as="div" className="">
          <Menu.Button className={'text-xs font-medium text-slate-600 dark:text-slate-400 italic hover:text-indigo-500'}>
            {(assignedPool?.name || (isUnassigned ? 'Assign Pool...' : '-'))}
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute z-20 mt-1 w-40 origin-top-left rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg focus:outline-none">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onAssignPool(holding.id, null)}
                      className={`${active ? 'bg-slate-100 dark:bg-slate-700' : ''} w-full px-3 py-2 text-left text-xs`}
                    >
                      None
                    </button>
                  )}
                </Menu.Item>
                {pools.map(pool => (
                  <Menu.Item key={pool.id}>
                    {({ active }) => (
                      <button
                        onClick={() => onAssignPool(holding.id, pool.id)}
                        className={`${active ? 'bg-slate-100 dark:bg-slate-700' : ''} w-full px-3 py-2 text-left text-xs flex items-center justify-between`}
                      >
                        <span>{pool.name}</span>
                        <span className="text-[10px] text-slate-400">({pool.category})</span>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </td>
      <td className="px-6 py-4 text-right font-mono text-xs">
        {isCash ? (
          <p className="text-slate-400">-</p>
        ) : (
          <>
            <p className="text-slate-400">${holding.current_price?.toFixed(2) || '0.00'}</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">x {holding.quantity?.toFixed(2) || '0.00'}</p>
          </>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <p className="font-mono font-bold">${(holding.current_value || 0).toLocaleString()}</p>
      </td>
    </tr>
  );
}
