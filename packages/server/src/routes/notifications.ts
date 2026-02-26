import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUnreadNotifications, markNotificationRead, getUserById, updateUser } from '../db/queries.js';

/** Default notification preferences stored in users.settings.notificationPreferences */
interface NotificationPreferences {
  frequency: 'daily' | 'weekly' | 'realtime';
  quietHoursStart: string | null; // HH:mm format, e.g. "22:00"
  quietHoursEnd: string | null;   // HH:mm format, e.g. "07:00"
  categories: {
    data_entry: boolean;
    screening: boolean;
    lifestyle: boolean;
    follow_up: boolean;
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  frequency: 'daily',
  quietHoursStart: null,
  quietHoursEnd: null,
  categories: {
    data_entry: true,
    screening: true,
    lifestyle: true,
    follow_up: true,
  },
};

export const notificationsRouter = Router();
notificationsRouter.use(authenticateToken);

// GET /api/notifications - get user's unread notifications
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await getUnreadNotifications(req.user!.userId);
    res.json({ notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// PATCH /api/notifications/:id/read - mark notification as read
notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await markNotificationRead(req.params.id as string, req.user!.userId);
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(notification);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// GET /api/notifications/preferences - get notification preferences
notificationsRouter.get('/preferences', async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const settings = (user.settings || {}) as Record<string, unknown>;
    const preferences = (settings.notificationPreferences || DEFAULT_PREFERENCES) as NotificationPreferences;
    res.json({ preferences });
  } catch (err) {
    console.error('Get notification preferences error:', err);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// PUT /api/notifications/preferences - update notification preferences
notificationsRouter.put('/preferences', async (req: Request, res: Response) => {
  try {
    const { frequency, quietHoursStart, quietHoursEnd, categories } = req.body;

    // Validate frequency if provided
    if (frequency && !['daily', 'weekly', 'realtime'].includes(frequency)) {
      res.status(400).json({ error: 'frequency must be one of: daily, weekly, realtime' });
      return;
    }

    // Validate quiet hours format if provided
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
      res.status(400).json({ error: 'quietHoursStart must be in HH:mm format' });
      return;
    }
    if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
      res.status(400).json({ error: 'quietHoursEnd must be in HH:mm format' });
      return;
    }

    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentSettings = (user.settings || {}) as Record<string, unknown>;
    const currentPrefs = (currentSettings.notificationPreferences || DEFAULT_PREFERENCES) as NotificationPreferences;

    const updatedPreferences: NotificationPreferences = {
      frequency: frequency ?? currentPrefs.frequency,
      quietHoursStart: quietHoursStart !== undefined ? quietHoursStart : currentPrefs.quietHoursStart,
      quietHoursEnd: quietHoursEnd !== undefined ? quietHoursEnd : currentPrefs.quietHoursEnd,
      categories: categories
        ? { ...currentPrefs.categories, ...categories }
        : currentPrefs.categories,
    };

    const updatedSettings = {
      ...currentSettings,
      notificationPreferences: updatedPreferences,
    };

    const updatedUser = await updateUser(req.user!.userId, { settings: updatedSettings });
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ preferences: updatedPreferences });
  } catch (err) {
    console.error('Update notification preferences error:', err);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});
