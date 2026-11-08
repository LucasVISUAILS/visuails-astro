# Levering 88c · Eén scroll speelt de laptop, en geen harde randen

**5 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 88 en 88b (die
staan live sinds 5 november 02:09). De maten staan in `docs/RUST-80.md` §15b.

---

## 1 · Wat je vroeg

- **07:08:** *"De laptop op de website lagged nu nog meer dan eerst en hij speelt niet zelf af, je moet nu zelf scrollen om
  er langs te gaan terwijl ik wil dat hij afspeelt bij 1 scroll omlaag."*
- **08:00:** *"Nooit harde randen bij dit soort grote achtergrond secties. De kleuren moeten verwerkt worden in de pagina net
  als bij de nieuwe laptop achtergrond en kijk of daar ook nog harde randen zijn die daar niet horen."*

## 2 · Wat er mis was (gemeten)

1. **Het scrollen stuurde de video.** Bij elke wieltik zocht hij in de video of versnelde hij (tot 8 ×). Een browser kan alleen
   vanaf een sleutelbeeld uitpakken, dus dat hapert. Gemeten in zes scrollstappen: 5 keer zoeken. Je moest de hele baan door
   scrollen (ruim een scherm) voor de metro vertrok.
2. **Sinds 88b tekende het doek in de rit elk schermbeeld op volle maat**, met negen punten onscherpte, elk met twee
   videolezingen en het perspectief van de schermen: op 1440 breed 1735 × 614 punten, 60 keer per seconde (op een scherm van
   120 of 144 Hz nog vaker). Gemeten zonder grafische kaart: 579 ms per tekening. Daar kwam het extra haperen vandaan.
3. **Harde randen.** Een randendetector over alleen de achtergrond (een sprong van meer dan 6 op 255 tussen twee buurpunten):
   in de rit 218 tot 3858 van zulke punten, met sprongen tot 16 per punt. Dat zijn de grenzen tussen de banen van de metro,
   die elk op hun eigen hoogte vallen. Zonder het effect (telefoon, tablet, minder beweging) liep het blauwe uur onder het
   podium recht tegen het wit van Wat we maken: één sprong van 177. Rust, wit, de bovenkant van het podium en het doek zelf
   waren in orde.

## 3 · Wat er nu is

- **Je scrolt gewoon naar de laptop.** Staat hij onder de balk, dan speelt **één scroll omlaag alles vanzelf**: de video
  (± 2,1 s, met een snelheid per beeld, zodat elk stuk ongeveer even snel beweegt), dan de metro die de laptop meeneemt
  (0,8 s), dan wit, en dan komt Wat we maken omhoog, met zijn bovenkant onder de balk.
- **Zolang hij speelt, staat de pagina vast.** Het wiel, de toetsen en een vinger scrollen dan niet. Nog een scroll omlaag
  laat hem inhalen (1,6 ×); een scroll omhoog laat hem terugspelen. Sleep je met de schuifbalk ver weg, dan staat meteen de
  eindstand.
- **Terug.** Eén scroll omhoog bij Wat we maken speelt alles terug, tot de laptop weer open staat onder de balk. Daarvoor is
  er een omgekeerde video (`laptop-84-<b>-terug`), die de browser gewoon vooruit speelt. Hij komt pas binnen als de animatie
  één keer heeft gespeeld. Is hij er nog niet, dan vervaagt de laptop in 0,35 s naar de foto.
- **Sprongen.** Een link naar Wat we maken (het menu), End of de schuifbalk: meteen de eindstand. Helemaal naar boven: meteen
  de beginstand.
- **Lichter.** De video wordt nooit meer gezocht (gemeten: 0 keer in een hele heenweg). In de rit tekent het doek op 0,6 van
  de punten (1735 × 614 → 1041 × 368 op 1440): 186 in plaats van 579 ms per tekening zonder grafische kaart, een derde. Alles
  beweegt dan en is onscherp, dus je ziet het verschil niet.
