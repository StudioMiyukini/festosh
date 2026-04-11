import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  UserPlus,
  Loader2,
  Tent,
  Search,
  Map,
  // Exposant icons
  Store,
  ShoppingCart,
  BarChart3,
  FileCheck,
  Receipt,
  Package,
  // Organisateur icons
  CalendarDays,
  Ticket,
  Users,
  Trophy,
  Megaphone,
  Settings,
  // Visiteur
  Sparkles,
  Heart,
  Star,
  QrCode,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface UpcomingFestival {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  banner_url: string | null;
}

export function HomePage() {
  const { isAuthenticated, profile } = useAuthStore();
  const [festivals, setFestivals] = useState<UpcomingFestival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UpcomingFestival[]>('/directory?status=published&limit=6&sort=created_at').then((res) => {
      if (res.success && res.data) setFestivals(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Visiteur first
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
              Festivals &middot; Conventions &middot; Salons
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Trouvez votre prochain{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                evenement
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Explorez les festivals et conventions pres de chez vous.
              Achetez vos billets, reservez des activites et suivez vos exposants preferes.
            </p>

            {/* Search-like CTA */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/directory"
                className="inline-flex w-full items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:w-auto sm:min-w-[320px]"
              >
                <Search className="h-5 w-5 text-primary" />
                <span>Rechercher un festival, une ville...</span>
              </Link>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
              >
                Explorer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <Link to="/directory" className="flex items-center gap-1 hover:text-foreground">
                <Tent className="h-3.5 w-3.5" /> Annuaire festivals
              </Link>
              <Link to="/exhibitors" className="flex items-center gap-1 hover:text-foreground">
                <Store className="h-3.5 w-3.5" /> Annuaire exposants
              </Link>
              <Link to="/directory" className="flex items-center gap-1 hover:text-foreground">
                <Map className="h-3.5 w-3.5" /> Carte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PROCHAINS EVENEMENTS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Prochains evenements
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Les festivals a venir sur la plateforme.
              </p>
            </div>
            <Link
              to="/directory"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : festivals.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {festivals.map((f) => (
                <Link
                  key={f.id}
                  to={`/f/${f.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5">
                    {f.banner_url ? (
                      <img src={f.banner_url} alt={f.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Tent className="h-12 w-12 text-primary/30" />
                      </div>
                    )}
                    {f.logo_url && (
                      <div className="absolute -bottom-5 left-4 h-10 w-10 overflow-hidden rounded-lg border-2 border-card bg-card shadow">
                        <img src={f.logo_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 pt-3">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary">{f.name}</h3>
                    {f.city && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[f.city, f.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {f.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Tent className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucun evenement publie pour le moment.</p>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link to="/directory" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Voir tous les festivals <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          POUR LES VISITEURS — Gamification teaser
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-gradient-to-b from-purple-50/50 to-background py-16 dark:from-purple-950/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              <Sparkles className="h-3 w-3" /> Pour les visiteurs
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Vivez vos festivals autrement
            </h2>
            <p className="mt-3 text-muted-foreground">
              Gagnez des points, collectez des badges et retrouvez vos exposants preferes d'un festival a l'autre.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Heart, title: 'Suivez vos favoris', desc: 'Ajoutez des exposants en favoris et voyez ou ils seront aux prochains events.' },
              { icon: Sparkles, title: 'Gagnez des XP', desc: 'Chaque visite, achat, vote ou scan vous rapporte des points d\'experience et des pieces.' },
              { icon: QrCode, title: 'Scannez & collectez', desc: 'Tampons, trophees, tickets boisson — scannez les QR codes pour debloquer des recompenses.' },
              { icon: Star, title: 'Donnez votre avis', desc: 'Notez les festivals que vous visitez et aidez la communaute a decouvrir les meilleurs events.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 inline-flex rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
                  <item.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-1 font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to={isAuthenticated ? '/visitor' : '/signup'}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-700"
            >
              {isAuthenticated ? 'Mon espace visiteur' : 'Creer mon compte visiteur'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          POUR LES EXPOSANTS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Store className="h-3 w-3" /> Pour les exposants
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Un seul profil pour toutes vos conventions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Creez votre profil exposant une fois et candidatez a tous les festivals du reseau.
                Gerez vos ventes, votre stock et votre comptabilite depuis un seul endroit.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: FileCheck, text: 'Documents centralises avec rappels de renouvellement (assurance, KBIS...)' },
                  { icon: ShoppingCart, text: 'Caisse enregistreuse (POS) integree pour vendre sur votre stand' },
                  { icon: Package, text: 'Gestion de stock en temps reel avec alertes de rupture' },
                  { icon: BarChart3, text: 'Comptabilite automatique : CA, charges, objectif neutre, marge' },
                  { icon: Receipt, text: 'Factures centralisees et historique des candidatures cross-festivals' },
                  { icon: MessageSquare, text: 'Messagerie directe avec les organisateurs et autres exposants' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 dark:bg-amber-900/30">
                      <item.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={isAuthenticated ? '/exhibitor' : '/signup'}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/25 transition-all hover:bg-amber-700"
                >
                  {isAuthenticated ? 'Mon espace exposant' : 'Devenir exposant'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/exhibitors"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Voir l'annuaire
                </Link>
              </div>
            </div>

            {/* Right — feature cards grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShoppingCart, title: 'POS', desc: 'Caisse tactile', color: 'bg-amber-500' },
                { icon: Package, title: 'Stock', desc: 'Temps reel', color: 'bg-orange-500' },
                { icon: BarChart3, title: 'Compta', desc: 'Break-even', color: 'bg-yellow-500' },
                { icon: FileCheck, title: 'Documents', desc: 'Avec rappels', color: 'bg-amber-600' },
                { icon: Store, title: 'Profil pro', desc: 'Multi-festivals', color: 'bg-orange-600' },
                { icon: Receipt, title: 'Factures', desc: 'Centralisees', color: 'bg-yellow-600' },
              ].map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-shadow hover:shadow-md"
                >
                  <div className={`mb-2 rounded-lg ${card.color} p-2.5`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-[10px] text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          POUR LES ORGANISATEURS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-border bg-gradient-to-b from-blue-50/50 to-background py-16 dark:from-blue-950/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — feature cards */}
            <div className="order-2 grid grid-cols-2 gap-3 lg:order-1">
              {[
                { icon: CalendarDays, title: 'Programme', desc: 'Agenda complet', color: 'bg-blue-500' },
                { icon: Ticket, title: 'Billetterie', desc: 'QR codes', color: 'bg-indigo-500' },
                { icon: Users, title: 'Equipe', desc: 'Benevoles & roles', color: 'bg-blue-600' },
                { icon: Trophy, title: 'Gamification', desc: 'Tampons & badges', color: 'bg-indigo-600' },
                { icon: Megaphone, title: 'Sponsors', desc: 'Paliers & suivi', color: 'bg-blue-700' },
                { icon: Settings, title: 'CMS', desc: 'Pages & themes', color: 'bg-indigo-700' },
              ].map((card) => (
                <div
                  key={card.title}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center transition-shadow hover:shadow-md"
                >
                  <div className={`mb-2 rounded-lg ${card.color} p-2.5`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-[10px] text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Right — text */}
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <CalendarDays className="h-3 w-3" /> Pour les organisateurs
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Tout pour organiser votre festival
              </h2>
              <p className="mt-3 text-muted-foreground">
                De la creation du site a la gestion le jour J, Festosh vous accompagne
                a chaque etape avec des outils professionnels et intuitifs.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Settings, text: 'Site web personnalisable avec CMS, themes et pages sur mesure' },
                  { icon: Ticket, text: 'Billetterie integree avec QR codes, scan d\'entree et jauge temps reel' },
                  { icon: Store, text: 'Gestion des exposants : candidatures, stands, plans de salle' },
                  { icon: Users, text: 'Equipe : benevoles, shifts, artistes, riders techniques' },
                  { icon: Trophy, text: 'Gamification : tampons, badges, chasses au tresor, tombola, votes' },
                  { icon: BarChart3, text: 'Analytics en temps reel : affluence, revenus, engagement, NPS' },
                  { icon: Megaphone, text: 'Sponsors : paliers, contrats, suivi des paiements' },
                  { icon: QrCode, text: 'QR codes universels : tickets, trophees, buvette, creation en lot' },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/30">
                      <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/signup'}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700"
                >
                  {isAuthenticated ? 'Creer un festival' : 'Commencer gratuitement'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════════════════════════ */}
      {!isAuthenticated && (
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Pret a rejoindre le reseau ?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Creez votre compte gratuitement — que vous soyez visiteur, exposant ou organisateur.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl"
              >
                <UserPlus className="h-5 w-5" />
                Creer mon compte
              </Link>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-4 text-base font-medium text-foreground hover:bg-accent"
              >
                Explorer sans compte
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Gratuit</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Sans engagement</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Donnees securisees</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
