# Levering 66: scherpere grote foto's, en de telefoon niet zachter (21 oktober 2026)

Afvinklijst 44, vraag 2 = b, en afvinklijst 45, vraag 1 = b. Uitrollen met **UITROLLEN.bat**,
zonder migratie. Levering 65 staat nog niet live (de laatste uitrol is c1086f6, 20 oktober
11:56). Rol 65 en 66 dus samen uit; `kladblok/COMMIT-BERICHT.txt` beschrijft ze allebei.

## 1. Wat er verandert

- **Kwaliteit 64 voor de grote foto's.** Elke AVIF vanaf 1000 px breed is opnieuw gemaakt op
  kwaliteit 64 in plaats van 52: 88 bestanden. Gemeten op acht grote foto's, op 1200 px tegen
  de webp: gelijkenis 0,979 naar 0,991. Daar staan ook de twee woordmerk-plaatjes bij
  (`logo-wordmark.avif` en `logo-wordmark-light.avif`): dezelfde pixels, alleen opnieuw
  ingepakt. Geen nieuw ontwerp.
- **Een versie voor de telefoon, minstens zo scherp als nu.** 24 grote foto's die een telefoon
  op 1340 tot 2400 px laadde, krijgen een versie van 1200 px (één van 1400). Per foto staat de
  laagste kwaliteit die op een iPhone-scherm (390 × 3) minstens zo scherp is als wat de
  telefoon vóór deze levering zag: 64, 72, 78 of 84. Geen enkele foto is zachter.
  Samen gaan die foto's op de telefoon van 3375 naar 3433 kB (+2 %), zoals ze in je map
  staan. Zonder de herkomstgegevens die elk bestand onderweg meekrijgt (zie onderaan) was dat
  −2 %. Home op de telefoon gaat van 633 naar 694 kB, omdat de foto's daar net een hogere
  kwaliteit nodig hadden.
- **Lookpagina's.** De telefoonversie staat nu ook in hun srcset. Daarnaast twee fouten die
  een foto wazig maakten:
  - de laatste foto die over twee kolommen staat, kreeg op een laptop de versie van 760 px
    voor een vak van 1360 px (Phone-made en Flash);
  - bij twee foto's naast elkaar bovenaan klopte de maat tussen 700 en 900 px niet. Een
    tablet van 800 × 1,5 kreeg de versie van 760 px voor een foto van 945 px.
- **`make-avif.mjs` blijft af van de laptopstanden en de telefoonversies.** Die hebben elk hun
  eigen script, dat de AVIF rechtstreeks uit een verliesloze foto maakt. Zonder die uitzondering
  zou `npm run avif -- --al` de standen van levering 65 overschrijven met kwaliteit 52.

## 2. Wat het kost

Gemeten op alle 95 pagina's, elk helemaal doorgescrold, zonder de laptopstanden (die zijn niet
veranderd), en zonder de herkomstgegevens (die komen er per bestand nog bij, zie onderaan):

| | vóór | na |
|---|---|---|
| telefoon (390 × 3) | 32,2 MB | 32,6 MB (+1 %) |
| laptop (1440 × 900) | 39,9 MB | 47,7 MB (+19 %) |

Op de telefoon zijn 10 pagina's lichter, 28 zwaarder en 57 gelijk. Het verschil is meestal een
paar kB: kleinere foto's vanaf 1000 px zonder telefoonversie staan nu ook op 64. De grootste
stijging is `/start/brand-model`: +65 kB (zie hieronder). Op home gaat de telefoon van 1203
naar 1249 kB en de laptop van 1595 naar 2003 kB.

De meeste van die foto's laden pas als je ernaartoe scrolt. Alleen de grote foto bovenaan een
lookpagina staat in het eerste scherm.

## 3. Wat ik onderweg vond

- **In lijst 45 schreef ik −6 % voor de telefoon. In je map wordt het +2 %.** Bij exact meten
  hadden vier foto's net één kwaliteitsstap meer nodig dan de afgeronde getallen zeiden (−2 %),
  en elk nieuw bestand krijgt onderweg ongeveer 6 kB herkomstgegevens mee: 24 × 6 kB.
  Scherper of even scherp is wel overal gehaald.
- **Zes telefoonversies zijn als AVIF een paar kB groter dan als webp** (tot 40 kB, bij
  kwaliteit 84). Dat is bewust: de kwaliteit is gekozen op scherpte, en zonder die AVIF valt
  de hele foto terug op webp, ook op de laptop.
- **Geen telefoonversie voor `catalog-before-1x1` en `hal/sfeer-bewogen`.** Op de kwaliteit
  die nodig is, werd de kleine versie niet lichter dan de grote foto.
- **De tussenversies van 1560 px zijn zachter dan de grote foto.** Ze zijn uit de webp
  gemaakt. Daarom staan ze niet in de srcset van de lookpagina's. Opnieuw maken is
  vraag 2 van lijst 45 (je koos a): dat wordt levering 67.
- **Op `/custom-models` en `/start/brand-model` wordt de telefoon 34 en 65 kB zwaarder.**
  `custom-models-04` en `-05` zijn 1200 px breed en hebben geen kleinere versie, dus die
  pagina's laden ze nu op 64.
- **Een verschil van 1 px op twee pagina's.** De kleinere versie is afgerond op hele pixels,
  dus de hoogte van een foto verschilt een fractie. Daardoor staat de foto eronder 1 px
  hoger. De paginahoogte is gelijk gebleven.

## Nagekeken

- **De keuze van de browser:** `telefoonbeelden` 9/9. Op 9 schermen, van telefoon tot
  laptop, kiest de browser een kleinere versie alleen waar die genoeg pixels heeft. Dat geldt
  ook voor de -w760 op de lookpagina's.
- **De opmaak, vóór en na:** 95 pagina's op 3 breedtes, 3525 foto's. Alles staat op dezelfde
  plek en heeft dezelfde maat, op die 1 px na. Elke paginahoogte is gelijk.
- **Scherpte:** per foto gemeten (SSIM, in kleur) op 1170 px. Elke telefoonversie is
  minstens zo scherp als vóór deze levering; de waarden staan per foto in
  `src/data/telefoonbeelden.js`.
- **Testreeks:** 267 van 268 groen. De ene rode was `test:paths`: die vond in mijn nieuwe toets
  een globresultaat dat niet naar schuine strepen werd omgezet (op Windows faalt dat). Verbeterd;
  daarna los gedraaid: 25/25.

## Bestanden

- **Beelden:** 88 AVIF's opnieuw op 64 in `public/img/` (en `public/img/hal/`), en 48 nieuwe
  bestanden: 24 telefoonversies, elk als webp en AVIF (`-w1200`, één `-w1400`).
- **Code:** `scripts/make-avif.mjs` (64 vanaf 1000 px, de uitzonderingen in de kop),
  `scripts/avif-naast-webp.mjs` (zet de srcset voor de telefoon), `scripts/make-telefoon.mjs`
  (nieuw), `src/data/telefoonbeelden.js` (nieuw: de lijst, met de metingen),
  `src/components/LookDetailHal.astro` (srcset en de twee maten).
- **Toets:** `tests/telefoonbeelden.test.mjs` (nieuw, staat in de testreeks in `package.json`).
- **Kladblok:** dit bestand en `kladblok/COMMIT-BERICHT.txt`.

Elk beeld dat ik in je map zet, krijgt onderweg 5876 bytes herkomstgegevens (C2PA) mee; de
pixels blijven gelijk. De tabel in punt 2 is zonder die gegevens gemeten; de getallen bij de
telefoonversies in punt 1 zijn zoals de bestanden in je map staan.
