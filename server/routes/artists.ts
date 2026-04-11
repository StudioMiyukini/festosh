/**
 * Artist routes — artist/guest management for festival editions.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { artists, editions } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const artistRoutes = new Hono();

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

// ---------------------------------------------------------------------------
// GET /edition/:editionId/public — list public artists, sorted by sort_order
// ---------------------------------------------------------------------------
artistRoutes.get('/edition/:editionId/public', optionalAuth, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(artists)
      .where(and(eq(artists.editionId, editionId), eq(artists.isPublic, 1)))
      .all();

    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({
      success: true,
      data: rows.map((r) => formatResponse(r as Record<string, unknown>, ['socialLinks'])),
    });
  } catch (error) {
    console.error('[artists] List public artists error:', error);
    return c.json({ success: false, error: 'Failed to list artists' }, 500);
  }
});

// ===========================================================================
// ADMIN ROUTES — auth + festivalMember + owner/admin
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /edition/:editionId/all — list ALL artists with fees/payment info
// ---------------------------------------------------------------------------
artistRoutes.get(
  '/edition/:editionId/all',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const rows = db
        .select()
        .from(artists)
        .where(eq(artists.editionId, editionId))
        .all();

      rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      return c.json({
        success: true,
        data: rows.map((r) => formatResponse(r as Record<string, unknown>, ['socialLinks'])),
      });
    } catch (error) {
      console.error('[artists] List all artists error:', error);
      return c.json({ success: false, error: 'Failed to list artists' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /edition/:editionId — create artist
// ---------------------------------------------------------------------------
artistRoutes.post(
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

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(artists)
        .values({
          id,
          editionId,
          name: body.name,
          bio: body.bio || null,
          photoUrl: body.photo_url || null,
          website: body.website || null,
          socialLinks: body.social_links ? JSON.stringify(body.social_links) : null,
          category: body.category || null,
          role: body.role || null,
          feeCents: body.fee_cents ?? 0,
          isPaid: 0,
          travelInfo: body.travel_info || null,
          accommodation: body.accommodation || null,
          technicalRider: body.technical_rider || null,
          dietaryRequirements: body.dietary_requirements || null,
          arrivalDate: body.arrival_date || null,
          departureDate: body.departure_date || null,
          isPublic: body.is_public ?? 1,
          sortOrder: body.sort_order ?? 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const created = db.select().from(artists).where(eq(artists.id, id)).get();

      return c.json(
        { success: true, data: created ? formatResponse(created as Record<string, unknown>, ['socialLinks']) : null },
        201,
      );
    } catch (error) {
      console.error('[artists] Create artist error:', error);
      return c.json({ success: false, error: 'Failed to create artist' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id — update artist
// ---------------------------------------------------------------------------
artistRoutes.put(
  '/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const artist = db.select().from(artists).where(eq(artists.id, id)).get();
    if (!artist) {
      return c.json({ success: false, error: 'Artist not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, artist.editionId)).get();
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

      const updateData: Record<string, unknown> = { updatedAt: now };

      const keyMap: Record<string, string> = {
        name: 'name',
        bio: 'bio',
        photo_url: 'photoUrl',
        website: 'website',
        category: 'category',
        role: 'role',
        fee_cents: 'feeCents',
        travel_info: 'travelInfo',
        accommodation: 'accommodation',
        technical_rider: 'technicalRider',
        dietary_requirements: 'dietaryRequirements',
        arrival_date: 'arrivalDate',
        departure_date: 'departureDate',
        is_public: 'isPublic',
        sort_order: 'sortOrder',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      if (body.social_links !== undefined) {
        updateData.socialLinks = body.social_links ? JSON.stringify(body.social_links) : null;
      }

      db.update(artists).set(updateData).where(eq(artists.id, id)).run();

      const updated = db.select().from(artists).where(eq(artists.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>, ['socialLinks']) : null,
      });
    } catch (error) {
      console.error('[artists] Update artist error:', error);
      return c.json({ success: false, error: 'Failed to update artist' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — delete artist
// ---------------------------------------------------------------------------
artistRoutes.delete(
  '/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const artist = db.select().from(artists).where(eq(artists.id, id)).get();
    if (!artist) {
      return c.json({ success: false, error: 'Artist not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, artist.editionId)).get();
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

      db.delete(artists).where(eq(artists.id, id)).run();

      return c.json({ success: true, data: { message: 'Artist deleted' } });
    } catch (error) {
      console.error('[artists] Delete artist error:', error);
      return c.json({ success: false, error: 'Failed to delete artist' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id/payment — toggle is_paid
// ---------------------------------------------------------------------------
artistRoutes.put(
  '/:id/payment',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const artist = db.select().from(artists).where(eq(artists.id, id)).get();
    if (!artist) {
      return c.json({ success: false, error: 'Artist not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, artist.editionId)).get();
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
      const now = Math.floor(Date.now() / 1000);

      const artist = db.select().from(artists).where(eq(artists.id, id)).get();
      if (!artist) {
        return c.json({ success: false, error: 'Artist not found' }, 404);
      }

      const newIsPaid = artist.isPaid ? 0 : 1;

      db.update(artists)
        .set({ isPaid: newIsPaid, updatedAt: now })
        .where(eq(artists.id, id))
        .run();

      const updated = db.select().from(artists).where(eq(artists.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>, ['socialLinks']) : null,
      });
    } catch (error) {
      console.error('[artists] Toggle payment error:', error);
      return c.json({ success: false, error: 'Failed to toggle artist payment status' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/stats — artist statistics
// ---------------------------------------------------------------------------
artistRoutes.get(
  '/edition/:editionId/stats',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const allArtists = db
        .select()
        .from(artists)
        .where(eq(artists.editionId, editionId))
        .all();

      let totalFees = 0;
      let paidCount = 0;
      const byCategory: Record<string, { category: string; count: number }> = {};

      for (const a of allArtists) {
        totalFees += a.feeCents ?? 0;

        if (a.isPaid) {
          paidCount += 1;
        }

        const cat = a.category || 'Sans catégorie';
        if (!byCategory[cat]) {
          byCategory[cat] = { category: cat, count: 0 };
        }
        byCategory[cat].count += 1;
      }

      return c.json({
        success: true,
        data: {
          total_artists: allArtists.length,
          total_fees: totalFees,
          paid_count: paidCount,
          by_category: Object.values(byCategory),
        },
      });
    } catch (error) {
      console.error('[artists] Stats error:', error);
      return c.json({ success: false, error: 'Failed to compute artist stats' }, 500);
    }
  },
);

export { artistRoutes };
