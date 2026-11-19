/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * "JE BESTELLING IS AFGEROND" — 9 november 2026 (ronde 91, K-10)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos in lijst 85 (A6 = goed): bij afronden één vaste mail, naast zijn
 * WhatsApp-reviewknop in /admin (die blijft). Tot vandaag ging er bij stil afronden
 * niets uit (close.js: "Er ging geen mail uit") en was elke reviewvraag handwerk.
 *
 * WANNEER. Bij beide manieren van afronden (src/lib/close.js):
 *   · de klant keurde alles goed (maybeCloseOrder), en
 *   · de nachttaak rondde stil af na de revisietermijn (rondStilAf).
 * Niet bij de €1-proef: die is af op het moment van levering, en de levermail van
 * de proef is al de mail met "Bestel in deze look" en de downloads.
 *
 * EENMALIG. Per bestelling hoogstens één keer, ook als Lucas hem weer opent en hij
 * later opnieuw dicht gaat. De lijst noemde `order_feedback.reminder_sent_at` als de
 * kolom hiervoor, maar die rij bestaat pas als de klant een score gaf (score is
 * NOT NULL, migratie 0020): bij de meeste afrondingen is er geen rij om op te
 * schrijven. Daarom een interne regel in order_events (actor 'intern': niet op de
 * tijdlijn van de klant, wel als werkregel in /admin), die eerst geclaimd wordt
 * (INSERT … WHERE NOT EXISTS) en pas daarna de mail laat gaan. Mislukt de mail, dan
 * gaat de claim weer weg. Geen migratie nodig.
 *
 * WAT ERIN STAAT. Tot wanneer de beelden te downloaden zijn (dezelfde datum als de
 * levermail: leverDatumsVan() in leverdatums.js), de link naar de bestelpagina, en
 * de twee reviewknoppen uit src/data/reviews.js (Trustpilot met de korte
 * uitnodigingslink die daar voor mail bedoeld is, Google met zijn reviewlink). Niet
 * gefilterd op score: iedereen krijgt dezelfde mail (Lucas' regel, zie de kop van
 * feedback.js).
 *
 * Geen DOM: de Worker (Studio, de privélink) en de cron laden dit.
 */
import { sendMail } from './mail.js';
import { shell, h1, p, button, tekstLink, linkLine, greeting, kenmerk, vragen, datum, esc } from './mailTemplate.js';
import { REVIEW_PLATFORMS, REVIEW_VOORKEUR } from '../data/reviews.js';
import { leverDatumsVan } from './leverdatums.js';
import { mintToken, hashToken, portalUrl } from './token.js';
import { SAMPLE_SERVICE } from '../data/pricing.js';

/** De interne regel in order_events die zegt dat de mail uit is (en hem eenmalig maakt). */
export const AFROND_MAIL_NOTITIE = 'Afrondmail verstuurd ("Je bestelling is afgerond", met de reviewknoppen).';

const TEKST = {
  nl: {
    onderwerp: (ref) => `Je bestelling is afgerond — ${ref}`,
    kop: 'Je bestelling is afgerond',
    pre: 'Je beelden blijven nog even te downloaden.',
    goedgekeurd: 'Je hebt alles goedgekeurd, dus je bestelling is afgerond. Bedankt!',
    stil: 'Je revisietermijn is voorbij, dus we hebben je bestelling afgerond. Bedankt!',
    bewaar: (d) => `Je beelden staan klaar tot en met <strong>${esc(d)}</strong>; download ze op tijd.`,
    bewaarZonder: 'Je beelden staan klaar op je bestelpagina; download ze op tijd.',
    link: 'Naar je bestelpagina',
    review: 'Tevreden? Een korte review helpt andere merken ons te vinden. Het kost je een minuut.',
    knop: (naam) => `Review op ${naam}`,
  },
  en: {
    onderwerp: (ref) => `Your order is complete — ${ref}`,
    kop: 'Your order is complete',
    pre: 'Your images stay available to download for a while.',
    goedgekeurd: 'You approved everything, so your order is complete. Thank you!',
    stil: 'Your revision period has ended, so we have completed your order. Thank you!',
    bewaar: (d) => `Your images are ready until <strong>${esc(d)}</strong>; download them in good time.`,
    bewaarZonder: 'Your images are ready on your order page; download them in good time.',
    link: 'Go to your order page',
    review: 'Happy with it? A short review helps other brands find us. It takes a minute.',
    knop: (naam) => `Review on ${naam}`,
  },
};

/** De twee reviewplekken, de voorkeursplek eerst (REVIEW_VOORKEUR). */
function reviewPlekken() {
  return [...REVIEW_PLATFORMS].sort((a, b) => (a.id === REVIEW_VOORKEUR ? -1 : b.id === REVIEW_VOORKEUR ? 1 : 0))
    .map((pl) => ({ id: pl.id, naam: pl.name, href: pl.inviteUrl || pl.url }));
}

