/* VISUAILS — staat er ergens tekst die je niet kunt lezen?
 *
 *   npm run test:leesbaar     (vereist een build: npm run build)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TEST BESTAAT — 27 AUGUSTUS 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, twee keer, over twee verschillende schermen: *"Abonnement sectie mag wat
 * sterker en de knoppen zie je niet goed"* en *"Zorg dat icoontjes wel zichtbaar
 * zijn, kijk wat nog meer niet zichtbaar is."*
 *
 * Beide keren is er daarna een reparatie geschreven. Beide keren was hij fout, en
 * beide keren is dat pas gebleken toen er GEMETEN werd:
 *
 *   1 · De knop in de abonnementssectie stond op lime met lime letters — 1,00:1,
 *       alleen aan zijn schaduw terug te vinden. De eerste reparatie zette de
 *       vulling op `var(--accent)`, de tweede op `var(--accent-ink)`. Allebei de
 *       keren lime op lime, want `.lime-plate.plaat-vol` DRAAIT die twee
 *       variabelen om en de reparatie keek naar de naam in plaats van naar de
 *       waarde in die scope.
 *   2 · De voettekst kantelde naar zwart-op-lime en nam de dekkingen van de
 *       donkere kant mee. Wit op 46% is daar ruim 6:1; zwart op 46% is op lime
 *       3,13:1. De kolomkopjes, de auteursregel, "Privacy" en de cookieknop
 *       stonden dus allemaal onder de norm — zichtbaar genoeg om over te lezen,
 *       te licht om te lezen.
 *
 * Wat die twee gemeen hebben is dat je ze in de BRON niet ziet. Er staat een
 * variabele, en wat die variabele is hangt af van het vlak waar het element in
 * staat. Alleen een echte browser weet dat.
 *
 * ── WAT ER GEMETEN WORDT ────────────────────────────────────────────────────
 *
 * Voor elke knop op elke gebouwde pagina: de letterkleur tegen de VULLING van de
 * knop zelf, niet tegen de pagina eronder. Dat onderscheid is het hele punt —
 * een limeknop op een donkere pagina valt prachtig op en is toch onleesbaar als
 * de letters ook lime zijn.
 *
 * De norm is WCAG 2.1 SC 1.4.3: 4,5:1 voor gewone tekst, 3:1 voor groot
 * (>=24px, of >=18,66px vet). Knoplabels zijn bijna altijd het eerste.
 *
 * En daarnaast de voettekst, waar de hele inkttrap omkantelt: elke trede moet op
 * lime nog boven de 4,5:1 uitkomen.
 *
 * ── WAT ER NIET GEMETEN WORDT, EN WAAROM NIET ───────────────────────────────
 *
 * Niet alle tekst op de site, hoewel dat verleidelijk is. Een algemene veeg
 * levert vier soorten valse alarmen op die geen van alle een fout zijn, en een
 * test die je moet wegwuiven is een test die je gaat overslaan:
 *
 *   · `.hv-pipe-n` heeft `-webkit-text-fill-color: transparent` met een
 *     `-webkit-text-stroke` in lime. De letterkleur IS onzichtbaar; het cijfer
 *     is een omtrek en staat er wel degelijk.
 *   · `.cv-meet-t` op /compare hangt absoluut gepositioneerd NAAST zijn ouder.
 *     Wie de achtergrond via de voorouders uitrekent, meet het verkeerde vlak.
 *   · Het spritesheet met `<symbol>` is 0x0 en heeft `fill: black`.
 *   · Decoratieve verloopvlakken hebben per definitie geen contrast.
 *
 * Knoppen hebben die uitzonderingen niet: een knop is een rechthoek met een
 * vulling en een label erin. Daarom gaat deze test daarover, en scherp.
 */

import { existsSync, createReadStream } from 'node:fs';
import { stat, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, werkelijk, verwacht) => {
  const ok = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${ok ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launch = () => chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

/* Hetzelfde servertje als in tests/a11y.test.mjs, en om dezelfde redenen: geen
   subproces dat op Windows anders heet, geen blinde wachttijd, poort 0. */
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const schoon = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let bestand = join(DIST, ...schoon);
    let info = await stat(bestand).catch(() => null);
    if (info?.isDirectory()) { bestand = join(bestand, 'index.html'); info = await stat(bestand).catch(() => null); }
    if (!info?.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(bestand).toLowerCase()] || 'application/octet-stream' });
    createReadStream(bestand).pipe(res);
  } catch { res.writeHead(500); res.end('error'); }
});
const PORT = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASE = `http://127.0.0.1:${PORT}`;
const stop = () => { try { server.close(); } catch { /* al dicht */ } };
process.on('exit', stop);

/* Elke gebouwde pagina, niet een handmatige lijst. Een lijst veroudert stil: de
   pagina die je erbij bouwt is precies de pagina die niet gecontroleerd wordt. */
async function allePaginas(map = DIST) {
  const uit = [];
  for (const item of await readdir(map, { withFileTypes: true })) {
    const pad = join(map, item.name);
    if (item.isDirectory()) uit.push(...await allePaginas(pad));
    else if (item.name === 'index.html') {
      const rel = relative(DIST, pad).split(sep).slice(0, -1).join('/');
      uit.push('/' + (rel ? rel + '/' : ''));
    }
  }
  return uit.sort();
}
const PAGINAS = await allePaginas();

