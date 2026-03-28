import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';

const getFestivalNavLinks = (slug: string) => [
  { to: `/f/${slug}`, label: 'Accueil' },
  { to: `/f/${slug}/schedule`, label: 'Programme' },
  { to: `/f/${slug}/map`, label: 'Plan' },
  { to: `/f/${slug}/exhibitors`, label: 'Exposants' },
  { to: `/f/${slug}/apply`, label: 'Candidature' },
];

export function FestivalPublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { festival } = useTenantStore();
  const location = useLocation();

  const slug = festival?.slug ?? '';
  const navLinks = getFestivalNavLinks(slug);

  // Apply festival theme colors as CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (festival?.theme_colors) {
      const { primary, secondary, accent, background, text } = festival.theme_colors;
      root.style.setProperty('--festival-primary', primary);
      root.style.setProperty('--festival-secondary', secondary);
      root.style.setProperty('--festival-accent', accent);
      root.style.setProperty('--festival-bg', background);
      root.style.setProperty('--festival-text', text);
    }

    return () => {
      root.style.removeProperty('--festival-primary');
      root.style.removeProperty('--festival-secondary');
      root.style.removeProperty('--festival-accent');
      root.style.removeProperty('--festival-bg');
      root.style.removeProperty('--festival-text');
    };
  }, [festival?.theme_colors]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

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
              <img
                src={festival.logo_url}
                alt={festival.name}
                className="h-8 w-8 rounded-md object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--festival-primary, hsl(var(--primary)))' }}
              >
                {festival?.name?.charAt(0) ?? 'F'}
              </div>
            )}
            <span className="text-lg font-bold tracking-tight">
              {festival?.name ?? 'Festival'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                style={
                  isActive(link.to)
                    ? { color: 'var(--festival-primary, hsl(var(--primary)))' }
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

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
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
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
              <p className="text-sm font-semibold text-foreground">
                {festival?.name ?? 'Festival'}
              </p>
              {festival?.location_name && (
                <p className="text-xs text-muted-foreground">{festival.location_name}</p>
              )}
            </div>
            {festival?.social_links && (
              <div className="flex items-center gap-3">
                {festival.social_links.website && (
                  <a
                    href={festival.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Site web
                  </a>
                )}
                {festival.social_links.instagram && (
                  <a
                    href={festival.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Instagram
                  </a>
                )}
                {festival.social_links.facebook && (
                  <a
                    href={festival.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Facebook
                  </a>
                )}
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Propulse par Festosh
          </p>
        </div>
      </footer>
    </div>
  );
}
