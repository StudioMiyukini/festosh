-- ============================================================================
-- Migration: 20260328000012_create_functions.sql
-- Description: Create database functions and triggers
-- ============================================================================

-- ===========================================================================
-- FUNCTION: handle_new_user
-- Triggered on auth.users INSERT to create a corresponding profile row
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================================================================
-- FUNCTION: update_updated_at
-- Generic trigger function to set updated_at = now() on row update
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply updated_at triggers to all tables that have an updated_at column
-- ---------------------------------------------------------------------------

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.festivals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.festival_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.editions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cms_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.exhibitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.booth_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.booth_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.volunteer_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===========================================================================
-- FUNCTION: create_festival
-- Creates a festival, its first edition, and adds the creator as owner
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.create_festival(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_festival_id UUID;
  v_edition_id UUID;
  v_user_id UUID;
  v_year INTEGER;
BEGIN
  -- Get the calling user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Current year for the first edition
  v_year := EXTRACT(YEAR FROM now())::INTEGER;

  -- Create the festival
  INSERT INTO public.festivals (name, slug, description, status)
  VALUES (p_name, p_slug, p_description, 'draft')
  RETURNING id INTO v_festival_id;

  -- Add the creator as owner
  INSERT INTO public.festival_members (festival_id, user_id, role)
  VALUES (v_festival_id, v_user_id, 'owner');

  -- Create the first edition
  INSERT INTO public.editions (festival_id, name, slug, year, status, is_active)
  VALUES (
    v_festival_id,
    p_name || ' ' || v_year::TEXT,
    v_year::TEXT,
    v_year,
    'planning',
    true
  )
  RETURNING id INTO v_edition_id;

  RETURN v_festival_id;
END;
$$;

COMMENT ON FUNCTION public.create_festival IS 'Creates a festival with first edition and adds caller as owner';

-- ===========================================================================
-- FUNCTION: get_user_festival_role
-- Returns the festival_role of a user for a given festival, or NULL
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.get_user_festival_role(
  p_festival_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS public.festival_role
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.festival_role;
  v_uid UUID;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  SELECT role INTO v_role
  FROM public.festival_members
  WHERE festival_id = p_festival_id AND user_id = v_uid;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION public.get_user_festival_role IS 'Returns the role of a user in a festival, or NULL if not a member';
