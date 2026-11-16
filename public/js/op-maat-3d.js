/* VISUAILS — de stand in 3D, in de intake van catalog op maat (/account/op-maat). 15 november 2026, lijst 113.
 *
 * Geladen door /js/op-maat.js als er een sectie #om-standen is; three.js (MIT, /js/three.module.min.js) pas als de
 * browser WebGL kan. Alle modellen zijn eigen werk, in code opgebouwd uit stippen: geen 3D-bestanden van anderen.
 * Geen innerHTML met tekst van de klant; geen inline stijl (de CSP van Studio staat dat niet toe).
 * De bedragen staan niet hier: de pagina geeft die van c-pose mee uit src/data/opMaatPrijs.js. */
/* ── hulp ─────────────────────────────────────────────────────────────────────────────────────────── */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const tabel = (pts) => (u) => { for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [u0, v0] = pts[i - 1], [u1, v1] = pts[i]; const t = (u - u0) / (u1 - u0); const c = (1 - Math.cos(Math.PI * t)) / 2; return v0 + (v1 - v0) * c; } return pts[pts.length - 1][1]; };
const MINT = 0.14;   /* het deel van de stippen op het product dat mint is */

function bak(seed) {
  const R = rng(seed), P = [], N = [], K = [], S = [];
  const zet = (p, n, k, s) => { const l = Math.hypot(n[0], n[1], n[2]) || 1; P.push(p[0], p[1], p[2]); N.push(n[0] / l, n[1] / l, n[2] / l); K.push(k); S.push(s); };
  /* een stip op het oppervlak: meestal wit, soms mint, soms een grotere twinkeling */
  const stip = (p, n, s = 1) => { const k = R() < MINT ? 1 : 0; const g = R(); zet(p, n, k, s * (g > .985 ? 2.1 : .65 + g * .7)); };
  const lijn = (p, n, s = 1, k = 1) => zet(p, n, k, s * (.8 + R() * .4));
  /* een normaal uit twee raaklijnen, naar buiten gericht */
  const normaal = (f, a, b, buiten) => { const e = 1e-3, p = f(a, b), pa = f(a + e, b), pb = f(a, b + e);
    const t1 = [pa[0] - p[0], pa[1] - p[1], pa[2] - p[2]], t2 = [pb[0] - p[0], pb[1] - p[1], pb[2] - p[2]];
    let n = [t1[1] * t2[2] - t1[2] * t2[1], t1[2] * t2[0] - t1[0] * t2[2], t1[0] * t2[1] - t1[1] * t2[0]];
    if (n[0] * buiten[0] + n[1] * buiten[1] + n[2] * buiten[2] < 0) n = n.map((v) => -v); return n; };
  /* een oppervlak f(u, v) met n stippen; `buiten(u, v, p)` wijst grofweg naar buiten */
  const vlak = (f, n, buiten, { s = 1, weg = null, k = null } = {}) => { for (let i = 0; i < n; i++) { const u = R(), v = R(); if (weg && weg(u, v)) continue; const p = f(u, v); const nn = normaal(f, u, v, buiten(u, v, p)); if (k === null) stip(p, nn, s); else lijn(p, nn, s, k); } };
  /* een buis langs een kromme c(t) met straal r(t); `alleenLijn`: één lijn stippen in plaats van een buis */
  const buis = (c, r, n, { s = 1, k = null, van = 0, tot = 1 } = {}) => { for (let i = 0; i < n; i++) {
    const t = van + R() * (tot - van), e = 1e-3, m = c(t), a1 = c(Math.min(1, t + e)), a0 = c(Math.max(0, t - e));
    let T = [a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]]; const tl = Math.hypot(...T) || 1; T = T.map((x) => x / tl);
    const op = Math.abs(T[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
    let N1 = [T[1] * op[2] - T[2] * op[1], T[2] * op[0] - T[0] * op[2], T[0] * op[1] - T[1] * op[0]]; const l1 = Math.hypot(...N1) || 1; N1 = N1.map((x) => x / l1);
    const N2 = [T[1] * N1[2] - T[2] * N1[1], T[2] * N1[0] - T[0] * N1[2], T[0] * N1[1] - T[1] * N1[0]];
    const h = R() * Math.PI * 2, d = [N1[0] * Math.cos(h) + N2[0] * Math.sin(h), N1[1] * Math.cos(h) + N2[1] * Math.sin(h), N1[2] * Math.cos(h) + N2[2] * Math.sin(h)];
    const rr = typeof r === 'function' ? r(t) : r; const p = [m[0] + d[0] * rr, m[1] + d[1] * rr, m[2] + d[2] * rr];
    if (k === null) stip(p, d, s); else lijn(p, d, s, k); } };
  /* een draaivorm: profiel(t) = [straal, hoogte], rond de y-as */
  const draai = (prof, n, { s = 1, k = null, van = 0, tot = 1, hoek = [0, Math.PI * 2] } = {}) => { for (let i = 0; i < n; i++) {
    const t = van + R() * (tot - van), a = hoek[0] + R() * (hoek[1] - hoek[0]), e = 1e-3; const [r, y] = prof(t), [r1, y1] = prof(Math.min(1, t + e)), [r0, y0] = prof(Math.max(0, t - e));
    let nr = y1 - y0, ny = -(r1 - r0); const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l; if (nr < 0 && r > .02) { nr = -nr; ny = -ny; }
    const p = [r * Math.cos(a), y, r * Math.sin(a)], nn = [nr * Math.cos(a), ny, nr * Math.sin(a)]; if (k === null) stip(p, nn, s); else lijn(p, nn, s, k); } };
  const stof = (n) => { /* stof rond het product: de galaxy om de vorm heen */
    const m = P.length / 3; for (let i = 0; i < n; i++) { const j = Math.floor(R() * m) * 3, d = .03 + Math.pow(R(), 3) * .32;
      zet([P[j] + N[j] * d + (R() - .5) * .05, P[j + 1] + N[j + 1] * d + (R() - .5) * .05, P[j + 2] + N[j + 2] * d + (R() - .5) * .05], [N[j], N[j + 1], N[j + 2]], R() < .4 ? 1 : 0, .35 + R() * .35); } };
  /* klaar: eerst een draai om de y-as zodat de voorkant naar +z wijst, dan midden op x en z en met de onderkant op de vloer */
  const klaar = (draaiGraden = 0) => {
    const c = Math.cos(draaiGraden * Math.PI / 180), s = Math.sin(draaiGraden * Math.PI / 180);
    const p = new Float32Array(P), n = new Float32Array(N);
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let i = 0; i < p.length; i += 3) { const x = p[i], z = p[i + 2]; p[i] = x * c + z * s; p[i + 2] = -x * s + z * c; const nx = n[i], nz = n[i + 2]; n[i] = nx * c + nz * s; n[i + 2] = -nx * s + nz * c;
      for (let j = 0; j < 3; j++) { lo[j] = Math.min(lo[j], p[i + j]); hi[j] = Math.max(hi[j], p[i + j]); } }
    const mx = (lo[0] + hi[0]) / 2, mz = (lo[2] + hi[2]) / 2;
    for (let i = 0; i < p.length; i += 3) { p[i] -= mx; p[i + 1] -= lo[1]; p[i + 2] -= mz; }
    return { P: p, N: n, K: new Float32Array(K), S: new Float32Array(S), maat: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
  };
  return { R, zet, stip, lijn, normaal, vlak, buis, draai, stof, klaar };
}

/* ── de schoen: hiel rechts (+x), punt links (-x), camera aan de +z-kant ─────────────────────────── */
function schoen({ laars = false } = {}) {
  const b = bak(laars ? 13 : 11), { R } = b;
  const X = (u) => 1.1 - 2.2 * u;
  const hw = (u) => Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u))))) * (.33 + .075 * Math.exp(-(((u - .72) / .15) ** 2)) - .035 * Math.exp(-(((u - .45) / .1) ** 2)));
  const zool = (u) => .10 * Math.pow(ss(.75, 1, u), 2) + .025 * ss(.12, 0, u);
  const dik = (u) => .17 - .06 * u;
  const top = (u) => zool(u) + dik(u);
  const H = laars ? tabel([[0, 1.15], [.08, 1.2], [.3, 1.2], [.42, 1.15], [.55, .62], [.7, .38], [.85, .24], [.97, .12], [1, .05]])
    : tabel([[0, .50], [.08, .57], [.25, .52], [.42, .57], [.55, .50], [.7, .36], [.85, .24], [.97, .12], [1, .05]]);
  const p = 2.4;
  const boven = (u, f) => { const c = Math.cos(f), s = Math.sin(f), w = hw(u) * .97;
    return [X(u), top(u) + H(u) * Math.pow(Math.abs(s), 2 / p), w * Math.sign(c) * Math.pow(Math.abs(c), 2 / p)]; };
  /* de omtrek van de zool op booglengte */
  const T = []; let tot = 0; for (let i = 0; i <= 600; i++) { const u = i / 600; if (i) { const u0 = (i - 1) / 600; tot += Math.hypot(X(u) - X(u0), hw(u) - hw(u0)); } T.push([u, tot]); }
  const omtrekU = () => { const t = R() * tot; let lo = 0, hi = T.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m][1] < t) lo = m; else hi = m; } return T[hi][0]; };
  const zij = (u, y, kant) => { const e = 1e-3, d = (hw(u + e) - hw(u - e)) / (2 * e) / -2.2; return [[X(u), y, kant * hw(u)], [-kant * d, 0, kant]]; };
  /* zijkant van de zool */
  for (let i = 0; i < 9000; i++) { const u = omtrekU(), k = R() < .5 ? -1 : 1, y = zool(u) + R() * dik(u); const [q, n] = zij(u, y, k); b.stip(q, n); }
  /* de streep in de tussenzool en de rand waar het bovenwerk begint */
  for (let i = 0; i < 1600; i++) { const u = omtrekU(), k = R() < .5 ? -1 : 1; const [q, n] = zij(u, zool(u) + dik(u) * .55, k); b.lijn(q, n, .9); }
  for (let i = 0; i < 1600; i++) { const u = omtrekU(), k = R() < .5 ? -1 : 1; const [q, n] = zij(u, top(u), k); b.lijn(q, n, .85, 0); }
  for (let i = 0; i < 1400; i++) { const u = R(), z = (R() * 2 - 1) * hw(u) * .98; b.stip([X(u), zool(u), z], [0, -1, 0], .8); }
  /* het bovenwerk, met de opening van de schacht */
  const opening = (u) => (u > .06 && u < .44 ? 1.05 * Math.sin(Math.PI * (u - .06) / .38) * .62 : 0);
  for (let i = 0; i < (laars ? 46000 : 30000); i++) {
    const u = R(); if (R() > (hw(u) + H(u)) / (laars ? 1.6 : .95)) continue;
    const f = R() * Math.PI; if (Math.abs(f - Math.PI / 2) < opening(u)) continue;
    const q = boven(u, f); b.stip(q, b.normaal(boven, u, f, [0, Math.sin(f), Math.cos(f)]));
  }
  /* de gevoerde rand van de schacht, de binnenkant en het voetbed */
  for (let i = 0; i < 2600; i++) { const u = .06 + R() * .38, k = R() < .5 ? -1 : 1, f = Math.PI / 2 + k * opening(u); const q = boven(u, f); q[1] += .012; b.lijn(q, [0, 1, k * .4], 1.1, R() < .25 ? 1 : 0); }
  const binnen = (u, f) => { const q = boven(u, f); return [q[0], top(u) + (q[1] - top(u)) * .9 - .02, q[2] * .86]; };
  for (let i = 0; i < 3600; i++) { const u = R() * .5, f = R() * Math.PI; const q = binnen(u, f); const n = b.normaal(binnen, u, f, [0, -Math.sin(f), -Math.cos(f)]); b.stip(q, n, .7); }
  for (let i = 0; i < 1300; i++) { const u = .03 + R() * .42, z = (R() * 2 - 1) * hw(u) * .8; b.stip([X(u), top(u) + .02, z], [0, 1, 0], .7); }
  if (!laars) {
  /* de tong */
  const tong = (u, f) => { const q = boven(u, f); q[1] += .025 + .11 * ss(.47, .34, u); return q; };
  for (let i = 0; i < 2400; i++) { const u = .34 + R() * .22, f = Math.PI / 2 + (R() * 2 - 1) * .42; b.stip(tong(u, f), b.normaal(tong, u, f, [0, 1, 0])); }
  /* de veters en de vetergaatjes */
  for (let r = 0; r < 6; r++) { const u = .45 + r * .033;
    for (const k of [-1, 1]) {
      for (let i = 0; i < 140; i++) { const t = R(); const f = Math.PI / 2 + k * (.36 - .72 * t), uu = u + .028 * t; const q = boven(uu, f); q[1] += .022; b.lijn(q, [0, 1, 0], 1.05); }
      for (let i = 0; i < 22; i++) { const q = boven(u, Math.PI / 2 + k * .38); q[0] += (R() - .5) * .025; q[1] += .01 + (R() - .5) * .02; b.lijn(q, [0, 1, k * .5], 1.2, 0); }
    } }
  }
  /* stiksels: de neus, de hielkap en langs de veters */
  const hoogte = (h) => Math.asin(Math.pow(h, p / 2));
  for (let i = 0; i < 2000; i++) { const u = .62 + R() * .38; if ((u * 130) % 1 > .62) continue; const f = R() < .5 ? hoogte(.35) : Math.PI - hoogte(.35); const q = boven(u, f); b.lijn(q, [0, .3, Math.cos(f)], .8); }
  for (let i = 0; i < 1100; i++) { const u = R() * .28; if ((u * 130) % 1 > .62) continue; const f = R() < .5 ? hoogte(.6) : Math.PI - hoogte(.6); const q = boven(u, f); b.lijn(q, [0, .3, Math.cos(f)], .8); }
  if (!laars) for (let i = 0; i < 1200; i++) { const u = .38 + R() * .28; if ((u * 130) % 1 > .62) continue; const k = R() < .5 ? -1 : 1, f = Math.PI / 2 + k * .52; const q = boven(u, f); b.lijn(q, [0, 1, k * .5], .8, 0); }
  /* de laars: een rits aan de binnenkant */
  if (laars) for (let i = 0; i < 900; i++) { const t = R(); const q = boven(.2 + .02 * t, Math.PI * .08 + t * .5); b.lijn(q, [0, 0, -1], .9); }
  /* het lusje aan de hiel */
  for (let i = 0; i < 420; i++) { const a = R() * Math.PI, q = boven(.01, Math.PI / 2); b.lijn([q[0] + .02 + Math.sin(a) * .045, q[1] - .02 + (1 - Math.cos(a)) * .055 + .03, (R() - .5) * .05], [1, .3, 0], 1); }
  b.stof(1600);
  return b.klaar(90);
}

