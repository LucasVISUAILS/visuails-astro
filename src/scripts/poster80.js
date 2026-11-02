/* VISUAILS — de logoposter van de voorpagina (levering 80, 1 november 2026; HalPoster80.astro).
   ═══════════════════════════════════════════════════════════════════════════════
   Het V-merk wordt een venster, zoals het logo in Lucas' voorbeeldvideo. Alles volgt het scrollen door
   de baan (180 svh), met een licht na-ijlen: de getoonde stand komt elk beeld 16 % dichter bij de stand
   van de pagina ("een soort scroll lag effect heel licht").

   DE STAND p (0 – 1) IN DRIE DELEN:
   - 0,08 – 0,28  de regel en de hoekbijschriften gaan weg;
   - 0,10 – 0,30  de foto verschijnt in de V (de V is nog even groot);
   - 0,30 – 0,86  de V groeit om zijn dikste punt (het midden van de grootste cirkel die erin past:
                  (451, 611) in de eenheden van het merk, straal 91,5), van 1 × tot hij het scherm dekt.
                  De groei is exponentieel (elke stap even veel "dichterbij") op de golf (ease-in-out),
                  en dat punt schuift naar het midden van het scherm;
   - daarna       de foto vult het scherm; het plaatje met de look komt erbij.
   De foto zelf zoomt over de hele baan heel licht uit (1,10 → 1,00), zodat hij nooit stilstaat.

   Het merk is #markglyph (Layout.astro): het script leest zijn paden uit de pagina, er is niets nagetekend.
   ═══════════════════════════════════════════════════════════════════════════════ */

