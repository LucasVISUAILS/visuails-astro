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

> De video volgt sinds levering 87 het scrollen, niet meer een golf in de tijd (§14). `--golf` blijft voor het logo en
> wat binnenkomt.

Lucas: *"golvende lijn beweging (niet visueel maar het gevoel van de animatie) dat snappy en smooth aanvoelde."*
De video zelf beweegt zo: de laptop versnelt het beeld uit. De pagina vangt die beweging op en remt hem af.
Samen is dat één golf: versnellen, en weer zacht tot stilstand.

| Naam | Curve | Duur | Waarvoor |
|---|---|---|---|
| `--golf` | cubic-bezier(.7, 0, .2, 1) | 900 ms; 700 ms in de opening (sinds levering 84) | het logo dat de pagina opent; glijden naar de laptop (na de video springt de pagina sinds levering 85) |
| `--golf-uit` | cubic-bezier(.16, 1, .3, 1) | 700 ms | wat binnenkomt (de sectie na de video, beelden) |
| `--golf-klein` | cubic-bezier(.2, .8, .2, 1) | 240 ms | onder de muis, schakelaars |

**De video:** sinds levering 85 een golf die je voelt (§13; was 1,8 × sinds 84, 1,3 × daarvoor): 4 × terwijl de klep
dichtklapt en de telefoon weggaat, dan zacht naar 2,5 × terwijl de laptop het beeld uit versnelt. De klep is dicht na
± 0,5 s. Bij 3,75 s videotijd (± 1,0 s echt) wordt het podium wit; bij 4,33 s (± 1,2 s) springt de pagina naar Wat we
maken en komen de diensten omhoog op de plek waar de laptop stond. Klaar na ± 1,8 s (was 3,0 s). Wie tijdens de video
nog eens scrolt, versnelt hem (de golf × 1,6, minstens 3 ×, hoogstens 5 ×). Minder beweging: geen video en geen
sprong. Zie §12 en §13.

## 6 · De opening, stap voor stap

> **Sinds levering 87 (4 november 2026) anders: zie §14.** Geen glijden en geen sprong meer: je scrolt gewoon naar de
> laptop, die blijft dan staan terwijl het scrollen de video afspeelt. Wat hieronder staat, is levering 80 tot 86.

1. **Laden.** De titel, de zin, de knop en de link staan er, in het midden (geen model: lijst 64). Onderaan steekt de klep van de laptop ± 150 px het
   beeld in. Niets beweegt. (De preloader verschijnt alleen als dit na 350 ms nog niet geladen is.)
2. **Eerste scroll.** De pagina glijdt (`--golf`, 700 ms) tot de laptop helemaal in beeld staat, in het midden
   onder de balk. Op het scherm de winkel (na), op de telefoon de foto van de klant (voor).
3. **Tweede scroll.** De video speelt af, in een golf (§13): de klep klapt dicht met de winkel erin (perspectief per
   beeld uit de video gemeten), de telefoon en de laptop gaan het beeld uit, het podium wordt wit, de pagina springt
   naar Wat we maken en de diensten komen omhoog. Daarna scrolt de pagina gewoon.
4. **Terug omhoog.** De laptop staat weer open (zonder video, in één keer).

Telefoon en tablet zonder muis: geen vastzetten; de laptop staat stil zoals in 79.

**De video op het web:** uitgeknipt (de grond en de schermen doorzichtig, de randen ontmengd zoals de foto in 79)
en als **gestapelde video** (kleur boven, dekking onder) in H.264, getekend met WebGL. Zo is de grond overal precies
de grond van de site, in elke browser, ook Safari. De schermen worden per beeld in perspectief op hun plek gezet.
Sinds levering 84 twee banden in plaats van drie, hoogstens 2400 breed, en de schermen opnieuw gemeten (§12).

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

## 12 · De laptop van de opening, lichter en sneller (levering 84)

