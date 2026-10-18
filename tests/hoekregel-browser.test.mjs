/**
 * VISUAILS — de hoekregel (levering 56, 17 oktober 2026).
 *
 *   node tests/hoekregel-browser.test.mjs        (npm run test:hoekregel; draai eerst de build)
 *
 * Lucas (09:20): "Nieuwe regel is dat de ronde rand altijd met de hoek/rand mee gaat
 * dus als de rand recht is is er geen ronde hoek. Dit geld alleen wanneer het in een
 * container zit [...] Bij 'Start an order / Go to VISUAILS Studio' wel gewoon het
 * huidige houden omdat die knoppen los zijn en groot in het midden staan."
 *
 * De regel staat als CSS in hal.css ("DE HOEKREGEL"). Deze toets meet hem na zoals hij
 * gemeten is (kladblok/hoek/hoekmeting.mjs, 89 pagina's op 12 breedtes), zodat een nieuw
 * onderdeel dat hem breekt meteen opvalt:
 *   - elk element met de zware zachte hoek (de grootste hoek minstens twee keer de
 *     kleinste, en minstens 5 px) zoekt zijn container: de dichtstbijzijnde voorouder
 *     met een eigen vorm (kleur, rand, schaduw of overflow: hidden) en een ronding, ook
 *     als die vorm met ::before getekend is (de topbalk);
 *   - een hoek die in een ronde hoek van de container ligt (beide afstanden kleiner dan
 *     de straal) hoort concentrisch te zijn: de straal min de gemiddelde afstand;
 *   - zit het element in een hoek, of strak langs een rand (12 px of minder), dan
 *     horen de andere hoeken licht te zijn (de kleinste hoek van het element);
 *   - los in het vlak, een pil, of over de rand: daar zegt de regel niets.
 * Marge: 1,5 px. Het bestelformulier telt pas mee met zijn nieuwe ontwerp.
 */
import { existsSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, goed, uitleg = '') => {
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(60)} ${goed ? '' : uitleg}`);
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(500); res.end('stuk'); }
});
const poort = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASIS = `http://127.0.0.1:${poort}`;

/* Pagina's met de meeste vlakken in vlakken; de rest staat in de volledige meting. */
const PAGINAS = [
  '/', '/nl/', '/catalog/', '/lifestyle/', '/about/', '/compare/', '/faq/', '/contact/',
  '/plans/', '/pricing/', '/gallery/', '/per-product/', '/upload-guidelines/',
  '/custom-models/', '/how-it-works/', '/studio/', '/ai-act/', '/editions/', '/video/', '/start/',
];
const BREEDTES = [1440, 900, 390];
/* Nog buiten de regel: het bestelformulier (nieuw ontwerp volgt) en twee gevallen op
   de grens (de pil op de merkfoto loopt rechts pas mee als hij bijna de hele breedte
   vult; het afspeelplaatje van een video die nog komt). */
// .cc: weigeren en toestaan moeten gelijk zijn (AVG, tests/cookie-consent), dus de cookieknoppen volgen de hoek van hun balk niet.
const BUITEN = '.of, .h-form, .bm-form, .hold-form, .pl-signin, .h-vx-speel, .h-bm-een-pil, .cc';

