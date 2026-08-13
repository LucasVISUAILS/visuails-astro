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
  reviewed_at  TEXT,

  -- ── August 2026 · which product, which angle (migration 0005) ──────────────
  -- Only ever meaningful on kind='upload'. /start step 2 asks for four
  -- photographs PER PRODUCT (src/data/shots.js) instead of one heap per order,
  -- /api/upload stores the answer in the R2 object's customMetadata, and
  -- /api/order copies it here when the staged batch becomes rows.
  --
  -- product_key is the uploader's own stable key for one product card — 'p1'…
  -- 'p30' — and NOT what the customer calls the product. That name is a fact
  -- about the ORDER, not about this file, so it stays in orders.details_json
  -- where the rest of the form's answers are, as 'product_p1'. The two join on
  -- the key and neither duplicates the other.
  --
  -- NULL on every delivery row and on every upload that predates the change,
  -- and no reader may default a NULL to the front shot: "nobody said" is not
  -- the same answer as "this is the front", and the second one is a wrong
  -- photograph on a product page.
  product_key TEXT,                               -- 'p1'…, safeProduct()-flattened
  shot        TEXT                                -- front | back | detail | worn
);
CREATE INDEX IF NOT EXISTS idx_files_order ON files(order_id);
CREATE INDEX IF NOT EXISTS idx_files_product ON files(order_id, product_key);

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
-- The brand kit: what this customer always wants, per style. Grew past "one
-- custom model" in August 2026 (migration 0007) — see that file for why every
-- column is nullable and why a roster id sits beside a custom model id.
CREATE TABLE IF NOT EXISTS customer_style_locks (
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  style           TEXT NOT NULL,     -- 'catalog' | 'lifestyle' | 'video'
  custom_model_id INTEGER REFERENCES custom_models(id) ON DELETE SET NULL,
  roster_model    TEXT,              -- a standard-roster id from src/data/models.js
  background_hex  TEXT,              -- resolved hex, or NULL for "ask per order"
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

-- ── August 2026 · payable orders (migration 0006) ────────────────────────────
-- window_expires_at: when an UNPAID reservation is released again. Written only
-- for an order that both reserved a window and has something to pay; cleared by
-- the webhook on payment. NULL means nothing is counting down, which is correct
-- for every unattended order and every settled one.
ALTER TABLE orders ADD COLUMN window_expires_at TEXT;
-- refunded_cents: how much came back. On the ORDER, not as a second payments
-- row, so UNIQUE(provider, external_id) keeps doing its job — that constraint
-- is what made refunds vanish silently before this existed.
ALTER TABLE orders ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;

-- ── August 2026 · delivery (migration 0007) ──────────────────────────────────
-- delivered_at is when the studio moved it to delivered; delivery_mailed_at is
-- whether the customer was told. Two columns because setting a status twice is
-- a thing that happens, and the second one is what stops a second email.
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN delivery_mailed_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_window_expiry
  ON orders(window_expires_at) WHERE window_expires_at IS NOT NULL;


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


-- ─────────────────────────────────────────────────────────────────────────────
-- August 2026 · revisies en herleveringen (migraties 0009, 0010, 0011)
--
-- WAAROM DIT BLOK BESTAAT. schema.sql was drie migraties achterop geraakt, en
-- dat is niet cosmetisch: dit bestand is wat een LEGE database maakt. Zonder
-- revision_requests hieronder zou een verse D1 — een tweede omgeving, een
-- herstel na verlies — de revisieknop wél tonen en bij de eerste aanvraag
-- omvallen op "no such table". Wie een migratie toevoegt, voegt hem hier ook
-- toe; migrations/ is de weg van oud naar nieuw, dit is de bestemming.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0009 — één account per e-mailadres, ongeacht hoofdletters. Op de EXPRESSIE
-- lower(email), niet op de kolom: de planner gebruikt hem alleen als de WHERE
-- letterlijk dezelfde expressie bevat, en dat is precies hoe account.js zoekt.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_lower ON customers (lower(email));

-- 0010 — revisies worden geteld, niet begrensd. Zie migrations/0010 voor het
-- volledige waarom; kort: één regel per aanvraag bewaart de geschiedenis die
-- files.review_note zou overschrijven, en intrekken is een handeling van een
-- mens en geen limiet in code.
CREATE TABLE IF NOT EXISTS revision_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  note        TEXT NOT NULL CHECK (length(trim(note)) > 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_revision_requests_order ON revision_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_customer ON revision_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_revision_requests_open ON revision_requests(created_at) WHERE resolved_at IS NULL;
ALTER TABLE customers ADD COLUMN revisions_revoked_at TEXT;
ALTER TABLE customers ADD COLUMN revisions_revoked_note TEXT;

-- 0011 — een herlevering is ook nieuws. delivery_mailed_at blijft de EERSTE
-- aankondiging bewaken; wat daarna geleverd wordt heeft zijn eigen stempel per
-- bestand (announced_at) en zijn eigen teller op de bestelling. De knop in
-- admin verstuurt één bericht voor alles wat nog niet aangekondigd is, zodat
-- drie beelden achter elkaar niet drie mails zijn.
ALTER TABLE orders ADD COLUMN redelivery_mailed_at TEXT;
ALTER TABLE orders ADD COLUMN redelivery_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE files ADD COLUMN announced_at TEXT;
CREATE INDEX IF NOT EXISTS idx_files_unannounced
  ON files (order_id) WHERE kind = 'delivery' AND announced_at IS NULL;

-- 0012 — een beeld hoort bij een product. product_key/shot bestonden al voor
-- élke rij; wat ontbrak was het besef dat een tweede levering voor dezelfde
-- product+shot een VERVANGING is en geen extra beeld. Zonder dat groeit een
-- product na drie revisieronden naar zeven beelden waarvan de klant er vier
-- moet negeren. De klant ziet alleen de levende beelden, admin de hele stapel.
ALTER TABLE files ADD COLUMN superseded_at TEXT;
CREATE INDEX IF NOT EXISTS idx_files_live_delivery
  ON files (order_id, product_key, shot)
  WHERE kind = 'delivery' AND superseded_at IS NULL;

-- 0013 — het gesprek hoort bij de bestelling. orders.customer_note is één
-- staande mededeling die de klant meeleest; order_notes is het interne logboek
-- dat door GEEN ENKELE klantquery wordt aangeraakt (dat is de garantie, niet
-- een visibility-kolom die je moet onthouden te filteren); resolution_note is
-- de regel terug bij een afgehandelde revisie.
ALTER TABLE orders ADD COLUMN customer_note TEXT;
ALTER TABLE orders ADD COLUMN customer_note_at TEXT;
CREATE TABLE IF NOT EXISTS order_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (length(trim(body)) > 0),
  author     TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id, id);
ALTER TABLE revision_requests ADD COLUMN resolution_note TEXT;

-- 0014 — terugdraaien, wegstoppen, en een spoor. Annuleren (met reden en een
-- expliciete keuze over het geld), verbergen (uit de lijsten, niet uit de
-- database), en admin_log: een tabel die de klant NIET leest, zodat er ook
-- dingen in kunnen die hij niet hoort te zien. invoice_archive is wat er van
-- een bestelling overblijft nadat de klant op AVG-verzoek gewist is.
ALTER TABLE orders ADD COLUMN hidden_at TEXT;
ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN cancel_payment TEXT;
ALTER TABLE orders ADD COLUMN cancelled_at TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_visible
  ON orders (status, id) WHERE hidden_at IS NULL;
CREATE TABLE IF NOT EXISTS admin_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id    INTEGER,
  admin_email TEXT,
  action      TEXT NOT NULL,
  order_id    INTEGER,
  customer_id INTEGER,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_log_time ON admin_log(id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_order ON admin_log(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_customer ON admin_log(customer_id);
CREATE TABLE IF NOT EXISTS invoice_archive (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ref          TEXT NOT NULL,
  service      TEXT,
  total_cents  INTEGER NOT NULL DEFAULT 0,
  vat_cents    INTEGER NOT NULL DEFAULT 0,
  paid_at      TEXT,
  created_at   TEXT,
  archived_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoice_archive_ref ON invoice_archive(ref);

-- ─────────────────────────────────────────────────────────────────────────────
-- 0015 · WAAR DE KLANT ZIT, EN WELKE BTW DAARBIJ HOORT
-- Zie migrations/0015-vat-country.sql voor het volledige verhaal. Kort: de btw
-- wordt vanaf nu bij de checkout bepaald in plaats van achteraf op de factuur
-- rechtgezet, en dat kan alleen met het land en het VIES-bewijs erbij. Dit
-- repareert ook orders.vat_cents, een kolom die src/lib/admin.js al SELECT'te
-- en die niet bestond — waardoor het bewaarplicht-archief stilzwijgend leeg
-- bleef bij elke klantverwijdering.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN country TEXT;
ALTER TABLE orders ADD COLUMN billing_address TEXT;
ALTER TABLE orders ADD COLUMN vat_treatment TEXT NOT NULL DEFAULT 'nl_standard';
ALTER TABLE orders ADD COLUMN vat_rate REAL NOT NULL DEFAULT 0.21;
ALTER TABLE orders ADD COLUMN vat_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_valid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_checked_at TEXT;
ALTER TABLE orders ADD COLUMN vat_consultation TEXT;
ALTER TABLE orders ADD COLUMN vat_check_name TEXT;
ALTER TABLE orders ADD COLUMN vat_check_json TEXT;
ALTER TABLE orders ADD COLUMN icp_reported_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_icp_due
  ON orders (paid_at)
  WHERE vat_treatment = 'eu_reverse_charge' AND icp_reported_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_vat_treatment ON orders (vat_treatment);

-- ─────────────────────────────────────────────────────────────────────────────
-- 0016 · DE NAAM EN HET ADRES, UIT ELKAAR
-- Zie migrations/0016-address-lines.sql voor het volledige verhaal. Kort: een
-- factuur zet een adres op drie regels en dat is uit één vrij ingetypt veld niet
-- te halen; browsers vullen address-line1/postal-code/address-level2 wél
-- betrouwbaar in en `street-address` op één input niet. `name` en
-- `billing_address` blijven bestaan als de SAMENGESTELDE weergave — zie
-- src/data/address.js, dat op één plek bepaalt hoe die eruitzien.
--
-- no_vat_number is het verschil tussen "nog niet ingevuld" en "die heb ik niet".
-- Het zegt alleen iets over het formulier; vatDecision() in src/data/vat.js
-- kijkt naar het land en naar een bij VIES bevestigd nummer, en een vinkje kan
-- daar geen 0% kopen.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN first_name    TEXT;
ALTER TABLE customers ADD COLUMN last_name     TEXT;
ALTER TABLE customers ADD COLUMN no_vat_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN address_line1 TEXT;
ALTER TABLE customers ADD COLUMN address_line2 TEXT;
ALTER TABLE customers ADD COLUMN postal_code   TEXT;
ALTER TABLE customers ADD COLUMN city          TEXT;
ALTER TABLE customers ADD COLUMN region        TEXT;

ALTER TABLE orders ADD COLUMN first_name    TEXT;
ALTER TABLE orders ADD COLUMN last_name     TEXT;
ALTER TABLE orders ADD COLUMN no_vat_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN address_line1 TEXT;
ALTER TABLE orders ADD COLUMN address_line2 TEXT;
ALTER TABLE orders ADD COLUMN postal_code   TEXT;
ALTER TABLE orders ADD COLUMN city          TEXT;
ALTER TABLE orders ADD COLUMN region        TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0017 · ZES CIJFERS NAAST DE INLOGLINK
-- Zie migrations/0017-login-code.sql. Kort: dezelfde mail draagt een eenmalige
-- code, zodat niemand van zijn mailapp naar een browser hoeft te springen — op
-- mobiel de plek waar mensen afhaken. Tien minuten, vijf pogingen, daarna is de
-- code dood en werkt alleen de link nog. Geen door de klant gekozen pincode:
-- dat zou een wachtwoord van zes cijfers zijn.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE account_tokens ADD COLUMN code_hash       TEXT;
ALTER TABLE account_tokens ADD COLUMN code_expires_at TEXT;
ALTER TABLE account_tokens ADD COLUMN code_attempts   INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_account_tokens_code
  ON account_tokens (customer_id, code_expires_at)
  WHERE code_hash IS NOT NULL;
-- Gevraagd bij de bestelling, ingelost bij de eerste keer inloggen — zie de
-- migratie voor waarom dat twee momenten zijn en geen één.
ALTER TABLE customers ADD COLUMN save_requested_at TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0010 · DE DRIE INDEXEN OP revision_requests DIE HIER NOOIT STONDEN
--
-- Gevonden op 9 augustus 2026 door tests/schema.test.mjs, die schema.sql op een
-- verse database draait en daarna elke migratie erover heen haalt om te zien of er
-- nog iets bijkomt. Er kwam iets bij, en niet uit de zes migraties die ik net had
-- toegevoegd: deze drie staan sinds migratie 0010 in de migratiereeks en hebben dit
-- bestand nooit gehaald.
--
-- De TABEL stond er wel, de indexen niet. Een verse database zou dus werken en bij
-- elke revisielijst in het adminportaal een volledige tabelscan doen — het soort
-- verschil dat pas opvalt als er duizend rijen staan, en dan als "het dashboard is
-- traag geworden" in plaats van als een ontbrekende index.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_revreq_open  ON revision_requests(resolved_at, created_at);
CREATE INDEX IF NOT EXISTS idx_revreq_order ON revision_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_revreq_cust  ON revision_requests(customer_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 9 AUGUSTUS 2026 — DIT BESTAND STOPTE BIJ 0017 EN DAT WAS EEN TIJDBOM
-- ═════════════════════════════════════════════════════════════════════════════
--
-- De kop hierboven zegt: "Anything added here must also be added there, or a fresh
-- install and a live install stop agreeing." Precies dat was gebeurd. Zes migraties
-- lang — 0018 tot en met 0023 — was dit bestand niet meegegroeid:
--
--   · alle twaalf orderkolommen van de btw-poort (0018) ontbraken;
--   · `channels` op de merkset (0019);
--   · de tabel `order_feedback` (0020), dus reviews konden niet worden opgeslagen;
--   · de tabellen `invoice_series` en `invoices` (0021) — en zonder die twee valt
--     issueInvoice() meteen om, dus MISLUKT DE FACTUURSTAP BIJ ELKE BETALING;
--   · `file_assets` (0022), dus geen formaatvarianten;
--   · `origin_country` (0023);
--   · `payer_hash` en `payer_kind` (0024), dus een tweede
--     proefvisual op dezelfde bankrekening valt niet meer op.
--
-- Dat is geen dringend probleem zolang de database bestaat en bijgewerkt is. Het is
-- een tijdbom die afgaat op de dag dat je hem het hardst nodig hebt: bij herstel na
-- een storing. En dat viel samen met het tweede gat uit dezelfde audit — er was ook
-- nog nooit een back-up gemaakt. Geen kopie van de gegevens, en geen betrouwbaar
-- recept voor de structuur.
--
-- De blokken hieronder zijn overgenomen uit de migratiebestanden zelf en niet met de
-- hand nagetypt, zodat er geen derde versie van dezelfde waarheid ontstaat. Alleen de
-- CREATE- en ALTER-statements: die migraties bevatten geen backfill, dus er is niets
-- dat op een verse database iets zou moeten bijwerken.

-- ────────────────────────────────────────────────────────────────────────────
-- 0018 · DE BTW-POORT
-- Zie migrations/0018-vat-review.sql. Kort: een btw-opgave die wij niet kunnen
-- nakijken — buiten de EU bestaat geen register — houdt de bestelling vast op
-- `review_state = 'pending'` en er wordt geen betaallink gemaakt. Sinds 9 augustus
-- 2026 is er ook een scherm dat die stapel leest (/admin/vat) en respecteert de
-- betaalknop in VISUAILS Studio de poort.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN review_state TEXT;
ALTER TABLE orders ADD COLUMN review_reason TEXT;
ALTER TABLE orders ADD COLUMN review_requested_at TEXT;
ALTER TABLE orders ADD COLUMN review_deadline TEXT;
ALTER TABLE orders ADD COLUMN reviewed_at TEXT;
ALTER TABLE orders ADD COLUMN reviewed_by TEXT;
ALTER TABLE orders ADD COLUMN payment_deadline TEXT;
ALTER TABLE orders ADD COLUMN vat_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN vat_valid_state INTEGER;
ALTER TABLE orders ADD COLUMN vat_check_error TEXT;
ALTER TABLE orders ADD COLUMN payment_method TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_review
  ON orders (review_state, review_deadline) WHERE review_state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_deadline
  ON orders (payment_deadline) WHERE payment_deadline IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 0019 · DE KANALEN IN DE MERKSET
-- Zie migrations/0019-brand-kit-channels.sql.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE customer_style_locks ADD COLUMN channels TEXT;

-- ── De vaste beeldverhouding (migratie 0028, 13 augustus 2026) ───────────────
-- De vierde vaste voorkeur, naast gezicht, achtergrond en kanalen. Per DIENST,
-- want catalog wil er één voor het hele assortiment en lifestyle wil er een als
-- standaard waar per beeld van afgeweken mag worden. Waardes zijn de id's uit
-- src/data/ratios.js; ze worden daar gecontroleerd en niet met een CHECK hier —
-- welke verhoudingen mogen, verschilt per dienst en beweegt mee met wat we
-- verkopen. Zie migrations/0028-vaste-verhouding.sql.
ALTER TABLE customer_style_locks ADD COLUMN ratio TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 0020 · DE REVIEWVRAAG NA EEN AFGERONDE BESTELLING
-- Zie migrations/0020-order-feedback.sql. Let op: `testimonial_approved` wordt op
-- dit moment door niets op 1 gezet — er is nog geen goedkeurscherm en geen blok op
-- de site dat goedgekeurde reviews toont. Zie AUDIT-9-AUGUSTUS.md §7.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_feedback (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id         INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  score               INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  private_note        TEXT,
  platforms_clicked   TEXT,
  testimonial_text    TEXT,
  testimonial_name    TEXT,
  testimonial_consent INTEGER NOT NULL DEFAULT 0,
  testimonial_approved INTEGER NOT NULL DEFAULT 0,
  asked_at            TEXT NOT NULL DEFAULT (datetime('now')),
  reminder_sent_at    TEXT,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_pending
  ON order_feedback(testimonial_approved, asked_at)
  WHERE testimonial_consent = 1;
CREATE INDEX IF NOT EXISTS idx_feedback_live
  ON order_feedback(updated_at)
  WHERE testimonial_approved = 1;
CREATE INDEX IF NOT EXISTS idx_feedback_reminder
  ON order_feedback(asked_at)
  WHERE reminder_sent_at IS NULL AND platforms_clicked IS NULL AND testimonial_text IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 0021 · FACTUREN MET EEN DOORLOPENDE NUMMERING
-- Zie migrations/0021-invoices.sql. `invoice_series` houdt per jaar het laatste
-- nummer bij; `snapshot_json` bevat de volledige invoer van renderInvoicePdf(),
-- zodat dezelfde factuur byte-identiek opnieuw te maken is. De nachtelijke taak in
-- cron/index.js gebruikt precies dat om een vastgelopen factuur alsnog uit te geven.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_series (
  year        INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS invoices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  number      TEXT    NOT NULL UNIQUE,
  year        INTEGER NOT NULL,
  seq         INTEGER NOT NULL,
  order_id    INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'issued', 'void')),
  void_reason TEXT,
  pdf_key     TEXT,
  pdf_bytes   INTEGER,
  snapshot_json TEXT NOT NULL,
  lang        TEXT    NOT NULL DEFAULT 'nl',
  issued_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (status <> 'issued' OR pdf_key IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_invoices_order  ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_series ON invoices(year, seq);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON invoices(created_at) WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────────────────────
-- 0022 · ÉÉN BEELD, DRIE FORMATEN
-- Zie migrations/0022-delivery-assets.sql. De klant krijgt een map met png, jpg en
-- webp; `file_assets` houdt bij welk object in R2 bij welk formaat hoort. De
-- opruimtaak in cron/index.js moet deze rijen kennen, want ON DELETE CASCADE ruimt
-- de RIJEN op en niet de objecten in de bucket.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_assets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  format      TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'webp')),
  r2_key      TEXT NOT NULL,
  bytes       INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (file_id, format)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WAAR IEMAND HET BESTELFORMULIER VERLAAT — 12 augustus 2026
--
-- Volledige uitleg in migrations/0025-funnel.sql; hier alleen de tabel, want dit
-- bestand is voor een verse database. Kort: het formulier is één pagina met vijf
-- stappen die met JavaScript wisselen, dus geen enkele stapwissel is een
-- paginabezoek en Web Analytics zag er niets van.
--
-- Eén teller per dag, dienst, taal en stap. Geen bezoeker, geen sessie, geen ip,
-- geen tijdstip preciezer dan de dag — er staat dus niets in deze tabel dat naar
-- een persoon leidt, ook niet in combinatie. Dat is de reden dat er geen
-- cookiebanner-categorie bij hoort.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funnel_hits (
  day   TEXT NOT NULL,               -- 'YYYY-MM-DD', UTC
  flow  TEXT NOT NULL,               -- wire-waarde uit orders.service
  lang  TEXT NOT NULL,               -- 'en' | 'nl'
  step  INTEGER NOT NULL,            -- 1..8
  hits  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, flow, lang, step)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CREDITNOTA'S — 12 augustus 2026
--
-- Volledige uitleg in migrations/0026-credit-notes.sql. Kort: de webhook boekte een
-- terugbetaling wel (orders.refunded_cents) maar de uitgereikte factuur bleef op het
-- volle bedrag staan. Een uitgereikte factuur pas je niet aan; je credit hem.
--
-- Eigen tabel, en het nummer komt uit dezelfde `invoice_series` als een factuur —
-- één doorlopende reeks zonder gaten. `invoices` is daarvoor niet aangeraakt, want
-- het alternatief (een `kind`-kolom) vroeg om een herbouw van die tabel: SQLite kan
-- de UNIQUE op order_id niet weghalen.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Uit invoice_series, zelfde vorm als een factuurnummer: 'VIS-2026-0008'.
  number      TEXT    NOT NULL UNIQUE,
  year        INTEGER NOT NULL,
  seq         INTEGER NOT NULL,

  -- De factuur die gecrediteerd wordt. NOT NULL: een creditnota zonder factuur is
  -- geen creditnota maar een betaling zonder grond. ON DELETE RESTRICT om dezelfde
  -- reden als bij invoices.order_id — een uitgereikt document verdwijnt niet omdat
  -- er iets anders wordt opgeruimd.
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- GEEN UNIQUE op invoice_id, en dat is opzet. Een bestelling kan twee keer
  -- gedeeltelijk terugbetaald worden — eerst € 200, later nog € 100 — en dan zijn
  -- dat twee creditnota's op dezelfde factuur. De bewaking tegen dubbel crediteren
  -- staat daarom niet op deze kolom maar op het BEDRAG: zie de noot bij
  -- issueCreditNote() in src/lib/invoice.js, die optelt wat er al gecrediteerd is
  -- en alleen het verschil uitgeeft.
  --
  -- Het terugbetaalde bedrag waarvoor DEZE nota staat, in centen, zonder btw,
  -- plus de btw die eroverheen wordt gecrediteerd. Beide positief: de nota heet
  -- creditnota, dus het teken staat in de titel en niet in de getallen.
  net_cents   INTEGER NOT NULL,
  vat_cents   INTEGER NOT NULL DEFAULT 0,
  gross_cents INTEGER NOT NULL,

  -- Waarom. Vrije tekst, want een terugbetaling heeft altijd een verhaal en dat
  -- verhaal hoort op de nota. Bij een automatisch geannuleerde tweede proefvisual
  -- staat hier 'sample-duplicate' — zelfde vocabulaire als orders.cancel_reason.
  reason      TEXT,

  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'issued', 'void')),
  void_reason TEXT,
  pdf_key     TEXT,
  pdf_bytes   INTEGER,

  -- Dezelfde afspraak als bij invoices.snapshot_json: de volledige invoer van de
  -- renderer, zodat dezelfde nota later byte-identiek opnieuw te maken is. Een
  -- document dat je niet opnieuw kunt maken zoals het was, is geen document.
  snapshot_json TEXT NOT NULL,
  lang        TEXT    NOT NULL DEFAULT 'nl',
  issued_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Zelfde regel als bij invoices: 'issued' zonder pdf bestaat niet.
  CHECK (status <> 'issued' OR pdf_key IS NOT NULL)
);

-- De twee vragen die hierop gesteld worden: "welke creditnota's horen bij deze
-- bestelling" (het adminscherm en VISUAILS Studio) en "hoeveel is er al
-- gecrediteerd op deze factuur" (de bewaking tegen dubbel crediteren, die bij
-- iedere binnenkomende terugbetaling draait).
CREATE INDEX IF NOT EXISTS idx_credit_notes_order ON credit_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);


