/*
 * VISUAILS — een ingevulde tekstronde toepassen op de bron.
 *   node scripts/tekst-toepassen.mjs <ingevuld.md|ingevuld.xlsx> [--schrijf]
 *   node scripts/tekst-toepassen.mjs --vraag          (TEKSTEN-TOEPASSEN.bat)
 *   node scripts/tekst-toepassen.mjs --terug [--vraag] de laatste ronde terugzetten
 *
 * ── WAAROM DIT EEN SCRIPT IS EN GEEN HANDWERK ──────────────────────────────
 *
 * `scripts/tekstronde.mjs` haalt elke zichtbare zin uit de gebouwde site en zet
 * hem in een bestand met een leeg blok eronder. Lucas vult die blokken in. Dit
 * script is de weg terug, en hij is de gevaarlijke helft: honderd zinnen met de
 * hand terugzoeken en vervangen is honderd kansen om er één in het verkeerde
 * bestand te zetten, of om de Engelse regel over de Nederlandse heen te leggen.
 *
 * De vorige ronde is precies daarop misgegaan — zie de apostrof hieronder.
 *
 * ── DRIE DINGEN DIE DIT SCRIPT DOET EN EEN MENS VERGEET ────────────────────
 *
 * 1 · APOSTROFS NORMALISEREN. Lucas typt door elkaar `'` (U+0027) en `'`
 *     (U+2019); in TEKST-01 stond het 25 om 10. De site gebruikt in lopende
 *     tekst overal U+2019. Verbatim toepassen geeft dus "foto's" naast
 *     "foto's" in dezelfde alinea.
 *
 *     EN HET IS OOK DE BUG VAN VORIGE RONDE. Een rechte apostrof in een zin die
 *     in een single-quoted JS-string belandt, beëindigt die string: `ui.js` lag
 *     eruit op `Catalogusfoto's`. Normaliseren naar U+2019 lost de typografie
 *     én dat gevaar in één keer op, want die heeft geen ontsnapping nodig.
 *
 *     Dit verandert zijn WOORDEN niet. Het is dezelfde letter in de schrijfwijze
 *     die de rest van de site aanhoudt.
 *
 * 2 · DUBBELE ZINNEN SAMENVOEGEN. Lucas, vorige ronde: *"Wanneer zinnen
 *     overeenkomen met elkaar moet je ze samenvoegen en hetzelfde antwoord
 *     geven."* Dezelfde brontekst kan op meer dan één plek staan; die krijgen
 *     allemaal dezelfde nieuwe zin, ook als hij het blok maar één keer invulde.
 *
 * 3 · NIETS STIL LATEN MISLUKKEN. Een zin die niet terug te vinden is in de
 *     bron wordt GEMELD en niet overgeslagen. Dat is het verschil tussen "97
 *     toegepast" en "97 toegepast, 5 niet gevonden" — en die vijf zijn precies
 *     de zinnen die anders ongewijzigd op de site blijven staan terwijl iedereen
 *     denkt dat ze veranderd zijn.
 *
 * ── DROOGDRAAIEN IS DE STANDAARD ───────────────────────────────────────────
 *
 * Zonder `--schrijf` raakt dit script geen enkel bestand aan; het zegt alleen
 * wat het zou doen. Een toepasser die meteen schrijft, is een toepasser die je
 * één keer per ongeluk draait.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, relative } from 'node:path';
import readline from 'node:readline';
import { leesXlsx } from './lib/xlsx.mjs';

/* TEKST_WORTEL: alleen voor tests/zelf-vervangen-71.test.mjs (schrijven en terugzetten
   in een tijdelijke map, nooit in src/ terwijl de testreeks loopt). */
