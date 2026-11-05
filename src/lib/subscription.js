/**
 * ══════════════════════════════════════════════════════════════════════════════
 * HET ABONNEMENT — DE SERVERKANT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * src/data/plans.js zegt WAT een abonnement is: welke plannen bestaan, wat ze
 * kosten, hoeveel producten ze toekennen, hoe lang saldo doorschuift. Het weet
 * niets van een klant en raakt geen database aan — het is een contract dat een
 * pagina, een test en een build-assertie alle drie kunnen lezen.
 *
 * Dit bestand doet het andere: het leest en schrijft de rijen. De scheiding is
 * dezelfde als tussen pricing.js en quote.js, en om dezelfde reden: de prijs van
 * een plan moet in een test te controleren zijn zonder D1, en een query mag niet
 * hoeven weten wat Studio kost.
 *
 * ── WAT HIER NIET STAAT ──────────────────────────────────────────────────────
 *
 * Geen HTML. Geen Mollie-aanroepen die niet over een abonnement gaan. En geen
 * ENKELE beslissing over prijs of aantallen — die komen allemaal uit plans.js,
 * ook waar het korter zou zijn om ze hier op te schrijven. Als er ooit twee
 * plekken zijn waar staat hoeveel producten Studio geeft, is er binnen een maand
 * één die het mis heeft.
 *
 * ── WAT DE KLANT ZIET, EN WAT HIJ NIET ZIET ──────────────────────────────────
 *
 * Lucas, 17 augustus: *"Ik wil niet dat VISUAILS zegt wat er aan de beurt is."*
 * Dat was een ontwerpregel van de wachtrij (`plan_queue`, van de KLANT). Die
 * wachtrij bestaat sinds 8 oktober niet meer (het abonnement zonder week) en
 * haar functies zijn op 5 november 2026 uit deze module gehaald (levering 69);
 * een abonnee bestelt via het gewone formulier en betaalt met credits.
 *
 * En: *"Onthoud ik werk alleen dus ik kan uiteindelijk overzicht verliezen dus
 * zoveel mogelijk moet geautomatiseerd zijn."* Vandaar dat elke functie hier
 * zonder toezicht af moet kunnen. Waar een keuze gemaakt moet worden die fout
 * kan gaan, kiest hij de kant die niets stukmaakt: een abonnement pauzeert
 * liever dan dat het doorgaat zonder betaling, en een wachtrij loopt liever leeg
 * dan dat hij twee keer hetzelfde bestelt.
 */

import {
  PLAN_IDS, SUB_PLAN_IDS, TERM_IDS, PLAN_SERVICE,
  productsFor, clipsFor, monthlyCents, available, availableFrom, rolloverMonths, rolloverDetail,
  addMonths, planShape, term,
} from '../data/plans.js';
/* DE CONSTANTE EN NOOIT DE LETTERLIJKE TEKST. `VAT_TREATMENT.standard` is
   'nl_standard' en niet 'standard' — zie de noot bij dezelfde reparatie in
   src/lib/invoice.js. Hieronder stond de letterlijke 'standard', en het gevolg
   was onzichtbaar en duur: snapshotFromSubscription() vergelijkt met de
   constante, die vergelijking werd false, en elke abonnementsfactuur van een
   Nederlandse klant ging de deur uit met 0% btw. */
import { VAT_TREATMENT } from '../data/vat.js';
import { CUSTOM_MONTH_ID } from '../data/pricing.js';
import {
  slotBalans, vensterVoor,
  /* De creditkant — zie de kop bij CREDIT_KIND in slots.js. verbruikSlot,
     geefSlotTerug, verbruikCredits, geefCreditsTerug en creditsPerSoort stonden
     hier voor de wachtrij en zijn met haar weg (5 november 2026, levering 69). */
  creditsVoor, dienstenVoorAbo, CREDIT_KIND,
  bundelVoor, subMaandCents, subProducten,
} from './slots.js';
// vat.js draagt de BEHANDELINGEN (standaard, verlegd, buiten bereik), quote.js
// geeft het TARIEF door uit pricing.js. Het getal staat hier met opzet niet: een
// noot die het tarief herhaalt, is de vierde plek waar het kan verouderen.
import { VAT_RATE } from './quote.js';
/* Alleen voor het proefmerk op een nieuw abonnement: het voorvoegsel van de
   Mollie-sleutel bepaalt of er echt geld door dit abonnement kan lopen. Zie
   isTestmodus() daar, en migrations/0046-proefbestellingen.sql. */
import { isTestmodus } from './mollie.js';
/* De poort op de vaste look (laadLocks, lookCompleet uit vasteLook.js) hing aan
   het vastzetten in de wachtrij en is met haar weg (5 november 2026, levering 69). */

/* De maanden die meetellen voor het saldo: deze plus het venster dat mag
 * doorschuiven. Drie bij een jaartermijn, één bij een maandtermijn — en dus
 * hooguit vier rijen op te halen. Een limiet en geen `ORDER BY month DESC`
 * zonder grens, want deze query draait op elke dashboardpagina van een
 * abonnee. */
function monthsNeeded(termId) {
  return rolloverMonths(termId) + 1;
}

