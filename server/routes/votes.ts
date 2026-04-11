/**
 * Vote routes — vote categories, casting votes, and viewing results.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { voteCategories, votes, exhibitorProfiles } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const voteRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /edition/:editionId/categories — list vote categories (public)
// ---------------------------------------------------------------------------
voteRoutes.get('/edition/:editionId/categories', optionalAuth, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(voteCategories)
      .where(eq(voteCategories.editionId, editionId))
      .orderBy(desc(voteCategories.createdAt))
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[votes] List categories error:', error);
    return c.json({ success: false, error: 'Failed to list vote categories' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/categories — create category (admin)
// ---------------------------------------------------------------------------
voteRoutes.post(
  '/edition/:editionId/categories',
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

      db.insert(voteCategories).values({
        id,
        editionId,
        name: body.name,
        description: body.description || null,
        votingStart: body.voting_start || null,
        votingEnd: body.voting_end || null,
        maxVotesPerUser: body.max_votes_per_user ?? 1,
        isActive: 1,
        createdAt: now,
      }).run();

      const created = db.select().from(voteCategories).where(eq(voteCategories.id, id)).get();
      return c.json({ success: true, data: formatResponse(created!) }, 201);
    } catch (error) {
      console.error('[votes] Create category error:', error);
      return c.json({ success: false, error: 'Failed to create vote category' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /categories/:id — update category (admin)
// ---------------------------------------------------------------------------
voteRoutes.put(
  '/categories/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const existing = db.select().from(voteCategories).where(eq(voteCategories.id, id)).get();
      if (!existing) {
        return c.json({ success: false, error: 'Vote category not found' }, 404);
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.voting_start !== undefined) updateData.votingStart = body.voting_start;
      if (body.voting_end !== undefined) updateData.votingEnd = body.voting_end;
      if (body.max_votes_per_user !== undefined) updateData.maxVotesPerUser = body.max_votes_per_user;
      if (body.is_active !== undefined) updateData.isActive = body.is_active;

      db.update(voteCategories).set(updateData).where(eq(voteCategories.id, id)).run();
      const updated = db.select().from(voteCategories).where(eq(voteCategories.id, id)).get();
      return c.json({ success: true, data: formatResponse(updated!) });
    } catch (error) {
      console.error('[votes] Update category error:', error);
      return c.json({ success: false, error: 'Failed to update vote category' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /categories/:id — delete category (admin)
// ---------------------------------------------------------------------------
voteRoutes.delete(
  '/categories/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');

      const existing = db.select().from(voteCategories).where(eq(voteCategories.id, id)).get();
      if (!existing) {
        return c.json({ success: false, error: 'Vote category not found' }, 404);
      }

      // Delete votes first, then category
      db.delete(votes).where(eq(votes.voteCategoryId, id)).run();
      db.delete(voteCategories).where(eq(voteCategories.id, id)).run();

      return c.json({ success: true, data: { message: 'Vote category deleted' } });
    } catch (error) {
      console.error('[votes] Delete category error:', error);
      return c.json({ success: false, error: 'Failed to delete vote category' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /categories/:id/vote — cast a vote (auth required)
// ---------------------------------------------------------------------------
voteRoutes.post('/categories/:id/vote', authMiddleware, async (c) => {
  try {
    const categoryId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();

    // Validate input
    if (!body.target_type || !body.target_id) {
      return c.json({ success: false, error: 'target_type and target_id are required' }, 400);
    }
    if (!['exhibitor', 'product'].includes(body.target_type)) {
      return c.json({ success: false, error: 'target_type must be "exhibitor" or "product"' }, 400);
    }
    const rating = body.rating;
    if (rating === undefined || rating < 1 || rating > 5) {
      return c.json({ success: false, error: 'Rating must be between 1 and 5' }, 400);
    }

    // Check category exists
    const category = db.select().from(voteCategories).where(eq(voteCategories.id, categoryId)).get();
    if (!category) {
      return c.json({ success: false, error: 'Vote category not found' }, 404);
    }

    // Check voting window
    const now = Math.floor(Date.now() / 1000);
    if (category.votingStart && now < category.votingStart) {
      return c.json({ success: false, error: 'Voting has not started yet' }, 400);
    }
    if (category.votingEnd && now > category.votingEnd) {
      return c.json({ success: false, error: 'Voting has ended' }, 400);
    }

    // Check for duplicate vote (same user + category + target)
    const duplicate = db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.voteCategoryId, categoryId),
          eq(votes.userId, userId),
          eq(votes.targetType, body.target_type),
          eq(votes.targetId, body.target_id),
        ),
      )
      .get();

    if (duplicate) {
      return c.json({ success: false, error: 'You have already voted for this target in this category' }, 409);
    }

    // Check max votes per user in this category
    const userVotesCount = db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(
        and(
          eq(votes.voteCategoryId, categoryId),
          eq(votes.userId, userId),
        ),
      )
      .get();

    const maxVotes = category.maxVotesPerUser ?? 1;
    if (userVotesCount && userVotesCount.count >= maxVotes) {
      return c.json({ success: false, error: `Maximum ${maxVotes} vote(s) allowed in this category` }, 400);
    }

    // Cast the vote
    const id = crypto.randomUUID();
    db.insert(votes).values({
      id,
      voteCategoryId: categoryId,
      userId,
      targetType: body.target_type,
      targetId: body.target_id,
      rating,
      comment: body.comment || null,
      createdAt: now,
    }).run();

    const created = db.select().from(votes).where(eq(votes.id, id)).get();
    return c.json({ success: true, data: formatResponse(created!) }, 201);
  } catch (error) {
    console.error('[votes] Cast vote error:', error);
    return c.json({ success: false, error: 'Failed to cast vote' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /categories/:id/results — get aggregated results
// ---------------------------------------------------------------------------
voteRoutes.get('/categories/:id/results', optionalAuth, async (c) => {
  try {
    const categoryId = c.req.param('id');

    const category = db.select().from(voteCategories).where(eq(voteCategories.id, categoryId)).get();
    if (!category) {
      return c.json({ success: false, error: 'Vote category not found' }, 404);
    }

    // Aggregate by target_id: avg rating, vote count
    const results = db
      .select({
        targetType: votes.targetType,
        targetId: votes.targetId,
        avgRating: sql<number>`avg(${votes.rating})`,
        voteCount: sql<number>`count(*)`,
      })
      .from(votes)
      .where(eq(votes.voteCategoryId, categoryId))
      .groupBy(votes.targetType, votes.targetId)
      .orderBy(sql`avg(${votes.rating}) desc`)
      .all();

    // Enrich with target name
    const enriched = results.map((r) => {
      const entry: Record<string, unknown> = {
        target_type: r.targetType,
        target_id: r.targetId,
        avg_rating: Math.round(r.avgRating * 100) / 100,
        vote_count: r.voteCount,
        target_name: null,
      };

      if (r.targetType === 'exhibitor') {
        const exhibitor = db
          .select()
          .from(exhibitorProfiles)
          .where(eq(exhibitorProfiles.id, r.targetId))
          .get();
        if (exhibitor) {
          entry.target_name = exhibitor.companyName || exhibitor.tradeName || null;
        }
      }

      return entry;
    });

    return c.json({
      success: true,
      data: {
        category: formatResponse(category),
        results: enriched,
      },
    });
  } catch (error) {
    console.error('[votes] Get results error:', error);
    return c.json({ success: false, error: 'Failed to get vote results' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-votes — list current user's votes across all categories
// ---------------------------------------------------------------------------
voteRoutes.get('/my-votes', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db
      .select()
      .from(votes)
      .where(eq(votes.userId, userId))
      .orderBy(desc(votes.createdAt))
      .all();

    // Enrich with category name
    const enriched = rows.map((v) => {
      const formatted = formatResponse(v) as Record<string, unknown>;
      const cat = db.select().from(voteCategories).where(eq(voteCategories.id, v.voteCategoryId)).get();
      if (cat) {
        formatted.category_name = cat.name;
      }
      return formatted;
    });

    return c.json({ success: true, data: enriched });
  } catch (error) {
    console.error('[votes] My votes error:', error);
    return c.json({ success: false, error: 'Failed to list your votes' }, 500);
  }
});

export { voteRoutes };
