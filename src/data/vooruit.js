/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET VOORUITBETAALDE JAAR — WAT ER GEBEURT ALS IEMAND HALVERWEGE STOPT
 * 10 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"als iemand halverwege stopt krijgt hij uiteraard geen geld terug,
 * daarom betaal je ook een jaar vooruit, hij blijft de service en credits gewoon
 * van dat jaar houden per maand. Het restant wordt dan tegoed dat wel per maand
 * blijft omdat de klant wanneer hij stopt opeens op 1 dag 100 fotos kan bestellen
 * en word het te druk."*
 *
 * Dat laatste is de hele reden dat dit bestand bestaat, en het is een goed idee:
 * de agenda is de schaarse kant van dit bedrijf, niet het geld. Een klant die in
 * maand vier stopt met een vooruitbetaald Brand-jaar houdt acht maanden × € 1.950
 * aan productiewaarde over. In één pot is dat € 15.600 aan tegoed dat op één dag
 * kan worden opgeëist: tweehonderdveertig producten in een week waarin er
 * hooguit honderdvijf gemaakt kunnen worden (zie capacity.js). Per maand
 * vrijgegeven is het precies het abonnement dat hij al had.
 *
 * ── ER ZIJN TWEE MANIEREN OM TE STOPPEN, EN MAAR ÉÉN ERVAN STAAT HIER ──────
 *
 *   1 · NIET VERLENGEN. De gewone. Het jaar is betaald, dus het jaar loopt uit:
 *       dezelfde maandtoekenning, hetzelfde venster, alleen geen verlenging in
 *       maand dertien. Daar is geen code voor nodig en dus staat die er niet —
 *       het abonnement blijft gewoon staan tot het afloopt.
 *
 *   2 · STOPPEN EN OMZETTEN. Voor wie de dienst niet meer wil (het venster
 *       opgeven, met een ander ritme verder) maar wel betaald heeft. De maanden
 *       die nog komen, worden tegoed. Dát is wat hier wordt uitgerekend.
 *
 * ── DE VIER REGELS ─────────────────────────────────────────────────────────
 *
 *   1 · GEEN GELD TERUG. Zie PREPAY_REFUNDABLE. Dat is de tegenprestatie voor de
 *       korting en het staat in de voorwaarden, niet alleen in deze code.
 *   2 · ÉÉN TRANCHE PER MAAND, elk vrij vanaf zíjn eigen maand. Nooit één bedrag.
 *   3 · DE TRANCHE DRAAGT DE TREDE VAN HET PLAN mee. Zonder dat zou een
 *       Brand-klant zijn restant tegen het tarief van één product uitgeven en
 *       € 1.950 opeens dertien producten waard zijn in plaats van dertig. De
 *       trede is een eigenschap van het contract, niet van de bestelling — zie
 *       planRung() in budget.js.
 *   4 · DE WAARDE IS HET MAANDBUDGET EN NIET DE MAANDPRIJS. De klant heeft
 *       € 292,50 per maand betaald voor € 545 aan productie; wat hij overhoudt is
 *       wat hem beloofd is, niet wat het kostte. Anders zou stoppen een korting
 *       op je eigen abonnement zijn.
 *
 * ── WAT HIER NIET STAAT ────────────────────────────────────────────────────
 *
 * De boeking zelf. Dit bestand rekent uit WAT er moet komen; tegoed.js is het
 * grootboek dat het bijhoudt en dat weet dat niets van dit alles in geld op te
 * nemen is. De tranches hier zijn 'topup'-regels met een extra veld erbij, zodat
 * ze in datzelfde grootboek passen zonder dat het een tweede soort saldo wordt.
 */
import { PLAN_IDS, term, isPrepaid, prepayFreeMonths, prepayPaidMonths } from './plans.js';
import { planBudget, planRung } from './budget.js';
import { TEGOED_GELDIG_MAANDEN } from './tegoed.js';

/**
 * Kan een vooruitbetaald jaar in geld worden terugbetaald?
 *
 * NEE, EN DAT IS DE AFSPRAAK ZELF. Lucas: *"als iemand halverwege stopt krijgt
 * hij uiteraard geen geld terug, daarom betaal je ook een jaar vooruit."* De
 * korting van één tot drie maanden is precies de prijs van die zekerheid; zonder
 * dit is een vooruitbetaald jaar een renteloze lening met korting.
 *
 * Deze constante staat hier zodat er één plek is die dit zegt en zodat een toets
 * hem kan vastpinnen. Wat er WEL tegenover staat, staat in restantTranches().
 */
export const PREPAY_REFUNDABLE = false;

/** Een maand 'YYYY-MM' als doorlopend getal, om mee te kunnen rekenen. */
function maandNr(maand) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(maand || ''));
  if (!m) return null;
  const nr = Number(m[2]);
  if (nr < 1 || nr > 12) return null;
  return Number(m[1]) * 12 + (nr - 1);
}

