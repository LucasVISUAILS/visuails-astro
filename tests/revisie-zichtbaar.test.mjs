/* VISUAILS — kun je zien dát je een revisie hebt aangevraagd?
 *   npm run test:revisiezichtbaar
 * ══════════════════════════════════════════════════════════════════════════════
 * WAAROM DEZE TOETS BESTAAT — 12 SEPTEMBER 2026
 * ══════════════════════════════════════════════════════════════════════════════
 * Lucas, over wat een bezoeker met een frisse blik hem vertelde: *"Ook gaf hij
 * aan wanneer hij foto's binnen kreeg alleen duidelijk een kon approven maar
 * niet goed kon zien of hij een revisie aanvroeg."*
 *
 * Er waren twee oorzaken, en ze waren allebei terug te zien in de code:
 *
 *   1 · ONGELIJK GEWICHT. "Goedkeuren" was een gevulde primaire knop in een
 *       `.acts`-rij; "Niet goed" was een kale browser-checkbox eronder, met
 *       nul regels CSS in public/portal.css. Twee keuzes die even geldig zijn,
 *       hoorden er niet uit te zien als een knop met een voetnoot.
 *
 *   2 · GEEN ANTWOORD. Het vinkje hoort bij het rondeformulier ONDER het raster
 *       (`form="rr"`, want een <form> in een <form> bestaat niet). Aanvinken
 *       veranderde daardoor niets aan de TEGEL. Bij twaalf beelden weet je na
 *       drie klikken niet meer welke je hebt aangewezen — precies wat hij zei.
 *
 * Wat er nu staat: het vinkje zit in dezelfde `.acts`-rij als de knop, en de
 * tegel krijgt een kader plus de regel "Staat in je revisieronde" zodra hij
 * aanstaat. Beide gemeten in een gerenderd portaal voordat dit werd opgeschreven.
 *
 * Deze toets is statisch: hij bewaakt dat de drie stukken die dat samen doen
 * blijven bestaan. Wie het echte scherm wil zien, draait kladblok/portaal-render.mjs.
 */
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (naam, voorwaarde, uitleg = '') => {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? '   — ' + uitleg : ''}`); }
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const js = lees('src/lib/portal.js');
const css = lees('public/portal.css');

console.log('\nVISUAILS — een aangevraagde revisie is zichtbaar\n');

/* ══ 1 · DE TWEE KEUZES STAAN NAAST ELKAAR ════════════════════════════════ */
console.log('goedkeuren en revisie staan in dezelfde rij');
{
  const rij = js.match(/<div class="acts">\s*\n\s*<button class="btn btn-primary"[^]*?<\/div>/);
  ok('de acts-rij is gevonden', !!rij);
  ok('  met de goedkeurknop erin', !!rij && /value="approve"/.test(rij[0]));
  ok('  én het vinkje erin', !!rij && /\$\{tik\}/.test(rij[0]),
    'het vinkje staat weer buiten de rij — dan is het een voetnoot bij een knop');
}

/* ══ 2 · HET VINKJE IS EEN CONTROLE EN GEEN KAAL VAKJE ════════════════════ */
console.log('\nhet vinkje heeft de maat van een knop');
{
  const blok = (css.match(/\n\.pick \{[^}]*\}/) || [''])[0];
  ok('er is een .pick-regel', blok.length > 30, 'public/portal.css kende `.pick` niet — dat was de kern');
  for (const eig of ['padding', 'border', 'font-size', 'font-weight']) {
    ok(`  ${eig} staat erop`, blok.includes(`${eig}:`), 'zonder dit verschilt hij weer van de knop ernaast');
  }
  ok('en aangevinkt is een eigen toestand',
    /\.pick:has\(input:checked\)/.test(css), 'geen zichtbaar verschil tussen aan en uit');
}

/* ══ 3 · DE TEGEL ZEGT HET OOK ════════════════════════════════════════════
   Dit is de helft die de klacht veroorzaakte: het vinkje hoort bij een
   formulier verderop, dus zonder deze regels gebeurt er op de tegel niets. */
console.log('\nde tegel laat het zien zodra je aanvinkt');
{
  ok('er is een regel voor de aangevinkte staat',
    /<span class="state picked">/.test(js), 'de tegel zegt niets meer');
  ok('  hij staat standaard uit', /\.state\.picked \{[^}]*display:\s*none/.test(css));
  ok('  en verschijnt bij een aangevinkt vakje',
    /\.shot:has\(\.pick input:checked\) \.state\.picked/.test(css));
  ok('het beeld krijgt een kader', /\.shot:has\(\.pick input:checked\) img/.test(css),
    'zonder kader moet je per tegel lezen in plaats van kijken');
}

/* ══ 4 · EN HIJ ZEGT HET IN BEIDE TALEN ═══════════════════════════════════ */
console.log('\nde tekst staat er in beide talen');
{
  ok('rrPicked bestaat in het Engels', /rrPicked: 'In your revision round'/.test(js));
  ok('  en in het Nederlands', /rrPicked: 'Staat in je revisieronde'/.test(js));
  /* De sleutel moet ook echt gebruikt worden. Een tekst die in de lijst staat en
     nergens wordt opgehaald, is een tekst die stilletjes kan verrotten. */
  ok('  en wordt gebruikt', /esc\(t\.rrPicked\)/.test(js));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
