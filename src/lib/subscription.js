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
 * Dat is een ontwerpregel en hij zit hier in de code: `plan_queue` is van de
 * KLANT. Deze module leest die rij, verplaatst hem en haalt er de bovenste af
 * als er een venster opengaat — maar er staat nergens een functie die bedenkt
 * wat er in zou moeten. Wat er in de wachtrij staat, heeft de klant getypt.
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
  verbruikSlot, geefSlotTerug, slotBalans, vensterVoor,
  bundelVoor, subMaandCents, subProducten,
} from './slots.js';
// vat.js draagt de BEHANDELINGEN (standaard, verlegd, buiten bereik), quote.js
// geeft het TARIEF door uit pricing.js. Het getal staat hier met opzet niet: een
// noot die het tarief herhaalt, is de vierde plek waar het kan verouderen.
import { VAT_RATE } from './quote.js';

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
export async function loadSubscription(env, customerId) {
  return stil(() => env.DB.prepare(
    `SELECT id, ref, customer_id, plan, term, status, window_day,
            /* Sinds migratie 0038. Leeg bij een pakket, gevuld bij een maand op
               maat — en dat verschil wordt nergens anders gelezen dan in
               bundelVoor()/subMaandCents(). Haal ze hier niet weg: zonder deze
               twee kolommen valt een maand op maat stil terug op een leeg plan,
               en dan staat er een dashboard zonder slots en een bedrag van nul. */
            amount_cents, slots_json,
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
                abonnement afsluiten zonder op de maand te wachten. */
             OR (status = 'cancelled' AND EXISTS (
                   SELECT 1 FROM subscription_months m
                    WHERE m.subscription_id = subscriptions.id AND m.month = ?2)))
      ORDER BY id DESC LIMIT 1`
  ).bind(customerId, monthKey()).first());
}

