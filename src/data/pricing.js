// VISUAILS — the price ladder and the service-tier model, in one place.
//
// WHY THIS FILE EXISTS
// Prices used to live as literal strings in ~40 page files, twice over (EN with
// a decimal point, NL with a comma). That guarantees drift: the moment one page
// is updated and another is missed, the site quotes the same thing two ways and
// the cheaper quote is the one a prospect screenshots. Every euro figure on the
// site now comes from here. Nothing else may hardcode a price.
//
// The numbers below are stored ONCE, as numbers, and formatted per locale on
// the way out — so "€39.99" and "€39,99" cannot disagree about the amount.
//
// SECTION 13 OF THE BRIEF IS THE GOVERNING DOCUMENT FOR THE TIER MODEL.
// It is stored verbatim at /BRIEF-13-SERVICE-TIERS.md. Its central claim:
// the dividing line between tiers is not order size, it is whether a human
// commits to a deadline. Tier 0 is unattended and cheap and honest about the
// queue; Tier 1 is attended and buys a committed date. Read that file before
// changing anything here.

// ─────────────────────────────────────────────────────────────────────────────
// 1 · AMOUNTS — the only place a number is written down.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 0 · THE LADDER, THE PLANS, AND VAT — the model, August 2026.
//
// WHAT CHANGED AND WHY. Until now the offer was package-shaped: a Drop Pilot of
// exactly 8 products, a Full Drop of 25–30, and per-product rates for anything
// else. Lucas called it confusing, and so did people he showed it to, and the
// numbers agreed with them:
//
//   · "Drop" already means something in fashion — a collection going live. The
//     site used it for a work order of 25–30 products, so one word carried two
//     meanings in the same sentence.
//   · The buyer had to pick a SIZE and a SERVICE LEVEL at the same time. Two
//     independent axes stacked on one price list.
//   · And there was a hole between them. The Pilot stopped at 8, the Full Drop
//     started at 25, so a brand with 14 products paid à la carte —
//     14 × €219.98 = €3,079.72, twelve hundred euro MORE than a Full Drop of
//     thirty. /pricing admitted this in its own copy. A ladder whose best
//     advice is "pretend you have 25 products" is not a ladder.
//
// THE REPLACEMENT is two doors rather than three tiers, and it is the hybrid
// Lucas picked out of PRICING-MODEL-OPTIONS.md:
//
//   Front door — LADDER. One unit: a product. One rate, which falls as the
//   count rises. Every count has a price and the price only ever improves, so
//   the hole cannot come back. The falling rate is also the honest upsell: the
//   order form can say "two more products and every product drops a rung."
//
//   Back door — PLANS. A monthly amount for a monthly output. Every plan is
//   priced strictly below the ladder total for the same number of products
//   (asserted at the bottom of this file), so the upgrade prompt is arithmetic
//   rather than persuasion.
//
// The old drop constants below are DERIVED from this ladder now rather than
// typed, so the pages that have not been migrated yet keep printing numbers
// that are arithmetically true while they wait their turn.
// ─────────────────────────────────────────────────────────────────────────────

// Rungs are [minProducts, maxProducts | null, ratePerProduct]. `null` is the
// open top rung. Three kinds, and the ratio between them is deliberate: catalog
// -only is 60% of a complete product and lifestyle-only is 75%, so buying both
// separately costs about 135% of the bundle. That bundle saving is roughly the
// same at every rung, which is what makes it explainable in one sentence
// instead of a table of exceptions.
//
// "ROUGHLY", AND THE ONE PLACE IT IS DELIBERATELY OFF. Lucas, August 2026: "ik
// vind de 112 euro voor lifestyle een rare prijs, maak dit 109." He is right
// about what it was: 149 x 0.75 = 111.75, rounded to 112 — a number that is
// visibly the OUTPUT of a formula rather than a price somebody chose, on the
// entry rung, which is the one a first-time buyer reads. 109 is 73.2% of the
// complete rate rather than 75%, so the entry rung's bundle saving is 33% where
// the others are 35%. That difference is not published anywhere and costs the
// customer nothing — it makes the first rung slightly cheaper, never dearer.
//
// The ratio still generates the other rungs; it is a tool for deriving prices,
// not a law the prices must obey. Where a derived figure looks like arithmetic
// showing through, the chosen number wins. Every rung remains strictly falling,
// which is the property assertLadder() actually enforces.
//
// ─────────────────────────────────────────────────────────────────────────────
// DE ONDERSTE TREDE IS WEG — 12 AUGUSTUS 2026, EN DIT IS WAAROM
// ─────────────────────────────────────────────────────────────────────────────
//
// Hier stond een vijfde trede: `[35, null, 55]` voor complete, met €33 en €41
// ernaast. €55 was daarmee `ladderFloor('complete')`, en dat getal stond op de
// drie plekken die een prospect als eerste leest — de heroregel op de homepage
// in beide talen, de <meta description> van / en /nl (dus ook in het Google-
// resultaat), en de rij "35+" in de tarieftabel op /pricing.
//
// NIEMAND KON HET BESTELLEN. src/data/capacity.js:
//
//   PRODUCTS_PER_DAY = 18 · QUEUE_FLOOR_PER_DAY = 3 → ATTENDED_PER_DAY = 15
//   WINDOW_DAYS = 2                                 → ATTENDED_PER_WINDOW = 30
//
// en `windowsFor()` daar doet `if (products > ATTENDED_PER_WINDOW) return []`.
// Wie 35 producten invulde om die €55 te halen, kreeg geen enkele leverdatum
// aangeboden en kon dus niet afrekenen. Het eerste bedrag van dit merk was het
// enige bedrag dat onbereikbaar was.
//
// Dat is geen fout in één regel: het zijn twee kloppende bestanden met een
// verschillende aanname over hoeveel er in een venster past. Lucas heeft op
// 12 augustus 2026 gekozen welke van de twee wijkt — de trede, niet het
// plafond: *"Hero op €65, trede eruit"*. De reden om die kant te kiezen is dat
// de andere drie uitwegen (WINDOW_DAYS naar 3, PRODUCTS_PER_DAY naar 21, of
// grote orders over twee vensters verdelen) allemaal een belofte over zijn
// eigen agenda zijn, en deze niet. Deze is vandaag waar.
//
// De bodem is nu €65, bereikbaar vanaf 20 producten, en de bovenste trede
// staat open: `[20, null, 65]`. Alles wat het bedrag naar buiten brengt leest
// het hier — ladderFloor(), de tabellen op /pricing en de homepage, de
// meta-descriptions en faq.js (die ook de GRENS leest, niet alleen het
// tarief) — dus deze vier regels zijn de hele wijziging.
//
// WIL DE TREDE TERUG, dan hoort daar dezelfde dag een wijziging in capacity.js
// bij die 35 producten daadwerkelijk in een venster laat passen. Anders komt
// deze fout precies zo terug, en dan zonder deze noot.
export const LADDER = {
  // Catalog set AND lifestyle carousel — seven finished images per product.
  complete: [[1, 4, 149], [5, 9, 109], [10, 19, 85], [20, null, 65]],
  // Catalog set only — four images.
  catalog: [[1, 4, 89], [5, 9, 65], [10, 19, 51], [20, null, 39]],
  // Lifestyle carousel only — three images.
  lifestyle: [[1, 4, 109], [5, 9, 82], [10, 19, 64], [20, null, 49]],
};

/** The per-product rate for a kind at a given product count. */

import { planName } from './planNames.js';
export function ladderRate(kind, products = 1) {
  const rungs = LADDER[kind];
  if (!rungs) throw new Error(`pricing.js: unknown ladder kind "${kind}"`);
  const n = Math.max(1, Math.floor(Number(products) || 1));
  const rung = rungs.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  // Unreachable while the top rung is open-ended; thrown rather than defaulted
  // because a silent fallback here would quote the wrong price, not no price.
  if (!rung) throw new Error(`pricing.js: no ladder rung covers ${n} products`);
  return rung[2];
}

/** What `products` of `kind` cost in total, before VAT and before any discount. */
export function ladderTotal(kind, products) {
  const n = Math.max(0, Math.floor(Number(products) || 0));
  return n === 0 ? 0 : n * ladderRate(kind, n);
}

/** The lowest rate a kind ever reaches — what "from €x" means on a page. */
export function ladderFloor(kind) {
  const rungs = LADDER[kind];
  if (!rungs) throw new Error(`pricing.js: unknown ladder kind "${kind}"`);
  return rungs[rungs.length - 1][2];
}

// FIRST_ORDER_DISCOUNT WAS HERE — 20% off a first order, once per brand, and it
// is gone. Lucas: *"Verwijder hierna ook de 20% korting omdat we zelfverzekerd
// willen zijn over de prijzen die we hanteren, een sample van 0,99 cent is al
// redelijk genoeg denk ik."*
//
// TWEE DINGEN OVER DAT CITAAT, want het staat er letterlijk en dat blijft zo.
// "0,99 cent" betekent taalkundig minder dan één cent; bedoeld is € 0,99. Die
// verspreking staat in meerdere citaten in dit bestand en in account.js, en is
// daar bewust niet weggepoetst — citaten zijn de notulen van deze beslissingen.
// SCHRIJF HET NOOIT ZO IN KLANTTEKST: een studio die op consistentie verkoopt,
// kan geen prijs printen die zijn eigen eenheid tegenspreekt.
// En het bedrag zelf is inmiddels € 1 — zie AMOUNT.testSample hieronder.
//
// That is a pricing argument, not a copy tidy-up, and it is the right one. The
// discount was the third thing the ladder had already replaced: the Drop Pilot
// was a loss-leader wearing a package's clothes, the discount was the same
// loss-leader as a percentage, and the ladder itself is the volume answer.
// Quoting a rate and then knocking a fifth off it says the rate was never the
// price — which is exactly the doubt a studio selling on consistency cannot
// afford to plant.
//
// The test sample stays and now carries the whole of the "try before you
// commit" job on its own. AMOUNT.testSample.
//
// Deleted rather than set to zero. A constant of 0 leaves every sentence about
// it standing, and the next reader has to work out whether the feature is off
// or broken.

/** The monthly plans — the back door. Products per month, and what is included. */
export const PLAN_AMOUNT = { starter: 390, studio: 790, brand: 1690 };
export const PLAN_PRODUCTS = { starter: 5, studio: 12, brand: 30 };
/** Video clips included in a plan, per month. */
export const PLAN_CLIPS = { starter: 0, studio: 2, brand: 0 };
/* ── GEEN MINIMALE LOOPTIJD MEER — 18 augustus 2026 ────────────────────────
   PLAN_MIN_MONTHS stond hier op 3 en zes plekken in de copy zeiden "minimaal
   3 maanden". DE CODE HEEFT DAT NOOIT AFGEDWONGEN: handlePlanCancel() zegt
   direct op en Mollie schrijft daarna niets meer af, in maand 1 net zo goed
   als in maand 4. De site beloofde dus een binding die niet bestond, en dat
   is precies het soort beding waar je bij een geschil op vastloopt.

   Lucas' keuze bij het schrijven van de abonnementsvoorwaarden: de maandelijkse
   termijn IS maandelijks opzegbaar. Dat is wat de code al deed, het is de
   eenvoudigste belofte, en bij een dienst zonder recensies is een lage drempel
   om te beginnen meer waard dan een gebonden klant die weg wil.

   DE JAARTERMIJN BLIJFT VAST. Die is het wél: `TERMS.yearly.fixed === true` en
   de subscription bij Mollie krijgt `times: 12`, dus hij stopt zichzelf na
   twaalf termijnen. Dat onderscheid is nu het enige dat de twee termijnen op
   dit punt scheidt, en het staat in plans.js waar het hoort.

   PLAN_ROLLOVER_MONTHS blijft; doorschuiven is een echt kenmerk en de waarde
   wordt door plans.js per termijn overschreven (1 maandelijks, 3 jaarlijks).

   EN HET GETAL 3 BLIJFT OOK, MAAR NIET ALS BELOFTE. TERMS.monthly.months
   gebruikt het om te vergelijken: termTotalCents() rekent er "wat drie maanden
   kost" mee uit en assertPlans() controleert dat de jaartermijn langer is dan
   de maandtermijn. Dat is een REKENVENSTER en geen verplichting, en het heet
   daarom nu ook zo. Een constante die PLAN_MIN_MONTHS heet, komt vroeg of laat
   weer als "minimaal" in een zin terecht. */
/* ── HET MACHTIGINGSBEDRAG — 23 augustus 2026 ──────────────────────────────
 *
 * Stond als `const MANDATE_EUROS = 1` in src/lib/subscribe.js en zes keer als
 * "€1" in de copy van PlanPicker en PlansPage. Dat is precies wat de kop van dit
 * bestand verbiedt: *"Every euro figure on the site now comes from here. Nothing
 * else may hardcode a price."*
 *
 * EEN EIGEN CONSTANTE EN NIET AMOUNT.testSample, ook al zijn ze allebei één euro.
 * Het zijn twee verschillende dingen die toevallig hetzelfde kosten: de proefvisual
 * is een PRODUCT dat je koopt, en dit is de TRANSACTIE waarmee je bank een
 * SEPA-machtiging afgeeft. Ze samenvoegen betekent dat de proefvisual op €2 zetten
 * stilzwijgend ook de machtiging verandert — en de machtiging is bewust het
 * kleinst mogelijke bedrag, want hij wordt niet verrekend maar is puur de prikkel
 * die de bank nodig heeft.
 */
