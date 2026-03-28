/**
 * Venue and event (programming / schedule) types for Festosh.
 */

/** Position coordinates on a floor plan. */
export interface VenuePlanPosition {
  x: number;
  y: number;
}

/**
 * A physical or virtual venue within a festival
 * (stage, hall, room, outdoor area, etc.).
 */
export interface Venue {
  id: string;
  festival_id: string;
  name: string;
  description: string | null;
  /** Type of venue (e.g. "stage", "hall", "room", "outdoor"). */
  venue_type: string;
  /** Maximum capacity for this venue. */
  capacity: number | null;
  /** Position on the floor plan canvas. */
  plan_position: VenuePlanPosition | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** A speaker or performer participating in an event. */
export interface Speaker {
  name: string;
  bio?: string;
  photo_url?: string;
  url?: string;
}

/**
 * A scheduled event (talk, workshop, concert, etc.)
 * within an edition's programme.
 */
export interface Event {
  id: string;
  edition_id: string;
  /** Venue where the event takes place. Null for virtual events. */
  venue_id: string | null;
  title: string;
  description: string | null;
  /** Category for filtering (e.g. "concert", "workshop", "talk"). */
  category: string | null;
  /** ISO 8601 datetime when the event starts. */
  start_time: string;
  /** ISO 8601 datetime when the event ends. */
  end_time: string;
  /** Whether the event is listed on public pages. */
  is_public: boolean;
  /** URL to a promotional image. */
  image_url: string | null;
  /** Maximum number of participants (null = unlimited). */
  max_participants: number | null;
  /** Speakers or performers for this event. */
  speakers: Speaker[] | null;
  /** Freeform tags for filtering and discovery. */
  tags: string[] | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}
