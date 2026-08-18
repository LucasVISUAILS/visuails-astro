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
  PLAN_IDS, TERM_IDS, PLAN_SERVICE,
  productsFor, clipsFor, monthlyCents, available, rolloverMonths, rolloverDetail,
  addMonths, planShape,
} from '../data/plans.js';

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
    'SELECT id, ref, customer_id, plan, term, status, mollie_customer_id FROM subscriptions WHERE ref = ?1'
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
    `SELECT id, position, name, note, upload_batch, created_at
       FROM plan_queue
      WHERE customer_id = ?1 AND taken_at IS NULL
      ORDER BY position ASC, id ASC`
  ).bind(customerId).all(), { results: [] });
  return rows?.results || [];
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
export async function planState(env, customerId) {
  const sub = await loadSubscription(env, customerId);
  if (!sub) {
    return {
      actief: false, sub: null, plan: null, term: null,
      saldo: 0, toegekend: 0, verbruikt: 0, doorgeschoven: 0, vervalt: [],
      clips: { saldo: 0, toegekend: 0, verbruikt: 0 },
      maanden: [], wachtrij: [], opgehaald: [],
      maand: monthKey(), betaald: false, volgendeAfschrijving: '',
    };
  }

  const [maanden, wachtrij, opgehaald] = await Promise.all([
    loadMonths(env, sub.id, sub.term),
    loadQueue(env, sub.customer_id),
    loadTaken(env, sub.customer_id),
  ]);

  const maand = monthKey();
  const deze = maanden.find((m) => m.month === maand) || null;
  /* De geschiedenis die available() krijgt, zijn de VOORBIJE maanden — deze
   * maand zit al in het plan zelf. Zie de noot bij available(). */
  const eerder = maanden.filter((m) => m.month !== maand);

  const bruto = available(sub.plan, sub.term, eerder);
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
  const clipsBruto = clipsFor(sub.plan) + eerder
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
    wachtrij,
    opgehaald,
    maand,
    /* Is er voor DEZE maand betaald? De webhook maakt de maandrij aan op het
     * moment dat de afschrijving binnen is, dus het bestaan van de rij ís het
     * betaalbewijs. Een abonnee wiens betaling nog loopt, ziet zijn saldo maar
     * kan er niets mee — zie verbruikToestaan() hieronder. */
    betaald: Boolean(deze),
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

/* ── DE WACHTRIJ ────────────────────────────────────────────────────────────
 *
 * Van de klant, door de klant gevuld. Deze functies verplaatsen en verwijderen;
 * ze verzinnen niets.
 */

const QUEUE_MAX = 40;

/** Achteraan toevoegen. Geeft de nieuwe rij terug, of null als de rij vol is. */
export async function queueAdd(env, customerId, { name, note = '', uploadBatch = null }) {
  const naam = String(name || '').trim().slice(0, 120);
  if (!naam) return null;
  const open = await loadQueue(env, customerId);
  /* Een grens, en een royale. Niet omdat veertig producten te veel werk zijn,
   * maar omdat een wachtrij die eindeloos groeit een lijst wordt die niemand
   * meer bijhoudt — en dan is hij geen plan meer maar een archief. */
  if (open.length >= QUEUE_MAX) return null;
  const achteraan = open.length ? Math.max(...open.map((q) => Number(q.position) || 0)) + 1 : 0;
  return stil(() => env.DB.prepare(
    `INSERT INTO plan_queue (customer_id, position, name, note, upload_batch)
     VALUES (?1, ?2, ?3, ?4, ?5)
     RETURNING id, position, name, note, upload_batch, created_at`
  ).bind(customerId, achteraan, naam, String(note || '').trim().slice(0, 500) || null, uploadBatch).first());
}

/** Eén item weg. Alleen van deze klant — de customer_id staat in de WHERE en niet in een controle ervoor. */
export async function queueRemove(env, customerId, id) {
  const row = await stil(() => env.DB.prepare(
    'DELETE FROM plan_queue WHERE id = ?1 AND customer_id = ?2 AND taken_at IS NULL RETURNING id'
  ).bind(Number(id) || 0, customerId).first());
  return Boolean(row);
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

/**
 * De bovenste `n` uit de wachtrij pakken en als opgehaald markeren.
 *
 * Wat de nachtelijke taak doet als een venster opengaat. `taken_at` wordt in
 * dezelfde UPDATE gezet die de rij selecteert — een taak die twee keer draait
 * (een herstart, een handmatige aanroep) pakt de tweede keer niets meer.
 *
 * `order_id` komt er in een tweede stap bij, zodra de bestelling er is. De
 * volgorde is met opzet zo: liever een opgehaald item zonder bestelling — dat is
 * zichtbaar en te herstellen — dan een bestelling die twee keer wordt geplaatst
 * omdat de markering pas achteraf kwam.
 */
export async function queueTake(env, customerId, n) {
  const aantal = Math.max(0, Math.floor(Number(n) || 0));
  if (!aantal) return [];
  const open = await loadQueue(env, customerId);
  const pakken = open.slice(0, aantal);
  if (!pakken.length) return [];
  const stmts = pakken.map((q) => env.DB
    .prepare('UPDATE plan_queue SET taken_at = datetime(\'now\') WHERE id = ?1 AND taken_at IS NULL')
    .bind(q.id));
  await stil(() => env.DB.batch(stmts));
  return pakken;
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
export async function createSubscriptionRow(env, { customerId, planId, termId, windowDay = null }) {
  if (!PLAN_IDS.includes(planId)) throw new Error(`abonnement: onbekend plan ${planId}`);
  if (!TERM_IDS.includes(termId)) throw new Error(`abonnement: onbekende termijn ${termId}`);
  const ref = makeSubRef();
  const dag = Number.isFinite(Number(windowDay)) ? Math.min(28, Math.max(1, Math.floor(Number(windowDay)))) : null;
  try {
    const row = await env.DB.prepare(
      `INSERT INTO subscriptions (customer_id, ref, plan, term, status, window_day)
       VALUES (?1, ?2, ?3, ?4, 'pending', ?5)
       RETURNING id, ref, plan, term, status, window_day`
    ).bind(customerId, ref, planId, termId, dag).first();
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
    `SELECT plan, COUNT(*) AS n
       FROM subscriptions
      WHERE status IN ('active', 'pending', 'paused')
      GROUP BY plan`
  ).all(), { results: [] });
  const per = {};
  let producten = 0;
  for (const r of rows?.results || []) {
    per[r.plan] = Number(r.n) || 0;
    producten += (Number(r.n) || 0) * productsFor(r.plan);
  }
  return { per, producten };
}

/**
 * De vorm waarin een abonnement in een mail, een orderregel of een adminpaneel
 * verschijnt. Eén plek, zodat er niet drie manieren ontstaan om "Studio,
 * jaartermijn, €790 per maand" op te schrijven.
 */
export function subscriptionShape(sub) {
  if (!sub) return null;
  const vorm = planShape(sub.plan, sub.term);
  return {
    ...vorm,
    ref: sub.ref,
    status: sub.status,
    windowDay: sub.window_day,
    service: PLAN_SERVICE,
    monthlyCents: monthlyCents(sub.plan, sub.term),
    products: productsFor(sub.plan),
    clips: clipsFor(sub.plan),
  };
}
