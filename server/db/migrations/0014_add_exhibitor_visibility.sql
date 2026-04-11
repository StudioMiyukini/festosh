-- Per-field visibility settings for exhibitor profiles
-- JSON object: { "field_name": "public" | "organizer" }
-- Fields not listed default to "organizer" (private)
ALTER TABLE exhibitor_profiles ADD COLUMN visibility text DEFAULT '{}';
-- Global directory opt-in: 0 = hidden from directory, 1 = visible
ALTER TABLE exhibitor_profiles ADD COLUMN directory_visible integer DEFAULT 1;
