import type { PlatformRole, UserType, FestivalStatus } from '@/types/enums';

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  user: 'Utilisateur',
  organizer: 'Organisateur',
  admin: 'Administrateur',
};

export const PLATFORM_ROLE_COLORS: Record<PlatformRole, string> = {
  user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  organizer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  visitor: 'Visiteur',
  volunteer: 'Benevole',
  exhibitor: 'Exposant',
  organizer: 'Organisateur',
};

export const FESTIVAL_STATUS_LABELS: Record<FestivalStatus, string> = {
  draft: 'Brouillon',
  published: 'Publie',
  archived: 'Archive',
};

export const FESTIVAL_STATUS_COLORS: Record<FestivalStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
