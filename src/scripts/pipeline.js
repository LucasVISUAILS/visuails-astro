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
// because /api/order’s own gate returns `reason: 'none'` for exactly that case
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
// also puts strings like "typically 2–4 days" one careless edit away
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
//           [data-pl-plan] [data-pl-plan-t] [data-pl-plan-cta]  het abonnement,
//                                                als tweede lezing van dezelfde vraag
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
import {
  SHOT_IDS, REQUIRED_SHOT_IDS, isRequiredShot, guessShot, productStem, productKeyFromPath, extraShotId,
  /* De GRATIS referentievakken. Lucas, 13 augustus 2026: *"Ook wil ik dat het
     mogelijk word voor een bezoeker om meer foto’s toe te voegen van zijn product
     kosteloos door op een plusje naast de 4 aanbevolen foto’s te klikken. Dit zorgt
     ervoor dat ze meer details kunnen laten zien maar wel gewoon 4 foto’s in totaal
     krijgen."* Ze hebben met opzet een eigen voorvoegsel en een eigen bovengrens —
     zie de kop bij REF_SHOT_PREFIX in shots.js voor waarom ze geen woord delen met
     de betaalde extra's. */
  refShotId, refShotNumber, MAX_REF_PER_PRODUCT,
} from '../data/shots.js';
// Same rule, one line down. PRODUCT_QUESTIONS is read here for its IDS, its
// types, its maxLength and its option ids — the wire values, which have to be
// the same ones /api/order validates against, and which would rot the first
// time somebody added a fit if they were retyped in the page. Not one string
// off this import reaches the screen: every label, placeholder and option name
// is read out of the config blob like everything else on this page.
import { PRODUCT_QUESTIONS } from '../data/attributes.js';
/* Het oordeel over een aangeleverde foto staat naast de drempels in shots.js,
   zodat het te toetsen is zonder een browser. Het METEN staat hier, want daar
   zijn de pixels — zie meetBeeld(). */
import { keurBeeld } from '../data/shots.js';
// De EU-lijst staat op één plek. Hem hier overtypen zou betekenen dat het
// formulier en de server het ooit oneens worden over of een land in de EU zit,
// en dan biedt het formulier 0% aan waar de server 21% rekent.
import { isEu, HOME_COUNTRY } from '../data/vat.js';

/*
 * ── HOEVEEL STAPPEN, EN WELKE IS DE POORT — 11 AUGUSTUS 2026 ─────────────────
 *
 * Dit was `const STEPS = 5`, en dat klopte zolang elke bestelling door dezelfde
 * vijf schermen ging. De proefvisual op /test-sample gaat door vier: kiezen,
 * foto’s, gegevens, controleren. De levertijd hoort er niet tussen, want een proef
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
/* Zie askMissing(): heeft de klant "toch versturen" gekozen bij ontbrekende
   foto's? Hier en niet bij de functie, om dezelfde reden als `reached`: boot()
   draait vóór de rest van dit bestand is geëvalueerd. */
let missingOk = false;

// Step 2. `cards` is the product list — one per product on the order, each with
// four slots — and `tray` is what arrived without a product we could name.
let cards = [];
/* Het aantal producten dat de KLANT koos, en dus de bodem waar de knop
   "Weghalen" niet onder mag komen — zie minCards(). Hij staat hier tussen de
   andere moduletoestand en niet bij minCards() zelf: boot() draait voordat het
   midden van dit bestand is uitgevoerd, en een `let` die dan nog niet aan de
   beurt is geweest, gooit bij aanraking een ReferenceError die de hele
   bind-ronde afbreekt. Precies dat gebeurde bij de eerste versie hiervan. */
let bodemProducten = 0;
/* Staat aan terwijl "nog een product"/"weghalen" zelf het aantal bijwerkt, zodat
   die wijziging niet als keuze van de klant wordt geteld. */
let telViaKnop = false;
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

/*
 * ── HET PRODUCTTYPE STUURT WELKE CONTEXTVRAGEN ER STAAN ────────────────────
 *
 * Van elk product staat één foto op een model, en in dat beeld zie je iets meer
 * dan het product zelf. Wát je meer ziet, hangt af van de uitsnede: bij een broek
 * zijn dat de schoenen en de zoom van een top, bij een sieraad is er niets te
 * vragen, en bij een jurk blijven alleen de schoenen over.
 *
 * DE TABEL STAAT HIER EN NIET IN garments.js, EN DAT IS EEN AFWIJKING MET EEN
 * REDEN. Dit script draait in de browser en importeert niets — het is één bestand
 * dat via een <script> binnenkomt, met zijn configuratie in een data-attribuut.
 * garments.js importeren zou een bundelstap vragen voor dit ene formulier.
 *
 * DAT MAAKT HET EEN TWEEDE WAARHEID, en dus wordt hij bewaakt in plaats van
 * vertrouwd: tests/garments.test.mjs vergelijkt deze tabel regel voor regel met
 * contextSlots() uit garments.js en valt om zodra de twee uit elkaar lopen. En
 * de SERVER beslist hoe dan ook — /api/order gooit weg wat niet bij het type
 * hoort, ook als dit script iets anders zou tonen. Dit is comfort, geen controle.
 *
 * DEZE TABEL IS GEGENEREERD EN NIET GETYPT, en dat is geen luiheid. De eerste
 * versie stond er met de hand in en de test hierboven vond er meteen vijf fouten
 * in: vier keer een andere volgorde dan de beeldvolgorde die contextSlots()
 * aanhoudt, en één echte — bij `jewellery` stond een lege lijst terwijl de zoom
 * van de top in een detailuitsnede wél in beeld staat. Een klant met een sieraad
 * zou dus nooit gevraagd zijn wat er verder in dat beeld hoort.
 *
 * ── EN DEZELFDE VAL, EEN VIERDE KEER — 18 AUGUSTUS 2026 ────────────────────
 *
 * Deze tabel stond eerst tweehonderd regels lager, bij bindGarment(). boot()
 * draait op regel 325, midden in dit bestand; een `const` daaronder staat op dat
 * moment in zijn temporal dead zone. Uitkomst: `ReferenceError: Cannot access
 * 'CTX_BY_GARMENT' before initialization`, opgeslokt door de catch van boot(),
 * .is-live eraf, en een gestapeld formulier zonder uploadvakken.
 *
 * Precies het geval dat hierboven voor `chain` en `reached` al staat
 * opgeschreven — twee noten die deze fout beschrijven, en toch een derde keer
 * gemaakt. De regel is dus niet "let op bij let en const" maar: **alles wat
 * init() aanraakt, staat boven boot().** Gevonden door tests/funnel.test.mjs,
 * die de console van de echte pagina leest.
 */
const CTX_BY_GARMENT = {
  trousers: ['shoes', 'top'],
  shorts: ['shoes', 'top'],
  skirt: ['shoes', 'top'],
  top: ['bottom'],
  outerwear: ['shoes', 'bottom', 'top'],
  dress: ['shoes'],
  shoes: ['bottom'],
  socks: ['shoes', 'bottom'],
  belt: ['bottom', 'top'],
  bag: ['shoes', 'bottom', 'top'],
  headwear: ['top'],
  jewellery: ['top'],
  scarf: ['top'],
  underwear: [],
  other: ['shoes', 'bottom', 'top'],
};

/*
 * ── EN DEZELFDE VAL, EEN DERDE KEER — 13 AUGUSTUS 2026 ──────────────────────
 *
 * `reached` stond bij measure(), zo’n tweehonderd regels lager, als
 * `const reached = new Set()`. init() maakt hem leeg op zijn achtste regel. Dus:
 * exact het geval dat hierboven voor `chain` staat opgeschreven, en dat de noot bij
 * EMPTY_SLOT() nóg een keer opschrijft.
 *
 * Wat het deed, gemeten in een echte browser tegen de echte build:
 *
 *   [pipeline] ReferenceError: Cannot access 'reached' before initialization
 *
 * op /start/catalog, /nl/start/catalog en /start/complete. De eerste boot() viel om
 * op regel 314, de catch haalde `is-live` weg, en `plBound` — dat pas op regel 324
 * wordt gezet — bleef leeg. Daardoor liep boot() bij het `astro:page-load`-event
 * gewoon een tweede keer, nu met een geïnitialiseerde `reached`, en werkte het
 * formulier alsnog.
 *
 * DAT IS GELUK EN GEEN ONTWERP. Het hing volledig aan de ClientRouter die dat event
 * stuurt: zonder dat tweede event is er geen bestelstroom — geen stapnavigatie, geen
 * uploader, geen capaciteitspoort — alleen een gestapeld formulier dat zwijgt. En de
 * bezoeker zag bij elke lading eerst een halve verbetering en dan een hele.
 *
 * Vandaar hier, bij de rest van de toestand. De uitleg over WAT `reached` doet blijft
 * bij measure() staan, waar hij gelezen wordt.
 */
const reached = new Set();

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
  /* Leeg bij elke init, net als de rest van de toestand hierboven: ClientRouter
     hergebruikt deze module tussen pagina's, en een verzameling die blijft staan zou
     de tweede bestelling van dezelfde bezoeker ongemeten laten. */
  reached.clear();
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
  bindGarment();
  bindMissing();
  missingOk = false;

  syncOrder();
  show(1, { focus: false });
}


