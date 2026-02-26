import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserById, updateUser, exportAllUserData, deleteAllUserData } from '../db/queries.js';

export const usersRouter = Router();
usersRouter.use(authenticateToken);

usersRouter.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

usersRouter.patch('/profile', async (req: Request, res: Response) => {
  try {
    const { displayName, dateOfBirth, sex, ethnicity, heightCm, weightKg, consentDataProcessing, consentNotifications, settings } = req.body;
    const user = await updateUser(req.user!.userId, {
      displayName, dateOfBirth, sex, ethnicity, heightCm, weightKg,
      consentDataProcessing, consentNotifications, settings,
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

usersRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const data = await exportAllUserData(req.user!.userId);
    res.json(data);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

usersRouter.delete('/data', async (req: Request, res: Response) => {
  try {
    await deleteAllUserData(req.user!.userId);
    res.json({ message: 'All data deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});
