/**
 * Floor plan routes — visual venue/booth layout canvases.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { floorPlans } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const floorPlanRoutes = new Hono();

function formatFloorPlan(fp: typeof floorPlans.$inferSelect) {
  return formatResponse(fp, ['canvasData']);
}

// ---------------------------------------------------------------------------
// GET /edition/:editionId — list floor plans
// ---------------------------------------------------------------------------
floorPlanRoutes.get('/edition/:editionId', async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const plans = db
      .select()
      .from(floorPlans)
      .where(eq(floorPlans.editionId, editionId))
      .all();

    return c.json({ success: true, data: plans.map(formatFloorPlan) });
  } catch (error) {
    console.error('[floor-plans] List error:', error);
    return c.json({ success: false, error: 'Failed to list floor plans' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId — create floor plan
// ---------------------------------------------------------------------------
floorPlanRoutes.post('/edition/:editionId', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, description, width_px, height_px, grid_size, background_url } = body;

    if (!name) {
      return c.json({ success: false, error: 'Floor plan name is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(floorPlans)
      .values({
        id,
        editionId,
        name,
        widthPx: width_px || 1200,
        heightPx: height_px || 800,
        gridSize: grid_size || 20,
        backgroundUrl: background_url || null,
        canvasData: JSON.stringify({ elements: [] }),
        version: 1,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const plan = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();

    return c.json({ success: true, data: formatFloorPlan(plan!) }, 201);
  } catch (error) {
    console.error('[floor-plans] Create error:', error);
    return c.json({ success: false, error: 'Failed to create floor plan' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get floor plan
// ---------------------------------------------------------------------------
floorPlanRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const plan = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();
    if (!plan) {
      return c.json({ success: false, error: 'Floor plan not found' }, 404);
    }

    return c.json({ success: true, data: formatFloorPlan(plan) });
  } catch (error) {
    console.error('[floor-plans] Get error:', error);
    return c.json({ success: false, error: 'Failed to fetch floor plan' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update floor plan (name, dimensions)
// ---------------------------------------------------------------------------
floorPlanRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const plan = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();
    if (!plan) {
      return c.json({ success: false, error: 'Floor plan not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.width_px !== undefined) updateData.widthPx = body.width_px;
    if (body.height_px !== undefined) updateData.heightPx = body.height_px;
    if (body.grid_size !== undefined) updateData.gridSize = body.grid_size;
    if (body.show_grid !== undefined) updateData.showGrid = body.show_grid ? 1 : 0;
    if (body.background_url !== undefined) updateData.backgroundUrl = body.background_url;

    db.update(floorPlans).set(updateData).where(eq(floorPlans.id, id)).run();

    const updated = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();

    return c.json({ success: true, data: formatFloorPlan(updated!) });
  } catch (error) {
    console.error('[floor-plans] Update error:', error);
    return c.json({ success: false, error: 'Failed to update floor plan' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/canvas — save canvas data (auto-increments version)
// ---------------------------------------------------------------------------
floorPlanRoutes.put('/:id/canvas', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { canvas_data } = body;

    if (!canvas_data) {
      return c.json({ success: false, error: 'canvas_data is required' }, 400);
    }

    const plan = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();
    if (!plan) {
      return c.json({ success: false, error: 'Floor plan not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const newVersion = (plan.version ?? 1) + 1;

    db.update(floorPlans)
      .set({
        canvasData: JSON.stringify(canvas_data),
        version: newVersion,
        updatedAt: now,
      })
      .where(eq(floorPlans.id, id))
      .run();

    const updated = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();

    return c.json({ success: true, data: formatFloorPlan(updated!) });
  } catch (error) {
    console.error('[floor-plans] Save canvas error:', error);
    return c.json({ success: false, error: 'Failed to save canvas data' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete floor plan
// ---------------------------------------------------------------------------
floorPlanRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const plan = db.select().from(floorPlans).where(eq(floorPlans.id, id)).get();
    if (!plan) {
      return c.json({ success: false, error: 'Floor plan not found' }, 404);
    }

    db.delete(floorPlans).where(eq(floorPlans.id, id)).run();

    return c.json({ success: true, data: { message: 'Floor plan deleted' } });
  } catch (error) {
    console.error('[floor-plans] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete floor plan' }, 500);
  }
});

export { floorPlanRoutes };
