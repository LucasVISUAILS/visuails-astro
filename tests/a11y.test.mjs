/* VISUAILS — de toegankelijkheidsregels die alleen in een echte browser te meten zijn.
 *
 *   npm run test:a11y        (vereist een build: npm run build)
 *
 * ── WAAROM DIT EEN BROWSER NODIG HEEFT ──────────────────────────────────────
 *
 * De andere tests in dit project lezen de bron. Dat kan hier niet: de twee fouten die
 * op 9 augustus 2026 gevonden werden, waren onzichtbaar in de bron en alleen te zien
 * in het gedrag.
 *
 *   1 · DE MOBIELE LADE LIET DE FOCUS ONTSNAPPEN. Op 390px: open de lade, tab
 *       vijftien keer, en de zestiende tab zette de focus op de "Start an order"-knop
 *       van de homepage — volledig achter een ondoorzichtige lade. De bron zag er
 *       goed uit: `inert` op de gesloten lade was correct gebouwd. Wat ontbrak was
 *       het omgekeerde, en dat is niet te lezen, alleen te tabben.
 *
 *   2 · ESCAPE SLOOT HET DIENSTENMENU NIET. `aria-expanded` ging naar false en
 *       `getComputedStyle(.nav-menu)` gaf nog `opacity: 1`. Twee bronbestanden die
 *       ieder afzonderlijk klopten (de CSS met `:focus-within`, de JS met de klasse)
 *       en samen iets deden wat geen van de twee beweerde.
 *
 * ── EN DEZE TEST HEEFT MIJN EIGEN REPARATIES TWEE KEER AFGEKEURD ────────────
 *
 * Beide fixes waren in eerste instantie fout, en beide keren wees de meting het aan:
 *
 *   · Bij de lade sloeg ik de header over zodat de menuknop bereikbaar bleef. Meting:
 *     op tabstop 16 stond de focus op de LOGO-LINK, die in diezelfde header zit.
 *     `inert` is niet per element terug te draaien; één overgeslagen voorouder maakt
 *     al zijn kinderen bereikbaar.
 *   · Bij het menu zette ik de focus terug op de knop. Meting: het paneel bleef staan,
 *     want die knop zit ZELF in `.has-menu` en houdt `:focus-within` waar. Ik had de
 *     focus verplaatst binnen precies het element waar hij weg moest.
 *
 * Zonder een meting waren beide reparaties "gedaan" geweest.
 */

import { existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${ok ? '' : `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`}`);
};

/* Bestaan is niet hetzelfde als kloppen — zie de noot bij dezelfde reparatie in
   tests/upload-retry.test.mjs. Een bundel van twee dagen oud draagt de code van
   twee dagen geleden, en dan gaat deze toets over een pagina die niet meer bestaat.
   Hier BREEKT hij af in plaats van over te slaan, want een toegankelijkheidstoets
   die stilletjes niets doet, is een toets waarvan je denkt dat hij groen was. */
const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}

/* Chromium staat in deze omgeving op een vast pad; op een andere machine pakt
   playwright zijn eigen download. Beide gevallen werken zonder aanpassing. */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launch = () => chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * EEN EIGEN SERVERTJE, EN GEEN `astro preview` IN EEN SUBPROCES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Hier stond `spawn('npx', ['astro', 'preview', ...])`. Op Lucas' Windows-pc:
 *
 *   Error: spawn npx ENOENT
 *
 * Op Windows bestaat er geen bestand `npx` — het is `npx.cmd`, en `spawn` zoekt
 * zonder `shell: true` naar een exact uitvoerbaar bestand. Tweede keer vandaag dat
 * ik iets schreef dat alleen op mijn Linux-machine werkte.
 *
 * `shell: true` erbij zetten zou het repareren en twee andere problemen laten staan,
 * dus is het hele subproces eruit. Wat deze test nodig heeft is een map met
 * bestanden op een poort — geen bundler, geen CLI, geen watcher:
 *
 *   · GEEN PLATFORMVERSCHIL. node:http werkt overal hetzelfde, en het pad met
 *     spaties en haakjes gaat nooit door een shell die erover kan struikelen.
 *   · GEEN BLINDE WACHTTIJD. Er stond `setTimeout(4000)` en dat is een gok: op een
 *     trage machine is de server nog niet op en op een snelle wacht je voor niets.
 *     `listen()` zegt zelf wanneer hij klaar is.
 *   · GEEN VASTE POORT. Poort 0 laat het besturingssysteem een vrije poort kiezen,
 *     dus kan deze test nooit meer omvallen omdat 4599 al bezet was.
 *
 * Het serveert alleen GET uit dist/ en kent net genoeg mime-types voor deze site.
 * Meer heeft het niet nodig; Cloudflare Pages doet in productie hetzelfde.
 */
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    // Alleen het pad, en `..` eruit: dit is een testserver, maar een testserver die
    // buiten zijn map kan lezen is nog steeds een testserver met een gat.
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    // Een map betekent index.html — dezelfde afspraak als `format: 'directory'`.
    if (info?.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file).catch(() => null);
    }
    if (!info?.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500); res.end('error');
  }
});

const PORT = await new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const BASE = `http://127.0.0.1:${PORT}`;
const stop = () => { try { server.close(); } catch { /* al dicht */ } };
process.on('exit', stop);

/*
 * ── WACHTEN OP DE EINDSTAND, NIET OP DE KLOK ────────────────────────────────
 *
 * 10 augustus 2026, en dit heeft me drie pogingen gekost omdat ik elke keer het
 * symptoom wegnam in plaats van de oorzaak:
 *
 *   1 · Eerst stond er `waitForTimeout(250)`, en de meting viel om met
 *       `expected "1" got "0.999997"` — de overgang was nog aan het uitlopen. Ik
 *       verhoogde de wachttijd naar 900ms. Daarmee werd de race minder waarschijnlijk
 *       en op Lucas' tragere machine was hij er weer.
 *   2 · Toen wachtte ik op een opacity van ongeveer 1, met een marge van 0,005. Dat
 *       loste het openen op en legde bloot dat de test soms klikte voordat het script
 *       geladen was: `.has-menu:hover` opent het paneel in CSS, dus het ZAG open uit
 *       terwijl Escape nog geen handler had. Zie openMenu() hieronder.
 *   3 · En daarna viel het sluiten om op `0.00248979`: mijn helper wachtte met een
 *       marge en mijn assertie eiste letterlijk de string "0". De twee spraken elkaar
 *       tegen — de helper zei "klaar", de controle zei "niet klaar".
 *
 * De les die ik er drie keer niet uit trok: vraag niet naar een tussenwaarde van een
 * animatie. Vraag naar de EINDSTAND, en gebruik in de controle exact hetzelfde
 * criterium als in het wachten.
 *
 * `visibility` is die eindstand. Die overgangt mee met de opacity en klapt pas aan
 * het einde om, dus `visibility: hidden` betekent "de overgang is af én hij is weg" —
 * één signaal in plaats van een getal met een marge eromheen.
 */
const PANEL_VISIBLE = () => {
  const el = document.querySelector('.nav-menu');
  if (!el) return false;
  const s = getComputedStyle(el);
  return s.visibility === 'visible' && Number(s.opacity) > 0.99;
};
const PANEL_HIDDEN = () => {
  const el = document.querySelector('.nav-menu');
  if (!el) return false;
  const s = getComputedStyle(el);
  return s.visibility === 'hidden' || Number(s.opacity) < 0.01;
};
const settles = (page, fn) => page.waitForFunction(fn, undefined, { timeout: 5000 })
  .then(() => true).catch(() => false);

/*
 * ── EN WACHTEN TOT HET SCRIPT ER IS, NIET ALLEEN TOT DE PAGINA ER IS ────────
 *
 * `goto` met `waitUntil: 'load'` betekent dat de bestanden binnen zijn, niet dat de
 * module-scripts al gedraaid hebben. Klikte de test net te vroeg op het menu, dan
 * ging het paneel tóch open — want `.has-menu:hover` opent hem in CSS en de muis
 * staat na een klik op de knop — en deed Escape niets, want die handler bestond nog
 * niet. "Het menu gaat open" was dan groen om de verkeerde reden.
 *
 * `menu-open` is de klasse die ALLEEN het script zet. Erop wachten na de klik is
 * daarmee het bewijs dat de handler er is, en het maakt deze controle een uitspraak
 * over het script in plaats van over de CSS.
 */
const openMenu = async (page) => {
  await page.waitForFunction(() => document.readyState === 'complete');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.click('.nav-trigger');
    try {
      await page.waitForFunction(
        () => document.querySelector('.has-menu')?.classList.contains('menu-open'),
        undefined, { timeout: 1500 },
      );
      return true;
    } catch {
      await page.waitForTimeout(300);
    }
  }
  return false;
};

