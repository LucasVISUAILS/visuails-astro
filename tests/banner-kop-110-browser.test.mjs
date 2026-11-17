/**
 * VISUAILS — de hoofdkop en het blok onder de video (levering 110, 16 november 2026; lijst 119 tot 122).
 * Lucas: "Ik wil de letters breder hebben en echt wel wat meer editorial grootte in your face maar het moet niet de video
 * bedekken." (lijst 119) · "We make your brand impossible to ignore" (03:17), geen interpunctie in de titel (lijst 122, Q3 a)
 * · onder de video wat VISUAILS doet en wat de klant eraan heeft (02:59, de tekst van 03:29).
 * Wat hier vastligt, in het Engels en het Nederlands, op 1440, 1280, 390 en 360:
 *   1 · de bron: de letter VISUAILS Display Blok bestaat, de kop heeft een aanloop en een grote regel, geen leesteken;
 *   2 · de kop staat in VISUAILS Display Blok, de grote regel vult de kolom (binnen 3 %), niets steekt uit;
 *   3 · de kop bedekt hoogstens 15 % van de video; de grote regel is ruim twee keer de aanloop;
 *   4 · de aanloop is minstens 11,5 px en elke regel is één regel;
 *   5 · het blok onder de video: na de banner, kop hoogstens 2 regels, tekst minstens 16 px, de grijze tekst haalt 4,5 : 1;
 *   6 · geen horizontale scroll.
 *   node tests/banner-kop-110-browser.test.mjs        (eerst de build)
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

console.log('\nVISUAILS — de hoofdkop en het blok onder de video (levering 110)\n\n1 · de bron');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
ok('de letter staat in public/fonts', fs.existsSync(path.join(ROOT, 'public/fonts/visuails-display/VISUAILSDisplayBlok-Bold.woff2')));
ok('de bron van de letter staat in docs/letter/bron/blok.py', fs.existsSync(path.join(ROOT, 'docs/letter/bron/blok.py')));
/* als file://-adres: op Windows is een los pad (E:\...) geen geldig adres voor import() (uitrollen, 16 november 2026) */
const { BANNER } = await import(pathToFileURL(path.join(ROOT, 'src/data/banner94.js')).href);
for (const taal of ['en', 'nl']) {
  ok(`${taal}: de titel heeft geen leesteken`, !/[.,;:!?…]/.test(BANNER[taal].kop.join(' ')), BANNER[taal].kop.join(' '));
  ok(`${taal}: het blok onder de video heeft een kop, een label en twee delen tekst`, ['kop', 'label', 'wat', 'waarom'].every((k) => BANNER[taal].onder?.[k]));
}
ok('de kop heeft een aanloop en een grote regel', /b94-aanloop/.test(lees('src/components/HalBanner94.astro')) && /b94-groot/.test(lees('src/components/HalBanner94.astro')));
/* levering 114 (Lucas, 17 november 00:46): de telefoon gaat in de eerste scène over de kop heen */
{
  const ban = lees('src/components/HalBanner94.astro'), data = lees('src/data/banner94.js');
  const plaat = path.join(ROOT, 'public/img/hal/banner/telefoon-masker.webp');
  ok('levering 114: het masker van de telefoon staat er (8 × 13 vakken van 240 × 135, 102 beelden) en zijn script ook',
    fs.existsSync(plaat) && fs.existsSync(path.join(ROOT, 'scripts/telefoon-masker.py')) && /beelden: 102, kolommen: 8, rijen: 13/.test(data));
  ok('levering 114: in de letters staat de video waar de telefoon is (alleen in de eerste scène), de letters tekent WebGL zelf',
    /uniform float b;/.test(ban) && /a \* \(1\.0 - voor\)\); \}/.test(ban) && /bi < data\.masker\.beelden \? bi : -1/.test(ban) && /tekenLetters/.test(ban));
  /* levering 115 (lijst 125 C, Lucas 03:40): de hele kop één kleur, gekozen op contrast in lineair licht, met een zachte rand */
  ok('levering 115: de kop is effen (geen negatief meer), één kleur gekozen op contrast (1,05 / (L + 0,05) tegen (L + 0,05) / 0,0535), met een rand in de andere kleur',
    /function kopKleur\(\)/.test(ban) && /const cWit = 1\.05 \/ \(deel\(\.6\) \+ \.05\), cInkt = \(deel\(\.4\) \+ \.05\) \/ \.0535;/.test(ban) && /uniform sampler2D hl; uniform float wit;/.test(ban) && !/vec3 n = 1\.0 - c;/.test(ban));
  ok('levering 114: de €1-melding komt na de bannervideo (interactions.js)', /const b94 = document\.querySelector\('\[data-b94\]'\);\s*if \(b94 && b94\.getBoundingClientRect\(\)\.bottom > 0\) return false;/.test(lees('src/scripts/interactions.js')));
}
ok('het blok onder de video staat op de voorpagina', /<HalOnderVideo110\b/.test(lees('src/components/VoorpaginaHal.astro')));

const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });

const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [pad, taal] of [['/', 'en'], ['/nl/', 'nl']]) {
  for (const breed of [1440, 1280, 390, 360]) {
    const tag = `${taal} ${breed}`;
    console.log(`\n${tag}`);
    const ctx = await browser.newContext({ viewport: { width: breed, height: breed > 700 ? 900 : 844 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { window.__kvUit = true; window.__lnUit = true; });
    const page = await ctx.newPage();
    await page.goto(`${BASIS}${pad}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const h = document.getElementById('b94-h1'); const vak = h.parentElement; const v = document.querySelector('.b94 .b94-beeld');
      const a = h.querySelector('.b94-aanloop'), g = h.querySelector('.b94-groot');
      const r = (e) => e.getBoundingClientRect();
      const lh = (e) => parseFloat(getComputedStyle(e).fontSize) * 0.92;
      const kb = r(h), vb = r(v);
      const x = Math.max(0, Math.min(kb.right, vb.right) - Math.max(kb.left, vb.left)), y = Math.max(0, Math.min(kb.bottom, vb.bottom) - Math.max(kb.top, vb.top));
      /* levering 114: de kop staat gecentreerd boven de balk met de stappen (niet meer naast een vlak rechts) */
      const pan = document.querySelector('.b94-paneel'); const grens = innerWidth;
      const boven = !pan || innerWidth <= 760 || r(h).bottom <= r(pan).top - 16;
      const breekt = !!h.querySelector('.b94-breekt') && innerWidth <= 760;
      const ov = document.querySelector('.ov110'), ovk = document.querySelector('.ov110-kop'), ovz = document.querySelector('.ov110-zin');
      const ban = document.querySelector('.b94');
      const grond = getComputedStyle(document.documentElement).backgroundColor;
      return {
        fam: getComputedStyle(h).fontFamily, blok: document.fonts.check('700 20px "VISUAILS Display Blok"'),
        fs: parseFloat(getComputedStyle(h).fontSize), vul: r(g).width / r(vak).width,
        uit: Math.max(r(a).right, r(g).right) > grens + 0.5 || Math.min(r(a).left, r(g).left) < -0.5,
        dekking: x * y / (vb.width * vb.height),
        aanloopPx: parseFloat(getComputedStyle(a).fontSize), regelsA: Math.round(r(a).height / lh(a)), regelsG: Math.round(r(g).height / lh(g)),
        naBanner: !!ov && ban.compareDocumentPosition(ov) === Node.DOCUMENT_POSITION_FOLLOWING,
        ovRegels: Math.round(r(ovk).height / parseFloat(getComputedStyle(ovk).lineHeight)), ovKopPx: parseFloat(getComputedStyle(ovk).fontSize),
        zinPx: parseFloat(getComputedStyle(ovz).fontSize), zinKleur: getComputedStyle(ovz).color, grond: grond === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.body).backgroundColor : grond,
        scroll: document.documentElement.scrollWidth > innerWidth, boven, breekt,
      };
    });
    ok(`${tag}: de kop staat in VISUAILS Display Blok`, m.blok && /VISUAILS Display Blok/.test(m.fam), m.fam);
    ok(`${tag}: de grote regel vult de kolom (${(m.vul * 100).toFixed(1)} %)`, m.vul > 0.97 && m.vul <= 1.001);
    ok(`${tag}: niets van de kop steekt uit`, !m.uit);
    ok(`${tag}: de kop staat minstens 16 px boven de balk met de stappen`, m.boven);
    /* levering 114: op de telefoon staat de lange Nederlandse kop op twee regels (17 november: "verdient gezien / te worden"), dan
       hoogstens 18 % */
    ok(`${tag}: de kop bedekt hoogstens ${m.breekt ? 18 : 15} % van de video (${(m.dekking * 100).toFixed(1)} %)`, m.dekking <= (m.breekt ? 0.18 : 0.15));
    ok(`${tag}: de grote regel is ruim twee keer de aanloop (${m.fs.toFixed(0)} en ${m.aanloopPx.toFixed(0)} px)`, m.fs >= 2.2 * m.aanloopPx);
    ok(`${tag}: de aanloop is minstens 11,5 px (${m.aanloopPx.toFixed(1)} px)`, m.aanloopPx >= 11.5);
    ok(`${tag}: de aanloop is één regel, de grote regel ${m.breekt ? 'twee (telefoon, Nederlands)' : 'één'}`, m.regelsA === 1 && m.regelsG === (m.breekt ? 2 : 1), `${m.regelsA} + ${m.regelsG}`);
    ok(`${tag}: het blok staat na de banner`, m.naBanner);
    ok(`${tag}: de kop van het blok is hoogstens 2 regels (${m.ovRegels}, ${m.ovKopPx} px)`, m.ovRegels <= 2);
    ok(`${tag}: de tekst van het blok is minstens 16 px (${m.zinPx} px)`, m.zinPx >= 16);
    const c = contrast(m.zinKleur, m.grond);
    ok(`${tag}: de grijze tekst haalt 4,5 : 1 (${c.toFixed(2)})`, c >= 4.5);
    ok(`${tag}: geen horizontale scroll`, !m.scroll);
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
