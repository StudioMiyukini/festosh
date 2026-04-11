import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  Star,
  Ticket,
  Heart,
  History,
  MessageSquare,
  MapPin,
  Coins,
  Sparkles,
  X,
  Check,
  Trash2,
  Calendar,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp, formatCurrency } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisitorProfile {
  level: number;
  level_name: string;
  xp_total: number;
  xp_current_level: number;
  xp_next_level: number;
  coins: number;
  festivals_visited: number;
  reviews_given: number;
  exhibitors_followed: number;
}

interface MyFestival {
  id: string;
  festival_id: string;
  festival_name: string;
  festival_slug: string;
  festival_logo_url: string | null;
  edition_name: string;
  city: string | null;
  visited_at: number;
  has_review: boolean;
}

interface MyTicket {
  id: string;
  festival_name: string;
  festival_slug: string;
  edition_name: string;
  ticket_type_name: string;
  qr_code: string;
  status: string;
  purchased_at: number;
  amount_cents: number;
}

interface FavoriteExhibitor {
  id: string;
  exhibitor_id: string;
  company_name: string;
  activity_type: string | null;
  city: string | null;
  category: string | null;
  logo_url: string | null;
  upcoming_festivals: { festival_name: string; festival_slug: string; edition_name: string }[];
}

interface XpHistoryEntry {
  id: string;
  action: string;
  xp_earned: number;
  coins_earned: number;
  created_at: number;
}

interface XpRule {
  action: string;
  label: string;
  xp: number;
  coins: number;
}

