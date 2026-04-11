import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  ArrowLeft,
  Loader2,
  Search,
  X,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  subject: string | null;
  festival_id: string | null;
  created_at: number;
  updated_at: number;
  participants: {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];
  last_message: { body: string; sender_id: string; created_at: number } | null;
  unread_count: number;
}

interface Message {
  id: string;
  body: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a unix timestamp to a compact relative-ish time string. */
function formatMessageTime(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;

  // Same year? show day + month
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  return formatTimestamp(ts);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

function getOtherParticipant(
  participants: Conversation['participants'],
  currentUserId: string
) {
  return (
    participants.find((p) => p.user_id !== currentUserId) ?? participants[0]
  );
}

function participantDisplayName(
  participant: Conversation['participants'][number]
): string {
  return participant.display_name || participant.username;
}

function avatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url: string | null;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary`}
    >
      {avatarInitials(name)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Message Dialog
// ---------------------------------------------------------------------------

function NewMessageDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !body.trim()) return;

    setError(null);
    setSending(true);

    const result = await api.post<{ id: string }>('/messaging/conversations', {
      recipient_id: recipient.trim(),
      subject: subject.trim() || undefined,
      message: body.trim(),
    });

    if (!result.success || !result.data) {
      setError(result.error ?? 'Une erreur est survenue.');
      setSending(false);
      return;
    }

    onCreated(result.data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Nouveau message
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-msg-recipient"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Destinataire *
            </label>
            <input
              id="new-msg-recipient"
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Nom d'utilisateur ou e-mail"
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label
              htmlFor="new-msg-subject"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Sujet
            </label>
            <input
              id="new-msg-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Facultatif"
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label
              htmlFor="new-msg-body"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Message *
            </label>
            <textarea
              id="new-msg-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Ecrivez votre message..."
              className="w-full resize-none rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending || !recipient.trim() || !body.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation List (Left Panel)
// ---------------------------------------------------------------------------

function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  currentUserId,
  searchQuery,
  onSearchChange,
  onSelect,
  onNewMessage,
}: {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  currentUserId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
  onNewMessage: () => void;
}) {
  const filtered = searchQuery.trim()
    ? conversations.filter((c) => {
        const other = getOtherParticipant(c.participants, currentUserId);
        const name = participantDisplayName(other).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : conversations;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Messagerie</h1>
          <button
            type="button"
            onClick={onNewMessage}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau message
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              {searchQuery ? 'Aucun resultat' : 'Aucune conversation'}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {searchQuery
                ? 'Aucune conversation ne correspond a votre recherche.'
                : "Vous n'avez pas encore de conversations. Envoyez un premier message !"}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onNewMessage}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Nouveau message
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((conv) => {
              const other = getOtherParticipant(
                conv.participants,
                currentUserId
              );
              const name = participantDisplayName(other);
              const isActive = conv.id === selectedId;

              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      isActive ? 'bg-accent' : ''
                    }`}
                  >
                    <Avatar
                      name={name}
                      url={other.avatar_url}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`truncate text-sm ${
                            conv.unread_count > 0
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          {name}
                        </span>
                        {conv.last_message && (
                          <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                            {formatMessageTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>

                      {conv.subject && (
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {conv.subject}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs text-muted-foreground">
                          {conv.last_message
                            ? truncate(conv.last_message.body, 60)
                            : 'Aucun message'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {conv.unread_count > 99
                              ? '99+'
                              : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation Thread (Right Panel)
// ---------------------------------------------------------------------------

function ConversationThread({
  conversationId,
  conversation,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  conversation: Conversation | undefined;
  currentUserId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      const result = await api.get<Message[]>(
        `/messaging/conversations/${conversationId}/messages`
      );

      if (result.success && result.data) {
        setMessages(result.data);
        setError(null);

        // Auto-scroll if new messages arrived or on initial load
        if (isInitial || result.data.length !== prevMessageCountRef.current) {
          prevMessageCountRef.current = result.data.length;
          // Use setTimeout to let React render the new messages first
          setTimeout(() => scrollToBottom(isInitial ? 'instant' : 'smooth'), 50);
        }
      } else if (isInitial) {
        setError(result.error ?? 'Impossible de charger les messages.');
      }

      if (isInitial) {
        setLoading(false);
      }
    },
    [conversationId, scrollToBottom]
  );

  // Initial fetch + polling
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setError(null);
    prevMessageCountRef.current = 0;

    fetchMessages(true);

    pollTimerRef.current = setInterval(() => {
      fetchMessages(false);
    }, 10_000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);

    const result = await api.post<Message>(
      `/messaging/conversations/${conversationId}/messages`,
      { message: trimmed }
    );

    if (result.success && result.data) {
      setNewMessage('');
      // Optimistically add the message
      setMessages((prev) => [...prev, result.data!]);
      prevMessageCountRef.current += 1;
      setTimeout(() => scrollToBottom('smooth'), 50);
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const other = conversation
    ? getOtherParticipant(conversation.participants, currentUserId)
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {/* Back button (mobile) */}
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {other && (
          <Avatar
            name={participantDisplayName(other)}
            url={other.avatar_url}
            size="sm"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {other ? participantDisplayName(other) : 'Conversation'}
          </p>
          {conversation?.subject && (
            <p className="truncate text-xs text-muted-foreground">
              {conversation.subject}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aucun message pour le moment. Envoyez le premier !
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              const senderName =
                msg.sender_display_name || msg.sender_username;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {!isOwn && (
                      <p
                        className={`mb-0.5 text-[11px] font-semibold ${
                          isOwn
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {senderName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isOwn
                          ? 'text-primary-foreground/60'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-border px-4 py-3"
      >
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ecrivez un message..."
          rows={1}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function MessagingPage() {
  const { profile } = useAuthStore();
  const currentUserId = profile?.id ?? '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    const result = await api.get<Conversation[]>('/messaging/conversations');

    if (result.success && result.data) {
      setConversations(result.data);
      setConversationsError(null);
    } else {
      setConversationsError(
        result.error ?? 'Impossible de charger les conversations.'
      );
    }

    setLoadingConversations(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll conversation list every 30 seconds to pick up new conversations / unread counts
  useEffect(() => {
    const timer = setInterval(() => {
      fetchConversations();
    }, 30_000);

    return () => clearInterval(timer);
  }, [fetchConversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleBack = () => {
    setSelectedConversationId(null);
  };

  const handleNewMessageCreated = (conversationId: string) => {
    setShowNewMessage(false);
    fetchConversations();
    setSelectedConversationId(conversationId);
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  return (
    <div className="mx-auto h-[calc(100vh-4rem)] max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Left panel: conversation list */}
        <div
          className={`w-full flex-shrink-0 border-r border-border md:w-80 lg:w-96 ${
            selectedConversationId ? 'hidden md:flex md:flex-col' : 'flex flex-col'
          }`}
        >
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            error={conversationsError}
            selectedId={selectedConversationId}
            currentUserId={currentUserId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={handleSelectConversation}
            onNewMessage={() => setShowNewMessage(true)}
          />
        </div>

        {/* Right panel: conversation thread or placeholder */}
        <div
          className={`min-w-0 flex-1 ${
            selectedConversationId ? 'flex flex-col' : 'hidden md:flex md:flex-col'
          }`}
        >
          {selectedConversationId ? (
            <ConversationThread
              key={selectedConversationId}
              conversationId={selectedConversationId}
              conversation={selectedConversation}
              currentUserId={currentUserId}
              onBack={handleBack}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Vos messages
              </h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                Selectionnez une conversation pour afficher les messages, ou
                envoyez un nouveau message.
              </p>
              <button
                type="button"
                onClick={() => setShowNewMessage(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Nouveau message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New message dialog */}
      {showNewMessage && (
        <NewMessageDialog
          onClose={() => setShowNewMessage(false)}
          onCreated={handleNewMessageCreated}
        />
      )}
    </div>
  );
}
