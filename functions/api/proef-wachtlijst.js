// VISUAILS — POST /api/proef-wachtlijst: "Mail me als hij weer open is".
// 8 oktober 2026 (G2). De stand zelf leest /test-sample bij /api/proef-stand
// (functions/api/proef-stand.js). Zie src/lib/proefStand.js voor de keuzes.
//
// DE WACHTLIJST volgt functions/api/studiobrief.js: snelheidsgrens per ip, een
// honingpot, de onzichtbare botcheck (src/lib/turnstile.js: zonder sleutels uit,
// zonder token strenger begrensd, alleen een uitdrukkelijk ongeldig token
// geweigerd), en een gewone 303 terug naar de pagina. Geen mail bij aanmelden:
// de enige mail is die van "weer open". Geen pushbericht, geen nieuwsbrief.
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { controleerBotcheck, botcheckBesluit, TOKEN_VELD } from '../../src/lib/turnstile.js';
import { opWachtlijst, isEmail } from '../../src/lib/proefStand.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function redirect(location) { return new Response(null, { status: 303, headers: { Location: location } }); }

/** Terug naar /test-sample in de taal van het formulier, met de uitkomst erbij. */
export function terugNaarProef(lang, uitkomst) {
  return `${lang === 'nl' ? '/nl' : ''}/test-sample/?wachtlijst=${uitkomst}#even-dicht`;
}

/** POST /api/proef-wachtlijst */
export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  let form;
  try { form = await request.formData(); } catch { form = new FormData(); }
  const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };
  const lang = get('lang') === 'en' ? 'en' : 'nl';
  const wantsJson = get('mode') === 'json';
  const ok = () => (wantsJson ? json({ ok: true }) : redirect(terugNaarProef(lang, 'ok')));
  const fout = (code, status = 400) => (wantsJson ? json({ ok: false, error: code }, status) : redirect(terugNaarProef(lang, code)));

  const rate = await checkRate(env, { ip: clientIp(request), action: 'proef-wachtlijst', limit: 5, windowSeconds: 600 });
  if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
  if (!rate.allowed) return fout('rate', 429);

  /* De honingpot: een mens ziet dit veld niet. Doen alsof het lukte. */
  if (get('website_hp')) return ok();

  const email = get('email').toLowerCase();
  if (!isEmail(email)) return fout('email');

  const botcheck = (await controleerBotcheck(env, { token: get(TOKEN_VELD), ip: clientIp(request) })).stand;
  const besluit = botcheckBesluit(botcheck);
  if (besluit === 'weiger') return fout('botcheck', 403);
  if (besluit === 'streng') {
    const streng = await checkRate(env, { ip: clientIp(request), action: 'proef-wachtlijst-zonder-botcheck', limit: 2, windowSeconds: 600 });
    if (!streng.allowed) return fout('rate', 429);
  }

  try {
    if (!env?.DB) return fout('fout', 503);
    await opWachtlijst(env, email, lang);
  } catch (e) {
    console.error('[proef-wachtlijst]', e && e.message ? e.message : e);
    return fout('fout', 503);
  }
  return ok();
}

export function onRequestGet() {
  return redirect('/test-sample/');
}
