import { Router, Request, Response } from 'express';
import { loadGuidelines } from '../guidelines/loader.js';

export const guidelinesRouter = Router();

guidelinesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const guidelines = await loadGuidelines();
    res.json(guidelines);
  } catch (err) {
    console.error('Guidelines error:', err);
    res.status(500).json({ error: 'Failed to load guidelines' });
  }
});
