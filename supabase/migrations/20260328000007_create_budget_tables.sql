-- ============================================================================
-- Migration: 20260328000007_create_budget_tables.sql
-- Description: Create budget management tables (categories and entries)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- budget_categories: reusable budget categories for a festival
-- ---------------------------------------------------------------------------
CREATE TABLE public.budget_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  entry_type  public.budget_entry_type NOT NULL,
  color       TEXT DEFAULT '#6366f1',
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, name)
);

COMMENT ON TABLE public.budget_categories IS 'Reusable budget categories (income/expense) for a festival';

CREATE INDEX idx_budget_categories_festival ON public.budget_categories (festival_id);
CREATE INDEX idx_budget_categories_type     ON public.budget_categories (festival_id, entry_type);

-- ---------------------------------------------------------------------------
-- budget_entries: individual income or expense line items
-- ---------------------------------------------------------------------------
CREATE TABLE public.budget_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE RESTRICT,
  description     TEXT NOT NULL,
  amount_cents    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Documentation
  receipt_url     TEXT,
  notes           TEXT,
  -- Tracking
  created_by      UUID REFERENCES public.profiles(id),
  -- Metadata
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.budget_entries IS 'Individual budget line items (income or expense) for an edition';

CREATE INDEX idx_budget_entries_edition  ON public.budget_entries (edition_id);
CREATE INDEX idx_budget_entries_category ON public.budget_entries (category_id);
CREATE INDEX idx_budget_entries_date     ON public.budget_entries (edition_id, entry_date);
