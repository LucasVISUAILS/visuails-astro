/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE LAPTOPVIDEO IN SITE-MATEN (levering 80, 1 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/laptop-video.mjs <werkmap>
 *
 * Na scripts/laptop-video.py en laptop-video-na.py. Drie banden onder elkaar in één H.264-video:
 * de kleur, de dekking (grijs) en de gaten waar de schermen komen (grijs). De browser tekent hem met
 * WebGL (src/scripts/laptopdoek.js). Zonder geluid, 24 per seconde, het begin vooraan (faststart).
 *
 * CRF 25 en preset slow: een webbestand, kleiner telt hier meer dan de seconden coderen.
 * Uit: public/img/hal/laptop-video/laptop-80-<b>.mp4 (niet in public/video: daar staat de pagina /video), b = 1280 · 1920 · 2560.
 * ═══════════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const VIDEO_MATEN = [1280, 1920, 2560];
const werk = process.argv[2];
const uit = path.join('public', 'img', 'hal', 'laptop-video');
mkdirSync(uit, { recursive: true });
for (const b of process.env.ALLEEN_WEBM ? [] : VIDEO_MATEN) {
  const h = Math.round((1248 * b) / 2944 / 2) * 2;
  const doel = path.join(uit, `laptop-80-${b}.mp4`);
  const f = `[0:v]scale=${b}:${h}:flags=lanczos[k];[1:v]format=gray,scale=${b}:${h}:flags=lanczos,format=rgb24[a];[2:v]format=gray,scale=${b}:${h}:flags=lanczos,format=rgb24[g];[k][a][g]vstack=inputs=3,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(werk, 'kleur', '%03d.png'), '-framerate', '24', '-i', path.join(werk, 'dekking', '%03d.png'),
    '-framerate', '24', '-i', path.join(werk, 'gat', '%03d.png'), '-filter_complex', f, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
    '-profile:v', 'high', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-80-${b}.mp4  ${b} × ${h * 3}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}

/* Daarnaast VP9 in webm, alleen als reserve voor een browser zonder H.264 (Chromium zonder de
   gepatenteerde codecs, op sommige Linux-versies): dezelfde drie banden, 1280 en 1920. HalOpening80.astro
   kiest de mp4 als de browser H.264 kan (Chrome, Edge, Firefox, Safari) en anders de webm.
   Alleen de webm opnieuw maken: ALLEEN_WEBM=1 node scripts/laptop-video.mjs <werkmap>. */
for (const b of VIDEO_MATEN.filter((m) => m <= 1920)) {
  const h = Math.round((1248 * b) / 2944 / 2) * 2;
  const doel = path.join(uit, `laptop-80-${b}.webm`);
  const f = `[0:v]scale=${b}:${h}:flags=lanczos[k];[1:v]format=gray,scale=${b}:${h}:flags=lanczos,format=rgb24[a];[2:v]format=gray,scale=${b}:${h}:flags=lanczos,format=rgb24[g];[k][a][g]vstack=inputs=3,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(werk, 'kleur', '%03d.png'), '-framerate', '24', '-i', path.join(werk, 'dekking', '%03d.png'),
    '-framerate', '24', '-i', path.join(werk, 'gat', '%03d.png'), '-filter_complex', f, '-map', '[v]', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-80-${b}.webm  ${b} × ${h * 3}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}
