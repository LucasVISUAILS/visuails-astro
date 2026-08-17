/**
 * ══════════════════════════════════════════════════════════════════════════════
 * EEN ABONNEMENT AFSLUITEN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * De motor stond er sinds 16 augustus — de tabellen, de vijf Mollie-functies, de
 * webhook die een afschrijving herkent en saldo toekent, en het scherm in het
 * dashboard. Wat ontbrak was de startknop: geen enkele regel riep
 * createSubscriptionRow() of createFirstPayment() aan, dus werd er nooit een
 * mandaat gemaakt en kwam er nooit een afschrijving binnen.
 *
 * Dit bestand is die startknop, en hij bestaat uit precies twee handelingen.
 *
 * ── 1 · STARTEN ────────────────────────────────────────────────────────────
 *
 * De klant kiest plan, termijn en de dag van zijn vaste week. Wij leggen een rij
 * vast op 'pending', maken een klant bij Mollie aan, en sturen hem naar een
 * EERSTE BETALING met `sequenceType: 'first'`. Die betaling is geen maand — het
 * is de transactie die het mandaat oplevert. Zonder mandaat kan er nooit iets
 * worden afgeschreven, en een mandaat komt bij Mollie alleen uit een echte
 * betaling.
 *
 * DE RIJ BESTAAT VÓÓR DE BETALING. Dezelfde volgorde als bij een bestelling, en
 * om dezelfde reden: de webhook komt binnen met een kenmerk en moet daar iets bij
 * kunnen vinden. Een rij die pas ná de betaling ontstaat, is een rij die er niet
 * is op het moment dat Mollie belt.
 *
 * ── 2 · TERUGKOMEN ─────────────────────────────────────────────────────────
 *
 * Mollie stuurt de klant terug. Dan pas halen we het mandaat op — bij de bron en
 * niet uit het betaalobject, zie firstPaymentMandate() — en maken we de
 * subscription aan. Vanaf dat moment schrijft Mollie zelf af en doet de webhook
 * de rest.
 *
 * WAAROM DIT NIET IN DE WEBHOOK STAAT. Het zou daar kunnen en het zou daar
 * fragieler zijn: de webhook van de eerste betaling en de terugkeer van de klant
 * racen met elkaar, en twee kanten die allebei een subscription aanmaken, maken
 * er twee. Nu is er één plek die hem aanmaakt, en die is idempotent op
 * `mollie_subscription_id`: staat hij er al, dan gebeurt er niets.
 *
 * ── WIE ER EEN ABONNEMENT KAN AFSLUITEN, EN WAAROM ─────────────────────────
 *
 * Alleen wie is ingelogd. Een abonnement hangt aan `customers.id`, en accounts
 * ontstaan in dit systeem uitsluitend door te bestellen — er is geen
 * registratieformulier en dat is een bestaande keuze, geen omissie.
 *
 * Dat betekent dat een wildvreemde niet in één klik een SEPA-machtiging afgeeft
 * voor € 790 per maand. Dat is hier de goede kant om: elk pad naar VISUAILS
 * begint vandaag met een proefvisual van € 1 of een bestelling, en iemand die dat
 * nog nooit deed, koopt geen jaarverbintenis. Wil je dat wél openzetten, dan is
 * dit de plek waar die beslissing hoort — en dan hoort er een accountaanmaak bij,
 * niet een uitzondering hier.
 */

import {
  createSubscriptionRow, loadSubscription, subscriptionByRef,
  setMollieIds, activateSubscription,
} from './subscription.js';
import {
  PLAN_IDS, TERM_IDS, PLAN_SERVICE, monthlyCents, productsFor, planProductBudget, fitsBudget,
} from '../data/plans.js';
import { planName } from '../data/planNames.js';
import {
  createMollieCustomer, createFirstPayment, firstPaymentMandate, createMollieSubscription,
} from './mollie.js';

/*
 * DE MANDAATBETALING IS € 1 EN NIET DE EERSTE MAAND.
 *
 * Twee redenen, en de tweede is de belangrijkste:
 *
 *   · Mollie geeft alleen een mandaat af uit een ECHTE transactie. Nul euro kan
 *     niet — createFirstPayment() weigert dat expliciet.
 *   · De eerste maand hoort via de subscription te lopen en niet hier. Anders
 *     bestaat de eerste termijn buiten `subscription_payments` om, en dan mist de
 *     maandboekhouding precies één maand — de eerste, die de klant zich het beste
 *     herinnert.
 *
 * De € 1 wordt verrekend doordat de subscription pas de maand daarna begint; zie
 * `startDate` hieronder. Wat de klant betaalt is dus één euro nu en zijn
 * maandbedrag vanaf de eerstvolgende termijn.
 */
const MANDATE_EUROS = 1;

