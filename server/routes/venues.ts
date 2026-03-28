/**
 * Venue routes — physical locations within a festival.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { venues } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const venueRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatVenue(v: typeof venues.$inferSelect) {
  return {
    ...v,
    plan_position: safeParseJson(v.planPosition, {}),
  };
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list venues
// ---------------------------------------------------------------------------
venueRoutes.get('/festival/:festivalId', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db
      .select()
      .from(venues)
      .where(eq(venues.festivalId, festivalId))
      .all();

    return c.json({ success: true, data: rows.map(formatVenue) });
  } catch (error) {
    console.error('[venues] List error:', error);
    return c.json({ success: false, error: 'Failed to list venues' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create venue
// ---------------------------------------------------------------------------
venueRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, description, venue_type, capacity, address, plan_position } = body;

      if (!name) {
        return c.json({ success: false, error: 'Venue name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(venues)
        .values({
          id,
          festivalId,
          name,
          description: description || null,
          venueType: venue_type || null,
          capacity: capacity || null,
          address: address || null,
          planPosition: JSON.stringify(plan_position || {}),
          isActive: 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const venue = db.select().from(venues).where(eq(venues.id, id)).get();

      return c.json({ success: true, data: formatVenue(venue!) }, 201);
    } catch (error) {
      console.error('[venues] Create error:', error);
      return c.json({ success: false, error: 'Failed to create venue' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id — update venue
// ---------------------------------------------------------------------------
venueRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const venue = db.select().from(venues).where(eq(venues.id, id)).get();
    if (!venue) {
      return c.json({ success: false, error: 'Venue not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.venue_type !== undefined) updateData.venueType = body.venue_type;
    if (body.capacity !== undefined) updateData.capacity = body.capacity;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.is_active !== undefined) updateData.isActive = body.is_active ? 1 : 0;
    if (body.plan_position !== undefined) {
      updateData.planPosition = JSON.stringify(body.plan_position);
    }

    db.update(venues).set(updateData).where(eq(venues.id, id)).run();

    const updated = db.select().from(venues).where(eq(venues.id, id)).get();

    return c.json({ success: true, data: formatVenue(updated!) });
  } catch (error) {
    console.error('[venues] Update error:', error);
    return c.json({ success: false, error: 'Failed to update venue' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete venue
// ---------------------------------------------------------------------------
venueRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const venue = db.select().from(venues).where(eq(venues.id, id)).get();
    if (!venue) {
      return c.json({ success: false, error: 'Venue not found' }, 404);
    }

    db.delete(venues).where(eq(venues.id, id)).run();

    return c.json({ success: true, data: { message: 'Venue deleted' } });
  } catch (error) {
    console.error('[venues] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete venue' }, 500);
  }
});

export { venueRoutes };
