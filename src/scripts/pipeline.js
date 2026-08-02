// VISUAILS — /start, the five-step order pipeline. Section 10 of the brief.
//
// order → upload → brief → capacity gate → confirm.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE MONEY IS A DISPLAY. IT IS NEVER AN INPUT.
// Step 1 adds up a running total from the ladder in the config blob. That total
// is a preview and nothing else: it is written into the DOM, read back only to
// be shown again on the confirm screen, and never posted. There is no amount
// field on this form, and there must not be one — the invoice is derived
// server-side from `service` and `products`, which are answers, not prices. If
// a future change needs a figure to travel with the order, it belongs in a
// server-side calculation keyed to those two, not in a hidden input a console
// can edit.
//
// What the browser IS trusted with is arithmetic it can be checked on: the
// rungs come from pricing.js by way of the page, so a total shown here and a
// total invoiced later come from the same table.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE RULE THIS FILE EXISTS TO KEEP
// "Never promise a delivery date the capacity gate hasn't cleared."
//
// There is exactly one way a date reaches the screen from here: the client asks
// /api/capacity, the server answers `reason: 'ok'` with windows it has cleared
// against the real calendar, and the client renders those windows and nothing
// else. There is no fallback that guesses, no "roughly two weeks" while the
// request is in flight, and no local arithmetic on today's date anywhere in
// this file. When the calendar cannot be reached, the honest answer is that we
// will confirm the window by email — and the order still goes through undated,
// because /api/order's own gate returns `reason: 'none'` for exactly that case
// and writes the order with no window rather than refusing it.
//
// Section 13 adds the tighter half of the same rule: Tier 0 gets NO named
// delivery date, ever. So the unattended path never calls /api/capacity at all
// — not to save a request, but because there is no code path from an unattended
// order to a rendered date. The queue panel it shows instead is server-rendered
// from TIERS.unattended, so the promise lives in pricing.js where it can be
// changed once.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY ALL THE COPY COMES FROM THE SERVER
// Every string this file writes to the screen is read out of a JSON blob the
// Astro page renders (`[data-pipeline-config]`). None of it is written here.
//
// The alternative — an I18N object in the script, the way interactions.js does
// it — has been quietly wrong for a while: it splits the Dutch copy for one
// page across two files, and one of them is not where a translator looks. It
// also puts strings like "typically 2–4 working days" one careless edit away
// from contradicting pricing.js. Here the page owns the words, both languages
// sit next to each other in one COPY table, and this file owns only behaviour.
//
// The blob is public data — prices already on /pricing and the caps already
// enforced by /api/upload. Nothing in it is a secret and nothing in it is
// authoritative: the server re-derives every price and every limit.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT HAPPENS WITHOUT JAVASCRIPT
// The whole thing is one <form method="post" action="/api/order">. With this
// file absent, all five steps render stacked, the browser posts the form, and
// /api/order 303s to /thank-you exactly as it does for every other form on the
// site. Two things are lost and both are stated on the page rather than
// papered over: reference photos (they go through /api/upload, which needs
// JS) and the capacity gate (no window is picked, so the order is created
// undated and the confirmation says the window follows by email).
//
// `mode=json` is therefore never a hidden input. It is added to a FormData copy
// inside the submit handler, so a no-JS post can never claim to want JSON and
// get a JSON body rendered as a page.
//
// ─────────────────────────────────────────────────────────────────────────────
// DOM CONTRACT — StartPage.astro must supply exactly these hooks.
//
//   form[data-pipeline]                the form itself; also carries the config
//     script[data-pipeline-config]     type="application/json", the blob below
//     input[name=service|tier|products|window_start|window_end|upload_batch]
//     [data-pl-step="1".."5"]          the five step sections
//     [data-pl-rail-item="1".."5"]     progress rail entries
//     [data-pl-next] [data-pl-back]    navigation buttons (type=button)
//     [data-pl-submit]                 the submit button
//
//   step 1  input[name=service][data-pl-kind=complete|catalog|lifestyle]
//                                                the one kind question; the
//                                                VALUE is the server's own
//                                                service name, the data
//                                                attribute is the ladder kind
//           select[name=products]                every count, plus one option
//                                                that is not a number
//           [data-pl-total]                      the net order value, one line
//           [data-pl-total-note] [data-pl-rung]  the rate line and the upsell
//           [data-pl-level="attended"|"unattended"] [data-pl-level-note]
//           [data-pl-outfit] input[name=outfit_count]   task #271f — full outfit
//           [data-pl-bg]                         the background fieldset; hidden
//                                                AND disabled for lifestyle-only
//             input[name=background][data-pl-bg-hex][data-pl-bg-name]
//             input[name=background][data-pl-bg-custom]  the fifth option
//             [data-pl-bg-preview] [data-pl-bg-shown]    the custom swatch
//             [data-pl-bg-panel]                 the custom colour fields
//             [data-pl-bg-color] [data-pl-bg-text]       kept in sync
//             [data-pl-bg-warn] [data-pl-bg-note]
//             input[name=background_hex][data-pl-bg-value]  the resolved value
//
//   step 2  input[type=file][data-pl-file]       NO name attribute, deliberately
//           [data-pl-droplist]                   the file rows land here
//           [data-pl-upload-note="off"]          shown when uploads are down
//
//   step 3  input[name=name|brand|email|phone|website|vat]
//           [data-pl-prefill-note]               task #271e — see bindPrefill()
//           [data-pl-s3-fields]                  the six fields, as one block
//           [data-pl-saved]                      the collapsed summary, hidden
//             [data-pl-saved-list] [data-pl-saved-edit]
//
//   step 5  [data-pl-save-offer]                 the opt-in, hidden
//             input[data-pl-save-check]          NO name attribute, deliberately
//
//   step 4  [data-pl-gate="queue|ok|full|too-large|invalid|unavailable|checking"]
//           [data-pl-windows]                    inside the "ok" panel
//           [data-max]                           filled with the server's number
//
//   step 5  [data-pl-summary]                    review rows land here
//           [data-pl-error]                      submit failures
//           [data-pl-lost]                       the window-was-taken notice
//
// Every one of those is optional at runtime. A missing hook degrades that
// feature; it never throws and never blocks the order.
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = 5;

/** Per-page state. Reset on every init, because ClientRouter reuses the module. */
let form = null;
let cfg = null;
let current = 1;
let batch = '';
let staged = []; // [{ key, name, bytes, row }]
let uploadsOff = false;
let busy = false;
let gateReq = 0; // request generation, so a slow answer cannot overwrite a fast one

// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────

function boot() {
  const el = document.querySelector('form[data-pipeline]');
  if (!el) return;
  // ClientRouter swaps the DOM, so this runs against a fresh <form> every time.
  // The flag guards the case where two page-load events reach the same node.
  if (el.dataset.plBound === '1') return;
  try {
    init(el);
  } catch (e) {
    // A broken enhancement must not take the form with it. Undo the class that
    // hides steps 2–5 and leave a working stacked form behind.
    el.classList.remove('is-live');
    if (typeof console !== 'undefined') console.warn('[pipeline]', e);
  }
}

document.addEventListener('astro:page-load', boot);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

function init(el) {
  form = el;
  cfg = readConfig(el);
  if (!cfg) return; // no config, no enhancement — the stacked form still works

  current = 1;
  batch = '';
  staged = [];
  uploadsOff = false;
  busy = false;
  gateReq = 0;

  form.dataset.plBound = '1';
  // Belt and braces against a double submit landing two orders: the browser's
  // own protection is the disabled button, and this is the one that survives a
  // keyboard Enter arriving while the fetch is in flight.
  form.setAttribute('novalidate', 'novalidate');

  // Remember which controls the page marked required, then take the attribute
  // off. A `required` control inside a display:none step cannot be focused, and
  // reportValidity() on a form containing one fails without telling anyone.
  // syncRequired() puts it back on exactly the controls that are on screen.
  fields().forEach((f) => {
    if (f.required) f.dataset.plReq = '1';
    f.required = false;
  });

  form.classList.add('is-live');

  bindNav();
  bindOrder();
  bindUploads();
  bindGate();
  bindSubmit();
  bindPrefill();

  syncOrder();
  show(1, { focus: false });
}

