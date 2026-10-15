/* VISUAILS — had dit bedrijf al een betaalde €1-proef? (15 oktober 2026)
 *
 * De vergelijking stond in functions/api/order.js, bij het versturen van de
 * proef (zie de lange noot daar: e-mail genormaliseerd, telefoon, en een echt
 * registratienummer; alleen BETAALDE proeven tellen; faalt open). Doorloop 27
 * (B41): de weigering kwam pas na alle stappen en de foto's. Nu vraagt het
 * formulier het al bij het verlaten van stap 3 (functions/api/proef-check.js),
 * en beide plekken gebruiken deze ene functie, zodat ze nooit verschillen.
 *
 * Dit is de zachte laag: wat de bezoeker invult. De harde controle (de
 * bankrekening) blijft in de webhook.
 */
import { normalizeEmail, normalizePhone } from './payer.js';

/** Een registratienummer als vergelijkingssleutel, of '' als het te kort is (zie order.js). */
export function regKey(raw) {
  const k = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^(KVK|KVKNR|NR)/, '');
  return k.length >= 6 ? k : '';
}

/**
 * @returns {Promise<{ checked: boolean, used: number }>} checked=false als de
 *   database niet te lezen was (dan gaat alles door: openvallen).
 */
export async function proefGebruikt(env, { email = '', phone = '', reg = '' } = {}) {
  if (!env?.DB) return { checked: false, used: 0 };
  try {
    const wantMail = normalizeEmail(email);
    const wantPhone = normalizePhone(phone);
    const wantReg = regKey(reg);
    if (!wantMail && !wantPhone && !wantReg) return { checked: true, used: 0 };
    const { results } = await env.DB
      .prepare(`SELECT email, phone, details_json FROM orders
                 WHERE service = 'test-sample'
                   AND payment_status = 'paid'
                 LIMIT 20000`)
      .all();
    const used = (results || []).filter((r) => {
      if (wantMail && normalizeEmail(r.email) === wantMail) return true;
      if (wantReg) {
        let eerder = '';
        try { eerder = regKey(JSON.parse(r.details_json || '{}').business_reg); } catch { /* onleesbaar: telt niet */ }
        if (eerder && eerder === wantReg) return true;
      }
      /* Alleen als BEIDE nummers bruikbaar zijn: twee lege waarden zijn gelijk. */
      const theirs = normalizePhone(r.phone);
      return !!wantPhone && theirs === wantPhone;
    }).length;
    return { checked: true, used };
  } catch {
    return { checked: false, used: 0 };
  }
}
