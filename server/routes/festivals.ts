/**
 * Festival CRUD routes.
 */

import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { geocodeAddress, buildGeoQuery } from '../lib/geocode.js';
import {
  festivals,
  festivalMembers,
  editions,
  profiles,
  boothApplications,
  events,
  shifts,
  shiftAssignments,
  budgetEntries,
  cmsPages,
  regulations,
  boothTypes,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const festivalRoutes = new Hono();

/** Generate a URL-safe slug from text. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ---------------------------------------------------------------------------
// GET / — list user's festivals
// ---------------------------------------------------------------------------
festivalRoutes.get('/', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const memberships = db
      .select({
        festival: festivals,
        role: festivalMembers.role,
        joinedAt: festivalMembers.joinedAt,
      })
      .from(festivalMembers)
      .innerJoin(festivals, eq(festivals.id, festivalMembers.festivalId))
      .where(eq(festivalMembers.userId, userId))
      .all();

    const data = memberships.map((m) => ({
      ...formatFestival(m.festival),
      member_role: m.role,
      joined_at: m.joinedAt,
    }));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[festivals] List error:', error);
    return c.json({ success: false, error: 'Failed to list festivals' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST / — create festival
// ---------------------------------------------------------------------------
festivalRoutes.post('/', authMiddleware, requireRole(['organizer', 'admin']), async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, description, city, country, tags } = body;

    if (!name) {
      return c.json({ success: false, error: 'Festival name is required' }, 400);
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = db
      .select()
      .from(festivals)
      .where(eq(festivals.slug, slug))
      .get();

    if (existing) {
      return c.json({ success: false, error: 'A festival with a similar name already exists' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const festivalId = crypto.randomUUID();
    const editionId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const currentYear = new Date().getFullYear();

    // Create festival
    db.insert(festivals)
      .values({
        id: festivalId,
        name,
        slug,
        description: description || null,
        city: city || null,
        country: country || 'FR',
        tags: JSON.stringify(tags || []),
        socialLinks: JSON.stringify({}),
        status: 'draft',
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Geocode city/country in background
    const geoQuery = buildGeoQuery({ city, country });
    if (geoQuery) {
      geocodeAddress(geoQuery, country).then((coords) => {
        if (coords) {
          db.update(festivals)
            .set({ latitude: coords.lat, longitude: coords.lng })
            .where(eq(festivals.id, festivalId))
            .run();
          console.log(`[geocode] ${name}: ${coords.lat}, ${coords.lng}`);
        }
      }).catch(() => {});
    }

    // Create first edition
    db.insert(editions)
      .values({
        id: editionId,
        festivalId,
        name: `${name} ${currentYear}`,
        slug: String(currentYear),
        status: 'planning',
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Add creator as owner
    db.insert(festivalMembers)
      .values({
        id: memberId,
        festivalId,
        userId,
        role: 'owner',
        joinedAt: now,
      })
      .run();

    const festival = db
      .select()
      .from(festivals)
      .where(eq(festivals.id, festivalId))
      .get();

    return c.json({
      success: true,
      data: formatFestival(festival!),
    }, 201);
  } catch (error) {
    console.error('[festivals] Create error:', error);
    return c.json({ success: false, error: 'Failed to create festival' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get festival by ID
// ---------------------------------------------------------------------------
festivalRoutes.get('/:id', async (c) => {
  try {
    const festivalId = c.req.param('id');

    const festival = db
      .select()
      .from(festivals)
      .where(eq(festivals.id, festivalId))
      .get();

    if (!festival) {
      return c.json({ success: false, error: 'Festival not found' }, 404);
    }

    return c.json({
      success: true,
      data: formatFestival(festival),
    });
  } catch (error) {
    console.error('[festivals] Get error:', error);
    return c.json({ success: false, error: 'Failed to fetch festival' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update festival
// ---------------------------------------------------------------------------
festivalRoutes.put(
  '/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      const updateData: Record<string, unknown> = { updatedAt: now };

      // Whitelist updatable fields
      // Map snake_case body keys to camelCase schema keys
      const keyMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        city: 'city',
        country: 'country',
        address: 'address',
        latitude: 'latitude',
        longitude: 'longitude',
        status: 'status',
        website: 'website',
        contact_email: 'contactEmail',
        logo_url: 'logoUrl',
        banner_url: 'bannerUrl',
        primary_color: 'themePrimaryColor',
        secondary_color: 'themeSecondaryColor',
        theme_font: 'themeFont',
        accent_color: 'themeAccentColor',
        bg_color: 'themeBgColor',
        text_color: 'themeTextColor',
        custom_css: 'customCss',
        header_style: 'headerStyle',
        org_name: 'orgName',
        org_type: 'orgType',
        org_siret: 'orgSiret',
        org_rna: 'orgRna',
        org_address: 'orgAddress',
        org_phone: 'orgPhone',
        org_email: 'orgEmail',
        org_iban: 'orgIban',
        org_insurance: 'orgInsurance',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      if (body.tags !== undefined) {
        updateData.tags = JSON.stringify(body.tags);
      }
      if (body.social_links !== undefined) {
        updateData.socialLinks = JSON.stringify(body.social_links);
      }
      if (body.email_config !== undefined) {
        updateData.emailConfig = JSON.stringify(body.email_config);
      }

      db.update(festivals)
        .set(updateData)
        .where(eq(festivals.id, festivalId))
        .run();

      // Auto-geocode if city/address/country changed and no manual lat/lng provided
      if ((body.city || body.address || body.country) && body.latitude === undefined) {
        const current = db.select().from(festivals).where(eq(festivals.id, festivalId)).get();
        const geoQuery = buildGeoQuery({
          address: body.address ?? current?.address,
          city: body.city ?? current?.city,
          country: body.country ?? current?.country,
        });
        if (geoQuery) {
          geocodeAddress(geoQuery, body.country ?? current?.country).then((coords) => {
            if (coords) {
              db.update(festivals)
                .set({ latitude: coords.lat, longitude: coords.lng })
                .where(eq(festivals.id, festivalId))
                .run();
              console.log(`[geocode] Updated ${festivalId}: ${coords.lat}, ${coords.lng}`);
            }
          }).catch(() => {});
        }
      }

      const updated = db
        .select()
        .from(festivals)
        .where(eq(festivals.id, festivalId))
        .get();

      return c.json({
        success: true,
        data: formatFestival(updated!),
      });
    } catch (error) {
      console.error('[festivals] Update error:', error);
      return c.json({ success: false, error: 'Failed to update festival' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id — delete festival
// ---------------------------------------------------------------------------
festivalRoutes.delete(
  '/:id',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');

      db.delete(festivals).where(eq(festivals.id, festivalId)).run();

      return c.json({ success: true, data: { message: 'Festival deleted' } });
    } catch (error) {
      console.error('[festivals] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete festival' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/members — list members
// ---------------------------------------------------------------------------
festivalRoutes.get(
  '/:id/members',
  authMiddleware,
  festivalMemberMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('id');

      const members = db
        .select({
          id: festivalMembers.id,
          user_id: festivalMembers.userId,
          role: festivalMembers.role,
          joined_at: festivalMembers.joinedAt,
          username: profiles.username,
          display_name: profiles.displayName,
          email: profiles.email,
          avatar_url: profiles.avatarUrl,
        })
        .from(festivalMembers)
        .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
        .where(eq(festivalMembers.festivalId, festivalId))
        .all();

      return c.json({ success: true, data: members });
    } catch (error) {
      console.error('[festivals] List members error:', error);
      return c.json({ success: false, error: 'Failed to list members' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/my-role — get current user's role in this festival
// ---------------------------------------------------------------------------
festivalRoutes.get('/:id/my-role', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('id');
    const userId = c.get('userId');

    const member = db
      .select()
      .from(festivalMembers)
      .where(
        and(
          eq(festivalMembers.festivalId, festivalId),
          eq(festivalMembers.userId, userId),
        ),
      )
      .get();

    return c.json({
      success: true,
      data: { role: member?.role ?? null },
    });
  } catch (error) {
    console.error('[festivals] Get my role error:', error);
    return c.json({ success: false, error: 'Failed to get role' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /:id/members — add member
// ---------------------------------------------------------------------------
festivalRoutes.post(
  '/:id/members',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const invitedBy = c.get('userId');
      const { user_id, role } = await c.req.json();

      if (!user_id || !role) {
        return c.json({ success: false, error: 'user_id and role are required' }, 400);
      }

      // Check if already a member
      const existing = db
        .select()
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, user_id),
          ),
        )
        .get();

      if (existing) {
        return c.json({ success: false, error: 'User is already a member' }, 409);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(festivalMembers)
        .values({
          id,
          festivalId,
          userId: user_id,
          role,
          invitedBy,
          joinedAt: now,
        })
        .run();

      return c.json({
        success: true,
        data: { id, festival_id: festivalId, user_id, role, joined_at: now },
      }, 201);
    } catch (error) {
      console.error('[festivals] Add member error:', error);
      return c.json({ success: false, error: 'Failed to add member' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id/members/:userId — remove member
// ---------------------------------------------------------------------------
festivalRoutes.delete(
  '/:id/members/:userId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('id');
      const targetUserId = c.req.param('userId');

      // Prevent removing the owner
      const membership = db
        .select()
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, targetUserId),
          ),
        )
        .get();

      if (!membership) {
        return c.json({ success: false, error: 'Member not found' }, 404);
      }

      if (membership.role === 'owner') {
        return c.json({ success: false, error: 'Cannot remove the festival owner' }, 403);
      }

      db.delete(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, targetUserId),
          ),
        )
        .run();

      return c.json({ success: true, data: { message: 'Member removed' } });
    } catch (error) {
      console.error('[festivals] Remove member error:', error);
      return c.json({ success: false, error: 'Failed to remove member' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/stats — dashboard statistics
// ---------------------------------------------------------------------------
festivalRoutes.get(
  '/:id/stats',
  authMiddleware,
  festivalMemberMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('id');

      // Find active edition (or first edition as fallback)
      const activeEdition = db
        .select()
        .from(editions)
        .where(and(eq(editions.festivalId, festivalId), eq(editions.isActive, 1)))
        .get();

      const edition = activeEdition || db
        .select()
        .from(editions)
        .where(eq(editions.festivalId, festivalId))
        .get();

      const editionId = edition?.id;

      // --- Members ---
      const allMembers = db
        .select({ role: festivalMembers.role })
        .from(festivalMembers)
        .where(eq(festivalMembers.festivalId, festivalId))
        .all();

      const membersByRole: Record<string, number> = {};
      for (const m of allMembers) {
        const role = m.role ?? 'unknown';
        membersByRole[role] = (membersByRole[role] || 0) + 1;
      }

      // --- Applications ---
      let applicationsTotal = 0;
      let applicationsSubmitted = 0;
      let applicationsApproved = 0;
      let applicationsRejected = 0;

      if (editionId) {
        const allApps = db
          .select({ status: boothApplications.status })
          .from(boothApplications)
          .where(eq(boothApplications.editionId, editionId))
          .all();

        applicationsTotal = allApps.length;
        for (const app of allApps) {
          if (app.status === 'submitted') applicationsSubmitted++;
          else if (app.status === 'approved') applicationsApproved++;
          else if (app.status === 'rejected') applicationsRejected++;
        }
      }

      // --- Events ---
      let eventsTotal = 0;
      if (editionId) {
        eventsTotal = db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.editionId, editionId))
          .all().length;
      }

      // --- Volunteers (shifts + assignments) ---
      let shiftsTotal = 0;
      let shiftsFilled = 0;
      let volunteersCount = 0;

      if (editionId) {
        shiftsTotal = db
          .select({ id: shifts.id })
          .from(shifts)
          .where(eq(shifts.editionId, editionId))
          .all().length;

        const allAssignments = db
          .select({ userId: shiftAssignments.userId, shiftId: shiftAssignments.shiftId })
          .from(shiftAssignments)
          .innerJoin(shifts, eq(shifts.id, shiftAssignments.shiftId))
          .where(eq(shifts.editionId, editionId))
          .all();

        shiftsFilled = allAssignments.length;
        const uniqueVolunteers = new Set(allAssignments.map((a) => a.userId));
        volunteersCount = uniqueVolunteers.size;
      }

      // --- Budget ---
      let incomeCents = 0;
      let expenseCents = 0;

      if (editionId) {
        const allEntries = db
          .select({ entryType: budgetEntries.entryType, amountCents: budgetEntries.amountCents })
          .from(budgetEntries)
          .where(eq(budgetEntries.editionId, editionId))
          .all();

        for (const entry of allEntries) {
          const amount = entry.amountCents ?? 0;
          if (entry.entryType === 'income') incomeCents += amount;
          else expenseCents += amount;
        }
      }

      // --- CMS Pages ---
      const allPages = db
        .select({ isPublished: cmsPages.isPublished })
        .from(cmsPages)
        .where(eq(cmsPages.festivalId, festivalId))
        .all();

      let pagesPublished = 0;
      let pagesDraft = 0;
      for (const p of allPages) {
        if (p.isPublished) pagesPublished++;
        else pagesDraft++;
      }

      return c.json({
        success: true,
        data: {
          members: {
            total: allMembers.length,
            by_role: membersByRole,
          },
          applications: {
            total: applicationsTotal,
            submitted: applicationsSubmitted,
            approved: applicationsApproved,
            rejected: applicationsRejected,
          },
          events: {
            total: eventsTotal,
          },
          volunteers: {
            shifts_total: shiftsTotal,
            shifts_filled: shiftsFilled,
            volunteers_count: volunteersCount,
          },
          budget: {
            income_cents: incomeCents,
            expense_cents: expenseCents,
            balance_cents: incomeCents - expenseCents,
          },
          cms_pages: {
            total: allPages.length,
            published: pagesPublished,
            draft: pagesDraft,
          },
        },
      });
    } catch (error) {
      console.error('[festivals] Stats error:', error);
      return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatFestival(f: typeof festivals.$inferSelect) {
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    description: f.description,
    logo_url: f.logoUrl,
    banner_url: f.bannerUrl,
    theme_colors: {
      primary: f.themePrimaryColor ?? '#6366f1',
      secondary: f.themeSecondaryColor ?? '#ec4899',
      accent: f.themeAccentColor ?? '#f59e0b',
      background: f.themeBgColor ?? '#ffffff',
      text: f.themeTextColor ?? '#111827',
    },
    theme_font: f.themeFont ?? 'Inter',
    custom_css: f.customCss ?? null,
    header_style: f.headerStyle ?? 'default',
    email_config: safeParseJson(f.emailConfig, null),
    location_name: f.city,
    location_address: f.address,
    location_lat: f.latitude,
    location_lng: f.longitude,
    city: f.city,
    country: f.country,
    website: f.website,
    contact_email: f.contactEmail,
    social_links: safeParseJson(f.socialLinks, {}),
    tags: safeParseJson(f.tags, []),
    status: f.status,
    created_by: f.createdBy,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// POST /geocode-all — batch geocode festivals without coordinates (admin)
// ---------------------------------------------------------------------------
festivalRoutes.post('/geocode-all', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const allFestivals = db.select().from(festivals).all();
    const toGeocode = allFestivals.filter((f) => !f.latitude && (f.city || f.address));

    let geocoded = 0;
    for (const festival of toGeocode) {
      const query = buildGeoQuery({ address: festival.address, city: festival.city, country: festival.country });
      if (!query) continue;

      const coords = await geocodeAddress(query, festival.country ?? undefined);
      if (coords) {
        db.update(festivals)
          .set({ latitude: coords.lat, longitude: coords.lng })
          .where(eq(festivals.id, festival.id))
          .run();
        geocoded++;
        console.log(`[geocode] ${festival.name}: ${coords.lat}, ${coords.lng}`);
      }
    }

    return c.json({
      success: true,
      data: { total: toGeocode.length, geocoded, skipped: toGeocode.length - geocoded },
    });
  } catch (error) {
    console.error('[festivals] Geocode all error:', error);
    return c.json({ success: false, error: 'Failed to geocode festivals' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/setup-status — check setup wizard progress
// ---------------------------------------------------------------------------
festivalRoutes.get('/:id/setup-status', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('id');

    const festival = db.select().from(festivals).where(eq(festivals.id, festivalId)).get();
    if (!festival) return c.json({ success: false, error: 'Not found' }, 404);

    // Count system pages
    const pagesCount = db.select({ count: sql`count(*)` }).from(cmsPages)
      .where(eq(cmsPages.festivalId, festivalId)).get() as any;

    // Count regulations
    const regsCount = db.select({ count: sql`count(*)` }).from(regulations)
      .where(eq(regulations.festivalId, festivalId)).get() as any;

    // Count booth types for active edition
    const activeEd = db.select().from(editions).where(and(eq(editions.festivalId, festivalId), eq(editions.isActive, 1))).get();
    let boothTypesCount = 0;
    if (activeEd) {
      const btc = db.select({ count: sql`count(*)` }).from(boothTypes)
        .where(eq(boothTypes.editionId, activeEd.id)).get() as any;
      boothTypesCount = btc?.count ?? 0;
    }

    return c.json({
      success: true,
      data: {
        has_info: !!(festival.name && festival.city),
        has_org: !!(festival.orgName && festival.orgSiret && festival.orgEmail),
        system_pages_count: pagesCount?.count ?? 0,
        regulations_count: regsCount?.count ?? 0,
        booth_types_count: boothTypesCount,
        is_published: festival.status === 'published',
      },
    });
  } catch (error) {
    console.error('[festivals] Setup status error:', error);
    return c.json({ success: false, error: 'Failed to get setup status' }, 500);
  }
});

export { festivalRoutes };
