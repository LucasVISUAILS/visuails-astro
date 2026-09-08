// VISUAILS — the capacity gate. Section 10 of the brief.
//
// WHY THIS FILE EXISTS
// The brief carries one absolute rule about time: **never promise a delivery
// date the capacity gate hasn't cleared.** Every other constraint in the
// repositioning is a matter of taste; that one is a promise a one-person studio
// can be held to in writing. /terms §6 now says outright that "a date we have
// not reserved capacity for is not a date". This file is the thing that makes
// that sentence true rather than decorative.
//
// It is pure arithmetic. No database, no fetch, no Date.now() at module scope —
// every function takes the day it should treat as "today" as an argument, so
// the same code runs in a Pages Function, in a page's frontmatter and in a test
// with a frozen clock and gives the same answer. The database supplies two
// things and nothing else: which days are blacked out, and what is already
// booked. The rules live here.
//
// WHY PRODUCTS PER DAY AND NOT DROPS PER WEEK
// AUDIT-TASK-0.md §H·4 is explicit: "I'd want the ceiling constant set
// deliberately (products/48h, not drops/week) before /start ships a date the
// site is bound to." Drops-per-week cannot express the difference between a
// Drop Pilot of 8 and a Full Drop of 30, so a calendar built on it would clear
// dates it cannot keep. The unit is a product-day.
//
// ─────────────────────────────────────────────────────────────────────────────
// VOOR LUCAS — PUNTEN_PER_DAG IS EEN UITSPRAAK OVER DE STUDIO EN GEEN
// ONTWERPBESLUIT. HET IS HET ENE GETAL IN DIT BESTAND DAT IK NIET VOOR JE KAN
// ZETTEN.
//
// Alles hieronder is eruit afgeleid, en het is waar de site aan vastzit zodra
// /start een dag aanbiedt. Klopt het niet, dan klopt het op één plek niet:
// verander PUNTEN_PER_DAG en de hele agenda schuift mee. De asserties onderaan
// zeggen meteen of een nieuwe waarde de grootste bestelling niet meer in het
// venster laat passen waarmee hij verkocht wordt.
//
// ── 100 EN NIET MEER 126 — 7 september 2026 ──────────────────────────────────
//
// Hier stond PRODUCTS_PER_DAY = 18, en de punten werden daaruit afgeleid: 18 × 7
// = 126. Lucas draaide dat om en zette het plafond zelf op 100 punten, met de
// waarschuwing erbij gelezen dat dat ongeveer een vijfde minder capaciteit is.
// Het is nu dus andersom: het PUNTENPLAFOND is het getal dat hij zet, en het
// aantal producten volgt eruit — veertien complete producten op een dag in
// plaats van achttien.
//
// Waarom dat de goede kant op is: een punt is geen product. Een dag waarop hij
// alleen lifestyle-clips maakt, gaat op tien clips dicht en niet op veertien
// producten, en dat kon "producten per dag" nooit uitdrukken. Het plafond hoort
// dus in de eenheid te staan waarin ALLE diensten meetellen, en het aantal
// producten is daar een gevolg van.
// ─────────────────────────────────────────────────────────────────────────────

import { WINDOW_THRESHOLD, KIND_PUNTEN, puntenVoor, agendaKind } from './pricing.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1 · HET PLAFOND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wat één studiodag aankan, in punten. Zie de vlag hierboven — dit is het getal
 * dat Lucas zet, en het enige in dit bestand dat niet afgeleid is.
 *
 * Eén punt is één afgewerkte foto (KIND_PUNTEN in pricing.js): een catalogset is
 * vier punten, een carrousel drie, een compleet product zeven. Voor video meet
 * een punt tijd en geen bestanden — een lifestyle-clip is één bestand en tien
 * punten. Zie de noot boven KIND_PUNTEN.
 */
export const PUNTEN_PER_DAG = 100;

/** Punten in één compleet product — vier catalog plus een carrousel van drie. */
export const PUNTEN_PER_PRODUCT = KIND_PUNTEN.complete;

/**
 * Complete producten die op een dag passen. AFGELEID, niet gezet: het plafond
 * staat in punten en dit is wat daar aan complete producten in gaat. Naar
 * beneden afgerond, want een half product bestaat niet en naar boven afronden
 * zou een dag verkopen die niet af komt.
 */
export const PRODUCTS_PER_DAY = Math.floor(PUNTEN_PER_DAG / PUNTEN_PER_PRODUCT);

