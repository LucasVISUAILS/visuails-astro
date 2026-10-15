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
 * De klant kiest plan en termijn. (De dag van een vaste week hoorde er tot ronde
 * 10 bij; die week is weg sinds 8 oktober 2026, §28.) Wij leggen een rij
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
 * ── WIE ER EEN ABONNEMENT KAN AFSLUITEN — HERZIEN 9 SEPTEMBER 2026 ─────────
 *
 * Hier stond: *"Alleen wie is ingelogd (…) Wil je dat wél openzetten, dan is dit
 * de plek waar die beslissing hoort — en dan hoort er een accountaanmaak bij,
 * niet een uitzondering hier."*
 *
 * Lucas: *"Iemand kan geen abonnement afsluiten zonder een account te hebben."*
 * Die beslissing is dus genomen, en precies zoals de oude noot voorschreef: MET
 * een accountaanmaak, en zonder uitzondering in dit bestand.
 *
 * Hoe het nu loopt:
 *
 *   INGELOGD    /account/plan/start, achter de sessiecontrole in account.js.
 *               Onveranderd.
 *   UITGELOGD   /api/plan (functions/api/plan.js). Die ingang vraagt dezelfde
 *               gegevens als het bestelformulier, maakt of vindt de klant met
 *               upsertCustomer(), en roept daarna DEZE functie aan met die
 *               klant. Eén validatie, één capaciteitspoort, één Mollie-pad.
 *
 * Het account ontstaat dus nog steeds uit een handeling en niet uit een
 * registratieformulier — alleen is "bestellen" nu ook "een abonnement
 * afsluiten". Inloggen gaat daarna zoals altijd: een e-mail met een link, geen
 * wachtwoord.
 *
 * WAT DIT NIET VERZWAKT: de machtiging komt nog steeds uit een ECHTE betaling
 * bij Mollie, met iDEAL of een kaart op naam. Wie betaalt, is wie tekent — een
 * ingetypt e-mailadres van iemand anders levert geen mandaat op.
 */

