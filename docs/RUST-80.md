# Rust 80 · het rekenblad voor de nieuwe voorpagina

**1 november 2026, levering 80.** Lucas, 17:05: *"Ik wil de homepage zoals in de foto: eerst groot tekst van
wat VISUAILS is en daaronder al licht de laptop in beeld … kijk vooral naar de rust, whitespace en
overzichtelijkheid."* Zijn antwoorden van 17:13: scrollen in **twee stappen**, de winkel **klapt mee** dicht,
de **vijf kleuren uit zijn voorbeeld** in Blue Hour gezet (het roze vervalt), de preloader **alleen als nodig**.

Dit blad zet elke maat vast voordat er gebouwd wordt. Alles is uitgerekend of gemeten, niets op het oog.
Wat hier staat gaat voor `RUIMTE-EN-RUST.md` op de voorpagina. Sinds levering 81 (Lucas, 1 november, 22:10) gelden de
letter en de lucht ook op de andere publieke pagina's: zie §9. Studio, de privélink en /admin: §10 (levering 82).

---

## 0 · Wat ik heb gemeten in de voorbeelden

De voorbeelden van anderen zijn alleen bekeken en opgemeten (privéstudie). Er staat niets van in het project.

**De rust (de topbar-video, 800 × 600, 34 s; een pagina van ± 1440 px breed):**
- De buitenmarge is ± 11 % van de breedte (± 160 px), de inhoud ± 1120 px. Veel meer lucht dan wij (75 px).
- Een sectiekop is ± 40 px, regular of medium, op twee regels. De lopende tekst is klein (13 – 14 px) en grijs.
- Tussen twee secties staat bijna een scherm lucht. Per sectie één ding: één beeld, één lijst of één rij.
- Twee kolommen: de kop links, de inhoud op ± 45 % van de breedte. Alles op dezelfde twee lijnen.
- Beweging: tekst kleurt van grijs naar inkt terwijl je scrolt, beelden worden scherp, een rij kaarten schuift
  zijwaarts. Nooit iets dat stuitert.

**De laptopvideo (`21_9_laptop.mp4`):** 2944 × 1248 (2,359 : 1), 24 beelden per seconde, 6,58 s, 158 beelden.
- De grond is egaal **#F1F4FB** (241, 244, 251), niet de grond van de site (#F4F7FD).
- 0,00 – 0,50 s stil; **0,50 – 1,96 s** de klep gaat dicht (hij versnelt en stopt hard);
  **2,0 – 3,6 s** de telefoon gaat rechts het beeld uit; **2,7 – 4,5 s** de laptop gaat links het beeld uit
  (hij versnelt tot ± 1.380 px/s, dus *ease-in*); **4,5 – 6,58 s** leeg.
- De schermen zijn wit (255): daar komt onze inhoud.

**Het laadscherm (de derde video):** het logo in het midden, links "laden", rechts het percentage. Daarna wordt
het logo een venster dat groeit tot het de hele pagina laat zien.

## 1 · Het raster en de lucht (voorpagina)

| Maat | Was (78/79) | Nu (80) | Waarom |
|---|---|---|---|
| Inhoud hoogstens | 1440 px | **1280 px** | minder breed, rustiger regels |
| Buitenmarge `m` | max(clamp(20, 5,2 vw, 96), (100vw − 1440)/2) | **max(20 px, min(8,333 vw, 160 px), (100vw − 1280)/2)** | één kolom van twaalf (1440 / 12 = 120) |
| m op 1024 · 1280 · 1440 · 1920 | 53 · 67 · 75 · 240 | **85 · 107 · 120 · 320** | |
| Sectielucht licht · gewoon · zwaar | 120 · 160 · 213 | **160 · 213 · 284** | één stap op de 4 : 3-schaal omhoog |
| Telefoon | 72 · 90 · 120 | **90 · 120 · 160** | |

De regels van `RUIMTE-EN-RUST.md` (de stap S, het optische midden, nooit twee keer dezelfde lucht na elkaar)
blijven. Alleen de maten gaan een stap omhoog.

## 2 · De letter

- **Koppen in hoofdletters**, VISUAILS Display Bold. Gemeten in het font zelf: hoofdletters zijn **1,22 ×** zo
  breed als gewone tekst ("DE FOTOSTUDIO," 7,68 em tegen "De fotostudio," 6,28 em). Daarom:
  - spatiëring **−0,01 em** (was −0,03; hoofdletters hebben geen stokken en staarten, ze mogen iets ruimer);
  - regelafstand **0,92** (was 1,0; geen onderstokken, dus de regels mogen dichter);
  - elke kop opnieuw gemeten op 320 – 1920 px: hoogstens twee regels (drie tot 340 px).
