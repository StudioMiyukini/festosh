import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown,
  X,
  FileText,
  Users,
  Check,
  Copy,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// --- Types ---

interface Regulation {
  id: string;
  festival_id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean | number;
  requires_acceptance: boolean | number;
  acceptance_count: number;
  version: number;
  created_at: number;
  updated_at: number;
}

interface RegulationTemplate {
  key: string;
  title: string;
  label?: string;
}

interface Acceptance {
  id: string;
  name: string;
  email: string | null;
  accepted_at: number;
}

type RegulationForm = {
  title: string;
  content: string;
  category: string;
  published: boolean;
  requires_acceptance: boolean;
};

const emptyForm: RegulationForm = {
  title: '',
  content: '',
  category: 'general',
  published: false,
  requires_acceptance: false,
};

// --- Category config ---

const CATEGORIES: Record<string, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  visitor: { label: 'Visiteurs', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  exhibitor: { label: 'Exposants', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  cosplay: { label: 'Cosplay', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  photo_video: { label: 'Photo / Video', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300' },
  volunteer: { label: 'Benevoles', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  safety: { label: 'Securite', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  food: { label: 'Restauration', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  marketplace: { label: 'Marche', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  privacy: { label: 'Confidentialite', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  visitor_rules: 'Reglement visiteurs',
  exhibitor_terms: 'Conditions exposants',
  cosplay_rules: 'Concours cosplay',
  photo_video: "Droit a l'image",
  volunteer_charter: 'Charte benevoles',
  safety: 'Securite et prevention',
  privacy_policy: 'Politique confidentialite',
};

// --- Markdown renderer ---

function renderMarkdown(md: string): string {
  let html = md
    // escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>');

  // bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // unordered list items
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // ordered list items
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // line breaks (double newline = paragraph break, single = br)
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

// --- Component ---

export function AdminRegulationsPage() {
  const { festival } = useTenantStore();

  // List state
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template dropdown
  const [templates, setTemplates] = useState<RegulationTemplate[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Editor state
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingRegulation, setEditingRegulation] = useState<Regulation | null>(null);
  const [form, setForm] = useState<RegulationForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Acceptances dialog
  const [showAcceptances, setShowAcceptances] = useState(false);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [acceptancesLoading, setAcceptancesLoading] = useState(false);

  // ---------- Fetch regulations ----------

  const fetchRegulations = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);
    const res = await api.get<Regulation[]>(`/regulations/festival/${festival.id}`);
    if (res.success && res.data) {
      setRegulations(res.data);
    } else {
      setError(res.error || 'Impossible de charger les reglements.');
    }
    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  // ---------- Fetch templates ----------

  const fetchTemplates = useCallback(async () => {
    const res = await api.get<RegulationTemplate[]>('/regulations/templates');
    if (res.success && res.data) {
      setTemplates(res.data);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ---------- Template actions ----------

  const handleTemplateSelect = async (templateKey: string) => {
    if (!festival) return;
    setTemplateLoading(true);
    setShowTemplateDropdown(false);
    const res = await api.post<Regulation>(`/regulations/festival/${festival.id}/from-template`, {
      template: templateKey,
    });
    setTemplateLoading(false);
    if (res.success) {
      await fetchRegulations();
    }
  };

  // ---------- CRUD ----------

  const openCreate = () => {
    setEditingRegulation(null);
    setForm(emptyForm);
    setView('editor');
  };

  const openEdit = (reg: Regulation) => {
    setEditingRegulation(reg);
    setForm({
      title: reg.title,
      content: reg.content,
      category: reg.category,
      published: reg.is_published,
      requires_acceptance: reg.requires_acceptance,
    });
    setView('editor');
  };

  const backToList = () => {
    setView('list');
    setEditingRegulation(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!festival || !form.title.trim()) return;
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      content: form.content,
      category: form.category,
      published: form.published,
      requires_acceptance: form.requires_acceptance,
    };

    if (editingRegulation) {
      await api.put(`/regulations/${editingRegulation.id}`, payload);
    } else {
      await api.post(`/regulations/festival/${festival.id}`, payload);
    }

    setSubmitting(false);
    backToList();
    await fetchRegulations();
  };

  const handleDelete = async (reg: Regulation) => {
    if (!confirm(`Supprimer le reglement "${reg.title}" ?`)) return;
    await api.delete(`/regulations/${reg.id}`);
    await fetchRegulations();
  };

  const handleTogglePublish = async (reg: Regulation) => {
    await api.put(`/regulations/${reg.id}`, { is_published: !reg.is_published });
    await fetchRegulations();
  };

  // ---------- Acceptances ----------

  const openAcceptances = async (reg: Regulation) => {
    setShowAcceptances(true);
    setAcceptancesLoading(true);
    const res = await api.get<Acceptance[]>(`/regulations/${reg.id}/acceptances`);
    if (res.success && res.data) {
      setAcceptances(res.data);
    } else {
      setAcceptances([]);
    }
    setAcceptancesLoading(false);
  };

  // ---------- Rendered markdown (memoized) ----------

  const renderedMarkdown = useMemo(() => renderMarkdown(form.content), [form.content]);

  // ---------- Guard ----------

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading && view === 'list') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && view === 'list') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={fetchRegulations}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  // ========== EDITOR VIEW ==========

  if (view === 'editor') {
    return (
      <div>
        {/* Back button */}
        <button
          type="button"
          onClick={backToList}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux reglements
        </button>

        <div className="space-y-6">
          {/* Title */}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Titre du reglement"
            className="w-full rounded-md border border-border bg-background px-4 py-3 text-xl font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Category + toggles row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Category dropdown */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Object.entries(CATEGORIES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Published toggle */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Publie</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, published: !form.published })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.published ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Requires acceptance toggle */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Acceptation requise</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, requires_acceptance: !form.requires_acceptance })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.requires_acceptance ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.requires_acceptance ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Content editor + preview */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Contenu (Markdown)</label>
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Textarea */}
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={20}
                placeholder="Redigez le contenu du reglement en markdown..."
                className="w-full flex-1 resize-y rounded-md border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {/* Preview */}
              <div className="w-full flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 px-4 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Apercu</p>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                />
              </div>
            </div>
          </div>

          {/* Editing metadata + acceptances */}
          {editingRegulation && (
            <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 p-4">
              <span className="text-sm text-muted-foreground">
                Version {editingRegulation.version}
              </span>
              <span className="text-sm text-muted-foreground">
                {editingRegulation.acceptance_count} acceptation{editingRegulation.acceptance_count !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => openAcceptances(editingRegulation)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                <Users className="h-3.5 w-3.5" />
                Voir les acceptations
              </button>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || !form.title.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* Acceptances dialog */}
        {showAcceptances && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Acceptations</h2>
                <button
                  type="button"
                  onClick={() => setShowAcceptances(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {acceptancesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : acceptances.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Aucune acceptation enregistree.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Nom
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {acceptances.map((a) => (
                        <tr key={a.id} className="hover:bg-muted/50">
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-foreground">{a.name}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">{a.email}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                            {formatTimestamp(a.accepted_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAcceptances(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== LIST VIEW ==========

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reglements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les reglements et conditions de votre festival.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Template dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              disabled={templateLoading}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              {templateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Depuis un modele
              <ChevronDown className="h-4 w-4" />
            </button>

            {showTemplateDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTemplateDropdown(false)} />
                <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-border bg-card py-1 shadow-lg">
                  {templates.length > 0
                    ? templates.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => handleTemplateSelect(t.key)}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent"
                        >
                          {TEMPLATE_LABELS[t.key] || t.title || t.key}
                        </button>
                      ))
                    : Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleTemplateSelect(key)}
                          className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent"
                        >
                          {label}
                        </button>
                      ))}
                </div>
              </>
            )}
          </div>

          {/* Create button */}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouveau reglement
          </button>
        </div>
      </div>

      {/* Regulation cards */}
      {regulations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucun reglement.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Creez un reglement ou partez d'un modele.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regulations.map((reg) => {
            const cat = CATEGORIES[reg.category] || CATEGORIES.general;
            return (
              <div
                key={reg.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5"
              >
                {/* Title + badges */}
                <div className="mb-3 flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-2">{reg.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Category badge */}
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                      {cat.label}
                    </span>
                    {/* Published badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        reg.is_published
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {reg.is_published ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Publie
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Brouillon
                        </>
                      )}
                    </span>
                    {/* Requires acceptance badge */}
                    {reg.requires_acceptance && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        <Check className="h-3 w-3" />
                        Acceptation
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>v{reg.version}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {reg.acceptance_count} acceptation{reg.acceptance_count !== 1 ? 's' : ''}
                  </span>
                  <span>{formatTimestamp(reg.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(reg)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(reg)}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    {reg.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {reg.is_published ? 'Depublier' : 'Publier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(reg)}
                    className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
