import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';

const CATEGORIES = ['All', 'Vitals', 'Labs', 'Activity', 'Sleep'];

// Placeholder data
const CHART_DATA = [
  { date: '2025-09', systolic: 125, diastolic: 82, heartRate: 72, steps: 7200 },
  { date: '2025-10', systolic: 122, diastolic: 80, heartRate: 70, steps: 7800 },
  { date: '2025-11', systolic: 120, diastolic: 78, heartRate: 69, steps: 8100 },
  { date: '2025-12', systolic: 121, diastolic: 79, heartRate: 68, steps: 8400 },
  { date: '2026-01', systolic: 119, diastolic: 77, heartRate: 67, steps: 8600 },
  { date: '2026-02', systolic: 120, diastolic: 78, heartRate: 68, steps: 8432 },
];

export function TimelinePage() {
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div>
      <div className="page-header">
        <h2>Health Timeline</h2>
        <p>Track your health data over time</p>
      </div>

      <div className="filter-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="chart-container">
        <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Blood Pressure & Heart Rate
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={CHART_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#dc2626" name="Systolic" strokeWidth={2} />
            <Line type="monotone" dataKey="diastolic" stroke="#2563eb" name="Diastolic" strokeWidth={2} />
            <Line type="monotone" dataKey="heartRate" stroke="#16a34a" name="Heart Rate" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
          Daily Steps
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={CHART_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="steps" stroke="#7c3aed" name="Steps" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
