/** Support ticket status */
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

/** Support ticket priority */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Support ticket category */
export type TicketCategory = 'general' | 'technical' | 'billing' | 'volunteer' | 'exhibitor' | 'other';

/** Message sender type */
export type SenderType = 'user' | 'admin' | 'bot';

export interface SupportTicket {
  id: string;
  festival_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  closed_at: number | null;
  created_at: number;
  updated_at: number;
  // Enriched fields
  user_name?: string;
  user_email?: string;
  assignee_name?: string;
  message_count?: number;
  last_message_at?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  content: string;
  is_internal: number;
  created_at: number;
  // Enriched
  sender_name?: string;
}

export interface ChatbotFaq {
  id: string;
  festival_id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
