/**
 * Meeting types for Festosh meeting management with block-based editor.
 */

export type MeetingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingBlockType = 'heading' | 'text' | 'checklist' | 'poll';
export type AttendeeStatus = 'invited' | 'confirmed' | 'declined' | 'attended';

/** A checklist item within a checklist block. */
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

/** A poll option within a poll block. */
export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs
}

/** Content shape for heading blocks. */
export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
}

/** Content shape for text blocks. */
export interface TextContent {
  text: string;
}

/** Content shape for checklist blocks. */
export interface ChecklistContent {
  items: ChecklistItem[];
}

/** Content shape for poll blocks. */
export interface PollContent {
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
}

export type MeetingBlockContent = HeadingContent | TextContent | ChecklistContent | PollContent;

export interface MeetingBlock {
  id: string;
  meeting_id: string;
  block_type: MeetingBlockType;
  content: MeetingBlockContent;
  sort_order: number;
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
  created_by: string | null;
  created_at: number;
  updated_at: number;
  /** Nested data (optional, included in detail endpoints) */
  blocks?: MeetingBlock[];
  attendees?: MeetingAttendee[];
}