- **De titel van de opening** (Lucas koos "Zoals jij hem ziet": NL "JOUW MERK, / ZOALS JIJ HEM ZIET.", EN "YOUR
  BRAND, / AS YOU SEE IT."): f = clamp(40, min(7,22 vw, (100svh − P − 340) / 1,84, de breedte tussen de marges / w),
  104), met w de breedste regel in em (NL "ZOALS JIJ HEM ZIET." 8,94; EN "AS YOU SEE IT." 6,52). Op 1440 × 900:
  104 px. Op de telefoon: (100vw − 40) / w.
- **Lopende tekst iets dunner:** DM Sans 400 → **370**, en wat 500 was → **450**. Het font is daarvoor opnieuw
  uitgesneden met de gewichten 300 – 700 (was 400 – 700; public/fonts/dm-sans). Eerst op de voorpagina; de rest
  van de site volgt na Lucas' ja op de voorpagina (s-categorie). Hetzelfde voor de koppen in hoofdletters. Contrast verandert niet (de kleur blijft
  inkt, 17,5 : 1); de dunste lopende tekst blijft minstens 15 px.

## 3 · De balk: vloeibaar glas, lager

| | Was | Nu |
|---|---|---|
| Hoogte computer · telefoon | 72 · 60 px | **56 · 52 px** (56 = 42,67 × 4/3, een stap op de schaal) |
| Grond | wit, haarlijn | **glas**: de grond (Wit #FBFCFF) op **72 %**, vervaging 20 px, verzadiging 160 % |
| Rand | haarlijn #E6E8EC | bovenaan een lichtlijn (Wit, 70 %), onderaan Mist op 70 % |
| Beweging | geen | een zachte lichtvlek (de Wit-fade, 40 % breed, 18 % dekking) die met het scrollen meeschuift, met na-ijlen (lerp 0,12 per beeld); bij minder beweging staat hij stil |

**Waarom 72 %:** de inkt moet op het glas 4,5 : 1 halen, ook boven het zwartste beeld (de handen). Uitgerekend:
boven zwart haalt 50 % 4,48 : 1, 55 % 5,28 : 1, **72 % 8,84 : 1**. Boven Blauw uur 11,07 : 1, boven Nevel 14,79 : 1.
Dit wijkt bewust af van "geen glas" uit de ontwerptaal: Lucas vroeg het op 1 november (17:05), alleen voor de balk.

## 4 · De vijf kleuren (zijn voorbeeld, in Blue Hour gezet)

Elke kleur uit het voorbeeld is heel licht naar de toon van Blue Hour gezet (OKLCH-tint 255 – 264°); het roze
vervalt en wordt Blauw uur.

| Naam | Uit het voorbeeld | Nu | OKLCH | Rol |
|---|---|---|---|---|
| **Inkt** | #121212 | **#0F1217** | .182 / .012 / 264° | tekst, logo, knoppen (was #0B0F17) |
| **Wit** | #FCFCFC | **#FBFCFF** | .991 / .0035 / 264° | kaarten, het glas, de lichtvlek |
| **Mist** | #E4E7EB | **#E4E7ED** | .927 / .0085 / 264° | lijnen, vlakken onder een pil |
| **Nevel** | #9DBACB | **#A2B7D2** | .773 / .045 / 255° | fades, posters, achtergrond achter beeld. Nooit tekst (2,0 : 1) |
| **Blauw uur** | (roze) | **#25508B** | .432 / .109 / 257° | het accent, zoals het was |

**De grond is Wit `#FBFCFF`** (lijst 64, grond b; was #F4F7FD in levering 79). Het vlak op de grond is
`#F0F1F6`, halverwege de Wit-fade. De lijn blijft `#E6E8EC`: grijs haalt daarop 4,501 : 1, op Mist maar 4,457 : 1.
Mist zit in de onderrand van het glas en het eind van de Wit-fade. Alles nagerekend in
`docs/KLEURENSCHEMA.md`, hoofdstuk "Levering 80".

**Contrast** (gemeten, op de grond Wit): Inkt 18,29 : 1, op Nevel 9,15 : 1. Blauw uur 7,88 : 1. Grijs #636974
5,38 : 1. Wit op Blauw uur 8,08 : 1.

**Elke kleur een fade** (OKLCH, van – naar; voor posters, het glas, het laadscherm en beweging):

| Fade | Van → naar | Tussenstappen (25 · 50 · 75 %) |
|---|---|---|
| Inkt | #0F1217 → #1A4279 (blauw diep) | #141D2D · #172945 · #19355F |
| Wit | #FBFCFF → #E4E7ED | #F5F7FA · #F0F1F6 · #EAECF1 |
| Mist | #E4E7ED → #A2B7D2 | #D4DBE6 · #C4CEE0 · #B3C3D9 |
| Nevel | #A2B7D2 → #FBFCFF | #B9C7DE · #D0D8E9 · #E6EAF4 |
| Blauw uur | #25508B → #A2B7D2 | #44699D · #6283AF · #829DC0 |

Een fade is een vlak voor een poster of een beweging, nooit de grond onder lopende tekst.

## 5 · Beweging: de golf

Lucas: *"golvende lijn beweging (niet visueel maar het gevoel van de animatie) dat snappy en smooth aanvoelde."*
De video zelf beweegt zo: de laptop versnelt het beeld uit. De pagina vangt die beweging op en remt hem af.
Samen is dat één golf: versnellen, en weer zacht tot stilstand.

| Naam | Curve | Duur | Waarvoor |
|---|---|---|---|
| `--golf` | cubic-bezier(.7, 0, .2, 1) | 900 ms | glijden naar de laptop, het logo dat de pagina opent |
| `--golf-uit` | cubic-bezier(.16, 1, .3, 1) | 700 ms | wat binnenkomt (de sectie na de video, beelden) |
| `--golf-klein` | cubic-bezier(.2, .8, .2, 1) | 240 ms | onder de muis, schakelaars |

**De video:** afspeelsnelheid **1,3** (de klep 1,1 s, alles weg na 3,5 s). Bij 4,1 s videotijd (3,15 s echt),
als de laptop voor driekwart weg is, begint Wat we maken omhoog te glijden (`--golf-uit`, 700 ms). Klaar na ± 3,9 s.
Wie tijdens de video nog eens scrolt, versnelt hem (snelheid 3). Minder beweging: geen video en geen glijden.

## 6 · De opening, stap voor stap

1. **Laden.** De titel, de zin, de knop en de link staan er, in het midden (geen model: lijst 64). Onderaan steekt de klep van de laptop ± 150 px het
   beeld in. Niets beweegt. (De preloader verschijnt alleen als dit na 350 ms nog niet geladen is.)
2. **Eerste scroll.** De pagina glijdt (`--golf`, 900 ms) tot de laptop helemaal in beeld staat, in het midden
   onder de balk. Op het scherm de winkel (na), op de telefoon de foto van de klant (voor).
3. **Tweede scroll.** De video speelt af: de klep klapt dicht met de winkel erin (perspectief per beeld uit de
   video gemeten), de telefoon en de laptop gaan het beeld uit, Wat we maken glijdt omhoog. Daarna scrolt de
   pagina gewoon.
4. **Terug omhoog.** De laptop staat weer open (zonder video, in één keer).

Telefoon en tablet zonder muis: geen vastzetten; de laptop staat stil zoals in 79.

**De video op het web:** uitgeknipt (de grond en de schermen doorzichtig, de randen ontmengd zoals de foto in 79)
en als **gestapelde video** (kleur boven, dekking onder) in H.264, getekend met WebGL. Zo is de grond overal precies
de grond van de site, in elke browser, ook Safari. De schermen worden per beeld in perspectief op hun plek gezet.

## 7 · De secties na de opening (lijst 64)

De volgorde volgt de klant: zien wat het is (de titel), zien wat hij krijgt (de laptop), kiezen (Wat we maken,
de galerij), even stilstaan bij het merk (de poster), weten wat hij moet doen (Hoe het werkt, kort), vertrouwen
(Meer weten) en proberen (de €1-proef). Alle koppen in hoofdletters, gecentreerd, clamp(32, 4,44 vw, 64).

| Sectie | Onderdeel | Wat er staat | Maten |
|---|---|---|---|
| Wat we maken | `HalMaken80.astro` | per dienst één uitgeknipt product met schaduw (hoodie, jeans, sokken van NON/STD), de naam, de vanafprijs uit de code, de link; eronder klein "Ook voor jouw merk" en nog kleiner wat één product kost (afvinklijst 5, `eenProduct`) | rij clamp(150, min(21 vw, 32 svh), 320); past op 1440 × 900 onder de balk (de video glijdt hem naar het midden) |
| De galerij | `HalGalerij80.astro`, `scripts/galerij80.js` | twee rijen (lifestyle, catalog) die tegen elkaar in schuiven als je scrolt; elk beeld gaat naar zijn look | rij clamp(170, min(22 vw, 30 svh), 330), 12 px ertussen; tegel 12 rond aan alle vier de hoeken (een beeld, geen knop: de hoekregel van 25 oktober), de naam springt aan 14 px van de rand |
| De logoposter | `HalPoster80.astro`, `scripts/poster80.js` | de Nevel-fade, dan het V-merk in Wit op Blauw uur met "Bouw de wereld van je merk."; bij scrollen wordt de V een venster op een foto (Phone-made) | baan 280 svh (180 svh scrollen), V clamp(150, 34 svh, 360) |
| Hoe het werkt, kort | `HalHoeKort80.astro` | "JIJ STUURT / WIJ MAKEN / JIJ KEURT GOED." met de levertijd uit de code en de link | regel clamp(26, 3,6 vw, 52) |
| Meer weten, de proef | voorpagina-80.css | zoals in 78, met de lucht en marges van 80 en de koppen in hoofdletters | |

**De galerij: de vaart.** Per beeld van 60 Hz: s = hoeveel de pagina scrolde; de gewenste vaart is
s × 0,6 × (1 + |s| / 30) (meer dan evenredig, hoogstens 140 px per beeld); de echte vaart komt elk beeld 12 %
dichter bij de gewenste, dus de rijen lopen ± 0,4 s uit. Vanaf 10 px per beeld komt de veeg erover (dezelfde
foto horizontaal onscherp over 15 % van zijn breedte, `scripts/galerij-80.mjs`), bij 40 px voor 92 %. Een rij
opzij slepen kan ook. Nooit vanzelf. Minder beweging en zonder script: twee rijen om zelf te scrollen.

**De poster: de stand p (0 – 1).** 0,08 – 0,28 de regel gaat weg; 0,10 – 0,30 de foto verschijnt in de V;
0,30 – 0,86 de V groeit om zijn dikste punt (het midden van de grootste cirkel die erin past: (451, 611) in de
eenheden van het merk, straal 91,5) tot hij het scherm dekt, exponentieel op de golf; daarna de foto heel, met
het plaatje van de look. Getoond met 16 % na-ijlen per beeld.

## 8 · Zacht scrollen en het laadscherm

**Zacht scrollen** (lijst 64, scrollen a; `src/scripts/zachtscrollen.js`): alleen met een muiswiel (een trackpad
en een vinger scrollen gewoon), 18 % per beeld (90 % in ± 0,2 s), niet in iets dat zelf scrolt, niet met Ctrl,
niet bij minder beweging. Bewust kleiner dan Lenis, dat er op 1 september uit ging omdat de site er "af en toe
wat sloom" van werd. De opening vangt het wiel eerder af (capture) zolang de laptop in twee stappen gaat.

**Het laadscherm** (lijst 64, preloader a; `Voorlader80.astro`): alleen op de voorpagina en alleen als laden
langer dan 350 ms duurt. Het V-merk in het midden; het vlagje vult zich met de echte voortgang (de twee letters,
het eerste beeld, de pagina). Klaar: de V wordt een venster en groeit om zijn dikste punt tot de pagina te zien
is (900 ms, de golf). Noodrem na 8 s.

## 9 · De rest van de site (levering 81)

Lucas, 22:08: *"Ga voor nu verder met de rest"*; 22:10: de publieke pagina's (Studio en /admin later), **letter +
lucht** (de opbouw van elke pagina blijft), en Hoe het werkt met de animaties op /catalog, /lifestyle en /video.
Wat hierboven "eerst op de voorpagina" heet, geldt sinds 81 voor elke publieke pagina. De regels staan in
`src/styles/hal.css`, blok "LEVERING 81"; de toets is `tests/publiek-81.test.mjs`.

| Maat | Was (tot 80) | Nu (81) |
|---|---|---|
| Buitenmarge | 40 · 28 · 16 (computer · tablet · telefoon) | **max(20, min(8,333 vw, 160))**: 120 op 1440, 75 op 900, 20 op de telefoon |
| Inhoud hoogstens | 1440 | **1280** |
| Sectielucht gewoon · licht | 110 · 72 – 88 | **213 · 160** (telefoon 120 · 90) |
| Lucht die bij de vorige sectie hoort | 40 – 64 | blijft (de prijsband 64, de juridische tekst 64, het beeld onder de kop van een look 56) |
| Het €1-blok onderaan | 110 | **213** (telefoon 120) |
| h1 · h2 · h3 vanaf 901 px | 76 · 56 · 34 | **min(3,54 vw, 52) · min(2,88 vw, 43) · min(2,47 vw, 34)** |
| h1 · h2 · h3 tot 900 px | 44 · 34 · 26 | **min(7,4 vw, 44) · min(6,3 vw, 34) · min(5 vw, 26)**; h3 tot 380 px min(4,6 vw, 23) |
| Lopende tekst · wat 500 was | 400 · 500 | **370 · 450** (ook het bestelformulier en de onderdelen met een eigen stijl) |

- **De koppen** staan in hoofdletters (−0,01 em, regelafstand 0,92). Hun maat is gemeten, niet gekozen: per kop op
  18 breedtes de grootste letter waarbij hij op twee regels past; de krapste kop bepaalt de maat
  (`kladblok/levering-81/koppen-maat.json`). Op 1280 px liggen de vijf krapste h1's tussen 47 en 50 px, dus een
  paar zinnen korter maken wint bijna niets. Twee koppen hebben een eigen maat: het slot van /ai-act tot 380 px
  (7 vw) en de kop naast het logboek op /studio vanaf 901 px (2,4 vw).
- **Uitgezonderd**: de opening van een dienstpagina (de laptop, het podium) houdt haar eigen marge, want daar staat
  de foto precies op de grond (tests/grond-79); het bestelformulier houdt zijn eigen breedte; de €1-kop houdt zijn
  maten. De voorpagina houdt haar eigen regels (§1 – §7).
- **Hoe het werkt met de animaties** (`HalHoeDienst.astro`) staat op /catalog, /lifestyle en /video, na de looks
  en vóór de vragen: alleen de stappen van die dienst, de uitlegbalk, één knop naar het formulier van die dienst
  en de feiten uit de code. De woorden staan in `src/data/hoeHetWerkt.js`, ook voor Hoe het werkt kort op de
  voorpagina.

## 10 · Studio, de privélink en /admin (levering 82)

Lucas, 2 november, 01:52: *"Ja door met Studio en admin"*. Zijn keuzes: de letter van 80 in alle drie; alleen de
**paginakop** van Studio en de privélink in VISUAILS Display, in hoofdletters (kleine koppen in kaarten en heel
/admin blijven DM Sans: een werkplaats); Studio en de privélink **één stap ruimer** op de 4 : 3-schaal, /admin
blijft dicht. De regels staan in `src/styles/studio-hal.css` en `public/portal.css` (blok "LEVERING 82") en
`public/admin.css`; de toets is `tests/werkplaats-82.test.mjs`.

| Maat | Studio | De privélink (/o) | /admin |
|---|---|---|---|
| Lopende tekst · wat 500 was | **370 · 450** | **370 · 450** | **370 · 450** |
| De paginakop | **Display Bold, hoofdletters**, 40 (telefoon 32) | **Display Bold, hoofdletters**, 36; zonder bestelling min(36, 7 vw) | DM Sans 600, zoals het was |
| De zijmarge | 40 → **51** (telefoon 17,6 → **21**) | 24 → **28** (telefoon 16 → **21**) | blijft |
| Boven de kop · eronder | 36 → **51** · 32 → **38** | 28 → **38** · de zin 8 | blijft |
| Tussen de blokken | 40 → **51**; bestellingen 20 → **28** | 24 → **28**; de noot 16 → **21** | blijft |
| Onderaan | 64 → **90** | 48 → **67** (telefoon 40 → **51**); de voet 32 → **38** | blijft |

- **De maat van de kop is gemeten** (`kladblok/levering-82/koppen-maat.json`): elke kop in de echte kop van de
  pagina gezet, op 17 breedtes. In Studio past 40 overal op twee regels, ook "WELCOME BACK, MAXIMILIAAN" (de
  krapste: 44,5 px op 1024, waar de kop zijn rij deelt met de knop). "JE BESTELLING" past tot 52 px op 320. De
  pagina's zonder bestelling ("WE KUNNEN JE BESTELLING NU NIET BEREIKEN") passen tot 7,1 vw, vandaar min(36, 7 vw).
- Binnen een kaart verandert niets: de lucht is die tussen de blokken.

## 11 · De schakelaars, de kleine dingen en grijs naar inkt (levering 83)

Lucas, 1 november: *"soms smooth human dopamine animations/sections/switches"*. Lijst 68: schakel = **a** (het
blok glijdt), klein = **ja** (het vinkje en de pauzeknop), grijs = **a** (per woord, één zin), soepel = goed. De
toets is `tests/beweging-83.test.mjs`; de filmpjes staan in lijst 69.

| Wat | Waar | Hoe | Minder beweging |
|---|---|---|---|
| De schakelaars | de tabs van de FAQ; de pillen en Leveringen \| Alle beelden op /gallery; de formaten | het blok glijdt naar de keuze, 240 ms op `--golf-klein` | springt |
| De pauzeknop | de opening, de laptop, Over, Hoe het werkt (UitlegBalk) | de twee balken worden de twee helften van de driehoek en terug, 240 ms (`d: path()`) | wisselt |
| Het vinkje | elk vakje (global.css) en het eigen vakje van de fotogids (hal.css) | het vakje meteen inkt; het korte been meteen, het lange 110 ms later; uitvinken meteen weg | in één keer |
| Grijs naar inkt | alleen "Jij stuurt. Wij maken. Jij keurt goed." (HalHoeKort80) | per woord, van links, in twee tellen (160 ms) | meteen inkt |

- **De schakelaars** (`src/scripts/schakel.js`, gestart door HalBeweging). Boven de rij ligt een kopie waarin
  elke knop de gekozen stand heeft (`.sk-k`), afgeknipt tot een venster in de vorm van de gekozen knop; het venster
  glijdt. Knoppen met de snede (de pillen, de formaten): een venster met vier punten (`polygon()`); de kier van 53°
  loopt onderweg door het blok, het merk. Rechte knoppen (de FAQ, de wissel): `inset(… round …)` met de hoeken van
  de knop, en de kopie heeft de kleur van de gekozen knop als grond, zodat het blok boven de ruimte tussen twee
  knoppen niet openbreekt. De kopie is aria-hidden en inert en draagt geen id, rol, link, aria-, data- of
  for-attribuut en geen invoerveld; in de rij zelf ziet de gekozen knop eruit als de andere. **Studio blijft
  zonder**: geen animatie bij het wisselen van tab (Lucas, 15 oktober), en de tabs zijn daar links.
- **De pauzeknop**: een derde pad `.ik-m` met `pauze-m` en `afspelen-m` uit `src/data/iconen.js` (drie stukken met
  evenveel punten; elk eindbeeld bevat alle hoekpunten van het icoon uit het kit). Waar CSS `d` niet overgaat
  (Safari), blijven de twee iconen wisselen. De regels hangen onder `body.hal`: elke pagina met een pauzeknop is een
  hal-pagina.
- **Het vinkje**: in global.css twee lagen (`::before` het korte been, `::after` het lange, dat 110 ms later
  zichtbaar wordt); het vakje gaat bij aanvinken zonder overgang naar inkt, anders staat het witte korte been op bijna
  wit. De fotogids heeft een eigen vakje met het vinkje uit het kit (`.h-ug-vakje`; het echte vakje ligt er
  onzichtbaar over): daar toont een animatie van 110 ms eerst de linkerhelft van het icoon (`clip-path: inset(0 56%
  0 0)`, het korte been tot de punt onderaan), daarna het hele vinkje.
- **Grijs naar inkt**: p = (0,8 h − boven) / 0,35 h, van 0 tot 1; woord k van n is inkt bij p ≥ (k + ½) / n. Het
  grijs is `--h-grijs` (5,4 : 1 op de grond), dus de zin leest ook grijs. Terugscrollen maakt hem weer grijs.
- **Lichter scrollen.** `--lx` (de lichtvlek op de glazen balk) is een `@property` die niet erft en ligt als laag in
  de achtergrond van de balk (op `::before` erfde hij naar alles in de balk, zodat elke beeldverversing de stijl van
  de hele balk opnieuw uitrekende). `poster80.js` tekent niet opnieuw als er niets veranderde; `poster80.js` en
  `galerij80.js` zetten `--p8-weg` en `--g8-veeg` alleen als ze veranderen; de WhatsApp-knop raakt `is-wacht` en
  `is-weg` alleen aan als ze er zijn. Gemeten (twee keer, gemiddeld; `kladblok/levering-83/soepel.json`): de opmaak per
  beeld bij de opening 4,5 → 1,4 ms, de galerij 6,8 → 3,1, de logoposter 10,3 → 7,9.
