/**
 * Analytics routes — comprehensive real-time dashboard analytics for editions.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tickets,
  sales,
  boothApplications,
  festivalMembers,
  orders,
  votes,
  raffleEntries,
  stamps,
  editions,
  sponsors,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const analyticsRoutes = new Hono();

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
// GET /edition/:editionId/dashboard — comprehensive real-time analytics
// ---------------------------------------------------------------------------
analyticsRoutes.get(
  '/edition/:editionId/dashboard',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      // Resolve festivalId for festival-scoped queries
      const edition = db.select().from(editions).where(eq(editions.id, editionId)).get();
      const festivalId = edition?.festivalId;

      // ── Attendance ──────────────────────────────────────────────────────
      const ticketsSold = db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(eq(tickets.editionId, editionId))
        .get();

      const ticketsScanned = db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(eq(tickets.editionId, editionId), sql`${tickets.scannedAt} IS NOT NULL`))
        .get();

      const totalSold = ticketsSold?.count ?? 0;
      const totalScanned = ticketsScanned?.count ?? 0;
      const scanRate = totalSold > 0 ? Math.round((totalScanned / totalSold) * 10000) / 100 : 0;

      // ── Revenue ─────────────────────────────────────────────────────────
      const ticketRevenue = db
        .select({ total: sql<number>`coalesce(sum(${tickets.amountPaidCents}), 0)` })
        .from(tickets)
        .where(eq(tickets.editionId, editionId))
        .get();

      const posRevenue = db
        .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
        .from(sales)
        .where(eq(sales.editionId, editionId))
        .get();

      const marketplaceRevenue = db
        .select({ total: sql<number>`coalesce(sum(${orders.totalCents}), 0)` })
        .from(orders)
        .where(eq(orders.editionId, editionId))
        .get();

      // Sponsor revenue: sponsors are festival-scoped
      let sponsorRevenue = 0;
      if (festivalId) {
        const sponsorTotal = db
          .select({ total: sql<number>`coalesce(sum(${sponsors.amountCents}), 0)` })
          .from(sponsors)
          .where(and(eq(sponsors.festivalId, festivalId), eq(sponsors.isPaid, 1)))
          .get();
        sponsorRevenue = sponsorTotal?.total ?? 0;
      }

      // ── Exhibitors ──────────────────────────────────────────────────────
      const exhibitorTotal = db
        .select({ count: sql<number>`count(*)` })
        .from(boothApplications)
        .where(eq(boothApplications.editionId, editionId))
        .get();

      const exhibitorsByStatus = db
        .select({
          status: boothApplications.status,
          count: sql<number>`count(*)`,
        })
        .from(boothApplications)
        .where(eq(boothApplications.editionId, editionId))
        .groupBy(boothApplications.status)
        .all();

      const byStatus: Record<string, number> = {};
      for (const row of exhibitorsByStatus) {
        byStatus[row.status] = row.count;
      }

      // ── Engagement ──────────────────────────────────────────────────────
      // Votes: votes are category-scoped, but categories are edition-scoped
      // We use a subquery approach
      const voteCount = db
        .select({ count: sql<number>`count(*)` })
        .from(votes)
        .where(
          sql`${votes.voteCategoryId} IN (
            SELECT id FROM vote_categories WHERE edition_id = ${editionId}
          )`,
        )
        .get();

      // Raffle entries: raffles are edition-scoped
      const raffleEntryCount = db
        .select({ count: sql<number>`count(*)` })
        .from(raffleEntries)
        .where(
          sql`${raffleEntries.raffleId} IN (
            SELECT id FROM raffles WHERE edition_id = ${editionId}
          )`,
        )
        .get();

      // Stamps collected: stamps → stamp_cards → edition
      const stampCount = db
        .select({ count: sql<number>`count(*)` })
        .from(stamps)
        .where(
          sql`${stamps.stampCardId} IN (
            SELECT id FROM stamp_cards WHERE edition_id = ${editionId}
          )`,
        )
        .get();

      // ── Marketplace ─────────────────────────────────────────────────────
      const marketplaceOrders = db
        .select({
          count: sql<number>`count(*)`,
          gmv: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
        })
        .from(orders)
        .where(eq(orders.editionId, editionId))
        .get();

      return c.json({
        success: true,
        data: {
          attendance: {
            tickets_sold: totalSold,
            tickets_scanned: totalScanned,
            scan_rate: scanRate,
          },
          revenue: {
            ticket_revenue: ticketRevenue?.total ?? 0,
            pos_sales_revenue: posRevenue?.total ?? 0,
            marketplace_revenue: marketplaceRevenue?.total ?? 0,
            sponsor_revenue: sponsorRevenue,
          },
          exhibitors: {
            total: exhibitorTotal?.count ?? 0,
            by_status: byStatus,
          },
          engagement: {
            votes_cast: voteCount?.count ?? 0,
            raffle_entries: raffleEntryCount?.count ?? 0,
            stamps_collected: stampCount?.count ?? 0,
          },
          marketplace: {
            orders_count: marketplaceOrders?.count ?? 0,
            total_gmv: marketplaceOrders?.gmv ?? 0,
          },
        },
      });
    } catch (error) {
      console.error('[analytics] Dashboard error:', error);
      return c.json({ success: false, error: 'Failed to compute analytics' }, 500);
    }
  },
);

export { analyticsRoutes };