/** De huidige maand als 'YYYY-MM', in dezelfde vorm als subscription_months.month. */
export function monthKey(d = new Date()) {
  const iso = d instanceof Date ? d.toISOString() : String(d);
  return iso.slice(0, 7);
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE LOPENDE TERMIJN — 4 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Wanneer ik het abonnement opzeg verdwijnt het abonnements-dashboard
 * ook per direct terwijl ik de maand nog niet had afgemaakt."*
 *
 * Dat klopte, en de oorzaak zit dieper dan het opzeggen. Overal in dit bestand
 * stond `monthKey()`: de KALENDERmaand. Maar een abonnement wordt afgeschreven
 * op de dag van de eerste betaling en daarna elke maand op diezelfde dag — zie
 * eersteTermijn() in subscribe.js. Wie op 20 augustus begint, betaalt op 20
 * september opnieuw, en de termijn waarvoor hij betaald heeft loopt dus van de
 * 20e tot de 19e. Niet van de 1e tot de 31e.
 *
 * Wat dat aanrichtte, in twee vormen van dezelfde fout:
 *
 *   · EEN LOPENDE ABONNEE kon tussen de 1e en zijn afschrijfdag zijn saldo niet
 *     uitgeven. `betaald` keek of er een rij voor de kalendermaand bestond, en
 *     die komt er pas op de 20e. Op het scherm stond het saldo, en het formulier
 *     zei "onbetaald" — tot 27 dagen per maand, voor iedereen die niet op de 1e
 *     is begonnen.
 *   · EEN OPZEGGER zag zijn dashboard meteen verdwijnen. loadSubscription()
 *     houdt een opgezegd abonnement staan zolang er voor DEZE maand betaald is
 *     (zie de noot daar) — maar met de kalendermaand als maat was dat vanaf de
 *     1e al niet meer waar, terwijl de betaalde termijn nog liep.
 *
 * Vandaar deze twee functies. Ze veranderen niets aan wat er in de database
 * staat: een maandrij houdt de kalendermaand van de afschrijving als naam, want
 * dat is wat de betaling zegt. Ze veranderen wélke rij "nu" is.
 *
 * DE DAG KOMT UIT started_at EN NIET UIT window_day. Die tweede is de
 * leverweek die de klant koos (zie migratie 0030); de afschrijving hangt aan de
 * dag waarop de eerste betaling binnenkwam. Twee verschillende dagen, en ze door
 * elkaar halen zou het saldo op de verkeerde dag laten omslaan.
 */
export function termijnDag(sub) {
  const bron = String(sub?.started_at || sub?.created_at || '');
  const dag = Number(bron.slice(8, 10));
  /* 28 als bovengrens, om dezelfde reden als bij eersteTermijn() en window_day:
     februari mag geen uitzondering worden. Geen bruikbare datum → de 1e, en dan
     is de termijn gelijk aan de kalendermaand — precies het oude gedrag. */
  return Number.isInteger(dag) && dag >= 1 ? Math.min(28, dag) : 1;
}

/**
 * De maandrij die NU de lopende termijn is. Vóór de afschrijfdag is dat de rij
 * van de vorige kalendermaand: die betaling loopt nog.
 */
export function termijnMaand(sub, nu = new Date()) {
  const d = nu instanceof Date ? nu : new Date(nu);
  const maand = monthKey(d);
  return d.getUTCDate() >= termijnDag(sub) ? maand : monthMinus(maand, 1);
}

/**
 * Wanneer de termijn die op `maand` betaald is, afloopt — als YYYY-MM-DD, de dag
 * waarop de volgende afschrijving valt. Een abonnement dat op de 20e betaald is
 * voor augustus, loopt tot 20 september.
 */
export function termijnEinde(sub, maand) {
  const m = String(maand || '');
  if (!/^\d{4}-\d{2}$/.test(m)) return '';
  const volgende = monthPlus(m, 1);
  return `${volgende}-${String(termijnDag(sub)).padStart(2, '0')}`;
}

/** Eén kalendermaand terug, op de sleutel YYYY-MM. */
function monthMinus(maand, n = 1) {
  const [j, m] = String(maand).split('-').map(Number);
  const d = new Date(Date.UTC(j, (m - 1) - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** En één vooruit. */
function monthPlus(maand, n = 1) {
  return monthMinus(maand, -n);
}

/**
 * Een kenmerk voor een nieuw abonnement, in dezelfde vorm als makeRef() in
 * functions/api/order.js maar met een eigen voorvoegsel.
 *
 * WAAROM EEN EIGEN VOORVOEGSEL: dit kenmerk komt in Mollie's metadata terecht
 * (`sub_ref`) en in de omschrijving op het bankafschrift van de klant. Een
 * kenmerk dat begint met SUB- is in een supportgesprek in één oogopslag geen
 * bestelling — en de webhook hoeft niet te raden welke tabel hij moet lezen.
 */
export function makeSubRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `SUB-${t}-${r}`;
}

/* Elke lees-query hieronder valt terug op leeg in plaats van te gooien. Dat is
 * met opzet en het is niet luiheid: als migratie 0030 nog niet gedraaid is —
 * bijvoorbeeld op een preview-omgeving — moet het dashboard van een klant ZONDER
 * abonnement nog steeds laden. Een ontbrekende tabel maakt dan een klant zonder
 * abonnement, en dat is precies wat hij is. */
async function stil(fn, leeg = null) {
  try { return await fn(); } catch (e) {
    console.error('[abonnement]', e && e.message ? e.message : e);
    return leeg;
  }
}

/**
 * Het lopende abonnement van een klant, of null.
 *
 * 'active' én 'paused' tellen als lopend; 'pending' ook, want een klant die net
 * het mandaat heeft getekend maar wiens webhook nog onderweg is, mag geen
 * tweede aanvraag kunnen starten. Alleen 'cancelled' is weg.
 */
export async function loadSubscription(env, customerId, nu = new Date()) {
  const rij = await stil(() => env.DB.prepare(
    `SELECT id, ref, customer_id, plan, term, status, window_day,
            /* Sinds migratie 0038. Leeg bij een pakket, gevuld bij een maand op
               maat — en dat verschil wordt nergens anders gelezen dan in
               bundelVoor()/subMaandCents(). Haal ze hier niet weg: zonder deze
               twee kolommen valt een maand op maat stil terug op een leeg plan,
               en dan staat er een dashboard zonder slots en een bedrag van nul. */
            amount_cents, slots_json,
            /* Sinds migratie 0032 — en sinds 17 september 2026 ook hier gelezen:
               koppelSubscription() maakt de maandelijkse afschrijving bruto met
               deze twee. Zie subBrutoCents() in slots.js. */
            vat_treatment, vat_rate,
            mollie_customer_id, mollie_mandate_id, mollie_subscription_id,
            started_at, cancelled_at, cancel_reason, paused_at, pause_reason,
            created_at
       FROM subscriptions
      WHERE customer_id = ?1
        AND (status IN ('active', 'paused', 'pending')
             /* ── EEN OPGEZEGD ABONNEMENT BLIJFT DE BETAALDE MAAND STAAN ─────
                18 augustus 2026, keuze van Lucas. Hier stond alleen de drie
                toestanden hierboven, en het gevolg was scherp: wie op de
                twintigste opzegde, zag zijn abonnement per direct verdwijnen
                — inclusief de producten van de maand die hij al betaald had.
                Dat is geld innen voor iets wat je daarna weghaalt.

                DE VOORWAARDE IS DE BETAALRIJ EN NIET EEN DATUM. Er bestaat
                alleen een rij in subscription_months voor een maand die
                daadwerkelijk is afgeschreven; de webhook maakt hem aan op het
                moment dat het geld binnen is. "De maand waarvoor betaald is"
                heeft dus een feitelijke bron, en er hoeft nergens een
                einddatum te worden bijgehouden of uitgerekend. Loopt de maand
                af, dan komt er geen nieuwe rij meer bij en valt het
                abonnement er vanzelf uit.

                DE STATUS BLIJFT 'cancelled'. Deze rij komt terug zodat het
                saldo besteed kan worden, niet zodat het abonnement weer lijkt
                te lopen: verbruikToestaan() laat hem toe, de bovenbalk toont
                "opgezegd", en de partiële UNIQUE index op ('active','pending')
                blijft ongemoeid — een klant kan dus meteen een nieuw
                abonnement afsluiten zonder op de maand te wachten.

                ── EN "DEZE MAAND" IS DE LOPENDE TERMIJN, NIET DE KALENDER ───
                4 september 2026. Hier stond "m.month = ?2" met de
                kalendermaand erin, en dat is de verkeerde maat: wie op de 20e
                betaalt, heeft op de 4e van de volgende maand nog steeds een
                lopende termijn maar geen rij voor die kalendermaand. Zijn
                dashboard verdween dus op de 1e in plaats van op de 20e — de
                fout die Lucas aanwees. Zie termijnMaand() bovenaan.

                De SQL kijkt naar allebei de kandidaten (deze en de vorige
                kalendermaand) omdat de dag waarop de termijn omslaat op de RIJ
                staat die we hier ophalen; welke van de twee het is, beslist de
                controle in JavaScript hieronder. */
             OR (status = 'cancelled' AND EXISTS (
                   SELECT 1 FROM subscription_months m
                    WHERE m.subscription_id = subscriptions.id
                      AND m.month IN (?2, ?3))))
      ORDER BY id DESC LIMIT 1`
  ).bind(customerId, monthKey(nu), monthMinus(monthKey(nu), 1)).first());

  /* Een opgezegd abonnement blijft staan zolang de betaalde termijn loopt, en
     geen dag langer. De query hierboven is met opzet één maand te ruim; deze
     controle maakt hem precies. Eén extra query, en alleen voor wie opgezegd
     heeft. */
  if (rij && String(rij.status) === 'cancelled') {
    const maand = termijnMaand(rij, nu);
    const heeft = await stil(() => env.DB.prepare(
      'SELECT 1 AS er FROM subscription_months WHERE subscription_id = ?1 AND month = ?2 LIMIT 1'
    ).bind(rij.id, maand).first());
    if (!heeft) return null;
  }
  return rij;
}

/** Het abonnement achter een kenmerk — hoe de eerste betaling terugvindt waar hij hoort. */
export async function subscriptionByRef(env, ref) {
  if (!ref) return null;
  return stil(() => env.DB.prepare(
    `SELECT id, ref, customer_id, plan, term, status, amount_cents, slots_json,
            vat_treatment, vat_rate,
            mollie_customer_id
       FROM subscriptions WHERE ref = ?1`
  ).bind(String(ref)).first());
}

/** De maanden die voor het saldo meetellen, OUDSTE EERST — de volgorde die available() verwacht. */
export async function loadMonths(env, subId, termId) {
  const rows = await stil(() => env.DB.prepare(
    `SELECT month, granted, used, clips_granted, clips_used
       FROM subscription_months
      WHERE subscription_id = ?1
      ORDER BY month DESC
      LIMIT ?2`
  ).bind(subId, monthsNeeded(termId)).all(), { results: [] });
  return (rows?.results || []).slice().reverse();
}

/* ── loadQueue, queueWindow, queueVerzet, queueAsap EN loadTaken STONDEN HIER
 * 5 november 2026, levering 69 (§17 punt 14). Het weeksysteem (de wachtrij in
 * plan_queue) bestaat sinds 8 oktober niet meer; geen scherm las deze functies nog.
 * De tabel plan_queue en de kolom subscriptions.window_day blijven staan tot de
 * migratie in kladblok/PLAN-WEEKSYSTEEM-OPRUIMEN.md. */

/**
 * ALLES WAT EEN PAGINA OVER HET ABONNEMENT VAN ÉÉN KLANT MOET WETEN, in één
 * aanroep en één afgeronde vorm.
 *
 * Waarom één functie en niet vier losse: /account/plan, de bestelstroom en de
 * nachtelijke taak stellen alle drie dezelfde vraag, en drie plekken die zelf
 * `granted - used` uitrekenen zijn drie kansen om het verschillend te doen. Het
 * saldo wordt hier één keer bepaald, door available() uit plans.js, en verder
 * nergens.
 *
 * Geeft ALTIJD een bruikbare vorm terug, ook zonder abonnement: `{ actief: false }`
 * met een saldo van nul. Een pagina hoeft dan niet op null te controleren voor
 * hij een getal kan laten zien.
 */
/**
 * HET SALDO EN VERDER NIETS — de goedkope helft van planState(), 26 augustus 2026.
 *
 * Aanleiding: de statuskolom van het dashboard laat op ELKE route zien hoeveel
 * producten er deze maand nog over zijn. Daar planState() voor aanroepen kost
 * vier queries op zes pagina's, waarvan er twee — de wachtrij en wat eruit
 * gehaald is — alleen op /account/plan zelf gelezen worden.
 *
 * Deze functie doet er één zonder abonnement (loadSubscription geeft null en het
 * stopt daar) en twee met. De rekensom staat nog steeds op één plek: planState()
 * hieronder roept déze aan en vult alleen de twee lijsten aan. Wie het saldo
 * anders zou willen uitrekenen, moet het hier doen — er is geen tweede plek.
 *
 * Geeft dezelfde vorm terug als planState(), op `wachtrij` en `opgehaald` na.
 */
export async function planSaldo(env, customerId, nu = new Date()) {
  const sub = await loadSubscription(env, customerId, nu);
  if (!sub) {
    return {
      actief: false, sub: null, plan: null, term: null,
      saldo: 0, toegekend: 0, verbruikt: 0, doorgeschoven: 0, vervalt: [],
      clips: { saldo: 0, toegekend: 0, verbruikt: 0 },
      maanden: [],
      maand: monthKey(), betaald: false, volgendeAfschrijving: '', termijnTot: '',
      jaarTot: '', jaarOpgezegd: false,
    };
  }

  const maanden = await loadMonths(env, sub.id, sub.term);

  /* DE LOPENDE TERMIJN en niet de kalendermaand — zie termijnMaand() bovenaan.
     Alles hieronder hangt hieraan: welke rij "deze maand" is, wat er als
     doorgeschoven telt, en of `betaald` waar is. */
  const maand = termijnMaand(sub, nu);
  const deze = maanden.find((m) => m.month === maand) || null;
  /* De geschiedenis die available() krijgt, zijn de VOORBIJE maanden — deze
   * maand zit al in het plan zelf. Zie de noot bij available(). */
  const eerder = maanden.filter((m) => m.month !== maand);

  /* availableFrom() met het aantal van DIT abonnement: bij een maand op maat staat
     dat op de rij en niet in PLAN_PRODUCTS. Zie subProducten() in slots.js. */
  const bruto = availableFrom(subProducten(sub), sub.term, eerder);
  const verbruikt = Math.max(0, Math.floor(Number(deze?.used) || 0));

  /* WELK DEEL VAN HET SALDO DOORGESCHOVEN IS, EN TOT WANNEER. Lucas koos voor
   * doorschuiven mét een zichtbare afloopmaand; dit is waar die maanden uit
   * komen. Zie rolloverDetail() in plans.js voor waarom het een maand is en geen
   * afteller op de dag. */
  const vervalt = rolloverDetail(sub.term, eerder);
  const doorgeschoven = vervalt.reduce((n, r) => n + r.left, 0);

  /* CLIPS ZIJN EEN TWEEDE BUDGET. Ze schuiven mee volgens dezelfde regel — het is
   * dezelfde maand en dezelfde betaling — maar ze zijn niet in producten om te
   * rekenen, dus is het een eigen saldo. Zie de noot bij clips_granted in
   * migratie 0030. */
  const clipsBruto = Number(bundelVoor(sub)['video-motion'] || 0) + eerder
    .slice(-rolloverMonths(sub.term))
    .reduce((n, m) => n + Math.max(0,
      (Math.floor(Number(m?.clips_granted) || 0)) - (Math.floor(Number(m?.clips_used) || 0))), 0);
  const clipsVerbruikt = Math.max(0, Math.floor(Number(deze?.clips_used) || 0));

  /* ── HET VOORUITBETAALDE JAAR: TOT WANNEER, EN OF HET IS OPGEZEGD ─────────
     24 september 2026. Eén query extra, en alleen op een vooruitbetaald jaar:
     `maanden` hierboven is afgekapt op monthsNeeded() en telt dus niet alle
     twaalf. Zie markeerJaarOpgezegd() en jaarLooptTot() onderaan. */
  let jaarTot = '';
  if (sub.term === 'prepaid') {
    const telling = await stil(() => env.DB.prepare(
      'SELECT COUNT(*) AS aantal, MAX(month) AS laatste FROM subscription_months WHERE subscription_id = ?1'
    ).bind(sub.id).first());
    jaarTot = jaarLooptTot(sub, telling || {});
  }
  const jaarOpgezegd = sub.term === 'prepaid' && sub.status !== 'cancelled' && !!sub.cancelled_at;

  return {
    actief: sub.status === 'active',
    sub,
    plan: sub.plan,
    term: sub.term,
    /* Wat er nu nog besteld kan worden. Nooit negatief: wie door een correctie
     * over zijn saldo heen is, staat op nul en niet in de min — het meerdere is
     * bij de bestelling al op de ladder afgerekend. */
    saldo: Math.max(0, bruto - verbruikt),
    toegekend: bruto,
    verbruikt,
    doorgeschoven,
    vervalt,
    clips: {
      saldo: Math.max(0, clipsBruto - clipsVerbruikt),
      toegekend: clipsBruto,
      verbruikt: clipsVerbruikt,
    },
    /* De maand waarin de volgende afschrijving valt. Afgeleid uit de maand
     * waarvoor is betaald en niet uit Mollie: `nextPaymentDate` opvragen zou een
     * netwerkaanroep per dashboardbezoek zijn, en de dag ligt vast op de dag van
     * de eerste betaling. Bij een gepauzeerd abonnement is er niets te noemen. */
    volgendeAfschrijving: sub.status === 'active' ? addMonths(maand, 1) : '',
    /* Tot wanneer er betaald is. Bij een opgezegd abonnement is dat de dag
       waarop het dashboard verdwijnt, en die hoort op het scherm te staan in
       plaats van dat hij iemand overvalt. */
    termijnTot: termijnEinde(sub, maand),
    /* Alleen bij een vooruitbetaald jaar gevuld: de dag waarop de twaalfde
       termijn afloopt, en of de klant heeft laten weten dat hij daarna stopt. */
    jaarTot,
    jaarOpgezegd,
    maanden,
    maand,
    /* Is er voor DEZE maand betaald? De webhook maakt de maandrij aan op het
     * moment dat de afschrijving binnen is, dus het bestaan van de rij ís het
     * betaalbewijs. Een abonnee wiens betaling nog loopt, ziet zijn saldo maar
     * kan er niets mee — zie verbruikToestaan() hieronder. */
    betaald: Boolean(deze),
  };
}

/**
 * ALLES WAT /account/plan MOET WETEN: het saldo uit planSaldo(), plus de
 * wachtrij en wat er dit jaar uit gehaald is.
 *
 * Van buiten gezien onveranderd — dezelfde sleutels, dezelfde waarden, ook
 * zonder abonnement. De splitsing zit binnenin en bestaat zodat de statuskolom
 * niet vier queries hoeft te doen voor twee getallen; zie de noot bij
 * planSaldo().
 */
export async function planState(env, customerId) {
  return planAanvullen(env, await planSaldo(env, customerId));
}

/**
 * DE TWEEDE HELFT, LOS AANROEPBAAR — 27 augustus 2026.
 *
 * `sectionGet()` in account.js haalt het saldo al op voor de statuskolom, op elke
 * route. Zou /account/plan daarna gewoon planState() aanroepen, dan deed die
 * pagina `loadSubscription` en `loadMonths` een tweede keer: zes queries voor wat
 * er in vier past. Vandaar deze ingang — geef hem wat planSaldo() al teruggaf en
 * hij vult alleen de twee lijsten aan.
 *
 * Het samenstellen staat hiermee nog steeds op één plek. Dat is het hele punt:
 * planState() is niets anders meer dan deze twee achter elkaar, dus een pagina
 * die de losse helften gebruikt, kan niet iets anders krijgen dan een pagina die
 * de hele functie gebruikt.
 */
export async function planAanvullen(env, kort) {
  /* `wachtrij` en `opgehaald` (de wachtrij van het weeksysteem, uit plan_queue)
     zijn weg sinds 5 november 2026 (levering 69, §17 punt 14): geen scherm las
     ze, en het waren twee queries op elke pagina met een abonnement. */
  if (!kort?.sub) return { ...kort, slots: [] };

  /* `slots` erbij sinds migratie 0035. Eén query erbij, en hij hoort hier omdat
     elk scherm dat de toestand van een abonnement toont hem nodig heeft: het
     saldo is sinds die migratie niet één getal maar een regel per soort.
     Met de maand van de LOPENDE termijn, niet die van de kalender: anders
     leest het saldo van iemand die op de 20e betaalt tussen de 1e en de 20e
     als nul, en bij een opgezegd abonnement (venster 0) helemaal. */
  const slots = await slotBalans(env, kort.sub.id, vensterVoor(kort.sub), new Date(), kort.maand);
  /* ── HET CREDITSALDO KOST GEEN ZESDE QUERY ──────────────────────────────
     creditBalans() zou dezelfde rijen nog een keer ophalen. Dat is precies het
     soort stille verdubbeling waar het querybudget in tests/subscription.test.mjs
     voor bestaat: het getal staat daar opgeschreven zodat het niet ongemerkt kan
     oplopen. `slots` heeft de creditregel al — hem eruit pakken is genoeg. */
  const credits = slots.find((b) => b.kind === CREDIT_KIND)
    || { kind: CREDIT_KIND, toegekend: 0, verbruikt: 0, saldo: 0, dezeMaand: 0, ouder: 0, vervalt: [] };
  return {
    ...kort,
    slots,
    credits,
    /* Wat deze klant per maand krijgt en waaruit hij mag kiezen — allebei uit
       slots.js, zodat het scherm er niets van hoeft te weten. */
    creditsPerMaand: creditsVoor(kort.sub),
    diensten: dienstenVoorAbo(kort.sub),
  };
}

/**
 * Mag deze klant nu een bestelling van zijn saldo betalen?
 *
 * Drie voorwaarden, en alle drie zijn ze een 'nee' die stil kan gaan als je hem
 * vergeet: het abonnement loopt, er is voor deze maand betaald, en er is genoeg
 * saldo. `aantal` groter dan het saldo is GEEN fout — dat is de gewone situatie
 * waarin het meerdere op de ladder wordt afgerekend. Vandaar `uitSaldo`, dat
 * zegt hoeveel er van het saldo af gaat, en niet een simpele true/false.
 */
export function verbruikToestaan(state, aantal, soort = 'products') {
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  /* MAG DIT SALDO BESTEED WORDEN? Twee gevallen, en het tweede is er sinds
     18 augustus 2026 bij gekomen:

       · een LOPEND abonnement waarvan deze maand betaald is;
       · een OPGEZEGD abonnement waarvan deze maand betaald is.

     Het tweede geval bestaat omdat loadSubscription() een opgezegd abonnement
     de betaalde maand laat uitzitten — zie de noot daar. Zonder deze regel zou
     die rij wel zichtbaar zijn en niet te besteden, en dat is precies het
     halve antwoord dat verwarrender is dan geen.

     Een GEPAUZEERD abonnement mag dat niet: pauzeren is de klant die zelf zegt
     dat het even stil moet, en zijn saldo blijft staan voor als hij hervat. */
  const mag = state?.actief || state?.sub?.status === 'cancelled';
  if (!mag || !state.betaald) return { uitSaldo: 0, rest: n, reden: mag ? 'onbetaald' : 'geen-abonnement' };
  const saldo = soort === 'clips' ? (state.clips?.saldo || 0) : state.saldo;
  const uitSaldo = Math.min(saldo, n);
  return { uitSaldo, rest: n - uitSaldo, reden: '' };
}

/**
 * Saldo afschrijven. Draait bij het plaatsen van een bestelling.
 *
 * De UPDATE heeft het plafond in de WHERE en dat is het slot: twee bestellingen
 * die tegelijk binnenkomen, kunnen niet samen meer verbruiken dan er is.
 * Dezelfde vorm als de voorraadcontrole in ratelimit.js, en om dezelfde reden —
 * een lees-dan-schrijf in JavaScript is hier een race die je pas ziet als een
 * klant twee tabbladen open heeft.
 *
 * ── WAAROM HET PLAFOND MEEKOMT EN NIET `granted` IS ──────────────────────────
 *
 * Dit stond er eerst als `used + ?3 <= granted`, en dat is subtiel verkeerd: het
 * saldo van een maand is niet wat die maand toekende, het is wat die maand
 * toekende PLUS wat er van de vorige maanden doorschoof. Een Studio met vijf
 * doorgeschoven producten ziet zeventien op zijn dashboard, en met `granted` als
 * grens kon hij er twaalf besteden — de vijf die hij overhield uit de maand
 * ervoor, waren op het scherm te zien en niet uit te geven.
 *
 * Het plafond is `state.toegekend` uit planState(): dezelfde som die het
 * dashboard laat zien, door dezelfde functie in plans.js berekend. Er is dus
 * precies één plek waar staat wat iemand mag, en de database dwingt hem af.
 *
 * Geeft terug hoeveel er daadwerkelijk is afgeschreven. Nul betekent: er was
 * niets meer, reken alles op de ladder af.
 */
export async function verbruikBoeken(env, subId, maand, aantal, plafond, soort = 'products') {
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  if (!subId || !n) return 0;
  /* Twee budgetten, twee kolommenparen, één functie. De kolomnamen komen uit een
   * vaste tabel en niet uit het argument — een parameter die rechtstreeks in de
   * SQL beland, is een injectie die op een dag door een formulierveld wordt
   * gevuld. Een onbekende soort boekt niets in plaats van iets willekeurigs. */
  const kolom = soort === 'clips'
    ? { op: 'clips_used', max: 'clips_granted' }
    : { op: 'used', max: 'granted' };
  if (soort !== 'clips' && soort !== 'products') {
    console.error('[abonnement] onbekende soort verbruik:', soort);
    return 0;
  }
  /* Geen plafond meegegeven is een programmeerfout en geen randgeval. Zonder
   * grens zou deze functie ongelimiteerd afschrijven, dus valt hij terug op wat
   * de maand zelf toekende — de veilige kant, en luidruchtig in het log. */
  let grens = Math.floor(Number(plafond));
  if (!Number.isFinite(grens)) {
    console.error('[abonnement] verbruikBoeken zonder plafond — teruggevallen op granted');
    grens = null;
  }
  const row = await stil(() => env.DB.prepare(
    `UPDATE subscription_months
        SET ${kolom.op} = ${kolom.op} + ?3
      WHERE subscription_id = ?1 AND month = ?2
        AND ${kolom.op} + ?3 <= COALESCE(?4, ${kolom.max})
      RETURNING ${kolom.op} AS verbruikt, ${kolom.max} AS toegekend`
  ).bind(subId, String(maand), n, grens).first());
  return row ? n : 0;
}

/* ── DE WACHTRIJ (queueAdd, queueLock, queueUnlock, queueRemove, queueReorder,
 * queueTakeIds, queueUntakeIds, queueLinkOrder, queueMax) STOND HIER — weg op
 * 5 november 2026, levering 69 (§17 punt 14). Niets riep ze nog aan; account.js
 * importeerde ze alleen. */

/* ── DE LEVENSLOOP VAN EEN ABONNEMENT ───────────────────────────────────────
 *
 * Aanmaken (pending) → mandaat getekend (active) → eventueel paused → cancelled.
 * Mollie-aanroepen staan in src/lib/mollie.js; hier staat alleen wat er in de
 * database gebeurt.
 */

/**
 * Een aanvraag vastleggen, vóór de klant naar Mollie gaat.
 *
 * WAAROM DE RIJ ER EERDER IS DAN DE BETALING. Omdat de webhook anders niets
 * heeft om op te landen: hij komt binnen met een kenmerk en moet daar een klant
 * bij vinden. Dezelfde volgorde als bij bestellingen — de rij eerst, het
 * betaalscherm daarna.
 *
 * De UNIQUE index op (customer_id) WHERE status IN ('active','pending') doet het
 * werk als iemand twee keer op de knop drukt: de tweede INSERT faalt en we geven
 * `{ bestaat: true }` terug in plaats van een tweede abonnement.
 */
/*
 * ── DE BTW-BEHANDELING VAN EEN ABONNEMENT — 20 AUGUSTUS 2026 ───────────────
 *
 * Elke termijn krijgt sinds vandaag een factuur (zie issueSubscriptionInvoice in
 * src/lib/invoice.js), en dan is de vraag: 21% of verlegd? Die vraag wordt hier
 * één keer beantwoord en op de abonnementsrij gezet, niet elke maand opnieuw.
 *
 * WAAROM NIET ELKE MAAND OPNIEUW LANGS VIES. Dat zou een netwerkaanroep binnen
 * een webhook betekenen, twaalf keer per jaar per abonnee, met een factuur die
 * niet uitgaat als Europa traag is. En het is ook het verkeerde moment: een
 * btw-nummer dat vandaag vervalt maakt de factuur van vorige maand niet onjuist.
 *
 * WAAROM HET BEWIJS EN NIET HET VELD. Er wordt niet gekeken naar wat er in
 * `customers.vat_number` staat, maar naar de laatste BETAALDE bestelling van deze
 * klant met een VIES-consultatienummer erop. Dat nummer is het bewijs dat de
 * controle daadwerkelijk heeft plaatsgevonden, en het is het enige in deze keten
 * dat niet door de klant zelf is ingetypt. Zonder dat bewijs: 21%.
 *
 * Dat is met opzet de strenge kant. Te veel btw rekenen is een correctie op één
 * factuur; ten onrechte verleggen is een naheffing over alles wat je verlegd hebt.
 */
export async function vatVoorAbonnement(env, customerId) {
  const bron = await env.DB.prepare(
    `SELECT vat_treatment, vat_rate, country, vat_number
       FROM orders
      WHERE customer_id = ?1
        AND payment_status = 'paid'
        AND vat_treatment IS NOT NULL
        AND vat_consultation IS NOT NULL
        AND TRIM(COALESCE(vat_consultation, '')) <> ''
      ORDER BY paid_at DESC, id DESC
      LIMIT 1`
  ).bind(customerId).first().catch(() => null);

  if (!bron) return { treatment: VAT_TREATMENT.standard, rate: VAT_RATE, country: null, number: null };
  return {
    treatment: bron.vat_treatment,
    rate: Number(bron.vat_rate) || 0,
    country: bron.country || null,
    number: bron.vat_number || null,
  };
}

export async function createSubscriptionRow(env, {
  customerId, planId, termId, windowDay = null, slots = null, amountCents = null, btw: gegeven = null,
}) {
  /* SUB_PLAN_IDS en niet PLAN_IDS: de maand op maat mag hier wel in de kolom en
     staat niet in de lijst met pakketten. Zie de noot bij die twee in plans.js. */
  if (!SUB_PLAN_IDS.includes(planId)) throw new Error(`abonnement: onbekend plan ${planId}`);
  if (!TERM_IDS.includes(termId)) throw new Error(`abonnement: onbekende termijn ${termId}`);
  /* EEN MAAND OP MAAT ZONDER BUNDEL OF ZONDER BEDRAG BESTAAT NIET, en dat wordt
     hier tegengehouden en niet bij de eerste afschrijving. Een rij die 'maat' zegt
     en verder niets, geeft de klant nul slots en Mollie een bedrag van nul. */
  if (planId === CUSTOM_MONTH_ID) {
    if (!slots || !Object.keys(slots).length) throw new Error('abonnement: een maand op maat zonder bundel');
    if (!(Number(amountCents) > 0)) throw new Error('abonnement: een maand op maat zonder bedrag');
  }
  const ref = makeSubRef();
  /* `window_day` (de dag van de vaste week) blijft als kolom bestaan voor de
     geschiedenis, maar sinds ronde 10 (8 oktober 2026) schrijft niets er meer
     in: het weeksysteem is weg. `windowDay` wordt nog aangenomen en genegeerd. */
  const dag = null;
  try {
    /* Sinds 29 september 2026 bepaalt handleSubscribeStart() het tarief uit wat
       de klant op het formulier opgaf (bepaalBedrijfEnBtw() in subscribe.js).
       vatVoorAbonnement() blijft de terugval voor wie deze functie anders
       aanroept. */
    const btw = gegeven && gegeven.treatment ? gegeven : await vatVoorAbonnement(env, customerId);
    const row = await env.DB.prepare(
      `INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day,
                                  amount_cents, slots_json,
                                  vat_treatment, vat_rate, vat_country, vat_number, testmodus)
       VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
       /* vat_treatment en vat_rate komen mee sinds 17 september 2026: de eerste
          betaling wordt hiermee bruto gemaakt (zie subBrutoCents() in slots.js),
          en die rij is precies deze. Zonder deze twee valt hij terug op 21% —
          veilig, maar fout voor een klant met verlegde btw. */
       RETURNING id, ref, plan, term, status, window_day, amount_cents, slots_json,
                 vat_treatment, vat_rate`
    ).bind(customerId, ref, planId, termId, dag,
           planId === CUSTOM_MONTH_ID ? Math.round(Number(amountCents)) : null,
           slots && Object.keys(slots).length ? JSON.stringify(slots) : null,
           btw.treatment, btw.rate, btw.country, btw.number,
           /* Het proefmerk, hier wél in de INSERT en niet als losse UPDATE zoals bij
              een bestelling. Het verschil is de terugval: de INSERT van een bestelling
              heeft drie lagen voor ontbrekende migraties en die mogen niet stuk, deze
              heeft er geen — hij werpt gewoon, en een ontbrekende migratie 0046 hoort
              hier luidruchtig te zijn. Zie migrations/0046-proefbestellingen.sql. */
           isTestmodus(env) ? 1 : 0).first();
    return { row, bestaat: false };
  } catch (e) {
    const bestaand = await loadSubscription(env, customerId);
    if (bestaand) return { row: bestaand, bestaat: true };
    throw e;
  }
}

/** De Mollie-ids op de rij zetten zodra ze bestaan. Elk veld apart, want ze komen op verschillende momenten. */
export async function setMollieIds(env, subId, { customerId = null, mandateId = null, subscriptionId = null }) {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET mollie_customer_id     = COALESCE(?2, mollie_customer_id),
            mollie_mandate_id      = COALESCE(?3, mollie_mandate_id),
            mollie_subscription_id = COALESCE(?4, mollie_subscription_id),
            updated_at = datetime('now')
      WHERE id = ?1
      RETURNING id`
  ).bind(subId, customerId, mandateId, subscriptionId).first());
}

/**
 * Het Mollie-abonnements-id wissen. Naar NULL, en dat kan setMollieIds() niet.
 *
 * WAAROM DIT EEN EIGEN FUNCTIE IS. setMollieIds() schrijft met
 * `COALESCE(?4, mollie_subscription_id)` — precies zodat je één veld kunt zetten
 * zonder de andere twee te wissen. De keerzijde is dat NULL doorgeven "laat
 * staan" betekent, dus wissen kan er niet mee.
 *
 * EN EEN LEGE STRING IS GEEN OPLOSSING. Op deze tabel staat
 *
 *     CREATE UNIQUE INDEX idx_subs_mollie ON subscriptions(mollie_subscription_id)
 *       WHERE mollie_subscription_id IS NOT NULL
 *
 * en '' is NOT NULL. Twee klanten die allebei pauzeren zouden dus allebei ''
 * krijgen en de tweede zou botsen op die index — stil, want de schrijfactie
 * loopt door stil(). Dan blijft er een dood id staan bij precies de klant die
 * net gepauzeerd heeft, en dat is het id waarop de webhook een betaling
 * terugzoekt.
 *
 * Wordt aangeroepen bij pauzeren: het abonnement is bij Mollie verwijderd, dus
 * het id wijst nergens meer heen. Hervatten zet er een nieuw id voor terug.
 */
export async function clearMollieSubscriptionId(env, subId) {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET mollie_subscription_id = NULL, updated_at = datetime('now')
      WHERE id = ?1
      RETURNING id`
  ).bind(subId).first());
}

/**
 * Van 'pending' naar 'active'. Alleen vanuit 'pending' — een abonnement dat de
 * klant intussen heeft opgezegd, mag niet door een late webhook weer aangaan.
 */
export async function activateSubscription(env, subId) {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'active', started_at = COALESCE(started_at, datetime('now')),
            paused_at = NULL, pause_reason = NULL, updated_at = datetime('now')
      WHERE id = ?1 AND status IN ('pending', 'paused')
      RETURNING id, status`
  ).bind(subId).first());
}

/**
 * Pauzeren. Twee bronnen, één toestand: de klant die zelf even stopt, en een
 * mislukte afschrijving.
 *
 * Dat ze dezelfde toestand delen is met opzet — zie de noot in migratie 0030.
 * `pause_reason` houdt ze uit elkaar waar dat uitmaakt: 'payment_failed' wordt
 * door de webhook vanzelf opgeheven bij de volgende geslaagde betaling, en een
 * pauze die de klant zelf zette, niet.
 */
/* `vanaf` (8 oktober 2026, 2.07): de dag waarop de pauze ingaat, als die in de
   toekomst ligt — Lucas: "gaat in vanaf de volgende maand die hij betaald". De
   incasso is dan al gestopt; `paused_at` draagt die dag, zodat Studio zegt
   "je pauze gaat in op …" en de nachttaak de drie maanden vanaf daar telt.
   Zonder `vanaf`: nu, zoals altijd. */
export async function pauseSubscription(env, subId, reason = 'customer', vanaf = null) {
  const dag = /^\d{4}-\d{2}-\d{2}$/.test(String(vanaf || '')) ? `${vanaf} 00:00:00` : null;
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'paused', paused_at = COALESCE(?3, datetime('now')), pause_reason = ?2, updated_at = datetime('now')
      WHERE id = ?1 AND status IN ('active', 'pending')
      RETURNING id, status`
  ).bind(subId, String(reason || 'customer').slice(0, 40), dag).first());
}

