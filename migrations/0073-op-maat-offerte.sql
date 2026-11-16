-- ══════════════════════════════════════════════════════════════════════════════
-- 0073 · OP MAAT: DE OFFERTE MET BETAALLINK
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 15 november 2026. Lucas: "Ik wil daar alles kunnen invullen en dan gelijk de
-- offerte en betaallink kunnen opsturen." De studio stuurt de offerte vanuit
-- /admin; de klant drukt in Studio op Akkoord of Iets aanpassen. Bij akkoord wordt
-- het een gewone bestelling (een aanbetaling van de helft) en gaat de betaallink
-- vanzelf naar het mailadres van de offerte. Alleen toevoegend: elf kolommen op
-- `maat_offertes`. Zie src/lib/opMaatOfferte.js.
--
-- `email`              waar de offerte en de betaallink heen gaan (standaard het
--                      adres van het account; in /admin aan te passen)
-- `land`, `btw_nummer` zoals de studio ze bij de offerte zette
-- `btw_behandeling`    nl_standard, eu_reverse_charge of outside_scope (vatDecision)
-- `btw_tarief`         0.21 of 0
-- `vies_raadpleging`   het raadplegingsnummer van VIES bij een verlegde offerte
-- `verstuurd_op`       wanneer de offerte naar de klant ging
-- `order_id`           de bestelling die bij het akkoord ontstond
-- `aanpassing`, `aanpassing_op`  wat de klant aan de offerte anders wil
-- `link_op`            wanneer de betaallink werkelijk de deur uit ging
--
-- Veilig om twee keer te draaien: een tweede keer geeft "duplicate column", en
-- dat vangt scripts/migrate.mjs op zoals bij elke ALTER TABLE ADD COLUMN.

ALTER TABLE maat_offertes ADD COLUMN email TEXT;
ALTER TABLE maat_offertes ADD COLUMN land TEXT;
ALTER TABLE maat_offertes ADD COLUMN btw_nummer TEXT;
ALTER TABLE maat_offertes ADD COLUMN btw_behandeling TEXT;
ALTER TABLE maat_offertes ADD COLUMN btw_tarief REAL;
ALTER TABLE maat_offertes ADD COLUMN vies_raadpleging TEXT;
ALTER TABLE maat_offertes ADD COLUMN verstuurd_op TEXT;
ALTER TABLE maat_offertes ADD COLUMN order_id INTEGER;
ALTER TABLE maat_offertes ADD COLUMN aanpassing TEXT;
ALTER TABLE maat_offertes ADD COLUMN aanpassing_op TEXT;
ALTER TABLE maat_offertes ADD COLUMN link_op TEXT;