export const MANDATE_AMOUNT = 1;

export const PLAN_ROLLOVER_MONTHS = 1;
export const PLAN_COMPARE_MONTHS = 3;

/* ── DE BEELDBANK BIJ EEN ABONNEMENT — 20 augustus 2026 ────────────────────
 *
 * Lucas, over wat een abonnement straks naast de bestellingen geeft:
 *
 *   · elke maand STOCK_OFF_BRAND nieuwe beelden die bij elk merk passen,
 *     inbegrepen bij elk abonnement;
 *   · en met Editions erbij STOCK_ON_BRAND beelden per maand die op JOUW merk
 *     zijn opgezet — stijl, locaties en merkkleuren. Daar zit GEEN product van
 *     de klant in: ze zijn er om het merk gevoel te geven, niet om iets te
 *     verkopen. On-brand moet per merk worden opgezet en is dus een aparte
 *     stap, geen schakelaar.
 *
 * ── WAT ER MET OPZET NIET IN ZIT: GEZICHTEN ───────────────────────────────
 * Hier stond "jouw gezichten" bij, en dat is er op 20 augustus 2026 uitgehaald.
 * Lucas: het kiezen van modellen per set maakt het controlewerk zo groot dat de
 * prijs fors omhoog zou moeten, en juist die prijs wil hij laag houden.
 *
 * Het staat NERGENS als uitsluiting op de site, en dat is een keuze. "Zonder
 * modellen" maakt van een afwezigheid een beperking: wie er niet aan dacht,
 * denkt er daarna wel aan. De copy noemt alleen wat er wél in zit, en belooft
 * daarmee ook nergens iets dat niet geleverd wordt. Het merkmodel blijft een
 * eigen product met een eigen prijs.
 *
 * WAT DIT ZOU TERUGDRAAIEN: als het opzetten van een gezicht per merk ooit één
 * handeling wordt in plaats van een controleronde per set, hoort het hier
 * gewoon bij te komen — en dan als vierde in de opsomming hierboven.
 *
 * Ze staan hier en niet in een zin op de homepage om dezelfde reden als elk
 * ander getal op deze site: een aantal dat in copy staat, verandert op één
 * plek en blijft op vier andere staan. Editions is nog niet leverbaar — zie
 * svcSoonList in HomeV2.astro — dus elke zin die deze getallen gebruikt moet
 * dat er zelf bij zeggen.
 */
/* ── WAAROM 20 EN NIET 100 — 20 augustus 2026 ──────────────────────────────
 * Hier stond 100 off-brand en 40 on-brand. Lucas: *"100 is teveel en klinkt dan
 * goedkoop."* Dat is een prijsargument en geen voorraadargument, en het klopt:
 * een aantal dat hoog genoeg is om onmogelijk stuk voor stuk gemaakt te zijn,
 * leest als een bak in plaats van als werk. Honderd beelden per maand zegt
 * "gegenereerd"; twintig zegt "gemaakt". Voor een abonnement dat naast een
 * fotostudio staat is dat het verschil tussen een extraatje en een bijvangst.
 *
 * Twintig is ook het aantal dat een merk in een maand kán plaatsen zonder dat
 * het opvalt dat het steeds hetzelfde bureau is: bij dagelijks posten is dat
 * tweederde van de kalender, en de rest zijn de eigen bestellingen. Meer dan
 * dat is voorraad die niemand gebruikt, en ongebruikte voorraad is precies wat
 * een aanbod goedkoop laat lijken.
 *
 * Off-brand en on-brand staan nu op HETZELFDE getal, met opzet. Het verschil
 * tussen de twee moet in het merk zitten en niet in de hoeveelheid: twintig
 * beelden die bij elk merk passen tegenover twintig die op jóuw stijl, jouw
 * locaties en jouw merkkleuren zijn opgezet. Zet je daar ook nog een verschil
 * in aantal naast, dan gaat het gesprek over hoeveel in plaats van over welke. */
export const STOCK_OFF_BRAND = 20;
export const STOCK_ON_BRAND = 20;

// WHICH ORDERS GET THE RESERVED WINDOW.
//
// The package model asked the buyer two questions at once: how big is your
// order, and do you want a committed date. Two axes, one price list. Under the
// ladder the service level FOLLOWS the size instead of being a second choice —
// from this many products up, the order is put in the capacity calendar and
// gets the reserved 48-hour window; below it, it runs in the standard queue at
// 2–4 working days. Ten because that is where the ladder's third rung starts,
// so the buyer crosses one line, not two.
export const WINDOW_THRESHOLD = 10;
/* ── DE ALIAS IS WEG, EN DE REDEN ERVOOR KLOPTE NIET — 23 augustus 2026 ─────
   Hier stond `const WINDOW_THRESHOLD_LABEL = 10` met als motivering dat de
   labels in TIERS sjabloonstrings zijn die bij het laden van de module worden
   uitgerekend, "voordat de export hierboven vanuit hun gezichtspunt in beeld
   is". Dat is de tijdelijke-dode-zone-regel, en die geldt hier niet: TIERS
   staat op regel 920 en deze export op 281. Er was geen TDZ, alleen een tweede
   getal dat bij een wijziging kon achterblijven — in hetzelfde bestand nog wel,
   wat het juist makkelijker maakt om over het hoofd te zien.

   Beide labels lezen nu de export zelf. Als TIERS ooit boven deze regel
   terechtkomt valt de module bij het laden om met een ReferenceError, en dat is
   precies de goede faalrichting: luid, meteen, en in elke test. */

/** 'attended' | 'unattended' — which tier's promises an order of this size gets. */
export function tierFor(products, service) {
  /*
   * ── DE DIENST DOET MEE, SINDS 12 AUGUSTUS 2026 ─────────────────────────────
   *
   * Hier stond alleen het aantal, en dat leverde een fout op die je pas ziet in de
   * mailbox van de klant. Het aanvraagformulier voor video (HoldingPage.astro) post
   * zijn aantal clips in het veld `products`, met 10 en 12 in de keuzelijst. Tien
   * clips gaven dus `attended`, en dan belooft de bevestigingsmail *"levering binnen
   * 48 uur vanaf je leverdatum, vastgezet voordat je betaalt"* — voor een dienst die
   * met de hand wordt ingepland en waar geen bestelstroom en geen capaciteitspoort
   * voor bestaat.
   *
   * De agenda zelf bleef schoon (`window_start` blijft NULL, en elke query filtert op
   * `tier='attended' AND window_start IS NOT NULL`), dus dit was geen dubbele
   * boeking. Het was iets vervelenders: een belofte die niemand had ingepland, plus
   * een oranje alarm in de studiomail bij elke video-aanvraag van tien clips of meer.
   *
   * ALLEEN EEN DIENST DIE OP DE LADDER STAAT KAN EEN VENSTER KRIJGEN, en dat is
   * precies de verzameling die `LADDER` al definieert. Zo is er één bron: komt er ooit
   * een vierde ladderdienst bij, dan doet die automatisch mee; blijft video een
   * aanvraag, dan blijft die er automatisch buiten.
   *
   * `service` mag ontbreken. Dan valt hij terug op alleen het aantal, want dat is wat
   * elke bestaande aanroeper deed en die mogen niet stil van gedrag veranderen.
   */
  if (service !== undefined && service !== null && !isLadderService(service)) return 'unattended';
  return (Math.floor(Number(products) || 0) >= WINDOW_THRESHOLD) ? 'attended' : 'unattended';
}

/**
 * Staat deze dienst op de prijsladder, en kan hij dus een gereserveerd venster
 * krijgen? Neemt de wire-waarde ('drop') net zo goed als de laddernaam ('complete').
 */
export function isLadderService(service) {
  const naam = String(service || '').trim();
  const key = naam === 'drop' ? 'complete' : naam;
  return Object.prototype.hasOwnProperty.call(LADDER, key);
}

// ── WIE MAG BEOORDELEN ───────────────────────────────────────────────────────
//
// WAT HIER OP 7 AUGUSTUS 2026 IS VERANDERD, EN WAAROM HET HIER STAAT.
//
// Goedkeuren en "er klopt iets niet" zaten achter tier 1. Lucas bestelde één
// product om het scherm te bekijken, kreeg alleen een downloadknop te zien, en
// meldde het als kapotte knoppen. Dat was het niet — het was de regel, en dat
// is erger: een regel die je alleen kunt ontdekken door hem te missen.
//
// Lucas: *"voor iedere bestelling behalve 0,99 cent sample."* Dus:
//
//   elke betaalde bestelling  → per beeld goedkeuren of aanmerken
//   de proefvisual van € 1 → niet
//
// WAAROM DE PROEFVISUAL DE UITZONDERING IS, en waarom dat geen zuinigheid is.
// Dat ding is één beeld voor negenennegentig cent, bedoeld om te laten zien wat
// we maken. Er is geen productie omheen die bijgestuurd kan worden en geen
// tweede ronde die ergens uit betaald wordt. Een revisieknop eronder zou een
// belofte doen die niet waar te maken is op dat bedrag — en dat is precies de
// soort belofte die je later moet terugnemen.
//
// DIT STAAT IN pricing.js EN NIET TWEE KEER IN src/lib/. Het stónd twee keer:
// account.js en portal.js hadden allebei hun eigen canReview(), met een
// commentaar erbij dat de duplicatie verdedigde ("not enough shared logic to
// justify a cross-file dependency"). Dat argument klopte tot het moment dat de
// regel veranderde — toen waren het twee plekken die uit elkaar konden lopen,
// en één ervan zou het geworden zijn. Het is één product-regel; hij hoort bij
// de rest van het productmodel.
export const SAMPLE_SERVICE = 'test-sample';

/**
 * Mag er op de beelden van deze bestelling nog een besluit genomen worden?
 *
 * @param {{service?: string, closed_at?: string|null}} order  Een orderrij, of
 *   genoeg ervan. Beide velden mogen ontbreken; dan is het antwoord ja, want
 *   een onbekende dienst is geen proefvisual.
 */
export function canReviewOrder(order) {
  if (!order) return false;
  if (order.service === SAMPLE_SERVICE) return false;
  return !order.closed_at;
}

/* ══════════════════════════════════════════════════════════════════════════════
 * DE ENE REVISIERONDE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `AFTERCARE` hierboven belooft *"1 revision round included per order"*. Deze
 * functie is die belofte als code, en hij staat hier om dezelfde reden als
 * canReviewOrder() erboven: het is een PRODUCTREGEL en niet een schermdetail.
 * Drie plekken stellen dezelfde vraag — het klantportaal uit de mail
 * (portal.js), het ingelogde dashboard (account.js) en het beheerscherm
 * (admin.js) — en de vorige keer dat zo'n regel op drie plekken stond, liepen
 * er twee uit elkaar.
 *
 * ── VIER REDENEN OM NEE TE ZEGGEN, EN ZE BETEKENEN NIET HETZELFDE ──────────
 *
 * Vandaar een toestand en niet een boolean. Het scherm moet ze uit elkaar
 * kunnen houden, want wat de klant te zien krijgt verschilt per geval:
 *
 *   'beschikbaar'  → de knop staat er.
 *   'gebruikt'     → de ronde is ingediend. De knop is weg en er staat een
 *                    WhatsApp-link voor in de plaats: het gesprek gaat door,
 *                    alleen niet meer via een formulier. Dit is de enige
 *                    toestand die de klant zelf veroorzaakt.
 *   'ingetrokken'  → de studio heeft het recht ingetrokken voor deze KLANT
 *                    (customers.revisions_revoked_at, migratie 0010). Een
 *                    andere zaak dan 'gebruikt' en met een andere uitleg: hier
 *                    is geen ronde opgebruikt, hier is er een afgenomen.
 *   'gesloten'     → de bestelling is afgerond. Er valt niets meer te herzien
 *                    omdat er niets meer open staat.
 *   'nvt'          → de proefvisual. Zie de lange noot bij canReviewOrder():
 *                    één beeld voor negenennegentig cent draagt geen ronde.
 *
 * ── DE VOLGORDE IS DE VOLGORDE VAN DE UITLEG ───────────────────────────────
 *
 * Een afgesloten bestelling waarvan de ronde ook gebruikt is, meldt 'gebruikt'
 * en niet 'gesloten'. Dat is met opzet: de klant heeft zijn ronde gehad, en dat
 * is het antwoord op de vraag die hij stelt. "Deze bestelling is afgerond" leest
 * als een deur die je zelf niet dicht hebt gedaan.
 */
export const REVISION_ROUND_STATES = ['beschikbaar', 'gebruikt', 'ingetrokken', 'gesloten', 'nvt'];

/**
 * In welke toestand verkeert de ene revisieronde van deze bestelling?
 *
 * @param {{service?: string, closed_at?: string|null,
 *          revision_round_at?: string|null,
 *          revisions_revoked_at?: string|null}} order
 *   Een orderrij, of genoeg ervan. `revisions_revoked_at` hangt aan de KLANT en
 *   niet aan de bestelling; portal.js en account.js halen hem met een subquery
 *   op de order binnen, precies zoals ze dat voor de bestaande controle al doen.
 * @returns {'beschikbaar'|'gebruikt'|'ingetrokken'|'gesloten'|'nvt'}
 */
export function revisionRoundState(order) {
  if (!order) return 'nvt';
  if (order.service === SAMPLE_SERVICE) return 'nvt';
  if (order.revision_round_at) return 'gebruikt';
  if (order.revisions_revoked_at) return 'ingetrokken';
  if (order.closed_at) return 'gesloten';
  return 'beschikbaar';
}

