/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET ABONNEMENT — HET CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 16 augustus 2026: *"Kan ik al een werkend abonnement toevoegen aan
 * visuails website dat geautomatiseerd werkt"* — en later, beslissend voor de
 * vorm die hieronder staat: *"Ik wil niet dat visuails zegt wat er aan de beurt
 * is [...] Onthoud ik werk alleen dus ik kan uiteindelijk overzicht verliezen dus
 * zoveel mogelijk moet geautomatiseerd zijn."*
 *
 * Dit bestand is de enige plek waar staat wat een abonnement IS. Zelfde rol als
 * src/data/ratios.js en src/data/backgrounds.js: het bestelformulier, de
 * prijspagina, de studio, de webhook en het adminpaneel lezen hier één getal in
 * plaats van er vijf keer hun eigen versie van te hebben.
 *
 * WAT HIER NIET STAAT ZIJN DE BEDRAGEN. Die staan in pricing.js — PLAN_AMOUNT,
 * PLAN_PRODUCTS, PLAN_CLIPS — en worden hieronder geïmporteerd en niet overgetypt.
 * Dat bestand is de bron voor alles wat geld is, en een abonnement is geen
 * uitzondering. Hier staat de STRUCTUUR: de termijn, het doorschuiven, hoeveel
 * plekken er zijn, en wat een jaarverbintenis oplevert.
 *
 * ── DE VIER DINGEN DIE DIT BESTAND BESLIST ─────────────────────────────────
 *
 * 1 · WELKE VORMEN ER ZIJN. Maandelijks of twaalf maanden vast. Zie TERMS.
 * 2 · WAT EEN JAARVERBINTENIS KOOPT, en dat is bijna nooit een lagere prijs —
 *     zie de kop van TERMS voor de rekensom die dat uitsluit.
 * 3 · HOEVEEL PLEKKEN ER ZIJN: één plafond in credits (6.05, 8 oktober 2026).
 * 4 · HOE HET SALDO WERKT: toekennen, verbruiken, doorschuiven, vervallen.
 */
import {
  PLAN_AMOUNT, PLAN_PRODUCTS, PLAN_CLIPS, PLAN_COMPARE_MONTHS, PLAN_ROLLOVER_MONTHS,
  AMOUNT, ladderRate, LADDER, CUSTOM_MONTH_ID, PLAN_CREDITS, planSaving,
} from './pricing.js';

/** De id's van de plannen, in de volgorde waarin ze op de pagina staan. */
export const PLAN_IDS = ['starter', 'studio', 'brand'];

/**
 * Wat een abonnementsRIJ mag dragen — de drie pakketten plus de maand op maat.
 *
 * ── WAAROM DIT EEN TWEEDE LIJST IS EN GEEN VIERDE ELEMENT IN PLAN_IDS ───────
 *
 * PLAN_IDS is "de plannen": drie vaste vormen met een vaste prijs, die naast
 * elkaar op de prijspagina staan, in de vergelijkingstabel voorkomen en in de
 * algemene voorwaarden bij naam en bedrag worden genoemd. Elke lus over die
 * lijst vraagt om `PLAN_AMOUNT[id]` en `PLAN_PRODUCTS[id]`, en een maand op maat
 * heeft die twee niet — hij draagt zijn eigen bedrag en zijn eigen bundel op de
 * rij. Zou hij in PLAN_IDS staan, dan zou de bandbreedte in de voorwaarden
 * ("van € 390 tot € 1690") stilletjes NaN worden.
 *
 * Deze lijst is dus geen synoniem maar een andere vraag: niet "wat kun je kopen"
 * maar "wat mag er in de kolom `subscriptions.plan` staan".
 */
export const SUB_PLAN_IDS = [...PLAN_IDS, CUSTOM_MONTH_ID];

/**
 * Welke dienst een abonnement levert.
 *
 * 'catalog' sinds 14 oktober 2026. Hier stond 'complete' (catalog + lifestyle per
 * product), maar compleet bestaat sinds 14 oktober 2026 niet meer (afvinklijst 23), en een plan rekent sinds 19 september 2026 in credits die
 * je vrij besteedt. planSaving() zet die credits af tegen catalogsets los besteld,
 * de goedkoopste dienst per credit; deze constante zegt hetzelfde.
 */
export const PLAN_SERVICE = 'catalog';

