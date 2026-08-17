-- VISUAILS — abonnementen.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- DRIE TABELLEN, EN WAAROM HET NIET ÉÉN IS
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Lucas, 16 augustus 2026: *"bouw het systeem erin"*, met als harde eis
-- *"onthoud ik werk alleen [...] zoveel mogelijk moet geautomatiseerd zijn."*
--
-- Automatiseren kan alleen wat je kunt uitrekenen zonder erbij te zitten. Dat is
-- de reden dat dit drie tabellen zijn en niet één met een handvol kolommen:
--
--   subscriptions        DE AFSPRAAK. Eén rij per abonnement: welk plan, welke
--                        termijn, sinds wanneer, en de sleutels bij Mollie.
--   subscription_months  DE BOEKHOUDING. Eén rij per maand per abonnement:
--                        toegekend, verbruikt, doorgeschoven. Het saldo is een
--                        SOM over deze rijen en geen kolom die bijgewerkt moet
--                        worden — een teller die je met de hand ophoogt, is een
--                        teller die na één mislukte transactie niet meer klopt.
--   plan_queue           DE WACHTRIJ VAN DE KLANT. Wat hij gemaakt wil hebben,
--                        op zijn eigen volgorde. Zie de kop daar.
--
-- ── WAAROM HET SALDO EEN SOM IS EN GEEN KOLOM ────────────────────────────────
--
-- `orders.refunded_cents` was een kolom, en migratie 0029 moest hem repareren
-- omdat één getal twee dingen betekende. Dezelfde fout dreigt hier harder: een
-- abonnee die deze maand vier producten bestelt en er één annuleert, zou bij een
-- kolom afhankelijk zijn van twee UPDATE's die allebei moeten slagen. Bij een som
-- over `subscription_months` is de waarheid altijd te herleiden uit de rijen die
-- er staan, en een half afgemaakte bestelling verandert het saldo niet.
--
-- ── WAT ER NIET IN STAAT ─────────────────────────────────────────────────────
--
-- Geen prijs. Wat een plan kost staat in src/data/pricing.js en de structuur in
-- src/data/plans.js; hier staat alleen WELK plan en WELKE termijn. Een bedrag in
-- deze tabel zou betekenen dat een prijswijziging op de site niet meer klopt met
-- wat er in de database staat — en precies het omgekeerde is de bedoeling: het
-- prijsslot van de jaartermijn is een EIGENSCHAP van de termijn, niet een
-- bevroren getal per klant.
--
-- Wel het mandaat en de Mollie-ids, want die zijn per klant en nergens anders te
-- herleiden.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id       INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- HET KENMERK DAT DE EERSTE BETALING TERUGVINDT. De afschrijvingen daarna
  -- dragen een `subscriptionId` en worden op mollie_subscription_id gevonden,
  -- maar de éérste betaling — die van het mandaat — bestaat vóór er een Mollie-
  -- subscription is. Die draagt `metadata.sub_ref`, en dit is de kolom waar dat
  -- op landt. Zonder deze kolom komt een geslaagde mandaatbetaling binnen zonder
  -- dat er iets is om hem aan te hangen; precies de fout die order_ref bij
  -- gewone bestellingen al voorkomt.
  ref               TEXT NOT NULL,

  -- 'starter' | 'studio' | 'brand' — de id's uit PLAN_IDS in src/data/plans.js.
  -- Geen CHECK, om dezelfde reden als bij customer_style_locks.ratio: welke
  -- plannen bestaan is een verkoopbesluit dat meebeweegt, en een CHECK zou bij
  -- elk nieuw plan een migratie vragen.
  plan              TEXT NOT NULL,
  -- 'monthly' | 'yearly'. Bepaalt de prijs, het doorschuiven en de extra's —
  -- allemaal via term() in plans.js en niet via een kolom hier.
  term              TEXT NOT NULL DEFAULT 'monthly',

  -- 'pending'  aangevraagd, nog niet actief (mandaat ontbreekt of wacht op jou)
  -- 'active'   loopt, wordt afgeschreven
  -- 'paused'   staat stil. Ook waar een mislukte afschrijving hem heen zet, en
  --            dat is met opzet dezelfde toestand als een klant die zelf pauzeert:
  --            in beide gevallen mag er niets geproduceerd worden en is er niets
  --            aan de hand met de klant zelf.
  -- 'cancelled' opgezegd. De rij blijft — een opgezegd abonnement is een feit dat
  --            je nodig hebt voor de facturen en voor de vraag of iemand ooit
  --            klant was.
  status            TEXT NOT NULL DEFAULT 'pending',

  -- ── DE STAANDE WEEK ────────────────────────────────────────────────────────
  -- De dag van de maand waarop het venster van deze abonnee begint (1–28). Niet
  -- een datum: een datum is één maand, en de belofte is *"dezelfde dagen, elke
  -- maand"*. 28 als bovengrens zodat februari geen uitzondering is.
  window_day        INTEGER,

  -- ── MOLLIE ─────────────────────────────────────────────────────────────────
  -- `mollie_customer_id` en `mollie_mandate_id` komen uit de eerste betaling;
  -- `mollie_subscription_id` uit het aanmaken van de subscription daarna. Alle
  -- drie nullable, want ze ontstaan op drie verschillende momenten en een
  -- abonnement in 'pending' heeft er nog geen.
  mollie_customer_id     TEXT,
  mollie_mandate_id      TEXT,
  mollie_subscription_id TEXT,

  -- Waar de termijn begint te lopen. Bij 'yearly' is dit waar de twaalf maanden
  -- vandaan geteld worden, en dus waar de verbintenis afloopt.
  started_at        TEXT,
  -- Wanneer de klant heeft opgezegd. De einddatum volgt uit started_at plus de
  -- termijn en wordt daarom niet apart opgeslagen: één datum die uit twee andere
  -- volgt, is een datum die ooit met die twee in tegenspraak staat.
  cancelled_at      TEXT,
  cancel_reason     TEXT,
  paused_at         TEXT,
  -- De reden dat hij stilstaat, in onze eigen woorden. 'customer' of
  -- 'payment_failed' — dat verschil bepaalt of de klant een link krijgt om zijn
  -- mandaat te vernieuwen of niet.
  pause_reason      TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ÉÉN LOPEND ABONNEMENT PER KLANT. Een tweede erbij is bijna altijd een dubbel
