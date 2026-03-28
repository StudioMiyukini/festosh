

Now I have all the information I need. Let me compile the complete architecture plan based on my thorough exploration of the prototype and understanding of the requirements.

---

# Festosh -- Complete Architecture Plan

## 1. Key Lessons from the Prototype (catakana_orga)

Having explored the `_catakana_ref2` prototype extensively, here are the critical problems that Festosh must solve:

**Problems identified in the prototype:**
- **Single-tenant only**: Catakana was built for one festival. There is no concept of multi-tenancy; all tables assume a single organization.
- **No sub-site routing**: No hostname-based routing. Everything lives under one domain.
- **Role model too flat**: `user_type` on `profiles` is a single global enum. No per-festival role assignments.
- **Service layer is inconsistent**: Some services live in `lib/supabase/`, others in `lib/services/`, others in `features/*/service.ts`. No unified pattern.
- **Context provider hell**: The App.tsx has 7 nested providers (Auth, Edition, LayoutMode, RoleSimulation, Admin, Tooltip, Query). This does not scale.
- **Hardcoded Supabase credentials** in `client.ts` as fallback -- a security issue.
- **No Zustand**: The prototype uses only React Context and TanStack Query. No proper client-state store.
- **Mixed French/English naming** in types, tables, and code.
- **Feature modules incomplete**: Only `candidatures` and `plan` use the feature module pattern. Everything else is scattered in `components/`.
- **No CMS system**: The prototype has no page builder or content management.
- **RLS policies are ad-hoc**: Applied manually via SQL scripts with no systematic strategy.

---

## 2. Folder Structure

