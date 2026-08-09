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

const INK = rgb(0.08, 0.08, 0.09);
const MUTED = rgb(0.42, 0.43, 0.46);
const RULE = rgb(0.78, 0.79, 0.81);

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
    return page;
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
  const t = TEXT[lang];
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
  pdf.setTitle(`${t.title === 'FACTUUR' ? 'Factuur' : 'Invoice'} ${winAnsi(d.inv.number ?? '')}`.trim());
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
 * ── DE MAAT EN DE HOOGTE, UITGEREKEND IN PLAATS VAN GEGOKT ──────────────────
 *
 * Eerste poging: 21pt hoog, bovenkant 3pt boven de regel. Op de proef stond het
 * teken zichtbaar te laag — de punt van de V hing veertien punten onder de
 * basislijn van VISUAILS — en dat leest als twee dingen die toevallig naast
 * elkaar staan in plaats van als één merk.
 *
 * Een lockup hangt aan de KAPITAALHOOGTE van het woord ernaast, niet aan de
 * puntgrootte. Helvetica-Bold heeft een kapitaalhoogte van 718/1000 em; dat is een
 * vaste eigenschap van het standaardlettertype en mag dus als getal opgeschreven
 * worden. Bij 19pt is dat 13,6pt: de afstand van de basislijn tot de bovenkant van
 * de V van VISUAILS.
 *
 * Het teken krijgt 12% overhoogte, gelijk verdeeld boven en onder die band. Exact
 * op kapitaalhoogte oogt een spitse vorm te klein naast rechthoekige letters —
 * dezelfde reden dat een ronde o in elk lettertype iets buiten de regel steekt.
 */
const CAP_RATIO = 0.718;
const MARK_OVERSHOOT = 1.12;
const CAP_H = CAP_RATIO * SIZE.h1;
const MARK_H = CAP_H * MARK_OVERSHOOT;
const MARK_W = (MARK_H / VIEWBOX_H) * VIEWBOX_W;
/*
 * Lucht tussen teken en woord: iets minder dan de helft van de breedte van het
 * teken, dezelfde verhouding als het mailbriefhoofd (28px teken, 12px lucht). Op
 * 9pt naast een teken van 13pt stond het woord los; op deze maat lezen ze als één
 * geheel zonder tegen elkaar aan te staan.
 */
const MARK_GAP = MARK_W * 0.45;

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
  const scale = MARK_H / VIEWBOX_H;
  const markTop = baseline + CAP_H + (MARK_H - CAP_H) / 2;
  for (const p of MARK_PATHS) {
    sheet.svg(p, { x: M.left, y: markTop, scale });
  }

  sheet.draw(d.seller.name, { x: M.left + MARK_W + MARK_GAP, y: baseline, size: SIZE.h1, font: fonts.bold });
  sheet.draw(t.title, { x: CONTENT_RIGHT, y: top - 2, size: SIZE.h2, font: fonts.bold, align: 'right' });

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

  sheet.y = y - 12;
  sheet.rule(sheet.y);
  sheet.y -= 22;
}

// ── partijen en factuurgegevens ──────────────────────────────────────────────

function drawParties(sheet, d, fonts) {
  const { t } = d;
  const top = sheet.y;
  const colW = CONTENT_W * 0.52;

  sheet.draw(t.billedTo.toUpperCase(), { x: M.left, y: top, size: SIZE.tiny, font: fonts.bold, color: MUTED });
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
  if (d.inv.reference) rows.push([t.reference, winAnsi(d.inv.reference)]);

  let y = top;
  for (const [label, value] of rows) {
    sheet.draw(label, { x: COL.unitRight, y, size: SIZE.small, color: MUTED, align: 'right' });
    sheet.draw(value, { x: CONTENT_RIGHT, y, size: SIZE.body, font: fonts.bold, align: 'right' });
    y -= LEAD.body + 2;
  }

  sheet.y = Math.min(sheet.partiesBottom ?? y, y) - 16;
}

// ── de regels ────────────────────────────────────────────────────────────────

function tableHead(sheet, d, fonts) {
  const { t } = d;
  const y = sheet.y;
  sheet.draw(t.colDesc, { x: COL.desc, y, size: SIZE.tiny, font: fonts.bold, color: MUTED });
  sheet.draw(t.colQty, { x: COL.qtyRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.draw(t.colUnit, { x: COL.unitRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.draw(t.colTotal, { x: COL.totalRight, y, size: SIZE.tiny, font: fonts.bold, color: MUTED, align: 'right' });
  sheet.y = y - 7;
  sheet.rule(sheet.y);
  sheet.y -= 14;
}

/** A continuation page repeats who this is and which invoice it is, because a
 *  loose second sheet with only numbers on it is a filing problem. */
function continuationHead(sheet, d, fonts) {
  sheet.newPage();
  const y = sheet.y;
  sheet.draw(d.seller.name, { x: M.left, y, size: SIZE.body, font: fonts.bold });
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
    const height = Math.max(parts.length * LEAD.body, LEAD.body) + 5;

    if (sheet.y - height < M.bottom) continuationHead(sheet, d, fonts);

    const y = sheet.y;
    parts.forEach((part, i) => {
      sheet.draw(part, { x: COL.desc, y: y - i * LEAD.body, size: SIZE.body });
    });
    sheet.draw(formatQty(line.qty, d.lang), { x: COL.qtyRight, y, size: SIZE.body, align: 'right' });
    sheet.draw(formatEuro(line.unitCents, d.lang), { x: COL.unitRight, y, size: SIZE.body, align: 'right' });
    sheet.draw(formatEuro(line.totalCents, d.lang), { x: COL.totalRight, y, size: SIZE.body, align: 'right' });

    sheet.y = y - height;
  }
}

// ── de bedragen ──────────────────────────────────────────────────────────────

function drawTotals(sheet, d, fonts) {
  const { t } = d;

  // Net, VAT-with-its-rate and total have to stay together, and they have to
  // stay together with the sentence that explains the VAT line. So the space
  // for all of it is claimed in one go.
  const needed = 3 * (LEAD.body + 4) + 40;
  if (sheet.y - needed < M.bottom) continuationHead(sheet, d, fonts);

  sheet.rule(sheet.y + 6);
  let y = sheet.y - 8;

  const row = (label, amount, bold) => {
    sheet.draw(label, {
      x: LABEL_RIGHT, y, size: SIZE.body, align: 'right',
      font: bold ? fonts.bold : fonts.regular, color: bold ? INK : MUTED,
    });
    sheet.draw(amount, {
      x: COL.totalRight, y, size: bold ? SIZE.h2 : SIZE.body, align: 'right',
      font: bold ? fonts.bold : fonts.regular,
    });
    y -= LEAD.body + 4;
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
  sheet.page.drawLine({
    start: { x: LABEL_RIGHT - 120, y: y + LEAD.body - 2 },
    end: { x: CONTENT_RIGHT, y: y + LEAD.body - 2 },
    thickness: 0.6,
    color: RULE,
  });
  row(d.inv.paidAt ? t.grossPaid : t.grossPayable, formatEuro(d.grossCents, d.lang), true);

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
  if (d.inv.paidAt) {
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
