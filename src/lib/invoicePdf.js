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

import { PDFDocument, StandardFonts, rgb, drawSvgPath, clip, endPath, PDFOperator, PDFName, PDFDict } from 'pdf-lib';

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
   MUTED is #5B5872: 6,9:1 op wit en 6,2:1 op het lila vlak, gemeten.
   SCHEMA A — levering 62 (19 oktober 2026, afvinklijst 41): wit, zwart en grijs zonder
   lila. Violet staat alleen op de site (de voet, het €1-blok, Bestellen, wat je kiest),
   dus op de factuur nergens: de titel, "Factuur aan" en het totaal zijn zwart (NADRUK),
   het vlak is nevel. MUTED #5B5B5B haalt 6,8:1 op wit en 6,1:1 op nevel. */
const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#0F1217');
const MUTED = hex('#565C65');
const RULE = hex('#E6E8EC');
const NADRUK = hex('#0F1217');
const VLAK = hex('#F4F5F7');
const NEVEL = hex('#F4F5F7');

/* ── HET TEKSTLOGO, ALS VECTOR ─────────────────────────────────────────────────
   Letterlijk het pad uit src/data/woordmerk.js (sinds levering 89 het tekstlogo K5), hier
   overgenomen omdat deze module niets mag importeren behalve pdf-lib (zie
   tests/invoice-pdf.test.mjs, die ook nakijkt dat dit pad gelijk is aan dat in
   woordmerk.js). y loopt van -712 (bovenkant) tot 12 (onderkant); de kaplijn is -700 en de
   basislijn 0. Eén vorm, even-oneven gevuld zoals op de site (de A heeft geen binnenruimte,
   dus de gewone regel geeft dezelfde vorm). */
