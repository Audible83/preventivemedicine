import { registerAdapter, listAdapters, getAdapter } from './adapter.js';
import { appleHealthAdapter } from './apple-health.js';
import { googleFitAdapter } from './google-fit.js';
import { fitbitAdapter } from './fitbit.js';
import { garminAdapter } from './garmin.js';
import { withingsAdapter } from './withings.js';
import { webhookAdapter } from './webhook.js';

// Register all adapters
registerAdapter(appleHealthAdapter);
registerAdapter(googleFitAdapter);
registerAdapter(fitbitAdapter);
registerAdapter(garminAdapter);
registerAdapter(withingsAdapter);
registerAdapter(webhookAdapter);

export { listAdapters, getAdapter };
export type { IntegrationAdapter, IntegrationConfig, IntegrationConnection, ParsedObservation } from './adapter.js';
