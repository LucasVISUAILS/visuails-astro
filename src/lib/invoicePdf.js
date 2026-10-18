// VISUAILS — een factuur als pdf, en niets anders.
//
// WHY THIS FILE EXISTS
// BRIEF-14 says the invoice is generated from our own data ("generate from our
// own data, do not rely on Stripe's template"), and the Dutch rules for what
// must appear on an invoice are not a matter of taste: number, date, both
// parties' names and addresses, our VAT number and KVK number, per line a
// description with quantity, unit price and line total, and then net, the VAT
// amount WITH its rate, and the total. Reverse-charged invoices additionally
// carry the customer's VAT number, the words "btw verlegd" and the reference to
// article 196 of Directive 2006/112/EC. Non-EU invoices have to say the supply
// falls outside European VAT. Miss one of those and the invoice is formally
// defective, which is the kind of defect that surfaces years later during an
// audit, in bulk.
//
// SO THIS MODULE IS DELIBERATELY DUMB AND DELIBERATELY ALONE. It takes a plain
// object and returns bytes. It does not know about D1, the numbering sequence,
// mail, Mollie, or env. It never reads the clock and never rolls a die: every
// date on the document comes out of the object it was handed. That is what
// makes it testable, and it is also what makes a re-render of invoice
// VIS-2026-0001 in 2031 produce the same file it produced in 2026 — which is
// the whole point of an archived invoice.
//
// WHY pdf-lib
// The runtime is a Cloudflare Pages Function, i.e. workerd, not Node. Even with
// `nodejs_compat` on, anything that reaches for `fs` at render time (Puppeteer,
// wkhtmltopdf, PDFKit's font loading, @react-pdf's fontkit path) is out. pdf-lib
// is pure JavaScript, has no native module, and its only heavy dependency
// (pako, for Flate) is pure JS too. Crucially, its fourteen standard PDF fonts
// are metric tables compiled into the package: drawing text in Helvetica needs
// no font file, so there is nothing to read from disk and nothing to ship in an
// asset bucket. The alternative that also runs here — building the PDF byte
// syntax by hand — is a few hundred lines of the same thing with a worse
// pagination story, so it is not worth the maintenance.
//
// THE PRICE OF THE STANDARD FONTS is that they are encoded in WinAnsi, which
// covers Latin-1 plus a handful of typographic extras and nothing else. A
// Polish customer named "Łódź" would otherwise not produce a wrong glyph, it
// would THROW mid-render and there would be no invoice at all. So every string
// that reaches the page goes through winAnsi() first, which transliterates what
// it can and substitutes the rest. A latinised name on a PDF is a cosmetic
// problem; a crash on the invoice route is a customer without an invoice.
//
// AMOUNTS: cents in, euros out, and the total is the sum of what is above it.
// `grossCents` is deliberately NOT printed as-is. A document whose total does
// not equal the net plus the VAT shown directly above it is worse than a
// document with a rounding difference somewhere upstream, so the figure on the
// paper is always netCents + vatCents. If those two disagree with grossCents
// that is a bug in the caller's arithmetic, and it belongs in the caller's
// tests, not smuggled onto an invoice.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ─────────────────────────────────────────────────────────────────────────────
// TEKST — elke vaste tekst in nl en en. Geen enkele string staat los in de
// layout hieronder; als er een taal bij moet komen is dit de enige plek.

const MONTHS = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
};

const TEXT = {
  nl: {
    title: 'FACTUUR',
    number: 'Factuurnummer',
    date: 'Factuurdatum',
    due: 'Vervaldatum',
    billedTo: 'Factuur aan',
    sellerVat: 'Btw-nummer',
    sellerKvk: 'KVK-nummer',
    email: 'E-mail',
    iban: 'IBAN',
    reference: 'Referentie',
    customerVat: 'Btw-nummer afnemer',
    colDesc: 'Omschrijving',
    colQty: 'Aantal',
    colUnit: 'Stukprijs',
    colTotal: 'Totaal',
    net: 'Subtotaal (excl. btw)',
    vatRow: (rate) => `Btw ${rate}%`,
    vatRowReverse: 'Btw 0% - verlegd',
    vatRowOutside: 'Btw 0% - buiten de Europese btw',
    grossPayable: 'Totaal te betalen',
    grossPaid: 'Totaal',
    tegoedRow: 'Verrekend tegoed',
    restPaid: 'Betaald',
    restPayable: 'Nog te betalen',
    reverseShort: 'Btw verlegd',
    reverseArticle: 'artikel 196 Richtlijn 2006/112/EG',
    reverseBody: 'De btw wordt aangegeven door de afnemer in zijn eigen lidstaat.',
    outsideScope: 'Deze levering valt buiten de Europese btw. De dienst is belast in het land van de afnemer.',
    vies: 'VIES-controle',
    paidNote: (d) => `Betaald op ${d}. Dit is geen betalingsverzoek.`,
    dueNote: (d) => `Te betalen voor ${d}.`,
    ibanNote: (iban) => `Graag overmaken op ${iban} onder vermelding van het factuurnummer.`,
    continued: '(vervolg)',
    page: (n, total) => `Pagina ${n} van ${total}`,
  },
  en: {
    title: 'INVOICE',
    number: 'Invoice number',
    date: 'Invoice date',
    due: 'Due date',
    billedTo: 'Billed to',
    sellerVat: 'VAT number',
    sellerKvk: 'Chamber of Commerce',
    email: 'Email',
    iban: 'IBAN',
    reference: 'Reference',
    customerVat: 'Customer VAT number',
    colDesc: 'Description',
    colQty: 'Qty',
    colUnit: 'Unit price',
    colTotal: 'Total',
    net: 'Subtotal (excl. VAT)',
    vatRow: (rate) => `VAT ${rate}%`,
    vatRowReverse: 'VAT 0% - reverse charged',
    vatRowOutside: 'VAT 0% - outside the scope of European VAT',
    grossPayable: 'Total due',
    grossPaid: 'Total',
    tegoedRow: 'Credit applied',
    restPaid: 'Paid',
    restPayable: 'Still to pay',
    reverseShort: 'VAT reverse charged',
    reverseArticle: 'Article 196 Directive 2006/112/EC',
    reverseBody: 'VAT is to be accounted for by the customer in their own member state.',
    outsideScope: 'This supply falls outside the scope of European VAT. The place of supply is the customer’s country.',
    vies: 'VIES consultation',
    paidNote: (d) => `Paid on ${d}. This invoice is not a request for payment.`,
    dueNote: (d) => `Payable by ${d}.`,
    ibanNote: (iban) => `Please transfer to ${iban}, quoting the invoice number.`,
    continued: '(continued)',
    page: (n, total) => `Page ${n} of ${total}`,
  },
};

/*
 * ── DE CREDITNOTA, ALS OVERLAY OVER DEZELFDE TEKSTTABEL — 12 augustus 2026 ──
 *
 * Een creditnota is geen tweede document maar dezelfde factuur met andere woorden en
 * een omgekeerde bedoeling. Vandaar een overlay en geen tweede renderer: de opmaak, de
 * kolommen, de btw-mededelingen, het watermerk en de paginanummering zijn regel voor
 * regel dezelfde, en een tweede layoutbestand zou binnen een maand van het eerste
 * afwijken op een plek die niemand ziet.
 *
 * WELKE WOORDEN WEL VERANDEREN, en waarom precies deze:
 *
 *   · de TITEL, want dat is het enige dat een lezer in één oogopslag moet zien;
 *   · de labels bij het NUMMER en de DATUM, want "Factuurnummer" op een creditnota is
 *     verwarrend over wélk nummer het gaat;
 *   · de TOTAALREGEL: "Totaal gecrediteerd" en niet "Totaal te betalen" — dit is geen
 *     betalingsverzoek en mag daar niet op lijken;
 *   · en er komt één regel bij die zegt WELKE factuur gecrediteerd wordt. Zonder die
 *     verwijzing is een creditnota juridisch los zand.
 *
 * DE BEDRAGEN BLIJVEN POSITIEF. Een creditnota met minnetjes is ook gangbaar, maar dan
 * hangt de betekenis aan een tekentje dat wegvalt bij slecht printen of bij overtypen.
 * Het woord CREDITNOTA bovenaan doet dat werk beter, en de mededeling onderaan zegt het
 * nog een keer in een hele zin.
 */
