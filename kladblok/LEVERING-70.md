# Levering 70: de launchset op de site, achter een schakelaar (5 november 2026)

Cloudsessie, branch `claude/voor-de-launch`, na levering 69. Je antwoorden ("alles advies"): 5 ja, 6 a, 7 ja,
8 ja en ja, 9 ja, 10 a, 11 a. Het plan staat in `kladblok/PLAN-70-LAUNCHSET.md`; de teksten in
`kladblok/TEKSTEN-70.md`.

**Zolang je niets omzet, ziet een bezoeker precies de site van nu.** Dezelfde pagina's, dezelfde looks, dezelfde
teksten (op één zin na, zie §5). Uitrollen met UITROLLEN.bat, zonder migratie.

## 1 · De schakelaar omzetten

1. Zorg dat je beelden er zijn (§4). Zonder beelden slaat de lookpagina ze over en staat er op de kaart van
   August een plaatshouder.
2. **Lees eerst `kladblok/LAUNCHSET-OMZETTEN.md`.** Met de schakelaar aan zijn er nu 27 toetsen rood: een deel
   wacht terecht op je beelden, een deel moet een stijl kiezen op /start/catalog (twee huisstijlen = een verplichte
   keuze), een deel noemt de looks van nu hard. Zonder die ronde stopt UITROLLEN.bat bij de testreeks en gaat er
   niets live. *Advies:* omzetten in een chat met Claude, op de dag dat je beelden er zijn.
3. Open **`src/data/launchset.js`**, regel **54**: `const LAUNCHSET_IN_HET_BESTAND = false;` → `true`.
4. Dubbelklik UITROLLEN.bat.

Kijken vóór je omzet, zonder iets te veranderen: `VISUAILS_LAUNCHSET=aan npx astro build --outDir .astro/dist-launch`
bouwt de site met de schakelaar aan in een aparte map (`.astro/` gaat niet mee naar GitHub).

**Na de launch, één stijl per maand terug:** haal bij die stijl de regel `opSite: 'tot-launch',` weg (Dunes:
`styles.js` r. 37 en `styles.nl.js` r. 29; Glow: r. 137 en r. 129; Lifestyle Video: `videoStyles.js` r. 188 en
`videoStyles.nl.js` r. 173; Campaign: r. 242 en r. 226). Een nieuwe stijl zoals DUSK komt erbij zoals August erbij
kwam; daarna haal je hem uit "in de maak" (`komendeStijlen.js`, `KOMEND_LAUNCH`).

## 2 · Wat er met de schakelaar aan staat

| Dienst | Op de site | Wat er verandert |
|---|---|---|
| Catalog | Classic, **Casual**, Custom | Casual is nieuw (flat lay voor, achter en detail, plus één losse foto op model). Classic krijgt de beschrijving van het launchschema: ghost mannequin, on-model stil en in de lens. Zelfde prijs (de ladder van catalog). Op /start/catalog wordt de stijl vanzelf een verplichte keuze. |
| Lifestyle | Flash, Phone-made, **August**, Custom | August is nieuw (luxe). Dunes en Glow zijn van de site. "Vier sferen" wordt "drie sferen". De lookkiezer in Hoe het werkt (op /lifestyle) toont Flash, Phone-made, August en de eigen look, met Flash gekozen. |
| Video | **Motion · 8 s**, **Shift · 8 s**, Custom | Motion krijgt de beschrijving van het launchschema (één doorlopend shot, het model doet één handeling, de camera reageert). Shift is nieuw. Op aanvraag zoals alle video. "Motion & Lifestyle" wordt "Motion & Shift", "Campaign" in de koopblokken wordt "Custom, per seconde vanaf 8 seconden". |
| Hooks | **IG Split** | De doorloper heet IG Split, met "als foto of als video" bij de prijs. |
| In de maak | **Dusk** | Alleen Dusk, zonder datum; bij catalog, video en hooks niets. |
| De voorpagina | — | De galerij toont geen tegels van Dunes en Glow. De opening, de laptop, de metro en Wat we maken blijven zoals ze zijn. |
| /about, /gallery | — | De foto's en het filter van Dunes en Glow vallen weg; de beschrijving voor Google noemt Flash en Phone-made. |
| De adressen | — | `/lifestyle/dunes`, `/lifestyle/glow`, `/video/lifestyle`, `/video/campaign` (ook onder `/nl/`) sturen met een **302** naar `/lifestyle/` of `/video/` (`src/middleware.js`). |

**Wat er niet verandert:** de server, Studio, /admin, de factuur en herbestellen kennen elke stijl die er is of
was (de volledige lijst). Een oude bestelling in Dunes blijft geldig en leesbaar, en een abonnee met Glow als vaste
look houdt die. Kiezen kan alleen uit wat er op de site staat. BRAND MODEL blijft € 450.

## 3 · Hoe het gebouwd is

- **`src/data/launchset.js`** (nieuw): de schakelaar, `opDeSite()`, `siteLijst()`, `inLaunch()` (de velden in
  `bijLaunch`, voor Classic en Motion), `verborgenAdressen()` voor de 302, en `vulVasteLooks()`: het aantal vaste
  looks in woorden ("vier sferen") volgt wat er op de site staat.