/**
 * Capacity an attended window may never take.
 *
 * Without this the gate is free to sell every day to drops, and Tier 0's
 * "typically 2–4 days" — which the site prints as a promise, not an
 * estimate — quietly stops being true while every individual dashboard still
 * looks green. Section 13 says Tier 0 "always yields to Tier 1 in the capacity
 * gate"; yielding is not the same as starving. This is the floor under the
 * yielding.
 */
export const QUEUE_FLOOR_PER_DAY = 3;

/** What is actually sellable as a reserved window, per day. */
export const ATTENDED_PER_DAY = PRODUCTS_PER_DAY - QUEUE_FLOOR_PER_DAY;

/**
 * A reserved window is two open days — consecutive in the diary, not necessarily
 * in the calendar. See windowFor(): a day that is full or closed is stepped over.
 *
 * De site verkoopt "een leverdatum die we vastleggen" (TIERS.attended.turnaround), en
 * sinds 31 augustus 2026 klopt die zin beter dan hij deed. Zolang het weekend
 * werd overgeslagen, betekende "twee werkdagen" op een vrijdag vier kalenderdagen
 * en was 48 uur de vriendelijke lezing. Nu is het weekend een gewone dag, dus een
 * venster dat vrijdag opent draait vrijdag en zaterdag — mits de studio die
 * zaterdag niet heeft dichtgezet. De klant hoort nog steeds de kalenderdata en
 * nooit "48 uur" als aftelklok.
 */
export const WINDOW_DAYS = 2;

/** The most products one reserved window can hold. */
export const ATTENDED_PER_WINDOW = ATTENDED_PER_DAY * WINDOW_DAYS;

/**
 * Volle dagen tussen vandaag en de eerste dag die een klant kan aanwijzen. Dit is
 * brieftijd en geen productietijd — de producten moeten aankomen en bekeken zijn
 * voordat een dag iets betekent.
 *
 * DE DOCSTRING EN DE REKENKUNDE SPRAKEN ELKAAR TEGEN, EN DE REKENKUNDE VERLOOR.
 * Hier stond "working days BETWEEN an order being complete and the earliest
 * window", en offerableWindows() rekende `addWorkingDays(today, LEAD_DAYS)`. Dat
 * is de tweede dag ná vandaag, en daar ligt maar één hele dag tussen. De poort gaf
 * dus een dag eerder vrij dan dit bestand van zichzelf dacht.
 *
 * Lucas, 31 augustus 2026: *"een klant kan niet de komende 2 dagen kiezen ... het
 * minimum is 2 dagen wachten."* Dat is de lezing van deze docstring en niet die van
 * de oude regel code. Vandaag maandag betekent dinsdag en woensdag wachten, en
 * donderdag is de eerste dag die aan te wijzen is — zie firstOfferableDay(),
 * dat nu de enige plek is waar deze optelling staat.
 */
export const LEAD_DAYS = 2;

/** How far ahead the gate will offer a window at all. */
export const HORIZON_DAYS = 60;

/** Working days the standard queue is allowed to quote. Mirrors Tier 0's copy. */
export const QUEUE_DAYS_MIN = 2;
export const QUEUE_DAYS_MAX = 4;

/**
 * DE STREEFDAG VAN DE WACHTRIJ — 3 september 2026.
 *
 * Lucas: "onder de 10 producten is gewoon zo snel mogelijk leveren, dus dat kan
 * een uur, 2 dagen of een week zijn, nooit beloofd; het streven is altijd binnen
 * 24 uur." De site belooft dus niets meer (pricing.js: "zo snel mogelijk"), en
 * QUEUE_DAYS_MIN/MAX hierboven zijn alleen nog de VORM van de wachtrij voor de
 * poort. Wat de eigen agenda toont als "moet af", is deze dag: binnenkomst plus
 * één open dag. Dat is een lat voor de studio zelf en geen toezegging aan de
 * klant — daarom staat hij hier apart en niet in de klanttekst.
 */
export const QUEUE_AIM_DAYS = 1;