-- verstuurd formulier, en twee actieve abonnementen op één klant maken elk saldo
-- dubbelzinnig. Een opgezegd abonnement blokkeert een nieuw abonnement niet, want
-- de index dekt alleen 'active' en 'pending' — daarom een partiële index en geen
-- UNIQUE op (customer_id).
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_one_live
  ON subscriptions(customer_id)
  WHERE status IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status, window_day);

-- Het kenmerk is uniek en dat wordt hier afgedwongen en niet in JavaScript: twee
-- abonnementen met hetzelfde kenmerk zouden een geslaagde mandaatbetaling naar
-- de verkeerde klant kunnen leiden.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_ref ON subscriptions(ref);
-- Waarop de webhook een abonnementsbetaling terugvindt. Zie recordSubscriptionPaid()
-- in functions/api/webhook/mollie.js: een afschrijving draagt een subscriptionId
-- en geen order_ref, en dit is de enige weg terug naar de klant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_mollie
  ON subscriptions(mollie_subscription_id)
  WHERE mollie_subscription_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- DE MAANDEN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Eén rij per maand per abonnement, aangemaakt op het moment dat er betaald is.
-- `granted` is wat het plan die maand toekende, `used` wat er verbruikt is.
--
-- WAAROM `granted` HIER STAAT EN NIET UIT plans.js WORDT GELEZEN. Omdat het een
-- HISTORISCH feit is: wie in maart een Studio had en in juni een Brand, heeft in
-- maart twaalf producten gekregen en niet dertig. Het aantal uit plans.js zegt wat
-- een plan VANDAAG toekent; deze kolom zegt wat er is toegekend. Dat is hetzelfde
-- onderscheid als tussen de ladder en `orders.total_cents`.
--
-- `month` als 'YYYY-MM' en niet als datum: het is een periode en geen moment, en
-- als tekst sorteert hij correct en is hij in SQL te groeperen zonder functies.
CREATE TABLE IF NOT EXISTS subscription_months (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id  INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,              -- 'YYYY-MM'
  granted          INTEGER NOT NULL DEFAULT 0,
  used             INTEGER NOT NULL DEFAULT 0,

  -- ── CLIPS ZIJN EEN TWEEDE BUDGET EN GEEN DEEL VAN HET EERSTE ──────────────
  --
  -- Een plan geeft producten EN clips, en het zijn twee dingen die niet in
  -- elkaar over te maken zijn: een clip is geen product en een product is geen
  -- clip. Ze in één teller stoppen zou betekenen dat een merk zijn hele plan aan
  -- video kan opmaken, of dat een ongebruikte clip als product wordt geteld.
  --
  -- Twee kolommen en niet een tweede tabel: het is dezelfde maand, dezelfde
  -- betaling en dezelfde vervaldatum. Een aparte tabel zou die drie dingen
  -- dubbel bijhouden en de kans geven dat ze uit elkaar lopen.
  --
  -- DEFAULT 0 en niet het aantal uit plans.js: Starter heeft geen clips, en een
  -- kolom die standaard iets toekent wat het plan niet geeft, is een gat.
  clips_granted    INTEGER NOT NULL DEFAULT 0,
  clips_used       INTEGER NOT NULL DEFAULT 0,

  -- De betaling waarmee deze maand is toegekend. Nullable: een maand die met de
  -- hand is toegekend (een goodwill-maand, een correctie) heeft er geen, en dat
  -- is een geldig geval en geen ontbrekende gegevens.
  payment_id       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ÉÉN RIJ PER MAAND PER ABONNEMENT, en dit is de belangrijkste index in deze
-- migratie: hij maakt de webhook idempotent. Mollie levert dezelfde melding
-- desnoods drie keer af, en de tweede keer valt om op deze index in plaats van
-- de klant twaalf producten extra te geven. Zelfde mechanisme als
-- UNIQUE(provider, external_id) op `payments`, en om dezelfde reden.
CREATE UNIQUE INDEX IF NOT EXISTS idx_submonths_unique
  ON subscription_months(subscription_id, month);

-- ══════════════════════════════════════════════════════════════════════════════
-- DE WACHTRIJ — VAN DE KLANT, EN DAT IS HET HELE ONTWERP
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Het eerste ontwerp liet VISUAILS voorstellen wat er aan de beurt was. Lucas
-- wees dat af, en terecht: *"Ik wil niet dat visuails zegt wat er aan de beurt
-- is [...] ik werk alleen dus ik kan overzicht verliezen."* Een blok dat
-- "klaargezet voor september" heet, vraagt om iemand die het klaarzet — per
-- abonnee, elke maand. Dat is een plafond en geen systeem.
--
-- Dus vult de KLANT deze rijen. Hij zet erin wat hij gemaakt wil hebben op het
-- moment dat hij eraan denkt; een product bedacht in maart mag in juni gemaakt
-- worden. Als zijn venster aanbreekt, pakt de nachtelijke taak de bovenste N en
-- maakt er een bestelling van. Er komt geen mens aan te pas.
--
-- En het houdt sterker vast dan een voorstel van ons, want het is zijn eigen
-- werk: opzeggen betekent zijn eigen lijst weggooien.
--
-- `position` en geen created_at-sortering: de klant mag slepen. Gaten in de reeks
-- zijn toegestaan en worden niet opgeruimd — hernummeren bij elke verplaatsing is
-- een UPDATE over de hele lijst voor een volgorde die toch alleen relatief telt.
CREATE TABLE IF NOT EXISTS plan_queue (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  -- Hoe de klant het product noemt. Hetzelfde veld als `product_pN` in
  -- details_json bij een losse bestelling, en het reist bij het aanmaken van de
  -- bestelling ook naar diezelfde sleutel.
  name             TEXT NOT NULL,
  note             TEXT,
  -- De batch met de foto's die er al bij horen, als de klant ze vooruit heeft
  -- geüpload. Dezelfde vorm als `orders.upload_batch`. Leeg betekent: nog geen
  -- foto's, en dan slaat de nachtelijke taak dit item over met een mail naar de
  -- KLANT — niet naar Lucas. Zie §7 van ABONNEMENT-ONTWERP.md.
  upload_batch     TEXT,
  -- Zodra hij is opgepakt: naar welke bestelling. Niet verwijderen maar
  -- markeren, want een klant hoort te kunnen zien wat er met zijn item gebeurd
  -- is, en een verdwenen rij is niet te onderscheiden van een rij die er nooit
  -- was.
  order_id         INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  taken_at         TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Wat de nachtelijke taak leest: de open items van één klant, op volgorde.
CREATE INDEX IF NOT EXISTS idx_queue_open
  ON plan_queue(customer_id, position)
  WHERE taken_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- DE AFSCHRIJVINGEN
-- ══════════════════════════════════════════════════════════════════════════════
--
-- ── WAAROM DIT NIET IN `payments` STAAT — 17 AUGUSTUS 2026 ───────────────────
--
-- Eerst wél. recordSubscriptionPaid() schreef de afschrijving in `payments` met
-- `order_id = NULL`, want er is geen bestelling. Twee dingen bleken daar mis mee,
-- en het tweede is een storing die niemand had gezien:
--
--   1 · `payments.order_id` is NOT NULL. Elke abonnementsbetaling zou dus zijn
--       geweigerd door de database. En de catch eromheen liet alles door met het
--       woord "constraint" erin, dus "NOT NULL constraint failed" werd stil
--       ingeslikt: het saldo werd toegekend, de betaling verdween, en er was geen
--       enkel spoor van geld dat wél was ontvangen.
--   2 · Zelfs mét die kolom nullable was de rij vanaf de klant onvindbaar — geen
--       order_id en geen customer_id — dus miste handleCustomerWipe() hem. Een
--       abonnee die om verwijdering vroeg, hield zijn betaalrijen.
--
-- De oplossing was eerst `payments` ombouwen. Dat is de duurste weg: een tabel met
-- financiële rijen herbouwen (nieuwe tabel, kopiëren, droppen, hernoemen) is de
-- soort migratie waarbij een halve mislukking betaalhistorie kost, en migrate.mjs
-- slaat hem daarom terecht standaard over. Voor iemand die alleen werkt, is dat
-- geen kleine kans die je aanvaardt.
--
-- Dus een eigen tabel. Een abonnementsafschrijving heeft ook echt een andere vorm
-- dan een bestelbetaling: geen bestelling, wél een maand en een mandaat. Wat ze
-- delen — bedrag, status, het Mollie-kenmerk — is drie kolommen, en die drie
-- dubbel hebben is goedkoper dan de ombouw.
--
-- `raw_payload` DRAAGT GEEN PERSOONSGEGEVENS. Zie payloadZonderPersoon() in
-- functions/api/webhook/mollie.js: het paymentobject van Mollie bevat bij iDEAL en
-- bij een SEPA-incasso de naam en het IBAN van de betaler, en dat werd bewaard
-- zonder dat iets het ooit las. Er gaat nu een toelatingslijst overheen.

CREATE TABLE IF NOT EXISTS subscription_payments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id  INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Het betaalkenmerk van Mollie. UNIEK, en dat is de idempotentiepoort: Mollie
  -- levert dezelfde melding desnoods drie keer af, en twee keer saldo toekennen is
  -- twaalf producten weggeven. Dezelfde vorm als bij `payments.external_id`.
  external_id      TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL,
  amount_cents     INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'EUR',

  -- De maand waarvoor deze afschrijving was, als 'YYYY-MM'. Staat er zodat een
  -- overzicht van betaalde maanden geen JSON hoeft te lezen.
  month            TEXT,

  raw_payload      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subpay_sub ON subscription_payments(subscription_id, month);
