import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Heart, FileText, BarChart3, CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { EmptyState } from '@/components/shared/EmptyState';

export function DashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  const role = profile.platform_role;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenue, {profile.display_name || profile.username}.
        </p>
      </div>

      {/* Admin View */}
      {role === 'admin' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Statistiques de la plateforme
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* TODO: Wire up to service layer - fetch real platform stats */}
            {[
              { label: 'Festivals', value: '24', icon: CalendarDays },
              { label: 'Utilisateurs', value: '1 283', icon: BarChart3 },
              { label: 'Candidatures', value: '456', icon: FileText },
              { label: 'Exposants actifs', value: '189', icon: BarChart3 },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Organizer View */}
      {role === 'organizer' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Mes festivals</h2>
            <Link
              to="/create-festival"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Creer un festival
            </Link>
          </div>

          {/* TODO: Wire up to service layer - fetch user's festivals */}
          <EmptyState
            icon={CalendarDays}
            title="Aucun festival"
            description="Vous n'avez pas encore cree de festival. Commencez des maintenant !"
            action={{
              label: 'Creer un festival',
              onClick: () => navigate('/create-festival'),
            }}
          />
        </div>
      )}

      {/* User View */}
      {role === 'user' && (
        <div className="space-y-12">
          {/* Favorites */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Mes festivals favoris
            </h2>
            {/* TODO: Wire up to service layer - fetch user's favorite festivals */}
            <EmptyState
              icon={Heart}
              title="Aucun favori"
              description="Parcourez l'annuaire et ajoutez des festivals a vos favoris."
              action={{
                label: "Parcourir l'annuaire",
                onClick: () => navigate('/directory'),
              }}
            />
          </div>

          {/* Applications */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Mes candidatures
            </h2>
            {/* TODO: Wire up to service layer - fetch user's applications */}
            <EmptyState
              icon={FileText}
              title="Aucune candidature"
              description="Vous n'avez pas encore postule comme exposant a un festival."
            />
          </div>
        </div>
      )}
    </div>
  );
}
