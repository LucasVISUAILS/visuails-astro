/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXTRA CREDITS BIJKOPEN — 12 oktober 2026 (afvinklijst 4: ab-v3 = c, ab-v4 = b)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas koos: de prijs per credit van het eigen plan, 5% korting bij 25 en 10%
 * bij 50 (ab-v3 = c); op de abonnementspagina in Studio én in stap 5 van het
 * bestelformulier, hoogstens 100 credits per kalendermaand (ab-v4 = b). De
 * prijzen en grenzen staan in src/data/pricing.js (BIJKOOP_*, bijkoopPrijs(),
 * met de bouwcontrole dat bijkopen nooit goedkoper is dan een groter
 * abonnement); dit bestand doet de rest:
 *
 *   · wat een abonnee kan bijkopen (pakkettenVoor, bijkoopRuimte);
 *   · de hint "Overstappen naar … is voordeliger" (overstapHint);
 *   · de aankoop: een rij in credit_aankopen (migratie 0067) en een eigen losse
 *     Mollie-betaling, iDEAL of kaart, nooit een incasso (maakAankoop);
 *   · wat Mollie meldt (verwerkBijkoop), vanuit de webhook én de
 *     terugkeerpagina: bij "betaald" de betaling in subscription_payments, de
 *     credits als partij 'bijgekocht' in het creditboek, de factuur ("Extra
 *     credits · 25 · Pro") en de mail; bij mislukt, afgebroken of verlopen niets
 *     behalve de status. Een terugbetaling laat het ongebruikte deel vervallen,
 *     een terugboeking bevriest het (8.11), net als bij een termijn.
 *
 * DE BTW volgt het abonnement: dezelfde behandeling en hetzelfde tarief als de
 * maandtermijn (subBrutoCents() in slots.js), en de factuur komt uit dezelfde
 * route (issueSubscriptionInvoice() in invoice.js). Verlegd voor EU-zakelijk
 * blijft dus verlegd, buiten de EU blijft 0%.
 *
 * BIJGEKOCHTE CREDITS gaan eerst op, zijn CREDITS_GELDIG_MAANDEN geldig vanaf
 * binnenkomst, schuiven niet mee met een termijn en tellen niet mee voor het
 * spaarplafond; na opzeggen gelden ze tot hun eigen datum (creditboek.js).
 *
 * Alleen voor een lopend abonnement (status 'active', ook een jaar vooruit).
 * Geen capaciteitspoort: bijkopen gaat buiten ABO_CREDITS_PLAFOND om, de agenda
 * vangt de bestellingen op en het maximum per maand houdt de pieken klein.
 */
import {
  BIJKOOP_PAKKETTEN, BIJKOOP_KORTING_PCT, BIJKOOP_MAX_PER_MAAND, OVERSTAP_HINT_MARGE,
  bijkoopPrijs, planMaandBedrag, PLAN_AMOUNT, PLAN_CREDITS,
} from '../data/pricing.js';
import { PLAN_IDS } from '../data/plans.js';
import { planName } from '../data/planNames.js';
import { VAT_TREATMENT } from '../data/vat.js';
import { creditsVoor, subBrutoCents } from './slots.js';
import { boekBijgekocht, vervalTermijn, bevriesTermijn, ontdooiTermijn, dagVan } from './creditboek.js';
import { dagErvoor } from './creditWeergave.js';
import { issueSubscriptionInvoice } from './invoice.js';
import { mailBijkoopFactuur } from './invoiceMail.js';
import { createBijkoopMolliePayment, mollieAmountToCents } from './mollie.js';

const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));
const maandVan = (nu) => dagVan(nu).slice(0, 7);
/* Een open betaling telt mee voor het maximum zolang Mollie hem nog kan
   afronden; daarna (een tabblad dat de klant sloot en Mollie nooit meldde) niet
   meer. Mollie laat een open betaling binnen dit venster verlopen. */
const OPEN_TELT_UUR = 3;
/* Dezelfde speling als bij een termijn (TERMIJN_SPELING_CENT in de webhook):
   twee cent dekt afronding en niets anders. */
const SPELING_CENT = 2;

