/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE LAPTOPVIDEO IN SITE-MATEN (levering 80; twee banden sinds levering 84, 2 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/laptop-video.mjs <werkmap>
 *
 * Na scripts/laptop-video.py en laptop-video-na.py. Twee banden onder elkaar in één H.264-video: de kleur en
 * de dekking (grijs). De browser tekent hem met WebGL (src/scripts/laptopdoek.js) en zet de schermen waar de
 * video niet dekt, binnen de gemeten vierhoek (src/data/laptopVideo.json). Zonder geluid, 24 per seconde, het
 * begin vooraan (faststart).
 *
 * WAAROM TWEE BANDEN EN HOOGSTENS 2400 BREED (levering 84). Lucas, 2 november: "De laptop animatie lagged
 * enorm". De video had drie banden (de derde: de gaten), 2560 × 3258 en 1920 × 2442: hoger dan veel
 * videochips voor H.264 aankunnen (vaak 4096 × 2304, soms 4096 × 2160). Dan pakt de processor hem uit: 8
 * miljoen beeldpunten per beeld, ruim 30 keer per seconde. Nu zonder de lege bovenkant en met twee banden:
 * 2400 × 1700, 1920 × 1360 en 1280 × 908, overal binnen 4096 × 2160, en ruim 40 % minder beeldpunten dan toen
 * bij dezelfde breedte.
 *
 * CRF 25 en preset slow: een webbestand, kleiner telt hier meer dan de seconden coderen.
 *
 * ELKE 6 BEELDEN EEN SLEUTELBEELD (levering 87, 4 november 2026). Lucas (lijst 74): de laptopsectie blijft staan en
 * het scrollen speelt de animatie af, ook terug. Terugscrollen is zoeken in de video, en een browser kan alleen vanaf een
 * sleutelbeeld uitpakken: met de standaard (sleutelbeelden op 0 en 3,75 s) moest hij voor één stap terug tot 89 beelden
 * uitpakken. Nu hoogstens 5. Het bestand wordt er wat groter van (zie LEVERING-87.md).
 * Uit: public/img/hal/laptop-video/laptop-84-<b>.mp4 (niet in public/video: daar staat de pagina /video).
 * ═══════════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const VIDEO_MATEN = [1280, 1920, 2400];
const werk = process.argv[2];
const uit = path.join('public', 'img', 'hal', 'laptop-video');
mkdirSync(uit, { recursive: true });
/* De bovenste 206 van de 1248 rijen zijn in elk beeld leeg (de klep komt nooit hoger dan rij 211): die gaan eraf
   (BOVEN in src/data/laptopVideo.json; het canvas begint daar). Zo nog eens 17 % minder beeldpunten. */
const BOVEN = 206;
const hoogte = (b) => Math.round(((1248 - BOVEN) * b) / 2944 / 2) * 2;
const knip = `crop=2944:${1248 - BOVEN}:0:${BOVEN}`;
const filter = (b) => `[0:v]${knip},scale=${b}:${hoogte(b)}:flags=lanczos[k];[1:v]format=gray,${knip},scale=${b}:${hoogte(b)}:flags=lanczos,format=rgb24[a];[k][a]vstack=inputs=2,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`;
const IN = ['-framerate', '24', '-i', path.join(werk, 'kleur', '%03d.png'), '-framerate', '24', '-i', path.join(werk, 'dekking', '%03d.png')];
const KLEUR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
for (const b of process.env.ALLEEN_WEBM ? [] : VIDEO_MATEN) {
  const doel = path.join(uit, `laptop-84-${b}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...IN, '-filter_complex', filter(b), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-x264-params', 'keyint=6:min-keyint=6:scenecut=0',
    '-profile:v', 'high', ...KLEUR, '-movflags', '+faststart', '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-84-${b}.mp4  ${b} × ${hoogte(b) * 2}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}

/* Daarnaast VP9 in webm, alleen als reserve voor een browser zonder H.264 (Chromium zonder de
   gepatenteerde codecs, op sommige Linux-versies): dezelfde twee banden, 1280 en 1920. HalOpening80.astro
   kiest de mp4 als de browser H.264 kan (Chrome, Edge, Firefox, Safari) en anders de webm.
   Alleen de webm opnieuw maken: ALLEEN_WEBM=1 node scripts/laptop-video.mjs <werkmap>. */
for (const b of VIDEO_MATEN.filter((m) => m <= 1920)) {
  const doel = path.join(uit, `laptop-84-${b}.webm`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...IN, '-filter_complex', filter(b), '-map', '[v]', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-g', '6', '-keyint_min', '6',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', ...KLEUR, '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-84-${b}.webm  ${b} × ${hoogte(b) * 2}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}
