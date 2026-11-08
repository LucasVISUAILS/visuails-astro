# Levering 89 · Posterkleuren, de logoposter en het tekstlogo overal

**5 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 88c; **88c en 89
gaan samen live**. Eerst opruimen (zie §6), dan uitrollen. De kleuren en metingen staan in `docs/KLEURENSCHEMA.md`
("Levering 89"), de rest in `docs/DESIGN.md` ("Posterkleur, velden en het logo").

---

## 1 · Wat je vroeg

- **07:58:** *"Geen blauwe fade meer, volledig op posters."*
- **08:00:** *"Nooit harde randen bij dit soort grote achtergrond secties."*
- **08:20:** *"Favicon logo krijgt geen korrel alleen het omhulsel."*
- **08:41:** *"Nieuwe kleuren ook aan kleine dingen op de website toepassen waar mogelijk en het niet overheersend word. Ik wil
  altijd een poster achtige kleuren dus nooit clean alle kleuren achter elkaar, het mag juist wat random zijn zoals in de
  posters en korrel bevatten."*
- **08:49:** *"Ik wil trouwens het logo en tekstlogo weer combineren. Reken altijd uit wat de marges/groottes moeten zijn zodat
  je dit voortaan consistent houd wanneer je weer dit soort beelden gaat maken."*
- Je keuzes: lijst 78 (de velden en hun plekken), lijst 81 (poster C1 scroll, ag1 – ag4, favicon c, kleur k7), lijst 82
  (L2 en L3 goed, lockup alleen in beelden en documenten, posterkleur E1 – E7 goed, E8 niet, E9 a) en lijst 83 (het
  deelplaatje van de voorpagina: C2 b, "Venster"). Bij Bestellen: *"De vorm die die Bestellen knop heeft gebruiken we niet
  meer. Dit heb ik al vaker gezegd."* Hij blijft een pil.

## 2 · Wat er nu is

1. **De logoposter** (lijst 81 C1). `HalPoster89` in plaats van HalPoster80: de scroll drijft de animatie (het tekstlogo
   trekt zich samen in de V, de kop komt na de klap, aan het eind groeit de V tot de foto met de look), op het veld P2 Snede (WebGL, met
   korrel). Boven en onder loopt het podium zacht uit in het wit; de blauwe fade erboven (`p8-fade`) is weg, en alles wat
   alleen HalPoster80 gebruikte ook. Nieuw: de poster laadt zijn animatie meteen bij het laden (met lage voorrang), niet pas
   in de buurt; anders werd de baan pas laat 340svh lang en sprong alles eronder 240svh op (gevonden door
   `tests/beweging-83`).
2. **Anti-gravity** (lijst 81, ag1 – ag4): de foto's in de galerij hangen even en kantelen iets als je snel scrolt
   (hoogstens 8 px en 1,2°), Wat we maken en Hoe het werkt komen zacht omhoog, de pijl van een knop beweegt met een zachte
   versnelling. Minder beweging: niets.
3. **Posterkleur in het klein** (lijst 82, E1 – E7; `src/styles/posterkleur.css`, `src/scripts/posterkleur.js`,
   `src/data/stukken.js`, de stukjes in `public/img/stuk/`):
   - E1 de lege fotoplek, zolang een beeld laadt (de galerij, /gallery, de looks, je beelden in Studio): een stukje poster,
     weg zodra het beeld er is. In Studio (geen script) ligt het onder het beeld, alleen onder een jpg.
   - E2 het ene inktblok op een pagina zonder €1-blok (het slot onderaan): een stukje nacht of snede.
   - E3 Bestellen bovenin: een stukje snede, de gloed rechts achter de pijl, een pil; onder de muis alleen de grond donkerder.
   - E4 het gezicht met initialen in Studio.
   - E5 "geleverd" (Studio, het portaal, /admin, /account): één stukje nacht voor de hele lijst; de andere standen niet.
   - E6 het balkje met de schuine kop (de strook op /lifestyle) legt een vaste poster bloot, in vier stappen.
   - E7 het logo onder de muis en met de toets erop: een venster op de snede, zonder roze, in plaats van de schommel. Bij
     minder beweging meteen.
   Toeval maar vast per plek, twee buren nooit hetzelfde, hoogstens drie stukjes per pagina buiten de grote plekken.