Lucas, 2 november, 21:34: *"De laptop animatie lagged enorm en mag wel sneller dan nu. Ook zitten de beelden er niet
goed in en gaan ze tijdens de animatie verkeerd vervormen."* De toets is `tests/laptop-84.test.mjs`; de metingen staan
in `kladblok/levering-84/`.

| Wat | Was (80 – 83) | Nu (84) |
|---|---|---|
| De video | drie banden (kleur, dekking, gaten): 2560 × 3258, 1920 × 2442, 1280 × 1626 | twee banden (kleur, dekking), zonder de lege bovenkant (206 van de 1248 rijen): **2400 × 1700**, 1920 × 1360, 1280 × 908 (`laptop-84-*`) |
| Het scherm | waar de derde band "gat" zei, binnen de vierhoek | waar de video **niet dekt** (1 − dekking), binnen de vierhoek |
| De hoeken | gemeten, over 7 beelden glad, vanaf beeld 40 doorgetrokken | **elk beeld gemeten** uit wat het toestel omsluit; de telefoon stijf |
| Het beeld op het scherm | 1600 breed, op ± 500 punten gelezen zonder verkleinen | **mipmaps** (1024 × 1024 en 512 × 1024) en anisotroop filteren |
| Welk beeld | `round(currentTime × 24)` (loopt soms een beeld voor) | het getoonde beeld (`mediaTime` van requestVideoFrameCallback) |
| Het doek | gemaakt bij de tweede scroll | gemaakt als de pagina rustig is; de beelden erop als de stand wisselt |
| De stilstaande schermen | op de hoeken van beeld 0 van de video | op de gaten van de **stilstaande foto** zelf (2 – 3 beeldpunten ruimer) |
| Snelheid | glijden 900 ms, de video 1,3 × | glijden **700 ms**, de video **1,8 ×** |

- **Waarom het haperde (waarschijnlijk; zijn computer kon ik niet meten).** Een video van 2560 × 3258 (of 1920 × 2442)
  is hoger dan veel videochips voor H.264 uitpakken (vaak 4096 × 2304, soms 4096 × 2160). Dan doet de processor het,
  met 8 miljoen beeldpunten per beeld, en elk beeld gaat daarna nog naar de grafische kaart. Nu blijft elke maat
  binnen 4096 × 2160, met ruim 40 % minder beeldpunten bij dezelfde breedte; ook op 1,8 × is er per seconde minder uit
  te pakken dan eerst op 1,3 × (1920 breed: 146 → 113 miljoen beeldpunten per seconde). Nakijken in Chrome:
  `chrome://media-internals` tijdens de animatie; bij `kVideoDecoderName` staat dan `D3D11VideoDecoder` (de videochip)
  of `FFmpegVideoDecoder` (de processor). Gemeten in een browser zonder
  grafische kaart (zie `kladblok/levering-84/meting.json`): werk per getekend beeld tijdens de video 231 – 247 ms →
  154 – 182 ms. Op een computer met een grafische kaart zijn beide veel kleiner; daar telt vooral dat de videochip
  het uitpakken nu zelf kan doen.
