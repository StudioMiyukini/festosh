-- Add pricing for electricity and water on booth types
ALTER TABLE booth_types ADD COLUMN electricity_price_cents INTEGER DEFAULT 0;
ALTER TABLE booth_types ADD COLUMN water_price_cents INTEGER DEFAULT 0;
ALTER TABLE booth_types ADD COLUMN equipment_options TEXT; -- JSON: [{item_id, included, price_cents}]

-- Add pricing for electricity and water on booth locations
ALTER TABLE booth_locations ADD COLUMN electricity_price_cents INTEGER DEFAULT 0;
ALTER TABLE booth_locations ADD COLUMN water_price_cents INTEGER DEFAULT 0;