```
C:/Users/miyuk/Festosh/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .vscode/
│   └── settings.json
├── public/
│   ├── favicon.svg
│   └── assets/
│       └── images/
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/
│   │   ├── 00000000000000_init_extensions.sql
│   │   ├── 00000000000001_create_enums.sql
│   │   ├── 00000000000002_create_core_tables.sql
│   │   ├── 00000000000003_create_festival_tables.sql
│   │   ├── 00000000000004_create_cms_tables.sql
│   │   ├── 00000000000005_create_exhibitor_tables.sql
│   │   ├── 00000000000006_create_programming_tables.sql
│   │   ├── 00000000000007_create_volunteer_tables.sql
│   │   ├── 00000000000008_create_budget_tables.sql
│   │   ├── 00000000000009_create_equipment_tables.sql
│   │   ├── 00000000000010_create_notification_tables.sql
│   │   ├── 00000000000011_create_rls_policies.sql
│   │   ├── 00000000000012_create_functions.sql
│   │   └── 00000000000013_create_triggers.sql
│   └── functions/
│       ├── send-notification-email/
│       │   └── index.ts
│       └── process-exhibitor-application/
│           └── index.ts
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Root component (minimal providers)
│   ├── router.tsx                        # All route definitions
│   ├── vite-env.d.ts
│   │
│   ├── config/
│   │   ├── constants.ts                  # App-wide constants
│   │   ├── env.ts                        # Typed env vars
│   │   └── query-client.ts              # TanStack Query client config
│   │
│   ├── types/
│   │   ├── index.ts                      # Re-exports
│   │   ├── database.types.ts            # Supabase generated types
│   │   ├── enums.ts                      # Shared enums matching DB
│   │   ├── auth.ts                       # Auth-related types
│   │   ├── festival.ts                   # Festival/edition types
│   │   ├── cms.ts                        # CMS types (pages, blocks)
│   │   ├── exhibitor.ts                  # Exhibitor types
│   │   ├── programming.ts               # Events, schedule types
│   │   ├── venue.ts                      # Venue, stage, floor plan types
│   │   ├── volunteer.ts                  # Volunteer types
│   │   ├── budget.ts                     # Budget types
│   │   ├── equipment.ts                  # Equipment/material types
│   │   └── notification.ts              # Notification types
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                # Singleton client (NO hardcoded keys)
│   │   │   ├── middleware.ts            # Auth middleware helpers
│   │   │   └── realtime.ts             # Realtime subscription helpers
│   │   ├── utils.ts                     # cn() and general utils
│   │   ├── date.ts                      # Date formatting utilities
│   │   ├── slug.ts                      # Slug generation/validation
│   │   └── logger.ts                    # Structured logger
│   │
│   ├── stores/                           # Zustand stores
│   │   ├── auth-store.ts               # Current user, session
│   │   ├── tenant-store.ts             # Current festival context (resolved from hostname)
│   │   ├── ui-store.ts                  # Sidebar state, modals, theme
│   │   └── notification-store.ts       # In-app notification queue
│   │
│   ├── services/                         # Data access layer (Supabase queries)
│   │   ├── base.service.ts              # Abstract base with error handling
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   ├── festival.service.ts
│   │   ├── festival-member.service.ts
│   │   ├── cms-page.service.ts
│   │   ├── cms-block.service.ts
│   │   ├── exhibitor.service.ts
│   │   ├── booth-application.service.ts
│   │   ├── booth-location.service.ts
│   │   ├── event.service.ts
│   │   ├── venue.service.ts
│   │   ├── floor-plan.service.ts
│   │   ├── volunteer.service.ts
│   │   ├── shift.service.ts
│   │   ├── budget.service.ts
│   │   ├── equipment.service.ts
│   │   ├── notification.service.ts
│   │   └── directory.service.ts
│   │
│   ├── hooks/                            # Shared React hooks
│   │   ├── use-auth.ts                  # Auth hook (reads from zustand + supabase)
│   │   ├── use-tenant.ts               # Resolves current festival from hostname
│   │   ├── use-festival-role.ts         # Current user's role in current festival
│   │   ├── use-mobile.ts
│   │   └── use-debounce.ts
│   │
│   ├── features/                         # Feature modules (self-contained)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   ├── ResetPasswordForm.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── directory/                   # Platform-level festival directory
│   │   │   ├── components/
│   │   │   │   ├── DirectoryGrid.tsx
│   │   │   │   ├── DirectoryFilters.tsx
│   │   │   │   ├── FestivalCard.tsx
│   │   │   │   └── FestivalSearch.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                   # User dashboard (platform-level)
│   │   │   ├── components/
│   │   │   │   ├── VisitorDashboard.tsx
│   │   │   │   ├── ExhibitorDashboard.tsx
│   │   │   │   ├── OrganizerDashboard.tsx
│   │   │   │   └── AdminDashboard.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── festival-admin/              # Festival admin panel
│   │   │   ├── components/
│   │   │   │   ├── FestivalSettings.tsx
│   │   │   │   ├── FestivalMembers.tsx
│   │   │   │   ├── FestivalOverview.tsx
│   │   │   │   └── CreateFestivalForm.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── cms/                         # CMS / Content Management
│   │   │   ├── components/
│   │   │   │   ├── PageEditor.tsx
│   │   │   │   ├── BlockEditor.tsx
│   │   │   │   ├── BlockRenderer.tsx
│   │   │   │   ├── PageList.tsx
│   │   │   │   └── blocks/
│   │   │   │       ├── HeroBlock.tsx
│   │   │   │       ├── TextBlock.tsx
│   │   │   │       ├── ImageBlock.tsx
│   │   │   │       ├── GalleryBlock.tsx
│   │   │   │       ├── MapBlock.tsx
│   │   │   │       ├── ScheduleBlock.tsx
│   │   │   │       ├── ExhibitorListBlock.tsx
│   │   │   │       └── ContactBlock.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── programming/                 # Events, schedule, program
│   │   │   ├── components/
│   │   │   │   ├── EventList.tsx
│   │   │   │   ├── EventForm.tsx
│   │   │   │   ├── ScheduleView.tsx
│   │   │   │   ├── ScheduleTimeline.tsx
│   │   │   │   └── EventCard.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── venues/                      # Venues, stages
│   │   │   ├── components/
│   │   │   │   ├── VenueList.tsx
│   │   │   │   ├── VenueForm.tsx
│   │   │   │   ├── StageSchedule.tsx
│   │   │   │   └── VenueMap.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── floor-plan/                  # Interactive floor plan editor
│   │   │   ├── components/
│   │   │   │   ├── FloorPlanCanvas.tsx
│   │   │   │   ├── FloorPlanToolbar.tsx
│   │   │   │   ├── FloorPlanElementPanel.tsx
│   │   │   │   ├── BoothAssignment.tsx
│   │   │   │   └── FloorPlanViewer.tsx  # Read-only public version
│   │   │   ├── types.ts
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── exhibitors/                  # Exhibitor management
│   │   │   ├── components/
│   │   │   │   ├── ExhibitorDirectory.tsx
│   │   │   │   ├── ExhibitorCard.tsx
│   │   │   │   ├── ExhibitorDetail.tsx
│   │   │   │   ├── ApplicationForm.tsx
│   │   │   │   ├── ApplicationReview.tsx
│   │   │   │   ├── ApplicationList.tsx
│   │   │   │   ├── BoothLocationManager.tsx
│   │   │   │   └── BoothOptionEditor.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── volunteers/                  # Volunteer management
│   │   │   ├── components/
│   │   │   │   ├── VolunteerList.tsx
│   │   │   │   ├── VolunteerSchedule.tsx
│   │   │   │   ├── ShiftManager.tsx
│   │   │   │   ├── RoleAssignment.tsx
│   │   │   │   └── MyShifts.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── budget/                      # Budget tracking
│   │   │   ├── components/
│   │   │   │   ├── BudgetOverview.tsx
│   │   │   │   ├── BudgetEntryForm.tsx
│   │   │   │   ├── BudgetTable.tsx
│   │   │   │   ├── BudgetCharts.tsx
│   │   │   │   └── BudgetReport.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── equipment/                   # Equipment/material management
│   │   │   ├── components/
│   │   │   │   ├── EquipmentCatalog.tsx
│   │   │   │   ├── EquipmentForm.tsx
│   │   │   │   ├── EquipmentAssignment.tsx
│   │   │   │   └── InventoryTracker.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   │
│   │   └── notifications/
│   │       ├── components/
│   │       │   ├── NotificationCenter.tsx
│   │       │   ├── NotificationItem.tsx
│   │       │   └── NotificationPreferences.tsx
│   │       ├── hooks.ts
│   │       └── index.ts
│   │
│   ├── layouts/                          # Layout shells
│   │   ├── PlatformLayout.tsx           # Main Festosh platform layout
│   │   ├── FestivalPublicLayout.tsx     # Festival sub-site public layout
│   │   ├── FestivalAdminLayout.tsx      # Festival admin panel layout
│   │   ├── AdminLayout.tsx              # Platform admin layout
│   │   └── AuthLayout.tsx               # Login/signup layout
│   │
│   ├── pages/                            # Route-level page components (thin wrappers)
│   │   ├── platform/                    # Routes for festosh.miyukini.com
│   │   │   ├── HomePage.tsx
│   │   │   ├── DirectoryPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   │
│   │   ├── festival/                    # Routes for {slug}.miyukini.com (public)
│   │   │   ├── FestivalHomePage.tsx
│   │   │   ├── FestivalPageRenderer.tsx # CMS dynamic page
│   │   │   ├── FestivalSchedulePage.tsx
│   │   │   ├── FestivalMapPage.tsx
│   │   │   ├── FestivalExhibitorsPage.tsx
│   │   │   └── FestivalApplyPage.tsx
│   │   │
│   │   ├── festival-admin/              # Routes for {slug}.miyukini.com/admin
│   │   │   ├── AdminOverviewPage.tsx
│   │   │   ├── AdminCmsPage.tsx
│   │   │   ├── AdminProgrammingPage.tsx
│   │   │   ├── AdminVenuesPage.tsx
│   │   │   ├── AdminFloorPlanPage.tsx
│   │   │   ├── AdminExhibitorsPage.tsx
│   │   │   ├── AdminApplicationsPage.tsx
│   │   │   ├── AdminVolunteersPage.tsx
│   │   │   ├── AdminBudgetPage.tsx
│   │   │   ├── AdminEquipmentPage.tsx
│   │   │   ├── AdminMembersPage.tsx
│   │   │   └── AdminSettingsPage.tsx
│   │   │
│   │   └── admin/                       # Routes for festosh.miyukini.com/admin
│   │       ├── PlatformDashboardPage.tsx
│   │       ├── PlatformUsersPage.tsx
│   │       └── PlatformFestivalsPage.tsx
│   │
│   └── components/                       # Shared UI components
│       ├── ui/                           # shadcn/ui primitives (auto-generated)
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── dialog.tsx
│       │   ├── ... (all shadcn components)
│       │   └── sonner.tsx
│       ├── shared/                       # App-specific shared components
│       │   ├── Logo.tsx
│       │   ├── ThemeToggle.tsx
│       │   ├── UserAvatar.tsx
│       │   ├── LoadingSpinner.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── EmptyState.tsx
│       │   ├── ConfirmDialog.tsx
│       │   ├── DataTable.tsx
│       │   ├── Pagination.tsx
│       │   ├── SearchInput.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── FileUploader.tsx
│       │   ├── RichTextEditor.tsx
│       │   └── ColorPicker.tsx
│       └── navigation/
│           ├── PlatformNav.tsx
│           ├── FestivalNav.tsx
│           ├── FestivalAdminSidebar.tsx
│           ├── MobileBottomNav.tsx
│           └── Breadcrumbs.tsx
│
├── .env.example
├── .env.local                            # gitignored
├── .gitignore
├── .eslintrc.cjs
├── CLAUDE.md
├── README.md
├── components.json                       # shadcn config
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 3. Supabase Database Schema

### 3.1 Enums

```sql
-- User types at platform level
CREATE TYPE public.platform_role AS ENUM (
  'user',        -- default authenticated user
  'organizer',   -- can create festivals
  'admin'        -- platform admin
);

