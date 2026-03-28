-- ============================================================================
-- Migration: 20260328000003_create_cms_tables.sql
-- Description: Create CMS tables for festival page builder
-- ============================================================================

-- ---------------------------------------------------------------------------
-- cms_pages: pages belonging to a festival's website
-- ---------------------------------------------------------------------------
CREATE TABLE public.cms_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id      UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  is_homepage      BOOLEAN NOT NULL DEFAULT false,
  meta_description TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (festival_id, slug)
);

COMMENT ON TABLE public.cms_pages IS 'CMS pages for a festival website';

CREATE INDEX idx_cms_pages_festival     ON public.cms_pages (festival_id);
CREATE INDEX idx_cms_pages_published    ON public.cms_pages (festival_id, is_published);
CREATE INDEX idx_cms_pages_homepage     ON public.cms_pages (festival_id, is_homepage) WHERE is_homepage = true;
CREATE INDEX idx_cms_pages_sort_order   ON public.cms_pages (festival_id, sort_order);

-- ---------------------------------------------------------------------------
-- cms_blocks: content blocks within a CMS page
-- ---------------------------------------------------------------------------
CREATE TABLE public.cms_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  block_type  public.block_type NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}'::JSONB,
  settings    JSONB NOT NULL DEFAULT '{}'::JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cms_blocks IS 'Content blocks composing a CMS page';

CREATE INDEX idx_cms_blocks_page       ON public.cms_blocks (page_id);
CREATE INDEX idx_cms_blocks_sort_order ON public.cms_blocks (page_id, sort_order);
CREATE INDEX idx_cms_blocks_type       ON public.cms_blocks (block_type);
