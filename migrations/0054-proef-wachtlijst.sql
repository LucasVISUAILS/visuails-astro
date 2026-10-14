-- ══════════════════════════════════════════════════════════════════════════════
-- 0054 · DE WACHTLIJST VAN DE €1-PROEF
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, punt G2 (ronde A2). Alleen toevoegend: één nieuwe tabel.
--
-- Staat de proef in /admin op "dicht" (of alleen lifestyle open), dan toont
-- /test-sample "Even niet beschikbaar" met één veld: "Mail me als hij weer open
-- is". Dat adres komt hier. Eén rij per adres (UNIQUE): wie twee keer drukt,
-- staat er één keer. Zodra de proef weer open is, stuurt de knop "Mail de
-- wachtlijst (N)" in /admin/proef één mail per adres en wist daarna de rij
-- (src/lib/proefStand.js, naDeMail()). Geen nieuwsbrief: dit adres wordt voor
-- niets anders gebruikt.
--
-- De stand van de schakelaar zelf staat in app_settings ('proef_stand') en
-- heeft geen migratie nodig.
--
-- Veilig om twee keer te draaien.

CREATE TABLE IF NOT EXISTS proef_wachtlijst (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  taal          TEXT    NOT NULL DEFAULT 'nl' CHECK (taal IN ('nl', 'en')),
  aangemeld_op  TEXT    NOT NULL DEFAULT (datetime('now'))
);
