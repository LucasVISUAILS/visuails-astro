// VISUAILS — the five-step order pipeline. Section 10 of the brief.
//
// order → upload → brief → capacity gate → confirm.
//
// It drove one page (/start) and now drives three (/start/catalog,
// /start/lifestyle, /start/complete). NOTHING in this file branches on which:
// the service arrives as `service` in the config blob the page renders, the way
// every other fact about a page already does. There is no URL parsing here and
// there must not be — a route rename would otherwise reprice orders in silence.
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
// DOM CONTRACT — OrderFlow.astro must supply exactly these hooks. (It was
// StartPage.astro until the flow was split per service; StartPage.astro is the
// chooser now and renders no form at all.)
//
//   form[data-pipeline]                the form itself; also carries the config
//     script[data-pipeline-config]     type="application/json", the blob below
//     input[name=service|tier|products|window_start|window_end|upload_batch]
//     [data-pl-step="1".."5"]          the five step sections
//     [data-pl-rail-item="1".."5"]     progress rail entries
//     [data-pl-next] [data-pl-back]    navigation buttons (type=button)
//     [data-pl-submit]                 the submit button
//     [data-pl-step-error]             one per step, hidden, with an id
//     [data-pl-err-msg] on any field   what to say when THAT field is missing
//
//   step 1  input[name=service]                  the wire name, hidden. The
//                                                LADDER KIND comes from the
//                                                config blob's own `service`;
//                                                a radio may still carry it in
//                                                [data-pl-kind] and wins if so.
//                                                The URL is never read.
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
//           input[name=style][data-pl-style-name]  the lifestyle flow's look
//                                                picker; read back on step 5
//                                                and posted into details_json
//
//   step 2  ProductUploader.astro supplies all of these. NONE of them carries a
//           `name` attribute except the product-name inputs this file BUILDS
//           (`product_p1`…), which is deliberate on both counts: a file input
//           with a name would post bytes /api/order throws away, and the names
//           must post, because they are the customer's own answer.
//           input[type=file][data-pl-file]       the bulk picker, multiple
//           [data-pl-folder-input]               the webkitdirectory twin
//           [data-pl-folder] [data-pl-folder-row]  its button; the row is
//                                                revealed only where the
//                                                property exists
//           [data-pl-cards]                      the empty <ol>; cards are built
//                                                here from the count on step 1
//           [data-pl-add]                        add a product beyond the count
//           [data-pl-progress]                   "8 of 25 products ready",
//                                                aria-live, never a file count
//           [data-pl-tray] [data-pl-tray-list]   files with no product
//           template[data-pl-dia="<shot>"]       one per id in shots.js; cloned
//                                                into every generated slot
//           [data-pl-upload-note="off"]          shown when uploads are down
//
//           The classes this file writes are a contract with that component's
//           scoped sheet, which reaches them through :global(): .pu-card,
//           .pu-head/.pu-n/.pu-name/.pu-toggle/.pu-state, .pu-slots and
//           .pu-slot[data-state=empty|skipped|sending|filled|failed] with
//           .is-thumb, .pu-slot-btn/-dia/-img/-name/-req/-bar/-msg/-input,
//           .pu-acts/.pu-act, .pu-about/.pu-q/.pu-q-label/.pu-q-field,
//           .pu-copy/-label/-btn/-hint/-said, and
//           .pu-tray-item/-thumb/-name/-row/-pick/-go.
//
//           TWO SERVER-RENDERED IDS ARE ALSO PART OF THAT CONTRACT, and both
//           exist so a card can point at something instead of repeating it:
//           #pu-q-<question>-buys   the one paragraph explaining what that
//                                   question buys, in the guide at the top of
//                                   the step. Every card's control names it in
//                                   aria-describedby, so the explanation is
//                                   written once and referenced 25 times.
//           #pu-dl-<question>       the shared <datalist> of examples. One per
//                                   question, named by every card's input.
//           A missing one degrades that one affordance and nothing else — the
//           `list` and `aria-describedby` are only set when the target is
//           actually in the document.
//
//           The per-product answers POST, under `<question>_<key>` — today
//           `material_p3` — the same shape as the product name (`product_p3`)
//           and for the same reason: they are the customer's own answers about
//           product p3, they land in details_json, and /api/order needs no new
//           column for any of them.
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

// BEHAVIOUR, NOT WORDS. Everything imported here is a function or a list of
// ids: which angle a filename is naming, which folder is the product, which
// four slots exist and which one is required. The LABELS for all of it still
// arrive in the config blob like every other string on this page — shots.js's
// own COPY table is never read from here, and importing it would put half the
// Dutch for one step in a file no translator opens.
import { SHOT_IDS, REQUIRED_SHOT_IDS, isRequiredShot, guessShot, productKeyFromPath, extraShotId } from '../data/shots.js';
// Same rule, one line down. PRODUCT_QUESTIONS is read here for its IDS, its
// types, its maxLength and its option ids — the wire values, which have to be
// the same ones /api/order validates against, and which would rot the first
// time somebody added a fit if they were retyped in the page. Not one string
// off this import reaches the screen: every label, placeholder and option name
// is read out of the config blob like everything else on this page.
import { PRODUCT_QUESTIONS } from '../data/attributes.js';
// De EU-lijst staat op één plek. Hem hier overtypen zou betekenen dat het
// formulier en de server het ooit oneens worden over of een land in de EU zit,
// en dan biedt het formulier 0% aan waar de server 21% rekent.
import { isEu, HOME_COUNTRY } from '../data/vat.js';

/*
 * ── HOEVEEL STAPPEN, EN WELKE IS DE POORT — 11 AUGUSTUS 2026 ─────────────────
 *
 * Dit was `const STEPS = 5`, en dat klopte zolang elke bestelling door dezelfde
 * vijf schermen ging. De proefvisual op /test-sample gaat door vier: kiezen,
 * foto's, gegevens, controleren. De levertijd hoort er niet tussen, want een proef
 * van één product reserveert geen productieweek — tierForProducts(1) maakt er
 * sowieso een onbegeleide bestelling van, dus de capaciteitsagenda zou er ook
 * niets voor vrijgeven.
 *
 * Twee waarden in plaats van één constante, en dat is de hele wijziging: "hoeveel
 * stappen zijn er" en "op welke stap draait de capaciteitspoort" zijn twee losse
 * feiten die toevallig allebei uit datzelfde getal werden afgeleid. Zolang de
 * poort altijd stap 4 was en de samenvatting altijd stap 5, viel dat niet op. Bij
 * vier stappen zonder poort valt het meteen om: de samenvatting is dan stap 4 en
 * de poort bestaat niet.
 *
 * De pagina zegt het, de code raadt het niet. `steps` en `gateStep` komen uit het
 * configblok dat OrderFlow.astro uitzendt — dezelfde route als `service`, en om de
 * reden die daar staat. Ze uit de DOM tellen zou ook werken, tot iemand een stap
 * verbergt in plaats van weglaat; dan verschuift de navigatie zonder dat iemand
 * die regel heeft geschreven.
 *
 * De standaardwaarden zijn de oude. Een pagina die niets meestuurt — en dat zijn
 * alle drie de bestaande bestelstromen — gedraagt zich dus precies zoals gisteren.
 */
const DEFAULT_STEPS = 5;
const DEFAULT_GATE_STEP = 4;

/** Per-page state. Reset on every init, because ClientRouter reuses the module. */
let form = null;
let cfg = null;
let STEPS = DEFAULT_STEPS;
/** Null betekent: deze stroom heeft geen capaciteitspoort. */
let GATE_STEP = DEFAULT_GATE_STEP;
let current = 1;
let batch = '';
let staged = []; // [{ key, name, bytes, product, shot }]
let uploadsOff = false;
let busy = false;
let gateReq = 0; // request generation, so a slow answer cannot overwrite a fast one

// Step 2. `cards` is the product list — one per product on the order, each with
// four slots — and `tray` is what arrived without a product we could name.
let cards = [];
let tray = [];
let trayN = 0;
let traySig = ''; // what the tray last rendered, so it is not rebuilt per file
let dragging = ''; // the tray id currently under the cursor, for browsers whose
                   // dataTransfer is unreadable during dragover

// UPLOADS RUN ONE AT A TIME, and this is the tail of that queue. Declared HERE,
// with the rest of the state, and not beside the sender that uses it: `let` is
// hoisted into a temporal dead zone, boot() runs at the bottom of this module
// but init() assigns this on its first line, and a declaration further down the
// file therefore threw ReferenceError on the very first boot — swallowed by
// boot()'s catch, which stripped .is-live and left a stacked form behind until
// a second page-load event happened to re-run init after evaluation finished.
let chain = Promise.resolve();

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

  /* Gelezen vóór alles wat navigeert. Een pagina die er niets over zegt krijgt de
     oude vijf stappen met de poort op vier; `gateStep: null` betekent uitdrukkelijk
     "geen poort" en is dus iets anders dan "niet meegestuurd". */
  STEPS = Number.isInteger(cfg.steps) && cfg.steps > 0 ? cfg.steps : DEFAULT_STEPS;
  GATE_STEP = cfg.gateStep === null ? null
    : (Number.isInteger(cfg.gateStep) ? cfg.gateStep : DEFAULT_GATE_STEP);

  current = 1;
  batch = '';
  staged = [];
  uploadsOff = false;
  busy = false;
  gateReq = 0;
  // Object URLs from the previous page are already dead with their documents;
  // what matters is that the arrays do not outlive the DOM they point at.
  cards = [];
  tray = [];
  trayN = 0;
  traySig = '';
  dragging = '';
  chain = Promise.resolve();

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
  bindErrors();
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
 * shipped: task #271e put the string in the page's FORM table, which is
 * markup labels, instead of PIPE, which is what gets serialised into the config
 * blob this function reads. The lookup found nothing, returned '', and
 * bindPrefill() wrote the empty string into the note and un-hid it — so every
 * returning customer got a blank italic paragraph and nothing anywhere said
 * why.
 *
 * Two things stop that recurring. OrderFlow.astro now asserts at BUILD time
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
    console.warn(`pipeline.js: no copy at "${path}" — OrderFlow.astro's PIPE table is missing this key`);
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

  syncVatConfirm();
  /* De laatste stap, niet stap 5: bij de proefvisual is dat stap 4. */
  if (to === STEPS) renderSummary();

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
    f.required = f.dataset.plReq === '1' && isShown(f) && !waived(f);
  });
}

/*
 * ── DE VERKLARING BIJ 0%, EN WANNEER HIJ VERSCHIJNT ──────────────────────────
 *
 * Uit btwverleggingspecificatie.md §4: bij een geslaagde verlegging een
 * verplicht vinkje waarin de klant verklaart dat het bedrijf buiten Nederland
 * zit en dat het nummer daarbij hoort.
 *
 * De voorwaarde is precies die van artikel 196: een ander EU-land dan Nederland,
 * en een btw-nummer ingevuld. Buiten de EU is er geen verlegging — dat is
 * "niet belastbaar in Nederland", een andere regel met een andere factuurtekst
 * (zie src/data/vat.js) — dus hoort dit vinkje daar niet, en zou het er zetten
 * suggereren dat het één ding is.
 *
 * DIT BELOOFT NIETS. Het vinkje verschijnt zodra 0% MOGELIJK is, niet zodra het
 * zeker is: of het nummer klopt weten we pas als VIES antwoordt, en dat gebeurt
 * op de server bij verzenden. Klopt het niet, dan is het tarief 21% en is het
 * vinkje betekenisloos in plaats van onwaar. De andere volgorde — pas vragen ná
 * VIES — zou betekenen dat de klant een vinkje krijgt op het moment dat hij op
 * verzenden heeft gedrukt, en dat is de slechtste plek voor een verplicht veld.
 */
function syncVatConfirm() {
  const block = q('[data-pl-vatconfirm]');
  if (!block) return;
  const country = (q('select[name=country]') || {}).value || '';
  const vat = ((q('input[name=vat]') || {}).value || '').trim();
  const noVat = !!(q('input[type="checkbox"][name="no_vat"]') || {}).checked;

  const up = country.trim().toUpperCase();
  const applies = !!up && up !== HOME_COUNTRY && isEu(up) && !!vat && !noVat;

  block.hidden = !applies;
  // Verdwijnt het blok, dan verdwijnt ook het antwoord. Een aangevinkte
  // verklaring die de klant niet meer kan zien, is geen verklaring — en hij zou
  // meeliften naar de server bij een land waar hij niet over gaat.
  if (!applies) {
    const box = q('input[name=vat_confirmed]');
    if (box) box.checked = false;
  }
  syncRequired();
}

/*
 * ── EEN VELD DAT VERPLICHT IS TENZIJ ─────────────────────────────────────────
 *
 * Lucas, 7 augustus 2026: *"inclusief btw-nummer met een checkbox bij
 * btw-nummer toch te skippen als de klant geen btw-nummer heeft of buiten de eu
 * komt."*
 *
 * `data-pl-req-unless="no_vat"` op het veld wijst naar het vinkje dat de eis
 * opheft. Eén bron: het `required`-attribuut wordt door syncRequired() gezet en
 * niet met de hand aan- en uitgezet, dus er is geen tweede plek waar dezelfde
 * regel kan gaan afwijken — precies de reden dat data-pl-req überhaupt bestaat
 * (zie bindForm hierboven, waar het attribuut van elk veld wordt afgehaald).
 *
 * Onbekende naam → niets opgeheven. Een verwijzing naar een vinkje dat niet
 * bestaat mag een verplicht veld niet stilletjes optioneel maken.
 */
