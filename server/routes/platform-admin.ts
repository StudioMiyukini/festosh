/**
 * Platform administration routes — restricted to platform admins.
 * Users CRUD, Festivals CRUD, platform stats.
 */

import { Hono } from 'hono';
import { eq, like, or, and, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  profiles,
  supportTickets,
  ticketMessages,
  festivals,
  festivalMembers,
  editions,
  exhibitorProfiles,
  budgetEntries,
} from '../db/schema.js';
import { authMiddleware, requireRole, hashPassword } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';
import { sanitizeUser } from '../lib/sanitize.js';

const VALID_PLATFORM_ROLES = ['user', 'organizer', 'admin'];
const VALID_USER_TYPES = ['visitor', 'volunteer', 'exhibitor', 'organizer'];
const VALID_FESTIVAL_STATUSES = ['draft', 'published', 'archived'];

function safeInt(value: string | undefined, fallback: number, min = 0): number {
  const parsed = parseInt(value || String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : Math.max(min, parsed);
}

const platformAdminRoutes = new Hono();

platformAdminRoutes.use('*', authMiddleware, requireRole(['admin']));

// ---------------------------------------------------------------------------
// GET /stats — platform-wide statistics
// ---------------------------------------------------------------------------
platformAdminRoutes.get('/stats', async (c) => {
  try {
    const usersByRole = db
      .select({ role: profiles.platformRole, count: sql<number>`count(*)` })
      .from(profiles)
      .groupBy(profiles.platformRole)
      .all();

    const festivalsByStatus = db
      .select({ status: festivals.status, count: sql<number>`count(*)` })
      .from(festivals)
      .groupBy(festivals.status)
      .all();

    const editionsCount = db.select({ count: sql<number>`count(*)` }).from(editions).get();

    const recentUsers = db
      .select()
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(5)
      .all();

    const recentFestivals = db
      .select()
      .from(festivals)
      .orderBy(desc(festivals.createdAt))
      .limit(5)
      .all();

    // Derive totals from group-by results
    const usersCount = usersByRole.reduce((sum, r) => sum + r.count, 0);
    const festivalsCount = festivalsByStatus.reduce((sum, s) => sum + s.count, 0);

    return c.json({
      success: true,
      data: {
        users_count: usersCount,
        festivals_count: festivalsCount,
        editions_count: editionsCount?.count ?? 0,
        users_by_role: Object.fromEntries(usersByRole.map((r) => [r.role, r.count])),
        festivals_by_status: Object.fromEntries(festivalsByStatus.map((s) => [s.status, s.count])),
        recent_users: recentUsers.map((u) => formatResponse(sanitizeUser(u))),
        recent_festivals: recentFestivals.map((f) => formatResponse(f)),
      },
    });
  } catch (error) {
    console.error('[platform-admin] Stats error:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

// ---------------------------------------------------------------------------
// USERS CRUD
// ---------------------------------------------------------------------------

platformAdminRoutes.get('/users', async (c) => {
  try {
    const search = c.req.query('search') || '';
    const role = c.req.query('role') || '';
    const limit = Math.min(safeInt(c.req.query('limit'), 50), 200);
    const offset = safeInt(c.req.query('offset'), 0);

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(profiles.email, `%${search}%`),
          like(profiles.username, `%${search}%`),
          like(profiles.displayName, `%${search}%`),
          like(profiles.firstName, `%${search}%`),
          like(profiles.lastName, `%${search}%`),
        ),
      );
    }
    if (role && VALID_PLATFORM_ROLES.includes(role)) {
      conditions.push(eq(profiles.platformRole, role));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const total = db
      .select({ count: sql<number>`count(*)` })
      .from(profiles)
      .where(where)
      .get();

    const users = db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: users.map((u) => formatResponse(sanitizeUser(u))),
      pagination: { total: total?.count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error('[platform-admin] List users error:', error);
    return c.json({ success: false, error: 'Failed to list users' }, 500);
  }
});

platformAdminRoutes.get('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    const memberships = db
      .select({
        festivalId: festivalMembers.festivalId,
        role: festivalMembers.role,
        festivalName: festivals.name,
        festivalSlug: festivals.slug,
      })
      .from(festivalMembers)
      .leftJoin(festivals, eq(festivals.id, festivalMembers.festivalId))
      .where(eq(festivalMembers.userId, id))
      .all();

    return c.json({
      success: true,
      data: {
        ...formatResponse(sanitizeUser(user)),
        memberships: memberships.map((m) => ({
          festival_id: m.festivalId,
          role: m.role,
          festival_name: m.festivalName,
          festival_slug: m.festivalSlug,
        })),
      },
    });
  } catch (error) {
    console.error('[platform-admin] Get user error:', error);
    return c.json({ success: false, error: 'Failed to get user' }, 500);
  }
});

platformAdminRoutes.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const user = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    if (body.platform_role && !VALID_PLATFORM_ROLES.includes(body.platform_role)) {
      return c.json({ success: false, error: 'Invalid platform_role' }, 400);
    }
    if (body.user_type && !VALID_USER_TYPES.includes(body.user_type)) {
      return c.json({ success: false, error: 'Invalid user_type' }, 400);
    }

    const allowedFields: Record<string, string> = {
      username: 'username',
      display_name: 'displayName',
      email: 'email',
      first_name: 'firstName',
      last_name: 'lastName',
      phone: 'phone',
      platform_role: 'platformRole',
      user_type: 'userType',
      bio: 'bio',
      locale: 'locale',
      timezone: 'timezone',
      email_verified: 'emailVerified',
    };

    const updateData: Record<string, unknown> = { updatedAt: now };
    for (const [bodyKey, schemaKey] of Object.entries(allowedFields)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    db.update(profiles).set(updateData).where(eq(profiles.id, id)).run();

    const updated = db.select().from(profiles).where(eq(profiles.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(sanitizeUser(updated)) : null });
  } catch (error) {
    console.error('[platform-admin] Update user error:', error);
    return c.json({ success: false, error: 'Failed to update user' }, 500);
  }
});

