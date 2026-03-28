import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Store,
  Users,
  DollarSign,
  Package,
  Settings,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { useFestivalRole } from '@/hooks/use-festival-role';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const getAdminNavItems = (slug: string): NavItem[] => [
  { to: `/f/${slug}/admin`, label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: `/f/${slug}/admin/cms`, label: 'Contenu CMS', icon: FileText },
  { to: `/f/${slug}/admin/programming`, label: 'Programmation', icon: Calendar },
  { to: `/f/${slug}/admin/exhibitors`, label: 'Exposants', icon: Store },
  { to: `/f/${slug}/admin/volunteers`, label: 'Benevoles', icon: Users },
  { to: `/f/${slug}/admin/budget`, label: 'Budget', icon: DollarSign },
  { to: `/f/${slug}/admin/equipment`, label: 'Materiel', icon: Package },
  { to: `/f/${slug}/admin/settings`, label: 'Parametres', icon: Settings },
];

export function FestivalAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { festival } = useTenantStore();
  const { isAdmin, isEditor } = useFestivalRole();
  const navigate = useNavigate();
  const location = useLocation();

  const slug = festival?.slug ?? '';
  const navItems = getAdminNavItems(slug);

  // Redirect if user lacks admin/editor role
  useEffect(() => {
    if (!isAdmin && !isEditor) {
      navigate('/', { replace: true });
    }
  }, [isAdmin, isEditor, navigate]);

  if (!isAdmin && !isEditor) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === `/f/${slug}/admin`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-background lg:block">
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="border-b border-border px-4 py-4">
            <p className="text-sm font-semibold text-foreground truncate">
              {festival?.name ?? 'Administration'}
            </p>
            <Link
              to={`/f/${slug}`}
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Retour au site public
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.to)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <p className="text-sm font-semibold text-foreground truncate">
                  {festival?.name ?? 'Administration'}
                </p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Fermer le menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-4 py-2">
                <Link
                  to={`/f/${slug}`}
                  onClick={() => setSidebarOpen(false)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Retour au site public
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-2">
                <ul className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive(item.to)
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-foreground lg:text-base">
            Administration &mdash; {festival?.name ?? 'Festival'}
          </h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
