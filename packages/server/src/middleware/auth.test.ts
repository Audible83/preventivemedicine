import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateToken,
  authenticateToken,
  generateRefreshToken,
  rotateRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserRefreshTokens,
  type AuthPayload,
} from './auth';

const TEST_SECRET = 'dev-only-secret-do-not-use-in-production';

const TEST_PAYLOAD: AuthPayload = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
};

function mockRequest(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: undefined,
  } as any;
}

function mockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    res.body = data;
    return res;
  });
  return res;
}

describe('generateToken', () => {
  it('returns a valid JWT string', () => {
    const token = generateToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('encodes userId and email in the token', () => {
    const token = generateToken(TEST_PAYLOAD);
    const decoded = jwt.verify(token, TEST_SECRET) as AuthPayload & jwt.JwtPayload;

    expect(decoded.userId).toBe(TEST_PAYLOAD.userId);
    expect(decoded.email).toBe(TEST_PAYLOAD.email);
  });

  it('includes an expiration claim', () => {
    const token = generateToken(TEST_PAYLOAD);
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('authenticateToken', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it('returns 401 when no authorization header is present', () => {
    const req = mockRequest();
    const res = mockResponse();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header has no token', () => {
    const req = { headers: { authorization: 'Bearer ' }, user: undefined } as any;
    const res = mockResponse();

    authenticateToken(req, res, next);

    // 'Bearer '.split(' ')[1] is '', which is falsy
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user for a valid token', () => {
    const token = generateToken(TEST_PAYLOAD);
    const req = mockRequest(token);
    const res = mockResponse();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(TEST_PAYLOAD.userId);
    expect(req.user.email).toBe(TEST_PAYLOAD.email);
  });

  it('returns 403 for an invalid token', () => {
    const req = mockRequest('clearly-not-a-valid-jwt');
    const res = mockResponse();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for an expired token', () => {
    // Generate a token that expired 1 second ago
    const expired = jwt.sign(TEST_PAYLOAD, TEST_SECRET, { expiresIn: '-1s' });
    const req = mockRequest(expired);
    const res = mockResponse();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for a token signed with wrong secret', () => {
    const wrongSecret = jwt.sign(TEST_PAYLOAD, 'wrong-secret', { expiresIn: '7d' });
    const req = mockRequest(wrongSecret);
    const res = mockResponse();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('generateRefreshToken', () => {
  it('returns a hex string', () => {
    const token = generateRefreshToken(TEST_PAYLOAD);
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^[a-f0-9]+$/);
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it('returns unique tokens each time', () => {
    const t1 = generateRefreshToken(TEST_PAYLOAD);
    const t2 = generateRefreshToken(TEST_PAYLOAD);
    expect(t1).not.toBe(t2);
  });
});

describe('rotateRefreshToken', () => {
  it('returns new access and refresh tokens for a valid refresh token', () => {
    const refresh = generateRefreshToken(TEST_PAYLOAD);
    const result = rotateRefreshToken(refresh);

    expect(result).not.toBeNull();
    expect(result!.accessToken).toBeDefined();
    expect(result!.refreshToken).toBeDefined();
    expect(result!.accessToken.split('.')).toHaveLength(3); // valid JWT
  });

  it('invalidates the old refresh token after rotation (one-time use)', () => {
    const refresh = generateRefreshToken(TEST_PAYLOAD);

    // First use should succeed
    const result1 = rotateRefreshToken(refresh);
    expect(result1).not.toBeNull();

    // Second use should fail (token consumed)
    const result2 = rotateRefreshToken(refresh);
    expect(result2).toBeNull();
  });

  it('returns null for a nonexistent refresh token', () => {
    const result = rotateRefreshToken('nonexistent-token');
    expect(result).toBeNull();
  });
});

describe('invalidateRefreshToken', () => {
  it('returns true when a valid token is invalidated', () => {
    const refresh = generateRefreshToken(TEST_PAYLOAD);
    const result = invalidateRefreshToken(refresh);
    expect(result).toBe(true);
  });

  it('returns false for a nonexistent token', () => {
    const result = invalidateRefreshToken('nonexistent');
    expect(result).toBe(false);
  });

  it('prevents the token from being used after invalidation', () => {
    const refresh = generateRefreshToken(TEST_PAYLOAD);
    invalidateRefreshToken(refresh);

    const result = rotateRefreshToken(refresh);
    expect(result).toBeNull();
  });
});

describe('invalidateAllUserRefreshTokens', () => {
  it('invalidates all tokens for a given user', () => {
    const t1 = generateRefreshToken(TEST_PAYLOAD);
    const t2 = generateRefreshToken(TEST_PAYLOAD);

    invalidateAllUserRefreshTokens(TEST_PAYLOAD.userId);

    expect(rotateRefreshToken(t1)).toBeNull();
    expect(rotateRefreshToken(t2)).toBeNull();
  });

  it('does not affect tokens for other users', () => {
    const otherPayload: AuthPayload = { userId: 'other-user', email: 'other@example.com' };
    const otherToken = generateRefreshToken(otherPayload);
    const myToken = generateRefreshToken(TEST_PAYLOAD);

    invalidateAllUserRefreshTokens(TEST_PAYLOAD.userId);

    // Other user's token should still work
    expect(rotateRefreshToken(otherToken)).not.toBeNull();
    // My token should be invalidated
    expect(rotateRefreshToken(myToken)).toBeNull();
  });
});
