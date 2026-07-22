// VISUAILS — vanilla-JS motion + chrome behaviour, shared across every page.
// init() runs once on first load and again on every `astro:page-load` (fired
// after each ClientRouter navigation). Anything that attaches a window/document
// listener is guarded by a module-level boolean so it binds exactly once for
// the whole SPA session — otherwise listeners would stack up on every
// navigation. Per-element work (reveal/split) is guarded by a dataset flag so
// only new, unbound elements get processed after a page swap.

// Safety net for reveal-gated content. `.reveal.pending` starts at opacity:0
// and only becomes visible once `.in` is added. If the per-page Intersection
// observer never runs (e.g. init() didn't re-run after a ClientRouter nav on
// mobile), that content would stay invisible forever — which is exactly what
// hid the test-sample form. This runs at document level, bound once, and on
// every scroll / page-load, so any reveal element in view is shown regardless
// of per-page setup. Bulletproof, and still gives the scroll-in animation.
// ---- i18n microcopy for JS-injected strings (thank-you summary, form hints,
// hex advice, live totals). Language is read from the URL: /nl, /de, else en. ----
function pageLang() {
  return (location.pathname || '/').split('/')[1] === 'nl' ? 'nl' : 'en';
}
function langPrefix() { const l = pageLang(); return l === 'en' ? '' : '/' + l; }
const I18N = {
  en: {
    volumeQuote: 'Volume quote', tyTitle: 'Your request',
    ty: { name: 'Name', brand: 'Brand', email: 'Email', phone: 'Phone', vtype: 'Video type', style: 'Style', presentation: 'Shown as', model: 'Model', quantity: 'Quantity', products: 'Products', format: 'Format', quality: 'Quality', delivery: 'Delivery', background: 'Background', notes: 'Notes' },
    phoneOptional: '— optional',
    phoneHintWa: 'You chose WhatsApp, so a phone number is required — please include your country code.',
    phoneHintEmail: 'We’ll reach you by email. Add a phone number if you’d rather we message you on WhatsApp.',
    hexRec: '✓ A light, neutral background like this keeps products looking clean and professional.',
    hexStrong: 'We’d advise against a strong colour like this — light, neutral backgrounds (white, off-white, light grey or beige) look cleanest and most professional. The choice is yours.',
    hexDark: 'That’s on the darker side — a lighter neutral (white, off-white, light grey or beige) usually looks cleaner and more professional. The choice is yours.',
    carryChoose: 'Let VISUAILS choose the model', carrySelected: 'Model selected: ', carryTail: ' — now pick the service you’d like to use it for.',
  },
  nl: {
    volumeQuote: 'Op aanvraag', tyTitle: 'Je aanvraag',
    ty: { name: 'Naam', brand: 'Merk', email: 'E-mail', phone: 'Telefoon', vtype: 'Videotype', style: 'Stijl', presentation: 'Getoond als', model: 'Model', quantity: 'Aantal', products: 'Producten', format: 'Formaat', quality: 'Kwaliteit', delivery: 'Levering', background: 'Achtergrond', notes: 'Opmerkingen' },
    phoneOptional: '— optioneel',
    phoneHintWa: 'Je koos WhatsApp, dus een telefoonnummer is verplicht — vermeld je landcode.',
    phoneHintEmail: 'We bereiken je per e-mail. Voeg een telefoonnummer toe als je liever een WhatsApp-bericht krijgt.',
    hexRec: '✓ Een lichte, neutrale achtergrond zoals deze houdt producten strak en professioneel.',
    hexStrong: 'We raden een sterke kleur als deze af — lichte, neutrale achtergronden (wit, off-white, licht grijs of beige) ogen het strakst en meest professioneel. De keuze is aan jou.',
    hexDark: 'Dit is aan de donkere kant — een lichtere neutrale kleur (wit, off-white, licht grijs of beige) oogt meestal strakker en professioneler. De keuze is aan jou.',
    carryChoose: 'Laat VISUAILS het model kiezen', carrySelected: 'Model gekozen: ', carryTail: ' — kies nu de dienst waarvoor je het wilt gebruiken.',
  },
};
function t18() { return I18N[pageLang()] || I18N.en; }
function money(n) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return '€' + (pageLang() === 'en' ? s : s.replace('.', ','));
}