function waived(f) {
  const name = f.dataset && f.dataset.plReqUnless;
  if (!name) return false;
  const box = q(`input[type="checkbox"][name="${name}"]`);
  return !!(box && box.checked);
}

function isShown(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/**
 * An error is a statement about the form as it was a moment ago. The moment the
 * client answers, it stops being true — so it comes off on the first input or
 * change inside the step it belongs to, rather than surviving until the next
 * press of Continue. One delegated pair of listeners, because the fields it has
 * to cover include ones pipeline.js itself reveals later.
 */
function bindErrors() {
  const clear = (e) => {
    const step = e.target && e.target.closest ? e.target.closest('[data-pl-step]') : null;
    if (step) clearStepError(step);
  };
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);

  // Een vinkje dat een eis opheft, moet die eis meteen opheffen — anders zet je
  // het aan en houdt de browser je nog steeds tegen op het veld erboven. Één
  // luisteraar op het formulier in plaats van één per vinkje; zie waived().
  form.addEventListener('change', (e) => {
    const el = e.target;
    if (el && el.type === 'checkbox' && qa('[data-pl-req-unless]').some((f) => f.dataset.plReqUnless === el.name)) {
      syncRequired();
    }
  });

  // Land, btw-nummer en "ik heb geen btw-nummer" bepalen samen of de verklaring
  // van toepassing is. Eén luisteraar voor alle drie, op `input` én `change`,
  // want een land is een select en een nummer wordt getypt.
  const watch = (e) => {
    const n = e.target && e.target.name;
    if (n === 'country' || n === 'vat' || n === 'no_vat') syncVatConfirm();
  };
  form.addEventListener('input', watch);
  form.addEventListener('change', watch);
}

function bindNav() {
  qa('[data-pl-next]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', () => {
      if (!validateStep(current)) return;
      const to = current + 1;
      show(to);
      if (GATE_STEP !== null && to === GATE_STEP) runGate();
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

/**
 * Native validation, scoped to what the client can actually see and fix, plus
 * a message that stays on the screen.
 *
 * WHAT WAS WRONG. This function used to end at reportValidity(). That call
 * paints the browser's own bubble, which disappears on the next click, is
 * unstyled, is not in the accessibility tree in any dependable way, and — the
 * part an audit could measure — leaves the DOM completely unchanged: no
 * [aria-invalid] anywhere on the page and no [aria-describedby]. A screen
 * reader that had already moved past the field heard nothing at all, and a
 * sighted client who looked away for a second saw a Continue button that
 * simply did not work.
 *
 * WHAT IT DOES NOW. The offending field is marked invalid, the step's own error
 * box is filled with THAT FIELD'S message — [data-pl-err-msg], written by the
 * page next to the field it describes, so the sentence names the thing that is
 * missing rather than saying "check the form" — and the field points at the box
 * with aria-describedby. The native bubble is still called for, because it is
 * the fastest signal for a mouse user and costs nothing.
 *
 * ── EN DIE BUBBEL SPREEKT ONZE TAAL, NIET DIE VAN DE BROWSER ────────────────
 *
 * 8 augustus 2026, gemeld op de Engelse bestelpagina: "Vink dit selectievakje
 * aan als je wilt doorgaan." Dat is geen tekst van deze site — het is de eigen
 * melding van Chrome, en reportValidity() rendert die in de taal van de
 * BROWSER. Wie een Nederlandse Chrome heeft, krijgt Nederlandse bubbels op een
 * Engelse pagina, en daar is geen `lang` op het document tegen opgewassen.
 *
 * De enige manier om die tekst te bepalen is setCustomValidity(), en dat werd
 * nergens in dit project aangeroepen. Dus staat er nu de sentence die al naast
 * het veld stond: één bron voor de bubbel en voor het foutvak eronder.
 *
 * Waarom niet meteen weer leegmaken: een custom-validity blijft gelden tot je
 * hem opheft, en zolang hij geldt is het veld ongeldig — ook nadat de klant het
 * heeft ingevuld. clearStepError() haalt hem eraf, en die loopt bij elke edit
 * en voor elke nieuwe ronde. Vergeet dat en de klant zit vast op een ingevuld
 * formulier, wat erger is dan een bubbel in de verkeerde taal.
 */
function validateStep(n) {
  const node = stepNode(n);
  if (!node) return true;
  syncRequired();
  clearStepError(node);
  const bad = qa('input, select, textarea', node).find((f) => isShown(f) && !f.checkValidity());
  if (!bad) return true;
  showStepError(node, bad);
  if (typeof bad.setCustomValidity === 'function') {
    bad.setCustomValidity(bad.dataset.plErrMsg || c('err.generic'));
  }
  bad.reportValidity();
  return false;
}

/** Fill the step's error box and tie it to the field that caused it. */
function showStepError(node, field) {
  const box = q('[data-pl-step-error]', node);
  field.setAttribute('aria-invalid', 'true');
  if (!box) return;
  box.textContent = field.dataset.plErrMsg || c('err.generic');
  box.hidden = false;
  // role is set here rather than in the markup on purpose: an element that is
  // role="alert" from page load announces itself the moment it is un-hidden AND
  // again on every text change. Setting both at once is one announcement.
  box.setAttribute('role', 'alert');
  if (box.id) {
    // A radio group is invalid as a group; describing every member is what
    // makes the message reachable whichever one has focus.
    const group = field.name
      ? qa(`[name="${field.name}"]`, node)
      : [field];
    (group.length ? group : [field]).forEach((el) => el.setAttribute('aria-describedby', box.id));
  }
}

/** Take the state back off. Called before every re-validation and on any edit. */
function clearStepError(node) {
  if (!node) return;
  const box = q('[data-pl-step-error]', node);
  if (box) {
    box.hidden = true;
    box.textContent = '';
    box.removeAttribute('role');
  }
  qa('[aria-invalid]', node).forEach((el) => el.removeAttribute('aria-invalid'));
  if (box && box.id) {
    qa(`[aria-describedby="${box.id}"]`, node).forEach((el) => el.removeAttribute('aria-describedby'));
  }
  // De custom-validity eraf, en dit is het belangrijkste deel van deze functie.
  // validateStep() zet onze eigen sentence in de native bubbel; blijft die
  // staan, dan is het veld ongeldig ook nádat de klant het heeft ingevuld en
  // komt hij niet verder. Over de hele stap, niet alleen over het veld dat het
  // laatst fout was — een eerdere ronde kan er een op een ander veld hebben
  // achtergelaten.
  qa('input, select, textarea', node).forEach((el) => {
    if (typeof el.setCustomValidity === 'function' && el.validationMessage) el.setCustomValidity('');
  });
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
  // AFTER bindBackground, and the order matters: bindChannels() ends by running
  // the lock, which reaches into the background radios that bindBackground has
  // just finished binding. Bound first, constrained second.
  bindChannels();
  bindModel();
  // De omschakeling tussen per-product en map. Na de rest, want show() roept
  // syncRequired() en refreshUploader() aan en die willen dat de kaarten en de
  // achtergrond al gebonden zijn.
  bindUploadMode();
}

/**
 * The ladder kind — 'complete' | 'catalog' | 'lifestyle'.
 *
 * TWO SOURCES, IN ORDER, AND NEITHER IS THE URL. A radio's data attribute if
 * the page asks the question (nothing ships that way today, but a page is
 * allowed to), and otherwise `service` out of the config blob, which is what
 * every per-service flow renders. The value on the wire is NOT parsed for it:
 * `drop` is what /api/order's ORDER_SERVICES and the D1 `service` column call a
 * catalog set plus a lifestyle carousel, and a lookup table in this file would
 * be a third place that has to agree with pricing.js and the server both.
 *
 * Reading the pathname would be the obvious shortcut and it is the one thing
 * this must not do: renaming /start/complete would then silently reprice every
 * order placed through it. The page says what it is.
 */
function kindOf() {
  /*
   * `[data-pl-kind]:checked` eerst, en pas daarna de oude plek — 11 aug 2026.
   *
   * Dit las alleen `input[name="service"]:checked`, uit de tijd dat de
   * laddersoort met de wire-waarde meeliftte op één radiogroep. Op de
   * proefvisual lopen die twee uit elkaar: `service` is voor beide keuzes
   * 'test-sample' — dat is wat /api/order leest, en waar de prijs en de controle
   * "een proef per bedrijf" aan hangen — terwijl de soort alleen zegt WAT er
   * gemaakt wordt, een catalogset of een carousel. Die keuze staat daar dus in
   * een eigen veld, `sample_type`.
   *
   * Op het attribuut zoeken in plaats van op de veldnaam maakt dat verschil
   * onzichtbaar voor de rest van dit bestand: wie de soort draagt, draagt
   * `data-pl-kind`, en hoe dat veld heet is de zaak van de pagina. De oude regel
   * blijft als terugval staan, zodat /start onveranderd werkt.
   */
  const r = q('[data-pl-kind]:checked') || q('input[name="service"]:checked');
  const kind = (r && r.dataset.plKind) || (cfg && cfg.service) || '';
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
  // Step 2's card list is a function of this count, so it is rebuilt from the
  // same place every other consequence of the count is. Changing 3 to 25 on
  // step 1 and walking forward has to find 25 cards, not 3.
  syncCards();
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

// ─────────────────────────────────────────────────────────────────────────────
// WHERE THE PRODUCT IS SOLD, AND WHAT THAT TAKES AWAY
//
// MarketplacePicker.astro asks which channels the images are going to. Three of
// them — Amazon, bol, Zalando — require a pure white main image, and Amazon
// enforces it algorithmically at upload. So the moment one of those is ticked,
// the background stops being a choice: white is selected, the other swatches
// and the custom colour are DISABLED as well as deselected, and the customer is
// told why in the same breath rather than discovering it at the marketplace.
//
// Disabled, not hidden. A disabled radio is visibly there and visibly
// unavailable, which is the honest picture — the colours still exist, this
// order just cannot use them. Hiding them would imply we never offered any.
//
// The lock runs one way only. Choosing a background never unticks a channel:
// the channel is a fact about the customer's business and the colour is a
// preference, and a form that overrode the fact to protect the preference would
// have its priorities backwards.
//
// The ids come off data attributes written by the component from channels.js,
// so adding a fourth white-required marketplace is one edit in that file and
// none here.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// THE THREE FOLDED ANSWERS IN STEP 1 (Step1Options.astro).
//
// Each summary states what is currently chosen, so folding the picker hides the
// CONTROLS and never the ANSWER. That distinction is the whole reason these are
// disclosures with a live line rather than dropdowns.
//
// EVERY VALUE IS READ BACK OUT OF THE DOM, and that is deliberate rather than
// lazy: the words for a channel, a swatch and a model already exist in the
// markup the pickers rendered from channels.js, backgrounds.js and models.js.
// Passing them through the config blob as well would be a second copy of three
// vocabularies that could then disagree with the labels the customer is looking
// at — which on a summary claiming to state the current answer is the one bug
// that would be invisible in review and obvious to a client.
//
// The DEFAULT text is captured from the element on first run, so the "nothing
// chosen yet" wording lives in Step1Options.astro next to the markup it
// describes and is never typed here. That also makes it correct with no JS: the
// server rendered the same string.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write one summary, falling back to the wording the server rendered.
 *
 * THE DEFAULT IS STORED ON THE ELEMENT, not in a module-level Map, and that is
 * a bug fix rather than a style choice. The Map version was declared roughly
 * two thirds of the way down this file, and bootstrap runs from nearer the top:
 * the first syncSummaries() of the page therefore hit `Cannot access
 * 'summaryDefaults' before initialization`, a temporal-dead-zone error thrown
 * inside bindChannels() — which had already attached its own listeners, so the
 * marketplace lock kept working perfectly while bindModel(), the next line in
 * init, never ran at all. A half-initialised form that looks entirely healthy
 * is the expensive kind of failure, and a dataset key cannot reproduce it
 * because there is no binding to be too early for.
 */
function setSummary(attr, text) {
  const el = q(`[${attr}]`);
  if (!el) return;
  if (el.dataset.dcDefault === undefined) el.dataset.dcDefault = el.textContent.trim();
  el.textContent = text || el.dataset.dcDefault;
}

function syncSummaries() {
  // Channels — the names of what is ticked, in the order they are shown.
  const picked = qa('[data-pl-ch-box]')
    .filter((b) => b.checked)
    .map((b) => {
      const name = b.closest('.ch-opt')?.querySelector('.ch-name');
      return name ? name.textContent.trim() : b.value;
    });
  setSummary('data-pl-sum-channels', picked.join(', '));

  // Background — the swatch's own name and hex, or the typed custom colour.
  // Falls back to the default line when a custom option is selected with
  // nothing typed in it yet: "Custom · " with an empty hex would read as a
  // colour that had been chosen, and none has.
  const bgChecked = q('input[name="background"]:checked');
  let bgText = '';
  if (bgChecked) {
    const isCustom = bgChecked.dataset.plBgCustom !== undefined;
    const typed = normalizeHex(q('[data-pl-bg-text]') ? q('[data-pl-bg-text]').value : '');
    const name = bgChecked.dataset.plBgName || '';
    const hex = isCustom ? typed : (bgChecked.dataset.plBgHex || '');
    if (!isCustom || typed) bgText = hex ? `${name} · ${hex}` : name;
  }
  setSummary('data-pl-sum-bg', bgText);

  // Model — the chosen face, or nothing, which restores "we choose one".
  const mp = q('input[name="model"]:checked');
  let modelText = '';
  if (mp && mp.value !== 'any') {
    const name = mp.closest('.mp-opt')?.querySelector('.mp-name');
    modelText = name ? name.textContent.trim() : mp.value;
  }
  setSummary('data-pl-sum-model', modelText);
}

/**
 * The model radios have no behaviour beyond keeping their summary honest.
 *
 * DELEGATED ON THE FORM rather than bound to each radio. Binding eleven
 * listeners directly worked for the channel checkboxes and silently did not for
 * these — the summary stayed on its default through a real click while every
 * other path into syncSummaries() updated it correctly, which is the signature
 * of a bind that ran against an empty list. Rather than chase the ordering, the
 * listener sits on the form and asks the event what it came from: it cannot be
 * bound too early, it survives markup being re-rendered underneath it, and it
 * is one listener instead of eleven.
 */
function bindModel() {
  if (!form) return;
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t && t.name === 'model') syncSummaries();
  });
}

function bindChannels() {
  const field = q('[data-pl-ch]');
  if (!field) return;
  qa('[data-pl-ch-box]').forEach((box) => {
    box.addEventListener('change', syncChannels);
  });
  syncChannels();
}

/*
 * ── ÉÉN AANLEVERWEG TEGELIJK ─────────────────────────────────────────────────
 *
 * Lucas, 8 augustus 2026: *"niet beide opties tonen, laat eerst invulscherm zien
 * en maak een knop om over te schakelen naar map uploaden en dan verdwijnt het
 * andere scherm."* De markup staat in ProductUploader.astro; hier staat alleen
 * de omschakeling.
 *
 * WAT ER NIET GEBEURT BIJ OMSCHAKELEN: niets weggooien. Een foto die al naar R2
 * is gegaan blijft staan, een ingevulde productnaam blijft staan, en het bakje
 * met niet-geplaatste bestanden blijft bestaan. Verbergen is geen wissen — wie
 * halverwege van gedachten verandert en terugschakelt, moet zijn werk terugzien
 * en niet opnieuw beginnen. Dat is ook waarom dit `hidden` gebruikt en geen
 * `display:none` in een klasse: één mechanisme, en syncRequired() leest het al.
 *
 * EN DE VERPLICHTING SCHUIFT MEE. De notities bij de extra foto's staan op de
 * kaarten en zijn verplicht (zie buildExtras). Staat de maproute open, dan zijn
 * die kaarten onzichtbaar en dus niet verplicht — syncRequired() kijkt naar
 * zichtbaarheid, dus dat volgt zonder een tweede regel. Schakelt hij terug, dan
 * gelden ze weer.
 */
function bindUploadMode() {
  const wrap = q('[data-pu-modes]');
  if (!wrap) return;
  const panels = qa('[data-pu-panel]', wrap);
  if (!panels.length) return;

  const show = (mode, moveFocus) => {
    panels.forEach((p) => { p.hidden = p.dataset.puPanel !== mode; });
    // De verplichte velden hangen aan zichtbaarheid, dus opnieuw laten bepalen.
    syncRequired();
    // En de uploader zijn eigen staat laten hertekenen: de voortgangsregel en het
    // bakje staan buiten de panelen en gaan over de bestelling, niet over de weg.
    refreshUploader();
    if (!moveFocus) return;
    // De focus naar de kop van het nieuwe paneel. Zonder dit staat de focus op een
    // knop die net verdwenen is, en dan valt hij terug naar het begin van het
    // document — een schermlezer verliest dan zijn plek en een toetsenbordgebruiker
    // moet de hele stap opnieuw doorlopen.
    const live = panels.find((p) => !p.hidden);
    const h = live && q('.pu-sub-h', live);
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: false });
    }
  };

  qa('[data-pu-switch]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.puSwitch, true));
  });

  // Beginstand uit de markup: de kaarten staan open, de map is `hidden`. Hier niet
  // opnieuw zetten — dan zou de beginstand op twee plekken staan en ooit uiteen
  // gaan lopen. Dit is alleen de omschakeling.
}

