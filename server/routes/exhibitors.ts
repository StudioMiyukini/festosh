/**
 * Exhibitor routes — profiles, booth locations, and applications.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  exhibitorProfiles,
  boothTypes,
  boothLocations,
  boothApplications,
  editions,
  festivalMembers,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole, hasMinRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const exhibitorRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatExhibitorProfile(p: typeof exhibitorProfiles.$inferSelect) {
  return formatResponse(p, ['socialLinks']);
}

function formatBoothLocation(loc: typeof boothLocations.$inferSelect) {
  return formatResponse(loc, ['planPosition', 'equipmentIncluded']);
}

function formatApplication(app: typeof boothApplications.$inferSelect) {
  return formatResponse(app, ['documents']);
}

// ---------------------------------------------------------------------------
// GET /profile — get current user's exhibitor profile
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const profile = db
      .select()
      .from(exhibitorProfiles)
      .where(eq(exhibitorProfiles.userId, userId))
      .get();

    if (!profile) {
      return c.json({ success: true, data: null });
    }

    return c.json({ success: true, data: formatExhibitorProfile(profile) });
  } catch (error) {
    console.error('[exhibitors] Get profile error:', error);
    return c.json({ success: false, error: 'Failed to fetch exhibitor profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /profile — create or update exhibitor profile
// ---------------------------------------------------------------------------
exhibitorRoutes.post('/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db
      .select()
      .from(exhibitorProfiles)
      .where(eq(exhibitorProfiles.userId, userId))
      .get();

    if (existing) {
      // Update
      const updateData: Record<string, unknown> = { updatedAt: now };
      const fields = [
        'companyName', 'tradeName', 'activityType', 'category', 'description',
        'logoUrl', 'photoUrl', 'website', 'legalForm', 'siret', 'vatNumber',
        'contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone',
        'addressLine1', 'addressLine2', 'postalCode', 'city', 'country',
      ];

      const keyMap: Record<string, string> = {
        company_name: 'companyName',
        trade_name: 'tradeName',
        activity_type: 'activityType',
        category: 'category',
        description: 'description',
        logo_url: 'logoUrl',
        photo_url: 'photoUrl',
        website: 'website',
        legal_form: 'legalForm',
        siret: 'siret',
        vat_number: 'vatNumber',
        contact_first_name: 'contactFirstName',
        contact_last_name: 'contactLastName',
        contact_email: 'contactEmail',
        contact_phone: 'contactPhone',
        address_line1: 'addressLine1',
        address_line2: 'addressLine2',
        postal_code: 'postalCode',
        city: 'city',
        country: 'country',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      if (body.social_links !== undefined) {
        updateData.socialLinks = JSON.stringify(body.social_links);
      }

      db.update(exhibitorProfiles)
        .set(updateData)
        .where(eq(exhibitorProfiles.userId, userId))
        .run();

      const updated = db
        .select()
        .from(exhibitorProfiles)
        .where(eq(exhibitorProfiles.userId, userId))
        .get();

      return c.json({ success: true, data: formatExhibitorProfile(updated!) });
    } else {
      // Create
      const id = crypto.randomUUID();

      db.insert(exhibitorProfiles)
        .values({
          id,
          userId,
          companyName: body.company_name || null,
          tradeName: body.trade_name || null,
          activityType: body.activity_type || null,
          category: body.category || null,
          description: body.description || null,
          logoUrl: body.logo_url || null,
          photoUrl: body.photo_url || null,
          website: body.website || null,
          socialLinks: JSON.stringify(body.social_links || {}),
          legalForm: body.legal_form || null,
          siret: body.siret || null,
          vatNumber: body.vat_number || null,
          contactFirstName: body.contact_first_name || null,
          contactLastName: body.contact_last_name || null,
          contactEmail: body.contact_email || null,
          contactPhone: body.contact_phone || null,
          addressLine1: body.address_line1 || null,
          addressLine2: body.address_line2 || null,
          postalCode: body.postal_code || null,
          city: body.city || null,
          country: body.country || 'FR',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const profile = db
        .select()
        .from(exhibitorProfiles)
        .where(eq(exhibitorProfiles.id, id))
        .get();

      return c.json({ success: true, data: formatExhibitorProfile(profile!) }, 201);
    }
  } catch (error) {
    console.error('[exhibitors] Create/update profile error:', error);
    return c.json({ success: false, error: 'Failed to save exhibitor profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/profiles — list exhibitor profiles for a festival
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/festival/:festivalId/profiles', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    // Get all exhibitor profiles that have an approved application for this festival's editions
    const { sqlite } = await import('../db/index.js');
    const rows = sqlite.prepare(`
      SELECT DISTINCT ep.* FROM exhibitor_profiles ep
      INNER JOIN booth_applications ba ON ba.exhibitor_id = ep.id
      INNER JOIN editions e ON e.id = ba.edition_id
      WHERE e.festival_id = ? AND ba.status = 'approved'
    `).all(festivalId) as Array<Record<string, unknown>>;

    // If no approved applications, return all profiles (for admin view)
    if (rows.length === 0) {
      const allProfiles = db
        .select()
        .from(exhibitorProfiles)
        .all();
      // Filter by profiles that have applications for this festival
      const festRows = sqlite.prepare(`
        SELECT DISTINCT ep.* FROM exhibitor_profiles ep
        INNER JOIN booth_applications ba ON ba.exhibitor_id = ep.id
        INNER JOIN editions e ON e.id = ba.edition_id
        WHERE e.festival_id = ?
      `).all(festivalId) as Array<Record<string, unknown>>;

      const formatted = festRows.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (['social_links'].includes(snakeKey) && typeof value === 'string') {
            try { obj[snakeKey] = JSON.parse(value); } catch { obj[snakeKey] = value; }
          } else {
            obj[snakeKey] = value;
          }
        }
        return obj;
      });
      return c.json({ success: true, data: formatted });
    }

    const formatted = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (['social_links'].includes(snakeKey) && typeof value === 'string') {
          try { obj[snakeKey] = JSON.parse(value); } catch { obj[snakeKey] = value; }
        } else {
          obj[snakeKey] = value;
        }
      }
      return obj;
    });

    return c.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[exhibitors] List profiles error:', error);
    return c.json({ success: false, error: 'Failed to list exhibitor profiles' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/booths — list booth locations for a festival
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/festival/:festivalId/booths', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const { sqlite } = await import('../db/index.js');

    const rows = sqlite.prepare(`
      SELECT bl.* FROM booth_locations bl
      INNER JOIN editions e ON e.id = bl.edition_id
      WHERE e.festival_id = ?
    `).all(festivalId) as Array<Record<string, unknown>>;

    const formatted = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (['plan_position', 'equipment_included'].includes(snakeKey) && typeof value === 'string') {
          try { obj[snakeKey] = JSON.parse(value); } catch { obj[snakeKey] = value; }
        } else {
          obj[snakeKey] = value;
        }
      }
      return obj;
    });

    return c.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[exhibitors] List booths error:', error);
    return c.json({ success: false, error: 'Failed to list booth locations' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/booth-types — list booth types
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/edition/:editionId/booth-types', async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const types = db.select().from(boothTypes).where(eq(boothTypes.editionId, editionId)).all();
    return c.json({ success: true, data: types.map((t) => formatResponse(t, ['equipmentOptions'])) });
  } catch (error) {
    console.error('[exhibitors] List booth types error:', error);
    return c.json({ success: false, error: 'Failed to list booth types' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/booth-types — create booth type
// ---------------------------------------------------------------------------
exhibitorRoutes.post('/edition/:editionId/booth-types', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const body = await c.req.json();

    if (!body.name) {
      return c.json({ success: false, error: 'Type name is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(boothTypes).values({
      id,
      editionId,
      name: body.name,
      description: body.description || null,
      widthM: body.width_m || null,
      depthM: body.depth_m || null,
      priceCents: body.price_cents ?? 0,
      pricingMode: body.pricing_mode || 'flat',
      hasElectricity: body.has_electricity ? 1 : 0,
      electricityPriceCents: body.electricity_price_cents ?? 0,
      hasWater: body.has_water ? 1 : 0,
      waterPriceCents: body.water_price_cents ?? 0,
      maxWattage: body.max_wattage || null,
      equipmentOptions: body.equipment_options ? JSON.stringify(body.equipment_options) : null,
      color: body.color || '#6366f1',
      sortOrder: body.sort_order || 0,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(boothTypes).where(eq(boothTypes.id, id)).get();
    return c.json({ success: true, data: created ? formatResponse(created, ['equipmentOptions']) : null }, 201);
  } catch (error) {
    console.error('[exhibitors] Create booth type error:', error);
    return c.json({ success: false, error: 'Failed to create booth type' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /booth-types/:id — update booth type
// ---------------------------------------------------------------------------
exhibitorRoutes.put('/booth-types/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(boothTypes).where(eq(boothTypes.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Booth type not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      width_m: 'widthM',
      depth_m: 'depthM',
      price_cents: 'priceCents',
      pricing_mode: 'pricingMode',
      max_wattage: 'maxWattage',
      electricity_price_cents: 'electricityPriceCents',
      water_price_cents: 'waterPriceCents',
      color: 'color',
      sort_order: 'sortOrder',
      is_active: 'isActive',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }
    // Boolean fields
    if (body.has_electricity !== undefined) updateData.hasElectricity = body.has_electricity ? 1 : 0;
    if (body.has_water !== undefined) updateData.hasWater = body.has_water ? 1 : 0;
    // JSON field
    if (body.equipment_options !== undefined) updateData.equipmentOptions = JSON.stringify(body.equipment_options);

    db.update(boothTypes).set(updateData).where(eq(boothTypes.id, id)).run();
    const updated = db.select().from(boothTypes).where(eq(boothTypes.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated, ['equipmentOptions']) : null });
  } catch (error) {
    console.error('[exhibitors] Update booth type error:', error);
    return c.json({ success: false, error: 'Failed to update booth type' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /booth-types/:id — delete booth type
// ---------------------------------------------------------------------------
exhibitorRoutes.delete('/booth-types/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(boothTypes).where(eq(boothTypes.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Booth type not found' }, 404);
    }
    db.delete(boothTypes).where(eq(boothTypes.id, id)).run();
    return c.json({ success: true, data: { message: 'Booth type deleted' } });
  } catch (error) {
    console.error('[exhibitors] Delete booth type error:', error);
    return c.json({ success: false, error: 'Failed to delete booth type' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/locations — get booth locations
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/edition/:editionId/locations', async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const locations = db
      .select()
      .from(boothLocations)
      .where(eq(boothLocations.editionId, editionId))
      .all();

    const data = locations.map((loc) => formatBoothLocation(loc));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[exhibitors] List locations error:', error);
    return c.json({ success: false, error: 'Failed to list booth locations' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/locations/public — booth locations with occupant info (public)
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/edition/:editionId/locations/public', async (c) => {
  try {
    const editionId = c.req.param('editionId');

    // Get all booth locations
    const locations = db
      .select()
      .from(boothLocations)
      .where(eq(boothLocations.editionId, editionId))
      .all();

    // Get all approved+paid applications for this edition to find occupants
    const applications = db
      .select()
      .from(boothApplications)
      .where(and(
        eq(boothApplications.editionId, editionId),
        eq(boothApplications.status, 'approved'),
      ))
      .all();

    // Build occupant map: boothId -> { exhibitor name, profile id, is_paid }
    const occupantMap = new Map();
    for (const app of applications) {
      if (!app.assignedBoothId) continue;
      const profile = db
        .select()
        .from(exhibitorProfiles)
        .where(eq(exhibitorProfiles.id, app.exhibitorId))
        .get();
      if (profile) {
        occupantMap.set(app.assignedBoothId, {
          exhibitor_name: profile.companyName,
          exhibitor_id: profile.id,
          is_paid: app.isPaid === 1,
        });
      }
    }

    const data = locations.map((loc) => {
      const formatted = formatBoothLocation(loc);
      const occupant = occupantMap.get(loc.id);
      return {
        ...formatted,
        occupant: occupant || null,
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[exhibitors] List public locations error:', error);
    return c.json({ success: false, error: 'Failed to list booth locations' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/locations — create booth location
// ---------------------------------------------------------------------------
exhibitorRoutes.post('/edition/:editionId/locations', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const body = await c.req.json();
    const { code, zone, width_m, depth_m, has_electricity, has_water, price_cents, notes, booth_type_id, pricing_mode, electricity_price_cents, water_price_cents } = body;

    if (!code) {
      return c.json({ success: false, error: 'Booth code is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(boothLocations)
      .values({
        id,
        editionId,
        code,
        zone: zone || null,
        widthM: width_m || null,
        depthM: depth_m || null,
        hasElectricity: has_electricity ? 1 : 0,
        electricityPriceCents: electricity_price_cents ?? 0,
        hasWater: has_water ? 1 : 0,
        waterPriceCents: water_price_cents ?? 0,
        priceCents: price_cents || 0,
        boothTypeId: booth_type_id || null,
        pricingMode: pricing_mode || 'flat',
        notes: notes || null,
        isAvailable: 1,
        equipmentIncluded: JSON.stringify(body.equipment_included || []),
        planPosition: JSON.stringify(body.plan_position || {}),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const location = db.select().from(boothLocations).where(eq(boothLocations.id, id)).get();

    return c.json({
      success: true,
      data: formatBoothLocation(location!),
    }, 201);
  } catch (error) {
    console.error('[exhibitors] Create location error:', error);
    return c.json({ success: false, error: 'Failed to create booth location' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /locations/:id — update location
// ---------------------------------------------------------------------------
exhibitorRoutes.put('/locations/:id', authMiddleware, async (c) => {
  try {
    const locationId = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const location = db.select().from(boothLocations).where(eq(boothLocations.id, locationId)).get();
    if (!location) {
      return c.json({ success: false, error: 'Booth location not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      code: 'code',
      zone: 'zone',
      width_m: 'widthM',
      depth_m: 'depthM',
      has_electricity: 'hasElectricity',
      electricity_price_cents: 'electricityPriceCents',
      has_water: 'hasWater',
      water_price_cents: 'waterPriceCents',
      price_cents: 'priceCents',
      booth_type_id: 'boothTypeId',
      pricing_mode: 'pricingMode',
      is_available: 'isAvailable',
      notes: 'notes',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        // Convert booleans to int for SQLite
        if (typeof body[bodyKey] === 'boolean') {
          updateData[schemaKey] = body[bodyKey] ? 1 : 0;
        } else {
          updateData[schemaKey] = body[bodyKey];
        }
      }
    }

    if (body.plan_position !== undefined) {
      updateData.planPosition = JSON.stringify(body.plan_position);
    }
    if (body.equipment_included !== undefined) {
      updateData.equipmentIncluded = JSON.stringify(body.equipment_included);
    }

    db.update(boothLocations).set(updateData).where(eq(boothLocations.id, locationId)).run();

    const updated = db.select().from(boothLocations).where(eq(boothLocations.id, locationId)).get();

    return c.json({
      success: true,
      data: formatBoothLocation(updated!),
    });
  } catch (error) {
    console.error('[exhibitors] Update location error:', error);
    return c.json({ success: false, error: 'Failed to update booth location' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /locations/:id — delete location
// ---------------------------------------------------------------------------
exhibitorRoutes.delete('/locations/:id', authMiddleware, async (c) => {
  try {
    const locationId = c.req.param('id');

    const location = db.select().from(boothLocations).where(eq(boothLocations.id, locationId)).get();
    if (!location) {
      return c.json({ success: false, error: 'Booth location not found' }, 404);
    }

    db.delete(boothLocations).where(eq(boothLocations.id, locationId)).run();

    return c.json({ success: true, data: { message: 'Booth location deleted' } });
  } catch (error) {
    console.error('[exhibitors] Delete location error:', error);
    return c.json({ success: false, error: 'Failed to delete booth location' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/applications — list applications (moderator+)
// ---------------------------------------------------------------------------
exhibitorRoutes.get('/edition/:editionId/applications', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const applications = db
      .select()
      .from(boothApplications)
      .where(eq(boothApplications.editionId, editionId))
      .all();

    const data = applications.map((app) => formatApplication(app));

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[exhibitors] List applications error:', error);
    return c.json({ success: false, error: 'Failed to list applications' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/apply — submit application
// ---------------------------------------------------------------------------
exhibitorRoutes.post('/edition/:editionId/apply', authMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const userId = c.get('userId');
    const body = await c.req.json();

    // Get exhibitor profile
    const profile = db
      .select()
      .from(exhibitorProfiles)
      .where(eq(exhibitorProfiles.userId, userId))
      .get();

    if (!profile) {
      return c.json({ success: false, error: 'You need an exhibitor profile first' }, 400);
    }

    // Check for existing application
    const existing = db
      .select()
      .from(boothApplications)
      .where(
        and(
          eq(boothApplications.editionId, editionId),
          eq(boothApplications.exhibitorId, profile.id),
        ),
      )
      .get();

    if (existing) {
      return c.json({ success: false, error: 'You already have an application for this edition' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(boothApplications)
      .values({
        id,
        editionId,
        exhibitorId: profile.id,
        preferredZone: body.preferred_zone || null,
        requestedWidthM: body.requested_width_m || null,
        requestedDepthM: body.requested_depth_m || null,
        needsElectricity: body.needs_electricity ? 1 : 0,
        needsWater: body.needs_water ? 1 : 0,
        specialRequests: body.special_requests || null,
        productsDescription: body.products_description || null,
        status: 'submitted',
        documents: JSON.stringify(body.documents || {}),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const application = db
      .select()
      .from(boothApplications)
      .where(eq(boothApplications.id, id))
      .get();

    return c.json({
      success: true,
      data: formatApplication(application!),
    }, 201);
  } catch (error) {
    console.error('[exhibitors] Apply error:', error);
    return c.json({ success: false, error: 'Failed to submit application' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /applications/:id/status — update application status
// ---------------------------------------------------------------------------
exhibitorRoutes.put('/applications/:id/status', authMiddleware, async (c) => {
  try {
    const applicationId = c.req.param('id');
    const userId = c.get('userId');
    const { status, review_notes } = await c.req.json();

    if (!status) {
      return c.json({ success: false, error: 'Status is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    db.update(boothApplications)
      .set({
        status,
        reviewedBy: userId,
        reviewedAt: now,
        reviewNotes: review_notes || null,
        updatedAt: now,
      })
      .where(eq(boothApplications.id, applicationId))
      .run();

    const updated = db
      .select()
      .from(boothApplications)
      .where(eq(boothApplications.id, applicationId))
      .get();

    if (!updated) {
      return c.json({ success: false, error: 'Application not found' }, 404);
    }

    return c.json({
      success: true,
      data: formatApplication(updated),
    });
  } catch (error) {
    console.error('[exhibitors] Update status error:', error);
    return c.json({ success: false, error: 'Failed to update application status' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /applications/:id/assign-booth — assign booth
// ---------------------------------------------------------------------------
exhibitorRoutes.put('/applications/:id/assign-booth', authMiddleware, async (c) => {
  try {
    const applicationId = c.req.param('id');
    const { booth_location_id } = await c.req.json();

    if (!booth_location_id) {
      return c.json({ success: false, error: 'booth_location_id is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Verify booth exists
    const booth = db
      .select()
      .from(boothLocations)
      .where(eq(boothLocations.id, booth_location_id))
      .get();

    if (!booth) {
      return c.json({ success: false, error: 'Booth location not found' }, 404);
    }

    // Assign booth and mark as no longer available
    db.update(boothApplications)
      .set({
        assignedBoothId: booth_location_id,
        updatedAt: now,
      })
      .where(eq(boothApplications.id, applicationId))
      .run();

    db.update(boothLocations)
      .set({ isAvailable: 0, updatedAt: now })
      .where(eq(boothLocations.id, booth_location_id))
      .run();

    const updated = db
      .select()
      .from(boothApplications)
      .where(eq(boothApplications.id, applicationId))
      .get();

    return c.json({
      success: true,
      data: formatApplication(updated!),
    });
  } catch (error) {
    console.error('[exhibitors] Assign booth error:', error);
    return c.json({ success: false, error: 'Failed to assign booth' }, 500);
  }
});

export { exhibitorRoutes };