/** En terug. */
function maandStr(nr) {
  const jaar = Math.floor(nr / 12);
  const maand = (nr % 12) + 1;
  return `${String(jaar).padStart(4, '0')}-${String(maand).padStart(2, '0')}`;
}

/**
 * Welke maanden van het betaalde jaar er nog komen.
 *
 * @param {string} startMaand      de eerste maand van het jaar, 'YYYY-MM'
 * @param {string} gestoptNaMaand  de laatste maand die als abonnement geleverd is
 * @param {number} maanden         de lengte van de termijn (twaalf)
 * @returns {string[]}             de maanden erná, tot het einde van de termijn
 *
 * Een lege lijst is een geldig antwoord en het gewone geval: wie in de laatste
 * maand stopt, heeft niets meer openstaan.
 */
export function restantMaanden(startMaand, gestoptNaMaand, maanden = term('prepaid').months) {
  const start = maandNr(startMaand);
  const stop = maandNr(gestoptNaMaand);
  const lengte = Math.max(0, Math.floor(Number(maanden) || 0));
  if (start === null || stop === null || !lengte) return [];
  const eind = start + lengte - 1;
  /* Buiten het jaar stoppen kan niet meer openstaan opleveren dan er is: vóór de
     start is het hele jaar over, ná het einde niets. */
  const eerste = Math.max(start, stop + 1);
  const lijst = [];
  for (let n = eerste; n <= eind; n += 1) lijst.push(maandStr(n));
  return lijst;
}

/**
 * Het restant van een vooruitbetaald jaar, als tegoedregels die per maand
 * vrijkomen.
 *
 * Elke tranche is een gewone 'topup'-regel voor tegoed.js, met twee velden erbij
 * die het grootboek niet nodig heeft maar de studio wel:
 *
 *   `vrijVanaf`  de maand waarin hij besteed mag worden. REGEL 2 uit de kop.
 *   `rung`       de trede waarop hij gerekend wordt. REGEL 3.
 *
 * @param {{planId:string, startMaand:string, gestoptNaMaand:string}} arg
 * @returns {Array<{maand:string, vrijVanaf:string, cents:number, rung:number, soort:string}>}
 */
export function restantTranches({ planId, startMaand, gestoptNaMaand } = {}) {
  if (!PLAN_IDS.includes(String(planId))) return [];
  const budget = planBudget(planId);
  if (!budget) return [];
  const rung = planRung(planId);
  return restantMaanden(startMaand, gestoptNaMaand).map((maand) => ({
    maand,
    vrijVanaf: maand,
    cents: Math.round(budget * 100),
    rung,
    soort: 'topup',
  }));
}

/** Wat er in totaal openstaat, in centen. Voor de balans, niet voor de klant. */
export function restantTotaalCents(arg) {
  return restantTranches(arg).reduce((som, t) => som + t.cents, 0);
}

/**
 * Welke tranches er in maand `nu` besteed mogen worden.
 *
 * DIT IS DE POORT en niet een sorteervolgorde: wie hem overslaat, geeft de klant
 * het hele restant op één dag, en dat is precies wat Lucas wilde voorkomen.
 */
export function vrijgegeven(tranches = [], nu) {
  const n = maandNr(nu);
  if (n === null) return [];
  return (Array.isArray(tranches) ? tranches : [])
    .filter((t) => t && maandNr(t.vrijVanaf) !== null && maandNr(t.vrijVanaf) <= n);
}

/** En hoeveel dat is. */
export function beschikbaarCents(tranches = [], nu) {
  return vrijgegeven(tranches, nu).reduce((som, t) => som + Math.max(0, Math.round(Number(t.cents) || 0)), 0);
}

/**
 * Wat een vooruitbetaald jaar in geld teruggeeft bij tussentijds stoppen.
 *
 * Altijd nul, en dat is een functie en geen constante omdat elke aanroeper hier
 * langs hoort te komen in plaats van zelf een nul te typen. Verandert de afspraak
 * ooit, dan verandert hij op één plek.
 */
