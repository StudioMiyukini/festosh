/**
 * Exhibitor CMS page editor.
 *
 * Provides Elementor Pro-style content + style editing for the exhibitor's
 * public vitrine. Each block carries both `content` (data) and `settings.style`
 * (universal cosmetic theming — backgrounds, padding, borders, radius, shadow,
 * fonts, alignment, animations).
 *
 * All edits use the generic /cms/pages/:id and /cms/blocks/:id endpoints which
 * work regardless of page owner. The right-side preview reuses BlockRenderer
 * so the WYSIWYG is consistent with the public render.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Save, ExternalLink, Type, AlignLeft, ImageIcon, Images, Megaphone,
  MousePointerClick, Minus, MoveVertical, Columns2, HelpCircle,
  Quote, Share2, BarChart3, ListChecks, Palette, FileText, Zap, RotateCw,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';
import type { BlockStyle } from '@/types/cms';

// ─── Types ──────────────────────────────────────────────────────────────────

type SupportedBlock =
  | 'hero' | 'heading' | 'text' | 'image' | 'gallery' | 'image_text'
  | 'cta' | 'button' | 'faq' | 'accordion' | 'separator' | 'spacer'
  | 'animated_heading' | 'blockquote' | 'social_icons' | 'progress'
  | 'flip_box' | 'price_list';

interface CmsBlock {
  id: string;
  block_type: SupportedBlock | string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  sort_order: number;
  is_visible: number;
}

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  is_published: number;
  is_homepage: number;
  exhibitor_id: string | null;
  blocks: CmsBlock[];
}

interface ExhibitorProfile { id: string; slug: string | null; }

// ─── Block templates ─────────────────────────────────────────────────────

const BLOCK_TEMPLATES: { type: SupportedBlock; label: string; icon: typeof Type; category: 'base' | 'contenu' | 'interactif' | 'mise_en_page'; defaultContent: Record<string, unknown> }[] = [
  // Base
  { type: 'hero', label: 'Banniere', icon: Type, category: 'base', defaultContent: { title: 'Titre principal', subtitle: 'Sous-titre', image_url: '' } },
  { type: 'heading', label: 'Titre', icon: Type, category: 'base', defaultContent: { text: 'Mon titre', subtitle: '', level: 'h2', align: 'center' } },
  { type: 'animated_heading', label: 'Titre anime', icon: Zap, category: 'base', defaultContent: { before_text: 'Je suis', rotating_words: ['créatif', 'passionné', 'innovant'], after_text: '', animation: 'fade', speed_ms: 2500 } },
  { type: 'text', label: 'Texte', icon: AlignLeft, category: 'base', defaultContent: { html: '<p>Votre texte ici...</p>' } },
  { type: 'image', label: 'Image', icon: ImageIcon, category: 'base', defaultContent: { url: '', alt: '', caption: '' } },
  { type: 'gallery', label: 'Galerie', icon: Images, category: 'base', defaultContent: { images: [] } },
  { type: 'button', label: 'Bouton', icon: MousePointerClick, category: 'base', defaultContent: { label: 'Cliquez ici', link: '#', variant: 'primary' } },
  // Contenu
  { type: 'image_text', label: 'Image + Texte', icon: Columns2, category: 'contenu', defaultContent: { image_url: '', title: 'Titre', text: 'Description', image_side: 'left' } },
  { type: 'cta', label: 'Appel a l\'action', icon: Megaphone, category: 'contenu', defaultContent: { title: 'Une question ?', subtitle: 'Contactez-nous', button_label: 'En savoir plus', button_link: '' } },
  { type: 'blockquote', label: 'Citation', icon: Quote, category: 'contenu', defaultContent: { quote: 'Une citation inspirante.', author: 'Auteur', author_role: '', style: 'border' } },
  { type: 'price_list', label: 'Liste de prix', icon: ListChecks, category: 'contenu', defaultContent: { items: [{ title: 'Service A', description: 'Description', price: '50 €' }] } },
  { type: 'progress', label: 'Progression', icon: BarChart3, category: 'contenu', defaultContent: { items: [{ label: 'Competence', value: 80 }], display: 'bar', show_value: true } },
  // Interactif
  { type: 'faq', label: 'FAQ', icon: HelpCircle, category: 'interactif', defaultContent: { items: [{ question: 'Question ?', answer: 'Reponse...' }] } },
  { type: 'accordion', label: 'Accordeon', icon: HelpCircle, category: 'interactif', defaultContent: { items: [{ title: 'Section 1', content: '<p>Contenu...</p>' }], allow_multiple: false, default_open: 0 } },
  { type: 'flip_box', label: 'Carte retournable', icon: RotateCw, category: 'interactif', defaultContent: { items: [{ front_title: 'Recto', front_subtitle: 'Survolez', front_icon: '★', back_title: 'Verso', back_text: 'Contenu cache' }], columns: 3, trigger: 'hover' } },
  { type: 'social_icons', label: 'Reseaux sociaux', icon: Share2, category: 'interactif', defaultContent: { items: [{ platform: 'instagram', url: 'https://instagram.com/' }], size: 'md', shape: 'circle', style: 'filled', align: 'center' } },
  // Mise en page
  { type: 'separator', label: 'Separateur', icon: Minus, category: 'mise_en_page', defaultContent: {} },
  { type: 'spacer', label: 'Espaceur', icon: MoveVertical, category: 'mise_en_page', defaultContent: { height: 40 } },
];

const CATEGORY_LABELS: Record<'base' | 'contenu' | 'interactif' | 'mise_en_page', string> = {
  base: 'Base',
  contenu: 'Contenu',
  interactif: 'Interactif',
  mise_en_page: 'Mise en page',
};

// ─── Page ─────────────────────────────────────────────────────────────────

export function ExhibitorCmsEditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [exhibitor, setExhibitor] = useState<ExhibitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const showSaved = () => { setSavedToast(true); setTimeout(() => setSavedToast(false), 1500); };

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const load = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    const [pageRes, profRes] = await Promise.all([
      api.get<CmsPage>(`/cms/pages/${pageId}`),
      api.get<ExhibitorProfile>('/exhibitors/profile'),
    ]);
    if (pageRes.success && pageRes.data) {
      const data = pageRes.data as CmsPage;
      setPage(data);
      setTitleDraft(data.title || '');
    }
    if (profRes.success && profRes.data) setExhibitor(profRes.data as ExhibitorProfile);
    setLoading(false);
  }, [pageId]);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const saveMeta = async () => {
    if (!page) return;
    setSavingMeta(true);
    await api.put(`/cms/pages/${page.id}`, { title: titleDraft });
    setSavingMeta(false);
    showSaved();
    setPage({ ...page, title: titleDraft });
  };

  const togglePublish = async () => {
    if (!page) return;
    const next = page.is_published ? 0 : 1;
    await api.put(`/cms/pages/${page.id}`, { is_published: next });
    setPage({ ...page, is_published: next });
    showSaved();
  };

  const addBlock = async (type: SupportedBlock) => {
    if (!page) return;
    const template = BLOCK_TEMPLATES.find((t) => t.type === type);
    const sortOrder = page.blocks.length;
    const res = await api.post<CmsBlock>(`/cms/pages/${page.id}/blocks`, {
      block_type: type,
      content: template?.defaultContent || {},
      settings: {},
      sort_order: sortOrder,
      is_visible: true,
    });
    if (res.success && res.data) {
      setPage({ ...page, blocks: [...page.blocks, res.data as CmsBlock] });
      setEditingBlockId((res.data as CmsBlock).id);
    }
    setShowAddMenu(false);
  };

  const updateBlockSettings = async (blockId: string, settings: Record<string, unknown>) => {
    if (!page) return;
    setPage({ ...page, blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, settings } : b)) });
    await api.put(`/cms/blocks/${blockId}`, { settings });
    showSaved();
  };

  const updateBlockContent = async (blockId: string, content: Record<string, unknown>) => {
    if (!page) return;
    setPage({ ...page, blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, content } : b)) });
    await api.put(`/cms/blocks/${blockId}`, { content });
    showSaved();
  };

  const toggleVisibility = async (block: CmsBlock) => {
    if (!page) return;
    const next = block.is_visible ? 0 : 1;
    setPage({ ...page, blocks: page.blocks.map((b) => (b.id === block.id ? { ...b, is_visible: next } : b)) });
    await api.put(`/cms/blocks/${block.id}`, { is_visible: !block.is_visible });
  };

  const deleteBlock = async (blockId: string) => {
    if (!page) return;
    if (!confirm('Supprimer ce bloc ?')) return;
    setPage({ ...page, blocks: page.blocks.filter((b) => b.id !== blockId) });
    await api.delete(`/cms/blocks/${blockId}`);
  };

  const moveBlock = async (index: number, dir: -1 | 1) => {
    if (!page) return;
    const target = index + dir;
    if (target < 0 || target >= page.blocks.length) return;
    const next = [...page.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((b, i) => ({ ...b, sort_order: i }));
    setPage({ ...page, blocks: reordered });
    await api.put(`/cms/pages/${page.id}/blocks/reorder`, { block_ids: reordered.map((b) => b.id) });
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!page) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p>Page introuvable</p></div>;

  // Ownership check (basic — server enforces too)
  if (exhibitor && page.exhibitor_id && page.exhibitor_id !== exhibitor.id) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p className="text-destructive">Vous n'avez pas acces a cette page.</p></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/exhibitor" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveMeta}
              className="w-full bg-transparent text-xl font-bold tracking-tight text-foreground focus:outline-none"
              placeholder="Titre de la page"
            />
            <p className="text-xs text-muted-foreground">
              /{page.slug} • {page.blocks.length} bloc{page.blocks.length > 1 ? 's' : ''}
              {savedToast && <span className="ml-2 text-green-600">✓ Enregistre</span>}
              {savingMeta && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exhibitor?.slug && (
            <a
              href={`/e/${exhibitor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Apercu
            </a>
          )}
          <button
            type="button"
            onClick={togglePublish}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${
              page.is_published
                ? 'border border-border bg-card text-foreground hover:bg-accent'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {page.is_published ? <><EyeOff className="h-3.5 w-3.5" /> Depublier</> : <><Eye className="h-3.5 w-3.5" /> Publier</>}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* Left: block list + editor */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Blocs</h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Ajouter
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                    {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => {
                      const inCat = BLOCK_TEMPLATES.filter((t) => t.category === cat);
                      if (inCat.length === 0) return null;
                      return (
                        <div key={cat}>
                          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                            {CATEGORY_LABELS[cat]}
                          </p>
                          {inCat.map((t) => {
                            const Icon = t.icon;
                            return (
                              <button
                                key={t.type}
                                type="button"
                                onClick={() => addBlock(t.type)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                              >
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {page.blocks.map((block, idx) => {
                const meta = BLOCK_TEMPLATES.find((t) => t.type === block.block_type);
                const Icon = meta?.icon || AlignLeft;
                const isActive = editingBlockId === block.id;
                return (
                  <li key={block.id}>
                    <div className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                      <button type="button" onClick={() => setEditingBlockId(block.id)} className="flex flex-1 items-center gap-2 text-left">
                        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className={`flex-1 truncate text-xs font-medium ${block.is_visible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {meta?.label || block.block_type}
                        </span>
                      </button>
                      <button type="button" onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => moveBlock(idx, 1)} disabled={idx === page.blocks.length - 1} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => toggleVisibility(block)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                        {block.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </button>
                      <button type="button" onClick={() => deleteBlock(block.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
              {page.blocks.length === 0 && (
                <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Aucun bloc. Ajoutez-en un pour commencer.
                </li>
              )}
            </ul>
          </div>

          {/* Inline content editor */}
          {editingBlockId && (() => {
            const block = page.blocks.find((b) => b.id === editingBlockId);
            if (!block) return null;
            return (
              <BlockContentEditor
                key={block.id}
                block={block}
                onContentChange={(c) => updateBlockContent(block.id, c)}
                onSettingsChange={(s) => updateBlockSettings(block.id, s)}
              />
            );
          })()}
        </aside>

        {/* Right: preview */}
        <main className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
            Apercu
          </div>
          <div className="overflow-x-hidden">
            {page.blocks
              .filter((b) => b.is_visible !== 0)
              .map((block) => (
                <div
                  key={block.id}
                  onClick={() => setEditingBlockId(block.id)}
                  className={`cursor-pointer transition-colors ${editingBlockId === block.id ? 'ring-2 ring-primary/40' : ''}`}
                >
                  <BlockRenderer block={block as any} />
                </div>
              ))}
            {page.blocks.length === 0 && (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                Votre page est vide. Cliquez sur "Ajouter" pour creer votre premier bloc.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Per-block content + style editor ────────────────────────────────────

const INPUT_CLS = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';
const FIELD_LABEL = (text: string) => <label className="mb-1 block text-xs font-medium text-foreground">{text}</label>;

function BlockContentEditor({
  block,
  onContentChange,
  onSettingsChange,
}: {
  block: CmsBlock;
  onContentChange: (content: Record<string, unknown>) => void;
  onSettingsChange: (settings: Record<string, unknown>) => void;
}) {
  const [tab, setTab] = useState<'content' | 'style'>('content');
  const setField = (key: string, value: unknown) => onContentChange({ ...block.content, [key]: value });

  const currentStyle = ((block.settings || {}) as { style?: BlockStyle }).style || {};
  const setStyle = (key: keyof BlockStyle, value: unknown) => {
    const nextStyle = { ...currentStyle, [key]: value } as BlockStyle;
    onSettingsChange({ ...(block.settings || {}), style: nextStyle });
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Tab header */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab('content')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
            tab === 'content' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3 w-3" /> Contenu
        </button>
        <button
          type="button"
          onClick={() => setTab('style')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
            tab === 'style' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="h-3 w-3" /> Style
        </button>
      </div>

      <div className="p-4">
        {tab === 'content' ? (
          <ContentFields block={block} setField={setField} setContent={onContentChange} />
        ) : (
          <StyleEditor style={currentStyle} setStyle={setStyle} />
        )}
      </div>
    </div>
  );
}

// ─── Content fields per block type ──────────────────────────────────────

function ContentFields({
  block,
  setField,
  setContent,
}: {
  block: CmsBlock;
  setField: (k: string, v: unknown) => void;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const inputCls = INPUT_CLS;
  const label = FIELD_LABEL;

  switch (block.block_type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
          <div>{label('Sous-titre')}<input type="text" value={(block.content.subtitle as string) || ''} onChange={(e) => setField('subtitle', e.target.value)} className={inputCls} /></div>
          <div>{label('Image de fond (URL)')}<input type="url" value={(block.content.background_image_url as string) || (block.content.image_url as string) || ''} onChange={(e) => setField('background_image_url', e.target.value)} className={inputCls} placeholder="https://..." /></div>
          <div>{label('Texte du bouton')}<input type="text" value={(block.content.cta_label as string) || ''} onChange={(e) => setField('cta_label', e.target.value)} className={inputCls} /></div>
          <div>{label('Lien du bouton')}<input type="text" value={(block.content.cta_url as string) || (block.content.cta_link as string) || ''} onChange={(e) => setField('cta_url', e.target.value)} className={inputCls} /></div>
        </div>
      );

    case 'heading':
      return (
        <div className="space-y-3">
          <div>{label('Texte')}<input type="text" value={(block.content.text as string) || ''} onChange={(e) => setField('text', e.target.value)} className={inputCls} /></div>
          <div>{label('Sous-titre')}<input type="text" value={(block.content.subtitle as string) || ''} onChange={(e) => setField('subtitle', e.target.value)} className={inputCls} /></div>
          <div>{label('Niveau')}
            <select value={(block.content.level as string) || 'h2'} onChange={(e) => setField('level', e.target.value)} className={inputCls}>
              <option value="h1">H1 — Tres grand</option>
              <option value="h2">H2 — Grand</option>
              <option value="h3">H3 — Moyen</option>
              <option value="h4">H4 — Petit</option>
            </select>
          </div>
          <div>{label('Alignement')}
            <select value={(block.content.align as string) || 'center'} onChange={(e) => setField('align', e.target.value)} className={inputCls}>
              <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
            </select>
          </div>
          <div>{label('Mot a mettre en avant (optionnel)')}<input type="text" value={(block.content.highlight_word as string) || ''} onChange={(e) => setField('highlight_word', e.target.value)} className={inputCls} /></div>
        </div>
      );

    case 'animated_heading':
      return (
        <div className="space-y-3">
          <div>{label('Texte avant')}<input type="text" value={(block.content.before_text as string) || ''} onChange={(e) => setField('before_text', e.target.value)} className={inputCls} placeholder="Je suis" /></div>
          <div>{label('Mots qui defilent (un par ligne)')}<textarea
            value={Array.isArray(block.content.rotating_words) ? (block.content.rotating_words as string[]).join('\n') : ''}
            onChange={(e) => setField('rotating_words', e.target.value.split('\n').filter(Boolean))}
            rows={4} className={`${inputCls} resize-y`} placeholder={'créatif\npassionné\ninnovant'}
          /></div>
          <div>{label('Texte apres')}<input type="text" value={(block.content.after_text as string) || ''} onChange={(e) => setField('after_text', e.target.value)} className={inputCls} /></div>
          <div>{label('Animation')}
            <select value={(block.content.animation as string) || 'fade'} onChange={(e) => setField('animation', e.target.value)} className={inputCls}>
              <option value="fade">Fondu</option><option value="slide">Glisser</option><option value="typing">Frappe</option>
            </select>
          </div>
          <div>{label('Vitesse (ms entre mots)')}<input type="number" min="500" step="100" value={(block.content.speed_ms as number) || 2500} onChange={(e) => setField('speed_ms', parseInt(e.target.value, 10) || 2500)} className={inputCls} /></div>
        </div>
      );

    case 'text':
      return (
        <div>
          {label('Contenu HTML')}
          <textarea
            value={(block.content.html as string) || (block.content.body as string) || ''}
            onChange={(e) => setField('html', e.target.value)}
            rows={10} className={`${inputCls} resize-y font-mono text-xs`} placeholder="<p>Votre texte...</p>"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">HTML simple : &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, &lt;ul&gt;...</p>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3">
          <div>{label("URL de l'image")}<input type="url" value={(block.content.image_url as string) || (block.content.url as string) || ''} onChange={(e) => setField('image_url', e.target.value)} className={inputCls} /></div>
          <div>{label('Texte alternatif')}<input type="text" value={(block.content.alt_text as string) || (block.content.alt as string) || ''} onChange={(e) => setField('alt_text', e.target.value)} className={inputCls} /></div>
          <div>{label('Legende')}<input type="text" value={(block.content.caption as string) || ''} onChange={(e) => setField('caption', e.target.value)} className={inputCls} /></div>
          <div>{label('Lien (optionnel)')}<input type="url" value={(block.content.link_url as string) || ''} onChange={(e) => setField('link_url', e.target.value)} className={inputCls} /></div>
        </div>
      );

    case 'gallery':
      return <GalleryEditor content={block.content} setField={setField} />;

    case 'image_text':
      return (
        <div className="space-y-3">
          <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
          <div>{label('Texte (HTML)')}<textarea value={(block.content.body as string) || (block.content.text as string) || ''} onChange={(e) => setField('body', e.target.value)} rows={4} className={`${inputCls} resize-y`} /></div>
          <div>{label("URL de l'image")}<input type="url" value={(block.content.image_url as string) || ''} onChange={(e) => setField('image_url', e.target.value)} className={inputCls} /></div>
          <div>{label("Cote de l'image")}
            <select value={(block.content.image_position as string) || (block.content.image_side as string) || 'left'} onChange={(e) => setField('image_position', e.target.value)} className={inputCls}>
              <option value="left">Gauche</option><option value="right">Droite</option>
            </select>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-3">
          <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
          <div>{label('Sous-titre')}<input type="text" value={(block.content.subtitle as string) || ''} onChange={(e) => setField('subtitle', e.target.value)} className={inputCls} /></div>
          <div>{label('Texte du bouton')}<input type="text" value={(block.content.button_label as string) || ''} onChange={(e) => setField('button_label', e.target.value)} className={inputCls} /></div>
          <div>{label('Lien du bouton')}<input type="text" value={(block.content.button_url as string) || (block.content.button_link as string) || ''} onChange={(e) => setField('button_url', e.target.value)} className={inputCls} /></div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-3">
          <div>{label('Texte')}<input type="text" value={(block.content.label as string) || ''} onChange={(e) => setField('label', e.target.value)} className={inputCls} /></div>
          <div>{label('Lien')}<input type="text" value={(block.content.url as string) || (block.content.link as string) || '#'} onChange={(e) => setField('url', e.target.value)} className={inputCls} /></div>
          <div>{label('Style')}
            <select value={(block.content.style as string) || (block.content.variant as string) || 'primary'} onChange={(e) => setField('style', e.target.value)} className={inputCls}>
              <option value="primary">Primaire</option><option value="secondary">Secondaire</option><option value="outline">Contour</option><option value="ghost">Discret</option>
            </select>
          </div>
        </div>
      );

    case 'blockquote':
      return (
        <div className="space-y-3">
          <div>{label('Citation')}<textarea value={(block.content.quote as string) || ''} onChange={(e) => setField('quote', e.target.value)} rows={3} className={`${inputCls} resize-y`} /></div>
          <div>{label('Auteur')}<input type="text" value={(block.content.author as string) || ''} onChange={(e) => setField('author', e.target.value)} className={inputCls} /></div>
          <div>{label('Role / titre')}<input type="text" value={(block.content.author_role as string) || ''} onChange={(e) => setField('author_role', e.target.value)} className={inputCls} /></div>
          <div>{label('Style')}
            <select value={(block.content.style as string) || 'border'} onChange={(e) => setField('style', e.target.value)} className={inputCls}>
              <option value="classic">Classique</option><option value="border">Bordure</option><option value="background">Fond colore</option>
            </select>
          </div>
        </div>
      );

    case 'social_icons':
      return <SocialIconsEditor content={block.content} setField={setField} setContent={setContent} />;

    case 'progress':
      return <ProgressEditor content={block.content} setField={setField} setContent={setContent} />;

    case 'accordion':
      return <AccordionEditor content={block.content} setField={setField} setContent={setContent} />;

    case 'faq':
      return <FaqEditor content={block.content} setField={setField} />;

    case 'flip_box':
      return <FlipBoxEditor content={block.content} setField={setField} setContent={setContent} />;

    case 'price_list':
      return <PriceListEditor content={block.content} setContent={setContent} />;

    case 'spacer':
      return <div>{label('Hauteur (px)')}<input type="number" min="0" value={(block.content.height as number) || 40} onChange={(e) => setField('height', parseInt(e.target.value, 10) || 0)} className={inputCls} /></div>;

    case 'separator':
      return <p className="text-xs text-muted-foreground">Aucun reglage de contenu. Personnalisez via l'onglet Style.</p>;

    default:
      return <p className="text-xs text-muted-foreground">Type de bloc non encore supporte par l'editeur ({block.block_type}). Modifiez-le via l'API ou contactez le support.</p>;
  }
}

// ─── Universal Style editor ────────────────────────────────────────────

function StyleEditor({ style, setStyle }: { style: BlockStyle; setStyle: (k: keyof BlockStyle, v: unknown) => void }) {
  const inputCls = INPUT_CLS;
  const numberCls = inputCls + ' w-20';

  return (
    <div className="space-y-5 text-sm">
      {/* Background */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Arriere-plan</h4>
        <div className="space-y-2">
          <select value={style.background_type ?? 'none'} onChange={(e) => setStyle('background_type', e.target.value)} className={inputCls}>
            <option value="none">Aucun</option>
            <option value="color">Couleur unie</option>
            <option value="gradient">Degrade</option>
            <option value="image">Image</option>
          </select>
          {style.background_type === 'color' && (
            <ColorInput label="Couleur" value={style.background_color || '#ffffff'} onChange={(v) => setStyle('background_color', v)} />
          )}
          {style.background_type === 'gradient' && (
            <>
              <ColorInput label="Couleur de depart" value={style.background_gradient_from || '#6366f1'} onChange={(v) => setStyle('background_gradient_from', v)} />
              <ColorInput label="Couleur d'arrivee" value={style.background_gradient_to || '#a855f7'} onChange={(v) => setStyle('background_gradient_to', v)} />
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Angle ({style.background_gradient_angle ?? 135}°)</label>
                <input type="range" min="0" max="360" value={style.background_gradient_angle ?? 135} onChange={(e) => setStyle('background_gradient_angle', parseInt(e.target.value, 10))} className="w-full" />
              </div>
            </>
          )}
          {style.background_type === 'image' && (
            <>
              <div>{FIELD_LABEL('URL de l\'image')}<input type="url" value={style.background_image_url || ''} onChange={(e) => setStyle('background_image_url', e.target.value)} className={inputCls} placeholder="https://..." /></div>
              <div>{FIELD_LABEL('Taille')}
                <select value={style.background_image_size || 'cover'} onChange={(e) => setStyle('background_image_size', e.target.value)} className={inputCls}>
                  <option value="cover">Couvrir</option><option value="contain">Contenir</option><option value="auto">Auto</option>
                </select>
              </div>
              <ColorInput label="Couleur de superposition" value={style.background_overlay_color || '#000000'} onChange={(v) => setStyle('background_overlay_color', v)} />
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Opacite ({(style.background_overlay_opacity ?? 0.4).toFixed(2)})</label>
                <input type="range" min="0" max="1" step="0.05" value={style.background_overlay_opacity ?? 0.4} onChange={(e) => setStyle('background_overlay_opacity', parseFloat(e.target.value))} className="w-full" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Typographie</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <ColorInput label="Couleur du texte" value={style.text_color || ''} onChange={(v) => setStyle('text_color', v)} allowEmpty />
          <ColorInput label="Couleur des titres" value={style.heading_color || ''} onChange={(v) => setStyle('heading_color', v)} allowEmpty />
          <div className="sm:col-span-2">{FIELD_LABEL('Police')}
            <select value={style.font_family || ''} onChange={(e) => setStyle('font_family', e.target.value || undefined)} className={inputCls}>
              <option value="">Par defaut</option>
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="'Playfair Display', Georgia, serif">Playfair Display</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier</option>
              <option value="system-ui, -apple-system, sans-serif">Systeme</option>
              <option value="'Comic Sans MS', cursive">Comic Sans</option>
            </select>
          </div>
          <div>{FIELD_LABEL('Taille (px)')}<input type="number" min="10" max="120" value={style.font_size_px || ''} onChange={(e) => setStyle('font_size_px', e.target.value ? parseInt(e.target.value, 10) : undefined)} className={inputCls} placeholder="auto" /></div>
          <div>{FIELD_LABEL('Graisse')}
            <select value={style.font_weight || ''} onChange={(e) => setStyle('font_weight', e.target.value || undefined)} className={inputCls}>
              <option value="">Par defaut</option>
              <option value="normal">Normal</option>
              <option value="medium">Moyen</option>
              <option value="semibold">Semi-gras</option>
              <option value="bold">Gras</option>
            </select>
          </div>
          <div>{FIELD_LABEL('Alignement')}
            <select value={style.text_align || ''} onChange={(e) => setStyle('text_align', e.target.value || undefined)} className={inputCls}>
              <option value="">Par defaut</option>
              <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option><option value="justify">Justifie</option>
            </select>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Marges interieures (px)</h4>
        <div className="grid grid-cols-4 gap-2">
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Haut</label><input type="number" min="0" value={style.padding_top ?? ''} onChange={(e) => setStyle('padding_top', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Droite</label><input type="number" min="0" value={style.padding_right ?? ''} onChange={(e) => setStyle('padding_right', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Bas</label><input type="number" min="0" value={style.padding_bottom ?? ''} onChange={(e) => setStyle('padding_bottom', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Gauche</label><input type="number" min="0" value={style.padding_left ?? ''} onChange={(e) => setStyle('padding_left', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
        </div>
        <h4 className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Marges exterieures (px)</h4>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Haut</label><input type="number" min="0" value={style.margin_top ?? ''} onChange={(e) => setStyle('margin_top', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
          <div><label className="mb-1 block text-[10px] text-muted-foreground">Bas</label><input type="number" min="0" value={style.margin_bottom ?? ''} onChange={(e) => setStyle('margin_bottom', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className={numberCls} /></div>
        </div>
      </section>

      {/* Border + radius + shadow */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cadre</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>{FIELD_LABEL('Epaisseur (px)')}<input type="number" min="0" max="20" value={style.border_width ?? 0} onChange={(e) => setStyle('border_width', parseInt(e.target.value, 10))} className={inputCls} /></div>
          <div>{FIELD_LABEL('Style')}
            <select value={style.border_style || 'solid'} onChange={(e) => setStyle('border_style', e.target.value)} className={inputCls}>
              <option value="solid">Plein</option><option value="dashed">Tirets</option><option value="dotted">Pointilles</option><option value="double">Double</option>
            </select>
          </div>
          <ColorInput label="Couleur" value={style.border_color || '#e5e7eb'} onChange={(v) => setStyle('border_color', v)} />
          <div>{FIELD_LABEL('Arrondi (px)')}<input type="number" min="0" max="60" value={style.border_radius ?? 0} onChange={(e) => setStyle('border_radius', parseInt(e.target.value, 10))} className={inputCls} /></div>
        </div>
        <div className="mt-2">{FIELD_LABEL('Ombre')}
          <select value={style.shadow || 'none'} onChange={(e) => setStyle('shadow', e.target.value)} className={inputCls}>
            <option value="none">Aucune</option>
            <option value="sm">Discrete</option>
            <option value="md">Moyenne</option>
            <option value="lg">Marquee</option>
            <option value="xl">Forte</option>
          </select>
        </div>
      </section>

      {/* Animation */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Animation</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>{FIELD_LABEL('Entree')}
            <select value={style.animation || 'none'} onChange={(e) => setStyle('animation', e.target.value)} className={inputCls}>
              <option value="none">Aucune</option>
              <option value="fade_in">Fondu</option>
              <option value="slide_up">Monter</option>
              <option value="slide_down">Descendre</option>
              <option value="zoom_in">Zoom</option>
            </select>
          </div>
          <div>{FIELD_LABEL('Delai (ms)')}<input type="number" min="0" max="3000" step="100" value={style.animation_delay_ms ?? 0} onChange={(e) => setStyle('animation_delay_ms', parseInt(e.target.value, 10))} className={inputCls} /></div>
        </div>
      </section>
    </div>
  );
}

function ColorInput({ label, value, onChange, allowEmpty }: { label: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 flex-shrink-0 cursor-pointer rounded border border-border bg-background" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={allowEmpty ? 'auto' : '#000000'} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono" />
      </div>
    </div>
  );
}

function GalleryEditor({ content, setField }: { content: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const images = Array.isArray(content.images) ? (content.images as { url: string; alt?: string }[]) : [];
  const update = (next: typeof images) => setField('images', next);

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-foreground">Images</label>
      {images.map((img, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="url"
            value={img.url}
            onChange={(e) => update(images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
            placeholder="URL de l'image"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => update(images.filter((_, j) => j !== i))} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => update([...images, { url: '', alt: '' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter une image
      </button>
    </div>
  );
}

function FaqEditor({ content, setField }: { content: Record<string, unknown>; setField: (k: string, v: unknown) => void }) {
  const items = Array.isArray(content.items) ? (content.items as { question: string; answer: string }[]) : [];
  const update = (next: typeof items) => setField('items', next);

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-foreground">Questions / reponses</label>
      {items.map((it, i) => (
        <div key={i} className="space-y-1 rounded-md border border-border p-2">
          <input
            type="text"
            value={it.question}
            placeholder="Question"
            onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <textarea
            value={it.answer}
            placeholder="Reponse"
            onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="text-xs text-destructive hover:underline">
            Supprimer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { question: '', answer: '' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    </div>
  );
}

// ─── Accordion editor ────────────────────────────────────────────────────

function AccordionEditor({
  content,
  setField,
  setContent,
}: {
  content: Record<string, unknown>;
  setField: (k: string, v: unknown) => void;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items) ? (content.items as { title: string; content: string }[]) : [];
  const update = (next: typeof items) => setContent({ ...content, items: next });

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Sections</span>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={!!content.allow_multiple}
            onChange={(e) => setField('allow_multiple', e.target.checked)}
          /> Ouverture multiple
        </label>
      </div>
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border p-2">
          <input
            type="text"
            value={it.title}
            placeholder="Titre de la section"
            onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <textarea
            value={it.content}
            placeholder="Contenu HTML"
            onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
          />
          <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="text-xs text-destructive hover:underline">
            Supprimer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { title: 'Nouvelle section', content: '<p>Contenu...</p>' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    </div>
  );
}

// ─── Social icons editor ─────────────────────────────────────────────────

const SOCIAL_PLATFORMS = ['facebook','instagram','twitter','youtube','tiktok','linkedin','discord','twitch','github','pinterest','website','email'];

function SocialIconsEditor({
  content,
  setField,
  setContent,
}: {
  content: Record<string, unknown>;
  setField: (k: string, v: unknown) => void;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items) ? (content.items as { platform: string; url: string }[]) : [];
  const update = (next: typeof items) => setContent({ ...content, items: next });
  const inputCls = INPUT_CLS;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>{FIELD_LABEL('Taille')}
          <select value={(content.size as string) || 'md'} onChange={(e) => setField('size', e.target.value)} className={inputCls}>
            <option value="sm">Petit</option><option value="md">Moyen</option><option value="lg">Grand</option>
          </select>
        </div>
        <div>{FIELD_LABEL('Forme')}
          <select value={(content.shape as string) || 'circle'} onChange={(e) => setField('shape', e.target.value)} className={inputCls}>
            <option value="square">Carre</option><option value="rounded">Arrondi</option><option value="circle">Rond</option>
          </select>
        </div>
        <div>{FIELD_LABEL('Style')}
          <select value={(content.style as string) || 'filled'} onChange={(e) => setField('style', e.target.value)} className={inputCls}>
            <option value="filled">Plein</option><option value="outline">Contour</option><option value="minimal">Minimal</option>
          </select>
        </div>
        <div>{FIELD_LABEL('Alignement')}
          <select value={(content.align as string) || 'center'} onChange={(e) => setField('align', e.target.value)} className={inputCls}>
            <option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-medium text-foreground">Reseaux</span>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={it.platform}
              onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            >
              {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="url"
              value={it.url}
              onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              placeholder="https://..."
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            />
            <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => update([...items, { platform: 'instagram', url: 'https://' }])} className="mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-3 w-3" /> Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Progress editor ─────────────────────────────────────────────────────

function ProgressEditor({
  content,
  setField,
  setContent,
}: {
  content: Record<string, unknown>;
  setField: (k: string, v: unknown) => void;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items) ? (content.items as { label: string; value: number; color?: string }[]) : [];
  const update = (next: typeof items) => setContent({ ...content, items: next });

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>{FIELD_LABEL('Affichage')}
          <select value={(content.display as string) || 'bar'} onChange={(e) => setField('display', e.target.value)} className={INPUT_CLS}>
            <option value="bar">Barre</option><option value="circle">Cercle</option>
          </select>
        </div>
        <label className="mt-5 flex items-center gap-1 text-xs">
          <input type="checkbox" checked={content.show_value !== false} onChange={(e) => setField('show_value', e.target.checked)} />
          Afficher la valeur
        </label>
      </div>
      {items.map((it, i) => (
        <div key={i} className="space-y-1 rounded-md border border-border p-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={it.label}
              placeholder="Libelle"
              onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min="0" max="100"
              value={it.value}
              onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, value: parseInt(e.target.value, 10) || 0 } : x)))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
            <input
              type="color"
              value={it.color || '#6366f1'}
              onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))}
              className="h-8 w-8 cursor-pointer rounded border border-border"
            />
            <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { label: 'Nouvelle competence', value: 50, color: '#6366f1' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    </div>
  );
}

// ─── Flip box editor ─────────────────────────────────────────────────────

function FlipBoxEditor({
  content,
  setField,
  setContent,
}: {
  content: Record<string, unknown>;
  setField: (k: string, v: unknown) => void;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items)
    ? (content.items as { front_title: string; front_subtitle?: string; front_icon?: string; front_image_url?: string; back_title: string; back_text: string; back_button_label?: string; back_button_url?: string }[])
    : [];
  const update = (next: typeof items) => setContent({ ...content, items: next });

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>{FIELD_LABEL('Colonnes')}
          <select value={String(content.columns ?? 3)} onChange={(e) => setField('columns', parseInt(e.target.value, 10))} className={INPUT_CLS}>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
          </select>
        </div>
        <div>{FIELD_LABEL('Declencheur')}
          <select value={(content.trigger as string) || 'hover'} onChange={(e) => setField('trigger', e.target.value)} className={INPUT_CLS}>
            <option value="hover">Survol</option><option value="click">Clic</option>
          </select>
        </div>
      </div>
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-md border border-border p-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Carte {i + 1}</p>
          <input type="text" value={it.front_title} placeholder="Titre recto" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, front_title: e.target.value } : x)))} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <input type="text" value={it.front_subtitle || ''} placeholder="Sous-titre recto" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, front_subtitle: e.target.value } : x)))} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={it.front_icon || ''} placeholder="Icone (emoji)" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, front_icon: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            <input type="url" value={it.front_image_url || ''} placeholder="OU image URL" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, front_image_url: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <input type="text" value={it.back_title} placeholder="Titre verso" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, back_title: e.target.value } : x)))} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <textarea value={it.back_text} placeholder="Texte verso" rows={2} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, back_text: e.target.value } : x)))} className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={it.back_button_label || ''} placeholder="Bouton (texte)" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, back_button_label: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            <input type="text" value={it.back_button_url || ''} placeholder="Bouton (lien)" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, back_button_url: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="text-xs text-destructive hover:underline">
            Supprimer
          </button>
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { front_title: 'Nouvelle carte', front_subtitle: '', front_icon: '★', back_title: 'Verso', back_text: '' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    </div>
  );
}

// ─── Price list editor ───────────────────────────────────────────────────

function PriceListEditor({
  content,
  setContent,
}: {
  content: Record<string, unknown>;
  setContent: (c: Record<string, unknown>) => void;
}) {
  const items = Array.isArray(content.items)
    ? (content.items as { title: string; description?: string; price: string; image_url?: string; link_url?: string }[])
    : [];
  const update = (next: typeof items) => setContent({ ...content, items: next });

  return (
    <div className="space-y-3 text-sm">
      {items.map((it, i) => (
        <div key={i} className="space-y-1 rounded-md border border-border p-2">
          <div className="flex items-center gap-2">
            <input type="text" value={it.title} placeholder="Nom" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            <input type="text" value={it.price} placeholder="Prix" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => update(items.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <textarea value={it.description || ''} placeholder="Description" rows={2} onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input type="url" value={it.image_url || ''} placeholder="Image URL" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, image_url: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
            <input type="url" value={it.link_url || ''} placeholder="Lien" onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, link_url: e.target.value } : x)))} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => update([...items, { title: 'Nouvel article', description: '', price: '0 €' }])} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
        <Plus className="h-3 w-3" /> Ajouter
      </button>
    </div>
  );
}
