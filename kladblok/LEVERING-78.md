# Levering 78 · De voorpagina opnieuw ingedeeld, een rechthoekige balk en de gloed op de tweede toon

**28 oktober 2026 (gevraagd 27 oktober, 16:03 – 18:06). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 77. Die is nog niet uitgerold (de laatste uitrol is 76, 27
oktober 15:05), dus rol je ze samen uit: het commitbericht beschrijft ze allebei.

---

## 1 · Wat je vroeg

- **16:03**: *"het grijze vak komt tegen de top bar aan. Dit soort fouten zijn visueel enorm onprettig
  om naar te kijken. Ook zou ik in plaats van een grijs vak een soort zwarte tablet willen."* Lijst 62:
  **a**, rond, als een echte tablet.
- **16:50**: de voorpagina *"van de grond af opnieuw uitgebreid … indelen"*, met ruimte en rust;
  *"Alleen de eerste laptop pagina krijgt het scroll effect en daarna scrollt de pagina normaal"*; een
  rechthoekige balk over de hele bovenkant; niet generiek, met regels uit onderzoek; "Three kinds of
  image" anders framen, overal; teksten *"express (maar wel consistent uitgerekend) een beetje off"*,
  volgens een systeem, per pagina een eigen systeem; de tweede toon van een kop in blauw uur met een
  rustige gloed; *"creëer een heel systeem die je consistent kan volgen."*
- **Lijst 63** (je antwoorden van 28 oktober, 12:44): de nieuwe voorpagina mag zo in je map; de golf
  komt per kop één keer per bezoek; de balk blijft op het nieuwe raster; de zin voor Google zegt
  "vanaf €39", net als de pagina.
- **Tussendoor** (27 oktober, 17:56 – 18:06): de gloed zonder lichtrand, als een golf, met een lucht uit je
  beelden ("Lucht, rustig") en een fijne filmkorrel.

## 2 · Wat er staat

### De opening: een zwarte tablet (`HalTablet.astro`, `tablet.css`)
- Liggend 3 : 2, met ronde hoeken als een echte tablet (lijst 62, a), **48 px onder de balk** en
  smaller dan de balk. Op het scherm de laptop en de telefoon uit de still, met de standen zoals in 75 – 77.
- Eronder de kop op één regel. Hij hangt **een stap S links buiten de tablet** (S = 0,75 × de kop, de
  snede van de V) en loopt rechts tot de rand. De zin en de standen staan op de lijn van de tablet.
- De css rekent alle maten uit, zonder script, en het effect staat er vanaf het eerste beeld: er
  verschuift niets bij het laden (gemeten op 390, 1100, 1280, 1440 en 1903 px).
- Op een breed scherm (zoals het jouwe) staan de zin en de standen naast elkaar. Is de tablet smaller dan
  880 px (de meeste laptops), dan staat de zin over de hele breedte in twee regels en de standen eronder,
  rechts. Zo staan de kop, de zin, de standen en de pauzeknop altijd in het eerste scherm (gemeten op
  1280 × 600 tot 2560 × 1300).

### Het ene scrolleffect
- Alleen op de computer en met beweging. Je scrolt 0,9 schermhoogte: de kop en de zin gaan weg, de tablet
  komt iets dichterbij en lost op, en **de foto uit het winkelscherm vliegt naar Wat we maken**. Wat we
  maken toont meteen dezelfde soort als het scherm (catalog, lifestyle of video). De foto landt op een
  kopie van de echte laag; gemeten is er geen zichtbaar verschil op het moment dat de echte foto het
  overneemt.
- Daarna scrolt de pagina gewoon. Geen sprong per wieltik, niets meer vastgezet.
- De €1-melding komt pas na het effect, niet tijdens de vlucht (`interactions.js`).
- Op de telefoon en bij minder beweging staat alles gewoon onder elkaar.

### De secties, volgens het systeem (`voorpagina-78.css`, `docs/RUIMTE-EN-RUST.md`)
- **Wat we maken**: het beeld links (6 kolommen, steekt S door aan de buitenkant), één kolom lucht, de
  tekst rechts in het midden van het beeld en dan S hoger. Daaronder **"Ook voor jouw merk"**: een eigen
  look, je eigen merkmodel, hooks voor je ads, een abonnement, en "Iets anders nodig? Vraag het ons".
