-- Billing profiles for invoicing
CREATE TABLE IF NOT EXISTS billing_profiles (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL UNIQUE REFERENCES profiles(id),
  company_name text,
  billing_email text,
  vat_number text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text DEFAULT 'FR',
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS bp_user_idx ON billing_profiles(user_id);

-- Platform invoices (auto-generated for subscriptions)
CREATE TABLE IF NOT EXISTS platform_invoices (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  subscription_id text REFERENCES subscriptions(id),
  payment_id text REFERENCES payments(id),
  invoice_number text NOT NULL UNIQUE,
  billing_name text,
  billing_email text,
  billing_address text,
  billing_vat text,
  label text NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_rate real NOT NULL DEFAULT 0.20,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'paid',
  issued_at integer NOT NULL,
  due_at integer,
  paid_at integer,
  notes text,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS pinv_user_idx ON platform_invoices(user_id);
CREATE INDEX IF NOT EXISTS pinv_sub_idx ON platform_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS pinv_number_idx ON platform_invoices(invoice_number);
