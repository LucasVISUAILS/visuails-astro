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
  PLAN_IDS, SUB_PLAN_IDS, TERM_IDS, PLAN_SERVICE, monthlyCents, productsFor,
  planProductBudget, fitsBudget, fitsProducts,
} from '../data/plans.js';
import { planName } from '../data/planNames.js';
import {
  MANDATE_AMOUNT, CUSTOM_MONTH_ID, CUSTOM_MONTH_MIN_PRODUCTS, CUSTOM_MONTH_MAX_PRODUCTS,
  customMonthSlots, customMonthTotal,
} from '../data/pricing.js';
import { subMaandCents, subProducten } from './slots.js';
import {
  createMollieCustomer, createFirstPayment, firstPaymentMandate, createMollieSubscription,
  cancelMollieSubscription, mollieKeyProblems,
} from './mollie.js';

/*
 * DE MANDAATBETALING IS € 1 EN NIET DE EERSTE MAAND.
 *
 * Twee redenen, en de tweede is de belangrijkste:
 *
 *   · Mollie geeft alleen een mandaat af uit een ECHTE transactie. Nul euro kan
 *     niet — createFirstPayment() weigert dat expliciet.
 *   · (Tot 4 september 2026 stond hier: de eerste maand hoort via de subscription
 *     te lopen, anders mist de maandboekhouding een maand. Dat is opgelost aan de
 *     andere kant: de webhook schrijft de eerste betaling — herkenbaar aan
 *     `sub_ref` — óók in subscription_payments en kent de maand toe. Zie
 *     recordSubscriptionPaid() in functions/api/webhook/mollie.js.)
 *
 * De eerste betaling is dus de eerste MAAND, en de subscription begint bij
 * eersteTermijn(): dezelfde dag, volgende maand. Zo betaalt de klant één keer per
 * maand, vanaf de dag dat hij ja zegt, en heeft hij meteen saldo.
 */
/* Uit src/data/pricing.js: elk bedrag op de site komt daarvandaan, en de copy op
   /plans en in PlanPicker leest hem inmiddels ook. */
/* MANDATE_AMOUNT blijft de ondergrens die createFirstPayment() eist; het bedrag
   zelf is sinds 4 september 2026 de eerste maand — zie de noot bij de aanroep. */
const MANDATE_EUROS = MANDATE_AMOUNT;

/**
 * Waar de klant heen gaat als er iets niet lukt. Eén plek, zodat de reden in de
 * URL consistent is.
 *
 * ── DE TAAL GAAT MEE, 18 augustus 2026 ────────────────────────────────────
 *
 * Dit gaf altijd `/start/plan`, en dat is de Engelse pagina. Een Nederlandse
 * klant die op /nl/start/plan een abonnement probeerde af te sluiten en tegen
 * een volle agenda of een weigerende Mollie aanliep, werd dus naar een Engelse
 * pagina gestuurd om een fout te lezen die hij niet had verwacht. Dat is de
 * verkeerde kant om iemand kwijt te raken: hij was op het punt om te betalen.
 *
 * De taal staat in het formulier — <input type="hidden" name="lang"> in
 * PlanPicker.astro. Ze werd alleen pas op de helft van deze functie uitgelezen,
 * ná drie van de vijf plekken die hier terugvallen. Nu leest hij hem één keer,
 * bovenaan, en geeft hem door.
 */
