-- ============================================================================
-- Migration: 20260328000004_create_exhibitor_tables.sql
-- Description: Create exhibitor profiles, booth locations, and booth applications
-- ============================================================================

-- ---------------------------------------------------------------------------
-- exhibitor_profiles: extended profile for users acting as exhibitors
-- ---------------------------------------------------------------------------
CREATE TABLE public.exhibitor_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Company information
  company_name    TEXT,
  company_type    TEXT,
  siret           TEXT,
  vat_number      TEXT,
  -- Contact
  contact_email   TEXT,
  contact_phone   TEXT,
  website_url     TEXT,
  -- Address
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  postal_code     TEXT,
  country         TEXT DEFAULT 'FR',
  -- Description & branding
  description     TEXT,
  logo_url        TEXT,
  categories      TEXT[] DEFAULT '{}',
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.exhibitor_profiles IS 'Extended profile for exhibitor users with company and legal info';

CREATE INDEX idx_exhibitor_profiles_user ON public.exhibitor_profiles (user_id);

-- ---------------------------------------------------------------------------
-- booth_locations: available booth slots in an edition's floor plan
-- ---------------------------------------------------------------------------
CREATE TABLE public.booth_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  zone            TEXT,
  -- Dimensions in meters
  width_m         NUMERIC(5,2),
  depth_m         NUMERIC(5,2),
  -- Utilities available at this location
  has_electricity BOOLEAN NOT NULL DEFAULT false,
  has_water       BOOLEAN NOT NULL DEFAULT false,
  has_wifi        BOOLEAN NOT NULL DEFAULT false,
  -- Pricing
  price_cents     INTEGER NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  -- Position on floor plan canvas
  plan_position   JSONB DEFAULT '{}'::JSONB,
  -- Status
  is_available    BOOLEAN NOT NULL DEFAULT true,
  -- Metadata
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edition_id, code)
);

COMMENT ON TABLE public.booth_locations IS 'Available booth slots for an edition';

CREATE INDEX idx_booth_locations_edition   ON public.booth_locations (edition_id);
CREATE INDEX idx_booth_locations_zone      ON public.booth_locations (edition_id, zone);
CREATE INDEX idx_booth_locations_available ON public.booth_locations (edition_id, is_available) WHERE is_available = true;

-- ---------------------------------------------------------------------------
-- booth_applications: exhibitor applications for a booth at an edition
-- ---------------------------------------------------------------------------
CREATE TABLE public.booth_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id        UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  exhibitor_id      UUID NOT NULL REFERENCES public.exhibitor_profiles(id) ON DELETE CASCADE,
  -- Application details
  status            public.application_status NOT NULL DEFAULT 'draft',
  -- Preferences (e.g. zone preference, size needs, neighbor requests)
  preferences       JSONB DEFAULT '{}'::JSONB,
  -- Booth assignment (set when approved)
  booth_location_id UUID REFERENCES public.booth_locations(id) ON DELETE SET NULL,
  -- Payment tracking
  payment_status    TEXT DEFAULT 'pending',
  payment_amount_cents INTEGER,
  payment_reference TEXT,
  paid_at           TIMESTAMPTZ,
  -- Documents (uploaded files: insurance, etc.)
  documents         JSONB DEFAULT '[]'::JSONB,
  -- Notes & review
  applicant_notes   TEXT,
  reviewer_notes    TEXT,
  reviewed_by       UUID REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  submitted_at      TIMESTAMPTZ,
  -- Metadata
  metadata          JSONB DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edition_id, exhibitor_id)
);

COMMENT ON TABLE public.booth_applications IS 'Exhibitor applications for booth space at an edition';

CREATE INDEX idx_booth_applications_edition    ON public.booth_applications (edition_id);
CREATE INDEX idx_booth_applications_exhibitor  ON public.booth_applications (exhibitor_id);
CREATE INDEX idx_booth_applications_status     ON public.booth_applications (edition_id, status);
CREATE INDEX idx_booth_applications_booth      ON public.booth_applications (booth_location_id) WHERE booth_location_id IS NOT NULL;