/*
 * ── DE TERMIJNEN ───────────────────────────────────────────────────────────
 *
 * WAAROM DE JAARVORM GEEN KORTING GEEFT OP STUDIO EN BRAND, en dat is gemeten
 * en geen zuinigheid. Twee maanden korting over twaalf termijnen levert op:
 *
 *   Starter  € 325/mnd  = € 65,00 per product   ← precies de bodem van de ladder
 *   Studio   € 658/mnd  = € 54,80 per product   ← onder de bodem
 *   Brand    € 1.408/mnd = € 46,90 per product  ← ver onder de bodem
 *
 * De bodem van LADDER.complete is € 65. De maandplannen van Studio (€ 65,80) en
 * Brand (€ 56,30) zitten daar al op of onder, want de ladder belóónt volume al —
 * een volumeplan bovenop een volumekorting kan niet nog een keer hetzelfde
 * belonen. Wie de korting toch doortrekt, verkoopt dertig producten per maand
 * onder zijn laagste tarief aan de klant die het meest van de capaciteit opeet.
 *
 * Vandaar `discountMonths` PER PLAN en niet één getal voor alle drie, en vandaar
 * dat de jaarvorm zijn waarde uit `perks` haalt. Die vier dingen kosten niets
 * extra en zijn voor een merk meer waard dan acht procent:
 *
 *   · een STAANDE week in de agenda — dezelfde dagen elke maand;
 *   · drie maanden doorschuiven in plaats van één, voor een merk met seizoenen;
 *   · een prijsslot: gaat de ladder omhoog, dan blijft hun tarief staan;
 *   · het merkmodel ook op Studio (nu alleen op Brand).
 *
 * assertPlans() onderaan dit bestand rekent de eerste regel na en gooit bij het
 * bouwen als een korting een plan onder de bodem duwt. Dat is geen stijlregel:
 * het is het enige getal in dit bestand waar je geld op verliest.
 */
/**
 * Hoe diep een VOORUITBETAALD jaar onder de bodem van de ladder mag komen.
 *
 * ── WAAROM DE BODEM HIER EEN ANDERE IS ─────────────────────────────────────
 *
 * De bodem PLAN_BODEM_CENTS (€ 65, het oude bundeltarief) is het laagste tarief van een LOSSE
 * bestelling, en die ladder stopt bij twintig producten omdat dat de grootste
 * losse bestelling is waar hij op gebouwd is. Een vooruitbetaald jaar op Studio
 * is honderdvierenveertig producten, in één keer betaald, twaalf maanden van
 * tevoren. Dat met de trede van twintig meten is de verkeerde trede pakken.
 *
 * Zeventig procent is de grens die dat verschil eerlijk maakt zonder hem weg te
 * geven: € 45,50 per product. Elk plan mag daar met vooruitbetaling naartoe,
 * geen enkel plan mag eronder.
 *
 * HIJ STOND OP 0,75 TOT 10 SEPTEMBER 2026. Toen koos Lucas voor twee gratis
 * maanden op élk plan, en daarmee komt Brand op € 46,93 — 72% van de bodem, en
 * onder de oude grens. De grens is dus mee omlaag gegaan, bewust en met dit
 * getal erbij. Wat hij nog steeds tegenhoudt: drie gratis maanden op Brand
 * leveren € 42,25 op, 65%, en dan valt de build om.
 *
 * Zet hem op 1 en een vooruitbetaald jaar mag nooit onder de losse bodem; zet hem
 * lager en je verkoopt capaciteit onder je eigen laagste tarief. assertPlans()
 * rekent het na bij het bouwen.
 */
export const PREPAY_FLOOR_SHARE = 0.70;

