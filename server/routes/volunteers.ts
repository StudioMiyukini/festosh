/**
 * Volunteer routes — roles, shifts, and assignments.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  volunteerRoles,
  shifts,
  shiftAssignments,
  festivalMembers,
  profiles,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const volunteerRoutes = new Hono();

function formatRole(r: typeof volunteerRoles.$inferSelect) {
  return formatResponse(r);
}

function formatShift(s: typeof shifts.$inferSelect) {
  return formatResponse(s);
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/roles — list volunteer roles
// ---------------------------------------------------------------------------
volunteerRoutes.get('/festival/:festivalId/roles', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const roles = db
      .select()
      .from(volunteerRoles)
      .where(eq(volunteerRoles.festivalId, festivalId))
      .all();

    return c.json({ success: true, data: roles.map(formatRole) });
  } catch (error) {
    console.error('[volunteers] List roles error:', error);
    return c.json({ success: false, error: 'Failed to list volunteer roles' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/roles — create role
// ---------------------------------------------------------------------------
volunteerRoutes.post(
  '/festival/:festivalId/roles',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'moderator']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, description, color } = body;

      if (!name) {
        return c.json({ success: false, error: 'Role name is required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(volunteerRoles)
        .values({
          id,
          festivalId,
          name,
          description: description || null,
          color: color || '#6366f1',
          createdAt: now,
        })
        .run();

      const role = db.select().from(volunteerRoles).where(eq(volunteerRoles.id, id)).get();

      return c.json({ success: true, data: formatRole(role!) }, 201);
    } catch (error) {
      console.error('[volunteers] Create role error:', error);
      return c.json({ success: false, error: 'Failed to create volunteer role' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/shifts — list shifts
// ---------------------------------------------------------------------------
volunteerRoutes.get('/edition/:editionId/shifts', async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const rows = db
      .select()
      .from(shifts)
      .where(eq(shifts.editionId, editionId))
      .all();

    // For each shift, get current assignment count
    const data = rows.map((shift) => {
      const assignments = db
        .select()
        .from(shiftAssignments)
        .where(eq(shiftAssignments.shiftId, shift.id))
        .all();

      return {
        ...formatShift(shift),
        assigned_count: assignments.length,
        assignments: assignments.map((a) => ({
          id: a.id,
          user_id: a.userId,
          notes: a.notes,
          created_at: a.createdAt,
        })),
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[volunteers] List shifts error:', error);
    return c.json({ success: false, error: 'Failed to list shifts' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/shifts — create shift
// ---------------------------------------------------------------------------
volunteerRoutes.post('/edition/:editionId/shifts', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const body = await c.req.json();
    const { role_id, venue_id, title, description, start_time, end_time, max_volunteers } = body;

    if (!role_id || !start_time || !end_time) {
      return c.json({ success: false, error: 'role_id, start_time, and end_time are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(shifts)
      .values({
        id,
        editionId,
        roleId: role_id,
        venueId: venue_id || null,
        title: title || null,
        description: description || null,
        startTime: start_time,
        endTime: end_time,
        maxVolunteers: max_volunteers || 1,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const shift = db.select().from(shifts).where(eq(shifts.id, id)).get();

    return c.json({ success: true, data: formatShift(shift!) }, 201);
  } catch (error) {
    console.error('[volunteers] Create shift error:', error);
    return c.json({ success: false, error: 'Failed to create shift' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /shifts/:id — update shift
// ---------------------------------------------------------------------------
volunteerRoutes.put('/shifts/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const shift = db.select().from(shifts).where(eq(shifts.id, id)).get();
    if (!shift) {
      return c.json({ success: false, error: 'Shift not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      role_id: 'roleId',
      venue_id: 'venueId',
      title: 'title',
      description: 'description',
      start_time: 'startTime',
      end_time: 'endTime',
      max_volunteers: 'maxVolunteers',
      status: 'status',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(shifts).set(updateData).where(eq(shifts.id, id)).run();

    const updated = db.select().from(shifts).where(eq(shifts.id, id)).get();

    return c.json({ success: true, data: formatShift(updated!) });
  } catch (error) {
    console.error('[volunteers] Update shift error:', error);
    return c.json({ success: false, error: 'Failed to update shift' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /shifts/:id — delete shift
// ---------------------------------------------------------------------------
volunteerRoutes.delete('/shifts/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const shift = db.select().from(shifts).where(eq(shifts.id, id)).get();
    if (!shift) {
      return c.json({ success: false, error: 'Shift not found' }, 404);
    }

    db.delete(shifts).where(eq(shifts.id, id)).run();

    return c.json({ success: true, data: { message: 'Shift deleted' } });
  } catch (error) {
    console.error('[volunteers] Delete shift error:', error);
    return c.json({ success: false, error: 'Failed to delete shift' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /shifts/:id/assign — assign volunteer
// ---------------------------------------------------------------------------
volunteerRoutes.post('/shifts/:id/assign', authMiddleware, async (c) => {
  try {
    const shiftId = c.req.param('id');
    const body = await c.req.json();
    const assignerId = c.get('userId');
    const userId = body.user_id || assignerId; // Self-assign if no user_id provided

    const shift = db.select().from(shifts).where(eq(shifts.id, shiftId)).get();
    if (!shift) {
      return c.json({ success: false, error: 'Shift not found' }, 404);
    }

    // Check capacity
    const existingAssignments = db
      .select()
      .from(shiftAssignments)
      .where(eq(shiftAssignments.shiftId, shiftId))
      .all();

    if (existingAssignments.length >= (shift.maxVolunteers ?? 1)) {
      return c.json({ success: false, error: 'Shift is full' }, 409);
    }

    // Check if already assigned
    const alreadyAssigned = existingAssignments.find((a) => a.userId === userId);
    if (alreadyAssigned) {
      return c.json({ success: false, error: 'User is already assigned to this shift' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(shiftAssignments)
      .values({
        id,
        shiftId,
        userId,
        assignedBy: assignerId,
        notes: body.notes || null,
        createdAt: now,
      })
      .run();

    // Update shift status if full
    if (existingAssignments.length + 1 >= (shift.maxVolunteers ?? 1)) {
      db.update(shifts)
        .set({ status: 'assigned', updatedAt: now })
        .where(eq(shifts.id, shiftId))
        .run();
    }

    return c.json({
      success: true,
      data: { id, shift_id: shiftId, user_id: userId, assigned_at: now },
    }, 201);
  } catch (error) {
    console.error('[volunteers] Assign error:', error);
    return c.json({ success: false, error: 'Failed to assign volunteer' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /shifts/:id/assign/:userId — unassign volunteer
// ---------------------------------------------------------------------------
volunteerRoutes.delete('/shifts/:id/assign/:userId', authMiddleware, async (c) => {
  try {
    const shiftId = c.req.param('id');
    const userId = c.req.param('userId');

    const assignment = db
      .select()
      .from(shiftAssignments)
      .where(
        and(
          eq(shiftAssignments.shiftId, shiftId),
          eq(shiftAssignments.userId, userId),
        ),
      )
      .get();

    if (!assignment) {
      return c.json({ success: false, error: 'Assignment not found' }, 404);
    }

    db.delete(shiftAssignments)
      .where(eq(shiftAssignments.id, assignment.id))
      .run();

    // Reopen shift if it was full
    const now = Math.floor(Date.now() / 1000);
    db.update(shifts)
      .set({ status: 'open', updatedAt: now })
      .where(eq(shifts.id, shiftId))
      .run();

    return c.json({ success: true, data: { message: 'Volunteer unassigned' } });
  } catch (error) {
    console.error('[volunteers] Unassign error:', error);
    return c.json({ success: false, error: 'Failed to unassign volunteer' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-shifts/:editionId — get my shifts
// ---------------------------------------------------------------------------
volunteerRoutes.get('/my-shifts/:editionId', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const userId = c.get('userId');

    // Get all shifts for this edition
    const editionShifts = db
      .select()
      .from(shifts)
      .where(eq(shifts.editionId, editionId))
      .all();

    // Find assignments for this user
    const myShifts = [];
    for (const shift of editionShifts) {
      const assignment = db
        .select()
        .from(shiftAssignments)
        .where(
          and(
            eq(shiftAssignments.shiftId, shift.id),
            eq(shiftAssignments.userId, userId),
          ),
        )
        .get();

      if (assignment) {
        myShifts.push({
          ...formatShift(shift),
          assignment_id: assignment.id,
          assignment_notes: assignment.notes,
          assigned_at: assignment.createdAt,
        });
      }
    }

    return c.json({ success: true, data: myShifts });
  } catch (error) {
    console.error('[volunteers] My shifts error:', error);
    return c.json({ success: false, error: 'Failed to fetch your shifts' }, 500);
  }
});

export { volunteerRoutes };
