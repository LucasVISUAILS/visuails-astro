// VISUAILS — het tekstlogo als pad, voor plekken buiten Layout.astro.
//
// Layout.astro draagt het tekstlogo als <symbol id="woordmerk">; VISUAILS Studio
// en de losse kaarten van account.js (inloggen, foutpagina's) hebben een eigen
// <head> en kunnen daar niet bij, dus zetten ze het pad inline.
//
// Sinds levering 89 (5 november 2026) is dit het tekstlogo K5 uit src/data/woordmerk.js: hetzelfde pad
// als in de hal, niet opnieuw getekend. Eén vorm, even-oneven gevuld.
//
// DE V IS NIET MEER HET V-MERK. Tot levering 88 was de eerste letter het V-merk zelf, en knipte Studio het
// woordmerk af tot alleen die V over was als de zijbalk dicht ging (V_TOT = 740). In K5 is de V een letter, en
// de I komt er met een schuine naad uit (de I begint op 651,7, de V loopt tot 684,4): afknippen laat altijd een
// stukje I zien. Dicht toont Studio daarom het V-merk zelf (vMerkSvg hieronder, studio.css).
import { kies, stukUrl } from './stukken.js';
import { WOORDMERK, WOORDMERK_LIJNEN, snedeAttr } from './woordmerk.js';

export const WORDMARK_VIEWBOX = WOORDMERK.symbool;
export const WORDMARK_TRANSFORM = '';
export const WORDMARK_PATHS = [WOORDMERK.d];
export const WORDMARK_BREED = WOORDMERK.breed;
export const WORDMARK_HOOG = WOORDMERK.hoog;

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
  + `<linearGradient id="vs-wi-snede" ${snedeAttr()}>` + '<stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient>'
  + `<linearGradient id="vs-wi-licht" ${snedeAttr()}>` + '<stop offset="0" stop-color="#25508B"/><stop offset=".55" stop-color="#2D61A8"/><stop offset="1" stop-color="#44699D"/></linearGradient>'
  + '</defs>';
/* HET VENSTER (levering 89, lijst 82 E7): onder de muis een venster op een stukje snede zonder roze in plaats van
   de schommel (zie VMerk.astro). Hier inline: een knipvorm met het tekstlogo zelf (in de maten van deze viewBox)
   en het stukje als <image>. Op een donkere grond (donker thema in /admin en /account) blijft de schommel: daar
   zet de css het venster uit. */
export function woordmerkSvg(klasse = 'woordmerk') {
  const [x, y, b, h] = WORDMARK_VIEWBOX.split(' ');
  const raam = `<clipPath id="vs-wi-raam" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd" d="${WOORDMERK.d}"/></clipPath>`
    + `<image class="mk-raam" href="${stukUrl(kies('raam', klasse))}" x="${x}" y="${y}" width="${b}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#vs-wi-raam)"/>`;
  return `<svg class="${klasse} mk mk-venster" viewBox="${WORDMARK_VIEWBOX}" aria-hidden="true" focusable="false">${WM_FADES}<path class="mk-fill" fill-rule="evenodd" d="${WOORDMERK.d}"/><path class="mk-kleur" fill-rule="evenodd" d="${WOORDMERK.d}"/>${raam}</svg>`;
}

/* HET V-MERK INLINE (levering 89): voor de dichte zijbalk van Studio, waar het tekstlogo niet meer tot zijn V
   afgeknipt kan worden. Dezelfde twee paden als #markglyph (V_D), in de snede (vs-vi-snede, de fade in de maten
   van de V: 839,64 · 629,73). Staat nooit tegelijk met het tekstlogo in beeld: de css toont het een of het ander. */
const V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
  'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z'];
export function vMerkSvg(klasse = 'vmerk') {
  return `<svg class="${klasse}" viewBox="0 0 702 813.25" aria-hidden="true" focusable="false"><defs><linearGradient id="vs-vi-snede" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="839.64" y2="629.73"><stop offset="0" stop-color="#1A4279"/><stop offset=".55" stop-color="#25508B"/><stop offset="1" stop-color="#2D61A8"/></linearGradient></defs>${V_D.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