export const TERMS = {
  monthly: {
    id: 'monthly',
    months: PLAN_COMPARE_MONTHS,      // 3 — het rekenvenster, geen looptijd en geen minimum
    fixed: false,
    discountMonths: {},               // geen enkel plan krijgt korting
    rollover: PLAN_ROLLOVER_MONTHS,   // 1
    perks: [],
    name: { en: 'Monthly', nl: 'Maandelijks' },
  },
  yearly: {
    id: 'yearly',
    months: 12,
    fixed: true,
    /* ── GEEN KORTING MEER OP DEZE TERMIJN — 10 september 2026 ──────────────
     *
     * Hier stond `{ starter: 2 }`: twee gratis maanden, alleen op Starter, omdat
     * dezelfde korting op Studio en Brand onder de ladderbodem zakte.
     *
     * Lucas koos vandaag voor één regel over de hele lijn: *"2 gratis maanden
     * (klant betaald voor 10 maanden en krijgt 12 maanden)"*. Die regel kan niet
     * op ALLEBEI de jaartermijnen staan — dan kost een vooruitbetaald jaar op
     * Starter precies evenveel als een jaar dat je per maand afbetaalt, en
     * betaalt niemand vooruit. Eén van de twee moet de korting dragen.
     *
     * Het is deze geworden, en dat is ook de eerlijkste kant. Een verbintenis van
     * twaalf maanden die per maand wordt geïncasseerd, laat de studio nog steeds
     * het incassorisico en de mislukte betalingen dragen en ze kan er niets mee
     * doen; vooruitbetaald geld staat op de rekening. Deze termijn koopt daarom
     * VOORWAARDEN — drie maanden doorschuiven, een prijsslot, het merkmodel op
     * Studio — en `prepaid` koopt daar een PRIJS bij. (De vaste week is weg sinds
     * ronde 10; deze termijn zelf staat sinds 6.04 niet meer in het aanbod, zie
     * OFFERED_TERM_IDS hieronder.)
     *
     * WAT HET KOST: Starter op de jaartermijn gaat van € 325 terug naar € 390 per
     * maand. Dat is een prijsverhoging op een bestaand aanbod, en het kan vandaag
     * gratis omdat er nog geen abonnees zijn. Over drie maanden was het een
     * gesprek met klanten geweest. */
    discountMonths: {},
    rollover: 3,
    /* 'standingWindow' is weg (29 september 2026): elk abonnement heeft een vaste
       week, ook het maandelijkse — Lucas: "Goed" op het voorstel om de tekst
       aan te passen in plaats van de week bij maandelijks weg te halen. */
    perks: ['priceLock', 'brandModel'],
    name: { en: '12 months', nl: '12 maanden' },
  },
  /* ── HET VOORUITBETAALDE JAAR — 10 september 2026 ─────────────────────────
   *
   * Lucas: *"Ik wil trouwens de jaar abonnementen ook gunstiger maken omdat dit
   * perfect is voor de boekhouding en snelle omzet. De klant krijgt dan
   * bijvoorbeeld 2 maanden gratis en betaald dan voor 10 maanden per jaar in
   * plaats van 12."* En: *"als iemand halverwege stopt krijgt hij uiteraard geen
   * geld terug, daarom betaal je ook een jaar vooruit."*
   *
   * DIT IS EEN DERDE TERMIJN EN GEEN BETAALWIJZE VAN DE TWEEDE. Een betaalwijze
   * naast een termijn zou twee kolommen in de database opleveren en vier
   * combinaties op de kaart, waarvan er één ("maandelijks, vooruitbetaald") niet
   * bestaat. Eén radiogroep met drie standen houdt `subscriptions.term` één
   * kolom en de kaart één keuze.
   *
   * EN DE KORTING HOORT HIER EN NIET OP `yearly`. Dat is het verschil dat de
   * drie standen uit elkaar houdt en het is ook waar het geld zit: een
   * verbintenis van twaalf maanden die per maand wordt afgeschreven, laat de
   * studio nog steeds het incassorisico en de mislukte betalingen dragen en ze
   * kan er niets mee doen. Vooruitbetaald geld staat op de rekening. Daarom
   * koopt `yearly` VOORWAARDEN (drie maanden doorschuiven, een prijsslot, het
   * merkmodel op Studio) en koopt `prepaid` daar een PRIJS bij.
   */
  prepaid: {
    id: 'prepaid',
    months: 12,
    fixed: true,
    prepaid: true,
    /* ── ÉÉN REGEL: BETAAL TIEN, KRIJG TWAALF ──────────────────────────────
     *
     * Lucas, 10 september 2026: *"2 gratis maanden (klant betaald voor 10
     * maanden en krijgt 12 maanden)"*. Op elk plan hetzelfde, en dat is de
     * uitlegbaarste vorm die er is — één zin op de prijspagina, geen tabel.
     *
     * Hier stond eerst 3-2-1 (Starter drie gratis maanden, Studio twee, Brand
     * één), omdat een platte twee op Brand onder de ladderbodem zakt. Dat is nog
     * steeds waar en het is de moeite waard om te weten waar het geld dan zit:
     *
     *   Starter  € 325/mnd = € 65,00 per product   ← precies de ladderbodem
     *   Studio   € 658/mnd = € 54,83 per product   ← 84% van die bodem
     *   Brand    € 1.408/mnd = € 46,93 per product ← 72% van die bodem
     *
     * Brand legt in zijn eentje 9,5% van de maandcapaciteit vast (zie DE PLEKKEN
     * hieronder) en heeft het merkmodel (AMOUNT.brandModel) al inbegrepen. Twaalf maanden
     * dertig producten per maand op € 46,93, met een prijsslot erbovenop, is de
     * grootste klant op het laagste tarief vastzetten. Dat is Lucas' besluit en
     * niet dat van dit bestand — maar het staat hier opgeschreven, zodat het over
     * een half jaar een keuze blijkt te zijn geweest en geen ongeluk.
     *
     * PREPAY_FLOOR_SHARE is daarom mee omlaag gegaan, van 0,75 naar 0,70. Niet
     * uitgezet: bij drie gratis maanden komt Brand op 65% en valt de build alsnog
     * om. De controle bijt nog steeds, één stap verderop.
     */
    discountMonths: { starter: 2, studio: 2, brand: 2 },
    /* De bodem geldt hier anders, en dat is geen uitzondering maar een andere
       meting. Zie PREPAY_FLOOR_SHARE. */
    floorShare: PREPAY_FLOOR_SHARE,
    rollover: 3,
    perks: ['priceLock', 'brandModel', 'prepaid'],
    name: { en: '12 months up front', nl: '12 maanden vooruit' },
  },
};

export const TERM_IDS = ['monthly', 'yearly', 'prepaid'];

/*
 * ── TWEE TERMIJNEN IN HET AANBOD — 8 oktober 2026 (punt 6.04, V44 = a) ───────
 *
 * Lucas koos: de tussentermijn (12 maanden, maandelijks geïncasseerd, geen
 * korting) gaat weg. /plans en /start/plan tonen alleen maandelijks en jaar
 * vooruit, en handleSubscribeStart() weigert 'yearly' voor een NIEUW abonnement.
 * TERMS.yearly en TERM_IDS blijven bestaan: een abonnement dat al op die termijn
 * loopt, werkt gewoon door tot zijn einde (de webhook, Studio en /admin lezen
 * de termijn van de rij). Pro houdt het merkmodel bij vooruit (perks hierboven).
 */
