/*
 * ═══════════════════════════════════════════════════════════════════════════
 * WAT ÉÉN PRODUCT OPLEVERT, ALS BEELD
 * 12 september 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas' bezoeker: *"bij het bestelformulier is het gewoon super onduidelijk en
 * niet visueel genoeg wat mensen krijgen voor hun geld waardoor het erg duur
 * lijkt allemaal."*
 *
 * Het antwoord daarop staat sinds gisteren in BestelOverzicht.astro: een strook
 * echte beelden naast het bedrag. Diezelfde strook hoort ook op de plaat van
 * /start/plan te staan, want daar geldt dezelfde klacht — alleen staat daar al
 * een aside, en twee asides naast elkaar is geen overzicht meer.
 *
 * ── WAAROM DE LIJST HIER STAAT EN NIET TWEE KEER IN EEN COMPONENT ───────────
 *
 * Het zijn voorbeeldbeelden en geen klantbestellingen (zie de noot bij
 * ECHTE_BESTELLING onderaan). Als er ooit nieuwe komen — en
 * die komen er, want dit is een portfolio dat groeit — dan wordt één lijst
 * bijgewerkt en niet twee. Twee lijsten die uit elkaar lopen betekent: op het
 * bestelformulier zie je de roze jeans en op de abonnementspagina nog de set
 * van vorig jaar, zonder dat iemand doorheeft dat dat gebeurd is.
 *
 * ── DE MIX PER DIENST IS GEEN DECORATIE ─────────────────────────────────────
 *
 * Een catalogbeeld naast een lifestylebestelling is een belofte die niet klopt.
 * Dus: catalog krijgt catalogbeelden, lifestyle krijgt lifestylebeelden, en
 * alles wat beide levert (complete, drop, elk abonnement) krijgt twee van elk —
 * in die volgorde, want dat is ook de volgorde waarin ze geleverd worden.
 *
 * Bij video staat er niets. "Hoeveel beelden" is daar geen vraag die erover
 * gaat, en een stilstaand beeld van een clip is een belofte die de clip zelf
 * beter doet. Een lege lijst betekent: het blok valt weg, er blijft geen leeg
 * kader achter.
 */

/* ── SCHETSEN IN PLAATS VAN DE ROZE BROEK — 15 oktober 2026 ─────────────────
 * Lucas (afvinklijst 27, k-credits): *"De roze broek fotos mogen aangepast
 * worden naar schetsen omdat dit afleid en niks te maken heeft met wat de klant
 * besteld."* Een foto van iemands broek naast je eigen bestelling leest als
 * "dit krijg jij", en dat klopt nooit. Een schets per beeld zegt wat er komt
 * (voorkant, achterkant, detail, op een model) zonder te doen alsof het jouw
 * product is.
 *
 * De schetsen staan in public/img/schets/ en worden getekend door
 * scripts/schetsen-zijpaneel.py (lijnen in inkt, één neutraal shirt, geen
 * merk). Het label onder elke tegel is de naam van het vak in Studio en op de
 * privélink (levervakken.js), ingekort waar de tegel smal is. */
const S = (naam) => `/img/schets/${naam}.svg`;

const CATALOG = [
  { id: 'front', src: S('catalog-voorkant'), nl: 'Voorkant', en: 'Front', altNl: 'Schets: het product van voren, op wit', altEn: 'Sketch: the product from the front, on white' },
  { id: 'back', src: S('catalog-achterkant'), nl: 'Achterkant', en: 'Back', altNl: 'Schets: het product van achteren, op wit', altEn: 'Sketch: the product from the back, on white' },
  { id: 'detail', src: S('catalog-detail'), nl: 'Detail', en: 'Detail', altNl: 'Schets: een detail van de stof, dichtbij', altEn: 'Sketch: a close-up of the fabric' },
  { id: 'worn', src: S('catalog-model'), nl: 'Op model', en: 'On model', altNl: 'Schets: het product gedragen door een model', altEn: 'Sketch: the product worn by a model' },
];

