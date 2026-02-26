import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { completeReminder } from '../db/queries.js';
import { checkAndCreateReminders, getRemindersForUser } from '../nudge/scheduler.js';
import { DISCLAIMER } from '@pm-valet/shared';

export const remindersRouter = Router();
remindersRouter.use(authenticateToken);

// GET /api/reminders - get pending reminders for authenticated user
remindersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const reminders = await getRemindersForUser(req.user!.userId);
    res.json({ reminders, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error('Get reminders error:', err);
    res.status(500).json({ error: 'Failed to get reminders' });
  }
});

// POST /api/reminders/check - trigger checkAndCreateReminders for user
remindersRouter.post('/check', async (req: Request, res: Response) => {
  try {
    const result = await checkAndCreateReminders(req.user!.userId);
    res.json({
      reminders: result.reminders,
      followUpQuestions: result.followUpQuestions,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('Check reminders error:', err);
    res.status(500).json({ error: 'Failed to check reminders' });
  }
});

// PATCH /api/reminders/:id/complete - mark reminder as completed
remindersRouter.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const reminder = await completeReminder(req.params.id as string, req.user!.userId);
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(reminder);
  } catch (err) {
    console.error('Complete reminder error:', err);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});
