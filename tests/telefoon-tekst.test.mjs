/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * OP EEN TELEFOON MAG ER GEEN LETTER BUITEN BEELD VALLEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 17 september 2026, met een schermafdruk van /catalog op zijn telefoon:
 * *"Check elke pagina of de tekst op telefoon wel goed staat. Hier word het
 * afgeknipt."* Dat klopte. En het gemene eraan: er viel niet eens naar te
 * schuiven, want `overflow-x: clip` op de body houdt de pagina op schermbreedte
 * en snijdt weg wat erbuiten valt. Geen schuifbalk, geen foutmelding — alleen
 * een kop die ophoudt midden in een woord.
 *
 * ── DRIE OORZAKEN, ÉÉN VORM ────────────────────────────────────────────────
 *
 * Alle drie de gevallen die we vonden waren hetzelfde mechanisme: iets binnenin
 * een roostercel wil breder zijn dan het scherm, en een roostercel krimpt
 * standaard niet onder die wens (`min-width: auto`). De hele kolom wordt dan zo
 * breed — kop, alinea én knoppen schuiven mee naar buiten.
 *
 *   1  DE FEITENSTROOK onder een kop (`.trust-row` / `.hero-facts`) wilde twee
 *      kolommen van 197 px: 420 px op een scherm van 360.
 *   2  DE STAPPENLIJST op /how-it-works: `max-width: 58ch` = 339 px, ook als er
 *      maar 296 is.
 *   3  LANGE NEDERLANDSE WOORDEN. "Verwerkersovereenkomst" is 524 px breed en
 *      kon niet breken; alle negen resterende gevallen stonden op een NL-pagina.
 *
 * ── WAAROM DIT EEN BROWSERTOETS IS EN GEEN BRONCONTROLE ────────────────────
 *
 * Omdat geen van de drie in de bron te zien is. `minmax(min(11rem, 100%), 1fr)`
 * ziet er correct uit; dat het op 360 px 420 px oplevert, weet alleen een
 * browser die het uitrekent. Deze toets meet wat er op het scherm staat.
 *
 * Wat hij NIET afkeurt: een strook waar je opzij in kunt vegen (een tabel, een
 * maatlijn, een carrousel). Die mag breder zijn dan het scherm — je kunt er
 * immers heen. Afgekeurd wordt alleen tekst die buiten beeld valt zónder dat er
 * iets te schuiven valt. Ook overgeslagen: de dichte la van het menu, die met
 * opzet naast het scherm geparkeerd staat en `inert` is.
 */
import { existsSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, goed, uitleg = '') => {
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(56)} ${goed ? '' : uitleg}`);
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

/* Eén pagina per SOORT, in beide talen waar de taal het verschil maakt — het
   Nederlands heeft de lange woorden en vindt dus wat het Engels verbergt.
   Niet alle 95: dit draait in de ketting mee en hoort seconden te kosten. De
   volledige veeg staat in kladblok/telefoon-alle.mjs. */
const PAGINAS = [
  '/', '/nl/',
  '/catalog/', '/nl/catalog/',
  '/lifestyle/', '/nl/lifestyle/',
  '/how-it-works/', '/nl/how-it-works/',
  '/pricing/', '/nl/pricing/',
  '/test-sample/', '/nl/test-sample/',
  '/start/catalog/', '/nl/start/catalog/',
  '/nl/data-processing-agreement/',
  '/nl/custom-models/',
];
/* 320 is de smalste telefoon die nog verkocht wordt, 360 de meest voorkomende
   Android. Wat op die twee past, past op de rest. */
const BREEDTES = [320, 360];

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

const meet = (vw) => {
  const uit = [];
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    /* Zwevend (de WhatsApp-knop, de cookiebalk) hoort te overlappen. */
    if (cs.position === 'fixed') return;
    /* De dichte la van het menu staat met opzet naast het scherm. */
    if (el.closest('[inert], [aria-hidden="true"]')) return;
    const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!eigen) return;
    const doos = el.getBoundingClientRect();
    if (doos.right <= vw + 1) return;
    /* Valt er naar te schuiven? Dan is het een strook en geen fout. */
    let p = el.parentElement;
    while (p && p !== document.body) {
      const c = getComputedStyle(p);
      if (/(auto|scroll)/.test(c.overflowX) && p.scrollWidth > p.clientWidth + 1) return;
      p = p.parentElement;
    }
    uit.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().trim().split(/\s+/)[0] || '-'} tot ${Math.round(doos.right)}px "${el.textContent.trim().slice(0, 28)}"`);
  });
  return [...new Set(uit)];
};

for (const breed of BREEDTES) {
  console.log(`\nop ${breed} pixels`);
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: { width: breed, height: 850 } });
  const page = await ctx.newPage();
  for (const pad of PAGINAS) {
    await page.goto(BASIS + pad, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    const uit = await page.evaluate(meet, breed);
    check(`  ${pad}`, uit.length === 0, uit.slice(0, 3).join(' | '));
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
