/* ── EEN ANDERE ACHTERGROND PER BEELD — 15 oktober 2026 (werklijst 27) ─────────
 *
 * Lucas om 07:23: in "Wat je krijgt" de kleuren erbij, zodat de klant op één
 * foto kan klikken en die een andere achtergrond geeft (vaak bij op model).
 * Afvinklijst 28, v28-tips = a.
 *
 * DE REGEL. Elk beeld krijgt de achtergrond van de bestelling (background_hex).
 * Een klant mag één of meer beelden een andere geven, uit dezelfde aanbevolen
 * kleuren (RECOMMENDED: wit, lichtgrijs, beige). Alleen catalog: lifestyle
 * heeft een setting en geen achtergrond.
 *
 * IN HET DOSSIER. `beeld_bg_<sleutel>` = "#RRGGBB", per bestelling (niet per
 * product: "de foto op model" is bij elk product dezelfde keuze). De sleutel is
 * het vak (front, back, detail, worn) of, bij een bijbestelde hoek, de hoek
 * zelf (inside, three-quarter, eigen-ground …): het vaknummer (extra1 …) kent
 * het formulier pas als de hoeken gekozen zijn, de hoek kent het meteen.
 *
 * WAT DE SERVER WEGHAALT (schoonBeeldAchtergronden): een andere dienst, een
 * waarde die geen kleur is, een sleutel die geen vak of gekozen hoek is, een
 * kleur gelijk aan die van de bestelling (dan zegt hij niets), en de voorkant
 * als een kanaal een witte hoofdafbeelding eist (Amazon, bol, Zalando).
 *
 * EEN EIGEN KLEUR PER BEELD — 15 oktober 2026 (afvinklijst 29, v29-hex = b).
 * Naast de drie aanbevolen kleuren kan elk beeld een eigen hexcode krijgen, net
 * als de hele bestelling. Het formulier post dan `beeld_bg_<sleutel>=eigen` en de
 * code in `beeld_hex_<sleutel>` (zonder script ook: de keuzelijst en het tekstveld
 * staan er gewoon). De server zet het om naar één veld, `beeld_bg_<sleutel>=#…`,
 * en gooit de `beeld_hex_`-velden weg: wie het dossier leest, ziet één vorm.
 *
 * WIE HET LEEST: /admin (het bord en de brief), de werkmap (de INSTELLINGEN-regel
 * krijgt `achtergrond_<vaknummer>=#…`, en het Photoshop-script vult dat vak met
 * die kleur), de bevestigingsmail en de samenvatting in het formulier.
 */
import { RECOMMENDED, achtergrondNaam } from './backgrounds.js';
import { CHANNELS } from './channels.js';
import { leverVakken } from './levervakken.js';

export const BEELD_BG_PREFIX = 'beeld_bg_';
export const beeldBgVeld = (sleutel) => `${BEELD_BG_PREFIX}${sleutel}`;
/** v29-hex = b: de keuze "eigen kleur" in de keuzelijst, en het veld met de code. */
export const BEELD_BG_EIGEN = 'eigen';
export const BEELD_HEX_PREFIX = 'beeld_hex_';
export const beeldHexVeld = (sleutel) => `${BEELD_HEX_PREFIX}${sleutel}`;
/** De kleuren die per beeld mogen: de aanbevolen, in hoofdletters. */
export const BEELD_BG_HEXES = RECOMMENDED.map((b) => b.hex.toUpperCase());
const BASIS = ['front', 'back', 'detail', 'worn'];

