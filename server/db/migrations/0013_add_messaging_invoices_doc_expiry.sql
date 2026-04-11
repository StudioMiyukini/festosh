-- Conversations table for direct messaging
CREATE TABLE IF NOT EXISTS conversations (
  id text PRIMARY KEY NOT NULL,
  subject text,
  festival_id text REFERENCES festivals(id),
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS conv_created_by_idx ON conversations(created_by);
CREATE INDEX IF NOT EXISTS conv_festival_id_idx ON conversations(festival_id);
CREATE INDEX IF NOT EXISTS conv_updated_at_idx ON conversations(updated_at);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id text PRIMARY KEY NOT NULL,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id),
  last_read_at integer,
  joined_at integer DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS conv_part_unique_idx ON conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS conv_part_user_idx ON conversation_participants(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY NOT NULL,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS msg_conv_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS msg_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS msg_created_at_idx ON messages(created_at);

-- Add expiry tracking to documents
ALTER TABLE documents ADD COLUMN expires_at integer;
ALTER TABLE documents ADD COLUMN renewal_reminder_sent integer DEFAULT 0;

-- Invoices table (centralized across festivals)
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  festival_id text REFERENCES festivals(id),
  edition_id text REFERENCES editions(id),
  application_id text REFERENCES booth_applications(id),
  invoice_number text NOT NULL,
  label text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft',
  issued_at integer,
  due_at integer,
  paid_at integer,
  pdf_url text,
  notes text,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS inv_user_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS inv_festival_idx ON invoices(festival_id);
CREATE INDEX IF NOT EXISTS inv_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS inv_number_idx ON invoices(invoice_number);
