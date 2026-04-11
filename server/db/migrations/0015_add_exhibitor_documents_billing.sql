-- Document file URLs (linked to uploaded documents)
ALTER TABLE exhibitor_profiles ADD COLUMN kbis_file_url text;
ALTER TABLE exhibitor_profiles ADD COLUMN insurance_file_url text;
ALTER TABLE exhibitor_profiles ADD COLUMN id_file_url text;

-- Insurance expiry for renewal reminders
ALTER TABLE exhibitor_profiles ADD COLUMN insurance_expires_at integer;

-- Billing address (separate from company address)
ALTER TABLE exhibitor_profiles ADD COLUMN billing_address_line1 text;
ALTER TABLE exhibitor_profiles ADD COLUMN billing_address_line2 text;
ALTER TABLE exhibitor_profiles ADD COLUMN billing_postal_code text;
ALTER TABLE exhibitor_profiles ADD COLUMN billing_city text;
ALTER TABLE exhibitor_profiles ADD COLUMN billing_country text DEFAULT 'FR';