-- Roles within a specific festival
CREATE TYPE public.festival_role AS ENUM (
  'owner',       -- creator of the festival, full control
  'admin',       -- co-admin, can manage everything
  'editor',      -- can edit content/CMS
  'moderator',   -- can manage exhibitors, volunteers
  'volunteer',   -- assigned volunteer
  'exhibitor'    -- approved exhibitor
);

-- Festival visibility
CREATE TYPE public.festival_status AS ENUM (
  'draft',       -- not publicly visible
  'published',   -- visible in directory
  'archived'     -- past festival, read-only
);

-- Edition status
CREATE TYPE public.edition_status AS ENUM (
  'planning',
  'registration_open',
  'registration_closed',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled'
);

-- Booth application status
CREATE TYPE public.application_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'waitlisted',
  'cancelled'
);

-- CMS block types
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

-- Budget entry type
CREATE TYPE public.budget_entry_type AS ENUM ('income', 'expense');

-- Notification channel
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'both');

-- Shift status for volunteers
CREATE TYPE public.shift_status AS ENUM ('open', 'assigned', 'completed', 'cancelled');

-- Floor plan element type
CREATE TYPE public.floor_plan_element_type AS ENUM (
  'booth', 'stage', 'entrance', 'exit', 'toilet', 'parking',
  'food_court', 'first_aid', 'info_point', 'pmr_access',
  'wall', 'barrier', 'decoration', 'custom'
);
```

### 3.2 Core Tables

```sql
-- =====================================================
-- CORE: Profiles (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  display_name TEXT,
  email       TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  platform_role public.platform_role NOT NULL DEFAULT 'user',
  locale      TEXT DEFAULT 'fr',
  timezone    TEXT DEFAULT 'Europe/Paris',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CORE: Festivals (the tenant)
-- =====================================================
CREATE TABLE public.festivals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,  -- used for subdomain: {slug}.miyukini.com
  name        TEXT NOT NULL,
  description TEXT,
  logo_url    TEXT,
  banner_url  TEXT,
  -- Theme customization
  theme_primary_color   TEXT DEFAULT '#6366f1',
  theme_secondary_color TEXT DEFAULT '#ec4899',
  theme_font            TEXT DEFAULT 'Inter',
  -- Location
  country     TEXT,
  city        TEXT,
  address     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  -- Meta
  website     TEXT,
  contact_email TEXT,
  social_links JSONB DEFAULT '{}',  -- {instagram, facebook, twitter, tiktok}
  tags        TEXT[] DEFAULT '{}',   -- searchable tags: anime, gaming, music, etc.
  status      public.festival_status NOT NULL DEFAULT 'draft',
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for directory search
CREATE INDEX idx_festivals_status ON public.festivals(status);
CREATE INDEX idx_festivals_tags ON public.festivals USING GIN(tags);
CREATE INDEX idx_festivals_slug ON public.festivals(slug);

-- =====================================================
-- CORE: Festival Members (per-festival role assignments)
-- =====================================================
CREATE TABLE public.festival_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.festival_role NOT NULL DEFAULT 'exhibitor',
  invited_by  UUID REFERENCES public.profiles(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(festival_id, user_id)
);

CREATE INDEX idx_festival_members_festival ON public.festival_members(festival_id);
CREATE INDEX idx_festival_members_user ON public.festival_members(user_id);

-- =====================================================
-- CORE: Editions (a festival has many editions/years)
-- =====================================================
CREATE TABLE public.editions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id     UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,         -- e.g., "Catakana 2026"
  slug            TEXT NOT NULL,         -- e.g., "2026" for URL {festival-slug}.miyukini.com/2026
  description     TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          public.edition_status NOT NULL DEFAULT 'planning',
  -- Registration windows
  exhibitor_registration_start  TIMESTAMPTZ,
  exhibitor_registration_end    TIMESTAMPTZ,
  volunteer_registration_start  TIMESTAMPTZ,
  volunteer_registration_end    TIMESTAMPTZ,
  -- Capacity
  expected_visitors   INTEGER,
  max_exhibitors      INTEGER,
  max_volunteers      INTEGER,
  -- Setup
  setup_start     TIMESTAMPTZ,
  setup_end       TIMESTAMPTZ,
  -- Visitor info
  visitor_hours   JSONB DEFAULT '{}', -- {"saturday": "10:00-18:00", "sunday": "10:00-17:00"}
  -- Active edition flag (only one per festival)
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(festival_id, slug)
);

CREATE INDEX idx_editions_festival ON public.editions(festival_id);
```

### 3.3 CMS Tables

```sql
-- =====================================================
-- CMS: Pages
-- =====================================================
CREATE TABLE public.cms_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,            -- e.g., "about", "info", "contact"
  title       TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_homepage BOOLEAN NOT NULL DEFAULT false,
  meta_description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(festival_id, slug)
);

