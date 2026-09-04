/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET KADER OM EEN RECORD, EN DE VAL DIE HET OPAT  ·  npm run test:kaders
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Twee dingen, en het tweede is de reden dat het eerste een toets nodig heeft.
 *
 * ── 1 · EEN KADER STAAT OM EEN RECORD, NOOIT OM EEN SECTIE ─────────────────
 *
 * Lucas, 3 september 2026: bestellingen in VISUAILS Studio liepen in elkaar over,
 * want de scheiding TUSSEN twee bestellingen was exact dezelfde haarlijn als de
 * scheiding BINNEN één bestelling. Twee lijsten kregen daarom een kader terug:
 * `.card.ord` (bestellingen) en `.bk-card` (Standaard per dienst). Zie de lange
 * noot bij `.card.ord` in public/account.css voor waarom dat geen omkering is van
 * de opruiming van 27 augustus.
 *
 * ── 2 · EN WAAROM DAT IN ÉÉN KEER STIL MISLUKTE ────────────────────────────
 *
 * De eerste versie van die regel deed niets. Niet omdat de CSS fout was, maar
 * omdat de UITLEG erboven fout was: er stond nadruk met dubbele sterretjes vlak
 * voor een pad, en twee sterretjes gevolgd door een schuine streep sluiten een
 * blokcommentaar af. Het commentaar eindigde daar, de zin erna werd als CSS
 * gelezen, de parser sloeg door tot hij zich herstelde — en de regel die erachter
 * stond bestond niet meer. Zonder foutmelding, zonder waarschuwing in de build.
 *
 * Dit project schrijft nadruk mét sterretjes in vrijwel elk commentaar, en dit
 * bestand is 3600 regels. Dat is geen eenmalig ongeluk maar een val die klaarligt.
 *
 * Dus toetst dit twee dingen op twee niveaus: de VAL op de bron (staat er ergens
 * een commentaar dat onbedoeld afsluit), en het KADER in een echte browser (komt
 * de regel er ook echt uit). Het tweede is het bewijs; het eerste zegt waaróm het
 * misging als het tweede omvalt.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve, relative, sep } from 'node:path';
import { chromium } from 'playwright';
import { verdacht } from '../scripts/lib/commentaarval.mjs';

const WORTEL = resolve(fileURLToPath(new URL('..', import.meta.url)));

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

console.log('1 · geen commentaar dat onbedoeld afsluit');
/* Eerst de mutaties op de speurder zelf. Een speurder die niets vindt omdat hij
   niets KAN vinden, is precies het soort stilte waar deze toets tegen bestaat. */
ok('herkent de val', verdacht('/* zie **/pad hier */ .a { color: red }').length, 1);
ok('en laat gewone nadruk met spatie erna staan',
  verdacht('/* dit is **vet** en klaar */ .a { color: red }').length, 0);
ok('en een sterretje vlak voor een normale sluiting ook',
  verdacht('/* een lijst:\n * regel\n */ .a { color: red }').length, 0);
/* url() met een schuine streep en een sterretje erin mag geen commentaar openen. */
ok('een pad in een string is geen commentaar',
  verdacht(".a { background: url('/img/a/*b.png') }").length, 0);

const cssBestanden = [];
(function loop(d) {
  for (const n of readdirSync(d)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const f = join(d, n);
    if (statSync(f).isDirectory()) loop(f);
    else if (n.endsWith('.css')) cssBestanden.push(f);
  }
})(WORTEL);
const zondaars = cssBestanden
  .filter((f) => verdacht(readFileSync(f, 'utf8')).length)
  .map((f) => relative(WORTEL, f).split(sep).join('/'));
ok(`geen van de ${cssBestanden.length} stylesheets`, zondaars, []);

console.log('\n2 · en het kader komt er in een browser ook echt uit');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const css = readFileSync(join(WORTEL, 'public', 'account.css'), 'utf8');

/* Een minimale pagina met precies de twee vormen erin. Geen sessie, geen
   database, geen render van het hele dashboard: de vraag is of DEZE selector deze
   eigenschap krijgt, en alles daaromheen zou die vraag alleen kunnen vertroebelen. */
const fixture = `<!doctype html><html><head><style>${css}</style></head><body>
<div class="wrap">
  <details class="card ord" id="a"><summary class="row-head ord-sum"><h2 class="ref">A</h2></summary><p>x</p></details>
  <details class="card ord" id="b" open><summary class="row-head ord-sum"><h2 class="ref">B</h2></summary><p>y</p></details>
  <div class="bk-cards">
    <details class="bk-card" id="c"><summary class="bk-sum">C</summary><p>z</p></details>
    <details class="bk-card" id="d"><summary class="bk-sum">D</summary><p>w</p></details>
  </div>
  <div class="card" id="gewoon"><p>een gewone kaart, geen record</p></div>
  <div class="card" id="gewoon2"><p>en de volgende</p></div>
</div></body></html>`;

const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.setContent(fixture, { waitUntil: 'load' });

const stijl = await page.evaluate(() => {
  const lees = (id) => {
    const el = document.getElementById(id);
    const c = getComputedStyle(el);
    return {
      randbreedte: Math.round(parseFloat(c.borderTopWidth)),
      randsoort: c.borderTopStyle,
      randkleur: c.borderTopColor,
      radius: Math.round(parseFloat(c.borderTopLeftRadius)),
      schaduw: c.boxShadow,
      ondermarge: Math.round(parseFloat(c.marginBottom)),
    };
  };
  return { a: lees('a'), b: lees('b'), c: lees('c'), d: lees('d'), gewoon: lees('gewoon2') };
});

for (const [naam, s] of [['een dichte bestelling', stijl.a], ['een open bestelling', stijl.b],
  ['een dienst in Standaard per dienst', stijl.d]]) {
  ok(`${naam} heeft een rand`, s.randbreedte >= 1 && s.randsoort === 'solid', true);
  ok(`  met een afgeronde hoek`, s.radius > 0, true);
  /* De haarlijn tussen twee kaarten moet WEG zijn: hij zou de bovenrand van de
     volgende kaart nog eens overtekenen, twee pixels hoger. */
  ok(`  en geen haarlijn er bovenop`, /inset/.test(s.schaduw), false);
}
ok('twee bestellingen staan uit elkaar', stijl.b.ondermarge >= 8, true);

/* EN DE GEWONE KAART BLIJFT EEN CEL. Dit is de assertie die de opruiming van
   27 augustus beschermt: als iemand het kader ooit naar `.card` verplaatst in
   plaats van naar `.card.ord`, staan er weer 220 dozen op het scherm en valt
   deze regel om. */
ok('een gewone kaart heeft GEEN rand', stijl.gewoon.randbreedte, 0);
ok('en houdt zijn haarlijn', /inset/.test(stijl.gewoon.schaduw), true);

/* Het kader mag niet harder spreken dan de statuspil ernaast — zie de noot bij
   `.card.ord`. Beide horen --line-strong te gebruiken. */
const pil = await page.evaluate(() => {
  const s = document.createElement('span');
  s.className = 'pill'; document.body.append(s);
  return getComputedStyle(s).borderTopColor;
});
ok('de rand is dezelfde als die van een statuspil', stijl.a.randkleur, pil);

await browser.close();

/* Windows: process.exit() vlak na browser.close() struikelt in libuv

   ("Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\\win\\async.c")

   omdat de pipes van Chromium nog aan het sluiten zijn. Eén tik wachten

   laat ze dichtgaan; de uitslag verandert er niet door — 4 sept 2026. */

await new Promise((r) => setTimeout(r, 300));
console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
