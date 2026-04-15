# Festosh

Plateforme SaaS multi-tenant de gestion de conventions et festivals.

Chaque festival dispose de son propre sous-site avec CMS, administration et pages publiques.

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | TypeScript, React 19, Vite 8, TailwindCSS, shadcn/ui |
| Backend | Hono (Node.js) |
| Base de donnees | SQLite via better-sqlite3 + Drizzle ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Routing | React Router v7 |
| State serveur | TanStack Query v5 |
| State client | Zustand v5 |
| Formulaires | react-hook-form + zod |

## Demarrage rapide

```bash
# Installer les dependances
npm install

# Copier la configuration
cp .env.example .env

# Lancer les migrations
npm run db:migrate

# (Optionnel) Peupler la base avec des donnees de demo
npm run db:seed

# Lancer le serveur API + frontend
npm run dev:all
```

- Frontend : http://localhost:3002
- API : http://localhost:3001

## Commandes

| Commande | Description |
|----------|------------|
| `npm run dev` | Frontend dev (port 3000) |
| `npm run dev:server` | API backend (port 3001) |
| `npm run dev:all` | Frontend + backend |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generer les migrations Drizzle |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:seed` | Peupler la base de demo |
| `npm run db:studio` | Drizzle Studio (GUI base de donnees) |

## Architecture

```
src/
  config/        # Configuration, env, query client
  types/         # Interfaces TypeScript
  lib/           # Utilitaires, client API
  stores/        # Zustand (auth, tenant, UI)
  hooks/         # Hooks React partages
  features/      # Modules fonctionnels autonomes
  layouts/       # Shells de mise en page
  pages/         # Composants de pages (par route)
    platform/    # Pages plateforme (festosh.net)
    festival/    # Pages publiques festival (/f/:slug)
    festival-admin/  # Admin festival (/f/:slug/admin)
    admin/       # Admin plateforme (/admin)
  components/    # Composants partages
    ui/          # Primitives shadcn/ui
    shared/      # Composants applicatifs

server/
  db/            # Schema Drizzle, migrations, seed
  routes/        # Routes API Hono
  middleware/    # Auth, roles festival
  lib/           # Utilitaires serveur
```

## Multi-tenancy

- **Mode plateforme** : `festosh.net` ou `localhost`
- **Mode festival** : `{slug}.festosh.net` ou `/f/:slug`
- Resolution du tenant dans `src/hooks/use-tenant.ts`

## Roles

- **Roles plateforme** (profil utilisateur) : `user`, `organizer`, `admin`
- **Roles festival** (par festival) : `owner`, `admin`, `editor`, `moderator`, `volunteer`, `exhibitor`

## Licence

Proprietary - Studio Miyukini
