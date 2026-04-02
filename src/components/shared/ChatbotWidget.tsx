import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Ticket, Loader2, Bot, User, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { ChatMessage, ChatbotFaq } from '@/types/ticket';

interface ChatbotWidgetProps {
  festivalId: string;
  festivalName: string;
}

export function ChatbotWidget({ festivalId, festivalName }: ChatbotWidgetProps) {
  const { profile, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faqs, setFaqs] = useState<ChatbotFaq[]>([]);
  const [showFaqs, setShowFaqs] = useState(true);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    message: '',
    guest_name: '',
    guest_email: '',
  });
  const [ticketSent, setTicketSent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load FAQ on mount
  useEffect(() => {
    api.get<ChatbotFaq[]>(`/chatbot/faq/festival/${festivalId}`).then((res) => {
      if (res.success && res.data) setFaqs(res.data);
    });
  }, [festivalId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour ! Je suis l'assistant de ${festivalName}. Comment puis-je vous aider ?`,
        timestamp: Date.now(),
      }]);
    }
  }, [isOpen, festivalName]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowFaqs(false);
    setIsLoading(true);

    try {
      // Build message history for context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post<{ message: string }>('/chatbot/chat', {
        festival_id: festivalId,
        messages: history,
        user_message: messageText,
      });

      const assistantContent = res.success && res.data
        ? res.data.message
        : 'Desole, je ne suis pas disponible pour le moment. Vous pouvez creer un ticket support pour obtenir de l\'aide.';

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Erreur de connexion. Veuillez reessayer.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, festivalId]);

  const handleFaqClick = (faq: ChatbotFaq) => {
    setShowFaqs(false);
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: faq.question,
      timestamp: Date.now(),
    };
    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: faq.answer,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  const submitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.message) return;
    if (!isAuthenticated && (!ticketForm.guest_name || !ticketForm.guest_email)) return;

    const res = await api.post('/chatbot/chat/create-ticket', {
      festival_id: festivalId,
      subject: ticketForm.subject,
      message: ticketForm.message,
      guest_name: ticketForm.guest_name || undefined,
      guest_email: ticketForm.guest_email || undefined,
    });

    if (res.success) {
      setTicketSent(true);
      setShowTicketForm(false);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Votre ticket a ete cree avec succes ! L\'equipe du festival vous repondra bientot.',
        timestamp: Date.now(),
      }]);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          aria-label="Ouvrir le chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">{festivalName}</p>
                <p className="text-xs opacity-80">Assistant virtuel</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 hover:bg-white/20 transition-colors"
              aria-label="Fermer le chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user' ? 'bg-primary/10' : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* FAQ Suggestions */}
            {showFaqs && faqs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground font-medium px-1">Questions frequentes :</p>
                {faqs.slice(0, 5).map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => handleFaqClick(faq)}
                    className="block w-full text-left rounded-lg border border-border px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            )}

            {/* Ticket Form */}
            {showTicketForm && (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
                <p className="text-xs font-medium text-foreground">Creer un ticket support</p>
                {!isAuthenticated && (
                  <>
                    <input
                      type="text"
                      value={ticketForm.guest_name}
                      onChange={(e) => setTicketForm({ ...ticketForm, guest_name: e.target.value })}
                      placeholder="Votre nom"
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="email"
                      value={ticketForm.guest_email}
                      onChange={(e) => setTicketForm({ ...ticketForm, guest_email: e.target.value })}
                      placeholder="Votre email"
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                    />
                  </>
                )}
                <input
                  type="text"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Sujet du ticket"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                />
                <textarea
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Decrivez votre probleme..."
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitTicket}
                    disabled={!ticketForm.subject || !ticketForm.message || (!isAuthenticated && (!ticketForm.guest_name || !ticketForm.guest_email))}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Ticket className="h-3 w-3" />
                    Envoyer
                  </button>
                  <button
                    onClick={() => setShowTicketForm(false)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              {!showTicketForm && !ticketSent && (
                <button
                  onClick={() => setShowTicketForm(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Ticket className="h-3 w-3" />
                  Creer un ticket
                </button>
              )}
              {faqs.length > 0 && !showFaqs && (
                <button
                  onClick={() => setShowFaqs(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <ChevronDown className="h-3 w-3" />
                  FAQ
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Posez votre question..."
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