/* ── de pet: de klep naar links (-x) ─────────────────────────────────────────────────────────────── */
function pet() {
  const b = bak(23), { R } = b;
  const r0 = .62, hc = .50, voet = .08;
  const kap = (t, h) => { const q = Math.sqrt(Math.max(0, 1 - h * h)); return [r0 * q * Math.cos(t), voet + hc * h, r0 * q * Math.sin(t)]; };
  const kapN = (t, h) => { const q = kap(t, h); return [q[0] / (r0 * r0), (q[1] - voet) / (hc * hc), q[2] / (r0 * r0)]; };
  const hoek = (t) => Math.atan2(Math.sin(t), Math.cos(t));
  const uitsparing = (t, h) => Math.abs(hoek(t)) < .42 && h < .3 * Math.cos(hoek(t) / .42 * Math.PI / 2);
  for (let i = 0; i < 21000; i++) { const t = R() * Math.PI * 2, h = R(); if (uitsparing(t, h)) continue; b.stip(kap(t, h), kapN(t, h)); }
  /* zes naden, het knoopje en de vetergaatjes */
  for (let k = 0; k < 6; k++) { const t = k * Math.PI / 3 + Math.PI / 6; for (let i = 0; i < 320; i++) { const h = R(); if (uitsparing(t, h)) continue; b.lijn(kap(t, h), kapN(t, h), .9); } }
  for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, c = R() * 2 - 1, s = Math.sqrt(1 - c * c); b.lijn([.04 * s * Math.cos(a), voet + hc + .015 + .03 * c, .04 * s * Math.sin(a)], [s * Math.cos(a), c, s * Math.sin(a)], 1.1, 0); }
  for (const t of [Math.PI / 3, 2 * Math.PI / 3, 4 * Math.PI / 3, 5 * Math.PI / 3]) for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2; const q = kap(t + Math.cos(a) * .045, .62 + Math.sin(a) * .03); b.lijn(q, kapN(t, .62), 1); }
  /* de band onder en het riempje achter */
  for (let i = 0; i < 1300; i++) { const t = R() * Math.PI * 2; if (Math.abs(hoek(t)) < .42) continue; b.lijn(kap(t, 0), kapN(t, 0), .9, 0); }
  for (let i = 0; i < 520; i++) { const t = (R() * 2 - 1) * .42, h = .05 + R() * .06; const q = kap(t, h); q[0] += .01; b.lijn(q, kapN(t, h), 1, R() < .3 ? 1 : 0); }
  /* de binnenkant, voor wie van onder kijkt */
  for (let i = 0; i < 1600; i++) { const t = R() * Math.PI * 2, h = R() * .8; const q = kap(t, h); const n = kapN(t, h); b.stip([q[0] * .95, voet + (q[1] - voet) * .95, q[2] * .95], n.map((v) => -v), .6); }
  /* de klep: gebogen, aan de zijkanten iets omlaag */
  const klep = (t, s) => { const e = .95 * Math.pow(Math.max(0, -Math.cos(t)), 1.3), r = r0 * (1 + e * s), x = r * Math.cos(t), z = r * Math.sin(t);
    return [x, voet - .05 * s * Math.max(0, -Math.cos(t)) - .12 * z * z * s, z]; };
  for (let i = 0; i < 9000; i++) { const t = Math.PI / 2 + R() * Math.PI, s = Math.sqrt(R()); const q = klep(t, s); const onder = R() < .28;
    const n = b.normaal(klep, t, s, [0, 1, 0]); if (onder) { q[1] -= .014; b.stip(q, n.map((v) => -v), .8); } else b.stip(q, n); }
  for (const s0 of [.8, .88]) for (let i = 0; i < 900; i++) { const t = Math.PI / 2 + .15 + R() * (Math.PI - .3); if ((t * 60) % 1 > .62) continue; const q = klep(t, s0); q[1] += .006; b.lijn(q, [0, 1, 0], .85); }
  for (let i = 0; i < 1200; i++) { const t = Math.PI / 2 + R() * Math.PI; const q = klep(t, 1); b.lijn(q, [Math.cos(t), .3, Math.sin(t)], 1, 0); }
  b.stof(1400);
  return b.klaar(90);
}

