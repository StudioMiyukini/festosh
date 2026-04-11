-- ═══════════════════════════════════════════════════════════════════════════
-- BILLETTERIE (Ticketing)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ticket_types (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  quantity_total integer NOT NULL DEFAULT 0,
  quantity_sold integer NOT NULL DEFAULT 0,
  max_per_order integer DEFAULT 10,
  sale_start integer,
  sale_end integer,
  valid_from integer,
  valid_until integer,
  is_active integer NOT NULL DEFAULT 1,
  color text DEFAULT '#6366f1',
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS ttype_edition_idx ON ticket_types(edition_id);

CREATE TABLE IF NOT EXISTS tickets (
  id text PRIMARY KEY NOT NULL,
  ticket_type_id text NOT NULL REFERENCES ticket_types(id),
  edition_id text NOT NULL REFERENCES editions(id),
  buyer_email text NOT NULL,
  buyer_name text,
  buyer_phone text,
  qr_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'valid',
  order_ref text,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  payment_method text,
  scanned_at integer,
  scanned_by text REFERENCES profiles(id),
  notes text,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS ticket_edition_idx ON tickets(edition_id);
CREATE INDEX IF NOT EXISTS ticket_type_idx ON tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS ticket_qr_idx ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS ticket_email_idx ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS ticket_status_idx ON tickets(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- MARKETPLACE (Orders)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY NOT NULL,
  order_number text NOT NULL UNIQUE,
  buyer_id text REFERENCES profiles(id),
  buyer_email text NOT NULL,
  buyer_name text,
  edition_id text REFERENCES editions(id),
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  shipping_address text,
  notes text,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS order_buyer_idx ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS order_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS order_edition_idx ON orders(edition_id);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY NOT NULL,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS oitem_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS oitem_exhibitor_idx ON order_items(exhibitor_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SPONSORS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sponsor_tiers (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  price_cents integer DEFAULT 0,
  benefits text,
  color text DEFAULT '#f59e0b',
  max_sponsors integer,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS stier_festival_idx ON sponsor_tiers(festival_id);

CREATE TABLE IF NOT EXISTS sponsors (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  tier_id text REFERENCES sponsor_tiers(id),
  company_name text NOT NULL,
  logo_url text,
  website text,
  description text,
  contact_name text,
  contact_email text,
  contact_phone text,
  amount_cents integer DEFAULT 0,
  is_paid integer DEFAULT 0,
  contract_url text,
  is_active integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS sponsor_festival_idx ON sponsors(festival_id);
CREATE INDEX IF NOT EXISTS sponsor_tier_idx ON sponsors(tier_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RESERVATIONS (Bookable slots)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bookable_slots (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  event_id text REFERENCES events(id),
  title text NOT NULL,
  description text,
  location text,
  start_time integer NOT NULL,
  end_time integer NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  booked_count integer NOT NULL DEFAULT 0,
  price_cents integer DEFAULT 0,
  requires_ticket integer DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS bslot_edition_idx ON bookable_slots(edition_id);
CREATE INDEX IF NOT EXISTS bslot_event_idx ON bookable_slots(event_id);

CREATE TABLE IF NOT EXISTS slot_reservations (
  id text PRIMARY KEY NOT NULL,
  slot_id text NOT NULL REFERENCES bookable_slots(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  guest_email text,
  status text NOT NULL DEFAULT 'confirmed',
  qr_code text UNIQUE,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS sres_slot_idx ON slot_reservations(slot_id);
CREATE INDEX IF NOT EXISTS sres_user_idx ON slot_reservations(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- GAMIFICATION (Stamps, badges, treasure hunts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stamp_cards (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  required_stamps integer NOT NULL DEFAULT 5,
  reward_description text,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS scard_edition_idx ON stamp_cards(edition_id);

CREATE TABLE IF NOT EXISTS stamps (
  id text PRIMARY KEY NOT NULL,
  stamp_card_id text NOT NULL REFERENCES stamp_cards(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id),
  exhibitor_id text REFERENCES exhibitor_profiles(id),
  booth_code text,
  scanned_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS stamp_card_idx ON stamps(stamp_card_id);
CREATE INDEX IF NOT EXISTS stamp_user_idx ON stamps(user_id);

CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#f59e0b',
  condition_type text NOT NULL,
  condition_value integer DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS badge_edition_idx ON badges(edition_id);

CREATE TABLE IF NOT EXISTS user_badges (
  id text PRIMARY KEY NOT NULL,
  badge_id text NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id),
  earned_at integer DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS ubadge_unique_idx ON user_badges(badge_id, user_id);

CREATE TABLE IF NOT EXISTS treasure_hunts (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  reward_description text,
  total_checkpoints integer NOT NULL DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS thunt_edition_idx ON treasure_hunts(edition_id);

CREATE TABLE IF NOT EXISTS treasure_hunt_checkpoints (
  id text PRIMARY KEY NOT NULL,
  hunt_id text NOT NULL REFERENCES treasure_hunts(id) ON DELETE CASCADE,
  name text NOT NULL,
  hint text,
  qr_code text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tchk_hunt_idx ON treasure_hunt_checkpoints(hunt_id);

CREATE TABLE IF NOT EXISTS treasure_hunt_progress (
  id text PRIMARY KEY NOT NULL,
  hunt_id text NOT NULL REFERENCES treasure_hunts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id),
  checkpoint_id text NOT NULL REFERENCES treasure_hunt_checkpoints(id),
  found_at integer DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS thprog_unique_idx ON treasure_hunt_progress(hunt_id, user_id, checkpoint_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- VOTES & RATINGS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vote_categories (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  voting_start integer,
  voting_end integer,
  max_votes_per_user integer DEFAULT 1,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS vcat_edition_idx ON vote_categories(edition_id);

CREATE TABLE IF NOT EXISTS votes (
  id text PRIMARY KEY NOT NULL,
  vote_category_id text NOT NULL REFERENCES vote_categories(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES profiles(id),
  target_type text NOT NULL,
  target_id text NOT NULL,
  rating integer DEFAULT 0,
  comment text,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS vote_cat_idx ON votes(vote_category_id);
CREATE INDEX IF NOT EXISTS vote_user_idx ON votes(user_id);
CREATE INDEX IF NOT EXISTS vote_target_idx ON votes(target_type, target_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RAFFLES (Tombola)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS raffles (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  draw_date integer,
  is_drawn integer NOT NULL DEFAULT 0,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS raffle_edition_idx ON raffles(edition_id);

CREATE TABLE IF NOT EXISTS raffle_prizes (
  id text PRIMARY KEY NOT NULL,
  raffle_id text NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  sponsor text,
  sort_order integer DEFAULT 0,
  winner_id text REFERENCES profiles(id),
  winner_name text
);
CREATE INDEX IF NOT EXISTS rprize_raffle_idx ON raffle_prizes(raffle_id);

CREATE TABLE IF NOT EXISTS raffle_entries (
  id text PRIMARY KEY NOT NULL,
  raffle_id text NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  guest_email text,
  entry_code text UNIQUE,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS rentry_raffle_idx ON raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS rentry_user_idx ON raffle_entries(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ARTISTS / GUESTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS artists (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  photo_url text,
  website text,
  social_links text,
  category text,
  role text,
  fee_cents integer DEFAULT 0,
  is_paid integer DEFAULT 0,
  travel_info text,
  accommodation text,
  technical_rider text,
  dietary_requirements text,
  arrival_date text,
  departure_date text,
  is_public integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS artist_edition_idx ON artists(edition_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIRTUAL QUEUES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS virtual_queues (
  id text PRIMARY KEY NOT NULL,
  edition_id text NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  location text,
  is_active integer NOT NULL DEFAULT 1,
  avg_service_minutes integer DEFAULT 5,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS vqueue_edition_idx ON virtual_queues(edition_id);

CREATE TABLE IF NOT EXISTS queue_entries (
  id text PRIMARY KEY NOT NULL,
  queue_id text NOT NULL REFERENCES virtual_queues(id) ON DELETE CASCADE,
  user_id text REFERENCES profiles(id),
  guest_name text,
  position integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  ticket_code text UNIQUE,
  joined_at integer DEFAULT (unixepoch()),
  called_at integer,
  served_at integer
);
CREATE INDEX IF NOT EXISTS qentry_queue_idx ON queue_entries(queue_id);
CREATE INDEX IF NOT EXISTS qentry_user_idx ON queue_entries(user_id);
CREATE INDEX IF NOT EXISTS qentry_status_idx ON queue_entries(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- API KEYS & WEBHOOKS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_keys (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  permissions text DEFAULT '[]',
  last_used_at integer,
  expires_at integer,
  is_active integer NOT NULL DEFAULT 1,
  created_by text NOT NULL REFERENCES profiles(id),
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS apikey_festival_idx ON api_keys(festival_id);
CREATE INDEX IF NOT EXISTS apikey_prefix_idx ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS webhooks (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text NOT NULL,
  secret text,
  is_active integer NOT NULL DEFAULT 1,
  last_triggered_at integer,
  failure_count integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS webhook_festival_idx ON webhooks(festival_id);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id text PRIMARY KEY NOT NULL,
  webhook_id text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload text,
  response_status integer,
  response_body text,
  duration_ms integer,
  created_at integer DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS whlog_webhook_idx ON webhook_logs(webhook_id);
