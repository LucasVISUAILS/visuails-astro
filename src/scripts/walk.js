// VISUAILS — FigWalk's behaviour. Four small jobs and nothing else.
//
//   1 · SWITCH SERVICE. Show one of the three bodies, hide the other two.
//   2 · SWITCH LOOK. Within the visible body, show the layers belonging to the
//       chosen background or style.
//   3 · TRACK SCROLL. Decide which step the reader is on, and show the stage
//       layer that belongs to it.
//   4 · SLIDE. Move each step sideways in proportion to how far it is from the
//       reading line — in from the left, out to the right.
//
// WHY THE SLIDE IS SCROLL-LINKED AND NOT AN ANIMATION. Lucas: *"dat de tekst en
// de stylen van links naar rechts gaan net als lenis tijdens het scrollen."* A
// keyframe animation has its own clock and would run at its own speed no matter
// how fast you scrolled; this reads the scroll position and derives a position
// from it, so the text moves exactly as fast as the reader does. The site
// already runs Lenis (src/scripts/smooth-scroll.js), which lerps the scroll
// itself, and everything downstream of that inherits the easing for free. That
// is the whole of "net als lenis" — there is nothing to ease here, because the
// thing being followed is already eased.
//
// IT CREATES NOTHING. Every layer, every look, every result grid is already in
// the page. This file sets `hidden`, toggles one class, and writes two custom
// properties. The reason is the trap this project has hit three times: Astro's
// scoped CSS hangs off `data-astro-cid-*`, which only template elements carry,
// so a node built here would match no rule in FigWalk.astro. If you reach for
// createElement, put the element in the .astro file with `hidden` instead.
//
// IT IS OPTIONAL. Without this file the component is a long static column:
// every layer visible under its steps, every radio still clickable, nothing
// misleading. The sticky positioning, the layer hiding and the slide all live
// behind `.js` in the CSS, so they only exist once the page has decided
// scripting is on — the same contract as `.reveal.pending` in global.css.

// The travel DISTANCE is not here — it is `--wk-shift` in FigWalk.astro, and
// this file only writes the unitless -1…1 position. The first version wrote
// pixels, which meant one number for every screen width: 72px is right beside a
// 34rem column and wrong on a 390px phone, where it pushed the whole paragraph
// off the right edge. A media query can answer that; a constant cannot.

/** How faint a step gets at the edge of its band. Never zero: a step that
 *  vanishes entirely reads as content that failed to load, and someone
 *  skim-scrolling should still see that there is more below. */
const MIN_OPACITY = 0.22;

/** De scroll/resize-luisteraar van de vorige initWalk(), zodat hij eraf kan. */
let vensterGebonden = null;

