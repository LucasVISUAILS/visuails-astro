-- ══════════════════════════════════════════════════════════════════════════════
-- 0056 · WAT ER NAAR DE BOEKHOUDING IS GEGAAN (E-BOEKHOUDEN)
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, punt 8.08. Lucas koos een boekhoudpakket met API en schreef:
-- *"Ik gebruik e-boekhouden.nl."* src/lib/eboekhouden.js zet elke uitgereikte
-- factuur, creditnota en abonnementsfactuur daar in, met de Mollie-betaling
-- ertegenover. Deze tabel is het geheugen daarvan: één rij per boeking.
--
-- ── WAAROM EEN EIGEN TABEL EN GEEN KOLOM OP `invoices` ───────────────────────
--
-- Er zijn drie soorten documenten (invoices, credit_notes, subscription_invoices)
-- en bij elk document horen nul of meer geldboekingen: de betaling, een
-- terugbetaling, een storno. Kolommen op drie tabellen dekken dat niet, en een
-- betaling heeft geen eigen documentrij. Eén tabel met een SLEUTEL per boeking
-- wel:
--
--   factuur:VIS-2026-0012          de verkoopfactuur (of abonnementsfactuur)
--   creditnota:VIS-2026-0015       de creditnota
--   betaling:tr_WDqYK6vllg         een Mollie-betaling, tegen haar factuur
--   terug:VIS-2026-0015:12100      geld terug via Mollie, t/m dat totaal in centen
--   storno:tr_WDqYK6vllg:12100     een terugboeking door de bank van de klant
--
-- ── DE SLEUTEL IS DE BESCHERMING TEGEN DUBBEL BOEKEN ─────────────────────────
--
-- UNIQUE, en elke rij wordt met INSERT OR IGNORE gezet. Mollie levert dezelfde
-- melding desnoods drie keer af, de nachtelijke taak verzamelt alles elke nacht
-- opnieuw — en er blijft één rij per boeking. Vóór de POST naar e-Boekhouden
-- wordt daar bovendien nog gezocht of hij er al staat (zie boekDocument() en
-- boekGeld()), voor een poging die na de POST werd afgebroken.
--
-- ── STATUS ───────────────────────────────────────────────────────────────────
--
--   wacht    staat klaar (of wacht op zijn factuur, bij een betaling)
--   bezig    wordt nu geboekt; na tien minuten telt hij als afgebroken
--   geboekt  staat in e-Boekhouden; eb_mutatie_id is het nummer daar
--   mislukt  laatste_fout zegt waarom; /admin heeft een knop "Opnieuw", en de
--            nachtelijke taak probeert hem één keer per nacht opnieuw
--
-- ── GEEN VREEMDE SLEUTELS ────────────────────────────────────────────────────
--
-- bron_id en order_id verwijzen naar rijen in andere tabellen, maar zonder
-- REFERENCES. Een boeking in e-Boekhouden verdwijnt niet als er bij ons iets
-- wordt opgeruimd (de AVG-knop), en een RESTRICT hier zou die knop laten
-- omvallen — precies wat er op 12 augustus met invoices.order_id gebeurde.
-- Het document draagt zichzelf: `document` is het VIS-nummer.
--
-- Alleen toevoegend. Zolang deze migratie niet gedraaid is, faalt de koppeling
-- met "no such table" in het nachtrapport, en verder merkt niemand iets: een
-- betaling, factuur of mail wacht er nooit op.

CREATE TABLE IF NOT EXISTS boekhouding_boekingen (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sleutel        TEXT    NOT NULL UNIQUE,
  soort          TEXT    NOT NULL
                   CHECK (soort IN ('factuur', 'creditnota', 'betaling', 'terugbetaling', 'storno')),
  -- Het VIS-nummer waar de boeking over gaat: bij e-Boekhouden het invoiceNumber.
  document       TEXT    NOT NULL,
  bron           TEXT    NOT NULL
                   CHECK (bron IN ('invoice', 'credit_note', 'subscription_invoice')),
  bron_id        INTEGER NOT NULL,
  order_id       INTEGER,
  -- Betaling positief, terugbetaling en storno negatief. Bij een document het
  -- bruto bedrag, ter informatie (creditnota negatief).
  bedrag_cents   INTEGER NOT NULL DEFAULT 0,
  datum          TEXT    NOT NULL,
  -- Het Mollie-betaalnummer (tr_…) bij een betaling of storno.
  kenmerk        TEXT,
  status         TEXT    NOT NULL DEFAULT 'wacht'
                   CHECK (status IN ('wacht', 'bezig', 'geboekt', 'mislukt')),
  eb_mutatie_id  INTEGER,
  eb_relatie_id  INTEGER,
  pogingen       INTEGER NOT NULL DEFAULT 0,
  laatste_fout   TEXT,
  notitie        TEXT,
  poging_at      TEXT,
  geboekt_at     TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_boekhouding_status   ON boekhouding_boekingen(status, id);
CREATE INDEX IF NOT EXISTS idx_boekhouding_document ON boekhouding_boekingen(document);
CREATE INDEX IF NOT EXISTS idx_boekhouding_order    ON boekhouding_boekingen(order_id);
