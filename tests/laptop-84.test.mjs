/**
 * VISUAILS — de laptop van de opening: lichter, sneller, en de beelden goed in het scherm (levering 84,
 * 2 november 2026).
 *
 *   node tests/laptop-84.test.mjs          (npm run test:laptop84; leest de bronnen, geen build nodig)
 *
 * Lucas, 2 november, 21:34: "De laptop animatie lagged enorm en mag wel sneller dan nu. Ook zitten de beelden er
 * niet goed in en gaan ze tijdens de animatie verkeerd vervormen." Nagemeten in kladblok/LEVERING-84.md.
 *
 *   1 · de video: twee banden (kleur en dekking) zonder de lege bovenkant, 1280, 1920 en 2400 breed, nergens hoger
 *       dan 2160 (wat videochips zelf uitpakken), de oude video's met drie banden niet meer in gebruik;
 *   2 · de hoeken (src/data/laptopVideo.json): 111 beelden, het laptopscherm tot de klep dicht is (beeld 46), de
 *       telefoon stijf (overal even groot) tot hij uit beeld is; de stilstaande schermen op de gaten van de
 *       stilstaande foto (die 2 tot 3 beeldpunten ruimer zijn dan beeld 0 van de video);
 *   3 · het doek (src/scripts/laptopdoek.js): twee banden, het scherm waar de video niet dekt (1 − dekking)
 *       binnen de vierhoek, kleinere versies van de beelden (mipmaps); de opening sneller (1,8 × en 700 ms);
 *   4 · in de browser, beeld voor beeld uit de echte video: in beeld 0, 24, 42 (de klep bijna dicht), 60 en 84
 *       (de telefoon gaat uit beeld) staat binnen elk scherm geen grond, en buiten het toestel geen scherm.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

/* ── 1 · de video ── */
console.log('\n1 · de video');
const MAP = 'public/img/hal/laptop-video';
/* breedte en hoogte uit het tkhd-blok van een mp4 (16.16 vaste komma) */
function mp4Maat(f) {
  const b = fs.readFileSync(f);
  const i = b.indexOf('tkhd');
  if (i < 0) return null;
  const v = b[i + 4], na = i + 4 + 4 + (v === 1 ? 32 : 20) + 8 + 8 + 36;
  return [b.readUInt32BE(na) / 65536, b.readUInt32BE(na + 4) / 65536];
}
const BOVEN = JSON.parse(lees('src/data/laptopVideo.json')).boven || 0;
const band = (b) => Math.round(((1248 - BOVEN) * b) / 2944 / 2) * 2;
const maten = [1280, 1920, 2400].map((b) => ({ b, maat: fs.existsSync(path.join(ROOT, MAP, `laptop-84-${b}.mp4`)) ? mp4Maat(path.join(ROOT, MAP, `laptop-84-${b}.mp4`)) : null }));
ok('drie mp4-video\'s (1280, 1920, 2400) met twee banden (de kleur en de dekking), zonder de lege bovenkant', maten.every(({ b, maat }) => maat && maat[0] === b && maat[1] === 2 * band(b)), JSON.stringify(maten));
ok('  nergens hoger dan 2160 en breder dan 4096 (wat videochips zelf uitpakken)', maten.every(({ maat }) => maat && maat[1] <= 2160 && maat[0] <= 4096));
ok('  en de webm als reserve (1280 en 1920)', [1280, 1920].every((b) => fs.existsSync(path.join(ROOT, MAP, `laptop-84-${b}.webm`))));
const opening = lees('src/components/HalOpening80.astro');
ok('de opening gebruikt de nieuwe video (laptop-84) en niet meer de oude met drie banden', /laptop-84-\$\{b\}\.\$\{ext\}/.test(opening) && !/laptop-80-/.test(opening) && /const VIDEO_MATEN = \[1280, 1920, 2400\];/.test(opening));
ok('scripts/laptop-video.mjs maakt twee banden', /vstack=inputs=2/.test(lees('scripts/laptop-video.mjs')) && !/vstack=inputs=3/.test(lees('scripts/laptop-video.mjs')));

