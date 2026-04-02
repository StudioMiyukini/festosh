-- ============================================================================
-- Migration: 20260328000008_create_equipment_tables.sql
-- Description: Create equipment inventory and assignment tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- equipment_items: festival-level equipment inventory
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id     UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT,
  description     TEXT,
  unit            TEXT DEFAULT 'unit',
  total_quantity  INTEGER NOT NULL DEFAULT 1,
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.equipment_items IS 'Festival-level equipment inventory items';

CREATE INDEX idx_equipment_items_festival ON public.equipment_items (festival_id);
CREATE INDEX idx_equipment_items_category ON public.equipment_items (festival_id, category);

-- ---------------------------------------------------------------------------
-- equipment_assignments: assign equipment to entities for an edition
-- ---------------------------------------------------------------------------
CREATE TABLE public.equipment_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  edition_id       UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  -- Polymorphic assignment target (e.g. 'venue', 'booth', 'event', 'shift')
  assigned_to_type TEXT NOT NULL,
  assigned_to_id   UUID NOT NULL,
  -- Quantity assigned
  quantity         INTEGER NOT NULL DEFAULT 1,
  -- Status of the assignment
  status           TEXT NOT NULL DEFAULT 'reserved',
  -- Notes
  notes            TEXT,
  -- Metadata
  metadata         JSONB DEFAULT '{}'::JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.equipment_assignments IS 'Assign equipment items to venues, booths, events, or shifts for an edition';

CREATE INDEX idx_equipment_assignments_item    ON public.equipment_assignments (item_id);
CREATE INDEX idx_equipment_assignments_edition ON public.equipment_assignments (edition_id);
CREATE INDEX idx_equipment_assignments_target  ON public.equipment_assignments (assigned_to_type, assigned_to_id);
