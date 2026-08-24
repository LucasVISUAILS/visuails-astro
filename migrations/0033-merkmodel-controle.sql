-- ═══════════════════════════════════════════════════════════════════════════════
-- 0033 · HET UNICITEITSLOGBOEK VAN EEN MERKMODEL
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ── WAT ER ONTBRAK, EN WAAROM DAT NU PAS EEN PROBLEEM IS ────────────────────
--
-- src/data/modelChecks.js houdt bij of elk gezicht uit de vaste roster door de
-- zoekmachines is gehaald, en zegt in zijn eigen kop wat er met een merkmodel
-- moet gebeuren:
--
--   "Dit logboek gaat over de vaste roster in models.js. Een merkmodel wordt per
--    klant gemaakt en bestaat op het moment van deze controle nog niet, dus die
--    hoort bij de levering gecontroleerd te worden en op de order te worden
--    vastgelegd — niet hier."
--
-- Die vastlegging bestond niet. Zolang een merkmodel een gesprek was en er geen
-- bedrag op stond, was dat een gat in de administratie. Sinds 23 augustus 2026
-- staat er een prijs op, staat er een afrekenknop onder, en doet /custom-models
-- en de voorwaarden er een BELOFTE bij: blijkt een gezicht toch op een bestaand
-- mens te lijken, dan wisselen wij op onze kosten alle bestelde content om.
--
-- Een garantie zonder logboek is een zin. Bij een claim is de vraag niet "wat
-- weet je nu" maar "wat wist je toen": welke zoekmachines heb je gedraaid, op
-- welke dag, met welke uitslag, en wie heeft dat gedaan. Dat is precies wat deze
-- vijf kolommen bewaren.
--
-- ── VIJF KOLOMMEN OP `orders` EN GEEN EIGEN TABEL ───────────────────────────
--
-- Een eigen tabel zou meerdere controles per bestelling toelaten, en dat klinkt
-- grondiger dan het is. Er is precies één gezicht per merkmodelbestelling en er
-- is precies één moment waarop het gecontroleerd wordt: vlak voor levering. Een
-- tweede ronde is een nieuwe controle van hetzelfde gezicht, en dan hoort de
-- laatste stand op de bestelling te staan — niet een lijst waaruit de lezer moet
-- afleiden welke telt.
--
-- Wat er wél verloren gaat, is de geschiedenis van een hercontrole. Die staat
-- niet nergens: het adminscherm schrijft elke vastlegging óók als regel in
-- `order_events`, en dat is de tijdlijn die er sowieso al is.
--
-- ── GEEN CHECK-CONSTRAINT OP DE UITKOMST ────────────────────────────────────
--
-- Verleidelijk: CHECK (model_check_result IN ('geen-treffer','treffer')). Niet
-- gedaan, en om dezelfde reden als bij `payer_kind` in migratie 0024 — de
-- toegestane waarden staan in JS (src/data/modelChecks.js), en een tweede kopie
-- in SQL is een tweede plek die moet meebewegen. SQLite kan een CHECK bovendien
-- niet wijzigen zonder de tabel opnieuw te bouwen, en dat is op een tabel met
-- echte bestellingen erin geen migratie die je op een vrijdagavond draait.
--
-- De schrijver is het adminscherm en niemand anders; die kent de lijst.
--
-- ── NULL IS HET EERLIJKE BEGINPUNT ──────────────────────────────────────────
--
-- Alle vijf beginnen leeg, ook op bestellingen die er al zijn. Dat is dezelfde
-- keuze die modelChecks.js voor de vaste roster maakt en om dezelfde reden: een
-- logboek dat vooraf is ingevuld met "geen treffer" is geen logboek maar een
-- verzinsel, en dit verzinsel zou in een geschil worden aangehaald.

-- Wanneer de controle gedraaid is. 'YYYY-MM-DD', de dag en niet het tijdstip:
-- de zoekopdrachten lopen over een middag en de precisie van een tijdstempel zou
-- suggereren dat er één moment was.
ALTER TABLE orders ADD COLUMN model_check_at TEXT;

-- Welke zoekmachines er gebruikt zijn, als kommalijst van id's uit ENGINES in
-- src/data/modelChecks.js. Een lijst en geen booleans per machine: wie er een
-- toevoegt, voegt een id toe en niet een kolom.
ALTER TABLE orders ADD COLUMN model_check_engines TEXT;

-- 'geen-treffer' of 'treffer'. Zie de noot hierboven over de ontbrekende CHECK.
ALTER TABLE orders ADD COLUMN model_check_result TEXT;

-- Wie het gedaan heeft. Een logboek zonder naam is een gerucht — de formulering
-- komt uit modelChecks.js en geldt hier woord voor woord.
ALTER TABLE orders ADD COLUMN model_check_by TEXT;

-- Vrij veld. Bij een treffer: wat er gevonden is en wat ermee gedaan is.
ALTER TABLE orders ADD COLUMN model_check_note TEXT;

-- Waar dit voor gebruikt wordt: "welke merkmodellen wachten nog op hun
-- controle". Deelindex, want elke andere bestelling is hier niet interessant en
-- een volledige index op een kolom die bij 99% van de rijen leeg is, is bijna
-- helemaal lucht.
CREATE INDEX IF NOT EXISTS idx_orders_modelcheck
  ON orders(created_at) WHERE service = 'brand-model' AND model_check_at IS NULL;
