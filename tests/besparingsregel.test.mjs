/*
 * 1.07 · WAT HET KOST, WAT ERBIJ ZIT EN WANNEER HET KOMT — 8 oktober 2026
 *
 * De besparingsregel in stap 1 ("Met 5 producten betaal je … in plaats van …")
 * mag alleen verschijnen bij een aantal waar een groter aantal echt even duur of
 * goedkoper is, en de aantallen én de bedragen komen uit de staffel in
 * src/data/pricing.js. Deze toets typt dus geen aantal en geen bedrag: hij
 * rekent ze zelf uit LADDER na en vergelijkt.
 *
 * Daarnaast: de regel is rustig (geen kader, geen uitroepteken), de vaste
 * regels in stap 1, 3 en 5 staan er in beide talen, de revisieregel komt uit
 * REVISIE_DAGEN en valt bij de €1-proef weg.
 *
 * Licht: geen server, geen browser. node tests/besparingsregel.test.mjs
 */
import { readFileSync } from 'node:fs';
import {
  LADDER, FORM_MAX_PRODUCTS, ladderTotal, groterGoedkoper, ladderGroterGoedkoper,
  REVISIE_DAGEN, WINDOW_THRESHOLD,
} from '../src/data/pricing.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(70)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('\n1.07 — de besparingsregel en de vaste regels in het formulier\n');

/* ── 1 · DE AANTALLEN EN BEDRAGEN KOMEN UIT DE STAFFEL ─────────────────────── */
console.log('de staffel');
/* Het antwoord met de hand: het kleinste grotere aantal tot en met het maximum
   dat even duur of goedkoper is. */
function naRekenen(kind, n, max) {
  const nu = ladderTotal(kind, n);
  for (let m = n + 1; m <= max; m += 1) {
    if (ladderTotal(kind, m) <= nu) return { aantal: m, dan: ladderTotal(kind, m), nu, gelijk: ladderTotal(kind, m) === nu };
  }
  return null;
}
for (const kind of Object.keys(LADDER)) {
  const getoond = [];
  let klopt = true;
  for (let n = 1; n <= FORM_MAX_PRODUCTS; n += 1) {
    const uit = ladderGroterGoedkoper(kind, n, FORM_MAX_PRODUCTS);
    const moet = naRekenen(kind, n, FORM_MAX_PRODUCTS);
    if (JSON.stringify(uit) !== JSON.stringify(moet)) klopt = false;
    if (uit) getoond.push(n);
  }
  ok(`${kind}: elk aantal 1–${FORM_MAX_PRODUCTS} geeft het nagerekende antwoord`, klopt);
  ok(`${kind}: de regel verschijnt bij een deel van de aantallen, niet bij alle`, getoond.length > 0 && getoond.length < FORM_MAX_PRODUCTS);
  /* Waar hij verschijnt, wijst hij naar het begin van een trede: daar zakt het
     tarief voor élk product, en alleen daardoor kan meer minder kosten. */
  const begin = new Set(LADDER[kind].map(([lo]) => lo));
  ok(`${kind}: het voorgestelde aantal is steeds het begin van een trede`,
    getoond.every((n) => begin.has(ladderGroterGoedkoper(kind, n).aantal)));
  ok(`${kind}: bij het maximum (${FORM_MAX_PRODUCTS}) geen regel`, ladderGroterGoedkoper(kind, FORM_MAX_PRODUCTS), null);
  ok(`${kind}: bij 1 product geen regel`, ladderGroterGoedkoper(kind, 1), null);
}

/* Het voorbeeld uit het voorstel ("Met 5 producten …"), uit de staffel gelezen. */
{
  const vier = LADDER.catalog[0][1];           // de bovenkant van de eerste trede
  const uit = ladderGroterGoedkoper('catalog', vier);
  ok('catalog: aan de bovenkant van trede 1 wijst hij naar het begin van trede 2', uit && uit.aantal, LADDER.catalog[1][0]);
  ok('catalog: "dan" is het staffeltotaal van dat aantal', uit && uit.dan, ladderTotal('catalog', LADDER.catalog[1][0]));
  ok('catalog: "in plaats van" is het staffeltotaal van nu', uit && uit.nu, ladderTotal('catalog', vier));
}

/* ── 2 · MET TOESLAGEN: DE SOM VAN HET FORMULIER BESLIST ──────────────────── */
console.log('\nmet toeslagen');
{
  // Een vaste toeslag (outfit) verandert niets aan wáár de regel staat.
  const vast = (m) => ladderTotal('catalog', m) + 50;
  let gelijk = true;
  for (let n = 1; n <= FORM_MAX_PRODUCTS; n += 1) {
    const a = groterGoedkoper(n, vast, FORM_MAX_PRODUCTS);
    const b = ladderGroterGoedkoper('catalog', n, FORM_MAX_PRODUCTS);
    if (!!a !== !!b || (a && a.aantal !== b.aantal)) gelijk = false;
  }
  ok('een vaste toeslag verschuift de aantallen niet', gelijk);
  // Een flinke toeslag per product kan de besparing opheffen: dan geen regel.
  const perProduct = (m) => ladderTotal('catalog', m) + m * 1000;
  ok('een grote toeslag per product: geen regel', groterGoedkoper(LADDER.catalog[0][1], perProduct, FORM_MAX_PRODUCTS), null);
  // Even duur telt mee, en wordt als "gelijk" gemeld.
  const plat = (m) => (m <= 3 ? m * 100 : 300);
  const g = groterGoedkoper(3, plat, 10);
  ok('even duur telt mee en heet "gelijk"', g && [g.aantal, g.gelijk], [4, true]);
  ok('centen tellen: 0,1 + 0,2 is even duur als 0,3', !!groterGoedkoper(1, (m) => (m === 1 ? 0.3 : 0.1 + 0.2), 2));
  ok('geen geldig aantal: geen regel', groterGoedkoper('3', vast, 10), null);
  ok('het maximum telt mee en niet verder', groterGoedkoper(19, (m) => ladderTotal('catalog', m), 19), null);
}

