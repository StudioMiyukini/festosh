-- Custom roles with granular permissions per festival
CREATE TABLE IF NOT EXISTS custom_roles (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6b7280',
  permissions text NOT NULL DEFAULT '[]',
  is_default integer NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS crole_festival_idx ON custom_roles(festival_id);
CREATE INDEX IF NOT EXISTS crole_edition_idx ON custom_roles(edition_id);

-- Link members to custom roles (optional, supplements the built-in role)
ALTER TABLE festival_members ADD COLUMN custom_role_id text REFERENCES custom_roles(id);
