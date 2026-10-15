/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET CREDITBOEK — elke bij- en afschrijving van credits, met datum en reden
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 8 oktober 2026, ronde B ("abonnement zonder week"). Lucas, 6 oktober: een
 * abonnee bestelt via het gewone formulier en betaalt met credits (§28). Dit
 * bestand is de motor daarachter. Tabel: `credit_boek` (migratie 0061).
 *
 * LET OP DE WOORDEN. "Credits" zijn de eenheden van een abonnement (dit
 * bestand). "Tegoed" is geld in euro's (`customer_credits`, tegoedVerrekening.js)
 * — die tabel heet in de code ongelukkig ook "credits". Tegoed wordt nooit
 * credits en credits worden nooit euro's (2.02).
 *
 * ── ÉÉN TABEL, TWEE SOORTEN REGELS ───────────────────────────────────────────
 *
 *   + regel  een PARTIJ credits die binnenkomt: een termijn, credits terug na een
 *            annulering of voor een product dat niet gemaakt kon worden, of een
 *            bijstelling door Lucas. Draagt `vervalt_op` (binnenkomst plus
 *            CREDITS_GELDIG_MAANDEN, 6.03 / V43 = a) en `rest`: wat er van deze
 *            partij nog over is.
 *   − regel  een afschrijving: een bestelling, een bijstelling, of het
 *            ongebruikte deel van een terugbetaalde termijn (V49 = a). Draagt in
 *            `partijen` welke + regels hij opmaakte ([{"id":12,"n":30}, …]).
 *
 * Wat er vervalt, staat niet als regel in de tabel: een partij met `rest > 0`
 * waarvan `vervalt_op` voorbij is, IS vervallen, en creditboek() zet er een
 * regel "vervallen" voor op die datum. Er is dus geen nachttaak die iets moet
 * opruimen, en een vervaldatum kan niet uit de pas lopen met het saldo.
 *
 * ── OUDSTE EERST (6.03) ─────────────────────────────────────────────────────
 *
 * Een afschrijving maakt eerst de partij op die het eerst vervalt. Anders
 * vervallen oude credits terwijl de klant nieuwe gebruikt.
 *
 * ── TWEE BESTELLINGEN TEGELIJK ──────────────────────────────────────────────
 *
 * De afschrijving is één D1-batch (één transactie): de bestelling op 'credits',
 * de − regel, en per partij `rest = rest - n`. De tabel heeft CHECK (rest >= 0):
 * wil een tweede bestelling een partij opmaken die de eerste net leeg had, dan
 * faalt die batch als geheel en is er niets veranderd. Dan wordt er opnieuw
 * gelezen en verdeeld; past het niet meer, dan "te weinig". Twee bestellingen
 * samen kunnen dus nooit meer afboeken dan er is.
 *
 * ── HET SPAARPLAFOND — 12 oktober 2026 (afvinklijst 4: ab-v1 = c, ab-v2 = a) ─
 *
 * Tot vandaag verviel elke partij 3 maanden na binnenkomst, ook bij een lopend
 * abonnement. Een Pro-klant had zo vier vervaldatums tegelijk. Lucas koos:
 *
 *   1. Zolang het abonnement loopt, vervalt er niets.
 *   2. Je hebt hoogstens CREDITS_GELDIG_MAANDEN maanden aan credits (het
 *      plafond: spaarPlafond() in pricing.js, Pro 360). Brengt een termijn je
 *      erboven, dan vervalt wat erboven komt, op de dag van die termijn: één
 *      − regel 'plafond', van de oudste partijen af.
 *   3. Pauzeer of stop je, dan blijft alles geldig tot CREDITS_GELDIG_MAANDEN
 *      maanden na je laatste termijn: één datum.
 *
 * Hoe het boek dat doet zonder nieuwe kolom: elke termijn schuift de datum van
 * alle levende partijen op naar zijn eigen datum (binnenkomst + 3 maanden).
 * Komt elke maand een termijn, dan haalt geen partij ooit zijn datum (regel 1);
 * komt er geen meer, dan vervalt alles samen 3 maanden na de laatste (regel 3).
 * Een partij met `rest > 0` en `vervalt_op` voorbij IS dus nog steeds vervallen,
 * en elke query die dat leest, blijft kloppen. Oude partijen in de database
 * blijven geldig: bij de eerstvolgende termijn schuiven ze mee.
 *
 * Wat er tussen twee termijnen bij komt (credits terug na een annulering of
 * "niet gemaakt", een bijstelling, credits die na een terugboeking vrijkomen)
 * krijgt dezelfde datum als de rest, telt mee in het saldo en dus ook mee voor
 * het plafond bij de volgende termijn. Zie creditsTerugVoorBestelling().
 *
 * Bijgekochte credits (deel 2, reden 'bijgekocht') vallen hier buiten: ze
 * hebben hun eigen datum, schuiven niet mee en tellen niet mee voor het plafond.
 *
 * Het saldo hangt aan de KLANT en niet aan de status van het abonnement: na een
 * pauze of opzegging blijven de credits tot hun (ene) datum bruikbaar.
 */
import { CREDITS_GELDIG_MAANDEN, spaarPlafond } from '../data/pricing.js';
import { TERMS } from '../data/plans.js';
import { creditsVoor } from './slots.js';
import { termijnMaand, termijnEinde } from './subscription.js';

/** De redenen in het creditboek. Vaste woorden; het scherm vertaalt ze. */
export const CREDIT_REDEN = Object.freeze({
  termijn: 'termijn',            // + credits uit een betaalde termijn
  bestelling: 'bestelling',      // − een bestelling betaald met credits
  annulering: 'annulering',      // + credits terug na annuleren (6.08)
  nietGemaakt: 'niet-gemaakt',   // + credits terug voor een product dat niet gemaakt kon worden (6.08)
  bijstelling: 'bijstelling',    // ± Lucas in /admin, altijd met toelichting (6.08)
  terugbetaald: 'terugbetaald',  // − ongebruikte credits van een terugbetaalde termijn (V49 = a)
  verbruikt: 'verbruikt',        // − verbruik van vóór het creditboek (migratie 0061)
  vervallen: 'vervallen',        // − alleen afgeleid in creditboek(), nooit opgeslagen
  bevroren: 'bevroren',          // − credits van een teruggeboekte termijn, vast tot Mollie het terugdraait (8.11, V50 = a)
  vrijgegeven: 'vrijgegeven',    // + diezelfde credits weer vrij, met hun eigen vervaldatum (8.11)
  plafond: 'plafond',            // − boven het spaarplafond vervallen, op de dag van een termijn (12 okt 2026)
  bijgekocht: 'bijgekocht',      // + extra credits gekocht en betaald (12 okt 2026, migratie 0067)
});

/* De soort van een partij (migratie 0067): 'bijgekocht' bij gekochte credits
   (de partij zelf, en wat er bij annuleren of een teruggedraaide terugboeking
   van terugkomt), leeg bij alles wat bij het abonnement hoort. */
export const SOORT_BIJGEKOCHT = 'bijgekocht';

/* Partijen die bij het abonnement horen: alles behalve bijgekochte credits.
   Die hebben hun eigen datum, schuiven niet mee en tellen niet mee voor het
   plafond. */
const ABO_PARTIJ = "COALESCE(soort, '') <> 'bijgekocht'";

/* env of env.DB — beide mogen, zodat Astro-pagina's en de Worker dezelfde
   aanroep doen. */
const dbVan = (x) => (x && typeof x.prepare !== 'function' && x.DB ? x.DB : x);
const heel = (n) => Math.max(0, Math.floor(Number(n) || 0));

