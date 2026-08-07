// VISUAILS — FigWalk's behaviour. Three small jobs and nothing else.
//
//   1 · SWITCH SERVICE. Show one of the three bodies, hide the other two.
//   2 · SWITCH LOOK. Within the visible body, show the layers for the chosen
//       background or style.
//   3 · TRACK SCROLL. Mark the step crossing the middle of the viewport as
//       active, and show the stage layer that belongs to it.
//
// IT CREATES NOTHING. Every layer, every look, every result grid is already in
// the page — see FigWalk.astro's header for the two reasons, of which the
// sharper one is that Astro's scoped CSS hangs off `data-astro-cid-*` and a
// node built here would carry none of it. This file only ever sets `hidden`,
// toggles a class, and copies an `src` between two elements that both already
// exist. If you reach for createElement, put the element in the .astro file
// with `hidden` instead.
//
// IT IS OPTIONAL. With this file absent the component is a long static column:
// every layer visible under its steps, every radio still clickable, nothing
// misleading. The sticky positioning and the layer hiding both live behind
// `.js` in the CSS, so they only exist once the page has decided scripting is
// on. That is the same contract as global.css's `.reveal.pending`.

function initWalk() {
  const root = document.querySelector('[data-walk]');
  if (!root || root.dataset.walkBound === '1') return;
  root.dataset.walkBound = '1';

  const bodies = Array.prototype.slice.call(root.querySelectorAll('[data-walk-body]'));
  const serviceInputs = Array.prototype.slice.call(root.querySelectorAll('[data-walk-service]'));
  if (!bodies.length) return;

  // Per-body state. Kept on the element rather than in a closure variable so
  // that switching service and coming back does not reset the look the reader
  // had chosen — losing someone's choice because they glanced at another tab is
  // the kind of small rudeness that makes an interactive figure feel cheap.
  function currentLook(body) {
    const on = body.querySelector('[data-walk-look-input]:checked');
    return on ? on.value : null;
  }

  /** Show exactly the layers that belong to (step, look). */
  function paint(body, stepId, look) {
    // Which layer a step wants. `source` and `make` have one each; the look
    // step and the result step have one per look; `model` has one that borrows
    // the look's image.
    let want = 'source';
    if (stepId === 'model') want = 'model';
    else if (stepId === 'make') want = 'make';
    else if (stepId === 'result') want = 'result';
    else if (stepId !== 'source') want = 'look';

    const layers = body.querySelectorAll('[data-walk-layer]');
    for (let i = 0; i < layers.length; i++) {
      const el = layers[i];
      const isKind = el.getAttribute('data-walk-layer') === want;
      const elLook = el.getAttribute('data-walk-look');
      // A layer with no look attribute belongs to every look.
      el.hidden = !(isKind && (!elLook || elLook === look));
    }

    // The model layer shows the look beside the face, so it needs the chosen
    // look's image. Copying the src between two existing <img>s rather than
    // rendering four model layers: the face never changes, only what it stands
    // next to, and four near-identical layers would be four more images to
    // download for one that is ever seen.
    const pair = body.querySelector('[data-walk-model-look]');
    if (pair && look) {
      const src = body.querySelector('[data-walk-layer="look"][data-walk-look="' + look + '"] img');
      if (src && pair.getAttribute('src') !== src.getAttribute('src')) {
        pair.setAttribute('src', src.getAttribute('src'));
      }
    }
  }

  /**
   * Where on the screen the reader is looking.
   *
   * On the two-column layout that is simply the middle: the stage is BESIDE the
   * text, so the whole viewport height is reading space.
   *
   * On a phone the stage is stuck to the TOP and covers roughly the upper half,
   * so the middle of the viewport is behind it. Measured against the mid-point
   * there, the step that counts as active is one the reader cannot see the
   * heading of — which is exactly what the first phone build did. Below 860px
   * the focus point is therefore the middle of what is left under the stage.
   */
  function focalPoint(body) {
    if (!window.matchMedia('(max-width: 860px)').matches) return window.innerHeight / 2;
    const stage = body.querySelector('.wk-stage');
    if (!stage) return window.innerHeight / 2;
    const bottom = Math.max(0, stage.getBoundingClientRect().bottom);
    return bottom + (window.innerHeight - bottom) / 2;
  }

  /** The step currently nearest the reader's focus point, in one body. */
  function activeStep(body) {
    const steps = body.querySelectorAll('[data-walk-step]');
    const mid = focalPoint(body);
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const r = steps[i].getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDist) { bestDist = d; best = steps[i]; }
    }
    return best;
  }

  function sync(body) {
    if (!body || body.hidden) return;
    const step = activeStep(body);
    if (!step) return;
    const steps = body.querySelectorAll('[data-walk-step]');
    for (let i = 0; i < steps.length; i++) steps[i].classList.toggle('is-on', steps[i] === step);
    paint(body, step.getAttribute('data-walk-step'), currentLook(body));
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
    const body = visibleBody();
    sync(body);
    // Bring the reader back to the top of the walkthrough. Switching service
    // three steps down otherwise leaves them mid-way through a path they have
    // not started, looking at a stage that jumped. `block: 'start'` on the
    // picker rather than on the body, so the choice they just made stays in
    // view and the change is legible as a consequence of it.
    const pick = root.querySelector('.wk-pick');
    if (pick) {
      const top = pick.getBoundingClientRect().top;
      // Only scroll if the picker has already left the top of the screen —
      // yanking the page for someone who is looking straight at it is worse
      // than not scrolling at all.
      if (top < 0) pick.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  for (let i = 0; i < serviceInputs.length; i++) serviceInputs[i].addEventListener('change', onService);

  // ── look switching ───────────────────────────────────────────────────────
  const lookInputs = Array.prototype.slice.call(root.querySelectorAll('[data-walk-look-input]'));
  for (let i = 0; i < lookInputs.length; i++) {
    lookInputs[i].addEventListener('change', function onLook() {
      sync(visibleBody());
    });
  }

  // ── scroll tracking ──────────────────────────────────────────────────────
  // rAF-throttled, passive, and reading layout once per frame at most. The
  // alternative — an IntersectionObserver per step — needs a rootMargin band
  // tuned to the step height, and these steps are `62svh` tall, which is close
  // enough to the band that steps at the top and bottom of the list never fire.
  // A distance-to-centre comparison has no such edge case.
  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(function frame() {
      queued = false;
      sync(visibleBody());
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  sync(visibleBody());
}

export default function init() {
  initWalk();
}

init();
document.addEventListener('astro:page-load', init);
