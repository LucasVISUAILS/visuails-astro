/* ── OVERSTAPPEN NAAR EEN ANDER ABONNEMENT — 15 oktober 2026 ────────────────────
 *
 * Afvinklijst 29, v29-overstap = a: "een echte overstap per volgende termijn:
 * Mollie bijwerken, en de credits van het nieuwe plan vanaf die termijn". /plans
 * beloofde al "Overstappen in VISUAILS Studio" en de bijkoop-hint zei "overstappen
 * naar X is voordeliger", maar Studio had geen knop.
 *
 * HOE HET LOOPT
 *   1. De klant kiest in Studio (Je plan → Overstappen) een ander plan, of een
 *      abonnement op maat met een ander aantal credits.
 *   2. vraagOverstapAan(): de poorten (lopend, maandelijks, bij Mollie, niet
 *      hetzelfde, past bij meer credits nog onder het plafond), dan PATCH bij
 *      Mollie met het nieuwe brutobedrag, en pas als dat lukte de `overstap_`-
 *      kolommen op de rij. Het abonnement zelf blijft deze termijn wat het is:
 *      dezelfde credits, hetzelfde plan op de factuur.
 *   3. De webhook (recordSubscriptionPaid) roept overstapToepassen() aan vóór hij
 *      het bedrag controleert: is deze termijnbetaling door Mollie aangemaakt NA
 *      de overstap, dan wordt de overstap het abonnement (plan, amount_cents,
 *      slots_json) en gaat de rest — de controle van het bedrag, de credits, het
 *      spaarplafond, de factuur — vanzelf over het nieuwe plan. Was de betaling
 *      al onderweg (aangemaakt vóór de overstap, dus met het oude bedrag), dan
 *      telt hij nog voor het oude plan en wacht de overstap op de termijn erna.
 *   4. Hervatten na een pauze maakt een nieuw Mollie-abonnement aan; staat er een
 *      overstap klaar, dan gaat die daar meteen in (hervatten is een nieuwe termijn).
 *   5. Opzeggen haalt een klaarstaande overstap weg: er komt geen volgende termijn.
 *
 * WAT NIET KAN, en waarom
 *   · Een vooruitbetaald jaar: daar is geen maandelijkse afschrijving om aan te
 *     passen. Overstappen kan bij de verlenging.
 *   · Een gepauzeerd, opgezegd of nog niet betaald abonnement: eerst hervatten of
 *     afronden. (Een overstap die al klaarstond, blijft wel staan tijdens een pauze.)
 */
import { PLAN_IDS, creditsPassen } from '../data/plans.js';
import {
  PLAN_CREDITS, CUSTOM_MONTH_ID, isCustomCredits, customCreditsTotal,
  CUSTOM_CREDITS_MIN, CUSTOM_CREDITS_MAX, CUSTOM_CREDITS_STEP,
} from '../data/pricing.js';
import { subMaandBruto, subMaandCents, creditsVoor } from './slots.js';
import { aboStand } from './aboPlafond.js';
import { updateMollieSubscription } from './mollie.js';

export const OVERSTAP_PLANNEN = [...PLAN_IDS, CUSTOM_MONTH_ID];
export const OVERSTAP_MAAT = { min: CUSTOM_CREDITS_MIN, max: CUSTOM_CREDITS_MAX, stap: CUSTOM_CREDITS_STEP };

/** Het doel als de velden die op de abonnementsrij komen, of null bij een ongeldige keuze. */
export function overstapDoel(plan, credits) {
  const p = String(plan || '');
  if (p === CUSTOM_MONTH_ID) {
    const n = Number(credits);
    if (!isCustomCredits(n)) return null;
    const cents = Math.round(customCreditsTotal(n).total * 100);
    if (!(cents > 0)) return null;
    return { plan: p, amount_cents: cents, slots_json: JSON.stringify({ credits: n }), credits: n };
  }
  if (!PLAN_IDS.includes(p)) return null;
  return { plan: p, amount_cents: null, slots_json: null, credits: PLAN_CREDITS[p] };
}

/** Mag dit abonnement nu overstappen? `reden` is leeg als het mag. */
export function magOverstappen(sub) {
  if (!sub) return { mag: false, reden: 'geen' };
  if (sub.term === 'prepaid' || sub.term === 'yearly') return { mag: false, reden: 'jaar' };
  if (sub.status !== 'active') return { mag: false, reden: 'status' };
  if (!sub.mollie_subscription_id || !sub.mollie_customer_id) return { mag: false, reden: 'mollie' };
  return { mag: true, reden: '' };
}

