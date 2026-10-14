/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * "ONZE BEELDREDACTIE" BESTAAT NIET MEER — 8 oktober 2026 (o10)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── HET BESLUIT ──────────────────────────────────────────────────────────────
 *
 * Op 3 oktober 2026 werd "een mens" / "een specialist" overal "onze beeldredactie"
 * / "our image editors". Lucas' besluit van 8 oktober VERVANGT dat. De juridische
 * doorlichting wees erop dat een meervoud dat een team suggereert dat er niet is,
 * als misleidende mededeling kan gelden (art. 6:194 BW), terwijl de
 * verwerkersovereenkomst in §6 zelf zei wie er toegang heeft.
 *
 * Lucas, 8 oktober: *"Ik denk dat VISUAILS het beste is omdat ik als te klein om
 * als klant op te bouwen voelt en ik wel wat groter dan dat lijken voor een nieuwe
 * potentiële klant. Ik wil dat je dit op de juiste manier gaat framen en vooral
 * niet de ik vorm gebruiken, bedenk wat wel mogelijk is."*
 *
 * Wat er dus wél mag: "VISUAILS", "we"/"wij" (de bedrijfsstem, net als in
 * REVIEW_CLAIM: "door ons gemaakt en zorgvuldig gecontroleerd"), "de studio", en de
 * lijdende vorm ("wordt nagekeken"). Wat niet mag: een meervoud dat een afdeling of
 * team aanwijst ("onze beeldredactie", "our image editors"), en de ik-vorm.
 *
 * ── WAT DEZE TOETS DOET ─────────────────────────────────────────────────────
 *
 * Hij doorzoekt alles wat een klant kan lezen — pagina's, componenten, data,
 * mails, Studio, de privélink, llms.txt — op de oude woorden. Codecommentaar telt
 * niet: de uitleg van dit besluit noemt het oude woord per definitie.
 *
 * ── DE ENE UITZONDERING, EN WANNEER HIJ WEG MOET ────────────────────────────
 *
 * src/components/AiActPage.astro wordt in dezelfde ronde door een andere bouwer
 * herschreven (o07/o27) en is daarom hier niet aangeraakt. Zodra die pagina het
 * woord niet meer bevat, meldt deze toets dat de uitzondering weg kan — haal hem
 * dan uit UITZONDERINGEN.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
let fail = 0;
function ok(name, got, want = true, shown) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${String(name).padEnd(62)}${good ? '' : `verwacht ${JSON.stringify(want)} kreeg ${JSON.stringify(shown ?? got)}`}`);
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAPPEN = ['src', 'functions', 'scripts', 'cron'];
const UITZONDERINGEN = new Set([]);
const OUD = /beeldredactie|image[- ]editors?\b/i;

/* Commentaar eruit, in elke vorm die dit project gebruikt. `[^:]` vóór de
   dubbele schuine streep, zodat een https://-adres geen halve regel wegneemt —
   dezelfde helper als in tests/legal.test.mjs. */
const zonderUitleg = (bron) => bron
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

function* bestanden(map) {
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) { yield* bestanden(pad); continue; }
    if (/\.(astro|js|mjs|ts|html|md|txt)$/.test(naam)) yield pad;
  }
}

console.log('\nVISUAILS — "onze beeldredactie" is weg (o10, 8 oktober 2026)\n');

const gevonden = [];
const uitzonderingNogNodig = new Set();
let geteld = 0;
for (const map of MAPPEN) {
  for (const pad of bestanden(join(ROOT, map))) {
    const rel = relative(ROOT, pad).split('\\').join('/');
    geteld++;
    const tekst = zonderUitleg(readFileSync(pad, 'utf8'));
    if (!OUD.test(tekst)) continue;
    if (UITZONDERINGEN.has(rel)) { uitzonderingNogNodig.add(rel); continue; }
    const regels = tekst.split('\n').map((r, i) => [i + 1, r]).filter(([, r]) => OUD.test(r));
    for (const [nr] of regels) gevonden.push(`${rel}:${nr}`);
  }
}

ok('er zijn bestanden doorzocht', geteld > 200, true, geteld);
ok('nergens "onze beeldredactie" of "our image editors"', gevonden.join(', '), '', gevonden.join(', ') || '(geen)');
for (const rel of UITZONDERINGEN) {
  if (!uitzonderingNogNodig.has(rel)) {
    console.log(`      (let op: ${rel} is schoon — haal hem uit UITZONDERINGEN)`);
  }
}

/* De vervangers staan er ook echt, op de plekken waar de klant ze leest. Een
   toets die alleen zegt wat er NIET mag staan, keurt ook een lege zin goed. */
console.log('\nde vervangers staan op de plekken die de klant leest');
{
  const lees = (p) => readFileSync(join(ROOT, p), 'utf8');
  const account = lees('src/lib/account.js');
  ok('Studio: de statusstap heet "Being checked"', /human_check: 'Being checked'/.test(account), true);
  ok('Studio: en "Wordt nagekeken"', /human_check: 'Wordt nagekeken'/.test(account), true);
  const order = lees('functions/api/order.js');
  /* Sinds 8 oktober 2026 (7.02) staat de belofte in het blok "Zo gaat het
     verder" (src/lib/verder.js), dat de bestelbevestiging, de betaalmail en de
     bedankpagina delen. */
  const verder = lees('src/lib/verder.js');
  ok('bestelbevestiging: gebruikt "Zo gaat het verder"', /verderBlokHtml\(/.test(order), true);
  ok('en daar: "we check every image before it reaches you"', /[Ww]e check every image before it reaches you/.test(verder), true);
  ok('en "we kijken elk beeld na voordat het bij je komt"', /[Ww]e kijken elk beeld na voordat het bij je komt/.test(verder), true);

  /* De verwerkersovereenkomst moet zeggen wie er toegang heeft, en dat moet
     kloppen. Neutraal: geen team dat er niet is, en geen naam die Lucas daar niet
     wil — wel de juiste kring. */
  const vwoEn = lees('src/pages/data-processing-agreement.astro');
  const vwoNl = lees('src/pages/nl/data-processing-agreement.astro');
  ok('DPA EN: toegang alleen onder verantwoordelijkheid van VISUAILS',
    /Only people who work under the responsibility of VISUAILS and are bound to confidentiality/.test(vwoEn), true);
  ok('DPA NL: idem',
    /Alleen personen die onder verantwoordelijkheid van VISUAILS werken en aan geheimhouding gebonden zijn/.test(vwoNl), true);

  /* En geen ik-vorm in de zinnen die hier zijn herschreven. Dit is geen
     sitebrede ik-jacht (citaten van Lucas op /about mogen), alleen de plekken
     die dit besluit raakte. */
  const ikVorm = /\b(ik|I) (kijk|check|controleer|maak|lees)\b/;
  for (const p of ['src/components/HowItWorksHal.astro', 'src/components/StudioHal.astro', 'src/components/TestSampleHal.astro', 'src/lib/invoiceMail.js', 'src/lib/cancelMail.js']) {
    ok(`${p.split('/').pop()}: geen ik-vorm`, ikVorm.test(zonderUitleg(lees(p))), false);
  }
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
