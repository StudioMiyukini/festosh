CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY NOT NULL,
  user_id text REFERENCES profiles(id),
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  details text,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at);
