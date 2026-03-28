/**
 * Notification routes — user notifications.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const notificationRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// GET / — get user's notifications
// ---------------------------------------------------------------------------
notificationRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const unreadOnly = c.req.query('unread') === 'true';

    // Use raw SQL for pagination and optional filtering
    const { sqlite } = await import('../db/index.js');

    const conditions: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (unreadOnly) {
      conditions.push('is_read = 0');
    }

    const whereClause = conditions.join(' AND ');

    const countRow = sqlite
      .prepare(`SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`)
      .get(...params) as { total: number };

    const rows = sqlite
      .prepare(
        `SELECT * FROM notifications WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as Array<Record<string, unknown>>;

    const data = rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      festival_id: row.festival_id,
      title: row.title,
      body: row.body,
      link: row.link,
      channel: row.channel,
      is_read: Boolean(row.is_read),
      read_at: row.read_at,
      metadata: safeParseJson(row.metadata as string, {}),
      created_at: row.created_at,
    }));

    return c.json({
      success: true,
      data,
      pagination: { total: countRow?.total || 0, limit, offset },
    });
  } catch (error) {
    console.error('[notifications] List error:', error);
    return c.json({ success: false, error: 'Failed to list notifications' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/read — mark as read
// ---------------------------------------------------------------------------
notificationRoutes.put('/:id/read', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const notifId = c.req.param('id');
    const now = Math.floor(Date.now() / 1000);

    const notif = db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
      .get();

    if (!notif) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }

    db.update(notifications)
      .set({ isRead: 1, readAt: now })
      .where(eq(notifications.id, notifId))
      .run();

    return c.json({ success: true, data: { message: 'Notification marked as read' } });
  } catch (error) {
    console.error('[notifications] Mark read error:', error);
    return c.json({ success: false, error: 'Failed to mark notification as read' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /read-all — mark all as read
// ---------------------------------------------------------------------------
notificationRoutes.put('/read-all', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    db.update(notifications)
      .set({ isRead: 1, readAt: now })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)))
      .run();

    return c.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error) {
    console.error('[notifications] Mark all read error:', error);
    return c.json({ success: false, error: 'Failed to mark all notifications as read' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete notification
// ---------------------------------------------------------------------------
notificationRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const notifId = c.req.param('id');

    const notif = db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
      .get();

    if (!notif) {
      return c.json({ success: false, error: 'Notification not found' }, 404);
    }

    db.delete(notifications).where(eq(notifications.id, notifId)).run();

    return c.json({ success: true, data: { message: 'Notification deleted' } });
  } catch (error) {
    console.error('[notifications] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete notification' }, 500);
  }
});

export { notificationRoutes };
