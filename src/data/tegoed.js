/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET TEGOED — GELD DAT AL BETAALD IS EN NOG NIET IS OPGEMAAKT
 * 9 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── DE VRAAG ───────────────────────────────────────────────────────────────
 *
 * Lucas: *"Ik kan sowieso credits toevoegen ookal heeft iemand geen abonnement.
 * Wanneer de klant bijvoorbeeld een refund krijgt dan kan hij bijvoorbeeld ook
 * kiezen om het in credits uit te laten betalen, en kan hij op die manier een
 * nieuwe order plaatsen."*
 *
 * Goed idee, en het is een ANDER ding dan het maandbudget uit budget.js. Dat
 * verschil is de hele reden dat dit een eigen bestand is, want de twee door
 * elkaar halen is de duurste fout die hier te maken valt.
 *
 *     HET MAANDBUDGET  is een toekenning. Het hoort bij een abonnement, het is
 *                      niet betaald maar toegezegd, en het verloopt — wat je een
 *                      maand niet opmaakt, schuift één maand door en is daarna weg.
 *
 *     HET TEGOED       is geld dat de klant AL HEEFT BETAALD en dat jij nog moet
 *                      leveren. Het hoort bij een klant en niet bij een contract,
 *                      het bestaat ook zonder abonnement, en het mag niet zomaar
 *                      verlopen — een vervaldatum op geld van iemand anders is
 *                      iets heel anders dan een vervaldatum op een tegoedbon van
 *                      jezelf.
 *
 * Eén pot van die twee maken zou betekenen dat je betaald geld laat verlopen met
 * de regels van een toekenning. Daarom staan ze in twee bestanden, met twee
 * ledgers, en spreekt spendOrder() hieronder uit in welke volgorde ze opgaan.
 *
 * ── VIJF REGELS DIE IN DE CODE HOREN EN NIET IN EEN AFSPRAAK ───────────────
 *
 * 1 · TEGOED IS EXCLUSIEF BTW, en dat is geen boekhoudkundige smaak maar een
 *     gevolg van wat dit tegoed IS. Een tegoed dat aan catalog, lifestyle én
 *     video besteed kan worden bij klanten in Nederland (21%), de EU met een
 *     btw-nummer (verlegd) en daarbuiten (niet belast), is een tegoedbon voor
 *     MEERDERE DOELEN: bij uitgifte staat de btw-behandeling nog niet vast. De
 *     btw wordt daarom pas verschuldigd bij BESTEDING, en dus mag er in dit
 *     saldo geen btw zitten. Zou het saldo bruto zijn, dan betaalt een klant met
 *     0% verlegd stilletjes 21% meer dan hij hoort — of jij draagt btw af over
 *     geld dat je nog niet verdiend hebt.
 *
 * 2 · TEGOED IS NOOIT UIT TE BETALEN. Wie met tegoed betaalt en daarna geld terug
 *     krijgt, krijgt tegoed terug — nooit contanten. Zonder die regel is dit een
 *     manier om geld te stallen en weer op te nemen, en dat is een ander product
 *     met een ander toezicht. Zie `refundOf()`.
 *
 * 3 · TEGOED IN PLAATS VAN GELD IS EEN KEUZE VAN DE KLANT. Nooit de enige knop,
 *     nooit voorgevinkt. Wie recht heeft op zijn geld, moet zijn geld kunnen
 *     krijgen; het tegoed is een aanbod met iets erbij, en geen omweg.
 *
 * 4 · TEGOED IS EEN SCHULD EN GEEN OMZET. Op het moment dat een terugbetaling
 *     tegoed wordt, heb je niets verdiend — je hebt een verplichting om nog te
 *     leveren. `openstaandTegoed()` bestaat zodat dat getal in /admin kan staan,
 *     want een tegoedpot die je als omzet leest, laat je bedrijf gezonder lijken
 *     dan het is. Dat is de klassieke cadeaubon-val.
 *
 * 5 · TEGOED KOOPT GEEN BUDGET. Het betaalt bestellingen tegen het gewone tarief
 *     en is niet in te wisselen voor abonnementsbudget. Zou dat wel kunnen, dan
 *     koopt iemand goedkoop tegoed en haalt er duurder budget uit — de ladder
 *     werkt de ene kant op en dat gat hoort dicht te zitten.
 *
 * ── WAT DIT BESTAND NIET DOET ──────────────────────────────────────────────
 *
 * Het schrijft niets weg. Het rekent: uit een lijst mutaties komt een saldo, uit
 * een terugbetaling komt een tegoedbedrag, en uit een bestelling komt een
 * verdeling over budget en tegoed. De tabel en de routes komen later; deze regels
 * horen te bestaan vóór er een knop is die ze kan overtreden.
 */

