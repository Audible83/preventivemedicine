import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { listAdapters, getAdapter } from '../integrations/index.js';
import { normalizeObservations } from '../ingestion/normalizer.js';
import { createObservations } from '../db/queries.js';

export const integrationsRouter = Router();
integrationsRouter.use(authenticateToken);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (health exports can be large)
});

// List available integrations
integrationsRouter.get('/', (_req: Request, res: Response) => {
  res.json({ integrations: listAdapters() });
});

// Get details for a specific integration
integrationsRouter.get('/:id', (req: Request, res: Response) => {
  const adapter = getAdapter(req.params.id as string);
  if (!adapter) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }
  res.json(adapter.config);
});

// Import file from a wearable/sensor export
integrationsRouter.post('/:id/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const adapter = getAdapter(req.params.id as string);
    if (!adapter) {
      res.status(404).json({ error: 'Integration not found' });
      return;
    }

    if (!adapter.parseExport) {
      res.status(400).json({ error: 'This integration does not support file imports' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Require explicit consent
    if (req.body.consent !== 'true') {
      res.status(400).json({
        error: 'Consent required',
        message: 'You must provide consent=true to import health data from this source. This data will be stored and used for preventive recommendations.',
      });
      return;
    }

    const userId = req.user!.userId;
    const rawObservations = await adapter.parseExport(req.file.buffer, userId);

    // Add userId to each observation
    const withUser = rawObservations.map((obs) => ({ ...obs, userId }));
    const normalized = normalizeObservations(withUser);
    const saved = await createObservations(normalized);

    res.status(201).json({
      message: `Imported ${saved.length} observations from ${adapter.config.name}`,
      integration: adapter.config.id,
      count: saved.length,
      categories: [...new Set(saved.map((o: { category: string }) => o.category))],
    });
  } catch (err) {
    console.error('Integration import error:', err);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// OAuth2: Get authorization URL
integrationsRouter.post('/:id/connect', (req: Request, res: Response) => {
  const adapter = getAdapter(req.params.id as string);
  if (!adapter) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  if (!adapter.getAuthUrl) {
    res.status(400).json({ error: 'This integration does not support OAuth connection' });
    return;
  }

  // Require explicit consent
  if (req.body.consent !== true) {
    res.status(400).json({
      error: 'Consent required',
      message: 'You must provide consent: true to connect this data source. Your data will be synced and used for preventive recommendations.',
    });
    return;
  }

  const userId = req.user!.userId;
  const redirectUri = req.body.redirectUri || `${req.protocol}://${req.get('host')}/api/integrations/${adapter.config.id}/callback`;

  const authUrl = adapter.getAuthUrl(userId, redirectUri);
  res.json({ authUrl, message: 'Redirect the user to this URL to authorize the connection.' });
});

// OAuth2: Handle callback
integrationsRouter.get('/:id/callback', async (req: Request, res: Response) => {
  try {
    const adapter = getAdapter(req.params.id as string);
    if (!adapter || !adapter.handleCallback) {
      res.status(400).json({ error: 'Invalid callback' });
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ error: 'Authorization code missing' });
      return;
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/${adapter.config.id}/callback`;
    const tokens = await adapter.handleCallback(code, redirectUri);

    // In production, store tokens securely in the database
    // For now, return success
    res.json({
      message: `Successfully connected to ${adapter.config.name}`,
      integration: adapter.config.id,
      expiresIn: tokens.expiresIn,
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Failed to complete connection' });
  }
});

// Generic webhook receiver (no auth required, uses apiKey in payload)
integrationsRouter.post('/webhook/receive', async (req: Request, res: Response) => {
  try {
    const adapter = getAdapter('generic_webhook');
    if (!adapter || !adapter.handleWebhook) {
      res.status(500).json({ error: 'Webhook adapter not available' });
      return;
    }

    const result = await adapter.handleWebhook(req.body, req.headers as Record<string, string>);

    // Resolve userId from apiKey (in production, look up apiKey → userId mapping)
    // For now, apiKey must be the userId
    const userId = req.body.apiKey;
    if (!userId) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const withUser = result.observations.map((obs) => ({ ...obs, userId }));
    const normalized = normalizeObservations(withUser);
    const saved = await createObservations(normalized);

    res.status(201).json({
      message: `Received ${saved.length} observations`,
      count: saved.length,
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});