const V_H = 813.25, V_MX = 351, V_MY = 406.625;     /* het midden van het vak van het merk (zoals de svg in de css) */
const KERN = { x: 451.25, y: 611.25, r: 91.5 };
const NAIJL = 0.16;
const stap = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const golf = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function poster(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const baan = root.querySelector('[data-p8-baan]'), podium = root.querySelector('[data-p8-podium]');
  const doek = root.querySelector('[data-p8-doek]'), look = root.querySelector('[data-p8-look]');
  const paden = [...document.querySelectorAll('#markglyph path')].map((p) => p.getAttribute('d')).filter(Boolean);
  const ctx = doek?.getContext('2d', { alpha: true });
  if (!baan || !podium || !doek || !ctx || !paden.length || typeof Path2D === 'undefined') return () => {};
  const V = new Path2D();
  for (const d of paden) V.addPath(new Path2D(d));

  root.classList.add('p8-aan');
  doek.hidden = false;

  let p = 0, ps = 0, raf = 0, t0 = 0, dichtbij = false, foto = null, eind = false;
  let W = 0, H = 0, d = 1;

  function laadFoto() {
    if (foto) return;
    const bron = look?.dataset.foto;
    if (!bron) return;
    const nodig = innerWidth * Math.min(devicePixelRatio || 1, 2);
    const img = new Image();
    img.decoding = 'async';
    img.src = `${bron}${nodig > 1560 ? '' : nodig > 1200 ? '-w1560' : '-w1200'}.webp`;
    img.decode().then(() => { foto = img; wek(); }).catch(() => {});
  }

  /* de hoogte van de V op 1 ×: die van de (verborgen) svg, zodat de css de maat houdt (--p8-vh) */
  const svg = root.querySelector('.p8-v');
  let vHoog = 0;
  function maat() {
    vHoog = svg ? svg.getBoundingClientRect().height : 0;
    const r = podium.getBoundingClientRect();
    d = Math.min(devicePixelRatio || 1, 2);
    const b = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (b !== W || h !== H) { W = b; H = h; doek.width = W; doek.height = H; }
  }

  function stand() {
    const r = baan.getBoundingClientRect();
    const loop = r.height - podium.offsetHeight;
    return loop > 0 ? Math.min(1, Math.max(0, -r.top / loop)) : 0;
  }

  /* LICHTER (levering 83, gemeten in lijst 68): alleen tekenen als er iets veranderd is (de stand, de maat of de
     foto), en de css-variabele alleen zetten als hij verandert. Eerst gebeurde allebei elk beeld, ook waar de V
     al het hele scherm dekte: dan rekende de browser elk beeld de opmaak van de poster opnieuw uit. */
  let laatst = '', wegNu = '';
  function teken(q) {
    const sleutel = `${q.toFixed(4)} ${W} ${H} ${foto ? 1 : 0} ${vHoog}`;
    if (sleutel === laatst) return;
    laatst = sleutel;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const weg = stap(q, 0.08, 0.28), inV = stap(q, 0.10, 0.30), e = golf(stap(q, 0.30, 0.86));
    const wegT = weg.toFixed(3);
    if (wegT !== wegNu) { wegNu = wegT; root.style.setProperty('--p8-weg', wegT); }
    const nu = q > 0.9;
    if (nu !== eind) { eind = nu; root.classList.toggle('is-eind', nu); }

    /* de V op 1 ×: zo hoog als --p8-vh, zijn midden op 44 % van het podium (zoals de svg in de css) */
    const vh = vHoog || 0.34 * H / d;
    const k = (vh * d) / V_H;
    const cx = W / 2, cy = H * 0.44;
    const P0x = cx + (KERN.x - V_MX) * k, P0y = cy + (KERN.y - V_MY) * k;
    /* tot welke maat: de cirkel in de V moet het hele scherm dekken (de halve diagonaal, plus 6 %) */
    const sEind = (Math.hypot(W, H) / 2) * 1.06 / (KERN.r * k);
    const s = Math.exp(Math.log(sEind) * e);
    const Px = P0x + (W / 2 - P0x) * e, Py = P0y + (H / 2 - P0y) * e;

    const vorm = () => { ctx.setTransform(k * s, 0, 0, k * s, Px - KERN.x * k * s, Py - KERN.y * k * s); };
    const fotoTeken = (alpha) => {
      if (!foto) return;
      /* cover over het podium, met een lichte zoom over de hele baan */
      const z = 1.1 - 0.1 * q;
      const sc = Math.max(W / foto.naturalWidth, H / foto.naturalHeight) * z;
      const fb = foto.naturalWidth * sc, fh = foto.naturalHeight * sc;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.drawImage(foto, (W - fb) / 2, (H - fh) / 2, fb, fh);
      ctx.globalAlpha = 1;
    };

    if (e >= 0.999 && foto) { fotoTeken(1); return; }
    /* de V in Wit; daarin de foto */
    vorm();
    if (inV < 1 || !foto) { ctx.fillStyle = '#FBFCFF'; ctx.fill(V); }
    if (inV > 0 && foto) {
      ctx.save();
      vorm(); ctx.clip(V);
      fotoTeken(inV);
      ctx.restore();
    }
  }

  function tik(t) {
    raf = 0;
    const dt = t0 ? Math.min(4, (t - t0) / 16.667) : 1;
    t0 = t;
    p = stand();
    ps += (p - ps) * (1 - Math.pow(1 - NAIJL, dt));
    if (Math.abs(p - ps) < 0.0004) ps = p;
    teken(ps);
    if (ps !== p) raf = requestAnimationFrame(tik);
    else t0 = 0;
  }
  const wek = () => { if (!raf) raf = requestAnimationFrame(tik); };
  const opScroll = () => { if (dichtbij) wek(); };

  const io = new IntersectionObserver((items) => {
    for (const it of items) {
      dichtbij = it.isIntersecting;
      if (dichtbij) { laadFoto(); maat(); p = ps = stand(); teken(ps); }
    }
  }, { rootMargin: '100% 0px' });
  io.observe(root);
  const ro = new ResizeObserver(() => { maat(); teken(ps); });
  ro.observe(podium);
  addEventListener('scroll', opScroll, { passive: true });
  maat(); teken(0);

  return () => {
    cancelAnimationFrame(raf); raf = 0;
    io.disconnect(); ro.disconnect();
    removeEventListener('scroll', opScroll);
    root.classList.remove('p8-aan', 'is-eind');
    doek.hidden = true;
  };
}
