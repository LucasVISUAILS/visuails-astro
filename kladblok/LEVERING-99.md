# Levering 99 · De actiekleur, de zwevende balk, de verhalen en zacht mint

**13 en 14 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Samen geleverd met levering 100
(zie `kladblok/LEVERING-100.md`). Geen migraties. Niets op te ruimen.

Gebouwd uit lijst 100, 101 en 102 en je berichten van 14 november (03:36 tot 03:48).

## 1 · Knoppen en de bovenbalk (lijst 100 D1 tot D4, lijst 101)

- **De actiekleur** `#3DFFB0` (signaalmint) op de knop die tot bestellen leidt; onder de muis schuift `#1FEA9C` van links
  naar rechts, de letters inkt (14,7 : 1). Eén token: `--k-actie` in `src/styles/knoppen.css`, sectie J.
- **Elke knop 8 px op alle hoeken** (`--k-r`); wat iets aangeeft of kiest blijft een pil, een rondje blijft rond
  (`.h-cirkel` 50 %).
- **De bovenbalk** is een zwevende balk in inkt (60 px hoog, 12 px van de rand, hoeken 14) met het woordmerk wit, de
  menu-items in één groepje (hoeken 12, concentrisch met de items van 8) in 15 px, en Bestellen wit
  (`src/styles/balk-99.css`). Het woordmerk in de balk heeft geen venster meer.

## 2 · De voorpagina (lijst 100 A1 tot A5, B1, C1, C2, E1, E2)

- **Wat we maken als baan** (A1): 2,5 kaarten in beeld, de gekozen kaart groot links (`HalMaken80.astro`, `maken-80.css`,
  `catalogkaart96.js`).
- **De lifestyleanimatie** op de kaart Lifestyle, met de telefoonclip ervoor (A2; `src/scripts/lifestylekaart99.js`,
  `TelefoonClip.astro`).
- **Vrij gebruik** (A3) en de stille link naast de knop (E2) in de kaarten.
- **De galerij drijft vanzelf** rustig verder, 21 px per seconde, elke rij in zijn richting (A5; `galerij80.js`).
- **Van foto tot campagne als verhaal** (B1): de woorden kleuren per scène mee (`src/scripts/hoeverhaal99.js`,
  `HalHoeKort80.astro`, `hoe-80.css`).
- **De proef** toont NON/STD: voorkant, achterkant, detail en op model (E1), met `?v=` op de beelden zodat een nieuwe set
  meteen zichtbaar is.

## 3 · Roze wordt zacht mint (lijst 102, A1 b)

- De gloed in de velden is `#9DF5D2` (`--h-gloed` in `hal.css`, was roze `#F1B7AC`), ook in `veld.js`, `poster89.js` en
  `scripts/make-og.mjs`.
- Opnieuw gemaakt: de stukjes in `public/img/stuk/`, de velden `public/img/hal/veld-b1*` en `veld-p2*`, de favicons en de
  deelplaatjes (slechtste punt 7,31 : 1). n-vk-3 en t-vk-3 haalden in mint het contrast niet (4,12 en 4,53) en worden niet
  meer gekozen (`src/data/stukken.js`).

## 4 · Geen afgeknipte hoeken meer (14 november, 03:36 en 03:48)

- *"Die afgeknipte hoeken mogen overal helemaal weg"* en *"Die hoeken hoeven op geen enkele manier behouden te worden."*
- Nieuw `src/styles/zonder-snede-99.css` (na balk-99 in `Layout.astro`): knopparen los met 10 px ertussen, de rondjes
  rond, de juridische knoppen, de formaatknoppen en de galerijpillen los, de sociale knoppen in de voet rond, en in de
  werkplaats geen snede meer. Aan het eind van `hal.css`: geen `clip-path` meer op het slot, de proef en de laatste
  plankaart; elk blok houdt zijn eigen hoeken.

## 5 · Toetsen

Bijgewerkt naar de nieuwe stand: `knoppen-systeem` (8 px), `knoppen-systeem-browser`, `hoekregel-browser` (knoppen volgen
de concentrische regel niet), `studiobrief-admin-browser`, `posterkleur-89-browser` (E3 vervallen; het venster wordt nu op
het woordmerk in de voet gemeten), `blauw-uur-86` (K2 mint, K4: geen snede), `beweging-83` (de pillen los), `opening-90`
(podium 72), `grond-79`, `voorpagina-80`, en `klant-stand` (het voorbeeld van de proef is de hoodie, niet meer ba2-na).

De hele reeks (`node scripts/testreeks.mjs`, 348 stappen) is gedraaid; de enige rode stap was `test:klantstand`, die is
daarna gerepareerd en los groen (127 van 127).
