/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE SHOOTWEEK STAAT OP /compare, EN NERGENS ANDERS MEER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Deze opsomming — casting, boeking, de samples heen en terug, het uitstel, de
 * avonden schiften — is de tweede helft van de vergelijking die deze site maakt.
 * De eerste helft is geld en staat op /pricing en in de matrix van /compare. Dit
 * is de helft in UREN, en die staat niet op de factuur.
 *
 * ── WAAROM HIJ EEN EIGEN TOETS KRIJGT ──────────────────────────────────────
 *
 * Omdat hij al één keer bijna van de site af is gevallen. Op 18 augustus 2026 is
 * hij van de homepage naar /compare verhuisd met de redenering dat hij daar bij
 * de kostenkant hoort. Bij het nakijken van de GEBOUWDE pagina bleek hij daar
 * niet te staan — in geen van beide talen. De verhuizing had de helft gedaan:
 * weghalen was gelukt, neerzetten niet. Hij is toen teruggezet op de homepage
 * met een noot erboven dat hij daar de enige plek was.
 *
 * Op 30 augustus is hij alsnog verhuisd, ditmaal in de goede volgorde: eerst
 * hier neergezet en gecontroleerd in de build, daarna pas van de homepage af.
 * Deze toets is wat die volgorde afdwingt voor de volgende keer.
 *
 * ── HIJ LEEST DE GEBOUWDE PAGINA EN NIET DE BRON ───────────────────────────
 *
 * Met opzet. De fout van 18 augustus was precies dat de bron er goed uitzag: de
 * copytabel had de regels, alleen riep de opmaak ze nergens aan. Een controle op
 * de bron had toen groen gestaan. Alleen de gebouwde HTML kan de vraag
 * beantwoorden die telt: ziet een bezoeker dit.
 */

import { readFileSync } from 'node:fs';
import { buildStaat } from './lib/build.mjs';

const staat = buildStaat(new URL('../dist/compare/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(58)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

/** De zichtbare tekst van een gebouwde pagina, zonder script, stijl en opmaak. */
const tekst = (pad) => readFileSync(new URL(`../dist/${pad}`, import.meta.url), 'utf8')
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');

const compareEn = tekst('compare/index.html');
const compareNl = tekst('nl/compare/index.html');
const homeEn = tekst('index.html');
const homeNl = tekst('nl/index.html');

/* De vijf dingen die een shootweek kosten. Niet de hele zin, maar het woord dat
   het ding benoemt — zo overleeft de toets een herformulering en valt hij om
   zodra een van de vijf verdwijnt. */
const EN = ['casting', 'booking', 'shipping the samples', 'reschedule', 'culling'];
const NL = ['casting', 'boeking', 'samples ernaartoe', 'uitstel', 'schiften'];

console.log('de week om de shootdag heen staat op /compare');
for (const w of EN) ok(`en: "${w}"`, compareEn.toLowerCase().includes(w), true);
for (const w of NL) ok(`nl: "${w}"`, compareNl.toLowerCase().includes(w), true);

console.log('\nen het antwoord erop staat erbij');
ok('en: wat een bestelling kost aan tijd', /twenty minutes/i.test(compareEn), true);
ok('nl: idem', /twintig minuten/i.test(compareNl), true);

/* ── EN DE HOMEPAGE ZEGT HET NIET NOG EEN KEER ─────────────────────────────
 *
 * Niet omdat herhaling verboden is, maar omdat dit precies de sectie is die van
 * de homepage af is gehaald om hem korter te maken. Komt hij terug, dan is dat
 * een besluit dat iemand genomen moet hebben — en dan hoort deze regel mee te
 * veranderen in plaats van stil te blijven staan. */
console.log('\nen de homepage draagt hem niet meer');
ok('en: geen casting-opsomming op de homepage', /no casting, no booking/i.test(homeEn), false);
ok('nl: idem', /geen casting, geen boeking/i.test(homeNl), false);

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
