-- Add is_system column to cms_pages
ALTER TABLE cms_pages ADD COLUMN is_system integer DEFAULT 0;

-- Create cms_navigation table
CREATE TABLE IF NOT EXISTS cms_navigation (
  id text PRIMARY KEY NOT NULL,
  festival_id text NOT NULL REFERENCES festivals(id),
  parent_id text,
  label text NOT NULL,
  link_type text NOT NULL,
  target text NOT NULL,
  sort_order integer DEFAULT 0,
  is_visible integer DEFAULT 1,
  open_new_tab integer DEFAULT 0,
  created_at integer DEFAULT (unixepoch()),
  updated_at integer DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS cms_nav_festival_id_idx ON cms_navigation(festival_id);
CREATE INDEX IF NOT EXISTS cms_nav_parent_id_idx ON cms_navigation(parent_id);
CREATE INDEX IF NOT EXISTS cms_nav_sort_order_idx ON cms_navigation(sort_order);
