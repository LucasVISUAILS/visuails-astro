// VISUAILS — de Nederlandse 404 als het gebouwde bestand, mét zijn koppen.
// 9 november 2026 (ronde 91, A16).
//
// src/pages/nl/[...pad].astro vangt elk onbekend adres onder /nl/ en draait in de
// Worker. Wat de Worker zelf rendert krijgt public/_headers niet: /nl/bestaat-niet
// kwam zonder CSP, zonder frame-ancestors/X-Frame-Options, zonder nosniff, HSTS,
// Referrer-Policy en Permissions-Policy — de enige openbare HTML-pagina zonder
// één beveiligingskop. Een CSP achteraf in de middleware zetten kan niet: de
// hashes van de inline scripts staan alleen in dist/_headers, en de door de
// Worker gerenderde versie houdt het commentaar in die scripts (dus andere hashes).
//
// Dus doet deze route wat Astro voor de Engelse 404 al doet (createErrorPageFetch
// in @astrojs/cloudflare): het gebouwde bestand ophalen via de ASSETS-binding.
// Dat is dist/nl/404.html, dezelfde bytes als op /nl/404, en de assets-laag zet de
// koppen uit _headers erop (lokaal nagekeken: CSP, X-Frame-Options, nosniff, HSTS).
// Alleen de status wordt 404. Lukt het niet (geen binding, een fout, iets anders
// dan HTML), dan null: de pagina rendert zichzelf zoals voorheen.

/** @returns {Promise<Response|null>} */
export async function statischeNl404(env, url) {
  try {
    if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') return null;
    const r = await env.ASSETS.fetch(new Request(new URL('/nl/404', url).href));
    if (!r || r.status !== 200 || !String(r.headers.get('content-type') || '').includes('text/html')) return null;
    return new Response(r.body, { status: 404, headers: new Headers(r.headers) });
  } catch {
    return null;
  }
}