/**
 * Mag deze bestelling nu een revisieronde indienen?
 *
 * Eén regel, en met opzet afgeleid van revisionRoundState() in plaats van de
 * vier controles nog een keer op te schrijven. Zo kan het antwoord op "mag het"
 * niet uit de pas lopen met het antwoord op "waarom niet", en dat is precies het
 * paar dat in een scherm naast elkaar staat.
 */
export const canRequestRevisionRound = (order) => revisionRoundState(order) === 'beschikbaar';

/**
 * Mag getóónd worden wat er eerder besloten is — "goedgekeurd op 12 juli", de
 * notitie onder een aangemerkt beeld?
 *
 * Twee functies en niet één, omdat een afgesloten bestelling de eerste uitzet
 * en de tweede aan laat: de klant is klaar met beslissen, maar wat hij besloot
 * ís het verslag van de opdracht. Alleen de proefvisual zet allebei uit — daar
 * kán niets besloten zijn, dus "goedgekeurd" zou een besluit beschrijven dat
 * nooit gevraagd is.
 */
export function canSeeReviewHistory(order) {
  return !!order && order.service !== SAMPLE_SERVICE;
}

// ── VAT ──────────────────────────────────────────────────────────────────────
// Dutch VAT, and the interim model Lucas chose (Aug 2026): charge 21% to
// everyone at checkout and correct EU B2B reverse charge afterwards on the
// invoice. BRIEF-14-VAT-BTW.md specifies live VIES validation instead; that is
// deliberately NOT what this implements, and the trade is stated here so the
// next reader does not think it was forgotten. Over-collecting VAT is never a
// penalty; under-collecting is. VIES goes down, has per-member-state quirks,
// and would be half the build.
//
// Every figure in this file is NET. Nothing anywhere should print a price
// without saying which of the two it is — that is BRIEF-14's hardest rule and
// the reason vatLabel() exists rather than a string typed per page.
export const VAT_RATE = 0.21;
export const vatOf = (net) => Math.round(net * VAT_RATE * 100) / 100;
export const withVat = (net) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

/* ── HET PERCENTAGE ALS TEKST, AFGELEID EN NIET GETYPT — 23 augustus 2026 ───
 *
 * "21%" stond op acht plekken als losse tekst: in vatLabel(), in vatDetail(),
 * nog een keer in src/data/vat.js, in twee redenen die op het beheerscherm
 * komen, en in twee mailregels in functions/api/order.js. Geen van die acht
 * keek naar VAT_RATE. Het tarief hierboven op 0.19 zetten zou dus een site
 * opleveren die overal "21%" blijft zeggen terwijl de kassa 19 rekent — en dat
 * is precies de soort fout waar niemand een klacht over indient tot de
 * boekhouder belt.
 *
 * Eén functie, en elke zin die het percentage noemt haalt het hier op.
 *
 * `Math.round(VAT_RATE * 100)` en geen decimalen: elk EU-tarief dat wij ooit
 * zullen rekenen is een heel getal, en "21,00%" leest als een berekening in
 * plaats van als een tarief. Komt er ooit een tarief met een halve procent,
 * dan is dat één regel hier en niet acht plekken opnieuw zoeken. */
export const vatPercent = () => `${Math.round(VAT_RATE * 100)}%`;

// PAGES PRINT NET ONLY. There was a gross figure beside every net one until
// Lucas pointed out the flaw: VAT is not one rate. A French or German buyer is
// charged their own country's rate, so "€1,190 excl. VAT — €1,439.90 incl.
// VAT" is a number that is only true for a Dutch reader, printed to everyone.
// A wrong price shown confidently is worse than no price shown at all.
//
// So `withVat()` and `vatOf()` stay — the checkout still has to compute a real
// amount, and that computation is server-side where the country is known — but
// nothing rendered to a visitor may use them. Every price carries
// vatLabel('excl') and the page states vatNote() once.
/**
 * How VAT is handled, said once per page rather than per price.
 *
 * ── TWEE KEER GECORRIGEERD, EN DE TWEEDE KEER IS DE INTERESSANTE ─────────────
 *
 * Augustus 2026, toen catalog en lifestyle betaalbaar werden: hier stond dat je
 * het tarief van je eigen land betaalde. Dat beschreef het model uit
 * BRIEF-14-VAT-BTW.md, waarvoor een tabel per land én een live VIES-controle
 * nodig is, en geen van beide bestond. De zin ging toen mee met het gedrag in
 * plaats van andersom, want een belofte over de prijs die pas bij het afrekenen
 * blijkt niet te kloppen, is de duurste plek om ontdekt te worden.
 *
 * 9 AUGUSTUS 2026 — dezelfde fout, de andere kant op. De zin bleef staan nadat
 * migratie 0015 er wél een echte verlegging van maakte: sindsdien controleert het
 * bestelformulier het btw-nummer bij VIES en rekent een bevestigd EU-bedrijf
 * buiten Nederland 0% AF BIJ HET AFREKENEN. De belofte "dan wordt de verlegging
 * op je factuur rechtgezet" kondigde dus een correctie aan die al was doorgevoerd
 * en daarom nooit meer zou komen — en klanten buiten de EU stonden er niet in,
 * terwijl die 0% betalen op een heel andere grond.
 *
 * De zin beschrijft nu de drie uitkomsten die vatDecision() echt kan geven. Bij
 * een verandering daar verandert deze regel mee; dat is één plek, en dat is de
 * reden dat deze functie bestaat in plaats van een string per pagina.
 */
/* ── DE BTW-REGEL IN TWEEËN — 21 augustus 2026 ──────────────────────────────
 *
 * Lucas wees deze alinea aan als voorbeeld van te veel tekst: vierenveertig
 * woorden, open, op acht pagina's. Wat er WETTELIJK moet staan is dat de
 * bedragen exclusief btw zijn — dat is `vatLead()` en dat blijft altijd zichtbaar.
 * De rest is een uitleg voor de lezer die zich afvraagt wat er bij hém gebeurt,
 * en die hoort in een zwevende notitie: hij verandert dan niets aan de hoogte van
 * de pagina en staat er wel als je hem nodig hebt.
 *
 * vatNote() blijft bestaan en is nog steeds de twee helften achter elkaar, voor
 * de plekken waar geen notitie past — een e-mail bijvoorbeeld, waar hover niet
 * bestaat. */
export function vatLead(lang = 'en') {
  return lang === 'nl' ? 'Alle bedragen zijn excl. btw.' : 'All figures are excl. VAT.';
}

/** De uitleg achter vatLead(): wat er per land gebeurt. */
export function vatDetail(lang = 'en') {
  return lang === 'nl'
    ? `Nederlandse klanten betalen ${vatPercent()} btw bij het afrekenen. EU-bedrijven buiten Nederland voeren hun btw-nummer in: na VIES-verificatie geldt 0% btw (btw verlegd). Bestellingen van buiten de EU zijn vrijgesteld van EU-btw.`
    : `We charge ${vatPercent()} VAT for orders within the Netherlands. If you’re an EU business based elsewhere, enter a valid VIES VAT number to receive 0% reverse-charged VAT. Non-EU customers won’t be charged EU VAT.`;
}

export function vatNote(lang = 'en') {
  // Uit de twee helften opgebouwd en niet nog eens uitgetypt: twee kopieën van
  // dezelfde btw-zin lopen uit elkaar, en dan staat er ergens iets onwaars over
  // belasting.
  return `${vatLead(lang)} ${vatDetail(lang)}`;
}

/** "excl. VAT" / "incl. VAT", in the reader's language. Never typed on a page. */
export function vatLabel(kind = 'excl', lang = 'en') {
  const nl = lang === 'nl';
  if (kind === 'incl') return nl ? 'incl. btw' : 'incl. VAT';
  if (kind === 'rate') return nl ? `${vatPercent()} btw` : `${vatPercent()} VAT`;
  return nl ? 'excl. btw' : 'excl. VAT';
}

export const AMOUNT = {
  // Tier 0 · unattended, per product.
  //
  // RAISED BACK, DELIBERATELY, AND THIS TIME THE REASON IS ON RECORD. Section
  // 13 fixed these low — €39.99 / €59.99 — specifically so Tier 0 stayed an
  // accessible entry point for small brands ("Small brands are NOT being
  // priced out"), and the comment that used to sit here told a future editor
  // not to re-raise them without re-reading that reasoning. This IS that
  // re-read: Lucas asked explicitly (2026-07-27) to raise the à la carte
  // prices so the drop packages read as the obviously better deal, accepting
  // that this trades away some of Tier 0's small-brand accessibility in
  // exchange for a clearer nudge toward Tier 1. Catalog and lifestyle are the
  // two DROP_INCLUDES prices — the ones that compound into TIER0_PRODUCT below
  // and therefore into every "is the drop cheaper yet" comparison — so those
  // are the two that moved. Video did not: it is priced identically inside or
  // outside a drop by design (see its own comment), so raising it would not
  // make the drop look any more attractive relative to buying à la carte, it
  // would just cost every client more everywhere. If that should change too,
  // it is a separate decision — say so and it moves on its own line.
  // ── WAAROM € 1 EN NIET € 0,99 ───────────────────────────────────────────────
  //
  // Lucas, 8 augustus 2026, na de vraag of 0,99 psychologisch beter zat.
  //
  // 1. HET 9-EINDE DOET HIER WÉL IETS, EN DAT IS NIET GENOEG. Eerlijk over de
  //    mechanica: quoteTestSample() in src/lib/quote.js rekent dit bedrag plat
  //    af (vatCents: 0), dus de klant betaalt vandaag exact € 0,99 of exact
  //    € 1,00. Het linkercijfer verschilt dan in zijn sterkste vorm — "centen"
  //    tegenover "een euro" — dus het charme-effect is hier echt aanwezig. Het
  //    weegt alleen niet op tegen (2) en (3). En het is niet houdbaar: zodra de
  //    btw-vraag op WERKLIJST.md wordt beslecht en er 21% op komt, wordt € 0,99
  //    → € 1,20 en € 1 → € 1,21, en is het effect alsnog weg. € 1 is de keuze
  //    die die correctie overleeft; € 0,99 is de keuze die erdoor ongedaan wordt.
  //
  // 2. HET BOTST MET DE REDEN DAT FIRST_ORDER_DISCOUNT WEG IS. Zie het blok
  //    daarover hierboven: een tarief noemen en er dan een vijfde af halen zegt
  //    dat het tarief nooit de prijs was. Een 9-einde is diezelfde onzekerheid
  //    in een ander font — een getal gekozen om kleiner te lijken. Een rond
  //    getal leest als gekozen. Dit is het eerste bedrag dat een prospect ziet.
  //
  // 3. DE DREMPEL IS NIET HET GELD, EN DAT MAAKT (1) KLEIN. Wie een proefvisual
  //    aanvraagt moet een productfoto uploaden, kiezen wat hij wil en zijn
  //    gegevens geven. Dáár haakt iemand af, niet op een cent. Niemand ziet af
  //    van € 1 die bij € 0,99 wel had besteld. Er gaat bovendien een volledig
  //    product door dezelfde productie en Mollie houdt ~€ 0,29 per transactie
  //    in: dit is geen omzet maar een poort. € 1 zegt "symbolisch", € 0,99 zegt
  //    "hierover is gerekend" — en dat is bij dit bedrag niet geloofwaardig.
  //
  // ⚠ OPEN PUNT DAT HIERONDER LANGSKOMT. De site labelt dit bedrag "excl. btw"
  // (PricingPage.astro, faq.js), maar quoteTestSample() rekent het plat af met
  // vatCents: 0 en noemt het in zijn eigen comment btw-INCLUSIEF. Die twee
  // kunnen niet samen waar zijn, en WERKLIJST.md heeft de vraag al open staan:
  // een echte visual die de klant krijgt is een levering tegen vergoeding, dus
  // hoort er btw op. Ook BRIEF-14 vraagt Tier 0 juist INCLUSIEF te tonen, want
  // consumenten kunnen hier bij. Dat is een fiscale beslissing, geen opruimklus
  // — niet stilletjes één kant op fixen.
  //
  // NIET AANPASSEN NAAR EEN 9-EINDE zonder die punten te weerleggen. En let
  // op euro(): een heel bedrag print zonder decimalen, dus dit wordt "€ 1" en
  // niet "€ 1,00" — bedoeld, zie de functie.
  testSample: 1,
  // THE ENTRY RUNG, not a flat rate any more. A page that prints one number for
  // "a catalog set" is now printing what ONE costs; the rate falls from here as
  // the count rises (LADDER above). Pages that can show the whole ladder should
  // — ladderRate() / ladderTotal() / ladderFloor() are for exactly that — and
  // any page still printing a single figure should say "from".
  catalog: LADDER.catalog[0][2],       // €89 at 1–4 products, €33 at 35+
  lifestyle: LADDER.lifestyle[0][2],   // €109 at 1–4 products, €41 at 35+
  complete: LADDER.complete[0][2],     // €149 at 1–4 products, €55 at 35+
  // RAISED, TASK #271f, 2026-07-30. Was €49, "left alone" by the comment
  // above — that held until Lucas asked for the opposite: video must rise
  // above €49 regardless of the Single Product/Full outfit feature this task
  // also adds ("video moet sowieso duurder worden dan €49"), and the exact
  // figure was explicitly delegated to me ("bedenk een passende prijs"). €69
  // is that decision, stated here so Lucas can correct it if it’s wrong: a
  // clean round number, a ~41% rise, and it keeps the ladder's existing order
  // — video cheapest, then catalog, then lifestyle — so it doesn’t disturb the
  // "is the drop the better deal" comparison the block above is protecting.
  // Still priced identically inside or outside a drop, on purpose — see
  // PACKAGES below, which quotes this same AMOUNT.video for a drop's add-on.
  // check_report14.py freezes the OLD figure ('49') against
  // REPORT-SECTION-14-VAT.md's own frozen arithmetic, the same treatment
  // CATALOG_AT_WRITING / LIFESTYLE_AT_WRITING already get in that checker —
  // updated alongside this change.
  video: 69,

  // The three package amounts that used to sit here — dropPilot, fullDrop and
  // retainer — are gone. They were kept as ladder-derived values through the
  // migration so unmigrated pages kept printing arithmetically true numbers;
  // every one of those pages has since moved, and the last two consumers
  // (functions/admin/debug-mollie.js, src/data/capacity.js) now read the
  // ladder and WINDOW_THRESHOLD directly.
  /* ── € 450, ÉÉN KEER — 23 AUGUSTUS 2026 ────────────────────────────────
   *
   * Was € 1.250 met een credit van € 250 die over vijf bestellingen terugkwam.
   * Lucas, 23 augustus: *"ik wil brand model gewoon 1 bedrag en 1 product maken.
   * Simpel."* En daarna, over het bedrag: *"ik wil dat bedrag verlagen."*
   *
   * DE VERHOUDING WAS HET PROBLEEM EN NIET HET GETAL. Een gewone bestelling hier
   * is € 510 (tien catalogproducten) tot € 850 (tien complete). Op € 1.250 kostte
   * de toevoeging tweeënhalf keer de bestelling waar hij bij hoorde, en dan is het
   * geen bijbestelling meer maar een tweede, groter besluit — en een tweede
   * besluit aan het begin van een relatie wordt uitgesteld.
   *
   * DE CREDIT IS WEG, en dat is de andere helft van "één bedrag". Hij deed iets
   * dat niet te controleren viel: het merkmodel was feitelijk gratis voor wie vijf
   * keer bestelde en € 1.250 voor wie drie keer bestelde, en welke van de twee je
   * was, wist niemand tot achteraf. Zie MERKMODEL-ONTWERP.md voor de volledige
   * afweging, inclusief wat die credit als terugkeerreden waard was.
   */
  brandModel: 450, // eenmalig, en dat is alles
  retainer: PLAN_AMOUNT.brand,  // the top monthly plan

  // The anchor VISUAILS is measured against.
  shootDayLow: 2500,
  shootDayHigh: 8000,
};