/* ═══════════════════════════════════════════════════════════════════════════
 * DE AGENDA REKENT IN BEELDEN, EN HET WEEKEND TELT MEE — 31 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"alle services moeten passen in de capaciteit niet alleen
 * productfoto's. Dit is een gedeelde agenda voor me."* En: *"ik ben namelijk ook
 * in het weekend gewoon in te plannen."*
 *
 * ── WAAROM PUNTEN EN NIET PRODUCTEN ────────────────────────────────────────
 *
 * De agenda telde producten, en met "product" bedoelde dit bestand een COMPLEET
 * product. Zolang elke bestelling dat was, viel de telling samen met de
 * werkelijkheid. Zodra een klant zijn maand zelf mag vullen, niet meer:
 *
 *   · dertig catalogsets zijn dertig producten voor de poort, maar 120 punten
 *     en geen 210 — de poort weigerde vensters waar het werk in past;
 *   · een clip is geen product en woog dus nul, terwijl hij een dag wel degelijk
 *     vol maakt.
 *
 * Het plafond staat daarom in de eenheid die ALLES kan dragen. KIND_PUNTEN en
 * STYLE_PUNTEN in pricing.js zeggen wat een soort en een stijl kosten, en die
 * twee tabellen zijn de enige plek waar dat staat.
 *
 * DE EENHEID HEETTE "BEELDEN" TOT 7 SEPTEMBER 2026, en dat was raak zolang alles
 * een foto was: een punt is één afgewerkte foto en dat is het nog steeds voor de
 * fotokant. Bij video valt het uit elkaar — een lifestyle-clip is één bestand en
 * tien punten — en een eenheid die "beelden" heet terwijl hij tijd meet, is een
 * getal dat vroeg of laat als aantal foto's op een klantscherm belandt.
 *
 * ── WAAROM HET WEEKEND EEN GEWONE DAG IS ───────────────────────────────────
 *
 * isOpenDay() gaf tot vandaag onwaar voor zaterdag en zondag, en daar hing alles
 * aan: de aanloop, de lengte van een venster, welke dagen een reservering bezet
 * houdt, en de spanne van de wachtrij. Dat was een aanname over de studio en
 * geen feit, en de aanname klopte niet.
 *
 * DE VRIJHEID BLIJFT, ALLEEN OMGEKEERD. Een dag is nu open tenzij hij in
 * `blackouts` staat, en dat is dezelfde lijst die de studio al kon vullen. Wie
 * geen weekend wil werken, zet die dagen dicht — dat is een besluit per week in
 * plaats van een regel in de code, en het is de enige vorm waarin "ik werk soms
 * in het weekend" waar kan zijn zonder iets te beloven.
 *
 * WAT DIT KOST IN WOORDEN staat in de teksten: "werkdag" betekende hier
 * "studiodag", en dat is nu gewoon "dag". De doorlooptijden worden daarmee niet
 * vager maar korter, want een venster hoeft niet meer over een weekend heen.
 */

/** Wat er per dag vrij blijft voor de wachtrij, in punten. */
export const QUEUE_FLOOR_PUNTEN = QUEUE_FLOOR_PER_DAY * PUNTEN_PER_PRODUCT;

/**
 * Wat er per dag te reserveren is, in punten.
 *
 * Uit het PLAFOND en niet uit ATTENDED_PER_DAY × 7. Dat tweede rondde twee keer
 * af — eerst bij PRODUCTS_PER_DAY en dan nog eens hier — en gooide zo punten weg
 * die er wel degelijk zijn. Het plafond min de wachtrijbodem is precies wat er
 * overblijft.
 */
export const ATTENDED_PUNTEN_PER_DAG = PUNTEN_PER_DAG - QUEUE_FLOOR_PUNTEN;

/** Wat één venster van twee open dagen kan houden, in punten. */
export const ATTENDED_PUNTEN_PER_VENSTER = ATTENDED_PUNTEN_PER_DAG * WINDOW_DAYS;

/**
 * Het grootste aantal producten dat één venster kan houden, over alle diensten heen.
 *
 * De lichtste gewogen soort bepaalt dit: een lifestylecarrousel kost drie punten, dus
 * er passen er meer in een venster dan complete producten, die er zeven kosten.
 * ATTENDED_PER_WINDOW blijft het getal voor complete producten — dat is wat de site
 * bedoelt als er "producten" staat zonder dienst erbij.
 *
 * WAAROM DIT BESTAAT EN NIET IEDEREEN ZIJN EIGEN MAXIMUM UITREKENT: het
 * bestandsplafond in src/lib/uploads.js moet de grootste bestelling dekken die het
 * formulier kan TEKENEN, en dat is niet meer dertig sinds het formulier per dienst
 * telt. Een plafond dat los gekozen is, loopt bij de volgende wijziging weer achter.
 */