4. **Velden op de grote plekken, zonder harde randen**: achter de laptop **B1 Horizon** (en de metro neemt het veld mee:
   zijn banen tekenen hetzelfde beeld), het **€1-blok B4 Nacht** (het licht rechtsonder, weg van de tekst) en de **404 B4
   Nacht met de witte V**. De onderste 12 % van B1 loopt naar blauw uur, waar de uitloop van 88c het verder het wit in brengt.
5. **Roze** `#F1B7AC` als token (`--h-roze`), alleen als veldkleur. `docs/KLEURENSCHEMA.md` en `docs/DESIGN.md` hebben een
   paragraaf "Levering 89": de velden met korrel, posterkleur in het klein, geen harde randen en geen blauwe fade, het logo
   (K5, de V, de lockup: de V 2 kaphoogtes, het tekstlogo op het zwaartepunt van de V, één arm ertussen, 1 kaphoogte vrije
   ruimte, nooit kleiner dan 16 px kap) en het raster voor beelden (u = korte zijde / 12, de tabel ook in
   `kladblok/levering-89/raster.json`).
6. **K5 overal** via `src/data/woordmerk.js`: de sprite en de fades van de site (de fades in de maten van K5, uit
   `WOORDMERK_SNEDE` en `WOORDMERK_UITLOOP`; geen −797,25 meer), Studio, het portaal, /admin, /account (de dichte zijbalk
   van Studio toont de V, want K5 is niet tot zijn V af te knippen), de mails (met de **lockup L2** in de kop,
   `public/img/mail/lockup-plaat.png`), de fotogids (opnieuw gemaakt), de factuur (de **lockup L2** bovenaan) en de
   deelplaatjes op het raster: **C1** voor elke pagina, **C2 b "Venster"** voor de voorpagina (NL en EN), **C3** voor de
   404. Jpeg, 69 – 116 kB (WhatsApp toont tot 300 kB).
7. **Favicon c** uit het pakket 89 (een vierkant met een veld, de V wit, zonder korrel op de V). De noot in Layout klopt
   weer.

## 3 · Gemeten

| Wat | Slechtste beeldpunt (met korrel) | Eis |
|---|---|---|
| Bestellen (E3), wit op het stukje | 6,89 : 1 · onder de muis 8,86 : 1 | 4,5 |
| Het slot (E2) | 15,99 : 1 | 4,5 |
| Het €1-blok (B4) | 15,75 : 1 | 4,5 |
| "Geleverd" (E5) | 15,99 : 1 | 4,5 |
| De initialen (E4), op elk van de acht stukjes | 4,89 : 1 of meer | 4,5 |
| De naam van de stand op het veld achter de laptop | 4,91 (1440) · 5,07 (1280) · 5,88 (1920) · 6,03 (390) | 4,5 (op de fade van 88c was het 3,91) |
| De witte V op de 404 | 15,99 : 1 | 3 |
| Het venster in het logo: elk punt van de stukjes · gerenderd in de balk | 3,64 : 1 · 4,17 : 1 | 3 |
| De deelplaatjes, onder de kop | C1 7,31 · C2 b 17,34 (NL) en 16,77 (EN) · C3 14,24 | 4,5 |
| De poster: de grootste sprong van rij tot rij aan de randen | 0,0 | hoogstens 6 |

## 4 · Wat er niet in zit, en waarom

- **B6 Insnede op "het slot boven de voet"** (lijst 78 C4). Het slot onderaan is op elke pagina zonder €1-blok het ene
  inktblok, en dat wordt volgens lijst 82 E2 (later gekozen) een stukje nacht of snede met witte tekst. B6 is licht: dat kan
  niet allebei. Zeg welke strook je bedoelde, dan zet ik hem erop.
- **B5 Adem** voor de inlog van Studio en de privélink: je zei "misschien".
- **B3 Golf**: had geen plek.
- **E4 in het portaal, /admin en de aanbevelingen**: daar staan geen gezichten of initialen; alleen Studio heeft ze.
- **E6 in Studio**: het creditbalkje en de slotmeter staan in de css, maar op geen enkele pagina; alleen de strook op
  /lifestyle heeft het balkje.
