-- ============================================================================
-- Migration: 20260328000011_create_rls_policies.sql
-- Description: Enable RLS on all tables and create access policies
-- ============================================================================

-- ===========================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ===========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_favorites ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- HELPER: check if a user has a given role (or higher) in a festival
-- We define role hierarchy: owner > admin > editor > moderator > volunteer > exhibitor
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.has_festival_role(
  p_festival_id UUID,
  p_user_id UUID,
  p_min_role public.festival_role
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_role public.festival_role;
  v_role_level INTEGER;
  v_min_level INTEGER;
BEGIN
  -- Get user's role in the festival
  SELECT role INTO v_role
  FROM public.festival_members
  WHERE festival_id = p_festival_id AND user_id = p_user_id;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Map roles to numeric levels (higher = more privileges)
  v_role_level := CASE v_role
    WHEN 'owner' THEN 60
    WHEN 'admin' THEN 50
    WHEN 'editor' THEN 40
    WHEN 'moderator' THEN 30
    WHEN 'volunteer' THEN 20
    WHEN 'exhibitor' THEN 10
  END;

  v_min_level := CASE p_min_role
    WHEN 'owner' THEN 60
    WHEN 'admin' THEN 50
    WHEN 'editor' THEN 40
    WHEN 'moderator' THEN 30
    WHEN 'volunteer' THEN 20
    WHEN 'exhibitor' THEN 10
  END;

  RETURN v_role_level >= v_min_level;
END;
$$;

-- Helper to get festival_id from an edition
CREATE OR REPLACE FUNCTION public.festival_id_from_edition(p_edition_id UUID)
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT festival_id FROM public.editions WHERE id = p_edition_id;
$$;

-- ===========================================================================
-- PROFILES POLICIES
-- ===========================================================================

-- Anyone authenticated can read all profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ===========================================================================
-- FESTIVALS POLICIES
-- ===========================================================================

-- Anyone can read published festivals; members can read draft/archived
CREATE POLICY festivals_select ON public.festivals
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.festival_members
      WHERE festival_id = festivals.id AND user_id = auth.uid()
    )
  );

-- Anonymous users can read published festivals
CREATE POLICY festivals_select_anon ON public.festivals
  FOR SELECT TO anon
  USING (status = 'published');

-- Owner or admin can update festival
CREATE POLICY festivals_update ON public.festivals
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(id, auth.uid(), 'admin'))
  WITH CHECK (public.has_festival_role(id, auth.uid(), 'admin'));

-- Any authenticated user can create a festival (they become owner via function)
CREATE POLICY festivals_insert ON public.festivals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only owner can delete a festival
CREATE POLICY festivals_delete ON public.festivals
  FOR DELETE TO authenticated
  USING (public.has_festival_role(id, auth.uid(), 'owner'));

-- ===========================================================================
-- FESTIVAL_MEMBERS POLICIES
-- ===========================================================================

-- Members can see other members of their festivals
CREATE POLICY festival_members_select ON public.festival_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festival_members fm
      WHERE fm.festival_id = festival_members.festival_id AND fm.user_id = auth.uid()
    )
  );

-- Owner or admin can add members
CREATE POLICY festival_members_insert ON public.festival_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

-- Owner or admin can update members
CREATE POLICY festival_members_update ON public.festival_members
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

-- Owner or admin can remove members
CREATE POLICY festival_members_delete ON public.festival_members
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'));

-- ===========================================================================
-- EDITIONS POLICIES
-- ===========================================================================

-- Follow festival access: published festivals' editions are public, otherwise members only
CREATE POLICY editions_select ON public.editions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = editions.festival_id
      AND (
        f.status = 'published'
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

-- Anonymous can read editions of published festivals
CREATE POLICY editions_select_anon ON public.editions
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = editions.festival_id AND f.status = 'published'
    )
  );

-- Admin+ can manage editions
CREATE POLICY editions_insert ON public.editions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

CREATE POLICY editions_update ON public.editions
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

CREATE POLICY editions_delete ON public.editions
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'owner'));

-- ===========================================================================
-- CMS_PAGES POLICIES
-- ===========================================================================