/** Het abonnement achter een kenmerk — hoe de eerste betaling terugvindt waar hij hoort. */
export async function subscriptionByRef(env, ref) {
  if (!ref) return null;
  return stil(() => env.DB.prepare(
    `SELECT id, ref, customer_id, plan, term, status, amount_cents, slots_json,
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

/** De open wachtrij van een klant, op volgorde. Wat al opgehaald is (taken_at) hoort er niet meer bij. */
export async function loadQueue(env, customerId) {
  const rows = await stil(() => env.DB.prepare(
    /* window_start/window_end/asap staan er sinds migratie 0036 bij: een
       wachtrij-item draagt zijn eigen twee dagen, of zegt uitdrukkelijk dat het
       geen datum wil. Zie de kop van die migratie voor waarom dat op het item zit
       en niet in een aparte planningstabel. */
    `SELECT id, position, name, note, upload_batch, kind, locked_at, created_at,
            window_start, window_end, asap
       FROM plan_queue
      WHERE customer_id = ?1 AND taken_at IS NULL
      ORDER BY position ASC, id ASC`
  ).bind(customerId).all(), { results: [] });
  return rows?.results || [];
}

/* ── WANNEER EEN WACHTRIJ-ITEM AAN DE BEURT IS — 31 augustus 2026 ───────────
 *
 * Twee schrijfacties en verder niets. Het UITREKENEN van welk paar dagen bij een
 * aangewezen dag hoort, gebeurt niet hier maar in de aanroeper, met windowFor()
 * uit capacity.js en de echte agenda erbij. Dat is met opzet: zou dit bestand
 * zelf een paar samenstellen, dan is er een tweede plek die bepaalt wat een
 * venster is, en die kan afwijken van de poort die de bestelstroom gebruikt.
 *
 * Hier staat alleen wat er in de rij komt te staan, en de voorwaarde eromheen:
 * een item dat al opgehaald is, verandert niet meer van dag. */

/** Twee aangewezen dagen op een wachtrij-item zetten. `start` en `end` zijn ISO-dagen. */
export async function queueWindow(env, customerId, id, start, end) {
  const gezet = await stil(() => env.DB.prepare(
    `UPDATE plan_queue
        SET window_start = ?3, window_end = ?4, asap = 0
      WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL
      RETURNING id`
  ).bind(Number(id) || 0, customerId, start, end).first());
  return Boolean(gezet);
}

/**
 * Terug naar "zo snel mogelijk": de dagen worden losgelaten.
 *
 * DE DAGEN WORDEN ECHT LEEGGEMAAKT EN NIET ALLEEN GENEGEERD. Bleef het paar
 * staan met `asap = 1` ernaast, dan houdt src/lib/agenda.js die dagen bezet voor
 * iemand die er geen aanspraak meer op maakt — en dan is de agenda voller dan de
 * studio is.
 */
export async function queueAsap(env, customerId, id) {
  const gezet = await stil(() => env.DB.prepare(
    `UPDATE plan_queue
        SET window_start = NULL, window_end = NULL, asap = 1
      WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL
      RETURNING id`
  ).bind(Number(id) || 0, customerId).first());
  return Boolean(gezet);
}

/** Wat er dit jaar uit de wachtrij is gehaald — "wat je hebt opgebouwd", nieuwste eerst. */
export async function loadTaken(env, customerId, limit = 20) {
  const rows = await stil(() => env.DB.prepare(
    `SELECT q.id, q.name, q.taken_at, q.order_id, o.ref AS order_ref
       FROM plan_queue q
       LEFT JOIN orders o ON o.id = q.order_id
      WHERE q.customer_id = ?1 AND q.taken_at IS NOT NULL
      ORDER BY q.taken_at DESC
      LIMIT ?2`
  ).bind(customerId, limit).all(), { results: [] });
  return rows?.results || [];
}

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
export async function planSaldo(env, customerId) {
  const sub = await loadSubscription(env, customerId);
  if (!sub) {
    return {
      actief: false, sub: null, plan: null, term: null,
      saldo: 0, toegekend: 0, verbruikt: 0, doorgeschoven: 0, vervalt: [],
      clips: { saldo: 0, toegekend: 0, verbruikt: 0 },
      maanden: [],
      maand: monthKey(), betaald: false, volgendeAfschrijving: '',
    };
  }

  const maanden = await loadMonths(env, sub.id, sub.term);

  const maand = monthKey();
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
  /* Geen abonnement, geen wachtrij: loadQueue en loadTaken zouden allebei een
     lege lijst teruggeven en dat is twee queries voor niets. */
  if (!kort?.sub) return { ...kort, wachtrij: [], opgehaald: [], slots: [] };

  /* `slots` erbij sinds migratie 0035. Eén query erbij, en hij hoort hier omdat
     elk scherm dat de toestand van een abonnement toont hem nodig heeft: het
     saldo is sinds die migratie niet één getal maar een regel per soort. */
  const [wachtrij, opgehaald, slots] = await Promise.all([
    loadQueue(env, kort.sub.customer_id),
    loadTaken(env, kort.sub.customer_id),
    slotBalans(env, kort.sub.id, vensterVoor(kort.sub)),
  ]);
  return { ...kort, wachtrij, opgehaald, slots };
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

/* ── DE WACHTRIJ ────────────────────────────────────────────────────────────
 *
 * Van de klant, door de klant gevuld. Deze functies verplaatsen en verwijderen;
 * ze verzinnen niets.
 */

const QUEUE_MAX = 40;

/**
 * Hoeveel er op de lijst mag. Als functie naar buiten en niet als los getal,
 * zodat de grens op één plek staat: het dashboard dat de klant WAARSCHUWT dat
 * zijn lijst vol is en de queueAdd die hem WEIGERT lezen nu hetzelfde getal.
 * Twee keer veertig intypen is precies hoe een melding gaat liegen zodra er
 * ooit vijftig van wordt gemaakt.
 */
export function queueMax() { return QUEUE_MAX; }

/** Achteraan toevoegen. Geeft de nieuwe rij terug, of null als de rij vol is. */
/**
 * Een product op de lijst zetten. ALTIJD als CONCEPT.
 *
 * `locked_at` blijft leeg, en dat is de kern van het model dat Lucas op
 * 29 augustus 2026 koos: *"wat de klant dan moet doen is alle informatie van
 * het product invoeren en op confirm klikken waardoor ze een slot hebben
 * gelockt"*. Toevoegen kost dus niets. Pas queueLock() schrijft een slot af.
 *
 * Waarom die twee stappen uit elkaar staan: een product invullen is werk dat je
 * kunt onderbreken. Zou de eerste toets al een slot kosten, dan durft niemand te
 * beginnen zonder zeker te weten dat hij het afmaakt.
 */
export async function queueAdd(env, customerId, { name, note = '', uploadBatch = null, kind = 'complete' }) {
  const naam = String(name || '').trim().slice(0, 120);
  if (!naam) return null;
  const open = await loadQueue(env, customerId);
  /* Een grens, en een royale. Niet omdat veertig producten te veel werk zijn,
   * maar omdat een wachtrij die eindeloos groeit een lijst wordt die niemand
   * meer bijhoudt — en dan is hij geen plan meer maar een archief. */
  if (open.length >= QUEUE_MAX) return null;
  const achteraan = open.length ? Math.max(...open.map((q) => Number(q.position) || 0)) + 1 : 0;
  return stil(() => env.DB.prepare(
    `INSERT INTO plan_queue (customer_id, position, name, note, upload_batch, kind)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     RETURNING id, position, name, note, upload_batch, kind, locked_at, created_at`
  ).bind(customerId, achteraan, naam, String(note || '').trim().slice(0, 500) || null, uploadBatch,
         String(kind || 'complete')).first());
}

/**
 * VASTZETTEN: van concept naar geboekt, met één slot eraf.
 *
 * Dit is de handeling waar het hele model op hangt. Hij doet drie dingen, in
 * deze volgorde, en die volgorde is niet vrij:
 *
 *   1 · KIJKEN of het item bestaat, van deze klant is, en nog niet vast staat.
 *   2 · HET SLOT AFSCHRIJVEN met verbruikSlot() — oudste maand eerst.
 *   3 · PAS DAARNA `locked_at` zetten.
 *
 * Andersom zou een item vast kunnen komen te staan zonder dat er een slot voor
 * is afgeschreven, en dat is de dure kant van de fout: onzichtbaar werk waar
 * niet voor betaald is. Nu is de goedkope kant mogelijk — een afgeschreven slot
 * zonder vastgezet item — en die is zichtbaar in het saldo, dus corrigeerbaar.
 *
 * ZONDER FOTO'S GEEN VASTZETTEN. Een item zonder upload_batch kan niet gemaakt
 * worden; het vastzetten ervan zou een slot kosten voor werk dat blijft liggen.
 * Vandaar dat dit hier weigert en niet pas in de week.
 */
export async function queueLock(env, customerId, id) {
  const rij = await stil(() => env.DB.prepare(
    'SELECT id, kind, upload_batch, locked_at FROM plan_queue WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL'
  ).bind(Number(id) || 0, customerId).first());
  if (!rij) return { ok: false, reden: 'niet-gevonden' };
  if (rij.locked_at) return { ok: true, reden: 'stond-al-vast' };
  if (!String(rij.upload_batch || '').trim()) return { ok: false, reden: 'geen-fotos' };

  const sub = await loadSubscription(env, customerId);
  if (!sub) return { ok: false, reden: 'geen-abonnement' };
  /* ── OPGEZEGD MAG NOG, GEPAUZEERD NIET ──────────────────────────────────────
   *
   * Hier stond `status !== 'active'`, en dat sloot een opgezegd abonnement
   * meteen af. Dat is één dag te vroeg: loadSubscription() laat een opgezegd
   * abonnement zijn BETAALDE maand uitzitten, en dezelfde uitzondering staat al
   * in verbruikToestaan() met dezelfde reden — wie tot het eind van de maand
   * betaald heeft, mag tot het eind van de maand vastzetten.
   *
   * Wat hij niet meer krijgt is het DOORSCHUIVEN, en dat regelt vensterVoor():
   * die geeft een opgezegd abonnement een venster van nul, dus verbruikSlot()
   * hieronder ziet alleen de slots van deze maand. Precies wat Lucas beschreef:
   * de laatste betaalde maand nog opmaken, maar niets meenemen naar een maand
   * waarin hij geen abonnement meer heeft.
   *
   * Gepauzeerd blijft nee. Pauzeren is de klant die zelf zegt dat het even stil
   * moet; zijn slots blijven staan voor als hij hervat. */
  const magVastzetten = sub.status === 'active' || sub.status === 'cancelled';
  if (!magVastzetten) return { ok: false, reden: `abonnement-${sub.status}` };

  const soort = String(rij.kind || 'complete');
  const geboekt = await verbruikSlot(env, sub.id, vensterVoor(sub), soort, 1);
  if (geboekt !== 1) return { ok: false, reden: 'geen-slot', soort };

  const gezet = await stil(() => env.DB.prepare(
    "UPDATE plan_queue SET locked_at = datetime('now') WHERE id = ?1 AND customer_id = ?2 AND locked_at IS NULL RETURNING id"
  ).bind(rij.id, customerId).first());
  if (!gezet) {
    /* De UPDATE raakte niets terwijl het slot al af is. Eén oorzaak is denkbaar:
       een tweede tabblad was net eerder. Het slot terugdraaien is dan het juiste
       antwoord — anders kost één product twee slots. */
    await geefSlotTerug(env, sub.id, vensterVoor(sub), soort, 1);
    return { ok: true, reden: 'stond-al-vast' };
  }
  return { ok: true, soort };
}

/**
 * LOSMAKEN: het slot komt terug.
 *
 * Dit moest er zijn. Zonder losmaken kost een typefout een slot, en dan durft
 * niemand meer op vastzetten te drukken — precies het omgekeerde van wat de knop
 * moet doen. Het slot gaat terug naar de NIEUWSTE maand; zie de noot bij
 * geefSlotTerug() voor waarom dat de eerlijke kant is.
 *
 * Alleen zolang het item nog niet is opgepakt. Staat er `taken_at`, dan is het
 * werk begonnen en is losmaken geen administratie meer maar een annulering.
 */
export async function queueUnlock(env, customerId, id) {
  const rij = await stil(() => env.DB.prepare(
    'SELECT id, kind, locked_at FROM plan_queue WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL'
  ).bind(Number(id) || 0, customerId).first());
  if (!rij) return { ok: false, reden: 'niet-gevonden' };
  if (!rij.locked_at) return { ok: true, reden: 'stond-al-los' };

  /* ── `taken_at IS NULL` STAAT IN DE UPDATE EN NIET ALLEEN IN DE PEILING ────
   *
   * Gevonden bij de misbruikronde van 30 augustus 2026, op Lucas' vraag of een
   * klant langs deze weg gratis werk kan krijgen. Ja, en zo:
   *
   *   · de klant heeft vijf items vastgezet;
   *   · Lucas drukt op "start deze week" — startPlanWindow() heeft de lijst net
   *     gelezen en staat op het punt taken_at te zetten;
   *   · de klant drukt in datzelfde ogenblik op "losmaken".
   *
   * De SELECT hierboven zag taken_at nog leeg, dus de oude UPDATE gaf het slot
   * terug — en een tel later staat het item in een bestelling die gemaakt gaat
   * worden. Product gemaakt, slot terug: gratis werk, en niets dat het meldt.
   *
   * Het venster is klein en het vraagt twee klikken op dezelfde seconde. Dat is
   * geen reden om het te laten staan: het is precies het soort fout dat een keer
   * per kwartaal gebeurt en dan niet te reconstrueren is. De voorwaarde hoort in
   * de UPDATE, want alleen de database kan hem op het juiste moment toetsen. */
  const gezet = await stil(() => env.DB.prepare(
    `UPDATE plan_queue SET locked_at = NULL
      WHERE id = ?1 AND customer_id = ?2 AND locked_at IS NOT NULL AND taken_at IS NULL
      RETURNING id`
  ).bind(rij.id, customerId).first());
  if (!gezet) return { ok: true, reden: 'stond-al-los' };

  const sub = await loadSubscription(env, customerId);
  if (sub) await geefSlotTerug(env, sub.id, vensterVoor(sub), String(rij.kind || 'complete'), 1);
  return { ok: true };
}

/** Eén item weg. Alleen van deze klant — de customer_id staat in de WHERE en niet in een controle ervoor. */
export async function queueRemove(env, customerId, id) {
  /* ── EERST WEGHALEN, DAN PAS TERUGBOEKEN — omgedraaid 30 augustus 2026 ─────
   *
   * Hier stond queueUnlock() vóór de DELETE. Dat gaf het slot terug op grond van
   * een peiling, en pas daarna werd geprobeerd de rij weg te halen. Gaat die
   * DELETE niet door — omdat de rij inmiddels is opgepakt, of omdat een tweede
   * tabblad net eerder was — dan is het slot terug en staat het item er nog of
   * zit het in een bestelling. Gratis werk, langs dezelfde weg als bij
   * queueUnlock() hierboven.
   *
   * Omgekeerd is er precies één bron van waarheid: de DELETE zelf. Wat hij
   * teruggeeft is wat er werkelijk is weggehaald, en alleen dáárvoor gaat er een
   * slot terug. Twee tabbladen die tegelijk weghalen leveren dus één teruggave,
   * zonder dat er een teller of een vlag bijgehouden hoeft te worden.
   *
   * MISLUKT HET TERUGBOEKEN NA DE DELETE, dan is de klant een slot kwijt en niet
   * wij een product. Dat is de goedkope kant van deze fout — het is met de knop
   * "Slots bijstellen" in /admin recht te zetten — en hij gaat luid naar de log
   * zodat hij niet stil blijft. */
  const rij = await stil(() => env.DB.prepare(
    `DELETE FROM plan_queue
      WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL
      RETURNING id, kind, locked_at`
  ).bind(Number(id) || 0, customerId).first());
  if (!rij) return false;
  if (!rij.locked_at) return true;   // een concept kostte nog niets

  const sub = await loadSubscription(env, customerId);
  const terug = sub
    ? await geefSlotTerug(env, sub.id, vensterVoor(sub), String(rij.kind || 'complete'), 1)
    : 0;
  if (terug !== 1) {
    console.error('[abonnement] item', rij.id, 'weggehaald maar het slot niet teruggeboekt —',
      sub ? 'zet het bij via het abonnementspaneel in /admin' : 'er is geen abonnement meer');
  }
  return true;
}

/**
 * De hele volgorde in één keer zetten.
 *
 * `ids` is de volgorde zoals de klant hem heeft neergelegd. Alles wat niet in
 * zijn eigen open wachtrij zit, valt eruit — een id uit een ander account of een
 * al opgehaald item kan de volgorde dus niet aanraken. Wat hij WEL heeft maar
 * niet meestuurde, blijft achteraan staan in de oude volgorde; een item stilletjes
 * laten verdwijnen omdat een formulier onvolledig postte, is erger dan een item
 * dat onderaan belandt.
 */
export async function queueReorder(env, customerId, ids) {
  const open = await loadQueue(env, customerId);
  const geldig = new Set(open.map((q) => q.id));
  const volgorde = [];
  for (const raw of Array.isArray(ids) ? ids : []) {
    const id = Number(raw);
    if (geldig.has(id) && !volgorde.includes(id)) volgorde.push(id);
  }
  for (const q of open) if (!volgorde.includes(q.id)) volgorde.push(q.id);
  if (!volgorde.length) return 0;

  const stmts = volgorde.map((id, i) => env.DB
    .prepare('UPDATE plan_queue SET position = ?1, updated_at = datetime(\'now\') WHERE id = ?2 AND customer_id = ?3')
    .bind(i, id, customerId));
  await stil(() => env.DB.batch(stmts));
  return volgorde.length;
}

/* ── queueTake() STOND HIER, EN IS WEG — 30 augustus 2026 ───────────────────
 *
 * Hij pakte "de bovenste N van de lijst". Dat was het model tot migratie 0035:
 * wij bepaalden wat er meeging, op volgorde. Sindsdien bepaalt de KLANT dat door
 * vast te zetten, en `startPlanWindow()` gebruikt daarom queueTakeIds() op wat
 * vastgezet is. Deze functie had buiten één toets geen enkele aanroeper meer.
 *
 * Hij is niet weggehaald omdat hij ongebruikt was, maar omdat hij LOOG. Sinds
 * queueTakeIds() ook `locked_at IS NOT NULL` eist, pakte hij niets meer op — en
 * hij gaf nog steeds de rij terug die hij had wíllen pakken. Een functie die
 * meldt dat er werk klaarstaat terwijl er niets is opgepakt, is precies het
 * soort stille fout waar de misbruikronde van vandaag over ging.
 *
 * Wie ooit weer "pak de bovenste N" nodig heeft, bouwt hem op queueTakeIds() en
 * geeft terug wat DIE teruggeeft. */


/**
 * Dezelfde handeling, maar op AANGEWEZEN items in plaats van op de bovenste N.
 *
 * Nodig sinds startPlanWindow() in planStart.js: die slaat items zonder foto's
 * over, dus "de bovenste drie" en "de drie die opgepakt worden" zijn niet meer
 * hetzelfde rijtje. Beide wegen delen deze ene UPDATE — twee plekken met
 * dezelfde SQL is één plek die ooit vergeten wordt.
 *
 * `taken_at IS NULL` in de WHERE is het slot: twee keer starten pakt niets
 * dubbel, en dat is precies wat een knop nodig heeft die per ongeluk twee keer
 * kan worden ingedrukt. `customer_id` staat erbij om dezelfde reden als bij
 * queueRemove(): eigendom hoort in de WHERE en niet in een controle ervoor.
 */
/**
 * Items oppakken. Geeft terug welke er WERKELIJK zijn opgepakt.
 *
 * ── TWEE DINGEN VERANDERD OP 30 AUGUSTUS 2026 ───────────────────────────────
 *
 * 1 · `locked_at IS NOT NULL` staat in de WHERE. Zonder die voorwaarde pakt deze
 *     functie ook een item op dat de klant tussen het lezen van de lijst en dit
 *     moment heeft losgemaakt — en dan is het slot terug én wordt het product
 *     gemaakt. Zie de noot bij queueUnlock(); dit is dezelfde deur, aan de
 *     andere kant.
 *
 * 2 · Hij gaf `lijst.length` terug, ongeacht wat er gebeurde. Dat is geen
 *     telling maar een echo van de vraag: viel er één af, dan zei hij nog steeds
 *     dat alles was opgepakt, en startPlanWindow() bouwde er een bestelling
 *     omheen die niet klopte. Nu telt hij de rijen die de database daadwerkelijk
 *     heeft aangeraakt.
 */
export async function queueTakeIds(env, customerId, ids) {
  const lijst = (Array.isArray(ids) ? ids : []).map(Number).filter(Boolean);
  if (!lijst.length) return 0;
  const gepakt = [];
  for (const id of lijst) {
    const rij = await stil(() => env.DB.prepare(
      `UPDATE plan_queue SET taken_at = datetime('now')
        WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL AND locked_at IS NOT NULL
        RETURNING id`
    ).bind(id, customerId).first());
    if (rij) gepakt.push(rij.id);
  }
  return gepakt;
}

/**
 * Het oppakken terugdraaien. Alleen voor het geval dat de bestelling er daarna
 * niet komt — zie startPlanWindow().
 *
 * Zonder deze functie zou een mislukte INSERT een klant achterlaten met items
 * die als opgepakt gemarkeerd staan en nergens bij horen: zijn slot is op, er is
 * geen bestelling, en op zijn scherm is het item verdwenen. Dat is de enige
 * uitkomst die erger is dan het werk te veel maken.
 */
export async function queueUntakeIds(env, ids) {
  const lijst = (Array.isArray(ids) ? ids : []).map(Number).filter(Boolean);
  if (!lijst.length) return 0;
  let terug = 0;
  for (const id of lijst) {
    const rij = await stil(() => env.DB.prepare(
      'UPDATE plan_queue SET taken_at = NULL WHERE id = ?1 AND order_id IS NULL RETURNING id'
    ).bind(id).first());
    if (rij) terug += 1;
  }
  return terug;
}

/** De bestelling aan de opgehaalde items hangen, zodra die bestaat. */
export async function queueLinkOrder(env, ids, orderId) {
  const lijst = (Array.isArray(ids) ? ids : []).map(Number).filter(Boolean);
  if (!lijst.length || !orderId) return 0;
  const stmts = lijst.map((id) => env.DB
    .prepare('UPDATE plan_queue SET order_id = ?1 WHERE id = ?2')
    .bind(orderId, id));
  await stil(() => env.DB.batch(stmts));
  return lijst.length;
}

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
  customerId, planId, termId, windowDay = null, slots = null, amountCents = null,
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
  const dag = Number.isFinite(Number(windowDay)) ? Math.min(28, Math.max(1, Math.floor(Number(windowDay)))) : null;
  try {
    const btw = await vatVoorAbonnement(env, customerId);
    const row = await env.DB.prepare(
      `INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day,
                                  amount_cents, slots_json,
                                  vat_treatment, vat_rate, vat_country, vat_number)
       VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       RETURNING id, ref, plan, term, status, window_day, amount_cents, slots_json`
    ).bind(customerId, ref, planId, termId, dag,
           planId === CUSTOM_MONTH_ID ? Math.round(Number(amountCents)) : null,
           slots && Object.keys(slots).length ? JSON.stringify(slots) : null,
           btw.treatment, btw.rate, btw.country, btw.number).first();
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
export async function pauseSubscription(env, subId, reason = 'customer') {
  return stil(() => env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'paused', paused_at = datetime('now'), pause_reason = ?2, updated_at = datetime('now')
      WHERE id = ?1 AND status IN ('active', 'pending')
      RETURNING id, status`
  ).bind(subId, String(reason || 'customer').slice(0, 40)).first());
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
 * Hoeveel plekken er nog vrij zijn — geteld over de database en niet over een
 * getal in een bestand.
 *
 * seatsLeft() in plans.js rekent uit hoeveel abonnementen er PASSEN; deze functie
 * telt hoeveel er al zijn. De pagina die "nog N plekken" toont, heeft ze allebei
 * nodig, en het verschil is precies waarom ze niet één functie zijn: het budget
 * is een besluit, de bezetting is een feit.
 */
