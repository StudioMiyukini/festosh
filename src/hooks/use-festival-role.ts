import { useMemo } from 'react';
import { useTenantStore } from '@/stores/tenant-store';
import type { FestivalRole } from '@/types/enums';

/** Role hierarchy - higher index = more permissions */
const ROLE_HIERARCHY: FestivalRole[] = [
  'exhibitor',
  'volunteer',
  'moderator',
  'editor',
  'admin',
  'owner',
];

/**
 * Hook to check current user's festival role and permissions.
 * Must be used within a festival context (sub-site).
 */
export function useFestivalRole() {
  const { userRole, isFestivalContext } = useTenantStore();

  return useMemo(() => {
    const roleIndex = userRole ? ROLE_HIERARCHY.indexOf(userRole) : -1;

    return {
      role: userRole,
      isFestivalContext,
      isMember: roleIndex >= 0,
      isExhibitor: userRole === 'exhibitor',
      isVolunteer: userRole === 'volunteer' || roleIndex >= ROLE_HIERARCHY.indexOf('volunteer'),
      isModerator: roleIndex >= ROLE_HIERARCHY.indexOf('moderator'),
      isEditor: roleIndex >= ROLE_HIERARCHY.indexOf('editor'),
      isAdmin: roleIndex >= ROLE_HIERARCHY.indexOf('admin'),
      isOwner: userRole === 'owner',

      /** Check if user has at least a given role level */
      hasRole: (minRole: FestivalRole): boolean => {
        if (!userRole) return false;
        const minIndex = ROLE_HIERARCHY.indexOf(minRole);
        return roleIndex >= minIndex;
      },
    };
  }, [userRole, isFestivalContext]);
}
