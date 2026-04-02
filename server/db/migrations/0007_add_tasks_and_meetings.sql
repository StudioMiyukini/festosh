-- Migration: add tasks and meetings tables
-- Created: 2026-03-29

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  festival_id TEXT NOT NULL REFERENCES festivals(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at INTEGER,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  status TEXT DEFAULT 'planned',
  created_by TEXT REFERENCES profiles(id),
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS meetings_festival_id_idx ON meetings(festival_id);
CREATE INDEX IF NOT EXISTS meetings_scheduled_at_idx ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON meetings(status);

CREATE TABLE IF NOT EXISTS meeting_blocks (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS meeting_blocks_meeting_id_idx ON meeting_blocks(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_blocks_sort_order_idx ON meeting_blocks(sort_order);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'invited',
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS meeting_attendees_meeting_id_idx ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_attendees_user_id_idx ON meeting_attendees(user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  festival_id TEXT NOT NULL REFERENCES festivals(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT REFERENCES profiles(id),
  due_date TEXT,
  meeting_id TEXT REFERENCES meetings(id),
  meeting_block_id TEXT REFERENCES meeting_blocks(id),
  created_by TEXT REFERENCES profiles(id),
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS tasks_festival_id_idx ON tasks(festival_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_meeting_id_idx ON tasks(meeting_id);