export const OFFERED_TERM_IDS = ['monthly', 'prepaid'];

/** Eén termijn opzoeken, met de maandelijkse als terugval. */
export function term(id) {
  return TERMS[String(id || '')] || TERMS.monthly;
}

/**
 * Wat een plan per maand kost op deze termijn, in hele euro's.
 *
 * DE KORTING WORDT UITGESMEERD en niet als gratis maanden aan het begin gegeven.
 * Twee redenen. Boekhoudkundig: elke maand dezelfde factuur voor dezelfde
 * levering, en geen twee maanden met een nul erop die je later moet uitleggen.
 * En praktisch: Mollie schrijft één vast bedrag af — een subscription met een
 * ander bedrag in maand één en twee is twee subscriptions.
 *
 * Naar boven afgerond op hele euro's, want een abonnementsprijs van € 324,17 op
 * een prijspagina is een prijs die niemand heeft bedacht.
 */
export function monthlyCents(planId, termId) {
  const base = PLAN_AMOUNT[planId];
  if (!base) throw new Error(`plans.js: onbekend plan "${planId}"`);
  const t = term(termId);
  const gratis = Number(t.discountMonths[planId] || 0);
  if (!gratis) return base * 100;
  const jaar = base * t.months;
  const netto = jaar - base * gratis;
  return Math.round(netto / t.months) * 100;
}

/** Betaalt deze termijn het hele jaar vooruit? */
export function isPrepaid(termId) {
  return term(termId).prepaid === true;
}

/**
 * Hoeveel maanden dit plan op een vooruitbetaald jaar GRATIS krijgt.
 * Nul op elke andere termijn — dit getal hoort bij de vooruitbetaling.
 */
export function prepayFreeMonths(planId) {
  return Number(TERMS.prepaid.discountMonths[planId] || 0);
}

/** En hoeveel maanden hij er dan wél voor betaalt. */
export function prepayPaidMonths(planId) {
  return TERMS.prepaid.months - prepayFreeMonths(planId);
}

/**
 * Wat een vooruitbetaald jaar in één keer kost, in centen.
 *
 * DIT IS HET BEDRAG DAT DE KLANT AFREKENT en het wordt HIER uitgerekend en niet
 * uit `monthlyCents()` afgeleid. Die functie rondt op hele euro's af omdat een
 * abonnementsprijs van € 658,33 op een prijspagina een prijs is die niemand heeft
 * bedacht — maar twaalf keer € 658 is € 7.896 en tien keer € 790 is € 7.900. Vier
 * euro verschil op één factuur is een boekhouding die niet sluit.
 *
 * Vandaar: het maandbedrag is voor de PAGINA, dit bedrag is voor de BETALING.
 */
export function prepayTotalCents(planId) {
  const base = PLAN_AMOUNT[planId];
  if (!base) throw new Error(`plans.js: onbekend plan "${planId}"`);
  return base * prepayPaidMonths(planId) * 100;
}

/** Wat een vooruitbetaald jaar scheelt ten opzichte van twaalf losse maanden. */
export function prepaySaveCents(planId) {
  const base = PLAN_AMOUNT[planId];
  if (!base) throw new Error(`plans.js: onbekend plan "${planId}"`);
  return base * prepayFreeMonths(planId) * 100;
}

/** Wat een heel jaar op deze termijn kost — voor de vergelijking op de pagina. */
export function termTotalCents(planId, termId) {
  const t = term(termId);
  /* Op een vooruitbetaald jaar is het jaartotaal het BETAALDE bedrag en niet
     twaalf afgeronde maanden — zie prepayTotalCents() voor de vier euro die daar
     tussen zit. */
  if (t.prepaid) return prepayTotalCents(planId);
  return monthlyCents(planId, t.id) * t.months;
}

/** Hoeveel producten dit plan per maand toekent. */
export function productsFor(planId) {
  const n = PLAN_PRODUCTS[planId];
  if (!n) throw new Error(`plans.js: onbekend plan "${planId}"`);
  return n;
}

/** En hoeveel videoclips. Nul is een geldig antwoord en geen ontbrekende waarde. */
export function clipsFor(planId) {
  return Number(PLAN_CLIPS[planId] || 0);
}

/**
 * Wat een product binnen dit plan effectief kost, in centen.
 *
 * Dit getal staat op geen enkele pagina en het hoort er ook niet op: een klant
 * koopt een plan en geen prijs per product. Het bestaat voor assertPlans() en
 * voor het adminpaneel, waar het de enige manier is om te zien of een plan nog
 * boven de bodem van de ladder zit.
 */
export function perProductCents(planId, termId) {
  return Math.round(monthlyCents(planId, termId) / productsFor(planId));
}

/** De laagste prijs per product die de ladder van deze dienst kent, in centen. */
export function ladderFloorCents(service = PLAN_SERVICE) {
  const rungs = LADDER[service];
  return rungs[rungs.length - 1][2] * 100;
}