-- =====================================================
-- CMS: Blocks (page content blocks)
-- =====================================================
CREATE TABLE public.cms_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  block_type  public.block_type NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}',  -- block-specific payload
  settings    JSONB NOT NULL DEFAULT '{}',  -- styling, layout options
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cms_blocks_page ON public.cms_blocks(page_id);
```

### 3.4 Exhibitor Tables

```sql
-- =====================================================
-- Exhibitor profiles (extends user profile with business info)
-- =====================================================
CREATE TABLE public.exhibitor_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name        TEXT,
  trade_name          TEXT,        -- booth display name
  activity_type       TEXT,
  category            TEXT,
  description         TEXT,
  logo_url            TEXT,
  photo_url           TEXT,
  website             TEXT,
  social_links        JSONB DEFAULT '{}',
  -- Legal
  legal_form          TEXT,
  siret               TEXT,
  vat_number          TEXT,
  -- Contact
  contact_first_name  TEXT,
  contact_last_name   TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  -- Address
  address_line1       TEXT,
  address_line2       TEXT,
  postal_code         TEXT,
  city                TEXT,
  country             TEXT DEFAULT 'FR',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- =====================================================
-- Booth locations (defined by organizer per edition)
-- =====================================================
CREATE TABLE public.booth_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,             -- e.g., "A1", "B3", "EXT-1"
  zone        TEXT,                      -- e.g., "Hall A", "Exterior", "Food Court"
  width_m     NUMERIC(5,2),
  depth_m     NUMERIC(5,2),
  has_electricity BOOLEAN NOT NULL DEFAULT false,
  max_wattage     INTEGER,
  has_water       BOOLEAN NOT NULL DEFAULT false,
  is_interior     BOOLEAN NOT NULL DEFAULT true,
  is_accessible   BOOLEAN NOT NULL DEFAULT true, -- PMR
  price_cents     INTEGER NOT NULL DEFAULT 0,
  equipment_included TEXT[] DEFAULT '{}', -- tables, chairs, etc.
  notes       TEXT,
  -- Floor plan position (JSONB for Fabric.js coordinates)
  plan_position JSONB,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(edition_id, code)
);

-- =====================================================
-- Booth applications (exhibitor applies to an edition)
-- =====================================================
CREATE TABLE public.booth_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  exhibitor_id    UUID NOT NULL REFERENCES public.exhibitor_profiles(id) ON DELETE CASCADE,
  -- Requested booth preferences
  preferred_zone      TEXT,
  requested_width_m   NUMERIC(5,2),
  requested_depth_m   NUMERIC(5,2),
  needs_electricity   BOOLEAN NOT NULL DEFAULT false,
  requested_wattage   INTEGER,
  needs_water         BOOLEAN NOT NULL DEFAULT false,
  needs_tables        INTEGER DEFAULT 0,
  needs_chairs        INTEGER DEFAULT 0,
  special_requests    TEXT,
  products_description TEXT,
  -- Status workflow
  status          public.application_status NOT NULL DEFAULT 'draft',
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  -- Assignment (after approval)
  assigned_booth_id UUID REFERENCES public.booth_locations(id),
  -- Payment
  amount_cents    INTEGER,
  is_paid         BOOLEAN NOT NULL DEFAULT false,
  paid_at         TIMESTAMPTZ,
  -- Documents
  documents       JSONB DEFAULT '{}',  -- {insurance: url, identity: url, etc.}
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(edition_id, exhibitor_id)
);

CREATE INDEX idx_booth_applications_edition ON public.booth_applications(edition_id);
CREATE INDEX idx_booth_applications_status ON public.booth_applications(status);
```

### 3.5 Programming Tables

```sql
-- =====================================================
-- Venues / Stages
-- =====================================================
CREATE TABLE public.venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  venue_type  TEXT,                  -- 'stage', 'hall', 'room', 'outdoor'
  capacity    INTEGER,
  address     TEXT,
  plan_position JSONB,              -- position on floor plan
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Events / Activities
-- =====================================================
CREATE TABLE public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  venue_id    UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,                  -- 'concert', 'workshop', 'panel', 'contest', 'meet_greet'
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  image_url   TEXT,
  max_participants INTEGER,
  speaker_names   TEXT[] DEFAULT '{}',
  tags        TEXT[] DEFAULT '{}',
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_edition ON public.events(edition_id);
CREATE INDEX idx_events_time ON public.events(start_time, end_time);
```

### 3.6 Volunteer Tables

```sql
-- =====================================================
-- Volunteer Roles (defined per festival)
-- =====================================================
CREATE TABLE public.volunteer_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,         -- 'Security', 'Info Point', 'Setup Crew'
  description TEXT,
  color       TEXT,                  -- for UI display
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Shifts
-- =====================================================
CREATE TABLE public.shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  role_id     UUID REFERENCES public.volunteer_roles(id) ON DELETE SET NULL,
  venue_id    UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  max_volunteers INTEGER NOT NULL DEFAULT 1,
  status      public.shift_status NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Shift Assignments
-- =====================================================
CREATE TABLE public.shift_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shift_id, user_id)
);
```

### 3.7 Budget Tables

```sql
CREATE TABLE public.budget_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  entry_type  public.budget_entry_type NOT NULL,
  color       TEXT,
  sort_order  INTEGER DEFAULT 0,
  UNIQUE(festival_id, name, entry_type)
);

CREATE TABLE public.budget_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  entry_type  public.budget_entry_type NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  date        DATE NOT NULL,
  receipt_url TEXT,
  payment_method TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_entries_edition ON public.budget_entries(edition_id);
```

### 3.8 Equipment Tables

```sql
CREATE TABLE public.equipment_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,                   -- 'furniture', 'tech', 'safety', 'decor'
  unit        TEXT DEFAULT 'unit',    -- 'unit', 'meter', 'kg'
  photo_url   TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  assigned_to_type TEXT,              -- 'booth', 'venue', 'event', 'general'
  assigned_to_id   UUID,             -- polymorphic FK
  quantity    INTEGER NOT NULL DEFAULT 1,
  status      TEXT DEFAULT 'requested', -- requested, delivered, returned
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9 Floor Plan Tables

