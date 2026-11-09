/**
 * VISUAILS — de laptopvideo van de opening (levering 90, 8 november 2026). Vervangt tests/laptop-84.test.mjs (het doek, de
 * twee banden en de webm van levering 84 zijn weg).
 *
 *   node tests/laptop-90.test.mjs          (npm run test:laptop90; leest de bestanden, geen build nodig)
 *
 * Lucas, 8 november 15:59: "Gewoon de video gebruiken niet zelf animeren … Zorg dat hij er strak uit komt te zien en
 * perfect van foto naar video overgaat."
 *
 *   1 · hoe ze gemaakt zijn (scripts/laptop-video-90.mjs): H.264 op preset veryfast, yuv420p, BT.709, zonder geluid, de
 *       index vooraan; breedtes in veelvouden van 92 (dan is de hoogte een heel getal); geen avif voor de foto;
 *   2 · de schermen (src/data/laptopVideo90.json): twee vierhoeken in beeld 0, en de foto heeft daar zijn gaten: midden
 *       erin doorzichtig, net buiten de rand dicht;
 *   3 · in de browser, per breedte: beeld 0 zoals de browser het uit de video haalt is de foto (buiten de gaten).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const V = JSON.parse(lees('src/data/laptopVideo90.json'));
const VID = 'public/img/hal/laptop-video', FOTO = 'public/img/hal/opening';

/* ── 1 · hoe ze gemaakt zijn ── */
console.log('\n1 · hoe ze gemaakt zijn');
const maak = lees('scripts/laptop-video-90.mjs');
ok('H.264 op preset veryfast (de huisregel), yuv420p, zonder geluid, de index vooraan', /'-c:v', 'libx264', '-preset', 'veryfast'/.test(maak) && /'-pix_fmt', 'yuv420p'/.test(maak) && /'-an'/.test(maak) && /'\+faststart'/.test(maak));
ok('… in BT.709 gemerkt en geschaald (zo haalt de browser hetzelfde beeld eruit als de foto)', /'-colorspace', 'bt709'/.test(maak) && /out_color_matrix=bt709:out_range=tv/.test(maak) && /in_color_matrix=bt709:in_range=tv/.test(maak));
ok('terug is dezelfde video achterstevoren (het filter reverse), geen zoeken in de browser', /`reverse,\$\{schaal\(b\)\}`/.test(maak));
ok('de breedtes zijn veelvouden van 92 (2944 : 1248 = 92 : 39) en staan in de json', JSON.stringify(V.maten) === JSON.stringify([1288, 1840, 2392, 2944]) && V.maten.every((b) => b % 92 === 0) && /const MATEN = \[1288, 1840, 2392, 2944\];/.test(maak));
ok('de foto als webp (geen avif: die codeert het verloop anders dan de video, en dan zie je de wissel)', /\.webp\(\{ quality: 92, alphaQuality: 100/.test(maak) && !/\.avif\(/.test(maak));
ok('alle bestanden staan er', V.maten.every((b) => [`${VID}/laptop-90-${b}.mp4`, `${VID}/laptop-90-${b}-terug.mp4`, `${FOTO}/laptop-90-${b}.webp`].every((f) => fs.existsSync(path.join(ROOT, f)))));

/* ── 2 · de schermen en de gaten ── */
console.log('\n2 · de schermen en de gaten');
const [ql, qf] = V.schermen;
const geldig = (q) => Array.isArray(q) && q.length === 4 && q.every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1);
ok('twee vierhoeken in beeld 0 (de laptop en de telefoon), binnen het beeld', geldig(ql) && geldig(qf), JSON.stringify(V.schermen));
{
  const f = path.join(ROOT, FOTO, 'laptop-90-2944.webp');
  const { data: al, info } = await sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const a = (x, y) => al[Math.min(H - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))];
  let midden = 0, rand = 0, open = 0;
  for (const q of [ql, qf]) {
    const p = q.map(([x, y]) => [x * W, y * H]), c = [p.reduce((s, z) => s + z[0], 0) / 4, p.reduce((s, z) => s + z[1], 0) / 4];
    if (a(c[0], c[1]) > 8) midden++;
    for (let z = 0; z < 4; z++) {
      const [ax, ay] = p[z], [bx, by] = p[(z + 1) % 4];
      for (let k = 1; k < 40; k++) {
        const t = 0.1 + (0.8 * k) / 40, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const nx = by - ay, ny = -(bx - ax), nl = Math.hypot(nx, ny), s = Math.sign(nx * (x - c[0]) + ny * (y - c[1])) || 1;
        /* 1,5 beeldpunt ruimer liggen de stilstaande schermen (RUIMER); daar nog 2,5 buiten moet de foto dicht zijn */
        rand++; if (a(x + (s * nx / nl) * 4, y + (s * ny / nl) * 4) < 128) open++;
      }
    }
  }
  ok('midden in elk scherm is de foto doorzichtig (daar liggen de standen van de winkel)', midden === 0, `${midden} dicht`);
  ok('… en net buiten de rand van elk scherm dicht (de rand van het toestel snijdt de stand af)', rand > 0 && open === 0, `${open} van ${rand} open`);
}
ok('de opening zet de standen op die vierhoeken, RUIMER 1,5 bronpunt ruimer', /export const RUIMER = 1\.5;/.test(lees('src/scripts/schermvlak.js')) && /data\.video\.stil90/.test(lees('src/components/HalOpening80.astro')));

/* ── 3 · beeld 0 is de foto ── */
console.log('\n3 · beeld 0 is de foto (in de browser)');
const MIME = { '.html': 'text/html; charset=utf-8', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.writeHead(200, { 'Content-Type': MIME['.html'] }); return r.end('<!doctype html><meta charset=utf8><body></body>'); }
  const f = path.join(ROOT, 'public', u);
  if (!f.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: browserPad() });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for (const b of V.maten) {
    const uit = await page.evaluate(async (b) => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = `/img/hal/laptop-video/laptop-90-${b}.mp4`;
      await new Promise((r, n) => { v.addEventListener('loadeddata', r, { once: true }); v.addEventListener('error', () => n(new Error('video')), { once: true }); });
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(v, 0, 0);
      const vd = g.getImageData(0, 0, c.width, c.height).data;
      const im = new Image(); im.src = `/img/hal/opening/laptop-90-${b}.webp`; await im.decode();
      const c2 = document.createElement('canvas'); c2.width = im.naturalWidth; c2.height = im.naturalHeight;
      const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.drawImage(im, 0, 0);
      const fd = g2.getImageData(0, 0, c2.width, c2.height).data;
      if (c.width !== c2.width || c.height !== c2.height) return { maat: [c.width, c.height, c2.width, c2.height] };
      const hist = new Uint32Array(256); let n = 0, som = 0;
      for (let i = 0; i < vd.length; i += 4) {
        if (fd[i + 3] < 255) continue;
        const d = Math.max(Math.abs(vd[i] - fd[i]), Math.abs(vd[i + 1] - fd[i + 1]), Math.abs(vd[i + 2] - fd[i + 2]));
        hist[d]++; som += d; n++;
      }
      let k = 0, p99 = 255, max = 0; for (let d = 0; d < 256; d++) { if (hist[d]) max = d; k += hist[d]; if (p99 === 255 && k >= 0.99 * n) p99 = d; }
      return { b: c.width, h: c.height, gem: +(som / n).toFixed(2), p99, max };
    }, b);
    ok(`${b} breed: beeld 0 uit de video is de foto (gemiddeld ≤ 3, 99 % ≤ 10, nergens meer dan 40 op 255; gemeten ${uit.gem?.toFixed?.(2) ?? uit.gem} · ${uit.p99} · ${uit.max})`, uit.b === b && uit.h === (b / 92) * 39 && uit.gem <= 3 && uit.p99 <= 10 && uit.max <= 40, JSON.stringify(uit));
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
