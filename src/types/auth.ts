/**
 * Authentication and session types for Festosh.
 */

import type { PlatformRole } from './enums';

/** Application session. */
export interface Session {
  /** JWT token */
  token: string;
  /** The authenticated user. */
  user: AuthUser;
}

/** Authenticated user combining auth data with the Festosh profile. */
export interface AuthUser {
  /** User id (uuid). */
  id: string;
  /** Email address. */
  email: string;
  /** Username. */
  username: string;
  /** Display name chosen by the user. */
  display_name: string | null;
  /** URL to the user's avatar image. */
  avatar_url: string | null;
  /** Platform-wide role. */
  platform_role: PlatformRole;
  /** ISO 8601 timestamp of account creation. */
  created_at: string;
  /** ISO 8601 timestamp of the last profile update. */
  updated_at: string;
}
