-- 0032 inadvertently dropped the marketplace orders table (shipped in 0018)
-- and replaced it with a new shape intended for the exhibitor shop checkout.
-- This migration:
--   1. Renames those new tables to shop_orders / shop_order_items so they
--      don't conflict with the marketplace.
--   2. Recreates the marketplace orders / order_items tables with their
--      original 0018 shape so marketplace routes keep working.

ALTER TABLE orders RENAME TO shop_orders;
ALTER TABLE order_items RENAME TO shop_order_items;

-- Indexes referencing the renamed tables need new names to avoid conflicts
DROP INDEX IF EXISTS orders_order_number_idx;
DROP INDEX IF EXISTS orders_exhibitor_id_idx;
DROP INDEX IF EXISTS orders_customer_user_id_idx;
DROP INDEX IF EXISTS orders_status_idx;
DROP INDEX IF EXISTS orders_payment_intent_idx;
DROP INDEX IF EXISTS order_items_order_id_idx;
DROP INDEX IF EXISTS order_items_product_id_idx;

CREATE UNIQUE INDEX IF NOT EXISTS shop_orders_order_number_idx ON shop_orders(order_number);
CREATE INDEX IF NOT EXISTS shop_orders_exhibitor_id_idx ON shop_orders(exhibitor_id);
CREATE INDEX IF NOT EXISTS shop_orders_customer_user_id_idx ON shop_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON shop_orders(status);
CREATE INDEX IF NOT EXISTS shop_orders_payment_intent_idx ON shop_orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS shop_order_items_order_id_idx ON shop_order_items(order_id);
CREATE INDEX IF NOT EXISTS shop_order_items_product_id_idx ON shop_order_items(product_id);

-- Recreate the marketplace tables from 0018 (idempotent guard)
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
