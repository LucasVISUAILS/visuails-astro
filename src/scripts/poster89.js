/* VISUAILS — de logoposter van de voorpagina (levering 89, 5 november 2026; HalPoster89.astro). Vervangt poster80.js.
   ═══════════════════════════════════════════════════════════════════════════════
   Lijst 81, C1 (goed), met Lucas' notitie: "Dit mag een scroll animatie worden zodat de klant zelf kan beslissen hoelang
   hij ernaar kijkt." Dus: het scrollen door de baan speelt de animatie, met een licht na-ijlen (de getoonde stand komt elk
   beeld 16 % dichter bij de stand van de pagina, zoals in levering 80). Terug scrollen speelt hem terug. Er is geen video:
   alles wordt getekend (kopletter.js, uit de berekening van lijst 81, lengte B), dus scrubben hapert niet.

   DE STAND p (0 – 1) VAN DE BAAN:
   - 0    – 0,06  het tekstlogo staat in wit op het veld (p2: de Snede met het licht rechts);
   - 0,06 – 0,60  de animatie tot en met de klap: de letters gaan de V in, het vlaggetje gaat recht omhoog langs zijn breuk
                  (66,5°) en recht en strak naar zijn plek; bij de klap wordt de V het venster op de foto;
   - 0,58 – 0,72  de kop staat onder de V;
   - 0,70 – 0,95  de V groeit om zijn dikste punt tot de foto het scherm vult;
   - 0,90 –       het plaatje met de look komt erbij.
   Het veld beweegt heel traag op zijn eigen klok (één rondgang ± 45 s), alleen als de poster in beeld is.
   Lucas, 08:00: "Nooit harde randen bij dit soort grote achtergrond secties": het podium loopt boven en onder in het wit
   uit (poster-89.css). Zonder script, zonder WebGL en bij minder beweging: het veld als stil beeld, de V in wit, de kop.
   ═══════════════════════════════════════════════════════════════════════════════ */
import { maakAnimatie } from './kopletter.js';
import { maakVeld } from './veld.js';

const V_D = ['M 0.0 16.0 L 144.25 266.75 L 463.25 813.25 L 662.75 354.75 L 619.25 408.25 L 515.5 546.25 L 264.5 119.0 A 201.21 201.21 0 0 0 101.0 15.75 L 0.0 16.0 Z',
  'M 701.75 0.0 L 543.25 366.25 L 507.25 453.75 L 652.0 259.25 L 702.0 338.25 L 701.75 0.0 Z'];
const NAIJL = 0.16, GROEI = 1000;
const k01 = (x) => Math.min(1, Math.max(0, x));
const stap = (p, a, b) => k01((p - a) / (b - a));

