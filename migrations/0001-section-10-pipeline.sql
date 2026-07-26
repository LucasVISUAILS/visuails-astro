-- VISUAILS — migration 0001. Section 10: the order pipeline, the capacity gate
-- and the client portal.
--
-- Brings an EXISTING database up to the shape schema.sql now describes. A fresh
-- database does not need this file — load schema.sql instead. Both exist because
-- SQLite has no ADD COLUMN IF NOT EXISTS, so a create and an upgrade cannot be
-- expressed by the same statements.
--
-- Run it with:
--   wrangler d1 execute visuails --local  --file=./migrations/0001-section-10-pipeline.sql
--   wrangler d1 execute visuails --remote --file=./migrations/0001-section-10-pipeline.sql
--
-- RUNNING IT TWICE IS SAFE, AND IT WILL LOOK LIKE A FAILURE. The order below is
-- deliberate: every idempotent statement runs first, and the ALTER TABLEs come
-- last. On a second run you get
--
--   duplicate column name: tier
--
-- and execution stops there — which is the migration telling you it has already
-- been applied. Nothing is half-written; everything before that point is
-- IF NOT EXISTS and everything after it was applied by the first run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · New tables. Idempotent — see schema.sql for what each one is for and why.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blackout_days (
  day        TEXT PRIMARY KEY,                    -- 'YYYY-MM-DD'
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Stores a SHA-256 hash of the portal token, never the token. One live token per
-- order; re-issuing revokes the previous row. The partial unique index makes
-- that a database constraint rather than a convention.
CREATE TABLE IF NOT EXISTS order_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT,
  revoked_at   TEXT,
  last_used_at TEXT,
  uses         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_tokens_order ON order_tokens(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_tokens_live
  ON order_tokens(order_id) WHERE revoked_at IS NULL;

-- Fixed-window rate limiting for portal lookups. The key is a salted hash of the
-- IP plus a minute stamp — no IP address is stored here.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- Application-generated values that must survive a deploy. Currently the rate
-- limiter's IP salt, which generates itself on first use. See schema.sql.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · New columns. NOT idempotent — this is where a second run stops.
--
-- Every default here is a literal, not an expression: SQLite refuses to
-- ADD COLUMN with a non-constant default, so none of these can carry
-- DEFAULT (datetime('now')) the way the original columns do.
-- ─────────────────────────────────────────────────────────────────────────────

-- Existing rows all predate the tier model, and every one of them is an
-- individual-product order, so 'unattended' is the correct backfill as well as
-- the correct default.
ALTER TABLE orders ADD COLUMN tier          TEXT NOT NULL DEFAULT 'unattended';
-- 'en' is the right backfill as well as the right default: the existing rows
-- predate the language being stored, and the site's default locale is English.
ALTER TABLE orders ADD COLUMN lang          TEXT NOT NULL DEFAULT 'en';
ALTER TABLE orders ADD COLUMN product_count INTEGER;
ALTER TABLE orders ADD COLUMN window_start  TEXT;
ALTER TABLE orders ADD COLUMN window_end    TEXT;
ALTER TABLE orders ADD COLUMN closed_at     TEXT;

ALTER TABLE files ADD COLUMN review_state TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE files ADD COLUMN review_note  TEXT;
ALTER TABLE files ADD COLUMN reviewed_at  TEXT;
-- Key of a smaller rendition of the same photograph, for the portal's on-page
-- previews. Null is correct and falls back to r2_key. See schema.sql.
ALTER TABLE files ADD COLUMN preview_key  TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Indexes that depend on the columns above.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_window ON orders(window_start)
  WHERE window_start IS NOT NULL;
