-- Survey/form builder for satisfaction questionnaires
CREATE TABLE IF NOT EXISTS surveys (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id),
  title text NOT NULL DEFAULT 'Questionnaire de satisfaction',
  description text,
  blocks text NOT NULL DEFAULT '[]',
  is_active integer NOT NULL DEFAULT 0,
  is_public integer NOT NULL DEFAULT 0,
  response_count integer NOT NULL DEFAULT 0,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS survey_festival_idx ON surveys(festival_id);
CREATE INDEX IF NOT EXISTS survey_edition_idx ON surveys(edition_id);

-- Survey responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id text PRIMARY KEY NOT NULL,
  survey_id text NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  guest_email text,
  answers text NOT NULL DEFAULT '{}',
  completed integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS sresp_survey_idx ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS sresp_user_idx ON survey_responses(user_id);
