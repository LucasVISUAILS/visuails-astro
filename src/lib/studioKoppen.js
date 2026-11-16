// VISUAILS — de koppen van Studio (/account), op één plek.
//
// Hier sinds 8 oktober 2026 (o25), uit src/lib/account.js gehaald: de
// middleware (src/middleware.js) leest ze voor elk antwoord onder /account, en
// die hoort niet het hele dashboardbestand mee te laden bij elke Worker-start.
// account.js geeft deze functie gewoon door, dus elke bestaande import werkt.

/**
 * De koppen van de antwoorden van dit dashboard, voor een Astro-pagina die ze
 * zelf zet. Dezelfde als html() in account.js, met één verschil: `img-src` laat
 * ook `data:` toe, want global.css (die Studio nu deelt met de site) tekent zijn
 * korrel als een data-URI-svg — en die is opmaak, geen inhoud. Zonder die
 * uitzondering meldde elke pagina een CSP-fout in de console.
 */
/* ── ÉÉN UITZONDERING: DE INTAKE OP MAAT — 15 november 2026 (lijst 112) ─────────────────────────────────────
   Studio draait zonder script: een fout waardoor tekst van een klant als code op het scherm komt, kan dan niets.
   De intake op maat heeft een script nodig (de schatting die meerekent, uploaden, opslaan terwijl hij typt), en
   Lucas koos voor één uitzondering: alleen /account/op-maat, alleen een bestand van onze eigen site (script-src
   'self', dus geen code in de pagina zelf en niets van buiten), en fetch alleen naar onszelf (connect-src 'self').
   tests/op-maat-studio.test.mjs bewaakt dat elke andere Studio-pagina zonder script blijft. */
export function studioHeaders({ script = false } = {}) {
  return {
    'cache-control': 'no-store',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      `default-src 'none'; img-src 'self' data:${script ? ' blob:' : ''}; style-src 'self'; font-src 'self';${script ? " script-src 'self'; connect-src 'self';" : ''} form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
  };
}

/* ── DE KLAP-VLAG — 15 oktober 2026 ──────────────────────────────────────────
 * Lucas: *"als ik van tab wissel in /studio dat er elke keer een animatie afspeelt,
 * dit hoeft niet."* De overgang tussen pagina's (studio.css, "DE OVERGANG") is er
 * voor het dicht- en openklappen van de zijbalk; tussen twee tabs hoort er niets te
 * bewegen. Studio draait zonder script, dus de pagina moet zelf weten of hij na een
 * klap komt: ?nav= zet naast vis_nav deze korte vlag (account.js), StudioLayout zet
 * dan data-klap op <html> (alleen dan bewegen de view-transition-lagen), en de
 * middleware wist de vlag op dat antwoord, zodat de volgende tab weer stil is. */
export const KLAP_COOKIE = 'vis_klap';
const KLAP_VLAGGEN = 'Path=/account; HttpOnly; Secure; SameSite=Lax';
export const klapZet = () => `${KLAP_COOKIE}=1; Max-Age=30; ${KLAP_VLAGGEN}`;
export const klapWis = () => `${KLAP_COOKIE}=; Max-Age=0; ${KLAP_VLAGGEN}`;
export function heeftKlap(request) {
  const raw = (request && request.headers && request.headers.get('cookie')) || '';
  return new RegExp(`(?:^|;\\s*)${KLAP_COOKIE}=1(?:;|$)`).test(raw);
}
