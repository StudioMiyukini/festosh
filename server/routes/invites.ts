/**
 * Festival invitation link routes.
 */

import { Hono } from 'hono';
import { eq, and, like } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { festivalInvites, festivalMembers, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const inviteRoutes = new Hono();

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/create — generate an invitation link
// ---------------------------------------------------------------------------
inviteRoutes.post(
  '/festival/:festivalId/create',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const createdBy = c.get('userId');
      const body = await c.req.json();
      const role = body.role || 'volunteer';
      const maxUses = body.max_uses ?? 0; // 0 = unlimited
      const expiresInDays = body.expires_in_days ?? 7;

      const token = crypto.randomBytes(24).toString('base64url');
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = expiresInDays > 0 ? now + expiresInDays * 86400 : null;
      const id = crypto.randomUUID();

      db.insert(festivalInvites)
        .values({
          id,
          festivalId,
          token,
          role,
          maxUses,
          useCount: 0,
          expiresAt,
          createdBy,
          createdAt: now,
        })
        .run();

      return c.json({
        success: true,
        data: {
          id,
          token,
          role,
          max_uses: maxUses,
          use_count: 0,
          expires_at: expiresAt,
          created_at: now,
        },
      }, 201);
    } catch (error) {
      console.error('[invites] Create error:', error);
      return c.json({ success: false, error: 'Failed to create invite' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list active invites for a festival
// ---------------------------------------------------------------------------
inviteRoutes.get(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const invites = db
        .select()
        .from(festivalInvites)
        .where(eq(festivalInvites.festivalId, festivalId))
        .all();

      const data = invites.map((inv) => ({
        id: inv.id,
        token: inv.token,
        role: inv.role,
        max_uses: inv.maxUses,
        use_count: inv.useCount,
        expires_at: inv.expiresAt,
        created_at: inv.createdAt,
      }));

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[invites] List error:', error);
      return c.json({ success: false, error: 'Failed to list invites' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — revoke an invite
// ---------------------------------------------------------------------------
inviteRoutes.delete(
  '/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      db.delete(festivalInvites).where(eq(festivalInvites.id, id)).run();
      return c.json({ success: true, data: { message: 'Invite revoked' } });
    } catch (error) {
      console.error('[invites] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete invite' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /join/:token — consume an invite link (authenticated user joins)
// ---------------------------------------------------------------------------
inviteRoutes.post(
  '/join/:token',
  authMiddleware,
  async (c) => {
    try {
      const token = c.req.param('token');
      const userId = c.get('userId');

      const invite = db
        .select()
        .from(festivalInvites)
        .where(eq(festivalInvites.token, token))
        .get();

      if (!invite) {
        return c.json({ success: false, error: 'Lien d\'invitation invalide' }, 404);
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (invite.expiresAt && invite.expiresAt < now) {
        return c.json({ success: false, error: 'Ce lien d\'invitation a expire' }, 410);
      }

      // Check max uses
      if (invite.maxUses && invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
        return c.json({ success: false, error: 'Ce lien d\'invitation a atteint le nombre maximal d\'utilisations' }, 410);
      }

      // Check if already a member
      const existing = db
        .select()
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, invite.festivalId),
            eq(festivalMembers.userId, userId),
          ),
        )
        .get();

      if (existing) {
        return c.json({ success: false, error: 'Vous etes deja membre de ce festival' }, 409);
      }

      // Add as member
      const memberId = crypto.randomUUID();
      db.insert(festivalMembers)
        .values({
          id: memberId,
          festivalId: invite.festivalId,
          userId,
          role: invite.role,
          invitedBy: invite.createdBy,
          joinedAt: now,
        })
        .run();

      // Increment use count
      db.update(festivalInvites)
        .set({ useCount: invite.useCount + 1 })
        .where(eq(festivalInvites.id, invite.id))
        .run();

      return c.json({
        success: true,
        data: {
          festival_id: invite.festivalId,
          role: invite.role,
          message: 'Vous avez rejoint le festival !',
        },
      });
    } catch (error) {
      console.error('[invites] Join error:', error);
      return c.json({ success: false, error: 'Failed to join festival' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /search/users?email=...&festival_id=... — search users by email
// ---------------------------------------------------------------------------
inviteRoutes.get(
  '/search/users',
  authMiddleware,
  async (c) => {
    try {
      const email = c.req.query('email');
      const festivalId = c.req.query('festival_id');

      if (!email || email.length < 3) {
        return c.json({ success: false, error: 'Email query must be at least 3 characters' }, 400);
      }

      // Search profiles by email
      const users = db
        .select({
          id: profiles.id,
          username: profiles.username,
          display_name: profiles.displayName,
          email: profiles.email,
          avatar_url: profiles.avatarUrl,
        })
        .from(profiles)
        .where(like(profiles.email, `%${email}%`))
        .limit(10)
        .all();

      // If festivalId provided, mark which users are already members
      if (festivalId) {
        const memberIds = db
          .select({ userId: festivalMembers.userId })
          .from(festivalMembers)
          .where(eq(festivalMembers.festivalId, festivalId))
          .all()
          .map((m) => m.userId);

        const data = users.map((u) => ({
          ...u,
          is_member: memberIds.includes(u.id),
        }));

        return c.json({ success: true, data });
      }

      return c.json({ success: true, data: users });
    } catch (error) {
      console.error('[invites] Search users error:', error);
      return c.json({ success: false, error: 'Failed to search users' }, 500);
    }
  },
);

export { inviteRoutes };
