-- VISUAILS — D1 (SQLite) schema. Designed once, forward-looking: it already
-- carries the tables every planned feature needs (customer accounts + profile
-- prefill, per-account custom-model rosters, the order-tracking dashboard, and
-- file downloads), so nothing has to be rebuilt when those phases land.
-- Subscriptions are intentionally NOT here yet — that's the last phase.
--
-- Load it into your D1 database with:
--   wrangler d1 execute visuails --remote --file=./schema.sql
-- (and once more with --local for local dev).
--
-- THIS FILE IS FOR A FRESH DATABASE. An existing database is brought forward by
-- the numbered files in migrations/ instead — SQLite has no ADD COLUMN IF NOT
-- EXISTS, so the two cannot be the same file. Anything added here must also be
-- added there, or a fresh install and a live install stop agreeing.

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

  -- ── Section 13 · the Tier 0 upgrade path ───────────────────────────────────
  -- When this brand was last shown the "a Full Drop covers 25–30 products"
  -- line in an order confirmation. NULL means never.
  --
  -- The VOLUME that triggers the prompt is not stored anywhere: it is summed
  -- from orders (customer_id + tier='unattended' + created_at within three
  -- months) at the moment the order is written, because a counter column is a
  -- second source of truth that drifts the first time an order is cancelled by
  -- hand. This column holds the one fact the orders table cannot answer —
  -- whether an email has already gone out this quarter — and it is what makes
  -- section 13's "once per quarter maximum" enforceable rather than hoped for.
  -- /api/order writes it as a compare-and-set, so two orders arriving together
  -- cannot both claim the quarter.
  upgrade_prompt_at TEXT,

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
  -- The language the client ordered in. Stored, not re-guessed: the confirmation
  -- email knows it because a form field carried it, but every later touch — the
  -- portal, the delivery mail, an aftercare message — arrives with no form and
  -- would otherwise fall back to Accept-Language or to English. A client who
  -- ordered in Dutch should not be answered in English three weeks later.
  lang         TEXT NOT NULL DEFAULT 'en',    -- 'en' | 'nl'
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),

  -- ── Section 10 · the order pipeline ────────────────────────────────────────
  -- 'unattended' is Tier 0 (order individual products, standard queue) and
  -- 'attended' is Tier 1 (run a whole drop, reserved window). The strings match
  -- the keys of TIERS in src/data/pricing.js exactly; they are the same model.
  tier          TEXT NOT NULL DEFAULT 'unattended',
  product_count INTEGER,                      -- what the capacity gate reserves against

  -- window_start being non-null IS the reservation. Nothing else marks a date as
  -- committed, and only a window clearedWindows() returned may ever be written
  -- here — that is what makes "we never promise a date the gate hasn't cleared"
  -- a property of the database rather than a promise about our own discipline.
  -- An unattended order leaves both null, forever: it has a queue span, not a date.
  window_start  TEXT,                         -- 'YYYY-MM-DD'
  window_end    TEXT,                         -- 'YYYY-MM-DD'

  closed_at     TEXT                          -- portal expiry counts 90 days from here
);
CREATE INDEX IF NOT EXISTS idx_orders_email    ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
-- The capacity gate's one hot query: live attended reservations from today on.
CREATE INDEX IF NOT EXISTS idx_orders_window   ON orders(window_start) WHERE window_start IS NOT NULL;

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

  -- R2 object key of a SMALLER RENDITION OF THE SAME PHOTOGRAPH — not a separate
  -- file row, not a crop, not a different image. The portal shows every delivered
  -- image on one page, and a drop is twenty-five of them: served at delivery
  -- resolution that page is hundreds of megabytes, which on a phone is not slow,
  -- it is broken. The portal reads `preview_key || r2_key`, so a null here is
  -- correct and degrades to full-res rather than to a missing image; the delivery
  -- pipeline fills it in and previews shrink with no code change.
  --
  -- Deliberately an explicit column rather than a naming convention on r2_key
  -- (a convention nothing enforces is a convention somebody breaks) and rather
  -- than Cloudflare Image Resizing (paid, and not confirmed enabled on this
  -- account). It mirrors custom_models.preview_key above, which means the same
  -- idea, on purpose.
  preview_key TEXT,

  filename   TEXT,
  bytes      INTEGER,
  expires_at TEXT,                                -- when the full-res download closes
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- ── Section 10 · per-image review, used by the client portal ───────────────
  -- Only ever meaningful on kind='delivery'. Tier 1 approves or asks for a
  -- revision one image at a time; Tier 0 sees the same rows as a download list
  -- and never touches these columns. 'pending' is the honest default: an image
  -- nobody has looked at yet is not an approved image.
  review_state TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | revision_requested
  review_note  TEXT,                              -- what the client asked for, in their words
  reviewed_at  TEXT
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

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10 · THE CAPACITY GATE AND THE CLIENT PORTAL
-- ─────────────────────────────────────────────────────────────────────────────

-- Days the studio is closed. src/data/capacity.js already excludes weekends on
-- its own, so this table is for holidays, travel and anything else that takes a
-- weekday out. One row per day; the gate reads them into a Set.
--
-- Blacking out a day the gate has ALREADY cleared does not move the order that
-- sits on it. That is deliberate: a reservation is a promise to a client, and a
-- calendar edit is not allowed to silently break one. The order has to be moved
-- by hand, with the client told, which is the only honest way to move a date.
CREATE TABLE IF NOT EXISTS blackout_days (
  day        TEXT PRIMARY KEY,                    -- 'YYYY-MM-DD'
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Client-portal tokens for /o/<token>.
--
-- WHAT IS STORED IS A HASH, NEVER THE TOKEN. The token exists exactly once, in
-- the moment it is minted, in the link that goes to the client. If this table
-- leaks, the attacker holds SHA-256 digests of 256-bit random strings, which is
-- nothing. Lookup hashes the incoming token and compares against token_hash.
--
-- The brief says the token is "single-use on issue". Read as burn-on-first-view
-- that would make the portal unusable — a client returns over days to approve
-- images one at a time, and the second visit would 404. The reading implemented
-- here is single-ISSUE: exactly one live token per order, minted once, and
-- re-issuing revokes the previous row. The partial unique index below makes that
-- a database constraint rather than a convention. FLAGGED FOR LUCAS.
CREATE TABLE IF NOT EXISTS order_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,              -- SHA-256 hex of the base64url token
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT,                              -- closed_at + 90 days, set when the order closes
  revoked_at   TEXT,                              -- set when a replacement is issued
  last_used_at TEXT,
  uses         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_order_tokens_order ON order_tokens(order_id);
-- One live token per order, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_tokens_live
  ON order_tokens(order_id) WHERE revoked_at IS NULL;

-- Fixed-window rate limiting, for the portal lookups the brief asks us to limit.
-- There is no KV binding on this project, so the counter lives in D1.
--
-- The key is sha256(ip + a server-side salt) with a minute stamp appended, so
-- this table never holds an IP address. It is a rate limiter, not a visitor log,
-- and it should not quietly become one.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,                    -- sha256(salt|ip):YYYY-MM-DDTHH:MM
  hits       INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- Values the application generates for itself and must not lose between
-- deployments. Right now that is one row: the salt the rate limiter hashes IP
-- addresses with, generated on first use rather than configured.
--
-- It lives in the database rather than in an environment variable on purpose.
-- A required env var has only bad failure modes when it goes missing — fail
-- closed and real clients cannot reach their photographs, fail open and the
-- privacy property disappears without a sound. Nobody needs to KNOW this value,
-- so nobody needs to supply it. See the header of src/lib/ratelimit.js.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
