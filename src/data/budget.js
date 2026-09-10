/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET MAANDBUDGET — WAT EEN ABONNEMENT JE GEEFT OM ZELF TE VERDELEN
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── DE VRAAG ───────────────────────────────────────────────────────────────
 *
 * Lucas: *"Klanten kunnen producten per maand kiezen (…) Zie het meer als credits
 * die je zelf kan uitgeven op wat je nodig hebt. (…) Ik denk dat een credit
 * systeem daarom ook beter is om te creëren dus bijvoorbeeld 1 product laten
 * fotograferen of verfilmen kost 10 credits."*
 *
 * En, toen hij zelf het gat in "product als eenheid" zag: *"Het enige is stel ik
 * heb een style of service die iets duurder is dan de ander kan je bijvoorbeeld
 * met credits 15 credits ipv 10 credits daarvoor rekenen. 1,5 product is raar in
 * dat geval."*
 *
 * ── WAT DIT BESTAND DOET, EN WAAROM DE EENHEID DE EURO IS ──────────────────
 *
 * Dit IS het creditsysteem. Alleen heet de credit hier een euro, en dat is geen
 * flauwe truc maar de oplossing van precies het probleem dat Lucas beschrijft.
 *
 * Een credit moet één vaste waarde hebben. Zodra je hem probeert te geven, loop je
 * tegen dit aan — nagerekend op de echte tarieven van deze site:
 *
 *     een clip kost € 69, op ELK plan, want video staat niet op de ladder;
 *     een catalogset kost € 65 op Starter en € 39 op Brand, want die staat er wel op.
 *
 * Anker je de credit op de catalogset (Lucas' 10 credits), dan kost dezelfde clip
 * 11 credits op Starter en 18 op Brand. Een klant die van Studio naar Brand gaat,
 * ziet zijn clip duurder worden terwijl hij goedkoper is geworden. Dat is geen
 * randgeval maar het gewone gebruik, en er is geen creditwaarde die het oplost:
 * de ene prijs beweegt met het volume mee en de andere niet.
 *
 * In euro's bestaat het probleem niet. Een clip kost € 69. Een duurdere stijl kost
 * meer euro's. Er is geen conversietabel om bij te houden, geen 1,5 product, en de
 * klant hoeft niet te leren wat een credit waard is — dat weet hij al.
 *
 * ALLES WAT LUCAS WILDE, ZIT ER WEL IN: één pot per maand, zelf verdelen over
 * catalog, lifestyle en video, wat overblijft schuift door, en wat een eenmalige
 * opbouw vergt (merkmodel, Editions, een eigen stijl) betaal je één keer apart en
 * valt daarna onder hetzelfde systeem.
 *
 * ── WAT HET BUDGET IS ──────────────────────────────────────────────────────
 *
 * Het budget is de PRODUCTIEWAARDE van wat het plan belooft, niet de prijs ervan.
 * Starter belooft vijf producten; vijf producten kosten op de trede van Starter
 * € 545; dus is het budget € 545 en betaal je er € 390 voor. De korting zit in het
 * abonnement en niet in het budget, en daardoor blijft "vijf producten per maand"
 * letterlijk waar terwijl de klant er iets anders voor mag kiezen.
 *
 * ── EN HET KAN DE AGENDA NIET OPBLAZEN ─────────────────────────────────────
 *
 * Dat is niet gehoopt maar bewezen, in assertBudget() onderaan: van alles op het
 * menu is de eigen dienst van het abonnement (complete) het GOEDKOOPST per
 * agendapunt. Elke andere besteding van hetzelfde budget levert dus minder werk op
 * dan waar het plan al op gerekend was. Een klant kan zijn maand herverdelen zoveel
 * hij wil; de week loopt er nooit door vol.
 *
 * Wat dit NIET regelt is de spreiding binnen de maand — twintig producten in één
 * week is nog steeds twintig producten in één week. Dat blijft het werk van
 * capacity.js en het venster; zie de noot bij `BUDGET_WEEK_SHARE`.
 */
import {
  PLAN_AMOUNT, AMOUNT, ladderRate, extraPhotoRate, HOOG_PER_PRODUCT,
  KIND_PUNTEN, CATALOG_IMAGES, LIFESTYLE_IMAGES, COMPLETE_IMAGES, euro,
} from './pricing.js';
import { PLAN_IDS, PLAN_SERVICE, productsFor, clipsFor, hasBrandModel } from './plans.js';

/*
 * ── HET MENU ───────────────────────────────────────────────────────────────
 *
 * Waar een maandbudget aan uitgegeven kan worden. Elk item draagt drie dingen en
 * geen vierde:
 *
 *   `kind`    de soort waarmee pricing.js hem prijst en capacity.js hem weegt.
 *             Eén woord, in beide tabellen hetzelfde — daarom kan deze lijst
 *             geen prijs en geen gewicht bevatten.
 *   `beelden` wat de klant ervoor terugkrijgt. Alleen om het te kunnen tonen.
 *   `los`     of dit item op zichzelf besteld kan worden, of alleen bovenop een
 *             product dat er toch al is (een extra hoek hangt aan een catalogset;
 *             4K hangt aan een lifestylebeeld).
 *
 * DE PRIJS STAAT ER NIET IN, en dat is de hele reden dat dit werkt: hij hangt aan
 * de trede van het plan en wordt met menuRate() opgehaald. Een prijs die hier zou
 * staan, zou op een dag iets anders zeggen dan de ladder.
 */
export const BUDGET_MENU = [
  { id: 'complete', kind: 'complete', beelden: COMPLETE_IMAGES, los: true },
  { id: 'catalog', kind: 'catalog', beelden: CATALOG_IMAGES, los: true },
  { id: 'lifestyle', kind: 'lifestyle', beelden: LIFESTYLE_IMAGES, los: true },
  { id: 'video', kind: 'video-motion', beelden: 0, los: true },
  { id: 'angle', kind: null, beelden: 1, los: false },
  { id: 'hoogRes', kind: null, beelden: 0, los: false },
];

export const MENU_IDS = BUDGET_MENU.map((i) => i.id);

export function menuItem(id) {
  return BUDGET_MENU.filter((i) => i.id === String(id || ''))[0] || null;
}

/**
 * De trede waarop dit plan rekent.
 *
 * HET AANTAL VAN HET PLAN EN NIET WAT ER DEZE MAAND BESTELD WORDT. Anders zou een
 * klant op Brand die één maand twee producten doet, voor die twee het tarief van
 * dertig krijgen — of andersom, en dat is erger: wie zijn budget aan carrousels
 * uitgeeft, zou stilletjes op een duurdere trede belanden en minder overhouden dan
 * de pagina beloofde. De trede is een eigenschap van het contract.
 */
export function planRung(planId) {
  /* GEEN TERUGVAL OP DE LAAGSTE TREDE. Deze functie stond eerst met een `|| 1`
     erin, en dat is precies de vorm waarin een prijsfout zich verstopt: een
     onbekende plan-id zou dan stilletjes de DUURSTE tarieven krijgen en er zou
     nergens iets misgaan. productsFor() gooit op een onbekend plan, en dat mag hier
     gewoon doorlopen — een plan dat niet bestaat, heeft geen trede. */
  return productsFor(planId);
}

/**
 * Wat één item van het menu kost op deze trede, in hele euro's exclusief btw.
 *
 * Alles komt uit pricing.js. `angle` en `hoogRes` hebben geen eigen ladder maar
 * hun eigen accessor, precies zoals in het bestelformulier — zie EXTRA_PHOTO_LADDER
 * en HOOG_PER_PRODUCT daar.
 */
export function menuRate(itemId, rung = 1) {
  const item = menuItem(itemId);
  if (!item) return null;
  const n = Math.max(1, Math.floor(Number(rung) || 1));
  switch (item.id) {
    case 'complete':
    case 'catalog':
    case 'lifestyle':
      return ladderRate(item.kind, n);
    /* Video staat NIET op de ladder en dat is een keuze van pricing.js die hier
       zichtbaar moet blijven: een clip kost hetzelfde op elk plan. Precies dit
       feit maakt een vaste creditwaarde onmogelijk — zie de kop van dit bestand. */
    case 'video':
      return AMOUNT.video;
    case 'angle':
      return extraPhotoRate(n);
    case 'hoogRes':
      return HOOG_PER_PRODUCT;
    default:
      return null;
  }
}

/** Wat één item de agenda kost. `null` voor wat geen eigen slot heeft. */
export function menuPunten(itemId) {
  const item = menuItem(itemId);
  if (!item || !item.kind) return 0;
  const p = KIND_PUNTEN[item.kind];
  return typeof p === 'number' ? p : 0;
}

/**
 * Het maandbudget van een plan, in hele euro's exclusief btw.
 *
 * DE PRODUCTIEWAARDE VAN WAT HET PLAN BELOOFT. Zie de kop: zo blijft "twaalf
 * producten per maand" waar terwijl de klant er iets anders voor mag kiezen, en
 * zit de abonnementskorting in de PRIJS in plaats van in het budget.
 *
 * Het merkmodel telt hier niet mee, ook niet op de plannen die er een bevatten:
 * dat is een eenmalige opbouw en geen maandelijkse levering. Zie SETUP_FEES.
 */
export function planBudget(planId) {
  const n = productsFor(planId);
  const clips = clipsFor(planId) || 0;
  if (!Number.isFinite(n) || n < 1) return 0;
  return n * ladderRate(PLAN_SERVICE, n) + clips * AMOUNT.video;
}

/**
 * Hetzelfde voor een maand op maat, waar geen plan-id is maar een eigen aantal.
 * Dezelfde rekenregel, één keer opgeschreven — anders lopen de twee vormen van
 * hetzelfde abonnement op een dag uit elkaar.
 */
export function budgetFor(products, clips = 0) {
  const n = Math.max(0, Math.floor(Number(products) || 0));
  const k = Math.max(0, Math.floor(Number(clips) || 0));
  if (!n) return 0;
  return n * ladderRate(PLAN_SERVICE, n) + k * AMOUNT.video;
}

/**
 * Hoeveel van dit item er nog in het resterende budget past.
 *
 * Naar beneden afgerond, want een halve carrousel bestaat niet. Dit is de functie
 * die het scherm gebruikt om te zeggen "hier kun je er nog 3 van" — en dus ook de
 * functie die bepaalt of een restje besteedbaar is. Zie assertBudget(): er is
 * altijd minstens één item dat voor minder dan het goedkoopste product te krijgen
 * is, zodat een rest nooit strandt.
 */
export function budgetBuys(restEuro, itemId, rung = 1) {
  const tarief = menuRate(itemId, rung);
  const rest = Number(restEuro) || 0;
  if (!tarief || tarief <= 0 || rest <= 0) return 0;
  return Math.floor(rest / tarief);
}

/**
 * Wat een maand kost aan budget, gegeven een verdeling.
 *
 * @param {Record<string, number>} verdeling  bijv. { catalog: 8, video: 2 }
 * @param {number} rung
 * @returns {{euro:number, punten:number, beelden:number, regels:Array}}
 */
export function spendTotal(verdeling = {}, rung = 1) {
  let euroTotaal = 0;
  let punten = 0;
  let beelden = 0;
  const regels = [];
  for (const item of BUDGET_MENU) {
    const aantal = Math.max(0, Math.floor(Number(verdeling[item.id]) || 0));
    if (!aantal) continue;
    const tarief = menuRate(item.id, rung) || 0;
    euroTotaal += aantal * tarief;
    punten += aantal * menuPunten(item.id);
    beelden += aantal * item.beelden;
    regels.push({ id: item.id, aantal, tarief, bedrag: aantal * tarief });
  }
  return { euro: euroTotaal, punten, beelden, regels };
}

/*
 * ── WAT BUITEN HET BUDGET VALT ─────────────────────────────────────────────
 *
 * Lucas: *"Custom opties die een eenmalige setup vereisen hebben eerst een setup
 * fee en vallen daarna ook onder hetzelfde systeem."*
 *
 * Precies zo, en de tweede helft van die zin is de belangrijke: NA de opbouw kost
 * het gebruik ervan niets extra's. Een merkmodel is geen levering maar een
 * eigenschap van je bestellingen — er zijn twaalf beelden met jouw gezicht erop, en
 * die twaalf beelden zijn al uit het budget betaald. Zou het gezicht óók per keer
 * uit het budget gaan, dan betaalde de klant twee keer voor hetzelfde.
 *
 * De bedragen komen uit pricing.js en staan hier niet.
 */
export const SETUP_FEES = [
  { id: 'brandModel', bedrag: AMOUNT.brandModel, href: '/custom-models' },
  { id: 'editions', bedrag: AMOUNT.editionsSetup, href: '/editions' },
];

/**
 * Welk deel van een maandbudget in één week ingepland mag worden.
 *
 * DIT BESTAND REGELT DE PRIJS EN NIET DE PLANNING, en die twee moeten elkaar niet
 * gaan overschrijven. Het budget zegt hoevéél er deze maand gemaakt wordt; het
 * venster in capacity.js zegt wannéér. Deze constante is de enige brug: geen
 * enkele week mag meer dan dit deel van de maand opslokken, zodat een klant zijn
 * hele budget niet op één dinsdag kan laten landen.
 *
 * Een kwart en niet een derde: een maand heeft er ruim vier, en de vierde week is
 * de marge die een drukke maand overeind houdt.
 */
export const BUDGET_WEEK_SHARE = 0.25;

/* ═══════════════════════════════════════════════════════════════════════════
 * BOUWCONTROLES
 * ═══════════════════════════════════════════════════════════════════════════
 * Alles hierboven is afgeleid. Deze controles bewijzen dat het afgeleide klopt —
 * ze draaien bij elke build, want dit bestand wordt door de pagina's geïmporteerd.
 */
function assertBudget() {
  /* 1 · ELK MENU-ITEM HEEFT OP ELKE TREDE EEN PRIJS. Een item zonder tarief zou
        op het scherm als "€ NaN" of als gratis eindigen, en dat laatste is erger. */
  for (const item of BUDGET_MENU) {
    for (const planId of PLAN_IDS) {
      const tarief = menuRate(item.id, planRung(planId));
      if (!Number.isFinite(tarief) || tarief <= 0) {
        throw new Error(`budget.js: '${item.id}' heeft geen bruikbaar tarief op ${planId} (${tarief}).`);
      }
    }
  }

  /* 2 · HET BUDGET IS DE PRODUCTIEWAARDE, EN DIE IS HOGER DAN DE PRIJS. Zou de
        prijs hoger zijn, dan betaalt een abonnee meer dan iemand die per stuk
        bestelt, en dan is het abonnement een strafmaatregel. */
  for (const planId of PLAN_IDS) {
    const budget = planBudget(planId);
    const prijs = PLAN_AMOUNT[planId];
    if (!(budget > prijs)) {
      throw new Error(
        `budget.js: ${planId} geeft € ${budget} aan productie voor € ${prijs} — een abonnement hoort goedkoper te zijn dan losse bestellingen.`);
    }
  }

  /* 3 · DE KORTING LOOPT NIET UIT ELKAAR. Drie plannen met 28%, 32% en 13% zijn
        drie verschillende beloftes onder één naam. Het merkmodel telt mee waar het
        inbegrepen is, want dat is echte waarde die de klant krijgt.

        VIJFTIEN PUNTEN SPELING en geen exacte gelijkheid: de ladder springt met
        hele treden en de plannen staan op verschillende treden, dus wat exact
        gelijk zou moeten zijn, kan dat niet. Wat deze controle vangt is een plan
        dat er ECHT uit loopt — de vorm van de fout, niet de afronding. */
  const kortingen = PLAN_IDS.map((planId) => {
    const waarde = planBudget(planId) + (hasBrandModel(planId, 'monthly') ? AMOUNT.brandModel : 0);
    return { planId, korting: 1 - PLAN_AMOUNT[planId] / waarde };
  });
  const laagste = Math.min(...kortingen.map((k) => k.korting));
  const hoogste = Math.max(...kortingen.map((k) => k.korting));
  if (hoogste - laagste > 0.15) {
    const lijst = kortingen.map((k) => `${k.planId} ${(k.korting * 100).toFixed(1)}%`).join(', ');
    throw new Error(`budget.js: de abonnementskorting loopt te ver uiteen (${lijst}).`);
  }

  /* 4 · GEEN ENKELE BESTEDING BLAAST DE AGENDA OP. De eigen dienst van het
        abonnement moet het GOEDKOOPST per agendapunt zijn; dan levert elke andere
        verdeling van hetzelfde budget mínder werk op dan waar het plan al op
        gerekend had. Dit is de controle die het hele model draagt. */
  for (const planId of PLAN_IDS) {
    const rung = planRung(planId);
    const eigen = menuRate(PLAN_SERVICE, rung) / (menuPunten(PLAN_SERVICE) || 1);
    for (const item of BUDGET_MENU) {
      if (!item.kind) continue;
      const punten = menuPunten(item.id);
      if (!punten) continue;
      const perPunt = menuRate(item.id, rung) / punten;
      if (perPunt < eigen - 0.001) {
        throw new Error(
          `budget.js: op ${planId} kost '${item.id}' € ${perPunt.toFixed(2)} per agendapunt en '${PLAN_SERVICE}' € ${eigen.toFixed(2)} — `
          + 'dan koopt een klant met hetzelfde budget méér werk dan het plan aankan.');
      }
    }
  }

  /* 5 · EEN REST STRANDT NOOIT. Er moet altijd iets op het menu staan dat minder
        kost dan het goedkoopste hele product, anders houdt elke klant elke maand
        een bedrag over waar niets voor te krijgen is — de klassieke klacht over
        elk creditsysteem, en de reden dat de 4K-optie hier op het menu staat. */
  for (const planId of PLAN_IDS) {
    const rung = planRung(planId);
    const heleProducten = BUDGET_MENU.filter((i) => i.los).map((i) => menuRate(i.id, rung));
    const goedkoopsteProduct = Math.min(...heleProducten);
    const kleinste = Math.min(...BUDGET_MENU.map((i) => menuRate(i.id, rung)));
    if (!(kleinste < goedkoopsteProduct)) {
      throw new Error(
        `budget.js: op ${planId} is het kleinste item (€ ${kleinste}) niet kleiner dan het goedkoopste product (€ ${goedkoopsteProduct}) — restbudget zou stranden.`);
    }
  }

  /* 6 · HET WEEKDEEL IS EEN DEEL. Een waarde boven 1 zou betekenen dat een week
        meer dan de hele maand mag dragen, en onder 0 dat er niets ingepland kan. */
  if (!(BUDGET_WEEK_SHARE > 0 && BUDGET_WEEK_SHARE <= 1)) {
    throw new Error(`budget.js: BUDGET_WEEK_SHARE moet tussen 0 en 1 liggen (${BUDGET_WEEK_SHARE}).`);
  }
}
assertBudget();

/**
 * De regels die het scherm toont: wat je met dit budget kunt doen, per item.
 * Uitgerekend en niet getypt, zodat een gewijzigd tarief hier vanzelf doorwerkt.
 */
export function budgetTable(planId, lang = 'nl') {
  const rung = planRung(planId);
  const budget = planBudget(planId);
  return BUDGET_MENU.filter((i) => i.los).map((item) => {
    const tarief = menuRate(item.id, rung);
    return {
      id: item.id,
      tarief,
      tariefTekst: euro(tarief, lang),
      beelden: item.beelden,
      /* Hoeveel er van dit ene item in het hele budget passen. Bewust "als je
         alles hieraan uitgeeft" en geen aanbeveling: er is geen goede verdeling. */
      maximaal: budgetBuys(budget, item.id, rung),
    };
  });
}
