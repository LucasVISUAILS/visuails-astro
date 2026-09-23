/*
 * VISUAILS — DE LEVERINGEN IN DE GALERIJ. 23 september 2026.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"gallery mock ups met meerdere producten zodat het wel als een gallery
 * aanvoelt (…) Deze foto's zijn nu in de maak dus plaats voor nu overal de roze
 * jeans als placeholder."* En: *"per service categorie laten sorteren (…) en
 * wellicht ook op type product."*
 *
 * EEN LIJST, GEEN PAGINA. Elke rij is één levering zoals hij in de galerij staat:
 * de dienst (het filter), de productsoort (het tweede filter), het product en
 * het bestelnummer. De beelden komen voorlopig allemaal uit voorbeeldset.js — de
 * roze jeans. Een rij met `beelden: 'volgt'` toont die set als PLAATSHOUDER, en
 * de galerij zegt dat op de kaart zelf ("Beelden volgen"): een overshirt met de
 * foto's van een jeans erbij zonder dat erbij te zeggen, zou precies het
 * geleende bewijs zijn dat GalleryPage.astro in augustus weghaalde.
 *
 * ZO VERVANG JE EEN PLAATSHOUDER: zet de echte beelden in public/img, geef de
 * rij een eigen `set` (zelfde vorm als voorbeeldset.js: ingestuurd, geleverd,
 * vormen) en haal `beelden: 'volgt'` weg. De galerij hoeft niet aangeraakt.
 *
 * De bestelnummers zijn verzonnen, net als VOORBEELD_REF, en hebben dezelfde
 * vorm. Geen echte klant, geen echt merk, geen echt adres.
 */
import { VOORBEELD_REF } from './voorbeeldset.js';

/** De diensten waarop gefilterd wordt, in de volgorde van het menu. */
export const DIENSTEN = {
  catalog: { nl: 'Catalog', en: 'Catalog', meta: { nl: 'Catalogset', en: 'Catalog set' } },
  lifestyle: { nl: 'Lifestyle', en: 'Lifestyle', meta: { nl: 'Lifestyle-carousel', en: 'Lifestyle carousel' } },
  complete: { nl: 'Catalog + lifestyle', en: 'Catalog + lifestyle', meta: { nl: 'Catalogset en carousel', en: 'Catalog set and carousel' } },
};

/** De productsoorten. Het tweede filter; staat als keuzemenu zodat de rij rustig blijft. */
export const SOORTEN = {
  broeken: { nl: 'Broeken', en: 'Trousers' },
  shirts: { nl: 'Shirts', en: 'Shirts' },
  truien: { nl: 'Truien', en: 'Knitwear' },
  jassen: { nl: 'Jassen', en: 'Outerwear' },
  rokken: { nl: 'Rokken', en: 'Skirts' },
  accessoires: { nl: 'Accessoires', en: 'Accessories' },
};

export const LEVERINGEN = [
  { id: 'wijde-jeans', ref: VOORBEELD_REF, dienst: 'catalog', soort: 'broeken', product: { nl: 'Wijde jeans', en: 'Wide leg jeans' } },
  { id: 'overshirt', ref: 'VIS-2609-1182', dienst: 'lifestyle', soort: 'shirts', product: { nl: 'Overshirt', en: 'Overshirt' }, beelden: 'volgt' },
  { id: 'wollen-jas', ref: 'VIS-2609-2035', dienst: 'complete', soort: 'jassen', product: { nl: 'Wollen jas', en: 'Wool coat' }, beelden: 'volgt' },
  { id: 'hoodie', ref: 'VIS-2609-2410', dienst: 'catalog', soort: 'truien', product: { nl: 'Hoodie', en: 'Hoodie' }, beelden: 'volgt' },
  { id: 'plooirok', ref: 'VIS-2609-3307', dienst: 'lifestyle', soort: 'rokken', product: { nl: 'Plooirok', en: 'Pleated skirt' }, beelden: 'volgt' },
  { id: 'canvas-tas', ref: 'VIS-2609-3981', dienst: 'catalog', soort: 'accessoires', product: { nl: 'Canvas tas', en: 'Canvas tote' }, beelden: 'volgt' },
  { id: 'linnen-blouse', ref: 'VIS-2609-4526', dienst: 'complete', soort: 'shirts', product: { nl: 'Linnen blouse', en: 'Linen blouse' }, beelden: 'volgt' },
];

/** De diensten en soorten die in de lijst echt voorkomen — een filterknop zonder
 *  levering erachter is een lege belofte. */
export function gebruikteDiensten() {
  return Object.keys(DIENSTEN).filter((d) => LEVERINGEN.some((l) => l.dienst === d));
}
export function gebruikteSoorten() {
  return Object.keys(SOORTEN).filter((s) => LEVERINGEN.some((l) => l.soort === s));
}