/* ── de tas: een shopper, de voorkant naar de camera (+z) ────────────────────────────────────────── */
function tas() {
  const b = bak(37), { R } = b;
  const hb = 1.32, rc = .08;
  const breed = (y) => (1.40 + .22 * (y / hb)) / 2, diep = (y) => .23 * (1 - .15 * (y / hb));
  /* een punt op de afgeronde rechthoek, op lengte s (0..1) */
  const rand = (y, s, krimp = 1) => {
    const a = breed(y) * krimp - rc, c = diep(y) * krimp - rc, L = [2 * a, Math.PI * rc / 2, 2 * c, Math.PI * rc / 2, 2 * a, Math.PI * rc / 2, 2 * c, Math.PI * rc / 2];
    let t = s * L.reduce((x, v) => x + v, 0), i = 0; while (i < 7 && t > L[i]) { t -= L[i]; i++; }
    const hoekp = (cx, cz, a0) => { const f = a0 + t / rc; return [[cx + rc * Math.cos(f), cz + rc * Math.sin(f)], [Math.cos(f), Math.sin(f)]]; };
    let q, n;
    if (i === 0) [q, n] = [[-a + t, c + rc], [0, 1]];
    else if (i === 1) [q, n] = hoekp(a, c, Math.PI / 2 - Math.PI / 2);
    else if (i === 2) [q, n] = [[a + rc, c - t], [1, 0]];
    else if (i === 3) [q, n] = hoekp(a, -c, -Math.PI / 2);
    else if (i === 4) [q, n] = [[a - t, -c - rc], [0, -1]];
    else if (i === 5) [q, n] = hoekp(-a, -c, -Math.PI);
    else if (i === 6) [q, n] = [[-a - rc, -c + t], [-1, 0]];
    else [q, n] = hoekp(-a, c, Math.PI / 2);
    if (i === 1) { const f = t / rc; [q, n] = [[a + rc * Math.sin(f), c + rc * Math.cos(f)], [Math.sin(f), Math.cos(f)]]; }
    if (i === 3) { const f = t / rc; [q, n] = [[a + rc * Math.cos(f), -c - rc * Math.sin(f)], [Math.cos(f), -Math.sin(f)]]; }
    if (i === 5) { const f = t / rc; [q, n] = [[-a - rc * Math.sin(f), -c - rc * Math.cos(f)], [-Math.sin(f), -Math.cos(f)]]; }
    if (i === 7) { const f = t / rc; [q, n] = [[-a - rc * Math.cos(f), c + rc * Math.sin(f)], [-Math.cos(f), Math.sin(f)]]; }
    /* de voor- en achterkant bollen een beetje */
    if (Math.abs(n[1]) > .99) q[1] *= 1 + .06 * Math.sin(Math.PI * y / hb) * (1 - (q[0] / breed(y)) ** 2);
    return [[q[0], y, q[1]], [n[0], 0, n[1]]];
  };
  for (let i = 0; i < 26000; i++) { const [q, n] = rand(R() * hb, R()); b.stip(q, n); }
  for (let i = 0; i < 2800; i++) { const x = (R() * 2 - 1) * breed(0), z = (R() * 2 - 1) * diep(0); b.stip([x, .005, z], [0, -1, 0], .8); }
  for (let i = 0; i < 3200; i++) { const y = hb * (.5 + R() * .5); const [q, n] = rand(y, R(), .97); b.stip(q, n.map((v) => -v), .65); }
  /* de zoom boven, stiksels onder en de vier hoeknaden */
  for (let i = 0; i < 1700; i++) { const [q, n] = rand(hb, R()); b.lijn(q, [n[0], .5, n[2]], 1.05, 0); }
  for (let i = 0; i < 1500; i++) { const s = R(); if ((s * 160) % 1 > .62) continue; const [q, n] = rand(hb - .06, s); b.lijn(q, n, .85); }
  for (let i = 0; i < 1300; i++) { const s = R(); if ((s * 160) % 1 > .62) continue; const [q, n] = rand(.05, s); b.lijn(q, n, .85); }
  /* het vak op de voorkant */
  const voor = (x, y) => { const z = diep(y) * (1 + .06 * Math.sin(Math.PI * y / hb) * (1 - (x / breed(y)) ** 2)) + .006; return [x, y, z]; };
  for (let i = 0; i < 1100; i++) { const t = R() * 4; let x, y;
    if (t < 1) [x, y] = [-.4 + .8 * t, .32]; else if (t < 2) [x, y] = [.4, .32 + .48 * (t - 1)]; else if (t < 3) [x, y] = [.4 - .8 * (t - 2), .80]; else [x, y] = [-.4, .80 - .48 * (t - 3)];
    if ((t * 40) % 1 > .62 && t > 2 && t < 3) continue; b.lijn(voor(x, y), [0, 0, 1], t > 2 && t < 3 ? 1.05 : .85, t > 2 && t < 3 ? 0 : 1); }
  /* de hengsels: banden op de tas en een boog erboven, voor en achter */
  for (const kant of [1, -1]) {
    for (const x0 of [-.36, .36]) for (let i = 0; i < 520; i++) { const y = hb - .36 + R() * .36, x = x0 + (R() - .5) * .07; const q = voor(x, y); q[2] *= kant; q[2] += kant * .004; b.lijn(q, [0, 0, kant], .95, R() < .3 ? 1 : 0); }
    for (let i = 0; i < 2300; i++) { const t = R(), a = R() * Math.PI * 2, rr = .03;
      const cx = .36 * Math.cos(Math.PI * t), cy = hb + .5 * Math.sin(Math.PI * t), cz = kant * (diep(hb) + .01 + (kant < 0 ? .05 : .02) * Math.sin(Math.PI * t));
      const tx = -Math.sin(Math.PI * t) * .36, ty = Math.cos(Math.PI * t) * .5, tl = Math.hypot(tx, ty); const nx = -ty / tl, ny = tx / tl;
      const n = [nx * Math.cos(a), ny * Math.cos(a), Math.sin(a)]; b.stip([cx + rr * n[0], cy + rr * n[1], cz + rr * n[2]], n, .95); }
  }
  b.stof(1500);
  return b.klaar(0);
}


