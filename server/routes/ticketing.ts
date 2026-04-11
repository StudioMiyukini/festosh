/**
 * Ticketing routes — ticket types CRUD, purchase, scanning, and stats.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { ticketTypes, tickets, editions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const ticketingRoutes = new Hono();

function formatTicketType(t: typeof ticketTypes.$inferSelect) {
  return formatResponse(t);
}

function formatTicket(t: typeof tickets.$inferSelect) {
  return formatResponse(t);
}

/**
 * Generate an order reference: TK-YYYYMMDD-XXXX
 */
function generateOrderRef(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 hex chars
  return `TK-${y}${m}${d}-${rand}`;
}

/**
 * Helper: resolve the festivalId from an editionId so that
 * festivalMemberMiddleware (which reads `festivalId` from params) can work.
 * We set it on the request params dynamically.
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
  c.set('resolvedFestivalId', edition.festivalId);
  // Patch the param so festivalMemberMiddleware finds it via c.req.param('festivalId')
  c.req.addValidatedData('param', { ...c.req.param(), festivalId: edition.festivalId });
  await next();
}

// ═══════════════════════════════════════════════════════════════════════════
// TICKET TYPES (admin)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/types — list ticket types for an edition
// ---------------------------------------------------------------------------
ticketingRoutes.get('/edition/:editionId/types', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.editionId, editionId))
      .all();

    // Sort by sort_order then name
    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({ success: true, data: rows.map(formatTicketType) });
  } catch (error) {
    console.error('[ticketing] List types error:', error);
    return c.json({ success: false, error: 'Failed to list ticket types' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/types — create ticket type
// ---------------------------------------------------------------------------
ticketingRoutes.post(
  '/edition/:editionId/types',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Ticket type name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(ticketTypes)
        .values({
          id,
          editionId,
          name: body.name,
          description: body.description || null,
          priceCents: body.price_cents ?? 0,
          quantityTotal: body.quantity_total ?? 0,
          quantitySold: 0,
          maxPerOrder: body.max_per_order ?? 10,
          saleStart: body.sale_start ?? null,
          saleEnd: body.sale_end ?? null,
          validFrom: body.valid_from ?? null,
          validUntil: body.valid_until ?? null,
          isActive: 1,
          color: body.color || '#6366f1',
          sortOrder: body.sort_order ?? 0,
          createdAt: now,
        })
        .run();

      const created = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
      return c.json({ success: true, data: formatTicketType(created!) }, 201);
    } catch (error) {
      console.error('[ticketing] Create type error:', error);
      return c.json({ success: false, error: 'Failed to create ticket type' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /types/:id — update ticket type
// ---------------------------------------------------------------------------
ticketingRoutes.put(
  '/types/:id',
  authMiddleware,
  async (c, next) => {
    // Resolve edition → festival from the ticket type
    const id = c.req.param('id');
    const tt = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
    if (!tt) {
      return c.json({ success: false, error: 'Ticket type not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, tt.editionId)).get();
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
      const now = Math.floor(Date.now() / 1000);

      const existing = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
      if (!existing) {
        return c.json({ success: false, error: 'Ticket type not found' }, 404);
      }

      const updateData: Record<string, unknown> = {};

      const keyMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        price_cents: 'priceCents',
        quantity_total: 'quantityTotal',
        max_per_order: 'maxPerOrder',
        sale_start: 'saleStart',
        sale_end: 'saleEnd',
        valid_from: 'validFrom',
        valid_until: 'validUntil',
        is_active: 'isActive',
        color: 'color',
        sort_order: 'sortOrder',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      db.update(ticketTypes).set(updateData).where(eq(ticketTypes.id, id)).run();
      const updated = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
      return c.json({ success: true, data: formatTicketType(updated!) });
    } catch (error) {
      console.error('[ticketing] Update type error:', error);
      return c.json({ success: false, error: 'Failed to update ticket type' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /types/:id — delete ticket type
// ---------------------------------------------------------------------------
ticketingRoutes.delete(
  '/types/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const tt = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
    if (!tt) {
      return c.json({ success: false, error: 'Ticket type not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, tt.editionId)).get();
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

      const existing = db.select().from(ticketTypes).where(eq(ticketTypes.id, id)).get();
      if (!existing) {
        return c.json({ success: false, error: 'Ticket type not found' }, 404);
      }

      // Check if tickets exist for this type
      const existingTickets = db
        .select()
        .from(tickets)
        .where(eq(tickets.ticketTypeId, id))
        .all();

      if (existingTickets.length > 0) {
        return c.json(
          { success: false, error: 'Cannot delete ticket type with existing tickets' },
          400,
        );
      }

      db.delete(ticketTypes).where(eq(ticketTypes.id, id)).run();
      return c.json({ success: true, data: { message: 'Ticket type deleted' } });
    } catch (error) {
      console.error('[ticketing] Delete type error:', error);
      return c.json({ success: false, error: 'Failed to delete ticket type' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TICKET PURCHASE (public with auth)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /edition/:editionId/purchase — buy tickets
// ---------------------------------------------------------------------------
ticketingRoutes.post('/edition/:editionId/purchase', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const body = await c.req.json();
    const { ticket_type_id, quantity, buyer_email, buyer_name, buyer_phone, payment_method } = body;

    // Validate required fields
    if (!ticket_type_id) {
      return c.json({ success: false, error: 'ticket_type_id is required' }, 400);
    }
    if (!quantity || quantity < 1) {
      return c.json({ success: false, error: 'quantity must be at least 1' }, 400);
    }
    if (!buyer_email) {
      return c.json({ success: false, error: 'buyer_email is required' }, 400);
    }

    // Fetch ticket type
    const ticketType = db
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.id, ticket_type_id), eq(ticketTypes.editionId, editionId)))
      .get();

    if (!ticketType) {
      return c.json({ success: false, error: 'Ticket type not found for this edition' }, 404);
    }

    // Check if ticket type is active
    if (!ticketType.isActive) {
      return c.json({ success: false, error: 'This ticket type is not currently available' }, 400);
    }

    // Check sale window
    const now = Math.floor(Date.now() / 1000);
    if (ticketType.saleStart && now < ticketType.saleStart) {
      return c.json({ success: false, error: 'Ticket sales have not started yet' }, 400);
    }
    if (ticketType.saleEnd && now > ticketType.saleEnd) {
      return c.json({ success: false, error: 'Ticket sales have ended' }, 400);
    }

    // Check max per order
    if (ticketType.maxPerOrder && quantity > ticketType.maxPerOrder) {
      return c.json(
        { success: false, error: `Maximum ${ticketType.maxPerOrder} tickets per order` },
        400,
      );
    }

    // Check availability
    const available = ticketType.quantityTotal - ticketType.quantitySold;
    if (available < quantity) {
      return c.json(
        { success: false, error: `Only ${available} tickets remaining` },
        400,
      );
    }

    // Generate order reference
    const orderRef = generateOrderRef();
    const amountPerTicket = ticketType.priceCents;

    // Create individual tickets with QR codes
    const createdTickets: Record<string, unknown>[] = [];

    for (let i = 0; i < quantity; i++) {
      const id = crypto.randomUUID();
      const qrCode = crypto.randomUUID();

      db.insert(tickets)
        .values({
          id,
          ticketTypeId: ticket_type_id,
          editionId,
          buyerEmail: buyer_email,
          buyerName: buyer_name || null,
          buyerPhone: buyer_phone || null,
          qrCode,
          status: 'valid',
          orderRef,
          amountPaidCents: amountPerTicket,
          paymentMethod: payment_method || null,
          createdAt: now,
        })
        .run();

      const ticket = db.select().from(tickets).where(eq(tickets.id, id)).get();
      createdTickets.push(formatTicket(ticket!));
    }

    // Increment quantity_sold on the ticket type
    db.update(ticketTypes)
      .set({ quantitySold: ticketType.quantitySold + quantity })
      .where(eq(ticketTypes.id, ticket_type_id))
      .run();

    return c.json({
      success: true,
      data: {
        order_ref: orderRef,
        quantity,
        total_cents: amountPerTicket * quantity,
        tickets: createdTickets,
      },
    }, 201);
  } catch (error) {
    console.error('[ticketing] Purchase error:', error);
    return c.json({ success: false, error: 'Failed to purchase tickets' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TICKET SCANNING (admin)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /scan — scan a QR code
// ---------------------------------------------------------------------------
ticketingRoutes.post('/scan', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { qr_code } = body;

    if (!qr_code) {
      return c.json({ success: false, error: 'qr_code is required' }, 400);
    }

    // Find ticket by QR code
    const ticket = db
      .select()
      .from(tickets)
      .where(eq(tickets.qrCode, qr_code))
      .get();

    if (!ticket) {
      return c.json({ success: false, error: 'Ticket not found' }, 404);
    }

    // Validate ticket status
    if (ticket.status !== 'valid') {
      return c.json(
        {
          success: false,
          error: `Ticket is not valid (current status: ${ticket.status})`,
          data: formatTicket(ticket),
        },
        400,
      );
    }

    // Update ticket: mark as used
    const now = Math.floor(Date.now() / 1000);
    db.update(tickets)
      .set({
        status: 'used',
        scannedAt: now,
        scannedBy: userId,
      })
      .where(eq(tickets.id, ticket.id))
      .run();

    const updated = db.select().from(tickets).where(eq(tickets.id, ticket.id)).get();

    // Enrich with ticket type info
    const ticketType = db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.id, ticket.ticketTypeId))
      .get();

    const result = formatTicket(updated!) as Record<string, unknown>;
    if (ticketType) {
      result.ticket_type_name = ticketType.name;
      result.ticket_type_color = ticketType.color;
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[ticketing] Scan error:', error);
    return c.json({ success: false, error: 'Failed to scan ticket' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/stats — ticketing statistics
// ---------------------------------------------------------------------------
ticketingRoutes.get('/edition/:editionId/stats', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    // Get all ticket types for this edition
    const types = db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.editionId, editionId))
      .all();

    // Get all tickets for this edition
    const allTickets = db
      .select()
      .from(tickets)
      .where(eq(tickets.editionId, editionId))
      .all();

    const totalSold = allTickets.length;
    const totalRevenue = allTickets.reduce((sum, t) => sum + (t.amountPaidCents ?? 0), 0);
    const scannedCount = allTickets.filter((t) => t.scannedAt !== null).length;
    const scanRatePercent = totalSold > 0 ? Math.round((scannedCount / totalSold) * 100) : 0;

    // Stats per ticket type
    const byType = types.map((tt) => {
      const typeTickets = allTickets.filter((t) => t.ticketTypeId === tt.id);
      const typeRevenue = typeTickets.reduce((sum, t) => sum + (t.amountPaidCents ?? 0), 0);
      return {
        name: tt.name,
        sold: tt.quantitySold,
        total: tt.quantityTotal,
        revenue: typeRevenue,
      };
    });

    return c.json({
      success: true,
      data: {
        total_sold: totalSold,
        total_revenue: totalRevenue,
        by_type: byType,
        scanned_count: scannedCount,
        scan_rate_percent: scanRatePercent,
      },
    });
  } catch (error) {
    console.error('[ticketing] Stats error:', error);
    return c.json({ success: false, error: 'Failed to get ticketing stats' }, 500);
  }
});

export { ticketingRoutes };
