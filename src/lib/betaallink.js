/* VISUAILS — de betaallinkmail, op één plek.
 *
 * Tot 4 september 2026 stond stuurBetaallink() in admin.js: de mail die na een
 * btw-goedkeuring (en sinds vandaag na een offerte) de klant zijn Mollie-link
 * geeft. De nachtelijke taak heeft hem nu ook nodig, voor de HERINNERING aan een
 * bestelling die drie dagen onbetaald staat — en cron/index.js hoort niet heel
 * admin.js in te laden voor één functie. Dus staat hij hier, en admin.js roept
 * hem aan.
 *
 * Dezelfde regels als altijd: het bedrag wordt opnieuw uit de bestelling gelezen
 * (bruto = netto + btw zoals ze nú op de rij staan), er wordt niets aan
 * payment_status geschreven — dat doet alleen de webhook — en al betaald, geen
 * adres of niets te betalen geeft stil null terug; de aanroeper logt dat.
 */
import { sendMail } from './mail.js';
import { createOrderMolliePayment } from './mollie.js';
import { serviceLabel } from '../data/services.js';
import {
  shell as mailShell,
  h1 as mailH1,
  p as mailP,
  spamNote as mailSpamNote,
  payPanel as mailPayPanel,
  linkLine as mailLinkLine,
} from './mailTemplate.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export async function stuurBetaallink(env, orderId, { origin, offerte = false, herinnering = false } = {}) {
  if (!env.MOLLIE_API_KEY) {
    console.warn('[admin] geen MOLLIE_API_KEY — geen betaallink voor bestelling', orderId);
    return null;
  }
  const o = await env.DB.prepare(
    `SELECT id, ref, email, lang, service, product_count, total_cents, vat_cents, vat_rate, payment_status, window_start
       FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!o || !o.email) return null;
  /* Al betaald? Dan is er niets te sturen. Kan gebeuren als iemand twee tabbladen
     open heeft, of als de klant in de tussentijd via een eerdere link betaald heeft. */
  if (String(o.payment_status || '') === 'paid') return null;

  const bruto = (Number(o.total_cents) || 0) + (Number(o.vat_cents) || 0);
  if (!(bruto > 0)) return null;

  const lang = o.lang === 'en' ? 'en' : 'nl';
  if (!origin) throw new Error('stuurBetaallink: origin ontbreekt');
  const svcNaam = serviceLabel(o.service, lang) || o.service;

  const payment = await createOrderMolliePayment(env, {
    ref: o.ref,
    lang,
    valueEuros: (bruto / 100).toFixed(2),
    grossCents: bruto,
    description: `VISUAILS ${o.ref}`,
    /* IN DE TAAL VAN DE KLANT. Hier stond het Engelse pad vast ingebakken,
       terwijl `lang` drie regels hoger al bepaald is: een Nederlandse klant die
       op deze link betaalde, landde op de Engelse bedankpagina. De gewone
       bestelroute doet het wél goed (die neemt het pad uit het formulier). */
    successUrl: `${origin}${lang === 'nl' ? '/nl' : ''}/thank-you?paid=${encodeURIComponent(o.ref)}`,
    webhookUrl: `${origin}/api/webhook/mollie`,
    /* Bij 0% geen iDEAL, om dezelfde reden als bij een gewone bestelling: een
       Nederlandse bankrekening onder een buitenlandse claim is precies wat je
       niet achteraf wilt uitzoeken. Zie de toelichting in src/lib/mollie.js. */
    excludeIdeal: Number(o.vat_rate) === 0,
  });
  const url = payment?._links?.checkout?.href || null;
  if (!url) {
    console.error('[admin] Mollie gaf geen betaallink voor', o.ref);
    return null;
  }

  const bedrag = `€ ${(bruto / 100).toFixed(2).replace('.', ',')}`;
  await sendMail(env, {
    to: o.email,
    subject: herinnering
      ? (lang === 'nl' ? `Je bestelling wacht nog op betaling — ${o.ref}` : `Your order is still waiting for payment — ${o.ref}`)
      : offerte
        ? (lang === 'nl' ? `Je offerte — ${o.ref}` : `Your quote — ${o.ref}`)
        : (lang === 'nl' ? `Je bestelling is nagekeken — ${o.ref}` : `Your order has been checked — ${o.ref}`),
    html: mailShell({
      lang,
      preheader: lang === 'nl' ? 'De betaallink staat erin.' : 'The payment link is inside.',
      body: [
        mailH1(herinnering
          ? (lang === 'nl' ? 'Nog niet betaald' : 'Not paid yet')
          : offerte
            ? (lang === 'nl' ? 'Je offerte' : 'Your quote')
            : (lang === 'nl' ? 'Nagekeken en akkoord' : 'Checked and cleared')),
        /* Bij een OFFERTE (eigen look, video) is dit de eerste keer dat de klant
           een bedrag ziet; de tekst zegt dus wat het is en dat betalen het akkoord
           is. Niets begint voordat er betaald is — dezelfde belofte als op de
           aanvraagpagina ("Nothing is charged ... until you say yes in writing"). */
        mailP(herinnering
          ? (lang === 'nl'
            ? `Je bestelling <strong>${esc(o.ref)}</strong> staat klaar, maar er is nog niet betaald. Wil je hem nog? Dan is dit de link. Wil je hem niet meer, dan hoef je niets te doen: er wordt niets in rekening gebracht${o.window_start ? ', en een gereserveerde leverdatum komt na zeven dagen weer vrij voor anderen' : ''}.`
            : `Your order <strong>${esc(o.ref)}</strong> is ready, but it has not been paid yet. Still want it? This is the link. If not, there is nothing to do: nothing is charged${o.window_start ? ', and a reserved delivery date is released to others after seven days' : ''}.`)
          : offerte
          ? (lang === 'nl'
            ? `Hieronder staat de prijs voor <strong>${esc(o.ref)}</strong>, zoals besproken. Betalen is je akkoord — daarna gaan we voor je aan het werk. Vragen? Beantwoord gewoon deze mail.`
            : `Below is the price for <strong>${esc(o.ref)}</strong>, as discussed. Paying is your go-ahead — we start on it straight after. Questions? Just reply to this mail.`)
          : (lang === 'nl'
            ? `We hebben de gegevens bij <strong>${esc(o.ref)}</strong> nagekeken. Alles klopt, dus je kunt nu betalen — daarna begint de productie meteen.`
            : `We have checked the details on <strong>${esc(o.ref)}</strong>. Everything is in order, so you can pay now — production starts straight after.`)),
        mailPayPanel({
          label: lang === 'nl' ? 'Te betalen' : 'To pay',
          amount: bedrag,
          sub: `${esc(svcNaam)}${o.product_count ? ` · ${o.product_count}` : ''}`,
          href: url,
          cta: lang === 'nl' ? 'Betalen' : 'Pay now',
        }),
        mailLinkLine(url, lang === 'nl' ? 'Werkt de knop niet? Gebruik deze link:' : 'Button not working? Use this link:'),
        mailSpamNote(lang),
      ].join(''),
    }),
  });

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, status, note, actor)
     VALUES (?1, 'pending', ?2, 'studio')`
  ).bind(orderId, lang === 'nl'
    ? `${herinnering ? 'Betaalherinnering' : 'Betaallink'} verstuurd naar ${o.email} voor ${bedrag}.`
    : `${herinnering ? 'Payment reminder' : 'Payment link'} sent to ${o.email} for ${bedrag}.`).run();

  console.log('[admin] betaallink verstuurd voor', o.ref);
  return url;
}
