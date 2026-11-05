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
   de muis (en bij focus op de link) met CSS.

   LEVERING 68 (24 oktober 2026, lijst 55 logo a): geen elektrische lijn meer. Het woordmerk
   staat stil en zijn kleur schommelt van inkt naar blauw uur en terug: een tweede pad in
   blauw (.mk-kleur) op de vulling, en alleen de dekking beweegt (global.css en de kopie
   in account.css, admin.css en portal.css).

   LEVERING 86 (3 november 2026, lijst 72 logo a en schommel a): op een lichte grond staat het
   woordmerk in de snede, de fade van blauw diep naar #2D61A8 langs de snede (126,87°), en de
   schommel loopt naar dezelfde fade een stap lichter. Dezelfde twee fades als #vs-w-snede en
   #vs-w-licht in Layout.astro, maar met een eigen naam (vs-wi-), want deze pagina's hebben de
   symbolen van Layout.astro niet. Per pagina staat het woordmerk één keer. Welke plek de fade
   krijgt, zet de css (studio-hal.css, admin.css, account.css, portal.css); op een donkere grond
   blijft het woordmerk licht, met de schommel in blauw licht. */
const WM_FADES = '<defs>'
  + '<linearGradient id="vs-wi-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-797.25" x2="3367.43" y2="1728.32"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient>'
  + '<linearGradient id="vs-wi-licht" gradientUnits="userSpaceOnUse" x1="0" y1="-797.25" x2="3367.43" y2="1728.32"><stop offset="0" stop-color="#25508B"/><stop offset=".55" stop-color="#2D61A8"/><stop offset="1" stop-color="#44699D"/></linearGradient>'
  + '</defs>';
export function woordmerkSvg(klasse = 'woordmerk') {
  return `<svg class="${klasse} mk" viewBox="${WORDMARK_VIEWBOX}" aria-hidden="true" focusable="false">${WM_FADES}<path class="mk-fill" fill-rule="evenodd" d="${WOORDMERK.d}"/><path class="mk-kleur" fill-rule="evenodd" d="${WOORDMERK.d}"/></svg>`;
}