/* ── kleding: als een onzichtbare paspop, de voorkant naar +z ──────────────────────────────────────── */
/* Een superellips: x = w·|cos|^(2/p), z = d·|sin|^(2/p). */
const TAU = Math.PI * 2;
const se = (w, d, h, p = 2.6) => { const c = Math.cos(h), s = Math.sin(h); return [w * Math.sign(c) * Math.pow(Math.abs(c), 2 / p), d * Math.sign(s) * Math.pow(Math.abs(s), 2 / p)]; };

function kleding({ seed, onder = .25, boven = 1.6, breed = .52, diep = .27, mouw = 'kort', capuchon = false, rits = false, kraag = false, rib = false, zak = false, nek = .17, rok = null }) {
  const b = bak(seed), { R } = b;
  const romp = (u, h) => { const y = onder + (boven - onder) * u, w = breed * (1 + .04 * Math.sin(Math.PI * u)), d = diep * (1 + .06 * Math.sin(Math.PI * u)); const [x, z] = se(w, d, h); return [x, y, z]; };
  b.vlak((u, v) => romp(u, v * TAU), 17000, (u, h, p) => [p[0], 0, p[2]]);
  /* de schouders: van de rand van de romp naar de halsopening, iets omhoog */
  const schouder = (s, h) => { const [x0, z0] = se(breed, diep, h), [x1, z1] = se(nek, nek * .82, h, 2); const t = s; return [x0 + (x1 - x0) * t, boven + .07 * Math.sin(t * Math.PI / 2), z0 + (z1 - z0) * t + .02 * t]; };
  b.vlak((s, v) => schouder(s, v * TAU), 4200, () => [0, 1, 0]);
  /* zomen: onder, de hals */
  b.vlak((u, h) => romp(0, h * Math.PI * 2), 900, (u, h) => [0, -1, 0], { k: 0, s: 1 });
  for (let i = 0; i < 700; i++) { const h = R() * Math.PI * 2; const p = schouder(1, h); b.lijn(p, [0, 1, 0], 1, 1); }
  if (rib) for (const u0 of [.015, .03, .045]) for (let i = 0; i < 380; i++) { const h = R() * Math.PI * 2; const p = romp(u0, h); b.lijn(p, [p[0], 0, p[2]], .85, 1); }
  /* mouwen */
  const mouwen = { kort: [[.48, boven - .08, 0], [.8, boven - .44, .0], .18, .15], lang: [[.48, boven - .08, 0], [.72, onder + .2, .06], .17, .11] }[mouw];
  if (mouwen) for (const k of [-1, 1]) {
    const [a, e, r0, r1] = mouwen; const knik = mouw === 'lang' ? [.74 * k, (a[1] + e[1]) / 2 + .05, -.03] : null;
    const c = (t) => { if (!knik) return [k * (a[0] + (e[0] - a[0]) * t), a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t];
      const u = 1 - t; return [u * u * k * a[0] + 2 * u * t * knik[0] + t * t * k * e[0], u * u * a[1] + 2 * u * t * knik[1] + t * t * e[1], u * u * a[2] + 2 * u * t * knik[2] + t * t * e[2]]; };
    b.buis(c, (t) => r0 + (r1 - r0) * t, mouw === 'lang' ? 6500 : 3200, { van: .05 });
    b.buis(c, r1 * 1.01, 380, { k: 0, van: .995, tot: 1 });
    if (rib) for (const t0 of [.93, .96]) b.buis(c, r1 * 1.02, 220, { k: 1, van: t0, tot: t0 + .004 });
  }
  if (capuchon) { /* de capuchon: een halve schaal achter de hals, open naar voren */
    b.vlak((u, v) => { const a = u * Math.PI, t = v * Math.PI; return [.27 * Math.cos(a) * Math.sin(t), boven + .02 + .34 * Math.sin(t) * Math.sin(a), -.12 - .22 * Math.cos(t) * Math.sin(a) - .05 * Math.cos(t)]; }, 5200, (u, v, p) => [p[0], p[1] - boven, p[2] + .1]);
    for (let i = 0; i < 700; i++) { const a = R() * Math.PI; b.lijn([.27 * Math.cos(a), boven + .02 + .34 * Math.sin(a), -.12 + .02], [0, 0, 1], 1, 0); }
    for (const x of [-.08, .08]) for (let i = 0; i < 220; i++) { const t = R(); b.lijn([x, boven - .02 - .28 * t, diep + .03], [0, 0, 1], 1, 1); }
  }
  if (zak) { /* de buidelzak */
    const pts = [[-.3, onder + .1], [.3, onder + .1], [.22, onder + .45], [-.22, onder + .45]];
    for (let i = 0; i < 900; i++) { const t = R() * 4, j = Math.floor(t), f = t - j, a = pts[j], c = pts[(j + 1) % 4]; const x = a[0] + (c[0] - a[0]) * f, y = a[1] + (c[1] - a[1]) * f;
      const [, z] = se(breed, diep * (1 + .06 * Math.sin(Math.PI * (y - onder) / (boven - onder))), Math.asin(Math.min(1, Math.abs(x) / breed)) * 0 + Math.PI / 2); b.lijn([x, y, z + .012], [0, 0, 1], .9, j === 2 ? 0 : 1); }
  }
  if (rits) for (let i = 0; i < 1000; i++) { const u = R(); const p = romp(u, Math.PI / 2); p[2] += .012; b.lijn(p, [0, 0, 1], 1, 0); }
  if (kraag) b.draai((t) => [nek * 1.12, boven + .06 + .14 * t], 1500, { hoek: [Math.PI * .62, Math.PI * 2.38] });
  if (rok) { /* een jurk: onder de romp een rok die uitloopt */
    const rk = (u, h) => { const y = onder - (onder - rok.zoom) * u, w = breed * .95 + (rok.breed - breed * .95) * u, d = diep * .95 + (rok.diep - diep * .95) * u; const [x, z] = se(w, d, h, 2.2); return [x, y, z]; };
    b.vlak((u, v) => rk(u, v * TAU), 14000, (u, h, p) => [p[0], 0, p[2]]);
    b.vlak((u, h) => rk(1, h * Math.PI * 2), 900, () => [0, -1, 0], { k: 0 });
  }
  b.stof(1400);
  return b.klaar(0);
}
const tshirt = () => kleding({ seed: 41, mouw: 'kort' });
const hoodie = () => kleding({ seed: 43, mouw: 'lang', capuchon: true, zak: true, rib: true, breed: .56, diep: .3 });
const trui = () => kleding({ seed: 47, mouw: 'lang', rib: true, nek: .16 });
const jas = () => kleding({ seed: 53, mouw: 'lang', rits: true, kraag: true, onder: .05, breed: .58, diep: .32 });
const jurk = () => kleding({ seed: 59, mouw: 'geen', onder: 1.0, boven: 1.62, breed: .4, diep: .24, nek: .26, rok: { zoom: .05, breed: .78, diep: .56 } });

