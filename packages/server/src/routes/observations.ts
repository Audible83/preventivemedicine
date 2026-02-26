import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createObservation, getObservationsByUser, countObservationsByUser } from '../db/queries.js';
import { CreateObservationSchema } from '@pm-valet/shared';

export const observationsRouter = Router();
observationsRouter.use(authenticateToken);

observationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { category, from, to, limit, offset } = req.query;
    const obs = await getObservationsByUser(req.user!.userId, {
      category: category as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    const total = await countObservationsByUser(req.user!.userId);
    res.json({ data: obs, total });
  } catch (err) {
    console.error('Get observations error:', err);
    res.status(500).json({ error: 'Failed to get observations' });
  }
});

observationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, userId: req.user!.userId };
    const parsed = CreateObservationSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid observation data', details: parsed.error.flatten() });
      return;
    }
    const obs = await createObservation({
      ...parsed.data,
      timestamp: new Date(parsed.data.timestamp),
    });
    res.status(201).json(obs);
  } catch (err) {
    console.error('Create observation error:', err);
    res.status(500).json({ error: 'Failed to create observation' });
  }
});
