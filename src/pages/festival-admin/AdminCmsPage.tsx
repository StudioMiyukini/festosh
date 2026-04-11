import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Lock,
  Layers,
  ChevronUp,
  ChevronDown,
  Menu,
  ExternalLink,
  Link,
  FileIcon,
  GripVertical,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { CmsPage, CmsNavItem } from '@/types/cms';

// ---------------------------------------------------------------------------
// Nav item form state
// ---------------------------------------------------------------------------

interface NavItemFormState {
  label: string;
  link_type: 'page' | 'internal' | 'external';
  target: string;
  parent_id: string | null;
  is_visible: boolean;
  open_new_tab: boolean;
}

const emptyNavForm: NavItemFormState = {
  label: '',
  link_type: 'page',
  target: '',
  parent_id: null,
  is_visible: true,
  open_new_tab: false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminCmsPage() {
  const { festival } = useTenantStore();
  const navigate = useNavigate();

  // ----- Pages state -----
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [initializing, setInitializing] = useState(false);

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

  // ----- Navigation state -----
  const [navItems, setNavItems] = useState<CmsNavItem[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [navError, setNavError] = useState<string | null>(null);

  // Add nav item dialog
  const [showNavDialog, setShowNavDialog] = useState(false);
  const [navForm, setNavForm] = useState<NavItemFormState>({ ...emptyNavForm });
  const [navSaving, setNavSaving] = useState(false);

  // Inline‐edit nav item
  const [editingNavId, setEditingNavId] = useState<string | null>(null);
  const [editNavLabel, setEditNavLabel] = useState('');
  const [editNavTarget, setEditNavTarget] = useState('');
  const [editNavLinkType, setEditNavLinkType] = useState<'page' | 'internal' | 'external'>('page');

  // =========================================================================
  // Fetch pages
  // =========================================================================

  const fetchPages = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const res = await api.get<CmsPage[]>(`/cms/festival/${festival.id}/pages`);
    if (res.success && res.data) {
      setPages(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res.error || 'Impossible de charger les pages.');
    }
    setLoading(false);
  }, [festival]);

  // =========================================================================
  // Fetch navigation items
  // =========================================================================

  const fetchNavItems = useCallback(async () => {
    if (!festival) return;
    setNavLoading(true);
    setNavError(null);

    const res = await api.get<CmsNavItem[]>(`/cms/festival/${festival.id}/navigation`);
    if (res.success && res.data) {
      setNavItems(Array.isArray(res.data) ? res.data : []);
    } else {
      setNavError(res.error || 'Impossible de charger le menu de navigation.');
    }
    setNavLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchPages();
    fetchNavItems();
  }, [fetchPages, fetchNavItems]);

  // =========================================================================
  // Initialize default pages
  // =========================================================================

  const handleInitializeDefaults = async () => {
    if (!festival) return;
    setInitializing(true);
    setMessage(null);

    const res = await api.post<CmsPage[]>(`/cms/festival/${festival.id}/pages/initialize-defaults`);
    if (res.success) {
      await fetchPages();
      setMessage({ type: 'success', text: 'Pages par defaut initialisees avec succes.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'initialisation.' });
    }
    setInitializing(false);
  };

  // =========================================================================
  // CRUD pages
  // =========================================================================

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

    const res = await api.put<CmsPage>(`/cms/pages/${page.id}`, {
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
    if (page.is_system) return;
    if (!confirm(`Supprimer la page "${page.title}" ? Cette action est irreversible.`)) return;
    setMessage(null);

    const res = await api.delete(`/cms/pages/${page.id}`);
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

    const res = await api.put<CmsPage>(`/cms/pages/${editingPage.id}`, {
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

  // =========================================================================
  // Navigation CRUD
  // =========================================================================

  const handleAddNavItem = async () => {
    if (!festival || !navForm.label.trim() || !navForm.target.trim()) return;
    setNavSaving(true);
    setMessage(null);

    const body = {
      label: navForm.label.trim(),
      link_type: navForm.link_type,
      target: navForm.target.trim(),
      parent_id: navForm.parent_id,
      is_visible: navForm.is_visible,
      open_new_tab: navForm.open_new_tab,
      sort_order: navForm.parent_id
        ? (flatChildren(navForm.parent_id).length)
        : topLevelNavItems.length,
    };

    const res = await api.post<CmsNavItem>(`/cms/festival/${festival.id}/navigation`, body);
    if (res.success) {
      await fetchNavItems();
      setShowNavDialog(false);
      setNavForm({ ...emptyNavForm });
      setMessage({ type: 'success', text: 'Element de navigation ajoute.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'ajout.' });
    }
    setNavSaving(false);
  };

  const handleDeleteNavItem = async (item: CmsNavItem) => {
    if (!festival) return;
    if (!confirm(`Supprimer l'element "${item.label}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/cms/navigation/${item.id}`);
    if (res.success) {
      await fetchNavItems();
      setMessage({ type: 'success', text: 'Element supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleMoveNavItem = async (item: CmsNavItem, direction: 'up' | 'down') => {
    if (!festival) return;
    const siblings = item.parent_id
      ? flatChildren(item.parent_id)
      : topLevelNavItems;
    const idx = siblings.findIndex((n) => n.id === item.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const sibling = siblings[swapIdx];
    setMessage(null);

    // Swap sort_order values
    await Promise.all([
      api.put(`/cms/navigation/${item.id}`, { sort_order: sibling.sort_order }),
      api.put(`/cms/navigation/${sibling.id}`, { sort_order: item.sort_order }),
    ]);

    await fetchNavItems();
  };

  const startEditNavItem = (item: CmsNavItem) => {
    setEditingNavId(item.id);
    setEditNavLabel(item.label);
    setEditNavTarget(item.target);
    setEditNavLinkType(item.link_type);
  };

  const cancelEditNavItem = () => {
    setEditingNavId(null);
  };

  const saveEditNavItem = async (item: CmsNavItem) => {
    if (!festival || !editNavLabel.trim() || !editNavTarget.trim()) return;
    setMessage(null);

    const res = await api.put<CmsNavItem>(`/cms/navigation/${item.id}`, {
      label: editNavLabel.trim(),
      target: editNavTarget.trim(),
      link_type: editNavLinkType,
    });
    if (res.success) {
      await fetchNavItems();
      setEditingNavId(null);
      setMessage({ type: 'success', text: 'Element mis a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
  };

  const openAddChildDialog = (parentId: string) => {
    setNavForm({ ...emptyNavForm, parent_id: parentId });
    setShowNavDialog(true);
  };

  // =========================================================================
  // Helpers
  // =========================================================================

  const topLevelNavItems = navItems
    .filter((n) => !n.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const flatChildren = (parentId: string) =>
    navItems
      .filter((n) => n.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

  const linkTypeLabel = (type: CmsNavItem['link_type']) => {
    switch (type) {
      case 'page': return 'Page CMS';
      case 'internal': return 'Lien interne';
      case 'external': return 'Lien externe';
    }
  };

  const linkTypeIcon = (type: CmsNavItem['link_type']) => {
    switch (type) {
      case 'page': return <FileIcon className="h-3.5 w-3.5" />;
      case 'internal': return <Link className="h-3.5 w-3.5" />;
      case 'external': return <ExternalLink className="h-3.5 w-3.5" />;
    }
  };

  // =========================================================================
  // Render helpers
  // =========================================================================

  const renderNavItem = (item: CmsNavItem, isChild = false) => {
    const isEditing = editingNavId === item.id;
    const siblings = item.parent_id ? flatChildren(item.parent_id) : topLevelNavItems;
    const idx = siblings.findIndex((n) => n.id === item.id);
    const children = flatChildren(item.id);

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 rounded-md border border-border px-3 py-2 ${
            isChild ? 'ml-8 border-dashed' : ''
          }`}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

          {isEditing ? (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                type="text"
                value={editNavLabel}
                onChange={(e) => setEditNavLabel(e.target.value)}
                className="w-36 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Label"
              />
              <select
                value={editNavLinkType}
                onChange={(e) => setEditNavLinkType(e.target.value as 'page' | 'internal' | 'external')}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="page">Page CMS</option>
                <option value="internal">Lien interne</option>
                <option value="external">Lien externe</option>
              </select>
              <input
                type="text"
                value={editNavTarget}
                onChange={(e) => setEditNavTarget(e.target.value)}
                className="w-40 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Cible"
              />
              <button
                type="button"
                onClick={() => saveEditNavItem(item)}
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                OK
              </button>
              <button
                type="button"
                onClick={cancelEditNavItem}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {linkTypeIcon(item.link_type)}
                  {linkTypeLabel(item.link_type)}
                </span>
                <span className="truncate text-xs text-muted-foreground">{item.target}</span>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveNavItem(item, 'up')}
                  disabled={idx === 0}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  title="Monter"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveNavItem(item, 'down')}
                  disabled={idx === siblings.length - 1}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  title="Descendre"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startEditNavItem(item)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {!isChild && (
                  <button
                    type="button"
                    onClick={() => openAddChildDialog(item.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Ajouter un sous-menu"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteNavItem(item)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div className="mt-1 space-y-1">
            {children.map((child) => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // Loading / error states
  // =========================================================================

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

  // =========================================================================
  // Main render
  // =========================================================================

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

      {/* Add Nav Item Dialog */}
      {showNavDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {navForm.parent_id ? 'Ajouter un sous-menu' : 'Ajouter un element'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowNavDialog(false); setNavForm({ ...emptyNavForm }); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Label</label>
                <input
                  type="text"
                  value={navForm.label}
                  onChange={(e) => setNavForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ex : Accueil"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type de lien</label>
                <select
                  value={navForm.link_type}
                  onChange={(e) => setNavForm((f) => ({ ...f, link_type: e.target.value as 'page' | 'internal' | 'external' }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="page">Page CMS</option>
                  <option value="internal">Lien interne</option>
                  <option value="external">Lien externe</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Cible</label>
                <input
                  type="text"
                  value={navForm.target}
                  onChange={(e) => setNavForm((f) => ({ ...f, target: e.target.value }))}
                  placeholder={
                    navForm.link_type === 'page'
                      ? 'Ex : accueil'
                      : navForm.link_type === 'internal'
                        ? 'Ex : /schedule'
                        : 'Ex : https://exemple.com'
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {!navForm.parent_id && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Parent (optionnel)</label>
                  <select
                    value={navForm.parent_id || ''}
                    onChange={(e) => setNavForm((f) => ({ ...f, parent_id: e.target.value || null }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Aucun (niveau principal)</option>
                    {topLevelNavItems.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowNavDialog(false); setNavForm({ ...emptyNavForm }); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddNavItem}
                disabled={navSaving || !navForm.label.trim() || !navForm.target.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {navSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Pages List                                                        */}
      {/* ================================================================= */}

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
                      {!!page.is_homepage && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Accueil
                        </span>
                      )}
                      {!!page.is_system && (
                        <span title="Page systeme"><Lock className="h-3.5 w-3.5 text-muted-foreground" /></span>
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
                    {new Date(Number(page.updated_at) * 1000).toLocaleDateString('fr-FR')}
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
                        title="Modifier les metadonnees"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`pages/${page.id}`)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Editer le contenu"
                      >
                        <Layers className="h-4 w-4" />
                      </button>
                      {page.is_system ? (
                        <span
                          className="rounded-md p-1.5 text-muted-foreground/30 cursor-not-allowed"
                          title="Impossible de supprimer une page systeme"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(page)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state with initialize-defaults CTA */}
        {pages.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucune page CMS. Creez votre premiere page ou initialisez les pages par defaut.
            </p>
            <button
              type="button"
              onClick={handleInitializeDefaults}
              disabled={initializing}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {initializing && <Loader2 className="h-4 w-4 animate-spin" />}
              Initialiser les pages par defaut
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Navigation editor                                                 */}
      {/* ================================================================= */}

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Menu de navigation</h2>
          </div>
          <button
            type="button"
            onClick={() => { setNavForm({ ...emptyNavForm }); setShowNavDialog(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un element
          </button>
        </div>

        {navLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : navError ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">{navError}</p>
            <button
              type="button"
              onClick={fetchNavItems}
              className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reessayer
            </button>
          </div>
        ) : topLevelNavItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Menu className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun element de navigation. Ajoutez-en un pour construire votre menu.
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            {topLevelNavItems.map((item) => renderNavItem(item))}
          </div>
        )}
      </div>
    </div>
  );
}