function syncChannels() {
  const field = q('[data-pl-ch]');
  if (!field) return;

  const picked = qa('[data-pl-ch-box]').filter((b) => b.checked).map((b) => b.value);
  const white = qa('[data-pl-ch-box]').some((b) => b.checked && b.dataset.plChWhite === '1');
  const risk = qa('[data-pl-ch-box]').some((b) => b.checked && b.dataset.plChRisk === '1');
  // A channel that restricts who may appear on the MAIN image. This never
  // removes the on-model frame from the set — bol and Amazon govern which
  // image leads, not which images may exist — so it drives an instruction and
  // nothing else. Dropping the shot would take away a photograph the customer
  // has paid for and would not make a single listing more acceptable.
  const mainModel = qa('[data-pl-ch-box]').some((b) => b.checked && b.dataset.plChMainmodel === '1');
  // The split-order offer is for the customer who wants BOTH — a locked channel
  // and a channel where their own colour is allowed. Showing it to somebody who
  // only ticked Amazon would be selling a second order to someone who has no
  // use for one.
  const wantsOwn = qa('[data-pl-ch-box]').some((b) => b.checked && b.dataset.plChWhite !== '1');

  const lockTo = (q('[data-pl-ch-lock-to]') || {}).dataset?.plChLockTo || 'white';

  qa('input[name="background"]').forEach((r) => {
    const isTarget = r.value === lockTo;
    r.disabled = white && !isTarget;
    if (white && isTarget) r.checked = true;
  });

  // The custom hex field sits outside the radio group and would otherwise stay
  // typed-in and postable behind a disabled radio. syncBackground() hides the
  // panel for a non-custom selection, but the value has to stop travelling too.
  const text = q('[data-pl-bg-text]');
  if (text && white) text.value = '';

  const show = (sel, on) => { const el = q(sel); if (el) el.hidden = !on; };
  show('[data-pl-ch-lock]', white);
  show('[data-pl-ch-split]', white && wantsOwn);
  show('[data-pl-ch-order]', mainModel);
  show('[data-pl-ch-risk]', risk);
  show('[data-pl-ch-why]', white);

  // Re-render the background from whatever the lock just did to it.
  syncBackground(kindOf());
  // …and directly as well: on a flow with no background field syncBackground()
  // returns early, and the channel summary still has to move.
  syncSummaries();
  return picked;
}

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

  // The folded summary states this same answer. Written here rather than from
  // the change listener so that every path that can alter the background — a
  // radio, a typed hex, the marketplace lock — updates the line, instead of the
  // three that happen to be wired today.
  syncSummaries();
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
function quoteFor(kind, n, outfits, extras = 0) {
  const rate = rateFor(kind, n);
  if (rate === null) return null;
  // Extra photos follow the ladder (pricing.js EXTRA_PHOTO_LADDER), so their
  // rate is read at the SAME product count as the products themselves — one
  // rung for the whole order, which is the consistency that choice was made
  // for. The outfit surcharge is flat and does not move with n.
  const extraRate = extraRateNow();
  return {
    rate,
    extraRate,
    net: round2(n * rate + outfits * Number(cfg.outfitSurcharge || 0) + extras * extraRate),
  };
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
  const extras = extrasCount();
  const quote = kind ? quoteFor(kind, n, outfits, extras) : null;
  // The per-card rate line moves with the PRODUCT count, not with the extras,
  // so changing the product select has to repaint every card or the cards keep
  // quoting the rung the order has just left. paint() never calls back into
  // this function, so there is no loop to guard against.
  cards.forEach((k) => { if (k.paintExtra) k.paintExtra(); });

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
    if (extras > 0) noteText += c('total.extra', { price: euro(quote.extraRate), n: extras });
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
      const then = quoteFor(kind, next.at, Math.min(outfits, next.at), extras);
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
// STEP 2 · THE PRODUCT PHOTOS, ONE PRODUCT AT A TIME
//
// This step used to be one <input multiple> and a flat list. A customer
// ordering 25 products dropped 100 files into it and nothing recorded which
// file was which product, or which of the four angles — so the studio sorted it
// by hand afterwards, and the customer never learned whether what they sent was
// enough. src/data/shots.js is the contract this section implements and the
// place the reasoning lives; ProductUploader.astro is the markup and the guide.
//
// ONE FILE PER REQUEST SURVIVES, unchanged, for the reason /api/upload's own
// header gives: the case that matters is a phone on 4G with twelve product
// photographs, and one 200 MB request that dies at 95% takes the whole order
// with it. Twelve small requests lose one photo, and the client can see which.
// XMLHttpRequest rather than fetch for the other half of that: fetch has no
// upload-progress event, and a bar that does not move is indistinguishable from
// a request that has died. What is new is that each request now says WHERE the
// photograph goes — `product` and `shot` — and the server stores both.
//
// ─────────────────────────────────────────────────────────────────────────────
// TWO WAYS IN, AND NEITHER IS THE FALLBACK FOR THE OTHER
//   · BULK. Drop everything, folders included. A folder per product is read as
//     the product (productKeyFromPath); inside a product the filename is read
//     for the angle (guessShot). A loose file whose NAME says the angle is
//     grouped with its siblings by what is left of the name once the angle word
//     is taken out — TSHIRT-01-front.jpg and TSHIRT-01-back.jpg are one product
//     without any folder at all. A file that says neither goes to the tray,
//     because IMG_0234.jpg is not evidence of anything and guessing at it would
//     put a detail shot in a front slot with total confidence.
//   · ONE BY ONE. A card per product, four slots each, tap a slot and pick.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOTHING HERE BLOCKS ANYTHING, EVER
// There is no validation on this step and there must not be. A missing front
// photo is SAID — in the progress line, on the card, at the confirm screen —
// and then the customer continues. shots.js's header states the rule; this is
// the code that has to mean it, and the test is that removing every file from
// this step changes nothing about whether Continue works.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slot state machine: empty → sending → done, plus skipped and failed.
 *
 * A FUNCTION DECLARATION, not a const arrow, and that is not a style choice.
 * boot() is called from the middle of this module (line ~224), so everything it
 * reaches has to exist before the rest of the file has been evaluated — which
 * is true of a hoisted function declaration and false of every const and let
 * below that point. A const here threw "Cannot access before initialization"
 * inside the very first syncCards(), boot()'s catch swallowed it, and the form
 * silently fell back to the stacked no-JS layout. Anything new added below this
 * line and used during init has to follow the same rule.
 */
function EMPTY_SLOT() {
  return { status: 'empty', file: null, key: '', url: '', msg: '', pct: 0, thumb: false };
}

function shotLabel(id) {
  // Een extra slot heeft geen vaste naam in shots.js — het is er één van maximaal
  // vier en draagt zijn nummer. Hier en niet in buildSlot(), zodat er één plek is
  // waar een slot zijn woord vandaan haalt.
  const n = extraSlotNumber(id);
  if (n) return c('pu.extraSlot', { n });
  return c(`pu.shot.${id}`) || id;
}

/** Het nummer uit 'extra2', of 0 als dit geen extra slot is. */
function extraSlotNumber(id) {
  const m = /^extra([1-9][0-9]?)$/.exec(String(id || ''));
  return m ? Number.parseInt(m[1], 10) : 0;
}

/**
 * "front and back", "voorkant en achterkant" — shot names as a readable list.
 *
 * Lowercased because the names are title-case as slot labels and this drops
 * them mid-sentence, where "Needs Front and Back" reads like a product name.
 * The joiner comes from the copy table (`and` / `en`) rather than being spelled
 * here, for the same reason nothing else on this page is spelled here. Two is
 * the realistic ceiling, but the comma branch is written anyway so that adding a
 * third required shot is a change to shots.js and to nothing else.
 */
function shotListText(ids) {
  const names = ids.map((id) => shotLabel(id).toLocaleLowerCase());
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} ${c('pu.listAnd')} ${names[names.length - 1]}`;
}

/**
 * The ceiling on cards, derived rather than picked: four shots per product
 * against the batch ceiling is the number of products that could ever be
 * uploaded for in one order. Beyond it the cards would be real and the uploads
 * would not.
 */
function maxCards() {
  const cap = Math.floor(Number(cfg && cfg.maxBatchFiles) / SHOT_IDS.length);
  return cap > 0 ? cap : 30;
}

function cardLabel(card) {
  const typed = card.input ? card.input.value.trim() : '';
  return typed || c('pu.product', { n: card.n });
}

function slotOpen(card, id) {
  const s = card.slots[id];
  return !s.file || s.status === 'failed';
}

function firstOpenSlot(card) {
  return SHOT_IDS.find((id) => slotOpen(card, id)) || null;
}

/** Filled means "the customer has given us this one", not "R2 confirmed it". */
function slotFilled(card, id) {
  const s = card.slots[id];
  return !!s.file && s.status !== 'failed';
}

function cardReady(card) {
  return REQUIRED_SHOT_IDS.every((id) => slotFilled(card, id));
}

/**
 * The required shots this product is still short of, in asking order.
 *
 * Drives the card's state line. Returning the ids rather than a boolean is the
 * whole point: "needs a front photo" shown to somebody who sent a front and
 * skipped the back sends them to the wrong slot, and they will not find the
 * problem there because there is no problem there.
 */
function missingRequired(card) {
  return REQUIRED_SHOT_IDS.filter((id) => !slotFilled(card, id));
}

function pendingCount() {
  return cards.reduce(
    (n, card) => n + SHOT_IDS.filter((id) => card.slots[id].status === 'sending').length,
    0
  );
}

// ── BINDING ──────────────────────────────────────────────────────────────────

function bindUploads() {
  const host = q('[data-pl-cards]');
  if (!host) return;
  host.textContent = '';

  const bulk = q('[data-pl-file]');
  if (bulk) {
    bulk.addEventListener('change', () => {
      const picked = [...(bulk.files || [])];
      bulk.value = ''; // so re-picking the same file fires change again
      intake(picked.map((file) => ({ file, path: file.webkitRelativePath || file.name })));
    });
  }

  // THE FOLDER PICKER IS A SECOND INPUT, and it is feature-detected rather than
  // rendered blind: webkitdirectory and multiple open different dialogs, no
  // attribute offers both, and a browser without directory upload would get a
  // button that opens a file chooser labelled "choose a folder". Dropping a
  // folder needs none of this — that is webkitGetAsEntry, below.
  const dirInput = q('[data-pl-folder-input]');
  const dirBtn = q('[data-pl-folder]');
  const dirRow = q('[data-pl-folder-row]');
  if (dirInput && dirBtn && 'webkitdirectory' in dirInput) {
    dirInput.webkitdirectory = true;
    if (dirRow) dirRow.hidden = false;
    dirBtn.addEventListener('click', () => dirInput.click());
    dirInput.addEventListener('change', () => {
      const picked = [...(dirInput.files || [])];
      dirInput.value = '';
      intake(picked.map((file) => ({ file, path: file.webkitRelativePath || file.name })));
    });
  }

  const add = q('[data-pl-add]');
  if (add) {
    add.textContent = c('pu.add');
    // ONLY WHEN THE COUNT IS UNKNOWN. This button exists for the "More than 30"
    // option, where productCount() is NaN and the card list has no number to
    // follow. It was rendered at every count, and pressing it added a card
    // WITHOUT touching select[name="products"] — so a customer who ordered
    // three products and pressed it twice uploaded photos for five and was
    // quoted for three, with the two screens contradicting each other and
    // neither flagging it. A card list that can disagree with the price is
    // worse than a card list that cannot grow.
    const syncAdd = () => { add.hidden = !Number.isNaN(productCount()); };
    syncAdd();
    document.addEventListener('change', (e) => {
      if (e.target && e.target.name === 'products') syncAdd();
    });
    add.addEventListener('click', () => {
      if (cards.length >= maxCards()) return;
      addCard();
      refreshUploader();
      const last = cards[cards.length - 1];
      if (last && last.input) last.input.focus();
    });
  }

  bindBulkDrag();
  syncCards();
}

/**
 * Drag onto the step, not onto the dashed box — the box is where people aim,
 * the step is where they let go. A slot's own drop handler stops propagation,
 * so a photograph dropped on a slot is not also swept into the bulk sorter.
 */
function bindBulkDrag() {
  const zone = stepNode(2);
  const drop = q('.pu-drop');
  if (!zone) return;
  const paint = (on) => { if (drop) drop.classList.toggle('is-dragover', on); };

  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      paint(true);
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => {
      if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
      paint(false);
    })
  );
  zone.addEventListener('drop', (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    readDrop(e.dataTransfer).then(intake);
  });
}

// ── READING A DROP ───────────────────────────────────────────────────────────

/**
 * Everything in a drop, as { file, path } pairs, folders walked.
 *
 * DataTransfer.files flattens a folder drag to nothing at all — the directory
 * simply is not in the list — so a customer who drags the folder their export
 * wrote gets silence. webkitGetAsEntry is the only way to see it, and it has to
 * be called synchronously while the drop event is still on the stack, which is
 * why the entries are collected before the first await.
 *
 * Non-standard and unprefixed nowhere, so the plain files list is the fallback
 * and stays the whole answer on a browser without it.
 */
function readDrop(dt) {
  const flat = () => [...(dt.files || [])].map((file) => ({ file, path: file.name }));
  let entries = [];
  try {
    entries = [...(dt.items || [])]
      .map((it) => (typeof it.webkitGetAsEntry === 'function' ? it.webkitGetAsEntry() : null))
      .filter(Boolean);
  } catch {
    entries = [];
  }
  if (!entries.length) return Promise.resolve(flat());

  const out = [];
  return Promise.all(entries.map((en) => walkEntry(en, '', out, 0)))
    .then(() => (out.length ? out : flat()))
    .catch(() => flat());
}

/**
 * One entry, recursively. Never rejects: a directory the browser refuses to
 * read costs us that directory, not the drop.
 *
 * The depth cap is not paranoia about the filesystem — readEntries hands back
 * at most 100 entries per call and has to be pumped until it returns none, and
 * a symlink loop presented through this API would pump forever.
 */
function walkEntry(entry, prefix, out, depth) {
  return new Promise((resolve) => {
    if (!entry || depth > 8 || out.length > Number(cfg.maxBatchFiles) * 2) return resolve();
    if (entry.isFile) {
      entry.file(
        (file) => { out.push({ file, path: prefix + file.name }); resolve(); },
        () => resolve()
      );
      return;
    }
    if (!entry.isDirectory) return resolve();
    const reader = entry.createReader();
    const pump = () => {
      reader.readEntries((batchEntries) => {
        if (!batchEntries.length) return resolve();
        Promise.all(batchEntries.map((en) => walkEntry(en, `${prefix + entry.name}/`, out, depth + 1)))
          .then(pump, resolve);
      }, () => resolve());
    };
    pump();
  });
}

// ── SORTING A DROP INTO PRODUCTS ─────────────────────────────────────────────

/**
 * What is left of a filename once the word naming the angle is taken out.
 *
 * TSHIRT-01-front.jpg → TSHIRT-01, and so does TSHIRT-01-back.jpg, which is how
 * two loose files with no folder between them end up on the same card. A token
 * is dropped when guessShot() recognises it ON ITS OWN, so the test here and
 * the test that picks the slot are the same test — one table, in shots.js.
 */
function stemOf(name) {
  const base = String(name || '').replace(/\.[A-Za-z0-9]+$/, '');
  return base
    .split(/[^A-Za-z0-9]+/)
    .filter((part) => part && !guessShot(part))
    .join('-');
}

/**
 * A drop, distributed. Folders first, then loose files that name their angle,
 * then the tray for everything that said nothing.
 */
function intake(entries) {
  if (!entries || !entries.length) return;
  const groups = new Map();
  const loose = [];

  entries.forEach((en) => {
    if (!en || !en.file) return;
    const folder = productKeyFromPath(en.path);
    if (folder) {
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(en);
      return;
    }
    // No folder. The filename gets one chance to say what it is; a name that
    // says nothing is not evidence and is not guessed at.
    const stem = guessShot(en.file.name) ? stemOf(en.file.name) : '';
    if (stem) {
      if (!groups.has(stem)) groups.set(stem, []);
      groups.get(stem).push(en);
      return;
    }
    loose.push(en);
  });

  groups.forEach((items, label) => placeGroup(label, items));
  loose.forEach((en) => trayAdd(en.file));
  refreshUploader();
}

/**
 * The card a group of files belongs on: the one already called that, else the
 * first that is empty and unnamed, else a new one. Never displaces a card the
 * customer has already filled in — a second drop must not overwrite the first.
 */
function cardForGroup(label) {
  const wanted = String(label || '').trim().toLowerCase();
  const named = cards.find((card) => card.input && card.input.value.trim().toLowerCase() === wanted);
  if (named) return named;
  const blank = cards.find((card) => (!card.input || !card.input.value.trim()) && !SHOT_IDS.some((id) => card.slots[id].file));
  if (blank) return blank;
  if (cards.length < maxCards()) return addCard();
  return null;
}

function placeGroup(label, items) {
  const card = cardForGroup(label);
  if (!card) {
    // More products in the drop than this order can hold. Nothing is thrown
    // away; it lands in the tray with a menu on it.
    items.forEach((en) => trayAdd(en.file));
    return;
  }
  if (card.input && !card.input.value.trim()) card.input.value = label;

  items.forEach((en) => {
    const guess = guessShot(en.file.name);
    const id = guess && slotOpen(card, guess) ? guess : firstOpenSlot(card);
    if (!id) { trayAdd(en.file); return; }
    placeFile(card, id, en.file);
  });
}

// ── THE CARDS ────────────────────────────────────────────────────────────────

/**
 * The card list follows the count on step 1, and follows it BOTH WAYS.
 *
 * The count is the answer to "how many products", so it is the answer to "how
 * many cards". Shrinking it does not throw photographs away: whatever was on a
 * card that no longer exists goes to the tray, where it can be placed again or
 * removed on purpose. The "more than one window holds" option is not a number
 * (productCount() returns NaN for it by design), so it leaves the list alone
 * and the customer adds cards themselves.
 */
function syncCards() {
  const host = q('[data-pl-cards]');
  if (!host) return;
  const n = productCount();
  const want = Number.isInteger(n) && n > 0 ? Math.min(n, maxCards()) : Math.max(cards.length, 1);

  while (cards.length > want) dropCard(cards[cards.length - 1]);
  while (cards.length < want) addCard();
  refreshUploader();
}

function addCard() {
  const host = q('[data-pl-cards]');
  if (!host) return null;
  const n = cards.length + 1;
  // COLLAPSED ON ARRIVAL, except the first. Twenty-five empty cards all open is
  // 12,265px of step on a 390px phone — fourteen and a half screens to answer
  // one question. The customer works down the list one product at a time, so
  // that is the shape the list takes: the first card is open, the rest are one
  // tap away, and the bulk drop fills them all without any of this mattering.
  const card = { n, key: `p${n}`, slots: {}, el: null, input: null, collapsed: n > 1, wasReady: false };
  SHOT_IDS.forEach((id) => { card.slots[id] = EMPTY_SLOT(); });
  buildCard(card);
  cards.push(card);
  host.appendChild(card.el);
  return card;
}

function dropCard(card) {
  SHOT_IDS.forEach((id) => {
    const s = card.slots[id];
    // Back to the tray rather than to the bin. The customer answered a question
    // about the order, not a question about this photograph.
    if (s.file && s.status !== 'failed') trayAdd(s.file);
    clearSlot(card, id);
  });
  if (card.el) card.el.remove();
  cards = cards.filter((x) => x !== card);
}

function buildCard(card) {
  const li = document.createElement('li');
  li.className = 'pu-card';

  const head = document.createElement('div');
  head.className = 'pu-head';

  const num = document.createElement('span');
  num.className = 'pu-n';
  num.textContent = String(card.n).padStart(2, '0');

  // NAMED, AND THE NAME POSTS. `product_p3` is not in /api/order's TOP_FIELDS,
  // so it lands in details_json with the rest of the brief and needs no server
  // change at all — while the per-file mapping travels separately in R2's
  // customMetadata and becomes a files row. One fact, one home, joined on `p3`.
  const input = document.createElement('input');
  input.className = 'input pu-name';
  input.type = 'text';
  input.name = `product_${card.key}`;
  input.placeholder = c('pu.productName');
  input.setAttribute('aria-label', `${c('pu.productName')} — ${c('pu.product', { n: card.n })}`);
  input.autocomplete = 'off';
  input.addEventListener('change', () => { renderTray(); paintCard(card); });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'pu-toggle';
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', c('pu.toggle'));
  toggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6 L8 11 L13 6"/></svg>';
  toggle.addEventListener('click', () => {
    card.collapsed = !card.collapsed;
    paintCard(card);
  });

  const state = document.createElement('span');
  state.className = 'pu-state';

  head.append(num, input, toggle, state);

  const slots = document.createElement('div');
  slots.className = 'pu-slots';
  slots.id = `pu-slots-${card.key}`;
  SHOT_IDS.forEach((id) => slots.appendChild(buildSlot(card, id)));

  // The three optional questions, folded into the SAME disclosure as the four
  // slots — aria-controls takes a list, so one toggle honestly names both.
  const about = buildAbout(card);
  toggle.setAttribute('aria-controls', `${slots.id} ${about.id}`);

  li.append(head, slots, about);
  card.el = li;
  card.input = input;
  card.stateEl = state;
  card.toggleEl = toggle;
  paintCard(card);
}

/**
 * The questions from src/data/attributes.js, on one card. Today that is one:
 * what the product is made of.
 *
 * LABEL AND CONTROL, AND NOTHING ELSE ON THE CARD. The question carries a
 * `buys` sentence saying what answering is worth, and it is genuinely worth
 * reading — which is exactly why it is not printed here. One sentence × 25
 * cards is 25 paragraphs of the same sentence, and that multiplication is the
 * standing complaint this whole step was rebuilt to answer. So
 * ProductUploader.astro prints it ONCE, in the guide at the top, in a
 * paragraph with the id #pu-q-<question>-buys, and every control on every card
 * reaches that paragraph two ways: aria-describedby for assistive technology
 * and the keyboard, `title` for a pointer.
 *
 * IT IS OPTIONAL, on Lucas's explicit direction. No `required`, no
 * data-pl-req, nothing anywhere in this function that can stop Continue —
 * removing every answer from every card must change nothing about whether the
 * order goes through, exactly as it is for the photographs.
 *
 * NAMED, AND THE NAME POSTS: `material_p3`, alongside the `product_p3` above.
 * It is an answer about product p3 and it lands in details_json with it; the
 * key `p3` is what joins them to the file rows.
 *
 * The select branch below is kept although no question is a select today —
 * attributes.js is the place that decides, and a data file that can only
 * express text inputs is a data file that will be edited in two places.
 *
 * A function declaration for the reason EMPTY_SLOT() gives above: this is
 * reached from init() before the rest of the module has finished evaluating.
 */
function buildAbout(card) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-about';
  wrap.id = `pu-about-${card.key}`;
  // A group rather than a fieldset: a <legend> would print "About the product"
  // on every card, which is the text wall again, one heading at a time.
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `${c('pu.about')} — ${c('pu.product', { n: card.n })}`);

  card.answers = {};

  PRODUCT_QUESTIONS.forEach((qn) => {
    const field = document.createElement('div');
    field.className = 'pu-q';
    const id = `pu-q-${qn.id}-${card.key}`;

    const label = document.createElement('label');
    label.className = 'pu-q-label';
    label.htmlFor = id;
    label.textContent = c(`pu.q.${qn.id}.name`);

    let ctrl;
    if (qn.type === 'select') {
      ctrl = document.createElement('select');
      ctrl.className = 'select pu-q-field';
      qn.options.forEach((o) => {
        const opt = document.createElement('option');
        // The wire value, straight off attributes.js — the list /api/order
        // checks against. The blank "not sure" stays blank, so an unanswered
        // fit posts nothing rather than posting a fifth fit that does not exist.
        opt.value = o.id;
        opt.textContent = c(`pu.qopt.${qn.id}.${o.id || '_'}`);
        ctrl.appendChild(opt);
      });
    } else {
      ctrl = document.createElement('input');
      ctrl.className = 'input pu-q-field';
      ctrl.type = 'text';
      ctrl.autocomplete = 'off';
      const ph = c(`pu.q.${qn.id}.placeholder`);
      if (ph) ctrl.placeholder = ph;
      // The same ceiling the server enforces. Belt and braces, not a gate:
      // maxlength stops typing past it, it never refuses a submit.
      if (qn.maxLength) ctrl.maxLength = qn.maxLength;
      // Suggestions, not a closed list — and only when the <datalist> is
      // actually on the page, so a missing one costs the suggestions and
      // nothing else.
      if (document.getElementById(`pu-dl-${qn.id}`)) ctrl.setAttribute('list', `pu-dl-${qn.id}`);
    }

    ctrl.id = id;
    ctrl.name = `${qn.id}_${card.key}`;

    const buys = c(`pu.q.${qn.id}.buys`);
    if (buys) ctrl.title = buys;
    if (document.getElementById(`pu-q-${qn.id}-buys`)) {
      ctrl.setAttribute('aria-describedby', `pu-q-${qn.id}-buys`);
    }

    field.append(label, ctrl);

    // A live swatch for a question that carries a colour (attributes.js sets
    // `swatch`). It appears only once the value parses as a hex and vanishes
    // again for a word — so it confirms "we read a colour" without ever
    // implying that a name is the wrong answer. normalizeHex() is the same
    // parser the background picker uses, which is why #EEE works here too.
    if (qn.swatch) {
      const dot = document.createElement('span');
      dot.className = 'pu-q-swatch';
      dot.setAttribute('aria-hidden', 'true');
      const paintDot = () => {
        const hex = normalizeHex(ctrl.value);
        dot.style.setProperty('--swatch', hex || 'transparent');
        dot.hidden = !hex;
      };
      ctrl.addEventListener('input', paintDot);
      paintDot();
      field.appendChild(dot);
      field.classList.add('pu-q-has-swatch');
    }

    wrap.appendChild(field);
    card.answers[qn.id] = ctrl;
  });

  wrap.appendChild(buildExtras(card));

  // THE FIRST CARD CARRIES THE COPY-DOWN, and only the first. A button on
  // every card is 25 buttons doing 25 slightly different things; one, at the
  // top of the list, is the affordance attributes.js asks for.
  if (card.n === 1) wrap.appendChild(buildCopyDown(card));
  // Both events, because a <select> fires change and an <input> fires input,
  // and the copy-down has to know the moment there is something to copy.
  ['input', 'change'].forEach((ev) => wrap.addEventListener(ev, () => syncCopyDown(cards[0])));

  return wrap;
}

/**
 * Extra photos on one product — a counter, and a description that only exists
 * once the counter is above zero.
 *
 * WHY THE DESCRIPTION IS CONDITIONAL. attributes.js's own header states the
 * rule this has to live with: "A field per product times thirty products is
 * thirty units of friction, so anything that can be asked once per ORDER is
 * asked once per order." A free-text box on all thirty cards is exactly what
 * that paragraph refuses. The reconciliation is that the COUNTER is cheap —
 * one small select sitting at 0 costs a glance — and the box it reveals is
 * only ever seen by somebody who has already said they want one. A 25-product
 * order with no extras shows 25 zeros and not a single textarea.
 *
 * WHY IT IS NOT IN attributes.js. That file is product FACTS, the things that
 * change what the renderer does with a garment. How many extra frames somebody
 * is buying is a commercial choice about the order, so it is built here and
 * priced from pricing.js. Keeping it out of PRODUCT_QUESTIONS also keeps that
 * array's "a second question is a data edit" property true.
 *
 * A <select> rather than <input type=number>, matching outfit_count: it is a
 * short closed range, and a number spinner invites a typed 40 that the form
 * then has to argue with.
 */
/*
 * ── EXTRA FOTO'S: N GEKOZEN IS N UPLOADVAKKEN ────────────────────────────────
 *
 * Lucas, 8 augustus 2026: *"een extra foto toevoegen zou een extra upload vak
 * moeten openen maar opent nu een tekstblok. Wanneer je 1 extra foto kiest krijg
 * je 1 upload mogelijkheid erbij met daaronder een verplichte notitie van wat de
 * klant wilt, foto is niet verplicht notitie wel, en 3 extra foto's dus 3 upload
 * mogelijkheden erbij."*
 *
 * Wat er stond was één tekstveld voor alle bijbestelde foto's samen. Bij drie
 * extra's moest de klant dus drie wensen in één regel proppen, en er was geen
 * plek voor het voorbeeld dat de wens uitlegt.
 *
 * DE OMGEKEERDE VERPLICHTING. Bij de vier vaste hoeken is de FOTO het antwoord.
 * Hier is de BESCHRIJVING het antwoord en is de foto een hulpmiddel: wij maken
 * het beeld, de klant zegt wat het moet worden. Dus notitie verplicht, foto niet.
 *
 * HOE DE VERPLICHTING WORDT AFGEDWONGEN. Via dataset.plReq, dezelfde ene bron die
 * syncRequired() leest — niet via een `required`-attribuut, want de sweep in
 * bindForm() die attributen omzet is al gedraaid als deze kaarten gebouwd worden.
 * syncRequired() kijkt bovendien of het veld ZICHTBAAR is, dus een rij die weer
 * dichtgaat houdt niemand tegen. Stap 2 had tot vandaag niets met plReq erop en
 * was daarmee feitelijk geen poort; dit is het eerste veld dat er wel een van
 * maakt, en alleen voor wie extra's bijbestelt.
 *
 * ROWS WORDEN ÉÉN KEER GEBOUWD EN DAARNA BEWAARD. Niet opnieuw opgebouwd bij elke
 * wijziging van de teller: wie van 3 naar 1 en terug naar 3 gaat, zou anders twee
 * al geüploade voorbeelden kwijt zijn. Ze worden ook pas gebouwd als iemand ze
 * nodig heeft — bij dertig producten zou vier sloten per kaart vooruitbouwen
 * honderdtwintig widgets in de pagina zetten die niemand heeft gevraagd.
 */
function buildExtras(card) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-extra';

  const max = Math.max(0, Math.floor(Number(cfg.maxExtraPerProduct) || 0));

  const head = document.createElement('span');
  head.className = 'pu-extra-h';
  head.textContent = c('pu.extraH');

  const countField = document.createElement('div');
  countField.className = 'pu-q pu-extra-count';
  const countId = `pu-extra-${card.key}`;
  const countLabel = document.createElement('label');
  countLabel.className = 'pu-q-label';
  countLabel.htmlFor = countId;
  countLabel.textContent = c('pu.extraCount');
  const select = document.createElement('select');
  select.className = 'select pu-q-field';
  select.id = countId;
  select.name = `extra_${card.key}`;
  for (let i = 0; i <= max; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    select.appendChild(opt);
  }
  countField.append(countLabel, select);

  const rows = document.createElement('div');
  rows.className = 'pu-extra-rows';

  const rate = document.createElement('span');
  rate.className = 'pu-extra-rate';

  const built = new Map();

  const ensure = (i) => {
    if (built.has(i)) return built.get(i);
    const id = extraShotId(i);
    // Het slot leeft in card.slots, naast de vaste hoeken. Alles wat readiness,
    // voortgang en de "lege kaart"-toets berekent, loopt over SHOT_IDS en niet
    // over card.slots — dus een extra slot telt daar niet mee, en dat is precies
    // goed: een bijbestelde foto is geen ontbrekende hoek.
    if (!card.slots[id]) card.slots[id] = EMPTY_SLOT();

    const row = document.createElement('div');
    row.className = 'pu-extra-row';
    row.dataset.puExtraRow = String(i);

    row.appendChild(buildSlot(card, id));
    // buildSlot() bouwt alleen; paintSlot() bepaalt wat je ziet. Voor de vaste
    // hoeken doet buildCard() dat in zijn eigen lus — sla je het hier over, dan
    // staan Vervangen, Verwijderen en Overslaan onder een leeg vak, want die
    // elementen beginnen zichtbaar en worden pas door paintSlot() weggezet.
    paintSlot(card, id);

    const noteField = document.createElement('div');
    noteField.className = 'pu-q pu-extra-note';
    const noteId = `pu-extra-note-${card.key}-${i}`;
    const noteLabel = document.createElement('label');
    noteLabel.className = 'pu-q-label';
    noteLabel.htmlFor = noteId;
    noteLabel.textContent = c('pu.extraNoteLabel', { n: i });
    const note = document.createElement('input');
    note.className = 'input pu-q-field';
    note.type = 'text';
    note.id = noteId;
    note.name = `extra_note_${card.key}_${i}`;
    note.autocomplete = 'off';
    note.maxLength = 200;
    const ph = c('pu.extraPlaceholder');
    if (ph) note.placeholder = ph;
    note.dataset.plReq = '1';
    note.dataset.plErrMsg = c('pu.extraNoteErr', { n: i });
    const hint = document.createElement('span');
    hint.className = 'pu-q-hint';
    hint.textContent = c('pu.extraShotHint');
    noteField.append(noteLabel, note, hint);
    row.appendChild(noteField);

    rows.appendChild(row);
    const entry = { i, id, row, note };
    built.set(i, entry);
    return entry;
  };

  const paint = () => {
    const n = Math.min(max, Number(select.value) || 0);
    for (let i = 1; i <= n; i++) {
      const r = ensure(i);
      r.row.hidden = false;
      r.note.disabled = false;
    }
    built.forEach((r, i) => {
      if (i <= n) return;
      r.row.hidden = true;
      r.note.disabled = true;
      r.note.value = '';
      // Ook het beeld weg. Zelfde reden als bij de oude notitie: een voorbeeld
      // dat is geüpload en daarna weggeklikt mag niet meereizen en geproduceerd
      // worden. clearSlot() haalt hem ook uit de staging-lijst.
      if (card.slots[r.id] && (card.slots[r.id].file || card.slots[r.id].key)) clearSlot(card, r.id);
    });
    rate.textContent = c('pu.extraRate', { rate: euro(extraRateNow()), max });
    // De verplichting van de notities hangt aan zichtbaarheid, dus na elke
    // wijziging opnieuw laten bepalen.
    syncRequired();
  };

  select.addEventListener('change', () => { paint(); syncTotal(); refreshUploader(); });
  card.extra = select;
  card.paintExtra = paint;
  paint();

  wrap.append(head, countField, rows, rate);
  return wrap;
}

/** The extra-photo rate at the order's CURRENT product count. */
function extraRateNow() {
  const rungs = cfg.extraPhotoLadder || [];
  const n = Math.max(1, Math.floor(productCount()) || 1);
  const rung = rungs.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  return rung ? rung[2] : 0;
}

/** Every extra photo asked for across every card. */
function extrasCount() {
  return cards.reduce((n, card) => n + (Number(card.extra && card.extra.value) || 0), 0);
}

/**
 * "Same for every product?" — the answer a brand ordering 25 t-shirts in one
 * fabric should only have to give once.
 *
 * IT FILLS EMPTIES AND NEVER OVERWRITES. Someone who has already typed
 * "cow leather, matte" on product 9 has said something more specific than this
 * button can, and a copy-down that flattened it would be a destructive action
 * on a form with no undo. So the rule is one line long and it is the whole
 * design: an answer that is already there wins.
 *
 * It says what it did, out loud, in a live region. A button that silently
 * changes eleven fields further down a list the customer cannot see is
 * indistinguishable from a button that is broken.
 */
function buildCopyDown(card) {
  const row = document.createElement('div');
  row.className = 'pu-copy';

  const label = document.createElement('span');
  label.className = 'pu-copy-label';
  label.textContent = c('pu.sameForAll');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pu-copy-btn';
  btn.textContent = c('pu.copyDown');
  // Nothing to copy yet. Disabled rather than hidden: a control that appears
  // as you type is a control nobody finds, and pressing it with three empty
  // fields could only ever announce "copied to 0 products".
  btn.disabled = true;

  const hint = document.createElement('span');
  hint.className = 'pu-copy-hint';
  hint.textContent = c('pu.sameForAllHint');

  const said = document.createElement('span');
  said.className = 'pu-copy-said';
  said.setAttribute('aria-live', 'polite');

  btn.addEventListener('click', () => {
    const n = copyAnswersDown(card);
    // Singular has its own string: Dutch needs 'product' against
    // 'producten', which no suffix hack spells for both languages.
    said.textContent = n === 1 ? c('pu.copiedOne') : c('pu.copied', { n });
  });

  row.append(label, btn, hint, said);
  card.copyRow = row;
  card.copyBtn = btn;
  return row;
}

/** Fill every other card's empty answers from this one. Returns how many cards changed. */
function copyAnswersDown(from) {
  if (!from || !from.answers) return 0;
  let n = 0;
  cards.forEach((card) => {
    if (card === from || !card.answers) return;
    let touched = false;
    PRODUCT_QUESTIONS.forEach((qn) => {
      const src = from.answers[qn.id];
      const dst = card.answers[qn.id];
      if (!src || !dst) return;
      const value = String(src.value || '').trim();
      if (!value) return;                              // nothing to give
      if (String(dst.value || '').trim()) return;      // already answered — leave it
      dst.value = value;
      touched = true;
    });
    if (touched) n += 1;
  });
  return n;
}

/** The copy-down only makes sense with an answer to copy and a card to copy to. */
function syncCopyDown(card) {
  if (!card || !card.copyRow) return;
  card.copyRow.hidden = cards.length < 2;
  if (!card.copyBtn) return;
  card.copyBtn.disabled = !PRODUCT_QUESTIONS.some((qn) => {
    const el = card.answers && card.answers[qn.id];
    return el && String(el.value || '').trim();
  });
}

function buildSlot(card, id) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-slot';
  wrap.dataset.puSlot = id;
  wrap.dataset.state = 'empty';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pu-slot-btn';

  const dia = document.createElement('span');
  dia.className = 'pu-slot-dia';
  const tpl = q(`[data-pl-dia="${id}"]`);
  if (tpl && tpl.content) dia.appendChild(tpl.content.cloneNode(true));

  const img = document.createElement('img');
  img.className = 'pu-slot-img';
  img.alt = '';
  img.hidden = true;
  // A HEIC off an iPhone is a file this browser cannot decode. The upload is
  // fine and the slot is filled; there is simply no picture, so the drawing
  // stays rather than leaving an empty grey box.
  img.addEventListener('load', () => { card.slots[id].thumb = true; paintSlot(card, id); });
  img.addEventListener('error', () => { card.slots[id].thumb = false; paintSlot(card, id); });

  const nameEl = document.createElement('span');
  nameEl.className = 'pu-slot-name';
  nameEl.textContent = shotLabel(id);

  btn.append(dia, img, nameEl);

  if (isRequiredShot(id)) {
    const req = document.createElement('span');
    req.className = 'pu-slot-req';
    req.textContent = c('pu.required');
    btn.appendChild(req);
  }

  const file = document.createElement('input');
  file.type = 'file';
  file.className = 'pu-slot-input';
  file.accept = 'image/*';
  file.tabIndex = -1;
  file.setAttribute('aria-hidden', 'true');
  file.addEventListener('change', () => {
    const picked = file.files && file.files[0];
    file.value = '';
    if (picked) { placeFile(card, id, picked); refreshUploader(); }
  });

  btn.addEventListener('click', () => file.click());

  const bar = document.createElement('span');
  bar.className = 'pu-slot-bar';
  bar.innerHTML = '<i></i>';

  const msg = document.createElement('span');
  msg.className = 'pu-slot-msg';
  msg.setAttribute('aria-live', 'polite');

  const acts = document.createElement('span');
  acts.className = 'pu-acts';
  const act = (label, fn) => {
    const b = button(label, 'pu-act');
    b.addEventListener('click', fn);
    acts.appendChild(b);
    return b;
  };
  const replaceBtn = act(c('pu.replace'), () => file.click());
  const removeBtn = act(c('pu.remove'), () => { clearSlot(card, id); refreshUploader(); });
  // THE SKIP IS A CONTROL, NOT AN ABSENCE. The optional shots — detail and worn
  // since the back became required — belong to a customer who has decided not to
  // send one and wants to say so: an empty slot cannot tell "not yet" from "not
  // at all", and the card's own state line would keep asking. Every skip is
  // undoable in one click, in place. Required slots get no skip button at all,
  // which is the only place the rule is enforced in the UI rather than argued.
  // ── GEEN OVERSLAAN-KNOP OP EEN EXTRA FOTO ───────────────────────────────────
  // Bij een vaste hoek die niet verplicht is (detail, draagfoto) betekent
  // "overslaan" iets echts: de klant zegt dat hij hem niet stuurt en de kaart
  // stopt erom te vragen. Bij een bijbestelde foto is er niets om over te slaan
  // — het beeld is een voorbeeld dat mag ontbreken, en wat er wél moet staan is
  // de beschrijving in het veld ernaast. Een overslaan-knop zou suggereren dat
  // je een extra die je hebt besteld kunt laten vallen; dat doe je met de teller.
  const skipBtn = (isRequiredShot(id) || extraSlotNumber(id)) ? null : act(c('pu.skipShot'), () => {
    clearSlot(card, id);
    card.slots[id].status = 'skipped';
    paintSlot(card, id);
    refreshUploader();
  });
  // clearSlot(), NOT a fresh EMPTY_SLOT(): the slot record carries the handles
  // to its own elements, and replacing it wholesale left a slot that could
  // never be painted again — visibly stuck on "skipped" with every control on
  // it dead. An undo that cannot be undone is worse than no undo.
  const undoBtn = isRequiredShot(id) ? null : act(c('pu.undoSkip'), () => {
    clearSlot(card, id);
    refreshUploader();
  });

  wrap.append(btn, bar, msg, acts, file);

  // Drop a tray item — or a file straight off the desktop — onto this slot.
  // stopPropagation so the step's bulk sorter does not also take it.
  ['dragenter', 'dragover'].forEach((ev) =>
    wrap.addEventListener(ev, (e) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      e.stopPropagation();
      wrap.classList.add('is-over');
    })
  );
  wrap.addEventListener('dragleave', (e) => {
    if (wrap.contains(e.relatedTarget)) return;
    wrap.classList.remove('is-over');
  });
  wrap.addEventListener('drop', (e) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.stopPropagation();
    wrap.classList.remove('is-over');
    const dropped = [...(e.dataTransfer.files || [])];
    if (dropped.length) { placeFile(card, id, dropped[0]); refreshUploader(); return; }
    const trayKey = e.dataTransfer.getData('text/plain') || dragging;
    placeFromTray(trayKey, card.key, id);
  });

  card.slots[id].el = { wrap, btn, dia, img, nameEl, bar, msg, replaceBtn, removeBtn, skipBtn, undoBtn };
  return wrap;
}

// ── PAINT ────────────────────────────────────────────────────────────────────

function paintSlot(card, id) {
  const s = card.slots[id];
  const el = s.el;
  if (!el) return;

  el.wrap.dataset.state = s.status === 'done' ? 'filled' : s.status;
  el.wrap.classList.toggle('is-thumb', !!s.url && s.thumb);

  if (s.url && el.img.getAttribute('src') !== s.url) el.img.src = s.url;
  if (!s.url) { el.img.removeAttribute('src'); s.thumb = false; }
  el.img.hidden = !(s.url && s.thumb);
  el.dia.hidden = !!(s.url && s.thumb);

  // The track only exists while there is something to track. An empty slot
  // showing a 0% bar draws a rule under every slot in the card, which reads as
  // a divider rather than as progress.
  const fill = el.bar.querySelector('i');
  if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(100, s.pct)) / 100})`;
  el.bar.hidden = !s.file;
  el.msg.textContent = s.msg || '';

  const filled = !!s.file;
  el.replaceBtn.hidden = !filled;
  el.removeBtn.hidden = !filled;
  if (el.skipBtn) el.skipBtn.hidden = filled || s.status === 'skipped';
  if (el.undoBtn) el.undoBtn.hidden = s.status !== 'skipped';

  const what = filled ? `${shotLabel(id)} — ${s.file.name}` : shotLabel(id);
  el.btn.setAttribute('aria-label', `${what} · ${cardLabel(card)}`);
}