/* ── DE METING, IN DE PAGINA ────────────────────────────────────────────────
   Draait als één functie in de browser: buiten de browser is `--accent` een
   naam en binnen de browser een kleur, en juist dat verschil is wat hier fout
   ging. */
const METEN = () => {
  /* Chromium serialiseert `color-mix()` als `color(srgb 0.77 0.94 0 / 0.9)` en
     alles daarvoor als `rgb(...)`. De eerste vorm heeft kanalen van 0 tot 1.
     Wie dat door elkaar haalt, meet een limeknop als bijna zwart — dat is deze
     test in zijn eerste versie ook overkomen, en het leverde tien valse
     alarmen op. */
  const nr = (c) => {
    if (!c) return null;
    const genormaliseerd = c.startsWith('color(');
    const m = c.match(/-?[\d.]+(?:e-?\d+)?/g);
    if (!m) return null;
    const v = m.map(Number);
    if (genormaliseerd) {
      const rgb = v.slice(0, 3).map((x) => x * 255);
      if (v.length > 3) rgb.push(v[3]);
      return rgb;
    }
    return v;
  };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const meng = (voor, achter) => {
    const a = voor.length > 3 ? voor[3] : 1;
    return [0, 1, 2].map((i) => voor[i] * a + achter[i] * (1 - a));
  };
  /* De vulling van een element is zijn eigen achtergrond bovenop alles wat
     erdoorheen schijnt, tot de eerste ondoorzichtige laag. Doorzichtige knoppen
     — en die zijn er sinds de glaslaag overal — kloppen anders niet. */
  const vulling = (el) => {
    let n = el; const stapel = [];
    while (n && n !== document.documentElement) {
      const bg = nr(getComputedStyle(n).backgroundColor);
      if (bg) { const a = bg.length > 3 ? bg[3] : 1; if (a > 0) { stapel.push(bg); if (a >= 0.999) break; } }
      n = n.parentElement;
    }
    let uit = (nr(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255]).slice(0, 3);
    for (let i = stapel.length - 1; i >= 0; i--) uit = meng(stapel[i], uit);
    return uit;
  };
  const verhouding = (voorgrond, achtergrond) => {
    const a = lum(meng(voorgrond, achtergrond)) + 0.05;
    const b = lum(achtergrond) + 0.05;
    return a > b ? a / b : b / a;
  };
  const kleurtekst = (c) => 'rgb(' + c.slice(0, 3).map(Math.round).join(',') + ')';

  const uit = [];
  document.querySelectorAll('a.btn, button.btn, .cb-cta, .cc-btn, .btn-primary, .btn-ghost, .btn-2nd').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const grond = vulling(el);
    const v = verhouding(nr(cs.color), grond);
    const px = parseFloat(cs.fontSize) || 16;
    const eis = (px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3 : 4.5;
    if (v < eis) uit.push(`"${el.textContent.trim().slice(0, 28)}" ${v.toFixed(2)}:1 (eis ${eis}) — ${cs.color} op ${kleurtekst(grond)}`);
  });

  /* De voet apart: daar gaat het niet om knoppen maar om de inkttrap die
     omkantelt. Elke tekst in de voet, tegen het limevlak. */
  const voet = document.querySelector('.site-footer');
  if (voet) {
    const grond = vulling(voet);
    voet.querySelectorAll('*').forEach((el) => {
      const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!eigen) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return;
      if (el.closest('.btn, .cc-btn')) return;      // knoppen zijn hierboven al gedaan
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const v = verhouding(nr(cs.color), vulling(el.parentElement));
      const px = parseFloat(cs.fontSize) || 16;
      const eis = (px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3 : 4.5;
      if (v < eis) uit.push(`voet: "${el.textContent.trim().slice(0, 28)}" ${v.toFixed(2)}:1 (eis ${eis}) — ${cs.color} op ${kleurtekst(grond)}`);
    });
  }
  return uit;
};

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const stuk = [];
for (const pad of PAGINAS) {
  await page.goto(BASE + pad, { waitUntil: 'load' });
  /* ── OVERGANGEN UIT, EN DAAR IS EEN MEETFOUT VOOR NODIG GEWEEST ───────────
     Dezelfde veeg over het dashboard (scripts/dash-leesbaar.mjs) gaf op vijf
     achtereenvolgende runs 0, 1, 2, 1 en 2 bevindingen — steeds dezelfde knop,
     die bij een eigen probe gewoon 14,5:1 haalde. Oorzaak: `.btn` heeft een
     `transition` op zijn achtergrond, en wie midden in die overgang meet leest
     een tussenkleur. Deze toets loopt over dezelfde knoppen en had dus dezelfde
     kans om vals alarm te slaan, of erger: om een echte fout weg te middelen.

     Alles bevriezen op zijn eindwaarde is wat een contrastmeting moet zien. */
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important}' });
  await page.waitForTimeout(220);
  const bev = await page.evaluate(METEN);
  bev.forEach((b) => stuk.push(`${pad} ${b}`));
}
await page.close();
await browser.close();
stop();

check(`geen onleesbare knop of voettekst op ${PAGINAS.length} pagina's`, stuk, []);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
