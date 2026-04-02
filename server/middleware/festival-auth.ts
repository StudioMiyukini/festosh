/**
 * Festival-level authorization middleware.
 * Checks membership and role within a specific festival.
 */

import type { MiddlewareHandler } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { festivalMembers } from '../db/schema.js';

// Role hierarchy from highest to lowest privilege
const ROLE_HIERARCHY: string[] = [
  'owner',
  'admin',
  'editor',
  'moderator',
  'volunteer',
  'exhibitor',
];

/**
 * Check if `userRole` is at least as privileged as `minRole`.
 */
export function hasMinRole(userRole: string, minRole: string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const minIndex = ROLE_HIERARCHY.indexOf(minRole);
  if (userIndex === -1 || minIndex === -1) return false;
  return userIndex <= minIndex; // lower index = higher privilege
}

// ---------------------------------------------------------------------------
// festivalMemberMiddleware — reads festival_id from route params, checks membership
// ---------------------------------------------------------------------------
export const festivalMemberMiddleware: MiddlewareHandler = async (c, next) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  // Try multiple param names for flexibility
  const festivalId =
    c.req.param('festivalId') ||
    c.req.param('festival_id') ||
    c.req.param('id');

  if (!festivalId) {
    return c.json({ success: false, error: 'Festival ID is required' }, 400);
  }

  // Check platform admin bypass
  const platformRole = c.get('userRole');
  if (platformRole === 'admin') {
    c.set('festivalRole', 'owner'); // platform admins get full access
    await next();
    return;
  }

  const membership = db
    .select()
    .from(festivalMembers)
    .where(
      and(
        eq(festivalMembers.festivalId, festivalId),
        eq(festivalMembers.userId, userId),
      ),
    )
    .get();

  if (!membership) {
    return c.json({ success: false, error: 'You are not a member of this festival' }, 403);
  }

  c.set('festivalRole', membership.role ?? 'exhibitor');
  await next();
};

// ---------------------------------------------------------------------------
// requireFestivalRole — checks if user has one of the specified roles
// ---------------------------------------------------------------------------
export function requireFestivalRole(minRoles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const festivalRole = c.get('festivalRole');
    if (!festivalRole) {
      return c.json({ success: false, error: 'Festival membership required' }, 403);
    }

    // Check if user's role is at least as privileged as any of the required roles
    const hasAccess = minRoles.some((minRole) => hasMinRole(festivalRole, minRole));
    if (!hasAccess) {
      return c.json({ success: false, error: 'Insufficient festival permissions' }, 403);
    }

    await next();
  };
}
