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

/** Pricing mode for booth types / locations. */
export type PricingMode = 'flat' | 'per_day';

/** Equipment option on a booth type: included (free) or paid. */
export interface BoothEquipmentOption {
  item_id: string;
  included: boolean;
  price_cents: number;
}

/**
 * A booth type template defining default size, price, and options.
 */
export interface BoothType {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  width_m: number | null;
  depth_m: number | null;
  price_cents: number;
  pricing_mode: PricingMode;
  has_electricity: number;
  electricity_price_cents: number;
  has_water: number;
  water_price_cents: number;
  max_wattage: number | null;
  equipment_options: BoothEquipmentOption[] | null;
  color: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
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
  width_m: number | null;
  /** Depth in metres. */
  depth_m: number | null;
  /** Reference to booth type. */
  booth_type_id: string | null;
  /** Available utilities at the booth. */
  has_electricity: number;
  electricity_price_cents: number;
  has_water: number;
  water_price_cents: number;
  max_wattage: number | null;
  /** Price in the smallest currency unit (cents). */
  price_cents: number | null;
  /** flat = whole event, per_day = per day. */
  pricing_mode: PricingMode;
  /** List of equipment item IDs included with the booth. */
  equipment_included: string[] | null;
  /** Position on the floor plan canvas. */
  plan_position: PlanPosition | null;
  /** Whether the booth is available for reservation. */
  is_available: number;
  notes: string | null;
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
