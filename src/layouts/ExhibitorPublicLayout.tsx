/**
 * Public layout used by exhibitor vitrine, boutique, product detail and checkout pages.
 *
 * - Top header is exhibitor-branded (logo + name + nav).
 * - Cart icon shows item count badge and routes to /e/:slug/checkout when clicked.
 * - Footer links back to platform.
 */

import { useEffect, useState } from 'react';
import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { ShoppingBag, Globe, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { api } from '@/lib/api-client';
import { useShopCartStore, getCartTotals, EMPTY_CART } from '@/stores/shop-cart-store';

interface PublicExhibitor {
  id: string;
  slug: string;
  company_name: string | null;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
  photo_url: string | null;
  website: string | null;
  city: string | null;
  domains: string[];
  boutique_enabled: number;
  boutique_currency: string | null;
  boutique_intro: string | null;
  vitrine_page_id: string | null;
  social_links: Record<string, string>;
}

interface ExhibitorPublicContext {
  exhibitor: PublicExhibitor;
}

export function ExhibitorPublicLayout() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const [exhibitor, setExhibitor] = useState<PublicExhibitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const cart = useShopCartStore((s) => (slug && s.carts[slug]) || EMPTY_CART);
  const { item_count } = getCartTotals(cart);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api.get<PublicExhibitor>(`/public/exhibitors/by-slug/${slug}`).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setExhibitor(res.data as PublicExhibitor);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  // Only show the 404 / loading screen for terminal states. While the exhibitor
  // is loading we still render the shell + Outlet so child pages can start
  // their own fetches in parallel (the boutique page hits a separate endpoint
  // and would otherwise wait for the layout fetch to resolve before mounting).
  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Exposant introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet exposant n'existe pas ou son profil n'est pas public.
        </p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" /> Retour a l'accueil
        </Link>
      </div>
    );
  }

  if (loading && !exhibitor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!exhibitor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Exposant introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cet exposant n'existe pas ou son profil n'est pas public.
        </p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" /> Retour a l'accueil
        </Link>
      </div>
    );
  }

  const displayName = exhibitor.trade_name || exhibitor.company_name || 'Exposant';
  const onVitrine = location.pathname === `/e/${slug}` || location.pathname === `/e/${slug}/`;
  const onBoutique = location.pathname.startsWith(`/e/${slug}/boutique`) || location.pathname.startsWith(`/e/${slug}/p/`);
  const onCheckout = location.pathname.startsWith(`/e/${slug}/checkout`);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Exhibitor identity */}
          <Link to={`/e/${slug}`} className="flex min-w-0 items-center gap-3">
            {exhibitor.logo_url ? (
              <img src={exhibitor.logo_url} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover ring-1 ring-border" />
            ) : (
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {exhibitor.city && <p className="truncate text-[11px] text-muted-foreground">{exhibitor.city}</p>}
            </div>
          </Link>

          {/* Center nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to={`/e/${slug}`}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                onVitrine ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              Vitrine
            </Link>
            {exhibitor.boutique_enabled === 1 && (
              <Link
                to={`/e/${slug}/boutique`}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  onBoutique || onCheckout ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                Boutique
              </Link>
            )}
            {exhibitor.website && (
              <a
                href={exhibitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" /> Site officiel
              </a>
            )}
          </nav>

          {/* Cart */}
          <div className="flex items-center gap-2">
            {exhibitor.boutique_enabled === 1 && (
              <Link
                to={`/e/${slug}/checkout`}
                className="relative inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                aria-label="Panier"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Panier</span>
                {item_count > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                    {item_count}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ exhibitor } satisfies ExhibitorPublicContext} />
      </main>

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{displayName}</p>
              {exhibitor.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{exhibitor.description}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decouvrir</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li><Link to={`/e/${slug}`} className="text-foreground hover:text-primary">Vitrine</Link></li>
                {exhibitor.boutique_enabled === 1 && <li><Link to={`/e/${slug}/boutique`} className="text-foreground hover:text-primary">Boutique en ligne</Link></li>}
                <li><Link to="/exhibitors" className="text-foreground hover:text-primary">Tous les exposants</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Propulse par</p>
              <Link to="/" className="mt-2 inline-flex items-center gap-2 text-sm text-foreground hover:text-primary">
                <Logo /> <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
