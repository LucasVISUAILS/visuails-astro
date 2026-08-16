// VISUAILS — alsnog betalen vanuit het dashboard.
// 7 augustus 2026.
//
// WAAROM DIT BESTAND ER IS. Tot vandaag werd een betaallink precies één keer
// aangemaakt: tijdens het bestellen, in functions/api/order.js. Hij stond in de
// bevestigingsmail en op /thank-you, en verder nergens. Wie de tab sloot voordat
// hij betaalde had geen enkele weg terug, terwijl `window_expires_at` doorliep
// en zijn plek in de planning teruggaf. POST /account/orders/<id>/pay maakt een
// nieuwe aan.
//
// EN DAAROM STAAT HET ONDER TEST. Dit is de eerste route in het klantscherm die
// een BEDRAG naar buiten stuurt. Alles wat hier fout kan, kost geld of
// vertrouwen:
//
//   1 · het verkeerde bedrag incasseren (bruto is netto + btw, nooit netto)
//   2 · nog een keer incasseren bij een bestelling die al betaald is
//   3 · iemand laten betalen voor de bestelling van een ander
//   4 · een betaling openen voor een dienst die helemaal geen prijs heeft
//
// Mollie wordt gestubd. Er gaat vanuit een test geen enkel verzoek naar
// api.mollie.com: een suite die aan een externe dienst hangt, wordt rood om
// redenen die niets met deze code te maken hebben.
import { accountPost } from '../src/lib/account.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { paymentDescription } from '../src/lib/quote.js';

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(58)} ${got}`);
  if (!cond) fails++;
};

const CUSTOMER_ID = 7;
const token = await mintToken();
const hash = await hashToken(token);
const inAnHour = new Date(Date.now() + 3600_000).toISOString();

/**
 * Een domme D1 die precies twee vragen beantwoordt: wie ben je (de sessie) en
 * welke bestelling is dit. De rest — rate_limits, de touch van de sessie — geeft
 * niets terug, en dat leest overal als "geen bezwaar".
 */
function makeDb(order) {
  return {
    prepare(sql) {
      const st = {
        sql,
        _b: [],
        bind(...a) { st._b = a; return st; },
        async first() {
          if (sql.includes('FROM account_sessions')) {
            return st._b[0] === hash
              ? { session_id: 1, expires_at: inAnHour, customer_id: CUSTOMER_ID, email: 'studio@voltbrand.nl', name: 'Mara', brand: 'VOLT' }
              : null;
          }
          if (sql.includes('FROM orders')) {
            // Dezelfde WHERE als de echte query: id én customer_id moeten
            // kloppen. Dat is het hele eigendomsbewijs, dus de stub doet het na
            // in plaats van de rij zomaar terug te geven.
            const [id, customerId] = st._b;
            return order && order.id === id && customerId === CUSTOMER_ID ? order : null;
          }
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return {}; },
      };
      return st;
    },
    async batch() { return []; },
  };
}

/** Wat Mollie zou antwoorden, plus wat wij hem stuurden. */
function stubMollie(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init?.body || '{}') });
    return handler ? handler() : {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          id: 'tr_TEST', status: 'open',
          _links: { checkout: { href: 'https://www.mollie.com/checkout/test/tr_TEST' } },
        });
      },
    };
  };
  return calls;
}

async function pay(order, { handler } = {}) {
  const calls = stubMollie(handler);
  const request = new Request(`https://visuails.com/account/orders/${order ? order.id : 1}/pay`, {
    method: 'POST',
    headers: {
      cookie: `vis_account=${token}`,
      origin: 'https://visuails.com',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: '',
  });
  const res = await accountPost({
    request,
    env: { DB: makeDb(order), MOLLIE_API_KEY: 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM' },
    waitUntil() {},
  });
  /*
   * `body` komt mee sinds 9 augustus 2026. Tot die dag las deze helper alleen de
   * Location-header, en dat is precies waarom hij een kapotte betaalknop groen
   * kon houden: /account/orders/<id>/pay antwoordde met een 303 naar Mollie, deze
   * test vond die url in de header, en de browser blokkeerde de omleiding omdat
   * form-action 'self' ook over redirects gaat. Zie de kop van src/lib/offsite.js.
   *
   * Het antwoord is nu een tussenpagina, dus moet de test in de PAGINA kunnen
   * kijken. Een 303 blijft bestaan voor alles wat op onze eigen site landt — de
   * mislukte gevallen hieronder — en dan is `body` leeg.
   */
  const body = res.status === 200 ? await res.text() : '';
  return { status: res.status, to: res.headers.get('location') || '', body, calls };
}

