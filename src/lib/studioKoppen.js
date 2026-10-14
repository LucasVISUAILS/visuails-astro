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
export function studioHeaders() {
  return {
    'cache-control': 'no-store',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      `default-src 'none'; img-src 'self' data:; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
  };
}
