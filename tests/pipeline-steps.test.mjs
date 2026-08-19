/*
 * De stapnavigatie van pipeline.js, met echte knoppen, in een echte browser.
 *
 * Het punt van deze test is de regressie, niet de nieuwe stand: catalog,
 * lifestyle en complete sturen geen `steps`/`gateStep` mee, en moeten zich dus
 * gedragen als voorheen — vijf stappen, poort op vier, samenvatting op vijf.
 * De vierstaps-stand bewijst daarnaast dat de samenvatting meeschuift naar de
 * laatste stap en dat de poort niet afgaat als hij er niet is.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { serve } from './lib-static-server.mjs';

/* Zelfde regeling als in a11y.test.mjs: in deze omgeving staat Chromium op een
   vast pad, op een andere machine pakt playwright zijn eigen download. */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const CFG = {
  lang: 'en', service: 'catalog',
  ladder: { catalog: [[1,4,89],[5,9,65],[10,19,51],[20,34,39],[35,null,33]], lifestyle: [[1,4,109]], complete: [[1,4,149]] },
  windowThreshold: 10, maxProducts: 30, maxFileBytes: 1e7, maxBatchFiles: 60,
  uploadExt: ['.jpg'], outfitSurcharge: 25, extraPhotoLadder: [[1,null,35]],
  maxExtraPerProduct: 3, maxOutfit: 3, bg: { customId: 'custom', lightThreshold: 0.5 },
  /* Genoeg kopij om renderSummary() echte regels te laten tekenen. Alleen de
     sleutels die de prijsregel nodig heeft — de rest mag ontbreken, want een
     regel zonder tekst wordt overgeslagen en dat is precies wat we hier willen:
     één regel, en dus geen twijfel over welke we lezen. */
  copy: { sum: { net: 'Order value' } },
};

const build = (extra) => {
  const last = (extra && extra.steps) || 5;
  const steps = Array.from({ length: last }, (_, i) => i + 1);
  return `<!doctype html><meta charset="utf-8"><body>
<form id="pl-form" data-pipeline method="post" action="/api/order">
<script type="application/json" data-pipeline-config>${JSON.stringify({ ...CFG, ...extra })}<\/script>
<input type="hidden" name="service" value="catalog">
<!-- tier=attended en een echte telling: zonder allebei stopt runGate() meteen
     via gateShow('queue') en belt hij de agenda nooit. -->
<input type="hidden" name="tier" value="attended">
<select name="products"><option value="12" selected>12</option></select>
<input type="hidden" name="upload_batch" value="">
${steps.map(n => `
<section class="pl-step" data-pl-step="${n}">
  <div data-pl-step-error id="e${n}" hidden></div>
  ${n < last ? '<button type="button" data-pl-next>next</button>' : '<button type="button" data-pl-submit>send</button>'}
  ${n > 1 ? '<button type="button" data-pl-back>back</button>' : ''}
</section>`).join('')}
<div data-pl-summary></div>
</form>
<script type="module" src="/src/scripts/pipeline.js"><\/script></body>`;
};

