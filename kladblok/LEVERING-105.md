# Levering 105 · De stand in 3D, in de intake van catalog op maat

**15 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je koos in lijst 113: **bouw3d a** (bouwen zoals in de schets) en **stand3d b**, met jouw notitie: *"Alleen de standaard pose is kosteloos. Word het anders dan komen er kosten bij op omdat wij dan meer moeten testen en aanpassen in de prompts. 70 euro eenmalig per aanpassing in stand daarna een klein bedrag per bestelling bovenop de foto waar een andere stand word gebruikt."*

Daarna zei je in de chat (17:12 en 17:15):

- *"Het 3d model is een referentie voor hoe de klant wil dat de eerste front foto eruit ziet."* Daarom staat er geen achterkant als hoek, behalve bij accessoires.
- *"Ik wil dat de klant bovenaan kan kiezen voor flat lay of ghost mannequin look."* De modellen passen zich aan die keuze aan.

Beide zitten in deze levering.

## Wat de klant ziet

In `/account/op-maat?dienst=catalog` staat na "Je producten" de nieuwe stap **04 · De stand**:

- **Bovenaan de uitleg:** "Dit is de referentie voor je eerste foto, de voorkant. De achterkant, een detail en een foto op het model komen er altijd bij. Met jouw stand maken we 4 voorbeelden; daarna pas je details 2 keer kosteloos aan." Die twee kosteloze rondes zijn de bestaande `GRATIS_STIJLRONDES = 2`.
- **De look: ghost mannequin of flat lay.**
  - Ghost mannequin is de standaard: het product in zijn vorm, zonder persoon.
  - Bij flat lay ligt kleding (top, bottom, socks) plat en zie je hem van boven, ook in de modellen.
  - Schoenen en accessoires staan bij flat lay op de grond, van boven gezien.
  - Elke look heeft zijn eigen hoeken. Bij flat lay zijn dat recht van boven (de standaard), iets schuin, diagonaal en schuin van boven.
  - Kiest de klant een andere look, dan vervalt een eigen stand. De pagina zegt dat erbij.
- **Alleen een voorkant.** Er is geen achterkant als hoek, behalve bij accessoires. Slepen draait niet verder dan de zijkant.
- **Alleen de groepen van zijn producten**, in jouw volgorde: headwear, eyewear, top, bottom, socks, shoes, en accessoires. Een schoen erbij laat de groep Shoes verschijnen.
- **Per groep "Snel naar een hoek"**: de hoeken als pillen. De eerste is de **standaard** (staat erbij), daarnaast **Wij kiezen**. Een notitie per groep mag, hoeft niet.
- **Per product een beeld van stippen** in de stand die geldt, op het zwart van de site.
- **"Anders laten staan"** opent een venster met het product in 3D. Je kunt slepen of de pijltjes gebruiken, of een hoek kiezen. Er is een veld "Wat bedoel je precies?" en twee knoppen: **Gebruik deze stand** en **Zelfde als de groep**.
- **Licht en schaduw horen hier niet.** Die kiest de klant bij zijn keuzes; zonder keuze is het lichte, natuurlijke schaduw.
- **Zonder WebGL** werkt de stand per groep nog, met een zin erbij.

De productsoorten zijn uitgebreid naar 19 met een model:

| Groep | Productsoorten |
|---|---|
| Headwear | pet, muts, bucket hat |
| Eyewear | bril |
| Top | T-shirt, hoodie, trui, jas, jurk |
| Bottom | broek, short, rok |
| Socks | sok |
| Shoes | schoen, laars |
| Accessoires | tas, horloge, sieraad, fles |

"Iets anders" heeft geen model; daar gaat het via de notitie. De oude keuze "Hoe ligt of staat hij?" (legwijze) is weg: de 3D-stap vervangt hem.

## Wat het kost (stand3d b)

| | Bedrag |
|---|---|
| De standaardstand van een groep, en "Wij kiezen" | kosteloos |
| Elke andere stand | **€ 70 eenmalig** |
| Daarna, per product in zo'n stand | **€ 10 per bestelling** |

- Dezelfde stand voor een hele groep telt één keer.
- Een product met een eigen stand telt apart, behalve als die gelijk is aan de standaard of aan een stand die al telt.

Voorbeeld: Top op de zijkant met een T-shirt en een hoodie kost 70 + 2 × 10 = € 90. Zet je de hoodie daarna nog anders, dan wordt het 2 × 70 + 2 × 10 = € 160.

De bedragen staan alleen in `src/data/opMaatPrijs.js` (`c-pose`). De pagina en het script nemen ze daaruit over; het totaal rekent de server.

## Bestanden

| bestand | wat |
|---|---|
| `src/data/opMaat.js` | de soorten met groep en model, `STAND_LOOKS` (ghost mannequin en flat lay), `STAND_GROEPEN` (de hoeken per groep en per look, NL en EN), `standTelling()` |
| `src/data/opMaatPrijs.js` | `c-pose` volgens stand3d b |
| `src/lib/opMaat.js` | het normaliseren van de eigen stand en de stand per groep; de stand is niet meer verplicht |
| `src/pages/account/op-maat.astro` | stap 04 en het venster; de soorten in groepen; de nummers 05 tot 07 |
| `src/styles/op-maat.css` | de groepen, de beelden en het venster |
| `public/js/op-maat.js` | laadt de 3D-stap; een nieuwe rij begint zonder eigen stand |
| `public/js/op-maat-3d.js` | **nieuw**: de modellen van stippen (eigen werk), de beelden en het venster |
| `public/js/three.module.min.js` | **nieuw**: three.js 0.160 (MIT-licentie, de licentie staat bovenin), van onze eigen site want Studio laadt niets van buiten |
| `docs/HOE-VISUAILS-WERKT.md` | §7.3: `c-pose` en de stand in 3D |
| `tests/op-maat-3d-browser.test.mjs` | **nieuw**, `test:opmaat3d-browser`, 44 toetsen (ook in de reeks `test`) |
| `tests/op-maat.test.mjs`, `tests/op-maat-prijs.test.mjs`, `tests/op-maat-studio-browser.test.mjs` | bijgewerkt voor de nieuwe stand |
| `package.json` | het nieuwe script |

Om te weten:

- **Studio laadt nog steeds één script.** `op-maat.js` haalt de 3D-stap en three.js zelf binnen, van onze eigen site. De CSP blijft zoals hij was.
- **Een eerder opgeslagen concept** met een oude legwijze verliest die bij de volgende keer opslaan.
- **three.js is 670 kB**, maar wordt alleen geladen op de stap van catalog op maat, en alleen als de browser WebGL kan.

## Toetsen

De hele reeks (274 snelle en 79 browsertoetsen) is groen op de werkkopie. Vier browsertoetsen liepen onder de volle belasting te laat (beweging83, proefbrowser, klantstand, posterkleur89); los gedraaid waren ze alle vier groen. Daarna zijn alleen deze bestanden op levering 104 gezet en is de snelle reeks opnieuw gedraaid, samen met de toetsen op maat:

| Toets | Uitslag |
|---|---|
| `test:opmaat` | 64 goed |
| `test:opmaatprijs` | 33 goed |
| `test:opmaat3d-browser` | 44 goed |
| `test:opmaatofferte` | groen |
| `test:opmaatrondes` | groen |
| `test:opmaat-browser` | groen |