const CREDIT_TEXT = {
  nl: {
    title: 'CREDITNOTA',
    number: 'Creditnotanummer',
    date: 'Creditnotadatum',
    billedTo: 'Creditnota aan',
    credits: 'Crediteert factuur',
    creditsDate: 'Factuurdatum',
    grossPaid: 'Totaal gecrediteerd',
    grossPayable: 'Totaal gecrediteerd',
    creditBody: 'Deze creditnota trekt het hierboven vermelde bedrag van de genoemde factuur terug. Dit is geen betalingsverzoek.',
    refundedNote: (d) => `Terugbetaald op ${d}.`,
    reasonLabel: 'Reden',
  },
  en: {
    title: 'CREDIT NOTE',
    number: 'Credit note number',
    date: 'Credit note date',
    billedTo: 'Credited to',
    credits: 'Credits invoice',
    creditsDate: 'Invoice date',
    grossPaid: 'Total credited',
    grossPayable: 'Total credited',
    creditBody: 'This credit note withdraws the amount above from the invoice named. It is not a request for payment.',
    refundedNote: (d) => `Refunded on ${d}.`,
    reasonLabel: 'Reason',
  },
};

/** Is dit een creditnota? Eén plek, zodat geen enkele tak hieronder het hoeft te raden. */
function isCredit(inv) {
  return Boolean(inv && inv.kind === 'credit');
}

/** nl unless the caller says en. An unknown language is not a reason to fail. */
function pickLang(lang) {
  return lang === 'en' ? 'en' : 'nl';
}

// ─────────────────────────────────────────────────────────────────────────────
// WINANSI — waarom hier een transliteratie staat, staat boven in de kop.

// The characters WinAnsiEncoding has on top of printable ASCII and Latin-1.
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ'
  + '‘’“”•–—˜™š›œžŸ';

// Latin letters WinAnsi has no slot for and that NFKD does not decompose,
// because their base form is a different letter with a stroke through it.
const TRANSLITERATE = {
  'Ł': 'L', 'ł': 'l', // Ł ł
  'Đ': 'D', 'đ': 'd', // Đ đ
  'Ħ': 'H', 'ħ': 'h', // Ħ ħ
  'Ŧ': 'T', 'ŧ': 't', // Ŧ ŧ
  'ı': 'i', 'İ': 'I', // ı İ
  'Ŀ': 'L', 'ŀ': 'l', // Ŀ ŀ
  'ſ': 's', // ſ
  'Ĳ': 'IJ', 'ĳ': 'ij', // Ĳ ĳ
  'Ŋ': 'N', 'ŋ': 'n', // Ŋ ŋ
  'ĸ': 'k', // ĸ
  'ẞ': 'SS', // ẞ
  '−': '-', // minus sign
  '‑': '-', // non-breaking hyphen
  '⁄': '/', // fraction slash
  '№': 'No.', // №
  ' ': ' ', // nbsp, drawn as a plain space
};

function encodable(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x20 && c <= 0x7e) return true;
  if (c >= 0xa1 && c <= 0xff) return true;
  return WINANSI_EXTRA.indexOf(ch) !== -1;
}

/**
 * Make a string safe for a WinAnsi standard font, without ever throwing.
 *
 * Order matters: explicit map first (Ł has no decomposition), then NFKD +
 * strip combining marks so ā becomes a and 文 stays 文, then a final pass that
 * turns anything still unencodable into '?'. Tabs and newlines collapse to a
 * space because the layout below does its own wrapping and a literal newline
 * inside a PDF text-showing operator means nothing.
 */