-- Anyone can read published pages on published festivals
CREATE POLICY cms_pages_select ON public.cms_pages
  FOR SELECT TO authenticated
  USING (
    (is_published AND EXISTS (
      SELECT 1 FROM public.festivals f WHERE f.id = cms_pages.festival_id AND f.status = 'published'
    ))
    OR EXISTS (
      SELECT 1 FROM public.festival_members fm
      WHERE fm.festival_id = cms_pages.festival_id AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY cms_pages_select_anon ON public.cms_pages
  FOR SELECT TO anon
  USING (
    is_published AND EXISTS (
      SELECT 1 FROM public.festivals f WHERE f.id = cms_pages.festival_id AND f.status = 'published'
    )
  );

-- Editors+ can CRUD pages
CREATE POLICY cms_pages_insert ON public.cms_pages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'editor'));

CREATE POLICY cms_pages_update ON public.cms_pages
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'editor'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'editor'));

CREATE POLICY cms_pages_delete ON public.cms_pages
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'editor'));

-- ===========================================================================
-- CMS_BLOCKS POLICIES
-- ===========================================================================

-- Anyone can read blocks on published pages of published festivals
CREATE POLICY cms_blocks_select ON public.cms_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      JOIN public.festivals f ON f.id = p.festival_id
      WHERE p.id = cms_blocks.page_id
      AND (
        (p.is_published AND f.status = 'published')
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY cms_blocks_select_anon ON public.cms_blocks
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      JOIN public.festivals f ON f.id = p.festival_id
      WHERE p.id = cms_blocks.page_id
      AND p.is_published AND f.status = 'published'
    )
  );

-- Editors+ can CRUD blocks
CREATE POLICY cms_blocks_insert ON public.cms_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      WHERE p.id = cms_blocks.page_id
      AND public.has_festival_role(p.festival_id, auth.uid(), 'editor')
    )
  );

CREATE POLICY cms_blocks_update ON public.cms_blocks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      WHERE p.id = cms_blocks.page_id
      AND public.has_festival_role(p.festival_id, auth.uid(), 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      WHERE p.id = cms_blocks.page_id
      AND public.has_festival_role(p.festival_id, auth.uid(), 'editor')
    )
  );

CREATE POLICY cms_blocks_delete ON public.cms_blocks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cms_pages p
      WHERE p.id = cms_blocks.page_id
      AND public.has_festival_role(p.festival_id, auth.uid(), 'editor')
    )
  );

-- ===========================================================================
-- EXHIBITOR_PROFILES POLICIES
-- ===========================================================================

-- Users can read and manage their own exhibitor profile
CREATE POLICY exhibitor_profiles_select_own ON public.exhibitor_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Festival admins can read exhibitor profiles for applicants to their festival
CREATE POLICY exhibitor_profiles_select_admin ON public.exhibitor_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.booth_applications ba
      JOIN public.editions e ON e.id = ba.edition_id
      WHERE ba.exhibitor_id = exhibitor_profiles.id
      AND public.has_festival_role(e.festival_id, auth.uid(), 'moderator')
    )
  );

CREATE POLICY exhibitor_profiles_insert ON public.exhibitor_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY exhibitor_profiles_update ON public.exhibitor_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY exhibitor_profiles_delete ON public.exhibitor_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===========================================================================
-- BOOTH_LOCATIONS POLICIES
-- ===========================================================================

-- Anyone can read booth locations on published festivals
CREATE POLICY booth_locations_select ON public.booth_locations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = booth_locations.edition_id
      AND (
        f.status = 'published'
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY booth_locations_select_anon ON public.booth_locations
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = booth_locations.edition_id AND f.status = 'published'
    )
  );

-- Moderators+ can manage booth locations
CREATE POLICY booth_locations_insert ON public.booth_locations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

CREATE POLICY booth_locations_update ON public.booth_locations
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

CREATE POLICY booth_locations_delete ON public.booth_locations
  FOR DELETE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

-- ===========================================================================
-- BOOTH_APPLICATIONS POLICIES
-- ===========================================================================

-- Exhibitors can read their own applications
CREATE POLICY booth_applications_select_own ON public.booth_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exhibitor_profiles ep
      WHERE ep.id = booth_applications.exhibitor_id AND ep.user_id = auth.uid()
    )
  );

-- Moderators+ can read applications for their festival
CREATE POLICY booth_applications_select_admin ON public.booth_applications
  FOR SELECT TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