/* ── broek, short, rok ────────────────────────────────────────────────────────────────────────────── */
function broek({ seed, kort = false }) {
  const b = bak(seed), { R } = b;
  const taille = 1.78, kruis = 1.22, zoom = kort ? .92 : .04;
  const heup = (u, h) => { const y = kruis + (taille - kruis) * u, w = .45 - .05 * u, d = .27 - .03 * u; const [x, z] = se(w, d, h); return [x, y, z]; };
  b.vlak((u, v) => heup(u, v * TAU), 7000, (u, h, p) => [p[0], 0, p[2]]);
  for (const k of [-1, 1]) {
    const pijp = (u, h) => { const y = kruis - (kruis - zoom) * u, cx = k * (.215 + .04 * u), w = .225 - (kort ? .01 : .08) * u, d = .26 - (kort ? .02 : .11) * u; const [x, z] = se(w, d, h, 2.1); return [cx + x, y, z]; };
    b.vlak((u, v) => pijp(u, v * TAU), kort ? 5200 : 11000, (u, h, p) => [p[0] - k * .22, 0, p[2]]);
    b.vlak((u, h) => pijp(1, h * Math.PI * 2), 600, () => [0, -1, 0], { k: 0 });
  }
  b.vlak((u, h) => { const p = heup(1, h * Math.PI * 2); p[1] -= u * .07; return p; }, 1300, (u, h, p) => [p[0], 0, p[2]], { k: 0 });
  for (let i = 0; i < 600; i++) { const t = R(); const p = heup(.95 - .5 * t, Math.PI / 2); p[0] += .03; p[2] += .01; b.lijn(p, [0, 0, 1], .9, 1); }
  for (const k of [-1, 1]) for (let i = 0; i < 420; i++) { const t = R(); const h = Math.PI / 2 + k * (.55 + .35 * t); const p = heup(.95 - .45 * t, h); b.lijn(p, [p[0], 0, p[2]], .85, 1); }
  for (const h of [Math.PI / 2 + .9, Math.PI / 2 - .9, -Math.PI / 2 + .5, -Math.PI / 2 - .5]) for (let i = 0; i < 70; i++) { const p = heup(.88 + R() * .12, h); b.lijn(p, [p[0], 0, p[2]], 1, 0); }
  b.stof(1200);
  return b.klaar(0);
}
const lange_broek = () => broek({ seed: 61 });
const short = () => broek({ seed: 67, kort: true });
function rok() {
  const b = bak(71);
  const vorm = (u, h) => { const y = 1.62 - 1.0 * u, w = .41 + .3 * Math.pow(u, 1.2), d = .26 + .22 * Math.pow(u, 1.2); const [x, z] = se(w, d, h, 2.2); return [x, y, z]; };
  b.vlak((u, v) => vorm(u, v * TAU), 14000, (u, h, p) => [p[0], 0, p[2]]);
  b.vlak((u, h) => { const p = vorm(0, h * Math.PI * 2); p[1] -= u * .08; return p; }, 1200, (u, h, p) => [p[0], 0, p[2]], { k: 0 });
  b.vlak((u, h) => vorm(1, h * Math.PI * 2), 900, () => [0, -1, 0], { k: 1 });
  b.stof(1000);
  return b.klaar(0);
}

/* ── de sok: de punt naar +z ──────────────────────────────────────────────────────────────────────── */
function sok() {
  const b = bak(73), { R } = b;
  const c = (t) => { if (t < .55) { const u = t / .55; return [0, 1.05 - .82 * u, 0]; } const u = (t - .55) / .45, a = u * Math.PI / 2;
    return [0, .23 - .11 * Math.sin(a) + .0 * u, .17 * (1 - Math.cos(a)) + .52 * u]; };
  b.buis(c, (t) => (t < .55 ? .12 : .12 - .015 * (t - .55) / .45), 15000);
  for (let i = 0; i < 1600; i++) { const a = R() * Math.PI * 2, v = R() * Math.PI / 2, e = c(1); b.stip([e[0] + .105 * Math.cos(a) * Math.cos(v), e[1] + .105 * Math.sin(a) * Math.cos(v), e[2] + .105 * Math.sin(v)], [Math.cos(a) * Math.cos(v), Math.sin(a) * Math.cos(v), Math.sin(v)]); }
  for (let j = 0; j < 9; j++) b.buis(c, .123, 160, { k: 1, van: j * .012, tot: j * .012 + .002 });
  b.buis(c, .121, 500, { k: 0, van: 0, tot: .002 });
  b.buis(c, .123, 600, { k: 1, van: .5, tot: .505 });
  b.stof(900);
  return b.klaar(0);
}

/* ── hoofddeksels ─────────────────────────────────────────────────────────────────────────────────── */
function muts() {
  const b = bak(79), { R } = b;
  const prof = (t) => { if (t < .28) return [.5, t / .28 * .24]; const s = (t - .28) / .72, a = s * Math.PI / 2; return [.475 * Math.cos(a), .24 + .64 * Math.sin(a)]; };
  b.draai(prof, 20000);
  for (let j = 0; j < 36; j++) { const a = j / 36 * Math.PI * 2; for (let i = 0; i < 60; i++) { const y = R() * .24; b.lijn([.505 * Math.cos(a), y, .505 * Math.sin(a)], [Math.cos(a), 0, Math.sin(a)], .8, 1); } }
  b.draai((t) => [.505, .24], 900, { k: 0 });
  for (let i = 0; i < 1500; i++) { const a = R() * Math.PI * 2, v = Math.acos(2 * R() - 1), r = .11 * Math.cbrt(R()); b.stip([r * Math.sin(v) * Math.cos(a), .9 + .07 + r * Math.cos(v), r * Math.sin(v) * Math.sin(a)], [Math.sin(v) * Math.cos(a), Math.cos(v), Math.sin(v) * Math.sin(a)], .9); }
  b.stof(800);
  return b.klaar(0);
}
function bucket() {
  const b = bak(83);
  const kroon = (t) => (t < .75 ? [.44 - .06 * (t / .75), .14 + .38 * (t / .75)] : [.38 * Math.cos((t - .75) / .25 * Math.PI / 2), .52 + .03 * Math.sin((t - .75) / .25 * Math.PI / 2)]);
  b.draai(kroon, 15000);
  const rand = (t) => [.44 + .36 * t, .14 - .12 * t];
  b.draai(rand, 9000);
  b.draai((t) => { const [r, y] = rand(t); return [r, y - .012]; }, 2500, { s: .7 });
  for (const t0 of [.25, .45, .65, .85]) b.draai((t) => rand(t0), 520, { k: 1 });
  b.draai((t) => rand(1), 900, { k: 0 });
  b.draai((t) => kroon(.08), 600, { k: 1 });
  b.stof(800);
  return b.klaar(0);
}

/* ── de bril: de glazen naar +z, rustend op de pootjes ─────────────────────────────────────────────── */
function bril() {
  const b = bak(89), { R } = b;
  const rr = (cx) => (t) => { const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return [cx + .25 * Math.sign(c) * Math.pow(Math.abs(c), .7), .5 + .19 * Math.sign(s) * Math.pow(Math.abs(s), .7), 0]; };
  for (const cx of [-.32, .32]) { b.buis(rr(cx), .024, 3800); for (let i = 0; i < 1500; i++) { const a = R() * Math.PI * 2, q = Math.sqrt(R()) * .9, c = Math.cos(a), s = Math.sin(a);
    b.zet([cx + .25 * q * Math.sign(c) * Math.pow(Math.abs(c), .7), .5 + .19 * q * Math.sign(s) * Math.pow(Math.abs(s), .7), .005 * (1 - q * q)], [0, 0, 1], R() < .2 ? 1 : 0, .4 + R() * .3); } }
  b.buis((t) => [-.08 + .16 * t, .58 + .05 * Math.sin(Math.PI * t), 0], .02, 500);
  for (const k of [-1, 1]) b.buis((t) => { const z = -.95 * t; const y = .6 - (t > .82 ? .3 * Math.pow((t - .82) / .18, 1.5) : 0); return [k * (.575 + .02 * t), y, z]; }, .018, 2600);
  b.stof(600);
  return b.klaar(0);
}