function paintCard(card) {
  if (!card.el) return;
  const ready = cardReady(card);

  // The collapse follows readiness, and only on the CHANGE — otherwise a card
  // the customer deliberately opened to add a detail shot would slam shut on
  // the next repaint.
  if (ready !== card.wasReady) {
    card.collapsed = ready;
    card.wasReady = ready;
    // Hand the list on. A card that just became ready closes, so the next one
    // that still needs a front shot opens — otherwise finishing a card leaves
    // the customer looking at nothing and hunting for the next tap.
    if (ready) {
      const next = cards.find((k) => k !== card && !cardReady(k));
      if (next && next.collapsed) {
        next.collapsed = false;
        if (next.el) next.el.classList.remove('is-collapsed');
        if (next.toggleEl) next.toggleEl.setAttribute('aria-expanded', 'true');
      }
    }
  }

  card.el.classList.toggle('is-ready', ready);
  card.el.classList.toggle('is-collapsed', card.collapsed);
  if (card.toggleEl) card.toggleEl.setAttribute('aria-expanded', card.collapsed ? 'false' : 'true');
  if (card.stateEl) card.stateEl.textContent = ready ? c('pu.ready') : c('pu.needsShots', { list: shotListText(missingRequired(card)) });
  SHOT_IDS.forEach((id) => paintSlot(card, id));
}