/** 'YYYY-MM-DD' (UTC) van een moment. */
export function dagVan(nu = new Date()) {
  const d = nu instanceof Date ? nu : new Date(nu);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD HH:MM:SS' (UTC), dezelfde vorm als datetime('now') in SQLite. */
function momentVan(nu = new Date()) {
  const d = nu instanceof Date ? nu : new Date(nu);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * De dag waarop credits die op `binnen` binnenkwamen vervallen: binnenkomst
 * plus CREDITS_GELDIG_MAANDEN. Tot die dag zijn ze bruikbaar, op die dag niet
 * meer ("20 credits vervallen op 6 januari").
 *
 * Een maand verder op de 31e loopt over zoals in SQLite (date(x, '+3 months')):
 * 30 november + 3 maanden = 2 maart. Migratie 0061 rekent zo voor de partijen
 * die er al waren, en dan rekenen beide kanten hetzelfde.
 */
export function vervaldatum(binnen, maanden = CREDITS_GELDIG_MAANDEN) {
  const s = String(binnen instanceof Date ? binnen.toISOString() : binnen || '');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + Number(maanden), Number(m[3])));
  return d.toISOString().slice(0, 10);
}

/** De partijen van een klant met nog iets erin die vandaag gelden, in de
    volgorde waarin ze opgaan: eerst de bijgekochte (12 oktober 2026: "gaan
    eerst op"), dan de oudste vervaldatum. */
async function levendePartijen(D, customerId, nu) {
  const r = await D.prepare(
    `SELECT id, subscription_id, datum, aantal, rest, reden, maand, payment_id, order_id, vervalt_op, soort
       FROM credit_boek
      WHERE customer_id = ?1 AND aantal > 0 AND rest > 0 AND vervalt_op > ?2
      ORDER BY CASE WHEN COALESCE(soort, '') = 'bijgekocht' THEN 0 ELSE 1 END, vervalt_op ASC, id ASC`
  ).bind(customerId, dagVan(nu)).all();
  return (r?.results || []).map((p) => ({ ...p, rest: heel(p.rest), aantal: heel(p.aantal) }));
}

/* Alleen de partijen van het abonnement (zonder bijgekochte), oudste eerst. */
async function aboPartijen(D, customerId, nu) {
  const r = await D.prepare(
    `SELECT id, subscription_id, rest, vervalt_op
       FROM credit_boek
      WHERE customer_id = ?1 AND aantal > 0 AND rest > 0 AND vervalt_op > ?2 AND ${ABO_PARTIJ}
      ORDER BY vervalt_op ASC, id ASC`
  ).bind(customerId, dagVan(nu)).all();
  return (r?.results || []).map((p) => ({ ...p, rest: heel(p.rest) }));
}

/**
 * De ene datum waarop de credits van het abonnement nu vervallen: die van de
 * levende partijen (na een termijn allemaal gelijk), anders 3 maanden na de
 * laatste termijn. Leeg als die datum al voorbij is of er nooit een termijn was.
 */
async function aboEinddatum(D, customerId, nu) {
  const r = await D.prepare(
    `SELECT MAX(CASE WHEN rest > 0 AND vervalt_op > ?2 THEN vervalt_op END) AS levend,
            MAX(CASE WHEN reden = 'termijn' THEN datum END) AS laatste
       FROM credit_boek
      WHERE customer_id = ?1 AND aantal > 0 AND ${ABO_PARTIJ}`
  ).bind(customerId, dagVan(nu)).first().catch(() => null);
  if (r?.levend) return String(r.levend);
  const na = r?.laatste ? vervaldatum(r.laatste) : '';
  return na && na > dagVan(nu) ? na : '';
}

/** Wat een klant vandaag aan credits kan uitgeven. */
export async function creditsBeschikbaar(db, customerId, nu = new Date()) {
  const D = dbVan(db);
  if (!D || !customerId) return 0;
  const rij = await D.prepare(
    `SELECT COALESCE(SUM(rest), 0) AS n FROM credit_boek
      WHERE customer_id = ?1 AND aantal > 0 AND rest > 0 AND vervalt_op > ?2`
  ).bind(customerId, dagVan(nu)).first();
  return heel(rij?.n);
}

/** Verdeel `aantal` over de partijen, oudste eerst. Null als het niet past. */
function verdeel(partijen, aantal) {
  let rest = heel(aantal);
  const uit = [];
  for (const p of partijen) {
    if (!rest) break;
    const n = Math.min(p.rest, rest);
    if (!n) continue;
    uit.push({ id: p.id, n, sub: p.subscription_id ?? null });
    rest -= n;
  }
  return rest ? null : uit;
}

/* ══════════════════════════════════════════════════════════════════════════
 * BIJSCHRIJVEN
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Een partij credits bijschrijven. Idempotent op `sleutel`: dezelfde sleutel
 * een tweede keer doet niets (een webhook die dubbel aflevert, een dubbelklik).
 *
 * Geeft { ok, id, vervaltOp } of { ok: false, dubbel: true }.
 */
export async function boekBij(db, {
  customerId, subscriptionId = null, aantal, reden, toelichting = null,
  orderId = null, orderRef = null, maand = null, paymentId = null,
  sleutel = null, door = null, nu = new Date(), vervaltOp: eigenDatum = null,
} = {}) {
  const D = dbVan(db);
  const n = heel(aantal);
  if (!D || !customerId || !n || !reden) return { ok: false };
  const datum = momentVan(nu);
  /* 3 maanden vanaf nu, of later als de rest van het abonnement later vervalt
     (spaarplafond: één datum voor alles; een bijstelling van Lucas mag nooit
     korter gelden dan 3 maanden). */
  let vervaltOp = /^\d{4}-\d{2}-\d{2}$/.test(String(eigenDatum || '')) ? String(eigenDatum) : vervaldatum(datum);
  if (!eigenDatum && reden !== CREDIT_REDEN.termijn) {
    const samen = await aboEinddatum(D, customerId, nu);
    if (samen > vervaltOp) vervaltOp = samen;
  }
  const rij = await D.prepare(
    `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting,
                              order_id, order_ref, maand, payment_id, vervalt_op, rest, sleutel, door)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?4, ?12, ?13)
     ON CONFLICT (sleutel) DO NOTHING
     RETURNING id`
  ).bind(customerId, subscriptionId, datum, n, reden, toelichting, orderId, orderRef, maand, paymentId,
    vervaltOp, sleutel, door).first();
  return rij ? { ok: true, id: rij.id, vervaltOp } : { ok: false, dubbel: true };
}

/**
 * De credits van een betaalde termijn. Draait naast grantSlots(): in de webhook
 * (recordSubscriptionPaid) en in de nachttaak voor een vooruitbetaald jaar
 * (grantPrepaidMonths). Eén keer per (abonnement, maand), via de sleutel.
 *
 * `sub` is de rij uit `subscriptions` (met customer_id); het aantal komt uit
 * creditsVoor() — dezelfde som als de oude toekenning.
 *
 * HET SPAARPLAFOND (12 oktober 2026), in dezelfde transactie als de partij:
 *   · alle levende partijen van het abonnement krijgen de datum van deze
 *     termijn (binnenkomst + CREDITS_GELDIG_MAANDEN): zolang er termijnen
 *     komen, vervalt er niets;
 *   · komt het saldo van het abonnement (zonder bijgekochte credits) boven
 *     spaarPlafond(), dan vervalt wat erboven komt: één − regel 'plafond', van
 *     de oudste partijen af. De nieuwe partij blijft heel, zodat een
 *     terugbetaling van deze termijn (V49) zijn volle ongebruikte deel ziet.
 *
 * Geeft { ok, id, vervaltOp, boven } — `boven` is wat er boven het plafond
 * verviel — of { ok: false, dubbel: true } als deze termijn er al stond.
 */
