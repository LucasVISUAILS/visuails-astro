/*
 * ── VOORRANG LOOPT VANAF BETAALD ÉN FOTO'S COMPLEET — levering 118 (17 november 2026, proefronde L-16) ──
 *
 * Kees koos voorrang en "foto's later". Het formulier beloofde "uiterlijk woensdag 17:00", en de termijn liep vanaf
 * het betalen, ook zonder één foto. Lucas koos advies a: de termijn telt vanaf het LATERE moment, betaald of foto's
 * compleet. Dat staat nu in het formulier (BC) en hier aan de serverkant.
 *
 * WAAR HET MOMENT STAAT. In details_json van de bestelling, niet in een nieuwe kolom: elke lezer van de voorrangsdag
 * (agenda.js, nudoen.js, admin.js, Studio) leest details_json al voor heeftVoorrang(), dus er hoeft geen query en geen
 * migratie te veranderen.
 *   · `fotos_wacht: 1`           gezet door /api/order als een voorrangsbestelling binnenkomt zonder alle verplichte
 *                                foto's (ontbrekendeFotos() in ontbreekt.js);
 *   · `fotos_compleet_at: '…'`   gezet (UTC, zoals paid_at) zodra de laatste ontbrekende foto binnen is, via Studio of
 *                                de bestelpagina (markeerFotosCompleet() hieronder).
 * Een bestelling zonder `fotos_wacht` (alle foto's bij het bestellen, of van vóór levering 118) rekent zoals altijd
 * vanaf paid_at.
 */

function details(o) {
  if (!o || typeof o !== 'object') return {};
  const raw = 'details_json' in o ? o.details_json : o;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

/**
 * Het moment waarop de voorrangstermijn begint: het latere van paid_at en foto's compleet.
 * null als er nog niet betaald is, of als er nog foto's ontbreken (de termijn loopt dan nog niet).
 * @param {{ paid_at?: string, details_json?: string|object }} o
 */
export function voorrangVanaf(o) {
  const betaald = o && o.paid_at ? String(o.paid_at) : '';
  if (!betaald) return null;
  const d = details(o);
  const compleet = d.fotos_compleet_at ? String(d.fotos_compleet_at) : '';
  if (compleet) return compleet.replace('T', ' ') > betaald.replace('T', ' ') ? compleet : betaald;
  if (Number(d.fotos_wacht) === 1) return null;
  return betaald;
}

/** Wachten er bij deze voorrangsbestelling nog foto's (gezet bij het bestellen, nog niet compleet)? */
export function wachtOpFotos(o) {
  const d = details(o);
  return Number(d.fotos_wacht) === 1 && !d.fotos_compleet_at;
}

/**
 * Na een upload in Studio of op de bestelpagina: ontbreekt er niets meer, dan het moment vastleggen. Alleen bij een
 * bestelling die op foto's wachtte, en maar één keer. `nogOpen` is de uitkomst van ontbrekendVoorOrder():
 * [] = compleet; null = onbekend (een upload zonder vak): dan kijkt een mens, en telt het ook als compleet, want de
 * klant heeft gestuurd wat hij had.
 */
export async function markeerFotosCompleet(env, orderId, nogOpen) {
  if (!env?.DB || !orderId) return false;
  if (Array.isArray(nogOpen) && nogOpen.length) return false;
  try {
    const r = await env.DB.prepare(
      `UPDATE orders SET details_json = json_set(details_json, '$.fotos_compleet_at', datetime('now'))
        WHERE id = ?1 AND json_valid(details_json)
          AND json_extract(details_json, '$.fotos_wacht') = 1
          AND json_extract(details_json, '$.fotos_compleet_at') IS NULL`
    ).bind(orderId).run();
    return Number(r?.meta?.changes) > 0;
  } catch (e) {
    console.error('[fotosCompleet] moment niet vastgelegd voor', orderId, '—', e?.message || e);
    return false;
  }
}