/** Parse the server-rendered config. Returns null rather than throwing. */
function readConfig(el) {
  const node = el.querySelector('script[data-pipeline-config]');
  if (!node) return null;
  try {
    const parsed = JSON.parse(node.textContent || '{}');
    if (!parsed || typeof parsed !== 'object' || !parsed.copy) return null;
    return parsed;
  } catch {
    return null;
  }
}

function fields() {
  return form ? [...form.querySelectorAll('input, select, textarea')] : [];
}

function q(sel, root) {
  return (root || form).querySelector(sel);
}

function qa(sel, root) {
  return [...(root || form).querySelectorAll(sel)];
}

/**
 * Copy lookup by dotted path. Returns '' for anything missing, never undefined.
 *
 * The '' used to be the end of the story, and that is how c('s3.prefillNote')
 * shipped: task #271e put the string in StartPage.astro's FORM table, which is
 * markup labels, instead of PIPE, which is what gets serialised into the config
 * blob this function reads. The lookup found nothing, returned '', and
 * bindPrefill() wrote the empty string into the note and un-hid it — so every
 * returning customer got a blank italic paragraph and nothing anywhere said
 * why.
 *
 * Two things stop that recurring. StartPage.astro now asserts at BUILD time
 * that every path listed below exists in both languages, so a missing key fails
 * `npm run build` rather than reaching a visitor. And this function says so out
 * loud if one ever gets past that, instead of handing back a silent ''. Callers
 * that can leave an element empty must still check the return — see
 * bindPrefill() — because '' is a legitimate answer for an optional string.
 */
function c(path, vars) {
  const node = lookup(path);
  if (typeof node !== 'string') {
    // eslint-disable-next-line no-console
    console.warn(`pipeline.js: no copy at "${path}" — StartPage.astro's PIPE table is missing this key`);
    return '';
  }
  let out = node;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** The raw node at a dotted path, or undefined. Silent — c() is the loud one. */
function lookup(path) {
  let node = cfg && cfg.copy;
  for (const key of String(path).split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
}

/** Is there a string here? Used where a missing key is an expected branch. */
function hasCopy(path) {
  return typeof lookup(path) === 'string';
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP MACHINE
// ─────────────────────────────────────────────────────────────────────────────

function stepNode(n) {
  return q(`[data-pl-step="${n}"]`);
}

function show(n, opts) {
  const to = Math.min(STEPS, Math.max(1, n));
  current = to;

  for (let i = 1; i <= STEPS; i += 1) {
    const node = stepNode(i);
    if (node) {
      node.classList.toggle('is-current', i === to);
      // aria-hidden as well as the class: the steps are still in the document,
      // and a screen reader walking a five-step form all at once is worse than
      // no enhancement at all.
      node.setAttribute('aria-hidden', i === to ? 'false' : 'true');
    }
    const rail = q(`[data-pl-rail-item="${i}"]`);
    if (rail) {
      rail.classList.toggle('is-current', i === to);
      rail.classList.toggle('is-done', i < to);
      rail.setAttribute('aria-current', i === to ? 'step' : 'false');
    }
  }

  syncRequired();
  if (to === 5) renderSummary();

  const node = stepNode(to);
  if (node && (!opts || opts.focus !== false)) {
    const head = node.querySelector('[data-pl-head]') || node;
    if (head.tabIndex < 0) head.tabIndex = -1;
    try {
      head.focus({ preventScroll: true });
    } catch {
      /* older browsers ignore the option; focus is nice-to-have either way */
    }
    const top = node.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
  }
}

function reduced() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Required is a function of what is on screen, not of which step is current.
 * Step 1's two sub-panels are hidden inside the current step, and a required
 * control in a closed panel is the same unfocusable trap as one in a closed
 * step. offsetParent covers both in one test.
 */
function syncRequired() {
  fields().forEach((f) => {
    f.required = f.dataset.plReq === '1' && isShown(f);
  });
}

function isShown(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function bindNav() {
  qa('[data-pl-next]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', () => {
      if (!validateStep(current)) return;
      const to = current + 1;
      show(to);
      if (to === 4) runGate();
    });
  });
  qa('[data-pl-back]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', () => show(current - 1));
  });
  // The rail goes backwards only. Jumping forward past an unfilled step would
  // let someone reach the confirm screen without a scope, and the summary would
  // have to invent what they were confirming.
  qa('[data-pl-rail-item]').forEach((li) => {
    const n = Number(li.dataset.plRailItem);
    li.addEventListener('click', () => {
      if (Number.isInteger(n) && n < current) show(n);
    });
  });
}

