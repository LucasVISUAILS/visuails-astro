// VISUAILS — Astro-middleware. Eén taak: de beveiligingskoppen van Studio.
//
// ── DE KOPPEN VAN /account, OOK ALS DE OPMAAK ZE MIST — 8 oktober 2026 (o25) ──
//
// De Studio-pagina's krijgen no-store, HSTS en hun CSP (`default-src 'none'`,
// geen JavaScript) van StudioLayout.astro, dat ze met Astro.response.headers zet.
// Dat werkt alleen omdat die regel vóór de eerste `await` in de opmaak staat:
// Astro stuurt de koppen weg zodra er iets te streamen is, en de documentatie
// zegt dat koppen in een pagina horen, niet in een opmaak. Eén `await` hoger in
// dat bestand en no-store en frame-ancestors vallen stil weg (rapport-klant.md,
// bevinding 5).
//
// Deze middleware is het vangnet eronder. Hij draait na de pagina en zet op elk
// antwoord onder /account dat een PAGINA of een DOORVERWIJZING is, de koppen uit
// studioHeaders() die er nog NIET op staan. Wat er al staat blijft staan: de
// oude html()-schil in account.js heeft een eigen CSP, en een beeld, pdf of zip
// zet zijn eigen cache-control. Alles buiten /account gaat ongemoeid door.
//
// Alleen op verzoeken die de Worker zelf beantwoordt; de statische pagina's van
// de site komen hier in productie niet langs (bij het bouwen wel, en daar doet
// dit niets, want die staan niet onder /account).
import { studioHeaders, heeftKlap, klapWis } from './lib/studioKoppen.js';

export function isStudioPad(pad) {
  return pad === '/account' || pad.startsWith('/account/');
}

/** De koppen die nog ontbreken, op een antwoord dat er een hoort te hebben. */
export function ontbrekendeKoppen(pad, res) {
  if (!isStudioPad(pad) || !res) return [];
  const type = res.headers.get('content-type') || '';
  const isPagina = type.includes('text/html') || (res.status >= 300 && res.status < 400);
  if (!isPagina) return [];
  const koppen = studioHeaders();
  return Object.keys(koppen).filter((k) => !res.headers.has(k)).map((k) => [k, koppen[k]]);
}

/** De klap-vlag (studioKoppen.js) is voor één pagina: op die pagina wordt hij gewist. */
export function wisKlap(pad, request, res) {
  if (!isStudioPad(pad) || !res || !heeftKlap(request)) return false;
  return (res.headers.get('content-type') || '').includes('text/html') && res.status === 200;
}

export async function onRequest(context, next) {
  const res = await next();
  const erbij = ontbrekendeKoppen(context.url.pathname, res);
  const wis = wisKlap(context.url.pathname, context.request, res);
  if (!erbij.length && !wis) return res;
  const zet = (r) => {
    for (const [k, v] of erbij) r.headers.set(k, v);
    if (wis) r.headers.append('Set-Cookie', klapWis());
    return r;
  };
  try {
    return zet(res);
  } catch {
    /* Een antwoord met vastgezette koppen (Response.redirect, een fetch): kopiëren. */
    return zet(new Response(res.body, res));
  }
}
