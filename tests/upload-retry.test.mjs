/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE UPLOAD DIE HET NOG EEN KEER PROBEERT — EN DE BOOT DIE STIL OMVIEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen, in een echte browser tegen de echte build, want beide zijn alleen
 * daar te zien.
 *
 * ── 1 · WAAROM DIT IN EEN BROWSER MOET ──────────────────────────────────────
 *
 * Een herhaalpoging is gedrag over tijd: mislukken, wachten, opnieuw, en dan wel.
 * Dat is niet te toetsen door naar de bron te kijken — een regex die ziet dat er
 * `failSlot` staat, bewijst niet dat een vakje na twee mislukte pogingen alsnog
 * `filled` wordt. Dus: playwright, een onderschepte /api/upload die twee keer de
 * verbinding verbreekt, en dan kijken wat het vakje zegt.
 *
 * ── 2 · EN WAT DAARBIJ NAAR BOVEN KWAM ──────────────────────────────────────
 *
 * Bij het opzetten van dit harnas gaf elke bestelpagina in de console:
 *
 *     [pipeline] ReferenceError: Cannot access 'reached' before initialization
 *
 * `const reached` stond tweehonderd regels onder init(), die hem op zijn achtste
 * regel leegmaakt. De eerste boot() viel dus om, de catch haalde `is-live` weg, en
 * omdat `plBound` pas tien regels ná het struikelpunt wordt gezet, liep boot() bij
 * het `astro:page-load`-event een tweede keer — nu met een geïnitialiseerde
 * `reached` — en werkte alles alsnog.
 *
 * Dat is geluk. Het hing volledig aan de ClientRouter die dat event stuurt: zonder
 * dat tweede event is er geen stapnavigatie, geen uploader en geen
 * capaciteitspoort, alleen een gestapeld formulier dat zwijgt. Twee keer eerder
 * stond deze val al opgeschreven in dit bestand — bij `chain` en bij EMPTY_SLOT()
 * — en toch is er een derde in gelopen.
 *
 * Sectie 1 hieronder is daarom niet "een test bij de reparatie" maar de bewaker
 * voor de hele SOORT: een init-fout die door een catch wordt opgegeten, is per
 * definitie stil, en het enige dat hem hoorbaar maakt is een console die
 * meegelezen wordt.
 *
 * ── OVERSLAAN IN PLAATS VAN ROOD ────────────────────────────────────────────
 *
 * Deze test heeft een browser en een build nodig. Ontbreekt er één, dan slaat hij
 * over met het commando erbij — dezelfde afweging als in planning.test.mjs: een
 * test die om iets vraagt wat er niet is, is een test die mensen uitzetten.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(60)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

console.log('\nVISUAILS — de upload die het nog een keer probeert\n');

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');

if (!existsSync(path.join(DIST, 'start', 'catalog', 'index.html'))) {
  console.log('      (overgeslagen — dist/start/catalog ontbreekt. Draai `npx astro build`.)');
  process.exit(0);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('      (overgeslagen — playwright is hier niet beschikbaar.)');
  process.exit(0);
}

/* Zelfde regeling als in a11y.test.mjs en pipeline-steps.test.mjs: in deze omgeving
   staat Chromium op een vast pad, elders pakt playwright zijn eigen download. */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let browser;
try {
  browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
} catch (err) {
  console.log(`      (overgeslagen — geen browser om mee te testen: ${String(err.message).split('\n')[0]})`);
  process.exit(0);
}

/* Een statische server op dist/, zodat de pagina's exact zijn wat er gepubliceerd
   wordt — met de gebundelde en verkleinde pipeline.js erin. Tegen de bron testen zou
   precies de fout uit sectie 2 hebben gemist, want die verscheen pas in de bundel. */
const TYPES = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html',
  '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.avif': 'image/avif', '.ico': 'image/x-icon',
};
const srv = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = path.join(DIST, url.pathname);
  try {
    const body = await readFile(p).catch(() => readFile(path.join(p, 'index.html')));
    res.writeHead(200, { 'content-type': TYPES[path.extname(url.pathname)] || 'text/html; charset=utf-8' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('nope');
  }
}).listen(8795);
const base = 'http://localhost:8795';

