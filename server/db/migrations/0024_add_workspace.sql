-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACE DOCUMENTS (collaborative rich text, like Google Docs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_docs (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Sans titre',
  content text NOT NULL DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  is_template integer NOT NULL DEFAULT 0,
  created_by text NOT NULL REFERENCES profiles(id),
  last_edited_by text REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS wdoc_festival_idx ON workspace_docs(festival_id);
CREATE INDEX IF NOT EXISTS wdoc_created_by_idx ON workspace_docs(created_by);

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACE SHEETS (collaborative spreadsheet, like Google Sheets)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_sheets (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Sans titre',
  columns_def text NOT NULL DEFAULT '[]',
  row_count integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_by text NOT NULL REFERENCES profiles(id),
  last_edited_by text REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS wsheet_festival_idx ON workspace_sheets(festival_id);

CREATE TABLE IF NOT EXISTS sheet_rows (
  id text PRIMARY KEY NOT NULL,
  sheet_id text NOT NULL REFERENCES workspace_sheets(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  cells text NOT NULL DEFAULT '{}',
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS srow_sheet_idx ON sheet_rows(sheet_id);
CREATE INDEX IF NOT EXISTS srow_index_idx ON sheet_rows(row_index);

-- ═══════════════════════════════════════════════════════════════════════════
-- SHARED CALENDAR (like Google Calendar)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shared_calendars (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Calendrier',
  color text DEFAULT '#6366f1',
  is_default integer NOT NULL DEFAULT 0,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS scal_festival_idx ON shared_calendars(festival_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id text PRIMARY KEY NOT NULL,
  calendar_id text NOT NULL REFERENCES shared_calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_at integer NOT NULL,
  end_at integer NOT NULL,
  all_day integer NOT NULL DEFAULT 0,
  color text,
  recurrence text,
  reminder_minutes integer,
  created_by text NOT NULL REFERENCES profiles(id),
  attendees text DEFAULT '[]',
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS cevt_calendar_idx ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS cevt_start_idx ON calendar_events(start_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- WORKSPACE TASKS (Kanban board, like Google Tasks / Trello)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_boards (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Tableau',
  version integer NOT NULL DEFAULT 1,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS tboard_festival_idx ON task_boards(festival_id);

CREATE TABLE IF NOT EXISTS task_columns (
  id text PRIMARY KEY NOT NULL,
  board_id text NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text DEFAULT '#6b7280',
  sort_order integer DEFAULT 0,
  wip_limit integer
);

CREATE INDEX IF NOT EXISTS tcol_board_idx ON task_columns(board_id);

CREATE TABLE IF NOT EXISTS task_cards (
  id text PRIMARY KEY NOT NULL,
  column_id text NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
  board_id text NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id text REFERENCES profiles(id),
  priority text DEFAULT 'medium',
  due_at integer,
  labels text DEFAULT '[]',
  checklist text DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS tcard_column_idx ON task_cards(column_id);
CREATE INDEX IF NOT EXISTS tcard_board_idx ON task_cards(board_id);
CREATE INDEX IF NOT EXISTS tcard_assignee_idx ON task_cards(assignee_id);
