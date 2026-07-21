// VISUAILS — vanilla-JS motion + chrome behaviour, shared across every page.
// init() runs once on first load and again on every `astro:page-load` (fired
// after each ClientRouter navigation). Anything that attaches a window/document
// listener is guarded by a module-level boolean so it binds exactly once for
// the whole SPA session — otherwise listeners would stack up on every
// navigation. Per-element work (reveal/split) is guarded by a dataset flag so
// only new, unbound elements get processed after a page swap.

function initReveal() {
  const items = document.querySelectorAll('.reveal.pending:not([data-reveal-bound])');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach((el) => {
    el.dataset.revealBound = '1';
    if (reduce) { el.classList.add('in'); return; }
    const group = el.closest('.reveal-group');
    if (group) {
      const idx = Array.prototype.indexOf.call(group.children, el);
      el.style.setProperty('--stagger-i', String(idx));
    }
  });
  if (!reduce && items.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  // Mask / clip reveal variants (photo moments, style-page media bands).
  document.querySelectorAll('.reveal-mask:not([data-reveal-bound]), .reveal-clip-wrap > .reveal-clip-inner:not([data-reveal-bound])').forEach((el) => {
    el.dataset.revealBound = '1';
    if (reduce) { el.classList.add('in'); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    obs.observe(el);
  });
}

function initSplitLines() {
  const heads = document.querySelectorAll('[data-split-lines]:not([data-split-bound])');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heads.forEach((h) => {
    h.dataset.splitBound = '1';
    const lines = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = lines
      .map((line, i) => `<span class="split-line"><span class="split-word" style="transition-delay:${i * 90}ms">${line}</span></span>`)
      .join('');
    if (reduce) { h.querySelectorAll('.split-line').forEach((l) => l.classList.add('in')); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.split-line').forEach((l) => l.classList.add('in'));
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(h);
  });
}

let parallaxBound = false, parallaxTicking = false;
function runParallaxUpdate() {
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const strength = parseFloat(el.dataset.parallax) || 0.2;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = (vh - r.top) / (vh + r.height);
    const clamped = Math.max(0, Math.min(1, progress));
    el.style.transform = `translateY(${(clamped - 0.5) * 100 * strength}px)`;
  });
  parallaxTicking = false;
}
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!parallaxBound) {
    parallaxBound = true;
    window.addEventListener('scroll', () => {
      if (!parallaxTicking) { requestAnimationFrame(runParallaxUpdate); parallaxTicking = true; }
    }, { passive: true });
  }
  runParallaxUpdate();
}

let heroBgBound = false;
function initHeroParallax() {
  if (heroBgBound) return;
  heroBgBound = true;
  window.addEventListener('scroll', () => {
    const bg = document.querySelector('.hero-editorial .bg');
    if (!bg) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const y = Math.min(window.scrollY, window.innerHeight);
    bg.style.transform = `translateY(${y * 0.18}px)`;
  }, { passive: true });
}

let headerBound = false;
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  if (!headerBound) { headerBound = true; window.addEventListener('scroll', onScroll, { passive: true }); }
}

let mobileNavBound = false;
function initMobileNav() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.mobile-nav');
  const close = document.querySelector('.mobile-close');
  if (!toggle || !nav || mobileNavBound) return;
  mobileNavBound = true;
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  toggle.addEventListener('click', () => setOpen(true));
  close?.addEventListener('click', () => setOpen(false));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

let servicesBound = false;
function initServicesMenu() {
  const li = document.querySelector('.has-menu');
  const trigger = li && li.querySelector('.nav-trigger');
  if (!li || !trigger || servicesBound) return;
  servicesBound = true;
  const setOpen = (open) => {
    li.classList.toggle('menu-open', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  trigger.addEventListener('click', (e) => { e.preventDefault(); setOpen(!li.classList.contains('menu-open')); });
  document.addEventListener('click', (e) => { if (!li.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

let convbarDismissed = false;
let convbarBound = false;
function initConvbar() {
  const bar = document.querySelector('.convbar');
  const closeBtn = document.querySelector('.cb-close');
  if (!bar || convbarBound) return;
  convbarBound = true;
  // Don't nag on the pages that already ARE the conversion action. Evaluated
  // live in the handler because the bar persists across ClientRouter swaps.
  const suppressed = () => {
    const p = location.pathname;
    return p.startsWith('/test-sample') || p.startsWith('/order') || p.startsWith('/thank-you');
  };
  const sync = () => {
    if (convbarDismissed || suppressed()) { bar.classList.remove('show'); return; }
    bar.classList.toggle('show', window.scrollY > 640);
  };
  window.addEventListener('scroll', sync, { passive: true });
  document.addEventListener('astro:page-load', sync);
  closeBtn?.addEventListener('click', () => { convbarDismissed = true; bar.classList.remove('show'); });
}

export function init() {
  initReveal();
  initSplitLines();
  // Magnetic button-follow intentionally removed — CTAs stay put under the cursor.
  initParallax();
  initHeroParallax();
  initHeaderScroll();
  initMobileNav();
  initServicesMenu();
  initConvbar();
}

// First load.
init();
// Every ClientRouter navigation (including bfcache-style restores).
document.addEventListener('astro:page-load', init);
