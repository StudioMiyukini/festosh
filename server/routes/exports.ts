/**
 * CSV export routes for festival data.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  festivalMembers,
  profiles,
  boothApplications,
  exhibitorProfiles,
  events,
  shifts,
  shiftAssignments,
  volunteerRoles,
  budgetEntries,
  budgetCategories,
  editions,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';

const exportRoutes = new Hono();

// ---------------------------------------------------------------------------
// CSV helper
// ---------------------------------------------------------------------------

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map((v) => escape(v ?? '')).join(','));
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helper: get edition and verify festival membership for edition-scoped routes
// ---------------------------------------------------------------------------

async function getEditionFestivalId(editionId: string): Promise<string | null> {
  const edition = db
    .select({ festivalId: editions.festivalId })
    .from(editions)
    .where(eq(editions.id, editionId))
    .get();
  return edition?.festivalId ?? null;
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/members — export members CSV
// ---------------------------------------------------------------------------
exportRoutes.get(
  '/festival/:festivalId/members',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const members = db
        .select({
          displayName: profiles.displayName,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          email: profiles.email,
          role: festivalMembers.role,
          joinedAt: festivalMembers.joinedAt,
        })
        .from(festivalMembers)
        .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
        .where(eq(festivalMembers.festivalId, festivalId))
        .all();

      const headers = ['Nom', 'Email', 'Role', "Date d'inscription"];
      const rows = members.map((m) => [
        m.displayName || `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || '—',
        m.email ?? '',
        m.role ?? '',
        m.joinedAt ? new Date(m.joinedAt * 1000).toLocaleDateString('fr-FR') : '',
      ]);

      const csv = toCsv(headers, rows);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="membres.csv"');
      return c.body(csv);
    } catch (error) {
      console.error('[exports] Members CSV error:', error);
      return c.json({ success: false, error: 'Failed to export members' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/exhibitors — export exhibitor applications CSV
// ---------------------------------------------------------------------------
exportRoutes.get(
  '/edition/:editionId/exhibitors',
  authMiddleware,
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      // Verify festival membership at admin level
      const festivalId = await getEditionFestivalId(editionId);
      if (!festivalId) {
        return c.json({ success: false, error: 'Edition not found' }, 404);
      }

      const userId = c.get('userId');
      const membership = db
        .select({ role: festivalMembers.role })
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, userId),
          ),
        )
        .get();

      if (!membership || !['owner', 'admin'].includes(membership.role ?? '')) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }

      const applications = db
        .select({
          companyName: exhibitorProfiles.companyName,
          contactFirstName: exhibitorProfiles.contactFirstName,
          contactLastName: exhibitorProfiles.contactLastName,
          contactEmail: exhibitorProfiles.contactEmail,
          contactPhone: exhibitorProfiles.contactPhone,
          preferredZone: boothApplications.preferredZone,
          status: boothApplications.status,
        })
        .from(boothApplications)
        .innerJoin(
          exhibitorProfiles,
          eq(exhibitorProfiles.id, boothApplications.exhibitorId),
        )
        .where(eq(boothApplications.editionId, editionId))
        .all();

      const headers = ['Entreprise', 'Contact', 'Email', 'Telephone', 'Stand', 'Statut'];
      const rows = applications.map((a) => [
        a.companyName ?? '',
        `${a.contactFirstName ?? ''} ${a.contactLastName ?? ''}`.trim(),
        a.contactEmail ?? '',
        a.contactPhone ?? '',
        a.preferredZone ?? '',
        a.status ?? '',
      ]);

      const csv = toCsv(headers, rows);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="exposants.csv"');
      return c.body(csv);
    } catch (error) {
      console.error('[exports] Exhibitors CSV error:', error);
      return c.json({ success: false, error: 'Failed to export exhibitors' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/volunteers — export volunteer shifts CSV
// ---------------------------------------------------------------------------
exportRoutes.get(
  '/edition/:editionId/volunteers',
  authMiddleware,
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const festivalId = await getEditionFestivalId(editionId);
      if (!festivalId) {
        return c.json({ success: false, error: 'Edition not found' }, 404);
      }

      const userId = c.get('userId');
      const membership = db
        .select({ role: festivalMembers.role })
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, userId),
          ),
        )
        .get();

      if (!membership || !['owner', 'admin'].includes(membership.role ?? '')) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }

      const assignments = db
        .select({
          displayName: profiles.displayName,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
          email: profiles.email,
          shiftTitle: shifts.title,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          roleId: shifts.roleId,
        })
        .from(shiftAssignments)
        .innerJoin(shifts, eq(shifts.id, shiftAssignments.shiftId))
        .innerJoin(profiles, eq(profiles.id, shiftAssignments.userId))
        .where(eq(shifts.editionId, editionId))
        .all();

      // Fetch role names for mapping
      const roles = db
        .select({ id: volunteerRoles.id, name: volunteerRoles.name })
        .from(volunteerRoles)
        .where(eq(volunteerRoles.festivalId, festivalId))
        .all();
      const roleMap = new Map(roles.map((r) => [r.id, r.name ?? '']));

      const formatTime = (ts: number | null) =>
        ts ? new Date(ts * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      const formatDate = (ts: number | null) =>
        ts ? new Date(ts * 1000).toLocaleDateString('fr-FR') : '';

      const headers = ['Benevole', 'Email', 'Shift', 'Date', 'Horaire', 'Role'];
      const rows = assignments.map((a) => [
        a.displayName || `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || '—',
        a.email ?? '',
        a.shiftTitle ?? '',
        formatDate(a.startTime),
        `${formatTime(a.startTime)} - ${formatTime(a.endTime)}`,
        roleMap.get(a.roleId ?? '') ?? '',
      ]);

      const csv = toCsv(headers, rows);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="benevoles.csv"');
      return c.body(csv);
    } catch (error) {
      console.error('[exports] Volunteers CSV error:', error);
      return c.json({ success: false, error: 'Failed to export volunteers' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/budget — export budget entries CSV
// ---------------------------------------------------------------------------
exportRoutes.get(
  '/edition/:editionId/budget',
  authMiddleware,
  async (c) => {
    try {
      const editionId = c.req.param('editionId');

      const festivalId = await getEditionFestivalId(editionId);
      if (!festivalId) {
        return c.json({ success: false, error: 'Edition not found' }, 404);
      }

      const userId = c.get('userId');
      const membership = db
        .select({ role: festivalMembers.role })
        .from(festivalMembers)
        .where(
          and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.userId, userId),
          ),
        )
        .get();

      if (!membership || !['owner', 'admin'].includes(membership.role ?? '')) {
        return c.json({ success: false, error: 'Insufficient permissions' }, 403);
      }

      const entries = db
        .select({
          date: budgetEntries.date,
          description: budgetEntries.description,
          entryType: budgetEntries.entryType,
          amountCents: budgetEntries.amountCents,
          categoryId: budgetEntries.categoryId,
        })
        .from(budgetEntries)
        .where(eq(budgetEntries.editionId, editionId))
        .all();

      // Fetch category names
      const categories = db
        .select({ id: budgetCategories.id, name: budgetCategories.name })
        .from(budgetCategories)
        .where(eq(budgetCategories.festivalId, festivalId))
        .all();
      const catMap = new Map(categories.map((c) => [c.id, c.name ?? '']));

      const formatAmount = (cents: number | null) => {
        const val = (cents ?? 0) / 100;
        return val.toFixed(2).replace('.', ',');
      };

      const headers = ['Date', 'Categorie', 'Description', 'Type', 'Montant'];
      const rows = entries.map((e) => [
        e.date ?? '',
        catMap.get(e.categoryId ?? '') ?? '',
        e.description ?? '',
        e.entryType === 'income' ? 'Recette' : 'Depense',
        formatAmount(e.amountCents),
      ]);

      const csv = toCsv(headers, rows);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', 'attachment; filename="budget.csv"');
      return c.body(csv);
    } catch (error) {
      console.error('[exports] Budget CSV error:', error);
      return c.json({ success: false, error: 'Failed to export budget' }, 500);
    }
  },
);

export { exportRoutes };
