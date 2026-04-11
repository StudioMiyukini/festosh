/**
 * Queue routes — virtual queue management for festival editions.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { virtualQueues, queueEntries, editions } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const queueRoutes = new Hono();

/**
 * Helper: resolve the festivalId from an editionId so that
 * festivalMemberMiddleware (which reads `festivalId` from params) can work.
 */
async function resolveEditionFestival(c: any, next: any) {
  const editionId = c.req.param('editionId');
  if (!editionId) {
    return c.json({ success: false, error: 'Edition ID is required' }, 400);
  }
  const edition = db.select().from(editions).where(eq(editions.id, editionId)).get();
  if (!edition) {
    return c.json({ success: false, error: 'Edition not found' }, 404);
  }
  c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
  await next();
}

/**
 * Helper: resolve festivalId from a queue's editionId.
 */
async function resolveQueueFestival(c: any, next: any) {
  const queueId = c.req.param('id');
  const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, queueId)).get();
  if (!queue) {
    return c.json({ success: false, error: 'Queue not found' }, 404);
  }
  const edition = db.select().from(editions).where(eq(editions.id, queue.editionId)).get();
  if (!edition) {
    return c.json({ success: false, error: 'Edition not found' }, 404);
  }
  c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
  await next();
}

/**
 * Generate a ticket code: Q-XXXX (4 hex chars)
 */
function generateTicketCode(): string {
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `Q-${rand}`;
}

