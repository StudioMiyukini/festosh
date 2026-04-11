/**
 * Reservation routes — bookable slots CRUD and slot reservation management.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { bookableSlots, slotReservations, editions } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const reservationRoutes = new Hono();

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
  // Expose festivalId so festivalMemberMiddleware can pick it up
  c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
  await next();
}

// ═══════════════════════════════════════════════════════════════════════════
// SLOTS (public + admin)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/slots — list active bookable slots (public)
// ---------------------------------------------------------------------------
reservationRoutes.get('/edition/:editionId/slots', optionalAuth, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(bookableSlots)
      .where(and(eq(bookableSlots.editionId, editionId), eq(bookableSlots.isActive, 1)))
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[reservations] List slots error:', error);
    return c.json({ success: false, error: 'Failed to list slots' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/slots — create bookable slot (admin)
// ---------------------------------------------------------------------------
reservationRoutes.post(
  '/edition/:editionId/slots',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.title) {
        return c.json({ success: false, error: 'Title is required' }, 400);
      }
      if (!body.start_time || !body.end_time) {
        return c.json({ success: false, error: 'Start and end times are required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(bookableSlots)
        .values({
          id,
          editionId,
          title: body.title,
          description: body.description || null,
          location: body.location || null,
          startTime: body.start_time,
          endTime: body.end_time,
          capacity: body.capacity ?? 1,
          bookedCount: 0,
          priceCents: body.price_cents ?? 0,
          requiresTicket: body.requires_ticket ? 1 : 0,
          isActive: 1,
        })
        .run();

      const created = db.select().from(bookableSlots).where(eq(bookableSlots.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[reservations] Create slot error:', error);
      return c.json({ success: false, error: 'Failed to create slot' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /slots/:id — update bookable slot (admin)
// ---------------------------------------------------------------------------
reservationRoutes.put(
  '/slots/:id',
  authMiddleware,
  async (c, next) => {
    // Resolve festivalId from the slot's edition
    const slotId = c.req.param('id');
    const slot = db.select().from(bookableSlots).where(eq(bookableSlots.id, slotId)).get();
    if (!slot) {
      return c.json({ success: false, error: 'Slot not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, slot.editionId)).get();
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
      const id = c.req.param('id');
      const body = await c.req.json();

      const updateData: Record<string, unknown> = {};
      const keyMap: Record<string, string> = {
        title: 'title',
        description: 'description',
        location: 'location',
        start_time: 'startTime',
        end_time: 'endTime',
        capacity: 'capacity',
        price_cents: 'priceCents',
        requires_ticket: 'requiresTicket',
        is_active: 'isActive',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      db.update(bookableSlots).set(updateData).where(eq(bookableSlots.id, id)).run();
      const updated = db.select().from(bookableSlots).where(eq(bookableSlots.id, id)).get();
      return c.json({ success: true, data: formatResponse(updated!) });
    } catch (error) {
      console.error('[reservations] Update slot error:', error);
      return c.json({ success: false, error: 'Failed to update slot' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /slots/:id — delete bookable slot (admin)
// ---------------------------------------------------------------------------
reservationRoutes.delete(
  '/slots/:id',
  authMiddleware,
  async (c, next) => {
    const slotId = c.req.param('id');
    const slot = db.select().from(bookableSlots).where(eq(bookableSlots.id, slotId)).get();
    if (!slot) {
      return c.json({ success: false, error: 'Slot not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, slot.editionId)).get();
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
      const id = c.req.param('id');
      // Delete reservations first (cascade should handle but be explicit)
      db.delete(slotReservations).where(eq(slotReservations.slotId, id)).run();
      db.delete(bookableSlots).where(eq(bookableSlots.id, id)).run();
      return c.json({ success: true, data: { message: 'Slot deleted' } });
    } catch (error) {
      console.error('[reservations] Delete slot error:', error);
      return c.json({ success: false, error: 'Failed to delete slot' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /slots/:id/reserve — reserve a slot (auth required)
// ---------------------------------------------------------------------------
reservationRoutes.post('/slots/:id/reserve', authMiddleware, async (c) => {
  try {
    const slotId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    const slot = db.select().from(bookableSlots).where(eq(bookableSlots.id, slotId)).get();
    if (!slot) {
      return c.json({ success: false, error: 'Slot not found' }, 404);
    }

    if (!slot.isActive) {
      return c.json({ success: false, error: 'This slot is no longer available' }, 400);
    }

    // Check capacity
    if (slot.bookedCount >= slot.capacity) {
      return c.json({ success: false, error: 'This slot is fully booked' }, 400);
    }

    const id = crypto.randomUUID();
    const qrCode = `RES-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    db.insert(slotReservations)
      .values({
        id,
        slotId,
        userId: userId || null,
        guestName: body.guest_name || null,
        guestEmail: body.guest_email || null,
        status: 'confirmed',
        qrCode,
      })
      .run();

    // Increment booked_count
    db.update(bookableSlots)
      .set({ bookedCount: slot.bookedCount + 1 })
      .where(eq(bookableSlots.id, slotId))
      .run();

    const created = db.select().from(slotReservations).where(eq(slotReservations.id, id)).get();
    return c.json({ success: true, data: formatResponse(created!) }, 201);
  } catch (error) {
    console.error('[reservations] Reserve slot error:', error);
    return c.json({ success: false, error: 'Failed to reserve slot' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /reservations/:id — cancel own reservation (auth required)
// ---------------------------------------------------------------------------
reservationRoutes.delete('/reservations/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');

    const reservation = db
      .select()
      .from(slotReservations)
      .where(eq(slotReservations.id, id))
      .get();

    if (!reservation) {
      return c.json({ success: false, error: 'Reservation not found' }, 404);
    }

    // Only the owner can cancel
    if (reservation.userId !== userId) {
      return c.json({ success: false, error: 'You can only cancel your own reservations' }, 403);
    }

    // Decrement booked_count on the slot
    const slot = db.select().from(bookableSlots).where(eq(bookableSlots.id, reservation.slotId)).get();
    if (slot && slot.bookedCount > 0) {
      db.update(bookableSlots)
        .set({ bookedCount: slot.bookedCount - 1 })
        .where(eq(bookableSlots.id, reservation.slotId))
        .run();
    }

    db.delete(slotReservations).where(eq(slotReservations.id, id)).run();
    return c.json({ success: true, data: { message: 'Reservation cancelled' } });
  } catch (error) {
    console.error('[reservations] Cancel reservation error:', error);
    return c.json({ success: false, error: 'Failed to cancel reservation' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-reservations — list user's reservations across all editions (auth)
// ---------------------------------------------------------------------------
reservationRoutes.get('/my-reservations', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db
      .select({
        reservation: slotReservations,
        slot: bookableSlots,
      })
      .from(slotReservations)
      .leftJoin(bookableSlots, eq(slotReservations.slotId, bookableSlots.id))
      .where(eq(slotReservations.userId, userId))
      .all();

    const data = rows.map((row) => ({
      ...formatResponse(row.reservation),
      slot: row.slot ? formatResponse(row.slot) : null,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[reservations] My reservations error:', error);
    return c.json({ success: false, error: 'Failed to list reservations' }, 500);
  }
});

export { reservationRoutes };
