# Levering 75 · De opening rustiger en gecentreerd, de standen terug, één pagina met Hoe het werkt, de balk als zwevende pil

**26 oktober 2026 (gevraagd 25 oktober, 23:35 en 23:39). Staat alleen in je map; je rolt zelf uit
met `UITROLLEN.bat`.** Bouwt voort op levering 74 zoals die live staat (jouw commit van 23:21).

---

## 1 · Wat je vroeg

- **23:35**: *"De home pagina voelt nu te druk. Ik wil de foto groot maar wel gecentreerd, goed in
  verhouding en niet dat het het hele beeld vult en zet de kop eronder niet ernaast."*
- *"de mogelijkheden van de laptop en het wisselen van scherm (zoals het instagram voorbeeld
  mockup) [zijn] verdwenen terwijl ik dit nooit heb aangegeven, ik wil dit terug."*
- *"stap 2 van de "How it works" animatie veel korter en simpeler, wel met de 3 lagen erin houden
  maar deze ook wat smoother op het vlakke gedeelte laten aansluiten, nu snapt hij terug terwijl
  ik wil dat hij op precies de goede plek eindigt."*
- *"Het "how it works" gedeelte mag ook wel wat compacter en mag smooth overlopen met de laptop
  animatie dus dat die sectie mooi tijdens dat de laptop verdwijnt al licht te zien is en erin
  snapt waardoor het echt voelt als 1 pagina."*
- *"De top bar mag ook van glas … wat mooier en meer van de website af … door lichte schaduw toe
  te voegen … dezelfde look hebben als ovyon labs top bar maar niet kopieren."*
- **23:39**: *"Haal het slice effect ook weg die op elk element zit wanneer het tevoorschijn komt …
  Zorg dat de verhoudingen bij de tweede sectie "how it works" ook wat beter en compacter word
  zodat het allemaal niet zo in your face is en wat strakker en minimalistisch/rustiger oogt."*
- Je antwoorden daarna: de kop **links, op de rand van de foto**; de armen: *"er [zou] nog een
  stuk van de rechter arm toegevoegd moeten kunnen worden zonder dat de foto in het midden van
  het witte komt te staan"*; de balk een **pil van licht glas, zwevend**; verschijnen **zacht
  infaden, zonder beweging**.

Over de standen: je hebt gelijk, dat had ik in 74 niet mogen laten vallen. De opening van 74
toonde alleen het eerste scherm (de webshop); de reeks met het Instagram-bericht en de clip zat
nog in de code van de oude laptop, maar niet meer op de voorpagina. Nu staat hij er weer.

## 2 · Wat er staat

### Het beeld: de hele video, de armen doorgetrokken (`scripts/opening-reeks.py`, `scripts/opening_armen.py`)
- De uitsnede is nu de **hele breedte** van je video (x 0 – 1920; eerst 0 – 1681, daar viel een
  stuk van de rechterarm weg). Daardoor staan de apparaten vanzelf in het midden.
- De armen lopen **door tot de rand van het venster**: links en rechts 720 videopixels en onder 360
  erbij, per beeld doorgetrokken langs de omtrek van de arm (gemeten, met dezelfde korrel en een
  overgang van 40 px, zodat je de naad niet ziet). Waar geen arm is, is het wit.
- Vanaf beeld 75 schuiven de laptop en de telefoon zelf het videobeeld uit; daar kan niets
  doorgetrokken worden (buiten je video bestaat geen laptop). De doorgetrokken armen lossen
  daarom tussen beeld 74 en 82 op, en wat daarna de rand van het videobeeld raakt, lost zacht op
  in het wit in plaats van op een harde lijn te stoppen. Op een scherm tot ± 1500 px breed ligt
  die rand buiten het venster; op een breder scherm zie je het als een zachte overgang.
- De reeks: 117 beelden van 2352 × 903, AVIF, samen **0,98 MB** (was 1,2 MB, ondanks het grotere
  beeld: wat erbij kwam is vooral wit). De still in 1800, 2700 en 3600 breed (AVIF 14 – 37 kB).

