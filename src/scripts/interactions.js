// VISUAILS — vanilla-JS motion + chrome behaviour, shared across every page.
// init() runs once on first load and again on every `astro:page-load` (fired
// after each ClientRouter navigation). Anything that attaches a window/document
// listener is guarded by a module-level boolean so it binds exactly once for
// the whole SPA session — otherwise listeners would stack up on every
// navigation. Per-element work (reveal/split) is guarded by a dataset flag so
// only new, unbound elements get processed after a page swap.
//
// This file used to import GSAP for one thing — the Compare slider's edge
// snap — on the grounds that motion.js already shipped the bundle sitewide.
// motion.js has been deleted (every hook it queried was dead on all 84 pages),
// so that import would have become a ~70 KB dependency for a single 340ms
// tween. The snap is now ~10 lines of requestAnimationFrame on the identical
// curve; see SNAP_EDGE below. This module has no runtime dependencies.
// The upload caps, from the module /api/upload enforces them with. Imported
// rather than retyped so the browser refuses exactly what the endpoint refuses
// — see tsPreflight(). /start reads the same three facts out of its config
// blob; this page has no blob, so it reads them straight from the source.
import { MAX_FILE_BYTES, MAX_BATCH_FILES, typeFor } from '../lib/uploads.js';

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
    tyPayNote: 'This order is not paid yet. Production starts once the payment comes through.',
    tyPayCta: 'Complete the payment',
    tsSending: 'Uploading…',
    tsDone: 'Uploaded',
    tsRemove: 'Remove',
    tsNeedFile: 'Add at least one product photo — we cannot make a sample without one.',
    tsWaiting: 'One moment — your photos are still uploading.',
    // Said when an upload failed for a reason the visitor cannot act on — a
    // dead bucket, a 404, a rate limit, a connection that dropped. Same promise
    // as tsErr.unavailable, which is the case the server names outright.
    tsOffNote: 'That upload did not go through. Send the form anyway and we will email you for the photos.',
    tsErr: {
      unavailable: 'Uploads are unavailable right now. Send the form anyway and we will email you for the photos.',
      rate: 'That was a lot at once. Wait a moment, then try again.',
      'bad-type': 'Not an image we can read. JPG, PNG, WebP, AVIF, HEIC, GIF or TIFF.',
      'too-large': 'Too large. Send a file under {max}.',
      empty: 'That file is empty.',
      'batch-full': 'That is as many files as one request will take ({max}).',
      network: 'The upload did not reach us. Check the connection and retry.',
      generic: 'That upload did not go through. Try it again.',
    },
    // The gate's reason for stopping, when the only thing that went wrong is
    // something the visitor can fix. Each one names the actual problem and, where
    // there is one, the actual limit — never "add at least one photo", which is
    // both untrue (they added one) and no help.
    tsBlocked: {
      'bad-type': 'That file type will not open here. Add a JPG, PNG, WebP, AVIF, HEIC, GIF or TIFF to carry on.',
      'too-large': 'That photo is over {max}, which is the most one file can be. Add a smaller one to carry on.',
      empty: 'That file came through empty. Add a photo with something in it to carry on.',
      'batch-full': 'That is as many files as one request will take ({max}). Remove one to carry on.',
    },
  },
  nl: {
    sourceThanks: 'Bedankt — daar hebben we veel aan.',
    tyRefTitle: 'Je referentie', tyRefNote: 'Bewaar deze — vermeld hem als je ons over deze bestelling appt of mailt.',
    tyPayNote: 'Deze bestelling is nog niet betaald. Zodra de betaling binnen is, gaan we aan de slag.',
    tyPayCta: 'Rond de betaling af',
    tsSending: 'Uploaden…',
    tsDone: 'Geüpload',
    tsRemove: 'Verwijderen',
    tsNeedFile: 'Voeg minstens één productfoto toe — zonder foto kunnen we geen sample maken.',
    tsWaiting: 'Momentje — je foto’s worden nog geüpload.',
    tsOffNote: 'Deze upload is niet doorgekomen. Stuur het formulier gerust op, dan mailen we je voor de foto’s.',
    tsErr: {
      unavailable: 'Uploaden lukt nu niet. Stuur het formulier gerust op, dan mailen we je voor de foto’s.',
      rate: 'Dat waren er veel tegelijk. Wacht even en probeer het opnieuw.',
      'bad-type': 'Geen beeld dat we kunnen lezen. JPG, PNG, WebP, AVIF, HEIC, GIF of TIFF.',
      'too-large': 'Te groot. Stuur een bestand onder {max}.',
      empty: 'Dit bestand is leeg.',
      'batch-full': 'Meer bestanden gaan er niet in één aanvraag ({max}).',
      network: 'De upload bereikte ons niet. Controleer de verbinding en probeer het opnieuw.',
      generic: 'Deze upload is niet doorgekomen. Probeer het nog eens.',
    },
    tsBlocked: {
      'bad-type': 'Dit bestandstype opent hier niet. Voeg een JPG, PNG, WebP, AVIF, HEIC, GIF of TIFF toe om verder te gaan.',
      'too-large': 'Die foto is groter dan {max}, het maximum per bestand. Voeg een kleinere toe om verder te gaan.',
      empty: 'Dit bestand kwam leeg binnen. Voeg een foto met inhoud toe om verder te gaan.',
      'batch-full': 'Meer bestanden gaan er niet in één aanvraag ({max}). Haal er één weg om verder te gaan.',
    },
  },
};
function t18() { return I18N[pageLang()] || I18N.en; }
// (money() lived here — '€' + a comma for nl. Its only callers were the three
// running totals in initWizards(), which went with the order pages. It never
// grouped thousands, which is why pipeline.js carries its own euro() rather
// than importing this one; that difference is now moot as well as invisible.)

