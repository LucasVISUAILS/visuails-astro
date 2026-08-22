/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — WAT ER OVERBLIJFT NA EEN ZACHTE NAVIGATIE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run test:zacht        (vereist een build: npm run build)
 *
 * ── WAAROM DIT BESTAAT — 21 augustus 2026 ───────────────────────────────────
 *
 * Lucas: *"als ik wissel van taal of ik ga naar een andere pagina en ik ga terug
 * naar de homepage en ik klik op een service knop [...] ga ik naar die service
 * toe."* De kaartjes onder de hero horen dan alleen de dia te wisselen.
 *
 * DE REGEL DIE ERACHTER ZAT. Astro's ClientRouter voert een inline script bij een
 * zachte navigatie ÉÉN keer uit — de eerste keer dat hij het tegenkomt — en
 * daarna nooit meer. Dat is met opzet: een teller hoort niet twee keer af te
 * gaan. Maar een script dat gedrag aan de opmaak bindt, moet juist wél opnieuw
 * draaien, want die opmaak is bij elke navigatie vervangen. `data-astro-rerun`
 * is Astro's uitweg daarvoor, en die staat nu op de twee inline scripts in dit
 * project die gedrag binden.
 *
 * ── WAAROM DIT NIET IN DE BRON TE LEZEN IS ─────────────────────────────────
 *
 * De html was al die tijd goed: `<a href="/catalog/">` met een script dat er een
 * tab van maakt. Beide helften klopten los van elkaar. Wat er misging, ging mis
 * in de VOLGORDE waarin een router ze uitvoert, en dat is alleen in een echte
 * browser te zien — net als bij de twee fouten in tests/a11y.test.mjs.
 *
 * ── DE DERDE CONTROLE: WAT ER NIET MAG BLIJVEN STAAN ───────────────────────
 *
 * `data-astro-rerun` lost de ene helft op en maakt de andere mogelijk: een script
 * dat elke keer opnieuw draait, registreert ook elke keer opnieuw. Luisteraars op
 * `window` en `document` overleven het wisselen van de pagina, dus die stapelen
 * zich op. Vijf keer terug naar de homepage was negen resize-luisteraars, waarvan
 * acht wezen naar opmaak die er niet meer was. De derde controle hieronder telt
 * ze, en hij is de reden dat de reparatie geen nieuw lek werd.
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

/* Een bundel van gisteren draagt de code van gisteren, en dan gaat deze toets
   over een pagina die niet meer bestaat. Breken en niet overslaan — zie de
   gelijkluidende noot in tests/a11y.test.mjs. */
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

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

/* ══ 1 · DE DIENSTKAARTJES BLIJVEN TABS ═════════════════════════════════════
 *
 * Drie wegen naar de homepage, en alle drie moeten hetzelfde opleveren. De derde
 * is de weg waarop het misging: terugkomen op een pagina waar het script al eens
 * gedraaid had.
 */
console.log('\nde dienstkaartjes onder de hero blijven tabs');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  /* Klikt hij een dia aan, of navigeert hij weg? Dat laatste is de fout, en het
     is meteen de scherpste meting die er is: het pad in de adresbalk. */
  const klikGeeftDia = async () => {
    const voor = new URL(page.url()).pathname;
    await page.click('[data-hero-tab="1"]');
    await page.waitForTimeout(700);
    const na = new URL(page.url()).pathname;
    if (voor !== na) { await page.goBack(); await page.waitForTimeout(600); }
    return voor === na;
  };
  const rol = () => page.evaluate(() => {
    const t = document.querySelector('[data-hero-tab="1"]');
    return t ? t.getAttribute('role') : null;
  });

  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  ok('bij een harde laadbeurt is het kaartje een tab', await rol(), 'tab');
  ok('en een klik blijft op de homepage', await klikGeeftDia(), true);

  // Binnenkomen op een andere pagina en dan pas naar huis.
  await page.goto(`${BASE}/pricing`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.click('a[href="/"]');
  await page.waitForTimeout(1100);
  ok('ook wie via /pricing binnenkomt krijgt tabs', await rol(), 'tab');
  ok('en ook daar blijft een klik op de homepage', await klikGeeftDia(), true);

  // En de weg waarop het misging: wég van de homepage en terug.
  await page.click('a[href="/pricing/"]');
  await page.waitForTimeout(900);
  await page.click('a[href="/"]');
  await page.waitForTimeout(1100);
  ok('en na weggaan en terugkomen nog steeds', await rol(), 'tab');
  ok('dit was de melding van Lucas: klik wisselt de dia', await klikGeeftDia(), true);

  // De taalwissel is dezelfde route met een andere bestemming: de Nederlandse
  // homepage draagt exact dezelfde scripttekst, dus die gold als "al gedraaid".
  /* De taalknop draagt `hreflang`, en dat is meteen de stevigste greep: de href
     zelf is /nl zonder slash en dat soort details verschuift nog wel eens. */
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.click('a.ls[hreflang="nl"]');
  await page.waitForTimeout(1100);
  await page.click('a.ls[hreflang="en"]');
  await page.waitForTimeout(1100);
  await page.click('a.ls[hreflang="nl"]');
  await page.waitForTimeout(1100);
  ok('en na een taalwissel heen en weer ook', await rol(), 'tab');
  ok('op de Nederlandse homepage wisselt de klik de dia', await klikGeeftDia(), true);

  await page.close();
}

