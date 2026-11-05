/**
 * VISUAILS — korte zinnen op één regel, en ÉÉN in hoofdletters (levering 87, 4 november 2026; lijst 74).
 *
 *   node tests/korte-zinnen.test.mjs        (npm run test:kortezinnen; na de build)
 *
 * Lucas, 03:23: "Zinnen als deze kunnen gewoon als 1 zin om ruimte te besparen. Controleer de gehele website om te
 * kijken waar dit voorkomt en zorg ervoor dat dit word aangepast." Zijn voorbeeld: "Unsubscribe at the bottom of
 * every letter. Privacy" in de voet, op twee regels. Na de build zet scripts/korte-zinnen.mjs h-1r op een zin van
 * hoogstens 9 woorden en h-1k op een kleine zin van 10 tot 12; hal.css haalt dan de maat weg.
 *
 *   1 · de regel zelf (korteZinnen): wat hij telt, wat hij overslaat (blokken, scripts, een rij links), en dat een
 *       icoon in een zin hem niet tegenhoudt;
 *   2 · de build: de klassen staan erin, de CSS die ze waarmaakt ook;
 *   3 · in de browser: de zin uit de voet op één regel (NL en EN, 1440 breed), en nergens "Eén" in een kop die in
 *       hoofdletters staat (dat wordt "EÉN"; in het Nederlands is het "ÉÉN", vlaanderen.be taaladvies);
 *       "Eén" aan het begin van een gewone zin blijft zoals het is.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { korteZinnen, woorden, KORT, KLEIN_KORT } from '../scripts/korte-zinnen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

console.log('\n1 · de regel');
ok('9 en 12 woorden', KORT === 9 && KLEIN_KORT === 12);
ok('woorden telt €39 en 1–4 als woord, een middenpunt niet', woorden('Vanaf €39 · per product') === 4 && woorden('<b>1–4</b> producten') === 2);
const k = (h) => korteZinnen(h).html;
ok('een korte zin krijgt h-1r', k('<p>Unsubscribe at the bottom of every letter. <a href="/privacy">Privacy</a></p>') === '<p class="h-1r">Unsubscribe at the bottom of every letter. <a href="/privacy">Privacy</a></p>');
ok('… een bestaande klasse blijft staan', k('<p class="h-lede">Eén tarief per product.</p>') === '<p class="h-lede h-1r">Eén tarief per product.</p>');
ok('10 tot 12 woorden: h-1k', /class="h-1k"/.test(k('<small>Een twee drie vier vijf zes zeven acht negen tien elf.</small>')));
ok('13 woorden of meer: niets', !/h-1/.test(k('<p>Een twee drie vier vijf zes zeven acht negen tien elf twaalf dertien.</p>')));
ok('een icoon (svg) in de zin houdt hem niet tegen, en wordt niet aangeraakt', k('<li><svg viewBox="0 0 24 24"><path d="M1 1"/></svg>Natuurlijke belichting met één lichtbron</li>') === '<li class="h-1r"><svg viewBox="0 0 24 24"><path d="M1 1"/></svg>Natuurlijke belichting met één lichtbron</li>');
ok('een blok erin (een lijst, een kop, een knop): niets', !/h-1/.test(k('<li>Kort <ul><li>x</li></ul></li>')) && !/<p class/.test(k('<p>Kort <button>Ja</button></p>')));
ok('een rij die alleen uit links bestaat (de knoppen): niets', !/h-1/.test(k('<p class="h-acties"><a class="h-knop" href="/start">Start een bestelling</a> <a href="/test-sample">Probeer · €1</a></p>')));
ok('een > tussen aanhalingstekens in een attribuut breekt niets', k('<p title="a > b">Kort zinnetje hier</p>') === '<p title="a > b" class="h-1r">Kort zinnetje hier</p>');
ok("… een klasse tussen enkele aanhalingstekens krijgt h-1r erbij, zonder klasse zonder aanhalingstekens: niets", k("<p class='x'>Kort</p>") === "<p class='x h-1r'>Kort</p>" && k('<p class=x>Kort</p>') === '<p class=x>Kort</p>');
ok('een melding die het script vult (aria-live, role="status" of "alert"): niets', !/h-1/.test(k('<p aria-live="polite">Bezig</p><p role="status">Klaar</p><p role="alert">Fout</p>')));
ok('… een verborgen vaste zin (een foutmelding die alleen getoond wordt) wel', k('<p class="error" hidden>Kies eerst een plan.</p>') === '<p class="error h-1r" hidden>Kies eerst een plan.</p>');
ok('scripts, stijlen en commentaar raakt hij niet aan', k('<script>var p = "<p>Kort</p>";</script><!-- <p>Kort</p> --><style>p{}</style>') === '<script>var p = "<p>Kort</p>";</script><!-- <p>Kort</p> --><style>p{}</style>');

console.log('\n2 · de build');
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
const nl = fs.readFileSync(path.join(DIST, 'nl', 'index.html'), 'utf8');
ok('de stap staat in de build, vóór de stijl en de hashes', (() => { const c = fs.readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf8'); const a = c.indexOf('korteZinnen()'), b = c.indexOf('stijlUitDePagina()'), d = c.indexOf('cspScripts()'); return a > 0 && a < b && b < d; })());
ok('de voorpagina heeft korte zinnen met h-1r', (nl.match(/class="[^"]*\bh-1r\b/g) || []).length > 20);
const hal = fs.readFileSync(path.join(ROOT, 'src/styles/hal.css'), 'utf8');
ok('hal.css haalt de maat weg (h-1r) en zet hem alleen op kleine letters (h-1k)', /html body\.hal \.h-1r \{ --h-maat: none !important; \}/.test(hal) && /html body\.hal \.h-1k \{ --h-maat: max\(min\(max\(15em, calc\(\(15\.75px - 1em\) \* 10000\)\), 23em\)/.test(hal));

console.log('\n3 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [taal, pad] of [['nl', '/nl/'], ['en', '/']]) {
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const voet = await page.evaluate(() => {
      const p = [...document.querySelectorAll('p.sb-noot')].find((e) => /Unsubscribe at the bottom|onderaan elke brief/i.test(e.textContent));
      if (!p) return null;
      const lh = parseFloat(getComputedStyle(p).lineHeight) || parseFloat(getComputedStyle(p).fontSize) * 1.4;
      return { tekst: p.textContent.trim().replace(/\s+/g, ' '), regels: Math.round(p.getBoundingClientRect().height / lh), klasse: p.className };
    });
    ok(`${taal}: de zin onder de nieuwsbrief (Lucas' voorbeeld) op één regel`, !!voet && voet.regels === 1 && /h-1r/.test(voet.klasse), JSON.stringify(voet));
  }
  const paden = ['/nl/', '/nl/catalog/', '/nl/lifestyle/', '/nl/pricing/', '/nl/how-it-works/', '/nl/custom-models/', '/nl/studio/', '/nl/contact/', '/nl/guides/'];
  const mis = [];
  for (const pad of paden) {
    await page.goto(BASIS + pad, { waitUntil: 'domcontentloaded' });
    mis.push(...(await page.evaluate((pad) => {
      const g = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        if (!/Eén/.test(n.nodeValue)) continue;
        const e = n.parentElement; if (getComputedStyle(e).textTransform === 'uppercase') g.push(`${pad} ${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')}: ${n.nodeValue.trim().slice(0, 50)}`);
      }
      return g;
    }, pad)));
  }
  ok(`nergens "Eén" in hoofdletters (${paden.length} pagina's): daar staat "Één"`, mis.length === 0, mis.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
