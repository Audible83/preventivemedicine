import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';
import { api, type TimelineResponse } from '../services/api.js';

const STROKE_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#0891b2'];

const DEFAULT_CATEGORIES = ['All', 'vital', 'lab', 'activity', 'sleep'];

export function TimelinePage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [activeCategory]);

  async function loadTimeline() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (activeCategory !== 'All') {
        params.categories = activeCategory;
      }
      const res = await api.getTimeline(params);
      setTimelineData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }

  // Derive available categories from the data
  const categories = useMemo(() => {
    if (!timelineData?.categories || timelineData.categories.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return ['All', ...timelineData.categories];
  }, [timelineData]);

  // Group series by category for charting
  const charts = useMemo(() => {
    if (!timelineData?.series || !timelineData?.data) return [];

    const filteredSeries =
      activeCategory === 'All'
        ? timelineData.series
        : timelineData.series.filter((s) => s.category === activeCategory);

    // Group by category for separate chart panels
    const groups = new Map<string, typeof filteredSeries>();
    for (const s of filteredSeries) {
      const cat = s.category;
      const existing = groups.get(cat) || [];
      existing.push(s);
      groups.set(cat, existing);
    }

    return Array.from(groups.entries()).map(([category, series]) => ({
      category,
      series,
    }));
  }, [timelineData, activeCategory]);

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      vital: 'Vitals',
      lab: 'Labs',
      activity: 'Activity',
      sleep: 'Sleep',
      nutrition: 'Nutrition',
    };
    return labels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Health Timeline</h2>
        <p>Track your health data over time</p>
      </div>

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'All' ? 'All' : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-state">Loading timeline data...</div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadTimeline}>Retry</button>
        </div>
      )}

      {!loading && !error && charts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            No timeline data available. Upload health records or add observations to see trends.
          </p>
        </div>
      )}

      {!loading && !error && charts.map(({ category, series }) => (
        <div className="chart-container" key={category}>
          <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
            {categoryLabel(category)}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timelineData!.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={STROKE_COLORS[idx % STROKE_COLORS.length]}
                  name={s.label}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      <DisclaimerBanner />
    </div>
  );
}