/**
 * "8 of 25 products ready", never "31 files uploaded".
 *
 * A file count is a receipt for work the customer cannot check. What they can
 * act on is which products are short of a photograph we cannot work without —
 * the front or the back — so that is the sentence, and the optional photos are
 * counted after it as an addition rather than as a second obligation.
 */
function progressText() {
  const total = cards.length;
  if (!total) return '';
  const done = cards.filter(cardReady).length;
  const extra = cards.reduce(
    (n, card) => n + SHOT_IDS.filter((id) => !isRequiredShot(id) && slotFilled(card, id)).length,
    0
  );
  // Singular branches for the one-product order, which is the entry point of
  // the whole ladder — the flow was telling that customer "0 of 1 products
  // ready" while step 5 of the same flow said "1 product".
  const head = done === total
    ? (total === 1 ? c('pu.allDoneOne') : c('pu.allDone', { total }))
    : (total === 1 ? c('pu.progressOne', { done }) : c('pu.progress', { done, total }));
  // Singular has its own string rather than an "(s)": Dutch pluralises the
  // noun AND takes an apostrophe (foto → foto’s), so a suffix hack cannot
  // spell both languages correctly.
  if (!extra) return head;
  const tail = extra === 1 ? c('pu.progressExtraOne') : c('pu.progressExtra', { n: extra });
  return `${head} · ${tail}`;
}

