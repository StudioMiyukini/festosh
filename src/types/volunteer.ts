/**
 * Volunteer role, shift, and assignment types for Festosh.
 */

import type { ShiftStatus } from './enums';

/** A named role that volunteers can be assigned to. */
export interface VolunteerRole {
  id: string;
  festival_id: string;
  /** Display name for the role (e.g. "Security", "Hospitality"). */
  name: string;
  /** Short description of the role's responsibilities. */
  description: string | null;
  /** Hex color used for visual identification on schedules. */
  color: string | null;
}

/**
 * A time-bounded shift that needs to be staffed by volunteers.
 */
export interface Shift {
  id: string;
  edition_id: string;
  /** The volunteer role required for this shift. */
  role_id: string;
  /** Optional venue where the shift takes place. */
  venue_id: string | null;
  /** Short title for the shift. */
  title: string;
  /** Additional details or instructions. */
  description: string | null;
  /** ISO 8601 datetime when the shift starts. */
  start_time: string;
  /** ISO 8601 datetime when the shift ends. */
  end_time: string;
  /** How many volunteers are needed. */
  max_volunteers: number;
  /** Current status of the shift. */
  status: ShiftStatus;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** A volunteer assigned to a specific shift. */
export interface ShiftAssignment {
  id: string;
  shift_id: string;
  /** The volunteer's user id. */
  user_id: string;
  /** User id of the person who made the assignment. Null if self-assigned. */
  assigned_by: string | null;
  /** Optional notes about the assignment. */
  notes: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
}
