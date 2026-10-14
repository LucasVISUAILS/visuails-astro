/*
 * ── DE KLEUR VAN EEN PRODUCT, MET CODE — 8 oktober 2026 (punt 5.03, V32 = a) ──
 *
 * Stap 2 vraagt per product de kleur zoals in de webshop, met een Pantone- of
 * hexcode als die er is ("bosgroen, #1B3A2F"). Wijkt de foto af, dan geldt die
 * kleur. Het veld is vrije tekst (src/data/attributes.js, `colour`); dit haalt
 * er de naam, de hexcode en de Pantone-code uit, zodat de brief in /admin, de
 * werkmap (_briefing.txt) en het kleurvlakje in het formulier hetzelfde lezen.
 *
 * Een hexcode midden in tekst telt alleen MET een # ervoor: "facade" of
 * "decade" zijn ook zes hexletters. Staat het veld alleen uit een code, dan
 * mag de # weg (zoals het kleurvlakje in het formulier altijd deed).
 *
 * Geen DOM en geen database: het formulier, de Worker en de tests laden dit.
 */

const DRIE_OF_ZES = /^([0-9a-f]{3}|[0-9a-f]{6})$/i;

const zesCijfers = (h) => (h.length === 3 ? h.split('').map((c) => c + c).join('') : h).toUpperCase();

/** De hexcode uit een kleurveld als '#RRGGBB', of '' als er geen geldige in staat. */
export function hexUit(waarde) {
  const v = String(waarde || '').trim();
  if (!v) return '';
  const kaal = v.replace(/^#/, '');
  if (DRIE_OF_ZES.test(kaal)) return `#${zesCijfers(kaal)}`;
  const m = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])/i);
  return m ? `#${zesCijfers(m[1])}` : '';
}

/** "Pantone 19-5513 TCX", "Pantone 342 C" — of ''. Ook "PMS 342 C" en een kale "19-5513 TCX". */
export function pantoneUit(waarde) {
  const v = String(waarde || '');
  const m = v.match(/\b(?:pantone|pms)\b[\s:]*(\d{2}-\d{4}(?:\s?(?:tcx|tpx|tpg|tsx))?|\d{3,4}(?:\s?(?:c|u|m|tcx|tpx|tpg))?)(?![0-9a-z])/i)
    || v.match(/\b(\d{2}-\d{4}\s?(?:tcx|tpx|tpg|tsx))(?![0-9a-z])/i);
  return m ? `Pantone ${m[1].replace(/\s+/g, ' ').toUpperCase()}` : '';
}

/** [r, g, b] van een '#RRGGBB'. */
export function rgbVan(hex) {
  const h = String(hex || '').replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * Alles wat er in het veld staat, uit elkaar.
 * @returns {null | { tekst: string, naam: string, hex: string, pantone: string }}
 *   naam: wat er overblijft zonder de codes ("bosgroen"), of '' als er alleen
 *   een code stond.
 */
export function kleurInfo(waarde) {
  const tekst = String(waarde || '').trim();
  if (!tekst) return null;
  const hex = hexUit(tekst);
  const pantone = pantoneUit(tekst);
  let naam = tekst;
  if (hex) naam = DRIE_OF_ZES.test(tekst.replace(/^#/, '')) ? '' : naam.replace(/#([0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])/i, ' ');
  if (pantone) {
    naam = naam
      .replace(/\b(?:pantone|pms)\b[\s:]*(\d{2}-\d{4}(?:\s?(?:tcx|tpx|tpg|tsx))?|\d{3,4}(?:\s?(?:c|u|m|tcx|tpx|tpg))?)(?![0-9a-z])/i, ' ')
      .replace(/\b\d{2}-\d{4}\s?(?:tcx|tpx|tpg|tsx)(?![0-9a-z])/i, ' ');
  }
  naam = naam.replace(/\s*[,;·/|]\s*(?=[,;·/|]|$)/g, '').replace(/^[\s,;·/|–—-]+|[\s,;·/|–—-]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  return { tekst, naam, hex, pantone };
}