function refreshUploader() {
  cards.forEach(paintCard);
  // The card count moves with the count on step 1, and the copy-down has
  // nothing to say while there is one card.
  syncCopyDown(cards[0]);
  const out = q('[data-pl-progress]');
  if (out) out.textContent = progressText();
  const add = q('[data-pl-add]');
  if (add) add.hidden = cards.length >= maxCards();
  renderTray();
}

// ── THE TRAY ─────────────────────────────────────────────────────────────────

/**
 * Files we could not attribute to a product.
 *
 * DRAG IS NOT THE ONLY WAY IN, and that is not a nicety: this step gets used on
 * a phone by someone photographing garments, and a touch screen has no drag
 * onto a target the size of a slot. Every item therefore carries a menu of
 * every product against every shot, worked by tap, by click and by keyboard,
 * and the drag is the shortcut for whoever has a mouse.
 *
 * Tray files are NOT uploaded. A file with no product and no angle is exactly
 * the batch this whole change exists to stop, so it waits until it is placed —
 * which also means a tray item costs nothing if the customer removes it.
 */
function trayAdd(file) {
  trayN += 1;
  tray.push({ id: `t${trayN}`, file, url: objectUrl(file) });
}

function trayDrop(item) {
  if (item.url) URL.revokeObjectURL(item.url);
  tray = tray.filter((x) => x !== item);
}

function placeFromTray(trayKey, cardKey, shotId) {
  const item = tray.find((x) => x.id === trayKey);
  const card = cards.find((x) => x.key === cardKey);
  if (!item || !card || !isShot(shotId)) return;
  placeFile(card, shotId, item.file);
  trayDrop(item);
  refreshUploader();
}

function isShot(id) {
  return SHOT_IDS.indexOf(id) !== -1;
}

/**
 * Rebuilt only when it would look different.
 *
 * Every option in every tray item's menu is a product against a shot, so at
 * twenty-five products one item is a hundred <option> elements — and this is
 * called from refreshUploader(), which runs once per file as a batch of a
 * hundred photographs lands. Without the signature that is ten thousand
 * elements built and thrown away per drop, on a phone.
 */
