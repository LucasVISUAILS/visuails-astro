/**
 * VISUAILS — DE VOORBEELDSET. 22 september 2026.
 *
 * Eén product, één keer gefotografeerd, één keer afgewerkt: de roze jeans
 * (ba2-*). Dit is de set die de site gebruikt om te TONEN wat er gebeurt —
 * op de voorpagina (LopendeBand.astro) en op /how-it-works (Stations.astro).
 *
 * Hij stond in LopendeBand.astro. Zodra /how-it-works dezelfde beelden nodig
 * had, moest de lijst hierheen: twee kopieën van vijf paden en tien alt-teksten
 * zijn twee lijsten die uit elkaar lopen zodra Lucas één foto vervangt.
 *
 * width/height staan erbij zoals de bestanden in public/img zijn — zonder die
 * twee reserveert de browser geen ruimte en springt de pagina tijdens het laden.
 */

/** Wat de klant instuurde: telefoonfoto's, staand. */
export function ingestuurd(lang = 'en') {
  const nl = lang === 'nl';
  return [
    { src: '/img/ba2-voor-front.webp', w: 760, h: 1013,
      alt: nl ? 'Telefoonfoto: een roze jeans plat op een betonnen magazijnvloer, voorkant' : 'Phone photo: pink jeans flat on a concrete warehouse floor, front' },
    { src: '/img/ba2-voor-achter.webp', w: 760, h: 1013,
      alt: nl ? 'Telefoonfoto: dezelfde jeans omgedraaid, achterkant' : 'Phone photo: the same jeans turned over, back' },
    { src: '/img/ba2-voor-detail.webp', w: 760, h: 1013,
      alt: nl ? 'Telefoonfoto: een hand houdt de tailleband met de knoop omhoog' : 'Phone photo: a hand holding up the waistband with the button' },
    { src: '/img/ba2-voor-textuur.webp', w: 760, h: 1013,
      alt: nl ? 'Telefoonfoto: het weefsel van dichtbij, tussen twee vingers' : 'Phone photo: the fabric up close, between two fingers' },
    { src: '/img/ba2-voor-pasvorm.webp', w: 760, h: 1013,
      alt: nl ? 'Spiegelselfie waarop de jeans gedragen wordt' : 'Mirror selfie showing the jeans being worn' },
  ];
}

/** Wat er terugkwam: de catalogset, vierkant. */
export function geleverd(lang = 'en') {
  const nl = lang === 'nl';
  return [
    { src: '/img/ba2-na-front.webp', w: 760, h: 760,
      alt: nl ? 'Afgewerkt catalogbeeld: de jeans recht van voren op wit' : 'Finished catalog image: the jeans straight on, on white' },
    { src: '/img/ba2-na-achter.webp', w: 760, h: 760,
      alt: nl ? 'Afgewerkt catalogbeeld: de achterkant op wit' : 'Finished catalog image: the back, on white' },
    { src: '/img/ba2-na-detail.webp', w: 760, h: 760,
      alt: nl ? 'Afgewerkt detailbeeld: de knoop en de tailleband van dichtbij' : 'Finished detail image: the button and waistband up close' },
    { src: '/img/ba2-na-model.webp', w: 760, h: 760,
      alt: nl ? 'Afgewerkt beeld: de jeans gedragen door een model' : 'Finished image: the jeans worn by a model' },
  ];
}

/** De vormen waaruit je kiest voor een catalogbestelling — ÉÉN per bestelling.
 *  Ronde 8 (1 oktober 2026): hier stond "hetzelfde product in drie vormen" met
 *  1:1, 4:5 en 9:16, en een bezoeker las daaruit dat hij alle drie krijgt. Hij
 *  krijgt er één (zie src/data/ratios.js), en 9:16 bestaat voor catalog niet
 *  eens. Nu staan hier de drie vormen van CATALOG_RATIOS, met de eerste als
 *  gekozen. */
export function vormen(lang = 'en') {
  const nl = lang === 'nl';
  return [
    { src: '/img/ba2-na-front.webp', ratio: '1 / 1', maat: '1:1', gekozen: true, waar: nl ? 'gekozen · je webshop' : 'chosen · your shop',
      alt: nl ? 'Het vierkante catalogbeeld zoals het in een webshop staat' : 'The square catalog image as it sits in a shop' },
    { src: '/img/ba2-na-model.webp', ratio: '4 / 5', maat: '4:5', waar: nl ? 'kan ook · advertentie' : 'also possible · ad',
      alt: nl ? 'Hetzelfde beeld in 4:5, de andere keuze voor een advertentie' : 'The same image in 4:5, the other choice for an ad' },
    { src: '/img/ba2-na-detail.webp', ratio: '3 / 4', maat: '3:4', waar: nl ? 'kan ook · staande pagina' : 'also possible · upright page',
      alt: nl ? 'Het detailbeeld in 3:4, de staande keuze' : 'The detail image in 3:4, the upright choice' },
  ];
}

/** Het bestelnummer op de tekening van het portaal. Verzonnen, en het moet
 *  verzonnen blijven: dit is een tekening, geen klant. */
export const VOORBEELD_REF = 'VIS-2608-4471';
