/**
 * Festival, edition, and membership types for Festosh.
 */

import type { EditionStatus, FestivalRole, FestivalStatus } from './enums';

/** SMTP / email configuration for a festival. */
export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  encryption: 'tls' | 'ssl' | 'none';
}

/** Social media links associated with a festival. */
export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
  discord?: string;
}

/** Theme color settings for a festival's public pages. */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

/**
 * A festival is the top-level tenant entity.
 * Each festival can have multiple editions (yearly occurrences).
 */
export interface Festival {
  id: string;
  /** URL-safe unique identifier. */
  slug: string;
  name: string;
  description: string | null;
  /** URL to the festival logo. */
  logo_url: string | null;
  /** URL to the festival banner image. */
  banner_url: string | null;
  /** Custom theme colors for public pages. */
  theme_colors: ThemeColors | null;
  /** Venue / city name. */
  location_name: string | null;
  /** Full street address. */
  location_address: string | null;
  /** Latitude coordinate. */
  location_lat: number | null;
  /** Longitude coordinate. */
  location_lng: number | null;
  /** Contact email address. */
  contact_email: string | null;
  /** Social media and web links. */
  social_links: SocialLinks | null;
  /** Freeform tags for discovery and filtering. */
  tags: string[];
  /** Font family for public pages. */
  theme_font: string | null;
  /** Custom CSS for public pages. */
  custom_css: string | null;
  /** Header layout style. */
  header_style: string | null;
  /** SMTP / email configuration. */
  email_config: EmailConfig | null;
  /** Publication status. */
  status: FestivalStatus;
  /** User id of the festival creator. */
  created_by: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** A user's membership in a festival team. */
export interface FestivalMember {
  id: string;
  festival_id: string;
  user_id: string;
  /** Role within this festival. */
  role: FestivalRole;
  /** User id of the person who sent the invitation. */
  invited_by: string | null;
  /** ISO 8601 timestamp of when the user joined. */
  joined_at: string;
  /** Joined profile fields (returned by /members endpoint). */
  username?: string;
  display_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

/** Visitor opening hours for an edition day. */
export interface VisitorHours {
  /** Date in YYYY-MM-DD format. */
  date: string;
  /** Opening time in HH:MM format. */
  opens_at: string;
  /** Closing time in HH:MM format. */
  closes_at: string;
}

/**
 * An edition represents a single occurrence (e.g. a yearly event)
 * of a festival.
 */
export interface Edition {
  id: string;
  festival_id: string;
  /** Human-readable name (e.g. "2026 Edition"). */
  name: string;
  /** URL-safe identifier, unique within the festival. */
  slug: string;
  description: string | null;
  /** First day of the edition (YYYY-MM-DD). */
  start_date: string;
  /** Last day of the edition (YYYY-MM-DD). */
  end_date: string;
  /** Current lifecycle stage. */
  status: EditionStatus;
  /** ISO 8601 timestamp when registration opens. */
  registration_opens_at: string | null;
  /** ISO 8601 timestamp when registration closes. */
  registration_closes_at: string | null;
  /** Maximum number of attendees / exhibitors. */
  capacity: number | null;
  /** Per-day opening hours for visitors. */
  visitor_hours: VisitorHours[] | null;
  /** Whether this is the currently active edition for the festival. */
  is_active: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Payload for creating a new festival. */
export interface CreateFestivalInput {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  theme_colors?: ThemeColors | null;
  location_name?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  social_links?: SocialLinks | null;
  tags?: string[];
  status?: FestivalStatus;
}

/** Payload for updating an existing festival. All fields are optional. */
export type UpdateFestivalInput = Partial<CreateFestivalInput>;
