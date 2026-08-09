// VISUAILS — de factuur-pdf, getest.
//
// WAAROM DIT BESTAAT. src/lib/invoicePdf.js is het enige stuk code dat bepaalt
// wat er op een factuur staat, en een factuur is het enige document dat we
// afgeven waarvan de INHOUD wettelijk is voorgeschreven. Een pdf die er goed
// uitziet maar het btw-nummer van de afnemer mist bij een verlegging is een
// formeel gebrekkige factuur, en dat merk je niet bij het versturen — dat merkt
// een controleur jaren later, over de hele reeks. Dus wordt hier niet getest of
// er een pdf uitkomt, maar of de VERPLICHTE TEKSTEN erin staan.
//
// HOE ER IN EEN PDF GEZOCHT WORDT. pdf-lib comprimeert content streams met
// Flate en zet tekst neer als hex-strings, dus grep op de bytes vindt niets.
// extractText() hieronder doet wat een lezer doet: elke stream uitpakken, de
// hex-strings uit de tekst-operators halen, en WinAnsi terug naar Unicode
// decoderen. Dat is de enige manier waarop een test kan beweren dat "Btw
// verlegd" ECHT op het papier staat en niet alleen in een variabele zat.
//
// WAT HIER WORDT GECONTROLEERD, in volgorde van wat het kost als het fout gaat:
//
//   1 · De drie btw-behandelingen zetten de juiste vaste teksten op de pdf, in
//       beide talen. Dit is de dure: verlegging zonder artikel 196 of zonder het
//       nummer van de afnemer is een gebrek per factuur.
//   2 · De btw-regel VERDWIJNT NIET bij 0%. Hij toont 0,00. BRIEF-14 eist dat
//       expliciet en het is precies wat een generator "opruimt".
//   3 · Het totaal op het papier is netto + btw. Niet grossCents op goed
//       vertrouwen overnemen: een document dat niet optelt is erger dan een
//       afrondingsverschil bovenstrooms.
//   4 · Veertig regels leveren meer dan één pagina, en de tweede pagina weet
//       nog van welke factuur hij is.
//   5 · Twee keer dezelfde invoer geeft dezelfde bytes, want een gearchiveerde
//       factuur die bij hernieuwd renderen verandert is geen archief.
//   6 · Ontbrekende optionele velden en een naam met Poolse letters laten het
//       niet crashen. Een render die faalt is een klant zonder factuur.

import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  renderInvoicePdf, formatEuro, formatQty, formatDate, winAnsi,
} from '../src/lib/invoicePdf.js';

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else fail++;
  console.log(`${ok ? ' ok  ' : 'FAIL '} ${label.padEnd(62)} expected ${JSON.stringify(expected)}  got ${JSON.stringify(actual)}`);
}

// ── DE LEZER ─────────────────────────────────────────────────────────────────
// WinAnsi is Latin-1 behalve 0x80-0x9F; zonder deze tabel wordt een euroteken
// U+0080 en mislukt elke assertie over een bedrag.
const WINANSI_HIGH = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
  0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

function fromWinAnsi(buf) {
  let out = '';
  for (const byte of buf) {
    if (byte >= 0x80 && byte <= 0x9f) out += WINANSI_HIGH[byte] ?? '?';
    else out += String.fromCharCode(byte);
  }
  return out;
}

/** Every content stream in the file, inflated. */
function streamsOf(bytes) {
  const raw = Buffer.from(bytes);
  const latin = raw.toString('latin1');
  const chunks = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    if (end === -1) continue;
    const slice = raw.subarray(start, end);
    let text;
    // Streams that are not Flate (or are object streams full of dictionaries)
    // simply contribute nothing that matches the text operators below.
    try { text = zlib.inflateSync(slice).toString('latin1'); }
    catch { text = slice.toString('latin1'); }
    chunks.push(text);
  }
  return chunks;
}

// WAAROM DE COÖRDINATEN MEEKOMEN. Een eerste versie van deze lezer haalde
// alleen de tekst eruit, en die versie vond ook tekst die BUITEN de pagina was
// getekend: haal de paginaovergang uit drawTable() en alle veertig regels staan
// nog steeds in de content stream, op y = -300. De test bleef groen terwijl de
// factuur onleesbaar was. Vandaar dat elke run zijn x, y en fontgrootte
// meeneemt, en dat er verderop een assertie staat dat alles binnen het blad
// valt. Zonder dat is "de tekst staat erin" geen bewijs dat hij te zien is.
const RUN_RE = /\/(Helvetica(?:-Bold)?)-\d+ ([\d.]+) Tf[\s\S]{0,80}?1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*<([0-9A-Fa-f\s]*)>\s*Tj/g;

