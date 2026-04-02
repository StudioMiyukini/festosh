/**
 * Task types for Festosh organizational task management.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  festival_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  meeting_id: string | null;
  meeting_block_id: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  /** Joined fields (optional) */
  assignee_name?: string;
  meeting_title?: string;
}