export async function boekTermijnBij(db, sub, maand, paymentId = null, nu = new Date()) {
  const D = dbVan(db);
  if (!D || !sub?.id || !/^\d{4}-\d{2}$/.test(String(maand || ''))) return { ok: false };
  let customerId = sub.customer_id;
  if (!customerId) {
    const r = await D.prepare('SELECT customer_id FROM subscriptions WHERE id = ?1').bind(sub.id).first();
    customerId = r?.customer_id;
  }
  const aantal = creditsVoor(sub);
  if (!customerId || !aantal) return { ok: false };
  const sleutel = `termijn:${sub.id}:${maand}`;
  /* Al geboekt (een webhook die dubbel aflevert): niets, ook geen plafond. */
  const al = await D.prepare('SELECT id FROM credit_boek WHERE sleutel = ?1').bind(sleutel).first();
  if (al) return { ok: false, dubbel: true };
  const plafond = spaarPlafond(aantal);
  const datum = momentVan(nu);
  const vervaltOp = vervaldatum(datum);
  for (let poging = 0; poging < 3; poging += 1) {
    const partijen = await aboPartijen(D, customerId, nu);
    const saldo = partijen.reduce((s, p) => s + p.rest, 0);
    const boven = Math.max(0, saldo + aantal - plafond);
    /* Past altijd: het plafond is minstens één termijn, dus wat erboven komt
       is nooit meer dan wat er al was. */
    const verdeling = boven ? verdeel(partijen, boven) : [];
    const stmts = [
      /* Geen ON CONFLICT: staat de sleutel er intussen toch (twee afleveringen
         tegelijk), dan faalt de hele batch en is er niets dubbel gebeurd. */
      D.prepare(
        `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, payment_id, vervalt_op, rest, sleutel, door)
         VALUES (?1, ?2, ?3, ?4, 'termijn', ?5, ?6, ?7, ?4, ?8, 'systeem')
         RETURNING id`
      ).bind(customerId, sub.id, datum, aantal, String(maand), paymentId, vervaltOp, sleutel),
      D.prepare(
        `UPDATE credit_boek SET vervalt_op = ?3
          WHERE customer_id = ?1 AND aantal > 0 AND rest > 0 AND vervalt_op > ?2 AND vervalt_op < ?3 AND ${ABO_PARTIJ}`
      ).bind(customerId, dagVan(nu), vervaltOp),
    ];
    if (verdeling && verdeling.length) {
      stmts.push(D.prepare(
        `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, maand, partijen, sleutel, door)
         VALUES (?1, ?2, ?3, -?4, 'plafond', ?5, ?6, ?7, ?8, 'systeem')`
      ).bind(customerId, sub.id, datum, boven, `plafond ${plafond}`, String(maand),
        JSON.stringify(verdeling.map(({ id, n }) => ({ id, n }))), `plafond:${sub.id}:${maand}`));
      for (const v of verdeling) {
        stmts.push(D.prepare(
          'UPDATE credit_boek SET rest = rest - ?2 WHERE id = ?1 AND customer_id = ?3 AND aantal > 0'
        ).bind(v.id, v.n, customerId));
      }
    }
    try {
      const uit = await D.batch(stmts);
      const id = uit?.[0]?.results?.[0]?.id ?? null;
      return { ok: true, id, vervaltOp, boven: verdeling ? boven : 0 };
    } catch (err) {
      const soort = soortFout(err);
      if (soort === 'race') continue;
      if (soort === 'dubbel') return { ok: false, dubbel: true };
      throw err;
    }
  }
  throw new Error(`creditboek: termijn ${sleutel} na drie pogingen niet geboekt`);
}

/**
 * Bijgekochte credits (12 oktober 2026, ab-v3 = c, migratie 0067): één partij
 * 'bijgekocht' (soort 'bijgekocht'), CREDITS_GELDIG_MAANDEN geldig vanaf
 * binnenkomst — het moment dat Mollie "betaald" meldde. Ze gaan eerst op,
 * schuiven niet mee met een termijn en tellen niet mee voor het spaarplafond;
 * na opzeggen gelden ze tot hun eigen datum. Idempotent op de aankoop
 * (sleutel bijgekocht:<aankoop>): de webhook en de terugkeerpagina mogen allebei.
 *
 * Geeft { ok, id, vervaltOp } of { ok: false, dubbel: true }.
 */
export async function boekBijgekocht(db, {
  customerId, subscriptionId = null, aantal, aankoopId, paymentId = null, toelichting = null, nu = new Date(),
} = {}) {
  const D = dbVan(db);
  const n = heel(aantal);
  if (!D || !customerId || !n || !aankoopId) return { ok: false };
  const datum = momentVan(nu);
  const vervaltOp = vervaldatum(datum);
  const rij = await D.prepare(
    `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, payment_id,
                              vervalt_op, rest, sleutel, door, soort)
     VALUES (?1, ?2, ?3, ?4, 'bijgekocht', ?5, ?6, ?7, ?4, ?8, 'systeem', 'bijgekocht')
     ON CONFLICT (sleutel) DO NOTHING
     RETURNING id`
  ).bind(customerId, subscriptionId, datum, n, toelichting, paymentId, vervaltOp, `bijgekocht:${aankoopId}`).first();
  return rij ? { ok: true, id: rij.id, vervaltOp } : { ok: false, dubbel: true };
}

/**
 * Credits terug voor een bestelling die met credits betaald is (6.08):
 *   · `reden` 'annulering' — de bestelling is geannuleerd;
 *   · `reden` 'niet-gemaakt' — een of meer producten konden niet gemaakt worden.
 * Een nieuwe partij, minstens 3 maanden geldig vanaf vandaag (niet de oude
 * datum terug, die kan al voorbij zijn), en zolang als de rest als die later
 * vervalt.
 *
 * HET SPAARPLAFOND (12 oktober 2026): de teruggave komt helemaal terug en telt
 * gewoon mee in het saldo, dus bij de volgende termijn ook mee voor het plafond.
 * Ze wordt niet meteen afgekapt: annuleren en "niet gemaakt" doet alleen
 * VISUAILS (in /admin), dus een klant kan zo niet om het plafond heen, en wie
 * zijn credits op tijd uitgaf, raakt ze niet kwijt doordat wij een bestelling
 * niet konden maken. Komt hij daardoor bij de volgende termijn boven het
 * plafond, dan zegt de annuleringsmail dat (creditSaldo().boven).
 *
 * Nooit meer terug dan er voor de bestelling is afgeboekt, ook niet in delen:
 * de INSERT draagt die grens zelf (één statement, geen lees-dan-schrijf).
 * Zonder `aantal` gaat alles terug wat nog niet terug is.
 *
 * Geeft { ok, aantal, vervaltOp } of { ok: false, reden, open } met reden
 * 'geen-credits' | 'al-terug' | 'te-veel' (meer gevraagd dan er open staat).
 */