/**
 * Opzeggen. Dit is het einde: de partiële UNIQUE index laat daarna een nieuw
 * abonnement toe, en dat is precies de bedoeling.
 *
 * Het saldo van de lopende maand blijft staan en wordt niet leeggemaakt — er is
 * voor betaald. Wat vervalt, vervalt vanzelf doordat er geen nieuwe maandrij meer
 * bij komt.
 */
export async function cancelSubscription(env, subId, reason = 'customer') {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?2, updated_at = datetime('now')
      WHERE id = ?1 AND status != 'cancelled'
      RETURNING id, status, mollie_subscription_id`
  ).bind(subId, String(reason || 'customer').slice(0, 40)).first());
}

/**
 * ── EEN VOORUITBETAALD JAAR OPZEGGEN — 24 september 2026 ────────────────────
 *
 * Lucas: *"Tegoed van jaarabonnement moet niet in 1x op het account gezet
 * worden omdat ik anders teveel werk krijg. Het abonnement moet gewoon
 * simpelweg doorlopen tot einde van het jaar."*
 *
 * Dus GEEN cancelSubscription(): dat zou de maandtoekenning stoppen (die draait
 * alleen op 'active', zie grantPrepaidMonths() in cron/index.js) en het
 * dashboard na de lopende termijn laten verdwijnen. De status blijft 'active',
 * met alles wat daarbij hoort — credits per maand, de vaste week, de wachtrij —
 * en de opzegging staat alleen als datum en reden op de rij. Dat is de
 * boekhouding van het besluit; het einde komt vanzelf, als de twaalfde maand
 * voorbij is (zie sluitAfgelopenJaren() in de cron).
 *
 * Een GEPAUZEERD jaar gaat hierbij weer lopen. Pauzeren houdt de maanden vast
 * tot je hervat; wie opzegt, hervat nooit meer, en zonder dit zouden de maanden
 * die hij al betaald heeft nooit meer komen.
 *
 * Idempotent: twee keer opzeggen verandert de eerste datum niet.
 */
export async function markeerJaarOpgezegd(env, subId) {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET status = CASE WHEN status = 'paused' THEN 'active' ELSE status END,
            paused_at = NULL, pause_reason = NULL,
            cancelled_at = COALESCE(cancelled_at, datetime('now')),
            cancel_reason = COALESCE(cancel_reason, 'customer'),
            updated_at = datetime('now')
      WHERE id = ?1 AND term = 'prepaid' AND status IN ('active', 'paused')
      RETURNING id, status, cancelled_at`
  ).bind(subId).first());
}

