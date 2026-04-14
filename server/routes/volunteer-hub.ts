/**
 * Volunteer hub — profile, applications, preferred actions.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  profiles, volunteerProfiles, volunteerApplications,
  festivals, editions,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const volunteerHubRoutes = new Hono();
volunteerHubRoutes.use('*', authMiddleware);

const VOLUNTEER_ACTIONS = [
  'accueil', 'guide', 'comptage', 'buvette', 'animation', 'soutien',
  'cuisine', 'crepes_gaufres', 'encaissement', 'montage_demontage',
  'decoration', 'communication', 'secretariat', 'securite', 'logistique',
  'technique_son_lumiere', 'photographe', 'infirmerie', 'parking',
  'nettoyage', 'vestiaire', 'billetterie', 'autre',
];

const ACTION_LABELS: Record<string, string> = {
  accueil: 'Accueil des visiteurs', guide: 'Guide', comptage: 'Comptage des visiteurs',
  buvette: 'Buvette', animation: 'Animation', soutien: 'Soutien general',
  cuisine: 'Cuisine', crepes_gaufres: 'Crepes et gaufres', encaissement: 'Encaissement',
  montage_demontage: 'Montage / Demontage', decoration: 'Decoration',
  communication: 'Communication', secretariat: 'Secretariat', securite: 'Securite',
  logistique: 'Logistique', technique_son_lumiere: 'Technique son/lumiere',
  photographe: 'Photographe / Videographe', infirmerie: 'Infirmerie / Secours',
  parking: 'Parking', nettoyage: 'Nettoyage', vestiaire: 'Vestiaire',
  billetterie: 'Billetterie / Controle', autre: 'Autre',
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS LIST
// ═══════════════════════════════════════════════════════════════════════════

volunteerHubRoutes.get('/actions', (c) => {
  return c.json({
    success: true,
    data: VOLUNTEER_ACTIONS.map((a) => ({ key: a, label: ACTION_LABELS[a] || a })),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE CRUD
// ═══════════════════════════════════════════════════════════════════════════

volunteerHubRoutes.get('/my-profile', async (c) => {
  try {
    const userId = c.get('userId');
    const vp = db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, userId)).get();
    return c.json({ success: true, data: vp ? formatResponse(vp, ['skills', 'certifications', 'availability', 'preferredActions']) : null });
  } catch (error) {
    console.error('[volunteer-hub] Get profile error:', error);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

volunteerHubRoutes.put('/my-profile', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, userId)).get();

    if (existing) {
      const keyMap: Record<string, string> = {
        skills: 'skills', certifications: 'certifications', availability: 'availability',
        constraints: 'constraints', is_pmr: 'isPmr', preferred_actions: 'preferredActions',
        bio: 'bio', emergency_contact_name: 'emergencyContactName',
        emergency_contact_phone: 'emergencyContactPhone', tshirt_size: 'tshirtSize',
        has_car: 'hasCar',
      };
      const update: Record<string, unknown> = { updatedAt: now };
      for (const [bk, sk] of Object.entries(keyMap)) {
        if (body[bk] !== undefined) {
          if (['skills', 'certifications', 'availability', 'preferredActions'].includes(sk)) {
            update[sk] = JSON.stringify(body[bk]);
          } else if (['isPmr', 'hasCar'].includes(sk)) {
            update[sk] = body[bk] ? 1 : 0;
          } else {
            update[sk] = body[bk];
          }
        }
      }
      db.update(volunteerProfiles).set(update).where(eq(volunteerProfiles.userId, userId)).run();
    } else {
      db.insert(volunteerProfiles).values({
        id: crypto.randomUUID(), userId,
        skills: JSON.stringify(body.skills || []),
        certifications: JSON.stringify(body.certifications || []),
        availability: JSON.stringify(body.availability || {}),
        constraints: body.constraints || null,
        isPmr: body.is_pmr ? 1 : 0,
        preferredActions: JSON.stringify(body.preferred_actions || []),
        bio: body.bio || null,
        emergencyContactName: body.emergency_contact_name || null,
        emergencyContactPhone: body.emergency_contact_phone || null,
        tshirtSize: body.tshirt_size || null,
        hasCar: body.has_car ? 1 : 0,
        createdAt: now, updatedAt: now,
      }).run();

      // Mark user as volunteer
      db.update(profiles).set({ isVolunteer: 1 }).where(eq(profiles.id, userId)).run();
    }

    const updated = db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, userId)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated, ['skills', 'certifications', 'availability', 'preferredActions']) : null });
  } catch (error) {
    console.error('[volunteer-hub] Update profile error:', error);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// APPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Apply to a festival as volunteer
volunteerHubRoutes.post('/apply/:festivalId', async (c) => {
  try {
    const userId = c.get('userId');
    const festivalId = c.req.param('festivalId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const vp = db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, userId)).get();
    if (!vp) return c.json({ success: false, error: 'Creez votre profil benevole d\'abord' }, 400);

    // Get active edition
    const edition = db.select().from(editions)
      .where(and(eq(editions.festivalId, festivalId), eq(editions.isActive, 1)))
      .get();

    const editionId = edition?.id || null;

    // Check not already applied
    if (editionId) {
      const existing = db.select().from(volunteerApplications)
        .where(and(eq(volunteerApplications.editionId, editionId), eq(volunteerApplications.userId, userId)))
        .get();
      if (existing) return c.json({ success: false, error: 'Vous avez deja postule pour cette edition' }, 409);
    }

    const id = crypto.randomUUID();
    db.insert(volunteerApplications).values({
      id, festivalId, editionId, userId, volunteerProfileId: vp.id,
      preferredActions: JSON.stringify(body.preferred_actions || []),
      availability: JSON.stringify(body.availability || {}),
      motivation: body.motivation || null,
      status: 'pending',
      createdAt: now, updatedAt: now,
    }).run();

    return c.json({ success: true, data: { id, message: 'Candidature benevole envoyee !' } }, 201);
  } catch (error) {
    console.error('[volunteer-hub] Apply error:', error);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

// My applications
volunteerHubRoutes.get('/my-applications', async (c) => {
  try {
    const userId = c.get('userId');
    const apps = db.select({
      id: volunteerApplications.id,
      festivalId: volunteerApplications.festivalId,
      status: volunteerApplications.status,
      createdAt: volunteerApplications.createdAt,
      festivalName: festivals.name,
      festivalSlug: festivals.slug,
      editionName: editions.name,
    })
      .from(volunteerApplications)
      .leftJoin(festivals, eq(festivals.id, volunteerApplications.festivalId))
      .leftJoin(editions, eq(editions.id, volunteerApplications.editionId))
      .where(eq(volunteerApplications.userId, userId))
      .orderBy(desc(volunteerApplications.createdAt))
      .all();

    return c.json({
      success: true,
      data: apps.map((a) => ({
        id: a.id, festival_id: a.festivalId, status: a.status,
        created_at: a.createdAt, festival_name: a.festivalName,
        festival_slug: a.festivalSlug, edition_name: a.editionName,
      })),
    });
  } catch (error) {
    console.error('[volunteer-hub] My applications error:', error);
    return c.json({ success: false, error: 'Failed' }, 500);
  }
});

export { volunteerHubRoutes, VOLUNTEER_ACTIONS, ACTION_LABELS };