/* ── 3 · HET FORMULIER: RUSTIG, BEIDE TALEN, NIETS GETYPT ─────────────────── */
console.log('\nhet formulier');
const flow = lees('src/components/order/OrderFlow.astro');
const pipe = lees('src/scripts/pipeline.js');
ok('pipeline.js haalt groterGoedkoper uit pricing.js', /import \{ groterGoedkoper \} from '\.\.\/data\/pricing\.js'/.test(pipe));
ok('pipeline.js rekent tot het maximum van het formulier (cfg.maxProducts)', /groterGoedkoper\(n, \(m\) => totaalBij\(kind, m\), Number\(cfg\.maxProducts\)/.test(pipe));
ok('de regel staat in stap 1, verborgen tot er iets te zeggen is', /<p class="pl-total-besparing" data-pl-besparing hidden><\/p>/.test(flow));
ok('staat hij er, dan zwijgt de ladderregel', /if \(syncBesparing\(kind, n, quote\) && rung\) \{\s*rung\.textContent = '';\s*rung\.hidden = true;/.test(pipe));
const css = (flow.match(/\.pl-total-besparing \{[^}]*\}/) || [''])[0];
ok('geen kader of achtergrond om de regel (geen badge)', !!css && !/border|background|signal/.test(css));
ok('geen animatie op de regel', !/\.pl-total-besparing[^{]*\{[^}]*(animation|transition)/.test(flow));
ok('alleen de twee bedragen vet (<b>), via textContent en niet innerHTML',
  /b\.textContent = euro\(bedrag\)/.test(pipe) && !/data-pl-besparing[\s\S]{0,400}innerHTML/.test(pipe));
for (const taal of ['en', 'nl']) {
  const blok = (flow.split('besparing: {')[taal === 'en' ? 1 : 2] || '').split('\n    },')[0];
  ok(`${taal}: zinnen met {knop}, {dan} en {nu}, zonder uitroepteken`,
    /\{knop\}/.test(blok) && /\{dan\}/.test(blok) && /\{nu\}/.test(blok) && !blok.includes('!'));
  ok(`${taal}: de datumzin noemt de drempel uit pricing.js`, /\$\{WINDOW_THRESHOLD\}/.test(blok));
}
ok('geen getypt bedrag in de nieuwe regels', !/besparing: \{[^}]*€\s?\d/.test(flow) && !/wanneer: \{[^}]*€\s?\d/.test(flow));
ok('besparing.* en wanneer.* staan in REQUIRED_COPY',
  /'besparing\.minder', 'besparing\.gelijk', 'besparing\.knop', 'besparing\.knopLabel', 'besparing\.datum'/.test(flow)
  && /'wanneer\.snel', 'wanneer\.venster', 'wanneer\.later', 'wanneer\.voorrang', 'wanneer\.revisie'/.test(flow));
ok(`de datumzin pas als het voorgestelde aantal de drempel (${WINDOW_THRESHOLD}) haalt`,
  /n < drempel && uit\.aantal >= drempel/.test(pipe));

/* Wat erbij zit, in stap 1. */
ok('stap 1: "Inbegrepen" in beide talen', /inbegrepen: 'Included: [^']*revision round/.test(flow) && /inbegrepen: 'Inbegrepen: [^']*revisieronde/.test(flow));
ok('stap 1: bij de proef zonder revisieronde', /inbegrepenProef: 'Included: (?![^']*revision)[^']*'/.test(flow) && /inbegrepenProef: 'Inbegrepen: (?![^']*revisie)[^']*'/.test(flow));
ok('stap 1: de proef krijgt de proefzin', /\{isSample \? f\.s1\.inbegrepenProef : f\.s1\.inbegrepen\}/.test(flow));

/* Waarom KVK, in stap 3 — en niet "komt op je factuur", want dat doet hij niet. */
ok('stap 3: één regel waarom we het KVK-nummer vragen (NL en EN)',
  /regHintNl: 'VISUAILS werkt alleen voor bedrijven/.test(flow) && /regHintNl: 'VISUAILS works for businesses only/.test(flow));
ok('stap 3: belooft niet dat het KVK-nummer op de factuur staat', !/regHintNl: '[^']*factuur/.test(flow));

/* Wanneer het komt, in stap 5. */
ok('stap 5: de levertijd uit turnaround()', /snel: `Je beelden komen \$\{bijzin\(turnaround\('unattended', 'nl'\)\)\}\.`/.test(flow));
ok(`stap 5: de revisieronde uit REVISIE_DAGEN (${REVISIE_DAGEN}), niet getypt`, /\$\{REVISIE_DAGEN\} dagen voor één revisieronde/.test(flow) && /\$\{REVISIE_DAGEN\} days for one revision round/.test(flow));
ok('stap 5: zonder script staat de revisieregel er niet bij de proef', /<li data-pl-wanneer>\{PIPE\[lang\]\.wanneer\.snel\}\{!isSample && /.test(flow));
ok('stap 5: met script ook niet bij de proef', /el\.textContent = cfg\.sample \? zin : /.test(pipe));
ok('stap 5: een gekozen venster noemt de datum', /c\('wanneer\.venster', \{ datum:/.test(pipe));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