function initWalk() {
  const root = document.querySelector('[data-walk]');
  if (!root || root.dataset.walkBound === '1') return;
  root.dataset.walkBound = '1';

  const bodies = Array.prototype.slice.call(root.querySelectorAll('[data-walk-body]'));
  const serviceInputs = Array.prototype.slice.call(root.querySelectorAll('[data-walk-service]'));
  if (!bodies.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Read from the DOM rather than held in a variable, so switching service and
  // coming back does not reset the look the reader had chosen.
  function currentLook(body) {
    const on = body.querySelector('[data-walk-look-input]:checked');
    return on ? on.value : null;
  }

  /** Show exactly the layers belonging to (step, look). */
  function paint(body, stepId, look) {
    /* De id van de look-stap is die van de dienst zelf — 'background', 'style'
       of 'videoStyle' — dus alles wat niet een van de vaste namen is, is de
       look-stap.
     *
     * DE LIJST TELDE ER ACHT EN TELT ER SINDS 30 AUGUSTUS 2026 VIJF. `order`,
     * `make` en `portal` zijn met hun stappen samengevoegd; hun lagen bestaan
     * niet meer. Ze hier laten staan zou geen fout geven, en dat is precies het
     * bezwaar: een naam in deze lijst die nergens meer bij hoort, leest als een
     * laag die er nog is. */
    let want = stepId;
    if (stepId !== 'upload' && stepId !== 'window' && stepId !== 'pay'
      && stepId !== 'model' && stepId !== 'result') want = 'look';

    const layers = body.querySelectorAll('[data-walk-layer]');
    for (let i = 0; i < layers.length; i++) {
      const el = layers[i];
      const isKind = el.getAttribute('data-walk-layer') === want;
      const elLook = el.getAttribute('data-walk-look');
      // A layer with no look attribute belongs to every look.
      el.hidden = !(isKind && (!elLook || elLook === look));
    }

    // The model layer stands the chosen look next to the face, so it borrows
    // that look's image. Copying an src between two existing <img>s rather than
    // rendering one model layer per look: the face never changes, and four
    // near-identical layers would be four more images downloaded for one that
    // is ever seen.
    const pair = body.querySelector('[data-walk-model-look]');
    if (pair && look) {
      const src = body.querySelector('[data-walk-layer="look"][data-walk-look="' + look + '"] img');
      if (src && pair.getAttribute('src') !== src.getAttribute('src')) {
        pair.setAttribute('src', src.getAttribute('src'));
      }
    }
  }

  /**
   * THE READING LINE — where on the screen the reader's attention is.
   *
   * Not the middle of the viewport, because the stage is stuck to the top and
   * covers a good part of it. Measured against the middle, the "active" step
   * would be one whose heading is behind the picture. The line is therefore the
   * middle of whatever is left underneath the stage.
   *
   * Falls back to the viewport middle if the stage is not there or has scrolled
   * past, which is the correct answer in both of those cases.
   */
  function readingLine(body) {
    const stage = body.querySelector('.wk-stage');
    if (!stage) return window.innerHeight / 2;
    const bottom = stage.getBoundingClientRect().bottom;
    if (bottom <= 0 || bottom >= window.innerHeight) return window.innerHeight / 2;
    return bottom + (window.innerHeight - bottom) / 2;
  }

  /**
   * One pass over the visible body: place every step, and light the one at the
   * reading line.
   *
   * Reads all the rectangles first and writes afterwards. Interleaving the two
   * would make every write invalidate the next read — the classic layout
   * thrash, and with nine steps it is nine forced reflows a frame.
   */
  function sync(body) {
    if (!body || body.hidden) return;
    const steps = body.querySelectorAll('[data-walk-step]');
    if (!steps.length) return;

    const line = readingLine(body);
    /* De band waarover een stap zijn volledige afstand aflegt.
     *
     * HIER STOND `window.innerHeight * 0.66`, EN DAT WAS EEN TWEEDE KOPIE VAN
     * EEN GETAL DAT IN DE CSS STAAT. Die 0.66 was de staphoogte: `.wk-step`
     * had `min-height: 66svh`. Op 30 augustus 2026 werd dat 48svh om
     * /how-it-works in te korten, en daarmee liepen de twee uit de pas: een
     * band die anderhalf keer zo hoog is als een stap heeft er altijd twee
     * tegelijk halverwege hun verschuiving, en dat leest als drift in plaats
     * van als tempo.
     *
     * Nu wordt de hoogte gemeten in plaats van herhaald. Verandert de CSS, dan
     * volgt de beweging vanzelf. De ondergrens is er voor het geval een stap
     * nog geen hoogte heeft — dan is delen door nul de fout die je krijgt. */
    const band = Math.max(steps[0].getBoundingClientRect().height, 120);

    const dist = [];
    let best = 0;
    let bestAbs = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const r = steps[i].getBoundingClientRect();
      // Signed distance from the reading line to the step's centre, normalised
      // and clamped. POSITIVE means the step is still below the line — not yet
      // read — and it belongs to the LEFT. Negative means it is above, already
      // read, and it belongs to the right.
      let d = (r.top + r.height / 2 - line) / band;
      if (d > 1) d = 1;
      if (d < -1) d = -1;
      dist.push(d);
      const abs = d < 0 ? -d : d;
      /* GELIJKSPEL BESTAAT HIER, EN HET WERD VERKEERD BESLIST — 30 aug 2026.
         `d` is geklemd op [-1, 1]. Sta je bóven de doorloop, dan is elke stap
         nog niet gelezen en heeft elke stap d = 1; sta je eronder, dan is elke
         stap gelezen en heeft elke stap d = -1. In beide gevallen is `abs`
         voor alle stappen gelijk, en `<` hield dan altijd de eerste vast.
         Boven de doorloop klopt dat — de eerste stap is de volgende die je
         leest. ERONDER niet: dan sprong het kader terug naar de eerste laag op
         het moment dat je net de laatste had gelezen. Gemeten door in stapjes
         van 60px langs de hele sectie te scrollen: stap 0, dan 1 t/m 5, en dan
         480px lang weer stap 0.
         Bij gelijkspel wint daarom de latere stap zodra `d` negatief is: alles
         boven de leeslijn is al gelezen, en de laatste daarvan is waar je bent. */
      if (abs < bestAbs || (abs === bestAbs && d < 0)) { bestAbs = abs; best = i; }
    }

    for (let i = 0; i < steps.length; i++) {
      steps[i].classList.toggle('is-on', i === best);
      const inner = steps[i].firstElementChild;
      if (!inner || reduced.matches) continue;
      const d = dist[i];
      const abs = d < 0 ? -d : d;
      // -d, so a step below the line (d > 0) sits to the left.
      inner.style.setProperty('--wk-t', (-d).toFixed(3));
      inner.style.setProperty('--wk-o', (1 - abs * (1 - MIN_OPACITY)).toFixed(3));
    }

    paint(body, steps[best].getAttribute('data-walk-step'), currentLook(body));
  }

  function visibleBody() {
    for (let i = 0; i < bodies.length; i++) if (!bodies[i].hidden) return bodies[i];
    return bodies[0];
  }

  // ── service switching ────────────────────────────────────────────────────
  function onService() {
    const on = root.querySelector('[data-walk-service]:checked');
    const id = on ? on.value : bodies[0].getAttribute('data-walk-body');
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].hidden = bodies[i].getAttribute('data-walk-body') !== id;
    }
    sync(visibleBody());
    // Take the reader back to the top of the walkthrough. Switching service
    // four steps down otherwise leaves them halfway through a path they have
    // not started. Scrolls to the PICKER rather than the body, so the choice
    // they just made stays on screen and the change reads as a consequence of
    // it — and only when the picker has already left the top, because yanking
    // the page for someone looking straight at it is worse than not scrolling.
    const pick = root.querySelector('.wk-pick');
    if (pick && pick.getBoundingClientRect().top < 0) {
      pick.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  }
  for (let i = 0; i < serviceInputs.length; i++) serviceInputs[i].addEventListener('change', onService);

  // ── look switching ───────────────────────────────────────────────────────
  const lookInputs = Array.prototype.slice.call(root.querySelectorAll('[data-walk-look-input]'));
  for (let i = 0; i < lookInputs.length; i++) {
    lookInputs[i].addEventListener('change', function onLook() { sync(visibleBody()); });
  }

  // ── scroll tracking ──────────────────────────────────────────────────────
  // rAF-throttled and passive. An IntersectionObserver would do the lighting
  // but not the slide: the slide needs a continuous position, not a threshold
  // crossing, and an observer that fired often enough to drive it would be a
  // scroll handler with extra steps.
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function frame() {
      queued = false;
      sync(visibleBody());
    });
  }
  /* Dezelfde reparatie als in consent.js: `onScroll` hangt aan de stappen van
     DEZE pagina, en `root.dataset.walkBound` staat op een element dat bij elke
     zachte navigatie vervangen wordt — dus houdt die vlag niets tegen zodra de
     lezer de pagina met de doorloop een tweede keer bezoekt. De vorige twee gaan
     er nu eerst af. (Gevonden op /demo, dat sinds 24 augustus 2026 niet meer
     bestaat; /how-it-works plaatst dezelfde doorloop en heeft hetzelfde nodig.) */
  if (vensterGebonden) {
    window.removeEventListener('scroll', vensterGebonden);
    window.removeEventListener('resize', vensterGebonden);
  }
  vensterGebonden = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // If the reader turns reduced motion on mid-visit, drop the offsets rather
  // than leaving nine steps frozen wherever they happened to be.
  if (reduced.addEventListener) {
    reduced.addEventListener('change', function onPref() {
      if (!reduced.matches) return;
      const inners = root.querySelectorAll('.wk-step-in');
      for (let i = 0; i < inners.length; i++) {
        inners[i].style.removeProperty('--wk-t');
        inners[i].style.removeProperty('--wk-o');
      }
    });
  }

  sync(visibleBody());
}

export default function init() {
  initWalk();
}

init();
document.addEventListener('astro:page-load', init);
