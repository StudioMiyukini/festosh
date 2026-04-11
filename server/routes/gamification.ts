/**
 * Gamification routes — stamp cards, stamps, badges, and treasure hunts.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  stampCards,
  stamps,
  badges,
  userBadges,
  treasureHunts,
  treasureHuntCheckpoints,
  treasureHuntProgress,
  editions,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const gamificationRoutes = new Hono();

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

// ═══════════════════════════════════════════════════════════════════════════
// STAMP CARDS (admin)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/stamp-cards — list stamp cards
// ---------------------------------------------------------------------------
gamificationRoutes.get(
  '/edition/:editionId/stamp-cards',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const rows = db
        .select()
        .from(stampCards)
        .where(eq(stampCards.editionId, editionId))
        .all();

      return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
    } catch (error) {
      console.error('[gamification] List stamp cards error:', error);
      return c.json({ success: false, error: 'Failed to list stamp cards' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /edition/:editionId/stamp-cards — create stamp card
// ---------------------------------------------------------------------------
gamificationRoutes.post(
  '/edition/:editionId/stamp-cards',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Stamp card name is required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(stampCards)
        .values({
          id,
          editionId,
          name: body.name,
          description: body.description || null,
          requiredStamps: body.required_stamps ?? 5,
          rewardDescription: body.reward_description || null,
          isActive: 1,
        })
        .run();

      const created = db.select().from(stampCards).where(eq(stampCards.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[gamification] Create stamp card error:', error);
      return c.json({ success: false, error: 'Failed to create stamp card' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// STAMPS (public scan + user view)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /stamps/scan — scan a booth QR to collect a stamp (auth)
// ---------------------------------------------------------------------------
gamificationRoutes.post('/stamps/scan', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.stamp_card_id || !body.booth_code) {
      return c.json({ success: false, error: 'stamp_card_id and booth_code are required' }, 400);
    }

    // Verify stamp card exists and is active
    const card = db
      .select()
      .from(stampCards)
      .where(eq(stampCards.id, body.stamp_card_id))
      .get();

    if (!card) {
      return c.json({ success: false, error: 'Stamp card not found' }, 404);
    }
    if (!card.isActive) {
      return c.json({ success: false, error: 'This stamp card is no longer active' }, 400);
    }

    // Check if user already scanned this booth for this card
    const existing = db
      .select()
      .from(stamps)
      .where(
        and(
          eq(stamps.stampCardId, body.stamp_card_id),
          eq(stamps.userId, userId),
          eq(stamps.boothCode, body.booth_code),
        ),
      )
      .get();

    if (existing) {
      return c.json({ success: false, error: 'You already scanned this booth for this card' }, 400);
    }

    const id = crypto.randomUUID();

    db.insert(stamps)
      .values({
        id,
        stampCardId: body.stamp_card_id,
        userId,
        exhibitorId: body.exhibitor_id || null,
        boothCode: body.booth_code,
      })
      .run();

    // Count stamps for this card
    const userStamps = db
      .select()
      .from(stamps)
      .where(
        and(eq(stamps.stampCardId, body.stamp_card_id), eq(stamps.userId, userId)),
      )
      .all();

    const stampCount = userStamps.length;
    const isComplete = stampCount >= card.requiredStamps;

    return c.json({
      success: true,
      data: {
        stamp: formatResponse(
          db.select().from(stamps).where(eq(stamps.id, id)).get()!,
        ),
        stamp_count: stampCount,
        required_stamps: card.requiredStamps,
        is_complete: isComplete,
      },
    }, 201);
  } catch (error) {
    console.error('[gamification] Scan stamp error:', error);
    return c.json({ success: false, error: 'Failed to scan stamp' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-stamps/:stampCardId — get user's stamps for a card (auth)
// ---------------------------------------------------------------------------
gamificationRoutes.get('/my-stamps/:stampCardId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const stampCardId = c.req.param('stampCardId');

    const card = db.select().from(stampCards).where(eq(stampCards.id, stampCardId)).get();
    if (!card) {
      return c.json({ success: false, error: 'Stamp card not found' }, 404);
    }

    const userStamps = db
      .select()
      .from(stamps)
      .where(
        and(eq(stamps.stampCardId, stampCardId), eq(stamps.userId, userId)),
      )
      .all();

    return c.json({
      success: true,
      data: {
        card: formatResponse(card),
        stamps: userStamps.map((s) => formatResponse(s)),
        stamp_count: userStamps.length,
        required_stamps: card.requiredStamps,
        is_complete: userStamps.length >= card.requiredStamps,
      },
    });
  } catch (error) {
    console.error('[gamification] My stamps error:', error);
    return c.json({ success: false, error: 'Failed to get stamps' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BADGES (admin + user)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/badges — list badges for an edition (admin)
// ---------------------------------------------------------------------------
gamificationRoutes.get(
  '/edition/:editionId/badges',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const rows = db
        .select()
        .from(badges)
        .where(eq(badges.editionId, editionId))
        .all();

      return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
    } catch (error) {
      console.error('[gamification] List badges error:', error);
      return c.json({ success: false, error: 'Failed to list badges' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /edition/:editionId/badges — create badge (admin)
// ---------------------------------------------------------------------------
gamificationRoutes.post(
  '/edition/:editionId/badges',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.name || !body.condition_type) {
        return c.json({ success: false, error: 'Badge name and condition_type are required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(badges)
        .values({
          id,
          editionId,
          name: body.name,
          description: body.description || null,
          icon: body.icon || null,
          color: body.color || '#f59e0b',
          conditionType: body.condition_type,
          conditionValue: body.condition_value ?? 1,
        })
        .run();

      const created = db.select().from(badges).where(eq(badges.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[gamification] Create badge error:', error);
      return c.json({ success: false, error: 'Failed to create badge' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /my-badges — list user's earned badges (auth)
// ---------------------------------------------------------------------------
gamificationRoutes.get('/my-badges', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db
      .select({
        userBadge: userBadges,
        badge: badges,
      })
      .from(userBadges)
      .leftJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .all();

    const data = rows.map((row) => ({
      ...formatResponse(row.userBadge),
      badge: row.badge ? formatResponse(row.badge) : null,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[gamification] My badges error:', error);
    return c.json({ success: false, error: 'Failed to list badges' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TREASURE HUNTS (admin + user)
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /edition/:editionId/hunts — list treasure hunts (admin)
// ---------------------------------------------------------------------------
gamificationRoutes.get(
  '/edition/:editionId/hunts',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const rows = db
        .select()
        .from(treasureHunts)
        .where(eq(treasureHunts.editionId, editionId))
        .all();

      // Enrich with checkpoint count
      const data = rows.map((hunt) => {
        const checkpoints = db
          .select()
          .from(treasureHuntCheckpoints)
          .where(eq(treasureHuntCheckpoints.huntId, hunt.id))
          .all();

        return {
          ...formatResponse(hunt),
          checkpoints: checkpoints.map((cp) => formatResponse(cp)),
          checkpoint_count: checkpoints.length,
        };
      });

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[gamification] List hunts error:', error);
      return c.json({ success: false, error: 'Failed to list treasure hunts' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /edition/:editionId/hunts — create treasure hunt (admin)
// ---------------------------------------------------------------------------
gamificationRoutes.post(
  '/edition/:editionId/hunts',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Treasure hunt name is required' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(treasureHunts)
        .values({
          id,
          editionId,
          name: body.name,
          description: body.description || null,
          rewardDescription: body.reward_description || null,
          totalCheckpoints: 0,
          isActive: 1,
        })
        .run();

      const created = db.select().from(treasureHunts).where(eq(treasureHunts.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[gamification] Create hunt error:', error);
      return c.json({ success: false, error: 'Failed to create treasure hunt' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /hunts/:id/checkpoints — add checkpoint to a hunt (admin)
// ---------------------------------------------------------------------------
gamificationRoutes.post(
  '/hunts/:id/checkpoints',
  authMiddleware,
  async (c, next) => {
    // Resolve festivalId from the hunt's edition
    const huntId = c.req.param('id');
    const hunt = db.select().from(treasureHunts).where(eq(treasureHunts.id, huntId)).get();
    if (!hunt) {
      return c.json({ success: false, error: 'Treasure hunt not found' }, 404);
    }
    const edition = db.select().from(editions).where(eq(editions.id, hunt.editionId)).get();
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
      const huntId = c.req.param('id');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Checkpoint name is required' }, 400);
      }

      const id = crypto.randomUUID();
      const qrCode = `HUNT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      // Get current checkpoint count for sort order
      const existing = db
        .select()
        .from(treasureHuntCheckpoints)
        .where(eq(treasureHuntCheckpoints.huntId, huntId))
        .all();

      db.insert(treasureHuntCheckpoints)
        .values({
          id,
          huntId,
          name: body.name,
          hint: body.hint || null,
          qrCode,
          sortOrder: existing.length,
        })
        .run();

      // Update total_checkpoints on the hunt
      db.update(treasureHunts)
        .set({ totalCheckpoints: existing.length + 1 })
        .where(eq(treasureHunts.id, huntId))
        .run();

      const created = db
        .select()
        .from(treasureHuntCheckpoints)
        .where(eq(treasureHuntCheckpoints.id, id))
        .get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[gamification] Add checkpoint error:', error);
      return c.json({ success: false, error: 'Failed to add checkpoint' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /hunts/scan — scan a checkpoint QR (auth)
// ---------------------------------------------------------------------------
gamificationRoutes.post('/hunts/scan', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.qr_code) {
      return c.json({ success: false, error: 'qr_code is required' }, 400);
    }

    // Find the checkpoint by QR code
    const checkpoint = db
      .select()
      .from(treasureHuntCheckpoints)
      .where(eq(treasureHuntCheckpoints.qrCode, body.qr_code))
      .get();

    if (!checkpoint) {
      return c.json({ success: false, error: 'Invalid QR code' }, 404);
    }

    // Check if already found
    const alreadyFound = db
      .select()
      .from(treasureHuntProgress)
      .where(
        and(
          eq(treasureHuntProgress.huntId, checkpoint.huntId),
          eq(treasureHuntProgress.userId, userId),
          eq(treasureHuntProgress.checkpointId, checkpoint.id),
        ),
      )
      .get();

    if (alreadyFound) {
      return c.json({ success: false, error: 'You already found this checkpoint' }, 400);
    }

    const id = crypto.randomUUID();

    db.insert(treasureHuntProgress)
      .values({
        id,
        huntId: checkpoint.huntId,
        userId,
        checkpointId: checkpoint.id,
      })
      .run();

    // Count user progress
    const userProgress = db
      .select()
      .from(treasureHuntProgress)
      .where(
        and(
          eq(treasureHuntProgress.huntId, checkpoint.huntId),
          eq(treasureHuntProgress.userId, userId),
        ),
      )
      .all();

    // Get total checkpoints
    const hunt = db.select().from(treasureHunts).where(eq(treasureHunts.id, checkpoint.huntId)).get();

    return c.json({
      success: true,
      data: {
        checkpoint: formatResponse(checkpoint),
        found: userProgress.length,
        total: hunt?.totalCheckpoints ?? 0,
        is_complete: hunt ? userProgress.length >= hunt.totalCheckpoints : false,
      },
    }, 201);
  } catch (error) {
    console.error('[gamification] Scan checkpoint error:', error);
    return c.json({ success: false, error: 'Failed to scan checkpoint' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-hunts/:huntId — get user's progress for a hunt (auth)
// ---------------------------------------------------------------------------
gamificationRoutes.get('/my-hunts/:huntId', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const huntId = c.req.param('huntId');

    const hunt = db.select().from(treasureHunts).where(eq(treasureHunts.id, huntId)).get();
    if (!hunt) {
      return c.json({ success: false, error: 'Treasure hunt not found' }, 404);
    }

    // Get all checkpoints
    const checkpoints = db
      .select()
      .from(treasureHuntCheckpoints)
      .where(eq(treasureHuntCheckpoints.huntId, huntId))
      .all();

    // Get user progress
    const progress = db
      .select()
      .from(treasureHuntProgress)
      .where(
        and(
          eq(treasureHuntProgress.huntId, huntId),
          eq(treasureHuntProgress.userId, userId),
        ),
      )
      .all();

    const foundCheckpointIds = new Set(progress.map((p) => p.checkpointId));

    const checkpointData = checkpoints.map((cp) => ({
      ...formatResponse(cp),
      found: foundCheckpointIds.has(cp.id),
      found_at: progress.find((p) => p.checkpointId === cp.id)?.foundAt ?? null,
    }));

    return c.json({
      success: true,
      data: {
        hunt: formatResponse(hunt),
        checkpoints: checkpointData,
        found: progress.length,
        total: hunt.totalCheckpoints,
        is_complete: progress.length >= hunt.totalCheckpoints,
      },
    });
  } catch (error) {
    console.error('[gamification] My hunt progress error:', error);
    return c.json({ success: false, error: 'Failed to get hunt progress' }, 500);
  }
});

export { gamificationRoutes };
