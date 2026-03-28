/**
 * Event routes — programming/schedule items within an edition.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { events, editions, festivalMembers } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const eventRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatEvent(e: typeof events.$inferSelect) {
  return {
    ...e,
    speakers: safeParseJson(e.speakerNames, []),
    tags: safeParseJson(e.tags, []),
  };
}

// ---------------------------------------------------------------------------
// GET /edition/:editionId — list events (with optional filters)
// ---------------------------------------------------------------------------
eventRoutes.get('/edition/:editionId', async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const venueFilter = c.req.query('venue');
    const categoryFilter = c.req.query('category');
    const dateFilter = c.req.query('date'); // ISO date string

    // Use raw SQL for flexible filtering
    const { sqlite } = await import('../db/index.js');

    const conditions: string[] = ['edition_id = ?'];
    const params: unknown[] = [editionId];

    if (venueFilter) {
      conditions.push('venue_id = ?');
      params.push(venueFilter);
    }

    if (categoryFilter) {
      conditions.push('category = ?');
      params.push(categoryFilter);
    }

    if (dateFilter) {
      // Filter events whose start_time falls on the given date
      // Convert date to unix range
      const dayStart = Math.floor(new Date(dateFilter + 'T00:00:00Z').getTime() / 1000);
      const dayEnd = dayStart + 86400;
      conditions.push('start_time >= ? AND start_time < ?');
      params.push(dayStart, dayEnd);
    }

    const whereClause = conditions.join(' AND ');
    const rows = sqlite
      .prepare(`SELECT * FROM events WHERE ${whereClause} ORDER BY start_time ASC`)
      .all(...params) as Array<Record<string, unknown>>;

    const data = rows.map((row) => ({
      id: row.id,
      edition_id: row.edition_id,
      venue_id: row.venue_id,
      title: row.title,
      description: row.description,
      category: row.category,
      start_time: row.start_time,
      end_time: row.end_time,
      is_public: row.is_public,
      image_url: row.image_url,
      max_participants: row.max_participants,
      speakers: safeParseJson(row.speaker_names as string, []),
      tags: safeParseJson(row.tags as string, []),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[events] List error:', error);
    return c.json({ success: false, error: 'Failed to list events' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId — create event
// ---------------------------------------------------------------------------
eventRoutes.post('/edition/:editionId', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const userId = c.get('userId');
    const body = await c.req.json();

    const { title, description, category, venue_id, start_time, end_time, is_public, image_url, max_participants, speakers, tags } = body;

    if (!title || !start_time || !end_time) {
      return c.json({ success: false, error: 'Title, start_time, and end_time are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(events)
      .values({
        id,
        editionId,
        venueId: venue_id || null,
        title,
        description: description || null,
        category: category || null,
        startTime: start_time,
        endTime: end_time,
        isPublic: is_public !== false ? 1 : 0,
        imageUrl: image_url || null,
        maxParticipants: max_participants || null,
        speakerNames: JSON.stringify(speakers || []),
        tags: JSON.stringify(tags || []),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const event = db.select().from(events).where(eq(events.id, id)).get();

    return c.json({ success: true, data: formatEvent(event!) }, 201);
  } catch (error) {
    console.error('[events] Create error:', error);
    return c.json({ success: false, error: 'Failed to create event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get event
// ---------------------------------------------------------------------------
eventRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const event = db.select().from(events).where(eq(events.id, id)).get();
    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    return c.json({ success: true, data: formatEvent(event) });
  } catch (error) {
    console.error('[events] Get error:', error);
    return c.json({ success: false, error: 'Failed to fetch event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update event
// ---------------------------------------------------------------------------
eventRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const event = db.select().from(events).where(eq(events.id, id)).get();
    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      venue_id: 'venueId',
      start_time: 'startTime',
      end_time: 'endTime',
      image_url: 'imageUrl',
      max_participants: 'maxParticipants',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    if (body.is_public !== undefined) updateData.isPublic = body.is_public ? 1 : 0;
    if (body.speakers !== undefined) updateData.speakerNames = JSON.stringify(body.speakers);
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);

    db.update(events).set(updateData).where(eq(events.id, id)).run();

    const updated = db.select().from(events).where(eq(events.id, id)).get();

    return c.json({ success: true, data: formatEvent(updated!) });
  } catch (error) {
    console.error('[events] Update error:', error);
    return c.json({ success: false, error: 'Failed to update event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete event
// ---------------------------------------------------------------------------
eventRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const event = db.select().from(events).where(eq(events.id, id)).get();
    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    db.delete(events).where(eq(events.id, id)).run();

    return c.json({ success: true, data: { message: 'Event deleted' } });
  } catch (error) {
    console.error('[events] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete event' }, 500);
  }
});

export { eventRoutes };
