/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE DIENSTENRIJ SCROLLT ZIJWAARTS EN NOOIT OMHOOG  ·  npm run test:homerail
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, met een schermafdruk van zijn telefoon, 24 augustus 2026:
 *
 *   "Fix ook even dat je op telefoon de services omhoog en omlaag kan scrollen,
 *    verwijder dit want het maakt het scrollen wat onprettig en heeft geen
 *    meerwaarde."
 *
 * Nagemeten voordat er iets veranderde: `.hv-svc-rail` was 29 pixels verticaal
 * scrollbaar op 390 breed (556 zichtbaar, 585 inhoud), 29 op 768, en 7 op 1440.
 * Van de vier rijen op de homepage was dit de enige. Op een telefoon is dat vak
 * ruim tweederde van het scherm hoog, dus elke veegbeweging omhoog ging eerst
 * 29 pixels de rij in voordat de PAGINA bewoog. Dat is precies het gevoel dat
 * hij beschrijft.
 *
 * ── WAAROM DIT EEN TOETS IS EN GEEN REGEL CSS ──────────────────────────────
 *
 * Omdat de oorzaak drie stappen verderop lag dan de klacht, en elke stap op
 * zichzelf in orde was:
 *
 *   1 · `overflow-x: auto` op de rij maakt van `overflow-y` óók `auto`. Dat is
 *       geen fout maar de CSS-regel: zodra één as niet `visible` is, kan de
 *       andere dat niet blijven. Onzichtbaar, zolang er niets uitsteekt.
 *   2 · Er stak wél iets uit: de zwevende notitie bij Hooks en Editions. Die
 *       staat op `position: fixed`, en Note.astro zet hem daar met zoveel
 *       woorden neer *"zodat geen enkele overflow: clip hem kan afknippen"*.
 *   3 · Maar `fixed` hangt aan het VENSTER behalve wanneer een voorouder een
 *       transform heeft. `hv-float` — het zweefeffect dat Lucas zelf vroeg —
 *       zet precies zo'n transform op de rij. De notitie werd dus alsnog een
 *       kind van de rij, stak er 29px onderuit, en die 29px werden scrollhoogte.
 *
 * Drie correcte regels die samen een fout maken. Zoiets komt niet terug omdat
 * iemand de CSS beter leest; het komt terug zodra iemand ergens een animatie
 * toevoegt. Vandaar een meting en geen noot.
 *
 * ── EN DE TWEEDE FOUT, DIE ERONDER LAG ─────────────────────────────────────
 *
 * Dezelfde transform legde de notitie ook op de verkeerde plek. `plaats()` in
 * Note.astro rekent in venstercoördinaten en klemt hem netjes binnen de rand —
 * maar mat in de verkeerde ruimte. Gemeten: op 390 lag hij 19px te ver naar
 * rechts en 11px te laag, op 1440 zelfs 58px te ver, waardoor hij 43 pixels
 * BUITEN het venster hing. De klem deed zijn werk en klemde tegen de verkeerde
 * rand.
 *
 * EN DAT GOLD NIET ALLEEN HIER. Bij het schrijven van deel 3 hieronder bleek de
 * aanname "de homepage is de enige plek met een getransformeerde voorouder" niet
 * te kloppen: `.reveal` — de onthulanimatie die op vrijwel elk blok van deze site
 * staat — laat óók in rust een `transform: matrix(1, 0, 0, 1, 0, 0)` achter. Een
 * eenheidsmatrix verschuift niets, maar maakt wél een bevattend blok. Gemeten op
 * /pricing: 59 pixels te ver naar rechts, 312 te laag.
 *
 * Élke notitie op de site stond dus naast zijn plek. Dat het nergens opviel, komt
 * doordat ze meestal breed genoeg klemmen om alsnog ergens redelijks uit te
 * komen — tot de dienstenrij, waar het 43 pixels buiten het venster werd en dus
 * zichtbaar. De klacht ging over scrollen; wat eronder lag was groter.
 *
 * De toets hieronder opent de notities dus echt, en op twee pagina's.
 *
 * ── WAT ER GEMETEN WORDT EN NIET ───────────────────────────────────────────
 *
 * Niet: staat er `overflow-y: clip` in het bestand. Dat toetst de schrijfwijze
 * van de oplossing en niet de klacht, en het zou groen blijven op de dag dat
 * iemand er een tweede oorzaak naast zet. Wel: is de rij verticaal scrollbaar,
 * gemeten in een browser, op de breedtes waar het misging.
 *
 * Twee bewegingsvoorkeuren, want de fout verdween onder `prefers-reduced-motion:
 * reduce` — geen animatie, geen transform, geen probleem. Een toets die alleen
 * daar zou kijken, had hem nooit gezien.
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
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${ok ? '' : `verwacht ${JSON.stringify(expected)} kreeg ${JSON.stringify(actual)}`}`);
};

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`\n --   niet gecontroleerd: ${staat.uitleg}`);
  process.exit(0);
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launch = () => chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(500); res.end('error'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;

const browser = await launch();

/* ══ 1 · GEEN ENKELE RIJ OP DE HOMEPAGE SCROLLT VERTICAAL ═══════════════════
 *
 * Alle vier en niet alleen de dienstenrij. `.hv-faces` is dezelfde constructie
 * met dezelfde animatie eroverheen en staat één notitie verwijderd van dezelfde
 * fout; als die daar ooit in komt, hoort deze toets het te zeggen en niet de
 * telefoon van Lucas. */
console.log('\ngeen rij op de homepage is verticaal scrollbaar');
{
  for (const [naam, opties] of [
    ['telefoon 390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['telefoon 390 · rustige beweging', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }],
    ['tablet 768', { viewport: { width: 768, height: 1024 }, hasTouch: true }],
    ['desktop 1440', { viewport: { width: 1440, height: 900 } }],
  ]) {
    const ctx = await browser.newContext(opties);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const meting = await page.evaluate(() => {
      const uit = {};
      for (const sel of ['.hv-svc-rail', '.hv-faces']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        uit[sel] = { v: el.scrollHeight - el.clientHeight, h: el.scrollWidth - el.clientWidth };
      }
      return uit;
    });
    for (const [sel, m] of Object.entries(meting)) {
      check(`${naam} — ${sel} scrollt niet omhoog`, m.v, 0);
    }
    /* ── SCHUIVEN OF PASSEN, MAAR NOOIT AFGEKNIPT — herzien 30 augustus 2026
       Hier stond: de rij MOET zijwaarts schuiven (`h > 100`). Die eis was het
       verschil tussen de klacht oplossen en de carrousel slopen — een rij
       dichtzetten met `overflow: hidden` haalt de verticale scroll ook weg en
       maakt de kaarten onbereikbaar.

       Sinds de inkorting van 30 augustus staan er vier kaarten in plaats van
       zes: Hooks en Editions zijn eruit (hun uitleg staat op /plans). Op een
       breed scherm PASSEN die vier, en dan is er niets te schuiven — de oude
       eis ging daar rood op precies de uitkomst die de bedoeling was.

       Wat er werkelijk moet gelden is dit: elke kaart is bereikbaar. Dat kan op
       twee manieren waar — hij past, of je kunt ernaartoe schuiven — en de
       enige verboden derde is dat hij is afgeknipt. Dat wordt hieronder
       gemeten aan de kaarten zelf en niet meer aan de scrollbalk. */
    const kaarten = await page.evaluate(() => {
      const rail = document.querySelector('.hv-svc-rail');
      if (!rail) return null;
      const r = rail.getBoundingClientRect();
      const items = [...rail.children].map((el) => el.getBoundingClientRect());
      return {
        aantal: items.length,
        schuift: rail.scrollWidth - rail.clientWidth,
        // Bereikbaar = past binnen de zichtbare rij, of ligt binnen wat je kunt scrollen.
        onbereikbaar: items.filter((b) => b.width < 20 || b.right > r.left + rail.scrollWidth + 2).length,
      };
    });
    check(`${naam} — de rij heeft nog kaarten`, kaarten.aantal >= 4, true);
    check(`${naam} — en geen enkele is afgeknipt of onbereikbaar`, kaarten.onbereikbaar, 0);
    check(`${naam} — schuiven of passen, nooit iets ertussenin`,
      kaarten.schuift > 100 || kaarten.schuift === 0, true);
    await ctx.close();
  }
}

/* ══ 2 · DE ZWEVENDE NOTITIE IN DE RIJ LIGT BINNEN HET VENSTER ══════════════
 *
 * De notitie bij Hooks staat in een kaart in de geanimeerde rij: het enige punt
 * op de site waar een `position: fixed` element een getransformeerde voorouder
 * heeft. Hij wordt echt geopend, want dit gaat over wat een bezoeker ziet.
 *
 * Twee dingen tegelijk: hij mag niet buiten het venster vallen (dat was hij, op
 * 1440), en hij mag niet door de rij zijn afgeknipt (dat zou hij worden als je
 * de scroll wegneemt met `overflow-y: clip` zonder de oorzaak aan te pakken).
 * Die tweede is de reden dat er ook gemeten wordt dat hij ONDER de rij uitsteekt
 * — een notitie die netjes binnen de rij past, bewijst niets. */
/* ── DE NOTITIE STOND IN DE DIENSTENRIJ, EN STAAT DAAR NIET MEER ───────────
 *
 * Deze controle klikte de zwevende notitie van Hooks open, IN de dienstenrij, en
 * mat of hij buiten die rij uitstak zonder afgeknipt te worden. Dat was de
 * echte fout van 22 augustus 2026: een <Note> binnen een voorouder met een
 * transform hangt aan die voorouder in plaats van aan het venster, stak 29px
 * onder de rij uit, en die 29px werden scrollbare hoogte.
 *
 * Die notitie is op 30 augustus met de kaart mee verdwenen — de uitleg van
 * Hooks en Editions staat sinds die dag op /plans#binnenkort.
 *
 * DE FOUT KAN NOG STEEDS TERUGKOMEN, en daarom is deze controle niet geschrapt
 * maar verbreed. Hij pinde één notitie op één plek; hij loopt nu ALLE notities
 * op de homepage langs. Dat is strenger dan wat er stond: elke notitie die er
 * ooit bijkomt, in welke container dan ook, wordt vanaf nu meegemeten zonder
 * dat iemand deze toets hoeft aan te passen. */
console.log('\nelke zwevende notitie op de homepage valt binnen het venster');
{
  for (const [naam, opties] of [
    ['telefoon 390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['desktop 1440', { viewport: { width: 1440, height: 900 } }],
  ]) {
    const ctx = await browser.newContext(opties);
    /* De cookiebanner ligt over de pagina heen en onderschept elke klik. */
    await ctx.addCookies([{ name: 'vis_consent', value: 'necessary', domain: '127.0.0.1', path: '/' }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(400);

    const knoppen = page.locator('.nt-btn');
    const n = await knoppen.count();
    check(`${naam} — er staan notities op de pagina`, n >= 1, true);

    for (let i = 0; i < n; i++) {
      const knop = knoppen.nth(i);
      await knop.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await knop.click({ force: true });
      await page.waitForTimeout(250);
      const m = await page.evaluate((idx) => {
        const btn = document.querySelectorAll('.nt-btn')[idx];
        const pop = btn.closest('.nt') ? btn.closest('.nt').querySelector('.nt-pop') : null;
        if (!pop) return null;
        const r = pop.getBoundingClientRect();
        return {
          open: getComputedStyle(pop).visibility === 'visible',
          binnen: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
          breedte: Math.round(r.width),
        };
      }, i);
      check(`${naam} — notitie ${i + 1} gaat open`, m && m.open, true);
      check(`${naam} — notitie ${i + 1} valt binnen het venster`, m && m.binnen, true);
      check(`${naam} — notitie ${i + 1} is leesbaar breed`, m && m.breedte > 200, true);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
    }
    await ctx.close();
  }
}

/* ══ 3 · EN DIT GOLD VOOR ELKE NOTITIE OP DE SITE ══════════════════════════
 *
 * Bij het schrijven van deze toets stond hier iets anders: een controle op een
 * pagina ZONDER getransformeerde voorouder, om te bewijzen dat de omrekening
 * daar een nulbewerking is. Die controle ging rood, en het antwoord was leerzaam
 * genoeg om hem te vervangen in plaats van te repareren.
 *
 * ER IS NAMELIJK GEEN ZULKE PAGINA. Gemeten op /pricing, 24 augustus 2026: de
 * voorouder van de notitie is `div.addon.reveal.pending.in` en die draagt
 * `transform: matrix(1, 0, 0, 1, 0, 0)`. Een EENHEIDSMATRIX — hij verschuift
 * niets — maar voor de vraag "wat is het bevattend blok" telt dat net zo hard
 * als een echte verplaatsing. De onthulanimatie `.reveal` staat op vrijwel elk
 * blok van deze site, ook in rust.
 *
 * Dus lag élke notitie op de site naast zijn plek, en niet alleen die in de
 * dienstenrij: op /pricing 59 pixels te ver naar rechts en 312 te laag. Dat het
 * nergens opviel, komt doordat de notities meestal breed genoeg klemmen om
 * alsnog ergens redelijks uit te komen — tot de dienstenrij, waar het 43 pixels
 * buiten het venster werd en dus zichtbaar.
 *
 * ── WAT ER DAAROM GETOETST WORDT ───────────────────────────────────────────
 *
 * Niet meer of `--nt-x` gelijk is aan de werkelijke x. Dat was de MECHANIEK
 * toetsen, en de mechaniek mag veranderen. Wat er nu gemeten wordt is wat
 * `plaats()` probeert te bereiken en wat een lezer merkt: de notitie staat
 * helemaal binnen het venster, en hij staat onder zijn eigen vraagteken in
 * plaats van ergens anders.
 */
console.log('\nook een notitie buiten de homepage staat op zijn eigen vraagteken');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: 'necessary', domain: '127.0.0.1', path: '/' }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pricing/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const knop = page.locator('.nt-btn').first();
  if (!(await knop.count())) {
    console.log('  --   overgeslagen: /pricing draagt geen notitie meer');
  } else {
    await knop.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    /* Aanwijzen en niet klikken: de muis blijft op de knop staan, dus de notitie
       blijft open. Een klik verplaatst de muis en `traagVerbergen()` sluit hem
       dan tijdens het meten — dat kostte hier één ronde. */
    await knop.hover();
    await page.waitForTimeout(400);

    const m = await page.evaluate(() => {
      const btn = document.querySelector('.nt-btn[aria-expanded="true"]');
      if (!btn) return { open: false };
      const pop = btn.nextElementSibling;
      const r = pop.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const marge = 11;   // plaats() klemt op 12; één pixel speling voor afronding
      return {
        open: getComputedStyle(pop).visibility === 'visible',
        binnen: r.left >= marge && r.right <= innerWidth - marge
             && r.top >= marge && r.bottom <= innerHeight - marge,
        /* Onder of boven zijn eigen knop, en horizontaal in de buurt ervan.
           Ruim genomen, want plaats() mag hem naar binnen schuiven als hij
           anders de rand raakt — dat is juist de bedoeling. */
        bijDeKnop: Math.abs((r.left + r.width / 2) - (b.left + b.width / 2)) < r.width,
        verticaalErnaast: r.bottom <= b.top + 2 || r.top >= b.bottom - 2,
      };
    });
    check('de notitie op /pricing gaat open', m.open, true);
    check('  en valt volledig binnen het venster', m.binnen, true);
    check('  en staat bij zijn eigen vraagteken', m.bijDeKnop, true);
    check('  en niet er dwars overheen', m.verticaalErnaast, true);
  }
  await ctx.close();
}

await browser.close();
server.close();

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
