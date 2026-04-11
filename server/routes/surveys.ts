/**
 * Survey/Form builder routes — Google Forms-like questionnaire builder.
 *
 * Block types:
 *   title        — { text: string, size: 'h1'|'h2'|'h3' }
 *   description  — { text: string }
 *   short_text   — { label: string, placeholder?: string, required?: boolean }
 *   long_text    — { label: string, placeholder?: string, required?: boolean }
 *   single_choice — { label: string, options: string[], required?: boolean }
 *   multiple_choice — { label: string, options: string[], required?: boolean }
 *   dropdown     — { label: string, options: string[], required?: boolean }
 *   rating       — { label: string, max: number, required?: boolean }
 *   scale        — { label: string, min: number, max: number, min_label?: string, max_label?: string, required?: boolean }
 *   date         — { label: string, required?: boolean }
 *   email        — { label: string, required?: boolean }
 *   number       — { label: string, min?: number, max?: number, required?: boolean }
 *   separator    — {}
 *   nps          — { label: string, required?: boolean }
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { surveys, surveyResponses, profiles, editions } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const surveyRoutes = new Hono();

const BLOCK_TYPES = [
  'title', 'description', 'short_text', 'long_text',
  'single_choice', 'multiple_choice', 'dropdown',
  'rating', 'scale', 'date', 'email', 'number',
  'separator', 'nps',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: CRUD Surveys
// ═══════════════════════════════════════════════════════════════════════════

// List surveys for a festival
surveyRoutes.get(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const rows = db.select().from(surveys)
        .where(eq(surveys.festivalId, festivalId))
        .orderBy(desc(surveys.createdAt))
        .all();

      return c.json({
        success: true,
        data: rows.map((s) => ({
          ...formatResponse(s, ['blocks']),
          block_count: (() => { try { return JSON.parse(s.blocks || '[]').length; } catch { return 0; } })(),
        })),
        block_types: BLOCK_TYPES,
      });
    } catch (error) {
      console.error('[surveys] List error:', error);
      return c.json({ success: false, error: 'Failed to list surveys' }, 500);
    }
  },
);

// Create survey
surveyRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      // Default blocks for a satisfaction survey
      const defaultBlocks = body.blocks || [
        { id: crypto.randomUUID(), type: 'title', content: { text: 'Questionnaire de satisfaction', size: 'h1' } },
        { id: crypto.randomUUID(), type: 'description', content: { text: 'Merci de prendre quelques minutes pour nous donner votre avis.' } },
        { id: crypto.randomUUID(), type: 'rating', content: { label: 'Note globale', max: 5, required: true } },
        { id: crypto.randomUUID(), type: 'single_choice', content: { label: 'Y retourneriez-vous ?', options: ['Oui, certainement', 'Probablement', 'Pas sur', 'Non'], required: true } },
        { id: crypto.randomUUID(), type: 'long_text', content: { label: 'Commentaires', placeholder: 'Vos suggestions pour ameliorer le festival...', required: false } },
      ];

      db.insert(surveys).values({
        id,
        festivalId,
        editionId: body.edition_id || null,
        title: body.title || 'Questionnaire de satisfaction',
        description: body.description || null,
        blocks: JSON.stringify(defaultBlocks),
        isActive: 0,
        isPublic: body.is_public ? 1 : 0,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(surveys).where(eq(surveys.id, id)).get();
      return c.json({ success: true, data: created ? formatResponse(created, ['blocks']) : null }, 201);
    } catch (error) {
      console.error('[surveys] Create error:', error);
      return c.json({ success: false, error: 'Failed to create survey' }, 500);
    }
  },
);

// Get survey with blocks
surveyRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const survey = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!survey) return c.json({ success: false, error: 'Survey not found' }, 404);

    return c.json({
      success: true,
      data: formatResponse(survey, ['blocks']),
      block_types: BLOCK_TYPES,
    });
  } catch (error) {
    console.error('[surveys] Get error:', error);
    return c.json({ success: false, error: 'Failed to get survey' }, 500);
  }
});

// Update survey (title, description, blocks, is_active, is_public)
surveyRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Survey not found' }, 404);

    const update: Record<string, unknown> = { updatedAt: now };
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.blocks !== undefined) update.blocks = JSON.stringify(body.blocks);
    if (body.is_active !== undefined) update.isActive = body.is_active ? 1 : 0;
    if (body.is_public !== undefined) update.isPublic = body.is_public ? 1 : 0;
    if (body.edition_id !== undefined) update.editionId = body.edition_id;

    db.update(surveys).set(update).where(eq(surveys.id, id)).run();
    const updated = db.select().from(surveys).where(eq(surveys.id, id)).get();

    return c.json({ success: true, data: updated ? formatResponse(updated, ['blocks']) : null });
  } catch (error) {
    console.error('[surveys] Update error:', error);
    return c.json({ success: false, error: 'Failed to update survey' }, 500);
  }
});

// Delete survey
surveyRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    db.delete(surveyResponses).where(eq(surveyResponses.surveyId, id)).run();
    db.delete(surveys).where(eq(surveys.id, id)).run();
    return c.json({ success: true, data: { message: 'Survey deleted' } });
  } catch (error) {
    console.error('[surveys] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete survey' }, 500);
  }
});

// Duplicate survey
surveyRoutes.post('/:id/duplicate', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const original = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!original) return c.json({ success: false, error: 'Survey not found' }, 404);

    // Clone blocks with new IDs
    let blocks: any[];
    try { blocks = JSON.parse(original.blocks || '[]'); } catch { blocks = []; }
    const newBlocks = blocks.map((b: any) => ({ ...b, id: crypto.randomUUID() }));

    const newId = crypto.randomUUID();
    db.insert(surveys).values({
      id: newId,
      festivalId: original.festivalId,
      editionId: original.editionId,
      title: `${original.title} (copie)`,
      description: original.description,
      blocks: JSON.stringify(newBlocks),
      isActive: 0,
      isPublic: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(surveys).where(eq(surveys.id, newId)).get();
    return c.json({ success: true, data: created ? formatResponse(created, ['blocks']) : null }, 201);
  } catch (error) {
    console.error('[surveys] Duplicate error:', error);
    return c.json({ success: false, error: 'Failed to duplicate survey' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC: Submit response
// ═══════════════════════════════════════════════════════════════════════════

// Get survey for filling (public if is_public, auth otherwise)
surveyRoutes.get('/:id/fill', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const survey = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!survey) return c.json({ success: false, error: 'Survey not found' }, 404);

    if (!survey.isActive) return c.json({ success: false, error: 'Ce questionnaire n\'est pas actif' }, 400);

    const userId = c.get('userId') as string | undefined;
    if (!survey.isPublic && !userId) {
      return c.json({ success: false, error: 'Connexion requise pour ce questionnaire' }, 401);
    }

    // Check if already responded
    if (userId) {
      const existing = db.select().from(surveyResponses)
        .where(and(eq(surveyResponses.surveyId, id), eq(surveyResponses.userId, userId)))
        .get();
      if (existing) {
        return c.json({ success: false, error: 'Vous avez deja repondu a ce questionnaire', already_responded: true }, 409);
      }
    }

    let blocks;
    try { blocks = JSON.parse(survey.blocks || '[]'); } catch { blocks = []; }

    return c.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        blocks,
      },
    });
  } catch (error) {
    console.error('[surveys] Get fill error:', error);
    return c.json({ success: false, error: 'Failed to get survey' }, 500);
  }
});

// Submit response
surveyRoutes.post('/:id/respond', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const userId = c.get('userId') as string | undefined;
    const now = Math.floor(Date.now() / 1000);

    const survey = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!survey) return c.json({ success: false, error: 'Survey not found' }, 404);
    if (!survey.isActive) return c.json({ success: false, error: 'Ce questionnaire n\'est pas actif' }, 400);

    if (!survey.isPublic && !userId) {
      return c.json({ success: false, error: 'Connexion requise' }, 401);
    }

    // Prevent duplicate response from same user
    if (userId) {
      const existing = db.select().from(surveyResponses)
        .where(and(eq(surveyResponses.surveyId, id), eq(surveyResponses.userId, userId)))
        .get();
      if (existing) return c.json({ success: false, error: 'Vous avez deja repondu' }, 409);
    }

    // Validate required fields
    let blocks: any[];
    try { blocks = JSON.parse(survey.blocks || '[]'); } catch { blocks = []; }

    const answers = body.answers || {};
    const requiredBlocks = blocks.filter((b: any) => b.content?.required);
    for (const block of requiredBlocks) {
      const answer = answers[block.id];
      if (answer === undefined || answer === null || answer === '') {
        return c.json({
          success: false,
          error: `Le champ "${block.content.label || 'requis'}" est obligatoire`,
        }, 400);
      }
    }

    const responseId = crypto.randomUUID();
    db.insert(surveyResponses).values({
      id: responseId,
      surveyId: id,
      userId: userId || null,
      guestName: body.guest_name || null,
      guestEmail: body.guest_email || null,
      answers: JSON.stringify(answers),
      completed: 1,
      createdAt: now,
    }).run();

    // Increment response count
    db.update(surveys)
      .set({ responseCount: (survey.responseCount ?? 0) + 1 })
      .where(eq(surveys.id, id))
      .run();

    return c.json({ success: true, data: { id: responseId, message: 'Merci pour votre reponse !' } }, 201);
  } catch (error) {
    console.error('[surveys] Submit response error:', error);
    return c.json({ success: false, error: 'Failed to submit response' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: View responses & analytics
// ═══════════════════════════════════════════════════════════════════════════

// List responses for a survey
surveyRoutes.get('/:id/responses', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const total = db.select({ count: sql<number>`count(*)` }).from(surveyResponses)
      .where(eq(surveyResponses.surveyId, id)).get();

    const rows = db.select({
      id: surveyResponses.id,
      userId: surveyResponses.userId,
      guestName: surveyResponses.guestName,
      guestEmail: surveyResponses.guestEmail,
      answers: surveyResponses.answers,
      createdAt: surveyResponses.createdAt,
      username: profiles.username,
      displayName: profiles.displayName,
    })
      .from(surveyResponses)
      .leftJoin(profiles, eq(profiles.id, surveyResponses.userId))
      .where(eq(surveyResponses.surveyId, id))
      .orderBy(desc(surveyResponses.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        user_id: r.userId,
        guest_name: r.guestName,
        guest_email: r.guestEmail,
        respondent_name: r.displayName || r.username || r.guestName || 'Anonyme',
        answers: (() => { try { return JSON.parse(r.answers || '{}'); } catch { return {}; } })(),
        created_at: r.createdAt,
      })),
      pagination: { total: total?.count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error('[surveys] List responses error:', error);
    return c.json({ success: false, error: 'Failed to list responses' }, 500);
  }
});

// Get survey analytics (aggregated results)
surveyRoutes.get('/:id/analytics', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const survey = db.select().from(surveys).where(eq(surveys.id, id)).get();
    if (!survey) return c.json({ success: false, error: 'Survey not found' }, 404);

    let blocks: any[];
    try { blocks = JSON.parse(survey.blocks || '[]'); } catch { blocks = []; }

    const responses = db.select().from(surveyResponses)
      .where(eq(surveyResponses.surveyId, id))
      .all();

    const totalResponses = responses.length;
    const analytics: Record<string, unknown> = {};

    for (const block of blocks) {
      if (['title', 'description', 'separator'].includes(block.type)) continue;

      const blockAnswers = responses
        .map((r) => { try { return JSON.parse(r.answers || '{}')[block.id]; } catch { return undefined; } })
        .filter((a) => a !== undefined && a !== null && a !== '');

      const answered = blockAnswers.length;
      const blockAnalytics: Record<string, unknown> = {
        block_id: block.id,
        type: block.type,
        label: block.content?.label || '',
        answered,
        answer_rate: totalResponses > 0 ? Math.round((answered / totalResponses) * 100) : 0,
      };

      if (['rating', 'scale', 'nps', 'number'].includes(block.type)) {
        const nums = blockAnswers.map(Number).filter((n) => !isNaN(n));
        if (nums.length > 0) {
          blockAnalytics.average = Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
          blockAnalytics.min = Math.min(...nums);
          blockAnalytics.max = Math.max(...nums);
          // Distribution
          const dist: Record<number, number> = {};
          for (const n of nums) { dist[n] = (dist[n] || 0) + 1; }
          blockAnalytics.distribution = dist;
        }

        if (block.type === 'nps') {
          const detractors = nums.filter((n) => n <= 6).length;
          const promoters = nums.filter((n) => n >= 9).length;
          blockAnalytics.nps_score = nums.length > 0
            ? Math.round(((promoters - detractors) / nums.length) * 100)
            : 0;
        }
      }

      if (['single_choice', 'multiple_choice', 'dropdown'].includes(block.type)) {
        const counts: Record<string, number> = {};
        for (const answer of blockAnswers) {
          const values = Array.isArray(answer) ? answer : [answer];
          for (const v of values) {
            counts[v] = (counts[v] || 0) + 1;
          }
        }
        blockAnalytics.choices = Object.entries(counts)
          .map(([choice, count]) => ({
            choice,
            count,
            percent: answered > 0 ? Math.round((count / answered) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);
      }

      if (['short_text', 'long_text'].includes(block.type)) {
        blockAnalytics.sample_answers = blockAnswers.slice(0, 10);
      }

      analytics[block.id] = blockAnalytics;
    }

    return c.json({
      success: true,
      data: {
        survey_id: id,
        title: survey.title,
        total_responses: totalResponses,
        blocks: Object.values(analytics),
      },
    });
  } catch (error) {
    console.error('[surveys] Analytics error:', error);
    return c.json({ success: false, error: 'Failed to get analytics' }, 500);
  }
});

export { surveyRoutes };
