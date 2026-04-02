/**
 * Equipment inventory and assignment types for Festosh.
 */

/**
 * An item in the festival's equipment inventory.
 * Tracked at the festival level and assigned per edition.
 */
export interface EquipmentItem {
  id: string;
  festival_id: string;
  /** Name of the equipment (e.g. "Folding Table", "Extension Cord"). */
  name: string;
  /** Detailed description of the item. */
  description: string | null;
  /** Grouping category (e.g. "furniture", "electrical", "signage"). */
  category: string | null;
  /** Unit of measure (e.g. "piece", "metre", "box"). */
  unit: string;
  /** URL to a photo of the item. */
  photo_url: string | null;
  /** Total quantity owned by the festival. */
  total_quantity: number;
  /** Name of the owner (person or company). */
  owner_name: string | null;
  /** Value in cents. */
  value_cents: number;
  /** How the item was acquired: owned, loaned, rented. */
  acquisition_type: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** An equipment owner associated with a festival. */
export interface EquipmentOwner {
  id: string;
  festival_id: string;
  name: string;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** The entity type that equipment can be assigned to. */
export type EquipmentAssignedToType = 'booth' | 'venue' | 'event' | 'shift';

/**
 * A record of equipment assigned to a specific entity
 * (booth, venue, event, or shift) for an edition.
 */
export interface EquipmentAssignment {
  id: string;
  /** References EquipmentItem.id. */
  item_id: string;
  edition_id: string;
  /** The type of entity receiving the equipment. */
  assigned_to_type: EquipmentAssignedToType;
  /** The id of the entity receiving the equipment. */
  assigned_to_id: string;
  /** Number of units assigned. */
  quantity: number;
  /** Status of the assignment (e.g. "reserved", "delivered", "returned"). */
  status: string;
  /** Additional notes about the assignment. */
  notes: string | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}
