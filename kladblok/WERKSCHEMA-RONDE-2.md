# Werkschema — ronde 2, 23/24 september 2026

Bron van waarheid voor deze ronde. Na elke stap afvinken + in het logboek wat
er veranderd is en hoe het getest is. Loopt het gesprek vol: verder bij de
eerste open regel.

**Keuzes van Lucas:** (a) toets akkoord · (b) alle groepen bouwen, en daarna
een consistentieronde · (c) Hooks/Editions inkorten · (d) /about opent met
Lucas, maar framing opnieuw bekijken (niet "geen ervaring" vooropzetten) ·
proef: A (alleen betaalmethoden met betaler-identiteit) + B (KVK als extra
herkenning) · galerij met meerdere producten, compact, uitklapbaar, filter op
dienst (en productsoort als het rustig blijft), roze jeans als plaatshouder.

**Vaste regels:** stand in zijn map eerst (stage + cmp) · nooit committen of
pushen · prijzen via pricing.js · geen echt adres · geen logo's ontwerpen,
alleen herkleuren · 11,5 px leesvloer · KLEURENSCHEMA · "een specialist" ·
na elke CSS-wijziging eerst bouwen, dan testen · concept-map staat nog in
zijn map (bat nog niet gedraaid) — niet opnieuw leveren.

---

## A · Harde fouten eerst

- [x] A1 **Knoppen die je niet ziet of niet kunt lezen** — browserscan over
  alle pagina's (NL+EN, 1440+390): per knop tekst-contrast en of de knop
  zelf zichtbaar is (rand/vulling tegen de grond). Bekend: "Start a plan"
  op de voorpagina, "Before/After"-labels op het voor-en-na. Repareren in
  de bron (component/CSS), niet per pagina.
- [x] A2 **Oude geelgroene beelden en kleuren** — scan public/img (svg + png/
  webp op lime-tinten), CSS en componenten; o.a. de modelkiezer in het
  bestelformulier. Alleen herkleuren naar het huidige schema.
- [x] A3 **Proef A:** test-sample-betaling alleen met methoden die een
  betaler-identiteit geven (iDEAL, Bancontact, creditcard). **Proef B:**
  KVK-nummer als extra herkenning vóór de betaling. Tests.

## B · De pagina's volgens PAGINA-OPBOUW.md

- [x] B1 /about — opening "Ik ben Lucas." met nieuwe framing; fotostrook één rij; WhoItIsFor eruit
- [x] B2 /contact — geen grote modelfoto; direct contact met je naam
- [x] B3 /pricing — tabel eerst, laptop eruit, "wat er verder een tarief heeft" in 2 kolommen, band smal
- [x] B4 /plans — abonnementen eerst, laptop eruit
- [x] B5 **/start/plan (abonnement afsluiten)** — breder, rustiger, in één oogopslag: wat je krijgt, wat het kost, wat het voordeel is
- [x] B6 /catalog · /lifestyle · /video — bewijs naar voren, stijlen als strook, prijs in één regel, "drie stappen" eruit
- [x] B7 /custom-models — echt werk naar voren, kost + wat het is samen, richtingen als rij
- [x] B8 /how-it-works · /studio · /compare · /upload-guidelines
- [x] B9 /faq — categorieën als tabs
- [x] B10 /hooks · /editions — inkorten tot 5 blokken
- [x] B11 /start — Hooks/Editions-kaarten eruit, merkmodel één regel · /test-sample
- [x] B12 Stijlpagina's — raster alleen met beelden die er zijn
- [x] B13 **Consistentieronde** — slot overal twee knoppen, dezelfde openingsvorm, zelfde ritme; meten

## C · Galerij met meerdere leveringen

- [x] C1 Datamodel: lijst leveringen (dienst, productsoort, beelden), nu
  allemaal de roze jeans als plaatshouder
- [x] C2 Compacte kaart per levering (2 naast elkaar), uitklapbaar naar het
  volledige verloop (binnengekomen → gemaakt → map)
- [x] C3 Filter op dienst (+ productsoort, rustig: één rij, tweede als keuzemenu)
- [x] C4 "Alle beelden" blijft; tests

## D · Bestellen via WhatsApp → order door Lucas in /admin

- [x] D1 Uitzoeken wat er al is (betaallink.js, admin)
- [x] D2 Mening + bouwen wat ontbreekt

## E · Nacontrole en levering

- [x] E1 Verse build, volledige testreeks groen
- [x] E2 Knoppenscan opnieuw: 0 fouten · leesbaar · spatie · links · 320–1440
- [x] E3 Stage + cmp, leveren, verslag


## F · Wat nog open stond (na "heb je echt alles gedaan?")

- [x] F1 Consistentie gemeten (kladblok/_consistentie.mjs): opening zonder
  etiket op /how-it-works en /studio; opening van de video-stijlpagina's
  verticaal gecentreerd (kop 80 px lager dan elders); WhatsApp als tweede
  knop in de opening van alle stijlpagina's (dienstpagina's hebben dat niet
  meer); /upload-guidelines drie knoppen in de opening
