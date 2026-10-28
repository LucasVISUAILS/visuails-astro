# Levering 77 · De eigen kopletter op de site, DM Sans voor de tekst, en nooit meer oude beelden in de opening

**27 oktober 2026 (gevraagd 27 oktober, 15:19). Staat alleen in je map; je rolt zelf uit met
`UITROLLEN.bat`.** Bouwt voort op levering 76 (live sinds 15:05, commit 4caa8b8).

---

## 1 · Wat je vroeg

- **Lijst 60** (VISUAILS Display): de snede, de vierkante punt, het gat van de a, koppen in **Bold 700**,
  en de tekst in **DM Sans op volle breedte**. **Lijst 59**: de koppen vet, beide tonen.
- **15:19**: *"de verhouding met de animatie [klopt] totaal niet meer"* en *"Ook snap ik niet hoe ik de
  lettertype nou kan toepassen op de website. Ik heb "VISUAILSDisplay-Black.ttf" geïnstalleerd maar weet
  niet wat het nu doet."*

De nieuwe opening (de zwarte tablet, lijst 61 en 62) zit hier **niet** in: dat wordt levering 78, na je
antwoord op lijst 62.

## 2 · Wat er staat

### De letters (`hal.css`, "LEVERING 77 · DE EIGEN KOPLETTER")
- **Elke grote kop in VISUAILS Display Bold 700**, ook de tweede, grijze toon: alle `.h-kop` (h1, h2, h3,
  de €1-kop), de kop van de opening, de paginakop van het bestelformulier, de koppen van de bedankpagina
  en de slotkop van de juridische pagina's. Het verschil tussen de twee tonen zit nu alleen in de kleur.
- **Al het andere in DM Sans** 400 – 700, op volle breedte; de browser kiest zelf de optische grootte
  bij de lettergrootte (kleine tekst iets ruimer en steviger, grote iets strakker). Ook in Studio, op de
  privélink en in /admin. Namen in kaarten en stappen blijven DM Sans 500: de kop is de enige stem in
  Display.
- **Spatiëring**: −0,03 em op h1, h2, de €1-kop en de kop van de opening; −0,02 em op h3.
- **Zelf gehost**: `public/fonts/dm-sans/` (42 + 20 kB) en `public/fonts/visuails-display/` (29 kB).
  De kopletter is byte voor byte de Bold uit `docs/letter/fonts/`; de nieuwe toets bewaakt dat. Beide
  worden vooraf geladen.
- Instrument Sans en de smalle stem (80 %) van levering 76 zijn weg.

### Elke kop opnieuw gemeten
Elke kop op elke pagina, op 14 breedtes van 320 tot 1920 px (boven 340 px hoogstens twee regels, tot
340 px drie). De nieuwe letter is breder dan de oude, dus een paar koppen moesten iets kleiner:
- **De €1-kop** 42,67 px (was 44), de stap van de schaal onder 56,89; op een smalle telefoon 27 px.
- **De paginakop** 5,2 vw op 901 – 1439 px ("Video that stands out in the feed." op /hooks paste op
  901 px net niet) en 39 px op de telefoon (was 40).
- **De h3** 23 px op 341 – 380 px.
- **/test-sample**: de kop in het €1-blok 32 – 40 px op 901 – 1180 px (hij staat daar in een smalle kolom).
- **/lifestyle**: de kop in de modelkaart op de telefoon 20 – 26 px (hij staat naast het beeld).
- **Meer weten op de voorpagina**: de kop houdt minstens 280 px. Op 901 px kreeg hij er 89, en "Any
  questions?" liep over vier regels.
- **Knopparen** (`src/scripts/knoppaar.js`): op 901 – 1240 px liep in een smal vak de tweede knop over de
  rand (tot 164 px op de 404). Dat zat er al in, de nieuwe letter maakte het groter. Nu meet het script
  of het paar in zijn vak past; past het niet, dan staan de knoppen los, en onder elkaar als het moet.

