/**
 * Workspace document routes — collaborative block-based document editor.
 *
 * Content is a JSON array of blocks: [{ id, type, content }]
 * Block types: paragraph, heading, list, quote, code, divider, image, table
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { workspaceDocs, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const workspaceDocRoutes = new Hono();

const BLOCK_TYPES = ['paragraph', 'heading', 'list', 'quote', 'code', 'divider', 'image', 'table'] as const;

function formatDoc(d: typeof workspaceDocs.$inferSelect) {
  return formatResponse(d, ['content']);
}

// Increment doc version (triggers poll refresh for other clients)
function bumpVersion(docId: string) {
  const d = db.select({ version: workspaceDocs.version }).from(workspaceDocs).where(eq(workspaceDocs.id, docId)).get();
  const newVersion = (d?.version ?? 0) + 1;
  db.update(workspaceDocs).set({ version: newVersion, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(workspaceDocs.id, docId)).run();
  return newVersion;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIST DOCS
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.get('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db.select({
      id: workspaceDocs.id,
      title: workspaceDocs.title,
      version: workspaceDocs.version,
      isTemplate: workspaceDocs.isTemplate,
      lastEditedBy: workspaceDocs.lastEditedBy,
      createdBy: workspaceDocs.createdBy,
      createdAt: workspaceDocs.createdAt,
      updatedAt: workspaceDocs.updatedAt,
    })
      .from(workspaceDocs)
      .where(eq(workspaceDocs.festivalId, festivalId))
      .orderBy(desc(workspaceDocs.updatedAt))
      .all();

    // Enrich with last editor name
    const data = rows.map((d) => {
      const formatted = formatResponse(d) as Record<string, unknown>;
      if (d.lastEditedBy) {
        const editor = db.select({ username: profiles.username, displayName: profiles.displayName })
          .from(profiles).where(eq(profiles.id, d.lastEditedBy)).get();
        formatted.last_editor_name = editor?.displayName || editor?.username || null;
      }
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[workspace-docs] List error:', error);
    return c.json({ success: false, error: 'Failed to list documents' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CREATE DOC
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.title) return c.json({ success: false, error: 'Title is required' }, 400);

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      // Default content: one empty paragraph block
      const defaultContent = [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }];

      db.insert(workspaceDocs).values({
        id,
        festivalId,
        title: body.title,
        content: JSON.stringify(body.content || defaultContent),
        isTemplate: body.is_template ? 1 : 0,
        version: 1,
        createdBy: userId,
        lastEditedBy: userId,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
      return c.json({ success: true, data: formatDoc(created!) }, 201);
    } catch (error) {
      console.error('[workspace-docs] Create error:', error);
      return c.json({ success: false, error: 'Failed to create document' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// GET DOC
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const doc = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    const formatted = formatDoc(doc) as Record<string, unknown>;

    // Enrich with editor info
    if (doc.lastEditedBy) {
      const editor = db.select({ username: profiles.username, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
        .from(profiles).where(eq(profiles.id, doc.lastEditedBy)).get();
      formatted.last_editor_name = editor?.displayName || editor?.username || null;
      formatted.last_editor_avatar = editor?.avatarUrl || null;
    }

    // Creator info
    const creator = db.select({ username: profiles.username, displayName: profiles.displayName })
      .from(profiles).where(eq(profiles.id, doc.createdBy)).get();
    formatted.creator_name = creator?.displayName || creator?.username || null;

    formatted.block_types = BLOCK_TYPES;

    return c.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[workspace-docs] Get error:', error);
    return c.json({ success: false, error: 'Failed to get document' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POLL — check if doc has changed
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.get('/:id/poll', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const clientVersion = parseInt(c.req.query('version') || '0', 10);

    const doc = db.select({ version: workspaceDocs.version, content: workspaceDocs.content, updatedAt: workspaceDocs.updatedAt })
      .from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    if (!doc) return c.json({ success: false, error: 'Document not found' }, 404);

    if (doc.version <= clientVersion) {
      return c.json({ success: true, data: { changed: false, version: doc.version } });
    }

    // Version changed — return full content + metadata
    let blocks;
    try {
      blocks = JSON.parse(doc.content || '[]');
    } catch {
      blocks = [];
    }

    const fullDoc = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    let lastEditorName: string | null = null;
    if (fullDoc?.lastEditedBy) {
      const editor = db.select({ username: profiles.username, displayName: profiles.displayName })
        .from(profiles).where(eq(profiles.id, fullDoc.lastEditedBy)).get();
      lastEditorName = editor?.displayName || editor?.username || null;
    }

    return c.json({
      success: true,
      data: {
        changed: true,
        version: doc.version,
        title: fullDoc?.title || '',
        blocks,
        last_editor_name: lastEditorName,
        updated_at: doc.updatedAt,
      },
    });
  } catch (error) {
    console.error('[workspace-docs] Poll error:', error);
    return c.json({ success: false, error: 'Failed to poll document' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE DOC (title and/or content)
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Document not found' }, 404);

    const updateData: Record<string, unknown> = { updatedAt: now, lastEditedBy: userId };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = JSON.stringify(body.content);
    if (body.is_template !== undefined) updateData.isTemplate = body.is_template ? 1 : 0;

    db.update(workspaceDocs).set(updateData).where(eq(workspaceDocs.id, id)).run();
    bumpVersion(id);

    const updated = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    return c.json({ success: true, data: formatDoc(updated!) });
  } catch (error) {
    console.error('[workspace-docs] Update error:', error);
    return c.json({ success: false, error: 'Failed to update document' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE CONTENT ONLY (real-time saves)
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.put('/:id/content', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Document not found' }, 404);

    const clientBlocks: any[] = body.content ?? body.blocks ?? [];
    const clientVersion = body.version ?? 0;

    // Parse current server content
    let serverBlocks: any[];
    try { serverBlocks = JSON.parse(existing.content || '[]'); } catch { serverBlocks = []; }

    let mergedBlocks: any[];

    if (clientVersion >= existing.version) {
      // Client is up to date — accept their version as-is
      mergedBlocks = clientBlocks;
    } else {
      // Client is behind — merge per block:
      // - Blocks that exist in both: use client's version (they're actively editing)
      // - Blocks only on server: keep them (added by another user)
      // - Blocks only on client: keep them (added by this user)
      const serverMap = new Map(serverBlocks.map((b: any) => [b.id, b]));
      const clientMap = new Map(clientBlocks.map((b: any) => [b.id, b]));

      // Start with client's block order
      mergedBlocks = clientBlocks.map((cb: any) => {
        // Client has this block — use client version
        return cb;
      });

      // Add blocks that exist on server but not in client (added by other users)
      for (const sb of serverBlocks) {
        if (!clientMap.has(sb.id)) {
          mergedBlocks.push(sb);
        }
      }
    }

    const updateData: Record<string, unknown> = {
      content: JSON.stringify(mergedBlocks),
      lastEditedBy: userId,
      updatedAt: now,
    };
    if (body.title !== undefined) updateData.title = body.title;

    db.update(workspaceDocs).set(updateData).where(eq(workspaceDocs.id, id)).run();

    const newVersion = bumpVersion(id);

    // Return merged blocks so client can update their state
    return c.json({
      success: true,
      data: { version: newVersion, updated_at: now, blocks: mergedBlocks },
    });
  } catch (error) {
    console.error('[workspace-docs] Update content error:', error);
    return c.json({ success: false, error: 'Failed to update content' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE DOC
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.delete(
  '/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const existing = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
      if (!existing) return c.json({ success: false, error: 'Document not found' }, 404);

      db.delete(workspaceDocs).where(eq(workspaceDocs.id, id)).run();

      return c.json({ success: true, data: { message: 'Document deleted' } });
    } catch (error) {
      console.error('[workspace-docs] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete document' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE FROM TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

workspaceDocRoutes.post(
  '/festival/:festivalId/from-template/:templateId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const templateId = c.req.param('templateId');
      const userId = c.get('userId');
      const body = await c.req.json().catch(() => ({}));

      const template = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, templateId)).get();
      if (!template) return c.json({ success: false, error: 'Template not found' }, 404);
      if (!template.isTemplate) return c.json({ success: false, error: 'Source document is not a template' }, 400);

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      // Clone content with new block IDs
      let content: Array<{ id: string; type: string; content: unknown }> = [];
      try {
        const parsed = JSON.parse(template.content || '[]');
        content = parsed.map((block: { id: string; type: string; content: unknown }) => ({
          ...block,
          id: crypto.randomUUID(),
        }));
      } catch {
        content = [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }];
      }

      db.insert(workspaceDocs).values({
        id,
        festivalId,
        title: body.title || `${template.title} (copie)`,
        content: JSON.stringify(content),
        isTemplate: 0,
        version: 1,
        createdBy: userId,
        lastEditedBy: userId,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(workspaceDocs).where(eq(workspaceDocs.id, id)).get();
      return c.json({ success: true, data: formatDoc(created!) }, 201);
    } catch (error) {
      console.error('[workspace-docs] Create from template error:', error);
      return c.json({ success: false, error: 'Failed to create document from template' }, 500);
    }
  },
);

export { workspaceDocRoutes };
