/**
 * Sponsor routes — tiers and sponsors management for festival sponsorships.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { sponsorTiers, sponsors, festivals } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const sponsorRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/public — list active sponsors with tier info (public)
// ---------------------------------------------------------------------------
sponsorRoutes.get('/festival/:festivalId/public', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db
      .select({
        sponsor: sponsors,
        tier: sponsorTiers,
      })
      .from(sponsors)
      .leftJoin(sponsorTiers, eq(sponsors.tierId, sponsorTiers.id))
      .where(and(eq(sponsors.festivalId, festivalId), eq(sponsors.isActive, 1)))
      .all();

    // Sort by tier level (asc) then sponsor sort_order (asc)
    rows.sort((a, b) => {
      const levelA = a.tier?.level ?? 999;
      const levelB = b.tier?.level ?? 999;
      if (levelA !== levelB) return levelA - levelB;
      return (a.sponsor.sortOrder ?? 0) - (b.sponsor.sortOrder ?? 0);
    });

    const data = rows.map((row) => ({
      ...formatResponse(row.sponsor as Record<string, unknown>),
      tier: row.tier ? formatResponse(row.tier as Record<string, unknown>, ['benefits']) : null,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[sponsors] List public sponsors error:', error);
    return c.json({ success: false, error: 'Failed to list sponsors' }, 500);
  }
});

// ===========================================================================
// ADMIN ROUTES — auth + festivalMember + owner/admin
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/tiers — list tiers
// ---------------------------------------------------------------------------
sponsorRoutes.get(
  '/festival/:festivalId/tiers',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const tiers = db
        .select()
        .from(sponsorTiers)
        .where(eq(sponsorTiers.festivalId, festivalId))
        .all();

      tiers.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

      return c.json({
        success: true,
        data: tiers.map((t) => formatResponse(t as Record<string, unknown>, ['benefits'])),
      });
    } catch (error) {
      console.error('[sponsors] List tiers error:', error);
      return c.json({ success: false, error: 'Failed to list sponsor tiers' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/tiers — create tier
// ---------------------------------------------------------------------------
sponsorRoutes.post(
  '/festival/:festivalId/tiers',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, level, price_cents, benefits, color, max_sponsors } = body;

      if (!name) {
        return c.json({ success: false, error: 'Name is required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(sponsorTiers)
        .values({
          id,
          festivalId,
          name,
          level: level ?? 0,
          priceCents: price_cents ?? 0,
          benefits: benefits ? JSON.stringify(benefits) : null,
          color: color || '#f59e0b',
          maxSponsors: max_sponsors ?? null,
          sortOrder: level ?? 0,
        })
        .run();

      const tier = db.select().from(sponsorTiers).where(eq(sponsorTiers.id, id)).get();

      return c.json(
        { success: true, data: tier ? formatResponse(tier as Record<string, unknown>, ['benefits']) : null },
        201,
      );
    } catch (error) {
      console.error('[sponsors] Create tier error:', error);
      return c.json({ success: false, error: 'Failed to create sponsor tier' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /tiers/:id — update tier
// ---------------------------------------------------------------------------
sponsorRoutes.put(
  '/tiers/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const tier = db.select().from(sponsorTiers).where(eq(sponsorTiers.id, id)).get();
      if (!tier) {
        return c.json({ success: false, error: 'Sponsor tier not found' }, 404);
      }

      const updateData: Record<string, unknown> = {};

      const keyMap: Record<string, string> = {
        name: 'name',
        level: 'level',
        price_cents: 'priceCents',
        color: 'color',
        max_sponsors: 'maxSponsors',
        sort_order: 'sortOrder',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      // Handle benefits JSON field
      if (body.benefits !== undefined) {
        updateData.benefits = body.benefits ? JSON.stringify(body.benefits) : null;
      }

      db.update(sponsorTiers).set(updateData).where(eq(sponsorTiers.id, id)).run();

      const updated = db.select().from(sponsorTiers).where(eq(sponsorTiers.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>, ['benefits']) : null,
      });
    } catch (error) {
      console.error('[sponsors] Update tier error:', error);
      return c.json({ success: false, error: 'Failed to update sponsor tier' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /tiers/:id — delete tier
// ---------------------------------------------------------------------------
sponsorRoutes.delete(
  '/tiers/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');

      const tier = db.select().from(sponsorTiers).where(eq(sponsorTiers.id, id)).get();
      if (!tier) {
        return c.json({ success: false, error: 'Sponsor tier not found' }, 404);
      }

      db.delete(sponsorTiers).where(eq(sponsorTiers.id, id)).run();

      return c.json({ success: true, data: { message: 'Sponsor tier deleted' } });
    } catch (error) {
      console.error('[sponsors] Delete tier error:', error);
      return c.json({ success: false, error: 'Failed to delete sponsor tier' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/sponsors — list all sponsors with tier info
// ---------------------------------------------------------------------------
sponsorRoutes.get(
  '/festival/:festivalId/sponsors',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const rows = db
        .select({
          sponsor: sponsors,
          tier: sponsorTiers,
        })
        .from(sponsors)
        .leftJoin(sponsorTiers, eq(sponsors.tierId, sponsorTiers.id))
        .where(eq(sponsors.festivalId, festivalId))
        .all();

      rows.sort((a, b) => {
        const levelA = a.tier?.level ?? 999;
        const levelB = b.tier?.level ?? 999;
        if (levelA !== levelB) return levelA - levelB;
        return (a.sponsor.sortOrder ?? 0) - (b.sponsor.sortOrder ?? 0);
      });

      const data = rows.map((row) => ({
        ...formatResponse(row.sponsor as Record<string, unknown>),
        tier: row.tier ? formatResponse(row.tier as Record<string, unknown>, ['benefits']) : null,
      }));

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[sponsors] List sponsors error:', error);
      return c.json({ success: false, error: 'Failed to list sponsors' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/sponsors — create sponsor
// ---------------------------------------------------------------------------
sponsorRoutes.post(
  '/festival/:festivalId/sponsors',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const {
        tier_id,
        company_name,
        logo_url,
        website,
        description,
        contact_name,
        contact_email,
        contact_phone,
        amount_cents,
        contract_url,
      } = body;

      if (!company_name) {
        return c.json({ success: false, error: 'company_name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(sponsors)
        .values({
          id,
          festivalId,
          tierId: tier_id || null,
          companyName: company_name,
          logoUrl: logo_url || null,
          website: website || null,
          description: description || null,
          contactName: contact_name || null,
          contactEmail: contact_email || null,
          contactPhone: contact_phone || null,
          amountCents: amount_cents ?? 0,
          isPaid: 0,
          contractUrl: contract_url || null,
          isActive: 1,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const sponsor = db.select().from(sponsors).where(eq(sponsors.id, id)).get();

      return c.json(
        { success: true, data: sponsor ? formatResponse(sponsor as Record<string, unknown>) : null },
        201,
      );
    } catch (error) {
      console.error('[sponsors] Create sponsor error:', error);
      return c.json({ success: false, error: 'Failed to create sponsor' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /sponsors/:id — update sponsor
// ---------------------------------------------------------------------------
sponsorRoutes.put(
  '/sponsors/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      const sponsor = db.select().from(sponsors).where(eq(sponsors.id, id)).get();
      if (!sponsor) {
        return c.json({ success: false, error: 'Sponsor not found' }, 404);
      }

      const updateData: Record<string, unknown> = { updatedAt: now };

      const keyMap: Record<string, string> = {
        tier_id: 'tierId',
        company_name: 'companyName',
        logo_url: 'logoUrl',
        website: 'website',
        description: 'description',
        contact_name: 'contactName',
        contact_email: 'contactEmail',
        contact_phone: 'contactPhone',
        amount_cents: 'amountCents',
        contract_url: 'contractUrl',
        is_active: 'isActive',
        sort_order: 'sortOrder',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      db.update(sponsors).set(updateData).where(eq(sponsors.id, id)).run();

      const updated = db.select().from(sponsors).where(eq(sponsors.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[sponsors] Update sponsor error:', error);
      return c.json({ success: false, error: 'Failed to update sponsor' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /sponsors/:id/payment — toggle is_paid
// ---------------------------------------------------------------------------
sponsorRoutes.put(
  '/sponsors/:id/payment',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const now = Math.floor(Date.now() / 1000);

      const sponsor = db.select().from(sponsors).where(eq(sponsors.id, id)).get();
      if (!sponsor) {
        return c.json({ success: false, error: 'Sponsor not found' }, 404);
      }

      const newIsPaid = sponsor.isPaid ? 0 : 1;

      db.update(sponsors)
        .set({ isPaid: newIsPaid, updatedAt: now })
        .where(eq(sponsors.id, id))
        .run();

      const updated = db.select().from(sponsors).where(eq(sponsors.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>) : null,
      });
    } catch (error) {
      console.error('[sponsors] Toggle payment error:', error);
      return c.json({ success: false, error: 'Failed to toggle sponsor payment status' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /sponsors/:id — delete sponsor
// ---------------------------------------------------------------------------
sponsorRoutes.delete(
  '/sponsors/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');

      const sponsor = db.select().from(sponsors).where(eq(sponsors.id, id)).get();
      if (!sponsor) {
        return c.json({ success: false, error: 'Sponsor not found' }, 404);
      }

      db.delete(sponsors).where(eq(sponsors.id, id)).run();

      return c.json({ success: true, data: { message: 'Sponsor deleted' } });
    } catch (error) {
      console.error('[sponsors] Delete sponsor error:', error);
      return c.json({ success: false, error: 'Failed to delete sponsor' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/stats — sponsor statistics
// ---------------------------------------------------------------------------
sponsorRoutes.get(
  '/festival/:festivalId/stats',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const allSponsors = db
        .select()
        .from(sponsors)
        .where(eq(sponsors.festivalId, festivalId))
        .all();

      const tiers = db
        .select()
        .from(sponsorTiers)
        .where(eq(sponsorTiers.festivalId, festivalId))
        .all();

      const tierMap = new Map(tiers.map((t) => [t.id, t]));

      let totalRevenue = 0;
      let paidCount = 0;
      const byTier: Record<string, { tier_name: string; count: number; revenue: number }> = {};

      for (const s of allSponsors) {
        const amount = s.amountCents ?? 0;
        totalRevenue += amount;

        if (s.isPaid) {
          paidCount += 1;
        }

        const tierId = s.tierId || 'no_tier';
        const tier = s.tierId ? tierMap.get(s.tierId) : null;
        const tierName = tier?.name || 'Sans catégorie';

        if (!byTier[tierId]) {
          byTier[tierId] = { tier_name: tierName, count: 0, revenue: 0 };
        }
        byTier[tierId].count += 1;
        byTier[tierId].revenue += amount;
      }

      return c.json({
        success: true,
        data: {
          total_sponsors: allSponsors.length,
          total_revenue: totalRevenue,
          paid_count: paidCount,
          by_tier: Object.values(byTier),
        },
      });
    } catch (error) {
      console.error('[sponsors] Stats error:', error);
      return c.json({ success: false, error: 'Failed to compute sponsor stats' }, 500);
    }
  },
);

export { sponsorRoutes };
