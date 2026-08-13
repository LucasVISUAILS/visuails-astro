-- VISUAILS — het adminpaneel krijgt de zes dingen die het niet kon.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WAAROM ÉÉN MIGRATIE EN GEEN ZES
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lucas, 12 augustus 2026, blok 5 van zijn lijst. Zes losse wensen die alle zes op
-- hetzelfde neerkwamen: het paneel kan LEZEN en nauwelijks CORRIGEREN. Een model dat
-- per ongeluk is toegevoegd kon er niet meer uit, een verkeerd btw-nummer bleef fout
-- op elke volgende factuur, en een klant die zijn inloglink kwijt was moest het
-- publieke formulier gebruiken.
--
-- Ze delen één ding: er zijn kolommen voor nodig die er niet zijn. Zes migraties
-- achter elkaar op dezelfde twee tabellen is zes keer dezelfde deploy afwachten, en
-- ALTER TABLE in SQLite is per kolom toch al één statement. Dus samen, met per blok
-- de reden erbij.
--
-- WAT ER NIET IN ZIT, en dat is een keuze en geen vergetelheid:
--
--   · SAMENVOEGEN van dubbele accounts. Lucas koos "alleen deactiveren": op
--     databaseniveau is dubbel op hetzelfde e-mailadres al onmogelijk (er staat een
--     unieke index op lower(email)), dus dit gaat alleen over één merk met twee
--     verschillende adressen. Bestellingen en facturen verhangen is een onomkeerbare
--     operatie op de tabel waar de boekhouding aan hangt, en het probleem is in de
--     praktijk op te lossen door de klant naar het goede account te sturen.
--
--   · VERREKENEN van tegoed bij het afrekenen. Lucas koos "alleen een ledger". Zie
--     het blok bij customer_credits hieronder: een half automatisch creditsysteem is
--     erger dan een handmatig, want het rekent stil het verkeerde bedrag af.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1 · MERKMODELLEN: VERBERGEN IN PLAATS VAN WEGGOOIEN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lucas' eigen voorbeeld: *"nu kan een per ongeluk toegevoegd model er niet meer
-- uit."* Verwijderen kon inderdaad niet — de enige DELETE op deze tabel zat in de
-- AVG-wipe, dus alles van één klant tegelijk.
--
-- ER WAS WEL EEN WORKAROUND, EN DIE WAS SLECHTER DAN NIETS. De status kon terug naar
-- 'in_design', en dan filtert het klantportaal het model weg. Alleen: de klant ZIET
-- dat statuswoord in zijn eigen portaal. "Verbergen" las voor hem dus als "jullie
-- zijn er nog mee bezig" — een mededeling over werk dat niet bestaat.
--
-- `hidden_at` is daarom een eigen kolom en niet een status. Twee vragen die niets met
-- elkaar te maken hebben, horen niet in één veld: "waar staat dit model in het
-- ontwerpproces" en "mag de klant het nog zien".
ALTER TABLE custom_models ADD COLUMN hidden_at TEXT;

-- En de reden erbij, want een verborgen model zonder reden is over drie maanden een
-- raadsel. Dezelfde afspraak als bij `orders.cancel_reason`.
ALTER TABLE custom_models ADD COLUMN hidden_reason TEXT;

-- Voor de lijst in het klantportaal: die filtert op `hidden_at IS NULL` en dat is
-- de query die bij elk bezoek loopt.
CREATE INDEX IF NOT EXISTS idx_models_visible
  ON custom_models (customer_id, hidden_at);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2 · ACCOUNTS DEACTIVEREN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Er was hier helemaal niets: geen `deactivated_at`, geen `disabled_at`, geen
-- `is_active`. Het dichtstbijzijnde was `revisions_revoked_at`, en dat neemt alleen
-- de revisieknop weg — de klant kon gewoon inloggen en bestellen.
--
-- WAT DEACTIVEREN WEL EN NIET IS. Het is geen verwijdering: de bestellingen, de
-- facturen en de geschiedenis blijven staan, en het is omkeerbaar met één klik. Wat
-- het tegenhoudt is inloggen en bestellen. Dat is precies wat je nodig hebt bij een
-- dubbele registratie ("gebruik het andere adres"), bij een klant die vraagt zijn
-- account te sluiten zonder een AVG-verzoek te doen, en bij misbruik.
ALTER TABLE customers ADD COLUMN deactivated_at TEXT;
ALTER TABLE customers ADD COLUMN deactivated_reason TEXT;