export async function bezetting(env) {
  const rows = await stil(() => env.DB.prepare(
    /* Per RIJ en niet per plan, sinds migratie 0038: twee maanden op maat zijn
       niet even groot, dus een GROUP BY plan met een vermenigvuldiging zou het
       aantal van de eerste op allebei plakken. */
    `SELECT plan, slots_json, 1 AS n
       FROM subscriptions
      WHERE status IN ('active', 'pending', 'paused')`
  ).all(), { results: [] });
  const per = {};
  let producten = 0;
  for (const r of rows?.results || []) {
    per[r.plan] = Number(r.n) || 0;
    /* subProducten() en niet productsFor(): een maand op maat heeft geen vast
       aantal en draagt zijn bundel op de rij. Vandaar ook dat de query hierboven
       slots_json meeneemt en niet alleen op plan groepeert — voor 'maat' zegt de
       plan-id niets over hoeveel agenda er wordt vastgelegd. */
    producten += subProducten(r);
  }
  return { per, producten };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN GEANNULEERDE ABONNEMENTSWEEK TERUGDRAAIEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Gevonden op 29 augustus 2026, bij het nalopen van de keten na migratie 0035.
 *
 * Losmaken en weghalen op de klantlijst geven het slot netjes terug. Annuleren
 * in /admin deed dat niet, en dat is de duurste van de drie: de klant heeft zijn
 * slot betaald met zijn maandtermijn, het product is niet gemaakt, en zowel het
 * slot als het item waren weg. Twee keer betalen voor niets, en onzichtbaar —
 * er is geen scherm waarop je ziet dat er een slot ontbreekt.
 *
 * ── DE INVARIANT DIE DIT OVEREIND HOUDT ─────────────────────────────────────
 *
 * `locked_at` gezet ⟺ er is één slot van die soort afgeschreven. Alles in dit
 * model hangt daaraan. Daarom komt een item hier terug als CONCEPT en niet als
 * vastgezet item: het slot gaat terug naar de klant, dus mag de rij niet blijven
 * beweren dat er voor betaald is. Hij ziet zijn product terug op zijn lijst,
 * mét zijn foto’s, en zet het opnieuw vast wanneer hij wil.
 *
 * ── DE UPDATE IS DE AUTORITEIT EN NIET DE PEILING ERVOOR ────────────────────
 *
 * Er wordt niet eerst gelezen welke items eraan hangen en daarna geschreven.
 * De UPDATE draagt zijn eigen voorwaarde en geeft met RETURNING terug wat hij
 * werkelijk heeft losgemaakt — en alleen daarvoor gaan er slots terug. Twee keer
 * annuleren geeft de tweede keer dus nul rijen en nul slots, zonder dat er een
 * teller of een vlag bijgehouden hoeft te worden.
 *
 * ── GEEN ABONNEMENT MEER? DAN GAAT HET ITEM WÉL TERUG EN HET SLOT NIET ──────
 *
 * Een opgezegd abonnement waarvan de betaalde maand voorbij is, bestaat voor
 * loadSubscription() niet meer. Er is dan geen rij om het slot op terug te
 * boeken. Het item terugzetten kan wel en hoort ook: zijn product en zijn foto’s
 * zijn van hem. Dat verschil staat in de uitkomst zodat de aanroeper het luid
 * kan loggen — stil "geen slots teruggegeven" is precies hoe dit gat ontstond.
 *
 * @returns {Promise<{items: number, slots: number, perSoort: Record<string, number>, abonnement: boolean}>}
 */
export async function queueTerugNaAnnulering(env, orderId) {
  const leeg = { items: 0, slots: 0, perSoort: {}, abonnement: false };
  if (!env?.DB || !orderId) return leeg;

  /* Achteraan op de lijst, en niet op hun oude plek. De klant heeft in de tussen-
     tijd van alles kunnen toevoegen; iets wat weken geleden is opgepakt boven-
     aan terugzetten zou zijn volgorde omgooien op een moment dat hij er niet bij
     is. `+ id` houdt ze onderling in dezelfde volgorde als waarin ze stonden. */
  const achteraan = await stil(() => env.DB.prepare(
    `SELECT COALESCE(MAX(position), -1) + 1 AS n FROM plan_queue
      WHERE customer_id = (SELECT customer_id FROM plan_queue WHERE order_id = ?1 LIMIT 1)
        AND taken_at IS NULL`
  ).bind(orderId).first().then((r) => Number(r?.n || 0)), 0);

  const terug = await stil(() => env.DB.prepare(
    `UPDATE plan_queue
        SET order_id = NULL, taken_at = NULL, locked_at = NULL,
            position = ?2 + id, updated_at = datetime('now')
      WHERE order_id = ?1 AND taken_at IS NOT NULL
      RETURNING id, customer_id, kind`
  ).bind(orderId, achteraan).all().then((r) => r?.results || []), []);
  if (!terug.length) return leeg;

  const perSoort = {};
  for (const r of terug) {
    const k = String(r.kind || 'complete');
    perSoort[k] = (perSoort[k] || 0) + 1;
  }

  const sub = await loadSubscription(env, terug[0].customer_id);
  if (!sub) {
    console.error('[abonnement] bestelling', orderId, 'geannuleerd —', terug.length,
      'item(s) terug op de lijst, maar er is geen abonnement meer om de slots op terug te boeken');
    return { items: terug.length, slots: 0, perSoort, abonnement: false };
  }

  let slots = 0;
  for (const [soort, n] of Object.entries(perSoort)) {
    const gaf = await geefSlotTerug(env, sub.id, vensterVoor(sub), soort, n);
    slots += gaf;
    if (gaf !== n) {
      console.error('[abonnement] niet alle slots terug voor bestelling', orderId,
        '\u2014 soort', soort + ':', gaf, 'van', n);
    }
  }
  return { items: terug.length, slots, perSoort, abonnement: true };
}

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
  };
}
