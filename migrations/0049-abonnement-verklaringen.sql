-- ══════════════════════════════════════════════════════════════════════════════
-- 0049 · DE ZAKELIJKE VERKLARING EN DE HERROEPINGSVERKLARING OP EEN ABONNEMENT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Gevonden op 19 september 2026, bij de doorlichting van de klantreis.
--
-- Het bestelformulier vraagt sinds augustus twee vinkjes: "ik bestel voor een
-- bedrijf" (src/data/business.js) en "jullie mogen beginnen vóór de bedenktijd
-- voorbij is" (src/data/consent.js), en bewaart de VERSIE van de tekst waarbij
-- het vinkje is gezet in orders.details_json. Het abonnementsformulier
-- (/start/plan) vroeg geen van beide — terwijl dat het formulier is dat in een
-- doorlopende machtiging eindigt.
--
-- Een abonnement heeft geen details_json. Twee kolommen dus, met dezelfde
-- inhoud als op een bestelling: de versietekst van de verklaring (bijv.
-- 'business-v1-2026-08'), of NULL voor abonnementen van vóór deze migratie.
-- Het bewijs is niet "er is een vinkje gezet" maar "er is een vinkje gezet bij
-- DEZE tekst"; zie de noot in src/data/business.js.
--
-- functions/api/plan.js schrijft ze na createSubscriptionRow() met een aparte
-- UPDATE, zodat een database waar deze migratie nog niet op gedraaid is, het
-- abonnement gewoon aanmaakt en alleen de verklaring niet bewaart (en dat
-- logt).

ALTER TABLE subscriptions ADD COLUMN business_declaration TEXT;
ALTER TABLE subscriptions ADD COLUMN withdrawal_consent   TEXT;
