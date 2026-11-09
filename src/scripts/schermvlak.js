/* ═══════════════════════════════════════════════════════════════════════════════
   VISUAILS — een plat beeld in perspectief op een scherm van de laptopfoto (levering 90, 8 november 2026)
   ═══════════════════════════════════════════════════════════════════════════════
   Uit laptopdoek.js gehaald toen het WebGL-doek wegging (Lucas, 8 november: "Gewoon de video gebruiken niet zelf animeren
   omdat de lag dan alleen maar erger word"). Wat overblijft is alleen dit: de standen van de winkel liggen in rust onder de
   foto, elk scherm met één matrix3d op de vier hoeken die in beeld 0 van de video zijn gemeten (scripts/laptop-video-90.py).
   Dat rekent de browser één keer uit; er wordt niets per beeld getekend.
   ═══════════════════════════════════════════════════════════════════════════════ */

/** Hoeveel beeldpunten van de video (2944 breed) het scherm onder de rand van het toestel doorloopt. */
export const RUIMER = 1.5;

/** De projectieve afbeelding van het eenheidsvierkant op de vierhoek q (lb, rb, ro, lo). */
function vierkantNaarVier(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det, h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

/** De css-matrix die een element van b × h px op de vierhoek q (in px van het vak) zet. */
export function cssMatrix(q, b, h) {
  const [a, bb, c, d, e, f, g, hh] = vierkantNaarVier(q);
  return `matrix3d(${[a / b, d / b, 0, g / b, bb / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].join(',')})`;
}