function revealInView() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  document.querySelectorAll('.reveal.pending:not(.in), .reveal-mask:not(.in), .reveal-clip-wrap > .reveal-clip-inner:not(.in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.96 && r.bottom > -40) {
      el.classList.add('in');
      const lines = el.querySelectorAll ? el.querySelectorAll('.split-line') : [];
      lines.forEach((l) => l.classList.add('in'));
    }
  });
}
let revealNetBound = false;
function bindRevealNet() {
  revealInView();
  if (revealNetBound) return;
  revealNetBound = true;
  window.addEventListener('scroll', revealInView, { passive: true });
  window.addEventListener('resize', revealInView, { passive: true });
}

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
  // Query the header inside the handler: it is no longer transition:persist
  // (so it re-renders per page, in the right language), which means a captured
  // reference would go stale after a navigation.
  const onScroll = () => { const h = document.querySelector('.site-header'); if (h) h.classList.toggle('scrolled', window.scrollY > 20); };
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
  // The bar re-renders per page (no longer transition:persist, so its text is
  // localized), so we query it fresh in the handler and delegate the close.
  const suppressed = () => {
    let p = location.pathname;
    if (p.startsWith('/nl')) p = p.slice(3) || '/';
    return p.startsWith('/test-sample') || p.startsWith('/order') || p.startsWith('/thank-you');
  };
  const sync = () => {
    const bar = document.querySelector('.convbar');
    if (!bar) return;
    if (convbarDismissed || suppressed()) { bar.classList.remove('show'); return; }
    bar.classList.toggle('show', window.scrollY > 640);
  };
  sync();
  if (convbarBound) return;
  convbarBound = true;
  window.addEventListener('scroll', sync, { passive: true });
  document.addEventListener('astro:page-load', sync);
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('.cb-close')) {
      convbarDismissed = true;
      const bar = document.querySelector('.convbar');
      if (bar) bar.classList.remove('show');
    }
  });
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
    label.textContent = money(total);
  };
  const catalogTotal = (form) => {
    const label = document.querySelector('#cat-total');
    if (!label) return;
    const sel = form.querySelector('#cat-qty');
    const raw = (sel && sel.value) || '1';
    const n = parseInt(raw, 10);
    // "More than 10" (non-numeric value) → volume quote, no fixed total.
    if (!n || Number.isNaN(n)) { label.textContent = t18().volumeQuote; return; }
    label.textContent = money(n * 39.99);
  };
  const videoTotal = (form) => {
    const label = document.querySelector('#video-total');
    if (!label) return;
    const vtype = form.querySelector('input[name="vtype"]:checked');
    const price = vtype && vtype.value === 'Lifestyle Video' ? 59 : 49;
    const sel = form.querySelector('#v-qty');
    const n = parseInt((sel && sel.value) || '1', 10) || 1;
    label.textContent = money(price * n);
  };
  // First invalid, validatable field in a container (or null).
  const firstInvalid = (container) => {
    const fs = container.querySelectorAll('input, select, textarea');
    for (const f of fs) { if (f.willValidate && !f.checkValidity()) return f; }
    return null;
  };
  const revealFor = (form, field) => {
    const step = field.closest('[data-wizard-step], .step-panel');
    if (!step) return;
    if (step.hasAttribute('data-wizard-step')) show2(form, Number(step.dataset.wizardStep));
    else showN(form, Number(step.dataset.step));
    scrollToForm(form);
  };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    let el;
    // "Next" gates on the current step's validity (don't advance past empty required fields).
    if ((el = t.closest('[data-wizard-next]'))) {
      const f = el.closest('form'); if (!f) return;
      const cur = f.querySelector('[data-wizard-step]:not(.hidden-step)');
      const bad = cur && firstInvalid(cur);
      if (bad) { bad.reportValidity(); bad.focus && bad.focus(); return; }
      show2(f, 2); scrollToForm(f); return;
    }
    if ((el = t.closest('[data-wizard-back]'))) { const f = el.closest('form'); if (f) { show2(f, 1); scrollToForm(f); } return; }
    if ((el = t.closest('[data-step-next]'))) {
      const f = el.closest('form'); if (!f) return;
      const cur = f.querySelector('.step-panel:not(.hidden-step)');
      const bad = cur && firstInvalid(cur);
      if (bad) { bad.reportValidity(); bad.focus && bad.focus(); return; }
      showN(f, Number(el.dataset.stepNext)); scrollToForm(f); return;
    }
    if ((el = t.closest('[data-step-prev]'))) { const f = el.closest('form'); if (f) { showN(f, Number(el.dataset.stepPrev)); scrollToForm(f); } return; }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#ls-form')) lsTotal(t.closest('#ls-form'));
    if (t.closest('#video-form')) videoTotal(t.closest('#video-form'));
    if (t.closest('#cat-form')) catalogTotal(t.closest('#cat-form'));
  });
  // Wizard forms are novalidate; validate in JS on submit so a required field in
  // a hidden step reveals its step (avoids the silent "not-focusable" dead-end).
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('form[data-wizard], #ls-form')) return;
    const bad = firstInvalid(form);
    if (bad) { e.preventDefault(); revealFor(form, bad); bad.reportValidity(); bad.focus && bad.focus(); }
  });
}

