-- ============================================================================
-- Migration: 20260328000001_create_enums.sql
-- Description: Create all custom enum types for the Festosh platform
-- ============================================================================

-- Platform-level role for users across the entire SaaS
CREATE TYPE public.platform_role AS ENUM ('user', 'organizer', 'admin');

-- Role within a specific festival organization
CREATE TYPE public.festival_role AS ENUM ('owner', 'admin', 'editor', 'moderator', 'volunteer', 'exhibitor');

-- Lifecycle status of a festival
CREATE TYPE public.festival_status AS ENUM ('draft', 'published', 'archived');

-- Lifecycle status of a festival edition (yearly occurrence)
CREATE TYPE public.edition_status AS ENUM (
  'planning',
  'registration_open',
  'registration_closed',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled'
);

-- Workflow status for booth/exhibitor applications
CREATE TYPE public.application_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'waitlisted',
  'cancelled'
);

-- CMS content block types
CREATE TYPE public.block_type AS ENUM (
  'hero',
  'text',
  'image',
  'gallery',
  'video',
  'map',
  'schedule',
  'exhibitor_list',
  'contact_form',
  'faq',
  'countdown',
  'custom_html'
);

-- Budget entry direction
CREATE TYPE public.budget_entry_type AS ENUM ('income', 'expense');

-- Notification delivery channel
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'both');

-- Volunteer shift lifecycle
CREATE TYPE public.shift_status AS ENUM ('open', 'assigned', 'completed', 'cancelled');

-- Floor plan element categories
CREATE TYPE public.floor_plan_element_type AS ENUM (
  'booth',
  'stage',
  'entrance',
  'exit',
  'toilet',
  'parking',
  'food_court',
  'first_aid',
  'info_point',
  'pmr_access',
  'wall',
  'barrier',
  'decoration',
  'custom'
);