export async function creditsTerugVoorBestelling(db, {
  orderId, aantal = null, reden = CREDIT_REDEN.annulering, toelichting = null, door = null, nu = new Date(),
} = {}) {
  const D = dbVan(db);
  if (!D || !orderId) return { ok: false, reden: 'geen-bestelling' };
  if (![CREDIT_REDEN.annulering, CREDIT_REDEN.nietGemaakt].includes(reden)) return { ok: false, reden: 'reden' };
  const stand = await creditsVanBestelling(D, orderId);
  if (!stand.afgeboekt) return { ok: false, reden: 'geen-credits' };
  const open = stand.afgeboekt - stand.terug;
  /* Meer vragen dan er open staat is een vergissing, geen "zoveel als kan". */
  if (aantal !== null && heel(aantal) > open) return { ok: false, reden: open ? 'te-veel' : 'al-terug', open };
  const n = aantal === null ? open : heel(aantal);
  if (!n) return { ok: false, reden: 'al-terug', open };
  const datum = momentVan(nu);
  const afboeking = await D.prepare(
    "SELECT customer_id, partijen FROM credit_boek WHERE order_id = ?1 AND reden = 'bestelling' AND aantal < 0 LIMIT 1"
  ).bind(orderId).first().catch(() => null);
  const klantId = afboeking?.customer_id || null;

  /* ── BIJGEKOCHT KOMT TERUG ALS BIJGEKOCHT — 12 oktober 2026 ───────────────
     Ging er voor deze bestelling bijgekochte credits af (die gaan eerst op),
     dan komen die als bijgekochte credits terug: eigen datum, buiten het
     spaarplafond. Wie ze kocht, mag ze niet kwijtraken aan zijn plafond omdat
     wij een bestelling niet konden maken. Ook hier eerst de bijgekochte. */
  let bijOpen = 0;
  let bijDatum = '';
  try {
    const ids = JSON.parse(afboeking?.partijen || '[]').map((x) => ({ id: Number(x.id), n: heel(x.n) }));
    if (ids.length) {
      const r = await D.prepare(
        `SELECT id, vervalt_op FROM credit_boek WHERE id IN (SELECT CAST(json_extract(value, '$.id') AS INTEGER) FROM json_each(?1))
            AND COALESCE(soort, '') = 'bijgekocht'`
      ).bind(JSON.stringify(ids)).all();
      const bij = new Map((r?.results || []).map((x) => [Number(x.id), String(x.vervalt_op || '')]));
      const bijAf = ids.filter((x) => bij.has(x.id)).reduce((t, x) => t + x.n, 0);
      bijDatum = [...bij.values()].reduce((m, d) => (d > m ? d : m), '');
      const al = await D.prepare(
        `SELECT COALESCE(SUM(aantal), 0) AS n FROM credit_boek
          WHERE order_id = ?1 AND reden IN ('annulering', 'niet-gemaakt') AND COALESCE(soort, '') = 'bijgekocht'`
      ).bind(orderId).first();
      bijOpen = Math.max(0, bijAf - heel(al?.n));
    }
  } catch { bijOpen = 0; }
  const nBij = Math.min(n, bijOpen);
  const nAbo = n - nBij;

  /* Minstens 3 maanden vanaf vandaag; de abonnementscredits tot de datum van
     de rest als die later valt, de bijgekochte tot hun eigen datum als die
     later valt. */
  const drieMaanden = vervaldatum(datum);
  const samen = klantId && nAbo ? await aboEinddatum(D, klantId, nu) : '';
  const aboTot = samen > drieMaanden ? samen : drieMaanden;
  const bijTot = bijDatum > drieMaanden ? bijDatum : drieMaanden;

  /* De sleutel maakt een annulering eenmalig; "niet gemaakt" kan in delen, dus
     daar telt de grens in de WHERE en draagt de sleutel het volgnummer. Een
     tweede deel (bijgekocht naast abonnement) draagt dezelfde sleutel met
     ":bij" en komt er alleen als het eerste deel er staat. */
  const sleutel = reden === CREDIT_REDEN.annulering
    ? `annulering:${orderId}`
    : `niet-gemaakt:${orderId}:${stand.regels + 1}`;
  const delen = [
    ...(nAbo ? [{ n: nAbo, soort: null, tot: aboTot, sleutel }] : []),
    ...(nBij ? [{ n: nBij, soort: SOORT_BIJGEKOCHT, tot: bijTot, sleutel: nAbo ? `${sleutel}:bij` : sleutel }] : []),
  ];
  const stmts = delen.map((d, i) => D.prepare(
    `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting,
                              order_id, order_ref, vervalt_op, rest, sleutel, door, soort)
     SELECT a.customer_id, a.subscription_id, ?2, ?3, ?4, ?5, ?1, a.order_ref, ?6, ?3, ?7, ?8, ?9
       FROM credit_boek a
      WHERE a.order_id = ?1 AND a.reden = 'bestelling' AND a.aantal < 0
        AND ${i === 0
          ? `(-a.aantal) - COALESCE((SELECT SUM(t.aantal) FROM credit_boek t
                                     WHERE t.order_id = ?1 AND t.reden IN ('annulering', 'niet-gemaakt')), 0) >= ?10`
          : 'EXISTS (SELECT 1 FROM credit_boek e WHERE e.sleutel = ?10)'}
      LIMIT 1
     ON CONFLICT (sleutel) DO NOTHING
     RETURNING id`
  ).bind(orderId, datum, d.n, reden, toelichting, d.tot, d.sleutel, door, d.soort, i === 0 ? n : delen[0].sleutel));
  const uit = stmts.length ? await D.batch(stmts) : [];
  const id = uit?.[0]?.results?.[0]?.id ?? null;
  if (!id) return { ok: false, reden: 'al-terug' };
  /* Voor de zin aan de klant (creditWeergave.terugZin): loopt het abonnement,
     en komt hij bij de volgende termijn nu boven zijn plafond? */
  const s = klantId ? await creditSaldo(D, { customerId: klantId }, { nu }).catch(() => null) : null;
  return {
    ok: true, aantal: n, vervaltOp: nAbo ? aboTot : bijTot, id,
    bijgekocht: nBij, bijTot: nBij ? bijTot : '',
    loopt: !!s?.nieuw, boven: s?.boven || null,
  };
}

/** Hoeveel credits er voor een bestelling zijn afgeboekt en hoeveel er al terug zijn. */
export async function creditsVanBestelling(db, orderId) {
  const D = dbVan(db);
  const r = await D.prepare(
    `SELECT
       COALESCE(-SUM(CASE WHEN reden = 'bestelling' AND aantal < 0 THEN aantal END), 0) AS afgeboekt,
       COALESCE(SUM(CASE WHEN reden IN ('annulering', 'niet-gemaakt') THEN aantal END), 0) AS terug,
       COALESCE(SUM(CASE WHEN reden IN ('annulering', 'niet-gemaakt') THEN 1 END), 0) AS regels
       FROM credit_boek WHERE order_id = ?1`
  ).bind(orderId).first();
  return { afgeboekt: heel(r?.afgeboekt), terug: heel(r?.terug), regels: heel(r?.regels) };
}

/* ══════════════════════════════════════════════════════════════════════════
 * AFSCHRIJVEN
 * ══════════════════════════════════════════════════════════════════════════ */

/* Eén poging: lees de partijen, verdeel, en schrijf alles in één batch.
   `kop` zijn de statements die vóór de − regel moeten (de bestelling op
   'credits'), `regel` maakt de − regel met de verdeling erin. */
async function eenPoging(D, { customerId, aantal, nu, kop = [], regel }) {
  const partijen = await levendePartijen(D, customerId, nu);
  const saldo = partijen.reduce((s, p) => s + p.rest, 0);
  const verdeling = verdeel(partijen, aantal);
  if (!verdeling) return { ok: false, reden: 'te-weinig', saldo };
  const stmts = [
    ...kop,
    regel(verdeling),
    ...verdeling.map((v) => D.prepare(
      'UPDATE credit_boek SET rest = rest - ?2 WHERE id = ?1 AND customer_id = ?3 AND aantal > 0'
    ).bind(v.id, v.n, customerId)),
  ];
  await D.batch(stmts);
  return { ok: true, partijen: verdeling.map(({ id, n }) => ({ id, n })), saldoNa: saldo - heel(aantal) };
}

/* Wat een mislukte batch betekent. CHECK = een partij was net leeg (een
   tweede bestelling ging voor): opnieuw proberen. De rest is definitief. */
function soortFout(err) {
  const m = String(err?.message || err || '');
  if (/CHECK constraint/i.test(m)) return 'race';
  if (/UNIQUE constraint/i.test(m)) return 'dubbel';
  if (/NOT NULL constraint/i.test(m)) return 'staat';
  return 'fout';
}

/**
 * Een bestelling betalen met credits: atomair, oudste eerst.
 *
 * In één transactie: de bestelling van 'unpaid' naar 'credits' (paid_at nu,
 * credits_used = aantal, total_cents en vat_cents op 0 — de termijnfactuur is
 * de factuur, en zo telt deze bestelling nergens als omzet of als openstaand
 * bedrag), de − regel, en de partijen omlaag.
 *
 * Geeft { ok: true, partijen, saldoNa } of { ok: false, reden, saldo }, met
 * reden 'te-weinig' | 'al-betaald' | 'fout'. Bij 'te-weinig' is er niets
 * veranderd: de bestelling staat nog op 'unpaid' en kan via Mollie.
 */
