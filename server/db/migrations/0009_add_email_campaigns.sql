CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  festival_id TEXT NOT NULL REFERENCES festivals(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL DEFAULT '',
  recipient_type TEXT NOT NULL DEFAULT 'all_members',
  recipient_roles TEXT,
  recipient_ids TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at INTEGER,
  sent_at INTEGER,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by TEXT REFERENCES profiles(id),
  created_at INTEGER,
  updated_at INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_campaigns_festival_id_idx ON email_campaigns(festival_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON email_campaigns(status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  festival_id TEXT NOT NULL REFERENCES festivals(id),
  campaign_id TEXT REFERENCES email_campaigns(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  sent_at INTEGER,
  created_at INTEGER
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_logs_festival_id_idx ON email_logs(festival_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS email_logs_campaign_id_idx ON email_logs(campaign_id);
