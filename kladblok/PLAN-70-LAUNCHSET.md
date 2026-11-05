# Plan 70 · De launchset op de site (5 november 2026)

Je antwoorden ("alles advies"): **5 ja** (achter een schakelaar die uit staat), **6 a** (CASUAL: voorkant,
achterkant en detail als flat lay plus één stilstaand beeld op model met een losse houding), **7 ja** (CLASSIC:
ghost mannequin plus een stilstaand beeld op model dat in de lens kijkt), **8 ja en ja** (IG SPLIT is de
doorloper op /hooks; de bedragen die er staan, met "als foto of als video"; de verdeling foto/video beslis je
later), **9 ja** (BRAND MODEL blijft € 450), **10 a** (in de maak: alleen DUSK, zonder datum), **11 a** (de adressen
van Dunes, Glow, Lifestyle Video en Campaign een tijdelijke doorverwijzing, 302, naar het overzicht van de dienst).

## De schakelaar

Eén regel: `export const LAUNCHSET = false;` in **`src/data/launchset.js`**. Zet je hem op `true` en rol je uit,
dan staat de launchset op de site. Zolang hij `false` is, verandert er voor een bezoeker niets.

Elke stijl krijgt hoogstens één regel erbij:
- `opSite: 'tot-launch'`: staat op de site tot de schakelaar aan gaat (Dunes, Glow, Lifestyle Video, Campaign).
  **Terugzetten na de launch** (één per maand, DUSK eerst als nieuwe stijl): die regel weghalen.
- `opSite: 'launch'`: staat pas op de site als de schakelaar aan is (CASUAL, AUGUST, SHIFT).
- geen regel: staat er altijd (Classic, Flash, Phone-made, Motion, de eigen looks).

`opDeSite(stijl)` en `siteLijst(lijst)` in hetzelfde bestand zijn de enige plek die dat leest. Elke datafile
geeft naast de volledige lijst een **site-lijst** (`siteStyles`, `siteCatalogStyles`, `siteVideoStyles`). De
volledige lijst blijft voor de server, Studio, /admin, facturen en herbestellen: een oude bestelling in Dunes
blijft geldig en leesbaar. Wat een bezoeker ziet en kan kiezen, komt overal uit de site-lijst. Er komt geen
tweede lijst met stijlnamen.

Voor een proefbuild (om te kijken voordat je hem omzet): `VISUAILS_LAUNCHSET=aan npm run build` bouwt met de
schakelaar aan, zonder het bestand te veranderen. Dat gebruik ik hier om de aan-stand te bouwen, te toetsen en
schermafdrukken te maken.

## Per dienst

| Dienst | Uit (nu) | Aan (launch) | Wat er verandert |
|---|---|---|---|
| Catalog | Classic, Custom | **Classic**, **Casual**, Custom | Casual nieuw (`catalogStyles.js`/`.nl.js`), zelfde prijs als Classic (de ladder van catalog; `STYLE_PUNTEN` blijft leeg). Classic krijgt bij aan de nieuwe beschrijving: ghost mannequin, on-model stil en in de lens. Met twee huisstijlen wordt de keuze op /start/catalog vanzelf een verplichte keuzelijst (`StijlRegel`). |
| Lifestyle | Dunes, Flash, Glow, Phone-made, Custom | **Flash**, **Phone-made**, **August**, Custom | August nieuw (luxe). Dunes en Glow: `opSite: 'tot-launch'`. "Vier sferen" en de lookkiezer volgen de lijst. |
| Video | Motion, Lifestyle Video, Campaign, Custom | **Motion · 8 s**, **Shift · 8 s**, Custom | Shift nieuw (bewerkte look, meerdere shots, close-ups). Motion krijgt de beschrijving uit het launchschema (één doorlopend shot; het model doet één handeling, de camera reageert). Video blijft op aanvraag (`VIDEO_OP_AANVRAAG`). |
| Hooks | De doorloper | **IG SPLIT** | Dezelfde plek op /hooks, nieuwe naam en omschrijving, "als foto of als video", de bedragen die er staan. |
| Merkmodel | Brand model € 450 | idem | Niets. |
| In de maak | Still, Studio, Nacht, Draaitafel … | **DUSK**, zonder datum | `komendeStijlen.js`: bij aan alleen DUSK (lifestyle). |

**De voorpagina:** de galerij (`HalGalerij80`) toont bij aan geen tegels van Dunes en Glow (die linken anders
naar een pagina die er niet is). De lookkiezer in Hoe het werkt (`HalHoeDienst`, op /lifestyle) toont bij aan
Flash, Phone-made, August en de eigen look, met Flash gekozen. Aan de opening, de laptop, de metro en Wat we
maken verandert niets.

