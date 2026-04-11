ALTER TABLE exhibitor_profiles ADD COLUMN is_pmr integer DEFAULT 0;
ALTER TABLE exhibitor_profiles ADD COLUMN domains text DEFAULT '[]';