-- Exhibitors can create and update their own applications
CREATE POLICY booth_applications_insert ON public.booth_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exhibitor_profiles ep
      WHERE ep.id = booth_applications.exhibitor_id AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY booth_applications_update_own ON public.booth_applications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exhibitor_profiles ep
      WHERE ep.id = booth_applications.exhibitor_id AND ep.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exhibitor_profiles ep
      WHERE ep.id = booth_applications.exhibitor_id AND ep.user_id = auth.uid()
    )
  );

-- Moderators+ can update applications (review, approve, reject)
CREATE POLICY booth_applications_update_admin ON public.booth_applications
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

-- Exhibitors can delete their own draft applications
CREATE POLICY booth_applications_delete ON public.booth_applications
  FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.exhibitor_profiles ep
      WHERE ep.id = booth_applications.exhibitor_id AND ep.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- VENUES POLICIES
-- ===========================================================================

-- Anyone can read venues of published festivals
CREATE POLICY venues_select ON public.venues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = venues.festival_id
      AND (
        f.status = 'published'
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY venues_select_anon ON public.venues
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = venues.festival_id AND f.status = 'published'
    )
  );

-- Editors+ can manage venues
CREATE POLICY venues_insert ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'editor'));

CREATE POLICY venues_update ON public.venues
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'editor'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'editor'));

CREATE POLICY venues_delete ON public.venues
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'editor'));

-- ===========================================================================
-- EVENTS POLICIES
-- ===========================================================================

-- Anyone can read public events on published festivals
CREATE POLICY events_select ON public.events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = events.edition_id
      AND (
        (events.is_public AND f.status = 'published')
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY events_select_anon ON public.events
  FOR SELECT TO anon
  USING (
    is_public AND EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = events.edition_id AND f.status = 'published'
    )
  );

-- Editors+ can manage events
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

CREATE POLICY events_delete ON public.events
  FOR DELETE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

-- ===========================================================================
-- VOLUNTEER_ROLES POLICIES
-- ===========================================================================

-- Members can read volunteer roles
CREATE POLICY volunteer_roles_select ON public.volunteer_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.festival_members fm
      WHERE fm.festival_id = volunteer_roles.festival_id AND fm.user_id = auth.uid()
    )
  );

-- Moderators+ can manage volunteer roles
CREATE POLICY volunteer_roles_insert ON public.volunteer_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

CREATE POLICY volunteer_roles_update ON public.volunteer_roles
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'moderator'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

CREATE POLICY volunteer_roles_delete ON public.volunteer_roles
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

-- ===========================================================================
-- SHIFTS POLICIES
-- ===========================================================================

-- Volunteers can read shifts for editions they are part of
CREATE POLICY shifts_select ON public.shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festival_members fm ON fm.festival_id = e.festival_id
      WHERE e.id = shifts.edition_id AND fm.user_id = auth.uid()
    )
  );

-- Moderators+ can manage shifts
CREATE POLICY shifts_insert ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

CREATE POLICY shifts_update ON public.shifts
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

CREATE POLICY shifts_delete ON public.shifts
  FOR DELETE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'moderator'));

-- ===========================================================================
-- SHIFT_ASSIGNMENTS POLICIES
-- ===========================================================================

-- Volunteers can read their own assignments
CREATE POLICY shift_assignments_select_own ON public.shift_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Moderators+ can read all assignments for their festival
CREATE POLICY shift_assignments_select_admin ON public.shift_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
      AND public.has_festival_role(public.festival_id_from_edition(s.edition_id), auth.uid(), 'moderator')
    )
  );

-- Moderators+ can manage assignments
CREATE POLICY shift_assignments_insert ON public.shift_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
      AND public.has_festival_role(public.festival_id_from_edition(s.edition_id), auth.uid(), 'moderator')
    )
  );

CREATE POLICY shift_assignments_update ON public.shift_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
      AND public.has_festival_role(public.festival_id_from_edition(s.edition_id), auth.uid(), 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
      AND public.has_festival_role(public.festival_id_from_edition(s.edition_id), auth.uid(), 'moderator')
    )
  );

