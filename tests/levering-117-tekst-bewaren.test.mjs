/* VISUAILS — levering 117 (17 november 2026), proefronde P6-01 (met P6-02 en P6-13): één tabel met bewaartermijnen.
 *
 *   node tests/levering-117-tekst-bewaren.test.mjs     (geen build nodig: rekent met de data en leest de bron)
 *
 * Voorwaarden §7 en de FAQ zeiden 90 dagen; privacy §6 en de verwerkersovereenkomst §12 ook een eigen kopie tot
 * 2 jaar. Lucas koos (a): de 2-jaarskopie ook in de voorwaarden en de FAQ, met "mail ons en hij is weg", en op alle
 * vier plekken dezelfde tabel (src/data/bewaartermijnen.js). Wat hier bewaakt wordt:
 *   1 · de tabel rekent met retention.js (de constanten van de nachtelijke opruimtaak), in beide talen gelijk;
 *   2 · de 30 dagen van de maker van het model staan zo ook in subverwerkers.js;
 *   3 · de vier plekken, NL en EN, tonen die tabel (voorwaarden, privacy, verwerkersovereenkomst, FAQ);
 *   4 · de oude tegenstrijdige zinnen zijn weg;
 *   5 · de datum "laatst bijgewerkt" van de drie juridische pagina's is 17 november 2026.
 */
import { readFileSync } from 'node:fs';
import { BEWAAR_TABEL, bewaarTabel, bewaarZinnen, MAKER_DAGEN } from '../src/data/bewaartermijnen.js';
import { UPLOAD_DAYS, DELIVERY_DAYS, ACCOUNT_YEARS, CORRESPONDENTIE_JAREN, EXPIRED_FILES_SQL } from '../src/lib/retention.js';
import { ONTVANGERS } from '../src/data/subverwerkers.js';
import { faqPageGroups } from '../src/data/faq.js';
import { LAATST_BIJGEWERKT, bijgewerktOp } from '../src/data/juridischeDatums.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const code = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n1 · de tabel rekent met retention.js');
{
  for (const l of ['nl', 'en']) {
    const t = bewaarTabel(l);
    ok(`${l}: vier rijen (opslag, kopie, post, maker)`, t.rijen.map((r) => r.id).join(',') === 'opslag,kopie,post,maker', t.rijen.map((r) => r.id).join(','));
    const r = Object.fromEntries(t.rijen.map((x) => [x.id, x.hoeLang]));
    ok(`${l}:   opslag = UPLOAD_DAYS (${UPLOAD_DAYS}) dagen`, r.opslag.startsWith(`${UPLOAD_DAYS} `), r.opslag);
    ok(`${l}:   eigen kopie = ACCOUNT_YEARS (${ACCOUNT_YEARS}) jaar na de laatste bestelling`, r.kopie.includes(`${ACCOUNT_YEARS} ${l === 'nl' ? 'jaar na je laatste bestelling' : 'years after your last order'}`), r.kopie);
    ok(`${l}:   mail en WhatsApp = CORRESPONDENTIE_JAREN (${CORRESPONDENTIE_JAREN}) jaar na het laatste contact`, r.post.includes(`${CORRESPONDENTIE_JAREN} ${l === 'nl' ? 'jaar na ons laatste contact' : 'years after our last contact'}`), r.post);
    ok(`${l}:   beeldmaker: ${MAKER_DAGEN} dagen bij de maker, met de hand weg binnen DELIVERY_DAYS (${DELIVERY_DAYS})`, r.maker.includes(`${MAKER_DAGEN} ${l === 'nl' ? 'dagen' : 'days'}`) && r.maker.includes(`${DELIVERY_DAYS} ${l === 'nl' ? 'dagen na levering' : 'days of delivery'}`), r.maker);
    ok(`${l}:   "mail ons en het is weg"`, l === 'nl' ? /Mail ons .* en het is weg/.test(t.weg) : /Email us .* and it is gone/.test(t.weg), t.weg);
    /* tabel én FAQ-tekst: geen getal dat niet uit de bron komt */
    const getallen = (JSON.stringify(t).match(/\d+/g) || []).map(Number);
    const mag = new Set([UPLOAD_DAYS, DELIVERY_DAYS, ACCOUNT_YEARS, CORRESPONDENTIE_JAREN, MAKER_DAGEN]);
    ok(`${l}:   elk getal in de tabel komt uit een bron`, getallen.every((n) => mag.has(n)), getallen.join(','));
    ok(`${l}: de FAQ-zinnen zijn dezelfde rijen`, t.rijen.every((x) => bewaarZinnen(l).includes(`${x.wat}: ${x.hoeLang}.`)) && bewaarZinnen(l).endsWith(t.weg));
  }
  ok('de opruimtaak rekent met dezelfde UPLOAD_DAYS', EXPIRED_FILES_SQL.includes(`'+${UPLOAD_DAYS} days'`));
  ok('NL en EN hebben dezelfde rijen in dezelfde volgorde', BEWAAR_TABEL.nl.rijen.map((r) => r.id).join() === BEWAAR_TABEL.en.rijen.map((r) => r.id).join());
}

console.log('\n2 · de termijn van de maker van het model is die uit subverwerkers.js');
{
  const tekst = JSON.stringify(ONTVANGERS);
  ok(`subverwerkers.js noemt "${MAKER_DAGEN} dagen" en "${MAKER_DAGEN} days"`, tekst.includes(`ten hoogste ${MAKER_DAGEN} dagen`) && tekst.includes(`no more than ${MAKER_DAGEN} days`));
  ok('en dat de bestelmelding het materiaal als bijlage draagt (de rij "mail en WhatsApp")', /als bijlage/.test(tekst) && /as an attachment/.test(tekst));
}