// Read at call time, never cached. The setting can change mid-session, and the
// three older inline matchMedia() reads in this file already evaluate per call
// for that reason — this is the same check with a name, so the next caller does
// not have to remember the media string.
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    // THE DRAWER IS OFF SCREEN, NOT ABSENT. It is translated 100% to the right,
    // which hides it from the eye and from nobody else: an audit counted the
    // closed drawer as tab stops 11–24 on every page at every viewport, so a
    // keyboard user reached the page's own content on stop 25, after fourteen
    // controls they could not see. `inert` removes it from the tab order, from
    // the accessibility tree and from hit-testing in one attribute; aria-hidden
    // rides along for the browsers that do not have inert yet. Both are set
    // here rather than in CSS because visibility:hidden would break the slide
    // transition, which is the reason it was translated in the first place.
    nav.toggleAttribute('inert', !open);
    nav.setAttribute('aria-hidden', open ? 'false' : 'true');
    const toggle = document.querySelector('.menu-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    /*
     * ── EN DE PAGINA ERONDER GAAT INERT ALS DE LADE OPEN STAAT ────────────────
     *
     * 9 augustus 2026, gemeten op 390px. De omgekeerde kant was al goed gebouwd (de
     * gesloten lade krijgt `inert`, zie de noot hierboven), maar de pagina eronder
     * niet. Vijftien tabs door de lade en de zestiende zette de focus op de
     * "Start an order"-knop van de homepage — volledig achter een ondoorzichtige
     * lade. `elementFromPoint` op de coördinaten van die knop gaf een ander element
     * terug: de focus stond op iets dat niemand kon zien, terwijl de lade openbleef.
     *
     * `inert` op de broers en zussen in plaats van een tab-val met een keydown-
     * handler. Een val moet zelf bijhouden wat het eerste en laatste focusbare
     * element is, en dat verschuift zodra er een item bij komt — precies wat er
     * vandaag met "Hooks" is gebeurd. `inert` laat de browser dat bijhouden, haalt de
     * achtergrond óók uit de toegankelijkheidsboom, en werkt zonder toetsen te
     * onderscheppen.
     *
     * De lade en de knop die hem opent blijven bereikbaar; al hun broers en zussen
     * niet. De knop hoort erbij omdat je hem nodig hebt om te sluiten.
     */
    const parent = nav.parentElement;
    if (parent) {
      for (const sib of parent.children) {
        if (sib === nav) continue;
        /*
         * ── EERST STOND HIER EEN UITZONDERING VOOR DE KNOP, EN DIE LEKTE ───────
         *
         * `if (sib.contains(toggle)) continue;` — de header overslaan zodat de knop
         * bereikbaar bleef om de lade te sluiten. Gemeten resultaat: op tabstop 16
         * stond de focus op de LOGO-LINK, die in dezelfde header zit en op 390px
         * volledig achter de lade ligt. Eén overgeslagen voorouder maakt al zijn
         * kinderen bereikbaar; `inert` is niet per element terug te draaien.
         *
         * De uitzondering was ook niet nodig. De lade heeft zijn eigen sluitknop en
         * die is tabstop 1, en Escape werkt ook. Er is dus geen enkele reden om de
         * knop die hem opende bereikbaar te houden terwijl hij onzichtbaar is.
         */
        if (open) {
          // Wat al inert WAS, moet dat blijven als de lade sluit. Zonder deze
          // markering zou sluiten iets openzetten dat om een andere reden dicht stond.
          if (sib.hasAttribute('inert')) sib.setAttribute('data-was-inert', '');
          sib.setAttribute('inert', '');
        } else if (sib.hasAttribute('data-was-inert')) {
          sib.removeAttribute('data-was-inert');
        } else {
          sib.removeAttribute('inert');
        }
      }
    }

    /*
     * Sluiten brengt de focus terug naar de knop. Zonder dit staat de focus na
     * Escape op een element in een lade die net inert is geworden, en dan begint de
     * volgende tab weer bovenaan de pagina — de bezoeker is zijn plek kwijt.
     */
    if (!open && toggle && nav.contains(document.activeElement)) toggle.focus();
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
  /*
   * ── ESCAPE ZETTE aria-expanded OP false EN LIET HET PANEEL STAAN ────────────
   *
   * 9 augustus 2026, gemeten. Tab naar "Wat we maken", Enter, tab naar een item,
   * Escape: `aria-expanded` ging correct naar "false", maar
   * `getComputedStyle(.nav-menu)` gaf nog `opacity: 1; visibility: visible`. Escape
   * ZEI dus dat het menu dicht was terwijl je het nog zag staan.
   *
   * De oorzaak zit in de CSS en niet hier: `.has-menu:focus-within .nav-menu` houdt
   * het paneel getekend zolang de focus ergens in `.has-menu` staat, en deze handler
   * verplaatste de focus niet. Hij haalde alleen de klasse weg.
   *
   * De reparatie hoort dan ook hier en niet in de CSS. `:focus-within` is precies wat
   * je wil op een desktopmenu — het houdt het open terwijl je er met tab door loopt.
   * Wat ontbrak is dat Escape de focus TERUGBRENGT naar de knop, en dat is ook wat
   * een bezoeker verwacht: je bent uit het menu, je staat weer op wat het opende.
   */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const li = document.querySelector('.has-menu');
    if (!li) return;
    const inside = li.contains(document.activeElement);
    setOpen(li, false);
    if (inside) {
      /*
       * ── EN DIT WAS MIJN EERSTE FIX, DIE NIET WERKTE ───────────────────────────
       *
       * De focus terugzetten op de knop leek de oplossing: `aria-expanded` ging naar
       * false en de focus stond weer waar de bezoeker hem verwachtte. Gemeten bleef
       * het paneel toch op `opacity: 1; visibility: visible` staan — want de KNOP zit
       * zelf in `.has-menu`, dus `:focus-within` was nog steeds waar. Ik had de focus
       * verplaatst binnen precies het element waarvan ik hem weg moest halen.
       *
       * Vandaar deze klasse. Zolang hij erop staat, wint hij van de
       * `:focus-within`-regel (drie klassen plus een pseudo tegen twee) en is het
       * paneel dicht terwijl de focus er nog in staat. Hij gaat er weer af zodra de
       * bezoeker iets anders doet dan Escape — dus tabben, klikken of typen opent het
       * menu weer op de normale manier. Zonder dat opruimen zou Escape het menu voor
       * de rest van het bezoek onbruikbaar maken met de muis.
       */
      li.classList.add('esc-closed');
      const trigger = li.querySelector('.nav-trigger');
      if (trigger) trigger.focus();
    }
  });

  /* De klasse van hierboven weer weghalen. Elke andere toets en elke klik betekent
     dat de bezoeker verder wil; alleen Escape houdt hem dicht. `focusout` hoort erbij
     voor het geval de focus het menu verlaat zonder toets of klik. */
  const reopenable = () => {
    for (const li of document.querySelectorAll('.has-menu.esc-closed')) li.classList.remove('esc-closed');
  };
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') reopenable(); });
  document.addEventListener('pointerdown', reopenable);
  document.addEventListener('focusout', (e) => {
    const li = e.target instanceof Element ? e.target.closest('.has-menu') : null;
    if (li) setTimeout(() => { if (!li.contains(document.activeElement)) li.classList.remove('esc-closed'); }, 0);
  });
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
// ─────────────────────────────────────────────────────────────────────────────
// /test-sample · THE UPLOAD FIELD THAT WAS NEVER CONNECTED TO ANYTHING.
//
// The page shipped a dropzone, a required asterisk, and an <input type="file">
// that nothing in the codebase ever read. A visitor could pick four photographs,
// watch the label sit there, press through both steps and submit — and the order
// arrived with no pictures at all. Two independent reasons, and fixing either
// one alone would not have helped:
//
//   1. NOTHING BOUND THE INPUT. /start does its uploading in pipeline.js, which
//      is imported by /start and by nothing else. There was no equivalent here.
//   2. THE FORM COULD NOT HAVE CARRIED THE BYTES ANYWAY. It posts to /api/order,
//      and that endpoint deliberately refuses to read File entries — see section
//      4 of test_order_race.mjs, "no File is ever stringified into a column".
//      Photographs reach an order through R2: /api/upload stages them under a
//      batch id, and the order carries the id in a hidden `upload_batch` field.
//
// So adding enctype="multipart/form-data" — the obvious one-line fix, and the
// one this file's author would have reached for — would have been WORSE than
// leaving it broken. The bytes would have crossed the wire, been dropped on
// arrival, and the visitor would have had every reason to believe they arrived.
// The fix is the batch, not the encoding, and the file input carries no `name`
// for the same reason /start's does not: nothing about it belongs in the POST.
//
// This lives here rather than in a page-local <script> because a page-local
// script does not run when the page is reached through a ClientRouter
// navigation — which is the bug that already killed this same form once, and is
// recorded in the comment above initWizards().
// ─────────────────────────────────────────────────────────────────────────────
// `off`   — an upload failed for a reason the visitor cannot act on, so the
//           gate stands down and the note says the photos will be asked for by
//           email. See tsFailed() for what counts.
// `blocked` — the code of the last failure the visitor CAN act on (wrong type,
//           too large, empty, batch full). The gate keeps standing for those,
//           and this is what it names when it does.
const ts = { batch: '', pending: 0, staged: [], off: false, blocked: '', blockedMax: null, form: null };

