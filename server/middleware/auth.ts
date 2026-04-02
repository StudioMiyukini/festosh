/**
 * JWT authentication middleware and password utilities.
 */

import type { Context, MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tokenBlacklist } from '../db/schema.js';

// ---------------------------------------------------------------------------
// JWT configuration — fail hard if no secret in production
// ---------------------------------------------------------------------------
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET is not set! Refusing to start in production without a secret.');
    process.exit(1);
  }
  console.warn('[SECURITY] Using default JWT_SECRET — set JWT_SECRET env var for production.');
  return 'festosh-dev-secret-DO-NOT-USE-IN-PROD';
})();
const JWT_EXPIRY = '24h'; // Reduced from 7d for security
const BCRYPT_ROUNDS = 12; // Increased from 10

// ---------------------------------------------------------------------------
// Extend Hono context variables
// ---------------------------------------------------------------------------
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userRole: string;
    festivalRole: string;
  }
}

// ---------------------------------------------------------------------------
// authMiddleware — requires a valid JWT
// ---------------------------------------------------------------------------
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid authorization header' }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'festosh',
      audience: 'festosh-app',
    }) as jwt.JwtPayload;

    // Check if token has been revoked (logout)
    const jti = (payload as any).jti;
    if (jti) {
      const blacklisted = db.select().from(tokenBlacklist).where(eq(tokenBlacklist.jti, jti)).get();
      if (blacklisted) {
        return c.json({ success: false, error: 'Token has been revoked' }, 401);
      }
    }

    c.set('userId', payload.sub as string);
    c.set('userRole', (payload.role as string) || 'user');
    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
};

// ---------------------------------------------------------------------------
// optionalAuth — sets user context if token present, but does not fail
// ---------------------------------------------------------------------------
export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'festosh',
        audience: 'festosh-app',
      }) as jwt.JwtPayload;

      // Silently ignore blacklisted tokens
      const jti = (payload as any).jti;
      if (jti) {
        const blacklisted = db.select().from(tokenBlacklist).where(eq(tokenBlacklist.jti, jti)).get();
        if (blacklisted) {
          // Token revoked — continue as anonymous
          await next();
          return;
        }
      }

      c.set('userId', payload.sub as string);
      c.set('userRole', (payload.role as string) || 'user');
    } catch {
      // Token invalid — continue as anonymous
    }
  }
  await next();
};

// ---------------------------------------------------------------------------
// requireRole — middleware factory that checks the platform role
// ---------------------------------------------------------------------------
export function requireRole(roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get('userRole');
    if (!userRole || !roles.includes(userRole)) {
      return c.json({ success: false, error: 'Insufficient platform permissions' }, 403);
    }
    await next();
  };
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
export function generateToken(userId: string, role: string): string {
  const jti = crypto.randomUUID(); // Unique token ID
  return jwt.sign(
    { sub: userId, role, jti },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
      algorithm: 'HS256',
      issuer: 'festosh',
      audience: 'festosh-app',
    }
  );
}

// ---------------------------------------------------------------------------
// Password helpers — bcrypt with configurable rounds
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// Rate limiter — in-memory sliding window per IP
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(opts: { windowMs: number; max: number }): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else {
      entry.count++;
      if (entry.count > opts.max) {
        c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return c.json({ success: false, error: 'Too many requests. Please try again later.' }, 429);
      }
    }

    // Periodic cleanup (every 1000 requests)
    if (rateLimitStore.size > 10000) {
      for (const [k, v] of rateLimitStore) {
        if (now > v.resetAt) rateLimitStore.delete(k);
      }
    }

    await next();
  };
}
