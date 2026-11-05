# Plan 71: zelf beelden, iconen en teksten vervangen (5 november 2026)

Je antwoorden: vraag 12 = **a** (lokaal, met `BEELDEN.bat` en `TEKSTEN.bat`), vraag 13 = **a** (beelden, iconen
en teksten). Waarom: je wilt een plaatshouder, een oude foto, een icoon of een zin vervangen zonder dat het een
levering van Claude kost. Na de launch, met één nieuwe stijl per maand, wordt dat je vaste werk.

## 1 · De telling

Geteld met `node scripts/beelden.mjs --lijst` op de build van levering 70 (stand uit), plus de beelden die de data
noemt en die nog niet op een pagina staan. De lijst per vak, met de naam, de pagina's, de verhouding, de
minimale breedte en de maten die de site gebruikt, staat in **`kladblok/BEELDVAKKEN.md`** en als contactblad in
`eigen-beelden\BEELDVAKKEN.html`. Elke dubbelklik op BEELDEN.bat maakt ze opnieuw.

| | Aantal |
|---|---|
| Beeldvakken | **96** |
| Waarvan nog een plaatshouder | **18** |
| Waarvan oud (in `oude-beelden.json`, niet in `KLAAR`) | **0** op een pagina. Vijf oude namen staan nog in de lijst maar op geen enkele pagina meer: `brand-beam`, `brand-glow`, `sfeer-balk`, `sub-beam`, `sub-light`. |
| Iconen in het kit (`src/data/iconen.js`) | 39 |

**De 18 plaatshouders:**

| Vak | Waar | Verhouding · minstens |
|---|---|---|
| `lifestyle-august-01` t/m `-08` | /lifestyle/august (met de launchset) | dezelfde maat als het vak in Flash: 01–03 4 : 5 (928 × 1152), 04–05 9 : 16 (1340 × 2400), 06–08 4 : 3 (2400 × 1792). 02 is ook de kaart: minstens 960 px. |
| `catalog-classic-01`, `-02` | /catalog/classic (de nieuwe Classic, met de launchset) | 4 : 3 (1600 × 1207) · 1 : 1 (1800 × 1800), de maat van de Classic van nu |
| `catalog-casual-01`, `-02` | /catalog/casual (met de launchset) | idem |
| `lucas` | /about, het portret naast de opening | 4 : 5 · 1200 px |
| `hooks-kop` | /hooks, naast de kop | 4 : 5 · 1200 px |
| `editions-maandgrid` | /editions, naast de kop | 4 : 5 · 1200 px |
| `dienst-video-shirt` | /gallery, de videorij | 9 : 16 · 1080 px |
| `lifestyle-band-04` | het strookje voorbeeldbeelden in het bestelformulier | 16 : 9 · 1800 px |
| `lifestyle-flash-product` | de laptop op de voorpagina en /lifestyle, "Alleen het product" | 4 : 5 · 928 px |

De vakken van een nieuwe look hebben nog geen bestand en staan op geen pagina. Ze krijgen de maat van HETZELFDE vak in
de eerste look die er wel een heeft (de kop van August die van de kop van Flash), zodat een nieuwe look in het
bestaande sjabloon past.

## 2 · De opzet (vraag 12 = a)

Drie knoppen om te dubbelklikken, zoals `FORMATEN.bat`: een korte uitleg bovenin, alleen Node en wat al in
`package.json` staat (geen Python), het resultaat GROEN of ROOD in gewone woorden, met wat je doet als het rood is.
Er gaat niets online: dat doet UITROLLEN.bat, zoals altijd.

**`BEELDEN.bat`** (`scripts/beelden.mjs`)
1. Zet een beeld (png, jpg of webp) onder de **naam van een vak** in `eigen-beelden\`, of een svg onder de naam van
   een **icoon**. Dubbelklik.
2. Elk beeld wordt gekeurd: de verhouding (hoogstens 2 % ernaast) en de breedte (minstens de grootste maat die de site
   gebruikt, en minstens het beeld dat er nu ligt).
3. Goed: het beeld komt op de maat van het vak (ligt er een beeld, dan precies dezelfde breedte en hoogte, zodat de
   width en height in de pagina's en de w-maten in de srcset blijven kloppen), als webp kwaliteit 92; elke kleinere
   maat als webp 80; de telefoonversie via `scripts/make-telefoon.mjs` (met de kwaliteit die daar per foto gemeten
   is); de AVIF via `scripts/make-avif.mjs`. Een oude naam komt in `KLAAR` in `src/data/beeld.js`.
4. **De herkomst (C2PA).** 34 webp's en 119 AVIF's op de site dragen content credentials. Draagt jouw bestand ze ook
   (een jpg of png uit de beeldmaker), dan gaan ze mee in elk beeld dat eruit gemaakt wordt, zoals bij de beelden die
   er nu staan. Zonder dit zou het omzetten ze stilletjes weghalen (`docs/FABLE-EN-VISUAILS.md`).
5. Het oude beeld gaat naar `eigen-beelden\_vorige\`, wat je erin zette naar `eigen-beelden\_verwerkt\` (een tweede
   dubbelklik doet het niet nog eens). Het contactblad, oud en nieuw naast elkaar, gaat open in je browser.
6. Een icoon wordt tegen het kit gelegd (raster 24, gevuld, geen lijn, geen transform, geen kleur, geen ingesloten
   beeld, alleen paden binnen het raster) en dan in `src/data/iconen.js` gezet. Alleen een icoon dat er al is: een
   nieuw icoon heeft code nodig die het gebruikt.

**`TEKSTEN.bat`** (`scripts/tekstblad.mjs` en het nieuwe `scripts/tekstblad-xlsx.mjs`)
Bouwt de site, haalt elke zin die een klant leest eruit (de pagina's NL en EN, het menu, VISUAILS Studio, de
e-mails, WhatsApp: nu 3148 regels) en zet ze in een tabel, die vanzelf opengaat. Je vult alleen "Engels nieuw" en
"Nederlands nieuw" in. Elke keer een nieuwe tabel met de datum in de naam: een tabel die je aan het invullen bent,
wordt nooit overschreven.

**`TEKSTEN-TOEPASSEN.bat`** (`scripts/tekst-toepassen.mjs --vraag`)
Sleep de ingevulde tabel in het venster. Je ziet per zin wat er staat en wat het wordt, en typt J of N. Bij J gaat
eerst een kopie van elk bestand dat verandert naar `tekstronde\terug\`, dan worden de zinnen vervangen, dan draait
de hele testreeks met een nieuwe build. Rood: hij biedt aan om alles terug te zetten zoals het was.

## 3 · Wat er niet in zit, en waarom

- **Uploaden in /admin** (vraag 12 = b): niet gebouwd. R2, de cache, de CSP en de herkomsttag waren dan nodig
  geweest, en een beeld dat buiten git om op de site komt, is een beeld dat niet in de geschiedenis staat.
- **Een nieuw beeldvak of een nieuw icoon maken:** daar is code voor nodig (een pagina die het vak of het icoon
  gebruikt). Vervangen kan zelf; toevoegen blijft een levering.
- **Een zin die de code samenstelt** (een bedrag, een aantal): de kolom "let op" in de tabel zegt het. Typ je het
  bedrag voluit, dan staat het vast en beweegt het niet meer mee met de prijslijst.
