/**
 * Exhibitor profiles, booth locations, and application types for Festosh.
 */

import type { ApplicationStatus } from './enums';

/**
 * An exhibitor's company / artisan profile.
 * One profile per user, reusable across editions.
 */
export interface ExhibitorProfile {
  id: string;
  user_id: string;
  /** Company or brand name. */
  company_name: string;
  /** Legal entity name (may differ from company_name). */
  legal_name: string | null;
  /** Short description shown publicly. */
  description: string | null;
  /** URL to the exhibitor's logo. */
  logo_url: string | null;
  /** URL to the exhibitor's website. */
  website_url: string | null;
  /** VAT or tax identification number. */
  vat_number: string | null;
  /** SIRET / business registration number. */
  siret: string | null;
  /** Primary contact email. */
  contact_email: string;
  /** Primary contact phone number. */
  contact_phone: string | null;
  /** Street address line. */
  address_line1: string | null;
  /** Additional address line. */
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Utility flags describing booth amenities. */
export interface BoothUtilities {
  electricity: boolean;
  water: boolean;
  wifi: boolean;
}

/** Position coordinates on a floor plan. */
export interface PlanPosition {
  x: number;
  y: number;
}

/**
 * A physical booth location within an edition's floor plan.
 */
export interface BoothLocation {
  id: string;
  edition_id: string;
  /** Short code displayed on the plan (e.g. "A12"). */
  code: string;
  /** Zone or area grouping (e.g. "Hall A"). */
  zone: string | null;
  /** Width in metres. */
  width: number | null;
  /** Depth in metres. */
  depth: number | null;
  /** Available utilities at the booth. */
  utilities: BoothUtilities | null;
  /** Price in the smallest currency unit (cents). */
  price_cents: number | null;
  /** List of equipment included with the booth. */
  equipment_included: string[] | null;
  /** Position on the floor plan canvas. */
  plan_position: PlanPosition | null;
  /** Whether the booth is available for reservation. */
  is_available: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** A document attached to a booth application. */
export interface ApplicationDocument {
  name: string;
  url: string;
  /** MIME type of the document. */
  mime_type: string;
  /** File size in bytes. */
  size_bytes: number;
}

/**
 * An exhibitor's application for a booth at a specific edition.
 */
export interface BoothApplication {
  id: string;
  edition_id: string;
  /** References ExhibitorProfile.id. */
  exhibitor_id: string;
  /** Free-text booth or zone preferences from the applicant. */
  preferences: string | null;
  /** Current review status. */
  status: ApplicationStatus;
  /** User id of the reviewer. */
  reviewed_by: string | null;
  /** ISO 8601 timestamp of the review. */
  reviewed_at: string | null;
  /** Internal notes from the review team. */
  review_notes: string | null;
  /** Booth assigned upon approval. */
  assigned_booth_id: string | null;
  /** Total amount due in cents. */
  payment_amount_cents: number | null;
  /** Whether payment has been received. */
  payment_received: boolean;
  /** ISO 8601 timestamp of payment receipt. */
  payment_received_at: string | null;
  /** Attached supporting documents. */
  documents: ApplicationDocument[] | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}
