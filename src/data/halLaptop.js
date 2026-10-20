/* VISUAILS — de maten van het laptopbeeld in de opening (20 oktober 2026; eerst 12 oktober).
   ═══════════════════════════════════════════════════════════════════════════

   Het beeld is van Lucas (images/BG/magnific__pov-photo-through-my-own-eyes-…99352.png,
   2048 × 1152, gekozen op 20 oktober 2026): door zijn eigen ogen, een telefoon in de
   linkerhand en een laptop op schoot, allebei met een wit scherm, links de violette
   schets van een studio. Hij is 1,125 × groter gemaakt tot 2304 × 1296, zodat de
   standen hun breedtes en namen houden (1000, 1600, 2304).

   De schermen zijn GEMETEN en niet geschat (scripts/laptop-foto.py): langs elke rand
   honderden scanlijnen van het witte scherm naar buiten tot de val naar de zwarte
   rand, op de helft; per rand een lijn door die punten, de hoeken zijn de snijpunten.
   Grootste afwijking van een punt tot zijn lijn: 0,21 px. Bij de telefoon telt alleen
   het rechte stuk van elke rand mee (de hoeken zijn rond), bovenaan niet het eiland.

   De standen zijn foto's met de schermen er al in (src/data/halStanden.js). De bron
   daarvan legt de schermen in precies dit perspectief (een homografie van de vier
   hoeken); het masker per scherm (public/img/hal/masker-*.png, ook uit laptop-foto.py)
   is het witte vlak in schermcoördinaten, dus de inkeping van de laptop, het eiland
   van de telefoon en de ronde hoeken blijven van de foto.

   Het vorige beeld (de laptop van boven, 2304 × 1728, 12 oktober) staat niet meer op
   de site. */

export const FOTO = { w: 2304, h: 1296 };

/** De schermen: hun maat in schermpixels (de pagina wordt op die maat opgebouwd) en hun hoeken in de foto. */
export const SCHERMEN = {
  laptop: { w: 1600, h: 1034, tl: [1071.72, 262.72], tr: [1983.34, 241.44], br: [1957.62, 805.76], bl: [1077.90, 798.44] },
  fon: { w: 540, h: 1170, tl: [630.39, 450.01], tr: [820.73, 430.64], br: [884.05, 889.67], bl: [696.72, 934.04] },
};

/** Homografie die de rechthoek 0..w × 0..h op de vier hoeken legt (8 vergelijkingen, Gauss). */
export function homografie(s) {
  const bron = [[0, 0], [s.w, 0], [s.w, s.h], [0, s.h]];
  const doel = [s.tl, s.tr, s.br, s.bl];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = bron[i], [u, v] = doel[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

/** De CSS-waarde: matrix3d is kolom voor kolom, met de derde as ongemoeid. */
export function matrix3d(s) {
  const H = homografie(s);
  const g = (v) => Number(v.toPrecision(10));
  return `matrix3d(${[H[0][0], H[1][0], 0, H[2][0], H[0][1], H[1][1], 0, H[2][1], 0, 0, 1, 0, H[0][2], H[1][2], 0, H[2][2]].map(g).join(',')})`;
}

/** Een punt op een scherm (in schermpixels) → een punt in de foto. */
export function inFoto(s, x, y) {
  const H = homografie(s);
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}
