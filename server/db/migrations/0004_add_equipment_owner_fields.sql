-- Add owner, value and acquisition type fields to equipment_items
ALTER TABLE equipment_items ADD COLUMN owner_name TEXT;
ALTER TABLE equipment_items ADD COLUMN value_cents INTEGER DEFAULT 0;
ALTER TABLE equipment_items ADD COLUMN acquisition_type TEXT DEFAULT 'owned';

-- Equipment owners table for the festival
CREATE TABLE IF NOT EXISTS equipment_owners (
  id TEXT PRIMARY KEY NOT NULL,
  festival_id TEXT NOT NULL REFERENCES festivals(id),
  name TEXT NOT NULL,
  contact_info TEXT,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS equipment_owners_festival_id_idx ON equipment_owners(festival_id);