console.log('\n3 · de tabel staat op alle vier plekken, NL en EN');
const PAGINAS = [
  ['src/pages/terms.astro', 'en'], ['src/pages/nl/terms.astro', 'nl'],
  ['src/pages/privacy.astro', 'en'], ['src/pages/nl/privacy.astro', 'nl'],
  ['src/pages/data-processing-agreement.astro', 'en'], ['src/pages/nl/data-processing-agreement.astro', 'nl'],
];
const TABELBLOK = /<p id="bewaartabel"><strong>\{BT\.kop\}<\/strong><\/p>\s*<div class="table-scroll" tabindex="0" role="region" aria-label=\{BT\.kop\}>\s*<table class="files" data-bewaartabel>[\s\S]*?\{BT\.rijen\.map\([\s\S]*?<\/table>\s*<\/div>\s*<p>\{BT\.weg\}<\/p>/;
for (const [p, l] of PAGINAS) {
  const c = code(lees(p));
  ok(`${p}: leest bewaarTabel('${l}')`, new RegExp(`const BT = bewaarTabel\\('${l}'\\);`).test(c) && /from '[./]+\/data\/bewaartermijnen\.js'/.test(c));
  ok(`${p}:   en tekent hem één keer, met dezelfde opmaak`, (c.match(new RegExp(TABELBLOK.source, 'g')) || []).length === 1);
}
{
  const groepen = (l) => faqPageGroups(l);
  for (const l of ['nl', 'en']) {
    const alles = JSON.stringify(groepen(l));
    ok(`FAQ ${l}: het antwoord over bewaren bevat de tabel als zinnen`, alles.includes(JSON.stringify(bewaarZinnen(l)).slice(1, -1)));
    ok(`FAQ ${l}:   met een link naar de tabel in het privacybeleid`, alles.includes('/privacy#bewaartabel'));
  }
}

console.log('\n4 · de tegenstrijdige zinnen zijn weg');
{
  const nlT = code(lees('src/pages/nl/terms.astro')), enT = code(lees('src/pages/terms.astro'));
  ok('voorwaarden NL §7 noemt de eigen kopie tot ACCOUNT_YEARS, met "Mail ons en hij is weg"', /Een eigen kopie van je productfoto’s en stijlreferenties bewaren we tot \{ACCOUNT_YEARS\} jaar na je laatste bestelling/.test(nlT) && /Mail ons en hij is weg/.test(nlT));
  ok('terms EN §7 too, with "Email us and it is gone"', /We keep our own copy of your product photos and style references for up to \{ACCOUNT_YEARS\} years after your last order/.test(enT) && /Email us and it is gone/.test(enT));
  ok('  "drie termijnen" / "Three periods" staat er niet meer (het zijn er meer)', !/Er liggen drie termijnen vast/.test(nlT) && !/Three periods are fixed/.test(enT));
  const faq = lees('src/data/faq.js');
  ok('FAQ: niet meer "en verder niets" / "and nothing else"', !/en verder niets\./.test(faq) && !/and nothing else\./.test(faq));
  ok('FAQ: niet meer "Dezelfde termijnen staan in ons privacybeleid" zonder tabel', !/Dezelfde termijnen staan in ons privacybeleid/.test(faq) && !/The same terms are in our privacy policy/.test(faq));
  for (const p of ['src/pages/nl/data-processing-agreement.astro', 'src/pages/data-processing-agreement.astro']) {
    const c = code(lees(p));
    ok(`${p}: de mailbox valt niet meer onder "de termijnen hieronder"`, !/in onze mailbox en op onze werkmachine, gelden/.test(c) && !/in our mailbox and on our workstation, follow/.test(c));
  }
  for (const p of ['src/pages/nl/privacy.astro', 'src/pages/privacy.astro']) {
    const c = code(lees(p));
    ok(`${p} §5: wat wij bij Magnific maakten, halen wij met de hand weg (P6-13)`, /tenzij wij hem weghalen: dat doen wij met de hand/.test(c) || /unless we remove it: we do that by hand/.test(c));
  }
}

console.log('\n5 · laatst bijgewerkt: 17 november 2026 (of later)');
/* levering 119 (18 november 2026): de drie pagina's veranderden weer, dus nu "op of na 17 november", met de dag. */
for (const doc of ['terms', 'privacy', 'data-processing-agreement']) {
  const waarde = LAATST_BIJGEWERKT[doc];
  const dag = Number(String(waarde).slice(8, 10));
  ok(`${doc} staat op of na 2026-11-17, met de dag`, /^\d{4}-\d{2}-\d{2}$/.test(waarde) && waarde >= '2026-11-17', waarde);
  ok(`  NL: "Laatst bijgewerkt: ${dag} november 2026"`, bijgewerktOp(doc, 'nl') === `Laatst bijgewerkt: ${dag}\u00a0november 2026`, bijgewerktOp(doc, 'nl'));
  ok(`  EN: "Last updated: ${dag} November 2026"`, bijgewerktOp(doc, 'en').startsWith(`Last updated: ${dag}\u00a0November 2026`), bijgewerktOp(doc, 'en'));
}
/* levering 119 (proefronde P6-10): ook het cookiebeleid staat nu op de dag. De maandvorm toetsen we met een tijdelijke
   waarde, die we meteen weer weghalen. */
LAATST_BIJGEWERKT.__maandproef = '2026-11';
ok('een document met alleen de maand blijft "november 2026"', bijgewerktOp('__maandproef', 'nl') === 'Laatst bijgewerkt: november 2026', bijgewerktOp('__maandproef', 'nl'));
delete LAATST_BIJGEWERKT.__maandproef;

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
