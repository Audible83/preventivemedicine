interface SummaryCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'improving' | 'stable' | 'declining';
}

const TREND_LABELS: Record<string, string> = {
  improving: '↑ Improving',
  stable: '→ Stable',
  declining: '↓ Declining',
};

export function SummaryCard({ label, value, unit, trend }: SummaryCardProps) {
  return (
    <div className="card summary-card">
      <span className="label">{label}</span>
      <div>
        <span className="value">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {trend && (
        <span className={`trend trend-${trend}`}>
          {TREND_LABELS[trend]}
        </span>
      )}
    </div>
  );
}
