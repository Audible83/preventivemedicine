import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const secret = JWT_SECRET || 'dev-only-secret-do-not-use-in-production';

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Refresh Token Store ──
// In-memory store for now; swap to Redis or DB for production scale.
// Maps refreshToken -> { userId, email, expiresAt }
interface RefreshTokenEntry {
  userId: string;
  email: string;
  expiresAt: Date;
}

const refreshTokenStore = new Map<string, RefreshTokenEntry>();

const REFRESH_TOKEN_TTL_DAYS = 30;

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(payload: AuthPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Generate a cryptographically random refresh token and store it.
 * Returns the opaque token string. Valid for 30 days.
 */
export function generateRefreshToken(payload: AuthPayload): string {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  refreshTokenStore.set(token, {
    userId: payload.userId,
    email: payload.email,
    expiresAt,
  });
  return token;
}

/**
 * Validate and consume a refresh token (rotation).
 * Returns the associated payload if valid, or null if invalid/expired.
 * The old token is always removed (one-time use).
 */
export function rotateRefreshToken(oldToken: string): { accessToken: string; refreshToken: string } | null {
  const entry = refreshTokenStore.get(oldToken);

  // Always remove the old token to prevent reuse
  refreshTokenStore.delete(oldToken);

  if (!entry) {
    return null;
  }

  // Check expiration
  if (entry.expiresAt < new Date()) {
    return null;
  }

  const payload: AuthPayload = { userId: entry.userId, email: entry.email };
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { accessToken, refreshToken };
}

/**
 * Invalidate a refresh token (logout).
 */
export function invalidateRefreshToken(token: string): boolean {
  return refreshTokenStore.delete(token);
}

/**
 * Invalidate all refresh tokens for a given user.
 */
export function invalidateAllUserRefreshTokens(userId: string): void {
  for (const [token, entry] of refreshTokenStore.entries()) {
    if (entry.userId === userId) {
      refreshTokenStore.delete(token);
    }
  }
}
