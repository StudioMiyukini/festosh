import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ChevronRight,
  Check,
  Type,
  AlignLeft,
  ImageIcon,
  Images,
  Play,
  MapPin,
  Calendar,
  Store,
  Mail,
  HelpCircle,
  Clock,
  Code,
  GripVertical,
  X,
  Columns2,
  Megaphone,
  Quote,
  CreditCard,
  BoxSelect,
  Users,
  BarChart3,
  Minus,
  MoveVertical,
  Bell,
  PanelTop,
  CircleDot,
  MousePointerClick,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useTenantStore } from '@/stores/tenant-store';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';
import type { CmsPage, CmsBlock } from '@/types/cms';
import type { BlockType } from '@/types/enums';

// ---------------------------------------------------------------------------
// Block type metadata
// ---------------------------------------------------------------------------

interface BlockMetaItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'base' | 'mise_en_page' | 'contenu' | 'dynamique';
}

const BLOCK_META: Record<BlockType, BlockMetaItem> = {
  // Base
  hero: { label: 'Banniere', icon: Type, category: 'base' },
  text: { label: 'Texte', icon: AlignLeft, category: 'base' },
  image: { label: 'Image', icon: ImageIcon, category: 'base' },
  gallery: { label: 'Galerie', icon: Images, category: 'base' },
  video: { label: 'Video', icon: Play, category: 'base' },
  button: { label: 'Bouton', icon: MousePointerClick, category: 'base' },
  // Mise en page
  image_text: { label: 'Image + Texte', icon: Columns2, category: 'mise_en_page' },
  icon_box: { label: 'Boites icones', icon: BoxSelect, category: 'mise_en_page' },
  cta: { label: 'Appel a l\'action', icon: Megaphone, category: 'mise_en_page' },
  tabs: { label: 'Onglets', icon: PanelTop, category: 'mise_en_page' },
  separator: { label: 'Separateur', icon: Minus, category: 'mise_en_page' },
  spacer: { label: 'Espaceur', icon: MoveVertical, category: 'mise_en_page' },
  alert: { label: 'Alerte', icon: Bell, category: 'mise_en_page' },
  // Contenu
  testimonial: { label: 'Temoignages', icon: Quote, category: 'contenu' },
  team_member: { label: 'Equipe', icon: Users, category: 'contenu' },
  stats: { label: 'Chiffres cles', icon: BarChart3, category: 'contenu' },
  pricing_table: { label: 'Tarifs', icon: CreditCard, category: 'contenu' },
  logo_carousel: { label: 'Logos partenaires', icon: CircleDot, category: 'contenu' },
  faq: { label: 'FAQ', icon: HelpCircle, category: 'contenu' },
  countdown: { label: 'Compte a rebours', icon: Clock, category: 'contenu' },
  // Dynamique
  map: { label: 'Carte', icon: MapPin, category: 'dynamique' },
  schedule: { label: 'Programme', icon: Calendar, category: 'dynamique' },
  exhibitor_list: { label: 'Liste exposants', icon: Store, category: 'dynamique' },
  contact_form: { label: 'Formulaire contact', icon: Mail, category: 'dynamique' },
  custom_html: { label: 'HTML personnalise', icon: Code, category: 'dynamique' },
};

const BLOCK_CATEGORIES: { key: string; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'mise_en_page', label: 'Mise en page' },
  { key: 'contenu', label: 'Contenu' },
  { key: 'dynamique', label: 'Dynamique' },
];

const ALL_BLOCK_TYPES: BlockType[] = Object.keys(BLOCK_META) as BlockType[];

// ---------------------------------------------------------------------------
// Small reusable form helpers
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border"
      />
      {label}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Link Picker — select CMS page, internal route, or external URL
// ---------------------------------------------------------------------------

const INTERNAL_ROUTES = [
  { value: '/', label: 'Accueil' },
  { value: '/schedule', label: 'Programme' },
  { value: '/map', label: 'Plan' },
  { value: '/exhibitors', label: 'Exposants' },
  { value: '/apply', label: 'Candidature' },
];

function LinkPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const { festival } = useTenantStore();
  const festivalSlug = festival?.slug ?? '';

  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);

  // Detect current mode from existing value
  const detectMode = (v: string): 'page' | 'internal' | 'external' => {
    if (!v) return 'internal';
    if (v.startsWith('http://') || v.startsWith('https://')) return 'external';
    // Check if it matches a CMS page path like /f/slug/p/xxx
    if (v.includes('/p/')) return 'page';
    return 'internal';
  };

  const [mode, setMode] = useState<'page' | 'internal' | 'external'>(() => detectMode(value));

  useEffect(() => {
    if (!festival?.id) return;
    api.get<CmsPage[]>(`/cms/festival/${festival.id}/pages`).then((res) => {
      if (res.success && res.data) setCmsPages(Array.isArray(res.data) ? res.data : []);
      setPagesLoaded(true);
    });
  }, [festival?.id]);

  // Extract the selected target from the full URL value
  const getSelectedPage = (): string => {
    // value might be "/f/slug/p/a-propos" → extract "a-propos"
    const match = value.match(/\/p\/(.+)$/);
    return match ? match[1] : '';
  };

  const getSelectedRoute = (): string => {
    // value might be "/f/slug/schedule" → extract "/schedule"
    if (!value) return '/';
    const prefix = `/f/${festivalSlug}`;
    if (value === prefix || value === prefix + '/') return '/';
    if (value.startsWith(prefix + '/')) return '/' + value.slice(prefix.length + 1);
    // Might already be a short form like "/schedule"
    return value;
  };

  const handleModeChange = (newMode: 'page' | 'internal' | 'external') => {
    setMode(newMode);
    if (newMode === 'internal') {
      onChange(`/f/${festivalSlug}/schedule`);
    } else if (newMode === 'page') {
      const first = cmsPages[0];
      if (first) onChange(`/f/${festivalSlug}/p/${first.slug}`);
      else onChange('');
    } else {
      onChange('https://');
    }
  };

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex flex-col gap-2">
        {/* Mode selector */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('internal')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === 'internal'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Route interne
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('page')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === 'page'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Page CMS
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('external')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              mode === 'external'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            URL externe
          </button>
        </div>

        {/* Value input */}
        {mode === 'internal' && (
          <select
            value={getSelectedRoute()}
            onChange={(e) => {
              const route = e.target.value;
              onChange(route === '/' ? `/f/${festivalSlug}` : `/f/${festivalSlug}${route}`);
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {INTERNAL_ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} ({r.value})
              </option>
            ))}
          </select>
        )}

        {mode === 'page' && (
          <select
            value={getSelectedPage()}
            onChange={(e) => onChange(`/f/${festivalSlug}/p/${e.target.value}`)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {!pagesLoaded && <option value="">Chargement...</option>}
            {cmsPages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.title} (/{p.slug})
              </option>
            ))}
          </select>
        )}

        {mode === 'external' && (
          <TextInput
            value={value}
            onChange={onChange}
            placeholder="https://example.com"
          />
        )}

        {/* Preview of the generated URL */}
        <p className="text-xs text-muted-foreground truncate">
          → {value || '(aucun lien)'}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-block-type inline forms
// ---------------------------------------------------------------------------

interface BlockFormProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

function HeroForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: string) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Titre</FieldLabel>
        <TextInput value={c.title ?? ''} onChange={(v) => set('title', v)} placeholder="Titre principal" />
      </div>
      <div>
        <FieldLabel>Sous-titre</FieldLabel>
        <TextInput value={c.subtitle ?? ''} onChange={(v) => set('subtitle', v)} placeholder="Sous-titre" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>URL image de fond</FieldLabel>
        <TextInput value={c.background_image_url ?? ''} onChange={(v) => set('background_image_url', v)} placeholder="https://..." />
      </div>

      {/* CTA 1 — Primary */}
      <div className="sm:col-span-2 rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bouton principal</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Libelle</FieldLabel>
            <TextInput value={c.cta_label ?? ''} onChange={(v) => set('cta_label', v)} placeholder="Decouvrir" />
          </div>
          <div>
            <LinkPicker
              value={c.cta_url ?? ''}
              onChange={(v) => set('cta_url', v)}
              label="Lien"
            />
          </div>
        </div>
      </div>

      {/* CTA 2 — Secondary */}
      <div className="sm:col-span-2 rounded-md border border-dashed border-border p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bouton secondaire <span className="font-normal text-muted-foreground">(optionnel)</span></p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Libelle</FieldLabel>
            <TextInput value={c.cta2_label ?? ''} onChange={(v) => set('cta2_label', v)} placeholder="En savoir plus" />
          </div>
          <div>
            <LinkPicker
              value={c.cta2_url ?? ''}
              onChange={(v) => set('cta2_url', v)}
              label="Lien"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TextForm({ content, onChange }: BlockFormProps) {
  return (
    <div>
      <FieldLabel>Contenu</FieldLabel>
      <RichTextEditor
        value={(content.body as string) ?? ''}
        onChange={(v) => onChange({ ...content, body: v })}
        placeholder="Redigez votre texte ici..."
        minHeight={250}
      />
    </div>
  );
}

function ImageForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: string) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel>URL de l&apos;image</FieldLabel>
        <TextInput value={c.image_url ?? ''} onChange={(v) => set('image_url', v)} placeholder="https://..." />
      </div>
      <div>
        <FieldLabel>Texte alternatif</FieldLabel>
        <TextInput value={c.alt_text ?? ''} onChange={(v) => set('alt_text', v)} placeholder="Description de l'image" />
      </div>
      <div>
        <FieldLabel>Legende</FieldLabel>
        <TextInput value={c.caption ?? ''} onChange={(v) => set('caption', v)} placeholder="Legende optionnelle" />
      </div>
    </div>
  );
}

