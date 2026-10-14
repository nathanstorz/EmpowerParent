-- database/schema.sql
-- One table, one row per testimonial.

CREATE TABLE IF NOT EXISTS testimonials (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  quote                TEXT    NOT NULL,
  attribution          TEXT    NOT NULL,
  permission_confirmed INTEGER NOT NULL DEFAULT 0,
  published            INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Speeds up the public page, which only asks for published rows, newest first.
CREATE INDEX IF NOT EXISTS idx_testimonials_published
  ON testimonials (published, created_at DESC);