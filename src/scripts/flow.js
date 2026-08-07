// VISUAILS — FigFlow's behaviour. Two jobs, deliberately kept apart.
//
//   1 · THE SCROLL CHOREOGRAPHY. Light each stage as it arrives, and run the
//       token down the segment above it. Presentation only: if this half never
//       runs, the figure is a fully readable static diagram, because the
//       dimming that this half undoes only exists behind `.js` + a
//       no-preference motion query. See the CSS note in FigFlow.astro.
//
//   2 · THE CONTROLS. Toggles and a slider that recompute the price, the image
//       count, the delivery form and the gate's timing. This half is the point;
//       the first half is the wrapping.
//
// WHY THERE IS NO ARITHMETIC HERE. Every price string was computed at build
// time from src/data/pricing.js and shipped in the JSON block — one entry per
// possible product count. This file looks numbers up. A ladder reimplemented in
// browser JavaScript is a second source of truth that agrees with the first
// until the day someone edits one of them, and pricing.js's own header is a
// long argument against exactly that.
//
// WHY IT IS PAGE-LOCAL. Same reason /start's pipeline.js is: Layout.astro must
// not carry a figure's behaviour to all 86 pages to serve one.
//
// THE ASTRO SCOPED-CSS TRAP, FOR THE THIRD TIME IN THIS PROJECT. Astro adds its
// `data-astro-cid-*` attribute to elements in the TEMPLATE. Anything this file
// creates gets no such attribute and therefore matches no scoped rule. So this
// file creates nothing. It only ever toggles classes and writes textContent on
// nodes the component already rendered. If you find yourself reaching for
// createElement here, put the element in FigFlow.astro `hidden` instead.

