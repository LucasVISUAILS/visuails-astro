/**
 * VISUAILS — het kaartveld in de site (levering 100, stap 2; vervangt de toets van de fotoblokken van lijst 86).
 * De vier blokken die fotoblok waren (het €1-blok, het slot, de Studiobrief, de 404) en alles met [data-kaart] zijn
 * kaarten: een venster op één groot WebGL-veld (src/scripts/kaartveld.js, src/styles/kaart-100.css). Wat hier vastligt:
 *   1 · de opmaak: kaartveld.js en kaart-100.css zitten in de Layout; vijf looks, een css-verloop als terugval zonder
 *       WebGL; sinds levering 113 geen aderen, geen draad en geen lichtnet meer;
 *   2 · in de browser (1440 en 390): elke kaart draagt het veld (kv-aan, een eigen doek), en wit haalt op het slechtste
 *       beeldpunt onder de tekst minstens 4,5 : 1, op twee momenten van de puls; de witte V op de 404 minstens 3 : 1.
 *   node tests/kaartveld-100-browser.test.mjs        (eerst de build)
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
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

console.log('\nVISUAILS — het kaartveld (levering 100)\n\n1 · de opmaak');
const layout = lees('src/layouts/Layout.astro'), veld = lees('src/scripts/kaartveld.js'), css = lees('src/styles/kaart-100.css');
ok('kaartveld.js en kaart-100.css zitten in de Layout', /kaartveld\.js/.test(layout) && /kaart-100\.css/.test(layout));
ok('de vier oude fotoblokken zijn kaarten', ['.h-proef > .h-proef-woord', '.h-lk-slot', '.site-footer .sb', '.h-nf-getal'].every((s) => veld.includes(s)));
ok('vijf looks (zijde, nacht, mint, horizon, gloed), op volgorde', /float look\(int i\)\{ return mod\(float\(i\), 5\.\); \}/.test(veld));
ok('een kaart mengt niet met de look of de lijn van zijn buren', (veld.match(/- gD\)/g) || []).length >= 2);
ok('zonder WebGL: een css-verloop op de kaart', /linear-gradient\(135deg, #016645/.test(css));
ok('bij minder beweging staat het veld stil', /minder\.matches \? 4/.test(veld));
/* levering 108 (Lucas, 15 nov 21:47): mat en glad, geen rand, de aderen als draad van chroom met stroom erdoor */
ok('109 · een fijne filmkorrel, 8 keer per seconde (Lucas, 16 nov 00:00)', /c \+= kr \* \.045/.test(veld) && /floor\(uTijd\*8\.\)/.test(veld));
ok('109 · elke kaart een eigen vouw van licht', /DE VOUW/.test(veld) && /float rug = exp/.test(veld));
/* levering 113 (Lucas, 16 nov 20:30: "Haal de aderen/bedrading helemaal uit de website, hier krijg je toch lag van") */
ok('113 · geen aderen: buiten de kaart is het doek doorzichtig, en het doek is precies zo groot als de kaart', /d > 1\.5\)\{ gl_FragColor = vec4\(0\.\); return; \}/.test(veld) && /const RAND = 0,/.test(veld) && /inset: 0 !important; width: 100% !important; height: 100% !important;/.test(css));
ok('113 · geen draad in de kaart: geen draadIn of draadKleur in de kleur, de kaart gewoon dicht', !/mix\(draadIn\(/.test(veld) && !/draadKleur\(vs, vpl\)/.test(veld) && /gl_FragColor = vec4\(clamp\(c, 0\., 1\.\), rand\);/.test(veld));
ok('113 · geen licht onder het doek: lichtnet.js zit niet meer in de Layout', !/import '\.\.\/scripts\/lichtnet\.js'/.test(layout));
ok('108 · geen lichte rand langs de kaart (het licht komt niet terug in de laatste px voor de rand)', !/weg = max\(weg, smoothstep\(-16\., -2\., d\)\)/.test(veld));

const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
console.log('\n3 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const FOTO_MS = 120000;
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function open(opties = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...opties });
  const page = await ctx.newPage();
  page.setDefaultTimeout(FOTO_MS); page.setDefaultNavigationTimeout(FOTO_MS);
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#cc-bar, .wa-dock { display: none !important; } .site-header { visibility: hidden !important; }';  /* de balk ligt anders over een hoog blok heen (de telefoon) */ document.head.append(s); }); });
  return { ctx, page };
}
const STIL = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } #cc-bar, .wa-dock { display: none !important; }';
const pixels = async (buf) => { const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };

/**
 * Het slechtste beeldpunt onder de tekst: drie keer dezelfde plek. `kaal` zonder de tekst (de grond met korrel), `masker` de
 * tekst zwart op wit (alles wat geen tekst is weg). Onder het masker, 2 px verbreed, de laagste verhouding tussen de kleur
 * van de tekst en de grond eronder.
 */
