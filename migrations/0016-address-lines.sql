-- VISUAILS — 0016: een factuuradres uit elkaar getrokken.
--
-- WAAROM. Lucas, 7 augustus 2026: *"Is factuuradres in 1 regel wel handig, dit
-- doen ze toch vaak apart."* Ja, en om drie redenen die alle drie pas gaan
-- tellen als er echte adressen in staan:
--
--   1 · EEN FACTUUR ZET HET ONDER ELKAAR. Een adres hoort op drie regels:
--       straat en nummer, postcode en plaats, land. Uit één vrij ingetypt veld
--       is dat niet terug te halen — "Vaarwerkhorst 17 7531HK Enschede" heeft
--       geen scheiding die je kunt vertrouwen. Er wordt op dit moment nog
--       nergens een factuur van gerenderd, en dát is precies waarom deze
--       migratie nu goedkoop is en over een half jaar niet meer.
--
--   2 · AUTOMATISCH INVULLEN WERKT ALLEEN PER VELD. Browsers kennen
--       address-line1, postal-code en address-level2 en vullen die betrouwbaar
--       in; `street-address` op één input is de slechtst ondersteunde van het
--       stel. Dat is geen detail op een formulier dat een klant één keer per
--       bestelling invult.
--
--   3 · POSTCODE EN PLAATS ZIJN GEGEVENS, GEEN TEKST. Controleren of een
--       Nederlandse postcode klopt, of tellen uit welke stad de bestellingen
--       komen, kan niet op een kolom waar het hele adres in één string zit.
--
-- ── WAT ER MET billing_address GEBEURT ───────────────────────────────────────
--
-- Die blijft staan, en blijft gevuld worden. Niet uit voorzichtigheid maar
-- omdat hij een andere vraag beantwoordt dan de vier kolommen hieronder: hij is
-- de SAMENGESTELDE weergave, het adres zoals het op een factuur of in een mail
-- terechtkomt, en die wordt geschreven op het moment dat de losse velden worden
-- opgeslagen. Zo hoeft geen enkele lezer — een mailsjabloon, het adminscherm,
-- het archief van de bewaarplicht — de regels zelf in de goede volgorde te
-- zetten, en blijft elke rij van vóór vandaag leesbaar zonder backfill die
-- moet gokken waar de postcode begint.
--
-- Dus: schrijven gebeurt in de losse velden, lezen mag uit allebei, en wie een
-- adres nodig heeft als één blok pakt billing_address.
--
-- ── WAAROM REGION EN GEEN 'STATE' ────────────────────────────────────────────
--
-- Het veld heet region omdat het buiten de VS iets anders is: provincie,
-- county, prefectuur. Optioneel, want het grootste deel van Europa heeft het
-- niet op een adres staan, en een verplicht veld dat in Nederland leeg blijft
-- is een veld dat mensen leren over te slaan.
--
-- ── GEEN NOT NULL ────────────────────────────────────────────────────────────
--
-- Alle vijf nullable, ook postcode en plaats. Elke rij die er nu staat heeft ze
-- niet, en een NOT NULL met een lege string als default is een verplichting die
-- alleen op papier bestaat. Het formulier eist ze wel; dat is de plek waar een
-- eis thuishoort, want daar kan er iets over gezegd worden.
--
-- LET OP BIJ HERDRAAIEN: SQLite kent geen `ADD COLUMN IF NOT EXISTS`.
-- scripts/migrate.mjs slaat kolommen over die al bestaan.

-- ── EN DE NAAM, OM PRECIES DEZELFDE REDEN ───────────────────────────────────
--
-- Lucas, in dezelfde adem: *"Aanpassen naar naam en achternaam."* `name` was één
-- veld met "Je naam" erboven, en dat levert "Mara" op — genoeg voor een
-- aanhef, te weinig voor een factuur, waar de tenaamstelling de volledige naam
-- van de klant hoort te zijn.
--
-- `name` blijft, met dezelfde rol als billing_address hieronder: de
-- SAMENGESTELDE weergave. Elke mail, elk adminscherm en elke bestelling van
-- vóór vandaag leest hem en blijft dat doen; hij wordt voortaan geschreven op
-- het moment dat de twee losse velden worden opgeslagen. Geen backfill die moet
-- raden waar een voornaam ophoudt — bij "Van der Meer" is dat niet te doen, en
-- een gok die één op de tien namen verminkt is erger dan een leeg veld dat de
-- klant zelf invult.
ALTER TABLE customers ADD COLUMN first_name TEXT;
ALTER TABLE customers ADD COLUMN last_name  TEXT;
ALTER TABLE orders    ADD COLUMN first_name TEXT;
ALTER TABLE orders    ADD COLUMN last_name  TEXT;

-- ── "IK HEB GEEN BTW-NUMMER" IS EEN ANTWOORD ────────────────────────────────
--
-- Lucas: *"Deze gegevens zijn ook verplicht inclusief btw-nummer met een
-- checkbox bij btw-nummer toch te skippen als de klant geen btw-nummer heeft of
-- buiten de eu komt."*
--
-- Zonder deze kolom is een leeg vat_number dubbelzinnig: het betekent óf "nog
-- niet ingevuld" óf "die heb ik niet". Dat verschil is precies wat het
-- formulier moet weten om te besluiten of het veld verplicht is, en het is niet
-- af te leiden uit het lege veld zelf. Een klant die één keer heeft gezegd dat
-- hij er geen heeft, hoort dat niet bij elke bestelling opnieuw te moeten
-- zeggen.
--
-- DIT VERANDERT DE BTW NIET. Het vinkje zegt alleen iets over het formulier.
-- vatDecision() in src/data/vat.js kijkt naar het land en naar een bij VIES
-- BEVESTIGD nummer, en niets anders — geen nummer is daar altijd al hetzelfde
-- geweest als een onbevestigd nummer, namelijk 21% binnen de EU en buiten
-- de scope daarbuiten. Een vinkje kan geen 0% kopen.
ALTER TABLE customers ADD COLUMN no_vat_number INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders    ADD COLUMN no_vat_number INTEGER NOT NULL DEFAULT 0;

-- ── de klant ─────────────────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN address_line1 TEXT;
ALTER TABLE customers ADD COLUMN address_line2 TEXT;
ALTER TABLE customers ADD COLUMN postal_code   TEXT;
ALTER TABLE customers ADD COLUMN city          TEXT;
ALTER TABLE customers ADD COLUMN region        TEXT;

-- ── en de bestelling ─────────────────────────────────────────────────────────
-- Hetzelfde adres, vastgelegd zoals het op het moment van bestellen was. Een
-- klant die verhuist mag zijn oude facturen niet zien veranderen; dat is
-- dezelfde reden waarom orders.country en orders.billing_address in migratie
-- 0015 naast de kolommen op customers zijn gezet in plaats van ernaar te
-- verwijzen.
ALTER TABLE orders ADD COLUMN address_line1 TEXT;
ALTER TABLE orders ADD COLUMN address_line2 TEXT;
ALTER TABLE orders ADD COLUMN postal_code   TEXT;
ALTER TABLE orders ADD COLUMN city          TEXT;
ALTER TABLE orders ADD COLUMN region        TEXT;