/* ── accessoires ──────────────────────────────────────────────────────────────────────────────────── */
function horloge() {
  const b = bak(97), { R } = b;
  const hy = .45;
  for (let i = 0; i < 4200; i++) { const a = R() * Math.PI * 2, r = .3 * Math.sqrt(R()); b.stip([r * Math.cos(a), hy + r * Math.sin(a), .06], [0, 0, 1], .75); }
  b.buis((t) => [.3 * Math.cos(t * Math.PI * 2), hy + .3 * Math.sin(t * Math.PI * 2), .03], .035, 3200);
  for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; for (let i = 0; i < 26; i++) { const r = .22 + R() * .05; b.lijn([r * Math.cos(a), hy + r * Math.sin(a), .066], [0, 0, 1], .9, 1); } }
  for (const [l, a] of [[.17, 1.2], [.23, -.5]]) for (let i = 0; i < 70; i++) { const r = R() * l; b.lijn([r * Math.cos(a), hy + r * Math.sin(a), .07], [0, 0, 1], 1, 0); }
  b.buis((t) => [.33 + .06 * t, hy, .0], .03, 260);
  /* de band: een lus achter de kast langs, van boven naar onder */
  const band = (u, t) => { const a = Math.PI / 2 + .55 + t * (2 * Math.PI - 1.1); return [-.13 + .26 * u, hy + .42 * Math.cos(a), -.42 + .42 * Math.sin(a)]; };
  b.vlak(band, 9000, (u, t, p) => [0, p[1] - hy, p[2] + .42]);
  for (let i = 0; i < 400; i++) { const t = .48 + R() * .04; const p = band(R() < .5 ? 0 : 1, t); b.lijn(p, [p[0], 0, 0], 1, 0); }
  b.stof(700);
  return b.klaar(0);
}
function sieraad() {
  const b = bak(101), { R } = b;
  const R0 = .38, r0 = .065;
  for (let i = 0; i < 9000; i++) { const a = R() * Math.PI * 2, c = R() * Math.PI * 2; const p = [(R0 + r0 * Math.cos(c)) * Math.cos(a), R0 + (R0 + r0 * Math.cos(c)) * Math.sin(a), r0 * Math.sin(c)];
    b.stip(p, [Math.cos(c) * Math.cos(a), Math.cos(c) * Math.sin(a), Math.sin(c)]); }
  for (let i = 0; i < 2200; i++) { const a = R() * Math.PI * 2, v = Math.acos(2 * R() - 1), n = [Math.sin(v) * Math.cos(a), Math.cos(v), Math.sin(v) * Math.sin(a)];
    const q = Math.pow(Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]), -1) * .14; b.lijn([n[0] * q, 2 * R0 + r0 + .1 + n[1] * q, n[2] * q], n, 1.1, R() < .45 ? 1 : 0); }
  b.stof(600);
  return b.klaar(0);
}
function fles() {
  const b = bak(103);
  const prof = (t) => { if (t < .05) return [.28 * Math.sin(t / .05 * Math.PI / 2), .02 * (1 - Math.cos(t / .05 * Math.PI / 2))]; if (t < .6) return [.28, .02 + (t - .05) / .55 * .93];
    if (t < .8) { const s = (t - .6) / .2; return [.28 - .17 * Math.sin(s * Math.PI / 2), .95 + .25 * s]; } return [.11, 1.2 + (t - .8) / .2 * .18]; };
  b.draai(prof, 16000);
  b.draai((t) => [.13, 1.38 + .17 * t], 2600);
  b.draai((t) => [.13 * (1 - t), 1.55], 600);
  for (let j = 0; j < 24; j++) { const a = j / 24 * Math.PI * 2; b.draai((t) => [.132, 1.4 + .13 * t], 40, { k: 1, hoek: [a, a + .01] }); }
  for (const y of [.3, .75]) b.draai(() => [.282, y], 700, { k: 1 });
  b.stof(700);
  return b.klaar(0);
}

/* ── vloer en muur: dezelfde stippen, dunner gezaaid, het dichtst rond het product ────────────────── */
function omgeving() {
  const R = rng(5), P = [], N = [], K = [], S = [];
  const g = () => { let u = 0; for (let i = 0; i < 4; i++) u += R(); return (u - 2) / .58; };
  for (let i = 0; i < 22000; i++) { const dicht = R() < .45; const x = dicht ? g() * 1.4 : -5.5 + R() * 11, z = dicht ? .4 + g() * 1.1 : -2.6 + R() * 7.1;
    if (z < -2.6 || z > 4.5 || Math.abs(x) > 5.5) continue; P.push(x, 0, z); N.push(0, 1, 0); K.push(R() < .35 ? 1 : 0); S.push(.45 + R() * .5 + (R() > .99 ? 1 : 0)); }
  for (let i = 0; i < 16000; i++) { const dicht = R() < .4; const x = dicht ? g() * 1.6 : -5.5 + R() * 11, y = dicht ? 1.1 + g() * .9 : R() * 5.5;
    if (y < 0 || y > 5.5 || Math.abs(x) > 5.5) continue; P.push(x, y, -2.6); N.push(0, 0, 1); K.push(R() < .35 ? 1 : 0); S.push(.45 + R() * .5 + (R() > .99 ? 1 : 0)); }
  return { P: new Float32Array(P), N: new Float32Array(N), K: new Float32Array(K), S: new Float32Array(S) };
}


const vert = `
attribute vec3 nrm; attribute float kl; attribute float gr;
uniform vec3 uL; uniform float uPix; uniform float uSize; uniform float uEnv; uniform float uGain;
varying vec3 vKleur; varying float vA;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * nrm);
  vec3 V = normalize(cameraPosition - wp.xyz);
  /* een vast, zacht licht van linksboven-voor: alleen zodat je de vorm leest, de klant kiest het niet */
  float licht = 0.75;
  if (uEnv < 0.5) {
    float dif = pow(max(dot(n, uL), 0.0), 0.85);
    float kant = smoothstep(-0.3, 0.35, dot(n, V));
    licht = (0.22 + 1.0 * dif) * mix(0.1, 1.0, kant);
  }
  vKleur = mix(vec3(1.0), vec3(0.239, 1.0, 0.69), kl) * licht * uGain;
  vA = 1.0;
  vec4 mv = viewMatrix * wp;
  gl_PointSize = gr * uSize * uPix * (6.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const frag = `