function GalleryForm({ content, onChange }: BlockFormProps) {
  const images = (content.images as Array<{ image_url: string; alt_text: string; caption: string }>) ?? [];

  const updateItem = (idx: number, key: string, val: string) => {
    const updated = images.map((img, i) => (i === idx ? { ...img, [key]: val } : img));
    onChange({ ...content, images: updated });
  };

  const addItem = () => {
    onChange({ ...content, images: [...images, { image_url: '', alt_text: '', caption: '' }] });
  };

  const removeItem = (idx: number) => {
    onChange({ ...content, images: images.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {images.map((img, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <div>
              <FieldLabel>URL image</FieldLabel>
              <TextInput value={img.image_url ?? ''} onChange={(v) => updateItem(idx, 'image_url', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Texte alt.</FieldLabel>
              <TextInput value={img.alt_text ?? ''} onChange={(v) => updateItem(idx, 'alt_text', v)} />
            </div>
            <div>
              <FieldLabel>Legende</FieldLabel>
              <TextInput value={img.caption ?? ''} onChange={(v) => updateItem(idx, 'caption', v)} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une image
      </button>
    </div>
  );
}

function VideoForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel>URL de la video</FieldLabel>
        <TextInput
          value={(content.video_url as string) ?? ''}
          onChange={(v) => onChange({ ...content, video_url: v })}
          placeholder="https://youtube.com/..."
        />
      </div>
      <div className="sm:col-span-2">
        <CheckboxField
          label="Lecture automatique"
          checked={(content.autoplay as boolean) ?? false}
          onChange={(v) => onChange({ ...content, autoplay: v })}
        />
      </div>
    </div>
  );
}

function MapForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Latitude</FieldLabel>
        <NumberInput
          value={content.latitude as number | undefined}
          onChange={(v) => onChange({ ...content, latitude: v })}
          step="any"
          placeholder="48.8566"
        />
      </div>
      <div>
        <FieldLabel>Longitude</FieldLabel>
        <NumberInput
          value={content.longitude as number | undefined}
          onChange={(v) => onChange({ ...content, longitude: v })}
          step="any"
          placeholder="2.3522"
        />
      </div>
      <div>
        <FieldLabel>Zoom</FieldLabel>
        <NumberInput
          value={content.zoom as number | undefined}
          onChange={(v) => onChange({ ...content, zoom: v })}
          placeholder="15"
        />
      </div>
      <div>
        <FieldLabel>Label du marqueur</FieldLabel>
        <TextInput
          value={(content.marker_label as string) ?? ''}
          onChange={(v) => onChange({ ...content, marker_label: v })}
          placeholder="Lieu du festival"
        />
      </div>
    </div>
  );
}

function ScheduleForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>ID de l&apos;edition</FieldLabel>
        <TextInput
          value={(content.edition_id as string) ?? ''}
          onChange={(v) => onChange({ ...content, edition_id: v })}
          placeholder="UUID de l'edition"
        />
      </div>
      <div>
        <FieldLabel>Mode d&apos;affichage</FieldLabel>
        <SelectField
          value={(content.display_mode as string) ?? 'timeline'}
          onChange={(v) => onChange({ ...content, display_mode: v })}
          options={[
            { value: 'timeline', label: 'Timeline' },
            { value: 'grid', label: 'Grille' },
            { value: 'list', label: 'Liste' },
          ]}
        />
      </div>
    </div>
  );
}

function ExhibitorListForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>ID de l&apos;edition</FieldLabel>
        <TextInput
          value={(content.edition_id as string) ?? ''}
          onChange={(v) => onChange({ ...content, edition_id: v })}
          placeholder="UUID de l'edition"
        />
      </div>
      <div>
        <FieldLabel>Mode d&apos;affichage</FieldLabel>
        <SelectField
          value={(content.display_mode as string) ?? 'grid'}
          onChange={(v) => onChange({ ...content, display_mode: v })}
          options={[
            { value: 'grid', label: 'Grille' },
            { value: 'list', label: 'Liste' },
          ]}
        />
      </div>
      <div className="sm:col-span-2">
        <CheckboxField
          label="Uniquement les exposants approuves"
          checked={(content.approved_only as boolean) ?? true}
          onChange={(v) => onChange({ ...content, approved_only: v })}
        />
      </div>
    </div>
  );
}

function ContactFormForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Email destinataire</FieldLabel>
        <TextInput
          value={(content.recipient_email as string) ?? ''}
          onChange={(v) => onChange({ ...content, recipient_email: v })}
          placeholder="contact@festival.com"
        />
      </div>
      <div>
        <FieldLabel>Message de succes</FieldLabel>
        <TextInput
          value={(content.success_message as string) ?? ''}
          onChange={(v) => onChange({ ...content, success_message: v })}
          placeholder="Merci pour votre message !"
        />
      </div>
    </div>
  );
}

