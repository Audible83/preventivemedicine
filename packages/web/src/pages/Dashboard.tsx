import { useEffect, useState } from 'react';
import { SummaryCard } from '../components/SummaryCard.js';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';
import { api, type Observation, type Recommendation, type Reminder } from '../services/api.js';

interface SummaryItem {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'improving' | 'stable' | 'declining';
}

export function Dashboard() {
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [obsRes, recsRes, remindersRes] = await Promise.all([
        api.getObservations({ limit: '50' }),
        api.getRecommendations(),
        api.getReminders(),
      ]);

      const observations = obsRes.data || [];
      const recommendations = recsRes.data || [];
      const remindersList = remindersRes.data || [];

      const items = buildSummary(observations, recommendations);
      setSummaryData(items);
      setReminders(remindersList.filter((r: Reminder) => !r.completed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  function buildSummary(observations: Observation[], recommendations: Recommendation[]): SummaryItem[] {
    const items: SummaryItem[] = [];

    // Group observations by code to find the latest and detect trend
    const byCode = new Map<string, Observation[]>();
    for (const obs of observations) {
      const existing = byCode.get(obs.code) || [];
      existing.push(obs);
      byCode.set(obs.code, existing);
    }

    // Sort each group by date descending and take top metrics
    const priorityCodes = ['blood-pressure', 'heart-rate', 'bmi', 'steps', 'sleep'];
    const seen = new Set<string>();

    for (const code of priorityCodes) {
      const group = byCode.get(code);
      if (!group || group.length === 0) continue;

      const sorted = group.sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
      );
      const latest = sorted[0];
      const trend = detectTrend(sorted);

      items.push({
        label: latest.displayName,
        value: String(latest.value),
        unit: latest.unit,
        trend,
      });
      seen.add(code);
    }

    // Add any other metrics not yet shown (up to 4 more)
    for (const [code, group] of byCode) {
      if (seen.has(code) || items.length >= 6) break;
      const sorted = group.sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
      );
      const latest = sorted[0];
      const trend = detectTrend(sorted);
      items.push({
        label: latest.displayName,
        value: String(latest.value),
        unit: latest.unit,
        trend,
      });
    }

    // Active recommendations count
    const activeRecs = recommendations.filter((r) => !r.dismissed);
    items.push({
      label: 'Active Recommendations',
      value: activeRecs.length,
      trend: undefined,
    });

    return items;
  }

  function detectTrend(sorted: Observation[]): 'improving' | 'stable' | 'declining' | undefined {
    if (sorted.length < 2) return undefined;
    const latest = Number(sorted[0].value);
    const previous = Number(sorted[1].value);
    if (isNaN(latest) || isNaN(previous)) return undefined;
    const diff = latest - previous;
    const pct = Math.abs(diff / previous) * 100;
    if (pct < 2) return 'stable';
    // For most health metrics, lower is generally better (BP, HR, BMI),
    // but for activity metrics (steps), higher is better.
    // Use a simple heuristic: if the code suggests activity/steps, invert.
    const code = sorted[0].code.toLowerCase();
    const higherIsBetter = code.includes('step') || code.includes('sleep') || code.includes('activity');
    if (higherIsBetter) {
      return diff > 0 ? 'improving' : 'declining';
    }
    return diff < 0 ? 'improving' : 'declining';
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Your health at a glance</p>
        </div>
        <div className="loading-state">Loading your health data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Your health at a glance</p>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Your health at a glance</p>
      </div>

      {summaryData.length > 0 ? (
        <div className="card-grid">
          {summaryData.map((item) => (
            <SummaryCard key={item.label} {...item} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            No health data yet. Upload records or add observations to get started.
          </p>
        </div>
      )}

      {reminders.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Pending Reminders</h3>
          <ul style={{ paddingLeft: '1.25rem' }}>
            {reminders.map((r) => (
              <li key={r.id} style={{ marginBottom: '0.375rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {r.title}
                {r.description && <span> -- {r.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DisclaimerBanner />
    </div>
  );
}