// Drop Pilot is a fixed count, not a range.


// Full Drop product band.
//
// DEVIATION FROM THE BRIEF, DELIBERATE AND FLAGGED (brief section 12 requires
// flagging rather than silently working around it):
// The brief specifies 20–30 products for the Full Drop. At 20 products €1,850
// is €92.50 per product, which is MORE per product than the Drop Pilot's
// €81.25 — volume would punish volume, and a prospect who divides finds it.
// €1,850 / €81.25 = 22.8, so any floor of 23 or higher clears it. The floor is
// set to 25 because section 13's own upgrade-path copy uses 25 as the Full
// Drop's product count ("A Full Drop covers 25 for less"). At 25 the ladder is
// strictly monotonic — see LADDER below, which asserts this at build time.



// A drop product includes the catalog set AND the lifestyle carousel. This is
// the resolution to flag 1 in AUDIT-TASK-0.md §H: without it, a drop is simply
// a more expensive way to buy the same catalog sets that sit in the Tier 0
// block on the same page. Video is NOT included — it is an add-on at the same
// rate inside or outside a drop, which is what makes that rate quotable.


// ─────────────────────────────────────────────────────────────────────────────
// 1b · FULL OUTFIT — task #271f, 2026-07-30.
//
// Lucas: "Ik moet voor alle services een optie hebben: Single Product/Full
// outfit" — a shot can show one product, or several products styled together
// on the same model (e.g. trousers and a t-shirt worn together), and the
// second is real extra work for him, so it has to cost more than the first.
//
// THREE STRUCTURAL DECISIONS, ALL LUCAS'S OWN, FROM TWO ROUNDS OF QUESTIONS:
//   1. Applies to BOTH tiers — Tier 0 (per product) and Tier 1 (drops) — not
//      just one. "Beide."
//   2. Priced as a FLAT SURCHARGE PER SHOT, not a percentage of the order and
//      not a separate line item with its own base price. "Vaste toeslag per
//      shot."
//   3. Capped at 3 products per order. "Max 3 producten." Past that point it
//      is no longer "a couple of pieces styled together" and belongs in a
//      conversation, the same reasoning FULL_DROP_MIN/MAX already applies to
//      "more than a form can hold."
//
// €50 is Lucas's own figure too (confirmed against catalog €139.99 = 89.99 +
// 50, and lifestyle €179.99 = 129.99 + 50). Applied the same way to video —
// video's outfit price is AMOUNT.video + OUTFIT_SURCHARGE, following the same
// "priced the same as every other style" rule the AMOUNT.video comment above
// states for the base rate.
export const OUTFIT_SURCHARGE = 50;
export const MAX_OUTFIT_PRODUCTS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// 1c · EXTRA PHOTOS PER PRODUCT — August 2026.
//
// Lucas: "de mogelijkheid tot extra fotos voor hetzelfde product. Klanten
// dienen zelf aan te geven wat voor beeld het moet worden e.g. close up foto
// van model zonder gezicht."
//
// So this is not a fifth angle on the standard list — it is a described,
// one-off frame the customer asks for in their own words. That difference is
// the whole pricing argument, and it cuts both ways:
//   · It costs MORE attention per image than a set photo, which is templated.
//     Somebody has to read the sentence, decide what it means, and quite often
//     go a round on it. €35 at the entry rung against the set's implied
//     €22.25 (€89 for four) is that gap, stated.
//   · It costs LESS than a full outfit shot at €50, which carries a fit check
//     ACROSS several garments. One extra angle of one product does not.
//
// IT FOLLOWS THE LADDER — LUCAS'S CALL, AGAINST MY RECOMMENDATION, AND THE
// CONSEQUENCE IS RECORDED HERE RATHER THAN ARGUED AGAIN. I proposed a flat
// rate on the OUTFIT_SURCHARGE model, because the reason the ladder falls is
// that templated work amortises over a run and a per-image description does
// not: at the bottom rung an extra photo earns €13 while costing more studio
// time than a €8.25 set image. Lucas chose the ladder anyway, for consistency
// with what the customer already sees. That is a legitimate trade — one price
// story instead of three — and this comment exists so the margin shape is
// visible if it ever needs revisiting, not to relitigate it.
//
// THE RUNGS ARE DERIVED, NOT INVENTED. Each is LADDER.catalog's rung as a
// fraction of its own entry rate, applied to €35 and rounded to whole euros:
//   89→1.000×35 = 35 · 65→0.730×35 = 25.6 → 26 · 51→0.573×35 = 20.1 → 20
//   39→0.438×35 = 15.3 → 15
// Written out rather than computed at runtime so the numbers on the page are
// the numbers in this file, and asserted below so a rounding change cannot
// quietly break the fall.
//
// DE VIJFDE TREDE (33→13) IS WEG met de vijfde trede van LADDER.catalog op
// 12 augustus 2026 — zie de noot bij LADDER. Dat is hier geen keuze maar een
// gevolg: assertExtraLadder() hieronder eist dat deze ladder exact dezelfde
// grenzen heeft als LADDER.catalog, omdat hij eruit is afgeleid. Eén van de
// twee inkorten en de andere niet, laat de build vallen — precies zoals bedoeld.
export const EXTRA_PHOTO_LADDER = [[1, 4, 35], [5, 9, 26], [10, 19, 20], [20, null, 15]];

// Past four extra frames on one product it is no longer "one more angle", it
// is a second brief — the same reasoning MAX_OUTFIT_PRODUCTS applies to "more
// than a form can hold".
export const MAX_EXTRA_PER_PRODUCT = 4;

/**
 * The rate for one extra photo, at the order’s product count.
 *
 * Keyed on PRODUCTS, not on how many extras were ordered: "follows the ladder"
 * means the customer sees one rung for the whole order, which is the
 * consistency the choice was made for. Pricing extras on their own count would
 * be a second ladder to explain and would reward a customer for piling extras
 * onto one product.
 */
export function extraPhotoRate(products = 1) {
  const n = Math.max(1, Math.floor(Number(products) || 1));
  const rung = EXTRA_PHOTO_LADDER.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  if (!rung) throw new Error(`pricing.js: no extra-photo rung covers ${n} products`);
  return rung[2];
}

// The ladder has to FALL and has to line up with the product ladder it was
// derived from, or the page prints two price stories that contradict each
// other. Checked at module load, beside assertLadder()'s own reasoning.
(function assertExtraLadder() {
  const rates = EXTRA_PHOTO_LADDER.map((r) => r[2]);
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] >= rates[i - 1]) {
      throw new Error(`pricing.js: EXTRA_PHOTO_LADDER is not strictly falling at rung ${i} (${rates.join(', ')}).`);
    }
  }
  if (EXTRA_PHOTO_LADDER.length !== LADDER.catalog.length) {
    throw new Error('pricing.js: EXTRA_PHOTO_LADDER must have the same rungs as LADDER.catalog — it is derived from it.');
  }
  EXTRA_PHOTO_LADDER.forEach((r, i) => {
    const [lo, hi] = LADDER.catalog[i];
    if (r[0] !== lo || r[1] !== hi) {
      throw new Error(`pricing.js: EXTRA_PHOTO_LADDER rung ${i} does not span the same products as LADDER.catalog.`);
    }
  });
  // An extra photo must never be cheaper than a set image at the same rung —
  // that is the whole argument for its existence, and an edit to either ladder
  // that inverted it would be selling bespoke work at templated prices.
  EXTRA_PHOTO_LADDER.forEach((r, i) => {
    const perSetImage = LADDER.catalog[i][2] / 4;
    if (r[2] <= perSetImage) {
      throw new Error(
        `pricing.js: an extra photo at €${r[2]} is not dearer than a set image at €${perSetImage.toFixed(2)} `
        + `on rung ${i}. A described one-off costs more attention than a templated angle — see the comment above.`
      );
    }
  });
})();

// Why it costs what it costs, written the way OUTFIT_COPY is: a statement of
// the extra work, not a defence of the price.
export const EXTRA_PHOTO_COPY = {
  en: 'An extra photo is one you describe — a detail from another angle, the product on a model cropped at the neck, a flat-lay for a banner. Because it is written rather than picked from a list, someone reads it, decides what it means and checks the result against what you asked for. That reading is the extra work behind the rate.',
  nl: 'Een extra foto is er een die jij beschrijft — een detail vanuit een andere hoek, het product op een model bijgesneden bij de hals, een flat-lay voor een banner. Omdat het geschreven is in plaats van gekozen uit een lijst, leest iemand het, bepaalt wat het betekent en legt het resultaat naast wat je vroeg. Dat lezen is het extra werk achter het tarief.',
};

// The one thing NOT delegated to me: why it costs more. Lucas was explicit
// that this has to be explained, and explained factually rather than
// defensively ("Leg dit uit maar niet verdedigend") — so this is a statement
// of what the extra work actually is, not a justification offered because the
// price was questioned. Read wherever the outfit choice is offered (the /start
// step 1 field today; a service page is a reasonable next place to reuse it).
export const OUTFIT_COPY = {
  en: 'A complete look means every product in the shot is checked for fit against the others and matched to how it would really look worn together — not composited separately and placed side by side. That check is the extra work behind the price.',
  nl: 'Een compleet setje betekent dat elk product in het shot wordt gecontroleerd op pasvorm ten opzichte van de andere producten, en zo precies mogelijk wordt nagebootst zoals het er in het echt uit zou zien als je het samen draagt — niet los samengesteld en naast elkaar gezet. Die controle is het extra werk achter de prijs.',
};

// ─────────────────────────────────────────────────────────────────────────────
// 2 · FORMATTING — hand-rolled, not Intl, so the output is identical on every
// machine and in every Node build regardless of installed locale data.
// ─────────────────────────────────────────────────────────────────────────────

const SEP = {
  en: { thousands: ',', decimal: '.' },
  nl: { thousands: '.', decimal: ',' },
};

/**
 * Format an amount as euros for a locale.
 * Whole amounts print without decimals (€1,850 / €1.850); amounts with cents
 * print with exactly two (€39.99 / €39,99). That matches how the site already
 * writes them and avoids "€49.00" reading like a rounding artefact.
 */
export function euro(amount, lang = 'en') {
  const s = SEP[lang] || SEP.en;
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const fixed = amount.toFixed(hasCents ? 2 : 0);
  const [whole, cents] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, s.thousands);
  return `€${grouped}${cents ? s.decimal + cents : ''}`;
}

