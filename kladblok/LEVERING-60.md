# Levering 60 — de complete look (17 oktober 2026)

Uit afvinklijst 38: alle 18 kaarten op "doen", en de vragen v38-beelden a, v38-prijs a, v38-max a, v38-credits a en
v38-set a. Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 56 tot en met 59 gaan mee: die staan nog
niet live (de laatste regel in uitrol-log.txt is van 08:35).

## 1. Wat een look is

- Een look koppelt **twee of drie producten uit dezelfde lifestylebestelling**. Eén model draagt ze, op één plek.
- Elk stuk telt als product mee in de prijstrap en houdt zijn vier beelden. In de beelden op het model draagt
  het de hele look; de uitsnede volgt het stuk.
- Per look **€50**, of hij nu twee of drie stukken heeft (v38-prijs a). Met credits **4 per look**
  (v38-credits a).
- Per look **twee beelden erbij**: van top tot teen van voren, en de stukken samen zonder model (v38-beelden a).
- **Geen maximum aantal looks.** Elk stuk zit in hooguit één look (v38-max a).
- Een look heeft **hooguit drie stukken**.
- Een stuk komt **alleen op een plek die past**: een top op Top, een broek op Broek. Twee broeken in één look kan
  dus niet. Twee tops wel, als de ene de laag onder de andere is (Eronder).
- Een set onder één artikelnummer is gewoon **één product**, zonder toeslag (v38-set a). Dat staat in de uitleg.
- **Catalog en de €1-proef hebben geen looks.**

De regels staan op één plek, `src/data/looks.js`. Het formulier, de server, /admin, de werkmap, de agenda,
Studio, de mail en de factuur lezen die allemaal.

## 2. Het formulier

**Stap 1 (c-stap1).**
- De keuzelijst "Zitten er outfits bij?" is weg.
- Onder het aantal staat één regel: *"Stukken die samen gedragen worden? Tel ze allemaal mee. Bij je foto's kies
  je welke samen een complete look zijn: €50 per look."*
- Het tekentje ervoor zijn twee vlakken met de snede van 53°.
- De uitleg waarom een look meer kost staat achter het vraagteken.
- Met credits staat er "4 credits per look".

**Stap 2, "Waarmee draagt het model dit?" (c-erbij).**
- Het blok staat onder de foto's van elk product, niet meer verstopt in "Meer over dit product".
- Per plek in het beeld (Schoenen, Top, Broek of rok, Eronder) zijn er drie keuzes, als één vorm met twee sneden:
  - **Wij kiezen**: effen, een andere toon, gratis.
  - **Eigen stuk** (gratis): pas dan verschijnt het vakje voor de foto.
  - **Uit je bestelling** (+ €50).
- Catalog heeft alleen de eerste twee.
- Bij "Uit je bestelling" staan alleen de producten die op die plek passen, met hun foto. Wat niet kan, staat uit
  met de reden: "Zit al in look A" of "Een look heeft hooguit drie stukken".
- Koppel je de hoodie aan de broek, dan staat de broek ook bij de hoodie. Je stelt een look één keer samen.

**Toevoegen (c-toevoegen).**
- Het laatste kaartje is "Schoenen toevoegen" (of een top, of een broek), met de prijs ernaast.
- Eén tik zet er een product bij. Dat product krijgt de juiste soort en zit meteen in de look.
- Het aantal en het totaal lopen mee, en je blijft bij het product waar je was.

**De look in beeld (c-look).**
- Onder de plekken staat de kaart van de look: "Look A · 3 stukken", wat je krijgt, "Hoe draag je het?" (mag leeg)
  en "Haal de look uit elkaar".
- De productknoppen bovenaan worden één vorm met de snede ertussen, onder LOOK A.
- In "Wat je krijgt" staat een regel per look en de rij "Complete looks 1 × €50". De beelden gaan van 12 naar 14.

**Telefoon (c-telefoon).** De drie keuzes staan onder elkaar, 48 px hoog. De rest volgt de werkplaats.

**Opgeslagen en hersteld.** Een concept bewaart wat er per plek gekozen is en welke stukken samen een look zijn.

**Nog een fout, onderweg gevonden.**
- "Nog een product toevoegen" in stap 2 zette wel het aantal maar niet het getalveld in stap 1.
- Wie terugging, zag daar het oude aantal. Het veld volgt nu de keuzelijst.

## 3. De server en wat er achter verandert

**/api/order.**
- Het formulier post `look_pN` (de letter), `context_<plek>_pN` met de derde waarde `look`, en
  `look_notitie_<letter>`.
- De server controleert alles opnieuw. Wat niet klopt (twee broeken, één stuk, een catalogbestelling) valt stil
  weg, met een regel in de log. De letters gaan op volgorde van het eerste product.
- De prijs komt uit de looks die overblijven.

**De fouten uit d-fouten.**
- De server rekende de oude €50 ook op een catalogbestelling als het veld meekwam. Dat kan niet meer: looks tellen
  alleen bij lifestyle.
- Een oud formulier dat `outfit_count` nog post, betaalt daar niets voor. Het veld gaat het dossier niet meer in.
- Een look valt niet meer stil terug als je het aantal verlaagt. Haal je een product weg, dan gaat alleen dat stuk
  uit zijn look.

**Credits.** Een complete look kan met credits, 4 per look. Tot nu toe ging dan de hele bestelling via Mollie.

