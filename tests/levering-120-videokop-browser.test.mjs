/*
 * VISUAILS — levering 120 (19 november 2026, lijst 130 en 132): de kop op de video, in de browser (bouwer K).
 *
 *   1 · de maten (Nederlands en Engels, 320 – 1920 breed): één titel in één maat, hoogstens twee regels; de beschrijving
 *       17 – 20 px, op 1280+ hoogstens drie regels; geen horizontale scroll; de kop raakt de telefoon niet (op een breed scherm
 *       links ervan, op een smal scherm onder de video) en staat boven de balk met de stappen;
 *   2 · de kleur (ronde 2, lijst 133: de kop kiest zelf zwart of wit, zo weinig mogelijk wisselen), op 1440 en 1920: begin
 *       en eind inkt, het aantal wissels in één doorloop (gelijk aan het plan), nooit twee binnen 1,5 s, een zachte overgang
 *       tijdens het spelen en meteen goed na een sprong; elke halve seconde het contrast van de gekozen kleur op de letters:
 *       minstens 3 : 1, behalve tijdens een overgang en op de stukken die het plan zelf niet kan redden (die worden gemeld);
 *   3 · minder beweging: het stille eindbeeld (18 s) en wit, dat daar op de letters gemeten minstens 4,5 : 1 haalt (mediaan);
 *   4 · 200 % zoom (720 en 195 css-px breed): geen overloop.
 *
 *   node tests/levering-120-videokop-browser.test.mjs        (eerst de build)
 * De server hier kan Range (zoals de browser verwacht om in een video te springen); de echte site komt via Cloudflare.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
let goed = 0, fout = 0;
const ok = (naam, c, extra = '') => { if (c) goed++; else fout++; console.log(`${c ? ' ok  ' : ' FAIL'} ${naam}${c || !extra ? '' : ` — ${extra}`}`); };
const meld = (t) => console.log(`  ·   ${t}`);
console.log('\nVISUAILS — de kop op de video in de browser (levering 120)');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  const n = fs.statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
  const h = { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
  if (!m) { r.writeHead(200, { ...h, 'Content-Length': n }); return fs.createReadStream(f).pipe(r); }
  const a = m[1] ? +m[1] : n - +m[2], b = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1;
  r.writeHead(206, { ...h, 'Content-Length': b - a + 1, 'Content-Range': `bytes ${a}-${b}/${n}` });
  fs.createReadStream(f, { start: a, end: b }).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-27T00:00:00.000Z' })), url: BASIS };

async function open(pad, w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...extra });
  await ctx.addCookies([KEUZE]);
  await ctx.addInitScript(() => { window.__kvUit = true; window.__lnUit = true; });
  const page = await ctx.newPage();
  const fouten = []; page.on('pageerror', (e) => fouten.push(String(e).slice(0, 160)));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 9000 }).catch(() => {});
  return { ctx, page, fouten };
}
const naar = (page, t) => page.evaluate(async (t) => {
  const v = document.querySelector('[data-b94-video]'); v.pause();
  if (Math.abs(v.currentTime - t) > 0.001) await new Promise((r) => { v.addEventListener('seeked', r, { once: true }); v.currentTime = t; });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { t: v.currentTime, kleur: getComputedStyle(document.getElementById('b94-h1')).color, zin: getComputedStyle(document.querySelector('.b94-zin')).color };
}, t);
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/* het contrast per letterpunt: een schermafdruk met en zonder kop (hetzelfde stilstaande beeld); de punten die verschillen en
   dicht bij de tekstkleur liggen zijn letter, het beeld erachter komt uit de afdruk zonder kop */