export async function betaalBestellingMetCredits(db, { orderId, customerId, aantal, door = 'klant', nu = new Date() } = {}) {
  const D = dbVan(db);
  const n = heel(aantal);
  if (!D || !orderId || !customerId || !n) return { ok: false, reden: 'fout', saldo: 0 };
  const moment = momentVan(nu);
  for (let poging = 0; poging < 3; poging += 1) {
    try {
      const uit = await eenPoging(D, {
        customerId, aantal: n, nu,
        kop: [D.prepare(
          `UPDATE orders SET payment_status = 'credits', payment_provider = 'credits', paid_at = ?3,
                             credits_used = ?4, total_cents = 0, vat_cents = 0, window_expires_at = NULL
            WHERE id = ?1 AND customer_id = ?2 AND COALESCE(payment_status, 'unpaid') = 'unpaid'
              AND status <> 'cancelled'`
        ).bind(orderId, customerId, moment, n)],
        /* customer_id komt uit de bestelling ZELF, en alleen als die nu op
           'credits' staat met dit aantal. Stond ze al op betaald (dubbele
           aanroep) of is ze van een ander, dan is dat NULL en faalt de batch op
           NOT NULL: dan is er niets afgeboekt. De sleutel houdt een tweede
           afboeking voor dezelfde bestelling tegen. */
        regel: (verdeling) => D.prepare(
          `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, partijen, sleutel, door)
           VALUES ((SELECT customer_id FROM orders WHERE id = ?1 AND customer_id = ?2 AND payment_status = 'credits' AND credits_used = ?4),
                   ?3, ?5, -?4, 'bestelling', ?1, (SELECT ref FROM orders WHERE id = ?1), ?6, 'bestelling:' || ?1, ?7)`
        ).bind(orderId, customerId, verdeling[0]?.sub ?? null, n, moment, JSON.stringify(verdeling.map(({ id, n: k }) => ({ id, n: k }))), door),
      });
      return uit;
    } catch (err) {
      const soort = soortFout(err);
      if (soort === 'race') continue;
      if (soort === 'dubbel' || soort === 'staat') return { ok: false, reden: 'al-betaald', saldo: await creditsBeschikbaar(D, customerId, nu) };
      console.error('[creditboek] afboeken voor bestelling', orderId, 'mislukt —', err?.message || err);
      return { ok: false, reden: 'fout', saldo: 0 };
    }
  }
  return { ok: false, reden: 'te-weinig', saldo: await creditsBeschikbaar(D, customerId, nu) };
}

/**
 * Credits afschrijven zonder bestelling: een bijstelling door Lucas (6.08), met
 * een verplichte toelichting. Oudste eerst, atomair, nooit onder nul.
 *
 * Geeft { ok, partijen, saldoNa } of { ok: false, reden: 'te-weinig' | 'fout', saldo }.
 */
export async function boekAf(db, {
  customerId, aantal, reden = CREDIT_REDEN.bijstelling, toelichting = null, door = null, sleutel = null, nu = new Date(),
} = {}) {
  const D = dbVan(db);
  const n = heel(aantal);
  if (!D || !customerId || !n) return { ok: false, reden: 'fout', saldo: 0 };
  const moment = momentVan(nu);
  for (let poging = 0; poging < 3; poging += 1) {
    try {
      return await eenPoging(D, {
        customerId, aantal: n, nu,
        regel: (verdeling) => D.prepare(
          `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, partijen, sleutel, door)
           VALUES (?1, ?2, ?3, -?4, ?5, ?6, ?7, ?8, ?9)`
        ).bind(customerId, verdeling[0]?.sub ?? null, moment, n, reden, toelichting,
          JSON.stringify(verdeling.map(({ id, n: k }) => ({ id, n: k }))), sleutel, door),
      });
    } catch (err) {
      const soort = soortFout(err);
      if (soort === 'race') continue;
      if (soort === 'dubbel') return { ok: false, reden: 'dubbel', saldo: await creditsBeschikbaar(D, customerId, nu) };
      console.error('[creditboek] afschrijven mislukt —', err?.message || err);
      return { ok: false, reden: 'fout', saldo: 0 };
    }
  }
  return { ok: false, reden: 'te-weinig', saldo: await creditsBeschikbaar(D, customerId, nu) };
}

/* ══════════════════════════════════════════════════════════════════════════
 * EEN TERMIJN DIE TERUGBETAALD WORDT (V49 = a)
 * ══════════════════════════════════════════════════════════════════════════ */

/* De partij van één termijn: op Mollie-betaling, of op abonnement + maand. */
async function termijnPartij(D, { paymentId = null, subscriptionId = null, maand = null }) {
  if (paymentId) {
    const r = await D.prepare(
      `SELECT * FROM credit_boek WHERE payment_id = ?1 AND reden IN ('termijn', 'bijgekocht') AND aantal > 0 ORDER BY id LIMIT 1`
    ).bind(String(paymentId)).first();
    if (r) return r;
  }
  if (subscriptionId && maand) {
    return D.prepare(
      `SELECT * FROM credit_boek WHERE sleutel = ?1 LIMIT 1`
    ).bind(`termijn:${subscriptionId}:${maand}`).first();
  }
  return null;
}

/**
 * Hoeveel er van een termijn gebruikt is. Voor Lucas vóór hij terugbetaalt:
 * V49 = a zegt dat er alleen een creditnota komt voor het ONGEBRUIKTE deel.
 * `bedragCents` (wat de termijn kostte) erbij geeft dat deel in centen,
 * naar rato van de credits.
 *
 * Geeft null als er voor deze termijn geen partij is, anders
 * { id, toegekend, gebruikt, ongebruikt, vervaltOp, vervallen, ongebruiktCents }.
 */
export async function termijnGebruik(db, { paymentId = null, subscriptionId = null, maand = null, bedragCents = null, nu = new Date() } = {}) {
  const D = dbVan(db);
  const p = await termijnPartij(D, { paymentId, subscriptionId, maand });
  if (!p) return null;
  const toegekend = heel(p.aantal);
  const vervallen = String(p.vervalt_op || '') <= dagVan(nu);
  /* Wat er van een al vervallen partij over was, is niet "gebruikt". */
  const ongebruikt = heel(p.rest);
  const gebruikt = toegekend - ongebruikt;
  const ongebruiktCents = bedragCents === null || !toegekend
    ? null
    : Math.round(heel(bedragCents) * ongebruikt / toegekend);
  return { id: p.id, toegekend, gebruikt, ongebruikt, vervaltOp: p.vervalt_op, vervallen, ongebruiktCents };
}

/**
 * Een termijn is terugbetaald (V49 = a): wat er nog ongebruikt van over is,
 * vervalt meteen — één − regel 'terugbetaald' met de partij erin. Wat al
 * gebruikt is, blijft gebruikt; daar hoort geen creditnota bij.
 *
 * Eenmalig per partij (de sleutel). Geeft termijnGebruik() van vóór het
 * vervallen terug, plus `vervielNu` (hoeveel er nu verviel), of null zonder
 * partij.
 */
