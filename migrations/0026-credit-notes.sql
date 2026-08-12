-- VISUAILS — een terugbetaling die ook in de boeken staat.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WAT ER MIS WAS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- De webhook boekt een terugbetaling correct: `orders.refunded_cents` gaat omhoog
-- en bij een volledige terugbetaling gaat `payment_status` naar 'refunded'
-- (functions/api/webhook/mollie.js, de sectie over amountRefunded). Er staat een
-- regel op de tijdlijn en het adminscherm laat het zien.
--
-- src/lib/invoice.js wist niet dat "terugbetaling" bestaat — nul treffers op het
-- woord. De uitgereikte factuur bleef dus op het volle bedrag staan. Vanaf de
-- eerste terugbetaling staat er een factuur van bijvoorbeeld € 1.101,10 tegenover
-- geld dat terug is.
--
-- Een uitgereikte factuur mag je niet aanpassen en niet weggooien. De enige juiste
-- weg terug is een creditnota: een eigen document, met een eigen nummer uit
-- dezelfde doorlopende reeks, dat naar de originele factuur verwijst.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WAAROM EEN EIGEN TABEL EN NIET EEN KOLOM IN `invoices`
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lucas, 12 augustus 2026, na drie voorgelegde opties: *"Eigen tabel, zelfde
-- nummerreeks."*
--
-- Het alternatief was `invoices` uitbreiden met `kind` en `parent_id`. Netter
-- datamodel, maar `invoices.order_id` is `NOT NULL UNIQUE` en SQLite kan een
-- UNIQUE niet weghalen — die migratie moet de tabel HERBOUWEN: nieuwe tabel,
-- rijen overzetten, oude weggooien, hernoemen. Dat is een destructieve migratie
-- op de ene tabel die wettelijk niet corrupt mag raken, voor een verbetering die
-- alleen de vorm van de data raakt.
--
-- Deze kant kost meer code in de overzichten (twee tabellen samenvoegen) en raakt
-- geen enkele bestaande factuurrij. Dat is de goede ruil.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- ÉÉN DOORLOPENDE NUMMERREEKS — DIT IS HET BELANGRIJKSTE STUK
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Een creditnota trekt zijn nummer uit `invoice_series`, precies zoals een
-- factuur, via dezelfde nextNumber() in src/lib/invoice.js. Dus:
--
--   VIS-2026-0007   factuur
--   VIS-2026-0008   creditnota op VIS-2026-0007
--   VIS-2026-0009   factuur
--
-- Eén reeks, geen gaten, geen dubbele nummers — dat is wat de Belastingdienst wil
-- zien, en het is met een tweede reeks moeilijker te garanderen dan met één.
--
-- `number` is hier daarom OOK uniek, maar dat dwingt binnen deze tabel af en niet
-- over de twee tabellen heen. De echte garantie zit in `invoice_series`: dat is de
-- enige plek waar een nummer wordt uitgegeven, met een UPDATE ... RETURNING die
-- atomair is. Twee documenten kunnen dus niet hetzelfde nummer krijgen, ook niet
-- als ze in dezelfde seconde worden aangemaakt.

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
