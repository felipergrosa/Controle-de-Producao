-- Migration 005: Add default reader mode preference to users

ALTER TABLE users
  ADD COLUMN default_reader_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER lastSignedIn;
