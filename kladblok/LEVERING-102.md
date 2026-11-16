# Levering 102 · 15 november 2026

De intake op maat in Studio: `/account/op-maat`, met de schermen 1 tot en met 8 uit lijst 112 (van de keuze tot het versturen). De schatting rekent mee. Gebouwd op levering 101.

## Wat de klant ziet

- **Op maat** staat als nieuw onderdeel in de navigatie van Studio.
- **Zonder dienst:** vier tegels (catalog, lifestyle, hooks, video), met waar de prijs begint en wat altijd inbegrepen is, plus zijn aanvragen met hun stand.
- **Met een dienst:** het formulier, met de schatting rechts.
  - Op een smal scherm staat de schatting als een balk onderaan met het totaal en de knop. Tik op het totaal en de regels klappen open (lijst 112, live = a).
  - Alles wordt opgeslagen terwijl hij typt. Hij kan weggaan en later verder.
- **Je merk:** één keer, voor alle aanvragen.
- **Catalog:**
  - de schaal (licht, midden, een hele wereld) zet de keuzes aan (lijst 112, schaal = a);
  - zijn producten (soort, aantal, legwijze);
  - de keuzes met hun bedrag;
  - de achtergrond;
  - het model (van ons, zijn merkmodel, of een nieuw merkmodel voor €450).
- **Lifestyle:** het moment met de drie eisen, het aantal, en de keuzes (plek, tweede persoon, pose-idee, bijzonder licht, het model).
- **Hooks:**
  - het idee (van hem, of wij bedenken het, met de vragen erbij);
  - waar de hook komt;
  - de extra's per hook (tekst, tweede product, personen, effecten, eindbeeld);
  - iets anders.
- **Video:**
  - het idee met de vragen;
  - product en materiaal;
  - de seconden (minimaal 8);
  - de shotlijst met per shot een camerabeweging in drie groepen (alleen bij zijn eigen idee; bij ons idee maken wij hem);
  - de omgeving, personen, tekst en eindbeeld;
  - de ruwe beelden (gratis, zonder garantie).
- **Voor elke dienst:** referentiebeelden met waar hij op let, wat hij nooit wil zien, de vier vragen buiten de lijntjes (ingeklapt), en praktisch (waar de beelden komen, wanneer, hoe we hem bereiken).
- **Alleen aanvinken zegt niets** (lijst 112). Bij elke keuze staat een veld "wat bedoel je", met een voorbeeld erin. Zolang een veld leeg is, staat het in het paneel onder "Nog nodig om te versturen" en kan hij niet versturen.
- **Versturen kost niets.** Daarna staan de velden vast en zegt de pagina wat er nu gebeurt.

## De uitzondering op "geen script"

- **De regel:** Studio draait zonder script (de CSP). Alleen `/account/op-maat` met een dienst mag één bestand laden: `/js/op-maat.js`, van onze eigen site (`script-src 'self'`, `connect-src 'self'`). Code in de pagina zelf en scripts van buiten blijven geblokkeerd. De keuze uit vier diensten draait ook zonder script.
- **Wat het script doet:** het rekent zelf niets uit. De schatting komt van de server (`src/data/opMaatPrijs.js`), na elke opslag. Tekst van de klant gaat nooit als HTML terug op het scherm.
- **De bewaking:** `tests/op-maat-studio-browser.test.mjs` controleert dat elke andere Studio-pagina zonder script blijft.

## De testreeks blijft niet meer hangen

- **Het plafond:** `scripts/testreeks.mjs` (wat `UITROLLEN.bat` draait) stopt een test die langer dan 10 minuten loopt, met zijn hele procesboom (Lucas, 03:07: "Zorg ervoor dat de test niet blijft haken"). Hij telt dan als FOUT met "bleef hangen", en de reeks gaat door. In te stellen met `TESTREEKS_MAX_MIN`.
- **De bewaking:** `tests/testreeks.test.mjs` controleert het met een nep-test die eeuwig wacht.

## Nog niet in deze levering

- **De 3D-stap** (de schoen, tas of pet zelf draaien, lijst 107). Daar zijn 3D-modellen voor nodig. Tot dan beschrijft de klant de stand in een zin.
- **Schermen 9 en 10 uit lijst 112:** de voorbeeldrondes met "wat is goed, wat moet anders, wat moet blijven", en de offerte met de aanbetaling. Daarvoor moet /admin eerst een voorbeeld en een offerte kunnen klaarzetten. Dat is de volgende stap.

## Bestanden

- **Nieuw:**
  - `src/pages/account/op-maat.astro`
  - `src/styles/op-maat.css`
  - `public/js/op-maat.js`
  - `tests/op-maat-studio-browser.test.mjs` (`npm run test:opmaat-browser`)
- **Gewijzigd:**
  - `src/layouts/StudioLayout.astro` (de prop `script`)
  - `src/lib/studioKoppen.js` (`studioHeaders({ script })`)
  - `src/lib/account.js` (de navigatie en de sectie `opmaat`)
  - `src/lib/opMaatApi.js` (na opslaan de schatting, met namen)
  - `src/lib/opMaat.js` en `src/data/opMaatPrijs.js` (`gekozen`: een keuze telt mee zodra hij hem aanzet)
  - `package.json`
  - `scripts/testreeks.mjs` en `tests/testreeks.test.mjs`

## Stand

- De hele reeks groen: 272 toetsen zonder browser en 78 met browser.
- Vier browsertoetsen faalden alleen in de drukte van drie tegelijk (beweging83, opening90, proefbrowser, klantstand); los opnieuw gedraaid waren ze groen.
- Uitrollen doe je zelf met `UITROLLEN.bat`.
