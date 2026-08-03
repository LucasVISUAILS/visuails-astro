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

  -- ── Saved order details (migrations/0004) ──────────────────────────────────
  -- Lucas, August 2026: a signed-in customer should be able to save the answers
  -- that do not change between orders and skip the steps they cover. Six of
  -- those seven fields are already columns above — name, brand, email, phone,
  -- website, vat_number — so the saved record IS this row rather than a second
  -- table that would have to be kept in step with it. These three are what the
  -- row could not already answer.
  --
  -- The background the brand orders against: a RECOMMENDED id from
  -- src/data/backgrounds.js ('white' | 'off-white' | 'beige') or
  -- CUSTOM_ID ('custom'). NULL means no default and /start asks as usual.
  default_background TEXT,
  -- The resolved six-digit hex, stored rather than looked up from the id: for
  -- 'custom' there is no id to look up, and for the four recommended values
  -- backgrounds.js calls its hexes "the contract" — what the studio renders
  -- against — so a later palette edit must not silently change what a brand's
  -- saved default means.
  default_background_hex TEXT,
  -- The difference between "we happen to know your phone number because you
  -- ordered once" and "you asked us to keep it". Every customer with an order
  -- has contact fields on file already; nobody chose that. NULL means never
  -- saved. Three behaviours read it: /start only collapses its brief step for a
  -- customer who opted in, the end-of-order offer to save appears only while it
  -- is NULL, and upsertCustomer() in functions/api/order.js stops letting a
  -- later order overwrite a saved value. See migrations/0004 for the argument.
  details_saved_at TEXT,

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

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN LOGIN, CUSTOMER ACCOUNTS, AND PAYMENTS — Lucas, 2026-07-27
--
-- Not a numbered brief section like 10/13/14 above; this is not from the
-- original brief. Labelled by request date instead of inventing a section
-- number that would misrepresent where it came from.
-- ─────────────────────────────────────────────────────────────────────────────

-- Lucas's own login to /admin. A real table with a real (hashed) password
-- rather than a bare env-var check, because this is access control, not a
-- privacy-preserving salt — see app_settings above for why those two get
-- different treatment. One row today; more than one is just another INSERT if
-- the studio ever has a second person who needs in.
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  -- PBKDF2-SHA256 via WebCrypto (Workers has no bcrypt), stored as
  -- "iterations:saltHex:hashHex". See src/lib/adminAuth.js.
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The admin session cookie. Same shape and the same reasoning as order_tokens
-- below: a hash is stored, never the token, and the raw value lives only in
-- the cookie the browser holds.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);

-- Customer account login: magic link by email, chosen over a password so
-- there is nothing of the client's to hash, reset or leak. Two tables, on
-- purpose, not one — the emailed link and the logged-in session are different
-- lifetimes wearing the same token pattern. account_tokens is what goes in the
-- email: short-lived (issued expecting use within minutes) and single-use,
-- because it exists to prove "this inbox belongs to this brand" exactly once.
-- account_sessions is what that proof buys: a much longer-lived cookie so the
-- client is not sent back to their inbox on every page load. This mirrors, and
-- deliberately does not reuse, order_tokens below — a portal link is mailed
-- once and stays live for the life of the order; a login link is mailed on
-- every sign-in and dies the moment it is used or the moment it goes stale,
-- whichever comes first.
CREATE TABLE IF NOT EXISTS account_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  issued_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,   -- short: minutes, not days
  used_at     TEXT             -- set the moment the link is redeemed; a used link is dead
);
CREATE INDEX IF NOT EXISTS idx_account_tokens_customer ON account_tokens(customer_id);

CREATE TABLE IF NOT EXISTS account_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at   TEXT NOT NULL,   -- long: weeks, refreshed on use
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_sessions_customer ON account_sessions(customer_id);

-- A brand's locked-in custom model per style. "Style" is the same vocabulary
-- as PER_PRODUCT ids in src/data/pricing.js (catalog | lifestyle | video), not
-- a new enum invented for this table — so the account dashboard and the order
-- form agree on what a "style" is without a translation layer between them.
-- One lock per (customer, style): setting a new one for a style replaces the
-- old row rather than accumulating a history nobody asked for.
CREATE TABLE IF NOT EXISTS customer_style_locks (
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  style           TEXT NOT NULL,     -- 'catalog' | 'lifestyle' | 'video'
  custom_model_id INTEGER NOT NULL REFERENCES custom_models(id) ON DELETE CASCADE,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (customer_id, style)
);

-- Payment fields on orders. Nullable / defaulted so every existing order row
-- reads as "unpaid, no provider" without a backfill — accurate, since nothing
-- on the site has ever taken money yet.
ALTER TABLE orders ADD COLUMN payment_provider TEXT;          -- 'mollie' | 'stripe' | NULL
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  -- unpaid | pending | paid | failed | refunded
ALTER TABLE orders ADD COLUMN payment_ref TEXT;                -- provider's payment/session id
ALTER TABLE orders ADD COLUMN paid_at TEXT;

-- One row per payment EVENT, not per order — a webhook can fire more than
-- once for the same attempt (retries) and a client can retry a failed
-- payment, so this is a log the order's own payment_status is folded from,
-- not a second copy of it. idx_payments_external is what makes a webhook
-- handler idempotent: the same (provider, external_id) arriving twice is a
-- constraint violation, not a double-counted payment.
CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,        -- 'mollie' | 'stripe'
  external_id  TEXT NOT NULL,        -- Mollie payment id / Stripe session or intent id
  status       TEXT NOT NULL,        -- the provider's own status string, stored verbatim
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'EUR',
  raw_payload  TEXT,                 -- the webhook body, kept for reconciliation and disputes
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_external ON payments(provider, external_id);

-- order_events gets an actor, so the admin dashboard (and the client portal
-- timeline, later) can tell a row the system wrote at order creation from one
-- Lucas typed by hand after moving an order's status. Defaulted to 'system'
-- so every existing row reads correctly with no backfill: every order_events
-- row written before this column existed was, in fact, system-written — the
-- order-creation insert in functions/api/order.js is the only writer today.
ALTER TABLE order_events ADD COLUMN actor TEXT NOT NULL DEFAULT 'system';
  -- 'system' | 'admin'