- [x] F2 Lege vakken: Classic op /catalog met de echte set (roze jeans:
  jouw foto + voorkant, achterkant, detail, op model); rest nameten
- [x] F3 Lengte: /catalog vier vragen; grootste blokken per dienstpagina,
  /studio en /compare nog een keer langs
- [x] F4 Editions: twee plaatshouders → één
- [x] F5 Build, volledige reeks, scans, leveren

---

## Logboek
- A1: kladblok/_knoppenscan.mjs (elementsFromPoint-grond, INGELOGD=1 voor
  klantknoppen, labels met eigen vulling). Gevonden: hero-knop knop-wit op
  licht (proef + "Start a plan" voor klanten) → knop-lijn; VOOR/NA-pil donker
  op donker → licht op bijna-zwart (stijl22 + global); bedankpagina: violette
  balk (tegen schema, BESTELLEN onzichtbaar) → vel; /start/plan donkere knop
  op zwart paneel → in B5. Volledige scan opnieuw na de build.
- A2: logo's: merk-tegel.webp/.avif (limoen tegel met witte V, modelkiezer +
  laptopdia) herkleurd naar #08090B met witte V (= favicon). mark-groen.png
  was al violet. CSS/JS: alleen nog commentaar. NIET gedaan: ±30 FOTO'S met
  limoen licht (brand-*, sfeer-*, laptop/uit_*) — dat is beeld, geen logo;
  voorstel in het verslag.
- A3: mollie.js SAMPLE_METHODS (ideal, bancontact, creditcard; zonder ideal
  bij 0 %), order.js regKey() + KVK als derde herkenning. order-api 121/121.
- B1–B4 (bron): about opent met "Ik ben Lucas." + fotostrook (3 op één rij) +
  WhoItIsFor weg; contact zonder modelfoto, kop in het paneel + "Je spreekt
  Lucas"; pricing: laptop weg, één-product-regel, smalle band, proef in het
  slot, regels in 2 kolommen (woorden.test 8, subscribe.test lp('/plans'));
  plans: abonnementen direct na de opening, laptop weg, uit-sectie in het slot.
- B5: /start/plan breder (72 → 82rem) in twee rijen: [plan + termijn | plaat]
  en [week + gegevens | 5 · Bevestigen, plakkend]. Drie voordelen onder de kop
  (uit planSaving: tot 32%, € 155–368/mnd; vaste week; maandelijks opzegbaar).
  Kaarten: feiten per regel + "Los € X · je bespaart € Y" i.p.v. "Zelf te
  verdelen". Termijnteksten kort, drie naast elkaar. Plaat: besparing direct
  onder het bedrag, verdeel-zin onder de lijst, beelden onderaan. Dubbele
  voetregel weg (inloggen staat nu in stap 4). Vinkjes waren nooit zichtbaar
  (set:html + scoped CSS) → :global(svg). Grijze hulpteksten ink-3 → ink-2.
  Tests: plans, subscribe, plan-zonder-account, telefoon, btw-vorm, nazicht,
  woorden, verplichte-velden, zachte-navigatie, vooruit groen; knoppenscan 0;
  leesbaar 0.
- B6: StyleRows: "In de maak" één regel (geen lege plaatshouders), "Op
  maat" een smalle balk (geen waaier); video drie soorten naast elkaar
  (VELMAX 22 → 15rem). /catalog: bewijs naar voren (checklist + achtergrond +
  waar-regel erbij), prijsband i.p.v. staffeltabel, stappen weg, slot 2
  knoppen (bestellen + proef, data-vis-uit). /lifestyle: galerij naar voren,
  carouselblok met prijsregel, stappen/checklist weg, slot 2 knoppen. /video:
  stappen weg (waar + model onder "strakke beweging"), slot 2 knoppen. Hero
  video NIET naar aanvraag (vaste regel "eerst een look", request-flow).
  8.068→6.033 · 8.626→7.142 · 7.613→5.454 px. .prijsband in stijl22.css.