/** Every text-showing operator in the file, with where it was put. */
function extractRuns(bytes) {
  const runs = [];
  for (const chunk of streamsOf(bytes)) {
    for (const m of chunk.matchAll(RUN_RE)) {
      runs.push({
        text: fromWinAnsi(Buffer.from(m[5].replace(/\s+/g, ''), 'hex')),
        bold: m[1] === 'Helvetica-Bold',
        size: Number(m[2]),
        x: Number(m[3]),
        y: Number(m[4]),
      });
    }
    // A literal (string) Tj is not what pdf-lib emits for a WinAnsi font today,
    // but a version bump must not silently blind this reader.
    const literals = [...chunk.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)];
    if (literals.length) {
      for (const lit of literals) {
        runs.push({ text: lit[1].replace(/\\([()\\])/g, '$1'), bold: false, size: 0, x: NaN, y: NaN });
      }
    }
  }
  return runs;
}

function extractText(bytes) {
  return extractRuns(bytes).map((r) => r.text);
}

function textOf(bytes) {
  return extractText(bytes).join('\n');
}

// Helvetica's own metrics, so the test can measure a run the way the renderer
// did and say whether it stayed inside its column.
const metricDoc = await PDFDocument.create();
const METRIC = {
  regular: await metricDoc.embedFont(StandardFonts.Helvetica),
  bold: await metricDoc.embedFont(StandardFonts.HelveticaBold),
};
function runWidth(run) {
  return (run.bold ? METRIC.bold : METRIC.regular).widthOfTextAtSize(run.text, run.size);
}

const BOX = { left: 47.5, right: 548, bottom: 30, top: 813 };

/** Which runs fall outside the printable area of the sheet. */
function offPage(bytes) {
  return extractRuns(bytes).filter((r) => {
    if (!Number.isFinite(r.x) || r.text === '') return false;
    return r.y < BOX.bottom || r.y > BOX.top
      || r.x < BOX.left || r.x + runWidth(r) > BOX.right;
  });
}

async function pageCount(bytes) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

// ── DE INVOER ────────────────────────────────────────────────────────────────
// Eén basisfactuur, en elke test verandert er precies één ding aan, zodat een
// rode test aanwijst wat hem rood maakte.

const SELLER = {
  name: 'VISUAILS',
  address: ['Voorbeeldstraat 12', '1234 AB Rotterdam'],
  vat: 'NL005407575B96',
  kvk: '99742993',
  email: 'hello@visuails.com',
  iban: 'NL91ABNA0417164300',
};

function base(over = {}) {
  return {
    number: 'VIS-2026-0001',
    date: '2026-08-09',
    dueDate: '2026-08-16',
    lang: 'nl',
    seller: { ...SELLER },
    customer: {
      name: 'Anna de Vries',
      company: 'Studio Noord BV',
      address: ['Keizersgracht 1', '1015 CD Amsterdam'],
      country: 'NL',
      vat: null,
    },
    lines: [
      { description: 'Full Drop — 12 productfoto’s', qty: 12, unitCents: 12500, totalCents: 150000 },
      { description: 'Extra achtergrond', qty: 1, unitCents: 4500, totalCents: 4500 },
    ],
    netCents: 154500,
    // 0.21 EN NIET 21, want dat is wat orders.vat_rate bevat: vatDecision() geeft
    // `rate: 0.21`. De fixture stond hier op 21 en dat is precies waarom 147
    // assertions "VAT 0.21%" op een echte factuur niet hebben gezien — zie de noot
    // bij vatRate in prepare(). Een fixture die niet lijkt op de echte data toetst
    // de code tegen een wereld die niet bestaat.
    vatRate: 0.21,
    vatCents: 32445,
    grossCents: 186945,
    treatment: 'nl_standard',
    reference: 'VIS-2608-4471',
    paidAt: null,
    viesConsultation: null,
    ...over,
  };
}

function reverseCharge(lang = 'nl') {
  return base({
    lang,
    customer: {
      name: 'Jonas Weber',
      company: 'Weber Handel GmbH',
      address: ['Hauptstrasse 5', '10115 Berlin'],
      country: 'DE',
      vat: 'DE123456789',
    },
    vatRate: 0,
    vatCents: 0,
    grossCents: 154500,
    treatment: 'eu_reverse_charge',
    viesConsultation: 'VIES 2026-08-09T09:14:00Z ref WAPIAAAAX1234',
  });
}

