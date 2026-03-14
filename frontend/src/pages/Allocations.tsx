import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllocations, createAllocation, updateAllocation, deleteAllocation, getAllocationBreakdown, getAllocationHistory, createAllocationSnapshot, Allocation, AllocationBreakdown, AllocationHistory } from '../api/allocations';
import { getHoldings } from '../api/assets';

const ASSET_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bond', label: 'Bond' },
  { value: 'cash', label: 'Cash' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

export default function Allocations() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [breakdown, setBreakdown] = useState<AllocationBreakdown[]>([]);
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', asset_types: '', sort_order: 0 });
  const [availableAssetTypes, setAvailableAssetTypes] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allocData, breakdownData, historyData] = await Promise.all([
        getAllocations(),
        getAllocationBreakdown(),
        getAllocationHistory(12)
      ]);
      setAllocations(allocData);
      setBreakdown(breakdownData);
      setHistory(historyData);

      const holdings = await getHoldings();
      const types = [...new Set(holdings.map((h: any) => h.asset_type))] as string[];
      setAvailableAssetTypes(types);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      await createAllocationSnapshot();
      toast.success('Snapshot saved!');
      await loadData();
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.asset_types) return;
    try {
      if (editingId) {
        await updateAllocation(editingId, formData);
      } else {
        await createAllocation(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', asset_types: '', sort_order: 0 });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this allocation?')) return;
    try {
      await deleteAllocation(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const startEdit = (alloc: Allocation) => {
    setEditingId(alloc.id);
    setFormData({
      name: alloc.name,
      asset_types: alloc.asset_types,
      sort_order: alloc.sort_order
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Asset Allocation</h1>
      </div>

      {/* Allocation Breakdown */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Current Allocation</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`btn btn-sm ${showHistory ? 'btn-secondary' : 'btn-primary'}`}
            >
              {showHistory ? 'Hide Trend' : 'Show Trend'}
            </button>
            <button onClick={handleSaveSnapshot} className="btn btn-success btn-sm">
              Save Snapshot
            </button>
          </div>
        </div>

        {showHistory && history.length > 0 && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <h3 className="font-medium mb-3">Historical Trend</h3>
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Month</th>
                    {breakdown.filter(b => b.name !== 'Total').map((item, idx) => (
                      <th key={idx} className="text-right">{item.name}</th>
                    ))}
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((month, idx) => (
                    <tr key={idx} className={idx === history.length - 1 ? 'font-semibold' : ''}>
                      <td>{month.date}</td>
                      {breakdown.filter(b => b.name !== 'Total').map((item, i) => {
                        const monthItem = month.breakdown?.find(b => b.name === item.name);
                        return (
                          <td key={i} className="text-right font-mono">
                            {monthItem ? `${monthItem.percentage.toFixed(1)}%` : '-'}
                          </td>
                        );
                      })}
                      <td className="text-right font-mono">${month.total_value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
              {breakdown.map((item, idx) => (
                <tr key={idx} className={item.name === 'Total' ? 'font-semibold bg-slate-50 dark:bg-slate-800/50' : ''}>
                  <td className="font-medium">{item.name}</td>
                  <td className="text-right font-mono">{item.percentage.toFixed(2)}%</td>
                  <td className="text-right font-mono">${item.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocation Categories */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Allocation Categories</h2>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', asset_types: '', sort_order: 0 }); }}
            className="btn btn-primary btn-sm"
          >
            + Add Category
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[150px]">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Stock, Bond"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="min-w-[200px]">
                <label className="form-label">Asset Types (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., stock,etf"
                  value={formData.asset_types}
                  onChange={(e) => setFormData({ ...formData, asset_types: e.target.value })}
                />
              </div>
              <div className="w-24">
                <label className="form-label">Sort Order</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="btn btn-success btn-sm">
                  {editingId ? 'Save' : 'Add'}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Available asset types: {ASSET_TYPES.map(t => t.value).join(', ')}
              <br />
              Your holdings have: {availableAssetTypes.join(', ')}
            </p>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Asset Types</th>
                <th className="w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(alloc => (
                <tr key={alloc.id}>
                  <td className="font-medium">{alloc.name}</td>
                  <td className="font-mono text-sm">{alloc.asset_types}</td>
                  <td>
                    <button onClick={() => startEdit(alloc)} className="text-blue-500 hover:text-blue-600 mr-3">Edit</button>
                    <button onClick={() => handleDelete(alloc.id)} className="text-red-500 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allocations.length === 0 && (
          <div className="empty-state">
            <p>No allocation categories yet. Add categories to see your asset allocation breakdown.</p>
          </div>
        )}
      </div>
    </div>
  );
}
