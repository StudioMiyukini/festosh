/**
 * Custom roles & permissions management for festivals.
 * Organisateurs (owner/admin) create roles with granular permissions,
 * then assign them to volunteers/members.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { customRoles, festivalMembers, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const customRoleRoutes = new Hono();

// All available permissions
const ALL_PERMISSIONS = [
  // CMS
  { key: 'cms.view', label: 'Voir le contenu CMS', group: 'CMS' },
  { key: 'cms.edit', label: 'Modifier les pages', group: 'CMS' },
  // Programme
  { key: 'programme.view', label: 'Voir la programmation', group: 'Programme' },
  { key: 'programme.edit', label: 'Modifier les evenements', group: 'Programme' },
  // Exposants
  { key: 'exhibitors.view', label: 'Voir les exposants', group: 'Exposants' },
  { key: 'exhibitors.manage', label: 'Gerer les candidatures', group: 'Exposants' },
  { key: 'exhibitors.assign_booths', label: 'Attribuer les stands', group: 'Exposants' },
  // Benevoles
  { key: 'volunteers.view', label: 'Voir les benevoles', group: 'Benevoles' },
  { key: 'volunteers.manage', label: 'Gerer les shifts', group: 'Benevoles' },
  // Budget
  { key: 'budget.view', label: 'Voir le budget', group: 'Budget' },
  { key: 'budget.edit', label: 'Modifier le budget', group: 'Budget' },
  // Billetterie
  { key: 'ticketing.view', label: 'Voir les ventes de billets', group: 'Billetterie' },
  { key: 'ticketing.scan', label: 'Scanner les billets', group: 'Billetterie' },
  { key: 'ticketing.manage', label: 'Gerer les types de billets', group: 'Billetterie' },
  // Sponsors
  { key: 'sponsors.view', label: 'Voir les sponsors', group: 'Sponsors' },
  { key: 'sponsors.manage', label: 'Gerer les sponsors', group: 'Sponsors' },
  // Gamification
  { key: 'gamification.view', label: 'Voir la gamification', group: 'Gamification' },
  { key: 'gamification.manage', label: 'Gerer tampons/badges/chasses', group: 'Gamification' },
  // Votes & Tombola
  { key: 'votes.view', label: 'Voir les votes', group: 'Votes' },
  { key: 'votes.manage', label: 'Gerer les categories de votes', group: 'Votes' },
  { key: 'raffles.view', label: 'Voir les tombolas', group: 'Tombola' },
  { key: 'raffles.manage', label: 'Gerer et tirer au sort', group: 'Tombola' },
  // QR Codes
  { key: 'qr.view', label: 'Voir les QR codes', group: 'QR Codes' },
  { key: 'qr.manage', label: 'Creer/gerer les QR codes', group: 'QR Codes' },
  { key: 'qr.scan', label: 'Scanner les QR codes', group: 'QR Codes' },
  // Artistes
  { key: 'artists.view', label: 'Voir les artistes', group: 'Artistes' },
  { key: 'artists.manage', label: 'Gerer les artistes', group: 'Artistes' },
  // Files d'attente
  { key: 'queues.view', label: 'Voir les files d\'attente', group: 'Files d\'attente' },
  { key: 'queues.manage', label: 'Gerer les files (appeler/servir)', group: 'Files d\'attente' },
  // Reservations
  { key: 'reservations.view', label: 'Voir les reservations', group: 'Reservations' },
  { key: 'reservations.manage', label: 'Gerer les creneaux', group: 'Reservations' },
  // Materiel
  { key: 'equipment.view', label: 'Voir le materiel', group: 'Materiel' },
  { key: 'equipment.manage', label: 'Gerer le materiel', group: 'Materiel' },
  // Analytics
  { key: 'analytics.view', label: 'Voir les statistiques', group: 'Analytics' },
  // Marketplace
  { key: 'marketplace.view', label: 'Voir les commandes', group: 'Marketplace' },
  { key: 'marketplace.manage', label: 'Gerer les commandes', group: 'Marketplace' },
  // Parametres
  { key: 'settings.view', label: 'Voir les parametres', group: 'Parametres' },
  { key: 'settings.edit', label: 'Modifier les parametres', group: 'Parametres' },
  // Membres
  { key: 'members.view', label: 'Voir les membres', group: 'Membres' },
  { key: 'members.manage', label: 'Gerer les membres et roles', group: 'Membres' },
];

// ═══════════════════════════════════════════════════════════════════════════
// GET /permissions — list all available permissions
// ═══════════════════════════════════════════════════════════════════════════

customRoleRoutes.get('/permissions', (c) => {
  // Group permissions
  const grouped: Record<string, { key: string; label: string }[]> = {};
  for (const perm of ALL_PERMISSIONS) {
    if (!grouped[perm.group]) grouped[perm.group] = [];
    grouped[perm.group].push({ key: perm.key, label: perm.label });
  }
  return c.json({ success: true, data: { permissions: ALL_PERMISSIONS, grouped } });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROLES CRUD (owner/admin only)
// ═══════════════════════════════════════════════════════════════════════════

// List roles for a festival
customRoleRoutes.get(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const editionId = c.req.query('edition_id');

      const conditions = [eq(customRoles.festivalId, festivalId)];
      if (editionId) {
        // Show festival-wide roles + edition-specific roles
      }

      const roles = db.select().from(customRoles)
        .where(eq(customRoles.festivalId, festivalId))
        .orderBy(customRoles.sortOrder)
        .all();

      // Count members per role
      const result = roles.map((role) => {
        const memberCount = db.select({ id: festivalMembers.id })
          .from(festivalMembers)
          .where(and(
            eq(festivalMembers.festivalId, festivalId),
            eq(festivalMembers.customRoleId, role.id),
          ))
          .all().length;

        return {
          ...formatResponse(role, ['permissions']),
          member_count: memberCount,
        };
      });

      return c.json({ success: true, data: result });
    } catch (error) {
      console.error('[custom-roles] List error:', error);
      return c.json({ success: false, error: 'Failed to list roles' }, 500);
    }
  },
);

// Create a custom role
customRoleRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();

      if (!body.name?.trim()) {
        return c.json({ success: false, error: 'Role name is required' }, 400);
      }

      // Validate permissions
      const validKeys = new Set(ALL_PERMISSIONS.map((p) => p.key));
      const permissions: string[] = (body.permissions || []).filter((p: string) => validKeys.has(p));

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(customRoles).values({
        id,
        festivalId,
        editionId: body.edition_id || null,
        name: body.name.trim(),
        description: body.description || null,
        color: body.color || '#6b7280',
        permissions: JSON.stringify(permissions),
        isDefault: body.is_default ? 1 : 0,
        sortOrder: body.sort_order ?? 0,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(customRoles).where(eq(customRoles.id, id)).get();
      return c.json({ success: true, data: created ? formatResponse(created, ['permissions']) : null }, 201);
    } catch (error) {
      console.error('[custom-roles] Create error:', error);
      return c.json({ success: false, error: 'Failed to create role' }, 500);
    }
  },
);

// Update a custom role
customRoleRoutes.put(
  '/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();

      const role = db.select().from(customRoles).where(eq(customRoles.id, id)).get();
      if (!role) return c.json({ success: false, error: 'Role not found' }, 404);

      const now = Math.floor(Date.now() / 1000);
      const update: Record<string, unknown> = { updatedAt: now };

      if (body.name !== undefined) update.name = body.name.trim();
      if (body.description !== undefined) update.description = body.description;
      if (body.color !== undefined) update.color = body.color;
      if (body.edition_id !== undefined) update.editionId = body.edition_id;
      if (body.is_default !== undefined) update.isDefault = body.is_default ? 1 : 0;
      if (body.sort_order !== undefined) update.sortOrder = body.sort_order;

      if (body.permissions !== undefined) {
        const validKeys = new Set(ALL_PERMISSIONS.map((p) => p.key));
        const permissions = (body.permissions || []).filter((p: string) => validKeys.has(p));
        update.permissions = JSON.stringify(permissions);
      }

      db.update(customRoles).set(update).where(eq(customRoles.id, id)).run();
      const updated = db.select().from(customRoles).where(eq(customRoles.id, id)).get();

      return c.json({ success: true, data: updated ? formatResponse(updated, ['permissions']) : null });
    } catch (error) {
      console.error('[custom-roles] Update error:', error);
      return c.json({ success: false, error: 'Failed to update role' }, 500);
    }
  },
);

// Delete a custom role
customRoleRoutes.delete(
  '/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');

      // Unassign members from this role
      db.update(festivalMembers)
        .set({ customRoleId: null })
        .where(eq(festivalMembers.customRoleId, id))
        .run();

      db.delete(customRoles).where(eq(customRoles.id, id)).run();

      return c.json({ success: true, data: { message: 'Role deleted' } });
    } catch (error) {
      console.error('[custom-roles] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete role' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER ROLE ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════

// List members with their roles
customRoleRoutes.get(
  '/festival/:festivalId/members',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');

      const members = db
        .select({
          id: festivalMembers.id,
          userId: festivalMembers.userId,
          role: festivalMembers.role,
          customRoleId: festivalMembers.customRoleId,
          joinedAt: festivalMembers.joinedAt,
          username: profiles.username,
          displayName: profiles.displayName,
          email: profiles.email,
          avatarUrl: profiles.avatarUrl,
        })
        .from(festivalMembers)
        .leftJoin(profiles, eq(profiles.id, festivalMembers.userId))
        .where(eq(festivalMembers.festivalId, festivalId))
        .all();

      // Get all custom roles for enrichment
      const roles = db.select().from(customRoles).where(eq(customRoles.festivalId, festivalId)).all();
      const roleMap = new Map(roles.map((r) => [r.id, r]));

      return c.json({
        success: true,
        data: members.map((m) => {
          const customRole = m.customRoleId ? roleMap.get(m.customRoleId) : null;
          return {
            id: m.id,
            user_id: m.userId,
            username: m.username,
            display_name: m.displayName,
            email: m.email,
            avatar_url: m.avatarUrl,
            base_role: m.role,
            custom_role_id: m.customRoleId,
            custom_role_name: customRole?.name || null,
            custom_role_color: customRole?.color || null,
            permissions: (() => { try { return customRole ? JSON.parse(customRole.permissions as string) : []; } catch { return []; } })(),
            joined_at: m.joinedAt,
          };
        }),
      });
    } catch (error) {
      console.error('[custom-roles] List members error:', error);
      return c.json({ success: false, error: 'Failed to list members' }, 500);
    }
  },
);

// Assign a custom role to a member
customRoleRoutes.put(
  '/festival/:festivalId/members/:memberId/role',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const memberId = c.req.param('memberId');
      const body = await c.req.json();

      const member = db.select().from(festivalMembers).where(eq(festivalMembers.id, memberId)).get();
      if (!member) return c.json({ success: false, error: 'Member not found' }, 404);

      const update: Record<string, unknown> = {};

      // Update base role if provided
      if (body.base_role !== undefined) {
        const validRoles = ['owner', 'admin', 'editor', 'moderator', 'volunteer', 'exhibitor'];
        if (!validRoles.includes(body.base_role)) {
          return c.json({ success: false, error: 'Invalid base role' }, 400);
        }
        update.role = body.base_role;
      }

      // Update custom role if provided
      if (body.custom_role_id !== undefined) {
        if (body.custom_role_id === null) {
          update.customRoleId = null;
        } else {
          const role = db.select().from(customRoles).where(eq(customRoles.id, body.custom_role_id)).get();
          if (!role) return c.json({ success: false, error: 'Custom role not found' }, 404);
          update.customRoleId = body.custom_role_id;
        }
      }

      if (Object.keys(update).length === 0) {
        return c.json({ success: false, error: 'No changes provided' }, 400);
      }

      db.update(festivalMembers).set(update).where(eq(festivalMembers.id, memberId)).run();

      return c.json({ success: true, data: { message: 'Role updated' } });
    } catch (error) {
      console.error('[custom-roles] Assign role error:', error);
      return c.json({ success: false, error: 'Failed to assign role' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// CHECK PERMISSION (utility for other routes)
// ═══════════════════════════════════════════════════════════════════════════

// GET /check — check if current user has a specific permission in a festival
customRoleRoutes.get(
  '/festival/:festivalId/check',
  authMiddleware,
  async (c) => {
    try {
      const userId = c.get('userId');
      const festivalId = c.req.param('festivalId');
      const permission = c.req.query('permission');

      if (!permission) return c.json({ success: false, error: 'permission query param required' }, 400);

      // Platform admins have all permissions
      const platformRole = c.get('userRole');
      if (platformRole === 'admin') {
        return c.json({ success: true, data: { has_permission: true, reason: 'platform_admin' } });
      }

      const member = db.select().from(festivalMembers)
        .where(and(eq(festivalMembers.festivalId, festivalId), eq(festivalMembers.userId, userId)))
        .get();

      if (!member) {
        return c.json({ success: true, data: { has_permission: false, reason: 'not_member' } });
      }

      // Owner and admin have all permissions
      if (member.role === 'owner' || member.role === 'admin') {
        return c.json({ success: true, data: { has_permission: true, reason: 'base_role' } });
      }

      // Check custom role permissions
      if (member.customRoleId) {
        const role = db.select().from(customRoles).where(eq(customRoles.id, member.customRoleId)).get();
        if (role) {
          let perms: string[] = [];
          try { perms = JSON.parse(role.permissions as string); } catch { /* ignore */ }
          if (perms.includes(permission)) {
            return c.json({ success: true, data: { has_permission: true, reason: 'custom_role', role_name: role.name } });
          }
        }
      }

      return c.json({ success: true, data: { has_permission: false, reason: 'no_permission' } });
    } catch (error) {
      console.error('[custom-roles] Check permission error:', error);
      return c.json({ success: false, error: 'Failed to check permission' }, 500);
    }
  },
);

export { customRoleRoutes };
