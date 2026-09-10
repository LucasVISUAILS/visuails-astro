-- VISUAILS — proefbestellingen apart houden, 10 september 2026.
--
-- Lucas: *"Ik wil namelijk nog test bestellingen doen omdat niet alles nog
-- klopt en visuails studio ook nog vaker getest moet worden."* Terecht — maar
-- één ding van zo'n proefbestelling is niet terug te draaien: het
-- factuurnummer. Zie de kop van src/lib/invoice.js: een nummer wordt uitgegeven
-- en nooit meer teruggegeven, want een gat in de reeks leest bij een controle
-- als een verdwenen factuur. Twintig proefbestellingen zijn dus twintig echte
-- facturen in de boekhouding, en de eerste échte klant begint op nummer 21.
--
-- WAAROM DE STAND WORDT OPGESLAGEN EN NIET AFGELEID
-- De stand komt van het voorvoegsel van de Mollie-sleutel (isTestmodus() in
-- src/lib/mollie.js). Die sleutel verandert straks in een `live_`-sleutel, en
-- vanaf dat moment zou "is dit een proefbestelling?" voor ELKE oude bestelling
-- ineens 'nee' antwoorden. Wat een bestelling wás op het moment dat ze werd
-- aangenomen, verandert nooit meer — dezelfde reden waarom een factuur een
-- momentopname bewaart in plaats van de prijslijst opnieuw te lezen.
--
-- 0 EN NIET NULL ALS STANDAARD. Elke rij die er al staat is van vóór deze
-- migratie en dus uit de tijd dat er geen onderscheid was. Die als 'onbekend'
-- markeren zou betekenen dat er een derde stand bestaat waar niemand iets mee
-- kan; ze horen bij de echte reeks, want hun nummers zijn al uitgegeven.
ALTER TABLE orders ADD COLUMN testmodus INTEGER NOT NULL DEFAULT 0;

-- Ook op de factuur zelf, zodat /admin en Studio niet hoeven te joinen om te
-- weten wat voor document ze in handen hebben — en zodat het waar blijft als de
-- bestelling ooit wordt opgeruimd terwijl de factuurrij blijft staan.
ALTER TABLE invoices ADD COLUMN testmodus INTEGER NOT NULL DEFAULT 0;

-- Een abonnement dat in testmodus is afgesloten, is net zo goed een proef — en
-- juist daar wil Lucas veel testen (het vooruitbetaalde jaar). De factuur van
-- een abonnementstermijn leest deze kolom, zodat een proefabonnement nooit een
-- nummer uit de echte reeks trekt.
ALTER TABLE subscriptions         ADD COLUMN testmodus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_invoices ADD COLUMN testmodus INTEGER NOT NULL DEFAULT 0;

-- Een creditnota erft de stand van de factuur die hij crediteert. Geen eigen
-- bron dus, en dat is met opzet: een creditnota op een proeffactuur kán niet
-- echt zijn, en een die dat wél beweert zou een negatief bedrag in een echte
-- boekhouding zetten dat nergens vandaan komt.
ALTER TABLE credit_notes ADD COLUMN testmodus INTEGER NOT NULL DEFAULT 0;

-- Alleen de proefbestellingen, want dat is de enige kant die bevraagd wordt: de
-- lijst in /admin filtert ze weg en de opruimknop zoekt ze op. Een gewone index
-- op de hele kolom zou vrijwel alleen nullen bevatten en niets versnellen.
CREATE INDEX IF NOT EXISTS idx_orders_proef ON orders(testmodus) WHERE testmodus = 1;