function FaqForm({ content, onChange }: BlockFormProps) {
  const items = (content.items as Array<{ question: string; answer: string }>) ?? [];

  const updateItem = (idx: number, key: string, val: string) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: val } : item));
    onChange({ ...content, items: updated });
  };

  const addItem = () => {
    onChange({ ...content, items: [...items, { question: '', answer: '' }] });
  };

  const removeItem = (idx: number) => {
    onChange({ ...content, items: items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2">
            <div>
              <FieldLabel>Question {idx + 1}</FieldLabel>
              <TextInput value={item.question ?? ''} onChange={(v) => updateItem(idx, 'question', v)} placeholder="Votre question" />
            </div>
            <div>
              <FieldLabel>Reponse</FieldLabel>
              <RichTextEditor value={item.answer ?? ''} onChange={(v) => updateItem(idx, 'answer', v)} placeholder="La reponse..." minHeight={100} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une question
      </button>
    </div>
  );
}

function CountdownForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Date cible</FieldLabel>
        <input
          type="datetime-local"
          value={(content.target_date as string) ?? ''}
          onChange={(e) => onChange({ ...content, target_date: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div>
        <FieldLabel>Label</FieldLabel>
        <TextInput
          value={(content.label as string) ?? ''}
          onChange={(v) => onChange({ ...content, label: v })}
          placeholder="Ouverture dans..."
        />
      </div>
    </div>
  );
}

function CustomHtmlForm({ content, onChange }: BlockFormProps) {
  return (
    <div>
      <FieldLabel>Code HTML</FieldLabel>
      <TextArea
        value={(content.html as string) ?? ''}
        onChange={(v) => onChange({ ...content, html: v })}
        rows={10}
        mono
        placeholder="<div>...</div>"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// New block forms — Elementor-style
// ---------------------------------------------------------------------------

function ImageTextForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: string) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Position de l&apos;image</FieldLabel>
        <SelectField
          value={c.image_position ?? 'left'}
          onChange={(v) => set('image_position', v)}
          options={[
            { value: 'left', label: 'Image a gauche' },
            { value: 'right', label: 'Image a droite' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Alignement vertical</FieldLabel>
        <SelectField
          value={c.vertical_align ?? 'center'}
          onChange={(v) => set('vertical_align', v)}
          options={[
            { value: 'top', label: 'Haut' },
            { value: 'center', label: 'Centre' },
            { value: 'bottom', label: 'Bas' },
          ]}
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>URL de l&apos;image</FieldLabel>
        <TextInput value={c.image_url ?? ''} onChange={(v) => set('image_url', v)} placeholder="https://..." />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Texte alternatif</FieldLabel>
        <TextInput value={c.alt_text ?? ''} onChange={(v) => set('alt_text', v)} placeholder="Description" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Titre</FieldLabel>
        <TextInput value={c.title ?? ''} onChange={(v) => set('title', v)} placeholder="Titre de la section" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Texte</FieldLabel>
        <RichTextEditor
          value={c.body ?? ''}
          onChange={(v) => set('body', v)}
          placeholder="Contenu texte..."
          minHeight={150}
        />
      </div>
    </div>
  );
}

function CtaForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: string) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FieldLabel>Titre</FieldLabel>
        <TextInput value={c.title ?? ''} onChange={(v) => set('title', v)} placeholder="Passez a l'action !" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Sous-titre</FieldLabel>
        <TextInput value={c.subtitle ?? ''} onChange={(v) => set('subtitle', v)} placeholder="Description courte" />
      </div>
      <div className="sm:col-span-2 rounded-md border border-border p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bouton principal</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Libelle</FieldLabel>
            <TextInput value={c.button_label ?? ''} onChange={(v) => set('button_label', v)} placeholder="S'inscrire" />
          </div>
          <div>
            <LinkPicker value={c.button_url ?? ''} onChange={(v) => set('button_url', v)} label="Lien" />
          </div>
        </div>
      </div>
      <div className="sm:col-span-2 rounded-md border border-dashed border-border p-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Bouton secondaire <span className="font-normal text-muted-foreground">(optionnel)</span></p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Libelle</FieldLabel>
            <TextInput value={c.button2_label ?? ''} onChange={(v) => set('button2_label', v)} placeholder="En savoir plus" />
          </div>
          <div>
            <LinkPicker value={c.button2_url ?? ''} onChange={(v) => set('button2_url', v)} label="Lien" />
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>Couleur de fond</FieldLabel>
        <TextInput value={c.background_color ?? ''} onChange={(v) => set('background_color', v)} placeholder="#6366f1" type="text" />
      </div>
      <div>
        <FieldLabel>Couleur du texte</FieldLabel>
        <TextInput value={c.text_color ?? ''} onChange={(v) => set('text_color', v)} placeholder="#ffffff" type="text" />
      </div>
    </div>
  );
}

function TestimonialForm({ content, onChange }: BlockFormProps) {
  const items = (content.items as Array<{ quote: string; author_name: string; author_role: string; avatar_url: string; rating: number }>) ?? [];

  const updateItem = (idx: number, key: string, val: unknown) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: val } : item));
    onChange({ ...content, items: updated });
  };
  const addItem = () => onChange({ ...content, items: [...items, { quote: '', author_name: '', author_role: '', avatar_url: '', rating: 5 }] });
  const removeItem = (idx: number) => onChange({ ...content, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Citation</FieldLabel>
              <TextArea value={item.quote ?? ''} onChange={(v) => updateItem(idx, 'quote', v)} rows={2} placeholder="Temoignage..." />
            </div>
            <div>
              <FieldLabel>Nom</FieldLabel>
              <TextInput value={item.author_name ?? ''} onChange={(v) => updateItem(idx, 'author_name', v)} placeholder="Jean Dupont" />
            </div>
            <div>
              <FieldLabel>Role / Fonction</FieldLabel>
              <TextInput value={item.author_role ?? ''} onChange={(v) => updateItem(idx, 'author_role', v)} placeholder="Visiteur" />
            </div>
            <div>
              <FieldLabel>URL avatar</FieldLabel>
              <TextInput value={item.avatar_url ?? ''} onChange={(v) => updateItem(idx, 'avatar_url', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Note (1-5)</FieldLabel>
              <NumberInput value={item.rating ?? 5} onChange={(v) => updateItem(idx, 'rating', v)} placeholder="5" />
            </div>
          </div>
          <button type="button" onClick={() => removeItem(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un temoignage
      </button>
    </div>
  );
}

function PricingTableForm({ content, onChange }: BlockFormProps) {
  const plans = (content.plans as Array<{ name: string; price: string; period: string; description: string; features: string[]; button_label: string; button_url: string; is_highlighted: boolean }>) ?? [];

  const updatePlan = (idx: number, key: string, val: unknown) => {
    const updated = plans.map((p, i) => (i === idx ? { ...p, [key]: val } : p));
    onChange({ ...content, plans: updated });
  };
  const addPlan = () => onChange({ ...content, plans: [...plans, { name: '', price: '', period: '', description: '', features: [], button_label: '', button_url: '', is_highlighted: false }] });
  const removePlan = (idx: number) => onChange({ ...content, plans: plans.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {plans.map((plan, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel>Nom du plan</FieldLabel>
              <TextInput value={plan.name ?? ''} onChange={(v) => updatePlan(idx, 'name', v)} placeholder="Standard" />
            </div>
            <div>
              <FieldLabel>Prix</FieldLabel>
              <TextInput value={plan.price ?? ''} onChange={(v) => updatePlan(idx, 'price', v)} placeholder="29€" />
            </div>
            <div>
              <FieldLabel>Periode</FieldLabel>
              <TextInput value={plan.period ?? ''} onChange={(v) => updatePlan(idx, 'period', v)} placeholder="/ mois" />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <TextInput value={plan.description ?? ''} onChange={(v) => updatePlan(idx, 'description', v)} placeholder="Pour les petites equipes" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Fonctionnalites (une par ligne)</FieldLabel>
              <TextArea
                value={(plan.features ?? []).join('\n')}
                onChange={(v) => updatePlan(idx, 'features', v.split('\n').filter(Boolean))}
                rows={3}
                placeholder="Acces illimite&#10;Support 24/7&#10;Export PDF"
              />
            </div>
            <div>
              <FieldLabel>Libelle bouton</FieldLabel>
              <TextInput value={plan.button_label ?? ''} onChange={(v) => updatePlan(idx, 'button_label', v)} placeholder="Choisir" />
            </div>
            <div>
              <FieldLabel>URL bouton</FieldLabel>
              <TextInput value={plan.button_url ?? ''} onChange={(v) => updatePlan(idx, 'button_url', v)} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <CheckboxField label="Mettre en avant ce plan" checked={plan.is_highlighted ?? false} onChange={(v) => updatePlan(idx, 'is_highlighted', v)} />
            </div>
          </div>
          <button type="button" onClick={() => removePlan(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addPlan} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un plan
      </button>
    </div>
  );
}

function IconBoxForm({ content, onChange }: BlockFormProps) {
  const items = (content.items as Array<{ icon: string; title: string; description: string; link_url: string }>) ?? [];

  const updateItem = (idx: number, key: string, val: string) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: val } : item));
    onChange({ ...content, items: updated });
  };
  const addItem = () => onChange({ ...content, items: [...items, { icon: 'star', title: '', description: '', link_url: '' }] });
  const removeItem = (idx: number) => onChange({ ...content, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Colonnes</FieldLabel>
        <SelectField
          value={String((content.columns as number) ?? 3)}
          onChange={(v) => onChange({ ...content, columns: Number(v) })}
          options={[
            { value: '2', label: '2 colonnes' },
            { value: '3', label: '3 colonnes' },
            { value: '4', label: '4 colonnes' },
          ]}
        />
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel>Icone (nom Lucide)</FieldLabel>
              <TextInput value={item.icon ?? ''} onChange={(v) => updateItem(idx, 'icon', v)} placeholder="star, heart, shield..." />
            </div>
            <div>
              <FieldLabel>Titre</FieldLabel>
              <TextInput value={item.title ?? ''} onChange={(v) => updateItem(idx, 'title', v)} placeholder="Titre" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextArea value={item.description ?? ''} onChange={(v) => updateItem(idx, 'description', v)} rows={2} placeholder="Description..." />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Lien (optionnel)</FieldLabel>
              <TextInput value={item.link_url ?? ''} onChange={(v) => updateItem(idx, 'link_url', v)} placeholder="https://..." />
            </div>
          </div>
          <button type="button" onClick={() => removeItem(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter une boite
      </button>
    </div>
  );
}

function TeamMemberForm({ content, onChange }: BlockFormProps) {
  const members = (content.members as Array<{ name: string; role: string; photo_url: string; bio: string }>) ?? [];

  const updateMember = (idx: number, key: string, val: string) => {
    const updated = members.map((m, i) => (i === idx ? { ...m, [key]: val } : m));
    onChange({ ...content, members: updated });
  };
  const addMember = () => onChange({ ...content, members: [...members, { name: '', role: '', photo_url: '', bio: '' }] });
  const removeMember = (idx: number) => onChange({ ...content, members: members.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {members.map((m, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <div>
              <FieldLabel>Nom</FieldLabel>
              <TextInput value={m.name ?? ''} onChange={(v) => updateMember(idx, 'name', v)} placeholder="Nom complet" />
            </div>
            <div>
              <FieldLabel>Role / Poste</FieldLabel>
              <TextInput value={m.role ?? ''} onChange={(v) => updateMember(idx, 'role', v)} placeholder="Directeur artistique" />
            </div>
            <div>
              <FieldLabel>URL photo</FieldLabel>
              <TextInput value={m.photo_url ?? ''} onChange={(v) => updateMember(idx, 'photo_url', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Bio</FieldLabel>
              <TextArea value={m.bio ?? ''} onChange={(v) => updateMember(idx, 'bio', v)} rows={2} placeholder="Courte biographie..." />
            </div>
          </div>
          <button type="button" onClick={() => removeMember(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addMember} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un membre
      </button>
    </div>
  );
}

function StatsForm({ content, onChange }: BlockFormProps) {
  const items = (content.items as Array<{ value: string; label: string; prefix: string; suffix: string }>) ?? [];

  const updateItem = (idx: number, key: string, val: string) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: val } : item));
    onChange({ ...content, items: updated });
  };
  const addItem = () => onChange({ ...content, items: [...items, { value: '', label: '', prefix: '', suffix: '' }] });
  const removeItem = (idx: number) => onChange({ ...content, items: items.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-4">
            <div>
              <FieldLabel>Prefixe</FieldLabel>
              <TextInput value={item.prefix ?? ''} onChange={(v) => updateItem(idx, 'prefix', v)} placeholder="+" />
            </div>
            <div>
              <FieldLabel>Valeur</FieldLabel>
              <TextInput value={item.value ?? ''} onChange={(v) => updateItem(idx, 'value', v)} placeholder="500" />
            </div>
            <div>
              <FieldLabel>Suffixe</FieldLabel>
              <TextInput value={item.suffix ?? ''} onChange={(v) => updateItem(idx, 'suffix', v)} placeholder="%" />
            </div>
            <div>
              <FieldLabel>Label</FieldLabel>
              <TextInput value={item.label ?? ''} onChange={(v) => updateItem(idx, 'label', v)} placeholder="Visiteurs" />
            </div>
          </div>
          <button type="button" onClick={() => removeItem(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un chiffre
      </button>
    </div>
  );
}

function SeparatorForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: string) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <FieldLabel>Style</FieldLabel>
        <SelectField
          value={c.style ?? 'solid'}
          onChange={(v) => set('style', v)}
          options={[
            { value: 'solid', label: 'Plein' },
            { value: 'dashed', label: 'Tirets' },
            { value: 'dotted', label: 'Pointilles' },
            { value: 'double', label: 'Double' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Couleur</FieldLabel>
        <TextInput value={c.color ?? ''} onChange={(v) => set('color', v)} placeholder="#e5e7eb" />
      </div>
      <div>
        <FieldLabel>Largeur</FieldLabel>
        <TextInput value={c.width ?? ''} onChange={(v) => set('width', v)} placeholder="100%" />
      </div>
    </div>
  );
}

function SpacerForm({ content, onChange }: BlockFormProps) {
  return (
    <div className="max-w-xs">
      <FieldLabel>Hauteur (px)</FieldLabel>
      <NumberInput
        value={(content.height as number) ?? 40}
        onChange={(v) => onChange({ ...content, height: v })}
        placeholder="40"
      />
    </div>
  );
}

function AlertForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: unknown) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Type</FieldLabel>
        <SelectField
          value={c.type ?? 'info'}
          onChange={(v) => set('type', v)}
          options={[
            { value: 'info', label: 'Information' },
            { value: 'success', label: 'Succes' },
            { value: 'warning', label: 'Avertissement' },
            { value: 'error', label: 'Erreur' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Titre (optionnel)</FieldLabel>
        <TextInput value={c.title ?? ''} onChange={(v) => set('title', v)} placeholder="Important" />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>Message</FieldLabel>
        <TextArea
          value={(content.message as string) ?? ''}
          onChange={(v) => set('message', v)}
          rows={3}
          placeholder="Contenu du message..."
        />
      </div>
      <div className="sm:col-span-2">
        <CheckboxField label="Peut etre ferme" checked={(content.dismissible as boolean) ?? false} onChange={(v) => set('dismissible', v)} />
      </div>
    </div>
  );
}

function TabsForm({ content, onChange }: BlockFormProps) {
  const tabs = (content.tabs as Array<{ title: string; body: string }>) ?? [];

  const updateTab = (idx: number, key: string, val: string) => {
    const updated = tabs.map((t, i) => (i === idx ? { ...t, [key]: val } : t));
    onChange({ ...content, tabs: updated });
  };
  const addTab = () => onChange({ ...content, tabs: [...tabs, { title: '', body: '' }] });
  const removeTab = (idx: number) => onChange({ ...content, tabs: tabs.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      {tabs.map((tab, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2">
            <div>
              <FieldLabel>Titre de l&apos;onglet {idx + 1}</FieldLabel>
              <TextInput value={tab.title ?? ''} onChange={(v) => updateTab(idx, 'title', v)} placeholder="Onglet" />
            </div>
            <div>
              <FieldLabel>Contenu</FieldLabel>
              <RichTextEditor value={tab.body ?? ''} onChange={(v) => updateTab(idx, 'body', v)} placeholder="Contenu de l'onglet..." minHeight={120} />
            </div>
          </div>
          <button type="button" onClick={() => removeTab(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addTab} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un onglet
      </button>
    </div>
  );
}

function LogoCarouselForm({ content, onChange }: BlockFormProps) {
  const logos = (content.logos as Array<{ image_url: string; alt_text: string; link_url: string }>) ?? [];

  const updateLogo = (idx: number, key: string, val: string) => {
    const updated = logos.map((l, i) => (i === idx ? { ...l, [key]: val } : l));
    onChange({ ...content, logos: updated });
  };
  const addLogo = () => onChange({ ...content, logos: [...logos, { image_url: '', alt_text: '', link_url: '' }] });
  const removeLogo = (idx: number) => onChange({ ...content, logos: logos.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Titre (optionnel)</FieldLabel>
        <TextInput
          value={(content.title as string) ?? ''}
          onChange={(v) => onChange({ ...content, title: v })}
          placeholder="Nos partenaires"
        />
      </div>
      {logos.map((logo, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <div>
              <FieldLabel>URL logo</FieldLabel>
              <TextInput value={logo.image_url ?? ''} onChange={(v) => updateLogo(idx, 'image_url', v)} placeholder="https://..." />
            </div>
            <div>
              <FieldLabel>Texte alt.</FieldLabel>
              <TextInput value={logo.alt_text ?? ''} onChange={(v) => updateLogo(idx, 'alt_text', v)} placeholder="Nom du partenaire" />
            </div>
            <div>
              <FieldLabel>Lien</FieldLabel>
              <TextInput value={logo.link_url ?? ''} onChange={(v) => updateLogo(idx, 'link_url', v)} placeholder="https://..." />
            </div>
          </div>
          <button type="button" onClick={() => removeLogo(idx)} className="mt-5 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addLogo} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-3.5 w-3.5" />
        Ajouter un logo
      </button>
    </div>
  );
}

function ButtonForm({ content, onChange }: BlockFormProps) {
  const c = content as Record<string, string>;
  const set = (key: string, val: unknown) => onChange({ ...content, [key]: val });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>Libelle</FieldLabel>
        <TextInput value={c.label ?? ''} onChange={(v) => set('label', v)} placeholder="Cliquez ici" />
      </div>
      <div>
        <LinkPicker value={c.url ?? ''} onChange={(v) => set('url', v)} label="Lien" />
      </div>
      <div>
        <FieldLabel>Style</FieldLabel>
        <SelectField
          value={c.style ?? 'primary'}
          onChange={(v) => set('style', v)}
          options={[
            { value: 'primary', label: 'Primaire' },
            { value: 'secondary', label: 'Secondaire' },
            { value: 'outline', label: 'Contour' },
            { value: 'ghost', label: 'Fantome' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Taille</FieldLabel>
        <SelectField
          value={c.size ?? 'md'}
          onChange={(v) => set('size', v)}
          options={[
            { value: 'sm', label: 'Petit' },
            { value: 'md', label: 'Moyen' },
            { value: 'lg', label: 'Grand' },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Alignement</FieldLabel>
        <SelectField
          value={c.align ?? 'center'}
          onChange={(v) => set('align', v)}
          options={[
            { value: 'left', label: 'Gauche' },
            { value: 'center', label: 'Centre' },
            { value: 'right', label: 'Droite' },
          ]}
        />
      </div>
      <div className="flex items-end">
        <CheckboxField label="Ouvrir dans un nouvel onglet" checked={(content.open_new_tab as boolean) ?? false} onChange={(v) => set('open_new_tab', v)} />
      </div>
    </div>
  );
}

const BLOCK_FORMS: Record<BlockType, React.ComponentType<BlockFormProps>> = {
  hero: HeroForm,
  text: TextForm,
  image: ImageForm,
  gallery: GalleryForm,
  video: VideoForm,
  map: MapForm,
  schedule: ScheduleForm,
  exhibitor_list: ExhibitorListForm,
  contact_form: ContactFormForm,
  faq: FaqForm,
  countdown: CountdownForm,
  custom_html: CustomHtmlForm,
  image_text: ImageTextForm,
  cta: CtaForm,
  testimonial: TestimonialForm,
  pricing_table: PricingTableForm,
  icon_box: IconBoxForm,
  team_member: TeamMemberForm,
  stats: StatsForm,
  separator: SeparatorForm,
  spacer: SpacerForm,
  alert: AlertForm,
  tabs: TabsForm,
  logo_carousel: LogoCarouselForm,
  button: ButtonForm,
};

// ---------------------------------------------------------------------------
// Page with blocks response type
// ---------------------------------------------------------------------------

interface PageWithBlocks extends CmsPage {
  blocks: CmsBlock[];
}

// ---------------------------------------------------------------------------
// Save status type
// ---------------------------------------------------------------------------

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AdminCmsEditorPage() {
  const { slug, pageId } = useParams<{ slug: string; pageId: string }>();
  const navigate = useNavigate();

  // Page & blocks state
  const [page, setPage] = useState<CmsPage | null>(null);
  const [blocks, setBlocks] = useState<CmsBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showPreview, setShowPreview] = useState(false);

  // Debounce timers keyed by block id
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // -------------------------------------------------------------------------
  // Fetch page + blocks
  // -------------------------------------------------------------------------

  const fetchPage = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    setError(null);

    const res = await api.get<PageWithBlocks>(`/cms/pages/${pageId}`);
    if (res.success && res.data) {
      setPage(res.data);
      setBlocks((res.data.blocks ?? []).sort((a, b) => a.sort_order - b.sort_order));
      // Auto-expand all blocks
      setExpandedBlocks(new Set((res.data.blocks ?? []).map((b) => b.id)));
    } else {
      setError(res.error || 'Impossible de charger la page.');
    }
    setLoading(false);
  }, [pageId]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Cleanup debounce timers
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // -------------------------------------------------------------------------
  // Block CRUD
  // -------------------------------------------------------------------------

  const saveBlock = useCallback(
    async (blockId: string, data: Partial<CmsBlock>) => {
      setSaveStatus('saving');
      const res = await api.put<CmsBlock>(`/cms/blocks/${blockId}`, data);
      if (res.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } else {
        setSaveStatus('error');
      }
      return res;
    },
    []
  );

  const debouncedSaveContent = useCallback(
    (blockId: string, content: Record<string, unknown>) => {
      const existing = debounceTimers.current.get(blockId);
      if (existing) clearTimeout(existing);

      setSaveStatus('saving');
      const timer = setTimeout(async () => {
        debounceTimers.current.delete(blockId);
        await saveBlock(blockId, { content });
      }, 800);

      debounceTimers.current.set(blockId, timer);
    },
    [saveBlock]
  );

  const handleContentChange = useCallback(
    (blockId: string, content: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, content } : b))
      );
      debouncedSaveContent(blockId, content);
    },
    [debouncedSaveContent]
  );

  const handleToggleVisibility = useCallback(
    async (block: CmsBlock) => {
      const newVisible = !block.is_visible;
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, is_visible: newVisible } : b))
      );
      await saveBlock(block.id, { is_visible: newVisible });
    },
    [saveBlock]
  );

  const handleDeleteBlock = useCallback(async (blockId: string) => {
    if (!confirm('Supprimer ce bloc ? Cette action est irreversible.')) return;

    setSaveStatus('saving');
    const res = await api.delete(`/cms/blocks/${blockId}`);
    if (res.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setExpandedBlocks((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } else {
      setSaveStatus('error');
    }
  }, []);

  const handleAddBlock = useCallback(
    async (blockType: BlockType) => {
      if (!pageId) return;
      setAddingBlock(true);

      const newSortOrder = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 0;

      const res = await api.post<CmsBlock>(`/cms/pages/${pageId}/blocks`, {
        block_type: blockType,
        content: {},
        settings: {},
        sort_order: newSortOrder,
      });

      if (res.success && res.data) {
        setBlocks((prev) => [...prev, res.data!]);
        setExpandedBlocks((prev) => new Set([...prev, res.data!.id]));
        setShowBlockPicker(false);
      }
      setAddingBlock(false);
    },
    [pageId, blocks]
  );

  // -------------------------------------------------------------------------
  // Reorder
  // -------------------------------------------------------------------------

  const handleMove = useCallback(
    async (blockId: string, direction: 'up' | 'down') => {
      if (!pageId) return;

      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.length) return prev;

        const updated = [...prev];
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        // Reassign sort_order
        const reordered = updated.map((b, i) => ({ ...b, sort_order: i }));

        // Fire reorder API
        const blockIds = reordered.map((b) => b.id);
        setSaveStatus('saving');
        api
          .put(`/cms/pages/${pageId}/blocks/reorder`, { block_ids: blockIds })
          .then((res) => {
            if (res.success) {
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
            } else {
              setSaveStatus('error');
            }
          });

        return reordered;
      });
    },
    [pageId]
  );

  // -------------------------------------------------------------------------
  // Publish toggle
  // -------------------------------------------------------------------------

  const handleTogglePublish = useCallback(async () => {
    if (!page || !slug) return;
    setSaveStatus('saving');

    const res = await api.put<CmsPage>(`/cms/pages/${page.id}`, {
      is_published: !page.is_published,
    });

    if (res.success && res.data) {
      setPage(res.data);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } else {
      setSaveStatus('error');
    }
  }, [page, slug]);

  // -------------------------------------------------------------------------
  // Toggle expand/collapse
  // -------------------------------------------------------------------------

  const toggleExpand = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error || 'Page introuvable.'}</p>
        <button
          type="button"
          onClick={() => navigate(`/f/${slug}/admin/cms`)}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux pages
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/f/${slug}/admin/cms`)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{page.title}</h1>
            <p className="text-xs text-muted-foreground">/{page.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <SaveIndicator status={saveStatus} />

          {/* Preview button */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            title="Apercu de la page"
          >
            <Eye className="h-4 w-4" />
            Apercu
          </button>

          {/* Publish toggle */}
          <button
            type="button"
            onClick={handleTogglePublish}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              page.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50'
            }`}
          >
            {page.is_published ? (
              <>
                <Eye className="h-4 w-4" />
                Publie
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Brouillon
              </>
            )}
          </button>
        </div>
      </div>

      {/* Block list */}
      <div className="space-y-3">
        {blocks.map((block, idx) => {
          const meta = BLOCK_META[block.block_type];
          const Icon = meta.icon;
          const isExpanded = expandedBlocks.has(block.id);
          const FormComponent = BLOCK_FORMS[block.block_type];

          return (
            <div
              key={block.id}
              className={`rounded-xl border bg-card transition-shadow ${
                block.is_visible ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              {/* Block header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />

                <button
                  type="button"
                  onClick={() => toggleExpand(block.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                <div className="flex items-center gap-1">
                  {/* Visibility */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(block)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title={block.is_visible ? 'Masquer' : 'Afficher'}
                  >
                    {block.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>

                  {/* Move up */}
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, 'up')}
                    disabled={idx === 0}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Monter"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>

                  {/* Move down */}
                  <button
                    type="button"
                    onClick={() => handleMove(block.id, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Descendre"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Block body (expanded) */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4">
                  <FormComponent
                    content={block.content}
                    onChange={(content) => handleContentChange(block.id, content)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {blocks.length === 0 && !showBlockPicker && (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Cette page n&apos;a pas encore de blocs.
            </p>
            <button
              type="button"
              onClick={() => setShowBlockPicker(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Ajouter un bloc
            </button>
          </div>
        )}
      </div>

      {/* Add block button */}
      {blocks.length > 0 && !showBlockPicker && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowBlockPicker(true)}
            className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Ajouter un bloc
          </button>
        </div>
      )}

      {/* Block type picker */}
      {showBlockPicker && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Choisir un type de bloc</h3>
            <button
              type="button"
              onClick={() => setShowBlockPicker(false)}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {BLOCK_CATEGORIES.map((cat) => {
              const blockTypes = ALL_BLOCK_TYPES.filter((bt) => BLOCK_META[bt].category === cat.key);
              if (blockTypes.length === 0) return null;
              return (
                <div key={cat.key}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {blockTypes.map((bt) => {
                      const meta = BLOCK_META[bt];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={bt}
                          type="button"
                          disabled={addingBlock}
                          onClick={() => handleAddBlock(bt)}
                          className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="text-xs font-medium text-foreground">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {addingBlock && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ajout en cours...
            </div>
          )}
        </div>
      )}

      {/* Preview overlay */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Apercu — {page.title}
            </h2>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <X className="h-4 w-4" />
              Fermer
            </button>
          </div>
          <div className="pb-16">
            {blocks
              .filter((b) => b.is_visible)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            {blocks.filter((b) => b.is_visible).length === 0 && (
              <div className="flex items-center justify-center py-20 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun bloc visible a afficher.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save indicator sub-component
// ---------------------------------------------------------------------------

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sauvegarde...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-600">Sauvegarde</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Erreur de sauvegarde</span>
        </>
      )}
    </div>
  );
}
