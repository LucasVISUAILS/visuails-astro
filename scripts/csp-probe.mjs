/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE METING ACHTER src/lib/offsite.js
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run check:csp
 *
 * Een echte Chromium, de echte CSP-header van /account en /o/<token>, en de echte
 * tussenpagina uit offsite.js. Drie vormen naast elkaar:
 *
 *   1 · POST → 303 naar een andere origin   — wat de site deed tot 9 augustus 2026
 *   2 · POST → de tussenpagina              — wat de site nu doet
 *   3 · POST → 200 zonder meta refresh      — de controle, zodat vorm 2 niet
 *                                             "werkt" doordat iets anders het doet
 *
 * WAAROM DIT EEN SCRIPT IS EN GEEN TEST. Het heeft een browser nodig en een echte
 * netwerkstack; dat hoort niet in `npm test`, dat op elke machine binnen een
 * seconde moet draaien. De regel die uit deze meting volgt staat wél in
 * tests/offsite.test.mjs, als broncontrole: nergens meer een 303 naar buiten.
 *
 * Draai dit opnieuw wanneer de CSP verandert, wanneer de tussenpagina verandert,
 * of wanneer iemand voorstelt om de 303 terug te zetten omdat "het toch werkt".
 *
 * "Elders" is hier een tweede http-server op een andere poort. Een andere poort is
 * een andere origin, en dat is precies wat form-action toetst — er is dus geen
 * internet nodig om Google na te doen.
 */
import http from 'node:http';
import { chromium } from 'playwright';
import { offsitePage } from '../src/lib/offsite.js';

/* Letterlijk de header uit html() in src/lib/account.js en src/lib/portal.js. */
const CSP = "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

const ELDERS = 4611;
const SITE = 4610;
const hits = [];

const elders = http.createServer((req, res) => {
  hits.push(`ELDERS ${req.method} ${req.url}`);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html><head><title>ELDERS</title></head><body>aangekomen</body></html>');
});
await new Promise((r) => elders.listen(ELDERS, r));

/*
 * De tussenpagina wil een https-doel (zie isOffsiteUrl), en deze proefopstelling
 * heeft alleen http. Dus wordt de pagina met een geldig doel gebouwd en daarna het
 * doel omgezet naar de lokale server. Wat we hier meten is namelijk niet de toets
 * op het doel — die staat in tests/offsite.test.mjs — maar of de BROWSER de reis
 * toestaat, en die vraag is dezelfde voor http en https.
 */
const doel = `http://localhost:${ELDERS}/`;
const tussen = offsitePage({ url: 'https://voorbeeld.example/review', name: 'Elders', lang: 'nl', css: '/account.css' })
  .replaceAll('https://voorbeeld.example/review', doel);

const site = http.createServer((req, res) => {
  hits.push(`SITE ${req.method} ${req.url}`);
  const head = { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP };
  if (req.url === '/') {
    res.writeHead(200, head);
    res.end(`<!doctype html><html><head><title>SITE</title></head><body>
      <form method="post" action="/oud" target="_blank"><button id="oud">303 naar buiten</button></form>
      <form method="post" action="/nieuw" target="_blank"><button id="nieuw">de tussenpagina</button></form>
      <form method="post" action="/kaal" target="_blank"><button id="kaal">200 zonder meta</button></form>
      </body></html>`);
    return;
  }
  if (req.url === '/oud') { res.writeHead(303, { ...head, Location: doel }); res.end(); return; }
  if (req.url === '/nieuw') { res.writeHead(200, head); res.end(tussen); return; }
  if (req.url === '/kaal') { res.writeHead(200, head); res.end('<!doctype html><html><head><title>KAAL</title></head><body>kaal</body></html>'); return; }
  res.writeHead(404, head); res.end('niet gevonden');
});
await new Promise((r) => site.listen(SITE, r));

/* De container heeft de browser uit playwright op een vast pad; buiten de
   container vindt playwright hem zelf. Vandaar de env-variabele met een terugval. */
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath }).catch(() => chromium.launch());
const ctx = await browser.newContext();
const pg = await ctx.newPage();
const fouten = [];
ctx.on('page', (p) => p.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); }));
pg.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
await pg.goto(`http://localhost:${SITE}/`);

const uitkomsten = [];
for (const [sel, naam, verwacht] of [
  ['#oud', '303 naar een andere origin', 'geblokkeerd'],
  ['#nieuw', 'de tussenpagina uit offsite.js', 'aangekomen'],
  ['#kaal', '200 zonder meta refresh (controle)', 'blijft staan'],
]) {
  hits.length = 0; fouten.length = 0;
  let tab = null;
  const klik = pg.click(sel);
  try { tab = await pg.waitForEvent('popup', { timeout: 4000 }); } catch { /* geen tabblad = geblokkeerd vóór het openen */ }
  await klik;
  await new Promise((r) => setTimeout(r, 1500));

  const url = tab ? tab.url() : pg.url();
  const aangekomen = url.startsWith(`http://localhost:${ELDERS}`);
  const gepost = hits.some((h) => h.startsWith('SITE POST'));
  const gemeten = aangekomen ? 'aangekomen' : (fouten.length ? 'geblokkeerd' : 'blijft staan');

  console.log(`\n── ${naam}`);
  console.log(`   url          : ${url}`);
  console.log(`   titel        : ${tab ? await tab.title().catch(() => '?') : '(geen nieuw tabblad)'}`);
  console.log(`   post aangekomen bij de server: ${gepost ? 'JA' : 'nee'}`);
  console.log(`   serverhits   : ${hits.join(' , ') || '(geen)'}`);
  console.log(`   console      : ${fouten.join(' | ') || '(niets)'}`);
  console.log(`   uitkomst     : ${gemeten}${gemeten === verwacht ? '' : `   ← VERWACHT ${verwacht}`}`);
  uitkomsten.push([naam, gemeten, verwacht]);
  if (tab) await tab.close();
}

await browser.close(); elders.close(); site.close();

const mis = uitkomsten.filter(([, g, v]) => g !== v);
console.log(`\n${uitkomsten.length - mis.length}/${uitkomsten.length} zoals verwacht`);
if (mis.length) {
  console.log('\nAfwijkend. Als vorm 1 nu "aangekomen" zegt, dan heeft deze browser form-action');
  console.log('niet meer op redirects toegepast — dat is geen reden om de tussenpagina weg te');
  console.log('halen, want de klant kan een andere browser gebruiken. Als vorm 2 iets anders');
  console.log('zegt dan "aangekomen", dan is de tussenpagina stuk en zijn de reviewknoppen en');
  console.log('de betaalknop het ook.');
  process.exit(1);
}
