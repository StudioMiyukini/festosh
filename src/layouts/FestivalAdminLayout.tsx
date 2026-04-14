import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Store,
  Users,
  DollarSign,
  Package,
  ClipboardList,
  MapPin,
  Settings,
  Palette,
  Mail,
  Menu,
  X,
  ArrowLeft,
  LogOut,
  User,
  Ticket,
  ShoppingCart,
  Handshake,
  BookOpen,
  Trophy,
  Star,
  Gift,
  Mic,
  ListOrdered,
  BarChart3,
  Key,
  QrCode,
  ShieldCheck,
  Briefcase,
  ClipboardCheck,
  Scale,
  ChevronDown,
} from 'lucide-react';
import { useFestivalContext } from '@/hooks/use-festival-context';
import { useFestivalRole } from '@/hooks/use-festival-role';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  title?: string;
  items: NavItem[];
  collapsible?: boolean;
}

const getAdminNav = (slug: string): NavSection[] => [
  {
    items: [
      { to: `/f/${slug}/admin`, label: "Vue d'ensemble", icon: LayoutDashboard },
    ],
  },
  {
    title: 'Festival',
    collapsible: true,
    items: [
      { to: `/f/${slug}/admin/cms`, label: 'Site & Pages', icon: FileText },
      { to: `/f/${slug}/admin/programming`, label: 'Programme', icon: Calendar },
      { to: `/f/${slug}/admin/exhibitors`, label: 'Exposants', icon: Store },
      { to: `/f/${slug}/admin/ticketing`, label: 'Billetterie', icon: Ticket },
      { to: `/f/${slug}/admin/artists`, label: 'Artistes', icon: Mic },
    ],
  },
  {
    title: 'Logistique',
    collapsible: true,
    items: [
      { to: `/f/${slug}/admin/budget`, label: 'Budget', icon: DollarSign },
      { to: `/f/${slug}/admin/equipment`, label: 'Materiel', icon: Package },
      { to: `/f/${slug}/admin/floor-plan`, label: 'Plan de salle', icon: MapPin },
      { to: `/f/${slug}/admin/sponsors`, label: 'Sponsors', icon: Handshake },
    ],
  },
  {
    title: 'Visiteurs',
    collapsible: true,
    items: [
      { to: `/f/${slug}/admin/gamification`, label: 'Gamification', icon: Trophy },
      { to: `/f/${slug}/admin/votes`, label: 'Votes & Prix', icon: Star },
      { to: `/f/${slug}/admin/raffles`, label: 'Tombola', icon: Gift },
      { to: `/f/${slug}/admin/reservations`, label: 'Reservations', icon: BookOpen },
      { to: `/f/${slug}/admin/queues`, label: 'Files d\'attente', icon: ListOrdered },
      { to: `/f/${slug}/admin/surveys`, label: 'Questionnaires', icon: ClipboardCheck },
      { to: `/f/${slug}/admin/qr-objects`, label: 'QR Codes', icon: QrCode },
      { to: `/f/${slug}/admin/marketplace`, label: 'Marketplace', icon: ShoppingCart },
    ],
  },
  {
    title: 'Equipe',
    collapsible: true,
    items: [
      { to: `/f/${slug}/admin/volunteers`, label: 'Benevoles', icon: Users },
      { to: `/f/${slug}/admin/tasks`, label: 'Taches & Reunions', icon: ClipboardList },
      { to: `/f/${slug}/admin/workspace`, label: 'Espace de travail', icon: Briefcase },
      { to: `/f/${slug}/admin/analytics`, label: 'Statistiques', icon: BarChart3 },
      { to: `/f/${slug}/admin/tickets`, label: 'Support', icon: Ticket },
    ],
  },
  {
    title: 'Parametres',
    collapsible: true,
    items: [
      { to: `/f/${slug}/admin/settings`, label: 'General', icon: Settings },
      { to: `/f/${slug}/admin/regulations`, label: 'Reglements', icon: Scale },
      { to: `/f/${slug}/admin/roles`, label: 'Roles', icon: ShieldCheck },
      { to: `/f/${slug}/admin/api`, label: 'API', icon: Key },
    ],
  },
];

export function FestivalAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { festival, isResolving, error, slug } = useFestivalContext();
  const { isAdmin, isEditor, role: userRole } = useFestivalRole();
  const { profile, isLoading: isAuthLoading, isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navSections = getAdminNav(slug);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  if (isResolving || isAuthLoading) return <LoadingScreen />;

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

  // Still loading role — authenticated but role not resolved yet
  if (isAuthenticated && festival && userRole === null) return <LoadingScreen />;

  // Redirect if user lacks admin/editor role (after festival and auth are loaded)
  if (!isResolving && !isAuthLoading && festival && !isAdmin && !isEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Acces refuse</h1>
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions pour acceder a l'administration de ce festival.
          </p>
          <Link to={`/f/${slug}`} className="inline-block text-primary hover:underline">
            Retour au site du festival
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    // Exact match for overview and settings root
    if (path === `/f/${slug}/admin` || path === `/f/${slug}/admin/settings`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col">
      {/* Sidebar Header */}
      <div className="border-b border-border px-4 py-4">
        <p className="text-sm font-semibold text-foreground truncate">
          {festival?.name ?? 'Administration'}
        </p>
        <Link
          to={`/f/${slug}`}
          onClick={onClose}
          className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour au site public
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-0.5">
          {navSections.map((section, sIdx) => {
            const isCollapsed = section.collapsible && collapsedSections.has(section.title || '');
            const sectionHasActive = section.items.some((item) => isActive(item.to));

            return (
              <div key={sIdx}>
                {section.title && (
                  <button
                    type="button"
                    onClick={() => section.collapsible && toggleSection(section.title!)}
                    className={`mt-3 mb-0.5 flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      sectionHasActive ? 'text-primary' : 'text-muted-foreground/60'
                    } ${section.collapsible ? 'cursor-pointer hover:text-muted-foreground' : 'cursor-default'}`}
                  >
                    {section.title}
                    {section.collapsible && (
                      <ChevronDown className={`h-3 w-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    )}
                  </button>
                )}
                {!isCollapsed && section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        isActive(item.to)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-border px-3 py-3">
        {profile && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">
              {profile.display_name || profile.username}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-accent"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Se deconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-background lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background">
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
            <SidebarContent onClose={() => setSidebarOpen(false)} />
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