```sql
CREATE TABLE public.floor_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  UUID NOT NULL REFERENCES public.editions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Main Plan',
  width_px    INTEGER NOT NULL DEFAULT 1200,
  height_px   INTEGER NOT NULL DEFAULT 800,
  grid_size   INTEGER NOT NULL DEFAULT 20,
  background_url TEXT,
  -- Full Fabric.js canvas JSON
  canvas_data JSONB NOT NULL DEFAULT '{}',
  version     INTEGER NOT NULL DEFAULT 1,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.10 Notification Tables

```sql
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
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
```

### 3.11 Favorites (visitors can favorite festivals)

```sql
CREATE TABLE public.festival_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, festival_id)
);
```

### 3.12 Key Functions and Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign owner role when creating festival
CREATE OR REPLACE FUNCTION public.handle_festival_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.festival_members (festival_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  
  -- Also upgrade user to organizer platform role if they are just 'user'
  UPDATE public.profiles
  SET platform_role = 'organizer'
  WHERE id = NEW.created_by AND platform_role = 'user';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_festival_created
  AFTER INSERT ON public.festivals
  FOR EACH ROW EXECUTE FUNCTION public.handle_festival_created();

-- Updated_at trigger (reusable)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
-- (one CREATE TRIGGER per table, e.g.:)
-- CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 4. RLS Policy Strategy

The RLS strategy follows a **systematic, layered approach** rather than the ad-hoc policies in the prototype.

### 4.1 Helper Functions (used in all policies)

```sql
-- Check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND platform_role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check user's role in a festival
CREATE OR REPLACE FUNCTION public.get_festival_role(p_festival_id UUID)
RETURNS public.festival_role AS $$
  SELECT role FROM public.festival_members
  WHERE festival_id = p_festival_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has at least one of the given roles in a festival
