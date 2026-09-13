/* VISUAILS — werken de knoppen, en gaan de links ergens heen?
 *   npm run test:doorlopen      (vereist een build: npm run build)
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas: *"Controleer dan ook de gehele website op functionaliteit en of alle
 * knoppen werken naar behoren."*
 *
 * Dat zijn twee vragen die je op twee manieren moet stellen, en de ene vangt de
 * andere niet:
 *
 *   1 · WIJST ELKE LINK NAAR IETS DAT BESTAAT? Statisch te controleren, en het
 *       gaat om ruim achtduizend adressen — geen aantal dat je met de hand
 *       naloopt. Dit is ook precies de fout die deze zomer drie keer live ging:
 *       /account, /admin, /o en /api/plan gaven een 404 omdat er geen
 *       doorgeefbestand in src/pages/ stond. Vandaar dat de dynamische routes
 *       hieronder met naam staan en niet als "alles met een slash".
 *
 *   2 · DOET EEN KNOP DIE MET SCRIPT WERKT OOK IETS? Daar zegt een linkcontrole
 *       niets over. "Verder" in het bestelformulier is geen link: hij
 *       controleert de stap, schrijft de fout, en schuift op. Een stap die stil
 *       blijft hangen ziet er precies zo uit als een stap die nog niet is
 *       ingevuld — en dat is het soort storing waar een klant niet over mailt,
 *       hij sluit het tabblad.
 *
 * Vandaar dat sectie 2 het formulier ECHT doorloopt: invullen, klikken, en
 * kijken of de stap verspringt. Blijft hij staan, dan leest de toets wat er als
 * melding stond — want stil blijven hangen is een andere storing dan
 * tegengehouden worden met een reden.
 */
