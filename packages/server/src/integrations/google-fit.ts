import { IntegrationAdapter, ParsedObservation } from './adapter.js';

/**
 * Google Fit Export Parser
 * Google Fit exports data via Google Takeout as JSON files.
 * We parse the aggregated daily summaries.
 */

interface GoogleFitDataPoint {
  startTimeNanos?: string;
  endTimeNanos?: string;
  value?: Array<{ fpVal?: number; intVal?: number; mapVal?: Array<{ key: string; value: { fpVal?: number } }> }>;
  fitValue?: Array<{ value: { fpVal?: number; intVal?: number } }>;
}

interface GoogleFitDataset {
  dataSourceId?: string;
  point?: GoogleFitDataPoint[];
}

interface GoogleFitExport {
  Data?: GoogleFitDataset[];
  // Google Takeout format
  [key: string]: unknown;
}

const SOURCE_MAP: Record<string, { category: string; code: string; displayName: string; unit: string }> = {
  'com.google.step_count': { category: 'activity', code: 'steps', displayName: 'Steps', unit: 'count' },
  'com.google.calories.expended': { category: 'activity', code: 'active_energy', displayName: 'Calories Burned', unit: 'kcal' },
  'com.google.distance.delta': { category: 'activity', code: 'distance_walking', displayName: 'Distance', unit: 'km' },
  'com.google.active_minutes': { category: 'activity', code: 'exercise_minutes', displayName: 'Active Minutes', unit: 'min' },
  'com.google.heart_rate.bpm': { category: 'vital', code: 'heart_rate', displayName: 'Heart Rate', unit: 'bpm' },
  'com.google.blood_pressure': { category: 'vital', code: 'bp_systolic', displayName: 'Blood Pressure', unit: 'mmHg' },
  'com.google.weight': { category: 'vital', code: 'weight', displayName: 'Body Weight', unit: 'kg' },
  'com.google.height': { category: 'vital', code: 'height', displayName: 'Height', unit: 'cm' },
  'com.google.body.fat.percentage': { category: 'vital', code: 'body_fat', displayName: 'Body Fat', unit: '%' },
  'com.google.oxygen_saturation': { category: 'vital', code: 'spo2', displayName: 'Blood Oxygen', unit: '%' },
  'com.google.sleep.segment': { category: 'sleep', code: 'sleep_duration', displayName: 'Sleep Duration', unit: 'hours' },
  'com.google.blood_glucose': { category: 'lab', code: 'glucose', displayName: 'Blood Glucose', unit: 'mg/dL' },
  'com.google.body.temperature': { category: 'vital', code: 'temperature', displayName: 'Body Temperature', unit: '°C' },
};

function nanosToDate(nanos: string): Date {
  return new Date(parseInt(nanos) / 1_000_000);
}

function parseGoogleFitJSON(content: string): ParsedObservation[] {
  const observations: ParsedObservation[] = [];

  let data: GoogleFitExport;
  try {
    data = JSON.parse(content);
  } catch {
    return observations;
  }

  // Handle Google Takeout daily aggregation files
  if (Array.isArray(data)) {
    for (const entry of data as Record<string, unknown>[]) {
      const date = entry.date as string;
      if (!date) continue;

      const timestamp = new Date(date);

      // Steps
      if (typeof entry.steps === 'number' && entry.steps > 0) {
        observations.push({
          category: 'activity', code: 'steps', displayName: 'Steps',
          value: entry.steps as number, unit: 'count', timestamp,
          source: 'sensor:google_fit', confidence: 0.9,
        });
      }

      // Calories
      if (typeof entry.calories === 'number' && entry.calories > 0) {
        observations.push({
          category: 'activity', code: 'active_energy', displayName: 'Calories Burned',
          value: entry.calories as number, unit: 'kcal', timestamp,
          source: 'sensor:google_fit', confidence: 0.9,
        });
      }

      // Distance (meters → km)
      if (typeof entry.distance === 'number' && entry.distance > 0) {
        observations.push({
          category: 'activity', code: 'distance_walking', displayName: 'Distance',
          value: (entry.distance as number) / 1000, unit: 'km', timestamp,
          source: 'sensor:google_fit', confidence: 0.9,
        });
      }

      // Heart rate
      if (typeof entry.heart_rate === 'number' && entry.heart_rate > 0) {
        observations.push({
          category: 'vital', code: 'heart_rate', displayName: 'Heart Rate',
          value: entry.heart_rate as number, unit: 'bpm', timestamp,
          source: 'sensor:google_fit', confidence: 0.9,
        });
      }
    }
    return observations;
  }

  // Handle raw Google Fit API export format
  if (data.Data && Array.isArray(data.Data)) {
    for (const dataset of data.Data) {
      if (!dataset.dataSourceId || !dataset.point) continue;

      const sourceKey = Object.keys(SOURCE_MAP).find((k) => dataset.dataSourceId?.includes(k));
      if (!sourceKey) continue;

      const mapping = SOURCE_MAP[sourceKey];

      for (const point of dataset.point) {
        if (!point.startTimeNanos || !point.value?.[0]) continue;

        const val = point.value[0].fpVal ?? point.value[0].intVal;
        if (val === undefined || isNaN(val)) continue;

        observations.push({
          category: mapping.category,
          code: mapping.code,
          displayName: mapping.displayName,
          value: val,
          unit: mapping.unit,
          timestamp: nanosToDate(point.startTimeNanos),
          source: 'sensor:google_fit',
          confidence: 0.9,
          metadata: { googleFitSource: sourceKey },
        });
      }
    }
  }

  return observations;
}

export const googleFitAdapter: IntegrationAdapter = {
  config: {
    id: 'google_fit',
    name: 'Google Fit',
    description: 'Import data from Google Fit via Google Takeout export (JSON). Go to takeout.google.com and select Google Fit data.',
    type: 'file_import',
    supportedCategories: ['vital', 'activity', 'sleep', 'lab'],
  },

  async parseExport(buffer: Buffer): Promise<ParsedObservation[]> {
    const content = buffer.toString('utf-8');
    return parseGoogleFitJSON(content);
  },
};
