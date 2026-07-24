// VISUAILS — GSAP scroll choreography. This module owns ONLY what vanilla
// CSS/IO can't do well: the pinned "develop" scrub, the hero entrance/tilt
// and the marquee's scroll-velocity response. The existing reveal system in
// interactions.js keeps handling ordinary in-view reveals — the two layers
// never target the same elements (this one binds via data-* hooks only).
//
// Lifecycle (ClientRouter): everything is created inside a gsap.context and
// reverted on astro:before-swap, then rebuilt on astro:page-load — no stacked
// ScrollTriggers, no stale pins. prefers-reduced-motion skips all of it; the
// page is fully designed without this file (base state is visible/static).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let ctx = null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function heroEntrance() {
  const cards = gsap.utils.toArray('[data-hero-card] .hero-card');
  if (!cards.length) return;
  gsap.from(cards, {
    y: 64, opacity: 0, rotate: (i) => (i === 0 ? 2.5 : -4),
    duration: 1.2, ease: 'power4.out', stagger: 0.14, delay: 0.15, clearProps: 'opacity',
  });
  gsap.from('.hero-studio .hero-benefits li', {
    y: 14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay: 0.55, clearProps: 'all',
  });
}

function heroTilt() {
  const wrap = document.querySelector('[data-hero-card]');
  if (!wrap || window.matchMedia('(pointer: coarse)').matches) return;
  const cards = wrap.querySelectorAll('.hero-card');
  const setters = Array.from(cards).map((c) => ({
    rx: gsap.quickTo(c, 'rotationX', { duration: 0.9, ease: 'power3.out' }),
    ry: gsap.quickTo(c, 'rotationY', { duration: 0.9, ease: 'power3.out' }),
  }));
  gsap.set(cards, { transformPerspective: 900 });
  const hero = document.querySelector('.hero-studio');
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setters.forEach((s, i) => {
      const k = i === 0 ? 1 : 1.5;                  // back card moves a touch more
      s.ry(nx * 4 * k); s.rx(-ny * 3 * k);
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => setters.forEach((s) => { s.rx(0); s.ry(0); }), { passive: true });
}

// The signature scene: while #develop is pinned, scroll "develops" the raw
// phone photo into the finished visual by scrubbing the SAME CSS variable
// (--cmp-pos) the Compare component already uses — so after the story plays,
// the slider is still fully draggable. Desktop only; on mobile/reduced the
// section behaves exactly as before (auto-drift + drag).
function developScene() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const sec = document.querySelector('#develop');
    if (!sec) return;
    const cmp = sec.querySelector('.cmp');
    const steps = gsap.utils.toArray(sec.querySelectorAll('.dev-step'));
    if (!cmp) return;

    cmp.classList.add('cmp-drag');                  // stop the auto-drift; scroll owns it now
    gsap.set(steps, { opacity: 0.3 });              // dimmed base — GSAP owns it, so no-JS stays fully visible
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

// Dual-row visual marquee. GSAP drives the loop (xPercent -50 over duplicated
// content) and scroll velocity leans the rows slightly — the film strip reacts
// to how fast you move through it.
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

function init() {
  if (reduced()) return;
  ctx = gsap.context(() => {
    heroEntrance();
    heroTilt();
    developScene();
    marquee();
  });
  // Late-loading images shift pin math — refresh once everything has settled.
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
