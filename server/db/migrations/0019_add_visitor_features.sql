-- XP and coins on user profiles
ALTER TABLE profiles ADD COLUMN xp integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN coins integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN xp_level integer NOT NULL DEFAULT 1;

-- Festival visit history (auto-tracked when ticket scanned)
CREATE TABLE IF NOT EXISTS festival_visits (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  festival_id text NOT NULL REFERENCES festivals(id),
  edition_id text REFERENCES editions(id),
  visited_at integer DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS fvisit_unique_idx ON festival_visits(user_id, edition_id);
CREATE INDEX IF NOT EXISTS fvisit_user_idx ON festival_visits(user_id);
CREATE INDEX IF NOT EXISTS fvisit_festival_idx ON festival_visits(festival_id);

-- Festival reviews (satisfaction form)
CREATE TABLE IF NOT EXISTS festival_reviews (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  festival_id text NOT NULL REFERENCES festivals(id),
  edition_id text REFERENCES editions(id),
  overall_rating integer NOT NULL,
  organisation_rating integer,
  programme_rating integer,
  stands_rating integer,
  ambiance_rating integer,
  food_rating integer,
  accessibility_rating integer,
  value_rating integer,
  nps_score integer,
  would_return integer DEFAULT 1,
  comment text,
  suggestions text,
  created_at integer DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS freview_unique_idx ON festival_reviews(user_id, edition_id);
CREATE INDEX IF NOT EXISTS freview_festival_idx ON festival_reviews(festival_id);

-- Exhibitor favorites (cross-festival follow)
CREATE TABLE IF NOT EXISTS exhibitor_favorites (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id),
  created_at integer DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS exfav_unique_idx ON exhibitor_favorites(user_id, exhibitor_id);
CREATE INDEX IF NOT EXISTS exfav_user_idx ON exhibitor_favorites(user_id);
CREATE INDEX IF NOT EXISTS exfav_exhibitor_idx ON exhibitor_favorites(exhibitor_id);

-- XP event log
CREATE TABLE IF NOT EXISTS xp_logs (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  xp_earned integer NOT NULL DEFAULT 0,
  coins_earned integer NOT NULL DEFAULT 0,
  description text,
  reference_type text,
  reference_id text,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS xplog_user_idx ON xp_logs(user_id);
CREATE INDEX IF NOT EXISTS xplog_action_idx ON xp_logs(action);
