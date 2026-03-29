/**
 * CMS routes — pages and blocks for festival websites.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { cmsPages, cmsBlocks, festivalMembers } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole, hasMinRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const cmsRoutes = new Hono();

function formatPage(p: typeof cmsPages.$inferSelect) {
  return formatResponse(p);
}

function formatBlock(b: typeof cmsBlocks.$inferSelect) {
  return formatResponse(b, ['content', 'settings']);
}

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/pages — list pages
// ---------------------------------------------------------------------------
cmsRoutes.get('/festival/:festivalId/pages', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');

    // Determine if user is an editor+
    let isEditor = false;
    if (userId) {
      const platformRole = c.get('userRole');
      if (platformRole === 'admin') {
        isEditor = true;
      } else {
        const member = db
          .select()
          .from(festivalMembers)
          .where(and(eq(festivalMembers.festivalId, festivalId), eq(festivalMembers.userId, userId)))
          .get();
        if (member && hasMinRole(member.role ?? 'exhibitor', 'editor')) {
          isEditor = true;
        }
      }
    }

    let rows;
    if (isEditor) {
      rows = db.select().from(cmsPages).where(eq(cmsPages.festivalId, festivalId)).all();
    } else {
      // Public: only published pages
      rows = db
        .select()
        .from(cmsPages)
        .where(and(eq(cmsPages.festivalId, festivalId), eq(cmsPages.isPublished, 1)))
        .all();
    }

    return c.json({ success: true, data: rows.map(formatPage) });
  } catch (error) {
    console.error('[cms] List pages error:', error);
    return c.json({ success: false, error: 'Failed to list pages' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/pages — create page
// ---------------------------------------------------------------------------
cmsRoutes.post(
  '/festival/:festivalId/pages',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();
      const { title, slug, is_published, is_homepage, meta_description, sort_order } = body;

      if (!title || !slug) {
        return c.json({ success: false, error: 'Title and slug are required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(cmsPages)
        .values({
          id,
          festivalId,
          title,
          slug,
          isPublished: is_published ? 1 : 0,
          isHomepage: is_homepage ? 1 : 0,
          metaDescription: meta_description || null,
          sortOrder: sort_order || 0,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const page = db.select().from(cmsPages).where(eq(cmsPages.id, id)).get();

      return c.json({ success: true, data: formatPage(page!) }, 201);
    } catch (error) {
      console.error('[cms] Create page error:', error);
      return c.json({ success: false, error: 'Failed to create page' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /pages/:id — get page with blocks
// ---------------------------------------------------------------------------
cmsRoutes.get('/pages/:id', optionalAuth, async (c) => {
  try {
    const pageId = c.req.param('id');

    const page = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();
    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const blocks = db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))
      .all();

    // Sort blocks by sort_order
    blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const formattedBlocks = blocks.map(formatBlock);

    return c.json({
      success: true,
      data: {
        ...formatPage(page),
        blocks: formattedBlocks,
      },
    });
  } catch (error) {
    console.error('[cms] Get page error:', error);
    return c.json({ success: false, error: 'Failed to fetch page' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /pages/:id — update page
// ---------------------------------------------------------------------------
cmsRoutes.put('/pages/:id', authMiddleware, async (c) => {
  try {
    const pageId = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const page = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();
    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.is_published !== undefined) updateData.isPublished = body.is_published ? 1 : 0;
    if (body.is_homepage !== undefined) updateData.isHomepage = body.is_homepage ? 1 : 0;
    if (body.meta_description !== undefined) updateData.metaDescription = body.meta_description;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    db.update(cmsPages).set(updateData).where(eq(cmsPages.id, pageId)).run();

    const updated = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();

    return c.json({ success: true, data: formatPage(updated!) });
  } catch (error) {
    console.error('[cms] Update page error:', error);
    return c.json({ success: false, error: 'Failed to update page' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /pages/:id — delete page
// ---------------------------------------------------------------------------
cmsRoutes.delete('/pages/:id', authMiddleware, async (c) => {
  try {
    const pageId = c.req.param('id');

    const page = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();
    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    db.delete(cmsPages).where(eq(cmsPages.id, pageId)).run();

    return c.json({ success: true, data: { message: 'Page deleted' } });
  } catch (error) {
    console.error('[cms] Delete page error:', error);
    return c.json({ success: false, error: 'Failed to delete page' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /pages/:pageId/blocks — add block
// ---------------------------------------------------------------------------
cmsRoutes.post('/pages/:pageId/blocks', authMiddleware, async (c) => {
  try {
    const pageId = c.req.param('pageId');
    const body = await c.req.json();
    const { block_type, content, settings, sort_order, is_visible } = body;

    if (!block_type) {
      return c.json({ success: false, error: 'block_type is required' }, 400);
    }

    const page = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();
    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(cmsBlocks)
      .values({
        id,
        pageId,
        blockType: block_type,
        content: JSON.stringify(content || {}),
        settings: JSON.stringify(settings || {}),
        sortOrder: sort_order ?? 0,
        isVisible: is_visible !== false ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const block = db.select().from(cmsBlocks).where(eq(cmsBlocks.id, id)).get();

    return c.json({
      success: true,
      data: formatBlock(block!),
    }, 201);
  } catch (error) {
    console.error('[cms] Add block error:', error);
    return c.json({ success: false, error: 'Failed to add block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /blocks/:id — update block
// ---------------------------------------------------------------------------
cmsRoutes.put('/blocks/:id', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const block = db.select().from(cmsBlocks).where(eq(cmsBlocks.id, blockId)).get();
    if (!block) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.block_type !== undefined) updateData.blockType = body.block_type;
    if (body.content !== undefined) updateData.content = JSON.stringify(body.content);
    if (body.settings !== undefined) updateData.settings = JSON.stringify(body.settings);
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
    if (body.is_visible !== undefined) updateData.isVisible = body.is_visible ? 1 : 0;

    db.update(cmsBlocks).set(updateData).where(eq(cmsBlocks.id, blockId)).run();

    const updated = db.select().from(cmsBlocks).where(eq(cmsBlocks.id, blockId)).get();

    return c.json({
      success: true,
      data: formatBlock(updated!),
    });
  } catch (error) {
    console.error('[cms] Update block error:', error);
    return c.json({ success: false, error: 'Failed to update block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /blocks/:id — delete block
// ---------------------------------------------------------------------------
cmsRoutes.delete('/blocks/:id', authMiddleware, async (c) => {
  try {
    const blockId = c.req.param('id');

    const block = db.select().from(cmsBlocks).where(eq(cmsBlocks.id, blockId)).get();
    if (!block) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }

    db.delete(cmsBlocks).where(eq(cmsBlocks.id, blockId)).run();

    return c.json({ success: true, data: { message: 'Block deleted' } });
  } catch (error) {
    console.error('[cms] Delete block error:', error);
    return c.json({ success: false, error: 'Failed to delete block' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /pages/:pageId/blocks/reorder — reorder blocks
// ---------------------------------------------------------------------------
cmsRoutes.put('/pages/:pageId/blocks/reorder', authMiddleware, async (c) => {
  try {
    const pageId = c.req.param('pageId');
    const { block_ids } = await c.req.json();

    if (!Array.isArray(block_ids)) {
      return c.json({ success: false, error: 'block_ids must be an array' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < block_ids.length; i++) {
      db.update(cmsBlocks)
        .set({ sortOrder: i, updatedAt: now })
        .where(and(eq(cmsBlocks.id, block_ids[i]), eq(cmsBlocks.pageId, pageId)))
        .run();
    }

    // Return updated blocks
    const blocks = db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))
      .all();

    blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const formattedBlocks = blocks.map(formatBlock);

    return c.json({ success: true, data: formattedBlocks });
  } catch (error) {
    console.error('[cms] Reorder blocks error:', error);
    return c.json({ success: false, error: 'Failed to reorder blocks' }, 500);
  }
});

export { cmsRoutes };
