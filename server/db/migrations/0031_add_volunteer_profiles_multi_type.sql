-- Multi-type: replace single user_type with flags
ALTER TABLE profiles ADD COLUMN is_exhibitor integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN is_volunteer integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN is_organizer integer NOT NULL DEFAULT 0;

-- Volunteer profiles
CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL UNIQUE REFERENCES profiles(id),
  skills text DEFAULT '[]',
  certifications text DEFAULT '[]',
  availability text DEFAULT '{}',
  constraints text,
  is_pmr integer NOT NULL DEFAULT 0,
  preferred_actions text DEFAULT '[]',
  bio text,
  emergency_contact_name text,
  emergency_contact_phone text,
  tshirt_size text,
  has_car integer NOT NULL DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS vprof_user_idx ON volunteer_profiles(user_id);

-- Volunteer applications to festivals
CREATE TABLE IF NOT EXISTS volunteer_applications (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id),
  user_id text NOT NULL REFERENCES profiles(id),
  volunteer_profile_id text NOT NULL REFERENCES volunteer_profiles(id),
  preferred_actions text DEFAULT '[]',
  availability text DEFAULT '{}',
  motivation text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by text REFERENCES profiles(id),
  reviewed_at integer,
  notes text,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS vapp_festival_idx ON volunteer_applications(festival_id);
CREATE INDEX IF NOT EXISTS vapp_user_idx ON volunteer_applications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS vapp_unique_idx ON volunteer_applications(edition_id, user_id);
