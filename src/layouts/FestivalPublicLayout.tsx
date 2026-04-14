import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Shield, ArrowLeft, ChevronDown } from 'lucide-react';
import { useFestivalContext } from '@/hooks/use-festival-context';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { useFestivalRole } from '@/hooks/use-festival-role';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { ChatbotWidget } from '@/components/shared/ChatbotWidget';
import { api } from '@/lib/api-client';
import type { CmsNavItem } from '@/types/cms';

// Map internal route targets to full paths
function resolveNavLink(slug: string, item: CmsNavItem): string {
  if (item.link_type === 'external') return item.target;
  if (item.link_type === 'internal') {
    if (item.target === '/') return `/f/${slug}`;
    return `/f/${slug}${item.target}`;
  }
  // link_type === 'page' → CMS page by ID, use slug-based route
  return `/f/${slug}/p/${item.target}`;
}

// Default fallback nav when no CMS navigation exists
const DEFAULT_NAV = [
  { to: '', label: 'Accueil', exact: true },
  { to: '/schedule', label: 'Programme' },
  { to: '/map', label: 'Plan' },
  { to: '/exhibitors', label: 'Exposants' },
  { to: '/apply', label: 'Candidature' },
  { to: '/regulations', label: 'Reglements' },
];

export function FestivalPublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { festival, isResolving, error, slug } = useFestivalContext();
  const { isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();
  const { isAdmin, isEditor } = useFestivalRole();
  const location = useLocation();
  const navigate = useNavigate();

  const [navItems, setNavItems] = useState<CmsNavItem[]>([]);
  const [navLoaded, setNavLoaded] = useState(false);

  // Fetch CMS navigation
  useEffect(() => {
    if (!festival?.id) return;
    api.get<CmsNavItem[]>(`/cms/festival/${festival.id}/navigation`).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setNavItems(res.data);
      }
      setNavLoaded(true);
    });
  }, [festival?.id]);

  // Apply festival theme colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (festival?.theme_colors) {
      const { primary, secondary, accent, background, text } = festival.theme_colors;
      if (primary) root.style.setProperty('--festival-primary', primary);
      if (secondary) root.style.setProperty('--festival-secondary', secondary);
      if (accent) root.style.setProperty('--festival-accent', accent);
      if (background) root.style.setProperty('--festival-bg', background);
      if (text) root.style.setProperty('--festival-text', text);
    }
    return () => {
      root.style.removeProperty('--festival-primary');
      root.style.removeProperty('--festival-secondary');
      root.style.removeProperty('--festival-accent');
      root.style.removeProperty('--festival-bg');
      root.style.removeProperty('--festival-text');
    };
  }, [festival?.theme_colors]);

  if (isResolving) return <LoadingScreen />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Festival introuvable</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link to="/" className="inline-block text-primary hover:underline">
            Retour a Festosh
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Use CMS nav if available, otherwise fallback
  const useCmsNav = navLoaded && navItems.length > 0;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        backgroundColor: 'var(--festival-bg, hsl(var(--background)))',
        color: 'var(--festival-text, hsl(var(--foreground)))',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Festival Name / Logo */}
          <Link to={`/f/${slug}`} className="flex items-center gap-3">
            {festival?.logo_url ? (
              <img src={festival.logo_url} alt={festival.name} className="h-8 w-8 rounded-md object-cover" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--festival-primary, hsl(var(--primary)))' }}
              >
                {festival?.name?.charAt(0) ?? 'F'}
              </div>
            )}
            <span className="text-lg font-bold tracking-tight">{festival?.name ?? 'Festival'}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {useCmsNav ? (
              // CMS-driven navigation
              navItems.filter((i) => i.is_visible !== false).map((item) => {
                const href = resolveNavLink(slug!, item);
                const hasChildren = item.children && item.children.length > 0;
                const isDropdownOpen = openDropdown === item.id;

                if (hasChildren) {
                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive(href) ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                        onClick={() => setOpenDropdown(isDropdownOpen ? null : item.id)}
                        onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                      >
                        {item.label}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-card py-1 shadow-lg">
                          <Link
                            to={href}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {item.label}
                          </Link>
                          {item.children!.filter((ch) => ch.is_visible !== false).map((child) => (
                            <Link
                              key={child.id}
                              to={resolveNavLink(slug!, child)}
                              className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                              onClick={() => setOpenDropdown(null)}
                              {...(child.open_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    to={href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(href, item.link_type === 'internal' && item.target === '/')
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    style={
                      isActive(href, item.link_type === 'internal' && item.target === '/')
                        ? { color: 'var(--festival-primary, hsl(var(--primary)))' }
                        : undefined
                    }
                    {...(item.open_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {item.label}
                  </Link>
                );
              })
            ) : (
              // Default fallback nav
              DEFAULT_NAV.map((link) => {
                const to = `/f/${slug}${link.to}`;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(to, link.exact)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                    style={isActive(to, link.exact) ? { color: 'var(--festival-primary, hsl(var(--primary)))' } : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })
            )}
          </nav>

          {/* Desktop Auth + Admin */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/directory"
              reloadDocument
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Annuaire
            </Link>
            {(isAdmin || isEditor) && (
              <Link
                to={`/f/${slug}/admin`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Deconnexion
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-3.5 w-3.5" />
                Connexion
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border md:hidden">
            <nav className="flex flex-col gap-1 px-4 py-3">
              {useCmsNav ? (
                navItems.filter((i) => i.is_visible !== false).map((item) => (
                  <div key={item.id}>
                    <Link
                      to={resolveNavLink(slug!, item)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors block ${
                        isActive(resolveNavLink(slug!, item))
                          ? 'text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.children?.filter((ch) => ch.is_visible !== false).map((child) => (
                      <Link
                        key={child.id}
                        to={resolveNavLink(slug!, child)}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ))
              ) : (
                DEFAULT_NAV.map((link) => {
                  const to = `/f/${slug}${link.to}`;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(to, link.exact) ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })
              )}
              <div className="mt-2 border-t border-border pt-2">
                <Link
                  to="/directory"
                  reloadDocument
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Annuaire des festivals
                </Link>
                {(isAdmin || isEditor) && (
                  <Link
                    to={`/f/${slug}/admin`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    <Shield className="h-4 w-4" />
                    Administration
                  </Link>
                )}
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Se deconnecter
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{festival?.name ?? 'Festival'}</p>
              {festival?.location_name && (
                <p className="text-xs text-muted-foreground">{festival.location_name}</p>
              )}
            </div>
            {festival?.social_links && (
              <div className="flex items-center gap-3">
                {festival.social_links.website && (
                  <a href={festival.social_links.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">Site web</a>
                )}
                {festival.social_links.instagram && (
                  <a href={festival.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">Instagram</a>
                )}
                {festival.social_links.facebook && (
                  <a href={festival.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">Facebook</a>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Propulse par</span>
            <Link to="/" className="font-medium text-primary hover:underline">Festosh</Link>
          </div>
        </div>
      </footer>

      {/* Chatbot Widget */}
      {festival && (
        <ChatbotWidget festivalId={festival.id} festivalName={festival.name} />
      )}
    </div>
  );
}
