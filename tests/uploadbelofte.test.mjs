/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE UPLOADBELOFTE — ZEGT DE SITE HETZELFDE AANTAL FOTO'S ALS DE POORT EIST?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 30 augustus 2026, over het enige voorstel dat een herhaling voorkomt:
 * *"zeker de bouwtoets tegen REQUIRED_SHOT_IDS — dat is het enige voorstel dat
 * voorkomt dat dit een vierde keer gebeurt."*
 *
 * ── WAT ER DRIE KEER MISGING ────────────────────────────────────────────────
 *
 * shots.js maakte voorkant én achterkant verplicht, met een reden die er niet om
 * liegt: allebei die kanten worden GELEVERD, dus een achterkant verzinnen uit een
 * voorfoto is geen gevolgtrekking maar een verzinsel. `cardReady()` in
 * pipeline.js laat een product sindsdien pas door als allebei de foto's er zijn,
 * en dat geldt voor elke dienst.
 *
 * De homepage bleef op DRIE plekken in TWEE talen zeggen dat één foto genoeg was:
 * de before/after-noot, de eerste stap van "Van map tot lancering", en de derde
 * bezwaarkaart. Zes regels, allemaal een restant van de oude regel.
 *
 * Dat is geen schrijffout. Een klant die het gelooft, loopt bij het uploaden
 * tegen een harde poort aan — precies het moment waarop je hem niet wil
 * verrassen. En het is drie keer blijven staan omdat er niets was dat de twee
 * getallen naast elkaar legde.
 *
 * ── WAT DEZE TOETS DOET, EN WAT HIJ MET OPZET NIET DOET ─────────────────────
 *
 * Hij telt de verplichte hoeken in shots.js en zoekt in de homepagecopy elke zin
 * die over telefoonfoto's gaat. Staat daar een telwoord in, dan moet het bij het
 * aantal passen.
 *
 * Hij toetst NIET op een vaste zin. Dat zou de copy vastzetten en bij de eerste
 * herformulering rood worden zonder dat er iets stuk is — de dure soort toets,
 * die je daarna uitzet. Hij toetst de enige twee dingen die echt moeten kloppen:
 * dat er geen ENKELVOUD meer staat waar er twee foto's nodig zijn, en dat een
 * genoemd getal het juiste getal is.
 *
 * Wordt de regel ooit teruggedraaid naar één verplichte hoek, dan valt deze toets
 * óók om — en dat is goed: dan hoort de copy mee terug, en dit is de plek waar
 * dat gezegd wordt.
 */

import { readFileSync } from 'node:fs';
import { SHOTS, REQUIRED_SHOT_IDS } from '../src/data/shots.js';
import { UPLOAD_TYPES, uploadFormats, uploadFormatsSentence } from '../src/lib/uploads.js';

let goed = 0, totaal = 0;
const ok = (naam, werkelijk, verwacht) => {
  totaal++;
  const gelijk = JSON.stringify(werkelijk) === JSON.stringify(verwacht);
  if (gelijk) goed++;
  console.log(`${gelijk ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(62)} ${gelijk ? '' : `verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(werkelijk)}`}`);
};

/* Het commentaar gaat eraf voordat er ook maar iets wordt gezocht. De uitleg
   hierboven noemt de oude, foute zin woordelijk, en in dit project is acht keer
   eerder een toets groen of rood geworden op zijn eigen uitleg. */
const zonderUitleg = (t) => t
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const home = zonderUitleg(readFileSync(new URL('../src/components/HomeV2.astro', import.meta.url), 'utf8'));

const nodig = REQUIRED_SHOT_IDS.length;

console.log('de bron van het getal');
ok('shots.js heeft verplichte hoeken', nodig > 0, true);
ok('en het zijn er twee: voorkant en achterkant',
  SHOTS.filter((s) => s.required).map((s) => s.id), ['front', 'back']);

/* ── WELKE REGELS TELLEN MEE, EN WAAROM NIET ALLEMAAL ──────────────────────
 *
 * Niet elke zin met het woord "telefoonfoto" is een BELOFTE over wat je moet
 * opsturen. De alt-tekst bij het voor/na-beeld ("De ruwe telefoonfoto die een
 * klant instuurde") beschrijft één foto omdat er op dat beeld één foto staat —
 * daar hoort geen telwoord bij en het zou onzin zijn er twee van te maken.
 *
 * De eerste versie van deze toets nam ze wél mee en ging drie keer rood op
 * regels waar niets mis mee was. Dat is de dure soort toets: hij dwingt je iets
 * te veranderen wat klopte, of hij wordt uitgezet. Dus wordt hier op de VORM van
 * de belofte geankerd — "genoeg om te beginnen" / "all you need" / "all we need"
 * — en niet op het onderwerp. Precies de zinnen die zeggen hoeveel je moet
 * sturen, en alleen die.
 */
