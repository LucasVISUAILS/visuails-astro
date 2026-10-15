/**
 * ── ABONNEES IN /ADMIN — 15 oktober 2026 (afvinklijst 31, v31-abonnees = a) ──
 *
 * Lucas had geen overzicht van zijn abonnees. Per klant stond er geen lijst met
 * termijnen (alleen het creditboek), en een terugboeking of een abonnement dat
 * op een mislukte incasso stilstond, zag hij alleen in de nachtmail. Hier staat
 * wat drie plekken in /admin delen:
 *
 *   aboStand()          het woord voor de stand, hetzelfde op de klantpagina,
 *                       de pagina Abonnees en in Nu doen;
 *   aboSignalen()       wat er bij een abonnement aandacht vraagt;
 *   abonneesOverzicht() de rijen voor /admin/abonnees;
 *   termijnenVanKlant() de betalingen van de termijnen van één klant, met de
 *                       factuur erbij (de bijkopen staan al in hun eigen tabel).
 *
 * Alleen lezen. Wat er met een abonnement gebeurt, staat in subscription.js,
 * subscribe.js en de webhook.
 */
import { termijnMaand, termijnEinde } from './subscription.js';
import { subMaandCents, subMaandBruto } from './slots.js';
import { creditSaldo } from './creditboek.js';
import { planName } from '../data/planNames.js';
import { datum as mailDatum } from './mailTemplate.js';

const dag = (nu) => (nu instanceof Date ? nu : new Date(nu)).toISOString().slice(0, 10);

export const TERMIJN_WOORD = Object.freeze({ monthly: 'per maand', yearly: 'jaarverbintenis', prepaid: 'vooruitbetaald jaar' });

/** Loopt, maar er is bij Mollie geen abonnement dat afschrijft. */
export function zonderIncasso(sub) {
  return Boolean(sub && sub.status === 'active' && sub.term !== 'prepaid' && sub.mollie_customer_id && !sub.mollie_subscription_id);
}

/**
 * De stand in een paar woorden, met een sleutel voor de kleur van statPil()
 * (src/data/status.js): 'active' nacht, 'past_due' amber (er moet iets
 * gebeuren), 'paused' en 'open' een lijn, 'canceled' grijs.
 */
export function aboStand(sub, nu = new Date()) {
  if (!sub) return { key: 'canceled', woord: '' };
  const pauzeDag = sub.status === 'paused' && sub.paused_at ? String(sub.paused_at).slice(0, 10) : '';
  if (sub.status === 'paused' && sub.pause_reason === 'chargeback') return { key: 'past_due', woord: 'stil: termijn teruggeboekt' };
  if (sub.status === 'paused' && sub.pause_reason === 'payment_failed') return { key: 'past_due', woord: 'stil: incasso mislukt' };
  if (sub.status === 'paused' && sub.pause_reason === 'refunded') return { key: 'paused', woord: 'stil: termijn terugbetaald' };
  if (sub.status === 'paused' && pauzeDag > dag(nu)) return { key: 'active', woord: `pauze vanaf ${mailDatum(pauzeDag, 'nl')}` };
  if (zonderIncasso(sub)) return { key: 'past_due', woord: 'loopt, maar zonder incasso' };
  return ({
    active: { key: 'active', woord: 'loopt' },
    pending: { key: 'open', woord: 'wacht op de eerste betaling' },
    paused: { key: 'paused', woord: 'gepauzeerd' },
    cancelled: { key: 'canceled', woord: 'opgezegd' },
    canceled: { key: 'canceled', woord: 'opgezegd' },
    ended: { key: 'canceled', woord: 'afgelopen' },
  })[sub.status] || { key: 'open', woord: String(sub.status || '') };
}

/**
 * Wat er aandacht vraagt. `bevroren` is het aantal bevroren credits van de klant
 * (creditSaldo().bevroren). Elk signaal: { soort, tekst, ernst } met ernst 2
 * (geld komt niet binnen), 1 (kijk ernaar) of 0 (ter info).
 */
