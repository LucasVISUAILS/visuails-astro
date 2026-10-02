/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEGOED AUTOMATISCH VERREKENEN — 29 september 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Ik wil namelijk wel dat credits automatisch bij een bevestigde order
 * worden afgeschreven."* Tot vandaag was het tegoed (customer_credits, zie
 * migrations/0027 en src/data/tegoed.js) alleen een boekhouding: de klant zag
 * het in Studio en moest het "noemen bij zijn volgende bestelling", en jij
 * verrekende het met de hand. Dat is precies de keuze van 12 augustus
 * ("alleen een ledger, geen verrekening"), en die is hiermee omgedraaid.
 *
 * ── WAT HET TEGOED IS: GELD ─────────────────────────────────────────────────
 *
 * Een tegoed komt uit een annulering waarbij de klant koos het bedrag te laten
 * staan (of uit coulance, met de hand). Het is het bedrag dat hij betaalde, en
 * dus wordt het verrekend met het bedrag dat hij moet betalen — het totaal
 * INCLUSIEF btw. De factuur blijft volledig (netto, btw, totaal); daaronder
 * staat "Verrekend tegoed" en "Te betalen". De btw van de nieuwe bestelling
 * draag je gewoon af; het tegoed is een betaalmiddel en geen korting.
 *
 * Dat corrigeert regel 1 in de kop van src/data/tegoed.js ("tegoed is exclusief
 * btw"). Die regel liep in de praktijk al niet: een annulering met tegoed boekte
 * altijd het BRUTO bedrag (handleOrderCancel in src/lib/admin.js), en de
 * creditnota draait de btw van de oude factuur volledig terug. Wie dan het
 * tegoed netto zou verrekenen, laat de klant de btw twee keer betalen.
 *
 * ── WANNEER ─────────────────────────────────────────────────────────────────
 *
 * Alleen voor een klant die INGELOGD bestelt, met het e-mailadres van zijn
 * account. /api/order is niet geauthenticeerd: zonder die eis kan iedereen die
 * een e-mailadres kent het tegoed van een ander opmaken.
 *
 * Het bedrag wordt bij het bestellen vastgelegd op de bestelling
 * (`details_json.tegoed_cents`) en pas AFGEBOEKT als de bestelling betaald is
 * (de webhook, of meteen als het tegoed alles dekt). Een afgebroken betaling
 * kost dus geen tegoed. Hetzelfde tegoed kan niet twee keer tegelijk
 * gereserveerd worden: wat op een andere, nog onbetaalde en niet geannuleerde
 * bestelling staat, telt niet mee als beschikbaar.
 *
 * ── TERUG ───────────────────────────────────────────────────────────────────
 *
 * Wordt een bestelling met tegoed geannuleerd, dan komt het tegoeddeel terug
 * als TEGOED — nooit als geld (regel 2 in tegoed.js). Alleen wat via Mollie is
 * betaald, kan via Mollie terug.
 */

/* ── GEEN 24 UUR MEER — 1 oktober 2026 (ronde 8, B-K1) ─────────────────────
   Een onbetaalde bestelling hield haar tegoed maar een etmaal vast. Daarna kon
   een tweede bestelling hetzelfde tegoed gebruiken, terwijl de eerste via de
   herinneringslink nog steeds betaald kon worden tegen bruto min tegoed: de
   klant betaalde twee keer te weinig en het saldo ging onder nul. Nu houdt een
   bestelling haar tegoed vast zolang ze onbetaald en niet geannuleerd is. Een
   vergeten bestelling vervalt na ONBETAALD_VERVAL_DAGEN (cron), en dan komt het
   tegoed vanzelf weer vrij. */

/** Het tegoed dat op deze bestelling is vastgelegd, in centen (≥ 0). */
export function tegoedOpBestelling(order) {
  if (!order) return 0;
  let d = order.details;
  if (!d) {
    try { d = JSON.parse(order.details_json || '{}') || {}; } catch { d = {}; }
  }
  const c = Math.round(Number(d?.tegoed_cents) || 0);
  return c > 0 ? c : 0;
}

/** Het brutobedrag van een bestelling: netto plus btw. */
export function brutoVan(order) {
  return Math.max(0, Math.round((Number(order?.total_cents) || 0) + (Number(order?.vat_cents) || 0)));
}

/** Wat er via Mollie betaald moet worden: bruto min het vastgelegde tegoed. */
export function teBetalenCents(order) {
  return Math.max(0, brutoVan(order) - tegoedOpBestelling(order));
}

/** Het saldo in het grootboek (nooit negatief naar buiten). */
export async function tegoedSaldo(env, customerId) {
  if (!env?.DB || !customerId) return 0;
  const r = await env.DB.prepare(
    'SELECT COALESCE(SUM(delta_cents), 0) AS c FROM customer_credits WHERE customer_id = ?1'
  ).bind(customerId).first().catch(() => null);
  return Math.max(0, Math.round(Number(r?.c) || 0));
}

/**
 * Wat er nu te verrekenen valt: het saldo, min wat op een andere nog
 * onbetaalde, niet geannuleerde bestelling is vastgelegd.
 */
export async function tegoedBeschikbaar(env, customerId, { behalveOrderId = null } = {}) {
  const saldo = await tegoedSaldo(env, customerId);
  if (!(saldo > 0)) return 0;
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(CAST(json_extract(details_json, '$.tegoed_cents') AS INTEGER)), 0) AS c
       FROM orders
      WHERE customer_id = ?1
        AND COALESCE(payment_status, 'unpaid') = 'unpaid'
        AND COALESCE(status, '') <> 'cancelled'
        AND id <> COALESCE(?2, -1)
        AND json_valid(details_json)`
  ).bind(customerId, behalveOrderId).first().catch(() => null);
  return Math.max(0, saldo - Math.max(0, Math.round(Number(r?.c) || 0)));
}

/** Hoeveel van het tegoed op een bestelling van `brutoCents` gaat. */
export function teVerrekenen(beschikbaarCents, brutoCents) {
  return Math.max(0, Math.min(Math.round(Number(beschikbaarCents) || 0), Math.round(Number(brutoCents) || 0)));
}

/** Het tegoed dat al voor deze bestelling is afgeboekt (≥ 0). */
export async function tegoedAfgeboekt(env, orderId) {
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(delta_cents), 0) AS c FROM customer_credits
      WHERE order_id = ?1 AND reason LIKE 'Verrekend met %'`
  ).bind(orderId).first().catch(() => null);
  return Math.max(0, -Math.round(Number(r?.c) || 0));
}