CREATE OR REPLACE FUNCTION public.has_festival_role(
  p_festival_id UUID,
  p_roles public.festival_role[]
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.festival_members
    WHERE festival_id = p_festival_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shortcut: is festival admin (owner or admin role)
CREATE OR REPLACE FUNCTION public.is_festival_admin(p_festival_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_festival_role(p_festival_id, ARRAY['owner', 'admin']::public.festival_role[]);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shortcut: is festival editor+
CREATE OR REPLACE FUNCTION public.is_festival_editor(p_festival_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_festival_role(p_festival_id, ARRAY['owner', 'admin', 'editor']::public.festival_role[]);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shortcut: is festival moderator+
CREATE OR REPLACE FUNCTION public.is_festival_moderator(p_festival_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_festival_role(
    p_festival_id,
    ARRAY['owner', 'admin', 'editor', 'moderator']::public.festival_role[]
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4.2 Policy Pattern per Table

Every table follows one of these patterns:

**Pattern A: "Platform-level table"** (profiles, festivals, festival_favorites)
- SELECT: public or own data
- INSERT/UPDATE/DELETE: own data or platform admin

**Pattern B: "Festival-scoped table"** (editions, cms_pages, events, venues, etc.)
- SELECT: public if festival is published, otherwise festival members only
- INSERT/UPDATE/DELETE: festival admin/editor/moderator (depends on table)

**Pattern C: "User-scoped within festival"** (booth_applications, shift_assignments, notifications)
- SELECT: own data + festival moderator+
- INSERT: own data
- UPDATE: own data (limited fields) + festival moderator+
- DELETE: festival admin only

### 4.3 Concrete Policy Examples

```sql
-- === profiles ===
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Platform admins can update any profile"
  ON public.profiles FOR UPDATE USING (public.is_platform_admin());

-- === festivals ===
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published festivals are viewable by everyone"
  ON public.festivals FOR SELECT
  USING (status = 'published' OR public.is_platform_admin() OR public.has_festival_role(id, ARRAY['owner','admin','editor','moderator','volunteer','exhibitor']::public.festival_role[]));

CREATE POLICY "Organizers can create festivals"
  ON public.festivals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Festival admins can update their festival"
  ON public.festivals FOR UPDATE
  USING (public.is_festival_admin(id) OR public.is_platform_admin());

CREATE POLICY "Only platform admins can delete festivals"
  ON public.festivals FOR DELETE
  USING (public.is_platform_admin());

-- === editions (scoped through festival) ===
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editions viewable if festival is accessible"
  ON public.editions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.festivals f
      WHERE f.id = festival_id
        AND (f.status = 'published' OR public.is_festival_admin(f.id))
    )
  );

CREATE POLICY "Festival admins can manage editions"
  ON public.editions FOR ALL
  USING (
    public.is_festival_admin(festival_id) OR public.is_platform_admin()
  );

-- === booth_applications (user-scoped) ===
ALTER TABLE public.booth_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibitors can view own applications"
  ON public.booth_applications FOR SELECT
  USING (
    exhibitor_id IN (SELECT id FROM public.exhibitor_profiles WHERE user_id = auth.uid())
    OR public.is_festival_moderator(
      (SELECT festival_id FROM public.editions WHERE id = edition_id)
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Exhibitors can create applications"
  ON public.booth_applications FOR INSERT
  WITH CHECK (
    exhibitor_id IN (SELECT id FROM public.exhibitor_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Moderators can update applications"
  ON public.booth_applications FOR UPDATE
  USING (
    -- Own application (limited fields via application logic)
    exhibitor_id IN (SELECT id FROM public.exhibitor_profiles WHERE user_id = auth.uid())
    OR public.is_festival_moderator(
      (SELECT festival_id FROM public.editions WHERE id = edition_id)
    )
    OR public.is_platform_admin()
  );
```

The same approach applies to all tables. The key principle is: **every policy delegates to the helper functions** so that role changes propagate automatically without policy rewrites.

---

## 5. Routing Architecture

### 5.1 Hostname-Based Tenant Resolution

The core architectural decision: the **tenant is resolved from the hostname**, not from a URL path parameter.

```
festosh.miyukini.com          -> Platform routes
{slug}.miyukini.com           -> Festival sub-site routes
{slug}.miyukini.com/admin     -> Festival admin routes
```

In `src/router.tsx`, the routing tree is selected based on the resolved tenant:

```typescript
// Pseudocode for router.tsx
const hostname = window.location.hostname;
const subdomain = extractSubdomain(hostname); // null for main platform

if (!subdomain || subdomain === 'festosh' || subdomain === 'www') {
  return <PlatformRoutes />;
} else {
  return <FestivalRoutes slug={subdomain} />;
}
```

### 5.2 Platform Routes (`festosh.miyukini.com`)

```
/                           -> HomePage (landing + directory preview)
/directory                  -> DirectoryPage (full festival search)
/login                      -> LoginPage
/signup                     -> SignupPage
/reset-password             -> ResetPasswordPage
/dashboard                  -> DashboardPage (role-adaptive)
/profile                    -> ProfilePage
/festivals/new              -> CreateFestivalPage (organizer+)
/admin                      -> PlatformDashboardPage (platform admin)
/admin/users                -> PlatformUsersPage
/admin/festivals            -> PlatformFestivalsPage
```

### 5.3 Festival Sub-site Routes (`{slug}.miyukini.com`)

**Public routes:**
```
/                           -> FestivalHomePage (CMS homepage)
/page/:pageSlug             -> FestivalPageRenderer (CMS dynamic page)
/schedule                   -> FestivalSchedulePage
/map                        -> FestivalMapPage (read-only floor plan)
/exhibitors                 -> FestivalExhibitorsPage (public directory)
/apply                      -> FestivalApplyPage (exhibitor application)
/:editionSlug               -> Edition-specific pages
/:editionSlug/schedule      -> Edition schedule
```

**Admin routes (festival organizer panel):**
```
/admin                      -> AdminOverviewPage
/admin/settings             -> AdminSettingsPage
/admin/members              -> AdminMembersPage
/admin/cms                  -> AdminCmsPage
/admin/cms/:pageId          -> Page editor
/admin/programming          -> AdminProgrammingPage
/admin/venues               -> AdminVenuesPage
/admin/floor-plan           -> AdminFloorPlanPage
/admin/exhibitors           -> AdminExhibitorsPage
/admin/applications         -> AdminApplicationsPage
/admin/volunteers           -> AdminVolunteersPage
/admin/budget               -> AdminBudgetPage
/admin/equipment            -> AdminEquipmentPage
```

### 5.4 Route Protection

```typescript
// AuthGuard component checks:
// 1. Is user authenticated? (redirect to /login if not)
// 2. Does user have required platform_role? (redirect to /unauthorized)
// 3. Does user have required festival_role? (redirect to /unauthorized)

<Route element={<AuthGuard />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

<Route element={<AuthGuard festivalRoles={['owner', 'admin', 'editor']} />}>
  <Route path="/admin/*" element={<FestivalAdminLayout />}>
    ...
  </Route>
</Route>
```

---

## 6. State Management Strategy

### 6.1 Three Layers of State

| Layer | Tool | Purpose |
|-------|------|---------|
| **Server state** | TanStack Query | All data from Supabase (festivals, editions, exhibitors, etc.) |
| **Client state** | Zustand | UI state, current tenant context, auth session cache |
| **URL state** | React Router | Current route, page params, search/filter params |

### 6.2 Zustand Stores

**auth-store.ts** -- Synchronized with Supabase Auth:
```typescript
interface AuthState {
  user: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: Profile | null) => void;
  logout: () => Promise<void>;
}
```

**tenant-store.ts** -- Resolved once on app mount from hostname:
```typescript
interface TenantState {
  festival: Festival | null;       // Current festival (if on subdomain)
  activeEdition: Edition | null;   // Current active edition
  userRole: FestivalRole | null;   // Current user's role in this festival
  isPlatform: boolean;             // true if on main domain
  isLoading: boolean;
  // Actions
  resolveTenant: (slug: string) => Promise<void>;
  setActiveEdition: (edition: Edition) => void;
}
```

**ui-store.ts** -- Ephemeral UI state:
```typescript
interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  // Actions
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setTheme: (theme: string) => void;
}
```

### 6.3 TanStack Query Key Convention

All query keys follow a hierarchical namespace:

```typescript
// Query key factory
export const queryKeys = {
  festivals: {
    all: ['festivals'] as const,
    list: (filters: Filters) => ['festivals', 'list', filters] as const,
    detail: (id: string) => ['festivals', 'detail', id] as const,
  },
  editions: {
    all: (festivalId: string) => ['editions', festivalId] as const,
    detail: (id: string) => ['editions', 'detail', id] as const,
  },
  exhibitors: {
    byEdition: (editionId: string) => ['exhibitors', 'edition', editionId] as const,
    applications: (editionId: string) => ['applications', editionId] as const,
    myApplications: (userId: string) => ['applications', 'user', userId] as const,
  },
  // ... same pattern for every domain
} as const;
```

---

## 7. Service Layer Architecture

### 7.1 Base Service Pattern

Every service follows the same structure. The base provides standardized error handling:

```typescript
// services/base.service.ts
export abstract class BaseService {
  protected supabase = getSupabaseClient();
  protected abstract readonly TABLE: string;
  protected abstract readonly MODULE: string;

  protected handleError(operation: string, error: unknown): never {
    logger.error(this.MODULE, operation, error);
    if (error instanceof Error) throw error;
    throw new Error(`${this.MODULE}.${operation} failed`);
  }
}
```

### 7.2 Service Method Signatures

Each service exposes a plain object (not a class) for simpler testing and tree-shaking. The key improvement over the prototype is that **every service method that operates within a festival context takes `festivalId` or `editionId` explicitly** -- no implicit globals.

```typescript
// services/festival.service.ts
export const festivalService = {
  async getPublished(filters: DirectoryFilters): Promise<Festival[]> { ... },
  async getById(id: string): Promise<Festival> { ... },
  async getBySlug(slug: string): Promise<Festival> { ... },
  async create(data: CreateFestivalInput): Promise<Festival> { ... },
  async update(id: string, data: UpdateFestivalInput): Promise<Festival> { ... },
  async delete(id: string): Promise<void> { ... },
};
```

### 7.3 Service-to-Hook Mapping

Every service gets a corresponding hooks file in its feature module. The hooks use TanStack Query and delegate to the service:

```
Service method          ->  Hook
festivalService.getById ->  useFestival(id)
eventService.list       ->  useEvents(editionId)
boothAppService.create  ->  useCreateApplication() (mutation)
```

---

## 8. Component Architecture

### 8.1 Component Hierarchy

```
Pages (thin wrappers, route-level)
  └── Layouts (shell with nav, sidebar, header)
       └── Features (self-contained modules)
            └── Shared Components (DataTable, StatusBadge, etc.)
                 └── UI Primitives (shadcn/ui: Button, Card, Dialog)
```

### 8.2 Feature Module Convention

Every feature module follows this exact structure:

```
features/{name}/
  ├── index.ts              # Public API (re-exports)
  ├── hooks.ts              # TanStack Query hooks
  ├── types.ts              # Feature-specific types (if needed beyond shared types/)
  └── components/
      ├── {Component1}.tsx
      ├── {Component2}.tsx
      └── ...
```

The `index.ts` is the **only import boundary**. Other modules import from the feature via its index, never reaching into internal components.

### 8.3 Layout Strategy

- **PlatformLayout**: Top navbar with logo, search, auth buttons. Content area below.
- **FestivalPublicLayout**: Festival-branded header (uses theme colors from `festivals.theme_*`), festival nav, footer. Mobile: bottom nav.
- **FestivalAdminLayout**: Collapsible sidebar with admin sections (CMS, Programming, Exhibitors, Volunteers, Budget, Equipment, Settings). Top bar with festival name and user menu.
- **AdminLayout**: Platform admin sidebar.
- **AuthLayout**: Centered card layout for login/signup.

### 8.4 Theming Strategy

Each festival's theme colors are stored in the `festivals` table and injected as CSS custom properties at the `FestivalPublicLayout` level:

```typescript
// In FestivalPublicLayout
<div style={{
  '--festival-primary': festival.theme_primary_color,
  '--festival-secondary': festival.theme_secondary_color,
} as React.CSSProperties}>
  {children}
</div>
```

This is combined with Tailwind's `hsl(var(...))` pattern from shadcn so that festival-specific colors cascade through all components without any component changes.

---

## 9. Step-by-Step Implementation Order

### Phase 0: Project Scaffolding (Day 1)

1. Initialize the Vite + React + TypeScript project with `npm create vite@latest . -- --template react-ts`
2. Install all dependencies:
   - `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-router-dom`
   - `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/typography`
   - `class-variance-authority`, `clsx`, `tailwind-merge`
   - `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`
   - `date-fns`, `sonner`
3. Configure shadcn/ui (`npx shadcn@latest init`)
4. Set up `vite.config.ts` with path aliases, chunk splitting
5. Set up `tailwind.config.ts` with CSS variable theming
6. Create `.env.example` and `src/config/env.ts`
7. Create `CLAUDE.md` with project conventions
8. Initialize git, create initial commit

### Phase 1: Supabase Foundation (Days 2-3)

1. Create the Supabase project
2. Write all migration files in order (enums -> core tables -> domain tables -> RLS -> functions -> triggers)
3. Run migrations against the Supabase instance
4. Generate TypeScript types with `supabase gen types typescript`
5. Create `src/lib/supabase/client.ts` (singleton, env-only, no hardcoded keys)
6. Create `src/lib/supabase/realtime.ts`
7. Create `src/services/base.service.ts`
8. Verify the `handle_new_user` trigger works with a test signup

### Phase 2: Auth + Profiles + Stores (Days 4-5)

1. Create `stores/auth-store.ts` (Zustand)
2. Create `stores/tenant-store.ts` (Zustand)
3. Create `stores/ui-store.ts` (Zustand)
4. Create `services/auth.service.ts` and `services/profile.service.ts`
5. Create `features/auth/` (LoginForm, SignupForm, ResetPasswordForm, AuthGuard)
6. Create `hooks/use-auth.ts` and `hooks/use-tenant.ts`
7. Create `src/config/query-client.ts`
8. Wire up `App.tsx` with providers (QueryClientProvider, one single `<AppShell>`)

### Phase 3: Routing + Layouts + Tenant Resolution (Days 6-7)

1. Create `src/router.tsx` with hostname-based routing split
2. Create all 5 layout components
3. Create `src/components/navigation/` (PlatformNav, FestivalNav, FestivalAdminSidebar, MobileBottomNav)
4. Create placeholder pages for all routes
5. Test tenant resolution: `festosh.miyukini.com` vs `{slug}.miyukini.com`
6. Set up development proxy (in `vite.config.ts` or `/etc/hosts`) to test subdomains locally

### Phase 4: Festival CRUD + Directory (Days 8-10)

1. Create `services/festival.service.ts` and `services/festival-member.service.ts`
2. Create `features/directory/` (DirectoryGrid, FestivalCard, DirectoryFilters, FestivalSearch)
3. Create `features/festival-admin/` (CreateFestivalForm, FestivalSettings, FestivalMembers, FestivalOverview)
4. Create `features/dashboard/` (role-adaptive dashboards)
5. Implement festival favorites
6. Wire up platform HomePage and DirectoryPage

### Phase 5: Editions + CMS (Days 11-14)

1. Create `services/cms-page.service.ts` and `services/cms-block.service.ts`
2. Create edition management (create, edit, list, status transitions)
3. Create `features/cms/` -- this is the most complex feature:
   - PageList with drag-to-reorder
   - PageEditor with block management
   - BlockEditor with per-type forms
   - BlockRenderer for public display
   - All block type components (HeroBlock, TextBlock, ImageBlock, etc.)
4. Wire up FestivalHomePage and FestivalPageRenderer

### Phase 6: Exhibitor Management (Days 15-18)

1. Create `services/exhibitor.service.ts`, `services/booth-application.service.ts`, `services/booth-location.service.ts`
2. Create `features/exhibitors/`:
   - ApplicationForm (public, used by exhibitors to apply)
   - ApplicationList + ApplicationReview (admin side)
   - BoothLocationManager (CRUD for booth locations with options)
   - ExhibitorDirectory (public list of approved exhibitors)
   - ExhibitorCard, ExhibitorDetail
3. Implement the full application workflow: draft -> submit -> review -> approve/reject -> assign booth -> payment

### Phase 7: Programming + Venues (Days 19-21)

1. Create `services/event.service.ts` and `services/venue.service.ts`
2. Create `features/programming/` (EventList, EventForm, ScheduleView, ScheduleTimeline)
3. Create `features/venues/` (VenueList, VenueForm, StageSchedule)
4. Wire up FestivalSchedulePage (public)
5. Wire up admin programming and venue pages

### Phase 8: Floor Plan Editor (Days 22-25)

1. Install Fabric.js
2. Create `services/floor-plan.service.ts`
3. Create `features/floor-plan/`:
   - FloorPlanCanvas (Fabric.js integration with grid, zoom, pan)
   - FloorPlanToolbar (add elements: booths, icons, walls, text)
   - FloorPlanElementPanel (properties editor for selected element)
   - BoothAssignment (link floor plan booth to booth_locations)
   - FloorPlanViewer (read-only public version)
4. Wire up admin and public map pages

### Phase 9: Volunteers + Budget + Equipment (Days 26-29)

1. Create remaining services
2. Create `features/volunteers/` (VolunteerList, VolunteerSchedule, ShiftManager, RoleAssignment, MyShifts)
3. Create `features/budget/` (BudgetOverview, BudgetEntryForm, BudgetTable, BudgetCharts, BudgetReport)
4. Create `features/equipment/` (EquipmentCatalog, EquipmentForm, EquipmentAssignment, InventoryTracker)

### Phase 10: Notifications + Polish (Days 30-32)

1. Create `services/notification.service.ts`
2. Create `features/notifications/` (NotificationCenter, NotificationItem, NotificationPreferences)
3. Set up Supabase Realtime subscriptions for live notifications
4. Create Supabase Edge Functions for email notifications
5. Implement `stores/notification-store.ts` with Realtime integration
6. Mobile responsiveness audit and fixes
7. Error boundaries, loading states, empty states across all features

### Phase 11: Testing + Deployment (Days 33-35)

1. Set up Vitest + React Testing Library
2. Write tests for critical flows: auth, tenant resolution, application workflow
3. Configure DNS for `*.miyukini.com` wildcard subdomain
4. Deploy to Vercel/Cloudflare with wildcard domain support
5. Final RLS policy audit

---

## 10. Key Design Decisions and Trade-offs

### Decision 1: Hostname-based multi-tenancy vs. path-based

**Chosen**: Hostname-based (`{slug}.miyukini.com`)
**Alternative**: Path-based (`festosh.miyukini.com/{slug}/...`)
**Rationale**: Hostname-based gives each festival a true identity with its own URL root. It enables full CSS theming without namespace conflicts. The trade-off is that local development requires hosts file or proxy configuration for subdomain testing, and deployment requires wildcard DNS + wildcard SSL. This is manageable with Vercel or Cloudflare.

### Decision 2: Zustand for client state vs. React Context everywhere

**Chosen**: Zustand for auth, tenant, and UI state. TanStack Query for all server state.
**Alternative**: The prototype used React Context for everything.
**Rationale**: Context causes unnecessary re-renders of the entire subtree when any part of state changes. Zustand provides selector-based subscriptions. TanStack Query provides caching, background refetch, and optimistic updates out of the box. This eliminates the 7-layer provider nesting from the prototype.

### Decision 3: Feature module pattern vs. flat component directory

**Chosen**: Feature modules with barrel exports (`features/{name}/index.ts`)
**Alternative**: The prototype mixed `components/editions/`, `lib/supabase/editionService.ts`, `hooks/useEdition.ts` across 3 directories.
**Rationale**: Co-locating types, service, hooks, and components within a feature module makes each feature independently refactorable and testable. The import boundary via index.ts prevents spaghetti dependencies.

### Decision 4: festival_members table vs. user_type on profiles

**Chosen**: Separate `festival_members` join table with per-festival roles.
**Alternative**: The prototype stored a single `user_type` on `profiles`.
**Rationale**: A user can be an exhibitor at Festival A and a volunteer at Festival B. The prototype's flat `user_type` cannot represent this. The join table enables true multi-tenancy. The `platform_role` on profiles still exists for platform-level concerns (organizer can create festivals, admin manages platform).

### Decision 5: Editions as a first-class entity vs. single-festival assumption

**Chosen**: Explicit `editions` table under `festivals`.
**Alternative**: The prototype had editions but they were not cleanly scoped.
**Rationale**: A festival like "Japan Expo" has a new edition every year. All operational data (exhibitors, budget, schedule, floor plan) is scoped to an edition, not to the festival itself. The festival is the persistent brand; the edition is the instance.

### Decision 6: RLS helper functions vs. inline policy expressions

**Chosen**: Reusable `is_festival_admin()`, `is_festival_moderator()`, `has_festival_role()` functions.
**Alternative**: The prototype inlined complex subqueries in each policy.
**Rationale**: With 20+ tables all needing similar access checks, inline policies are unmaintainable and error-prone. Functions ensure consistency and allow role hierarchy changes in one place.

### Decision 7: CMS as block-based content vs. markdown/rich text

**Chosen**: Block-based CMS (similar to WordPress Gutenberg / Notion blocks).
**Alternative**: Simple rich text editor per page.
**Rationale**: Festival websites need structured content: hero banners, image galleries, embedded schedules, exhibitor lists. A block-based system lets organizers compose pages from pre-built components without writing HTML, while keeping the data structured for rendering.

### Decision 8: No SSR framework (pure SPA)

**Chosen**: Vite SPA with client-side routing.
**Alternative**: Next.js or Remix for SSR/SSG.
**Rationale**: The tech stack requirement mandates Vite + React Router. The SEO concern for festival public pages is real but addressable with prerendering or meta tag injection at the CDN level. The admin panels (the majority of the app) do not need SSR. This keeps the stack simpler and the deployment straightforward.

---

### Critical Files for Implementation

- `/c/Users/miyuk/Festosh/src/router.tsx` -- The routing hub that splits between platform and festival sub-site routes based on hostname. Every other page depends on this file being correct.
- `/c/Users/miyuk/Festosh/src/stores/tenant-store.ts` -- The Zustand store that resolves the current festival from the subdomain and holds the active edition context. This is the multi-tenancy lynchpin.
- `/c/Users/miyuk/Festosh/supabase/migrations/00000000000002_create_core_tables.sql` -- The migration that creates `profiles`, `festivals`, `festival_members`, and `editions`. Every other table and policy depends on these core tables.
- `/c/Users/miyuk/Festosh/supabase/migrations/00000000000011_create_rls_policies.sql` -- The consolidated RLS policy file with helper functions. This is what makes the entire multi-tenant security model work.
- `/c/Users/miyuk/Festosh/src/services/base.service.ts` -- The base service pattern that all 15+ domain services extend. Getting this abstraction right determines the consistency of the entire data access layer.