export async function vervalTermijn(db, { paymentId = null, subscriptionId = null, maand = null, bedragCents = null, toelichting = null, door = 'systeem', nu = new Date() } = {}) {
  const D = dbVan(db);
  const voor = await termijnGebruik(D, { paymentId, subscriptionId, maand, bedragCents, nu });
  if (!voor) return null;
  if (!voor.ongebruikt) return { ...voor, vervielNu: 0 };
  const p = await D.prepare('SELECT customer_id, subscription_id, maand, payment_id FROM credit_boek WHERE id = ?1').bind(voor.id).first();
  try {
    await D.batch([
      D.prepare('UPDATE credit_boek SET rest = rest - ?2 WHERE id = ?1 AND aantal > 0').bind(voor.id, voor.ongebruikt),
      D.prepare(
        `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, maand, payment_id, partijen, sleutel, door)
         VALUES (?1, ?2, ?3, -?4, 'terugbetaald', ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(p.customer_id, p.subscription_id, momentVan(nu), voor.ongebruikt, toelichting, p.maand, p.payment_id,
        JSON.stringify([{ id: voor.id, n: voor.ongebruikt }]), `terugbetaald:${voor.id}`, door),
    ]);
    return { ...voor, vervielNu: voor.ongebruikt };
  } catch (err) {
    const soort = soortFout(err);
    if (soort === 'dubbel') return { ...voor, vervielNu: 0 };
    if (soort === 'race') {
      /* Tussen lezen en schrijven ging er iets af: opnieuw, met de nieuwe rest. */
      return vervalTermijn(D, { paymentId, subscriptionId, maand, bedragCents, toelichting, door, nu });
    }
    console.error('[creditboek] termijn laten vervallen mislukt —', err?.message || err);
    return { ...voor, vervielNu: 0, fout: true };
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * EEN TERMIJN DIE WORDT TERUGGEBOEKT (8.11, V50 = a)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Een chargeback of storno op een termijn: de credits die er van die termijn
 * nog over zijn, worden BEVROREN — niet bruikbaar, niet weg. Draait Mollie de
 * terugboeking terug, dan komen ze weer VRIJ, met hun eigen vervaldatum.
 *
 * Twee gewone regels in het boek, zodat klant en Lucas zien wat er gebeurde:
 *   − 'bevroren'     de rest van de partij gaat eraf (zoals vervalTermijn);
 *   + 'vrijgegeven'  een nieuwe partij met hetzelfde aantal en de vervaldatum
 *                    van de oorspronkelijke termijn (niet 3 maanden vanaf nu:
 *                    "alles draait terug").
 * Idempotent per keer: de sleutel telt mee (bevroren:<partij>:<n>), en er wordt
 * alleen bevroren als er niets openstaat, alleen vrijgegeven als er iets
 * openstaat. Een tweede aflevering van dezelfde webhook doet dus niets.
 */

/* Hoeveel er van een partij bevroren is en nog niet vrijgegeven, en hoe vaak. */
async function bevrorenStand(D, partijId) {
  const r = await D.prepare(
    `SELECT
       COALESCE(-SUM(CASE WHEN reden = 'bevroren' THEN aantal END), 0) AS bevroren,
       COALESCE(SUM(CASE WHEN sleutel LIKE ?2 THEN aantal END), 0) AS vrij,
       COALESCE(SUM(CASE WHEN reden = 'bevroren' THEN 1 END), 0) AS keren,
       COALESCE(SUM(CASE WHEN sleutel LIKE ?2 THEN 1 END), 0) AS kerenVrij
       FROM credit_boek
      WHERE (reden = 'bevroren' AND partijen LIKE ?1) OR sleutel LIKE ?2`
  ).bind(`[{"id":${Number(partijId)},%`, `vrijgegeven:${Number(partijId)}:%`).first();
  const open = heel(r?.bevroren) - heel(r?.vrij);
  return { open: Math.max(0, open), keren: heel(r?.keren), kerenVrij: heel(r?.kerenVrij) };
}

/**
 * De credits van een teruggeboekte termijn bevriezen. Geeft null zonder partij
 * voor deze betaling, anders { partij, bevroren, al } — `al` is wat er al
 * bevroren stond (een tweede aflevering).
 */
export async function bevriesTermijn(db, { paymentId, toelichting = null, door = 'systeem', nu = new Date() } = {}) {
  const D = dbVan(db);
  if (!D || !paymentId) return null;
  const p = await termijnPartij(D, { paymentId });
  if (!p) return null;
  const stand = await bevrorenStand(D, p.id);
  if (stand.open > 0) return { partij: p.id, bevroren: 0, al: stand.open };
  const n = String(p.vervalt_op || '') > dagVan(nu) ? heel(p.rest) : 0;
  if (!n) return { partij: p.id, bevroren: 0, al: 0 };
  try {
    await D.batch([
      D.prepare('UPDATE credit_boek SET rest = rest - ?2 WHERE id = ?1 AND aantal > 0').bind(p.id, n),
      D.prepare(
        `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, maand, payment_id, partijen, sleutel, door)
         VALUES (?1, ?2, ?3, -?4, 'bevroren', ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(p.customer_id, p.subscription_id, momentVan(nu), n, toelichting, p.maand, p.payment_id,
        JSON.stringify([{ id: p.id, n }]), `bevroren:${p.id}:${stand.keren + 1}`, door),
    ]);
    return { partij: p.id, bevroren: n, al: 0 };
  } catch (err) {
    const soort = soortFout(err);
    if (soort === 'dubbel') return { partij: p.id, bevroren: 0, al: n };
    if (soort === 'race') return bevriesTermijn(D, { paymentId, toelichting, door, nu });
    console.error('[creditboek] termijn bevriezen mislukt —', err?.message || err);
    return { partij: p.id, bevroren: 0, al: 0, fout: true };
  }
}

/**
 * Mollie draaide de terugboeking terug: de bevroren credits komen weer vrij,
 * met de vervaldatum van de termijn. Geeft null zonder partij, anders
 * { partij, vrijgegeven } (0 als er niets bevroren stond).
 */
export async function ontdooiTermijn(db, { paymentId, toelichting = null, door = 'systeem', nu = new Date() } = {}) {
  const D = dbVan(db);
  if (!D || !paymentId) return null;
  const p = await termijnPartij(D, { paymentId });
  if (!p) return null;
  const stand = await bevrorenStand(D, p.id);
  if (!stand.open) return { partij: p.id, vrijgegeven: 0 };
  /* De datum van de termijn, of die van de rest als die later valt (spaar-
     plafond: na een termijn hebben alle credits één datum). Bijgekochte credits
     houden hun eigen datum en blijven bijgekocht (buiten het plafond). */
  const bij = p.soort === SOORT_BIJGEKOCHT;
  const samen = bij ? '' : await aboEinddatum(D, p.customer_id, nu);
  const vervaltOp = samen > String(p.vervalt_op || '') ? samen : p.vervalt_op;
  try {
    await D.prepare(
      `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, toelichting, maand, payment_id,
                                vervalt_op, rest, sleutel, door, soort)
       VALUES (?1, ?2, ?3, ?4, 'vrijgegeven', ?5, ?6, ?7, ?8, ?4, ?9, ?10, ?11)`
    ).bind(p.customer_id, p.subscription_id, momentVan(nu), stand.open, toelichting, p.maand, p.payment_id,
      vervaltOp, `vrijgegeven:${p.id}:${stand.kerenVrij + 1}`, door, bij ? SOORT_BIJGEKOCHT : null).run();
    return { partij: p.id, vrijgegeven: stand.open };
  } catch (err) {
    if (soortFout(err) === 'dubbel') return { partij: p.id, vrijgegeven: 0 };
    console.error('[creditboek] termijn vrijgeven mislukt —', err?.message || err);
    return { partij: p.id, vrijgegeven: 0, fout: true };
  }
}

/** Hoeveel credits van een klant nu bevroren staan (teruggeboekte termijnen). */
export async function bevrorenVoorKlant(db, customerId) {
  const D = dbVan(db);
  if (!D || !customerId) return 0;
  const r = await D.prepare(
    `SELECT COALESCE(-SUM(CASE WHEN reden = 'bevroren' THEN aantal END), 0)
          - COALESCE(SUM(CASE WHEN sleutel LIKE 'vrijgegeven:%' THEN aantal END), 0) AS n
       FROM credit_boek WHERE customer_id = ?1 AND (reden IN ('bevroren', 'vrijgegeven') OR sleutel LIKE 'vrijgegeven:%')`
  ).bind(customerId).first().catch(() => null);
  return heel(r?.n);
}

/* ══════════════════════════════════════════════════════════════════════════
 * LEZEN: HET BOEK EN HET SALDO
 * ══════════════════════════════════════════════════════════════════════════ */

/* `wie` is { customerId } of { subscriptionId }. Credits zijn één pot per klant
   (een credit uit een opgezegd abonnement telt mee tot zijn datum), dus een
   abonnement wijst naar zijn klant. Een getal alleen is een klantnummer. */
async function klantVan(D, wie) {
  if (typeof wie === 'number') return wie;
  if (wie?.customerId) return Number(wie.customerId);
  if (wie?.subscriptionId) {
    const r = await D.prepare('SELECT customer_id FROM subscriptions WHERE id = ?1').bind(wie.subscriptionId).first();
    return r ? Number(r.customer_id) : null;
  }
  return null;
}

/**
 * Het creditboek: elke regel met datum, aantal (+/−), reden en waar het hoort
 * het kenmerk van de bestelling of de termijn. Oudste regel eerst (zoals een
 * afschrift), met de afgeleide regels "vervallen" op hun datum en per regel het
 * saldo daarna.
 *
 * Elke regel:
 *   { id, datum, dag, aantal, reden, toelichting, orderId, orderRef, orderStatus,
 *     maand, paymentId, vervaltOp, rest, subscriptionId, soort, saldoNa }
 * `id` is null bij een afgeleide regel "vervallen". `orderStatus` is de status
 * van de bestelling nu (received / in_production / delivered / cancelled …).
 */
export async function creditboek(db, wie, { nu = new Date() } = {}) {
  const D = dbVan(db);
  const customerId = await klantVan(D, wie);
  if (!D || !customerId) return [];
  const r = await D.prepare(
    `SELECT b.id, b.datum, b.aantal, b.reden, b.toelichting, b.order_id, b.order_ref, b.maand,
            b.payment_id, b.vervalt_op, b.rest, b.subscription_id, b.soort, o.status AS order_status, o.ref AS ref_nu
       FROM credit_boek b
       LEFT JOIN orders o ON o.id = b.order_id
      WHERE b.customer_id = ?1
      ORDER BY b.datum ASC, b.id ASC`
  ).bind(customerId).all();
  const vandaag = dagVan(nu);
  const regels = [];
  for (const b of (r?.results || [])) {
    regels.push({
      id: b.id,
      datum: String(b.datum),
      dag: String(b.datum).slice(0, 10),
      aantal: Number(b.aantal),
      reden: String(b.reden),
      toelichting: b.toelichting || '',
      orderId: b.order_id ?? null,
      orderRef: b.ref_nu || b.order_ref || '',
      orderStatus: b.order_status || '',
      maand: b.maand || '',
      paymentId: b.payment_id || '',
      vervaltOp: b.vervalt_op || '',
      rest: b.rest === null ? null : heel(b.rest),
      subscriptionId: b.subscription_id ?? null,
      soort: b.soort || '',
    });
    /* Een partij die op zijn datum nog iets over had, is toen vervallen. */
    if (Number(b.aantal) > 0 && heel(b.rest) > 0 && String(b.vervalt_op) <= vandaag) {
      regels.push({
        id: null,
        datum: `${b.vervalt_op} 00:00:00`,
        dag: String(b.vervalt_op),
        aantal: -heel(b.rest),
        reden: CREDIT_REDEN.vervallen,
        toelichting: '',
        orderId: null, orderRef: '', orderStatus: '',
        maand: b.maand || '',
        paymentId: b.payment_id || '',
        vervaltOp: String(b.vervalt_op),
        rest: null,
        subscriptionId: b.subscription_id ?? null,
        soort: b.soort || '',
        partij: b.id,
      });
    }
  }
  /* Op datum; op dezelfde datum eerst de afgeleide regels (vervallen om
     middernacht), dan op volgorde van invoer. */
  const volg = (x) => (x.id === null ? -1 : x.id);
  regels.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : volg(a) - volg(b)));
  let saldo = 0;
  for (const x of regels) { saldo += x.aantal; x.saldoNa = saldo; }
  return regels;
}

/**
 * Het saldo in één blik — de drie getallen die een abonnee wil weten (§28.3):
 * hoeveel, wat er binnenkort vervalt, en wanneer er nieuwe bijkomen.
 *
 *   {
 *     saldo,                                   // nu bruikbaar
 *     vervalt:      [{ op, aantal }],          // per vervaldatum, oplopend
 *     vervaltEerst: { op, aantal } | null,     // de eerstvolgende
 *     nieuw:        { op, aantal, overstap? } | null,
 *                   // volgende termijn (alleen bij een lopend abonnement); bij een
 *                   // overstap die klaarstaat de credits van het nieuwe plan, en
 *                   // overstap: { plan, credits, plafond }
 *     partijen:     [{ id, aantal, rest, binnen, vervaltOp, reden, maand, soort }],
 *     abonnement:   { id, ref, plan, term, status } | null,
 *     bevroren,                                // vast na een terugboeking (8.11), niet in `saldo`
 *
 *     ── het spaarplafond (12 oktober 2026) ──
 *     plafond,      // spaarPlafond() van het huidige abonnement, of null zonder abonnement
 *     aboSaldo,     // het saldo zonder bijgekochte credits: dat telt voor het plafond
 *     boven:        { op, aantal, nieuw, plafond, overstap } | null,
 *                   // bij een lopend abonnement: wat er bij de volgende termijn
 *                   // (op `op`, `nieuw` erbij) boven het plafond zou vervallen;
 *                   // `plafond` is dat van die termijn (bij een overstap het
 *                   // nieuwe), `overstap` zegt of er dan een overstap ingaat
 *     aboEinde,     // de dag waarop de credits van het abonnement vervallen als er
 *                   // geen termijn meer komt (3 maanden na de laatste), of ''
 *     echteDatums:  [{ op, aantal }],
 *                   // de vervaldatums van het abonnement die echt gelden: zonder
 *                   // volgende termijn (pauze, stop, het jaar is op) allemaal;
 *                   // met een termijn alleen wat er vóór die termijn vervalt
 *                   // (oude partijen van vóór het plafond)
 *     bijgekocht:   { saldo, vervalt: [{ op, aantal }] }
 *                   // extra gekochte credits (migratie 0067): eigen datum, gaan
 *                   // eerst op, niet in het plafond en niet in `aboSaldo`
 *   }
 *
 * `vervalt` blijft alle partijen per datum noemen, ook de datums die bij een
 * lopend abonnement bij de volgende termijn opschuiven; een scherm leest
 * `echteDatums`.
 */
/** De overstap die klaarstaat, voor het saldo. Eigen query met een vangnet: zonder
 *  migratie 0068 bestaan de kolommen niet, en dan is er gewoon geen overstap. */
async function overstapVoorSaldo(D, subId) {
  const r = await D.prepare(
    'SELECT overstap_plan, overstap_slots_json FROM subscriptions WHERE id = ?1'
  ).bind(subId).first().catch(() => null);
  if (!r?.overstap_plan) return null;
  const credits = creditsVoor({ plan: r.overstap_plan, slots_json: r.overstap_slots_json });
  return credits ? { plan: r.overstap_plan, credits } : null;
}

export async function creditSaldo(db, wie, { nu = new Date() } = {}) {
  const D = dbVan(db);
  const leeg = {
    saldo: 0, vervalt: [], vervaltEerst: null, nieuw: null, partijen: [], abonnement: null, bevroren: 0,
    plafond: null, aboSaldo: 0, boven: null, aboEinde: '', echteDatums: [], bijgekocht: { saldo: 0, vervalt: [] },
  };
  const customerId = await klantVan(D, wie);
  if (!D || !customerId) return leeg;
  const partijen = await levendePartijen(D, customerId, nu);
  const perDag = (lijst) => {
    const m = new Map();
    for (const p of lijst) m.set(p.vervalt_op, (m.get(p.vervalt_op) || 0) + p.rest);
    return [...m.entries()].map(([op, aantal]) => ({ op, aantal })).sort((a, b) => (a.op < b.op ? -1 : 1));
  };
  const vervalt = perDag(partijen);
  const isBij = (p) => p.soort === SOORT_BIJGEKOCHT;
  const aboLijst = partijen.filter((p) => !isBij(p));
  const bijLijst = partijen.filter(isBij);
  const aboSaldo = aboLijst.reduce((s, p) => s + p.rest, 0);

  /* Het abonnement: het nieuwste dat nog loopt of stilstaat, anders het
     laatste. Nieuwe credits alleen bij een lopend abonnement: bij een pauze of
     opzegging komt er niets bij (§28.5). */
  const sub = await D.prepare(
    `SELECT id, ref, customer_id, plan, term, status, amount_cents, slots_json, started_at, created_at
       FROM subscriptions WHERE customer_id = ?1
      ORDER BY CASE WHEN status IN ('active', 'paused', 'pending') THEN 0 ELSE 1 END, id DESC LIMIT 1`
  ).bind(customerId).first().catch(() => null);
  let nieuw = null;
  if (sub && sub.status === 'active') {
    const maand = termijnMaand(sub, nu);
    let volgt = true;
    /* Een vooruitbetaald jaar geeft er na de twaalfde maand geen meer. */
    if (sub.term === 'prepaid') {
      const t = await D.prepare('SELECT COUNT(*) AS n FROM subscription_months WHERE subscription_id = ?1').bind(sub.id).first().catch(() => null);
      if (Number(t?.n || 0) >= TERMS.prepaid.months) volgt = false;
    }
    const op = termijnEinde(sub, maand);
    if (volgt && op) {
      /* EEN OVERSTAP DIE KLAARSTAAT (15 oktober 2026). Die gaat in bij deze
         termijn: dan komen de credits van het nieuwe plan erbij, en geldt het
         spaarplafond van het nieuwe plan. Zonder dit zei Studio bij een overstap
         van Merk naar Starter "op 15 november komen er 290 bij: gebruik er 290",
         terwijl er 45 bijkwamen en 780 wegvielen. */
      const ov = await overstapVoorSaldo(D, sub.id);
      nieuw = { op, aantal: ov ? ov.credits : creditsVoor(sub) };
      if (ov) nieuw.overstap = { plan: ov.plan, credits: ov.credits, plafond: spaarPlafond(ov.credits) };
    }
  }
  /* Het plafond van het huidige abonnement (ook gepauzeerd: bij hervatten geldt
     het weer); een opgezegd of afgelopen abonnement heeft er geen meer. */
  const plafond = sub && ['active', 'paused', 'pending'].includes(sub.status) ? spaarPlafond(creditsVoor(sub)) : null;
  /* Bij de volgende termijn telt het plafond dat dan geldt: bij een overstap dat
     van het nieuwe plan. */
  const plafondTermijn = nieuw?.overstap ? nieuw.overstap.plafond : plafond;
  const boven = nieuw && plafondTermijn
    ? { op: nieuw.op, nieuw: nieuw.aantal, aantal: Math.max(0, aboSaldo + nieuw.aantal - plafondTermijn), plafond: plafondTermijn, overstap: !!nieuw.overstap }
    : null;
  /* Een partij die op de dag van de termijn vervalt, vervalt om middernacht:
     vóór de termijn binnen is. Vandaar <=. */
  const echteDatums = perDag(aboLijst).filter((v) => !nieuw || v.op <= nieuw.op);
  return {
    saldo: partijen.reduce((s, p) => s + p.rest, 0),
    vervalt,
    vervaltEerst: vervalt[0] || null,
    nieuw,
    partijen: partijen.map((p) => ({
      id: p.id, aantal: p.aantal, rest: p.rest, binnen: String(p.datum).slice(0, 10),
      vervaltOp: p.vervalt_op, reden: p.reden, maand: p.maand || '',
      soort: isBij(p) ? SOORT_BIJGEKOCHT : 'abonnement',
    })),
    abonnement: sub ? { id: sub.id, ref: sub.ref, plan: sub.plan, term: sub.term, status: sub.status } : null,
    /* Credits van een teruggeboekte termijn (8.11): niet in het saldo, wel te noemen. */
    bevroren: await bevrorenVoorKlant(D, customerId),
    plafond,
    aboSaldo,
    boven,
    aboEinde: aboLijst.reduce((m, p) => (String(p.vervalt_op) > m ? String(p.vervalt_op) : m), ''),
    echteDatums,
    bijgekocht: { saldo: bijLijst.reduce((s, p) => s + p.rest, 0), vervalt: perDag(bijLijst) },
  };
}

/**
 * Klanten met credits die over precies `dagen` dagen vervallen (één herinnering,
 * 7 dagen vooraf — 6.03). Per klant één rij met het aantal en de datum; ook
 * voor wie gepauzeerd of opgezegd heeft, want hun credits gelden nog (V41 = a).
 */
export async function creditsDieVervallen(db, { dagen = 7, nu = new Date() } = {}) {
  const D = dbVan(db);
  const d = new Date(`${dagVan(nu)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(dagen));
  const op = d.toISOString().slice(0, 10);
  const r = await D.prepare(
    `SELECT customer_id, SUM(rest) AS aantal,
            SUM(CASE WHEN COALESCE(soort, '') = 'bijgekocht' THEN rest ELSE 0 END) AS bij
       FROM credit_boek
      WHERE aantal > 0 AND rest > 0 AND vervalt_op = ?1
      GROUP BY customer_id`
  ).bind(op).all();
  /* `bijgekocht`: hoeveel daarvan extra gekocht is (12 oktober 2026) — die
     vervallen op hun eigen datum, ook als het abonnement loopt. */
  return (r?.results || []).map((x) => ({ customerId: x.customer_id, aantal: heel(x.aantal), bijgekocht: heel(x.bij), op }));
}

/**
 * Lopende abonnementen waarvan de volgende termijn over precies `dagen` dagen
 * valt en die de klant boven zijn spaarplafond brengt (12 oktober 2026): één
 * herinnering vóór de dag dat er iets zou vervallen. Per klant één rij:
 *   { customerId, subscriptionId, op, nieuw, boven, saldo, plafond }
 * `boven` is wat er die dag zou vervallen als hij tot dan niets bestelt.
 */
export async function plafondInZicht(db, { dagen = 7, nu = new Date() } = {}) {
  const D = dbVan(db);
  if (!D) return [];
  const d = new Date(`${dagVan(nu)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(dagen));
  const op = d.toISOString().slice(0, 10);
  const r = await D.prepare(
    `SELECT DISTINCT customer_id FROM subscriptions WHERE status = 'active' AND customer_id IS NOT NULL`
  ).all().catch(() => ({ results: [] }));
  const uit = [];
  for (const { customer_id: customerId } of (r?.results || [])) {
    const s = await creditSaldo(D, { customerId }, { nu });
    if (!s.boven || s.boven.op !== op || !s.boven.aantal) continue;
    uit.push({
      customerId, subscriptionId: s.abonnement?.id ?? null, op,
      nieuw: s.boven.nieuw, boven: s.boven.aantal, saldo: s.aboSaldo, plafond: s.boven.plafond ?? s.plafond,
      overstap: s.boven.overstap ? s.nieuw?.overstap?.plan || '' : '',
    });
  }
  return uit;
}

/**
 * Wat het bestelformulier (stap 5) over de credits van deze klant moet weten,
 * via /account/me. null als er niets te zeggen valt: geen saldo en geen lopend
 * abonnement. Alleen getallen en datums — de woorden staan in het formulier.
 *
 *   { saldo, vervalt: [{ op, aantal }], nieuw: { op, aantal } | null,
 *     plafond, aboSaldo }
 *
 * `vervalt` zijn sinds het spaarplafond (12 oktober 2026) alleen de datums die
 * echt gelden (creditSaldo().echteDatums): bij een lopend abonnement schuift de
 * datum van de abonnementscredits bij elke termijn op, en die noemen we niet.
 * Met `plafond` en `aboSaldo` rekent stap 5 uit of er na deze bestelling bij de
 * volgende termijn nog iets boven het plafond zou vervallen.
 */
export async function creditsVoorFormulier(db, customerId, nu = new Date()) {
  const s = await creditSaldo(db, { customerId }, { nu });
  if (!s.saldo && !s.nieuw) return null;
  /* In de volgorde waarin ze opgaan: eerst de bijgekochte, dan het abonnement. */
  return {
    saldo: s.saldo, vervalt: [...s.bijgekocht.vervalt, ...s.echteDatums], nieuw: s.nieuw,
    /* Het plafond dat bij de volgende termijn geldt (bij een overstap dat van het
       nieuwe plan): stap 5 rekent daarmee uit wat er dan zou wegvallen. */
    plafond: s.nieuw ? (s.boven?.plafond ?? s.plafond) : null, aboSaldo: s.aboSaldo,
  };
}