varying vec3 vKleur; varying float vA;
void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.12, d) * vA; gl_FragColor = vec4(vKleur, a); }`;



/* ── DE 3D-KANT: een beeld per product en het venster ───────────────────────────────────────────────────────────
   Elk model is eigen werk, in code opgebouwd uit stippen (de functies hierboven): geen 3D-bestanden van anderen.
   Jouw eigen product komt hier niet in 3D; het gaat alleen om de stand. Het licht is vast en zacht, alleen zodat je
   de vorm leest: licht en schaduw kies je bij de omgeving. */
function maakDrie(THREE, c) {
  const { D, T, HOEKEN, GROEPNAAM, graden, zetEigen, groepStand, teken } = c;
  const MAKER = { pet, muts, bucket, bril, tshirt, hoodie, trui, jas, jurk, broek: lange_broek, short, rok, sok, schoen, laars: () => schoen({ laars: true }), tas, horloge, sieraad, fles };
  const pix = Math.min(window.devicePixelRatio || 1, 2);
  const gedeeld = { uL: { value: new THREE.Vector3() }, uPix: { value: pix }, uSize: { value: 1.55 } };
  const mat = (env, gain) => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { ...gedeeld, uEnv: { value: env }, uGain: { value: gain } } });
  const wolk = (d, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(d.P, 3)); g.setAttribute('nrm', new THREE.BufferAttribute(d.N, 3));
    g.setAttribute('kl', new THREE.BufferAttribute(d.K, 1)); g.setAttribute('gr', new THREE.BufferAttribute(d.S, 1)); return new THREE.Points(g, m); };
  const productMat = mat(0, 0.85), omgevingMat = mat(1, 0.30);
  const omg = omgeving();
  function maakWereld() {
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#090D0B');
    scene.add(wolk(omg, omgevingMat));
    const houder = new THREE.Group(), kantel = new THREE.Group(); houder.add(kantel); scene.add(houder);
    return { scene, houder, kantel, cam: new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100) };
  }
  const cache = {}, wolken = {};
  const model = (id) => cache[id] || (cache[id] = MAKER[id]());
  const wolkVan = (id) => wolken[id] || (wolken[id] = wolk(model(id), productMat));
  /* plat: bij flat lay wordt kleding platgedrukt (de diepte naar 14 %) en ligt hij op de grond */
  const PLAT = 0.14;
  function zetStand(w, id, { yaw, pitch, lig }, plat = false) {
    const d = model(id), diep = d.maat[2] * (plat ? PLAT : 1);
    w.kantel.clear(); const p = wolkVan(id).clone(); p.position.set(0, -d.maat[1] / 2, 0); p.scale.set(1, 1, plat ? PLAT : 1); w.kantel.add(p);
    w.kantel.rotation.set(lig ? -Math.PI / 2 : 0, 0, 0);
    w.houder.rotation.y = THREE.MathUtils.degToRad(yaw);
    w.houder.position.y = lig ? diep / 2 : d.maat[1] / 2;
    const grootte = Math.max(...d.maat), midden = lig ? diep / 2 : d.maat[1] / 2, afstand = grootte * (lig ? 1.55 : 1.75) + 0.6;
    const e = THREE.MathUtils.degToRad(Math.min(82, 10 + pitch));
    w.cam.position.set(0, midden + Math.sin(e) * afstand, Math.cos(e) * afstand); w.cam.lookAt(0, midden, 0);
    gedeeld.uL.value.copy(new THREE.Vector3(-1.4, 2.2, 0).add(w.cam.position).normalize());
  }

  /* de kleine beelden: één renderer, op volgorde, en wat al getekend is komt uit het geheugen */
  const klein = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); klein.setPixelRatio(1.5); klein.setSize(320, 240, false);
  const kleinW = maakWereld(); kleinW.cam.aspect = 4 / 3; kleinW.cam.updateProjectionMatrix();
  const beelden = {};
  let rij = Promise.resolve();
  function duimnagel(id, s, plat = false) {
    const k = `${id}|${graden(s.yaw)}|${Math.round(s.pitch)}|${s.lig ? 1 : 0}|${plat ? 1 : 0}`;
    if (beelden[k]) return beelden[k];
    beelden[k] = rij = rij.then(() => new Promise((klaar) => setTimeout(() => {
      zetStand(kleinW, id, s, plat); klein.render(kleinW.scene, kleinW.cam); klaar(klein.domElement.toDataURL('image/jpeg', 0.84));
    }, 0)));
    return beelden[k];
  }

  /* ── het venster ── */
  const dlg = document.getElementById('om-3d'), box = document.getElementById('om-3d-scene');
  const groot = new THREE.WebGLRenderer({ antialias: true }); groot.setPixelRatio(pix); box.prepend(groot.domElement);
  const grootW = maakWereld();
  const rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let huidig = null, isPlat = false, st = { yaw: 0, pitch: 0, lig: false }, toon = { yaw: 0, pitch: 0 }, bezig = false;
  /* alleen een voorkant (Lucas, 15 november 17:12): de draai blijft tussen de zijkanten, behalve bij accessoires */
  const DRAAI = Object.fromEntries(D.groepen.map((g) => [g.id, g.draai || [-180, 180]]));
  const draaiBinnen = (y) => { if (!huidig) return y; const [a, b] = DRAAI[huidig.groep]; return a <= -180 && b >= 180 ? y : Math.max(a, Math.min(b, y)); };
  function maat() { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; groot.setSize(w, h, false); grootW.cam.aspect = w / h; grootW.cam.updateProjectionMatrix(); vraag(); }
  new ResizeObserver(maat).observe(box);
  function vraag() { if (!bezig) { bezig = true; requestAnimationFrame(stap); } }
  function stap() {
    bezig = false; if (!huidig) return;
    toon.yaw += (st.yaw - toon.yaw) * 0.22; toon.pitch += (st.pitch - toon.pitch) * 0.22;
    if (rustig || Math.abs(st.yaw - toon.yaw) < 0.05) toon.yaw = st.yaw;
    if (rustig || Math.abs(st.pitch - toon.pitch) < 0.05) toon.pitch = st.pitch;
    zetStand(grootW, huidig.model, { yaw: toon.yaw, pitch: toon.pitch, lig: st.lig }, isPlat); groot.render(grootW.scene, grootW.cam);
    document.getElementById('om-3d-stand').textContent = `${T('draai', 'turn')} ${graden(st.yaw)}°  ·  ${T('kantel', 'tilt')} ${Math.round(st.pitch)}°${st.lig ? `  ·  ${T('plat', 'flat')}` : ''}`;
    if (toon.yaw !== st.yaw || toon.pitch !== st.pitch) vraag();
  }
  function zetHoek(s, meteen) { st = { ...s, yaw: draaiBinnen(s.yaw) }; if (meteen) toon = { yaw: s.yaw, pitch: s.pitch }; vraag(); }
  const pillen = document.getElementById('om-3d-hoeken');
  const geenHoek = () => pillen.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  function open(r, stand, plat = false) {
    huidig = r; isPlat = plat;
    document.getElementById('om-3d-titel').textContent = r.naam;
    document.getElementById('om-3d-groep').textContent = `${GROEPNAAM[r.groep]} · ${T('eigen stand', 'own pose')}`;
    const noot = document.getElementById('om-3d-notitie');
    noot.value = r.el.querySelector('[data-veld="voorkant.tekst"]').value || '';
    pillen.textContent = '';
    for (const h of HOEKEN[r.groep]) {
      const k = document.createElement('button'); k.type = 'button'; k.className = 'om-pilknop'; k.textContent = h.naam;
      k.setAttribute('aria-pressed', String(Math.abs(graden(h.yaw - stand.yaw)) < 3 && Math.abs(h.pitch - stand.pitch) < 3 && !!h.lig === !!stand.lig));
      k.addEventListener('click', () => { geenHoek(); k.setAttribute('aria-pressed', 'true'); zetHoek({ yaw: h.yaw, pitch: h.pitch, lig: !!h.lig }); });
      pillen.appendChild(k);
    }
    dlg.showModal(); zetHoek(stand, true); maat();
  }
  let sleep = null;
  const binnen = (v, a, b) => Math.max(a, Math.min(b, v));
  box.addEventListener('pointerdown', (e) => { sleep = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', (e) => { if (!sleep) return; zetHoek({ yaw: sleep.yaw + (e.clientX - sleep.x) * 0.45, pitch: binnen(sleep.pitch + (e.clientY - sleep.y) * 0.3, -10, 85), lig: st.lig }); geenHoek(); });
  const los = () => { sleep = null; };
  box.addEventListener('pointerup', los); box.addEventListener('pointercancel', los);
  box.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
    if (m) { e.preventDefault(); zetHoek({ yaw: st.yaw + m[0], pitch: binnen(st.pitch + m[1], -10, 85), lig: st.lig }); geenHoek(); }
  });
  const sluit = () => { if (dlg.open) dlg.close(); huidig = null; };
  document.getElementById('om-3d-sluit').addEventListener('click', sluit);
  dlg.addEventListener('cancel', () => { huidig = null; });
  document.getElementById('om-3d-gebruik').addEventListener('click', () => {
    const r = huidig; if (!r) return;
    zetEigen(r.el, { ...st }, document.getElementById('om-3d-notitie').value.trim().slice(0, 400)); sluit(); teken();
  });
  document.getElementById('om-3d-groep-terug').addEventListener('click', () => { const r = huidig; if (!r) return; zetEigen(r.el, null); sluit(); teken(); });
  return { duimnagel, open };
}

/* ── DE STAND, PER GROEP EN PER PRODUCT ─────────────────────────────────────────────────────────────────────────
   Wat dit bestand doet, zonder 3D: de groepen tonen die bij "Je producten" horen, en per product een tegel met wat het
   kost (alleen de bedragen per stuk uit de pagina, die uit src/data/opMaatPrijs.js komen; het totaal rekent de server).
   Met 3D (WebGL): een klein beeld per product in zijn stand, en een venster om één product anders te zetten.
   De eigen stand van een product staat in vier verborgen velden van zijn rij (voorkant.yaw, .pitch, .lig, .tekst);
   op-maat.js leest die mee bij het opslaan, net als de andere velden. */
const sectie = document.getElementById('om-standen');
const form = document.getElementById('om-form');
const om = document.getElementById('om');
if (sectie && form && om) start();

function start() {
  const D = JSON.parse(sectie.dataset.stand || '{}');
  const nl = om.dataset.taal !== 'en';
  const T = (a, b) => (nl ? a : b);
  const bewerk = om.dataset.bewerk === '1';
  /* twee looks (Lucas, 15 november 17:15): ghost mannequin of flat lay, elk met zijn eigen hoeken */
  const look = () => { const c = form.querySelector('input[name="standLook"]:checked'); return c ? c.value : 'ghost'; };
  const GROEP = Object.fromEntries(D.groepen.map((g) => [g.id, g]));
  const HOEKEN = new Proxy({}, { get: (_, g) => GROEP[g].hoeken[look()] });
  /* plat: kleding ligt bij flat lay plat (het model wordt platgedrukt); schoenen en accessoires staan op de grond */
  const plat = (g) => look() === 'flatlay' && GROEP[g].kleding;
  const GROEPNAAM = Object.fromEntries(D.groepen.map((g) => [g.id, g.naam]));
  const graden = (v) => Math.round((((v % 360) + 540) % 360) - 180);
  const zelfde = (a, b) => Math.abs(graden(a.yaw - b.yaw)) < 3 && Math.abs(a.pitch - b.pitch) < 3 && !!a.lig === !!b.lig;
  const alsStand = (h) => ({ yaw: h.yaw, pitch: h.pitch, lig: !!h.lig });
  const rijenBox = form.querySelector('[data-rij="soorten"]');
  const veld = (rij, n) => rij.querySelector(`[data-veld="voorkant.${n}"]`);

  /* ── wat geldt ── */
  function groepHoek(g) {
    const c = sectie.querySelector(`input[name="stand-${look()}-${g}"]:checked`);
    return c ? c.value : HOEKEN[g][0].id;
  }
  function groepStand(g) {
    const id = groepHoek(g);
    return alsStand(id === 'wij' ? HOEKEN[g][0] : (HOEKEN[g].find((h) => h.id === id) || HOEKEN[g][0]));
  }
  function eigenVan(rij) {
    const y = veld(rij, 'yaw'), p = veld(rij, 'pitch');
    if (!y || y.value === '' || !p || p.value === '') return null;
    return { yaw: Number(y.value), pitch: Number(p.value), lig: veld(rij, 'lig').checked };
  }
  function zetEigen(rij, s, tekst) {
    veld(rij, 'yaw').value = s ? String(graden(s.yaw)) : '';
    veld(rij, 'pitch').value = s ? String(Math.round(s.pitch)) : '';
    veld(rij, 'lig').checked = !!(s && s.lig);
    veld(rij, 'tekst').value = s ? (tekst || '') : '';
    veld(rij, 'yaw').dispatchEvent(new Event('change', { bubbles: true }));   /* op-maat.js slaat op */
  }
  function rijen() {
    const uit = [];
    rijenBox.querySelectorAll('[data-rij-item]').forEach((el) => {
      const soort = el.querySelector('[data-veld="soort"]').value;
      const info = D.soorten[soort];
      if (info) uit.push({ el, soort, groep: info.groep, model: info.model, naam: info.naam });
    });
    /* twee keer dezelfde soort: een nummer erachter */
    const tel = {};
    uit.forEach((r) => { tel[r.soort] = (tel[r.soort] || 0) + 1; r.nr = tel[r.soort]; });
    uit.forEach((r) => { if (tel[r.soort] > 1) r.naam = `${r.naam} ${r.nr}`; });
    return uit;
  }
  function standVan(r) {
    const eigen = eigenVan(r.el), groep = groepStand(r.groep);
    if (eigen && zelfde(eigen, groep)) { zetEigen(r.el, null); return { stand: groep, eigen: false }; }
    return eigen ? { stand: eigen, eigen: true } : { stand: groep, eigen: false };
  }
  const isStandaard = (r, s) => zelfde(s, alsStand(HOEKEN[r.groep][0]));

  /* ── de tegels ── */
  let drie = null;          /* de 3D-kant, als die er is */
  let geenDrie = false;
  function teken() {
    const lijst = rijen();
    for (const g of D.groepen) {
      const box = sectie.querySelector(`[data-groep="${g.id}"]`);
      const mijn = lijst.filter((r) => r.groep === g.id);
      box.hidden = !mijn.length;
      if (!mijn.length) continue;
      box.querySelector('[data-groep-namen]').textContent = mijn.map((r) => r.naam).join(' · ');
      const tegels = box.querySelector('[data-tegels]');
      tegels.textContent = '';
      const wij = groepHoek(g.id) === 'wij';
      let eigen = 0;
      for (const r of mijn) {
        const { stand, eigen: isEigen } = standVan(r);
        if (isEigen) eigen++;
        const std = isStandaard(r, stand);
        const fig = document.createElement('figure'); fig.className = 'om-3d-tegel';
        const beeld = document.createElement('div'); beeld.className = 'om-3d-beeld';
        if (drie && r.model) {
          const img = document.createElement('img'); img.alt = T(`${r.naam} in de gekozen stand`, `${r.naam} in the chosen pose`); img.width = 320; img.height = 240;
          beeld.appendChild(img);
          drie.duimnagel(r.model, stand, plat(r.groep)).then((url) => { img.src = url; });
        } else {
          const p = document.createElement('p'); p.className = 'om-3d-zonder';
          p.textContent = r.model ? (geenDrie ? T('Geen 3D in deze browser', 'No 3D in this browser') : T('Laden…', 'Loading…')) : T('Hier geen 3D-model: zeg in de notitie hoe hij moet staan', 'No 3D model here: say in the note how it should sit');
          beeld.appendChild(p);
        }
        if (isEigen) { const s = document.createElement('span'); s.className = 'om-3d-eigen'; s.textContent = T('Eigen stand', 'Own pose'); beeld.appendChild(s); }
        const cap = document.createElement('figcaption');
        const b = document.createElement('b'); b.textContent = r.naam;
        const k = document.createElement('small');
        k.textContent = std
          ? (wij && !isEigen ? T('Wij kiezen · kosteloos', 'We choose · free') : T('Standaard · kosteloos', 'Standard · free'))
          : `${isEigen ? T('Eigen stand', 'Own pose') : T('Stand van de groep', 'Group pose')} · + €${D.prijs.per} ${T('per product per bestelling', 'per product per order')}`;
        cap.append(b, k);
        fig.append(beeld, cap);
        if (bewerk && drie && r.model) {
          const knop = document.createElement('button'); knop.type = 'button'; knop.className = 'om-tekstknop';
          knop.dataset.rol = isEigen ? 'wijzigen' : 'aanmerken';
          knop.textContent = isEigen ? T('Eigen stand aanpassen', 'Adjust own pose') : T('Anders laten staan', 'Pose it differently');
          knop.addEventListener('click', () => drie.open(r, standVan(r).stand, plat(r.groep)));
          cap.appendChild(knop);
        }
        tegels.appendChild(fig);
      }
      const stat = box.querySelector('[data-groep-stand]');
      stat.textContent = eigen ? T(`${eigen} ${eigen === 1 ? 'product staat' : 'producten staan'} anders dan de groep.`, `${eigen} ${eigen === 1 ? 'product is' : 'products are'} posed differently from the group.`) : '';
    }
    sectie.querySelector('[data-geen-producten]').hidden = lijst.length > 0;
  }

  /* een andere look: de rij hoeken van die look telt, en een eigen stand van de vorige look vervalt */
  function zetLook() {
    const lk = look();
    sectie.querySelectorAll('[data-look]').forEach((rij) => {
      const aan = rij.dataset.look === lk;
      rij.hidden = !aan;
      rij.querySelectorAll('input').forEach((i) => { i.disabled = !aan; });
    });
  }
  form.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="standLook"]')) return;
    zetLook();
    let weg = 0;
    rijen().forEach((r) => { if (eigenVan(r.el)) { zetEigen(r.el, null); weg++; } });
    const m = sectie.querySelector('[data-look-melding]');
    m.textContent = weg ? T(`Je ${weg === 1 ? 'eigen stand past' : `${weg} eigen standen passen`} niet bij deze look en ${weg === 1 ? 'is' : 'zijn'} weggehaald.`, `Your ${weg === 1 ? 'own pose does' : `${weg} own poses do`} not fit this look and ${weg === 1 ? 'was' : 'were'} removed.`) : '';
  });
  zetLook();

  let wacht = 0;
  const straks = () => { cancelAnimationFrame(wacht); wacht = requestAnimationFrame(teken); };
  form.addEventListener('change', (e) => { if (e.target.closest('[data-rij="soorten"]') || e.target.closest('#om-standen')) straks(); });
  form.addEventListener('click', (e) => { if (e.target.closest('[data-rij-erbij], [data-rij-weg]')) setTimeout(straks, 0); });
  teken();

  /* ── 3D: alleen als de browser WebGL kan ── */
  const proef = document.createElement('canvas');
  const kan = !!(window.WebGLRenderingContext && (proef.getContext('webgl2') || proef.getContext('webgl')));
  if (!kan) { geenDrie = true; sectie.querySelector('[data-geen-3d]').hidden = false; teken(); return; }
  import('/js/three.module.min.js').then((THREE) => { drie = maakDrie(THREE, { D, T, HOEKEN, GROEPNAAM, graden, zelfde, zetEigen, eigenVan, groepStand, teken, plat }); teken(); },
    () => { geenDrie = true; sectie.querySelector('[data-geen-3d]').hidden = false; teken(); });
}
