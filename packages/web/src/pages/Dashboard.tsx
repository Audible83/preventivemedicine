import { SummaryCard } from '../components/SummaryCard.js';
import { DisclaimerBanner } from '../components/DisclaimerBanner.js';

// Placeholder data - will be replaced with API calls
const SUMMARY_DATA = [
  { label: 'Blood Pressure', value: '120/78', unit: 'mmHg', trend: 'stable' as const },
  { label: 'Resting Heart Rate', value: 68, unit: 'bpm', trend: 'improving' as const },
  { label: 'BMI', value: 24.2, unit: 'kg/m²', trend: 'stable' as const },
  { label: 'Steps (7-day avg)', value: '8,432', unit: 'steps', trend: 'improving' as const },
  { label: 'Sleep (7-day avg)', value: 7.2, unit: 'hrs', trend: 'stable' as const },
  { label: 'Active Recommendations', value: 5, trend: undefined },
];

const UPCOMING_SCREENINGS = [
  'Annual wellness check — discuss with clinician',
  'Cholesterol panel — consider scheduling if over 12 months since last',
  'Blood pressure check — routine follow-up',
];

export function Dashboard() {
  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Your health at a glance</p>
      </div>

      <div className="card-grid">
        {SUMMARY_DATA.map((item) => (
          <SummaryCard key={item.label} {...item} />
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Upcoming Screenings</h3>
        <ul style={{ paddingLeft: '1.25rem' }}>
          {UPCOMING_SCREENINGS.map((s, i) => (
            <li key={i} style={{ marginBottom: '0.375rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
