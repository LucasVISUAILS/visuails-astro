/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DE FOTOGIDS: ÉÉN BRON, ÉÉN A4 — punt 5.07, 8 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos: /upload-guidelines, de fotogids-pdf en de checklistmail komen uit
 * één bron (src/data/fotogids.js), een A4 in vier blokken met onderaan vijf
 * vragen. Dit bestand houdt dat vast:
 *
 *   1  de bron: vier blokken in vaste volgorde, vijf vragen, NL en EN
 *   2  wat uit shots.js komt, komt ook echt uit shots.js (verplichte vakken,
 *      ondergrens, te donker, de regel per vak, de aanname bij gedragen)
 *   3  shots.js is voorbereid op stap 2 (regel, voorbeeldpad, aanname) en
 *      toont nog nergens een voorbeeldfoto zonder te kijken of hij bestaat
 *   4  de pagina leest de bron (broncode, en de build als die er is)
 *   5  het A4 (scripts/lib/fotogids-html.mjs) leest de bron
 *   6  de pdf's zijn één A4-pagina en horen bij de huidige bron
 *   7  de checklistmail leest de bron
 *
 * Geen browser en geen server: de pdf wordt met pdf-lib gelezen. Deel 4 leest
 * dist/ en heeft dus een build nodig (npx astro build).
 *
 * Gaat deel 6 rood met "hoort niet bij de huidige bron": de tekst of de opmaak
 * van de gids is veranderd en de pdf niet opnieuw gemaakt. Draai
 * `node scripts/handleiding.mjs` en commit de twee pdf's.
 */
