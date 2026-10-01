# Ronde 7 — rust in de achtergrond, en één foto met drie diensten

Jouw keuze: richting A (hoofdstukken), infopillen naar lijsten, mijn hoofdstukindeling toepassen, en hoofdstuk 2 van de voorpagina laat alle diensten zien als dia's.

## De regel (staat ook in stijl22.css bij `.paneel.vervolg`)

- **Zwart betekent: nieuw hoofdstuk.** Een zwarte naad staat alleen nog waar het onderwerp wisselt.
- **Een licht vel is één hoofdstuk** van 1 tot 3 secties. Daarbinnen scheidt een haarlijn, geen zwart.
- **`vervolg`** op een paneel betekent: hoort bij het hoofdstuk erboven. Eén klasse per sectie.
- **Een grijze kaart is iets om te kiezen of aan te klikken.** Informatie krijgt geen vlak.
- **Pillen alleen voor knoppen, keuzes en statussen.** Feiten staan in een lijst met vinkjes (`.feiten`).
- **Donker** is #14161A (de tweede trede van het donkere palet) in plaats van #1A1A1A.

## Wat er veranderd is

- **Zwarte naden per pagina, voor → na:** voorpagina 9 → 5, catalog 5 → 3, merkmodel 6 → 3, abonnementen 6 → 4, portaal 6 → 4, studio 5 → 3, de stijlpagina's 5-6 → 4, en lifestyle, video, hoe het werkt, vergelijken, per product, hooks, editions en foto-richtlijnen elk één minder. Een nieuwe toets (`tests/hoofdstukken.test.mjs`) bewaakt dat geen pagina boven de 5 komt.
- **Infopillen naar lijsten:** /catalog (5 punten), /how-it-works, /about, de stijlpagina's (catalog en lifestyle), de proef, en de vertrouwensregel onderaan de voorpagina. "Elke look levert …" bij de looks is geen pil meer.
- **Kaart-in-kaart weg:** "Eigen look" onder de looks is nu een rij zoals de rest; "Wel doen / vermijden" op de foto-richtlijnen en de contactvakken zijn kolommen onder een haarlijn.
- **Eén linkerlijn:** "Kies je look" op /catalog, /lifestyle en /video sprong 58 px naar binnen; nu niet meer.

## Voorpagina, hoofdstuk 2

- Eén vel in plaats van twee panelen. Links de kop, de zin en de telefoonfoto van het T-shirt. Rechts een dia per dienst: **Catalog**, **Lifestyle** en **Video**, met de namen en prijzen als tabbladen erboven.
- De dia's wisselen vanzelf (6,5 seconden, de streep onder het tabblad loopt mee). Ze staan stil buiten beeld, onder de muis, bij "minder beweging", en voorgoed zodra iemand zelf kiest of veegt. Er is een pauzeknop.
- Onder de streep de vier stappen (jij, wij, jouw beelden, je shop) als tekst, zonder beelden.
- Zonder JavaScript is het een rij die je opzij veegt.

## Bij jou

- [ ] **Videodia:** er staat een plaatshouder (`dienst-video-shirt`, 1080 × 1920, staand). Zet een still van een clip van dít T-shirt in `public/img/dienst-video-shirt.webp`. Heb je de clip zelf, zet het pad in `VN_CLIP` in Voorpagina.astro.
- [ ] `src/components/LopendeBand.astro` wordt niet meer gebruikt (de stappen staan nu in de voorpagina). Je mag hem verwijderen; Stations.astro blijft nodig voor /how-it-works.
- [ ] Zelf committen en pushen.

## Getest

- Volledige testreeks groen (met de nieuwe hoofdstukkentoets), scans schoon (leesbaarheid, knoppen, regelafstand, geen horizontale scroll op 5 breedtes, links).
- In de browser: de wissel loopt, stopt bij klikken en vegen, de pauzeknop werkt, en op 390 px passen de tabbladen en de pauzeknop naast elkaar.
