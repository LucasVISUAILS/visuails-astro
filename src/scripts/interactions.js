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
// ---- i18n microcopy for JS-injected strings. Language is read from the URL:
// /nl, else en.
//
// This table is much shorter than it was. It used to carry the thank-you page's
// full label set (`ty`), a `tyTitle`, three background-colour advice sentences
// and three phone-hint sentences, plus a `volumeQuote` for a running total.
// Section 10 deleted the pages that displayed every one of them; see the
// removal notes above initThankYou() and above initTracking() for which
// mechanism each belonged to. What is left is what a page still renders. ----
function pageLang() {
  return (location.pathname || '/').split('/')[1] === 'nl' ? 'nl' : 'en';
}
// (langPrefix() lived here. It existed only to build /order-catalog and
// /order-lifestyle URLs inside initFormPrefill(); both are gone with the
// funnel — section 10. Nothing else in this file builds a localized URL: the
// Astro side does that with localizedPath() at render time.)
const I18N = {
  en: {
    sourceThanks: 'Thanks — that helps us a lot.',
    tyRefTitle: 'Your reference', tyRefNote: 'Keep this handy — quote it if you message us about this order.',
  },
  nl: {
    sourceThanks: 'Bedankt — daar hebben we veel aan.',
    tyRefTitle: 'Je referentie', tyRefNote: 'Bewaar deze — vermeld hem als je ons over deze bestelling appt of mailt.',
  },
};
function t18() { return I18N[pageLang()] || I18N.en; }
// (money() lived here — '€' + a comma for nl. Its only callers were the three
// running totals in initWizards(), which went with the order pages. It never
// grouped thousands, which is why pipeline.js carries its own euro() rather
// than importing this one; that difference is now moot as well as invisible.)

