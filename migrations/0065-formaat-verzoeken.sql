-- ══════════════════════════════════════════════════════════════════════════════
-- 0065 · OOK ALS PNG OF WEBP
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 11 oktober 2026, k401 (afvinklijst 2). Alleen toevoegend: één nieuwe tabel.
--
-- Leverbeelden zijn standaard jpg. Op een geleverde bestelling in Studio staan
-- twee knoppen, "Ook als PNG" en "Ook als WebP"; één klik is één rij hier. Eén
-- rij per bestelling en formaat (UNIQUE): wie twee keer drukt, staat er één
-- keer. /admin/formaten toont wat openstaat; "Klaar" zet `klaar_at`. Weg met de
-- bestelling (ON DELETE CASCADE), dus ook met het AVG-wissen van een klant. Geen
-- persoonsgegevens: alleen de bestelling, het formaat en twee datums. Zie
-- src/lib/formaten.js.
--
-- Veilig om twee keer te draaien.

CREATE TABLE IF NOT EXISTS formaat_verzoeken (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  formaat         TEXT    NOT NULL CHECK (formaat IN ('png', 'webp')),
  aangevraagd_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  klaar_at        TEXT,
  UNIQUE (order_id, formaat)
);
CREATE INDEX IF NOT EXISTS idx_formaat_verzoeken_open ON formaat_verzoeken(klaar_at, aangevraagd_at);
