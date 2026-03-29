import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { CmsPage } from '@/types/cms';

export function AdminCmsPage() {
  const { festival } = useTenantStore();

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const res = await api.get<CmsPage[]>(`/cms/festival/${festival.id}/pages`);
    if (res.success && res.data) {
      setPages(res.data);
    } else {
      setError(res.error || 'Impossible de charger les pages.');
    }
    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreate = async () => {
    if (!festival || !createTitle.trim() || !createSlug.trim()) return;
    setCreating(true);
    setMessage(null);

    const res = await api.post<CmsPage>(`/cms/festival/${festival.id}/pages`, {
      title: createTitle.trim(),
      slug: createSlug.trim(),
      is_published: false,
      sort_order: pages.length,
    });

    if (res.success && res.data) {
      setPages((prev) => [...prev, res.data!]);
      setShowCreateDialog(false);
      setCreateTitle('');
      setCreateSlug('');
      setMessage({ type: 'success', text: 'Page creee avec succes.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
    }
    setCreating(false);
  };

  const handleTogglePublish = async (page: CmsPage) => {
    if (!festival) return;
    setMessage(null);

    const res = await api.put<CmsPage>(`/cms/festival/${festival.id}/pages/${page.id}`, {
      is_published: !page.is_published,
    });

    if (res.success && res.data) {
      setPages((prev) => prev.map((p) => (p.id === page.id ? res.data! : p)));
      setMessage({
        type: 'success',
        text: res.data.is_published ? 'Page publiee.' : 'Page repassee en brouillon.',
      });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
  };

  const handleDelete = async (page: CmsPage) => {
    if (!festival) return;
    if (!confirm(`Supprimer la page "${page.title}" ? Cette action est irreversible.`)) return;
    setMessage(null);

    const res = await api.delete(`/cms/festival/${festival.id}/pages/${page.id}`);
    if (res.success) {
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      setMessage({ type: 'success', text: 'Page supprimee.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const openEditDialog = (page: CmsPage) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
    setEditSortOrder(page.sort_order);
  };

  const handleEdit = async () => {
    if (!festival || !editingPage || !editTitle.trim() || !editSlug.trim()) return;
    setSaving(true);
    setMessage(null);

    const res = await api.put<CmsPage>(`/cms/festival/${festival.id}/pages/${editingPage.id}`, {
      title: editTitle.trim(),
      slug: editSlug.trim(),
      sort_order: editSortOrder,
    });

    if (res.success && res.data) {
      setPages((prev) => prev.map((p) => (p.id === editingPage.id ? res.data! : p)));
      setEditingPage(null);
      setMessage({ type: 'success', text: 'Page mise a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
    setSaving(false);
  };

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
        <button
          type="button"
          onClick={fetchPages}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Contenu CMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les pages de contenu de votre festival.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Creer une page
        </button>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouvelle page</h2>
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Titre</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ex : A propos"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Slug (URL)</label>
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="Ex : a-propos"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !createTitle.trim() || !createSlug.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Modifier la page</h2>
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Titre</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Slug (URL)</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Ordre d&apos;affichage</label>
                <input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={saving || !editTitle.trim() || !editSlug.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Statut
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Ordre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Mis a jour
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{page.title}</span>
                      {page.is_homepage && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Accueil
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    /{page.slug}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        page.is_published
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {page.is_published ? 'Publie' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                    {page.sort_order}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {new Date(page.updated_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(page)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={page.is_published ? 'Passer en brouillon' : 'Publier'}
                      >
                        {page.is_published ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <a
                        href={`/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => openEditDialog(page)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(page)}
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
        {pages.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucune page CMS. Creez votre premiere page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
