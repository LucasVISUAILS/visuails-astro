# Levering 115 · Het doek op de kaarten, één opbouw per sectie, de kop rustiger

**17 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je keuzes uit lijst 124 (het doek en het sectiesysteem) en lijst 125 (de kop rustiger). Het pakket (bureaubladen,
deelplaatjes en de grond van de animaties op het doek) en het sectiesysteem op de andere pagina's komen in levering 116.

## 1 · De kop op de video: effen (lijst 125, C)

- **Wat je zei** (02:52): *"de koptekst op het begin iets minder intens ... met het groene. Het is wat veel"*.
- **03:20:** *"Ik wil dat de kleuren echt perfect kloppen zodat het smooth aanvoelt"*. Om 03:40 koos je uit de vergelijking:
  de hele kop in één kleur.
- **Nu:**
  - er staat geen beeld meer in de letters. De hele kop is wit of inkt, met een dunne zachte rand in de andere kleur, zodat
    hij leest waar het achter de letters gemengd is;
  - **hoe de kleur gekozen wordt:**
    - per videobeeld meet het script het licht achter de letters, alleen waar de letters zelf staan;
    - het meet in lineair licht, zoals contrast gemeten wordt (WCAG);
    - het meet op een kopie van de video van 192 × 108. Nagemeten tegen de video zelf op 1920 breed: op 0,01 gelijk;
    - wit leest het slechtst op het lichtste deel, inkt op het donkerste deel. De kleur met het hoogste contrast op dat
      deel wint;
  - **geen geflikker:** de kop wisselt pas als de andere kleur 15 % beter is, en vloeit dan over in ± 0,25 s. Na het laden
    of een gekozen stap staat hij meteen goed;
  - de telefoon gaat er in de eerste scène nog steeds overheen.
- **Zonder WebGL** (heel oude browsers) blijft het oude negatief.

## 2 · Elke kaart is een stuk van het doek (lijst 124: A, stille korrel, alles)

- **Waar:** het €1-blok, het slot, de Studiobrief in de voet en de kaarten op de dienstpagina's.
- **Het doek:**
  - het doek is A, nacht en mint (`scripts/doek.py`). Daar zijn acht stukken uitgeknipt (`public/img/doek/stuk-0 … 7.webp`,
    elk ± 6 kB, `scripts/doek-stukken.py`);
  - de kaarten op een pagina krijgen op volgorde elk een eigen stuk (`src/scripts/kaartdoek.js`);
  - over elk stuk ligt één tegel stille korrel (`korrel.webp`, 40 kB, voor alle kaarten samen).
- **Het WebGL-veld is uit:** `kaartveld.js` wordt niet meer geladen. Een plaatje kost per beeld niets, dus de pagina rekent
  minder.
- **Leesbaar:**
  - het licht in de stukken is gedempt, tot hoogstens luminantie 0,14;
  - de korrel maakt het hoogstens 9 % lichter;
  - gemeten in de browser, onder alle tekst op 14 kaarten op 1440 en 390 breed: wit haalt overal minstens 4,5 : 1
    (`kaartveld-100-browser`).
- **Het logo** staat niet op de kaarten (Q3 a): dat komt alleen op de marketingbeelden in het pakket.

## 3 · Eén opbouw voor elke sectie van de voorpagina (lijst 124: SY goed, Q5 – Q8)

| | was | nu |
|---|---|---|
| kolom | 1200 | 1320 (60 px marge op 1440, 300 op 1920) |
| kop | 64 (in een zijkolom 50) | 88 op 1440, 112 vanaf 1833, 40 op de telefoon |
| lucht tussen secties | 128 | 160 |
| kaarten van *Wat we maken* | 285 breed | 374 breed |
| de looks | 330 hoog | 429 hoog (1,3 keer zo groot) |

- **De opbouw:**
  - de kop staat altijd bovenaan over de hele kolom, nooit meer in een zijkolom;
  - het label staat rechts, op de lijn van de onderkant van de kop;
  - daaronder een haarlijn, en 48 px tot de inhoud;
  - de inhoud mag daaronder links en rechts staan (de Z van lijst 113 blijft).
- **Op de telefoon** staat het label boven de kop en alles in het midden.
- **Gemeten:** alle vijf de koppen op 1440, 1920 en 390 breed staan op één of twee regels, en er is nergens een horizontale
  scroll.
- **Bestand:** `src/styles/secties-115.css`, met het systeem in de kop van het bestand.

## Bestanden

| bestand | wat |
|---|---|
| `src/components/HalBanner94.astro` | de kop effen (lijst 125, C) |
| `src/styles/kaart-115.css`, `src/scripts/kaartdoek.js` | nieuw: de kaarten als stukken van het doek |
| `src/layouts/Layout.astro` | laadt kaart-115.css en kaartdoek.js, niet meer kaartveld.js |
| `public/img/doek/` | nieuw: acht stukken en de korrel |
| `scripts/doek.py`, `scripts/doek-stukken.py` | nieuw: maken het doek en de stukken |
| `src/styles/secties-115.css` | nieuw: het systeem van de secties |
| `src/components/VoorpaginaHal.astro` | laadt secties-115.css |
| `src/components/HalMaken80.astro` | de kaarten van Wat we maken 1,3 keer zo groot |
| `tests/kaartveld-100-browser.test.mjs`, `kleur-100.test.mjs`, `blauw-uur-86.test.mjs`, `banner-kop-110-browser.test.mjs` | bijgewerkt |

## Toetsen

- **De hele reeks** is gedraaid na een nieuwe build: 274 snelle toetsen en 81 browsertoetsen, alle groen.
- **`kaartveld-100-browser`** toetst nu het doek in plaats van het WebGL-veld. Dezelfde meting als eerst: het slechtste punt
  onder alle tekst op 14 kaarten, op 1440 en 390 breed, moet minstens 4,5 : 1 halen.
- **`banner-kop-110`** toetst de effen kop: één kleur, gekozen op contrast, met een rand.
- **`blauw-uur-86`** en **`kleur-100`** zijn bijgewerkt voor het doek en de volgorde van de stijlbladen.
