import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Plus,
  ExternalLink,
  Settings,
  Users,
  CreditCard,
  Sparkles,
  Tent,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/shared/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MyFestival {
  id: string;
  name: string;
  slug: string;
  status: string;
  edition_name: string | null;
  member_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-orange-100 text-orange-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publie',
  archived: 'Archive',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Create Festival Dialog
// ---------------------------------------------------------------------------

function CreateFestivalDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Le nom du festival est requis.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const res = await api.post('/festivals', {
      name: name.trim(),
      slug,
      location_name: city.trim() || undefined,
    });

    if (res.success) {
      setName('');
      setCity('');
      onCreated();
      onClose();
    } else {
      setError(res.error || 'Erreur lors de la creation du festival.');
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Creer un festival</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="festival-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Nom du festival
          </label>
          <input
            id="festival-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Japan Expo, Comic Con Paris..."
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="festival-city" className="mb-1.5 block text-sm font-medium text-foreground">
            Ville
          </label>
          <input
            id="festival-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Paris, Lyon, Marseille..."
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Creer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function OrganizerDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<MyFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auth guard: redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Role guard: redirect if not organizer or admin
  useEffect(() => {
    if (!isLoading && profile && profile.platform_role !== 'organizer' && profile.platform_role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isLoading, profile, navigate]);

  const loadFestivals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<MyFestival[]>('/festivals');
    if (result.success && result.data) {
      setFestivals(Array.isArray(result.data) ? result.data : []);
    } else {
      setError(result.error || 'Erreur lors du chargement des festivals.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && profile && (profile.platform_role === 'organizer' || profile.platform_role === 'admin')) {
      loadFestivals();
    }
  }, [isAuthenticated, profile, loadFestivals]);

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

  if (profile.platform_role !== 'organizer' && profile.platform_role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Espace organisateur
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gerez vos festivals, abonnements et parametres d'organisation.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Creer un festival
          </button>
          <Link
            to="/billing"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <CreditCard className="h-4 w-4" />
            Facturation
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Sparkles className="h-4 w-4" />
            Nos offres
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : festivals.length === 0 ? (
        <EmptyState
          icon={Tent}
          title="Aucun festival"
          description="Vous n'avez pas encore cree de festival. Commencez par en creer un !"
          action={{ label: 'Creer un festival', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((festival) => (
            <div
              key={festival.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              {/* Name + status */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">{festival.name}</h3>
                <Badge className={STATUS_STYLES[festival.status] || 'bg-gray-100 text-gray-600'}>
                  {STATUS_LABELS[festival.status] || festival.status}
                </Badge>
              </div>

              {/* Slug */}
              <p className="mb-2 text-xs text-muted-foreground">
                {festival.slug}.miyukini.com
              </p>

              {/* Edition + members */}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {festival.edition_name && (
                  <span className="inline-flex items-center gap-1">
                    <Tent className="h-3 w-3" />
                    {festival.edition_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {festival.member_count} membre{festival.member_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Action links */}
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/f/${festival.slug}/admin`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Administration
                </Link>
                <Link
                  to={`/f/${festival.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Site public
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create festival dialog */}
      <CreateFestivalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={loadFestivals}
      />
    </div>
  );
}
