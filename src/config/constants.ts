/** Application-wide constants for Festosh. */

export const APP_NAME = "Festosh" as const;

export const DEFAULT_LOCALE = "fr" as const;

/** Platform-level roles (across all festivals). */
export const PLATFORM_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
} as const;

export type PlatformRole =
  (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

/** Festival-level roles (within a specific festival). */
export const FESTIVAL_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  VOLUNTEER: "volunteer",
  VIEWER: "viewer",
} as const;

export type FestivalRole =
  (typeof FESTIVAL_ROLES)[keyof typeof FESTIVAL_ROLES];

/** Festival role hierarchy (lower index = higher privilege). */
export const FESTIVAL_ROLE_HIERARCHY: readonly FestivalRole[] = [
  FESTIVAL_ROLES.OWNER,
  FESTIVAL_ROLES.ADMIN,
  FESTIVAL_ROLES.MANAGER,
  FESTIVAL_ROLES.VOLUNTEER,
  FESTIVAL_ROLES.VIEWER,
] as const;

/** Pagination defaults. */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

/** Supported locales. */
export const SUPPORTED_LOCALES = ["fr", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
