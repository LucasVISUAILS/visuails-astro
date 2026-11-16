# Levering 107 · De grond #FCFCFC, en de bannervideo op die grond

**15 november 2026. Staat alleen in je map; je rolt zelf uit met `UITROLLEN.bat`.**

Je vroeg om 20:23:

> *"Dit wil ik als achtergrond kleur, deze wit (deze past waarschijnlijk wel bij de andere kleuren). De homepage video aan het begin met de telefoon heeft nog de oude achtergrond, ik wil deze precies dezelfde kleur laten hebben als de achtergrond kleur, dit geldt ook voor de fade op het einde van de video."*

Daarbij schreef je: *"Probeer er wel voor te zorgen dat de beelden scherp blijven"*, en je stuurde de bron mee.

## De grond

- **De achtergrond van elke pagina is `#FCFCFC`**, ook in Studio. Kaarten en vlakken op de grond blijven `#FFFFFF`.
- Bestanden:
  - `src/styles/hal.css` (`--h-grond`);
  - `src/styles/studio-hal.css` (`--bg`);
  - `src/layouts/Layout.astro` (de kleur van de adresbalk op de telefoon);
  - `docs/KLEURENSCHEMA.md` (de tabel).

## De bannervideo

De video is opnieuw gemaakt uit je bron `opener-montage-gegrade.mov` (ProRes), niet uit de oude mp4. Er is dus geen extra stap met verlies. De oude mp4 had nog de blauwe grond (249, 250, 255).

| deel | wat ik deed |
|---|---|
| 0 – 4,25 s (de telefoon) | alles wat op de grond lag (248 en lichter) is nu precies 252, 252, 252 |
| 4,25 – 24,5 s | niets veranderd: de productfoto's houden hun eigen achtergrond |
| 24,5 s – eind (de fade naar wit) | de fade eindigt nu op 252, 252, 252 in plaats van 250, 250, 252 |

Twee dingen zorgen dat de kleur precies klopt en de video scherp blijft:

- **Volle reeks (0 – 255).** In de gewone reeks van een mp4 ligt 252 tussen twee stappen in; afhankelijk van de browser komt het uit op 251 of 253. Deze video gebruikt de volle reeks, en dan komt 252 er precies uit. Gemeten in Chromium, zowel in de video-tag als via het canvas van de banner (waar de video sinds levering 106 getekend wordt): 252, 252, 252, gelijk aan de pagina.
- **Scherper dan de vorige.** x264 met preset slow en CRF 18. Gemeten tegen je bron (SSIM): 0,9930, tegen 0,9923 voor de oude versie.

| bestand | was | nu |
|---|---|---|
| `banner-1920.mp4` | 14,3 MB | 19,5 MB |
| `banner-1280.mp4` | 7,0 MB | 9,8 MB |

- De telefoon krijgt de versie van 1280.
- De posters (`poster-1920.webp` en `poster-1280.webp`, het eerste beeld) zijn ook precies `#FCFCFC`. Ze zijn verliesvrij en daardoor maar een paar honderd bytes.
- Door het nieuwe teken achter de bestanden (`?v=`) haalt elke browser de nieuwe video meteen op.

## Toetsen

- `tests/grond-79.test.mjs` meet nu `#FCFCFC`: in de css, en in de browser op alle pagina's en rond de laptop, beeldpunt voor beeldpunt.
- De hele reeks is gedraaid.
