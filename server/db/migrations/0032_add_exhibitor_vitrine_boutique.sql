-- ─── Exhibitor: slug + boutique fields ─────────────────────────────────────
ALTER TABLE exhibitor_profiles ADD COLUMN slug TEXT;
ALTER TABLE exhibitor_profiles ADD COLUMN boutique_enabled INTEGER DEFAULT 0;
ALTER TABLE exhibitor_profiles ADD COLUMN boutique_intro TEXT;
ALTER TABLE exhibitor_profiles ADD COLUMN boutique_currency TEXT DEFAULT 'EUR';
ALTER TABLE exhibitor_profiles ADD COLUMN boutique_shipping_cents INTEGER DEFAULT 0;
ALTER TABLE exhibitor_profiles ADD COLUMN boutique_free_shipping_above_cents INTEGER;
ALTER TABLE exhibitor_profiles ADD COLUMN vitrine_page_id TEXT;
ALTER TABLE exhibitor_profiles ADD COLUMN payment_provider TEXT DEFAULT 'mock';
ALTER TABLE exhibitor_profiles ADD COLUMN stripe_account_id TEXT;

-- Backfill: generate URL-safe slugs for existing exhibitors. Append the first
-- 6 chars of id to guarantee uniqueness, so the index can be added afterwards.
UPDATE exhibitor_profiles
SET slug = lower(
  replace(replace(replace(replace(replace(replace(replace(replace(replace(
    coalesce(nullif(trim(company_name), ''), nullif(trim(trade_name), ''), 'exposant'),
    ' ', '-'), '.', ''), '/', '-'), '''', ''), '"', ''), '&', 'et'), ',', ''), '(', ''), ')', '')
) || '-' || substr(id, 1, 6)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS exhibitor_profiles_slug_idx ON exhibitor_profiles(slug);

-- ─── CMS pages: support exhibitor-owned pages ──────────────────────────────
-- SQLite cannot ALTER a column to drop NOT NULL — so we add an exhibitor_id column.
-- Existing rows keep festival_id; new exhibitor pages set exhibitor_id and leave festival_id NULL.
-- The runtime application enforces "exactly one of festival_id / exhibitor_id is set".
ALTER TABLE cms_pages ADD COLUMN exhibitor_id TEXT REFERENCES exhibitor_profiles(id);
CREATE INDEX IF NOT EXISTS cms_pages_exhibitor_id_idx ON cms_pages(exhibitor_id);
CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_exhibitor_slug_idx ON cms_pages(exhibitor_id, slug);

-- Workaround: festival_id was declared NOT NULL in the original schema. SQLite's
-- relaxed handling lets us still INSERT NULL when using direct exec, but to keep things
-- consistent we rebuild the table without the NOT NULL constraint.
CREATE TABLE cms_pages_new (
  id TEXT PRIMARY KEY NOT NULL,
  festival_id TEXT REFERENCES festivals(id),
  exhibitor_id TEXT REFERENCES exhibitor_profiles(id),
  slug TEXT,
  title TEXT,
  is_published INTEGER DEFAULT 0,
  is_homepage INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by TEXT REFERENCES profiles(id),
  created_at INTEGER,
  updated_at INTEGER
);

INSERT INTO cms_pages_new (id, festival_id, exhibitor_id, slug, title, is_published, is_homepage, is_system, meta_description, sort_order, created_by, created_at, updated_at)
SELECT id, festival_id, exhibitor_id, slug, title, is_published, is_homepage, is_system, meta_description, sort_order, created_by, created_at, updated_at
FROM cms_pages;

DROP TABLE cms_pages;
ALTER TABLE cms_pages_new RENAME TO cms_pages;

CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_festival_slug_idx ON cms_pages(festival_id, slug);
CREATE INDEX IF NOT EXISTS cms_pages_festival_id_idx ON cms_pages(festival_id);
CREATE INDEX IF NOT EXISTS cms_pages_is_published_idx ON cms_pages(is_published);
CREATE INDEX IF NOT EXISTS cms_pages_exhibitor_id_idx ON cms_pages(exhibitor_id);
CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_exhibitor_slug_idx ON cms_pages(exhibitor_id, slug);

-- ─── Products: enrich for online shop ──────────────────────────────────────
ALTER TABLE products ADD COLUMN gallery_urls TEXT DEFAULT '[]';
ALTER TABLE products ADD COLUMN online_description TEXT;
ALTER TABLE products ADD COLUMN online_sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN slug TEXT;

CREATE INDEX IF NOT EXISTS prod_online_idx ON products(is_online);
CREATE INDEX IF NOT EXISTS prod_slug_exhibitor_idx ON products(exhibitor_id, slug);

-- ─── Shop: orders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  exhibitor_id TEXT NOT NULL REFERENCES exhibitor_profiles(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | fulfilled | shipped | delivered | cancelled | refunded
  customer_user_id TEXT REFERENCES profiles(id),
  customer_email TEXT NOT NULL,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_phone TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_postal_code TEXT,
  shipping_city TEXT,
  shipping_country TEXT DEFAULT 'FR',
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_postal_code TEXT,
  billing_city TEXT,
  billing_country TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_provider TEXT, -- mock | stripe | etc.
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending | succeeded | failed | refunded
  payment_method TEXT,
  notes TEXT,
  tracking_url TEXT,
  paid_at INTEGER,
  shipped_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);
CREATE INDEX IF NOT EXISTS orders_exhibitor_id_idx ON orders(exhibitor_id);
CREATE INDEX IF NOT EXISTS orders_customer_user_id_idx ON orders(customer_user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_intent_idx ON orders(payment_intent_id);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_sku TEXT,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  tax_rate REAL NOT NULL DEFAULT 0,
  subtotal_cents INTEGER NOT NULL,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items(product_id);
