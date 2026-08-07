-- VISUAILS — migratie 0011, augustus 2026. Een herlevering is ook nieuws.
--
-- Lucas: *"een tweede mailsoort: 'je revisie staat klaar', los van de eerste
-- levering. delivery_mailed_at blijft de eerste aankondiging bewaken;
-- herleveringen krijgen hun eigen teller. Niet automatisch bij elke upload
-- versturen maar met een knop, zodat drie beelden achter elkaar één bericht
-- zijn."*
--
-- WAT ER STUK WAS. `orders.delivery_mailed_at` is precies goed voor wat het
-- doet: het zorgt dat "je bestelling staat klaar" één keer verstuurd wordt, ook
-- als de status per ongeluk twee keer op geleverd wordt gezet. Maar het is
-- eenrichtingsverkeer. Zodra die datum er staat, is elk volgend beeld dat de
-- studio uploadt onzichtbaar voor de klant tot hij uit zichzelf gaat kijken —
-- en dat is exact de situatie na een revisie, de functie die we vandaag hebben
-- gebouwd. De klant vraagt een revisie aan, wij lossen hem op, en niemand
-- vertelt het hem. De revisieknop was daarmee een knop die in stilte eindigt.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DRIE KOLOMMEN, EN WAAROM ELK ERVAN.
--
-- files.announced_at — PER BESTAND, want dat is de vraag die de knop stelt:
-- welke beelden heeft deze klant nog nooit aangekondigd gezien? Een datum op de
-- bestelling kan dat niet beantwoorden zonder tijdstempels te gaan vergelijken,
-- en die vergelijking gaat mis op precies het moment waarop het ertoe doet:
-- twee uploads binnen dezelfde seconde als de mail. Een stempel per bestand is
-- een feit; een vergelijking van twee datums is een gok.
--
-- orders.redelivery_mailed_at — WANNEER de laatste herlevering gemeld is. Niet
-- om iets tegen te houden (dat doet announced_at), maar zodat admin op het
-- scherm ziet wat er al gezegd is. Zonder dat wordt "heb ik het al gemeld?"
-- weer een vraag die je alleen in je mailbox kunt beantwoorden.
--
-- orders.redelivery_count — HOE VAAK. Dit is de teller die Lucas vroeg, en hij
-- staat los van de eerste levering. Drie herleveringen op één bestelling is
-- geen fout, maar het is wel iets: dat is een order die drie keer terugkwam.
-- Zonder teller is dat pas te zien door mails te tellen.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- LET OP — DEZE MIGRATIE IS NIET TWEE KEER TE DRAAIEN.
--
-- SQLite kent `CREATE TABLE IF NOT EXISTS` en `CREATE INDEX IF NOT EXISTS`,
-- maar `ALTER TABLE ... ADD COLUMN` heeft geen IF NOT EXISTS. Een tweede run
-- stopt op "duplicate column name" — en dat gebeurde bij migratie 0010 ook al,
-- nadat een eerste poging halverwege op een verlopen token strandde. Loopt hij
-- vast: kijk eerst wat er al staat voordat je iets opnieuw draait.
--
--   npx wrangler d1 execute visuails --remote --command \
--     "SELECT name FROM pragma_table_info('orders') WHERE name LIKE 'redeliv%';"
--   npx wrangler d1 execute visuails --remote --command \
--     "SELECT name FROM pragma_table_info('files') WHERE name = 'announced_at';"
--
-- Staan ze er alle drie, dan is deze migratie klaar — ook als de laatste regel
-- een foutmelding gaf. De backfill onderaan is wél opnieuw te draaien: hij
-- raakt alleen rijen aan waar announced_at nog leeg is.

ALTER TABLE orders ADD COLUMN redelivery_mailed_at TEXT;
ALTER TABLE orders ADD COLUMN redelivery_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE files ADD COLUMN announced_at TEXT;

-- Gedeeltelijke index: alleen de rijen waar de knop naar zoekt. De tabel bevat
-- straks duizenden geleverde bestanden en hooguit een handvol onaangekondigde,
-- dus dit is een index ter grootte van de werkvoorraad in plaats van van de
-- hele geschiedenis.
CREATE INDEX IF NOT EXISTS idx_files_unannounced
  ON files (order_id) WHERE kind = 'delivery' AND announced_at IS NULL;

-- ── DE BACKFILL, EN WAAROM HIJ NIET ALLES AANRAAKT ───────────────────────────
--
-- Zonder backfill zou elke bestelling die ooit geleverd is morgen melden dat er
-- twintig onaangekondigde beelden klaarstaan, en dan is de eerste ervaring met
-- deze functie een lijst met vals alarm.
--
-- Maar niet álles stempelen: een bestand dat is geüpload NÁ de leveringsmail is
-- echt nooit aangekondigd. Dat is de bestaande achterstand — de revisies die de
-- afgelopen weken stil zijn opgelost — en die hoort juist wél op te lichten.
-- Vandaar de vergelijking met created_at: alles van vóór de mail krijgt de
-- datum van die mail, alles van erna blijft leeg en verschijnt als werk.
UPDATE files
   SET announced_at = (SELECT o.delivery_mailed_at FROM orders o WHERE o.id = files.order_id)
 WHERE kind = 'delivery'
   AND announced_at IS NULL
   AND EXISTS (
     SELECT 1 FROM orders o
      WHERE o.id = files.order_id
        AND o.delivery_mailed_at IS NOT NULL
        AND (files.created_at IS NULL OR files.created_at <= o.delivery_mailed_at)
   );