async function contrast(page, sel) {
  const box = await page.evaluate((sel) => { const q = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, Math.floor(q.left)), y: Math.max(0, Math.floor(q.top)), width: Math.ceil(q.width), height: Math.ceil(q.height) }; }, sel);
  const A = PNG.sync.read(await page.screenshot({ clip: box }));
  await page.evaluate(() => { document.querySelector('.b94-kopvak').style.visibility = 'hidden'; });
  const B = PNG.sync.read(await page.screenshot({ clip: box }));
  await page.evaluate(() => { document.querySelector('.b94-kopvak').style.visibility = ''; });
  const k = (await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).color, sel)).match(/\d+/g).map(Number);
  const Lt = L(...k), cs = [];
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    const dk = Math.abs(A.data[i] - k[0]) + Math.abs(A.data[i + 1] - k[1]) + Math.abs(A.data[i + 2] - k[2]);
    if (d > 30 && dk < 60) { const Lb = L(B.data[i], B.data[i + 1], B.data[i + 2]); cs.push((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05)); }
  }
  cs.sort((p, q) => p - q);
  const q = (f) => cs.length ? cs[Math.min(cs.length - 1, Math.floor(f * cs.length))] : 0;
  return { n: cs.length, p10: q(0.1), mediaan: q(0.5), onder3: cs.length ? cs.filter((c) => c < 3).length / cs.length : 1 };
}
const INKT = 'rgb(9, 13, 11)', WIT = 'rgb(255, 255, 255)';

/* ── 1 · de maten ── */
console.log('\n1 · de maten');
for (const [pad, taal] of [['/', 'en'], ['/nl/', 'nl']]) {
  for (const [w, h] of [[320, 640], [390, 844], [1100, 700], [1280, 800], [1440, 900], [1920, 1080]]) {
    const { ctx, page, fouten } = await open(pad, w, h);
    const m = await page.evaluate(() => {
      const h1 = document.getElementById('b94-h1'), zin = document.querySelector('.b94-zin'), vak = document.querySelector('.b94-kopvak');
      const beeld = document.querySelector('.b94-beeld').getBoundingClientRect(), v = document.querySelector('[data-b94-video]');
      const regels = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); return new Set([...rg.getClientRects()].filter((q) => q.width > 1).map((q) => Math.round(q.top / 4))).size; };
      /* de getekende video (cover) en de linkerkant van de telefoon daarin: 37,76 % (ffmpeg, alle beelden van de eerste scène) */
      const vr = v.getBoundingClientRect(), vw = v.videoWidth || 1920, vh = v.videoHeight || 1080, s = Math.max(vr.width / vw, vr.height / vh);
      const gw = vw * s, gx = vr.left + (vr.width - gw) / 2;
      const r = (e) => e.getBoundingClientRect();
      return {
        fs: parseFloat(getComputedStyle(h1).fontSize), kinderen: h1.children.length, regels: regels(h1), zinFs: parseFloat(getComputedStyle(zin).fontSize), zinRegels: regels(zin),
        zinFam: getComputedStyle(zin).fontFamily.split(',')[0].replace(/"/g, ''), kop: r(vak).toJSON(), beeld: beeld.toJSON(), pan: r(document.querySelector('.b94-paneel')).toJSON(),
        telefoonLinks: vw === 540 ? null : gx + 0.3776 * gw, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      };
    });
    const tag = `${taal} ${w}`;
    const breed = w >= 1100;
    ok(`${tag}: één titel in één maat (${m.fs.toFixed(1)} px), ${m.regels} regel(s), hoogstens twee`, m.kinderen === 0 && m.regels >= 1 && m.regels <= 2);
    ok(`${tag}:   ${breed ? 'tussen 44 en 76 px' : 'tussen 30 en 40 px'}`, breed ? m.fs >= 44 && m.fs <= 76.01 : m.fs >= 30 && m.fs <= 40.01, m.fs);
    ok(`${tag}: de beschrijving in DM Sans, ${m.zinFs} px, ${m.zinRegels} regels${w >= 1280 ? ' (hoogstens 3)' : ''}`, m.zinFam === 'DM Sans' && m.zinFs >= 17 && m.zinFs <= 20 && (w < 1280 || m.zinRegels <= 3));
    if (breed) {
      ok(`${tag}: de kop staat links van de telefoon (${Math.round(m.kop.right)} ≤ ${Math.round(m.telefoonLinks)} − 16) en op de video`, m.kop.right <= m.telefoonLinks - 16 && m.kop.bottom <= m.beeld.bottom);
      ok(`${tag}: de kop staat minstens 16 px boven de balk met de stappen`, m.kop.bottom <= m.pan.top - 16, `${m.kop.bottom} / ${m.pan.top}`);
    } else ok(`${tag}: de kop staat onder de video (op de grond), boven de stappen`, m.kop.top >= m.beeld.bottom && m.kop.bottom <= m.pan.top, `${m.kop.top} / ${m.beeld.bottom}`);
    ok(`${tag}: geen horizontale scroll, geen scriptfout`, m.sw <= m.cw && fouten.length === 0, `${m.sw}/${m.cw} ${fouten.join(' | ')}`);
    await ctx.close();
  }
}

