/**
 * CMS routes — pages, blocks, and navigation for festival websites.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { cmsPages, cmsBlocks, cmsNavigation, festivalMembers } from '../db/schema.js';
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

function formatNav(n: typeof cmsNavigation.$inferSelect) {
  return formatResponse(n);
}

// ─── Default system pages for new festivals ───────────────────────────────
const DEFAULT_PAGES = [
  { slug: 'accueil', title: 'Accueil', isHomepage: 1, sortOrder: 0 },
  { slug: 'programme', title: 'Programme', isHomepage: 0, sortOrder: 1 },
  { slug: 'plan', title: 'Plan', isHomepage: 0, sortOrder: 2 },
  { slug: 'exposants', title: 'Exposants', isHomepage: 0, sortOrder: 3 },
  { slug: 'candidature', title: 'Candidature', isHomepage: 0, sortOrder: 4 },
];

// Map system page slugs to internal routes
const SYSTEM_PAGE_ROUTES: Record<string, string> = {
  accueil: '/',
  programme: '/schedule',
  plan: '/map',
  exposants: '/exhibitors',
  candidature: '/apply',
};

// ===========================================================================
// PAGES
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/pages — list pages
// ---------------------------------------------------------------------------
cmsRoutes.get('/festival/:festivalId/pages', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');

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
      rows = db
        .select()
        .from(cmsPages)
        .where(and(eq(cmsPages.festivalId, festivalId), eq(cmsPages.isPublished, 1)))
        .all();
    }

    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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
          isSystem: 0,
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
// POST /festival/:festivalId/pages/initialize-defaults — create system pages + nav
// ---------------------------------------------------------------------------
cmsRoutes.post(
  '/festival/:festivalId/pages/initialize-defaults',
  authMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const now = Math.floor(Date.now() / 1000);

      const createdPages: Array<{ id: string; slug: string; title: string }> = [];

      for (const def of DEFAULT_PAGES) {
        // Skip if page already exists
        const existing = db
          .select()
          .from(cmsPages)
          .where(and(eq(cmsPages.festivalId, festivalId), eq(cmsPages.slug, def.slug)))
          .get();

        if (existing) continue;

        const pageId = crypto.randomUUID();
        db.insert(cmsPages)
          .values({
            id: pageId,
            festivalId,
            slug: def.slug,
            title: def.title,
            isPublished: 1,
            isHomepage: def.isHomepage,
            isSystem: 1,
            sortOrder: def.sortOrder,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        createdPages.push({ id: pageId, slug: def.slug, title: def.title });
      }

      // Create default navigation items
      const existingNav = db
        .select()
        .from(cmsNavigation)
        .where(eq(cmsNavigation.festivalId, festivalId))
        .all();

      if (existingNav.length === 0) {
        // Get all pages to build nav
        const allPages = db
          .select()
          .from(cmsPages)
          .where(eq(cmsPages.festivalId, festivalId))
          .all();

        for (const def of DEFAULT_PAGES) {
          const page = allPages.find((p) => p.slug === def.slug);
          if (!page) continue;

          const route = SYSTEM_PAGE_ROUTES[def.slug];

          db.insert(cmsNavigation)
            .values({
              id: crypto.randomUUID(),
              festivalId,
              parentId: null,
              label: def.title,
              linkType: route ? 'internal' : 'page',
              target: route || page.id,
              sortOrder: def.sortOrder,
              isVisible: 1,
              openNewTab: 0,
              createdAt: now,
              updatedAt: now,
            })
            .run();
        }
      }

      return c.json({ success: true, data: { created_pages: createdPages.length } });
    } catch (error) {
      console.error('[cms] Initialize defaults error:', error);
      return c.json({ success: false, error: 'Failed to initialize defaults' }, 500);
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

    blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({
      success: true,
      data: {
        ...formatPage(page),
        blocks: blocks.map(formatBlock),
      },
    });
  } catch (error) {
    console.error('[cms] Get page error:', error);
    return c.json({ success: false, error: 'Failed to fetch page' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/pages/by-slug/:slug — get page by slug with blocks
// ---------------------------------------------------------------------------
cmsRoutes.get('/festival/:festivalId/pages/by-slug/:slug', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const slug = c.req.param('slug');

    const page = db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.festivalId, festivalId), eq(cmsPages.slug, slug)))
      .get();

    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    const blocks = db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, page.id))
      .all();

    blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({
      success: true,
      data: {
        ...formatPage(page),
        blocks: blocks.map(formatBlock),
      },
    });
  } catch (error) {
    console.error('[cms] Get page by slug error:', error);
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
    if (body.slug !== undefined) {
      // System pages cannot change slug
      if (page.isSystem) {
        return c.json({ success: false, error: 'Les pages systeme ne peuvent pas changer de slug.' }, 403);
      }
      updateData.slug = body.slug;
    }
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
// DELETE /pages/:id — delete page (system pages cannot be deleted)
// ---------------------------------------------------------------------------
cmsRoutes.delete('/pages/:id', authMiddleware, async (c) => {
  try {
    const pageId = c.req.param('id');

    const page = db.select().from(cmsPages).where(eq(cmsPages.id, pageId)).get();
    if (!page) {
      return c.json({ success: false, error: 'Page not found' }, 404);
    }

    if (page.isSystem) {
      return c.json({ success: false, error: 'Les pages systeme ne peuvent pas etre supprimees.' }, 403);
    }

    // Delete all blocks belonging to this page
    db.delete(cmsBlocks).where(eq(cmsBlocks.pageId, pageId)).run();
    db.delete(cmsPages).where(eq(cmsPages.id, pageId)).run();

    return c.json({ success: true, data: { message: 'Page deleted' } });
  } catch (error) {
    console.error('[cms] Delete page error:', error);
    return c.json({ success: false, error: 'Failed to delete page' }, 500);
  }
});

// ===========================================================================
// BLOCKS
// ===========================================================================

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

    return c.json({ success: true, data: formatBlock(block!) }, 201);
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

    return c.json({ success: true, data: formatBlock(updated!) });
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
    const body = await c.req.json();
    const blockIds = body.block_ids || body.blockIds;

    if (!Array.isArray(blockIds)) {
      return c.json({ success: false, error: 'block_ids must be an array' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < blockIds.length; i++) {
      db.update(cmsBlocks)
        .set({ sortOrder: i, updatedAt: now })
        .where(and(eq(cmsBlocks.id, blockIds[i]), eq(cmsBlocks.pageId, pageId)))
        .run();
    }

    const blocks = db
      .select()
      .from(cmsBlocks)
      .where(eq(cmsBlocks.pageId, pageId))
      .all();

    blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({ success: true, data: blocks.map(formatBlock) });
  } catch (error) {
    console.error('[cms] Reorder blocks error:', error);
    return c.json({ success: false, error: 'Failed to reorder blocks' }, 500);
  }
});

// ===========================================================================
// NAVIGATION
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/navigation — list nav items (tree structure)
// ---------------------------------------------------------------------------
cmsRoutes.get('/festival/:festivalId/navigation', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const items = db
      .select()
      .from(cmsNavigation)
      .where(eq(cmsNavigation.festivalId, festivalId))
      .all();

    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    // Build tree: top-level items with nested children
    const formatted = items.map(formatNav);
    const topLevel = formatted.filter((i) => !i.parent_id);
    const children = formatted.filter((i) => i.parent_id);

    const tree = topLevel.map((item) => ({
      ...item,
      children: children.filter((ch) => ch.parent_id === item.id),
    }));

    return c.json({ success: true, data: tree });
  } catch (error) {
    console.error('[cms] List navigation error:', error);
    return c.json({ success: false, error: 'Failed to list navigation' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/navigation — create nav item
// ---------------------------------------------------------------------------
cmsRoutes.post(
  '/festival/:festivalId/navigation',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { label, link_type, target, parent_id, sort_order, is_visible, open_new_tab } = body;

      if (!label || !link_type || !target) {
        return c.json({ success: false, error: 'label, link_type, and target are required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(cmsNavigation)
        .values({
          id,
          festivalId,
          parentId: parent_id || null,
          label,
          linkType: link_type,
          target,
          sortOrder: sort_order ?? 0,
          isVisible: is_visible !== false ? 1 : 0,
          openNewTab: open_new_tab ? 1 : 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const nav = db.select().from(cmsNavigation).where(eq(cmsNavigation.id, id)).get();

      return c.json({ success: true, data: formatNav(nav!) }, 201);
    } catch (error) {
      console.error('[cms] Create nav item error:', error);
      return c.json({ success: false, error: 'Failed to create nav item' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /navigation/:id — update nav item
// ---------------------------------------------------------------------------
cmsRoutes.put('/navigation/:id', authMiddleware, async (c) => {
  try {
    const navId = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const nav = db.select().from(cmsNavigation).where(eq(cmsNavigation.id, navId)).get();
    if (!nav) {
      return c.json({ success: false, error: 'Nav item not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.label !== undefined) updateData.label = body.label;
    if (body.link_type !== undefined) updateData.linkType = body.link_type;
    if (body.target !== undefined) updateData.target = body.target;
    if (body.parent_id !== undefined) updateData.parentId = body.parent_id || null;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
    if (body.is_visible !== undefined) updateData.isVisible = body.is_visible ? 1 : 0;
    if (body.open_new_tab !== undefined) updateData.openNewTab = body.open_new_tab ? 1 : 0;

    db.update(cmsNavigation).set(updateData).where(eq(cmsNavigation.id, navId)).run();

    const updated = db.select().from(cmsNavigation).where(eq(cmsNavigation.id, navId)).get();

    return c.json({ success: true, data: formatNav(updated!) });
  } catch (error) {
    console.error('[cms] Update nav item error:', error);
    return c.json({ success: false, error: 'Failed to update nav item' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /navigation/:id — delete nav item (+ children)
// ---------------------------------------------------------------------------
cmsRoutes.delete('/navigation/:id', authMiddleware, async (c) => {
  try {
    const navId = c.req.param('id');

    const nav = db.select().from(cmsNavigation).where(eq(cmsNavigation.id, navId)).get();
    if (!nav) {
      return c.json({ success: false, error: 'Nav item not found' }, 404);
    }

    // Delete children first
    db.delete(cmsNavigation).where(eq(cmsNavigation.parentId, navId)).run();
    db.delete(cmsNavigation).where(eq(cmsNavigation.id, navId)).run();

    return c.json({ success: true, data: { message: 'Nav item deleted' } });
  } catch (error) {
    console.error('[cms] Delete nav item error:', error);
    return c.json({ success: false, error: 'Failed to delete nav item' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /festival/:festivalId/navigation/reorder — reorder nav items
// ---------------------------------------------------------------------------
cmsRoutes.put(
  '/festival/:festivalId/navigation/reorder',
  authMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const { items } = await c.req.json();

      if (!Array.isArray(items)) {
        return c.json({ success: false, error: 'items must be an array' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);

      for (const item of items) {
        if (!item.id) continue;
        const updateData: Record<string, unknown> = { updatedAt: now };
        if (item.sort_order !== undefined) updateData.sortOrder = item.sort_order;
        if (item.parent_id !== undefined) updateData.parentId = item.parent_id || null;

        db.update(cmsNavigation)
          .set(updateData)
          .where(and(eq(cmsNavigation.id, item.id), eq(cmsNavigation.festivalId, festivalId)))
          .run();
      }

      return c.json({ success: true, data: { message: 'Navigation reordered' } });
    } catch (error) {
      console.error('[cms] Reorder nav error:', error);
      return c.json({ success: false, error: 'Failed to reorder navigation' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/generate-system-pages — auto-create essential pages
// ---------------------------------------------------------------------------
cmsRoutes.post(
  '/festival/:festivalId/generate-system-pages',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const now = Math.floor(Date.now() / 1000);

      const systemPages = [
        { title: 'Accueil', slug: 'accueil', sortOrder: 0, content: [
          { id: crypto.randomUUID(), type: 'hero', content: { title: 'Bienvenue', subtitle: 'Decouvrez notre festival', background_image_url: '' }, sort_order: 0, is_visible: true },
          { id: crypto.randomUUID(), type: 'text', content: { body: 'Bienvenue sur le site de notre festival. Retrouvez ici toutes les informations pratiques.' }, sort_order: 1, is_visible: true },
        ]},
        { title: 'Exposants', slug: 'exposants', sortOrder: 1, content: [
          { id: crypto.randomUUID(), type: 'text', content: { body: '# Nos exposants\n\nDecouvrez les exposants qui seront presents lors de notre prochain evenement.' }, sort_order: 0, is_visible: true },
          { id: crypto.randomUUID(), type: 'exhibitor_list', content: {}, sort_order: 1, is_visible: true },
        ]},
        { title: 'Candidature', slug: 'candidature', sortOrder: 2, content: [
          { id: crypto.randomUUID(), type: 'text', content: { body: '# Candidature exposant\n\nVous souhaitez participer en tant qu\'exposant ? Remplissez le formulaire ci-dessous.' }, sort_order: 0, is_visible: true },
        ]},
        { title: 'Programme', slug: 'programme', sortOrder: 3, content: [
          { id: crypto.randomUUID(), type: 'text', content: { body: '# Programme\n\nLe programme sera bientot disponible.' }, sort_order: 0, is_visible: true },
          { id: crypto.randomUUID(), type: 'schedule', content: {}, sort_order: 1, is_visible: true },
        ]},
        { title: 'Informations pratiques', slug: 'infos', sortOrder: 4, content: [
          { id: crypto.randomUUID(), type: 'text', content: { body: '# Informations pratiques\n\n## Acces\nAdresse du lieu, transports en commun, parking.\n\n## Horaires\nConsultez les horaires d\'ouverture.\n\n## Tarifs\nConsultez la billetterie pour les tarifs.' }, sort_order: 0, is_visible: true },
          { id: crypto.randomUUID(), type: 'map', content: {}, sort_order: 1, is_visible: true },
        ]},
      ];

      let created = 0;
      for (const page of systemPages) {
        // Check if page with this slug already exists
        const existing = db.select().from(cmsPages)
          .where(and(eq(cmsPages.festivalId, festivalId), eq(cmsPages.slug, page.slug)))
          .get();
        if (existing) continue;

        const pageId = crypto.randomUUID();
        db.insert(cmsPages).values({
          id: pageId,
          festivalId,
          title: page.title,
          slug: page.slug,
          isPublished: 1,
          isSystem: 1,
          sortOrder: page.sortOrder,
          createdAt: now,
          updatedAt: now,
        }).run();

        // Create blocks
        for (const block of page.content) {
          db.insert(cmsBlocks).values({
            id: block.id,
            pageId,
            blockType: block.type,
            content: JSON.stringify(block.content),
            sortOrder: block.sort_order,
            isVisible: 1,
            createdAt: now,
            updatedAt: now,
          }).run();
        }

        created++;
      }

      // Create default navigation if none exists
      const existingNav = db.select().from(cmsNavigation)
        .where(eq(cmsNavigation.festivalId, festivalId))
        .all();

      if (existingNav.length === 0) {
        const navItems = [
          { label: 'Accueil', linkType: 'internal', target: '/', sortOrder: 0 },
          { label: 'Programme', linkType: 'internal', target: '/schedule', sortOrder: 1 },
          { label: 'Plan', linkType: 'internal', target: '/map', sortOrder: 2 },
          { label: 'Exposants', linkType: 'internal', target: '/exhibitors', sortOrder: 3 },
          { label: 'Candidature', linkType: 'internal', target: '/apply', sortOrder: 4 },
          { label: 'Reglements', linkType: 'internal', target: '/regulations', sortOrder: 5 },
        ];

        for (const item of navItems) {
          db.insert(cmsNavigation).values({
            id: crypto.randomUUID(),
            festivalId,
            label: item.label,
            linkType: item.linkType,
            target: item.target,
            sortOrder: item.sortOrder,
            isVisible: 1,
            createdAt: now,
            updatedAt: now,
          }).run();
        }
      }

      return c.json({
        success: true,
        data: { pages_created: created, message: `${created} pages generees` },
      }, 201);
    } catch (error) {
      console.error('[cms] Generate system pages error:', error);
      return c.json({ success: false, error: 'Failed to generate system pages' }, 500);
    }
  },
);

export { cmsRoutes };