import { readFileSync, existsSync, readdirSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const ok = (naam, voorwaarde, uitleg = '') => {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? '\n' + uitleg : ''}`); }
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) { console.log(`geen bruikbare build — ${staat.uitleg}`); process.exit(1); }

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
console.log('\nVISUAILS — werken de knoppen en de links\n');

/* ══ 1 · ELKE INTERNE LINK WIJST NAAR IETS DAT BESTAAT ════════════════════ */
console.log('elke link en elk formulier wijst naar iets dat bestaat');
{
  const paginas = [];
  const alles = new Set();
  (function loop(map) {
    for (const it of readdirSync(map, { withFileTypes: true })) {
      const p = join(map, it.name);
      if (it.isDirectory()) { loop(p); continue; }
      const rel = '/' + relative(DIST, p).split(sep).join('/');
      alles.add(rel);
      if (it.name.endsWith('.html')) {
        paginas.push(p);
        alles.add(rel.replace(/index\.html$/, '').replace(/\.html$/, ''));
      }
    }
  })(DIST);

  /* De doorverwijzingen tellen mee: een opgeheven adres dat netjes een 301
     krijgt, is geen kapotte link. */
  const rd = join(DIST, '_redirects');
  if (existsSync(rd)) {
    for (const r of readFileSync(rd, 'utf8').split('\n')) {
      const t = r.trim();
      if (t && !t.startsWith('#')) alles.add(t.split(/\s+/)[0]);
    }
  }

  /* Routes die de Worker bedient en die dus niet als html in dist/ staan. MET
     NAAM, want "alles wat ik niet ken is vast dynamisch" is precies hoe de 404
     op /api/plan drie dagen onopgemerkt bleef. */
  const DYNAMISCH = [/^\/api\//, /^\/account(\/|$)/, /^\/admin(\/|$)/, /^\/o\//];
  const EXTERN = /^(https?:|mailto:|tel:|whatsapp:|#|javascript:|data:)/;

  const stuk = new Map();
  let geteld = 0;
  for (const f of paginas) {
    const html = readFileSync(f, 'utf8');
    const vanaf = '/' + relative(DIST, f).split(sep).join('/').replace(/index\.html$/, '');
    const adressen = [
      ...[...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => ['link', m[1]]),
      ...[...html.matchAll(/<form\b[^>]*\saction="([^"]+)"/g)].map((m) => ['formulier', m[1]]),
    ];
    for (const [soort, ruw] of adressen) {
      if (!ruw || EXTERN.test(ruw)) continue;
      const pad = ruw.split('#')[0].split('?')[0];
      if (!pad || !pad.startsWith('/')) continue;
      geteld++;
      if (DYNAMISCH.some((r) => r.test(pad))) continue;
      if (alles.has(pad) || alles.has(pad.replace(/\/$/, '')) || alles.has(pad + '/')) continue;
      const sleutel = `${soort} ${ruw}`;
      if (!stuk.has(sleutel)) stuk.set(sleutel, []);
      stuk.get(sleutel).push(vanaf);
    }
  }
  ok(`er zijn adressen om te controleren (${geteld} op ${paginas.length} pagina's)`, geteld > 1000);
  ok('geen enkel adres gaat nergens heen', stuk.size === 0,
    [...stuk].slice(0, 12).map(([a, v]) => `       · ${a}\n         vanaf ${v.slice(0, 3).join(', ')}`).join('\n'));
}

/* ══ 2 · EN DE STAPPEN VAN HET BESTELFORMULIER SCHUIVEN ECHT OP ═══════════ */
console.log('\nhet bestelformulier loopt van de eerste stap tot de laatste');
{
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2',
  };
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

  /* Elke stap invullen zoals een klant dat zou doen: alleen de velden die
     verplicht zijn en die je kunt zien. Wat verborgen staat is niet aan de beurt
     — syncRequired() in pipeline.js hanteert diezelfde regel. */
  const VULLEN = () => {
    const stap = document.querySelector('.pl-step.is-current');
    if (!stap) return;
    for (const f of stap.querySelectorAll('input,select,textarea')) {
      if (f.offsetParent === null || f.disabled) continue;
      if (!f.required && !f.dataset.plReq) continue;
      if (f.type === 'checkbox' || f.type === 'radio') { if (!f.checked) f.click(); continue; }
      if (f.tagName === 'SELECT') {
        if (!f.value) { const o = [...f.options].find((x) => x.value); if (o) { f.value = o.value; f.dispatchEvent(new Event('change', { bubbles: true })); } }
        continue;
      }
      if (f.value) continue;
      f.value = f.type === 'email' ? 'klant@voorbeeldmerk.nl'
        : f.type === 'tel' ? '+31612345678'
        : f.name === 'vat' ? 'NL005407575B96'
        : f.name === 'postal_code' ? '1234 AB'
        : f.type === 'number' ? '3' : 'Voorbeeld';
      f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  /* /start/video is een wachtpagina en /start/brand-model heeft zijn eigen
     stappen (data-bm-*); die horen hier niet. */
  for (const url of ['/nl/start/catalog/', '/nl/start/lifestyle/', '/nl/start/complete/', '/nl/test-sample/']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const scriptfouten = [];
    page.on('pageerror', (e) => scriptfouten.push(e.message.slice(0, 80)));
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const laatste = await page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-pl-step]')].map((s) => Number(s.dataset.plStep))));
    const bezocht = [];
    let vast = '';
    for (let i = 0; i < laatste + 2; i++) {
      const nu = await page.evaluate(() => (document.querySelector('.pl-step.is-current') || {}).dataset?.plStep || '');
      if (!nu) break;
      if (bezocht[bezocht.length - 1] !== nu) bezocht.push(nu);
      await page.evaluate(VULLEN);
      await page.waitForTimeout(120);
      const knop = page.locator('.pl-step.is-current [data-pl-next]').first();
      if (!(await knop.count())) break;
      await knop.click();
      await page.waitForTimeout(320);
      let na = await page.evaluate(() => (document.querySelector('.pl-step.is-current') || {}).dataset?.plStep || '');
      if (na === nu) {
        /* Stap 2 houdt tegen met een eigen paneel dat opsomt welke producten nog
           foto's missen, mét een knop om toch door te gaan. Dat is bedoeld
           gedrag; deze toets loopt eroverheen zoals een klant zou doen. */
        const toch = page.locator('[data-pl-missing]:not([hidden]) [data-pl-missing-go]').first();
        if (await toch.count()) {
          await toch.click();
          await page.waitForTimeout(320);
          na = await page.evaluate(() => (document.querySelector('.pl-step.is-current') || {}).dataset?.plStep || '');
        }
      }
      if (na === nu) {
        vast = await page.evaluate(() => {
          const b = document.querySelector('.pl-step.is-current [data-pl-step-error]:not([hidden])')
            || document.querySelector('[data-pl-missing]:not([hidden])');
          return b ? b.textContent.replace(/\s+/g, ' ').trim().slice(0, 64) : '(geen melding)';
        });
        break;
      }
    }
    ok(`${url} loopt door tot de laatste stap`,
      !vast && Number(bezocht[bezocht.length - 1]) === laatste,
      `       bleef op stap ${bezocht[bezocht.length - 1]} van ${laatste}: ${vast}\n       route: ${bezocht.join(' → ')}`);
    ok(`  en werpt onderweg geen scriptfout`, scriptfouten.length === 0,
      `       ${[...new Set(scriptfouten)].slice(0, 2).join(' | ')}`);
    await page.close();
  }
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
