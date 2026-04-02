/**
 * Task routes — CRUD for organizational tasks.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { tasks, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const taskRoutes = new Hono();

function formatTask(t: typeof tasks.$inferSelect) {
  return formatResponse(t);
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list tasks
// ---------------------------------------------------------------------------
taskRoutes.get('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const status = c.req.query('status');

    let rows;
    if (status) {
      rows = db.select().from(tasks)
        .where(and(eq(tasks.festivalId, festivalId), eq(tasks.status, status)))
        .all();
    } else {
      rows = db.select().from(tasks)
        .where(eq(tasks.festivalId, festivalId))
        .all();
    }

    // Enrich with assignee name
    const data = rows.map((t) => {
      const formatted = formatTask(t) as Record<string, unknown>;
      if (t.assignedTo) {
        const user = db.select().from(profiles).where(eq(profiles.id, t.assignedTo)).get();
        if (user) formatted.assignee_name = user.displayName || user.username;
      }
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[tasks] List error:', error);
    return c.json({ success: false, error: 'Failed to list tasks' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get single task
// ---------------------------------------------------------------------------
taskRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }
    return c.json({ success: true, data: formatTask(task) });
  } catch (error) {
    console.error('[tasks] Get error:', error);
    return c.json({ success: false, error: 'Failed to get task' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create task
// ---------------------------------------------------------------------------
taskRoutes.post('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(tasks).values({
      id,
      festivalId,
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      assignedTo: body.assigned_to || null,
      dueDate: body.due_date || null,
      meetingId: body.meeting_id || null,
      meetingBlockId: body.meeting_block_id || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(tasks).where(eq(tasks.id, id)).get();
    return c.json({ success: true, data: formatTask(created!) }, 201);
  } catch (error) {
    console.error('[tasks] Create error:', error);
    return c.json({ success: false, error: 'Failed to create task' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update task
// ---------------------------------------------------------------------------
taskRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      assigned_to: 'assignedTo',
      due_date: 'dueDate',
      meeting_id: 'meetingId',
      meeting_block_id: 'meetingBlockId',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(tasks).set(updateData).where(eq(tasks.id, id)).run();
    const updated = db.select().from(tasks).where(eq(tasks.id, id)).get();
    return c.json({ success: true, data: formatTask(updated!) });
  } catch (error) {
    console.error('[tasks] Update error:', error);
    return c.json({ success: false, error: 'Failed to update task' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete task
// ---------------------------------------------------------------------------
taskRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Task not found' }, 404);
    }
    db.delete(tasks).where(eq(tasks.id, id)).run();
    return c.json({ success: true, data: { message: 'Task deleted' } });
  } catch (error) {
    console.error('[tasks] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete task' }, 500);
  }
});

export { taskRoutes };