const ROOT = process.env.TEKST_WORTEL || join(dirname(fileURLToPath(import.meta.url)), '..');
/* ── DE VRAAGSTAND, VOOR TEKSTEN-TOEPASSEN.bat — levering 71, 5 november 2026 ──
   `--vraag`: vraagt welk bestand (sleep het in het venster), draait eerst droog,
   toont wat er verandert, en past het pas toe als Lucas J typt. Uitgang 0 = gedaan,
   3 = niets te doen, 2 = hij koos nee, 1 = er ging iets mis. Zonder `--vraag` werkt
   het script zoals altijd (droog, of met --schrijf). Het bestand mag nu ook de
   ingevulde .xlsx van TEKSTEN.bat zijn; de kolommen worden op naam gelezen. */
const args = process.argv.slice(2);
const VRAAG = args.includes('--vraag');
let SCHRIJF = args.includes('--schrijf');
let bestand = args.find((a) => !a.startsWith('--')) || '';
/* Eén leesregel voor alle vragen: met een nieuwe per vraag slokt de eerste alles op
   wat er al klaarstaat (een gesleept pad en de J erachter), en wacht de tweede
   vergeefs. Is de invoer op, dan is het antwoord leeg, en leeg is nee. */
let rl = null; let dicht = false; const klaar = []; const wacht = [];
const vraag = (t) => {
  if (!rl && !dicht) {
    rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (r) => { const w = wacht.shift(); if (w) w(r); else klaar.push(r); });
    rl.on('close', () => { dicht = true; while (wacht.length) wacht.shift()(''); });
  }
  process.stdout.write(t);
  return new Promise((res) => { if (klaar.length) res(klaar.shift()); else if (dicht) res(''); else wacht.push(res); });
};
const sluit = () => { if (rl && !dicht) rl.close(); };

/* ── TERUG — levering 71 ──────────────────────────────────────────────────────
   Voor het schrijven gaat elk bestand dat verandert als kopie naar
   tekstronde/terug/<tijd>/ (tekstronde/ gaat niet mee naar GitHub), en de naam
   van die map in tekstronde/terug/LAATSTE.txt. `--terug` zet die kopieën terug:
   TEKSTEN-TOEPASSEN.bat biedt dat aan als een toets rood is. */
const TERUG = join(ROOT, 'tekstronde', 'terug');
if (args.includes('--terug')) {
  const laatste = existsSync(join(TERUG, 'LAATSTE.txt')) ? readFileSync(join(TERUG, 'LAATSTE.txt'), 'utf8').trim() : '';
  const map = laatste && join(TERUG, laatste);
  if (!map || !existsSync(map)) { console.log('\n  Er is geen ronde om terug te zetten. Er is niets veranderd.'); process.exit(0); }
  const terugBestanden = readdirSync(map, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(map, join(e.parentPath ?? e.path, e.name)));
  console.log(`\n  De ronde van ${laatste}: ${terugBestanden.length} bestand(en) gaan terug zoals ze waren:`);
  for (const f of terugBestanden) console.log(`    ${f.replace(/\\/g, '/')}`);
  if (VRAAG) {
    const a = String(await vraag('\n  Terugzetten? Typ J en Enter (of N): ')).trim().toLowerCase();
    if (a !== 'j' && a !== 'ja') { console.log('\n  Niet teruggezet: je nieuwe teksten blijven staan.'); process.exit(2); }
  }
  for (const f of terugBestanden) copyFileSync(join(map, f), join(ROOT, f));
  writeFileSync(join(TERUG, 'LAATSTE.txt'), '');
  console.log(`\n  Teruggezet: ${terugBestanden.length} bestand(en). De site staat weer zoals voor deze ronde.`);
  process.exit(0);
}

if (!bestand && VRAAG) {
  bestand = String(await vraag('\n  Sleep je ingevulde tekstronde (.xlsx) in dit venster en druk op Enter:\n  ')).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').replace(/^& '(.*)'$/, '$1');
}
if (!bestand) {
  console.error('gebruik: node scripts/tekst-toepassen.mjs <ingevuld.md|ingevuld.xlsx> [--schrijf] [--vraag]');
  process.exit(1);
}
if (!existsSync(bestand)) {
  console.error(`\n  ROOD: het bestand is er niet: ${bestand}`);
  process.exit(1);
}

