/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE MAIL WAAR DE FACTUUR IN ZIT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM ER GEEN BESTAANDE MAIL WAS OM DE FACTUUR AAN TE HANGEN ────────────
 *
 * Het plan was "de pdf als bijlage bij dezelfde mail waarin de betaling wordt
 * bevestigd". Bij het aansluiten bleek die mail niet te bestaan. De site stuurt
 * er vier: de bevestiging van de aanvraag (met de betaallink erin), de
 * inloglink, de levermail en de checklist. Geen daarvan gaat uit op het moment
 * dat het geld binnenkomt.
 *
 * Dat is op zichzelf een gat. Iemand betaalt en hoort daarna niets tot het werk
 * klaar is — bij een test sample van €1 is dat een dag, bij een catalogorder van
 * een paar duizend euro is het stil op precies het verkeerde moment. Dus dit is
 * die mail: één bericht, verstuurd door de betaalwebhook, dat zegt dat het geld
 * binnen is en de factuur meestuurt.
 *
 * ── DE BIJLAGE KOMT UIT R2 EN NIET UIT HET GEHEUGEN ──────────────────────────
 *
 * issueInvoice() heeft de bytes net gemaakt en zou ze kunnen doorgeven. Toch
 * lezen we ze terug uit R2, en dat is met opzet: als het object er niet blijkt
 * te staan, dan klopt de belofte in deze mail niet. Liever de mail zonder
 * bijlage én zonder die belofte, dan een mail die zegt "de factuur zit
 * hierbij" bij een lege paperclip. Het kost één leesactie in hetzelfde netwerk.
 *
 * ── WAT ER NIET IN STAAT ─────────────────────────────────────────────────────
 *
 * Geen bedrag in de onderwerpregel, geen betaalknop, geen aansporing. Dit is een
 * ontvangstbevestiging: het geld is al binnen. Alles wat naar een actie wijst
 * maakt de mail langer en geeft een filter een reden om hem als marketing te
 * lezen — zie de noot in mailTemplate.js over waarom de merkzin in de voet staat
 * en niet in het onderwerp.
 */

import { sendMail, toBase64 } from './mail.js';
import { shell, h1, p, rows, note, linkLine, esc } from './mailTemplate.js';
import { VAT_TREATMENT } from '../data/vat.js';
import { formatDate } from './invoicePdf.js';

const SITE = 'https://visuails.com';