- **Geen harde randen.** De banen van de metro lopen over 32 px (dwars op de snede) zacht in elkaar over; het ritme van de
  lamellen en de sluiter blijven. Gemeten: 0 harde punten, de grootste sprong 3 (was 16). Zonder het effect loopt het
  blauwe uur onder het podium in 96 – 180 px uit in de grond, eerst nog even blauw en dan de stops van de fade omgekeerd
  (zoals bovenaan): de grootste sprong 2,7 (was 177).
- Telefoon, tablet, minder beweging, zonder WebGL of zonder video: alles staat stil zoals eerst, en de pagina scrolt gewoon.
- De film: `kladblok/levering-88/opening-88c.mp4` (1440 × 900, één scroll omlaag, handen af, één scroll omhoog), gemaakt met
  `kladblok/levering-88/film89.cjs`.

## 4 · Nagekeken

- `npx astro build`: klaar, zonder fouten.
- Nieuw: `tests/opening-89-browser.test.mjs` (vervangt opening-88): rust bij het laden; de eerste scroll is gewoon scrollen;
  één scroll op het podium speelt tot wit en Wat we maken open zonder verdere invoer en zonder één keer te zoeken; de pagina
  staat vast; in de rit gaat de laptop elk schermbeeld verder naar links; één scroll omhoog speelt terug tot de laptop weer
  open staat; inhalen; een grote sleep maakt hem af; sprongen; de streepjes; telefoon, minder beweging, zonder WebGL, zonder
  video; geen harde rand onder het podium (telefoon en minder beweging: hoogstens 6 op 255 van rij tot rij); de blob wordt
  vrijgegeven; geen scriptfouten. **47 van 47 goed.**
- De film (op een gemaakte klok, zoals in het echt): van de scroll tot wit en Wat we maken 2,95 s; terug, van de scroll omhoog
  tot de open laptop, 2,7 s.
- De randen, gemeten met `randen.py` (een sprong van meer dan 6 op 255 tussen buurpunten, alleen de achtergrond): in de rit
  op 25, 40, 55 en 70 % 0 punten (was 218 · 2800 · 3858 · 2764); onder het podium op de telefoon en bij minder beweging een
  grootste sprong van 2,7 en 2,5 (was 177).
- Bijgewerkt: `tests/laptop-84.test.mjs` (de video op een snelheid per beeld, de naam van de omgekeerde video) en
  `tests/voorpagina-80.test.mjs` (de opening vangt het wiel alleen op het podium); `package.json` (`test:opening89`).
- De hele testreeks op de laatste build: **278 van de 279 stappen goed**; de ene fout was `test:opening89` zelf (een controle
  die op de klok wachtte terwijl de reeks de computer vol had). Die wacht nu op de stand en is daarna 47 van 47 goed.

## 5 · Gewijzigd en nieuw

Gewijzigd: `src/components/HalOpening80.astro`, `src/scripts/laptopdoek.js`, `src/scripts/metro.js`,
`src/scripts/zachtscrollen.js`, `src/styles/opening-80.css`, `tests/laptop-84.test.mjs`, `tests/voorpagina-80.test.mjs`,
`package.json`, `docs/RUST-80.md`, `docs/DESIGN.md`, `kladblok/VISUAILS-OVERZICHT-24-OKT.md`, `kladblok/COMMIT-BERICHT.txt`.
Nieuw: `tests/opening-89-browser.test.mjs`, `scripts/laptop-video-terug.mjs`, de vijf omgekeerde video's in
`public/img/hal/laptop-video/` (`laptop-84-1280-terug.mp4`, `-1920-terug.mp4`, `-2400-terug.mp4`, `-1280-terug.webm`,
`-1920-terug.webm`), `kladblok/levering-88/film89.cjs`, `kladblok/levering-88/opening-88c.mp4` en dit bestand.

## 6 · Wat je kunt weggooien

- `tests\opening-88-browser.test.mjs`: vervangen door `tests\opening-89-browser.test.mjs`.
