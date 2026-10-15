-- ══════════════════════════════════════════════════════════════════════════════
-- 0068 · OVERSTAPPEN NAAR EEN ANDER ABONNEMENT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- 15 oktober 2026, afvinklijst 29 (v29-overstap = a): een echte overstap per
-- volgende termijn. Alleen toevoegend: vijf kolommen op `subscriptions`.
--
-- Een overstap die klaarstaat, staat in de `overstap_`-kolommen; het abonnement
-- zelf (plan, amount_cents, slots_json) blijft tot de volgende termijn wat het
-- is. Mollie krijgt meteen het nieuwe bedrag (PATCH), zodat de volgende
-- afschrijving al klopt. De webhook zet de overstap om zodra de eerste betaling
-- binnenkomt die Mollie NA de aanvraag aanmaakte (overstapToepassen in
-- src/lib/subscription.js); een betaling die al onderweg was, telt nog voor het
-- oude plan.
--
-- `overstap_plan`        het nieuwe plan (starter, studio, brand of maat)
-- `overstap_cents`       het netto maandbedrag bij maat, anders NULL (zoals amount_cents)
-- `overstap_slots_json`  {"credits":N} bij maat, anders NULL (zoals slots_json)
-- `overstap_at`          wanneer de klant overstapte (UTC, ISO)
-- `overstap_van`         het plan waar hij vandaan kwam, voor /admin en de mail
--
-- Veilig om twee keer te draaien: een tweede keer geeft "duplicate column", en
-- dat vangt scripts/migrate.mjs op zoals bij elke ALTER TABLE ADD COLUMN.

ALTER TABLE subscriptions ADD COLUMN overstap_plan TEXT;
ALTER TABLE subscriptions ADD COLUMN overstap_cents INTEGER;
ALTER TABLE subscriptions ADD COLUMN overstap_slots_json TEXT;
ALTER TABLE subscriptions ADD COLUMN overstap_at TEXT;
ALTER TABLE subscriptions ADD COLUMN overstap_van TEXT;
