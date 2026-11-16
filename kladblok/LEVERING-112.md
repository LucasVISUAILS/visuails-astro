# Levering 112 · Fase 5: de beelden (deelplaatjes, fotogids, logo-animaties)

**16 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Om 06:09 schreef je: *"Maak voor nu alvast wat je van fase 5 kan maken en zet alles in de map"*. Fase 5 van
`kladblok/PLAN-KAARTVELD-100.md` is: logo-animaties in zwart, wit en mint, de deelplaatjes, de bureaubladen uit het pakket,
en (zo stond het in `tests/blauw-uur-86.test.mjs`) de fotogids.

Deze levering heeft twee delen:
- **in de site:** de deelplaatjes en de fotogids (dit bestand);
- **in het logopakket:** de animaties en de deelplaatjes, in `images/Logo/visuails-logo-100/` (zie de LEESMIJ daar).

## De deelplaatjes (wat je ziet als iemand de site deelt)

**Wat er verandert:**
- **De grond is het kaartveld van de site**, in plaats van het blauwe veld:
  - elk plaatje is één kaart met een eigen stuk veld;
  - onder de tekst en het logo wijkt het licht, zoals op de kaarten.
- **De kop is de titel van de voorpagina**, *We make your brand impossible to ignore* / *Wij maken je merk niet te negeren*:
  - in VISUAILS Display Blok, de aanloop klein en de grote regel groot;
  - rechtstreeks uit `src/data/banner94.js`, dus verandert de titel, dan draai je `npm run og` en de plaatjes volgen;
  - de oude zin (*All your product imagery. Without a shoot.*) staat er niet meer op.
- **Logo en kop zijn wit.**

**Op de voorpagina** staat vorm b uit lijst 103 (*Van jouw foto tot het beeld*, gekozen om 17:23):
  - rechts de NON/STD-hoodie in drie stappen, met de stap eronder: 01 jouw foto, 02 productfoto's, 03 op model;
  - bij 02 staan de drie productfoto's onder elkaar (voor, achter en een detail), zoals je om 17:31 voorstelde;
  - het tekstlogo linksboven, de kop linksonder;
  - de kolom voor de kop is daar smal, dus de grote regel staat op twee regels (*IMPOSSIBLE / TO IGNORE*, *NIET TE /
    NEGEREN*). Op één regel zou hij 43 tot 55 px zijn, zo is hij 83 tot 106 px en blijft hij leesbaar op een telefoon;
  - de twee packshots staan in hun geheel op hun eigen witte grond; het detail, jouw foto en het beeld op model vullen hun
    vak vanuit het midden.

**Wat blijft:**
- de vormen C1 (elke pagina) en C3 (de 404) uit lijst 82 en 83;
- het raster voor beelden: u = 52,5 px, marge 1 u, de onderste basislijn op 11 u;
- de bestandsnamen.

**Gemeten** (het slechtste beeldpunt onder elke letter en elk logo):

| plaatje | slechtste punt | kop en aanloop | grootte |
|---|---|---|---|
| og-en.jpg (C1) | 9,3 : 1 | 103 en 43 px | 83 kB |
| og-nl.jpg (C1) | 10,7 : 1 | 112 en 47 px | 83 kB |
| og-voorpagina-en.jpg (b) | 8,9 : 1 | 83 en 35 px | 134 kB |
| og-voorpagina-nl.jpg (b) | 8,7 : 1 | 106 en 44 px | 134 kB |
| og-logo.jpg (C3) | 7,3 : 1 | | 68 kB |

Het slechtste punt van de voorpagina telt ook de stappen onder de beelden mee (IBM Plex Mono, 13 px, wit).

**Let op na het uitrollen.** De plaatjes hebben dezelfde namen als voorheen. WhatsApp, LinkedIn en Facebook bewaren een
deelplaatje een tijd. Wil je het nieuwe meteen zien, laat de pagina dan opnieuw lezen:
- LinkedIn: Post Inspector;
- Facebook en WhatsApp: de Sharing Debugger van Meta.


## De fotogids (de pdf voor klanten)

- **Wat:** `public/downloads/visuails-fotogids-nl.pdf` en `-en.pdf`, gemaakt door `scripts/lib/fotogids-html.mjs`. Die
  stond nog in blauw uur.
- **Nu:**
  - het woordmerk en de streep van de labels zijn zwart `#090D0B`;
  - de grijzen zijn die van de site;
  - het blok met de vijf vragen loopt van zwart via mint 800 naar mint 700 (wit erop minstens 7,0 : 1).
- **Alleen herkleurd:** de indeling, de tekst en de hoeken zijn hetzelfde.

## Bestanden

| bestand | wat |
|---|---|
| `scripts/make-og.mjs` | de deelplaatjes op het kaartveld, met de titel uit `banner94.js`; `--pakket <map>` maakt ook de png's voor het logopakket |
| `public/img/og-en.jpg`, `og-nl.jpg`, `og-voorpagina-en.jpg`, `og-voorpagina-nl.jpg`, `og-logo.jpg` | opnieuw gemaakt |
| `scripts/lib/fotogids-html.mjs` | de fotogids herkleurd |
| `public/downloads/visuails-fotogids-nl.pdf`, `visuails-fotogids-en.pdf` | opnieuw gemaakt |
| `tests/blauw-uur-86.test.mjs` | toetst de nieuwe deelplaatjes en de fotogids zonder blauw uur |
| `docs/KLEURENSCHEMA.md` | bijgewerkt |

## Toetsen

- **De hele reeks is gedraaid na een nieuwe build:** 274 snelle toetsen en 81 browsertoetsen, alle groen.
- **`proefbrowser`** viel één keer om terwijl de hele reeks tegelijk liep. Los gedraaid is hij groen (22 van 22).
- **`blauw-uur-86`** vroeg nog om de oude deelplaatjes (de kop uit TAGLINE in VISUAILS Display) en om de fotogids in
  blauw uur. Hij toetst nu:
  - de kop uit `banner94.js` in VISUAILS Display Blok;
  - het kaartveld als grond;
  - een fotogids zonder blauw uur.
- **`fotogids`** controleert dat de twee pdf's bij de nieuwe bron horen (76 van 76).
- **`make-og.mjs` meet zelf** en stopt als:
  - tekst onder 4,5 : 1 komt, of een logo onder 3 : 1;
  - de aanloop kleiner wordt dan 11,5 px;
  - de kop in de marge steekt;
  - een jpg groter wordt dan 300 kB.

## Na het eerste uitrollen (19:37)

- **Wat er gebeurde:** `UITROLLEN.bat` stopte bij stap 2 op `test:bannerkop-browser`, de toets uit levering 110. Er is
  niets live gezet.
- **De oorzaak:** de toets laadde `src/data/banner94.js` met een gewoon pad. Op Windows begint dat pad met `E:\`, en
  `import()` leest dat als een adres met het schema `e:`. In mijn omgeving (Linux) ging het goed, daarom zag ik het niet.
- **De reparatie:** de toets maakt er nu eerst een `file://`-adres van (`pathToFileURL`), zoals de andere toetsen al
  doen. Ik heb alle toetsen en scripts nagelopen: dit was de enige plek.
- **Daarna:** draai `UITROLLEN.bat` opnieuw.
