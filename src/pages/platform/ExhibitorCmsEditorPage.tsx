/**
 * Exhibitor CMS page editor.
 *
 * Lighter than the festival CMS editor — supports the block types most relevant
 * to an exhibitor vitrine: hero, text, image, gallery, image_text, cta, button,
 * faq, separator, spacer. All edits use the generic /cms/pages/:id and
 * /cms/blocks/:id endpoints which work regardless of page owner.
 *
 * The right-side preview reuses BlockRenderer so the WYSIWYG is consistent
 * with the public render.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Save, ExternalLink, Type, AlignLeft, ImageIcon, Images, Megaphone,
  MousePointerClick, Minus, MoveVertical, Columns2, HelpCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';

// ─── Types ──────────────────────────────────────────────────────────────────

type SupportedBlock = 'hero' | 'text' | 'image' | 'gallery' | 'image_text' | 'cta' | 'button' | 'faq' | 'separator' | 'spacer';

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

const BLOCK_TEMPLATES: { type: SupportedBlock; label: string; icon: typeof Type; defaultContent: Record<string, unknown> }[] = [
  { type: 'hero', label: 'Banniere', icon: Type, defaultContent: { title: 'Titre principal', subtitle: 'Sous-titre', image_url: '' } },
  { type: 'text', label: 'Texte', icon: AlignLeft, defaultContent: { html: '<p>Votre texte ici...</p>' } },
  { type: 'image', label: 'Image', icon: ImageIcon, defaultContent: { url: '', alt: '', caption: '' } },
  { type: 'gallery', label: 'Galerie', icon: Images, defaultContent: { images: [] } },
  { type: 'image_text', label: 'Image + Texte', icon: Columns2, defaultContent: { image_url: '', title: 'Titre', text: 'Description', image_side: 'left' } },
  { type: 'cta', label: 'Appel a l\'action', icon: Megaphone, defaultContent: { title: 'Une question ?', subtitle: 'Contactez-nous', button_label: 'En savoir plus', button_link: '' } },
  { type: 'button', label: 'Bouton', icon: MousePointerClick, defaultContent: { label: 'Cliquez ici', link: '#', variant: 'primary' } },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, defaultContent: { items: [{ question: 'Question ?', answer: 'Reponse...' }] } },
  { type: 'separator', label: 'Separateur', icon: Minus, defaultContent: {} },
  { type: 'spacer', label: 'Espaceur', icon: MoveVertical, defaultContent: { height: 40 } },
];

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
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-card shadow-lg">
                    {BLOCK_TEMPLATES.map((t) => {
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
            return <BlockContentEditor key={block.id} block={block} onChange={(c) => updateBlockContent(block.id, c)} />;
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

// ─── Per-block content editor ────────────────────────────────────────────

function BlockContentEditor({ block, onChange }: { block: CmsBlock; onChange: (content: Record<string, unknown>) => void }) {
  const setField = (key: string, value: unknown) => onChange({ ...block.content, [key]: value });

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';
  const label = (text: string) => <label className="mb-1 block text-xs font-medium text-foreground">{text}</label>;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edition du bloc</h3>
      <div className="space-y-3">
        {block.block_type === 'hero' && (
          <>
            <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
            <div>{label('Sous-titre')}<input type="text" value={(block.content.subtitle as string) || ''} onChange={(e) => setField('subtitle', e.target.value)} className={inputCls} /></div>
            <div>{label('Image de fond (URL)')}<input type="url" value={(block.content.image_url as string) || ''} onChange={(e) => setField('image_url', e.target.value)} className={inputCls} placeholder="https://..." /></div>
            <div>{label('Texte du bouton')}<input type="text" value={(block.content.cta_label as string) || ''} onChange={(e) => setField('cta_label', e.target.value)} className={inputCls} /></div>
            <div>{label('Lien du bouton')}<input type="text" value={(block.content.cta_link as string) || ''} onChange={(e) => setField('cta_link', e.target.value)} className={inputCls} /></div>
          </>
        )}

        {block.block_type === 'text' && (
          <div>
            {label('Contenu HTML')}
            <textarea
              value={(block.content.html as string) || ''}
              onChange={(e) => setField('html', e.target.value)}
              rows={10}
              className={`${inputCls} resize-y font-mono text-xs`}
              placeholder="<p>Votre texte...</p>"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">HTML simple : &lt;p&gt;, &lt;h2&gt;, &lt;strong&gt;, &lt;ul&gt;...</p>
          </div>
        )}

        {block.block_type === 'image' && (
          <>
            <div>{label('URL de l\'image')}<input type="url" value={(block.content.url as string) || ''} onChange={(e) => setField('url', e.target.value)} className={inputCls} /></div>
            <div>{label('Texte alternatif')}<input type="text" value={(block.content.alt as string) || ''} onChange={(e) => setField('alt', e.target.value)} className={inputCls} /></div>
            <div>{label('Legende')}<input type="text" value={(block.content.caption as string) || ''} onChange={(e) => setField('caption', e.target.value)} className={inputCls} /></div>
          </>
        )}

        {block.block_type === 'gallery' && (
          <GalleryEditor content={block.content} setField={setField} />
        )}

        {block.block_type === 'image_text' && (
          <>
            <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
            <div>{label('Texte')}<textarea value={(block.content.text as string) || ''} onChange={(e) => setField('text', e.target.value)} rows={4} className={`${inputCls} resize-y`} /></div>
            <div>{label('URL de l\'image')}<input type="url" value={(block.content.image_url as string) || ''} onChange={(e) => setField('image_url', e.target.value)} className={inputCls} /></div>
            <div>{label('Cote de l\'image')}
              <select value={(block.content.image_side as string) || 'left'} onChange={(e) => setField('image_side', e.target.value)} className={inputCls}>
                <option value="left">Gauche</option>
                <option value="right">Droite</option>
              </select>
            </div>
          </>
        )}

        {block.block_type === 'cta' && (
          <>
            <div>{label('Titre')}<input type="text" value={(block.content.title as string) || ''} onChange={(e) => setField('title', e.target.value)} className={inputCls} /></div>
            <div>{label('Sous-titre')}<input type="text" value={(block.content.subtitle as string) || ''} onChange={(e) => setField('subtitle', e.target.value)} className={inputCls} /></div>
            <div>{label('Texte du bouton')}<input type="text" value={(block.content.button_label as string) || ''} onChange={(e) => setField('button_label', e.target.value)} className={inputCls} /></div>
            <div>{label('Lien du bouton')}<input type="text" value={(block.content.button_link as string) || ''} onChange={(e) => setField('button_link', e.target.value)} className={inputCls} /></div>
          </>
        )}

        {block.block_type === 'button' && (
          <>
            <div>{label('Texte')}<input type="text" value={(block.content.label as string) || ''} onChange={(e) => setField('label', e.target.value)} className={inputCls} /></div>
            <div>{label('Lien')}<input type="text" value={(block.content.link as string) || ''} onChange={(e) => setField('link', e.target.value)} className={inputCls} /></div>
            <div>{label('Style')}
              <select value={(block.content.variant as string) || 'primary'} onChange={(e) => setField('variant', e.target.value)} className={inputCls}>
                <option value="primary">Primaire</option>
                <option value="secondary">Secondaire</option>
                <option value="outline">Contour</option>
              </select>
            </div>
          </>
        )}

        {block.block_type === 'faq' && (
          <FaqEditor content={block.content} setField={setField} />
        )}

        {block.block_type === 'spacer' && (
          <div>{label('Hauteur (px)')}<input type="number" min="0" value={(block.content.height as number) || 40} onChange={(e) => setField('height', parseInt(e.target.value, 10) || 0)} className={inputCls} /></div>
        )}

        {block.block_type === 'separator' && (
          <p className="text-xs text-muted-foreground">Aucun reglage pour ce bloc.</p>
        )}
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