- **E7 op het grote woordmerk onderaan**: daar blijft de uitloop (lijst 78 C4: "De uitloop blijft"). Op een donkere grond
  (Studio op inkt, /admin en /account donker) blijft de schommel naar blauw licht: een donker venster op een donkere grond zie
  je niet.
- **E7 in de balk**: daar staat sinds 14 oktober de V, niet het tekstlogo. De V in de balk en in de lade krijgt hetzelfde
  venster, zodat elk logo onder de muis hetzelfde doet. Wil je het alleen op het tekstlogo, dan haal ik `venster` weg bij de
  twee `VMerk` in `Layout.astro`.
- **Bestellen onderaan het menu op de telefoon** blijft de snede: E3 is de knop bovenin, en zo blijven het er drie per pagina.
- Het venster stond in lijst 82 op 3,95 : 1; de stukjes zijn nu 640 px breed (17 kB in plaats van 124 kB), en dan is het
  slechtste punt 3,64 : 1. De eis voor een logo is 3 : 1.

## 5 · Nagekeken

- Nieuw: `tests/posterkleur-89-browser.test.mjs` (45 controles): de stukjes bestaan en zijn gemeten, het venster zonder roze
  en minstens 3 : 1; de keuze vast per sleutel en nooit twee gelijke buren (rij, raster, Studio); alleen "geleverd"
  verandert; hoogstens drie stukjes per pagina (alle 97 pagina's in de HTML, acht in de browser); de scroll drijft de poster
  en hij heeft geen harde rand; tekst op elk stukje gemeten op het slechtste beeldpunt; de lege fotoplek (buren, en weg
  zodra het beeld er is); het venster onder de muis, met de toets erop en bij minder beweging. Alleen Playwright en sharp.
- Bijgewerkt: `blauw-uur-86` (K5 in plaats van −797,25, favicon c, de deelplaatjes op het raster, Bestellen, het inktblok en
  het balkje van levering 89), `voorpagina-80` en `beweging-83` (de poster heet p9; de galerij mag even uitlopen),
  `studio-merk` (het venster), `invoice-pdf` (de lockup bovenaan), `mails-merk` (het lockupplaatje),
  `minder-sjabloon-browser` (de pijl in een knop mag kort en zacht bewegen, ag4) en `opening-89-browser` (jouw fix: geen
  ffprobe meer nodig). Geen nieuwe of veranderde toets heeft ffmpeg, ffprobe of Python nodig.
- `npm test`: alle 280 stappen groen (de build en 279 toetsen), zie §7.
- De film: `kladblok/levering-89/voorpagina-89.mp4` (1280 × 800, 12,5 s): de opening met B1 achter de laptop en de rit
  (de metro neemt het veld mee), dan de logoposter (het tekstlogo op het veld, de V met de kop, de foto), het €1-blok in B4
  en het tekstlogo in de voet onder de muis. Gemaakt met `kladblok/levering-89/film-voorpagina.cjs` in drie delen (zonder
  grafische kaart bleef het schermbeeld bij de galerij hangen; de galerij zit er daarom niet in, de anti-gravity zie je op
  de site zelf).
- Gezien bij het maken van de film, niet van 89: een sprong naar Wat we maken meteen na het laden liet in de browser zonder
  grafische kaart de laptop nog over Wat we maken staan (de rit was onderweg). `tests/opening-89-browser` (de sprong) is
  groen; kijk het op je eigen computer even na.

## 6 · Opruimen in je map, vóór `UITROLLEN.bat`

Verwijder deze bestanden (ze bestaan niet meer in 89):

```
tests\opening-88-browser.test.mjs
src\components\HalPoster80.astro
src\scripts\poster80.js
src\styles\poster-80.css
public\img\og-nl.png
public\img\og-en.png
```

## 7 · De testreeks

5 november, na de laatste wijziging in `src/`: de build, en daarna elke stap van `npm test` (279 toetsen) groen. De ene die
eerst faalde (`test:sjabloon`: de pijl van een knop gleed) is bijgewerkt naar je keuze ag4 en daarna groen. De poster laadt
nu meteen; dat vond `test:beweging83`.
