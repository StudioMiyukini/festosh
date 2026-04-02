/**
 * Floor plan and floor plan element types for Festosh venue management.
 */

import type { FloorPlanElementType } from './enums';

/**
 * A floor plan canvas for an edition.
 * Contains visual layout data for the venue mapper.
 */
export interface FloorPlan {
  id: string;
  edition_id: string;
  /** Display name (e.g. "Main Hall", "Outdoor Area"). */
  name: string;
  /** Canvas width in pixels. */
  width_px: number;
  /** Canvas height in pixels. */
  height_px: number;
  /** Snap-grid size in pixels (0 = no grid). */
  grid_size: number;
  /** URL to a background image overlaid on the canvas. */
  background_url: string | null;
  /** Serialised canvas state from the editor (e.g. Fabric.js JSON). */
  canvas_data: Record<string, unknown> | null;
  /** Incrementing version number for optimistic concurrency. */
  version: number;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Position of an element on the floor plan canvas. */
export interface ElementPosition {
  x: number;
  y: number;
}

/** Dimensions of an element on the floor plan canvas. */
export interface ElementSize {
  width: number;
  height: number;
}

/**
 * A single element placed on a floor plan
 * (booth, stage, entrance, barrier, etc.).
 */
export interface FloorPlanElement {
  id: string;
  floor_plan_id: string;
  /** The kind of element. */
  type: FloorPlanElementType;
  /** Display label shown on the plan. */
  label: string | null;
  /** Position on the canvas. */
  position: ElementPosition;
  /** Rotation angle in degrees (0-360). */
  rotation: number;
  /** Width and height on the canvas. */
  size: ElementSize;
  /** Fill color (hex or CSS color string). */
  color: string | null;
  /** Stroke / border color. */
  stroke_color: string | null;
  /** Stroke width in pixels. */
  stroke_width: number | null;
  /** Opacity from 0 (transparent) to 1 (opaque). */
  opacity: number;
  /** Whether the element can be selected and moved in the editor. */
  is_locked: boolean;
  /** Optional reference to a related entity (booth id, venue id, etc.). */
  linked_entity_id: string | null;
  /** Additional metadata specific to the element type. */
  metadata: Record<string, unknown> | null;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp. */
  updated_at: string;
}