// Thank-you page: echo the submitted request from the query string so the
// customer sees a confirmation of what they ordered (forms GET to /thank-you).
function initThankYou() {
  const box = document.querySelector('#ty-summary');
  if (!box) return;
  const p = new URLSearchParams(location.search);
  const L = t18().ty;
  const map = [
    ['name', L.name], ['brand', L.brand], ['company', L.brand], ['email', L.email], ['phone', L.phone],
    ['vtype', L.vtype], ['style', L.style], ['presentation', L.presentation], ['model', L.model],
    ['quantity', L.quantity], ['products', L.products], ['format', L.format], ['quality', L.quality],
    ['delivery', L.delivery], ['background', L.background], ['message', L.notes], ['notes', L.notes],
  ];
  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  // Validated custom background hex (safe to inline into markup below).
  const bgHex = (() => {
    let x = (p.get('background_hex') || '').trim();
    if (x && x[0] !== '#') x = '#' + x;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(x) ? x.toUpperCase() : '';
  })();
  const rows = [];
  const seen = new Set();
  map.forEach(([key, label]) => {
    const v = p.get(key);
    if (!v || !v.trim() || seen.has(label)) return;
    seen.add(label);
    let valHtml = esc(v.trim());
    // Subtly append the chosen colour to the Background row: a small swatch + hex.
    if (key === 'background' && bgHex) {
      valHtml += ` <span class="ty-swatch" style="background:${bgHex}"></span><span class="ty-hex">${bgHex}</span>`;
    }
    rows.push([label, valHtml]);
  });
  if (!rows.length) { box.style.display = 'none'; return; }
  box.innerHTML = `<h4 style="margin-bottom:.9rem">${t18().tyTitle}</h4><dl class="ty-dl">` +
    rows.map(([l, v]) => `<div class="ty-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('') +
    '</dl>';
  box.style.display = 'block';
}

// Carry a chosen model / presentation into the order forms via the URL.
//  • /order?model=Elias           → hub shows a note + forwards the model into
//    the Catalog (on-model) and Lifestyle service links.
//  • /order-catalog?show=on-model  → preselects "On a model".
//  • /order-catalog?model=Elias    → preselects on-model + that model.
//  • /order-lifestyle?model=Elias  → preselects that model in step 2.
// Runs each page-load (reads the current URL); idempotent.
function initFormPrefill() {
  const params = new URLSearchParams(location.search);
  const model = params.get('model');
  const show = params.get('show');

  const presOnModel = document.querySelector('input[name="presentation"][value="On a model"]');
  if (presOnModel && (show === 'on-model' || model)) {
    presOnModel.checked = true;
    presOnModel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (model) {
    const esc = (window.CSS && CSS.escape) ? CSS.escape(model) : model.replace(/"/g, '\\"');
    const r = document.querySelector(`input[name="model"][value="${esc}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  // Order hub: forward the model into the service links + show a note.
  const hub = document.querySelector('.hub-grid');
  if (model && hub) {
    const enc = encodeURIComponent(model);
    const pfx = langPrefix();
    hub.querySelectorAll(`a[href^="${pfx}/order-catalog"]`).forEach((a) => { a.href = `${pfx}/order-catalog?show=on-model&model=${enc}`; });
    hub.querySelectorAll(`a[href^="${pfx}/order-lifestyle"]`).forEach((a) => { a.href = `${pfx}/order-lifestyle?model=${enc}`; });
    if (!document.querySelector('.model-carry-note')) {
      const d = t18();
      const note = document.createElement('p');
      note.className = 'model-carry-note';
      note.style.cssText = 'margin:0 0 1.4rem;padding:.55rem 1.05rem;border:1px solid var(--accent-line);background:var(--accent-soft);border-radius:var(--r-pill);display:inline-flex;gap:.5rem;align-items:center;font-size:.88rem;color:var(--ink);';
      const label = model === 'VISUAILS choose' ? d.carryChoose : d.carrySelected + model;
      note.textContent = label + d.carryTail;
      hub.parentNode.insertBefore(note, hub);
    }
  }
}

// Before/after Compare: make the handle draggable while keeping the auto-play.
// Delegated + bound once, so it works on every page and after ClientRouter
// navigations. Only the divider/knob start a drag (they have touch-action:none);
// touching the image scrolls the page as normal — no sticking on the section.
let compareDragBound = false;
function initCompareDrag() {
  if (compareDragBound) return;
  compareDragBound = true;
  let active = null;
  const posOf = (cmp, clientX) => {
    const r = cmp.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  };
  const setPos = (cmp, clientX) => {
    cmp.classList.add('cmp-drag');
    cmp.style.setProperty('--cmp-pos', posOf(cmp, clientX) + '%');
  };
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest('.cmp-divider, .cmp-knob');
    if (!handle) return;
    const cmp = handle.closest('.cmp');
    if (!cmp) return;
    active = cmp;
    setPos(cmp, e.clientX);
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!active) return;
    active.style.setProperty('--cmp-pos', posOf(active, e.clientX) + '%');
    e.preventDefault();
  }, { passive: false });
  const end = () => { active = null; };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  // Keyboard: focus the knob, arrow keys nudge.
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest('.cmp-knob, .cmp-divider');
    if (!handle || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const cmp = handle.closest('.cmp');
    if (!cmp) return;
    cmp.classList.add('cmp-drag');
    const cur = parseFloat(getComputedStyle(cmp).getPropertyValue('--cmp-pos')) || 50;
    cmp.style.setProperty('--cmp-pos', Math.max(0, Math.min(100, cur + (e.key === 'ArrowRight' ? 5 : -5))) + '%');
    e.preventDefault();
  });
}

