-- VISUAILS — migratie 0013, augustus 2026. Het gesprek hoort bij de bestelling.
--
-- Lucas: *"een klant vraagt een revisie met een notitie, jij lost hem op, en
-- daarna is er geen kanaal meer. Alles wat volgt gaat via WhatsApp of mail, en
-- staat dus nergens bij de bestelling. Over drie maanden weet niemand meer
-- waarom die extra ronde er was."*
--
-- ─────────────────────────────────────────────────────────────────────────────
-- DRIE DINGEN, DRIE VORMEN, EN HET VERSCHIL ZIT IN DE KOLOM.
--
-- 1 · orders.customer_note — ÉÉN veld dat de klant óók ziet. Geen log maar een
--     mededeling: "de stof op product 4 kwam donkerder uit dan op je foto, we
--     hebben de belichting aangepast." Wat er nu geldt, niet wat er ooit gold.
--     Een gesprekshistorie zou hier een tweede inbox worden, en die bestaat al
--     — dit is het prikbord bij de bestelling.
--
-- 2 · order_notes — de INTERNE aantekeningen, wél als log. Lucas: *"interne
--     notities apart, die de klant nooit ziet — het verschil moet in de kolom
--     zitten, niet in jouw hoofd."* Dat is de hele reden dat dit een eigen
--     tabel is en geen tweede tekstveld naast het bovenstaande: twee velden op
--     één formulier is één verkeerd klik van "dit had de klant nooit mogen
--     lezen". Een aparte tabel die door geen enkele klantquery wordt aangeraakt
--     kan dat per constructie niet.
--
--     GEEN visibility-KOLOM, en dat is expres. Een kolom met 'internal' of
--     'customer' erin is een filter dat je moet ONTHOUDEN toe te passen; een
--     tabel die de klantkant niet kent, is een filter dat niet vergeten kan
--     worden. Zoek in src/lib/account.js naar order_notes en je vindt niets —
--     dat is de garantie.
--
-- 3 · revision_requests.resolution_note — één regel terug bij een afgehandelde
--     revisie. De klant liet weten wat er mis was; het minste wat daar
--     tegenover staat is wat eraan gedaan is. Hij komt op de tijdlijn van de
--     klant terecht (order_events, sinds augustus 2026 ook op het dashboard
--     zichtbaar) en blijft hier staan als bewijs bij de aanvraag zelf.
--
-- LET OP — NIET TWEE KEER TE DRAAIEN. ALTER TABLE ADD COLUMN kent geen
-- IF NOT EXISTS. Controleer eerst:
--
--   npx wrangler d1 execute visuails --remote --command \
--     "SELECT name FROM pragma_table_info('orders') WHERE name LIKE 'customer_note%';"

ALTER TABLE orders ADD COLUMN customer_note TEXT;
ALTER TABLE orders ADD COLUMN customer_note_at TEXT;

CREATE TABLE IF NOT EXISTS order_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Leeg heeft geen betekenis: een aantekening zonder tekst is geen
  -- aantekening. Dezelfde CHECK als op revision_requests.note, om dezelfde
  -- reden — het formulier kan omzeild worden, deze regel niet.
  body       TEXT NOT NULL CHECK (length(trim(body)) > 0),
  -- Wie het schreef. Nu altijd 'admin'; de kolom staat er zodat een tweede paar
  -- handen in de studio later niet als jou geboekt wordt.
  author     TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id, id);

ALTER TABLE revision_requests ADD COLUMN resolution_note TEXT;
