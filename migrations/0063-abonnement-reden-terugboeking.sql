-- ══════════════════════════════════════════════════════════════════════════════
-- 0063 · WAAROM IEMAND STOPT, EN EEN TERUGGEBOEKTE BETALING
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, ronde B (punten 2.07 en 8.11). Alleen nieuwe kolommen, alle
-- leeg op bestaande rijen; niets wordt omgezet.
--
-- 1 · subscriptions.stop_reden / stop_toelichting — Lucas bij 2.07: "Ook bij
--     het opzeggen of pauzeren een reden laten opgeven zodat ik weet wat het
--     probleem is." De vaste code van de laatste keuze (pauze of opzegging,
--     zie src/lib/stopReden.js) en bij "anders" de eigen woorden van de klant.
--     De status van het abonnement zegt of het een pauze of een opzegging was.
--     /admin toont beide op de klantpagina; de studiomail noemt ze ook.
-- 2 · subscriptions.pauze_vraag_at — V42 = b: een pauze duurt hoogstens 3
--     maanden, daarna één mail "hervatten of opzeggen?". Dit is wanneer die mail
--     ging, zodat de nachttaak hem één keer stuurt en niet elke nacht. Hervatten
--     maakt hem weer leeg (een volgende pauze krijgt weer een vraag).
-- 3 · orders.teruggeboekt_at — 8.11: een betaling die via de bank is
--     teruggeboekt (chargeback of storno). Gezet door de Mollie-webhook, leeg
--     als Mollie de terugboeking terugdraait. /admin toont dan de rode pil
--     "Betaling teruggeboekt — niet leveren".
-- 4 · customer_style_locks.bron_order_id — 2.08: de vaste look vult zichzelf
--     na de eerste betaalde bestelling per dienst (als hij nog leeg is). Dit is
--     die bestelling, zodat Studio zegt "Overgenomen uit VIS-… (3 okt)". Leeg
--     als de klant de look zelf koos.
--
-- Een gepauzeerd abonnement waarvan de pauze nog niet is ingegaan (Lucas: "gaat
-- in vanaf de volgende maand die hij betaalt") heeft geen eigen kolom nodig:
-- `paused_at` draagt dan de datum waarop de pauze ingaat (de dag van de
-- volgende afschrijving), en die ligt in de toekomst.
--
-- De bevroren credits van een teruggeboekte termijn staan in credit_boek
-- (migratie 0061) als regels 'bevroren' en 'vrijgegeven'; daar is geen kolom
-- voor nodig.
--
-- Zoals elke migratie met een nieuwe kolom: de tweede keer draaien valt om op
-- "duplicate column"; dan is alles al gedaan.

ALTER TABLE subscriptions ADD COLUMN stop_reden TEXT;
ALTER TABLE subscriptions ADD COLUMN stop_toelichting TEXT;
ALTER TABLE subscriptions ADD COLUMN pauze_vraag_at TEXT;
ALTER TABLE orders ADD COLUMN teruggeboekt_at TEXT;
ALTER TABLE customer_style_locks ADD COLUMN bron_order_id INTEGER;
