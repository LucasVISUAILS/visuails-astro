-- ══════════════════════════════════════════════════════════════════════════════
-- 0072 · OP MAAT: DE VOORBEELDRONDES EN DE OFFERTE
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 15 november 2026 (lijst 110 en 112, schermen 9 en 10). Alleen toevoegend: twee
-- nieuwe tabellen. Zie src/lib/opMaatRondes.js.
--
-- maat_voorbeelden — de voorbeeldbeelden die de studio per ronde klaarzet: altijd in
-- neutrale kleuren en zonder het product van de klant (lijst 110, notitie). Het
-- bestand staat in R2 onder maat/<klant>/<aanvraag>/voorbeeld/. Ronde 1 is het gratis
-- eerste voorbeeld; daarna nog twee gratis rondes (GRATIS_STIJLRONDES).
--
-- maat_offertes — de offerte na het akkoord op de stijl: de regels (zoals de
-- schatting, met wat er na het uitdenken bij kwam), het totaal en de aanbetaling
-- (de helft, lijst 110). `akkoord_op` zet de klant met zijn akkoord.
--
-- Veilig om twee keer te draaien.

CREATE TABLE IF NOT EXISTS maat_voorbeelden (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  aanvraag_id    INTEGER NOT NULL REFERENCES maat_aanvragen(id) ON DELETE CASCADE,
  ronde          INTEGER NOT NULL CHECK (ronde BETWEEN 1 AND 9),
  r2_key         TEXT    NOT NULL,
  bestandsnaam   TEXT,
  gemaakt_op     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maat_voorbeelden_aanvraag ON maat_voorbeelden(aanvraag_id, ronde);

CREATE TABLE IF NOT EXISTS maat_offertes (
  aanvraag_id        INTEGER PRIMARY KEY REFERENCES maat_aanvragen(id) ON DELETE CASCADE,
  regels_json        TEXT    NOT NULL DEFAULT '[]',
  totaal_cents       INTEGER NOT NULL CHECK (totaal_cents >= 0),
  aanbetaling_cents  INTEGER NOT NULL CHECK (aanbetaling_cents >= 0),
  gemaakt_op         TEXT    NOT NULL DEFAULT (datetime('now')),
  akkoord_op         TEXT
);