export function aboSignalen(sub, { bevroren = 0, nu = new Date() } = {}) {
  if (!sub) return [];
  const uit = [];
  if (sub.status === 'paused' && sub.pause_reason === 'chargeback') uit.push({ soort: 'terugboeking', tekst: 'Terugboeking: de incasso is gestopt', ernst: 2 });
  if (sub.status === 'paused' && sub.pause_reason === 'payment_failed') uit.push({ soort: 'mislukt', tekst: 'De incasso is mislukt', ernst: 2 });
  if (zonderIncasso(sub)) uit.push({ soort: 'geen-incasso', tekst: 'Geen incasso bij Mollie: er wordt niet afgeschreven', ernst: 2 });
  if (sub.status === 'pending' && String(sub.created_at || '').slice(0, 10) < dag(new Date((nu instanceof Date ? nu : new Date(nu)).getTime() - 864e5))) {
    uit.push({ soort: 'onbetaald', tekst: 'Eerste betaling niet afgerond', ernst: 0 });
  }
  if (bevroren > 0) uit.push({ soort: 'bevroren', tekst: `${bevroren} credits bevroren`, ernst: 1 });
  if (sub.overstap_plan) uit.push({ soort: 'overstap', tekst: `Overstap naar ${planName(sub.overstap_plan, 'nl')} klaar`, ernst: 0 });
  return uit;
}

/** De volgende afschrijving (YYYY-MM-DD) van een lopend abonnement, of ''. */
export function volgendeAfschrijving(sub, nu = new Date()) {
  if (!sub || sub.status !== 'active' || sub.term === 'prepaid') return '';
  const op = termijnEinde(sub, termijnMaand(sub, nu));
  return /^\d{4}-\d{2}-\d{2}$/.test(op) ? op : '';
}

const VOLGORDE = { active: 0, paused: 1, pending: 2, cancelled: 3, canceled: 3, ended: 4 };

/**
 * Alle abonnementen, met de klant, de stand, de volgende termijn, het saldo en
 * de signalen. Gesorteerd: wat geld kost eerst, dan lopend, op pauze, wachtend,
 * opgezegd. Het saldo komt uit creditSaldo(), één keer per klant.
 */
export async function abonneesOverzicht(env, { nu = new Date(), limiet = 500 } = {}) {
  const { results = [] } = await env.DB.prepare(
    `SELECT s.*, c.brand AS c_brand, c.name AS c_name, c.email AS c_email
       FROM subscriptions s JOIN customers c ON c.id = s.customer_id
      ORDER BY s.id DESC LIMIT ?1`
  ).bind(Number(limiet) || 500).all();
  const saldi = new Map();
  for (const s of results) {
    if (saldi.has(s.customer_id)) continue;
    saldi.set(s.customer_id, await creditSaldo(env, { customerId: s.customer_id }).catch(() => null));
  }
  const rijen = results.map((s) => {
    const saldo = saldi.get(s.customer_id);
    const signalen = aboSignalen(s, { bevroren: Number(saldo?.bevroren) || 0, nu });
    const volgende = volgendeAfschrijving(s, nu);
    const overstap = s.overstap_plan && Number(s.overstap_cents) > 0;
    return {
      id: s.id, ref: s.ref, klantId: s.customer_id,
      klant: s.c_brand || s.c_name || s.c_email || '', email: s.c_email || '',
      plan: planName(s.plan, 'nl'), termijn: TERMIJN_WOORD[s.term] || s.term || '',
      stand: aboStand(s, nu), status: s.status,
      volgende,
      /* Het bedrag van de volgende afschrijving, incl. btw: bij een klaarstaande
         overstap al het nieuwe (Mollie heeft dat sinds de overstap). */
      volgendeBruto: volgende ? (overstap ? subMaandBruto({ ...s, plan: s.overstap_plan, amount_cents: s.overstap_cents, slots_json: s.overstap_slots_json }) : subMaandBruto(s)) : 0,
      maandNetto: s.status === 'active' && s.term !== 'prepaid' ? subMaandCents(s) : 0,
      saldo: Math.max(0, Math.floor(Number(saldo?.saldo) || 0)),
      signalen,
      ernst: signalen.reduce((m, g) => Math.max(m, g.ernst), -1),
    };
  });
  rijen.sort((a, b) => (b.ernst >= 2) - (a.ernst >= 2)
    || (VOLGORDE[a.status] ?? 5) - (VOLGORDE[b.status] ?? 5)
    || String(a.klant).localeCompare(String(b.klant), 'nl'));
  const telling = {
    lopend: rijen.filter((r) => r.status === 'active').length,
    pauze: rijen.filter((r) => r.status === 'paused').length,
    wacht: rijen.filter((r) => r.status === 'pending').length,
    opgezegd: rijen.filter((r) => ['cancelled', 'canceled', 'ended'].includes(r.status)).length,
    aandacht: rijen.filter((r) => r.ernst >= 2).length,
    /* Wat er per maand binnenkomt, excl. btw: alleen lopende maandincasso's. */
    maandNetto: rijen.reduce((n, r) => n + r.maandNetto, 0),
  };
  return { rijen, telling };
}