function meet(buiten) {
  const px = (v, w) => { const s = String(v).trim().split(/\s+/)[0]; return s.endsWith('%') ? parseFloat(s) / 100 * w : parseFloat(s) || 0; };
  const radii = (cs, w) => [px(cs.borderTopLeftRadius, w), px(cs.borderTopRightRadius, w), px(cs.borderBottomRightRadius, w), px(cs.borderBottomLeftRadius, w)];
  const alfa = (bg) => (bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : bg === 'transparent' ? 0 : 1);
  const dekt = (cs) => alfa(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') || cs.boxShadow !== 'none' || cs.overflow === 'hidden' || cs.overflowX === 'hidden';
  const naam = (el) => el.tagName.toLowerCase() + [...el.classList].slice(0, 3).map((c) => '.' + c).join('');
  const uit = { gezien: 0, fout: [] };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (el.closest(buiten)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rr = radii(cs, r.width); const nz = rr.filter((v) => v > 0.5); const lo = nz.length ? Math.min(...nz) : 0; const hi = Math.max(...rr);
    if (!(hi >= Math.max(lo * 2, lo + 3) && hi >= 5) || hi >= 400) continue;
    let c = el.parentElement, cr = null, crr = null;
    while (c && c !== document.body) {
      const rc = c.getBoundingClientRect();
      if (rc.width >= r.width && rc.height >= r.height) {
        const ccs = getComputedStyle(c); const rrc = radii(ccs, rc.width);
        if (Math.max(...rrc) > 0 && dekt(ccs)) { cr = rc; crr = rrc; break; }
        let gevonden = false;
        for (const ps of ['::before', '::after']) {
          const p = getComputedStyle(c, ps);
          if (p.content === 'none' || p.content === 'normal' || p.position !== 'absolute') continue;
          if (!(alfa(p.backgroundColor) > 0.02 || p.backgroundImage !== 'none')) continue;
          const pr = radii(p, rc.width); if (Math.max(...pr) > 0) { cr = rc; crr = pr; gevonden = true; break; }
        }
        if (gevonden) break;
      }
      c = c.parentElement;
    }
    if (!cr) continue;
    const R = crr.map((v) => Math.min(v, cr.height / 2, cr.width / 2));
    const ccs = getComputedStyle(c); const bl = parseFloat(ccs.borderLeftWidth) || 0, bt = parseFloat(ccs.borderTopWidth) || 0;
    const ins = { l: r.left - cr.left - bl, t: r.top - cr.top - bt, r: cr.right - r.right - bl, b: cr.bottom - r.bottom - bt };
    if (Math.min(ins.l, ins.t, ins.r, ins.b) < -1) continue;
    /* CSS laat een hoek staan zolang twee hoeken aan één zijde samen niet langer zijn
       dan die zijde; daarboven krimpt hij. Dus de grens is de korte zijde min de lichte hoek. */
    const kap = Math.min(r.width, r.height) - lo;
    const paar = [[ins.l, ins.t], [ins.r, ins.t], [ins.r, ins.b], [ins.l, ins.b]];
    const zone = paar.map(([dx, dy], k) => (dx <= R[k] && dy <= R[k] ? Math.min(kap, R[k] - (dx + dy) / 2) : null));
    const inHoek = zone.some((z) => z !== null && z > lo + 1.5);
    if (!inHoek && Math.min(ins.l, ins.t, ins.r, ins.b) > 12) continue;
    uit.gezien++;
    const moet = rr.map((v, k) => (v <= 0.5 ? 0 : zone[k] !== null && zone[k] > lo + 1.5 ? zone[k] : lo));
    if (rr.some((v, k) => Math.abs(v - moet[k]) > 1.5)) {
      uit.fout.push(`${naam(el)} in ${naam(c)}: ${rr.map((v) => Math.round(v * 10) / 10).join('/')} moet ${moet.map((v) => Math.round(v * 2) / 2).join('/')}`);
    }
  }
  return uit;
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
let totaal = 0;
try {
  for (const w of BREEDTES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    for (const p of PAGINAS) {
      await page.goto(BASIS + p, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      const { gezien, fout } = await page.evaluate(meet, BUITEN);
      totaal += gezien;
      check(`${p} op ${w}: ${gezien} in een vlak, de hoek volgt het vlak`, fout.length === 0, fout.slice(0, 3).join(' · '));
    }
    await ctx.close();
  }
  /* Zonder elementen in een vlak zou alles hierboven vanzelf slagen. */
  check(`er is iets om te meten (${totaal} keer een element in een vlak)`, totaal > 300);
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