const browser = await launch();

/* ══ 1 · DE MOBIELE LADE HOUDT DE FOCUS VAST ════════════════════════════════ */
console.log('\nde mobiele lade laat de focus niet ontsnappen');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  // De vaste balken weg: die staan bovenop en hebben hun eigen tabstops, wat de
  // meting vertroebelt zonder iets over de lade te zeggen.
  await page.evaluate(() => document.querySelectorAll('.convbar,#cookie-bar,.cb').forEach((e) => e.remove()));
  await page.click('.menu-toggle');
  await page.waitForTimeout(300);

  const escapes = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const w = await page.evaluate(() => {
      const a = document.activeElement;
      const nav = document.querySelector('.mobile-nav');
      return {
        inNav: nav ? nav.contains(a) : false,
        // activeElement === body betekent dat de focus in de BROWSERBALK staat. Dat
        // is geen ontsnapping naar verborgen inhoud maar het normale einde van de
        // tabreeks, en het meetellen zou deze test onbruikbaar maken.
        isBody: a === document.body,
        tag: a?.tagName,
        text: (a?.textContent || '').trim().slice(0, 24),
      };
    });
    if (!w.inNav && !w.isBody) escapes.push(`${w.tag} "${w.text}"`);
  }
  check('geen focus buiten de lade', [...new Set(escapes)], []);

  const siblings = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-nav');
    return [...nav.parentElement.children].filter((c) => c !== nav && c.hasAttribute('inert')).length;
  });
  check('de pagina eronder staat op inert', siblings > 0, true);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-nav');
    return {
      onToggle: document.activeElement?.classList.contains('menu-toggle') || false,
      stillInert: [...nav.parentElement.children].filter((c) => c !== nav && c.hasAttribute('inert')).length,
      navInert: nav.hasAttribute('inert'),
    };
  });
  check('Escape zet de focus op de knop', after.onToggle, true);
  check('en geeft de pagina terug', after.stillInert, 0);
  check('en de lade zelf gaat op inert', after.navInert, true);
  await page.close();
}

/* ══ 2 · ESCAPE SLUIT HET DIENSTENMENU ══════════════════════════════════════ */
console.log('\nEscape sluit het dienstenmenu, ook visueel');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const opened = await openMenu(page) && await settles(page, PANEL_VISIBLE);
  check('het menu gaat open, en het script heeft hem geopend', opened, true);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  /* Dezelfde eindstand als het wachten hierboven, en met exact hetzelfde criterium:
     `settles` gebruikt PANEL_HIDDEN, en de controle eronder leest de uitkomst dáárvan.
     Twee formuleringen van "is hij weg" is precies hoe deze test drie keer op zichzelf
     struikelde. */
  const hidden = await settles(page, PANEL_HIDDEN);
  const closed = await page.evaluate(() => ({
    expanded: document.querySelector('.nav-trigger')?.getAttribute('aria-expanded'),
    onTrigger: document.activeElement?.classList.contains('nav-trigger') || false,
  }));
  check('het paneel is niet meer zichtbaar', hidden, true);
  check('aria-expanded zegt hetzelfde', closed.expanded, 'false');
  check('en de focus staat op de knop', closed.onTrigger, true);

  /* En daarna moet hij gewoon weer open. Zonder het opruimen van de klasse zou
     Escape het menu voor de rest van het bezoek onbruikbaar maken met de muis —
     erger dan de fout die het oploste. */
  const reopened = await openMenu(page) && await settles(page, PANEL_VISIBLE);
  check('daarna gaat hij weer normaal open', reopened, true);
  await page.close();
}

/* ══ 3 · GEEN KOPNIVEAU OVERGESLAGEN ════════════════════════════════════════
 * Vijf sjablonen sprongen van h1 naar h4 of van h2 naar h4. De reparatie was het
 * NIVEAU verhogen zonder de MAAT te veranderen (.as-h3 en .as-card-h in global.css),
 * dus hoort hier zowel de structuur als de maat gecontroleerd te worden.
 */
