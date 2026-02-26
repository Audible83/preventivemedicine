import { IntegrationAdapter, IntegrationConnection, ParsedObservation } from './adapter.js';

/**
 * Garmin Connect Integration
 * Supports OAuth1 (Garmin uses OAuth 1.0a) and file export parsing.
 * For initial implementation, focus on file-based import from Garmin export.
 */

interface GarminActivity {
  activityName?: string;
  startTimeLocal?: string;
  duration?: number; // seconds
  distance?: number; // meters
  calories?: number;
  averageHR?: number;
  maxHR?: number;
  steps?: number;
  elevationGain?: number;
}

interface GarminSleep {
  calendarDate?: string;
  sleepTimeSeconds?: number;
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  remSleepSeconds?: number;
  awakeSleepSeconds?: number;
  averageSpO2?: number;
  restingHeartRate?: number;
}

interface GarminDailySummary {
  calendarDate?: string;
  totalSteps?: number;
  totalDistanceMeters?: number;
  activeKilocalories?: number;
  highlyActiveSeconds?: number;
  activeSeconds?: number;
  restingHeartRate?: number;
  maxHeartRate?: number;
  averageStressLevel?: number;
  bodyBatteryChargedValue?: number;
  bodyBatteryDrainedValue?: number;
}

function parseGarminExport(content: string): ParsedObservation[] {
  const observations: ParsedObservation[] = [];

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return observations;
  }

  // Handle array of activities
  if (Array.isArray(data)) {
    for (const item of data as Record<string, unknown>[]) {
      // Detect type from fields present
      if ('totalSteps' in item) {
        parseDailySummary(item as unknown as GarminDailySummary, observations);
      } else if ('sleepTimeSeconds' in item) {
        parseSleepEntry(item as unknown as GarminSleep, observations);
      } else if ('activityName' in item) {
        parseActivityEntry(item as unknown as GarminActivity, observations);
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    // Single summary object
    const obj = data as Record<string, unknown>;
    if ('totalSteps' in obj) {
      parseDailySummary(obj as unknown as GarminDailySummary, observations);
    }
  }

  return observations;
}

function parseDailySummary(summary: GarminDailySummary, observations: ParsedObservation[]): void {
  const timestamp = summary.calendarDate ? new Date(summary.calendarDate) : new Date();

  if (summary.totalSteps && summary.totalSteps > 0) {
    observations.push({
      category: 'activity', code: 'steps', displayName: 'Steps',
      value: summary.totalSteps, unit: 'count', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (summary.totalDistanceMeters && summary.totalDistanceMeters > 0) {
    observations.push({
      category: 'activity', code: 'distance_walking', displayName: 'Distance',
      value: summary.totalDistanceMeters / 1000, unit: 'km', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (summary.activeKilocalories && summary.activeKilocalories > 0) {
    observations.push({
      category: 'activity', code: 'active_energy', displayName: 'Active Calories',
      value: summary.activeKilocalories, unit: 'kcal', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (summary.restingHeartRate && summary.restingHeartRate > 0) {
    observations.push({
      category: 'vital', code: 'heart_rate', displayName: 'Resting Heart Rate',
      value: summary.restingHeartRate, unit: 'bpm', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  const activeMinutes = ((summary.highlyActiveSeconds || 0) + (summary.activeSeconds || 0)) / 60;
  if (activeMinutes > 0) {
    observations.push({
      category: 'activity', code: 'exercise_minutes', displayName: 'Active Minutes',
      value: Math.round(activeMinutes), unit: 'min', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }
}

function parseSleepEntry(sleep: GarminSleep, observations: ParsedObservation[]): void {
  const timestamp = sleep.calendarDate ? new Date(sleep.calendarDate) : new Date();

  if (sleep.sleepTimeSeconds && sleep.sleepTimeSeconds > 0) {
    observations.push({
      category: 'sleep', code: 'sleep_duration', displayName: 'Sleep Duration',
      value: sleep.sleepTimeSeconds / 3600, unit: 'hours', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (sleep.averageSpO2 && sleep.averageSpO2 > 0) {
    observations.push({
      category: 'vital', code: 'spo2', displayName: 'Sleep SpO2',
      value: sleep.averageSpO2, unit: '%', timestamp,
      source: 'sensor:garmin', confidence: 0.9,
    });
  }

  if (sleep.restingHeartRate && sleep.restingHeartRate > 0) {
    observations.push({
      category: 'vital', code: 'heart_rate', displayName: 'Resting Heart Rate (Sleep)',
      value: sleep.restingHeartRate, unit: 'bpm', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }
}

function parseActivityEntry(activity: GarminActivity, observations: ParsedObservation[]): void {
  const timestamp = activity.startTimeLocal ? new Date(activity.startTimeLocal) : new Date();

  if (activity.steps && activity.steps > 0) {
    observations.push({
      category: 'activity', code: 'steps', displayName: `Steps (${activity.activityName || 'Activity'})`,
      value: activity.steps, unit: 'count', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (activity.calories && activity.calories > 0) {
    observations.push({
      category: 'activity', code: 'active_energy', displayName: `Calories (${activity.activityName || 'Activity'})`,
      value: activity.calories, unit: 'kcal', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }

  if (activity.averageHR && activity.averageHR > 0) {
    observations.push({
      category: 'vital', code: 'heart_rate', displayName: `Avg HR (${activity.activityName || 'Activity'})`,
      value: activity.averageHR, unit: 'bpm', timestamp,
      source: 'sensor:garmin', confidence: 0.9,
    });
  }

  if (activity.duration && activity.duration > 0) {
    observations.push({
      category: 'activity', code: 'exercise_minutes', displayName: `Duration (${activity.activityName || 'Activity'})`,
      value: Math.round(activity.duration / 60), unit: 'min', timestamp,
      source: 'sensor:garmin', confidence: 0.95,
    });
  }
}

export const garminAdapter: IntegrationAdapter = {
  config: {
    id: 'garmin',
    name: 'Garmin Connect',
    description: 'Import data from Garmin Connect export (JSON). Export your data from connect.garmin.com/modern/settings.',
    type: 'file_import',
    supportedCategories: ['activity', 'vital', 'sleep'],
  },

  async parseExport(buffer: Buffer): Promise<ParsedObservation[]> {
    const content = buffer.toString('utf-8');
    return parseGarminExport(content);
  },
};
