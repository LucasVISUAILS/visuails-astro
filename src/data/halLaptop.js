/* VISUAILS — de maten van het laptopbeeld op het voorbeeld van de voorpagina (12 oktober 2026).
   ═══════════════════════════════════════════════════════════════════════════

   Het beeld is van Lucas (images/Website Banners - Unspecified/magnific__a-
   photorealistic-…67462.jpg, 2304 × 1728): een laptop op schoot en een telefoon
   in de hand, met witte schermen. De schermen zijn GEMETEN en niet geschat: de
   witte vlakken met een vloedvulling, en de vier hoeken van elk scherm uit een
   lijnfit langs de vier randen — ook de hoeken die onder een hand vallen.

   Zonder JavaScript staat de foto er met de schermen al ingezet (het eerste
   beeld van de reeks). Met JavaScript legt HalLaptop.astro de schermen er los
   in, in precies dit perspectief (een homografie van de vier hoeken), zodat de
   beelden kunnen wisselen. De vingers blijven van de foto: het masker per
   scherm (public/img/hal/masker-*.png) is het witte vlak, in schermcoördinaten.

   Gemaakt met design/hal/beelden.py en laptop2/zet.py in de ontwerpmap. */

export const FOTO = { w: 2304, h: 1728 };

/** De schermen: hun maat in schermpixels (de pagina wordt op die maat opgebouwd) en hun hoeken in de foto. */
export const SCHERMEN = {
  laptop: { w: 1600, h: 1034, tl: [617.76, 454.90], tr: [1620.17, 458.79], br: [1555.30, 1171.48], bl: [536.74, 1091.66] },
  fon: { w: 540, h: 1170, tl: [1652.64, 522.93], tr: [1905.49, 530.14], br: [1776.64, 1148.09], bl: [1526.16, 1114.86] },
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