/* ── 2 · de kleur ── */
console.log('\n2 · de kleur: de kop kiest zelf zwart of wit (1440 × 900 en 1920 × 1080)');
for (const [w, h, pad, taal] of [[1440, 900, '/', 'en'], [1920, 1080, '/nl/', 'nl']]) {
  const tag = `${taal} ${w}`;
  const { ctx, page } = await open(pad, w, h);
  const kan = await page.evaluate(() => document.querySelector('[data-b94-video]').canPlayType('video/mp4; codecs="avc1.640028"'));
  if (!kan) { meld(`${tag}: deze browser speelt geen H.264: de kleur niet getoetst`); await ctx.close(); continue; }
  await page.waitForFunction(() => document.querySelector('[data-b94-video]').readyState >= 2, null, { timeout: 20000 });
  const wissels = await page.evaluate(() => window.__b94Stand().wissels);
  ok(`${tag}: het plan: ${wissels.length} wissels (${wissels.map(([t, n]) => `${t.toFixed(2)} ${n}`).join(', ')})`, wissels.length >= 1 && wissels.length <= 6);
  ok(`${tag}: nooit twee wissels binnen 1,5 s`, wissels.every(([t], i) => i === 0 || t - wissels[i - 1][0] >= 1.5 - 1e-6));
  for (const [t, verwacht] of [[0.5, INKT], [26.5, INKT]]) {
    const k = await naar(page, t);
    ok(`${tag}: op ${t} s inkt (titel ${k.kleur}, zin ${k.zin})`, k.kleur === verwacht && k.zin === verwacht);
  }
  /* één doorloop, elke 1/8 s: hoe vaak wisselt de kleur echt */
  let vorige = null, echt = 0;
  for (let i = 0; i <= 26.75 * 8; i++) { const k = (await naar(page, i / 8)).kleur; if (vorige && k !== vorige) echt++; vorige = k; }
  ok(`${tag}: in één doorloop wisselt de kop ${echt} keer, zoals het plan`, echt === wissels.length, `${echt} / ${wissels.length}`);
  /* na een sprong meteen de goede kleur (geen overgang) */
  const wit = wissels.find(([, n]) => n === 'wit');
  if (wit) { await naar(page, wit[0] + 0.6); const k = await naar(page, 1); ok(`${tag}: na een sprong van ${(wit[0] + 0.6).toFixed(2)} naar 1 s meteen inkt`, k.kleur === INKT, k.kleur); }
  /* tijdens het spelen een zachte overgang: tussenkleuren rond de eerste wissel */
  if (wit) {
    await naar(page, Math.max(0, wit[0] - 0.4));
    const tussen = await page.evaluate(async () => {
      const v = document.querySelector('[data-b94-video]'), h1 = document.getElementById('b94-h1'), gezien = new Set();
      await v.play(); const t0 = performance.now();
      while (performance.now() - t0 < 1400) { gezien.add(getComputedStyle(h1).color); await new Promise((r) => requestAnimationFrame(r)); }
      v.pause(); return [...gezien].filter((c) => c !== 'rgb(9, 13, 11)' && c !== 'rgb(255, 255, 255)').length;
    });
    ok(`${tag}: tijdens het spelen loopt de wissel zacht over (${tussen} tussenkleuren)`, tussen >= 3);
  }
  /* het contrast van de gekozen kleur, elke halve seconde, op de letters van titel en zin samen */
  const vrij = (t) => wissels.some(([tw]) => t >= tw - 0.05 && t < tw + 0.4);
  const regels = [], onder = [];
  for (let t = 0.25; t < 26.75; t += 0.5) {
    await naar(page, +t.toFixed(2));
    const c = await contrast(page, '.b94-kopvak');
    regels.push(`${t.toFixed(2)}:${c.mediaan.toFixed(1)}`);
    if (c.n > 50 && c.mediaan < 3 && !vrij(t)) onder.push(t);
  }
  meld(`${tag}: contrast per halve seconde (mediaan op de letters): ${regels.join(' ')}`);
  /* de stukken die het plan niet kan redden (gemeten in banner94.js, kopPlan): 6,67 – 6,75 · 7,92 – 8,25 · 9,33 – 10,33 ·
     15,92 – 16,29 · 20,0 – 20,33 s (de 1,5 s vasthouden, en een flits die hij overslaat) */
  const bekend = [[6.6, 6.8], [7.9, 8.3], [9.3, 10.4], [15.9, 16.35], [19.95, 20.4]];
  const buiten = onder.filter((t) => !bekend.some(([a, b]) => t >= a && t <= b));
  ok(`${tag}: minstens 3 : 1, behalve tijdens een overgang en op de bekende stukken (onder 3 : 1 op ${onder.map((t) => t.toFixed(2)).join(', ') || 'geen'})`, buiten.length === 0, buiten.join(', '));
  await ctx.close();
}