export const MAX_PRODUCTS_ANY_SERVICE = Math.max(
  ...Object.values(KIND_PUNTEN)
    .filter((per) => per !== null)
    .map((per) => Math.floor(ATTENDED_PUNTEN_PER_VENSTER / per))
);

/* ── HOE VER EEN VENSTER MAG UITREKKEN ──────────────────────────────────────
 *
 * Lucas: *"als de klant 4 september kiest en 5 en 6 zijn vol, dan krijgt de klant
 * 4 en 7 september omdat er altijd 2 dagen achter elkaar gekozen moeten worden."*
 * Achter elkaar in de AGENDA dus, niet in de kalender: het paar springt over
 * dagen heen die vol of dicht zijn.
 *
 * FLAGGED FOR LUCAS — dit getal is een keuze en geen afgeleide. Zonder grens kan
 * een paar over drie weken heen liggen, en "je krijgt ze op 4 of op 26
 * september" is geen belofte meer maar een schouderophalen. Zeven kalenderdagen
 * betekent: de tweede dag ligt hooguit een week na de eerste, en anders is die
 * eerste dag simpelweg niet aan te wijzen. Zet hem hoger als je liever een lelijk
 * paar aanbiedt dan geen paar.
 */
export const WINDOW_MAX_SPAN_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// 2 · DAY ARITHMETIC — UTC, ISO strings, no timezone anywhere.
//
// Every date in this module is a 'YYYY-MM-DD' string and every comparison is a
// string comparison, which for ISO dates is the same as a chronological one.
// Nothing here constructs a Date from a local-time value, so a studio in
// Enschede and a Cloudflare worker in Frankfurt agree on what Tuesday is.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is de studio deze dag open?
 *
 * HEETTE isWorkingDay EN KEEK NAAR DE WEEKDAG. Dat was een aanname over de
 * studio die niet klopte — zie de noot bij WINDOW_MAX_SPAN_DAYS hierboven. Een
 * dag is nu open tenzij hij is dichtgezet, en `blackouts` is de lijst die de
 * studio al had. De naam is meegegaan met de betekenis, want een functie die
 * isWorkingDay heet komt vroeg of laat weer als "werkdag" in een zin terecht.
 */
export function isOpenDay(iso, blackouts = new Set()) {
  return !blackouts.has(iso);
}

/** The ISO day `n` calendar days after `iso`. */
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** De `n`de open dag strikt na `iso`. n=1 is de eerstvolgende open dag. */
export function addOpenDays(iso, n, blackouts = new Set()) {
  let cur = iso;
  let left = n;
  let guard = 0;
  while (left > 0) {
    cur = addDays(cur, 1);
    if (isOpenDay(cur, blackouts)) left -= 1;
    if (++guard > 400) throw new Error('capacity.js: addOpenDays ran away — check blackouts');
  }
  return cur;
}

/**
 * De eerste dag die een klant mag aanwijzen: LEAD_DAYS volle dagen na vandaag.
 *
 * Deze optelling stond op drie plekken (de poort, de figuur op /studio en de
 * demo-agenda) en is nu één functie, zodat er geen tweede kan zijn die er stilletjes
 * van afwijkt.
 */
export function firstOfferableDay(today, blackouts = new Set()) {
  return addOpenDays(today, LEAD_DAYS + 1, blackouts);
}

/**
 * De dagen die een venster bezet als het op `iso` begint — of [] als er geen
 * venster te vormen is.
 *
 * HET PAAR IS TWEE OPEN DAGEN MET RUIMTE, NIET TWEE OPEENVOLGENDE DAGEN. Dit is
 * de regel die Lucas op 31 augustus 2026 gaf: wie 4 september aanwijst en 5 en 6
 * vol ziet staan, krijgt 4 en 7. Een dag die dicht is of vol zit, telt niet mee
 * en wordt overgeslagen; het venster rekt daarvoor op tot hooguit
 * WINDOW_MAX_SPAN_DAYS kalenderdagen en geeft daarna op.
 *
 * `punten` is de last van de order, en die wordt gelijk over de dagen van het
 * venster verdeeld — de pessimistische lezing die dit bestand al hanteert: een
 * order van 158 punten vraagt 79 op elk van twee dagen, niet "158 ergens daarin". Een venster dat werk tussen dagen laat schuiven, is een venster dat
 * een datum vrijgeeft die het later moet verzetten.
 *
 * Roep dit nooit aan met een soort die nog geen gewicht heeft; puntenVoor() geeft
 * daar null en de aanroeper hoort dat af te vangen voordat hij hier komt.
 */
