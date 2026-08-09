-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATIE 0021 — FACTUREN — OM MET DE HAND TE PLAKKEN
--
-- Bedoeld voor de D1-console in het Cloudflare-dashboard:
--   dash.cloudflare.com → Workers & Pages → D1 → visuails → Console
--
-- ── DIT IS DE OPVOLGER VAN MIGRATIE-0019-0021-PLAKKEN.sql ────────────────────
--
-- Dat bestand bevatte 0019, 0020 én 0021 samen, en is niet meer wat je wilt als
-- 0019 en 0020 al gedraaid hebben. Het probleem is één regel:
--
--     ALTER TABLE customer_style_locks ADD COLUMN channels TEXT;
--
-- SQLite kent geen "ADD COLUMN IF NOT EXISTS". Die regel kan dus precies één
-- keer, en een tweede keer geeft "duplicate column name: channels". Onschuldig
-- in de zin dat er niets stukgaat — de kolom stond er al — maar het is een fout
-- midden in een blok, en dan weet je niet zeker of de rest nog gedraaid heeft.
--
-- Alles wat hieronder staat is `IF NOT EXISTS` en mag dus zo vaak als je wil.
-- Er zit geen ALTER TABLE in.
--
-- De volledige versie met alle argumentatie staat in
-- migrations/0021-invoices.sql. Dat bestand blijft staan — de migratiemap is de
-- geschiedenis van het schema en daar hoort niets uit weg. Dit bestand is alleen
-- de uitvoerbare kern.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── STAP 1 · EERST KIJKEN WAT ER AL STAAT ────────────────────────────────────
--
-- Voer deze drie los uit, vóór de rest. Dan weet je waar je begint in plaats van
-- het aan te nemen.
--
--   PRAGMA table_info(customer_style_locks);
--     → 0019 is gedraaid als er een rij `channels` tussen staat.
--
--   PRAGMA table_info(order_feedback);
--     → 0020 is gedraaid als dit 13 kolommen teruggeeft.
--        Geen resultaat of een foutmelding = 0020 moet nog.
--
--   PRAGMA table_info(invoices);
--     → leeg of een fout betekent dat 0021 nog moet, en dat is dit bestand.
--        Staan er al 14 kolommen, dan is er niets meer te doen.
--
-- Blijkt 0019 of 0020 tóch nog te missen: pak dan alleen dat stuk uit
-- MIGRATIE-0019-0021-PLAKKEN.sql, niet het hele blok.


-- ── STAP 2 · 0021 · FACTUREN ─────────────────────────────────────────────────
--
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


-- ── STAP 3 · NA AFLOOP CONTROLEREN ───────────────────────────────────────────
--
--   PRAGMA table_info(invoices);    → 14 kolommen
--   SELECT * FROM invoice_series;   → leeg. Klopt: de teller vult zich pas bij de
--                                     eerste factuur, en begint dan op 1.
--
-- Daarna is er niets meer te doen. Open VISUAILS Studio → Facturen en de sectie
-- maakt de facturen van je al betaalde testbestellingen zelf aan, met de
-- betaaldatum als factuurdatum. Maximaal vijf per bezoek; heb je er meer, vernieuw
-- dan nog een keer.