- **De data:** elke lijst heet nu `alleStyles` / `alleCatalogStyles` / `alleVideoStyles` (alles), en de oude naam
  (`styles`, `catalogStyles`, `videoStyles`) is de site-lijst. Daardoor hoefden de pagina's, hubs en het
  bestelformulier niet om; alleen de server (`functions/api/order.js`), /admin, Studio (`account.js`,
  `vasteLook.js`) en `getStyle()`/`getCatalogStyle()`/`getVideoStyle()` lezen bewust alles. Er is geen tweede
  lijst met stijlnamen.
- **Waar een stijl hard genoemd stond**, volgt hij nu de site-lijst: de beeldrij op /lifestyle, de band op /about,
  de galerij (/gallery en de voorpagina), de lookkiezer in Hoe het werkt, de koopblokken en knoppen op /video
  (`!QUOTED.has(slug)` in plaats van "motion of lifestyle"). Shift kreeg zijn regel in de tabellen van
  `VideoHal` en `StylePicker`, twee voorbeelden in `videoExamples.js` en een broodkruimel in `schema.js`; August
  een kaart in `StylePicker` en een plaatshouder op het betaalpad (`beeldenNodig.js`, alleen met de schakelaar aan).

## 4 · Wat jij moet maken

Alle beelden als `.webp` in `public/img/` (of straks met BEELDEN.bat, levering 71):

| Look | Beeldvak | Naam | Maat |
|---|---|---|---|
| CLASSIC | de set, ghost mannequin | `catalog-classic-01.webp` | 1800 × 1800 (1 : 1, zoals `catalog-after`) |
| CLASSIC | on-model, stil, in de lens | `catalog-classic-02.webp` | 1800 × 1800 |
| CASUAL | de set, flat lay | `catalog-casual-01.webp` | 1800 × 1800 |
| CASUAL | on-model, losse houding | `catalog-casual-02.webp` | 1800 × 1800 |
| AUGUST | kop van de lookpagina | `lifestyle-august-01.webp` | 928 × 1152 of groter (4 : 5) |
| AUGUST | de kaart (/lifestyle, /start, de proef, de lookkiezer) | `lifestyle-august-02.webp`, plus `-w960` en `-w380` | 1340 × 2400 (9 : 16, zoals `lifestyle-flash-02`) |
| AUGUST | het raster op de lookpagina | `lifestyle-august-03.webp` t/m `-08.webp` | zoals het raster van Flash |
| SHIFT | twee voorbeeldclips | `videoExamples.js` (`shift-1`, `shift-2`), zoals Motion | 9 : 16, 8 s |

(De `-w960` en `-w380` maakt BEELDEN.bat straks voor je; nu met `scripts/make-thumbs.mjs`.) Zonder de beelden
van Classic staat de lookpagina van Classic met de schakelaar aan zonder foto's: de oude foto's tonen een model en
geen ghost mannequin.

## 5 · Wat er nu al verandert (ook met de schakelaar uit)

- **FAQ "Wat kost een clip?":** de zin "Met een abonnement kost een Motion-clip 5 credits" is weg (NL en EN).
  Nagekomen bij levering 69 (vraag 2 = a): credits zijn in het formulier alleen voor catalog en lifestyle.
- De rest is onzichtbaar: dezelfde zinnen, nu met het aantal uit de data in plaats van getypt.

## 6 · Nagekeken

- **De testreeks, stand uit** (`TESTREEKS_TEGELIJK=4 node scripts/testreeks.mjs`): **282 van 282 groen** (9 min 25 s).
  Twee kregen een herkansing: `test:opruimlijst` (ik paste hem aan terwijl de reeks liep) en `test:bedankpagina`
  (onder drukte; los 96/96, en ook in de reeks van 69 viel hij één keer om, zie §7).
- **Nieuw:** `tests/launchset-70.test.mjs` (57): beide standen op de data (wat er per dienst op de site staat, NL en
  EN dezelfde slugs, de adressen met een 302, in de maak, het aantal vaste looks, Classic en Motion bij de launch, de
  prijs volgt de dienst, wie welke lijst leest), de build in `dist/` in de stand waarmee hij gemaakt is, en de
  proefbuild in `.astro/dist-launch` als die er ligt. Groen in beide standen.
- **Bijgewerkt:** `tests/video-examples.test.mjs` (de voorbeelden horen bij alle stijlen; de pagina's bij de
  site-lijst), `tests/opruimlijst.test.mjs` (de tegels in Studio).
- **De stand aan:** gebouwd (`VISUAILS_LAUNCHSET=aan`) en nagekeken op 1440 en 390: de lookpagina's van August,
  Casual en Shift, /lifestyle, /catalog, /video, /hooks, /start, /start/catalog, /test-sample, de voorpagina en
  /gallery, NL en EN. Geen scriptfout, geen 404 (op de API na, die de kale server hier niet heeft), geen link naar
  een verborgen pagina. De lookpagina van August staat netjes in het bestaande sjabloon en slaat de ontbrekende
  beelden over; op /video staan Motion en Shift met "clip volgt", de koopblokken zeggen "Motion & Shift" en "Custom,
  per seconde"; op /hooks "IG Split"; op /nl/lifestyle "drie sferen" en in de maak alleen Dusk.
