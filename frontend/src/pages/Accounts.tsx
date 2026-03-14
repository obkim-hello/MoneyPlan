import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccounts, getHoldings, getAccountTypes } from '../api/assets';
import { getPools, createPool, updatePool, deletePool, assignHoldingToPool, assignHoldingAllocationCategory, getPoolCategories } from '../api/pools';
import type { Account, Holding, Pool, PoolCategory } from '../types';

const ALLOCATION_CATEGORIES = ['Stock', 'Bond', 'Cash', 'Crypto', 'Other'];

interface AccountWithHoldings extends Account {
  holdings: Holding[];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountWithHoldings[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
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
      const [accountsData, holdingsData, poolsData, categoriesData, typesData] = await Promise.all([
        getAccounts(),
        getHoldings(),
        getPools(),
        getPoolCategories(),
        getAccountTypes()
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

  const handleAssignAllocationCategory = async (holdingId: string, allocationCategory: string | null) => {
    try {
      await assignHoldingAllocationCategory(holdingId, allocationCategory);
      await loadData();
    } catch (error) {
      console.error('Failed to assign allocation category:', error);
    }
  };

  const totalAssets = accounts
    .filter(a => a.category === 'asset')
    .reduce((sum, a) => sum + a.current_balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.category === 'liability')
    .reduce((sum, a) => sum + a.current_balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const getHoldingsByPool = () => {
    if (!selectedAccount) return { unassigned: [] };

    const grouped: Record<string, Holding[]> = {};
    pools.forEach(pool => {
      grouped[pool.id] = [];
    });
    grouped.unassigned = [];

    selectedAccount.holdings.forEach(holding => {
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
              <h3 className="px-2 mb-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Accounts</h3>
              <div className="space-y-2">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all ${
                      selectedAccountId === account.id
                        ? 'bg-white ring-2 ring-indigo-500 shadow-md dark:bg-slate-800'
                        : 'bg-white/50 ring-1 ring-slate-200 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏦</span>
                      <div>
                        <p className="text-sm font-bold">{account.name}</p>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase">{account.category}</p>
                      </div>
                    </div>
                    <p className="font-mono text-sm font-bold">${account.current_balance.toLocaleString()}</p>
                  </button>
                ))}
                {accounts.length === 0 && (
                  <div className="p-4 text-center text-slate-400">
                    <p className="text-sm">No accounts</p>
                    <Link to="/settings" className="text-xs text-indigo-500 hover:underline">Connect in Settings</Link>
                  </div>
                )}
              </div>
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

          {/* Main Content - Holdings Table */}
          <div className="flex-1 min-w-0">
            <div className="rounded-3xl bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 overflow-hidden">
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

              {/* Holdings Table */}
              <div className="overflow-x-auto">
                {selectedAccount ? (
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
                              <tbody key={pool.id}>
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
                              </tbody>
                            );
                          })}

                          {/* Unassigned */}
                          {holdingsByPool.unassigned.length > 0 && (
                            <tbody>
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
                            </tbody>
                          )}
                        </>
                      ) : (
                        /* Category View */
                        ALLOCATION_CATEGORIES.map(category => {
                          const categoryHoldings = selectedAccount.holdings.filter(h => h.allocation_category === category);
                          if (categoryHoldings.length === 0) return null;
                          return (
                            <tbody key={category}>
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
                            </tbody>
                          );
                        })
                      )}

                      {selectedAccount.holdings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                            <p className="text-sm">No holdings in this account</p>
                            <p className="text-xs mt-1">Connect an account in Settings to sync holdings</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <p>Select an account to view holdings</p>
                  </div>
                )}
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
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);
  const [showAllocDropdown, setShowAllocDropdown] = useState(false);
  const assignedPool = pools.find(p => p.id === holding.pool_id);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center font-black text-xs">
            {holding.symbol?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-bold">{holding.symbol}</p>
            <p className="text-[10px] text-slate-400">{holding.name?.substring(0, 30)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 relative">
        <button
          onClick={() => { setShowAllocDropdown(!showAllocDropdown); setShowPoolDropdown(false); }}
          className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors cursor-pointer"
        >
          {holding.allocation_category || 'Assign'}
        </button>
        {showAllocDropdown && (
          <div className="absolute top-full left-6 z-20 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => { onAssignAllocation(holding.id, null); setShowAllocDropdown(false); }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              None
            </button>
            {ALLOCATION_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { onAssignAllocation(holding.id, cat); setShowAllocDropdown(false); }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-6 py-4 relative">
        <button
          onClick={() => { setShowPoolDropdown(!showPoolDropdown); setShowAllocDropdown(false); }}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 italic hover:text-indigo-500"
        >
          {assignedPool?.name || (isUnassigned ? 'Assign Pool...' : '-')}
        </button>
        {showPoolDropdown && (
          <div className="absolute top-full left-6 z-20 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => { onAssignPool(holding.id, null); setShowPoolDropdown(false); }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              None
            </button>
            {pools.map(pool => (
              <button
                key={pool.id}
                onClick={() => { onAssignPool(holding.id, pool.id); setShowPoolDropdown(false); }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
              >
                <span>{pool.name}</span>
                <span className="text-[10px] text-slate-400">({pool.category})</span>
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right font-mono text-xs">
        <p className="text-slate-400">${holding.current_price?.toFixed(2) || '0.00'}</p>
        <p className="font-bold text-slate-900 dark:text-slate-100">x {holding.quantity?.toFixed(2) || '0.00'}</p>
      </td>
      <td className="px-6 py-4 text-right">
        <p className="font-mono font-bold">${(holding.current_value || 0).toLocaleString()}</p>
      </td>
    </tr>
  );
}