/**
 * De termijnen van één klant: elke betaling van een abonnement (de eerste maand
 * en de incasso's), nieuwste eerst, met de factuur. Bijgekochte credits staan in
 * credit_aankopen en hebben hun eigen tabel op de klantpagina.
 *
 * Teruggeboekt: Mollie laat de status op 'paid' staan en zet amountChargedBack;
 * de webhook schrijft dat in het logboek ('plan.chargeback', met het betaal-id
 * in de regel), en 'plan.chargeback-terug' als Mollie het terugdraait.
 */
export async function termijnenVanKlant(db, customerId, { limiet = 24 } = {}) {
  let rijen = [];
  try {
    ({ results: rijen = [] } = await db.prepare(
      `SELECT sp.id, sp.external_id, sp.status, sp.amount_cents, sp.refunded_cents, sp.month, sp.created_at,
              s.ref AS sub_ref, si.id AS factuur_id, si.number AS factuur
         FROM subscription_payments sp
         JOIN subscriptions s ON s.id = sp.subscription_id
         LEFT JOIN subscription_invoices si ON si.subscription_payment_id = sp.id
        WHERE s.customer_id = ?1
          AND NOT EXISTS (SELECT 1 FROM credit_aankopen a WHERE a.mollie_payment_id = sp.external_id)
        ORDER BY sp.created_at DESC, sp.id DESC LIMIT ?2`
    ).bind(customerId, Number(limiet) || 24).all());
  } catch {
    return [];
  }
  const terug = new Map();
  try {
    const { results = [] } = await db.prepare(
      `SELECT action, detail FROM admin_log
        WHERE customer_id = ?1 AND action IN ('plan.chargeback', 'plan.chargeback-terug') ORDER BY id`
    ).bind(customerId).all();
    for (const r of results) {
      const m = /\btr_[A-Za-z0-9]+/.exec(String(r.detail || ''));
      if (m) terug.set(m[0], r.action);
    }
  } catch { /* zonder logboek: dan zonder die stand */ }
  return rijen.map((r) => ({
    id: r.id, paymentId: r.external_id, ref: r.sub_ref, maand: r.month || '', datum: String(r.created_at || '').slice(0, 10),
    bedrag: Number(r.amount_cents) || 0,
    stand: termijnStand(r, terug.get(r.external_id) || ''),
    factuurId: r.factuur_id || null, factuur: r.factuur || '',
  }));
}

/** { key, tekst } voor één betaling; key voor de kleur van statPil. */
export function termijnStand(r, logActie = '') {
  const bedrag = Number(r.amount_cents) || 0;
  const terug = Number(r.refunded_cents) || 0;
  if (['failed'].includes(r.status)) return { key: 'failed', tekst: 'mislukt' };
  if (['expired'].includes(r.status)) return { key: 'canceled', tekst: 'verlopen' };
  if (['canceled', 'cancelled'].includes(r.status)) return { key: 'canceled', tekst: 'afgebroken' };
  if (['open', 'pending', 'authorized'].includes(r.status)) return { key: 'open', tekst: 'open' };
  if (terug > 0 && terug >= bedrag) return { key: 'refunded', tekst: 'terugbetaald' };
  if (terug > 0) return { key: 'refunded', tekst: `deels terugbetaald (€ ${(terug / 100).toFixed(2).replace('.', ',')})` };
  if (logActie === 'plan.chargeback') return { key: 'charged_back', tekst: 'teruggeboekt' };
  if (logActie === 'plan.chargeback-terug') return { key: 'paid', tekst: 'betaald (terugboeking teruggedraaid)' };
  if (['paid', 'refunded'].includes(r.status)) return { key: 'paid', tekst: 'betaald' };
  return { key: 'open', tekst: String(r.status || '') };
}
