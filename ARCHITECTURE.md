# Architecture Festosh

## Vue d'ensemble

Festosh est une plateforme SaaS multi-tenant pour la gestion de festivals et conventions. L'architecture repose sur un frontend React SPA communiquant avec une API REST Hono, le tout sauvegarde dans une base SQLite locale via Drizzle ORM.

## Stack

- **Frontend** : React 19 + TypeScript + Vite 8 + TailwindCSS + shadcn/ui
- **Backend** : Hono sur Node.js
- **Base de donnees** : SQLite (better-sqlite3) + Drizzle ORM
- **Auth** : JWT avec bcrypt, rate limiting, token blacklist
- **Etat** : Zustand (client) + TanStack Query (serveur)

## Multi-tenancy

Le systeme de tenants est resolu cote client par le hostname :

```
festosh.net          -> mode plateforme
{slug}.festosh.net   -> mode festival
/f/:slug             -> mode festival (fallback path-based)
```

La resolution se fait dans `src/hooks/use-tenant.ts` et le contexte est stocke dans `src/stores/tenant-store.ts`.

## Routing

Un routeur unique (`src/router.tsx`) gere toutes les routes :

- `/` — Pages plateforme (PlatformLayout)
- `/f/:slug` — Pages publiques festival (FestivalPublicLayout)
- `/f/:slug/admin` — Administration festival (FestivalAdminLayout)
- `/admin` — Administration plateforme (PlatformAdminLayout)
- `/login`, `/signup` — Authentification (AuthLayout)

## Base de donnees

Schema defini dans `server/db/schema.ts` avec Drizzle ORM. Migrations SQL dans `server/db/migrations/`.

Tables principales :
- `profiles` — Utilisateurs avec roles plateforme et types multiples
- `festivals` — Festivals avec identite organisateur
- `festival_members` — Roles par festival
- `editions` — Editions annuelles d'un festival
- `cms_pages`, `cms_blocks` — Systeme CMS par festival
- `booth_types`, `booth_locations`, `booth_applications` — Gestion exposants
- `events`, `venues`, `shifts` — Programmation et benevoles
- `subscriptions`, `payments`, `platform_invoices` — Facturation
- `regulations`, `regulation_acceptances` — Reglements

## Securite

- JWT avec blacklist de tokens revoques
- Rate limiting sur les endpoints sensibles (auth, upload)
- CORS restreint a des origines explicites (regex)
- CSRF protection via header `Content-Type` / `X-Requested-With`
- Headers securite (HSTS, CSP, X-Frame-Options, etc.)
- Validation magic bytes sur les uploads
- Audit log avec IP et user-agent

## Modules fonctionnels

| Module | Description |
|--------|------------|
| CMS | Pages editables avec blocs (hero, texte, image, galerie, etc.) |
| Exposants | Profils, candidatures, types de stands, placement |
| Programmation | Evenements, lieux, planning |
| Benevoles | Profils, competences, candidatures, plannings |
| Budget | Revenus/depenses avec justificatifs |
| Materiel | Inventaire avec prets |
| Billetterie | Types de billets, ventes, scan QR |
| Marketplace | Produits en vente |
| Sponsors | Gestion des partenaires |
| Gamification | XP, coins, niveaux, tampons |
| Votes & Tombola | Votes publics et tirages au sort |
| Workspace | Documents collaboratifs, tableurs, calendrier, kanban |
| Questionnaires | Constructeur de sondages |
| Reglements | Templates et acceptation avec signature |
| Messagerie | Conversations entre utilisateurs |
| POS | Terminal de vente avec produits et comptabilite |
| Analytics | Tableau de bord statistiques |
| Roles personnalises | 40 permissions granulaires |
