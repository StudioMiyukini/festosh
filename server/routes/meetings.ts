/**
 * Meeting routes — CRUD for meetings with collaborative block editing.
 *
 * Block types:
 *   text       — { body: string }
 *   heading    — { body: string, level: 1|2|3 }
 *   checklist  — { items: [{ id, text, status: 'pending'|'done'|'cancelled' }] }
 *   action     — { items: [{ id, text, assignee_id?, status: 'todo'|'in_progress'|'done'|'cancelled', due_at? }] }
 *   poll       — { question: string, options: [{ id, text, votes: string[] }], multiple: boolean, closed: boolean }
 *   separator  — {}
 *   note       — { body: string, type: 'info'|'warning'|'success' }
 *   decision   — { body: string, status: 'proposed'|'accepted'|'rejected' }
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { meetings, meetingBlocks, meetingBlockHistory, meetingAttendees, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const meetingRoutes = new Hono();

const BLOCK_TYPES = ['text', 'heading', 'checklist', 'action', 'poll', 'separator', 'note', 'decision'] as const;

function formatMeeting(m: typeof meetings.$inferSelect) {
  return formatResponse(m);
}

function formatBlock(b: typeof meetingBlocks.$inferSelect) {
  return formatResponse(b, ['content']);
}

// Increment meeting version (triggers poll refresh for other clients)
function bumpVersion(meetingId: string) {
  const m = db.select({ version: meetings.version }).from(meetings).where(eq(meetings.id, meetingId)).get();
  const newVersion = (m?.version ?? 0) + 1;
  db.update(meetings).set({ version: newVersion, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(meetings.id, meetingId)).run();
  return newVersion;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEETINGS CRUD
// ═══════════════════════════════════════════════════════════════════════════

meetingRoutes.get('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const editionId = c.req.query('edition_id');

    let rows;
    if (editionId) {
      rows = db.select().from(meetings)
        .where(and(eq(meetings.festivalId, festivalId), eq(meetings.editionId, editionId)))
        .orderBy(desc(meetings.scheduledAt))
        .all();
    } else {
      rows = db.select().from(meetings)
        .where(eq(meetings.festivalId, festivalId))
        .orderBy(desc(meetings.scheduledAt))
        .all();
    }

    // Enrich with block count and attendee count
    const result = rows.map((m) => {
      const blockCount = db.select({ id: meetingBlocks.id }).from(meetingBlocks).where(eq(meetingBlocks.meetingId, m.id)).all().length;
      const attendeeCount = db.select({ id: meetingAttendees.id }).from(meetingAttendees).where(eq(meetingAttendees.meetingId, m.id)).all().length;
      return { ...formatMeeting(m), block_count: blockCount, attendee_count: attendeeCount };
    });

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[meetings] List error:', error);
    return c.json({ success: false, error: 'Failed to list meetings' }, 500);
  }
});

meetingRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const meeting = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!meeting) return c.json({ success: false, error: 'Meeting not found' }, 404);

    const blocks = db.select().from(meetingBlocks)
      .where(eq(meetingBlocks.meetingId, id))
      .orderBy(meetingBlocks.sortOrder)
      .all();

    const attendeeRows = db.select().from(meetingAttendees)
      .where(eq(meetingAttendees.meetingId, id))
      .all();

    const enrichedAttendees = attendeeRows.map((a) => {
      const user = db.select({ username: profiles.username, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
        .from(profiles).where(eq(profiles.id, a.userId)).get();
      return {
        id: a.id,
        user_id: a.userId,
        status: a.status,
        display_name: user?.displayName || user?.username || 'Inconnu',
        avatar_url: user?.avatarUrl || null,
      };
    });

    // Enrich blocks with last editor info
    const enrichedBlocks = blocks.map((b) => {
      const formatted = formatBlock(b) as Record<string, unknown>;
      if (b.updatedBy) {
        const editor = db.select({ username: profiles.username, displayName: profiles.displayName })
          .from(profiles).where(eq(profiles.id, b.updatedBy)).get();
        formatted.updated_by_name = editor?.displayName || editor?.username || null;
      }
      return formatted;
    });

    return c.json({
      success: true,
      data: {
        ...formatMeeting(meeting),
        blocks: enrichedBlocks,
        attendees: enrichedAttendees,
        block_types: BLOCK_TYPES,
      },
    });
  } catch (error) {
    console.error('[meetings] Get error:', error);
    return c.json({ success: false, error: 'Failed to get meeting' }, 500);
  }
});

// Polling endpoint: check if meeting has changed
meetingRoutes.get('/:id/poll', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const clientVersion = parseInt(c.req.query('version') || '0', 10);

    const meeting = db.select({ version: meetings.version, updatedAt: meetings.updatedAt })
      .from(meetings).where(eq(meetings.id, id)).get();
    if (!meeting) return c.json({ success: false, error: 'Meeting not found' }, 404);

    if (meeting.version <= clientVersion) {
      return c.json({ success: true, data: { changed: false, version: meeting.version } });
    }

    // Version changed — return full updated data
    const blocks = db.select().from(meetingBlocks)
      .where(eq(meetingBlocks.meetingId, id))
      .orderBy(meetingBlocks.sortOrder)
      .all();

    return c.json({
      success: true,
      data: {
        changed: true,
        version: meeting.version,
        blocks: blocks.map((b) => formatBlock(b)),
      },
    });
  } catch (error) {
    console.error('[meetings] Poll error:', error);
    return c.json({ success: false, error: 'Failed to poll' }, 500);
  }
});

meetingRoutes.post('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.title) return c.json({ success: false, error: 'Title is required' }, 400);

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(meetings).values({
      id,
      festivalId,
      editionId: body.edition_id || null,
      title: body.title,
      description: body.description || null,
      scheduledAt: body.scheduled_at || null,
      durationMinutes: body.duration_minutes || 60,
      location: body.location || null,
      status: 'planned',
      version: 1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Auto-add creator as attendee
    db.insert(meetingAttendees).values({
      id: crypto.randomUUID(), meetingId: id, userId, status: 'accepted', createdAt: now,
    }).run();

    // Add default blocks: heading + text
    db.insert(meetingBlocks).values({
      id: crypto.randomUUID(), meetingId: id, blockType: 'heading',
      content: JSON.stringify({ body: 'Ordre du jour', level: 2 }), sortOrder: 0, createdAt: now, updatedAt: now,
    }).run();
    db.insert(meetingBlocks).values({
      id: crypto.randomUUID(), meetingId: id, blockType: 'text',
      content: JSON.stringify({ body: '' }), sortOrder: 1, createdAt: now, updatedAt: now,
    }).run();

    const created = db.select().from(meetings).where(eq(meetings.id, id)).get();
    return c.json({ success: true, data: formatMeeting(created!) }, 201);
  } catch (error) {
    console.error('[meetings] Create error:', error);
    return c.json({ success: false, error: 'Failed to create meeting' }, 500);
  }
});

meetingRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Meeting not found' }, 404);

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      title: 'title', description: 'description', scheduled_at: 'scheduledAt',
      duration_minutes: 'durationMinutes', location: 'location', status: 'status',
      edition_id: 'editionId',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) updateData[schemaKey] = body[bodyKey];
    }

    db.update(meetings).set(updateData).where(eq(meetings.id, id)).run();
    bumpVersion(id);

    const updated = db.select().from(meetings).where(eq(meetings.id, id)).get();
    return c.json({ success: true, data: formatMeeting(updated!) });
  } catch (error) {
    console.error('[meetings] Update error:', error);
    return c.json({ success: false, error: 'Failed to update meeting' }, 500);
  }
});

meetingRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(meetings).where(eq(meetings.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Meeting not found' }, 404);

    // Get block IDs for history cleanup
    const blockIds = db.select({ id: meetingBlocks.id }).from(meetingBlocks).where(eq(meetingBlocks.meetingId, id)).all().map((b) => b.id);
    for (const bid of blockIds) {
      db.delete(meetingBlockHistory).where(eq(meetingBlockHistory.blockId, bid)).run();
    }

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
// BLOCKS — Collaborative editing
// ═══════════════════════════════════════════════════════════════════════════

meetingRoutes.post('/:meetingId/blocks', authMiddleware, async (c) => {
  try {
    const meetingId = c.req.param('meetingId');
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.block_type || !BLOCK_TYPES.includes(body.block_type)) {
      return c.json({ success: false, error: `block_type must be one of: ${BLOCK_TYPES.join(', ')}` }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    // Default content per block type
    const defaultContent: Record<string, unknown> = {
      text: { body: '' },
      heading: { body: '', level: 2 },
      checklist: { items: [] },
      action: { items: [] },
      poll: { question: '', options: [], multiple: false, closed: false },
      separator: {},
      note: { body: '', type: 'info' },
      decision: { body: '', status: 'proposed' },
    };

    const existing = db.select().from(meetingBlocks).where(eq(meetingBlocks.meetingId, meetingId)).all();
    const maxSort = existing.reduce((max, b) => Math.max(max, b.sortOrder ?? 0), -1);

    const content = body.content || defaultContent[body.block_type] || {};

    db.insert(meetingBlocks).values({
      id, meetingId, blockType: body.block_type,
      content: JSON.stringify(content),
      sortOrder: body.sort_order ?? maxSort + 1,
      updatedBy: userId,
      createdAt: now, updatedAt: now,
    }).run();

    bumpVersion(meetingId);

    const created = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, id)).get();
    return c.json({ success: true, data: formatBlock(created!) }, 201);
  } catch (error) {
    console.error('[meetings] Create block error:', error);
    return c.json({ success: false, error: 'Failed to create block' }, 500);
  }
});

// Update block content (collaborative — saves history)
meetingRoutes.put('/blocks/:blockId', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    if (!existing) return c.json({ success: false, error: 'Block not found' }, 404);

    // Save current state to history before updating
    db.insert(meetingBlockHistory).values({
      id: crypto.randomUUID(),
      blockId,
      content: existing.content,
      updatedBy: existing.updatedBy,
      updatedAt: existing.updatedAt,
    }).run();

    const updateData: Record<string, unknown> = { updatedAt: now, updatedBy: userId };
    if (body.block_type !== undefined && BLOCK_TYPES.includes(body.block_type)) updateData.blockType = body.block_type;
    if (body.content !== undefined) updateData.content = JSON.stringify(body.content);
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    db.update(meetingBlocks).set(updateData).where(eq(meetingBlocks.id, blockId)).run();
    bumpVersion(existing.meetingId);

    const updated = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    return c.json({ success: true, data: formatBlock(updated!) });
  } catch (error) {
    console.error('[meetings] Update block error:', error);
    return c.json({ success: false, error: 'Failed to update block' }, 500);
  }
});

// Vote on a poll block
meetingRoutes.post('/blocks/:blockId/vote', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const block = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    if (!block || block.blockType !== 'poll') return c.json({ success: false, error: 'Poll block not found' }, 404);

    const content = JSON.parse(block.content || '{}');
    if (content.closed) return c.json({ success: false, error: 'Ce sondage est clos' }, 400);

    const optionId = body.option_id;
    if (!optionId) return c.json({ success: false, error: 'option_id required' }, 400);

    // Toggle vote
    for (const opt of content.options || []) {
      if (!opt.votes) opt.votes = [];
      if (opt.id === optionId) {
        if (opt.votes.includes(userId)) {
          opt.votes = opt.votes.filter((v: string) => v !== userId);
        } else {
          opt.votes.push(userId);
        }
      } else if (!content.multiple) {
        // Single choice: remove vote from other options
        opt.votes = opt.votes.filter((v: string) => v !== userId);
      }
    }

    db.update(meetingBlocks).set({
      content: JSON.stringify(content), updatedAt: now, updatedBy: userId,
    }).where(eq(meetingBlocks.id, blockId)).run();

    bumpVersion(block.meetingId);

    return c.json({ success: true, data: { content } });
  } catch (error) {
    console.error('[meetings] Vote error:', error);
    return c.json({ success: false, error: 'Failed to vote' }, 500);
  }
});

meetingRoutes.delete('/blocks/:blockId', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');
    const existing = db.select().from(meetingBlocks).where(eq(meetingBlocks.id, blockId)).get();
    if (!existing) return c.json({ success: false, error: 'Block not found' }, 404);

    db.delete(meetingBlockHistory).where(eq(meetingBlockHistory.blockId, blockId)).run();
    db.delete(meetingBlocks).where(eq(meetingBlocks.id, blockId)).run();
    bumpVersion(existing.meetingId);

    return c.json({ success: true, data: { message: 'Block deleted' } });
  } catch (error) {
    console.error('[meetings] Delete block error:', error);
    return c.json({ success: false, error: 'Failed to delete block' }, 500);
  }
});

// Reorder blocks
meetingRoutes.put('/:meetingId/blocks/reorder', authMiddleware, async (c) => {
  try {
    const meetingId = c.req.param('meetingId');
    const body = await c.req.json();
    const { block_ids } = body;

    if (!Array.isArray(block_ids)) return c.json({ success: false, error: 'block_ids array required' }, 400);

    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < block_ids.length; i++) {
      db.update(meetingBlocks).set({ sortOrder: i, updatedAt: now }).where(eq(meetingBlocks.id, block_ids[i])).run();
    }

    bumpVersion(meetingId);
    return c.json({ success: true, data: { message: 'Blocks reordered' } });
  } catch (error) {
    console.error('[meetings] Reorder blocks error:', error);
    return c.json({ success: false, error: 'Failed to reorder blocks' }, 500);
  }
});

// Block history
meetingRoutes.get('/blocks/:blockId/history', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('blockId');

    const history = db.select({
      id: meetingBlockHistory.id,
      content: meetingBlockHistory.content,
      updatedBy: meetingBlockHistory.updatedBy,
      updatedAt: meetingBlockHistory.updatedAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
      .from(meetingBlockHistory)
      .leftJoin(profiles, eq(profiles.id, meetingBlockHistory.updatedBy))
      .where(eq(meetingBlockHistory.blockId, blockId))
      .orderBy(desc(meetingBlockHistory.updatedAt))
      .limit(20)
      .all();

    return c.json({
      success: true,
      data: history.map((h) => ({
        id: h.id,
        content: h.content ? JSON.parse(h.content) : null,
        updated_by: h.updatedBy,
        updated_by_name: h.displayName || h.username,
        updated_at: h.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[meetings] Block history error:', error);
    return c.json({ success: false, error: 'Failed to get block history' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDEES
// ═══════════════════════════════════════════════════════════════════════════

meetingRoutes.post('/:meetingId/attendees', authMiddleware, async (c) => {
  try {
    const meetingId = c.req.param('meetingId');
    const body = await c.req.json();

    if (!body.user_id) return c.json({ success: false, error: 'user_id is required' }, 400);

    const id = crypto.randomUUID();
    db.insert(meetingAttendees).values({
      id, meetingId, userId: body.user_id, status: body.status || 'invited',
      createdAt: Math.floor(Date.now() / 1000),
    }).run();

    return c.json({ success: true, data: { id, user_id: body.user_id, status: body.status || 'invited' } }, 201);
  } catch (error) {
    console.error('[meetings] Add attendee error:', error);
    return c.json({ success: false, error: 'Failed to add attendee' }, 500);
  }
});

meetingRoutes.put('/attendees/:attendeeId', authMiddleware, async (c) => {
  try {
    const attendeeId = c.req.param('attendeeId');
    const body = await c.req.json();

    const existing = db.select().from(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).get();
    if (!existing) return c.json({ success: false, error: 'Attendee not found' }, 404);

    if (body.status) {
      db.update(meetingAttendees).set({ status: body.status }).where(eq(meetingAttendees.id, attendeeId)).run();
    }

    return c.json({ success: true, data: { id: attendeeId, status: body.status } });
  } catch (error) {
    console.error('[meetings] Update attendee error:', error);
    return c.json({ success: false, error: 'Failed to update attendee' }, 500);
  }
});

meetingRoutes.delete('/attendees/:attendeeId', authMiddleware, async (c) => {
  try {
    const attendeeId = c.req.param('attendeeId');
    db.delete(meetingAttendees).where(eq(meetingAttendees.id, attendeeId)).run();
    return c.json({ success: true, data: { message: 'Attendee removed' } });
  } catch (error) {
    console.error('[meetings] Remove attendee error:', error);
    return c.json({ success: false, error: 'Failed to remove attendee' }, 500);
  }
});

export { meetingRoutes };
