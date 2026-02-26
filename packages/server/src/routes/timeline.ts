import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getObservationsByUser, countObservationsByUser } from '../db/queries.js';
import { DISCLAIMER } from '@pm-valet/shared';

export const timelineRouter = Router();
timelineRouter.use(authenticateToken);

timelineRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, categories, limit, offset } = req.query;
    const userId = req.user!.userId;

    const categoryList = categories ? (categories as string).split(',') : undefined;

    // Fetch observations (if categories specified, fetch per category)
    let allObs: any[] = [];
    if (categoryList) {
      for (const cat of categoryList) {
        const obs = await getObservationsByUser(userId, {
          category: cat,
          from: from ? new Date(from as string) : undefined,
          to: to ? new Date(to as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
        });
        allObs.push(...obs);
      }
      allObs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      allObs = await getObservationsByUser(userId, {
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
    }

    const total = await countObservationsByUser(userId);

    res.json({
      userId,
      entries: allObs.map((obs) => ({
        observation: obs,
        trend: undefined, // computed by trend service
        anomaly: false,
      })),
      totalCount: total,
      from: from as string,
      to: to as string,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});