**De adressen** (`/lifestyle/dunes`, `/lifestyle/glow`, `/video/lifestyle`, `/video/campaign`, ook onder `/nl/`):
bij aan worden die pagina's niet gebouwd, en `src/middleware.js` stuurt ze met een **302** naar `/lifestyle/` of
`/video/` (ook onder `/nl/`). Niet in `public/_redirects`: die regels zouden bij uit de pagina's overschaduwen,
en op 14 oktober stopte een uitrol al op te veel regels daar.

## Bestanden die het raakt

- **Nieuw:** `src/data/launchset.js`, `tests/launchset-70.test.mjs`.
- **Data:** `styles.js`, `styles.nl.js`, `catalogStyles.js`, `catalogStyles.nl.js`, `videoStyles.js`,
  `videoStyles.nl.js`, `komendeStijlen.js`, `schema.js` (CRUMBS), `beeldenNodig.js` (de plaatshouders op het
  betaalpad), `videoExamples.js` (Shift), `faq.js` (het aantal vaste looks).
- **Pagina's:** `src/pages/{,nl/}{lifestyle,catalog,video}/[slug].astro` (uit de site-lijst).
- **Componenten:** `StylePicker`, `StijlRegel`, `OrderFlow` (catHuis), `HoldingPage` (de videolijst),
  `LifestyleHal`, `CatalogHal`, `VideoHal`, `VideoStyleHal`, `HooksHal`, `StartHal`, `TestSampleHal`,
  `GalleryHal`, `OverHal`, `HalGalerij80`, `HalHoeDienst`.
- **Server en Studio:** `src/middleware.js` (de 302); de rest leest de volledige lijst en blijft.
- **Toetsen:** de bestaande toetsen draaien in de stand uit en blijven zoals ze zijn, behalve waar ze de
  volledige lijst lazen terwijl ze de site bedoelen (die lezen nu de site-lijst).

## Wat jij moet aanleveren (per look, per beeldvak)

Alle beelden als `.webp` in `public/img/` (of straks via `BEELDEN.bat`, levering 71). Zolang een beeld er niet
is, staat er bij aan een plaatshouder met de naam en de maat; op de lookpagina's wordt een ontbrekend beeld
overgeslagen.

| Look | Beeldvak | Naam | Maat · verhouding (zoals het bestaande vak) |
|---|---|---|---|
| CLASSIC | voorkant, ghost mannequin | `catalog-classic-01.webp` | 1800 × 1800 · 1 : 1 (zoals `catalog-after.webp`) |
| CLASSIC | on-model, stil, in de lens | `catalog-classic-02.webp` | 1800 × 1800 · 1 : 1 |
| CASUAL | voorkant, flat lay | `catalog-casual-01.webp` | 1800 × 1800 · 1 : 1 |
| CASUAL | on-model, losse houding | `catalog-casual-02.webp` | 1800 × 1800 · 1 : 1 |
| AUGUST | kop van de lookpagina | `lifestyle-august-01.webp` | 928 × 1152 of groter · 4 : 5 (zoals `lifestyle-flash-01`) |
| AUGUST | kaart (overzicht, /start, de proef) | `lifestyle-august-02.webp` | 1340 × 2400 · 9 : 16 (zoals `lifestyle-flash-02`) |
| AUGUST | het raster op de lookpagina | `lifestyle-august-03.webp` t/m `-08.webp` | vrij, zoals het raster van Flash |
| SHIFT | de kaart op /video | `video-shift-poster.webp` | 9 : 16, zoals de poster van Motion |
| IG SPLIT | het voorbeeld op /hooks | het beeld dat er nu staat | — |

(Een lookpagina van catalog toont twee foto's, zoals Classic nu: de set en het beeld op model. Wil je er vier
per look, zeg het; dan komen er twee vakken bij.)

De precieze lijst die de site vraagt, met de pagina's erbij, staat na de bouw in `kladblok/LEVERING-70.md` §4.

## Wat ik niet doe

- Geen nieuwe vormgeving: de lookpagina, de hubs en de voorpagina houden hun sjabloon.
- Geen bedragen: Casual en Classic kosten hetzelfde (de ladder van catalog), Shift staat op aanvraag zoals alle
  video, IG SPLIT houdt de bedragen van de doorloper.
- Geen stockbeelden of beelden van anderen: alles wat ontbreekt is een plaatshouder.
- De teksten schrijf ik vanuit jouw woorden in het launchschema (§30.2 van het overzicht), NL en EN, allemaal in
  `kladblok/TEKSTEN-70.md` met een ●. Jij loopt ze na.
