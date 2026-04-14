CREATE TABLE IF NOT EXISTS regulations (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id),
  title text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL DEFAULT '',
  is_published integer NOT NULL DEFAULT 0,
  requires_acceptance integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS reg_festival_idx ON regulations(festival_id);
CREATE INDEX IF NOT EXISTS reg_category_idx ON regulations(category);
CREATE UNIQUE INDEX IF NOT EXISTS reg_slug_idx ON regulations(festival_id, slug);

CREATE TABLE IF NOT EXISTS regulation_acceptances (
  id text PRIMARY KEY NOT NULL,
  regulation_id text NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  guest_email text,
  accepted_at integer DEFAULT (unixepoch()),
  ip_address text
);

CREATE INDEX IF NOT EXISTS regacc_reg_idx ON regulation_acceptances(regulation_id);
CREATE INDEX IF NOT EXISTS regacc_user_idx ON regulation_acceptances(user_id);