/**
 * A range, e.g. "€2,500–8,000" — the currency symbol is not repeated.
 *
 * ── DIT MAG NOOIT EEN PRIJS VAN ONS ZIJN — 9 augustus 2026 ─────────────────
 *
 * Lucas: *"Wel zou ik uberhaupt bij alle services 1 prijs willen noemen en niet
 * een range. Dus liever vanaf €... en niet €39 - €19 of zoiets."*
 *
 * Dat is nu de regel, en deze functie heeft daarom precies één toegestane
 * aanroeper: SHOOT_DAY, verderop in dit bestand. Dat is geen prijs van VISUAILS
 * maar een schatting van wat een productiedag ELDERS kost — een externe kostenpost
 * die we als vergelijking noemen, met de spreiding er met opzet in en een caveat
 * eronder ("loopt sterk uiteen per stad, per studio en per hoeveel je zelf doet").
 *
 * Voor onze eigen prijzen is een bereik een slechter antwoord dan een vanaf-prijs,
 * en niet alleen qua stijl: bij "€119 – €149" leest iedereen €119 en hoort hij
 * €149 in het gesprek, en dan is de pagina de aanleiding voor het ongemak. Een
 * vanaf-prijs zegt welke kant het op beweegt en laat de ladder het werk doen —
 * daar staan alle tarieven exact, per aantal, en dat is wat een klant zelf kan
 * narekenen.
 *
 * tests/nav.test.mjs houdt vast dat er geen tweede aanroeper bijkomt. Wie hier een
 * dienstprijs door wil halen, komt die test tegen en niet een reviewer.
 */
