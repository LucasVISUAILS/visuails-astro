-- VISUAILS — migration 0003. Admin login, customer accounts, payments.
--
-- Not a numbered brief section like 0001/0002 above — this did not come from
-- the original brief, it came from Lucas directly on 2026-07-27. Labelled by
-- request date rather than invented a section number that would misrepresent
-- where it came from.
--
-- Brings an EXISTING database up to the shape schema.sql now describes. A
-- fresh database does not need this file — load schema.sql instead. See 0001
-- for why the two cannot be the same statements.
--
-- Run it with:
--   wrangler d1 execute visuails --local  --file=./migrations/0003-admin-accounts-payments.sql
--   wrangler d1 execute visuails --remote --file=./migrations/0003-admin-accounts-payments.sql
--
-- RUNNING IT TWICE IS SAFE, AND IT WILL LOOK LIKE A FAILURE — same as 0001 and
-- 0002. SQLite has no ADD COLUMN IF NOT EXISTS, so a second run stops at the
-- first ALTER TABLE and reports
--
--   duplicate column name: payment_provider
--
-- which is the migration telling you it has already been applied. Everything
-- before that point is CREATE TABLE IF NOT EXISTS, so nothing is half-written.

-- ── Admin login ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);

-- ── Customer accounts (magic-link login) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  issued_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_tokens_customer ON account_tokens(customer_id);

CREATE TABLE IF NOT EXISTS account_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_sessions_customer ON account_sessions(customer_id);

-- ── Brand lock per style ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_style_locks (
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  style           TEXT NOT NULL,
  custom_model_id INTEGER NOT NULL REFERENCES custom_models(id) ON DELETE CASCADE,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, style)
);

-- ── Payments ─────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN payment_provider TEXT;
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN payment_ref TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  external_id  TEXT NOT NULL,
  status       TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'EUR',
  raw_payload  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external ON payments(provider, external_id);

-- ── order_events gets an actor ───────────────────────────────────────────────
ALTER TABLE order_events ADD COLUMN actor TEXT NOT NULL DEFAULT 'system';
