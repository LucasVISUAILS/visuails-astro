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
import { shell, h1, p, rows, note, linkLine, greeting, esc, button, spamNote } from './mailTemplate.js';
import { formatDate } from './invoicePdf.js';

const SITE = 'https://visuails.com';

/** €1.101,10 — dezelfde vorm als invoiceMail.js, niet Intl (workerd-ICU verschilt per regio). */
/* In de tekens van de taal van de mail (24 september 2026): een Engelse mail
   zei "€ 1.101,10" terwijl de bijgevoegde pdf "€1,101.10" zegt. */
function euro(cents, lang = 'nl') {
  const n = Math.round(Number(cents) || 0);
  const a = Math.abs(n);
  const en = lang === 'en';
  const whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : '.');
  return `${n < 0 ? '-' : ''}€ ${whole}${en ? '.' : ','}${String(a % 100).padStart(2, '0')}`;
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
      credit: (bedrag) => `Je hebt ${bedrag} betaald. Dat bedrag blijft staan als tegoed op je account. Bestel je de volgende keer terwijl je bent ingelogd in VISUAILS Studio, dan gaat het automatisch van het te betalen bedrag af.`,
      none: () => 'Er wordt niets terugbetaald. Heb je daar vragen over, dan beantwoorden we die graag — beantwoord deze mail.',
      plan: () => 'Deze bestelling kwam uit je abonnement. De producten staan weer op je lijst en de credits staan weer op je saldo; je kunt ze opnieuw vastzetten wanneer je wilt.',
      unpaid: () => 'Er was nog niets betaald, dus er hoeft niets terug.',
    },
    portal: 'Naar VISUAILS Studio',
    tail: 'Wil je alsnog iets laten maken, of klopt er iets niet aan deze annulering? Beantwoord deze mail — we lezen elke reactie.',
  },
  en: {
    subject: (ref) => `Your order ${ref} has been cancelled`,
    pre: (ref) => `Order ${ref} will not go ahead. Here is why, and what happens with your payment.`,
    head: 'Your order has been cancelled',
    sub: (ref) => `Reference ${ref}`,
    lede: 'We have cancelled your order. This is the reason:',
    money: {
      refund: (bedrag) => `You paid ${bedrag}. We are refunding that amount to the account you paid with; depending on your bank it shows up within a few working days. We will email you the credit note as soon as the refund is confirmed.`,
      credit: (bedrag) => `You paid ${bedrag}. That amount stays on your account as credit. Next time you order while signed in to VISUAILS Studio, it comes off the amount to pay automatically.`,
      none: () => 'Nothing is being refunded. If you have questions about that, reply to this email — we are happy to answer them.',
      plan: () => 'This order came out of your subscription. The products are back on your list and the credits are back on your balance; you can lock them in again whenever you like.',
      unpaid: () => 'Nothing had been paid yet, so there is nothing to return.',
    },
    portal: 'Go to VISUAILS Studio',
    tail: 'Would you still like something made, or does something about this cancellation look wrong? Reply to this email — we read every reply.',
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
export function cancelEmail({ order = {}, reason = '', money = 'unpaid', grossCents = 0, tegoedCents = 0 }) {
  const lang = order.lang === 'en' ? 'en' : 'nl';
  const t = COPY[lang];
  let geld = t.money[CANCEL_MONEY.includes(money) ? money : 'unpaid'](euro(grossCents, lang));
  /* Deels of helemaal met tegoed betaald (29 september 2026): dat deel komt
     terug als tegoed, en dat hoort de klant te lezen. */
  if (money === 'refund' && tegoedCents > 0) {
    geld = grossCents > 0
      ? `${geld} ${lang === 'nl' ? `Daarnaast staat ${euro(tegoedCents, lang)} weer als tegoed op je account.` : `In addition, ${euro(tegoedCents, lang)} is back on your account as credit.`}`
      : (lang === 'nl'
        ? `Je betaalde deze bestelling met ${euro(tegoedCents, lang)} tegoed. Dat staat weer op je account.`
        : `You paid for this order with ${euro(tegoedCents, lang)} of credit. It is back on your account.`);
  }
  const body = [
    h1(t.head, esc(t.sub(order.ref || ''))),
    p(greeting(order.name, lang)),
    p(esc(t.lede)),
    /* De reden staat als citaat en niet als lopende tekst: het zijn de woorden
       van onze beeldredactie en niet van de site, en dat mag te zien zijn. */
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
export async function mailCancellation(env, { order, reason, money, grossCents, tegoedCents = 0 }) {
  try {
    if (!order?.email) return false;
    const { subject, html } = cancelEmail({ order, reason, money, grossCents, tegoedCents });
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
    noAttach: 'The credit note is waiting in VISUAILS Studio, under <b>Invoices</b>. If the download will not work, email us.',
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
      [t.rAmount, esc(euro(gross, lang))],
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

/* ── HET GELD GAAT TERUG — 1 oktober 2026 (ronde 8) ──────────────────────────
   Een tweede betaling op een al betaalde bestelling, of een betaling op een
   geannuleerde: de webhook stort automatisch terug (zie mollie.js). De klant
   hoort dat meteen, anders ziet hij alleen een afschrijving zonder uitleg. */
export async function mailOngewensteBetaling(env, orderId, soort, bedragCents) {
  try {
    const o = await env.DB.prepare('SELECT ref, email, name, lang FROM orders WHERE id = ?1').bind(orderId).first();
    if (!o?.email) return false;
    const nl = o.lang === 'nl';
    const eur = (c) => new Intl.NumberFormat(nl ? 'nl-NL' : 'en-GB', { style: 'currency', currency: 'EUR' }).format((Number(c) || 0) / 100);
    await sendMail(env, {
      to: o.email,
      subject: nl ? `We storten ${eur(bedragCents)} terug — ${o.ref}` : `We are refunding ${eur(bedragCents)} — ${o.ref}`,
      html: shell({
        lang: nl ? 'nl' : 'en',
        preheader: nl ? 'Je hebt niets te doen.' : 'There is nothing you need to do.',
        body: [
          h1(nl ? 'Je geld komt terug' : 'Your money is coming back', nl ? `Referentie ${esc(o.ref)}` : `Reference ${esc(o.ref)}`),
          p(greeting(o.name, nl ? 'nl' : 'en')),
          p(soort === 'geannuleerd'
            ? (nl
              ? `Er kwam een betaling van <strong>${esc(eur(bedragCents))}</strong> binnen voor <strong>${esc(o.ref)}</strong>, maar die bestelling was al geannuleerd. We storten het bedrag terug; het staat binnen een paar werkdagen weer op je rekening.`
              : `A payment of <strong>${esc(eur(bedragCents))}</strong> came in for <strong>${esc(o.ref)}</strong>, but that order had already been cancelled. We are refunding it; it is back in your account within a few working days.`)
            : (nl
              ? `Je bestelling <strong>${esc(o.ref)}</strong> was al betaald, en er kwam nog een betaling van <strong>${esc(eur(bedragCents))}</strong> binnen. Die storten we terug; hij staat binnen een paar werkdagen weer op je rekening. Je bestelling loopt gewoon door.`
              : `Your order <strong>${esc(o.ref)}</strong> was already paid, and a second payment of <strong>${esc(eur(bedragCents))}</strong> came in. We are refunding it; it is back in your account within a few working days. Your order carries on as normal.`)),
          note(nl ? 'Vragen? Beantwoord deze mail.' : 'Questions? Just reply to this email.'),
        ].join(''),
      }),
    });
    return true;
  } catch (e) {
    console.error('[mail] terugstortbericht niet verstuurd —', e?.message || e);
    return false;
  }
}

/* ── EEN MISLUKTE INCASSO: DE KLANT HOORT HET — 1 oktober 2026 (ronde 8, M-K2) ──
   Tot vandaag kreeg alleen de studio een bericht. De studiomail zei zelf "wat wél
   helpt: één bericht aan de klant" — dit is dat bericht. Bij een stilgezet
   abonnement: de credits zijn bewaard maar staan stil tot de betaling lukt. */
export async function mailIncassoMislukt(env, { subId, ref, email, name, bedragCents = 0, gestopt = false, origin = 'https://visuails.com' }) {
  if (!email) return false;
  try {
    const rij = await env.DB.prepare('SELECT lang FROM subscription_invoices WHERE subscription_id = ?1 ORDER BY id DESC LIMIT 1').bind(subId).first().catch(() => null);
    const nl = (rij?.lang || 'nl') !== 'en';
    const eur = new Intl.NumberFormat(nl ? 'nl-NL' : 'en-GB', { style: 'currency', currency: 'EUR' }).format((Number(bedragCents) || 0) / 100);
    const href = `${origin}/account/plan?tab=facturering&lang=${nl ? 'nl' : 'en'}`;
    await sendMail(env, {
      to: email,
      subject: gestopt
        ? (nl ? `Je abonnement staat stil — ${ref}` : `Your plan is on hold — ${ref}`)
        : (nl ? `Je betaling van ${eur} is niet gelukt — ${ref}` : `Your payment of ${eur} did not go through — ${ref}`),
      html: shell({
        lang: nl ? 'nl' : 'en',
        preheader: gestopt ? (nl ? 'Je credits zijn bewaard.' : 'Your credits are kept.') : (nl ? 'We proberen het opnieuw.' : 'We will try again.'),
        body: [
          h1(gestopt ? (nl ? 'Je abonnement staat stil' : 'Your plan is on hold') : (nl ? 'De afschrijving is niet gelukt' : 'The payment did not go through'), esc(ref)),
          p(greeting(name, nl ? 'nl' : 'en')),
          p(gestopt
            ? (nl
              ? `De afschrijving van <strong>${esc(eur)}</strong> is een paar keer niet gelukt, en de bank heeft de machtiging gestopt. Je abonnement staat daarom stil. Je credits zijn bewaard, maar je kunt ze pas weer gebruiken als de betaling rond is.`
              : `The payment of <strong>${esc(eur)}</strong> failed a few times and the bank stopped the mandate, so your plan is on hold. Your credits are kept, but you can only use them again once the payment is settled.`)
            : (nl
              ? `De afschrijving van <strong>${esc(eur)}</strong> voor je abonnement is niet gelukt. Meestal is dat een tijdelijk saldoprobleem; we proberen het binnen een paar dagen opnieuw. Klopt je rekening niet meer, vernieuw dan je machtiging.`
              : `The payment of <strong>${esc(eur)}</strong> for your plan did not go through. Usually that is a temporary balance issue; we try again within a few days. If your account has changed, renew your mandate.`)),
          button(href, nl ? 'Naar mijn abonnement' : 'Go to my plan'),
          '<div style="height:18px;font-size:0;line-height:0">&nbsp;</div>',
          note(nl ? 'Vragen? Beantwoord deze mail of app ons.' : 'Questions? Reply to this email or message us on WhatsApp.'),
        ].join(''),
      }),
    });
    return true;
  } catch (e) {
    console.error('[mail] bericht over mislukte incasso niet verstuurd —', e?.message || e);
    return false;
  }
}

/* De betaalbevestiging zonder factuur (ronde 8, M-B6): mislukt het uitgeven van
   de factuur, dan kreeg de klant niets. Kort, en met de belofte dat de factuur
   in Studio komt. */
export async function mailBetalingOntvangen(env, orderId) {
  try {
    const o = await env.DB.prepare('SELECT ref, email, name, lang FROM orders WHERE id = ?1').bind(orderId).first();
    if (!o?.email) return false;
    const nl = o.lang === 'nl';
    await sendMail(env, {
      to: o.email,
      subject: nl ? `Betaling ontvangen — ${o.ref}` : `Payment received — ${o.ref}`,
      html: shell({
        lang: nl ? 'nl' : 'en',
        preheader: nl ? 'We zijn aan de slag.' : 'We have started.',
        body: [
          h1(nl ? 'Je betaling is binnen' : 'We have your payment', esc(o.ref)),
          p(greeting(o.name, nl ? 'nl' : 'en')),
          p(nl
            ? 'Bedankt. We maken je beelden en onze beeldredactie loopt elk beeld na; je krijgt een mail zodra ze klaarstaan (vaak binnen een dag, soms een paar dagen). Je factuur komt in VISUAILS Studio, onder Facturen.'
            : 'Thank you. We make your images and our image editors check every one; you get an email as soon as they are ready (often within a day, sometimes a few days). Your invoice will be in VISUAILS Studio, under Invoices.'),
        ].join(''),
      }),
    });
    return true;
  } catch (e) {
    console.error('[mail] betaalbevestiging niet verstuurd —', e?.message || e);
    return false;
  }
}

/* De ontvangstbevestiging van een revisieronde. Ook gebruikt door het portaal. */
export async function mailRondeOntvangen(env, o, n) {
  if (!o?.email) return false;
  const nl = o.lang !== 'en';
  try {
    await sendMail(env, {
      to: o.email,
      subject: nl ? `We hebben je revisieronde — ${o.ref}` : `We have your revision round — ${o.ref}`,
      html: shell({
        lang: nl ? 'nl' : 'en',
        preheader: nl ? `${n} ${n === 1 ? 'beeld' : 'beelden'} genoteerd.` : `${n} ${n === 1 ? 'image' : 'images'} noted.`,
        body: [
          h1(nl ? 'Je revisieronde is binnen' : 'Your revision round is in', nl ? `Referentie ${esc(o.ref)}` : `Reference ${esc(o.ref)}`),
          p(greeting(o.name, nl ? 'nl' : 'en')),
          p(nl
            ? `We hebben ${n} ${n === 1 ? 'beeld' : 'beelden'} genoteerd met je opmerkingen. Onze beeldredactie past ze aan; je krijgt een mail zodra de nieuwe versies klaarstaan (vaak binnen een dag, soms een paar dagen).`
            : `We noted ${n} ${n === 1 ? 'image' : 'images'} with your comments. Our image editors adjust them; you get an email as soon as the new versions are ready (often within a day, sometimes a few days).`),
          spamNote(nl ? 'nl' : 'en'),
        ].join(''),
      }),
    });
    return true;
  } catch (e) {
    console.error('[account] ontvangst revisieronde niet gemaild —', e?.message || e);
    return false;
  }
}