function outsideScope(lang = 'nl') {
  return base({
    lang,
    customer: {
      name: 'Maya Chen',
      company: 'Chen Studio LLC',
      address: ['500 Market St', 'San Francisco CA 94105'],
      country: 'US',
      vat: null,
    },
    vatRate: 0,
    vatCents: 0,
    grossCents: 154500,
    treatment: 'outside_scope',
  });
}

// ── 1 · ER KOMT EEN PDF UIT ──────────────────────────────────────────────────
console.log('\n── de bytes ──');

const nlStandard = await renderInvoicePdf(base());
check('returns a Uint8Array', nlStandard instanceof Uint8Array, true);
check('and it is a pdf', Buffer.from(nlStandard.subarray(0, 5)).toString('latin1'), '%PDF-');
check('one invoice is one page', await pageCount(nlStandard), 1);

const nlText = textOf(nlStandard);
check('the reader actually reads something', nlText.length > 200, true);

// ── 2 · DE WETTELIJK VERPLICHTE VELDEN ───────────────────────────────────────
console.log('\n── wat er op MOET staan ──');

check('invoice number', nlText.includes('VIS-2026-0001'), true);
check('invoice date, in words, in Dutch', nlText.includes('9 augustus 2026'), true);
check('seller name', nlText.includes('VISUAILS'), true);
check('seller address', nlText.includes('Voorbeeldstraat 12'), true);
check('seller postcode line', nlText.includes('1234 AB Rotterdam'), true);
check('seller VAT number', nlText.includes('NL005407575B96'), true);
check('KVK number', nlText.includes('99742993'), true);
check('customer name', nlText.includes('Anna de Vries'), true);
check('customer company', nlText.includes('Studio Noord BV'), true);
check('customer address', nlText.includes('Keizersgracht 1'), true);
check('line description', nlText.includes('Full Drop'), true);
check('line quantity', nlText.includes('12'), true);
check('line unit price', nlText.includes(formatEuro(12500, 'nl')), true);
check('line total', nlText.includes(formatEuro(150000, 'nl')), true);
check('the net amount', nlText.includes(formatEuro(154500, 'nl')), true);
check('the VAT amount', nlText.includes(formatEuro(32445, 'nl')), true);
check('the VAT RATE, next to the amount', nlText.includes('Btw 21%'), true);
check('the grand total', nlText.includes(formatEuro(186945, 'nl')), true);
check('a domestic invoice says nothing about verlegging', /verlegd/i.test(nlText), false);
check('and nothing about article 196', nlText.includes('196'), false);
check('a page number', nlText.includes('Pagina 1 van 1'), true);

const enStandard = await renderInvoicePdf(base({ lang: 'en' }));
const enText = textOf(enStandard);
check('the English invoice is labelled INVOICE', enText.includes('INVOICE'), true);
check('English field labels', enText.includes('Invoice number'), true);
check('English date', enText.includes('9 August 2026'), true);
check('English VAT rate label', enText.includes('VAT 21%'), true);
check('English amounts use the English separators', enText.includes('€1,545.00'), true);
check('English page number', enText.includes('Page 1 of 1'), true);
check('the Dutch invoice does NOT use English separators', nlText.includes('€1,545.00'), false);
check('the Dutch invoice uses the Dutch ones', nlText.includes('€1.545,00'), true);

// ── 3 · VERLEGGING ───────────────────────────────────────────────────────────
// Alle drie de onderdelen los getest, want het is precies één ervan dat
// wegvalt als iemand de layout herschikt.
console.log('\n── btw verlegd (eu) ──');

const rcNl = await renderInvoicePdf(reverseCharge('nl'));
const rcNlText = textOf(rcNl);
check('the words, in Dutch', rcNlText.includes('Btw verlegd'), true);
check('article 196, in Dutch', rcNlText.includes('artikel 196 Richtlijn 2006/112/EG'), true);
check('the CUSTOMER VAT number is on the invoice', rcNlText.includes('DE123456789'), true);
check('and it is labelled as the customer\'s', rcNlText.includes('Btw-nummer afnemer'), true);
check('our own number is still there too', rcNlText.includes('NL005407575B96'), true);
check('the VAT ROW did not disappear', /Btw 0%/.test(rcNlText), true);
check('and it SHOWS 0,00', rcNlText.includes('€0,00'), true);
check('the total is the net amount', rcNlText.includes(formatEuro(154500, 'nl')), true);
check('the VIES evidence is on the document', rcNlText.includes('WAPIAAAAX1234'), true);

