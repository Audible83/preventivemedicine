/**
 * Integration Adapter Interface
 * Every wearable/sensor integration implements this interface.
 */

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  type: 'file_import' | 'oauth2' | 'webhook';
  supportedCategories: string[];
  logoUrl?: string;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  integrationId: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  lastSyncAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ParsedObservation {
  category: string;
  code: string;
  displayName: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  confidence: number;
  rawReference?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationAdapter {
  /** Adapter configuration */
  config: IntegrationConfig;

  /** Parse an exported file (Apple Health XML, Google Fit JSON, etc.) */
  parseExport?(buffer: Buffer, userId: string): Promise<ParsedObservation[]>;

  /** Build OAuth2 authorization URL */
  getAuthUrl?(userId: string, redirectUri: string): string;

  /** Exchange authorization code for tokens */
  handleCallback?(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;

  /** Fetch data from the external API using stored tokens */
  fetchData?(connection: IntegrationConnection): Promise<ParsedObservation[]>;

  /** Process an incoming webhook payload */
  handleWebhook?(payload: unknown, headers: Record<string, string>): Promise<{ userId: string; observations: ParsedObservation[] }>;

  /** Revoke access (disconnect) */
  disconnect?(connection: IntegrationConnection): Promise<void>;
}

/** Registry of all available integrations */
const registry = new Map<string, IntegrationAdapter>();

export function registerAdapter(adapter: IntegrationAdapter): void {
  registry.set(adapter.config.id, adapter);
}

export function getAdapter(id: string): IntegrationAdapter | undefined {
  return registry.get(id);
}

export function listAdapters(): IntegrationConfig[] {
  return Array.from(registry.values()).map((a) => a.config);
}
