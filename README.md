# Festosh

**Plateforme SaaS open-source de gestion de festivals et conventions.**

Festosh permet aux organisateurs de creer et gerer leur festival en ligne : site public personnalisable, gestion des exposants, billetterie, programmation, benevoles, budget, et bien plus — le tout depuis une seule interface.

---

## Fonctionnalites

### Pour les organisateurs

- **CMS integre** — Editeur de pages par blocs (hero, texte, images, galerie, programme, carte, sponsors...)
- **Gestion des exposants** — Candidatures, types de stands, placement sur plan, documents requis
- **Programmation** — Evenements, lieux, planning avec creneaux horaires
- **Benevoles** — Profils, competences, candidatures, planning des equipes
- **Budget** — Suivi revenus/depenses avec justificatifs et export
- **Materiel** — Inventaire, prets, suivi de l'etat
- **Billetterie** — Types de billets, ventes, scan QR a l'entree
- **Marketplace** — Vente de produits en ligne par les exposants
- **Sponsors** — Gestion des partenariats et visibilite
- **Workspace collaboratif** — Documents, tableurs, calendrier, kanban
- **Questionnaires** — Constructeur de sondages avec collecte de reponses
- **Reglements** — Templates (visiteur, exposant, cosplay...) avec acceptation signee
- **Roles personnalises** — 40 permissions granulaires par festival
- **Analytics** — Tableau de bord avec metriques en temps reel
- **API & Webhooks** — Cles d'API et integration externe

### Pour les visiteurs

- **Gamification** — XP, coins, niveaux, tampons a collectionner
- **Votes & Tombola** — Votes publics et tirages au sort
- **Files d'attente** — Inscription et suivi en temps reel
- **Reservations** — Reserve de creneaux ou places
- **Historique** — Suivi des festivals visites, favoris, avis

### Pour les exposants

- **Espace dedie** — Profil, documents, candidatures en cours
- **Point de vente (POS)** — Terminal de caisse avec produits, stock, comptabilite
- **Annuaire public** — Visibilite dans le repertoire des exposants

### Plateforme

- **Multi-tenant** — Chaque festival a son sous-site (`{slug}.festosh.net`)
- **Messagerie** — Conversations entre utilisateurs
- **Abonnements** — Plans tarifaires pour les organisateurs
- **Administration** — Panel admin pour gerer utilisateurs, festivals, facturation

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite 8, TailwindCSS, shadcn/ui |
| Backend | Hono (Node.js) |
| Base de donnees | SQLite (better-sqlite3) + Drizzle ORM |
| Authentification | JWT + bcrypt, rate limiting, token blacklist |
| Etat client | Zustand v5 |
| Etat serveur | TanStack Query v5 |
| Formulaires | react-hook-form + zod |
| Routing | React Router v7 |
| Icones | lucide-react |

---

## Demarrage rapide

```bash
# Cloner le projet
git clone https://github.com/StudioMiyukini/festosh.git
cd festosh

# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env
# Editer .env pour definir JWT_SECRET et ENCRYPTION_KEY

# Lancer les migrations
npm run db:migrate

# (Optionnel) Donnees de demo
npm run db:seed

# Lancer l'application (API + frontend)
npm run dev:all
```

- **Frontend** : http://localhost:3002
- **API** : http://localhost:3001
- **Drizzle Studio** : `npm run db:studio`

---

## Commandes

| Commande | Description |
|----------|------------|
| `npm run dev` | Frontend (port 3000) |
| `npm run dev:server` | API backend (port 3001) |
| `npm run dev:all` | Frontend + backend simultanes |
| `npm run build` | Build de production |
| `npm run lint` | Linting ESLint |
| `npm run db:generate` | Generer les migrations Drizzle |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:seed` | Peupler avec des donnees de demo |
| `npm run db:studio` | Interface graphique base de donnees |

---

## Architecture

```
festosh/
  src/
    components/    Composants partages (UI, widgets)
    config/        Configuration, variables d'env
    features/      Modules fonctionnels autonomes
    hooks/         Hooks React (auth, tenant, roles)
    layouts/       Shells de mise en page (4 layouts)
    lib/           Utilitaires (API client, formatage)
    pages/         Pages par route
      platform/       Pages plateforme
      festival/       Pages publiques festival
      festival-admin/ Administration festival
      admin/          Administration plateforme
    services/      Couche d'acces aux donnees
    stores/        Stores Zustand (auth, tenant, UI)
    types/         Interfaces TypeScript

  server/
    db/            Schema Drizzle, migrations, seed
    lib/           Utilitaires serveur (email, crypto, audit)
    middleware/    Auth JWT, roles festival
    routes/        ~40 modules de routes API
```

### Multi-tenancy

Chaque festival est accessible via son propre sous-domaine :

```
festosh.net              -> Plateforme principale
{slug}.festosh.net       -> Site public du festival
{slug}.festosh.net/admin -> Administration du festival
```

En developpement, les festivals sont accessibles via `/f/:slug`.

### Roles

**Roles plateforme** : `user` | `organizer` | `admin`

**Roles par festival** : `owner` | `admin` | `editor` | `moderator` | `volunteer` | `exhibitor`

Les roles festival supportent 40 permissions granulaires configurables.

---

## Securite

- Authentification JWT avec blacklist de tokens revoques
- Chiffrement AES-256-GCM pour les donnees sensibles
- Rate limiting sur les endpoints critiques
- CORS restreint par origines explicites
- Protection CSRF via headers
- Headers de securite (HSTS, CSP, X-Frame-Options)
- Validation magic bytes sur les uploads de fichiers
- Audit log avec IP et user-agent

---

## Licence

Proprietary - Studio Miyukini
