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

// Mobile nav — document-level delegation so it works no matter when the
// header mounts or how ClientRouter persists/swaps it. Binding listeners
// directly to the (transition:persist) button was the fragile part that
// could leave the burger dead after a navigation.
let mobileNavBound = false;
function initMobileNav() {
  if (mobileNavBound) return;
  mobileNavBound = true;
  const setOpen = (open) => {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return;
    nav.classList.toggle('open', open);
    const toggle = document.querySelector('.menu-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('.menu-toggle')) { setOpen(true); return; }
    if (t.closest('.mobile-close')) { setOpen(false); return; }
    if (t.closest('.mobile-nav a')) { setOpen(false); return; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

// Services dropdown — same delegation approach (click to toggle on touch /
// keyboard; hover/focus-within still open it via CSS on desktop).
let servicesBound = false;
function initServicesMenu() {
  if (servicesBound) return;
  servicesBound = true;
  const setOpen = (li, open) => {
    if (!li) return;
    li.classList.toggle('menu-open', open);
    const trigger = li.querySelector('.nav-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const trigger = t.closest('.nav-trigger');
    if (trigger) {
      e.preventDefault();
      const li = trigger.closest('.has-menu');
      setOpen(li, li ? !li.classList.contains('menu-open') : false);
      return;
    }
    if (!t.closest('.has-menu')) setOpen(document.querySelector('.has-menu'), false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(document.querySelector('.has-menu'), false); });
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

// Multi-step form wizards — handled here via document-level delegation so
// they work reliably after ClientRouter navigations (a page-local <script>
// wasn't running when the page was reached via in-site navigation, which is
// why the test-sample form was dead on mobile). Covers the 2-step test-sample
// wizard and the 3-step order-lifestyle wizard (incl. its running total).
let wizardsBound = false;
function initWizards() {
  if (wizardsBound) return;
  wizardsBound = true;

  const scrollToForm = (form) => {
    const y = form.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };
  const show2 = (form, n) => {
    form.querySelectorAll('[data-wizard-step]').forEach((s) => {
      s.classList.toggle('hidden-step', Number(s.dataset.wizardStep) !== n);
    });
    const prog = form.querySelector('[data-wizard-progress]');
    if (prog) prog.style.width = `${(n / 2) * 100}%`;
  };
  const showN = (form, n) => {
    const panels = form.querySelectorAll('.step-panel');
    panels.forEach((p) => p.classList.toggle('hidden-step', Number(p.dataset.step) !== n));
    const bar = form.querySelector('#ls-progress-bar');
    if (bar) bar.style.width = `${(n / (panels.length || 3)) * 100}%`;
  };
  const lsTotal = (form) => {
    const label = document.querySelector('#ls-total');
    if (!label) return;
    const qty = Number(form.querySelector('#ls-qty')?.value || '1');
    const format = form.querySelector('input[name="format"]:checked')?.value;
    const quality = form.querySelector('input[name="quality"]:checked')?.value;
    const delivery = form.querySelector('input[name="delivery"]:checked')?.value;
    const total = qty * 35 + (format === 'Multi Format Export' ? 19.99 : 0) + (quality === '4K' ? 9.99 : 0) + (delivery === 'Priority' ? 29.99 : 0);
    label.textContent = `€${Number.isInteger(total) ? total : total.toFixed(2)}`;
  };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    let el;
    if ((el = t.closest('[data-wizard-next]'))) { const f = el.closest('form'); if (f) { show2(f, 2); scrollToForm(f); } return; }
    if ((el = t.closest('[data-wizard-back]'))) { const f = el.closest('form'); if (f) { show2(f, 1); scrollToForm(f); } return; }
    if ((el = t.closest('[data-step-next]'))) { const f = el.closest('form'); if (f) { showN(f, Number(el.dataset.stepNext)); scrollToForm(f); } return; }
    if ((el = t.closest('[data-step-prev]'))) { const f = el.closest('form'); if (f) { showN(f, Number(el.dataset.stepPrev)); scrollToForm(f); } return; }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#ls-form')) lsTotal(t.closest('#ls-form'));
  });
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
  initWizards();
}

// First load.
init();
// Every ClientRouter navigation (including bfcache-style restores).
document.addEventListener('astro:page-load', init);
