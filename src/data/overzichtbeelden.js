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
 * Het zijn echte beelden uit echte bestellingen. Als er ooit nieuwe komen — en
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

const CATALOG = [
  { src: '/img/ba2-na-front.webp', nl: 'Vooraanzicht op wit', en: 'Front view on white' },
  { src: '/img/ba2-na-achter.webp', nl: 'Achterkant op wit', en: 'Back view on white' },
  { src: '/img/ba2-na-detail.webp', nl: 'Detail van de knoop', en: 'Button detail' },
  { src: '/img/ba2-na-model.webp', nl: 'Gedragen door een model', en: 'Worn by a model' },
];

const LIFESTYLE = [
  { src: '/img/lifestyle-band-01.webp', nl: 'Lifestylebeeld op locatie', en: 'Lifestyle image on location' },
  { src: '/img/lifestyle-band-04.webp', nl: 'Lifestylebeeld, tweede look', en: 'Lifestyle image, second look' },
  { src: '/img/lifestyle-flash-02.webp', nl: 'Lifestylebeeld met flits', en: 'Lifestyle image with flash' },
];

/* Twee van elk: dat is letterlijk wat één product op een compleet pakket en op
   elk abonnement oplevert — een catalogset én een lifestyle-carrousel.

   NIET de eerste twee uit CATALOG. Dat waren het voor- en achteraanzicht van
   dezelfde broek op wit, en op 90 pixels breed zijn die twee niet uit elkaar te
   houden: de strook las als hetzelfde beeld twee keer, precies het tegendeel
   van wat hij moet laten zien. Het vooraanzicht en het detail verschillen wél
   op die maat, en samen vertellen ze ook beter wat een catalogset is. */
const BEIDE = [CATALOG[0], CATALOG[2], ...LIFESTYLE.slice(0, 2)];

const PER_DIENST = {
  catalog: CATALOG,
  lifestyle: LIFESTYLE,
  complete: BEIDE,
  drop: BEIDE,
  /* De abonnementsplaat: geen dienst uit /api/order maar een eigen sleutel,
     zodat een wijziging aan `complete` niet stilletjes de plannen verandert. */
  plan: BEIDE,
};

/**
 * De tegels voor één dienst, met de alt-tekst al in de goede taal.
 * @param {string} service  catalog | lifestyle | complete | drop | plan | …
 * @param {'nl'|'en'} lang
 * @returns {Array<{src: string, alt: string}>}  leeg als de dienst er geen heeft
 */
export function tegelsVoor(service, lang) {
  const lijst = PER_DIENST[service] || [];
  return lijst.map((t) => ({ src: t.src, alt: (lang === 'nl' ? t.nl : t.en) }));
}

/* De noot die onder elke strook hoort: dit zijn echte beelden, en wat de klant
   stuurt bepaalt hoe die van hem eruitzien. Zonder die regel leest een strook
   als een belofte over ZIJN product, en dat is hij niet. */
export const ECHTE_BESTELLING = {
  nl: 'Een voorbeeld van een echte bestelling. Wat jij stuurt bepaalt hoe die van jou eruitziet.',
  en: 'An example from a real order. What you send decides how yours looks.',
};