const WOORDMERK_D = "M31.3 -700.0L32.3 -700.0L33.4 -700.0L34.4 -700.0L35.5 -699.9L36.6 -699.9L37.6 -699.9L38.7 -699.8L39.7 -699.8L40.8 -699.7L41.9 -699.7L42.9 -699.6L44.0 -699.5L45.0 -699.5L46.1 -699.4L47.1 -699.3L48.2 -699.2L49.3 -699.1L50.3 -698.9L51.4 -698.8L52.4 -698.7L53.5 -698.6L54.5 -698.4L55.6 -698.3L56.6 -698.1L57.7 -698.0L58.7 -697.8L59.8 -697.6L60.8 -697.5L61.9 -697.3L62.9 -697.1L63.9 -696.9L65.0 -696.7L66.0 -696.5L67.1 -696.3L68.1 -696.0L69.1 -695.8L70.2 -695.6L71.2 -695.3L72.2 -695.1L73.3 -694.8L74.3 -694.6L75.3 -694.3L76.3 -694.0L77.4 -693.7L78.4 -693.5L79.4 -693.2L80.4 -692.9L81.4 -692.6L82.5 -692.2L83.5 -691.9L84.5 -691.6L85.5 -691.3L86.5 -690.9L87.5 -690.6L88.5 -690.2L89.5 -689.9L90.5 -689.5L91.5 -689.2L92.5 -688.8L93.5 -688.4L94.5 -688.0L95.5 -687.6L96.4 -687.2L97.4 -686.8L98.4 -686.4L99.4 -686.0L100.3 -685.6L101.3 -685.2L102.3 -684.7L103.3 -684.3L104.2 -683.9L105.2 -683.4L106.1 -682.9L107.1 -682.5L108.0 -682.0L109.0 -681.5L109.9 -681.1L110.9 -680.6L111.8 -680.1L112.8 -679.6L113.7 -679.1L114.6 -678.6L115.6 -678.1L116.5 -677.5L117.4 -677.0L118.3 -676.5L119.2 -675.9L120.1 -675.4L121.0 -674.9L122.0 -674.3L122.9 -673.7L123.8 -673.2L124.6 -672.6L125.5 -672.0L126.4 -671.4L127.3 -670.9L128.2 -670.3L129.1 -669.7L129.9 -669.1L130.8 -668.5L131.7 -667.8L132.5 -667.2L133.4 -666.6L134.2 -666.0L135.1 -665.3L135.9 -664.7L136.8 -664.1L137.6 -663.4L138.5 -662.7L139.3 -662.1L140.1 -661.4L140.9 -660.8L141.8 -660.1L142.6 -659.4L143.4 -658.7L144.2 -658.0L145.0 -657.3L145.8 -656.6L146.6 -655.9L147.4 -655.2L148.1 -654.5L148.9 -653.8L149.7 -653.1L150.5 -652.3L151.2 -651.6L152.0 -650.8L152.8 -650.1L153.5 -649.4L154.3 -648.6L155.0 -647.8L155.7 -647.1L156.5 -646.3L157.2 -645.6L157.9 -644.8L158.6 -644.0L159.4 -643.2L160.1 -642.4L160.8 -641.6L161.5 -640.8L162.2 -640.0L162.9 -639.2L163.6 -638.4L164.2 -637.6L164.9 -636.8L165.6 -636.0L166.2 -635.1L166.9 -634.3L167.6 -633.5L168.2 -632.6L168.9 -631.8L169.5 -630.9L170.1 -630.1L170.8 -629.2L171.4 -628.4L172.0 -627.5L172.6 -626.7L173.2 -625.8L173.8 -624.9L174.4 -624.0L175.0 -623.2L175.6 -622.3L176.2 -621.4L176.8 -620.5L177.3 -619.6L177.9 -618.7L178.5 -617.8L179.0 -616.9L179.6 -616.0L180.1 -615.1L180.6 -614.2L181.2 -613.2L181.7 -612.3L182.2 -611.4L182.7 -610.5L183.2 -609.5L183.7 -608.6L184.2 -607.7L184.7 -606.7L185.2 -605.8L185.7 -604.8L186.2 -603.9L186.6 -602.9L187.1 -602.0L187.6 -601.0L188.0 -600.1L188.4 -599.1L188.9 -598.1L189.3 -597.2L189.7 -596.2L190.2 -595.2L190.6 -594.2L191.0 -593.3L191.4 -592.3L191.8 -591.3L192.2 -590.3L192.6 -589.3L192.9 -588.3L193.3 -587.3L193.7 -586.3L194.0 -585.3L194.4 -584.3L194.7 -583.3L195.1 -582.3L195.4 -581.3L195.8 -580.3L196.1 -579.3L341.1 -92.0L345.1 -92.0L478.1 -545.3L684.4 -700.0L684.4 -700.0L469.1 -0.0L216.1 -0.0L0.0 -700.0ZM804.3 -0.0L651.7 -0.0L651.7 -412.6L720.8 -637.4L804.3 -700.0ZM967.9 -197.8L968.5 -194.5L969.2 -191.3L970.0 -188.1L970.9 -184.9L971.9 -181.8L972.9 -178.8L974.1 -175.8L975.4 -172.9L976.7 -170.0L978.1 -167.2L979.6 -164.4L981.3 -161.7L983.0 -159.1L984.7 -156.5L986.6 -154.0L988.5 -151.5L990.6 -149.2L992.7 -146.9L994.8 -144.7L997.1 -142.5L999.4 -140.5L1001.9 -138.5L1004.4 -136.5L1007.0 -134.7L1009.6 -132.9L1012.4 -131.2L1015.2 -129.6L1018.1 -128.0L1021.1 -126.5L1024.1 -125.1L1027.2 -123.8L1030.4 -122.6L1033.6 -121.5L1036.9 -120.5L1040.3 -119.6L1043.7 -118.8L1047.2 -118.1L1050.7 -117.5L1054.3 -117.0L1058.0 -116.5L1061.7 -116.2L1065.5 -116.0L1069.4 -115.8L1073.3 -115.8L1076.5 -115.8L1079.7 -115.9L1082.8 -116.0L1085.9 -116.3L1089.0 -116.5L1092.0 -116.9L1095.0 -117.3L1097.9 -117.7L1100.7 -118.3L1103.6 -118.8L1106.3 -119.5L1109.1 -120.2L1111.8 -121.0L1114.4 -121.8L1117.0 -122.7L1119.5 -123.6L1122.0 -124.7L1124.5 -125.7L1126.8 -126.9L1129.1 -128.1L1131.4 -129.4L1133.5 -130.7L1135.7 -132.1L1137.7 -133.6L1139.7 -135.1L1141.6 -136.7L1143.5 -138.4L1145.2 -140.1L1147.0 -141.9L1148.6 -143.8L1150.2 -145.7L1151.8 -147.7L1153.2 -149.7L1154.6 -151.8L1155.8 -154.0L1157.0 -156.3L1158.1 -158.6L1159.1 -161.0L1160.0 -163.4L1160.8 -166.0L1161.5 -168.6L1162.1 -171.2L1162.6 -174.0L1163.0 -176.8L1163.3 -179.6L1163.6 -182.5L1163.7 -185.5L1163.8 -188.6L1163.7 -191.9L1163.5 -195.1L1163.3 -198.2L1162.9 -201.3L1162.4 -204.3L1161.8 -207.3L1161.1 -210.2L1160.3 -213.0L1159.4 -215.8L1158.3 -218.5L1157.2 -221.1L1155.9 -223.7L1154.6 -226.2L1153.1 -228.7L1151.5 -231.1L1149.8 -233.4L1148.0 -235.7L1146.2 -237.9L1144.2 -240.1L1142.2 -242.3L1140.1 -244.4L1137.9 -246.5L1135.6 -248.6L1133.2 -250.6L1130.8 -252.5L1128.3 -254.5L1125.7 -256.4L1123.0 -258.2L1120.2 -260.0L1117.3 -261.8L1114.4 -263.6L1111.4 -265.3L1108.3 -266.9L1105.2 -268.6L1102.0 -270.2L1098.7 -271.8L1095.4 -273.4L1092.1 -275.0L1088.7 -276.5L1085.3 -278.1L1081.8 -279.6L1078.2 -281.1L1074.6 -282.6L1071.0 -284.0L1067.3 -285.4L1063.6 -286.9L1059.8 -288.3L1055.9 -289.6L1052.0 -291.0L1048.1 -292.4L1044.2 -293.7L1040.2 -295.1L1036.3 -296.5L1036.3 -296.5L1036.3 -296.5L1032.3 -297.9L1032.3 -297.9L1028.2 -299.3L1028.2 -299.3L1024.2 -300.7L1024.2 -300.7L1020.1 -302.1L1020.1 -302.1L1016.0 -303.5L1016.0 -303.5L1011.9 -304.9L1011.9 -304.9L1007.7 -306.3L1007.7 -306.3L1003.5 -307.7L1003.5 -307.7L999.4 -309.1L999.4 -309.1L995.1 -310.6L995.1 -310.6L991.0 -311.9L991.0 -311.9L991.0 -311.9L990.9 -312.0L980.6 -315.6L970.7 -319.3L961.0 -323.1L951.7 -327.1L942.6 -331.3L933.9 -335.6L925.4 -340.0L917.2 -344.6L909.4 -349.3L901.8 -354.2L894.5 -359.2L887.5 -364.3L880.8 -369.6L874.4 -375.0L868.3 -380.6L862.5 -386.3L857.5 -391.7L857.5 -630.3L861.6 -635.1L866.2 -640.2L871.0 -645.1L875.9 -649.8L881.1 -654.3L886.4 -658.7L892.0 -663.0L897.7 -667.0L903.6 -670.9L909.7 -674.7L916.0 -678.3L922.4 -681.7L929.1 -684.9L935.9 -688.0L942.9 -690.9L950.0 -693.6L957.2 -696.2L964.5 -698.5L971.9 -700.7L979.5 -702.6L987.1 -704.4L994.9 -706.0L1002.7 -707.4L1010.7 -708.6L1018.8 -709.7L1027.0 -710.5L1035.3 -711.2L1043.7 -711.6L1052.3 -711.9L1060.9 -712.0L1069.9 -711.9L1078.8 -711.6L1087.5 -711.1L1096.1 -710.5L1104.5 -709.6L1112.8 -708.5L1121.0 -707.3L1129.0 -705.8L1137.0 -704.2L1144.7 -702.4L1152.3 -700.4L1159.8 -698.2L1167.2 -695.8L1174.4 -693.2L1181.5 -690.4L1188.4 -687.4L1195.2 -684.2L1201.8 -680.9L1208.3 -677.4L1214.5 -673.7L1220.6 -669.9L1226.5 -665.9L1232.2 -661.7L1237.8 -657.4L1243.2 -652.9L1248.4 -648.2L1253.4 -643.3L1258.2 -638.3L1262.9 -633.1L1267.4 -627.8L1271.7 -622.2L1272.2 -621.5L1272.2 -505.4L1147.4 -505.4L1144.5 -519.6L1143.9 -522.3L1143.2 -524.9L1142.5 -527.5L1141.7 -530.1L1140.8 -532.6L1139.8 -535.1L1138.7 -537.5L1137.6 -539.9L1136.3 -542.2L1135.0 -544.5L1133.6 -546.7L1132.1 -548.9L1130.5 -551.0L1128.9 -553.1L1127.3 -555.1L1125.5 -557.1L1123.8 -559.0L1121.9 -560.8L1120.0 -562.6L1118.1 -564.3L1116.1 -566.0L1114.0 -567.6L1111.8 -569.1L1109.7 -570.6L1107.4 -572.0L1105.1 -573.4L1102.7 -574.7L1100.3 -575.9L1097.8 -577.1L1095.3 -578.1L1092.8 -579.1L1090.2 -580.0L1087.5 -580.9L1084.9 -581.6L1082.1 -582.3L1079.3 -582.9L1076.5 -583.4L1073.7 -583.9L1070.7 -584.2L1067.8 -584.5L1064.8 -584.7L1061.7 -584.8L1058.6 -584.9L1055.9 -584.9L1053.2 -584.9L1050.5 -584.9L1047.8 -584.8L1045.2 -584.6L1042.6 -584.3L1040.1 -584.0L1037.5 -583.7L1035.0 -583.3L1032.5 -582.8L1030.0 -582.2L1027.6 -581.6L1025.2 -581.0L1022.8 -580.2L1020.5 -579.4L1018.2 -578.6L1015.9 -577.7L1013.7 -576.7L1011.5 -575.7L1009.4 -574.6L1007.3 -573.5L1005.4 -572.2L1003.4 -571.0L1001.6 -569.7L999.8 -568.3L998.0 -566.8L996.3 -565.4L994.7 -563.8L993.1 -562.2L991.6 -560.5L990.1 -558.8L988.7 -557.0L987.4 -555.1L986.1 -553.2L985.0 -551.2L983.9 -549.2L982.9 -547.1L982.0 -544.9L981.2 -542.7L980.5 -540.3L979.8 -538.0L979.3 -535.5L978.8 -533.0L978.4 -530.4L978.1 -527.8L977.9 -525.1L977.8 -522.3L977.7 -519.4L977.8 -516.7L977.9 -514.1L978.1 -511.5L978.4 -508.9L978.8 -506.4L979.3 -504.0L979.8 -501.5L980.5 -499.2L981.2 -496.8L982.0 -494.5L982.9 -492.3L983.9 -490.1L985.0 -488.0L986.2 -485.9L987.4 -483.8L988.8 -481.8L990.2 -479.8L991.7 -477.9L993.2 -476.0L994.8 -474.1L996.5 -472.3L998.3 -470.5L1000.1 -468.8L1002.0 -467.0L1004.0 -465.3L1006.0 -463.7L1008.2 -462.0L1010.3 -460.4L1012.6 -458.9L1014.9 -457.3L1017.3 -455.8L1019.8 -454.4L1022.3 -452.9L1024.9 -451.5L1027.5 -450.1L1030.2 -448.7L1033.0 -447.3L1035.8 -445.9L1038.6 -444.5L1041.6 -443.1L1044.6 -441.7L1047.6 -440.3L1050.7 -439.0L1053.8 -437.6L1057.0 -436.3L1060.3 -434.9L1063.6 -433.6L1067.0 -432.3L1070.4 -430.9L1073.9 -429.6L1077.4 -428.3L1081.0 -427.0L1084.5 -425.6L1088.2 -424.3L1091.8 -423.0L1095.6 -421.6L1099.3 -420.3L1103.1 -418.9L1106.9 -417.6L1110.8 -416.2L1114.7 -414.9L1118.7 -413.5L1122.7 -412.2L1126.7 -410.8L1133.3 -408.5L1139.9 -406.2L1146.4 -403.8L1152.9 -401.4L1159.3 -398.9L1165.6 -396.4L1171.8 -393.8L1178.0 -391.2L1184.2 -388.5L1190.2 -385.8L1196.2 -383.0L1202.2 -380.2L1208.0 -377.3L1213.9 -374.3L1219.6 -371.3L1225.3 -368.3L1230.9 -365.2L1236.3 -362.0L1241.6 -358.6L1246.8 -355.1L1251.8 -351.5L1256.7 -347.8L1261.5 -344.0L1266.1 -340.1L1270.5 -336.0L1272.2 -334.4L1272.2 -62.8L1270.6 -61.1L1265.6 -56.0L1260.4 -51.1L1255.0 -46.4L1249.3 -41.8L1243.5 -37.3L1237.5 -33.0L1231.2 -28.8L1224.7 -24.8L1218.0 -20.9L1211.2 -17.2L1204.1 -13.6L1196.8 -10.3L1189.3 -7.3L1181.6 -4.4L1173.7 -1.8L1165.6 0.6L1157.3 2.8L1148.9 4.7L1140.2 6.4L1131.3 7.9L1122.2 9.2L1112.9 10.2L1103.5 11.0L1093.8 11.5L1083.9 11.9L1073.8 12.0L1064.5 11.9L1055.2 11.6L1046.1 11.1L1037.1 10.4L1028.2 9.5L1019.4 8.4L1010.7 7.1L1002.1 5.6L993.7 3.9L985.4 2.0L977.2 -0.1L969.1 -2.4L961.1 -4.9L953.2 -7.6L945.5 -10.5L937.9 -13.6L930.4 -16.9L923.1 -20.4L916.1 -24.1L909.2 -28.0L902.5 -32.0L896.0 -36.3L889.7 -40.7L883.6 -45.4L877.7 -50.2L872.0 -55.2L866.5 -60.4L861.2 -65.8L857.5 -69.9L857.5 -211.6L965.4 -211.6ZM1589.3 11.5L1579.7 10.9L1570.2 10.0L1560.8 8.9L1551.6 7.6L1542.4 6.0L1533.4 4.2L1524.5 2.1L1515.7 -0.3L1507.0 -2.8L1498.4 -5.6L1489.9 -8.7L1481.6 -12.0L1473.4 -15.6L1465.2 -19.4L1457.3 -23.4L1449.5 -27.7L1442.0 -32.3L1434.7 -37.1L1427.5 -42.1L1420.6 -47.4L1413.9 -53.0L1407.4 -58.8L1401.1 -64.8L1395.1 -71.1L1389.2 -77.7L1383.6 -84.5L1378.1 -91.5L1372.9 -98.8L1367.9 -106.4L1363.1 -114.2L1358.5 -122.2L1354.2 -130.5L1350.3 -139.1L1346.6 -147.9L1343.2 -157.0L1340.1 -166.4L1337.3 -175.9L1334.8 -185.8L1332.6 -195.9L1330.7 -206.3L1329.1 -216.9L1327.8 -227.7L1326.7 -238.9L1326.0 -250.2L1325.6 -261.9L1325.4 -273.8L1325.4 -700.0L1478.0 -700.0L1478.0 -272.8L1478.1 -267.0L1478.2 -261.3L1478.5 -255.8L1479.0 -250.3L1479.5 -245.0L1480.2 -239.8L1481.0 -234.6L1481.9 -229.6L1482.9 -224.8L1484.0 -220.0L1485.3 -215.3L1486.7 -210.8L1488.2 -206.3L1489.8 -202.0L1491.5 -197.8L1493.4 -193.7L1495.4 -189.7L1497.5 -185.9L1499.7 -182.1L1502.0 -178.5L1504.5 -175.0L1507.0 -171.7L1509.7 -168.4L1512.5 -165.3L1515.4 -162.3L1518.4 -159.5L1521.6 -156.7L1524.8 -154.1L1528.2 -151.6L1531.7 -149.3L1535.2 -147.0L1539.0 -144.9L1542.8 -142.9L1546.7 -141.0L1550.7 -139.3L1554.8 -137.7L1559.0 -136.2L1563.3 -134.9L1567.7 -133.7L1572.2 -132.6L1576.8 -131.6L1581.5 -130.8L1586.3 -130.1L1591.1 -129.5L1596.1 -129.0L1601.2 -128.7L1606.4 -128.5L1611.6 -128.4L1617.0 -128.5L1622.3 -128.7L1627.5 -129.0L1632.6 -129.5L1637.5 -130.1L1642.4 -130.8L1647.1 -131.6L1651.8 -132.6L1656.3 -133.7L1660.7 -134.9L1665.1 -136.2L1669.3 -137.7L1673.4 -139.3L1677.4 -141.0L1681.3 -142.9L1685.1 -144.9L1688.8 -147.0L1692.4 -149.3L1695.8 -151.6L1699.2 -154.1L1702.4 -156.7L1705.6 -159.5L1708.6 -162.3L1711.5 -165.3L1714.3 -168.4L1717.0 -171.7L1719.5 -175.0L1722.0 -178.5L1724.3 -182.1L1726.6 -185.9L1728.7 -189.7L1730.7 -193.7L1732.6 -197.8L1734.4 -202.0L1736.1 -206.3L1737.6 -210.8L1739.0 -215.3L1740.3 -220.0L1741.5 -224.8L1742.5 -229.6L1743.4 -234.6L1744.2 -239.8L1744.9 -245.0L1745.4 -250.3L1745.9 -255.8L1746.2 -261.3L1746.4 -267.0L1746.4 -272.8L1746.4 -585.5L1899.0 -700.0L1899.0 -273.8L1899.0 -0.0L1746.4 -0.0L1746.4 -15.8L1745.9 -15.6L1737.5 -12.0L1729.0 -8.7L1720.4 -5.6L1711.7 -2.8L1702.8 -0.3L1693.9 2.1L1684.9 4.2L1675.7 6.0L1666.5 7.6L1657.1 8.9L1647.7 10.0L1638.1 10.9L1628.5 11.5L1618.7 11.9L1608.9 12.0L1599.0 11.9ZM2550.1 -0.0L2549.0 -0.0L2548.0 -0.1L2546.9 -0.1L2545.8 -0.1L2544.8 -0.2L2543.7 -0.2L2542.7 -0.3L2541.6 -0.3L2540.5 -0.4L2539.5 -0.5L2538.4 -0.5L2537.4 -0.6L2536.3 -0.7L2535.3 -0.8L2534.2 -0.9L2533.1 -1.1L2532.1 -1.2L2531.0 -1.3L2530.0 -1.4L2528.9 -1.6L2527.9 -1.7L2526.8 -1.9L2525.8 -2.0L2524.7 -2.2L2523.7 -2.4L2522.6 -2.5L2521.6 -2.7L2520.6 -2.9L2519.5 -3.1L2518.5 -3.3L2517.4 -3.5L2516.4 -3.7L2515.4 -4.0L2514.3 -4.2L2513.3 -4.4L2512.3 -4.7L2511.2 -4.9L2510.2 -5.2L2509.2 -5.4L2508.1 -5.7L2507.1 -6.0L2506.1 -6.3L2505.1 -6.5L2504.0 -6.8L2503.0 -7.1L2502.0 -7.4L2501.0 -7.8L2500.0 -8.1L2499.0 -8.4L2498.0 -8.7L2497.0 -9.1L2496.0 -9.4L2495.0 -9.8L2494.0 -10.1L2493.0 -10.5L2492.0 -10.8L2491.0 -11.2L2490.0 -11.6L2489.0 -12.0L2488.0 -12.4L2487.0 -12.8L2486.0 -13.2L2485.1 -13.6L2484.1 -14.0L2483.1 -14.4L2482.1 -14.8L2481.2 -15.3L2480.2 -15.7L2479.2 -16.1L2478.3 -16.6L2477.3 -17.1L2476.4 -17.5L2475.4 -18.0L2474.5 -18.5L2473.5 -18.9L2472.6 -19.4L2471.6 -19.9L2470.7 -20.4L2469.8 -20.9L2468.8 -21.4L2467.9 -21.9L2467.0 -22.5L2466.1 -23.0L2465.1 -23.5L2464.2 -24.1L2463.3 -24.6L2462.4 -25.1L2461.5 -25.7L2460.6 -26.3L2459.7 -26.8L2458.8 -27.4L2457.9 -28.0L2457.0 -28.6L2456.1 -29.1L2455.3 -29.7L2454.4 -30.3L2453.5 -30.9L2452.6 -31.5L2451.8 -32.2L2450.9 -32.8L2450.1 -33.4L2449.2 -34.0L2448.4 -34.7L2447.5 -35.3L2446.7 -35.9L2445.8 -36.6L2445.0 -37.3L2444.2 -37.9L2443.3 -38.6L2442.5 -39.2L2441.7 -39.9L2440.9 -40.6L2440.1 -41.3L2439.3 -42.0L2438.5 -42.7L2437.7 -43.4L2436.9 -44.1L2436.1 -44.8L2435.3 -45.5L2434.5 -46.2L2433.7 -46.9L2433.0 -47.7L2432.2 -48.4L2431.5 -49.2L2430.7 -49.9L2429.9 -50.6L2429.2 -51.4L2428.5 -52.2L2427.7 -52.9L2427.0 -53.7L2426.2 -54.4L2425.5 -55.2L2424.8 -56.0L2424.1 -56.8L2423.4 -57.6L2422.7 -58.4L2422.0 -59.2L2421.3 -60.0L2420.6 -60.8L2419.9 -61.6L2419.2 -62.4L2418.5 -63.2L2417.9 -64.0L2417.2 -64.9L2416.6 -65.7L2415.9 -66.5L2415.2 -67.4L2414.6 -68.2L2414.0 -69.1L2413.3 -69.9L2412.7 -70.8L2412.1 -71.6L2411.5 -72.5L2410.8 -73.3L2410.2 -74.2L2409.6 -75.1L2409.0 -76.0L2408.4 -76.8L2407.9 -77.7L2407.3 -78.6L2406.7 -79.5L2406.1 -80.4L2405.6 -81.3L2405.0 -82.2L2404.4 -83.1L2403.9 -84.0L2403.4 -84.9L2402.8 -85.8L2402.3 -86.8L2401.8 -87.7L2401.2 -88.6L2400.7 -89.5L2400.2 -90.5L2399.7 -91.4L2399.2 -92.3L2398.7 -93.3L2398.2 -94.2L2397.8 -95.2L2397.3 -96.1L2396.8 -97.1L2396.4 -98.0L2395.9 -99.0L2395.5 -99.9L2395.0 -100.9L2394.6 -101.9L2394.1 -102.8L2393.7 -103.8L2393.3 -104.8L2392.9 -105.8L2392.5 -106.7L2392.1 -107.7L2391.7 -108.7L2391.3 -109.7L2390.9 -110.7L2390.5 -111.7L2390.1 -112.7L2389.8 -113.7L2389.4 -114.7L2389.1 -115.7L2388.7 -116.7L2388.4 -117.7L2388.0 -118.7L2387.7 -119.7L2387.4 -120.7L2242.4 -608.0L2238.4 -608.0L2105.3 -154.7L1952.2 -39.9L1952.2 -173.0L2114.3 -700.0L2367.3 -700.0L2583.5 -0.0L2552.2 -0.0L2551.1 -0.0ZM2736.1 -0.0L2639.1 -0.0L2583.5 -180.3L2583.5 -585.5L2736.1 -700.0ZM2789.3 -585.6L2941.9 -700.0L2941.9 -700.0L2941.9 -118.3L3242.6 -118.3L3242.6 -0.0L2789.3 -0.0ZM3493.6 11.6L3484.4 11.1L3475.4 10.4L3466.5 9.5L3457.7 8.4L3449.0 7.1L3440.5 5.6L3432.0 3.9L3423.7 2.0L3415.5 -0.1L3407.4 -2.4L3399.4 -4.9L3391.6 -7.6L3383.8 -10.5L3376.2 -13.6L3368.7 -16.9L3361.5 -20.4L3354.4 -24.1L3347.5 -28.0L3340.8 -32.0L3334.3 -36.3L3328.1 -40.7L3322.0 -45.4L3316.1 -50.2L3310.4 -55.2L3304.9 -60.4L3299.6 -65.8L3295.8 -69.9L3295.8 -211.6L3404.7 -211.6L3405.0 -208.1L3405.3 -204.6L3405.7 -201.2L3406.3 -197.8L3406.9 -194.5L3407.6 -191.3L3408.4 -188.1L3409.2 -184.9L3410.2 -181.8L3411.3 -178.8L3412.4 -175.8L3413.7 -172.9L3415.0 -170.0L3416.5 -167.2L3418.0 -164.4L3419.6 -161.7L3421.3 -159.1L3423.1 -156.5L3424.9 -154.0L3426.9 -151.5L3428.9 -149.2L3431.0 -146.9L3433.2 -144.7L3435.4 -142.5L3437.8 -140.5L3440.2 -138.5L3442.7 -136.5L3445.3 -134.7L3448.0 -132.9L3450.7 -131.2L3453.5 -129.6L3456.5 -128.0L3459.4 -126.5L3462.5 -125.1L3465.6 -123.8L3468.7 -122.6L3472.0 -121.5L3475.3 -120.5L3478.6 -119.6L3482.0 -118.8L3485.5 -118.1L3489.1 -117.5L3492.7 -117.0L3496.3 -116.5L3500.1 -116.2L3503.8 -116.0L3507.7 -115.8L3511.6 -115.8L3514.8 -115.8L3518.0 -115.9L3521.2 -116.0L3524.3 -116.3L3527.3 -116.5L3530.3 -116.9L3533.3 -117.3L3536.2 -117.7L3539.1 -118.3L3541.9 -118.8L3544.7 -119.5L3547.4 -120.2L3550.1 -121.0L3552.7 -121.8L3555.3 -122.7L3557.9 -123.6L3560.4 -124.7L3562.8 -125.7L3565.2 -126.9L3567.5 -128.1L3569.7 -129.4L3571.9 -130.7L3574.0 -132.1L3576.0 -133.6L3578.0 -135.1L3579.9 -136.7L3581.8 -138.4L3583.6 -140.1L3585.3 -141.9L3587.0 -143.8L3588.6 -145.7L3590.1 -147.7L3591.5 -149.7L3592.9 -151.8L3594.2 -154.0L3595.3 -156.3L3596.4 -158.6L3597.4 -161.0L3598.3 -163.4L3599.1 -166.0L3599.8 -168.6L3600.4 -171.2L3600.9 -174.0L3601.3 -176.8L3601.7 -179.6L3601.9 -182.5L3602.1 -185.5L3602.1 -188.6L3602.0 -191.9L3601.9 -195.1L3601.6 -198.2L3601.2 -201.3L3600.7 -204.3L3600.1 -207.3L3599.4 -210.2L3598.6 -213.0L3597.7 -215.8L3596.7 -218.5L3595.5 -221.1L3594.3 -223.7L3592.9 -226.2L3591.4 -228.7L3589.8 -231.1L3588.1 -233.4L3586.4 -235.7L3584.5 -237.9L3582.5 -240.1L3580.5 -242.3L3578.4 -244.4L3576.2 -246.5L3573.9 -248.6L3571.6 -250.6L3569.1 -252.5L3566.6 -254.5L3564.0 -256.4L3561.3 -258.2L3558.5 -260.0L3555.7 -261.8L3552.7 -263.6L3549.7 -265.3L3546.6 -266.9L3543.5 -268.6L3540.3 -270.2L3537.1 -271.8L3533.8 -273.4L3530.4 -275.0L3527.1 -276.5L3523.6 -278.1L3520.1 -279.6L3516.6 -281.1L3513.0 -282.6L3509.3 -284.0L3505.6 -285.4L3501.9 -286.9L3498.1 -288.3L3494.3 -289.6L3490.4 -291.0L3486.5 -292.4L3482.5 -293.7L3478.6 -295.1L3474.6 -296.5L3474.6 -296.5L3470.6 -297.9L3470.6 -297.9L3466.6 -299.3L3466.6 -299.3L3462.5 -300.7L3462.5 -300.7L3458.4 -302.1L3458.4 -302.1L3454.3 -303.5L3454.3 -303.5L3450.2 -304.9L3450.2 -304.9L3446.1 -306.3L3446.1 -306.3L3441.9 -307.7L3441.9 -307.7L3437.7 -309.1L3437.7 -309.1L3433.5 -310.6L3433.5 -310.6L3429.2 -312.0L3429.2 -312.0L3429.2 -312.0L3419.0 -315.6L3409.0 -319.3L3399.4 -323.1L3390.0 -327.1L3381.0 -331.3L3372.2 -335.6L3363.7 -340.0L3355.6 -344.6L3347.7 -349.3L3340.1 -354.2L3332.8 -359.2L3325.8 -364.3L3319.1 -369.6L3312.7 -375.0L3306.6 -380.6L3300.8 -386.3L3295.8 -391.7L3295.8 -630.3L3299.9 -635.1L3304.5 -640.2L3309.3 -645.1L3314.3 -649.8L3319.4 -654.3L3324.8 -658.7L3330.3 -663.0L3336.0 -667.0L3341.9 -670.9L3348.0 -674.7L3354.3 -678.3L3360.8 -681.7L3367.4 -684.9L3374.2 -688.0L3381.2 -690.9L3388.3 -693.6L3395.5 -696.2L3402.8 -698.5L3410.3 -700.7L3417.8 -702.6L3425.4 -704.4L3433.2 -706.0L3441.1 -707.4L3449.0 -708.6L3457.1 -709.7L3465.3 -710.5L3473.6 -711.2L3482.1 -711.6L3490.6 -711.9L3499.2 -712.0L3508.2 -711.9L3517.1 -711.6L3525.8 -711.1L3534.4 -710.5L3542.9 -709.6L3551.2 -708.5L3559.3 -707.3L3567.4 -705.8L3575.3 -704.2L3583.1 -702.4L3590.7 -700.4L3598.2 -698.2L3605.5 -695.8L3612.7 -693.2L3619.8 -690.4L3626.8 -687.4L3633.6 -684.2L3640.2 -680.9L3646.6 -677.4L3652.9 -673.7L3658.9 -669.9L3664.9 -665.9L3670.6 -661.7L3676.1 -657.4L3681.5 -652.9L3686.7 -648.2L3691.7 -643.3L3696.5 -638.3L3701.2 -633.1L3705.7 -627.8L3710.0 -622.2L3714.1 -616.5L3718.1 -610.7L3721.7 -604.7L3725.2 -598.5L3728.4 -592.2L3731.4 -585.8L3734.2 -579.2L3736.7 -572.5L3739.0 -565.6L3741.0 -558.6L3742.8 -551.4L3744.4 -544.1L3745.8 -536.7L3746.9 -529.1L3747.8 -521.3L3748.4 -513.4L3748.8 -505.4L3584.4 -505.4L3584.2 -508.3L3584.0 -511.2L3583.7 -514.0L3583.3 -516.8L3582.8 -519.6L3582.2 -522.3L3581.6 -524.9L3580.8 -527.5L3580.0 -530.1L3579.1 -532.6L3578.1 -535.1L3577.1 -537.5L3575.9 -539.9L3574.6 -542.2L3573.3 -544.5L3571.9 -546.7L3570.4 -548.9L3568.9 -551.0L3567.3 -553.1L3565.6 -555.1L3563.9 -557.1L3562.1 -559.0L3560.3 -560.8L3558.4 -562.6L3556.4 -564.3L3554.4 -566.0L3552.3 -567.6L3550.2 -569.1L3548.0 -570.6L3545.7 -572.0L3543.4 -573.4L3541.1 -574.7L3538.6 -575.9L3536.2 -577.1L3533.7 -578.1L3531.1 -579.1L3528.5 -580.0L3525.9 -580.9L3523.2 -581.6L3520.5 -582.3L3517.7 -582.9L3514.9 -583.4L3512.0 -583.9L3509.1 -584.2L3506.1 -584.5L3503.1 -584.7L3500.1 -584.8L3497.0 -584.9L3494.2 -584.9L3491.5 -584.9L3488.8 -584.9L3486.2 -584.8L3483.6 -584.6L3481.0 -584.3L3478.4 -584.0L3475.8 -583.7L3473.3 -583.3L3470.8 -582.8L3468.4 -582.2L3465.9 -581.6L3463.5 -581.0L3461.2 -580.2L3458.8 -579.4L3456.5 -578.6L3454.2 -577.7L3452.0 -576.7L3449.8 -575.7L3447.7 -574.6L3445.7 -573.5L3443.7 -572.2L3441.8 -571.0L3439.9 -569.7L3438.1 -568.3L3436.3 -566.8L3434.6 -565.4L3433.0 -563.8L3431.4 -562.2L3429.9 -560.5L3428.5 -558.8L3427.0 -557.0L3425.7 -555.1L3424.5 -553.2L3423.3 -551.2L3422.2 -549.2L3421.3 -547.1L3420.4 -544.9L3419.5 -542.7L3418.8 -540.3L3418.2 -538.0L3417.6 -535.5L3417.1 -533.0L3416.8 -530.4L3416.5 -527.8L3416.2 -525.1L3416.1 -522.3L3416.1 -519.4L3416.1 -516.7L3416.2 -514.1L3416.5 -511.5L3416.8 -508.9L3417.1 -506.4L3417.6 -504.0L3418.2 -501.5L3418.8 -499.2L3419.6 -496.8L3420.4 -494.5L3421.3 -492.3L3422.3 -490.1L3423.3 -488.0L3424.5 -485.9L3425.8 -483.8L3427.1 -481.8L3428.5 -479.8L3430.0 -477.9L3431.5 -476.0L3433.2 -474.1L3434.9 -472.3L3436.6 -470.5L3438.5 -468.8L3440.4 -467.0L3442.3 -465.3L3444.4 -463.7L3446.5 -462.0L3448.7 -460.4L3450.9 -458.9L3453.3 -457.3L3455.6 -455.8L3458.1 -454.4L3460.6 -452.9L3463.2 -451.5L3465.9 -450.1L3468.6 -448.7L3471.3 -447.3L3474.1 -445.9L3477.0 -444.5L3479.9 -443.1L3482.9 -441.7L3485.9 -440.3L3489.0 -439.0L3492.2 -437.6L3495.4 -436.3L3498.6 -434.9L3502.0 -433.6L3505.3 -432.3L3508.8 -430.9L3512.2 -429.6L3515.7 -428.3L3519.3 -427.0L3522.9 -425.6L3526.5 -424.3L3530.2 -423.0L3533.9 -421.6L3537.6 -420.3L3541.4 -418.9L3545.3 -417.6L3549.1 -416.2L3553.0 -414.9L3557.0 -413.5L3561.0 -412.2L3565.0 -410.8L3571.7 -408.5L3578.2 -406.2L3584.8 -403.8L3591.2 -401.4L3597.6 -398.9L3603.9 -396.4L3610.2 -393.8L3616.4 -391.2L3622.5 -388.5L3628.6 -385.8L3634.6 -383.0L3640.5 -380.2L3646.4 -377.3L3652.2 -374.3L3657.9 -371.3L3663.6 -368.3L3669.2 -365.2L3674.7 -362.0L3680.0 -358.6L3685.1 -355.1L3690.2 -351.5L3695.0 -347.8L3699.8 -344.0L3704.4 -340.1L3708.9 -336.0L3713.2 -331.9L3717.4 -327.6L3721.5 -323.2L3725.4 -318.7L3729.2 -314.1L3732.8 -309.3L3736.3 -304.4L3739.6 -299.4L3742.7 -294.2L3745.6 -288.8L3748.3 -283.2L3750.8 -277.3L3753.0 -271.3L3755.1 -265.1L3756.9 -258.7L3758.5 -252.1L3759.9 -245.3L3761.1 -238.3L3762.0 -231.0L3762.8 -223.6L3763.3 -216.0L3763.6 -208.2L3763.7 -200.2L3763.6 -193.1L3763.3 -186.0L3762.7 -179.0L3761.9 -172.1L3760.9 -165.3L3759.6 -158.5L3758.2 -151.8L3756.5 -145.1L3754.5 -138.6L3752.4 -132.1L3750.0 -125.7L3747.3 -119.3L3744.5 -113.0L3741.4 -106.8L3738.1 -100.7L3734.6 -94.6L3730.8 -88.7L3726.9 -82.9L3722.7 -77.2L3718.3 -71.7L3713.7 -66.3L3709.0 -61.1L3703.9 -56.0L3698.7 -51.1L3693.3 -46.4L3687.7 -41.8L3681.8 -37.3L3675.8 -33.0L3669.5 -28.8L3663.1 -24.8L3656.4 -20.9L3649.5 -17.2L3642.4 -13.6L3635.1 -10.3L3627.6 -7.3L3619.9 -4.4L3612.0 -1.8L3604.0 0.6L3595.7 2.8L3587.2 4.7L3578.5 6.4L3569.6 7.9L3560.6 9.2L3551.3 10.2L3541.8 11.0L3532.1 11.5L3522.3 11.9L3512.2 12.0L3502.8 11.9Z";
const WOORDMERK_BREED = 3763.74;
const WOORDMERK_HOOG = 724;
const WOORDMERK_BOVEN = -712;   /* de bovenkant van het tekenvlak */
const WOORDMERK_KAP = 700;      /* de kaphoogte: de schaal van het tekstlogo is kaphoogte (pt) / 700 */
/* DE LOCKUP (levering 89, lijst 82 B2: goed, alleen in beelden en documenten): het V-merk naast K5, uitgerekend in
   kladblok/levering-89/lockup.py en src/data/woordmerk.js (LOCKUP.L2), in de maten van K5: de V is 2 kaphoogtes
   hoog (schaal 1,72149 op zijn tekening van 702 × 813,25), zijn zwaartepunt op het midden van de kaphoogte (zijn
   bovenkant 967,6 boven de basislijn), de tekst één arm verder (vanaf x 1515,49). */
