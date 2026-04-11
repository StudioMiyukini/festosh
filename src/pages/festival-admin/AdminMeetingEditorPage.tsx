import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  GripVertical,
  Trash2,
  Plus,
  Type,
  Heading,
  ListChecks,
  ClipboardList,
  BarChart3,
  Minus,
  StickyNote,
  Gavel,
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  Vote,
  Info,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import type {
  Meeting,
  MeetingBlock,
  MeetingBlockType,
  MeetingStatus,
  AttendeeStatus,
  ChecklistItem,
  ChecklistItemStatus,
  ActionItem,
  ActionItemStatus,
  NoteType,
  DecisionStatus,
  HeadingContent,
  TextContent,
  ChecklistContent,
  ActionContent,
  PollContent,
  SeparatorContent,
  NoteContent,
  DecisionContent,
  MeetingBlockContent,
  MeetingAttendee,
} from '@/types/meeting';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  planned: 'Planifiee',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
};

const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const ATTENDEE_STATUS_LABELS: Record<AttendeeStatus, string> = {
  invited: 'Invite',
  accepted: 'Accepte',
  declined: 'Decline',
};

const ATTENDEE_STATUS_COLORS: Record<AttendeeStatus, string> = {
  invited: 'bg-gray-100 text-gray-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

const CHECKLIST_STATUS_CYCLE: ChecklistItemStatus[] = ['pending', 'done', 'cancelled'];

const ACTION_STATUS_LABELS: Record<ActionItemStatus, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  done: 'Termine',
  cancelled: 'Annule',
};

const ACTION_STATUS_COLORS: Record<ActionItemStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const NOTE_TYPE_COLORS: Record<NoteType, { border: string; bg: string; text: string }> = {
  info: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
  success: { border: 'border-l-green-500', bg: 'bg-green-50', text: 'text-green-800' },
};

const NOTE_TYPE_ICONS: Record<NoteType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
};

const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: 'Proposee',
  accepted: 'Acceptee',
  rejected: 'Rejetee',
};

