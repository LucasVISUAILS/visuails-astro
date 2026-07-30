// VISUAILS — /start, the five-step order pipeline. Section 10 of the brief.
//
// scope → upload → brief → capacity gate → confirm.
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
//   step 1  input[name=scope][value=drop|single]
//           input[name=drop_scope][value=pilot|full]
//           input[name=product_type][value=catalog|lifestyle|video|custom]
//           [data-pl-panel="drop"|"single"]      sub-panels, toggled
//           [data-pl-count="pilot"|"free"]       the two count presentations
//           [data-pl-total] [data-pl-total-note]
//           [data-pl-outfit] input[name=outfit_count]   task #271f — full outfit
//
//   step 2  input[type=file][data-pl-file]       NO name attribute, deliberately
//           [data-pl-droplist]                   the file rows land here
//           [data-pl-upload-note="off"]          shown when uploads are down
//
//   step 3  input[name=name|brand|email|phone|website|vat]
//           [data-pl-prefill-note]               task #271e — see bindPrefill()
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
  bindScope();
  bindUploads();
  bindGate();
  bindSubmit();
  bindPrefill();

  syncScope();
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

/** Copy lookup by dotted path. Returns '' for anything missing, never undefined. */
function c(path, vars) {
  let node = cfg && cfg.copy;
  for (const key of String(path).split('.')) {
    if (!node || typeof node !== 'object') return '';
    node = node[key];
  }
  let out = typeof node === 'string' ? node : '';
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
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
// STEP 1 · SCOPE
//
// Section 13 forbids styling Tier 0 as the lesser option; the CSS holds up that
// half. This half is the part that is easy to get wrong in behaviour rather
// than in paint: both doors reach the same five steps, the same upload, the
// same brief and the same submit. There is no second flow.
// ─────────────────────────────────────────────────────────────────────────────

function bindScope() {
  qa('input[name="scope"], input[name="drop_scope"], input[name="product_type"]').forEach((r) => {
    r.addEventListener('change', syncScope);
  });
  const count = q('select[name="products"]');
  if (count) count.addEventListener('change', onProductsChange);
  // Task #271f.
  const outfit = q('select[name="outfit_count"]');
  if (outfit) outfit.addEventListener('change', syncTotal);
}

// The products select can change without a scope/kind radio firing, and the
// outfit field's own cap (see syncOutfit()'s comment) depends on that count —
// so this, unlike every other listener above, has to re-run syncOutfit() too,
// not just the total.
function onProductsChange() {
  const scope = scopeValue();
  syncOutfit(scope, currentKind(scope));
  syncTotal();
}

function scopeValue() {
  const r = q('input[name="scope"]:checked');
  return r ? r.value : '';
}

function pickedIn(name) {
  const r = q(`input[name="${name}"]:checked`);
  return r ? r.value : '';
}

/** The chosen package/product kind for a scope — 'pilot'/'full' under 'drop',
 * 'catalog'/'lifestyle'/'video'/'custom' under 'single'. Three call sites
 * (syncScope, syncTotal, renderSummary) computed this the same way inline;
 * task #271f added a fourth (onProductsChange) and gave the other three one
 * shared definition rather than a fourth copy of the ternary. */
function currentKind(scope) {
  return scope === 'drop' ? pickedIn('drop_scope') : pickedIn('product_type');
}

function syncScope() {
  const scope = scopeValue();
  const drop = scope === 'drop';
  const single = scope === 'single';

  const dropPanel = q('[data-pl-panel="drop"]');
  const singlePanel = q('[data-pl-panel="single"]');
  if (dropPanel) dropPanel.hidden = !drop;
  if (singlePanel) singlePanel.hidden = !single;

  // service / tier are what the server reads. Everything else on this step is
  // presentation; these two are the order.
  const kind = currentKind(scope);
  setHidden('tier', drop ? 'attended' : 'unattended');
  setHidden('service', drop ? 'drop' : kind || 'catalog');

  syncCount(scope, kind);
  syncOutfit(scope, kind);
  syncTotal();
  syncRequired();
}

/**
 * The count select is one control with one name, because /api/order reads one
 * `products` field and a form with three of them would depend on which one the
 * browser serialised first. JS narrows the option list to the range the chosen
 * scope allows; without JS the whole list is there with a hint saying so.
 */
function syncCount(scope, kind) {
  const select = q('select[name="products"]');
  const fixed = q('[data-pl-count="pilot"]');
  const free = q('[data-pl-count="free"]');
  if (!select) return;

  const pilot = scope === 'drop' && kind === 'pilot';
  const full = scope === 'drop' && kind === 'full';

  if (fixed) fixed.hidden = !pilot;
  if (free) free.hidden = pilot || !scope;

  const min = full ? Number(cfg.fullMin) : 1;
  const max = full ? Number(cfg.fullMax) : 10;

  let firstAllowed = null;
  [...select.options].forEach((o) => {
    const n = Number.parseInt(o.value, 10);
    let allowed;
    if (pilot) allowed = n === Number(cfg.pilotProducts);
    else if (Number.isInteger(n)) allowed = n >= min && n <= max;
    else allowed = !full; // "more than N" — a volume quote, never a full drop
    o.hidden = !allowed;
    o.disabled = !allowed;
    if (allowed && firstAllowed === null) firstAllowed = o.value;
  });

  const chosen = select.options[select.selectedIndex];
  if (!chosen || chosen.disabled) select.value = firstAllowed === null ? '' : firstAllowed;
}

/**
 * Task #271f — Single Product/Full outfit. Shown whenever the current
 * scope/kind has a rate to attach a surcharge to: every single-panel kind
 * except "custom" (a quote already covers whatever the shot needs), and both
 * drop packages (a fixed price either way). Narrowed the same way
 * syncCount() narrows the products select just above: an outfit count can
 * never exceed MAX_OUTFIT_PRODUCTS, and on a single-panel order it can never
 * exceed the number of products actually being ordered — the surcharge is
 * per product styled as an outfit, so it cannot outnumber the products.
 */
function syncOutfit(scope, kind) {
  const field = q('[data-pl-outfit]');
  const select = q('select[name="outfit_count"]');
  if (!field || !select) return;

  const applies = scope === 'drop' ? (kind === 'pilot' || kind === 'full') : !!kind && kind !== 'custom';
  field.hidden = !applies;
  if (!applies) {
    select.value = '0';
    return;
  }

  const productsSelect = q('select[name="products"]');
  const n = productsSelect ? Number.parseInt(productsSelect.value, 10) : NaN;
  const cap = scope === 'single' && Number.isInteger(n)
    ? Math.min(Number(cfg.maxOutfit), n)
    : Number(cfg.maxOutfit);

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

/**
 * The running total.
 *
 * A drop is a fixed price for the whole thing — the count inside it changes
 * what we do, not what it costs — so it is never printed as a per-product
 * multiplication. Section 13's whole framing is that the two doors are
 * different service models; a per-unit divide on the drop side would put them
 * back on one axis and invite the comparison it exists to avoid.
 */
function syncTotal() {
  const out = q('[data-pl-total]');
  const note = q('[data-pl-total-note]');
  if (!out) return;

  const scope = scopeValue();
  const kind = currentKind(scope);
  const select = q('select[name="products"]');
  const raw = select ? select.value : '';
  const n = Number.parseInt(raw, 10);

  let amount = null;
  let noteText = '';

  if (scope === 'drop' && kind === 'pilot') {
    amount = cfg.prices.pilot;
    noteText = c('total.pilot', { n: cfg.pilotProducts });
  } else if (scope === 'drop' && kind === 'full') {
    amount = cfg.prices.full;
    noteText = c('total.full', { min: cfg.fullMin, max: cfg.fullMax });
  } else if (scope === 'single' && kind === 'custom') {
    noteText = c('total.custom');
  } else if (scope === 'single' && kind && Number.isInteger(n)) {
    amount = round2(cfg.prices[kind] * n);
    noteText = c('total.each', { price: euro(cfg.prices[kind]), n });
  } else if (scope === 'single' && kind) {
    noteText = c('total.quote');
  }

  // Task #271f — additive, on top of whatever the block above produced.
  // Never on its own: a surcharge with no base price to attach to
  // (kind === 'custom', or nothing chosen yet) is meaningless, so this only
  // fires when `amount` is already a real number.
  const outfitN = outfitCount();
  if (amount !== null && outfitN > 0) {
    amount = round2(amount + outfitN * cfg.outfitSurcharge);
    noteText += c('total.outfit', { price: euro(cfg.outfitSurcharge), n: outfitN });
  }

  out.textContent = amount === null ? c('total.onRequest') : euro(amount);
  if (note) note.textContent = noteText;
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

function queue(files) {
  if (!files.length || uploadsOff) return;
  files.forEach((file) => {
    const row = addRow(file);
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
  return c(`upload.err.${code}`) || c('upload.err.generic');
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
function bindPrefill() {
  const note = q('[data-pl-prefill-note]');

  fetch('/account/me', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((me) => {
      if (!me || !form) return;

      // name/email/brand/phone/website/vat — the six fields step 3 actually
      // has (see the DOM CONTRACT above); a seventh key in the response, if
      // one is ever added, is simply not among the inputs found and does
      // nothing, rather than needing a matching change here. email is filled
      // like every other field here — it is also read separately below for
      // the note text, which needs it regardless of whether the input itself
      // was already non-empty.
      const filled = Object.entries(me)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => {
          const input = q(`[name="${CSS.escape(key)}"]`);
          if (!input || input.value) return null; // never overwrite
          input.value = value;
          return key;
        })
        .filter(Boolean);

      // The note names what happened, not just who's signed in — a signed-in
      // account with nothing on file yet (a first order) gets no note at
      // all, because nothing on the visible form actually changed.
      if (filled.length && note) {
        note.textContent = c('s3.prefillNote', { email: me.email || '' });
        note.hidden = false;
      }
    })
    .catch(() => {}); // no account, offline, or /account/me unreachable — the form is already fine empty
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
  const attended = scopeValue() === 'drop';
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
    gateShow('invalid');
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
// card. What the site already promises on /pricing is that a drop is paid after
// the window is confirmed and before production starts, and that individual
// products are invoiced on delivery. This step confirms; the invoice follows.
// ─────────────────────────────────────────────────────────────────────────────

function renderSummary() {
  const host = q('[data-pl-summary]');
  if (!host) return;
  host.textContent = '';

  const scope = scopeValue();
  const drop = scope === 'drop';
  const kind = currentKind(scope);
  const select = q('select[name="products"]');
  const count = select ? select.options[select.selectedIndex] : null;

  const rows = [];
  rows.push([c('sum.scope'), c(`scope.${scope || 'none'}`)]);
  if (kind) rows.push([c('sum.kind'), c(`kind.${kind}`)]);
  if (count && count.value) rows.push([c('sum.count'), count.textContent.trim()]);

  // Task #271f.
  const outfitN = outfitCount();
  if (outfitN > 0) rows.push([c('sum.outfit'), c('sum.outfitN', { price: euro(cfg.outfitSurcharge), n: outfitN })]);

  const total = q('[data-pl-total]');
  if (total && total.textContent) rows.push([c('sum.total'), total.textContent]);

  rows.push([c('sum.files'), staged.length ? c('upload.count', { n: staged.length, max: cfg.maxBatchFiles }) : c('sum.noFiles')]);

  // The one row that is allowed to contain a date, and only when the gate put
  // it there. Everything else says what actually happens next instead.
  const ws = value('window_start');
  const we = value('window_end');
  if (drop && ws) rows.push([c('sum.window'), we && we !== ws ? `${day(ws)} – ${day(we)}` : day(ws)]);
  else if (drop) rows.push([c('sum.window'), c('sum.windowLater')]);
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
 * touched was under a thousand. A drop is €1,850, so a client would have read
 * "€1850" in the running total and "€1.850" on the invoice. Duplicating twelve
 * lines is the cheaper of the two mistakes; a verifier asserts the two agree
 * across every total this page can reach.
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
