# Levering 110 · De nieuwe titel, het blok onder de video en algemenere teksten

**16 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Gekozen in lijst 119 tot 122 en in je berichten van 01:39 tot 03:37. In lijst 122 koos je bij de levering a, en om 03:29 schreef je: *"Laten we het zoals dit doen voor nu. Ik vond de bijgevoegde opbouw het beste."*

## De titel

| | Engels | Nederlands |
|---|---|---|
| Titel | *We make your brand impossible to ignore* | *Wij maken je merk niet te negeren* |

- **Leestekens:** de titel heeft er geen (lijst 122, Q3 a). De andere koppen houden hun punt.
- **Opbouw** (lijst 122, opbouw b):
  - een kleine aanloop: *We make your brand*;
  - één grote regel die de kolom vult: *IMPOSSIBLE TO IGNORE*;
  - de aanloop is 42 % van de grote regel.
- **Maten:**

  | | 1440 | 390 |
  |---|---|---|
  | Engels | 84 px en 35 px | 33 px en 14 px |
  | Nederlands | 109 px en 46 px | 43 px en 18 px |

- **Groter dan voorheen:** de kop was hoogstens 96 px. Nu mag de grote regel tot 200 px (op de telefoon 80 px), zodat een korte zin echt groot wordt.
- **De video:** de kop bedekt hoogstens 15 % van de video. Nu is dat 8 % in het Engels en 10 % in het Nederlands. Die grens staat in de toets.

## De letter: VISUAILS Display Blok

- **Wat het is:** een blokletter, alleen voor deze ene kop. Hij is opgebouwd uit de maten van het V-merk:
  - een stam van 21,8 % van de kaphoogte;
  - vierkante binnenvormen;
  - één snede op 53,13°;
  - één zachte hoek linksboven (R = 24,7 %);
  - vierkante punten.
- **De richting:** in lijst 119 koos je C, met de notitie *"Ik wil de letters breder hebben"*. Daarom is het richting D geworden, net iets breder dan C, zoals in de opbouw die je koos.
- **Bestanden:**
  - `public/fonts/visuails-display/VISUAILSDisplayBlok-Bold.woff2`, 1,7 kB, alleen op de voorpagina vooraf geladen;
  - de bron: `docs/letter/bron/blok.py`;
  - de `.ttf` voor je eigen programma's: `docs/letter/fonts/VISUAILSDisplayBlok-Bold.ttf`.
- **Geen woordmerk:** VISUAILS schrijf je nooit in deze letter; dat blijft het woordmerk.

## Onder de video

Jouw tekst van 03:29:

> **Every visual your brand needs, without the effort.**
> What VISUAILS does · **We take the whole visual process off your hands.** Your time goes to what grows your brand: selling. And you always have something new to post.

> **Elk beeld dat je merk nodig heeft, zonder moeite.**
> Wat VISUAILS doet · **Wij nemen het hele beeldproces van je over.** Zo gaat je tijd naar wat je merk laat groeien: verkopen. En je hebt altijd iets nieuws om te posten.

- **Opbouw:**
  - links de kop, hoogstens 48 px en altijd twee regels (op de telefoon 25 px);
  - rechts het label en de twee zinnen, met de eerste in inkt en de rest in grijs (5,9 : 1);
  - de rechterkolom staat onder het witte vlak met de stappen.
- **Ruimte (03:37):** tussen de video en het blok zit 40 px, op de telefoon 32 px.
- **Telefoon:** het blok komt na het vlak met de stappen, zodat de bestelknop dicht bij de video blijft (mijn advies uit lijst 121).
- **De punt:** de kop van het blok heeft een punt, omdat je bij Q3 koos voor geen leestekens alleen in de titel. Wil je ook hier geen punt, dan is dat één teken in `src/data/banner94.js`.

## Algemener: niet alleen catalog en lifestyle

