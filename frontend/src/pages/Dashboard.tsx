import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssetSummary, getHoldings } from '../api/assets';
import { getAllocationBreakdown, getAllocationHistory, AllocationBreakdown, AllocationHistory } from '../api/allocations';
import { getPools } from '../api/pools';
import { AssetSummary, Holding, Pool, PoolValue } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  Stock: '#3B82F6',
  Bond: '#10B981',
  Cash: '#F59E0B',
  Crypto: '#8B5CF6',
  Other: '#6B7280'
};

const CATEGORY_ICONS: Record<string, string> = {
  Stock: 'S',
  Bond: 'B',
  Cash: 'C',
  Crypto: 'Y',
  Other: 'O'
};

export default function Dashboard() {
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [allocations, setAllocations] = useState<AllocationBreakdown[]>([]);
  const [pools, setPools] = useState<PoolValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Stock');
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistory[]>([]);
  const [timeRange, setTimeRange] = useState<'6' | '12'>('6');

  useEffect(() => {
    Promise.all([
      getAssetSummary(),
      getAllocationBreakdown(),
      getPools(),
      getHoldings(),
      getAllocationHistory(Number(timeRange))
    ]).then(([summaryData, allocationData, poolData, holdingsData, historyData]) => {
      setSummary(summaryData);
      setAllocations(allocationData);
      setAllocationHistory(historyData);

      const poolValues: Record<string, number> = {};

      poolData.forEach((pool: Pool) => {
        poolValues[pool.id] = 0;
      });

      holdingsData.forEach((holding: Holding) => {
        if (holding.pool_id && poolValues[holding.pool_id] !== undefined) {
          poolValues[holding.pool_id] += holding.current_value || 0;
        }
      });

      const totalPoolValue = Object.values(poolValues).reduce((sum, val) => sum + val, 0);

      const poolValueList: PoolValue[] = poolData.map((pool: Pool) => ({
        id: pool.id,
        name: pool.name,
        category: pool.category,
        value: poolValues[pool.id],
        percentage: totalPoolValue > 0 ? (poolValues[pool.id] / totalPoolValue) * 100 : 0
      }));

      setPools(poolValueList);
      setLoading(false);
    });
  }, [timeRange]);

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalNetWorth = (summary.total_assets || 0) - (summary.total_liabilities || 0);
  const cashTotal = summary.cash_total || 0;
  const investmentTotal = summary.investment_total || 0;
  const emergencyFund = summary.emergency_fund || 0;

  const displayAllocations = allocations.filter(a => a.name !== 'Total');

  const trendData = allocationHistory.slice(-Number(timeRange)).map(h => {
    const categoryData = h.breakdown.find(b => b.name === selectedCategory);
    return categoryData?.value || 0;
  });
  const maxTrendValue = Math.max(...trendData, 1);

  const netWorthChange = ((totalNetWorth - 1000000) / 1000000 * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Financial Overview</h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Welcome back, here's what's happening with your money.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/accounts"
              className="flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 transition-all"
            >
              Generate Report
            </Link>
            <Link
              to="/accounts"
              className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
            >
              + Add Transaction
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-white shadow-2xl lg:col-span-8 group">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Net Worth</p>
                  <span className="flex items-center rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    {Number(netWorthChange) >= 0 ? '↑' : '↓'} {Math.abs(Number(netWorthChange))}% this month
                  </span>
                </div>
                <h3 className="mt-4 text-5xl font-bold tracking-tight">
                  ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Cash</p>
                  <p className="text-lg font-semibold">${cashTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Investments</p>
                  <p className="text-lg font-semibold">${investmentTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Emergency Fund</p>
                  <p className="text-lg font-semibold text-orange-400">${emergencyFund.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-[100px] transition-all group-hover:bg-indigo-600/30"></div>
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]"></div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 lg:col-span-4">
            <h4 className="text-lg font-bold">Asset Allocation</h4>
            <div className="relative mt-8 flex justify-center">
              <div className="relative flex h-48 w-48 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="3"></circle>
                  {displayAllocations.slice(0, 1).map((alloc, idx) => (
                    <circle
                      key={idx}
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-amber-500"
                      strokeWidth="3"
                      strokeDasharray={`${alloc.percentage || 0}, 100`}
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">100%</span>
                  <span className="text-[10px] uppercase text-slate-500">Liquid Cash</span>
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="flex gap-3">
                <span className="text-amber-600 text-lg">⚠️</span>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  <span className="font-bold block mb-1">Concentration Risk</span>
                  Your cash ratio is extremely high. Consider diversifying into stocks or bonds to beat inflation.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold">Growth Trend</h4>
              <select
                className="rounded-lg border-none bg-slate-100 px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '6' | '12')}
              >
                <option value="6">Last 6 Months</option>
                <option value="12">Last Year</option>
              </select>
            </div>
            <div className="h-[240px] w-full flex items-end gap-2 px-2 overflow-hidden">
              {trendData.map((value, idx) => (
                <div
                  key={idx}
                  className={`w-full rounded-t-lg transition-all hover:bg-indigo-500 ${idx === trendData.length - 1 ? 'bg-indigo-600' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}
                  style={{ height: `${(value / maxTrendValue) * 100}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between mt-4 px-2 text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
              {allocationHistory.slice(-Number(timeRange)).map((h, idx) => (
                <span key={idx}>
                  {new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 lg:col-span-4 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Assets Breakdown</h4>
            </div>
            <ul className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {displayAllocations.length > 0 ? displayAllocations.map((alloc, idx) => {
                const bgColor = CATEGORY_COLORS[alloc.name] || CATEGORY_COLORS.Other;
                const icon = CATEGORY_ICONS[alloc.name] || 'O';
                return (
                <li
                  key={idx}
                  className="group flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCategory(alloc.name)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center font-bold"
                      style={{ backgroundColor: bgColor + '20', color: bgColor }}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{alloc.name}</p>
                      <p className="text-xs text-slate-400">{alloc.percentage?.toFixed(2)}% Share</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold font-mono">${(alloc.value || 0).toLocaleString()}</p>
                </li>
                );
              }) : (
                <>
                  <li className="group flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center font-bold">S</div>
                      <div>
                        <p className="text-sm font-semibold">Stock</p>
                        <p className="text-xs text-slate-400">0.00% Share</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold font-mono">$0</p>
                  </li>
                  <li className="group flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center font-bold">B</div>
                      <div>
                        <p className="text-sm font-semibold">Bond</p>
                        <p className="text-xs text-slate-400">0.00% Share</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold font-mono">$0</p>
                  </li>
                  <li className="group flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 flex items-center justify-center font-bold">C</div>
                      <div>
                        <p className="text-sm font-semibold">Cash</p>
                        <p className="text-xs text-slate-400">100.00% Share</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold font-mono">${cashTotal.toLocaleString()}</p>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="lg:col-span-12 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold">Pools</h4>
              <Link to="/accounts" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Manage All Pools</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pools.length > 0 ? pools.map((pool) => (
                <div
                  key={pool.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-700 hover:border-indigo-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      pool.category === 'emergency' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' :
                      pool.category === 'daily' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-700'
                    }`}>
                      {pool.category === 'emergency' ? '🚨' : pool.category === 'daily' ? '☕' : '💰'}
                    </div>
                    <div>
                      <p className="font-bold">{pool.name}</p>
                      <p className="text-xs text-slate-400 leading-3 mt-1">
                        {pool.category === 'emergency' ? 'Target: $50,000' : pool.category === 'daily' ? 'Cash Pool' : pool.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">${pool.value.toLocaleString()}</p>
                    {pool.category === 'emergency' && (
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div className="bg-red-500 h-full w-[0%]"></div>
                      </div>
                    )}
                    {pool.category !== 'emergency' && (
                      <span className="text-[10px] text-slate-400 font-medium">No activity today</span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-8 text-slate-400">
                  <p className="mb-4">No pools yet. Create pools to organize your holdings.</p>
                  <Link
                    to="/accounts"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Create Pool
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