/* ══ 2 · HET GEKOZEN PLAN OVERLEEFT DE SPRONG VANAF /plans ══════════════════
 *
 * Dezelfde regel, met een prijskaartje eraan. De drie kaarten op /plans wijzen
 * naar /start/plan?plan=…, en het aanvinken gebeurt in een inline script. Draait
 * dat niet, dan staat Studio aangevinkt terwijl de bezoeker Merk koos — op een
 * formulier dat eindigt in een doorlopende machtiging.
 */
console.log('\nhet plan uit de URL wordt aangevinkt, ook na een sprong');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const gekozen = () => page.evaluate(() => {
    const r = document.querySelector('input[name="plan"]:checked');
    return r ? r.value : null;
  });

  await page.goto(`${BASE}/start/plan?plan=brand`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  ok('bij een harde laadbeurt staat Merk aan', await gekozen(), 'brand');

  /* Eerst /start/plan bezoeken en dan pas via /plans terugkomen: zo heeft de
     router het script één keer gezien, en dat is precies de toestand waarin hij
     het de tweede keer oversloeg. */
  await page.goto(`${BASE}/plans`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.click('a[href="/start/plan/?plan=brand"]');
  await page.waitForTimeout(1100);
  ok('en na een zachte sprong vanaf /plans ook', await gekozen(), 'brand');
  ok('op de goede pagina', new URL(page.url()).pathname, '/start/plan/');

  await page.close();
}

/* ══ 3 · DE ZWEVENDE NOTITIE BLIJFT ZWEVEN ═════════════════════════════════
 *
 * <Note> zet `js-note` op <html> en rekent daarna zelf uit waar de notitie moet
 * staan — `position: fixed`, zodat geen enkele `overflow: clip` hem kan
 * afknippen. Astro's ClientRouter haalt bij een zachte navigatie ALLE attributen
 * van <html> af en zet die van de nieuwe pagina ervoor in de plaats, klasse
 * inbegrepen. Staat die klasse er dan niet meer, dan valt de notitie terug op
 * `position: absolute` terwijl het script hem op --nt-x/--nt-y blijft zetten:
 * hij hangt dan links­boven in de band in plaats van bij de knop. Onzichtbaar
 * kapot, want op de eerste pagina van een bezoek klopt alles.
 */
console.log('\nde zwevende notitie overleeft een zachte navigatie');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const meet = async () => page.evaluate(() => {
    const b = document.querySelector('[data-note-btn]');
    if (!b) return null;
    const pop = b.nextElementSibling;
    const cs = getComputedStyle(pop);
    const r = pop.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return {
      klasse: document.documentElement.classList.contains('js-note'),
      positie: cs.position,
      zichtbaar: cs.visibility,
      binnenBeeld: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0,
      bijDeKnop: Math.abs((r.left + r.width / 2) - (rb.left + rb.width / 2)) < 400,
    };
  });

  await page.goto(`${BASE}/how-it-works`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const knop = await page.$('[data-note-btn]');
  await knop.scrollIntoViewIfNeeded();
  await knop.hover();
  await page.waitForTimeout(400);
  const vers = await meet();
  ok('bij een harde laadbeurt hangt hij aan het venster', vers && vers.positie, 'fixed');
  ok('en hij staat in beeld', vers && vers.binnenBeeld, true);
  ok('en bij de knop', vers && vers.bijDeKnop, true);

  /* Weg en terug: dat is het moment waarop <html> zijn klasse verliest. */
  await page.$eval('a[href="/pricing/"]', (e) => e.click());
  await page.waitForTimeout(1000);
  await page.$eval('a[href="/how-it-works/"]', (e) => e.click()).catch(async () => {
    await page.goto(`${BASE}/how-it-works`, { waitUntil: 'load' });
  });
  await page.waitForTimeout(1100);
  const knop2 = await page.$('[data-note-btn]');
  if (knop2) {
    await knop2.scrollIntoViewIfNeeded();
    await knop2.hover();
    await page.waitForTimeout(400);
  }
  const na = await meet();
  ok('na een zachte navigatie staat de klasse er nog', na && na.klasse, true);
  ok('en hangt hij nog steeds aan het venster', na && na.positie, 'fixed');
  ok('en nog steeds bij de knop', na && na.bijDeKnop, true);

  /* Escape sluit hem, en de focus die daarna op de knop landt mag hem niet
     meteen weer openen — dat deed hij wél, tot 21 augustus 2026. */
  await page.goto(`${BASE}/how-it-works`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.$eval('[data-note-btn]', (b) => b.focus());
  await page.waitForTimeout(300);
  ok('focus opent de notitie', await page.$eval('[data-note-btn]', (b) => b.getAttribute('aria-expanded')), 'true');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('en Escape sluit hem, ook al staat de focus er nog op',
    await page.$eval('[data-note-btn]', (b) => b.getAttribute('aria-expanded')), 'false');

  await page.close();
}

/* ══ 4 · GEEN LUISTERAARS DIE ZICH OPSTAPELEN ══════════════════════════════ */
console.log('\nde luisteraars op window en document stapelen zich niet op');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  /* Tellen bij de bron. `getEventListeners()` bestaat alleen in de devtools-console,
     dus wordt addEventListener zelf geteld — vóór er ook maar iets van de site
     draait, anders mist de telling precies de eerste ronde. */
  await ctx.addInitScript(() => {
    window.__tel = { resize: 0, vis: 0, scroll: 0 };
    const paar = (doel, naam) => {
      const add = doel.addEventListener.bind(doel);
      const rem = doel.removeEventListener.bind(doel);
      doel.addEventListener = function (t, f, o) { if (window.__tel[t] !== undefined) window.__tel[t]++; return add(t, f, o); };
      doel.removeEventListener = function (t, f, o) { if (window.__tel[t] !== undefined) window.__tel[t]--; return rem(t, f, o); };
    };
    paar(window, 'window');
    paar(document, 'document');
  });
  const page = await ctx.newPage();
  const tel = () => page.evaluate(() => ({ ...window.__tel }));

  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  const eerste = await tel();

  for (let i = 0; i < 3; i++) {
    await page.click('a[href="/pricing/"]');
    await page.waitForTimeout(800);
    await page.click('a[href="/"]');
    await page.waitForTimeout(1000);
  }
  const laatste = await tel();

  /* Gelijk en niet "ongeveer gelijk". Elke luisteraar die er na drie rondes bij
     staat, staat er na dertig dertig keer bij. */
  ok('evenveel resize-luisteraars als bij de eerste laadbeurt', laatste.resize, eerste.resize);
  ok('en evenveel scroll-luisteraars', laatste.scroll, eerste.scroll);
  ok('en precies één visibilitychange van de carrousel', laatste.vis, eerste.vis);

  await ctx.close();
}

await browser.close();
server.close();

/* ── WAT HIER NIET IN ZIT ───────────────────────────────────────────────────
 *
 * Er wordt niet gecontroleerd DAT er een zachte navigatie plaatsvindt. Dat klinkt
 * als een gat en het is er geen: zou de ClientRouter ooit verdwijnen, dan wordt
 * elke klik een harde laadbeurt en draaien de scripts sowieso — de controles
 * hierboven blijven dan groen omdat het gedrag klopt, en dat is precies wat ze
 * moeten bewaken. Een test die eist dat het zacht gaat, zou een implementatie
 * vastleggen in plaats van een belofte.
 */

console.log(`\n${geslaagd}/${geslaagd + gezakt} geslaagd`);
if (gezakt) process.exitCode = 1;
