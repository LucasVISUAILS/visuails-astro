-- VISUAILS — de gedeelde maandset bij het abonnement.
--
-- STOCK-IDEE.md §6, en Lucas op 4 september 2026 ("waar komen de
-- stockafbeeldingen terecht"): de goedkoopste vorm die het idee waarmaakt is
-- "de drop van deze maand verschijnt als een blok op /account/plan, en
-- downloaden gaat via dezelfde weg als een geleverde bestelling. Eén kaart en
-- één R2-pad, geen nieuw systeem."
--
-- Eén set per maand (shared_sets.month = 'YYYY-MM'), de beelden eronder. De
-- set is van niemand: er staat geen customer_id op, want hij gaat naar ELK merk
-- met een lopend abonnement. Wie hem ziet, bepaalt account.js aan de hand van
-- het abonnement, niet deze tabel. `published_at` NULL = nog niet zichtbaar;
-- zo kan een maand alvast gevuld worden voordat hij de eerste van de maand
-- opengaat. R2-sleutel: shared/<maand>/<id>-<naam>.
CREATE TABLE IF NOT EXISTS shared_sets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  month         TEXT NOT NULL UNIQUE,
  title         TEXT,
  note          TEXT,
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS shared_files (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id        INTEGER NOT NULL REFERENCES shared_sets(id) ON DELETE CASCADE,
  r2_key        TEXT NOT NULL,
  filename      TEXT NOT NULL,
  bytes         INTEGER NOT NULL DEFAULT 0,
  content_type  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shared_files_set ON shared_files(set_id);