export function euroRange(low, high, lang = 'en') {
  const s = SEP[lang] || SEP.en;
  const fmt = (n) => n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, s.thousands);
  return `€${fmt(low)}–${fmt(high)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · SERVICE TIERS — section 13.
//
// Three promises are held here rather than in page copy, because each is the
// kind of claim that a solo studio gets held to and each was previously
// repeated across dozens of files:
//
//   turnaround — what the site is allowed to say about timing for this tier.
//   reviewLevel — how much human review this tier gets.
//   aftercare — what happens after delivery if the client is not happy.
//
// Section 13 asks explicitly for the review claim to be "a single content
// variable per tier, not hardcoded across pages," so that Tier 0 review can be
// degraded to a spot-check later without a copy rewrite. Changing
// `reviewLevel` below from 'full' to 'spot' changes every page at once.
// The turnaround promise is held the same way for the same reason — section 13
// calls the Tier 0 delivery-date rule "the single most important constraint in
// this section", and a constraint that important does not belong in markup.
//
// ── WHY THERE IS NO REVISION COUNT ──────────────────────────────────────────
//
// LEES EERST DE NOOT ERONDER: op 24 augustus 2026 staat er wél weer een aantal,
// en om een reden die deze alinea niet kende. Wat hier volgt is hoe het tot dan
// stond en waarom — het is niet meer het beleid, en het is bewaard omdat het
// uitlegt waaróm het beleid twee keer is verschoven.
//
// There used to be: `revisionsIncluded` was 3 on attended and 0 on unattended,
// and eleven surfaces printed one of those numbers. It is gone on the client’s
// instruction, and the reasoning is worth keeping because it will look like an
// omission to anyone who has read a competitor's pricing page:
//
//   "I think revision rounds show insecurity, and that is something a premium
//    service should not show."
//
// He is right, and the tier model is better without it. A counted entitlement
// tells a client two things before they have bought anything: that we expect to
// get it wrong, and that we have already decided how much wrongness they are
// allowed. Three rounds is not generous, it is a cap with a bow on it.
//
// What replaces it is a standard, not an entitlement: we ask on every order
// whether the client is happy, and when the answer is no we go into it with
// them and agree how to put it right. That can be a revision, a refund, or
// credit against the next order — decided with the client once the problem is
// understood, not rationed in advance.
//
// TWO RULES FOLLOW, and both are load-bearing:
//
//   1 · The three remedies are NOT listed on marketing surfaces. A page that
//       offers you a refund before you have ordered is a returns policy, and
//       reads as exactly the defensiveness this change removes. They are
//       enumerated once, in /terms §10, where a client goes to find out what
//       they can hold us to.
//
//   2 · Tier 0 no longer sells revisions. The old copy read "Revisions
//       available as a paid add-on", which monetises dissatisfaction — a louder
//       version of the same insecurity, and impossible to hold on the same page
//       as "we put it right". FLAGGED to the client as a pricing change rather
//       than made silently: it removes a (never-priced) revenue line.
//
// The tiers still differ, and now they differ on something real: attended gets
// a committed 48-hour window and priority in the queue, unattended gets the
// standard queue. Section 13 frames the split as "order individual products"
// against "run a whole drop" — revisions were never the actual difference, they
// were just the difference that was easiest to put a number on.
//
// ── EN PER-BEELD BEOORDELEN IS SINDS 7 AUGUSTUS OOK GEEN VERSCHIL MEER ───────
//
// Dit blok zei tot vandaag dat attended "a portal where every image is approved
// or flagged individually" kreeg, en de `delivery`-regels hieronder zeiden het
// in beide kolommen na. Dat is niet meer waar en het was ook niet houdbaar: het
// zette de enige plek waar een klant kan zéggen dat er iets mis is achter een
// bestelgrootte, terwijl "we vragen of je tevreden bent en zetten recht wat dat
// niet is" hierboven voor beide treden staat. Een belofte zonder knop is geen
// belofte. Zie canReviewOrder() bovenaan dit bestand voor de regel zoals hij nu
// is, en voor de ene uitzondering.
// ─────────────────────────────────────────────────────────────────────────────

// ── EN OP 24 AUGUSTUS 2026 STAAT ER WEER EEN AANTAL ─────────────────────────
//
// Eén revisieronde per bestelling, en dan is die op. De formulering is die van
// Lucas zelf: *"Satisfaction check: 1 revision round included per order to
// adjust any details."*
//
// DAT IS EEN OMKERING VAN HET BLOK HIERBOVEN, en niet omdat het argument daar
// niet deugde. De grond is een andere: *"Klanten kunnen niet meer zoveel
// revisies aanvragen als ze willen omdat dit simpelweg niet haalbaar is voor
// me."* Eén persoon, ongelimiteerd herwerk, en een toezegging die alleen houdbaar
// is zolang niemand er gebruik van maakt.
//
// EEN BELOFTE DIE JE NIET KUNT WAARMAKEN IS ERGER DAN EEN GETAL. Het blok
// hierboven zegt dat een geteld recht de klant vertelt dat je verwacht het fout
// te doen. Dat klopt nog steeds. Maar *"until it's right"* tegen iemand die er
// vier keer op terugkomt, betekent dat je het vierde verzoek afwijst met een
// zin die op de site het tegendeel beloofde — en dát vertelt een klant iets
// ergers dan een getal.
//
// WAT ER PRAKTISCH VERANDERT, en waar het gebouwd moet worden: de klant vraagt
// de ronde één keer aan en geeft dán in één keer door welke beelden niet goed
// zijn. Daarna verdwijnt de revisieknop voor die bestelling en komt er een
// WhatsApp-link voor in de plaats. Zie ARCHITECTURE.md §13 — de knop, het
// intrekken en de mockup-dashboards zijn op 24 augustus nog niet gebouwd; deze
// zin staat er wel al.
// ─────────────────────────────────────────────────────────────────────────────

/* ── DEZELFDE BELOFTE, KORT — 20 augustus 2026 ─────────────────────────────
 * De hero zet zijn drie bewijsregels sinds vandaag NAAST elkaar in plaats van
 * onder elkaar (Lucas: *"mogen de 3 vinkjes achter elkaar met genoeg ruimte
 * ertussen zodat de homepage niet zo lang voelt"*), en dan is 640px kolom voor
 * drie volle zinnen te weinig — gemeten liepen ze op 976px en dus over de foto.
 *
 * DE KORTE VORM STAAT PAL NAAST DE LANGE en niet in een eigen bestand, precies
 * omdat dit het gevaarlijke soort dubbeling is: twee formuleringen van dezelfde
 * toezegging die uit elkaar gaan lopen. Wie de lange regel wijzigt, ziet de
 * korte in beeld staan. tests/promises.test.mjs controleert dat beide bestaan
 * voor elk niveau en elke taal.
 *
 * DE KORTE VORM MAG MINDER ZEGGEN, NOOIT IETS ANDERS. "Human-checked" laat weg
 * dat het om elke visual gaat; het belooft nergens minder dan de lange regel.
 * Een korte vorm die een zwaardere toezegging doet dan de lange is een fout,
 * geen samenvatting. */
export const REVIEW_CLAIM_SHORT = {
  full: {
    en: 'Human-checked',
    nl: 'Met de hand gecontroleerd',
  },
  spot: {
    en: 'Human-checked on a sample',
    nl: 'Steekproefsgewijs gecontroleerd',
  },
};

/* ── DE NAZORG STAAT ÉÉN KEER — 24 augustus 2026 ───────────────────────────
 *
 * Hij stond twee keer: als `aftercare` op elke trede, met erboven de zin *"The
 * promise is identical to attended's"*. Die zin was waar toen hij geschreven
 * werd en op 24 augustus niet meer: de nieuwe formulering ging in de ene kolom
 * staan en de andere hield de oude. Vier dagen lang beloofde /pricing aan een
 * kleine bestelling één revisieronde en aan een grote *"until it's right"* —
 * ongelimiteerd, in de kolom waar het meeste geld staat.
 *
 * EEN COMMENTAAR DAT ZEGT DAT TWEE WAARDEN GELIJK ZIJN, HOUDT ZE NIET GELIJK.
 * Dus is het één waarde, en verwijzen beide treden ernaar. Wie hem verandert,
 * verandert hem overal — en tests/promises.test.mjs staat erop dat de treden
 * hier identiek blijven, zodat een teruggezette letterlijke tekst opvalt.
 *
 * DE BELOFTE VERSCHILT NIET PER BESTELGROOTTE en dat is geen tekortkoming van
 * de tabel. Het venster en de voorrang verschillen wél; dit niet. Een rij die
 * in beide kolommen hetzelfde zegt, zegt precies dat.
 */
export const AFTERCARE = {
  en: 'Satisfaction check: 1 revision round included per order to adjust any details.',
  nl: 'Tevredenheidscheck: 1 revisieronde per bestelling om aanpassingen door te voeren.',
};

export const REVIEW_CLAIM = {
  full: {
    en: 'Human-checked quality on every single visual.',
    nl: 'Elke visual wordt handmatig gecontroleerd.',
  },
  spot: {
    en: 'Human-checked on a sample of every order',
    nl: 'Steekproefsgewijs met de hand gecontroleerd',
  },
};

export const TIERS = {
  // TIER 0 — UNATTENDED.
  // Never described as "basic", "lite" or "starter", and never styled as a
  // lesser card. Section 13: "It is a different SERVICE MODEL, not a worse
  // product." The frame is "order individual products" vs "run a whole drop."
  unattended: {
    id: 'unattended',
    reviewLevel: 'full',
    committedDate: false,
    portal: false,
    // DOCUMENTATION, NOT A SWITCH. Nothing reads this field — grep it. It records
    // section 13's "always yields to Tier 1 in the capacity gate" next to the tier
    // it describes, because that is where a reader looks for it; the yielding
    // itself is QUEUE_FLOOR_PER_DAY in src/data/capacity.js, which reserves
    // throughput no attended window may take.
    //
    // Left in place rather than deleted because it names a real property of the
    // tier, and a reader who finds only the number in capacity.js has to
    // reconstruct which direction it protects. Flipping it changes nothing —
    // if you came here to change how the gate behaves, change the floor.
    yieldsToAttended: true,
    label: { en: `Under ${WINDOW_THRESHOLD} products`, nl: `Onder ${WINDOW_THRESHOLD} producten` },
    // The ONLY sanctioned timing language for this tier. No date, no "24
    // hours", no "next day" — section 13 supplies this exact substitute.
    turnaround: {
      en: 'Estimated delivery: 2–4 working days',
      nl: 'Meestal 2–4 werkdagen',
    },
    // Al kort genoeg; de korte vorm staat er toch, zodat elke aanroeper van
    // turnaroundShort() een antwoord krijgt en niet per niveau hoeft te weten
    // of er een kortere bestaat. Zie de noot bij REVIEW_CLAIM_SHORT.
    turnaroundShort: {
      en: '2–4 working days',
      nl: '2–4 werkdagen',
    },
    // Stated openly, not buried. Section 13: "The difference must be VISIBLE,
    // not hidden [...] it is also what makes the low price honest rather than
    // a downgrade in disguise."
    /* 'Standard queue' STOND HIER AAN DE ENGELSE KANT — 24 augustus 2026, en het
       was ook een scheefstand tussen de twee talen. De Nederlandse cel zegt al
       "normale doorlooptijd" (het woord dat STIJL.md §3 als vervanging voor
       "wachtrij / queue" voorschrijft) en de Engelse zei nog "queue", dat op
       diezelfde lijst staat. Twee cellen naast elkaar die niet hetzelfde
       beloofden, in een tabel die er is om precies dat verschil zichtbaar te
       maken. */
    queue: {
      en: 'Standard turnaround — estimated delivery, no fixed date.',
      nl: 'Standaard levertijd, geen vaste opleverdatum',
    },
    // ELKE BESTELLING GEEFT TOEGANG TOT HET DASHBOARD, sinds augustus 2026.
    //
    // Lucas: *"klant krijgt na elke bestelling (ook test sample van 0,99 cent)
    // toegang tot het klantendashboard."* Deze regel zei nog "download link by
    // email or WhatsApp" en zette daarmee het dashboard neer als iets van de
    // hogere trede — terwijl /account elke bestelling van een klant toont,
    // ongeacht tier, en sinds vandaag met de foto’s erbij. De tabel beloofde
    // dus minder dan het product doet, en dat is de vervelendste soort fout:
    // hij kost je verkopen zonder dat iemand klaagt.
    //
    // EN SINDS 7 AUGUSTUS OOK BEOORDELEN. Deze regel zei "bekijken en
    // downloaden" en zette het goedkeuren daarmee een trede hoger; die grens is
    // weg (zie canReviewOrder). Wat er in deze kolom overblijft is precies wat
    // er ook echt gebeurt, en het verschil met de trede hiernaast staat in de
    // regels erboven — het venster en de voorrang — waar het thuishoort.
    delivery: {
      en: 'View, download, and approve everything right in your dashboard, or use the direct link sent via email or WhatsApp.',
      nl: 'Bekijk, download en keur alles goed in je dashboard — of gebruik de rechtstreekse link via e-mail of WhatsApp.',
    },
    // Eén waarde voor beide treden — zie de noot bij AFTERCARE hierboven.
    aftercare: AFTERCARE,
  },

  // TIER 1 — ATTENDED.
  attended: {
    id: 'attended',
    reviewLevel: 'full',
    committedDate: true,
    portal: true,
    // Also unread. See the note on unattended.yieldsToAttended above.
    yieldsToAttended: false,
    label: { en: `From ${WINDOW_THRESHOLD} products`, nl: `Vanaf ${WINDOW_THRESHOLD} producten` },
    // A committed window, cleared by the capacity gate before it is offered.
    // The site must never print a date the gate has not cleared.
    turnaround: {
      en: 'A reserved 48-hour window — fully confirmed before you pay.',
      // 8 augustus 2026 — DIT ZEI IETS ANDERS DAN DE ENGELSE REGEL, op zo’n
      // vijftien plekken. Er stond "een leverdatum met 48 uur werk erin": dat
      // gaat over hoeveel uur wij eraan werken en zegt niets over snelheid,
      // terwijl de Engelse regel een levering binnen 48 uur belooft. capacity.js
      // is expliciet dat 48 uur twee werkdagen betekent, en HomeV2 zei elders al
      // "48 uur vanaf je leverdatum" — de Nederlandse tekst was dus ook met
      // zichzelf in tegenspraak. Vermoedelijk bijschade van het opruimen van het
      // woord "venster".
      //
      // ── EN OP 18 AUGUSTUS 2026 BLEEK HIJ NOG STEEDS IETS ANDERS TE ZEGGEN ──
      //
      // De reparatie hierboven bracht de Nederlandse regel dichter bij de
      // Engelse en schoot er overheen. Er stond: "Levering binnen 48 uur vanaf
      // je leverdatum". De Engelse regel belooft een GERESERVEERD BLOK van 48
      // uur; de Nederlandse beloofde LEVERING BINNEN 48 uur ná een datum. Dat
      // is een andere toezegging, en een zwaardere, op veertien pagina's in de
      // taal van zijn thuismarkt.
      //
      // En hij botst met capacity.js, die er expliciet over is: een venster is
      // twee WERKdagen, een venster dat vrijdag opengaat loopt vrijdag en
      // maandag, en — letterlijk — *"the client is told the calendar dates,
      // never the phrase '48 hours' as a countdown"*. Precies een aftelling is
      // wat "binnen 48 uur vanaf je leverdatum" leest, en in dat vrijdaggeval
      // is de eigen normale gang van zaken al 72 uur wandklok.
      //
      // Nu zegt hij wat de Engelse regel zegt: een blok dat we vrijhouden. Het
      // aanbod verandert niet; de belofte die er per ongeluk bij stond, gaat weg.
      nl: 'Een gereserveerd tijdvak van 48 uur, bevestigd voordat je betaalt.',
    },
    // De korte vorm laat "dat we voor je vrijhouden" weg en houdt het blok en
    // het moment: dat zijn de twee dingen die de belofte dragen. Zie de noot bij
    // REVIEW_CLAIM_SHORT voor waarom hij hier staat en niet elders.
    turnaroundShort: {
      en: '48-hour window, fixed before you pay',
      nl: '48-uursblok, vast voor je betaalt',
    },
    queue: {
      // Reworded with the model, and the promise is now about SIZE rather than
      // about a product the buyer picked: an order past WINDOW_THRESHOLD holds
      // its slot against anything smaller arriving after it. Same guarantee,
      // stated in the terms the ladder actually uses.
      en: 'Priority processing — your booked delivery date is locked in and never bumped for other orders.',
      nl: 'Prioriteit boven andere bestellingen — een bevestigde opleverdatum verschuift nooit.',
    },
    // NIET MEER "plus per-image approve or request-revision" — dat kan de trede
    // hieronder sinds 7 augustus ook. Wat hier wél overblijft en nergens anders
    // staat: de bestelpagina uit de mail toont bij een gereserveerd venster elke
    // statuswijziging met een datum erbij (zie attendedBody in src/lib/portal.js;
    // unattendedBody rendert geen tijdlijn). Dat is een echt verschil, geen
    // herschreven versie van hetzelfde.
    delivery: {
      en: 'The same dashboard, plus a dedicated order page tracking every step with key dates.',
      nl: 'Hetzelfde dashboard, plus een bestelpagina die elke stap met bijbehorende datum toont.',
    },
    // Dezelfde waarde als hierboven, en dat is nu ook letterlijk zo: hier stond
    // tot 24 augustus 2026 de oude belofte ("Anything you flag, we'll review
    // together until it's right"), die ongelimiteerde revisies toezegde.
    aftercare: AFTERCARE,
  },
};

/** The review claim for a tier, in one call. Pages use this, never a literal. */
export function reviewClaim(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return REVIEW_CLAIM[tier.reviewLevel][lang] || REVIEW_CLAIM[tier.reviewLevel].en;
}

/** The sanctioned timing language for a tier. Pages use this, never a literal. */
/** De korte vorm van turnaround(), voor plekken waar de regel naast andere
 *  regels staat in plaats van eronder. Zelfde belofte, minder woorden — zie de
 *  noot bij REVIEW_CLAIM_SHORT. */
export function turnaroundShort(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  const kort = tier.turnaroundShort || tier.turnaround;
  return kort[lang] || kort.en;
}

/** De korte vorm van reviewClaim(). Zelfde voorwaarde als hierboven. */
export function reviewClaimShort(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  const kort = REVIEW_CLAIM_SHORT[tier.reviewLevel] || REVIEW_CLAIM[tier.reviewLevel];
  return kort[lang] || kort.en;
}

export function turnaround(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return tier.turnaround[lang] || tier.turnaround.en;
}

/**
 * What happens after delivery, per tier. Pages use this, never a literal.
 *
 * The third of the three held promises, and the newest. It exists as an
 * accessor rather than a bare property read for the same reason the other two
 * do: eleven surfaces used to type a revision count, every one of them had to
 * be found and rewritten by hand when the count went away, and the next change
 * to this promise should cost one edit instead of eleven.
 */
export function aftercare(tierId, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  return tier.aftercare[lang] || tier.aftercare.en;
}

/**
 * The five facts that describe a service tier, in the order they are shown,
 * with their column labels in both languages.
 *
 * WHY THIS IS HERE AND NOT IN THE PAGES. Two surfaces render this set —
 * TierCompare.astro (on /catalog, /lifestyle and /video) and the Tier 0 block
 * on /pricing — which meant two copies of the labels in two languages, four
 * lists to keep in step. They had already fallen out of step: /pricing's Dutch
 * list read `['Timing', 'Wachtrij', 'Levering', 'Na levering']`, with the
 * first label left in English on a live Dutch page. Nothing could have caught
 * that, because there was nothing to compare it against. There is now.
 *
 * Section 13 states the rule about the review claim specifically — "put the
 * review-level claim in a single content variable per tier, not hardcoded
 * across pages" — and the reasoning does not stop at that one row.
 *
 * ORDER IS PART OF THE DATA. The two tier columns sit side by side and a
 * comparison whose rows do not line up is not a comparison, so the sequence
 * lives here rather than being re-typed per page.
 */
export const TIER_ROWS = [
  { key: 'turnaround', label: { en: 'Timing', nl: 'Levertijd' } },
  /* ── 'Queue' / 'Wachtrij' STOND HIER, EN STAAT IN STIJL.md §3 ────────────
     Die tabel noemt "wachtrij / queue" bij naam als woord dat nooit op de
     klantzijde hoort, met als vervanging "de normale doorlooptijd". Die
     vervanging kan hier niet: dat ís al wat er in de cel ernaast staat
     ("Standaard levertijd, geen vaste opleverdatum"), en een label dat zijn
     eigen waarde herhaalt zegt niets.

     Wat deze rij werkelijk beantwoordt is waar je in de agenda staat — de ene
     kolom zegt "normale doorlooptijd, geen vaste datum", de andere "voorrang,
     met een geboekte datum". "Planning" dekt allebei en is een woord dat een
     bezoeker kent zonder te weten hoe het hier achter de schermen werkt, wat
     precies de regel van §3 is. Sta je een beter woord voor: het staat op één
     plek en twee surfaces lezen het. */
  { key: 'queue', label: { en: 'Scheduling', nl: 'Planning' } },
  { key: 'delivery', label: { en: 'Delivery', nl: 'Levering' } },
  { key: 'review', label: { en: 'Review', nl: 'Controle' } },
  { key: 'aftercare', label: { en: 'After delivery', nl: 'Na levering' } },
];

/**
 * One cell of the tier table.
 *
 * DELEGATES RATHER THAN RE-READS. Three of the five rows already had a named
 * accessor before this table existed — reviewClaim(), turnaround(), aftercare()
 * — each written because the promise it returns is one the studio is held to,
 * and each documented as "pages use this, never a literal". Reading
 * `tier.turnaround[lang]` here instead would have produced the same string
 * today while quietly creating a second path to it, so a guard added to the
 * accessor tomorrow would cover the pages and miss the table. The two rows
 * without an accessor (queue, delivery) fall through to the plain read.
 *
 * `review` in particular is not stored on the tier at all — it is derived from
 * the tier's review LEVEL — and that indirection is what lets Tier 0 be
 * degraded to a spot-check later without a copy rewrite, which section 13 asks
 * for explicitly.
 *
 * Throws on an unknown key rather than returning undefined: a silently empty
 * cell in a comparison table reads as "this tier does not get that", which is
 * the single worst thing this block could say by accident.
 */
const ROW_ACCESSOR = {
  review: reviewClaim,
  turnaround,
  aftercare,
};

export function tierRow(tierId, key, lang = 'en') {
  const tier = TIERS[tierId];
  if (!tier) throw new Error(`pricing.js: unknown tier "${tierId}"`);
  if (!TIER_ROWS.some((r) => r.key === key)) {
    throw new Error(`pricing.js: "${key}" is not a tier row`);
  }
  const accessor = ROW_ACCESSOR[key];
  if (accessor) return accessor(tierId, lang);
  return tier[key][lang] || tier[key].en;
}

/** The row labels for one language, in order. */
export function tierRowLabels(lang = 'en', keys = null) {
  const rows = keys ? TIER_ROWS.filter((r) => keys.includes(r.key)) : TIER_ROWS;
  return rows.map((r) => r.label[lang] || r.label.en);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · DERIVED ARITHMETIC — computed, never typed.
// ─────────────────────────────────────────────────────────────────────────────

/** What one product costs à la carte at Tier 0, at drop scope (catalog + lifestyle). */
// TIER0_PRODUCT, PILOT_PER_PRODUCT, FULL_DROP_PER_PRODUCT_MIN/MAX and
// UPGRADE_BREAK_EVEN were here, with about eighty lines of comment arguing the
// arithmetic between them. All five were derived from a package price divided
// by a package size, and both halves of every one of those divisions has been
// deleted. What they were FOR — telling a client at what point ordering
// differently is cheaper — is now planSaving() and upgradePrompt(), which
// subtract two figures the client can recompute rather than naming a crossover
// they have to take on trust.

/** The trigger section 13 specifies for the upgrade prompt. */
export const UPGRADE_TRIGGER_PRODUCTS = 12;

/**
 * Has this brand ordered enough individual products in the window to be told
 * what a Full Drop costs?
 *
 * `>=` rather than `>`. Section 13 says "when a brand crosses 12 individual
 * products in a rolling quarter", which reads both ways; a constant named
 * UPGRADE_TRIGGER_PRODUCTS that fires at thirteen is a bug someone eventually
 * writes, and one product either side of the line changes nothing about whether
 * the sentence is worth sending. FLAGGED, and a one-character change.
 */
export function shouldPromptUpgrade(products) {
  return Number.isInteger(products) && products >= UPGRADE_TRIGGER_PRODUCTS;
}

/**
 * The upgrade prompt itself. One line, in the client’s language, or null.
 *
 * IT IS A COMPARISON, NOT A SAVING CLAIM. Section 13's example reads "You've
 * ordered 14 products this quarter. A Full Drop covers 25 for less." At
 * today's prices that sentence happens to be true at drop scope — fourteen
 * products is 14 × €219.98 = €3,079.72, more than €1,850 — but it is still
 * false for a brand that has only been ordering catalog sets: 14 × €89.99 =
 * €1,259.86, under €1,850. Section 13 asks for "factual, no pressure," and a
 * claim that is true for one buying pattern and false for another is not
 * factual for the general case — this follows the standard, because a prompt
 * a client can disprove with a calculator costs more than it earns. See the
 * FLAGGED comment on UPGRADE_BREAK_EVEN above for the full arithmetic.
 *
 * IT MAKES NO CLAIM ABOUT WHAT THEY SPENT, AT ANY COUNT. Saying "less than you
 * spent" would be safe above UPGRADE_BREAK_EVEN — assertLadder() keeps that
 * arithmetic true — but only in the numbers the site prints today. Section 14
 * quotes Tier 1 EXCLUSIVE of VAT and Tier 0 INCLUSIVE, so the like-for-like
 * crossover for a business that reclaims is 23, not 19, and a saving claim made
 * anywhere between the two is wrong for precisely the customer most likely to
 * check it. Naming the crossover is true under both readings, so there is no
 * version of section 14 that can turn this sentence into a lie.
 *
 * Below the trigger it returns null, so a caller has one thing to test rather
 * than a threshold to re-derive.
 */
export function upgradePrompt(products, lang = 'en') {
  if (!shouldPromptUpgrade(products)) return null;
  // The plan that would have covered this quarter's rate of ordering, and what
  // the same output costs on the ladder. Both figures are computed, and
  // assertLadder() guarantees the plan is the cheaper of the two — so this is a
  // subtraction the client can repeat, not a claim they have to believe.
  const perMonth = Math.ceil(products / 3);
  const id = planFor(perMonth) || 'brand';
  const s = planSaving(id);
  const name = plans(lang).find((p) => p.id === id)?.name || id;
  const price = euro(PLAN_AMOUNT[id], lang);
  return lang === 'nl'
    ? `Je hebt dit kwartaal ${products} producten besteld — ongeveer ${perMonth} per maand. Het ${name}-plan dekt ${PLAN_PRODUCTS[id]} producten per maand voor ${price}; op losse bestellingen is dat ${euro(s.onLadder, lang)}.`
    : `You’ve ordered ${products} products this quarter — about ${perMonth} a month. The ${name} plan covers ${PLAN_PRODUCTS[id]} products a month for ${price}; the same output ordered one at a time is ${euro(s.onLadder, lang)}.`;
}

/**
 * A full quote for `products` of `kind`, net / VAT / gross, plus the rate that
 * produced it and the next rung if there is one.
 *
 * ONE function, because the alternative is every page doing its own
 * multiplication — and BRIEF-14's rule is that no price may be printed without
 * saying whether VAT is in it. A page that computes its own total will
 * eventually print one without the label.
 *
 * THE `firstOrder` OPTION AND THE `discount` FIELD ARE GONE with the 20% off —
 * see the note where FIRST_ORDER_DISCOUNT used to be. `listTotal` and `net` are
 * now always the same number and both are kept, because callers use both names
 * and one of them meaning something different from the other was the only
 * reason there were two.
 */
export function quote(kind, products) {
  const n = Math.max(0, Math.floor(Number(products) || 0));
  const rate = n === 0 ? ladderRate(kind, 1) : ladderRate(kind, n);
  const net = ladderTotal(kind, n);
  // The next rung, so a page can say "two more and every product drops to €65".
  const rungs = LADDER[kind];
  const idx = rungs.findIndex(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  const next = idx >= 0 && idx < rungs.length - 1 ? rungs[idx + 1] : null;
  return {
    products: n,
    rate,
    listTotal: net,
    net,
    vat: vatOf(net),
    gross: withVat(net),
    nextRung: next ? { at: next[0], rate: next[2], addProducts: Math.max(0, next[0] - n) } : null,
  };
}

/**
 * What a plan would have saved, against the same output bought on the ladder.
 * Returns null when the plan does not win, which cannot happen — assertLadder()
 * fails the build first — but a caller should not have to know that.
 */
export function planSaving(id) {
  if (!(id in PLAN_AMOUNT)) throw new Error(`pricing.js: unknown plan "${id}"`);
  const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
  const saving = Math.round((onLadder - PLAN_AMOUNT[id]) * 100) / 100;
  return saving > 0 ? { onLadder, price: PLAN_AMOUNT[id], saving } : null;
}

/** The cheapest plan that covers this many products a month, or null. */
export function planFor(productsPerMonth) {
  const n = Math.floor(Number(productsPerMonth) || 0);
  const ids = Object.keys(PLAN_PRODUCTS).sort((a, b) => PLAN_PRODUCTS[a] - PLAN_PRODUCTS[b]);
  return ids.find((id) => PLAN_PRODUCTS[id] >= n) || null;
}

/** The plans, as copy. Same shape as PACKAGES so a page can swap one for the other. */
export function plans(lang = 'en') {
  const l = lang === 'nl' ? 'nl' : 'en';
  const nlx = l === 'nl';
  const meta = {
    starter: {
      name: planName('starter', l),
      line: nlx ? 'Genoeg om elke maand iets nieuws te laten zien.' : 'Enough to have something new to show every month.',
    },
    studio: {
      name: planName('studio', l),
      line: nlx ? 'Voor merken die continu posten, niet alleen bij een lancering.' : 'For brands posting continuously, not only at a launch.',
    },
    brand: {
      name: planName('brand', l),
      line: nlx ? 'Een hele collectie per maand, met je eigen gezicht erbij.' : 'A whole collection a month, with your own face on it.',
    },
  };
  return Object.keys(PLAN_AMOUNT).map((id) => {
    const saving = planSaving(id);
    const products = PLAN_PRODUCTS[id];
    const clips = PLAN_CLIPS[id];
    return {
      id,
      name: meta[id].name,
      line: meta[id].line,
      price: euro(PLAN_AMOUNT[id], l),
      unit: nlx ? 'per maand' : 'per month',
      products,
      includes: [
        nlx ? `${products} producten per maand` : `${products} products a month`,
        nlx ? 'Een complete catalogusset en een lifestyle-carrousel voor elk product.' : 'A complete catalog set and a lifestyle carousel for every product.',
        ...(clips ? [nlx ? `${clips} videoclips per maand` : `${clips} video clips a month`] : []),
        ...(id === 'brand' ? [nlx ? 'Inclusief jouw eigen dedicated Merkmodel — volledig afgestemd op jouw merkesthetiek.' : 'Includes a dedicated Brand Model tailored to your brand — no separate casting or usage fees.'] : []),
        turnaround('attended', l),
        nlx
          ? `Maandelijks opzegbaar, ongebruikte producten schuiven ${PLAN_ROLLOVER_MONTHS} maand door`
          : `Cancel any month, unused products roll over ${PLAN_ROLLOVER_MONTHS} month`,
      ],
      saving: saving
        ? (nlx
            ? `Op de prijs per product zou dit ${euro(saving.onLadder, l)} kosten — ${euro(saving.saving, l)} per maand verschil.`
            : `The same output on the price per product is ${euro(saving.onLadder, l)} — ${euro(saving.saving, l)} a month more.`)
        : null,
    };
  });
}

/* BRAND_MODEL_CREDIT_DROPS stond hier, en is weg met de credit zelf — zie de noot
   bij AMOUNT.brandModel. Bewust VERWIJDERD en niet op 1 gezet: een export die
   blijft antwoorden onder zijn oude naam, is hoe een pagina over een half jaar nog
   steeds een terugverdienrekening afdrukt die niet meer bestaat. Dezelfde regel
   als bij REQUIRED_SHOT in shots.js en bij WINDOW_THRESHOLD_LABEL. */

// ─────────────────────────────────────────────────────────────────────────────
// 5 · BUILD-TIME ASSERTIONS.
//
// These run when Astro imports this module, so a broken ladder fails the build
// instead of shipping. That is the whole point of centralising the numbers: it
// is not enough that they live in one file, the relationships between them have
// to be enforced. Flag 1 in AUDIT-TASK-0.md §H existed precisely because these
// relationships were never checked.
// ─────────────────────────────────────────────────────────────────────────────

function assertLadder() {
  // The package-ladder rungs that used to open this function are gone with the
  // packages: they asserted that Tier 0 per-product > Pilot per-product > Full
  // Drop per-product, an ordering that only meant anything while those three
  // things existed. The ladder's own monotonicity is asserted at the bottom of
  // this function instead, per kind, which is the same guarantee applied to the
  // thing that actually sets prices now.

  /* De controle op de merkmodel-credit stond hier en is weg met de credit. Wat
     ervoor in de plaats komt is de verhouding die het besluit van 23 augustus
     droeg: het merkmodel mag niet meer kosten dan een gewone bestelling waar hij
     bij hoort. Zodra dat weer zo is, is het opnieuw een tweede besluit in plaats
     van een keuze binnen hetzelfde gesprek — en dat is precies de fout die op
     € 1.250 gemaakt werd. Tien producten is de maat, want dat is de drempel
     waarop een bestelling een datum krijgt. */
  const tienCompleet = ladderTotal('complete', WINDOW_THRESHOLD);
  if (AMOUNT.brandModel > tienCompleet) {
    throw new Error(
      `pricing.js: het merkmodel kost € ${AMOUNT.brandModel} en een bestelling van `
      + `${WINDOW_THRESHOLD} complete producten € ${tienCompleet}. Een toevoeging die meer `
      + 'kost dan de bestelling waar hij bij hoort, is geen toevoeging meer.'
    );
  }

  // EVERY PLAN MUST BEAT THE LADDER. This replaces the old "the retainer must
  // cost more than the drop it contains" check, which asserted the opposite
  // relationship and fired the moment the plans were priced: under the package
  // model the retainer was a bundle sold ABOVE its contents, and under this one
  // a plan is the cheaper way to buy the same output. That is not a style
  // preference — upgradePrompt() below tells a client, in euros, what a plan
  // would have saved them, and a prompt whose arithmetic a client can disprove
  // with a calculator costs more than it earns. So the saving is asserted at
  // build time rather than trusted.
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
    if (!(PLAN_AMOUNT[id] < onLadder)) {
      throw new Error(
        `pricing.js: the ${id} plan costs ${PLAN_AMOUNT[id]} for ` +
        `${PLAN_PRODUCTS[id]} products, which is ${onLadder} on the ladder — a ` +
        `plan that does not beat the ladder is a worse deal wearing a ` +
        `subscription’s clothes, and upgradePrompt() would be lying.`
      );
    }
  }

  // The ladder itself has to fall. A rung that costs more per product than the
  // one below it is the exact failure the old package model shipped with (8
  // products at €81.25 against 20 at €92.50), and it is invisible until a
  // prospect divides.
  for (const [kind, rungs] of Object.entries(LADDER)) {
    for (let i = 1; i < rungs.length; i++) {
      if (!(rungs[i][2] < rungs[i - 1][2])) {
        throw new Error(
          `pricing.js: the ${kind} ladder is inverted at rung ${i} — ` +
          `${rungs[i][2]} is not less than ${rungs[i - 1][2]}. Buying more must ` +
          `always cost less per product.`
        );
      }
    }
  }

  // Two assertions about the package crossover were here — that
  // UPGRADE_BREAK_EVEN products à la carte really did cost more than a Full
  // Drop, and that FULL_DROP_MIN products à la carte did too. Both compared a
  // package price against a flat per-product price, and neither of those
  // exists now: the ladder has no crossover to assert because there is nothing
  // to cross over to. What replaced them is the plan check below.

  // EVERY PLAN MUST BEAT THE LADDER. This replaces the old "the retainer must
  // cost more than the drop it contains" check, which asserted the opposite
  // relationship and fired the moment the plans were priced: under the package
  // model the retainer was a bundle sold ABOVE its contents, and under this one
  // a plan is the cheaper way to buy the same output. That is not a style
  // preference — upgradePrompt() below tells a client, in euros, what a plan
  // would have saved them, and a prompt whose arithmetic a client can disprove
  // with a calculator costs more than it earns. So the saving is asserted at
  // build time rather than trusted.
  for (const id of Object.keys(PLAN_AMOUNT)) {
    const onLadder = ladderTotal('complete', PLAN_PRODUCTS[id]) + PLAN_CLIPS[id] * AMOUNT.video;
    if (!(PLAN_AMOUNT[id] < onLadder)) {
      throw new Error(
        `pricing.js: the ${id} plan costs ${PLAN_AMOUNT[id]} for ` +
        `${PLAN_PRODUCTS[id]} products, which is ${onLadder} on the ladder — a ` +
        `plan that does not beat the ladder is a worse deal wearing a ` +
        `subscription’s clothes, and upgradePrompt() would be lying.`
      );
    }
  }

  // The ladder itself has to fall. A rung that costs more per product than the
  // one below it is the exact failure the old package model shipped with (8
  // products at €81.25 against 20 at €92.50), and it is invisible until a
  // prospect divides.
  for (const [kind, rungs] of Object.entries(LADDER)) {
    for (let i = 1; i < rungs.length; i++) {
      if (!(rungs[i][2] < rungs[i - 1][2])) {
        throw new Error(
          `pricing.js: the ${kind} ladder is inverted at rung ${i} — ` +
          `${rungs[i][2]} is not less than ${rungs[i - 1][2]}. Buying more must ` +
          `always cost less per product.`
        );
      }
    }
  }

  // Two package-crossover assertions were here — that UPGRADE_BREAK_EVEN
  // products à la carte cost more than a Full Drop, and that FULL_DROP_MIN
  // products did too. Both compared a package price against a flat
  // per-product price, and neither of those things exists now: a ladder has
  // no crossover to assert, because there is nothing on the other side to
  // cross to. The plan check above is what carries that duty now.
}

assertLadder();

// PACKAGES WAS HERE — the Drop Pilot, the Full Drop, the Brand Model and the
// Studio retainer as a bilingual price list, roughly 230 lines of it. It went
// with the package model: nothing had imported it since /pricing,
// /custom-models and schema.js were migrated to the ladder, and a retired
// price list left inside the file that is meant to be the single source of
// truth is worse than no file at all — the next reader finds "Drop Pilot,
// €650, 8 products" written out in full with no way to tell it is a ghost.
// plans() further up is what replaced it.

export const PER_PRODUCT = {
  en: [
    { id: 'catalog', tier: 'unattended', name: 'Catalog set', price: euro(AMOUNT.catalog, 'en'), outfitPrice: euro(AMOUNT.catalog + OUTFIT_SURCHARGE, 'en'), unit: 'per product', line: 'From four photos: front, back, a fabric or logo close-up, and one on-model shot. Add more per product.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle carousel', price: euro(AMOUNT.lifestyle, 'en'), outfitPrice: euro(AMOUNT.lifestyle + OUTFIT_SURCHARGE, 'en'), unit: 'per product', line: 'Three photos of one product in one styled look — a carousel ready to post.' },
    { id: 'video', tier: 'unattended', name: 'Video clip', price: euro(AMOUNT.video, 'en'), outfitPrice: euro(AMOUNT.video + OUTFIT_SURCHARGE, 'en'), unit: 'per clip', line: 'One short clip. The same rate on its own or added to a larger order.' },
  ],
  nl: [
    { id: 'catalog', tier: 'unattended', name: 'Catalogset', price: euro(AMOUNT.catalog, 'nl'), outfitPrice: euro(AMOUNT.catalog + OUTFIT_SURCHARGE, 'nl'), unit: 'per product', line: 'Vanaf vier foto’s: voorkant, achterkant, een stof- of logodetail, en één on-model shot. Per product bij te bestellen.' },
    { id: 'lifestyle', tier: 'unattended', name: 'Lifestyle-carousel', price: euro(AMOUNT.lifestyle, 'nl'), outfitPrice: euro(AMOUNT.lifestyle + OUTFIT_SURCHARGE, 'nl'), unit: 'per product', line: 'Drie foto’s van één product in één gestylede look — een carousel klaar om te posten.' },
    { id: 'video', tier: 'unattended', name: 'Videoclip', price: euro(AMOUNT.video, 'nl'), outfitPrice: euro(AMOUNT.video + OUTFIT_SURCHARGE, 'nl'), unit: 'per clip', line: 'Eén korte clip. Dezelfde prijs los of toegevoegd aan een grotere bestelling.' },
  ],
};

/**
 * One Tier 0 line item by id, in one call — the same shape as reviewClaim()
 * and turnaround() above, and for the same reason.
 *
 * The alternative at the call site is `PER_PRODUCT[lang].find(p => p.id === x)`,
 * which is typed `T | undefined` and so needs a `!` on every use; six page
 * wrappers each carrying a non-null assertion is six places a rename fails
 * silently under a type-checker and loudly at render. This throws with the id
 * that was asked for instead.
 *
 * Called from page frontmatter, never at module scope — PER_PRODUCT is a const
 * declared above, so a top-level call from assertLadder() would hit its TDZ.
 */
export function perProduct(id, lang = 'en') {
  const list = PER_PRODUCT[lang] || PER_PRODUCT.en;
  const item = list.find((p) => p.id === id);
  if (!item) throw new Error(`pricing.js: unknown per-product id "${id}"`);
  return item;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOEVEEL BEELDEN ÉÉN PRODUCT OPLEVERT
//
// Deze twee getallen stonden als "vier" en "drie" uitgeschreven op zeventien
// plekken, en op de proefvisual stond ondertussen "één beeld". Lucas, 8 augustus
// 2026: *"test sample is niet 1 beeld maar 1 product volledig geleverd, dus bij
// keuze catalog 4 beelden en lifestyle 3 beelden. Dit is belangrijk om aan te
// passen want dit laat de waarde zien van de test sample en wat je nou krijgt."*
//
// Dus staan ze hier één keer, en leest de tekst ze op. De opmerkingen bij LADDER
// hierboven noemen dezelfde aantallen ("four images", "three images", "seven
// finished images"); assertShotCounts() hieronder houdt die drie bij elkaar,
// zodat een wijziging aan één kant niet stil de andere kant laat liegen.
// ─────────────────────────────────────────────────────────────────────────────

/** Een catalogset: voorkant, achterkant, een detail, en één op een model. */
export const CATALOG_IMAGES = 4;
/** Een lifestyle-carousel: een scène, een op een model, een detailclose-up. */
export const LIFESTYLE_IMAGES = 3;
/** Een compleet product is beide samen. */
export const COMPLETE_IMAGES = CATALOG_IMAGES + LIFESTYLE_IMAGES;

/*
 * De catalogset levert net zoveel beelden als de klant er uploadt — vier — maar
 * dat is geen wet, het is vandaag zo. SHOTS in shots.js gaat over wat er IN
 * gaat, CATALOG_IMAGES over wat eruit komt. Ze mogen uit elkaar lopen; als dat
 * gebeurt, moet iemand de tekst nalezen in plaats van het te ontdekken via een
 * klant die vier beelden verwachtte. Vandaar deze controle bij de bouw.
 */
function assertShotCounts() {
  if (COMPLETE_IMAGES !== 7) {
    throw new Error(
      `pricing.js: een compleet product is ${COMPLETE_IMAGES} beelden, maar de opmerking bij LADDER.complete zegt zeven. Werk beide bij.`,
    );
  }
}
assertShotCounts();

/*
 * ── WAT DE €1 IS, EN WAAROM DIE ZIN HIER STAAT (9 augustus 2026) ─────────────
 *
 * Lucas: *"Ik wil de €1 verification veranderen naar A €1 fee to prevent abuse,
 * omdat verification niet helemaal eerlijk voelt."*
 *
 * Hij heeft gelijk, en het is geen kwestie van toon. "Verification" suggereert
 * dat we iets controleren en dat het bedrag daarvoor dient — dat we je kaart
 * verifiëren, of je bedrijf. Dat doen we niet. We houden €1 en dat is het; het
 * enige wat het tegenhoudt is dat iemand honderd proeven aanvraagt. Een woord dat
 * een controle belooft die er niet is, is precies het soort belofte dat de rest
 * van deze site probeert te vermijden.
 *
 * ── EN WAAROM HET NU ÉÉN VELD IS ────────────────────────────────────────────
 *
 * De zin stond op elf plekken los ingetypt: /test-sample twee keer plus een chip,
 * /gallery, /upload-guidelines en de homepage, allemaal maal twee talen. De kop
 * van src/pages/test-sample.astro voert dat argument zelf al — daar staat "the
 * verification fee was typed in four separate places" als reden dat de PRIJS naar
 * dit bestand verhuisde. De omschrijving eromheen bleef achter, en dus was deze
 * ene woordwijziging elf bewerkingen in zes bestanden.
 *
 * `feeNote` is de volledige zin voor waar de belofte helemaal wordt uitgeschreven.
 * Waar alleen het bedrag past — een chip van drie woorden — staat het bedrag en
 * verder niets: een halve uitleg is slechter dan geen.
 *
 * ZONDER LIDWOORD, en dat is niet willekeurig. De eerste versie begon met "a ",
 * en op /test-sample leverde dat "A one-off a €1 fee to prevent abuse" op. Een
 * gedeelde zin die zijn eigen lidwoord meebrengt, kan maar in één zinsbouw staan;
 * "a one-off …", "just …" en "for a …" willen er alle drie iets anders voor. Dus
 * draagt de aanroeper het lidwoord en deze zin alleen de bewering.
 */
export const TEST_SAMPLE = {
  en: {
    name: 'Test sample',
    /* De kop van /test-sample. Hier en niet op die pagina, om dezelfde reden als
       `line` hieronder: de proef wordt op meer dan één plek aangekondigd, en een
       kop die per pagina is overgetypt, is de kop die na de volgende
       herformulering nog het oude zegt. Sinds 13 augustus 2026 leest
       OrderFlow.astro hem in `mode="sample"`. */
    h: 'Test VISUAILS with 1 product',
    price: euro(AMOUNT.testSample, 'en'),
    unit: 'one per business',
    feeNote: `${euro(AMOUNT.testSample, 'en')} fee to prevent abuse`,
    /*
     * ── WAT JE KRIJGT, IN ÉÉN ZIN (9 augustus 2026) ──────────────────────────
     *
     * Lucas: *"er staat nu 4 catalog set of Carousel, zet er lifestyle Carousel
     * bij om het duidelijk te maken. Er zijn teveel zinnen gewoon niet duidelijk.
     * Zeg gewoon wat het is."*
     *
     * Dit werd op ACHT verschillende manieren gezegd — "4 catalog images or a
     * carousel of 3", "one product in full", "a catalog set or a carousel",
     * "4 catalogbeelden of een carousel van 3" — en de helft daarvan noemde het
     * woord lifestyle niet. "A carousel of 3" is dan een carousel van drie wát,
     * en waarvan.
     *
     * Beide dingen worden nu bij hun naam genoemd, met hun aantal, en beide keren
     * met het woord foto’s erbij. Dat is de hele regel: geen omschrijving waar een
     * getal hoort, en geen naam zonder aantal.
     *
     * Eén constante en geen zin per pagina, om dezelfde reden als feeNote
     * hierboven: acht formuleringen zijn acht plekken waar de volgende
     * verduidelijking weer half blijft steken.
     */
    deliverable: `${CATALOG_IMAGES} catalog photos or a lifestyle carousel of ${LIFESTYLE_IMAGES} photos`,
    /* ── DE KORTE VORM, VOOR DE BALK ONDERAAN — 23 AUGUSTUS 2026 ────────────
       Dezelfde afspraak als bij reviewClaimShort hierboven: de korte vorm mag
       MINDER zeggen, nooit iets anders. Wat eruit gaat is het woord "lifestyle"
       en het tweede "photos"; wat erin blijft zijn de twee aantallen en het feit
       dat het jóuw product is — precies de drie dingen waarvoor iemand op die
       knop drukt. De rest staat achter het vraagteken ernaast. */
    deliverableShort: `${CATALOG_IMAGES} catalog photos or a carousel of ${LIFESTYLE_IMAGES}`,
    // Niet "one image". Eén product, volledig geleverd — precies wat een betaalde
    // bestelling per product oplevert, en dat is de hele reden dat de proef iets
    // bewijst.
    line: `${CATALOG_IMAGES} catalog photos or a lifestyle carousel of ${LIFESTYLE_IMAGES} photos, your choice, finished the way a paid order is.`,
    catalogLine: `${CATALOG_IMAGES} images — front, back, a fabric or logo detail, and one on a model.`,
    lifestyleLine: `${LIFESTYLE_IMAGES} photos in one styled look — a scene, one on a model, and a detail close-up.`,
  },
  nl: {
    name: 'Proefvisual',
    h: 'Test VISUAILS met 1 product',
    price: euro(AMOUNT.testSample, 'nl'),
    unit: 'één per bedrijf',
    // Geen "vergoeding" of "bijdrage" — dat zijn de woorden waarmee je een bedrag
    // mooier maakt dan het is, en dan ben je terug bij het probleem met
    // "verificatie". Je betaalt €1, en dat houdt misbruik tegen. Meer is het niet.
    feeNote: `${euro(AMOUNT.testSample, 'nl')} om misbruik te voorkomen`,
    deliverable: `${CATALOG_IMAGES} catalogbeelden of een lifestyle-carousel van ${LIFESTYLE_IMAGES} foto’s`,
    // Zie de noot bij de Engelse deliverableShort.
    deliverableShort: `${CATALOG_IMAGES} catalogbeelden of een carousel van ${LIFESTYLE_IMAGES}`,
    line: `${CATALOG_IMAGES} catalogbeelden of een lifestyle-carousel van ${LIFESTYLE_IMAGES} foto’s, jij kiest, afgewerkt zoals bij een betaalde bestelling.`,
    catalogLine: `${CATALOG_IMAGES} beelden — voorkant, achterkant, een stof- of logodetail, en één op een model.`,
    lifestyleLine: `${LIFESTYLE_IMAGES} foto’s in één gestylede look — een scène, één op een model, en een detailclose-up.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8 · THE ANCHOR — what a full-day production costs.