export function windowFor(iso, punten, booked = {}, blackouts = new Set()) {
  if (!isOpenDay(iso, blackouts)) return [];
  const last = addDays(iso, WINDOW_MAX_SPAN_DAYS);
  const perDay = Math.ceil(Math.max(0, Number(punten) || 0) / WINDOW_DAYS);
  const past = (d) => isOpenDay(d, blackouts) && (booked[d] || 0) + perDay <= ATTENDED_PUNTEN_PER_DAG;

  if (!past(iso)) return [];
  const days = [iso];
  let cur = iso;
  while (days.length < WINDOW_DAYS) {
    cur = addDays(cur, 1);
    if (cur > last) return [];
    if (past(cur)) days.push(cur);
  }
  return days;
}

/**
 * De naïeve wandeling: `iso` plus de eerstvolgende open dagen, zonder naar de
 * bezetting te kijken.
 *
 * ALLEEN VOOR OUDE RIJEN. Een bestelling van voor 31 augustus 2026 heeft geen
 * `window_end` opgeslagen, en de dagen die zij bezet houdt moeten dan gereconstrueerd
 * worden. Dat is een blik op het verleden en geen poort: hij mag nooit gebruikt
 * worden om een venster aan te bieden, want hij kan een dag teruggeven die al vol
 * zit. windowFor() hierboven is de enige die dat wél goed doet.
 */
