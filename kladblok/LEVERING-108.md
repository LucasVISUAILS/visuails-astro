# Levering 108 · Kaartveld fase 4, de matte kaarten en de draad van chroom

**15 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

In lijst 115 zette je alles op Goed, koos je bij de vier vragen a, en bij de levering a.

Wat je vroeg:

- **21:47:** *"de groene kaarten een soort matte look … helemaal geen outerline … De aderen … een soort chrome shiny achtige feeling maar heel subtiel en minimaal, alsof dat de bedrading van de website is die in het wit verdwijnt … met stroom erdoorheen."*
- **22:31:** *"Ik wil dat de Chrome aderen wel gebruik maken van het kleurenschema en de glow erop ook. De footer van de website op telefoon hoeft niet gecentreerd, dit is een uitzondering. Deel de footer netjes in."*

Je notitie over een draadnetwerk door de hele site is nog niet gebouwd. Daarvan komen eerst voorbeelden in een eigen lijst.

## De kaarten

- **Mat en glad.** Er zit geen korrel meer in het veld, alleen een onzichtbare ruis van 1/255 tegen banen. De lichte rand langs de kaart is weg.
- **De draad van chroom** (3,8 px), in de mint-trap:
  - de randen in mint 900 naar zwart;
  - het lijf in mint 600;
  - een smalle glans van mint 300 naar bijna wit;
  - een zwakke tweede weerkaatsing.
- **De gloed.** Om de draad ligt een zachte gloed van mint 500, in de kaart en in het wit.
- **In het wit** loopt de draad 110 px door, wordt iets dunner en verdwijnt. De witte geul in de kaart is weg.
- **De stroom.** Zachte golven van licht trekken door de draad, elke 320 px één, 90 px per seconde. Als er een golf langs komt, worden de glans en de gloed even feller. Bij minder beweging staat alles stil.
- **Studio.** De vijf stilstaande kaarten (`public/img/kaart/studio-*.webp`) zijn opnieuw gemaakt: samen 181 kB in plaats van 572 kB. Ze hebben `?v=108`, zodat elke browser ze meteen ophaalt.

## Fase 4: de kaarten uit lijst 105

| plek | wat |
|---|---|
| /plans, /editions, /hooks | het getal in de kop staat op een kaart |
| /catalog, /lifestyle | de tegel Eigen look |
| /video | de clips die nog volgen |
| /start/custom-look en de andere aanvraagpagina's | Prijs op aanvraag (het bestaande blok werd de kaart) |
| /start | Op maat: de drie in één kaart |
| /start/plan | Jouw maand, de samenvatting |
| /thank-you | Bedankt, met het vinkje in mint |

Je antwoorden op de vier vragen:

- **Q1 a:** de drie abonnementen op /plans blijven wit.
- **Q2 a:** /video houdt de clips en het slot als kaart, tot de echte clips er zijn.
- **Q3 a:** de Studiobrief op /editions staat in de slotkaart zonder eigen vlak, onder een dunne witte lijn.
- **Q4 a:** de voorpagina krijgt de tegel Eigen look niet.

## De telefoon

Op elke pagina staan koppen, labels, tekst, knoppen en kaarten in het midden (`src/styles/telefoon-115.css`).

- **Kaarten** zijn 88 % breed. De kaart met de kop van /test-sample houdt de volle breedte.
- **Een rij met een nummer of icoon** zet het nummer boven de tekst.
- **Uitzonderingen** (die blijven links):
  - de velden van een formulier;
  - de vragen met een plus;
  - de regels van een lijst met vinkjes (de lijst zelf staat als groep in het midden);
  - tabellen.
- **De voet** is ook een uitzondering. Hij staat links, in twee kolommen:
  - Wat we maken en Bedrijf naast elkaar;
  - Contact eronder, over de hele breedte;
  - de Studiobrief, met het veld even breed als de knop.

## Bestanden

| bestand | wat |
|---|---|
| `src/scripts/kaartveld.js` | mat, de draad, de gloed, de stroom; de brief op /editions geen kaart meer |
| `src/styles/kaart-108.css` | **nieuw**: de tekst op de nieuwe kaarten |
| `src/styles/telefoon-115.css` | **nieuw**: de telefoon in het midden, en de voet |
| `src/layouts/Layout.astro` | laadt de twee nieuwe stijlbladen |
| `src/components/KopBeeld.astro` | het getal kan op een kaart |
| `src/components/PlansHal.astro`, `EditionsHal.astro`, `HooksHal.astro`, `CatalogHal.astro`, `LifestyleHal.astro`, `VideoHal.astro`, `StartHal.astro`, `ThankYouPage.astro`, `order/HoldingPage.astro`, `order/PlanPicker.astro` | de kaarten |
| `src/styles/studio-kaart-105.css` | de beelden met `?v=108` |
| `public/img/kaart/studio-1, 2, 4, 5, 6.webp` | opnieuw gemaakt |
| `docs/KLEURENSCHEMA.md`, `docs/DESIGN.md` | bijgewerkt |
| `tests/kaartveld-100-browser.test.mjs` | meet ook de nieuwe kaarten en de draad |
| `tests/telefoon-midden-115-browser.test.mjs` | **nieuw**: de telefoon en de voet |
| `tests/kleur-100.test.mjs` | staat de twee nieuwe stijlbladen na kaart-100.css toe |
| `package.json` | de nieuwe toets, ook in `npm test` |

## Toetsen

- De hele reeks is gedraaid: 274 snelle en 80 browsertoetsen.
- Wit op de nieuwe kaarten haalt op het slechtste punt onder de tekst minstens 6,9 : 1, op 1440 en op 390.
