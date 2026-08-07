-- VISUAILS — migratie 0012, augustus 2026. Een beeld hoort bij een product.
--
-- Lucas: *"uploads dragen product_key en shot — 'p3 · achterkant'. Leveringen
-- dragen niets. Op het dashboard staan de twee kanten dus naast elkaar zonder
-- dat iemand kan zien welk beeld bij welk product hoort. Bij één product valt
-- dat niet op. Bij dertig is het onbruikbaar, en het is precies de bestelling
-- waar het uitmaakt."*
--
-- WAT ER SCHEMATISCH MOEST GEBEUREN: NIETS EN IETS.
--
-- Niets: files.product_key en files.shot bestaan al sinds migratie 0005 en
-- gelden voor élke rij, ook een levering. De reden dat leveringen ze leeg
-- lieten zat niet in het schema maar in de uploadroute van admin, die de
-- kolommen simpelweg niet vulde. Dat is code, en dat is daar gerepareerd.
--
-- Iets: `superseded_at`, hieronder. Zodra een levering aan een product én een
-- shot hangt, is een tweede levering voor diezelfde combinatie geen extra beeld
-- maar een VERVANGING — dat is precies wat er na een revisie gebeurt. Zonder
-- die notie groeit een product na drie revisieronden naar zeven beelden waarvan
-- de klant er vier moet negeren, en dan is "een product is vier foto's" geen
-- waarheid meer maar een wens.
--
-- WAAROM EEN DATUM EN GEEN VERWIJZING NAAR DE OPVOLGER. Overwogen:
-- `replaced_by_file_id`. Dat legt meer vast (welk beeld precies), maar het is
-- ook een verwijzing die klopt te houden is bij verwijderen, bij opnieuw
-- indelen en bij een correctie — en niets in het product vraagt erom. De vraag
-- die overal gesteld wordt is "moet ik dit beeld nog tonen", en dat is een ja
-- of een nee. De opvolger is af te leiden: hetzelfde order_id, hetzelfde
-- product_key, dezelfde shot, hoger id.
--
-- WAT DE KLANT ZIET. Alleen de levende beelden — per product en per shot het
-- laatste. Wat vervangen is verdwijnt uit zijn dashboard, want hij heeft niets
-- aan de foto waar hij een revisie op vroeg. Admin ziet de hele stapel: daar is
-- de geschiedenis het bewijs dat er iets aan gedaan is.
--
-- LET OP — NIET TWEE KEER TE DRAAIEN. `ALTER TABLE ... ADD COLUMN` kent geen
-- IF NOT EXISTS; een tweede run stopt op "duplicate column name". Controleer
-- eerst wat er staat voordat je hem opnieuw draait:
--
--   npx wrangler d1 execute visuails --remote --command \
--     "SELECT name FROM pragma_table_info('files') WHERE name = 'superseded_at';"

ALTER TABLE files ADD COLUMN superseded_at TEXT;

-- De index dient de vraag die het dashboard bij élke bestelling stelt: geef de
-- levende leveringen van deze bestelling. Gedeeltelijk, want vervangen beelden
-- zijn per definitie de minderheid en horen niet in de index thuis.
CREATE INDEX IF NOT EXISTS idx_files_live_delivery
  ON files (order_id, product_key, shot)
  WHERE kind = 'delivery' AND superseded_at IS NULL;

-- Bestaande leveringen dragen nog geen product. Ze blijven zichtbaar (NULL is
-- "niet ingedeeld", niet "vervangen") en verschijnen in admin onder een eigen
-- kopje met de vraag om ze alsnog in te delen. Bewust géén gok hier in SQL: een
-- bestandsnaam raden hoort thuis waar een mens de gok kan bevestigen, en dat is
-- het indeelformulier op de bestandenpagina.
