import { useRef, useCallback, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Unlink,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  RemoveFormatting,
  Code,
  Minus,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height in pixels. */
  minHeight?: number;
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function TbBtn({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in editor
        onClick();
      }}
      disabled={disabled}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      } disabled:opacity-30 disabled:pointer-events-none`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function TbSep() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

// ---------------------------------------------------------------------------
// Link dialog
// ---------------------------------------------------------------------------

function LinkDialog({
  onSubmit,
  onCancel,
  initialUrl,
  initialText,
}: {
  onSubmit: (url: string, text: string) => void;
  onCancel: () => void;
  initialUrl: string;
  initialText: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim(), text.trim());
  };

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Texte (optionnel)</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Texte du lien"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
            Annuler
          </button>
          <button type="submit"
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Inserer
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image dialog
// ---------------------------------------------------------------------------

function ImageDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (url: string, alt: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim(), alt.trim());
  };

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card p-3 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de l&apos;image</label>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Texte alternatif</label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Description de l'image"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent">
            Annuler
          </button>
          <button type="submit"
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Inserer
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Redigez votre contenu...',
  minHeight = 200,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkInitial, setLinkInitial] = useState({ url: '', text: '' });
  const isInternalUpdate = useRef(false);

  // Sync external value into editor (only when it changes externally)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const el = editorRef.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  // Emit changes
  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalUpdate.current = true;
    onChange(el.innerHTML);
  }, [onChange]);

  // Execute formatting command
  const exec = useCallback(
    (cmd: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      emitChange();
    },
    [emitChange],
  );

  // Query command state
  const queryState = (cmd: string): boolean => {
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };

  // Force re-render to update toolbar active states
  const [, forceUpdate] = useState(0);
  const handleSelectionChange = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  // ---------- Link handling ----------
  const handleLinkClick = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Check if cursor is inside an existing link
    let node: Node | null = sel.anchorNode;
    let existingLink: HTMLAnchorElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && (node as HTMLElement).tagName === 'A') {
        existingLink = node as HTMLAnchorElement;
        break;
      }
      node = node.parentNode;
    }

    if (existingLink) {
      setLinkInitial({
        url: existingLink.href,
        text: existingLink.textContent || '',
      });
    } else {
      setLinkInitial({
        url: '',
        text: sel.toString(),
      });
    }
    setShowLinkDialog(true);
  };

  const handleLinkSubmit = (url: string, text: string) => {
    setShowLinkDialog(false);
    editorRef.current?.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // If there's selected text, wrap it; otherwise insert new link
    if (sel.toString()) {
      exec('createLink', url);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.textContent = text || url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(link);

      // Move cursor after the link
      range.setStartAfter(link);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    emitChange();
  };

  const handleUnlink = () => {
    exec('unlink');
  };

  // ---------- Image handling (DOM API to prevent XSS) ----------
  const handleImageSubmit = (url: string, alt: string) => {
    setShowImageDialog(false);
    editorRef.current?.focus();

    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '0.5rem';
    img.style.margin = '0.5rem 0';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.collapse(false);
    }
  };

  // ---------- Keyboard shortcuts ----------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          exec('bold');
          break;
        case 'i':
          e.preventDefault();
          exec('italic');
          break;
        case 'u':
          e.preventDefault();
          exec('underline');
          break;
        case 'k':
          e.preventDefault();
          handleLinkClick();
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            exec('redo');
          } else {
            e.preventDefault();
            exec('undo');
          }
          break;
      }
    }
  };

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>';

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        {/* Text formatting */}
        <TbBtn icon={Bold} label="Gras (Ctrl+B)" active={queryState('bold')} onClick={() => exec('bold')} />
        <TbBtn icon={Italic} label="Italique (Ctrl+I)" active={queryState('italic')} onClick={() => exec('italic')} />
        <TbBtn icon={Underline} label="Souligne (Ctrl+U)" active={queryState('underline')} onClick={() => exec('underline')} />
        <TbBtn icon={Strikethrough} label="Barre" active={queryState('strikeThrough')} onClick={() => exec('strikeThrough')} />
        <TbBtn icon={Code} label="Code" onClick={() => exec('formatBlock', 'pre')} />

        <TbSep />

        {/* Headings */}
        <TbBtn icon={Heading1} label="Titre 1" onClick={() => exec('formatBlock', 'h2')} />
        <TbBtn icon={Heading2} label="Titre 2" onClick={() => exec('formatBlock', 'h3')} />
        <TbBtn icon={Heading3} label="Titre 3" onClick={() => exec('formatBlock', 'h4')} />

        <TbSep />

        {/* Lists */}
        <TbBtn icon={List} label="Liste a puces" active={queryState('insertUnorderedList')} onClick={() => exec('insertUnorderedList')} />
        <TbBtn icon={ListOrdered} label="Liste numerotee" active={queryState('insertOrderedList')} onClick={() => exec('insertOrderedList')} />
        <TbBtn icon={Quote} label="Citation" onClick={() => exec('formatBlock', 'blockquote')} />

        <TbSep />

        {/* Alignment */}
        <TbBtn icon={AlignLeft} label="Aligner a gauche" onClick={() => exec('justifyLeft')} />
        <TbBtn icon={AlignCenter} label="Centrer" onClick={() => exec('justifyCenter')} />
        <TbBtn icon={AlignRight} label="Aligner a droite" onClick={() => exec('justifyRight')} />

        <TbSep />

        {/* Link & Image */}
        <TbBtn icon={Link} label="Lien (Ctrl+K)" onClick={handleLinkClick} />
        <TbBtn icon={Unlink} label="Supprimer le lien" onClick={handleUnlink} />
        <TbBtn icon={ImageIcon} label="Image" onClick={() => setShowImageDialog(true)} />
        <TbBtn icon={Minus} label="Ligne horizontale" onClick={() => exec('insertHorizontalRule')} />

        <TbSep />

        {/* Undo/Redo */}
        <TbBtn icon={Undo2} label="Annuler (Ctrl+Z)" onClick={() => exec('undo')} />
        <TbBtn icon={Redo2} label="Retablir (Ctrl+Shift+Z)" onClick={() => exec('redo')} />
        <TbBtn icon={RemoveFormatting} label="Supprimer le formatage" onClick={() => exec('removeFormat')} />

        {/* Dialogs */}
        {showLinkDialog && (
          <LinkDialog
            initialUrl={linkInitial.url}
            initialText={linkInitial.text}
            onSubmit={handleLinkSubmit}
            onCancel={() => setShowLinkDialog(false)}
          />
        )}
        {showImageDialog && (
          <ImageDialog
            onSubmit={handleImageSubmit}
            onCancel={() => setShowImageDialog(false)}
          />
        )}
      </div>

      {/* Editor area */}
      <div className="relative">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 px-4 py-3 text-sm text-muted-foreground">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          className="prose prose-sm prose-neutral max-w-none dark:prose-invert px-4 py-3 text-sm text-foreground focus:outline-none overflow-auto"
          style={{ minHeight }}
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
