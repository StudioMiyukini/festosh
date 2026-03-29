import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Heart, FileText, BarChart3, CalendarDays, Loader2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { festivalService } from '@/services/festival.service';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Festival } from '@/types/festival';

interface FestivalWithRole {
  festival: Festival;
  role: string;
}

export function DashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();

  const [festivals, setFestivals] = useState<FestivalWithRole[]>([]);
  const [loadingFestivals, setLoadingFestivals] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Fetch user's festivals
  useEffect(() => {
    if (!isAuthenticated) return;

    festivalService.getMyFestivals().then((result) => {
      if (result.data) {
        setFestivals(result.data.map((m) => ({ festival: m.festival, role: m.role })));
      }
      setLoadingFestivals(false);
    });
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

      {/* My Festivals Section (for all roles) */}
      <div className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Mes festivals</h2>
          {(role === 'organizer' || role === 'admin') && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Creer un festival
            </button>
          )}
        </div>

        {loadingFestivals ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : festivals.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucun festival"
            description={
              role === 'user'
                ? "Vous n'etes membre d'aucun festival pour l'instant."
                : "Vous n'avez pas encore cree de festival. Commencez des maintenant !"
            }
            action={
              role !== 'user'
                ? { label: 'Creer un festival', onClick: () => setShowCreateModal(true) }
                : { label: "Parcourir l'annuaire", onClick: () => navigate('/directory') }
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {festivals.map(({ festival, role: festivalRole }) => (
              <div
                key={festival.id}
                className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{festival.name}</h3>
                    {festival.location_name && (
                      <p className="text-xs text-muted-foreground">{festival.location_name}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    festival.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : festival.status === 'archived'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {festival.status === 'published' ? 'Publie' : festival.status === 'archived' ? 'Archive' : 'Brouillon'}
                  </span>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Role : <span className="font-medium text-foreground">{festivalRole}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/f/${festival.slug}/admin`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Administrer
                  </Link>
                  <Link
                    to={`/f/${festival.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Voir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin stats */}
      {role === 'admin' && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Statistiques de la plateforme
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Festivals', value: String(festivals.length), icon: CalendarDays },
              { label: 'Candidatures', value: '-', icon: FileText },
              { label: 'Exposants actifs', value: '-', icon: BarChart3 },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-6">
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

      {/* User favorites & applications */}
      {role === 'user' && (
        <div className="space-y-12">
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Mes festivals favoris
            </h2>
            <EmptyState
              icon={Heart}
              title="Aucun favori"
              description="Parcourez l'annuaire et ajoutez des festivals a vos favoris."
              action={{ label: "Parcourir l'annuaire", onClick: () => navigate('/directory') }}
            />
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Mes candidatures
            </h2>
            <EmptyState
              icon={FileText}
              title="Aucune candidature"
              description="Vous n'avez pas encore postule comme exposant a un festival."
            />
          </div>
        </div>
      )}

      {/* Create Festival Modal */}
      {showCreateModal && (
        <CreateFestivalModal onClose={() => setShowCreateModal(false)} onCreated={(f) => {
          setFestivals((prev) => [...prev, { festival: f, role: 'owner' }]);
          setShowCreateModal(false);
        }} />
      )}
    </div>
  );
}

function CreateFestivalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (f: Festival) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const result = await festivalService.createFestival({
      name: name.trim(),
      slug: generateSlug(name),
      description: description.trim() || undefined,
    });

    if (result.error) {
      setError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    if (result.data) {
      onCreated(result.data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-foreground">Creer un festival</h2>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="festival-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Nom du festival *
            </label>
            <input
              id="festival-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon Super Festival"
              className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {name && (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug : {generateSlug(name)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="festival-description" className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id="festival-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Decrivez votre festival..."
              className="w-full resize-none rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label htmlFor="festival-city" className="mb-1.5 block text-sm font-medium text-foreground">
              Ville
            </label>
            <input
              id="festival-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
              className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Creer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
