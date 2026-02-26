import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getRecommendationsByUser, dismissRecommendation, getRiskSignalsByUser } from '../db/queries.js';
import { evaluateGuidelines } from '../guidelines/evaluator.js';
import { DISCLAIMER } from '@pm-valet/shared';

export const recommendationsRouter = Router();
recommendationsRouter.use(authenticateToken);

recommendationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const recs = await getRecommendationsByUser(req.user!.userId);
    const signals = await getRiskSignalsByUser(req.user!.userId);
    res.json({ recommendations: recs, riskSignals: signals, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error('Get recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

recommendationsRouter.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const result = await evaluateGuidelines(req.user!.userId);
    res.json({ ...result, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error('Evaluate error:', err);
    res.status(500).json({ error: 'Failed to evaluate guidelines' });
  }
});

recommendationsRouter.patch('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const rec = await dismissRecommendation(req.params.id as string);
    if (!rec) {
      res.status(404).json({ error: 'Recommendation not found' });
      return;
    }
    res.json(rec);
  } catch (err) {
    console.error('Dismiss error:', err);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});