function bindGarment() {
  const keuze = form.querySelector('[data-pl-garment]');
  const blok = form.querySelector('[data-pl-ctx]');
  if (!keuze || !blok) return;

  const teken = () => {
    const slots = CTX_BY_GARMENT[keuze.value] || null;
    /* Geen type gekozen: het hele blok blijft dicht. Een lijst met drie vragen
       tonen voordat er iets gekozen is, vraagt om antwoorden op een beeld dat
       nog niet bestaat. */
    if (!slots) { blok.hidden = true; return; }
    let zichtbaar = 0;
    for (const rij of blok.querySelectorAll('[data-pl-ctx-slot]')) {
      const past = slots.includes(rij.getAttribute('data-pl-ctx-slot'));
      rij.hidden = !past;
      /* UITGESCHAKELD ÉN VERBORGEN. `hidden` alleen houdt het veld in het
         formulier, dus een verborgen keuzelijst post nog steeds zijn waarde —
         en dan komt er een contextstuk mee dat bij dit type niet kan. De server
         gooit dat weg, maar een veld dat post wat de klant niet ziet, hoort
         niet te bestaan. `disabled` haalt hem uit de verzending. */
      const sel = rij.querySelector('select');
      if (sel) sel.disabled = !past;
      if (past) zichtbaar += 1;
    }
    blok.hidden = zichtbaar === 0;
  };

  keuze.addEventListener('change', teken);
  teken();
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

/*
 * ── DE TRECHTER — 12 augustus 2026 ──────────────────────────────────────────
 *
 * Dit formulier is één pagina met vijf stappen die hier gewisseld worden, dus
 * Cloudflare Web Analytics — dat paginabezoeken meet — zag van vier van de vijf
 * stappen niets. Van iedereen die aan een bestelling begon, was alleen bekend wie
 * hem afmaakte. Wie op stap 3 wegliep, liet geen enkel spoor na.
 *
 * `show()` is de enige plek in dit bestand die van stap wisselt, dus is het ook de
 * enige plek waar dit hoort te staan. Elke andere plek zou een tweede lijst van
 * navigatiepunten worden die je moet onthouden bij te werken.
 *
 * ── ÉÉN KEER PER STAP PER PAGINALADING ─────────────────────────────────────
 *
 * `reached` houdt bij wat er al gestuurd is. Zonder die verzameling telt heen en
 * weer klikken tussen stap 2 en 3 als vier bezoeken aan stap 3, en dan meet de
 * trechter twijfel in plaats van voortgang — precies de vorm van verkeerd die
 * eruitziet als een antwoord.
 *
 * Het is uitdrukkelijk NIET één keer per bezoeker: dat zou een cookie of een
 * bezoeker-id vragen, en dan is dit een tracker met alles wat daarbij hoort. Zie de
 * noot in functions/api/step.js over wat dat kost en wat het oplevert.
 *
 * ── EN HET MAG NIETS OPHOUDEN ──────────────────────────────────────────────
 *
 * `keepalive` zodat het bericht een navigatie overleeft, geen await, en de fout gaat
 * nergens heen. Een meting die het formulier vertraagt of laat struikelen, kost meer
 * bestellingen dan het inzicht oplevert. Dit is het ene geval waarin een lege catch
 * juist is: er hangt niets van de uitkomst af, en het endpoint antwoordt altijd 204.
 *
 * DE DECLARATIE STAAT BOVENAAN, bij `chain`. Hij stond hier, en dat gaf op elke
 * bestelpagina een ReferenceError bij de eerste boot — zie de noot daar. Wat er over
 * `reached` te weten valt, staat hierboven; waar hij geboren wordt, is een regel over
 * de evaluatievolgorde van deze module en hoort dus bij de andere toestand.
 */

function measure(step) {
  /* Alleen echte stapnummers. `show()` klemt zijn argument tussen 1 en STEPS, dus dit
     kan alleen NaN worden als iemand hem ooit met iets anders dan een getal aanroept —
     en dan hoort er geen rij in de tabel te komen die 'NaN' heet. Het endpoint weigert
     hem ook, maar een bericht dat je niet stuurt hoeft niet geweigerd te worden. */
  if (!Number.isInteger(step)) return;
  if (reached.has(step)) return;
  reached.add(step);
  try {
    /* Uit het formulier en niet uit de config: `service` en `lang` staan er als
       verborgen velden in (OrderFlow.astro, test-sample.astro) en zijn precies de
       waarden die straks in orders.service en orders.lang staan. Daarmee is de
       trechter naast de bestellingen te leggen zonder een tweede naamgeving. */
    const flow = (q('input[name="service"]') || {}).value || '';
    const lang = (q('input[name="lang"]') || {}).value || '';
    if (!flow || !lang) return;
    const body = new URLSearchParams({ step: String(step), flow, lang });
    fetch('/api/step', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {
    /* Een browser zonder fetch of een form dat halverwege verdween. Geen gevolg. */
  }
}

function show(n, opts) {
  const to = Math.min(STEPS, Math.max(1, n));
  current = to;
  measure(to);

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
  /* En het registratienummer, om dezelfde reden als syncVatConfirm() hierboven:
     wie terugloopt naar stap 3 en zijn vinkje weghaalt, moet het veld ook zien
     verdwijnen -- anders staat er een verplicht veld op een stap die de bezoeker
     al voorbij is. */
  syncReg();
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
    f.required = f.dataset.plReq === '1' && isShown(f) && !waived(f) && demanded(f);
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

/**
 * De spiegel van waived(): `data-pl-req-when="no_vat"` maakt een veld ALLEEN
 * verplicht zolang dat vinkje aan staat.
 *
 * WAAROM DIT ERBIJ MOEST. Het registratienummer (12 augustus 2026, VISUAILS
 * levert uitsluitend zakelijk) hangt aan hetzelfde vinkje als het btw-veld, maar
 * de andere kant op: wie een btw-nummer heeft hoeft geen registratienummer, en
 * wie "ik heb er geen" aanvinkt juist wel. Met alleen data-pl-req-unless zou dat
 * twee vinkjes vragen die elkaars tegendeel zijn, en dan is er een stand waarin
 * er geen van de twee is ingevuld.
 *
 * Onbekende naam -> niet verplicht. Dat is de andere faalrichting dan bij
 * waived(), en dat is met opzet: een verwijzing naar een vinkje dat niet bestaat
 * mag geen veld verplicht maken dat de bezoeker niet te zien krijgt. Hij zou dan
 * op Verder drukken en niets kunnen vinden.
 */
function demanded(f) {
  const name = f.dataset && f.dataset.plReqWhen;
  if (!name) return true;
  const box = q(`input[type="checkbox"][name="${name}"]`);
  return !!(box && box.checked);
}

/**
 * Het registratienummer verschijnt zodra de klant zegt geen btw-nummer te hebben.
 *
 * Zelfde vorm als syncVatConfirm() hieronder, en om dezelfde reden: verdwijnt het
 * blok, dan verdwijnt ook het antwoord. Een nummer dat de klant niet meer kan zien
 * mag niet meeliften naar de server -- dan staat er straks een registratienummer
 * op een bestelling met een btw-nummer, en weet niemand meer welk van de twee de
 * klant bedoelde.
 */
function syncReg() {
  const block = q('[data-pl-reg]');
  if (!block) return;
  const noVat = !!(q('input[type="checkbox"][name="no_vat"]') || {}).checked;
  block.hidden = !noVat;
  if (!noVat) {
    const veld = q('input[name=reg_number]');
    if (veld) veld.value = '';
  }
  syncRequired();
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
    // Het registratienummer hangt alleen aan het vinkje, niet aan het land: de
    // eis is "geen btw-nummer, dus iets anders", en die geldt overal.
    if (n === 'no_vat') syncReg();
  };
  form.addEventListener('input', watch);
  form.addEventListener('change', watch);
}

function bindNav() {
  qa('[data-pl-next]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', () => {
      if (!validateStep(current)) return;
      /* Stap 2 is geen poort, maar wel een vraag — zie askMissing(). */
      if (current === 2 && !askMissing()) return;
      let to = current + 1;
      /* De levertijd-stap bestaat alleen voor een bestelling die een leverdatum
         krijgt. Onder de drempel is het een scherm zonder keuze, dus slaan we
         hem over — heen én terug. 3 september 2026. */
      if (GATE_STEP !== null && to === GATE_STEP && !needsGate()) to += 1;
      show(to);
      if (GATE_STEP !== null && to === GATE_STEP) runGate();
    });
  });
  qa('[data-pl-back]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', () => {
      let to = current - 1;
      if (GATE_STEP !== null && to === GATE_STEP && !needsGate()) to -= 1;
      show(to);
    });
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

/** Krijgt deze bestelling een leverdatum? Dan is de levertijd-stap een echte stap. */
function needsGate() {
  return value('tier') === 'attended';
}

/**
 * De levertijd-stap zichtbaar of niet, in de rail én als sectie. Bij een kleine
 * bestelling verdwijnt hij uit de rail en schuift het nummer van de laatste stap
 * op, zodat de balk 01–04 telt en niet 01, 02, 03, 05.
 */
function syncGateVisible(attended) {
  if (GATE_STEP === null) return;
  const on = !!attended;
  const rail = q(`[data-pl-rail-item="${GATE_STEP}"]`);
  const li = rail && rail.closest('li');
  if (li) li.hidden = !on;
  const node = stepNode(GATE_STEP);
  if (node && current !== GATE_STEP) node.classList.toggle('is-skipped', !on);
  for (let i = GATE_STEP + 1; i <= STEPS; i += 1) {
    const item = q(`[data-pl-rail-item="${i}"] .pl-rail-n`);
    if (item) item.textContent = String(on ? i : i - 1).padStart(2, '0');
  }
}

/*
 * ── DE TUSSENSTAP BIJ ONTBREKENDE FOTO'S — 3 september 2026 ─────────────────
 *
 * Stap 2 blijft technisch geen poort (zie ProductUploader.astro), maar wie
 * doorklikt met producten zonder voor- en achterkant krijgt nu eerst een vraag
 * met het gevolg erbij: de productie start pas als alles binnen is, en we nemen
 * contact op. Twee knoppen — foto's toevoegen (standaard) of toch versturen.
 * Lucas, 8 augustus: materiaal vooraf compleet, niet achteraf mailen. Dit is de
 * zachtste vorm daarvan die niemand tegenhoudt.
 */
function askMissing() {
  const box = q('[data-pl-missing]');
  if (!box) return true;
  const short = cards.filter((card) => !cardReady(card));
  if (!short.length || missingOk) { box.hidden = true; return true; }
  const n = short.length;
  const h = q('[data-pl-missing-h]', box);
  if (h) h.textContent = n === 1 ? c('pu.missingHOne') : c('pu.missingH', { n });
  const list = q('[data-pl-missing-list]', box);
  if (list) {
    list.textContent = '';
    short.slice(0, 6).forEach((card) => {
      const li = document.createElement('li');
      const naam = card.input && card.input.value.trim();
      li.textContent = `${naam || c('pu.product', { n: card.n })} — ${shotListText(missingRequired(card))}`;
      list.appendChild(li);
    });
    if (short.length > 6) {
      const li = document.createElement('li');
      li.textContent = c('pu.missingMore', { n: short.length - 6 });
      list.appendChild(li);
    }
  }
  box.hidden = false;
  if (box.tabIndex < 0) box.tabIndex = -1;
  try { box.focus({ preventScroll: true }); } catch { /* nice-to-have */ }
  const top = box.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
  return false;
}

function bindMissing() {
  const box = q('[data-pl-missing]');
  if (!box) return;
  const fix = q('[data-pl-missing-fix]', box);
  const go = q('[data-pl-missing-go]', box);
  if (fix) fix.addEventListener('click', () => {
    box.hidden = true;
    const first = cards.find((card) => !cardReady(card));
    if (first && first.el) {
      first.collapsed = false;
      paintCard(first);
      first.el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      if (first.input) { try { first.input.focus({ preventScroll: true }); } catch { /* ok */ } }
    }
  });
  if (go) go.addEventListener('click', () => {
    missingOk = true;
    box.hidden = true;
    let to = current + 1;
    if (GATE_STEP !== null && to === GATE_STEP && !needsGate()) to += 1;
    show(to);
    if (GATE_STEP !== null && to === GATE_STEP) runGate();
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
  /*
   * ── DE SOORTKEUZE VAN DE PROEF — 13 AUGUSTUS 2026 ─────────────────────────
   *
   * kindOf() leest `[data-pl-kind]:checked` sinds 11 augustus, maar NIEMAND
   * luisterde naar dat veld: hierboven staat `input[name="service"]`, en op
   * /test-sample heet de soortradio `sample_type`. Het gevolg was dat de hele
   * stroom op /test-sample op de soort van het eerste rondje bleef staan —
   * achtergrond, look, verhouding, prijsregel, alles — hoe vaak de bezoeker ook
   * omschakelde. Niet opgevallen omdat geen enkele pagina die stand ooit
   * rendeerde; zie de kop van OrderFlow.astro's `mode`.
   *
   * Op de selector en niet op de veldnaam, om precies de reden die kindOf()
   * geeft: hoe dat veld heet is de zaak van de pagina, wat het BETEKENT staat
   * in het data-attribuut.
   */
  qa('[data-pl-kind]').forEach((r) => {
    r.addEventListener('change', syncOrder);
  });
  bindRatio();
  const count = q('select[name="products"]');
  if (count) count.addEventListener('change', syncOrder);
  bindQty();
  // Task #271f.
  const outfit = q('select[name="outfit_count"]');
  if (outfit) outfit.addEventListener('change', syncTotal);
  /* Voorrang — 9 september 2026. Eén vinkje, en het bedrag eronder beweegt mee
     met het aantal producten; syncTotal() doet allebei via syncVoorrang(). */
  const vrng = q('input[name="voorrang"]');
  if (vrng) vrng.addEventListener('change', syncTotal);
  bindBackground();
  // AFTER bindBackground, and the order matters: bindChannels() ends by running
  // the lock, which reaches into the background radios that bindBackground has
  // just finished binding. Bound first, constrained second.
  bindChannels();
  bindModel();
  /* De hoeken — 9 september 2026. Ná bindModel omdat paintAngles() het lopende
     totaal aanraakt en dat pas klopt als de rest van stap 1 gebonden is. */
  bindAngles();
  // De omschakeling tussen per-product en map. Na de rest, want show() roept
  // syncRequired() en refreshUploader() aan en die willen dat de kaarten en de
  // achtergrond al gebonden zijn.
  bindUploadMode();
}

/*
 * ── HET AANTAL ALS GETAL, EN DE KNOP "MEER DAN 20" — 3 september 2026 ────────
 *
 * De <select name="products"> blijft de bron: productCount() en syncOrder()
 * lezen hem, /api/order krijgt hem gepost, en de laatste optie is nog steeds de
 * tekst "Meer dan N producten" die geen getal is. Wat hier bijkomt is de laag
 * die de klant ziet — een getalveld met − en +, vier snelknoppen en een knop
 * naar het contactpaneel — en die laag schrijft ALTIJD naar de select en
 * dispatcht daar een `change`, zodat alles wat aan het aantal hangt (totaal,
 * kaarten, poort) via dezelfde weg loopt als voorheen.
 *
 * Boven het maximum is er geen formulier meer: syncMore() verbergt de rest van
 * stap 1 en de knop Verder, en toont de twee contactknoppen. Lucas: boven de
 * twintig eerst persoonlijk contact, "via mail of whatsapp (sneller)".
 */
function bindQty() {
  const box = q('[data-pl-qty]');
  const select = q('select[name="products"]');
  const input = q('[data-pl-qty-input]');
  if (!box || !select || !input) return;
  const max = Number.parseInt(input.max, 10) || 1;
  const moreOpt = Array.from(select.options).find((o) => o.value && !/^\d+$/.test(o.value));
  const moreVal = moreOpt ? moreOpt.value : '';
  const clamp = (n) => Math.min(max, Math.max(1, n));
  const push = (v) => {
    select.value = v;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const paint = () => {
    const n = Number.parseInt(select.value, 10);
    qa('[data-pl-qty-set]', box).forEach((b) => b.classList.toggle('is-on', Number(b.dataset.plQtySet) === n));
    const dec = q('[data-pl-qty-dec]', box);
    const inc = q('[data-pl-qty-inc]', box);
    if (dec) dec.disabled = Number.isInteger(n) && n <= 1;
    if (inc) inc.disabled = Number.isInteger(n) && n >= max;
  };
  const apply = (n) => {
    const v = clamp(n);
    input.value = String(v);
    push(String(v));
    paint();
  };
  input.addEventListener('input', () => {
    const n = Number.parseInt(input.value, 10);
    if (!Number.isInteger(n)) { push(''); paint(); return; }
    if (n < 1 || n > max) { push(String(clamp(n))); paint(); return; }
    push(String(n));
    paint();
  });
  input.addEventListener('blur', () => {
    const n = Number.parseInt(input.value, 10);
    if (Number.isInteger(n) && (n < 1 || n > max)) apply(n);
  });
  const dec = q('[data-pl-qty-dec]', box);
  const inc = q('[data-pl-qty-inc]', box);
  if (dec) dec.addEventListener('click', () => apply((Number.parseInt(select.value, 10) || 2) - 1));
  if (inc) inc.addEventListener('click', () => apply((Number.parseInt(select.value, 10) || 0) + 1));
  qa('[data-pl-qty-set]', box).forEach((b) => b.addEventListener('click', () => apply(Number(b.dataset.plQtySet))));
  const more = q('[data-pl-qty-more]');
  if (more && moreVal) {
    more.addEventListener('click', () => {
      input.value = '';
      push(moreVal);
      paint();
    });
  }
  const back = q('[data-pl-qty-back]');
  if (back) {
    back.addEventListener('click', () => {
      push('');
      paint();
      try { input.focus(); } catch { /* geen focus is geen fout */ }
    });
  }
  // Een herstelde of voorgevulde select (bfcache, terug-knop) landt ook in het veld.
  const start = Number.parseInt(select.value, 10);
  if (Number.isInteger(start)) input.value = String(start);

  /* ── EEN AANTAL DAT UIT DE VORIGE PAGINA KOMT — 10 september 2026 ─────────
     `?producten=<n>` wordt gezet door CombiKeuze.astro: wie in het catalogue-
     formulier op "lifestyle erbij" klikt, komt in het combinatieformulier
     terecht en hoort niet opnieuw te moeten typen hoeveel producten hij heeft.
     Zie de kop van die component voor waarom dat een link is en geen vinkje.

     NA het herstel hierboven en niet ervoor: een terug-knop met een ingevulde
     select is een klant die zijn eigen antwoord terugkrijgt, en dat wint van
     een getal uit de URL. Alleen als er nog niets staat telt de parameter mee.

     Gefilterd op cijfers en geknepen tot het maximum, want dit is invoer van
     buiten: `?producten=999` mag geen bestelling van 999 producten opleveren,
     en `?producten=<script>` mag hier niet eens langskomen. */
  if (!Number.isInteger(start)) {
    try {
      const raw = new URLSearchParams(location.search).get('producten') || '';
      if (/^\d{1,3}$/.test(raw)) {
        const n = clamp(Number.parseInt(raw, 10));
        if (n >= 1) apply(n);
      }
    } catch { /* geen URL, geen voorkeur */ }
  }

  paint();
}

/**
 * Het contactpaneel boven het maximum. Alles in stap 1 ná het aantal gaat dicht,
 * behalve het paneel zelf en het foutvak; wat dichtging wordt onthouden in
 * data-pl-more-hid zodat een element dat al `hidden` was, dat blijft.
 */
function syncMore(on) {
  const step = stepNode(1);
  const panel = q('[data-pl-more-panel]');
  const qty = q('[data-pl-qty]');
  if (!step || !panel || !qty) return;
  const was = !panel.hidden;
  panel.hidden = !on;
  const more = q('[data-pl-qty-more]');
  if (more) more.setAttribute('aria-expanded', on ? 'true' : 'false');
  let after = false;
  Array.from(step.children).forEach((ch) => {
    if (ch === qty) { after = true; return; }
    if (!after || ch === panel || ch.hasAttribute('data-pl-step-error')) return;
    if (on) {
      if (!ch.hidden) { ch.hidden = true; ch.dataset.plMoreHid = '1'; }
    } else if (ch.dataset.plMoreHid) {
      ch.hidden = false;
      delete ch.dataset.plMoreHid;
    }
  });
  step.classList.toggle('is-more', on);
  if (on && !was) {
    const h = panel.querySelector('h3');
    if (h) {
      if (h.tabIndex < 0) h.tabIndex = -1;
      try { h.focus({ preventScroll: true }); } catch { /* nice-to-have */ }
    }
  }
}

/**
 * The ladder kind — 'complete' | 'catalog' | 'lifestyle'.
 *
 * TWO SOURCES, IN ORDER, AND NEITHER IS THE URL. A radio's data attribute if
 * the page asks the question (nothing ships that way today, but a page is
 * allowed to), and otherwise `service` out of the config blob, which is what
 * every per-service flow renders. The value on the wire is NOT parsed for it:
 * `drop` is what /api/order’s ORDER_SERVICES and the D1 `service` column call a
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
  syncMore(!!chosen && !Number.isInteger(n));
  syncGateVisible(attended);

  syncOutfit(kind);
  syncBackground(kind);
  // De twee vragen die net als de achtergrond van de SOORT afhangen. Hier en
  // niet aan de soortradio zelf gehangen, want dit is de plek waar elke
  // verandering van stap 1 samenkomt — een tweede plek die "als de soort
  // verandert" zegt, is een plek die ooit één van de drie vergeet.
  syncStyle(kind);
  syncRatio(kind);
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
    if (t && t.name === 'model') {
      syncSummaries();
      /* De eerste optie van elke kaart draagt de NAAM van het gezicht van de
         bestelling ("Hetzelfde als de bestelling · Ava"). Verandert dat gezicht,
         dan klopt die regel op dertig kaarten niet meer. Zie paintModelDefaults. */
      paintModelDefaults();
    }
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
 * EN DE VERPLICHTING SCHUIFT MEE. De notities bij de extra foto’s staan op de
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

/**
 * De tegenhanger: heeft deze soort een LOOK te kiezen?
 *
 * ── WAAROM DEZE ER NIET WAS, EN WAAROM HIJ NU MOET — 13 AUGUSTUS 2026 ───────
 *
 * Op /start ligt de dienst vast voordat de pagina laadt, en die pagina slot
 * precies één van de twee kiezers in: catalog krijgt de achtergrond, lifestyle
 * de look. Er viel dus nooit iets te verbergen — syncBackground() bestond alleen
 * omdat `complete` beide heeft en de achtergrond daar wél weg moet kunnen.
 *
 * /test-sample heeft ze allebei op de pagina en laat de bezoeker ter plekke
 * kiezen. Zonder deze functie zou een catalogproef de vier looks tonen — precies
 * de klacht die Lucas op 13 augustus over dat formulier had, maar dan andersom:
 * *"als bezoekers lifestyle kiezen moet deze aangepast worden daarop, dus
 * achtergrondkleur optie verdwijnt dan."* Eén kant zonder de andere is een halve
 * regel.
 */
function styleApplies(kind) {
  return kind === 'complete' || kind === 'lifestyle';
}

/**
 * De lookkiezer aan of uit, met dezelfde twee schakelaars als syncBackground().
 *
 * `disabled` OP DE FIELDSET EN NIET ALLEEN `hidden`, en dat is het hele punt:
 * CSS houdt geen veld uit een POST. Een verborgen radio die aan staat, reist
 * gewoon mee, en dan staat er bij een catalogproef een look in details_json bij
 * werk waar geen look aan te pas komt. Een `disabled` fieldset haalt zijn hele
 * inhoud uit de inzending — dezelfde regel, dezelfde reden, één regel eronder.
 */
function syncStyle(kind) {
  const field = q('[data-pl-look]');
  if (!field) return;
  const applies = styleApplies(kind);
  field.hidden = !applies;
  field.disabled = !applies;
  // De keuze blijft AANGEVINKT staan. Wie van lifestyle naar catalog en terug
  // gaat, hoort zijn look niet kwijt te zijn — hij post alleen niet zolang de
  // vraag niet van toepassing is, en syncSummaries() leest ':disabled' en niet
  // ':checked' om te weten of er een antwoord is.
  syncSummaries();
}

/* ── DE BEELDVERHOUDING ─────────────────────────────────────────────────────
 *
 * Lucas, 13 augustus 2026: *"Ze missen ook nog in de orderflow, ik kan ze niet
 * kiezen bij het maken van een order."*
 *
 * Twee dingen bewegen hier mee met de soort, en allebei om dezelfde reden als
 * bij de achtergrond hierboven: op /test-sample kiest de bezoeker de soort in
 * het formulier zelf, dus wat "bij deze dienst hoort" kan tijdens het invullen
 * veranderen.
 *
 *   · 16:9 is een lifestyleverhouding. Een catalogbestelling krijgt hem niet —
 *     zie de kop van src/data/ratios.js: een grid met één breed beeld erin is
 *     precies het scheve grid waar een merk mee bij ons komt.
 *   · De uitleg eronder verschilt. Bij catalog is dit DE keuze voor de hele
 *     bestelling; bij lifestyle is het het startpunt waar per beeld van
 *     afgeweken mag worden.
 *
 * DE VERBORGEN TEGEL WORDT OOK UITGEVINKT, en dat is anders dan bij de look
 * hierboven. Reden: `ratio` is één radiogroep waar altijd precies één antwoord
 * uit moet komen. Blijft 16:9 aangevinkt terwijl hij onzichtbaar is, dan post
 * een catalogbestelling een verhouding die catalog niet kent, en dan valt de
 * controle op de server erop terug — met een stille correctie naar iets wat de
 * klant niet gekozen heeft. Dus: terug naar de standaard, zichtbaar, in het
 * formulier waar hij het kan zien.
 */
/* ── EN `complete` IS GEEN LIFESTYLEBESTELLING — 9 september 2026 ───────────
 *
 * Lucas: *"catalog is allemaal hetzelfde formaat maar lifestyle kan de klant
 * per product kiezen welk formaat hij wilt, dus check de gehele bestelform even
 * op dit soort fouten."*
 *
 * Hier stond `styleApplies(kind)`, en dat is waar voor lifestyle ÉN complete.
 * Gevolg: op een complete-bestelling stonden 16:9 en 9:16 in de rij — en die
 * verhouding is de verhouding van de HELE bestelling, dus ook van de vier
 * catalogbeelden. Precies het scheve grid waar de kop van ratios.js voor
 * waarschuwt, aangeboden door het formulier zelf.
 *
 * Een complete-bestelling is twee dingen in één, en deze radiogroep hoort bij
 * de helft die er GEEN uitzondering op kent: de catalogset is vier beelden in
 * hetzelfde kader. De lifestylehelft wijkt daarvan af waar het nodig is, en dat
 * gebeurt op de productkaart — per beeld, wat fijner is dan per product.
 * `cfg.ratio.perImage` staat op complete nog gewoon aan (zie OrderFlow), dus
 * die weg blijft open; alleen de ORDERverhouding is nu catalogveilig. */
function ratioApplies(kind, id) {
  const only = (cfg.ratio && cfg.ratio.lifestyleOnly) || [];
  return only.indexOf(id) === -1 || kind === 'lifestyle';
}

function syncRatio(kind) {
  const field = q('[data-pl-ratio]');
  if (!field) return;

  /* De regel in de dichte vouw — 10 september 2026. De beeldvorm zit sinds
     vandaag achter een <Disclose>, en een vouw die zijn eigen antwoord niet toont
     is een vouw die iets verstopt. Het label plus de naam, uit de tegel zelf zodat
     hij nooit iets anders kan zeggen dan wat er aanstaat. */
  const aan = q('input[name="ratio"]:checked');
  const tegel = aan && aan.closest('[data-pl-ratio-tile]');
  if (tegel) {
    const label = q('.ratio-label', tegel);
    const naam = q('.ratio-naam', tegel) || q('.ratio-name', tegel);
    const stukken = [label && label.textContent.trim(), naam && naam.textContent.trim()].filter(Boolean);
    if (stukken.length) setSummary('data-pl-sum-ratio', stukken.join(' · '));
  }

  let bumped = false;
  qa('[data-pl-ratio-tile]').forEach((tile) => {
    const id = tile.dataset.plRatioTile;
    const on = ratioApplies(kind, id);
    tile.hidden = !on;
    const input = q('input[name="ratio"]', tile);
    if (!input) return;
    input.disabled = !on;
    if (!on && input.checked) { input.checked = false; bumped = true; }
  });

  // Niets meer aangevinkt — of omdat de keuze net verdween, of omdat de pagina
  // zonder standaard laadde. Terug naar de verhouding die altijd werkt.
  if (bumped || !q('input[name="ratio"]:checked')) {
    const fallback = (cfg.ratio && cfg.ratio.fallback) || 'square';
    const target = qa('input[name="ratio"]').find((r) => r.value === fallback && !r.disabled);
    if (target) target.checked = true;
  }

  /* Drie zinnen en niet twee, sinds complete zijn eigen geval is: bij catalog
     één verhouding voor alles, bij lifestyle een startpunt waar elk beeld van
     mag afwijken, en bij complete allebei tegelijk — vast voor de catalogset,
     afwijkbaar in de carousel. Zie de noot bij ratioApplies() hierboven. */
  const each = !!(cfg.ratio && cfg.ratio.perImage) && styleApplies(kind);
  const beide = each && kind === 'complete';
  const batchHint = q('[data-pl-ratio-hint-batch]');
  const eachHint = q('[data-pl-ratio-hint-each]');
  const beideHint = q('[data-pl-ratio-hint-complete]');
  if (batchHint) batchHint.hidden = each;
  if (eachHint) eachHint.hidden = !each || beide;
  if (beideHint) beideHint.hidden = !beide;

  // De keuzelijstjes op de kaarten dragen de gekozen verhouding in hun eerste
  // optie ("Zelfde als de bestelling"), zodat een klant daar niet hoeft te
  // onthouden wat hij bovenaan koos.
  paintRatioDefaults();
  syncSummaries();
}

/** De naam van de verhouding die nu voor de hele bestelling geldt, of ''. */
function ratioNow() {
  const r = q('input[name="ratio"]:checked');
  return r && !r.matches(':disabled') ? r.value : '';
}

/**
 * De eerste optie van elk keuzelijstje op een kaart, bijgewerkt.
 *
 * "Zelfde als de bestelling" is waar, maar zegt niet WAT dat is, en een klant
 * die dertig kaarten open heeft staan, scrollt niet terug naar boven om het te
 * controleren. Dus staat de gekozen verhouding erachter. De WAARDE van die optie
 * blijft leeg — dat is wat "volg de standaard" betekent in effectiveRatio(), en
 * een keuze die de standaard overtypt zou stil blijven staan als de klant
 * bovenaan iets anders kiest.
 */
function ratioSameText() {
  const id = ratioNow();
  const label = id ? c(`ratio.name.${id}`) : '';
  return label ? `${c('pu.ratioSame')} — ${label}` : c('pu.ratioSame');
}

function paintRatioDefaults() {
  const text = ratioSameText();
  qa('[data-pl-ratio-same]').forEach((opt) => { opt.textContent = text; });
}

function bindRatio() {
  qa('input[name="ratio"]').forEach((r) => {
    r.addEventListener('change', () => syncRatio(kindOf()));
  });
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
function quoteFor(kind, n, outfits, extras = 0, hoog = 0) {
  const rate = rateFor(kind, n);
  if (rate === null) return null;
  // Extra photos follow the ladder (pricing.js EXTRA_PHOTO_LADDER), so their
  // rate is read at the SAME product count as the products themselves — one
  // rung for the whole order, which is the consistency that choice was made
  // for. The outfit surcharge is flat and does not move with n.
  const extraRate = extraRateNow();
  /* 4K is VLAK en volgt de ladder niet: het werk achter een opschaling daalt
     niet met het aantal. Zie HOOG_PER_PRODUCT in pricing.js. */
  const hoogPrijs = Number((cfg.hoogRes && cfg.hoogRes.prijs) || 0);
  return {
    rate,
    extraRate,
    hoogPrijs,
    net: round2(n * rate + outfits * Number(cfg.outfitSurcharge || 0) + extras * extraRate + hoog * hoogPrijs),
  };
}

/**
 * The running total: one figure, and the sentence that explains it.
 *
 * THE LABEL CARRIES THE SIDE OF VAT. BRIEF-14's rule is that no price is
 * printed without saying which side of VAT it is on; the page's own label does
 * that (vatLabel('excl')), which is why one honest row is enough and a second
 * row at somebody else’s rate would be worse than none.
 *
 * NOTHING HERE IS AUTHORITATIVE. See the note at the top of this file: this is
 * a preview, the invoice is derived server-side, and no amount is ever posted.
 */
function syncTotal() {
  const kind = kindOf();
  const n = productCount();
  const outfits = outfitCount();
  const extras = extrasCount();
  const hoog = hoogResCount();
  const quote = kind ? quoteFor(kind, n, outfits, extras, hoog) : null;
  /* Voorrang staat BUITEN quoteFor(), want het is geen regel maar een deel van
     de uitkomst: eerst weten wat de bestelling kost, dan pas wat voorrang erop
     kost. Dezelfde volgorde als in quoteOrder() op de server. */
  syncVoorrang(quote ? quote.net : NaN);
  const voorrang = voorrangAan() && quote ? voorrangBedragNu(quote.net) : null;
  if (quote && voorrang !== null) quote.net = round2(quote.net + voorrang);
  // Het tarief van een bijbestelde foto hangt aan het AANTAL PRODUCTEN, dus een
  // gewijzigd aantal moet de hoekenkiezer opnieuw laten rekenen — anders blijft
  // hij de trede noemen die de bestelling zojuist verlaten heeft. paintAngles()
  // roept nooit terug in deze functie, dus er is geen lus om tegen te waken.
  paintAngles();

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
    if (hoog > 0) noteText += c('total.hoogRes', { price: euro(quote.hoogPrijs), n: hoog, px: String((cfg.hoogRes && cfg.hoogRes.hoog) || '') });
    if (voorrang !== null) noteText += c('total.voorrang', { price: euro(voorrang) });
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
  // the saving by 21% and be wrong in the client’s favour, which is still wrong.
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

  paintPlan(kind, n);
}

/*
 * ── DE ABONNEMENTSREGEL ─────────────────────────────────────────────────────
 *
 * 8 september 2026. Tot vandaag noemde dit formulier het abonnement nergens —
 * de bevestigingsmail was de enige plek waar een kopende klant er een aangeboden
 * kreeg, ná de bestelling. Zie de kop bij PLAN_ROWS in OrderFlow.astro en
 * kladblok/VOORSTEL-D4-ABONNEMENTEN.md.
 *
 * DRIE POORTEN, EN ALLE DRIE OM DEZELFDE REDEN: een regel die de klant met een
 * rekenmachine kan weerleggen, kost meer dan hij oplevert.
 *
 *   1 · DE PROEF NIET. Eén product van één euro; een maandbedrag ernaast is
 *       geen aanbod maar een grap.
 *   2 · ONDER HET KLEINSTE PLAN NIET. Wie vier producten bestelt, heeft niets
 *       aan een maandbedrag voor vijf. De drempel komt uit cfg.plans en is
 *       hier niet ingetypt.
 *   3 · BIJ CATALOG GEEN BEDRAGEN. Een abonnement levert `complete`; tegen een
 *       catalogbestelling van hetzelfde aantal is het duurder (twaalf
 *       producten: € 612 om € 790). De twee bedragen in `plan.compare` gaan
 *       allebei over het abonnement en zijn dus waar, maar ze nodigen uit tot
 *       een vergelijking van twee verschillende dingen. Daar staat `plan.steady`
 *       — dezelfde uitnodiging, zonder de rekensom die niet klopt.
 *
 * HET PLAN DAT ERBIJ STAAT is dat met het aantal dat het DICHTST bij de
 * bestelling ligt, met de kleinste bij gelijkspel — niet het kleinste plan dat
 * het aantal dekt. Dat laatste springt boven de twaalf meteen naar Merk, en dan
 * krijgt iemand die dertien producten bestelt een maandbedrag van € 1.690
 * voorgeschoteld. Zie dezelfde noot in OrderFlow.astro.
 */
function paintPlan(kind, n) {
  const host = q('[data-pl-plan]');
  if (!host) return;
  const zin = q('[data-pl-plan-t]', host);
  const cta = q('[data-pl-plan-cta]', host);
  const rijen = Array.isArray(cfg.plans) ? cfg.plans : [];

  const verberg = () => {
    if (zin) zin.textContent = '';
    if (cta) cta.textContent = '';
    host.hidden = true;
  };

  if (!zin) return verberg();
  if (cfg.sample || !rijen.length || !kind || !Number.isInteger(n) || n < 1) return verberg();
  if (kind !== 'complete' && kind !== 'lifestyle' && kind !== 'catalog') return verberg();

  const kleinste = rijen.reduce((a, b) => (b.products < a.products ? b : a), rijen[0]);
  if (n < kleinste.products) return verberg();

  // Dichtstbijzijnd op aantal; bij gelijkspel de kleinste, want `<` en niet `<=`
  // laat de eerste (en de lijst staat oplopend) staan.
  const plan = rijen.reduce((a, b) =>
    (Math.abs(b.products - n) < Math.abs(a.products - n) ? b : a), rijen[0]);

  if (kind === 'catalog' || !plan.ladder) {
    zin.textContent = c('plan.steady');
  } else {
    zin.textContent = c('plan.compare', {
      name: plan.name,
      covers: plan.covers,
      price: plan.price,
      ladder: plan.ladder,
    });
  }
  if (cta) cta.textContent = c('plan.cta');
  host.hidden = false;
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
  /* `let` is de beeldkeuring: een zin die naast het vakje komt te staan zonder
     de upload tegen te houden. Apart van `msg`, want die wordt overschreven
     door elke voortgangsstap en de melding hoort te blijven staan als het
     bestand allang binnen is. Zie keurBeeld(). */
  return { status: 'empty', file: null, key: '', url: '', msg: '', let: '', pct: 0, thumb: false, tries: 0 };
}

function shotLabel(id) {
  // Een extra slot heeft geen vaste naam in shots.js — het is er één van maximaal
  // vier en draagt zijn nummer. Hier en niet in buildSlot(), zodat er één plek is
  // waar een slot zijn woord vandaan haalt.
  const n = extraSlotNumber(id);
  if (n) return c('pu.extraSlot', { n });
  // Een gratis referentievak draagt zijn nummer op dezelfde manier. Een ANDER
  // woord dan bij de betaalde, en dat is het hele punt: "Extra foto 2" naast
  // "Referentie 2" is precies de verwarring waar de eigen prefix voor bestaat.
  const r = refShotNumber(id);
  if (r) return c('pu.refSlot', { n: r });
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
 * The ceiling on cards.
 *
 * ── DEZE AFLEIDING STOND OP DE KOP — 13 AUGUSTUS 2026 ───────────────────────
 *
 * Hier stond `Math.floor(cfg.maxBatchFiles / SHOT_IDS.length)`, met de uitleg dat
 * vier shots per product tegen het batchplafond "the number of products that could
 * ever be uploaded for in one order" oplevert. Dat rekende de goede kant op zolang
 * een product precies vier bestanden had.
 *
 * Het staat er verkeerd om. Het aantal PRODUCTEN is het gegeven — dat is wat de
 * capaciteitspoort per venster aankan (ATTENDED_PER_WINDOW, hier `maxProducts`) —
 * en het aantal BESTANDEN volgt daaruit. Omgekeerd rekenen betekent dat het
 * bestandsplafond stil bepaalt hoeveel producten er te koop zijn.
 *
 * Wat dat kostte, bleek toen het bestandsplafond vandaag van 140 naar 240 ging om
 * de extra foto’s te dekken: deze regel bood daarmee ineens 60 productkaarten aan,
 * het dubbele van wat de agenda kan inplannen. Een formulier dat zestig producten
 * aanneemt en een poort die er dertig doorlaat — precies de belofte-zonder-dekking
 * waar /video vandaag ook op is nagekeken.
 *
 * Dus: `maxProducts` uit de config, die er al in zat en die ATTENDED_PER_WINDOW is.
 * De terugval blijft 30 en niet een gedeeld getal, want een ontbrekende config mag
 * geen ander aanbod opleveren dan een aanwezige.
 */
function maxCards() {
  /* Het proefbeeld is er één per bedrijf, één keer. Dan is één kaart ook het
     maximum — Lucas, 4 september: *"Bij test sample kan klant een tweede
     product kiezen terwijl je voor 1 product per bedrijf kan bestellen nooit
     meer."* Zonder deze regel viel /test-sample in de "aantal onbekend"-tak
     (er staat geen keuzelijst voor het aantal op die pagina) en kreeg hij dus
     de knop "Nog een product toevoegen". */
  if (cfg && cfg.sample) return 1;
  const cap = Math.floor(Number(cfg && cfg.maxProducts));
  return cap > 0 ? cap : 30;
}

/**
 * Hoeveel kaarten er MINSTENS staan: het aantal dat de klant ZELF op stap 1
 * koos, en niet het aantal van dit moment.
 *
 * Lucas: *"Wanneer de klant vanaf het begin 5 producten heeft gekozen kan hij
 * niet kiezen om eentje te verwijderen, hij kan alleen extra producten die hij
 * op dat scherm heeft toegevoegd verwijderen en niet lager gaan dan 5."*
 *
 * Dat "vanaf het begin" is de hele moeilijkheid. De knop "nog een product"
 * verhoogt sinds vandaag óók het aantal op stap 1 (anders lopen de foto's en de
 * rekening uiteen — zie de noot bij de knop), dus het live aantal is altijd
 * gelijk aan het aantal kaarten en kan de bodem niet zijn. De bodem is het
 * laatste aantal dat de KLANT heeft gekozen: `bodemProducten`, dat alleen
 * bijwerkt bij een wijziging die niet van deze twee knoppen komt.
 */
function onteltBodem() {
  if (telViaKnop) return;
  const n = productCount();
  bodemProducten = Number.isInteger(n) && n > 0 ? n : 0;
}
function minCards() {
  const bodem = bodemProducten > 0 ? bodemProducten : 1;
  return Math.max(1, Math.min(bodem, maxCards()));
}

/** Kan er nog een product bij? Zie de noot bij de knop in bindUploader(). */
function kanErbij() {
  if (cards.length >= maxCards()) return false;
  const n = productCount();
  if (!Number.isInteger(n)) return true;
  const sel = q('select[name="products"]');
  return !!(sel && [...sel.options].some((o) => Number(o.value) === n + 1));
}

/** De knop staat er alleen als hij iets kan. Eén regel, twee aanroepers. */
function syncAddKnop() {
  const add = q('[data-pl-add]');
  if (add) add.hidden = !kanErbij();
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
    // ONLY WHEN THE COUNT IS UNKNOWN. This button exists for the "More than N" (per-service ceiling)
    // option, where productCount() is NaN and the card list has no number to
    // follow. It was rendered at every count, and pressing it added a card
    // WITHOUT touching select[name="products"] — so a customer who ordered
    // three products and pressed it twice uploaded photos for five and was
    // quoted for three, with the two screens contradicting each other and
    // neither flagging it. A card list that can disagree with the price is
    // worse than a card list that cannot grow.
    /* ── DE KNOP TELT NU MEE — 4 september 2026 ──────────────────────────────
       Hij stond alleen bij een ONBEKEND aantal ("meer dan N"), met een goede
       reden: hij voegde een kaart toe zonder select[name="products"] aan te
       raken, en dan uploadde je foto's voor vijf producten terwijl je er drie
       betaalde. Twee schermen die elkaar tegenspraken.

       De oplossing is niet de knop weghalen maar hem het AANTAL laten
       bijwerken: één product erbij is één kaart erbij én één product erbij op
       de rekening. Daarmee kan de knop overal staan, en dat is wat een klant
       met één product extra verwacht. Kan het aantal niet mee (de lijst kent
       die waarde niet, of we zitten aan het plafond), dan doet de knop niets en
       staat hij er ook niet. */
    onteltBodem();
    syncAddKnop();
    document.addEventListener('change', (e) => {
      if (!e.target || e.target.name !== 'products') return;
      onteltBodem();
      syncAddKnop();
      /* En opnieuw schilderen: syncOrder() heeft de kaarten al bijgewerkt vóór
         deze regel (beide hangen aan hetzelfde change-event), dus zonder dit
         staat de weghaalknop nog op de bodem van dáárvoor. */
      cards.forEach(paintCard);
    });
    add.addEventListener('click', () => {
      if (!kanErbij()) return;
      const n = productCount();
      const sel = q('select[name="products"]');
      if (Number.isInteger(n) && sel) {
        /* Het aantal ophogen en de rest laten volgen: `change` roept syncOrder
           aan, die het tarief, de stap en syncCards() bijwerkt — daar wordt de
           kaart gemaakt. Zo is er één plek die weet hoeveel kaarten er horen.
           `telViaKnop` zegt tegen onteltBodem() dat deze wijziging van de knop
           komt en dus niet de bodem is. */
        telViaKnop = true;
        sel.value = String(n + 1);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        telViaKnop = false;
      } else {
        addCard();
        refreshUploader();
      }
      syncAddKnop();
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
 * DEZE FUNCTIE STOND HIER, EN DAT WAS DE FOUT — 7 september 2026. Hij splitste
 * de naam zelf en riep guessShot() aan op elk LOS token. Een aanwijzing van twee
 * woorden ("on model", "close-up") kon zo nooit als geheel herkend worden: het
 * shot werd goed geraden op het losse woord en de andere helft bleef aan de
 * productnaam plakken. `hoodie-on-model.jpg` maakte een product "hoodie-on" dat
 * om zijn eigen voor- en achterkant vroeg, en daar liep de klant vast.
 *
 * Twee lezingen van dezelfde tabel is één te veel. productStem() staat nu in
 * shots.js, naast guessShot(), en gebruikt dezelfde lijst met dezelfde
 * langste-eerst-volgorde. Zie de noot daar.
 */
const stemOf = (name) => productStem(name);

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

  // NAMED, AND THE NAME POSTS. `product_p3` is not in /api/order’s TOP_FIELDS,
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

  /* ── EN WEER WEG — 4 september 2026 ──────────────────────────────────────
     Een product dat je per ongeluk toevoegde, moet je kunnen terugnemen. Alleen
     de LAATSTE kaart draagt de knop, en alleen boven het bestelde aantal (zie
     minCards). Alleen de laatste, omdat de kaarten `p1`, `p2`, `p3` heten en
     die sleutel bij elke geüploade foto in R2 staat: een kaart uit het midden
     weghalen zou de rest moeten hernummeren, en dan hoort de foto van product 3
     ineens bij product 2. Wat er wél gebeurt met foto's op een kaart die weggaat:
     ze vallen in de bak onderaan (`trayAdd` in dropCard), niet in de prullenbak. */
  const weg = document.createElement('button');
  weg.type = 'button';
  weg.className = 'pu-weg';
  weg.hidden = true;
  weg.textContent = c('pu.dropCard');
  weg.addEventListener('click', () => {
    if (cards.length <= minCards() || cards[cards.length - 1] !== card) return;
    const n = productCount();
    const sel = q('select[name="products"]');
    if (Number.isInteger(n) && sel && [...sel.options].some((o) => Number(o.value) === n - 1)) {
      /* Net als bij toevoegen: het AANTAL is de waarheid en syncCards() volgt. */
      telViaKnop = true;
      sel.value = String(n - 1);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      telViaKnop = false;
    } else {
      dropCard(card);
      refreshUploader();
    }
    syncAddKnop();
  });
  card.wegEl = weg;

  head.append(num, input, toggle, state, weg);

  const slots = document.createElement('div');
  slots.className = 'pu-slots';
  slots.id = `pu-slots-${card.key}`;
  SHOT_IDS.forEach((id) => slots.appendChild(buildSlot(card, id)));
  // Het plusje staat IN dit raster, achter de vier aanbevolen vakken, want dat is
  // waar Lucas het beschreef: *"een plusje naast de 4 aanbevolen foto’s"*. Het is
  // dus geen apart blok verderop maar het vijfde vakje van dezelfde rij.
  buildRefs(card, slots);

  // The three optional questions, folded into the SAME disclosure as the four
  // slots — aria-controls takes a list, so one toggle honestly names both.
  const about = buildAbout(card);
  toggle.setAttribute('aria-controls', `${slots.id} ${about.id}`);

  // De afwijking per beeld, als deze stroom hem heeft. In dezelfde uitklap als
  // de foto’s en de vraag — één knop die eerlijk zegt wat hij opent — en dus
  // ook in aria-controls, of de knop noemt twee van de drie dingen die hij
  // laat verschijnen.
  const ratios = buildRatios(card);
  if (ratios) toggle.setAttribute('aria-controls', `${slots.id} ${about.id} ${ratios.id}`);

  /* ── ALLES WAT MEESTAL HETZELFDE IS, GAAT IN ÉÉN LADE — 9 september 2026 ──
   *
   * Lucas: *"Herontwerp het per product invoeren in bestelformulieren, maak het
   * veel overzichtelijker, consistenter en ruimtelijker omdat dit de meest zware
   * taak is voor de klant."*
   *
   * ── WAT ER MIS WAS, IN GETALLEN ────────────────────────────────────────────
   *
   * Gemeten met kladblok/_stap2.mjs op de stand van vanochtend: één kaart was
   * 1.058 pixels hoog op een desktop en 1.722 op een telefoon, met dertien
   * velden in acht losse blokken. Zes producten maakten een pagina van 9.916
   * pixels; twintig zou ruim dertigduizend zijn.
   *
   * En de verdeling klopte niet. Het UPLOADEN is echt werk per product — daar
   * is geen weg omheen, elk product heeft eigen foto's. Materiaal, kleur, extra
   * foto's, 4K, gezicht en verhouding zijn voor verreweg de meeste klanten bij
   * ELK product hetzelfde, en die stonden even zwaar, twintig keer herhaald.
   *
   * ── DE REGEL DIE ERUIT VOLGT ───────────────────────────────────────────────
   *
   * EEN KAART TOONT WAT ANDERS IS, NIET ALLES. De foto's blijven staan. De rest
   * gaat achter één knop die zegt wat er afwijkt — "Volgt de bestelling", of
   * "Ava · 4K · beeld 2 breed". Wie niets bijzonders heeft, ziet die regel en
   * scrollt door; wie wél iets afwijkt, ziet het van een afstand op de kaart
   * waar het gebeurt.
   *
   * Vier soorten klant, en alle vier winnen ze iets anders:
   *
   *   ÉÉN PRODUCT      de kaart is een half scherm in plaats van een heel; alles
   *                    is nog te bereiken met één klik.
   *   VIJF TOT TIEN    dezelfde stof, hetzelfde gezicht, geen extra's — hij vult
   *                    alleen foto's in en raakt de lade nooit aan.
   *   TWINTIG, GEMENGD hij ziet in één blik welke producten afwijken, in plaats
   *                    van twintig identieke muren te moeten aflezen.
   *   OP EEN TELEFOON  van 1.722 naar een paar honderd pixels per product.
   *
   * ── WAAROM ÉÉN LADE EN NIET VIJF ───────────────────────────────────────────
   *
   * Vijf uitklappers is dezelfde muur met deurtjes ervoor. Wat de klant wil
   * weten is niet "waar staat de 4K-knop" maar "wijkt dit product ergens van
   * af" — één vraag, dus één deur, met het antwoord op de deur geschreven. */
  const meer = buildMeer(card, [about, ratios]);
  toggle.setAttribute('aria-controls', `${slots.id} ${meer.id}`);

  li.append(head, slots, meer);
  card.el = li;
  card.input = input;
  card.stateEl = state;
  card.toggleEl = toggle;
  paintCard(card);
}

/**
 * De lade: één knop met de samenvatting erop, en alles wat kan afwijken erin.
 *
 * De blokken worden NIET hier gebouwd — ze komen binnen als ze al bestaan, en
 * blijven dus precies wat ze waren. Dit is een herindeling en geen herschrijving
 * van de vragen zelf: `about` draagt nog steeds materiaal, kleur en de extra
 * foto's uit attributes.js, en `ratios` nog steeds de verhouding per beeld.
 */
function buildMeer(card, blokken) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-meer';
  wrap.id = `pu-meer-${card.key}`;

  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'pu-meer-knop';
  knop.setAttribute('aria-expanded', 'false');
  knop.setAttribute('aria-controls', `pu-meer-in-${card.key}`);

  const kop = document.createElement('span');
  kop.className = 'pu-meer-t';
  kop.textContent = c('pu.meerH');

  /* De samenvatting is het hele punt van deze knop, dus hij staat erop en niet
     eronder: wie scrollt leest per kaart één regel en weet genoeg. */
  const vat = document.createElement('span');
  vat.className = 'pu-meer-vat';

  const pijl = document.createElement('span');
  pijl.className = 'pu-meer-pijl';
  pijl.setAttribute('aria-hidden', 'true');
  pijl.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6 L8 11 L13 6"/></svg>';

  knop.append(kop, vat, pijl);

  const in_ = document.createElement('div');
  in_.className = 'pu-meer-in';
  in_.id = `pu-meer-in-${card.key}`;
  in_.hidden = true;
  for (const blok of blokken) if (blok) in_.appendChild(blok);

  knop.addEventListener('click', () => {
    card.meerOpen = !card.meerOpen;
    paintMeer(card);
  });
  /* Wat er in de lade verandert, verandert de regel erop. Eén luisteraar op de
     lade zelf en niet één per veld: de velden worden door vier verschillende
     bouwers gemaakt en een nieuwe bouwer zou de zijne moeten onthouden. */
  ['input', 'change'].forEach((ev) => in_.addEventListener(ev, () => paintMeer(card)));

  wrap.append(knop, in_);
  card.meerKnop = knop;
  card.meerIn = in_;
  card.meerVat = vat;
  card.meerOpen = false;
  return wrap;
}

/**
 * Wat wijkt dit product af van de bestelling? Eén regel, of de mededeling dat
 * er niets afwijkt.
 *
 * ALLEEN ECHTE AFWIJKINGEN. Materiaal en kleur staan er als ze zijn ingevuld —
 * dat is geen afwijking maar wel iets wat je op de kaart wilt terugzien zonder
 * te openen. Een lege waarde levert nooit een woord op: een regel die bij twintig
 * producten twintig keer "geen" zegt, is twintig keer ruis.
 */
function meerSamenvatting(card) {
  const uit = [];
  const waarde = (naam) => {
    const el = q(`[name="${naam}_${card.key}"]`, card.meerIn);
    return el ? String(el.value || '').trim() : '';
  };

  const materiaal = waarde('material');
  if (materiaal) uit.push(materiaal);
  const kleur = waarde('colour');
  if (kleur) uit.push(kleur);

  /* Het gezicht: de naam zoals hij in de keuzelijst staat, en niet de sleutel. */
  if (card.modelSel && card.modelSel.value) {
    const opt = card.modelSel.options[card.modelSel.selectedIndex];
    if (opt) uit.push(opt.textContent.trim());
  }

  if (card.hoogRes && card.hoogRes.checked) uit.push(c('pu.meerHoog'));

  /* De bijbestelde foto's stonden hier ook in. Ze staan niet meer op de kaart —
     het is één keuze voor de hele bestelling geworden — en een samenvatting van
     een lade hoort alleen te noemen wat IN die lade staat. */

  /* De verhouding: welke BEELDEN afwijken, niet welke vorm ze krijgen. Drie
     vormen uitschrijven maakt de regel langer dan de kaart breed is. */
  const anders = qa('select[data-pl-ratio-each]', card.meerIn).filter((sel) => sel.value);
  if (anders.length) uit.push(c('pu.meerRatio', { n: anders.length }));

  return uit;
}

function paintMeer(card) {
  if (!card.meerKnop) return;
  card.meerIn.hidden = !card.meerOpen;
  card.meerKnop.setAttribute('aria-expanded', card.meerOpen ? 'true' : 'false');
  card.meerKnop.classList.toggle('is-open', !!card.meerOpen);

  const delen = meerSamenvatting(card);
  card.meerVat.textContent = delen.length ? delen.join(' · ') : c('pu.meerVolgt');
  card.meerVat.classList.toggle('is-afwijkend', delen.length > 0);
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

  /* HIER STOND buildExtras(card) — 9 september 2026 weggehaald.
     De bijbestelde foto's zijn geen productvraag meer maar één keuze vooraf voor
     de hele bestelling; zie AnglePicker.astro en bindAngles() onderaan dit
     bestand. Lucas: *"Wanneer hij in het eerste scherm de angles heeft gekozen
     krijgt elk product die angles, dus dit is niet per product aan te passen."* */
  const hoog = buildHoogRes(card);
  if (hoog) wrap.appendChild(hoog);

  const gezicht = buildModelKeuze(card);
  if (gezicht) wrap.appendChild(gezicht);

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
 * ── 4K OP DIT PRODUCT — 9 september 2026 ────────────────────────────────────
 *
 * Lucas: *"lifestyle heeft echter wel de mogelijkheid op een 4k upsell per foto
 * die niet verplicht is en de klant kan kiezen anders zijn die afbeeldingen ook
 * allemaal 2k kwaliteit maar dit kan de klant wel in het bestelform per foto
 * kiezen voor een kleine extra prijs per 4k foto."*
 *
 * PER PRODUCT EN NIET PER FOTO — zijn eigen keuze uit drie voorstellen, en de
 * reden staat in pricing.js: een lifestylecarousel is drie beelden, dus bij
 * twintig producten zouden dat zestig vinkjes zijn. Eén vinkje zet de drie.
 *
 * Het veld heet `hi_pX` en staat niet in TOP_FIELDS, dus het landt in
 * details_json. De SERVER telt ze opnieuw (functions/api/order.js) en rekent
 * het bedrag zelf uit; wat hier gebeurt is een voorbeeld, net als elk ander
 * bedrag in dit bestand.
 *
 * Niets is verplicht: niet aanvinken is een compleet antwoord, en dan post het
 * veld ook niets — een uitgevinkte checkbox reist niet mee.
 */
function buildHoogRes(card) {
  if (!cfg.hoogRes || !cfg.hoogRes.aan) return null;

  const wrap = document.createElement('div');
  wrap.className = 'pu-hoog';

  const label = document.createElement('label');
  label.className = 'pu-hoog-rij';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.name = `hi_${card.key}`;
  box.value = '1';
  box.addEventListener('change', syncTotal);

  const tekst = document.createElement('span');
  tekst.className = 'pu-hoog-t';
  tekst.textContent = c('pu.hoogResLabel');

  label.appendChild(box);
  label.appendChild(tekst);

  const hint = document.createElement('p');
  hint.className = 'pu-hoog-hint';
  hint.textContent = c('pu.hoogResHint');

  wrap.appendChild(label);
  wrap.appendChild(hint);
  card.hoogRes = box;
  return wrap;
}

/**
 * ── HET GEZICHT, PER PRODUCT — 9 september 2026 ─────────────────────────────
 *
 * Lucas: *"Klant kan bij catalog en lifestyle per product kiezen welk model
 * ervoor gebruikt word. De klant kan in het dashboard nog wel een vast model
 * kiezen en deze word dan automatisch bij elk product geplaatst, hij kan dan per
 * product dit nog aanpassen."*
 *
 * Twee van de drie lagen bestonden al:
 *
 *   HET DASHBOARD    customer_style_locks draagt per stijl een `roster_model` of
 *                    een `custom_model_id`. paintLock() hieronder vinkt dat aan
 *                    zodra /account/me antwoordt.
 *   DE BESTELLING    de radiogroep `model` in ModelPicker — één gezicht voor de
 *                    hele bestelling, en dus ook de plek waar het vaste gezicht
 *                    van het dashboard landt.
 *
 * Wat ontbrak is deze derde: PER PRODUCT. Hij hangt onder de twee andere, in die
 * volgorde — dashboard vult de bestelling, bestelling vult elk product, en het
 * product mag afwijken.
 *
 * ── DEZELFDE VORM ALS DE VERHOUDING PER BEELD ──────────────────────────────
 *
 * Eén <select> per kaart, met als eerste optie de LEGE waarde: "hetzelfde als de
 * bestelling". Wie niets doet, post niets, en de server hoeft geen lijst met
 * dertig keer hetzelfde gezicht te lezen. Niets is verplicht — het gezicht van
 * de bestelling is altijd al een antwoord.
 *
 * ── DE OPTIES KOMEN VAN DE RADIO'S EN NIET UIT EEN EIGEN LIJST ─────────────
 *
 * De tien gedeelde modellen staan in de HTML; de eigen merkmodellen van een
 * ingelogde klant zet addOwnModels() er later bij. Een tweede lijst hier zou die
 * tweede groep missen — en dat is precies het gezicht dat een merk het liefst
 * per product kiest. Dus wordt de keuzelijst GEVULD uit de radiogroep, en
 * opnieuw gevuld zodra die verandert. Zie paintModelDefaults().
 */
function buildModelKeuze(card) {
  if (!cfg.model || !cfg.model.perProduct) return null;

  const wrap = document.createElement('div');
  wrap.className = 'pu-model';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `${c('pu.modelH')} — ${c('pu.product', { n: card.n })}`);

  const head = document.createElement('p');
  head.className = 'pu-model-h';
  head.textContent = c('pu.modelH');

  const id = `pu-model-${card.key}`;
  const label = document.createElement('label');
  label.className = 'pu-model-label';
  label.htmlFor = id;
  label.textContent = c('pu.modelLabel');

  const sel = document.createElement('select');
  sel.className = 'select pu-model-sel';
  sel.id = id;
  sel.name = `model_${card.key}`;
  sel.setAttribute('data-pl-model-sel', '');

  const hint = document.createElement('p');
  hint.className = 'pu-model-hint';
  hint.textContent = c('pu.modelHint');

  wrap.appendChild(head);
  wrap.appendChild(label);
  wrap.appendChild(sel);
  wrap.appendChild(hint);
  card.modelSel = sel;
  vulModelOpties(sel);
  return wrap;
}

/** De naam die bij een gezicht-radio hoort, zoals hij op het scherm staat. */
function modelNaam(radio) {
  const lab = radio.closest('label');
  const t = lab ? lab.querySelector('.mp-name') : null;
  return ((t && t.textContent) || radio.value || '').trim();
}

/**
 * Vul één keuzelijst met de gezichten die op de pagina staan, en houd de keuze
 * van de klant vast. De eerste optie is leeg — "hetzelfde als de bestelling" —
 * met de naam van dat gezicht erbij, zodat je op de kaart niet hoeft te
 * onthouden wat je bovenaan koos. Dezelfde zet als bij ratioSameText().
 */
function vulModelOpties(sel) {
  const radios = qa('input[name="model"]');
  if (!radios.length) return;
  const had = sel.value;

  const gekozen = radios.filter((r) => r.checked)[0];
  const zelfde = document.createElement('option');
  zelfde.value = '';
  /* "Wij kiezen er een die bij je merk past" is een ZIN en geen naam, en achter
     "Hetzelfde als de bestelling ·" wordt dat een optie van tien woorden in een
     keuzelijst van dertig kaarten. Bij die ene waarde dus de korte variant: er
     valt daar ook geen naam te herhalen. */
  const naam = gekozen && gekozen.value && gekozen.value !== 'any' ? modelNaam(gekozen) : '';
  zelfde.textContent = naam
    ? c('pu.modelSame', { naam: naam })
    : c('pu.modelSamePlain');

  sel.textContent = '';
  sel.appendChild(zelfde);
  radios.forEach((r) => {
    /* Een radio die uitstaat omdat de vraag niet van toepassing is (zie
       syncStyle en syncBackground) hoort hier ook niet te staan. */
    if (r.disabled) return;
    const opt = document.createElement('option');
    opt.value = r.value;
    opt.textContent = modelNaam(r);
    sel.appendChild(opt);
  });

  /* De keuze van de klant overleeft het opnieuw vullen — anders springt elke
     kaart terug naar "hetzelfde als de bestelling" zodra hij bovenaan een ander
     gezicht aanwijst, en dat is precies het tegenovergestelde van wat een
     afwijking per product moet doen. */
  if (had && qa('option', sel).some((o) => o.value === had)) sel.value = had;
}

/** Alle keuzelijstjes bijwerken: na een wissel bovenaan, en na addOwnModels(). */
function paintModelDefaults() {
  qa('[data-pl-model-sel]').forEach(vulModelOpties);
}

/** Hoeveel producten er op de hoge maat besteld zijn. */
function hoogResCount() {
  return qa('input[type="checkbox"][name^="hi_"]').filter((b) => b.checked && !b.disabled).length;
}

/**
 * ── VOORRANG BIJ LEVERING ───────────────────────────────────────────────────
 *
 * Eén vinkje in stap 1. Twee dingen bewegen mee met het aantal producten:
 *
 *   HET BEDRAG      een deel van het orderbedrag, met een bodem en een plafond.
 *                   Zonder aantal is er geen bedrag, en dan staat er een
 *                   streepje — hetzelfde als bij het totaal erboven.
 *   OF HIJ ER STAAT boven VOORRANG.maxProducten kan het niet, en dan verdwijnt
 *                   het blok. `disabled` en niet alleen `hidden`, om dezelfde
 *                   reden als bij syncStyle(): CSS houdt geen veld uit een POST,
 *                   en een aangevinkt vakje in een verborgen blok zou voorrang
 *                   op een bestelling zetten die hem niet kan krijgen.
 */
function voorrangBedragNu(net) {
  const v = cfg.voorrang;
  if (!v || !Number.isFinite(net) || net <= 0) return null;
  return Math.min(v.plafond, Math.max(v.bodem, Math.ceil(net * v.deel)));
}

function voorrangAan() {
  const box = q('input[name="voorrang"]');
  return !!(box && box.checked && !box.disabled);
}

function syncVoorrang(net) {
  const blok = q('[data-pl-voorrang]');
  if (!blok || !cfg.voorrang || !cfg.voorrang.aan) return;
  const n = productCount();
  const kan = Number.isInteger(n) && n > 0 && n <= cfg.voorrang.maxProducten;
  blok.hidden = !kan;
  qa('input, button, select', blok).forEach((el) => { el.disabled = !kan; });
  if (!kan) {
    const box = q('input[name="voorrang"]', blok);
    if (box) box.checked = false;
  }
  /* De tekst zonder bedrag staat al in de HTML (Astro rendert hem), dus die
     wordt hier ONTHOUDEN in plaats van uit cfg.copy gehaald. Reden: PIPE draagt
     de woorden die dit bestand zelf tekent, en dit is er geen van — het is een
     regel die het formulier al had en die alleen vervangen wordt zodra er een
     bedrag te noemen valt. */
  const vak = q('[data-pl-voorrang-bedrag]');
  if (vak) {
    if (!vak.dataset.plLeeg) vak.dataset.plLeeg = vak.textContent || '';
    const bedrag = voorrangBedragNu(net);
    vak.textContent = bedrag === null ? vak.dataset.plLeeg : `+ ${euro(bedrag)}`;
  }
}

/**
 * De beeldverhouding per beeld, op één kaart. Of null.
 *
 * ── DE VRAAG ──────────────────────────────────────────────────────────────
 *
 * Lucas, 13 augustus 2026: *"Bij lifestyle moeten deze wel per foto ingesteld
 * kunnen worden omdat je soms een simpele post en soms een banner lifestyle foto
 * wil."*
 *
 * ── NULL BIJ CATALOG, EN DAT IS DE HELE REGEL ─────────────────────────────
 *
 * `cfg.ratio.perImage` is het aantal beelden dat mag afwijken, en het is nul op
 * elke stroom die dat niet kent. Geen tak hier die naar de dienst kijkt: welke
 * dienst per beeld mag kiezen, staat in ratiosPerImage() in src/data/ratios.js
 * en wordt in OrderFlow.astro één keer uitgerekend. Een tweede plek die
 * 'lifestyle' zou noemen, is de plek die het vergeet als er een dienst bijkomt.
 *
 * ── ALLEEN DE LIFESTYLE-BEELDEN, OOK BIJ `complete` ───────────────────────
 *
 * Een complete-bestelling heeft vier catalogbeelden en drie lifestylebeelden, en
 * `perImage` is er drie. De catalogbeelden staan naast elkaar in een grid en
 * volgen de bestelling — dat is precies de reden dat catalog één verhouding
 * heeft. Zie de kop van ratios.js.
 *
 * ── LEEG IS HET ANTWOORD, NIET DE AFWEZIGHEID ERVAN ───────────────────────
 *
 * De eerste optie heeft waarde '' en betekent "volg de bestelling". Zo post een
 * klant die niets afwijkt ook niets, en effectiveRatio() op de server heeft geen
 * lijst met dertig keer dezelfde waarde te lezen. Niets hier is verplicht: geen
 * `required`, geen data-pl-req. Wie er niet naar kijkt, krijgt de verhouding die
 * hij bovenaan koos, en dat is een compleet antwoord.
 */
function buildRatios(card) {
  const perImage = Number((cfg.ratio && cfg.ratio.perImage) || 0);
  if (!perImage) return null;
  const ids = (cfg.ratio && cfg.ratio.ids) || [];
  if (!ids.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'pu-ratios';
  wrap.id = `pu-ratios-${card.key}`;
  // Een group met een label en geen fieldset+legend, om dezelfde reden als bij
  // buildAbout(): een legend zou "Verhouding per beeld" op dertig kaarten
  // afdrukken, en dat is de muur tekst die deze stap juist opruimt.
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', `${c('pu.ratioH')} — ${c('pu.product', { n: card.n })}`);

  const head = document.createElement('p');
  head.className = 'pu-ratios-h';
  head.textContent = c('pu.ratioH');

  const hint = document.createElement('p');
  hint.className = 'pu-ratios-hint';
  hint.id = `pu-ratios-hint-${card.key}`;
  hint.textContent = c('pu.ratioHint');

  const row = document.createElement('div');
  row.className = 'pu-ratios-row';

  for (let i = 1; i <= perImage; i += 1) {
    const field = document.createElement('div');
    field.className = 'pu-ratio-q';
    const id = `pu-ratio-${card.key}-${i}`;

    const label = document.createElement('label');
    label.className = 'pu-ratio-label';
    label.htmlFor = id;
    label.textContent = c('pu.ratioImage', { n: i });

    const sel = document.createElement('select');
    sel.className = 'select pu-ratio-field';
    sel.id = id;
    // `ratio_p3_2` — dezelfde sleutel die ratioField() in src/data/ratios.js
    // maakt en parseRatioField() weer uit elkaar haalt. Niet in TOP_FIELDS, dus
    // hij landt in details_json naast `product_p3`, op de sleutel `p3` die ze
    // aan elkaar knoopt.
    sel.name = `ratio_${card.key}_${i}`;
    /* De haak waarop meerSamenvatting() telt hoeveel beelden afwijken. Op het
       ELEMENT en niet op de naam: een `select[name^="ratio_"]` zou ook de
       verhouding van de bestelling vangen als die ooit een select wordt. */
    sel.setAttribute('data-pl-ratio-each', '');
    sel.setAttribute('aria-describedby', hint.id);

    const same = document.createElement('option');
    same.value = '';
    same.setAttribute('data-pl-ratio-same', '');
    // Meteen met de gekozen verhouding erachter en niet pas bij de volgende
    // paintRatioDefaults(): een kaart die net gebouwd is, staat al op het
    // scherm, en "Zelfde als de bestelling" zonder te zeggen wat dat is, is
    // precies de regel die deze optie moet uitleggen.
    same.textContent = ratioSameText();
    sel.appendChild(same);

    ids.forEach((rid) => {
      const opt = document.createElement('option');
      opt.value = rid;
      opt.textContent = c(`ratio.name.${rid}`);
      sel.appendChild(opt);
    });

    field.append(label, sel);
    row.appendChild(field);
  }

  wrap.append(head, hint, row);
  return wrap;
}

/*
 * ── HIER STOND HET BLOK "EXTRA FOTO'S" VAN DE PRODUCTKAART ──────────────────
 * Weggehaald op 9 september 2026.
 *
 * Wat het was: een keuzelijst per productkaart ("hoeveel extra foto's?"), en per
 * gekozen foto een uploadvakje met een VERPLICHTE notitie. Bij twintig producten
 * met vier extra's waren dat tachtig verplichte tekstvelden waarin de klant
 * tachtig keer ongeveer hetzelfde typte, en hij moest zelf onder woorden brengen
 * wat hij kocht.
 *
 * Lucas: *"De klant krijgt nu 4 beelden per product maar kan dus ook 4 extra
 * foto's per product toevoegen alleen vind ik hoe dat nu gaat niet handig en niet
 * duidelijk voor mij en voor de klant. (…) Wanneer hij in het eerste scherm de
 * angles heeft gekozen krijgt elk product die angles, dus dit is niet per product
 * aan te passen."*
 *
 * Wat ervoor in de plaats kwam: één keuze in stap 1, uit een lijst met een FOTO
 * per hoek, geldig voor de hele bestelling. Zie AnglePicker.astro voor het
 * scherm en bindAngles() verderop voor de rekensom. De GRATIS referentievakken
 * (`ref1`…) hieronder zijn gebleven — die waren altijd al iets anders: invoer in
 * plaats van uitvoer.
 */
/**
 * Het plusje: nog een foto van hetzelfde product, gratis.
 *
 * ── DE VRAAG ──────────────────────────────────────────────────────────────
 *
 * Lucas, 13 augustus 2026: *"Ook wil ik dat het mogelijk word voor een bezoeker
 * om meer foto’s toe te voegen van zijn product kosteloos door op een plusje
 * naast de 4 aanbevolen foto’s te klikken. Dit zorgt ervoor dat ze meer details
 * kunnen laten zien maar wel gewoon 4 foto’s in totaal krijgen, wel moet de optie
 * voor een extra foto behouden worden als apart vak die gewoon de huidige extra
 * prijs behouden."*
 *
 * Twee dingen die op elkaar lijken en niet hetzelfde zijn, en dat is de reden dat
 * dit een eigen functie is naast buildExtras():
 *
 *   DIT (`ref1`…)    is INVOER. Meer materiaal van hetzelfde product zodat wij
 *                    het beter zien. Gratis, en het levert GEEN beeld op — de
 *                    klant krijgt nog steeds zijn vier.
 *   EXTRA (`extra1`…) is UITVOER. Een beeld dat erbij BESTELD wordt, met een
 *                    verplichte notitie en een tarief uit EXTRA_PHOTO_LADDER.
 *
 * Het betaalde vak blijft dus staan waar het stond, met de prijs die het had.
 * Zie de kop bij REF_SHOT_PREFIX in src/data/shots.js voor waarom ze geen woord
 * en geen bovengrens delen.
 *
 * ── EEN PLUSJE EN GEEN AANTALKEUZE ────────────────────────────────────────
 *
 * De betaalde extra's vragen eerst *"hoeveel?"*, want dat aantal is een BEDRAG en
 * moet in het totaal meelopen voordat er iets geüpload is. Hier valt niets te
 * begroten. Dus geen keuzelijst maar de handeling zelf: klik, en er staat een vak
 * bij. Dat is ook eerlijker over wat er gebeurt — een klant die drie kiest en er
 * twee vult, heeft geen fout gemaakt, en een formulier dat daar iets van vindt,
 * heeft een vraag gesteld die het niet had moeten stellen.
 *
 * ── EN HET TELT NIET MEE VOOR "AF" ────────────────────────────────────────
 *
 * cardReady() en de voortgangsregel lopen over SHOT_IDS, niet over card.slots.
 * Een referentievak kan dus nooit een kaart onvolledig maken. Dat is dezelfde
 * afspraak die buildExtras() al had, en hier is hij nog belangrijker: gratis
 * materiaal dat de bestelling zou kunnen blokkeren, is materiaal dat niemand
 * aandurft te sturen.
 */
function buildRefs(card, slots) {
  const max = Math.max(0, Math.floor(Number(cfg.maxRefPerProduct) || 0));
  if (!max) return;

  card.refs = 0;

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'pu-ref-add';
  add.dataset.puRefAdd = card.key;
  // Het plusje is een TEKEN en de zin ernaast is het label. Alleen een + zou een
  // knop opleveren waarvan je moet raden wat hij toevoegt, op een kaart waar vier
  // andere vakken ook op een klik reageren.
  add.innerHTML = '<span class="pu-ref-plus" aria-hidden="true">+</span>';
  const addLabel = document.createElement('span');
  addLabel.className = 'pu-ref-add-label';
  addLabel.textContent = c('pu.refAdd');
  add.appendChild(addLabel);

  const hint = document.createElement('span');
  hint.className = 'pu-ref-hint';
  hint.id = `pu-ref-hint-${card.key}`;
  hint.textContent = c('pu.refHint');
  add.setAttribute('aria-describedby', hint.id);
  /* Dezelfde regel als bij de uitleg in de vakjes hierboven: op kaart één te
     lezen, daarna alleen als iemand ernaar zoekt. `aria-describedby` blijft
     staan — een schermlezer leest hem dan nog steeds bij de knop, want een
     verborgen element blijft in de boom zolang het niet `hidden` is. Vandaar
     `.is-stil` en geen `hidden`. */
  if (card.n !== 1) hint.classList.add('is-stil');

  const paint = () => {
    const vol = card.refs >= max;
    add.hidden = vol;
    // De uitleg verdwijnt met de knop mee: als er niets meer bij kan, is "gratis,
    // je krijgt nog steeds je vier beelden" een antwoord op een vraag die niemand
    // meer kan stellen.
    hint.textContent = vol ? c('pu.refFull', { max }) : c('pu.refHint');
  };

  /* ── ALLE VAKKEN OPNIEUW, EN NIET ALLEEN HET NIEUWE ────────────────────────
   *
   * De weghaalknop staat alleen op het LAATSTE referentievak (zie paintSlot), en
   * welk vak dat is, verandert bij elke klik op het plusje. Alleen het nieuwe vak
   * schilderen liet de knop dus op alle vier staan — en dan haalt een klik op
   * ref2 de teller omlaag terwijl ref3 blijft bestaan, waarna het volgende plusje
   * een id maakt dat er al is en het bestand van de vorige stilletjes overschrijft.
   * Gemeten, niet bedacht: vier keer "ja" waar er één hoorde te staan. */
  const paintAll = () => {
    paint();
    for (let i = 1; i <= max; i += 1) {
      const rid = refShotId(i);
      if (card.slots[rid] && card.slots[rid].el) paintSlot(card, rid);
    }
  };

  add.addEventListener('click', () => {
    if (card.refs >= max) return;
    card.refs += 1;
    const id = refShotId(card.refs);
    if (!card.slots[id]) card.slots[id] = EMPTY_SLOT();
    // VÓÓR de knop invoegen, zodat het plusje het laatste vakje van de rij blijft
    // en niet halverwege komt te staan zodra er één bij is.
    slots.insertBefore(buildSlot(card, id), add);
    // buildSlot() bouwt alleen; zonder deze regel staan Vervangen en Verwijderen
    // onder een leeg vak — precies de fout die buildExtras() hierboven noemt.
    paintSlot(card, id);
    paintAll();
    refreshUploader();
    // De focus naar het vak dat er net bij kwam. Wie met het toetsenbord werkt,
    // staat anders op een knop die naar beneden is opgeschoven of verdwenen is.
    const btn = q(`[data-pu-slot="${id}"] .pu-slot-btn`, slots);
    if (btn) btn.focus({ preventScroll: false });
  });

  slots.append(add, hint);
  /* Naar buiten, want de weghaalknop op een vakje moet de knop en de uitleg weer
     terug kunnen zetten — die zit in buildSlot() en kan hier niet bij. */
  card.paintRefs = paintAll;
  paint();
}


/*
 * ── DE HOEKEN: ÉÉN KEUZE, VOOR ELK PRODUCT ─────────────────────────────────
 * 9 september 2026.
 *
 * Het scherm staat in AnglePicker.astro; hier gebeuren de drie dingen die het
 * pas een keuze maken:
 *
 *   1. HET MAXIMUM. Vier bovenop de vier vaste, en dat is niet toevallig hetzelfde
 *      getal als MAX_EXTRA_PER_PRODUCT — het IS dat getal, doorgegeven via
 *      `data-max`. De vijfde tegel kan niet aangevinkt worden en de kiezer zegt
 *      waarom, in plaats van stil te weigeren.
 *   2. DE NOTITIE. Verschijnt bij de hoek die je aanvinkt en verdwijnt weer, maar
 *      wordt nooit LEEGGEMAAKT: wie zich bedenkt en opnieuw aanvinkt, vindt zijn
 *      zin terug. Een verborgen veld post niets, dus een teruggetrokken hoek
 *      neemt zijn notitie vanzelf niet mee.
 *   3. HET BEDRAG. Hoeken × producten × het tarief van de trede waar de
 *      bestelling nu op staat. Uitgeschreven als som en niet als uitkomst, want
 *      dit is het enige getal in stap 1 dat over de hele bestelling gaat.
 *
 * NIETS HIERVAN IS BEPALEND. Zoals overal in dit bestand: de server telt de
 * vinkjes zelf opnieuw en rekent het bedrag zelf uit — zie functions/api/order.js.
 */
/*
 * DE KIEZER WORDT ELKE KEER OPGEZOCHT EN NIET ONTHOUDEN, en dat is geen
 * slordigheid maar een eis van dit bestand: boot() draait op regel 402, tijdens
 * het uitvoeren van de module, dus alles wat hieronder met `let` of `const` op
 * moduleniveau staat, bestaat op dat moment nog niet. Een gecachte verwijzing
 * hier werd een "Cannot access before initialization" die pipeline.js netjes
 * opvangt en waardoor de hele kiezer stil niets deed. Eén querySelector per
 * herteken is de prijs, en die is nul.
 */
function angleBoxEl() {
  return q('[data-pl-angles]');
}

/** De aangevinkte hoeken, in de volgorde waarin ze op het scherm staan. */
function anglesChosen(box) {
  const el = box || angleBoxEl();
  if (!el) return [];
  return qa('input[data-pl-angle]', el).filter((b) => b.checked);
}

/**
 * Het tarief, het maximum en de som opnieuw opschrijven. Draait bij elke
 * verandering van de vinkjes én bij elke verandering van het aantal producten,
 * want de trede hangt aan dat aantal.
 */
function paintAngles() {
  const angleBox = angleBoxEl();
  if (!angleBox) return;
  const gekozen = anglesChosen(angleBox);
  const max = Math.max(0, Math.floor(Number(angleBox.dataset.max) || 0));
  const vol = gekozen.length >= max;
  const tarief = extraRateNow();

  /* Vol is niet "verborgen": de tegels blijven staan en blijven leesbaar, ze
     zijn alleen niet meer aan te vinken. Een tegel die verdwijnt zodra je er
     vier hebt, laat de klant zoeken naar wat hij net nog zag. */
  qa('input[data-pl-angle]', angleBox).forEach((b) => {
    b.disabled = vol && !b.checked;
    const li = b.closest('li');
    if (li) li.classList.toggle('is-vol', vol && !b.checked);
    const id = String(b.name || '').slice('angle_'.length);
    const note = q(`[data-pl-angle-note="${id}"]`, angleBox);
    if (note) note.hidden = !b.checked;
  });

  const rate = q('[data-pl-angle-rate]', angleBox);
  if (rate) {
    const per = (angleBox.dataset.per || '').replace('{price}', euro(tarief));
    rate.textContent = vol ? `${per} — ${angleBox.dataset.full || ''}`.trim() : per;
  }

  /* De regel in de DICHTE vouw. Zonder gekozen hoek zegt hij wat je sowieso
     krijgt; met hoeken zegt hij hoeveel je erbij hebt gezet. Zo hoeft niemand de
     vouw open te doen om te zien wat er staat. Zie de kop van AnglePicker.astro. */
  setSummary('data-pl-sum-angles', gekozen.length
    ? `${(angleBox.dataset.gekozen || '{n} chosen').replace('{n}', String(gekozen.length))}`
    : '');

  const som = q('[data-pl-angle-som]', angleBox);
  if (!som) return;
  const n = gekozen.length;
  const p = productCount();
  if (!n || !Number.isInteger(p) || p < 1) {
    /* Niets gekozen, of een aantal producten dat dit formulier niet weet. In
       beide gevallen is er geen som, en een regel die "0" zegt zegt niets. */
    som.hidden = true;
    som.textContent = '';
    return;
  }
  const totaal = n * p * tarief;
  const sjabloon = n === 1 && p === 1
    ? angleBox.dataset.totalOneboth
    : n === 1
      ? angleBox.dataset.totalOne
      : p === 1
        ? angleBox.dataset.totalOnep
        : angleBox.dataset.total;
  som.textContent = String(sjabloon || '')
    .replace('{n}', String(n))
    .replace('{p}', String(p))
    .replace('{price}', euro(tarief))
    .replace('{sum}', euro(totaal));
  som.hidden = false;
}

function bindAngles() {
  const angleBox = angleBoxEl();
  if (!angleBox) return;
  qa('input[data-pl-angle]', angleBox).forEach((b) => {
    b.addEventListener('change', () => { paintAngles(); syncTotal(); });
  });
  paintAngles();
}

/** The extra-photo rate at the order’s CURRENT product count. */
function extraRateNow() {
  const rungs = cfg.extraPhotoLadder || [];
  const n = Math.max(1, Math.floor(productCount()) || 1);
  const rung = rungs.find(([lo, hi]) => n >= lo && (hi === null || n <= hi));
  return rung ? rung[2] : 0;
}

/**
 * Hoeveel bijbestelde foto's deze bestelling telt.
 *
 * HOEKEN × PRODUCTEN, en dat is de hele rekensom. Een gekozen hoek geldt voor
 * élk product (Lucas: *"krijgt elk product die angles"*), dus vier hoeken op
 * twaalf producten zijn achtenveertig extra foto's — niet vier.
 *
 * Het aantal producten kan nog onbekend zijn (de klant heeft het vakje nog niet
 * ingevuld, of koos "meer dan"): dan is er niets te vermenigvuldigen en levert
 * dit 0 op, want een bedrag noemen bij een onbekend aantal is raden.
 */
function extrasCount() {
  const n = productCount();
  if (!Number.isInteger(n) || n < 1) return 0;
  return anglesChosen().length * n;
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

  /* ── HET VINKJE, VOOR EEN VAKJE ZONDER VOORBEELD — 4 september 2026 ────────
     Lucas: *"Wanneer productfoto's zijn toegevoegd [graag] per tegel wel
     tonen."* Dat gebeurt ook — zodra de browser het bestand kan tekenen, vult
     de foto het vakje (zie `.is-thumb`). Alleen kán de browser dat niet altijd:
     een HEIC rechtstreeks van een iPhone is op een desktop niet te decoderen,
     en dan bleef het vakje er precies zo uitzien als een LEEG vakje — dezelfde
     tekening, dezelfde uitleg. Alleen de regel eronder verschilde.

     Dit is het verschil dat er dan wel is: een vinkje over de tekening, zodat
     "deze is binnen" van een halve meter af te zien is. */
  const vink = document.createElement('span');
  vink.className = 'pu-slot-vink';
  vink.setAttribute('aria-hidden', 'true');
  vink.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';

  const nameEl = document.createElement('span');
  nameEl.className = 'pu-slot-name';
  nameEl.textContent = shotLabel(id);

  btn.append(dia, img, vink, nameEl);

  /* ── DE UITLEG STAAT OP DE EERSTE KAART, EN DAARNA NIET MEER ──────────────
     9 september 2026, bij de herindeling van deze stap.

     Sinds 3 september droeg élk vakje zijn eigen zin ("Het hele product, plat
     of hangend, recht van voren"). Bij zes producten zijn dat vierentwintig
     alinea's van dezelfde vier zinnen, en bij twintig producten tachtig — exact
     de vermenigvuldiging die attributes.js in zijn eigen kop verbiedt en die de
     lade hiernaast net heeft opgeruimd.

     Wat de eerste kaart leert, weet je bij de tweede al. Dus: de zin staat op
     kaart één, en op elke kaart daarna draagt het vakje alleen zijn naam.

     HIJ IS NIET WEG voor wie hem nodig heeft. De uitleg staat óók in de gids
     bovenaan deze stap (ProductUploader.astro), en het vakje verwijst er met
     `title` naar — zodat een muis hem alsnog geeft. Voor een schermlezer
     verandert er niets: `aria-label` op de knop draagt de naam en de staat, en
     die staat op elk vakje.

     GEEN KLASSE OP DE KAART maar een tak hier, om dezelfde reden als bij het
     plusje: card.n is de waarheid over welke kaart dit is, en een CSS-regel die
     `:first-child` gebruikt breekt zodra iemand een kaart uit het midden
     weghaalt. */
  const how = lookup(`pu.how.${id}`);
  if (how) {
    if (card.n === 1) {
      const howEl = document.createElement('span');
      howEl.className = 'pu-slot-how';
      howEl.textContent = how;
      btn.appendChild(howEl);
    } else {
      btn.title = how;
    }
  }

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
  /* EERST in de rij, want bij een mislukt vakje is dit de handeling die de klant
     wil: niet vervangen (dan moet hij zoeken) en niet verwijderen (dan is de foto
     weg), maar hetzelfde bestand nog een keer. Zie het blok bij failSlot(). */
  const retryBtn = act(c('upload.retry'), () => retrySlot(card, id));
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
  //
  // ── EN GEEN OVERSLAAN OP EEN GRATIS REFERENTIEVAK — 13 augustus 2026 ────────
  // Om een derde reden, die nog sterker is dan de twee hierboven: dit vakje is er
  // alleen omdat de klant zelf op het plusje heeft gedrukt. "Deze sla ik over" bij
  // een vakje dat je zojuist hebt aangevraagd, is geen keuze maar een raadsel — en
  // de kaart vraagt er ook nooit om, want cardReady() loopt over SHOT_IDS en ziet
  // referentievakken niet. Wat hier wél hoort, staat een regel lager: weghalen.
  const skipBtn = (isRequiredShot(id) || extraSlotNumber(id) || refShotNumber(id)) ? null : act(c('pu.skipShot'), () => {
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

  /* ── HET VAKJE WEER WEG — alleen bij een gratis referentievak ───────────────
   *
   * Een vast vak kun je niet weghalen: het hoort bij de opdracht. Een betaald vak
   * haal je weg met de teller, want het is een bestelregel. Dit vak bestaat alleen
   * doordat er op een plusje is gedrukt, en dan hoort er een weg terug te zijn —
   * anders levert één misklik vier lege vakken op die er blijven staan.
   *
   * ALLEEN HET LAATSTE, en dat is geen luiheid maar wat de nummering vraagt: de
   * vakken heten ref1..refN op volgorde, en er middenuit halen zou ref3 tot ref2
   * moeten omdopen terwijl er al een bestand aan ref3 hangt in R2. Weghalen van
   * achteren houdt de reeks heel, en het is ook wat iemand bedoelt die één keer te
   * vaak heeft geklikt.
   */
  const dropBtn = !refShotNumber(id) ? null : act(c('pu.refDrop'), () => {
    clearSlot(card, id);
    delete card.slots[id];
    wrap.remove();
    card.refs = Math.max(0, (card.refs || 0) - 1);
    if (card.paintRefs) card.paintRefs();
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

  card.slots[id].el = { wrap, btn, dia, img, nameEl, bar, msg, retryBtn, replaceBtn, removeBtn, skipBtn, undoBtn, dropBtn };
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
  /* De voortgangsmelding en de beeldkeuring samen op één regel, met de keuring
     achteraan: `msg` gaat over wat er NU gebeurt ("versturen…") en verdwijnt,
     de keuring gaat over de foto zelf en blijft. Een tweede regel eronder zou
     elk vakje in de kaart een regel hoger maken, ook de vakjes waar niets aan
     de hand is. */
  el.msg.textContent = [s.msg, s.let].filter(Boolean).join(' · ');
  el.wrap.dataset.let = s.let ? '1' : '';

  const filled = !!s.file;
  /* Alleen als er iets te herhalen IS. Een knop op een vakje dat aan het versturen
     is, zou een tweede upload van hetzelfde bestand starten; op een geslaagd vakje
     zou hij suggereren dat er iets mis is. */
  if (el.retryBtn) el.retryBtn.hidden = !(filled && s.status === 'failed');
  el.replaceBtn.hidden = !filled;
  el.removeBtn.hidden = !filled;
  if (el.skipBtn) el.skipBtn.hidden = filled || s.status === 'skipped';
  if (el.undoBtn) el.undoBtn.hidden = s.status !== 'skipped';
  /* ALLEEN OP HET LAATSTE referentievak, en alleen zolang het leeg is. Leeg,
     omdat "weghalen" naast een geüploade foto twee knoppen naast elkaar zet die
     allebei iets weggooien — daar is `removeBtn` voor, en die haalt het bestand
     weg en laat het vakje staan. Het laatste, omdat de reeks ref1..refN op
     volgorde ligt en er middenuit halen een hernummering zou vragen van vakken
     waar al bestanden aan hangen in R2. */
  if (el.dropBtn) el.dropBtn.hidden = filled || refShotNumber(id) !== (card.refs || 0);

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
  /* De verwijderknop hoort bij de laatste kaart, en alleen boven het bestelde
     aantal. Hij wordt hier geschilderd en niet bij het bouwen, want beide
     voorwaarden veranderen terwijl de kaart al bestaat. */
  if (card.wegEl) card.wegEl.hidden = !(cards[cards.length - 1] === card && cards.length > minCards());
  if (card.toggleEl) card.toggleEl.setAttribute('aria-expanded', card.collapsed ? 'false' : 'true');
  if (card.stateEl) card.stateEl.textContent = ready ? c('pu.ready') : c('pu.needsShots', { list: shotListText(missingRequired(card)) });
  SHOT_IDS.forEach((id) => paintSlot(card, id));
  /* De regel op de lade hoort bij de kaart en wordt hier bijgewerkt, niet alleen
     bij een verandering ín de lade: het gezicht van de BESTELLING kan wijzigen
     (paintModelDefaults) en dan verandert wat "volgt de bestelling" betekent. */
  paintMeer(card);
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
  syncAddKnop();
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
      /* De vaste hoeken, plus de gratis referentievakken die op DEZE kaart
         daadwerkelijk zijn aangevraagd — 13 augustus 2026.

         Zonder die tweede helft is het plusje half af: je kunt een foto in een
         referentievak slepen, maar wie een map met dertig bestanden ineens
         binnenlaat en ze daarna uit de bak verdeelt, kon ze nergens anders heen
         sturen dan naar de vier vaste hoeken. Dan is de gratis mogelijkheid er
         alleen voor wie één bestand tegelijk kiest.

         Uit card.slots en niet uit een vast lijstje van vier: een vak dat niet is
         aangevraagd, hoort niet in de keuzelijst — dat zou een bestemming zijn
         die op de kaart niet bestaat. */
      const refIds = [];
      for (let i = 1; i <= (card.refs || 0); i += 1) {
        const rid = refShotId(i);
        if (card.slots[rid]) refIds.push(rid);
      }
      SHOT_IDS.concat(refIds).forEach((id) => {
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

  /* ── DE BEELDKEURING LOOPT NAAST DE UPLOAD EN NIET ERVOOR ──────────────────
   *
   * Meten kost op een telefoon een fractie van een seconde, en die fractie voor
   * élk bestand vóór het versturen is bij dertig producten een merkbare pauze op
   * de stap waar de klant al het langst zit. De upload begint dus meteen; de
   * meting landt erna en zet zijn zin erbij.
   *
   * TE KLEIN IS DE UITZONDERING, want dat weigert. Dan wordt de upload die net
   * begon afgebroken — en dat is precies de reden dat het vakje op `failed`
   * wordt gezet en `live()` in sendSlot() het antwoord daarna laat vallen: een
   * bestand dat onderweg was toen de meting binnenkwam, mag niet alsnog als
   * geslaagd verschijnen.
   *
   * Alles in een `catch` die niets doet. Een meting die omvalt, mag een upload
   * die loopt niet raken. */
  meetBeeld(file).then((maat) => {
    if (card.slots[id] !== s || s.file !== file) return;
    const oordeel = keurBeeld(maat, extOf(file.name), file.size);
    if (!oordeel) return;
    if (oordeel.hard) {
      s.status = 'failed';
      s.let = '';
      s.msg = c('upload.err.te-klein', { min: oordeel.min, lang: oordeel.lang });
      if (s.key) removeStaged(s.key);
      s.key = '';
      paintSlot(card, id);
      refreshUploader();
      return;
    }
    s.let = c(`upload.let.${oordeel.code}`);
    paintSlot(card, id);
  }).catch(() => {});

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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EEN MISLUKTE UPLOAD KRIJGT EEN TWEEDE KANS — 13 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' lijst, blok 6: een herhaalpoging na een mislukte upload.
 *
 * ── WAT ER GEBEURDE, EN WAAROM DAT DUURDER IS DAN HET LIJKT ─────────────────
 *
 * Een wegvallende verbinding zette het vakje op 'failed' met een zin eronder, en
 * daar bleef het. De klant moest de foto opnieuw KIEZEN — de bestandskiezer weer
 * open, weer door zijn fotolijst, weer het juiste bestand. Bij één vakje is dat
 * een ongemak. Bij een bestelling van dertig producten met tweehonderd vakjes op
 * een telefoon met wisselende ontvangst is het het moment waarop iemand stopt.
 *
 * En het was niet nodig: `s.file` bleef de hele tijd staan. clearSlot() wordt bij
 * een mislukking niet aangeroepen, dus het bestand zat nog in het geheugen van de
 * pagina. Er ontbrak alleen iets dat het nog een keer probeerde.
 *
 * ── NIET ALLES IS HET OPNIEUW PROBEREN WAARD ────────────────────────────────
 *
 * Dit is de kern van de afweging. Een bestand van 26 MB drie keer versturen kost
 * de klant anderhalve minuut om bij precies dezelfde weigering uit te komen, en
 * een vakje dat "opnieuw proberen (2/3)" zegt over een bestand dat NOOIT wordt
 * aangenomen, is een leugen met een voortgangsbalk.
 *
 * Dus alleen wat aan de VERBINDING of aan ONZE kant kan liggen:
 *
 *   network  de verbinding viel weg — het klassieke geval
 *   rate     te veel tegelijk; over een seconde mag het wel
 *   5xx      onze fout, en die kan over zijn
 *
 * En uitdrukkelijk niet: too-large, bad-type, empty, bad-shot, bad-batch,
 * bad-request. Die worden bij poging drie precies zo geweigerd als bij poging
 * één. `unavailable` ook niet automatisch: dat is de bucket die plat ligt, daar
 * hangt al een eigen melding aan en de wachtrij stopt er met opzet op.
 *
 * ── EN EEN KNOP, WANT DRIE POGINGEN IN VIJF SECONDEN IS GEEN TREINTUNNEL ────
 *
 * De automatische pogingen dekken een hik. Ze dekken niet de klant die door een
 * tunnel rijdt of van wifi naar 4G wisselt: die is na vijf seconden nog steeds
 * offline en na twee minuten weer online. Vandaar op elk mislukt vakje een knop
 * "Opnieuw", en die doet drie dingen die de automaat niet doet — de teller terug
 * naar nul, een platte bucket nog één kans (een mens die op opnieuw drukt is een
 * nieuw besluit, geen herhaling), en de vooraf-controle nog eens, want bij
 * `batch-full` is de wereld echt veranderd zodra hij een ander bestand weghaalt.
 */
const UPLOAD_TRIES = 3;

/** Oplopend, en kort: de klant kijkt naar dit vakje. */
const RETRY_WAIT_MS = [1200, 3500];

/** Kan dit nog goed komen als we het nog eens proberen? */
function retryableUpload(code, httpStatus) {
  if (code === 'network' || code === 'rate') return true;
  return Number(httpStatus) >= 500;
}

/**
 * Eén plek waar een mislukking landt.
 *
 * DE STATUS BLIJFT 'sending' TIJDENS HET WACHTEN, en dat is geen cosmetica:
 * slotOpen(), cardReady() en missingRequired() lezen allemaal 'failed'. Zou het
 * vakje tussen twee pogingen even op 'failed' staan, dan klapt de kaart open,
 * springt de statusregel naar "mist nog voorkant" en gaat hij een seconde later
 * weer terug. Een vakje dat aan het herstellen is, is niet leeg.
 */
function failSlot(card, id, s, code, body, httpStatus) {
  if (retryableUpload(code, httpStatus) && s.tries < UPLOAD_TRIES) {
    const eigen = RETRY_WAIT_MS[Math.min(Math.max(s.tries - 1, 0), RETRY_WAIT_MS.length - 1)];
    /* ── ALS DE SERVER ZELF EEN TERMIJN NOEMT, IS DIE VAN HEM ─────────────────
       /api/upload geeft bij 429 een `retryAfter` in seconden mee (zie checkRate in
       ratelimit.js). Onze eigen 1,2 seconde is dan te snel: dan komt er nog een
       verzoek binnen dezelfde telvenster en wordt de bestelling harder afgeknepen
       dan nodig. Wél begrensd op tien seconden — een vakje dat een minuut zwijgt
       terwijl er "opnieuw proberen" onder staat, leest als vastgelopen, en dan is
       de knop ernaast een beter antwoord dan blijven wachten. */
    const gevraagd = Number(body && body.retryAfter) * 1000;
    const wait = Number.isFinite(gevraagd) && gevraagd > eigen
      ? Math.min(gevraagd, 10000)
      : eigen;
    s.status = 'sending';
    s.pct = 0;
    s.msg = c('upload.retrying', { n: s.tries + 1, max: UPLOAD_TRIES });
    paintSlot(card, id);
    /* Terug in de WACHTRIJ en niet los ernaast. Een haperende verbinding raakt
       zelden één bestand, en tien parallelle herhaalpogingen op een lijn die het
       al niet trekt is de snelste manier om ook de goede uploads mee te slepen. */
    chain = chain
      .then(() => new Promise((res) => {
        window.setTimeout(() => { sendSlot(card, id).then(res, res); }, wait);
      }))
      .catch(() => {});
    return;
  }

  s.status = 'failed';
  s.pct = 0;
  s.msg = uploadError(code, body);
  paintSlot(card, id);
  refreshUploader();
}

/**
 * De knop. Een expliciete opdracht van een mens, dus met meer rechten dan een
 * automatische poging — zie het blok hierboven.
 */
function retrySlot(card, id) {
  const s = card.slots[id];
  if (!s.file) return;

  s.tries = 0;
  if (uploadsOff) {
    uploadsOff = false;
    const off = q('[data-pl-upload-note="off"]');
    if (off) off.hidden = true;
  }

  /* De vooraf-controle nog eens: bij `batch-full` is er misschien net een ander
     bestand weggehaald, en dan is dit vakje ineens wél te versturen. Bij
     `too-large` komt dezelfde weigering terug, en dat is het eerlijke antwoord —
     de knop heeft het geprobeerd. */
  const bad = preflight(s.file, pendingCount());
  if (bad) {
    s.status = 'failed';
    s.pct = 0;
    s.msg = uploadError(bad.code, bad);
    paintSlot(card, id);
    refreshUploader();
    return;
  }

  s.status = 'sending';
  s.pct = 0;
  s.msg = c('upload.sending');
  paintSlot(card, id);
  chain = chain.then(() => sendSlot(card, id)).catch(() => {});
  refreshUploader();
}

function sendSlot(card, id) {
  return new Promise((resolve) => {
    const s = card.slots[id];
    if (!s.file || s.status !== 'sending') return resolve();

    /* Geteld waar hij ECHT vertrekt, en niet bij het plaatsen: een vakje dat
       tussentijds is vervangen begint met een schone teller (placeFile geeft een
       verse EMPTY_SLOT), en een poging die nooit de deur uit is gegaan hoort niet
       mee te tellen. */
    s.tries += 1;

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
      failSlot(card, id, s, 'network', null, 0);
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
          // `staged` is what decides the order’s files, and this never joins it.
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

      // A dead bucket is not this file's problem, it is every file's problem.
      // Say so once, stop the queue, and let the order carry on without photos.
      // BLIJFT VOOR failSlot() STAAN: een 503 komt met code 'unavailable', en die
      // is niet automatisch te herhalen -- maar de vlag en de melding horen er te
      // staan voordat er iets anders met dit vakje gebeurt.
      if (code === 'unavailable') {
        uploadsOff = true;
        const off = q('[data-pl-upload-note="off"]');
        if (off) off.hidden = false;
      }

      if (live()) {
        failSlot(card, id, s, code, body, xhr.status);
      } else {
        paintSlot(card, id);
        refreshUploader();
      }
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


/*
 * ══════════════════════════════════════════════════════════════════════════════
 * DE BEELDKEURING — 23 AUGUSTUS 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * preflight() hierboven controleert het BESTAND: type, leeg, te groot, vakje vol.
 * Geen van die vier zegt iets over de FOTO. Een screenshot van 40 kB van een
 * webshop komt er zonder klacht doorheen, en dat wordt pas een gesprek als het
 * werk terugkomt — precies het gesprek dat deze functie moet voorkomen.
 *
 * ── WAAROM DIT IN DE BROWSER GEBEURT EN NIET IN DE WORKER ───────────────────
 *
 * Omdat de pixels hier zijn. Een Cloudflare Worker krijgt bytes en zou een
 * decoder nodig hebben om er een afbeelding van te maken — een afhankelijkheid,
 * voor een controle die hier gratis is omdat de browser het beeld tóch al
 * decodeert voor de miniatuur. En het is ook de goede plek: de klant hoort het
 * op het moment dat hij nog een andere foto kan kiezen.
 *
 * DE SERVER BLIJFT DE POORT. Alles wat hier gebeurt is advies en weigering aan
 * de voorkant; functions/api/upload.js blijft type, grootte en vakje bewaken,
 * want een controle in de browser is een controle die uit te zetten is.
 *
 * ── ÉÉN WEIGERING EN TWEE MELDINGEN ─────────────────────────────────────────
 *
 * Te klein weigert; te donker en te ver gecomprimeerd melden alleen. Waarom dat
 * onderscheid er is, staat bij de constanten in src/data/shots.js: een klep op
 * een heuristiek is een klep die op een dinsdag een echte klant tegenhoudt.
 *
 * ── EN ALS HET METEN NIET LUKT, GAAT DE FOTO GEWOON MEE ─────────────────────
 *
 * createImageBitmap kent HEIC niet in elke browser, een canvas kan geweigerd
 * worden, en een oude browser heeft de API helemaal niet. In al die gevallen
 * geeft dit null terug en verandert er niets aan wat er gebeurt. Een klant
 * buitensluiten omdat ONZE meting niet werkte, is de verkeerde kant om te
 * falen — zelfde afweging als bij de mislukte incasso in de Mollie-webhook.
 */
async function meetBeeld(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  let bm = null;
  try {
    bm = await createImageBitmap(file);
  } catch (e) {
    return null;
  }
  try {
    const w = bm.width;
    const h = bm.height;
    if (!w || !h) return null;

    /* VERKLEIND METEN, en niet op ware grootte. Een foto van 24 megapixel op een
       canvas zetten om het gemiddelde uit te rekenen is honderd megabyte en een
       merkbare hapering op een telefoon, voor een getal dat op 64 bij 64 tot drie
       decimalen hetzelfde is. Het gemiddelde van een beeld verandert niet door
       het te verkleinen — dat is precies wat verkleinen doet. */
    const zij = 64;
    const cv = document.createElement('canvas');
    cv.width = zij;
    cv.height = zij;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { w, h, mean: null };
    ctx.drawImage(bm, 0, 0, zij, zij);
    const d = ctx.getImageData(0, 0, zij, zij).data;

    /* Relatieve luminantie en niet het gemiddelde van R, G en B. Groen weegt
       zeven keer zwaarder dan blauw in wat een oog helder noemt, en een blauw
       vlak zou anders als donker wegkomen terwijl je het prima ziet. Dezelfde
       coëfficiënten als luminance() in src/data/backgrounds.js. */
    let som = 0;
    for (let i = 0; i < d.length; i += 4) {
      som += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    }
    return { w, h, mean: som / (d.length / 4) };
  } catch (e) {
    return null;
  } finally {
    if (bm && typeof bm.close === 'function') bm.close();
  }
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
// unnecessary once you’re logged in.
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
// cookie reaches this call from a page that isn’t /account/*: cookies attach
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
  /* En het KVK-nummer erbij (migratie 0043): syncReg() wist het veld zodra het
     vinkje uit staat, dus alleen invullen als het blok zichtbaar is en leeg. */
  const reg = q('input[name="reg_number"]');
  if (reg && me.regNumber && noVat && noVat.checked && !reg.value) reg.value = me.regNumber;

  applySavedBackground(me);
  // Tiles first: applyBrandKit() may want to preselect one of them.
  addBrandModels(me);
  addOwnStyles(me);
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
  /* En de keuzelijstjes per product, want die worden GEVULD uit deze
     radiogroep — zie vulModelOpties(). Zonder deze regel mist elke productkaart
     precies het gezicht dat een merk het liefst per product kiest: zijn eigen. */
  paintModelDefaults();
}

/* ── DE EIGEN LOOKS VAN DE KLANT — 4 september 2026 ─────────────────────────
 *
 * Lucas: een custom stijl wordt "in het account van de klant geplaatst waarna
 * hij deze kan gaan gebruiken via hetzelfde bestelformulier met de custom style
 * ertussen". /account/me draagt ze (`styles`); hier komen ze in het formulier.
 *
 * Op /start/lifestyle bestaat de lookkiezer al (StylePicker.astro): daar wordt
 * de eerste tegel gekloond zodat de eigen look dezelfde vorm en dezelfde
 * scoped CSS krijgt, met een merkteken "Jouw look" erop. Op /start/catalog is
 * er geen lookvraag — daar komt een klein blok bij ná de achtergrond, alleen
 * als er iets te kiezen valt, met "standaardlook" als eerste antwoord zodat de
 * vraag nooit dwingt.
 *
 * `?style=cs-<id>` uit Studio ("Bestel in deze look") wordt hier aangevinkt;
 * het inline script van StylePicker kan dat niet, want deze tegels bestaan pas
 * na /account/me. Dezelfde discipline: de waarde uit de URL gaat nergens de
 * pagina in, hij wordt alleen vergeleken met een radio die hier zelf is gemaakt.
 */
function addOwnStyles(me) {
  const styles = Array.isArray(me && me.styles) ? me.styles : [];
  if (!styles.length) return;
  const kind = kindOf();
  const passend = styles.filter((st) => st && st.id && (st.service === 'both' || st.service === kind || (kind === 'complete' && st.service !== 'catalog')));
  if (!passend.length) return;

  let wanted = '';
  try {
    const raw = new URLSearchParams(location.search).get('style') || '';
    if (/^cs-\d{1,9}$/.test(raw)) wanted = raw;
  } catch { /* geen URL, geen voorkeur */ }

  const grid = q('.look-grid');
  if (grid && grid.firstElementChild) {
    /* Elke tegel gaat VÓÓR de eerste; de lijst wordt daarom achterstevoren
       doorlopen zodat de volgorde van Studio (oudste eerst) op het scherm
       blijft staan. Het model is de eerste huisstijltegel, gekloond mét zijn
       scope-attribuut, zodat de scoped CSS van StylePicker erop blijft werken. */
    const model = grid.firstElementChild;
    for (const st of passend.slice().reverse()) {
      const tile = model.cloneNode(true);
      tile.classList.add('is-own');
      const img = tile.querySelector('.look-shot');
      const input = tile.querySelector('input[name="style"]');
      const name = tile.querySelector('.look-name');
      const line = tile.querySelector('.look-line');
      if (!input || !name) continue;
      if (img) {
        /* Zonder beeld GEEN gat: een tegel zonder foto naast drie met foto
           zou een lege kolom zijn. De plaats van de foto krijgt een stille
           kaart met de naam erop, als data-URI zodat de <img> (en dus de
           scoped CSS met zijn 4:3) blijft staan. */
        img.removeAttribute('srcset');
        /* De huisstijltegel zit in een <picture> met een avif-<source>; die
           wint van `src` en zou hier de foto van Dunes laten staan. */
        if (img.parentElement && img.parentElement.tagName === 'PICTURE') qa('source', img.parentElement).forEach((el) => el.remove());
        img.src = st.preview || ownLookPlaceholder(st.name);
        img.addEventListener('error', () => { img.src = ownLookPlaceholder(st.name); }, { once: true });
      }
      input.value = `cs-${st.id}`;
      input.dataset.plStyleName = st.name;
      input.required = false;
      delete input.dataset.plReq;
      delete input.dataset.plErrMsg;
      input.checked = wanted === input.value;
      name.textContent = st.name;
      const badge = document.createElement('span');
      badge.className = 'look-own-badge';
      badge.textContent = c('pu.ownLook') || 'Your look';
      name.appendChild(badge);
      if (line) line.textContent = st.line || '';
      grid.insertBefore(tile, grid.firstElementChild);
    }
    syncSummaries();
    /* En als er nu een look aangevinkt staat — de eigen stijl uit de URL, of de
       huisstijl die het script van StylePicker al had aangevinkt — dan vouwt het
       raster op tot één regel. Die functie hoort bij StylePicker (daar staat de
       markup) en wordt hier alleen aangeroepen, want dit is het moment waarop
       de laatste tegel bestaat. */
    if (typeof window.__visLookVast === 'function') window.__visLookVast();
    return;
  }

  // Catalog: geen lookkiezer op de pagina, dus een klein blok van onszelf.
  const bg = q('[data-pl-bg]');
  if (!bg || q('[data-pl-own-look]')) return;
  const box = document.createElement('fieldset');
  box.className = 'pl-fieldset pl-own-look';
  box.setAttribute('data-pl-own-look', '');
  const label = c('pu.ownLookH') || 'Your own look';
  const rows = [`<label class="own-look-opt"><input type="radio" name="style" value=""${wanted ? '' : ' checked'}><span class="own-look-text"><span class="own-look-name">${escHtml(c('pu.ownLookNone') || 'Standard look')}</span></span></label>`]
    .concat(passend.map((st) => `<label class="own-look-opt${st.preview ? ' has-img' : ''}">
        <input type="radio" name="style" value="cs-${st.id}" data-pl-style-name="${escHtml(st.name)}"${wanted === `cs-${st.id}` ? ' checked' : ''}>
        ${st.preview ? `<img class="own-look-img" src="${escHtml(st.preview)}" alt="" loading="lazy" decoding="async">` : ''}
        <span class="own-look-text"><span class="own-look-name">${escHtml(st.name)} <span class="look-own-badge">${escHtml(c('pu.ownLook') || 'Your look')}</span></span>${st.line ? `<span class="own-look-line">${escHtml(st.line)}</span>` : ''}</span>
      </label>`));
  box.innerHTML = `<legend class="pl-sr">${escHtml(label)}</legend>
    <p class="hint">${escHtml(c('pu.ownLookHint') || '')}</p>
    <div class="own-look-list" role="radiogroup">${rows.join('')}</div>`;
  /* De achtergrond staat op deze stap in een dichtgeklapte rij (Disclose:
     <details class="dc dc-panel">) met de keuze in de kop. Een blok dat er los
     achteraan hangt, zou binnen die rij vallen en dus onzichtbaar zijn tot de
     rij open is. Dus wordt de rij zelf gekloond — mét haar scope-attribuut,
     zodat de scoped CSS van Disclose erop blijft werken — en de kop krijgt de
     gekozen look, net zoals "Achtergrond" zijn kleur in de kop draagt. */
  const rij = bg.closest('details.dc');
  const kopLive = () => {
    const gekozen = q('input[name="style"]:checked', box);
    return (gekozen && gekozen.value ? gekozen.dataset.plStyleName : '') || c('pu.ownLookNone') || 'Standard look';
  };
  if (rij && rij.querySelector('.dc-sum') && rij.querySelector('.dc-body')) {
    const eigen = rij.cloneNode(false);
    eigen.open = false;
    const sum = rij.querySelector('.dc-sum').cloneNode(false);
    const lbl = rij.querySelector('.dc-label') ? rij.querySelector('.dc-label').cloneNode(false) : document.createElement('span');
    lbl.textContent = label;
    const live = rij.querySelector('.dc-live') ? rij.querySelector('.dc-live').cloneNode(false) : document.createElement('span');
    for (const a of [...live.attributes]) if (a.name.startsWith('data-pl-')) live.removeAttribute(a.name);
    live.setAttribute('data-pl-sum-own-look', '');
    sum.append(lbl, live);
    const body = rij.querySelector('.dc-body').cloneNode(false);
    body.appendChild(box);
    eigen.append(sum, body);
    rij.insertAdjacentElement('afterend', eigen);
    live.textContent = kopLive();
    qa('input[name="style"]', box).forEach((r) => r.addEventListener('change', () => { live.textContent = kopLive(); }));
  } else {
    bg.insertAdjacentElement('afterend', box);
  }
  qa('input[name="style"]', box).forEach((r) => r.addEventListener('change', syncSummaries));
  syncSummaries();
}

/* De stille kaart voor een look zonder beeld: 4:3, de grond van de tegel, de
   naam in het accent. Alleen tekens die in een SVG-tekstknoop mogen. */
function ownLookPlaceholder(name) {
  const tekst = escHtml(String(name || '').slice(0, 24));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1C1D18"/><text x="24" y="264" font-family="Hanken Grotesk, Arial, sans-serif" font-size="22" font-weight="700" fill="#D2E04A">${tekst}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
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

  /* ── DE VASTE VERHOUDING UIT DE BRAND KIT (migratie 0028) ─────────────────
   *
   * Lucas: *"Formaat kan ook toegevoegd worden aan brand kit in visuails studio
   * om het proces te versnellen, voornamelijk handig voor catalog omdat dit
   * bijna altijd zelfde formaat moet krijgen."* Dit is de helft die dat waar
   * maakt: zonder deze regel stond het antwoord wel in /account en begon elke
   * bestelling toch weer op het vierkant.
   *
   * Op de id gematcht en niet op een naam, want dat is wat de kolom bevat, en
   * `!target.disabled` erbij: een opgeslagen 16:9 hoort een catalogbestelling
   * niet stilletjes op breed te zetten. syncRatio() heeft die tegel daar dan al
   * uitgezet, en een uitgezette radio aanvinken zou een keuze zijn die niemand
   * kan zien en die niet post.
   *
   * DEZELFDE OVERSCHRIJFREGEL als bij de achtergrond hierboven: alleen wat de
   * pagina zelf heeft voorgeselecteerd (`defaultChecked`) wordt aangeraakt.
   * Heeft de klant in deze sessie al een verhouding aangeklikt, dan is dat het
   * antwoord en niet wat er een maand geleden is opgeslagen.
   */
  const wantRatio = String(lock.ratio || '');
  if (wantRatio) {
    const current = q('input[name="ratio"]:checked');
    if (!current || current.defaultChecked) {
      const target = qa('input[name="ratio"]').find((r) => r.value === wantRatio && !r.disabled);
      if (target) { target.checked = true; syncRatio(kindOf()); }
    }
  }

  /* De vaste STIJL bij lifestyle (Je vaste look, migratie 0039) — 3 sep 2026.
     Zelfde regel als de verhouding: alleen als de klant nog niets zelf koos
     (of alleen de standaard nog aanstaat), en alleen een radio die op de
     pagina bestaat. Een `?style=` in de URL is al door StylePicker verwerkt en
     wint dus van de vaste look, want dat is een keuze van zojuist. */
  const wantLook = String(lock.look || '');
  if (wantLook) {
    const current = q('input[name="style"]:checked');
    if (!current || current.defaultChecked) {
      const target = qa('input[name="style"]').find((r) => r.value === wantLook && !r.disabled);
      if (target) { target.checked = true; target.dispatchEvent(new Event('change', { bubbles: true })); }
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

  toonMerkkit(lock);
}

/* ═══════════════════════════════════════════════════════════════════════════
   WAT HET ACCOUNT AL WEET, WORDT GEEN VRAAG — 9 september 2026
   ═══════════════════════════════════════════════════════════════════════════

   Lucas: *"Dan kan bij ingelogde klanten de modelvraag blok in het eerste
   bestelformulier scherm ook weg omdat deze dan ingesteld staat in zijn account
   en hij kan dan per product nog afwijken als hij dat wilt. Kijk naar meer
   dingen als deze die het bestellen nog efficiënter kunnen maken."*

   applyBrandKit() hierboven vinkte de opgeslagen antwoorden al aan — het
   gezicht, de achtergrond, de look, de verhouding, de kanalen. Wat het NIET
   deed, is de vraag weghalen. Een merk dat zijn merkkit vorig kwartaal heeft
   ingericht, kreeg bij elke bestelling dus vijf vragen die het al beantwoord
   had, met het goede antwoord er al in — en dat leest niet als service maar als
   twijfel: heb ik dit nou ingesteld of niet?

   ── WAT ER NU GEBEURT ──────────────────────────────────────────────────────

   Elke vraag die de merkkit beantwoordt, verdwijnt uit de lijst en komt terug
   als één regel in een strook erboven: "Uit je merkkit · Gezicht Ava ·
   Achtergrond Wit · Verhouding 1:1", met één knop om ze alsnog te openen.

   ── VIER REGELS DIE ERONDER LIGGEN ─────────────────────────────────────────

   1. VERBERGEN EN NIET UITZETTEN. Een verborgen veld post gewoon; een
      uitgezette fieldset post niets. De bestelling moet exact dezelfde
      antwoorden dragen als eerst — dit is een presentatiewijziging en geen
      wijziging in wat er verstuurd wordt. Zelfde regel als bij stap 3
      hieronder, die dat sinds augustus al zo doet.

   2. ALLEEN WAT ER ECHT IN STAAT. Een merkkit met alleen een gezicht laat de
      andere vier vragen gewoon staan. De strook telt wat hij vindt; hij verzint
      geen regel voor een leeg veld.

   3. WIJZIGEN IS ÉÉN KLIK EN HIJ IS DEFINITIEF VOOR DEZE BESTELLING. Klikt de
      klant op "wijzigen", dan komen alle vragen terug en verdwijnt de strook —
      geen half-open toestand waarin je twee plekken moet lezen om te weten wat
      er gebeurt.

   4. HET GEZICHT BLIJFT PER PRODUCT TE WIJZIGEN. Dat was Lucas' eigen
      voorwaarde, en het werkt vanzelf: de lade op elke productkaart leest de
      radiogroep, en die staat er nog — hij is alleen niet meer zichtbaar.
   ═══════════════════════════════════════════════════════════════════════════ */
function toonMerkkit(lock) {
  const strook = q('[data-pl-merkkit]');
  if (!strook || strook.dataset.plGeopend) return;

  /* Elke regel: een label, de waarde zoals hij op het scherm staat, en het blok
     dat daarmee overbodig wordt. De waarde komt uit de PAGINA en niet uit de
     merkkit: applyBrandKit() heeft net aangevinkt, en wat er staat is dus wat
     er straks gepost wordt. Zou hij uit `lock` komen, dan kan de strook iets
     anders zeggen dan het formulier draagt — bijvoorbeeld bij een opgeslagen
     16:9 op een catalogbestelling, die syncRatio() weigert. */
  const regels = [];
  const teVerbergen = [];

  const voeg = (label, waarde, blok) => {
    if (!waarde || !blok) return;
    regels.push({ label: label, waarde: waarde });
    teVerbergen.push(blok);
  };

  const gekozenModel = q('input[name="model"]:checked');
  if (gekozenModel && gekozenModel.value && gekozenModel.value !== 'any') {
    voeg(c('s1.kitModel'), modelNaam(gekozenModel), q('[data-pl-model-fold]'));
  }

  const bgTekst = (q('[data-pl-sum-bg]') || {}).textContent;
  if (lock.background) voeg(c('s1.kitBg'), (bgTekst || '').trim(), q('[data-pl-bg-fold]'));

  const chTekst = (q('[data-pl-sum-channels]') || {}).textContent;
  if (Array.isArray(lock.channels) && lock.channels.length) {
    voeg(c('s1.kitCh'), (chTekst || '').trim(), q('[data-pl-ch-fold]'));
  }

  const ratioNu = q('input[name="ratio"]:checked');
  if (lock.ratio && ratioNu) voeg(c('s1.kitRatio'), c(`ratio.name.${ratioNu.value}`), q('[data-pl-ratio]'));

  const stijlNu = q('input[name="style"]:checked') || q('select[name="style"]');
  if (lock.look && stijlNu && stijlNu.value) {
    const naam = stijlNu.tagName === 'SELECT'
      ? (stijlNu.options[stijlNu.selectedIndex] || {}).textContent
      : stijlNu.dataset.plStyleName;
    voeg(c('s1.kitLook'), (naam || stijlNu.value).trim(), q('[data-pl-look]'));
  }

  if (!regels.length) { strook.hidden = true; return; }

  const lijst = q('[data-pl-merkkit-lijst]', strook);
  if (lijst) {
    lijst.textContent = '';
    regels.forEach((r) => {
      const li = document.createElement('li');
      const l = document.createElement('span');
      l.className = 'pl-kit-l';
      l.textContent = r.label;
      const v = document.createElement('b');
      v.textContent = r.waarde;
      li.append(l, v);
      lijst.appendChild(li);
    });
  }

  teVerbergen.forEach((el) => { el.hidden = true; });
  strook.hidden = false;

  const knop = q('[data-pl-merkkit-open]', strook);
  if (knop && !knop.dataset.plGebonden) {
    knop.dataset.plGebonden = '1';
    knop.addEventListener('click', () => {
      strook.dataset.plGeopend = '1';
      strook.hidden = true;
      teVerbergen.forEach((el) => { el.hidden = false; });
      /* De eerste vraag krijgt de aandacht: wie op "wijzigen" klikt, wil daar
         zijn en niet zoeken waar de vragen ineens vandaan komen. */
      const eerste = teVerbergen[0];
      if (eerste && typeof eerste.scrollIntoView === 'function') {
        eerste.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const focusbaar = q('summary, input, select, button', eerste);
        if (focusbaar && typeof focusbaar.focus === 'function') focusbaar.focus({ preventScroll: true });
      }
    });
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

  /* DE SOORT MOET MEE, WANT HET PLAFOND HANGT ERVAN AF — 31 augustus 2026.
     De poort rekent in punten: dertig catalogsets zijn er 120 en dertig complete
     producten 210. Zonder deze parameter antwoordt het endpoint met 'complete',
     het zwaarste gewicht, en krijgt een catalogbestelling minder dagen aangeboden
     dan er werkelijk vrij zijn. Uit het formulier en niet uit het configblok, om
     dezelfde reden als bij het verzenden: dit is de waarde die straks in
     orders.service staat. */
  const dienst = (q('input[name="service"]') || {}).value || '';
  const svcDeel = dienst ? `&service=${encodeURIComponent(dienst)}` : '';

  fetch(`/api/capacity?products=${encodeURIComponent(products)}&tier=attended${svcDeel}`, {
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

/*
 * ── DE LEVERDATA ALS AGENDA — 10 september 2026 ──────────────────────────────
 *
 * Lucas: *"Ik zou dit liever als een agenda willen zien waar de klant kan klikken
 * op een beschikbare datum."*
 *
 * Wat er stond waren zes tegels met in elke tegel de hele zin: "Saturday 12
 * September – Sunday 13 September". Zes keer een datum uitgeschreven naast elkaar
 * is zes keer lezen om te zien wat er vrij is, en het verband tussen die zes —
 * dat het opeenvolgende dagen zijn — moest je er zelf uit halen. In een maandruit
 * staat dat verband er gewoon: je ziet in één blik welke dagen vrij zijn, welke
 * niet, en waar het gat zit.
 *
 * ── WAT DE AGENDA WEL EN NIET IS ───────────────────────────────────────────
 *
 * Hij toont ALLEEN de maanden waarin iets vrij is, en per maand alle dagen ervan.
 * Geen maandwisselaar, geen pijltjes: het venster van de planning is een week of
 * twee vooruit (zie HORIZON_DAYS in capacity.js), en een agenda waarin je kunt
 * bladeren naar maanden zonder aanbod, is een agenda die belooft dat daar iets te
 * halen valt.
 *
 * EEN DAG IS EEN KNOP OF HIJ IS NIETS. Alleen de startdagen die de server
 * teruggaf zijn aanklikbaar; de rest staat er als getal zonder handeling. Dat is
 * met opzet geen `disabled`-knop: een uitgeschakelde knop belooft nog steeds dat
 * er iets te klikken valt en zit in de tabvolgorde in de weg.
 *
 * DE HELE PERIODE LICHT OP. Een venster is meestal twee dagen; klik je de eerste,
 * dan kleurt ook de tweede. Anders kiest iemand een zaterdag en leest hij pas in
 * de bevestiging dat er een zondag bij hoort.
 *
 * DE MAANDNAMEN EN WEEKDAGEN KOMEN UIT Intl en niet uit de copy: elke browser
 * kent ze al in beide talen, en een eigen lijst is een lijst die op een dag
 * afwijkt van wat de rest van de pagina zegt.
 */
function renderWindows(windows) {
  const host = q('[data-pl-windows]');
  if (!host) return;
  host.textContent = '';

  const geldig = (windows || []).filter((w) => w && typeof w.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.start));
  if (!geldig.length) {
    const leeg = document.createElement('p');
    leeg.className = 'pl-kal-leegzin';
    leeg.textContent = c('gate.none');
    host.appendChild(leeg);
    return;
  }

  const opStart = new Map(geldig.map((w) => [w.start, w]));
  const taal = cfg.lang === 'nl' ? 'nl-NL' : 'en-GB';

  /* Eén regel onder de agenda die de gekozen periode uitschrijft. De ruit toont
     WELKE dagen; deze regel bevestigt WAT je gekozen hebt, in dezelfde woorden
     als de bevestigingsstap straks. */
  const keuze = document.createElement('p');
  keuze.className = 'pl-kal-keuze';
  keuze.hidden = true;

  const maanden = [];
  geldig.forEach((w) => {
    const m = w.start.slice(0, 7);
    if (maanden.indexOf(m) === -1) maanden.push(m);
  });
  maanden.sort();

  maanden.forEach((maand) => {
    host.appendChild(kalenderMaand(maand, opStart, taal, host, keuze));
  });
  host.appendChild(keuze);
}

/** Eén maandruit. */
function kalenderMaand(maand, opStart, taal, host, keuze) {
  const [jaar, mnd] = maand.split('-').map(Number);
  const blok = document.createElement('div');
  blok.className = 'pl-kal';
  /* De maand op het blok, zodat markeerBereik() de datum van een niet-klikbare
     dag kan terugrekenen uit het dagnummer. */
  blok.dataset.maand = maand;

  const kop = document.createElement('p');
  kop.className = 'pl-kal-maand';
  try {
    kop.textContent = new Intl.DateTimeFormat(taal, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(jaar, mnd - 1, 1)));
  } catch { kop.textContent = maand; }
  blok.appendChild(kop);

  /* De koprij met de weekdagen. `aria-hidden`, want elke knop draagt zijn eigen
     volledige datum als label — een schermlezer die eerst zeven afkortingen moet
     doorlopen, is er niet mee geholpen. */
  const week = document.createElement('div');
  week.className = 'pl-kal-week';
  week.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 7; i++) {
    const cel = document.createElement('span');
    /* 5 maart 2026 was een maandag; vandaar dat vaste anker om zeven namen te
       krijgen zonder een lijst per taal. */
    try {
      cel.textContent = new Intl.DateTimeFormat(taal, { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2026, 0, 5 + i)));
    } catch { cel.textContent = ''; }
    week.appendChild(cel);
  }
  blok.appendChild(week);

  const dagen = document.createElement('div');
  dagen.className = 'pl-kal-dagen';

  /* Maandag als eerste kolom: getDay() geeft zondag = 0, dus omrekenen. */
  const eerste = new Date(Date.UTC(jaar, mnd - 1, 1));
  const schuif = (eerste.getUTCDay() + 6) % 7;
  for (let i = 0; i < schuif; i++) {
    const leeg = document.createElement('span');
    leeg.className = 'pl-kal-leeg';
    leeg.setAttribute('aria-hidden', 'true');
    dagen.appendChild(leeg);
  }

  const aantal = new Date(Date.UTC(jaar, mnd, 0)).getUTCDate();
  for (let d = 1; d <= aantal; d++) {
    const iso = `${maand}-${String(d).padStart(2, '0')}`;
    const venster = opStart.get(iso);
    if (!venster) {
      const uit = document.createElement('span');
      uit.className = 'pl-kal-dag is-uit';
      uit.textContent = String(d);
      uit.setAttribute('aria-hidden', 'true');
      dagen.appendChild(uit);
      continue;
    }
    const knop = button(String(d), 'pl-kal-dag');
    knop.dataset.start = venster.start;
    knop.dataset.end = venster.end || venster.start;
    knop.setAttribute('aria-pressed', 'false');
    /* Het volledige bereik als label, want "12" zegt een schermlezer niets. */
    knop.setAttribute('aria-label', knop.dataset.end !== knop.dataset.start
      ? `${day(knop.dataset.start)} – ${day(knop.dataset.end)}`
      : day(knop.dataset.start));
    knop.addEventListener('click', () => kiesVenster(knop, host, keuze));
    dagen.appendChild(knop);
  }

  blok.appendChild(dagen);
  return blok;
}

/** Eén venster kiezen: de knop aan, de hele periode oplichten, de velden gezet. */
function kiesVenster(knop, host, keuze) {
  qa('.pl-kal-dag', host).forEach((o) => {
    o.classList.remove('is-picked', 'in-bereik');
    if (o.tagName === 'BUTTON') o.setAttribute('aria-pressed', 'false');
  });
  knop.classList.add('is-picked');
  knop.setAttribute('aria-pressed', 'true');

  /* De dagen tússen start en eind, ook als die in de volgende maandruit staan.
     Op datum en niet op positie: een venster dat over een maandgrens loopt, hoort
     in beide ruiten op te lichten. */
  const start = knop.dataset.start;
  const eind = knop.dataset.end;
  /* Eén doorloop voor alle cellen, ook de niet-klikbare: een venster van twee
     dagen heeft meestal een tweede dag die zelf geen startdag is, en die hoort
     net zo goed op te lichten. */
  if (eind !== start) markeerBereik(host, start, eind);

  setHidden('window_start', start);
  setHidden('window_end', eind);

  keuze.hidden = false;
  keuze.textContent = eind !== start
    ? `${c('gate.chosen')}: ${day(start)} – ${day(eind)}`
    : `${c('gate.chosen')}: ${day(start)}`;
}

/**
 * De dagen binnen een gekozen venster oplichten, ook de dagen die zelf geen
 * startdag zijn. Die staan als `<span>` in de ruit en hebben geen dataset, dus de
 * datum wordt hier uit de maandkop en het dagnummer teruggerekend.
 */
function markeerBereik(host, start, eind) {
  qa('.pl-kal', host).forEach((blok) => {
    const cellen = qa('.pl-kal-dag', blok);
    cellen.forEach((cel) => {
      let iso = cel.dataset.start;
      if (!iso) {
        const nr = Number(cel.textContent);
        const maand = blok.dataset.maand;
        if (!maand || !Number.isInteger(nr)) return;
        iso = `${maand}-${String(nr).padStart(2, '0')}`;
      }
      if (iso > start && iso <= eind) cel.classList.add('in-bereik');
    });
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

  /*
   * ── WAAR DE KLANT VERKOOPT, EN WAT DAT VASTZET ────────────────────────────
   *
   * 18 augustus 2026. Deze vraag stond niet op het bevestigingsscherm, en het
   * is de vraag die de meeste andere antwoorden overschrijft: een aangevinkte
   * marktplaats zet de achtergrond vast op #FFFFFF en verandert het geleverde
   * formaat van webp naar jpg. De regel eronder toonde vervolgens "Achtergrond
   * · Wit — #FFFFFF" alsof de klant dat gekozen had.
   *
   * Zelfde bron als syncChannels(): de vinkjes zelf en hun eigen labels, niet
   * een tweede lijst die uit de pas kan lopen. Een kanaal dat morgen aan
   * channels.js wordt toegevoegd, staat hier vanzelf in.
   *
   * ALLEEN ALS DE VRAAG GESTELD IS. [data-pl-ch] bestaat niet op een stroom
   * zonder kanaalkiezer, en dan is een lege regel de afwezigheid van een vraag
   * en niet een onbeantwoorde vraag — dezelfde regel als bij de achtergrond en
   * de look hieronder.
   */
  const chField = q('[data-pl-ch]');
  const chBoxes = qa('[data-pl-ch-box]');
  const chOn = chBoxes.filter((b) => b.checked);
  const chWhite = chOn.some((b) => b.dataset.plChWhite === '1');
  if (chField) {
    const namen = chOn.map((b) => {
      const n = b.closest('.ch-opt') && b.closest('.ch-opt').querySelector('.ch-name');
      return n ? n.textContent.trim() : b.value;
    });
    rows.push([c('sum.channels'), namen.length ? namen.join(', ') : c('sum.channelsNone')]);
  }

  // The background, read back as the name AND the value — the two things a
  // client would check on a confirm screen, and the two things the studio is
  // about to be sent. Only when the scope has one: syncBackground() empties the
  // resolved field for a lifestyle-only order, so an empty field here is the
  // absence of a question rather than an unanswered one.
  const bgHex = value('background_hex');
  if (bgHex) {
    const picked = q('input[name="background"]:checked');
    const bgName = picked ? picked.dataset.plBgName : '';
    const basis = bgName ? `${bgName} — ${bgHex}` : bgHex;
    // En waar hij vandaan komt, als de klant hem niet zelf heeft gekozen.
    rows.push([c('sum.bg'), chWhite ? `${basis} · ${c('sum.bgLocked')}` : basis]);
  }

  // Het formaat is een LEVERINGSFEIT en het verandert alleen hier. Het stond op
  // stap 1 in een uitklapper en nergens meer daarna; op het scherm waar iemand
  // controleert wat hij krijgt, hoort het gewoon op een regel.
  if (chWhite) rows.push([c('sum.format'), c('sum.formatJpg')]);

  // The look, on the lifestyle flow. Same rule as the background above: only
  // when the flow HAS the question. There is no picker on a catalog order, so
  // an empty answer here is the absence of a question rather than a skipped one.
  // `:disabled` EN NIET ALLEEN `:checked`. syncStyle() laat de gekozen look
  // aangevinkt staan als de bezoeker op /test-sample naar catalog omschakelt —
  // zodat hij hem terugvindt — en zet alleen de fieldset uit. Een radio in een
  // uitgezette fieldset post niet, dus hij hoort ook hier niet te staan; op de
  // bevestiging zou hij anders een antwoord tonen dat de studio nooit krijgt.
  /* ── EEN RADIO OF EEN KEUZELIJST — 9 september 2026 ──────────────────────
     Tot vandaag was de look altijd een radiogroep (StylePicker, het raster op
     /start/lifestyle). Sinds StijlRegel bestaat, kan hetzelfde antwoord ook uit
     een <select> komen — op /start/catalog en op /start/complete — en dan is er
     niets `:checked`. Deze functie leest allebei.

     `data-pl-style-name` staat op de radio én op de <option>, zodat hier de
     NAAM van de stijl staat en niet de slug. Valt hij weg, dan is de waarde
     zelf nog altijd leesbaar ("dunes"), en dat is beter dan een lege regel. */
  const stijlRij = (naam, sleutel) => {
    const radio = q(`input[name="${naam}"]:checked`);
    if (radio) {
      if (!radio.matches(':disabled')) rows.push([c(sleutel), radio.dataset.plStyleName || radio.value]);
      return;
    }
    const keuze = q(`select[name="${naam}"], input[type="hidden"][name="${naam}"]`);
    if (!keuze || keuze.matches(':disabled') || !keuze.value) return;
    const gekozen = keuze.tagName === 'SELECT' ? keuze.options[keuze.selectedIndex] : keuze;
    rows.push([c(sleutel), (gekozen && gekozen.dataset.plStyleName) || keuze.value]);
  };
  /* De catalogstijl staat er alleen als hij gevraagd is — op /start/catalog en
     /start/complete. Bij een bestelling met allebei krijgen ze een eigen
     etiket, want "Stijl · Classic" en "Stijl · Dunes" onder elkaar zegt niet
     welke helft welke is. */
  const heeftBeide = !!q('[name="catalog_style"]') && !!q('[name="style"]');
  stijlRij('catalog_style', heeftBeide ? 'sum.styleCatalog' : 'sum.style');
  stijlRij('style', heeftBeide ? 'sum.styleLifestyle' : 'sum.style');

  // De verhouding. Altijd, want elke bestelling heeft er een — er is geen
  // stroom waar deze vraag niet wordt gesteld, en dus geen leeg antwoord dat
  // "niet gevraagd" zou kunnen betekenen. Wat een enkel beeld afwijkt, staat
  // niet op deze regel: dertig kaarten × drie beelden is geen bevestigingsscherm
  // meer, en de afwijking staat op de kaart waar hij gezet is.
  const ratioId = ratioNow();
  if (ratioId) rows.push([c('sum.ratio'), c(`ratio.name.${ratioId}`)]);

  // Task #271f.
  if (outfitN > 0) rows.push([c('sum.outfit'), c('sum.outfitN', { price: euro(cfg.outfitSurcharge), n: outfitN })]);

  /* ── DE TWEE BETAALDE KEUZES VAN 9 SEPTEMBER ──────────────────────────────
     Ze staan hier om dezelfde reden als het setje erboven: het zijn de enige
     twee dingen op dit scherm die het bedrag veranderen zonder dat er een
     product bij komt. Wie ze niet koos, ziet ze niet — een regel "0 producten
     in 4K" is ruis. */
  const hoogN = hoogResCount();
  if (hoogN > 0) rows.push([c('sum.hoogRes'), c('sum.hoogResN', { n: hoogN, px: String((cfg.hoogRes && cfg.hoogRes.hoog) || '') })]);
  if (voorrangAan()) rows.push([c('sum.voorrang'), c('sum.voorrangJa', { uren: String((cfg.voorrang && cfg.voorrang.uren) || 24) })]);

  /* De hoeken bij NAAM. Het bedrag staat al in de totaalregel; wat hier hoort is
     WAT er gemaakt wordt, want dat is het enige op dit scherm dat de klant nog
     kan terugdraaien. De naam komt van de tegel waarop hij klikte, dus hij kan
     niet gaan afwijken van wat hij zag. */
  const hoeken = anglesChosen()
    .map((b) => {
      const naam = q('.pl-hoek-naam', b.closest('li'));
      return naam ? naam.textContent.replace(/\s*✓\s*$/, '').trim() : '';
    })
    .filter(Boolean);
  if (hoeken.length) rows.push([c('sum.angles'), c('sum.anglesN', { list: hoeken.join(', ') })]);

  /*
   * Computed again — NOT scraped back off step 1. Reading the rendered total
   * would make the confirm screen a copy of a copy, and a client who changed
   * the count and came straight here would confirm the old figure. Same rule as
   * step 1: net, labelled, and never authoritative.
   *
   * ── BEHALVE OP DE PROEF, EN DAAR STOND HET FOUT ───────────────────────────
   *
   * 18 augustus 2026. Op /test-sample gaf deze regel "Orderbedrag (excl. btw) ·
   * € 89": het laddertarief voor één catalogproduct. De proef kost € 1, en dat
   * bedrag staat in de kop van die pagina, op de tegel van stap 1 en in de
   * voetnoot over misbruik. Alleen op het scherm dat vraagt of alles klopt,
   * stond het verkeerde getal — en dat is de duurste plek van allemaal, op het
   * product dat er juist is om een eerste klant vertrouwen te geven.
   *
   * quoteFor() had ongelijk noch gelijk: de SOORT is op de proef een echte
   * keuze, dus hij kreeg 'catalog' en 1 en gaf het goede antwoord op de
   * verkeerde vraag. Er was niets in dit bestand waaruit hij kon opmaken dat
   * deze stroom één vast bedrag heeft. Nu wel — cfg.samplePrice, uit
   * AMOUNT.testSample in pricing.js, en null op elke andere stroom.
   */
  /* `!= null` EN NIET Number.isFinite(Number(x)) ALLEEN. Number(null) is 0, en 0
     is eindig — de eerste versie van deze regel zette daarmee "€ 0" op elke
     gewone bestelling. Gevonden door de andere stromen na te lopen in plaats van
     alleen de stroom die gerepareerd werd. */
  const vast = cfg.samplePrice != null ? Number(cfg.samplePrice) : null;
  if (vast !== null && Number.isFinite(vast)) {
    rows.push([c('sum.net'), euro(vast)]);
  } else {
    const quote = kind ? quoteFor(kind, n, outfitN) : null;
    if (quote) rows.push([c('sum.net'), euro(quote.net)]);
  }

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

  /*
   * HET GEZICHT. Ook als het "wij kiezen er een" is, en dat is met opzet:
   * ModelPicker noemt de standaard zelf *"een echt antwoord — geen leeg veld
   * waar we je achteraf over lastigvallen"*, en een regel die alleen verschijnt
   * zodra je afwijkt, laat je niet controleren dat je NIET bent afgeweken.
   *
   * Het eigen merkmodel van een ingelogde klant heeft geen .mp-name in dezelfde
   * vorm; vandaar de terugval op de waarde, zoals bij de kanalen hierboven.
   */
  const mp = q('input[name="model"]:checked');
  if (mp && !mp.matches(':disabled')) {
    if (mp.value === 'any') {
      rows.push([c('sum.model'), c('sum.modelAny')]);
    } else if (mp.value) {
      const naam = mp.closest('.mp-opt') && mp.closest('.mp-opt').querySelector('.mp-name');
      rows.push([c('sum.model'), naam ? naam.textContent.trim() : mp.value]);
    }
  }

  const email = q('input[name="email"]');
  if (email && email.value) rows.push([c('sum.email'), email.value]);

  renderStrip({ bgHex, bgName: (q('input[name="background"]:checked') || {}).dataset?.plBgName || '', ratioId, mp });

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

/**
 * De beeldstrook boven de samenvatting — 3 september 2026. Alleen wat er
 * echt is: de voorkant-thumbnails van de kaarten (max. acht, dan "+N"), het
 * gekozen gezicht als er een portret op de pagina staat, de achtergrond met
 * het voorbeeldbeeld erop, en het ratiokader. Niets hiervan is een waarde die
 * gepost wordt; het is dezelfde informatie als de tabel, in beeld.
 */
function renderStrip({ bgHex, bgName, ratioId, mp }) {
  const strip = q('[data-pl-sum-strip]');
  if (!strip) return;
  strip.textContent = '';
  const item = (cap, cls) => {
    const w = document.createElement('div');
    w.className = 'pl-sum-item';
    const t = document.createElement('span');
    t.className = `pl-sum-thumb${cls ? ` ${cls}` : ''}`;
    const c2 = document.createElement('span');
    c2.className = 'pl-sum-cap';
    c2.textContent = cap;
    c2.title = cap;
    w.append(t, c2);
    strip.appendChild(w);
    return t;
  };
  const front = REQUIRED_SHOT_IDS[0];
  const shown = cards.filter((card) => card.slots[front] && card.slots[front].url && card.slots[front].thumb);
  shown.slice(0, 8).forEach((card) => {
    const t = item((card.input && card.input.value.trim()) || c('pu.product', { n: card.n }));
    const im = document.createElement('img');
    im.alt = '';
    im.src = card.slots[front].url;
    t.appendChild(im);
  });
  if (shown.length > 8) {
    const more = document.createElement('span');
    more.className = 'pl-sum-more';
    more.textContent = `+${shown.length - 8}`;
    strip.appendChild(more);
  }
  if (mp && !mp.matches(':disabled') && mp.value && mp.value !== 'any') {
    const opt = mp.closest('.mp-opt');
    const img = opt && opt.querySelector('img');
    const naam = opt && opt.querySelector('.mp-name');
    if (img && (img.currentSrc || img.getAttribute('src'))) {
      const t = item(naam ? naam.textContent.trim() : mp.value);
      const im = document.createElement('img');
      im.alt = '';
      im.src = img.currentSrc || img.getAttribute('src');
      t.appendChild(im);
    }
  }
  if (bgHex) {
    const t = item(bgName ? `${bgName} · ${bgHex}` : bgHex, 'is-bg');
    t.style.background = bgHex;
    const eg = q('.bg-eg');
    if (eg) {
      const im = document.createElement('img');
      im.alt = '';
      im.src = eg.getAttribute('src');
      t.appendChild(im);
    }
  }
  if (ratioId) {
    const tile = q(`[data-pl-ratio-tile="${ratioId}"] .ratio-shape`);
    const t = item(c(`ratio.name.${ratioId}`), 'is-ratio');
    t.style.aspectRatio = tile && tile.style.aspectRatio ? tile.style.aspectRatio : '1 / 1';
    t.style.height = '84px';
    const eg = tile && tile.querySelector('img');
    if (eg) {
      const im = document.createElement('img');
      im.alt = '';
      im.src = eg.getAttribute('src');
      t.appendChild(im);
    }
  }
  strip.hidden = !strip.childElementCount;
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

    /* Het adres voor de bedankpagina, en niets anders — 3 september 2026. De
       pagina is statisch en de URL draagt alleen het kenmerk; de zin
       "Bevestiging verstuurd naar" wil het adres tonen. sessionStorage sluit
       de deur achter zich: één tab, weg na sluiten. Best effort. */
    try {
      const em = (q('input[name="email"]') || {}).value || '';
      if (em) sessionStorage.setItem('vis-ty-mail', em.trim());
      /* ── EN HET AANTAL EN DE SOORT — 8 september 2026 ───────────────────
         De bedankpagina wil één regel over het abonnement tonen, en alleen aan
         wie genoeg besteld heeft om er iets aan te hebben. Ze kan dat niet uit
         de URL halen en dat is met opzet: de kop van initThankYou() in
         interactions.js legt uit waarom er niets anders dan het kenmerk in de
         adresbalk staat — een query string wordt gelezen door de referrer, de
         geschiedenis en alles wat URL's logt. sessionStorage doet de deur
         achter zich dicht: één tabblad, weg bij sluiten, nooit onderweg. */
      const aantal = productCount();
      if (Number.isInteger(aantal) && aantal > 0) sessionStorage.setItem('vis-ty-n', String(aantal));
      const soort = kindOf();
      if (soort) sessionStorage.setItem('vis-ty-kind', soort);
    } catch { /* geen opslag is geen fout */ }

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