### De opening: de kop verspringt niet meer, en nooit meer oude beelden
- **De beelden.** Je browser bewaart beelden zeven dagen (`public/_headers`). Tussen 74 en 75 kregen
  117 beelden van de video en zes schermen een andere inhoud onder dezelfde naam; wie de site al kende,
  kreeg de nieuwe still met de oude video. Nu staat achter elk beeld van de opening `?v=` met een teken
  uit de inhoud van `public/img/hal/opening/` (`src/data/openingStanden.js`, `openingVersie`). Verandert
  er één beeld, dan verandert het teken en haalt elke browser alles opnieuw; verandert er niets, dan
  blijft de cache gewoon werken. Dat geldt voor de still, de schermen en de beelden van de video.
- **De kop.** De maat in `opening.css` is opnieuw gemeten voor de nieuwe letter (14,95 × zo breed als
  hoog, Engels 17,64; op de telefoon 9,00 en 10,51). Het script maakt hem alleen nog kleiner als hij
  toch niet past. Eerst zette de css hem op 48 px en het script een halve seconde later op 44: dat
  zag je bij het laden. En het mat tegen de rij eronder, die de kop zelf breder maakte (hij stond 11 px
  over zijn vak).

### Je vraag over de letter op je computer
De `.ttf` die je installeerde, is voor je eigen programma's: Figma, Photoshop, Word. In die programma's
staat hij nu onder VISUAILS Display. De site gebruikt hem niet: die haalt zijn eigen `.woff2` mee,
zodat elke bezoeker hem ziet zonder iets te installeren. Na deze levering staat hij dus op de site.

## 3 · Bewust anders dan het schema (en waarom)
- Geen. De kopletter is het schema (lijst 59 en 60); `docs/DESIGN.md` is bijgewerkt.

## 4 · Mijn mening, kort
- De Bold met −0,03 em maakt de koppen merkbaar zwaarder en dichter dan Instrument op 80 %. Daardoor
  is de kop nu echt het ene grote element van een sectie; de grijze tweede toon houdt hem rustig.
- Ik heb de kopletter bewust niet op namen in kaarten gezet. Dan wordt alles even luid.

## 5 · Goed om te weten
- `public/fonts/instrument-sans/` wordt niet meer gebruikt. Hij mag weg; ik kan in je map niets
  verwijderen, dus dat moet je zelf doen (of hij blijft gewoon staan, dat kan geen kwaad).
- Bouw je de letter opnieuw (`docs/letter/bron/familie.py`), kopieer dan de nieuwe Bold ook naar
  `public/fonts/visuails-display/`. Anders faalt `npm run test:letter77`, met precies die uitleg.

## 6 · Bestanden
- Nieuw: `public/fonts/dm-sans/` (twee woff2, `OFL.txt`, `LEES-MIJ.txt`),
  `public/fonts/visuails-display/` (`VISUAILSDisplay-Bold.woff2`, `OFL.txt`, `LEES-MIJ.txt`),
  `tests/letter-77.test.mjs`, `kladblok/LEVERING-77.md`.
- Aangepast: `src/styles/hal.css`, `src/styles/opening.css`, `src/styles/studio-hal.css`,
  `src/styles/voorpagina-rust.css`, `src/styles/werkplaats.css`, `src/components/HalOpening.astro`,
  `src/data/openingStanden.js`, `src/layouts/Layout.astro`, `src/scripts/knoppaar.js`, `public/admin.css`, `public/account.css`,
  `public/portal.css`, `scripts/fonts-voor-worker.mjs`, `package.json` (`test:letter77`), de toetsen
  `hal-voorbeeld` en `opening-74`, `docs/DESIGN.md`, `docs/letter/LEESMIJ.md` en
  `kladblok/COMMIT-BERICHT.txt`.

## 7 · Nagekeken
- `npx astro build`: klaar, zonder fouten.
- De hele testreeks: **269 van 270 goed**. `backupterugzet` faalt alleen in mijn kopie: hij controleert
  of een uitlegbestand Windows-regeleinden heeft, en die heeft mijn kopie niet. In jouw map wel.
- Elke kop gemeten zoals hierboven; de woorden per regel binnen de regels.
- De opening: de kop staat bij het laden meteen op zijn maat (geen sprong meer van 48 naar 44 px), en
  verschuift niet meer dan in 76 (gemeten tegen een kopie van 76).
- Voor ik leverde, heb ik je map opnieuw vergeleken met de stand van vanmiddag: niemand anders had deze
  bestanden veranderd.

## 8 · Uitrollen
`UITROLLEN.bat` in je map. Het commitbericht staat klaar in `kladblok/COMMIT-BERICHT.txt`.