function tsBytes(n) {
  const v = Number(n) || 0;
  if (v >= 1024 * 1024) {
    const s = (v / (1024 * 1024)).toFixed(v >= 10 * 1024 * 1024 ? 0 : 1);
    return `${pageLang() === 'nl' ? s.replace('.', ',') : s} MB`;
  }
  return `${Math.max(1, Math.round(v / 1024))} kB`;
}

// Written into textContent, never innerHTML: `name` is whatever the visitor's
// filesystem hands over, and this is the one place on the page where a string
// the visitor controls reaches the DOM.
function tsSay(text, isError) {
  const box = document.querySelector('[data-ts-msg]');
  if (!box) return;
  box.textContent = text || '';
  box.classList.toggle('is-error', !!isError && !!text);
}

function tsCount() {
  const el = document.querySelector('[data-ts-count]');
  if (!el) return;
  const n = ts.staged.length;
  el.textContent = n ? (pageLang() === 'nl'
    ? `${n} foto${n === 1 ? '' : '’s'} klaar om mee te sturen`
    : `${n} photo${n === 1 ? '' : 's'} ready to send`) : '';
}

function tsSetBatch(b) {
  if (!b) return;
  ts.batch = b;
  const input = ts.form && ts.form.querySelector('input[name="upload_batch"]');
  if (input) input.value = b;
}

function tsRow(file) {
  const list = document.querySelector('[data-ts-list]');
  if (!list) return null;
  const li = document.createElement('li');
  li.className = 'ts-file';
  const name = document.createElement('span');
  name.className = 'ts-file-name';
  name.textContent = file.name;
  const size = document.createElement('span');
  size.className = 'ts-file-size';
  size.textContent = tsBytes(file.size);
  const msg = document.createElement('span');
  msg.className = 'ts-file-msg';
  msg.textContent = t18().tsSending;
  li.append(name, size, msg);
  list.appendChild(li);
  return li;
}

function tsSetRow(row, text, state) {
  if (!row) return;
  const msg = row.querySelector('.ts-file-msg');
  if (msg) msg.textContent = text || '';
  row.classList.remove('is-done', 'is-failed');
  if (state) row.classList.add(state);
}

// A staged file can be taken back off. Without this the only way to undo a
// mis-picked photograph is to reload the page, which also throws away the batch
// and everything else already uploaded into it.
function tsAddRemove(row, key) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ts-file-act';
  b.textContent = t18().tsRemove;
  b.addEventListener('click', () => {
    b.disabled = true;
    fetch(`/api/upload?batch=${encodeURIComponent(ts.batch)}&key=${encodeURIComponent(key)}`,
          { method: 'DELETE' })
      .catch(() => {})
      .finally(() => {
        // The row goes whatever the endpoint said. A DELETE that failed leaves
        // an object in R2 that no order references, which the bucket's own
        // lifecycle rule clears; refusing to remove the row would instead leave
        // the visitor looking at a photograph they have told us twice to drop.
        ts.staged = ts.staged.filter((s) => s.key !== key);
        row.remove();
        tsCount();
        tsSay('', false);
      });
  });
  row.appendChild(b);
}

