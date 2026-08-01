// VISUAILS — GSAP choreography for "The Studio Issue" homepage. Owns only
// what CSS/IO can't do well: the cover entrance, the pinned develop scrub,
// spread/stagger arrivals, the comet draw and the marquee's velocity lean.
// interactions.js keeps handling ordinary reveals — layers never share
// targets (data/chapter hooks only).
//
// The ticker loop and the services-ledger floating preview were removed with
// the drop rewrite that took their markup off the homepage. Both were
// null-guarded and would have failed silently forever; a guard that can never
// be false is dead weight, not safety.
//
// Lifecycle (ClientRouter): built in a gsap.context, reverted on
// astro:before-swap, rebuilt on astro:page-load. prefers-reduced-motion skips
// everything; every base state is fully designed without this file.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Mobile browsers resize the viewport when the URL bar hides; recalculating
// every trigger for that is a scroll-jank source of its own.
ScrollTrigger.config({ ignoreMobileResize: true });

// ── the ease vocabulary ─────────────────────────────────────────────────────
// Three curves, and they are the SAME three curves the stylesheet declares —
// GSAP's powerN.out is the polynomial the corresponding cubic-bezier
// approximates, so these are not "close enough", they are the pair:
//
//   EASE.quart  power3.out  ==  --ease-out-quart  cubic-bezier(0.25, 1, 0.50, 1)
//   EASE.quint  power4.out  ==  --ease-out-quint  cubic-bezier(0.22, 1, 0.36, 1)
//   EASE.expo   expo.out    ==  --ease-out-expo   cubic-bezier(0.16, 1, 0.30, 1)
//
// (GSAP numbers its power eases from quad: power1 quad, power2 cubic,
// power3 quart, power4 quint. The off-by-one is the reason this comment
// exists — power4.out is quint, not quart, and reading it as quart is how the
// two layers drift apart.)
//
// Everything that arrives uses one of these. Nothing overshoots: there is no
// back/elastic/bounce entry here on purpose, so reaching for one means
// writing the string by hand and answering for it. `'none'` is the fourth
// legal value and means something different — constant velocity, for
// mechanical motion that is scrubbed or looping rather than arriving.
const EASE = {
  quart: 'power3.out',
  quint: 'power4.out',
  expo: 'expo.out',
};

let ctx = null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// An endless drift loop that only spends frames while its band is on screen —
// a loop the user can't see must not cost scroll time. Used by the film-strip
// marquee.
function driftRow(row, dir, dur) {
  const tween = gsap.fromTo(row,
    { xPercent: dir === 1 ? -50 : 0 },
    { xPercent: dir === 1 ? 0 : -50, ease: 'none', duration: dur, repeat: -1 });
  const st = ScrollTrigger.create({
    trigger: row.parentElement || row, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => tween.paused(!self.isActive),
  });
  tween.paused(!st.isActive);
  return tween;
}

// Cover: the film still settles while the 900 headline lines rise, then the
// sub and CTAs. Transform+opacity only — animating filter: blur()
// re-rasterised the display type every frame during the heaviest moment of
// the page (hero image decode + settle).
function heroCover() {
  const hero = document.querySelector('.hero-cover');
  if (!hero) return;
  const bg = hero.querySelector('.hc2-bg img');
  if (bg) gsap.fromTo(bg, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: EASE.quart });
  const lines = hero.querySelectorAll('.cover-title .ch-l');
  if (lines.length) gsap.from(lines, { y: 56, opacity: 0, duration: 1.2, ease: EASE.quint, stagger: 0.13, delay: 0.18, clearProps: 'all' });
  gsap.from(hero.querySelectorAll('.cover-sub, .cover-cta'), {
    y: 22, opacity: 0, duration: 0.9, ease: EASE.quart, stagger: 0.1, delay: 0.6, clearProps: 'all',
  });
}

// Considered imagery: media inside [data-zoom] settles from a gentle
// over-scale as it scrolls through the viewport — the editorial "breathing
// photograph" move, scrubbed so it never fights the reader.
function zoomMedia() {
  gsap.utils.toArray('[data-zoom]').forEach((wrap) => {
    const img = wrap.querySelector('img');
    if (!img) return;
    gsap.fromTo(img, { scale: 1.08 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top 95%', end: 'bottom 30%', scrub: 0.6 },
    });
  });
}