function naiveWindow(iso, blackouts = new Set()) {
  if (!isOpenDay(iso, blackouts)) return [];
  const days = [iso];
  let cur = iso;
  while (days.length < WINDOW_DAYS) {
    cur = addOpenDays(cur, 1, blackouts);
    days.push(cur);
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE GATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Past er een venster dat op `startIso` begint, voor een order van `punten`?
 *
 * `booked` gaat van 'YYYY-MM-DD' naar het aantal punten dat op die dag al is
 * vastgelegd. Een dag die de poort nooit gezien heeft is leeg; een dag in
 * `blackouts` is dicht en wordt overgeslagen in plaats van dat hij het hele
 * venster onmogelijk maakt — dat laatste was de oude regel, en die kon niet
 * blijven staan naast een paar dat over volle dagen heen springt.
 */
export function windowFits(startIso, punten, booked = {}, blackouts = new Set()) {
  return windowFor(startIso, punten, booked, blackouts).length === WINDOW_DAYS;
}

/**
 * Elk venster dat de poort voor deze order heeft vrijgegeven, het eerste eerst.
 *
 * Dit is de ENIGE functie die een datum mag opleveren die een klant te zien
 * krijgt. Geeft hij [] terug, dan zegt /start dat in woorden en biedt aan te
 * overleggen — er is hier met opzet geen "het dichtst in de buurt", zodat niemand
 * er per ongeluk een gok in schrijft.
 *
 * `service` en `products` gaan er samen in en worden hier één getal: het gewicht
 * in punten. Een dienst die nog geen gewicht heeft (video) levert null op en
 * krijgt dus geen venster — precies wat er vandaag ook gebeurt, maar nu omdat de
 * agenda hem niet kan wegen en niet omdat hij toevallig niet op de prijsladder
 * staat.
 */
export function offerableWindows({
  today,
  products,
  service = 'complete',
  booked = {},
  blackouts = new Set(),
  limit = 6,
}) {
  if (!Number.isInteger(products) || products < 1) return [];
  const punten = puntenVoor(service, products);
  if (punten === null) return [];
  if (punten > ATTENDED_PUNTEN_PER_VENSTER) return [];

  const first = firstOfferableDay(today, blackouts);
  const last = addDays(today, HORIZON_DAYS);
  const out = [];

  let cur = first;
  while (cur <= last && out.length < limit) {
    const days = windowFor(cur, punten, booked, blackouts);
    if (days.length === WINDOW_DAYS) {
      out.push({ start: days[0], end: days[days.length - 1], days });
    }
    cur = addDays(cur, 1);
  }
  return out;
}

/**
 * Het volledige antwoord van de poort, in de vorm die /start en het bestel-
 * endpoint allebei nodig hebben.
 *
 * `windows` is in vier verschillende gevallen leeg en de aanroeper mag ze niet
 * tot één "sorry" platslaan: te groot voor één venster, niets vrij binnen de
 * horizon, een aantal dat geen getal is, en een dienst die nog niet gewogen is.
 * Elk krijgt zijn eigen reden zodat de pagina het ware ding kan zeggen.
 *
 * `max` is er in twee eenheden. Producten omdat de site daarin praat, punten
 * omdat de poort daarin rekent — en dat verschil is echt: dertig catalogsets
 * passen wél in een venster en dertig complete producten niet.
 *
 * `maxPunten` heette `maxImages` tot 7 september 2026. Zelfde reden als overal:
 * het getal meet werk en geen bestanden, en een naam die het tweede belooft komt
 * ooit als aantal foto's op een scherm terecht.
 */
export function clearedWindows({ today, products, service = 'complete', booked = {}, blackouts = new Set(), limit = 6 }) {
  const perProduct = puntenVoor(service, 1);
  const maxProducts = perProduct === null ? 0 : Math.floor(ATTENDED_PUNTEN_PER_VENSTER / perProduct);
  const leeg = (reason) => ({ windows: [], reason, max: maxProducts, maxPunten: ATTENDED_PUNTEN_PER_VENSTER, service });

  if (perProduct === null) return leeg('unweighed');
  if (!Number.isInteger(products) || products < 1) return leeg('invalid');
  if (puntenVoor(service, products) > ATTENDED_PUNTEN_PER_VENSTER) return leeg('too-large');

  const windows = offerableWindows({ today, products, service, booked, blackouts, limit });
  return {
    windows,
    reason: windows.length ? 'ok' : 'full',
    max: maxProducts,
    maxPunten: ATTENDED_PUNTEN_PER_VENSTER,
    service,
  };
}

/**
 * INTERNAL ONLY — the studio's own view of when a queue item is due, so it is
 * possible to see one slipping. Not a client-facing number, in any channel.
 *
 * Section 13: "NO named delivery date — show 'typically 2-4 days,' never a date.
 * This is the single most important constraint in this section." That applies to
 * the confirmation email as much as to the page, so /api/capacity deliberately
 * returns QUEUE_DAYS_MIN/MAX as counts and never calls this. The sentence a
 * Tier 0 client actually sees is TIERS.unattended.turnaround, which is a
 * duration, and the two must not be allowed to converge.
 *
 * Note what this does NOT do: it does not consult `booked`. Tier 0 yields, so
 * its span is a statement about the queue's shape, not a reservation. The moment
 * this function starts returning a single date it has become a promise, and it
 * is not allowed to be one.
 */
export function queueSpan(today, blackouts = new Set()) {
  return {
    from: addOpenDays(today, QUEUE_DAYS_MIN, blackouts),
    to: addOpenDays(today, QUEUE_DAYS_MAX, blackouts),
    committed: false,
  };
}

/**
 * Elke dag van `startIso` tot en met `endIso`.
 *
 * Neemt met opzet GEEN blackouts — zie bookedFromRows hieronder voor waarom.
 * Heette weekdaysInRange en sloeg het weekend over; sinds het weekend een gewone
 * dag is, is dat verschil weg en zou de oude naam liegen.
 */
export function daysInRange(startIso, endIso) {
  if (!startIso || !endIso || endIso < startIso) return [];
  const out = [];
  let cur = startIso;
  let guard = 0;
  while (cur <= endIso) {
    if (isOpenDay(cur)) out.push(cur);
    cur = addDays(cur, 1);
    if (++guard > 400) throw new Error('capacity.js: daysInRange ran away — check the stored window');
  }
  return out;
}

/**
 * De vastgelegde last per dag, uit de rijen die de database teruggeeft.
 * Elke rij is { window_start, window_end, product_count, service } van een levende
 * order met een gereserveerd venster.
 *
 * DE LAST IS IN BEELDEN EN NIET IN PRODUCTEN, en sinds 7 september 2026 doet
 * rowPunten() hieronder de vertaling van rij naar gewicht — inclusief video, dat
 * clips telt in plaats van producten. Een rij zonder `service` telt als
 * `complete` — het zwaarste gewicht, en precies wat de poort vóór 31 augustus 2026
 * voor elke order aannam. Oude rijen worden daarmee gelezen zoals ze bedoeld waren
 * en niemand krijgt met terugwerkende kracht meer ruimte dan hij had. Een rij met
 * een soort die nog geen gewicht heeft, kan geen venster hebben en wordt
 * overgeslagen; kwam hij er tóch, dan is dat een gat dat je in het beheerscherm
 * ziet en niet een nul die stilletjes meetelt.
 *
 * WAAROM DIT window_end LEEST EN BLACKOUTS NEGEERT
 * De voetafdruk van een reservering is de reeks waarmee zij is VERKOCHT, niet een
 * reeks die opnieuw tegen de kalender van vandaag wordt uitgerekend. Wordt er na
 * het vrijgeven van een venster een dag dichtgezet, dan zou hercalculeren die
 * order op andere dagen schuiven — of, als de blackout op de startdag valt, hem
 * helemaal uit het zicht van de poort laten vallen, waarna de poort diezelfde
 * dagen vrolijk aan iemand anders verkoopt. Het opgeslagen paar is het bewijs van
 * wat er beloofd is; niets van later mag dat bewerken. schema.sql zegt hetzelfde
 * van de andere kant: een kalenderwijziging verzet geen order, een mens doet dat,
 * na de klant gesproken te hebben.
 *
 * Een rij zonder window_end dateert van voor dat paar werd opgeslagen en valt terug
 * op naiveWindow(). Een reeks zonder enkele open dag bezet alsnog haar startdag in
 * plaats van te verdwijnen — een reservering die de poort niet ziet is precies de
 * ene fout waarvoor dit hele bestand bestaat.
 */
/**
 * Wat één opgeslagen rij in de agenda kost, in punten.
 *
 * ── WAAROM DIT EEN EIGEN FUNCTIE IS — 7 september 2026 ─────────────────────
 *
 * Hier stond `kindImages(r.service || 'complete', r.product_count)`, één regel,
 * en die regel klopte zolang elke bestelling producten telde. Video telt clips
 * en heet in `orders.service` gewoon 'video' — één woord voor drie soorten met
 * drie verschillende gewichten. Beide aannames braken tegelijk, en het gevolg
 * was dat een videobestelling stilletjes werd overgeslagen: geen bezetting, en
 * in het beheerscherm ook geen venster dat je met de hand kon zetten.
 *
 * De soort komt uit agendaKind() (zie pricing.js) en de teller uit het veld dat
 * bij die soort hoort. `clip_count` en NIET `product_count` voor video, en dat
 * is geen smaak: `orders.product_count` betekent overal in dit systeem het
 * aantal producten dat door de fotopijplijn gaat, en er clips in schrijven heeft
 * eerder tierFor() een venster laten beloven, de opwaardeermail een verkeerd
 * getal laten noemen en het portaal "12 producten" laten zetten bij een aanvraag
 * zonder één product erin. Zie de noot bij het clips-veld in functions/api/order.js.
 *
 * Geeft null terug voor een rij die niet te wegen is — een ongewogen soort, een
 * videostijl zonder gewicht, of een teller van nul. bookedFromRows() slaat zo'n
 * rij over, en dat blijft precies wat het was: een gat dat je in het
 * beheerscherm ziet, en niet een nul die stilletjes meetelt.
 */
export function rowPunten(r = {}) {
  const dienst = String(r.service || 'complete').trim();
  const kind = agendaKind(dienst, r.style);
  if (!kind) return null;
  const aantal = dienst === 'video'
    ? Number(r.clip_count) || 0
    : Number(r.product_count) || 0;
  /* De stijl gaat mee zodat STYLE_PUNTEN kan afwijken van de soort. Bij video is
     de stijl al in agendaKind() verwerkt (die kiest de soort ermee); bij foto's
     staat hij hier voor het geval een look ooit zwaarder blijkt te wegen. */
  return puntenVoor(kind, aantal, dienst === 'video' ? '' : r.style);
}

export function bookedFromRows(rows = [], blackouts = new Set()) {
  const booked = {};
  for (const r of rows) {
    const start = r.window_start;
    const punten = rowPunten(r);
    if (!start || !punten) continue;

    let days = r.window_end ? daysInRange(start, r.window_end) : naiveWindow(start, blackouts);
    if (!days.length) days = [start];

    const perDay = Math.ceil(punten / days.length);
    for (const d of days) booked[d] = (booked[d] || 0) + perDay;
  }
  return booked;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · BUILD-TIME ASSERTIONS
//
// Same pattern as assertLadder() in pricing.js, and for the same reason: the
// numbers above are load-bearing against numbers in another file, and a
// contradiction between them is not a rendering bug, it is the site selling a
// window it cannot hold. Fail the build, not the delivery.
// ─────────────────────────────────────────────────────────────────────────────

function assertCapacity() {
  if (QUEUE_FLOOR_PER_DAY >= PRODUCTS_PER_DAY) {
    throw new Error('capacity.js: QUEUE_FLOOR_PER_DAY leaves no attended capacity at all.');
  }
  // RESTATED IN LADDER TERMS. These two checks used to read FULL_DROP_MAX and
  // PILOT_PRODUCTS — the largest and smallest package — and asked whether each
  // fitted in one reserved window. There are no packages any more, so the
  // invariant that survives is the one the site actually promises: from
  // WINDOW_THRESHOLD products up we say an order gets a reserved window, and a
  // window that cannot hold that many makes the promise unkeepable at the very
  // count where it starts being made.
  if (ATTENDED_PER_WINDOW < WINDOW_THRESHOLD) {
    throw new Error(
      `capacity.js: the site promises a reserved window from ${WINDOW_THRESHOLD} products ` +
      `(WINDOW_THRESHOLD in pricing.js), but one window only holds ${ATTENDED_PER_WINDOW}. ` +
      `Either raise PUNTEN_PER_DAG, lower QUEUE_FLOOR_PER_DAY, or raise WINDOW_THRESHOLD — ` +
      `the site must not promise a window the gate can never clear.`
    );
  }
  if (QUEUE_DAYS_MIN >= QUEUE_DAYS_MAX) {
    throw new Error('capacity.js: the queue span is inverted.');
  }
  if (LEAD_DAYS < 1) {
    throw new Error('capacity.js: LEAD_DAYS below 1 offers a window before the brief can be read.');
  }
  if (WINDOW_MAX_SPAN_DAYS < WINDOW_DAYS) {
    throw new Error(
      `capacity.js: WINDOW_MAX_SPAN_DAYS (${WINDOW_MAX_SPAN_DAYS}) is kleiner dan WINDOW_DAYS `
      + `(${WINDOW_DAYS}) — dan kan er nooit een venster gevormd worden, ook niet op een lege agenda.`
    );
  }
  /* HET PLAFOND IN PRODUCTEN MAG NOOIT MEER ZIJN DAN HET PLAFOND IN PUNTEN.
   *
   * Dit was tot 7 september 2026 een gelijkheid, en dat kon toen: het plafond
   * stond in producten en de punten waren daar een veelvoud van, dus ze vielen
   * exact samen. Nu is het plafond een rond getal in punten (100) en volgt het
   * aantal producten daaruit met een afronding naar beneden — elf complete
   * producten is 77 punten van de 79 die er te reserveren zijn, en die twee
   * punten die overblijven zijn geen fout maar de rest van de deling.
   *
   * Wat wél een fout zou zijn, is de andere kant op: een productplafond dat méér
   * punten opeet dan er zijn. Dan verkoopt de site een venster dat de poort
   * daarna weigert. Vandaar `>` en niet `!==`. */
  if (ATTENDED_PER_WINDOW * PUNTEN_PER_PRODUCT > ATTENDED_PUNTEN_PER_VENSTER) {
    throw new Error(
      `capacity.js: ${ATTENDED_PER_WINDOW} complete producten kosten `
      + `${ATTENDED_PER_WINDOW * PUNTEN_PER_PRODUCT} punten, en een venster houdt er `
      + `${ATTENDED_PUNTEN_PER_VENSTER}. Het plafond in producten belooft meer dan het plafond in punten geeft.`
    );
  }
  // DE BELOFTE VAN EEN VENSTER MOET VOOR ELKE DIENST WAAR ZIJN. Vanaf
  // WINDOW_THRESHOLD producten zegt de site dat een order een gereserveerd venster
  // krijgt. Dat geldt nu voor drie soorten met drie gewichten, en de zwaarste
  // bepaalt of de zin waar is.
  for (const [kind, per] of Object.entries(KIND_PUNTEN)) {
    if (per === null) continue;
    if (WINDOW_THRESHOLD * per > ATTENDED_PUNTEN_PER_VENSTER) {
      throw new Error(
        `capacity.js: de site belooft een gereserveerd venster vanaf ${WINDOW_THRESHOLD} producten, `
        + `maar ${WINDOW_THRESHOLD} keer "${kind}" is ${WINDOW_THRESHOLD * per} punten en een venster `
        + `houdt er ${ATTENDED_PUNTEN_PER_VENSTER}. Verhoog PUNTEN_PER_DAG, verlaag QUEUE_FLOOR_PER_DAY, `
        + `of verhoog WINDOW_THRESHOLD — de site mag geen venster beloven dat de poort nooit vrijgeeft.`
      );
    }
  }
}

assertCapacity();
