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

/* ── OOK OP BEDRIJFSNAAM MET POSTCODE, EN OP BTW-NUMMER — levering 118 (17 november 2026, proefronde B1-01) ──
   Na een betaalde proef nam de site een tweede aan voor precies hetzelfde bedrijf en adres, met een ander
   e-mailadres, telefoonnummer en KVK-nummer. Twee nieuwe vergelijkingen:
     · het btw-nummer: net als het KVK-nummer een nummer van het bedrijf zelf, dus een HARDE treffer (telt in
       `used`, het formulier weigert zoals bij hetzelfde e-mailadres);
     · de bedrijfsnaam (kleine letters, zonder rechtsvorm als "bv") samen met de postcode: een TWIJFELGEVAL.
       Lucas koos (lijst 127, B1-01 = b): aannemen, maar op de nakijklijst. Dat telt in `twijfel`, met het
       kenmerk van de eerdere proef in `twijfelRef`; functions/api/order.js zet het op de bestelling.
   `behalve`: een order-id dat niet mee mag tellen (de webhook toetst een bestelling die al bestaat). */
const RECHTSVORMEN = /\b(b\s*\.?\s*v|n\s*\.?\s*v|v\s*\.?\s*o\s*\.?\s*f|c\s*\.?\s*v|bvba|gmbh|ltd|limited|llc|inc|sarl|srl|holding)\b\.?/g;

/** Een bedrijfsnaam als vergelijkingssleutel: kleine letters, zonder accenten, rechtsvorm en leestekens. */
export function merkKey(raw) {
  const k = String(raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(RECHTSVORMEN, ' ').replace(/[^a-z0-9]/g, '');
  return k.length >= 2 ? k : '';
}

/** Een postcode als vergelijkingssleutel: hoofdletters en cijfers, of '' als hij te kort is. */
export function postcodeKey(raw) {
  const k = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return k.length >= 4 ? k : '';
}

/** Een btw-nummer als vergelijkingssleutel, met of zonder landcode ervoor; '' als het te kort is. */
export function btwKey(raw) {
  const k = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^[A-Z]{2}(?=\d)/, '');
  return k.length >= 8 ? k : '';
}

/**
 * @returns {Promise<{ checked: boolean, used: number, twijfel: number, twijfelRef: string }>} checked=false als
 *   de database niet te lezen was (dan gaat alles door: openvallen).
 */
export async function proefGebruikt(env, { email = '', phone = '', reg = '', brand = '', postcode = '', vat = '', behalve = null } = {}) {
  if (!env?.DB) return { checked: false, used: 0, twijfel: 0, twijfelRef: '' };
  try {
    const wantMail = normalizeEmail(email);
    const wantPhone = normalizePhone(phone);
    const wantReg = regKey(reg);
    const wantVat = btwKey(vat);
    const wantMerk = merkKey(brand);
    const wantPost = postcodeKey(postcode);
    if (!wantMail && !wantPhone && !wantReg && !wantVat && !(wantMerk && wantPost)) {
      return { checked: true, used: 0, twijfel: 0, twijfelRef: '' };
    }
    /* De kolommen brand, postal_code en vat_number bestaan sinds migratie 0016; zonder: de oude vraag. */
    let results;
    try {
      ({ results } = await env.DB
        .prepare(`SELECT id, ref, email, phone, details_json, brand, postal_code, vat_number FROM orders
                   WHERE service = 'test-sample'
                     AND payment_status = 'paid'
                   LIMIT 20000`)
        .all());
    } catch (err) {
      if (!/no such column/i.test(String(err?.message || err))) throw err;
      ({ results } = await env.DB
        .prepare(`SELECT id, ref, email, phone, details_json FROM orders
                   WHERE service = 'test-sample'
                     AND payment_status = 'paid'
                   LIMIT 20000`)
        .all());
    }
    const rijen = (results || []).filter((r) => behalve === null || Number(r.id) !== Number(behalve));
    const hard = (r) => {
      if (wantMail && normalizeEmail(r.email) === wantMail) return true;
      let det = {};
      try { det = JSON.parse(r.details_json || '{}') || {}; } catch { /* onleesbaar: telt niet */ }
      if (wantReg) {
        const eerder = regKey(det.business_reg);
        if (eerder && eerder === wantReg) return true;
      }
      if (wantVat) {
        const eerder = btwKey(r.vat_number || det.vat || '');
        if (eerder && eerder === wantVat) return true;
      }
      /* Alleen als BEIDE nummers bruikbaar zijn: twee lege waarden zijn gelijk. */
      const theirs = normalizePhone(r.phone);
      return !!wantPhone && theirs === wantPhone;
    };
    const used = rijen.filter(hard).length;
    const twijfelRijen = (wantMerk && wantPost)
      ? rijen.filter((r) => !hard(r) && merkKey(r.brand) === wantMerk && postcodeKey(r.postal_code) === wantPost)
      : [];
    return { checked: true, used, twijfel: twijfelRijen.length, twijfelRef: twijfelRijen[0]?.ref || '' };
  } catch {
    return { checked: false, used: 0, twijfel: 0, twijfelRef: '' };
  }
}