function renderTray() {
  const host = q('[data-pl-tray]');
  const list = q('[data-pl-tray-list]');
  if (!host || !list) return;

  const sig = JSON.stringify([tray.map((x) => x.id), cards.map(cardLabel)]);
  if (sig === traySig) return;
  traySig = sig;

  host.hidden = !tray.length;
  list.textContent = '';

  tray.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'pu-tray-item';
    li.draggable = true;
    li.dataset.puTray = item.id;
    li.addEventListener('dragstart', (e) => {
      dragging = item.id;
      li.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
      }
    });
    li.addEventListener('dragend', () => { dragging = ''; li.classList.remove('is-dragging'); });

    const thumb = document.createElement('img');
    thumb.className = 'pu-tray-thumb';
    thumb.alt = '';
    if (item.url) thumb.src = item.url;

    const body = document.createElement('div');
    const nameEl = document.createElement('span');
    nameEl.className = 'pu-tray-name';
    // textContent, never innerHTML — the filename is client-supplied and this
    // is the one place it reaches the DOM before the server has flattened it.
    nameEl.textContent = item.file.name;

    const row = document.createElement('div');
    row.className = 'pu-tray-row';

    const pick = document.createElement('select');
    pick.className = 'select pu-tray-pick';
    pick.setAttribute('aria-label', c('pu.placeIn'));
    cards.forEach((card) => {
      const group = document.createElement('optgroup');
      group.label = cardLabel(card);
      SHOT_IDS.forEach((id) => {
        const opt = document.createElement('option');
        opt.value = `${card.key}|${id}`;
        // The product is in the option TEXT as well as in the optgroup label,
        // because a closed <select> shows only the option — and "Front" on its
        // own, after choosing, does not say which of twenty-five products it
        // was. The group is what makes the open list scannable; the text is
        // what makes the closed one true.
        opt.textContent = `${cardLabel(card)} · ${shotLabel(id)}`;
        group.appendChild(opt);
      });
      pick.appendChild(group);
    });

    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'pu-tray-go';
    go.textContent = c('pu.trayAssign');
    go.addEventListener('click', () => {
      const [cardKey, shotId] = String(pick.value || '').split('|');
      placeFromTray(item.id, cardKey, shotId);
    });

    const del = button(c('pu.remove'), 'pu-act');
    del.addEventListener('click', () => { trayDrop(item); refreshUploader(); });

    row.append(pick, go, del);
    body.append(nameEl, row);
    li.append(thumb, body);
    list.appendChild(li);
  });
}

// ── PLACING AND SENDING ──────────────────────────────────────────────────────

function objectUrl(file) {
  try {
    return URL.createObjectURL(file);
  } catch {
    return '';
  }
}

/**
 * Put a file in a slot and start sending it.
 *
 * Replacing is remove-then-add, including the DELETE of whatever was there: the
 * placement is recorded in the R2 object's own metadata, so a slot holding two
 * objects would be two answers to one question with no way to tell which the
 * customer meant.
 */
function placeFile(card, id, file) {
  clearSlot(card, id);
  const s = card.slots[id];
  s.file = file;
  s.url = objectUrl(file);
  s.pct = 0;
  s.thumb = false;

  const bad = preflight(file, pendingCount());
  if (bad) {
    s.status = 'failed';
    s.msg = uploadError(bad.code, bad);
    paintSlot(card, id);
    return;
  }

  s.status = 'sending';
  s.msg = c('upload.sending');
  paintSlot(card, id);
  chain = chain.then(() => sendSlot(card, id)).catch(() => {});
}

function clearSlot(card, id) {
  const s = card.slots[id];
  if (s.url) URL.revokeObjectURL(s.url);
  if (s.key) removeStaged(s.key);
  const el = s.el;
  card.slots[id] = EMPTY_SLOT();
  card.slots[id].el = el;
  paintSlot(card, id);
}

/**
 * Drop a staged object, server and client.
 *
 * The row goes whatever the server said. If the DELETE fails the object is
 * orphaned in the staging prefix and the lifecycle rule collects it; what must
 * not happen is a file the client removed still arriving with their order, and
 * that is decided by `staged`, not by R2.
 */
function removeStaged(key) {
  staged = staged.filter((x) => x.key !== key);
  if (!batch) return;
  const url = `/api/upload?batch=${encodeURIComponent(batch)}&key=${encodeURIComponent(key)}`;
  fetch(url, { method: 'DELETE' }).catch(() => null);
}

function sendSlot(card, id) {
  return new Promise((resolve) => {
    const s = card.slots[id];
    if (!s.file || s.status !== 'sending') return resolve();

    // IS THIS SLOT STILL THE SLOT IT WAS. A request takes seconds and the
    // customer can spend them changing the count on step 1, which drops cards,
    // or replacing this very photograph. Either way the answer this upload is
    // recording has been superseded — and an object that lands afterwards would
    // reach the order carrying a product key for a card that no longer exists.
    // So the response is checked against the state, not assumed onto it.
    const live = () => cards.indexOf(card) !== -1 && card.slots[id] === s;

    if (uploadsOff) {
      s.status = 'failed';
      s.msg = c('upload.err.unavailable');
      paintSlot(card, id);
      refreshUploader();
      return resolve();
    }

    const fd = new FormData();
    fd.append('file', s.file);
    if (batch) fd.append('batch', batch);
    // THE TWO FIELDS THIS WHOLE STEP EXISTS FOR. The key, not the customer's
    // name for the product: a name can be retyped after the photograph is in
    // R2, and a key that changes under an object's metadata is a mapping that
    // rots. The name posts separately with the order.
    fd.append('product', card.key);
    fd.append('shot', id);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.responseType = 'text';

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      s.pct = (e.loaded / e.total) * 100;
      paintSlot(card, id);
    });

    xhr.addEventListener('error', () => {
      if (!live()) return resolve();
      s.status = 'failed';
      s.pct = 0;
      s.msg = c('upload.err.network');
      paintSlot(card, id);
      refreshUploader();
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
        if (!live()) {
          // Uploaded into a slot that is gone. Take it straight back out —
          // `staged` is what decides the order's files, and this never joins it.
          removeStaged(body.file.key);
          return resolve();
        }
        s.status = 'done';
        s.pct = 100;
        s.msg = c('upload.done');
        s.key = body.file.key;
        staged.push({
          key: body.file.key,
          name: body.file.name,
          bytes: body.file.bytes,
          product: body.file.product || card.key,
          shot: body.file.shot || id,
        });
        paintSlot(card, id);
        refreshUploader();
        return resolve();
      }

      const code = (body && body.error) || 'generic';
      if (live()) {
        s.status = 'failed';
        s.pct = 0;
        s.msg = uploadError(code, body);
      }

      // A dead bucket is not this file's problem, it is every file's problem.
      // Say so once, stop the queue, and let the order carry on without photos.
      if (code === 'unavailable') {
        uploadsOff = true;
        const off = q('[data-pl-upload-note="off"]');
        if (off) off.hidden = false;
      }
      paintSlot(card, id);
      refreshUploader();
      resolve();
    });

    xhr.send(fd);
  });
}

// ── PRE-FLIGHT ───────────────────────────────────────────────────────────────
// The caps were in the config blob from the day it was written and nothing read
// them except the error-message interpolation — so the browser accepted every
// file, and a 40 MB HEIC climbed the whole way up a phone connection before
// /api/upload answered 400 too-large. The visitor paid for that upload in time
// and in data to learn something that was knowable the moment they picked it.
//
// cfg.maxFileBytes / cfg.maxBatchFiles / cfg.uploadExt all come from
// src/lib/uploads.js by way of OrderFlow.astro, which is the same module
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
 * `queued` is how many files are already in flight, so a drop of 200 files
 * refuses the ones past the ceiling rather than sending all of them and letting
 * the server answer 400 two hundred times.
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

function uploadError(code, body) {
  if (code === 'too-large') return c('upload.err.too-large', { max: bytes(Number((body && body.max) || cfg.maxFileBytes)) });
  if (code === 'batch-full') return c('upload.err.batch-full', { max: Number((body && body.max) || cfg.maxBatchFiles) });
  if (code === 'rate') return c('upload.err.rate');
  // hasCopy, not `c(...) || c('upload.err.generic')`: a code the server invents
  // tomorrow is an expected miss here, not a broken copy table, and it must not
  // spend a console warning to fall back to the sentence that already covers it.
  return hasCopy(`upload.err.${code}`) ? c(`upload.err.${code}`) : c('upload.err.generic');
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
// `country` and `address` joined in August 2026 with the VAT work, and they are
// the two that MUST be here rather than nice to have. The collapse below hides
// step 3 for a returning customer, and a hidden <select> posts an empty string
// — which the server reads as "no country", which prices at 21%. A German
// customer with a valid VAT number would have been charged Dutch VAT because
// their own saved details were not handed back to them.
// De losse naam- en adresvelden sinds migratie 0016 — zie src/data/address.js
// voor waarom `name` en `billing_address` daarnaast blijven bestaan.
const PREFILL_FIELDS = [
  'first_name', 'last_name', 'brand', 'email', 'phone', 'website', 'vat',
  'country', 'address_line1', 'address_line2', 'postal_code', 'city', 'region',
];

/** The three the form cannot go without — nothing collapses unless all three are filled. */
// What step 3 cannot be collapsed without. `country` and `address` are on this
// list for the same reason they are on PREFILL_FIELDS: collapsing a step whose
// hidden required fields are empty is how a form gets stuck on a validation
// error pointing at a control nobody can see — and for country it is worse than
// stuck, because an empty country silently prices the order at 21%.
const REQUIRED_DETAILS = [
  'first_name', 'last_name', 'brand', 'email', 'country', 'address_line1', 'postal_code', 'city',
];

function bindPrefill() {
  accountMe()
    .then((me) => {
      if (!form) return;
      if (me) { applyAccount(me); return; }
      /*
       * ── OOK VOOR WIE NIET IS INGELOGD — 7 augustus 2026 ───────────────────
       *
       * Lucas: *"ook na het bestellen — bewaar dit zodat je het niet opnieuw
       * hoeft in te vullen."* Het aanbod stond alleen in de tak hierboven, dus
       * uitgerekend degene die alles met de hand heeft ingetypt kreeg het niet
       * te zien. Dat is de klant met de meeste reden om ja te zeggen.
       *
       * De weg is een andere: een uitgelogde bezoeker kan niet naar
       * /account/details posten, want daar hoort een sessie bij. Zijn vinkje
       * reist mee met de bestelling en wordt ingelost bij zijn eerste keer
       * inloggen — zie migrations/0017.
       */
      bindSaveOffer({ signedIn: false });
    })
    .catch(() => {}); // offline of /account/me onbereikbaar — het formulier werkt leeg ook
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
    // `select` as well as `input` — country is a <select>, and the old selector
    // silently skipped it, which is the same empty-country bug from the other
    // side. `[name=]` on either tag, and the "never overwrite" rule still holds
    // because a select with no chosen option has value ''.
    const input = q(`input[name="${key}"], select[name="${key}"]`);
    if (!input || input.value) return null; // never overwrite
    input.value = value;
    // A programmatic value change fires nothing, and the select's own styling
    // and the error-clearing listener both key off `change`.
    if (input.tagName === 'SELECT') input.dispatchEvent(new Event('change', { bubbles: true }));
    return key;
  }).filter(Boolean);

  /*
   * "IK HEB GEEN BTW-NUMMER" IS OOK EEN OPGESLAGEN ANTWOORD.
   *
   * Zonder deze twee regels ziet een particulier of een Amerikaans bedrijf bij
   * elke bestelling opnieuw een verplicht btw-veld dat hij nooit kan invullen —
   * terwijl hij die vraag één keer beantwoord heeft. Het vinkje wordt alleen
   * AANgezet, nooit uit: een klant die vandaag wél een nummer intikt, heeft er
   * kennelijk een gekregen, en zijn invoer hoort niet door een oud antwoord
   * overschreven te worden.
   */
  const noVat = q('input[type="checkbox"][name="no_vat"]');
  if (noVat && me.noVat && !q('input[name="vat"]')?.value) {
    noVat.checked = true;
    noVat.dispatchEvent(new Event('change', { bubbles: true }));
  }

  applySavedBackground(me);
  // Tiles first: applyBrandKit() may want to preselect one of them.
  addBrandModels(me);
  applyBrandKit(me);

  // The collapse needs the fields it hides to actually be filled. A saved
  // record missing a name is a saved record that cannot answer step 3, and
  // hiding an empty required field behind a summary is how a form gets stuck
  // on a validation error pointing at a control nobody can see.
  const complete = REQUIRED_DETAILS.every((k) => {
    const input = q(`input[name="${k}"], select[name="${k}"]`);
    return input && input.value.trim();
  })
    // HET BTW-VELD HOORT HIER OOK BIJ, en het staat niet in REQUIRED_DETAILS
    // omdat het als enige verplicht-tenzij is. Zonder deze regel klapt stap 3
    // dicht over een leeg btw-veld zonder vinkje: syncRequired() slaat een
    // verborgen veld over (isShown()), dus er komt geen waarschuwing, en de
    // bestelling gaat de deur uit zonder nummer én zonder het antwoord "die heb
    // ik niet". Precies het onderscheid waar no_vat_number voor bestaat.
    && (() => {
      const vat = q('input[name="vat"]');
      const box = q('input[type="checkbox"][name="no_vat"]');
      if (!vat) return true;
      return !!(vat.value.trim() || (box && box.checked));
    })();

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
  if (!me.saved) bindSaveOffer({ signedIn: true });
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
 * The brand kit, applied to step 1 — August 2026.
 *
 * Lucas: standing preferences should be "bij een nieuwe bestelling automatisch
 * aangevinkt/ingevuld". /account/me now answers a `locks` object keyed by
 * service, and this is where it lands.
 *
 * SAME RULE AS EVERY OTHER PREFILL IN THIS FILE, and it is the rule that makes
 * prefilling safe: a stored preference only ever overrides the value the PAGE
 * shipped, never a value a person or the back button chose. defaultChecked is
 * how a radio group expresses that, and for the model group it is the "we
 * choose one" option that ships checked.
 *
 * IT RUNS AFTER applySavedBackground() and can overwrite it. That ordering is
 * deliberate: the account-wide default background is a fallback for a brand
 * that has not thought about it per service, and a per-service lock is the
 * later, more specific answer to the same question.
 *
 * A lock naming a face this order cannot offer is ignored rather than forced —
 * a lifestyle order has no model picker at all, and a custom model has no radio
 * in a roster of ten. Silence is the right failure: the studio still reads the
 * lock off the customer's account, so nothing is lost by the form not showing
 * it.
 */
