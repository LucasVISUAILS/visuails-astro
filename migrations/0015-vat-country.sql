-- VISUAILS — 0015: waar de klant zit, en welke btw daarbij hoort.
--
-- WAAROM. Lucas vroeg of de btw automatisch verlegd kan worden zodra iemand een
-- btw-nummer invult. Dat kan, maar alleen met bewijs erbij: de Belastingdienst
-- verhaalt de 21% op de leverancier als achteraf blijkt dat het nummer niet
-- deugde, en de bescherming van artikel 18(1)(a) van Uitvoeringsverordening
-- 282/2011 geldt alleen als het via VIES is bevestigd. Bewijs dat niet is
-- opgeslagen bestaat niet, dus het staat vanaf nu op de bestelling zelf.
--
-- DRIE DINGEN WORDEN HIER OPGELOST, NIET ÉÉN.
--
--   1 · HET LAND ONTBRAK. `customers.country` en `customers.billing_address`
--       bestaan al sinds de eerste versie van het schema en zijn NOOIT door
--       iets geschreven — geen enkele INSERT of UPDATE in src/ of functions/
--       raakt ze aan. Het formulier vroeg er ook niet naar. Zonder land is er
--       geen btw-beslissing te nemen, want de hele regel draait om "zit de
--       klant hier of niet".
--
--   2 · orders.total_cents IS NETTO, EN DAT IS ALLES WAT ER STOND. Mollie
--       incasseerde bruto, de payments-tabel legde bruto vast, en het verschil
--       — de btw — stond nergens. Een order kon dus niet vertellen hoeveel btw
--       erover was gerekend, alleen hoeveel er in totaal was betaald.
--
--   3 · src/lib/admin.js:666 SELECT'te AL `orders.vat_cents`, een kolom die niet
--       bestond. De query hangt aan een `.catch(() => ({ results: [] }))`, dus
--       hij gooide "no such column", werd ingeslikt, en handleCustomerWipe()
--       schreef vervolgens NUL regels naar invoice_archive voordat hij de klant
--       verwijderde. De bewaarplicht-archivering ving stil niets op. De test
--       zag het niet omdat de fixture `vat_cents` gewoon meegaf. Deze migratie
--       maakt die kolom echt.
--
-- ALLES KRIJGT EEN DEFAULT DIE KLOPT VOOR WAT ER AL STAAT. Elke bestaande rij
-- is een Nederlandse bestelling met 21% erover — dat is precies wat er tot nu
-- toe gebeurde — dus 'nl_standard' en 0.21 zijn geen aannames maar de
-- geschiedenis. vat_cents blijft 0 voor oude rijen omdat het bedrag niet meer
-- te reconstrueren is zonder het tarief van toen te gokken; het is beter dat
-- een oude rij nul zegt dan dat hij iets verzint.
--
-- LET OP BIJ HERDRAAIEN: SQLite kent geen `ADD COLUMN IF NOT EXISTS`. Deze
-- migratie is dus niet zomaar twee keer te draaien; scripts/migrate.mjs slaat
-- kolommen over die al bestaan.

-- ── waar de klant zit ────────────────────────────────────────────────────────
-- ISO 3166-code, twee letters, hoofdletters. Griekenland staat hier als `GR`
-- (ISO) en niet als `EL` (btw) — de vertaling naar de VIES-code gebeurt in
-- src/data/vat.js, zodat de database één vocabulaire heeft.
ALTER TABLE orders ADD COLUMN country TEXT;
ALTER TABLE orders ADD COLUMN billing_address TEXT;

-- ── de btw-uitkomst ──────────────────────────────────────────────────────────
-- 'nl_standard' | 'eu_reverse_charge' | 'outside_scope'. De waarden komen uit
-- VAT_TREATMENT in src/data/vat.js en mogen niet veranderen zonder migratie:
-- de rijen die er al staan betekenen wat ze zeggen.
ALTER TABLE orders ADD COLUMN vat_treatment TEXT NOT NULL DEFAULT 'nl_standard';
ALTER TABLE orders ADD COLUMN vat_rate REAL NOT NULL DEFAULT 0.21;
ALTER TABLE orders ADD COLUMN vat_cents INTEGER NOT NULL DEFAULT 0;

-- ── het bewijs, zeven jaar ───────────────────────────────────────────────────
-- `vat_checked_at` is het moment van de controle en niet van de bestelling: een
-- registratie kan worden ingetrokken, dus het antwoord is alleen geldig op zijn
-- eigen datum.
--
-- `vat_consultation` is het raadpleegnummer dat VIES teruggeeft — het enige
-- stuk waarmee je later kunt aantonen dát je hebt gecontroleerd. Je krijgt het
-- alleen als het eigen btw-nummer is meegestuurd; zie src/lib/vies.js.
--
-- `vat_check_json` is het uitgeklede antwoord. Niet de hele HTTP-uitwisseling:
-- daar zit een blok `viesApproximate` in dat alleen maar streepjes bevat.
ALTER TABLE orders ADD COLUMN vat_valid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN vat_checked_at TEXT;
ALTER TABLE orders ADD COLUMN vat_consultation TEXT;
ALTER TABLE orders ADD COLUMN vat_check_name TEXT;
ALTER TABLE orders ADD COLUMN vat_check_json TEXT;

-- ── de opgaaf ICP ────────────────────────────────────────────────────────────
-- Elke verlegde EU-dienst moet op de kwartaalopgaaf, en dat bedrag moet
-- aansluiten op rubriek 3b van de aangifte. Een 3b-bedrag zonder ICP is een
-- staande rode vlag, en niet-indienen begint bij een verzuimboete van €167.
--
-- Dit is geen automatische aangifte — dat mag en kan een website niet doen.
-- Het is een stempel: welke regels zijn al opgegeven en welke nog niet, zodat
-- het admin-scherm er een lijst van kan maken in plaats van dat iemand hem elk
-- kwartaal met de hand uit de bestellingen vist.
ALTER TABLE orders ADD COLUMN icp_reported_at TEXT;

-- Waar de kwartaallijst uit komt: alleen betaalde, verlegde, nog niet opgegeven
-- bestellingen. Partieel, want dat is een handvol rijen per kwartaal en een
-- index over de hele tabel zou hier niets toevoegen.
CREATE INDEX IF NOT EXISTS idx_orders_icp_due
  ON orders (paid_at)
  WHERE vat_treatment = 'eu_reverse_charge' AND icp_reported_at IS NULL;

-- Zoeken op land in het admin-scherm, en de basis voor "hoeveel verleggen we
-- eigenlijk" zonder een volledige scan.
CREATE INDEX IF NOT EXISTS idx_orders_vat_treatment ON orders (vat_treatment);
