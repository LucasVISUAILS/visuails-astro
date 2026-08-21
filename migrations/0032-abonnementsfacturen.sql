-- ═══════════════════════════════════════════════════════════════════════════════
-- 0032 · EEN FACTUUR VOOR ELKE ABONNEMENTSTERMIJN
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ── WAT ER ONTBRAK ───────────────────────────────────────────────────────────
--
-- `invoices.order_id` staat in migratie 0021 als NOT NULL UNIQUE REFERENCES
-- orders(id). Een factuur kan daar dus alleen aan een BESTELLING hangen. De
-- maandelijkse incasso van een abonnement landt in `subscription_payments`, en
-- die tabel hangt — zoals de noot erbij in admin.js ook zegt — aan geen enkele
-- bestelling. Het gevolg: elke termijn leverde een betaalrij en een tegoed op,
-- en nul documenten.
--
-- Voor een terugkerende zakelijke afschrijving in Nederland hoort daar een
-- factuur tegenover, uit dezelfde doorlopende reeks, met de btw-behandeling
-- erop. Zolang er nog geen abonnee is kost dat niets; vanaf de eerste is het
-- elke maand raak, en met terugwerkende kracht factureren is precies wat je met
-- een doorlopende nummerreeks niet kunt.
--
-- ── EEN EIGEN TABEL, DEZELFDE REEKS ─────────────────────────────────────────
--
-- Dit volgt `credit_notes` uit migratie 0026: een eigen tabel, met een nummer
-- uit `invoice_series`. Dat is hier bewust gekozen boven het alternatief.
--
-- Het alternatief was `invoices.order_id` nullable maken en er een
-- `subscription_payment_id` naast zetten. Netter in theorie — één documenttype,
-- één tabel — maar SQLite kan een NOT NULL niet in plaats opheffen. Dat vraagt
-- de twaalfstapsdans: nieuwe tabel, kopiëren, oude weggooien, hernoemen. En op
-- die oude tabel staat een verwijzing vanuit `credit_notes.invoice_id` met
-- ON DELETE RESTRICT. Een tabel weggooien waar een uitgereikt document naar
-- wijst, op een database met echte facturen erin, is geen migratie die je op
-- een vrijdagavond draait.
--
-- De prijs van deze keuze is dat "alle facturen van deze klant" een UNION is.
-- Die staat op één plek (loadInvoices in src/lib/account.js) en is daar
-- opgeschreven.
--
-- ── DE BTW STAAT OP HET ABONNEMENT EN NIET OP DE TERMIJN ────────────────────
--
-- Vier kolommen erbij op `subscriptions`. De behandeling wordt vastgelegd op het
-- moment dat het abonnement wordt afgesloten — dan loopt de klant door dezelfde
-- VIES-controle en dezelfde poort als bij een gewone bestelling — en geldt
-- daarna voor elke termijn.
--
-- Waarom niet per termijn opnieuw kijken: dat zou een netwerkaanroep naar VIES
-- binnen een webhook betekenen, elke maand, met een factuur die niet uitgaat als
-- Europa toevallig traag is. En het is ook fiscaal het verkeerde moment — een
-- btw-nummer dat vandaag vervalt, maakt de factuur van vorige maand niet onjuist.
-- Verandert er iets aan de klant, dan is dat een wijziging van het abonnement.
--
-- NULL betekent "nog niet vastgelegd", en dan valt de factuur terug op 21%
-- Nederlands tarief — de veilige kant, want te weinig btw rekenen is een naheffing
-- en te veel is een correctie.

