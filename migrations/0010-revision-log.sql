-- VISUAILS — migration 0010, August 2026. Revisies worden geteld, niet begrensd.
--
-- Lucas: *"revisies zijn niet onbeperkt maar worden wanneer normaal gebruikt
-- vaak geaccepteerd. Wanneer hier misbruik van wordt gemaakt kan de klant zijn
-- revisierechten verliezen. Duidelijke fouten gemaakt door VISUAILS worden
-- altijd opgelost."*
--
-- WAAROM GEEN HARDE LIMIET IN DE CODE. Een teller die de knop na drie keer
-- weghaalt, haalt hem ook weg bij de klant die op beeld vier een echte fout van
-- ons vindt. Dat is precies het geval dat volgens die laatste zin altijd
-- opgelost moet worden, en dan staat de code het beleid in de weg. Dus: elke
-- aanvraag wordt vastgelegd, admin ziet het patroon, en intrekken is een
-- handeling van een mens — één kolom, hieronder.
--
-- WAAROM EEN TABEL EN NIET EEN TELLER OP `files`. files.review_state is de
-- HUIDIGE toestand van één beeld en heeft precies één review_note. Vraagt een
-- klant twee keer een revisie op hetzelfde beeld, dan overschrijft de tweede
-- notitie de eerste en is er niets meer te zien van wat er de eerste keer
-- misging — terwijl juist dat het verschil is tussen "wij hebben het niet goed
-- opgelost" en "deze klant blijft vragen". Een regel per aanvraag bewaart de
-- geschiedenis, maakt de telling echt, en laat files.review_state doen waar het
-- voor is.
CREATE TABLE IF NOT EXISTS revision_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Genormaliseerd weggeschreven op het moment van aanvragen. De klant is via
  -- orders.customer_id ook af te leiden, maar dat kan later omgehangen worden
  -- bij het samenvoegen van dubbele accounts, en dan zou de geschiedenis
  -- meeverhuizen naar iemand die de aanvraag nooit deed.
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  -- Verplicht, en dat is niet administratief: zonder wat er mis is, is een
  -- revisie een opdracht om te raden. De UI dwingt het af met `required`, deze
  -- constraint dwingt het af voor alles wat de UI overslaat.
  note        TEXT NOT NULL CHECK (length(trim(note)) > 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  -- Gezet zodra het vervangende beeld geleverd is. NULL = staat nog open, en
  -- dat is de lijst waar admin op stuurt.
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_revreq_open  ON revision_requests(resolved_at, created_at);
CREATE INDEX IF NOT EXISTS idx_revreq_order ON revision_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_revreq_cust  ON revision_requests(customer_id);

-- ⚠ DEZE TWEE REGELS MAKEN DIT BESTAND NIET-HERHAALBAAR, en dat is een scherpe
-- kant van SQLite en niet van deze migratie. CREATE TABLE en CREATE INDEX
-- kennen IF NOT EXISTS; ALTER TABLE ADD COLUMN niet. Draait dit bestand een
-- tweede keer, dan stopt het hier met `duplicate column name` — ook als de rest
-- prima was.
--
-- Dat gebeurde op 6 augustus 2026 echt: de eerste run strandde halverwege op een
-- verlopen wrangler-token, had de kolommen al toegevoegd, en de tweede run liep
-- vast op zijn eigen werk. Niets kapot, wel tien minuten kwijt aan uitzoeken wat
-- er nu wél binnen was.
--
-- KOM JE HIER WEER: draai het bestand niet opnieuw, maar controleer eerst wat er
-- staat en vul alleen het ontbrekende aan.
--
--   SELECT name FROM sqlite_master
--    WHERE name IN ('revision_requests','idx_revreq_open','idx_revreq_order','idx_revreq_cust');
--   SELECT revisions_revoked_note FROM customers LIMIT 1;   -- fout = kolom ontbreekt
--
-- EN VOOR VOLGENDE KEER: zet ALTER TABLE-regels in hun eigen migratienummer,
-- gescheiden van alles wat wél IF NOT EXISTS kent. Dan blokkeert een halve run
-- de andere helft niet.
--
-- Het intrekken zelf. Een tijdstempel en geen boolean, want "sinds wanneer"
-- is de vraag die je stelt zodra een klant belt, en een 1 beantwoordt die niet.
-- NULL = gewoon rechten. De reden staat ernaast zodat de volgende die ernaar
-- kijkt niet hoeft te reconstrueren waarom.
ALTER TABLE customers ADD COLUMN revisions_revoked_at TEXT;
ALTER TABLE customers ADD COLUMN revisions_revoked_note TEXT;

-- CONTROLE NA AFLOOP:
--   SELECT COUNT(*) FROM revision_requests;                      -- 0 op een verse tabel
--   SELECT revisions_revoked_at FROM customers LIMIT 1;          -- NULL, kolom bestaat
--
-- Bestaande revisies zijn NIET met terugwerkende kracht overgezet. files die nu
-- op 'revision_requested' staan hebben hun notitie nog, en die blijft daar
-- staan; een regel in deze tabel verzinnen met een verzonnen datum zou de
-- telling waar admin op stuurt vervuilen met aanvragen waarvan niemand het
-- moment kent. De log begint vandaag en is vanaf vandaag volledig.