const LOCKUP_L2 = { s: 1.72149, vy: -967.60, tx: 1515.49 };
/* de snede (levering 86): blauw diep #1A4279, blauw uur #25508B, #2D61A8 op 0, 55 en 100 %; zie svgSnede() */
const SNEDE = [[0, [26 / 255, 66 / 255, 121 / 255]], [0.55, [37 / 255, 80 / 255, 139 / 255]], [1, [45 / 255, 97 / 255, 168 / 255]]];

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

  /** LEVERING 86 (3 november 2026, lijst 72, logo a): het woordmerk in de snede, de fade van
      blauw diep via blauw uur naar #2D61A8 langs de snede van het vlagje (126,87°), zoals op de
      site (#vs-w-snede). pdf-lib tekent geen verloop, maar pdf kent het wel: het pad wordt een
      knipvlak (W n) en daarin één axiaal verloop (sh, ShadingType 2) in de maten van de
      tekening, vanaf (0, -797,25) langs (0,8 · 0,6) over 0,8 × breed + 0,6 × hoog, zoals
      gradientUnits="userSpaceOnUse" op de site. Gewoon vector, een paar honderd bytes. */
  /* Sinds levering 89 met een eigen kader per vorm: het tekstlogo (0, -712, 3763,74 × 724) of het V-merk
     (0, 0, 702 × 813,25), elk met zijn eigen verloop (VsSnede, VsSnedeV), zoals #vs-w-snede en #vs-v-snede. */
  function svgSnede(path, { x = M.left, y = state.y, scale = 1, kader = [0, WOORDMERK_BOVEN, WOORDMERK_BREED, WOORDMERK_HOOG], naam = 'VsSnede' } = {}) {
    const page = state.page, context = page.doc.context;
    const ops = drawSvgPath(path, { x, y, scale, color: INK });
    const f = ops.findIndex((o) => o.toString() === 'f');
    const [kx, ky, kb, kh] = kader;
    const lengte = 0.8 * kb + 0.6 * kh;
    const deel = (C0, C1) => ({ FunctionType: 2, Domain: [0, 1], C0, C1, N: 1 });
    const verloop = context.register(context.obj({
      ShadingType: 2, ColorSpace: 'DeviceRGB', Extend: [true, true],
      Coords: [kx, ky, kx + 0.8 * lengte, ky + 0.6 * lengte],
      Function: { FunctionType: 3, Domain: [0, 1], Bounds: [SNEDE[1][0]], Encode: [0, 1, 0, 1],
        Functions: [deel(SNEDE[0][1], SNEDE[1][1]), deel(SNEDE[1][1], SNEDE[2][1])] },
    }));
    const res = page.node.Resources();
    let tabel = res.lookupMaybe(PDFName.of('Shading'), PDFDict);
    if (!tabel) { tabel = context.obj({}); res.set(PDFName.of('Shading'), tabel); }
    tabel.set(PDFName.of(naam), verloop);
    page.pushOperators(...ops.slice(0, f), clip(), endPath(), PDFOperator.of('sh', [PDFName.of(naam)]), ...ops.slice(f + 1));
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
    svgSnede,
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
   * DE LOCKUP (levering 89). Tot levering 88 stond hier alleen het woordmerk, omdat de V de eerste
   * letter van dat woordmerk was en een tweede V ernaast als een dubbel logo las. Het tekstlogo K5 heeft
   * een eigen V, en Lucas koos in lijst 82 de lockup voor beelden en documenten (B2: goed; waar: a). Dus:
   * het V-merk, twee kaphoogtes hoog, met het tekstlogo één arm erna, allebei in de snede. Het tekstlogo
   * heeft de kaphoogte van de naam in Helvetica Bold die hier ooit stond (19 pt, 0,72 em); de V steekt
   * boven die kaplijn en onder de basislijn uit (zijn zwaartepunt staat op het midden van de kaphoogte).
   * Het watermerk blijft uit (WM_OPACITY 0).
   */
  const kap = SIZE.h1 * 0.72;
  const k = kap / WOORDMERK_KAP;
  for (const [i, path] of MARK_PATHS.entries()) {
    sheet.svgSnede(path, { x: M.left, y: baseline - LOCKUP_L2.vy * k, scale: LOCKUP_L2.s * k, kader: [0, 0, VIEWBOX_W, VIEWBOX_H], naam: `VsSnedeV${i}` });
  }
  sheet.svgSnede(WOORDMERK_D, { x: M.left + LOCKUP_L2.tx * k, y: baseline, scale: k });
  sheet.draw(t.title, { x: CONTENT_RIGHT, y: top - 2, size: SIZE.h2, font: fonts.bold, align: 'right', color: NADRUK });

  // Seller identity. The VAT number and the KVK number are not decoration here:
  // both are required on every invoice we send.
  /* levering 89: 8 pt lager dan het was (top − 24), zodat onder de punt van de V de vrije ruimte van de
     lockup vrij blijft (één kaphoogte, 13,7 pt; de punt steekt 8,5 pt onder de basislijn uit) */
  let y = top - 32;
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

  sheet.draw(t.billedTo.toUpperCase(), { x: M.left, y: top, size: SIZE.tiny, font: fonts.bold, color: NADRUK });
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
  sheet.svgSnede(WOORDMERK_D, { x: M.left, y, scale: (SIZE.body * 0.72) / WOORDMERK_KAP });   /* een vervolgblad: alleen het tekstlogo, klein */
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
      font: bold ? fonts.bold : fonts.regular, color: bold ? NADRUK : INK,
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
