/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * GEEN ENKELE PAGINA KLAAGT IN DE CONSOLE  ·  npm run test:consoleschoon
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Er zijn toetsen op wat de pagina's ZEGGEN, hoe ze eruitzien, en of de CSP ze
 * doorlaat. Wat er niet was, is een toets op wat de BROWSER ervan vindt: een
 * TypeError halverwege een module stopt de rest van dat bestand, en de functie
 * die daarna geregistreerd zou worden bestaat gewoon niet meer. Er verschijnt
 * geen foutmelding op het scherm; er gebeurt alleen iets niet.
 *
 * Precies zo verdween eerder dit jaar de bediening van de carrousel op één
 * pagina zonder dat iemand het merkte. Deze toets zou dat in één run hebben
 * aangewezen.
 *
 * ── WAT ER GEMETEN WORDT ───────────────────────────────────────────────────
 *
 *   · `pageerror`     — een onafgevangen uitzondering
 *   · `console`       — alles wat error of warning is
 *   · `requestfailed` en elke 4xx/5xx — een bestand dat niet bestaat
 *
 * Twee breedtes, want de mobiele lade en de bureaubladnavigatie zijn andere
 * code, en een fout in de ene is onzichtbaar op de andere.
 *
 * ── WAAROM EEN GREEP EN NIET ALLE 91 PAGINA'S ──────────────────────────────
 *
 * De volledige sweep staat in kladblok/consolesweep.mjs en doet er ruim vijf
 * minuten over — te veel om aan elke `npm test` te hangen. De pagina's hieronder
 * zijn gekozen omdat ze SAMEN elk script van de site aanraken: de homepage (de
 * carrousel, de vergelijker), de bestelstroom (verreweg de meeste code), de
 * galerij (de filterbalk), /plans, /thank-you, en een juridische pagina die
 * vrijwel geen script draait en dus de kale Layout toetst. De sweep in het
 * kladblok is de brede controle; deze is de wacht.
 *
 * ── /account/me IS GEEN FOUT HIER ──────────────────────────────────────────
 *
 * Elke pagina vraagt bij het laden of er iemand ingelogd is. Dat pad is een
 * Pages Function en bestaat in deze statische opstelling niet. Diezelfde 404
 * hoort er dus bij en wordt overgeslagen; hij zegt iets over de proefopstelling
 * en niets over de site.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(46)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

if (!existsSync(DIST)) {
  console.log('dist/ ontbreekt — draai eerst `npm run test:bouw`. Deze toets slaat over.');
  process.exit(0);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(8089, r));

const PAGINAS = ['/', '/nl', '/start/catalog', '/gallery', '/nl/gallery', '/plans', '/thank-you', '/terms', '/pricing', '/compare'];
const BUITEN = /^\/(api|account|admin|portal)\//;

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});

const gevonden = [];
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  for (const pad of PAGINAS) {
    if (!existsSync(join(DIST, pad === '/' ? 'index.html' : pad.slice(1) + '/index.html'))) continue;
    const page = await ctx.newPage();
    page.on('pageerror', (e) => gevonden.push(`${w}px ${pad} — ${e.message.split('\n')[0]}`));
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      if (/Failed to load resource/.test(m.text())) return;   // komt al via response
      gevonden.push(`${w}px ${pad} — [${m.type()}] ${m.text().slice(0, 120)}`);
    });
    page.on('requestfailed', (r) => {
      const u = new URL(r.url()).pathname;
      if (!BUITEN.test(u)) gevonden.push(`${w}px ${pad} — verzoek mislukt: ${u}`);
    });
    page.on('response', (r) => {
      if (r.status() < 400) return;
      const u = new URL(r.url()).pathname;
      if (!BUITEN.test(u)) gevonden.push(`${w}px ${pad} — ${r.status()} ${u}`);
    });
    try {
      await page.goto(`http://127.0.0.1:8089${pad}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(500);
    } catch (e) {
      gevonden.push(`${w}px ${pad} — laadde niet: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
/* Windows: process.exit() vlak na browser.close() struikelt in libuv
   ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")
   omdat de pipes van Chromium nog aan het sluiten zijn. Eén tik wachten
   laat ze dichtgaan; de uitslag verandert er niet door — 4 sept 2026. */
await new Promise((r) => setTimeout(r, 300));
server.close();

console.log(`${PAGINAS.length} pagina's × 2 breedtes\n`);
ok('geen JS-fout, console-melding of mislukt verzoek', gevonden, []);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
