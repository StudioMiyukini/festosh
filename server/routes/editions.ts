/**
 * Edition CRUD routes — requires festival membership.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { editions, festivalMembers } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const editionRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatEdition(e: typeof editions.$inferSelect) {
  return {
    ...e,
    visitor_hours: safeParseJson(e.visitorHours, {}),
  };
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list editions
// ---------------------------------------------------------------------------
editionRoutes.get('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');

    // Check membership
    const member = db
      .select()
      .from(festivalMembers)
      .where(and(eq(festivalMembers.festivalId, festivalId), eq(festivalMembers.userId, userId)))
      .get();

    // Platform admin bypass
    const platformRole = c.get('userRole');
    if (!member && platformRole !== 'admin') {
      return c.json({ success: false, error: 'Not a member of this festival' }, 403);
    }

    const rows = db
      .select()
      .from(editions)
      .where(eq(editions.festivalId, festivalId))
      .all();

    return c.json({ success: true, data: rows.map(formatEdition) });
  } catch (error) {
    console.error('[editions] List error:', error);
    return c.json({ success: false, error: 'Failed to list editions' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create edition
// ---------------------------------------------------------------------------
editionRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, slug, description, start_date, end_date, year, status } = body;

      if (!name) {
        return c.json({ success: false, error: 'Edition name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();
      const editionYear = year || new Date().getFullYear();
      const editionSlug = slug || String(editionYear);

      db.insert(editions)
        .values({
          id,
          festivalId,
          name,
          slug: editionSlug,
          description: description || null,
          startDate: start_date || null,
          endDate: end_date || null,
          status: status || 'planning',
          isActive: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const edition = db.select().from(editions).where(eq(editions.id, id)).get();

      return c.json({ success: true, data: formatEdition(edition!) }, 201);
    } catch (error) {
      console.error('[editions] Create error:', error);
      return c.json({ success: false, error: 'Failed to create edition' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id — get edition
// ---------------------------------------------------------------------------
editionRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const edition = db.select().from(editions).where(eq(editions.id, id)).get();

    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }

    return c.json({ success: true, data: formatEdition(edition) });
  } catch (error) {
    console.error('[editions] Get error:', error);
    return c.json({ success: false, error: 'Failed to fetch edition' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update edition
// ---------------------------------------------------------------------------
editionRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const edition = db.select().from(editions).where(eq(editions.id, id)).get();
    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }

    // Check membership via festival
    const userId = c.get('userId');
    const platformRole = c.get('userRole');
    if (platformRole !== 'admin') {
      const member = db
        .select()
        .from(festivalMembers)
        .where(and(eq(festivalMembers.festivalId, edition.festivalId), eq(festivalMembers.userId, userId)))
        .get();

      if (!member || !['owner', 'admin', 'editor'].includes(member.role ?? '')) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      start_date: 'startDate',
      end_date: 'endDate',
      status: 'status',
      expected_visitors: 'expectedVisitors',
      max_exhibitors: 'maxExhibitors',
      max_volunteers: 'maxVolunteers',
      is_active: 'isActive',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    if (body.visitor_hours !== undefined) {
      updateData.visitorHours = JSON.stringify(body.visitor_hours);
    }

    db.update(editions).set(updateData).where(eq(editions.id, id)).run();

    const updated = db.select().from(editions).where(eq(editions.id, id)).get();

    return c.json({ success: true, data: formatEdition(updated!) });
  } catch (error) {
    console.error('[editions] Update error:', error);
    return c.json({ success: false, error: 'Failed to update edition' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete edition
// ---------------------------------------------------------------------------
editionRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const edition = db.select().from(editions).where(eq(editions.id, id)).get();
    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }

    // Check membership via festival
    const userId = c.get('userId');
    const platformRole = c.get('userRole');
    if (platformRole !== 'admin') {
      const member = db
        .select()
        .from(festivalMembers)
        .where(and(eq(festivalMembers.festivalId, edition.festivalId), eq(festivalMembers.userId, userId)))
        .get();

      if (!member || !['owner', 'admin'].includes(member.role ?? '')) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }
    }

    db.delete(editions).where(eq(editions.id, id)).run();

    return c.json({ success: true, data: { message: 'Edition deleted' } });
  } catch (error) {
    console.error('[editions] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete edition' }, 500);
  }
});

export { editionRoutes };