//
// FLAGGED (AUDIT-TASK-0.md §H flag 2): this range is the brief's figure and is
// not sourced. It is presented as the cost of a full DAY of production with
// every line counted, not as "what a shoot costs", and it is itemised by
// category. No per-line euro figures are invented — the brief's standing rule
// is never to invent metrics, and a made-up "photographer: €600" would be one.
// ─────────────────────────────────────────────────────────────────────────────

export const SHOOT_DAY = {
  en: {
    range: euroRange(AMOUNT.shootDayLow, AMOUNT.shootDayHigh, 'en'),
    basis: 'A full production day, everything counted',
    items: ['Photographer', 'Studio or location', 'Model', 'Styling', 'Retouching', 'Your own day'],
    caveat: 'Ranges widely by city, by studio and by how much of it you do yourself.',
  },
  nl: {
    range: euroRange(AMOUNT.shootDayLow, AMOUNT.shootDayHigh, 'nl'),
    basis: 'Een volledige productiedag, alles meegerekend',
    items: ['Fotograaf', 'Studio of locatie', 'Model', 'Styling', 'Retouche', 'Je eigen dag'],
    caveat: 'Loopt sterk uiteen per stad, per studio en per hoeveel je zelf doet.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9 · THE ACCESSOR — what pages import.
// ─────────────────────────────────────────────────────────────────────────────

// getPricing() and `export default getPricing` were here. getPricing() existed
// to bundle PACKAGES and PER_PRODUCT for a caller that never arrived; with
// PACKAGES gone it bundled one thing, and nothing imported either.