/**
 * De soorten mutatie die een tegoedregel kan zijn.
 *
 * `teken` is +1 of −1 en staat hier expliciet in plaats van in de code: zo kan
 * een nieuwe soort niet per ongeluk de verkeerde kant op tellen, en leest de
 * lijst als wat hij is — een grootboek.
 */
export const TEGOED_SOORTEN = [
  /* Een terugbetaling die de klant als tegoed wilde. De aanleiding. */
  { id: 'refund', teken: +1, uitbetaalbaar: false },
  /* Coulance: een late levering, een set die niet klopte, een verwijzing. Eén
     woord voor wat anders een kortingscode zou worden, en kortingscodes zijn
     precies hoe een prijslijst zijn eigen ladder ondermijnt. */
  { id: 'goodwill', teken: +1, uitbetaalbaar: false },
  /* Tegoed dat de klant zelf koopt. Staat hier omdat het kán, maar zie
     `assertTegoed()`: zolang er geen bedrag met korting aan hangt, is het gewoon
     vooruitbetalen en verandert het niets aan de regels. */
  { id: 'topup', teken: +1, uitbetaalbaar: false },
  /* Besteed aan een bestelling. */
  { id: 'spend', teken: -1, uitbetaalbaar: false },
  /* Teruggedraaid omdat een met tegoed betaalde bestelling is geannuleerd. */
  { id: 'reverse', teken: +1, uitbetaalbaar: false },
  /* Handmatig weggeboekt door de studio, met een reden. Bestaat zodat een fout
     rechtgezet kan worden zónder dat er een regel verdwijnt — een grootboek waar
     je uit kunt wissen, is geen grootboek. */
  { id: 'correction', teken: -1, uitbetaalbaar: false },
];

export const TEGOED_SOORT_IDS = TEGOED_SOORTEN.map((s) => s.id);

export function tegoedSoort(id) {
  return TEGOED_SOORTEN.filter((s) => s.id === String(id || ''))[0] || null;
}

/**
 * Hoeveel maanden een tegoed geldig is.
 *
 * VIERENTWINTIG EN NIET ÉÉN. Het maandbudget schuift één maand door omdat het een
 * toekenning is; dit is betaald geld, en een korte vervaltermijn op betaald geld
 * is in Nederland aanvechtbaar en in elk geval geen manier om met klanten om te
 * gaan. Twee jaar is ruim, staat op de bon, en is lang genoeg dat niemand hem
 * ooit tegenkomt.
 *
 * Zet hem op 0 en het tegoed verloopt nooit. Dat is verdedigbaar; het is dan wel
 * een verplichting die eeuwig op de balans blijft staan.
 */
export const TEGOED_GELDIG_MAANDEN = 24;

/**
 * Wat een klant extra krijgt als hij zijn terugbetaling als tegoed neemt.
 *
 * ── STAAT OP NUL, EN DAT IS EEN KEUZE DIE LUCAS MOET MAKEN ─────────────────
 *
 * Een bonus is het hele verkoopargument van deze knop: € 500 terug in geld of
 * € 550 in tegoed, en een deel van de klanten kiest het tweede. Daarmee verandert
 * een terugbetaling van een verlies in een volgende bestelling.
 *
 * Hij staat op nul omdat het weggeven van marge geen beslissing van dit bestand
 * is. Tien procent is de gebruikelijke maat en de rekensom is gunstig: je geeft
 * 10% weg op geld dat anders volledig de deur uit was gegaan. Zet hem op 0.10 en
 * de knop is aan; alle teksten en controles rekenen mee.
 */
