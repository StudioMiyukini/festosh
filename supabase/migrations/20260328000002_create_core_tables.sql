-- ============================================================================
-- Migration: 20260328000002_create_core_tables.sql
-- Description: Create core tables - profiles, festivals, festival_members, editions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: extends auth.users with application-specific data
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  role        public.platform_role NOT NULL DEFAULT 'user',
  locale      TEXT NOT NULL DEFAULT 'fr',
  timezone    TEXT NOT NULL DEFAULT 'Europe/Paris',
  metadata    JSONB DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';

CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_role  ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- festivals: top-level tenant representing a festival brand
-- ---------------------------------------------------------------------------
CREATE TABLE public.festivals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  logo_url        TEXT,
  banner_url      TEXT,
  website_url     TEXT,
  -- Theme / branding
  primary_color   TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#ec4899',
  -- Location
  city            TEXT,
  country         TEXT DEFAULT 'FR',
  address         TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  -- Status
  status          public.festival_status NOT NULL DEFAULT 'draft',
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.festivals IS 'Top-level tenant: a festival brand/organization';

CREATE INDEX idx_festivals_slug   ON public.festivals (slug);
CREATE INDEX idx_festivals_status ON public.festivals (status);

-- ---------------------------------------------------------------------------
-- festival_members: links users to festivals with a specific role
-- ---------------------------------------------------------------------------
CREATE TABLE public.festival_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.festival_role NOT NULL DEFAULT 'volunteer',
  invited_by  UUID REFERENCES public.profiles(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, user_id)
);

COMMENT ON TABLE public.festival_members IS 'Membership linking users to festivals with roles';

CREATE INDEX idx_festival_members_festival ON public.festival_members (festival_id);
CREATE INDEX idx_festival_members_user     ON public.festival_members (user_id);
CREATE INDEX idx_festival_members_role     ON public.festival_members (role);

-- ---------------------------------------------------------------------------
-- editions: a specific occurrence (year) of a festival
-- ---------------------------------------------------------------------------
CREATE TABLE public.editions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id             UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL,
  year                    INTEGER NOT NULL,
  -- Dates
  start_date              DATE,
  end_date                DATE,
  -- Registration windows
  registration_open_at    TIMESTAMPTZ,
  registration_close_at   TIMESTAMPTZ,
  -- Capacity
  max_exhibitors          INTEGER,
  max_visitors            INTEGER,
  max_volunteers          INTEGER,
  -- Visitor hours (e.g. {"saturday": {"open": "10:00", "close": "19:00"}, ...})
  visitor_hours           JSONB DEFAULT '{}'::JSONB,
  -- Status
  status                  public.edition_status NOT NULL DEFAULT 'planning',
  is_active               BOOLEAN NOT NULL DEFAULT false,
  -- Metadata
  metadata                JSONB DEFAULT '{}'::JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, slug)
);

COMMENT ON TABLE public.editions IS 'A specific yearly occurrence of a festival';

CREATE INDEX idx_editions_festival  ON public.editions (festival_id);
CREATE INDEX idx_editions_status    ON public.editions (status);
CREATE INDEX idx_editions_is_active ON public.editions (is_active) WHERE is_active = true;
CREATE INDEX idx_editions_year      ON public.editions (year);