### De opening (`src/components/HalOpening.astro`, `src/styles/opening.css`)
- **Eén indeling op elk scherm.** De apparaten in het midden, op hoogstens **58 % van de breedte**
  van het venster, en zo groot als er boven de kop past. De bovenkant van de laptop een rustige
  afstand onder de balk (3,4 % van de hoogte).
- **De kop eronder, op één regel**, links precies op de rand van de laptop (gemeten: 0 px
  verschil), tot net voorbij de telefoon (nog in het wit, ruim vóór de rechterarm). De grootte
  wordt in de browser gemeten: 58 px op 1440 × 900, 72 px op 1920 × 1080, 39 px op 1280 × 720.
- Eronder de zin, en rechts daarvan **de standen**. Op een laag of smal scherm komen de standen
  onder de zin. Op de telefoon vullen de apparaten 86 % van de breedte (de armen lopen er links
  en rechts uit) en staat de kop op twee regels, zoals in 74.
- Dit alles zet de css neer, ook zonder script; het script meet alleen de hoogte van de tekst.
  Daardoor verspringt er niets bij het laden: CLS **0 – 0,012** op elf schermen (NL en EN).

### De standen (`src/data/openingStanden.js`)
- Dezelfde negen als de laptop vóór 74: de webshop met de vier catalogbeelden, het
  Instagram-bericht met de vier lifestylebeelden (één daarvan is het vak "Alleen het product", zoals
  toen), en de clip. De telefoon wisselt mee waar zijn foto anders is.
- Bediening zoals toen: de naam en de teller ("Catalogset · 4 beelden 1 / 9"), de streep als klok,
  vorige en volgende (één vorm met de snede), pauze.
- **Pas na je eerste beweging** loopt het vanzelf (net als het accentwoord): "niets beweegt bij het
  laden". Alleen in het rustbeeld (bovenaan), stil met de muis boven de laptop of de telefoon (niet
  boven het hele beeld: dat is met de armen bijna het hele venster), met de focus op de knoppen en
  buiten beeld, en voorgoed stil na een pijl of pauze. Bij minder beweging niet vanzelf (de pijlen werken wel).
- Een nieuw scherm verschijnt pas als het geladen en gedecodeerd is, en vloeit in 0,45 s over het
  oude. De schermen per stand fotografeert `node scripts/opening-reeks.mjs <werkmap>` (in
  `public/img/hal/opening/scherm/`: 18 laptopschermen en 10 telefoons, AVIF 15 – 170 kB). Het volgende
  scherm laadt meteen, de rest pas als de pagina rust, één voor één; bij "databesparing" alleen
  steeds het volgende.

### Eén pagina met Hoe het werkt
- De video en de overgang zijn **één weg van 1,6 schermhoogte** (was 1,2 + 0,6), en ze lopen in
  elkaar over:
  - tot 70 %: de video; vanaf ± 40 % schuiven de apparaten het beeld uit;
  - 40 – 54 %: kop, zin en standen lossen op (alleen de dekking, geen snede meer); de letters van
    "Zonder shoot." reizen naar het label, zoals in 74;
  - **46 – 66 %: Hoe het werkt staat er al licht** (30 %), terwijl de laptop weggaat;
  - **70 – 84 %: en klikt erin**: snel en zacht aankomend (ease-out quint), zonder overschot, de
    drie delen en de drie kaarten een fractie na elkaar. Dan de stop.
- Eén wieltik speelt het in 2,8 s af (was 3 s; de weg is korter).
- De uitleg van de drie stappen begint pas als Hoe het werkt er echt staat. In 74 begon hij al bij
  het laden (de sectie stond onzichtbaar in het venster); nu zegt de opening tegen de uitlegbalk
  wanneer hij mag (`data-uitleg-houd` en het event `uitleg-houd`, `UitlegBalk.astro`).

### Hoe het werkt compacter (23:39)
- Hoogstens **1240 px** breed (was 1440), de kop 28 – 36 px (was 32 – 44), de cijfers 30 px (was
  40), de namen 20 px (was 26), de tabs 40 px hoog, de beelden in de kaarten 180 – 300 px (was
  196 – 420), en het geheel in het midden van wat er onder de balk over is.
