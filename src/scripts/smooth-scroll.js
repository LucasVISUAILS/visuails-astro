// VISUAILS — inertial scrolling (Lenis), August 2026.
//
// WHY A LIBRARY AT ALL, when `scroll-behavior: smooth` is one CSS line.
//
// They are not the same feature. `scroll-behavior: smooth` only affects
// PROGRAMMATIC jumps — an anchor click, a scrollIntoView. It does nothing to
// the wheel, which is the input that carries almost every scroll on this site.
// A wheel notch is a discrete step: the page teleports ~100px, stops dead,
// teleports again. That is what makes a long editorial page feel like a
// slideshow of stills rather than one continuous surface, and it is the thing
// the scroll-reveal work in global.css is fighting against — a clip-path that
// develops over a viewport height reads as a series of frames when the scroll
// under it is a series of frames.
//
// Lenis intercepts the wheel and drives window.scrollTo() itself, easing the
// real scroll position toward the target instead of snapping to it. The word
// "real" is load-bearing: some smooth-scroll libraries fake it by translating
// a wrapper element, which breaks position: sticky, breaks the browser's own
// scrollbar, and — decisively here — breaks `animation-timeline: view()`,
// because there is no scrolling to observe any more. Lenis moves the document's
// actual scrollTop, so the sticky header, the scrollbar, deep links, and every
// scroll-driven animation keep working exactly as they did. That property is
// the entire reason this dependency is acceptable and not a rewrite.
//
// ~3 kB gzipped, no dependencies, MIT.
//
// WHERE IT IS DELIBERATELY OFF
//
//   · prefers-reduced-motion: reduce — the whole point of that setting is that
//     the viewport should not keep moving after the input stops. Lenis is never
//     constructed; the page scrolls natively. Checked once at init rather than
//     watched live, because a mid-session change is not worth a live teardown.
//
//   · Touch. syncTouch stays off (the default). A finger drag already has
//     momentum, supplied by the OS compositor on a thread that cannot jank;
//     re-implementing it in JS is how smooth-scroll libraries earn their
//     reputation on phones. Wheel and trackpad get Lenis, touch gets iOS/Android.
//
//   · Anything marked [data-lenis-prevent] — the mobile drawer. Lenis calls
//     preventDefault on the wheel, so a nested scroller inside an overlay would
//     scroll the page behind it instead of itself unless it is exempted.
//
// LIFECYCLE, and the ClientRouter trap.
//
// One instance for the whole SPA session, built on first load and never rebuilt
// — a per-navigation instance would leave the old one's rAF loop and listeners
// running. But astro:after-swap replaces <html>'s attributes with the incoming
// document's, which silently strips the `lenis lenis-smooth` classes Lenis put
// there, and with them the CSS that makes it work. And Lenis caches the scroll
// position it thinks it is at, which after a swap is the PREVIOUS page's — the
// first wheel notch would then animate from a stale offset and appear to jump.
// Both are re-established in onPageLoad() below. Neither is optional.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis = null;

/** Attributes on <html> that Lenis owns; astro:after-swap removes them. */
function restoreRootClasses() {
  const root = document.documentElement;
  root.classList.add('lenis', 'lenis-smooth');
}

function onPageLoad() {
  if (!lenis) return;
  restoreRootClasses();
  // The new page is a different height, and we are at a different offset than
  // Lenis last recorded. resize() re-measures; the immediate scrollTo makes the
  // instance agree with where the browser actually is, so the next wheel notch
  // eases from here rather than from wherever the previous page left off.
  lenis.resize();
  lenis.scrollTo(window.scrollY, { immediate: true, force: true });
}

export function initSmoothScroll() {
  if (lenis) { onPageLoad(); return lenis; }
  if (typeof window === 'undefined') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  lenis = new Lenis({
    // lerp, not duration: duration is for scrollTo(), lerp is what governs the
    // wheel. 0.085 is a touch slower than the 0.1 default — enough glide that a
    // notch reads as a movement rather than a jump, short of the syrupy feel
    // that makes people complain the site is fighting them. One frame's catch-up
    // is ~8.5% of the remaining distance, so it settles in about a third of a
    // second and never feels like it is still going when you have stopped.
    lerp: 0.085,
    wheelMultiplier: 1,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    // Native momentum on touch. See the note above.
    syncTouch: false,
    // Lenis runs its own requestAnimationFrame loop. There is no GSAP ticker on
    // this site to sync with any more (motion.js is gone — see Layout.astro), so
    // an external loop would be ceremony around the same rAF.
    autoRaf: true,
  });

  restoreRootClasses();

  // The drawer is fixed, full-viewport and scrolls its own content. Without
  // this, a wheel over an open drawer scrolls the page underneath it.
  document.querySelectorAll('.mobile-nav').forEach((el) => el.setAttribute('data-lenis-prevent', ''));

  addEventListener('astro:page-load', () => {
    document.querySelectorAll('.mobile-nav:not([data-lenis-prevent])')
      .forEach((el) => el.setAttribute('data-lenis-prevent', ''));
    onPageLoad();
  });

  return lenis;
}

initSmoothScroll();
