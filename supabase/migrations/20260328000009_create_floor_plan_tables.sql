-- ============================================================================
-- Migration: 20260328000009_create_floor_plan_tables.sql
-- Description: Create floor plan tables for visual venue/booth layout
-- ============================================================================

-- ---------------------------------------------------------------------------
-- floor_plans: versioned floor plan canvases for an edition
-- ---------------------------------------------------------------------------
CREATE TABLE public.floor_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  -- Canvas dimensions in pixels
  width_px        INTEGER NOT NULL DEFAULT 1920,
  height_px       INTEGER NOT NULL DEFAULT 1080,
  -- Grid configuration
  grid_size       INTEGER NOT NULL DEFAULT 20,
  show_grid       BOOLEAN NOT NULL DEFAULT true,
  -- Background image (e.g. satellite photo or architectural plan)
  background_url  TEXT,
  -- Full canvas state (elements, positions, styles)
  canvas_data     JSONB NOT NULL DEFAULT '{"elements": []}'::JSONB,
  -- Versioning
  version         INTEGER NOT NULL DEFAULT 1,
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.floor_plans IS 'Visual floor plan canvases for edition venue/booth layout';

CREATE INDEX idx_floor_plans_edition ON public.floor_plans (edition_id);
CREATE INDEX idx_floor_plans_version ON public.floor_plans (edition_id, version);