/*
 * ── DE BODEM WAARTEGEN DE PLANNEN GEMETEN WORDEN — 14 oktober 2026 ─────────
 *
 * Tot vandaag was dit ladderFloorCents('complete'): € 65, het laagste tarief van
 * een catalogset plus carrousel in één bestelling. Die dienst bestaat niet meer
 * (afvinklijst 23), en PLAN_SERVICE is 'catalog' geworden. Zou deze controle
 * gewoon meeschuiven naar de catalogbodem (€ 39), dan zakte de enige controle
 * waar geld op staat stil van € 65 naar € 39 en beet hij nergens meer.
 *
 * Daarom staat het bedrag hier vast, met de hand, als de maat waarop de grenzen
 * hieronder (PREPAY_FLOOR_SHARE, de tegenproef met drie gratis maanden) zijn
 * afgesteld. De controle rekent nog per product van PLAN_PRODUCTS, terwijl een
 * abonnement sinds 19 september in credits rekent; dat is een vraag voor Lucas
 * (afvinklijst 24) en geen reden om de controle nu zachter te maken.
 */
export const PLAN_BODEM_CENTS = 6500;

/**
 * Krijgt dit plan op deze termijn het merkmodel erbij?
 *
 * Brand heeft hem altijd — dat staat in plans() in pricing.js en is de reden dat
 * zijn korting op de ladder klein is. Op de jaartermijn komt Studio erbij, en dat
 * is een van de vier dingen die een jaarverbintenis koopt in plaats van een
 * korting: de eenmalige setup (AMOUNT.brandModel in pricing.js) wordt over twaalf
 * maanden toch al afgeschreven. Hier stond een oud bedrag; sinds 8 oktober 2026
 * (punt 9.01, §17.1) noemt dit commentaar de constante en geen getal.
 */
export function hasBrandModel(planId, termId) {
  if (planId === 'brand') return true;
  return planId === 'studio' && term(termId).perks.includes('brandModel');
}

/* ── DE PLEKKEN: EEN PLAFOND IN CREDITS — 8 oktober 2026 (punt 6.05, V45 = a) ──
 *
 * Hier stond "het abonnementsbudget": 30% van de begeleide capaciteit in
 * producten (15 per dag × 21 dagen × 0,30 = 94, in punten ±231 per maand), en
 * seatsLeft() rekende daar "nog 13 Starter-plekken" uit. Dat getal was niet na
 * te rekenen, en met het weeksysteem (§28) verdween de reden voor een eigen
 * abonnementscapaciteit: een abonnee bestelt via het gewone formulier, en de
 * agenda vangt zijn vensters op zoals die van iedereen.
 *
 * Wat blijft is een REM op het aantal abonnees, en Lucas koos (V45 = a) voor
 * één plafond in CREDITS: de maandcredits van alle abonnementen die meetellen
 * (bezetting() in subscription.js), tegen één getal dat hij zelf zet in /admin
 * (Klanten). Staat daar nog niets, dan geldt ABO_CREDITS_PLAFOND hieronder.
 * Credits meten het werk zelf: een Merk (290) is ruim zes keer een Starter (45),
 * en elk product kost minstens zoveel credits als agendapunten.
 *
 * TER VERGELIJKING: 1.000 credits alleen aan catalogsets is 250 sets, ±83 uur
 * per maand. Het plafond begrenst de maand, niet de dag.
 *
 * WAAROM DE STANDAARD 1.200 IS (en niet de 1.000 uit de vraag). "Standaard
 * ruim", en hoog genoeg dat er zonder één abonnee bij geen enkel plan "nog N
 * plekken" staat: 1.200 / 290 (Merk) = 4, boven PLEKKEN_TONEN_TOT. Bij 1.000
 * zou Merk vanaf de eerste dag "nog 3 plekken" zeggen. Lucas zet het echte
 * getal zelf in /admin › Klanten, vanuit zijn uren (V45 = a).
 */
export const ABO_CREDITS_PLAFOND = 1200;

/**
 * "Nog N plekken" staat pas op /start/plan als het er zo weinig zijn. Daarboven
 * zegt de pagina niets: "nog 13 plekken" terwijl er geen abonnee is, leest als
 * "niemand heeft het" (6.05).
 */
export const PLEKKEN_TONEN_TOT = 3;

/** Het plafond als getal: een stand uit /admin, of de constante. Nooit nul of onzin. */
export function aboPlafond(stand = null) {
  const n = Math.floor(Number(stand));
  return Number.isFinite(n) && n > 0 ? n : ABO_CREDITS_PLAFOND;
}

/**
 * Past er nog een abonnement van `wil` credits per maand bij, gegeven wat er al
 * vastligt? `vastgelegd` is de som uit bezetting(); `plafond` de stand uit /admin.
 */
export function creditsPassen(wil, vastgelegd, plafond = ABO_CREDITS_PLAFOND) {
  const nieuw = Math.max(0, Math.floor(Number(wil) || 0));
  const al = Math.max(0, Math.floor(Number(vastgelegd) || 0));
  return al + nieuw <= aboPlafond(plafond);
}