function obj(det) {
  if (!det) return {};
  if (typeof det === 'string') { try { return JSON.parse(det) || {}; } catch { return {}; } }
  return typeof det === 'object' ? det : {};
}
/** "#a1b2c3", "A1B2C3" of "#abc" → "#A1B2C3"; al het andere → ''. Zoals normalizeHex() in pipeline.js. */
const hexVan = (v) => {
  const s = String(v || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.split('').map((ch) => ch + ch).join('').toUpperCase()}`;
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : '';
};
/** Eist een van de gekozen kanalen een witte hoofdafbeelding? */
export function witteHoofdafbeelding(channels) {
  const lijst = String(channels || '').split(',').map((x) => x.trim()).filter(Boolean);
  return lijst.some((id) => CHANNELS.find((c) => c.id === id)?.requiresWhite);
}

/**
 * Het dossier opgeschoond, in plaats (zoals de andere stappen in /api/order).
 * @param {object} details  details_json in opbouw
 * @param {string} service  orders.service
 */
export function schoonBeeldAchtergronden(details, service) {
  const sleutels = Object.keys(details).filter((k) => k.startsWith(BEELD_BG_PREFIX));
  const codes = Object.keys(details).filter((k) => k.startsWith(BEELD_HEX_PREFIX));
  const eigen = Object.fromEntries(codes.map((k) => [k.slice(BEELD_HEX_PREFIX.length), details[k]]));
  for (const k of codes) delete details[k];
  if (!sleutels.length) return details;
  if (service !== 'catalog') { for (const k of sleutels) delete details[k]; return details; }
  const hoofd = hexVan(details.background_hex);
  const wit = witteHoofdafbeelding(details.channels);
  const hoeken = new Set(Object.keys(details).map((k) => /^angle_([a-z0-9-]{1,40})$/.exec(k)).filter((m) => m && details[m[0]] && details[m[0]] !== '0').map((m) => m[1]));
  for (const k of sleutels) {
    const sleutel = k.slice(BEELD_BG_PREFIX.length);
    const ruw = String(details[k] || '').trim();
    const hex = ruw.toLowerCase() === BEELD_BG_EIGEN ? hexVan(eigen[sleutel]) : hexVan(ruw);
    const magVak = BASIS.includes(sleutel) || hoeken.has(sleutel);
    if (!magVak || !hex || hex === hoofd || (wit && sleutel === 'front')) { delete details[k]; continue; }
    details[k] = hex;
  }
  return details;
}

/** Een eigen kleur (geen van de aanbevolen, ook geen oude naam)? */
export const isEigenKleur = (hex) => !!hex && !achtergrondNaam(hex, 'nl');
const EIGEN_NAAM = { nl: 'eigen kleur', en: 'own colour' };

/**
 * De afwijkende achtergronden van een bestelling, in de volgorde van de vakken.
 * @returns {Array<{ vak: string, nr: number, sleutel: string, nl: string, en: string, hex: string, naam: { nl: string, en: string } }>}
 */
export function beeldAchtergronden(service, det) {
  if (String(service || '') !== 'catalog') return [];
  const d = obj(det);
  const hoofd = hexVan(d.background_hex);
  const uit = [];
  leverVakken('catalog', d).forEach((v, i) => {
    const sleutel = v.hoek || v.id;
    const hex = hexVan(d[beeldBgVeld(sleutel)]);
    if (!hex || hex === hoofd) return;
    const eigen = isEigenKleur(hex);
    uit.push({
      vak: v.id, nr: i + 1, sleutel, nl: v.nl, en: v.en, hex, eigen,
      naam: eigen ? { ...EIGEN_NAAM } : { nl: achtergrondNaam(hex, 'nl'), en: achtergrondNaam(hex, 'en') },
    });
  });
  return uit;
}

/** "Op een model: beige · Driekwart: eigen kleur #C9D6E3" — één regel, voor mail en scherm. */
export function beeldAchtergrondRegel(service, det, lang = 'nl') {
  const L = lang === 'en' ? 'en' : 'nl';
  return beeldAchtergronden(service, det).map((b) => `${b[L]}: ${b.naam[L].toLowerCase()}${b.eigen ? ` ${b.hex}` : ''}`).join(' · ');
}

/** Voor "Opnieuw bestellen met alle instellingen": per vak of hoek de kleur. */
export function beeldAchtergrondInstellingen(service, det) {
  return beeldAchtergronden(service, det).map((b) => ({ sleutel: b.sleutel, hex: b.hex }));
}
