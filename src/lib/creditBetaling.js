/*
 * Een bestelling die met abonnementscredits betaald wordt — 8 oktober 2026
 * (ronde B, §28.2).
 *
 * Dezelfde rol als tegoedBetaling.js voor een bestelling die helemaal met
 * tegoed betaald wordt: geen Mollie, dus geen webhook, en wat de webhook bij
 * een betaling doet, gebeurt hier. Met één verschil: er komt GEEN factuur. De
 * termijnfactuur van het abonnement is de factuur (§28.2.3); een tweede
 * document dat op een factuur lijkt, verwart de boekhouder van de klant (2.02).
 *
 * Het afboeken zelf (atomair, oudste eerst) staat in creditboek.js.
 */
import { betaalBestellingMetCredits } from './creditboek.js';

/**
 * Betaal bestelling `orderId` met `kosten` credits van klant `customerId`.
 *
 * Geeft wat betaalBestellingMetCredits() geeft: { ok: true, partijen, saldoNa }
 * of { ok: false, reden, saldo }. Bij ok staat de bestelling op 'credits' met
 * paid_at, en staan er een tijdlijnregel (in de taal van de bestelling) en een
 * logregel bij.
 */
export async function betaalMetCredits(env, { orderId, customerId, kosten, lang = 'nl', door = 'klant' } = {}) {
  const r = await betaalBestellingMetCredits(env, { orderId, customerId, aantal: kosten, door });
  if (!r.ok) return r;
  const nl = lang === 'nl';
  await env.DB.prepare('INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)')
    .bind(orderId, 'received',
      nl ? `Betaald met ${kosten} credits van je abonnement` : `Paid with ${kosten} subscription credits`, 'system')
    .run().catch(() => {});
  await env.DB.prepare(
    `INSERT INTO admin_log (admin_id, admin_email, action, order_id, customer_id, detail)
     VALUES (NULL, NULL, 'payment.credits', ?1, ?2, ?3)`
  ).bind(orderId, customerId, `${kosten} credits afgeboekt (oudste eerst), saldo daarna ${r.saldoNa}`)
    .run().catch(() => {});
  return r;
}
