import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Ticket,
  MessageSquare,
  Send,
  Eye,
  Clock,
  CircleDot,
  CheckCircle2,
  XCircle,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { api, ApiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/use-debounce';
import { formatTimestamp } from '@/lib/format-utils';

/* ---------- Types ---------- */

interface TicketMessage {
  id: string;
  ticket_id: string;
  content: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_name: string | null;
  is_internal: boolean;
  created_at: number;
}

interface TicketItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  festival_id: string | null;
  festival_name: string | null;
  festival_slug: string | null;
  user_id: string | null;
  user_name: string | null;
  guest_name: string | null;
  guest_email: string | null;
  assigned_to: string | null;
  message_count: number;
  created_at: number;
  updated_at: number;
}

interface TicketDetail extends TicketItem {
  messages: TicketMessage[];
}

interface TicketStats {
  by_status: Record<string, number>;
  total: number;
}

/* ---------- Constants ---------- */

const PAGE_SIZE = 20;

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  waiting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting: 'En attente',
  resolved: 'Resolu',
  closed: 'Ferme',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <CircleDot className="h-3.5 w-3.5" />,
  in_progress: <Clock className="h-3.5 w-3.5" />,
  waiting: <Pause className="h-3.5 w-3.5" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5" />,
  closed: <XCircle className="h-3.5 w-3.5" />,
};