/** Het tegoed dat na een annulering al is teruggeboekt voor deze bestelling (≥ 0). */
export async function tegoedTeruggeboekt(env, orderId) {
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(delta_cents), 0) AS c FROM customer_credits
      WHERE order_id = ?1 AND reason LIKE 'Terug na annulering van %'`
  ).bind(orderId).first().catch(() => null);
  return Math.max(0, Math.round(Number(r?.c) || 0));
}

/**
 * Het vastgelegde tegoed afboeken, zodra de bestelling betaald is. Idempotent:
 * een tweede aflevering van dezelfde webhook boekt niets bij.
 *
 * Staat er inmiddels minder in het grootboek dan er vastgelegd was (een tweede
 * bestelling die ná een etmaal hetzelfde tegoed gebruikte), dan wordt het toch
 * afgeboekt — het saldo gaat dan onder nul en /admin laat dat rood zien. De
 * klant heeft op deze bestelling minder betaald, dus het geld staat wel open.
 */
export async function boekTegoedAf(env, order) {
  const bedrag = tegoedOpBestelling(order);
  if (!(bedrag > 0) || !order?.customer_id || !order?.id) return 0;
  const al = await tegoedAfgeboekt(env, order.id);
  if (al >= bedrag) return 0;
  const rest = bedrag - al;
  await env.DB.prepare(
    `INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(order.customer_id, -rest, `Verrekend met ${order.ref || `bestelling ${order.id}`}`, order.id).run();
  return rest;
}

/**
 * Het afgeboekte tegoed terugboeken na een annulering. Idempotent. Geeft het
 * teruggeboekte bedrag.
 */
export async function boekTegoedTerug(env, order) {
  if (!order?.customer_id || !order?.id) return 0;
  const af = await tegoedAfgeboekt(env, order.id);
  const al = await tegoedTeruggeboekt(env, order.id);
  const rest = af - al;
  if (!(rest > 0)) return 0;
  await env.DB.prepare(
    `INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id)
     VALUES (?1, ?2, ?3, ?4)`
  ).bind(order.customer_id, rest, `Terug na annulering van ${order.ref || `bestelling ${order.id}`}`, order.id).run();
  return rest;
}
