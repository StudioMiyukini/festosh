/**
 * Budget category and entry types for Festosh financial tracking.
 */

import type { BudgetEntryType } from './enums';

/** A budget category used to group income or expense entries. */
export interface BudgetCategory {
  id: string;
  festival_id: string;
  /** Display name (e.g. "Sponsorship", "Catering", "Staffing"). */
  name: string;
  /** Whether this category groups income or expense entries. */
  entry_type: BudgetEntryType;
  /** Hex color for charts and visual grouping. */
  color: string | null;
  /** Display order within its entry type. */
  sort_order: number;
}

/**
 * A single budget line item (income or expense)
 * attached to an edition.
 */
export interface BudgetEntry {
  id: string;
  edition_id: string;
  /** Category this entry belongs to. */
  category_id: string;
  /** Whether this is an income or expense entry. */
  entry_type: BudgetEntryType;
  /** Short description of the line item. */
  description: string;
  /** Amount in the smallest currency unit (cents). */
  amount_cents: number;
  /** Date of the transaction (YYYY-MM-DD). */
  date: string;
  /** URL to an uploaded receipt or invoice. */
  receipt_url: string | null;
  /** Payment method used (e.g. "card", "bank_transfer", "cash"). */
  payment_method: string | null;
  /** Additional free-text notes. */
  notes: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}