import { withdrawalRecord } from '../data/consent.js';
import {
  createSubscriptionRow, loadSubscription, subscriptionByRef,
  setMollieIds, activateSubscription, termijnMaand, termijnEinde,
} from './subscription.js';
import {
  PLAN_IDS, SUB_PLAN_IDS, TERM_IDS, OFFERED_TERM_IDS, PLAN_SERVICE, monthlyCents, productsFor,
  creditsPassen, planPast, isPrepaid,
} from '../data/plans.js';
/* De rem op abonnementen, in credits (6.05): dezelfde stand als /api/plan-plek en /admin. */
import { aboStand } from './aboPlafond.js';
import { planName } from '../data/planNames.js';
import { regKindFor, REG_KIND, looksLikeKvk } from '../data/business.js';
import { vatDecision, normaliseVat, viesCode, HOME_COUNTRY, vatFormatOk, VAT_TREATMENT, ipLandVraagtNakijken } from '../data/vat.js';
import { notifyAboBtwNakijken } from './notify.js';
import { checkVat } from './vies.js';
import {
  MANDATE_AMOUNT, CUSTOM_MONTH_ID,
  isCustomCredits, customCreditsTotal, creditsProductEquivalent,
} from '../data/pricing.js';
import { subMaandCents, subEersteBetalingCents, subMaandBruto, subEersteBetalingBruto, subProducten } from './slots.js';
import {
  createMollieCustomer, createFirstPayment, firstPaymentMandate, createMollieSubscription,
  cancelMollieSubscription, mollieKeyProblems, mollieAbonnementVoorRef,
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
/* `vooraf` — 9 september 2026. Een al ingelezen FormData.
 *
 * Een verzoeklichaam kun je maar één keer lezen. Sinds er een publieke ingang
 * bestaat (/api/plan, voor wie nog geen account heeft) moet die ingang het
 * formulier ZELF lezen — hij haalt er de klantgegevens uit en maakt daarmee de
 * klant aan — en daarna kan deze functie er niet meer bij. Dus geeft hij hem
 * door. Blijft leeg bij de bestaande aanroep vanuit account.js, en dan leest
 * deze functie hem gewoon zelf, precies zoals hij dat altijd deed. */
export async function handleSubscribeStart(context, customer, offsite, vooraf = null) {
  const { env, request } = context;
  const form = vooraf || await request.formData().catch(() => null);

  const planId = String(form?.get('plan') || '');
  let termId = String(form?.get('term') || 'monthly');
  /* `window_day` (de dag van de vaste week) wordt niet meer gelezen of
     geschreven: het weeksysteem is weg (ronde 10, 8 oktober 2026). Een oud
     formulier dat hem nog meestuurt, wordt gewoon genegeerd. */
  /* Bovenaan en niet halverwege: terug() heeft hem nodig en die wordt hieronder
     vijf keer aangeroepen, waarvan drie keer vóór de plek waar deze regel
     stond. Zie de noot bij terug(). */
  const lang = String(form?.get('lang') || 'nl') === 'en' ? 'en' : 'nl';

  if (!SUB_PLAN_IDS.includes(planId)) return seeOtherLocal(terug('plan', lang));

  /* ── SINDS 23 SEPTEMBER 2026 IN CREDITS ──────────────────────────────────
     Het formulier stuurt één getal: `credits`. De prijs komt van dezelfde lijn
     als de drie vaste plannen (customCreditsTotal() in pricing.js) en wordt hier
     opnieuw uitgerekend — nooit uit de browser. De bundel op de rij is
     `{"credits": N}`; creditsVoor() in slots.js leest dat als N credits per maand.
     Oudere maanden op maat (per soort) blijven gewoon lezen zoals ze lazen.
     Altijd maandelijks: de jaar- en vooruitbetaalde termijn horen bij de vaste
     plannen, waar hun voordelen op berekend zijn. */
  let maatSlots = null;
  let maatCents = null;
  let maatProducten = 0;
  if (planId === CUSTOM_MONTH_ID) {
    termId = 'monthly';
    const ruw = String(form?.get('credits') ?? '').trim();
    const n = /^\d{1,4}$/.test(ruw) ? Number(ruw) : NaN;
    if (!isCustomCredits(n)) return seeOtherLocal(terug('maat', lang));
    maatSlots = { credits: n };
    maatCents = Math.round(customCreditsTotal(n).total * 100);
    maatProducten = creditsProductEquivalent(n);
    if (!(maatCents > 0)) return seeOtherLocal(terug('maat', lang));
  }

  /* Alleen de termijnen uit het aanbod (6.04, 8 oktober 2026): maandelijks en
     jaar vooruit. 'yearly' bestaat nog voor lopende abonnementen, maar een
     nieuw abonnement kan hem niet meer kiezen. */
  if (!OFFERED_TERM_IDS.includes(termId)) return seeOtherLocal(terug('termijn', lang));

  /* ── DE VERKLARING, OOK VOOR WIE INGELOGD IS — 1 oktober 2026 (ronde 8, B-B3) ──
     /api/plan weigerde zonder de zakelijke verklaring; de ingelogde route
     (/account/plan/start) kwam hier direct en sloeg hem over. De toets staat nu
     hier, zodat beide ingangen hem doen. */
  if (String(form?.get('business_declaration') || '').trim() !== 'yes' || withdrawalRecord({
    withdrawal: String(form?.get('withdrawal_consent') || '').trim(),
    consentVersion: String(form?.get('consent_version') || '').trim(),
    business: String(form?.get('business_declaration') || '').trim(),
    businessVersion: String(form?.get('business_version') || '').trim(),
  }) === 'MISSING') {
    return seeOtherLocal(terug('verklaring', lang));
  }

  /* ── BEDRIJF EN BTW, PER LAND — 29 september 2026 ──────────────────────────
     Zie bepaalBedrijfEnBtw() onderaan. Hier wordt het afgedwongen (het formulier
     doet het ook, maar een formulier is niet de waarheid) en het tarief bepaald
     dat op de rij komt. Tot vandaag rekende een abonnement altijd 21%, tenzij de
     klant eerder een bestelling met een bij VIES bevestigd nummer had betaald —
     ook voor een bedrijf in de Verenigde Staten, dat helemaal geen btw hoort te
     betalen, terwijl het formulier "met een geldig nummer verleggen we de btw"
     beloofde. */
  const ipLand = String(request?.cf?.country || '').trim().toUpperCase().slice(0, 2);
  const bedrijf = await bepaalBedrijfEnBtw(env, form, customer.customer_id, ipLand);
  if (bedrijf.fout) return seeOtherLocal(terug(bedrijf.fout, lang));

  /* ── LAND BUITEN DE EU, IP IN DE EU: EERST NAKIJKEN — 8 oktober 2026 (o16) ──
     Een bestelling met deze combinatie gaat op de btw-lijst in /admin; een
     abonnement heeft die lijst niet. Dus gaat het hier niet naar Mollie: Lucas
     krijgt een mail met alles erbij, en de klant leest een gewone melding
     (`?fout=nakijken`, in PlanPicker.astro als mededeling en niet als fout) dat
     we zijn gegevens eerst nakijken en dat er niets is afgeschreven. Keurt Lucas
     het land goed op de klantpagina (customers.btw_land_akkoord, migratie 0053),
     dan gaat een volgende poging gewoon door. */
  if (bedrijf.nakijken) {
    const rij = await env.DB.prepare('SELECT email, brand, phone FROM customers WHERE id = ?1')
      .bind(customer.customer_id).first().catch(() => null);
    await notifyAboBtwNakijken(env, {
      customerId: customer.customer_id,
      email: rij?.email || customer.email || '',
      brand: rij?.brand || customer.brand || '',
      phone: rij?.phone || '',
      plan: planName(planId, 'nl'),
      term: termId,
      land: bedrijf.nakijken.land,
      ipLand: bedrijf.nakijken.ipLand,
    });
    return seeOtherLocal(terug('nakijken', lang));
  }

  /* AL EEN ABONNEMENT? Dan niet nog een. De partiële UNIQUE index vangt dit ook,
     maar een klant die per ongeluk twee tabbladen open heeft, hoort een uitleg te
     zien en geen databasefout. */
  let bestaand = await loadSubscription(env, customer.customer_id);
  /* ── EEN NOOIT BETAALDE AANMELDING STAAT EEN NIEUWE POGING NIET IN DE WEG ──
     24 september 2026. Een eerste betaling die mislukte, werd afgebroken of
     verliep, liet een rij op 'pending' achter zonder mandaat, zonder Mollie-
     subscription en zonder één betaalde maand. Wie het opnieuw probeerde, werd
     naar /account/plan gestuurd — waar geen betaalknop staat — en zat vast.
     Zo'n rij is geen abonnement maar een afgebroken aanmelding: hij gaat op
     'cancelled' met een reden, en de nieuwe poging loopt gewoon door. */
  if (bestaand && bestaand.status === 'pending' && !bestaand.mollie_mandate_id && !bestaand.mollie_subscription_id) {
    /* Pas na een half uur: daarvoor kan de eerste betaling nog lopen (iDEAL
       verloopt na 15 minuten, een kaart na 30), en twee tabbladen mogen geen
       twee abonnementen opleveren. Een betaling die Mollie als mislukt meldt,
       sluit de webhook meteen af — zie functions/api/webhook/mollie.js. */
    const betaald = await env.DB.prepare(
      `SELECT 1 AS er FROM subscription_months WHERE subscription_id = ?1
       UNION ALL SELECT 1 FROM subscriptions WHERE id = ?1 AND created_at > datetime('now', '-30 minutes')
       LIMIT 1`
    ).bind(bestaand.id).first().catch(() => ({ er: 1 }));
    if (!betaald) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'),
                cancel_reason = 'eerste betaling niet afgerond — opnieuw aangemeld'
          WHERE id = ?1 AND status = 'pending'`
      ).bind(bestaand.id).run();
      bestaand = null;
    }
  }
  if (bestaand) return seeOtherLocal('/account/plan');

  /*
   * DE CAPACITEITSPOORT, EN HIJ STAAT HIER OM DEZELFDE REDEN ALS BIJ EEN
   * BESTELLING MET EEN VENSTER: je kunt niet meer beloven dan je kunt maken.
   *
   * Sinds 6.05 (8 oktober 2026) een plafond in CREDITS: de maandcredits van
   * alle abonnementen samen, tegen het plafond dat Lucas in /admin zet (of
   * ABO_CREDITS_PLAFOND in plans.js). Wat er al vast ligt, wordt geteld over de
   * database en niet aangenomen — zie bezetting() in subscription.js. Past dit
   * plan er niet meer bij, dan is dat geen storing maar een volle maand, en dat
   * hoort de klant te lezen voordat hij een machtiging afgeeft en niet erna.
   */
  /* De telling staat in bezetting() (subscription.js), en /start/plan leest
     dezelfde functie om VOORAF te zeggen wat er nog past — zie
     functions/api/plan-plek.js. Eén telling, dus de pagina en de poort kunnen
     het niet oneens zijn. */
  const { credits: vastgelegd, plafond } = await aboStand(env);
  const past = planId === CUSTOM_MONTH_ID
    ? creditsPassen(maatSlots?.credits || 0, vastgelegd, plafond)
    : planPast(planId, vastgelegd, plafond);
  if (!past) {
    console.error('[abonnement] plek geweigerd —', planId, 'bij', vastgelegd, 'van', plafond, 'credits per maand');
    return seeOtherLocal(terug('vol', lang));
  }

  let rij;
  try {
    const gemaakt = await createSubscriptionRow(env, {
      customerId: customer.customer_id, planId, termId,
      slots: maatSlots, amountCents: maatCents, btw: bedrijf.btw,
    });
    if (gemaakt.bestaat) return seeOtherLocal('/account/plan');
    rij = gemaakt.row;
    /* De versie van de twee verklaringen erbij (migratie 0049). Aparte UPDATE:
       zonder de kolommen blijft het abonnement gewoon staan en wordt alleen dit
       gelogd — hetzelfde patroon als origin_country op een bestelling. */
    const bv = String(form?.get('business_version') || '').slice(0, 40);
    const cv = String(form?.get('consent_version') || '').slice(0, 40);
    if (rij?.id && (bv || cv)) {
      await env.DB.prepare('UPDATE subscriptions SET business_declaration = ?2, withdrawal_consent = ?3 WHERE id = ?1')
        .bind(rij.id, bv || null, cv || null).run()
        .catch((e) => console.error('[abonnement] verklaringen niet bewaard (migratie 0049?) —', e?.message || e));
    }
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
    /* ── EN OP EEN VOORUITBETAALD JAAR IS HET HET HELE JAAR — 10 sept 2026 ──
       Lucas: *"daarom betaal je ook een jaar vooruit."* subEersteBetalingCents()
       geeft daar prepayTotalCents() terug in plaats van één maand; op de twee
       andere termijnen verandert er niets. Zie slots.js. */
    const betaling = await createFirstPayment(env, {
      subscriptionRef: rij.ref,
      mollieCustomerId,
      /* BRUTO en niet netto — zie de kop van subBrutoCents() in slots.js. De
         prijs op /plans is exclusief btw; wat er wordt afgeschreven is inclusief,
         en de factuur rekent daar weer netto uit terug. */
      valueEuros: subEersteBetalingBruto(rij) / 100,
      /* Geen mandaat vragen voor een jaar dat in één keer betaald is — en dat is
         ook wat bankoverschrijving als betaalmethode mogelijk maakt. Zie de noot
         bij `sequenceType` in mollie.js. */
      oneOff: isPrepaid(rij.term),
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
  /* ── ALLEEN EEN NIEUW OF LOPEND ABONNEMENT — 15 oktober 2026 ───────────────
     Koppelen maakt een incasso en zet een nieuw abonnement aan. Een abonnement
     dat stilstaat (pauze, terugboeking, mislukte incasso) of is opgezegd, blijft
     daar af. Gevonden bij de controle van levering 52: sinds een terugboeking de
     incasso stopt (en het Mollie-id wist), zag de webhook van een teruggeboekte
     EERSTE betaling "nog geen Mollie-abonnement", koppelde opnieuw en zette het
     stilgezette abonnement weer aan. Hervatten gaat via hervatIncasso(). */
  if (!['pending', 'active'].includes(vol.status)) return { staat: 'wacht', sub: vol };

  /* ── EEN VOORUITBETAALD JAAR KRIJGT GEEN SUBSCRIPTION — 10 september 2026 ──
   *
   * Het hele jaar is met de eerste betaling voldaan; een Mollie-subscription
   * ernaast zou elke maand nóg een keer afschrijven. Er is dus ook geen mandaat
   * nodig — en dat is meer dan een besparing: een klant die per iDEAL betaalt en
   * geen doorlopende machtiging wil afgeven, kan hierdoor gewoon een jaar kopen.
   *
   * De maandelijkse TOEKENNING loopt niet via de betaling maar via de
   * maandtaak (zie subscription.js), en die kijkt naar de rij en niet naar
   * Mollie. Twaalf maanden budget komen dus gewoon binnen. */
  if (isPrepaid(vol.term)) {
    if (vol.status === 'pending') await activateSubscription(env, vol.id);
    return { staat: 'gelukt', sub: await loadSubscription(env, vol.customer_id) };
  }

  /* ── ÉÉN TEGELIJK — 15 oktober 2026 ───────────────────────────────────────
     Vier aanroepers: de webhook, de terugkeerpagina, Studio (bij elke keer
     Abonnement openen) en de nacht. Komen de webhook en de terugkeerpagina
     tegelijk, dan lazen ze allebei "nog geen Mollie-abonnement" en maakten ze er
     allebei een: twee incasso's per maand. Nu pakt er één het slot (een rij in
     rate_limits, twee minuten geldig, ook als een poging halverwege stopt); de
     andere zegt 'wacht', en de eerste maakt het af. */
  const slot = `koppel:${vol.id}`;
  if (!(await pakSlot(env, slot, 120))) return { staat: 'wacht', bezig: true, sub: vol };
  try {
    /* Wie het slot had, kan het intussen al gedaan hebben. */
    const nu = await loadSubscription(env, vol.customer_id);
    if (nu?.id === vol.id && nu.mollie_subscription_id) return { staat: 'actief', sub: nu };
    if (nu?.id === vol.id) vol = nu;
    if (!['pending', 'active'].includes(vol.status)) return { staat: 'wacht', sub: vol };

    let mandaat;
    try {
      mandaat = await firstPaymentMandate(env, vol.mollie_customer_id);
    } catch (err) {
      console.error('[abonnement] mandaat niet op te halen —', err?.message || err);
      return { staat: 'wacht', sub: vol };
    }
    /* Nog geen mandaat, ook niet in 'pending': de eerste betaling is nog niet
       rond. Geen fout — zie de kop, en firstPaymentMandate() in mollie.js. */
    if (!mandaat?.id) return { staat: 'wacht', sub: vol };
    /* Een mandaat in 'pending' alleen als de eerste maand betaald is: dan staat
       de rij op 'active' (de webhook van die betaling zet hem zo). Een mandaat is
       ook 'pending' zolang de eerste betaling nog open staat, en wie dan via
       "terug naar de webshop" op de terugkeerpagina landt, mag geen lopend
       abonnement krijgen. 'valid' betekent dat de betaling rond is. */
    if (mandaat.status !== 'valid' && vol.status !== 'active') return { staat: 'wacht', sub: vol };

    await setMollieIds(env, vol.id, { mandateId: mandaat.id });

    /* subMaandBruto() en niet monthlyCents(): bij een maand op maat staat het
       bedrag op de rij, bevroren op het moment van afsluiten (zie migratie 0038
       voor waarom het daar staat en niet elke maand opnieuw uit de ladder komt),
       en er gaat btw overheen omdat de prijs op /plans exclusief is. Zie de kop
       van subBrutoCents() in slots.js. */
    const maandBedrag = subMaandBruto(vol) / 100;

    try {
      /* Bestaat hij bij Mollie al (een eerdere poging waarvan het antwoord of het
         opslaan misging), dan die, en geen tweede. */
      const sc = await mollieAbonnementVoorRef(env, vol.mollie_customer_id, vol.ref) || await createMollieSubscription(env, {
        mollieCustomerId: vol.mollie_customer_id,
        mandateId: mandaat.id,
        valueEuros: maandBedrag,
        description: `VISUAILS ${vol.plan} — ${vol.ref}`,
        webhookUrl: `${origin}/api/webhook/mollie`,
        /* VANAF DE VOLGENDE MAAND. De klant heeft zojuist zijn eerste maand betaald
           (dezelfde betaling die het mandaat afgeeft); de tweede termijn hoort een
           maand later te vallen, anders betaalt hij twee keer in dezelfde week.
           Op de dag van het abonnement en niet van vandaag (15 oktober 2026): sinds
           Studio het koppelen opnieuw probeert, kan dat dagen na het afsluiten zijn,
           en dan zou Mollie op een andere dag afschrijven dan Studio noemt. */
        startDate: volgendeTermijn(vol),
        /* Een jaarverbintenis stopt zichzelf na twaalf termijnen. Netter dan
           onthouden dat er iets opgezegd moet worden — zie de noot bij `times` in
           mollie.js. */
        /* Elf en niet twaalf sinds de eerste betaling de eerste maand IS: één
           betaald bij het afsluiten, elf via de subscription = twaalf termijnen. */
        times: vol.term === 'yearly' ? 11 : undefined,
      });
      if (!sc?.id) throw new Error('Mollie gaf geen abonnements-id terug');
      await setMollieIds(env, vol.id, { subscriptionId: sc.id });
      /* Alleen van 'pending' naar 'active'; een lopend abonnement blijft lopen. */
      if (vol.status === 'pending') await activateSubscription(env, vol.id);
    } catch (err) {
      console.error('[abonnement] subscription niet aangemaakt —', err?.message || err);
      return { staat: 'wacht', sub: vol };
    }

    const na = await loadSubscription(env, vol.customer_id);
    /* setMollieIds() zwijgt bij een fout. Staat het id er niet, dan is het niet
       gelukt; de volgende poging vindt hem bij Mollie terug. */
    if (!na?.mollie_subscription_id) return { staat: 'wacht', sub: na || vol };
    return { staat: 'gelukt', sub: na };
  } finally {
    await laatSlot(env, slot);
  }
}

/** Een slot in rate_limits: true als het van ons is (nieuw, of het vorige was verlopen). */
export async function pakSlot(env, bucket, seconden) {
  const nu = new Date();
  try {
    const rij = await env.DB.prepare(
      `INSERT INTO rate_limits (bucket, hits, expires_at) VALUES (?1, 1, ?2)
         ON CONFLICT(bucket) DO UPDATE SET hits = 1, expires_at = excluded.expires_at
         WHERE rate_limits.expires_at < ?3
       RETURNING bucket`
    ).bind(bucket, new Date(nu.getTime() + seconden * 1000).toISOString(), nu.toISOString()).first();
    return !!rij;
  } catch (err) {
    /* Zonder slot (database even weg) liever niet koppelen dan dubbel. */
    console.error('[abonnement] slot niet te pakken —', bucket, '—', err?.message || err);
    return false;
  }
}

async function laatSlot(env, bucket) {
  await env.DB.prepare('DELETE FROM rate_limits WHERE bucket = ?1').bind(bucket).run().catch(() => {});
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

/** De eerstvolgende termijn van een abonnement dat al loopt (zijn eigen dag,
 *  uit started_at), of eersteTermijn() als die niet te bepalen is. */
export function volgendeTermijn(sub, nu = new Date()) {
  /* Nog niet geactiveerd: dat gebeurt nu, en activateSubscription() zet
     started_at op vandaag. Dan is de termijndag die van vandaag, en niet die van
     created_at (een betaling om 23:50 die om 00:05 terugkomt). */
  if (sub?.status !== 'active' && !sub?.started_at) return eersteTermijn(nu);
  try {
    const op = termijnEinde(sub, termijnMaand(sub, nu));
    if (/^\d{4}-\d{2}-\d{2}$/.test(op) && op > nu.toISOString().slice(0, 10)) return op;
  } catch { /* valt terug */ }
  return eersteTermijn(nu);
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
/* `startDate` (8 oktober 2026, 2.07): een pauze die nog niet was ingegaan
   (de klant hervat vóór de volgende afschrijving) hervat op precies die dag,
   zodat er geen termijn wegvalt en er geen dubbel komt. Zonder: eersteTermijn(). */
export async function hervatIncasso(env, sub, origin, { startDate = null } = {}) {
  /* Een vooruitbetaald jaar heeft geen incasso om te hervatten: het is al
     betaald, en er is geen mandaat. `true` en niet `false` — er is niets
     misgegaan, er valt niets te doen. Zie koppelSubscription(). */
  if (isPrepaid(sub?.term)) return true;
  if (!sub?.mollie_customer_id) return false;
  if (mollieKeyProblems(env)) return false;
  /* Geen mandaat op de rij (15 oktober 2026): dat gebeurde als het mandaat bij
     de eerste betaling nog 'pending' was en koppelSubscription() het daarom nooit
     opsloeg. Hervatten mislukte dan altijd ("Het hervatten lukte zojuist niet").
     Nu wordt het hier opgevraagd, net als bij het koppelen. */
  if (!sub.mollie_mandate_id) {
    const m = await firstPaymentMandate(env, sub.mollie_customer_id).catch(() => null);
    if (!m?.id) return false;
    await setMollieIds(env, sub.id, { mandateId: m.id });
    sub = { ...sub, mollie_mandate_id: m.id };
  }
  /* ── HOEVEEL TERMIJNEN ER NOG OVER ZIJN — 23 september 2026 ──────────────
     Hier stond `times: 12` voor een jaartermijn, terwijl koppelSubscription()
     er terecht 11 geeft (de eerste betaling ís de eerste maand). Wie na drie
     maanden pauzeert en hervat, kreeg zo nog twaalf afschrijvingen: vijftien in
     een jaar van twaalf. Nu telt hij de betaalde maanden en hervat hij de rest. */
  let times;
  if (sub.term === 'yearly') {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?1')
      .bind(sub.id).first().catch(() => null);
    const over = 12 - Math.max(0, Number(r?.n) || 0);
    if (over <= 0) return true;
    times = over;
  }
  /* ── ÉÉN TEGELIJK, EN NOOIT EEN TWEEDE — 15 oktober 2026 (levering 52) ──────
     Hervatten kan sinds vandaag ook uit /admin ("Weer laten lopen") en uit de
     webhook (Mollie draait een terugboeking terug). Twee keer klikken, of de knop
     tegelijk met die webhook, maakte twee Mollie-abonnementen: twee incasso's per
     maand. Nu hetzelfde slot als koppelSubscription(), en eerst kijken of de rij
     of Mollie er al een heeft. */
  const slot = `koppel:${sub.id}`;
  if (!(await pakSlot(env, slot, 120))) return false;
  try {
    const rijNu = await env.DB.prepare('SELECT mollie_subscription_id FROM subscriptions WHERE id = ?1').bind(sub.id).first().catch(() => null);
    if (rijNu?.mollie_subscription_id) return true;
    const al = await mollieAbonnementVoorRef(env, sub.mollie_customer_id, sub.ref).catch(() => null);
    if (al?.id) {
      await setMollieIds(env, sub.id, { subscriptionId: al.id });
      return true;
    }
    return await maakHervatAbonnement(env, sub, origin, { startDate, times });
  } finally {
    await laatSlot(env, slot);
  }
}

async function maakHervatAbonnement(env, sub, origin, { startDate, times }) {
  try {
    const sc = await createMollieSubscription(env, {
      mollieCustomerId: sub.mollie_customer_id,
      mandateId: sub.mollie_mandate_id,
      /* ── subMaandBruto() EN NIET monthlyCents() — 17 september 2026 ───────
         Twee fouten in één regel, en de eerste was fataal voor precies één soort
         klant. `monthlyCents('maat', …)` WERPT — een maand op maat staat niet in
         PLAN_AMOUNT, hij draagt zijn bedrag op de rij — dus liep deze functie
         voor elke klant met een eigen samengestelde maand in de catch, gaf
         `false` terug en stuurde account.js naar `?fout=hervatten`. Permanent:
         hervatten kon nooit meer lukken. Overal elders in dit bestand staat al
         subMaandCents() om precies deze reden.
         De tweede is dezelfde als bij koppelSubscription(): er hoort btw
         overheen. Zie de kop van subBrutoCents() in slots.js. */
      valueEuros: subMaandBruto(sub) / 100,
      description: `VISUAILS ${sub.plan} — ${sub.ref}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) ? startDate : eersteTermijn(),
      times,
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

/**
 * ── BEDRIJF EN BTW BIJ HET AFSLUITEN — 29 september 2026 ────────────────────
 *
 * Lucas: *"Het ding bij btw nummer is voornamelijk dat een bedrijf in amerika
 * als voorbeeld alsnog kan bestellen omdat deze geen btw nummer kennen. Bedenk
 * hoe dit systeem simpel blijft voor de klant maar wel op de juiste manier
 * werkt."*
 *
 * Dezelfde regels als het bestelformulier (src/data/business.js):
 *   · Bedrijfsnaam altijd verplicht.
 *   · Nederland: KVK-nummer (acht cijfers), of — voor een oude pagina zonder
 *     dat veld — een btw-nummer. 21%.
 *   · Ander EU-land: btw-nummer, bij VIES gecontroleerd; geldig én door de
 *     klant bevestigd is 0% verlegd, anders 21%. Geen btw-nummer: dan een
 *     registratienummer, en 21%.
 *   · Buiten de EU: geen nummer nodig (de zakelijke verklaring draagt het),
 *     0% buiten de heffing.
 *
 * Geeft `{ fout }` (een reden voor ?fout=) of `{ btw }` in de vorm die
 * createSubscriptionRow() op de rij zet. Leest het formulier, en valt voor wat
 * ontbreekt terug op de klantrij — een oude pagina post misschien geen land.
 *
 * Sinds 8 oktober 2026 (o16) ook `ipLand`, het land van het ip-adres: is het
 * gekozen land buiten de EU en het ip in de EU, en heeft Lucas dat land voor
 * deze klant nog niet goedgekeurd (customers.btw_land_akkoord, migratie 0053),
 * dan komt er `{ nakijken: { land, ipLand } }` bij. Zie handleSubscribeStart().
 */
export async function bepaalBedrijfEnBtw(env, form, customerId, ipLand = '') {
  const t = (k, max) => String(form?.get(k) || '').trim().slice(0, max);
  let land = t('country', 2).toUpperCase();
  let merk = t('brand', 120);
  let btw = t('vat', 32);
  let reg = t('reg_number', 40);
  const geenBtw = !btw && ['1', 'on', 'true', 'yes'].includes(t('no_vat', 5).toLowerCase());
  /* 8.06 (8 oktober 2026): de verklaring zit nu in het zakelijk-vinkje (met de
     verleggingszin), niet meer in een apart vinkje. `vat_confirmed` zegt bij
     welke tekst het vinkje werd gezet; zonder het vinkje zelf telt hij niet. */
  const bevestigd = t('vat_confirmed', 5) === 'yes' && t('business_declaration', 5) === 'yes';

  if ((!land || !merk) && customerId && env?.DB) {
    const rij = await env.DB.prepare('SELECT country, brand, vat_number, reg_number FROM customers WHERE id = ?1')
      .bind(customerId).first().catch(() => null);
    if (rij) {
      if (!land && rij.country) land = String(rij.country).toUpperCase().slice(0, 2);
      if (!merk && rij.brand) merk = String(rij.brand);
      if (!btw && !geenBtw && rij.vat_number) btw = String(rij.vat_number);
      if (!reg && rij.reg_number) reg = String(rij.reg_number);
    }
  }

  if (!merk) return { fout: 'bedrijf' };
  if (vatFormatOk(land, btw) === false) return { fout: 'btw' };
  const soort = regKindFor(land);
  if (soort === REG_KIND.kvk && !looksLikeKvk(reg) && !btw) return { fout: 'bedrijf' };
  if (soort === REG_KIND.euVat && !btw && !(geenBtw && reg)) return { fout: 'bedrijf' };

  /* VIES alleen in een ander EU-land en alleen met een nummer. Onbereikbaar is
     21% — de strenge kant, zoals bij een bestelling (functions/api/order.js). */
  let vies = null;
  const delen = normaliseVat(btw);
  const cc = viesCode(land);
  if (soort === REG_KIND.euVat && cc && land !== HOME_COUNTRY && delen.number) {
    const eigen = env?.VISUAILS_VAT ? normaliseVat(env.VISUAILS_VAT) : null;
    vies = await checkVat(cc, delen.number,
      eigen && eigen.number ? { country: eigen.country || HOME_COUNTRY, number: eigen.number } : null)
      .catch(() => null);
  }
  const besluit = vatDecision({ country: land, vatValid: !!(vies && vies.valid && bevestigd) });
  let nakijken = null;
  if (besluit.treatment === VAT_TREATMENT.outsideScope && ipLandVraagtNakijken(land, ipLand)) {
    /* Zonder migratie 0053 is er geen akkoord te lezen: dan wacht het op Lucas. */
    const ok = customerId && env?.DB
      ? await env.DB.prepare('SELECT btw_land_akkoord AS land FROM customers WHERE id = ?1')
        .bind(customerId).first().catch(() => null)
      : null;
    if (String(ok?.land || '').toUpperCase() !== land) {
      nakijken = { land, ipLand: String(ipLand).toUpperCase() };
    }
  }
  return {
    ...(nakijken ? { nakijken } : {}),
    btw: {
      treatment: besluit.treatment,
      rate: besluit.rate,
      country: land || null,
      number: btw || null,
      consultation: vies?.consultation || null,
    },
  };
}