// Live hex-colour preview. Any `input[data-hex-preview="<selector>"]` updates
// the swatch it points to as the user types a valid 3- or 6-digit hex, and
// the optional `[data-hex-preview-label]` next to it shows the normalised code.
// Delegated + bound once so it survives ClientRouter navigations.
let hexPreviewBound = false;
function initHexPreview() {
  if (hexPreviewBound) return;
  hexPreviewBound = true;
  // RGB (0–255) of a #rgb / #rrggbb colour.
  const toRgb = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const brightnessOf = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255; // 0–1
  const chromaOf = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255; // 0 = neutral grey
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches('input[data-hex-preview]')) return;
    const sw = document.querySelector(t.getAttribute('data-hex-preview'));
    const label = t.parentElement && t.parentElement.querySelector('[data-hex-preview-label]');
    const scope = t.closest('.field') || document;
    const advice = scope.querySelector('[data-hex-advice]');
    let v = (t.value || '').trim();
    if (v && v[0] !== '#') v = '#' + v;
    const ok = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
    if (sw) sw.style.background = ok ? v : '#ffffff';
    if (label) label.textContent = ok ? v.toUpperCase() : 'Preview';
    if (advice) {
      if (!ok) { advice.textContent = ''; advice.style.color = 'var(--ink-3)'; return; }
      const rgb = toRgb(v);
      const bright = brightnessOf(rgb);
      const chroma = chromaOf(rgb);
      // Recommended ONLY when it's a light, near-neutral: white, off-white,
      // light grey or beige. Anything with real colour, or that's too dark, is
      // advised against (the customer can still choose it).
      const recommended = bright >= 0.82 && chroma <= 0.12;
      const d = t18();
      if (recommended) {
        advice.textContent = d.hexRec;
        advice.style.color = 'var(--success, #4AD07F)';
      } else if (chroma > 0.12) {
        advice.textContent = d.hexStrong;
        advice.style.color = 'var(--warn, #E0A43B)';
      } else {
        advice.textContent = d.hexDark;
        advice.style.color = 'var(--warn, #E0A43B)';
      }
    }
  });
}