function revealInView() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  document.querySelectorAll('.reveal.pending:not(.in), .reveal-mask:not(.in)').forEach((el) => {
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

  // Mask reveal variant (photo moments, style-page media bands). A second
  // variant, .reveal-clip-wrap > .reveal-clip-inner, was queried here and in
  // revealInView until orphan_sweep.py pointed out that no page has produced
  // that markup since the editorial rework; its CSS went with it.
  document.querySelectorAll('.reveal-mask:not([data-reveal-bound])').forEach((el) => {
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

// A generic [data-parallax] driver used to live here. No element in the site
// ever carried the attribute, so it was a permanent scroll listener iterating
// an empty NodeList on every page. Removed rather than guarded: motion.js is
// the site's scroll-animation system (GSAP + ScrollTrigger, built in a context
// and reverted on astro:before-swap), and a second hand-rolled scroll-parallax
// path would be duplicate machinery the day anyone actually wanted the effect.

let heroBgBound = false, heroBgTicking = false;
function heroBgUpdate() {
  heroBgTicking = false;
  // Queried inside the handler, not captured at bind time: ClientRouter swaps
  // the document on navigation, so a held reference points at a detached node.
  const bg = document.querySelector('.hero-editorial .bg');
  if (!bg) return;
  const y = Math.min(window.scrollY, window.innerHeight);
  bg.style.transform = `translateY(${y * 0.18}px)`;
}
function initHeroParallax() {
  // Reduced motion is decided once, at bind time, so those users never install
  // the listener at all — the old code bound it regardless and paid a
  // matchMedia call on every scroll event to do nothing.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (heroBgBound) return;
  heroBgBound = true;
  // rAF-throttled: the old version wrote style.transform straight from the
  // scroll handler, which on a trackpad or smooth-scroll mouse fires far more
  // often than the compositor can use.
  window.addEventListener('scroll', () => {
    if (!heroBgTicking) { requestAnimationFrame(heroBgUpdate); heroBgTicking = true; }
  }, { passive: true });
  heroBgUpdate();
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
  // Suppressed wherever the visitor is already doing the thing the bar is
  // nagging them to do. /order was the old funnel; section 10 retired it, so
  // the entry that matters now is /start — without it the bar floats over the
  // pipeline's own submit button on every page past the fold, which is both
  // an obstruction and an argument with itself. /o (the client portal) is a
  // Pages Function, not an Astro route: this script never loads there.
  const suppressed = () => {
    let p = location.pathname;
    if (p.startsWith('/nl')) p = p.slice(3) || '/';
    return p.startsWith('/test-sample') || p.startsWith('/start') || p.startsWith('/thank-you');
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
// why the test-sample form was dead on mobile).
//
// ONE wizard is left: the 2-step /test-sample form, driven by data-wizard-step
// / -next / -back / -progress. A second, N-step machine used to live here for
// /order-lifestyle's 3-step form — it read `.step-panel`, `data-step`,
// `data-step-next` and `data-step-prev` — together with three running-total
// calculators (#ls-total, #cat-total, #video-total) fed by a `data-unit-price`
// attribute written at build time from src/data/pricing.js. Section 10 deleted
// all five order pages, so every one of those selectors now matches nothing on
// any page of the site, and they went with the markup. So did money() and the
// `volumeQuote` string: those calculators were their only callers.
//
// Worth recording why the totals are not simply being re-pointed at /start.
// The pipeline does quote a running figure, but it does it in pipeline.js
// against numbers the capacity gate has already seen, through its own euro().
// Two arithmetic paths over one price list is how a reprice ships half-applied.
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
  // First invalid, validatable field in a container (or null).
  const firstInvalid = (container) => {
    const fs = container.querySelectorAll('input, select, textarea');
    for (const f of fs) { if (f.willValidate && !f.checkValidity()) return f; }
    return null;
  };
  const revealFor = (form, field) => {
    const step = field.closest('[data-wizard-step]');
    if (!step) return;
    show2(form, Number(step.dataset.wizardStep));
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
  });
  // Wizard forms are novalidate; validate in JS on submit so a required field in
  // a hidden step reveals its step (avoids the silent "not-focusable" dead-end).
  // `#ls-form` used to be matched here too — /order-lifestyle's form was the one
  // non-wizard form that needed the same rescue. It is gone; /start does its own
  // validation in pipeline.js and must not be caught by this handler.
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('form[data-wizard]')) return;
    const bad = firstInvalid(form);
    if (bad) { e.preventDefault(); revealFor(form, bad); bad.reportValidity(); bad.focus && bad.focus(); }
  });
}

// Thank-you page: show the order reference /api/order redirected here with.
//
// #ty-summary ships display:none and this is the only thing that ever reveals
// it, so a page that never reaches the branch below simply doesn't show a
// summary box — which is the correct fallback, not a defect.
//
// There used to be a second branch under this one that rebuilt a whole <dl> of
// the submitted answers by reading ~16 named query parameters (name, brand,
// style, quantity, background, background_hex …). It dated from when the order
// forms were GET forms and their fields therefore landed in the URL. Every form
// on the site now POSTs to /api/order — test-sample, contact, the homepage lead
// form and /start's pipeline, checked one by one — and the only query parameter
// that endpoint ever puts on a thank-you URL is `ref` (functions/api/order.js).
// So the branch read parameters nothing produced, always found zero rows, and
// re-hid a box that was already hidden. It went, and with it t18()'s `ty` label
// table, `tyTitle`, and the .ty-dl / .ty-row / .ty-swatch / .ty-hex CSS in both
// thank-you pages.
//
// Keeping personal data out of the URL is also the better behaviour on its own
// terms: a query string is read by the referrer header, browser history, and
// anything that logs URLs. A reference is the right thing to show, and the only
// thing worth putting there.
function initThankYou() {
  const box = document.querySelector('#ty-summary');
  if (!box) return;
  const ref = (new URLSearchParams(location.search).get('ref') || '').trim();
  if (!/^VIS-[A-Z0-9-]{3,}$/i.test(ref)) return;
  const d = t18();
  box.innerHTML = `<h4 style="margin-bottom:.4rem">${d.tyRefTitle}</h4>`
    + `<p style="margin:0;font-size:1.15rem;letter-spacing:.02em"><strong>${ref.toUpperCase()}</strong></p>`
    + `<p style="margin:.55rem 0 0;color:var(--ink-3);font-size:.9rem">${d.tyRefNote}</p>`;
  box.style.display = 'block';
}

// REMOVED IN SECTION 10 — initFormPrefill(), and why it is not worth keeping
// a reduced version.
//
// It read ?model= and ?show= off the URL and carried a chosen face from the
// model roster into whichever order form you landed on: it ticked "On a
// model", ticked the model's own radio, rewrote the hub's service links to
// forward the choice one hop further, and injected a .model-carry-note
// explaining what had been carried.
//
// Every one of those targets is gone. .hub-grid was the /order hub;
// input[name="presentation"] was /order-catalog; the forwarded links pointed
// at /order-catalog and /order-lifestyle. All deleted. What survived the
// funeral was the bare input[name="model"] preselect, which still has markup
// to bite on — /test-sample has that radio group — and that is exactly why it
// went too: nothing on the site emits a ?model= link any more — grep says so,
// and BrandModelPage.astro's merge changelog (the `#standard` roster bullet)
// says why the per-model links stopped being ?model= URLs. So the only way to
// reach that branch is to type the query string by hand. A mechanism whose sole
// caller is a hand-typed URL is not a feature, it is a maintenance cost with an
// i18n tail — carryChoose / carrySelected / carryTail went with it.
//
// If a model ever needs carrying into /start, it will not come back as a
// query string. pipeline.js reads no URL state at all, on purpose: the page
// is a state machine over answered questions, and a URL that can preset one
// answer is a URL that can produce a state the machine never navigated to.

// Park each compare's auto-sweep while it is off screen (.cmp-off pauses the
// CSS animation). The sweep animates a registered custom property that drives
// a clip-path, which costs a style+paint pass per frame — the catalog page has
// six compares, and without this they all pay that cost on every frame no
// matter where the visitor is. Elements are observed once (dataset flag);
// after a ClientRouter swap the old nodes are gone and the new ones enroll.
let cmpIdleIO = null;
function initCompareIdle() {
  if (!cmpIdleIO) {
    cmpIdleIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('cmp-off', !en.isIntersecting));
    }, { rootMargin: '120px' });
  }
  document.querySelectorAll('.cmp:not([data-idle-bound])').forEach((el) => {
    el.dataset.idleBound = '1';
    cmpIdleIO.observe(el);
  });
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