const REDUCED = function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function initFlow() {
  const root = document.querySelector('[data-flow]');
  if (!root || root.dataset.flowBound === '1') return;

  const raw = root.querySelector('[data-flow-config]');
  if (!raw) return;

  let cfg;
  try {
    cfg = JSON.parse(raw.textContent || '{}');
  } catch (err) {
    // A malformed config means the controls cannot be trusted, and controls
    // that silently lie about a price are worse than controls that do nothing.
    // The figure stays exactly as the server rendered it: a true picture of
    // one real order.
    return;
  }
  if (!cfg || !cfg.rates) return;

  root.dataset.flowBound = '1';

  // ── the controls ─────────────────────────────────────────────────────────
  const range = root.querySelector('[data-flow-range]');
  const boxes = Array.prototype.slice.call(root.querySelectorAll('[data-flow-scope]'));
  const out = {
    count: root.querySelector('[data-flow-count]'),
    rate: root.querySelector('[data-flow-rate]'),
    per: root.querySelector('[data-flow-per]'),
    total: root.querySelector('[data-flow-total]'),
    next: root.querySelector('[data-flow-next]'),
    nextText: root.querySelector('[data-flow-next-text]'),
    images: root.querySelector('[data-flow-images]'),
    price: root.querySelector('[data-flow-price]'),
    empty: root.querySelector('[data-flow-empty]'),
    timing: root.querySelector('[data-flow-timing]'),
    delivery: root.querySelector('[data-flow-delivery]'),
    portal: root.querySelector('[data-flow-portal]'),
  };

  // THE KEY IS THE SWITCH STATE, not a ladder name. "110:12" is catalog on,
  // lifestyle on, video off, twelve products. The page precomputed a row for
  // every one of those keys, so there is no rule here about catalog+lifestyle
  // being the `complete` rung — that rule lives in pricing.js and nowhere else.
  //
  // It used to live here too, and that is exactly what broke: turning lifestyle
  // off swapped the headline to the catalog rate but left the previous state's
  // "and every product drops to €109" standing underneath it, because the next-
  // rung line was only cleared when it was hidden and not when it was wrong.
  // A state with no row of its own is a state that can go stale.
  function flowKey(on, count) {
    return (on.catalog ? '1' : '0') + (on.lifestyle ? '1' : '0') + (on.video ? '1' : '0') + ':' + count;
  }

  function read() {
    const on = {};
    for (let i = 0; i < boxes.length; i++) {
      on[boxes[i].getAttribute('data-flow-scope')] = boxes[i].checked;
    }
    const count = range ? Math.max(1, Math.min(cfg.maxCount, Number(range.value) || 1)) : cfg.startCount;
    return { on: on, count: count };
  }

  function setText(node, value) {
    if (node && value != null) node.textContent = value;
  }

  function show(node, visible) {
    if (node) node.hidden = !visible;
  }

  function render() {
    const state = read();
    const entry = cfg.rates[flowKey(state.on, state.count)];

    setText(out.count, String(state.count));

    // No row means nothing is switched on. The price line goes away rather than
    // going blank, and the hint takes its place — see the markup note.
    show(out.price, !!entry);
    show(out.empty, !entry);

    if (entry) {
      setText(out.rate, entry.rate);
      setText(out.per, entry.per);
      setText(out.total, entry.total);
    }
    if (out.next) {
      // The TEXT span, not the paragraph — the paragraph also holds the
      // visually-hidden label, and writing textContent on the parent would
      // delete it the first time the slider moved.
      //
      // Cleared, not just hidden. A hidden element keeps its text, and a stale
      // price sitting in the DOM is still a price some tool will read out.
      if (out.nextText) out.nextText.textContent = entry && entry.next ? entry.next : '';
      out.next.hidden = !(entry && entry.next);
    }

    // The image count. This is the one number a reader checks against their own
    // order, so it counts what is actually switched on — including the case
    // where that is nothing.
    let per = 0;
    const keys = Object.keys(cfg.imagesPer);
    for (let i = 0; i < keys.length; i++) {
      if (state.on[keys[i]]) per += cfg.imagesPer[keys[i]];
    }
    setText(out.images, String(per * state.count));

    // The tier flip. One threshold moves the timing string, the delivery
    // sentence and whether the portal exists at all — because in the real
    // system those three hang off the same number.
    const attended = state.count >= cfg.threshold;
    setText(out.timing, attended ? cfg.timing.attended : cfg.timing.unattended);
    setText(out.delivery, attended ? cfg.delivery.attended : cfg.delivery.unattended);
    show(out.portal, attended);
  }

  for (let i = 0; i < boxes.length; i++) boxes[i].addEventListener('change', render);
  if (range) {
    range.addEventListener('input', render);
    // Safari fires `change` but not always `input` for keyboard steps on some
    // versions; both are cheap and render() is idempotent.
    range.addEventListener('change', render);
  }
  render();

  // ENABLE THE CONTROLS, LAST. The server ships them `disabled` on purpose:
  // a switch that moves while the price under it does not is worse than one
  // that does not move, because the reader believes the number. Everything
  // above this line has to have succeeded — the config parsed, the listeners
  // attached, one render done — before the card starts making promises it can
  // keep. See the note by .fl-card in FigFlow.astro.
  for (let i = 0; i < boxes.length; i++) boxes[i].disabled = false;
  if (range) range.disabled = false;

  // ── the scroll choreography ──────────────────────────────────────────────
  // Everything below is optional. Under reduced motion the CSS never dims
  // anything, so lighting stages would be a no-op with a scroll listener
  // attached to it — we simply do not attach one.
  if (REDUCED()) return;

  const lit = Array.prototype.slice.call(
    root.querySelectorAll('.fl-stage, .fl-flow, .fl-out, .fl-split')
  );
  if (!lit.length || !('IntersectionObserver' in window)) {
    // No observer: light everything at once. The figure is then exactly the
    // static version, which is the correct fallback rather than a dim page.
    for (let i = 0; i < lit.length; i++) lit[i].classList.add('is-lit');
    return;
  }

  const io = new IntersectionObserver(
    function onIntersect(entries) {
      for (let i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add('is-lit');
        io.unobserve(entries[i].target);
      }
    },
    // Lower threshold and a deeper bottom margin than the page's own reveal
    // (global 0.15 / -8%): these are stacked segments in one tall figure, and a
    // stage should light as its top edge clears the fold, not once a sixth of
    // it is on screen — otherwise the token below it starts travelling before
    // the thing it is travelling towards has appeared.
    { threshold: 0.08, rootMargin: '0px 0px -18% 0px' }
  );
  for (let i = 0; i < lit.length; i++) io.observe(lit[i]);
}

export default function init() {
  initFlow();
}

init();
document.addEventListener('astro:page-load', init);