**/admin (d-werk).**
- "Wat de klant koos" heeft een regel per look.
- De brief van elk stuk zegt "Complete look met p1 Hoodie…" en welke plek uit de look komt.
- Op het bord staat elke look als eigen rij, "Look A", met de stukken, de notitie, *"Maak eerst het lookbeeld;
  de beelden van de stukken volgen daaruit"* en de twee vakjes van de look.
- Uploaden, indelen, vervangen en melden kennen de look. In de bestanden heet hij `lA`. Een bestandsnaam met
  `-lA-van-top-tot-teen` herkent het bord vanzelf.

**De werkmap (d-werk).**
- Er is een map per look, `lA - Look A`, met een eigen `_briefing.txt`:
  - de stukken, met hun map;
  - de werkwijze;
  - het ene gezicht voor de hele look (dat van het eerste stuk);
  - de notitie.
- In `_aangeleverd/` staan de foto's van de klant van álle stukken. Daarnaast zijn er de twee vakken
  `1 van-top-tot-teen [look-geheel]` en `2 stukken-samen [look-samen]`. "Map uploaden" leest ze terug.
- De briefing van elk stuk noemt de look en zegt: eerst het lookbeeld.

**De agenda.** Een look telt als een half product, dus twee van de vier beelden.

**Studio en de privélink (d-studio).**
- De stukken van een look staan na elkaar, met direct daarachter de map "Look A" met de twee lookbeelden.
- Bij elk stuk staat "In look A". Bij de map staat "Complete look met Hoodie, Broek en Sneaker".
- In de zip staat een map `Look A`.

**De bevestiging, de studiomail en de factuur.** Per look staat er een regel: *"Complete look A · Hoodie zwart,
Wijde broek, Sneaker zwart · €50"*. De factuur zet die regels onder de omschrijving.

**Kopiëren (d-kopie).**
- "Opnieuw bestellen met alle instellingen" neemt de indeling mee: welke plaatsen samen een look zijn.
- Dat gebeurt alleen als het aantal ook meegaat, zoals je in lijst 36 koos.
- Zodra je de soorten invult, staat de look er weer. Elke look blijft los te maken.

**Eén verhaal op de site (d-teksten).**
- De FAQ, /pricing en /lifestyle zeggen het nu op dezelfde manier: *"€50 per look, bovenop de stukken. Elk stuk
  houdt zijn eigen beelden."*
- De zin "vink het aan in het bestelformulier" is weg.

## 4. Gemeten en nagekeken

- Contrast ≥ 4,5:1 en tekst ≥ 11,5 px voor elk nieuw tekstje (15 soorten), in een echte browser.
- Het voorbeeld uit lijst 38 klopt met het echte formulier:
  - hoodie, broek en sneaker zijn 3 × €109 + €50 = **€377**, met 14 beelden;
  - tien stukken in drie looks zijn **€790**.
- Nagekeken in beeld op 1440 en 390: stap 1, stap 2 met en zonder look, en het bord in /admin met een look.

## 5. Toetsen

- **Nieuw: test:looks** (74 controles). Het dekt:
  - de regels en `schoonLooks`;
  - de prijs, de credits en de agenda;
  - /api/order, ook met een oud of zelfgebouwd formulier;
  - de werkmap, de zip, het bord, Studio, de factuur, het kopiëren en de woorden.
- **Nieuw: test:looks-browser** (63 controles). Het speelt het hele formulier na in een echte browser.
- **Aangepast aan de nieuwe keuzes:** creditboek, credits-bestellen, herbestel, kopie-browser, stap2-kaart-browser,
  garments, scaffold, model-per-product, bedragen, reference-photos, concept-resten en doorloop-27b.
- Testreeks 265/265.

## Bestanden

- **Nieuw:** src/data/looks.js, tests/looks.test.mjs, tests/looks-browser.test.mjs.
- **Veranderd, de regels en de bedragen:** src/data/pricing.js, creditKosten.js, capacity.js, levervakken.js,
  garments.js; src/lib/quote.js; functions/api/order.js.
- **Veranderd, het formulier:** src/components/order/OrderFlow.astro, BestelOverzicht.astro, src/scripts/pipeline.js,
  src/styles/werkplaats.css.
- **Veranderd, wat erachter zit:** src/lib/admin.js, scaffold.js, delivery.js, account.js, portal.js, invoice.js,
  invoicePdf.js, herbestel.js; public/admin.css.
- **Veranderd, de teksten:** src/data/faq.js, tips.js; src/components/PricingHal.astro, LifestyleHal.astro.
- **Veranderd, de rest:** package.json, de toetsen hierboven, tests/drive-start.mjs, kladblok/COMMIT-BERICHT.txt.

## Nog open

- **De leverdatum.** Vanaf 10 producten telt de agenda een look als een half product bij wat er al geboekt is. De
  datum die een nieuwe bestelling krijgt aangeboden, rekent nog alleen met het aantal producten. Het verschil is
  hooguit een half product per look. Zeg het als je het daar ook in wilt.
- **Voor de lancering:**
  - Workers Paid ($5 per maand);
  - SUB-YM3O-MYF en SUB-PFDC-8X6 opzeggen;
  - Mollie op live;
  - de sleutels van Turnstile;
  - de rooktest van €1,21.
