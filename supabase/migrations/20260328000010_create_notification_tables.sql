-- ============================================================================
-- Migration: 20260328000010_create_notification_tables.sql
-- Description: Create notification and festival favorites tables
-- ============================================================================

-- ---------------------------------------------------------------------------
-- notifications: in-app and email notifications for users
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  festival_id UUID REFERENCES public.festivals(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  channel     public.notification_channel NOT NULL DEFAULT 'in_app',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  -- Metadata
  metadata    JSONB DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'User notifications (in-app, email, or both)';

CREATE INDEX idx_notifications_user    ON public.notifications (user_id);
CREATE INDEX idx_notifications_unread  ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_festival ON public.notifications (festival_id) WHERE festival_id IS NOT NULL;
CREATE INDEX idx_notifications_created ON public.notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- festival_favorites: users can bookmark/favorite festivals
-- ---------------------------------------------------------------------------
CREATE TABLE public.festival_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, festival_id)
);

COMMENT ON TABLE public.festival_favorites IS 'User bookmarks/favorites for festivals';

CREATE INDEX idx_festival_favorites_user     ON public.festival_favorites (user_id);
CREATE INDEX idx_festival_favorites_festival ON public.festival_favorites (festival_id);