/**
 * Tot welke dag een vooruitbetaald jaar loopt, als YYYY-MM-DD (de dag waarop de
 * twaalfde termijn afloopt). Leeg als er nog geen maand is toegekend.
 *
 * Gerekend vanaf de LAATST toegekende maand plus wat er nog komt, en niet vanaf
 * started_at plus twaalf: een pauze schuift de maanden op, en dan klopt die
 * tweede som niet meer.
 */
export function jaarLooptTot(sub, { aantal = 0, laatste = '' } = {}) {
  const n = Math.max(0, Math.floor(Number(aantal) || 0));
  if (!n || !/^\d{4}-\d{2}$/.test(String(laatste || ''))) return '';
  const over = Math.max(0, term('prepaid').months - n);
  return termijnEinde(sub, monthPlus(String(laatste), over));
}

/**
 * Hoeveel plekken er nog vrij zijn — geteld over de database en niet over een
 * getal in een bestand.
 *
 * seatsLeft() in plans.js rekent uit hoeveel abonnementen er PASSEN; deze functie
 * telt hoeveel er al zijn. De pagina die "nog N plekken" toont, heeft ze allebei
 * nodig, en het verschil is precies waarom ze niet één functie zijn: het plafond
 * is een besluit, de bezetting is een feit.
 *
 * ── SINDS 6.05 (8 OKTOBER 2026) IN CREDITS ─────────────────────────────────
 * `credits` is de som van de maandcredits van elk abonnement dat meetelt
 * (creditsVoor() in slots.js: het plan, of de bundel op de rij bij een maand op
 * maat). Dat is wat de rem vergelijkt met het plafond (ABO_CREDITS_PLAFOND in
 * plans.js, of de stand in /admin). `producten` blijft voor wie hem nog leest.
 */