export function poster(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const baan = root.querySelector('[data-p9-baan]'), podium = root.querySelector('[data-p9-podium]');
  const svg = root.querySelector('[data-p9-logo]'), doek = root.querySelector('[data-p9-veld]');
  const kop = root.querySelector('[data-p9-kop]'), look = root.querySelector('[data-p9-look]');
  if (!baan || !podium || !svg || !doek) return () => {};
  let veld = null;
  try { veld = maakVeld(doek, 'p2', { roze: '#9DF5D2', schaal: 0.75, korrelMaat: 1 }); } catch { veld = null; }
  if (!veld) return () => {};   /* geen WebGL: de poster blijft stil (het veld als beeld, de V, de kop) */

  let anim = null, T = null, p = 0, ps = 0, raf = 0, t0 = 0, dichtbij = false, laatst = '', weg = false;
  let veldRaf = 0, veldT0 = performance.now(), veldVorig = 0;

  /* de maat: liggend vult het beeld van 1600 × 900 het podium (slice); staand past het woord in de breedte (meet, x 160 – 1440) */
  function maat() {
    const r = podium.getBoundingClientRect();
    const staand = r.width / Math.max(1, r.height) < 1.2;
    svg.setAttribute('viewBox', staand ? '160 0 1280 900' : '0 0 1600 900');
    svg.setAttribute('preserveAspectRatio', staand ? 'xMidYMid meet' : 'xMidYMid slice');
    const k = staand ? r.width / 1280 : Math.max(r.width / 1600, r.height / 900);
    /* het zichtbare stuk in maten van het beeld: daar moet de foto liggen, en dat moet de V dekken als hij groeit */
    const bw = r.width / k, bh = r.height / k, bx = 800 - bw / 2, by = 450 - bh / 2;
    const img = svg.querySelector('image');
    if (img) { img.setAttribute('x', bx.toFixed(1)); img.setAttribute('y', by.toFixed(1)); img.setAttribute('width', bw.toFixed(1)); img.setAttribute('height', bh.toFixed(1)); }
    if (T) T.dekt = Math.hypot(bw, bh) / 2;
    /* de kop onder de V: de V staat op het midden, zijn onderkant 112 maten lager */
    root.style.setProperty('--p9-onder', `${(112 * k + Math.max(22, r.height * 0.035)).toFixed(1)}px`);
    laatst = '';
  }

  function stand() {
    const r = baan.getBoundingClientRect();
    const loop = r.height - podium.offsetHeight;
    return loop > 0 ? k01(-r.top / loop) : 0;
  }

  function teken(q) {
    if (!anim) return;
    const sleutel = q.toFixed(4);
    if (sleutel === laatst) return;
    laatst = sleutel;
    const t = q < 0.6 ? T.zuig0 + (T.raak - T.zuig0) * stap(q, 0.06, 0.6) : T.raak + GROEI * stap(q, 0.7, 0.95);
    anim.stand(t);
    const k = q >= 0.58 && q < 0.72;
    if (k !== kop.classList.contains('is-aan')) kop.classList.toggle('is-aan', k);
    const e = q > 0.9;
    if (e !== root.classList.contains('is-eind')) root.classList.toggle('is-eind', e);
  }

  function tik(t) {
    raf = 0;
    const dt = t0 ? Math.min(4, (t - t0) / 16.667) : 1;
    t0 = t;
    p = stand();
    ps += (p - ps) * (1 - Math.pow(1 - NAIJL, dt));
    if (Math.abs(p - ps) < 0.0004) ps = p;
    teken(ps);
    if (ps !== p) raf = requestAnimationFrame(tik); else t0 = 0;
  }
  const wek = () => { if (!raf) raf = requestAnimationFrame(tik); };
  const opScroll = () => { if (dichtbij) wek(); };

  /* het veld: traag, op zijn eigen klok, hoogstens 30 keer per seconde (het verschil zie je niet), alleen in beeld */
  function veldStap(nu) {
    veldRaf = 0;
    if (!dichtbij || weg) return;
    if (nu - veldVorig >= 33) { veldVorig = nu; veld.teken(9000 + (nu - veldT0) * 0.3); }
    veldRaf = requestAnimationFrame(veldStap);
  }

  function laad() {
    if (anim) return Promise.resolve();
    const bron = look?.dataset.foto || '';
    const nodig = innerWidth * Math.min(devicePixelRatio || 1, 2);
    const foto = `${bron}${nodig > 1560 ? '' : nodig > 1200 ? '-w1560' : '-w1200'}.webp`;
    return fetch(root.dataset.data || '', { priority: 'low' }).then((r) => r.json()).then((D) => {
      if (weg) return;
      const Z = D.zuig;
      anim = maakAnimatie(svg, D.merk, V_D, { id: 'p9', vorm: D.vorm, zuig: Z,
        T: Object.assign({}, Z.anim || {}, { SW: 1, KLIK: 'recht', VLAG: 'recht', naloop: 0, groei: [0, GROEI] }),
        kleur: { grond: 'none', letters: '#FFFFFF', naGrond: null, naV: '#FFFFFF', naBeeld: foto } });
      T = anim.T;
      root.classList.add('p9-aan');
      maat(); p = ps = stand(); teken(ps);
    }).catch(() => {});
  }

  const io = new IntersectionObserver((items) => {
    for (const it of items) {
      dichtbij = it.isIntersecting;
      if (dichtbij) { laad().then(() => { if (anim) { p = ps = stand(); teken(ps); } }); if (!veldRaf) veldRaf = requestAnimationFrame(veldStap); }
    }
  }, { rootMargin: '100% 0px' });
  io.observe(root);
  /* meteen laden, niet pas in de buurt: met de animatie wordt de baan 340svh lang (p9-aan), en dat moet gebeurd zijn
     voordat iemand voorbij de poster is, anders verspringt alles eronder (gevonden in levering 89 door
     tests/beweging-83: een sprong naar de regel onder de poster kwam 240svh te hoog uit) */
  laad();
  const ro = new ResizeObserver(() => { maat(); teken(ps); });
  ro.observe(podium);
  addEventListener('scroll', opScroll, { passive: true });
  veld.teken(9000);
  root.classList.add('p9-veld-aan');

  return () => {
    weg = true;
    cancelAnimationFrame(raf); cancelAnimationFrame(veldRaf); raf = veldRaf = 0;
    io.disconnect(); ro.disconnect();
    removeEventListener('scroll', opScroll);
    root.classList.remove('p9-aan', 'p9-veld-aan', 'is-eind');
    veld?.weg();
  };
}