CREATE INDEX IF NOT EXISTS idx_file_assets_file ON file_assets (file_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 0023 · WAAR HET VERZOEK VANDAAN KWAM
-- Zie migrations/0023-origin-country.sql. Cloudflare geeft op elk verzoek gratis het
-- land mee; dat staat in het adminscherm naast wat de klant zelf opgaf. Het beslist
-- niets — een vpn of een zakenreis levert een verschil op zonder dat er iets mis is.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN origin_country TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 0024 · DE BETALER VAN EEN PROEFVISUAL
-- Zie migrations/0024-sample-payer.sql. Een gezouten hash van het IBAN (iDEAL) of
-- van de kaartvingerafdruk, zodat een tweede proefvisual op dezelfde rekening
-- opvalt zonder dat er ooit een rekeningnummer wordt opgeslagen. Het IBAN bestaat
-- pas ná de betaling, dus deze controle annuleert achteraf; de weigering vóór de
-- betaling staat op e-mail en telefoon.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN payer_hash TEXT;
ALTER TABLE orders ADD COLUMN payer_kind TEXT;
-- cancel_reason / cancel_payment / cancelled_at staan er al sinds 0014; deze
-- controle vult ze in plaats van er iets eigens naast te zetten.
CREATE INDEX IF NOT EXISTS idx_orders_payer
  ON orders(payer_hash, service) WHERE payer_hash IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 0027 · HET ADMINPANEEL KAN NU OOK CORRIGEREN
-- Zie migrations/0027-admin-beheer.sql voor de volledige redenering. Kort:
--
--   custom_models.hidden_at/hidden_reason  een model verbergen zonder het weg te
--       gooien, en zonder de STATUS ervoor te misbruiken — de klant leest dat
--       statuswoord in zijn eigen portaal, dus "verborgen" las als "nog in ontwerp".
--
--   customers.deactivated_at/reason        inloggen en bestellen tegenhouden zonder
--       iets te verwijderen. Omkeerbaar met één klik.
--   customers.merged_into                  een verwijzing bij dubbele registratie, en
--       géén samenvoeging: er wordt niets verhangen. Lucas' keuze, 12 aug 2026.
--
--   customer_credits                       een LEDGER van toegezegd tegoed, met een
--       verplichte reden. Geen saldokolom (die weet niet waar het bedrag vandaan
--       komt) en geen automatische verrekening bij het afrekenen (die rekent stil
--       het verkeerde bedrag af). Niet te verwarren met `credit_notes`: dat zijn
--       creditFACTUREN tegenover een terugbetaling.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE custom_models ADD COLUMN hidden_at TEXT;
ALTER TABLE custom_models ADD COLUMN hidden_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_models_visible
  ON custom_models (customer_id, hidden_at);

ALTER TABLE customers ADD COLUMN deactivated_at TEXT;
ALTER TABLE customers ADD COLUMN deactivated_reason TEXT;
ALTER TABLE customers ADD COLUMN merged_into INTEGER REFERENCES customers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS customer_credits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delta_cents  INTEGER NOT NULL CHECK (delta_cents <> 0),
  reason       TEXT NOT NULL,
  order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  admin_id     INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credits_customer
  ON customer_credits (customer_id, created_at DESC);