/* De vier beelden van een carrousel, in de volgorde van LIFESTYLE in levervakken.js. */
const LIFESTYLE = [
  { src: S('lifestyle-voorkant'), nl: 'Voorkant', en: 'Front', altNl: 'Schets: een model met het product, van voren, in een setting', altEn: 'Sketch: a model wearing the product, from the front, in a setting' },
  { src: S('lifestyle-achterkant'), nl: 'Achterkant', en: 'Back', altNl: 'Schets: een model met het product, van achteren, in een setting', altEn: 'Sketch: a model wearing the product, from the back, in a setting' },
  { src: S('lifestyle-product'), nl: 'Product', en: 'Product', altNl: 'Schets: alleen het product, in een setting', altEn: 'Sketch: the product on its own, in a setting' },
  { src: S('lifestyle-detail'), nl: 'Detail', en: 'Detail', altNl: 'Schets: een detail van het product, gedragen door een model', altEn: 'Sketch: a close-up of the product, worn by a model' },
];

/* Twee van elk: dat is wat één product op een abonnement oplevert — een
   catalogset én een lifestylecarrousel. Vier tegels met vier verschillende
   labels, anders lijkt het hetzelfde beeld twee keer. */
const BEIDE = [
  { ...CATALOG[0], nl: 'Op wit', en: 'On white' },
  { ...CATALOG[3] },
  { ...LIFESTYLE[0], nl: 'Lifestyle', en: 'Lifestyle' },
  { ...LIFESTYLE[3] },
];

const PER_DIENST = {
  catalog: CATALOG,
  lifestyle: LIFESTYLE,
  /* 'complete' en 'drop' stonden hier ook; compleet bestaat sinds 14 oktober 2026
     niet meer. De abonnementsplaat houdt zijn eigen sleutel. */
  plan: BEIDE,
};

/**
 * De tegels voor één dienst, met de alt-tekst al in de goede taal.
 * @param {string} service  catalog | lifestyle | complete | drop | plan | …
 * @param {'nl'|'en'} lang
 * @returns {Array<{src: string, label: string, alt: string}>}  leeg als de dienst er geen heeft
 */
export function tegelsVoor(service, lang) {
  const lijst = PER_DIENST[service] || [];
  const nl = lang === 'nl';
  /* `id` (15 oktober 2026, werklijst 27): het vak van een catalogbeeld, zodat
     "Wat je krijgt" per beeld de achtergrond kan tonen en kiezen. */
  return lijst.map((t) => ({ id: service === 'catalog' ? t.id || '' : '', src: t.src, label: nl ? t.nl : t.en, alt: nl ? t.altNl : t.altEn }));
}

/* De noot die onder elke strook hoort: dit zijn echte beelden, en wat de klant
   stuurt bepaalt hoe die van hem eruitzien. Zonder die regel leest een strook
   als een belofte over ZIJN product, en dat is hij niet. */
/* ── GEEN "ECHTE BESTELLING" MEER — 12 oktober 2026 ──────────────────────
   Jouw regel: een voorbeeldbeeld heet geen echte bestelling. De catalogbeelden
   zijn de voorbeeldset (de roze jeans, voorbeeldset.js) en de lifestylestrook
   mengt looks van verschillende producten, dus de noot zegt alleen wat ze zijn:
   voorbeeldbeelden. De naam van de constante blijft, zodat de twee aanroepers
   (BestelOverzicht, PlanPicker) niet hoeven te veranderen. */
/* 15 oktober 2026: schetsen in plaats van voorbeeldbeelden, dus de noot zegt dat. */
export const ECHTE_BESTELLING = {
  nl: 'Een schets per beeld. Wij maken ze van jouw product, met de foto’s die je stuurt.',
  en: 'One sketch per image. We make them of your product, from the photos you send.',
};
