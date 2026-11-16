# Levering 100 · Zwart, wit en mint, en het kaartveld (plan en voorbereiding)

**14 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Samen met levering 99.

**Bijgewerkt 15 november 2026: stap 1 (de kleuren) en stap 2 (het kaartveld) staan nu in de site; zie onderaan.** Het eerste deel hieronder was de voorbereiding (14 november): Dit is de basis voor de ombouw: het nieuwe kleurenschema, het plan,
het script van het kaartveld, de twee lijsten en het logopakket. De ombouw van de site volgt in stappen, met bij elke stap
een lijst (je koos in lijst 104: *"Goed, begin"*).

## Wat je koos (lijst 104, in de chat om 06:53)

- **Zwart** `#090D0B`: niet pikzwart, met een zweem van de groene toon van de mint.
- **De mint-trap** 950 tot 100 voor de kaarten (advies aangehouden).
- **De puls en het ademen: a** — de lijnen staan stil; een puls van licht (107 px per seconde, per lijn elke 14 s) trekt
  door elke harde lijn en stopt aan het eind van de ader; de gloed ademt in 16 s.
- **Het plan: goed, begin.**

Lijst 105 (de 21 plekken voor een kaart): alle 21 "doen".

## Wat er in je map staat

| bestand | wat |
|---|---|
| `docs/KLEURENSCHEMA.md` | bovenaan de sectie "Levering 100": de drie kleuren van de site, de mint-trap voor de kaarten, wat weggaat (blauw uur, glas, afgeknipte hoeken), het kaartveld, de aderen, de puls, de zwarte voet; daaronder alles van levering 99 en eerder als geschiedenis |
| `kladblok/PLAN-KAARTVELD-100.md` | het plan van aanpak: de kleuren, het kaartveld (kenmerken, aderen, puls, leesbaarheid), de voorpagina links-rechts, de stappen 0 tot 6 en de open vragen |
| `kladblok/levering-100/kaartveld.js` | het script van het kaartveld (WebGL), zoals in de lijsten; wordt in stap 2 `src/scripts/kaartveld.js` |
| `kladblok/levering-100/lijst-104.html` | de proef van het kaartveld (zelfstandig te openen) |
| `kladblok/levering-100/lijst-105/` | de 21 plekken, met de schermafdrukken van nu |
| `E:\Claude (VISUAILS)\images\Logo\visuails-logo-100\` | het logopakket in zwart, wit, mint en snede, de lockups, het logo op het veld, achtergronden en favicons; uitleg in `LEESMIJ.md` |

## Gemeten

- Wit op een kaart: minstens 8,8 : 1 op 1440 en 7,6 : 1 op 390, over de hele puls, op het lichtste punt onder de tekst.
- Het logo op het veld: slechtste punt 4,8 : 1 (het tekstlogo in mint); de eis voor een logo is 3 : 1.

## Volgende stap

Stap 1 van het plan: de kleuren in de site (tokens, knoppen, de balk, de zwarte voet, blauw uur weg), met een lijst.

## Stap 1 en 2 in de site (15 november 2026)

Je zei "ja" om beide samen te leveren (lijst 106: stap 1 samen met stap 2). Je rolt zelf uit met `UITROLLEN.bat`.

### Stap 1 · de kleuren

- **Het palet** in alle stijlbladen: zwart `#090D0B`, wit, mint; blauw uur werd mint 700, blauw diep mint 800, de grijzen in de
  toon van het zwart. Mail- en factuuropmaak bewust nog niet (fase 6 van het plan).
- **`src/styles/kleur-100.css`** (na de andere stijlbladen): selectie in mint 300, de **zwarte voet** (tekst wit op 78 %, het
  tekstlogo wit, onder de muis mint), **Bestellen in mint** in de balk (onder de muis `#1FEA9C`).
- **Lijst 106, "blauw b":** links en de focusrand zwart; mint 700 alleen voor het logo onder de muis, "aandacht" en een zwarte
  knop onder de muis (7,0 : 1). Op zwart blijft de focusrand mint.
- **De bovenbalk** (`src/scripts/balk100.js`): verdwijnt bij naar beneden scrollen en komt terug bij omhoog scrollen, met een
  val in zwaartekracht; blijft staan bovenaan, met een open menu, met de focus of de muis erop. Minder beweging: meteen.
- `docs/DESIGN.md`: de sectie "Het palet van nu: zwart, wit en mint"; `docs/KLEURENSCHEMA.md`: lijn sterk `#C6CAC8`.
- Merktegel, logo-mark en favicons uit logopakket 100.

### Stap 2 · het kaartveld

- **`src/scripts/kaartveld.js`** en **`src/styles/kaart-100.css`**: elke kaart (`[data-kaart]` en de vier blokken die eerst
  fotoblok waren: het €1-blok, het slot, de Studiobrief, de 404) is een venster op één groot veld.
- **Lijst 108:** vijf looks (zijde, nacht, mint, horizon, gloed), op volgorde van de pagina; allemaal met het licht van gloed
  (ronde 2). Elke kaart **één harde lijn en hoogstens één ader**, die zacht in de kaart begint. De puls trekt erdoor.
- **Snel genoeg op elk toestel:** hoogstens 24 beelden per seconde, alleen getekend waar kaarten zijn, en op een te traag toestel
  (gemiddeld meer dan 25 ms per beeld) een stil beeld. Zonder WebGL: het css-verloop.
- **Gemeten** (`tests/kaartveld-100-browser.test.mjs`, op de beeldpunten, twee momenten van de puls, 1440 en 390): wit op een
  kaart overal minstens 6,5 : 1, ook op een lookpagina en voor de lijnknop; de witte V op de 404 minstens 6,07 : 1.

### Toetsen

- Nieuw: `test:kaartveld-browser` (vervangt `fotoblok-browser`, zie opruimen), `test:kleur100`.
- Bijgewerkt: blauw-uur-86 (focus zwart, de blokken zijn kaarten), knoppen, kleur-100, hoekregel (geen plaat in het slot),
  lookpagina en knoppen-systeem (tekst en knoppen op een kaart meet de kaartveldtoets op de beeldpunten), en een paar
  browsertoetsen die op een vaste tijd wachtten: ze wachten nu op de pagina zelf (zacht, opening90, posterkleur89, proefbrowser).
  `afvink8okt` zet het kaartveld uit (`window.__kvUit`): die toets gaat over de formulieren.
- **De hele reeks is groen**, in drie delen gedraaid (de reeks liep tegen de tijdgrens van deze werkomgeving aan).

### Opruimen

`_opruimen/LIJST.txt` heeft er regels bij: `tests/fotoblok-browser.test.mjs`, en oude beelden die nergens meer gebruikt worden
(oude standen van de roze broek, de oude rij bij Wat we maken, de oude laptopschermen). Draai `OPRUIMEN.bat` als je wilt; het
verplaatst ze naar een map met de datum, terug te zetten.