console.log('\ngeen pagina slaat een kopniveau over');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const paths = ['/', '/thank-you/', '/upload-guidelines/', '/lifestyle/', '/compare/', '/demo/',
                 '/pricing/', '/studio/', '/portal/', '/faq/', '/about/', '/ai-act/',
                 '/nl/', '/nl/upload-guidelines/', '/nl/lifestyle/', '/nl/compare/', '/nl/demo/'];
  const skips = [];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    const found = await page.evaluate(() => {
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
      const out = [];
      for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) out.push(`h${hs[i - 1]}→h${hs[i]}`);
      return out;
    });
    if (found.length) skips.push(`${path}: ${found.join(', ')}`);
  }
  check('geen sprong op 17 pagina\'s', skips, []);

  // En de maat is niet veranderd. Gemeten vóór de tagwijziging: 17px, gewicht 700,
  // regelhoogte 27,54px, marge 22,608px. Wijkt dit af, dan is de reparatie een
  // ontwerpwijziging geworden en dat was hij niet.
  await page.goto(`${BASE}/compare/`, { waitUntil: 'load' });
  const card = await page.evaluate(() => {
    const el = document.querySelector('.card .as-card-h');
    if (!el) return null;
    const c = getComputedStyle(el);
    return { tag: el.tagName, size: c.fontSize, weight: c.fontWeight, lh: c.lineHeight, margin: c.margin };
  });
  check('de kaartkop ziet er hetzelfde uit als vóór de wijziging',
    card, { tag: 'H3', size: '17px', weight: '700', lh: '27.54px', margin: '22.608px 0px' });
  await page.close();
}

/* ══ 4 · GEEN NAAMLOZE SVG ══════════════════════════════════════════════════
 * 572 svg-tags zonder `aria-hidden` en zonder naam, over 87 pagina's. Alle 123 in de
 * bron bleken decoratief — geteld, en gecontroleerd dat er geen enkele de ENIGE inhoud
 * van een link of knop was, want zo'n icoon heeft juist wél een naam nodig.
 */
console.log('\nelke svg is of decoratief gemarkeerd of heeft een naam');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const bad = [];
  for (const path of ['/', '/pricing/', '/catalog/', '/compare/', '/faq/', '/test-sample/', '/studio/', '/nl/', '/nl/pricing/']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
    const n = await page.evaluate(() => [...document.querySelectorAll('svg')].filter((s) => {
      if (s.hasAttribute('aria-hidden')) return false;
      if (s.hasAttribute('aria-label') || s.getAttribute('role') === 'img') return false;
      return !s.querySelector('title');
    }).length);
    if (n) bad.push(`${path}: ${n}`);
  }
  check('geen naamloze svg', bad, []);

  // En het omgekeerde: een icoon dat de enige inhoud van een knop of link is, MOET
  // een naam hebben. Deze controle is er zodat "alles aria-hidden" nooit het antwoord
  // wordt op een echte icoonknop.
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const nameless = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter((el) => {
    if (!el.querySelector('svg')) return false;
    if (el.textContent.trim()) return false;
    if (el.getAttribute('aria-label') || el.getAttribute('title') || el.querySelector('.sr-only')) return false;
    /*
     * EN EEN SVG DIE ZELF EEN NAAM HEEFT, GEEFT DIE NAAM DOOR.
     *
     * De eerste versie van deze controle keek alleen naar het label op de LINK, en
     * wees daarom de merklink in de voettekst aan als naamloos. Die link bevat
     * `<svg role="img" aria-label="VISUAILS">`, en de naam van een link wordt
     * berekend uit zijn inhoud — dus heeft hij wél een naam. Mijn test had een fout,
     * niet de opmaak, en dat is precies het soort valse melding waardoor iemand
     * uiteindelijk een goede regel weghaalt om de test groen te krijgen.
     */
    const named = [...el.querySelectorAll('svg')].some((s) => (
      (s.getAttribute('role') === 'img' && s.getAttribute('aria-label')) || s.querySelector('title')
    ));
    return !named;
  }).map((el) => el.outerHTML.slice(0, 60)));
  check('een icoonknop zonder tekst heeft een naam', nameless, []);
  await page.close();
}

/* ══ 5 · color-scheme ═══════════════════════════════════════════════════════ */
console.log('\nde browser weet dat de site donker is');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  check('color-scheme staat op dark, ook bij een lichte systeemvoorkeur', scheme, 'dark');
  await page.close();
}

await browser.close();
stop();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
