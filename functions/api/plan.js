/*
 * ══════════════════════════════════════════════════════════════════════════════
 * EEN ABONNEMENT AFSLUITEN ZONDER ACCOUNT — 9 september 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Iemand kan geen abonnement afsluiten zonder een account te hebben."*
 *
 * Dat klopte, en het was een BEWUSTE keuze — zie de oude kop van
 * src/lib/subscribe.js: *"Alleen wie is ingelogd (…) Wil je dat wél openzetten,
 * dan is dit de plek waar die beslissing hoort — en dan hoort er een
 * accountaanmaak bij, niet een uitzondering hier."*
 *
 * Dit bestand is die accountaanmaak. Precies zoals de oude noot voorschreef:
 * geen uitzondering in subscribe.js, maar een ingang ervoor die de klant maakt
 * en daarna dezelfde motor start.
 *
 * ── DE VOLGORDE, EN WAAROM HIJ ZO IS ───────────────────────────────────────
 *
 *   1. ratelimiet      Deze route maakt een klant, een abonnementsrij en een
 *                      Mollie-betaling. Dat is duurder dan een bestelling, dus
 *                      niet ruimer dan /api/order: 10 per 10 minuten per IP.
 *   2. sessie eerst    Is er tóch iemand ingelogd, dan IS dat de klant. Wat er
 *                      in het formulier is getypt, telt dan niet mee — anders
 *                      sluit een ingelogde bezoeker een abonnement af op het
 *                      e-mailadres van iemand anders.
 *   3. gegevens        Alleen voor wie uitgelogd is. Dezelfde velden als het
 *                      bestelformulier, want ze gaan naar dezelfde kolommen en
 *                      op dezelfde factuur.
 *   4. upsertCustomer  Uit functions/api/order.js, niet nagebouwd. Die functie
 *                      draagt de regel dat een klant die zijn gegevens heeft
 *                      opgeslagen ze HOUDT, en dat een nieuwe inzending alleen
 *                      een leeg veld kan vullen.
 *   5. dezelfde motor  handleSubscribeStart(). Eén validatie van plan, termijn
 *                      en maand-op-maat, één capaciteitspoort, één Mollie-pad.
 *                      Het formulier is al gelezen, dus hij krijgt het mee.
 *
 * ── WAT DIT NIET VERZWAKT ──────────────────────────────────────────────────
 *
 * De machtiging komt uit een ECHTE eerste betaling bij Mollie, met iDEAL of een
 * kaart op naam. Wie betaalt, is wie tekent. Een ingetypt e-mailadres van een
 * ander levert dus geen mandaat op — het levert hoogstens een lege klantrij op,
 * en dat is dezelfde blootstelling die /api/order al heeft.
 *
 * ── EN HOE KOMT DIE KLANT DAARNA BIJ ZIJN ACCOUNT ──────────────────────────
 *
 * Zoals iedereen: /account/login, een e-mail met een link, geen wachtwoord. De
 * rij bestaat vanaf nu, dus die link werkt. De bevestigingspagina zegt het.
 */
import { upsertCustomer } from './order.js';
import { currentCustomer } from '../../src/lib/account.js';
import { handleSubscribeStart } from '../../src/lib/subscribe.js';
import { offsitePage } from '../../src/lib/offsite.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { normalizeEmail } from '../../src/lib/payer.js';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

function terug(reden, lang) {
  const pad = lang === 'en' ? '/start/plan' : '/nl/start/plan';
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${pad}?fout=${encodeURIComponent(reden)}`,
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
    },
  });
}

const tekst = (v, max = 200) => String(v || '').trim().slice(0, max);

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;

  let form;
  try {
    form = await request.formData();
  } catch {
    return terug('opslaan', 'nl');
  }

  const lang = String(form.get('lang') || 'nl') === 'en' ? 'en' : 'nl';

  const rate = await checkRate(env, { ip: clientIp(request), action: 'plan', limit: 10, windowSeconds: 600 });
  if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
  if (!rate.allowed) {
    return new Response(null, {
      status: 429,
      headers: { 'retry-after': String(Math.max(1, rate.retryAfter || 60)), 'content-type': 'text/plain' },
    });
  }

  /* De honeypot, hetzelfde veld en dezelfde stille afhandeling als bij een
     bestelling: een bot die hem invult krijgt geen foutmelding om op te
     verbeteren, maar de gewone omleiding zonder dat er iets gebeurt. */
  if (tekst(form.get('company_hp'))) return terug('opslaan', lang);

  let klant = null;
  try {
    klant = await currentCustomer(env, request);
  } catch {
    klant = null;
  }

  if (!klant) {
    const email = normalizeEmail(tekst(form.get('email'), 254));
    const naam = tekst(form.get('name'), 120);
    if (!isEmail(email) || naam.length < 2) return terug('gegevens', lang);

    const merk = tekst(form.get('brand'), 120);
    const land = tekst(form.get('country'), 2).toUpperCase();
    const btw = tekst(form.get('vat'), 32);
    /* Het adres gaat als ÉÉN veld met regeleindes naar `customers.billing_address`
       — dat is de vorm die de factuurbouwer verwacht (zie de noot bij
       composeAddress() in src/lib/invoice.js, die hem alleen nog splitst). */
    const straat = tekst(form.get('address_line1'), 120);
    const postcode = tekst(form.get('postal_code'), 24);
    const stad = tekst(form.get('city'), 80);
    const adres = [straat, [postcode, stad].filter(Boolean).join(' ')].filter(Boolean).join('\n');
    if (!straat || !postcode || !stad || land.length !== 2) return terug('gegevens', lang);

    let id = null;
    try {
      id = await upsertCustomer(env, {
        email, name: naam, brand: merk || null, vat: btw || null,
        country: land, address: adres || null,
        address_line1: straat || null, postal_code: postcode || null, city: stad || null,
      });
    } catch (err) {
      console.error('[abonnement] klant niet aangemaakt —', err?.message || err);
      return terug('opslaan', lang);
    }
    if (!id) return terug('opslaan', lang);

    /* De vorm die handleSubscribeStart() verwacht: dezelfde velden die
       currentCustomer() teruggeeft, en niet meer dan dat. */
    klant = { customer_id: id, email, name: naam, brand: merk || null };
  }

  return handleSubscribeStart(context, klant, (url, taal) => {
    const p = offsitePage({ url, name: 'Mollie', lang: taal, css: '/account.css' });
    return p
      ? new Response(p, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
      : terug('mollie', taal);
  }, form);
}

/* Een GET hier is iemand die het adres heeft geplakt. Terug naar het formulier,
   zonder foutmelding: er is niets misgegaan, hij staat alleen op de verkeerde
   plek. */
export function onRequestGet({ request }) {
  const lang = new URL(request.url).pathname.startsWith('/nl') ? 'nl' : 'en';
  return new Response(null, {
    status: 303,
    headers: { Location: lang === 'en' ? '/start/plan' : '/nl/start/plan', 'cache-control': 'no-store' },
  });
}
