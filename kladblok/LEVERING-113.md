# Levering 113 · De voorpagina: video tot bovenaan, geen bedrading, mint in plaats van blauw uur, soepeler video, stappen klikbaar

**16 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Om 20:30, 20:36, 20:43 en 20:45 schreef je vijf dingen over de site. Die staan hier. Het nieuwe doek, de nieuwe
achtergronden in het pakket en het systeem voor de secties komen in lijst 124: daar kies je eerst.

## 1 · De video vult het vlak achter de bovenbalk

- **Wat je zag:** een witte strook achter de bovenbalk, boven de video.
- **Nu:** de video schuift omhoog onder de balk door, tot de bovenrand van het venster (gemeten: de video begint op 0 px).
  De balk zelf blijft hetzelfde.
- **Bestand:** `src/styles/banner-94.css`.

**De video in zijn geheel, niet ingezoomd** (21:07: *"hoeft niet het hele scherm te vullen en mag aan de onderkant al wat
wit laten zien"*):
- de banner is nooit hoger dan de video zelf: 16 : 9 over de hele breedte. Is het venster hoger, dan zie je onderaan de
  grond, en die is even licht als de achtergrond van de video, dus er is geen naad;
- gemeten (breedte × hoogte van het venster, dan de hoogte van de banner):

  | venster | banner | wat je ziet |
  |---|---|---|
  | 1920 × 1080 | 1080 | de hele video, precies het scherm |
  | 1440 × 900 | 810 | de hele video, onderaan 90 px grond |
  | 1280 × 800 | 720 | de hele video, onderaan 80 px grond |
  | 2560 × 1440 | 1440 | de hele video (de grens van 1200 is eraf) |
  | 1024 × 768 | 720 | een strookje afgesneden (de video zou 576 hoog zijn; het vlak met de stappen heeft 720 nodig) |

- **De telefoon blijft zoals hij was.** Daar staat het beeld boven de uitleg, 62 % van het scherm hoog. De hele video
  zou op 390 breed maar 219 px hoog zijn, met de kop erin. Wil je daar ook de hele video, dan maak ik er een smalle
  versie voor; zeg het maar.

## 2 · De aderen en de bedrading zijn weg

- **Wat er weg is:**
  - de lijnen over de hele pagina (`lichtnet.js`): een canvas zo groot als het venster dat 24 keer per seconde
    opnieuw getekend werd. Dat was de grootste vreter;
  - de aderen tussen de kaarten en de draden in de kaarten (in `kaartveld.js`).
- **Wat blijft:** het veld in de kaarten zelf, en het licht dat onder de tekst wijkt.
- **Daarnaast:** het veld van een kaart tekent nu alleen nog binnen de kaart. Voorheen was het 150 px groter aan elke
  kant (voor de aderen), en dat liep over de volgende sectie.
- **Bestanden:** `src/layouts/Layout.astro` (laadt `lichtnet.js` niet meer; het bestand staat er nog, ongebruikt),
  `src/scripts/kaartveld.js`, `src/styles/kaart-100.css`.

## 3 · Geen blauw uur meer in de gloed en bij het inloggen

- **De gloed achter woorden als *WHAT YOU GET BACK.*** Dat was geen kleur in de code maar een plaatje
  (`lucht-blauw-uur.webp`). Het nieuwe `public/img/hal/lucht-mint.webp` is hetzelfde plaatje in mint 800, 700 en
  een tint ertussen. Het lichtste punt haalt 5,3 : 1 met de witte grond, dus de witte letters erop blijven leesbaar.
- **De hover op het woordmerk bij het inloggen en in de lade.** Ook dat waren plaatjes (`raam-0`, `raam-3`, `raam-6`).
  Ze zijn herkleurd naar mint 800, 700 en 600. Ze hebben **nieuwe namen** (`raam-m-0`, `raam-m-3`, `raam-m-6`): een
  browser die de oude nog bewaart, ziet zo meteen de nieuwe.
- **Bestanden:** `src/styles/hal.css`, `src/data/stukken.js`, `src/components/VMerk.astro` en de vier nieuwe plaatjes.
  De oude plaatjes blijven in je map staan; niets gebruikt ze nog.

## 4 · Waarom de video haperde, en wat er nu anders is

**Waarom.** De video speelt niet gewoon af: elk beeld wordt overgezet naar een tekenvlak, en daarover ligt het negatief
onder de kop. Tegelijk liepen er nog drie andere dingen. Samen werd dat per beeld te veel:

| oorzaak | wat het kostte | nu |
|---|---|---|
| de bedrading over de hele pagina | een venstergroot vlak, 24 keer per seconde opnieuw | weg |
| het tekenvlak van de video op een retina-scherm | 2 tot 3 keer zoveel beeldpunten als de video zelf heeft | nooit groter dan de video (1920 breed) |
| het negatief | over de hele breedte en hoogte van de video | alleen nog waar de kop staat (op 1440 breed: 915 × 130 in plaats van 1440 × 900) |
| de aderen in het kaartveld | rekenwerk voor elk beeldpunt rond elke kaart | weg |
| de videobestanden zelf | 19,5 MB (1920) en 9,8 MB (1280) | blijft; zie hieronder |

**Wat blijft.** De video zelf is 5,8 Mbit/s. Op een trage verbinding kan hij nog even wachten tot het volgende stuk
binnen is. Wil je dat ook weg, dan kan ik hem kleiner maken (bijvoorbeeld 1920 op ongeveer 3 Mbit/s, de helft van het
bestand). Dat kost wat scherpte in de donkere vlakken. Zeg het als je dat wilt; ik doe het niet zonder jouw ja.

## 5 · Elke stap is klikbaar

- **Wat je zag:** je klikte op stap 2 of 3 en de video sprong terug naar stap 1.
- **Waarom:** de klik zette de video op een moment dat nog niet geladen was. Dan moet de browser dat stuk apart
  opvragen. Lukt dat niet meteen, dan begint hij opnieuw, bij 0, en dat is stap 1.
- **Nu:**
  - de stap waar je op klikt gaat **meteen** open;
  - is dat stuk video al binnen, dan springt de video er direct heen;
  - is het nog niet binnen, dan haalt de site de hele video in één keer op en speelt verder vanaf de gekozen stap. Het
    beeld blijft staan tot hij er is; er is geen sprong terug;
  - dat ophalen gebeurt alleen bij wie naar de stappen gaat (met de muis, de toets of de vinger), dus wie er niet
    aankomt laadt de video niet twee keer;
  - zolang de muis of de focus op de stappen staat, blijft de gekozen stap open en loopt de lijst niet door.
- **Gemeten** (lokaal, zes klikken door elkaar: 5, 3, 2, 4, 1, 5): elke klik kwam op de juiste stap, binnen 4 tot
  135 ms.
- **Bestand:** `src/components/HalBanner94.astro`.

## Toetsen

- `tests/kaartveld-100-browser.test.mjs` vroeg nog om de aderen, de draden en `lichtnet`. Hij toetst nu dat ze weg zijn:
  het veld tekent niets buiten de kaart, geen draden in de kaart, en `Layout.astro` laadt `lichtnet.js` niet (42 goed).
- **De hele reeks is gedraaid na een nieuwe build:** 274 snelle toetsen en 81 browsertoetsen, alle groen.
- Twee browsertoetsen vielen om terwijl de hele reeks tegelijk liep: `opening90` en `opmaat3d-browser`. Los gedraaid zijn
  ze groen (52 van 52 en 44 van 44). `opening90` toetst ook dat de video in het geheugen wordt vrijgegeven als je van de
  voorpagina weggaat; dat klopt.

## Bestanden

| bestand | wat |
|---|---|
| `src/styles/banner-94.css` | de video tot bovenaan |
| `src/layouts/Layout.astro` | `lichtnet.js` niet meer geladen |
| `src/scripts/kaartveld.js` | geen aderen en draden, niets buiten de kaart |
| `src/styles/kaart-100.css` | het veld zo groot als de kaart |
| `src/styles/hal.css` | de gloed in mint |
| `public/img/hal/lucht-mint.webp` | nieuw |
| `src/data/stukken.js`, `src/components/VMerk.astro` | de hover van het woordmerk in mint |
| `public/img/stuk/raam-m-0.webp`, `raam-m-3.webp`, `raam-m-6.webp` | nieuw |
| `src/components/HalBanner94.astro` | lichter tekenen, stappen klikbaar |
| `tests/kaartveld-100-browser.test.mjs` | bijgewerkt |
