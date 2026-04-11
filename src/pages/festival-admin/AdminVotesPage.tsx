import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Vote,
  Star,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';

// --- Types ---

interface VoteCategory {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  voting_start: string;
  voting_end: string;
  max_votes_per_user: number;
  created_at: number;
}

interface VoteResult {
  target_id: string;
  target_name: string;
  avg_rating: number;
  vote_count: number;
}

type CategoryForm = {
  name: string;
  description: string;
  voting_start: string;
  voting_end: string;
  max_votes_per_user: string;
};

const emptyCategoryForm: CategoryForm = {
  name: '',
  description: '',
  voting_start: '',
  voting_end: '',
  max_votes_per_user: '3',
};

export function AdminVotesPage() {
  const { activeEdition } = useTenantStore();

  const [categories, setCategories] = useState<VoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category CRUD
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VoteCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, VoteResult[]>>({});
  const [resultsLoading, setResultsLoading] = useState<Record<string, boolean>>({});

  const fetchCategories = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);
    const res = await api.get<VoteCategory[]>(`/votes/edition/${activeEdition.id}/categories`);
    if (res.success && res.data) {
      setCategories(res.data);
    } else {
      setError(res.error || 'Impossible de charger les categories.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchResults = async (categoryId: string) => {
    setResultsLoading((prev) => ({ ...prev, [categoryId]: true }));
    const res = await api.get<VoteResult[]>(`/votes/categories/${categoryId}/results`);
    if (res.success && res.data) {
      setResults((prev) => ({ ...prev, [categoryId]: res.data! }));
    }
    setResultsLoading((prev) => ({ ...prev, [categoryId]: false }));
  };

  const toggleResults = async (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      if (!results[categoryId]) {
        await fetchResults(categoryId);
      }
    }
  };

  // --- CRUD ---

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyCategoryForm);
    setShowDialog(true);
  };

  const openEdit = (cat: VoteCategory) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      voting_start: cat.voting_start,
      voting_end: cat.voting_end,
      max_votes_per_user: String(cat.max_votes_per_user),
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingCategory(null);
    setForm(emptyCategoryForm);
  };

  const handleSubmit = async () => {
    if (!activeEdition || !form.name.trim()) return;
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      voting_start: form.voting_start,
      voting_end: form.voting_end,
      max_votes_per_user: Number(form.max_votes_per_user),
    };

    if (editingCategory) {
      await api.put(`/votes/edition/${activeEdition.id}/categories/${editingCategory.id}`, payload);
    } else {
      await api.post(`/votes/edition/${activeEdition.id}/categories`, payload);
    }
    setSubmitting(false);
    closeDialog();
    await fetchCategories();
  };

  const handleDelete = async (cat: VoteCategory) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer la categorie "${cat.name}" ?`)) return;
    await api.delete(`/votes/edition/${activeEdition.id}/categories/${cat.id}`);
    if (expandedCategory === cat.id) setExpandedCategory(null);
    await fetchCategories();
  };

  const formatDatetime = (dt: string) => {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars: JSX.Element[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === full && half) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  const getVotingStatus = (cat: VoteCategory) => {
    const now = new Date();
    const start = cat.voting_start ? new Date(cat.voting_start) : null;
    const end = cat.voting_end ? new Date(cat.voting_end) : null;

    if (start && now < start) return { label: 'A venir', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
    if (end && now > end) return { label: 'Termine', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
    return { label: 'En cours', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
  };

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune edition active selectionnee.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button type="button" onClick={fetchCategories} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Votes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les categories de vote et consultez les resultats.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle categorie
        </button>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie de vote'}
              </h2>
              <button type="button" onClick={closeDialog} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex : Meilleur cosplay"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Debut des votes</label>
                  <input
                    type="datetime-local"
                    value={form.voting_start}
                    onChange={(e) => setForm({ ...form, voting_start: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fin des votes</label>
                  <input
                    type="datetime-local"
                    value={form.voting_end}
                    onChange={(e) => setForm({ ...form, voting_end: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Max. votes par utilisateur</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_votes_per_user}
                  onChange={(e) => setForm({ ...form, max_votes_per_user: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeDialog} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCategory ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <Vote className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune categorie de vote.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Creez une categorie pour permettre aux visiteurs de voter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const status = getVotingStatus(cat);
            const isExpanded = expandedCategory === cat.id;
            const catResults = results[cat.id] || [];
            const isLoadingResults = resultsLoading[cat.id];

            return (
              <div key={cat.id} className="rounded-xl border border-border bg-card">
                {/* Category header */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground truncate">{cat.name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{cat.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Debut : {formatDatetime(cat.voting_start)}</span>
                      <span>Fin : {formatDatetime(cat.voting_end)}</span>
                      <span>Max. {cat.max_votes_per_user} vote{cat.max_votes_per_user > 1 ? 's' : ''}/utilisateur</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      type="button"
                      onClick={() => toggleResults(cat.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Resultats
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    <button type="button" onClick={() => openEdit(cat)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(cat)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Results section */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5 pt-3">
                    {isLoadingResults ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : catResults.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Aucun vote enregistre pour cette categorie.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Rang</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Candidat</th>
                              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Note moyenne</th>
                              <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Votes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {catResults
                              .sort((a, b) => b.avg_rating - a.avg_rating)
                              .map((result, idx) => (
                                <tr key={result.target_id} className="hover:bg-muted/50">
                                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                      idx === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      idx === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                      idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-foreground">
                                    {result.target_name}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2">
                                    <div className="flex items-center justify-center gap-1">
                                      {renderStars(result.avg_rating)}
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        ({result.avg_rating.toFixed(1)})
                                      </span>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-center text-sm text-muted-foreground">
                                    {result.vote_count}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => fetchResults(cat.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Rafraichir les resultats
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
