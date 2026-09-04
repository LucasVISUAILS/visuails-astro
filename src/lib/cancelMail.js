/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TWEE MAILS ROND EEN ANNULERING — 4 september 2026 (doorlichting §3.2)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER ONTBRAK ───────────────────────────────────────────────────────────
 *
 * Een bestelling annuleren in /admin schreef de reden op de tijdlijn van de klant
 * en zette de terugbetaling bij Mollie in gang. De klant hoorde daar NIETS van
 * tenzij hij toevallig VISUAILS Studio opende: geen bericht dat zijn bestelling
 * niet doorgaat, geen bericht dat zijn geld terugkomt. En de creditnota — die de
 * betaalwebhook keurig uitgeeft zodra Mollie de terugbetaling bevestigt — stond
 * alleen in Studio onder Facturen. De factuur zelf kreeg hij wél gemaild
 * (invoiceMail.js); het document dat die factuur weer terugdraait niet.
 *
 * Dat is precies andersom van hoe het hoort. Van alle berichten die een klant
 * kan krijgen is "je bestelling is geannuleerd" de enige waar hij niet op zit te
 * wachten en die hij het minst mag missen.
 *
 * ── TWEE MAILS EN NIET ÉÉN ───────────────────────────────────────────────────
 *
 * De annulering is een besluit van nu; de creditnota komt pas als Mollie de
 * terugbetaling bevestigd heeft — seconden later, of de volgende ochtend als de
 * pdf de eerste keer niet lukte en de nachtelijke taak hem oppakt. Ze op elkaar
 * laten wachten zou de klant in het donker laten terwijl zijn geld al onderweg
 * is. Dus twee korte berichten, elk op zijn eigen moment, en de eerste zegt dat
 * de tweede komt.
 *
 * ── DEZELFDE OPBOUW ALS invoiceMail.js ───────────────────────────────────────
 *
 * Een zuivere renderfunctie (invoer erin, html eruit) en een verzender die alles
 * opeet wat mis kan gaan. De renderfunctie staat los zodat scripts/mail-render.mjs
 * hem naast de andere klantmails kan leggen — zie de noot daar over waarom een
 * mail die je niet naast de rest kunt leggen, een mail is waarvan niemand merkt
 * dat hij uit de toon valt.
 */

import { sendMail, toBase64 } from './mail.js';
import { shell, h1, p, rows, note, linkLine, greeting, esc } from './mailTemplate.js';
import { formatDate } from './invoicePdf.js';

const SITE = 'https://visuails.com';

