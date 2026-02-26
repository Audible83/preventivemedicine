export interface TrendResult {
  trend: 'improving' | 'stable' | 'declining';
  slope: number;
  movingAverage: number;
  anomaly: boolean;
}

export function detectTrend(values: { value: number; timestamp: Date }[]): TrendResult | null {
  if (values.length < 2) return null;

  // Sort by timestamp ascending
  const sorted = [...values].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate simple linear regression slope
  const n = sorted.length;
  const xValues = sorted.map((_, i) => i);
  const yValues = sorted.map((v) => v.value);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Moving average (last 7 points or all if fewer)
  const window = Math.min(7, n);
  const recentValues = yValues.slice(-window);
  const movingAverage = recentValues.reduce((a, b) => a + b, 0) / window;

  // Standard deviation for anomaly detection
  const mean = sumY / n;
  const variance = yValues.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);

  const latestValue = yValues[yValues.length - 1];
  const anomaly = Math.abs(latestValue - mean) > 2 * sd;

  // Determine trend
  const threshold = 0.05 * Math.abs(mean || 1); // 5% of mean as threshold
  let trend: 'improving' | 'stable' | 'declining';

  if (Math.abs(slope) < threshold) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = 'improving'; // Note: context-dependent, caller should interpret
  } else {
    trend = 'declining';
  }

  return { trend, slope, movingAverage, anomaly };
}
