-- ============================================================================
-- Migration: 20260328000006_create_volunteer_tables.sql
-- Description: Create volunteer management tables (roles, shifts, assignments)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- volunteer_roles: reusable role definitions for a festival
-- ---------------------------------------------------------------------------
CREATE TABLE public.volunteer_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, name)
);

COMMENT ON TABLE public.volunteer_roles IS 'Reusable volunteer role definitions for a festival';

CREATE INDEX idx_volunteer_roles_festival ON public.volunteer_roles (festival_id);

-- ---------------------------------------------------------------------------
-- shifts: time-bound volunteer shift slots
-- ---------------------------------------------------------------------------
CREATE TABLE public.shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE,
  venue_id        UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  -- Scheduling
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  -- Capacity
  max_volunteers  INTEGER NOT NULL DEFAULT 1,
  -- Status
  status          public.shift_status NOT NULL DEFAULT 'open',
  -- Details
  description     TEXT,
  notes           TEXT,
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shifts IS 'Time-bound volunteer shift slots for an edition';

CREATE INDEX idx_shifts_edition ON public.shifts (edition_id);
CREATE INDEX idx_shifts_role    ON public.shifts (role_id);
CREATE INDEX idx_shifts_venue   ON public.shifts (venue_id);
CREATE INDEX idx_shifts_times   ON public.shifts (edition_id, start_time, end_time);
CREATE INDEX idx_shifts_status  ON public.shifts (edition_id, status);

-- ---------------------------------------------------------------------------
-- shift_assignments: links a volunteer user to a shift
-- ---------------------------------------------------------------------------
CREATE TABLE public.shift_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in  BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_id, user_id)
);

COMMENT ON TABLE public.shift_assignments IS 'Assignment of a volunteer to a specific shift';

CREATE INDEX idx_shift_assignments_shift ON public.shift_assignments (shift_id);
CREATE INDEX idx_shift_assignments_user  ON public.shift_assignments (user_id);
