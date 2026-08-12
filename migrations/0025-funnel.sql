-- VISUAILS — meten waar iemand het bestelformulier verlaat.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- WAAROM DEZE TABEL ER KOMT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Er is Cloudflare Web Analytics (src/layouts/Layout.astro), en dat geeft
-- paginabezoeken. Het bestelformulier is één pagina met vijf stappen die met
-- JavaScript worden gewisseld — geen enkele stapwissel is dus een paginabezoek,
-- en er was geen enkele gebeurtenis op stap 1 tot 5 of op de proefaanvraag.
--
-- Netto: van iedereen die aan een bestelling begon, was alleen bekend wie hem
-- ook afmaakte. Wie op stap 3 wegliep, liet geen spoor na. Adverteren naar een
-- formulier van vijf stappen zonder te weten bij welke stap mensen weglopen, is
-- het budget uitgeven om niets te leren.
--
-- ── WAT ER IN KOMT, EN WAT NADRUKKELIJK NIET ─────────────────────────────────
--
-- Vier kolommen die samen de sleutel zijn, en één teller. Geen bezoeker, geen
-- sessie, geen ip, geen tijdstip preciezer dan de dag. Er is dus niets in deze
-- tabel dat naar een persoon leidt, ook niet in combinatie — het is één getal
-- per dag per stap per dienst per taal, en daarmee is dit geen persoonsgegeven.
--
-- Dat is een ontwerpkeuze en geen bezuiniging. De vraag die Lucas heeft is "bij
-- welke stap lopen mensen weg", en die vraag heeft geen enkel gegeven over een
-- individu nodig. Zodra er wél een bezoeker-id bij zou staan, is dit een
-- tracker: dan hoort er een cookiebanner-categorie bij, moet het in het
-- privacybeleid en in het verwerkingsregister, en wordt een simpele teller een
-- juridisch onderwerp. Het antwoord wordt er niet beter van.
--
-- DE PRIJS DAARVAN, EERLIJK OPGESCHREVEN: zonder bezoeker-id kan één persoon
-- meer dan één keer geteld worden. Wie het formulier herlaadt en opnieuw tot
-- stap 3 komt, staat twee keer op stap 1, 2 en 3. De verhouding tussen de
-- stappen — en dat is waar het om gaat — blijft daardoor bruikbaar; het absolute
-- aantal is een bovengrens en geen bezoekersaantal. Wie later een echt
-- bezoekersaantal wil, kijkt in Web Analytics, want die meet de paginabezoeken
-- die hier ontbreken.
--
-- ── WAAROM DIT NIET ONGELIMITEERD GROEIT ─────────────────────────────────────
--
-- De sleutel bestaat uit vier waarden die allemaal een korte, gesloten lijst
-- zijn: de dag, zes diensten, twee talen en ten hoogste acht stappen. Dat is
-- maximaal ~96 rijen per dag en in de praktijk een handvol. Er hoeft dus geen
-- opruimtaak bij, en dat is met opzet: een nachtelijke taak die iets weggooit,
-- is een nachtelijke taak die iets kan wéggooien.
--
-- Het endpoint (functions/api/step.js) weigert een stap, dienst of taal die niet
-- in die lijsten staat. Dat is niet alleen netheid: zonder die controle kan
-- iemand met een script willekeurige waarden posten en groeit de tabel wél
-- ongelimiteerd. De getallen zijn met een script te vervuilen — dat is de prijs
-- van meten zonder identificatie — maar de tabel niet.

CREATE TABLE IF NOT EXISTS funnel_hits (
  -- 'YYYY-MM-DD' in UTC. De dag en niet het uur: een uurverdeling is een
  -- andere vraag dan deze tabel beantwoordt, en zou de sleutel 24× zo groot
  -- maken voor een antwoord dat niemand heeft gevraagd.
  day   TEXT NOT NULL,
  -- De wire-waarde uit orders.service: 'catalog' | 'lifestyle' | 'video' |
  -- 'custom' | 'test-sample' | 'drop'. Dezelfde verzameling als ORDER_SERVICES
  -- in functions/api/order.js, zodat een trechter per dienst naast de
  -- bestellingen per dienst te leggen is.
  flow  TEXT NOT NULL,
  -- 'en' | 'nl'. Een trechter die in één taal veel slechter loopt, is een
  -- tekstprobleem en geen formulierprobleem, en dat verschil wil je zien.
  lang  TEXT NOT NULL,
  -- 1..8. Vijf bij de bestelstroom, vier bij de proefvisual; de ruimte tot acht
  -- staat er zodat een zesde stap geen migratie kost.
  step  INTEGER NOT NULL,
  hits  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, flow, lang, step)
);

-- De enige vraag die het adminscherm stelt is "de laatste N dagen, per stap",
-- en die leest op `day` aflopend. De primaire sleutel begint met `day`, dus die
-- index bestaat al — een tweede erbij zou een kopie zijn.
