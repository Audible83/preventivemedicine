import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { observationsRouter } from './routes/observations.js';
import { timelineRouter } from './routes/timeline.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { uploadRouter } from './routes/upload.js';
import { guidelinesRouter } from './routes/guidelines.js';
import { remindersRouter } from './routes/reminders.js';
import { notificationsRouter } from './routes/notifications.js';
import { integrationsRouter } from './routes/integrations.js';
import { auditMiddleware } from './middleware/audit.js';
import { sanitizeMiddleware } from './middleware/sanitize.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Input sanitization (strip HTML, validate content-type)
app.use(sanitizeMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', auditMiddleware('access', 'users'), usersRouter);
app.use('/api/observations', auditMiddleware('access', 'observations'), observationsRouter);
app.use('/api/timeline', auditMiddleware('access', 'timeline'), timelineRouter);
app.use('/api/recommendations', auditMiddleware('access', 'recommendations'), recommendationsRouter);
app.use('/api/upload', auditMiddleware('upload', 'upload'), uploadRouter);
app.use('/api/guidelines', guidelinesRouter);
app.use('/api/reminders', auditMiddleware('access', 'reminders'), remindersRouter);
app.use('/api/notifications', auditMiddleware('access', 'notifications'), notificationsRouter);
app.use('/api/integrations', auditMiddleware('access', 'integrations'), integrationsRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`PM Valet API running on http://localhost:${PORT}`);
});

export { app };
