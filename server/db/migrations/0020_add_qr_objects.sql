-- Universal QR objects: trophies, hunt checkpoints, tickets, drink tokens, etc.
CREATE TABLE IF NOT EXISTS qr_objects (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'custom',
  name text NOT NULL,
  description text,
  image_url text,
  qr_code text NOT NULL UNIQUE,
  max_scans integer,
  max_scans_per_user integer DEFAULT 1,
  scan_count integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  coins_reward integer NOT NULL DEFAULT 0,
  is_consumable integer NOT NULL DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  valid_from integer,
  valid_until integer,
  metadata text DEFAULT '{}',
  batch_id text,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS qrobj_edition_idx ON qr_objects(edition_id);
CREATE INDEX IF NOT EXISTS qrobj_type_idx ON qr_objects(type);
CREATE INDEX IF NOT EXISTS qrobj_qr_idx ON qr_objects(qr_code);
CREATE INDEX IF NOT EXISTS qrobj_batch_idx ON qr_objects(batch_id);

-- Scan log
CREATE TABLE IF NOT EXISTS qr_scans (
  id text PRIMARY KEY NOT NULL,
  qr_object_id text NOT NULL REFERENCES qr_objects(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  status text NOT NULL DEFAULT 'success',
  scanned_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS qrscan_obj_idx ON qr_scans(qr_object_id);
CREATE INDEX IF NOT EXISTS qrscan_user_idx ON qr_scans(user_id);