/* ── 3 · minder beweging ── */
console.log('\n3 · minder beweging (1440 × 900)');
{
  const { ctx, page } = await open('/', 1440, 900, { reducedMotion: 'reduce' });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({ stand: window.__b94Stand(), poster: document.querySelector('[data-b94-video]').getAttribute('poster'), kleur: getComputedStyle(document.getElementById('b94-h1')).color }));
  ok(`het stille eindbeeld (${(m.poster || '').split('?')[0]}), geen video geladen`, m.stand.stil && /eind-(1280|1920)\.webp/.test(m.poster || '') && !m.stand.src);
  ok(`de kleur van 18 s: wit (${m.kleur})`, m.kleur === WIT);
  await page.waitForFunction(() => { const v = document.querySelector('[data-b94-video]'); const i = new Image(); i.src = v.poster; return i.complete; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const c = await contrast(page, '#b94-h1');
  ok(`leesbaar op het eindbeeld: mediaan ${c.mediaan.toFixed(2)} : 1 (slechtste tiende ${c.p10.toFixed(2)})`, c.n > 50 && c.mediaan >= 4.5);
  await ctx.close();
}

/* ── 4 · 200 % zoom ── */
console.log('\n4 · 200 % zoom');
for (const [w, h] of [[720, 450], [195, 422]]) {
  for (const [pad, taal] of [['/', 'en'], ['/nl/', 'nl']]) {
    const { ctx, page } = await open(pad, w, h);
    const m = await page.evaluate(() => { const k = document.querySelector('.b94-kopvak').getBoundingClientRect(); const h1 = document.getElementById('b94-h1'); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, l: k.left, r: k.right, hw: h1.scrollWidth, hc: h1.clientWidth }; });
    ok(`${taal} ${w} (200 %): geen overloop (${m.sw}/${m.cw}), de kop binnen het venster`, m.sw <= m.cw && m.l >= 0 && m.r <= m.cw + 0.5 && m.hw <= m.hc + 1);
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
