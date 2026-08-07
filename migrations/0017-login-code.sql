-- VISUAILS — 0017: zes cijfers naast de inloglink.
--
-- WAAROM. Lucas, 7 augustus 2026: *"Een 6-cijferige code naast de magic link.
-- Dan hoeft niemand van mailapp naar browser te springen, wat op mobiel precies
-- de plek is waar mensen afhaken."*
--
-- Dat klopt, en de sprong is echt het probleem: op een telefoon betekent een
-- link in een mail dat de mailapp een browser opent, vaak een ingebouwde, soms
-- zonder de sessiecookie die daarna gezet wordt. Zes cijfers overtypen laat de
-- klant staan waar hij al stond.
--
-- ── WAT DIT NADRUKKELIJK NIET IS ────────────────────────────────────────────
--
-- Geen door de klant gekozen pincode. Dat is wat er eerst werd voorgesteld, en
-- het is een wachtwoord van zes cijfers: mensen kiezen niet uit een miljoen
-- maar uit een handvol, en 123456 spant de kroon. Een aanvaller die een adres
-- kent hoeft dan een paar honderd te proberen in plaats van een miljoen. En het
-- zou een permanent geheim zijn: iets om te bewaren, te phishen en te vergeten.
--
-- Dit is een EENMALIGE, door de server gegenereerde code. Er valt niets te
-- onthouden, dus ook niets te vergeten, en hij is precies zo lang geldig als de
-- mail waar hij in staat vers is.
--
-- ── WAT HEM VEILIG MAAKT, EN WAT NIET ───────────────────────────────────────
--
-- Niet de miljoen combinaties op zichzelf — dat is maar twintig bits. Wat hem
-- draagt is de combinatie van drie grenzen:
--
--   1 · TIEN MINUTEN. Korter dan de link, die een uur meegaat: de link moet een
--       mailscanner en een omweg over de desktop overleven, de code wordt
--       overgetypt terwijl je ernaar kijkt.
--   2 · VIJF POGINGEN, en dan is de code dood — niet het account, en niet de
--       link. Vijf kansen op een miljoen binnen tien minuten is geen aanvalspad.
--   3 · ELKE POGING KOST EEN MAIL. Een nieuwe code aanvragen betekent een mail
--       in het postvak van de klant. Volhouden is luidruchtig, en het is
--       daarnaast begrensd door de bestaande rate limit op /account/login.
--
-- Bij de vijfde misser blijft de link in dezelfde mail gewoon werken. Dat is
-- geen restje: het is het antwoord op "wat nu", zonder een nieuw scherm.
--
-- ── DE CODE STAAT GEHASHT, EN WAT DAT WEL EN NIET OPLOST ────────────────────
--
-- `code_hash` is SHA-256 van `<customer_id>:<code>`. Het klant-id zit erin
-- zodat één tabel met een miljoen voorberekende hashes niet alle rijen
-- tegelijk opent. Wees eerlijk over de rest: zes cijfers zijn met een moderne
-- kaart in seconden terug te rekenen, dus tegen iemand die de database in
-- handen heeft ís dit geen bescherming. Dat hoeft ook niet — wie de database
-- heeft, heeft alles. Wat het wél doet is voorkomen dat een log, een backup of
-- een halve query per ongeluk leesbare inlogcodes rondstrooit, en het kost
-- niets. De link ernaast is 128 bits en is wél onherleidbaar.
--
-- LET OP BIJ HERDRAAIEN: SQLite kent geen `ADD COLUMN IF NOT EXISTS`.
-- scripts/migrate.mjs slaat kolommen over die al bestaan.

ALTER TABLE account_tokens ADD COLUMN code_hash       TEXT;
ALTER TABLE account_tokens ADD COLUMN code_expires_at TEXT;

-- Hoeveel keer er op DEZE code is misgegokt. Op de rij en niet op de klant: een
-- nieuwe aanvraag geeft een nieuwe rij en dus een schone teller, en dat is
-- precies goed — wie zijn eigen code verkeerd overtypt hoort niet uren later
-- nog steeds op slot te zitten. Een aanvaller die opnieuw aanvraagt om de
-- teller te resetten stuurt daarmee een mail naar zijn slachtoffer.
ALTER TABLE account_tokens ADD COLUMN code_attempts   INTEGER NOT NULL DEFAULT 0;

-- De code wordt opgezocht op klant + code, en alleen bij rijen die nog leven.
-- Partieel, want dat zijn er per klant hooguit een paar en de rest van de tabel
-- is geschiedenis.
CREATE INDEX IF NOT EXISTS idx_account_tokens_code
  ON account_tokens (customer_id, code_expires_at)
  WHERE code_hash IS NOT NULL;

-- ── "BEWAAR DIT" VAN IEMAND DIE NOG NIET IS INGELOGD ────────────────────────
--
-- Lucas: *"ook na het bestellen — bewaar dit zodat je het niet opnieuw hoeft in
-- te vullen — en ervoor zorgen dat alle informatie die is ingevuld in de
-- bestelling direct wordt overgenomen naar zijn account."*
--
-- Het overnemen gebeurde al: upsertCustomer() in functions/api/order.js schrijft
-- naam, merk, telefoon, btw-nummer, land en adres bij ELKE bestelling weg. Wat
-- ontbrak is het verschil tussen "wij weten dit toevallig" en "jij hebt gevraagd
-- dit te bewaren" — dat is `details_saved_at`, en dat is wat het bestelformulier
-- de volgende keer laat inklappen. Alleen kreeg een uitgelogde klant die vraag
-- nooit te zien.
--
-- WAAROM EEN TUSSENSTAP EN NIET METEEN details_saved_at. /api/order is niet
-- geauthenticeerd: wie een bestelling plaatst, kiest zelf welk e-mailadres hij
-- intypt. Zou een vinkje daar direct details_saved_at zetten, dan kan iemand met
-- een bestelling op jouw adres jouw opgeslagen gegevens bevriezen — daarna wint
-- de opgeslagen waarde en kan geen enkele bestelling er nog iets aan veranderen.
-- Klein, maar het is er.
--
-- Dus: de instemming valt bij de bestelling, het effect pas bij de eerste keer
-- inloggen — het moment waarop bewezen is dat het postvak van hem is. Dat is
-- dezelfde redenering waarmee handleVerify() email_verified op 1 zet.
ALTER TABLE customers ADD COLUMN save_requested_at TEXT;
