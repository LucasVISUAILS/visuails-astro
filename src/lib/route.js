/**
 * VISUAILS — van een Astro-endpoint naar een Pages-handler. 5 september 2026.
 *
 * De serverkant van deze site is geschreven als Cloudflare Pages Functions: elke
 * handler krijgt één `context` met `request`, `env` (de bindings: DB, UPLOADS,
 * de vars, de secrets) en `waitUntil`. Zo is hij ook getest, met een gestubde env
 * onder gewone `node`, in tientallen tests.
 *
 * Sinds de site één Worker is (zie astro.config.mjs), roept Astro die handlers
 * aan. Astro geeft zijn endpoints een ander object: `request` zit er direct in,
 * de bindings komen uit `import { env } from 'cloudflare:workers'` (sinds Astro 6;
 * `locals.runtime.env` gooit een fout) en `waitUntil` zit in `locals.cfContext`.
 * Dit bestand vertaalt het ene naar het andere, zodat de handlers en hun tests
 * ongewijzigd blijven en de endpoints in src/pages vier regels zijn.
 *
 * Dit bestand draait daardoor ALLEEN in de Worker (en onder `astro dev`, dat de
 * Worker in workerd nabootst). Onder gewone `node` bestaat 'cloudflare:workers'
 * niet — importeer dit dus niet in een test; test de handlers zelf, zoals nu.
 *
 *   export const prerender = false;
 *   export const GET  = alsRoute(accountGet);
 *   export const POST = alsRoute(accountPost);
 *
 * Wat er bewust NIET vertaald wordt: `params`. Geen enkele handler leest ze — ze
 * lezen het pad uit `request.url`, omdat Pages een `[[path]]`-route en een
 * `index.js` dezelfde code liet delen. Dat blijft zo.
 */

import { env } from 'cloudflare:workers';

/** Bouw het Pages-`context` uit wat Astro meegeeft. */
export function pagesContext(astroCtx) {
  const ctx = astroCtx?.locals?.cfContext;
  const context = {
    request: astroCtx.request,
    env,
    params: astroCtx.params || {},
  };
  if (ctx && typeof ctx.waitUntil === 'function') context.waitUntil = (p) => ctx.waitUntil(p);
  if (ctx && typeof ctx.passThroughOnException === 'function') {
    context.passThroughOnException = () => ctx.passThroughOnException();
  }
  return context;
}

/** Een Pages-handler als Astro-endpoint. */
export function alsRoute(handler) {
  return (astroCtx) => handler(pagesContext(astroCtx));
}

/**
 * Voor elke methode die een route niet kent. Pages antwoordde daar 405 op;
 * Astro zou stil 404 zeggen. Exporteer dit als `ALL` naast de echte methodes —
 * Astro kijkt eerst naar de methode zelf en pas dan naar ALL.
 */
export function nietToegestaan(...methodes) {
  const allow = methodes.join(', ');
  return () => new Response(null, { status: 405, headers: { allow } });
}