/** Waar de klant heen gaat als er iets niet lukt. Eén plek, zodat de reden in de URL consistent is. */
function terug(reden) {
  return `/start/plan?fout=${encodeURIComponent(reden)}`;
}

/**
 * Stap 1 — het verzoek, en de weg naar Mollie.
 *
 * Geeft een 303 naar het betaalscherm van Mollie, of terug naar de keuzepagina
 * met een reden. Nooit een 500 met een stacktrace: dit is een pagina waar iemand
 * op het punt staat geld uit te geven, en een technische fout hoort daar een zin
 * te zijn.
 */
export async function handleSubscribeStart(context, customer, offsite) {
  const { env, request } = context;
  const form = await request.formData().catch(() => null);

  const planId = String(form?.get('plan') || '');
  const termId = String(form?.get('term') || 'monthly');
  const windowDay = Number.parseInt(String(form?.get('window_day') || ''), 10);

  if (!PLAN_IDS.includes(planId)) return seeOtherLocal(terug('plan'));
  if (!TERM_IDS.includes(termId)) return seeOtherLocal(terug('termijn'));

  /* AL EEN ABONNEMENT? Dan niet nog een. De partiële UNIQUE index vangt dit ook,
     maar een klant die per ongeluk twee tabbladen open heeft, hoort een uitleg te
     zien en geen databasefout. */
  const bestaand = await loadSubscription(env, customer.customer_id);
  if (bestaand) return seeOtherLocal('/account/plan');

  /*
   * DE CAPACITEITSPOORT, EN HIJ STAAT HIER OM DEZELFDE REDEN ALS BIJ EEN
   * BESTELLING MET EEN VENSTER: je kunt niet meer beloven dan je kunt maken.
   *
   * planProductBudget() is 30% van de begeleide maandcapaciteit. Wat er al vast
   * ligt, wordt geteld over de database en niet aangenomen — zie bezetting() in
   * subscription.js. Past dit plan er niet meer bij, dan is dat geen storing maar
   * een volle agenda, en dat hoort de klant te lezen voordat hij een machtiging
   * afgeeft en niet erna.
   */
  const bezet = await env.DB.prepare(
    `SELECT plan FROM subscriptions WHERE status IN ('active', 'pending', 'paused')`
  ).all().catch(() => ({ results: [] }));
  const vastgelegd = (bezet?.results || []).reduce((n, r) => n + productsFor(r.plan), 0);
  if (!fitsBudget(planId, vastgelegd)) {
    console.error('[abonnement] plek geweigerd —', planId, 'bij', vastgelegd, 'van', planProductBudget());
    return seeOtherLocal(terug('vol'));
  }

  let rij;
  try {
    const gemaakt = await createSubscriptionRow(env, {
      customerId: customer.customer_id, planId, termId, windowDay,
    });
    if (gemaakt.bestaat) return seeOtherLocal('/account/plan');
    rij = gemaakt.row;
  } catch (err) {
    console.error('[abonnement] rij niet aangemaakt —', err?.message || err);
    return seeOtherLocal(terug('opslaan'));
  }

  /* De klant bij Mollie. Eén per abonnement en niet één per betaling: het mandaat
     hangt aan de Mollie-klant, en zonder die id kan er later niets herhaald worden. */
  let mollieCustomerId;
  try {
    const mc = await createMollieCustomer(env, {
      customerId: customer.customer_id,
      email: customer.email,
      name: customer.brand || customer.name || customer.email,
    });
    mollieCustomerId = mc?.id;
    if (!mollieCustomerId) throw new Error('Mollie gaf geen klant-id terug');
    await setMollieIds(env, rij.id, { customerId: mollieCustomerId });
  } catch (err) {
    console.error('[abonnement] Mollie-klant niet aangemaakt —', err?.message || err);
    return seeOtherLocal(terug('mollie'));
  }

  const lang = String(form?.get('lang') || 'nl') === 'en' ? 'en' : 'nl';
  const origin = new URL(request.url).origin;

  let checkout;
  try {
    const betaling = await createFirstPayment(env, {
      subscriptionRef: rij.ref,
      mollieCustomerId,
      valueEuros: MANDATE_EUROS,
      description: `VISUAILS ${planName(planId, lang)} — ${rij.ref}`,
      lang,
      /* De klant komt terug op /account/plan/return, waar het mandaat wordt
         opgehaald en de subscription wordt aangemaakt. Het kenmerk gaat mee in de
         URL en niet in een cookie: een klant die op zijn telefoon betaalt en op
         zijn laptop terugkomt, heeft dat cookie niet. */
      successUrl: `${origin}/account/plan/return?sub=${encodeURIComponent(rij.ref)}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
    });
    checkout = betaling?._links?.checkout?.href;
    if (!checkout) throw new Error('Mollie gaf geen betaallink terug');
  } catch (err) {
    console.error('[abonnement] eerste betaling niet aangemaakt —', err?.message || err);
    return seeOtherLocal(terug('mollie'));
  }

  /* Via het tussenscherm dat de site ook voor bestellingen gebruikt, zodat een
     klant weet dat hij VISUAILS verlaat. Zie offsite.js voor waarom dat er is. */
  return offsite ? offsite(checkout, lang) : seeOtherLocal(checkout);
}

/**
 * Stap 2 — terug van Mollie. Hier ontstaat de subscription.
 *
 * IDEMPOTENT, en dat is niet luxe: deze pagina wordt ververst, twee keer geopend,
 * en door een terugknop opnieuw bezocht. Staat er al een `mollie_subscription_id`,
 * dan gebeurt er niets en ziet de klant hetzelfde scherm.
 *
 * WAT ER GEBEURT ALS HET MANDAAT ER NOG NIET IS. Dat is het normale geval bij
 * iDEAL: de klant is terug voordat de bank ons heeft bevestigd. Dan blijft het
 * abonnement op 'pending' staan en zegt de pagina dat — en de webhook maakt het
 * later af. Een foutmelding zou hier liegen: er is niets misgegaan.
 */
export async function handleSubscribeReturn(context, customer) {
  const { env, request } = context;
  const ref = new URL(request.url).searchParams.get('sub') || '';

  const sub = await subscriptionByRef(env, ref);
  /* Van deze klant, en dat wordt gecontroleerd. Een kenmerk uit de URL is van
     iedereen; zonder deze toets zou iemand het abonnement van een ander kunnen
     activeren door zijn kenmerk te raden. */
  if (!sub || sub.customer_id !== customer.customer_id) return { staat: 'onbekend' };

  const vol = await loadSubscription(env, customer.customer_id);
  if (vol?.mollie_subscription_id) return { staat: 'actief', sub: vol };
  if (!vol?.mollie_customer_id) return { staat: 'wacht', sub: vol || sub };

  let mandaat;
  try {
    mandaat = await firstPaymentMandate(env, vol.mollie_customer_id);
  } catch (err) {
    console.error('[abonnement] mandaat niet op te halen —', err?.message || err);
    return { staat: 'wacht', sub: vol };
  }
  /* Nog geen geldig mandaat: de bank is nog bezig. Geen fout — zie de kop. */
  if (!mandaat?.id) return { staat: 'wacht', sub: vol };

  await setMollieIds(env, vol.id, { mandateId: mandaat.id });

  const maandBedrag = monthlyCents(vol.plan, vol.term) / 100;
  const origin = new URL(request.url).origin;

  try {
    const sc = await createMollieSubscription(env, {
      mollieCustomerId: vol.mollie_customer_id,
      mandateId: mandaat.id,
      valueEuros: maandBedrag,
      description: `VISUAILS ${vol.plan} — ${vol.ref}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
      /* VANAF DE VOLGENDE MAAND. De klant heeft zojuist € 1 betaald voor het
         mandaat; de eerste echte termijn hoort een maand later te vallen, anders
         betaalt hij twee keer in dezelfde week. */
      startDate: eersteTermijn(),
      /* Een jaarverbintenis stopt zichzelf na twaalf termijnen. Netter dan
         onthouden dat er iets opgezegd moet worden — zie de noot bij `times` in
         mollie.js. */
      times: vol.term === 'yearly' ? 12 : undefined,
    });
    if (!sc?.id) throw new Error('Mollie gaf geen abonnements-id terug');
    await setMollieIds(env, vol.id, { subscriptionId: sc.id });
    await activateSubscription(env, vol.id);
  } catch (err) {
    console.error('[abonnement] subscription niet aangemaakt —', err?.message || err);
    return { staat: 'wacht', sub: vol };
  }

  return { staat: 'gelukt', sub: await loadSubscription(env, customer.customer_id) };
}

/**
 * De datum waarop de eerste echte termijn valt: dezelfde dag, volgende maand.
 *
 * `YYYY-MM-DD`, want dat is wat Mollie's `startDate` verwacht. De 28e is de
 * bovengrens om dezelfde reden als `window_day` in migratie 0030: februari mag
 * geen uitzondering worden.
 */
export function eersteTermijn(vanaf = new Date()) {
  const d = new Date(Date.UTC(vanaf.getUTCFullYear(), vanaf.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + 1);
  const dag = Math.min(28, vanaf.getUTCDate());
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
}

/** Zelfde vorm als seeOther() in account.js; hier apart zodat dit bestand niets uit de schil hoeft te importeren. */
function seeOtherLocal(location) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, 'cache-control': 'no-store', 'referrer-policy': 'same-origin' },
  });
}

export { PLAN_SERVICE, MANDATE_EUROS };