platformAdminRoutes.delete('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const adminId = c.get('userId');

    if (id === adminId) {
      return c.json({ success: false, error: 'Cannot delete your own account' }, 400);
    }

    const user = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    db.delete(festivalMembers).where(eq(festivalMembers.userId, id)).run();
    db.delete(exhibitorProfiles).where(eq(exhibitorProfiles.userId, id)).run();
    db.delete(profiles).where(eq(profiles.id, id)).run();

    return c.json({ success: true, data: { message: 'User deleted' } });
  } catch (error) {
    console.error('[platform-admin] Delete user error:', error);
    return c.json({ success: false, error: 'Failed to delete user' }, 500);
  }
});

// ---------------------------------------------------------------------------
// FESTIVALS CRUD
// ---------------------------------------------------------------------------

platformAdminRoutes.get('/festivals', async (c) => {
  try {
    const search = c.req.query('search') || '';
    const status = c.req.query('status') || '';
    const limit = Math.min(safeInt(c.req.query('limit'), 50), 200);
    const offset = safeInt(c.req.query('offset'), 0);

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(festivals.name, `%${search}%`),
          like(festivals.slug, `%${search}%`),
          like(festivals.city, `%${search}%`),
        ),
      );
    }
    if (status && VALID_FESTIVAL_STATUSES.includes(status)) {
      conditions.push(eq(festivals.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const total = db
      .select({ count: sql<number>`count(*)` })
      .from(festivals)
      .where(where)
      .get();

    const items = db
      .select()
      .from(festivals)
      .where(where)
      .orderBy(desc(festivals.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // Scope member count query to current page only
    const festivalIds = items.map((f) => f.id);
    const memberCounts = festivalIds.length > 0
      ? db
          .select({
            festivalId: festivalMembers.festivalId,
            count: sql<number>`count(*)`,
          })
          .from(festivalMembers)
          .where(inArray(festivalMembers.festivalId, festivalIds))
          .groupBy(festivalMembers.festivalId)
          .all()
      : [];

    const countMap = new Map(memberCounts.map((mc) => [mc.festivalId, mc.count]));

    return c.json({
      success: true,
      data: items.map((f) => ({
        ...formatResponse(f),
        member_count: countMap.get(f.id) ?? 0,
      })),
      pagination: { total: total?.count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error('[platform-admin] List festivals error:', error);
    return c.json({ success: false, error: 'Failed to list festivals' }, 500);
  }
});

platformAdminRoutes.get('/festivals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const festival = db.select().from(festivals).where(eq(festivals.id, id)).get();
    if (!festival) return c.json({ success: false, error: 'Festival not found' }, 404);

    const members = db
      .select({
        userId: festivalMembers.userId,
        role: festivalMembers.role,
        username: profiles.username,
        displayName: profiles.displayName,
        email: profiles.email,
      })
      .from(festivalMembers)
      .leftJoin(profiles, eq(profiles.id, festivalMembers.userId))
      .where(eq(festivalMembers.festivalId, id))
      .all();

    const editionsList = db
      .select()
      .from(editions)
      .where(eq(editions.festivalId, id))
      .all();

    return c.json({
      success: true,
      data: {
        ...formatResponse(festival),
        members: members.map((m) => ({
          user_id: m.userId,
          role: m.role,
          username: m.username,
          display_name: m.displayName,
          email: m.email,
        })),
        editions: editionsList.map((e) => formatResponse(e)),
      },
    });
  } catch (error) {
    console.error('[platform-admin] Get festival error:', error);
    return c.json({ success: false, error: 'Failed to get festival' }, 500);
  }
});

platformAdminRoutes.put('/festivals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const festival = db.select().from(festivals).where(eq(festivals.id, id)).get();
    if (!festival) return c.json({ success: false, error: 'Festival not found' }, 404);

    if (body.status && !VALID_FESTIVAL_STATUSES.includes(body.status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const allowedFields: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      status: 'status',
      city: 'city',
      country: 'country',
      address: 'address',
      website: 'website',
      contact_email: 'contactEmail',
    };

    const updateData: Record<string, unknown> = { updatedAt: now };
    for (const [bodyKey, schemaKey] of Object.entries(allowedFields)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(festivals).set(updateData).where(eq(festivals.id, id)).run();

    const updated = db.select().from(festivals).where(eq(festivals.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[platform-admin] Update festival error:', error);
    return c.json({ success: false, error: 'Failed to update festival' }, 500);
  }
});

platformAdminRoutes.delete('/festivals/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const festival = db.select().from(festivals).where(eq(festivals.id, id)).get();
    if (!festival) return c.json({ success: false, error: 'Festival not found' }, 404);

    // Batch delete related data in a single transaction
    const editionIds = db
      .select({ id: editions.id })
      .from(editions)
      .where(eq(editions.festivalId, id))
      .all()
      .map((e) => e.id);

    if (editionIds.length > 0) {
      db.delete(budgetEntries).where(inArray(budgetEntries.editionId, editionIds)).run();
    }

    db.delete(festivalMembers).where(eq(festivalMembers.festivalId, id)).run();
    db.delete(editions).where(eq(editions.festivalId, id)).run();
    db.delete(festivals).where(eq(festivals.id, id)).run();

    return c.json({ success: true, data: { message: 'Festival deleted' } });
  } catch (error) {
    console.error('[platform-admin] Delete festival error:', error);
    return c.json({ success: false, error: 'Failed to delete festival' }, 500);
  }
});

// ---------------------------------------------------------------------------
// SUPPORT TICKETS (cross-festival admin view)
// ---------------------------------------------------------------------------

platformAdminRoutes.get('/tickets', async (c) => {
  try {
    const status = c.req.query('status') || '';
    const priority = c.req.query('priority') || '';
    const limit = Math.min(safeInt(c.req.query('limit'), 50), 200);
    const offset = safeInt(c.req.query('offset'), 0);

    const conditions = [];
    if (status) conditions.push(eq(supportTickets.status, status));
    if (priority) conditions.push(eq(supportTickets.priority, priority));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const total = db.select({ count: sql<number>`count(*)` }).from(supportTickets).where(where).get();

    const rows = db.select().from(supportTickets)
      .where(where)
      .orderBy(desc(supportTickets.updatedAt))
      .limit(limit)
      .offset(offset)
      .all();

    const data = rows.map((t) => {
      const formatted = formatResponse(t) as Record<string, unknown>;
      if (t.userId) {
        const user = db.select({ displayName: profiles.displayName, username: profiles.username, email: profiles.email })
          .from(profiles).where(eq(profiles.id, t.userId)).get();
        formatted.user_name = user?.displayName || user?.username || null;
        formatted.user_email = user?.email || null;
      }
      if (t.assignedTo) {
        const assignee = db.select({ displayName: profiles.displayName, username: profiles.username })
          .from(profiles).where(eq(profiles.id, t.assignedTo)).get();
        formatted.assignee_name = assignee?.displayName || assignee?.username || null;
      }
      const msgCount = db.select({ count: sql<number>`count(*)` }).from(ticketMessages)
        .where(eq(ticketMessages.ticketId, t.id)).get();
      formatted.message_count = msgCount?.count ?? 0;
      // Get festival name
      const fest = db.select({ name: festivals.name, slug: festivals.slug })
        .from(festivals).where(eq(festivals.id, t.festivalId)).get();
      formatted.festival_name = fest?.name || null;
      formatted.festival_slug = fest?.slug || null;
      return formatted;
    });

    // Stats
    const allTickets = db.select({ status: supportTickets.status }).from(supportTickets).all();
    const statsByStatus: Record<string, number> = {};
    for (const t of allTickets) { statsByStatus[t.status ?? 'open'] = (statsByStatus[t.status ?? 'open'] || 0) + 1; }

    return c.json({
      success: true,
      data,
      stats: {
        total: total?.count ?? 0,
        by_status: statsByStatus,
      },
      pagination: { total: total?.count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error('[platform-admin] List tickets error:', error);
    return c.json({ success: false, error: 'Failed to list tickets' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /backups — list database backups (admin only)
// ---------------------------------------------------------------------------
platformAdminRoutes.get('/backups', async (c) => {
  try {
    const { listBackups } = await import('../lib/backup.js');
    const backups = listBackups();
    return c.json({ success: true, data: backups });
  } catch (error) {
    console.error('[admin] List backups error:', error);
    return c.json({ success: false, error: 'Failed to list backups' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /backups — trigger a manual backup (admin only)
// ---------------------------------------------------------------------------
platformAdminRoutes.post('/backups', async (c) => {
  try {
    const { performBackupSync } = await import('../lib/backup.js');
    const result = performBackupSync();
    if (result.success) {
      return c.json({ success: true, data: { message: 'Backup created', path: result.path, checksum: result.checksum } }, 201);
    }
    return c.json({ success: false, error: result.error || 'Backup failed' }, 500);
  } catch (error) {
    console.error('[admin] Manual backup error:', error);
    return c.json({ success: false, error: 'Failed to create backup' }, 500);
  }
});

export { platformAdminRoutes };
