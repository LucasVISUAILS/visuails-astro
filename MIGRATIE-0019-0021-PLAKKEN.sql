-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATIE 0019 + 0020 + 0021 — OM MET DE HAND TE PLAKKEN
--
-- Bedoeld voor de D1-console in het Cloudflare-dashboard:
--   dash.cloudflare.com → Workers & Pages → D1 → visuails → Console
--
-- Waarom deze omweg: `npm run migrate` loopt vast op Cloudflare-foutcode 7403
-- ("dit account mag deze dienst niet gebruiken"), en dat is een probleem met de
-- sleutel op je eigen machine, niet met de database. De database zelf is gezond —
-- de live site leest er nog uit. Via de console gebruik je de sessie van je
-- browser en heb je dat token helemaal niet nodig.
--
-- Draai het blok in één keer. Alles is idempotent op één regel na:
--
--   ⚠ DE `ALTER TABLE` HIERONDER MAG PRECIES ÉÉN KEER. SQLite kent geen
--     "ADD COLUMN IF NOT EXISTS". Draai je hem twee keer, dan krijg je
--     "duplicate column name: channels" — dat is onschuldig, het betekent dat
--     hij er al staat, en de rest van dit bestand gaat gewoon door.
--
--     Weet je niet of hij al gedraaid heeft? Voer eerst dit los uit:
--       PRAGMA table_info(customer_style_locks);
--     Staat er een rij `channels`, sla die ene regel dan over.
--
-- Na afloop controleren:
--   PRAGMA table_info(customer_style_locks);   → er hoort een kolom `channels`
--   PRAGMA table_info(order_feedback);         → 13 kolommen
--   SELECT name FROM sqlite_master WHERE name LIKE 'idx_feedback%';  → 3 rijen
--   PRAGMA table_info(invoices);               → 14 kolommen
--   SELECT * FROM invoice_series;              → leeg (vult zich bij de eerste factuur)
--
-- De volledige versies met alle argumentatie staan in
-- migrations/0019-brand-kit-channels.sql, migrations/0020-order-feedback.sql en
-- migrations/0021-invoices.sql. Dit bestand is alleen de uitvoerbare kern; het
-- hoort niet in de migratiemap en vervangt die drie niet.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 0019 · het verkoopkanaal in de brand kit ─────────────────────────────────
-- Eén komma-lijst met kanaal-ids ('amazon,own'). NULL = geen voorkeur, vraag het
-- per bestelling. Alleen bij catalog in gebruik.
ALTER TABLE customer_style_locks ADD COLUMN channels TEXT;


-- ── 0020 · tevredenheid, reviews en testimonials ─────────────────────────────
-- Eigen tabel en geen kolommen op `orders`, omdat `review_requested_at` daar al
-- bestaat met een heel andere betekenis (de btw-controle uit 0018).
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


-- ── 0021 · facturen ──────────────────────────────────────────────────────────
-- Een eigen teller per jaar in plaats van AUTOINCREMENT, omdat een teruggedraaide
-- INSERT bij AUTOINCREMENT het nummer alsnog verbruikt en er dan een gat in de
-- reeks valt. Een gat leest bij een controle als een verdwenen factuur.
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

CREATE INDEX IF NOT EXISTS idx_invoices_order    ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_series   ON invoices(year, seq);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_pending  ON invoices(created_at) WHERE status = 'pending';
