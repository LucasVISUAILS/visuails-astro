-- ══════════════════════════════════════════════════════════════════════════════
-- 0071 · OP MAAT: DE INTAKE VAN CUSTOM CATALOG, LIFESTYLE, HOOKS EN VIDEO
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 14 november 2026 (lijst 107, alles volgens het advies). Alleen toevoegend: vier
-- nieuwe tabellen. Zie src/lib/opMaat.js en src/data/opMaat.js, en het plan in
-- kladblok/PLAN-OP-MAAT-107.md.
--
-- merkprofielen — het merkprofiel (lijst 107, g1): één keer invullen, daarna bij elke
-- aanvraag al ingevuld. Eén rij per klant; de inhoud is JSON (naam, site, Instagram,
-- wie zijn klant is, drie merkwoorden, kleuren, prijsklasse). Het logo blijft waar
-- het nu staat (de vaste look).
--
-- maat_aanvragen — één aanvraag op maat. `stand` loopt van concept (de klant is nog
-- bezig en kan tussendoor opslaan, g5) via verstuurd (wij zijn aan zet) naar voorstel
-- (het concept-bord staat klaar, q5), akkoord, offerte (q3: pas na het concept een
-- aanbetaling) en vastgelegd (de stijlkaart per productsoort, q6). `inhoud_json` is
-- wat de klant invulde, door normaliseerInhoud() gehaald; `versie` telt elke opslag,
-- zodat een oude tab een nieuwere opslag niet stil overschrijft.
--
-- maat_referenties — een geüpload referentiebeeld (g2), met wat de klant ervan wil
-- (licht, pose, kleur, sfeer) en een notitie. Het bestand staat in R2 onder `r2_key`;
-- de rij gaat weg met de aanvraag (en die met de klant, AVG). Het R2-bestand ruimt
-- verwijderAanvraag() op.
--
-- maat_besluiten — elk akkoord en elke vraag om aanpassing (g7), met datum, zodat er
-- later geen discussie is over wat er afgesproken was. `onderwerp` is 'concept',
-- 'foto:<n>' of 'stijlkaart:<soort>'.
--
-- Veilig om twee keer te draaien.

CREATE TABLE IF NOT EXISTS merkprofielen (
  customer_id    INTEGER PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  inhoud_json    TEXT    NOT NULL DEFAULT '{}',
  bijgewerkt_op  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maat_aanvragen (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id    INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  dienst         TEXT    NOT NULL CHECK (dienst IN ('catalog', 'lifestyle', 'hooks', 'video')),
  stand          TEXT    NOT NULL DEFAULT 'concept'
                   CHECK (stand IN ('concept', 'verstuurd', 'voorstel', 'akkoord', 'offerte', 'vastgelegd', 'gesloten')),
  inhoud_json    TEXT    NOT NULL DEFAULT '{}',
  versie         INTEGER NOT NULL DEFAULT 1,
  taal           TEXT    NOT NULL DEFAULT 'nl' CHECK (taal IN ('nl', 'en')),
  gemaakt_op     TEXT    NOT NULL DEFAULT (datetime('now')),
  bijgewerkt_op  TEXT    NOT NULL DEFAULT (datetime('now')),
  verstuurd_op   TEXT
);
CREATE INDEX IF NOT EXISTS idx_maat_aanvragen_klant ON maat_aanvragen(customer_id, stand);
CREATE INDEX IF NOT EXISTS idx_maat_aanvragen_stand ON maat_aanvragen(stand, verstuurd_op);

CREATE TABLE IF NOT EXISTS maat_referenties (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  aanvraag_id    INTEGER NOT NULL REFERENCES maat_aanvragen(id) ON DELETE CASCADE,
  r2_key         TEXT    NOT NULL,
  bestandsnaam   TEXT,
  bytes          INTEGER,
  wat_json       TEXT    NOT NULL DEFAULT '[]',
  notitie        TEXT    NOT NULL DEFAULT '',
  gemaakt_op     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maat_referenties_aanvraag ON maat_referenties(aanvraag_id);

CREATE TABLE IF NOT EXISTS maat_besluiten (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  aanvraag_id    INTEGER NOT NULL REFERENCES maat_aanvragen(id) ON DELETE CASCADE,
  onderwerp      TEXT    NOT NULL,
  besluit        TEXT    NOT NULL CHECK (besluit IN ('goed', 'aanpassen')),
  notitie        TEXT    NOT NULL DEFAULT '',
  door           TEXT    NOT NULL DEFAULT 'klant' CHECK (door IN ('klant', 'studio')),
  op             TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_maat_besluiten_aanvraag ON maat_besluiten(aanvraag_id, onderwerp);
