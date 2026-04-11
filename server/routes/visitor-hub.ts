/**
 * Visitor hub — history, reviews, favorites, XP/coins, ticket history.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  profiles,
  festivals,
  editions,
  tickets,
  exhibitorProfiles,
  boothApplications,
  festivalVisits,
  festivalReviews,
  exhibitorFavorites,
  xpLogs,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';
import { sqlite } from '../db/index.js';

const visitorHubRoutes = new Hono();
visitorHubRoutes.use('*', authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// XP SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const XP_RULES: Record<string, { xp: number; coins: number; label: string }> = {
  ticket_purchase: { xp: 50, coins: 10, label: 'Achat de billet' },
  festival_visit: { xp: 100, coins: 20, label: 'Visite d\'un festival' },
  review_submitted: { xp: 75, coins: 15, label: 'Avis depose' },
  stamp_collected: { xp: 10, coins: 2, label: 'Tampon collecte' },
  badge_earned: { xp: 50, coins: 10, label: 'Badge obtenu' },
  hunt_checkpoint: { xp: 15, coins: 3, label: 'Point de chasse trouve' },
  hunt_completed: { xp: 100, coins: 25, label: 'Chasse au tresor terminee' },
  reservation_made: { xp: 20, coins: 5, label: 'Reservation effectuee' },
  vote_cast: { xp: 10, coins: 2, label: 'Vote exprime' },
  raffle_entry: { xp: 5, coins: 1, label: 'Participation tombola' },
  purchase_made: { xp: 30, coins: 5, label: 'Achat effectue' },
  favorite_added: { xp: 5, coins: 1, label: 'Exposant favori ajoute' },
};

const LEVELS = [
  { level: 1, name: 'Debutant', minXp: 0 },
  { level: 2, name: 'Curieux', minXp: 100 },
  { level: 3, name: 'Explorateur', minXp: 300 },
  { level: 4, name: 'Aventurier', minXp: 600 },
  { level: 5, name: 'Expert', minXp: 1000 },
  { level: 6, name: 'Veterant', minXp: 1500 },
  { level: 7, name: 'Champion', minXp: 2500 },
  { level: 8, name: 'Legendaire', minXp: 4000 },
  { level: 9, name: 'Mythique', minXp: 6000 },
  { level: 10, name: 'Divin', minXp: 10000 },
];

function computeLevel(xp: number): { level: number; name: string; nextLevelXp: number | null; progress: number } {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  const progress = next ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100) : 100;
  return { level: current.level, name: current.name, nextLevelXp: next?.minXp ?? null, progress };
}

function awardXp(userId: string, action: string, refType?: string, refId?: string): { xp: number; coins: number } | null {
  const rule = XP_RULES[action];
  if (!rule) return null;

  // Atomic transaction to prevent race conditions on XP/coins
  sqlite.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    db.insert(xpLogs).values({
      id: crypto.randomUUID(), userId, action,
      xpEarned: rule.xp, coinsEarned: rule.coins,
      description: rule.label, referenceType: refType || null, referenceId: refId || null,
      createdAt: now,
    }).run();

    const user = db.select({ xp: profiles.xp, coins: profiles.coins }).from(profiles).where(eq(profiles.id, userId)).get();
    if (user) {
      const newXp = (user.xp ?? 0) + rule.xp;
      const newCoins = (user.coins ?? 0) + rule.coins;
      const lvl = computeLevel(newXp);
      db.update(profiles).set({ xp: newXp, coins: newCoins, xpLevel: lvl.level }).where(eq(profiles.id, userId)).run();
    }
  })();

  return { xp: rule.xp, coins: rule.coins };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /me — visitor profile with XP, level, coins
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.get('/me', async (c) => {
  try {
    const userId = c.get('userId');
    const user = db.select({ xp: profiles.xp, coins: profiles.coins, xpLevel: profiles.xpLevel }).from(profiles).where(eq(profiles.id, userId)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    const lvl = computeLevel(user.xp ?? 0);
    const totalVisits = db.select({ count: sql<number>`count(*)` }).from(festivalVisits).where(eq(festivalVisits.userId, userId)).get();
    const totalReviews = db.select({ count: sql<number>`count(*)` }).from(festivalReviews).where(eq(festivalReviews.userId, userId)).get();
    const totalFavorites = db.select({ count: sql<number>`count(*)` }).from(exhibitorFavorites).where(eq(exhibitorFavorites.userId, userId)).get();

    return c.json({
      success: true,
      data: {
        xp: user.xp, coins: user.coins,
        level: lvl.level, level_name: lvl.name,
        next_level_xp: lvl.nextLevelXp, progress: lvl.progress,
        levels: LEVELS,
        stats: {
          festivals_visited: totalVisits?.count ?? 0,
          reviews_given: totalReviews?.count ?? 0,
          exhibitors_followed: totalFavorites?.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('[visitor-hub] Me error:', error);
    return c.json({ success: false, error: 'Failed to get visitor profile' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// XP LOG
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.get('/xp-history', async (c) => {
  try {
    const userId = c.get('userId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);

    const logs = db.select().from(xpLogs).where(eq(xpLogs.userId, userId)).orderBy(desc(xpLogs.createdAt)).limit(limit).all();

    return c.json({ success: true, data: logs.map((l) => formatResponse(l)) });
  } catch (error) {
    console.error('[visitor-hub] XP history error:', error);
    return c.json({ success: false, error: 'Failed to get XP history' }, 500);
  }
});

// Expose XP rules for display
visitorHubRoutes.get('/xp-rules', async (c) => {
  return c.json({
    success: true,
    data: Object.entries(XP_RULES).map(([action, rule]) => ({
      action, xp: rule.xp, coins: rule.coins, label: rule.label,
    })),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FESTIVAL HISTORY
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.get('/my-festivals', async (c) => {
  try {
    const userId = c.get('userId');

    const visits = db
      .select({
        id: festivalVisits.id,
        festivalId: festivalVisits.festivalId,
        editionId: festivalVisits.editionId,
        visitedAt: festivalVisits.visitedAt,
        festivalName: festivals.name,
        festivalSlug: festivals.slug,
        festivalCity: festivals.city,
        festivalLogoUrl: festivals.logoUrl,
        editionName: editions.name,
      })
      .from(festivalVisits)
      .leftJoin(festivals, eq(festivals.id, festivalVisits.festivalId))
      .leftJoin(editions, eq(editions.id, festivalVisits.editionId))
      .where(eq(festivalVisits.userId, userId))
      .orderBy(desc(festivalVisits.visitedAt))
      .all();

    // Check which have reviews
    const reviewedEditions = new Set(
      db.select({ editionId: festivalReviews.editionId }).from(festivalReviews).where(eq(festivalReviews.userId, userId)).all().map((r) => r.editionId),
    );

    return c.json({
      success: true,
      data: visits.map((v) => ({
        id: v.id,
        festival_id: v.festivalId, edition_id: v.editionId,
        visited_at: v.visitedAt,
        festival_name: v.festivalName, festival_slug: v.festivalSlug,
        festival_city: v.festivalCity, festival_logo_url: v.festivalLogoUrl,
        edition_name: v.editionName,
        has_review: reviewedEditions.has(v.editionId),
      })),
    });
  } catch (error) {
    console.error('[visitor-hub] My festivals error:', error);
    return c.json({ success: false, error: 'Failed to get festival history' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TICKET HISTORY
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.get('/my-tickets', async (c) => {
  try {
    const userId = c.get('userId');
    const user = db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, userId)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    const myTickets = db
      .select()
      .from(tickets)
      .where(eq(tickets.buyerEmail, user.email))
      .orderBy(desc(tickets.createdAt))
      .all();

    // Enrich with edition/festival info
    const editionIds = [...new Set(myTickets.map((t) => t.editionId))];
    const editionsMap = new Map<string, { festivalName: string; editionName: string }>();
    if (editionIds.length > 0) {
      const eds = db
        .select({ id: editions.id, name: editions.name, festivalId: editions.festivalId, festivalName: festivals.name })
        .from(editions)
        .leftJoin(festivals, eq(festivals.id, editions.festivalId))
        .where(inArray(editions.id, editionIds))
        .all();
      for (const e of eds) {
        editionsMap.set(e.id, { festivalName: e.festivalName ?? '', editionName: e.name ?? '' });
      }
    }

    return c.json({
      success: true,
      data: myTickets.map((t) => {
        const info = editionsMap.get(t.editionId) || { festivalName: '', editionName: '' };
        return {
          ...formatResponse(t),
          festival_name: info.festivalName,
          edition_name: info.editionName,
        };
      }),
    });
  } catch (error) {
    console.error('[visitor-hub] My tickets error:', error);
    return c.json({ success: false, error: 'Failed to get ticket history' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REVIEWS (satisfaction form)
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.post('/reviews', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.festival_id || !body.overall_rating) {
      return c.json({ success: false, error: 'festival_id and overall_rating required' }, 400);
    }

    if (body.overall_rating < 1 || body.overall_rating > 5) {
      return c.json({ success: false, error: 'Ratings must be between 1 and 5' }, 400);
    }

    // Check not already reviewed
    const existing = db.select().from(festivalReviews)
      .where(and(eq(festivalReviews.userId, userId), eq(festivalReviews.editionId, body.edition_id || body.festival_id)))
      .get();
    if (existing) {
      return c.json({ success: false, error: 'Vous avez deja donne votre avis pour cette edition' }, 409);
    }

    const id = crypto.randomUUID();
    db.insert(festivalReviews).values({
      id, userId,
      festivalId: body.festival_id,
      editionId: body.edition_id || null,
      overallRating: body.overall_rating,
      organisationRating: body.organisation_rating || null,
      programmeRating: body.programme_rating || null,
      standsRating: body.stands_rating || null,
      ambianceRating: body.ambiance_rating || null,
      foodRating: body.food_rating || null,
      accessibilityRating: body.accessibility_rating || null,
      valueRating: body.value_rating || null,
      npsScore: body.nps_score ?? null,
      wouldReturn: body.would_return ?? 1,
      comment: body.comment || null,
      suggestions: body.suggestions || null,
    }).run();

    // Award XP
    awardXp(userId, 'review_submitted', 'festival_review', id);

    return c.json({ success: true, data: { id, message: 'Merci pour votre avis !' } }, 201);
  } catch (error) {
    console.error('[visitor-hub] Submit review error:', error);
    return c.json({ success: false, error: 'Failed to submit review' }, 500);
  }
});

visitorHubRoutes.get('/my-reviews', async (c) => {
  try {
    const userId = c.get('userId');

    const reviews = db
      .select({
        id: festivalReviews.id,
        festivalId: festivalReviews.festivalId,
        editionId: festivalReviews.editionId,
        overallRating: festivalReviews.overallRating,
        npsScore: festivalReviews.npsScore,
        comment: festivalReviews.comment,
        createdAt: festivalReviews.createdAt,
        festivalName: festivals.name,
        festivalSlug: festivals.slug,
      })
      .from(festivalReviews)
      .leftJoin(festivals, eq(festivals.id, festivalReviews.festivalId))
      .where(eq(festivalReviews.userId, userId))
      .orderBy(desc(festivalReviews.createdAt))
      .all();

    return c.json({
      success: true,
      data: reviews.map((r) => ({
        id: r.id, festival_id: r.festivalId, edition_id: r.editionId,
        overall_rating: r.overallRating, nps_score: r.npsScore,
        comment: r.comment, created_at: r.createdAt,
        festival_name: r.festivalName, festival_slug: r.festivalSlug,
      })),
    });
  } catch (error) {
    console.error('[visitor-hub] My reviews error:', error);
    return c.json({ success: false, error: 'Failed to get reviews' }, 500);
  }
});

// Admin: get reviews for a festival
visitorHubRoutes.get('/festival/:festivalId/reviews', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const reviews = db.select().from(festivalReviews).where(eq(festivalReviews.festivalId, festivalId)).orderBy(desc(festivalReviews.createdAt)).all();

    // Aggregate stats
    const count = reviews.length;
    const avgOverall = count > 0 ? reviews.reduce((s, r) => s + r.overallRating, 0) / count : 0;
    const avgNps = reviews.filter((r) => r.npsScore != null).length > 0
      ? reviews.filter((r) => r.npsScore != null).reduce((s, r) => s + (r.npsScore ?? 0), 0) / reviews.filter((r) => r.npsScore != null).length
      : null;
    const wouldReturnPct = count > 0
      ? Math.round((reviews.filter((r) => r.wouldReturn).length / count) * 100)
      : 0;

    const ratingFields = ['organisationRating', 'programmeRating', 'standsRating', 'ambianceRating', 'foodRating', 'accessibilityRating', 'valueRating'] as const;
    const avgByCategory: Record<string, number | null> = {};
    for (const field of ratingFields) {
      const rated = reviews.filter((r) => r[field] != null);
      avgByCategory[field.replace('Rating', '')] = rated.length > 0 ? Math.round((rated.reduce((s, r) => s + (r[field] ?? 0), 0) / rated.length) * 10) / 10 : null;
    }

    return c.json({
      success: true,
      data: {
        count,
        avg_overall: Math.round(avgOverall * 10) / 10,
        avg_nps: avgNps != null ? Math.round(avgNps * 10) / 10 : null,
        would_return_percent: wouldReturnPct,
        avg_by_category: avgByCategory,
        reviews: reviews.map((r) => formatResponse(r)),
      },
    });
  } catch (error) {
    console.error('[visitor-hub] Festival reviews error:', error);
    return c.json({ success: false, error: 'Failed to get festival reviews' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXHIBITOR FAVORITES
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.get('/favorites', async (c) => {
  try {
    const userId = c.get('userId');

    const favs = db
      .select({
        id: exhibitorFavorites.id,
        exhibitorId: exhibitorFavorites.exhibitorId,
        createdAt: exhibitorFavorites.createdAt,
        companyName: exhibitorProfiles.companyName,
        logoUrl: exhibitorProfiles.logoUrl,
        activityType: exhibitorProfiles.activityType,
        city: exhibitorProfiles.city,
        category: exhibitorProfiles.category,
        userId: exhibitorProfiles.userId,
      })
      .from(exhibitorFavorites)
      .leftJoin(exhibitorProfiles, eq(exhibitorProfiles.id, exhibitorFavorites.exhibitorId))
      .where(eq(exhibitorFavorites.userId, userId))
      .orderBy(desc(exhibitorFavorites.createdAt))
      .all();

    // For each favorite, find upcoming festivals where this exhibitor has an approved application
    const result = [];
    for (const fav of favs) {
      const upcomingApps = db
        .select({
          festivalName: festivals.name,
          festivalSlug: festivals.slug,
          editionName: editions.name,
          editionId: editions.id,
        })
        .from(boothApplications)
        .leftJoin(editions, eq(editions.id, boothApplications.editionId))
        .leftJoin(festivals, eq(festivals.id, editions.festivalId))
        .where(
          and(
            eq(boothApplications.exhibitorId, fav.exhibitorId),
            eq(boothApplications.status, 'approved'),
          ),
        )
        .all();

      result.push({
        id: fav.id,
        exhibitor_id: fav.exhibitorId,
        company_name: fav.companyName,
        logo_url: fav.logoUrl,
        activity_type: fav.activityType,
        city: fav.city,
        category: fav.category,
        user_id: fav.userId,
        created_at: fav.createdAt,
        upcoming_festivals: upcomingApps.map((a) => ({
          festival_name: a.festivalName,
          festival_slug: a.festivalSlug,
          edition_name: a.editionName,
        })),
      });
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[visitor-hub] Favorites error:', error);
    return c.json({ success: false, error: 'Failed to get favorites' }, 500);
  }
});

visitorHubRoutes.post('/favorites/:exhibitorId', async (c) => {
  try {
    const userId = c.get('userId');
    const exhibitorId = c.req.param('exhibitorId');

    const exhibitor = db.select({ id: exhibitorProfiles.id }).from(exhibitorProfiles).where(eq(exhibitorProfiles.id, exhibitorId)).get();
    if (!exhibitor) return c.json({ success: false, error: 'Exhibitor not found' }, 404);

    const existing = db.select().from(exhibitorFavorites).where(and(eq(exhibitorFavorites.userId, userId), eq(exhibitorFavorites.exhibitorId, exhibitorId))).get();
    if (existing) return c.json({ success: true, data: { message: 'Deja en favoris' } });

    db.insert(exhibitorFavorites).values({ id: crypto.randomUUID(), userId, exhibitorId }).run();
    awardXp(userId, 'favorite_added', 'exhibitor', exhibitorId);

    return c.json({ success: true, data: { message: 'Ajoute aux favoris' } }, 201);
  } catch (error) {
    console.error('[visitor-hub] Add favorite error:', error);
    return c.json({ success: false, error: 'Failed to add favorite' }, 500);
  }
});

visitorHubRoutes.delete('/favorites/:exhibitorId', async (c) => {
  try {
    const userId = c.get('userId');
    const exhibitorId = c.req.param('exhibitorId');

    db.delete(exhibitorFavorites).where(and(eq(exhibitorFavorites.userId, userId), eq(exhibitorFavorites.exhibitorId, exhibitorId))).run();

    return c.json({ success: true, data: { message: 'Retire des favoris' } });
  } catch (error) {
    console.error('[visitor-hub] Remove favorite error:', error);
    return c.json({ success: false, error: 'Failed to remove favorite' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL XP AWARD (for hooks from other modules)
// ═══════════════════════════════════════════════════════════════════════════

visitorHubRoutes.post('/award-xp', requireRole(['admin']), async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, action, reference_type, reference_id } = body;

    if (!user_id || !action) return c.json({ success: false, error: 'user_id and action required' }, 400);

    const result = awardXp(user_id, action, reference_type, reference_id);
    if (!result) return c.json({ success: false, error: 'Unknown action' }, 400);

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[visitor-hub] Award XP error:', error);
    return c.json({ success: false, error: 'Failed to award XP' }, 500);
  }
});

export { visitorHubRoutes };