/** Past dit plan (starter, studio, brand) er nog bij? */
export function planPast(planId, vastgelegd, plafond = ABO_CREDITS_PLAFOND) {
  const cr = PLAN_CREDITS[planId];
  if (!cr) throw new Error(`plans.js: onbekend plan "${planId}"`);
  return creditsPassen(cr, vastgelegd, plafond);
}

/**
 * Hoeveel abonnementen van dit plan er nog bij passen, in hele plekken.
 *
 * Sinds 6.05 per plan en in credits: "nog 2 plekken" voor Merk is iets anders
 * dan voor Starter. De pagina toont het pas bij PLEKKEN_TONEN_TOT of minder.
 */
export function seatsLeft(vastgelegd, planId = 'starter', plafond = ABO_CREDITS_PLAFOND) {
  const cr = PLAN_CREDITS[planId];
  if (!cr) throw new Error(`plans.js: onbekend plan "${planId}"`);
  const over = aboPlafond(plafond) - Math.max(0, Math.floor(Number(vastgelegd) || 0));
  return Math.max(0, Math.floor(over / cr));
}

/* ── HET SALDO ──────────────────────────────────────────────────────────────
 *
 * Elke maand krijgt een abonnement zijn producten toegekend. Wat er die maand
 * niet verbruikt is, schuift door — één maand op de maandtermijn, drie op de
 * jaartermijn — en vervalt daarna.
 *
 * WAAROM DOORSCHUIVEN BESTAAT. Een merk met een seizoen haalt niet elke maand
 * hetzelfde aantal, en een plan dat je niet vult is geen besparing maar een
 * teleurstelling — dat staat met zoveel woorden in de FAQ. Doorschuiven maakt het
 * plan bovendien voor de STUDIO rustiger: het verspreidt piekmaanden.
 *
 * WAAROM HET VERVALT EN NIET EEUWIG BLIJFT STAAN. Een tegoed dat nooit vervalt,
 * is een verplichting die je op je balans meesleept en die op een dag in één
 * keer wordt opgeëist — dertig producten in één week is precies wat de
 * capaciteitspoort moet voorkomen. Zie ook PLAN_ROLLOVER_MONTHS in pricing.js,
 * waar dit getal al stond voordat er een abonnement was.
 */
export function rolloverMonths(termId) {
  return term(termId).rollover;
}

/**
 * Het saldo van deze maand: toegekend, plus wat er nog geldig doorgeschoven is.
 *
 * `history` is een lijst van maanden, oudste eerst, elk met `granted` en `used`.
 * Alleen de laatste `rolloverMonths` maanden doen mee — wat ouder is, is vervallen.
 *
 * NOOIT NEGATIEF. Een klant die door een correctie meer heeft verbruikt dan hij
 * had, houdt nul over en geen schuld: het meerdere is bij de bestelling al op de
 * ladder afgerekend (zie §5 van ABONNEMENT-ONTWERP.md), dus hier nog een keer
 * aftrekken zou hem twee keer laten betalen.
 */
export function available(planId, termId, history = []) {
  return availableFrom(productsFor(planId), termId, history);
}

/**
 * Dezelfde som, maar met een AANTAL in plaats van een plan-id.
 *
 * Een maand op maat heeft geen productsFor() — hoeveel hij per maand geeft, staat
 * op de rij. Het doorschuiven verandert daar niet door, dus de rekenregel hoort
 * één keer te bestaan en niet twee keer met twee kansen om uit elkaar te lopen.
 * available() hierboven is sinds vandaag een aanroep hiervan.
 */
export function availableFrom(grant, termId, history = []) {
  const window = rolloverMonths(termId);
  /* `history` zijn de VOORBIJE maanden — deze maand zit al in `grant`. Bij een
     venster van nul telt er niets door; `slice(-0)` geeft de hele lijst, dus dat
     geval moet er apart uit. */
  const recent = window > 0 ? history.slice(-window) : [];
  let saldo = grant;
  for (const m of recent) {
    const granted = Math.max(0, Math.floor(Number(m?.granted) || 0));
    const used = Math.max(0, Math.floor(Number(m?.used) || 0));
    saldo += Math.max(0, granted - used);
  }
  return Math.max(0, saldo);
}

/**
 * WELKE DOORGESCHOVEN PRODUCTEN WANNEER VERVALLEN.
 *
 * available() geeft één getal. Dit geeft de herkomst: per voorbije maand hoeveel
 * er uit die maand nog meedoet, en tot wanneer.
 *
 * ── WAAROM DIT BESTAAT, EN WAAROM HET GEEN DRUKMIDDEL IS ────────────────────
 *
 * Lucas koos op 17 augustus voor *"doorschuiven, maar met een zichtbare
 * afloopdatum"* — tegenover een harde reset op de 1e. Dat is de goede kant van
 * beide: de druk om iets te doen zonder de piek die een reset veroorzaakt. Bij een
 * reset schuift het verbruik naar de laatste dagen van de maand, en 94 producten
 * in drie dagen is 31 per dag terwijl er 15 begeleid kunnen — voor iemand die
 * alleen werkt is dat niet een drukke week maar een onmogelijke.
 *
 * Een zichtbare vervalmaand doet iets anders: het zegt WANNEER, en dus kan de
 * klant spreiden. Vandaar dat deze functie een maand teruggeeft en geen aantal
 * dagen — een afteller op de dag maakt de laatste dag de drukste.
 *
 * `history` is oudste-eerst, zoals bij available(). De vervalmaand van een
 * overschot uit maand M is M plus het venster: met een venster van één maand is
 * wat er in augustus overblijft, in september nog te gebruiken en daarna weg.
 */
