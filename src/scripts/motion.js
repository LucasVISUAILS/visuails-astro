// VISUAILS — GSAP scroll choreography for the chapter system. This module
// owns only what CSS/IO can't do well: the cinema-hero entrance, chapter-head
// blooms, the pinned "develop" scrub, card/tile staggers, the comet draw and
// the marquee's velocity lean. interactions.js keeps handling ordinary
// reveals — the two layers never share targets (this binds to chapter/data
// hooks only).
//
// Lifecycle (ClientRouter): built inside a gsap.context, reverted on
// astro:before-swap, rebuilt on astro:page-load. prefers-reduced-motion skips
// everything; base states are fully designed without this file.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx = null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cinema hero: slow settle on the film still, then the serif line rises out
// of a blur, sub/benefits follow, the glass services bar docks last.
function heroCinema() {
  const hero = document.querySelector('.hero-cinema');
  if (!hero) return;
  const bg = hero.querySelector('.hc-bg img');
  if (bg) gsap.fromTo(bg, { scale: 1.14 }, { scale: 1, duration: 2.6, ease: 'power2.out' });
  const lines = hero.querySelectorAll('.hc-copy h1 .ch-l');
  if (lines.length) {
    gsap.from(lines, { y: 54, opacity: 0, filter: 'blur(12px)', duration: 1.25, ease: 'power4.out', stagger: 0.14, delay: 0.1, clearProps: 'filter' });
  }
  gsap.from(hero.querySelectorAll('.hc-sub, .hc-copy .ch-cta, .hc-benefits'), {
    y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.55, clearProps: 'all',
  });
  const bar = hero.querySelector('.hero-svcbar');
  if (bar) gsap.from(bar, { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.95, clearProps: 'all' });
}

// Chapter heads: bloom swells behind while the serif lines rise from a blur,
// bright line first, dimmed line trailing — the "metallic fade" in motion.
function chapterHeads() {
  gsap.utils.toArray('.ch-head').forEach((head) => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: head, start: 'top 80%', once: true },
    });
    const orb = head.querySelector('.ch-orb');
    if (orb) tl.from(orb, { scale: 0.55, opacity: 0, duration: 1.4, ease: 'power2.out' }, 0);
    const lines = head.querySelectorAll('.ch-l');
    if (lines.length) tl.from(lines, { y: 44, opacity: 0, filter: 'blur(10px)', duration: 1.1, ease: 'power4.out', stagger: 0.13, clearProps: 'filter' }, 0.05);
    const rest = head.querySelectorAll('.ch-sub, .ch-cta, .ch-kicker, .comet');
    if (rest.length) tl.from(rest, { y: 18, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08, clearProps: 'all' }, 0.4);
  });
}

// Glass service cards + gallery tiles: staggered arrivals. Tiles open from a
// clipped crop with their italic serif label sliding in after.
function cardsAndTiles() {
  const cards = gsap.utils.toArray('[data-cards] .svc-card');
  if (cards.length) {
    gsap.from(cards, {
      y: 38, opacity: 0, duration: 0.95, ease: 'power3.out', stagger: 0.09, clearProps: 'all',
      scrollTrigger: { trigger: '[data-cards]', start: 'top 82%', once: true },
    });
  }
  const tiles = gsap.utils.toArray('[data-tiles] .gtile');
  if (tiles.length) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-tiles]', start: 'top 80%', once: true } });
    tl.from(tiles, {
      clipPath: 'inset(58% 8% 8% 8% round 18px)', scale: 1.04, opacity: 0,
      duration: 1.15, ease: 'power4.out', stagger: 0.1, clearProps: 'clipPath,scale,opacity',
    }, 0)
      .from(gsap.utils.toArray('[data-tiles] .gt-label'), {
        x: -26, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, clearProps: 'all',
      }, 0.45);
  }
}

// The signature scene: while #develop is pinned, scroll "develops" the raw
// phone photo into the finished visual by scrubbing the SAME CSS variable
// (--cmp-pos) the Compare component uses — the slider stays draggable after.
// Desktop only; mobile / no-JS keeps the auto-drifting comparison.
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
      scrollTrigger: {
        trigger: sec, start: 'top top', end: '+=130%',
        scrub: 0.55, pin: true, anticipatePin: 1,
      },
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

// Film-strip marquee: infinite counter-drift + a slight lean with scroll
// velocity, like film reacting to the pull.
function marquee() {
  const rows = gsap.utils.toArray('.vm-row');
  if (!rows.length) return;
  rows.forEach((row, i) => {
    const dir = i % 2 === 0 ? -1 : 1;
    gsap.fromTo(row,
      { xPercent: dir === 1 ? -50 : 0 },
      { xPercent: dir === 1 ? 0 : -50, ease: 'none', duration: 42 + i * 12, repeat: -1 });
  });
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

// The comet above the test-sample chapter: stroke draws itself in as the
// chapter enters, the head sparking at the end of the arc.
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
    heroCinema();
    chapterHeads();
    cardsAndTiles();
    developScene();
    marquee();
    comet();
  });
  // Late-loading images shift pin math — refresh once everything settles.
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

function destroy() {
  if (ctx) { ctx.revert(); ctx = null; }
  ScrollTrigger.getAll().forEach((t) => t.kill());
}

// astro:page-load also fires on the initial load, so it is the single entry
// point — no bare init() here (it would double-run the hero entrance).
document.addEventListener('astro:page-load', () => { destroy(); init(); });
document.addEventListener('astro:before-swap', destroy);
