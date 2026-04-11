import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Calendar,
  User,
  CheckSquare,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface ChecklistItem {
  text: string;
  done: boolean;
}

interface KanbanCard {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  assignee_id: string | null;
  assignee_name: string | null;
  due_at: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  sort_order: number;
  created_at: number;
  updated_at: number;
}

interface KanbanColumn {
  id: string;
  board_id: string;
  title: string;
  color: string;
  wip_limit: number | null;
  sort_order: number;
  cards: KanbanCard[];
}

interface KanbanBoard {
  id: string;
  festival_id: string;
  title: string;
  version: number;
  columns: KanbanColumn[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const PRIORITY_DOT_COLORS: Record<Priority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const COLUMN_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const LABEL_COLORS = [
  'bg-red-200 text-red-800',
  'bg-orange-200 text-orange-800',
  'bg-yellow-200 text-yellow-800',
  'bg-green-200 text-green-800',
  'bg-teal-200 text-teal-800',
  'bg-blue-200 text-blue-800',
  'bg-indigo-200 text-indigo-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-gray-200 text-gray-800',
];

function labelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date(new Date().toDateString());
}

function isToday(dueAt: string): boolean {
  const d = new Date(dueAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkspaceKanbanPage() {
  const { slug, boardId } = useParams<{ slug: string; boardId: string }>();
  const { festival } = useTenantStore();
  const { profile } = useAuthStore();

  // Board state
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Board title editing
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleDraft, setBoardTitleDraft] = useState('');

  // Column creation
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLUMN_COLORS[0]);
  const [submittingColumn, setSubmittingColumn] = useState(false);

  // Column menu
  const [columnMenuId, setColumnMenuId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');

  // Card creation
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [submittingCard, setSubmittingCard] = useState(false);

  // Card detail dialog
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [cardDetailOpen, setCardDetailOpen] = useState(false);

  // Card detail form state
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardPriority, setCardPriority] = useState<Priority>('medium');
  const [cardColumnId, setCardColumnId] = useState('');
  const [cardAssignee, setCardAssignee] = useState('');
  const [cardDueAt, setCardDueAt] = useState('');
  const [cardLabelsInput, setCardLabelsInput] = useState('');
  const [cardChecklist, setCardChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Toast
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────

  const fetchBoard = useCallback(async () => {
    if (!boardId) return;
    try {
      const res = await api.get<KanbanBoard>(`/workspace-tasks/${boardId}`);
      if (res.success && res.data) {
        setBoard(res.data);
        versionRef.current = res.data.version;
        setError(null);
      } else {
        setError(res.error || 'Erreur lors du chargement du tableau');
      }
    } catch {
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // ─── Collaborative Polling ──────────────────────────────────────────

  useEffect(() => {
    if (!boardId) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.get<KanbanBoard & { changed?: boolean }>(
          `/workspace-tasks/${boardId}/poll?version=${versionRef.current}`
        );
        if (res.success && res.data?.changed && res.data.columns) {
          setBoard(res.data);
          versionRef.current = res.data.version;
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [boardId]);

  // ─── Toast auto-dismiss ─────────────────────────────────────────────

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  // ─── Board Title ────────────────────────────────────────────────────

  const saveBoardTitle = async () => {
    if (!board || !boardTitleDraft.trim()) return;
    const res = await api.put(`/workspace-tasks/${board.id}`, {
      title: boardTitleDraft.trim(),
    });
    if (res.success) {
      setBoard((prev) => (prev ? { ...prev, title: boardTitleDraft.trim() } : prev));
      setMessage({ type: 'success', text: 'Titre mis a jour' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setEditingBoardTitle(false);
  };

  // ─── Column Operations ─────────────────────────────────────────────

  const createColumn = async () => {
    if (!board || !newColumnTitle.trim()) return;
    setSubmittingColumn(true);
    const res = await api.post<KanbanColumn>(`/workspace-tasks/${board.id}/columns`, {
      title: newColumnTitle.trim(),
      color: newColumnColor,
    });
    if (res.success) {
      await fetchBoard();
      setNewColumnTitle('');
      setNewColumnColor(COLUMN_COLORS[0]);
      setAddingColumn(false);
      setMessage({ type: 'success', text: 'Colonne creee' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setSubmittingColumn(false);
  };

  const saveColumnTitle = async (columnId: string) => {
    if (!editColumnTitle.trim()) return;
    const res = await api.put(`/workspace-tasks/columns/${columnId}`, {
      title: editColumnTitle.trim(),
    });
    if (res.success) {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((c) =>
            c.id === columnId ? { ...c, title: editColumnTitle.trim() } : c
          ),
        };
      });
      setMessage({ type: 'success', text: 'Colonne mise a jour' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setEditingColumnId(null);
  };

  const deleteColumn = async (columnId: string) => {
    const res = await api.delete(`/workspace-tasks/columns/${columnId}`);
    if (res.success) {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: prev.columns.filter((c) => c.id !== columnId) };
      });
      setMessage({ type: 'success', text: 'Colonne supprimee' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setColumnMenuId(null);
  };

  // ─── Card Operations ───────────────────────────────────────────────

  const createCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return;
    setSubmittingCard(true);
    const res = await api.post<KanbanCard>(`/workspace-tasks/columns/${columnId}/cards`, {
      title: newCardTitle.trim(),
      priority: 'medium',
      assignee_id: null,
      due_at: null,
    });
    if (res.success) {
      await fetchBoard();
      setNewCardTitle('');
      setAddingCardColumnId(null);
      setMessage({ type: 'success', text: 'Carte creee' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setSubmittingCard(false);
  };

  const openCardDetail = (card: KanbanCard) => {
    setSelectedCard(card);
    setCardTitle(card.title);
    setCardDescription(card.description || '');
    setCardPriority(card.priority);
    setCardColumnId(card.column_id);
    setCardAssignee(card.assignee_name || '');
    setCardDueAt(card.due_at || '');
    setCardLabelsInput(card.labels.join(', '));
    setCardChecklist(card.checklist ? [...card.checklist] : []);
    setNewChecklistItem('');
    setConfirmDelete(false);
    setCardDetailOpen(true);
  };

  const closeCardDetail = () => {
    setCardDetailOpen(false);
    setSelectedCard(null);
    setConfirmDelete(false);
  };

  const saveCard = async () => {
    if (!selectedCard || !cardTitle.trim()) return;
    setSavingCard(true);

    const labels = cardLabelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    // Update card fields
    const updateRes = await api.put(`/workspace-tasks/cards/${selectedCard.id}`, {
      title: cardTitle.trim(),
      description: cardDescription || null,
      priority: cardPriority,
      assignee_name: cardAssignee || null,
      due_at: cardDueAt || null,
      labels,
    });

    // Move card if column changed
    if (cardColumnId !== selectedCard.column_id) {
      await api.put(`/workspace-tasks/cards/${selectedCard.id}/move`, {
        column_id: cardColumnId,
        sort_order: 9999, // Append at end
      });
    }

    // Update checklist
    await api.put(`/workspace-tasks/cards/${selectedCard.id}/checklist`, {
      items: cardChecklist,
    });

    if (updateRes.success) {
      await fetchBoard();
      setMessage({ type: 'success', text: 'Carte mise a jour' });
      closeCardDetail();
    } else {
      setMessage({ type: 'error', text: updateRes.error || 'Erreur' });
    }
    setSavingCard(false);
  };

  const deleteCard = async () => {
    if (!selectedCard) return;
    setDeletingCard(true);
    const res = await api.delete(`/workspace-tasks/cards/${selectedCard.id}`);
    if (res.success) {
      await fetchBoard();
      setMessage({ type: 'success', text: 'Carte supprimee' });
      closeCardDetail();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
    setDeletingCard(false);
  };

  // ─── Checklist helpers ──────────────────────────────────────────────

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setCardChecklist((prev) => [...prev, { text: newChecklistItem.trim(), done: false }]);
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (index: number) => {
    setCardChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    );
  };

  const removeChecklistItem = (index: number) => {
    setCardChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Chargement du tableau...</span>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600">{error || 'Tableau introuvable'}</p>
        <Link
          to={`/f/${slug}/admin/workspace`}
          className="text-indigo-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour a l'espace de travail
        </Link>
      </div>
    );
  }

  const checklistProgress = (items: ChecklistItem[]) => {
    if (!items || items.length === 0) return null;
    const done = items.filter((i) => i.done).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ─── Top Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <Link
          to={`/f/${slug}/admin/workspace`}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
          title="Retour a l'espace de travail"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {editingBoardTitle ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="text-lg font-bold border-b-2 border-indigo-500 outline-none bg-transparent px-1"
              value={boardTitleDraft}
              onChange={(e) => setBoardTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveBoardTitle();
                if (e.key === 'Escape') setEditingBoardTitle(false);
              }}
            />
            <button
              onClick={saveBoardTitle}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              OK
            </button>
            <button
              onClick={() => setEditingBoardTitle(false)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setBoardTitleDraft(board.title);
              setEditingBoardTitle(true);
            }}
            className="text-lg font-bold text-gray-900 hover:text-indigo-600 flex items-center gap-1.5"
          >
            {board.title}
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* ─── Board Area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50">
        <div className="flex gap-4 p-4 h-full items-start" style={{ minWidth: 'max-content' }}>
          {/* Columns */}
          {board.columns
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((column) => {
              const cardCount = column.cards.length;
              const overWip = column.wip_limit != null && cardCount > column.wip_limit;

              return (
                <div
                  key={column.id}
                  className="flex flex-col w-72 bg-gray-100 rounded-xl shrink-0 max-h-full"
                >
                  {/* Column Header */}
                  <div className="px-3 pt-3 pb-2 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: column.color }}
                    />

                    {editingColumnId === column.id ? (
                      <input
                        autoFocus
                        className="flex-1 text-sm font-semibold border-b border-indigo-500 outline-none bg-transparent"
                        value={editColumnTitle}
                        onChange={(e) => setEditColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveColumnTitle(column.id);
                          if (e.key === 'Escape') setEditingColumnId(null);
                        }}
                        onBlur={() => saveColumnTitle(column.id)}
                      />
                    ) : (
                      <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                        {column.title}
                      </span>
                    )}

                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        overWip
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {cardCount}
                      {column.wip_limit != null && `/${column.wip_limit}`}
                    </span>

                    {/* Column menu */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setColumnMenuId(columnMenuId === column.id ? null : column.id)
                        }
                        className="p-1 rounded hover:bg-gray-200 text-gray-500"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {columnMenuId === column.id && (
                        <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-20 w-40">
                          <button
                            onClick={() => {
                              setEditColumnTitle(column.title);
                              setEditingColumnId(column.id);
                              setColumnMenuId(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Renommer
                          </button>
                          <button
                            onClick={() => deleteColumn(column.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {overWip && (
                    <div className="mx-3 mb-1 flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      Limite WIP depassee
                    </div>
                  )}

                  {/* Card Stack */}
                  <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-0">
                    {column.cards
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((card) => {
                        const progress = checklistProgress(card.checklist);

                        return (
                          <button
                            key={card.id}
                            onClick={() => openCardDetail(card)}
                            className="w-full text-left bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-shadow cursor-pointer"
                          >
                            {/* Labels dots */}
                            {card.labels && card.labels.length > 0 && (
                              <div className="flex gap-1 mb-1.5 flex-wrap">
                                {card.labels.map((label, i) => (
                                  <span
                                    key={i}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${labelColor(label)}`}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Title */}
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {card.title}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                {/* Priority */}
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[card.priority]}`}
                                >
                                  {PRIORITY_LABELS[card.priority]}
                                </span>

                                {/* Due date */}
                                {card.due_at && (
                                  <span
                                    className={`flex items-center gap-0.5 text-[10px] font-medium ${
                                      isOverdue(card.due_at)
                                        ? 'text-red-600'
                                        : isToday(card.due_at)
                                          ? 'text-amber-600'
                                          : 'text-gray-500'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {formatDateShort(card.due_at)}
                                  </span>
                                )}

                                {/* Checklist progress */}
                                {progress && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <CheckSquare className="w-3 h-3" />
                                    {progress.done}/{progress.total}
                                  </span>
                                )}
                              </div>

                              {/* Assignee */}
                              {card.assignee_name && (
                                <span
                                  className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0"
                                  title={card.assignee_name}
                                >
                                  {initials(card.assignee_name)}
                                </span>
                              )}
                            </div>

                            {/* Checklist progress bar */}
                            {progress && (
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full transition-all ${
                                    progress.pct === 100 ? 'bg-green-500' : 'bg-indigo-500'
                                  }`}
                                  style={{ width: `${progress.pct}%` }}
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>

                  {/* Add card */}
                  <div className="px-3 pb-3 pt-1">
                    {addingCardColumnId === column.id ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Titre de la carte..."
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !submittingCard) createCard(column.id);
                            if (e.key === 'Escape') {
                              setAddingCardColumnId(null);
                              setNewCardTitle('');
                            }
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => createCard(column.id)}
                            disabled={submittingCard || !newCardTitle.trim()}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {submittingCard && <Loader2 className="w-3 h-3 animate-spin" />}
                            Ajouter
                          </button>
                          <button
                            onClick={() => {
                              setAddingCardColumnId(null);
                              setNewCardTitle('');
                            }}
                            className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingCardColumnId(column.id);
                          setNewCardTitle('');
                        }}
                        className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-lg py-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une carte
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Add column */}
          <div className="w-72 shrink-0">
            {addingColumn ? (
              <div className="bg-gray-100 rounded-xl p-3 space-y-3">
                <input
                  autoFocus
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nom de la colonne..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !submittingColumn) createColumn();
                    if (e.key === 'Escape') setAddingColumn(false);
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newColumnColor === color
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={createColumn}
                    disabled={submittingColumn || !newColumnTitle.trim()}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {submittingColumn && <Loader2 className="w-3 h-3 animate-spin" />}
                    Creer
                  </button>
                  <button
                    onClick={() => setAddingColumn(false)}
                    className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-gray-200 rounded-xl py-3 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter une colonne
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Card Detail Dialog ────────────────────────────────────────── */}
      {cardDetailOpen && selectedCard && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-12 px-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closeCardDetail}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto z-50">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div className="flex-1 mr-3">
                <input
                  className="w-full text-lg font-bold border-0 outline-none focus:border-b-2 focus:border-indigo-500 bg-transparent"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="Titre de la carte"
                />
              </div>
              <button
                onClick={closeCardDetail}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Description
                </label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                  placeholder="Ajouter une description..."
                />
              </div>

              {/* Two-column layout for meta */}
              <div className="grid grid-cols-2 gap-4">
                {/* Column / Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                    Colonne
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={cardColumnId}
                    onChange={(e) => setCardColumnId(e.target.value)}
                  >
                    {board.columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                    Priorite
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={cardPriority}
                    onChange={(e) => setCardPriority(e.target.value as Priority)}
                  >
                    {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                    Responsable
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nom du responsable..."
                      value={cardAssignee}
                      onChange={(e) => setCardAssignee(e.target.value)}
                    />
                  </div>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                    Date limite
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={cardDueAt}
                      onChange={(e) => setCardDueAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                  Labels (separes par des virgules)
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: design, urgent, frontend"
                  value={cardLabelsInput}
                  onChange={(e) => setCardLabelsInput(e.target.value)}
                />
                {cardLabelsInput && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cardLabelsInput
                      .split(',')
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .map((label, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${labelColor(label)}`}
                        >
                          {label}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Checklist
                </label>

                {cardChecklist.length > 0 && (
                  <>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            cardChecklist.every((i) => i.done)
                              ? 'bg-green-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{
                            width: `${
                              cardChecklist.length > 0
                                ? Math.round(
                                    (cardChecklist.filter((i) => i.done).length /
                                      cardChecklist.length) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {cardChecklist.filter((i) => i.done).length}/{cardChecklist.length}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-2">
                      {cardChecklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleChecklistItem(i)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              item.done ? 'line-through text-gray-400' : 'text-gray-700'
                            }`}
                          >
                            {item.text}
                          </span>
                          <button
                            onClick={() => removeChecklistItem(i)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Add item */}
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nouvel element..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addChecklistItem();
                    }}
                  />
                  <button
                    onClick={addChecklistItem}
                    disabled={!newChecklistItem.trim()}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">Confirmer la suppression ?</span>
                      <button
                        onClick={deleteCard}
                        disabled={deletingCard}
                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {deletingCard && <Loader2 className="w-3 h-3 animate-spin" />}
                        Supprimer
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer la carte
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={closeCardDetail}
                    className="text-sm px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveCard}
                    disabled={savingCard || !cardTitle.trim()}
                    className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {savingCard && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
