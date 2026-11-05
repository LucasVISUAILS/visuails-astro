# Levering 88 · De metro naar beneden, samen met de laptop, en het aantal als lat

**4 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort op levering 87. Je keuzes
staan in lijst 76, je notitie van 16:05 erbij. De maten staan in `docs/RUST-80.md` §15 (de metro) en `docs/DESIGN.md`
"De metro en de lat — 4 november 2026".

---

## 1 · Wat je vroeg

- **Lijst 75, de opening (kan beter):** *"Ik wou echt een gemaakte animatie beter dan deze simpele. Ik wou een soort metro
  gevoel met de motion blur creëren dat het voelt alsof het blauwe weg racet smooth naar het witte waarna de service
  omhoog komen."*
- **12:13:** *"Ik wou dat het effect naar beneden ging niet van de zijkant."*
- **Lijst 76:** metro **N3** (lamellen), **vanzelf**, de ruimte boven de producten **goed**, het aantal **A2** (de lat),
  levering 88 **ja**.
- **16:05:** *"De metro animatie mag ongeveer tegelijkertijd met de laptop verdwijnen. Misschien iets later als dat beter
  oogt."*
- **Lijst 77:** metro **goed**, met: *"Kan de achtergrond animatie meer motion blur gebruiken. Ook zou ik de animatie iets
  sneller en in een golf mee willen laten bewegen (laptop en achtergrond iets smoother met elkaar bewegen.)"*; de lat
  **goed**; in je map **ja**.
- **Lijst 75, het bestelformulier:** *"Ik wil dat de product hoeveelheid keuze in het bestelformulier veel subtieler word
  het is nu 1 groot blok en kan veel simpeler en mooier dan dit."*

## 2 · De metro

- **Tot beeld 86** speelt de scroll de video, zoals in levering 87. Bij beeld 86 is de telefoon weg en staat van de laptop
  nog een derde in beeld (tot 522 px op 1440, gemeten in de video).
- **Daar vertrekt het blauw**: het valt in tien schuine banen op de snede (53°) naar beneden weg, van rechts naar links als
  één golf. Elke baan trekt op zoals een metro: eerst traag, dan steeds sneller. Hij is onscherp zoals een sluiter van
  0,07 s hem zou zien (lijst 77: meer onscherpte; was 0,03). De fade is precies die van het podium, stop voor stop. Het nieuwe
  script is `src/scripts/metro.js` (WebGL).
- **De laptop rijdt mee, in de golf.** (Sinds levering 88b anders: de video houdt beeld 86 vast en het doek schuift de
  laptop, elk schermbeeld; zie `LEVERING-88b.md`.) De rest van de video speelt op de klok van de rit, iets sneller dan zijn eigen tempo.
  De laptop gaat links het beeld uit na driekwart van de rit, terwijl de laatste baan valt (lijst 77: "laptop en
  achtergrond iets smoother met elkaar"). In de proef van lijst 76 viel de golf van links naar rechts, in zes banen en in 1 s.
- **Vanzelf, 0,8 s** (lijst 77: iets sneller). De scroll start de rit en de klok rijdt hem. Terug scrollen laat hem terugrijden. Scrol je ver
  vooruit, dan haalt hij in (tot 2,5 ×), zodat hij nooit achter de pagina aan loopt.
- **Wit, dan Wat we maken.** Als alles wit is, komt Wat we maken 90 ms later omhoog, op het scherm waar je bent. De sectie
  ligt al over het podium, onzichtbaar en niet aan te klikken tot het blauw weg is. Bij terug gaat hij eerst weg (0,18 s),
  dan komt het blauw terug.
- **De oude veeg** (het wit langs de snede uit levering 87) staat er nog. Hij geldt als `metro` leeg is, maar staat
  nergens meer aan.
- **Telefoon, tablet en minder beweging, zonder WebGL of zonder video**: alles staat stil, zoals in levering 87.
- De film: `kladblok/levering-88/opening-88.mp4` (opgenomen op 1440 × 900). Het script dat hem maakt staat ernaast (`film88.cjs`, met
  `plak.py`).

## 3 · De ruimte boven de producten

In Wat we maken raakte de broek de zin "Van productpagina tot feed". De 64 px ertussen stond sinds levering 80 op 0, omdat
de algemene regel `.h-pagina ul` won van `.m8-rij`. Nu staat er `.m8 .m8-rij`. De hele sectie past nog steeds onder de balk
op 1440 × 900.

## 4 · Het aantal als lat

- **Was:** een blok met − 1 +, de knopjes 1 · 5 · 10 · 20 en rechts de prijslijst. Drie dingen voor één keuze.
- **Nu:** het getal, met het woord en het tarief ernaast. Het getal is een getalveld zonder vak, in de kopletter, dus je kunt
  het nog steeds typen. Daaronder een schuif van 1 tot 20, daaronder de treden van de prijs. De treden zijn de snelknoppen
  en de prijslijst tegelijk: wat geldt is inkt en vet, de rest grijs (5,3 : 1), onder de muis een vlak.
- **Wat hetzelfde blijft:** de keuzelijst die het formulier verstuurt blijft de bron. Het getalveld draagt de eis, en het
  begint op 1 product. De regel eronder (nog zoveel producten, of: met zoveel betaal je minder) is ongewijzigd.
  "Eén product per catalogset" en "Meer dan 20 producten?" staan op één regel. "Tot 20 producten … het tarief zakt bij 5,
  10 en 20" is weg, want de lat laat dat zien.
- Gebouwd in `OrderFlow.astro`, `werkplaats.css` en `pipeline.js` (`bindQty`, en in `wkOverzicht` het tarief).

## 5 · Wat je kunt weggooien

- `tests\opening-87-browser.test.mjs`: vervangen door `tests\opening-88-browser.test.mjs`.

## 6 · Nagekeken

- `npx astro build`: klaar, zonder fouten.
- De hele testreeks: **279 van de 279 stappen goed** (op de laatste build).
- Nieuw: `tests/opening-88-browser.test.mjs` (de metro: vertrek, de laptop mee, wit, Wat we maken pas daarna, terug,
  inhalen, telefoon, zonder WebGL en zonder video) en `tests/aantal-lat-browser.test.mjs` (catalog en lifestyle, 1440 en 390:
  muis, pijltjes, typen en treden lopen gelijk met de keuzelijst; de treden passen en zijn leesbaar).
- Bijgewerkt: de verwijzingen in `laptop-84` en `voorpagina-80`; `package.json` (`test:opening88`, `test:aantallat`).