/** Native validation, scoped to what the client can actually see and fix. */
function validateStep(n) {
  const node = stepNode(n);
  if (!node) return true;
  syncRequired();
  const bad = qa('input, select, textarea', node).find((f) => isShown(f) && !f.checkValidity());
  if (!bad) return true;
  bad.reportValidity();
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 · THE ORDER
//
// One question about the work and one about the count, and everything else on
// this step is derived from those two: the rate, the total, whether another
// rung is within reach, and which service level the order earns.
//
// THE SERVICE LEVEL IS DERIVED, NOT ASKED. It used to be the first question on
// the page — a "door" the visitor picked before they knew what they wanted —
// and pricing.js's section 0 says why that had to go: two independent axes
// stacked on one price list. tierFor() lives in pricing.js and its threshold
// reaches this file in the config blob, so the comparison is re-implemented
// here but the number never is.
//
// Section 13 forbids styling Tier 0 as the lesser option; the CSS holds up that
// half. This half is the part that is easy to get wrong in behaviour rather
// than in paint: every count reaches the same five steps, the same upload, the
// same brief and the same submit. There is no second flow.
// ─────────────────────────────────────────────────────────────────────────────

function bindOrder() {
  qa('input[name="service"]').forEach((r) => {
    r.addEventListener('change', syncOrder);
  });
  const count = q('select[name="products"]');
  if (count) count.addEventListener('change', syncOrder);
  // Task #271f.
  const outfit = q('select[name="outfit_count"]');
  if (outfit) outfit.addEventListener('change', syncTotal);
  bindBackground();
}

/**
 * The ladder kind for the checked option — 'complete' | 'catalog' | 'lifestyle'.
 *
 * Read off the radio's data attribute rather than mapped from its value. The
 * value is the wire format (`drop` is what /api/order's ORDER_SERVICES and the
 * D1 `service` column call a catalog set plus a lifestyle carousel), the data
 * attribute is what pricing.js calls it, and a lookup table in this file would
 * be a third place that has to agree with both.
 */
function kindOf() {
  const r = q('input[name="service"]:checked');
  const kind = r ? r.dataset.plKind : '';
  return kind && cfg.ladder && cfg.ladder[kind] ? kind : '';
}

/** The chosen count, or NaN — "more than N" is deliberately not a number. */
function productCount() {
  const select = q('select[name="products"]');
  return Number.parseInt(select ? select.value : '', 10);
}

function syncOrder() {
  const kind = kindOf();
  const n = productCount();

  // `tier` is the one field on this step the server reads that the visitor
  // does not answer. It follows the count — tierFor() in pricing.js — and the
  // "more than one window holds" option is above the threshold by definition,
  // so it earns the reserved window too even though the gate cannot date it.
  const select = q('select[name="products"]');
  const chosen = select ? select.value : '';
  const attended = Number.isInteger(n)
    ? n >= Number(cfg.windowThreshold)
    : !!chosen; // the escape hatch: more than one window holds is more than the threshold
  setHidden('tier', attended ? 'attended' : 'unattended');

  syncOutfit(kind);
  syncBackground(kind);
  syncTotal();
  syncLevel(attended, chosen);
  syncRequired();
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 · THE BACKGROUND
//
// Lucas, August 2026: a customer ordering catalog images picks the ground their
// products sit on, and we recommend a light one — because a brand that already
// has product photos has a background already, and new products have to look
// like they belong beside the old ones. src/data/backgrounds.js holds the four
// values, the reasoning, and every word this section writes to the screen.
//
// THIS SECTION NEVER REFUSES A COLOUR. A custom value darker than the data
// module's threshold gets a sentence saying what that costs — no marketplace
// main image, no shadow under the product — and then the order carries it.
// `warn` is phrased as a consequence and this code treats it as one: it is
// shown, it is not a validation state, and nothing here can block a submit.
//
// SCOPE. A lifestyle carousel is a styled scene, not a product on a ground, so
// the whole fieldset goes for the lifestyle-only answer. It is hidden AND
// disabled, and the second half is the one that matters: `hidden` is paint, and
// a hidden field still submits — a lifestyle order would otherwise arrive
// carrying a background nobody chose.
// ─────────────────────────────────────────────────────────────────────────────

function bindBackground() {
  qa('input[name="background"]').forEach((r) => {
    r.addEventListener('change', () => syncBackground(kindOf()));
  });

  const color = q('[data-pl-bg-color]');
  const text = q('[data-pl-bg-text]');

  // The two fields are one answer in two shapes: a customer who knows their hex
  // pastes it, one who does not picks it, and neither should have to discover
  // the other. Typing or picking also SELECTS the custom option — reaching for
  // a colour is the same act as choosing to use one, and making someone click
  // the radio afterwards is a form asking them to confirm what they just did.
  if (color) {
    color.addEventListener('input', () => {
      if (text) text.value = normalizeHex(color.value) || color.value;
      pickCustom();
    });
  }
  if (text) {
    text.addEventListener('input', () => {
      const hex = normalizeHex(text.value);
      if (hex && color) color.value = hex;
      pickCustom();
    });
  }
}

/** Check the custom radio (if it is not already) and re-render from it. */
function pickCustom() {
  const custom = q('input[name="background"][data-pl-bg-custom]');
  if (custom && !custom.checked) custom.checked = true;
  syncBackground(kindOf());
}

/**
 * A 6-digit uppercase hex, or ''.
 *
 * Three digits are expanded rather than refused: #EEE is a hex a brand's own
 * style guide will happily be written in, and luminance() in backgrounds.js
 * only reads six. Everything else — a colour name, half a paste, an empty
 * field — comes back '' and is simply not an answer yet.
 */
function normalizeHex(v) {
  const s = String(v || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.split('').map((ch) => ch + ch).join('').toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toUpperCase()}`;
  return '';
}

/**
 * Mirrors luminance() + isLight() in src/data/backgrounds.js — WCAG's relative
 * luminance, so "dark" means the same thing here as it does in the module that
 * defines it.
 *
 * The FORMULA is duplicated, the THRESHOLD is not: cfg.bg.lightThreshold is
 * LIGHT_THRESHOLD itself, serialised by the page, the same arrangement the
 * ladder uses two hundred lines up. A number typed here could drift; a formula
 * that is a published standard cannot.
 */
function isLight(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return l >= Number(cfg.bg && cfg.bg.lightThreshold);
}

/** Catalog work has a background. A lifestyle carousel is a scene. */
function bgApplies(kind) {
  return kind === 'complete' || kind === 'catalog';
}

function syncBackground(kind) {
  const field = q('[data-pl-bg]');
  if (!field) return;

  const applies = bgApplies(kind);
  field.hidden = !applies;
  field.disabled = !applies; // a <fieldset> takes its whole subtree out of the post
  if (!applies) {
    setHidden('background_hex', '');
    return;
  }

  const checked = q('input[name="background"]:checked');
  const custom = !!(checked && checked.dataset.plBgCustom !== undefined);
  const typed = normalizeHex(q('[data-pl-bg-text]') ? q('[data-pl-bg-text]').value : '');

  // The custom fields, revealed by the option that uses them. Disabled as well
  // as hidden for the same reason the fieldset is: an abandoned hex typed
  // before the customer settled on off-white must not travel with the order.
  const panel = q('[data-pl-bg-panel]');
  if (panel) {
    panel.hidden = !custom;
    const text = q('[data-pl-bg-text]');
    if (text) text.disabled = !custom;
  }

  // The fifth swatch shows the colour it stands for, at the same size as the
  // four beside it, so the comparison the picker exists for is possible.
  const preview = q('[data-pl-bg-preview]');
  if (preview) {
    preview.style.setProperty('--swatch', typed || '');
    preview.classList.toggle('is-empty', !typed);
  }
  setText('[data-pl-bg-shown]', custom ? typed : '');

  // One note, for the option in hand. c() returns '' for a key that is not
  // there, and an id with no note is a data change rather than a broken page,
  // so the line simply empties.
  const id = checked ? checked.value : '';
  setText('[data-pl-bg-note]', id ? c(`bg.note.${id}`) : '');

  // Information, not a block. Shown only for a custom colour that is actually
  // dark — isLight() answers null for "not a colour yet", which is not the same
  // as light and must not warn.
  const warn = q('[data-pl-bg-warn]');
  if (warn) warn.hidden = !(custom && typed && isLight(typed) === false);

  // THE RESOLVED VALUE, which is the whole point: the studio reads one field
  // and never has to look an id up. A custom option with nothing typed in it
  // yet resolves to nothing rather than to a guess — `background` still says
  // `custom`, which is true, and the hex follows when there is one.
  const hex = custom ? typed : (checked && checked.dataset.plBgHex) || '';
  setHidden('background_hex', hex);
}

/**
 * Task #271f — Single Product/Full outfit. Every kind on the ladder has a rate
 * to attach the surcharge to, so this field no longer appears and disappears;
 * what is still narrowed is its option list. An outfit count can never exceed
 * MAX_OUTFIT_PRODUCTS, and it can never exceed the number of products actually
 * being ordered — the surcharge is per product styled as an outfit, so it
 * cannot outnumber the products.
 */
function syncOutfit(kind) {
  const field = q('[data-pl-outfit]');
  const select = q('select[name="outfit_count"]');
  if (!field || !select) return;

  // Nothing chosen at all (which the browser prevents, but a stale form
  // restored by the back button does not) leaves nothing to surcharge.
  const applies = !!kind;
  field.hidden = !applies;
  if (!applies) {
    select.value = '0';
    return;
  }

  const n = productCount();
  const cap = Number.isInteger(n) ? Math.min(Number(cfg.maxOutfit), n) : Number(cfg.maxOutfit);

  let firstAllowed = null;
  [...select.options].forEach((o) => {
    const v = Number.parseInt(o.value, 10);
    const allowed = Number.isInteger(v) && v <= cap;
    o.hidden = !allowed;
    o.disabled = !allowed;
    if (allowed && firstAllowed === null) firstAllowed = o.value;
  });

  const chosen = select.options[select.selectedIndex];
  if (!chosen || chosen.disabled) select.value = firstAllowed === null ? '0' : firstAllowed;
}

/** How many products this order marks as a full outfit. Never negative, never
 * unparseable — a select with a bad value falls back to 0 ("single product"),
 * the same direction every other count on this page fails safe in. */
function outfitCount() {
  const select = q('select[name="outfit_count"]');
  const n = select ? Number.parseInt(select.value, 10) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

// ── THE LADDER, IN THE BROWSER ───────────────────────────────────────────────
// Three functions that mirror ladderRate(), ladderTotal() and quote() in
// src/data/pricing.js. They are mirrored rather than imported because this file
// runs in a browser and that one is a build-time module; what stops them
// drifting is that the RUNGS are not copied — cfg.ladder is pricing.js's own
// LADDER, serialised by the page. No euro figure is written down in this file,
// which is the same rule the rest of the site keeps.

/** The rate for a kind at a count, or null if the ladder cannot cover it. */
function rateFor(kind, n) {
  const rungs = (cfg.ladder && cfg.ladder[kind]) || null;
  if (!rungs || !Number.isInteger(n) || n < 1) return null;
  const rung = rungs.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  return rung ? rung[2] : null;
}

/** The rung above the one this count sits on, or null at the top. */
function nextRung(kind, n) {
  const rungs = (cfg.ladder && cfg.ladder[kind]) || null;
  if (!rungs || !Number.isInteger(n) || n < 1) return null;
  const i = rungs.findIndex(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  const next = i >= 0 && i < rungs.length - 1 ? rungs[i + 1] : null;
  if (!next) return null;
  // The rung has to be REACHABLE. There is no point telling someone that
  // thirty-five products cost less each when the form stops at what one window
  // holds — that is an upsell to a conversation they cannot have on this page.
  if (Number(cfg.maxProducts) > 0 && next[0] > Number(cfg.maxProducts)) return null;
  return { at: next[0], rate: next[2], addProducts: Math.max(0, next[0] - n) };
}

/**
 * The net order value for a count of a kind, plus the surcharge.
 *
 * Mirrors quote() in pricing.js, rounding the same way at the same points.
 * Every figure in pricing.js is NET, including the outfit surcharge.
 *
 * NET AND NOTHING ELSE. This used to return vat and gross as well, computed at
 * the Dutch rate, and both were printed. VAT is charged at the rate of the
 * CUSTOMER's country — so a German brand read a 21% line and a gross total that
 * would never appear on their invoice. The rows are gone from both the running
 * total and the confirm screen; vatNote() on step 1 says once how VAT is
 * actually handled, and it says it in the reader's language.
 *
 * The first-order discount is deliberately NOT applied here: whether a brand
 * has ordered before is not something this form knows, and a total that guessed
 * would be wrong for whichever way it guessed. The page says in words that it
 * is applied on the invoice.
 */
function quoteFor(kind, n, outfits) {
  const rate = rateFor(kind, n);
  if (rate === null) return null;
  return { rate, net: round2(n * rate + outfits * Number(cfg.outfitSurcharge || 0)) };
}

/**
 * The running total: one figure, and the sentence that explains it.
 *
 * THE LABEL CARRIES THE SIDE OF VAT. BRIEF-14's rule is that no price is
 * printed without saying which side of VAT it is on; the page's own label does
 * that (vatLabel('excl')), which is why one honest row is enough and a second
 * row at somebody else's rate would be worse than none.
 *
 * NOTHING HERE IS AUTHORITATIVE. See the note at the top of this file: this is
 * a preview, the invoice is derived server-side, and no amount is ever posted.
 */
function syncTotal() {
  const kind = kindOf();
  const n = productCount();
  const outfits = outfitCount();
  const quote = kind ? quoteFor(kind, n, outfits) : null;

  const dash = c('total.onRequest');
  // NET, not gross. The gross figure would be the Dutch 21% shown to a buyer
  // who is charged their own country's rate — see vatNote() in pricing.js.
  setText('[data-pl-total]', quote ? euro(quote.net) : dash);

  let noteText = '';
  if (quote) {
    noteText = c('total.each', { rate: euro(quote.rate), n });
    // Task #271f — additive, on top of the rate line. Never on its own: a
    // surcharge with no base price to attach to is meaningless.
    if (outfits > 0) noteText += c('total.outfit', { price: euro(cfg.outfitSurcharge), n: outfits });
  } else if (kind && !Number.isInteger(n) && q('select[name="products"]')?.value) {
    // The escape hatch. Not a failure to price — a count this form is not
    // willing to guess at, which the gate has its own panel for.
    noteText = c('total.more');
  } else {
    noteText = c('total.quote');
  }
  setText('[data-pl-total-note]', noteText);

  // THE LADDER'S OWN UPSELL, and it has to be honest: both totals are computed
  // from the ladder rather than estimated, so a client with a calculator finds
  // exactly the two numbers this sentence names. Net on both sides, and the
  // copy says so — comparing a net figure against a gross one would understate
  // the saving by 21% and be wrong in the client's favour, which is still wrong.
  const rung = q('[data-pl-rung]');
  if (rung) {
    const next = kind && quote ? nextRung(kind, n) : null;
    if (next && next.addProducts > 0) {
      const then = quoteFor(kind, next.at, Math.min(outfits, next.at));
      // `now` is the CURRENT RATE, not the current total. The sentence used to
      // read "{then} instead of {now}" with two totals in it, which put the
      // larger number on the "instead of" side — more products for more money,
      // phrased as if it were a saving. What actually falls is the per-product
      // rate, so that is what the two figures compare, and the totals are
      // stated as what they are: this many products for this much.
      rung.textContent = c(next.addProducts === 1 ? 'rung.one' : 'rung.many', {
        add: next.addProducts,
        rate: euro(next.rate),
        then: euro(then.net),
        now: euro(quote.rate),
        count: String(next.at),
      });
      rung.hidden = false;
    } else {
      rung.textContent = '';
      rung.hidden = true;
    }
  }
}

/**
 * Which service level this count earns, marked on the table and said in words.
 *
 * `chosen` is the raw select value: with nothing picked at all there is no
 * count to earn anything, and marking a column would be a claim about an order
 * that does not exist yet.
 */
function syncLevel(attended, chosen) {
  const tier = attended ? 'attended' : 'unattended';
  qa('[data-pl-level]').forEach((col) => {
    col.classList.toggle('is-current', !!chosen && col.dataset.plLevel === tier);
  });
  setText('[data-pl-level-note]', chosen ? c(`level.${tier}`) : '');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 · UPLOAD
//
// One file per request, over XMLHttpRequest rather than fetch, for the reason
// /api/upload's own header gives: the case that matters is a phone on 4G with
// twelve product photographs, and fetch has no upload-progress event. A bar
// that does not move is indistinguishable from a request that has died.
// ─────────────────────────────────────────────────────────────────────────────

function bindUploads() {
  const input = q('[data-pl-file]');
  const list = q('[data-pl-droplist]');
  if (!input || !list) return;

  input.addEventListener('change', () => {
    const files = [...(input.files || [])];
    input.value = ''; // so re-picking the same file fires change again
    queue(files);
  });

  // Drag and drop onto the whole step, not just the dashed box — the box is
  // where people aim, the step is where they let go.
  const zone = q('[data-pl-step="2"]');
  if (!zone) return;
  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      zone.classList.add('is-dragging');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      if (ev === 'drop') e.preventDefault();
      if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
      zone.classList.remove('is-dragging');
    })
  );
  zone.addEventListener('drop', (e) => {
    const files = [...((e.dataTransfer && e.dataTransfer.files) || [])];
    if (files.length) queue(files);
  });
}

let chain = Promise.resolve();

// ── PRE-FLIGHT ───────────────────────────────────────────────────────────────
// The caps were in the config blob from the day it was written and nothing read
// them except the error-message interpolation — so the browser accepted every
// file, and a 40 MB HEIC climbed the whole way up a phone connection before
// /api/upload answered 400 too-large. The visitor paid for that upload in time
// and in data to learn something that was knowable the moment they picked it.
//
// cfg.maxFileBytes / cfg.maxBatchFiles / cfg.uploadExt all come from
// src/lib/uploads.js by way of StartPage.astro, which is the same module
// /api/upload enforces with — so this refuses exactly what the endpoint
// refuses, and cannot drift from it without the page config changing too.
// Nothing here is authoritative: the server re-checks all three.

/** Lowercase extension, or ''. Mirrors extensionOf() in src/lib/uploads.js. */
function extOf(name) {
  const s = String(name || '');
  const i = s.lastIndexOf('.');
  if (i <= 0 || i === s.length - 1) return '';
  return s.slice(i + 1).toLowerCase();
}

/**
 * Why this file cannot be sent, or null.
 *
 * `queued` is how many files this same drop has already accepted, so a drop of
 * 200 files refuses the 81st onwards rather than sending all of them and
 * letting the server decide one by one.
 */
function preflight(file, queued) {
  const exts = Array.isArray(cfg.uploadExt) ? cfg.uploadExt : [];
  if (exts.length && exts.indexOf(extOf(file.name)) === -1) return { code: 'bad-type' };
  if (!file.size) return { code: 'empty' };
  if (Number(cfg.maxFileBytes) > 0 && file.size > Number(cfg.maxFileBytes)) {
    return { code: 'too-large', max: Number(cfg.maxFileBytes) };
  }
  if (Number(cfg.maxBatchFiles) > 0 && staged.length + queued >= Number(cfg.maxBatchFiles)) {
    return { code: 'batch-full', max: Number(cfg.maxBatchFiles) };
  }
  return null;
}

function queue(files) {
  if (!files.length || uploadsOff) return;
  let queued = 0;
  files.forEach((file) => {
    const row = addRow(file);
    // The row is added either way. A file that disappears without a word is
    // worse than one that visibly failed, and this is the only place the reason
    // can be said.
    const bad = preflight(file, queued);
    if (bad) {
      setBar(row, 0);
      setMsg(row, uploadError(bad.code, bad), 'is-failed');
      return;
    }
    queued += 1;
    chain = chain.then(() => sendOne(file, row)).catch(() => {});
  });
}

function addRow(file) {
  const list = q('[data-pl-droplist]');
  const row = document.createElement('li');
  row.className = 'pl-file';
  row.innerHTML =
    '<span class="pl-file-name"></span>' +
    '<span class="pl-file-size"></span>' +
    '<span class="pl-file-bar"><i></i></span>' +
    '<span class="pl-file-msg" aria-live="polite"></span>';
  // textContent, never innerHTML — the filename is client-supplied and this row
  // is the one place it reaches the DOM before the server has flattened it.
  row.querySelector('.pl-file-name').textContent = file.name;
  row.querySelector('.pl-file-size').textContent = bytes(file.size);
  list.appendChild(row);
  return row;
}

// scaleX rather than width. Width relayouts the whole row on every progress
// event — and there is one per chunk, per file, in parallel — where a transform
// is composited. The bar is an empty <i> with a background, so the two are
// pixel-identical. DESIGN.md bans animating layout properties; this was one.
function setBar(row, pct) {
  const bar = row.querySelector('.pl-file-bar > i');
  if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`;
}

function setMsg(row, text, state) {
  const msg = row.querySelector('.pl-file-msg');
  if (msg) msg.textContent = text || '';
  row.classList.remove('is-done', 'is-failed');
  if (state) row.classList.add(state);
}

function sendOne(file, row) {
  return new Promise((resolve) => {
    if (uploadsOff) {
      setMsg(row, c('upload.err.unavailable'), 'is-failed');
      return resolve();
    }
    const fd = new FormData();
    fd.append('file', file);
    if (batch) fd.append('batch', batch);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.responseType = 'text';

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setBar(row, (e.loaded / e.total) * 100);
    });

    xhr.addEventListener('error', () => {
      setBar(row, 0);
      setMsg(row, c('upload.err.network'), 'is-failed');
      addRetry(row, file);
      resolve();
    });
    xhr.addEventListener('abort', () => resolve());

    xhr.addEventListener('load', () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body && body.ok) {
        batch = body.batch || batch;
        setHidden('upload_batch', batch);
        setBar(row, 100);
        setMsg(row, c('upload.done'), 'is-done');
        staged.push({ key: body.file.key, name: body.file.name, bytes: body.file.bytes, row });
        addRemove(row, body.file.key);
        renderCount();
        return resolve();
      }

      const code = (body && body.error) || 'generic';
      setBar(row, 0);
      setMsg(row, uploadError(code, body), 'is-failed');

      // A dead bucket is not this file's problem, it is every file's problem.
      // Say so once, stop the queue, and let the order carry on without photos.
      if (code === 'unavailable') {
        uploadsOff = true;
        const off = q('[data-pl-upload-note="off"]');
        if (off) off.hidden = false;
      } else if (code !== 'bad-type' && code !== 'too-large' && code !== 'empty' && code !== 'batch-full') {
        addRetry(row, file);
      }
      resolve();
    });

    setMsg(row, c('upload.sending'), null);
    xhr.send(fd);
  });
}