// {max} is a byte count on `too-large` and a file count on `batch-full`. The
// server's own number wins when it sent one; otherwise it is the cap this build
// was compiled against, which is the same constant /api/upload enforces.
function tsError(code, body) {
  const e = t18().tsErr;
  const text = e[code] || e.generic;
  return tsMax(text, code, body);
}

function tsMax(text, code, body) {
  if (typeof text !== 'string' || text.indexOf('{max}') === -1) return text || '';
  const raw = body && body.max ? Number(body.max) : (code === 'batch-full' ? MAX_BATCH_FILES : MAX_FILE_BYTES);
  return text.split('{max}').join(code === 'batch-full' ? String(raw) : tsBytes(raw));
}

// ── PRE-FLIGHT ───────────────────────────────────────────────────────────────
// The same four checks /api/upload runs, in the same order (upload.js:75–97),
// run before the bytes leave the device. Without this a 40 MB photo climbs all
// the way up a 4G connection only
// to come back as 400 too-large — the visitor pays for the whole upload and
// then gets refused for something that was knowable the instant they picked it.
// typeFor() is /api/upload's own extension table, imported, not a second list.
function tsPreflight(file) {
  if (!typeFor(file.name)) return { code: 'bad-type' };
  if (!file.size) return { code: 'empty' };
  if (file.size > MAX_FILE_BYTES) return { code: 'too-large', max: MAX_FILE_BYTES };
  if (ts.staged.length + ts.pending >= MAX_BATCH_FILES) return { code: 'batch-full', max: MAX_BATCH_FILES };
  return null;
}

// Which failures stop the visitor and which ones stop us.
//
// A wrong file type, a file over the ceiling, an empty file, a full batch: the
// visitor picked those and the visitor can pick again, so the gate keeps
// standing and says which of the four it was.
//
// EVERYTHING ELSE — a dead bucket, a 404, a rate limit, a request that never
// came back — is our failure, and holding the visitor on step 1 for it achieves
// nothing except losing the lead. `unavailable` has always been treated this
// way (the comment below says why); the others were not, which meant a 404 left
// the Next button dead and told the visitor to add a photo they had already
// added. They are all the same case.
const TS_FIXABLE = { 'bad-type': 1, 'too-large': 1, empty: 1, 'batch-full': 1 };

function tsFailed(code, body) {
  if (TS_FIXABLE[code]) {
    ts.blocked = code;
    ts.blockedMax = body && body.max ? body.max : null;
    return;
  }
  // A dead bucket is not this file's problem, it is every file's problem —
  // and, unlike on /start, it must not become the visitor's problem either.
  // A test sample is the top of the funnel; refusing the request because the
  // upload failed would cost the lead to save the photographs, which is
  // backwards. The gate stands down and the copy tells them what happens next.
  ts.off = true;
  tsSay(code === 'unavailable' ? t18().tsErr.unavailable : t18().tsOffNote, false);
}

function tsSend(file) {
  // Refused here, before the request exists. The row still appears and still
  // names the reason — a file that vanishes silently is worse than one that
  // fails visibly.
  const bad = tsPreflight(file);
  if (bad) {
    tsSetRow(tsRow(file), tsError(bad.code, bad), 'is-failed');
    tsFailed(bad.code, bad);
    tsCount();
    return Promise.resolve();
  }

  const row = tsRow(file);
  // A photograph is now on its way, so any earlier complaint about there being
  // none is stale before the request even resolves.
  tsMarkZone(false);
  ts.pending += 1;
  const fd = new FormData();
  fd.append('file', file);
  if (ts.batch) fd.append('batch', ts.batch);

  return fetch('/api/upload', { method: 'POST', body: fd })
    .then((res) => res.json().then((body) => ({ res, body })).catch(() => ({ res, body: null })))
    .then(({ res, body }) => {
      if (res.ok && body && body.ok && body.file) {
        tsSetBatch(body.batch || ts.batch);
        tsSetRow(row, t18().tsDone, 'is-done');
        ts.staged.push({ key: body.file.key, name: body.file.name });
        ts.blocked = '';
        tsAddRemove(row, body.file.key);
        tsSay('', false);
        return;
      }
      const code = (body && body.error) || 'generic';
      tsSetRow(row, tsError(code, body), 'is-failed');
      tsFailed(code, body);
    })
    // A request that never came back is the same case as a 404: nothing the
    // visitor did, and nothing they can do.
    .catch(() => { tsSetRow(row, t18().tsErr.network, 'is-failed'); tsFailed('network', null); })
    .finally(() => { ts.pending = Math.max(0, ts.pending - 1); tsCount(); });
}

// True when the visitor may move on: something was staged, or an upload failed
// in a way they cannot act on and holding them there would achieve nothing.
function tsSatisfied() { return ts.staged.length > 0 || ts.off; }

function tsMarkZone(on) {
  const z = document.querySelector('form[data-wizard] .dropzone');
  if (z) z.classList.toggle('is-error', !!on);
}