CREATE POLICY shift_assignments_delete ON public.shift_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
      AND public.has_festival_role(public.festival_id_from_edition(s.edition_id), auth.uid(), 'moderator')
    )
  );

-- ===========================================================================
-- BUDGET_CATEGORIES POLICIES (admin/owner only)
-- ===========================================================================

CREATE POLICY budget_categories_select ON public.budget_categories
  FOR SELECT TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'));

CREATE POLICY budget_categories_insert ON public.budget_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

CREATE POLICY budget_categories_update ON public.budget_categories
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'admin'));

CREATE POLICY budget_categories_delete ON public.budget_categories
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'admin'));

-- ===========================================================================
-- BUDGET_ENTRIES POLICIES (admin/owner only)
-- ===========================================================================

CREATE POLICY budget_entries_select ON public.budget_entries
  FOR SELECT TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'admin'));

CREATE POLICY budget_entries_insert ON public.budget_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'admin'));

CREATE POLICY budget_entries_update ON public.budget_entries
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'admin'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'admin'));

CREATE POLICY budget_entries_delete ON public.budget_entries
  FOR DELETE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'admin'));

-- ===========================================================================
-- EQUIPMENT_ITEMS POLICIES (moderators+)
-- ===========================================================================

CREATE POLICY equipment_items_select ON public.equipment_items
  FOR SELECT TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

CREATE POLICY equipment_items_insert ON public.equipment_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

CREATE POLICY equipment_items_update ON public.equipment_items
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'moderator'))
  WITH CHECK (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

CREATE POLICY equipment_items_delete ON public.equipment_items
  FOR DELETE TO authenticated
  USING (public.has_festival_role(festival_id, auth.uid(), 'moderator'));

-- ===========================================================================
-- EQUIPMENT_ASSIGNMENTS POLICIES (moderators+)
-- ===========================================================================

CREATE POLICY equipment_assignments_select ON public.equipment_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.item_id
      AND public.has_festival_role(ei.festival_id, auth.uid(), 'moderator')
    )
  );

CREATE POLICY equipment_assignments_insert ON public.equipment_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.item_id
      AND public.has_festival_role(ei.festival_id, auth.uid(), 'moderator')
    )
  );

CREATE POLICY equipment_assignments_update ON public.equipment_assignments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.item_id
      AND public.has_festival_role(ei.festival_id, auth.uid(), 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.item_id
      AND public.has_festival_role(ei.festival_id, auth.uid(), 'moderator')
    )
  );

CREATE POLICY equipment_assignments_delete ON public.equipment_assignments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_assignments.item_id
      AND public.has_festival_role(ei.festival_id, auth.uid(), 'moderator')
    )
  );

-- ===========================================================================
-- FLOOR_PLANS POLICIES
-- ===========================================================================

-- Anyone can read floor plans on published festivals
CREATE POLICY floor_plans_select ON public.floor_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = floor_plans.edition_id
      AND (
        f.status = 'published'
        OR EXISTS (
          SELECT 1 FROM public.festival_members fm
          WHERE fm.festival_id = f.id AND fm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY floor_plans_select_anon ON public.floor_plans
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.editions e
      JOIN public.festivals f ON f.id = e.festival_id
      WHERE e.id = floor_plans.edition_id AND f.status = 'published'
    )
  );

-- Editors+ can manage floor plans
CREATE POLICY floor_plans_insert ON public.floor_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

CREATE POLICY floor_plans_update ON public.floor_plans
  FOR UPDATE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'))
  WITH CHECK (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

CREATE POLICY floor_plans_delete ON public.floor_plans
  FOR DELETE TO authenticated
  USING (public.has_festival_role(public.festival_id_from_edition(edition_id), auth.uid(), 'editor'));

-- ===========================================================================
-- NOTIFICATIONS POLICIES
-- ===========================================================================

-- Users can read their own notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System/admins insert notifications (via service role); users cannot self-insert
-- No insert policy for authenticated - notifications are created server-side

-- ===========================================================================
-- FESTIVAL_FAVORITES POLICIES
-- ===========================================================================

-- Users can read their own favorites
CREATE POLICY festival_favorites_select ON public.festival_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can add favorites
CREATE POLICY festival_favorites_insert ON public.festival_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can remove their own favorites
CREATE POLICY festival_favorites_delete ON public.festival_favorites
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
