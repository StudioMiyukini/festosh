-- Booth types: templates with default size, price, and options
CREATE TABLE IF NOT EXISTS booth_types (
  id TEXT PRIMARY KEY NOT NULL,
  edition_id TEXT NOT NULL REFERENCES editions(id),
  name TEXT NOT NULL,
  description TEXT,
  width_m REAL,
  depth_m REAL,
  price_cents INTEGER DEFAULT 0,
  pricing_mode TEXT DEFAULT 'flat',
  has_electricity INTEGER DEFAULT 0,
  has_water INTEGER DEFAULT 0,
  max_wattage INTEGER,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS booth_types_edition_id_idx ON booth_types(edition_id);

-- Link booth locations to types and add pricing mode
ALTER TABLE booth_locations ADD COLUMN booth_type_id TEXT REFERENCES booth_types(id);
ALTER TABLE booth_locations ADD COLUMN pricing_mode TEXT DEFAULT 'flat';