const rcEn = await renderInvoicePdf(reverseCharge('en'));
const rcEnText = textOf(rcEn);
check('the words, in English', rcEnText.includes('VAT reverse charged'), true);
check('article 196, in English', rcEnText.includes('Article 196 Directive 2006/112/EC'), true);
check('no Dutch text leaks into the English invoice', /verlegd/i.test(rcEnText), false);
check('customer VAT number, English label', rcEnText.includes('Customer VAT number'), true);
check('the English VAT row shows 0.00', rcEnText.includes('€0.00'), true);

// ── 4 · BUITEN DE EUROPESE BTW ───────────────────────────────────────────────
console.log('\n── buiten de europese btw ──');

const osNl = await renderInvoicePdf(outsideScope('nl'));
const osNlText = textOf(osNl);
check('it says so, in Dutch', osNlText.includes('buiten de Europese btw'), true);
check('it does NOT say verlegd', /verlegd/i.test(osNlText), false);
check('and does NOT cite article 196', osNlText.includes('196'), false);
check('the VAT row is still there at 0,00', osNlText.includes('€0,00'), true);

const osEn = await renderInvoicePdf(outsideScope('en'));
const osEnText = textOf(osEn);
check('it says so, in English', osEnText.includes('outside the scope of European VAT'), true);
check('English outside-scope invoice is not reverse charged',
  /reverse charged/i.test(osEnText), false);

// ── 5 · HET TOTAAL TELT OP ───────────────────────────────────────────────────
console.log('\n── het totaal is netto + btw ──');

check('total = net + vat, domestic', nlText.includes(formatEuro(154500 + 32445, 'nl')), true);
check('total = net + vat, reverse charge', rcNlText.includes(formatEuro(154500 + 0, 'nl')), true);

// Een verkeerde grossCents mag NIET op het papier komen: het document moet
// optellen, wat de aanroeper ook meestuurt.
const wrongGross = await renderInvoicePdf(base({ grossCents: 999999 }));
const wrongGrossText = textOf(wrongGross);
check('a wrong grossCents is not printed', wrongGrossText.includes(formatEuro(999999, 'nl')), false);
check('the printed total is net + vat instead',
  wrongGrossText.includes(formatEuro(154500 + 32445, 'nl')), true);

// ── 6 · PAGINAOVERGANG ───────────────────────────────────────────────────────
console.log('\n── veertig regels ──');

const manyLines = Array.from({ length: 40 }, (_, i) => ({
  description: `Regel ${i + 1} — productfoto set`,
  qty: 1,
  unitCents: 2500,
  totalCents: 2500,
}));
const big = await renderInvoicePdf(base({
  lines: manyLines, netCents: 100000, vatCents: 21000, grossCents: 121000,
}));
const bigPages = await pageCount(big);
const bigText = textOf(big);
check('40 lines do not fit on one page', bigPages > 1, true);
check('every line made it onto the document',
  manyLines.every((l) => bigText.includes(l.description)), true);
check('the continuation page names the invoice', bigText.includes('(vervolg)'), true);
check('the page numbers know the total', bigText.includes(`Pagina ${bigPages} van ${bigPages}`), true);
check('the totals block survived the page break', bigText.includes(formatEuro(121000, 'nl')), true);
check('and so did the VAT rate', bigText.includes('Btw 21%'), true);
// De belangrijkste van deze reeks: niet "staat de regel in het bestand" maar
// "staat de regel OP het blad". Zonder paginaovergang zit regel 30 nog wel in
// de content stream, alleen dan op y = -100.
check('nothing was drawn off the sheet', offPage(big).map((r) => `${r.text}@${r.y}`), []);
check('every page carries its own page number',
  Array.from({ length: bigPages }, (_, i) => bigText.includes(`Pagina ${i + 1} van ${bigPages}`)),
  Array.from({ length: bigPages }, () => true));

const one = await renderInvoicePdf(base({
  lines: [{ description: 'Eén regel', qty: 1, unitCents: 1000, totalCents: 1000 }],
  netCents: 1000, vatCents: 210, grossCents: 1210,
}));
check('one line is still one page', await pageCount(one), 1);
check('and it still totals', textOf(one).includes(formatEuro(1210, 'nl')), true);

// ── 7 · DETERMINISME ─────────────────────────────────────────────────────────
// Een gearchiveerde factuur die bij hernieuwd renderen andere bytes geeft is
// geen archief. Vandaar ook de bronscan: new Date() en Math.random() horen hier
// niet te staan, en dat is makkelijker te bewaken dan te ontdekken.
console.log('\n── dezelfde bytes ──');

const twice = await renderInvoicePdf(base());
check('same input, same bytes',
  Buffer.compare(Buffer.from(nlStandard), Buffer.from(twice)) === 0, true);