async function slechtsteTekst(page, wortel, tekst, tekstKleur = [255, 255, 255]) {
  const el = await page.$(wortel);
  if (!el) return { r: 0, n: 0, fout: `${wortel} niet gevonden` };
  /* in het midden van het scherm, weg van de balk bovenin (die er anders overheen kan liggen) */
  /* (niet in de opening: een sprong daar start de rit) */
  /* (levering 90: met het effect op de rustplek van de laptop, het podium onder de balk; verder in de baan start de video) */
  if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8') && document.documentElement.classList.contains('o8-aan'), wortel)) {
    await page.evaluate(() => scrollTo({ top: document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56, behavior: 'instant' }));
    await page.waitForFunction(() => window.__o8Stand?.().fase === 'rust' && document.querySelector('[data-o8-beeld]').complete, null, { timeout: 30000 }).catch(() => {});
  } else if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8'), wortel)) await el.scrollIntoViewIfNeeded();
  else await page.evaluate((w) => { const e = document.querySelector(w); if (!e.closest('.site-header')) e.scrollIntoView({ block: 'center' }); }, wortel);
  await page.waitForTimeout(350);
  const vak = await el.boundingBox();
  const vp = page.viewportSize();
  const clip = { x: Math.max(0, vak.x), y: Math.max(0, vak.y), width: Math.min(vak.width, vp.width - Math.max(0, vak.x)), height: Math.min(vak.height, vp.height - Math.max(0, vak.y)) };
  if (tekstKleur === 'auto') tekstKleur = await page.$eval(`${wortel} ${tekst[0]}`.trim(), (e) => getComputedStyle(e).color.match(/\d+/g).slice(0, 3).map(Number));
  /* De site staat in @layer basis, en daar wint een !important van elke !important buiten een laag. Een style-attribuut
     met !important gaat er wel boven (de cascade kijkt eerst naar het element, dan naar de lagen): dus zetten we het zo. */
  const zet = (stap) => page.evaluate(([wortel, tekst, stap, stil]) => {
    let st = document.getElementById('meet-stil'); if (!st) { st = document.createElement('style'); st.id = 'meet-stil'; st.textContent = stil; document.head.append(st); }
    const root = document.querySelector(wortel);
    const alle = [root, ...root.querySelectorAll('*')];
    for (const e of [document.documentElement, document.body]) if (e.hasAttribute('data-m-oud')) { const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); if (stap === 'terug') e.removeAttribute('data-m-oud'); }
    for (const e of alle) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); }
    root.classList.remove('fb-meet');
    if (stap === 'terug') { for (const e of alle) e.removeAttribute('data-m-oud'); st.remove(); return; }
    const tk = new Set(tekst.flatMap((t) => (t ? [...root.querySelectorAll(t)] : [root])).flatMap((e) => [e, ...e.querySelectorAll('*')]));
    const z = (e, k, v) => e.style.setProperty(k, v, 'important');
    if (stap === 'kaal') {
      /* ook de achtergrond van de letters zelf (een kop in de kopletter kan zijn kleur als background-clip: text dragen) */
      for (const e of tk) { z(e, 'color', 'transparent'); z(e, '-webkit-text-fill-color', 'transparent'); z(e, 'text-decoration-color', 'transparent'); z(e, 'fill', 'transparent'); z(e, 'stroke', 'transparent'); if (e !== root) z(e, 'background', 'transparent'); }
    } else {
      for (const e of alle) {
        if (tk.has(e)) { z(e, 'visibility', 'visible'); z(e, 'color', '#000'); z(e, '-webkit-text-fill-color', '#000'); z(e, 'fill', '#000'); z(e, 'stroke', 'none'); z(e, 'text-shadow', 'none'); if (e !== root) { z(e, 'background', 'transparent'); z(e, 'box-shadow', 'none'); } }
        else z(e, 'visibility', 'hidden');
      }
      z(root, 'visibility', 'visible'); z(root, 'background', '#fff'); z(root, 'box-shadow', 'none');
      /* fotoblok: de plaat is een ::before van het blok; in het masker hoort hij weg (anders telt hij als tekst) */
      /* het doek van het kaartveld hoort in het masker weg */
      root.querySelectorAll('canvas.kv-doek').forEach((c) => z(c, 'visibility', 'hidden'));
      /* de rest van de pagina weg (wat over de plek heen valt, telt niet als tekst op het stukje) */
      for (const e of [document.documentElement, document.body]) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); }
      z(document.body, 'visibility', 'hidden'); z(document.documentElement, 'background', '#fff'); z(document.body, 'background', '#fff');
    }
  }, [wortel, tekst, stap, STIL]);
  await zet('kaal'); await page.waitForTimeout(60);
  const kaal = await pixels(await page.screenshot({ clip, timeout: FOTO_MS }));
  await zet('masker'); await page.waitForTimeout(60);
  const mBuf = await page.screenshot({ clip, timeout: FOTO_MS }); const masker = await pixels(mBuf);
  if (process.env.MEET_UIT) { fs.mkdirSync(process.env.MEET_UIT, { recursive: true }); const k = wortel.replace(/[^a-z0-9]+/gi, '_'); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-masker.png`), mBuf); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-kaal.png`), await sharp(kaal.data, { raw: { width: kaal.w, height: kaal.h, channels: 3 } }).png().toBuffer()); }
  await zet('terug');
  const { w, h } = kaal, aan = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (masker.data[i * 3] < 140 && masker.data[i * 3 + 2] < 140) aan[i] = 1;
  const breed = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!aan[y * w + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) breed[Y * w + X] = 1; } }
  const Lt = L(...tekstKleur);
  let r = 99, n = 0;
  for (let i = 0; i < w * h; i++) { if (!breed[i]) continue; n++; r = Math.min(r, ratio(Lt, L(kaal.data[i * 3], kaal.data[i * 3 + 1], kaal.data[i * 3 + 2]))); }
  return { r, n };
}


