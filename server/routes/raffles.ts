/**
 * Raffle (tombola) routes — raffles, prizes, entries, and drawing.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { raffles, rafflePrizes, raffleEntries, profiles } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const raffleRoutes = new Hono();

/**
 * Generate a random entry code in the format RF-XXXX (4 uppercase letters).
 */
function generateEntryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = 'RF-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------------------------------------------------------------------
// GET /edition/:editionId/raffles — list raffles (public)
// ---------------------------------------------------------------------------
raffleRoutes.get('/edition/:editionId/raffles', optionalAuth, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(raffles)
      .where(eq(raffles.editionId, editionId))
      .orderBy(desc(raffles.createdAt))
      .all();

    // Include prize count for each raffle
    const data = rows.map((r) => {
      const formatted = formatResponse(r) as Record<string, unknown>;
      const prizeCount = db
        .select({ count: sql<number>`count(*)` })
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, r.id))
        .get();
      formatted.prize_count = prizeCount?.count ?? 0;
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[raffles] List raffles error:', error);
    return c.json({ success: false, error: 'Failed to list raffles' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/raffles — create raffle (admin)
// ---------------------------------------------------------------------------
raffleRoutes.post(
  '/edition/:editionId/raffles',
  authMiddleware,
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

      db.insert(raffles).values({
        id,
        editionId,
        name: body.name,
        description: body.description || null,
        drawDate: body.draw_date || null,
        isDrawn: 0,
        isActive: 1,
        createdAt: now,
      }).run();

      const created = db.select().from(raffles).where(eq(raffles.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[raffles] Create raffle error:', error);
      return c.json({ success: false, error: 'Failed to create raffle' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /raffles/:id — update raffle (admin)
// ---------------------------------------------------------------------------
raffleRoutes.put(
  '/raffles/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const existing = db.select().from(raffles).where(eq(raffles.id, id)).get();
      if (!existing) {
        return c.json({ success: false, error: 'Raffle not found' }, 404);
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.draw_date !== undefined) updateData.drawDate = body.draw_date;
      if (body.is_active !== undefined) updateData.isActive = body.is_active;

      db.update(raffles).set(updateData).where(eq(raffles.id, id)).run();
      const updated = db.select().from(raffles).where(eq(raffles.id, id)).get();
      return c.json({ success: true, data: formatResponse(updated!) });
    } catch (error) {
      console.error('[raffles] Update raffle error:', error);
      return c.json({ success: false, error: 'Failed to update raffle' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /raffles/:id/prizes — add prize to raffle (admin)
// ---------------------------------------------------------------------------
raffleRoutes.post(
  '/raffles/:id/prizes',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const raffleId = c.req.param('id');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Prize name is required' }, 400);
      }

      const raffle = db.select().from(raffles).where(eq(raffles.id, raffleId)).get();
      if (!raffle) {
        return c.json({ success: false, error: 'Raffle not found' }, 404);
      }

      // Determine next sort order
      const lastPrize = db
        .select({ maxOrder: sql<number>`coalesce(max(${rafflePrizes.sortOrder}), -1)` })
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, raffleId))
        .get();

      const id = crypto.randomUUID();

      db.insert(rafflePrizes).values({
        id,
        raffleId,
        name: body.name,
        description: body.description || null,
        imageUrl: body.image_url || null,
        sponsor: body.sponsor || null,
        sortOrder: (lastPrize?.maxOrder ?? -1) + 1,
        winnerId: null,
        winnerName: null,
      }).run();

      const created = db.select().from(rafflePrizes).where(eq(rafflePrizes.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[raffles] Add prize error:', error);
      return c.json({ success: false, error: 'Failed to add prize' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /raffles/:id/enter — enter raffle (auth required)
// ---------------------------------------------------------------------------
raffleRoutes.post('/raffles/:id/enter', authMiddleware, async (c) => {
  try {
    const raffleId = c.req.param('id');
    const userId = c.get('userId');

    // Check raffle exists and is active
    const raffle = db.select().from(raffles).where(eq(raffles.id, raffleId)).get();
    if (!raffle) {
      return c.json({ success: false, error: 'Raffle not found' }, 404);
    }
    if (raffle.isDrawn) {
      return c.json({ success: false, error: 'This raffle has already been drawn' }, 400);
    }

    // Check not already entered
    const existing = db
      .select()
      .from(raffleEntries)
      .where(
        and(
          eq(raffleEntries.raffleId, raffleId),
          eq(raffleEntries.userId, userId),
        ),
      )
      .get();

    if (existing) {
      return c.json({ success: false, error: 'You have already entered this raffle', data: { entry_code: existing.entryCode } }, 409);
    }

    // Generate unique entry code
    let entryCode: string;
    let attempts = 0;
    do {
      entryCode = generateEntryCode();
      const codeExists = db
        .select()
        .from(raffleEntries)
        .where(eq(raffleEntries.entryCode, entryCode))
        .get();
      if (!codeExists) break;
      attempts++;
    } while (attempts < 10);

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(raffleEntries).values({
      id,
      raffleId,
      userId,
      guestName: null,
      guestEmail: null,
      entryCode,
      createdAt: now,
    }).run();

    const created = db.select().from(raffleEntries).where(eq(raffleEntries.id, id)).get();
    return c.json({ success: true, data: formatResponse(created!) }, 201);
  } catch (error) {
    console.error('[raffles] Enter raffle error:', error);
    return c.json({ success: false, error: 'Failed to enter raffle' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /raffles/:id/draw — draw winners (admin)
// ---------------------------------------------------------------------------
raffleRoutes.post(
  '/raffles/:id/draw',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const raffleId = c.req.param('id');

      const raffle = db.select().from(raffles).where(eq(raffles.id, raffleId)).get();
      if (!raffle) {
        return c.json({ success: false, error: 'Raffle not found' }, 404);
      }
      if (raffle.isDrawn) {
        return c.json({ success: false, error: 'This raffle has already been drawn' }, 400);
      }

      // Get all entries
      const entries = db
        .select()
        .from(raffleEntries)
        .where(eq(raffleEntries.raffleId, raffleId))
        .all();

      if (entries.length === 0) {
        return c.json({ success: false, error: 'No entries for this raffle' }, 400);
      }

      // Get prizes without a winner
      const prizes = db
        .select()
        .from(rafflePrizes)
        .where(and(eq(rafflePrizes.raffleId, raffleId), sql`${rafflePrizes.winnerId} IS NULL`))
        .orderBy(rafflePrizes.sortOrder)
        .all();

      if (prizes.length === 0) {
        return c.json({ success: false, error: 'No prizes to draw' }, 400);
      }

      // Shuffle entries for randomness
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      const usedEntryIndices = new Set<number>();

      for (const prize of prizes) {
        // Pick a random entry that hasn't won yet
        let winnerEntry = null;
        for (let i = 0; i < shuffled.length; i++) {
          if (!usedEntryIndices.has(i)) {
            winnerEntry = shuffled[i];
            usedEntryIndices.add(i);
            break;
          }
        }

        if (!winnerEntry) break; // No more entries available

        // Resolve winner name
        let winnerName = winnerEntry.guestName || null;
        if (winnerEntry.userId) {
          const profile = db.select().from(profiles).where(eq(profiles.id, winnerEntry.userId)).get();
          if (profile) {
            winnerName = profile.displayName || profile.username;
          }
        }

        db.update(rafflePrizes)
          .set({ winnerId: winnerEntry.userId, winnerName })
          .where(eq(rafflePrizes.id, prize.id))
          .run();
      }

      // Mark raffle as drawn
      db.update(raffles).set({ isDrawn: 1 }).where(eq(raffles.id, raffleId)).run();

      // Return updated prizes
      const updatedPrizes = db
        .select()
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, raffleId))
        .orderBy(rafflePrizes.sortOrder)
        .all();

      return c.json({
        success: true,
        data: {
          raffle: formatResponse(
            db.select().from(raffles).where(eq(raffles.id, raffleId)).get()!,
          ),
          prizes: updatedPrizes.map((p) => formatResponse(p)),
        },
      });
    } catch (error) {
      console.error('[raffles] Draw error:', error);
      return c.json({ success: false, error: 'Failed to draw raffle' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /raffles/:id/results — get raffle results (public)
// ---------------------------------------------------------------------------
raffleRoutes.get('/raffles/:id/results', optionalAuth, async (c) => {
  try {
    const raffleId = c.req.param('id');

    const raffle = db.select().from(raffles).where(eq(raffles.id, raffleId)).get();
    if (!raffle) {
      return c.json({ success: false, error: 'Raffle not found' }, 404);
    }

    const prizes = db
      .select()
      .from(rafflePrizes)
      .where(eq(rafflePrizes.raffleId, raffleId))
      .orderBy(rafflePrizes.sortOrder)
      .all();

    const enrichedPrizes = prizes.map((p) => {
      const formatted = formatResponse(p) as Record<string, unknown>;
      // Include winner profile info if available
      if (p.winnerId) {
        const winner = db.select().from(profiles).where(eq(profiles.id, p.winnerId)).get();
        if (winner) {
          formatted.winner_display_name = winner.displayName || winner.username;
          formatted.winner_avatar_url = winner.avatarUrl || null;
        }
      }
      return formatted;
    });

    return c.json({
      success: true,
      data: {
        raffle: formatResponse(raffle),
        prizes: enrichedPrizes,
      },
    });
  } catch (error) {
    console.error('[raffles] Get results error:', error);
    return c.json({ success: false, error: 'Failed to get raffle results' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-entries — list current user's raffle entries
// ---------------------------------------------------------------------------
raffleRoutes.get('/my-entries', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db
      .select()
      .from(raffleEntries)
      .where(eq(raffleEntries.userId, userId))
      .orderBy(desc(raffleEntries.createdAt))
      .all();

    const enriched = rows.map((entry) => {
      const formatted = formatResponse(entry) as Record<string, unknown>;

      // Include raffle name and draw status
      const raffle = db.select().from(raffles).where(eq(raffles.id, entry.raffleId)).get();
      if (raffle) {
        formatted.raffle_name = raffle.name;
        formatted.is_drawn = raffle.isDrawn;
      }

      // Check if this entry won any prize
      if (entry.userId) {
        const wonPrize = db
          .select()
          .from(rafflePrizes)
          .where(
            and(
              eq(rafflePrizes.raffleId, entry.raffleId),
              eq(rafflePrizes.winnerId, entry.userId),
            ),
          )
          .get();

        if (wonPrize) {
          formatted.won = true;
          formatted.prize_name = wonPrize.name;
        } else {
          formatted.won = false;
          formatted.prize_name = null;
        }
      }

      return formatted;
    });

    return c.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[raffles] My entries error:', error);
    return c.json({ success: false, error: 'Failed to list your raffle entries' }, 500);
  }
});

export { raffleRoutes };