/** Het abonnement zoals het na de overstap is (voor bedragen en credits). */
export function naOverstap(sub, doel) {
  return { ...sub, plan: doel.plan, amount_cents: doel.amount_cents, slots_json: doel.slots_json };
}

/**
 * De overstap die klaarstaat, of null. Een eigen query met een eigen vangnet:
 * zonder migratie 0068 bestaat er gewoon geen overstap, en dan mag de rest van
 * Studio, de webhook en /admin niet omvallen.
 */
export async function overstapVan(env, subId) {
  if (!subId) return null;
  const r = await env.DB.prepare(
    'SELECT overstap_plan, overstap_cents, overstap_slots_json, overstap_at, overstap_van FROM subscriptions WHERE id = ?1'
  ).bind(subId).first().catch(() => null);
  if (!r || !r.overstap_plan) return null;
  const doel = { plan: r.overstap_plan, amount_cents: r.overstap_cents ?? null, slots_json: r.overstap_slots_json ?? null };
  return { ...doel, credits: creditsVoor(doel), at: r.overstap_at || '', van: r.overstap_van || '' };
}

const beschrijving = (plan, ref) => `VISUAILS ${plan} — ${ref}`;
const centsVan = (bedrag) => {
  const v = Number.parseFloat(bedrag && typeof bedrag === 'object' ? bedrag.value : bedrag);
  return Number.isFinite(v) ? Math.round(v * 100) : null;
};

/**
 * De overstap aanvragen. Geeft { ok, doel, bruto } of { fout } terug; fouten zijn
 * vaste codes voor de melding in Studio: geen, jaar, status, mollie, keuze,
 * zelfde, vol, bijwerken, opslaan.
 * Kiest de klant het plan dat hij nu heeft terwijl er een overstap klaarstaat,
 * dan is dat terugdraaien: { ok, terug: true }.
 */
export async function vraagOverstapAan(env, sub, { plan, credits } = {}) {
  const m = magOverstappen(sub);
  if (!m.mag) return { fout: m.reden };
  const doel = overstapDoel(plan, credits);
  if (!doel) return { fout: 'keuze' };
  const nuCredits = creditsVoor(sub);
  const zelfde = doel.plan === sub.plan && (doel.plan !== CUSTOM_MONTH_ID || doel.credits === nuCredits);
  const klaar = await overstapVan(env, sub.id);
  if (zelfde) {
    if (!klaar) return { fout: 'zelfde' };
    const t = await annuleerOverstap(env, sub);
    return t.ok ? { ok: true, terug: true, doel: klaar } : t;
  }
  if (klaar && klaar.plan === doel.plan && Number(klaar.amount_cents || 0) === Number(doel.amount_cents || 0)) {
    return { ok: true, doel, bruto: subMaandBruto(naOverstap(sub, doel)), al: true };
  }
  /* Meer credits per maand: past dat nog onder het plafond? Wat hij nu heeft,
     telt al mee in de bezetting; alleen het verschil komt erbij. */
  const extra = doel.credits - nuCredits;
  if (extra > 0) {
    const stand = await aboStand(env).catch(() => null);
    if (stand && !creditsPassen(extra, stand.credits, stand.plafond)) return { fout: 'vol' };
  }
  const bruto = subMaandBruto(naOverstap(sub, doel));
  try {
    await updateMollieSubscription(env, {
      mollieCustomerId: sub.mollie_customer_id, subscriptionId: sub.mollie_subscription_id,
      valueEuros: bruto / 100, description: beschrijving(doel.plan, sub.ref),
    });
  } catch (e) {
    console.error('[overstap] Mollie niet bijgewerkt —', sub.ref, '—', e?.message || e);
    return { fout: 'bijwerken' };
  }
  const at = new Date().toISOString();
  try {
    await env.DB.prepare(
      `UPDATE subscriptions SET overstap_plan = ?2, overstap_cents = ?3, overstap_slots_json = ?4,
              overstap_at = ?5, overstap_van = ?6, updated_at = datetime('now')
        WHERE id = ?1`
    ).bind(sub.id, doel.plan, doel.amount_cents, doel.slots_json, at, sub.plan).run();
  } catch (e) {
    /* De rij kon niet mee (migratie 0068 ontbreekt?): Mollie terug naar het oude
       bedrag, anders schrijft hij volgende maand iets af waar geen plan bij hoort. */
    console.error('[overstap] niet bewaard (migratie 0068?) —', sub.ref, '—', e?.message || e);
    await updateMollieSubscription(env, {
      mollieCustomerId: sub.mollie_customer_id, subscriptionId: sub.mollie_subscription_id,
      valueEuros: subMaandBruto(sub) / 100, description: beschrijving(sub.plan, sub.ref),
    }).catch((e2) => console.error('[overstap] en Mollie NIET teruggezet —', sub.ref, '—', e2?.message || e2));
    return { fout: 'opslaan' };
  }
  return { ok: true, doel, bruto, at };
}