const BELOFTE = /(all (?:you|we) need|genoeg om te beginnen|enough to start|are all)/i;
const REGELS = home.split('\n')
  .filter((r) => /phone photos?|smartphone photos?|telefoonfoto/i.test(r))
  .filter((r) => BELOFTE.test(r));

console.log('\nelke zin die zegt hoeveel foto’s je moet sturen');
ok('er zijn er zes gevonden — drie plekken, twee talen', REGELS.length, 6);

const TELWOORD = {
  one: 1, a: 1, an: 1, een: 1, één: 1,
  two: 2, twee: 2, three: 3, drie: 3, four: 4, vier: 4,
};
/* Het telwoord vlak vóór "foto('s)". `[\w-]+` en niet `\w+`, want er staat
   "well-lit" en "goed belichte" tussen — een koppelteken hoort bij het woord. */
const TELLING = /\b(one|two|three|four|a|an|een|één|twee|drie|vier)\b\s+(?:[\w-]+[\s’']+){0,3}?(?:phone photos?|smartphone photos?|telefoonfoto’?s?)/i;

for (const regel of REGELS) {
  const kort = regel.trim().replace(/^\s*\w+:\s*/, '').slice(0, 50);
  const m = regel.match(TELLING);
  ok(`telwoord klopt — ${kort}…`, m ? TELWOORD[m[1].toLowerCase()] : null, nodig);
}

console.log('\nen nergens meer het enkelvoud');
const ENKELVOUD = /\b(a|an|one|een|één)\s+(?:[\w-]+[\s’']+){0,3}?(?:phone photo|smartphone photo|telefoonfoto)(?!’?s)\b/i;
for (const regel of REGELS) {
  const kort = regel.trim().replace(/^\s*\w+:\s*/, '').slice(0, 50);
  ok(`geen enkelvoud — ${kort}…`, ENKELVOUD.test(regel), false);
}


/*
 * ── DEEL TWEE: DE FORMATENBELOFTE ──────────────────────────────────────────
 *
 * Dezelfde fout, één veld verderop. De hint onder het uploadveld op de plan-
 * lijst zei "jpg, png of webp"; UPLOAD_TYPES in uploads.js nam er acht aan,
 * heic incluis — en heic is precies wat een iPhone maakt. De klant met een
 * iPhone las dus dat zijn foto niet mocht, terwijl de poort hem zou hebben
 * aangenomen. Weer twee lijsten, en weer stond de onjuiste in beeld.
 *
 * De zin wordt nu afgeleid (uploadFormatsSentence). Deze toets bewaakt twee
 * dingen: dat élk contenttype uit UPLOAD_TYPES in de zin voorkomt, en dat er
 * in de schermteksten geen tweede, met de hand geschreven lijst terugsluipt.
 *
 * uploads.js zelf wordt NIET gescand: de uitleg daar noemt de oude zin
 * woordelijk, en dit project heeft die val vaak genoeg gezet.
 */
console.log('\nde formatenbelofte');

const zin = { en: uploadFormatsSentence('en'), nl: uploadFormatsSentence('nl') };
const families = uploadFormats();

ok('elk contenttype uit UPLOAD_TYPES heeft een familie',
  families.length, new Set(Object.values(UPLOAD_TYPES)).size);
for (const f of families) {
  ok(`de zin noemt ${f}`, zin.en.includes(f) && zin.nl.includes(f), true);
}
ok('de zin is Engels waar hij Engels hoort', / or /.test(zin.en) && !/ of /.test(zin.en), true);
ok('en Nederlands waar hij Nederlands hoort', / of /.test(zin.nl), true);

/* Geen tweede lijst met de hand. Alleen de schermteksten, zonder commentaar. */
const schermen = ['../src/lib/account.js', '../src/lib/portal.js']
  .map((f) => zonderUitleg(readFileSync(new URL(f, import.meta.url), 'utf8')));
/* De vorm van een handgeschreven formatenlijst: twee of meer extensies met
   komma's, afgesloten met "of"/"or". Verzonnen wordt er niets — het patroon
   komt van de zin die er stond. */
const HANDLIJST = /\b(?:jpe?g|png|webp|avif|heic|gif|tiff?)\b\s*,\s*(?:[a-z]{3,4}\s*,\s*)*[a-z]{3,4}\s+(?:of|or)\s+\b(?:jpe?g|png|webp|avif|heic|gif|tiff?)\b/i;
for (const [i, tekst] of schermen.entries()) {
  const naam = ['account.js', 'portal.js'][i];
  const treffers = tekst.split('\n')
    .filter((r) => HANDLIJST.test(r))
    .filter((r) => !/uploadFormatsSentence/.test(r));
  ok(`${naam} schrijft geen eigen formatenlijst`, treffers, []);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
