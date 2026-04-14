-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  interval text NOT NULL DEFAULT 'monthly',
  interval_count integer NOT NULL DEFAULT 1,
  features text NOT NULL DEFAULT '[]',
  is_active integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch())
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start integer NOT NULL,
  current_period_end integer NOT NULL,
  cancel_at_period_end integer NOT NULL DEFAULT 0,
  cancelled_at integer,
  trial_end integer,
  payment_method text,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS sub_user_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS sub_status_idx ON subscriptions(status);
CREATE INDEX IF NOT EXISTS sub_plan_idx ON subscriptions(plan_id);

-- Payment history
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES profiles(id),
  subscription_id text REFERENCES subscriptions(id),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  stripe_payment_id text,
  invoice_url text,
  description text,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS pay_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS pay_sub_idx ON payments(subscription_id);

-- Beta access tracking
ALTER TABLE profiles ADD COLUMN is_beta integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN beta_joined_at integer;
ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'none';