// Chapter heads: the bold lines rise, then everything hanging off them.
// No filter tweens: blurring display type mid-scroll causes exactly the
// stutter this page was suffering from.
//
// The bloom is gone. It used to swell behind each head from a .ch-orb, and
// global.css:875 records why it was cut — but the tween outlived the markup
// and the stylesheet, guarded by `if (orb)` against an element no page has
// produced since. That is the same dead-guard this file's header says was
// swept out with the drop rewrite; it was missed. Removed rather than
// re-pointed: a guard that can never be true reads as a feature under a
// condition, and there is no condition.
function chapterHeads() {
  gsap.utils.toArray('.ch-head').forEach((head) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 80%', once: true } });
    const lines = head.querySelectorAll('.ch-l');
    if (lines.length) tl.from(lines, { y: 44, opacity: 0, duration: 1.05, ease: EASE.quint, stagger: 0.13, clearProps: 'all' }, 0.05);
    const rest = head.querySelectorAll('.ch-sub, .ch-cta, .ch-kicker, .comet');
    if (rest.length) tl.from(rest, { y: 18, opacity: 0, duration: 0.8, ease: EASE.quart, stagger: 0.08, clearProps: 'all' }, 0.4);
  });
}

// Contact-sheet spread: frames open from a crop, captions rule in after.
//
// The crop is square. It used to carry `round 14px`, which put a 14px radius
// on every frame for the 1.1s it took to open — a rounded corner is not less
// of a rounded corner for being temporary, and radius 0 is section 1 of the
// system, not a styling preference. The static state was already correct; the
// animation was the only place in the build where the radius came back.
function spread() {
  const grid = document.querySelector('[data-spread]');
  if (!grid) return;
  const items = gsap.utils.toArray(grid.querySelectorAll('.sp-media'));
  const caps = gsap.utils.toArray(grid.querySelectorAll('.sp-cap'));
  const tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: 'top 80%', once: true } });
  tl.from(items, {
    clipPath: 'inset(52% 6% 6% 6%)', scale: 1.04, opacity: 0,
    duration: 1.1, ease: EASE.quint, stagger: 0.1, clearProps: 'clipPath,scale,opacity',
  }, 0)
    .from(caps, { y: 14, opacity: 0, duration: 0.6, ease: EASE.quart, stagger: 0.08, clearProps: 'all' }, 0.45);
}

// Generic ruled-group arrivals (the set, the process, plan columns).
function staggerGroups() {
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 30, opacity: 0, duration: 0.85, ease: EASE.quart, stagger: 0.09, clearProps: 'all',
      scrollTrigger: { trigger: group, start: 'top 84%', once: true },
    });
  });
}

// The signature scene: while #develop is pinned, scroll "develops" the raw
// phone photo into the finished visual by scrubbing the Compare's --cmp-pos;
// the slider stays draggable after. Desktop only.
function developScene() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const sec = document.querySelector('#develop');
    if (!sec) return;
    const cmp = sec.querySelector('.cmp');
    const steps = gsap.utils.toArray(sec.querySelectorAll('.dev-step'));
    if (!cmp) return;

    cmp.classList.add('cmp-drag');
    gsap.set(steps, { opacity: 0.3 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: '+=130%', scrub: 0.55, pin: true, anticipatePin: 1 },
    });
    tl.fromTo(cmp, { '--cmp-pos': '94%' }, { '--cmp-pos': '10%', ease: 'none', duration: 1 }, 0);
    if (steps.length === 3) {
      tl.to(steps[0], { opacity: 1, duration: 0.06 }, 0.0)
        .to(steps[0], { opacity: 0.3, duration: 0.08 }, 0.34)
        .to(steps[1], { opacity: 1, duration: 0.06 }, 0.36)
        .to(steps[1], { opacity: 0.3, duration: 0.08 }, 0.66)
        .to(steps[2], { opacity: 1, duration: 0.06 }, 0.68);
    }
  });
}

// Film-strip marquee: counter-drift + a slight lean with scroll velocity.
function marquee() {
  const rows = gsap.utils.toArray('.vm-row');
  if (!rows.length) return;
  rows.forEach((row, i) => driftRow(row, i % 2 === 0 ? -1 : 1, 42 + i * 12));
  const proxy = { skew: 0 };
  const clamp = gsap.utils.clamp(-4, 4);
  ScrollTrigger.create({
    trigger: '.visual-marquee', start: 'top bottom', end: 'bottom top',
    onUpdate(self) {
      const skew = clamp(self.getVelocity() / -280);
      if (Math.abs(skew) > Math.abs(proxy.skew)) {
        proxy.skew = skew;
        gsap.to(proxy, {
          skew: 0, duration: 0.9, ease: EASE.quart, overwrite: true,
          onUpdate: () => rows.forEach((r) => gsap.set(r, { skewX: proxy.skew })),
        });
      }
    },
  });
}