- **Hoe het werkt** (`HalHoe.astro`): de kop over de breedte, de drie stappen als **trap**, elk S lager.
- **De looks**: gespiegeld, de tekst links, het beeld rechts op een vlak van 32 px rond.
- **Meer weten**: de kop groot links, de lijst rechts.
- **Het €1-blok**: op het raster, 7 + 5, alleen het label "Proef" (het nummer ervoor is weg).
- Ruimte tussen de secties: 160, 213, 120, 213 px, nooit twee keer dezelfde na elkaar.
- Geen label of nummer meer boven de secties, en niets komt meer binnen met een fade.
- Grote beelden hebben vier gelijke hoeken (de hoekregel van 25 oktober).

### De balk (`hal.css`, "LEVERING 78 · DE BALK")
- Rechthoekig over de hele breedte, 72 px (telefoon 60), wit, een haarlijn eronder. Geen glas, geen pil.
- Het uitklapmenu hangt 8 px onder de haarlijn, wit met een haarlijn.
- Dit geldt op elke pagina.

### De golf op de tweede toon (`gloed.js`, `hal.css`)
- De tweede toon van elke kop is nu **inkt** (was grijs). Af en toe rolt er een golf doorheen: **je
  duinlucht**, omgekleurd naar blauw diep, blauw uur en een lichtere toon van blauw uur (overal minstens
  6 : 1), met een **fijne korrel**. 1,9 s erin, 0,5 s vol, 2,4 s eruit; geen lichtrand.
- Nooit twee koppen tegelijk, elke kop één keer per bezoek, 9 – 13 s rust ertussen, en pas na je eerste beweging.
- Op inkt (het €1-blok): van wit naar blauw licht, zonder lucht en korrel. Minder beweging: geen golf.
- Nieuwe beelden: `public/img/hal/lucht-blauw-uur.webp` (uit hero-dunes, 2,4 kB) en
  `public/img/hal/korrel.webp` (5,4 kB).

### Niet meer "drie soorten beeld"
- Voorpagina: de zin onder de kop, de kop van Wat we maken en "Ook voor jouw merk".
- Over ons: de zin bovenaan.
- De zin voor Google van de voorpagina (Nederlands en Engels).

| Waar | Nederlands | English |
|---|---|---|
| Opening, de zin | Stuur een paar foto’s van je product. Je krijgt elk beeld terug dat je merk nodig heeft. Knoop, stiksel en kleur nagekeken. | Send a few photos of your product. Get back every image your brand needs. Buttons, stitching and colour checked. |
| Wat we maken, de kop | Elk beeld voor je merk. Van productpagina tot feed. | Every image for your brand. From product page to feed. |
| Wat we maken, eronder (nieuw) | Ook voor jouw merk: Een eigen look · Je eigen merkmodel · Hooks voor je ads · Een abonnement. Iets anders nodig? Vraag het ons | Also for your brand: A look of your own · Your own brand model · Hooks for your ads · A monthly plan. Need something else? Ask us |
| Over ons, de zin | Elk beeld dat je merk nodig heeft, gemaakt van je eigen productfoto’s: van productpagina tot feed. Voor één product of je hele collectie. | Every image your brand needs, made from your own product photos: from product page to feed. For one product or your whole collection. |
| Voorpagina, de zin voor Google | Elk beeld voor je kledingmerk, van je eigen productfoto’s. Zonder shoot. Vanaf €39 per product, excl. btw. Eerst zien voor €1. | Every image your clothing brand needs, from your own photos. No shoot. From €39 a product, excl. VAT. Try one for €1. |

### Het systeem: `docs/RUIMTE-EN-RUST.md`
Het raster, de ruimtematen, de stap S met per pagina een eigen hoek uit de V, de vier regels (hangende
kop, optisch midden, doorsteken, trap), de vijf soorten secties, de golf, de balk, beweging en hoe het
gemeten wordt. Met de bronnen van het onderzoek naar indelingen die "AI-gemaakt" ogen.

## 3 · Bewust anders dan het schema (en waarom)
- **Een blauw kopwoord, een verloop en korrel**, alleen in de golf op de tweede toon. Het schema zei
  "geen blauw kopwoord" en "geen verloop, geen korrel". Je vroeg erom (16:50 – 18:06), en in rust is het
  gewoon inkt. Het schema is bijgewerkt ("De gloed op de tweede toon", en regel 6 van "Altijd").

