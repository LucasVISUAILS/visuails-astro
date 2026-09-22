/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HET POPPETJE ALS TEKST — ÉÉN TEKENING VOOR HET FORMULIER EN VOOR /ADMIN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Poppetje.astro tekent hem op de site; /admin is een string-renderer zonder
 * Astro. Dezelfde figuur op twee plekken zou twee tekeningen zijn die uit de pas
 * lopen — dus staat de SVG hier één keer als tekst, en gebruiken beide hem.
 *
 * Wat hij is en waarom hij zo is (drie tinten inkt, één figuur voor acht
 * uitsnedes, twee maten), staat in de kop van Poppetje.astro. Hier alleen de
 * regio's en het kader.
 */

/* Het kader per uitsnede, in de coördinaten van de tekening (140 × 300). */
export const POP_KADERS = {
  lower:  [126, 292],
  upper:  [8, 196],
  full:   [8, 292],
  feet:   [228, 296],
  waist:  [118, 202],
  head:   [4, 74],
  detail: [26, 132],
  figure: [8, 292],
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * @param {object} o
 * @param {string} [o.crop]     uitsnede-id uit garments.js CROPS
 * @param {string} [o.product]  producttype-id — die regio wordt zwart
 * @param {string[]} [o.own]    plekken die de klant zelf heeft aangeleverd — half
 * @param {boolean} [o.klein]   rijgrootte: geen doezel, kader als lijn
 * @param {string} [o.label]    toegankelijke naam; zonder label is hij decoratief
 * @param {string} [o.cls]      extra klasse(n)
 */
export function poppetjeSvg({ crop = 'full', product = '', own = [], klein = false, label = '', cls = '' } = {}) {
  const [y1, y2] = POP_KADERS[crop] || POP_KADERS.full;
  const h = y2 - y1;
  const bekend = Object.prototype.hasOwnProperty.call(POP_KADERS, crop);
  const klassen = ['pop', klein ? 'pop-klein' : '', cls].filter(Boolean).join(' ');
  const attrs = [
    `class="${esc(klassen)}"`,
    'viewBox="0 0 140 300"',
    'data-pop',
    `data-crop="${esc(bekend ? crop : 'full')}"`,
    product ? `data-product="${esc(product)}"` : '',
    own && own.length ? `data-own="${esc(own.join(','))}"` : '',
    `data-kaders='${JSON.stringify(POP_KADERS)}'`,
    label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"',
  ].filter(Boolean).join(' ');
  return `<svg ${attrs}>
  <path class="r r-legs" d="M44 170 L44 260 L39 276 L68 276 L68 260 L68 170 Z"/>
  <path class="r r-legs" d="M72 170 L72 260 L72 276 L101 276 L96 260 L96 170 Z"/>
  <path class="r r-shoes" d="M39 276 L68 276 L70 289 L34 289 Z"/>
  <path class="r r-shoes" d="M72 276 L101 276 L106 289 L70 289 Z"/>
  <path class="r r-bottom" d="M41 148 L99 148 L97 262 L73 262 L70 198 L67 262 L43 262 Z"/>
  <path class="r r-arms" d="M40 64 L24 71 L22 150 L38 152 Z"/>
  <path class="r r-arms" d="M100 64 L116 71 L118 150 L102 152 Z"/>
  <circle class="r r-head" cx="70" cy="34" r="19"/>
  <path class="r r-underlayer" d="M52 56 L88 56 L88 90 L52 90 Z"/>
  <path class="r r-underlayer" d="M42 148 L98 148 L98 162 L42 162 Z"/>
  <path class="r r-top" d="M40 64 L54 57 Q70 80 86 57 L100 64 L100 153 L40 153 Z"/>
  <path class="pop-buiten" fill-rule="evenodd" d="M0 0 H140 V300 H0 Z M14 ${y1} H126 V${y2} H14 Z"/>
  <rect class="pop-kader" x="14" y="${y1}" width="112" height="${h}" rx="3"/>
</svg>`;
}

/**
 * De CSS die bij de tekening hoort — als tekst, zodat admin.css en
 * Poppetje.astro dezelfde regels dragen. Drie tinten, geen kleur.
 */
export const POP_CSS = `
.pop { display: block; width: 100%; height: auto; }
.pop .r { fill: rgb(0 0 0 / .06); stroke: var(--line-strong, rgb(0 0 0 / .34)); stroke-width: 2; stroke-linejoin: round; }
.pop .r-head { fill: var(--paper, #F2F3F5); }
.pop .r-arms, .pop .r-legs { fill: none; }
.pop .r-shoes, .pop .r-bottom, .pop .r-top, .pop .r-underlayer { fill: rgb(0 0 0 / .13); stroke-width: 1.5; }
.pop[data-product="top"] .r-top,
.pop[data-product="outerwear"] .r-top,
.pop[data-product="underwear"] .r-top,
.pop[data-product="trousers"] .r-bottom,
.pop[data-product="shorts"] .r-bottom,
.pop[data-product="skirt"] .r-bottom,
.pop[data-product="dress"] .r-top,
.pop[data-product="dress"] .r-bottom,
.pop[data-product="shoes"] .r-shoes,
.pop[data-product="socks"] .r-shoes { fill: var(--ink, #000); stroke: var(--ink, #000); }
.pop[data-own*="shoes"] .r-shoes,
.pop[data-own*="bottom"] .r-bottom,
.pop[data-own*="top"] .r-top,
.pop[data-own*="underlayer"] .r-underlayer { fill: rgb(0 0 0 / .45); stroke: none; }
.pop .pop-buiten { fill: var(--paper, #F2F3F5); fill-opacity: .8; }
.pop .pop-kader { fill: none; stroke: var(--ink, #000); stroke-width: 2; }
.pop.pop-klein .pop-buiten { display: none; }
.pop.pop-klein .r-arms, .pop.pop-klein .r-legs { stroke: var(--line, rgb(0 0 0 / .2)); }
.pop.pop-klein .pop-kader { stroke-width: 3; }
`;
