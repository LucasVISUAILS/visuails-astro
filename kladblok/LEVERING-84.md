# Levering 84 · De laptop van de opening: lichter, sneller, en de beelden goed in het scherm

**2 november 2026 (gevraagd om 21:34). Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.** Bouwt voort
op levering 83. De maten staan in `docs/RUST-80.md` §12, de metingen in `kladblok/levering-84/meting.json`. De
filmpjes voor en na en je oordeel: lijst 70.

---

## 1 · Wat je vroeg

- **21:34**, met een schermafdruk van de laptop: *"De laptop animatie lagged enorm en mag wel sneller dan nu. Ook
  zitten de beelden er niet goed in en gaan ze tijdens de animatie verkeerd vervormen."*

## 2 · Wat ik vond

Elk beeld van de video nagemeten (111 beelden), en het doek beeld voor beeld opnieuw getekend.

- **De video was te hoog.** Drie banden onder elkaar (kleur, dekking en de gaten van de schermen): 2560 × 3258 en
  1920 × 2442. Veel videochips pakken H.264 alleen uit tot 4096 × 2304 (sommige tot 4096 × 2160); daarboven doet
  de processor het, 8 miljoen beeldpunten per beeld, ruim 30 keer per seconde. Dat is waarschijnlijk het haperen
  (jouw computer kon ik hier niet meten; zie §6).
- **De grond scheen door het scherm.** Op je schermafdruk zie je boven het scherm een lichte streep: de stilstaande
  foto heeft zijn eigen gaten, 2 tot 3 beeldpunten ruimer dan het eerste beeld van de video, en de schermen lagen
  op de maat van de video. Tijdens het dichtklappen werd het erger: de derde band (de gaten) miste bij de bijna
  dichte klep tot 76 000 beeldpunten van het scherm, en bij de telefoon die het beeld uit ging bleef een strook van
  zijn scherm leeg.
- **Het beeld lag niet vast op het scherm.** De hoeken waren over 7 beelden glad gemaakt en vanaf beeld 40
  doorgetrokken in plaats van gemeten, en het telefoonscherm was 11 × 15 beeldpunten te klein. Daarnaast nam het
  doek soms de hoeken van het volgende beeld (het rekende met de tijd van de video, niet met het beeld dat de
  browser toonde): dan lag de winkel een beeld voor op de klep.
- **Het flikkerde.** De winkel (1600 breed) werd op ± 500 punten getekend zonder verkleinen, de telefoonfoto 5 keer
  kleiner: dunne lijnen en letters werden trappetjes die tijdens het bewegen verschoven. Dat zie je als vervormen.
- **Een hapering bij het begin.** Het WebGL-doek werd pas bij de tweede scroll gemaakt.

## 3 · Wat er nu staat

- **De video**: twee banden (kleur en dekking), zonder de lege bovenkant (de bovenste 206 van de 1248 rijen zijn in
  elk beeld leeg): **2400 × 1700**, 1920 × 1360 en 1280 × 908. Overal binnen wat videochips zelf uitpakken, en ruim
  40 % minder beeldpunten dan eerst bij dezelfde breedte. Ook op de hogere snelheid is er per seconde minder uit te
  pakken dan eerst (1920 breed: 146 → 113 miljoen beeldpunten per seconde).
- **Het scherm** staat waar de video niet dekt, binnen de gemeten vierhoek. Zo vult het altijd het hele scherm en
  nooit de grond, ook als de klep bijna dicht is. Nagemeten in alle 111 beelden: binnen elk scherm nergens grond, en
  op 21 beeldpunten na nergens een scherm buiten het toestel (eerst 890 000 en 517).
- **De hoeken**: elk beeld gemeten uit wat het toestel omsluit, op een tiende beeldpunt; de telefoon stijf (overal
  even groot); de stilstaande schermen op de gaten van de stilstaande foto zelf. Het doek tekent de hoeken van het
  beeld dat de browser echt toont.
- **Scherp**: de winkel en de telefoonfoto met kleinere versies van zichzelf (mipmaps) en scherp filteren op de
  schuine klep; het canvas nooit scherper dan de video zelf.
- **Geen hapering bij het begin**: het doek en de beelden staan klaar als de pagina rustig is, en opnieuw als de
  stand wisselt.
- **Sneller**: het glijden 900 → **700 ms**, de video 1,3 → **1,8 ×**. De klep is dicht na ± 1,1 s (was ± 1,5 s), Wat we
  maken staat er na ± 3,0 s (was 4,05 s). Nog een keer scrollen tijdens de video maakt hem nog sneller (3 ×). In
  lijst 70 kun je ook 1,5 × of 2,2 × kiezen.

## 4 · Wat je kunt weggooien

De vijf oude video's, niet meer in gebruik (samen 11 MB), in `public\img\hal\laptop-video\`:
`laptop-80-1280.mp4`, `laptop-80-1280.webm`, `laptop-80-1920.mp4`, `laptop-80-1920.webm`, `laptop-80-2560.mp4`.

En als ze er nog staan, de zeven uit levering 80 en 81: `src\components\HalLaptopBreed.astro`,
`src\styles\laptop-breed.css`, `src\components\HalTablet.astro`, `src\styles\tablet.css`,
`tests\opening-74.test.mjs`, `tests\voorpagina-78.test.mjs`, `public\img\ui\keuzepijl-0b0f17.svg`.

## 5 · Nagekeken

- `npx astro build`: klaar, zonder fouten. De hele testreeks: **275 van de 275 stappen goed**.
- **Nieuwe toets** `tests/laptop-84.test.mjs` (npm run test:laptop84, in de keten na beweging83): de video's (twee
  banden, de maten, nergens hoger dan 2160), de hoeken (111 beelden, de klep tot hij dicht is, de telefoon stijf
  tot hij uit beeld is, de stilstaande schermen op de gaten van de foto), het doek (twee banden, 1 − dekking,
  mipmaps, de maat pas lezen als die verandert) en de snelheid; en in de browser, uit de echte video: in beeld 0,
  24, 42 (de klep bijna dicht), 60 en 84 (de telefoon gaat uit beeld) staat binnen elk scherm geen grond en buiten
  het toestel geen scherm.
- Bijgewerkt: `tests/voorpagina-80.test.mjs` (de nieuwe bestanden).
- **Op het oog**: alle 111 beelden voor en na getekend, met een raster en met de echte winkel (lijst 70).
- **Gemeten in een browser zonder grafische kaart** (alles in software): werk per getekend beeld tijdens de video
  231 – 247 ms → 154 – 182 ms. Op een computer met een grafische kaart zijn beide veel kleiner; daar telt vooral dat
  de videochip het uitpakken nu zelf kan doen.

## 6 · Zelf nakijken (als je wilt)

Open in Chrome `chrome://media-internals`, speel de opening af en klik de video aan die erbij komt. Bij
`kVideoDecoderName` staat `D3D11VideoDecoder` als de videochip hem uitpakt, `FFmpegVideoDecoder` als de processor
het doet.

## 7 · Uitrollen

Rol uit met `UITROLLEN.bat` vanuit je map. Het commitbericht staat in `kladblok/COMMIT-BERICHT.txt`.