export async function bezetting(env) {
  const rows = await stil(() => env.DB.prepare(
    /* Per RIJ en niet per plan, sinds migratie 0038: twee maanden op maat zijn
       niet even groot, dus een GROUP BY plan met een vermenigvuldiging zou het
       aantal van de eerste op allebei plakken. */
    /* 'pending' telt alleen het eerste etmaal mee: daarna is het een eerste
       betaling die nooit afgerond werd, en die hoort geen plek vast te houden
       (24 september 2026). Dit is sinds die dag de ENIGE telling: de poort in
       handleSubscribeStart() en de beschikbaarheid op /start/plan
       (functions/api/plan-plek.js) lezen allebei deze functie, zodat wat de
       pagina vooraf zegt en wat de poort daarna beslist niet uit elkaar kunnen
       lopen. */
    `SELECT plan, slots_json
       FROM subscriptions
      WHERE status IN ('active', 'paused')
         OR (status = 'pending' AND created_at > datetime('now', '-1 day'))`
  ).all(), { results: [] });
  const per = {};
  let producten = 0;
  let credits = 0;
  for (const r of rows?.results || []) {
    /* Tellen, niet overschrijven: hier stond `= 1`, dus zeiden tien Starters
       samen dat er één was. Er las nog niemand `per`, en daarom viel het niet op. */
    per[r.plan] = (per[r.plan] || 0) + 1;
    /* subProducten() en niet productsFor(): een maand op maat heeft geen vast
       aantal en draagt zijn bundel op de rij. Vandaar ook dat de query hierboven
       slots_json meeneemt en niet alleen op plan groepeert — voor 'maat' zegt de
       plan-id niets over hoeveel agenda er wordt vastgelegd. */
    producten += subProducten(r);
    credits += creditsVoor(r);
  }
  return { per, producten, credits };
}