function uploadError(code, body) {
  if (code === 'too-large') return c('upload.err.too-large', { max: bytes(Number((body && body.max) || cfg.maxFileBytes)) });
  if (code === 'batch-full') return c('upload.err.batch-full', { max: Number((body && body.max) || cfg.maxBatchFiles) });
  if (code === 'rate') return c('upload.err.rate');
  // hasCopy, not `c(...) || c('upload.err.generic')`: a code the server invents
  // tomorrow is an expected miss here, not a broken copy table, and it must not
  // spend a console warning to fall back to the sentence that already covers it.
  return hasCopy(`upload.err.${code}`) ? c(`upload.err.${code}`) : c('upload.err.generic');
}

function addRetry(row, file) {
  if (row.querySelector('[data-pl-retry]')) return;
  const b = button(c('upload.retry'), 'pl-file-act');
  b.dataset.plRetry = '1';
  b.addEventListener('click', () => {
    b.remove();
    setMsg(row, '', null);
    chain = chain.then(() => sendOne(file, row)).catch(() => {});
  });
  row.appendChild(b);
}

function addRemove(row, key) {
  const b = button(c('upload.remove'), 'pl-file-act');
  b.addEventListener('click', () => {
    b.disabled = true;
    const url = `/api/upload?batch=${encodeURIComponent(batch)}&key=${encodeURIComponent(key)}`;
    fetch(url, { method: 'DELETE' })
      .catch(() => null)
      .then(() => {
        // The row goes whatever the server said. If the DELETE failed the object
        // is orphaned in the staging prefix and the lifecycle rule collects it;
        // what must not happen is a file the client removed still arriving with
        // their order, and that is decided by `staged`, not by R2.
        staged = staged.filter((s) => s.key !== key);
        row.remove();
        renderCount();
      });
  });
  row.appendChild(b);
}

