-- VISUAILS — de betaalherinnering, 4 september 2026.
--
-- Een bestelling die drie dagen onbetaald staat krijgt één herinnering met een
-- verse betaallink (cron/index.js, remindUnpaid). Eén, en dus een stempel: wie
-- de mail heeft gehad, krijgt hem niet nog een keer als de taak de volgende
-- nacht weer draait. NULL = nog niet herinnerd.
ALTER TABLE orders ADD COLUMN payment_reminder_at TEXT;
