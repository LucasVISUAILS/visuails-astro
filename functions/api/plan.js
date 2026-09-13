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
 *   2. sessie eerst    Is er tóch iemand ingelogd, dan IS dat de klant. Het
 *                      E-MAILADRES uit het formulier telt dan niet mee — anders
 *                      sluit een ingelogde bezoeker een abonnement af op het
 *                      adres van iemand anders.
 *   3. gegevens        Voor wie uitgelogd is: dezelfde velden als het
 *                      bestelformulier, want ze gaan naar dezelfde kolommen en
 *                      op dezelfde factuur.
 *
 *                      ── EN SINDS 11 SEPTEMBER OOK VOOR WIE INGELOGD IS ─────
 *                      Lucas: *"Plaats de gegevens van het ingelogde account
 *                      automatisch in de open velden (…) en zorg ervoor dat de
 *                      klant alsnog zijn gegevens daar kan bewerken wanneer dat
 *                      nodig is."* Het formulier vult ze nu in en laat ze open
 *                      staan, dus moet deze kant ze ook AANNEMEN — anders
 *                      bewerkt de klant iets wat niet op zijn factuur komt, en
 *                      dat is erger dan een veld dat hij niet mocht wijzigen.
 *                      Zie werkGegevensBij() onderaan voor wat er dan precies
 *                      geschreven wordt, en waarom niet via upsertCustomer().
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
import { normalizeEmail, normalizePhone } from '../../src/lib/payer.js';
import { composeName, composeAddress } from '../../src/data/address.js';
import { voorkeurMet } from '../../src/data/contactvoorkeur.js';
import { vatFormatOk } from '../../src/data/vat.js';

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

  /* Ingelogd: de gegevens uit het formulier zijn de gegevens van deze klant,
     want hij heeft ze net op zijn scherm zien staan en mogen aanpassen. Het
     e-mailadres blijft dat van de sessie. */
  if (klant) {
    await werkGegevensBij(env, klant, form);
  }

  if (!klant) {
    const email = normalizeEmail(tekst(form.get('email'), 254));
    /* Twee velden sinds 11 september, net als op het bestelformulier en in het
       accountscherm. `name` blijft bestaan als de SAMENGESTELDE weergave en
       wordt hier één keer opgebouwd — nergens anders afgeleid, zodat een mail
       of een adminscherm de naam als één ding kan lezen. */
    const voornaam = tekst(form.get('first_name'), 60);
    const achternaam = tekst(form.get('last_name'), 60);
    const naam = composeName(voornaam, achternaam);
    if (!isEmail(email) || naam.length < 2) return terug('gegevens', lang);

    /* Een nummer is verplicht sinds 11 september 2026 — zie de noot in
       functions/api/order.js. Op dit formulier weegt het het zwaarst: het
       eindigt in een doorlopende machtiging. */
    const telefoon = tekst(form.get('phone'), 40);
    if (!normalizePhone(telefoon)) return terug('gegevens', lang);

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

    /* ── DE VORM VAN HET BTW-NUMMER — 12 september 2026 ─────────────────────
       Dezelfde controle als op het bestelformulier (zie de noot bij vatShape()
       in src/data/vat.js). Hier weegt hij zwaarder dan daar: een abonnement
       maakt niet één factuur maar elke maand een, en het nummer dat hier binnen-
       komt gaat via upsertCustomer() naar `customers.vat_number` en staat
       daarmee op allemaal.

       `false` en niet `!== true`: vatFormatOk() geeft `null` als er niets te
       oordelen valt — geen nummer, of een land buiten de EU — en dat is geen
       reden om iemand terug te sturen. Het btw-nummer is op dit formulier
       optioneel; alleen een ingevuld nummer dat niet klopt, klopt niet. */
    if (vatFormatOk(land, btw) === false) return terug('btw', lang);

    let id = null;
    try {
      /* ── DE SLEUTELNAMEN ZIJN DIE VAN upsertWide() — 11 september 2026 ───
         Hier stond `address_line1` en `postal_code`. Die kolomnamen staan wel in
         de tabel, maar upsertCustomer() leest zijn argument met CAMELCASE
         sleutels (`line1`, `postal`, `firstName`) — zie de bind-lijst onderaan
         functions/api/order.js. Twee van de drie kwamen daardoor niet aan: een
         klant die zich zonder account abonneerde, kreeg wél een samengesteld
         `billing_address` maar lege losse adresvelden. Zichtbaar werd dat
         nergens, want de factuur leest het samengestelde blok.
         `city` klopte toevallig, omdat die in beide vormen hetzelfde heet. */
      id = await upsertCustomer(env, {
        email, name: naam, brand: merk || null, vat: btw || null,
        country: land, address: adres || null,
        firstName: voornaam || null, lastName: achternaam || null,
        line1: straat || null, postal: postcode || null, city: stad || null,
        phone: telefoon || null,
        contactPreference: voorkeurMet(form.get('contact_preference'), telefoon),
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

/*
 * ── DE GEGEVENS VAN EEN INGELOGDE KLANT BIJWERKEN — 11 september 2026 ───────
 *
 * Waarom dit NIET via upsertCustomer() gaat, terwijl de uitgelogde tak dat wel
 * doet: die functie draagt de regel dat een klant die zijn gegevens heeft
 * OPGESLAGEN ze houdt, en dat een nieuwe inzending alleen een leeg veld kan
 * vullen (`details_saved_at`). Dat is een goede regel — hij beschermt bewaarde
 * gegevens tegen wat er in een haastige bestelling wordt getypt.
 *
 * Hier geldt hij precies niet. De klant KIJKT naar zijn opgeslagen gegevens,
 * ingevuld in de velden voor zijn neus, en verandert er iets aan. Dat is geen
 * bestelling die iets denkt te weten; dat is de eigenaar die corrigeert. Via
 * upsertCustomer() zou die correctie stil worden genegeerd — een bewerkbaar
 * veld dat niets doet, en dat is erger dan een veld dat op slot zit.
 *
 * WAT ER NIET WORDT GESCHREVEN: het e-mailadres. Dat adres is de identiteit van
 * het account; het formulier zet dat veld op readonly en deze kant leest het
 * niet eens. Ook `details_saved_at` blijft ongemoeid: dit is een correctie en
 * geen "onthou mij" — die keuze hoort in het accountscherm.
 *
 * EN HET BLOKKEERT NOOIT DE BETALING. Lukt het bijwerken niet, dan gaat het
 * abonnement gewoon door met de gegevens die er al stonden. Een mislukte
 * adreswijziging is een reden om te loggen, niet om iemand die wil betalen bij
 * de deur te weigeren.
 */
async function werkGegevensBij(env, klant, form) {
  if (!env?.DB || !klant?.customer_id) return;

  const voornaam = tekst(form.get('first_name'), 60);
  const achternaam = tekst(form.get('last_name'), 60);
  const straat = tekst(form.get('address_line1'), 120);
  const postcode = tekst(form.get('postal_code'), 24);
  const stad = tekst(form.get('city'), 80);
  const land = tekst(form.get('country'), 2).toUpperCase();
  const telefoon = tekst(form.get('phone'), 40);

  /* Alles of niets, en met opzet. Deze velden vormen samen één factuuradres;
     de helft ervan overschrijven levert een adres op dat noch het oude noch het
     nieuwe is. Komt er een halve inzending binnen — een oude pagina, een bot,
     een script dat niet gedraaid heeft — dan verandert er niets. */
  if (!voornaam || !achternaam || !straat || !postcode || !stad || land.length !== 2) return;
  if (!normalizePhone(telefoon)) return;

  const naam = composeName(voornaam, achternaam);
  const adres = composeAddress({ line1: straat, postal: postcode, city: stad });
  const merk = tekst(form.get('brand'), 120);
  const btw = tekst(form.get('vat'), 32);

  try {
    await env.DB.prepare(
      `UPDATE customers SET
         first_name = ?2, last_name = ?3, name = ?4,
         address_line1 = ?5, postal_code = ?6, city = ?7,
         billing_address = ?8, country = ?9,
         brand = ?10, vat_number = ?11,
         phone = ?12, contact_preference = ?13,
         updated_at = datetime('now')
       WHERE id = ?1`
    ).bind(
      klant.customer_id,
      voornaam, achternaam, naam,
      straat, postcode, stad,
      adres, land,
      merk || null, btw || null,
      telefoon, voorkeurMet(form.get('contact_preference'), telefoon),
    ).run();
  } catch (err) {
    /* Zoals de kop zegt: loggen en doorgaan. */
    console.error('[abonnement] gegevens van ingelogde klant niet bijgewerkt —', err?.message || err);
  }
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
