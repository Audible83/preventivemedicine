import { IntegrationAdapter, IntegrationConnection, ParsedObservation } from './adapter.js';

/**
 * Withings OAuth2 Integration
 * Supports smart scales, blood pressure monitors, sleep trackers.
 */

const WITHINGS_AUTH_URL = 'https://account.withings.com/oauth2_user/authorize2';
const WITHINGS_TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const WITHINGS_MEASURE_URL = 'https://wbsapi.withings.net/measure';

const CLIENT_ID = process.env.WITHINGS_CLIENT_ID || '';
const CLIENT_SECRET = process.env.WITHINGS_CLIENT_SECRET || '';

// Withings measure types
const MEASURE_TYPES: Record<number, { category: string; code: string; displayName: string; unit: string; divisor?: number }> = {
  1: { category: 'vital', code: 'weight', displayName: 'Body Weight', unit: 'kg', divisor: 1000 },
  4: { category: 'vital', code: 'height', displayName: 'Height', unit: 'cm', divisor: 100 },
  5: { category: 'vital', code: 'body_fat', displayName: 'Body Fat', unit: '%', divisor: 1000 },
  6: { category: 'vital', code: 'body_fat_free_mass', displayName: 'Fat Free Mass', unit: 'kg', divisor: 1000 },
  9: { category: 'vital', code: 'bp_diastolic', displayName: 'Diastolic BP', unit: 'mmHg' },
  10: { category: 'vital', code: 'bp_systolic', displayName: 'Systolic BP', unit: 'mmHg' },
  11: { category: 'vital', code: 'heart_rate', displayName: 'Heart Rate', unit: 'bpm' },
  54: { category: 'vital', code: 'spo2', displayName: 'Blood Oxygen', unit: '%' },
  71: { category: 'vital', code: 'temperature', displayName: 'Body Temperature', unit: '°C', divisor: 1000 },
  76: { category: 'vital', code: 'muscle_mass', displayName: 'Muscle Mass', unit: 'kg', divisor: 1000 },
  77: { category: 'vital', code: 'hydration', displayName: 'Hydration', unit: 'kg', divisor: 1000 },
  88: { category: 'vital', code: 'bone_mass', displayName: 'Bone Mass', unit: 'kg', divisor: 1000 },
  91: { category: 'vital', code: 'pulse_wave_velocity', displayName: 'Pulse Wave Velocity', unit: 'm/s', divisor: 1000 },
};

export const withingsAdapter: IntegrationAdapter = {
  config: {
    id: 'withings',
    name: 'Withings',
    description: 'Connect your Withings devices (smart scale, blood pressure monitor, sleep tracker) to sync data automatically.',
    type: 'oauth2',
    supportedCategories: ['vital', 'sleep'],
  },

  getAuthUrl(userId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'user.metrics,user.activity',
      state: userId,
    });
    return `${WITHINGS_AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, redirectUri: string) {
    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json() as { body: { access_token: string; refresh_token: string; expires_in: number } };
    return {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
    };
  },

  async fetchData(connection: IntegrationConnection): Promise<ParsedObservation[]> {
    if (!connection.accessToken) throw new Error('No access token');

    const observations: ParsedObservation[] = [];

    // Fetch last 30 days of measurements
    const startDate = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const endDate = Math.floor(Date.now() / 1000);

    try {
      const response = await fetch(WITHINGS_MEASURE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: new URLSearchParams({
          action: 'getmeas',
          startdate: startDate.toString(),
          enddate: endDate.toString(),
        }),
      });

      const data = await response.json() as {
        body: {
          measuregrps: Array<{
            date: number;
            measures: Array<{ type: number; value: number; unit: number }>;
          }>;
        };
      };

      for (const group of data.body.measuregrps || []) {
        const timestamp = new Date(group.date * 1000);

        for (const measure of group.measures) {
          const mapping = MEASURE_TYPES[measure.type];
          if (!mapping) continue;

          // Withings uses value * 10^unit format
          let value = measure.value * Math.pow(10, measure.unit);
          if (mapping.divisor) {
            value /= mapping.divisor;
          }

          observations.push({
            category: mapping.category,
            code: mapping.code,
            displayName: mapping.displayName,
            value,
            unit: mapping.unit,
            timestamp,
            source: 'sensor:withings',
            confidence: 0.95,
            metadata: { withingsMeasureType: measure.type },
          });
        }
      }
    } catch (err) {
      console.error('Withings fetch error:', err);
    }

    return observations;
  },

  async disconnect(connection: IntegrationConnection): Promise<void> {
    if (!connection.accessToken) return;
    try {
      await fetch('https://account.withings.com/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          token: connection.accessToken,
        }),
      });
    } catch (err) {
      console.error('Withings disconnect error:', err);
    }
  },
};
