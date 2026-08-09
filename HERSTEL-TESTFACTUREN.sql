-- ─────────────────────────────────────────────────────────────────────────────
-- DE TESTFACTUREN OPRUIMEN EN DE TELLER OP NUL
--
-- ⚠ ALLEEN VÓÓR DE EERSTE ECHTE KLANTFACTUUR. Daarna nooit meer.
--
-- ── WAAROM DIT ER IS ─────────────────────────────────────────────────────────
--
-- VIS-2026-0001 is uitgegeven met een fout in de opmaak: er stond `VAT 0.21%` in
-- plaats van `VAT 21%`, en de regel las "catalog — 1 product" met het slug uit de
-- database in plaats van "Catalog". Beide zijn 9 augustus 2026 gerepareerd in
-- src/lib/invoicePdf.js en src/lib/invoice.js.
--
-- Die reparatie bereikt de bestaande factuur niet. issueInvoice() stopt bij een
-- factuur die al 'issued' is — met opzet: een uitgegeven factuur mag niet
-- stilzwijgend veranderen. Dus staat er een pdf in R2 die niet klopt.
--
-- ── WAAROM WEGGOOIEN HIER MAG EN STRAKS NIET ─────────────────────────────────
--
-- Alle facturen die nu bestaan zijn testbestellingen die je op jezelf hebt
-- geplaatst. Er is geen klant die ze heeft, geen boekhouding waar ze in staan, en
-- geen aangifte die ernaar verwijst. Ze weggooien is dus geen administratieve
-- handeling maar het opruimen van proefdata.
--
-- Zodra er één echte factuur uit is, geldt precies het omgekeerde en is dit
-- bestand gevaarlijk: een uitgegeven nummer verdwijnt dan uit een reeks die geen
-- gaten mag hebben, en dat leest bij een controle als een verdwenen factuur. De
-- juiste reparatie is vanaf dat moment opnieuw renderen uit `snapshot_json` — de
-- momentopname klopt namelijk wél, alleen de opmaak was fout, en daar is die
-- momentopname precies voor bedoeld. Zie de noot bovenaan src/lib/invoice.js.
--
-- ── WAT ER GEBEURT ───────────────────────────────────────────────────────────
--
-- De rijen gaan weg en de teller gaat terug naar 0, zodat de eerste factuur na
-- de deploy weer VIS-2026-0001 is en er geen gat aan het begin van de reeks staat.
-- De pdf's in R2 blijven liggen; die worden overschreven zodra hetzelfde nummer
-- opnieuw wordt uitgegeven, want de sleutel is invoices/<jaar>/<nummer>.pdf.
--
-- De BESTELLINGEN blijven ongemoeid. Alleen de facturen erbij verdwijnen, en
-- VISUAILS Studio → Facturen maakt ze bij je eerstvolgende bezoek opnieuw aan,
-- met de betaaldatum van de bestelling als factuurdatum.
--
-- ── VOLGORDE ─────────────────────────────────────────────────────────────────
--
-- 1 · deploy eerst de nieuwe code, anders maakt de inhaalslag dezelfde fout
--     opnieuw;
-- 2 · draai dit blok in het D1-console;
-- 3 · open VISUAILS Studio → Facturen en controleer het resultaat.
-- ─────────────────────────────────────────────────────────────────────────────

-- Eerst kijken wat je weggooit. Draai deze twee los en lees ze na.
--   SELECT id, number, status, created_at FROM invoices ORDER BY id;
--   SELECT * FROM invoice_series;

DELETE FROM invoices;

UPDATE invoice_series SET last_number = 0, updated_at = datetime('now');

-- Controleren:
--   SELECT COUNT(*) FROM invoices;       → 0
--   SELECT * FROM invoice_series;        → last_number 0
