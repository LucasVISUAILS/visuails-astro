/*
 * VISUAILS — licht onder het doek (levering 109; lijst 116 en 117).
 *
 * Lucas (lijst 116): "een soort van draden systeem heel subtiel in de gehele website … alsof het allemaal met elkaar verbindt
 * en bij de kaarten springen die draden er wat uit". Lijst 117, keuze a: het net is geen kabel maar licht. De pagina is het
 * doek van een softbox; daaronder lopen banen van wit licht met een zweem mint. Waar een kaart ligt, komt het licht naar
 * boven: daar gaat het over in de draad van de kaart (kaartveld.js), en daar ontstaat een beeld.
 * Lucas, 16 november 00:00: de banen blijven weg van tekst en knoppen, de gloed loopt zacht af, en alles is subtiel: "het
 * moet niet afleiden van wat belangrijk is".
 *
 * HOE: één doek (canvas) vast achter de pagina, onder alle inhoud (z-index -1). De banen beginnen waar de lijn van een kaart
 * de kaart uit gaat (window.__kvLijnen, uit kaartveld.js) en lopen naar de volgende kaart, en een paar lopen van rand tot
 * rand. Het stilstaande licht wordt per strook van 1024 px één keer getekend en bewaard; per beeld komt alleen de stroom
 * erbij (een zachte golf van licht die door de baan trekt), hoogstens 24 keer per seconde. Bij minder beweging staat de
 * stroom stil. Buiten beeld, in een verborgen tabblad of op een te traag toestel tekent het niet opnieuw.
 */
const KAART_UIT = '.site-header, .site-footer, [data-kaart], .h-proef-woord, .h-lk-slot, .h-gd-brief, .h-nf-getal, canvas';
const OBSTAKEL = 'main :is(h1, h2, h3, h4, p, li, a, button, label, input, select, textarea, .h-pil, .h-chip)';   /* tekst en knoppen; onder een foto is het licht toch niet te zien */
const GROND = '#FCFCFC';
const STROOK = 1024;

