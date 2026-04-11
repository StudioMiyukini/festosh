-- Link meetings to editions (optional)
ALTER TABLE meetings ADD COLUMN edition_id text REFERENCES editions(id);

-- Track who last modified a block (for collaborative editing)
ALTER TABLE meeting_blocks ADD COLUMN updated_by text REFERENCES profiles(id);

-- Block version history for collaborative editing
CREATE TABLE IF NOT EXISTS meeting_block_history (
  id text PRIMARY KEY NOT NULL,
  block_id text NOT NULL REFERENCES meeting_blocks(id) ON DELETE CASCADE,
  content text,
  updated_by text REFERENCES profiles(id),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS mbhist_block_idx ON meeting_block_history(block_id);

-- Meeting-level version counter for polling
ALTER TABLE meetings ADD COLUMN version integer NOT NULL DEFAULT 1;