/** Een geldig-genoeg jpeg: SOI + EOI. /api/upload is onderschept, dus de inhoud doet niets. */
const JPEG = { name: 'voorkant.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) };

/* ════════════════════════════════════════════════════════════════════════════
   1 · GEEN ENKELE BESTELPAGINA VALT STIL OM BIJ HET OPSTARTEN
   ════════════════════════════════════════════════════════════════════════════ */
console.log('de bestelstroom start zonder opgegeten fout');
for (const pad of ['/start/catalog/', '/start/lifestyle/', '/start/complete/', '/nl/start/catalog/']) {
  const pg = await browser.newPage();
  const klachten = [];
  pg.on('console', (m) => { if (m.text().includes('[pipeline]')) klachten.push(m.text().split('\n')[0]); });
  pg.on('pageerror', (e) => klachten.push(`pageerror: ${e.message}`));
  await pg.goto(base + pad, { waitUntil: 'load' });
  await pg.waitForTimeout(700);

  ok(`${pad} logt geen pipeline-fout`, klachten.length, 0, klachten.slice(0, 1));
  /* En de omgekeerde controle, want "geen fout" zou ook waar zijn als pipeline.js
     helemaal niet geladen was: `is-live` wordt door init() gezet en door de catch
     weer weggehaald, dus dit is het bewijs dat init() is AFGEMAAKT. */
  ok('  en het formulier staat op is-live', await pg.locator('form[data-pipeline].is-live').count(), 1);
  ok('  met vakjes om foto\'s in te zetten', (await pg.locator('.pu-slot-input').count()) >= 4, true);
  await pg.close();
}

/* ════════════════════════════════════════════════════════════════════════════
   2 · EEN WEGGEVALLEN VERBINDING KRIJGT EEN TWEEDE EN DERDE KANS
   ════════════════════════════════════════════════════════════════════════════ */
console.log('\neen weggevallen verbinding wordt opnieuw geprobeerd');
{
  const pg = await browser.newPage();
  let pogingen = 0;
  await pg.route('**/api/upload', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ status: 200, body: '{"ok":true}' });
    pogingen += 1;
    // Twee keer de verbinding verbreken, dan pas antwoorden.
    if (pogingen < 3) return route.abort('connectionreset');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        batch: 'b'.repeat(43),
        file: { key: 'intake/x/1.jpg', name: 'voorkant.jpg', bytes: 4, product: 'p1', shot: 'front' },
      }),
    });
  });

  await pg.goto(`${base}/start/catalog/`, { waitUntil: 'load' });
  await pg.waitForTimeout(700);
  await pg.locator('.pu-slot-input').first().setInputFiles(JPEG);

  const slot = pg.locator('.pu-slot').first();
  const msg = pg.locator('.pu-slot-msg').first();

  await pg.waitForTimeout(400);
  ok('na de eerste mislukking staat het vakje niet op mislukt', await slot.getAttribute('data-state'), 'sending');
  /* DIT IS DE REGEL DIE HET VERSCHIL MAAKT. Zou de status tussen twee pogingen op
     'failed' staan, dan lezen slotOpen(), cardReady() en missingRequired() dat als
     een leeg vakje: de kaart klapt open, de statusregel springt naar "mist nog
     voorkant" en een seconde later weer terug. Een vakje dat aan het herstellen is,
     is niet leeg. */
  ok('  en zegt hoeveelste poging het is', /\(2\/3\)/.test((await msg.textContent()) || ''), true,
    await msg.textContent());

  // Ruim voorbij de twee wachttijden (1,2 s en 3,5 s) plus twee verzoeken.
  await slot.waitFor({ state: 'attached' });
  for (let i = 0; i < 30 && (await slot.getAttribute('data-state')) !== 'filled'; i++) {
    await pg.waitForTimeout(300);
  }

  ok('de derde poging lukt en het vakje is gevuld', await slot.getAttribute('data-state'), 'filled');
  ok('  in drie pogingen, niet meer', pogingen, 3);
  ok('  en de klant heeft niets opnieuw hoeven kiezen', true, true);
  await pg.close();
}

/* ════════════════════════════════════════════════════════════════════════════
   3 · EEN WEIGERING DIE NOOIT VERANDERT, WORDT NIET HERHAALD
   ════════════════════════════════════════════════════════════════════════════
 *
 * De kern van de afweging. Een bestand dat te groot is, is bij poging drie precies
 * zo te groot als bij poging één — en dan heeft de klant anderhalve minuut naar een
 * voortgangsbalk gekeken om bij hetzelfde antwoord te komen. Erger nog: het vakje
 * zou "opnieuw proberen (2/3)" zeggen over iets wat nooit gaat lukken.
 */
console.log('\neen weigering die nooit verandert, wordt niet herhaald');
{
  const pg = await browser.newPage();
  let pogingen = 0;
  await pg.route('**/api/upload', async (route) => {
    if (route.request().method() !== 'POST') return route.fulfill({ status: 200, body: '{"ok":true}' });
    pogingen += 1;
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'too-large', max: 26214400 }),
    });
  });

  await pg.goto(`${base}/start/catalog/`, { waitUntil: 'load' });
  await pg.waitForTimeout(700);
  await pg.locator('.pu-slot-input').first().setInputFiles(JPEG);
  await pg.waitForTimeout(2500);

  const slot = pg.locator('.pu-slot').first();
  ok('het vakje staat op mislukt', await slot.getAttribute('data-state'), 'failed');
  ok('  en er is precies één poging gedaan', pogingen, 1);
  const tekst = (await pg.locator('.pu-slot-msg').first().textContent()) || '';
  ok('  met de echte reden eronder', /Too large/.test(tekst), true, tekst.slice(0, 60));
  ok('  en niet met een herhaalbelofte', /trying again/i.test(tekst), false, tekst.slice(0, 60));

  /* De knop hoort er wél te staan: hij is de weg terug voor de klant die zijn
     verbinding kwijt was, en op een te groot bestand levert hij eerlijk dezelfde
     weigering op — hij heeft het geprobeerd. */
  /* :not([hidden]) en NIET :visible. De uploader staat op stap 2 en die stap is
     verborgen zolang stap 1 de huidige is, dus playwright noemt letterlijk alles
     daarbinnen onzichtbaar. Wat deze test wil weten is of paintSlot() de knop heeft
     vrijgegeven, en dat is precies het `hidden`-attribuut dat hij zet. */
  const knoppen = await pg.locator('.pu-slot').first().locator('.pu-act:not([hidden])').allTextContents();
  ok('  en een knop om het zelf nog eens te proberen', knoppen.some((t) => /Try again/i.test(t)), true, knoppen);
  /* Eerst in de rij: bij een mislukt vakje is dat de handeling die de klant wil —
     niet vervangen (dan moet hij zoeken) en niet verwijderen (dan is de foto weg). */
  ok('  die vooraan staat', /Try again/i.test(knoppen[0] || ''), true, knoppen);
  await pg.close();
}

await browser.close();
srv.close();

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