function terug(reden, lang) {
  const pad = lang === 'en' ? '/start/plan' : '/nl/start/plan';
  return `${pad}?fout=${encodeURIComponent(reden)}`;
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
  let termId = String(form?.get('term') || 'monthly');
  const windowDay = Number.parseInt(String(form?.get('window_day') || ''), 10);
  /* Bovenaan en niet halverwege: terug() heeft hem nodig en die wordt hieronder
     vijf keer aangeroepen, waarvan drie keer vóór de plek waar deze regel
     stond. Zie de noot bij terug(). */
  const lang = String(form?.get('lang') || 'nl') === 'en' ? 'en' : 'nl';

  if (!SUB_PLAN_IDS.includes(planId)) return seeOtherLocal(terug('plan', lang));

  /*
   * ── DE MAAND OP MAAT WORDT HIER OPNIEUW UITGEREKEND, EN DAT IS HET PUNT ────
   *
   * Het formulier stuurt drie aantallen en verder niets. Geen bedrag, geen
   * bundel, geen prijs uit de browser — die zou de klant kunnen verzinnen, en dit
   * is het formulier waar een machtiging uit volgt. Wat er wordt afgeschreven,
   * komt uit customMonthTotal() over de aantallen die de server heeft goedgekeurd.
   *
   * DRIE GRENZEN, EN ALLE DRIE OM EEN ANDERE REDEN:
   *   · minstens CUSTOM_MONTH_MIN_PRODUCTS — Lucas' ondergrens (31 aug 2026);
   *     onder dat aantal is een losse bestelling eerlijker dan een abonnement.
   *   · hoogstens CUSTOM_MONTH_MAX_PRODUCTS — boven dat aantal is het een gesprek,
   *     want dan gaat het over een groot deel van een maand studio.
   *   · carrousels <= producten — een carrousel hoort bij een product dat er is.
   *     customMonthTotal() gooit hierop; die worp hoort niet bij een bezoeker
   *     terecht te komen als een 500, dus staat de toets hier ervoor.
   *
   * EN ALTIJD MAANDELIJKS. De jaartermijn geeft korting die uit PLAN_AMOUNT komt
   * (zie discountMonths in plans.js) en een maand op maat heeft dat bedrag niet.
   * Een jaartermijn zonder korting zou een verbintenis zijn waar niets tegenover
   * staat; die verkopen we niet.
   */
  let maatSlots = null;
  let maatCents = null;
  let maatProducten = 0;
  if (planId === CUSTOM_MONTH_ID) {
    termId = 'monthly';
    const n = Number.parseInt(String(form?.get('producten') || ''), 10);
    const m = Number.parseInt(String(form?.get('carrousels') || '0'), 10) || 0;
    const k = Number.parseInt(String(form?.get('clips') || '0'), 10) || 0;
    if (!Number.isInteger(n) || n < CUSTOM_MONTH_MIN_PRODUCTS || n > CUSTOM_MONTH_MAX_PRODUCTS) {
      return seeOtherLocal(terug('maat', lang));
    }
    if (!Number.isInteger(m) || m < 0 || m > n) return seeOtherLocal(terug('maat', lang));
    if (!Number.isInteger(k) || k < 0 || k > CUSTOM_MONTH_MAX_PRODUCTS) return seeOtherLocal(terug('maat', lang));
    maatSlots = customMonthSlots({ products: n, carousels: m, clips: k });
    maatCents = Math.round(customMonthTotal({ products: n, carousels: m, clips: k }).total * 100);
    maatProducten = n;
    if (!(maatCents > 0)) return seeOtherLocal(terug('maat', lang));
  }

  if (!TERM_IDS.includes(termId)) return seeOtherLocal(terug('termijn', lang));

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
    /* slots_json erbij sinds migratie 0038: bij een maand op maat zegt de plan-id
       niets over hoeveel agenda er vastligt. Zie subProducten() in slots.js. */
    `SELECT plan, slots_json FROM subscriptions WHERE status IN ('active', 'pending', 'paused')`
  ).all().catch(() => ({ results: [] }));
  const vastgelegd = (bezet?.results || []).reduce((n, r) => n + subProducten(r), 0);
  const past = planId === CUSTOM_MONTH_ID
    ? fitsProducts(maatProducten, vastgelegd)
    : fitsBudget(planId, vastgelegd);
  if (!past) {
    console.error('[abonnement] plek geweigerd —', planId, 'bij', vastgelegd, 'van', planProductBudget());
    return seeOtherLocal(terug('vol', lang));
  }

  let rij;
  try {
    const gemaakt = await createSubscriptionRow(env, {
      customerId: customer.customer_id, planId, termId, windowDay,
      slots: maatSlots, amountCents: maatCents,
    });
    if (gemaakt.bestaat) return seeOtherLocal('/account/plan');
    rij = gemaakt.row;
  } catch (err) {
    console.error('[abonnement] rij niet aangemaakt —', err?.message || err);
    return seeOtherLocal(terug('opslaan', lang));
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
    return seeOtherLocal(terug('mollie', lang));
  }

  const origin = new URL(request.url).origin;

  let checkout;
  try {
    /* ── DE EERSTE BETALING IS DE EERSTE MAAND — 4 september 2026 ──────────
       Tot vandaag was dit MANDATE_EUROS (€ 1): alleen de machtiging, en de eerste
       échte termijn viel een maand later. Gevolg: een abonnee had een lopend
       abonnement zonder saldo tot de eerste afschrijving — een maand wachten op
       iets waar hij net ja op had gezegd. Lucas: de eerste maand meteen
       incasseren, en de eerste week meteen plannen.

       Dezelfde betaling geeft nog steeds het mandaat af (sequenceType 'first');
       de webhook kent de maand toe op `sub_ref` (zie mollie.js in functions/api/
       webhook) en de Mollie-subscription begint bij eersteTermijn(), dus er wordt
       niet twee keer in dezelfde maand afgeschreven. */
    const betaling = await createFirstPayment(env, {
      subscriptionRef: rij.ref,
      mollieCustomerId,
      valueEuros: subMaandCents(rij) / 100,
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
    return seeOtherLocal(terug('mollie', lang));
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

  return koppelSubscription(env, vol, new URL(request.url).origin);
}

/**
 * Het mandaat ophalen en de Mollie-subscription aanmaken — de stap die van een
 * betaalde eerste maand een lopend abonnement maakt.
 *
 * ── TWEE AANROEPERS SINDS 4 SEPTEMBER 2026 ──────────────────────────────────
 * De terugkeerpagina (hierboven) én de webhook van de eerste betaling. Die tweede
 * bestaat omdat de eerste maand nu meteen wordt geïncasseerd en toegekend: een
 * klant die na het betalen zijn tabblad sluit en nooit op /account/plan/return
 * landt, zou anders een actief abonnement met saldo hebben — en geen Mollie-
 * subscription die volgende maand afschrijft. De webhook dicht dat gat; komt de
 * klant daarna alsnog terug, dan ziet die pagina `mollie_subscription_id` staan en
 * zegt gewoon dat het loopt.
 */
export async function koppelSubscription(env, vol, origin) {
  if (vol?.mollie_subscription_id) return { staat: 'actief', sub: vol };
  if (!vol?.mollie_customer_id) return { staat: 'wacht', sub: vol };

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

  /* subMaandCents() en niet monthlyCents(): bij een maand op maat staat het bedrag
     op de rij, bevroren op het moment van afsluiten. Zie migratie 0038 voor
     waarom het daar staat en niet elke maand opnieuw uit de ladder komt. */
  const maandBedrag = subMaandCents(vol) / 100;

  try {
    const sc = await createMollieSubscription(env, {
      mollieCustomerId: vol.mollie_customer_id,
      mandateId: mandaat.id,
      valueEuros: maandBedrag,
      description: `VISUAILS ${vol.plan} — ${vol.ref}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
      /* VANAF DE VOLGENDE MAAND. De klant heeft zojuist zijn eerste maand betaald
         (dezelfde betaling die het mandaat afgeeft); de tweede termijn hoort een
         maand later te vallen, anders betaalt hij twee keer in dezelfde week. */
      startDate: eersteTermijn(),
      /* Een jaarverbintenis stopt zichzelf na twaalf termijnen. Netter dan
         onthouden dat er iets opgezegd moet worden — zie de noot bij `times` in
         mollie.js. */
      /* Elf en niet twaalf sinds de eerste betaling de eerste maand IS: één
         betaald bij het afsluiten, elf via de subscription = twaalf termijnen. */
      times: vol.term === 'yearly' ? 11 : undefined,
    });
    if (!sc?.id) throw new Error('Mollie gaf geen abonnements-id terug');
    await setMollieIds(env, vol.id, { subscriptionId: sc.id });
    await activateSubscription(env, vol.id);
  } catch (err) {
    console.error('[abonnement] subscription niet aangemaakt —', err?.message || err);
    return { staat: 'wacht', sub: vol };
  }

  return { staat: 'gelukt', sub: await loadSubscription(env, vol.customer_id) };
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * STOPPEN EN HERVATTEN — 18 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WAT HIER MIS WAS, EN HET KOSTTE KLANTEN GELD. `cancelMollieSubscription()`
 * stond sinds 16 augustus in mollie.js en werd door NIETS aangeroepen — niet
 * door opzeggen, niet door pauzeren. Alleen een importtest noemde hem. Het
 * commentaar bij handlePlanPause in account.js zei het zelf: "De Mollie-kant
 * wordt in de aanmeldstroom aangesloten", en dat is blijven staan.
 *
 * Gevolg: een klant typte CANCEL, de rij ging op `cancelled`, zijn dashboard
 * zei dat het opgezegd was — en Mollie schreef de maand daarna gewoon € 390 tot
 * € 1.690 af. Precies de terugboeking bij de bank die handlePlanCancel's eigen
 * commentaar als reden noemt om opzeggen juist makkelijk te maken.
 *
 * ── DE VOLGORDE IS HET HELE ONTWERP ───────────────────────────────────────
 *
 * EERST MOLLIE, DAN DE DATABASE. Beide kanten kunnen falen, en de twee
 * mislukkingen zijn niet even erg:
 *
 *   · Mollie gestopt, database mislukt → er wordt niets meer afgeschreven en de
 *     klant houdt een saldo waar hij voor betaald heeft. Wij verliezen; hij niet.
 *   · Database gestopt, Mollie mislukt → zijn scherm zegt "opgezegd" en er gaat
 *     elke maand geld af. Dat is precies de fout die we repareren.
 *
 * Dus wordt de rij pas bijgewerkt als de incasso aantoonbaar stil staat, en bij
 * een mislukking blijft het abonnement zichtbaar lopen mét een foutmelding. Een
 * scherm dat "opgezegd" zegt terwijl er wordt afgeschreven, is de ene toestand
 * die niet mag bestaan.
 *
 * ── PAUZEREN IS BIJ MOLLIE OOK STOPPEN ────────────────────────────────────
 *
 * De Subscriptions API kent geen pauze: je verwijdert een abonnement en maakt
 * later een nieuw aan. Pauzeren is hier dus intern een pauze en bij Mollie een
 * beëindiging, en `mollie_subscription_id` wordt leeggemaakt omdat dat id dood
 * is. Hervatten bouwt een NIEUWE subscription op het mandaat dat we al hebben —
 * het mandaat blijft geldig, dus er hoeft niet opnieuw betaald of getekend te
 * worden.
 *
 * ── WAT ER NIET GEBEURT ───────────────────────────────────────────────────
 *
 * Geen terugbetaling en geen leeggemaakt saldo. Voor de lopende maand is
 * betaald; die producten blijven staan tot het eind van de maand waarin ze
 * vervallen. Zie de noot bij cancelSubscription() in subscription.js — die
 * afweging is niet veranderd, alleen de incasso stopt er nu echt bij.
 */

/** Er valt bij Mollie alleen iets te stoppen als er een lopend abonnement is. */
function heeftMollieAbonnement(sub) {
  return Boolean(sub?.mollie_customer_id && sub?.mollie_subscription_id);
}

/**
 * Zet de incasso stil. Geeft `true` als er daarna zeker niets meer wordt
 * afgeschreven, en `false` als dat niet vastgesteld kon worden.
 *
 * EEN ABONNEMENT ZONDER MOLLIE-ID IS AL STIL. Dat is de normale toestand van een
 * `pending` abonnement waarvan het mandaat nooit is getekend: er is niets
 * aangemaakt, dus er is niets te stoppen, en dat telt als geslaagd.
 *
 * ONTBREEKT DE SLEUTEL TERWIJL ER WÉL EEN ABONNEMENT IS, dan is dat een
 * configuratiefout en geen succes. Stil `true` teruggeven zou het scherm laten
 * liegen op precies de manier die deze reparatie wegneemt.
 */
export async function stopIncasso(env, sub) {
  if (!heeftMollieAbonnement(sub)) return true;
  if (mollieKeyProblems(env)) {
    console.error('[abonnement] incasso niet gestopt — Mollie-sleutel:', mollieKeyProblems(env).join(', '));
    return false;
  }
  try {
    await cancelMollieSubscription(env, {
      mollieCustomerId: sub.mollie_customer_id,
      subscriptionId: sub.mollie_subscription_id,
    });
    return true;
  } catch (err) {
    console.error('[abonnement] incasso niet gestopt —', err?.message || err);
    return false;
  }
}

/**
 * Hervatten: een nieuwe subscription op het mandaat dat er al ligt.
 *
 * GEEN NIEUWE MANDAATBETALING. Het mandaat van € 1 is één keer getekend en
 * blijft geldig tot de klant het bij zijn bank intrekt; er opnieuw om vragen zou
 * betekenen dat pauzeren duurder is dan doorbetalen.
 *
 * `startDate` op de eerstvolgende termijn, om dezelfde reden als bij het
 * afsluiten: hervatten op een dag halverwege de maand mag geen extra
 * afschrijving opleveren in een maand waarvoor al betaald is.
 *
 * `times` bij een jaartermijn is BEWUST NIET herberekend op de resterende
 * maanden — dat zou een tweede plek zijn waar de looptijd wordt geteld, en de
 * eerste (het aantal maandrijen) is de boekhouding. Wie hier gaat rekenen,
 * bouwt een tweede waarheid.
 */
export async function hervatIncasso(env, sub, origin) {
  if (!sub?.mollie_customer_id || !sub?.mollie_mandate_id) return false;
  if (mollieKeyProblems(env)) return false;
  try {
    const sc = await createMollieSubscription(env, {
      mollieCustomerId: sub.mollie_customer_id,
      mandateId: sub.mollie_mandate_id,
      valueEuros: monthlyCents(sub.plan, sub.term) / 100,
      description: `VISUAILS ${sub.plan} — ${sub.ref}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
      startDate: eersteTermijn(),
      times: sub.term === 'yearly' ? 12 : undefined,
    });
    if (!sc?.id) throw new Error('Mollie gaf geen abonnements-id terug');
    await setMollieIds(env, sub.id, { subscriptionId: sc.id });
    return true;
  } catch (err) {
    console.error('[abonnement] incasso niet hervat —', err?.message || err);
    return false;
  }
}

export { PLAN_SERVICE, MANDATE_EUROS };
