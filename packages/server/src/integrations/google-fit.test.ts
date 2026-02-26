import { describe, it, expect } from 'vitest';
import { googleFitAdapter } from './google-fit';

// Google Takeout daily aggregation format (array)
const TAKEOUT_DAILY_JSON = JSON.stringify([
  {
    date: '2026-01-15',
    steps: 8500,
    calories: 2100,
    distance: 6500, // meters
    heart_rate: 72,
  },
  {
    date: '2026-01-16',
    steps: 10200,
    calories: 2400,
    distance: 8200,
    heart_rate: 68,
  },
]);

// Raw Google Fit API export format
const API_EXPORT_JSON = JSON.stringify({
  Data: [
    {
      dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms',
      point: [
        {
          startTimeNanos: '1737014400000000000', // 2025-01-16T12:00:00Z in nanos
          endTimeNanos: '1737100800000000000',
          value: [{ intVal: 9500 }],
        },
      ],
    },
    {
      dataSourceId: 'derived:com.google.heart_rate.bpm:com.google.android.gms',
      point: [
        {
          startTimeNanos: '1737014400000000000',
          endTimeNanos: '1737018000000000000',
          value: [{ fpVal: 75.5 }],
        },
      ],
    },
  ],
});

const EMPTY_ARRAY_JSON = JSON.stringify([]);
const EMPTY_OBJECT_JSON = JSON.stringify({});
const INVALID_JSON = 'not json at all {{{';

describe('googleFitAdapter config', () => {
  it('has correct adapter ID', () => {
    expect(googleFitAdapter.config.id).toBe('google_fit');
  });

  it('is a file_import type', () => {
    expect(googleFitAdapter.config.type).toBe('file_import');
  });

  it('supports expected categories', () => {
    expect(googleFitAdapter.config.supportedCategories).toContain('vital');
    expect(googleFitAdapter.config.supportedCategories).toContain('activity');
    expect(googleFitAdapter.config.supportedCategories).toContain('sleep');
  });
});

describe('googleFitAdapter.parseExport — Takeout daily format', () => {
  it('parses daily aggregation entries', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    // 2 days x 4 fields (steps, calories, distance, heart_rate) = 8 observations
    expect(results).toHaveLength(8);
  });

  it('extracts steps correctly', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const steps = results.filter((r) => r.code === 'steps');
    expect(steps).toHaveLength(2);
    expect(steps[0].value).toBe(8500);
    expect(steps[0].category).toBe('activity');
    expect(steps[0].unit).toBe('count');
    expect(steps[0].source).toBe('sensor:google_fit');
  });

  it('converts distance from meters to km', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const distances = results.filter((r) => r.code === 'distance_walking');
    expect(distances).toHaveLength(2);
    expect(distances[0].value).toBeCloseTo(6.5); // 6500m -> 6.5km
    expect(distances[0].unit).toBe('km');
  });

  it('extracts heart rate correctly', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const hrs = results.filter((r) => r.code === 'heart_rate');
    expect(hrs).toHaveLength(2);
    expect(hrs[0].value).toBe(72);
    expect(hrs[0].unit).toBe('bpm');
    expect(hrs[0].category).toBe('vital');
  });

  it('extracts calories correctly', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const cals = results.filter((r) => r.code === 'active_energy');
    expect(cals).toHaveLength(2);
    expect(cals[0].value).toBe(2100);
    expect(cals[0].unit).toBe('kcal');
  });

  it('parses timestamps from date field', async () => {
    const buffer = Buffer.from(TAKEOUT_DAILY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    for (const r of results) {
      expect(r.timestamp).toBeInstanceOf(Date);
    }
  });

  it('skips entries with zero values', async () => {
    const json = JSON.stringify([
      { date: '2026-01-15', steps: 0, calories: 0, distance: 0, heart_rate: 0 },
    ]);
    const buffer = Buffer.from(json);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('skips entries without a date field', async () => {
    const json = JSON.stringify([{ steps: 5000 }]);
    const buffer = Buffer.from(json);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });
});

describe('googleFitAdapter.parseExport — API export format', () => {
  it('parses raw API export data points', async () => {
    const buffer = Buffer.from(API_EXPORT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    expect(results).toHaveLength(2);
  });

  it('extracts steps from API format', async () => {
    const buffer = Buffer.from(API_EXPORT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const steps = results.find((r) => r.code === 'steps');
    expect(steps).toBeDefined();
    expect(steps!.value).toBe(9500);
    expect(steps!.category).toBe('activity');
  });

  it('extracts heart rate with fpVal from API format', async () => {
    const buffer = Buffer.from(API_EXPORT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const hr = results.find((r) => r.code === 'heart_rate');
    expect(hr).toBeDefined();
    expect(hr!.value).toBeCloseTo(75.5);
    expect(hr!.category).toBe('vital');
  });

  it('includes Google Fit source in metadata', async () => {
    const buffer = Buffer.from(API_EXPORT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    const steps = results.find((r) => r.code === 'steps');
    expect(steps!.metadata).toEqual({ googleFitSource: 'com.google.step_count' });
  });

  it('converts nanoseconds to Date timestamps', async () => {
    const buffer = Buffer.from(API_EXPORT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');

    for (const r of results) {
      expect(r.timestamp).toBeInstanceOf(Date);
      expect(r.timestamp.getTime()).not.toBeNaN();
    }
  });
});

describe('googleFitAdapter.parseExport — edge cases', () => {
  it('returns empty array for empty JSON array', async () => {
    const buffer = Buffer.from(EMPTY_ARRAY_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('returns empty array for empty JSON object', async () => {
    const buffer = Buffer.from(EMPTY_OBJECT_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('returns empty array for invalid JSON', async () => {
    const buffer = Buffer.from(INVALID_JSON);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });

  it('skips data sources that are not in SOURCE_MAP', async () => {
    const json = JSON.stringify({
      Data: [
        {
          dataSourceId: 'derived:com.google.unknown_metric',
          point: [
            {
              startTimeNanos: '1737014400000000000',
              value: [{ fpVal: 42 }],
            },
          ],
        },
      ],
    });
    const buffer = Buffer.from(json);
    const results = await googleFitAdapter.parseExport!(buffer, 'test-user');
    expect(results).toHaveLength(0);
  });
});
