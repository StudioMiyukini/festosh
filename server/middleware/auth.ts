/**
 * JWT authentication middleware and password utilities.
 */

import type { Context, MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'festosh-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

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
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
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
      const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
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
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
