/**
 * VISUAILS — de hoekregel (levering 56, 17 oktober 2026; nieuwe vorm 25 oktober 2026).
 *
 *   node tests/hoekregel-browser.test.mjs        (npm run test:hoekregel; draai eerst de build)
 *
 * WAAROM DEZE TOETS OP 25 OKTOBER 2026 VERANDERD IS. Tot vandaag gold overal "één
 * zachte hoek linksboven, 3 px op de andere drie", ook op kaarten en grote vlakken, en
 * deze toets keek alleen of zo'n zachte hoek met zijn vlak meeliep. Lucas (25 oktober
 * 2026): "Wat ik overigens wel aan de style wil aanpassen is het 1 zachte hoek en de
 * rest harde hoeken systeem voor alles. Ik wil dit alleen op hele specifieke plekken
 * behouden en niet voor grote kaarten of objecten en puur alleen voor bijvoorbeeld
 * knoppen. De hoeken van kaarten worden gewoon heel rond, iets ronder dan in het
 * voorbeeld." Zijn keuzes: kaarten 24 px rond aan alle vier de hoeken (--r-kaart),
 * grote vlakken 32 px (--r-vlak), kleine tegels en duimnagels 12 px (--r-klein);
 * knoppen en chips houden de zachte hoek (--hoek-knop). Dus bewaakt deze toets nu drie
 * dingen:
 *
 *   A. De zachte hoek alleen op bedieningsdelen. Een groot object (breder dan 160 en
 *      hoger dan 100 px) dat geen knop of veld is en toch de oude vorm heeft (een zware
 *      hoek, minstens twee keer de kleinste en minstens 5 px, naast lichte hoeken van 4 px
 *      of minder), is een fout. Behalve als die zware hoeken precies concentrisch met hun
 *      vlak meelopen (een foto die linksboven in zijn kaart ligt): dan is het de vorm van
 *      het vlak, geen zachte hoek. Een kaart van 24 met concentrisch 8 in twee hoeken van
 *      haar vlak (24/24/8/8) is ook geen zachte hoek: daar is de kleinste hoek geen lichte
 *      hoek. Dit geldt ook in het bestelformulier.
 *   B. Concentrisch, voor alles wat een ronding heeft. Ligt een hoek van een element in
 *      een ronde hoek van zijn vlak (beide afstanden kleiner dan de straal), dan is die
 *      hoek de straal min de gemiddelde afstand, met een minimum van 8 px (bij een klein
 *      vlak de helft van zijn straal: in een knopje van 8 px is 8 geen concentrische hoek).
 *      Het vlak is de dichtstbijzijnde voorouder met een eigen vorm (kleur, rand, schaduw
 *      of overflow: hidden) en een ronding, ook als die vorm met ::before getekend is (de
 *      topbalk). Een hoek van 0 (recht tegen een rand of afgeknipt), een pil of rondje,
 *      iets dat gedraaid staat (dat ligt niet langs de rand) en iets onzichtbaars
 *      (opacity 0, zoals het echte vinkje onder een getekend vakje) vallen erbuiten.
 *   C. De regel van levering 56 voor een knop of pil met de zachte hoek in een vlak
 *      (Lucas, 17 oktober, 09:20: "de ronde rand gaat altijd met de hoek/rand mee dus als
 *      de rand recht is is er geen ronde hoek"): zit hij in een hoek, of strak langs een
 *      rand (12 px of minder), dan zijn zijn andere hoeken licht (zijn kleinste hoek).
 *      Los in het vlak houdt hij zijn eigen zachte hoek.
 * Marge: 1,5 px. B en C slaan het bestelformulier nog over (dat telt pas mee met zijn
 * nieuwe ontwerp); A niet.
 *
 * HOEK_ALLES=1 toont elke fout in plaats van de eerste drie.
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

/* Pagina's met de meeste vlakken in vlakken, plus het bestelformulier en de proef (voor
   A); de rest staat in de volledige meting (kladblok/hoek/hoekmeting.mjs). */
const PAGINAS = process.env.PAGINAS ? process.env.PAGINAS.split(',') : [
  '/', '/nl/', '/catalog/', '/lifestyle/', '/about/', '/compare/', '/faq/', '/contact/',
  '/plans/', '/pricing/', '/gallery/', '/per-product/', '/upload-guidelines/',
  '/custom-models/', '/how-it-works/', '/studio/', '/ai-act/', '/editions/', '/video/', '/start/',
  '/start/catalog/', '/test-sample/',
];
const BREEDTES = process.env.BREEDTES ? process.env.BREEDTES.split(',').map(Number) : [1440, 900, 390];
const VEEL = process.env.HOEK_ALLES ? 999 : 3;
/* Nog buiten B en C: het bestelformulier (nieuw ontwerp volgt) en twee gevallen op
   de grens (de pil op de merkfoto loopt rechts pas mee als hij bijna de hele breedte
   vult; het afspeelplaatje van een video die nog komt).
   .cc: weigeren en toestaan moeten gelijk zijn (AVG, tests/cookie-consent), dus de
   cookieknoppen volgen de hoek van hun balk niet. */
const BUITEN = '.of, .h-form, .bm-form, .hold-form, .pl-signin, .h-vx-speel, .h-bm-een-pil, .cc';