const srv = serve(8732, {
  '/five': build(),
  '/four': build({ steps: 4, gateStep: null }),
  // Dezelfde vier stappen als de proefvisual, mét het vaste bedrag erbij.
  '/sample': build({ steps: 4, gateStep: null, samplePrice: 1 }),
});
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
let pass = 0, fail = 0;
const ok = (n, got, want) => { const g = JSON.stringify(got) === JSON.stringify(want); g ? pass++ : fail++;
  console.log(`${g ? ' ok  ' : ' FAIL'} ${n.padEnd(56)}${g ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(got)}`}`); };

const cur = (p) => p.evaluate(() => {
  const el = document.querySelector('[data-pl-step].is-current');
  return el ? Number(el.getAttribute('data-pl-step')) : null;
});

for (const [label, route, last] of [['vijf stappen (catalog, ongewijzigd)', '/five', 5], ['vier stappen (proefvisual)', '/four', 4]]) {
  const p = await browser.newPage();
  const errs = []; const gateCalls = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('request', (r) => { if (r.url().includes('/api/capacity')) gateCalls.push(r.url()); });
  await p.goto(`http://127.0.0.1:8732${route}`, { waitUntil: 'networkidle' });

  ok(`${label} — start op stap 1`, await cur(p), 1);
  /* Een merkteken in het controlescherm. renderSummary() begint met het legen van
     die host, dus als het merkteken weg is heeft hij gedraaid — en dat is precies
     wat we willen weten, los van of er in deze opstelling teksten zijn om te tonen. */
  await p.evaluate(() => { document.querySelector('[data-pl-summary]').textContent = 'NIET-GEDRAAID'; });
  const walk = [];
  for (let i = 1; i < last; i += 1) {
    await p.click('[data-pl-step].is-current [data-pl-next]');
    await p.waitForTimeout(60);
    walk.push(await cur(p));
  }
  ok(`${label} — loopt door naar de laatste stap`, walk, Array.from({ length: last - 1 }, (_, i) => i + 2));
  ok(`${label} — geen scriptfouten onderweg`, errs, []);
  ok(`${label} — capaciteitspoort aangeroepen`, gateCalls.length > 0, last === 5);
  /* De samenvatting moet op de LAATSTE stap staan, niet altijd op stap 5. Zonder
     deze regel blijft het hardcoderen van stap 5 onopgemerkt en komt de
     proefvisual op een leeg controlescherm uit. */
  ok(`${label} — samenvatting gedraaid op de laatste stap`,
    await p.evaluate(() => document.querySelector('[data-pl-summary]').textContent.includes('NIET-GEDRAAID')), false);
  await p.close();
}
/*
 * ═══════════════════════════════════════════════════════════════════════════
 * HET BEDRAG OP HET CONTROLESCHERM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 18 augustus 2026. Op /test-sample zette renderSummary() "Orderbedrag · € 89"
 * — het laddertarief voor één catalogproduct. De proef kost € 1, en dat staat
 * op diezelfde pagina drie keer goed. Alleen het scherm dat vraagt of alles
 * klopt, had het mis.
 *
 * En de reparatie brak bijna alles: de eerste versie las
 * `Number.isFinite(Number(cfg.samplePrice))`, en Number(null) is 0 — dus stond
 * er "€ 0" op elke gewone bestelling. Vandaar dat hieronder BEIDE kanten staan.
 * Een test die alleen de gerepareerde stroom bekijkt, had die fout doorgelaten.
 */
console.log('\nhet bedrag op het controlescherm');
{
  const bedrag = async (route) => {
    const p = await browser.newPage();
    await p.goto(`http://127.0.0.1:8732${route}`, { waitUntil: 'networkidle' });
    const last = route === '/sample' ? 4 : 5;
    for (let i = 1; i < last; i += 1) {
      await p.click('[data-pl-step].is-current [data-pl-next]');
      await p.waitForTimeout(60);
    }
    const rij = await p.evaluate(() => {
      const dl = document.querySelector('[data-pl-summary]');
      const kids = [...dl.children];
      const i = kids.findIndex((n) => n.tagName === 'DT' && n.textContent.includes('Order value'));
      return i === -1 ? null : kids[i + 1].textContent.trim();
    });
    await p.close();
    return rij;
  };

  // 12 producten × € 51 op de derde sport van de catalogladder.
  ok('een gewone bestelling houdt het laddertarief', await bedrag('/five'), '€612');
  // En dat is de regel die brak toen samplePrice null bleek te zijn.
  ok('en wordt dus niet € 0', (await bedrag('/five')) === '€0', false);
  ok('de proefvisual toont het vaste bedrag', await bedrag('/sample'), '€1');
}

await browser.close(); srv.close();
console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