/**
 * De mail zelf, zonder database: voor de verzending hieronder en voor de toetsen.
 * @param {{ lang?: string, order: object, link?: string, reden?: 'goedgekeurd'|'stil', nu?: Date|null }} o
 * @returns {{ subject: string, html: string }}
 */
export function afrondEmail({ lang = 'nl', order = {}, link = '', reden = 'goedgekeurd', nu = null } = {}) {
  const taal = lang === 'en' ? 'en' : 'nl';
  const t = TEKST[taal];
  const d = leverDatumsVan(order);
  const body = [
    h1(t.kop, kenmerk('bestelling', order.ref || '', taal)),
    /* levering 119 (18 november 2026, proefronde A0-01): de aanhef uit het veld Voornaam. */
    p(greeting(order.name, taal, { nu, land: order.country || '', voornaam: order.first_name })),
    p(esc(reden === 'stil' ? t.stil : t.goedgekeurd)),
    p(d ? t.bewaar(datum(d.bewaarTot, taal)) : t.bewaarZonder),
    link ? linkLine(link, t.link) : '',
    p(esc(t.review), { top: 8 }),
    /* knoppensysteem (lijst 88, C4): de eerste reviewplek is de knop, de rest een tekstlink */
    ...reviewPlekken().map((pl, i) => (i === 0 ? button : tekstLink)(pl.href, t.knop(pl.naam))),
    vragen(taal, order.ref || ''),
  ].join('');
  return { subject: t.onderwerp(order.ref || ''), html: shell({ lang: taal, preheader: t.pre, body }) };
}

/**
 * Stuur de afrondmail, hoogstens één keer per bestelling. Best effort: een fout hier
 * laat het afronden staan en gooit niet.
 *
 * @param {object} env
 * @param {number} orderId
 * @param {{ reden?: 'goedgekeurd'|'stil', nu?: Date|null }} [o]  `nu` alleen als de klant dit nu leest (aanhef met dagdeel)
 * @returns {Promise<boolean>} true als er een mail is verstuurd
 */
export async function mailAfgerond(env, orderId, { reden = 'goedgekeurd', nu = null } = {}) {
  if (!env?.DB || !Number.isInteger(Number(orderId))) return false;
  let o = null;
  try {
    o = await env.DB.prepare(
      /* levering 119 (18 november 2026, proefronde A0-01): ook first_name, voor de aanhef. */
      `SELECT id, ref, email, name, first_name, lang, country, service, status, closed_at,
              delivery_mailed_at, delivered_at, reopened_at
         FROM orders WHERE id = ?1`
    ).bind(orderId).first();
  } catch (err) {
    /* Zonder reopened_at (migratie 0066 niet gedraaid): dan zonder. */
    try {
      o = await env.DB.prepare(
        `SELECT id, ref, email, name, first_name, lang, country, service, status, closed_at, delivery_mailed_at, delivered_at
           FROM orders WHERE id = ?1`
      ).bind(orderId).first();
    } catch { o = null; }
  }
  if (!o || !o.email || !o.closed_at || o.status !== 'delivered' || o.service === SAMPLE_SERVICE) return false;

  /* De claim: alleen wie de regel schrijft, verstuurt. */
  let geclaimd = false;
  try {
    const r = await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor)
       SELECT ?1, 'delivered', ?2, 'intern'
        WHERE NOT EXISTS (SELECT 1 FROM order_events WHERE order_id = ?1 AND note = ?2)`
    ).bind(o.id, AFROND_MAIL_NOTITIE).run();
    geclaimd = Number(r?.meta?.changes) > 0;
  } catch (err) {
    console.error('[afrondmail] claim mislukt voor', o.ref, '—', err?.message || err);
    return false;
  }
  if (!geclaimd) return false;

  try {
    /* Een eigen link naar de bestelpagina: de database kent alleen hashes (zie
       betaalMailContext() in invoiceMail.js); de vorige links blijven werken. */
    let link = '';
    try {
      const token = mintToken();
      await env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)').bind(o.id, await hashToken(token)).run();
      link = portalUrl(token, env.PUBLIC_ORIGIN || 'https://visuails.com');
    } catch { link = ''; }
    const { subject, html } = afrondEmail({ lang: o.lang === 'en' ? 'en' : 'nl', order: o, link, reden, nu });
    await sendMail(env, { to: o.email, subject, html });
    return true;
  } catch (err) {
    console.error('[afrondmail] niet verstuurd voor', o.ref, '—', err?.message || err);
    /* De claim terug, zodat een volgende afronding (na weer openen) het opnieuw kan proberen. */
    await env.DB.prepare('DELETE FROM order_events WHERE order_id = ?1 AND note = ?2 AND actor = \'intern\'')
      .bind(o.id, AFROND_MAIL_NOTITIE).run().catch(() => {});
    return false;
  }
}