ALTER TABLE subscriptions ADD COLUMN vat_treatment TEXT;
ALTER TABLE subscriptions ADD COLUMN vat_rate      REAL;
ALTER TABLE subscriptions ADD COLUMN vat_country   TEXT;
ALTER TABLE subscriptions ADD COLUMN vat_number    TEXT;

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Uit invoice_series, dezelfde vorm en dezelfde reeks als een factuur op een
  -- bestelling: 'VIS-2026-0009'. Eén doorlopende nummering over alle documenten,
  -- want dat is wat de Belastingdienst vraagt en wat de vraag "waar is factuur 8"
  -- beantwoordbaar houdt.
  number      TEXT    NOT NULL UNIQUE,
  year        INTEGER NOT NULL,
  seq         INTEGER NOT NULL,

  -- ── WAAROM SET NULL EN NIET RESTRICT ──────────────────────────────────────
  -- Eerst stond hier ON DELETE RESTRICT, naar het voorbeeld van invoices.order_id.
  -- Dat werkt daar en hier niet, en het verschil zit in één kolom: orders.customer_id
  -- is ON DELETE SET NULL, dus een gefactureerde bestelling kan blijven staan als de
  -- klant verdwijnt. subscriptions.customer_id is ON DELETE CASCADE. Een abonnement
  -- KAN dus niet blijven staan — en met RESTRICT erop viel de hele AVG-wisknop om:
  -- handleCustomerWipe() doet alles in één batch, dus één foreign-key-fout rolde het
  -- geheel terug. Geen bestellingen gewist, geen bestanden weg, geen logregel, en dat
  -- terwijl de R2-objecten in stap 2 al onherroepelijk verwijderd waren. Precies de
  -- fout die op 12 augustus 2026 al één keer voor invoices is gerepareerd.
  --
  -- En SET NULL kost hier niets, want de factuur draagt zichzelf: snapshot_json bevat
  -- naam, adres, bedragen en btw zoals ze op het papier staan, en pdf_key wijst naar
  -- het papier zelf. Dat is het bewijsstuk waar de fiscale bewaarplicht over gaat.
  -- De verwijzing naar het abonnement is een gemak, niet de inhoud — net als
  -- customer_id hieronder, die om exact dezelfde reden al SET NULL was.
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- DE AFSCHRIJVING WAAR DEZE FACTUUR VOOR STAAT. UNIQUE, want twee facturen op
  -- één incasso is precies de fout die dit hele bestand moet voorkomen — en het
  -- is ook de idempotentie: de webhook van Mollie levert dezelfde melding meer
  -- dan één keer af, en dan valt de tweede hierop stuk in plaats van een tweede
  -- nummer te verbruiken. SQLite laat meerdere NULL's toe in een UNIQUE kolom, en
  -- dat is hier precies goed: zodra de afschrijving gewist is valt er niets meer
  -- opnieuw uit te reiken, dus valt er ook niets meer dubbel te doen.
  subscription_payment_id INTEGER UNIQUE
                REFERENCES subscription_payments(id) ON DELETE SET NULL,

  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- 'YYYY-MM' — de maand waar de termijn voor staat. Staat ook op het papier, want
  -- "Starter, augustus 2026" is wat een boekhouder zoekt en 'VIS-2026-0009' niet.
  month       TEXT,

  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'issued', 'void')),
  void_reason TEXT,

  pdf_key     TEXT,
  pdf_bytes   INTEGER,

  -- Dezelfde vorm als invoices.snapshot_json: de volledige invoer van
  -- renderInvoicePdf(), zodat dezelfde factuur later byte-identiek opnieuw te
  -- maken is zonder de prijslijst van vandaag te raadplegen.
  snapshot_json TEXT NOT NULL,

  lang        TEXT    NOT NULL DEFAULT 'nl',
  issued_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),

  CHECK (status <> 'issued' OR pdf_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_subinv_sub      ON subscription_invoices(subscription_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subinv_customer ON subscription_invoices(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subinv_series   ON subscription_invoices(year, seq);
-- Voor de hersteltaak, net als idx_invoices_pending: welke nummers wachten op een pdf.
CREATE INDEX IF NOT EXISTS idx_subinv_pending  ON subscription_invoices(created_at) WHERE status = 'pending';
