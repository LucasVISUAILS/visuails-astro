/* VISUAILS — staat het bedrag er vóór de klik?
 *   npm run test:combi      (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 13 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas, over een bezoeker: *"De upsell van add lifestyle to this order bij
 * bijvoorbeeld catalog is ook heel onlogisch (…) hij gaf aan erop geklikt te
 * hebben en uit het niets opeens meer moest betalen zonder te weten waar en wat
 * hij voor betaalde."*
 *
 * Wat er stond was een bedrag PER PRODUCT. Het enige getal dat de bezoeker op
 * dat moment in zijn hoofd had, was zijn TOTAAL — twee centimeter hoger op het
 * scherm. Om te weten wat er ging gebeuren moest hij zelf vermenigvuldigen.
 *
 * Deze toets bewaakt de drie dingen die dat moeten voorkomen, en alle drie
 * gelden ze VÓÓR de klik. De eerste is de belangrijkste en is ook de enige die
 * je niet statisch kunt controleren: het bedrag wordt door pipeline.js
 * berekend, dus de toets vult een aantal in en kijkt wat er komt te staan.
 */
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

let pass = 0, fail = 0;
const ok = (naam, waar, verwacht = true, kreeg = '') => {
  if (waar) { pass += 1; console.log(` ok   ${naam}`); }
  else { fail += 1; console.log(`FAIL   ${naam}`.padEnd(62) + `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`); }
};

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const schoon = decodeURIComponent(u.pathname).split('/').filter((p) => p && p !== '..');
    let bestand = join(DIST, ...schoon);
    let info = await stat(bestand).catch(() => null);
    if (info?.isDirectory()) { bestand = join(bestand, 'index.html'); info = await stat(bestand).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404); res.end('x'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(bestand).toLowerCase()] || 'application/octet-stream' });
    createReadStream(bestand).pipe(res);
  } catch { res.writeHead(500); res.end('x'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const page = await browser.newPage({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

console.log('de combinatie noemt het bedrag vóór de klik');
{
  await page.goto(`http://127.0.0.1:${PORT}/nl/start/catalog/`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const leeg = await page.evaluate(() => ({
    nu: document.querySelector('[data-pl-combi-nu]')?.textContent || '',
    blok: document.querySelector('[data-pl-combi]')?.className || '',
  }));
  ok('zonder aantal staat er geen bedrag', leeg.nu.trim() === '', true, leeg.nu);
  ok('  en het blok draagt de klasse niet, dus de regel is verborgen',
    !/heeft-bedrag/.test(leeg.blok), true, leeg.blok);

  /* Zes producten: een aantal dat op de tweede trede van de ladder valt, dus
     het toetst meteen dat er met de LADDER gerekend wordt en niet met het
     basistarief. */
  await page.fill('#pl-qty-n', '6');
  await page.waitForTimeout(500);

  const gevuld = await page.evaluate(() => ({
    nu: (document.querySelector('[data-pl-combi-nu]')?.textContent || '').trim(),
    straks: (document.querySelector('[data-pl-combi-straks]')?.textContent || '').trim(),
    totaal: (document.querySelector('[data-pl-total]')?.textContent || '').trim(),
    blok: document.querySelector('[data-pl-combi]')?.className || '',
  }));
  const cijfers = (s) => Number(String(s).replace(/[^\d]/g, ''));

  ok('met een aantal staat er een bedrag nu', cijfers(gevuld.nu) > 0, true, gevuld.nu);
  ok('  en een bedrag straks', cijfers(gevuld.straks) > 0, true, gevuld.straks);
  ok('  en de regel is zichtbaar', /heeft-bedrag/.test(gevuld.blok), true, gevuld.blok);

  /* HET BEDRAG NU IS HETZELFDE GETAL ALS HET TOTAAL ERBOVEN. Dit is de regel
     die de hele herbouw draagt: als deze twee uit elkaar lopen, staat er een
     tweede waarheid op hetzelfde scherm en is de vergelijking waardeloos. */
  ok('  en "nu" is exact het totaal dat erboven staat',
    cijfers(gevuld.nu) === cijfers(gevuld.totaal), gevuld.totaal, gevuld.nu);

  /* En de combinatie is DUURDER. Niet omdat duurder goed is, maar omdat een
     upsell die goedkoper uitvalt betekent dat de ladders verwisseld zijn. */
  ok('  en de combinatie is hoger dan alleen catalog',
    cijfers(gevuld.straks) > cijfers(gevuld.nu), true, `${gevuld.nu} → ${gevuld.straks}`);

  const rest = await page.evaluate(() => ({
    beelden: document.querySelectorAll('.ck-tegels img').length,
    sprong: (document.querySelector('.ck-sprong')?.textContent || '').trim(),
    knop: document.querySelector('[data-ck-doel]')?.getAttribute('data-ck-doel') || '',
  }));
  ok('er staan beelden bij van wat erbij komt', rest.beelden === 3, 3, rest.beelden);
  ok('en er staat dat je naar een ander formulier gaat',
    /formulier/i.test(rest.sprong), true, rest.sprong.slice(0, 50));
  ok('en de knop wijst naar het gecombineerde formulier',
    /\/start\/complete\/?$/.test(rest.knop), true, rest.knop);

  /* ── DE STIJL GAAT MEE ────────────────────────────────────────────────────
     De regel belooft dat je catalogstijl meegaat. Een belofte in een zin die
     de link niet waarmaakt, is erger dan geen belofte. */
  /* Het klik-event afvuren ZONDER te navigeren. `page.click()` volgt de link
     echt, en dan lees je de href van het VOLGENDE formulier — dat wees bij het
     schrijven hiervan keurig terug naar /start/catalog, en de toets faalde op
     precies het goede gedrag. */
  const href = await page.evaluate(() => {
    const a = document.querySelector('[data-ck-doel]');
    a.addEventListener('click', (e) => e.preventDefault(), { once: true, capture: false });
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return a.getAttribute('href') || '';
  });
  ok('en na het klikken draagt de link het aantal', /producten=6/.test(href), true, href);
  ok('  en de catalogstijl', /style=[a-z-]+/.test(href), true, href);
}

await browser.close();
server.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
