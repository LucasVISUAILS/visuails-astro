# Levering 98 · De andere laptops tonen NON/STD

**13 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Gebouwd uit lijst 99 (ronde 100): A1 a, A2 a, A3 a met je notitie, A4 goed. Geen migraties. Opruimen:
`_opruimen/LIJST.txt`, blok "13 november 2026 · moet weg (levering 98 …)".

Correctie op levering 97: daar noemde ik /upload-guidelines. De laptop staat alleen op /catalog, /lifestyle en /video.

## 1 · /catalog (A1 a)

- De winkel van NON/STD, dezelfde als op de voorpagina: het getekende logo, de Margiela-opbouw en de grond van de foto's.
- Drie standen: de hoodie, de jeans en de sokken. Op de telefoon staat steeds de telefoonfoto van dat product.
- Er waren vier standen van de roze broek; de vierde gaat weg (zie de opruimlijst).

## 2 · /lifestyle (A2 a)

- Het bericht toont de foto's op model uit je map: de hoodie, de jeans en de sokken. De telefoon toont de telefoonfoto
  van hetzelfde product.
- Het tweede zinnetje van het bericht zei "Zelfde look, vier beelden". Er staan nu drie producten, dus het is "Zelfde
  look, elk product, klaar om te plaatsen." (EN: "Same look, every product, ready to post.").
- Ook hier waren er vier standen; de vierde gaat weg.

## 3 · /video (A3 a, met je notitie)

- Je notitie: "In de telefoon hoort de wijnrode jas te zitten tijdens de video." De clip op het scherm was een paarse
  cardigan. Met de jas op de telefoon klopte dat niet, dus de clip is nu ook de jas.
  - Het beeld is uit de clip van de voorpagina (`video-clip.mp4`, op 5,6 s), in 9 : 16: de hele jas met de V, bij de
    waterval. Dat sluit aan bij "Je productvideo · 9:16".
  - Het scherpste beeld rond die plek is gemeten.
- De telefoon toont de telefoonfoto van de jas, dezelfde als in de opening.
- Nieuwe bestanden:
  - `public/img/hal/video-jas-9x16.webp`;
  - `public/img/hal/video-jas-9x16-vaag.webp`, de vage vulling ernaast;
  - `public/img/jas-voor.webp`.
- De laptop op /video blijft een stilstaand beeld met de voortgangsbalk, net als de andere laptops: die tonen foto's en
  geen video.

## 4 · Hoe het in de code zit

- `laptopSlides.js`: een nieuwe keuze `reeks: 'nonstd'` zet het bericht en de clip om naar NON/STD.
- `halStanden.js`: `HAL_OPTIES` (`product` en `reeks` NON/STD) is nu de standaard voor de laptop.
  - Elke lifestylestand heeft zijn eigen telefoonfoto.
  - De opening van de voorpagina vraagt zelf `{ product: 'nonstd' }` en verandert dus niet.
- `HalLaptopSchermen.astro`: krijgt `opties` in plaats van `product`.
- `laptop-bron/[lang].astro`: kent drie standen.
  - `LAPTOP_PRODUCT=nonstd` is de opening.
  - `LAPTOP_PRODUCT=hal` is de laptop op /catalog, /lifestyle en /video.
  - Zonder `LAPTOP_PRODUCT` is het de oude winkel, voor `opening-reeks.mjs`.
- `scripts/laptop-standen.mjs`: draait met `LAPTOP_PRODUCT=hal`.
- `HalLaptop.astro`: leest de namen uit dezelfde reeks.
- Opnieuw gemaakt met `npm run laptop-standen`:
  - alle standen in `public/img/hal/stand/`;
  - `public/img/hal/laptop-*.{webp,avif}`, nu de winkel van NON/STD;
  - `src/data/halStanden.bron.json`.

## 5 · De oude regels voor Bestellen (A4 goed)

- **Weg uit `hal.css`:**
  - de snede die schuin door de knop schoof (het K1-blok);
  - de oude ronde hoeken;
  - de gloed eronder;
  - de inkt onder de muis.
- **Waarom het veilig is:** sinds levering 97 zet `knoppen.css` (sectie I) Bestellen.
- **Wat er in `hal.css` blijft:** een kort blok met wat nog geldt: wit erop en geen schaduw.
- **Nagemeten**, vóór en na, op /nl/, /catalog/, /nl/video/ en /start/:
  - breedtes: 1440 (de knop in de balk) en 390 (de knop onderaan het menu);
  - toestanden: in rust, onder de muis en met de toets;
  - met en zonder "minder beweging".
- **Gemeten eigenschappen:** 16 stuks, waaronder achtergrond, kleur, schaduw, hoek, overgang en focusrand.
- **Uitslag:** alles precies gelijk, dus op het scherm verandert niets.
- **`tests/blauw-uur-86`:** K1 kijkt nu in `knoppen.css`, en de snede mag niet meer in `hal.css` staan.

## 6 · Tests

- `laptop-standen`: drie catalogstanden in plaats van vier.
- `blauw-uur-86`: K1 en "de gloed weg" bijgewerkt (zie § 5).
- **De volledige testreeks:** alles groen, 348 stappen in 50 min 29 s.
