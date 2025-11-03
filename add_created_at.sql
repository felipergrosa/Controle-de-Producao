ALTER TABLE production_day_snapshots ADD COLUMN created_at timestamp NOT NULL DEFAULT (now());
