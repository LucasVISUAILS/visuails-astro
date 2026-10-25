/* VISUAILS — de maten van het laptopbeeld in de opening (23 oktober 2026; eerst 20 en 12 oktober).
   ═══════════════════════════════════════════════════════════════════════════

   Het beeld is van Lucas (images/BG/magnific__a-minimal-studio-product-photograph-a-dark-silhoue__50205.png,
   5504 × 3072, gekozen op 23 oktober 2026): twee donkere handen in silhouet op een lichte
   studiogrond, links een hand onder een laptop, rechts een hand met een telefoon die voor
   de rechteronderhoek van de laptop hangt; allebei een wit scherm. Links en rechts 21 px
   eraf naar 16:9, dan 2304 × 1296, zodat de standen hun breedtes en namen houden
   (1000, 1600, 2304).

   De schermen zijn GEMETEN en niet geschat (scripts/laptop-foto.py): langs elke rand
   honderden scanlijnen van het witte scherm naar buiten tot de val naar de zwarte rand, op de
   helft; per rand een lijn door die punten, de hoeken zijn de snijpunten. Grootste afwijking
   van een punt tot zijn lijn: 0,27 px. De laptop staat recht voor de lens (zijn hoeken liggen
   op 0,4 px na in een rechthoek); van zijn rechterrand telt alleen het stuk boven de telefoon.

   De standen zijn foto's met de schermen er al in (src/data/halStanden.js). De bron
   daarvan legt de schermen in precies dit perspectief (een homografie van de vier
   hoeken); het masker per scherm (public/img/hal/masker-*.png, ook uit laptop-foto.py)
   is het witte vlak van dát scherm in schermcoördinaten, dus de vingers en de telefoon voor
   de laptop, het eiland van de telefoon en de ronde hoeken blijven van de foto.

   Het vorige beeld (de POV-foto, 2048 × 1152, 20 oktober) staat niet meer op de site. */

export const FOTO = { w: 2304, h: 1296 };

/** De schermen: hun maat in schermpixels (de pagina wordt op die maat opgebouwd) en hun hoeken in de foto. */
export const SCHERMEN = {
  laptop: { w: 1600, h: 1034, tl: [586.37, 253.23], tr: [1663.57, 253.23], br: [1664.0, 951.17], bl: [586.36, 951.1] },
  fon: { w: 540, h: 1170, tl: [1551.69, 479.35], tr: [1799.67, 479.36], br: [1799.91, 1023.44], bl: [1552.13, 1023.45] },
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