const rcTwice = await renderInvoicePdf(reverseCharge('nl'));
check('same for a reverse-charge invoice',
  Buffer.compare(Buffer.from(rcNl), Buffer.from(rcTwice)) === 0, true);
check('a different invoice really does differ',
  Buffer.compare(Buffer.from(nlStandard), Buffer.from(enStandard)) === 0, false);

const source = readFileSync(new URL('../src/lib/invoicePdf.js', import.meta.url), 'utf8');
check('the module never reads the clock', /new Date\(\s*\)/.test(source), false);
check('nor Date.now()', /Date\.now\s*\(/.test(source), false);
check('nor rolls a die', /Math\.random/.test(source), false);
check('and never touches the filesystem', /require\(['"]fs['"]\)|from ['"]node:fs['"]/.test(source), false);

// ── 8 · ONTBREKENDE VELDEN ───────────────────────────────────────────────────
console.log('\n── wat er ontbreken mag ──');

const bare = await renderInvoicePdf({
  number: 'VIS-2026-0002',
  date: '2026-08-09',
  dueDate: null,
  lang: 'nl',
  seller: { name: 'VISUAILS', address: ['Voorbeeldstraat 12'], vat: 'NL005407575B96', kvk: '99742993', email: 'hello@visuails.com', iban: null },
  customer: { name: 'Piet', company: null, address: ['Dorpsstraat 1'], country: 'NL', vat: null },
  lines: [{ description: 'Sample', qty: 1, unitCents: 99, totalCents: 99 }],
  netCents: 99, vatRate: 0.21, vatCents: 21, grossCents: 120,
  treatment: 'nl_standard', reference: null, paidAt: null, viesConsultation: null,
});
const bareText = textOf(bare);
check('no company, no iban, no due date: still renders', bareText.includes('VIS-2026-0002'), true);
check('the name takes the company\'s place', bareText.includes('Piet'), true);
check('and no "null" ended up on the paper', /null/i.test(bareText), false);
check('the mandatory numbers are still there',
  bareText.includes('NL005407575B96') && bareText.includes('99742993'), true);

const fourLines = await renderInvoicePdf(base({
  customer: {
    name: 'Sofia Rossi',
    company: 'Rossi Design SRL',
    address: ['Via Roma 100', 'Interno 4', 'Scala B', '00184 Roma'],
    country: 'IT',
    vat: 'IT12345678901',
  },
}));
check('a four-line address renders', textOf(fourLines).includes('00184 Roma'), true);
check('all four lines are there', textOf(fourLines).includes('Scala B'), true);

const oneLine = await renderInvoicePdf(base({
  customer: { name: 'Kees', company: null, address: ['Postbus 9'], country: 'NL', vat: null },
}));
check('a one-line address renders too', textOf(oneLine).includes('Postbus 9'), true);

const paid = await renderInvoicePdf(base({ paidAt: '2026-08-09' }));
check('a paid invoice says so', textOf(paid).includes('Betaald op 9 augustus 2026'), true);
check('and does not ask to be paid again', /Te betalen voor/.test(textOf(paid)), false);

// Robustness at the edges the caller should never hit but might.
check('no lines at all does not throw',
  (await renderInvoicePdf(base({ lines: [], netCents: 0, vatCents: 0, grossCents: 0 }))) instanceof Uint8Array, true);
check('a missing seller object does not throw',
  (await renderInvoicePdf({ number: 'X', date: '2026-08-09', lines: [] })) instanceof Uint8Array, true);
check('an empty object does not throw',
  (await renderInvoicePdf({})) instanceof Uint8Array, true);
check('no argument at all does not throw',
  (await renderInvoicePdf()) instanceof Uint8Array, true);
check('an unknown language falls back to Dutch',
  textOf(await renderInvoicePdf(base({ lang: 'de' }))).includes('Factuurnummer'), true);

// ── 9 · TEKST DIE NIET IN HELVETICA PAST ─────────────────────────────────────
// Dit is de crash die het waard was om te voorkomen: WinAnsi kent Ł niet en
// pdf-lib gooit dan, halverwege het renderen, zonder factuur als resultaat.
console.log('\n── namen die niet in winansi passen ──');

// Ł en ź kent WinAnsi niet; ó wél (die staat in Latin-1) en die blijft dus
// staan. Transliteratie is een laatste redmiddel, geen ASCII-beleid.
check('Ł and ź are transliterated, not fatal', winAnsi('Łódź'), 'Lódz');
check('and an accent WinAnsi does have is kept', winAnsi('Łódź').includes('ó'), true);
check('a Latin-1 name is left alone', winAnsi('Müller & Zoon'), 'Müller & Zoon');
check('the euro sign survives', winAnsi('€ 10'), '€ 10');
check('a curly apostrophe survives', winAnsi('foto’s'), 'foto’s');
check('a tab becomes a space', winAnsi('a\tb'), 'a b');
check('CJK becomes a visible question mark', winAnsi('文'), '?');
check('null is an empty string, not "null"', winAnsi(null), '');
check('undefined too', winAnsi(undefined), '');

const polish = await renderInvoicePdf(base({
  customer: {
    name: 'Michał Wiśniewski',
    company: 'Łódź Studio Sp. z o.o.',
    address: ['ul. Piotrkowska 5', '90-001 Łódź'],
    country: 'PL',
    vat: 'PL1234567890',
  },
  // netCents MOET meeveranderen met de regels. Sinds 9 augustus 2026 weigert
  // prepare() een factuur waarvan de regels niet optellen tot het subtotaal, en
  // deze fixture was de eerste die daarop stukliep — precies de fout die de
  // controle moet vinden, hier per ongeluk in een test gemaakt.
  lines: [{ description: 'Zdjęcia produktowe — 文字 — set', qty: 3, unitCents: 5000, totalCents: 15000 }],
  netCents: 15000, vatCents: 3150, grossCents: 18150,
}));
const polishText = textOf(polish);
check('a Polish customer gets an invoice at all', polishText.includes('VIS-2026-0001'), true);
check('the name is latinised', polishText.includes('Michal Wisniewski'), true);
check('the city too', polishText.includes('90-001 Lódz'), true);
check('and the CJK in a description did not kill the render',
  polishText.includes('Zdjecia produktowe'), true);

// ── 10 · LANGE OMSCHRIJVINGEN ────────────────────────────────────────────────
console.log('\n── afbreken ──');

const longDesc = 'Full Drop met twaalf productfoto’s, twee extra achtergronden, '
  + 'retouche per foto, een videoloop van vijftien seconden en levering in vier formaten '
  + 'voor webshop, marktplaatsen, advertenties en social';
const wrapped = await renderInvoicePdf(base({
  lines: [{ description: longDesc, qty: 1, unitCents: 250000, totalCents: 250000 }],
  netCents: 250000, vatCents: 52500, grossCents: 302500,
}));
const wrappedRuns = extractRuns(wrapped);
const descRuns = wrappedRuns.filter((r) => longDesc.includes(r.text.slice(0, 12)) && r.text.length > 8);
check('the long description is broken over several runs', descRuns.length > 2, true);
check('the beginning survives', wrappedRuns.some((r) => r.text.startsWith('Full Drop met')), true);
check('the end survives', wrappedRuns.some((r) => r.text.includes('social')), true);
// Measured, not guessed at by character count: a wrapped line that is wider
// than the description column runs straight through the Aantal column.
check('no description line is wider than its column',
  descRuns.every((r) => runWidth(r) <= 236), true);
check('and none of it left the sheet', offPage(wrapped).map((r) => r.text), []);
check('and it still fits on one page', await pageCount(wrapped), 1);

const unbreakable = await renderInvoicePdf(base({
  lines: [{
    description: 'https://visuails.com/drops/2026/08/09/een-hele-lange-bestandsnaam-zonder-spaties-die-nergens-kan-afbreken.zip',
    qty: 1, unitCents: 100, totalCents: 100,
  }],
  netCents: 100, vatCents: 21, grossCents: 121,
}));
check('an unbreakable string is hard-broken rather than overflowing',
  extractText(unbreakable).filter((r) => r.includes('visuails.com') || r.includes('bestandsnaam')).length >= 2, true);
check('and it does not run off the sheet either', offPage(unbreakable).map((r) => r.text), []);

// ── 9b · HET BTW-TARIEF, IN BEIDE VORMEN ─────────────────────────────────────
//
// De bug die op VIS-2026-0001 stond: `VAT 0.21%`. Deze reeks toetst dat een breuk
// én een percentage allebei als percentage op papier komen, want beide vormen
// bestaan nu in het wild — orders.vat_rate bewaart de breuk, en mijn eigen oudere
// momentopnames bewaren wat de fixtures gaven.
console.log('\n── het btw-tarief ──');

const rateText = async (rate) => textOf(await renderInvoicePdf(base({
  vatRate: rate, netCents: 154500, vatCents: 32445, grossCents: 186945,
})));

check('0.21 wordt 21%', (await rateText(0.21)).includes('Btw 21%'), true);
check('21 blijft 21%', (await rateText(21)).includes('Btw 21%'), true);
check('0.09 wordt 9%', (await rateText(0.09)).includes('Btw 9%'), true);
check('9 blijft 9%', (await rateText(9)).includes('Btw 9%'), true);
// Geen enkel land heeft een tarief onder de 1%, dus alles tussen 0 en 1 is een
// breuk. Dat is wat deze omzetting eenduidig maakt en niet een gok.
check('0.215 wordt 21,5% en verliest geen halve procent',
  (await rateText(0.215)).includes('Btw 21,5%'), true);
check('nul blijft nul, in beide vormen', (await rateText(0)).includes('Btw 0%'), true);
// En het tarief hoort NERGENS als kommagetal met een procentteken te staan.
check('nooit "0.21%" of "0,21%" op het blad',
  /0[.,]21\s*%/.test(await rateText(0.21)), false);

// ── 9c · HET MERKTEKEN ───────────────────────────────────────────────────────
//
// Vector, niet raster: de paden staan als padnotatie in de contentstroom. Zonder
// deze controle is "het logo staat erop" iets wat je op een schermafdruk ziet en
// niet iets wat de suite bewaakt — en dit is precies het soort ding dat verdwijnt
// bij een herschrijving van de kop.
console.log('\n── het merkteken ──');

const markPdf = await renderInvoicePdf(base());
const markStreams = streamsOf(markPdf).join('\n');
// De vul-operator van PDF. Die staat alleen in de stroom als er een pad is
// getekend; tekst en lijnen leveren hem niet op (een lijn eindigt op S).
check('er wordt een gevuld pad getekend', /(^|\s)f\*?(\s|$)/m.test(markStreams), true);
// Twee subpaden, dus minstens twee keer een 'moveto' in de kop. Het teken bestaat
// uit de V en de bliksem eromheen; verdwijnt er één, dan is het geen merkteken meer.
check('twee subpaden, niet één', (markStreams.match(/(^|\s)m(\s|$)/gm) || []).length >= 2, true);
check('het blijft vector: geen ingesloten afbeelding',
  Buffer.from(markPdf).toString('latin1').includes('/Image'), false);
check('en het teken kost bijna niets', markPdf.length < 6000, true);

// ── 10a · EEN FACTUUR DIE NIET OPTELT WORDT NIET GEDRUKT ─────────────────────
//
// Toegevoegd 9 augustus 2026, nadat een voorbeeldfactuur een regel van €1.020,00
// boven een subtotaal van €890,00 zette. De invoer was fout en deze module drukte
// het zonder klagen af. Een factuur die niet optelt is formeel gebrekkig, en dat
// is een gebrek dat je jaren later in bulk terugkrijgt — dus liever een fout hier,
// want een ONTBREKENDE factuur is herstelbaar (issueInvoice() laat de rij op
// 'pending' staan) en een verkeerde niet.
console.log('\n── de factuur moet optellen ──');

async function refuses(name, invoice) {
  try {
    await renderInvoicePdf(invoice);
    check(name, 'gedrukt', 'geweigerd');
  } catch (e) {
    check(name, e.message.includes('niet optelt') ? 'geweigerd' : e.message, 'geweigerd');
  }
}

await refuses('een regel die hoger is dan het subtotaal', base({
  lines: [{ description: 'X', qty: 1, unitCents: 102000, totalCents: 102000 }],
  netCents: 89000, vatCents: 0, grossCents: 89000,
}));
await refuses('twee regels waarvan er één vergeten is in het subtotaal', base({
  lines: [
    { description: 'A', qty: 1, unitCents: 150000, totalCents: 150000 },
    { description: 'B', qty: 1, unitCents: 4500, totalCents: 4500 },
  ],
  netCents: 150000, vatCents: 31500, grossCents: 181500,
}));
await refuses('een regel zonder totaal', base({
  lines: [{ description: 'A', qty: 1, unitCents: 1000 }],
  netCents: 1000, vatCents: 210, grossCents: 1210,
}));

// En wat WEL mag, want anders is de controle te streng in plaats van te scherp.
check('een kloppende factuur gaat gewoon door',
  (await renderInvoicePdf(base())) instanceof Uint8Array, true);
check('drie regels die samen kloppen mogen ook', (await renderInvoicePdf(base({
  lines: [
    { description: 'A', qty: 1, unitCents: 100000, totalCents: 100000 },
    { description: 'B', qty: 1, unitCents: 50000, totalCents: 50000 },
    { description: 'C', qty: 1, unitCents: 4500, totalCents: 4500 },
  ],
}))) instanceof Uint8Array, true);
// Een factuur ZONDER regels is niet tegenstrijdig, alleen leeg — en er is al een
// test die dat toestaat (sectie 8). Hier nog een keer expliciet naast de
// weigeringen, zodat het geen ongelukje kan worden dat de controle mee opeet.
check('nul regels blijft toegestaan', (await renderInvoicePdf(base({
  lines: [], netCents: 154500,
}))) instanceof Uint8Array, true);

// ── 10b · ALLES BLIJFT BINNEN HET BLAD ───────────────────────────────────────
console.log('\n── binnen het blad ──');

for (const [name, bytes] of [
  ['domestic nl', nlStandard],
  ['domestic en', enStandard],
  ['reverse charge nl', rcNl],
  ['reverse charge en', rcEn],
  ['outside scope nl', osNl],
  ['no optional fields', bare],
  ['four-line address', fourLines],
  ['a paid invoice', paid],
  ['a Polish customer', polish],
]) {
  check(`${name} stays inside the page`, offPage(bytes).map((r) => `${r.text}@${r.x},${r.y}`), []);
}

// ── 11 · DE FORMATTERS ───────────────────────────────────────────────────────
console.log('\n── bedragen en datums ──');

check('nl thousands', formatEuro(123456, 'nl'), '€1.234,56');
check('en thousands', formatEuro(123456, 'en'), '€1,234.56');
check('nl millions', formatEuro(123456789, 'nl'), '€1.234.567,89');
check('en millions', formatEuro(123456789, 'en'), '€1,234,567.89');
check('zero, nl', formatEuro(0, 'nl'), '€0,00');
check('zero, en', formatEuro(0, 'en'), '€0.00');
check('under a euro', formatEuro(99, 'nl'), '€0,99');
check('exactly a thousand', formatEuro(100000, 'nl'), '€1.000,00');
check('a credit amount keeps its sign', formatEuro(-12345, 'nl'), '-€123,45');
check('junk is not NaN on an invoice', formatEuro(undefined, 'nl'), '€0,00');
check('an unknown language formats as Dutch', formatEuro(123456, 'de'), '€1.234,56');

check('an integer quantity has no decimals', formatQty(12, 'nl'), '12');
check('a fractional quantity, nl', formatQty(1.5, 'nl'), '1,5');
check('a fractional quantity, en', formatQty(1.5, 'en'), '1.5');
check('the VAT rate reads as a whole number', formatQty(21, 'nl'), '21');

check('date, nl', formatDate('2026-08-09', 'nl'), '9 augustus 2026');
check('date, en', formatDate('2026-08-09', 'en'), '9 August 2026');
check('a timestamp is truncated to its day', formatDate('2026-01-31T22:10:00Z', 'nl'), '31 januari 2026');
check('an unparseable date is echoed, never blanked', formatDate('vandaag', 'nl'), 'vandaag');
check('a null date does not print "null"', formatDate(null, 'nl'), '');

// ── 12 · DE RUNTIME ──────────────────────────────────────────────────────────
// Dit draait in een Pages Function, dus in workerd, en daar bestaan Buffer,
// process en setImmediate niet — ook niet met nodejs_compat aan, tenzij je ze
// importeert. Een echte workerd-run zou beter zijn dan dit, maar dan moet
// wrangler in de devDependencies en die keuze is niet aan deze module. Wat hier
// gebeurt is het goedkope alternatief dat de fout die het kost wél vangt: haal
// de Node-globals weg en render opnieuw. Als er ergens een Buffer in glipt,
// vindt deze test hem voordat de eerste klant hem vindt.
console.log('\n── zonder node ──');

const nodeGlobals = ['Buffer', 'process', 'global', 'setImmediate'];
const savedGlobals = {};
let workerish = null;
let workerishError = null;
try {
  for (const k of nodeGlobals) { savedGlobals[k] = globalThis[k]; delete globalThis[k]; }
  workerish = await renderInvoicePdf(reverseCharge('nl'));
} catch (err) {
  workerishError = String(err && err.message);
} finally {
  for (const k of nodeGlobals) globalThis[k] = savedGlobals[k];
}
check('renders with the Node globals removed', workerishError, null);
check('and produces the very same bytes',
  workerish ? Buffer.compare(Buffer.from(workerish), Buffer.from(rcNl)) === 0 : false, true);
check('the module imports nothing but pdf-lib',
  source.match(/^import .*$/gm), ["import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';"]);

console.log(`\n${pass}/${pass + fail} passed`);
if (fail) {
  console.log(`${fail} FAILED`);
  process.exit(1);
}
console.log('all passed');