- **De hele reeks in de stand aan:** 27 rood. Zie `kladblok/LAUNCHSET-OMZETTEN.md`. Eén was een echte fout en is
  gerepareerd: een abonnee met Glow als vaste look zag zijn look in Studio niet meer staan, en zou hem bij opslaan
  kwijtraken.
- **`npm run visueel`:** de referentie is van vóór levering 74 (zie levering 69); in de stand uit verandert er op
  één zin na niets (§5).

## 7 · Open punten

- **/start/catalog kiest Casual niet voor.** Met twee huisstijlen is de stijl een verplichte keuzelijst zonder
  voorkeur; de knop "Kies Casual" op de lookpagina landt op het formulier en de klant kiest daar opnieuw. *Advies:*
  later een `?catalog_style=casual` die de keuze voorinvult, zoals `?style=` bij lifestyle.
- **De lookpagina van Shift** leent de beelden van Motion (`VideoStyleHal`, zoals elke videostijl zonder eigen
  set). *Advies:* een eigen set zodra je Shift-clips hebt.
- **/gallery, "Zo ziet een levering eruit":** een echte, eerdere levering staat er als "Glow · lifestyle". Die blijft
  met de schakelaar aan staan, want het is een levering en geen look om te kiezen. Zeg het als hij weg moet.
- **`test:bedankpagina` viel twee keer om onder drukte** (vier toetsen tegelijk) en slaagde los. Een kandidaat voor
  dezelfde aanpak als `beweging-83` (wachten op een voorwaarde); nog niet gedaan.
- **Teksten die een stijl bij naam noemen** ("Motion & Shift", "Campaign per project", "Flash en Phone-made" op
  /gallery) volgen de schakelaar, maar niet een stijl die later terugkomt. Komt Lifestyle Video terug, dan moeten
  die zinnen mee; ze staan in `TEKSTEN-70.md`.
- **De vaste looks in Studio:** met de schakelaar aan kiest een abonnee uit Flash, Phone-made en August; wie al
  Dunes of Glow had, houdt die: zijn tegel blijft staan en aangevinkt, en opslaan haalt hem niet weg (gevonden met
  de reeks in de stand aan, gerepareerd in `account.js`). Het bestelformulier biedt Dunes dan niet meer aan.
  *Advies:* zo laten; mail die abonnees bij de launch.

## 8 · Mag weg

Niets.

## 9 · Voor het overzicht

- **§2 en §24.2:** de launchset is gebouwd, achter `LAUNCHSET` in `src/data/launchset.js` (uit). Bij aan: catalog
  Classic, Casual, Custom; lifestyle Flash, Phone-made, August, Custom; video Motion, Shift, Custom; hooks IG Split;
  in de maak Dusk; Dunes, Glow, Lifestyle Video en Campaign een 302 naar hun dienst.
- **§16.1:** nieuw punt: de beelden van §4 maken, dan de schakelaar omzetten (r. 54) en uitrollen.
- **§16.2:** "De site in lijn met het launchschema" en "Prijs BRAND MODEL" (blijft € 450) zijn besloten.
- **§16.3 punt 3:** gebouwd (levering 70), wacht op de beelden.
- **§17 punt 21:** opgelost zodra de schakelaar om is.

## 10 · Bestanden

- **Nieuw:** `src/data/launchset.js`, `tests/launchset-70.test.mjs`.
- **Data:** `src/data/styles.js`, `styles.nl.js`, `catalogStyles.js`, `catalogStyles.nl.js`, `videoStyles.js`,
  `videoStyles.nl.js`, `komendeStijlen.js`, `schema.js`, `beeldenNodig.js`, `videoExamples.js`, `faq.js`.
- **Componenten:** `src/components/order/StylePicker.astro`, `LifestyleHal.astro`, `VideoHal.astro`, `HooksHal.astro`,
  `HalHoeDienst.astro`, `HalGalerij80.astro`, `OverHal.astro`, `GalleryHal.astro`.
- **Pagina's:** `src/pages/gallery.astro`, `src/pages/nl/gallery.astro`, `src/pages/start/custom-look.astro`,
  `src/pages/nl/start/custom-look.astro`.
- **Server, Studio, /admin:** `src/middleware.js`, `functions/api/order.js`, `src/lib/admin.js`, `src/lib/account.js`,
  `src/lib/vasteLook.js`, `src/lib/invoice.js`.
- **Toetsen:** `tests/video-examples.test.mjs`, `tests/opruimlijst.test.mjs`; `package.json` (`test:launchset70` in de keten).
- **Kladblok:** `kladblok/LEVERING-70.md` (dit bestand), `kladblok/PLAN-70-LAUNCHSET.md`, `kladblok/TEKSTEN-70.md`,
  `kladblok/LAUNCHSET-OMZETTEN.md`, `kladblok/COMMIT-BERICHT.txt`.
