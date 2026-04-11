-- Product categories per exhibitor
CREATE TABLE IF NOT EXISTS product_categories (
  id text PRIMARY KEY NOT NULL,
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS pcat_exhibitor_idx ON product_categories(exhibitor_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY NOT NULL,
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id) ON DELETE CASCADE,
  category_id text REFERENCES product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sku text,
  image_url text,
  price_cents integer NOT NULL DEFAULT 0,
  cost_cents integer NOT NULL DEFAULT 0,
  tax_rate real NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  stock_alert_threshold integer DEFAULT 5,
  is_active integer NOT NULL DEFAULT 1,
  is_online integer NOT NULL DEFAULT 0,
  weight_grams integer,
  sort_order integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS prod_exhibitor_idx ON products(exhibitor_id);
CREATE INDEX IF NOT EXISTS prod_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS prod_sku_idx ON products(sku);
CREATE INDEX IF NOT EXISTS prod_active_idx ON products(is_active);

-- Coupons / discount codes
CREATE TABLE IF NOT EXISTS coupons (
  id text PRIMARY KEY NOT NULL,
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value real NOT NULL DEFAULT 0,
  min_amount_cents integer DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from integer,
  valid_until integer,
  is_active integer NOT NULL DEFAULT 1,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS coupon_exhibitor_idx ON coupons(exhibitor_id);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_code_exhibitor_idx ON coupons(exhibitor_id, code);

-- Sales (transactions)
CREATE TABLE IF NOT EXISTS sales (
  id text PRIMARY KEY NOT NULL,
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id),
  sale_number integer NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  coupon_id text REFERENCES coupons(id),
  customer_name text,
  notes text,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS sale_exhibitor_idx ON sales(exhibitor_id);
CREATE INDEX IF NOT EXISTS sale_edition_idx ON sales(edition_id);
CREATE INDEX IF NOT EXISTS sale_date_idx ON sales(created_at);

-- Sale line items
CREATE TABLE IF NOT EXISTS sale_items (
  id text PRIMARY KEY NOT NULL,
  sale_id text NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id text REFERENCES products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS sitem_sale_idx ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sitem_product_idx ON sale_items(product_id);

-- Exhibitor expenses (costs, fees, booth rent, etc.)
CREATE TABLE IF NOT EXISTS exhibitor_expenses (
  id text PRIMARY KEY NOT NULL,
  exhibitor_id text NOT NULL REFERENCES exhibitor_profiles(id) ON DELETE CASCADE,
  edition_id text REFERENCES editions(id),
  category text NOT NULL DEFAULT 'other',
  label text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  date text,
  notes text,
  created_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS exp_exhibitor_idx ON exhibitor_expenses(exhibitor_id);
CREATE INDEX IF NOT EXISTS exp_edition_idx ON exhibitor_expenses(edition_id);
