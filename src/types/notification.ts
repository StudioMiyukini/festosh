/**
 * Notification and festival favorite types for Festosh.
 */

import type { NotificationChannel } from './enums';

/**
 * A notification sent to a user, optionally scoped to a festival.
 */
export interface Notification {
  id: string;
  /** Recipient user id. */
  user_id: string;
  /** Festival the notification relates to. Null for platform-level notifications. */
  festival_id: string | null;
  /** Short notification title. */
  title: string;
  /** Notification body text. */
  body: string;
  /** Deep-link URL within the application. */
  link: string | null;
  /** Delivery channel. */
  channel: NotificationChannel;
  /** Whether the user has read this notification. */
  is_read: boolean;
  /** ISO 8601 timestamp of when the notification was read. */
  read_at: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/**
 * A user's "favourite" bookmark on a festival,
 * used for quick access and follow notifications.
 */
export interface FestivalFavorite {
  id: string;
  user_id: string;
  festival_id: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}
