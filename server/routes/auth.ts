/**
 * Auth routes — register, login, profile management.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import {
  authMiddleware,
  generateToken,
  hashPassword,
  verifyPassword,
} from '../middleware/auth.js';

const authRoutes = new Hono();

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------
authRoutes.post('/register', async (c) => {
  try {
    const { username, email, password } = await c.req.json();

    if (!username || !email || !password) {
      return c.json({ success: false, error: 'Username, email, and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    // Check for existing email
    const existingEmail = db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .get();

    if (existingEmail) {
      return c.json({ success: false, error: 'Email already in use' }, 409);
    }

    // Check for existing username
    const existingUsername = db
      .select()
      .from(profiles)
      .where(eq(profiles.username, username))
      .get();

    if (existingUsername) {
      return c.json({ success: false, error: 'Username already taken' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.insert(profiles)
      .values({
        id,
        username,
        email,
        passwordHash,
        platformRole: 'user',
        locale: 'fr',
        timezone: 'Europe/Paris',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const token = generateToken(id, 'user');

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id,
          username,
          email,
          display_name: null,
          avatar_url: null,
          bio: null,
          platform_role: 'user',
          locale: 'fr',
          timezone: 'Europe/Paris',
        },
      },
    }, 201);
  } catch (error) {
    console.error('[auth] Register error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
authRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const token = generateToken(user.id, user.platformRole ?? 'user');

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          display_name: user.displayName,
          avatar_url: user.avatarUrl,
          bio: user.bio,
          platform_role: user.platformRole,
          locale: user.locale,
          timezone: user.timezone,
        },
      },
    });
  } catch (error) {
    console.error('[auth] Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        bio: user.bio,
        platform_role: user.platformRole,
        locale: user.locale,
        timezone: user.timezone,
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[auth] Get profile error:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /me
// ---------------------------------------------------------------------------
authRoutes.put('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { display_name, bio, avatar_url, locale, timezone } = body;

    const now = Math.floor(Date.now() / 1000);

    db.update(profiles)
      .set({
        displayName: display_name,
        bio,
        avatarUrl: avatar_url,
        locale,
        timezone,
        updatedAt: now,
      })
      .where(eq(profiles.id, userId))
      .run();

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();

    return c.json({
      success: true,
      data: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        display_name: user!.displayName,
        avatar_url: user!.avatarUrl,
        bio: user!.bio,
        platform_role: user!.platformRole,
        locale: user!.locale,
        timezone: user!.timezone,
      },
    });
  } catch (error) {
    console.error('[auth] Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /change-password
// ---------------------------------------------------------------------------
authRoutes.post('/change-password', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { old_password, new_password } = await c.req.json();

    if (!old_password || !new_password) {
      return c.json({ success: false, error: 'Old password and new password are required' }, 400);
    }

    if (new_password.length < 6) {
      return c.json({ success: false, error: 'New password must be at least 6 characters' }, 400);
    }

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const valid = await verifyPassword(old_password, user.passwordHash);
    if (!valid) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 401);
    }

    const newHash = await hashPassword(new_password);
    const now = Math.floor(Date.now() / 1000);

    db.update(profiles)
      .set({ passwordHash: newHash, updatedAt: now })
      .where(eq(profiles.id, userId))
      .run();

    return c.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    console.error('[auth] Change password error:', error);
    return c.json({ success: false, error: 'Failed to change password' }, 500);
  }
});

export { authRoutes };