## 4 · Mijn mening, kort
- De tablet met één effect is rustiger dan de scrollvideo van 74 – 77: je ziet één ding, het gebeurt één
  keer, en de foto die vliegt vertelt wat VISUAILS doet (van winkelscherm naar je eigen beeld).
- Het systeem werkt omdat het klein is: één maat (S) die steeds terugkomt, drie soorten lucht, vier
  regels. Daardoor ziet het er "bewust schuin" uit en niet toevallig.
- De zin onder de kop is nu langer dan in 77. Op laptops staat hij daarom onder de tablet in twee regels
  over de hele breedte. Wil je hem korter, dan kan "Knoop, stiksel en kleur nagekeken." eventueel naar
  Wat we maken.
- Volgende stap: catalog met zijn eigen stap (0,58 × de kop, het linkerbeen), eerst als voorbeeld.

## 5 · Goed om te weten
- De zin voor Google zei "Vanaf €89 per product" (de prijs van één product), de pagina "vanaf €39" (de
  laagste trede). Op je keuze zegt de zin voor Google nu ook "vanaf €39" (`ladderFloor`, zoals de regel
  van naloop A2: "vanaf" is overal de onderste trede).
- `src/components/HalOpening.astro` wordt niet meer gebruikt, en de 117 beelden van de video in
  `public/img/hal/opening/f/` worden niet meer geladen (samen ongeveer 1,6 MB). De still en de schermen
  wel. Ik kan in je map niets verwijderen; ze mogen weg, of ze blijven staan (dat kan geen kwaad).
  `tests/opening-74.test.mjs` bewaakt nu de beelden en Hoe het werkt; de nieuwe opening staat in
  `tests/voorpagina-78.test.mjs`.
- De balk staat overal op het nieuwe raster. De andere pagina's staan nog op de oude marge (40 px op
  1440), dus daar staat het logo verder naar binnen dan de kop. Dat trekt recht zodra die pagina's
  het systeem krijgen.

## 6 · Bestanden
- Nieuw: `src/components/HalTablet.astro`, `src/components/HalHoe.astro`, `src/scripts/gloed.js`,
  `src/styles/tablet.css`, `src/styles/voorpagina-78.css`, `public/img/hal/lucht-blauw-uur.webp`,
  `public/img/hal/korrel.webp`, `docs/RUIMTE-EN-RUST.md`, `tests/voorpagina-78.test.mjs`,
  `kladblok/LEVERING-78.md`.
- Aangepast: `src/components/VoorpaginaHal.astro`, `src/components/HalBeweging.astro`,
  `src/components/OverHal.astro`, `src/pages/index.astro`, `src/pages/nl/index.astro`,
  `src/scripts/interactions.js`, `src/styles/hal.css`, `package.json` (`test:voorpagina78`), de toetsen
  `opening-74`, `hal-voorbeeld`, `letter-77` en `klant-stand`, `docs/DESIGN.md`, `docs/KLEURENSCHEMA.md`
  en `kladblok/COMMIT-BERICHT.txt`.

## 7 · Nagekeken
- `npx astro build`: klaar, zonder fouten. De hele testreeks: 270 van de 271 stappen goed; alleen test:backupterugzet faalt, en dat alleen in mijn kopie (die toets verwacht Windows-regeleinden, die heeft jouw map wel).
- Een tweede reviewer met frisse blik heeft alles nagelopen en vond vijf fouten: na de vlucht was Wat we
  maken niet te klikken, de kop bleef weg na een kleiner venster midden in het effect, op laptops viel de
  zin onder het scherm, de schermen in de tablet werden na een resize te groot, en op 901 – 1100 px liepen
  de beelden over de tekst. Alle vijf zijn opgelost en staan nu in `tests/voorpagina-78.test.mjs`.
- Gemeten: de foto landt zonder zichtbaar verschil; bij het laden verschuift niets (390 – 1903 px); elke
  kop op de voorpagina op 14 breedtes van 320 tot 1920 hoogstens twee regels; de zin, de standen en de
  pauzeknop in het eerste scherm van 1280 × 600 tot 2560 × 1300; nergens zijwaarts scrollen; de lucht in
  de golf overal minstens 6 : 1, de korrel minstens 4,7 : 1.
- Voor ik leverde, heb ik je map opnieuw vergeleken met de stand van 77: niemand anders had deze
  bestanden veranderd.

## 8 · Uitrollen
`UITROLLEN.bat` in je map. Het commitbericht staat klaar in `kladblok/COMMIT-BERICHT.txt`.
