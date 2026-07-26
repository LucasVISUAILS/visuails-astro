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
  if (bg) gsap.fromTo(bg, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
  const lines = hero.querySelectorAll('.cover-title .ch-l');
  if (lines.length) gsap.from(lines, { y: 56, opacity: 0, duration: 1.2, ease: 'power4.out', stagger: 0.13, delay: 0.18, clearProps: 'all' });
  gsap.from(hero.querySelectorAll('.cover-sub, .cover-cta'), {
    y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.6, clearProps: 'all',
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

// Chapter heads: bloom swells while the bold lines rise — bright line first,
// dimmed line trailing. No filter tweens: blurring display type mid-scroll
// causes exactly the stutter this page was suffering from.
function chapterHeads() {
  gsap.utils.toArray('.ch-head').forEach((head) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 80%', once: true } });
    const orb = head.querySelector('.ch-orb');
    if (orb) tl.from(orb, { scale: 0.55, opacity: 0, duration: 1.4, ease: 'power2.out' }, 0);
    const lines = head.querySelectorAll('.ch-l');
    if (lines.length) tl.from(lines, { y: 44, opacity: 0, duration: 1.05, ease: 'power4.out', stagger: 0.13, clearProps: 'all' }, 0.05);
    const rest = head.querySelectorAll('.ch-sub, .ch-cta, .ch-kicker, .comet');
    if (rest.length) tl.from(rest, { y: 18, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'all' }, 0.4);
  });
}

// Contact-sheet spread: frames open from a crop, captions rule in after.
function spread() {
  const grid = document.querySelector('[data-spread]');
  if (!grid) return;
  const items = gsap.utils.toArray(grid.querySelectorAll('.sp-media'));
  const caps = gsap.utils.toArray(grid.querySelectorAll('.sp-cap'));
  const tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: 'top 80%', once: true } });
  tl.from(items, {
    clipPath: 'inset(52% 6% 6% 6% round 14px)', scale: 1.04, opacity: 0,
    duration: 1.1, ease: 'power4.out', stagger: 0.1, clearProps: 'clipPath,scale,opacity',
  }, 0)
    .from(caps, { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, clearProps: 'all' }, 0.45);
}

// Generic ruled-group arrivals (the set, the process, plan columns).
function staggerGroups() {
  gsap.utils.toArray('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      y: 30, opacity: 0, duration: 0.85, ease: 'power3.out', stagger: 0.09, clearProps: 'all',
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
          skew: 0, duration: 0.9, ease: 'power3.out', overwrite: true,
          onUpdate: () => rows.forEach((r) => gsap.set(r, { skewX: proxy.skew })),
        });
      }
    },
  });
}

// The comet above the test-sample chapter draws itself in.
function comet() {
  const path = document.querySelector('.comet path');
  if (!path || typeof path.getTotalLength !== 'function') return;
  const len = path.getTotalLength();
  const head = document.querySelector('.comet circle');
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.comet', start: 'top 85%', once: true } });
  tl.to(path, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0.1);
  if (head) tl.from(head, { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.5, ease: 'back.out(2)' }, 1.45);
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
  });
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

function destroy() {
  if (ctx) { ctx.revert(); ctx = null; }
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

// astro:page-load also fires on the initial load — single entry point.
document.addEventListener('astro:page-load', () => { destroy(); init(); });
document.addEventListener('astro:before-swap', destroy);