/**
 * The brand's own faces, added to the model picker as real tiles.
 *
 * Lucas: a brand model added in the admin "zou automatisch een knop moeten
 * worden om te selecteren bij een nieuwe order". This is that button.
 *
 * WHY IT IS BUILT HERE AND NOT IN ModelPicker.astro. That component is static:
 * it is rendered once at build time from the ten-face roster in models.js,
 * which is the same for everybody. A brand's own models are per-customer
 * runtime data that only exists after a session resolves, so the tiles have to
 * be made here, from /account/me, or not at all.
 *
 * THEY GO FIRST, before "choose one that fits our brand" and before the ten.
 * A brand that has commissioned a face has already answered this question, and
 * making them scroll past ten strangers to reach their own is the wrong order
 * on a form that is trying to be short.
 *
 * The value is `c<id>` so the studio can tell a commissioned face from a roster
 * one without a lookup — the same encoding the brand kit uses in account.js,
 * on purpose: one wire format for one concept.
 */
function addBrandModels(me) {
  const grid = q('.mp-grid');
  if (!grid) return;
  const models = Array.isArray(me && me.models) ? me.models : [];
  if (!models.length) return;

  // CLONED FROM THE COMPONENT'S OWN TEMPLATE, NOT BUILT HERE. August 2026, and
  // it is a fix rather than a tidy-up.
  //
  // This function used to assemble the tile with document.createElement, and
  // every one it made came out unstyled. Astro scopes a component's CSS by
  // stamping each element in its markup with a data-astro-cid attribute and
  // compiling the selectors to match it — `.mp-opt[data-astro-cid-q2kvomsp]`.
  // An element created at runtime has no such attribute, so not one rule on the
  // page applied: no frame, no padding, no radius, a full-bleed portrait, and
  // the model's name running into the tag beside it. Beside ten tidy roster
  // cards, which is how it was spotted.
  //
  // The template lives in ModelPicker.astro, so its contents are compiled like
  // any other markup there and a clone of it IS a roster tile — attribute,
  // classes, structure and all. It also puts the tile's shape back where it
  // belongs: change the card in the component and these follow, instead of two
  // definitions drifting until somebody photographs the difference.
  const tpl = q('[data-pl-own-tile]');
  if (!tpl || !tpl.content) {
    // Loud rather than silent. A missing template means a brand's own faces
    // simply do not appear on the form, which looks exactly like a brand that
    // has none — the failure mode this whole function was rewritten to end.
    console.warn('[pipeline] ModelPicker has no [data-pl-own-tile] template — brand models not shown.');
    return;
  }

  // WHERE THEY GO, AND WHY IT MOVED. Lucas, August 2026: "ik wil het kies voor
  // mij optie helemaal links houden."
  //
  // These tiles used to be inserted at the very front, ahead of "choose one
  // that fits our brand". The reasoning was that a brand which commissioned a
  // face has already answered this question — true, and it cost something worth
  // more: that first tile is the RECOMMENDED default, it ships checked, and its
  // position is how a returning customer finds it without reading. Moving it
  // around based on whether an account happens to have brand models means the
  // control sits in a different place for the same person on different days.
  //
  // So the anchor is the tile AFTER "choose for us", not the first child. Own
  // faces still come before the ten strangers, which was the part that mattered
  // — a brand should not scroll past the roster to reach its own — while the
  // default keeps the one position it has always had.
  const anyTile = grid.querySelector('.mp-opt-any');
  const anchor = anyTile ? anyTile.nextElementSibling : grid.firstElementChild;

  for (const m of models) {
    if (!m || !m.id) continue;

    const tile = tpl.content.firstElementChild.cloneNode(true);
    const img = tile.querySelector('.mp-thumb');
    const input = tile.querySelector('input[name="model"]');
    const name = tile.querySelector('.mp-name');
    if (!img || !input || !name) continue;

    img.src = m.preview;
    // The alt stays empty on purpose: the name is right beneath it in the same
    // control, and a screen reader announcing "Nadia, Nadia" is the label read
    // twice rather than described.
    img.alt = '';
    // A picture that will not load must not leave a tile the customer can pick
    // without seeing what they are picking. Removing it beats a broken-image
    // icon standing in for a face.
    img.addEventListener('error', () => tile.remove());

    // `c<id>` so the studio can tell a commissioned face from a roster one
    // without a lookup — the same encoding the brand kit stores in account.js.
    input.value = `c${m.id}`;
    name.textContent = m.label || c('pu.ownModel') || 'Brand model';

    // Each one before the same anchor, which keeps them in the order /account/me
    // returned them rather than reversing the list.
    grid.insertBefore(tile, anchor);
  }

  // The summary line has to know about them too, or a customer who picks their
  // own face sees the fold still saying "we choose one".
  bindModel();
  syncSummaries();
}

function applyBrandKit(me) {
  const locks = me && typeof me.locks === 'object' && me.locks ? me.locks : null;
  if (!locks) return;
  const lock = locks[kindOf()] || null;
  if (!lock) return;

  // Background. Matched on the RESOLVED hex rather than on an id, because that
  // is what the brand kit stores — see account.js's handleLockUpdate for why a
  // standing preference is restricted to a colour we actually offer.
  const wantHex = normalizeHex(lock.background);
  if (wantHex) {
    const checked = q('input[name="background"]:checked');
    if (!checked || checked.defaultChecked) {
      const target = qa('input[name="background"]')
        .find((r) => (r.dataset.plBgHex || '').toUpperCase() === wantHex.toUpperCase());
      if (target) { target.checked = true; syncBackground(kindOf()); }
    }
  }

  // The face — either one of the ten, or one of this brand's own, which
  // addBrandModels() has just put on the page. Both are radios in the same
  // group by the time this runs, so one lookup covers both.
  const wantFace = lock.customModel ? `c${lock.customModel}` : (lock.model || '');
  if (wantFace) {
    const current = q('input[name="model"]:checked');
    if (!current || current.defaultChecked) {
      const target = qa('input[name="model"]').find((r) => r.value === wantFace);
      if (target) { target.checked = true; syncSummaries(); }
    }
  }

  // ── DE VERKOOPKANALEN, ALLEEN BIJ CATALOG ───────────────────────────────────
  //
  // Lucas, 8 augustus 2026: *"Doe het voor nu alleen bij catalog want lifestyle,
  // complete en video klopt ook nog niet."* De tegenhanger van deze regel staat
  // in lockSection() in account.js, waar de vinkjes alleen bij catalog getekend
  // worden. Twee plekken, en ze noemen elkaar.
  //
  // DIT STAAT BEWUST ALS LAATSTE IN DEZE FUNCTIE. De witvergrendeling van een
  // marktplaats moet het laatste woord hebben over de achtergrond hierboven:
  // een opgeslagen beige is een voorkeur, #FFFFFF op Amazon is een eis, en een
  // eis die vóór een voorkeur loopt levert een radio op die aangevinkt én
  // disabled is — dan post er geen achtergrond en krijgt de studio niets.
  //
  // DIT ZET ZELF GEEN ACHTERGROND VAST. Het vinkt alleen kanalen aan en laat
  // syncChannels() daarna zijn eigen werk doen: die zet elke achtergrond behalve
  // wit op disabled zodra er een kanaal met requiresWhite aanstaat, en dat deed
  // hij al voor een losse bestelling. Hier ook wit forceren zou betekenen dat
  // twee plekken het eens moeten blijven over welke kanalen wit eisen — en de
  // lijst staat in channels.js, niet hier.
  //
  // Zelfde overschrijfregel als hierboven: alleen een vinkje dat de pagina zelf
  // heeft meegegeven wordt aangeraakt. Heeft de klant in deze sessie al iets
  // aangevinkt of uitgevinkt, dan is dat het antwoord.
  if (kindOf() === 'catalog' && Array.isArray(lock.channels) && lock.channels.length) {
    const boxes = qa('[data-pl-ch-box]');
    const touched = boxes.some((b) => b.checked !== b.defaultChecked);
    if (boxes.length && !touched) {
      boxes.forEach((b) => { b.checked = lock.channels.indexOf(b.value) !== -1; });
      syncChannels();
    }
  }
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
    // `select` erbij: country is een keuzelijst, en zonder dit stond het land
    // niet in het lijstje "je opgeslagen gegevens" terwijl het er wel is.
    const input = q(`input[name="${key}"], select[name="${key}"]`);
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
      const first = q('input[name="first_name"]');
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

function bindSaveOffer({ signedIn }) {
  const offer = q('[data-pl-save-offer]');
  const box = q('[data-pl-save-check]');
  if (!offer || !box) return;
  box.checked = false; // a bfcache restore can bring a tick back with it

  // Eén van de twee hints. De uitkomst verschilt écht — meteen opgeslagen tegen
  // opgeslagen bij de eerste keer inloggen — en dat hoort te lezen te zijn
  // vóórdat iemand het vinkje zet, niet erna.
  const hintIn = q('[data-pl-save-hint="in"]');
  const hintOut = q('[data-pl-save-hint="out"]');
  if (hintIn) hintIn.hidden = !signedIn;
  if (hintOut) hintOut.hidden = !!signedIn;

  /*
   * HET VERBORGEN VELD DRAAGT DE UITKOMST, EN ALLEEN VOOR EEN UITGELOGDE
   * BEZOEKER. Een ingelogde klant wordt afgehandeld door saveDetailsIfAsked(),
   * die na de bestelling naar /account/details post — geauthenticeerd, en dus
   * meteen effectief. Zou het veld voor hem ook meegaan, dan zou dezelfde wens
   * langs twee wegen binnenkomen en zou de trage weg de snelle kunnen
   * overschrijven.
   */
  const flag = q('[data-pl-save-flag]');
  if (flag) {
    flag.value = '';
    if (!signedIn) box.addEventListener('change', () => { flag.value = box.checked ? '1' : ''; });
  }

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
    // `select` staat er sinds 7 augustus 2026 bij. `country` zit in
    // PREFILL_FIELDS maar is een <select>, dus deze regel vond hem niet en het
    // land ging nooit mee naar /account/details — terwijl juist dat veld
    // bepaalt of er 21% of "btw verlegd" op de volgende factuur staat.
    // applyAccount() hierboven was hier al voor gerepareerd, deze kant niet.
    const input = q(`input[name="${key}"], select[name="${key}"]`);
    if (input) fd.set(key, input.value.trim());
  });
  // HET VINKJE MOET MEE, anders faalt de opslag stil voor precies de mensen
  // voor wie het bedoeld is. handleDetails() ziet dan een leeg `vat` zonder
  // `no_vat` ernaast, leest dat als "niet ingevuld", en weigert het hele
  // verzoek — en deze fetch is keepalive met een lege catch, dus er is geen
  // scherm en geen melding. Elke particulier en elk niet-EU-bedrijf zou zijn
  // gegevens nooit opgeslagen zien worden.
  const noVatBox = q('input[type="checkbox"][name="no_vat"]');
  if (noVatBox && noVatBox.checked) fd.set('no_vat', '1');

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

  // The look, on the lifestyle flow. Same rule as the background above: only
  // when the flow HAS the question. There is no picker on a catalog order, so
  // an empty answer here is the absence of a question rather than a skipped one.
  const look = q('input[name="style"]:checked');
  if (look) rows.push([c('sum.style'), look.dataset.plStyleName || look.value]);

  // Task #271f.
  if (outfitN > 0) rows.push([c('sum.outfit'), c('sum.outfitN', { price: euro(cfg.outfitSurcharge), n: outfitN })]);

  // Computed again — NOT scraped back off step 1. Reading the rendered total
  // would make the confirm screen a copy of a copy, and a client who changed
  // the count and came straight here would confirm the old figure. Same rule as
  // step 1: net, labelled, and never authoritative.
  const quote = kind ? quoteFor(kind, n, outfitN) : null;
  if (quote) rows.push([c('sum.net'), euro(quote.net)]);

  // WHAT WAS SENT, IN THE UNIT THE CUSTOMER CARES ABOUT. This row used to read
  // "12 of 140 uploaded", which is a fact about our storage rather than about
  // their order — and on the one screen where a missing front photo is still
  // fixable, "8 of 25 products ready" is the sentence that lets them fix it.
  // It is an advisory here as everywhere else: it says what is short and then
  // the send button works anyway.
  const sent = progressText() || c('upload.count', { n: staged.length, max: cfg.maxBatchFiles });
  rows.push([c('sum.files'), staged.length ? sent : c('sum.noFiles')]);

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
    if (GATE_STEP !== null && to === GATE_STEP) runGate();
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
    /* GATE_STEP en niet 4. Een stroom zonder poort kan hier niet komen — de
       server geeft 'window-gone' alleen bij een begeleide bestelling, en die
       vraagt om een leverweek — maar `show(4)` zou daar de samenvatting openen
       en dan de poort eroverheen tekenen. Een onbereikbare tak die bij de eerste
       de beste wijziging het verkeerde scherm opent, is precies het soort regel
       dat later voor een raadsel zorgt. */
    if (GATE_STEP !== null) show(GATE_STEP);
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
