/**
 * Support ticket routes — CRUD for tickets + messages.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { supportTickets, ticketMessages, profiles } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const ticketRoutes = new Hono();

function formatTicket(t: typeof supportTickets.$inferSelect) {
  return formatResponse(t);
}

function formatMessage(m: typeof ticketMessages.$inferSelect) {
  return formatResponse(m);
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list tickets (admin: all, user: own)
// ---------------------------------------------------------------------------
ticketRoutes.get('/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const status = c.req.query('status');
    const isAdmin = c.req.query('admin') === '1';

    let rows;
    if (isAdmin) {
      // Admin view — all tickets for this festival
      if (status) {
        rows = db.select().from(supportTickets)
          .where(and(eq(supportTickets.festivalId, festivalId), eq(supportTickets.status, status)))
          .orderBy(desc(supportTickets.createdAt))
          .all();
      } else {
        rows = db.select().from(supportTickets)
          .where(eq(supportTickets.festivalId, festivalId))
          .orderBy(desc(supportTickets.createdAt))
          .all();
      }
    } else {
      // User view — own tickets only
      rows = db.select().from(supportTickets)
        .where(and(eq(supportTickets.festivalId, festivalId), eq(supportTickets.userId, userId)))
        .orderBy(desc(supportTickets.createdAt))
        .all();
    }

    const data = rows.map((t) => {
      const formatted = formatTicket(t) as Record<string, unknown>;
      // Enrich with user/assignee names
      if (t.userId) {
        const user = db.select().from(profiles).where(eq(profiles.id, t.userId)).get();
        if (user) {
          formatted.user_name = user.displayName || user.username;
          formatted.user_email = user.email;
        }
      }
      if (t.assignedTo) {
        const assignee = db.select().from(profiles).where(eq(profiles.id, t.assignedTo)).get();
        if (assignee) formatted.assignee_name = assignee.displayName || assignee.username;
      }
      // Message count
      const msgs = db.select().from(ticketMessages)
        .where(eq(ticketMessages.ticketId, t.id))
        .all();
      formatted.message_count = msgs.length;
      if (msgs.length > 0) {
        formatted.last_message_at = msgs[msgs.length - 1].createdAt;
      }
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[tickets] List error:', error);
    return c.json({ success: false, error: 'Failed to list tickets' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get ticket with messages
// ---------------------------------------------------------------------------
ticketRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const ticket = db.select().from(supportTickets).where(eq(supportTickets.id, id)).get();
    if (!ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    const messages = db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, id))
      .orderBy(ticketMessages.createdAt)
      .all();

    // Enrich messages with sender names
    const enrichedMessages = messages.map((m) => {
      const formatted = formatMessage(m) as Record<string, unknown>;
      if (m.senderId) {
        const sender = db.select().from(profiles).where(eq(profiles.id, m.senderId)).get();
        if (sender) formatted.sender_name = sender.displayName || sender.username;
      }
      if (m.senderType === 'bot') formatted.sender_name = 'Assistant';
      return formatted;
    });

    const formatted = formatTicket(ticket) as Record<string, unknown>;
    if (ticket.userId) {
      const user = db.select().from(profiles).where(eq(profiles.id, ticket.userId)).get();
      if (user) {
        formatted.user_name = user.displayName || user.username;
        formatted.user_email = user.email;
      }
    }
    if (ticket.assignedTo) {
      const assignee = db.select().from(profiles).where(eq(profiles.id, ticket.assignedTo)).get();
      if (assignee) formatted.assignee_name = assignee.displayName || assignee.username;
    }

    return c.json({ success: true, data: { ...formatted, messages: enrichedMessages } });
  } catch (error) {
    console.error('[tickets] Get error:', error);
    return c.json({ success: false, error: 'Failed to get ticket' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create ticket (auth or guest)
// ---------------------------------------------------------------------------
ticketRoutes.post('/festival/:festivalId', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId') || null;
    const body = await c.req.json();

    if (!body.subject) {
      return c.json({ success: false, error: 'Subject is required' }, 400);
    }

    // If not authenticated, require guest name and email
    if (!userId && (!body.guest_name || !body.guest_email)) {
      return c.json({ success: false, error: 'Guest name and email are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(supportTickets).values({
      id,
      festivalId,
      userId,
      guestName: body.guest_name || null,
      guestEmail: body.guest_email || null,
      subject: body.subject,
      category: body.category || 'general',
      priority: body.priority || 'medium',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }).run();

    // Add initial message if provided
    if (body.message) {
      db.insert(ticketMessages).values({
        id: crypto.randomUUID(),
        ticketId: id,
        senderId: userId,
        senderType: userId ? 'user' : 'user',
        content: body.message,
        isInternal: 0,
        createdAt: now,
      }).run();
    }

    const created = db.select().from(supportTickets).where(eq(supportTickets.id, id)).get();
    return c.json({ success: true, data: formatTicket(created!) }, 201);
  } catch (error) {
    console.error('[tickets] Create error:', error);
    return c.json({ success: false, error: 'Failed to create ticket' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /:id/messages — add message to ticket
// ---------------------------------------------------------------------------
ticketRoutes.post('/:id/messages', authMiddleware, async (c) => {
  try {
    const ticketId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.content) {
      return c.json({ success: false, error: 'Content is required' }, 400);
    }

    const ticket = db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).get();
    if (!ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(ticketMessages).values({
      id,
      ticketId,
      senderId: userId,
      senderType: body.sender_type || 'user',
      content: body.content,
      isInternal: body.is_internal ? 1 : 0,
      createdAt: now,
    }).run();

    // Update ticket timestamp
    db.update(supportTickets).set({ updatedAt: now }).where(eq(supportTickets.id, ticketId)).run();

    const created = db.select().from(ticketMessages).where(eq(ticketMessages.id, id)).get();
    return c.json({ success: true, data: formatMessage(created!) }, 201);
  } catch (error) {
    console.error('[tickets] Add message error:', error);
    return c.json({ success: false, error: 'Failed to add message' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update ticket (status, priority, assignment)
// ---------------------------------------------------------------------------
ticketRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(supportTickets).where(eq(supportTickets.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      status: 'status',
      priority: 'priority',
      category: 'category',
      assigned_to: 'assignedTo',
      subject: 'subject',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    // Set closed_at when resolving/closing
    if (body.status === 'resolved' || body.status === 'closed') {
      updateData.closedAt = now;
    }

    db.update(supportTickets).set(updateData).where(eq(supportTickets.id, id)).run();
    const updated = db.select().from(supportTickets).where(eq(supportTickets.id, id)).get();
    return c.json({ success: true, data: formatTicket(updated!) });
  } catch (error) {
    console.error('[tickets] Update error:', error);
    return c.json({ success: false, error: 'Failed to update ticket' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete ticket
// ---------------------------------------------------------------------------
ticketRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(supportTickets).where(eq(supportTickets.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }
    // Delete messages first
    db.delete(ticketMessages).where(eq(ticketMessages.ticketId, id)).run();
    db.delete(supportTickets).where(eq(supportTickets.id, id)).run();
    return c.json({ success: true, data: { message: 'Ticket deleted' } });
  } catch (error) {
    console.error('[tickets] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete ticket' }, 500);
  }
});

export { ticketRoutes };