/** Een klaarstaande overstap terugdraaien: Mollie terug naar het huidige bedrag. */
export async function annuleerOverstap(env, sub, { mollie = true } = {}) {
  const klaar = await overstapVan(env, sub?.id);
  if (!klaar) return { fout: 'geen' };
  if (mollie && sub.status === 'active' && sub.mollie_subscription_id && sub.mollie_customer_id) {
    try {
      await updateMollieSubscription(env, {
        mollieCustomerId: sub.mollie_customer_id, subscriptionId: sub.mollie_subscription_id,
        valueEuros: subMaandBruto(sub) / 100, description: beschrijving(sub.plan, sub.ref),
      });
    } catch (e) {
      console.error('[overstap] terugdraaien: Mollie niet bijgewerkt —', sub.ref, '—', e?.message || e);
      return { fout: 'bijwerken' };
    }
  }
  await env.DB.prepare(
    `UPDATE subscriptions SET overstap_plan = NULL, overstap_cents = NULL, overstap_slots_json = NULL,
            overstap_at = NULL, overstap_van = NULL, updated_at = datetime('now')
      WHERE id = ?1`
  ).bind(sub.id).run();
  return { ok: true, doel: klaar };
}

/**
 * De overstap laten ingaan. Met `betaling` (de webhook): alleen als Mollie die
 * termijnbetaling NA de overstap aanmaakte — of, zonder datum, als het bedrag
 * het nieuwe is. Zonder `betaling` (hervatten): meteen.
 * Geeft het abonnement terug zoals het vanaf nu is (dezelfde vorm als binnenkwam).
 */
export async function overstapToepassen(env, sub, betaling = null) {
  const klaar = await overstapVan(env, sub?.id).catch(() => null);
  if (!klaar) return sub;
  const nieuw = naOverstap(sub, klaar);
  if (betaling) {
    const gemaakt = Date.parse(String(betaling.createdAt || ''));
    const aan = Date.parse(String(klaar.at || ''));
    const ingaan = Number.isFinite(gemaakt) && Number.isFinite(aan)
      ? gemaakt >= aan
      : Math.abs((centsVan(betaling.amount) ?? -1) - subMaandBruto(nieuw)) <= 2;
    if (!ingaan) return sub;
  }
  /* `AND overstap_at = ?5`: twee webhooks tegelijk zetten hem maar één keer om. */
  const r = await env.DB.prepare(
    `UPDATE subscriptions SET plan = ?2, amount_cents = ?3, slots_json = ?4,
            overstap_plan = NULL, overstap_cents = NULL, overstap_slots_json = NULL,
            overstap_at = NULL, overstap_van = NULL, updated_at = datetime('now')
      WHERE id = ?1 AND overstap_at = ?5`
  ).bind(sub.id, klaar.plan, klaar.amount_cents, klaar.slots_json, klaar.at).run().catch((e) => {
    console.error('[overstap] niet toegepast —', sub.ref || sub.id, '—', e?.message || e);
    return null;
  });
  if (!r) return sub;
  console.log('[overstap] ingegaan —', sub.ref || sub.id, '—', `${sub.plan} → ${klaar.plan}`, betaling ? `bij ${betaling.id}` : 'bij hervatten');
  return nieuw;
}

/** Voor de weergave: wat het nieuwe plan per maand kost (netto en bruto) en oplevert. */
export function overstapBedragen(sub, doel) {
  const na = naOverstap(sub, doel);
  return { netto: subMaandCents(na), bruto: subMaandBruto(na), credits: creditsVoor(na) };
}
