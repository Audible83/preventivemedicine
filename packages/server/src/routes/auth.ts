import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { createUser, getUserByEmail } from '../db/queries.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();
authRouter.use(authLimiter);

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are required' });
      return;
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, passwordHash, displayName });

    const token = generateToken({ userId: user.id, email: user.email! });
    res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email! });
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await getUserByEmail(req.user!.email);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});