/** €1.101,10 — dezelfde vorm als invoiceMail.js, niet Intl (workerd-ICU verschilt per regio). */
function euro(cents) {
  const n = Math.round(Number(cents) || 0);
  const a = Math.abs(n);
  const whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}€ ${whole},${String(a % 100).padStart(2, '0')}`;
}

/**
 * Wat er met het geld gebeurt, in de woorden van handleOrderCancel():
 *   'refund'  — betaald, wordt teruggestort
 *   'credit'  — betaald, blijft staan als tegoed voor een volgende bestelling
 *   'none'    — betaald, geen terugbetaling
 *   'plan'    — uit een abonnement: de slots gaan terug
 *   'unpaid'  — er was nog niets betaald
 */
export const CANCEL_MONEY = Object.freeze(['refund', 'credit', 'none', 'plan', 'unpaid']);

const COPY = {
  nl: {
    subject: (ref) => `Je bestelling ${ref} is geannuleerd`,
    pre: (ref) => `Bestelling ${ref} gaat niet door. Hieronder staat waarom en wat er met je betaling gebeurt.`,
    head: 'Je bestelling is geannuleerd',
    sub: (ref) => `Referentie ${ref}`,
    lede: 'We hebben je bestelling geannuleerd. Dit is de reden:',
    money: {
      refund: (bedrag) => `Je hebt ${bedrag} betaald. Dat bedrag storten we terug op de rekening waarmee je betaald hebt; afhankelijk van je bank staat het binnen een paar werkdagen op je rekening. De creditnota mailen we je zodra de terugbetaling bevestigd is.`,
      credit: (bedrag) => `Je hebt ${bedrag} betaald. Dat bedrag blijft staan als tegoed op je account en wordt verrekend met je volgende bestelling. Je ziet het terug in VISUAILS Studio.`,
      none: () => 'Er wordt niets terugbetaald. Heb je daar vragen over, dan beantwoorden we die graag — beantwoord deze mail.',
      plan: () => 'Deze bestelling kwam uit je abonnement. De producten staan weer op je lijst en de slots zijn teruggezet; je kunt ze opnieuw vastzetten wanneer je wilt.',
      unpaid: () => 'Er was nog niets betaald, dus er hoeft niets terug.',
    },
    portal: 'Naar VISUAILS Studio',
    tail: 'Wil je alsnog iets laten maken, of klopt er iets niet aan deze annulering? Beantwoord deze mail — we lezen mee.',
  },
  en: {
    subject: (ref) => `Your order ${ref} has been cancelled`,
    pre: (ref) => `Order ${ref} will not go ahead. Here is why, and what happens with your payment.`,
    head: 'Your order has been cancelled',
    sub: (ref) => `Reference ${ref}`,
    lede: 'We have cancelled your order. This is the reason:',
    money: {
      refund: (bedrag) => `You paid ${bedrag}. We are refunding that amount to the account you paid with; depending on your bank it shows up within a few working days. We will email you the credit note as soon as the refund is confirmed.`,
      credit: (bedrag) => `You paid ${bedrag}. That amount stays on your account as credit and is set off against your next order. You can see it in VISUAILS Studio.`,
      none: () => 'Nothing is being refunded. If you have questions about that, reply to this email — we are happy to answer them.',
      plan: () => 'This order came out of your subscription. The products are back on your list and the slots have been returned; you can lock them in again whenever you like.',
      unpaid: () => 'Nothing had been paid yet, so there is nothing to return.',
    },
    portal: 'Go to VISUAILS Studio',
    tail: 'Would you still like something made, or does something about this cancellation look wrong? Reply to this email — we read along.',
  },
};

/**
 * De annuleringsmail, als losse functie.
 *
 * @param {object} o
 * @param {{ref?: string, name?: string, lang?: string}} o.order
 * @param {string} o.reason   de reden zoals de beheerder hem intypte — de klant leest hem
 * @param {string} o.money    één van CANCEL_MONEY
 * @param {number} [o.grossCents]  wat er betaald was (voor 'refund' en 'credit')
 */
export function cancelEmail({ order = {}, reason = '', money = 'unpaid', grossCents = 0 }) {
  const lang = order.lang === 'en' ? 'en' : 'nl';
  const t = COPY[lang];
  const geld = t.money[CANCEL_MONEY.includes(money) ? money : 'unpaid'](euro(grossCents));
  const body = [
    h1(t.head, esc(t.sub(order.ref || ''))),
    p(greeting(order.name, lang)),
    p(esc(t.lede)),
    /* De reden staat als citaat en niet als lopende tekst: het zijn de woorden
       van een specialist en niet van de site, en dat mag te zien zijn. */
    note(esc(String(reason || '').trim())),
    p(esc(geld), { top: 4 }),
    linkLine(`${SITE}${lang === 'nl' ? '/nl' : ''}/account`, t.portal),
    p(esc(t.tail), { muted: true }),
  ].join('');
  return {
    subject: t.subject(order.ref || ''),
    html: shell({ lang, preheader: t.pre(order.ref || ''), body }),
  };
}

/**
 * Verstuurt de annuleringsmail. Best effort: een annulering die al is vastgelegd
 * mag niet omvallen op een mailserver die hikt — zie de noot bij handleOrderCancel().
 * @returns {Promise<boolean>} of er iets is verstuurd.
 */
export async function mailCancellation(env, { order, reason, money, grossCents }) {
  try {
    if (!order?.email) return false;
    const { subject, html } = cancelEmail({ order, reason, money, grossCents });
    await sendMail(env, { to: order.email, subject, html });
    return true;
  } catch (err) {
    console.error('[cancel-mail] versturen mislukt voor bestelling', order?.ref, '—', err?.message || err);
    return false;
  }
}

/* ══ DE CREDITNOTA ══════════════════════════════════════════════════════════ */

const CREDIT = {
  nl: {
    subject: (ref) => `Je creditnota — ${ref}`,
    pre: (n) => `Creditnota ${n} zit als pdf bij deze mail.`,
    head: 'Je creditnota staat klaar',
    lede: 'De terugbetaling is bevestigd. Hierbij de creditnota die tegenover je factuur staat, voor je eigen administratie.',
    rNumber: 'Creditnotanummer',
    rDate: 'Datum',
    rInvoice: 'Op factuur',
    rRef: 'Bestelling',
    rAmount: 'Gecrediteerd',
    attached: 'De creditnota zit als pdf bij deze mail. Je vindt hem ook terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'De creditnota staat klaar in VISUAILS Studio, onder <b>Facturen</b>. Lukt het downloaden niet, mail ons dan even.',
    portal: 'Naar VISUAILS Studio',
    keep: 'Bewaar deze creditnota bij de factuur waar hij bij hoort.',
  },
  en: {
    subject: (ref) => `Your credit note — ${ref}`,
    pre: (n) => `Credit note ${n} is attached as a PDF.`,
    head: 'Your credit note is ready',
    lede: 'The refund has been confirmed. Attached is the credit note that stands against your invoice, for your own records.',
    rNumber: 'Credit note number',
    rDate: 'Date',
    rInvoice: 'Against invoice',
    rRef: 'Order',
    rAmount: 'Credited',
    attached: 'The credit note is attached as a PDF. You can also find it in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'The credit note is waiting in VISUAILS Studio, under <b>Invoices</b>. If the download will not work, send us a line.',
    portal: 'Go to VISUAILS Studio',
    keep: 'Keep this credit note together with the invoice it belongs to.',
  },
};

/**
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {{ref?: string}} o.order
 * @param {{number: string, gross_cents?: number}} o.note
 * @param {object} o.snap  de bewaarde momentopname van de nota (creditSnapshotFrom)
 * @param {boolean} o.attached
 */
export function creditNoteEmail({ lang = 'nl', order = {}, note: nota, snap = {}, attached = true }) {
  const t = CREDIT[lang === 'en' ? 'en' : 'nl'];
  const gross = Number(snap.grossCents ?? nota?.gross_cents ?? 0);
  const body = [
    h1(t.head, esc(nota.number)),
    p(esc(t.lede)),
    rows([
      [t.rNumber, esc(nota.number)],
      [t.rDate, esc(formatDate(String(snap.date || ''), lang))],
      // `creditsNumber` is de factuur waar deze nota tegenover staat — zie creditSnapshotFrom().
      [t.rInvoice, esc(snap.creditsNumber || '')],
      [t.rRef, esc(order.ref || '')],
      [t.rAmount, esc(euro(gross))],
    ]),
    p(attached ? t.attached : t.noAttach, { top: 4 }),
    linkLine(`${SITE}${lang === 'nl' ? '/nl' : ''}/account`, t.portal),
    note(esc(t.keep)),
  ].join('');
  return {
    subject: t.subject(order.ref || nota.number),
    html: shell({ lang, preheader: t.pre(nota.number), body }),
  };
}

/**
 * Mailt een uitgegeven creditnota met de pdf uit R2. Best effort, om dezelfde
 * reden als mailInvoice(): dit wordt uit de betaalwebhook en uit de nachtelijke
 * taak aangeroepen, en geen van beide mag omvallen op een mail.
 *
 * Alleen een nota met status 'issued' gaat de deur uit — een 'pending' nota heeft
 * nog geen pdf en komt de volgende ochtend langs bij cron/index.js.
 * @returns {Promise<boolean>}
 */
export async function mailCreditNote(env, { order, note: nota }) {
  try {
    if (!order?.email || !nota || nota.status !== 'issued') return false;
    const lang = nota.lang === 'en' ? 'en' : (order.lang === 'en' ? 'en' : 'nl');
    let snap = {};
    try { snap = JSON.parse(nota.snapshot_json || '{}'); } catch { /* dan zonder */ }

    let attachment = null;
    if (nota.pdf_key && env?.UPLOADS) {
      try {
        const obj = await env.UPLOADS.get(nota.pdf_key);
        const buf = obj && typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : null;
        if (buf && buf.byteLength) attachment = { filename: `${nota.number}.pdf`, content: toBase64(buf) };
      } catch (err) {
        console.warn('[credit-mail] pdf niet leesbaar voor', nota.number, '—', err?.message);
      }
    }

    const { subject, html } = creditNoteEmail({ lang, order, note: nota, snap, attached: !!attachment });
    await sendMail(env, {
      to: order.email,
      // Dezelfde kopie voor de eigen administratie als bij de factuur — zie invoiceMail.js.
      bcc: env.INVOICE_BCC || undefined,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    });
    return true;
  } catch (err) {
    console.error('[credit-mail] versturen mislukt voor', nota?.number, '—', err?.message || err);
    return false;
  }
}
