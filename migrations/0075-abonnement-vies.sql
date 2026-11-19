-- ══════════════════════════════════════════════════════════════════════════════
-- 0075 · HET VIES-RAADPLEGINGSNUMMER VAN EEN ABONNEMENT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- levering 118 (17 november 2026, proefronde P5-11). Een bestelling met verlegde btw
-- draagt het raadplegingsnummer van VIES (orders.vat_consultation, op de factuur en in
-- de ICP-opgaaf). Een abonnement niet: src/lib/subscribe.js kreeg het nummer bij het
-- afsluiten wel van VIES (btw.consultation), maar schreef het nergens weg. De factuur
-- van een vooruitbetaald jaar van €16.900 met 0% verlegd had daardoor geen bewijs.
--
-- `vat_consultation`  het raadplegingsnummer van VIES bij het afsluiten, alleen bij een
--                     verlegd abonnement. snapshotFromSubscription() in src/lib/invoice.js
--                     zet het op elke termijnfactuur; leeg = zoals voorheen.
--
-- Alleen toevoegend. Veilig om twee keer te draaien: een tweede keer geeft
-- "duplicate column", en dat vangt scripts/migrate.mjs op.

ALTER TABLE subscriptions ADD COLUMN vat_consultation TEXT;
