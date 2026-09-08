/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LAMP HOORT BIJ DE PAGINA, DE FAQ-KAARTEN LATEN ELKAAR MET RUST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen die Lucas op 1 september 2026 aanwees, en die allebei alleen in een
 * browser te zien zijn: ze staan als losse regels CSS volkomen in orde en gaan
 * pas mis wanneer de cascade en de layout zijn uitgerekend.
 *
 * ── 1 · DE GROENE GLOED ────────────────────────────────────────────────────
 *
 * *"Er is een groene gloed linksboven in het scherm te zien dat blijkbaar op meer
 * pagina's/secties verschijnt dan de bedoeling is."*
 *
 * De lamp zat in `body::before`, samen met de korrel en het vignet, en die laag
 * staat op `position: fixed`. Voor korrel en vignet is dat juist — dat zijn
 * eigenschappen van het SCHERM. Voor een lamp niet: hij schijnt dan niet één keer
 * op de pagina maar opnieuw op elk stuk pagina dat je in beeld scrollt.
 *
 * Gemeten, als groen-min-blauw linksboven ten opzichte van rechtsonder (de lamp
 * is rgb(198 241 0): veel groen, geen blauw, dus die verhouding meet hem en het
 * vignet stoort niet):
 *
 *     fixed      bovenaan +8   na 2200px +8   na 5000px +8
 *     absoluut   bovenaan +8   na 2200px +1   na 5000px +1
 *
 * ── 2 · DE VIER FAQ-KAARTEN ────────────────────────────────────────────────
 *
 * *"Op dit moment klappen ALLE vier de FAQ-items open zodra je op één ervan
 * klikt."* Wat er gebeurde was subtieler en zag er hetzelfde uit: het waren vier
 * <details> in een grid met `align-items: stretch`, dus opende er één en groeide
 * de hele RIJ mee. Gemeten: dicht 121px, na één klik alle vier 325px, waarvan
 * drie leeg.
 */
import { existsSync, createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, kreeg, verwacht) => {
  const ok = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
};

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`\n --   niet gecontroleerd: ${staat.uitleg}`);
  process.exit(0);
}
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.json': 'application/json',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404); res.end('nee'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(500); res.end('fout'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

/* ══ 1 · DE LAMP STOND HIER ══════════════════════════════════════════════
   Er lag een gele waas van 5% linksboven op het eerste scherm (body::after),
   en deze paragraaf mat dat hij met de pagina meescrolde en niet aan het
   venster hing. Sectie 21 (5 september 2026): de waas is weg — de grond is
   wit en blijft wit — dus er is niets meer om te meten. */

/* ══ 2 · DE VIER FAQ-KAARTEN OP DE HOMEPAGE STONDEN HIER ═════════════════
   Sectie 21 (5 september 2026): de homepage heeft geen uitklapbare vragen meer
   — vier vragen zijn nu vier regels met een link. De controle van §1 op /faq
   dekt hetzelfde gedrag voor de kaarten die er nog zijn. */

/* ══ 3 · DE SCROLL IS VAN DE BROWSER ══════════════════════════════════════
 *
 * Lucas, 1 september 2026: *"Verwijder lenis als dat mogelijk is. Dit maakt de
 * website af en toe wat sloom."*
 *
 * Lenis onderschepte elke wielgebeurtenis en zette de scrollpositie zelf, per
 * frame, in JavaScript op de hoofdthread. Zolang die thread vrij is voelt dat
 * vloeiend; zodra er iets anders gebeurt loopt de scroll achter op de vinger —
 * en native scrollen kan dat niet overkomen, want dat draait op de
 * compositor-thread.
 *
 * `src/scripts/smooth-scroll.js` staat er nog (ik kan geen bestanden op zijn
 * schijf weggooien) maar wordt door niets meer geïmporteerd. Dat is precies het
 * soort dood bestand dat over een half jaar per ongeluk terugkomt, en dit is de
 * regel die dat merkt.
 */
console.log('\nde scroll komt van de browser en niet uit een bibliotheek');
{
  const html = await (await fetch(`${BASE}/`)).text();
  const bronnen = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const bundels = await Promise.all(bronnen.map(async (u) => (await fetch(`${BASE}${u}`)).text()));

  /* Op de NAAM zoeken en niet op de import: de bundel is geminificeerd, dus wat
     er van Lenis in zou staan zijn zijn eigen klassenamen — die zet hij op
     <html> en die kan een minifier niet hernoemen. */
  const sporen = bundels.filter((c) => /lenis-smooth|lenis-stopped|data-lenis-prevent/.test(c));
  check('geen enkele bundel draagt nog Lenis', sporen.length, 0);
  check('en <html> krijgt zijn klassen niet', /class="[^"]*\blenis\b/.test(html), false);

  const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
  /* Alleen een echte import telt; de noot erboven citeert de oude regel met
     opzet, en dit huis is die val al vaker in gelopen. */
  const importRegels = layout.split('\n').filter((r) => /^\s*import\s.*smooth-scroll/.test(r));
  check('niets importeert de oude module nog', importRegels, []);
}

await browser.close();

/* Windows: process.exit() vlak na browser.close() struikelt in libuv

   ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")

   omdat de pipes van Chromium nog aan het sluiten zijn. Eén tik wachten

   laat ze dichtgaan; de uitslag verandert er niet door — 4 sept 2026. */

await new Promise((r) => setTimeout(r, 300));
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