export function winAnsi(value) {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'string' ? value : String(value);
  s = s.replace(/[\t\r\n\v\f]+/g, ' ');
  let out = '';
  for (const ch of s) {
    if (encodable(ch)) { out += ch; continue; }
    const mapped = TRANSLITERATE[ch];
    if (mapped !== undefined) { out += mapped; continue; }
    const stripped = ch.normalize('NFKD').replace(/\p{M}+/gu, '');
    let piece = '';
    for (const c2 of stripped) {
      if (encodable(c2)) piece += c2;
      else if (TRANSLITERATE[c2] !== undefined) piece += TRANSLITERATE[c2];
    }
    // Control characters are dropped; a real letter we cannot render becomes a
    // visible '?' so nobody mistakes a mangled name for the name we were given.
    const code = ch.codePointAt(0);
    out += piece || (code < 0x20 || code === 0x7f ? '' : '?');
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GETALLEN EN DATUMS — met de hand, want Intl is per runtime anders gevuld en
// dit moet in workerd hetzelfde doen als in node, vandaag en in 2031.

/**
 * Cents to euros, in the separators of the language on the invoice.
 * nl: €1.234,56   en: €1,234.56
 */
export function formatEuro(cents, lang) {
  const l = pickLang(lang);
  const n = Number.isFinite(Number(cents)) ? Math.round(Number(cents)) : 0;
  const neg = n < 0;
  const abs = Math.abs(n);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  const group = l === 'nl' ? '.' : ',';
  const point = l === 'nl' ? ',' : '.';
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return `${neg ? '-' : ''}€${grouped}${point}${frac}`;
}

/** A quantity is usually 1 or 12, but it must survive 1,5 as well. */
export function formatQty(qty, lang) {
  const l = pickLang(lang);
  const n = Number(qty);
  if (!Number.isFinite(n)) return winAnsi(qty);
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2).replace(/0$/, '');
  return l === 'nl' ? s.replace('.', ',') : s;
}

/** 'YYYY-MM-DD' → '9 augustus 2026' / '9 August 2026'. Anything else is echoed
 *  through unchanged, because a date we cannot parse is still better on the
 *  invoice than a blank where the invoice date has to be. */
export function formatDate(value, lang) {
  const l = pickLang(lang);
  const s = typeof value === 'string' ? value : '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return winAnsi(value);
  const month = MONTHS[l][Number(m[2]) - 1];
  if (!month) return winAnsi(s.slice(0, 10));
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** The one Date object in this module, built from the invoice's own date so
 *  that the pdf metadata is a function of the input and nothing else. */
function metadataDate(invoice) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(invoice?.date ?? ''));
  if (!m) return new Date(Date.UTC(2000, 0, 1));
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT

const PAGE = { w: 595.28, h: 841.89 };          // A4 in points
const M = { left: 48, right: 48, top: 52, bottom: 64 };
const CONTENT_RIGHT = PAGE.w - M.right;
const CONTENT_W = CONTENT_RIGHT - M.left;

const SIZE = { h1: 19, h2: 10.5, body: 9.5, small: 8, tiny: 7.5 };
const LEAD = { body: 12.5, small: 10.5 };

// Table columns, as right edges for everything that is a number.
const COL = {
  desc: M.left,
  descW: 236,
  qtyRight: 352,
  unitRight: 452,
  totalRight: CONTENT_RIGHT,
};
const LABEL_RIGHT = COL.unitRight;   // totals labels end where unit prices do

/* ── DE KLEUREN VAN DE HAL — 15 oktober 2026 (werklijst 16) ───────────────────
   Lucas: een nieuw uiterlijk voor de factuur, "zorg ervoor dat echt alleen het
   uiterlijk word aangeraakt en niet het systeem erachter". Dus: dezelfde
   gegevens, dezelfde volgorde, dezelfde teksten en bedragen; alleen kleur, vlak
   en woordmerk zijn nieuw. Inkt, lijn en violet zijn die van de site
   (src/styles/hal.css: --h-inkt, --h-lijn, --h-violet, --h-mist, --h-nevel).
   MUTED is #5B5872: 6,9:1 op wit en 6,2:1 op het lila vlak, gemeten. */
const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#0F0C24');
const MUTED = hex('#5B5872');
const RULE = hex('#DEDCE8');
const VIOLET = hex('#4A1FFF');
const VLAK = hex('#F1EEFF');
const NEVEL = hex('#F5F5F9');

/* ── HET WOORDMERK, ALS VECTOR ─────────────────────────────────────────────────
   Letterlijk het pad uit src/data/woordmerk.js (de merkletter van de hal), hier
   overgenomen omdat deze module niets mag importeren behalve pdf-lib (zie
   tests/invoice-pdf.test.mjs, die ook nakijkt dat dit pad gelijk is aan dat in
   woordmerk.js). y loopt van -797,25 (bovenkant) tot 16,58 (onderkant); de
   basislijn is 0. Eén vorm: de A heeft geen binnenruimte, dus vullen met de
   gewone regel (nonzero) geeft dezelfde vorm als even-oneven op de site. */
const WOORDMERK_D = "M121.9 -779.1L130.1 -777.5L134.2 -776.6L142.4 -774.6L146.4 -773.4L154.4 -770.8L162.3 -767.9L170.0 -764.6L177.6 -761.1L181.4 -759.2L185.1 -757.2L192.4 -753.0L199.5 -748.5L203.0 -746.2L209.8 -741.2L216.4 -736.0L222.8 -730.6L225.9 -727.7L231.9 -721.9L237.7 -715.8L243.2 -709.4L245.8 -706.2L248.4 -702.8L253.4 -696.1L258.0 -689.1L262.4 -681.9L264.5 -678.2L515.5 -251.0L619.2 -389.0L662.8 -442.5L463.2 16.0L144.2 -530.5L0.0 -781.2L101.0 -781.5L109.4 -780.8L117.7 -779.8ZM3152.9 -0.4L3144.6 -1.5L3136.3 -2.9L3128.1 -4.6L3124.0 -5.6L3115.9 -7.9L3107.9 -10.5L3104.0 -11.9L3096.1 -14.9L3092.3 -16.6L3084.7 -20.2L3080.9 -22.1L3073.6 -26.1L3069.9 -28.2L3062.8 -32.7L3059.3 -35.1L3052.5 -40.0L3045.9 -45.2L3042.7 -47.9L3039.6 -50.7L3033.4 -56.4L3027.5 -62.4L3024.7 -65.5L3019.2 -71.8L3016.5 -75.1L3013.9 -78.4L3008.9 -85.2L3004.3 -92.2L3002.0 -95.7L2775.7 -481.1L2560.3 16.6L2560.3 -248.5L2799.1 -797.2L3118.1 -250.8L3262.3 -0.0L3161.3 0.2ZM891.3 -781.2L897.0 -781.1L902.6 -780.6L907.9 -779.9L913.1 -779.0L918.3 -777.8L923.1 -776.5L928.2 -774.9L933.1 -773.0L938.0 -770.9L942.8 -768.6L948.4 -765.5L953.8 -762.2L958.8 -758.7L963.8 -754.8L968.6 -750.6L972.9 -746.4L977.2 -741.7L981.3 -736.8L985.1 -731.7L988.6 -726.4L991.6 -721.2L994.5 -715.5L997.1 -709.6L999.3 -703.7L1001.3 -697.6L1002.8 -691.4L1004.1 -685.2L1005.0 -678.9L1005.5 -672.5L1005.7 -666.1L1005.7 -0.0L826.7 -0.0L826.7 -781.2ZM1421.6 -353.9L1132.0 -353.9L1132.0 -580.7L1132.2 -589.3L1132.7 -597.3L1133.3 -603.4L1134.0 -609.0L1134.9 -614.4L1135.9 -619.9L1137.1 -625.3L1138.4 -630.7L1139.9 -636.1L1141.7 -642.0L1143.5 -647.2L1145.4 -652.5L1147.5 -657.6L1150.0 -663.3L1152.3 -668.3L1154.9 -673.3L1157.5 -678.1L1160.6 -683.5L1163.2 -687.7L1165.9 -691.8L1169.0 -696.4L1171.9 -700.4L1174.9 -704.3L1178.0 -708.2L1181.2 -711.9L1184.9 -716.1L1188.3 -719.7L1191.8 -723.2L1195.8 -727.0L1199.4 -730.4L1203.6 -734.0L1207.4 -737.1L1211.3 -740.2L1215.8 -743.5L1219.8 -746.3L1224.5 -749.4L1228.7 -752.0L1232.9 -754.5L1237.2 -756.9L1241.6 -759.2L1246.0 -761.4L1251.1 -763.7L1255.6 -765.7L1260.8 -767.8L1265.4 -769.5L1270.1 -771.1L1274.8 -772.6L1280.1 -774.1L1284.9 -775.4L1289.7 -776.5L1294.5 -777.5L1299.4 -778.4L1304.9 -779.2L1309.8 -779.9L1314.7 -780.4L1319.6 -780.8L1324.5 -781.1L1330.1 -781.2L1600.7 -781.2L1521.8 -675.9L1311.0 -675.9L1311.0 -459.3L1600.7 -459.3L1600.7 -0.0L1132.0 -0.0L1210.8 -105.4L1421.6 -105.4ZM1916.2 -0.9L1907.6 -1.9L1899.1 -3.3L1894.2 -4.2L1888.8 -5.4L1884.0 -6.6L1879.3 -8.0L1874.5 -9.4L1869.9 -10.9L1865.2 -12.6L1860.6 -14.4L1856.0 -16.3L1851.5 -18.3L1846.5 -20.7L1842.1 -22.9L1837.8 -25.2L1833.5 -27.7L1829.2 -30.2L1825.1 -32.9L1821.0 -35.6L1816.9 -38.5L1813.0 -41.5L1808.6 -44.9L1804.8 -48.0L1801.1 -51.3L1797.5 -54.6L1793.9 -58.1L1790.4 -61.6L1787.1 -65.2L1783.8 -68.9L1780.2 -73.1L1777.1 -76.9L1774.1 -80.9L1771.2 -84.8L1768.0 -89.4L1764.3 -95.1L1760.9 -101.0L1757.6 -106.9L1754.5 -113.0L1751.6 -119.1L1748.9 -125.4L1746.5 -131.7L1744.3 -138.1L1742.2 -144.6L1740.4 -151.1L1738.9 -157.7L1737.5 -164.4L1736.4 -171.1L1735.5 -177.8L1734.8 -184.6L1734.3 -191.3L1734.2 -196.3L1734.1 -201.2L1734.1 -781.2L1913.1 -781.2L1913.1 -105.4L2257.1 -105.4L2257.1 -781.2L2436.1 -781.2L2436.1 -0.0L1933.5 -0.0L1924.8 -0.3ZM3421.2 -781.2L3426.8 -781.1L3432.5 -780.6L3437.8 -779.9L3443.0 -779.0L3448.2 -777.8L3453.0 -776.5L3458.0 -774.9L3463.0 -773.0L3467.9 -770.9L3472.7 -768.6L3478.3 -765.5L3483.7 -762.2L3488.6 -758.7L3493.6 -754.8L3498.4 -750.6L3502.8 -746.4L3507.1 -741.7L3511.1 -736.8L3514.9 -731.7L3518.4 -726.4L3521.4 -721.2L3524.3 -715.5L3526.9 -709.6L3529.2 -703.7L3531.1 -697.6L3532.7 -691.4L3533.9 -685.2L3534.8 -678.9L3535.4 -672.5L3535.6 -666.1L3535.6 -0.0L3356.5 -0.0L3356.5 -781.2ZM3768.5 -781.2L3774.2 -781.1L3779.5 -780.6L3784.8 -779.9L3789.7 -779.1L3794.8 -778.0L3799.6 -776.7L3804.4 -775.2L3809.0 -773.5L3813.9 -771.5L3818.4 -769.4L3823.8 -766.6L3828.9 -763.5L3834.3 -760.0L3839.1 -756.4L3844.0 -752.3L3848.4 -748.2L3852.6 -743.9L3856.7 -739.0L3860.6 -734.0L3864.1 -729.1L3867.4 -723.6L3870.3 -718.3L3872.9 -712.9L3875.3 -707.0L3877.4 -701.0L3879.1 -695.2L3880.1 -691.4L3880.8 -688.0L3881.4 -684.5L3881.9 -681.0L3882.3 -677.5L3882.7 -673.9L3882.8 -670.4L3882.9 -666.5L3882.9 -105.4L4120.3 -105.4L4120.3 -0.0L3703.9 -0.0L3703.9 -781.2ZM4182.5 -353.9L4182.5 -580.7L4182.8 -589.3L4183.3 -597.3L4183.9 -603.4L4184.6 -609.0L4185.5 -614.4L4186.5 -619.9L4187.7 -625.3L4189.0 -630.7L4190.5 -636.1L4192.3 -642.0L4194.1 -647.2L4196.0 -652.5L4198.1 -657.6L4200.6 -663.3L4202.9 -668.3L4205.4 -673.3L4208.1 -678.1L4211.2 -683.5L4213.8 -687.7L4216.5 -691.8L4219.6 -696.4L4222.5 -700.4L4225.5 -704.3L4228.6 -708.2L4231.8 -711.9L4235.5 -716.1L4238.9 -719.7L4242.4 -723.2L4246.4 -727.0L4250.0 -730.4L4254.2 -734.0L4258.0 -737.1L4261.9 -740.2L4266.4 -743.5L4270.4 -746.3L4275.1 -749.4L4279.3 -752.0L4283.5 -754.5L4287.8 -756.9L4292.2 -759.2L4296.6 -761.4L4301.7 -763.7L4306.2 -765.7L4311.3 -767.8L4316.0 -769.5L4320.6 -771.1L4325.3 -772.6L4330.7 -774.1L4335.5 -775.4L4340.3 -776.5L4345.1 -777.5L4350.0 -778.4L4355.5 -779.2L4360.3 -779.9L4365.3 -780.4L4370.2 -780.8L4375.1 -781.1L4380.7 -781.2L4651.2 -781.2L4572.4 -675.9L4361.6 -675.9L4361.6 -459.3L4651.2 -459.3L4651.2 -0.0L4182.5 -0.0L4261.4 -105.4L4472.2 -105.4L4472.2 -353.9ZM701.8 -797.2L702.0 -459.0L652.0 -538.0L507.2 -343.5L543.2 -431.0Z";
const WOORDMERK_BREED = 4651.24;
const WOORDMERK_KAP = 797.25;

/** Een rechthoek met ronde hoeken als SVG-pad, vanaf de linkerbovenhoek (y omlaag). */
function rondPad(w, h, r) {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${q} 0 L${w - q} 0 Q${w} 0 ${w} ${q} L${w} ${h - q} Q${w} ${h} ${w - q} ${h} L${q} ${h} Q0 ${h} 0 ${h - q} L0 ${q} Q0 0 ${q} 0 Z`;
}

/**
 * The little drawing machine. It holds the cursor, hands out pages, and is the
 * single place where a string turns into marks — which is why winAnsi() lives
 * on its edge rather than sprinkled through the layout.
 */
function makeSheet(pdf, fonts) {
  const state = { pages: [], page: null, y: 0 };

  function newPage() {
    const page = pdf.addPage([PAGE.w, PAGE.h]);
    state.pages.push(page);
    state.page = page;
    state.y = PAGE.h - M.top;
    /*
     * HET WATERMERK ALS EERSTE, EN DAAROM HIER. Een pdf kent geen z-index: wat later
     * getekend wordt, ligt bovenop. Zou dit ergens in de opmaak staan, dan hangt het
     * van de aanroeporde af of het over de tabel valt, en die orde verandert zodra er
     * een blok bij komt. Meteen na addPage() kan het niet anders dan onderop liggen.
     *
     * Ook op een tweede pagina, want een factuur met twintig regels loopt door en een
     * merk dat alleen op blad 1 staat leest als een vergeten instelling.
     */
    watermark(page);
    return page;
  }

  /** Het teken, doorzichtig en aangesneden in de linkeronderhoek. Zie WM_H. */
  function watermark(page) {
    if (!WM_OPACITY) return;
    for (const path of MARK_PATHS) {
      page.drawSvgPath(path, {
        x: -WM_W * WM_BLEED_X,
        y: WM_TOP_Y,
        scale: WM_H / VIEWBOX_H,
        color: INK,
        opacity: WM_OPACITY,
      });
    }
  }

  function width(text, font, size) {
    return font.widthOfTextAtSize(winAnsi(text), size);
  }

  function draw(text, opts = {}) {
    const {
      x = M.left, y = state.y, size = SIZE.body,
      font = fonts.regular, color = INK, align = 'left',
    } = opts;
    const s = winAnsi(text);
    if (s === '') return;
    let px = x;
    if (align === 'right') px = x - width(s, font, size);
    else if (align === 'center') px = x - width(s, font, size) / 2;
    state.page.drawText(s, { x: px, y, size, font, color });
  }

  /** Greedy wrap on spaces, with a hard character break for a word that is
   *  wider than the column on its own (a url, a file name, a German compound). */
  function wrap(text, font, size, maxWidth) {
    const s = winAnsi(text);
    if (s === '') return [''];
    const out = [];
    for (const word of s.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (width(w, font, size) > maxWidth && w.length > 1) {
        let cut = 1;
        while (cut < w.length && width(w.slice(0, cut + 1), font, size) <= maxWidth) cut++;
        const head = w.slice(0, cut);
        const last = out.length ? out[out.length - 1] : null;
        if (last !== null && last !== '' && width(`${last} ${head}`, font, size) <= maxWidth) {
          out[out.length - 1] = `${last} ${head}`;
        } else {
          out.push(head);
        }
        w = w.slice(cut);
      }
      if (!out.length) { out.push(w); continue; }
      const last = out[out.length - 1];
      if (last !== '' && width(`${last} ${w}`, font, size) <= maxWidth) out[out.length - 1] = `${last} ${w}`;
      else out.push(w);
    }
    return out.length ? out : [''];
  }

  /** Een SVG-pad op het blad, in de huidige inktkleur. Zie MARK_PATHS. */
  function svg(path, { x = M.left, y = state.y, scale = 1, color = INK } = {}) {
    state.page.drawSvgPath(path, { x, y, scale, color });
  }

  /** Een vlak met ronde hoeken; `top` is de bovenkant (pdf-y). Altijd vóór de tekst
      die erop staat getekend: een pdf kent geen z-index. */
  function vlak(x, top, w, h, color = VLAK, r = 10) {
    state.page.drawSvgPath(rondPad(w, h, r), { x, y: top, color });
  }

  function rule(y, color = RULE, thickness = 0.6) {
    state.page.drawLine({
      start: { x: M.left, y },
      end: { x: CONTENT_RIGHT, y },
      thickness,
      color,
    });
  }

  return {
    state,
    newPage,
    draw,
    svg,
    vlak,
    wrap,
    width,
    rule,
    get y() { return state.y; },
    set y(v) { state.y = v; },
    get page() { return state.page; },
    get pages() { return state.pages; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/** Everything the layout needs, derived once, so no branch below has to guess. */
function prepare(invoice) {
  const inv = invoice && typeof invoice === 'object' ? invoice : {};
  const lang = pickLang(inv.lang);
  /* De overlay ligt OVER de gewone tabel en vervangt hem niet: alles wat een
     creditnota met een factuur gemeen heeft — de kolomkoppen, de btw-mededelingen, de
     paginanummering — komt uit dezelfde bron, en alleen de woorden die echt anders
     moeten zijn, zijn anders. Zo kan er geen tekst ONTBREKEN op een creditnota. */
  const credit = isCredit(inv);
  const t = credit ? { ...TEXT[lang], ...CREDIT_TEXT[lang] } : TEXT[lang];
  const seller = inv.seller && typeof inv.seller === 'object' ? inv.seller : {};
  const customer = inv.customer && typeof inv.customer === 'object' ? inv.customer : {};
  const lines = Array.isArray(inv.lines) ? inv.lines.filter((l) => l && typeof l === 'object') : [];

  const netCents = Number.isFinite(Number(inv.netCents)) ? Math.round(Number(inv.netCents)) : 0;
  const vatCents = Number.isFinite(Number(inv.vatCents)) ? Math.round(Number(inv.vatCents)) : 0;
  /*
   * ── "VAT 0.21%" OP EEN ECHTE FACTUUR — 9 augustus 2026 ──────────────────────
   *
   * De eerste factuur die dit systeem uitgaf, VIS-2026-0001, zei letterlijk
   * `VAT 0.21%`. Het tarief werd doorgegeven als breuk en met een %-teken
   * afgedrukt.
   *
   * `orders.vat_rate` is een BREUK, want vatDecision() geeft `rate: 0.21` en dat
   * is wat quote.js ermee rekent. Een percentage op papier is 21. Die twee vormen
   * zijn hier vermengd geraakt.
   *
   * EN WAAROM 147 ASSERTIONS DAT NIET ZAGEN: mijn eigen fixtures schreven
   * `vatRate: 21`. De test toetste dus of de code overweg kon met een vorm die de
   * echte data nooit heeft. Een fixture die niet lijkt op wat er langskomt, is een
   * test die de fout meeschrijft in plaats van hem te vinden — precies wat er
   * gebeurde, en de reden dat dit commentaar hier staat en niet in een changelog.
   *
   * NU BEIDE VORMEN, en dat is niet slap. Er bestaat geen btw-tarief onder de 1%,
   * dus een waarde tussen 0 en 1 is per definitie een breuk en een waarde vanaf 1
   * per definitie een percentage. 0 is in beide vormen 0. Er is dus geen invoer
   * waarbij dit de verkeerde kant op kan gokken, en oude momentopnames — die de
   * breuk bewaren — renderen daarmee vanaf nu goed.
   */
  const rawRate = Number.isFinite(Number(inv.vatRate)) ? Number(inv.vatRate) : 0;
  const vatRate = rawRate > 0 && rawRate < 1 ? Math.round(rawRate * 10000) / 100 : rawRate;
  const treatment = inv.treatment === 'eu_reverse_charge' || inv.treatment === 'outside_scope'
    ? inv.treatment
    : 'nl_standard';

  /*
   * ── DE REGELS MOETEN OPTELLEN TOT HET SUBTOTAAL, EN ANDERS KOMT ER GEEN PDF ──
   *
   * 9 augustus 2026, gevonden op een voorbeeldfactuur waar de regel €1.020,00 zei
   * en het subtotaal eronder €890,00. Dat kwam uit een fout in de testinvoer en
   * niet uit deze code — maar deze code drukte het zonder aarzelen af, en dat is
   * het probleem. De noot bovenaan dit bestand voert dit argument al voor het
   * TOTAAL ("de som van wat erboven staat") en niet voor het subtotaal, en dat
   * gat is precies waar een document door valt dat niet klopt.
   *
   * Waarom hier een fout en geen stille correctie: bij `grossCents` kan de pdf
   * zelf de goede waarde uitrekenen (netto plus btw, en die twee staan erboven).
   * Bij een verschil tussen de regels en het subtotaal kan hij dat niet — wélke
   * van de twee waar is, weet alleen de aanroeper. Eén ervan afdrukken zou een
   * gok zijn op een document dat de Belastingdienst leest.
   *
   * En waarom een fout beter is dan een verkeerde factuur: een formeel gebrekkige
   * factuur is jaren later in bulk een probleem, terwijl een ONTBREKENDE factuur
   * hier herstelbaar is — issueInvoice() laat de rij op 'pending' staan en
   * VISUAILS Studio probeert het opnieuw. Dit is dezelfde afweging als bij
   * winAnsi() en valt de andere kant op, omdat het daar om een letter in een naam
   * ging en hier om het bedrag.
   *
   * Een factuur zonder regels blijft toegestaan: dat is niet tegenstrijdig, alleen
   * leeg, en het gebeurt bij niets wat deze code aanroept.
   */
  if (lines.length) {
    const sum = lines.reduce((n, l) => n + (Number.isFinite(Number(l.totalCents)) ? Math.round(Number(l.totalCents)) : 0), 0);
    if (sum !== netCents) {
      throw new Error(
        `invoicePdf: de regels tellen op tot ${sum} cent en het subtotaal is ${netCents} cent — `
        + 'een factuur die niet optelt wordt niet gedrukt. Controleer de aanroeper.'
      );
    }
  }

  return {
    inv, lang, t, seller, customer, lines,
    netCents, vatCents, vatRate, treatment,
    // The total on the paper is the sum of the two figures printed above it.
    grossCents: netCents + vatCents,
    /* Verrekend tegoed (29 september 2026): nooit meer dan het totaal, en niet
       op een creditnota. Zie src/lib/tegoedVerrekening.js. */
    tegoedCents: credit ? 0 : Math.max(0, Math.min(Math.round(Number(inv.tegoedCents) || 0), netCents + vatCents)),
    reverse: treatment === 'eu_reverse_charge',
    outside: treatment === 'outside_scope',
  };
}

function addressLines(party) {
  const list = Array.isArray(party?.address) ? party.address : [];
  return list.map((l) => winAnsi(l)).filter((l) => l !== '');
}

// ─────────────────────────────────────────────────────────────────────────────
// DE FACTUUR

/**
 * Render an invoice to PDF bytes.
 *
 * @param {object} invoice see the field list at the top of the repo brief; every
 *        optional field (dueDate, customer.company, customer.vat, seller.iban,
 *        paidAt, viesConsultation) may be null or absent.
 * @returns {Promise<Uint8Array>} the same bytes for the same input, always.
 */
export async function renderInvoicePdf(invoice) {
  const d = prepare(invoice);
  const { t, lang } = d;

  const pdf = await PDFDocument.create();
  const stamp = metadataDate(d.inv);
  // Fixed metadata, fixed dates: this is what keeps two renders byte-identical.
  /* De naam die een besturingssysteem toont als iemand het bestand opent. Dezelfde
     woorden als de titel op het papier, in gewone schrijfwijze — vier gevallen nu, en
     daarom uit een tabel en niet uit een ternary die je twee keer moet lezen. */
  const DOC_NAME = { FACTUUR: 'Factuur', INVOICE: 'Invoice', CREDITNOTA: 'Creditnota', 'CREDIT NOTE': 'Credit note' };
  pdf.setTitle(`${DOC_NAME[t.title] || t.title} ${winAnsi(d.inv.number ?? '')}`.trim());
  pdf.setAuthor(winAnsi(d.seller.name ?? 'VISUAILS'));
  pdf.setSubject(winAnsi(d.inv.number ?? ''));
  pdf.setProducer('VISUAILS invoice renderer');
  pdf.setCreator('VISUAILS invoice renderer');
  pdf.setCreationDate(stamp);
  pdf.setModificationDate(stamp);

  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const sheet = makeSheet(pdf, fonts);
  sheet.newPage();

  drawHeader(sheet, d, fonts);
  drawParties(sheet, d, fonts);
  drawMeta(sheet, d, fonts);
  drawTable(sheet, d, fonts);
  drawTotals(sheet, d, fonts);
  drawStatements(sheet, d, fonts);
  drawFooters(sheet, d, fonts);

  return pdf.save({ useObjectStreams: true, addDefaultPage: false });
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET MERKTEKEN, ALS VECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 9 augustus 2026, na de eerste echte factuur: *"Ik zou het VISUAILS logo
 * ook nog wel mooi vinden om erop te hebben."*
 *
 * ── WAAROM PADEN EN GEEN PNG ─────────────────────────────────────────────────
 *
 * De mail moet het met een PNG doen omdat e-mail geen SVG kent (zie
 * scripts/make-mail-assets.mjs). Een pdf heeft die beperking niet: pdf-lib kan
 * SVG-padnotatie rechtstreeks tekenen, dus het teken blijft vector en is scherp op
 * papier én bij 800% inzoomen. Een raster zou hier bovendien als base64 in dit
 * bestand moeten staan — een blok van tienduizenden tekens data in een
 * bronbestand — of van schijf gelezen moeten worden, en dat laatste mag niet: de
 * test in tests/invoice-pdf.test.mjs eist dat deze module niets importeert behalve
 * pdf-lib en het rendert met de Node-globals weggehaald.
 *
 * ── WAAR DEZE TWEE PADEN VANDAAN KOMEN ──────────────────────────────────────
 *
 * Letterlijk uit brand/visuails-logo/svg/visuails-mark-zwart.svg, dat zelf uit het
 * <symbol id="markglyph"> in Layout.astro wordt gegenereerd — dezelfde bron als de
 * favicon en het mailbriefhoofd. Verandert de tekening, dan is DIT de plek die
 * niet automatisch meegaat, en daarom staat de herkomst hier met zoveel woorden:
 * kopieer de twee `d`-waarden opnieuw, en laat VIEWBOX_H gelijk aan de hoogte in
 * de viewBox.
 *
 * De pdf-tekst staat op een y-as die omhoog loopt en SVG op een die omlaag loopt;
 * drawSvgPath() neemt de y als BOVENkant en tekent naar beneden. Vandaar dat het
 * teken op `top` wordt geplaatst en de tekst ernaast op `top - iets`.
 */
const MARK_PATHS = [
  'M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 '
  + 'L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
  'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z',
];
const VIEWBOX_H = 813.25;
const VIEWBOX_W = 702;

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET TEKEN ALS WATERMERK, AANGESNEDEN IN DE LINKERHOEK — 10 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── DRIE VORMEN OP ÉÉN DAG, EN WAAROM DEZE HET IS ──────────────────────────
 *
 * Hier stonden vandaag eerst maten voor een LOCKUP ([V] VISUAILS, zoals het
 * mailbriefhoofd), daarna voor een HANDMERK (VISUAILS met een kleine V rechtsboven, op
 * de plek van een ™). Lucas over die tweede: "haal het logo daar weg en plaats hem
 * misschien als watermerk doorzichtig in de linker hoek wat afgesneden."
 *
 * Dat lost en passant iets op wat bij de eerste twee bleef wringen.
 * scripts/brand-lockup-guard.mjs laat `astro build` FALEN als het woordmerk en de V op
 * een pagina in dezelfde container staan, met Lucas' eigen instructie als reden: *"they
 * are two alternative signatures for the same brand, not a lockup, and a V sitting next
 * to the word it already spells reads as a duplicated logo."* Een watermerk dat door de
 * bladrand wordt afgesneden staat niet NÁÁST het woord — het is achtergrond, geen
 * signatuur. De kop draagt weer alleen het woordmerk, en daarmee houdt de factuur zich
 * aan de regel die de site afdwingt.
 *
 * ── DE MAAT EN DE DEKKING, GEKOZEN OP EEN PROEF ────────────────────────────
 *
 * Vier varianten op A4 gezet met nagebootste factuurinhoud eroverheen, om te zien wat er
 * onder tekst gebeurt en niet alleen wat er mooi uitziet:
 *
 *   linksBOVEN, 300 pt, 5%   ligt achter het adresblok. Op een belastingdocument is
 *                            juist dát de tekst die niets mag verliezen. Afgevallen.
 *   linksonder, 300 pt, 5%   schoon, maar zo klein dat het eerder een vlek lijkt dan
 *                            een keuze.
 *   linksonder, 420 pt, 4%   vult de leegte tussen de tabel en de voet, en achter de
 *                            8pt-grijze noten is er geen contrastverlies te zien.  ← deze
 *   linksonder, 420 pt, 8%   duidelijk zichtbaar, en dat is het probleem: 8% grijs
 *                            achter 8pt grijze tekst gaat kosten zodra iemand dit
 *                            fotokopieert of doorstuurt naar zijn boekhouder.
 *
 * ── WAAROM LINKSONDER EN NIET LINKSBOVEN ───────────────────────────────────
 *
 * Boven staat alles wat een factuur een factuur maakt: woordmerk, adres, btw- en
 * KVK-nummer, factuurnummer. Onder de tabel is de enige plek op dit blad die op een
 * betaalde factuur van één regel écht leeg is. Een watermerk hoort in leegte te staan,
 * niet in inhoud.
 *
 * ── AANGESNEDEN, DUS OP TWEE RANDEN ────────────────────────────────────────
 *
 * 34% van de breedte valt links buiten het blad en de onderkant valt onder de
 * bladrand weg. Twee randen en niet één, want een vorm die maar aan één kant wordt
 * afgesneden leest als een fout in de opmaak; aan twee kanten leest hij als een
 * uitsnede. pdf-lib knipt zelf op de bladmaat af, dus dit hoeft niet gemaskeerd te
 * worden.
 */
const WM_H = 420;
const WM_W = (WM_H / VIEWBOX_H) * VIEWBOX_W;
/* ── OP NUL SINDS 19 SEPTEMBER 2026 ────────────────────────────────────────
   Het V-beeldmerk is uit de roulatie (Lucas: nooit meer gebruiken — het staat
   nergens meer op de site, in Studio of in de mail). Het watermerk was de
   laatste plek. `0` zet watermark() uit zonder de tekening en de meting
   hierboven weg te gooien: komt er ooit een nieuw teken, dan is dit de knop.
   De factuur draagt alleen nog het woordmerk in de kop. */
const WM_OPACITY = 0;
/** Hoeveel van de breedte links buiten het blad valt. Zie de noot hierboven. */
const WM_BLEED_X = 0.34;
/** De bovenkant van het teken, gemeten van de onderrand. drawSvgPath tekent naar
 *  beneden, dus hieronder valt de punt van de V buiten het blad. */
const WM_TOP_Y = WM_H * 0.80;

// ── kop ──────────────────────────────────────────────────────────────────────

function drawHeader(sheet, d, fonts) {
  const { t } = d;
  const top = sheet.y;

  /*
   * HET TEKEN, DAN HET WOORD. Samen het lockup uit het mailbriefhoofd, en om
   * dezelfde reden in die volgorde: het teken is wat iemand herkent voordat hij
   * leest.
   *
   * Tekst wordt vanaf zijn BASISLIJN getekend en een pad vanaf zijn BOVENKANT.
   * Die twee nulpunten liggen niet op dezelfde hoogte, dus de bovenkant van het
   * teken wordt hier uitgerekend vanaf de basislijn van het woord: kapitaalhoogte
   * erbij, en de helft van de overhoogte er nog eens bovenop zodat wat er onder de
   * basislijn uitsteekt precies evenveel is als wat er boven de letters uitsteekt.
   */
  const baseline = top - 4;

  /*
   * ALLEEN HET WOORDMERK. Het teken stond hier vandaag twee keer — eerst ervoor als
   * lockup, daarna erachter als handmerk — en staat nu als watermerk in de linkerhoek;
   * zie de noot bij WM_H. Deze kop is daarmee terug bij één signatuur, wat ook is wat
   * scripts/brand-lockup-guard.mjs van elke pagina op de site eist.
   */
  /* Het woordmerk als vector (15 oktober 2026), op de plek en de hoogte waar de
     naam in Helvetica Bold stond: de kapitaalhoogte van 19 pt (0,72 em). De naam
     staat als tekst in de voet en in de metadata. */
  const kap = SIZE.h1 * 0.72;
  sheet.svg(WOORDMERK_D, { x: M.left, y: baseline, scale: kap / WOORDMERK_KAP, color: INK });
  sheet.draw(t.title, { x: CONTENT_RIGHT, y: top - 2, size: SIZE.h2, font: fonts.bold, align: 'right', color: VIOLET });

  // Seller identity. The VAT number and the KVK number are not decoration here:
  // both are required on every invoice we send.
  let y = top - 24;
  for (const line of addressLines(d.seller)) {
    sheet.draw(line, { x: M.left, y, size: SIZE.small, color: MUTED });
    y -= LEAD.small;
  }
  const bits = [];
  if (d.seller.vat) bits.push(`${t.sellerVat}: ${winAnsi(d.seller.vat)}`);
  if (d.seller.kvk) bits.push(`${t.sellerKvk}: ${winAnsi(d.seller.kvk)}`);
  if (d.seller.email) bits.push(winAnsi(d.seller.email));
  if (d.seller.iban) bits.push(`${t.iban}: ${winAnsi(d.seller.iban)}`);
  /*
   * DE SCHEIDINGSSTIP MAG NIET AAN HET EIND VAN EEN REGEL BLIJVEN HANGEN.
   *
   * wrap() breekt op spaties en ziet '·' daardoor als een los woord, dus zodra
   * deze reeks over twee regels loopt eindigt de eerste met "hello@visuails.com ·"
   * en begint er niets na. Op een voorbeeldfactuur met een IBAN erbij is dat
   * precies wat er gebeurde.
   *
   * Opgelost bij het tekenen en niet in wrap(): die functie is generiek en hoort
   * niets te weten over wélk teken deze regel als scheiding gebruikt. Hier is dat
   * wel bekend, dus hier wordt hij van de randen gehaald.
   */
  const clean = (s) => s.replace(/^\s*·\s*/, '').replace(/\s*·\s*$/, '');
  for (const line of sheet.wrap(bits.join('  ·  '), fonts.regular, SIZE.small, CONTENT_W * 0.62)) {
    sheet.draw(clean(line), { x: M.left, y, size: SIZE.small, color: MUTED });
    y -= LEAD.small;
  }

  /* Geen lijn meer onder de kop (15 oktober 2026): het lila vlak eronder scheidt al. */
  sheet.y = y - 12;
  sheet.y -= 26;
}

// ── partijen en factuurgegevens ──────────────────────────────────────────────

/* ── HET VLAK ONDER "FACTUUR AAN" EN DE GEGEVENS — 15 oktober 2026 ──────────
   Eén lila vlak achter de klant en de factuurgegevens. Het moet vóór de tekst
   getekend worden, dus wordt de hoogte eerst gemeten met precies dezelfde
   regels als drawParties() en drawMeta() hieronder gebruiken. */
const VLAK_PAD = 14;
function partijHoogte(sheet, d, fonts) {
  const colW = CONTENT_W * 0.52;
  const name = winAnsi(d.customer.name);
  const company = winAnsi(d.customer.company);
  const first = company || name;
  const second = company && name && company !== name ? name : '';
  let n = sheet.wrap(first, fonts.bold, SIZE.body, colW).length;
  if (second) n += sheet.wrap(second, fonts.regular, SIZE.body, colW).length;
  for (const line of addressLines(d.customer)) n += sheet.wrap(line, fonts.regular, SIZE.body, colW).length;
  if (d.customer.country) n += 1;
  if (d.customer.vat) n += 1;
  return 15 + n * LEAD.body;
}
function metaRijen(d) {
  const { t } = d;
  let n = 2;
  if (d.inv.dueDate) n += 1;
  if (isCredit(d.inv) && d.inv.creditsNumber) { n += 1; if (d.inv.creditsDate) n += 1; }
  if (d.inv.reference) n += 1;
  return n;
}
function drawPartijVlak(sheet, d, fonts) {
  const top = sheet.y + VLAK_PAD - 2;
  const h = Math.max(partijHoogte(sheet, d, fonts), metaRijen(d) * (LEAD.body + 2)) + VLAK_PAD * 2 - 6;
  sheet.vlak(M.left - VLAK_PAD, top, CONTENT_W + VLAK_PAD * 2, h, VLAK, 12);
}

function drawParties(sheet, d, fonts) {
  const { t } = d;
  drawPartijVlak(sheet, d, fonts);
  const top = sheet.y;
  const colW = CONTENT_W * 0.52;

  sheet.draw(t.billedTo.toUpperCase(), { x: M.left, y: top, size: SIZE.tiny, font: fonts.bold, color: VIOLET });
  let y = top - 15;

  const name = winAnsi(d.customer.name);
  const company = winAnsi(d.customer.company);
  // company is optional, and when it is absent the name simply becomes the
  // first line — no empty line, no "null".
  const first = company || name;
  const second = company && name && company !== name ? name : '';

  for (const line of sheet.wrap(first, fonts.bold, SIZE.body, colW)) {
    sheet.draw(line, { x: M.left, y, size: SIZE.body, font: fonts.bold });
    y -= LEAD.body;
  }
  if (second) {
    for (const line of sheet.wrap(second, fonts.regular, SIZE.body, colW)) {
      sheet.draw(line, { x: M.left, y, size: SIZE.body });
      y -= LEAD.body;
    }
  }
  for (const line of addressLines(d.customer)) {
    for (const part of sheet.wrap(line, fonts.regular, SIZE.body, colW)) {
      sheet.draw(part, { x: M.left, y, size: SIZE.body });
      y -= LEAD.body;
    }
  }
  if (d.customer.country) {
    sheet.draw(winAnsi(d.customer.country), { x: M.left, y, size: SIZE.body });
    y -= LEAD.body;
  }
  // The customer's VAT number is required on a reverse-charged invoice, and is
  // useful (never harmful) on the others, so it is printed whenever we have it.
  if (d.customer.vat) {
    sheet.draw(`${t.customerVat}: ${winAnsi(d.customer.vat)}`, {
      x: M.left, y, size: SIZE.body, font: d.reverse ? fonts.bold : fonts.regular,
    });
    y -= LEAD.body;
  }

  sheet.partiesBottom = y;
}

function drawMeta(sheet, d, fonts) {
  const { t } = d;
  const top = sheet.y;
  const rows = [
    [t.number, winAnsi(d.inv.number)],
    [t.date, formatDate(d.inv.date, d.lang)],
  ];
  if (d.inv.dueDate) rows.push([t.due, formatDate(d.inv.dueDate, d.lang)]);
  /* Op een creditnota staat de gecrediteerde factuur DIRECT onder het eigen nummer, en
     niet verderop bij de mededelingen: het is het tweede ding dat een lezer — en een
     controleur — zoekt, en zonder die verwijzing verwijst de nota naar niets. */
  if (isCredit(d.inv) && d.inv.creditsNumber) {
    rows.push([t.credits, winAnsi(d.inv.creditsNumber)]);
    if (d.inv.creditsDate) rows.push([t.creditsDate, formatDate(d.inv.creditsDate, d.lang)]);
  }
  if (d.inv.reference) rows.push([t.reference, winAnsi(d.inv.reference)]);

  let y = top;
  for (const [label, value] of rows) {
    sheet.draw(label, { x: COL.unitRight, y, size: SIZE.small, color: MUTED, align: 'right' });
    sheet.draw(value, { x: CONTENT_RIGHT, y, size: SIZE.body, font: fonts.bold, align: 'right' });
    y -= LEAD.body + 2;
  }

  /* Onder het lila vlak (zie drawPartijVlak) iets meer lucht dan vroeger onder de lijn. */
  sheet.y = Math.min(sheet.partiesBottom ?? y, y) - 16 - VLAK_PAD;
}

// ── de regels ────────────────────────────────────────────────────────────────

function tableHead(sheet, d, fonts) {
  const { t } = d;
  const y = sheet.y;
  /* De kolomkoppen op een grijslila band (15 oktober 2026), in plaats van een lijn eronder. */
  sheet.vlak(M.left - VLAK_PAD, y + 11, CONTENT_W + VLAK_PAD * 2, 18, NEVEL, 8);
  sheet.draw(t.colDesc, { x: COL.desc, y, size: SIZE.tiny, font: fonts.bold, color: MUTED });
  sheet.draw(t.colQty, { x: COL.qtyRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.draw(t.colUnit, { x: COL.unitRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.draw(t.colTotal, { x: COL.totalRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.y = y - 7;
  sheet.y -= 14;
}

/** A continuation page repeats who this is and which invoice it is, because a
 *  loose second sheet with only numbers on it is a filing problem. */
function continuationHead(sheet, d, fonts) {
  sheet.newPage();
  const y = sheet.y;
  sheet.svg(WOORDMERK_D, { x: M.left, y, scale: (SIZE.body * 0.72) / WOORDMERK_KAP, color: INK });
  sheet.draw(`${d.t.title} ${winAnsi(d.inv.number)} ${d.t.continued}`, {
    x: CONTENT_RIGHT, y, size: SIZE.small, color: MUTED, align: 'right',
  });
  sheet.y = y - 12;
  sheet.rule(sheet.y);
  sheet.y -= 20;
  tableHead(sheet, d, fonts);
}

function drawTable(sheet, d, fonts) {
  tableHead(sheet, d, fonts);

  for (const line of d.lines) {
    const parts = sheet.wrap(line.description, fonts.regular, SIZE.body, COL.descW);
    /* Een tweede regel onder de omschrijving, kleiner en grijs — sinds
       24 september 2026 voor de naam van een eigen look (zie
       snapshotFromOrder() in invoice.js). Geen detail, geen extra hoogte. */
    /* Meer regels onder elkaar mag sinds 17 oktober 2026: een look per regel
       ("Complete look A · …", levering 60), gescheiden door een regeleinde. */
    const detail = line.detail
      ? String(line.detail).split('\n').filter(Boolean).flatMap((r) => sheet.wrap(r, fonts.regular, SIZE.small, COL.descW))
      : [];
    const height = Math.max(parts.length * LEAD.body, LEAD.body) + detail.length * LEAD.small + 5;

    if (sheet.y - height < M.bottom) continuationHead(sheet, d, fonts);

    const y = sheet.y;
    parts.forEach((part, i) => {
      sheet.draw(part, { x: COL.desc, y: y - i * LEAD.body, size: SIZE.body });
    });
    detail.forEach((part, i) => {
      sheet.draw(part, { x: COL.desc, y: y - parts.length * LEAD.body - i * LEAD.small + 1, size: SIZE.small, color: MUTED });
    });
    sheet.draw(formatQty(line.qty, d.lang), { x: COL.qtyRight, y, size: SIZE.body, align: 'right' });
    sheet.draw(formatEuro(line.unitCents, d.lang), { x: COL.unitRight, y, size: SIZE.body, align: 'right' });
    sheet.draw(formatEuro(line.totalCents, d.lang), { x: COL.totalRight, y, size: SIZE.body, align: 'right' });

    sheet.y = y - height;
    /* Een haarlijn onder elke regel, in de lijnkleur van de site. */
    sheet.rule(sheet.y + LEAD.body - 3.5, RULE, 0.5);
  }
}

// ── de bedragen ──────────────────────────────────────────────────────────────

function drawTotals(sheet, d, fonts) {
  const { t } = d;

  // Net, VAT-with-its-rate and total have to stay together, and they have to
  // stay together with the sentence that explains the VAT line. So the space
  // for all of it is claimed in one go.
  const needed = (d.tegoedCents > 0 ? 5 : 3) * (LEAD.body + 4) + 40;
  if (sheet.y - needed < M.bottom) continuationHead(sheet, d, fonts);

  /* Geen lijn boven de totalen meer: elke regel heeft er al een (15 oktober 2026). */
  let y = sheet.y - 8;

  const row = (label, amount, bold) => {
    /* Het totaal op een lila vlak met het bedrag in violet (15 oktober 2026). */
    if (bold) sheet.vlak(LABEL_RIGHT - 128, y + 13, CONTENT_RIGHT - LABEL_RIGHT + 128 + 8, 21, VLAK, 9);
    sheet.draw(label, {
      x: LABEL_RIGHT, y, size: SIZE.body, align: 'right',
      font: bold ? fonts.bold : fonts.regular, color: bold ? INK : MUTED,
    });
    sheet.draw(amount, {
      x: COL.totalRight, y, size: bold ? SIZE.h2 : SIZE.body, align: 'right',
      font: bold ? fonts.bold : fonts.regular, color: bold ? VIOLET : INK,
    });
    y -= LEAD.body + 4 + (bold ? 3 : 0);
  };

  row(t.net, formatEuro(d.netCents, d.lang), false);

  // THE VAT LINE NEVER DISAPPEARS. BRIEF-14: "the VAT line reads '0,00 — btw
  // verlegd / VAT reverse charged' rather than disappearing." A missing VAT row
  // reads as an oversight; an explicit zero with its reason reads as a decision.
  const vatLabel = d.reverse
    ? t.vatRowReverse
    : d.outside
      ? t.vatRowOutside
      : t.vatRow(formatQty(d.vatRate, d.lang));
  row(vatLabel, formatEuro(d.reverse || d.outside ? 0 : d.vatCents, d.lang), false);

  y -= 2;
  /* De korte lijn boven het totaal is weg: het totaal staat nu op een lila vlak. */
  /* Bij een creditnota zijn grossPaid en grossPayable in de overlay dezelfde tekst, dus
     hangt de totaalregel daar niet meer af van of er een betaaldatum bekend is. Bij een
     factuur blijft dat verschil bestaan en betekent het wat het altijd betekende. */
  row(d.inv.paidAt ? t.grossPaid : t.grossPayable, formatEuro(d.grossCents, d.lang), true);
  /* Met tegoed betaald (29 september 2026): het totaal blijft het totaal, en
     daaronder wat het tegoed dekte en wat er (nog) via de bank ging. */
  if (d.tegoedCents > 0) {
    row(t.tegoedRow, `- ${formatEuro(d.tegoedCents, d.lang)}`, false);
    row(d.inv.paidAt ? t.restPaid : t.restPayable, formatEuro(d.grossCents - d.tegoedCents, d.lang), true);
  }

  sheet.y = y - 6;
}

// ── de mededelingen ──────────────────────────────────────────────────────────

function drawStatements(sheet, d, fonts) {
  const { t } = d;
  const notes = [];

  if (d.reverse) {
    // All three parts are required and all three are printed: the words, the
    // article, and the customer's number (that one lives in the address block).
    notes.push({ bold: true, text: `${t.reverseShort} — ${t.reverseArticle}` });
    notes.push({ bold: false, text: t.reverseBody });
    if (d.customer.vat) notes.push({ bold: false, text: `${t.customerVat}: ${winAnsi(d.customer.vat)}` });
  } else if (d.outside) {
    notes.push({ bold: true, text: t.outsideScope });
  }

  if (d.inv.viesConsultation) {
    notes.push({ bold: false, text: `${t.vies}: ${winAnsi(d.inv.viesConsultation)}` });
  }
  if (isCredit(d.inv)) {
    /* GEEN IBAN EN GEEN VERVALDATUM. Dat is het hele verschil met een factuur: hier is
       niets te betalen, en een rekeningnummer op dit papier is een uitnodiging om
       nog een keer over te maken. De reden staat erbij als die er is — een
       terugbetaling heeft altijd een verhaal, en dat verhaal hoort op de nota. */
    notes.push({ bold: true, text: t.creditBody });
    if (d.inv.reason) {
      notes.push({ bold: false, text: `${t.reasonLabel}: ${winAnsi(String(d.inv.reason))}` });
    }
    /* GEEN "TERUGBETAALD OP" — en dat is een correctie op de eerste versie hiervan.
       Die zette `paidAt` uit de FACTUUR onder de nota, dus stond er "Terugbetaald op
       1 augustus 2026" terwijl dat de datum was waarop de klant BETAALDE. Een datum
       die er geloofwaardig uitziet en het verkeerde ding zegt, is erger dan geen
       datum. De echte terugbetaaldatum is de datum van deze nota, en die staat
       hierboven als Creditnotadatum. Vandaar dat creditSnapshotFrom() `paidAt` op
       null zet en hier niets extra's staat. */
  } else if (d.inv.paidAt) {
    notes.push({ bold: false, text: t.paidNote(formatDate(d.inv.paidAt, d.lang)) });
  } else {
    if (d.inv.dueDate) notes.push({ bold: false, text: t.dueNote(formatDate(d.inv.dueDate, d.lang)) });
    if (d.seller.iban) notes.push({ bold: false, text: t.ibanNote(winAnsi(d.seller.iban)) });
  }
  // The reference is NOT repeated here: it already sits in the block next to the
  // invoice number, and a number printed twice invites the question which of the
  // two is the real one.
  if (!notes.length) return;

  const wrapped = notes.flatMap((n) => sheet.wrap(n.text, n.bold ? fonts.bold : fonts.regular, SIZE.small, CONTENT_W)
    .map((line) => ({ bold: n.bold, line })));

  const needed = wrapped.length * LEAD.small + 22;
  if (sheet.y - needed < M.bottom) continuationHead(sheet, d, fonts);

  sheet.y -= 14;
  sheet.rule(sheet.y);
  sheet.y -= 16;

  for (const { bold, line } of wrapped) {
    sheet.draw(line, {
      x: M.left, y: sheet.y, size: SIZE.small,
      font: bold ? fonts.bold : fonts.regular,
      color: bold ? INK : MUTED,
    });
    sheet.y -= LEAD.small;
  }
}

/** Footers last, because "page 2 of 4" cannot be written before page 4 exists. */
function drawFooters(sheet, d, fonts) {
  const total = sheet.pages.length;
  const identity = [
    winAnsi(d.seller.name),
    d.seller.vat ? `${d.t.sellerVat} ${winAnsi(d.seller.vat)}` : '',
    d.seller.kvk ? `${d.t.sellerKvk} ${winAnsi(d.seller.kvk)}` : '',
  ].filter(Boolean).join('  ·  ');

  sheet.pages.forEach((page, i) => {
    page.drawLine({
      start: { x: M.left, y: 46 },
      end: { x: CONTENT_RIGHT, y: 46 },
      thickness: 0.6,
      color: RULE,
    });
    page.drawText(winAnsi(identity), {
      x: M.left, y: 34, size: SIZE.tiny, font: fonts.regular, color: MUTED,
    });
    const label = winAnsi(d.t.page(i + 1, total));
    page.drawText(label, {
      x: CONTENT_RIGHT - fonts.regular.widthOfTextAtSize(label, SIZE.tiny),
      y: 34,
      size: SIZE.tiny,
      font: fonts.regular,
      color: MUTED,
    });
  });
}

export default renderInvoicePdf;
