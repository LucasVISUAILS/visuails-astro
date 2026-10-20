# Levering 63 — de POV-foto in de opening (20 oktober 2026)

Je koos voor je nieuwe achtergrond uit `images/BG` (de telefoon en de laptop met lege schermen):
"Opening van home", op de plek van de huidige laptopfoto, met je klantshop op beide schermen.
Uitrollen met **UITROLLEN.bat**, zonder migratie. Levering 62 lag al in je map en is nog niet
uitgerold (je uitrollog stopt op 18 oktober). Ze gaan dus samen mee, en `kladblok/COMMIT-BERICHT.txt`
beschrijft ze allebei.

## 1. De foto en de schermen

- **De foto** is 2048 × 1152 en is 1,125 × groter gemaakt tot 2304 × 1296. Zo houden de standen hun
  breedtes en namen (1000, 1600, 2304), en overschrijft elke nieuwe stand zijn oude bestand. Er blijft
  dus niets van de oude foto achter in `public/img/hal/stand`.
- **De schermen zijn gemeten, niet geschat** (`scripts/laptop-foto.py`). Langs elke rand liggen honderden
  scanlijnen, van het witte scherm naar buiten tot de zwarte rand. Per rand gaat er een lijn door die
  punten, en de hoeken zijn de snijpunten. Grootste afwijking: 0,21 px. Bij de telefoon telt alleen het
  rechte stuk van elke rand mee, want zijn hoeken zijn rond.
- **De maskers** komen uit hetzelfde script. Ze laten de inkeping van de laptop, het eiland van de
  telefoon en de ronde hoeken van de foto staan.
- **Wat er op de schermen staat** is niet veranderd. Het zijn dezelfde 9 standen per taal (catalogset,
  lifestylecarrousel, video), opnieuw gefotografeerd met `scripts/laptop-standen.mjs`.
- **De foto met de schermen erin** (`laptop-*.webp`, voor het deelplaatje en als er geen standen zijn)
  is nu de eerste stand. De foto met de lege schermen staat apart als `pov-2304.webp` en is de
  ondergrond van de bron.

## 2. De opening

- **De plek is gerekend.** De duim links van de telefoon begint 16 px rechts van de tekst, de klep van
  de laptop eindigt 36 px voor de rand van het scherm. De donkere kant van de foto loopt dus altijd
  tot de rand van het venster. Links vloeit de foto via zijn eigen schets in het wit (26 %), bovenin
  over 60 px en onderaan vanaf de toetsen.
- **De belletjes** "Wat jij stuurt" en "Wat je terugkrijgt" staan op één lijn boven de foto, elk met
  een lijntje naar zijn scherm. Je leest van links naar rechts: sturen, terugkrijgen. Ze staan 16 px
  onder de menubalk.
- **De balk met de beelden** hangt net onder de foto, onder de laptop, op dezelfde lijn als de kolom.
  Tussen 901 en 1000 px is zijn streep 70 px in plaats van 110, anders raakte hij de knop
  "Probeer VISUAILS · €1".
- **Op de telefoon** (tot 900 px) toont het paneel de foto van de duim tot net voorbij de klep. Het
  belletje van de laptop staat rechtsboven, dat van de telefoon linksonder.
- **De lichte helft van de kop** ("Al je", "Catalog photos.") is in de opening grijs 3, zoals op elk
  beeld sinds levering 62. Het lichte kopgrijs haalde op /catalog bij 1600 px 3,75:1 tegen een
  violette lijn van de schets.
- **Ook op /catalog, /lifestyle en /video.** Die gebruiken dezelfde opening en dus ook de nieuwe foto.

## 3. De deelplaatjes

`og-nl.png` en `og-en.png` zijn opnieuw gemaakt (`scripts/make-og.mjs`) met de nieuwe foto, op dezelfde
manier geplaatst als op de site.

## Nagekeken

- **Botsingen:** op 25 breedtes (320 tot 1920 px), in het Nederlands en het Engels: tekst, menubalk,
  belletjes, de twee schermen, de balk en de zin eronder. Niets botst. Alleen de zwevende WhatsApp-knop
  komt op 1488 tot 1500 px tegen de zin onder de balk (bij een venster van 900 px hoog). Die knop zweeft
  op elke pagina over de inhoud.
- **Contrast:** elke regel tekst in de opening, de belletjes, de balk en de zin, tegen de pixels die er
  echt achter staan. Op home, /catalog, /lifestyle en /video, in beide talen, op 13 breedtes: 2246
  metingen, alles 4,5:1 of meer, de laagste 4,92:1.
- **Hoekregel:** de hoekmeting op 89 pagina's en 9 breedtes, naast de bouw van levering 62: geen enkele
  nieuwe afwijking. Op de telefoon staan de belletjes in de rechte hoeken van het paneel, dus met lichte
  hoeken (3 px).
- **Testreeks:** 266 van 267 in de volledige reeks. De ene was `doorloop-27c`: die zocht in hal.css nog
  de oude som van de opening. Die regel is bijgewerkt, en daarna was de toets 100/100 op dezelfde bouw.
  Aangepast: `doorloop-27c` (de telefoon staat nu links, de balk onder de foto)
  en `laptop-standen` (de verhouding komt uit `halLaptop.js`).

## Na het uitrollen

- Kijk op je telefoon en op je laptop naar home en /catalog.
- Heb je een grotere versie van de foto, zet hem dan in `images/BG` en draai:
  `python scripts/laptop-foto.py "<pad naar de foto>"`, daarna `node scripts/laptop-standen.mjs` en
  `npm run og`.

## Bestanden

- **Beelden:** `public/img/hal/pov-2304.webp` (nieuw), `laptop-1000/1600/2304` (webp en avif),
  `masker-laptop.png`, `masker-fon.png`, de 108 standen in `public/img/hal/stand/`, `public/img/og-nl.png`
  en `og-en.png`.
- **Code:** `src/data/halLaptop.js` (de maten), `src/data/halStanden.js` en `halStanden.bron.json`,
  `src/components/HalLaptop.astro` en `HalLaptopSchermen.astro`, `src/pages/laptop-bron/[lang].astro`,
  `src/styles/hal.css`.
- **Scripts:** `scripts/laptop-foto.py` (nieuw), `laptop-standen.mjs`, `lib/laptopbron.mjs`, `make-og.mjs`.
- **Toetsen:** `tests/doorloop-27c.test.mjs`, `tests/laptop-standen.test.mjs`.
- **Kladblok:** dit bestand en `kladblok/COMMIT-BERICHT.txt`.
