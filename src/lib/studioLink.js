/* ── EEN LINK NAAR STUDIO, IN DE TAAL VAN DE MAIL — 9 november 2026 (ronde 91, E05) ──
 *
 * Studio leeft op /account zonder taalprefix: de taal komt uit ?lang=, de cookie
 * vis_lang, de Referer of de browser (negotiate() in account.js). Een mail heeft
 * geen Referer, dus wie op een nieuw apparaat of in een Engelse browser op de link
 * in een Nederlandse mail klikte, kreeg Studio (of het inlogscherm) in het Engels.
 *
 * De mails schreven het op drie manieren: `/nl/account/…` (een 301 naar /account/…
 * die de taal laat vallen: _redirects heeft één splat-regel en die draagt geen
 * query), `/account/…` zonder taal, en een enkele `?lang=en` alleen voor Engels.
 * Nu één vorm: rechtstreeks naar /account/…, met `lang=` van de mail erop. Eén
 * sprong, in de taal die de klant las; sectionState() zet hem in de cookie en haalt
 * hem uit de adresbalk.
 *
 * `pad` is wat er na /account komt ('', '/plan', '/orders?order=7#order-7').
 * Een `lang=` die er al staat, blijft staan.
 */

/** Absolute Studio-link met de taal van de mail: studioUrl(origin, '/plan', 'nl'). */
export function studioUrl(origin, pad = '', lang = 'nl') {
  const basis = String(origin || 'https://visuails.com').replace(/\/+$/, '');
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(String(pad || '')) || ['', '', '', ''];
  const weg = m[1] ? (m[1].startsWith('/') ? m[1] : `/${m[1]}`) : '';
  const zoek = new URLSearchParams((m[2] || '').slice(1));
  if (!zoek.has('lang')) zoek.set('lang', lang === 'en' ? 'en' : 'nl');
  return `${basis}/account${weg}?${zoek.toString()}${m[3] || ''}`;
}
