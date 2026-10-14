/**
 * VISUAILS — een antwoord een minuut aan de rand van Cloudflare bewaren.
 *
 * ── WAAROM DIT BESTAND ER IS — 8 oktober 2026 ─────────────────────────────────
 *
 * /api/capacity en /api/plan-plek zijn openbaar, hebben geen snelheidsgrens en
 * lezen bij elke aanvraag de agenda of de bezetting uit D1: dezelfde database
 * waar de bestellingen en /admin op draaien. Hun `cache-control: public,
 * max-age=60` leek een rem, maar is het niet: wat een Worker zelf maakt, bewaart
 * Cloudflare niet vanzelf, en een willekeurige extra parameter (?x=123) zou elke
 * gedeelde cache toch omzeilen. Een lus van een paar regels kon de database dus
 * onbeperkt laten werken.
 *
 * Hier wordt het antwoord echt bewaard, in de Cache API (`caches.default`), onder
 * een sleutel die ALLEEN uit de gecontroleerde waarden bestaat. Een extra
 * parameter maakt dan geen nieuwe sleutel meer, en dezelfde vraag binnen een
 * minuut raakt D1 niet.
 *
 * Buiten een Worker (de tests in node) bestaat `caches.default` niet; dan wordt
 * het antwoord gewoon gemaakt, precies zoals voor vandaag.
 */

/**
 * @param {object} context   Pages-achtige context (request, waitUntil)
 * @param {string} naam      vaste naam van het eindpunt, bijv. 'capacity'
 * @param {object} delen     de GECONTROLEERDE waarden die het antwoord bepalen
 * @param {() => Promise<Response>} maak  maakt het antwoord als het er niet is
 */
export async function viaRandCache(context, naam, delen, maak) {
  const cache = globalThis.caches?.default;
  if (!cache || !context?.request) return maak();

  let sleutel;
  try {
    const origin = new URL(context.request.url).origin;
    const zoek = new URLSearchParams(
      Object.entries(delen)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
        .sort(([a], [b]) => a.localeCompare(b))
    );
    sleutel = new Request(`${origin}/__randcache/${naam}?${zoek}`, { method: 'GET' });
  } catch {
    return maak();
  }

  try {
    const bewaard = await cache.match(sleutel);
    if (bewaard) return bewaard;
  } catch { /* de cache hapert: dan gewoon maken */ }

  const antwoord = await maak();
  /* Alleen een geslaagd antwoord bewaren: een 503 van een haperende database
     moet de volgende aanvraag niet een minuut lang blijven achtervolgen. */
  if (antwoord && antwoord.status === 200) {
    const kopie = antwoord.clone();
    const zet = cache.put(sleutel, kopie).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(zet);
    else await zet;
  }
  return antwoord;
}