// THE GATE THAT MAKES THE ASTERISK HONEST.
//
// The label has said "Upload product photos *" since the page was written, and
// the asterisk was a lie: nothing enforced it. `required` cannot enforce it
// either — for two reasons, one of which has since stopped being true, and the
// distinction matters because the one that expired is the one that used to be
// written here.
//
// EXPIRED. The input used to be `hidden`. `required` on a display:none control
// is worse than useless: Chrome refuses to submit and reports "An invalid form
// control with name='' is not focusable", a dead end with no visible cause.
// That is no longer the situation. The input is visually hidden by
// .ts-file-input (global.css) instead, which keeps it in the focus order and
// lets its own <label class="dropzone" for="ts-upload"> operate it — the same
// change that made the picker reachable by keyboard at all.
//
// STANDING. The form carries `novalidate` (test-sample.astro:125 in both
// languages), so the browser runs no constraint validation on it whatsoever;
// `required` would sit there inert. And the input carries no `name`, so it is
// not in the POST to begin with — the bytes travel out-of-band to /api/upload
// and are joined to the order by the upload_batch id, which is the whole
// reason /api/order refuses to read File entries.
//
// So the requirement has to be asserted in JS, here.
//
// `scope` is the step being left on Next, or the whole form on submit: a step
// that does not contain the input has nothing to say about it, which is what
// keeps this from firing on step 2's Back button or on any future wizard.
// Returns true when the form may proceed. The caller owns revealing/scrolling,
// because only the caller knows which step it is moving away from.
function tsGate(form, scope) {
  if (!(scope || form).querySelector('#ts-upload')) return true;
  if (tsSatisfied()) { tsMarkZone(false); return true; }
  tsSay(tsGateMsg(), true);
  tsMarkZone(true);
  return false;
}

// Why the gate is standing, in the visitor's terms. "Add at least one product
// photo" is only the right sentence when they have not added one; if they added
// one and it bounced for something they can fix, the sentence has to be about
// that instead — the file type, or the size and the ceiling it went over.
function tsGateMsg() {
  const d = t18();
  if (ts.pending > 0) return d.tsWaiting;
  const blocked = ts.blocked && d.tsBlocked[ts.blocked];
  if (blocked) return tsMax(blocked, ts.blocked, ts.blockedMax ? { max: ts.blockedMax } : null);
  return d.tsNeedFile;
}

/*
 * ── DE WEIGERING BIJ EEN TWEEDE PROEFVISUAL ZICHTBAAR MAKEN — 11 AUG 2026 ────
 *
 * functions/api/order.js weigert sinds vandaag een tweede BETAALDE proefvisual op
 * hetzelfde e-mailadres, en stuurt de bezoeker terug naar het formulier met
 * `?error=sample-used`. Zonder deze functie is dat een doodlopende weg: hij komt
 * terug op een formulier dat er precies zo uitziet als voor hij op verzenden
 * drukte, zonder enige aanwijzing waarom er niets is gebeurd — en probeert het
 * dan opnieuw.
 *
 * Het valt op dat `?error=email` daar al sinds de bouw van dit formulier heen
 * werd geschreven en door NIETS werd gelezen. Die wordt hier meteen meegenomen;
 * het is dezelfde regel code en dezelfde doodlopende weg.
 *
 * De tekst staat in de HTML en niet hier: dit bestand is tweetalig noch de plek
 * voor klantteksten (zie de woordenlijst bovenaan — die is er voor de
 * uploadmeldingen, die uit JS moeten komen omdat ze pas tijdens het kiezen van
 * een bestand ontstaan). Hier is de melding er al; hij is alleen nog verborgen.
 *
 * Het adres wordt daarna opgeschoond met replaceState, zodat een verversing of
 * een gedeelde link niet opnieuw een foutmelding toont voor iets wat de bezoeker
 * op dat moment niet aan het doen is.
 */
function initFormRefusal() {
  let code = '';
  try { code = new URL(window.location.href).searchParams.get('error') || ''; } catch { return; }
  if (!code) return;

  const box = document.querySelector(`[data-form-refusal="${code}"]`);
  if (!box) return;

  box.hidden = false;
  /* focus() en niet scrollIntoView(): de melding krijgt tabindex="-1" in de HTML,
     dus dit brengt hem in beeld én vertelt een schermlezer dat hier iets nieuws
     staat. Alleen scrollen doet het eerste wel en het tweede niet. */
  try { box.focus({ preventScroll: false }); } catch { box.scrollIntoView({ block: 'center' }); }

  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('error');
    window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
  } catch {}
}

let tsInputBound = false;
function initTestSampleUpload() {
  const input = document.querySelector('#ts-upload');
  if (!input) { ts.form = null; return; }

  // Per-element, so a ClientRouter navigation back onto this page starts from a
  // clean batch rather than appending to the previous visitor's — the module
  // outlives the DOM, the batch must not.
  if (!input.dataset.tsBound) {
    input.dataset.tsBound = '1';
    ts.batch = ''; ts.pending = 0; ts.staged = []; ts.off = false; ts.blocked = ''; ts.blockedMax = null;
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      // Cleared here, not after the sends resolve: the same File cannot be
      // picked twice in a row otherwise, because `change` does not fire when the
      // value is unchanged.
      input.value = '';
      if (!files.length) return;
      // A fresh pick answers whatever the last one was refused for; the sends
      // below re-raise it if it is still true.
      ts.blocked = '';
      tsSay('', false);
      files.forEach((f) => { tsSend(f); });
    });
  }
  ts.form = input.closest('form');

  // Drag-and-drop, because the dropzone says "or drag photos here" and until now
  // that sentence was decoration: dropping a file on a page with no dragover
  // handler navigates the browser to it, losing the form.
  if (!tsInputBound) {
    tsInputBound = true;
    const zone = () => document.querySelector('form[data-wizard] .dropzone');
    document.addEventListener('dragover', (e) => {
      const z = zone();
      if (!z || !z.contains(e.target)) return;
      e.preventDefault();
      z.classList.add('is-dragover');
    });
    document.addEventListener('dragleave', (e) => {
      const z = zone();
      if (z && z.contains(e.target)) z.classList.remove('is-dragover');
    });
    document.addEventListener('drop', (e) => {
      const z = zone();
      if (!z || !z.contains(e.target)) return;
      e.preventDefault();
      z.classList.remove('is-dragover');
      // Not filtered by a second, shorter type list before it gets here. That
      // list disagreed with /api/upload's (it dropped AVIF, GIF and TIFF, which
      // the endpoint accepts) and it swallowed anything else without a word, so
      // a dropped .txt simply did nothing. tsPreflight() is the one table now,
      // and it says which file it refused and why.
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (!files.length) return;
      ts.blocked = '';
      tsSay('', false);
      files.forEach((f) => { tsSend(f); });
    });
  }
}

