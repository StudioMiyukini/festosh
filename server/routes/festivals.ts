/**
 * Festival CRUD routes.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { festivals, festivalMembers, editions, profiles } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const festivalRoutes = new Hono();

/** Generate a URL-safe slug from text. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ---------------------------------------------------------------------------
// GET / — list user's festivals
// ---------------------------------------------------------------------------
festivalRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const memberships = db
      .select({
        festival: festivals,
        role: festivalMembers.role,
        joinedAt: festivalMembers.joinedAt,
      })
      .from(festivalMembers)
      .innerJoin(festivals, eq(festivals.id, festivalMembers.festivalId))
      .where(eq(festivalMembers.userId, userId))
      .all();

    const data = memberships.map((m) => ({
      ...formatFestival(m.festival),
      member_role: m.role,
      joined_at: m.joinedAt,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[festivals] List error:', error);
    return c.json({ success: false, error: 'Failed to list festivals' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST / — create festival
// ---------------------------------------------------------------------------
festivalRoutes.post('/', authMiddleware, requireRole(['organizer', 'admin']), async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, description, city, country, tags } = body;

    if (!name) {
      return c.json({ success: false, error: 'Festival name is required' }, 400);
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = db
      .select()
      .from(festivals)
      .where(eq(festivals.slug, slug))
      .get();

    if (existing) {
      return c.json({ success: false, error: 'A festival with a similar name already exists' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const festivalId = crypto.randomUUID();
    const editionId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();

    // Create festival
    db.insert(festivals)
      .values({
        id: festivalId,
        name,
        slug,
        description: description || null,
        city: city || null,
        country: country || 'FR',
        tags: JSON.stringify(tags || []),
        socialLinks: JSON.stringify({}),
        status: 'draft',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create first edition
    db.insert(editions)
      .values({
        id: editionId,
        festivalId,
        name: `${name} ${currentYear}`,
        slug: String(currentYear),
        status: 'planning',
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Add creator as owner
    db.insert(festivalMembers)
      .values({
        id: memberId,
        festivalId,
        userId,
        role: 'owner',
        joinedAt: now,
      })
      .run();

    const festival = db
      .select()
      .from(festivals)
      .where(eq(festivals.id, festivalId))
      .get();

    return c.json({
      success: true,
      data: formatFestival(festival!),
    }, 201);
  } catch (error) {
    console.error('[festivals] Create error:', error);
    return c.json({ success: false, error: 'Failed to create festival' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get festival by ID
// ---------------------------------------------------------------------------
festivalRoutes.get('/:id', async (c) => {
  try {
    const festivalId = c.req.param('id');

    const festival = db
      .select()
      .from(festivals)
      .where(eq(festivals.id, festivalId))
      .get();

    if (!festival) {
      return c.json({ success: false, error: 'Festival not found' }, 404);
    }

    return c.json({
      success: true,
      data: formatFestival(festival),
    });
  } catch (error) {
    console.error('[festivals] Get error:', error);
    return c.json({ success: false, error: 'Failed to fetch festival' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update festival
// ---------------------------------------------------------------------------
festivalRoutes.put(
  '/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      const updateData: Record<string, unknown> = { updatedAt: now };

      // Whitelist updatable fields
      const fields = [
        'name', 'description', 'city', 'country', 'address',
        'latitude', 'longitude', 'status', 'website', 'contactEmail',
        'logoUrl', 'bannerUrl', 'themePrimaryColor', 'themeSecondaryColor', 'themeFont',
      ] as const;

      // Map snake_case body keys to camelCase schema keys
      const keyMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        city: 'city',
        country: 'country',
        address: 'address',
        latitude: 'latitude',
        longitude: 'longitude',
        status: 'status',
        website: 'website',
        contact_email: 'contactEmail',
        logo_url: 'logoUrl',
        banner_url: 'bannerUrl',
        primary_color: 'themePrimaryColor',
        secondary_color: 'themeSecondaryColor',
        theme_font: 'themeFont',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      if (body.tags !== undefined) {
        updateData.tags = JSON.stringify(body.tags);
      }
      if (body.social_links !== undefined) {
        updateData.socialLinks = JSON.stringify(body.social_links);
      }

      db.update(festivals)
        .set(updateData)
        .where(eq(festivals.id, festivalId))
        .run();

      const updated = db
        .select()
        .from(festivals)
        .where(eq(festivals.id, festivalId))
        .get();

      return c.json({
        success: true,
        data: formatFestival(updated!),
      });
    } catch (error) {
      console.error('[festivals] Update error:', error);
      return c.json({ success: false, error: 'Failed to update festival' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — delete festival
// ---------------------------------------------------------------------------
festivalRoutes.delete(
  '/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');

      db.delete(festivals).where(eq(festivals.id, festivalId)).run();

      return c.json({ success: true, data: { message: 'Festival deleted' } });
    } catch (error) {
      console.error('[festivals] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete festival' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/members — list members
// ---------------------------------------------------------------------------
festivalRoutes.get(
  '/:id/members',
  authMiddleware,
  festivalMemberMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('id');

      const members = db
        .select({
          id: festivalMembers.id,
          user_id: festivalMembers.userId,
          role: festivalMembers.role,
          joined_at: festivalMembers.joinedAt,
          username: profiles.username,
          display_name: profiles.displayName,
          email: profiles.email,
          avatar_url: profiles.avatarUrl,
        })
        .from(festivalMembers)
        .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
        .where(eq(festivalMembers.festivalId, festivalId))
        .all();

      return c.json({ success: true, data: members });
    } catch (error) {
      console.error('[festivals] List members error:', error);
      return c.json({ success: false, error: 'Failed to list members' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:id/members — add member
// ---------------------------------------------------------------------------
festivalRoutes.post(
  '/:id/members',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const invitedBy = c.get('userId');
      const { user_id, role } = await c.req.json();

      if (!user_id || !role) {
        return c.json({ success: false, error: 'user_id and role are required' }, 400);
      }

      // Check if already a member
      const existing = db
        .select()
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, user_id),
          ),
        )
        .get();

      if (existing) {
        return c.json({ success: false, error: 'User is already a member' }, 409);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(festivalMembers)
        .values({
          id,
          festivalId,
          userId: user_id,
          role,
          invitedBy,
          joinedAt: now,
        })
        .run();

      return c.json({
        success: true,
        data: { id, festival_id: festivalId, user_id, role, joined_at: now },
      }, 201);
    } catch (error) {
      console.error('[festivals] Add member error:', error);
      return c.json({ success: false, error: 'Failed to add member' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id/members/:userId — remove member
// ---------------------------------------------------------------------------
festivalRoutes.delete(
  '/:id/members/:userId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const targetUserId = c.req.param('userId');

      // Prevent removing the owner
      const membership = db
        .select()
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, targetUserId),
          ),
        )
        .get();

      if (!membership) {
        return c.json({ success: false, error: 'Member not found' }, 404);
      }

      if (membership.role === 'owner') {
        return c.json({ success: false, error: 'Cannot remove the festival owner' }, 403);
      }

      db.delete(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, targetUserId),
          ),
        )
        .run();

      return c.json({ success: true, data: { message: 'Member removed' } });
    } catch (error) {
      console.error('[festivals] Remove member error:', error);
      return c.json({ success: false, error: 'Failed to remove member' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatFestival(f: typeof festivals.$inferSelect) {
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    description: f.description,
    logo_url: f.logoUrl,
    banner_url: f.bannerUrl,
    theme_colors: {
      primary: f.themePrimaryColor ?? '#6366f1',
      secondary: f.themeSecondaryColor ?? '#ec4899',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#111827',
    },
    location_name: f.city,
    location_address: f.address,
    location_lat: f.latitude,
    location_lng: f.longitude,
    city: f.city,
    country: f.country,
    website: f.website,
    contact_email: f.contactEmail,
    social_links: safeParseJson(f.socialLinks, {}),
    tags: safeParseJson(f.tags, []),
    status: f.status,
    created_by: f.createdBy,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  };
}

export { festivalRoutes };