interface MyReview {
  id: string;
  festival_name: string;
  festival_slug: string;
  overall_rating: number;
  nps_score: number | null;
  comment: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TabId = 'festivals' | 'tickets' | 'favorites' | 'xp' | 'reviews';

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

const TICKET_STATUS_STYLES: Record<string, string> = {
  valid: 'bg-green-100 text-green-700',
  used: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  valid: 'Valide',
  used: 'Utilise',
  cancelled: 'Annule',
};

// ---------------------------------------------------------------------------
// Star Rating component
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
  size = 'md',
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Star
              className={`${sizeClass} ${
                filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Dialog
// ---------------------------------------------------------------------------

const REVIEW_CATEGORIES = [
  { key: 'organisation', label: 'Organisation' },
  { key: 'programme', label: 'Programme' },
  { key: 'stands', label: 'Stands' },
  { key: 'ambiance', label: 'Ambiance' },
  { key: 'restauration', label: 'Restauration' },
  { key: 'accessibilite', label: 'Accessibilite' },
  { key: 'rapport_qualite_prix', label: 'Rapport qualite-prix' },
];

function ReviewDialog({
  festival,
  onClose,
  onSubmitted,
}: {
  festival: MyFestival;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [overall, setOverall] = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [nps, setNps] = useState(5);
  const [wouldReturn, setWouldReturn] = useState(true);
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const setCategoryRating = (key: string, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (overall === 0) {
      setError('Veuillez donner une note globale.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      festival_id: festival.festival_id,
      edition_name: festival.edition_name,
      overall_rating: overall,
      category_ratings: Object.keys(categories).length > 0 ? categories : undefined,
      nps_score: nps,
      would_return: wouldReturn,
      comment: comment.trim() || undefined,
      suggestions: suggestions.trim() || undefined,
    };

    const result = await api.post('/visitor-hub/reviews', payload);
    setSubmitting(false);

    if (result.success) {
      setToast('+75 XP, +15 pieces gagnes !');
      setTimeout(() => {
        onSubmitted();
      }, 2000);
    } else {
      setError(result.error || 'Erreur lors de la soumission.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-1 text-lg font-semibold text-foreground">Donner mon avis</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          {festival.festival_name} — {festival.edition_name}
        </p>

        {/* Overall rating */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Note globale <span className="text-destructive">*</span>
          </label>
          <StarRating value={overall} onChange={setOverall} />
        </div>

        {/* Category ratings */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-foreground">
            Notes par categorie (optionnel)
          </label>
          <div className="grid gap-2">
            {REVIEW_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{cat.label}</span>
                <StarRating
                  value={categories[cat.key] || 0}
                  onChange={(v) => setCategoryRating(cat.key, v)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* NPS */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Recommanderiez-vous ce festival ?
          </label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNps(n)}
                className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                  nps === n
                    ? n <= 6
                      ? 'bg-red-500 text-white'
                      : n <= 8
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Pas du tout</span>
            <span>Absolument</span>
          </div>
        </div>

        {/* Would return */}
        <div className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Y retourneriez-vous ?
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWouldReturn(true)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                wouldReturn
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setWouldReturn(false)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                !wouldReturn
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Non
            </button>
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium text-foreground">
            Commentaire
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Partagez votre experience..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Suggestions */}
        <div className="mb-5">
          <label htmlFor="review-suggestions" className="mb-1.5 block text-sm font-medium text-foreground">
            Suggestions
          </label>
          <textarea
            id="review-suggestions"
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            rows={2}
            placeholder="Des idees d'amelioration ?"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
            <Sparkles className="mr-1.5 inline h-4 w-4" />
            {toast}
          </div>
        )}

        {/* Actions */}
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
            disabled={submitting || !!toast}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Envoyer mon avis
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Mes festivals
// ---------------------------------------------------------------------------

function FestivalsTab() {
  const [festivals, setFestivals] = useState<MyFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewFestival, setReviewFestival] = useState<MyFestival | null>(null);

  const fetchFestivals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<MyFestival[]>('/visitor-hub/my-festivals');
    if (result.success && result.data) {
      setFestivals(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des festivals.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFestivals();
  }, [fetchFestivals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (festivals.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Aucun festival visite"
        description="Vous n'avez pas encore visite de festival. Explorez notre catalogue pour trouver votre prochain evenement !"
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start gap-3">
              {f.festival_logo_url ? (
                <img
                  src={f.festival_logo_url}
                  alt={f.festival_name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to={`/f/${f.festival_slug}`}
                  className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                >
                  {f.festival_name}
                </Link>
                <p className="text-xs text-muted-foreground">{f.edition_name}</p>
              </div>
            </div>

            {f.city && (
              <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {f.city}
              </div>
            )}

            <p className="mb-3 text-xs text-muted-foreground">
              Visite le {formatTimestamp(f.visited_at)}
            </p>

            {f.has_review ? (
              <Badge className="bg-green-100 text-green-700">
                <Check className="mr-1 h-3 w-3" />
                Avis donne
              </Badge>
            ) : (
              <button
                type="button"
                onClick={() => setReviewFestival(f)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Star className="h-3.5 w-3.5" />
                Donner mon avis
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Review dialog */}
      {reviewFestival && (
        <ReviewDialog
          festival={reviewFestival}
          onClose={() => setReviewFestival(null)}
          onSubmitted={() => {
            setReviewFestival(null);
            fetchFestivals();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Mes billets
// ---------------------------------------------------------------------------

function TicketsTab() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.get<MyTicket[]>('/visitor-hub/my-tickets');
      if (result.success && result.data) {
        setTickets(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des billets.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Aucun billet"
        description="Vous n'avez pas encore achete de billets pour un festival."
      />
    );
  }

  // Group tickets by festival + edition
  const grouped = tickets.reduce<Record<string, MyTicket[]>>((acc, t) => {
    const key = `${t.festival_slug}::${t.edition_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([key, group]) => {
        const first = group[0];
        return (
          <div key={key}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              <Link to={`/f/${first.festival_slug}`} className="hover:text-primary">
                {first.festival_name}
              </Link>
              <span className="ml-2 text-muted-foreground font-normal">— {first.edition_name}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t.ticket_type_name}</span>
                    <Badge className={TICKET_STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-600'}>
                      {TICKET_STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </div>

                  <p className="mb-1 font-mono text-xs text-muted-foreground" title={t.qr_code}>
                    QR: {t.qr_code.length > 20 ? `${t.qr_code.substring(0, 20)}...` : t.qr_code}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Achete le {formatTimestamp(t.purchased_at)}</span>
                    <span className="font-medium text-foreground">{formatCurrency(t.amount_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Exposants favoris
// ---------------------------------------------------------------------------

function FavoritesTab() {
  const [favorites, setFavorites] = useState<FavoriteExhibitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<FavoriteExhibitor[]>('/visitor-hub/favorites');
    if (result.success && result.data) {
      setFavorites(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des favoris.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const removeFavorite = async (exhibitorId: string) => {
    setRemoving(exhibitorId);
    const result = await api.delete(`/visitor-hub/favorites/${exhibitorId}`);
    if (result.success) {
      setFavorites((prev) => prev.filter((f) => f.exhibitor_id !== exhibitorId));
    }
    setRemoving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Aucun exposant suivi"
        description="Suivez vos exposants preferes pour savoir ou les retrouver lors des prochains festivals."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="mb-3 flex items-start gap-3">
            {fav.logo_url ? (
              <img
                src={fav.logo_url}
                alt={fav.company_name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{fav.company_name}</p>
              {fav.activity_type && (
                <p className="text-xs text-muted-foreground">{fav.activity_type}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeFavorite(fav.exhibitor_id)}
              disabled={removing === fav.exhibitor_id}
              title="Retirer des favoris"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              {removing === fav.exhibitor_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {fav.city && (
              <Badge className="bg-muted text-foreground">
                <MapPin className="mr-1 h-3 w-3" />
                {fav.city}
              </Badge>
            )}
            {fav.category && (
              <Badge className="bg-muted text-foreground">{fav.category}</Badge>
            )}
          </div>

          {/* Upcoming festivals */}
          {fav.upcoming_festivals.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-foreground">Prochains festivals</p>
              <div className="space-y-1">
                {fav.upcoming_festivals.map((uf, i) => (
                  <Link
                    key={i}
                    to={`/f/${uf.festival_slug}`}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ChevronRight className="h-3 w-3" />
                    {uf.festival_name} — {uf.edition_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Historique XP
// ---------------------------------------------------------------------------

function XpHistoryTab() {
  const [history, setHistory] = useState<XpHistoryEntry[]>([]);
  const [rules, setRules] = useState<XpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const [historyRes, rulesRes] = await Promise.all([
        api.get<XpHistoryEntry[]>('/visitor-hub/xp-history'),
        api.get<XpRule[]>('/visitor-hub/xp-rules'),
      ]);

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      } else {
        setError(historyRes.error || "Erreur lors du chargement de l'historique XP.");
      }

      if (rulesRes.success && rulesRes.data) {
        setRules(rulesRes.data);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucun historique"
          description="Votre historique XP apparaitra ici au fur et a mesure de vos actions."
        />
      ) : (
        <div className="space-y-1">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{entry.action}</p>
                <p className="text-xs text-muted-foreground">{formatTimestamp(entry.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {entry.xp_earned > 0 && (
                  <Badge className="bg-green-100 text-green-700">+{entry.xp_earned} XP</Badge>
                )}
                {entry.coins_earned > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <Coins className="mr-0.5 h-3 w-3" />
                    +{entry.coins_earned}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* XP rules info card */}
      {rules.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Comment gagner des XP et des pieces
            </h4>
          </div>
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">{rule.label}</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">+{rule.xp} XP</Badge>
                  {rule.coins > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Coins className="mr-0.5 h-3 w-3" />
                      +{rule.coins}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Mes avis
// ---------------------------------------------------------------------------

function ReviewsTab() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.get<MyReview[]>('/visitor-hub/my-reviews');
      if (result.success && result.data) {
        setReviews(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement des avis.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Aucun avis"
        description="Vous n'avez pas encore donne d'avis. Visitez un festival et partagez votre experience !"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="mb-2 flex items-start justify-between">
            <Link
              to={`/f/${r.festival_slug}`}
              className="text-sm font-semibold text-foreground hover:text-primary"
            >
              {r.festival_name}
            </Link>
            <span className="text-xs text-muted-foreground">{formatTimestamp(r.created_at)}</span>
          </div>

          <div className="mb-2">
            <StarRating value={r.overall_rating} readonly size="sm" />
          </div>

          {r.nps_score !== null && (
            <p className="mb-2 text-xs text-muted-foreground">
              NPS : <span className="font-medium text-foreground">{r.nps_score}/10</span>
            </p>
          )}

          {r.comment && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{r.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// XP Header Bar
// ---------------------------------------------------------------------------

function XpHeader({ profile }: { profile: VisitorProfile }) {
  const xpProgress =
    profile.xp_next_level > profile.xp_current_level
      ? ((profile.xp_total - profile.xp_current_level) /
          (profile.xp_next_level - profile.xp_current_level)) *
        100
      : 100;

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-6">
      {/* Level + progress */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Niveau {profile.level} — {profile.level_name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {profile.xp_total} XP au total
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700">
            <Coins className="h-4 w-4" />
            {profile.coins} pieces
          </div>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{profile.xp_total - profile.xp_current_level} / {profile.xp_next_level - profile.xp_current_level} XP</span>
          <span>Niveau {profile.level + 1}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{profile.festivals_visited}</p>
          <p className="text-xs text-muted-foreground">Festivals visites</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{profile.reviews_given}</p>
          <p className="text-xs text-muted-foreground">Avis donnes</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{profile.exhibitors_followed}</p>
          <p className="text-xs text-muted-foreground">Exposants suivis</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'festivals', label: 'Mes festivals', icon: Calendar },
  { id: 'tickets', label: 'Mes billets', icon: Ticket },
  { id: 'favorites', label: 'Exposants favoris', icon: Heart },
  { id: 'xp', label: 'Historique XP', icon: History },
  { id: 'reviews', label: 'Mes avis', icon: MessageSquare },
];

export function VisitorDashboardPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('festivals');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['festivals']));

  const [visitorProfile, setVisitorProfile] = useState<VisitorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Load visitor profile / XP bar data
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setProfileLoading(true);
      const result = await api.get<VisitorProfile>('/visitor-hub/me');
      if (result.success && result.data) {
        setVisitorProfile(result.data);
      }
      setProfileLoading(false);
    })();
  }, [isAuthenticated]);

  // Lazy-mount: mark tab as mounted only when first selected
  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Espace visiteur
        </h1>
        <p className="mt-2 text-muted-foreground">
          Retrouvez vos festivals, billets et recompenses au meme endroit.
        </p>
      </div>

      {/* XP Header */}
      {profileLoading ? (
        <div className="mb-8 flex items-center justify-center rounded-xl border border-border bg-card py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visitorProfile ? (
        <XpHeader profile={visitorProfile} />
      ) : null}

      {/* Tab navigation */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels (lazy mounted, hidden when inactive) */}
      <div>
        {mountedTabs.has('festivals') && (
          <div className={activeTab === 'festivals' ? '' : 'hidden'}>
            <FestivalsTab />
          </div>
        )}
        {mountedTabs.has('tickets') && (
          <div className={activeTab === 'tickets' ? '' : 'hidden'}>
            <TicketsTab />
          </div>
        )}
        {mountedTabs.has('favorites') && (
          <div className={activeTab === 'favorites' ? '' : 'hidden'}>
            <FavoritesTab />
          </div>
        )}
        {mountedTabs.has('xp') && (
          <div className={activeTab === 'xp' ? '' : 'hidden'}>
            <XpHistoryTab />
          </div>
        )}
        {mountedTabs.has('reviews') && (
          <div className={activeTab === 'reviews' ? '' : 'hidden'}>
            <ReviewsTab />
          </div>
        )}
      </div>
    </div>
  );
}
