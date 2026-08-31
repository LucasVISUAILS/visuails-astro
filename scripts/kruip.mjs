/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN KRUIPRONDE OVER DE GEBOUWDE SITE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `npm run kruip` — draai hem na `npx astro build`.
 *
 * De 81 suites in tests/ toetsen elk één ding scherp: de prijs, de btw, de
 * wachtrij, het contrast. Wat ze niet doen is de site OPENEN zoals een bezoeker
 * dat doet, en dat is precies waar een andere klasse fouten zit — een script dat
 * op één pagina omvalt, een bestand dat niet mee is gebouwd, een blok dat op 390
 * pixels buiten het scherm hangt, twee keer hetzelfde id.
 *
 * Deze stap is met opzet GEEN test. Hij hoort niet in `npm test`: hij heeft een
 * verse build en een browser nodig, hij duurt een minuut, en zijn uitkomst is een
 * lijst om te lezen en niet een cijfer om groen te houden. Hij is er voor de
 * ronde die je doet vóór een deploy, of als iets zich raar gedraagt en je niet
 * weet waar.
 *
 * ── WAT HIJ NIET MELDT, EN WAAROM DAT IN DE CODE STAAT ─────────────────────
 *
 * Een controle die dingen meldt die kloppen, wordt na twee keer niet meer
 * gelezen. Dus staan de drie bekende uitzonderingen hieronder in de code, met de
 * reden erbij:
 *
 *   · /account, /admin, /portal, /api en /o zijn Workers. In dist/ staan ze niet
 *     en horen ze niet te staan. Een 404 daarop is deze server, niet de site.
 *   · Een element met `hidden` staat niet in de toegankelijkheidsboom. Een lege
 *     link die verborgen is en pas tekst krijgt als hij getoond wordt, is geen
 *     naamloze link.
 *   · Externe verzoeken worden geblokkeerd en apart geteld. Ze horen op een
 *     statische pagina nauwelijks voor te komen, en ze staan in de lijst zodat je
 *     ziet WELKE — een nieuw script van een derde partij hoort op te vallen.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, statSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
/** Paden die een Worker afhandelt en dus terecht niet in dist/ staan. */
const WORKER = /^\/(account|admin|portal|api|o)(\/|$)/;
const TYPE = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain', '.mp4': 'video/mp4',
};

const gemist = new Set();
const buiten = new Set();
const srv = createServer((q, r) => {
  const pad = decodeURIComponent(q.url.split('?')[0]);
  let p = join(DIST, pad);
  try { if (statSync(p).isDirectory()) p = join(p, 'index.html'); } catch { /* geen map */ }
  try { statSync(p); } catch {
    if (!WORKER.test(pad)) gemist.add(pad);
    r.writeHead(404); return r.end('404');
  }
  r.writeHead(200, { 'content-type': TYPE[extname(p)] || 'application/octet-stream' });
  createReadStream(p).pipe(r);
});
await new Promise((res) => srv.listen(0, res));
const poort = srv.address().port;

const paden = [];
(function loop(d) {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) loop(join(d, f.name));
    else if (f.name === 'index.html') {
      const rel = relative(DIST, d).replace(/\\/g, '/');
      paden.push('/' + (rel ? rel + '/' : ''));
    }
  }
})(DIST);
paden.sort();

/* Zelfde afspraak als tests/a11y.test.mjs: staat Chromium op het vaste pad van
   deze omgeving, gebruik dat; staat hij er niet, dan pakt playwright zijn eigen
   download. Beide gevallen werken zonder aanpassing. */
const CHROOM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(CHROOM) ? { executablePath: CHROOM } : {});
const bevindingen = [];
const gezien = new Set();
const meld = (soort, tekst) => {
  const sleutel = soort + '|' + tekst;
  if (gezien.has(sleutel)) return;
  gezien.add(sleutel);
  bevindingen.push({ soort, tekst });
};