// ---------------------------------------------------------------------------
// GET /edition/:editionId — list active queues with current waiting count (public)
// ---------------------------------------------------------------------------
queueRoutes.get('/edition/:editionId', optionalAuth, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const queues = db
      .select()
      .from(virtualQueues)
      .where(and(eq(virtualQueues.editionId, editionId), eq(virtualQueues.isActive, 1)))
      .all();

    const data = queues.map((q) => {
      const waitingCount = db
        .select({ count: sql<number>`count(*)` })
        .from(queueEntries)
        .where(and(eq(queueEntries.queueId, q.id), eq(queueEntries.status, 'waiting')))
        .get();

      return {
        ...formatResponse(q as Record<string, unknown>),
        waiting_count: waitingCount?.count ?? 0,
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[queues] List queues error:', error);
    return c.json({ success: false, error: 'Failed to list queues' }, 500);
  }
});

// ===========================================================================
// ADMIN ROUTES — auth + festivalMember + owner/admin
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /edition/:editionId — create queue (admin)
// ---------------------------------------------------------------------------
queueRoutes.post(
  '/edition/:editionId',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Name is required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(virtualQueues)
        .values({
          id,
          editionId,
          name: body.name,
          description: body.description || null,
          location: body.location || null,
          avgServiceMinutes: body.avg_service_minutes ?? 5,
          isActive: 1,
        })
        .run();

      const created = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();

      return c.json(
        { success: true, data: created ? formatResponse(created as Record<string, unknown>) : null },
        201,
      );
    } catch (error) {
      console.error('[queues] Create queue error:', error);
      return c.json({ success: false, error: 'Failed to create queue' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id — update queue (admin)
// ---------------------------------------------------------------------------
queueRoutes.put(
  '/:id',
  authMiddleware,
  resolveQueueFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();
      if (!queue) {
        return c.json({ success: false, error: 'Queue not found' }, 404);
      }

      const updateData: Record<string, unknown> = {};

      const keyMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        location: 'location',
        avg_service_minutes: 'avgServiceMinutes',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      db.update(virtualQueues).set(updateData).where(eq(virtualQueues.id, id)).run();

      const updated = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[queues] Update queue error:', error);
      return c.json({ success: false, error: 'Failed to update queue' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id/toggle — toggle is_active (admin)
// ---------------------------------------------------------------------------
queueRoutes.put(
  '/:id/toggle',
  authMiddleware,
  resolveQueueFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');

      const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();
      if (!queue) {
        return c.json({ success: false, error: 'Queue not found' }, 404);
      }

      const newIsActive = queue.isActive ? 0 : 1;

      db.update(virtualQueues)
        .set({ isActive: newIsActive })
        .where(eq(virtualQueues.id, id))
        .run();

      const updated = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[queues] Toggle queue error:', error);
      return c.json({ success: false, error: 'Failed to toggle queue status' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — delete queue (admin)
// ---------------------------------------------------------------------------
queueRoutes.delete(
  '/:id',
  authMiddleware,
  resolveQueueFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');

      const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, id)).get();
      if (!queue) {
        return c.json({ success: false, error: 'Queue not found' }, 404);
      }

      // Delete entries first, then queue
      db.delete(queueEntries).where(eq(queueEntries.queueId, id)).run();
      db.delete(virtualQueues).where(eq(virtualQueues.id, id)).run();

      return c.json({ success: true, data: { message: 'Queue deleted' } });
    } catch (error) {
      console.error('[queues] Delete queue error:', error);
      return c.json({ success: false, error: 'Failed to delete queue' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:id/join — join queue (auth or guest)
// ---------------------------------------------------------------------------
queueRoutes.post('/:id/join', optionalAuth, async (c) => {
  try {
    const queueId = c.req.param('id');
    const userId = c.get('userId') || null;
    const body = await c.req.json();

    // Must have either userId or guest_name
    if (!userId && !body.guest_name) {
      return c.json({ success: false, error: 'Authentication or guest_name is required' }, 400);
    }

    const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, queueId)).get();
    if (!queue) {
      return c.json({ success: false, error: 'Queue not found' }, 404);
    }
    if (!queue.isActive) {
      return c.json({ success: false, error: 'This queue is not active' }, 400);
    }

    // Check if user already in queue (waiting or called)
    if (userId) {
      const existing = db
        .select()
        .from(queueEntries)
        .where(
          and(
            eq(queueEntries.queueId, queueId),
            eq(queueEntries.userId, userId),
            eq(queueEntries.status, 'waiting'),
          ),
        )
        .get();

      if (existing) {
        return c.json({ success: false, error: 'You are already in this queue' }, 409);
      }
    }

    // Get max position
    const maxPos = db
      .select({ maxPosition: sql<number>`coalesce(max(${queueEntries.position}), 0)` })
      .from(queueEntries)
      .where(eq(queueEntries.queueId, queueId))
      .get();

    const position = (maxPos?.maxPosition ?? 0) + 1;
    const ticketCode = generateTicketCode();
    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(queueEntries)
      .values({
        id,
        queueId,
        userId: userId || null,
        guestName: body.guest_name || null,
        position,
        status: 'waiting',
        ticketCode,
        joinedAt: now,
      })
      .run();

    // Calculate estimated wait
    const waitingAhead = db
      .select({ count: sql<number>`count(*)` })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queueId, queueId),
          eq(queueEntries.status, 'waiting'),
          sql`${queueEntries.position} < ${position}`,
        ),
      )
      .get();

    const estimatedWaitMinutes = (waitingAhead?.count ?? 0) * (queue.avgServiceMinutes ?? 5);

    return c.json({
      success: true,
      data: {
        position,
        ticket_code: ticketCode,
        estimated_wait_minutes: estimatedWaitMinutes,
      },
    }, 201);
  } catch (error) {
    console.error('[queues] Join queue error:', error);
    return c.json({ success: false, error: 'Failed to join queue' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /entries/:id/call — call next person (admin)
// ---------------------------------------------------------------------------
queueRoutes.post(
  '/entries/:id/call',
  authMiddleware,
  async (c, next) => {
    const entryId = c.req.param('id');
    const entry = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();
    if (!entry) {
      return c.json({ success: false, error: 'Queue entry not found' }, 404);
    }
    const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, entry.queueId)).get();
    if (!queue) {
      return c.json({ success: false, error: 'Queue not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, queue.editionId)).get();
    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const entryId = c.req.param('id');
      const now = Math.floor(Date.now() / 1000);

      db.update(queueEntries)
        .set({ status: 'called', calledAt: now })
        .where(eq(queueEntries.id, entryId))
        .run();

      const updated = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[queues] Call entry error:', error);
      return c.json({ success: false, error: 'Failed to call queue entry' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /entries/:id/serve — mark served (admin)
// ---------------------------------------------------------------------------
queueRoutes.post(
  '/entries/:id/serve',
  authMiddleware,
  async (c, next) => {
    const entryId = c.req.param('id');
    const entry = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();
    if (!entry) {
      return c.json({ success: false, error: 'Queue entry not found' }, 404);
    }
    const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, entry.queueId)).get();
    if (!queue) {
      return c.json({ success: false, error: 'Queue not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, queue.editionId)).get();
    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const entryId = c.req.param('id');
      const now = Math.floor(Date.now() / 1000);

      db.update(queueEntries)
        .set({ status: 'served', servedAt: now })
        .where(eq(queueEntries.id, entryId))
        .run();

      const updated = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[queues] Serve entry error:', error);
      return c.json({ success: false, error: 'Failed to mark entry as served' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /entries/:id/cancel — cancel (auth: own entry or admin)
// ---------------------------------------------------------------------------
queueRoutes.post('/entries/:id/cancel', authMiddleware, async (c) => {
  try {
    const entryId = c.req.param('id');
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const entry = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();
    if (!entry) {
      return c.json({ success: false, error: 'Queue entry not found' }, 404);
    }

    // Allow cancel if user owns the entry (or admin — handled elsewhere if needed)
    if (entry.userId && entry.userId !== userId) {
      return c.json({ success: false, error: 'You can only cancel your own queue entry' }, 403);
    }

    db.update(queueEntries)
      .set({ status: 'cancelled' })
      .where(eq(queueEntries.id, entryId))
      .run();

    const updated = db.select().from(queueEntries).where(eq(queueEntries.id, entryId)).get();

    return c.json({
      success: true,
      data: updated ? formatResponse(updated as Record<string, unknown>) : null,
    });
  } catch (error) {
    console.error('[queues] Cancel entry error:', error);
    return c.json({ success: false, error: 'Failed to cancel queue entry' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/board — public display board
// ---------------------------------------------------------------------------
queueRoutes.get('/:id/board', optionalAuth, async (c) => {
  try {
    const queueId = c.req.param('id');

    const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, queueId)).get();
    if (!queue) {
      return c.json({ success: false, error: 'Queue not found' }, 404);
    }

    const entries = db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queueId, queueId),
          sql`${queueEntries.status} IN ('waiting', 'called')`,
        ),
      )
      .all();

    // Sort by position
    entries.sort((a, b) => a.position - b.position);

    const data = entries.map((e) => {
      // Calculate estimated wait for waiting entries
      const waitingAhead = entries.filter(
        (other) => other.status === 'waiting' && other.position < e.position,
      ).length;

      return {
        position: e.position,
        ticket_code: e.ticketCode,
        status: e.status,
        estimated_wait_minutes: e.status === 'waiting'
          ? waitingAhead * (queue.avgServiceMinutes ?? 5)
          : 0,
      };
    });

    return c.json({
      success: true,
      data: {
        queue: formatResponse(queue as Record<string, unknown>),
        entries: data,
      },
    });
  } catch (error) {
    console.error('[queues] Board error:', error);
    return c.json({ success: false, error: 'Failed to get queue board' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-position/:queueId — get user's current position + estimated wait
// ---------------------------------------------------------------------------
queueRoutes.get('/my-position/:queueId', authMiddleware, async (c) => {
  try {
    const queueId = c.req.param('queueId');
    const userId = c.get('userId');

    const queue = db.select().from(virtualQueues).where(eq(virtualQueues.id, queueId)).get();
    if (!queue) {
      return c.json({ success: false, error: 'Queue not found' }, 404);
    }

    // Find user's active entry
    const entry = db
      .select()
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queueId, queueId),
          eq(queueEntries.userId, userId),
          sql`${queueEntries.status} IN ('waiting', 'called')`,
        ),
      )
      .get();

    if (!entry) {
      return c.json({ success: false, error: 'You are not in this queue' }, 404);
    }

    // Count people ahead
    const aheadCount = db
      .select({ count: sql<number>`count(*)` })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queueId, queueId),
          eq(queueEntries.status, 'waiting'),
          sql`${queueEntries.position} < ${entry.position}`,
        ),
      )
      .get();

    const estimatedWaitMinutes = (aheadCount?.count ?? 0) * (queue.avgServiceMinutes ?? 5);

    return c.json({
      success: true,
      data: {
        position: entry.position,
        status: entry.status,
        ticket_code: entry.ticketCode,
        people_ahead: aheadCount?.count ?? 0,
        estimated_wait_minutes: estimatedWaitMinutes,
      },
    });
  } catch (error) {
    console.error('[queues] My position error:', error);
    return c.json({ success: false, error: 'Failed to get queue position' }, 500);
  }
});

export { queueRoutes };
