import { IntegrationAdapter, IntegrationConnection, ParsedObservation } from './adapter.js';

/**
 * Fitbit OAuth2 Integration
 * Supports both file export parsing and live API sync.
 */

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';

const CLIENT_ID = process.env.FITBIT_CLIENT_ID || '';
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET || '';

interface FitbitDailyActivity {
  activities: Array<{ name: string; calories: number; duration: number; startDate: string }>;
  summary: {
    steps: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    activeMinutes: number;
    fairlyActiveMinutes: number;
    veryActiveMinutes: number;
  };
}

interface FitbitHeartRate {
  'activities-heart': Array<{
    dateTime: string;
    value: { restingHeartRate?: number };
  }>;
}

interface FitbitSleep {
  sleep: Array<{
    dateOfSleep: string;
    duration: number; // milliseconds
    efficiency: number;
    minutesAsleep: number;
  }>;
}

async function fetchFitbitApi(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`${FITBIT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const fitbitAdapter: IntegrationAdapter = {
  config: {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Connect your Fitbit account to sync activity, heart rate, and sleep data automatically.',
    type: 'oauth2',
    supportedCategories: ['activity', 'vital', 'sleep'],
  },

  getAuthUrl(userId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'activity heartrate sleep weight profile',
      state: userId,
    });
    return `${FITBIT_AUTH_URL}?${params}`;
  },

  async handleCallback(code: string, redirectUri: string) {
    const response = await fetch(FITBIT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Fitbit token exchange failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },

  async fetchData(connection: IntegrationConnection): Promise<ParsedObservation[]> {
    if (!connection.accessToken) throw new Error('No access token');

    const observations: ParsedObservation[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Fetch activity summary
    try {
      const activity = (await fetchFitbitApi(`/activities/date/${today}.json`, connection.accessToken)) as FitbitDailyActivity;
      if (activity.summary) {
        const timestamp = new Date(today);
        if (activity.summary.steps > 0) {
          observations.push({
            category: 'activity', code: 'steps', displayName: 'Steps',
            value: activity.summary.steps, unit: 'count', timestamp,
            source: 'sensor:fitbit', confidence: 0.95,
          });
        }
        if (activity.summary.caloriesOut > 0) {
          observations.push({
            category: 'activity', code: 'active_energy', displayName: 'Calories Burned',
            value: activity.summary.caloriesOut, unit: 'kcal', timestamp,
            source: 'sensor:fitbit', confidence: 0.95,
          });
        }
        const activeMin = activity.summary.fairlyActiveMinutes + activity.summary.veryActiveMinutes;
        if (activeMin > 0) {
          observations.push({
            category: 'activity', code: 'exercise_minutes', displayName: 'Active Minutes',
            value: activeMin, unit: 'min', timestamp,
            source: 'sensor:fitbit', confidence: 0.95,
          });
        }
      }
    } catch (err) {
      console.error('Fitbit activity fetch error:', err);
    }

    // Fetch heart rate
    try {
      const hr = (await fetchFitbitApi(`/activities/heart/date/${today}/1d.json`, connection.accessToken)) as FitbitHeartRate;
      const latest = hr['activities-heart']?.[0];
      if (latest?.value?.restingHeartRate) {
        observations.push({
          category: 'vital', code: 'heart_rate', displayName: 'Resting Heart Rate',
          value: latest.value.restingHeartRate, unit: 'bpm',
          timestamp: new Date(latest.dateTime),
          source: 'sensor:fitbit', confidence: 0.95,
        });
      }
    } catch (err) {
      console.error('Fitbit heart rate fetch error:', err);
    }

    // Fetch sleep
    try {
      const sleep = (await fetchFitbitApi(`/sleep/date/${today}.json`, connection.accessToken)) as FitbitSleep;
      if (sleep.sleep?.length > 0) {
        const latest = sleep.sleep[0];
        observations.push({
          category: 'sleep', code: 'sleep_duration', displayName: 'Sleep Duration',
          value: latest.minutesAsleep / 60, unit: 'hours',
          timestamp: new Date(latest.dateOfSleep),
          source: 'sensor:fitbit', confidence: 0.95,
        });
      }
    } catch (err) {
      console.error('Fitbit sleep fetch error:', err);
    }

    return observations;
  },

  async disconnect(connection: IntegrationConnection): Promise<void> {
    if (!connection.accessToken) return;
    try {
      await fetch('https://api.fitbit.com/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({ token: connection.accessToken }),
      });
    } catch (err) {
      console.error('Fitbit disconnect error:', err);
    }
  },
};
