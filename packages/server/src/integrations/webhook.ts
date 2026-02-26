import { IntegrationAdapter, ParsedObservation } from './adapter.js';

/**
 * Generic Webhook Receiver
 * Accepts standardized JSON payloads from custom sensors or devices.
 *
 * Expected payload format:
 * {
 *   "apiKey": "user-provided-api-key",
 *   "deviceId": "sensor-123",
 *   "readings": [
 *     { "category": "vital", "code": "heart_rate", "value": 72, "unit": "bpm", "timestamp": "2026-01-01T00:00:00Z" }
 *   ]
 * }
 */

interface WebhookPayload {
  apiKey: string;
  deviceId?: string;
  readings: Array<{
    category: string;
    code: string;
    displayName?: string;
    value: number;
    unit: string;
    timestamp?: string;
  }>;
}

const VALID_CATEGORIES = ['lab', 'vital', 'activity', 'sleep', 'nutrition', 'survey'];

function validatePayload(payload: unknown): payload is WebhookPayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  if (typeof p.apiKey !== 'string' || !p.apiKey) return false;
  if (!Array.isArray(p.readings) || p.readings.length === 0) return false;
  return true;
}

export const webhookAdapter: IntegrationAdapter = {
  config: {
    id: 'generic_webhook',
    name: 'Custom Webhook',
    description: 'Receive data from custom sensors or devices via HTTP webhook. Configure your device to POST JSON data to the webhook endpoint.',
    type: 'webhook',
    supportedCategories: VALID_CATEGORIES,
  },

  async handleWebhook(
    payload: unknown,
    _headers: Record<string, string>
  ): Promise<{ userId: string; observations: ParsedObservation[] }> {
    if (!validatePayload(payload)) {
      throw new Error('Invalid webhook payload format');
    }

    const observations: ParsedObservation[] = [];

    for (const reading of payload.readings) {
      if (!reading.code || typeof reading.value !== 'number' || !reading.unit) continue;
      if (!VALID_CATEGORIES.includes(reading.category)) continue;

      observations.push({
        category: reading.category,
        code: reading.code,
        displayName: reading.displayName || reading.code,
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
        source: 'sensor:generic',
        confidence: 0.8,
        metadata: { deviceId: payload.deviceId },
      });
    }

    // The userId will be resolved from the apiKey by the route handler
    return { userId: '', observations };
  },
};