/* ── 2 · de hoeken ── */
console.log('\n2 · de hoeken');
const V = JSON.parse(lees('src/data/laptopVideo.json'));
const W = V.b, H = V.h;
const px = (q) => q.map(([x, y]) => [x * W, y * H]);
const lap = V.schermen.map((s) => s[0]), fon = V.schermen.map((s) => s[1]);
ok('111 beelden', V.beelden === 111 && V.schermen.length === 111);
const lapTot = lap.reduce((m, q, i) => (q ? i : m), -1);
ok('het laptopscherm in elk beeld tot de klep dicht is (beeld 0 – 46), daarna niet meer', lap.slice(0, 47).every(Boolean) && lap.slice(47).every((q) => !q) && lapTot === 46, String(lapTot));
ok('  de bovenrand altijd boven de onderrand (geen omgeklapte vierhoek)', lap.slice(0, 47).every((q) => { const p = px(q); return p[3][1] > p[0][1] + 1.5 && p[2][1] > p[1][1] + 1.5; }));
const fp = fon.filter(Boolean).map(px);
const br = fp.map((p) => Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1])), ho = fp.map((p) => Math.hypot(p[3][0] - p[0][0], p[3][1] - p[0][1]));
ok('de telefoon is stijf: in elk beeld even breed en even hoog (binnen 0,5 beeldpunt)', Math.max(...br) - Math.min(...br) < 0.5 && Math.max(...ho) - Math.min(...ho) < 0.5, `breed ${Math.min(...br).toFixed(2)} – ${Math.max(...br).toFixed(2)}, hoog ${Math.min(...ho).toFixed(2)} – ${Math.max(...ho).toFixed(2)}`);
ok('  en hij staat erin tot hij rechts uit beeld is', fon.slice(0, 88).every(Boolean) && fon.slice(88).every((q) => !q || Math.min(...q.map((p) => p[0])) >= 1));

/* de stilstaande foto heeft zijn eigen gaten (2 tot 3 beeldpunten ruimer dan beeld 0): de stilstaande schermen
   liggen erop, en net buiten hun rand (1,5 beeldpunt ruimer, dan nog 1) is de foto overal dicht */
{
  const sharp = (await import('sharp')).default;
  const FOTO = path.join(ROOT, 'public/img/hal/breed/laptop-3840.webp');
  const { data: al, info } = await sharp(FOTO).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const fx = info.width / W, fy = info.height / H;
  const dicht = (x, y) => al[Math.round(y * fy) * info.width + Math.round(x * fx)] >= 128;
  let rand = 0, open = 0;
  for (const q of V.stil || []) {
    const p = px(q), c = [p.reduce((s, z) => s + z[0], 0) / 4, p.reduce((s, z) => s + z[1], 0) / 4];
    for (let z = 0; z < 4; z++) {
      const [ax, ay] = p[z], [bx, by] = p[(z + 1) % 4];
      for (let k = 1; k < 40; k++) {
        const t = 0.08 + (0.84 * k) / 40, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const dx = x - c[0], dy = y - c[1], l = Math.hypot(dx, dy);
        /* langs de normaal naar buiten: 2,5 beeldpunt van de rand */
        const nx = (by - ay), ny = -(bx - ax), nl = Math.hypot(nx, ny), s = Math.sign(nx * dx + ny * dy) || 1;
        rand++; if (!dicht(x + (s * nx / nl) * 2.5, y + (s * ny / nl) * 2.5)) open++;
        void l;
      }
    }
  }
  ok('de stilstaande schermen liggen op de gaten van de stilstaande foto (net buiten hun rand is de foto dicht)', V.stil && rand > 0 && open === 0, `${open} van ${rand} open`);
  ok('  en HalOpening80 zet ze daarop', /data\.video\.stil \|\| data\.video\.schermen\[0\]/.test(opening));
}