for (const [breedte, naam] of [[1280, 'breed'], [390, 'telefoon']]) {
  const pg = await browser.newPage({ viewport: { width: breedte, height: 900 } });
  await pg.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(`http://127.0.0.1:${poort}`) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    buiten.add(u.split('?')[0]);
    return route.abort();
  });
  for (const pad of paden) {
    const fouten = [];
    /* Een verzoek naar een Worker-route geeft op dit servertje een 404, en de
       browser schrijft daar een console-fout bij. Die fout gaat over deze opzet
       en niet over de pagina — dus wordt hij hier gedempt, en alleen die. Elke
       andere console-fout blijft staan.

       `/account/me` is het geval dat dit oplevert: elke pagina met het
       bestelformulier vraagt hem op om te weten of je ingelogd bent. In productie
       antwoordt hij 401 als je uitgelogd bent, en dat is de bedoelde uitkomst. */
    const stilzwijgen = /Failed to load resource.*\b(404|401)\b/i;
    pg.removeAllListeners('console'); pg.removeAllListeners('pageerror'); pg.removeAllListeners('response');
    let alleenWorkers = true;
    pg.on('response', (r) => { if (r.status() >= 400 && !WORKER.test(new URL(r.url()).pathname)) alleenWorkers = false; });
    pg.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text().slice(0, 150)); });
    pg.on('pageerror', (e) => fouten.push('pageerror: ' + String(e.message).slice(0, 150)));

    const resp = await pg.goto(`http://127.0.0.1:${poort}${pad}`, { waitUntil: 'load', timeout: 20000 }).catch(() => null);
    if (!resp || !resp.ok()) { meld('status', `${pad} gaf ${resp ? resp.status() : 'geen antwoord'}`); continue; }
    await pg.waitForTimeout(150);
    for (const f of fouten) { if (alleenWorkers && stilzwijgen.test(f)) continue; meld('console', `${pad} — ${f}`); }

    const r = await pg.evaluate(() => {
      const uit = { overloop: null, dubbel: [], legeHref: [], zonderAlt: [], naamloos: [], koppen: [] };
      const de = document.documentElement;
      /* `hidden`, of een voorouder die het is: dan staat het niet in de
         toegankelijkheidsboom en telt het hier niet mee. */
      const verborgen = (el) => !!el.closest('[hidden]') || el.getAttribute('aria-hidden') === 'true';

      if (de.scrollWidth > de.clientWidth + 1) {
        /* Verst naar buiten eerst. Zonder die sortering staat bovenaan wat
           toevallig het vroegst in de DOM staat — bij ons het uitschuifmenu, dat
           met opzet naast het scherm geparkeerd staat — en niet het blok dat de
           overloop veroorzaakt. */
        const door = [...document.querySelectorAll('body *')]
          .map((e) => ({ e, b: e.getBoundingClientRect() }))
          .filter(({ b }) => b.width > 0 && (b.right > de.clientWidth + 2 || b.left < -2))
          .sort((x, y) => Math.max(y.b.right - de.clientWidth, -y.b.left) - Math.max(x.b.right - de.clientWidth, -x.b.left))
          .slice(0, 3)
          .map(({ e }) => e.tagName.toLowerCase()
            + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : ''));
        uit.overloop = { breedte: de.scrollWidth, venster: de.clientWidth, door };
      }

      const ids = {};
      for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
      uit.dubbel = Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k);

      for (const a of document.querySelectorAll('a')) {
        if (verborgen(a)) continue;
        const h = a.getAttribute('href');
        if (h === null || h === '' || h === '#') uit.legeHref.push((a.textContent || '').trim().slice(0, 40) || '(zonder tekst)');
        const naam = (a.textContent || '').trim() || a.getAttribute('aria-label') || a.getAttribute('title')
          || a.querySelector('img[alt]')?.getAttribute('alt')
          || a.querySelector('[aria-label]')?.getAttribute('aria-label');
        if (!naam) uit.naamloos.push(h || '(zonder href)');
      }
      for (const i of document.querySelectorAll('img')) {
        if (i.getAttribute('alt') === null) uit.zonderAlt.push(i.getAttribute('src') || '?');
      }
      const n = document.querySelectorAll('h1').length;
      if (n !== 1) uit.koppen.push(`${n} h1`);
      return uit;
    });

    if (r.overloop) meld('overloop', `${pad} @${naam} ${r.overloop.breedte}px in ${r.overloop.venster}px — door ${r.overloop.door.join(', ')}`);
    for (const d of r.dubbel) meld('dubbel-id', `${pad} — id "${d}" komt meer dan één keer voor`);
    for (const h of r.legeHref) meld('lege-link', `${pad} — link zonder doel: "${h}"`);
    for (const s of r.zonderAlt) meld('geen-alt', `${pad} — img zonder alt: ${s.slice(0, 60)}`);
    for (const k of r.naamloos) meld('naamloze-link', `${pad} — link zonder naam naar ${k}`);
    for (const k of r.koppen) meld('koppen', `${pad} — ${k}`);
  }
  await pg.close();
}
await browser.close();
srv.close();

console.log(`\n${paden.length} pagina's, twee breedtes\n`);
const per = {};
for (const b of bevindingen) (per[b.soort] ||= []).push(b.tekst);
for (const [soort, lijst] of Object.entries(per)) {
  console.log(`── ${soort} (${lijst.length})`);
  for (const t of lijst.slice(0, 15)) console.log('   ' + t);
  if (lijst.length > 15) console.log(`   … en ${lijst.length - 15} meer`);
}
if (buiten.size) {
  console.log(`\n── externe verzoeken, geblokkeerd tijdens deze ronde (${buiten.size})`);
  for (const g of [...buiten].sort().slice(0, 20)) console.log('   ' + g);
}
if (gemist.size) {
  console.log(`\n── opgevraagd en niet in dist/ (${gemist.size})`);
  for (const g of [...gemist].sort().slice(0, 20)) console.log('   ' + g);
}
if (!bevindingen.length && !gemist.size) console.log('geen bevindingen');
