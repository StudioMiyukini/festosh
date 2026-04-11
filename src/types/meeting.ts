/**
 * Meeting types for Festosh meeting management with block-based editor.
 */

export type MeetingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingBlockType = 'heading' | 'text' | 'checklist' | 'action' | 'poll' | 'separator' | 'note' | 'decision';
export type AttendeeStatus = 'invited' | 'accepted' | 'declined';
export type ChecklistItemStatus = 'pending' | 'done' | 'cancelled';
export type ActionItemStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type NoteType = 'info' | 'warning' | 'success';
export type DecisionStatus = 'proposed' | 'accepted' | 'rejected';

/** A checklist item within a checklist block. */
export interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
}

/** An action item within an action block. */
export interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  status: ActionItemStatus;
  due_date: string;
}

/** A poll option within a poll block. */
export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs
}

/** Content shape for heading blocks. */
export interface HeadingContent {
  body: string;
  level: 1 | 2 | 3;
}

/** Content shape for text blocks. */
export interface TextContent {
  body: string;
}

/** Content shape for checklist blocks. */
export interface ChecklistContent {
  items: ChecklistItem[];
}

/** Content shape for action blocks. */
export interface ActionContent {
  items: ActionItem[];
}

/** Content shape for poll blocks. */
export interface PollContent {
  question: string;
  options: PollOption[];
  multiple: boolean;
  closed: boolean;
}

/** Content shape for separator blocks. */
export interface SeparatorContent {
  _type: 'separator';
}

/** Content shape for note blocks. */
export interface NoteContent {
  body: string;
  note_type: NoteType;
}

/** Content shape for decision blocks. */
export interface DecisionContent {
  body: string;
  status: DecisionStatus;
}

export type MeetingBlockContent =
  | HeadingContent
  | TextContent
  | ChecklistContent
  | ActionContent
  | PollContent
  | SeparatorContent
  | NoteContent
  | DecisionContent;

export interface MeetingBlock {
  id: string;
  meeting_id: string;
  block_type: MeetingBlockType;
  content: MeetingBlockContent;
  sort_order: number;
  created_by?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: number;
  updated_at: number;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string;
  status: AttendeeStatus;
  created_at: number;
  /** Joined fields (optional) */
  display_name?: string;
  avatar_url?: string | null;
}

export interface Meeting {
  id: string;
  festival_id: string;
  title: string;
  description: string | null;
  scheduled_at: number | null;
  duration_minutes: number;
  location: string | null;
  status: MeetingStatus;
  version: number;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  /** Nested data (optional, included in detail endpoints) */
  blocks?: MeetingBlock[];
  attendees?: MeetingAttendee[];
}