| plek | was | wordt |
|---|---|---|
| De beschrijving voor zoekmachines, op elke pagina (`src/data/schema.js`) | *catalog, lifestyle and video visuals made from a few phone photos* | *every visual your brand needs, made from a few photos of each product* |
| De zin in het vlak naast de video | *product photos, lifestyle and video* | *every visual your brand needs, ready for your shop, your feed and your ads* |
| De prijsregel onder Every image for your brand | *One product: €90 (catalog) or €110 (lifestyle).* | *Priced per product: the more you order, the lower the rate.* (de bedragen staan op /pricing) |
| De beschrijving van /start | *Pick a look for catalog or lifestyle images.* | *Choose what you want made, and the next step follows.* |

Wat bewust blijft:
- **/plans:** de beschrijving noemt alleen catalog en lifestyle, en credits gelden nu ook alleen daarvoor.
- **Prijzen, de €1-proef en de vragen:** die noemen catalog en lifestyle per dienst, en dat klopt.

## Uit lijst 119

- **IBM Plex Mono 600 in plaats van 900 (Q4 b):** dit gaat om de namen van de looks in de galerij op de voorpagina, 63 labels. De browser maakte er "bolder" (900) van, een gewicht dat de site niet heeft. Nu staan ze op 600.
- **Lichtere Studio-beelden (Q5 a):** de vijf stilstaande kaarten van Studio zijn samen 247 kB in plaats van 701 kB, met kwaliteit 75 en dezelfde bron. Ze hebben `?v=110`.

## Bestanden

| bestand | wat |
|---|---|
| `src/data/banner94.js` | de titel, de zin in het vlak, de tekst onder de video |
| `src/components/HalBanner94.astro` | de aanloop en de grote regel |
| `src/styles/banner-94.css` | de blokletter, de nieuwe maten (`--b94-em`, `--b94-max`) |
| `src/components/HalOnderVideo110.astro` | **nieuw**: het blok onder de video |
| `src/styles/onder-video-110.css` | **nieuw** |
| `src/components/VoorpaginaHal.astro` | het blok op de voorpagina, de prijsregel |
| `src/layouts/Layout.astro` | de blokletter vooraf geladen op de voorpagina |
| `src/data/schema.js` | de beschrijving voor zoekmachines |
| `src/pages/start.astro`, `src/pages/nl/start.astro` | de beschrijving van /start |
| `src/styles/galerij-80.css` | Plex Mono 600 |
| `src/styles/studio-kaart-105.css`, `public/img/kaart/studio-1, 2, 4, 5, 6.webp` | de lichtere Studio-beelden |
| `public/fonts/visuails-display/VISUAILSDisplayBlok-Bold.woff2` | **nieuw**: de letter |
| `docs/letter/bron/blok.py`, `docs/letter/fonts/VISUAILSDisplayBlok-Bold.ttf`, `docs/letter/LEESMIJ.md` | de bron en de uitleg van de letter |
| `docs/DESIGN.md`, `docs/KLEURENSCHEMA.md` | bijgewerkt |
| `tests/banner-kop-110-browser.test.mjs` | **nieuw**: de kop en het blok, op 1440, 1280, 390 en 360 |
| `tests/voorpagina-80.test.mjs`, `tests/vanaf-bedragen.test.mjs`, `tests/naloop-a2-browser.test.mjs`, `tests/doorloop-90.test.mjs` | volgen de nieuwe teksten |
| `package.json` | de nieuwe toets, ook in `npm test` |

## Toetsen

- **De hele reeks is gedraaid:** 274 snelle toetsen en 81 browsertoetsen, alle groen (de nieuwe `banner-kop-110`: 104 goed). Drie browsertoetsen (voorpagina80, letter77, beweging83) vielen om in de volle run; los gedraaid zijn ze groen. Bij voorpagina80 en letter77 lag het aan de oude maten en de oude letter in de toets zelf, en die heb ik bijgewerkt.
- **De kop bedekt** in het Engels 7,9 % van de video (1440) en 7,6 % (390), in het Nederlands 10,3 % en 9,9 %.
- **Leesbaarheid:**
  - de aanloop is minstens 14 px;
  - de tekst onder de video is 17 tot 19 px;
  - grijs op de grond haalt 5,9 : 1;
  - elke kop is hoogstens 2 regels;
  - nergens loopt de pagina zijwaarts weg.
