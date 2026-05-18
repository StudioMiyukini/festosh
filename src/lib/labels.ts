import type { PlatformRole, UserType, FestivalStatus } from '@/types/enums';

// Record types are widened to `Record<string, string>` so callers can index
// safely with API-derived strings (e.g. a `role` field whose runtime value
// hasn't been refined to a literal union). Missing keys fall through to
// `undefined`, which callers handle with `?? role`.

export const PLATFORM_ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  organizer: 'Organisateur',
  admin: 'Administrateur',
} satisfies Record<PlatformRole, string>;

export const PLATFORM_ROLE_COLORS: Record<string, string> = {
  user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  organizer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
} satisfies Record<PlatformRole, string>;

export const USER_TYPE_LABELS: Record<string, string> = {
  visitor: 'Visiteur',
  volunteer: 'Benevole',
  exhibitor: 'Exposant',
  organizer: 'Organisateur',
} satisfies Record<UserType, string>;

export const FESTIVAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publie',
  archived: 'Archive',
} satisfies Record<FestivalStatus, string>;

export const FESTIVAL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
} satisfies Record<FestivalStatus, string>;