/* Waar de tussenpagina iemand naartoe stuurt. Twee plekken in één pagina, en ze
   moeten hetzelfde doel noemen: de meta refresh doet het werk, de knop is er voor
   het geval die geblokkeerd is. Eén van de twee is niet genoeg. */
function bestemming(body) {
  const meta = /<meta http-equiv="refresh" content="0; url=([^"]+)">/.exec(body)?.[1] || '';
  const link = /<a class="btn btn-primary" href="([^"]+)"/.exec(body)?.[1] || '';
  return meta && meta === link ? meta : `meta=${meta} link=${link}`;
}

const base = {
  id: 91, ref: 'VIS-2608-4471', service: 'catalog', lang: 'nl',
  product_count: 30, total_cents: 63000, vat_cents: 13230, payment_status: 'unpaid',
};

// ── 1 · HET GEWONE GEVAL, EN HET BEDRAG ──────────────────────────────────────
console.log('\n── de betaling ──');
{
  const r = await pay(base);
  /*
   * GEEN 303 MEER. Hier stond `r.status === 303 && /mollie\.com/.test(r.to)`, en
   * die regel was de hele tijd waar terwijl de knop niets deed — zie de noot bij
   * pay() hierboven. Wat nu getoetst wordt is wat de klant echt krijgt: een
   * pagina van ons die hem naar Mollie stuurt, met het doel twee keer erin.
   */
  check('an unpaid order is sent on to Mollie', r.status === 200 && /^https:\/\/[^/]*mollie\.com\/checkout/.test(bestemming(r.body)), bestemming(r.body));
  check('  and not with a redirect the browser refuses', r.status, 200);
  check('exactly one payment is created', r.calls.length === 1, r.calls.length);
  // 630,00 netto + 132,30 btw = 762,30. Alleen het netto bedrag sturen zou 21%
  // per bestelling weglekken, en niemand zou het merken tot de aangifte.
  check('the amount is net PLUS vat', r.calls[0]?.body?.amount?.value, r.calls[0]?.body?.amount?.value);
  check('  → 762.30', r.calls[0]?.body?.amount?.value === '762.30');
  check('the order reference travels with it',
    r.calls[0]?.body?.metadata?.order_ref === 'VIS-2608-4471');
  check('the webhook points at our own handler',
    /^https:\/\/visuails\.com\/api\/webhook\/mollie$/.test(r.calls[0]?.body?.webhookUrl || ''),
    r.calls[0]?.body?.webhookUrl);
  /*
   * DE TERUGKEER DRAAGT HET ID TWEE KEER, EN DAT IS OPZET — 10 augustus 2026.
   *
   * De bestelkaarten zijn <details> geworden en staan dicht als er niets te doen is.
   * Een hash bereikt de server nooit, dus zonder `?order=` landt een klant die
   * terugkomt van Mollie op een dichte kaart. De hash laat de browser springen, de
   * query vertelt de server welke kaart open moet. Zie de noot bij openOrderId in
   * src/lib/account.js — daar staat ook waarom CSS dit niet kan oplossen.
   */
  check('and Mollie sends them back to the order they came from',
    /\/account\/orders\?order=91#order-91$/.test(r.calls[0]?.body?.redirectUrl || ''),
    r.calls[0]?.body?.redirectUrl);
  check('and the card they land on will be open, not collapsed',
    /[?&]order=91(&|#|$)/.test(r.calls[0]?.body?.redirectUrl || ''),
    r.calls[0]?.body?.redirectUrl);
  check('the checkout language follows the order, not the browser',
    r.calls[0]?.body?.locale === 'nl_NL');
}

// Zonder migratie 0015 bestaat vat_cents niet. Elke rij van vóór die migratie is
// een Nederlandse bestelling met 21% erover — dus is 21% de enige aanname die
// niet stilletjes btw weggeeft.
{
  const r = await pay({ ...base, vat_cents: undefined });
  check('no vat_cents column falls back to 21%, not to zero',
    r.calls[0]?.body?.amount?.value === '762.30', r.calls[0]?.body?.amount?.value);
}

{
  const r = await pay({ ...base, vat_cents: 0, total_cents: 20800 });
  check('a reverse-charged order pays exactly net',
    r.calls[0]?.body?.amount?.value === '208.00', r.calls[0]?.body?.amount?.value);
}

// ── DE VAL DIE quote.js AL EEN KEER HEEFT GEKOST ─────────────────────────────
// /start/complete post `service=drop`; de ladder in pricing.js noemt datzelfde
// pakket 'complete'. PAYABLE_SERVICES kent alleen de laddernaam. Wie de rij uit
// de database rechtstreeks tegen die verzameling houdt, sluit de duurste
// bestelling op de site uit van betalen — zie LADDER_KEY in src/lib/quote.js,
// waar dezelfde fout in 2026 al eens een order van € 2.359,50 gratis liet gaan.
{
  const r = await pay({ ...base, service: 'drop', total_cents: 235950, vat_cents: 49549 });
  check('"drop" (= Both together) can be paid', r.calls.length === 1, r.calls.length);
  check('and for the right amount',
    r.calls[0]?.body?.amount?.value === '2855.00'
      || r.calls[0]?.body?.amount?.value === '2854.99',
    r.calls[0]?.body?.amount?.value);
  check('the description names the product, not "undefined"',
    !/undefined/.test(r.calls[0]?.body?.description || ''), r.calls[0]?.body?.description);
}

// ── 2 · WANNEER ER NIETS MAG GEBEUREN ────────────────────────────────────────
console.log('\n── en wanneer niet ──');
{
  const r = await pay({ ...base, payment_status: 'paid' });
  check('an order that is already paid creates NO payment', r.calls.length === 0, r.calls.length);
  check('and is sent back to its own card', /#order-91$/.test(r.to), r.to);
}

{
  const r = await pay({ ...base, payment_status: 'refunded' });
  check('a refunded order creates no payment', r.calls.length === 0, r.calls.length);
}

{
  // De stub geeft null terug zodra het id niet klopt — precies wat de echte
  // WHERE doet als de bestelling van iemand anders is.
  const r = await pay({ ...base, id: 999 });
  const other = await (async () => {
    const calls = stubMollie();
    const request = new Request('https://visuails.com/account/orders/12/pay', {
      method: 'POST',
      headers: { cookie: `vis_account=${token}`, origin: 'https://visuails.com' },
    });
    const res = await accountPost({
      request,
      env: { DB: makeDb({ ...base, id: 999 }), MOLLIE_API_KEY: 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM' },
      waitUntil() {},
    });
    return { status: res.status, calls };
  })();
  check('an order id that is not yours creates no payment', other.calls.length === 0, other.calls.length);
  check('and answers with a redirect, not an error page', other.status === 303, other.status);
  void r;
}

{
  const r = await pay({ ...base, service: 'video', total_cents: null });
  check('a service with no price creates no payment', r.calls.length === 0, r.calls.length);
}

{
  const r = await pay({ ...base, service: 'custom', total_cents: 50000, vat_cents: 10500 });
  check('an enquiry-only service creates no payment either', r.calls.length === 0, r.calls.length);
}

{
  const r = await pay({ ...base, total_cents: 0, vat_cents: 0 });
  check('a zero total creates no payment', r.calls.length === 0, r.calls.length);
}

// ── 3 · ALS MOLLIE NEE ZEGT ──────────────────────────────────────────────────
console.log('\n── als het misgaat ──');
{
  const r = await pay(base, {
    handler: () => ({ ok: false, status: 422, async text() { return '{"title":"Unprocessable Entity"}'; } }),
  });
  check('a refusal does not throw', r.status === 303, r.status);
  check('and says so on the page instead of failing silently',
    /\?pay=failed&order=91#order-91$/.test(r.to), r.to);
  /* Zonder dit valt de melding "betalen is mislukt" op een ingeklapte kaart. */
  check('and opens the card the message is about',
    /[?&]order=91(&|#|$)/.test(r.to), r.to);
}

{
  // Het antwoord komt niet van Mollie. Er mag dan geen redirect naar buiten
  // volgen — een 303 naar een adres dat een derde heeft aangeleverd is een open
  // doorverwijzing, en dit is de enige plek in dit bestand waar een externe URL
  // in een Location-header terechtkomt.
  const r = await pay(base, {
    handler: () => ({
      ok: true, status: 200,
      async text() { return JSON.stringify({ _links: { checkout: { href: 'https://evil.example/checkout' } } }); },
    }),
  });
  check('a checkout URL that is not Mollie is refused', !/evil\.example/.test(r.to), r.to);
  check('and lands back on the order', /#order-91$/.test(r.to), r.to);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * DE OMSCHRIJVING OP HET BANKAFSCHRIFT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * DEZELFDE VAL DREIGDE VOOR DE DERDE KEER. `paymentDescription()` sleutelt op de
 * LADDERNAAM en `orders.service` draagt de WIRE-waarde; /start/complete post
 * 'drop'. Zonder vertaling gaf de functie letterlijk "VISUAILS — 30 producten,
 * undefined" terug, op de duurste deur van de site, in élke bevestigingsmail.
 *
 * Twee keer eerder heeft dezelfde vertaling in dit project geld gekost: één keer
 * bij PAYABLE_SERVICES (een bestelling van € 2.359,50 zonder betaalknop) en één
 * keer bij tierFor(). Vandaar dat het hier niet als aanroepercode getoetst wordt
 * maar als UITKOMST: wat komt eruit, voor elke dienst die de site verkoopt.
 */
console.log('\nde betaalomschrijving noemt de dienst bij naam, ook op de wire-waarde');
{
  for (const [svc, nlWoord] of [
    ['drop', 'catalog + lifestyle'],
    ['complete', 'catalog + lifestyle'],
    ['catalog', 'catalogsets'],
    ['lifestyle', 'lifestyle-carousels'],
  ]) {
    const nl = paymentDescription({ service: svc, products: 30 }, 'nl');
    const en = paymentDescription({ service: svc, products: 30 }, 'en');
    check(`${svc}: NL noemt de dienst`, nl.includes(nlWoord), nl);
    check(`${svc}: en er staat nergens 'undefined'`, !/undefined/.test(nl + en), `${nl} | ${en}`);
  }
  /* De proef heeft zijn eigen zin en geen aantal — die tak stond er al en mag
     niet meeveranderen. */
  check('de proefvisual houdt zijn eigen omschrijving',
    paymentDescription({ service: 'test-sample', products: 1 }, 'nl') === 'VISUAILS proefvisual', true);
  /* Enkelvoud. Eén product is geen "1 producten" op een bankafschrift. */
  check('en één product staat in het enkelvoud',
    paymentDescription({ service: 'catalog', products: 1 }, 'nl').includes('1 product,'), true);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
if (fails) process.exit(1);
