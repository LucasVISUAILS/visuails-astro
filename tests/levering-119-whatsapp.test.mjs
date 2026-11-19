/* VISUAILS — levering 119 (18 november 2026), proefronde P1-13: de WhatsApp-knop op de telefoon (bouwer C4).
 *
 *   node tests/levering-119-whatsapp.test.mjs     (geen build nodig: haalt ietsOnder() uit src/scripts/interactions.js en
 *                                                  zet hem in een browser op een testpagina)
 *
 * Op de telefoon lag de knop rechtsonder over gecentreerde tekst en over de rand van een link ("Meer over hoe het werkt";
 * wie op "werkt" tikte, opende WhatsApp). initWaDock() keek alleen op vijf punten naar iets klikbaars. Nu ook: elke
 * zichtbare regel tekst, en elk klikbaar element dat het vak van de knop (met 4 px marge) maar raakt. Verborgen tekst
 * (een dichte <details>, sr-only, [hidden]) telt niet mee.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const js = readFileSync(path.join(ROOT, 'src/scripts/interactions.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

console.log('\nP1-13 · de bron');
const start = js.indexOf('function ietsOnder(');
ok('interactions.js heeft ietsOnder(r, dock, klik)', start >= 0, '(nog niet overgenomen uit lv119/notities-C4.md, "Voor een andere bouwer")');
/* levering 119 (18 november 2026, P1-13, H10): na ietsOnder() volgt nu ook tekstOpPunten(); de regel eindigt dus niet meer op ';'. */
ok('waMeet() gebruikt hem naast de vijf punten', /\|\| ietsOnder\(\{ left: x0 - 4, top: y0 - 4, right: x0 \+ w \+ 4, bottom: y0 \+ h \+ 4 \}, dock, KLIK\)/.test(js));
ok('  en daarna tekstOpPunten()', /\|\| tekstOpPunten\(\{ left: x0 - 4, top: y0 - 4, right: x0 \+ w \+ 4, bottom: y0 \+ h \+ 4 \}, dock\);/.test(js));
ok('  en zet is-weg zoals voorheen (hal.css schuift de knop dan opzij)', /dock\.classList\.toggle\('is-weg', eronder\);/.test(js));

/* de functie zelf: van "function ietsOnder(" tot de sluitende accolade op een eigen regel */
let bron = '';
if (start >= 0) { const eind = js.indexOf('\n}\n', start); bron = js.slice(start, eind + 2); }

let browser = null;
if (bron) {
  try {
    const { chromium } = await import('playwright');
    const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
    browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
  } catch (e) { console.log(`  --   geen browser (${String(e.message).split('\n')[0]}); dit deel overgeslagen`); }
}
if (browser) {
  console.log('\nP1-13 · in een browser (360 × 740, de knop 52 × 52 rechtsonder, 12 px van de rand)');
  const p = await browser.newPage({ viewport: { width: 360, height: 740 } });
  const KLIK = 'a[href], button, input, select, textarea, summary, label, [role="button"]';
  const geval = async (naam, html, verwacht) => {
    await p.setContent(`<!doctype html><style>body{margin:0;font:17px/1.5 sans-serif;text-align:center}.wa-dock a{position:fixed;right:12px;bottom:12px;width:52px;height:52px;background:#fff}
      .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}</style>
      <main style="position:relative;height:740px">${html}</main><div class="wa-dock"><a href="#wa" class="wa-launcher">wa</a></div>`);
    const uit = await p.evaluate(({ bron, KLIK }) => {
      const ietsOnder = new Function(`${bron}; return ietsOnder;`)();
      const dock = document.querySelector('.wa-dock');
      const x0 = innerWidth - 12 - 52, y0 = innerHeight - 12 - 52;
      return ietsOnder({ left: x0 - 4, top: y0 - 4, right: x0 + 52 + 4, bottom: y0 + 52 + 4 }, dock, KLIK);
    }, { bron, KLIK });
    ok(`${naam}: ${verwacht ? 'weg' : 'blijft'}`, uit === verwacht, `(kreeg ${uit})`);
  };
  const onder = (inhoud) => `<div style="position:absolute;top:660px;left:20px;right:20px">${inhoud}</div>`;
  await geval('gecentreerde zin die tot de rand loopt, onder de knop', onder('<p style="margin:0">Vaak binnen een dag, soms een paar dagen, en dan sturen we je de beelden.</p>'), true);
  await geval('alleen de rand van een link onder de knop (geen tekst)', '<a href="#x" style="position:absolute;top:670px;left:120px;width:178px;height:40px;display:block"></a>', true);
  await geval('een korte zin in het midden, de hoek vrij', onder('<p style="margin:0 auto;width:120px">Kort.</p>'), false);
  await geval('tekst in een dichte <details> onder de knop', onder('<details><summary style="width:60px;margin:0 auto">Meer</summary><p>Vaak binnen een dag, soms een paar dagen, en dan sturen we je de beelden.</p></details>'), false);
  await geval('tekst voor een schermlezer (sr-only) onder de knop', '<span class="sr-only" style="top:690px;left:320px">verborgen tekst</span>', false);
  await geval('tekst met visibility: hidden onder de knop', onder('<p style="margin:0;visibility:hidden">Vaak binnen een dag, soms een paar dagen, en dan sturen we je de beelden.</p>'), false);
  await geval('de knop zelf telt niet (lege pagina)', '', false);
  /* snelheid: een lange pagina (2000 regels) blijft snel, want wat het vak niet raakt wordt overgeslagen */
  await p.setContent(`<!doctype html><main>${'<section><h2>Kop</h2><p>Een regel tekst met wat woorden erin.</p></section>'.repeat(1000)}</main><div class="wa-dock"><a href="#wa" style="position:fixed;right:12px;bottom:12px;width:52px;height:52px">wa</a></div>`);
  const ms = await p.evaluate(({ bron, KLIK }) => {
    const ietsOnder = new Function(`${bron}; return ietsOnder;`)();
    const dock = document.querySelector('.wa-dock'); const r = { left: 292, top: 672, right: 352, bottom: 732 };
    const t = performance.now(); for (let i = 0; i < 20; i++) ietsOnder(r, dock, KLIK); return (performance.now() - t) / 20;
  }, { bron, KLIK });
  ok(`een pagina van 2000 regels: ${ms.toFixed(2)} ms per meting (< 8)`, ms < 8);
  await browser.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
