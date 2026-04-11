import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Tent,
  ExternalLink,
  Users,
} from 'lucide-react';
import { api, ApiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/use-debounce';
import { formatTimestamp } from '@/lib/format-utils';
import { FESTIVAL_FESTIVAL_STATUS_LABELS, FESTIVAL_FESTIVAL_STATUS_COLORS } from '@/lib/labels';

interface FestivalItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  website: string | null;
  member_count: number;
  created_at: number;
}

const PAGE_SIZE = 20;

export function PlatformAdminFestivals() {
  const [festivals, setFestivals] = useState<FestivalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit dialog
  const [editingFestival, setEditingFestival] = useState<FestivalItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'draft',
    city: '',
    country: '',
    contact_email: '',
    website: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchFestivals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = ApiClient.queryString({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    });
    const res = await api.get<FestivalItem[]>(`/platform-admin/festivals${qs}`);

    if (res.success && res.data) {
      setFestivals(res.data);
      setTotal(res.pagination?.total ?? res.data.length);
    } else {
      setError(res.error || 'Erreur');
    }
    setLoading(false);
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchFestivals();
  }, [fetchFestivals]);

  const openEdit = (festival: FestivalItem) => {
    setEditingFestival(festival);
    setEditForm({
      name: festival.name,
      slug: festival.slug,
      description: festival.description || '',
      status: festival.status,
      city: festival.city || '',
      country: festival.country || '',
      contact_email: festival.contact_email || '',
      website: festival.website || '',
    });
  };

  const handleSave = async () => {
    if (!editingFestival) return;
    setSaving(true);
    setMessage(null);

    const payload = {
      name: editForm.name,
      slug: editForm.slug,
      description: editForm.description || null,
      status: editForm.status,
      city: editForm.city || null,
      country: editForm.country || null,
      contact_email: editForm.contact_email || null,
      website: editForm.website || null,
    };

    const res = await api.put<FestivalItem>(
      `/platform-admin/festivals/${editingFestival.id}`,
      payload,
    );
    if (res.success) {
      setEditingFestival(null);
      setMessage({ type: 'success', text: 'Festival mis a jour.' });
      fetchFestivals();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setSaving(false);
  };

  const handleDelete = async (festival: FestivalItem) => {
    if (
      !confirm(
        `Supprimer le festival "${festival.name}" et toutes ses donnees ? Cette action est irreversible.`,
      )
    )
      return;
    setMessage(null);

    const res = await api.delete(`/platform-admin/festivals/${festival.id}`);
    if (res.success) {
      setMessage({ type: 'success', text: 'Festival supprime.' });
      fetchFestivals();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Festivals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez tous les festivals de la plateforme.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom, slug, ville..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-md border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="published">Publie</option>
          <option value="archived">Archive</option>
        </select>
        <span className="text-xs text-muted-foreground">{total} resultat(s)</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Festival
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ville
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Membres
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Creation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {festivals.map((festival) => (
                  <tr key={festival.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{festival.name}</p>
                        <p className="text-xs text-muted-foreground">{festival.slug}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          FESTIVAL_STATUS_COLORS[festival.status] || FESTIVAL_STATUS_COLORS.draft
                        }`}
                      >
                        {FESTIVAL_STATUS_LABELS[festival.status] || festival.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {festival.city || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {festival.member_count}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatTimestamp(festival.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/f/${festival.slug}/admin`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Ouvrir admin festival"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(festival)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(festival)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {festivals.length === 0 && (
            <div className="p-12 text-center">
              <Tent className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun festival trouve.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      {editingFestival && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Modifier le festival</h2>
              <button
                type="button"
                onClick={() => setEditingFestival(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Slug</label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Statut</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publie</option>
                    <option value="archived">Archive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Ville</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Pays</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    value={editForm.contact_email}
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Site web
                  </label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFestival(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !editForm.name || !editForm.slug}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
