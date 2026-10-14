/* VISUAILS — /test-sample in de browser: de look uit de kaart, en de proef
 * dicht / open / alleen lifestyle. 8 oktober 2026 (1.06 en G2, ronde A2).
 *
 *   npx astro build && node tests/proef-browser.test.mjs     (via zwaar.sh)
 *
 * De pagina is statisch; de stand komt van /api/proef-stand en wordt hier per
 * geval nagebootst. Gemeten wordt wat een bezoeker ziet:
 *   1 · ?style=dunes: soort lifestyle, de eerste vraag weg, Dunes aangevinkt,
 *       de kop "Je proef in Dunes", en een weg terug ("Kies opnieuw");
 *       ?style=classic: soort catalog; een onbekende look: niets verandert;
 *   2 · dicht: "De proef opent in rondes" (kG2, 11 oktober), het veld voor de wachtlijst, het
 *       formulier weg; open: niets van dat alles;
 *   3 · alleen lifestyle: het formulier blijft, catalog staat uit, en wie met
 *       ?style=classic kwam, ziet de vraag weer met lifestyle gekozen;
 *   4 · na het aanmelden (?wachtlijst=ok) de bedankregel, en na een weigering
 *       van /api/order (?error=proef-dicht) het dichte blok;
 *   5 · geen fouten in de console, en op 390 px geen horizontale scroll.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(76)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
if (!fs.existsSync(path.join(DIST, 'test-sample/index.html'))) { console.log(' FAIL er is geen dist/ — bouw eerst'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const PORT = 4318;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

async function open(url, { stand = 'open', breed = 1280 } = {}) {
  const page = await browser.newPage({ viewport: { width: breed, height: 900 } });
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route('**/api/proef-stand', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stand }) }));
  await page.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  await page.route('**/api/land', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"land":"NL"}' }));
  await page.route('**/api/step', (r) => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/botcheck', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"sleutel":null}' }));
  await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  const stand_ = await page.evaluate(() => {
    const zichtbaar = (el) => !!el && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
    const blok = document.querySelector('[data-ts-dicht]');
    const kind = document.querySelector('input[data-pl-kind]:checked');
    return {
      soort: kind ? kind.value : null,
      vraag: zichtbaar(document.querySelector('.pl-kinds')),
      look: document.querySelector('input[name="style"]:checked')?.value || null,
      kop: document.querySelector('[data-pl-step="1"] [data-pl-head]')?.textContent.trim(),
      anders: zichtbaar(document.querySelector('[data-ts-anders]')),
      dicht: zichtbaar(blok),
      dichtKop: blok?.querySelector('h2')?.textContent.trim(),
      formulier: zichtbaar(document.querySelector('[data-ts-formulier]')),
      catalogUit: !!document.querySelector('input[data-pl-kind="catalog"]')?.disabled,
      veld: zichtbaar(document.querySelector('#ts-wacht-email')),
      bedankt: zichtbaar(document.querySelector('[data-ts-wacht="ok"]')),
      overloop: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  await page.close();
  return { ...stand_, fouten };
}

console.log('\n1 · de look uit de kaart');
{
  const d = await open('/nl/test-sample/?style=dunes');
  ok('?style=dunes: soort lifestyle', d.soort, 'lifestyle');
  ok('  de eerste vraag is weg', d.vraag, false);
  ok('  Dunes staat aangevinkt', d.look, 'dunes');
  ok('  de kop zegt welke look', d.kop, 'Je proef in Dunes');
  ok('  met een weg terug', d.anders, true);
  ok('  geen fouten in de console', d.fouten, []);
  const c = await open('/test-sample/?style=classic');
  ok('?style=classic: soort catalog, vraag weg', [c.soort, c.vraag, c.kop], ['catalog', false, 'Your test sample in Classic']);
  const x = await open('/nl/test-sample/?style=bestaat-niet');
  ok('een onbekende look: de vraag blijft staan', [x.vraag, x.anders, x.kop], [true, false, 'Wat maken we voor je?']);
  const z = await open('/nl/test-sample/');
  ok('zonder look: de vraag staat er, catalog voorgekozen', [z.vraag, z.soort], [true, 'catalog']);
}

console.log('\n2 · dicht en open');
{
  const o = await open('/nl/test-sample/', { stand: 'open' });
  ok('open: geen dicht-blok, formulier staat er', [o.dicht, o.formulier], [false, true]);
  const d = await open('/nl/test-sample/', { stand: 'dicht' });
  ok('dicht: "De proef opent in rondes"', [d.dicht, d.dichtKop], [true, 'De proef opent in rondes']);
  ok('  met het veld voor de wachtlijst', d.veld, true);
  ok('  en zonder het bestelformulier', d.formulier, false);
  const e = await open('/test-sample/?style=dunes', { stand: 'dicht' });
  ok('dicht, ook als je met een look komt (EN)', [e.dicht, e.dichtKop, e.formulier], [true, 'The test sample opens in rounds', false]);
  const m = await open('/nl/test-sample/', { stand: 'dicht', breed: 390 });
  ok('dicht op 390 px: geen horizontale scroll', m.overloop, false);
}

console.log('\n3 · alleen lifestyle');
{
  const l = await open('/nl/test-sample/', { stand: 'lifestyle' });
  ok('het blok zegt dat de catalogproef dicht is', l.dichtKop, 'De catalogproef zit tussen twee rondes');
  ok('  het formulier blijft', l.formulier, true);
  ok('  catalog staat uit, lifestyle gekozen', [l.catalogUit, l.soort], [true, 'lifestyle']);
  const k = await open('/nl/test-sample/?style=classic', { stand: 'lifestyle' });
  ok('met ?style=classic: de vraag komt terug met lifestyle', [k.vraag, k.soort, k.anders, k.kop], [true, 'lifestyle', false, 'Wat maken we voor je?']);
  const g = await open('/nl/test-sample/?style=glow', { stand: 'lifestyle' });
  ok('met ?style=glow: blijft gewoon Glow', [g.soort, g.look, g.vraag], ['lifestyle', 'glow', false]);
}

console.log('\n4 · na het aanmelden, en na een weigering');
{
  const b = await open('/nl/test-sample/?wachtlijst=ok', { stand: 'dicht' });
  ok('?wachtlijst=ok: de bedankregel, het veld weg', [b.dicht, b.bedankt, b.veld], [true, true, false]);
  const r = await open('/nl/test-sample/?error=proef-dicht', { stand: 'open' });
  ok('?error=proef-dicht: het dichte blok, ook als de stand al open is', [r.dicht, r.formulier], [true, false]);
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
