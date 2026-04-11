/**
 * Workspace Calendar routes — shared calendars with events for festival teams.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { sharedCalendars, calendarEvents, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const workspaceCalendarRoutes = new Hono();

function formatCalendar(c: typeof sharedCalendars.$inferSelect) {
  return formatResponse(c);
}

function formatEvent(e: typeof calendarEvents.$inferSelect) {
  return formatResponse(e, ['attendees']);
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDARS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list calendars with event counts
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.get('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db.select().from(sharedCalendars)
      .where(eq(sharedCalendars.festivalId, festivalId))
      .all();

    const data = rows.map((cal) => {
      const formatted = formatCalendar(cal) as Record<string, unknown>;
      const countResult = db.select({ count: sql<number>`count(*)` })
        .from(calendarEvents)
        .where(eq(calendarEvents.calendarId, cal.id))
        .get();
      formatted.event_count = countResult?.count ?? 0;
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[workspace-calendar] List calendars error:', error);
    return c.json({ success: false, error: 'Failed to list calendars' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create calendar
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.post('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    // Auto-create "Calendrier principal" if this is the first calendar
    const existing = db.select({ count: sql<number>`count(*)` })
      .from(sharedCalendars)
      .where(eq(sharedCalendars.festivalId, festivalId))
      .get();

    let isDefault = 0;
    let name = body.name || 'Calendrier';
    if ((existing?.count ?? 0) === 0) {
      name = 'Calendrier principal';
      isDefault = 1;
    }

    const id = crypto.randomUUID();
    db.insert(sharedCalendars).values({
      id,
      festivalId,
      name,
      color: body.color || '#6366f1',
      isDefault,
      createdBy: userId,
      createdAt: now,
    }).run();

    const created = db.select().from(sharedCalendars).where(eq(sharedCalendars.id, id)).get();
    return c.json({ success: true, data: formatCalendar(created!) }, 201);
  } catch (error) {
    console.error('[workspace-calendar] Create calendar error:', error);
    return c.json({ success: false, error: 'Failed to create calendar' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update calendar
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = db.select().from(sharedCalendars).where(eq(sharedCalendars.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Calendar not found' }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;

    if (Object.keys(updateData).length > 0) {
      db.update(sharedCalendars).set(updateData).where(eq(sharedCalendars.id, id)).run();
    }

    const updated = db.select().from(sharedCalendars).where(eq(sharedCalendars.id, id)).get();
    return c.json({ success: true, data: formatCalendar(updated!) });
  } catch (error) {
    console.error('[workspace-calendar] Update calendar error:', error);
    return c.json({ success: false, error: 'Failed to update calendar' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete calendar + its events (cascade)
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = db.select().from(sharedCalendars).where(eq(sharedCalendars.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Calendar not found' }, 404);
    }

    // Delete events first, then the calendar
    db.delete(calendarEvents).where(eq(calendarEvents.calendarId, id)).run();
    db.delete(sharedCalendars).where(eq(sharedCalendars.id, id)).run();

    return c.json({ success: true, data: { message: 'Calendar deleted' } });
  } catch (error) {
    console.error('[workspace-calendar] Delete calendar error:', error);
    return c.json({ success: false, error: 'Failed to delete calendar' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/events?start=&end= — list events across all calendars
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.get('/festival/:festivalId/events', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const startParam = c.req.query('start');
    const endParam = c.req.query('end');

    // Get all calendar IDs for this festival
    const calendars = db.select().from(sharedCalendars)
      .where(eq(sharedCalendars.festivalId, festivalId))
      .all();

    if (calendars.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const calendarMap = new Map(calendars.map((cal) => [cal.id, cal]));
    const calendarIds = calendars.map((cal) => cal.id);

    // Build query with optional date range filters
    let rows: (typeof calendarEvents.$inferSelect)[];

    if (startParam && endParam) {
      const start = parseInt(startParam, 10);
      const end = parseInt(endParam, 10);
      rows = db.select().from(calendarEvents)
        .where(
          and(
            sql`${calendarEvents.calendarId} IN (${sql.join(calendarIds.map(id => sql`${id}`), sql`, `)})`,
            gte(calendarEvents.startAt, start),
            lte(calendarEvents.endAt, end),
          )
        )
        .orderBy(calendarEvents.startAt)
        .all();
    } else if (startParam) {
      const start = parseInt(startParam, 10);
      rows = db.select().from(calendarEvents)
        .where(
          and(
            sql`${calendarEvents.calendarId} IN (${sql.join(calendarIds.map(id => sql`${id}`), sql`, `)})`,
            gte(calendarEvents.startAt, start),
          )
        )
        .orderBy(calendarEvents.startAt)
        .all();
    } else if (endParam) {
      const end = parseInt(endParam, 10);
      rows = db.select().from(calendarEvents)
        .where(
          and(
            sql`${calendarEvents.calendarId} IN (${sql.join(calendarIds.map(id => sql`${id}`), sql`, `)})`,
            lte(calendarEvents.endAt, end),
          )
        )
        .orderBy(calendarEvents.startAt)
        .all();
    } else {
      rows = db.select().from(calendarEvents)
        .where(
          sql`${calendarEvents.calendarId} IN (${sql.join(calendarIds.map(id => sql`${id}`), sql`, `)})`
        )
        .orderBy(calendarEvents.startAt)
        .all();
    }

    const data = rows.map((evt) => {
      const formatted = formatEvent(evt) as Record<string, unknown>;
      const cal = calendarMap.get(evt.calendarId);
      if (cal) {
        formatted.calendar_name = cal.name;
        formatted.calendar_color = cal.color;
      }
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[workspace-calendar] List events error:', error);
    return c.json({ success: false, error: 'Failed to list events' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /:calendarId/events — create event
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.post('/:calendarId/events', authMiddleware, async (c) => {
  try {
    const calendarId = c.req.param('calendarId');
    const userId = c.get('userId');
    const body = await c.req.json();

    const calendar = db.select().from(sharedCalendars).where(eq(sharedCalendars.id, calendarId)).get();
    if (!calendar) {
      return c.json({ success: false, error: 'Calendar not found' }, 404);
    }

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }
    if (!body.start_at || !body.end_at) {
      return c.json({ success: false, error: 'start_at and end_at are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    // Build attendees JSON — include the creator by default
    const attendees = Array.isArray(body.attendees)
      ? body.attendees.map((uid: string) => ({ user_id: uid, status: 'pending' }))
      : [];

    db.insert(calendarEvents).values({
      id,
      calendarId,
      title: body.title,
      description: body.description || null,
      location: body.location || null,
      startAt: body.start_at,
      endAt: body.end_at,
      allDay: body.all_day ? 1 : 0,
      color: body.color || null,
      reminderMinutes: body.reminder_minutes ?? null,
      createdBy: userId,
      attendees: JSON.stringify(attendees),
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    return c.json({ success: true, data: formatEvent(created!) }, 201);
  } catch (error) {
    console.error('[workspace-calendar] Create event error:', error);
    return c.json({ success: false, error: 'Failed to create event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /events/:id — update event
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.put('/events/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      location: 'location',
      start_at: 'startAt',
      end_at: 'endAt',
      all_day: 'allDay',
      color: 'color',
      reminder_minutes: 'reminderMinutes',
      recurrence: 'recurrence',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        if (bodyKey === 'all_day') {
          updateData[schemaKey] = body[bodyKey] ? 1 : 0;
        } else {
          updateData[schemaKey] = body[bodyKey];
        }
      }
    }

    if (body.attendees !== undefined) {
      updateData.attendees = JSON.stringify(body.attendees);
    }

    db.update(calendarEvents).set(updateData).where(eq(calendarEvents.id, id)).run();
    const updated = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    return c.json({ success: true, data: formatEvent(updated!) });
  } catch (error) {
    console.error('[workspace-calendar] Update event error:', error);
    return c.json({ success: false, error: 'Failed to update event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /events/:id — delete event
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.delete('/events/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    db.delete(calendarEvents).where(eq(calendarEvents.id, id)).run();
    return c.json({ success: true, data: { message: 'Event deleted' } });
  } catch (error) {
    console.error('[workspace-calendar] Delete event error:', error);
    return c.json({ success: false, error: 'Failed to delete event' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /events/:id/respond — respond to event invitation
// ---------------------------------------------------------------------------
workspaceCalendarRoutes.post('/events/:id/respond', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const validStatuses = ['accepted', 'declined', 'tentative'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({ success: false, error: 'Status must be accepted, declined, or tentative' }, 400);
    }

    const existing = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    // Parse attendees, update the user's status
    let attendees: Array<{ user_id: string; status: string }> = [];
    try {
      attendees = JSON.parse(existing.attendees || '[]');
    } catch {
      attendees = [];
    }

    const idx = attendees.findIndex((a) => a.user_id === userId);
    if (idx >= 0) {
      attendees[idx].status = body.status;
    } else {
      // User not in attendees list — add them
      attendees.push({ user_id: userId, status: body.status });
    }

    const now = Math.floor(Date.now() / 1000);
    db.update(calendarEvents)
      .set({ attendees: JSON.stringify(attendees), updatedAt: now })
      .where(eq(calendarEvents.id, id))
      .run();

    const updated = db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).get();
    return c.json({ success: true, data: formatEvent(updated!) });
  } catch (error) {
    console.error('[workspace-calendar] Respond to event error:', error);
    return c.json({ success: false, error: 'Failed to respond to event' }, 500);
  }
});

export { workspaceCalendarRoutes };