/* ── DE APOSTROF ─────────────────────────────────────────────────────────────
   Alleen tussen twee letters, en dat is de hele voorzichtigheid: `foto's` wordt
   `foto’s`, maar een apostrof die een citaat opent (`'zo'`) blijft staan. Een
   blinde vervanging zou van een aanhalingsteken een apostrof maken. */
const apostrof = (t) => t.replace(/(\p{L})'(\p{L})/gu, '$1’$2');

/* ── HET BESTAND UITLEZEN ──────────────────────────────────────────────────── */
const items = [];
/* Een .xlsx van TEKSTEN.bat (scripts/tekstblad-xlsx.mjs): het tabblad Tekst, de
   kolommen op naam, zodat een verschoven of extra kolom niets breekt. */
export function itemsUitXlsx(buf) {
  const rijen = leesXlsx(buf, { blad: 'Tekst' });
  const kop = (rijen[0] || []).map((k) => String(k || '').trim().toLowerCase());
  const k = (naam) => kop.indexOf(naam);
  const [id, en, nl, enN, nlN] = ['id', 'engels nu', 'nederlands nu', 'engels nieuw', 'nederlands nieuw'].map(k);
  if (id < 0 || en < 0 || nl < 0 || enN < 0 || nlN < 0) throw new Error('dit is geen tekstronde van TEKSTEN.bat: de kolommen id, Engels nu, Nederlands nu, Engels nieuw en Nederlands nieuw ontbreken');
  return rijen.slice(1).filter((r) => r[id]).map((r) => ({
    id: String(r[id]).trim(),
    en: String(r[en] || '').trim(),
    nl: String(r[nl] || '').trim(),
    venNieuw: apostrof(String(r[enN] || '').trim()),
    vnlNieuw: apostrof(String(r[nlN] || '').trim()),
  }));
}
if (/\.xlsx$/i.test(bestand)) {
  try { items.push(...itemsUitXlsx(readFileSync(bestand))); }
  catch (e) { console.error(`\n  ROOD: ${e.message}`); process.exit(1); }
}
const md = /\.xlsx$/i.test(bestand) ? '' : readFileSync(bestand, 'utf8');
const stukken = md.split(/\n### ([a-z0-9-]+)\n/);
for (let i = 1; i < stukken.length; i += 2) {
  const id = stukken[i];
  const blok = stukken[i + 1];
  const en = /\*\*EN\*\* (.*)/.exec(blok);
  const nl = /\*\*NL\*\* (.*)/.exec(blok);
  const fences = [...blok.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  items.push({
    id,
    en: en ? en[1].trim() : '',
    nl: nl ? nl[1].trim() : '',
    venNieuw: apostrof(fences[0] || ''),
    vnlNieuw: apostrof(fences[1] || ''),
  });
}

/* ── DE VERVANGINGEN, SAMENGEVOEGD OP BRONTEKST ─────────────────────────────
   Sleutel is de ORIGINELE zin en niet het nummer: staat dezelfde zin twee keer
   in het bestand, dan is het één vervanging. Botsen twee verschillende
   antwoorden op dezelfde brontekst, dan is dat een tegenspraak en geen keuze —
   die wordt gemeld en geen van beide toegepast. */
const paren = new Map();
const botsingen = [];
let ingevuld = 0;
for (const it of items) {
  for (const [oud, nieuw] of [[it.en, it.venNieuw], [it.nl, it.vnlNieuw]]) {
    if (!nieuw || nieuw === '-' || !oud || nieuw === oud) continue;
    ingevuld++;
    if (paren.has(oud) && paren.get(oud).nieuw !== nieuw) {
      botsingen.push({ oud, a: paren.get(oud).nieuw, b: nieuw, ids: [paren.get(oud).id, it.id] });
      continue;
    }
    paren.set(oud, { nieuw, id: it.id });
  }
}

/* ── DE BRONBESTANDEN ───────────────────────────────────────────────────────
   Alles waar zichtbare tekst in kan staan. Ruim genomen: een zin die in het
   verkeerde bestand wordt gezocht, wordt niet gevonden, en dat is een melding.
   Een zin die nergens wordt gezocht, is een stille misser. */
const MAPPEN = ['src/components', 'src/pages', 'src/data', 'src/i18n', 'src/layouts', 'src/lib'];
/* Met schuine strepen, ook op Windows. `join()` plakt met de scheiding van het
   besturingssysteem, en deze namen worden hier sleutel van een Map én worden
   afgedrukt in het verslag dat dit script achterlaat. Op mijn machine leverde
   dat `src/components/X.astro`, op die van Lucas `src\components\X.astro` —
   twee vormen van dezelfde lijst, afhankelijk van waar je hem draait.
   Zie tests/paths.test.mjs §2b: die wacht is er op 30 augustus 2026 bij gekomen
   nadat exact deze fout een suite op één van de twee platforms liet omvallen. */
const { globSync } = await import('node:fs');
const bestanden = MAPPEN.flatMap((m) =>
  globSync('**/*.{astro,js,ts}', { cwd: join(ROOT, m) }).map((f) => join(m, f).replace(/\\/g, '/'))
);

const inhoud = new Map(bestanden.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]));

/* ── TOEPASSEN ──────────────────────────────────────────────────────────────
   Letterlijk zoeken en letterlijk vervangen, in ELK bestand waar hij staat.
   Geen regex op de brontekst: die bevat leestekens die in een patroon iets
   anders betekenen, en een zin die per ongeluk als patroon wordt gelezen, raakt
   meer dan hij hoort. */

/* ── EEN TWEEDE KEER DRAAIEN MAG NIETS MEER STUKMAKEN — 25 augustus 2026 ────
   `tekst.includes(oud)` is een DEELSTRINGTEST, en een nieuwe zin bevat de oude
   vaak nog helemaal. In TEKST-01 stond precies zo'n paar:

     oud   What makes a usable photo
     nieuw What makes a usable photo?

   Na één ronde staat er `…photo?`, en dáár staat `…photo` gewoon nog in. Een
   tweede keer draaien maakte er `…photo??` van, een derde `…photo???`. De
   droogloop meldde het bovendien als "2 plekken te vervangen", terwijl er niets
   meer te doen was — een melding die zegt dat er werk ligt waar geen werk ligt,
   is een melding die je leert negeren.

   DE OPLOSSING IS DE TEKST OPKNIPPEN OP WAT ER AL STAAT. Splitsen op `nieuw`
   geeft de stukken die nog NIET zijn toegepast; alleen daarbinnen wordt `oud`
   gezocht, en daarna gaat `nieuw` er weer tussen. Bevat `nieuw` de oude zin
   niet, dan is er niets aan de hand en gaat het langs de gewone weg. */
const vervang = (tekst, oud, nieuw) => {
  if (!nieuw.includes(oud)) {
    return { tekst: tekst.split(oud).join(nieuw), n: tekst.split(oud).length - 1 };
  }
  let n = 0;
  const gaten = tekst.split(nieuw).map((stuk) => {
    n += stuk.split(oud).length - 1;
    return stuk.split(oud).join(nieuw);
  });
  return { tekst: gaten.join(nieuw), n };
};

let raak = 0, mis = 0;
const toegepast = [];
const nietGevonden = [];
const alGedaan = [];
const perBestand = new Map();

for (const [oud, { nieuw, id }] of paren) {
  let gevonden = 0;
  let stondErAl = false;
  for (const [f, tekst] of inhoud) {
    if (tekst.includes(nieuw)) stondErAl = true;
    if (!tekst.includes(oud)) continue;
    const r = vervang(tekst, oud, nieuw);
    if (!r.n) continue;
    inhoud.set(f, r.tekst);
    gevonden += r.n;
    perBestand.set(f, (perBestand.get(f) || 0) + 1);
  }
  /* DRIE UITKOMSTEN EN NIET TWEE. "Niet gevonden" en "stond er al" zien er in
     een telling hetzelfde uit en betekenen het tegenovergestelde: de eerste is
     een zin die ongewijzigd op de site blijft staan terwijl iedereen denkt dat
     hij veranderd is, de tweede is werk dat af is. Ze op één hoop gooien maakte
     de droogloop van deze ronde onleesbaar — 198 regels "NIET GEVONDEN" waarvan
     er 197 gewoon klaar waren. */
  if (gevonden) { raak += gevonden; toegepast.push({ id, oud, nieuw, n: gevonden }); }
  else if (stondErAl) alGedaan.push({ id, nieuw });
  else { mis++; nietGevonden.push({ id, oud }); }
}

console.log(`\n${items.length} items · ${ingevuld} ingevulde velden · ${paren.size} unieke vervangingen`);
console.log(`${raak} plek(ken) vervangen in ${perBestand.size} bestand(en)`);

if (botsingen.length) {
  console.log(`\n${botsingen.length} TEGENSPRAAK — dezelfde brontekst, twee verschillende antwoorden (niet toegepast):`);
  for (const b of botsingen) console.log(`  ${b.ids.join(' / ')}  "${b.oud.slice(0, 60)}"\n     a: ${b.a.slice(0, 60)}\n     b: ${b.b.slice(0, 60)}`);
}
if (alGedaan.length) {
  console.log(`\n${alGedaan.length} STOND ER AL — deze zin is in een eerdere ronde toegepast:`);
  for (const n of alGedaan.slice(0, 8)) console.log(`  ${n.id}  "${n.nieuw.slice(0, 78)}"`);
  if (alGedaan.length > 8) console.log(`  … en nog ${alGedaan.length - 8}`);
}
if (nietGevonden.length) {
  console.log(`\n${nietGevonden.length} NIET GEVONDEN in de bron:`);
  for (const n of nietGevonden) console.log(`  ${n.id}  "${n.oud.slice(0, 78)}"`);
}

if (VRAAG) {
  /* Wat er verandert, zin voor zin: zo ziet hij het voordat hij J typt. */
  const kort = (t, n = 600) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);   /* voluit: een wijziging aan het eind moet je zien */
  if (toegepast.length) {
    console.log(`\n  WAT ER VERANDERT (${toegepast.length} zin${toegepast.length === 1 ? '' : 'nen'}):`);
    for (const t of toegepast.slice(0, 60)) console.log(`\n  ${t.id}${t.n > 1 ? `  (${t.n} plekken)` : ''}\n    was:  ${kort(t.oud)}\n    nu:   ${kort(t.nieuw)}`);
    if (toegepast.length > 60) console.log(`\n  … en nog ${toegepast.length - 60}.`);
  }
  if (!raak) {
    console.log('\n  Er valt niets toe te passen (niets ingevuld, of alles stond er al). Er is niets veranderd.');
    process.exit(3);
  }
  if (botsingen.length || nietGevonden.length) console.log('\n  Let op: de regels hierboven onder TEGENSPRAAK en NIET GEVONDEN worden niet toegepast. De rest wel.');
  const a = String(await vraag(`\n  ${raak} plek(ken) in ${perBestand.size} bestand(en) aanpassen? Typ J en Enter (of N): `)).trim().toLowerCase();
  if (a !== 'j' && a !== 'ja') { console.log('\n  Gestopt: er is niets veranderd.'); process.exit(2); }
  SCHRIJF = true;
  sluit();
}
if (!SCHRIJF) {
  console.log('\n(droog gedraaid — niets geschreven. Voeg --schrijf toe om het echt te doen.)');
  process.exit(0);
}

let geschreven = 0;
const stempel = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
for (const [f, tekst] of inhoud) {
  const oud = readFileSync(join(ROOT, f), 'utf8');
  if (oud === tekst) continue;
  mkdirSync(dirname(join(TERUG, stempel, f)), { recursive: true });
  writeFileSync(join(TERUG, stempel, f), oud);
  writeFileSync(join(ROOT, f), tekst);
  geschreven++;
}
if (geschreven) writeFileSync(join(TERUG, 'LAATSTE.txt'), stempel);
console.log(`\n${geschreven} bestand(en) geschreven.${geschreven ? ` De oude staan in tekstronde/terug/${stempel}/.` : ''}`);