export function rolloverDetail(termId, history = []) {
  const window = rolloverMonths(termId);
  if (window <= 0) return [];
  return history.slice(-window).map((m) => {
    const granted = Math.max(0, Math.floor(Number(m?.granted) || 0));
    const used = Math.max(0, Math.floor(Number(m?.used) || 0));
    return {
      from: m?.month || '',
      left: Math.max(0, granted - used),
      /* De laatste maand waarin dit overschot nog te gebruiken is. */
      until: addMonths(m?.month, window),
    };
  }).filter((r) => r.left > 0);
}

/**
 * 'YYYY-MM' plus n maanden. Eigen rekenwerk en geen Date: `new Date('2026-12')`
 * plus een maand is in JavaScript een uitnodiging voor een tijdzonefout, en dit
 * is een periode en geen moment.
 */
export function addMonths(month, n) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (!m) return '';
  const totaal = (Number(m[1]) * 12 + (Number(m[2]) - 1)) + Math.floor(Number(n) || 0);
  const jaar = Math.floor(totaal / 12);
  const maand = (totaal % 12) + 1;
  return `${String(jaar).padStart(4, '0')}-${String(maand).padStart(2, '0')}`;
}

/* ── MEEDENKEN BESTAAT NIET — 8 oktober 2026 (punt 9.01, §17.6) ─────────────
 *
 * Hier stond ADVISORY ("Maandelijks meedenken": € 450 per maand bovenop Brand,
 * hoogstens vier klanten) met advisoryAvailable() en een bouwcontrole onderaan.
 * Lucas, 6 oktober: die dienst bestaat niet. Niets op de site of in Studio las
 * hem; alleen een volgende lezer kon denken dat hij te koop was. Weg, met de
 * controle erbij.
 */

/* ── DE BOUWCONTROLES ───────────────────────────────────────────────────────
 *
 * Draaien bij het importeren, dus een verkeerde korting valt om tijdens het
 * bouwen en niet in een afschrijving. Zelfde afspraak en dezelfde reden als
 * assertLadder() in pricing.js: het is niet genoeg dat de getallen op één plek
 * staan, de VERHOUDING ertussen moet gecontroleerd worden.
 */