/* ── queueTerugNaAnnulering() STOND HIER — weg op 5 november 2026, levering 69
 * (§17 punt 14). Hij hing aan payment_status = 'plan', dat sinds migratie 0061
 * niets meer schrijft; /admin riep hem bij een annulering nog aan, zonder effect.
 * Credits terug bij een annulering lopen via het creditboek (creditsTerugVoorBestelling in creditboek.js). */

/**
 * De vorm waarin een abonnement in een mail, een orderregel of een adminpaneel
 * verschijnt. Eén plek, zodat er niet drie manieren ontstaan om "Studio,
 * jaartermijn, €790 per maand" op te schrijven.
 */
export function subscriptionShape(sub) {
  if (!sub) return null;
  /*
   * ── EEN MAAND OP MAAT HEEFT GEEN planShape() ──────────────────────────────
   *
   * planShape() slaat elk veld op in PLAN_PRODUCTS, PLAN_CLIPS en PLAN_AMOUNT, en
   * die drie kennen 'maat' niet: productsFor() gooit erop. Dat was geen theorie —
   * zonder deze tak geeft het dashboard van een abonnee met een maand op maat een
   * 500 op de eerste regel.
   *
   * Wat hier gebeurt is dus geen tweede vorm maar dezelfde vorm uit een andere
   * bron: de rij in plaats van de tabel. De velden die alleen bij een pakket
   * horen — de merkmodel-opzet, de vergelijking met de ladder — staan op nul, en
   * ladderCents is met opzet gelijk aan het maandbedrag: de prijs van een maand op
   * maat IS het laddertarief, dus "dit zou los X kosten" is hier geen besparing
   * maar hetzelfde getal. Een verzonnen besparing tonen zou een verkooppraatje
   * zijn over een som die niet bestaat.
   */
  const vorm = String(sub.plan) === CUSTOM_MONTH_ID
    ? (() => {
      const t = term(sub.term);
      const cents = subMaandCents(sub);
      return {
        id: sub.plan,
        term: t.id,
        products: subProducten(sub),
        clips: Number(bundelVoor(sub)['video-motion'] || 0),
        monthlyCents: cents,
        totalCents: cents * t.months,
        months: t.months,
        fixed: t.fixed,
        rollover: t.rollover,
        brandModel: false,
        perks: t.perks,
        ladderCents: cents,
        brandModelSetupCents: 0,
      };
    })()
    : planShape(sub.plan, sub.term);
  return {
    ...vorm,
    ref: sub.ref,
    status: sub.status,
    windowDay: sub.window_day,
    service: PLAN_SERVICE,
    /* Het bedrag en de vorm komen van de RIJ als die ze draagt. Zie
       subMaandCents()/bundelVoor() in slots.js voor waarom dat één plek is. */
    monthlyCents: subMaandCents(sub),
    products: subProducten(sub),
    clips: Number(bundelVoor(sub)['video-motion'] || 0),
    /* Het maandsaldo in credits — de eenheid waarin een abonnement sinds 19
       september 2026 werkelijk rekent. */
    credits: creditsVoor(sub),
  };
}
