# Festosh — Documentation technique

> Plateforme SaaS multi-tenant de gestion de festivals et conventions.
> Version 0.1.0 | Stack : React 19 + Hono + SQLite + Drizzle ORM

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Backend](#3-backend)
4. [Base de donnees](#4-base-de-donnees)
5. [API Reference](#5-api-reference)
6. [Frontend](#6-frontend)
7. [Modele de donnees](#7-modele-de-donnees)
8. [Securite](#8-securite)
9. [Configuration & Deploiement](#9-configuration--deploiement)
10. [Tests](#10-tests)

---

## 1. Vue d'ensemble

Festosh permet aux organisateurs de festivals de creer et gerer leur evenement en ligne : site public avec CMS, gestion des exposants et benevoles, billetterie, budget, programmation, gamification visiteurs, et outils collaboratifs d'equipe.

Chaque festival dispose de son propre sous-site (`{slug}.festosh.net`) avec une interface d'administration complete.

### Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19, TypeScript 5.9, Vite 8, TailwindCSS 3.4, shadcn/ui (Radix) |
| Backend | Hono 4.12 sur Node.js |
| Base de donnees | SQLite (better-sqlite3) + Drizzle ORM 0.45 |
| Authentification | JWT (jsonwebtoken) + bcryptjs (12 rounds) |
| Etat client | Zustand 5 (persistance localStorage) |
| Etat serveur | TanStack React Query 5 (stale 30s, cache 5min) |
| Formulaires | react-hook-form 7 + zod 3 |
| Routing | React Router 7 (SPA, createBrowserRouter) |
| Cartes | Leaflet + react-leaflet (OpenStreetMap) |
| Icones | lucide-react |
| Email | Nodemailer 8 |
| Securite XSS | DOMPurify 3 |

---

## 2. Architecture

### Diagramme

```
  Navigateur (React SPA)
       |
       | HTTPS (fetch JSON)
       v
  Hono API (Node.js, port 3001)
       |
       | Drizzle ORM
       v
  SQLite (WAL mode)
       |
       | copyFileSync / backup API
       v
  data/backups/ + data/backups-redundant/
```

### Multi-tenancy

La resolution du tenant se fait cote client dans `src/hooks/use-tenant.ts` :

| Hostname | Mode |
|----------|------|
| `festosh.net` ou `localhost` | Plateforme (pas de festival) |
| `{slug}.festosh.net` | Sous-site festival |
| `localhost?festival={slug}` | Mode festival en dev |
| `/f/:slug` (path) | Fallback path-based |

Le contexte est stocke dans `src/stores/tenant-store.ts` (Zustand).

### Groupes de routes

| Groupe | Layout | Prefixe URL |
|--------|--------|-------------|
| Auth | `AuthLayout` | `/login`, `/signup`, `/forgot-password`, `/reset-password/:token` |
| Plateforme | `PlatformLayout` | `/`, `/dashboard`, `/profile`, `/exhibitor`, `/visitor`, `/volunteer`, `/organizer`, `/pos/*`, `/messaging`, `/billing`, `/pricing` |
| Festival public | `FestivalPublicLayout` | `/f/:slug`, `/f/:slug/schedule`, `/f/:slug/map`, `/f/:slug/exhibitors`, `/f/:slug/apply`, `/f/:slug/regulations`, `/f/:slug/p/:pageSlug`, `/f/:slug/survey/:surveyId` |
| Festival admin | `FestivalAdminLayout` | `/f/:slug/admin/*` (30+ sous-routes) |
| Admin plateforme | `PlatformAdminLayout` | `/admin/*` (dashboard, users, festivals, tickets, billing) |

### Providers React (App.tsx)

```
StrictMode
  QueryClientProvider (TanStack)
    RouterProvider (React Router)
    Sonner (toasts, top-right, 4s)
    CookieConsent
    LoadingScreen (pendant init auth)
```

---

## 3. Backend

### Entry point (`server/index.ts`)

Le serveur Hono ecoute sur le port `PORT` (defaut 3001). Au demarrage :

1. Initialise la base SQLite + execute les migrations pendantes
2. Nettoie les tokens revoques expires
3. Demarre le backup automatique quotidien
4. Demarre le cleanup periodique des tokens (toutes les 6h)

### Pile de middleware (ordre d'execution)

1. **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` (1 an), `CSP`
2. **CORS** — Origines dynamiques (env `CORS_ORIGINS` ou localhost). Patterns regex pour sous-domaines `*.festosh.net`, `*.miyukini.com`, `*.miyukini-home.org`. Credentials: true, preflight cache 24h.
3. **Logger** — Hono built-in request logger
4. **CSRF** — Sur les mutations (POST/PUT/PATCH/DELETE) : exige `Content-Type: application/json` ou `multipart/form-data` ou header `X-Requested-With`

### Middleware auth (`server/middleware/auth.ts`)

| Export | Description |
|--------|-------------|
| `authMiddleware` | Verifie le JWT Bearer token. Injecte `userId` et `platformRole` dans le contexte Hono. |
| `optionalAuth` | Comme authMiddleware mais ne bloque pas si pas de token. |
| `requireRole(roles[])` | Verifie que `platformRole` est dans la liste. |
| `generateToken(userId, role)` | Genere un JWT (HS256, 24h, issuer: festosh, audience: festosh-app, JTI unique). |
| `hashPassword(password)` | Bcrypt avec 12 rounds. |
| `verifyPassword(password, hash)` | Comparaison bcrypt. |
| `rateLimit({ windowMs, max })` | Sliding window par IP+path. Map bornee a 50K entrees, cleanup 5min, eviction FIFO. |

### Middleware festival (`server/middleware/festival-auth.ts`)

| Export | Description |
|--------|-------------|
| `festivalMemberMiddleware` | Verifie que l'utilisateur est membre du festival. Auto-resout `festivalId` depuis `editionId`. Platform admin = owner bypass. |
| `requireFestivalRole(minRoles[])` | Verifie que le role festival est suffisant. |
| `hasMinRole(userRole, minRole)` | Compare selon la hierarchie. |

**Hierarchie des roles festival** (du plus eleve au plus bas) :
`owner` > `admin` > `editor` > `moderator` > `volunteer` > `exhibitor`

### Libraries serveur (`server/lib/`)

| Fichier | Exports | Description |
|---------|---------|-------------|
| `audit.ts` | `logAudit(c, action, resourceType?, resourceId?, details?)` | Log d'audit avec IP, user-agent, userId dans la table `audit_logs` |
| `backup.ts` | `performBackup()`, `performBackupSync()`, `listBackups()`, `startBackupSchedule()`, `stopBackupSchedule()` | Backup SQLite quotidien avec redondance, checksum SHA-256, rotation (14 max) |
| `email.ts` | `sendEmail(opts, festivalId?)`, `sendBulkEmail(recipients, subject, html, festivalId?)`, `getSmtpConfig(festivalId?)` | Envoi email via Nodemailer. Config SMTP par festival ou fallback plateforme |
| `encryption.ts` | `encrypt(plaintext)`, `decrypt(encrypted)`, `hmacHash(value)` | AES-256-GCM. PBKDF2 200K iterations. Sel derive dynamiquement. Cache de la cle |
| `file-validation.ts` | `validateFileContent(buffer, mime)`, `sanitizeFilename(name)` | Validation magic bytes (JPEG, PNG, WebP, PDF). Nettoyage nom de fichier |
| `format.ts` | `toSnakeCase(key)`, `formatResponse(obj, jsonFields?)` | Conversion camelCase→snake_case, parsing JSON imbriques |
| `geocode.ts` | `geocodeAddress(query, country?)`, `buildGeoQuery(fields)` | Geocoding OpenStreetMap Nominatim (1 req/s) |
| `sanitize.ts` | `sanitizeUser(user)` | Supprime passwordHash, tokens sensibles des reponses |

---

## 4. Base de donnees

### Configuration SQLite

```sql
PRAGMA journal_mode = WAL;          -- Meilleure concurrence lecture/ecriture
PRAGMA foreign_keys = ON;            -- Integrite referentielle
PRAGMA secure_delete = ON;           -- Ecrasement des donnees supprimees
PRAGMA auto_vacuum = INCREMENTAL;    -- Recuperation d'espace
PRAGMA busy_timeout = 5000;          -- Attente 5s en cas de verrou
```

### Tables par domaine

**Utilisateurs & Auth (4 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `profiles` | id, username, email, passwordHash, platformRole, userType, displayName, avatarUrl, xp, coins, xpLevel, isExhibitor, isVolunteer, isOrganizer, subscriptionStatus |
| `documents` | id, userId, documentType (kbis/insurance/id_card/other), status (pending/verified/rejected), fileUrl, expiresAt |
| `token_blacklist` | jti, expiresAt |
| `password_reset_tokens` | id, userId, tokenHash, expiresAt, usedAt |

**Festivals & Editions (4 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `festivals` | id, slug, name, description, logoUrl, bannerUrl, city, country, latitude, longitude, contactEmail, socialLinks (JSON), status (draft/published/archived), orgName, orgSiret, orgEmail, orgIban |
| `editions` | id, festivalId, name, startDate, endDate, status (planning→completed), registrationOpensAt, registrationClosesAt, capacity, visitorHours (JSON), allowBoothSelection, isActive |
| `festival_members` | id, festivalId, userId, role (owner/admin/editor/moderator/volunteer/exhibitor) |
| `festival_invites` | id, festivalId, role, token, maxUses, usesCount, expiresAt |

**CMS (3 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `cms_pages` | id, festivalId, slug, title, isPublished, isHomepage, isSystem, metaDescription, sortOrder |
| `cms_blocks` | id, pageId, blockType (25 types), content (JSON), settings (JSON), sortOrder, isVisible |
| `cms_navigation` | id, festivalId, label, linkType (internal/external/page), target, parentId, sortOrder, isVisible, openInNewTab |

**Exposants & Stands (4 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `exhibitor_profiles` | id, userId, companyName, legalName, description, logoUrl, website, siret, vatNumber, contactEmail, contactPhone, billingAddress, categories (JSON), isPmr, domains (JSON) |
| `booth_types` | id, editionId, name, widthM, depthM, priceCents, pricingMode (flat/per_day/per_m2), hasElectricity, hasWater, color, isActive |
| `booth_locations` | id, editionId, code, zone, boothTypeId, priceCents, planX, planY, isAvailable |
| `booth_applications` | id, editionId, exhibitorProfileId, status (draft→approved/rejected), boothTypeId, selectedBoothId, assignedBoothId, documents (JSON), amountCents, isPaid |

**Programmation (2 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `venues` | id, festivalId, name, venueType, capacity, planX, planY |
| `events` | id, editionId, venueId, title, category, startTime, endTime, isPublic, speakers (JSON), tags (JSON) |

**Benevoles (5 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `volunteer_roles` | id, festivalId, name, description, color |
| `shifts` | id, editionId, roleId, venueId, title, startTime, endTime, maxVolunteers, status |
| `shift_assignments` | id, shiftId, userId, assignedBy |
| `volunteer_profiles` | id, userId, skills (JSON), certifications (JSON), availability (JSON), preferredActions (JSON), bio, tshirtSize, hasCar, isPmr |
| `volunteer_applications` | id, festivalId, editionId, userId, volunteerProfileId, status (pending/accepted/rejected), motivation |

**Finance (3 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `budget_categories` | id, festivalId, name, entryType (income/expense), color |
| `budget_entries` | id, editionId, categoryId, entryType, description, amountCents, date, receiptUrl |
| `invoices` | id, festivalId, exhibitorProfileId, amountCents, status, dueDate |

**Materiel (3 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `equipment_items` | id, festivalId, name, category, unit, totalQuantity, valueCents, ownerName |
| `equipment_assignments` | id, itemId, editionId, assignedToType, quantity, status |
| `equipment_owners` | id, festivalId, name, contactInfo |

**Plans de salle (1 table)**

| Table | Colonnes cles |
|-------|--------------|
| `floor_plans` | id, editionId, name, widthPx, heightPx, gridSize, canvasData (JSON), version |

**Billetterie & Commerce (7 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `ticket_types` | id, editionId, name, priceCents, quantity, maxPerUser |
| `tickets` | id, ticketTypeId, userId, qrCode, scannedAt |
| `pos_categories` | id, exhibitorProfileId, name |
| `pos_products` | id, categoryId, name, priceCents, stock |
| `pos_sales` | id, exhibitorProfileId, items (JSON), totalCents |
| `marketplace_products` | id, exhibitorProfileId, name, priceCents, stock |
| `marketplace_orders` | id, buyerUserId, totalCents, status |

**Gamification & Visiteurs (8 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `stamp_cards` | id, editionId, name, totalStamps, rewardDescription |
| `user_stamps` | id, stampCardId, userId, stampIndex |
| `badges` | id, editionId, name, description, imageUrl, criteria (JSON) |
| `user_badges` | id, badgeId, userId |
| `scavenger_hunts` | id, editionId, name, checkpoints (JSON) |
| `votes` | id, editionId, category, title, options (JSON), isActive |
| `vote_entries` | id, voteId, userId, optionIndex |
| `raffles` | id, editionId, name, maxEntries, status |

**Workspace collaboratif (4 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `workspace_docs` | id, festivalId, title, content (JSON blocks), version, lastEditedBy |
| `workspace_sheets` | id, festivalId, title, columnsDef (JSON), rows (JSON), version |
| `workspace_calendars` | id, festivalId, name, color |
| `workspace_task_boards` | id, festivalId, title, columns (JSON avec cards) |

**Abonnements & Facturation (4 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `subscription_plans` | id, slug, name, priceCents, interval (monthly/yearly), features (JSON) |
| `subscriptions` | id, userId, planId, status (active/cancelled/trialing), currentPeriodStart, currentPeriodEnd |
| `payments` | id, userId, subscriptionId, amountCents, status (pending/succeeded/failed) |
| `platform_invoices` | id, userId, invoiceNumber, subtotalCents, taxRate, taxCents, totalCents, status |

**Autres (7 tables)**

| Table | Colonnes cles |
|-------|--------------|
| `notifications` | id, userId, festivalId, title, body, link, channel, isRead |
| `conversations` / `messages` | Messagerie inter-utilisateurs |
| `support_tickets` / `ticket_messages` | Support technique |
| `chatbot_faq` | FAQ par festival |
| `regulations` / `regulation_acceptances` | Reglements avec acceptation signee |
| `audit_logs` | userId, action, resourceType, resourceId, ipAddress, userAgent |
| `custom_roles` / `role_permissions` | Roles personnalises avec 40 permissions |

### Migrations

32 fichiers SQL dans `server/db/migrations/`, geres par Drizzle Kit. Le journal `meta/_journal.json` trace les migrations appliquees. Le systeme est idempotent : chaque migration est executee une seule fois.

### Backups automatiques

- **Frequence** : toutes les 24h (configurable `BACKUP_INTERVAL_HOURS`)
- **Backup au demarrage** : sauvegarde synchrone a chaque lancement
- **Repertoires** : `data/backups/` (primaire) + `data/backups-redundant/` (redondant)
- **Integrite** : checksum SHA-256 verifie entre les deux copies
- **Rotation** : garde les 14 derniers backups (configurable `MAX_BACKUPS`)
- **API admin** : `GET /api/platform-admin/backups` et `POST /api/platform-admin/backups`

---

## 5. API Reference

Toutes les routes sont montees sous le prefixe `/api`. Legende :
- `[AUTH]` = `authMiddleware` requis (JWT Bearer)
- `[MEMBER]` = `festivalMemberMiddleware` requis
- `[ROLE:x]` = `requireFestivalRole(['x', ...])` requis
- `[ADMIN]` = `requireRole(['admin'])` requis
- `[LIMIT]` = rate limiting applique

### Auth (`/api/auth`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| POST | `/register` | [LIMIT] | Inscription utilisateur |
| POST | `/login` | [LIMIT] | Connexion (retourne JWT) |
| GET | `/me` | [AUTH] | Profil utilisateur courant |
| PUT | `/me` | [AUTH] | Mise a jour du profil |
| POST | `/change-password` | [AUTH] [LIMIT] | Changement de mot de passe |
| POST | `/logout` | [AUTH] | Deconnexion (blacklist token) |
| POST | `/forgot-password` | [LIMIT] | Demande de reinitialisation |
| POST | `/reset-password` | | Reinitialisation avec token |
| POST | `/verify-email` | [LIMIT] | Verification email |
| POST | `/resend-verification` | [AUTH] | Renvoyer l'email de verification |

### Festivals (`/api/festivals`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/` | [AUTH] | Liste des festivals de l'utilisateur |
| POST | `/` | [AUTH] | Creer un festival (organizer/admin) |
| GET | `/:id` | | Details d'un festival |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier un festival |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer un festival |
| GET | `/:id/members` | [AUTH] [MEMBER] | Liste des membres |
| GET | `/:id/my-role` | [AUTH] | Role de l'utilisateur dans ce festival |
| POST | `/:id/members` | [AUTH] [MEMBER] | Inviter un membre |
| DELETE | `/:id/members/:userId` | [AUTH] [MEMBER] | Retirer un membre |
| GET | `/:id/setup-status` | [AUTH] [MEMBER] | Progression du wizard de configuration |
| POST | `/geocode-all` | [AUTH] [ADMIN] | Geocoder tous les festivals |

### Editions (`/api/editions`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:festivalId` | [AUTH] | Liste des editions |
| POST | `/festival/:festivalId` | [AUTH] [MEMBER] | Creer une edition |
| GET | `/:id` | [AUTH] | Details d'une edition |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier une edition |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer une edition |

### CMS (`/api/cms`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/pages` | | Liste des pages (public si publiees) |
| POST | `/festival/:fid/pages` | [AUTH] [MEMBER] | Creer une page |
| GET | `/pages/:id` | | Page par ID avec blocs |
| GET | `/festival/:fid/pages/by-slug/:slug` | | Page par slug |
| PUT | `/pages/:id` | [AUTH] [MEMBER] | Modifier une page |
| DELETE | `/pages/:id` | [AUTH] [MEMBER] | Supprimer une page |
| POST | `/pages/:pid/blocks` | [AUTH] [MEMBER] | Ajouter un bloc |
| PUT | `/blocks/:id` | [AUTH] [MEMBER] | Modifier un bloc |
| DELETE | `/blocks/:id` | [AUTH] [MEMBER] | Supprimer un bloc |
| PUT | `/pages/:pid/blocks/reorder` | [AUTH] [MEMBER] | Reordonner les blocs |
| GET | `/festival/:fid/navigation` | | Navigation CMS |
| POST | `/festival/:fid/navigation` | [AUTH] [MEMBER] | Ajouter un item de navigation |
| PUT | `/navigation/:id` | [AUTH] [MEMBER] | Modifier un item |
| DELETE | `/navigation/:id` | [AUTH] [MEMBER] | Supprimer un item |
| POST | `/festival/:fid/generate-system-pages` | [AUTH] [MEMBER] [ROLE:admin] | Generer les pages systeme |

### Exposants (`/api/exhibitors`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/profile` | [AUTH] | Profil exposant de l'utilisateur |
| POST | `/profile` | [AUTH] | Creer/modifier le profil exposant |
| GET | `/edition/:eid/booth-types` | | Types de stands disponibles |
| POST | `/edition/:eid/booth-types` | [AUTH] [MEMBER] | Creer un type de stand |
| PUT | `/booth-types/:id` | [AUTH] [MEMBER] | Modifier un type |
| DELETE | `/booth-types/:id` | [AUTH] [MEMBER] | Supprimer un type |
| GET | `/edition/:eid/locations` | | Emplacements de stands |
| POST | `/edition/:eid/locations` | [AUTH] [MEMBER] | Creer un emplacement |
| PUT | `/locations/:id` | [AUTH] [MEMBER] | Modifier un emplacement |
| DELETE | `/locations/:id` | [AUTH] [MEMBER] | Supprimer un emplacement |
| GET | `/edition/:eid/applications` | [AUTH] | Candidatures de l'edition |
| POST | `/edition/:eid/apply` | [AUTH] | Deposer une candidature |
| PUT | `/applications/:id/status` | [AUTH] [MEMBER] | Changer le statut (approve/reject) |
| PUT | `/applications/:id/assign-booth` | [AUTH] [MEMBER] | Assigner un emplacement |
| PUT | `/applications/:id/place` | [AUTH] [MEMBER] [ROLE:editor] | Placer sur le plan |
| GET | `/edition/:eid/booth-config` | [AUTH] | Config selection emplacements |
| PUT | `/edition/:eid/booth-config` | [AUTH] [MEMBER] [ROLE:admin] | Modifier la config |
| GET | `/edition/:eid/available-booths` | [AUTH] | Emplacements disponibles |
| POST | `/profile/upload-image` | [AUTH] | Upload image exposant |
| GET | `/images/:filename` | | Telecharger une image |

### Benevoles (`/api/volunteers`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/roles` | | Roles benevoles |
| POST | `/festival/:fid/roles` | [AUTH] [MEMBER] | Creer un role |
| GET | `/edition/:eid/shifts` | | Creneaux benevoles |
| POST | `/edition/:eid/shifts` | [AUTH] | Creer un creneau |
| PUT | `/shifts/:id` | [AUTH] | Modifier un creneau |
| DELETE | `/shifts/:id` | [AUTH] | Supprimer un creneau |
| POST | `/shifts/:id/assign` | [AUTH] | Assigner un benevole |
| DELETE | `/shifts/:id/assign/:userId` | [AUTH] | Retirer un benevole |
| GET | `/my-shifts/:editionId` | [AUTH] | Mes creneaux |

### Budget (`/api/budget`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/categories` | [AUTH] [MEMBER] | Categories budget |
| POST | `/festival/:fid/categories` | [AUTH] [MEMBER] | Creer une categorie |
| GET | `/edition/:eid/entries` | [AUTH] [MEMBER] | Ecritures de l'edition |
| POST | `/edition/:eid/entries` | [AUTH] [MEMBER] | Ajouter une ecriture |
| PUT | `/entries/:id` | [AUTH] | Modifier une ecriture |
| DELETE | `/entries/:id` | [AUTH] | Supprimer une ecriture |
| GET | `/edition/:eid/summary` | [AUTH] [MEMBER] | Resume financier |
| POST | `/receipt` | [AUTH] | Upload justificatif |
| GET | `/receipt/:filename` | | Telecharger justificatif |

### Materiel (`/api/equipment`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/items` | | Inventaire |
| POST | `/festival/:fid/items` | [AUTH] [MEMBER] | Ajouter un item |
| PUT | `/items/:id` | [AUTH] | Modifier |
| DELETE | `/items/:id` | [AUTH] | Supprimer |
| GET | `/edition/:eid/assignments` | | Attributions |
| POST | `/edition/:eid/assignments` | [AUTH] | Attribuer |
| PUT | `/assignments/:id` | [AUTH] | Modifier attribution |
| GET | `/festival/:fid/owners` | | Proprietaires |
| POST | `/festival/:fid/owners` | [AUTH] [MEMBER] | Ajouter proprietaire |
| PUT | `/owners/:id` | [AUTH] | Modifier |
| DELETE | `/owners/:id` | [AUTH] | Supprimer |

### Plans de salle (`/api/floor-plans`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid` | | Liste des plans |
| POST | `/edition/:eid` | [AUTH] | Creer un plan |
| GET | `/:id` | | Details du plan |
| PUT | `/:id` | [AUTH] | Modifier metadonnees |
| PUT | `/:id/canvas` | [AUTH] | Sauvegarder le canvas (JSON) |
| DELETE | `/:id` | [AUTH] | Supprimer |

### Programmation (`/api/events`, `/api/venues`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/events/edition/:eid` | | Evenements de l'edition |
| POST | `/events/edition/:eid` | [AUTH] | Creer un evenement |
| PUT | `/events/:id` | [AUTH] | Modifier |
| DELETE | `/events/:id` | [AUTH] | Supprimer |
| GET | `/venues/festival/:fid` | | Lieux du festival |
| POST | `/venues/festival/:fid` | [AUTH] | Creer un lieu |
| PUT | `/venues/:id` | [AUTH] | Modifier |
| DELETE | `/venues/:id` | [AUTH] | Supprimer |

### Artistes (`/api/artists`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid/public` | | Artistes publics |
| GET | `/edition/:eid` | [AUTH] [MEMBER] | Tous les artistes |
| POST | `/edition/:eid` | [AUTH] [MEMBER] | Ajouter |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer |
| PUT | `/:id/image` | [AUTH] [MEMBER] | Upload photo |
| GET | `/image/:filename` | | Telecharger photo |

### Billetterie (`/api/ticketing`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid/types` | [AUTH] | Types de billets |
| POST | `/edition/:eid/types` | [AUTH] [MEMBER] | Creer un type |
| PUT | `/edition/:eid/types/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/edition/:eid/types/:id` | [AUTH] [MEMBER] | Supprimer |
| POST | `/edition/:eid/purchase` | [AUTH] | Acheter un billet |
| POST | `/scan` | [AUTH] | Scanner un billet |
| GET | `/edition/:eid/stats` | [AUTH] [MEMBER] | Statistiques |

### POS (`/api/pos`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET/POST/PUT/DELETE | `/categories` | [AUTH] | CRUD categories |
| GET/POST/PUT/DELETE | `/products` | [AUTH] | CRUD produits |
| GET/POST/PUT/DELETE | `/coupons` | [AUTH] | CRUD coupons |
| POST | `/coupons/validate` | [AUTH] | Valider un coupon |
| POST | `/sales` | [AUTH] | Enregistrer une vente |
| GET | `/sales`, `/sales/:id` | [AUTH] | Historique ventes |
| GET/POST/DELETE | `/expenses` | [AUTH] | Depenses |
| GET | `/accounting` | [AUTH] | Rapport comptable |

### Marketplace (`/api/marketplace`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/shop` | | Parcourir la boutique |
| GET | `/shop/:productId` | | Details produit |
| POST | `/checkout` | [AUTH] | Commander |
| GET | `/my-orders` | [AUTH] | Mes commandes |
| GET | `/seller-orders` | [AUTH] | Commandes vendeur |
| PUT | `/orders/:id/status` | [AUTH] | Modifier statut commande |

### Sponsors (`/api/sponsors`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/public` | | Sponsors publics |
| GET | `/festival/:fid` | [AUTH] [MEMBER] | Tous les sponsors |
| POST | `/festival/:fid` | [AUTH] [MEMBER] | Ajouter |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer |
| GET/POST/PUT/DELETE | `/festival/:fid/tiers` | [AUTH] [MEMBER] | CRUD niveaux de sponsoring |

### Gamification (`/api/gamification`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET/POST | `/edition/:eid/stamps` | | Cartes de tampons |
| POST | `/stamps/scan` | [AUTH] | Scanner un tampon |
| GET | `/my-stamps/:stampCardId` | [AUTH] | Mes tampons |
| GET/POST | `/edition/:eid/badges` | | Badges |
| GET | `/my-badges` | [AUTH] | Mes badges |
| GET/POST | `/edition/:eid/hunts` | | Chasses au tresor |
| POST | `/hunts/scan` | [AUTH] | Scanner checkpoint |
| GET | `/my-hunts/:huntId` | [AUTH] | Ma progression |

### Votes (`/api/votes`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid` | | Votes ouverts |
| POST | `/edition/:eid` | [AUTH] [MEMBER] | Creer un vote |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| POST | `/:id/cast` | [AUTH] | Voter |
| GET | `/:id/results` | | Resultats |

### Tombola (`/api/raffles`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid/raffles` | | Tombolas |
| POST | `/edition/:eid/raffles` | [AUTH] [MEMBER] | Creer |
| PUT | `/raffles/:id` | [AUTH] [MEMBER] | Modifier |
| POST | `/raffles/:id/enter` | [AUTH] | Participer |
| POST | `/raffles/:id/draw` | [AUTH] [MEMBER] | Tirer au sort |
| GET | `/raffles/:id/results` | | Resultats |

### Files d'attente (`/api/queues`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid` | | Files actives |
| POST | `/edition/:eid` | [AUTH] [MEMBER] | Creer une file |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| POST | `/:id/join` | | Rejoindre la file |
| POST | `/entries/:id/complete` | [AUTH] [MEMBER] | Marquer comme servi |
| POST | `/entries/:id/cancel` | [AUTH] | Annuler |
| GET | `/:id/board` | | Tableau de bord |
| GET | `/my-position/:queueId` | [AUTH] | Ma position |

### Reservations (`/api/reservations`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/edition/:eid/slots` | | Creneaux disponibles |
| POST | `/edition/:eid/slots` | [AUTH] [MEMBER] | Creer un creneau |
| PUT | `/slots/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/slots/:id` | [AUTH] [MEMBER] | Supprimer |
| POST | `/slots/:id/reserve` | [AUTH] | Reserver |
| DELETE | `/reservations/:id` | [AUTH] | Annuler |
| GET | `/my-reservations` | [AUTH] | Mes reservations |

### Questionnaires (`/api/surveys`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid` | [AUTH] [MEMBER] | Liste des sondages |
| POST | `/festival/:fid` | [AUTH] [MEMBER] | Creer |
| GET | `/:id` | [AUTH] [MEMBER] | Details |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer |
| POST | `/:id/duplicate` | [AUTH] [MEMBER] | Dupliquer |
| GET | `/:id/fill` | | Formulaire public |
| POST | `/:id/respond` | | Soumettre une reponse |
| GET | `/:id/responses` | [AUTH] [MEMBER] | Reponses collectees |
| GET | `/:id/analytics` | [AUTH] [MEMBER] | Statistiques |

### Reglements (`/api/regulations`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/festival/:fid/public` | | Reglements publies |
| GET | `/:id/view` | | Voir un reglement |
| POST | `/:id/accept` | | Accepter un reglement |
| GET | `/festival/:fid` | [AUTH] [MEMBER] | Tous les reglements |
| POST | `/festival/:fid` | [AUTH] [MEMBER] | Creer |
| POST | `/festival/:fid/template` | [AUTH] [MEMBER] | Appliquer un template |
| GET | `/templates` | | Liste des templates |
| PUT | `/:id` | [AUTH] [MEMBER] | Modifier |
| DELETE | `/:id` | [AUTH] [MEMBER] | Supprimer |
| GET | `/:id/acceptances` | [AUTH] [MEMBER] | Acceptations |

### Messagerie (`/api/messaging`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/conversations` | [AUTH] | Mes conversations |
| POST | `/conversations` | [AUTH] | Nouvelle conversation |
| GET | `/conversations/:id/messages` | [AUTH] | Messages |
| POST | `/conversations/:id/messages` | [AUTH] | Envoyer un message |

### Workspace (`/api/workspace-docs`, `/api/workspace-sheets`, `/api/workspace-calendar`, `/api/workspace-tasks`)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Docs | CRUD + poll + version | Documents collaboratifs avec blocs, polling 3s |
| Sheets | CRUD + poll + version | Tableurs avec colonnes et lignes JSON |
| Calendar | CRUD calendriers + CRUD evenements + RSVP | Calendriers d'equipe |
| Tasks | CRUD boards + CRUD colonnes + CRUD cartes | Kanban collaboratif |

### Visitor Hub (`/api/visitor-hub`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/me` | [AUTH] | Profil visiteur (XP, coins, level) |
| GET | `/xp-history` | [AUTH] | Historique XP |
| GET | `/xp-rules` | | Regles de gain XP |
| GET | `/my-festivals` | [AUTH] | Festivals visites |
| GET | `/my-tickets` | [AUTH] | Mes billets |
| POST | `/reviews` | [AUTH] | Publier un avis |
| GET | `/my-reviews` | [AUTH] | Mes avis |
| GET | `/favorites` | [AUTH] | Mes favoris |
| POST/DELETE | `/favorites/:exhibitorId` | [AUTH] | Ajouter/retirer favori |
| POST | `/award-xp` | [AUTH] [ADMIN] | Attribuer XP |

### Volunteer Hub (`/api/volunteer-hub`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/actions` | [AUTH] | 23 types d'actions benevoles |
| GET | `/my-profile` | [AUTH] | Profil benevole |
| PUT | `/my-profile` | [AUTH] | Modifier profil |
| POST | `/apply/:festivalId` | [AUTH] | Candidater comme benevole |
| GET | `/my-applications` | [AUTH] | Mes candidatures |

### Admin plateforme (`/api/platform-admin`)

| Methode | Path | Auth | Description |
|---------|------|------|-------------|
| GET | `/stats` | [AUTH] [ADMIN] | Statistiques plateforme |
| GET | `/users` | [AUTH] [ADMIN] | Liste utilisateurs |
| GET/PUT/DELETE | `/users/:id` | [AUTH] [ADMIN] | CRUD utilisateur |
| GET | `/festivals` | [AUTH] [ADMIN] | Liste festivals |
| GET/PUT/DELETE | `/festivals/:id` | [AUTH] [ADMIN] | CRUD festival |
| GET | `/tickets` | [AUTH] [ADMIN] | Tickets support |
| GET | `/backups` | [AUTH] [ADMIN] | Liste des backups |
| POST | `/backups` | [AUTH] [ADMIN] | Declencher un backup |

### Autres modules

| Prefixe | Description |
|---------|-------------|
| `/api/notifications` | CRUD notifications (list, mark read, delete) |
| `/api/emails` | Envoi d'emails et campagnes |
| `/api/invites` | Invitations par token (create, accept, validate) |
| `/api/exports` | Export CSV des donnees |
| `/api/uploads` | Upload de fichiers |
| `/api/media` | Upload et telechargement media |
| `/api/directory` | Annuaire public de festivals (search, tags, cities) |
| `/api/exhibitor-hub` | Hub exposant (visibilite, documents, factures) |
| `/api/tickets` | Support (CRUD tickets + messages) |
| `/api/chatbot` | FAQ festival + chat IA (OpenRouter) |
| `/api/analytics` | Metriques festival (billets, CA, exposants, engagement) |
| `/api/api-management` | Cles API (CRUD + validation) |
| `/api/qr-objects` | Objets QR (checkpoints, scan) |
| `/api/custom-roles` | Roles personnalises par festival (40 permissions) |
| `/api/subscriptions` | Plans, statut, beta, paiements |
| `/api/billing` | Profil facturation, factures, admin grants |

---

## 6. Frontend

### Layouts

| Layout | Fichier | Role |
|--------|---------|------|
| `AuthLayout` | `src/layouts/AuthLayout.tsx` | Ecran centre avec logo pour login/signup/reset |
| `PlatformLayout` | `src/layouts/PlatformLayout.tsx` | Header plateforme avec nav (Accueil, Festivals, Exposants, Dashboard, Tarifs, Docs) + menu utilisateur (espaces visiteur/benevole/exposant/organisateur) |
| `FestivalPublicLayout` | `src/layouts/FestivalPublicLayout.tsx` | Navigation CMS dynamique du festival, theme personnalise (CSS variables), chatbot, liens admin |
| `FestivalAdminLayout` | `src/layouts/FestivalAdminLayout.tsx` | Sidebar collapsible avec 6 sections : Festival, Logistique, Visiteurs, Equipe, Parametres |
| `PlatformAdminLayout` | `src/layouts/PlatformAdminLayout.tsx` | Sidebar admin : Dashboard, Utilisateurs, Festivals, Support, Facturation |

### Hooks (`src/hooks/`)

| Hook | Retour | Description |
|------|--------|-------------|
| `useAuthInit()` | void | Initialise la session JWT au montage (App.tsx) |
| `useAuth()` | `{ signIn, signUp, signOut }` | Methodes d'authentification |
| `useTenantInit()` | void | Resout le festival depuis le hostname/slug |
| `useFestivalContext()` | `{ festival, isResolving, error, slug }` | Contexte festival pour layouts |
| `useFestivalRole()` | `{ role, hasRole, isAdmin, isOwner, ... }` | Verification des permissions festival |
| `useDebounce<T>(value, delay?)` | `T` | Debounce (defaut 300ms) |
| `useMobile()` | `boolean` | Detection mobile (< 768px) |

### Services (`src/services/`)

| Service | Methodes principales |
|---------|---------------------|
| `AuthService` | signUp, signIn, signOut, getProfile, updateProfile, changePassword, uploadDocument |
| `FestivalService` | getMyFestivals, createFestival, getById, getBySlug, update, getMembers, getUserRole |
| `EditionService` | getActive, getByFestival, create |
| `CmsPageService` | getByFestival, getById, getBySlug, create, update, delete |
| `CmsBlockService` | create, update, delete, reorder |
| `CmsNavigationService` | getByFestival, create, update, delete |
| `BudgetCategoryService` | getByFestival, create |
| `BudgetEntryService` | getByEdition, create, update, delete, getSummary |
| `DirectoryService` | search, getAvailableTags, getAvailableCities |
| `EquipmentItemService` | getByFestival, create, update, delete |
| `EventService` | getByEdition, create, update, delete |
| `VenueService` | getByFestival, create, update, delete |
| `ExhibitorProfileService` | getMyProfile, createOrUpdate |
| `BoothLocationService` | getByEdition, create, update, delete |
| `BoothApplicationService` | getByEdition, apply, updateStatus, assignBooth |
| `FloorPlanService` | getByEdition, getById, create, saveCanvas, delete |
| `NotificationService` | getByUser, markRead, markAllRead, delete |
| `VolunteerRoleService` | getByFestival, create |
| `ShiftService` | getByEdition, create, update, getMyShifts, assign, unassign |

### Composants partages (`src/components/shared/`)

| Composant | Props | Description |
|-----------|-------|-------------|
| `ChatbotWidget` | festivalId, festivalName | Widget chat flottant avec FAQ et creation de ticket |
| `CookieConsent` | — | Banniere RGPD (localStorage) |
| `DocumentList` | documents[], onDelete | Liste de documents avec statut, telechargement |
| `DocumentUpload` | onUploaded, maxSizeMB? | Upload drag-drop avec selecteur de type |
| `EmptyState` | icon, title, description, action? | Etat vide reutilisable |
| `ErrorBoundary` | children, fallback? | Boundary React pour les erreurs |
| `ImageUploadInput` | value, onChange | Input image avec URL + upload fichier |
| `LoadingScreen` | — | Spinner plein ecran |
| `Logo` | className? | Logo Festosh |
| `RichTextEditor` | value, onChange, placeholder?, minHeight? | Editeur WYSIWYG avec toolbar |

### Pages (74 au total)

**Plateforme (26 pages)** : HomePage, DashboardPage, DirectoryPage, ProfilePage, LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage, MessagingPage, PricingPage, SubscriptionPage, BillingPage, ExhibitorDashboardPage, ExhibitorDirectoryPage, VisitorDashboardPage, VolunteerDashboardPage, OrganizerDashboardPage, PosTerminalPage, PosProductsPage, PosAccountingPage, QrScannerPage, JoinInvitePage, AboutPage, DocsPage, PrivacyPage, NotFoundPage

**Festival public (8 pages)** : FestivalHomePage, FestivalSchedulePage, FestivalMapPage, FestivalExhibitorsPage, FestivalApplyPage, FestivalRegulationsPage, CmsPublicPage, SurveyFillPage

**Festival admin (36 pages)** : AdminOverviewPage, AdminCmsPage, AdminCmsEditorPage, AdminProgrammingPage, AdminExhibitorsPage, AdminVolunteersPage, AdminBudgetPage, AdminEquipmentPage, AdminFloorPlanEditorPage, AdminTicketingPage, AdminArtistsPage, AdminSponsorsPage, AdminGamificationPage, AdminVotesPage, AdminRafflesPage, AdminReservationsPage, AdminQueuesPage, AdminSurveysPage, AdminRegulationsPage, AdminMarketplacePage, AdminQrObjectsPage, AdminAnalyticsPage, AdminTicketsPage, AdminApiPage, AdminRolesPage, AdminSettingsPage, AdminSetupWizard, AdminAgendaPage, AdminTasksMeetingsPage, AdminMeetingEditorPage, AdminWorkspacePage, WorkspaceDocEditorPage, WorkspaceSheetPage, WorkspaceCalendarPage, WorkspaceKanbanPage

**Admin plateforme (5 pages)** : PlatformAdminDashboard, PlatformAdminUsers, PlatformAdminFestivals, PlatformAdminTickets, PlatformAdminBilling

### Blocs CMS (23 types)

hero, text, image, gallery, video, map, contact_form, faq, countdown, custom_html, image_text, cta, testimonial, pricing_table, icon_box, team_member, stats, separator, spacer, alert, tabs, logo_carousel, button

---

## 7. Modele de donnees

### Enums principaux (`src/types/enums.ts`)

| Enum | Valeurs |
|------|---------|
| `PlatformRole` | `user`, `organizer`, `admin` |
| `UserType` | `visitor`, `volunteer`, `exhibitor`, `organizer` |
| `FestivalRole` | `owner`, `admin`, `editor`, `moderator`, `volunteer`, `exhibitor` |
| `FestivalStatus` | `draft`, `published`, `archived` |
| `EditionStatus` | `planning`, `registration_open`, `registration_closed`, `upcoming`, `ongoing`, `completed`, `cancelled` |
| `ApplicationStatus` | `draft`, `submitted`, `under_review`, `approved`, `rejected`, `waitlisted`, `cancelled` |
| `DocumentType` | `kbis`, `insurance`, `id_card`, `association_registration`, `other` |
| `DocumentStatus` | `pending`, `verified`, `rejected` |
| `BlockType` | 25 types (hero, text, image, gallery, video, map, ...) |
| `BudgetEntryType` | `income`, `expense` |
| `ShiftStatus` | `open`, `assigned`, `completed`, `cancelled` |
| `FloorPlanElementType` | 14 types (booth, stage, entrance, exit, toilet, parking, ...) |

### Relations principales

```
profiles ──< festival_members >── festivals
festivals ──< editions
editions ──< events, shifts, booth_types, booth_locations, booth_applications
festivals ──< cms_pages ──< cms_blocks
festivals ──< budget_categories, equipment_items, venues, volunteer_roles
festivals ──< regulations, custom_roles, sponsors
profiles ──< exhibitor_profiles ──< booth_applications
profiles ──< volunteer_profiles ──< volunteer_applications
profiles ──< subscriptions ──< payments
profiles ──< documents, notifications, conversations
```

---

## 8. Securite

### Authentification JWT

- **Algorithme** : HS256
- **Expiration** : 24 heures
- **Claims** : userId, role, iss (festosh), aud (festosh-app), jti (unique)
- **Stockage** : localStorage cote client (`festosh-token`)
- **Revocation** : table `token_blacklist` avec JTI, verifiee a chaque requete
- **Hachage mot de passe** : bcrypt, 12 rounds

### Chiffrement

- **Algorithme** : AES-256-GCM
- **Derivation de cle** : PBKDF2 avec 200 000 iterations (SHA-512)
- **Sel** : derive dynamiquement de `ENCRYPTION_KEY` via HMAC (pas de sel hardcode)
- **IV** : 16 octets aleatoires par operation
- **Format stocke** : `iv:authTag:ciphertext` (base64)
- **HMAC** : SHA-256 pour les index de recherche sur champs chiffres

### Rate limiting

- Sliding window par IP + path
- Map memoire bornee a 50 000 entrees
- Cleanup automatique toutes les 5 minutes
- Eviction FIFO quand la map est pleine
- Header `Retry-After` sur les 429

### Protections reseau

- **CORS** : origines explicites (regex), pas de wildcard
- **CSRF** : exige `Content-Type: application/json` ou `X-Requested-With` sur les mutations
- **Headers** : HSTS (1 an), CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- **Cache** : `no-store, no-cache` sur les reponses authentifiees

### Validation fichiers

- Magic bytes verifies pour JPEG, PNG, WebP, PDF
- Nom de fichier sanitize (path traversal, caracteres speciaux)
- Taille limite configurable par endpoint

### XSS

- `DOMPurify.sanitize()` sur tout le contenu HTML CMS (TextBlock, CustomHtmlBlock, ImageTextBlock, TabsBlock)
- Insertion d'images RichTextEditor via API DOM (pas de concatenation HTML)
- Iframes CMS sandbox (`allow-same-origin allow-scripts`) + `referrerPolicy="no-referrer"`

---

## 9. Configuration & Deploiement

### Variables d'environnement (`.env.example`)

| Variable | Defaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `/api` | URL de l'API (frontend) |
| `VITE_APP_DOMAIN` | `festosh.net` | Domaine pour la resolution multi-tenant |
| `NODE_ENV` | `development` | Environnement |
| `JWT_SECRET` | — | Cle JWT (32+ caracteres, obligatoire en prod) |
| `ENCRYPTION_KEY` | — | Cle de chiffrement (32+ caracteres, obligatoire en prod) |
| `ENCRYPTION_SALT` | — | Sel optionnel (derive de ENCRYPTION_KEY si absent) |
| `PORT` | `3001` | Port du serveur API |
| `DATABASE_PATH` | `./data/festosh.db` | Chemin de la base SQLite |
| `FRONTEND_URL` | `http://localhost:3002` | URL frontend (pour les liens email) |
| `CORS_ORIGINS` | — | Origines CORS (virgule separee) |
| `BACKUP_DIR` | `./data/backups` | Repertoire des backups |
| `BACKUP_REDUNDANCY_DIR` | `./data/backups-redundant` | Repertoire de redondance |
| `MAX_BACKUPS` | `14` | Nombre de backups a conserver |
| `BACKUP_INTERVAL_HOURS` | `24` | Intervalle entre les backups |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | — | Config SMTP |
| `OPENROUTER_API_KEY` | — | Cle API pour le chatbot IA |

### Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Frontend Vite (port 3002) |
| `npm run dev:server` | API Hono via tsx watch (port 3001) |
| `npm run dev:all` | Les deux en parallele (concurrently) |
| `npm run build` | `tsc -b && vite build` (type-check + bundle) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generer les migrations Drizzle |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:seed` | Peupler la base avec des donnees de demo |
| `npm run db:studio` | Interface graphique Drizzle Studio |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest mode watch |
| `npm run test:coverage` | Coverage v8 |

### Build production

```bash
npm run build      # Type-check + Vite bundle avec source maps
```

Output dans `dist/`. Le frontend est un SPA statique. L'API tourne via `node --import tsx server/index.ts`.

### Infrastructure locale (PM2)

Fichiers non trackes par git mais utilises en production locale :
- `ecosystem.config.cjs` — Config PM2 avec 2 processus (API + frontend preview)
- `pm2-api.mjs` — Loader ESM pour tsx

---

## 10. Tests

### Configuration (`vitest.config.ts`)

- **Runner** : Vitest 4.1
- **Environnement** : Node.js
- **Globals** : actives (pas besoin d'import `describe`, `it`, `expect`)
- **Pattern** : `tests/**/*.test.ts`
- **Coverage** : v8, exclut migrations et seed
- **Alias** : `@/` → `src/`

### Commandes

```bash
npm test              # Execution unique
npm run test:watch    # Mode watch
npm run test:coverage # Avec couverture
```

### Fichiers de test

| Fichier | Description |
|---------|-------------|
| `tests/api.test.ts` | Tests d'integration API (health check, endpoints) |
| `tests/auth.test.ts` | Tests d'authentification (login, register, token) |
| `tests/utils.test.ts` | Tests unitaires des utilitaires |
