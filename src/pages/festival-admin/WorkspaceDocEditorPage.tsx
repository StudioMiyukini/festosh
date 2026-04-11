import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Type,
  Heading,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  ImageIcon,
  User,
  Clock,
  GripVertical,
  Save,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type DocBlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet_list'
  | 'numbered_list'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image';

interface DocBlockContent {
  text?: string;
  level?: 1 | 2 | 3;
  items?: string[];
  url?: string;
  language?: string;
}

interface DocBlock {
  id: string;
  type: DocBlockType;
  content: DocBlockContent;
}

interface WorkspaceDoc {
  id: string;
  festival_id: string;
  title: string;
  content: DocBlock[];  // API returns "content", we map to blocks locally
  blocks?: DocBlock[];  // poll response uses "blocks"
  version: number;
  last_editor_name: string | null;
  updated_at: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

interface BlockTypeOption {
  type: DocBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { type: 'paragraph', label: 'Paragraphe', icon: Type },
  { type: 'heading', label: 'Titre', icon: Heading },
  { type: 'bullet_list', label: 'Liste a puces', icon: List },
  { type: 'numbered_list', label: 'Liste numerotee', icon: ListOrdered },
  { type: 'quote', label: 'Citation', icon: Quote },
  { type: 'code', label: 'Code', icon: Code },
  { type: 'divider', label: 'Separateur', icon: Minus },
  { type: 'image', label: 'Image', icon: ImageIcon },
];

const POLL_INTERVAL = 3000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createBlock(type: DocBlockType): DocBlock {
  const id = uid();
  switch (type) {
    case 'heading':
      return { id, type, content: { text: '', level: 2 } };
    case 'bullet_list':
    case 'numbered_list':
      return { id, type, content: { items: [''] } };
    case 'code':
      return { id, type, content: { text: '', language: '' } };
    case 'image':
      return { id, type, content: { url: '', text: '' } };
    case 'divider':
      return { id, type, content: {} };
    case 'quote':
      return { id, type, content: { text: '' } };
    default:
      return { id, type: 'paragraph', content: { text: '' } };
  }
}

// ─── Block Toolbar ──────────────────────────────────────────────────────────

function BlockToolbar({
  block,
  index,
  total,
  onChangeType,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: DocBlock;
  index: number;
  total: number;
  onChangeType: (type: DocBlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false);
      }
    }
    if (showTypeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypeMenu]);

  const currentType = BLOCK_TYPES.find((bt) => bt.type === block.type);
  const CurrentIcon = currentType?.icon || Type;

  return (
    <div className="absolute -left-10 top-1 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <GripVertical className="h-4 w-4 text-gray-300" />
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Changer le type"
        >
          <CurrentIcon className="h-3.5 w-3.5" />
        </button>
        {showTypeMenu && (
          <div className="absolute left-6 top-0 z-50 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {BLOCK_TYPES.map((bt) => {
              const Icon = bt.icon;
              return (
                <button
                  key={bt.type}
                  onClick={() => {
                    onChangeType(bt.type);
                    setShowTypeMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 ${
                    block.type === bt.type ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {bt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={onMoveUp}
        disabled={index === 0}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Monter"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onMoveDown}
        disabled={index === total - 1}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Descendre"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
        title="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Individual Block Renderers ─────────────────────────────────────────────

function ParagraphBlock({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  return (
    <textarea
      value={block.content.text || ''}
      onChange={(e) => onChange({ ...block.content, text: e.target.value })}
      onBlur={onBlur}
      placeholder="Tapez votre texte..."
      className="w-full resize-none border-0 bg-transparent text-base text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-0"
      rows={1}
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }}
    />
  );
}

function HeadingBlock({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  const level = block.content.level || 2;
  const sizeClasses: Record<number, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((l) => (
          <button
            key={l}
            onClick={() => onChange({ ...block.content, level: l as 1 | 2 | 3 })}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              level === l
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            H{l}
          </button>
        ))}
      </div>
      <input
        value={block.content.text || ''}
        onChange={(e) => onChange({ ...block.content, text: e.target.value })}
        onBlur={onBlur}
        placeholder="Titre..."
        className={`w-full border-0 bg-transparent text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 ${sizeClasses[level]}`}
      />
    </div>
  );
}

function ListBlock({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  const items = block.content.items || [''];
  const isNumbered = block.type === 'numbered_list';

  const updateItem = (idx: number, value: string) => {
    const next = [...items];
    next[idx] = value;
    onChange({ ...block.content, items: next });
  };

  const addItem = () => {
    onChange({ ...block.content, items: [...items, ''] });
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    const next = items.filter((_, i) => i !== idx);
    onChange({ ...block.content, items: next });
  };

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="mt-1.5 flex-shrink-0 text-sm text-gray-400">
            {isNumbered ? `${idx + 1}.` : '\u2022'}
          </span>
          <input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
              if (e.key === 'Backspace' && item === '' && items.length > 1) {
                e.preventDefault();
                removeItem(idx);
              }
            }}
            placeholder="Element de la liste..."
            className="flex-1 border-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-0"
          />
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        <Plus className="h-3 w-3" />
        Ajouter un element
      </button>
    </div>
  );
}

function QuoteBlock({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  return (
    <div className="border-l-4 border-gray-300 pl-4">
      <textarea
        value={block.content.text || ''}
        onChange={(e) => onChange({ ...block.content, text: e.target.value })}
        onBlur={onBlur}
        placeholder="Citation..."
        className="w-full resize-none border-0 bg-transparent text-base italic text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-0"
        rows={1}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
    </div>
  );
}

function CodeBlock({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  return (
    <div className="rounded-md bg-gray-900 p-4">
      <input
        value={block.content.language || ''}
        onChange={(e) => onChange({ ...block.content, language: e.target.value })}
        onBlur={onBlur}
        placeholder="langage"
        className="mb-2 w-32 border-0 bg-transparent text-xs text-gray-400 placeholder:text-gray-600 focus:outline-none focus:ring-0"
      />
      <textarea
        value={block.content.text || ''}
        onChange={(e) => onChange({ ...block.content, text: e.target.value })}
        onBlur={onBlur}
        placeholder="// code..."
        className="w-full resize-none border-0 bg-transparent font-mono text-sm text-green-400 placeholder:text-gray-600 focus:outline-none focus:ring-0"
        rows={3}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
    </div>
  );
}

function DividerBlock() {
  return <hr className="my-2 border-gray-200" />;
}

function ImageBlockEditor({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-2">
      <input
        value={block.content.url || ''}
        onChange={(e) => onChange({ ...block.content, url: e.target.value })}
        onBlur={onBlur}
        placeholder="URL de l'image..."
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {block.content.url && (
        <img
          src={block.content.url}
          alt={block.content.text || 'Image'}
          className="max-h-80 rounded-md object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <input
        value={block.content.text || ''}
        onChange={(e) => onChange({ ...block.content, text: e.target.value })}
        onBlur={onBlur}
        placeholder="Legende (optionnel)..."
        className="w-full border-0 bg-transparent text-xs italic text-gray-500 placeholder:text-gray-300 focus:outline-none focus:ring-0"
      />
    </div>
  );
}

// ─── Add Block Button ───────────────────────────────────────────────────────

function AddBlockButton({ onAdd }: { onAdd: (type: DocBlockType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative flex justify-center" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        title="Ajouter un bloc"
      >
        <Plus className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute top-9 z-50 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {BLOCK_TYPES.map((bt) => {
            const Icon = bt.icon;
            return (
              <button
                key={bt.type}
                onClick={() => {
                  onAdd(bt.type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 text-gray-400" />
                {bt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Block Editor Dispatcher ────────────────────────────────────────────────

function BlockEditor({
  block,
  onChange,
  onBlur,
}: {
  block: DocBlock;
  onChange: (content: DocBlockContent) => void;
  onBlur: () => void;
}) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlock block={block} onChange={onChange} onBlur={onBlur} />;
    case 'bullet_list':
    case 'numbered_list':
      return <ListBlock block={block} onChange={onChange} onBlur={onBlur} />;
    case 'quote':
      return <QuoteBlock block={block} onChange={onChange} onBlur={onBlur} />;
    case 'code':
      return <CodeBlock block={block} onChange={onChange} onBlur={onBlur} />;
    case 'divider':
      return <DividerBlock />;
    case 'image':
      return <ImageBlockEditor block={block} onChange={onChange} onBlur={onBlur} />;
    default:
      return <ParagraphBlock block={block} onChange={onChange} onBlur={onBlur} />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function WorkspaceDocEditorPage() {
  const { slug, docId } = useParams<{ slug: string; docId: string }>();
  const navigate = useNavigate();
  const { festival } = useTenantStore();
  const { profile } = useAuthStore();

  const [doc, setDoc] = useState<WorkspaceDoc | null>(null);
  const [blocks, setBlocks] = useState<DocBlock[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const versionRef = useRef(0);
  const blocksRef = useRef<DocBlock[]>([]);
  const titleRef = useRef('');
  const isSavingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Keep refs in sync
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // ─── Load document ──────────────────────────────────────────────────────

  const fetchDoc = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);

    const res = await api.get<WorkspaceDoc>(`/workspace-docs/${docId}`);
    if (res.success && res.data) {
      const d = res.data;
      const docBlocks = d.content || d.blocks || [];
      setDoc(d);
      setTitle(d.title);
      setBlocks(docBlocks);
      setLastEditor(d.last_editor_name);
      setLastUpdated(d.updated_at);
      versionRef.current = d.version;
      blocksRef.current = docBlocks;
      titleRef.current = d.title;
      lastSavedContentRef.current = JSON.stringify(docBlocks);
    } else {
      setError(res.error || 'Impossible de charger le document.');
    }
    setLoading(false);
  }, [docId]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // ─── Save on blur ───────────────────────────────────────────────────────

  const saveContent = useCallback(async () => {
    if (!docId || isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    setLastSaveStatus('saving');

    const res = await api.put<{ version: number; updated_at: number; blocks?: DocBlock[] }>(`/workspace-docs/${docId}/content`, {
      title: titleRef.current,
      blocks: blocksRef.current,
      version: versionRef.current,
    });

    if (res.success && res.data) {
      versionRef.current = res.data.version;
      setLastUpdated(res.data.updated_at);
      setLastEditor(profile?.display_name || profile?.username || null);
      lastSavedContentRef.current = JSON.stringify(blocksRef.current);
      setIsDirty(false);
      setLastSaveStatus('saved');

      // If server returned merged blocks (conflict resolution), update local state
      if (res.data.blocks) {
        const activeEl = document.activeElement;
        const focusedBlockId = activeEl?.closest('[data-block-id]')?.getAttribute('data-block-id');

        const mergedBlocks = res.data.blocks.map((remoteBlock) => {
          if (remoteBlock.id === focusedBlockId) {
            return blocksRef.current.find((b) => b.id === remoteBlock.id) || remoteBlock;
          }
          return remoteBlock;
        });

        setBlocks(mergedBlocks);
        blocksRef.current = mergedBlocks;
        lastSavedContentRef.current = JSON.stringify(mergedBlocks);
      }
    } else {
      setLastSaveStatus('error');
    }

    isSavingRef.current = false;
    setSaving(false);
  }, [docId, profile]);

  // ─── Auto-save every 5 seconds ─────────────────────────────────────────

  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      const currentContent = JSON.stringify(blocksRef.current);
      const currentTitle = titleRef.current;
      const lastSaved = lastSavedContentRef.current;

      if (currentContent !== lastSaved && !isSavingRef.current && docId) {
        lastSavedContentRef.current = currentContent;
        saveContent();
      }
    }, 5000);

    return () => clearInterval(autoSaveTimer);
  }, [docId, saveContent]);

  // ─── Collaborative polling ──────────────────────────────────────────────

  useEffect(() => {
    if (!docId) return;

    pollTimerRef.current = setInterval(async () => {
      if (isSavingRef.current) return;

      const res = await api.get<{
        changed: boolean;
        version: number;
        title?: string;
        blocks?: DocBlock[];
        last_editor_name?: string | null;
        updated_at?: number;
      }>(`/workspace-docs/${docId}/poll?version=${versionRef.current}`);

      if (res.success && res.data?.changed && res.data.blocks) {
        versionRef.current = res.data.version;
        if (res.data.last_editor_name) setLastEditor(res.data.last_editor_name);
        if (res.data.updated_at) setLastUpdated(res.data.updated_at);

        const activeEl = document.activeElement;

        // Update title if not being edited
        if (res.data.title) {
          const isTitleFocused = activeEl?.getAttribute('data-title-input') === 'true';
          if (!isTitleFocused) {
            setTitle(res.data.title);
            titleRef.current = res.data.title;
          }
        }

        // Smart merge: preserve locally edited blocks, accept new/changed remote blocks
        const focusedBlockEl = activeEl?.closest('[data-block-id]');
        const focusedBlockId = focusedBlockEl?.getAttribute('data-block-id');
        const localMap = new Map(blocksRef.current.map((b) => [b.id, b]));
        const remoteBlocks = res.data.blocks;

        // Use remote order, but preserve local content for focused block
        const mergedBlocks = remoteBlocks.map((rb) => {
          if (rb.id === focusedBlockId) {
            // Keep local version of the block being edited
            return localMap.get(rb.id) || rb;
          }
          return rb;
        });

        // Add local-only blocks (just created, not yet saved to server)
        for (const lb of blocksRef.current) {
          if (!remoteBlocks.find((rb) => rb.id === lb.id)) {
            mergedBlocks.push(lb);
          }
        }

        setBlocks(mergedBlocks);
        blocksRef.current = mergedBlocks;
        lastSavedContentRef.current = JSON.stringify(mergedBlocks);
      }
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [docId]);

  // ─── Block operations ──────────────────────────────────────────────────

  const updateBlockContent = (blockId: string, content: DocBlockContent) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content } : b))
    );
    setIsDirty(true);
  };

  const changeBlockType = (blockId: string, newType: DocBlockType) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const newBlock = createBlock(newType);
        // Preserve text content when switching types
        if (b.content.text && (newType === 'paragraph' || newType === 'heading' || newType === 'quote' || newType === 'code')) {
          newBlock.content.text = b.content.text;
        }
        if (b.content.items && (newType === 'bullet_list' || newType === 'numbered_list')) {
          newBlock.content.items = b.content.items;
        }
        return { ...newBlock, id: b.id };
      })
    );
  };

  const addBlockAt = (index: number, type: DocBlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, newBlock);
      return next;
    });
    setIsDirty(true);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsDirty(true);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIsDirty(true);
  };

  // ─── Guard / Loading / Error ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement du document...
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-600">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p className="text-sm">{error || 'Document introuvable.'}</p>
        <button
          onClick={() => navigate(`/f/${slug}/admin/workspace`)}
          className="mt-4 text-sm text-blue-600 underline hover:text-blue-800"
        >
          Retour a l'espace de travail
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <button
            onClick={() => navigate(`/f/${slug}/admin/workspace`)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <div className="flex-1 min-w-0">
            <input
              data-title-input="true"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              onBlur={saveContent}
              placeholder="Sans titre"
              className="w-full border-0 bg-transparent text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save status indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {lastSaveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Sauvegarde...</span>
                </span>
              )}
              {lastSaveStatus === 'saved' && !isDirty && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sauvegarde</span>
                </span>
              )}
              {lastSaveStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Erreur</span>
                </span>
              )}
              {isDirty && lastSaveStatus !== 'saving' && (
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline">Non sauvegarde</span>
                </span>
              )}
            </div>

            {/* Editor info */}
            {lastEditor && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-gray-400">
                <User className="h-3 w-3" />
                {lastEditor}
              </span>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={saveContent}
              disabled={saving || !isDirty}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isDirty
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                  : 'bg-gray-100 text-gray-400 cursor-default dark:bg-gray-800'
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>

      {/* ── Editor Body ────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-1">
          {/* Add block button at top */}
          {blocks.length === 0 && (
            <div className="py-8">
              <AddBlockButton onAdd={(type) => addBlockAt(0, type)} />
              <p className="mt-4 text-center text-sm text-gray-400">
                Cliquez sur + pour ajouter votre premier bloc
              </p>
            </div>
          )}

          {blocks.map((block, index) => (
            <div key={block.id}>
              {/* Insertion point between blocks */}
              <div className="group/insert relative h-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/insert:opacity-100 transition-opacity">
                  <AddBlockButton onAdd={(type) => addBlockAt(index, type)} />
                </div>
              </div>

              {/* Block */}
              <div className="group relative pl-10" data-block-id={block.id}>
                <BlockToolbar
                  block={block}
                  index={index}
                  total={blocks.length}
                  onChangeType={(type) => changeBlockType(block.id, type)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  onDelete={() => deleteBlock(block.id)}
                />
                <div data-block-id={block.id}>
                  <BlockEditor
                    block={block}
                    onChange={(content) => updateBlockContent(block.id, content)}
                    onBlur={saveContent}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add block button at bottom */}
          {blocks.length > 0 && (
            <div className="group/insert relative h-8 flex items-center justify-center pt-4">
              <AddBlockButton onAdd={(type) => addBlockAt(blocks.length, type)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