/** €1.101,10 — dezelfde vorm als de rest van de site, niet Intl (workerd-ICU verschilt per regio). */
function euro(cents) {
  const n = Math.round(Number(cents) || 0);
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}€ ${whole},${String(a % 100).padStart(2, '0')}`;
}

const COPY = {
  nl: {
    subject: (ref) => `Betaling ontvangen — ${ref}`,
    pre: (n) => `Je factuur ${n} zit als pdf bij deze mail.`,
    head: 'Je betaling is binnen',
    lede: 'Bedankt. We hebben je betaling ontvangen en zijn met je bestelling aan de slag.',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rRef: 'Bestelling',
    rAmount: 'Betaald',
    attached: 'De factuur zit als pdf bij deze mail. Je vindt hem ook altijd terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'Je factuur staat klaar in VISUAILS Studio, onder <b>Facturen</b>. Lukt het downloaden niet, mail ons dan even.',
    portal: 'Naar VISUAILS Studio',
    reverse: 'Op deze factuur is de btw verlegd naar jou als afnemer. Je geeft hem zelf aan in je eigen land.',
    outside: 'Deze levering valt buiten de Europese btw.',
    keep: 'Bewaar deze factuur voor je eigen administratie.',
  },
  en: {
    subject: (ref) => `Payment received — ${ref}`,
    pre: (n) => `Your invoice ${n} is attached as a PDF.`,
    head: 'We have your payment',
    lede: 'Thank you. Your payment came through and we have started on your order.',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rRef: 'Order',
    rAmount: 'Paid',
    attached: 'The invoice is attached as a PDF. You can also find it any time in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Invoices</b>. If the download will not work, send us a line.',
    portal: 'Go to VISUAILS Studio',
    reverse: 'VAT on this invoice is reverse charged to you as the customer. You declare it yourself in your own country.',
    outside: 'This supply falls outside the scope of European VAT.',
    keep: 'Keep this invoice for your own records.',
  },
};

/*
 * DE DATUM KOMT UIT invoicePdf.js EN WORDT HIER NIET OPNIEUW OPGEMAAKT.
 *
 * Deze mail heeft dat document als bijlage. '9-8-2026' in de mail en
 * '9 augustus 2026' op de pdf zijn twee schrijfwijzen voor dezelfde factuur in
 * één bericht — het soort verschil dat niemand een bug noemt en iedereen even
 * moet natrekken. Vandaar dezelfde functie, en niet een tweede tabel met
 * maandnamen die ooit uit elkaar loopt.
 *
 * Een cijferdatum zou bovendien de vorm zijn die een Amerikaanse lezer als
 * 8 september leest.
 */
const dateLine = (iso, lang) => formatDate(String(iso || ''), lang);

/**
 * De mail zelf, als losse functie: invoer erin, html eruit, niets erbuiten.
 *
 * ── WAAROM DIT NIET IN mailInvoice() ZIT ─────────────────────────────────────
 *
 * Om dezelfde reden dat customerEmail() en deliveryEmail() los staan van hun
 * verzendpad: scripts/mail-render.mjs zet alle klantmails naast elkaar op één
 * plaat, en dat kan alleen met een functie die html teruggeeft zonder een fetch
 * te doen. Een mail die je niet naast de andere kunt leggen, is een mail waarvan
 * niemand merkt dat hij uit de toon valt.
 *
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {{ref?: string}} o.order
 * @param {{number: string}} o.invoice
 * @param {object} o.snap  de bewaarde momentopname
 * @param {boolean} o.attached  zit de pdf er echt bij? Bepaalt één alinea.
 */
export function invoiceEmail({ lang = 'nl', order = {}, invoice, snap = {}, attached = true }) {
  const t = COPY[lang === 'en' ? 'en' : 'nl'];
  const gross = Number(snap.netCents || 0) + Number(snap.vatCents || 0);
  // Dezelfde drie waarden als vat.js en invoicePdf.js, uit de constante en niet
  // uit een substring: 'reverse' herkennen in een string is precies hoe een
  // vierde behandeling ooit stilzwijgend als verlegging op papier komt.
  const treatment = String(snap.treatment || '');
  const vatLine = treatment === VAT_TREATMENT.reverseCharge ? t.reverse
    : treatment === VAT_TREATMENT.outsideScope ? t.outside
      : '';

  const body = [
    h1(t.head, esc(invoice.number)),
    p(esc(t.lede)),
    rows([
      [t.rInvoice, esc(invoice.number)],
      [t.rDate, esc(dateLine(snap.date, lang))],
      [t.rRef, esc(order.ref || '')],
      [t.rAmount, esc(euro(gross))],
    ]),
    p(attached ? t.attached : t.noAttach, { top: 4 }),
    linkLine(`${SITE}${lang === 'nl' ? '/nl' : ''}/account`, t.portal),
    vatLine ? note(esc(vatLine)) : '',
    // GEEN spamNote() HIER. Die regel — "nog niets? kijk in je spam" — hoort in
    // een mail waarop de klant wácht: de inloglink, de levermelding. Dit bericht
    // komt ongevraagd binnen op het moment van betalen, en iemand vertellen dat
    // hij in zijn spam moet kijken naar de mail die hij aan het lezen is, is
    // precies het soort meegekopieerde alinea dat een transactionele mail
    // rommelig maakt.
    note(esc(t.keep)),
  ].join('');

  return {
    subject: t.subject(order.ref || invoice.number),
    html: shell({ lang, preheader: t.pre(invoice.number), body }),
  };
}

/**
 * De bevestigingsmail met de factuur eraan.
 *
 * BEST EFFORT, EN DAAROM MET EEN EIGEN try. Dit wordt aangeroepen vanuit de
 * betaalwebhook. Gooit hij daar, dan antwoordt die met 500, levert Mollie
 * opnieuw af en wordt de hele betaling nog een keer verwerkt — een mislukte
 * mail mag geen tweede boeking veroorzaken. De factuur zelf staat op dat moment
 * al in R2 en in VISUAILS Studio; deze mail is het gemak, niet het document.
 *
 * @returns {Promise<boolean>} of er iets is verstuurd.
 */
export async function mailInvoice(env, { order, invoice }) {
  try {
    if (!order?.email || !invoice) return false;
    const lang = invoice.lang === 'en' ? 'en' : (order.lang === 'en' ? 'en' : 'nl');

    let snap = {};
    try { snap = JSON.parse(invoice.snapshot_json || '{}'); } catch { /* dan zonder */ }

    // De bijlage. Ontbreekt hij, dan verandert de tekst mee — zie de header.
    let attachment = null;
    if (invoice.pdf_key && env?.UPLOADS) {
      try {
        const obj = await env.UPLOADS.get(invoice.pdf_key);
        const buf = obj && typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : null;
        if (buf && buf.byteLength) {
          attachment = { filename: `${invoice.number}.pdf`, content: toBase64(buf) };
        }
      } catch (err) {
        console.warn('[invoice-mail] pdf niet leesbaar voor', invoice.number, '—', err && err.message);
      }
    }

    const { subject, html } = invoiceEmail({ lang, order, invoice, snap, attached: !!attachment });
    await sendMail(env, {
      to: order.email,
      /* ── EN EEN KOPIE VOOR DE EIGEN ADMINISTRATIE — 20 augustus 2026 ───────
         De factuur ging alleen naar de klant. De bron blijft `invoices` plus de
         pdf in R2 — dat is de administratie en dat verandert niet — maar een
         factuur die langskomt in de mailbox is wat je bij een kwartaalaangifte
         terugvindt zonder ergens in te loggen, en het is de snelste manier om te
         zien dát er een uitgegaan is.

         Uit `INVOICE_BCC` en niet uit een adres hier: de eigen administratie kan
         morgen een boekhouder zijn en dat is een instelling, geen code. Staat de
         variabele niet, dan gaat de mail gewoon alleen naar de klant — een
         ontbrekende kopie mag een factuur nooit tegenhouden. */
      bcc: env.INVOICE_BCC || undefined,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    });
    return true;
  } catch (err) {
    console.error('[invoice-mail] versturen mislukt voor bestelling', order?.ref, '—', err && err.message ? err.message : err);
    return false;
  }
}
