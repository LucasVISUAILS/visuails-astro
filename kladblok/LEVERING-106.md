# Levering 106 · Kaartveld fase 3: Studio en de voorpagina links en rechts

**15 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je koos in lijst 113: studio a, poster a, rijen a, telefoon a, fasen a. In lijst 114 zette je alles op Goed, behalve de poster (Niet doen). Bij "Fase 3 in je map" koos je a: in je map na de aanpassingen. Die aanpassingen zitten erin:

- **De banner:** *"De negatieve tekst kleuren gaan nog niet perfect mee met de video erachter, kijk of dit beter kan dan nu en verander hiervan ook de kleuren omdat deze nog op blauw uur staan … het beste dan de donkere groene kleuren."*
- **De poster:** *"Deze poster mag voor nu weg want voegt niet veel toe."*
- **De labels:** *"Ik wil bij alle wenkbrauwen de cijfers weghalen."*
- **De telefoon:** *"Telefoon content centreren geldt overigens voor alles, behalve hele specifieke uitzonderingen."*
- **Inloggen** zonder het groene vak, omdat het groene logo er al boven staat (19:09).

## Studio: de kaarten

Studio draait zonder script. Elke kaart is daarom een stilstaand stuk van het grote veld, als beeld. De beelden staan in `public/img/kaart/studio-*.webp` en zijn gemaakt met `src/scripts/kaartveld.js` zelf.

| plek | pagina | beeld |
|---|---|---|
| Geen abonnement | Abonnement | `studio-1.webp` |
| Je saldo | Abonnement | `studio-2.webp` |
| Je eerste bestelling | Overzicht | `studio-6.webp` (het donkerste stuk) |
| Nog geen eigen look | Je vaste look | `studio-4.webp` |
| Abonnement gestart | na de betaling | `studio-5.webp` |

- Inloggen is weer gewoon wit.
- Op de telefoon ligt er een zachte laag van het zwart over het beeld, omdat de tekst daar over de hele breedte loopt. Alles staat in het midden.
- Een melding in een kaart (de credits die vaststaan na een terugboeking) houdt zijn eigen lichte vlak met donkere tekst.
- **Gemeten:** wit op de kaart, op het lichtste punt onder de tekst. De zwakste plek is overal minstens 10,7 : 1, op 1440 en 390.

## De voorpagina

Elke rij heeft 12 kolommen, tekst en beeld om en om:

| rij | links | rechts |
|---|---|---|
| 1 · de banner | blijft zoals hij was | |
| 2 · Wat we maken | de kaarten (8 kolommen) | de tekst (4) |
| 3 · Hoe het werkt | de tekst (5) | het verhaal (6) |
| laptop en galerij | over de hele breedte, zoals ze waren | |
| 4 · het €1-blok | de kaart (6) | de beelden (5); voor een klant zijn eigen vier |
| Meer weten | zoals het was | |
| 6 · het slot | de tekst (5) | een nieuwe kaart van het veld (6), met de levertijd uit de code en de twee knoppen |

Wat er verder veranderde:

- **De poster is weg.** `HalPoster89.astro` en zijn script blijven in de map, voor als je hem later terug wilt.
- **De banner.**
  - De letters hebben het negatief in het donkere groen: zwart, mint 950, 800, 700, 600 en als lichtste mint 300.
  - Ze liepen een beeld achter, omdat de browser de video tekende en ons canvas de letters. Nu tekenen we de video zelf ook, in hetzelfde moment als de letters. De video-tag speelt onzichtbaar mee als bron.
- **De labels hebben geen cijfers meer**, op de site (de sectiekop en de pil) en in de intake op maat. Nummers in een rij stappen blijven, want dat zijn geen labels.
- **Op de telefoon staat alles in het midden.**
  - Dat geldt voor koppen, labels, tekst en knoppen, en voor de kaarten (88 % breed).
  - Ook de gekozen kaart bij Wat we maken staat in het midden.
  - Uitzonderingen zijn de stappen in de banner en de rijen van Meer weten: dat zijn lijsten die als tabel lezen.
  - De andere pagina's volgen in fase 4.

## Bestanden

| bestand | wat |
|---|---|
| `src/styles/voorpagina-105.css` | **nieuw**: de rijen en de telefoon |
| `src/styles/studio-kaart-105.css` | **nieuw**: de kaarten in Studio |
| `public/img/kaart/studio-1, 2, 4, 5, 6.webp` | **nieuw**: de stukken van het veld |
| `src/components/VoorpaginaHal.astro` | de rijen, het slot als kaart, de poster weg |
| `src/components/HalMaken80.astro`, `HalHoeKort80.astro` | als rij (`rij105`); de carrousel in zijn eigen kolom, op de telefoon in het midden |
| `src/components/HalBanner94.astro`, `src/styles/banner-94.css`, `src/data/banner94.js` | het basisvlak, het groene negatief, de telefoon in het midden |
| `src/styles/hal.css`, `src/styles/sectiekop-96.css` | de labels zonder cijfers |
| `src/layouts/StudioLayout.astro` | laadt `studio-kaart-105.css` |
| `src/pages/account/index.astro`, `plan.astro`, `plan/return.astro`, `brand-kit.astro`, `src/lib/account.js` | de kaarten in Studio |
| `src/pages/account/op-maat.astro` | de labels zonder cijfers |
| `docs/DESIGN.md` | de sectie "Links en rechts, de labels en de telefoon" |
| `tests/voorpagina-80.test.mjs`, `tests/posterkleur-89-browser.test.mjs`, `tests/beweging-83.test.mjs` | de nieuwe volgorde, en geen poster meer |
| `tests/klant-stand.test.mjs` | de melding "Eerst zien?" komt pas voorbij het €1-blok; door de kortere pagina staat dat blok direct na de laptop in beeld |

## Toetsen

De hele reeks is gedraaid: 274 snelle en 79 browsertoetsen.

- Vier browsertoetsen hangen af van de tijd en liepen onder de volle belasting te laat: beweging83, opening90, proefbrowser en klantstand.
- Los gedraaid zijn ze groen.
- In beweging83 en klantstand zaten echte dingen die met de poster samenhingen; die zijn bijgewerkt (zie de tabel hierboven).
