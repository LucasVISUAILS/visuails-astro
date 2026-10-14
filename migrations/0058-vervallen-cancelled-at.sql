-- ══════════════════════════════════════════════════════════════════════════════
-- 0058 · VERVALLEN BESTELLINGEN KRIJGEN HUN ANNULERINGSDATUM
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 8 oktober 2026, punt 9.01 (§17.22). Alleen data, geen nieuwe kolom.
--
-- De nachttaak die een onbetaalde bestelling laat vervallen (cancelStaleApprovals
-- in cron/index.js) zette `status = 'cancelled'` zonder `cancelled_at`. Handmatig
-- annuleren in /admin en de Mollie-webhook zetten die datum wél. Sinds vandaag doet
-- de nachttaak het ook; deze migratie geeft de bestellingen die al vervallen zijn
-- hun datum eenmalig alsnog.
--
-- WAAROM HET UITMAAKT: de purge (EXPIRED_FILES_SQL in src/lib/retention.js) wist
-- de foto's van een geannuleerde bestelling 90 dagen na `cancelled_at`, en valt
-- zonder die datum terug op `created_at`. Een vervallen bestelling verloor haar
-- foto's dus gerekend vanaf het bestellen in plaats van vanaf het vervallen. Draai
-- deze migratie daarom VÓÓR de purge aan gaat (9.03).
--
-- WELKE DATUM: die van de tijdlijnregel 'cancelled' die bij het vervallen is
-- geschreven (order_events). Dat is het echte moment. Staat er geen zo'n regel,
-- dan blijft de kolom leeg en verandert er voor die bestelling niets — liever geen
-- datum dan een verzonnen datum.
--
-- Veilig om twee keer te draaien: hij raakt alleen rijen waar `cancelled_at` nog
-- leeg is.

UPDATE orders
   SET cancelled_at = (
         SELECT MAX(e.created_at) FROM order_events e
          WHERE e.order_id = orders.id AND e.status = 'cancelled'
       )
 WHERE status = 'cancelled'
   AND cancelled_at IS NULL
   AND EXISTS (SELECT 1 FROM order_events e WHERE e.order_id = orders.id AND e.status = 'cancelled');