/* window.__lnUit: voor toetsen die de grond zelf meten (grond-79, posterkleur-89); window.__kvUit zet het veld en dus ook dit uit */
if (document.body.classList.contains('hal') && !window.__kvUit && !window.__lnUit) {
  const doek = document.createElement('canvas');
  doek.className = 'ln-doek'; doek.setAttribute('aria-hidden', 'true');
  Object.assign(doek.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '-1', pointerEvents: 'none' });
  const ctx = doek.getContext('2d', { willReadFrequently: true });   /* ook in het werkgeheugen: zo blijft de grafische kaart vrij voor het kaartveld, en hoeft niets teruggelezen te worden */
  const minder = matchMedia('(prefers-reduced-motion: reduce)');
  let banen = [], stroken = new Map(), W = 0, dpr = 1, actief = false, mis = 0;

  const pag = (r) => [r.left + scrollX, r.top + scrollY, r.width, r.height];
  const afstand = (x, y, vs) => { let m = 1e9; for (const v of vs) { const d = Math.hypot(Math.max(v[0] - x, 0, x - v[0] - v[2]), Math.max(v[1] - y, 0, y - v[1] - v[3])); if (d < m) m = d; } return m; };
  const glad = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function bezier(p0, p1, p2, p3) {
    const pts = [], n = Math.max(24, Math.ceil(Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) / 6));
    for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
    return pts;
  }
  /* een baan: de punten, hoe sterk het licht op elk punt is (0 bij tekst, knoppen en beelden; zacht op en af aan de uiteinden),
     de lengte langs de baan, en waar hij ligt */
  function baan(pts, obst, kopUit, staartUit, fase) {
    let s = 0; const L = [], kracht = [];
    for (let i = 0; i < pts.length; i++) { if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(s); }
    for (let i = 0; i < pts.length; i++) {
      const vrij = glad(8, 48, afstand(pts[i][0], pts[i][1], obst));   /* een veiligheid: waar de afgeronde baan toch dicht bij tekst komt, zakt het licht weg */
      const kop = kopUit ? glad(0, 180, L[i]) : 1, staart = staartUit ? glad(0, 180, s - L[i]) : 1;
      kracht.push(vrij * kop * staart);
    }
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { pts, L, kracht, lengte: s, y0: y0 - 40, y1: y1 + 40, fase };
  }
  /* DE ROUTE (levering 109): een baan zoekt zijn weg om tekst, knoppen en andere kaarten heen, door de marges en de ruimte tussen
     de secties. Een raster van 24 px; elke cel kost meer naarmate hij dichter bij tekst ligt (A*), en wat in of vlak naast tekst
     ligt, is dicht. Daarna wordt de route vereenvoudigd en zacht afgerond (Chaikin), zodat hij als één vloeiende baan loopt. */
  const CEL = 24;
  function raster(obst, W, H) {
    const kol = Math.ceil(W / CEL) + 1, rij = Math.ceil(H / CEL) + 1, dicht = new Uint8Array(kol * rij), afst = new Float32Array(kol * rij).fill(1e9);
    const rand = [];
    for (const v of obst) {
      const x0 = Math.max(0, Math.floor((v[0] - 14) / CEL)), x1 = Math.min(kol - 1, Math.floor((v[0] + v[2] + 14) / CEL));
      const y0 = Math.max(0, Math.floor((v[1] - 14) / CEL)), y1 = Math.min(rij - 1, Math.floor((v[1] + v[3] + 14) / CEL));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * kol + x; if (!dicht[i]) { dicht[i] = 1; afst[i] = 0; rand.push(i); } }
    }
    /* de afstand tot de dichtstbijzijnde tekst, in cellen (breedte eerst) */
    let rij2 = rand;
    while (rij2.length) { const volg = []; for (const i of rij2) { const x = i % kol, y = (i / kol) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= kol || ny >= rij) continue; const j = ny * kol + nx; if (afst[j] > afst[i] + 1) { afst[j] = afst[i] + 1; volg.push(j); } } } rij2 = volg; }
    return { kol, rij, dicht, afst };
  }
  function route(R, a, b) {
    const { kol, rij, dicht, afst } = R, cel = (p) => [Math.min(kol - 1, Math.max(0, Math.round(p[0] / CEL))), Math.min(rij - 1, Math.max(0, Math.round(p[1] / CEL)))];
    const [ax, ay] = cel(a), [bx, by] = cel(b), start = ay * kol + ax, doel = by * kol + bx;
    for (const [cx, cy] of [[ax, ay], [bx, by]]) for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (x >= 0 && y >= 0 && x < kol && y < rij) dicht[y * kol + x] = 0;   /* begin en eind zijn altijd vrij */
    const kost = new Float32Array(kol * rij).fill(1e9), van = new Int32Array(kol * rij).fill(-1), open = [[0, start]];
    kost[start] = 0;
    const h = (i) => { const x = i % kol, y = (i / kol) | 0, dx = Math.abs(x - bx), dy = Math.abs(y - by); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
    const duw = (e) => { open.push(e); let i = open.length - 1; while (i) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const pak = () => { const top = open[0], laatste = open.pop(); if (open.length) { open[0] = laatste; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
    let stappen = 0;
    const klaar = new Uint8Array(kol * rij);
    while (open.length && stappen++ < 400000) {
      const [, i] = pak(); if (klaar[i]) continue; klaar[i] = 1; if (i === doel) break;
      const x = i % kol, y = (i / kol) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= kol || ny >= rij) continue;
        const j = ny * kol + nx; if (dicht[j] && j !== doel) continue;
        const k = kost[i] + (dx && dy ? 1.414 : 1) * (1 + 24 * Math.exp(-afst[j] / 2.2));
        if (k < kost[j]) { kost[j] = k; van[j] = i; duw([k + h(j), j]); }
      }
    }
    if (van[doel] < 0) return null;
    const pts = []; for (let i = doel; i >= 0; i = van[i]) { pts.push([(i % kol) * CEL, ((i / kol) | 0) * CEL]); if (i === start) break; }
    pts.reverse(); pts[0] = a; pts[pts.length - 1] = b;
    return rond(eenvoudig(pts, 30));
  }
  function eenvoudig(p, eps) {   /* Ramer–Douglas–Peucker */
    if (p.length < 3) return p;
    const [a, b] = [p[0], p[p.length - 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let m = 0, mi = 0; for (let i = 1; i < p.length - 1; i++) { const d = Math.abs((b[0] - a[0]) * (a[1] - p[i][1]) - (a[0] - p[i][0]) * (b[1] - a[1])) / l; if (d > m) { m = d; mi = i; } }
    return m > eps ? eenvoudig(p.slice(0, mi + 1), eps).slice(0, -1).concat(eenvoudig(p.slice(mi), eps)) : [a, b];
  }
  function rond(p) {   /* Chaikin, vier keer, en dan om de 6 px een punt */
    for (let k = 0; k < 4; k++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } q.push(p[p.length - 1]); p = q; }
    const uit = [p[0]]; for (let i = 1; i < p.length; i++) { const a = uit[uit.length - 1], b = p[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d >= 6) { const n = Math.floor(d / 6); for (let j = 1; j <= n; j++) uit.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } }
    return uit;
  }
  function bouw(uiteinden) {
    W = document.documentElement.clientWidth;
    const H = document.documentElement.scrollHeight;
    const obst = [...document.querySelectorAll(OBSTAKEL)].filter((e) => !e.closest(KAART_UIT)).map((e) => pag(e.getBoundingClientRect())).filter((v) => v[2] > 0 && v[3] > 0 && v[3] < 260);   /* geen grote blokken (een hele kaart of rij is geen tekst) */
    const eind = uiteinden.filter((u) => !u.opZwart).sort((a, b) => a.y - b.y);
    const kaarten = eind.map((u) => [u.kaart[0] - 6, u.kaart[1] - 6, u.kaart[2] + 12, u.kaart[3] + 12]);
    const R = raster(obst.concat(kaarten), W, H);
    banen = []; mis = 0;
    /* vanaf het uiteinde eerst een recht stuk in de richting van de lijn, zodat het licht de draad uit de kaart voortzet */
    const uit = (u) => [[u.x + u.tx * 40, u.y + u.ty * 40], [u.x + u.tx * 130, u.y + u.ty * 130]];
    const voeg = (kop, pts, staart, fase, kopUit, staartUit) => { if (!pts) { mis += 1; return; } const alle = (kop ? rond(kop.concat([pts[0]])) : []).concat(pts).concat(staart ? rond([pts[pts.length - 1]].concat(staart)).slice(1) : []); banen.push(baan(alle, obst, kopUit, staartUit, fase)); };
    eind.forEach((u, i) => {
      const [a0, a1] = uit(u), v = eind[i + 1];
      if (v) { const [b0, b1] = uit(v); voeg([a0], route(R, a1, b1), [b0], i * .37, true, true); }
      const rechts = u.tx >= 0, ry = Math.max(40, Math.min(H - 40, u.y + (i % 2 ? 320 : -320)));
      voeg([a0], route(R, a1, [rechts ? W - 2 : 2, ry]), [[rechts ? W + 60 : -60, ry]], i * .37 + .5, true, false);
    });
    /* een paar banen van rand tot rand, tussen de secties door */
    const n = Math.max(2, Math.round(H / 1500));
    for (let k = 0; k < n; k++) {
      const y = (k + .5) * H / n, l = k % 2 === 0;
      voeg([[l ? -60 : W + 60, y - 120]], route(R, [l ? 2 : W - 2, y - 120], [l ? W - 2 : 2, y + 160]), [[l ? W + 60 : -60, y + 160]], .21 * k, false, false);
    }
    stroken.clear();
  }
  /* het stilstaande licht van één strook: een zweem mint (breed en wazig) met een kern van wit licht */
  function strook(i) {
    if (stroken.has(i)) return stroken.get(i);
    const y0 = i * STROOK, h = STROOK, s = Math.min(dpr, 1.5);
    const maak = () => { const c = document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(h * s); const x = c.getContext('2d', { willReadFrequently: true });   /* de stroken in het werkgeheugen: zo hoeft de grafische kaart niets terug te lezen (geen GPU-stall) */ x.setTransform(s, 0, 0, s, 0, -y0 * s); x.lineCap = 'butt'; x.lineJoin = 'round'; return [c, x]; };
    const [zw, zx] = maak(), [kn, kx] = maak(), [uit, ux] = maak();
    for (const b of banen) {
      if (b.y1 < y0 || b.y0 > y0 + h) continue;
      for (let j = 1; j < b.pts.length; j++) {
        const k = Math.min(b.kracht[j], b.kracht[j - 1]); if (k < .01) continue;
        const p = b.pts[j - 1], q = b.pts[j]; if (Math.max(p[1], q[1]) < y0 - 60 || Math.min(p[1], q[1]) > y0 + h + 60) continue;
        zx.beginPath(); zx.moveTo(p[0], p[1]); zx.lineTo(q[0], q[1]); zx.strokeStyle = `rgba(157,245,210,${.11 * k})`; zx.lineWidth = 16; zx.stroke();
        kx.beginPath(); kx.moveTo(p[0], p[1]); kx.lineTo(q[0], q[1]); kx.strokeStyle = `rgba(255,255,255,${k})`; kx.lineWidth = 4; kx.stroke();
      }
    }
    ux.setTransform(1, 0, 0, 1, 0, 0);
    ux.filter = `blur(${7 * s}px)`; ux.drawImage(zw, 0, 0);
    ux.filter = `blur(${1.6 * s}px)`; ux.drawImage(kn, 0, 0);
    ux.filter = 'none';
    const r = { c: uit, s }; stroken.set(i, r); return r;
  }
  /* de stroom: een zachte golf van licht door de baan, elke 560 px één, 70 px per seconde */
  function stroom(t, top, bodem) {
    ctx.lineCap = 'butt';
    for (const b of banen) {
      if (b.y1 < top || b.y0 > bodem) continue;
      for (let j = 1; j < b.pts.length; j++) {
        const k = b.kracht[j]; if (k < .05) continue;
        const x = (((b.L[j] / 560 - t * .125 + b.fase) % 1) + 1) % 1, g = Math.exp(-Math.pow((x - .5) * 10, 2)) * k;
        if (g < .03) continue;
        const p = b.pts[j - 1], q = b.pts[j]; if (q[1] < top - 40 || q[1] > bodem + 40) continue;
        ctx.beginPath(); ctx.moveTo(p[0], p[1] - top); ctx.lineTo(q[0], q[1] - top);
        ctx.strokeStyle = `rgba(61,255,176,${.045 * g})`; ctx.lineWidth = 22; ctx.stroke();
        ctx.strokeStyle = `rgba(157,245,210,${.08 * g})`; ctx.lineWidth = 10; ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${.9 * g})`; ctx.lineWidth = 3; ctx.stroke();
      }
    }
  }
  const t0 = performance.now();
  function teken(nu) {
    const t = minder.matches ? 2 : (nu - t0) / 1000, top = scrollY, bodem = top + innerHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, doek.width, doek.height);
    for (let i = Math.floor(top / STROOK); i <= Math.floor(bodem / STROOK); i++) {
      const r = strook(i); ctx.drawImage(r.c, 0, (i * STROOK - top) * dpr, r.c.width / r.s * dpr, r.c.height / r.s * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); stroom(t, top, bodem);
  }
  let raf = 0, vorige = 0, gemiddeld = 0, beelden = 0, traag = false;
  function lus(nu) {
    if (nu - vorige >= 41) { vorige = nu; const a = performance.now(); teken(nu); const duur = performance.now() - a; beelden += 1; gemiddeld += (duur - gemiddeld) / Math.min(beelden, 10); if (beelden >= 6 && gemiddeld > 12) traag = true; }
    raf = (traag || minder.matches || document.hidden) ? 0 : requestAnimationFrame(lus);
  }
  const wek = () => { if (!actief) return; if (traag || minder.matches) { teken(performance.now()); return; } if (!raf) raf = requestAnimationFrame(lus); };
  function maat() { dpr = Math.min(devicePixelRatio || 1, 2); doek.width = Math.round(innerWidth * dpr); doek.height = Math.round(innerHeight * dpr); }
  let wacht = 0;
  function opnieuw(e) {
    clearTimeout(wacht);
    wacht = setTimeout(() => {
      const u = (e && e.detail) || window.__kvLijnen; if (!u || !u.length) return;
      if (!actief) {
        actief = true; document.body.prepend(doek);
        /* het doek ligt onder de inhoud maar boven de grond: de grond gaat naar html, body wordt doorzichtig */
        document.documentElement.style.background = GROND; document.body.style.background = 'transparent';
        document.documentElement.classList.add('ln-aan');
      }
      maat(); bouw(u); teken(performance.now()); wek();
    }, 120);
  }
  /* het licht begint pas als de pagina rustig is (na het laden, en dan nog anderhalve seconde of de eerste keer scrollen):
     het kaartveld start dan eerst alleen, en de grafische kaart hoeft niet beide tegelijk op te zetten */
  let klaar = false;
  const begin = () => { if (klaar) return; klaar = true; addEventListener('kv-lijnen', opnieuw); if (window.__kvLijnen) opnieuw(); };
  const later = () => setTimeout(() => (window.requestIdleCallback || setTimeout)(begin, { timeout: 1500 }), 1500);
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
  addEventListener('scroll', begin, { once: true, passive: true });
  addEventListener('resize', () => { maat(); wek(); });
  addEventListener('scroll', () => { if (!raf && actief) teken(performance.now()); }, { passive: true });
  document.addEventListener('visibilitychange', wek);
  minder.addEventListener?.('change', wek);
  /* voor de toetsen: zet de tijd vast en teken meteen */
  window.__lichtnet = { banen: () => banen, mis: () => mis, zet: (t) => { minder.matches || (traag = true); teken(t * 1000 + t0); } };
}