export const TEGOED_BONUS = 0;

/** Het kleinste bedrag dat als tegoed kan bestaan: één cent. */
const CENT = 1;

/**
 * Het saldo uit een lijst mutaties, in centen exclusief btw.
 *
 * `regels` is een lijst van { soort, cents }. Onbekende soorten tellen NIET mee —
 * een regel die deze code niet kent, is een regel waarvan de bedoeling niet
 * vaststaat, en die stilzwijgend optellen is precies hoe een saldo gaat afwijken
 * van de werkelijkheid.
 *
 * NOOIT NEGATIEF. Een saldo onder nul zou betekenen dat een klant meer besteed
 * heeft dan hij had, en dat hoort bij het bestellen tegengehouden te zijn (zie
 * `spendOrder`). Komt het er toch, dan is nul het antwoord en staat de fout in de
 * regels — niet in een schuld die de klant niet kent.
 */
export function tegoedSaldo(regels = []) {
  let saldo = 0;
  for (const r of Array.isArray(regels) ? regels : []) {
    const soort = tegoedSoort(r?.soort);
    if (!soort) continue;
    const cents = Math.max(0, Math.round(Number(r?.cents) || 0));
    saldo += soort.teken * cents;
  }
  return Math.max(0, saldo);
}

/**
 * Wat een terugbetaling van `cents` als tegoed waard is.
 *
 * `cents` is het NETTOBEDRAG van de terugbetaling — zie regel 1 in de kop: er zit
 * geen btw in een tegoed, want die wordt pas bij besteding verschuldigd. De
 * aanroeper moet dus het netto teruggeven en niet het bruto; `refundToCredit()`
 * kan dat verschil niet zien en zou een bruto bedrag als netto tegoed uitgeven,
 * wat de klant 21% cadeau doet.
 */
export function refundToCredit(cents, bonus = TEGOED_BONUS) {
  const netto = Math.max(0, Math.round(Number(cents) || 0));
  if (!netto) return { cents: 0, bonusCents: 0, totaal: 0 };
  const factor = Math.max(0, Number(bonus) || 0);
  const bonusCents = Math.round(netto * factor);
  return { cents: netto, bonusCents, totaal: netto + bonusCents };
}

/**
 * Wat er terugkomt als een met tegoed betaalde bestelling wordt teruggedraaid.
 *
 * REGEL 2 UIT DE KOP, ALS FUNCTIE. Wat met tegoed betaald is, komt als tegoed
 * terug; wat met geld betaald is, komt als geld terug. De twee lopen niet in
 * elkaar over, en dat is wat dit tegoed een tegoed houdt in plaats van een
 * rekening waar je geld op kunt zetten en weer af kunt halen.
 */
export function refundOf({ metTegoedCents = 0, metGeldCents = 0 } = {}) {
  return {
    alsTegoed: Math.max(0, Math.round(Number(metTegoedCents) || 0)),
    alsGeld: Math.max(0, Math.round(Number(metGeldCents) || 0)),
  };
}

/**
 * Hoe een bestelling van `bedragCents` betaald wordt.
 *
 * ── DE VOLGORDE IS BUDGET, DAN TEGOED, DAN GELD ────────────────────────────
 *
 * Niet willekeurig, en niet in het voordeel van de studio: het maandbudget
 * VERLOOPT (één maand doorschuiven) en het tegoed niet. Wie het vergankelijke
 * eerst opmaakt, verliest niets — andersom wel. Dat is de volgorde die de klant
 * zelf zou kiezen als hij erover nadacht, en dus de volgorde die het formulier
 * zonder vragen mag aanhouden.
 *
 * Alle drie de bedragen zijn NETTO. De btw komt bovenop het deel dat met geld
 * betaald wordt én bovenop het deel dat met tegoed betaald wordt — zie regel 1:
 * bij besteding wordt de btw verschuldigd, en dan pas is bekend welk tarief.
 * quoteOrder() rekent hem daarom over het HELE nettobedrag en niet over de rest.
 */
