/**
 * Meeting routes — CRUD for meetings, blocks, and attendees.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { meetings, meetingBlocks, meetingAttendees, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const meetingRoutes = new Hono();

function formatMeeting(m: typeof meetings.$inferSelect) {
  return formatResponse(m);
}

function formatBlock(b: typeof meetingBlocks.$inferSelect) {
  return formatResponse(b, ['content']);
}

function formatAttendee(a: typeof meetingAttendees.$inferSelect) {
  return formatResponse(a);
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list meetings
// ---------------------------------------------------------------------------
meetingRoutes.get('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const rows = db.select().from(meetings)
      .where(eq(meetings.festivalId, festivalId))
      .all();

    return c.json({ success: true, data: rows.map(formatMeeting) });
  } catch (error) {
    console.error('[meetings] List error:', error);
    return c.json({ success: false, error: 'Failed to list meetings' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get meeting with blocks and attendees
// ---------------------------------------------------------------------------
meetingRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!meeting) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    const blocks = db.select().from(meetingBlocks)
      .where(eq(meetingBlocks.meetingId, id))
      .all();

    const attendeeRows = db.select().from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, id))
      .all();

    // Enrich attendees with display names
    const enrichedAttendees = attendeeRows.map((a) => {
      const formatted = formatAttendee(a) as Record<string, unknown>;
      const user = db.select().from(profiles).where(eq(profiles.id, a.userId)).get();
      if (user) formatted.display_name = user.displayName || user.username;
      return formatted;
    });

    const data = {
      ...formatMeeting(meeting),
      blocks: blocks.map(formatBlock),
      attendees: enrichedAttendees,
    };

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[meetings] Get error:', error);
    return c.json({ success: false, error: 'Failed to get meeting' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create meeting
// ---------------------------------------------------------------------------
meetingRoutes.post('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(meetings).values({
      id,
      festivalId,
      title: body.title,
      description: body.description || null,
      scheduledAt: body.scheduled_at || null,
      durationMinutes: body.duration_minutes || 60,
      location: body.location || null,
      status: 'planned',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(meetings).where(eq(meetings.id, id)).get();
    return c.json({ success: true, data: formatMeeting(created!) }, 201);
  } catch (error) {
    console.error('[meetings] Create error:', error);
    return c.json({ success: false, error: 'Failed to create meeting' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update meeting
// ---------------------------------------------------------------------------
meetingRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      scheduled_at: 'scheduledAt',
      duration_minutes: 'durationMinutes',
      location: 'location',
      status: 'status',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(meetings).set(updateData).where(eq(meetings.id, id)).run();
    const updated = db.select().from(meetings).where(eq(meetings.id, id)).get();
    return c.json({ success: true, data: formatMeeting(updated!) });
  } catch (error) {
    console.error('[meetings] Update error:', error);
    return c.json({ success: false, error: 'Failed to update meeting' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete meeting (cascades blocks + attendees)
// ---------------------------------------------------------------------------
meetingRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Meeting not found' }, 404);
    }
    // Delete related records first (SQLite may not cascade with Drizzle)
    db.delete(meetingBlocks).where(eq(meetingBlocks.meetingId, id)).run();
    db.delete(meetingAttendees).where(eq(meetingAttendees.meetingId, id)).run();
    db.delete(meetings).where(eq(meetings.id, id)).run();
    return c.json({ success: true, data: { message: 'Meeting deleted' } });
  } catch (error) {
    console.error('[meetings] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete meeting' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /:meetingId/blocks — add block
// ---------------------------------------------------------------------------
meetingRoutes.post('/:meetingId/blocks', authMiddleware, async (c) => {
  try {
    const meetingId = c.req.param('meetingId');
    const body = await c.req.json();

    if (!body.block_type) {
      return c.json({ success: false, error: 'block_type is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    // Get next sort order
    const existing = db.select().from(meetingBlocks)
      .where(eq(meetingBlocks.meetingId, meetingId))
      .all();
    const maxSort = existing.reduce((max, b) => Math.max(max, b.sortOrder ?? 0), -1);

    db.insert(meetingBlocks).values({
      id,
      meetingId,
      blockType: body.block_type,
      content: body.content ? JSON.stringify(body.content) : null,
      sortOrder: body.sort_order ?? maxSort + 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, id)).get();
    return c.json({ success: true, data: formatBlock(created!) }, 201);
  } catch (error) {
    console.error('[meetings] Create block error:', error);
    return c.json({ success: false, error: 'Failed to create block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /blocks/:blockId — update block
// ---------------------------------------------------------------------------
meetingRoutes.put('/blocks/:blockId', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.block_type !== undefined) updateData.blockType = body.block_type;
    if (body.content !== undefined) updateData.content = JSON.stringify(body.content);
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    db.update(meetingBlocks).set(updateData).where(eq(meetingBlocks.id, blockId)).run();
    const updated = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    return c.json({ success: true, data: formatBlock(updated!) });
  } catch (error) {
    console.error('[meetings] Update block error:', error);
    return c.json({ success: false, error: 'Failed to update block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /blocks/:blockId — delete block
// ---------------------------------------------------------------------------
meetingRoutes.delete('/blocks/:blockId', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');
    const existing = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }
    db.delete(meetingBlocks).where(eq(meetingBlocks.id, blockId)).run();
    return c.json({ success: true, data: { message: 'Block deleted' } });
  } catch (error) {
    console.error('[meetings] Delete block error:', error);
    return c.json({ success: false, error: 'Failed to delete block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:meetingId/blocks/reorder — reorder blocks
// ---------------------------------------------------------------------------
meetingRoutes.put('/:meetingId/blocks/reorder', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { block_ids } = body;

    if (!Array.isArray(block_ids)) {
      return c.json({ success: false, error: 'block_ids array required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < block_ids.length; i++) {
      db.update(meetingBlocks)
        .set({ sortOrder: i, updatedAt: now })
        .where(eq(meetingBlocks.id, block_ids[i]))
        .run();
    }

    return c.json({ success: true, data: { message: 'Blocks reordered' } });
  } catch (error) {
    console.error('[meetings] Reorder blocks error:', error);
    return c.json({ success: false, error: 'Failed to reorder blocks' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDEES
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /:meetingId/attendees — add attendee
// ---------------------------------------------------------------------------
meetingRoutes.post('/:meetingId/attendees', authMiddleware, async (c) => {
  try {
    const meetingId = c.req.param('meetingId');
    const body = await c.req.json();

    if (!body.user_id) {
      return c.json({ success: false, error: 'user_id is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(meetingAttendees).values({
      id,
      meetingId,
      userId: body.user_id,
      status: body.status || 'invited',
      createdAt: now,
    }).run();

    const created = db.select().from(meetingAttendees).where(eq(meetingAttendees.id, id)).get();
    return c.json({ success: true, data: formatAttendee(created!) }, 201);
  } catch (error) {
    console.error('[meetings] Add attendee error:', error);
    return c.json({ success: false, error: 'Failed to add attendee' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /attendees/:attendeeId — update attendee status
// ---------------------------------------------------------------------------
meetingRoutes.put('/attendees/:attendeeId', authMiddleware, async (c) => {
  try {
    const attendeeId = c.req.param('attendeeId');
    const body = await c.req.json();

    const existing = db.select().from(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Attendee not found' }, 404);
    }

    if (body.status) {
      db.update(meetingAttendees)
        .set({ status: body.status })
        .where(eq(meetingAttendees.id, attendeeId))
        .run();
    }

    const updated = db.select().from(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).get();
    return c.json({ success: true, data: formatAttendee(updated!) });
  } catch (error) {
    console.error('[meetings] Update attendee error:', error);
    return c.json({ success: false, error: 'Failed to update attendee' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /attendees/:attendeeId — remove attendee
// ---------------------------------------------------------------------------
meetingRoutes.delete('/attendees/:attendeeId', authMiddleware, async (c) => {
  try {
    const attendeeId = c.req.param('attendeeId');
    const existing = db.select().from(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Attendee not found' }, 404);
    }
    db.delete(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).run();
    return c.json({ success: true, data: { message: 'Attendee removed' } });
  } catch (error) {
    console.error('[meetings] Remove attendee error:', error);
    return c.json({ success: false, error: 'Failed to remove attendee' }, 500);
  }
});

export { meetingRoutes };
