-- ============================================================================
-- Migration: 20260328000005_create_programming_tables.sql
-- Description: Create venues and events tables for festival programming
-- ============================================================================

-- ---------------------------------------------------------------------------
-- venues: physical locations within a festival (stages, halls, rooms)
-- ---------------------------------------------------------------------------
CREATE TABLE public.venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id     UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT,
  description     TEXT,
  capacity        INTEGER,
  -- Floor plan position
  plan_position   JSONB DEFAULT '{}'::JSONB,
  -- Address / location within the festival grounds
  location_notes  TEXT,
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.venues IS 'Physical locations within a festival (stages, halls, tents)';

CREATE INDEX idx_venues_festival ON public.venues (festival_id);
CREATE INDEX idx_venues_type     ON public.venues (festival_id, type);

-- ---------------------------------------------------------------------------
-- events: scheduled programming items within an edition
-- ---------------------------------------------------------------------------
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  venue_id        UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  -- Scheduling
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  -- Speakers / performers
  speakers        JSONB DEFAULT '[]'::JSONB,
  -- Tagging
  tags            TEXT[] DEFAULT '{}',
  -- Visibility
  is_public       BOOLEAN NOT NULL DEFAULT true,
  is_highlighted  BOOLEAN NOT NULL DEFAULT false,
  -- Media
  image_url       TEXT,
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS 'Scheduled programming items (concerts, talks, workshops) for an edition';

CREATE INDEX idx_events_edition   ON public.events (edition_id);
CREATE INDEX idx_events_venue     ON public.events (venue_id);
CREATE INDEX idx_events_times     ON public.events (edition_id, start_time, end_time);
CREATE INDEX idx_events_category  ON public.events (edition_id, category);
CREATE INDEX idx_events_public    ON public.events (edition_id, is_public) WHERE is_public = true;
CREATE INDEX idx_events_tags      ON public.events USING GIN (tags);
