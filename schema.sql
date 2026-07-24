-- VISUAILS — D1 (SQLite) schema. Designed once, forward-looking: it already
-- carries the tables every planned feature needs (customer accounts + profile
-- prefill, per-account custom-model rosters, the order-tracking dashboard, and
-- file downloads), so nothing has to be rebuilt when those phases land.
-- Subscriptions are intentionally NOT here yet — that's the last phase.
--
-- Load it into your D1 database with:
--   wrangler d1 execute visuails --remote --file=./schema.sql
-- (and once more with --local for local dev).

PRAGMA foreign_keys = ON;

-- Customers / accounts. One row per brand. Phase 1 upserts this on every order
-- (by email) so the data is ready the moment logins are added; the account then
-- prefills the contact + VAT fields into order forms.
CREATE TABLE IF NOT EXISTS customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  brand         TEXT,
  website       TEXT,
  phone         TEXT,
  billing_address TEXT,
  country       TEXT,
  vat_number    TEXT,
  -- auth fields, filled when accounts go live (kept nullable now):
  auth_provider TEXT,            -- 'passkey' | 'password' | null
  password_hash TEXT,            -- only if password auth is chosen; never plaintext
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A brand's own custom models. These appear in that account's model picker only
-- (exclusive to the customer — never shown to anyone else). A model becomes
-- 'locked' after the custom-models flow and is then reusable on every order.
CREATE TABLE IF NOT EXISTS custom_models (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  preview_key  TEXT,             -- R2 object key of a small preview image
  status       TEXT NOT NULL DEFAULT 'in_design',  -- in_design | approved | locked
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_custom_models_customer ON custom_models(customer_id);

-- Orders. details_json holds the per-service fields (format, model, quality,
-- delivery, background, etc.) so one table fits catalog / lifestyle / video /
-- custom without a column per service.
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ref          TEXT NOT NULL UNIQUE,          -- customer-facing, e.g. VIS-4Q7-2AB
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  service      TEXT NOT NULL,                 -- catalog | lifestyle | video | custom | test-sample
  status       TEXT NOT NULL DEFAULT 'received', -- received | in_production | human_check | delivered | cancelled
  name         TEXT,
  brand        TEXT,
  email        TEXT NOT NULL,
  phone        TEXT,
  vat_number   TEXT,
  details_json TEXT,                          -- JSON string of everything else submitted
  total_cents  INTEGER,
  currency     TEXT NOT NULL DEFAULT 'EUR',
  source       TEXT,                          -- referrer / "how did you find us"
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_email    ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);

-- Status timeline — powers the dashboard's "where is my order" view.
CREATE TABLE IF NOT EXISTS order_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);

-- Delivered files (and, later, uploads). Stored in R2; this row is the index.
-- expires_at drives the download window + cheap lifecycle cleanup of big files.
CREATE TABLE IF NOT EXISTS files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'delivery',   -- upload | delivery | thumbnail
  r2_key     TEXT NOT NULL,
  filename   TEXT,
  bytes      INTEGER,
  expires_at TEXT,                                -- when the full-res download closes
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_order ON files(order_id);

-- Newsletter / lead-magnet signups (the briefing-photo checklist).
CREATE TABLE IF NOT EXISTS subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  source     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plain contact-form messages.
CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  name        TEXT,
  subject     TEXT,
  body        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
