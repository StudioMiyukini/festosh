/**
 * Equipment routes — inventory items and assignments.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { equipmentItems, equipmentAssignments, equipmentOwners } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const equipmentRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/items — list items
// ---------------------------------------------------------------------------
equipmentRoutes.get('/festival/:festivalId/items', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const items = db
      .select()
      .from(equipmentItems)
      .where(eq(equipmentItems.festivalId, festivalId))
      .all();

    return c.json({ success: true, data: items.map((item) => formatResponse(item)) });
  } catch (error) {
    console.error('[equipment] List items error:', error);
    return c.json({ success: false, error: 'Failed to list equipment items' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/items — create item
// ---------------------------------------------------------------------------
equipmentRoutes.post(
  '/festival/:festivalId/items',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'moderator']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, description, category, unit, total_quantity, photo_url, owner_name, value_cents, acquisition_type } = body;

      if (!name) {
        return c.json({ success: false, error: 'Item name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(equipmentItems)
        .values({
          id,
          festivalId,
          name,
          description: description || null,
          category: category || null,
          unit: unit || 'unit',
          photoUrl: photo_url || null,
          totalQuantity: total_quantity || 1,
          ownerName: owner_name || null,
          valueCents: value_cents ?? 0,
          acquisitionType: acquisition_type || 'owned',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const item = db
        .select()
        .from(equipmentItems)
        .where(eq(equipmentItems.id, id))
        .get();

      return c.json({ success: true, data: item ? formatResponse(item) : null }, 201);
    } catch (error) {
      console.error('[equipment] Create item error:', error);
      return c.json({ success: false, error: 'Failed to create equipment item' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /items/:id — update item
// ---------------------------------------------------------------------------
equipmentRoutes.put('/items/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const item = db.select().from(equipmentItems).where(eq(equipmentItems.id, id)).get();
    if (!item) {
      return c.json({ success: false, error: 'Equipment item not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      category: 'category',
      unit: 'unit',
      total_quantity: 'totalQuantity',
      photo_url: 'photoUrl',
      owner_name: 'ownerName',
      value_cents: 'valueCents',
      acquisition_type: 'acquisitionType',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(equipmentItems).set(updateData).where(eq(equipmentItems.id, id)).run();

    const updated = db.select().from(equipmentItems).where(eq(equipmentItems.id, id)).get();

    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[equipment] Update item error:', error);
    return c.json({ success: false, error: 'Failed to update equipment item' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /items/:id — delete item
// ---------------------------------------------------------------------------
equipmentRoutes.delete('/items/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const item = db.select().from(equipmentItems).where(eq(equipmentItems.id, id)).get();
    if (!item) {
      return c.json({ success: false, error: 'Equipment item not found' }, 404);
    }

    db.delete(equipmentItems).where(eq(equipmentItems.id, id)).run();

    return c.json({ success: true, data: { message: 'Equipment item deleted' } });
  } catch (error) {
    console.error('[equipment] Delete item error:', error);
    return c.json({ success: false, error: 'Failed to delete equipment item' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/assignments — list assignments
// ---------------------------------------------------------------------------
equipmentRoutes.get('/edition/:editionId/assignments', async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const assignments = db
      .select()
      .from(equipmentAssignments)
      .where(eq(equipmentAssignments.editionId, editionId))
      .all();

    return c.json({ success: true, data: assignments.map((a) => formatResponse(a)) });
  } catch (error) {
    console.error('[equipment] List assignments error:', error);
    return c.json({ success: false, error: 'Failed to list equipment assignments' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/assignments — create assignment
// ---------------------------------------------------------------------------
equipmentRoutes.post('/edition/:editionId/assignments', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const body = await c.req.json();
    const { item_id, assigned_to_type, assigned_to_id, quantity, status, notes } = body;

    if (!item_id || !assigned_to_type || !assigned_to_id) {
      return c.json({
        success: false,
        error: 'item_id, assigned_to_type, and assigned_to_id are required',
      }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(equipmentAssignments)
      .values({
        id,
        itemId: item_id,
        editionId,
        assignedToType: assigned_to_type,
        assignedToId: assigned_to_id,
        quantity: quantity || 1,
        status: status || 'requested',
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const assignment = db
      .select()
      .from(equipmentAssignments)
      .where(eq(equipmentAssignments.id, id))
      .get();

    return c.json({ success: true, data: assignment ? formatResponse(assignment) : null }, 201);
  } catch (error) {
    console.error('[equipment] Create assignment error:', error);
    return c.json({ success: false, error: 'Failed to create equipment assignment' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /assignments/:id — update assignment
// ---------------------------------------------------------------------------
equipmentRoutes.put('/assignments/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const assignment = db
      .select()
      .from(equipmentAssignments)
      .where(eq(equipmentAssignments.id, id))
      .get();

    if (!assignment) {
      return c.json({ success: false, error: 'Equipment assignment not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      quantity: 'quantity',
      status: 'status',
      notes: 'notes',
      assigned_to_type: 'assignedToType',
      assigned_to_id: 'assignedToId',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(equipmentAssignments).set(updateData).where(eq(equipmentAssignments.id, id)).run();

    const updated = db
      .select()
      .from(equipmentAssignments)
      .where(eq(equipmentAssignments.id, id))
      .get();

    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[equipment] Update assignment error:', error);
    return c.json({ success: false, error: 'Failed to update equipment assignment' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/owners — list equipment owners
// ---------------------------------------------------------------------------
equipmentRoutes.get('/festival/:festivalId/owners', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const owners = db
      .select()
      .from(equipmentOwners)
      .where(eq(equipmentOwners.festivalId, festivalId))
      .all();
    return c.json({ success: true, data: owners.map((o) => formatResponse(o)) });
  } catch (error) {
    console.error('[equipment] List owners error:', error);
    return c.json({ success: false, error: 'Failed to list equipment owners' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/owners — create equipment owner
// ---------------------------------------------------------------------------
equipmentRoutes.post(
  '/festival/:festivalId/owners',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'moderator']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, contact_info, notes } = body;

      if (!name) {
        return c.json({ success: false, error: 'Owner name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(equipmentOwners)
        .values({
          id,
          festivalId,
          name,
          contactInfo: contact_info || null,
          notes: notes || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const owner = db
        .select()
        .from(equipmentOwners)
        .where(eq(equipmentOwners.id, id))
        .get();

      return c.json({ success: true, data: owner ? formatResponse(owner) : null }, 201);
    } catch (error) {
      console.error('[equipment] Create owner error:', error);
      return c.json({ success: false, error: 'Failed to create equipment owner' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /owners/:id — update equipment owner
// ---------------------------------------------------------------------------
equipmentRoutes.put('/owners/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const owner = db.select().from(equipmentOwners).where(eq(equipmentOwners.id, id)).get();
    if (!owner) {
      return c.json({ success: false, error: 'Equipment owner not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      name: 'name',
      contact_info: 'contactInfo',
      notes: 'notes',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(equipmentOwners).set(updateData).where(eq(equipmentOwners.id, id)).run();
    const updated = db.select().from(equipmentOwners).where(eq(equipmentOwners.id, id)).get();

    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[equipment] Update owner error:', error);
    return c.json({ success: false, error: 'Failed to update equipment owner' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /owners/:id — delete equipment owner
// ---------------------------------------------------------------------------
equipmentRoutes.delete('/owners/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const owner = db.select().from(equipmentOwners).where(eq(equipmentOwners.id, id)).get();
    if (!owner) {
      return c.json({ success: false, error: 'Equipment owner not found' }, 404);
    }

    db.delete(equipmentOwners).where(eq(equipmentOwners.id, id)).run();

    return c.json({ success: true, data: { message: 'Equipment owner deleted' } });
  } catch (error) {
    console.error('[equipment] Delete owner error:', error);
    return c.json({ success: false, error: 'Failed to delete equipment owner' }, 500);
  }
});

export { equipmentRoutes };
