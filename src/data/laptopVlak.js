// VISUAILS — de maten van de laptopplaat, op één plek.
//
// Deze vier percentages beschrijven waar het LAPTOPSCHERM in
// public/img/laptop/overlay.png is uitgesneden, en de vier daaronder waar het
// TELEFOONSCHERM zit. Ze zijn met een vloedvulling uit de bron gemeten en niet
// geschat: de vulling loopt vanuit het midden van het scherm en stopt vanzelf
// op de zwarte rand, dus de ronde hoeken, de notch én de plek waar de telefoon
// eroverheen valt zitten er automatisch goed in.
//
//     gemeten op de bron van 2688 x 1520
//     laptopscherm  x 401..2309, y 244..1401   ->  1909 x 1158
//     telefoon      x 1822..2201, y 643..1442  ->   380 x 800
//
// Ze staan hier en niet in een component omdat inmiddels meer dan één ding ze
// nodig heeft. Twee kopieën van deze getallen is één kopie die ooit stil gaat
// afwijken, en dan schuiven de beelden onder het gat vandaan zonder dat een
// test daarop slaat.
//
// Wat NIET mag: de plaat bijsnijden. De percentages zijn relatief, dus een
// andere maat is prima zolang de verhouding klopt; een uitsnede verschuift ze
// allemaal tegelijk.

export const VLAK = { links: 14.9182, boven: 16.0526, breed: 71.0193, hoog: 76.1842 };
export const FON = { links: 67.7827, boven: 42.3026, breed: 14.1369, hoog: 52.6316 };

/* De verhouding van de PLAAT, voor de aspect-ratio van de doos. Zonder deze
   springt de pagina tijdens het laden. */
export const PLAAT = 2688 / 1520;

/* De verhouding van het SCHERM. Beelden die hier niet aan voldoen worden
   bijgesneden (object-fit: cover) en niet uitgerekt. */
export const SCHERM = 1909 / 1158;

/* Waar de telefoon begint, als aandeel van het SCHERM en niet van de plaat.
   Dit getal bepaalt de hele opmaak van een nagebouwd scherm: alles wat gelezen
   moet worden staat links ervan, alles wat mag wegvallen erachter. */
export const FON_IN_SCHERM = (FON.links - VLAK.links) / VLAK.breed; // 0,7444

export const OVERLAY = '/img/laptop/overlay.png';
export const overlayAlt = (lang) =>
  lang === 'nl'
    ? 'Een laptop op een tafel met daarvoor een hand die een telefoon vasthoudt'
    : 'A laptop on a desk with a hand holding a phone in front of it';
