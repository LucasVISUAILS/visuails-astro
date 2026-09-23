/* ═══════════════════════════════════════════════════════════════════════════════
 * DE VOORPAGINA IN DE TAAL VAN DE BEZOEKER, EN DE KEUZE BLIJFT — 23 sep 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"visuails.com landt op Engels, ook voor een Nederlander"* en *"ik wil
 * dat de website onthoudt wanneer de klant de pagina in het Nederlands heeft
 * gezet zodat hij wanneer hij terugkomt weer Nederlands is"*.
 *
 * De regels, in de volgorde waarin het script in Layout.astro ze toepast:
 *
 *   1  Alleen op `/`. Een Engelse dienstpagina blijft Engels, ook voor een
 *      Nederlandse browser: wie een Engelse link deelt, bedoelt die pagina.
 *   2  Kom je van een andere pagina van de site, dan gebeurt er niets. Je hebt
 *      `/` dan zelf gekozen, met de taalknop of met het logo.
 *   3  De cookie `vis_lang` wint van de browser.
 *   4  Zonder cookie: staat Nederlands in de browser vóór Engels, dan /nl/.
 *      Een derde taal (Duits) telt niet mee en geeft Engels.
 *   5  Een klik op de taalknop zet `vis_lang` voor een jaar, Path=/.
 *
 * Gemeten in een echte browser op dist/, want het is een inline script en een
 * regexp op de bron zegt niets over wat de browser ermee doet.
 */
import { existsSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};
const server = createServer((req, res) => {
  const pad = decodeURIComponent(String(req.url).split('?')[0]);
  let f = join(DIST, pad);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end('niet hier'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const HOST = new URL(BASE).hostname;

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

/* Eén verse context per geval: een cookie uit het vorige geval mag het volgende
   niet beïnvloeden. De afbeeldingen worden geblokkeerd, want die zeggen hier
   niets en maken de toets alleen trager. */
async function bezoek({ locale, cookie, pad = '/', referer }) {
  const ctx = await browser.newContext({ locale, viewport: { width: 1440, height: 900 } });
  await ctx.route(/\.(webp|avif|png|jpg|mp4|woff2)$/, (r) => r.abort());
  if (cookie) await ctx.addCookies([{ name: 'vis_lang', value: cookie, domain: HOST, path: '/' }]);
  const page = await ctx.newPage();
  await page.goto(BASE + pad, { waitUntil: 'domcontentloaded', referer });
  await page.waitForTimeout(250);
  const waar = new URL(page.url()).pathname;
  return { ctx, page, waar };
}

console.log('\n1 · de voorpagina volgt de browser');
for (const [locale, verwacht] of [['nl-NL', '/nl/'], ['nl-BE', '/nl/'], ['en-US', '/'], ['de-DE', '/']]) {
  const { ctx, waar } = await bezoek({ locale });
  ok(`${locale} op / komt op ${verwacht}`, waar, verwacht);
  await ctx.close();
}

console.log('\n2 · alleen op de voorpagina');
{
  const { ctx, waar } = await bezoek({ locale: 'nl-NL', pad: '/catalog/' });
  ok('een Nederlandse browser op /catalog/ blijft daar', waar, '/catalog/');
  await ctx.close();
}

console.log('\n3 · de cookie wint van de browser');
{
  let r = await bezoek({ locale: 'nl-NL', cookie: 'en' });
  ok('nl-browser met vis_lang=en blijft op /', r.waar, '/');
  await r.ctx.close();
  r = await bezoek({ locale: 'en-US', cookie: 'nl' });
  ok('en-browser met vis_lang=nl gaat naar /nl/', r.waar, '/nl/');
  await r.ctx.close();
}

console.log('\n4 · van binnen de site gekozen: niets doen');
{
  const { ctx, waar } = await bezoek({ locale: 'nl-NL', referer: `${BASE}/catalog/` });
  ok('nl-browser die van /catalog/ naar / klikt, blijft op /', waar, '/');
  await ctx.close();
}

/* En via het logo, met een zachte navigatie: dan blijft document.referrer die
   van de eerste landing staan (leeg hier), dus moet het script zelf weten dat
   dit niet de eerste pagina van het tabblad is. */
{
  const { ctx, page, waar } = await bezoek({ locale: 'nl-NL', pad: '/catalog/' });
  ok('nl-browser landt op /catalog/', waar, '/catalog/');
  const logo = await page.evaluate(() => {
    const a = document.querySelector('.site-header a[href="/"]');
    if (!a) return false;
    a.click();
    return true;
  });
  ok('er is een logo-link naar /', logo, true);
  await page.waitForURL((u) => new URL(u).pathname !== '/catalog/', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  ok('en het logo houdt hem op de Engelse voorpagina', new URL(page.url()).pathname, '/');
  await ctx.close();
}

console.log('\n5 · de taalknop onthoudt de keuze');
{
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
  await ctx.route(/\.(webp|avif|png|jpg|mp4|woff2)$/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/catalog/`, { waitUntil: 'domcontentloaded' });
  const geklikt = await page.evaluate(() => {
    const a = document.querySelector('.site-header .lang-switch a[hreflang="nl"]');
    if (!a) return false;
    a.click();
    return true;
  });
  ok('er is een NL-knop in de kop', geklikt, true);
  await page.waitForURL(/\/nl\/catalog\/$/, { timeout: 5000 }).catch(() => {});
  const koek = (await ctx.cookies()).find((c) => c.name === 'vis_lang');
  ok('de klik zet vis_lang=nl', koek?.value, 'nl');
  ok('op het hele domein (Path=/)', koek?.path, '/');
  const dagen = koek ? Math.round((koek.expires - Date.now() / 1000) / 86400) : 0;
  ok('voor een jaar', dagen >= 364 && dagen <= 366, true);

  /* En dan de eigenlijke belofte: terugkomen. Een nieuw tabblad, zonder
     verwijzer, typt visuails.com in — met een ENGELSE browser. */
  const terug = await ctx.newPage();
  await terug.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await terug.waitForTimeout(250);
  ok('wie NL koos en terugkomt, landt op /nl/', new URL(terug.url()).pathname, '/nl/');

  /* En de weg terug: EN kiezen op /nl/ moet ook blijven. */
  await terug.evaluate(() => document.querySelector('.site-header .lang-switch a[hreflang="en"]')?.click());
  await terug.waitForURL((u) => new URL(u).pathname === '/', { timeout: 5000 }).catch(() => {});
  await terug.waitForTimeout(250);
  ok('EN kiezen op /nl/ brengt je naar / en houdt je daar', new URL(terug.url()).pathname, '/');
  const koek2 = (await ctx.cookies()).find((c) => c.name === 'vis_lang');
  ok('en de cookie zegt nu en', koek2?.value, 'en');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exit(1);
