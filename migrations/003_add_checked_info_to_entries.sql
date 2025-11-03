-- Migration 003: Add checked info to production entries

ALTER TABLE production_entries
  ADD COLUMN checked_by INT NULL AFTER checked,
  ADD COLUMN checked_at DATETIME NULL AFTER checked_by;
