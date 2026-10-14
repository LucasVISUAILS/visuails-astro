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
import { studioHeaders } from './lib/studioKoppen.js';

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

export async function onRequest(context, next) {
  const res = await next();
  const erbij = ontbrekendeKoppen(context.url.pathname, res);
  if (!erbij.length) return res;
  try {
    for (const [k, v] of erbij) res.headers.set(k, v);
    return res;
  } catch {
    /* Een antwoord met vastgezette koppen (Response.redirect, een fetch): kopiëren. */
    const kopie = new Response(res.body, res);
    for (const [k, v] of erbij) kopie.headers.set(k, v);
    return kopie;
  }
}
