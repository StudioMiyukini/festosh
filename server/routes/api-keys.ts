/**
 * API Keys & Webhooks routes — manage API keys and webhook configurations.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { apiKeys, webhooksTable, webhookLogs } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const apiKeyRoutes = new Hono();

// ===========================================================================
// API KEYS — all routes behind auth + festivalMember + owner/admin
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/keys — list API keys (show prefix, not hash)
// ---------------------------------------------------------------------------
apiKeyRoutes.get(
  '/festival/:festivalId/keys',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const keys = db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.festivalId, festivalId))
        .all();

      // Never expose the full hash — only prefix
      const data = keys.map((k) => {
        const formatted = formatResponse(k as Record<string, unknown>, ['permissions']);
        delete (formatted as any).key_hash;
        return formatted;
      });

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[api-keys] List keys error:', error);
      return c.json({ success: false, error: 'Failed to list API keys' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/keys — create API key
// ---------------------------------------------------------------------------
apiKeyRoutes.post(
  '/festival/:festivalId/keys',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.name) {
        return c.json({ success: false, error: 'Name is required' }, 400);
      }

      // Generate the API key
      const rawKey = `fsk_${crypto.randomUUID()}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPrefix = rawKey.substring(0, 8);

      const id = crypto.randomUUID();

      db.insert(apiKeys)
        .values({
          id,
          festivalId,
          name: body.name,
          keyHash,
          keyPrefix,
          permissions: body.permissions ? JSON.stringify(body.permissions) : '[]',
          expiresAt: body.expires_at ?? null,
          isActive: 1,
          createdBy: userId,
        })
        .run();

      const created = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
      const formatted = created ? formatResponse(created as Record<string, unknown>, ['permissions']) : null;

      // Remove hash from response
      if (formatted) {
        delete (formatted as any).key_hash;
      }

      return c.json({
        success: true,
        data: {
          ...formatted,
          key: rawKey, // Return the full key ONLY on creation
        },
      }, 201);
    } catch (error) {
      console.error('[api-keys] Create key error:', error);
      return c.json({ success: false, error: 'Failed to create API key' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /keys/:id — revoke API key
// ---------------------------------------------------------------------------
apiKeyRoutes.delete(
  '/keys/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const key = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
    if (!key) {
      return c.json({ success: false, error: 'API key not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: key.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');

      db.delete(apiKeys).where(eq(apiKeys.id, id)).run();

      return c.json({ success: true, data: { message: 'API key revoked' } });
    } catch (error) {
      console.error('[api-keys] Revoke key error:', error);
      return c.json({ success: false, error: 'Failed to revoke API key' }, 500);
    }
  },
);

// ===========================================================================
// WEBHOOKS
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/webhooks — list webhooks
// ---------------------------------------------------------------------------
apiKeyRoutes.get(
  '/festival/:festivalId/webhooks',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const hooks = db
        .select()
        .from(webhooksTable)
        .where(eq(webhooksTable.festivalId, festivalId))
        .all();

      return c.json({
        success: true,
        data: hooks.map((h) => formatResponse(h as Record<string, unknown>, ['events'])),
      });
    } catch (error) {
      console.error('[api-keys] List webhooks error:', error);
      return c.json({ success: false, error: 'Failed to list webhooks' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/webhooks — create webhook
// ---------------------------------------------------------------------------
apiKeyRoutes.post(
  '/festival/:festivalId/webhooks',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();

      if (!body.url) {
        return c.json({ success: false, error: 'URL is required' }, 400);
      }
      if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
        return c.json({ success: false, error: 'Events array is required' }, 400);
      }

      const id = crypto.randomUUID();
      const secret = crypto.randomBytes(32).toString('hex');

      db.insert(webhooksTable)
        .values({
          id,
          festivalId,
          url: body.url,
          events: JSON.stringify(body.events),
          secret,
          isActive: 1,
          failureCount: 0,
        })
        .run();

      const created = db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).get();

      return c.json({
        success: true,
        data: created ? formatResponse(created as Record<string, unknown>, ['events']) : null,
      }, 201);
    } catch (error) {
      console.error('[api-keys] Create webhook error:', error);
      return c.json({ success: false, error: 'Failed to create webhook' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /webhooks/:id — update webhook
// ---------------------------------------------------------------------------
apiKeyRoutes.put(
  '/webhooks/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const hook = db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).get();
    if (!hook) {
      return c.json({ success: false, error: 'Webhook not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: hook.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const updateData: Record<string, unknown> = {};

      if (body.url !== undefined) updateData.url = body.url;
      if (body.events !== undefined) updateData.events = JSON.stringify(body.events);
      if (body.is_active !== undefined) updateData.isActive = body.is_active;

      db.update(webhooksTable).set(updateData).where(eq(webhooksTable.id, id)).run();

      const updated = db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).get();

      return c.json({
        success: true,
        data: updated ? formatResponse(updated as Record<string, unknown>, ['events']) : null,
      });
    } catch (error) {
      console.error('[api-keys] Update webhook error:', error);
      return c.json({ success: false, error: 'Failed to update webhook' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /webhooks/:id — delete webhook
// ---------------------------------------------------------------------------
apiKeyRoutes.delete(
  '/webhooks/:id',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const hook = db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).get();
    if (!hook) {
      return c.json({ success: false, error: 'Webhook not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: hook.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const id = c.req.param('id');

      // Delete logs first, then webhook
      db.delete(webhookLogs).where(eq(webhookLogs.webhookId, id)).run();
      db.delete(webhooksTable).where(eq(webhooksTable.id, id)).run();

      return c.json({ success: true, data: { message: 'Webhook deleted' } });
    } catch (error) {
      console.error('[api-keys] Delete webhook error:', error);
      return c.json({ success: false, error: 'Failed to delete webhook' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /webhooks/:id/logs — list last 50 webhook logs
// ---------------------------------------------------------------------------
apiKeyRoutes.get(
  '/webhooks/:id/logs',
  authMiddleware,
  async (c, next) => {
    const id = c.req.param('id');
    const hook = db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).get();
    if (!hook) {
      return c.json({ success: false, error: 'Webhook not found' }, 404);
    }
    c.req.addValidatedData('param', { ...c.req.param(), festivalId: hook.festivalId });
    await next();
  },
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const webhookId = c.req.param('id');

      const logs = db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, webhookId))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(50)
        .all();

      return c.json({
        success: true,
        data: logs.map((l) => formatResponse(l as Record<string, unknown>)),
      });
    } catch (error) {
      console.error('[api-keys] List webhook logs error:', error);
      return c.json({ success: false, error: 'Failed to list webhook logs' }, 500);
    }
  },
);

export { apiKeyRoutes };