// Preferred-contact-method → phone requirement. When the customer chooses
// "Chat on WhatsApp" we need a number to reach them, so the phone field becomes
// required; choosing "Contact by email" makes it optional again. Runs on each
// page-load (to set the initial state) and via one delegated change listener.
let contactPhoneBound = false;
function initContactPhone() {
  const apply = (form) => {
    const method = form.querySelector('input[name="contact_method"]:checked');
    if (!method) return;
    const phone = form.querySelector('input[type="tel"], input[name="phone"]');
    if (!phone) return;
    const wa = method.value === 'WhatsApp';
    phone.required = wa;
    const d = t18();
    const ind = form.querySelector('[data-phone-indicator]');
    if (ind) ind.innerHTML = wa ? '<span class="req">*</span>' : `<span class="hint" style="font-weight:400">${d.phoneOptional}</span>`;
    const hint = form.querySelector('[data-phone-hint]');
    if (hint) hint.textContent = wa ? d.phoneHintWa : d.phoneHintEmail;
  };
  document.querySelectorAll('form').forEach((f) => { if (f.querySelector('input[name="contact_method"]')) apply(f); });
  if (contactPhoneBound) return;
  contactPhoneBound = true;
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches('input[name="contact_method"]')) return;
    const form = t.closest('form');
    if (form) apply(form);
  });
}

export function init() {
  initReveal();
  initSplitLines();
  initFormPrefill();
  initContactPhone();
  initCompareDrag();
  initThankYou();
  initHexPreview();
  // Magnetic button-follow intentionally removed — CTAs stay put under the cursor.
  initParallax();
  initHeroParallax();
  initHeaderScroll();
  initMobileNav();
  initServicesMenu();
  initConvbar();
  initWizards();
}

// The reveal safety net is bound FIRST and unconditionally, so reveal-gated
// content can never stay hidden — even if init() throws or doesn't re-run on a
// given ClientRouter navigation. init() itself is guarded so a runtime error in
// any sub-init can't break the rest of the page.
bindRevealNet();
document.addEventListener('astro:page-load', revealInView);
document.addEventListener('astro:page-load', () => { try { init(); } catch (e) {} });
try { init(); } catch (e) {}
