// VISUAILS — het woordmerk als pad, voor plekken buiten Layout.astro.
//
// Layout.astro draagt het woordmerk als <symbol id="woordmerk">; VISUAILS Studio
// en de losse kaarten van account.js (inloggen, foutpagina's) hebben een eigen
// <head> en kunnen daar niet bij, dus zetten ze het pad inline.
//
// 14 oktober 2026: dit was het oude woordmerk (viewBox 0 0 1650 278, uit een
// export, met een transform). Lucas: *"Pas in /studio ook de nieuwe logo's
// toe."* Nu is het de merkletter uit src/data/woordmerk.js — hetzelfde pad als
// in de hal, niet opnieuw getekend. Eén vorm, even-oneven gevuld.
//
// DE V IS DE EERSTE LETTER. In het pad loopt hij van x 0 tot 702 (de V tot
// 662,8, het blaadje tot 702); de I begint op 826,7. V_TOT is de grens waarop
// Studio het woordmerk afknipt als de zijbalk dicht is: daar blijft de V over,
// zonder iets van de I.
import { WOORDMERK, WOORDMERK_LIJNEN } from './woordmerk.js';

export const WORDMARK_VIEWBOX = WOORDMERK.symbool;
export const WORDMARK_TRANSFORM = '';
export const WORDMARK_PATHS = [WOORDMERK.d];
export const WORDMARK_BREED = WOORDMERK.breed;
export const WORDMARK_HOOG = WOORDMERK.hoog;
export const V_TOT = 740;

/* HET WOORDMERK MET DE ELEKTRISCHE LIJN (levering 57, 17 oktober 2026; Lucas, afvinklijst
   35, v35-studio a: "ook daar het logo-effect"). Dezelfde opbouw als Woordmerk.astro
   met electro op de site: eerst de lijn (per deel een pad, pathLength 100 en
   vector-effect op elk pad, want die erven niet), dan de vulling erop (het ene
   even-oneven pad). De beweging staat in global.css (.mk, mk-electro) en, voor de
   pagina's die global.css niet laden, als kopie in account.css, admin.css en
   portal.css. Inline in plaats van <use>, want Studio, /admin en de privélink
   hebben de symbolen van Layout.astro niet. Geen script nodig: de lijn komt onder
   de muis (en bij focus op de link) met CSS. */
export function woordmerkSvg(klasse = 'woordmerk') {
  const lijn = WOORDMERK_LIJNEN.map((d) => `<path pathLength="100" vector-effect="non-scaling-stroke" d="${d}"/>`).join('');
  return `<svg class="${klasse} mk" viewBox="${WORDMARK_VIEWBOX}" aria-hidden="true" focusable="false"><g class="mk-line mk-line-a">${lijn}</g><path class="mk-fill" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
}