function renderCount() {
  const out = q('[data-pl-filecount]');
  if (out) out.textContent = staged.length ? c('upload.count', { n: staged.length, max: cfg.maxBatchFiles }) : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 · PREFILL — task #271e, 2026-07-29
//
// schema.sql's own header, written the day the customers table was designed,
// says what this is: "the account then prefills the contact + VAT fields into
// order forms." functions/api/order.js has upserted that table on every order
// since Phase 1; nothing ever read it back until now, so a returning,
// signed-in brand still retyped its own name and VAT number every time —
// Lucas's own words for this, verbatim: information that should be
// unnecessary once you're logged in.
//
// Why this is client-side JS and not server-rendered, unlike admin.js's and
// account.js's own pages: /start is output:'static' (wrangler.toml's own
// comment), built once and served from disk, not a per-request Pages
// Function — there is no request to read a cookie from at render time. A
// fetch is the only place left to do this.
//
// GET /account/me (account.js) answers with the signed-in customer's known
// fields, or 401 if no one is signed in — see that file for why a GET needs
// no Origin check (nothing here changes state) and why the account session
// cookie reaches this call from a page that isn't /account/*: cookies attach
// to the REQUEST's own path against the cookie's Path=/account, not to
// whichever page's script sent the fetch.
//
// Every field stays a normal, editable <input> — nothing here is locked or
// read-only, and nothing overwrites a field that already has a value (typed
// by hand, kept from a back-navigation, or filled by the browser's own
// autofill before this fetch resolved). This is a head start, not a form the
// visitor no longer controls.
//
// ─────────────────────────────────────────────────────────────────────────────
// AUGUST 2026 — SKIPPING THE STEP, NOT JUST FILLING IT IN
//
// Lucas: "waarna hij zijn gegevens kan opslaan voor een volgende bestelling en
// veel stappen over kan slaan." Prefilling was half of that and it shipped in
// #271e. This is the other half: a customer who explicitly SAVED their details
// (customers.details_saved_at — see src/lib/account.js) does not have six
// filled boxes to scroll past, they have one line saying which details are
// being used and a button to change them for this order.
//
// THE OPT-IN IS THE WHOLE DESIGN, and `me.saved` is where it lives. Every
// customer with an order has contact fields on file, because /api/order put
// them there; nobody chose that. So:
//
//   · saved === false → exactly the behaviour that has shipped since #271e.
//     Fields prefilled, all visible, note above them. Nothing collapses.
//   · saved === true  → the brief step collapses into the summary.
//
// A 401, a network failure, an empty response or JS being off all leave this
// form precisely as it is built. There is no state of this code that removes
// something the visitor has not first asked us to remember.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The six text inputs a saved record fills, named explicitly rather than
 * derived from the response's own keys.
 *
 * It USED to iterate Object.entries(me) and match each key to [name=key],
 * which was fine while the response held six strings and became a live hazard
 * the moment it held more: /account/me now also answers `background`, and step
 * 1 has an input[name="background"] — a radio. Assigning to a radio's .value
 * does not select it, it rewrites what that button MEANS, silently turning the
 * white swatch into a button that posts the customer's saved id. A whitelist
 * cannot do that, whatever the endpoint grows next.
 */
const PREFILL_FIELDS = ['name', 'brand', 'email', 'phone', 'website', 'vat'];

/** The three the form cannot go without — nothing collapses unless all three are filled. */
const REQUIRED_DETAILS = ['name', 'brand', 'email'];

function bindPrefill() {
  accountMe()
    .then((me) => {
      if (!me || !form) return;
      applyAccount(me);
    })
    .catch(() => {}); // no account, offline, or /account/me unreachable — the form is already fine empty
}

/**
 * Who is signed in, asked once per page load.
 *
 * Layout.astro's chrome needs the same answer on every page and gets it first;
 * window.visAccount() is its memoised promise, so on /start this call joins a
 * request already in flight rather than making a second one. The fallback path
 * exists because this module must not depend on a script in another file
 * having run — /start is the one page that would break, and it would break
 * silently.
 */
function accountMe() {
  if (typeof window.visAccount === 'function') return window.visAccount();
  return fetch('/account/me', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((me) => (me && me.email ? me : null));
}

function applyAccount(me) {
  const filled = PREFILL_FIELDS.map((key) => {
    const value = me[key];
    if (typeof value !== 'string' || !value) return null;
    const input = q(`input[name="${key}"]`);
    if (!input || input.value) return null; // never overwrite
    input.value = value;
    return key;
  }).filter(Boolean);

  applySavedBackground(me);

  // The collapse needs the fields it hides to actually be filled. A saved
  // record missing a name is a saved record that cannot answer step 3, and
  // hiding an empty required field behind a summary is how a form gets stuck
  // on a validation error pointing at a control nobody can see.
  const complete = REQUIRED_DETAILS.every((k) => {
    const input = q(`input[name="${k}"]`);
    return input && input.value.trim();
  });

  // The summary already says which details are being used, so the note that
  // says the same thing in a sentence would be saying it twice. It is the
  // fallback, not a companion — including when collapseBrief() declines
  // because the page has no summary hooks.
  const collapsed = !!(me.saved && complete && collapseBrief(me));

  if (!collapsed && filled.length) {
    // The note names what happened, not just who's signed in — a signed-in
    // account with nothing on file yet (a first order) gets no note at
    // all, because nothing on the visible form actually changed.
    // Un-hidden only once there is something to read. The note ships `hidden`
    // and empty, and the copy lookup can legitimately come back empty — that
    // is what shipped an empty italic paragraph to every returning customer
    // for a month. An element with no content stays hidden; c() has already
    // said so in the console.
    const note = q('[data-pl-prefill-note]');
    if (note) {
      const text = c('s3.prefillNote', { email: me.email || '' });
      if (text) {
        note.textContent = text;
        note.hidden = false;
      }
    }
  }

  // Offered to a signed-in customer with nothing stored, and to nobody else:
  // someone who already saved has nothing to opt into, and someone signed out
  // has no account to save to. It ships hidden and unchecked and is never
  // pre-ticked — see bindSaveOffer().
  if (!me.saved) bindSaveOffer();
}

/**
 * The saved default background, applied to step 1's picker.
 *
 * ONLY OVER THE BUILT-IN DEFAULT. `defaultChecked` is true for exactly the one
 * radio the page shipped `checked` (backgrounds.js's DEFAULT_ID). If anything
 * else is selected, the visitor or the browser's back button put it there and
 * it outranks a stored preference — same rule the text fields keep, expressed
 * the only way a radio group can express it.
 */
function applySavedBackground(me) {
  const id = typeof me.background === 'string' ? me.background : '';
  if (!id) return;

  const checked = q('input[name="background"]:checked');
  if (checked && !checked.defaultChecked) return;

  const target = qa('input[name="background"]').find((r) => r.value === id);
  if (!target) return; // a colour that left backgrounds.js — the picker's own default stands

  target.checked = true;

  // The custom option carries its value in two fields rather than in the radio,
  // so restoring it means restoring those too — otherwise the order arrives
  // saying 'custom' with no colour, which is exactly the "resolves to nothing
  // rather than to a guess" case syncBackground() describes.
  const hex = normalizeHex(me.backgroundHex);
  if (target.dataset.plBgCustom !== undefined && hex) {
    const text = q('[data-pl-bg-text]');
    const color = q('[data-pl-bg-color]');
    if (text) text.value = hex;
    if (color) color.value = hex;
  }

  syncBackground(kindOf());
}

/**
 * Step 3, collapsed. Returns false if the page has no summary hooks, in which
 * case the caller falls back to the plain prefill note — every hook in this
 * file is optional at runtime and this one is no exception.
 *
 * The fields are hidden, NOT removed and NOT disabled: a hidden input still
 * posts, so the order carries the same six answers it always did, and
 * syncRequired() already skips anything off screen (isShown()), so the
 * required attributes on name/brand/email cannot trap a submit behind a
 * control nobody can see. Disabling them instead would drop them from the POST
 * and send an order with no customer on it.
 */
function collapseBrief(me) {
  const panel = q('[data-pl-saved]');
  const fields = q('[data-pl-s3-fields]');
  const list = q('[data-pl-saved-list]');
  if (!panel || !fields || !list) return false;

  list.textContent = '';
  PREFILL_FIELDS.forEach((key) => {
    const input = q(`input[name="${key}"]`);
    const val = input && input.value.trim();
    if (!val) return;
    const li = document.createElement('li');
    li.textContent = val;
    list.appendChild(li);
  });
  if (!list.children.length) return false;

  fields.hidden = true;
  panel.hidden = false;

  const edit = q('[data-pl-saved-edit]');
  if (edit) {
    edit.type = 'button';
    edit.addEventListener('click', () => {
      // One way only. Re-collapsing after an edit would take a field away from
      // someone in the middle of correcting it.
      fields.hidden = false;
      panel.hidden = true;
      syncRequired();
      const first = q('input[name="name"]');
      if (first) first.focus();
    }, { once: true });
  }

  syncRequired();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 · THE OFFER TO SAVE
//
// Shown only to a signed-in customer who has never saved (see applyAccount).
// OPT-IN, and that is a requirement rather than a preference: the checkbox
// ships unchecked in the markup, nothing here ticks it, and the POST below
// happens only if the visitor ticked it themselves. It also carries no `name`
// attribute — the same rule step 2's file input follows — so it can never
// travel with the order to /api/order and be mistaken for an answer to it.
// ─────────────────────────────────────────────────────────────────────────────

function bindSaveOffer() {
  const offer = q('[data-pl-save-offer]');
  const box = q('[data-pl-save-check]');
  if (!offer || !box) return;
  box.checked = false; // a bfcache restore can bring a tick back with it
  offer.hidden = false;
}

/**
 * Save the details, once the order they came with has actually gone through.
 *
 * WHY keepalive. This fires on the success path, a line before the page
 * navigates to /thank-you, and a normal fetch is cancelled when its document
 * goes away. keepalive is the browser API for exactly this — a request that
 * outlives the page that sent it. Small body, well inside the 64 kB the spec
 * allows for one.
 *
 * WHY IT IS FIRE-AND-FORGET. There is no screen left to report a failure on,
 * and nothing about the order depends on it: the details are saved or they are
 * not, and the customer can save them from /account either way. The one thing
 * that must not happen is this holding up the redirect to their confirmation.
 *
 * The POST carries no customer id and could not use one if it did —
 * /account/details reads whose record to write from the session cookie and
 * from nothing else. See src/lib/account.js's handleDetails().
 */
function saveDetailsIfAsked() {
  const box = q('[data-pl-save-check]');
  if (!box || !box.checked) return;

  const fd = new FormData();
  PREFILL_FIELDS.forEach((key) => {
    if (key === 'email') return; // the account email is not editable — see account.js
    const input = q(`input[name="${key}"]`);
    if (input) fd.set(key, input.value.trim());
  });
  const bg = q('input[name="background"]:checked');
  const bgField = q('[data-pl-bg]');
  // A lifestyle-only order has no background — the fieldset is disabled and
  // nobody chose one, so there is nothing to store as a standing preference.
  if (bg && bgField && !bgField.disabled) {
    fd.set('background', bg.value);
    fd.set('background_custom', value('background_hex'));
  }

  try {
    fetch('/account/details', {
      method: 'POST',
      body: fd,
      keepalive: true,
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }).catch(() => {});
  } catch {
    /* keepalive unsupported, or the body was refused — the order is unaffected */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 · THE CAPACITY GATE
//
// /api/capacity answers with one of six reasons and its own comment says why
// they must stay six: "three of these are empty results that mean different
// things, and /start must not flatten them into one apology."
//
// So each reason has its own server-rendered panel and this function's whole
// job is to show exactly one of them. `queue` is rendered without a request,
// because an unattended order has no window to clear and asking would only
// give the code a date-shaped answer to mishandle.
// ─────────────────────────────────────────────────────────────────────────────

function bindGate() {
  const retry = q('[data-pl-gate-retry]');
  if (retry) {
    retry.type = 'button';
    retry.addEventListener('click', () => runGate());
  }
}

function gateShow(reason) {
  qa('[data-pl-gate]').forEach((p) => {
    p.hidden = p.dataset.plGate !== reason;
  });
}

function clearWindow() {
  setHidden('window_start', '');
  setHidden('window_end', '');
}

function runGate() {
  // The tier the count earned, read back from the field the server will read.
  // Not re-derived: two places deciding which orders get a window is how one of
  // them ends up asking the calendar a question the other never sends.
  const attended = value('tier') === 'attended';
  clearWindow();

  if (!attended) {
    // Tier 0. No request, no date, ever. Section 13's single most important
    // constraint is enforced by there being no code here that could produce one.
    gateShow('queue');
    return;
  }

  const select = q('select[name="products"]');
  const products = Number.parseInt(select ? select.value : '', 10);
  if (!Number.isInteger(products) || products < 1) {
    // Two different facts, and they must not be flattened into one panel. An
    // empty select is "no count has been given". The escape hatch is a count
    // that was given and is larger than a single window holds — which is the
    // gate's own 'too-large' answer, so it gets that panel and the maximum it
    // quotes, rather than being told to go back and pick a number it already
    // deliberately declined to pick.
    if (select && select.value) {
      qa('[data-max]').forEach((el) => { el.textContent = String(cfg.maxProducts); });
      gateShow('too-large');
    } else {
      gateShow('invalid');
    }
    return;
  }

  const gen = ++gateReq;
  gateShow('checking');

  fetch(`/api/capacity?products=${encodeURIComponent(products)}&tier=attended`, {
    headers: { accept: 'application/json' },
  })
    .then((r) => r.json().then((b) => ({ status: r.status, body: b })))
    .catch(() => ({ status: 0, body: null }))
    .then(({ body }) => {
      if (gen !== gateReq) return; // a newer request has already answered
      if (!body || typeof body.reason !== 'string') {
        gateShow('unavailable');
        return;
      }
      renderGate(body);
    });
}

function renderGate(body) {
  const reason = body.reason;
  const known = ['ok', 'full', 'too-large', 'invalid', 'unavailable', 'queue'];
  const panel = known.indexOf(reason) === -1 ? 'unavailable' : reason;

  // The max only means something on the two panels that quote it, and it is the
  // server's number in both — never ATTENDED_PER_WINDOW copied into this file.
  if (Number.isFinite(Number(body.max))) {
    qa('[data-max]').forEach((n) => {
      n.textContent = String(body.max);
    });
  }

  if (panel === 'ok') renderWindows(body.windows || []);
  gateShow(panel);
}

function renderWindows(windows) {
  const host = q('[data-pl-windows]');
  if (!host) return;
  host.textContent = '';

  windows.forEach((w) => {
    if (!w || !w.start) return;
    const b = button('', 'pl-window');
    b.dataset.start = w.start;
    b.dataset.end = w.end || w.start;

    const label = document.createElement('span');
    label.className = 'pl-window-days';
    label.textContent = w.end && w.end !== w.start ? `${day(w.start)} – ${day(w.end)}` : day(w.start);

    const sub = document.createElement('span');
    sub.className = 'pl-window-sub';
    sub.textContent = c('gate.windowSub');

    b.appendChild(label);
    b.appendChild(sub);
    b.setAttribute('aria-pressed', 'false');

    b.addEventListener('click', () => {
      qa('.pl-window', host).forEach((o) => {
        o.classList.remove('is-picked');
        o.setAttribute('aria-pressed', 'false');
      });
      b.classList.add('is-picked');
      b.setAttribute('aria-pressed', 'true');
      setHidden('window_start', b.dataset.start);
      setHidden('window_end', b.dataset.end);
    });

    host.appendChild(b);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 · CONFIRM
//
// FLAGGED, and stated on the page rather than worked around: this is a confirm
// step, not a payment step. The project has no payment processor — no SDK, no
// key, no endpoint — so a card form here would be a form that cannot take a
// card. What the site already promises on /pricing is that an order with a
// reserved window is paid after that window is confirmed and before production
// starts, and that a queue order is invoiced on delivery. This step confirms;
// the invoice follows.
// ─────────────────────────────────────────────────────────────────────────────

function renderSummary() {
  const host = q('[data-pl-summary]');
  if (!host) return;
  host.textContent = '';

  const kind = kindOf();
  const n = productCount();
  const attended = value('tier') === 'attended';
  const select = q('select[name="products"]');
  const count = select ? select.options[select.selectedIndex] : null;
  const outfitN = outfitCount();

  const rows = [];
  if (kind) rows.push([c('sum.kind'), c(`kind.${kind}`)]);
  if (count && count.value) rows.push([c('sum.count'), count.textContent.trim()]);

  // The background, read back as the name AND the value — the two things a
  // client would check on a confirm screen, and the two things the studio is
  // about to be sent. Only when the scope has one: syncBackground() empties the
  // resolved field for a lifestyle-only order, so an empty field here is the
  // absence of a question rather than an unanswered one.
  const bgHex = value('background_hex');
  if (bgHex) {
    const picked = q('input[name="background"]:checked');
    const bgName = picked ? picked.dataset.plBgName : '';
    rows.push([c('sum.bg'), bgName ? `${bgName} — ${bgHex}` : bgHex]);
  }

  // Task #271f.
  if (outfitN > 0) rows.push([c('sum.outfit'), c('sum.outfitN', { price: euro(cfg.outfitSurcharge), n: outfitN })]);

  // Computed again — NOT scraped back off step 1. Reading the rendered total
  // would make the confirm screen a copy of a copy, and a client who changed
  // the count and came straight here would confirm the old figure. Same rule as
  // step 1: net, labelled, and never authoritative.
  const quote = kind ? quoteFor(kind, n, outfitN) : null;
  if (quote) rows.push([c('sum.net'), euro(quote.net)]);

  rows.push([c('sum.files'), staged.length ? c('upload.count', { n: staged.length, max: cfg.maxBatchFiles }) : c('sum.noFiles')]);

  // The one row that is allowed to contain a date, and only when the gate put
  // it there. Everything else says what actually happens next instead.
  const ws = value('window_start');
  const we = value('window_end');
  if (attended && ws) rows.push([c('sum.window'), we && we !== ws ? `${day(ws)} – ${day(we)}` : day(ws)]);
  else if (attended) rows.push([c('sum.window'), c('sum.windowLater')]);
  else rows.push([c('sum.window'), c('sum.queue')]);

  const email = q('input[name="email"]');
  if (email && email.value) rows.push([c('sum.email'), email.value]);

  rows.forEach(([k, v]) => {
    if (!k || !v) return;
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    host.appendChild(dt);
    host.appendChild(dd);
  });
}

function bindSubmit() {
  form.addEventListener('submit', onSubmit);
}

function onSubmit(e) {
  // Enter in a text field submits a form. On steps 1–4 that means "next",
  // because a client who presses Enter in the brief has not seen the gate yet.
  if (current < STEPS) {
    e.preventDefault();
    if (!validateStep(current)) return;
    const to = current + 1;
    show(to);
    if (to === 4) runGate();
    return;
  }

  e.preventDefault();
  if (busy) return;

  for (let i = 1; i <= STEPS; i += 1) {
    if (!validateStep(i)) {
      show(i);
      return;
    }
  }

  busy = true;
  setError('');
  const btn = q('[data-pl-submit]');
  if (btn) {
    btn.disabled = true;
    btn.dataset.plLabel = btn.textContent;
    btn.textContent = c('submit.sending');
  }
  form.classList.add('is-sending');

  const fd = new FormData(form);
  // Here and nowhere else. A hidden input would travel with a no-JS post and
  // hand the client a JSON body where a page should be.
  fd.set('mode', 'json');

  fetch('/api/order', { method: 'POST', body: fd, headers: { accept: 'application/json' } })
    .then((r) => r.json().then((b) => ({ status: r.status, body: b })).catch(() => ({ status: r.status, body: null })))
    .then(({ status, body }) => finishSubmit(status, body))
    .catch(() => finishSubmit(0, null));
}

function finishSubmit(status, body) {
  const btn = q('[data-pl-submit]');
  const release = () => {
    busy = false;
    form.classList.remove('is-sending');
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.plLabel) btn.textContent = btn.dataset.plLabel;
    }
  };

  if (status >= 200 && status < 300 && body && body.ok && body.redirect) {
    // AFTER the order landed, and only then: an opt-in offered at the end of an
    // order should not save anything if the order itself never happened. It is
    // sent with keepalive so the navigation two lines down cannot cancel it —
    // see saveDetailsIfAsked(). Does nothing at all if the box was not ticked,
    // which is the state it is always in unless the visitor ticked it.
    saveDetailsIfAsked();

    if (body.windowLost) {
      // The order exists and has no window. Saying so here is the only honest
      // move: the alternative is a thank-you page that shows a date the gate
      // took back a second before the insert landed.
      release();
      const lost = q('[data-pl-lost]');
      if (lost) {
        lost.hidden = false;
        const go = q('[data-pl-lost-go]', lost);
        if (go) {
          go.type = 'button';
          go.addEventListener('click', () => location.assign(body.redirect), { once: true });
        }
        lost.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      } else {
        location.assign(body.redirect);
      }
      return;
    }
    // Deliberately not release()d — the page is leaving, and re-enabling the
    // button during the navigation is an invitation to press it twice.
    location.assign(body.redirect);
    return;
  }

  release();

  if (status === 409 && body && body.error === 'window-gone') {
    // No order was created. The server re-ran the gate and would not clear the
    // window that was asked for. Four reasons reach here and they are NOT one
    // story: 'ok' and 'full' mean the window itself went, while 'too-large' and
    // 'invalid' mean the count was never one this gate could date.
    const offered = body.reason === 'ok' || !body.reason;
    const windowWent = offered || body.reason === 'full';

    // The banner says "that window went while you were filling this in", and on
    // the count reasons that sentence is simply untrue — no window went. It is
    // also the loudest surface on the step: role="alert", set as a heading. Set
    // BOTH ways, not just shown: a client who loses a window, then edits the
    // count to something unusable and resends, would otherwise still be reading
    // the previous attempt's banner above a panel about something else.
    const warn = q('[data-pl-gate-lost]');
    if (warn) warn.hidden = !windowWent;

    clearWindow();
    show(4);
    renderGate({ reason: offered ? 'ok' : body.reason, windows: body.windows || [], max: body.max });
    // renderGate already picks the panel from the reason — 'too-large' and
    // 'invalid' included, each with its own true sentence, one of which quotes
    // the maximum — and capacity.js's docstring forbids flattening those answers
    // into one apology. Overriding it here undid that for every empty list. The
    // single answer renderGate cannot render is "ok, and here is nothing", which
    // is a contradiction rather than a panel; that one alone falls back.
    if (offered && (!body.windows || !body.windows.length)) gateShow('full');
    return;
  }

  if (status === 400 && body && body.error === 'email') {
    setError(c('submit.email'));
    show(3);
    const email = q('input[name="email"]');
    if (email) {
      email.focus();
      email.select && email.select();
    }
    return;
  }

  // Network failure, or a status nobody planned for. NOT a silent native
  // submit: if the request reached the server and only the response was lost,
  // resubmitting creates a second order. The client retries deliberately or not
  // at all, and the fallback is a channel that cannot double-book.
  setError(status === 0 ? c('submit.network') : c('submit.generic'));
}

function setError(text) {
  const box = q('[data-pl-error]');
  if (!box) return;
  box.textContent = text || '';
  box.hidden = !text;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function setHidden(name, val) {
  const el = q(`input[name="${name}"]`);
  if (el) el.value = val;
}

/** Write text into a hook if the page has it. A missing hook degrades that one
 * line and nothing else — the same contract every other selector here keeps. */
function setText(sel, text) {
  const el = q(sel);
  if (el) el.textContent = text || '';
}

function value(name) {
  const el = q(`input[name="${name}"]`);
  return el ? el.value : '';
}

function button(label, cls) {
  const b = document.createElement('button');
  b.type = 'button'; // every generated button, without exception — the default
  b.className = cls; // is submit, and a stray one here posts a half-filled order
  if (label) b.textContent = label;
  return b;
}

/**
 * Mirrors euro() in src/data/pricing.js exactly — thousands grouping included.
 *
 * interactions.js has its own money() and it is NOT reused here: it omits the
 * grouping separator, which nothing on the site noticed while every figure it
 * touched was under a thousand. Thirty products on the ladder is well past
 * that, so a client would have read the total one way here and another way on
 * the invoice. Duplicating twelve lines is the cheaper of the two mistakes; a
 * verifier asserts the two agree across every total this page can reach.
 */
function euro(amount) {
  const nl = cfg.lang === 'nl';
  const thousands = nl ? '.' : ',';
  const decimal = nl ? ',' : '.';
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const fixed = Number(amount).toFixed(hasCents ? 2 : 0);
  const parts = fixed.split('.');
  const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `€${grouped}${parts[1] ? decimal + parts[1] : ''}`;
}

/** Float multiplication produces 319.92000000000004. Cents are integers. */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Mirrors formatDay() in functions/api/order.js, so the screen and the email agree. */
function day(iso) {
  try {
    return new Intl.DateTimeFormat(cfg.lang === 'nl' ? 'nl-NL' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

function bytes(n) {
  const v = Number(n) || 0;
  if (v >= 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(v >= 10 * 1024 * 1024 ? 0 : 1).replace('.', cfg.lang === 'nl' ? ',' : '.')} MB`;
  return `${Math.max(1, Math.round(v / 1024))} kB`;
}
