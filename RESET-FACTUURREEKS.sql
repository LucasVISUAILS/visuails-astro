-- ─────────────────────────────────────────────────────────────────────────────
-- DE FACTUURREEKS OP NUL, EN WAT ER STAAT ALS PROEF MERKEN
-- 10 september 2026
--
-- ⚠ ALLEEN VÓÓR DE EERSTE ECHTE KLANTFACTUUR. Daarna nooit meer.
--
-- Dit vervangt HERSTEL-TESTFACTUREN.sql (9 augustus 2026). Dat bestand deed de
-- helft: het gooide de facturen weg en zette de teller terug. Wat het niet kon,
-- omdat het begrip toen nog niet bestond, is de BESTELLINGEN merken — en dat is
-- precies waarom het toen niet hielp en nu wel.
--
-- ── WAAROM ALLEEN WEGGOOIEN NIET WERKT ───────────────────────────────────────
--
-- issueInvoice() is een inhaalslag: hij wordt opnieuw geprobeerd bij elk bezoek
-- aan VISUAILS Studio → Facturen. Gooi je de facturen weg en zet je de teller op
-- nul, dan maakt je eerstvolgende bezoek ze gewoon opnieuw aan — met dezelfde
-- nummers uit dezelfde reeks. Je bent dan precies waar je begon.
--
-- Merk je de bestellingen éérst als proef, dan doet diezelfde inhaalslag het
-- goede: hij geeft ze een nummer uit de PROEF-reeks (zie migratie 0046 en de kop
-- van src/lib/invoice.js). Je houdt dus je facturen om te bekijken, ze zijn
-- onmiskenbaar proef, en de echte teller blijft op nul staan tot je eerste echte
-- klant. Vandaar de volgorde hieronder: MERKEN, dan pas weggooien.
--
-- ── WAAROM WEGGOOIEN HIER MAG EN STRAKS NIET ─────────────────────────────────
--
-- Alle facturen die nu bestaan staan op bestellingen die je op jezelf hebt
-- geplaatst (luunkans@gmail.com). Er is geen klant die ze heeft, geen
-- boekhouding waar ze in staan en geen aangifte die ernaar verwijst. Ze
-- weggooien is dus geen administratieve handeling maar het opruimen van
-- proefdata.
--
-- Zodra er één echte factuur uit is, geldt het omgekeerde en is dit bestand
-- gevaarlijk: een uitgegeven nummer verdwijnt dan uit een reeks die geen gaten
-- mag hebben, en dat leest bij een controle als een verdwenen factuur.
--
-- ── VOORWAARDEN ──────────────────────────────────────────────────────────────
--
-- 1 · migratie 0046 moet gedraaid zijn (anders bestaat `testmodus` niet en valt
--     stap 1 hieronder om met "no such column");
-- 2 · de nieuwe code moet gedeployed zijn (anders geeft de inhaalslag de
--     facturen alsnog een nummer uit de echte reeks);
-- 3 · maak een back-up: `node scripts/backup.mjs`.
--
-- De pdf's in R2 blijven liggen. Die worden overschreven zodra hetzelfde nummer
-- opnieuw wordt uitgegeven — de sleutel is invoices/<jaar>/<nummer>.pdf — en een
-- pdf zonder rij is voor niemand bereikbaar.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══ 0 · EERST KIJKEN WAT JE WEGGOOIT ════════════════════════════════════════
-- Draai deze vier los en lees ze na. Staat er een bestelling bij die NIET van
-- jou is, stop dan hier en zeg het — dan is dit bestand niet meer het goede
-- gereedschap.
--
--   SELECT id, number, status, order_id, created_at FROM invoices ORDER BY seq;
--   SELECT * FROM invoice_series;
--   SELECT COUNT(*) AS abo_facturen FROM subscription_invoices;
--   SELECT COUNT(*) AS creditnotas FROM credit_notes;
--   SELECT id, ref, email, created_at FROM orders ORDER BY id;

-- ══ 1 · MERKEN ══════════════════════════════════════════════════════════════
-- Alles wat er nu staat is van jou. Dit moet vóór stap 2, anders geeft de
-- inhaalslag de facturen straks opnieuw een echt nummer.
UPDATE orders        SET testmodus = 1;
UPDATE subscriptions SET testmodus = 1;

-- ══ 2 · DE DOCUMENTEN WEG ═══════════════════════════════════════════════════
-- In deze volgorde: een creditnota verwijst naar een factuur, en een factuur
-- naar een bestelling. Andersom weigert de database het, en terecht.
DELETE FROM credit_notes;
DELETE FROM subscription_invoices;
DELETE FROM invoices;

-- ══ 3 · DE TELLERS TERUG ════════════════════════════════════════════════════
-- Allebei de reeksen: de echte (jaartal 2026) en de proefreeks (het negatieve
-- jaartal -2026, zie de noot bij reeksSleutel() in src/lib/invoice.js). De rijen
-- worden vanzelf opnieuw aangemaakt zodra er een nummer nodig is.
DELETE FROM invoice_series;

-- ══ 4 · CONTROLEREN ═════════════════════════════════════════════════════════
--   SELECT COUNT(*) FROM invoices;              → 0
--   SELECT * FROM invoice_series;               → leeg
--   SELECT COUNT(*) FROM orders WHERE testmodus = 1;   → al je bestellingen
--
-- Open daarna VISUAILS Studio → Facturen. De inhaalslag maakt ze opnieuw aan en
-- ze horen nu PROEF-2026-0001 en verder te heten. Staat daar VIS-2026-0001, dan
-- is stap 1 niet gelukt of draait de Worker nog oude code — niet doorgaan, maar
-- eerst uitzoeken welke van de twee.
--
-- En in /admin dragen die bestellingen nu een geel PROEF-merkje, met bovenaan de
-- knop om ze in één keer te verbergen.
