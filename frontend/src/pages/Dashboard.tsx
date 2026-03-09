import { useEffect, useState } from 'react';
import { getAssetSummary } from '../api/assets';

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getAssetSummary().then(setSummary);
  }, []);

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h1>Financial Dashboard</h1>
      <div className="summary-cards">
        <div className="card">
          <h3>Total Assets</h3>
          <p>${summary.total_assets?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Cash</h3>
          <p>${summary.cash_total?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Emergency Fund</h3>
          <p>${summary.emergency_fund?.toLocaleString()}</p>
        </div>
        <div className="card">
          <h3>Investments</h3>
          <p>${summary.investment_total?.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
