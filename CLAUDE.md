# Festosh - SaaS de gestion de conventions et festivals

## Project Overview
Festosh is a multi-tenant SaaS platform for managing conventions and festivals.
Each festival gets its own sub-site at `{slug}.miyukini.com` with a WordPress-like CMS, admin panel, and public pages.

## Tech Stack
- **Frontend**: TypeScript, React 19, Vite 8
- **Backend**: Hono (Node.js API server)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Styling**: TailwindCSS 3.4 + shadcn/ui
- **Routing**: React Router v7
- **Data fetching**: TanStack Query v5
- **Client state**: Zustand v5
- **Forms**: react-hook-form + zod
- **Icons**: lucide-react

## Architecture Patterns

### Multi-tenancy
- Tenant resolution happens in `src/hooks/use-tenant.ts` based on hostname
- Platform mode: `festosh.miyukini.com` or `localhost`
- Festival mode: `{slug}.miyukini.com` or `localhost?festival={slug}` (dev)
- Tenant context stored in `src/stores/tenant-store.ts`

### Routing
- Two separate routers in `src/router.tsx`: `platformRouter` and `festivalRouter`
- App.tsx selects router based on tenant context
- Festival admin routes are nested under `/admin`

### Service Layer
- All Supabase queries go through services in `src/services/`
- `BaseService<T>` provides CRUD operations
- Services return `ServiceResult<T>` (data/error union)
- Never call supabase directly from components

### State Management
- **Zustand stores** (`src/stores/`): auth, tenant, UI, notifications
- **TanStack Query**: server state caching and sync
- **No React Context** for global state (avoids provider hell)

### Feature Modules
- Self-contained features in `src/features/{name}/`
- Each has: `components/`, `hooks.ts`, `index.ts`
- Feature hooks use services + TanStack Query

### User Roles
- **Platform roles** (on profiles table): user, organizer, admin
- **Festival roles** (on festival_members table): owner, admin, editor, moderator, volunteer, exhibitor
- Role checking via `src/hooks/use-festival-role.ts`

## Commands
- `npm run dev` - Start frontend dev server (port 3000)
- `npm run dev:server` - Start backend API server (port 3001)
- `npm run dev:all` - Start both frontend + backend concurrently
- `npm run build` - Type check + Vite production build
- `npm run lint` - ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run Drizzle migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Drizzle Studio (DB GUI)

## File Organization
```
src/
├── config/          # App config, env vars, query client
├── types/           # TypeScript interfaces (mirrors DB schema)
├── lib/             # Utilities, Supabase client
├── stores/          # Zustand stores (auth, tenant, UI)
├── services/        # Data access layer (Supabase queries)
├── hooks/           # Shared React hooks
├── features/        # Feature modules (self-contained)
├── layouts/         # Layout shells (Platform, Festival, Admin, Auth)
├── pages/           # Route-level page components (thin wrappers)
│   ├── platform/    # festosh.miyukini.com routes
│   ├── festival/    # {slug}.miyukini.com public routes
│   ├── festival-admin/ # {slug}.miyukini.com/admin routes
│   └── admin/       # Platform admin routes
└── components/      # Shared UI components
    ├── ui/          # shadcn/ui primitives
    ├── shared/      # App-specific shared components
    └── navigation/  # Nav components
```

## Database
- All tables in `public` schema with RLS enabled
- Migrations in `supabase/migrations/`
- Key tables: profiles, festivals, festival_members, editions, cms_pages, cms_blocks, exhibitor_profiles, booth_locations, booth_applications, venues, events, shifts, budget_entries, equipment_items, floor_plans, notifications

## Conventions
- All code in English (variable names, comments)
- UI text in French
- Named exports (no default exports except App.tsx)
- Path aliases: `@/` maps to `src/`
- Services return `ServiceResult<T>`, never throw
- Components use Tailwind classes, no CSS modules