/** De vorige kalendermaand als 'YYYY-MM'. */
function vorigeMaand(maand, n = 1) {
  const [j, m] = String(maand).split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

/** Loopt dit abonnement, zodat er bijgekocht mag worden? */
export function magBijkopen(sub) {
  return !!sub && sub.status === 'active';
}

/**
 * Het tarief van een abonnement volgens de prijslijst: { bedrag (euro per
 * maand, exclusief btw), credits, plan, naam } of null. Ook bij een jaar vooruit
 * het maandbedrag: dat is het tarief waarmee de bouwcontrole rekent.
 */
export function planTarief(sub, lang = 'nl') {
  const credits = creditsVoor(sub);
  const bedrag = planMaandBedrag(String(sub?.plan || ''), credits);
  if (!credits || !bedrag) return null;
  const naam = PLAN_AMOUNT[sub.plan] ? planName(sub.plan, lang) : `${planName('maat', lang)} ${credits}`;
  return { bedrag, credits, plan: String(sub.plan || ''), naam };
}

/** De pakketten voor dit abonnement: [{ credits, euros, kortingPct }] (excl. btw). */
export function pakkettenVoor(sub) {
  const t = planTarief(sub);
  if (!t) return [];
  return BIJKOOP_PAKKETTEN.map((x) => ({ credits: x, euros: bijkoopPrijs(t.bedrag, t.credits, x), kortingPct: BIJKOOP_KORTING_PCT[x] }));
}

/**
 * Hoeveel er deze kalendermaand nog bij kan: { gebruikt, ruimte }. Betaalde
 * aankopen tellen mee, en open betalingen van de laatste uren ook, zodat twee
 * tabbladen tegelijk niet boven het maximum uitkomen.
 */
export async function bijkoopRuimte(db, customerId, nu = new Date()) {
  const D = db && typeof db.prepare !== 'function' && db.DB ? db.DB : db;
  const grens = new Date(nu.getTime() - OPEN_TELT_UUR * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
  const r = await D.prepare(
    `SELECT COALESCE(SUM(pakket), 0) AS n FROM credit_aankopen
      WHERE customer_id = ?1 AND maand = ?2 AND (status = 'paid' OR (status = 'open' AND created_at >= ?3))`
  ).bind(customerId, maandVan(nu), grens).first().catch(() => null);
  const gebruikt = heel(r?.n);
  return { gebruikt, ruimte: Math.max(0, BIJKOOP_MAX_PER_MAAND - gebruikt), max: BIJKOOP_MAX_PER_MAAND };
}

/** Het eerstvolgende plan met meer credits dan dit abonnement, of null (Merk heeft er geen). */
export function volgendPlan(sub) {
  const c = creditsVoor(sub);
  return PLAN_IDS
    .filter((id) => PLAN_CREDITS[id] > c)
    .sort((a, b) => PLAN_CREDITS[a] - PLAN_CREDITS[b])[0] || null;
}

/**
 * De hint "Overstappen naar <plan> is voordeliger" (12 oktober 2026). Alleen
 * als het waar is, en op twee momenten:
 *   · 'pakket'        bij dit pakket: het volgende plan kost hoogstens
 *                     OVERSTAP_HINT_MARGE euro per maand meer dan plan + pakket,
 *                     en geeft minstens evenveel credits;
 *   · 'twee-maanden'  de klant kocht twee kalendermaanden op rij bij, en het
 *                     volgende plan kost hoogstens de marge meer dan wat hij
 *                     gemiddeld per maand betaalde, voor minstens zijn gemiddelde
 *                     aantal credits.
 * Geeft { naar, naam, bedrag, credits, reden } of null.
 */
export async function overstapHint(db, sub, { pakket = null, nu = new Date(), lang = 'nl' } = {}) {
  const t = planTarief(sub, lang);
  const naar = volgendPlan(sub);
  if (!t || !naar) return null;
  const uit = (reden) => ({ naar, naam: planName(naar, lang), bedrag: PLAN_AMOUNT[naar], credits: PLAN_CREDITS[naar], reden });
  if (pakket !== null) {
    const x = heel(pakket);
    const prijs = bijkoopPrijs(t.bedrag, t.credits, x);
    if (prijs !== null && PLAN_AMOUNT[naar] - (t.bedrag + prijs) <= OVERSTAP_HINT_MARGE && PLAN_CREDITS[naar] >= t.credits + x) {
      return uit('pakket');
    }
  }
  const D = db && typeof db.prepare !== 'function' && db.DB ? db.DB : db;
  if (!D || !sub?.customer_id) return null;
  const deze = maandVan(nu);
  const r = await D.prepare(
    `SELECT maand, SUM(pakket) AS credits, SUM(net_cents) AS netto FROM credit_aankopen
      WHERE customer_id = ?1 AND status = 'paid' AND maand >= ?2
      GROUP BY maand`
  ).bind(sub.customer_id, vorigeMaand(deze, 2)).all().catch(() => null);
  const per = new Map((r?.results || []).map((x) => [String(x.maand), { credits: heel(x.credits), netto: heel(x.netto) }]));
  for (const [a, b] of [[deze, vorigeMaand(deze, 1)], [vorigeMaand(deze, 1), vorigeMaand(deze, 2)]]) {
    if (!per.has(a) || !per.has(b)) continue;
    const gemCredits = (per.get(a).credits + per.get(b).credits) / 2;
    const gemEuro = (per.get(a).netto + per.get(b).netto) / 200;
    if (PLAN_AMOUNT[naar] <= t.bedrag + gemEuro + OVERSTAP_HINT_MARGE && PLAN_CREDITS[naar] >= t.credits + gemCredits) {
      return uit('twee-maanden');
    }
  }
  return null;
}

/**
 * Een aankoop beginnen: de rij en de Mollie-betaling. Geeft { ok: true, url,
 * id } (de betaalpagina van Mollie) of { ok: false, reden } met reden
 * 'geen-abonnement' | 'pakket' | 'te-veel' | 'tarief' | 'mollie'.
 *
 * `verder` is een pad in het bestelformulier (/start/… of /nl/start/…) waar de
 * klant na het betalen naar terug kan; alles anders valt weg.
 */
export async function maakAankoop(env, { customerId, sub, pakket, lang = 'nl', origin, verder = '', nu = new Date() } = {}) {
  const D = env.DB;
  if (!magBijkopen(sub)) return { ok: false, reden: 'geen-abonnement' };
  const x = heel(pakket);
  if (!BIJKOOP_PAKKETTEN.includes(x)) return { ok: false, reden: 'pakket' };
  const t = planTarief(sub, lang);
  const euros = t ? bijkoopPrijs(t.bedrag, t.credits, x) : null;
  if (!euros) return { ok: false, reden: 'tarief' };
  const ruimte = await bijkoopRuimte(D, customerId, nu);
  if (ruimte.ruimte < x) return { ok: false, reden: 'te-veel', ruimte: ruimte.ruimte };

  const netCents = euros * 100;
  const grossCents = subBrutoCents(sub, netCents);
  const vatCents = grossCents - netCents;
  const rij = await D.prepare(
    `INSERT INTO credit_aankopen (customer_id, subscription_id, pakket, net_cents, vat_cents, gross_cents, vat_treatment, plan_label, maand, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', ?10)
     RETURNING id`
  ).bind(customerId, sub.id, x, netCents, vatCents, grossCents, sub.vat_treatment || VAT_TREATMENT.standard,
    planTarief(sub, 'nl')?.naam || '', maandVan(nu), nu.toISOString().replace('T', ' ').slice(0, 19)).first();
  if (!rij?.id) return { ok: false, reden: 'mollie' };

  const terug = /^\/(nl\/)?start(\/[a-z0-9-]*)*\/?$/.test(String(verder || '')) ? `&verder=${encodeURIComponent(verder)}` : '';
  try {
    const betaling = await createBijkoopMolliePayment(env, {
      aankoopId: rij.id, customerId, grossCents, lang,
      description: `VISUAILS — ${x} extra credits (${planTarief(sub, lang)?.naam || ''})`,
      successUrl: `${origin}/account/plan/?bijkoop=${rij.id}${terug}#bijkopen`,
      webhookUrl: `${origin}/api/webhook/mollie`,
      excludeIdeal: (sub.vat_treatment || VAT_TREATMENT.standard) !== VAT_TREATMENT.standard,
    });
    const url = betaling?._links?.checkout?.href;
    if (!betaling?.id || !url) throw new Error('Mollie gaf geen betaallink terug');
    await D.prepare('UPDATE credit_aankopen SET mollie_payment_id = ?2 WHERE id = ?1').bind(rij.id, String(betaling.id)).run();
    return { ok: true, url, id: rij.id };
  } catch (err) {
    console.error('[bijkopen] betaling niet aangemaakt —', err?.message || err);
    await D.prepare("UPDATE credit_aankopen SET status = 'failed' WHERE id = ?1 AND status = 'open'").bind(rij.id).run().catch(() => {});
    return { ok: false, reden: 'mollie' };
  }
}

/* De metadata van een Mollie-betaling als object. */
function metaVan(payment) {
  if (typeof payment?.metadata === 'string') { try { return JSON.parse(payment.metadata) || {}; } catch { return {}; } }
  return payment?.metadata || {};
}

/** Is dit een bijkoop? Dan het nummer van de aankoop, anders null. */
export function bijkoopId(payment) {
  const m = metaVan(payment);
  if (m.order_ref || m.sub_ref || payment?.subscriptionId) return null;
  const id = Number(m.bijkoop);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* Eén regel in admin_log, één keer (admin_log is het geheugen, zoals bij
   meldChargeback() in de webhook). Geeft true als hij nieuw was. */
async function logEenKeer(D, actie, customerId, detail) {
  const al = await D.prepare('SELECT 1 AS er FROM admin_log WHERE action = ?1 AND detail = ?2 LIMIT 1').bind(actie, detail).first().catch(() => null);
  if (al) return false;
  await D.prepare(`INSERT INTO admin_log (admin_id, admin_email, action, customer_id, detail) VALUES (NULL, NULL, ?1, ?2, ?3)`)
    .bind(actie, customerId || null, detail).run().catch(() => {});
  return true;
}

/**
 * Wat Mollie over een bijkoop meldt. Vanuit de webhook én de terugkeerpagina
 * (die de betaling zelf bij Mollie opvraagt): idempotent, dus twee keer is één
 * keer. Geeft { status } — de status van de aankoop daarna — of null als dit
 * geen bijkoop van ons is.
 */
export async function verwerkBijkoop(env, payment, { mode = '' } = {}) {
  const D = env.DB;
  const id = bijkoopId(payment);
  if (!D || !id) return null;
  const a = await D.prepare('SELECT * FROM credit_aankopen WHERE id = ?1').bind(id).first().catch(() => null);
  if (!a) {
    console.error('[bijkopen] betaling', payment?.id, 'noemt aankoop', id, 'die hier niet bestaat — verkeerde omgeving?');
    return null;
  }
  /* Alleen de betaling die bij deze aankoop hoort. Een verzonnen webhook met
     een ander id komt nooit zo ver (de webhook vraagt de betaling bij Mollie
     op), maar een tweede betaling op dezelfde aankoop ook niet. */
  if (a.mollie_payment_id && a.mollie_payment_id !== payment.id) {
    console.error('[bijkopen] betaling', payment.id, 'hoort niet bij aankoop', id, `(die heeft ${a.mollie_payment_id})`);
    return { status: a.status };
  }
  const status = String(payment.status || '');
  if (['failed', 'canceled', 'expired'].includes(status)) {
    await D.prepare('UPDATE credit_aankopen SET status = ?2 WHERE id = ?1 AND status = ?3').bind(id, status, 'open').run().catch(() => {});
    console.log(`[bijkopen] aankoop ${id} ${status} (${mode}) — niets bijgeschreven`);
    return { status: a.status === 'open' ? status : a.status };
  }
  if (status !== 'paid' && status !== 'refunded') return { status: a.status };

  const cents = mollieAmountToCents(payment.amount) ?? 0;
  if (cents + SPELING_CENT < heel(a.gross_cents)) {
    console.error('[bijkopen] betaling', payment.id, 'dekt aankoop', id, 'niet —', cents, 'van', a.gross_cents, 'cent; niets bijgeschreven');
    return { status: a.status };
  }
  const betaald = String(payment.paidAt || payment.createdAt || '');
  const paidAt = /^\d{4}-\d{2}-\d{2}T/.test(betaald) ? new Date(betaald) : new Date();

  /* ── HET GELD IN subscription_payments ──────────────────────────────────
     Zodat de factuur uit dezelfde reeks en route komt als een termijn, en de
     boekhouding hem ziet. `month` blijft leeg: dit is geen termijn. */
  let spId = a.subscription_payment_id || null;
  if (a.subscription_id) {
    await D.prepare(
      `INSERT INTO subscription_payments (subscription_id, external_id, status, amount_cents, currency, month, raw_payload)
       VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)
       ON CONFLICT (external_id) DO NOTHING`
    ).bind(a.subscription_id, payment.id, 'paid', cents, (payment.amount?.currency || 'EUR').toUpperCase(),
      JSON.stringify({ id: payment.id, status: payment.status, method: payment.method || null, paidAt: payment.paidAt || null, bijkoop: id }))
      .run().catch((e) => console.error('[bijkopen] betaling niet in subscription_payments —', payment.id, '—', e?.message || e));
    const sp = await D.prepare('SELECT id FROM subscription_payments WHERE external_id = ?1').bind(payment.id).first().catch(() => null);
    spId = sp?.id || spId;
  }

  /* De overgang naar 'paid' gebeurt één keer; alleen die stuurt de mail. */
  const nieuw = await D.prepare(
    `UPDATE credit_aankopen SET status = 'paid', paid_at = ?2, subscription_payment_id = COALESCE(subscription_payment_id, ?3),
            mollie_payment_id = COALESCE(mollie_payment_id, ?4)
      WHERE id = ?1 AND status = 'open' RETURNING id`
  ).bind(id, paidAt.toISOString().replace('T', ' ').slice(0, 19), spId, payment.id).first().catch(() => null);
  if (!nieuw && a.status !== 'paid') {
    console.error('[bijkopen] aankoop', id, 'stond op', a.status, 'en is nu betaald —', payment.id, '— bekijk dit in Mollie');
    await D.prepare(`UPDATE credit_aankopen SET status = 'paid', paid_at = ?2, subscription_payment_id = COALESCE(subscription_payment_id, ?3) WHERE id = ?1`)
      .bind(id, paidAt.toISOString().replace('T', ' ').slice(0, 19), spId).run().catch(() => {});
  }

  /* ── DE CREDITS ─────────────────────────────────────────────────────────
     Bij elke aflevering geprobeerd (de sleutel maakt een tweede keer
     onschadelijk), zoals de termijn in de webhook: valt het één keer om, dan
     herstelt de volgende aflevering het. */
  const boek = await boekBijgekocht(D, {
    customerId: a.customer_id, subscriptionId: a.subscription_id, aantal: a.pakket, aankoopId: id,
    paymentId: payment.id, nu: paidAt,
  }).catch((e) => { console.error('[bijkopen] credits niet bijgeschreven —', id, '—', e?.message || e); return null; });

  /* ── TERUGBETAALD OF TERUGGEBOEKT ───────────────────────────────────────
     Zoals bij een termijn (V49 = a, 8.11): een terugbetaling laat het
     ongebruikte deel meteen vervallen, een terugboeking bevriest het tot Mollie
     het terugdraait. De factuur blijft staan; Lucas ziet het in admin_log. */
  const terug = mollieAmountToCents(payment.amountRefunded) ?? 0;
  if (terug > 0 || status === 'refunded') {
    await D.prepare(
      `UPDATE subscription_payments SET status = ?2, refunded_cents = ?3 WHERE external_id = ?1 AND refunded_cents < ?3`
    ).bind(payment.id, payment.status, terug).run().catch(() => {});
    const v = await vervalTermijn(D, { paymentId: payment.id, bedragCents: cents, toelichting: `bijkoop terugbetaald (${terug} van ${cents} cent)` }).catch(() => null);
    await logEenKeer(D, 'bijkoop.terugbetaald', a.customer_id, `aankoop ${id}: ${payment.id} ${terug} van ${cents} cent terug, ${v?.vervielNu || 0} credits vervallen`);
    return { status: 'paid' };
  }
  const teruggeboekt = mollieAmountToCents(payment.amountChargedBack) ?? 0;
  if (teruggeboekt > 0) {
    const b = await bevriesTermijn(D, { paymentId: payment.id, toelichting: `terugboeking bijkoop (${teruggeboekt} van ${cents} cent)` }).catch(() => null);
    await logEenKeer(D, 'bijkoop.chargeback', a.customer_id, `aankoop ${id}: ${payment.id} ${teruggeboekt} cent teruggeboekt, ${b?.bevroren || b?.al || 0} credits bevroren`);
    return { status: 'paid' };
  }
  await ontdooiTermijn(D, { paymentId: payment.id, toelichting: 'terugboeking bijkoop teruggedraaid door Mollie' }).catch(() => null);

  /* ── DE FACTUUR EN DE MAIL ──────────────────────────────────────────────
     Na de credits, zoals bij een termijn: valt het papier om, dan heeft de
     klant nog steeds wat hij betaalde. issueSubscriptionInvoice() is
     idempotent op de betaling. */
  let factuur = null;
  if (spId) {
    try {
      factuur = await issueSubscriptionInvoice(env, spId);
    } catch (e) {
      console.error('[bijkopen] factuur voor aankoop', id, 'niet uitgegeven —', e?.message || e);
    }
  }
  if (nieuw) {
    try {
      const k = await D.prepare('SELECT email FROM customers WHERE id = ?1').bind(a.customer_id).first();
      const lang = String(payment.locale || '').startsWith('en') ? 'en' : 'nl';
      await mailBijkoopFactuur(env, {
        customer: { email: k?.email }, invoice: factuur, pakket: a.pakket, lang,
        tot: boek?.vervaltOp ? dagErvoor(boek.vervaltOp) : '',
      });
    } catch (e) {
      console.error('[bijkopen] mail voor aankoop', id, 'niet verstuurd —', e?.message || e);
    }
    console.log(`[bijkopen] aankoop ${id}: ${a.pakket} credits bijgeschreven${factuur ? `, factuur ${factuur.number}` : ''} (${mode})`);
  }
  return { status: 'paid' };
}

/** Een aankoop van deze klant (voor de terugkeerpagina), of null. */
export async function aankoopVanKlant(db, customerId, id) {
  const D = db && typeof db.prepare !== 'function' && db.DB ? db.DB : db;
  return D.prepare('SELECT * FROM credit_aankopen WHERE id = ?1 AND customer_id = ?2').bind(Number(id) || 0, customerId).first().catch(() => null);
}

/** De aankopen van een klant, nieuwste eerst (Studio en /admin). */
export async function aankopenVanKlant(db, customerId, { limit = 12 } = {}) {
  const D = db && typeof db.prepare !== 'function' && db.DB ? db.DB : db;
  const r = await D.prepare(
    `SELECT a.*, si.number AS factuur, si.id AS factuur_id
       FROM credit_aankopen a
       LEFT JOIN subscription_invoices si ON si.subscription_payment_id = a.subscription_payment_id AND si.status = 'issued'
      WHERE a.customer_id = ?1
      ORDER BY a.id DESC LIMIT ?2`
  ).bind(customerId, Math.max(1, heel(limit))).all().catch(() => null);
  return r?.results || [];
}

/**
 * Wat stap 5 van het bestelformulier over bijkopen moet weten (via
 * /account/me), of null zonder lopend abonnement. Alleen getallen; de woorden
 * staan in het formulier. Per pakket de prijs en, als die geldt, de hint.
 *   { ruimte, pakketten: [{ credits, euros, hint: { naam, bedrag, credits } | null }] }
 */
export async function bijkoopVoorFormulier(env, customerId, { lang = 'nl', nu = new Date() } = {}) {
  const D = env?.DB;
  if (!D || !customerId) return null;
  const sub = await D.prepare(
    `SELECT id, customer_id, plan, term, status, slots_json, vat_treatment, vat_rate FROM subscriptions
      WHERE customer_id = ?1 AND status = 'active' ORDER BY id DESC LIMIT 1`
  ).bind(customerId).first().catch(() => null);
  if (!magBijkopen(sub)) return null;
  const pakketten = pakkettenVoor(sub);
  if (!pakketten.length) return null;
  const { ruimte } = await bijkoopRuimte(D, customerId, nu);
  const uit = [];
  for (const p of pakketten) {
    const h = await overstapHint(D, sub, { pakket: p.credits, nu, lang }).catch(() => null);
    uit.push({ credits: p.credits, euros: p.euros, hint: h ? { naam: h.naam, bedrag: h.bedrag, credits: h.credits, reden: h.reden } : null });
  }
  return { ruimte, pakketten: uit };
}