-- `merged_into` is GEEN samenvoeging maar een verwijzing. Bij een dubbele
-- registratie zet je hier het id van het account dat wél gebruikt wordt, zodat het
-- adminscherm de twee aan elkaar knoopt en niemand over drie maanden twee losse
-- klanten met dezelfde merknaam ziet en gaat gokken. Er wordt niets verhangen.
ALTER TABLE customers ADD COLUMN merged_into INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3 · TEGOED, ALS LEDGER EN NIET ALS SALDOKOLOM
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lucas, 12 augustus 2026: *"Alleen een ledger, geen verrekening."*
--
-- EN EEN NOOT DIE BLIJFT GELDEN. src/lib/account.js legt op twee plekken de eerdere
-- keuze vast om géén creditsysteem te bouwen — *"de vorm, niet het plan"*. Die keuze
-- is niet omgedraaid maar begrensd: dit is een BOEKHOUDING van wat er is
-- toegezegd, en niet een tegoed dat bij het afrekenen automatisch wordt verrekend.
-- Verrekenen blijft handwerk op de factuur, precies zoals het nu bij een annulering
-- gaat.
--
-- WAAROM EEN LEDGER EN GEEN `balance_cents` OP customers. Een saldokolom weet alleen
-- WAT het saldo is, en het saldo is nooit de vraag die je krijgt. De vraag is "waar
-- komt die vijfenveertig euro vandaan" — en dat is precies wat een kolom niet kan
-- beantwoorden. Boekingen zijn ook onomkeerbaar bedoeld: een verkeerde boeking
-- corrigeer je met een tegenboeking, zodat er een spoor blijft. Vandaar geen UPDATE
-- en geen DELETE op deze tabel; het saldo is een SUM.
--
-- LET OP HET VERSCHIL MET `credit_notes`. Dat zijn creditFACTUREN: boekhoudkundige
-- documenten met een nummer uit de doorlopende factuurreeks, tegenover een
-- terugbetaling. Dit is iets anders — een toezegging aan een klant. De twee raken
-- elkaar alleen als je een tegoed uitbetaalt, en dan is de creditnota het document
-- en de boeking hieronder de reden.
CREATE TABLE IF NOT EXISTS customer_credits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- POSITIEF is bijboeken (de klant krijgt tegoed), NEGATIEF is afboeken. In centen,
  -- zoals elk bedrag in dit schema, en NOT NULL want een boeking zonder bedrag is
  -- geen boeking. Nul mag niet: dat is een notitie, en daar is het notitieveld voor.
  delta_cents  INTEGER NOT NULL CHECK (delta_cents <> 0),

  -- DE REDEN IS VERPLICHT, en dat is de hele waarde van deze tabel. Lucas vroeg er
  -- expliciet om ("met reden erbij in het ledger"). Een boeking zonder reden is over
  -- drie maanden een bedrag waar niemand meer iets van weet, en dan durf je het niet
  -- te verrekenen — wat de boeking waardeloos maakt.
  reason       TEXT NOT NULL,

  -- Waar het over ging, als het over een bestelling ging. SET NULL en niet CASCADE:
  -- verdwijnt de bestelling ooit, dan blijft het bedrag geboekt staan. Een tegoed dat
  -- verdwijnt omdat de aanleiding verdwijnt, is geld dat de klant kwijt is.
  order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL,

  -- Wie het boekte. SET NULL zodat een verwijderde beheerder geen boeking meesleept.
  admin_id     INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,

  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Het saldo is `SELECT SUM(delta_cents) ... WHERE customer_id = ?`, en dat loopt bij
-- elk bezoek aan de klantpagina én aan het klantdashboard.
CREATE INDEX IF NOT EXISTS idx_credits_customer
  ON customer_credits (customer_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4 · WAT ER GEEN KOLOM NODIG HAD
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Drie van de zes wensen zijn puur code en staan hier alleen genoemd zodat wie deze
-- migratie leest niet gaat zoeken:
--
--   · KLANTGEGEVENS CORRIGEREN — de kolommen bestaan allemaal al (brand, name,
--     email, phone, website, vat_number en de adresvelden uit migratie 0016). Er was
--     alleen geen enkele adminroute die ernaar schreef: de twee UPDATE-statements op
--     `customers` in admin.js raakten uitsluitend de revisierechten.
--
--   · EEN NIEUWE INLOGLINK STUREN — `account_tokens` bestaat, sendLoginLink() bestaat
--     in src/lib/account.js, en de mailweg werkt. Er was geen knop.
--
--   · HET AANMELDMOMENT LATEN ZIEN — `customers.created_at` bestaat sinds het begin
--     en werd op twee plekken in admin.js netjes geselecteerd en daarna weggegooid.
--     Een dode SELECT is geen ontbrekende kolom.