export function prepayRefundCents() {
  return PREPAY_REFUNDABLE ? 0 : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DE TEKSTEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Drie dingen moeten er staan vóór iemand betaalt, en ze staan hier bij elkaar
 * zodat de toets kan controleren dat ze er alle drie zijn: wat het kost, dat er
 * geen geld terugkomt, en wat er dan wél gebeurt.
 */
export const VOORUIT_COPY = {
  nl: {
    label: 'Voordeligst',
    kop: '12 maanden vooruit',
    sub: 'in één keer betaald',
    /* {gratis} maanden gratis · bespaart {bedrag} */
    voordeel: '{gratis} maanden gratis — je bespaart {bedrag}',
    voordeelEen: '1 maand gratis — je bespaart {bedrag}',
    ineens: '{bedrag} in één keer, voor twaalf maanden',
    geenGeldTerug: 'Stop je tussentijds, dan komt er geen geld terug — daar staat de korting tegenover.',
    restant: 'Wat er van je jaar overblijft, houd je: het wordt tegoed dat elke maand vrijkomt, in dezelfde maandelijkse porties als je abonnement.',
    waarom: 'Zo blijft je week te plannen en kan een jaar niet in één dag opgeëist worden.',
    geldig: `Tegoed blijft ${TEGOED_GELDIG_MAANDEN} maanden geldig.`,
  },
  en: {
    label: 'Best value',
    kop: '12 months up front',
    sub: 'paid in one go',
    voordeel: '{gratis} months free — you save {bedrag}',
    voordeelEen: '1 month free — you save {bedrag}',
    ineens: '{bedrag} once, for twelve months',
    geenGeldTerug: 'Stop partway and there is no refund — that is what the discount pays for.',
    restant: 'What is left of your year stays yours: it becomes credit that unlocks every month, in the same monthly portions as your plan.',
    waarom: 'That keeps the week plannable, and stops a whole year being claimed in a single day.',
    geldig: `Credit stays valid for ${TEGOED_GELDIG_MAANDEN} months.`,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * BOUWCONTROLES
 * ═══════════════════════════════════════════════════════════════════════════ */
function assertVooruit() {
  /* 1 · DE TERMIJN BESTAAT EN IS VOORUITBETAALD. Dit bestand rekent nergens over
        als `prepaid` ooit een gewone termijn wordt. */
  if (!isPrepaid('prepaid')) {
    throw new Error('vooruit.js: de termijn "prepaid" is niet als vooruitbetaald gemarkeerd in plans.js.');
  }

  /* 2 · ELK PLAN HEEFT EEN BUDGET. Zonder budget is een tranche nul waard en
        levert stoppen stilzwijgend niets op. */
  for (const id of PLAN_IDS) {
    if (!(planBudget(id) > 0)) {
      throw new Error(`vooruit.js: plan "${id}" heeft geen maandbudget; een restant zou nul waard zijn.`);
    }
    if (!(prepayPaidMonths(id) > 0) || !(prepayFreeMonths(id) > 0)) {
      throw new Error(`vooruit.js: plan "${id}" heeft geen zinnige verdeling betaalde/gratis maanden.`);
    }
  }

  /* 3 · HET RESTANT KOMT NOOIT IN ÉÉN KEER VRIJ. De controle die het hele
        bestand rechtvaardigt: elf maanden restant horen elf tranches te zijn met
        elf verschillende vrijgavemaanden. */
  const proef = restantTranches({ planId: 'brand', startMaand: '2026-01', gestoptNaMaand: '2026-04' });
  if (proef.length !== 8) {
    throw new Error(`vooruit.js: stoppen na maand vier van twaalf laat ${proef.length} maanden open, geen 8.`);
  }
  if (new Set(proef.map((t) => t.vrijVanaf)).size !== proef.length) {
    throw new Error('vooruit.js: twee tranches komen in dezelfde maand vrij; het restant valt dan alsnog in één keer.');
  }
  if (beschikbaarCents(proef, '2026-05') !== proef[0].cents) {
    throw new Error('vooruit.js: in de eerste maand na het stoppen is meer dan één tranche besteedbaar.');
  }

  /* 4 · DE TREDE GAAT MEE. Zonder dit is het restant van een Brand-jaar minder
        producten waard dan hetzelfde bedrag binnen het abonnement. */
  if (proef[0].rung !== planRung('brand')) {
    throw new Error('vooruit.js: een tranche draagt de trede van het plan niet mee.');
  }

  /* 5 · GEEN GELD TERUG, en dat blijft zo tot iemand het bewust verandert. */
  if (PREPAY_REFUNDABLE || prepayRefundCents() !== 0) {
    throw new Error('vooruit.js: een vooruitbetaald jaar geeft geld terug; dat is een ander product.');
  }

  /* 6 · DE TEKSTEN ZEGGEN ALLE DRIE DE DINGEN, in beide talen. */
  for (const l of ['nl', 'en']) {
    const c = VOORUIT_COPY[l];
    if (!c || !c.geenGeldTerug || !c.restant || !c.ineens) {
      throw new Error(`vooruit.js: de ${l}-teksten missen de prijs, de geen-geld-terugregel of het restant.`);
    }
    if (!c.voordeel.includes('{bedrag}') || !c.ineens.includes('{bedrag}')) {
      throw new Error(`vooruit.js: de ${l}-teksten hebben geen plek voor het bedrag.`);
    }
  }
}

assertVooruit();
