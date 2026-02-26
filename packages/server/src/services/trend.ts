export interface TrendResult {
  trend: 'improving' | 'stable' | 'declining';
  slope: number;
  movingAverage: number;
  anomaly: boolean;
}

/** Supported window strings for trend computation. */
export type TrendWindow = '7d' | '30d' | '90d' | '6mo';

/** Convert a window string to a number of days. */
export function windowToDays(window: TrendWindow): number {
  switch (window) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '6mo':
      return 183;
  }
}

/** Validate whether a string is a valid TrendWindow. */
export function isValidWindow(value: string): value is TrendWindow {
  return ['7d', '30d', '90d', '6mo'].includes(value);
}

/** Map a window string to a human-readable label. */
function windowLabel(window?: TrendWindow): string {
  if (!window) return 'the observed period';
  switch (window) {
    case '7d':
      return 'the past 7 days';
    case '30d':
      return 'the past 30 days';
    case '90d':
      return 'the past 90 days';
    case '6mo':
      return 'the past 6 months';
  }
}

/**
 * Produce a short, natural-language summary of a trend result.
 *
 * Examples:
 *   "Your blood pressure has been declining over the past 30 days."
 *   "Cholesterol levels are stable."
 *   "Your step count has been improving over the past 7 days. Note: the latest reading appears unusual compared to your recent history."
 */
export function generateTrendSummary(
  category: string,
  trendResult: TrendResult,
  window?: TrendWindow,
): string {
  const label = formatCategoryLabel(category);
  const period = windowLabel(window);

  let sentence: string;
  switch (trendResult.trend) {
    case 'improving':
      sentence = `Your ${label} has been improving over ${period}.`;
      break;
    case 'declining':
      sentence = `Your ${label} has been declining over ${period}.`;
      break;
    case 'stable':
      sentence = `${capitalise(label)} levels are stable over ${period}.`;
      break;
  }

  if (trendResult.anomaly) {
    sentence +=
      ' Note: the latest reading appears unusual compared to your recent history.';
  }

  return sentence;
}

/** Format a category slug into a readable label (e.g. "blood_pressure" -> "blood pressure"). */
function formatCategoryLabel(category: string): string {
  return category.replace(/[_-]/g, ' ').toLowerCase();
}

/** Capitalise the first letter of a string. */
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