let wizardsBound = false;
function initWizards() {
  if (wizardsBound) return;
  wizardsBound = true;

  // `behavior: 'smooth'` in the options object OVERRIDES the CSS
  // scroll-behavior, including the `auto` the reduced-motion block sets — so
  // the global media query that neuters every animation on the site did not
  // touch this one call, and a user who asked for less motion got the page
  // flung several hundred pixels under them on every wizard step. Large
  // involuntary scroll is the exact motion that setting exists to stop; it is
  // worse than the transitions that were already being suppressed, not milder.
  // pipeline.js guards both of its scrolls this way; this one was missed.
  const scrollToForm = (form) => {
    const y = form.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const show2 = (form, n) => {
    form.querySelectorAll('[data-wizard-step]').forEach((s) => {
      s.classList.toggle('hidden-step', Number(s.dataset.wizardStep) !== n);
    });
    const prog = form.querySelector('[data-wizard-progress]');
    // scaleX, not width — see setBar in pipeline.js. The server renders
    // scaleX(.5) inline, so step 1 is already right before this ever runs.
    if (prog) prog.style.transform = `scaleX(${n / 2})`;
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
      // No scroll on refusal: the dropzone and its message are directly above
      // this button, so the visitor is already looking at the answer.
      if (!tsGate(f, cur)) return;
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
    if (bad) { e.preventDefault(); revealFor(form, bad); bad.reportValidity(); bad.focus && bad.focus(); return; }
    // Checked here as well as on Next, and not only because a visitor can reach
    // step 2 while an upload is still in flight: the no-JS path posts straight
    // from step 1 with both steps visible, so Next is not a chokepoint the way
    // it looks like one. The reveal is deliberate — the dropzone lives on step 1
    // and submit is pressed from step 2, so refusing without going back would
    // put the complaint on a screen the visitor cannot see.
    if (!tsGate(form, form)) {
      e.preventDefault();
      const zone = form.querySelector('.dropzone');
      const step = zone && zone.closest('[data-wizard-step]');
      if (step) { show2(form, Number(step.dataset.wizardStep)); scrollToForm(form); }
    }
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
/**
 * Is dit een betaallink van Mollie, en niets anders?
 *
 * WAAROM DIT ERBIJ HOORT. `pay` komt uit de adresbalk, en alles uit de adresbalk
 * is van de bezoeker — of van wie hem een link stuurde. Zonder controle is dit
 * een open doorverwijzing: iemand mailt een klant
 * /thank-you?pay=https://niet-mollie.example en de knop op ONZE bedanktpagina,
 * in onze groene kleur, stuurt hem naar een nepbetaalpagina. Vandaar: https, en
 * het domein moet mollie.com zijn of eronder hangen.
 */
function molliePayUrl(raw) {
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.hostname !== 'mollie.com' && !u.hostname.endsWith('.mollie.com')) return null;
  return u.href;
}

function initThankYou() {
  const box = document.querySelector('#ty-summary');
  if (!box) return;
  const params = new URLSearchParams(location.search);
  const ref = (params.get('ref') || '').trim();
  if (!/^VIS-[A-Z0-9-]{3,}$/i.test(ref)) return;
  const d = t18();
  const pay = molliePayUrl(params.get('pay'));
  /* ── HET KENMERK IS EEN RIJ IN DE SAMENVATTING GEWORDEN — 18 augustus 2026 ──
     Hier stond een compleet kaartje dat dit script uit een string opbouwde, met
     de opmaak in inline stijlattributen. Sinds de herindeling staat de rij AL in
     de HTML (zie ThankYouPage.astro) en hoeft dit script alleen nog het nummer
     in te vullen en de rij zichtbaar te maken.

     Dat is niet alleen korter: opmaak die in een JavaScript-string staat, is
     opmaak die geen enkele stylesheet kent en die bij een paletwijziging
     achterblijft. Nu staat er hier geen enkele kleur meer. */
  const refCel = box.querySelector('[data-ty-ref]');
  if (refCel) refCel.textContent = ref.toUpperCase();
  box.hidden = false;

  /* De betaalknop hoort bij het nummer waar hij bij hoort, dus hij komt in
     dezelfde rij te staan — maar als een echt element en niet als string-html. */
  if (pay) {
    const wrap = document.createElement('p');
    wrap.className = 'ty-pay-cta';
    const note = document.createElement('span');
    note.textContent = d.tyPayNote;
    const knop = document.createElement('a');
    knop.className = 'btn btn-primary';
    knop.href = pay;
    knop.rel = 'noopener';
    knop.textContent = d.tyPayCta;
    wrap.append(note, knop);
    box.append(wrap);
  }

  /* Sinds 11 augustus 2026: kijken of deze bestelling niet zojuist is
     tegengehouden. Zie initCancelled() hieronder voor de wedloop die dit moet
     opvangen. */
  checkCancelled(ref);
}

/*
 * ── DE ANNULERING NA DE BETALING ZICHTBAAR MAKEN — 11 AUGUSTUS 2026 ─────────
 *
 * Een tweede proefvisual wordt herkend aan de bankrekening, en dat kan pas ná de
 * betaling — het IBAN bestaat eerder niet. De bezoeker landt dus op de
 * bedankpagina terwijl zijn bestelling misschien net geannuleerd is, en zonder
 * dit hoort hij dat pas uit een mail, ná een scherm dat hem net bedankt heeft.
 *
 * ── DE WEDLOOP, EN WAAROM ER DRIE POGINGEN ZIJN ────────────────────────────
 *
 * Twee dingen vertrekken tegelijk als er betaald wordt: Mollie stuurt de bezoeker
 * terug naar deze pagina, en Mollie roept onze webhook aan. Wie er als eerste
 * aankomt ligt niet vast. Meestal is de webhook er ruim op tijd, maar bij een
 * trage aanroep of een koude worker is de bezoeker eerder — en dan zegt dit
 * eindpunt "niet geannuleerd" terwijl het antwoord een seconde later anders is.
 *
 * Vandaar drie pogingen over ongeveer zes seconden. Niet meer, want dit is een
 * vangnet en geen bewaking: wie er dan nog doorheen glipt, krijgt de mail, en die
 * had hij toch al gekregen. Een pagina die twintig seconden lang blijft pollen
 * kost meer dan hij oplevert.
 *
 * ── FAALT STIL ────────────────────────────────────────────────────────────
 *
 * Elke fout — geen netwerk, kapot antwoord, eindpunt weg — betekent: niets tonen.
 * Een bezoeker die gewoon besteld heeft mag NOOIT een annuleringsmelding zien
 * omdat er iets omviel; dat is een veel duurdere fout dan de melding missen.
 */
function checkCancelled(ref, attempt = 0) {
  const DELAYS = [0, 2000, 4000];
  if (attempt >= DELAYS.length) return;

  window.setTimeout(() => {
    fetch(`/api/order-status?ref=${encodeURIComponent(ref)}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.cancelled) { checkCancelled(ref, attempt + 1); return; }

        /* ── OP `kind` EN NIET ALLEEN OP `cancelled` — 13 augustus 2026 ────────
           Het blok hieronder zegt letterlijk dat er al een proefvisual naar dit
           bedrijf is gegaan en dat de euro terugkomt. Bij een annulering MET DE
           HAND — een andere reden, een ander verhaal, misschien geen
           terugbetaling — is dat onwaar, en het zou de bezoeker een verkeerde
           uitleg en een verkeerde verwachting geven.

           /api/order-status geeft de met de hand getypte reden met opzet niet
           mee (dat is een interne notitie), dus komt hier alleen het
           machinewoord aan. Precies dat woord opent dit blok en niets anders.

           En dan niet dóórvragen: de bestelling ís geannuleerd, dus het antwoord
           verandert niet meer binnen zes seconden. Er is alleen niets te tonen. */
        if (d.kind !== 'sample-duplicate') return;

        const box = document.querySelector('[data-ty-cancelled]');
        if (!box) return;
        box.hidden = false;

        /* ── DE KOP WISSELT, HIJ WORDT NIET VERDUBBELD — 18 augustus 2026 ────
           De pagina had twee <h1>'s: de bedanktekst en de annuleringskop, met
           altijd precies één zichtbaar. Een validator telt ze allebei, en de
           twee hadden verschillende koptypografie — dus de geannuleerde
           toestand had zichtbaar een andere paginatitel.

           Nu is er één kop, in de balk, en die krijgt hier zijn andere tekst.
           De tekst zelf staat in het component en niet hier: vertalingen horen
           bij de opmaak, niet in een script. */
        const titel = document.querySelector('[data-ty-title]');
        if (titel && titel.dataset.tyTitleCancelled) {
          titel.textContent = titel.dataset.tyTitleCancelled;
        }
        const balk = document.querySelector('[data-ty-bar]');
        if (balk) balk.setAttribute('data-ty-cancelled-state', '');

        /* De rest van de pagina gaat weg. Dit is het enige geval waarin de
           bedanktekst ronduit onwaar is — er wordt niets gemaakt en er komt geen
           levering — en hem laten staan onder een blok dat het tegendeel zegt, is
           verwarrender dan geen bedanktekst. Het referentievak blijft: dat nummer
           heeft hij nodig als hij hierover mailt. */
        document.querySelectorAll('.ty-hide-when-cancelled').forEach((el) => { el.hidden = true; });

        try { box.focus({ preventScroll: false }); } catch { box.scrollIntoView({ block: 'center' }); }
      })
      .catch(() => { /* stil, met opzet — zie de noot hierboven */ });
  }, DELAYS[attempt]);
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
//
// Edge snapping (section 8: "snap to edges"). Position was clamped to 0–100
// but release did nothing, so the slider could rest at 2% or 98% — a two-pixel
// sliver of the other image, which reads as a rendering fault rather than a
// choice. Within SNAP_EDGE of either end the value now travels the rest of the
// way on its own.
const SNAP_EDGE = 6;
// This snap used to run through gsap.to() on a proxy object, on the argument
// that GSAP was "the same bundle, not a new dependency" because motion.js
// shipped it on every page anyway. motion.js is gone — every hook it queried
// was dead — so that argument is gone with it, and keeping the import would
// mean pulling ~70 KB of gsap + ScrollTrigger into all 84 pages to move one
// number for 340ms. Below is that tween written out: same 0.34s, same curve
// (GSAP's power3.out IS 1-(1-t)^4 — it numbers powers from quad), same
// per-frame write path, so aria-valuenow still tracks every frame.
//
// Deliberately NOT a CSS transition on --cmp-pos: the property is rewritten on
// every pointermove during a drag, so a transition would make the divider lag
// the finger for the whole drag, not just the release.
const cmpSnapRaf = new WeakMap();
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
let compareDragBound = false;
function initCompareDrag() {
  if (compareDragBound) return;
  compareDragBound = true;
  let active = null;
  const posOf = (cmp, clientX) => {
    const r = cmp.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  };
  // role="slider" requires aria-valuenow to track the actual value — found
  // missing entirely in the 2026-07-28 audit (task #263). The static markup
  // now ships aria-valuenow="50" to match --cmp-pos's own default; this keeps
  // it in sync for every way the value can change afterwards; a screen reader
  // user tabbing to the knob and pressing an arrow key must hear the value
  // that press actually produced, not the value it shipped with.
  const setValueNow = (cmp, pct) => {
    const knob = cmp.querySelector('.cmp-knob');
    if (knob) knob.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  const write = (cmp, pct) => {
    cmp.style.setProperty('--cmp-pos', pct + '%');
    setValueNow(cmp, pct);
  };
  const setPos = (cmp, clientX) => {
    cmp.classList.add('cmp-drag');
    write(cmp, posOf(cmp, clientX));
  };
  const readPos = (cmp) => {
    const inline = parseFloat(cmp.style.getPropertyValue('--cmp-pos'));
    if (!Number.isNaN(inline)) return inline;
    return parseFloat(getComputedStyle(cmp).getPropertyValue('--cmp-pos')) || 50;
  };
  // The tween carries its own number rather than reading --cmp-pos back per
  // frame: the custom property is registered (@property, syntax "<percentage>"),
  // so reading it back would mean a getComputedStyle parse per frame on an
  // element that is simultaneously repainting a clip-path. One number in JS,
  // one style write per frame instead.
  const stopSnap = (cmp) => {
    const id = cmpSnapRaf.get(cmp);
    if (id) { cancelAnimationFrame(id); cmpSnapRaf.delete(cmp); }
  };
  // `edge` may be forced (keyboard, below); otherwise whichever end is inside
  // the threshold wins. Returns nothing — snapping is a side effect.
  const snapToEdge = (cmp, pct, edge) => {
    let target = null;
    if (edge === 0 || edge === 100) {
      if (Math.abs(pct - edge) <= SNAP_EDGE) target = edge;
    } else if (pct <= SNAP_EDGE) target = 0;
    else if (pct >= 100 - SNAP_EDGE) target = 100;
    if (target === null || pct === target) return;
    stopSnap(cmp);
    // prefers-reduced-motion: the value still snaps, it just doesn't travel.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      write(cmp, target);
      return;
    }
    // overwrite: true — stopSnap() above already cancelled any frame in flight.
    const from = pct;
    const delta = target - from;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 340);
      if (p >= 1) { cmpSnapRaf.delete(cmp); write(cmp, target); return; }
      write(cmp, from + delta * easeOutQuart(p));
      cmpSnapRaf.set(cmp, requestAnimationFrame(step));
    };
    cmpSnapRaf.set(cmp, requestAnimationFrame(step));
  };
  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest('.cmp-divider, .cmp-knob');
    if (!handle) return;
    const cmp = handle.closest('.cmp');
    if (!cmp) return;
    active = cmp;
    stopSnap(cmp); // grabbing mid-snap hands control straight back to the finger
    setPos(cmp, e.clientX);
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!active) return;
    write(active, posOf(active, e.clientX));
    e.preventDefault();
  }, { passive: false });
  // Release is where the snap happens — never mid-drag, which would fight the
  // finger for the last 6% of the track.
  const end = () => {
    if (active) snapToEdge(active, readPos(active));
    active = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  // Keyboard: focus the knob, arrow keys nudge ±5%.
  //
  // The snap is direction-aware here, and only here. Symmetric snapping would
  // trap the keyboard at an edge: sitting at 0 and pressing ArrowRight gives 5,
  // 5 is inside the 6% threshold, and it would be pulled straight back to 0 —
  // the slider would be unmovable by keyboard once it reached either end. So a
  // press only snaps toward the edge it is travelling toward; stepping away
  // from an edge always lands on the plain ±5 value.
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest('.cmp-knob, .cmp-divider');
    if (!handle || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const cmp = handle.closest('.cmp');
    if (!cmp) return;
    cmp.classList.add('cmp-drag');
    stopSnap(cmp);
    const right = e.key === 'ArrowRight';
    const cur = readPos(cmp);
    const pct = Math.max(0, Math.min(100, cur + (right ? 5 : -5)));
    write(cmp, pct);
    snapToEdge(cmp, pct, right ? 100 : 0);
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

// Homepage "drop or single product" tabs (task #268) — a standard WAI-ARIA
// tabs pattern: click or arrow-key between two tt-tab buttons, one tt-panel
// shown via [hidden] at a time. Delegated at document level like the other
// click handlers in this file, so it survives ClientRouter navigation without
// re-querying [data-tier-toggle] on every page load.
let tierToggleBound = false;
function initTierToggle() {
  if (tierToggleBound) return;
  tierToggleBound = true;
  const select = (toggle, tab) => {
    toggle.querySelectorAll('.tt-tab').forEach((btn) => {
      const on = btn === tab;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  };
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const tab = t.closest('.tt-tab');
    if (!tab) return;
    const toggle = tab.closest('[data-tier-toggle]');
    if (!toggle) return;
    select(toggle, tab);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const t = e.target;
    if (!(t instanceof Element) || !t.classList.contains('tt-tab')) return;
    const toggle = t.closest('[data-tier-toggle]');
    if (!toggle) return;
    const tabs = Array.from(toggle.querySelectorAll('.tt-tab'));
    const i = tabs.indexOf(t);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    select(toggle, next);
    next.focus();
    e.preventDefault();
  });
}

export function init() {
  initReveal();
  initSplitLines();
  initCompareDrag();
  initCompareIdle();
  initTracking();
  initSourceAsk();
  initTierToggle();
  initThankYou();
  // Magnetic button-follow intentionally removed — CTAs stay put under the cursor.
  initHeroParallax();
  initHeaderScroll();
  initMobileNav();
  initServicesMenu();
  initConvbar();
  initTestSampleUpload();
  initFormRefusal();
  initWizards();
}

// The reveal safety net is bound FIRST and unconditionally, so reveal-gated
// content can never stay hidden — even if init() throws or doesn't re-run on a
// given ClientRouter navigation. init() itself is guarded so a runtime error in
// any sub-init can't break the rest of the page.
bindRevealNet();
// Signing in to the gate in Layout.astro's <head>. That script hides 203
// elements before first paint on the promise that this file will uncover
// them; this line is the promise being kept, and it is placed immediately
// after bindRevealNet() rather than at the top of the module on purpose — it
// should assert that the reveal net is bound, not merely that the file
// started parsing. If this never runs, the gate times out and the whole site
// renders visible and unanimated, which is the correct way to fail.
window.__vRevealLive = 1;
document.addEventListener('astro:page-load', revealInView);
document.addEventListener('astro:page-load', () => { try { init(); } catch (e) {} });
try { init(); } catch (e) {}