/* elke kaart op een paar pagina's, op de computer en de telefoon, op twee momenten van de puls */
const PLEKKEN = [
  ['/nl/', '.h-proef > .h-proef-woord', ['.h-kop', '.h-pil', 'p:not(.h-acties)', '.k-lijn']],
  ['/nl/pricing/', '.h-proef > .h-proef-woord', ['.h-kop', '.h-pil', 'p:not(.h-acties)']],
  ['/nl/about/', '.h-lk-slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/nl/editions/', '.h-lk-slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas > p:not(.h-acties)']],
  ['/lifestyle/dunes/', '.h-lk-slot', ['.fb-glas > .h-kop', '.fb-glas > .h-pil', '.fb-glas .h-feiten li']],
  ['/nl/about/', '.site-footer .sb', ['.sb-kop', '.sb-zin', '.sb-noot']],
  ['/nl/guides/', '.h-gd-brief', ['.sb-kop', '.sb-zin', '.sb-noot']],
  /* levering 108, fase 4: de nieuwe kaarten van lijst 105 */
  ['/nl/plans/', '.h-kopbeeld-getal.kv-108', ['.h-kopbeeld-rij', '.h-kopbeeld-voet']],
  ['/nl/hooks/', '.h-kopbeeld-getal.kv-108', ['.h-kopbeeld-rij', '.h-kopbeeld-voet']],
  ['/nl/catalog/', '.h-dienst-eigen.kv-108', ['.h-dienst-extra-kop', '.h-dienst-extra-zin']],
  ['/nl/video/', '.h-vd-klip.kv-108', ['.h-vd-klip-t', '.h-vd-klip-m']],
  ['/nl/start/', '.h-st-mk.kv-108', ['.h-st-mk-naam', '.h-st-mk-zin']],
  ['/nl/start/custom-look/', '.hold-status.kv-108', ['.hold-status-label', '.hold-status-word', '.hold-status-body']],
  ['/nl/thank-you/', '.ty-bar.kv-108', ['h1']],
];
for (const [breed, hoog] of [[1440, 900], [390, 844]]) {
  const telefoon = breed < 600;
  for (const [pad, wortel, tekst] of PLEKKEN) {
    const { ctx, page } = await open({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 1, ...(telefoon ? { isMobile: true, hasTouch: true } : {}) });
    await page.goto(`${BASIS}${pad}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => page.waitForTimeout(500));
    await page.evaluate((w) => document.querySelector(w)?.scrollIntoView({ block: 'center' }), wortel);
    let slechtst = 99, n = 0, fout2 = '';
    for (const t of [0, 7]) {
      await page.evaluate((t) => window.__kaartveld?.zet(t), t); await page.waitForTimeout(150);
      const m = await slechtsteTekst(page, wortel, tekst.map((s) => `${wortel} ${s}`.replace(wortel + ' ', '')), [255, 255, 255]);
      slechtst = Math.min(slechtst, m.r); n = Math.max(n, m.n); fout2 = m.fout || fout2;
    }
    const aan = await page.$eval(wortel, (e) => e.classList.contains('kv-aan') && !!e.querySelector(':scope > canvas.kv-doek'));
    ok(`${breed} ${pad} ${wortel}: het veld staat aan, wit op het slechtste punt ${slechtst.toFixed(2)} : 1`, aan && n > 200 && slechtst >= 4.5, `aan=${aan} n=${n} ${fout2}`);
    await ctx.close();
  }
  const { ctx, page } = await open({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 1, ...(telefoon ? { isMobile: true, hasTouch: true } : {}) });
  await page.goto(`${BASIS}/nl/404.html`, { waitUntil: 'networkidle' });
  const v = await slechtsteTekst(page, '.h-nf-getal', ['.h-nf-v']);
  ok(`${breed} de 404: de witte V op de kaart minstens 3 : 1 (slechtste ${v.r.toFixed(2)})`, v.r >= 3 && v.n > 200, v.fout || '');
  await ctx.close();
}
await browser.close(); server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