function meet(buiten) {
  const px = (v, w) => { const s = String(v).trim().split(/\s+/)[0]; return s.endsWith('%') ? parseFloat(s) / 100 * w : parseFloat(s) || 0; };
  const radii = (cs, w) => [px(cs.borderTopLeftRadius, w), px(cs.borderTopRightRadius, w), px(cs.borderBottomRightRadius, w), px(cs.borderBottomLeftRadius, w)];
  const alfa = (bg) => (bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : bg === 'transparent' ? 0 : 1);
  const dekt = (cs) => alfa(cs.backgroundColor) > 0.02 || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') || cs.boxShadow !== 'none' || cs.overflow === 'hidden' || cs.overflowX === 'hidden';
  const naam = (el) => el.tagName.toLowerCase() + [...el.classList].filter((k) => !/^(astro-|vs-|is-in$|h-in$)/.test(k)).slice(0, 3).map((k) => '.' + k).join('');
  /* Een bedieningsdeel: wat je indrukt of invult. Een kaart die een link is, of een
     keuzekaart (een label om een rondje), is een object en geen knop. */
  const bediening = (el) => el.matches('button, input, select, textarea, [role="button"], [role="tab"], [role="switch"]')
    || (el.tagName === 'A' && /(^|[\s-])(knop|btn|cta)/.test(el.className || ''));
  const uit = { gezien: 0, groot: 0, fout: [], zacht: [] };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    const r = el.getBoundingClientRect(); if (r.width < 10 || r.height < 10) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    const gedraaid = (cs.rotate && cs.rotate !== 'none' && parseFloat(cs.rotate) !== 0) || (/^matrix\(/.test(cs.transform) && Math.abs(parseFloat(cs.transform.split(',')[1])) > 0.001);
    const rr = radii(cs, r.width); const nz = rr.filter((v) => v > 0.5);
    if (!nz.length) continue;
    const lo = Math.min(...nz); const hi = Math.max(...rr);
    if (hi >= Math.min(r.width, r.height) / 2 - 0.5 || hi >= 400) continue;   // een pil of rondje
    const zachtVorm = hi >= Math.max(lo * 2, lo + 3) && hi >= 5;
    const groot = r.width > 160 && r.height > 100 && !bediening(el);
    const binnen = !el.closest(buiten) && !gedraaid;
    if (!binnen && !(zachtVorm && groot)) continue;
    /* het vlak eromheen */
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
    let zone = [null, null, null, null], ins = null;
    if (cr) {
      const R = crr.map((v) => Math.min(v, cr.height / 2, cr.width / 2));
      const ccs = getComputedStyle(c); const bl = parseFloat(ccs.borderLeftWidth) || 0, bt = parseFloat(ccs.borderTopWidth) || 0;
      ins = { l: r.left - cr.left - bl, t: r.top - cr.top - bt, r: cr.right - r.right - bl, b: cr.bottom - r.bottom - bt };
      if (Math.min(ins.l, ins.t, ins.r, ins.b) >= -1) {
        /* CSS laat een hoek staan zolang twee hoeken aan één zijde samen niet langer zijn
           dan die zijde; daarboven krimpt hij. Dus de grens is de korte zijde min de lichte hoek. */
        const kap = Math.min(r.width, r.height) - lo;
        const paar = [[ins.l, ins.t], [ins.r, ins.t], [ins.r, ins.b], [ins.l, ins.b]];
        zone = paar.map(([dx, dy], k) => (R[k] > 0.5 && dx <= R[k] && dy <= R[k] ? Math.min(kap, Math.max(Math.min(8, R[k] / 2), R[k] - (dx + dy) / 2)) : null));
      } else ins = null;
    }
    /* A: een groot object met een zware zachte hoek die niet uit zijn vlak komt */
    if (groot) {
      uit.groot++;
      const zwaar = rr.map((v, k) => (v >= lo + 3 ? k : -1)).filter((k) => k >= 0);
      const verklaard = zwaar.every((k) => zone[k] !== null && Math.abs(rr[k] - zone[k]) <= 1.5);
      if (zachtVorm && lo <= 4 && !verklaard) uit.zacht.push(`${naam(el)} ${Math.round(r.width)}x${Math.round(r.height)}: ${rr.map((v) => Math.round(v * 10) / 10).join('/')}`);
    }
    if (!binnen || !ins) continue;
    /* B en C */
    const snug = zone.some((z) => z !== null) || Math.min(ins.l, ins.t, ins.r, ins.b) <= 12;
    const moet = rr.map((v, k) => (v <= 0.5 ? 0 : zone[k] !== null ? zone[k] : (zachtVorm && !groot && snug ? lo : v)));
    if (!zone.some((z) => z !== null) && !(zachtVorm && !groot && snug)) continue;
    uit.gezien++;
    if (rr.some((v, k) => Math.abs(v - moet[k]) > 1.5)) {
      uit.fout.push(`${naam(el)} in ${naam(c)}: ${rr.map((v) => Math.round(v * 10) / 10).join('/')} moet ${moet.map((v) => Math.round(v * 2) / 2).join('/')}`);
    }
  }
  return uit;
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
let totaal = 0, grootTotaal = 0;
try {
  for (const w of BREEDTES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    for (const p of PAGINAS) {
      await page.goto(BASIS + p, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      const { gezien, groot, fout, zacht } = await page.evaluate(meet, BUITEN);
      totaal += gezien; grootTotaal += groot;
      check(`${p} op ${w}: ${groot} grote objecten, geen zachte hoek`, zacht.length === 0, zacht.slice(0, VEEL).join(' · '));
      check(`${p} op ${w}: ${gezien} in een vlak, de hoek volgt het vlak`, fout.length === 0, fout.slice(0, VEEL).join(' · '));
    }
    await ctx.close();
  }
  /* Zonder elementen in een vlak zou alles hierboven vanzelf slagen. */
  check(`er is iets om te meten (${totaal} keer een element in een vlak)`, totaal > 300);
  check(`er zijn grote objecten om na te kijken (${grootTotaal})`, grootTotaal > 1000);
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