/* ── 3 · het doek en de snelheid ── */
console.log('\n3 · het doek');
const doek = lees('src/scripts/laptopdoek.js');
ok('twee banden: de kleur boven, de dekking onder', /\* \.5;/.test(doek) && /y \+ \.5/.test(doek) && !/2\. \/ 3\./.test(doek) && !/uGat|1\. \/ 3\./.test(doek));
ok('  het scherm waar de video niet dekt, binnen de vierhoek', /float sa = s\.a \* \(1\. - a\);/.test(doek));
ok('  de winkel en de telefoonfoto met kleinere versies (mipmaps, een niveau fijner) en anisotroop filteren', /generateMipmap/.test(doek) && /LINEAR_MIPMAP_LINEAR/.test(doek) && /EXT_texture_filter_anisotropic/.test(doek) && /c\.zw, -1\.\)/.test(doek));
ok('  de maat van het canvas pas lezen als die verandert (ResizeObserver)', /new ResizeObserver/.test(doek));
/* levering 85: de video speelt sindsdien in een golf in plaats van overal 1,8 × (tests/opening-85.test.mjs) */
/* levering 87: geen glijden meer; het scrollen speelt de video af (sinds levering 88: tests/opening-88-browser.test.mjs) */
ok('de opening: het scrollen speelt de video af, geen glijden meer', /const DEEL = \{ video: 0\.625/.test(opening) && !/const GLIJ =/.test(opening));
ok('het canvas begint onder de lege bovenkant, en het doek rekent de hoeken in het hele beeld', /const DOEK = `top:/.test(opening) && /style=\{DOEK\}/.test(opening) && /uBoven \+ w\.y \* \(1\. - uBoven\)/.test(doek));
ok('het doek en de beelden staan klaar vóór de tweede scroll, en het getekende beeld is het getoonde (mediaTime)', /function doekKlaar\(\)/.test(opening) && /m \? m\.mediaTime : video\.currentTime/.test(opening));

/* ── 4 · in de browser ── */
console.log('\n4 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webm': 'video/webm', '.mp4': 'video/mp4' };
const PROEF = `<!doctype html><meta charset=utf8><style>html,body{margin:0;background:#FBFCFF}canvas{display:block;width:1440px;height:${(1440 * (H - BOVEN)) / W}px}</style>
<canvas id=c></canvas>
<script type=module>
import { maakDoek, ruimer, RUIMER } from '/src/scripts/laptopdoek.js';
const data = await (await fetch('/src/data/laptopVideo.json')).json();
const effen = (b, h, kleur) => { const c = document.createElement('canvas'); c.width = b; c.height = h; const g = c.getContext('2d'); g.fillStyle = kleur; g.fillRect(0, 0, b, h); const i = new Image(); i.src = c.toDataURL(); return i.decode().then(() => i); };
const [lap, fon] = await Promise.all([effen(1600, 1034, '#ff0000'), effen(540, 1170, '#00ff00')]);
const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = '/${MAP}/laptop-84-1280.webm';
await new Promise((r) => v.addEventListener('canplaythrough', r, { once: true }));
const d = maakDoek(document.getElementById('c'), v, data); d.zetBeelden(lap, fon);
window.__q = (i) => data.schermen[i].map((q) => q && ruimer(q, RUIMER, data.b, data.h));
/* speel langzaam en zet de video stil op beeld n (de video zelf, niet zoeken: dat werkt niet overal) */
window.__naar = (n) => new Promise((klaar) => {
  v.playbackRate = 0.25;
  const stap = (_t, m) => { const i = Math.round(m.mediaTime * data.fps); d.teken(i); if (i >= n) { v.pause(); requestAnimationFrame(() => requestAnimationFrame(() => klaar(i))); } else v.requestVideoFrameCallback(stap); };
  v.requestVideoFrameCallback(stap); v.play();
});
window.__klaar = true;
</script>`;
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/proef.html') { r.writeHead(200, { 'Content-Type': MIME['.html'] }); return r.end(PROEF); }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: browserPad() });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 700 } });
  const fouten = []; page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${server.address().port}/proef.html`);
  await page.waitForFunction(() => window.__klaar, null, { timeout: 30000 });
  const S = 1440 / W;   /* beeldpunten van de video → punten van het canvas */
  const binnen = (p, q) => { let z = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = q[i], [xj, yj] = q[j]; if (((yi > p[1]) !== (yj > p[1])) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) z = !z; } return z; };
  const krimp = (q, k) => { const c = [q.reduce((s, p) => s + p[0], 0) / 4, q.reduce((s, p) => s + p[1], 0) / 4]; return q.map(([x, y]) => { const dx = x - c[0], dy = y - c[1], l = Math.hypot(dx, dy); return [x - (dx / l) * k, y - (dy / l) * k]; }); };
  for (const n of [0, 24, 42, 60, 84]) {
    const i = await page.evaluate((n) => window.__naar(n), n);
    const qs = (await page.evaluate((i) => window.__q(i), i)).map((q) => q && q.map(([x, y]) => [x * W * S, (y * H - BOVEN) * S]));
    const png = PNG.sync.read(await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: Math.floor((1440 * (H - BOVEN)) / W) } }));
    const pix = (x, y) => { const o = (y * png.width + x) * 4; return [png.data[o], png.data[o + 1], png.data[o + 2]]; };
    const grond = ([r, g, b]) => r > 235 && g > 235 && b > 235;
    let gat = 0, binnenTel = 0, ernaast = 0;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const p = [x + 0.5, y + 0.5];
      const inScherm = qs.some((q) => q && binnen(p, krimp(q, 4)));
      const c = pix(x, y);
      if (inScherm) { binnenTel++; if (grond(c)) gat++; }
      /* een effen schermkleur ver buiten elke vierhoek: dan staat het scherm op de grond */
      else if (!qs.some((q) => q && binnen(p, krimp(q, -6))) && ((c[0] > 200 && c[1] < 60 && c[2] < 60) || (c[1] > 200 && c[0] < 60 && c[2] < 60))) ernaast++;
    }
    ok(`beeld ${i}: binnen het scherm nergens de grond, en nergens een scherm op de grond`, binnenTel > 0 && gat === 0 && ernaast === 0, `${binnenTel} binnen, ${gat} grond, ${ernaast} ernaast`);
  }
  ok('  geen scriptfout', !fouten.length, fouten.join(' | '));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
