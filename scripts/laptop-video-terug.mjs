/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE LAPTOPVIDEO ACHTERSTEVOREN (levering 89, 5 november 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/laptop-video-terug.mjs
 *
 * Lucas, 5 november: "ik wil dat hij afspeelt bij 1 scroll omlaag". De opening speelt de video nu op zijn eigen klok
 * (HalOpening80.astro), en één scroll omhoog bij Wat we maken speelt hem terug. Een video terugspelen kan een browser
 * niet: hij moet dan elk beeld zoeken, vanaf het sleutelbeeld ervoor, en dat hapert. Daarom is er dezelfde video
 * achterstevoren, die de browser gewoon vooruit speelt: beeld j van de omgekeerde video is beeld 110 − j van de gewone.
 *
 * Uit de grootste gewone video (laptop-84-2400.mp4, na scripts/laptop-video.mjs): de twee banden (kleur en dekking)
 * apart geschaald, zodat er niets over de naad tussen de banden loopt, met dezelfde maten, dezelfde kleurruimte en
 * elke 6 beelden een sleutelbeeld, zoals de gewone. CRF 23 in plaats van 25, omdat de bron al een keer gecodeerd is.
 * Uit: public/img/hal/laptop-video/laptop-84-<b>-terug.mp4 (1280, 1920, 2400) en -terug.webm (1280, 1920).
 * De opening haalt hem pas binnen als de animatie één keer heeft gespeeld, als de pagina rustig is.
 * ═══════════════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

const MATEN = [1280, 1920, 2400];
const dir = path.join('public', 'img', 'hal', 'laptop-video');
const bron = path.join(dir, 'laptop-84-2400.mp4');
const BAND = 850;   /* de hoogte van één band in laptop-84-2400.mp4 (2400 × 1700) */
const hoogte = (b) => Math.round(((1248 - 206) * b) / 2944 / 2) * 2;   /* als in scripts/laptop-video.mjs */
const filter = (b) => {
  const s = b === 2400 ? '' : `,scale=${b}:${hoogte(b)}:flags=lanczos`;
  return `[0:v]reverse,split[a][b];[a]crop=2400:${BAND}:0:0${s}[k];[b]crop=2400:${BAND}:0:${BAND}${s}[d];[k][d]vstack=inputs=2,format=yuv420p[v]`;
};
const KLEUR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
for (const b of MATEN) {
  const doel = path.join(dir, `laptop-84-${b}-terug.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', bron, '-filter_complex', filter(b), '-map', '[v]', '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
    '-x264-params', 'keyint=6:min-keyint=6:scenecut=0', '-profile:v', 'high', ...KLEUR, '-movflags', '+faststart', '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-84-${b}-terug.mp4  ${b} × ${hoogte(b) * 2}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}
for (const b of MATEN.filter((m) => m <= 1920)) {
  const doel = path.join(dir, `laptop-84-${b}-terug.webm`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', bron, '-filter_complex', filter(b), '-map', '[v]', '-r', '24', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-g', '6', '-keyint_min', '6',
    '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', ...KLEUR, '-an', doel], { stdio: 'inherit' });
  console.log(`laptop-84-${b}-terug.webm  ${b} × ${hoogte(b) * 2}  ${(statSync(doel).size / 1024).toFixed(0)} kB`);
}
