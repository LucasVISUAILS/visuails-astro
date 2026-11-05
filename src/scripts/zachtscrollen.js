/* VISUAILS — zacht scrollen met het muiswiel (levering 80, 1 november 2026; lijst 64, scrollen a).
   ═══════════════════════════════════════════════════════════════════════════════
   Lucas (s-looks): "Animatie is ook tijdens het scrollen smooth. Dus wellicht moet een soort scroll lag
   effect heel licht op de website komen die ervoor zorgt dat die smoothness er komt."

   LET OP, DE GESCHIEDENIS: op 1 september 2026 ging Lenis eruit ("Dit maakt de website af en toe wat
   sloom", Layout.astro). Lenis ving élke wielgebeurtenis af, ook die van een trackpad, en liep achter als
   de hoofdthread druk was (GSAP, ScrollTrigger). Dit is bewust kleiner:
   - alleen een muiswiel (stappen); een trackpad en een vinger scrollen gewoon, die zijn al vloeiend;
   - licht: de pagina komt elk beeld 18 % dichter bij waar het wiel hem wil (90 % in ± 0,2 s);
   - niets draait als er niet gescrold wordt; geen bibliotheek;
   - wie de schuifbalk, een toets of een link gebruikt, scrolt gewoon (het script geeft het meteen op);
   - niet in iets dat zelf scrolt (een lade, een lijst), niet met Ctrl (zoomen), niet bij minder beweging.
   Uitzetten: <html data-geen-zacht> of deze import weghalen (Layout.astro).

   De opening (HalOpening80.astro) vangt het wiel sinds levering 87 niet meer af: de laptop staat stil (sticky)
   en het scrollen zelf speelt de video af, dus ook daar scrollt dit script gewoon zacht mee. Vangt een ander
   script een wielgebeurtenis af ("defaultPrevented"), dan doet dit script niets.
   ═══════════════════════════════════════════════════════════════════════════════ */

const NAIJL = 0.18;

let doel = 0, nu = 0, raf = 0, t0 = 0, gezet = -1, laatst = 0, pad = false;

function isMuiswiel(e) {
  /* een reeks wielgebeurtenissen die minder dan 120 ms uit elkaar liggen hoort bij één gebaar: is er
     één van een trackpad bij, dan is het hele gebaar van een trackpad */
  const nieuw = e.timeStamp - laatst > 120;
  laatst = e.timeStamp;
  if (nieuw) pad = false;
  if (pad) return false;
  if (e.deltaMode === 1 || e.deltaMode === 2) return true;
  const w = e.wheelDeltaY;
  const stap = typeof w === 'number' && w !== 0 && w % 120 === 0 && Math.abs(e.deltaY) >= 50 && e.deltaX === 0;
  if (!stap) pad = true;
  return stap;
}

/* scrolt er iets tussen de muis en de pagina dat zelf nog die kant op kan? */
function binnenScroller(el, dy) {
  for (let n = el instanceof Element ? el : null; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    if (n.hasAttribute('data-geen-zacht')) return true;
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && n.scrollHeight > n.clientHeight + 1) {
      if (dy > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return true;
    }
  }
  return false;
}

function paginaVast() {
  const h = document.documentElement, b = document.body;
  if (h.hasAttribute('data-geen-zacht')) return true;
  const oh = getComputedStyle(h).overflowY, ob = b ? getComputedStyle(b).overflowY : '';
  return oh === 'hidden' || ob === 'hidden' || oh === 'clip' || ob === 'clip';
}

function stop() { cancelAnimationFrame(raf); raf = 0; t0 = 0; gezet = -1; }

function tik(t) {
  raf = 0;
  /* iemand anders scrolde (schuifbalk, toets, link, de opening): loslaten */
  if (gezet >= 0 && Math.abs(scrollY - gezet) > 2) { stop(); return; }
  const dt = t0 ? Math.min(4, (t - t0) / 16.667) : 1;
  t0 = t;
  nu += (doel - nu) * (1 - Math.pow(1 - NAIJL, dt));
  if (Math.abs(doel - nu) < 0.5) nu = doel;
  window.scrollTo({ top: nu, behavior: 'instant' });
  gezet = scrollY;
  if (nu !== doel) raf = requestAnimationFrame(tik);
  else { t0 = 0; gezet = -1; }
}

function opWiel(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  if (!isMuiswiel(e)) return;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  if (binnenScroller(e.target, e.deltaY) || paginaVast()) return;
  const max = document.documentElement.scrollHeight - innerHeight;
  if (max <= 0) return;
  e.preventDefault();
  if (!raf) { nu = doel = scrollY; }
  const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
  doel = Math.max(0, Math.min(max, doel + d));
  if (!raf) raf = requestAnimationFrame(tik);
}

if (typeof window !== 'undefined' && !window.__visZacht) {
  window.__visZacht = true;
  const minder = matchMedia('(prefers-reduced-motion: reduce)');
  const aan = () => !minder.matches;
  if (aan()) addEventListener('wheel', opWiel, { passive: false });
  minder.addEventListener?.('change', () => {
    if (aan()) addEventListener('wheel', opWiel, { passive: false });
    else { removeEventListener('wheel', opWiel); stop(); }
  });
  /* een zachte navigatie (ClientRouter): niets meenemen naar de volgende pagina */
  document.addEventListener('astro:before-swap', stop);
}
