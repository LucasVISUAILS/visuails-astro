// VISUAILS — vanilla-JS motion system, shared across every page.
// Ports the SvelteKit v2 site's Svelte actions (reveal, magnetic, compare,
// splitText) to plain DOM code so Astro ships them as static <script>
// content with zero framework runtime. init() re-runs on `astro:page-load`
// (fired after every ClientRouter navigation, including the very first
// load) so nothing goes stale after a view transition swaps the DOM.

function initReveal() {
  const items = document.querySelectorAll('.reveal.pending:not([data-reveal-bound])');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  items.forEach((el, i) => {
    el.dataset.revealBound = '1';
    if (reduce) { el.classList.add('in'); return; }
    const group = el.closest('.reveal-group');
    if (group) {
      const idx = Array.prototype.indexOf.call(group.children, el);
      el.style.setProperty('--stagger-i', String(idx));
    }
  });
  if (reduce || !items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));

  // Same pattern for the mask / clip reveal variants used on photo moments
  // and before/after frames.
  document.querySelectorAll('.reveal-mask:not([data-reveal-bound]), .reveal-clip-wrap > .reveal-clip-inner:not([data-reveal-bound])').forEach((el) => {
    el.dataset.revealBound = '1';
    const target = el.classList.contains('reveal-clip-inner') ? el : el;
    if (reduce) { target.classList.add('in'); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    obs.observe(target);
  });
}

function initSplitLines() {
  // Wraps each line of a [data-split-lines] heading in .split-line > .split-word
  // spans, then reveals them staggered once in view. Idempotent: skips
  // headings already processed.
  const heads = document.querySelectorAll('[data-split-lines]:not([data-split-bound])');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  heads.forEach((h) => {
    h.dataset.splitBound = '1';
    const html = h.innerHTML;
    const lines = html.split(/<br\s*\/?>/i);
    h.innerHTML = lines
      .map((line, i) => `<span class="split-line"><span class="split-word" style="transition-delay:${i * 90}ms">${line}</span></span>`)
      .join('');
    if (reduce) {
      h.querySelectorAll('.split-line').forEach((l) => l.classList.add('in'));
      return;
    }
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

let magneticBound = false;
function initMagnetic() {
  const wraps = document.querySelectorAll('.magnet-wrap');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;
  if (reduce || !hover || !wraps.length) return;
  const strength = 0.15, range = 50, max = 8;
  wraps.forEach((wrap) => {
    if (wrap.dataset.magnetBound) return;
    wrap.dataset.magnetBound = '1';
    const inner = wrap.querySelector('.magnet-inner') || wrap;
    wrap.addEventListener('mouseleave', () => { inner.style.transform = 'translate(0,0)'; });
  });
  if (magneticBound) return;
  magneticBound = true;
  window.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.magnet-wrap').forEach((wrap) => {
      const inner = wrap.querySelector('.magnet-inner') || wrap;
      const r = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < range + r.width / 2) {
        const tx = Math.max(-max, Math.min(max, dx * strength));
        const ty = Math.max(-max, Math.min(max, dy * strength));
        inner.style.transform = `translate(${tx}px, ${ty}px)`;
      }
    });
  });
}

function initCompare() {
  document.querySelectorAll('.ba:not([data-compare-bound])').forEach((el) => {
    el.dataset.compareBound = '1';
    let dragging = false;
    const setPos = (clientX) => {
      const r = el.getBoundingClientRect();
      let pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      el.style.setProperty('--pos', pct + '%');
    };
    el.addEventListener('pointerdown', (e) => { dragging = true; el.setPointerCapture(e.pointerId); setPos(e.clientX); });
    el.addEventListener('pointermove', (e) => { if (dragging) setPos(e.clientX); });
    el.addEventListener('pointerup', () => { dragging = false; });
    el.addEventListener('pointercancel', () => { dragging = false; });
    // Keyboard: focus the knob, arrow keys nudge.
    el.tabIndex = 0;
    el.addEventListener('keydown', (e) => {
      const cur = parseFloat(getComputedStyle(el).getPropertyValue('--pos')) || 50;
      if (e.key === 'ArrowLeft') el.style.setProperty('--pos', Math.max(0, cur - 4) + '%');
      if (e.key === 'ArrowRight') el.style.setProperty('--pos', Math.min(100, cur + 4) + '%');
    });
  });
}

function initSpotlight() {
  document.querySelectorAll('.spot:not([data-spot-bound])').forEach((el) => {
    el.dataset.spotBound = '1';
    const after = el.querySelector('.spot-after');
    const cursor = el.querySelector('.spot-cursor');
    if (!after) return;
    const isTouch = window.matchMedia('(hover: none)').matches;
    const reveal = (x, y) => {
      const r = el.getBoundingClientRect();
      const lx = x - r.left, ly = y - r.top;
      after.style.clipPath = `circle(90px at ${lx}px ${ly}px)`;
      if (cursor) { cursor.style.left = lx + 'px'; cursor.style.top = ly + 'px'; }
    };
    if (isTouch) {
      el.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) reveal(t.clientX, t.clientY); }, { passive: true });
    } else {
      el.addEventListener('mousemove', (e) => reveal(e.clientX, e.clientY));
      el.addEventListener('mouseleave', () => { after.style.clipPath = 'circle(0px at 50% 50%)'; });
    }
  });
}

function initParallax() {
  const els = document.querySelectorAll('[data-parallax]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !els.length) return;
  let ticking = false;
  const update = () => {
    els.forEach((el) => {
      const strength = parseFloat(el.dataset.parallax) || 0.2;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh - r.top) / (vh + r.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const shift = (clamped - 0.5) * 100 * strength;
      el.style.transform = `translateY(${shift}px)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

let heroBgBound = false;
function initHeroParallax() {
  if (heroBgBound) return;
  heroBgBound = true;
  window.addEventListener('scroll', () => {
    const bg = document.querySelector('.hero-editorial .bg');
    if (!bg) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const y = Math.min(window.scrollY, window.innerHeight);
    bg.style.transform = `translateY(${y * 0.18}px)`;
  }, { passive: true });
}

function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initMobileNav() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.mobile-nav');
  const close = document.querySelector('.mobile-close');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => nav.classList.add('open'));
  close?.addEventListener('click', () => nav.classList.remove('open'));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
}

let convbarDismissed = false;
function initConvbar() {
  const bar = document.querySelector('.convbar');
  const closeBtn = document.querySelector('.cb-close');
  if (!bar) return;
  const onScroll = () => {
    if (convbarDismissed) return;
    bar.classList.toggle('show', window.scrollY > 640);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  closeBtn?.addEventListener('click', () => { convbarDismissed = true; bar.classList.remove('show'); });
}

export function init() {
  initReveal();
  initSplitLines();
  initMagnetic();
  initCompare();
  initSpotlight();
  initParallax();
  initHeroParallax();
  initHeaderScroll();
  initMobileNav();
  initConvbar();
}

// First load.
init();
// Every ClientRouter navigation (including bfcache-style restores).
document.addEventListener('astro:page-load', init);