- B7 /custom-models: echt geleverd werk direct na de opening; "jouw model" +
  "wat het kost" naast elkaar; vijf stappen op één rij; richtingen als korte
  rij (letter + naam); bibliotheek als band (#standard blijft); WA uit
  opening en slot. 7.374 → 5.949 px.
- B8 how-it-works: details + "waar de beelden landen" één paneel (5.665 →
  5.296); studio: terugrekenen naar voren, "laatste stap is een specialist"
  onder het bord zonder lege 16:9 (7.762 → 6.747); compare: twee lege 4:3's
  weg, tabel eerst, week-lijst in de kamer (6.825 → 6.089); upload: twee lege
  kaders → drie echte telefoonfoto's (roze jeans) (5.937 → 5.658).
- B9 /faq: index wordt tabs (script, role=tablist, pijltjes, #hash); zonder
  JS de volle lijst. 9.392 → 3.005 px.
- B10 hooks 9.232 → 4.633; editions 10.438 → 4.926 (vijf blokken; tekst in git).
- B11 /start: Hooks/Editions uit het raster (render-filter, bron houdt 8 voor
  eigenproduct.test) + regel "Ook, nog niet te bestellen"; merkmodel als band.
  /test-sample: kleine lettertjes in "Hoe de proef werkt" + "Betalen met
  iDEAL · Bancontact · creditcard" uit SAMPLE_METHODS.
- B12 stijlpagina's: "Ideaal voor" bij "Hoe X voelt"; raster alleen echte
  foto's (catalog: raster van getekende vakken weg).
- B13 slot: WA als derde knop weg op gallery en models; alle slots nu ≤ 2.
- C: src/data/leveringen.js (6 leveringen, 1 echt + 5 plaatshouder "Beelden
  volgen", allemaal de roze jeans), Levering.astro met props (nummer,
  product, dienst, plaatshouder, id). Galerij: pillen per dienst + keuzemenu
  productsoort (JS; zonder JS alles zichtbaar), 2 kaarten naast elkaar
  (<details>, eerste open, open = volle breedte). "Alle beelden" ongewijzigd.
- D1: bestond al: /admin/customers/:id "Bestelling namens" (zelfde route als
  het formulier, bevestiging met betaallink, btw-lijst bij geen nummer).
  Ontbrak: klant aanmaken zonder account, en de WhatsApp-foto's bij de order.
- D2: /admin/customers "Nieuwe klant" (upsertCustomer, contactvoorkeur
  WhatsApp, btw of KVK) → klantpagina#namens; namens-formulier multipart met
  fotos[] → R2-klaarzetmap (uploads.js-grenzen) → upload_batch.
  tests/ronde2.test.mjs (test:ronde2).
- E1: verse build; volledige reeks (151 scripts) — 2 rood: ketenvolledig
  (ronde2 nog niet in de keten) en ronde2 (twee verkeerd geschreven
  toetsen); beide gerepareerd, opnieuw groen.
- E2: knoppenscan 0 (ook INGELOGD=1) · leesbaar-alles 0 onleesbaar · spatie-
  alles: 1 (8px tussen galerijpillen op 390 → .65rem) nu 0 · audit-links 0 ·
  horizontale scroll 0 (93 pagina's × 320/390/768/1024/1440).
- E3: 38 bestaande bestanden gestaged; laatste mtime in zijn map =
  levering ronde 1 (23-09 03:31 UTC); diffs bevatten alleen mijn wijzigingen.
- F1: etiket op /how-it-works ("Hoe het werkt") en /studio ("Planning");
  video- en catalog-stijlpagina's openen bovenaan (align-items: start);
  stijlpagina's: tweede knop proef (data-vis-uit) i.p.v. WhatsApp; upload-
  gids: pdf als pijllink. Nameting: alle openingen etiket + h1 62px + lead +
  ≤2 knoppen, kop op 172–175 px.
- F2: Classic met de echte set (ba2-voor-front → ba2-na-front/achter/detail/
  model). Nagemeten: op /lifestyle is alleen bij Dunes één vak leeg (er
  bestaan maar twee Dunes-beelden) — mijn eerdere "Glow en Phone-made hebben
  lege vakken" was een schermafdruk met nog niet geladen beelden. Video:
  "clip volgt" blijft tot er clips zijn (toets regel 4: één plaatshouder).
- F3: vragenblok 5 → 4 op alle dienstpagina's; /studio kop naast de agenda;
  /lifestyle carousel-rij drie naast elkaar; portretrij merkmodel max 60rem.
  catalog 6.033 → 5.941 · lifestyle 7.142 → 6.884 · video 5.454 → 5.362 ·
  studio 6.747 → 6.394 · custom-models 5.949 → 5.808.
- F4: Editions heeft er al maar één (de tweede telling was een noot in de bron).
- F5: verse build; volledige reeks groen; knoppenscan 0 (ook ingelogd); leesbaar 0; spatie 0; horizontale scroll 0; links 0.
- G (terwijl Lucas weg was): de volledige reeks gedraaid met een Nederlandse
  browsertaal (zoals op zijn pc). Gevonden: console-schoon en zachte-navigatie
  vielen om op de doorverwijzing van / naar /nl/. Alle 18 browsertests openen
  nu in en-US. tests/whatsapp-bestelling.test.mjs (test:whatsapp) draait de
  WhatsApp-route echt (klant aanmaken, bestelling met foto's, .exe
  overgeslagen, betaallink); vond een fout in de D1-nabootsing (bind() gaf
  hetzelfde object terug — in productie niet). Namens-formulier: taalkeuze
  voor de bevestiging. Reeks 152/152 groen in nl-NL.