- **Waarom het scherm niet goed zat.** De oude hoeken waren glad gemaakt en vanaf beeld 40 doorgetrokken; het
  telefoonscherm was 11 × 15 beeldpunten te klein; de derde band miste bij de bijna dichte klep tot 76 000
  beeldpunten van het scherm (de grond scheen erdoor); en bij de telefoon die het beeld uit ging bleef een strook
  van zijn scherm leeg. De stilstaande foto had zijn eigen gaten, 2 – 3 beeldpunten ruimer: daar scheen de grond
  boven het scherm door (Lucas' schermafdruk). Nu: binnen elk scherm nergens grond, en nergens een scherm op de grond
  (in alle 111 beelden nagemeten, op 21 beeldpunten na).
- **Waarom het flikkerde.** Zonder kleinere versies leest het doek een beeld van 1600 breed op 500 punten: dunne
  lijnen en letters worden trappetjes die bewegen. Nu kiest de grafische kaart de passende maat, ook op de schuine
  klep.
- `scripts/laptop-video-na.py` meet de hoeken (ook die van de stilstaande foto); `scripts/laptop-video.mjs` maakt de
  video's. De oude video's (`laptop-80-*`) zijn niet meer in gebruik.

## 13 · De golf in de video, het witte podium en Wat we maken komt omhoog (levering 85)

Lucas, 3 november, bij lijst 70: *"Het mag wel wat meer snappy voelen en smooth door eerst rustig te sluiten en dan
als een soort golvende snelheid sneller en op het einde heel iets trager. Daarna met de zelfde snappy feeling de
volgende sectie openen met een animatie."* Bij lijst 71 (de films van de echte pagina): *"Hij mag nog wel wat sneller en
eerder al sneller gaan"*, en voor de sectie **D, zacht**. Bij de films daarna: *"De animatie mag nog wel sneller. Het
hoeft niet lang te zijn omdat het gewoon een kleine animatie tussendoor is"*, en: *"Het begin duurt voornamelijk te
lang en het mag wel een iets smoother golf hebben (niet visueel maar als gevoel). Ook zou ik dan eerst de pagina wit
willen hebben wanneer hij naar beneden gaat en dat dan de services omhoog komen alsof je nog op dezelfde sectie zit."*
De toets is `tests/opening-85.test.mjs`.

**Wat je voelt is de beweging in de video maal de snelheid.** Gemeten per beeld (bronpixels per beeld; de bovenrand
van de klep uit de hoeken, het midden van de telefoon, de rechterkant van de laptop uit de dekking):

| Beelden (videotijd) | 0 – 11 (0 – 0,46 s) | 12 – 46 (tot 1,92 s) | 47 – 58 (tot 2,42 s) | 59 – 104 (tot 4,33 s) |
|---|---|---|---|---|
| Wat er gebeurt | de klep komt los | de klep klapt dicht | een adem: dicht, de telefoon begint | de telefoon gaat rechts weg, de laptop links |
| Beweging in de video | 1 – 4 | 5 → 30 | 5 – 13 | 20 → 60 |
| Snelheid (levering 85) | **4 ×** | 4 × | 4 × | vanaf 2,8 s in een halve cosinus naar **2,5 ×** (bij 4,2 s) |

- **Waarom zo.** De video zwelt zelf al aan: de klep begint traag en de laptop gaat steeds sneller weg. Een snelheid
  die óók traag begint (de eerste golven in lijst 71), maakt het begin dubbel traag. Nu speelt het begin, de klep en de
  adem op 4 ×, en remt de snelheid af terwijl de laptop versnelt: zo blijft het gevoel één golf die aan het eind een
  tikje uitloopt. (Op 4 × duurt de adem 0,12 s; die helemaal gladstrijken zou ruim 10 × vragen.)
- **Hoe.** `GOLF` en `snelheid(t)` in `HalOpening80.astro`: bij elk getoond beeld (`mediaTime` van
  requestVideoFrameCallback) zet de opening `playbackRate` op de snelheid van dat moment, alleen als die meer dan
  0,02 verschilt. De video loopt gewoon door; zoeken per beeld (`currentTime`) zou haperen. Nog een scroll tijdens de
  video: `min(5, max(3, golf × 1,6))`.
- **Het witte podium en de sprong.** Bij 3,75 s videotijd (`WIT`; de telefoon is weg, de laptop gaat het beeld uit)
  krijgt de opening `o8-wit`: de lucht (`.o8-vlak`), de stand en het doek in 220 ms weg (`opening-80.css`). Bij 4,33 s
  (`SPRONG`; de laptop is uit beeld) springt de pagina zonder glijden naar Wat we maken (`scrollTo(0, doel2())`):
  alles in beeld is dan wit, dus je ziet de sprong niet. Terug naar boven: `o8-wit` gaat eraf en alles staat er weer.
- **Echte tijd na de tweede scroll** (beeld voor beeld nagemeten, 60 per seconde): de klep dicht na 0,48 s (84: 1,05),
  wit na 1,0 s, de sprong na 1,2 s (84: het glijden begon na 2,3 s), alles staat na 1,8 s (84: 3,0 s).
- **60 Hz en uitpakken.** Op 4 × zijn er 96 videobeelden per seconde: een scherm van 60 Hz laat er ongeveer vijf op de
  acht zien. Uitpakken: 1920 breed 251 miljoen beeldpunten per seconde, ± 0,7 s lang (84: 113 bij 1,8 ×; een
  videochip doet 4K op 60, 498 miljoen). Het doek tekent hoogstens één beeld per verversing van het scherm. Hapert het
  weer: `chrome://media-internals` (§12).
- **Wat we maken komt omhoog** (`maken-80.css`, `.m8-dicht` en `.m8-open`): de opening zet `.m8-dicht` (de kop, de
  producten en de regels onzichtbaar) zolang de inhoud van de sectie onder het scherm staat, en niet bij minder
  beweging. Bij de sprong: `.m8-open` met `--m8-begin` 60 ms (een witte tel); dan de kop, de producten 40 ms na
  elkaar (`--i`), de regels na 160 ms, elk 0,4 s omhoog over 20 – 36 px (2,2 vw), de dekking vol na 60 %
  (cubic-bezier(.22, .8, .2, 1)). Zonder de video (telefoon, schuifbalk, een toets) hetzelfde zodra de sectie voor een
  vijfde in beeld is; na elke video opnieuw. Staat de sectie al in beeld (terug in de geschiedenis), dan blijft hij
  gewoon staan. Omhoog schuiven is hier Lucas' uitdrukkelijke wens; de rest van de site komt zacht in beeld zonder te
  schuiven (levering 75). De build zet de `--i` van elk product in een klasse (`vs-…`, CSP).
- **Zo nagemeten.** Een film van de echte voorpagina, beeld voor beeld: een nepvideo (een canvas met de beelden van
  de video) en een klok die het harnas laat tikken (`performance.now`, `requestAnimationFrame`, timers en de
  animaties). `tests/opening-85.test.mjs` doet hetzelfde met een lege nepvideo.

## 14 · De laptop blijft staan, het scrollen speelt hem af (levering 87)

Lucas, lijst 74 (fade **f2**): *"Met scroll wil ik een soort korte energetic motion blur effect van blauw uur naar weer
wit. Ook wil ik dat op de eerste sectie geen scroll effect zit met de snappy scroll, dit staat buiten het motion blur
effect, dus je scrollt dus normaal naar de laptop waarna de laptop sectie sticky is en als je door scrollt je de
animatie van de laptop krijgt en je het motion blur effect krijgt tot de sectie wit is en de services komen. Het motion
blur effect moet overigens kort en subtiel zijn en niet te heftig."* Klik **k1**; compositie: *"Tekst mag iets naar onder
geplaatst worden … maar wel genoeg ruimte om alles heen."* De toets: `tests/opening-88-browser.test.mjs` (sinds levering 88; zie §15).

**Zo werkt het** (computer met een muis of trackpad, vanaf 1100 px, met beweging; `html.o8-aan`):

1. **Laden.** De fade f2 (wit boven, blauw uur onder, over het hele scherm), de titel iets lager met ruimte erom. Niets
   beweegt; de standen (k1) wisselen pas na de eerste beweging van de bezoeker.
2. **Gewoon scrollen** tot de laptop onder de balk staat. Geen wiel afvangen, geen glijden (zacht scrollen met het
   muiswiel blijft, `zachtscrollen.js`).
3. **De baan.** Het podium is `sticky` (top 56) in een baan van `--o8-R` = 160svh. Wat je scrolt kiest het beeld:
   de eerste 62,5 % van de baan is de video (`DEEL.video`), via de tabel `loop` in `src/data/laptopVideo.json` (elke
   centimeter even veel beweging, met een vloer zodat de stille beelden van de klep ook scroll krijgen;
   `kladblok/levering-87/beweging.py`). Vooruit speelt de video met een snelheid die binnen 0,16 s bijhaalt (hoogstens
   8 ×); terug of een sprong van meer dan 14 beelden: zoeken. Getekend op elk getoond beeld (`requestVideoFrameCallback`).
4. **De bewegingsonscherpte.** Zijdelings, alleen als de laptop beweegt: de vaart van dat beeld (`vaart`, gemeten in
   de video) maal de beelden die je verder bent, hoogstens 0,03 van de breedte, zacht gemiddeld; als je stopt is hij na
   140 ms weer scherp (`laptopdoek.js`, `uVeeg`).
5. **Het wit langs de snede.** Van 44 tot 66 % van de baan veegt het wit over de fade op 53° (126,87°), met een rand die
   zachter wordt naarmate je sneller scrolt (56 + hoogstens 200 px). Daarna is het podium wit (`o8-wit`) en schuift Wat
   we maken er 55svh overheen (`--o8-O`, z-index 3); de kop opent als hij voor een vijfde in beeld is.
6. **Terug omhoog** loopt alles terug: het wit gaat weg, de video spoelt terug.

**De video** staat als blob in het geheugen: Cloudflare geeft statische bestanden zonder Range terug, en zonder Range
kan een browser niet terugspoelen. Daarom `media-src 'self' blob:` in de CSP (`scripts/csp-scripts.mjs`). Een
sleutelbeeld elke 6 beelden (19 in de video), zodat zoeken snel is (`scripts/laptop-video.mjs`). Het laadvlagje vult
zich met de echte voortgang.

**Scherper.** De foto staat op 120,5 % van de breedte (de arm valt erbuiten) en er is een maat van 4608 px bij
(`laptop-4608.webp/.avif`, `sizes: (max-width: 900px) 160vw, 120.5vw`).

**Gemeten** (ruimte boven de kop · onder de feiten · klep in beeld · kop):

| Scherm | Boven / onder | Klep | Kop |
|---|---|---|---|
| 1440 × 900 | 115 / 87 | 216 | 104 px |
| 1366 × 657 | 76 / 48 | 158 | 48 px |
| 1920 × 1080 | 183 / 155 | 259 | 104 px |
| 1280 × 800 | 92 / 64 | 192 | 92 px |
| 2560 × 1440 | 363 / 335 | 260 | 104 px |

Telefoon, tablet en minder beweging: geen baan, alles staat stil (de fade f2 en k1, wit op blauw). Zonder WebGL of als de
video niet laadt ook: het script haalt `o8-aan` dan weg (opgeven()), zodat er geen stilstaande baan overblijft.

## 15 · De metro: het blauw rijdt naar beneden weg (levering 88)

Lucas, lijst 75 (de opening, kan beter): *"Ik wou echt een gemaakte animatie beter dan deze simpele. Ik wou een soort metro
gevoel met de motion blur creëren dat het voelt alsof het blauwe weg racet smooth naar het witte waarna de service omhoog
komen."* Om 12:13: *"Ik wou dat het effect naar beneden ging niet van de zijkant."* Lijst 76: **N3** (lamellen), **vanzelf**.
Om 16:05: *"De metro animatie mag ongeveer tegelijkertijd met de laptop verdwijnen. Misschien iets later als dat beter
oogt."* Lijst 77 (goed, met een notitie): *"Kan de achtergrond animatie meer motion blur gebruiken. Ook zou ik de animatie
iets sneller en in een golf mee willen laten bewegen (laptop en achtergrond iets smoother met elkaar bewegen.)"* De toets:
`tests/opening-88-browser.test.mjs`. Vervangt stap 5 van §14 (het wit langs de snede); de rest van §14
blijft.

1. **Tot beeld 86** speelt de scroll de video (`METRO_VIDEO` = 60 % van de baan). Bij beeld 86 is de telefoon weg en staat
   van de laptop nog een derde in beeld (tot 522 px op 1440; gemeten in de video).
2. **Daar vertrekt de metro** (`o8-rijdt`; `src/scripts/metro.js`, soort `n3`). Het blauwe uur valt in **tien schuine banen
   op de snede** (53,13°: horizontaal 0,75 × de hoogte) naar beneden weg, van rechts naar links als één golf (de helft van de
   rit tussen de eerste en de laatste baan). Elke baan trekt op zoals een metro (de weg ∝ t^2,2) en is onscherp zoals een
   sluiter van 0,07 s die hem ziet (acht punten op zijn weg, hoogstens 0,6 × de hoogte). De fade is die van `.o8-vlak`,
   stop voor stop. Het doek tekent op 0,75 van de css-pixels (zonder grafische kaart 0,4).
3. **De laptop gaat mee, in de golf.** Hij gaat verder op de klok van de rit, alsof beeld 86 → 110 over `METRO_MEE` 1,125
   van de rit speelt (iets sneller dan het tempo van de video). De laptop gaat links het beeld uit na driekwart van de rit,
   terwijl de laatste baan valt.
   **Sinds levering 88b** speelt de video daarbij niet: hij houdt beeld 86 vast en het doek (`laptopdoek.js`, `uSchuif`)
   schuift de laptop zelf, elk schermbeeld. Vanaf beeld 76 schuift de laptop in de video alleen nog naar links, zonder van
   vorm te veranderen: **38,0 beeldpunten per beeld op 1920** (rechte lijn door beeld 86 – 104, hoogstens 5 ernaast; op 1440
   is dat 34 px). De rand van de telefoon (buiten beeld) gaat 12,5 per beeld naar rechts; de grens ertussen ligt op 0,75 van
   de breedte. De onscherpte is die van de banen: wat de laptop aflegt in 0,07 s (3,7 % van de breedte, hoogstens 5 %), aangroeiend in
   het eerste achtste van de rit.
   Liep de video bij het vertrek nog achter, dan begint de laptop waar hij stond en loopt dat verschil in ± 0,4 s weg.
   Eén doel voor de video (`videoDoel`): tijdens de rit beeld 86, daarna weer de scroll. Waarom (Lucas, 4 november: *"In de
   video lagged de laptop een beetje"*): de scroll en de rit gaven de video elk een eigen doel (4 beelden verschil), dus
   stopte, zocht en speelde hij om beurten en sloeg hij aan het eind beeld 100 – 103 over; en de video heeft 24 beelden per
   seconde terwijl het blauw elk schermbeeld tekent.
4. **De rit duurt 0,8 s en loopt vanzelf**: de scroll start hem, de klok rijdt hem. Scrol je meer dan een kwart baan voor de
   rit uit, dan haalt hij in (tot 2,5 ×). Terug scrollen (24 px voor het vertrekpunt) laat hem terugrijden (1,5 ×).
5. **Wit, dan Wat we maken.** Als alles wit is (`o8-wit`), komt Wat we maken omhoog (90 ms later, de beweging uit §13), op
   het scherm waar je bent: de sectie ligt al over het podium (`80svh + 0,4 × --o8-R + 8px`), onzichtbaar en niet aan te
   klikken tot het blauw weg is. Bij terug gaat hij eerst weg (0,18 s), dan komt het blauw terug.
6. **Ruimte in Wat we maken.** De 64 px tussen de zin en de producten stond sinds levering 80 op 0 (`.h-pagina ul` won van
   `.m8-rij`); nu `.m8 .m8-rij`. Met die ruimte past de sectie nog steeds onder de balk op 1440 × 900.

Telefoon, tablet, minder beweging, zonder WebGL of zonder video: zoals §14, alles staat stil. De metro is langer dan de
gewone 0,6 s van het merk; dat is zijn uitdrukkelijke wens.

