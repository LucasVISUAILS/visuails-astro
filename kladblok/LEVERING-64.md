# Levering 64: de opening op de telefoon (20 oktober 2026)

Je keuzes uit afvinklijst 43: **kop, knoppen, dan de foto**, de foto **tot de rechterrand**, en
dat **op alle vier de openingen** (home, /catalog, /lifestyle, /video, Nederlands en Engels).
Alleen tot 900 px breed; op de laptop verandert niets.

Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 62 en 63 liggen ook nog in je map en zijn
niet uitgerold (je uitrollog stopt op 18 oktober). Ze gaan dus alle drie in één keer mee, en
`kladblok/COMMIT-BERICHT.txt` beschrijft ze alle drie.

## 1. De volgorde

- **Bovenaan:** het label, de kop en de knoppen. Daaronder staat meteen de foto, met de balk en
  de regel over het voorbeeld.
- **Onder de foto:** de zin ("Stuur je productfoto's…"), de labels en op /catalog, /lifestyle en
  /video de wachtregel.
- **De maten zijn die van nu:** 104 px boven het label, 18 px tussen tekst en tekst, 24 px boven
  de labels en 26 px tussen tekst en foto.
- **De volgorde in de HTML blijft gelijk.** Alleen wat je ziet verandert, dus een schermlezer en
  de tabtoets werken zoals altijd.
- **Het binnenkomen bij het laden** volgt de nieuwe volgorde, van boven naar beneden, met
  dezelfde stap van 90 ms.

## 2. De foto tot de rechterrand

- Links blijven de 12 px en de zachte hoek. Rechts loopt de foto tot de rand van het venster,
  met rechte hoeken, zoals op de laptop.
- De foto wordt 12 px breder: op 390 px is hij 378 in plaats van 366 px. De uitsnede blijft gelijk.
- De balk, de regel eronder en het belletje rechtsboven blijven op dezelfde plek op het scherm.
  Het belletje rechtsboven staat 20 px van de rand, net als het belletje linksonder.

## 3. Wat je op het eerste scherm ziet

Dit is gemeten op de hoogte die je in de browser echt ziet.

- **iPhone (390 × 664):** kop, beide knoppen en beide schermen in de foto, op alle vier de
  pagina's. Eerst begon de foto pas op 656 px.
  - Op de Engelse home, en op /catalog, /lifestyle en /video in het Nederlands, past zelfs de
    hele foto, met beide belletjes.
  - Op de Nederlandse home en de Engelse /catalog valt het belletje linksonder er net onder.
- **Android (360 × 680):** ook kop, knoppen en beide schermen, op alle vier.
- **iPhone SE (375 × 548):** kop, knoppen en de bovenkant van de foto.

## Nagekeken

- **Opbouw:** alle vier de pagina's, Nederlands en Engels, op 12 breedtes van 320 tot 900 px, plus
  901 en 1440 px om te zien dat de laptopversie gelijk bleef. Samen 112 metingen, geen fout:
  - de volgorde en elke tussenruimte op de pixel;
  - niets botst en niets is breder dan het scherm;
  - de tekst blijft binnen de kolom;
  - de foto loopt van 12 px tot de rechterrand;
  - geen belletje ligt over een scherm: rechtsboven minstens 3,9 px vrij (op 320 px), linksonder
    minstens 12,5 px.
- **Contrast:** gemeten tegen de pixels die er echt achter staan, op alle vier de pagina's in
  beide talen, op 11 breedtes van 320 tot 1440 px:
  - wat er gemeten is: elke regel tekst in de opening (label, kop, zin, knoppen, labels,
    wachtregel), de belletjes, de balk en de regel eronder;
  - de uitkomst: 1926 metingen, alles 4,5:1 of meer, de laagste 5,02:1.
- **Hoekregel:** de hoekmeting op de vier openingen in beide talen, op 9 breedtes, naast de bouw
  van levering 63: geen enkele nieuwe afwijking.
- **Testreeks:** 267 van 267, alles groen.
  `hal-voorbeeld` controleert nu ook de volgorde en de rechterrand op 900, 760, 390 en 320 px.

## Na het uitrollen

- Kijk op je telefoon naar home en /catalog.

## Bestanden

- **Stijl:** `src/styles/hal.css` (in het blok tot 900 px, en één regel in het blok tot 340 px).
- **Toets:** `tests/hal-voorbeeld.test.mjs`.
- **Kladblok:** dit bestand en `kladblok/COMMIT-BERICHT.txt`.