// The comet above the test-sample chapter draws itself in.
//
// Two eases replaced here, and they were the file's only two rule breaks.
//
// The stroke ran on power2.inOut — an ease-in-out on an entrance, which the
// system bans outright: easing IN means the line starts by accelerating away
// from nothing, and the eye reads that as a thing sliding on from off-stage.
// It is `'none'` now rather than an ease-out, because a line drawing itself
// is a mechanism and not an arrival — the same reason the marquee drift and
// the develop scrub are linear. A pen moves at the speed it moves; a tip
// that decelerates over the last third reads as the stroke running out.
//
// The head ran on back.out(2), which overshoots to roughly 1.3× and settles
// back. Overshoot is the single thing the motion section names twice, and it
// is a dot the size of a full stop — the bounce was the only part of it
// anyone would ever have noticed.
function comet() {
  const path = document.querySelector('.comet path');
  if (!path || typeof path.getTotalLength !== 'function') return;
  const len = path.getTotalLength();
  const head = document.querySelector('.comet circle');
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.comet', start: 'top 85%', once: true } });
  tl.to(path, { strokeDashoffset: 0, duration: 1.6, ease: 'none' }, 0.1);
  if (head) tl.from(head, { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.5, ease: EASE.quart }, 1.45);
}

// Refresh discipline. ScrollTrigger measures every start/end once and caches
// the pixel values; anything that changes layout after that measurement leaves
// every trigger pointing at the wrong scroll position — the pinned #develop
// scene being the loudest case. Section 8: "Every ScrollTrigger needs a
// resize-refresh handler."
//
// This replaces a single `window.addEventListener('load', …, {once:true})`,
// which was wrong twice over. It was not a resize handler at all, and because
// init() re-runs on every astro:page-load, from the second (client-side)
// navigation onward the `load` event had already fired and never came again —
// so the refresh silently stopped happening while a fresh dead listener was
// added per navigation.
//
// Three sources, one debounced refresh:
//
//  1. resize — debounced 150ms. ScrollTrigger.config({ignoreMobileResize:true})
//     above stays: it exists precisely because a mobile URL bar showing or
//     hiding fires a resize with a new viewport HEIGHT and no layout change
//     worth re-measuring, and refreshing there is a scroll-jank source. So
//     this handler applies the same rule itself — on a coarse-pointer device a
//     resize that leaves innerWidth untouched is treated as URL-bar chrome and
//     ignored. Width changes always refresh; on desktop (fine pointer) a
//     height-only resize is a real window resize and refreshes too.
//  2. orientationchange — always a real re-layout.
//  3. a one-shot after webfonts swap in. document.fonts.ready beats `load`
//     here: it resolves on client-side navigation as well (an already-settled
//     font set resolves immediately), where `load` fires exactly once per full
//     document. Late-decoding images feed the same debounce via a capture-phase
//     `load` listener, since that event does not bubble.
//
// Every listener is returned as a teardown closure from the gsap.context body,
// so context.revert() in destroy() removes them on astro:before-swap. Nothing
// here outlives the page it was built for.
function bindRefresh() {
  let timer = 0;
  let alive = true;
  let lastW = window.innerWidth;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');

  const flush = () => {
    if (!alive) return;
    lastW = window.innerWidth;
    ScrollTrigger.refresh();
  };
  const schedule = (delay = 150) => {
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
  const onResize = () => {
    // Height-only resize on a touch device == the URL bar, not a re-layout.
    if (coarse.matches && window.innerWidth === lastW) return;
    schedule();
  };
  const onOrientation = () => schedule(300);
  const onMediaLoad = (e) => {
    const el = e.target;
    if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) schedule(200);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onOrientation, { passive: true });
  document.addEventListener('load', onMediaLoad, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flush);
  else schedule(300);

  return () => {
    alive = false;
    clearTimeout(timer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrientation);
    document.removeEventListener('load', onMediaLoad, true);
  };
}

function init() {
  if (reduced()) return;
  ctx = gsap.context(() => {
    heroCover();
    chapterHeads();
    spread();
    zoomMedia();
    staggerGroups();
    developScene();
    marquee();
    comet();
    // A function returned from a context body is its cleanup — run by
    // ctx.revert(), i.e. by destroy(), i.e. on astro:before-swap.
    return bindRefresh();
  });
}

function destroy() {
  if (ctx) { ctx.revert(); ctx = null; }
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

// astro:page-load also fires on the initial load — single entry point.
document.addEventListener('astro:page-load', () => { destroy(); init(); });
document.addEventListener('astro:before-swap', destroy);