function assertPlans() {
  const bodem = PLAN_BODEM_CENTS;

  for (const id of PLAN_IDS) {
    if (!PLAN_AMOUNT[id] || !PLAN_PRODUCTS[id]) {
      throw new Error(`plans.js: plan "${id}" mist een bedrag of een aantal in pricing.js`);
    }
    for (const t of TERM_IDS) {
      const pp = perProductCents(id, t);
      /* DE ENIGE CONTROLE WAAR GELD OP STAAT. Een plan mag niet onder de bodem
         van de ladder zakken: dan verkoop je volume onder je eigen laagste
         tarief aan de klant die het meest van je capaciteit gebruikt.
         Uitzondering is `brand`, die er BEWUST onder zit omdat het merkmodel
         erbij hoort — zie plans() in pricing.js. */
      /* Een VOORUITBETAALD jaar meet tegen een lagere bodem, en dan wél voor
         alle drie de plannen — zie PREPAY_FLOOR_SHARE. Brand is daar juist niet
         vrijgesteld: dat is het plan waar deze controle voor bestaat. */
      const tt = term(t);
      const drempel = tt.floorShare ? Math.round(bodem * tt.floorShare) : bodem;
      const vrijgesteld = id === 'brand' && !tt.floorShare;
      if (!vrijgesteld && pp < drempel) {
        throw new Error(
          `plans.js: ${id} op ${t} komt op € ${(pp / 100).toFixed(2)} per product, `
          + `onder de bodem van € ${(drempel / 100).toFixed(2)}`
          + (tt.floorShare ? ` (${Math.round(tt.floorShare * 100)}% van de ladderbodem van € ${(bodem / 100).toFixed(2)})` : '')
          + '. Verlaag de korting in TERMS of verhoog het plan in pricing.js.'
        );
      }
    }
  }

  // Doorschuiven mag nooit korter worden op een langere verbintenis: dat zou een
  // jaarabonnee minder geven dan een maandabonnee.
  if (TERMS.yearly.rollover < TERMS.monthly.rollover) {
    throw new Error('plans.js: de jaartermijn schuift korter door dan de maandtermijn');
  }

  // De vaste termijn moet langer zijn dan de minimumtermijn, anders betekent
  // "twaalf maanden vast" niets naast "drie maanden minimum".
  if (TERMS.yearly.months <= TERMS.monthly.months) {
    throw new Error('plans.js: de jaartermijn is niet langer dan de minimumtermijn');
  }

  /* ── DE TERUGVAL IN plans() — WEG SINDS 6.03/6.04 (8 oktober 2026) ─────────
   * Hier stond een controle dat de kaart in pricing.js "(3 op 12 maanden)"
   * noemde, gelijk aan TERMS.yearly.rollover. De kaart noemt nu één getal voor
   * iedereen (CREDITS_GELDIG_MAANDEN in pricing.js), en de tussentermijn staat
   * niet meer in het aanbod; er valt hier dus niets meer gelijk te houden.
   */

  // En er moet ruimte zijn voor ten minste één abonnee van elk plan, anders is
  // het plafond een pagina die nooit iets aanbiedt (6.05: in credits).
  for (const id of PLAN_IDS) {
    if (PLAN_CREDITS[id] > ABO_CREDITS_PLAFOND) {
      throw new Error(
        `plans.js: ${id} heeft ${PLAN_CREDITS[id]} credits per maand en het plafond is ${ABO_CREDITS_PLAFOND}. `
        + 'Verhoog ABO_CREDITS_PLAFOND.'
      );
    }
  }

  /* ── HET VOORUITBETAALDE JAAR — 10 september 2026 ─────────────────────────
   *
   * Vier dingen die geld kosten als ze wegzakken. Ze staan hier en niet in een
   * toets, omdat een verkeerde waarde in `discountMonths` anders pas op de
   * prijspagina zichtbaar wordt.
   */
  for (const id of PLAN_IDS) {
    // 1 · Er is altijd minstens één maand voordeel, anders is de derde stand een
    //     knop die de klant geld kost en niets oplevert.
    if (prepayFreeMonths(id) < 1) {
      throw new Error(`plans.js: ${id} krijgt geen enkele gratis maand op een vooruitbetaald jaar.`);
    }
    // 2 · En nooit zoveel dat het jaar gratis wordt.
    if (prepayFreeMonths(id) >= TERMS.prepaid.months) {
      throw new Error(`plans.js: ${id} krijgt ${prepayFreeMonths(id)} gratis maanden op twaalf.`);
    }
    // 3 · Vooruitbetalen moet GOEDKOPER zijn dan dezelfde twaalf maanden op de
    //     jaartermijn — anders vraagt de pagina om geld vooruit voor niets.
    if (prepayTotalCents(id) >= termTotalCents(id, 'yearly')) {
      throw new Error(
        `plans.js: een vooruitbetaald jaar op ${id} kost € ${(prepayTotalCents(id) / 100).toFixed(2)} `
        + `en de jaartermijn € ${(termTotalCents(id, 'yearly') / 100).toFixed(2)}. `
        + 'Verhoog de gratis maanden in TERMS.prepaid.'
      );
    }
  }
  /* 4 · WAT DE KLANT LEEST, LOOPT OPLOPEND. Hij vergelijkt euro's en geen
   *     maanden: een groter plan dat minder bespaart dan een kleiner plan is een
   *     prijslijst die zichzelf tegenspreekt. Deze regel is de reden dat de
   *     verdeling 3-2-1 mag bestaan. */
  for (let i = 1; i < PLAN_IDS.length; i += 1) {
    const vorig = prepaySaveCents(PLAN_IDS[i - 1]);
    const nu = prepaySaveCents(PLAN_IDS[i]);
    if (nu < vorig) {
      throw new Error(
        `plans.js: ${PLAN_IDS[i]} bespaart € ${(nu / 100).toFixed(2)} met vooruitbetalen en `
        + `${PLAN_IDS[i - 1]} € ${(vorig / 100).toFixed(2)}. Het grotere plan hoort niet minder te besparen.`
      );
    }
  }
  // 5 · En een langere verbintenis schuift nooit korter door.
  if (TERMS.prepaid.rollover < TERMS.yearly.rollover) {
    throw new Error('plans.js: het vooruitbetaalde jaar schuift korter door dan de jaartermijn');
  }

}

assertPlans();

/** Alles wat een pagina over één plan op één termijn moet weten, in één object. */
export function planShape(planId, termId = 'monthly') {
  const t = term(termId);
  return {
    id: planId,
    term: t.id,
    products: productsFor(planId),
    clips: clipsFor(planId),
    monthlyCents: monthlyCents(planId, t.id),
    totalCents: termTotalCents(planId, t.id),
    months: t.months,
    fixed: t.fixed,
    rollover: t.rollover,
    brandModel: hasBrandModel(planId, t.id),
    perks: t.perks,
    /* De vergelijking met los bestellen, uitgerekend en niet overgetypt. Sinds
       14 oktober 2026 dezelfde som als de prijspagina (planSaving): de credits
       van het plan, los besteld aan catalogsets. Hier stond het aantal
       producten tegen de complete-ladder; die bestaat niet meer. */
    ladderCents: Math.round(planSaving(planId).onLadder * 100),
    brandModelSetupCents: hasBrandModel(planId, t.id) ? AMOUNT.brandModel * 100 : 0,
  };
}
