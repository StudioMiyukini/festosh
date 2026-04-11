/**
 * Universal QR Objects — create, manage, scan any QR-coded item.
 * Types: trophy, hunt_checkpoint, entry_ticket, drink_ticket, food_ticket,
 *        voucher, stamp_point, custom
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  qrObjects,
  qrScans,
  profiles,
  editions,
} from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const qrObjectRoutes = new Hono();

const QR_TYPES = [
  'trophy', 'hunt_checkpoint', 'entry_ticket', 'drink_ticket',
  'food_ticket', 'voucher', 'stamp_point', 'custom',
] as const;

const QR_TYPE_LABELS: Record<string, string> = {
  trophy: 'Trophee',
  hunt_checkpoint: 'Point de chasse',
  entry_ticket: "Ticket d'entree",
  drink_ticket: 'Ticket boisson',
  food_ticket: 'Ticket nourriture',
  voucher: 'Bon / Coupon',
  stamp_point: 'Point tampon',
  custom: 'Personnalise',
};

function generateQrCode(type: string): string {
  const prefix = type.toUpperCase().slice(0, 3);
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// Helper: resolve edition's festivalId for middleware
async function resolveEditionFestival(c: any, next: any) {
  const editionId = c.req.param('editionId');
  if (editionId) {
    const edition = db.select({ festivalId: editions.festivalId }).from(editions).where(eq(editions.id, editionId)).get();
    if (edition) {
      c.req.addValidatedData('param', { festivalId: edition.festivalId });
    }
  }
  await next();
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: CRUD QR Objects
// ═══════════════════════════════════════════════════════════════════════════

// List QR objects for an edition
qrObjectRoutes.get(
  '/edition/:editionId',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const type = c.req.query('type') || '';

      const conditions = [eq(qrObjects.editionId, editionId)];
      if (type && QR_TYPES.includes(type as any)) {
        conditions.push(eq(qrObjects.type, type));
      }

      const items = db.select().from(qrObjects)
        .where(and(...conditions))
        .orderBy(desc(qrObjects.createdAt))
        .all();

      return c.json({
        success: true,
        data: items.map((item) => ({
          ...formatResponse(item, ['metadata']),
          type_label: QR_TYPE_LABELS[item.type] || item.type,
        })),
        types: QR_TYPES.map((t) => ({ value: t, label: QR_TYPE_LABELS[t] })),
      });
    } catch (error) {
      console.error('[qr-objects] List error:', error);
      return c.json({ success: false, error: 'Failed to list QR objects' }, 500);
    }
  },
);

// Create a single QR object
qrObjectRoutes.post(
  '/edition/:editionId',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.name?.trim()) return c.json({ success: false, error: 'Name required' }, 400);
      if (body.type && !QR_TYPES.includes(body.type)) {
        return c.json({ success: false, error: `Invalid type. Valid: ${QR_TYPES.join(', ')}` }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();
      const qrCode = generateQrCode(body.type || 'custom');

      db.insert(qrObjects).values({
        id,
        editionId,
        type: body.type || 'custom',
        name: body.name.trim(),
        description: body.description || null,
        imageUrl: body.image_url || null,
        qrCode,
        maxScans: body.max_scans ?? null,
        maxScansPerUser: body.max_scans_per_user ?? 1,
        xpReward: body.xp_reward ?? 0,
        coinsReward: body.coins_reward ?? 0,
        isConsumable: body.is_consumable ? 1 : 0,
        isActive: 1,
        validFrom: body.valid_from || null,
        validUntil: body.valid_until || null,
        metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(qrObjects).where(eq(qrObjects.id, id)).get();
      return c.json({
        success: true,
        data: created ? { ...formatResponse(created, ['metadata']), type_label: QR_TYPE_LABELS[created.type] } : null,
      }, 201);
    } catch (error) {
      console.error('[qr-objects] Create error:', error);
      return c.json({ success: false, error: 'Failed to create QR object' }, 500);
    }
  },
);

// Batch create (e.g. 50 drink tickets at once)
qrObjectRoutes.post(
  '/edition/:editionId/batch',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.name?.trim()) return c.json({ success: false, error: 'Name required' }, 400);
      const quantity = Math.min(Math.max(body.quantity || 1, 1), 500);

      const now = Math.floor(Date.now() / 1000);
      const batchId = crypto.randomUUID();
      const type = body.type || 'custom';

      const created: string[] = [];
      for (let i = 0; i < quantity; i++) {
        const id = crypto.randomUUID();
        const qrCode = generateQrCode(type);

        db.insert(qrObjects).values({
          id,
          editionId,
          type,
          name: quantity > 1 ? `${body.name.trim()} #${i + 1}` : body.name.trim(),
          description: body.description || null,
          imageUrl: body.image_url || null,
          qrCode,
          maxScans: body.max_scans ?? 1,
          maxScansPerUser: body.max_scans_per_user ?? 1,
          xpReward: body.xp_reward ?? 0,
          coinsReward: body.coins_reward ?? 0,
          isConsumable: body.is_consumable !== undefined ? (body.is_consumable ? 1 : 0) : 1,
          isActive: 1,
          validFrom: body.valid_from || null,
          validUntil: body.valid_until || null,
          metadata: body.metadata ? JSON.stringify(body.metadata) : '{}',
          batchId,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        }).run();

        created.push(qrCode);
      }

      return c.json({
        success: true,
        data: {
          batch_id: batchId,
          quantity: created.length,
          type,
          type_label: QR_TYPE_LABELS[type],
          qr_codes: created,
        },
      }, 201);
    } catch (error) {
      console.error('[qr-objects] Batch create error:', error);
      return c.json({ success: false, error: 'Failed to batch create QR objects' }, 500);
    }
  },
);

// Update QR object
qrObjectRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const obj = db.select().from(qrObjects).where(eq(qrObjects.id, id)).get();
    if (!obj) return c.json({ success: false, error: 'QR object not found' }, 404);

    const keyMap: Record<string, string> = {
      name: 'name', description: 'description', image_url: 'imageUrl',
      max_scans: 'maxScans', max_scans_per_user: 'maxScansPerUser',
      xp_reward: 'xpReward', coins_reward: 'coinsReward',
      is_consumable: 'isConsumable', is_active: 'isActive',
      valid_from: 'validFrom', valid_until: 'validUntil',
    };

    const update: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    for (const [bk, sk] of Object.entries(keyMap)) {
      if (body[bk] !== undefined) update[sk] = body[bk];
    }
    if (body.metadata !== undefined) update.metadata = JSON.stringify(body.metadata);

    db.update(qrObjects).set(update).where(eq(qrObjects.id, id)).run();
    const updated = db.select().from(qrObjects).where(eq(qrObjects.id, id)).get();

    return c.json({ success: true, data: updated ? formatResponse(updated, ['metadata']) : null });
  } catch (error) {
    console.error('[qr-objects] Update error:', error);
    return c.json({ success: false, error: 'Failed to update QR object' }, 500);
  }
});

// Delete QR object
qrObjectRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    db.delete(qrScans).where(eq(qrScans.qrObjectId, id)).run();
    db.delete(qrObjects).where(eq(qrObjects.id, id)).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[qr-objects] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete' }, 500);
  }
});

// Delete entire batch
qrObjectRoutes.delete('/batch/:batchId', authMiddleware, async (c) => {
  try {
    const batchId = c.req.param('batchId');
    const items = db.select({ id: qrObjects.id }).from(qrObjects).where(eq(qrObjects.batchId, batchId)).all();
    const ids = items.map((i) => i.id);

    if (ids.length > 0) {
      db.delete(qrScans).where(inArray(qrScans.qrObjectId, ids)).run();
      db.delete(qrObjects).where(eq(qrObjects.batchId, batchId)).run();
    }

    return c.json({ success: true, data: { deleted: ids.length } });
  } catch (error) {
    console.error('[qr-objects] Delete batch error:', error);
    return c.json({ success: false, error: 'Failed to delete batch' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC: SCAN QR Code
// ═══════════════════════════════════════════════════════════════════════════

qrObjectRoutes.post('/scan', optionalAuth, async (c) => {
  try {
    const body = await c.req.json();
    const qrCode = body.qr_code?.trim();
    if (!qrCode) return c.json({ success: false, error: 'qr_code required' }, 400);

    const userId = c.get('userId') as string | undefined;
    const guestName = body.guest_name || null;

    // Find the QR object
    const obj = db.select().from(qrObjects).where(eq(qrObjects.qrCode, qrCode)).get();
    if (!obj) return c.json({ success: false, error: 'QR code invalide' }, 404);
    if (!obj.isActive) return c.json({ success: false, error: 'Ce QR code n\'est plus actif' }, 410);

    const now = Math.floor(Date.now() / 1000);

    // Check validity window
    if (obj.validFrom && now < obj.validFrom) return c.json({ success: false, error: 'Ce QR code n\'est pas encore valide' }, 400);
    if (obj.validUntil && now > obj.validUntil) return c.json({ success: false, error: 'Ce QR code a expire' }, 400);

    // Check max total scans
    if (obj.maxScans && obj.scanCount >= obj.maxScans) {
      return c.json({ success: false, error: 'Ce QR code a atteint sa limite de scans' }, 400);
    }

    // Check per-user scan limit
    if (userId && obj.maxScansPerUser) {
      const userScans = db.select({ count: sql<number>`count(*)` }).from(qrScans)
        .where(and(eq(qrScans.qrObjectId, obj.id), eq(qrScans.userId, userId)))
        .get();
      if ((userScans?.count ?? 0) >= obj.maxScansPerUser) {
        return c.json({ success: false, error: 'Vous avez deja scanne ce QR code' }, 409);
      }
    }

    // Record scan
    db.insert(qrScans).values({
      id: crypto.randomUUID(),
      qrObjectId: obj.id,
      userId: userId || null,
      guestName,
      status: 'success',
      scannedAt: now,
    }).run();

    // Increment scan count
    db.update(qrObjects)
      .set({ scanCount: obj.scanCount + 1 })
      .where(eq(qrObjects.id, obj.id))
      .run();

    // If consumable and reached max, deactivate
    if (obj.isConsumable && obj.maxScans && (obj.scanCount + 1) >= obj.maxScans) {
      db.update(qrObjects).set({ isActive: 0 }).where(eq(qrObjects.id, obj.id)).run();
    }

    // Award XP/coins to authenticated user
    let xpAwarded = 0;
    let coinsAwarded = 0;
    if (userId && (obj.xpReward > 0 || obj.coinsReward > 0)) {
      const user = db.select({ xp: profiles.xp, coins: profiles.coins }).from(profiles).where(eq(profiles.id, userId)).get();
      if (user) {
        xpAwarded = obj.xpReward;
        coinsAwarded = obj.coinsReward;
        db.update(profiles).set({
          xp: (user.xp ?? 0) + xpAwarded,
          coins: (user.coins ?? 0) + coinsAwarded,
        }).where(eq(profiles.id, userId)).run();
      }
    }

    return c.json({
      success: true,
      data: {
        type: obj.type,
        type_label: QR_TYPE_LABELS[obj.type] || obj.type,
        name: obj.name,
        description: obj.description,
        image_url: obj.imageUrl,
        xp_earned: xpAwarded,
        coins_earned: coinsAwarded,
        scan_count: obj.scanCount + 1,
        max_scans: obj.maxScans,
        is_consumable: obj.isConsumable,
        metadata: obj.metadata ? JSON.parse(obj.metadata as string) : {},
      },
    });
  } catch (error) {
    console.error('[qr-objects] Scan error:', error);
    return c.json({ success: false, error: 'Failed to scan QR code' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

qrObjectRoutes.get(
  '/edition/:editionId/stats',
  authMiddleware,
  resolveEditionFestival,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const allObjects = db.select().from(qrObjects).where(eq(qrObjects.editionId, editionId)).all();
      const totalObjects = allObjects.length;
      const totalScans = allObjects.reduce((s, o) => s + o.scanCount, 0);
      const activeCount = allObjects.filter((o) => o.isActive).length;

      // By type
      const byType: Record<string, { count: number; scans: number; active: number }> = {};
      for (const obj of allObjects) {
        if (!byType[obj.type]) byType[obj.type] = { count: 0, scans: 0, active: 0 };
        byType[obj.type].count++;
        byType[obj.type].scans += obj.scanCount;
        if (obj.isActive) byType[obj.type].active++;
      }

      // By batch
      const batches = [...new Set(allObjects.map((o) => o.batchId).filter(Boolean))];
      const batchStats = batches.map((batchId) => {
        const items = allObjects.filter((o) => o.batchId === batchId);
        return {
          batch_id: batchId,
          type: items[0]?.type,
          type_label: QR_TYPE_LABELS[items[0]?.type || 'custom'],
          name: items[0]?.name?.replace(/ #\d+$/, ''),
          count: items.length,
          scans: items.reduce((s, o) => s + o.scanCount, 0),
          active: items.filter((o) => o.isActive).length,
        };
      });

      return c.json({
        success: true,
        data: {
          total_objects: totalObjects,
          total_scans: totalScans,
          active_count: activeCount,
          by_type: Object.entries(byType).map(([type, data]) => ({
            type, type_label: QR_TYPE_LABELS[type] || type, ...data,
          })),
          batches: batchStats,
        },
      });
    } catch (error) {
      console.error('[qr-objects] Stats error:', error);
      return c.json({ success: false, error: 'Failed to get stats' }, 500);
    }
  },
);

// Scan history for an object (admin)
qrObjectRoutes.get('/:id/scans', authMiddleware, async (c) => {
  try {
    const objId = c.req.param('id');

    const scans = db
      .select({
        id: qrScans.id,
        userId: qrScans.userId,
        guestName: qrScans.guestName,
        status: qrScans.status,
        scannedAt: qrScans.scannedAt,
        username: profiles.username,
        displayName: profiles.displayName,
      })
      .from(qrScans)
      .leftJoin(profiles, eq(profiles.id, qrScans.userId))
      .where(eq(qrScans.qrObjectId, objId))
      .orderBy(desc(qrScans.scannedAt))
      .limit(100)
      .all();

    return c.json({
      success: true,
      data: scans.map((s) => ({
        id: s.id, user_id: s.userId, guest_name: s.guestName,
        username: s.username, display_name: s.displayName,
        status: s.status, scanned_at: s.scannedAt,
      })),
    });
  } catch (error) {
    console.error('[qr-objects] Scan history error:', error);
    return c.json({ success: false, error: 'Failed to get scan history' }, 500);
  }
});

export { qrObjectRoutes };
