import { useEffect, useState } from 'react';
import { getAssetSummary, getHoldings } from '../api/assets';
import { getAllocationBreakdown, getAllocationHistory, AllocationBreakdown, AllocationHistory } from '../api/allocations';
import { getPools } from '../api/pools';
import { AssetSummary, Holding, Pool, PoolValue } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Stock: '#3B82F6',
  Bond: '#10B981',
  Cash: '#F59E0B',
  Crypto: '#8B5CF6',
  Other: '#6B7280'
};

export default function Dashboard() {
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [allocations, setAllocations] = useState<AllocationBreakdown[]>([]);
  const [pools, setPools] = useState<PoolValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Stock');
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistory[]>([]);

  useEffect(() => {
    Promise.all([
      getAssetSummary(),
      getAllocationBreakdown(),
      getPools(),
      getHoldings(),
      getAllocationHistory(12)
    ]).then(([summaryData, allocationData, poolData, holdingsData, historyData]) => {
      setSummary(summaryData);
      setAllocations(allocationData);
      setAllocationHistory(historyData);

      const poolValues: Record<string, number> = {};
      const holdingsByPool: Record<string, PoolValue> = {};

      poolData.forEach((pool: Pool) => {
        poolValues[pool.id] = 0;
        holdingsByPool[pool.id] = {
          id: pool.id,
          name: pool.name,
          category: pool.category,
          value: 0,
          percentage: 0
        };
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
  }, []);

  if (loading || !summary) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="summary-card card">
          <h3>Total Assets</h3>
          <p>${summary.total_assets?.toLocaleString()}</p>
        </div>
        <div className="summary-card card">
          <h3>Cash</h3>
          <p>${summary.cash_total?.toLocaleString()}</p>
        </div>
        <div className="summary-card card">
          <h3>Emergency Fund</h3>
          <p>${summary.emergency_fund?.toLocaleString()}</p>
        </div>
        <div className="summary-card card">
          <h3>Investments</h3>
          <p>${summary.investment_total?.toLocaleString()}</p>
        </div>
      </div>

      {/* Allocation Section */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Asset Allocation</h2>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="h-64">
            <p className="text-sm text-gray-500 mb-2 text-center">Click to select</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocations.filter(a => a.name !== 'Total')}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  onClick={(_, index) => {
                    const category = allocations.filter(a => a.name !== 'Total')[index]?.name;
                    if (category) setSelectedCategory(category);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {allocations.filter(a => a.name !== 'Total').map((alloc, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={CATEGORY_COLORS[alloc.name] || CATEGORY_COLORS.Other}
                      stroke={selectedCategory === alloc.name ? '#000' : undefined}
                      strokeWidth={selectedCategory === alloc.name ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="h-64">
            <p className="text-sm text-gray-500 mb-2 text-center">{selectedCategory} Trend</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={allocationHistory.map(h => {
                const categoryData = h.breakdown.find(b => b.name === selectedCategory);
                return {
                  date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  value: categoryData?.value || 0,
                  percentage: categoryData?.percentage || 0
                };
              })}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'value' ? `$${value.toLocaleString()}` : `${value.toFixed(2)}%`,
                    name === 'value' ? 'Value' : 'Percentage'
                  ]}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="value" stroke={CATEGORY_COLORS[selectedCategory] || CATEGORY_COLORS.Other} name="Value" />
                <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#6B7280" name="Percentage" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Percentage</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {allocations.filter(a => a.name !== 'Total').map((alloc, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedCategory(alloc.name)}
                  className={selectedCategory === alloc.name ? 'bg-blue-50 dark:bg-blue-900/20 cursor-pointer' : 'cursor-pointer'}
                >
                  <td className="font-medium">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: CATEGORY_COLORS[alloc.name] || CATEGORY_COLORS.Other }}
                    />
                    {alloc.name}
                  </td>
                  <td className="text-right font-mono">{alloc.percentage?.toFixed(2)}%</td>
                  <td className="text-right font-mono">${alloc.value?.toLocaleString()}</td>
                </tr>
              ))}
              {allocations.find(a => a.name === 'Total') && (
                <tr className="font-semibold bg-slate-50 dark:bg-slate-800/50">
                  <td>Total</td>
                  <td className="text-right font-mono">100%</td>
                  <td className="text-right font-mono">${allocations.find(a => a.name === 'Total')?.value?.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pools Section */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Pools</h2>
        {pools.length === 0 ? (
          <div className="empty-state">
            <p>No pools yet. Create pools in the Accounts page to organize your holdings.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pool</th>
                  <th>Category</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <tr key={pool.id}>
                    <td className="font-medium">{pool.name}</td>
                    <td><span className="badge badge-pool">{pool.category}</span></td>
                    <td className="text-right font-mono">${pool.value?.toLocaleString()}</td>
                    <td className="text-right font-mono">{pool.percentage?.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