// REMOVED IN SECTION 10 — initHexPreview() and initContactPhone().
//
// Both were funnel machinery whose markup went with the five order pages.
//
// initHexPreview() drove the custom-background colour picker on
// /order-catalog: it read `input[data-hex-preview="<selector>"]`, painted the
// swatch it pointed at, normalised the code into `[data-hex-preview-label]`,
// and wrote a brightness/chroma judgement into `[data-hex-advice]` advising
// against strong or dark backgrounds. No page emits any of those three
// attributes now. The advice strings (hexRec / hexStrong / hexDark) went too.
//
// initContactPhone() made the phone field required when the visitor picked
// "Chat on WhatsApp" from an `input[name="contact_method"]` radio group, and
// rewrote `[data-phone-indicator]` / `[data-phone-hint]` to match. That radio
// group only ever existed on the order forms. Read StartPage.astro's phone
// field alongside this: the pipeline deliberately did NOT add a contact_method
// radio, because this function bound globally and set phone.required behind the
// pipeline's own syncRequired() — the two would have fought over one field on
// every re-render. With this function deleted the collision is impossible
// rather than merely dodged, and that comment now says so; what keeps the radio
// out of /start from here on is the design argument, not the hazard.
//
// The judgement in the hex advice is not lost, only relocated: choosing a
// background is a conversation about the product, and /start asks for it in
// the brief rather than as a colour field with an opinion attached.

// Lightweight, tool-agnostic event tracking. Whatever privacy-friendly
// analytics the site ends up using (Plausible, Umami, or Cloudflare Web
// Analytics' pageview beacon only) this calls it if present and no-ops
// otherwise — so the events below are wired now and start reporting the
// moment an analytics script is added, with zero code changes. Never throws.
function track(name, props) {
  try {
    if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined);
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, props || {});
  } catch (e) {}
}

// Fire an event for any element carrying data-track="event name". Bound once,
// delegated, so it covers CTAs added on any page and after ClientRouter swaps.
let trackBound = false;
function initTracking() {
  if (trackBound) return;
  trackBound = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const el = t.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'));
  });
}

// Thank-you page: a one-tap "How did you find us?" — cookieless attribution.
// Records via track() (works the moment analytics is live) and, no matter what,
// confirms to the visitor so the tap always feels acknowledged. Bound once.
let sourceAskBound = false;
function initSourceAsk() {
  const ask = document.querySelector('[data-source-ask]');
  if (!ask) return;
  if (sourceAskBound) return;
  sourceAskBound = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('[data-source]');
    if (!btn) return;
    const wrap = btn.closest('[data-source-ask]');
    if (!wrap) return;
    track('source', { via: btn.getAttribute('data-source') });
    wrap.innerHTML = `<p class="source-done">${t18().sourceThanks}</p>`;
  });
}

export function init() {
  initReveal();
  initSplitLines();
  initCompareDrag();
  initCompareIdle();
  initTracking();
  initSourceAsk();
  initThankYou();
  // Magnetic button-follow intentionally removed — CTAs stay put under the cursor.
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