const STAT_CARD_STYLES: Record<string, { border: string; text: string; bg: string }> = {
  open: {
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  in_progress: {
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  waiting: {
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  resolved: {
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  closed: {
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/40',
  },
};

/* ---------- Component ---------- */

export function PlatformAdminTickets() {
  // List state
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<TicketStats>({ by_status: {}, total: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Detail actions
  const [updatingField, setUpdatingField] = useState<string | null>(null);
  const [assignInput, setAssignInput] = useState('');

  // Reply
  const [replyContent, setReplyContent] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const debouncedStatus = useDebounce(statusFilter, 200);
  const debouncedPriority = useDebounce(priorityFilter, 200);

  /* ---- Fetch ticket list ---- */
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const qs = ApiClient.queryString({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: debouncedStatus || undefined,
      priority: debouncedPriority || undefined,
    });

    const res = await api.get<TicketItem[]>(`/platform-admin/tickets${qs}`);

    if (res.success && res.data) {
      const raw = res as unknown as { data: TicketItem[]; stats: TicketStats; pagination: { total: number } };
      setTickets(Array.isArray(res.data) ? res.data : []);
      setTotal(raw.pagination?.total ?? res.pagination?.total ?? res.data.length);
      if (raw.stats) {
        setStats(raw.stats);
      }
    } else {
      setError(res.error || 'Erreur lors du chargement des tickets');
    }
    setLoading(false);
  }, [page, debouncedStatus, debouncedPriority]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  /* ---- Fetch ticket detail ---- */
  const openTicket = async (ticketId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedTicket(null);
    setReplyContent('');
    setReplyInternal(false);
    setAssignInput('');

    const res = await api.get<TicketDetail>(`/tickets/${ticketId}`);
    if (res.success && res.data) {
      const detail = res.data as TicketDetail;
      setSelectedTicket(detail);
      setAssignInput(detail.assigned_to || '');
    } else {
      setDetailError(res.error || 'Erreur lors du chargement du ticket');
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedTicket(null);
    setDetailError(null);
  };

  /* ---- Update ticket field ---- */
  const updateTicket = async (field: string, value: string) => {
    if (!selectedTicket) return;
    setUpdatingField(field);

    const res = await api.put<TicketDetail>(`/tickets/${selectedTicket.id}`, { [field]: value });
    if (res.success && res.data) {
      setSelectedTicket((prev) => (prev ? { ...prev, ...res.data } : prev));
      fetchTickets();
      setMessage({ type: 'success', text: 'Ticket mis a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour' });
    }
    setUpdatingField(null);
  };

  /* ---- Send reply ---- */
  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;
    setSending(true);

    const res = await api.post<TicketMessage>(`/tickets/${selectedTicket.id}/messages`, {
      content: replyContent.trim(),
      sender_type: 'admin',
      is_internal: replyInternal,
    });

    if (res.success && res.data) {
      setSelectedTicket((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: [...prev.messages, res.data as TicketMessage] };
      });
      setReplyContent('');
      setReplyInternal(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'envoi' });
    }
    setSending(false);
  };

  /* ---- Helpers ---- */
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  const authorDisplay = (t: TicketItem | TicketDetail) => {
    if (t.user_name) return t.user_name;
    if (t.guest_name) return `${t.guest_name}${t.guest_email ? ` (${t.guest_email})` : ''}`;
    if (t.guest_email) return t.guest_email;
    return 'Anonyme';
  };

  /* ---------- Render ---------- */
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tickets de support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez les tickets de support de tous les festivals.
        </p>
      </div>

      {/* Flash message */}
      {message && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map((key) => {
          const style = STAT_CARD_STYLES[key];
          const count = stats.by_status[key] ?? 0;
          return (
            <div
              key={key}
              className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
            >
              <p className={`text-2xl font-bold ${style.text}`}>{count}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[key]}</p>
            </div>
          );
        })}
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Tous les statuts</option>
          <option value="open">Ouvert</option>
          <option value="in_progress">En cours</option>
          <option value="waiting">En attente</option>
          <option value="resolved">Resolu</option>
          <option value="closed">Ferme</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Toutes les priorites</option>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
        <span className="text-xs text-muted-foreground">{total} ticket(s)</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Sujet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Festival
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Auteur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Priorite
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Messages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Derniere maj
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-muted-foreground">
                      {shortId(ticket.id)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openTicket(ticket.id)}
                        className="text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {ticket.subject}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {ticket.festival_name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {authorDisplay(ticket)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.low
                        }`}
                      >
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[ticket.status] || STATUS_COLORS.open
                        }`}
                      >
                        {STATUS_ICONS[ticket.status]}
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {ticket.message_count}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatTimestamp(ticket.updated_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openTicket(ticket.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Voir le ticket"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tickets.length === 0 && (
            <div className="p-12 text-center">
              <Ticket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun ticket trouve.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket detail dialog */}
      {(selectedTicket || detailLoading || detailError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 flex w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-lg" style={{ maxHeight: '90vh' }}>
            {/* Dialog header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              {selectedTicket ? (
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{selectedTicket.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.open
                      }`}
                    >
                      {STATUS_ICONS[selectedTicket.status]}
                      {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLORS[selectedTicket.priority] || PRIORITY_COLORS.low
                      }`}
                    >
                      {PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                    </span>
                    {selectedTicket.festival_name && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        {selectedTicket.festival_name}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">Detail du ticket</h2>
                </div>
              )}
              <button
                type="button"
                onClick={closeDetail}
                className="ml-4 rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center py-16">
                <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive">{detailError}</p>
              </div>
            ) : selectedTicket ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Info + actions */}
                <div className="border-b border-border px-6 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Info */}
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Auteur : </span>
                        <span className="text-foreground">{authorDisplay(selectedTicket)}</span>
                      </div>
                      {selectedTicket.assigned_to && (
                        <div>
                          <span className="text-muted-foreground">Assigne a : </span>
                          <span className="text-foreground">{selectedTicket.assigned_to}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Cree le : </span>
                        <span className="text-foreground">{formatTimestamp(selectedTicket.created_at)}</span>
                      </div>
                      {selectedTicket.category && (
                        <div>
                          <span className="text-muted-foreground">Categorie : </span>
                          <span className="text-foreground">{selectedTicket.category}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      {/* Change status */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
                        <select
                          value={selectedTicket.status}
                          disabled={updatingField === 'status'}
                          onChange={(e) => updateTicket('status', e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        >
                          <option value="open">Ouvert</option>
                          <option value="in_progress">En cours</option>
                          <option value="waiting">En attente</option>
                          <option value="resolved">Resolu</option>
                          <option value="closed">Ferme</option>
                        </select>
                      </div>

                      {/* Change priority */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Priorite</label>
                        <select
                          value={selectedTicket.priority}
                          disabled={updatingField === 'priority'}
                          onChange={(e) => updateTicket('priority', e.target.value)}
                          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                        >
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>

                      {/* Assign */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Assigner a</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={assignInput}
                            onChange={(e) => setAssignInput(e.target.value)}
                            placeholder="Nom de l'agent"
                            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <button
                            type="button"
                            disabled={updatingField === 'assigned_to'}
                            onClick={() => updateTicket('assigned_to', assignInput)}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {updatingField === 'assigned_to' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'OK'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages thread */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {selectedTicket.messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Aucun message.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg) => {
                        const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'system';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-lg px-4 py-3 ${
                                msg.is_internal
                                  ? 'border border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                                  : isAdmin
                                    ? 'bg-primary/10 dark:bg-primary/20'
                                    : 'bg-muted'
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground">
                                  {msg.sender_name || (isAdmin ? 'Admin' : 'Utilisateur')}
                                </span>
                                {msg.is_internal && (
                                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                                    Note interne
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  {formatTimestamp(msg.created_at)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-foreground">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Reply form */}
                <div className="border-t border-border px-6 py-4">
                  <div className="mb-2 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={replyInternal}
                        onChange={(e) => setReplyInternal(e.target.checked)}
                        className="rounded border-border"
                      />
                      Note interne
                    </label>
                    {replyInternal && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        Visible uniquement par les administrateurs
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Ecrire une reponse..."
                      rows={3}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <button
                      type="button"
                      disabled={sending || !replyContent.trim()}
                      onClick={handleReply}
                      className="inline-flex items-center gap-2 self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Repondre
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