const DECISION_STATUS_COLORS: Record<DecisionStatus, { border: string; bg: string; badge: string }> = {
  proposed: { border: 'border-l-gray-400', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700' },
  accepted: { border: 'border-l-green-500', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  rejected: { border: 'border-l-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
};

interface BlockTypeMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCK_TYPE_META: Record<MeetingBlockType, BlockTypeMeta> = {
  text: { label: 'Texte', icon: Type },
  heading: { label: 'Titre', icon: Heading },
  checklist: { label: 'Checklist', icon: ListChecks },
  action: { label: 'Actions', icon: ClipboardList },
  poll: { label: 'Sondage', icon: BarChart3 },
  separator: { label: 'Separateur', icon: Minus },
  note: { label: 'Note', icon: StickyNote },
  decision: { label: 'Decision', icon: Gavel },
};

const BLOCK_TYPE_ORDER: MeetingBlockType[] = [
  'text', 'heading', 'checklist', 'action', 'poll', 'separator', 'note', 'decision',
];

// ─── Default content factories ────────────────────────────────────────────────

function defaultContentForType(type: MeetingBlockType): MeetingBlockContent {
  switch (type) {
    case 'text':
      return { body: '' } as TextContent;
    case 'heading':
      return { body: '', level: 2 } as HeadingContent;
    case 'checklist':
      return { items: [] } as ChecklistContent;
    case 'action':
      return { items: [] } as ActionContent;
    case 'poll':
      return { question: '', options: [], multiple: false, closed: false } as PollContent;
    case 'separator':
      return { _type: 'separator' } as SeparatorContent;
    case 'note':
      return { body: '', note_type: 'info' } as NoteContent;
    case 'decision':
      return { body: '', status: 'proposed' } as DecisionContent;
  }
}

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: unknown[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  ) as T;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminMeetingEditorPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  useTenantStore();
  const { profile } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [blocks, setBlocks] = useState<MeetingBlock[]>([]);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [version, setVersion] = useState(0);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState({ date: '', duration: 60, location: '' });
  const [addAttendeeOpen, setAddAttendeeOpen] = useState(false);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');

  // Track which block is focused so polling doesn't clobber edits
  const focusedBlockIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval>>();

  // ─── Fetch meeting ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get<Meeting & { blocks: MeetingBlock[]; attendees: MeetingAttendee[] }>(
          `/meetings/${meetingId}`,
        );
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(res.error || 'Impossible de charger la reunion');
        } else {
          setMeeting(res.data);
          setBlocks((res.data.blocks ?? []).sort((a, b) => a.sort_order - b.sort_order));
          setAttendees(res.data.attendees ?? []);
          setVersion(res.data.version ?? 0);
        }
      } catch {
        if (!cancelled) setError('Erreur de chargement de la reunion');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [meetingId]);

  // ─── Polling ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!meetingId) return;
    pollTimerRef.current = setInterval(async () => {
      const res = await api.get<{ changed: boolean; version: number; blocks?: MeetingBlock[] }>(
        `/meetings/${meetingId}/poll?version=${version}`,
      );
      if (res.success && res.data?.changed && res.data.blocks) {
        const incoming = res.data.blocks.sort((a, b) => a.sort_order - b.sort_order);
        setBlocks((prev) => {
          // Merge: keep local content for focused block
          const focusedId = focusedBlockIdRef.current;
          return incoming.map((ib) => {
            if (ib.id === focusedId) {
              const local = prev.find((b) => b.id === focusedId);
              return local ? { ...ib, content: local.content } : ib;
            }
            return ib;
          });
        });
        setVersion(res.data.version);
      }
    }, 3000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [meetingId, version]);

  // ─── Flash helper ───────────────────────────────────────────────────────

  const flash = useCallback((msg: string) => {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 1500);
  }, []);

  // ─── Block CRUD ─────────────────────────────────────────────────────────

  const addBlock = useCallback(
    async (type: MeetingBlockType) => {
      if (!meetingId) return;
      const res = await api.post<MeetingBlock>(`/meetings/${meetingId}/blocks`, {
        block_type: type,
        content: defaultContentForType(type),
      });
      if (res.success && res.data) {
        setBlocks((prev) => [...prev, res.data!]);
      }
    },
    [meetingId],
  );

  const saveBlock = useCallback(
    async (blockId: string, content: MeetingBlockContent) => {
      const res = await api.put<MeetingBlock>(`/meetings/blocks/${blockId}`, { content });
      if (res.success) {
        flash('Enregistre');
      }
    },
    [flash],
  );

  const debouncedSave = useDebouncedCallback(
    (blockId: string, content: MeetingBlockContent) => {
      saveBlock(blockId, content);
    },
    500,
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      const res = await api.delete(`/meetings/blocks/${blockId}`);
      if (res.success) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      }
    },
    [],
  );

  const updateBlockContent = useCallback(
    (blockId: string, updater: (prev: MeetingBlockContent) => MeetingBlockContent) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          const next = updater(b.content);
          return { ...b, content: next };
        }),
      );
    },
    [],
  );

  const reorderBlocks = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (!meetingId) return;
      setBlocks((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return next.map((b, i) => ({ ...b, sort_order: i }));
      });
      // Defer API call
      setTimeout(async () => {
        const ordered = [...blocks];
        const [moved] = ordered.splice(fromIdx, 1);
        ordered.splice(toIdx, 0, moved);
        await api.put(`/meetings/${meetingId}/blocks/reorder`, {
          block_ids: ordered.map((b) => b.id),
        });
      }, 0);
    },
    [meetingId, blocks],
  );

  // ─── Meeting field updates ──────────────────────────────────────────────

  const saveTitle = useCallback(async () => {
    if (!meetingId || !titleDraft.trim()) return;
    const res = await api.put(`/meetings/${meetingId}`, { title: titleDraft.trim() });
    if (res.success) {
      setMeeting((m) => (m ? { ...m, title: titleDraft.trim() } : m));
      flash('Enregistre');
    }
    setEditingTitle(false);
  }, [meetingId, titleDraft, flash]);

  const saveSchedule = useCallback(async () => {
    if (!meetingId) return;
    const payload: Record<string, unknown> = {
      duration_minutes: scheduleDraft.duration,
      location: scheduleDraft.location || null,
    };
    if (scheduleDraft.date) {
      payload.scheduled_at = Math.floor(new Date(scheduleDraft.date).getTime() / 1000);
    }
    const res = await api.put(`/meetings/${meetingId}`, payload);
    if (res.success) {
      setMeeting((m) =>
        m
          ? {
              ...m,
              scheduled_at: scheduleDraft.date
                ? Math.floor(new Date(scheduleDraft.date).getTime() / 1000)
                : m.scheduled_at,
              duration_minutes: scheduleDraft.duration,
              location: scheduleDraft.location || null,
            }
          : m,
      );
      flash('Enregistre');
    }
    setEditingSchedule(false);
  }, [meetingId, scheduleDraft, flash]);

  const addAttendee = useCallback(async () => {
    if (!meetingId || !newAttendeeEmail.trim()) return;
    const res = await api.post<MeetingAttendee>(`/meetings/${meetingId}/attendees`, {
      email: newAttendeeEmail.trim(),
    });
    if (res.success && res.data) {
      setAttendees((prev) => [...prev, res.data!]);
      setNewAttendeeEmail('');
      setAddAttendeeOpen(false);
    }
  }, [meetingId, newAttendeeEmail]);

  // ─── Vote ───────────────────────────────────────────────────────────────

  const castVote = useCallback(
    async (blockId: string, optionId: string) => {
      const res = await api.post(`/meetings/blocks/${blockId}/vote`, { option_id: optionId });
      if (res.success) {
        // Optimistic update
        setBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== blockId || b.block_type !== 'poll') return b;
            const content = b.content as PollContent;
            const userId = profile?.id ?? '';
            const options = content.options.map((opt) => {
              if (opt.id === optionId) {
                return {
                  ...opt,
                  votes: opt.votes.includes(userId) ? opt.votes : [...opt.votes, userId],
                };
              }
              if (!content.multiple) {
                return { ...opt, votes: opt.votes.filter((v) => v !== userId) };
              }
              return opt;
            });
            return { ...b, content: { ...content, options } };
          }),
        );
      }
    },
    [profile],
  );

  // ─── Drag state ─────────────────────────────────────────────────────────

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // ─── Render loading / error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Chargement de la reunion...</span>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error || 'Reunion introuvable'}</p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <aside className="flex w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-muted/30 p-4">
        {/* Title */}
        <div>
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                className="w-full rounded border border-border bg-background px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
            </div>
          ) : (
            <h2
              className="cursor-pointer text-lg font-semibold hover:text-primary"
              onClick={() => {
                setTitleDraft(meeting.title);
                setEditingTitle(true);
              }}
            >
              {meeting.title}
            </h2>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${MEETING_STATUS_COLORS[meeting.status]}`}
          >
            {MEETING_STATUS_LABELS[meeting.status]}
          </span>
        </div>

        {/* Schedule info */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Planification
          </label>
          {editingSchedule ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="datetime-local"
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={scheduleDraft.date}
                  onChange={(e) =>
                    setScheduleDraft((d) => ({ ...d, date: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min={5}
                  step={5}
                  className="w-20 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={scheduleDraft.duration}
                  onChange={(e) =>
                    setScheduleDraft((d) => ({ ...d, duration: Number(e.target.value) }))
                  }
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Lieu"
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={scheduleDraft.location}
                  onChange={(e) =>
                    setScheduleDraft((d) => ({ ...d, location: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={saveSchedule}
                  className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setEditingSchedule(false)}
                  className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div
              className="cursor-pointer space-y-1 rounded p-1.5 hover:bg-muted"
              onClick={() => {
                setScheduleDraft({
                  date: meeting.scheduled_at
                    ? new Date(meeting.scheduled_at * 1000).toISOString().slice(0, 16)
                    : '',
                  duration: meeting.duration_minutes,
                  location: meeting.location ?? '',
                });
                setEditingSchedule(true);
              }}
            >
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {meeting.scheduled_at ? formatTimestamp(meeting.scheduled_at) : 'Non planifie'}
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {meeting.duration_minutes} min
              </div>
              {meeting.location && (
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {meeting.location}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attendees */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              Participants ({attendees.length})
            </label>
          </div>
          <ul className="space-y-1.5">
            {attendees.map((att) => (
              <li key={att.id} className="flex items-center gap-2">
                {att.avatar_url ? (
                  <img
                    src={att.avatar_url}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                    {(att.display_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 truncate text-sm">{att.display_name ?? 'Inconnu'}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ATTENDEE_STATUS_COLORS[att.status]}`}
                >
                  {ATTENDEE_STATUS_LABELS[att.status]}
                </span>
              </li>
            ))}
          </ul>

          {addAttendeeOpen ? (
            <div className="mt-2 flex gap-1">
              <input
                autoFocus
                type="email"
                placeholder="email@exemple.com"
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={newAttendeeEmail}
                onChange={(e) => setNewAttendeeEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addAttendee();
                  if (e.key === 'Escape') setAddAttendeeOpen(false);
                }}
              />
              <button
                onClick={addAttendee}
                className="rounded bg-primary px-1.5 text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setAddAttendeeOpen(false)}
                className="rounded px-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddAttendeeOpen(true)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Ajouter participant
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          {BLOCK_TYPE_ORDER.map((type) => {
            const meta = BLOCK_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                title={`Ajouter ${meta.label}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}

          {savedFlash && (
            <span className="ml-auto animate-pulse text-xs text-green-600">{savedFlash}</span>
          )}
        </div>

        {/* Blocks */}
        <div className="flex-1 p-4">
          {blocks.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <Plus className="mb-2 h-8 w-8" />
              <p className="text-sm">
                Aucun bloc. Utilisez la barre d&apos;outils pour ajouter du contenu.
              </p>
            </div>
          )}

          <div className="mx-auto max-w-3xl space-y-3">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                className={`group relative rounded-lg border bg-card transition-shadow ${
                  dragIdx === idx ? 'border-primary shadow-md' : 'border-border'
                }`}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIdx !== null && dragIdx !== idx) {
                    reorderBlocks(dragIdx, idx);
                    setDragIdx(idx);
                  }
                }}
                onDragEnd={() => setDragIdx(null)}
              >
                {/* Block header bar */}
                <div className="flex items-center gap-1 border-b border-border/50 px-2 py-1">
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {BLOCK_TYPE_META[block.block_type].label}
                  </span>
                  {block.updated_by_name && (
                    <span className="ml-auto mr-1 text-[10px] text-muted-foreground">
                      modifie par {block.updated_by_name}
                    </span>
                  )}
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    title="Supprimer le bloc"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Block body */}
                <div
                  className="p-3"
                  onFocus={() => {
                    focusedBlockIdRef.current = block.id;
                  }}
                  onBlur={() => {
                    focusedBlockIdRef.current = null;
                    saveBlock(block.id, block.content);
                  }}
                >
                  <BlockBody
                    block={block}
                    updateContent={(updater) => updateBlockContent(block.id, updater)}
                    debouncedSave={(content) => debouncedSave(block.id, content)}
                    onVote={(optionId) => castVote(block.id, optionId)}
                    currentUserId={profile?.id ?? ''}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Block body renderer ──────────────────────────────────────────────────────

function BlockBody({
  block,
  updateContent,
  debouncedSave,
  onVote,
  currentUserId,
}: {
  block: MeetingBlock;
  updateContent: (updater: (prev: MeetingBlockContent) => MeetingBlockContent) => void;
  debouncedSave: (content: MeetingBlockContent) => void;
  onVote: (optionId: string) => void;
  currentUserId: string;
}) {
  switch (block.block_type) {
    case 'text':
      return (
        <TextBlock
          content={block.content as TextContent}
          onChange={(c) => {
            updateContent(() => c);
            debouncedSave(c);
          }}
        />
      );
    case 'heading':
      return (
        <HeadingBlock
          content={block.content as HeadingContent}
          onChange={(c) => {
            updateContent(() => c);
            debouncedSave(c);
          }}
        />
      );
    case 'checklist':
      return (
        <ChecklistBlock
          content={block.content as ChecklistContent}
          onChange={(c) => {
            updateContent(() => c);
          }}
        />
      );
    case 'action':
      return (
        <ActionBlock
          content={block.content as ActionContent}
          onChange={(c) => {
            updateContent(() => c);
          }}
        />
      );
    case 'poll':
      return (
        <PollBlock
          content={block.content as PollContent}
          onChange={(c) => {
            updateContent(() => c);
          }}
          onVote={onVote}
          currentUserId={currentUserId}
        />
      );
    case 'separator':
      return <hr className="my-2 border-border" />;
    case 'note':
      return (
        <NoteBlock
          content={block.content as NoteContent}
          onChange={(c) => {
            updateContent(() => c);
            debouncedSave(c);
          }}
        />
      );
    case 'decision':
      return (
        <DecisionBlock
          content={block.content as DecisionContent}
          onChange={(c) => {
            updateContent(() => c);
            debouncedSave(c);
          }}
        />
      );
    default:
      return <p className="text-xs text-muted-foreground">Type de bloc inconnu</p>;
  }
}

// ─── Text block ───────────────────────────────────────────────────────────────

function TextBlock({
  content,
  onChange,
}: {
  content: TextContent;
  onChange: (c: TextContent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [content.body, autoResize]);

  return (
    <textarea
      ref={ref}
      className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
      placeholder="Saisissez du texte..."
      value={content.body}
      onChange={(e) => {
        onChange({ body: e.target.value });
        autoResize();
      }}
      rows={1}
    />
  );
}

// ─── Heading block ────────────────────────────────────────────────────────────

function HeadingBlock({
  content,
  onChange,
}: {
  content: HeadingContent;
  onChange: (c: HeadingContent) => void;
}) {
  const sizeClasses: Record<number, string> = {
    1: 'text-2xl font-bold',
    2: 'text-xl font-semibold',
    3: 'text-lg font-medium',
  };

  return (
    <div className="flex items-start gap-2">
      <input
        className={`flex-1 bg-transparent placeholder:text-muted-foreground focus:outline-none ${sizeClasses[content.level] ?? sizeClasses[2]}`}
        placeholder="Titre..."
        value={content.body}
        onChange={(e) => onChange({ ...content, body: e.target.value })}
      />
      <div className="flex shrink-0 gap-0.5 rounded border border-border p-0.5">
        {([1, 2, 3] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => onChange({ ...content, level: lvl })}
            className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
              content.level === lvl
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            H{lvl}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Checklist block ──────────────────────────────────────────────────────────

const CHECKLIST_STATUS_STYLES: Record<ChecklistItemStatus, { color: string; decor: string }> = {
  pending: { color: 'border-gray-400 bg-white', decor: '' },
  done: { color: 'border-green-500 bg-green-500', decor: 'line-through text-muted-foreground' },
  cancelled: { color: 'border-red-500 bg-red-500', decor: 'line-through text-muted-foreground' },
};

function ChecklistBlock({
  content,
  onChange,
}: {
  content: ChecklistContent;
  onChange: (c: ChecklistContent) => void;
}) {
  const cycleStatus = (current: ChecklistItemStatus): ChecklistItemStatus => {
    const idx = CHECKLIST_STATUS_CYCLE.indexOf(current);
    return CHECKLIST_STATUS_CYCLE[(idx + 1) % CHECKLIST_STATUS_CYCLE.length];
  };

  const updateItem = (id: string, patch: Partial<ChecklistItem>) => {
    onChange({
      items: content.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: content.items.filter((it) => it.id !== id) });
  };

  const addItem = () => {
    onChange({
      items: [...content.items, { id: uid(), text: '', status: 'pending' }],
    });
  };

  return (
    <div className="space-y-1.5">
      {content.items.map((item) => {
        const style = CHECKLIST_STATUS_STYLES[item.status];
        return (
          <div key={item.id} className="flex items-center gap-2">
            <button
              onClick={() => updateItem(item.id, { status: cycleStatus(item.status) })}
              className={`h-4 w-4 shrink-0 rounded border-2 transition-colors ${style.color}`}
              title="Changer le statut"
            >
              {item.status === 'done' && <Check className="h-3 w-3 text-white" />}
              {item.status === 'cancelled' && <X className="h-3 w-3 text-white" />}
            </button>
            <input
              className={`flex-1 bg-transparent text-sm focus:outline-none ${style.decor}`}
              placeholder="Nouvel element..."
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
            />
            <button
              onClick={() => removeItem(item.id)}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <Plus className="h-3 w-3" />
        Ajouter un element
      </button>
    </div>
  );
}

// ─── Action block ─────────────────────────────────────────────────────────────

function ActionBlock({
  content,
  onChange,
}: {
  content: ActionContent;
  onChange: (c: ActionContent) => void;
}) {
  const updateItem = (id: string, patch: Partial<ActionItem>) => {
    onChange({
      items: content.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const removeItem = (id: string) => {
    onChange({ items: content.items.filter((it) => it.id !== id) });
  };

  const addItem = () => {
    onChange({
      items: [
        ...content.items,
        { id: uid(), text: '', assignee: '', status: 'todo' as ActionItemStatus, due_date: '' },
      ],
    });
  };

  return (
    <div className="space-y-2">
      {content.items.map((item) => {
        const statusColor = ACTION_STATUS_COLORS[item.status];
        return (
          <div key={item.id} className="rounded border border-border p-2">
            <div className="flex items-start gap-2">
              <input
                className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                placeholder="Action..."
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
              />
              <button
                onClick={() => removeItem(item.id)}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                className="rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Responsable"
                value={item.assignee}
                onChange={(e) => updateItem(item.id, { assignee: e.target.value })}
              />
              <select
                value={item.status}
                onChange={(e) =>
                  updateItem(item.id, { status: e.target.value as ActionItemStatus })
                }
                className={`rounded px-2 py-0.5 text-xs font-medium focus:outline-none ${statusColor}`}
              >
                {(Object.keys(ACTION_STATUS_LABELS) as ActionItemStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ACTION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="rounded border border-border bg-background px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                value={item.due_date}
                onChange={(e) => updateItem(item.id, { due_date: e.target.value })}
              />
            </div>
          </div>
        );
      })}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <Plus className="h-3 w-3" />
        Ajouter une action
      </button>
    </div>
  );
}

// ─── Poll block ───────────────────────────────────────────────────────────────

function PollBlock({
  content,
  onChange,
  onVote,
  currentUserId,
}: {
  content: PollContent;
  onChange: (c: PollContent) => void;
  onVote: (optionId: string) => void;
  currentUserId: string;
}) {
  const addOption = () => {
    onChange({
      ...content,
      options: [...content.options, { id: uid(), text: '', votes: [] }],
    });
  };

  const updateOption = (id: string, text: string) => {
    onChange({
      ...content,
      options: content.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const removeOption = (id: string) => {
    onChange({
      ...content,
      options: content.options.filter((o) => o.id !== id),
    });
  };

  const totalVotes = Array.isArray(content?.options) ? content.options.reduce((sum, o) => sum + (Array.isArray(o?.votes) ? o.votes.length : 0), 0) : 0;

  return (
    <div className="space-y-3">
      <input
        className="w-full bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
        placeholder="Question du sondage..."
        value={content.question}
        onChange={(e) => onChange({ ...content, question: e.target.value })}
      />

      <div className="space-y-2">
        {content.options.map((opt) => {
          const voted = opt.votes.includes(currentUserId);
          const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

          return (
            <div key={opt.id} className="flex items-center gap-2">
              <div className="relative flex-1 overflow-hidden rounded border border-border">
                {/* Percentage bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center gap-2 px-2 py-1.5">
                  {content.closed ? (
                    <span className="flex-1 text-sm">{opt.text}</span>
                  ) : (
                    <input
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      placeholder="Option..."
                      value={opt.text}
                      onChange={(e) => updateOption(opt.id, e.target.value)}
                    />
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''} ({pct}%)
                  </span>
                </div>
              </div>

              {!content.closed && (
                <>
                  <button
                    onClick={() => onVote(opt.id)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      voted
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Vote className="inline h-3 w-3" /> Voter
                  </button>
                  <button
                    onClick={() => removeOption(opt.id)}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {!content.closed && (
          <button
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            Ajouter option
          </button>
        )}
        <button
          onClick={() => onChange({ ...content, closed: !content.closed })}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          {content.closed ? 'Rouvrir le sondage' : 'Fermer le sondage'}
        </button>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={content.multiple}
            onChange={(e) => onChange({ ...content, multiple: e.target.checked })}
            className="rounded border-border"
          />
          Multiple
        </label>
      </div>
    </div>
  );
}

// ─── Note block ───────────────────────────────────────────────────────────────

function NoteBlock({
  content,
  onChange,
}: {
  content: NoteContent;
  onChange: (c: NoteContent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const colors = NOTE_TYPE_COLORS[content.note_type];
  const NoteIcon = NOTE_TYPE_ICONS[content.note_type];

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [content.body, autoResize]);

  return (
    <div className={`rounded border-l-4 p-3 ${colors.border} ${colors.bg}`}>
      <div className="mb-2 flex items-center gap-2">
        <NoteIcon className={`h-4 w-4 ${colors.text}`} />
        <div className="flex gap-0.5 rounded border border-border bg-background p-0.5">
          {(Object.keys(NOTE_TYPE_COLORS) as NoteType[]).map((t) => {
            const TIcon = NOTE_TYPE_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => onChange({ ...content, note_type: t })}
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                  content.note_type === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                <TIcon className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      </div>
      <textarea
        ref={ref}
        className={`w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none ${colors.text}`}
        placeholder="Contenu de la note..."
        value={content.body}
        onChange={(e) => {
          onChange({ ...content, body: e.target.value });
          autoResize();
        }}
        rows={1}
      />
    </div>
  );
}

// ─── Decision block ───────────────────────────────────────────────────────────

function DecisionBlock({
  content,
  onChange,
}: {
  content: DecisionContent;
  onChange: (c: DecisionContent) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const colors = DECISION_STATUS_COLORS[content.status];

  const autoResize = useCallback(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [content.body, autoResize]);

  return (
    <div className={`rounded border-l-4 p-3 ${colors.border} ${colors.bg}`}>
      <div className="mb-2 flex items-center gap-2">
        <Gavel className="h-4 w-4 text-foreground" />
        <span className="text-xs font-semibold text-foreground">Decision</span>
        <select
          value={content.status}
          onChange={(e) =>
            onChange({ ...content, status: e.target.value as DecisionStatus })
          }
          className={`ml-auto rounded px-2 py-0.5 text-xs font-medium focus:outline-none ${colors.badge}`}
        >
          {(Object.keys(DECISION_STATUS_LABELS) as DecisionStatus[]).map((s) => (
            <option key={s} value={s}>
              {DECISION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        ref={ref}
        className="w-full resize-none bg-transparent text-sm font-medium leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        placeholder="Description de la decision..."
        value={content.body}
        onChange={(e) => {
          onChange({ ...content, body: e.target.value });
          autoResize();
        }}
        rows={1}
      />
    </div>
  );
}