export function spendOrder({ bedragCents, budgetCents = 0, tegoedCents = 0 } = {}) {
  const bedrag = Math.max(0, Math.round(Number(bedragCents) || 0));
  const budget = Math.max(0, Math.round(Number(budgetCents) || 0));
  const tegoed = Math.max(0, Math.round(Number(tegoedCents) || 0));

  const uitBudget = Math.min(bedrag, budget);
  const naBudget = bedrag - uitBudget;
  const uitTegoed = Math.min(naBudget, tegoed);
  const teBetalen = naBudget - uitTegoed;

  return {
    uitBudget,
    uitTegoed,
    teBetalen,
    /* Wat er ná deze bestelling overblijft. Het scherm heeft dit nodig en zou het
       anders zelf gaan aftrekken — twee plekken die hetzelfde uitrekenen is één
       te veel. */
    budgetRest: budget - uitBudget,
    tegoedRest: tegoed - uitTegoed,
    /* Of er nog een betaling nodig is. Een bestelling die volledig uit budget en
       tegoed komt, hoort GEEN betaallink te krijgen — dat is de tak in
       functions/api/order.js die hier zijn antwoord vandaan haalt. */
    betalingNodig: teBetalen > 0,
  };
}

/**
 * De openstaande verplichting: al het tegoed dat klanten nog hebben staan.
 *
 * REGEL 4 UIT DE KOP. Dit getal hoort in /admin te staan naast de omzet, niet
 * erin: het is geleverd geld waar nog werk tegenover moet. `saldi` is een lijst
 * van saldi per klant, want de optelsom hoort te gebeuren waar de regels staan.
 */
export function openstaandTegoed(saldi = []) {
  return (Array.isArray(saldi) ? saldi : [])
    .reduce((som, s) => som + Math.max(0, Math.round(Number(s) || 0)), 0);
}

/**
 * De vervalmaand van een tegoedregel uit maand `maand` ('YYYY-MM').
 * Leeg als tegoed niet verloopt.
 */