- Daardoor past het nu ook op 1280 × 600 (dan speelt de video); pas daaronder staat alles onder
  elkaar.

### Stap 2: alleen de lagen, en hij landt op zijn plek
- **5,2 s** (was 12,9 s): het handwerk ervoor (rechtzetten, opbouwen, nakijken, de pen) is van de
  pagina af. Wat blijft: vlak op de grijze grond van het beeld; de drie lagen springen uit elkaar
  en kantelen in 3D (snel open, lang uitlopen), zweven even, kort de gloed in blauw uur met
  "Gemaakt met AI", en zakken dan rustig terug.
- **Het terugsnappen zat in de wissel aan het eind**: de figuur met de lagen ging weg en het beeld
  van het handwerk kwam terug, en die twee lagen niet precies op elkaar. Nu blijft dezelfde figuur
  van begin tot eind staan: hij begint vlak en landt vlak, op precies dezelfde plek (gefilmd per
  0,25 s: geen sprong).
- De figuur draagt nu zelf de beschrijving voor een schermlezer ("De roze jeans, uitgeknipt en op
  lichtgrijs gezet, met de natuurlijke schaduw eronder. Gemaakt met AI."); die stond op het beeld
  van het handwerk, en "Gemaakt met AI" las een schermlezer nergens.

### Geen snede meer bij het verschijnen (23:39)
- Elk element dat in beeld komt (`.h-in`, op de hele site) komt nu binnen met **alleen de
  dekking, in 0,4 s**, zonder beweging. De snede langs 53° (E1) is vervallen (KLEURENSCHEMA.md).

### De balk: een zwevende pil van licht glas (`hal.css`, "LEVERING 75 · DE BALK")
- 16 px van boven (telefoon 10), helemaal rond, 58 px hoog; wit 64 % met 24 px vervaging; een
  lichte bovenrand, een witte binnenrand, een haarlijn in inkt op 6 % en een zachte schaduw in drie
  lagen, zodat hij los boven de pagina hangt. De menuknoppen, de taal en Bestellen als pil.
- Dezelfde look op de uitklapmenu's (24 px rond) en de WhatsApp-knop.
- Alleen de verhoudingen en het gevoel komen uit het voorbeeld van Ovyon Labs; geen vorm, kleur,
  beeld of tekst daarvan, en hun beeld staat nergens in je project.
- De menuletters halen boven inkt nog 7,8 : 1.
- Bestellen is in de balk een pil (de vorm van de balk); elders houdt een knop zijn ene zachte
  hoek. `tests/minder-sjabloon-browser` kent die ene uitzondering nu.

## 3 · Bewust anders dan het schema (en waarom)
- **Glas en een zachte schaduw op de balk**: het schema zegt "glas alleen op wat zweeft"; de balk
  zweeft nu echt (los van de rand), dus dit past erin. De schaduw is breed en licht (6 – 30 %
  inkt), geen harde rand.
- **Beweging bij het laden**: niets. De standen en het accentwoord wachten op je eerste beweging.

## 4 · Mijn mening, kort
- De opening ademt nu: één beeld in het midden, één regel kop, en de rest wijkt. Op 1920 × 1080
  vullen de apparaten de helft van de breedte; groter zou weer druk worden.
- De standen naast de zin zijn het enige "bedieningselement" in de opening. Ik heb de naam van de
  set laten staan (hij zegt wat je ziet: catalogset, lifestylecarrousel, videoclip). Wil je het
  nog rustiger, dan kan de naam weg en blijven alleen de teller en de pijlen over.
- Op schermen van 1280 × 720 (een laptop op 150 %) is de kop 39 px. Dat is klein voor een opening,
  maar groter kan alleen als het beeld kleiner wordt; ik koos voor het beeld.
- Het oude handwerk van stap 2 (scripts/maak-recht.py, maak-pad.py, src/data/maakPad.js,
  maakRecht.js, src/styles/maak-recht.css en het blok `.h-maak` in hal.css) staat niet meer op de
  pagina, maar de bestanden heb ik laten staan, voor als je het ergens anders wilt gebruiken. Zeg
  het als ze weg mogen; dan ruim ik ze op.

## 5 · Goed om te weten
- **De cloudsessie**: de prompt (`kladblok/PROMPT-CLOUD-CODE.md`) gaat uit van levering 74. Rol
  eerst 75 uit en start daarna de cloudsessie, dan werkt die op de nieuwe stand. Ik heb de prompt
  niet aangepast (dat doe ik alleen met je ja).
- De content credentials (C2PA) die onderweg aan beelden worden toegevoegd, blijven erin.

## 6 · Bestanden
- Nieuw: `src/data/openingStanden.js`, `scripts/opening_armen.py`, `kladblok/LEVERING-75.md`,
  `public/img/hal/opening/scherm/` (de schermen per stand), `public/img/hal/opening/still-1800`,
  `-2700`, `-3600` (.avif en .webp).
- Weg: `public/img/hal/opening/still-1200`, `-1600`, `-2400` (.avif en .webp). Weggooien kan ik vanaf hier
  niet; ze staan in `_opruimen/LIJST.txt` onder "moet weg", dus `UITROLLEN.bat` vraagt eerst of hij ze mag
  opruimen (J): ze gaan dan naar `_opruimen/<datum>/`, er wordt niets verwijderd.
- Opnieuw: `public/img/hal/opening/f/017 – 133.avif`, `scherm-nl-laptop`, `scherm-en-laptop`,
  `scherm-telefoon`, `src/data/openingSchermen.json`.
- Aangepast: `src/components/HalOpening.astro`, `src/styles/opening.css`, `src/styles/hal.css`
  (de balk, het verschijnen), `src/components/VoorpaginaHal.astro` (stap 2),
  `src/components/UitlegBalk.astro` (wachten tot Hoe het werkt staat), `scripts/opening-reeks.py`
  en `.mjs` (de hele breedte, de armen, de schermen per stand; het fotograferen per stand nam eerst
  negen keer hetzelfde scherm), `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md`,
  `_opruimen/LIJST.txt`, de toetsen `opening-74`, `doorloop-27c`, `hoe-stappen-29`,
  `laptop-standen` en `minder-sjabloon-browser`, `kladblok/PLAN-OPENING-SCROLL.md`,
  `kladblok/VISUAILS-OVERZICHT-24-OKT.md` en `kladblok/COMMIT-BERICHT.txt`.

## 7 · Nagekeken
- Gefotografeerd op 1920 × 1080, 1536 × 864, 1440 × 900, 1366 × 650, 1280 × 720, 1280 × 600,
  1024 × 768, 390 × 844 en 320 × 640, in het Nederlands en het Engels, met en zonder script en met
  minder beweging; de overgang per stap van de scroll; stap 2 per 0,25 s.
- Gemeten: de apparaten in het midden (720 op 1440), hoogstens 58 % breed; de kop op één regel en
  op de rand van de laptop; nergens zijwaarts scrollen; CLS 0 – 0,012.
- `tests/opening-74.test.mjs` bijgewerkt en uitgebreid (de indeling, de standen, de lichte stand
  van Hoe het werkt, de lagen die vlak landen, 1280 × 600): 88 / 88.
- De standen gecontroleerd in de browser: niets loopt vóór je eerste beweging; daarna 1 / 9 → 2 / 9
  na 2,3 s, na 10 s bij het Instagram-bericht (5 / 9); stil zodra de muis op de laptop staat.
- axe op de voorpagina (1440, 390 en minder beweging, NL en EN, elke tab): geen fouten in rust. Op
  de telefoon meet axe midden in een overgang een letter die nog aan het verschijnen is; een tel
  later is ook dat schoon.
- De hele toetsreeks (269 stappen): alles groen, behalve `backupterugzet`, die hier altijd faalt
  (hij heeft jouw Windows-map nodig). Twee toetsen moest ik bijwerken: `doorloop-27c` (het lijstje
  met de lagen bestaat niet meer) en `minder-sjabloon-browser` (Bestellen als pil).

## 8 · Uitrollen
Uit je map, met `UITROLLEN.bat`. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
