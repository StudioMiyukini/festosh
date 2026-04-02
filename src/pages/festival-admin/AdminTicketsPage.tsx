import { useState, useEffect, useRef } from 'react';
import {
  Ticket,
  MessageSquare,
  Send,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  ArrowLeft,
  Bot,
  Plus,
  Trash2,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useFestivalContext } from '@/hooks/use-festival-context';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import type { SupportTicket, TicketMessage, ChatbotFaq, TicketStatus, TicketPriority } from '@/types/ticket';

// Helpers
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting: 'En attente',
  resolved: 'Resolu',
  closed: 'Ferme',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  waiting: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Tab = 'tickets' | 'faq';

export function AdminTicketsPage() {
  const { festival } = useFestivalContext();
  const { profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<(SupportTicket & { messages: TicketMessage[] }) | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // FAQ state
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [editingFaq, setEditingFaq] = useState<ChatbotFaq | null>(null);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'general' });
  const [showFaqForm, setShowFaqForm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tickets
  useEffect(() => {
    if (!festival) return;
    const qs = statusFilter ? `?admin=1&status=${statusFilter}` : '?admin=1';
    api.get<SupportTicket[]>(`/tickets/festival/${festival.id}${qs}`).then((res) => {
      if (res.success && res.data) setTickets(res.data);
    });
  }, [festival, statusFilter, selectedTicket]);

  // Load FAQs
  useEffect(() => {
    if (!festival) return;
    api.get<ChatbotFaq[]>(`/chatbot/faq/festival/${festival.id}/all`).then((res) => {
      if (res.success && res.data) setFaqs(res.data);
    });
  }, [festival]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const openTicket = async (ticketId: string) => {
    const res = await api.get<SupportTicket & { messages: TicketMessage[] }>(`/tickets/${ticketId}`);
    if (res.success && res.data) setSelectedTicket(res.data);
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    const res = await api.post(`/tickets/${selectedTicket.id}/messages`, {
      content: replyText,
      sender_type: 'admin',
      is_internal: isInternal,
    });
    if (res.success) {
      setReplyText('');
      setIsInternal(false);
      await openTicket(selectedTicket.id);
    }
    setSending(false);
  };

  const updateTicketStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    await api.put(`/tickets/${selectedTicket.id}`, { status });
    await openTicket(selectedTicket.id);
  };

  const assignToMe = async () => {
    if (!selectedTicket || !profile) return;
    await api.put(`/tickets/${selectedTicket.id}`, { assigned_to: profile.id });
    await openTicket(selectedTicket.id);
  };

  const deleteTicket = async (id: string) => {
    await api.delete(`/tickets/${id}`);
    setSelectedTicket(null);
  };

  // FAQ handlers
  const saveFaq = async () => {
    if (!festival) return;
    if (editingFaq) {
      await api.put(`/chatbot/faq/${editingFaq.id}`, editingFaq);
      setEditingFaq(null);
    } else {
      if (!newFaq.question || !newFaq.answer) return;
      await api.post(`/chatbot/faq/festival/${festival.id}`, newFaq);
      setNewFaq({ question: '', answer: '', category: 'general' });
      setShowFaqForm(false);
    }
    const res = await api.get<ChatbotFaq[]>(`/chatbot/faq/festival/${festival.id}/all`);
    if (res.success && res.data) setFaqs(res.data);
  };

  const deleteFaq = async (id: string) => {
    await api.delete(`/chatbot/faq/${id}`);
    const res = await api.get<ChatbotFaq[]>(`/chatbot/faq/festival/${festival!.id}/all`);
    if (res.success && res.data) setFaqs(res.data);
  };

  const toggleFaqActive = async (faq: ChatbotFaq) => {
    await api.put(`/chatbot/faq/${faq.id}`, { is_active: faq.is_active ? 0 : 1 });
    const res = await api.get<ChatbotFaq[]>(`/chatbot/faq/festival/${festival!.id}/all`);
    if (res.success && res.data) setFaqs(res.data);
  };

  if (!festival) return null;

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Support</h2>
          <p className="text-sm text-muted-foreground">Tickets et chatbot FAQ</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tickets'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Ticket className="h-4 w-4" />
          Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'faq'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          FAQ Chatbot ({faqs.length})
        </button>
      </div>

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="flex gap-4" style={{ minHeight: '60vh' }}>
          {/* Ticket List */}
          <div className={`${selectedTicket ? 'hidden lg:block lg:w-1/3' : 'w-full'} space-y-3`}>
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Tous les statuts</option>
                {(Object.entries(STATUS_LABELS) as [TicketStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
                <Ticket className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun ticket</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                      selectedTicket?.id === ticket.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ticket.user_name || ticket.guest_name || 'Anonyme'} &middot; {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status as TicketStatus]}`}>
                          {STATUS_LABELS[ticket.status as TicketStatus]}
                        </span>
                        <span className={`text-xs ${PRIORITY_COLORS[ticket.priority as TicketPriority]}`}>
                          {PRIORITY_LABELS[ticket.priority as TicketPriority]}
                        </span>
                      </div>
                    </div>
                    {ticket.message_count !== undefined && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.message_count} message{ticket.message_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Detail */}
          {selectedTicket && (
            <div className="flex-1 flex flex-col rounded-lg border border-border bg-background">
              {/* Ticket header */}
              <div className="border-b border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="lg:hidden rounded-md p-1 hover:bg-accent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="font-semibold text-foreground flex-1">{selectedTicket.subject}</h3>
                  <button
                    onClick={() => deleteTicket(selectedTicket.id)}
                    className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[selectedTicket.status as TicketStatus]}`}>
                    {STATUS_LABELS[selectedTicket.status as TicketStatus]}
                  </span>
                  <span className={PRIORITY_COLORS[selectedTicket.priority as TicketPriority]}>
                    {PRIORITY_LABELS[selectedTicket.priority as TicketPriority]}
                  </span>
                  <span className="text-muted-foreground">
                    <User className="h-3 w-3 inline mr-1" />
                    {selectedTicket.user_name || selectedTicket.guest_name || 'Anonyme'}
                    {selectedTicket.user_email || selectedTicket.guest_email ? ` (${selectedTicket.user_email || selectedTicket.guest_email})` : ''}
                  </span>
                  <span className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatDate(selectedTicket.created_at)}
                  </span>
                </div>
                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateTicketStatus(e.target.value as TicketStatus)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {(Object.entries(STATUS_LABELS) as [TicketStatus, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {!selectedTicket.assignee_name && (
                    <button
                      onClick={assignToMe}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                    >
                      <User className="h-3 w-3" />
                      M'assigner
                    </button>
                  )}
                  {selectedTicket.assignee_name && (
                    <span className="text-xs text-muted-foreground">
                      Assigne a : {selectedTicket.assignee_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '45vh' }}>
                {selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.sender_type === 'admin'
                          ? msg.is_internal
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200'
                            : 'bg-primary/10 text-foreground'
                          : msg.sender_type === 'bot'
                            ? 'bg-purple-50 border border-purple-200 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200'
                            : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 text-xs opacity-70">
                        {msg.sender_type === 'bot' && <Bot className="h-3 w-3" />}
                        {msg.sender_type === 'admin' && msg.is_internal ? (
                          <span className="font-medium">Note interne &middot; {msg.sender_name || 'Admin'}</span>
                        ) : (
                          <span className="font-medium">{msg.sender_name || (msg.sender_type === 'bot' ? 'Assistant' : 'Utilisateur')}</span>
                        )}
                        <span>&middot; {formatDate(msg.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply */}
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-border"
                    />
                    Note interne
                  </label>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={isInternal ? 'Note interne (invisible pour le client)...' : 'Repondre au ticket...'}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="self-end inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAQ TAB */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configurez les questions frequentes du chatbot. Ces reponses seront utilisees comme contexte pour l'assistant IA.
            </p>
            <button
              onClick={() => setShowFaqForm(!showFaqForm)}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {/* Add FAQ form */}
          {showFaqForm && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <input
                type="text"
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="Question..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                placeholder="Reponse..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="general">General</option>
                  <option value="horaires">Horaires</option>
                  <option value="acces">Acces</option>
                  <option value="exposants">Exposants</option>
                  <option value="benevoles">Benevoles</option>
                  <option value="billetterie">Billetterie</option>
                </select>
                <button
                  onClick={saveFaq}
                  disabled={!newFaq.question || !newFaq.answer}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => { setShowFaqForm(false); setNewFaq({ question: '', answer: '', category: 'general' }); }}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* FAQ list */}
          {faqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
              <HelpCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucune FAQ configuree</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez des questions frequentes pour enrichir le chatbot</p>
            </div>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id} className="rounded-lg border border-border p-4">
                  {editingFaq?.id === faq.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingFaq.question}
                        onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                      <textarea
                        value={editingFaq.answer}
                        onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                        rows={3}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveFaq} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                          Sauvegarder
                        </button>
                        <button onClick={() => setEditingFaq(null)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{faq.question}</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{faq.answer}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                            {faq.category}
                          </span>
                          <button
                            onClick={() => toggleFaqActive(faq)}
                            className="rounded-md p-1.5 hover:bg-accent"
                            title={faq.is_active ? 'Desactiver' : 'Activer'}
                          >
                            {faq.is_active ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <button
                            onClick={() => setEditingFaq(faq)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteFaq(faq.id)}
                            className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