export function vervaltIn(maand) {
  if (!TEGOED_GELDIG_MAANDEN) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(String(maand || ''));
  if (!m) return '';
  const totaal = Number(m[1]) * 12 + (Number(m[2]) - 1) + TEGOED_GELDIG_MAANDEN;
  const jaar = Math.floor(totaal / 12);
  const maandNr = (totaal % 12) + 1;
  return `${String(jaar).padStart(4, '0')}-${String(maandNr).padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BOUWCONTROLES
 * ═══════════════════════════════════════════════════════════════════════════ */
function assertTegoed() {
  /* 1 · ELKE SOORT TELT ÉÉN KANT OP, en die kant is +1 of −1. Een soort met 0 zou
        een regel zijn die in het grootboek staat en niets doet. */
  for (const s of TEGOED_SOORTEN) {
    if (s.teken !== 1 && s.teken !== -1) {
      throw new Error(`tegoed.js: soort '${s.id}' heeft teken ${s.teken}; alleen +1 en -1 bestaan.`);
    }
  }

  /* 2 · NIETS IS UITBETAALBAAR. Regel 2 uit de kop, als controle en niet als
        belofte: zodra hier ooit een `uitbetaalbaar: true` binnensluipt, is dit
        product geen tegoed meer maar een rekening, en dat is een ander product met
        een ander toezicht. */
  for (const s of TEGOED_SOORTEN) {
    if (s.uitbetaalbaar) {
      throw new Error(`tegoed.js: soort '${s.id}' is uitbetaalbaar — tegoed is nooit in geld op te nemen.`);
    }
  }

  /* 3 · DE ID'S ZIJN UNIEK. Twee regels met dezelfde naam en een ander teken zou
        betekenen dat de eerste treffer bepaalt wat er gebeurt. */
  if (new Set(TEGOED_SOORT_IDS).size !== TEGOED_SOORTEN.length) {
    throw new Error('tegoed.js: er staan dubbele soort-ids in TEGOED_SOORTEN.');
  }

  /* 4 · DE BONUS IS EEN DEEL EN GEEN BEDRAG. Boven de 1 zou een terugbetaling
        meer dan verdubbelen; onder nul zou hij de klant bestraffen voor het
        kiezen van tegoed. */
  if (!(TEGOED_BONUS >= 0 && TEGOED_BONUS <= 1)) {
    throw new Error(`tegoed.js: TEGOED_BONUS moet tussen 0 en 1 liggen (${TEGOED_BONUS}).`);
  }

  /* 5 · TEGOED LEEFT LANGER DAN EEN MAANDBUDGET. Het budget schuift één maand
        door; dit is betaald geld en hoort dus ruimer te staan. Deze controle vangt
        de fout waarin iemand de twee termijnen gelijktrekt "voor de eenvoud" — en
        daarmee betaald geld laat verlopen met de regels van een toekenning. */
  if (TEGOED_GELDIG_MAANDEN !== 0 && TEGOED_GELDIG_MAANDEN < 12) {
    throw new Error(
      `tegoed.js: ${TEGOED_GELDIG_MAANDEN} maanden geldigheid is te kort voor geld dat de klant al betaald heeft.`);
  }

  /* 6 · DE VOLGORDE VAN BETALEN KLOPT, en dat is met een som te bewijzen: wat er
        uit budget, tegoed en portemonnee komt, is samen precies het bedrag. */
  const proef = spendOrder({ bedragCents: 10000, budgetCents: 3000, tegoedCents: 4000 });
  if (proef.uitBudget + proef.uitTegoed + proef.teBetalen !== 10000) {
    throw new Error('tegoed.js: spendOrder() verdeelt niet het hele bedrag.');
  }
  if (proef.uitBudget !== 3000 || proef.uitTegoed !== 4000 || proef.teBetalen !== 3000) {
    throw new Error('tegoed.js: spendOrder() houdt de volgorde budget → tegoed → geld niet aan.');
  }

  /* 7 · EEN CENT IS DE ONDERGRENS. Het saldo is in hele centen; een halve cent zou
        bij elke bestelling een afrondingsverschil opleveren dat niemand kan
        verklaren. */
  const halve = tegoedSaldo([{ soort: 'refund', cents: 0.5 }]);
  if (halve % CENT !== 0) {
    throw new Error('tegoed.js: het saldo is niet in hele centen.');
  }
}
assertTegoed();

/**
 * De teksten. Eén plek, twee talen, en de bedragen komen van de aanroeper — zoals
 * overal op deze site staat een euro nooit in een zin die hier is opgeschreven.
 */
export const TEGOED_COPY = {
  en: {
    naam: 'Credit',
    saldo: 'Your credit',
    leeg: 'No credit yet.',
    /* Regel 3 uit de kop, in de taal van het scherm: het is een KEUZE, en de
       andere kant staat er even groot bij. */
    keuzeH: 'Money back, or credit?',
    keuzeGeld: 'Refund to my account',
    keuzeTegoed: 'Take it as credit',
    keuzeBonus: 'Take it as credit — {bonus} extra',
    keuzeLine: 'Credit never expires into cash: you spend it on a next order, at the ordinary rates. A refund to your bank is always available instead.',
    besteed: 'Paid from your credit',
    rest: '{amount} left',
    vervalt: 'Valid until {month}',
    btw: 'Credit is held excluding VAT. VAT is added on the order you spend it on, at your own rate.',
  },
  nl: {
    naam: 'Tegoed',
    saldo: 'Je tegoed',
    leeg: 'Nog geen tegoed.',
    /* Zie de Engelse tegenhanger. */
    keuzeH: 'Geld terug, of tegoed?',
    keuzeGeld: 'Terug op mijn rekening',
    keuzeTegoed: 'Als tegoed',
    keuzeBonus: 'Als tegoed — {bonus} extra',
    keuzeLine: 'Tegoed is niet in geld op te nemen: je besteedt het aan een volgende bestelling, tegen de gewone tarieven. Terug op je rekening kan altijd in plaats daarvan.',
    besteed: 'Betaald uit je tegoed',
    rest: '{amount} over',
    vervalt: 'Geldig tot {month}',
    btw: 'Tegoed staat exclusief btw. De btw komt op de bestelling waaraan je het uitgeeft, tegen jouw eigen tarief.',
  },
};