import { readFileSync, existsSync, globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

import { fotogids, fotogidsZinnen, BLOK_IDS } from '../src/data/fotogids.js';
import { SHOTS, MIN_LANGE_ZIJDE, vakRegel, copy as shotCopy } from '../src/data/shots.js';
import { gidsHtml, trefwoord, BESTAND } from '../scripts/lib/fotogids-html.mjs';
import { subscriberEmail } from '../functions/api/order.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
let fail = 0;
function ok(naam, voorwaarde, uitleg = '') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam}`); }
  else { fail++; console.log(` FAIL ${naam}${uitleg ? `\n       ${uitleg}` : ''}`); }
}

/* HTML terug naar tekst: tags eruit, de entiteiten die Astro, de mail en het
   A4 gebruiken terug naar hun teken, witruimte samengevoegd. */
function tekst(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&middot;/g, '·').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}
const ontbreekt = (zinnen, t) => zinnen.filter((z) => !t.includes(z.replace(/\s+/g, ' ')));

const TALEN = ['nl', 'en'];

/* ══ 1 · DE BRON ═══════════════════════════════════════════════════════════ */
console.log('\nde bron: src/data/fotogids.js');
for (const taal of TALEN) {
  const g = fotogids(taal);
  ok(`${taal}: vier blokken in de volgorde licht, ondergrond, kader, close-up`,
    g.blokken.map((b) => b.id).join(',') === 'licht,ondergrond,kader,closeup' && BLOK_IDS.length === 4);
  ok(`${taal}: elk blok heeft een kop en minstens twee regels`, g.blokken.every((b) => b.kop && b.regels.length >= 2 && b.regels.every((r) => r.length > 8)));
  ok(`${taal}: onderaan vijf korte vragen`, g.vragen.length === 5 && g.vragen.every((q) => q.endsWith('?') && q.length <= 40),
    JSON.stringify(g.vragen));
  ok(`${taal}: titel, intro en vraagkop staan erin`, Boolean(g.titelVol && g.intro && g.vragenKop && g.etiket));
  ok(`${taal}: de pdf en de pagina horen bij deze taal`,
    g.pdf === `/downloads/visuails-fotogids-${taal}.pdf` && g.pagina === (taal === 'nl' ? '/nl/upload-guidelines' : '/upload-guidelines'));
}
ok('NL en EN zijn echt twee talen', fotogidsZinnen('nl').every((z, i) => z !== fotogidsZinnen('en')[i] || /^Close-up$/.test(z)));
ok('een onbekende taal valt terug op Engels', fotogids('de').titelVol === fotogids('en').titelVol);

/* Kleur (5.03): de opgegeven kleur is leidend, wit papier als ijkpunt. */
ok('close-up NL: de kleur uit de webshop is leidend, met het witte vel als tip',
  /webshop.*leidend/.test(fotogids('nl').blokken[3].regels.join(' ')) && /wit vel printpapier half in beeld/.test(fotogids('nl').blokken[3].regels.join(' ')));
ok('close-up EN: hetzelfde', /webshop.*what counts/.test(fotogids('en').blokken[3].regels.join(' ')) && /white printer paper half in the frame/.test(fotogids('en').blokken[3].regels.join(' ')));

/* ══ 2 · WAT UIT shots.js KOMT ═════════════════════════════════════════════ */
console.log('\nwat uit shots.js komt, staat niet overgetypt');
for (const taal of TALEN) {
  const g = fotogids(taal);
  const verplicht = SHOTS.filter((s) => s.required).map((s) => s.name[taal].toLowerCase());
  ok(`${taal}: de zin "per product nodig" noemt precies de verplichte vakken (${verplicht.join(', ')})`,
    verplicht.every((n) => g.nodigZin.toLowerCase().includes(n)));
  ok(`${taal}: de kaderregel noemt de ondergrens uit MIN_LANGE_ZIJDE (${MIN_LANGE_ZIJDE})`,
    g.blokken[2].regels.some((r) => r.includes(String(MIN_LANGE_ZIJDE))));
  ok(`${taal}: het lichtblok zegt dat een te donkere foto gemeld wordt`,
    g.blokken[0].regels.some((r) => /donker|dark/i.test(r)));
  ok(`${taal}: de close-up begint met de regel van het vak Detail`,
    g.blokken[3].regels[0] === SHOTS.find((s) => s.id === 'detail').regel[taal]);
  ok(`${taal}: de vakken zijn die van shots.js, met hun etiket`,
    g.vakken.map((v) => v.id).join() === SHOTS.map((s) => s.id).join()
    && g.vakken.every((v) => v.label === (v.nodig ? shotCopy(taal).required : shotCopy(taal).optional)));
}
const bron = lees('src/data/fotogids.js');
ok('fotogids.js typt de ondergrens niet zelf', !new RegExp(`\\b${MIN_LANGE_ZIJDE}\\b`).test(bron.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('fotogids.js leest de keuring (keurBeeld) in plaats van "weigert" te raden', /keurBeeld\(/.test(bron));

/* ══ 3 · shots.js, VOORBEREID OP STAP 2 ════════════════════════════════════ */
console.log('\nshots.js: per vak een regel en een voorbeeldpad');
for (const s of SHOTS) {
  ok(`${s.id}: een regel in NL en EN`, Boolean(s.regel && s.regel.nl && s.regel.en && s.regel.nl !== s.regel.en));
  ok(`  en een voorbeeldpad in /img (${s.voorbeeld})`, /^\/img\/[a-z0-9-]+\.webp$/.test(s.voorbeeld || ''));
  ok('  en de oude velden staan er nog (name, how, buys)', Boolean(s.name.nl && s.how.nl && s.buys.nl && s.name.en && s.how.en && s.buys.en));
}
const worn = SHOTS.find((s) => s.id === 'worn');
ok('gedragen: de aanname staat er letterlijk', worn.zonder && worn.zonder.nl === 'Zonder draagfoto gaan we uit van een normale, rechte pasvorm.');
ok('  en in het Engels', worn.zonder && worn.zonder.en === 'Without a worn photo we assume a regular, straight fit.');
ok('  en alleen bij gedragen', SHOTS.filter((s) => s.zonder).map((s) => s.id).join() === 'worn');
ok('vakRegel() plakt de aanname achter de regel', vakRegel('worn', 'nl') === `${worn.regel.nl} ${worn.zonder.nl}`);
ok('vakRegel() van een onbekend vak is leeg', vakRegel('bestaatniet', 'nl') === '');

/* Geen plaatshouder zolang het bestand er niet is: wie `voorbeeld` toont, vraagt
   eerst isEcht() (src/lib/beeldAanwezig.js). Vandaag toont nog niemand hem. */
const componenten = globSync('src/**/*.astro', { cwd: ROOT }).map((f) => f.replace(/\\/g, '/'));
const tonen = componenten.filter((f) => /\.voorbeeld\b/.test(lees(f)) && /shots\.js|fotogids\.js/.test(lees(f)));
ok('wie een vakvoorbeeld toont, kijkt eerst of het bestand er is',
  tonen.every((f) => /isEcht\(/.test(lees(f))), tonen.join(', '));
/* Sinds de ombouw van stap 2 (F3, 11 oktober 2026) toont het formulier de
   voorbeeldfoto per vak — en alleen als isEcht() zegt dat het bestand er is. */
ok('het formulier leest `voorbeeld` alleen door isEcht() heen (F3)',
  /x\.voorbeeld && isEcht\(x\.voorbeeld\) \? x\.voorbeeld : ''/.test(lees('src/components/order/OrderFlow.astro'))
  && !/\.voorbeeld\b/.test(lees('src/components/order/ProductUploader.astro')));

/* ══ 4 · DE PAGINA ═════════════════════════════════════════════════════════ */
console.log('\n/upload-guidelines');
const pagina = lees('src/components/UploadGuidelinesHal.astro'); // sinds 13 oktober 2026 in de hal
ok('de pagina importeert de fotogids', /import \{ fotogids \} from '\.\.\/data\/fotogids\.js'/.test(pagina));
ok('  en toont de blokken, de vakken en de vragen uit de bron',
  /gids\.blokken\.map/.test(pagina) && /gids\.vakken\.map/.test(pagina) && /gids\.vragen\.map/.test(pagina));
{
  const code = pagina.replace(/\/\*[\s\S]*?\*\//g, '');
  const eigen = TALEN.flatMap((t) => fotogidsZinnen(t)).filter((z) => z.length > 24 && code.includes(z));
  ok('  en heeft er geen eigen kopie van', eigen.length === 0, eigen.join(' | '));
}
const DIST = path.join(ROOT, 'dist');
if (!existsSync(path.join(DIST, 'index.html'))) {
  ok('dist/ bestaat (eerst npx astro build)', false, 'zonder build is niet te zien wat de pagina toont');
} else {
  for (const taal of TALEN) {
    const f = path.join(DIST, taal === 'nl' ? 'nl' : '', 'upload-guidelines', 'index.html');
    const t = tekst(readFileSync(f, 'utf8'));
    const g = fotogids(taal);
    /* Behalve de titel (14 oktober 2026, afvinklijst 21): met het beeld in de opening is de tekstkolom
       704 px en heeft de pagina een kortere kop ("Zo maak je / goede productfoto’s."). De titel van de
       gids staat op het A4 en in de mail; die zijn hieronder en in sectie 6 getoetst. */
    const mis = ontbreekt([...fotogidsZinnen(taal).filter((z) => z !== g.titelVol), ...g.vakken.flatMap((v) => [v.naam, v.label, v.regel, v.zonder].filter(Boolean))], t);
    ok(`${taal}: elke zin van de gids staat op de gebouwde pagina (behalve de titel)`, mis.length === 0, mis.join(' | '));
    ok(`${taal}: de pagina linkt naar de pdf van haar taal`, readFileSync(f, 'utf8').includes(`href="${g.pdf}"`));
    ok(`${taal}: de oude lijsten "wel doen / vermijden" zijn weg`, !/>(Wel doen|Vermijden|Do|Avoid)</.test(readFileSync(f, 'utf8')));
  }
}

/* ══ 5 · HET A4 ════════════════════════════════════════════════════════════ */
console.log('\nhet A4: scripts/lib/fotogids-html.mjs');
ok('handleiding.mjs maakt de pdf uit gidsHtml()', /import \{[^}]*gidsHtml[^}]*\} from '\.\/lib\/fotogids-html\.mjs'/.test(lees('scripts/handleiding.mjs')));
ok('  en telt na het printen de pagina\'s', /getPageCount\(\) !== 1/.test(lees('scripts/handleiding.mjs')));
for (const taal of TALEN) {
  const g = fotogids(taal);
  const t = tekst(gidsHtml(taal));
  const mis = ontbreekt([...fotogidsZinnen(taal), ...g.vakken.flatMap((v) => [v.naam, v.label, v.regel, v.zonder].filter(Boolean))], t);
  ok(`${taal}: elke zin van de gids staat op het A4`, mis.length === 0, mis.join(' | '));
  ok(`${taal}: precies één blad`, (gidsHtml(taal).match(/class="blad"/g) || []).length === 1);
}
{
  /* Leesbaarheid op papier: geen letter onder 8,7 pt (11,6 px bij 100 %). */
  const css = gidsHtml('nl').match(/<style>([\s\S]*?)<\/style>/)[1];
  const maten = [...css.matchAll(/font-size:\s*([\d.]+)pt/g)].map((m) => Number(m[1]));
  ok('geen letter op het A4 kleiner dan 8,7 pt', maten.length > 5 && Math.min(...maten) >= 8.7, `kleinste: ${Math.min(...maten)}pt`);
}

/* ══ 6 · DE PDF'S ══════════════════════════════════════════════════════════ */
console.log('\nde pdf\'s in public/downloads');
for (const taal of TALEN) {
  const f = path.join(ROOT, 'public', 'downloads', BESTAND[taal]);
  if (!existsSync(f)) { ok(`${BESTAND[taal]} bestaat`, false); continue; }
  const doc = await PDFDocument.load(readFileSync(f), { updateMetadata: false });
  ok(`${taal}: één pagina`, doc.getPageCount() === 1, `${doc.getPageCount()} pagina's`);
  const { width, height } = doc.getPage(0).getSize();
  ok(`${taal}: op A4 (210 × 297 mm)`, Math.abs(width - 595.28) < 1.5 && Math.abs(height - 841.89) < 1.5, `${width} × ${height}`);
  const sleutels = doc.getKeywords() || '';
  ok(`${taal}: hoort bij de huidige bron (${trefwoord(taal)})`, sleutels.includes(trefwoord(taal)),
    `in de pdf: "${sleutels}" — draai node scripts/handleiding.mjs en commit de pdf's`);
  ok(`${taal}: niet zwaarder dan 600 kB (gaat via WhatsApp)`, readFileSync(f).length < 600 * 1024);
}

/* ══ 7 · DE CHECKLISTMAIL ══════════════════════════════════════════════════ */
console.log('\nde checklistmail: subscriberEmail()');
for (const taal of TALEN) {
  const g = fotogids(taal);
  const html = subscriberEmail(taal);
  const t = tekst(html);
  const mis = ontbreekt([...fotogidsZinnen(taal), g.nodigZin, g.kort], t);
  ok(`${taal}: elke zin van de gids staat in de mail`, mis.length === 0, mis.join(' | '));
  ok(`${taal}: de mail linkt naar dezelfde pdf en dezelfde pagina`,
    html.includes(`https://visuails.com${g.pdf}`) && html.includes(`https://visuails.com${g.pagina}"`));
  ok(`${taal}: en groet in zijn eigen taal`, t.includes(taal === 'nl' ? 'Hoi,' : 'Hi,'));
}
ok('het onderwerp van de mail is de titel uit de bron', /subject: fotogids\(lang\)\.titelVol/.test(lees('functions/api/order.js')));

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exitCode = 1;
