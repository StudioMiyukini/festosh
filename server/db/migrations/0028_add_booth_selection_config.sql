-- Edition-level config: allow exhibitors to self-select booths
ALTER TABLE editions ADD COLUMN allow_booth_selection integer NOT NULL DEFAULT 0;

-- Track booth selection by exhibitor (in addition to admin assignment)
ALTER TABLE booth_applications ADD COLUMN selected_booth_id text REFERENCES booth_locations(id);
