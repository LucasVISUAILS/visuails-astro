/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET VOORUITBETAALDE JAAR — WAT ER GEBEURT ALS IEMAND HALVERWEGE STOPT
 * 10 september 2026, herzien op 24 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 10 september: *"als iemand halverwege stopt krijgt hij uiteraard geen
 * geld terug, daarom betaal je ook een jaar vooruit, hij blijft de service en
 * credits gewoon van dat jaar houden per maand."*
 *
 * Lucas, 24 september: *"Tegoed van jaarabonnement moet niet in 1x op het
 * account gezet worden omdat ik anders teveel werk krijg. Het abonnement moet
 * gewoon simpelweg doorlopen tot einde van het jaar."*
 *
 * ── ER IS NU NOG MAAR ÉÉN MANIER OM TE STOPPEN ─────────────────────────────
 *
 * Tot 24 september stonden er twee: het jaar laten uitlopen, of "stoppen en
 * omzetten" — de maanden die nog kwamen werden tegoed, per maand vrijgegeven.
 * Dat tweede pad is weg. Het was werk met de hand (boeken onder Klant ›
 * Tegoed, het bedrag mailen) voor iets wat de klant net zo goed krijgt door het
 * jaar gewoon te laten lopen: dezelfde credits, dezelfde maanden, dezelfde week.
 *
 * Wat er nu gebeurt bij opzeggen: niets aan de levering. De opzegging wordt
 * genoteerd (markeerJaarOpgezegd() in src/lib/subscription.js), de maanden
 * komen binnen zoals altijd (grantPrepaidMonths() in cron/index.js), en na de
 * twaalfde termijn sluit de cron het jaar af. Een vooruitbetaald jaar verlengt
 * nooit vanzelf, opgezegd of niet.
 *
 * ── WAT BLIJFT ─────────────────────────────────────────────────────────────
 *
 *   1 · GEEN GELD TERUG. Zie PREPAY_REFUNDABLE. Dat is de tegenprestatie voor de
 *       korting en het staat in de voorwaarden, niet alleen in deze code.
 *   2 · DE MAANDEN KOMEN PER MAAND. Nooit een jaar in één keer — dat was de
 *       reden achter de tranches, en die reden geldt nog steeds: de agenda is de
 *       schaarse kant van dit bedrijf, niet het geld. Doordat het jaar gewoon
 *       doorloopt, is dat nu vanzelf zo.
 */
import { PLAN_IDS, isPrepaid, prepayFreeMonths, prepayPaidMonths } from './plans.js';

/**
 * Kan een vooruitbetaald jaar in geld worden terugbetaald?
 *
 * NEE, EN DAT IS DE AFSPRAAK ZELF. Lucas: *"als iemand halverwege stopt krijgt
 * hij uiteraard geen geld terug, daarom betaal je ook een jaar vooruit."* De
 * korting van één tot drie maanden is precies de prijs van die zekerheid; zonder
 * dit is een vooruitbetaald jaar een renteloze lening met korting.
 *
 * Deze constante staat hier zodat er één plek is die dit zegt en zodat een toets
 * hem kan vastpinnen. Wat er WEL tegenover staat: het jaar loopt gewoon door
 * tot het einde, ook na opzeggen — zie de kop van dit bestand.
 */
export const PREPAY_REFUNDABLE = false;

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
 * geen geld terugkomt, en wat er dan wél gebeurt (het jaar loopt door). De
 * sleutel heet nog `restant` zodat PlanPicker.astro niet hoeft te veranderen.
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
    restant: 'Zeg je op, dan loopt je jaar gewoon door tot het einde: elke maand je credits en je vaste week. Het verlengt nooit vanzelf.',
  },
  en: {
    label: 'Best value',
    kop: '12 months up front',
    sub: 'paid in one go',
    voordeel: '{gratis} months free — you save {bedrag}',
    voordeelEen: '1 month free — you save {bedrag}',
    ineens: '{bedrag} once, for twelve months',
    geenGeldTerug: 'Stop partway and there is no refund — that is what the discount pays for.',
    restant: 'If you cancel, your year simply runs on to the end: your credits and your fixed week every month. It never renews by itself.',
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

  /* 2 · ELK PLAN HEEFT EEN ZINNIGE VERDELING betaalde en gratis maanden. */
  for (const id of PLAN_IDS) {
    if (!(prepayPaidMonths(id) > 0) || !(prepayFreeMonths(id) > 0)) {
      throw new Error(`vooruit.js: plan "${id}" heeft geen zinnige verdeling betaalde/gratis maanden.`);
    }
  }

  /* 3 · GEEN GELD TERUG, en dat blijft zo tot iemand het bewust verandert. */
  if (PREPAY_REFUNDABLE || prepayRefundCents() !== 0) {
    throw new Error('vooruit.js: een vooruitbetaald jaar geeft geld terug; dat is een ander product.');
  }

  /* 4 · DE TEKSTEN ZEGGEN ALLE DRIE DE DINGEN, in beide talen. */
  for (const l of ['nl', 'en']) {
    const c = VOORUIT_COPY[l];
    if (!c || !c.geenGeldTerug || !c.restant || !c.ineens) {
      throw new Error(`vooruit.js: de ${l}-teksten missen de prijs, de geen-geld-terugregel of wat er bij opzeggen gebeurt.`);
    }
    if (!c.voordeel.includes('{bedrag}') || !c.ineens.includes('{bedrag}')) {
      throw new Error(`vooruit.js: de ${l}-teksten hebben geen plek voor het bedrag.`);
    }
  }
}

assertVooruit();
