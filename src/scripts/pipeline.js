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
//           [data-pl-lookzin]                    de regel over complete looks (levering 60)
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
//           [data-pl-upload-note="off"]          shown when uploads are down
//           [data-pl-upload-note="limiet"]       shown when the daily upload
//                                                limit is reached (o05, 8 okt 2026)
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
//           [data-pl-cap-max]                    filled with the server's number
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
import { ikoon, IKOON } from '../data/iconen.js';
import {
  SHOT_IDS, REQUIRED_SHOT_IDS, isRequiredShot, MUST_DECIDE_SHOT_IDS, mustDecideShot, guessShot, productStem, productKeyFromPath, extraShotId,
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
/* De complete look (levering 60): welke soort op welke plek past, en wanneer een
   groep een look mag zijn. Dezelfde regels als de server leest (schoonLooks). */
import { pastOp, lookKlopt } from '../data/looks.js';
/* Het kleurvlakje bij de productkleur leest de hexcode ook uit "bosgroen, #1B3A2F" (5.03). */
import { hexUit } from '../lib/kleurcode.js';
/* Alleen de vraag "is dit de zelfbedachte hoek": de veldnamen staan in
   angles.js zodat het formulier, de server en dit script er niet elk hun eigen
   spelling van maken. Zie de noot bij EIGEN_ANGLE_IDS. */
import { isEigenAngleId } from '../data/angles.js';
/* Het oordeel over een aangeleverde foto staat naast de drempels in shots.js,
   zodat het te toetsen is zonder een browser. Het METEN staat hier, want daar
   zijn de pixels — zie meetBeeld(). */
import { keurBeeld } from '../data/shots.js';
/* De lijst "wat ontbreekt" in het tussenscherm van stap 2 (2.05): dezelfde
   bron als Studio, de mails en /admin. Zonder DOM en zonder database. */
import { ontbrekendeFotos, ontbrekendRegels } from '../lib/ontbreekt.js';
/* 1.04: de sleutel en de termijn van het concept op het apparaat van de klant. */
import { CONCEPT_SLEUTEL, CONCEPT_DAGEN, TIPS_SLEUTEL } from '../data/cookies.js';
// De EU-lijst staat op één plek. Hem hier overtypen zou betekenen dat het
// formulier en de server het ooit oneens worden over of een land in de EU zit,
// en dan biedt het formulier 0% aan waar de server 21% rekent.
import { isEu, HOME_COUNTRY, vatShape, vatFormatError } from '../data/vat.js';
import { VAT_RATE } from '../data/pricing.js';
/* 1.07 (8 oktober 2026): bij welk groter aantal de bestelling evenveel of minder
   kost. Alleen de regel; de som zelf geeft dit script mee (totaalBij()). */
import { groterGoedkoper } from '../data/pricing.js';
/* Ronde B (8 oktober 2026): wat een bestelling in credits kost — dezelfde som als
   /account/order, zodat stap 5 nooit een ander getal noemt dan wat afgaat. */
import { creditKosten, watPast, oudsteEerst, CREDIT_DIENSTEN } from '../data/creditKosten.js';
import { EXTRA_CREDITS } from '../data/pricing.js';
/* 1.08: het WhatsApp-nummer en de codering van het bericht, op één plek. */
import { waHref } from '../data/whatsapp.js';
/* 8.06: de verleggingszin in het zakelijk-vinkje (ingevuld met merk en nummer). */
import { verleggingZin } from '../data/business.js';
/* De onzichtbare botcheck van Cloudflare (o03, 8 oktober 2026). Zonder sleutels
   doet hij niets en kost hij niets; zie src/scripts/botcheck.js. */
import { botToken, bindBotcheckForms } from './botcheck.js';

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
/* Het creditsaldo van een ingelogde abonnee uit /account/me (ronde B), en hoe
   ver vooruit stap 5 "binnenkort vervallen" noemt. Hier bovenaan en niet bij
   syncCredits(): boot() hieronder draait al tijdens het laden van dit bestand,
   en syncTotal() roept syncCredits() aan — een `let` verderop zou dan nog niet
   bestaan. */
let creditsMe = null;
/* Doorloop 27 (B26): hoeveel credits deze bestelling kost als hij er helemaal
   mee betaald wordt, anders 0. syncCredits() zet hem, renderSummary() leest hem. */
let creditsKosten = 0;
/* 15 oktober 2026 (Lucas: *"krijg nu te zien dat ik in euro moet betalen terwijl
   ik mijn credits wil gebruiken"*): gaat deze bestelling met credits, dan noemt
   stap 1 ook de prijzen in credits — een extra hoek "2 credits per foto", geen
   euroladder en geen btw-regel — en staat bij voorrang en een outfit dat die niet
   met credits kunnen. Ook al vóór er een aantal is ingevuld. syncCredits() zet
   hem, zetCreditPrijzen() schrijft het op. */
let prijzenInCredits = false;
/* B26b: de euroregels zoals syncTotal() ze het laatst schreef, zodat
   zetGeldRegels() ze terugzet als de klant toch niet met credits betaalt. */
let totaalEuro = '';
let totaalNoot = '';
const CREDITS_BINNENKORT_DAGEN = 31;
let STEPS = DEFAULT_STEPS;
/** Null betekent: deze stroom heeft geen capaciteitspoort. */
let GATE_STEP = DEFAULT_GATE_STEP;
let current = 1;
let batch = '';
let staged = []; // [{ key, name, bytes, product, shot }]
let uploadsOff = false;
/* ── DE DAGGRENS IS BEREIKT — 8 oktober 2026 (o05) ─────────────────────────
   /api/upload antwoordt `dag-limiet` als deze internetaansluiting vandaag het
   maximum heeft verstuurd (zie UPLOAD_DAG in functions/api/upload.js). Dan gaan
   de foto's die nog in de wachtrij staan er niet meer achteraan — die worden
   alleen geweigerd — en verschijnt één keer het blok met WhatsApp en mail om
   de bestelling zo te plaatsen. Zelfde vorm als `uploadsOff`. */
let uploadsVol = false;
let busy = false;
let gateReq = 0; // request generation, so a slow answer cannot overwrite a fast one
/* Zie askMissing(): heeft de klant "toch versturen" gekozen bij ontbrekende
   foto's? Hier en niet bij de functie, om dezelfde reden als `reached`: boot()
   draait vóór de rest van dit bestand is geëvalueerd. */
let missingOk = false;
/* 1.04 (F3, 11 oktober 2026): het concept op dit apparaat. `conceptKlaar` staat
   uit tot de klant gekozen heeft (of er niets te kiezen viel) — anders schrijft
   de lege opstart van het formulier het bewaarde concept meteen over. Hier en
   niet bij de functies, om de reden die bij `reached` staat: boot() draait vóór
   de rest van dit bestand. */
let conceptKlaar = false;
let conceptTimer = 0;

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
/* Welk extra-vaknummer bij welke hoek hoort, zolang die hoek gekozen is. Zie de
   kop boven hoekVakken() verderop voor waarom het nummer bij de hoek blijft. */
let hoekVak = {};
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
  top: ['underlayer', 'bottom'],
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
/* Ronde 9, F58 — hier en niet bij show(), om dezelfde reden als `reached`:
   init() roept show() aan vóór de module onderaan geëvalueerd is. Astro's
   navigate() wordt dynamisch geladen; waar pipeline.js los draait (de tests)
   is hij er niet en valt show() terug op een gewone pushState. */
let astroNavigate = null;
let eersteStapGetoond = false;
try {
  import('astro:transitions/client').then((m) => { astroNavigate = m && m.navigate; }).catch(() => {});
} catch { /* geen dynamische import: dan zonder */ }

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
  uploadsVol = false;
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
  checkOpenOrder();

  bindNav();
  bindErrors();
  bindOrder();
  bindUploads();
  bindGate();
  bindSubmit();
  bindBotcheckForms();
  bindVertrekWaarschuwing();
  bindPrefill();
  bindMissing();
  bindWerk();
  wkStandaardAantal();
  missingOk = false;

  syncOrder();
  show(1, { focus: false });
  /* 1.04: was de klant hier al bezig? Pas NA de opstart, zodat de kaarten en
     de stappen er zijn om in te zetten wat terugkomt. */
  conceptKlaar = false;
  bindConcept();
  checkConcept();
}


/* ── DE STYLING PER PRODUCT STOND HIER — 22 september tot 11 oktober 2026 ───
 *
 * bindStyling(), syncStyling(), buildStylingRow() en paintStylingRow() bouwden
 * onderaan stap 2 een tweede lijst van dezelfde producten ("Wat je opstuurt",
 * Styling.astro): per product de soort, het poppetje, de foto's en de vakjes
 * voor wat erbij in beeld kan. Die tweede lijst is weg (F3, Lucas: één kaart
 * per product). De soort staat nu op de kaart (buildSoort), de contextvakjes in
 * de lade van de kaart (buildErbij, paintErbij) — met dezelfde veldnamen
 * (`garment_pN`, `context_<plek>_pN`) en dezelfde vakje-ids (`ctx-<plek>`), dus
 * /api/order en de werkmap merken er niets van. CTX_BY_GARMENT bovenaan blijft
 * de tabel die zegt welke plekken bij welke soort horen. */

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
  /* De tips van stap 2 en 5 (v28-tips = a): één keer, als de stap in beeld komt. */
  setTimeout(() => {
    if (current !== to) return;
    if (to === 2) toonTip('fotos');
    if (to === 5 && q('[data-pl-credits]') && !q('[data-pl-credits]').hidden) toonTip('credits');
  }, 0);
  /* ── DE TERUGKNOP VAN DE BROWSER IS DE VORIGE STAP — ronde 9, 2 oktober ──
     De stappen stonden niet in de geschiedenis. Terug op stap 2 verliet het
     formulier (met de vertrekwaarschuwing ervoor), en wie dan toch ging en
     weer vooruit kwam, begon bij stap 1 met alles leeg. Nu krijgt elke stap
     een eigen plek in de geschiedenis — op dezelfde URL — en zet popstate
     (bindNav) de stap terug. */
  /* HOE: elke stap na de eerste krijgt een #stap-N op dezelfde URL, en wel via
     Astro's navigate(). Astro's router (ClientRouter) luistert zelf naar
     popstate en laadt bij terug/vooruit naar dezelfde pagina alles opnieuw —
     een leeg formulier — tenzij het om een hash gaat; dan schuift hij alleen.
     Een eigen pushState zonder hash werd dus door Astro overschreven. */
  if (!eersteStapGetoond) {
    /* De eerste keer (bij het laden): een #stap-N uit een bladwijzer of na
       verversen hoort niet te blijven staan — het formulier begint bij 1. */
    eersteStapGetoond = true;
    try {
      if (/^#stap-\d+$/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
    } catch { /* geen geschiedenis: dan zoals voorheen */ }
  } else if (!(opts && opts.uitHistorie)) {
    const doel = `#stap-${to}`;
    if (location.hash !== doel && !(to === 1 && !location.hash)) {
      const naar = `${location.pathname}${location.search}${doel}`;
      try {
        if (astroNavigate) Promise.resolve(astroNavigate(naar, { state: { plStep: to } })).catch(() => {});
        else history.pushState({ ...(history.state || {}), plStep: to }, '', naar);
      } catch { /* geen geschiedenis: dan zoals voorheen */ }
    }
  }

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
  paintWkStap(to);

  /* ── DE LIFESTYLE-BALK HOORT BIJ STAP 2 ───────────────────────────────────
     Daar vult de klant zijn producten in, en dat is het moment waarop "en er
     ook lifestyle bij?" een vraag is die ergens over gaat: hij ziet net wat hij
     stuurt. Op stap 1 staat op een telefoon al de totaalbalk onderaan geplakt —
     twee balken op elkaar is één te veel — en vanaf stap 3 is hij aan het
     afrekenen; een aanbod is dan een onderbreking.

     `hidden` en niet alleen een klasse: de balk staat BUITEN de stappen (hij is
     `position: fixed`, en dat werkt niet binnen een stap op `display: none`),
     dus er is geen ouder die hem vanzelf wegneemt. */
  const combiBalk = q('[data-pl-combi-balk]');
  if (combiBalk) {
    /* Alleen met inhoud (19 september 2026): een lifestylepagina geeft het
       slot niet mee, en dan stond er op stap 2 een lege witte balk van 46 px
       met alleen een pijltje onderaan het scherm. */
    const combiIn = q('.pl-combi-in', combiBalk);
    const heeftCombi = !!(combiIn && combiIn.children.length);
    combiBalk.hidden = to !== 2 || !heeftCombi;
    /* Dichtklappen zodra je stap 2 verlaat: kom je terug, dan begin je weer bij
       de regel van één hoog in plaats van bij een aanbod dat je scherm vult. */
    if (to !== 2) {
      combiBalk.classList.remove('is-open');
      const binnen = q('.pl-combi-in', combiBalk);
      const knop = q('[data-pl-combi-schuif]', combiBalk);
      if (binnen) binnen.hidden = true;
      if (knop) knop.setAttribute('aria-expanded', 'false');
    }
  }

  syncVatConfirm();
  /* En de vorm van het btw-nummer, want het land kan al ingevuld zijn vanuit een
     account -- dan is er nooit een change-gebeurtenis geweest en zou het veld
     zonder pattern staan. */
  syncVatFormat();
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
    /* ── NIET MEER 'SMOOTH', EN PAS NA DE VOLGENDE TEKENBEURT — 19 sept 2026 ──
       Gemeten op de livesite: na "Verder" van stap 1 naar 2 werd scrollTo(641,
       smooth) netjes aangeroepen en stond de pagina daarna op 0 — en van stap
       2 naar 3 bleef hij op 2580 staan terwijl de nieuwe stap op 737 begon. De
       klant keek dan naar "NOG NIET KLAAR OM TE BESTELLEN?" onder het
       formulier. Een vloeiende scroll wordt door Chrome afgebroken zodra het
       document tijdens de animatie van hoogte verandert, en dat doet het hier
       altijd: de oude stap verdwijnt, de nieuwe verschijnt, de uploader tekent
       na. Dus: één tekenbeurt wachten tot de nieuwe hoogte staat, en dan in
       één keer springen. Een stapwissel is een paginawissel; daar hoort geen
       animatie bij die halverwege kan stoppen. */
    const spring = () => {
      const top = node.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(spring));
    else spring();
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
 * ── DE VERKLARING BIJ 0%: IN HET ZAKELIJK-VINKJE VAN DE LAATSTE STAP ──────────
 *
 * 8 oktober 2026 (8.06, V19 = a). Tot vandaag stond hier een apart, verplicht
 * vinkje in stap 3 ("ik verklaar dat mijn bedrijf buiten Nederland is
 * gevestigd …"). Dat is weg. Dezelfde verklaring staat nu als eerste zin IN het
 * verplichte zakelijk-vinkje van stap 5, ingevuld met het merk en het
 * btw-nummer dat de klant typte (verleggingZin() in src/data/business.js), en
 * het verborgen veld `vat_confirmed` legt vast dat het vinkje bij DIE tekst werd
 * gezet. Op de server is een door VIES bevestigd nummer plus dit vinkje 0%, en
 * zonder vinkje 21% (verleggingTelt() in src/data/vat.js).
 *
 * De voorwaarde is die van artikel 196: een ander EU-land dan Nederland, een
 * btw-nummer ingevuld, en niet "ik heb geen btw-nummer". Buiten de EU is er geen
 * verlegging — dat is "niet belastbaar in Nederland", een andere regel met een
 * andere factuurtekst — dus daar blijft de gewone zakelijke zin staan.
 *
 * DIT BELOOFT NIETS. Of het nummer klopt weet pas VIES, op de server bij
 * verzenden. Klopt het niet, dan is het tarief 21% en is de zin betekenisloos in
 * plaats van onwaar.
 */
function syncVatConfirm() {
  const zin = q('[data-pl-verlegd]');
  const veld = q('[data-pl-verlegd-veld]');
  if (!zin && !veld) return;
  const country = (q('select[name=country]') || {}).value || '';
  const vat = ((q('input[name=vat]') || {}).value || '').trim();
  const merk = ((q('input[name=brand]') || {}).value || '').trim();
  const noVat = !!(q('input[type="checkbox"][name="no_vat"]') || {}).checked;

  const up = country.trim().toUpperCase();
  const applies = !!up && up !== HOME_COUNTRY && isEu(up) && !!vat && !noVat;
  // Zonder merk of nummer is er geen zin, en dan ook geen verlegging: liever
  // 21% dan een vinkje bij een verklaring met een gat erin.
  const tekst = applies ? verleggingZin(cfg.lang, { merk, btw: vat }) : null;
  if (zin) {
    zin.textContent = tekst || '';
    zin.hidden = !tekst;
  }
  if (veld) veld.value = tekst ? 'yes' : '';
  syncRequired();
}

/*
 * ── DE VORM VAN HET BTW-NUMMER, ZODRA HET LAND BEKEND IS ─────────────────────
 *
 * 12 september 2026. Lucas kreeg een testbestelling binnen met `NL000` erin, en
 * die kwam er gewoon doorheen. Waarom dat fiscaal goed ging en administratief
 * niet staat in de kop van vatShape() in src/data/vat.js.
 *
 * Wat hier gebeurt is alleen het formulier: het `pattern`-attribuut wordt gezet
 * op de vorm die bij het GEKOZEN LAND hoort, en meeverhuisd zodra de klant een
 * ander land aanwijst. Vandaar dat dit script bestaat en er geen vast
 * `pattern=""` in de HTML staat: één attribuut kan niet zevenentwintig vormen
 * tegelijk zijn, en de vorm van een Duits nummer op een Nederlandse bestelling
 * zou precies de valse afkeuring opleveren die een klant wegjaagt.
 *
 * DE MELDING VERHUIST MEE. `data-pl-err-msg` op het veld zegt nu nog "vul een
 * btw-nummer in" — dat is het juiste antwoord op een leeg veld, en het verkeerde
 * op een verkeerd ingevuld veld. Staat er iets én klopt de vorm niet, dan zegt
 * de melding wat de vorm voor dít land is, met een voorbeeld. Die twee zinnen
 * staan allebei in vat.js, zodat de server dezelfde kan teruggeven.
 *
 * EN DIT IS NIET DE CONTROLE. Het is de eerste. De echte staat in
 * functions/api/order.js, want een formulier is niet de waarheid — wie langs het
 * formulier heen post krijgt daar hetzelfde antwoord.
 */
function syncVatFormat() {
  const veld = q('input[name=vat]');
  if (!veld) return;
  const land = ((q('select[name=country]') || {}).value || '').trim().toUpperCase();
  const vorm = vatShape(land);

  if (!vorm) {
    /* Geen vorm bekend — buiten de EU, of nog geen land gekozen. Dan niets
       afdwingen: een `pattern` dat blijft staan van het vorige land is erger
       dan geen pattern, want hij keurt een goed nummer af. */
    veld.removeAttribute('pattern');
    delete veld.dataset.plVormFout;
    if (veld.dataset.plErrMsgLeeg) veld.dataset.plErrMsg = veld.dataset.plErrMsgLeeg;
    return;
  }

  veld.setAttribute('pattern', vorm.pattern);

  /* De oorspronkelijke melding één keer bewaren, want hij wordt hieronder
     overschreven en moet terug kunnen komen zodra het veld weer leeg is. */
  if (!veld.dataset.plErrMsgLeeg) veld.dataset.plErrMsgLeeg = veld.dataset.plErrMsg || '';

  const ingevuld = (veld.value || '').trim();
  veld.dataset.plErrMsg = ingevuld
    ? vatFormatError(land, document.documentElement.lang === 'nl' ? 'nl' : 'en')
    : (veld.dataset.plErrMsgLeeg || '');
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
  const veld = q('input[name=reg_number]');
  const btw = q('input[name=vat]');
  const noVatBox = q('input[type="checkbox"][name="no_vat"]');
  const land = String((q('select[name="country"]') || {}).value || '').trim().toUpperCase();

  /* ── PER LAND — 29 september 2026 ──────────────────────────────────────────
     Zie de noot bij [data-pl-vatveld] in OrderFlow.astro.
       nl     KVK-nummer verplicht, btw-nummer optioneel, geen vinkje nodig.
       eu     zoals het was: btw-nummer, of "geen btw-nummer" + registratienummer.
       other  geen btw-veld; registratienummer optioneel.
       ''     nog geen land: zoals het was, niets verbergen. */
  const soort = !land ? '' : land === HOME_COUNTRY ? 'nl' : isEu(land) ? 'eu' : 'other';

  const vatVeld = q('[data-pl-vatveld]');
  if (vatVeld) vatVeld.hidden = soort === 'other';
  const noVatRij = q('[data-pl-novat]');
  if (noVatRij) noVatRij.hidden = soort === 'nl' || soort === 'other';
  if (noVatBox && (soort === 'nl' || soort === 'other')) noVatBox.checked = false;
  if (btw) {
    /* Btw verplicht alleen in een ander EU-land; in NL mag hij erbij, buiten de
       EU bestaat hij niet en gaat een oude waarde niet mee naar de server. */
    btw.dataset.plReq = (soort === 'eu' || soort === '') ? '1' : '0';
    if (soort === 'other') btw.value = '';
    const req = q('[data-pl-vat-req]');
    const opt = q('[data-pl-vat-opt]');
    if (req) req.hidden = btw.dataset.plReq !== '1';
    if (opt) opt.hidden = btw.dataset.plReq === '1';
  }

  /* O16 (ronde 9): de EU-zin in stap 5 alleen bij een ander EU-land (of nog geen land). */
  const naEu = q('[data-pl-after-eu]');
  if (naEu) naEu.hidden = soort === 'nl' || soort === 'other';

  const noVat = !!(noVatBox && noVatBox.checked);
  const toon = soort === 'nl' || soort === 'other' || noVat;
  block.hidden = !toon;
  if (!toon && veld) veld.value = '';

  const nl = soort === 'nl';
  const label = q('[data-pl-reg-label]', block);
  if (label) label.textContent = nl ? label.dataset.kvk : label.dataset.reg;
  const hint = q('[data-pl-reg-hint]', block);
  if (hint) hint.textContent = (nl ? hint.dataset.nl : soort === 'other' ? hint.dataset.other : hint.dataset.eu) || hint.textContent;
  if (veld) {
    /* Verplicht in NL (altijd) en in de EU (als er geen btw-nummer is); buiten
       de EU nooit. `plReqWhen` hangt het in de EU aan het vinkje. */
    veld.dataset.plReq = soort === 'other' ? '0' : '1';
    if (nl) delete veld.dataset.plReqWhen; else veld.dataset.plReqWhen = 'no_vat';
    if (soort === 'other') delete veld.dataset.plReqWhen;
    const rq = q('[data-pl-reg-req]', block);
    const op = q('[data-pl-reg-opt]', block);
    if (rq) rq.hidden = soort === 'other';
    if (op) op.hidden = soort !== 'other';
    if (nl) { veld.setAttribute('pattern', '[\\s.]*(\\d[\\s.]*){8}'); veld.setAttribute('inputmode', 'numeric'); }
    else { veld.removeAttribute('pattern'); veld.removeAttribute('inputmode'); }
    veld.dataset.plErrMsg = nl ? (veld.dataset.errKvk || veld.dataset.plErrMsg) : (veld.dataset.errReg || veld.dataset.plErrMsg);
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
    if (n === 'country' || n === 'vat' || n === 'no_vat' || n === 'brand') syncVatConfirm();
    // De vorm hangt aan het land en de melding aan wat er staat, dus beide.
    if (n === 'country' || n === 'vat') syncVatFormat();
    // Het registratienummer hangt alleen aan het vinkje, niet aan het land: de
    // eis is "geen btw-nummer, dus iets anders", en die geldt overal.
    if (n === 'no_vat' || n === 'country') syncReg();
    /* B05 (doorloop 27): VIES al in stap 3. Op `change` (het veld verlaten), niet
       bij elke toets: één vraag per nummer, niet tien. */
    if (e.type === 'change' && (n === 'country' || n === 'vat' || n === 'no_vat')) syncVies();
    if (e.type === 'input' && n === 'vat') verbergVies();
  };
  form.addEventListener('input', watch);
  form.addEventListener('change', watch);
  const zonder = q('[data-pl-vies-zonder]');
  if (zonder) {
    zonder.addEventListener('click', () => {
      const box = q('input[name="no_vat"]');
      const veld = q('input[name="vat"]');
      if (veld) { veld.value = ''; veld.dispatchEvent(new Event('input', { bubbles: true })); }
      if (box && !box.checked) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
      verbergVies();
    });
  }
}

/* ── WAT VIES ZEGT, AL IN STAP 3 — 15 oktober 2026 (doorloop 27, B05) ────────
   Een EU-btw-nummer dat VIES niet kent, werd pas na het bestellen opgemerkt:
   "we kijken je gegevens na" en geen betaallink. Nu vraagt het formulier het
   zodra het veld verlaten wordt en de vorm klopt (functions/api/btw.js), en
   zegt het meteen wat er aan de hand is, met de uitweg "zonder btw-nummer".
   Geen antwoord (storing, grens, Nederland, buiten de EU): niets tonen. De
   beslissing blijft bij het bestellen, op de server. */
let viesVraag = 0;
function verbergVies() {
  const p = q('[data-pl-vies]');
  if (!p) return;
  p.hidden = true;
  p.classList.remove('is-ongeldig', 'is-geldig');
}
async function syncVies() {
  const p = q('[data-pl-vies]');
  const veld = q('input[name="vat"]');
  if (!p || !veld) return;
  const land = ((q('select[name=country]') || {}).value || '').trim().toUpperCase();
  const nummer = (veld.value || '').trim();
  const box = q('input[name="no_vat"]');
  const vorm = vatShape(land);
  verbergVies();
  if (!nummer || (box && box.checked) || !vorm || land === 'NL' || !new RegExp(`^(?:${vorm.pattern})$`).test(nummer)) return;
  const deze = ++viesVraag;
  let stand = 'onbekend';
  try {
    const r = await fetch('/api/btw', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ land, nummer }), credentials: 'same-origin' });
    if (r.ok) stand = String((await r.json())?.stand || 'onbekend');
  } catch { stand = 'onbekend'; }
  /* Een later antwoord voor een ouder nummer telt niet. */
  if (deze !== viesVraag || (veld.value || '').trim() !== nummer) return;
  if (stand !== 'geldig' && stand !== 'ongeldig') return;
  const tekst = q('[data-pl-vies-tekst]', p);
  if (tekst) tekst.textContent = stand === 'geldig' ? (p.dataset.geldig || '') : (p.dataset.ongeldig || '');
  const knop = q('[data-pl-vies-zonder]', p);
  if (knop) knop.hidden = stand !== 'ongeldig';
  p.classList.add(stand === 'geldig' ? 'is-geldig' : 'is-ongeldig');
  p.hidden = false;
}

/* ── AL EEN PROEF? AL IN STAP 3 — 15 oktober 2026 (doorloop 27, B41) ─────────
   Wie al een betaalde €1-proef had, hoorde dat pas na alle stappen en de
   foto's. Bij het verlaten van de stap met het e-mailadres vraagt het formulier
   het nu (functions/api/proef-check.js, dezelfde vergelijking als bij het
   versturen). Ja → de melding in deze stap, en niet verder. Geen antwoord →
   gewoon door; het versturen beslist. */
async function proefAlGehad() {
  if (geposteDienst() !== 'test-sample') return false;
  const stap = q(`[data-pl-step="${current}"]`);
  const blok = stap && q('[data-pl-proef-al]', stap);
  if (!blok || !q('input[name="email"]', stap)) return false;
  const waarde = (naam) => ((q(`[name="${naam}"]`) || {}).value || '').trim();
  try {
    const r = await fetch('/api/proef-check', {
      method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ email: waarde('email'), phone: waarde('phone'), reg_number: waarde('reg_number') }),
    });
    const al = r.ok && !!(await r.json())?.al;
    blok.hidden = !al;
    if (al) { try { blok.focus({ preventScroll: false }); } catch { blok.scrollIntoView({ block: 'center' }); } }
    return al;
  } catch {
    blok.hidden = true;
    return false;
  }
}

function bindNav() {
  qa('[data-pl-next]').forEach((b) => {
    b.type = 'button';
    b.addEventListener('click', async () => {
      if (!validateStep(current)) return;
      /* Stap 2 is geen poort, maar wel een vraag — zie askMissing(). */
      if (current === 2 && !askMissing()) return;
      /* B41: al een proef op dit adres? Dan hier stoppen, niet na de foto's. */
      if (b.dataset.plBezig === '1') return;
      b.dataset.plBezig = '1';
      const al = await proefAlGehad().finally(() => { delete b.dataset.plBezig; });
      if (al) return;
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
  /* Terug en vooruit van de browser (zie show()). Vooruit mag alleen langs
     stappen die nu nog kloppen — dezelfde toets als Verder; anders blijft de
     klant staan op de stap die iets mist. */
  /* Alleen zolang dít formulier in het document staat: terug naar deze pagina
     vanaf een ándere pagina blijft van Astro. Astro's eigen popstate-luisteraar
     draait eerst, maar doet bij een #stap-hash niets anders dan schuiven. */
  window.addEventListener('popstate', () => {
    if (!document.contains(form)) return;
    const m = /^#stap-(\d+)$/.exec(location.hash);
    const n = m ? Number(m[1]) : 1;
    if (n === current) return;
    if (n > current) {
      for (let i = current; i < n; i += 1) {
        if (GATE_STEP !== null && i === GATE_STEP && !needsGate()) continue;
        if (!validateStep(i)) {
          show(i, { uitHistorie: true });
          try { history.replaceState(history.state, '', `${location.pathname}${location.search}${i > 1 ? `#stap-${i}` : ''}`); } catch { /* zie show() */ }
          return;
        }
      }
    }
    show(n, { uitHistorie: true });
    if (GATE_STEP !== null && n === GATE_STEP) runGate();
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
  paintWkStap(current);
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
  const inBak = tray.length;
  if ((!short.length && !inBak) || missingOk) { box.hidden = true; return true; }
  const n = short.length;

  /* ── ÉÉN LIJST, UIT DE GEDEELDE BRON — 11 oktober 2026 (F3, 2.05) ─────────
     Hier stond een raster van tegels per product. Nu één lijst, en de regels
     komen uit src/lib/ontbreekt.js — dezelfde functie die Studio, de betaalmail,
     de studiomail en /admin gebruiken, zodat "geen achterkant" hier hetzelfde
     zegt als daar. ontbrekendeFotos() kent alleen de vaste verplichte vakken;
     staat er nog geen enkele foto, dan geeft hij `null` (onbekend) en tonen we
     geen lijst — nooit "alles compleet". Wat in de bak ligt, telt niet mee:
     dat gaat niet met de bestelling mee (zie de regel daaronder). */
  const files = [];
  const details = {};
  cards.forEach((card) => {
    const naam = card.input ? card.input.value.trim() : '';
    if (naam) details[`product_${card.key}`] = naam;
    Object.keys(card.slots).forEach((id) => {
      if (slotFilled(card, id)) files.push({ kind: 'upload', product_key: card.key, shot: id });
    });
  });
  /* De bijbestelde hoeken (k-hoeken, 12 oktober 2026): dezelfde velden als de
     bestelling meestuurt (extra_slots, angle_<id>, angle_note_<id>), zodat
     ontbreekt.js ze hier net zo telt als in Studio, de mails en /admin. */
  const vakkenNu = hoekVakken();
  if (vakkenNu.length) {
    details.extra_slots = vakkenNu.map((v) => `${v.id}:${v.hoek}`).join(',');
    vakkenNu.forEach((v) => {
      details[`angle_${v.hoek}`] = '1';
      if (isEigenAngleId(v.hoek) && v.naam) details[`angle_note_${v.hoek}`] = v.naam;
    });
  }
  const lijst = ontbrekendeFotos({ productCount: cards.length, details, files });
  const regels = ontbrekendRegels(lijst, cfg.lang === 'nl' ? 'nl' : 'en');

  const h = q('[data-pl-missing-h]', box);
  if (h) {
    h.textContent = !files.length && n ? c('pu.missingNone')
      : !n ? c('pu.trayH')
      : n === 1 ? c('pu.missingHOne') : c('pu.missingH', { n });
  }
  /* De bak telt mee (ronde 9, F27): wat daar ligt, gaat niet mee. */
  let bakRegel = q('[data-pl-missing-tray]', box);
  const list = q('[data-pl-missing-list]', box);
  if (!bakRegel) {
    bakRegel = document.createElement('p');
    bakRegel.className = 'pu-mis-bak';
    bakRegel.dataset.plMissingTray = '';
    if (list) list.after(bakRegel); else box.appendChild(bakRegel);
  }
  bakRegel.hidden = !inBak;
  bakRegel.textContent = inBak ? c('pu.trayNotSent', { n: inBak }) : '';

  if (list) {
    list.textContent = '';
    const regel = (tekst, card) => {
      const li = document.createElement('li');
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'pu-mis-regel';
      knop.textContent = tekst;
      /* Eén klik naar dát product, met de melding weg. */
      knop.addEventListener('click', () => { box.hidden = true; naarProduct(card); });
      li.appendChild(knop);
      list.appendChild(li);
    };
    /* Sinds 12 oktober 2026 kent ontbreekt.js ook de bijbestelde hoeken; de
       eigen regel die hier daarvoor stond, is weg. */
    (lijst || []).forEach((p, i) => {
      const card = cards.find((k) => k.key === p.key);
      if (card && regels[i]) regel(regels[i], card);
    });
  }
  box.hidden = false;
  if (box.tabIndex < 0) box.tabIndex = -1;
  try { box.focus({ preventScroll: true }); } catch { /* nice-to-have */ }
  const top = box.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
  return false;
}

/**
 * Naar één product toe: in beeld brengen, blik erin. Twee knoppen komen hier
 * uit — "Nu toevoegen" (naar het eerste gat) en een regel in de lijst (naar dát
 * product). Sinds 11 oktober 2026 staan alle kaarten open, dus dit is altijd
 * dezelfde sprong als die van de balk (naarKaart).
 */
function naarProduct(card) {
  if (!card) return;
  const i = cards.indexOf(card);
  if (i >= 0) naarKaart(i);
}

function bindMissing() {
  const box = q('[data-pl-missing]');
  if (!box) return;
  const fix = q('[data-pl-missing-fix]', box);
  const go = q('[data-pl-missing-go]', box);
  if (fix) fix.addEventListener('click', () => {
    box.hidden = true;
    const first = cards.find((card) => !cardReady(card));
    if (first) naarProduct(first);
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
  /* ── DE FOUT STAAT BIJ HET VELD, EN HET VELD KOMT IN BEELD — 19 sep 2026 ──
     Uit de doorlichting: "Kies wie het draagt" stond onderaan stap 2, twee
     duizend pixels onder de modeltegels waar de keuze ontbrak. De stapfout
     onderaan blijft (die hoort bij de knop die je net indrukte), maar dezelfde
     zin staat nu ook bij het veld zelf, en het veld wordt in beeld gescrold.
     reportValidity() alleen als de browser het veld kán tonen: een radio die
     visueel verborgen is (de lookkaarten) krijgt geen bubbel maar de regel
     bij het veld. */
  const anker = bad.closest('fieldset, .field, .pl-veld, [data-pl-veldgroep]') || bad.closest('label') || bad;
  markeerVeld(anker, bad.dataset.plErrMsg || c('err.generic'));
  const kop = anker.querySelector('legend, h2, h3, .pl-veld-fout') || anker;
  try { kop.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch { /* ok */ }
  const zichtbaar = bad.getClientRects().length > 0 && getComputedStyle(bad).opacity !== '0';
  if (zichtbaar) bad.reportValidity();
  else { try { bad.focus({ preventScroll: true }); } catch { /* ok */ } }
  return false;
}

/** Eén regel met de fout, direct onder de kop van het veld of de groep. */
function markeerVeld(anker, tekst) {
  if (!anker) return;
  let noot = anker.querySelector(':scope > .pl-veld-fout');
  if (!noot) {
    noot = document.createElement('p');
    noot.className = 'pl-veld-fout';
    const kop = anker.querySelector(':scope > legend, :scope > h2, :scope > h3, :scope > .pl-veld-kop, :scope > label.pl-veld-label');
    if (kop && kop.nextSibling) anker.insertBefore(noot, kop.nextSibling);
    else if (kop) anker.appendChild(noot);
    else anker.insertBefore(noot, anker.firstChild);
  }
  noot.textContent = tekst;
  noot.hidden = false;
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
  qa('.pl-veld-fout', node).forEach((el) => el.remove());
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
  /* Voorrang — 9 september 2026. Eén vinkje, en het bedrag eronder beweegt mee
     met het aantal producten; syncTotal() doet allebei via syncVoorrang(). */
  const vrng = q('input[name="voorrang"]');
  if (vrng) vrng.addEventListener('change', syncTotal);
  /* ── DE LOOKKEUZE RAAKT HET BEDRAG — 17 september 2026 ────────────────────
     Sinds vandaag telt het lopende totaal de toeslag van een eigen stijl mee
     (zie stijlToeslagNu()), en dan moet het ook opnieuw gerekend worden als die
     keuze verandert — óók bij het wisselen NAAR een huisstijl, want dan valt de
     toeslag weg.

     Gedelegeerd op het formulier en niet per radio: de eigen-stijltegels worden
     pas na /account/me gemaakt, dus een lus over wat er nu staat zou ze missen.
     Dezelfde reden als waarom de tegels uit een <template> worden gekloond. */
  if (form) {
    form.addEventListener('change', (e) => {
      const el = e.target;
      if (el && el.name === 'style') syncTotal();
    });
  }
  bindBackground();
  // AFTER bindBackground, and the order matters: bindChannels() ends by running
  // the lock, which reaches into the background radios that bindBackground has
  // just finished binding. Bound first, constrained second.
  bindChannels();
  bindModel();
  /* "Bestel met dezelfde look" (punt 3.07): achtergrond, verhouding en gezicht
     uit de link, ná het binden zodat de change-events hun werk doen. */
  applyLookUitUrl();
  /* De hoeken — 9 september 2026. Ná bindModel omdat paintAngles() het lopende
     totaal aanraakt en dat pas klopt als de rest van stap 1 gebonden is. */
  bindAngles();
  // De omschakeling tussen per-product en map. Na de rest, want show() roept
  // syncRequired() en refreshUploader() aan en die willen dat de kaarten en de
  // achtergrond al gebonden zijn.
  bindUploadMode();
  /* Hier stond bindTips(): het tippaneel naast stap 2 is op 11 oktober 2026
     weggehaald (F3) — het vocht met de uitleg per vak om dezelfde aandacht. */
  bindVouwAnker();
  bindCombiBalk();
}

/*
 * ── DE LIFESTYLE-BALK ONDERAAN ──────────────────────────────────────────────
 *
 * Lucas: *"Ik wil de lifestyle als banner pop up onderaan het scherm krijgen die
 * de klant tijdens product invullen kan inklappen en uitklappen."*
 *
 * Twee dingen, en verder niets: de knop klapt hem open en dicht, en de balk
 * bestaat alleen zolang stap 2 in beeld staat. Dat tweede doet showStep() (zie
 * daar); dit bindt alleen de knop.
 *
 * DICHT BIJ HET OPENEN. De balk ligt over het scherm waar de klant werkt, en
 * open beginnen zou een aanbod over zijn taak heen leggen op het moment dat hij
 * zijn eerste foto sleept. Dicht is hij één regel met de vraag en de twee
 * bedragen — dat verkoopt nog steeds en het kost geen ruimte.
 */
function bindCombiBalk() {
  const balk = q('[data-pl-combi-balk]');
  if (!balk) return;
  const knop = q('[data-pl-combi-schuif]', balk);
  const binnen = q('.pl-combi-in', balk);
  if (!knop || !binnen) return;
  knop.addEventListener('click', () => {
    const open = !balk.classList.contains('is-open');
    balk.classList.toggle('is-open', open);
    binnen.hidden = !open;
    knop.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * EEN UITKLAPPER DIE OPENGAAT, BLIJFT WAAR HIJ STOND
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 17 september 2026: *"image shape is weg."*
 *
 * Hij was niet weg en hij ging ook gewoon open — gemeten: één klik, `open=true`,
 * 431 pixels hoog, de vijf keuzes erin. Wat er gebeurde is dit:
 *
 *     beeldvorm stond op y = 471
 *     na de klik      y = -43
 *     VERSPRONGEN     : 514 pixels, het scherm uit, naar boven
 *
 * De vouwen in stap 1 delen een `name` en zijn daarmee een NATIEVE exclusieve
 * accordeon: de browser sluit de andere zodra je er één opent. Dat is precies
 * wat we wilden — één kiezer tegelijk, nul regels script. Maar de vouw die
 * dichtgaat, staat vaak BOVEN de vouw die je aanklikt, en "Een hoek erbij" is
 * 504 pixels hoog. Die hoogte valt onder je weg, dus de rij die je net aanraakte
 * schuift het beeld uit — en wat je overhoudt is een scherm waarop het ding dat
 * je zocht er niet meer is.
 *
 * ── WAAROM NIET GEWOON DE ACCORDEON WEGHALEN ────────────────────────────────
 *
 * Omdat die het drukke scherm juist oplost: stap 1 heeft twaalf uitklappers, en
 * alles tegelijk open is de muur waar de accordeon voor gebouwd is. Het
 * probleem is niet dat er iets dichtgaat, het is dat de PAGINA eronder
 * verschuift. Dus blijft de accordeon en corrigeren we de sprong.
 *
 * ── HOE ─────────────────────────────────────────────────────────────────────
 *
 * Vóór de klik onthouden waar de aangeklikte rij stond; na afloop de pagina
 * evenveel meeschuiven. De rij staat dan op dezelfde plek op je scherm als
 * waar je hem aanraakte, en wat eronder verschijnt, verschijnt eronder.
 *
 * `requestAnimationFrame` en geen timeout: de browser heeft de andere vouw dan
 * al gesloten en de nieuwe hoogte al berekend, en het scheelt de flikkering van
 * een correctie die een frame te laat komt.
 *
 * GEEN GLAD SCROLLEN. Dit is geen verplaatsing die je moet kunnen volgen — het
 * is het ONGEDAAN MAKEN van een verplaatsing die niet had moeten gebeuren. Een
 * animatie zou er een beweging van maken waar er geen hoort te zijn.
 */
/**
 * De hoekvakken op de kaarten gelijktrekken met wat er in stap 1 gekozen is.
 *
 * Draait bij elke verandering van de vinkjes én bij het bouwen van een kaart.
 * Met één kaart als argument doet hij alleen die kaart; zonder argument alle.
 *
 * ── WAT ER MET EEN FOTO GEBEURT DIE ERAF VALT ───────────────────────────────
 *
 * Naar de bak onderaan, niet naar de prullenbak — dezelfde regel als bij
 * dropCard(): de klant beantwoordde een vraag over zijn BESTELLING ("deze hoek
 * toch niet"), geen vraag over die foto. Vinkt hij de hoek weer aan, dan staat
 * de foto onderaan klaar om terug te slepen.
 */
function syncHoekVakken(alleen) {
  const vakken = hoekVakken();
  const wil = vakken.map((v) => v.id);
  const lijst = alleen ? [alleen] : cards;

  lijst.forEach((card) => {
    if (!card.slotsEl) return;

    /* WEG wat er niet meer bij hoort. Alleen extra-vakken bekijken: de vier
       vaste hoeken en de gratis referentievakken staan hier buiten. */
    Object.keys(card.slots).forEach((id) => {
      if (!extraSlotNumber(id) || wil.includes(id)) return;
      const sl = card.slots[id];
      if (sl.file && sl.status !== 'failed' && isEchtBestand(sl.file)) trayAdd(sl.file);
      clearSlot(card, id);
      if (sl.el && sl.el.wrap) sl.el.wrap.remove();
      delete card.slots[id];
    });

    /* ERBIJ wat er nog niet is, en op volgorde achter de vaste vier. */
    vakken.forEach((v) => {
      if (card.slots[v.id] && card.slots[v.id].el) return;
      if (!card.slots[v.id]) card.slots[v.id] = EMPTY_SLOT();
      card.slotsEl.appendChild(buildSlot(card, v.id));
      paintSlot(card, v.id);
    });

    /* De namen kunnen veranderd zijn zonder dat het vak dat is — een hoek die
       vrijkomt en waar een andere hoek het nummer van overneemt. Hertekenen, of
       er staat "Driekwart" boven het vak van "Van achteren". */
    vakken.forEach((v) => {
      const sl = card.slots[v.id];
      if (sl && sl.el && sl.el.nameEl) sl.el.nameEl.textContent = shotLabel(v.id);
    });
  });

  schrijfHoekKoppeling(vakken);
  renderTray();
}

/**
 * De koppeling vak → hoek, als één verborgen veld bij de bestelling.
 *
 * `extra1:three_quarter,extra2:flat_lay`. Zonder dit is een bestand dat als
 * `extra2` binnenkomt een foto zonder opdracht, en dan is precies het gokwerk
 * terug waar het uploadvak voor bestaat.
 *
 * Het veld wordt hier gemaakt en niet in de markup: het bestaat alleen zodra er
 * een hoek gekozen is, en een leeg veld dat altijd meeposten zou een lege sleutel
 * in details_json zetten bij elke bestelling zonder extra's.
 */
function schrijfHoekKoppeling(vakken) {
  /* `form` is de module-variabele en IS het formulier. Niet `q('[data-pipeline]')`:
     q() zoekt standaard BINNEN het formulier, en een element vindt zichzelf niet
     met zijn eigen querySelector. Dat kostte hier één stille ronde waarin de
     koppeling nooit werd geschreven. */
  if (!form) return;
  let veld = q('input[name="extra_slots"]');
  if (!vakken.length) {
    if (veld) veld.remove();
    return;
  }
  if (!veld) {
    veld = document.createElement('input');
    veld.type = 'hidden';
    veld.name = 'extra_slots';
    form.appendChild(veld);
  }
  veld.value = vakken.map((v) => `${v.id}:${v.hoek}`).join(',');
}

function bindVouwAnker() {
  /* De module-variabele `form` is het formulier zelf; valt terug op het
     document zolang dat er nog niet is. */
  const waar = form || document;
  waar.addEventListener('click', (e) => {
    const sum = e.target && e.target.closest ? e.target.closest('summary.dc-sum') : null;
    if (!sum) return;
    const vouw = sum.parentElement;
    /* Alleen bij OPENGAAN. Een vouw die dichtgaat neemt zijn eigen hoogte weg
       en dat is hoogte ONDER de rij: die verschuift niets aan wat erboven staat,
       dus daar is niets recht te zetten. */
    if (!vouw || vouw.open) return;
    const voor = sum.getBoundingClientRect().top;
    requestAnimationFrame(() => {
      const na = sum.getBoundingClientRect().top;
      const verschil = na - voor;
      if (Math.abs(verschil) < 2) return;
      window.scrollBy({ top: verschil, left: 0, behavior: 'auto' });
    });
  });
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
  /* ── HET VELD VOLGT DE KEUZELIJST — 17 oktober 2026 (levering 60) ──────────
     "Nog een product toevoegen" en "Schoenen toevoegen" in stap 2 zetten de
     keuzelijst (die post) en niet dit veld; wie dan terug naar stap 1 ging, zag
     het oude aantal staan naast een totaal voor één product meer. */
  select.addEventListener('change', () => {
    const n = Number.parseInt(select.value, 10);
    if (Number.isInteger(n) && input.value !== String(n)) input.value = String(n);
    paint();
  });
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
  /* In de werkplaats (levering 59) staat het aantal in een blok (WkBlok.astro): dan is
     dat blok het ankerpunt, en gaan de blokken erna dicht. */
  const anker = qty.closest('[data-wk-blok]') || qty;
  form.classList.toggle('is-meer', !!on);
  Array.from(step.children).forEach((ch) => {
    if (ch === anker) { after = true; return; }
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
/* ── ÉÉN HAAK, ALLE PLEKKEN — 12 september 2026 ──────────────────────────────
 * Dit schreef naar de EERSTE treffer. Dat klopte zolang elke haak één keer in de
 * pagina stond: de samenvatting op stap 5 en verder niets.
 *
 * Sinds vandaag staat er een meelopend overzicht naast het formulier (richting
 * B, BestelOverzicht.astro) dat dezelfde antwoorden toont zodra ze gegeven zijn
 * — dus staan `data-pl-total` en de `data-pl-sum-*`-haken nu op twee plekken.
 * Met querySelector() zou de tweede stilletjes leeg blijven: geen foutmelding,
 * geen kapotte pagina, alleen een overzicht dat niet meeloopt. Precies het soort
 * gebrek dat pas opvalt als een klant erover mailt.
 *
 * `qa` in plaats van `q`, en verder verandert er niets: dit zijn schrijvers naar
 * het scherm, dus naar alle plekken schrijven is nooit minder juist dan naar
 * één. `dcDefault` wordt per element bewaard, dus elk element houdt zijn eigen
 * terugvaltekst. */
function setSummary(attr, text) {
  for (const el of qa(`[${attr}]`)) {
    if (el.dataset.dcDefault === undefined) el.dataset.dcDefault = el.textContent.trim();
    el.textContent = text || el.dataset.dcDefault;
  }
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
  /* Werklijst 27: een beeld met een eigen achtergrond staat erachter
     ("Wit · #FFFFFF · Op model: beige"). */
  const perBeeld = syncBeeldBg();
  setSummary('data-pl-sum-bg', bgText && perBeeld ? `${bgText} · ${perBeeld}` : bgText);

  // Model — the chosen face, or nothing, which restores "we choose one".
  const mp = q('input[name="model"]:checked');
  let modelText = '';
  if (mp && mp.value !== 'any') {
    const name = mp.closest('.mp-opt')?.querySelector('.mp-name');
    modelText = name ? name.textContent.trim() : mp.value;
  } else if (mp && !mp.matches(':disabled')) {
    /* Doorloop 27 (B38): "wij kiezen er een" is een echt antwoord (zie de
       samenvatting in stap 5), geen leeg veld — het overzicht zei "Gezicht —". */
    modelText = c('sum.modelKort');
  }
  setSummary('data-pl-sum-model', modelText);
  wkKleurPaint();
  wkLookPaint();
}

/* ═══ DE WERKPLAATS — levering 59, 17 oktober 2026 (afvinklijst 36 B) ═══════════════════
 *
 * OrderFlow.astro (catalog en lifestyle, niet de proef) zet `cfg.werk`. Wat hier gebeurt:
 *   · paintWkStap: de knoppen Verder (rechts en onderaan) per stap, weg op de laatste, en
 *     "1 van 4" bij de stap in de balk op de telefoon;
 *   · wkOverzicht: de trede in de prijstrap, de zin bij Levering, en de regels van "Wat je
 *     krijgt" (producten × tarief, voorrang, de beelden onderaan, de prijs van een hoek);
 *   · bindWkKleur: het vierkantje per hoek en het paneel met de kleuren (b-kleur);
 *   · bindWkVorm, bindWkHoeken, bindWkHulp: de vorm, "Een hoek erbij", "Hulp nodig?".
 *
 * GEEN EIGEN VELDEN. Alles schrijft in de velden die er al waren: de achtergrond van de
 * bestelling (input[name=background], background_custom), de achtergrond per beeld
 * (beeld_bg_<id>, beeld_hex_<id>), de vorm (input[name=ratio]) en de hoeken (angle_<id>).
 * De server, de concepten en de samenvatting op stap 5 merken dus niets van de nieuwe
 * knoppen. De achtergrond van de bestelling is die van de voorkant; een ander beeld met een
 * andere kleur krijgt die als eigen achtergrond (zie wkZetKleur). */
function werkAan() {
  return !!(cfg && cfg.werk);
}

function paintWkStap(to) {
  if (!werkAan()) return;
  const stap = Number(to) || current;
  const items = qa('[data-pl-rail-item]').filter((b) => {
    const li = b.closest('li');
    return !(li && li.hidden);
  });
  const van = String(cfg.werk.van || '{i}/{n}');
  items.forEach((b, i) => {
    b.dataset.wkVan = ` · ${van.replace('{i}', String(i + 1)).replace('{n}', String(items.length))}`;
  });
  let volgende = stap + 1;
  if (GATE_STEP !== null && volgende === GATE_STEP && !needsGate()) volgende += 1;
  const teksten = Array.isArray(cfg.werk.verder) ? cfg.werk.verder : [];
  let tekst = '';
  if (volgende === 2) tekst = teksten[0];
  else if (volgende === 3) tekst = teksten[1];
  else if (GATE_STEP !== null && volgende === GATE_STEP) tekst = teksten[2];
  else if (volgende === STEPS) tekst = teksten[3];
  qa('[data-wk-verder]').forEach((b) => {
    b.hidden = stap >= STEPS;
    const t = q('[data-wk-verder-t]', b);
    if (t && tekst) t.textContent = tekst;
  });
}

function wkOverzicht(kind, n, quote, voorrang) {
  if (!werkAan()) return;
  const geldig = Number.isInteger(n) && n > 0;
  qa('[data-wk-trap] li[data-wk-van]').forEach((li) => {
    const lo = Number(li.dataset.wkVan);
    const hi = Number(li.dataset.wkTot);
    const laatste = li === li.parentElement.lastElementChild;
    li.classList.toggle('is-nu', geldig && n >= lo && (n <= hi || laatste));
  });
  const lever = q('[data-wk-lever]');
  if (lever) {
    const t = q('[data-wk-lever-t]', lever);
    const boven = geldig && n >= Number(lever.dataset.wkDrempel || 10);
    if (t) t.textContent = (boven ? lever.dataset.wkBoven : lever.dataset.wkOnder) || t.textContent;
  }
  const rate = kind && geldig ? rateFor(kind, n) : null;
  qa('[data-wk-sum-producten]').forEach((el) => {
    el.textContent = rate !== null && rate !== undefined ? `${n} × ${euro(rate)}` : '—';
  });
  const blok = q('[data-pl-voorrang]');
  const rij = q('[data-wk-rij-voorrang]');
  if (rij) rij.hidden = !blok || blok.hidden;
  qa('[data-wk-sum-voorrang]').forEach((el) => {
    el.textContent = voorrang !== null && voorrang !== undefined ? euro(voorrang) : String(cfg.werk.nee || '—');
  });
  const beelden = geldig ? beeldenPerProductNu() * n + lookBeeldenNu() : 0;
  wkLooksPaint(geldig);
  qa('[data-wk-onder-zin]').forEach((el) => {
    el.textContent = beelden > 0
      ? `${String(cfg.werk.beelden || '{n}').replace('{n}', String(beelden))} · ${cfg.werk.excl || ''}`
      : String(cfg.werk.excl || '');
  });
  const hp = q('[data-wk-hoek-prijs]');
  if (hp && geldig) {
    if (hp.dataset.wkLeeg === undefined) hp.dataset.wkLeeg = hp.textContent;
    hp.textContent = String(cfg.werk.hoekPer || '{prijs}').replace('{prijs}', euro(extraRateNow()));
  }
}

/* De looks in "Wat je krijgt" (levering 60, c-look): een regel per look boven de
   rijen, en de rij "Complete looks n × €50". Zonder looks staat er niets. */
function wkLooksPaint(geldig) {
  const host = q('[data-wk-looks]');
  const rij = q('[data-wk-rij-looks]');
  const looks = geldig ? kaartLooks() : [];
  const t = erbijTekst();
  if (rij) rij.hidden = !looks.length;
  qa('[data-wk-sum-looks]').forEach((el) => { el.textContent = looks.length ? `${looks.length} × ${euro(lookPrijs())}` : ''; });
  if (!host) return;
  host.textContent = '';
  host.hidden = !looks.length;
  looks.forEach((l) => {
    const div = document.createElement('div');
    div.className = 'wk-lookregel';
    const twee = document.createElement('span');
    twee.className = 'wk-lookregel-twee';
    twee.setAttribute('aria-hidden', 'true');
    twee.append(...l.kaarten.slice(0, 3).map((k) => kaartDuim(k)));
    const tekst = document.createElement('span');
    const b = document.createElement('b');
    b.textContent = String(t.lookLabel || '').replace('{l}', l.letter).replace('{n}', String(l.kaarten.length));
    const small = document.createElement('small');
    small.textContent = String(t.krijgZin || '').replace('{prijs}', euro(lookPrijs()));
    tekst.append(b, small);
    div.append(twee, tekst);
    host.appendChild(div);
  });
}

function wkLookPaint() {
  const el = q('[data-wk-sum-look]');
  if (!el) return;
  if (el.dataset.wkLeeg === undefined) el.dataset.wkLeeg = el.textContent.trim();
  const st = q('input[name="style"]:checked');
  el.textContent = (st && (st.dataset.plStyleName || st.value)) || el.dataset.wkLeeg;
}

/** De kleur die beeld `id` nu krijgt: dezelfde som als syncBeeldBg(). */
function wkKleurVan(id) {
  const hoofd = huidigeAchtergrond() || '#FFFFFF';
  if (id === 'front') return hoofd;
  const rij = q(`[data-pl-bgfoto-beeld="${id}"]`);
  const sel = rij && q('[data-pl-bgfoto-select]', rij);
  if (!sel || sel.disabled || !sel.value) return hoofd;
  if (sel.value === 'eigen') {
    const hx = q('[data-pl-bgfoto-hex]', rij);
    return normalizeHex(hx ? hx.value : '') || hoofd;
  }
  return String(sel.value).toUpperCase();
}

/** Beeld `id` krijgt kleur `hex`; de rest houdt wat hij had. */
function wkZetKleur(id, hex) {
  const ids = qa('[data-wk-kleur]').map((b) => b.dataset.wkKleur);
  const stand = {};
  ids.forEach((i) => { stand[i] = wkKleurVan(i); });
  stand[id] = String(hex).toUpperCase();
  const hoofd = stand.front || '#FFFFFF';
  /* De bestelling zelf: de kleur van de voorkant. */
  const vast = qa('input[name="background"]').find((r) => r.dataset.plBgCustom === undefined && String(r.dataset.plBgHex || '').toUpperCase() === hoofd);
  if (vast) {
    if (!vast.checked) { vast.checked = true; vast.dispatchEvent(new Event('change', { bubbles: true })); }
  } else {
    const eigen = q('input[name="background"][data-pl-bg-custom]');
    const tekst = q('[data-pl-bg-text]');
    const kiezer = q('[data-pl-bg-color]');
    if (eigen && tekst) {
      tekst.value = hoofd;
      if (kiezer) kiezer.value = hoofd;
      eigen.checked = true;
      eigen.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  /* De andere beelden: alleen een eigen achtergrond als ze afwijken van de voorkant. */
  ids.filter((i) => i !== 'front').forEach((i) => {
    const rij = q(`[data-pl-bgfoto-beeld="${i}"]`);
    const sel = rij && q('[data-pl-bgfoto-select]', rij);
    if (!sel) return;
    const wil = stand[i];
    let waarde = '';
    if (wil && wil !== hoofd) {
      const opt = [...sel.options].find((o) => o.value && o.value !== 'eigen' && String(o.value).toUpperCase() === wil);
      waarde = opt ? opt.value : 'eigen';
    }
    sel.value = waarde;
    const hx = q('[data-pl-bgfoto-hex]', rij);
    if (hx) hx.value = waarde === 'eigen' ? wil : '';
    const kl = q('[data-pl-bgfoto-kleur]', rij);
    if (kl && waarde === 'eigen') kl.value = wil;
  });
  syncBackground(kindOf());
  syncSummaries();
}

function wkKleurPaint() {
  if (!werkAan()) return;
  const lock = q('[data-pl-bg-lock]');
  const wit = !!(lock && !lock.hidden);
  const namen = {};
  qa('[data-wk-c]').forEach((x) => { if (x.dataset.wkC !== 'eigen') namen[x.dataset.wkC] = (x.childNodes[1] && x.childNodes[1].textContent || '').trim(); });
  qa('[data-wk-kleur]').forEach((b) => {
    const kleur = wkKleurVan(b.dataset.wkKleur);
    b.style.setProperty('--bo-bg', kleur);
    const tegel = b.closest('.bo-tegel');
    if (tegel) tegel.style.setProperty('--bo-bg', kleur);
    const naam = namen[kleur] ? `${namen[kleur]}, ${kleur}` : kleur;
    b.setAttribute('aria-label', String(cfg.werk.kleurVoor || '{hoek}: {kleur}').replace('{hoek}', String(b.dataset.wkHoekNaam || '').toLowerCase()).replace('{kleur}', naam));
    b.disabled = wit && b.dataset.wkKleur === 'front';
  });
  const pw = q('[data-wk-paneel-wit]');
  if (pw) pw.hidden = !wit;
}

function bindWkKleur() {
  const paneel = q('[data-wk-paneel]');
  if (!paneel) return;
  const eigenBox = q('[data-wk-eigen]', paneel);
  const eigenIn = q('[data-wk-eigen-hex]', paneel);
  const fout = q('[data-wk-eigen-fout]', paneel);
  let knop = null;
  const sluit = (terug) => {
    paneel.hidden = true;
    if (knop) {
      knop.setAttribute('aria-expanded', 'false');
      if (terug) { try { knop.focus({ preventScroll: true }); } catch { knop.focus(); } }
    }
    knop = null;
  };
  const druk = (nu) => {
    const bekend = qa('[data-wk-c]', paneel).some((x) => x.dataset.wkC === nu);
    qa('[data-wk-c]', paneel).forEach((x) => x.setAttribute('aria-pressed', (x.dataset.wkC === nu || (!bekend && x.dataset.wkC === 'eigen')) ? 'true' : 'false'));
    if (eigenBox) eigenBox.hidden = bekend;
    if (eigenIn) eigenIn.value = bekend ? '' : String(nu || '').replace(/^#/, '');
  };
  qa('[data-wk-kleur]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    if (knop === b && !paneel.hidden) { sluit(true); return; }
    if (knop) knop.setAttribute('aria-expanded', 'false');
    knop = b;
    const li = b.closest('li');
    if (li) li.appendChild(paneel);
    const kop = q('[data-wk-paneel-hoek]', paneel);
    if (kop) kop.textContent = b.dataset.wkHoekNaam || '';
    if (fout) fout.hidden = true;
    druk(wkKleurVan(b.dataset.wkKleur));
    paneel.hidden = false;
    b.setAttribute('aria-expanded', 'true');
    /* Binnen het venster houden: het paneel staat onder het vierkantje, en bij de
       laatste hoek zou het rechts buiten beeld vallen. */
    paneel.style.setProperty('--wk-schuif', '0px');
    const r = paneel.getBoundingClientRect();
    const rechts = r.right - (document.documentElement.clientWidth - 12);
    const links = 12 - r.left;
    if (rechts > 0) paneel.style.setProperty('--wk-schuif', `${-Math.ceil(rechts)}px`);
    else if (links > 0) paneel.style.setProperty('--wk-schuif', `${Math.ceil(links)}px`);
    const eerste = paneel.querySelector('[data-wk-c][aria-pressed="true"]') || paneel.querySelector('[data-wk-c]');
    if (eerste) { try { eerste.focus({ preventScroll: true }); } catch { eerste.focus(); } }
  }));
  qa('[data-wk-c]', paneel).forEach((x) => x.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!knop) return;
    if (x.dataset.wkC === 'eigen') {
      qa('[data-wk-c]', paneel).forEach((y) => y.setAttribute('aria-pressed', y === x ? 'true' : 'false'));
      if (eigenBox) eigenBox.hidden = false;
      if (eigenIn) eigenIn.focus();
      return;
    }
    wkZetKleur(knop.dataset.wkKleur, x.dataset.wkC);
    sluit(true);
  }));
  const eigen = () => {
    const v = normalizeHex(eigenIn ? eigenIn.value : '');
    if (fout) fout.hidden = !!v;
    if (v && knop) { wkZetKleur(knop.dataset.wkKleur, v); sluit(true); }
  };
  const zet = q('[data-wk-eigen-zet]', paneel);
  if (zet) zet.addEventListener('click', (e) => { e.stopPropagation(); eigen(); });
  if (eigenIn) eigenIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); eigen(); } });
  paneel.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (document.contains(paneel) && !paneel.hidden) sluit(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.contains(paneel) && !paneel.hidden) sluit(true); });
  wkKleurPaint();
}

function paintWkVorm() {
  qa('[data-wk-vorm]').forEach((b) => {
    const r = q(`input[name="ratio"][value="${b.dataset.wkVorm}"]`);
    b.setAttribute('aria-pressed', r && r.checked ? 'true' : 'false');
    b.disabled = !r || r.disabled;
  });
}

function bindWkVorm() {
  const groep = q('[data-wk-vormen]');
  if (!groep) return;
  qa('[data-wk-vorm]', groep).forEach((b) => b.addEventListener('click', () => {
    const r = q(`input[name="ratio"][value="${b.dataset.wkVorm}"]`);
    if (!r || r.disabled) return;
    if (!r.checked) {
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
    paintWkVorm();
  }));
  form.addEventListener('change', (e) => { if (e.target && e.target.name === 'ratio') paintWkVorm(); });
  paintWkVorm();
}

function bindWkHoeken() {
  const open = q('[data-wk-hoek-open]');
  const dlg = q('[data-wk-hoeken]');
  if (!open || !dlg) return;
  const sluit = () => {
    /* Een eigen hoek vraagt een beschrijving (AnglePicker.astro): die moet er staan
       voordat het paneel dichtgaat, anders is hij verborgen en niet meer verplicht. */
    const leeg = qa('[data-pl-req]', dlg).find((f) => !f.disabled && isShown(f) && !String(f.value || '').trim());
    if (leeg) {
      markeerVeld(leeg.closest('fieldset, .field, .pl-veld, [data-pl-veldgroep]') || leeg.parentElement, leeg.dataset.plErrMsg || '');
      try { leeg.focus(); } catch { /* jammer */ }
      return;
    }
    dlg.hidden = true;
    try { open.focus({ preventScroll: true }); } catch { open.focus(); }
    syncSummaries();
  };
  open.addEventListener('click', () => {
    dlg.hidden = false;
    qa('details', dlg).forEach((d) => { d.open = true; });
    const eerste = q('input:not([type="hidden"]), button', q('[data-pl-angles]', dlg) || dlg);
    if (eerste) { try { eerste.focus({ preventScroll: true }); } catch { eerste.focus(); } }
  });
  qa('[data-wk-hoeken-dicht]', dlg).forEach((b) => b.addEventListener('click', sluit));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) sluit(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.contains(dlg) && !dlg.hidden) sluit(); });
}

function bindWkHulp() {
  const hulp = document.querySelector('[data-wk-hulp]');
  if (!hulp) return;
  document.addEventListener('click', (e) => {
    if (!document.contains(hulp) || !hulp.open) return;
    if (!hulp.contains(e.target)) hulp.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !document.contains(hulp) || !hulp.open) return;
    hulp.open = false;
    const k = hulp.querySelector('summary');
    if (k) k.focus();
  });
}

/* ── DE TIPBALK — levering 59 (afvinklijst 36, b-tips) ────────────────────────────
   Eén tip tegelijk, om de 7 seconden de volgende. Stil zolang de muis erop staat of de
   blik erin, bij minder beweging en als je pauzeert. Het kruisje verbergt hem (dat blijft
   zo op dit apparaat, localStorage); "Toon de tips weer" bovenaan zet hem terug. De klok
   loopt alleen op stap 2: de balk staat in die stap, dus elders is hij niet te zien. */
function bindWkTips() {
  /* Binnen de functie en niet bovenaan de module: init() draait al tijdens het laden
     van dit bestand, en een const verderop bestaat dan nog niet (zie de noot bij boot). */
  const WK_TIPS_WEG = 'vis-tipbalk-weg';
  const balk = q('[data-wk-tipbalk]');
  if (!balk) return;
  let tips = [];
  try { tips = JSON.parse(balk.dataset.wkTips || '[]'); } catch { tips = []; }
  if (!tips.length) return;
  const tekst = q('[data-wk-tip-t]', balk);
  const stippen = qa('.wk-tip-stip i', balk);
  const pauze = q('[data-wk-tip-pauze]', balk);
  const terug = q('[data-wk-tips-terug]');
  let nu = 0;
  let loopt = !reduced();
  let stil = false;
  let klok = 0;
  const toon = (i) => {
    nu = (i + tips.length) % tips.length;
    if (tekst) {
      tekst.classList.remove('is-in');
      void tekst.offsetWidth;
      tekst.textContent = tips[nu];
      tekst.classList.add('is-in');
    }
    stippen.forEach((x, k) => x.classList.toggle('is-nu', k === nu));
  };
  const zet = () => {
    if (klok) { clearInterval(klok); klok = 0; }
    if (loopt && !stil && !balk.hidden) {
      klok = setInterval(() => {
        if (!document.contains(balk)) { clearInterval(klok); klok = 0; return; }
        if (current === 2 && !document.hidden) toon(nu + 1);
      }, 7000);
    }
    if (pauze) {
      pauze.classList.toggle('is-gepauzeerd', !loopt);
      pauze.setAttribute('aria-label', loopt ? (pauze.dataset.wkPauze || '') : (pauze.dataset.wkSpeel || ''));
    }
  };
  let weg = false;
  try { weg = localStorage.getItem(WK_TIPS_WEG) === '1'; } catch { weg = false; }
  balk.hidden = weg;
  if (terug) terug.hidden = !weg;
  const volgende = q('[data-wk-tip-volgende]', balk);
  if (volgende) volgende.addEventListener('click', () => { toon(nu + 1); zet(); });
  if (pauze) pauze.addEventListener('click', () => { loopt = !loopt; zet(); });
  const verberg = q('[data-wk-tip-weg]', balk);
  if (verberg) verberg.addEventListener('click', () => {
    balk.hidden = true;
    try { localStorage.setItem(WK_TIPS_WEG, '1'); } catch { /* dan alleen nu */ }
    zet();
    if (terug) { terug.hidden = false; try { terug.focus({ preventScroll: true }); } catch { terug.focus(); } }
  });
  if (terug) terug.addEventListener('click', () => {
    balk.hidden = false;
    terug.hidden = true;
    try { localStorage.removeItem(WK_TIPS_WEG); } catch { /* ok */ }
    zet();
  });
  balk.addEventListener('mouseenter', () => { stil = true; zet(); });
  balk.addEventListener('mouseleave', () => { stil = false; zet(); });
  balk.addEventListener('focusin', () => { stil = true; zet(); });
  balk.addEventListener('focusout', () => { stil = false; zet(); });
  toon(0);
  zet();
}

/* ── IN DE WERKPLAATS STAAT ER METEEN EEN PRIJS — levering 59 (afvinklijst 36,
   b-werkplaats): "Het lege totaal van nu is weg: er staat meteen een prijs, bij 1
   product." Na het binden van de uploader (anders bouwt syncCards een kaart die de
   uploader daarna weer weghaalt). Het aantal is dan een standaard en geen keuze
   (data-wk-standaard): een kopie (?van) of een concept zet er gewoon het eigen aantal
   overheen, en zodra de klant zelf iets doet, is het zijn keuze. */
function wkStandaardAantal() {
  if (!werkAan()) return;
  const sel = q('select[name="products"]');
  const veld = q('[data-pl-qty-input]');
  if (!sel || !veld || Number.isInteger(Number.parseInt(sel.value, 10))) return;
  veld.value = '1';
  veld.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dataset.wkStandaard = '1';
  const box = q('[data-pl-qty]');
  const weg = (e) => { if (e.isTrusted) delete sel.dataset.wkStandaard; };
  if (box) { box.addEventListener('input', weg); box.addEventListener('click', weg); }
}

function bindWerk() {
  if (!werkAan()) return;
  bindWkKleur();
  bindWkVorm();
  bindWkHoeken();
  bindWkHulp();
  bindWkTips();
  form.addEventListener('change', (e) => { if (e.target && e.target.name === 'style') wkLookPaint(); });
  wkLookPaint();
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
  show('[data-pl-bg-lock]', white);
  show('[data-pl-ch-split]', white && wantsOwn);
  show('[data-pl-ch-order]', mainModel);
  show('[data-pl-ch-risk]', risk);
  show('[data-pl-ch-why]', white);

  // Re-render the background from whatever the lock just did to it.
  syncBackground(kindOf());
  // And the shape: Zalando fixes it to 1:1.44 (14 October 2026, see syncRatio).
  syncRatio(kindOf());
  // …and directly as well: on a flow with no background field syncBackground()
  // returns early, and the channel summary still has to move.
  syncSummaries();
  return picked;
}

function bindBackground() {
  qa('input[name="background"]').forEach((r) => {
    r.addEventListener('change', (e) => {
      syncBackground(kindOf());
      /* Tip 1 (v28-tips = a): na de eerste kleurkeuze van de klant zelf. */
      if (e.isTrusted) toonTip('bgfoto');
    });
  });
  bindBeeldBg();

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

/* ── EEN ANDERE ACHTERGROND PER BEELD — 15 oktober 2026 (werklijst 27) ──────
 *
 * In stap 1, onder de achtergrond: "Een foto een andere achtergrond geven"
 * (BackgroundPicker.astro), een <select> per beeld. En in "Wat je krijgt"
 * (BestelOverzicht.astro) draagt elke tegel de achtergrond van zijn beeld; een
 * klik op een tegel opent die keuze op dat beeld. De hoeken komen erbij zodra
 * ze zijn aangevinkt. Eist een kanaal een witte hoofdafbeelding, dan staat de
 * voorkant vast op wit. De server houdt dezelfde regels aan
 * (src/data/beeldachtergrond.js); dit is alleen wat de klant ziet.
 *
 * Geeft de regel voor de samenvatting terug: "Op model: beige", of ''.
 */
function huidigeAchtergrond() {
  const r = q('input[name="background"]:checked');
  if (!r) return '';
  if (r.dataset.plBgCustom !== undefined) return normalizeHex(q('[data-pl-bg-text]') ? q('[data-pl-bg-text]').value : '') || '';
  return String(r.dataset.plBgHex || '').toUpperCase();
}
function syncBeeldBg() {
  const box = q('[data-pl-bgfoto]');
  if (!box) return '';
  const hoofd = huidigeAchtergrond() || '#FFFFFF';
  const lock = q('[data-pl-bg-lock]');
  const wit = !!(lock && !lock.hidden);
  const lockNoot = q('[data-pl-bgfoto-lock]', box);
  if (lockNoot) lockNoot.hidden = !wit;
  const regels = [];
  qa('[data-pl-bgfoto-beeld]', box).forEach((rij) => {
    const id = rij.dataset.plBgfotoBeeld;
    const sel = q('[data-pl-bgfoto-select]', rij);
    if (!sel) return;
    /* Een hoek alleen als hij gekozen is; een eigen hoek met de naam die de klant typte. */
    if (rij.dataset.plBgfotoHoek) {
      const b = q(`input[name="angle_${id}"]`);
      const aan = !!(b && b.checked && !b.disabled);
      rij.hidden = !aan;
      sel.disabled = !aan;
      if (!aan) sel.value = '';
      const naamEl = q('[data-pl-bgfoto-naam]', rij);
      if (naamEl && aan) naamEl.textContent = hoekNaam(id) || naamEl.dataset.plBgfotoNaam || naamEl.textContent;
    }
    if (id === 'front') {
      sel.disabled = wit;
      if (wit) sel.value = '';
    }
    /* v29-hex = b: "Eigen kleur…" opent het kleurvak en het veld met de code.
       Dicht staat het veld uit, zodat er geen oude code meereist. */
    const isEigen = sel.value === 'eigen' && !sel.disabled && !rij.hidden;
    const eigenVak = q('[data-pl-bgfoto-eigen]', rij);
    const hexIn = q('[data-pl-bgfoto-hex]', rij);
    if (eigenVak) eigenVak.hidden = !isEigen;
    if (hexIn) hexIn.disabled = !isEigen;
    const eigen = isEigen ? normalizeHex(hexIn ? hexIn.value : '') : String(sel.value || '').toUpperCase();
    const anders = !!eigen && eigen !== hoofd;
    const kleur = anders ? eigen : hoofd;
    const donker = q('[data-pl-bgfoto-donker]', rij);
    if (donker) donker.hidden = !(isEigen && eigen && isLight(eigen) === false);
    const staal = q('[data-pl-bgfoto-staal]', rij);
    if (staal) staal.style.setProperty('--bgfoto', kleur);
    rij.classList.toggle('is-anders', anders);
    if (anders && !rij.hidden) {
      const naam = (q('.bg-perfoto-naam', rij) || {}).textContent || id;
      const opt = sel.options[sel.selectedIndex];
      regels.push(isEigen
        ? `${naam.trim()}: ${c('bgfoto.eigen')} ${eigen}`
        : `${naam.trim()}: ${String(opt ? opt.textContent : eigen).trim().toLowerCase()}`);
    }
    /* De tegel in "Wat je krijgt": het vak van een catalogbeeld, of de hoek. */
    const tegel = q(`[data-bo-beeld="${id}"] .bo-tegel`) || q(`[data-bo-hoek="${id}"] .bo-tegel`);
    if (tegel) {
      tegel.style.setProperty('--bo-bg', kleur);
      tegel.classList.toggle('is-anders', anders);
    }
  });
  return regels.join(' · ');
}
function bindBeeldBg() {
  const box = q('[data-pl-bgfoto]');
  if (!box) return;
  qa('[data-pl-bgfoto-select]', box).forEach((sel) => sel.addEventListener('change', () => {
    syncSummaries();
    /* Net "Eigen kleur…" gekozen: meteen naar het veld met de code. */
    if (sel.value === 'eigen') { const hx = q('[data-pl-bgfoto-hex]', sel.closest('[data-pl-bgfoto-beeld]')); if (hx && !hx.value) hx.focus(); }
  }));
  /* Het kleurvak en het codeveld zijn één antwoord in twee vormen, zoals bij de
     hele bestelling (bindBackground): wat je in het ene doet, staat in het andere. */
  qa('[data-pl-bgfoto-beeld]', box).forEach((rij) => {
    const kleur = q('[data-pl-bgfoto-kleur]', rij);
    const hx = q('[data-pl-bgfoto-hex]', rij);
    if (kleur && hx) {
      kleur.addEventListener('input', () => { hx.value = normalizeHex(kleur.value) || kleur.value; syncSummaries(); });
      hx.addEventListener('input', () => { const h = normalizeHex(hx.value); if (h) kleur.value = h; syncSummaries(); });
    }
  });
  /* De hoeken en de kanalen veranderen welke rijen er zijn en of de voorkant vastligt. */
  if (form) form.addEventListener('change', (e) => {
    const n = (e.target && e.target.name) || '';
    if (/^angle_/.test(n) || n === 'channels') syncSummaries();
  });
  if (form) form.addEventListener('input', (e) => { if (/^angle_note_/.test((e.target && e.target.name) || '')) syncSummaries(); });
  /* Een tegel in "Wat je krijgt" kiezen: de keuze opent op dat beeld. In de werkplaats
     (levering 59) heeft elke tegel daarvoor zijn eigen vierkantje: zie bindWkKleur(). */
  if (!q('[data-wk-kleur]')) qa('[data-bo-beeld], [data-bo-hoek]').forEach((li) => {
    const id = li.dataset.boBeeld || li.dataset.boHoek;
    const rij = q(`[data-pl-bgfoto-beeld="${id}"]`, box);
    const tegel = q('.bo-tegel', li);
    if (!rij || !tegel) return;
    const naam = ((q('.bo-tegel-naam', li) || {}).textContent || id).trim();
    tegel.classList.add('is-kiesbaar');
    tegel.setAttribute('role', 'button');
    tegel.setAttribute('tabindex', '0');
    tegel.setAttribute('aria-label', c('bgfoto.kies', { beeld: naam }));
    const kies = () => {
      const sel = q('[data-pl-bgfoto-select]', rij);
      if (!sel || sel.disabled || rij.hidden) { box.open = true; box.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      box.open = true;
      rij.scrollIntoView({ block: 'center', behavior: 'smooth' });
      try { sel.focus({ preventScroll: true }); } catch { sel.focus(); }
    };
    tegel.addEventListener('click', kies);
    tegel.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kies(); } });
  });
  syncSummaries();
}

/* ── DE UITLEG-TIPS — 15 oktober 2026 (afvinklijst 28, v28-tips = a) ─────────
 *
 * Elke tip is een element met data-pl-tip="<id>" in de opmaak, verborgen tot
 * toonTip() hem laat zien. De regels (src/data/tips.js): één tegelijk, Begrepen
 * en een kruisje, Esc sluit hem, en wat je wegklikt komt niet terug (localStorage
 * TIPS_SLEUTEL; zonder opslag alleen dit tabblad). Hij staat in de stroom van
 * de pagina en dekt dus nooit een knop af.
 */
const tipsWegNu = new Set();
function tipWeg(id) {
  if (tipsWegNu.has(id)) return true;
  try { const lijst = JSON.parse(localStorage.getItem(TIPS_SLEUTEL) || '[]'); return Array.isArray(lijst) && lijst.includes(id); } catch { return false; }
}
function tipWegklikken(el) {
  const id = el.dataset.plTip;
  el.hidden = true;
  tipsWegNu.add(id);
  try {
    const lijst = JSON.parse(localStorage.getItem(TIPS_SLEUTEL) || '[]');
    const nieuw = Array.isArray(lijst) ? lijst.filter((x) => typeof x === 'string').slice(-20) : [];
    if (!nieuw.includes(id)) nieuw.push(id);
    localStorage.setItem(TIPS_SLEUTEL, JSON.stringify(nieuw));
  } catch { /* geen opslag: dan alleen dit tabblad */ }
}
function toonTip(id) {
  const el = q(`[data-pl-tip="${id}"]`);
  if (!el || !el.hidden || tipWeg(id)) return;
  /* Eén tegelijk. */
  if (qa('[data-pl-tip]').some((x) => !x.hidden)) return;
  /* Niet als hij in een verborgen deel van het formulier staat. */
  if (el.closest('[hidden]') && el.closest('[hidden]') !== el) return;
  el.hidden = false;
  if (!el.dataset.plTipGebonden) {
    el.dataset.plTipGebonden = '1';
    qa('[data-pl-tip-weg]', el).forEach((b) => b.addEventListener('click', () => tipWegklikken(el)));
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = qa('[data-pl-tip]').find((x) => !x.hidden);
  if (open) tipWegklikken(open);
});

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
  return kind === 'catalog';
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
  return kind === 'lifestyle';
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

  /* ── EEN KANAAL MET EEN EIGEN VORM — 14 oktober 2026 ──────────────────────
     Afvinklijst 24 (v24-zalando, a): vinkt de klant Zalando aan, dan staat de
     verhouding vast op 1:1,44, zoals de achtergrond vast op wit staat. Welk
     kanaal welke vorm eist, staat op het vinkje (data-pl-ch-ratio, uit
     CHANNEL_RATIOS in ratios.js). De tegel verschijnt en wordt aangevinkt; de
     andere blijven staan maar zijn uitgezet. Wat de klant ervoor had gekozen,
     onthoudt het veld, zodat uitvinken hem terugzet in plaats van op het
     vierkant. /api/order zet hetzelfde vast voor een post zonder JavaScript. */
  const slotBox = kind === 'catalog'
    ? qa('[data-pl-ch-box]').find((b) => b.checked && b.dataset.plChRatio)
    : null;
  const slot = slotBox ? slotBox.dataset.plChRatio : '';
  if (slot && !field.dataset.plRatioVoor) {
    const voor = q('input[name="ratio"]:checked');
    field.dataset.plRatioVoor = voor && !voor.closest('[data-pl-ratio-channel]') ? voor.value : (cfg.ratio && cfg.ratio.fallback) || 'square';
  }

  let bumped = false;
  qa('[data-pl-ratio-tile]').forEach((tile) => {
    const id = tile.dataset.plRatioTile;
    const kanaal = tile.hasAttribute('data-pl-ratio-channel');
    const on = kanaal ? id === slot : ratioApplies(kind, id);
    tile.hidden = !on;
    const input = q('input[name="ratio"]', tile);
    if (!input) return;
    input.disabled = !on || (!!slot && id !== slot);
    if (slot && id === slot) input.checked = true;
    if (!on && input.checked) { input.checked = false; bumped = true; }
  });
  const slotHint = q('[data-pl-ratio-lock]', field);
  if (slotHint) slotHint.hidden = !slot;

  // Het kanaal is net uitgevinkt: terug naar wat de klant ervoor had gekozen.
  if (!slot && field.dataset.plRatioVoor) {
    const terug = qa('input[name="ratio"]').find((r) => r.value === field.dataset.plRatioVoor && !r.disabled);
    delete field.dataset.plRatioVoor;
    if (terug && (bumped || !q('input[name="ratio"]:checked'))) { terug.checked = true; bumped = false; }
  }

  // Niets meer aangevinkt — of omdat de keuze net verdween, of omdat de pagina
  // zonder standaard laadde. Terug naar de verhouding die altijd werkt.
  if (bumped || !q('input[name="ratio"]:checked')) {
    const fallback = (cfg.ratio && cfg.ratio.fallback) || 'square';
    const target = qa('input[name="ratio"]').find((r) => r.value === fallback && !r.disabled);
    if (target) target.checked = true;
  }

  /* De regel in de dichte vouw — 10 september 2026. De beeldvorm zit sinds
     vandaag achter een <Disclose>, en een vouw die zijn eigen antwoord niet toont
     is een vouw die iets verstopt. Het label plus de naam, uit de tegel zelf zodat
     hij nooit iets anders kan zeggen dan wat er aanstaat. NA de tegels sinds 14
     oktober 2026: een kanaal kan de keuze net hebben vastgezet. */
  {
    const aan = q('input[name="ratio"]:checked');
    const tegel = aan && aan.closest('[data-pl-ratio-tile]');
    if (tegel) {
      const label = q('.ratio-label', tegel);
      const naam = q('.ratio-naam', tegel) || q('.ratio-name', tegel);
      const stukken = [label && label.textContent.trim(), naam && naam.textContent.trim()].filter(Boolean);
      if (stukken.length) setSummary('data-pl-sum-ratio', stukken.join(' · '));
    }
  }

  /* Drie zinnen en niet twee, sinds complete zijn eigen geval is: bij catalog
     één verhouding voor alles, bij lifestyle een startpunt waar elk beeld van
     mag afwijken, en bij complete allebei tegelijk — vast voor de catalogset,
     afwijkbaar in de carousel. Zie de noot bij ratioApplies() hierboven. */
  const each = !!(cfg.ratio && cfg.ratio.perImage) && styleApplies(kind);
  const beide = false; // 'complete' had beide tegelijk; compleet bestaat sinds 14 oktober 2026 niet meer
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
 * Hoeveel complete looks er in deze bestelling zitten — 17 oktober 2026
 * (levering 60, afvinklijst 38). Hier stond outfitCount(), het getal uit de
 * keuzelijst "Zitten er outfits bij?". Die lijst is weg; een look is nu een
 * koppeling tussen kaarten in stap 2 (kaartLooks() verderop), en dit is hoeveel
 * er zijn. Alleen bij lifestyle: catalog en de proef kennen geen looks.
 */
function lookCount() {
  return lookAan() ? kaartLooks().length : 0;
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
/*
 * ── DE TOESLAG VAN EEN EIGEN LOOK — 17 SEPTEMBER 2026 ──────────────────────
 *
 * Een eigen stijl (customer_styles) kan een toeslag PER PRODUCT dragen.
 * quoteOrder() in src/lib/quote.js telt die mee — `netCents + n * surcharge` —
 * en functions/api/order.js geeft hem door bij het aanmaken van de betaling. Het
 * lopende totaal in de browser kende het veld niet.
 *
 * Gevolg: dertig producten met een toeslag van € 10 gaven een lopend totaal dat
 * € 300 lager was dan wat er bij Mollie op het scherm kwam. De klant zag het
 * verschil pas op het betaalscherm, en /pricing belooft er letterlijk bij dat
 * "elk product daarna tegen het gewone tarief" loopt.
 *
 * De toeslag staat op de radio zelf (data-pl-style-surcharge, gezet door
 * addOwnStyles()), niet in een variabele: de tegels worden na /account/me
 * gemaakt en er kunnen er meerdere zijn. Wat er staat, is wat er gekozen is.
 *
 * DE HUISSTIJLEN HEBBEN GEEN TOESLAG en dragen het attribuut dus niet — daar
 * komt 0 uit, en dat is het goede antwoord.
 */
function stijlToeslagNu() {
  const gekozen = q('input[name="style"]:checked');
  const cent = Number(gekozen && gekozen.dataset ? gekozen.dataset.plStyleSurcharge : 0);
  return Number.isFinite(cent) && cent > 0 ? cent / 100 : 0;
}

function quoteFor(kind, n, looks, extras = 0, hoog = 0) {
  const rate = rateFor(kind, n);
  if (rate === null) return null;
  // Extra photos follow the ladder (pricing.js EXTRA_PHOTO_LADDER), so their
  // rate is read at the SAME product count as the products themselves — one
  // rung for the whole order, which is the consistency that choice was made
  // for. De looktoeslag is vlak per look en beweegt niet met n.
  const extraRate = extraRateNow();
  /* 4K is VLAK en volgt de ladder niet: het werk achter een opschaling daalt
     niet met het aantal. Zie HOOG_PER_PRODUCT in pricing.js. */
  const hoogPrijs = Number((cfg.hoogRes && cfg.hoogRes.prijs) || 0);
  return {
    rate,
    extraRate,
    hoogPrijs,
    /* `n * stijlToeslagNu()` staat op dezelfde regel als de rest en niet erbuiten,
       want quoteOrder() op de server telt hem óók in het NETTO — zie de noot
       hierboven. Buiten de som zetten zou betekenen dat voorrang (die over het
       hele nettobedrag rekent) er weer niet over gaat. */
    net: round2(n * rate + (kind === 'lifestyle' ? looks : 0) * lookPrijs() + extras * extraRate + hoog * hoogPrijs + n * stijlToeslagNu()),
  };
}

/*
 * ── MEER PRODUCTEN VOOR HETZELFDE OF MINDER — 8 oktober 2026 (1.07) ──────────
 *
 * Wat de bestelling bij `m` producten zou kosten, met dezelfde keuzes als nu:
 * dezelfde looks, dezelfde hoeken op élk product (tegen het hoektarief van
 * DAT aantal), dezelfde 4K-vinkjes, dezelfde looktoeslag per product, en
 * voorrang als die aan staat. Bij m = het huidige aantal is dit precies het
 * totaal van syncTotal(), zodat "in plaats van" het bedrag is dat erboven staat.
 */
function totaalBij(kind, m) {
  const rate = rateFor(kind, m);
  if (rate === null) return null;
  const treden = cfg.extraPhotoLadder || [];
  const trede = treden.find(([lo, hi]) => m >= lo && (hi === null || m <= hi));
  const hoekTarief = trede ? trede[2] : 0;
  const hoogPrijs = Number((cfg.hoogRes && cfg.hoogRes.prijs) || 0);
  const net = round2(m * rate
    + (kind === 'lifestyle' ? Math.min(lookCount(), Math.floor(m / 2)) : 0) * lookPrijs()
    + anglesChosen().length * m * hoekTarief
    + hoogResCount() * hoogPrijs
    + m * stijlToeslagNu());
  const voorrang = voorrangAan() ? voorrangBedragNu(net) : null;
  return voorrang !== null ? round2(net + voorrang) : net;
}

/** Zet het aantal via het getalveld, zodat alles via dezelfde weg loopt als een klik op +. */
function zetAantal(m) {
  const input = q('[data-pl-qty-input]');
  if (!input || !Number.isInteger(m)) return;
  input.value = String(m);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  try { input.focus({ preventScroll: true }); } catch { input.focus(); }
}

/** Een sjabloon met {naam}-plekken invullen met tekst of elementen. Nooit innerHTML. */
function vulSjabloon(el, sjabloon, delen) {
  String(sjabloon).split(/(\{[a-zA-Z]+\})/).forEach((stuk) => {
    const m = /^\{([a-zA-Z]+)\}$/.exec(stuk);
    const deel = m ? delen[m[1]] : undefined;
    if (deel !== undefined) el.appendChild(typeof deel === 'string' ? document.createTextNode(deel) : deel);
    else if (stuk) el.appendChild(document.createTextNode(stuk));
  });
}

/**
 * De besparingsregel: "Met {aantal} producten betaal je {dan} in plaats van {nu}". Alleen
 * waar groterGoedkoper() iets vindt; welke aantallen dat zijn, volgt uit de
 * staffel. Geeft true als de regel er staat.
 */
function syncBesparing(kind, n, quote) {
  const el = q('[data-pl-besparing]');
  if (!el) return false;
  el.textContent = '';
  /* Met credits is een product altijd evenveel credits: geen besparingsregel. */
  if (prijzenInCredits) { el.hidden = true; return false; }
  const uit = kind && quote && Number.isInteger(n) && n > 0
    ? groterGoedkoper(n, (m) => totaalBij(kind, m), Number(cfg.maxProducts) || 0)
    : null;
  if (!uit) {
    el.hidden = true;
    return false;
  }
  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'pl-besparing-knop';
  knop.textContent = c('besparing.knop', { aantal: uit.aantal });
  knop.setAttribute('aria-label', c('besparing.knopLabel', { aantal: uit.aantal }));
  knop.addEventListener('click', () => zetAantal(uit.aantal));
  const vet = (bedrag) => {
    const b = document.createElement('b');
    b.textContent = euro(bedrag);
    return b;
  };
  vulSjabloon(el, c(uit.gelijk ? 'besparing.gelijk' : 'besparing.minder'), { knop, dan: vet(uit.dan), nu: vet(uit.nu) });
  // Van "zo snel mogelijk" naar een vaste datum is ook een verschil: zeg het erbij.
  const drempel = Number(cfg.windowThreshold);
  if (drempel > 0 && n < drempel && uit.aantal >= drempel) {
    el.appendChild(document.createTextNode(` ${c('besparing.datum')}`));
  }
  el.hidden = false;
  return true;
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
  const looks = lookCount();
  const extras = extrasCount();
  const hoog = hoogResCount();
  const quote = kind ? quoteFor(kind, n, looks, extras, hoog) : null;
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
  totaalEuro = quote ? euro(quote.net) : dash;

  let noteText = '';
  if (quote) {
    noteText = c('total.each', { rate: euro(quote.rate), n });
    // De looks komen bovenop de regel per product, nooit alleen.
    if (looks > 0) noteText += c('total.look', { price: euro(lookPrijs()), n: looks });
    if (extras > 0) noteText += c('total.extra', { price: euro(quote.extraRate), n: extras });
    if (hoog > 0) noteText += c('total.hoogRes', { price: euro(quote.hoogPrijs), n: hoog, px: String((cfg.hoogRes && cfg.hoogRes.hoog) || '') });
    if (stijlToeslagNu() > 0 && Number.isInteger(n)) noteText += c('total.eigenLook', { price: euro(stijlToeslagNu()), n });
    if (voorrang !== null) noteText += c('total.voorrang', { price: euro(voorrang) });
  } else if (kind && !Number.isInteger(n) && q('select[name="products"]')?.value) {
    // The escape hatch. Not a failure to price — a count this form is not
    // willing to guess at, which the gate has its own panel for.
    noteText = c('total.more');
  } else {
    noteText = c('total.quote');
  }
  setText('[data-pl-total-note]', noteText);
  totaalNoot = noteText;
  /* syncTotal() schreef zojuist de euro's; zetGeldRegels() (via syncCredits)
     zet er weer credits overheen als die gelden. */
  for (const el of qa('[data-pl-total], [data-pl-total-note]')) delete el.dataset.plMetCredits;
  /* Ronde B: de creditregel in stap 5 rekent met dezelfde keuzes mee. */
  syncCredits();

  /* ── HET MEELOPENDE OVERZICHT — 12 september 2026 ────────────────────────
     Lucas: *"bij het bestelformulier is het gewoon super onduidelijk en niet
     visueel genoeg wat mensen krijgen voor hun geld waardoor het erg duur lijkt
     allemaal."*

     Dit zijn de twee getallen die dat antwoord dragen, en ze staan hier omdat
     het aantal en de offerte hier al berekend zijn. Er wordt niets opnieuw
     uitgerekend — een tweede som is een tweede waarheid, en dan kan het
     overzicht een ander aantal tonen dan het totaal waar het onder staat. */
  setSummary('data-pl-bo-aantal', Number.isInteger(n) && n > 0 ? String(n) : '');
  /* MET de bijbestelde hoeken erin — zie beeldenPerProductNu(). Dit vakje zei
     "24 beelden" bij zes producten terwijl er met één extra hoek dertig komen,
     en dat is precies het vakje dat moet uitleggen wat je voor je geld krijgt. */
  const perProduct = beeldenPerProductNu();
  /* En de twee beelden van elke complete look (levering 60, v38-beelden a). */
  setSummary('data-pl-bo-beelden',
    perProduct && Number.isInteger(n) && n > 0 ? String(perProduct * n + lookBeeldenNu()) : '');

  // THE LADDER'S OWN UPSELL, and it has to be honest: both totals are computed
  // from the ladder rather than estimated, so a client with a calculator finds
  // exactly the two numbers this sentence names. Net on both sides, and the
  // copy says so — comparing a net figure against a gross one would understate
  // the saving by 21% and be wrong in the client’s favour, which is still wrong.
  const rung = q('[data-pl-rung]');
  if (rung) {
    const next = kind && quote ? nextRung(kind, n) : null;
    /* Met credits geen euroladder (zie zetCreditPrijzen). */
    if (next && next.addProducts > 0 && !prijzenInCredits) {
      const then = quoteFor(kind, next.at, looks, extras);
      // `now` is the CURRENT RATE, not the current total. The sentence used to
      // read "{then} instead of {now}" with two totals in it, which put the
      // larger number on the "instead of" side — more products for more money,
      // phrased as if it were a saving. What actually falls is the per-product
      // rate, so that is what the two figures compare, and the totals are
      // stated as what they are: this many products for this much.
      /* 8 okt 2026: rustig zoals de besparingsregel — gewone tekst, alleen de
         bedragen vet (vulSjabloon, nooit innerHTML). */
      const vet = (bedrag) => {
        const b = document.createElement('b');
        b.textContent = euro(bedrag);
        return b;
      };
      rung.textContent = '';
      vulSjabloon(rung, c(next.addProducts === 1 ? 'rung.one' : 'rung.many'), {
        add: String(next.addProducts),
        rate: vet(next.rate),
        then: vet(then.net),
        now: vet(quote.rate),
        count: String(next.at),
      });
      rung.hidden = false;
    } else {
      rung.textContent = '';
      rung.hidden = true;
    }
  }
  /* 1.07: is een groter aantal even duur of goedkoper, dan zegt de rustige
     besparingsregel dat, en zwijgt de ladderregel (zelfde aanbod, twee keer). */
  if (syncBesparing(kind, n, quote) && rung) {
    rung.textContent = '';
    rung.hidden = true;
  }

  /* De combinatie ("lifestyle erbij?", van catalog naar compleet en terug) stond
     hier met het bedrag erbij. Het blok staat sinds 1 oktober 2026 niet meer op
     een pagina, en sinds 14 oktober 2026 bestaat compleet niet meer: weg. */

  syncAppOns();
  paintPlan(kind, n);
  wkOverzicht(kind, n, quote, voorrang);
}

/*
 * ── "KOM JE ER NIET UIT? APP ONS" — 8 oktober 2026 (1.08) ────────────────────
 * Elke stap heeft één gewone wa.me-link (OrderFlow.astro). Zonder script noemt
 * het bericht de stap en de dienst; hier komt het aantal producten erbij zodra
 * dat bekend is. Alleen de stand van de bestelling, nooit iets over de klant —
 * geen naam, merk, e-mail of telefoon, ook niet als die al zijn ingevuld.
 */
function syncAppOns() {
  const links = qa('[data-pl-appons]');
  if (!links.length) return;
  const n = productCount();
  const wat = !cfg.sample && Number.isInteger(n) && n > 0
    ? c('appOns.watAantal', { aantal: n === 1 ? c('appOns.een') : c('appOns.meer', { n }) })
    : c('appOns.wat');
  links.forEach((a) => {
    const stap = String(a.dataset.plAppons || '');
    const naam = c(`appOns.stap.${stap}`);
    if (!stap || !naam || !wat) return;
    a.setAttribute('href', waHref(c('appOns.bericht', { stap, naam, wat })));
  });
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
 * HET PLAN DAT ERBIJ STAAT is sinds 23 september 2026 het kleinste plan waarvan
 * de CREDITS deze bestelling dekken (de sprong van producten naar Merk bestaat
 * niet meer: Studio geeft 120 credits, genoeg voor dertien complete producten).
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
  if (kind !== 'lifestyle' && kind !== 'catalog') return verberg();

  /* ── IN CREDITS SINDS 23 SEPTEMBER 2026 ──────────────────────────────
     Deze bestelling, elke maand, is n × de credits van de soort. Het plan dat
     erbij staat is het kleinste dat dat dekt; past het in geen enkel plan, dan
     de zin over een abonnement op maat. Onder het kleinste plan: geen regel,
     want dan is los bestellen het eerlijke antwoord. */
  const per = cfg.creditsPer && cfg.creditsPer[kind];
  if (!per) return verberg();
  /* RONDE 9, O5 — de extra hoeken en 4K telden niet mee: de webshop (12
     producten + 2 hoeken) las "48 credits" voor wat er 96 zijn. Zelfde
     toeslagen als pricing.js (EXTRA_CREDITS): een extra beeld, een 4K-product. */
  const ex = cfg.extraCredits || {};
  const nodig = n * per + extrasCount() * (Number(ex.photo) || 0) + hoogResCount() * (Number(ex.hires) || 0);
  const oplopend = rijen.slice().sort((a, b) => a.credits - b.credits);
  if (nodig < oplopend[0].credits * 0.75) return verberg();
  const plan = oplopend.find((r) => r.credits >= nodig);
  if (!plan) {
    zin.textContent = c('plan.steady');
  } else {
    zin.textContent = c('plan.compare', {
      need: String(nodig),
      name: plan.name,
      credits: String(plan.credits),
      price: plan.price,
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
//
/* ── EN DE VOORUITKNOP VAN DE RIJ IS GEEN UITZONDERING — 17 september 2026 ──
   Sinds vandaag staat de knop "volgend product" uit zolang een kaart niet af
   is. Dat lijkt op een poort en is het niet: hij houdt je tegen binnen STAP 2,
   op de vraag "welk product bekijk ik nu", en niet bij het indienen. De knop
   Verder onder de stap is onaangeraakt, askMissing() laat nog steeds door, en
   wie de hele stap overslaat verandert er niets aan.
   Het onderscheid is precies wat Lucas vroeg: *"'Sla deze over' moet
   aangeklikt worden, anders kan de klant niet verder naar het volgende
   product."* Naar het volgende PRODUCT — niet naar de volgende STAP. */
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
  if (n) {
    /* ── EEN HOEKVAK DRAAGT DE NAAM VAN ZIJN HOEK — 17 september 2026 ────────
       "Extra foto 2" zegt de klant niets over wat hij moet fotograferen, en het
       is juist dit vak waarvan Lucas zei: *"zodat wij zeker weten wat hij er
       precies mee bedoelt."* Dus staat de naam van de hoek erop — Driekwart,
       Van achteren — en valt hij alleen terug op het nummer als de kiezer er
       niet is (bij een dienst zonder hoeken bestaat dit vak sowieso niet). */
    const vak = hoekVakken().find((v) => v.id === id);
    if (vak && vak.naam) return vak.naam;
    return c('pu.extraSlot', { n });
  }
  // Een gratis referentievak draagt zijn nummer op dezelfde manier. Een ANDER
  // woord dan bij de betaalde, en dat is het hele punt: "Extra foto 2" naast
  // "Referentie 2" is precies de verwarring waar de eigen prefix voor bestaat.
  const r = refShotNumber(id);
  if (r) return c('pu.refSlot', { n: r });
  /* Een contextvakje draagt de naam van zijn plek ("Schoenen", "Eronder"): uit
     de config, want die naam komt uit garments.js. */
  if (cfg && cfg.styling && String(id).startsWith('ctx-')) {
    const slot = String(id).slice(4);
    const spec = cfg.styling.slots && cfg.styling.slots[slot];
    if (spec && spec.naam) return spec.naam;
  }
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

/**
 * Wat er nog beslist moet worden voordat dit product af is.
 *
 * ── WAAROM DIT NAAST missingRequired() STAAT EN ER NIET IN ZIT ──────────────
 *
 * Ze houden allebei de kaart tegen, en dat maakt ze verleidelijk om samen te
 * voegen. Maar de ZIN eronder verschilt, en dat is de hele reden dat het twee
 * functies zijn: bij een verplichte foto zegt de kaart "mist achterkant", en
 * dat klopt. Bij de draagfoto zou "mist gedragen" betekenen dat je hem moet
 * sturen — terwijl het etiket op datzelfde vakje "optioneel" zegt. Twee regels
 * op één scherm die elkaar tegenspreken, en de klant gelooft de strengste.
 *
 * Leeg is hier dus geen antwoord, maar "overgeslagen" wél. Zie de noot bij
 * `worn` in src/data/shots.js.
 */
/*
 * ══════════════════════════════════════════════════════════════════════════════
 * EEN BESTELDE HOEK KRIJGT ZIJN EIGEN UPLOADVAK
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 16 september 2026: *"De klant ... krijgt dan een foto-upload erbij
 * specifiek voor die angle, verplicht, zodat wij zeker weten wat hij er precies
 * mee bedoelt."*
 *
 * En op 17 september, met het formulier voor zich: *"Ook heb ik 2 angles
 * toegevoegd en zie die niet terug bij de aanbevolen/required foto's."*
 *
 * Hij had gelijk, en het formulier sprak zichzelf tegen: met twee hoeken aan
 * stond eronder "je krijgt er 6", terwijl de kaart precies vier vakken toonde.
 * Wij zouden dus twee beelden moeten maken van een hoek die de klant nooit heeft
 * kunnen laten zien — precies het gokwerk waar zijn eis vanaf wil.
 *
 * ── HET NUMMER BLIJFT BIJ DE HOEK ──────────────────────────────────────────
 *
 * De vakken heten `extra1`…`extraN` — dat is wat /api/upload accepteert (zie
 * isExtraShotId in shots.js) en het is een NUMMER, geen naam. Als dat nummer
 * aan de VOLGORDE van de gekozen hoeken hing, zou het uitvinken van de eerste
 * hoek de tweede tot `extra1` omdopen terwijl er al een bestand aan hangt in
 * R2 — en dan hoort de foto van de ene hoek ineens bij de andere.
 *
 * Dus houdt `hoekVak` bij welk nummer bij welke hoek hoort, en dat nummer blijft
 * staan zolang die hoek gekozen is. Uitvinken geeft het nummer vrij; de volgende
 * hoek die erbij komt, pakt het laagste vrije nummer. Geen enkel bestaand vak
 * verandert daarbij van naam.
 *
 * ── EN DE KOPPELING REIST MEE ──────────────────────────────────────────────
 *
 * Een vak dat `extra2` heet zegt de studio niets. Daarom gaat er één verborgen
 * veld mee met de bestelling: `extra_slots` = "extra1:three_quarter,extra2:…".
 * Eén veld voor de hele bestelling en niet per product, want de hoeken zijn één
 * keuze vooraf en gelden voor elk product. Het staat niet in TOP_FIELDS, dus het
 * landt in details_json — dezelfde weg als de rest van de briefing.
 *
 * ── DE STAAT ZELF STAAT BOVENAAN ────────────────────────────────────────────
 * `hoekVak` is met de rest van de module-staat gedeclareerd (bij `cards` en
 * `tray`) en niet hier. Hij stond hier eerst, en dat kostte een halve ronde: een
 * `let` halverwege het bestand bestaat pas zodra de uitvoering die regel haalt,
 * en de opstart roept hoekVakken() al aan vóór dat punt. Het resultaat was
 * "[pipeline] ReferenceError: Cannot access 'hoekVak' before initialization" —
 * netjes opgevangen, dus geen rode pagina, maar de opstart brak halverwege af en
 * het formulier werd nooit live. Precies het soort stille breuk waar de
 * browsercontrole voor bestaat.
 */

/**
 * De naam van een hoek, zoals hij op zijn eigen tegel staat.
 *
 * ── BEHALVE BIJ DE ZELFBEDACHTE HOEK — 17 september 2026 ────────────────────
 * Daar staat op de tegel "Zelf bedenken", en dat is precies het woord dat de
 * klant niet wil terugzien boven zijn uploadvak. Wat hij er zelf intypte — "de
 * binnenkant van de tas, plat" — is de naam van die hoek, voor hem en voor ons.
 * Dus die zin komt op het vakje te staan, en "Zelf bedenken" is alleen nog de
 * naam van de knop waarmee je hem aanmaakt.
 *
 * Valt terug op de tegelnaam zolang het veld leeg is: dat duurt precies zolang
 * als het invullen van een verplicht veld, en een vakje zonder naam is erger
 * dan een vakje met een voorlopige naam.
 */
function hoekNaam(hoekId) {
  const box = angleBoxEl();
  if (!box) return '';
  if (isEigenAngleId(hoekId)) {
    const veld = q(`input[name="angle_note_${hoekId}"]`, box);
    const eigen = veld ? String(veld.value || '').trim() : '';
    if (eigen) return eigen;
  }
  const vink = q(`input[name="angle_${hoekId}"]`, box);
  const label = vink ? vink.closest('label') : null;
  const naam = label ? q('.pl-hoek-naam', label) : null;
  return naam ? naam.textContent.trim() : '';
}

/** De id van de hoek achter een vinkje: `angle_three_quarter` → `three_quarter`. */
function hoekIdVan(input) {
  const m = /^angle_(.+)$/.exec((input && input.name) || '');
  return m ? m[1] : '';
}

/**
 * De extra vakken zoals ze NU horen te zijn: één per gekozen hoek, met het
 * nummer dat die hoek al had of het laagste dat vrij is.
 */
function hoekVakken() {
  const gekozen = anglesChosen().map(hoekIdVan).filter(Boolean);

  // Nummers vrijgeven van hoeken die niet meer gekozen zijn.
  Object.keys(hoekVak).forEach((h) => { if (!gekozen.includes(h)) delete hoekVak[h]; });

  const bezet = new Set(Object.values(hoekVak));
  gekozen.forEach((h) => {
    if (hoekVak[h]) return;
    let n = 1;
    while (bezet.has(n)) n += 1;
    hoekVak[h] = n;
    bezet.add(n);
  });

  return gekozen.map((h) => ({
    hoek: h,
    nr: hoekVak[h],
    id: extraShotId(hoekVak[h]),
    naam: hoekNaam(h),
  })).sort((a, b) => a.nr - b.nr);
}

/** De vak-ids die op dit moment bij een gekozen hoek horen. */
function hoekVakIds() {
  return hoekVakken().map((v) => v.id);
}

function undecided(card) {
  return MUST_DECIDE_SHOT_IDS.filter((id) => (
    !slotFilled(card, id) && card.slots[id].status !== 'skipped'
  ));
}

function cardReady(card) {
  return REQUIRED_SHOT_IDS.every((id) => slotFilled(card, id))
    && hoekVakIds().every((id) => slotFilled(card, id))
    && !undecided(card).length;
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
  /* De vaste hoeken eerst, de bijbestelde daarna: de eerste vier zijn wat
     iedereen stuurt, de rest is wat deze klant erbij koos. Ze staan in dezelfde
     volgorde als de vakken op de kaart, zodat "mist achterkant en driekwart"
     van links naar rechts te volgen is. */
  return [...REQUIRED_SHOT_IDS, ...hoekVakIds()].filter((id) => !slotFilled(card, id));
}

/**
 * Hoeveel uploads er op dit moment onderweg zijn.
 *
 * Over ALLE vakken van de kaart en niet over SHOT_IDS — sinds 17 september
 * staan er ook hoekvakken en gratis referentievakken op. Een teller die alleen
 * de vaste vier telde, zei "niets meer onderweg" terwijl een hoekfoto van 18 MB
 * nog liep, en dan kon de bestelling weg zonder die foto.
 */
function pendingCount() {
  return cards.reduce(
    (n, card) => n + Object.keys(card.slots).filter((id) => card.slots[id].status === 'sending').length,
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
      /* ── EN IN DE RIJ ERNAARTOE — 17 september 2026 ───────────────────────
         Wie op "nog een product toevoegen" drukt, wil naar dat product. In de
         kolom stond het er gewoon onder; in de rij is het verborgen, en dan is
         focus zetten op een veld dat je niet ziet precies het soort halve
         reparatie waar een formulier stuk van gaat. naarKaart() doet allebei. */
      if (last && rijAan()) naarKaart(cards.length - 1);
      else if (last && last.input) last.input.focus();
    });
  }

  bindBulkDrag();
  syncCards();
  /* NA syncCards(): de rij tekent zichzelf uit `cards`, en die lijst bestaat
     pas als de kaarten er zijn. Zie de kop van paintRij(). */
  bindRij();
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

/** Wat er van een bestandsnaam overblijft zonder het woord van een gekozen hoek. */
function hoekStem(name) {
  let base = String(name || '').replace(/\.[a-z0-9]{1,5}$/i, '');
  for (const v of hoekVakken()) {
    for (const w of [v.naam, v.hoek]) {
      const woord = String(w || '').trim();
      if (woord.length < 4) continue;
      const re = new RegExp(woord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-_\s]+/g, '[-_\\s]*'), 'i');
      base = base.replace(re, ' ');
    }
  }
  return base.replace(/[-_\s]+/g, ' ').trim().replace(/\s+/g, '-');
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
    const stem = guessShot(en.file.name) ? stemOf(en.file.name) : (guessHoekVak(en.file.name) ? hoekStem(en.file.name) : '');
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

/**
 * Een bijbestelde hoek uit een bestandsnaam: "hoodie-driekwart.jpg" → het vak
 * van de hoek Driekwart (extra1, extra2, … — welk nummer hangt af van de keuze
 * in stap 1, zie hoekVakken()). Herkent de getoonde naam én de id van de hoek,
 * dus ook "three-quarter" en "flat_lay". Null als er geen gekozen hoek in de
 * naam staat. Ronde 9, F23.
 */
function guessHoekVak(name) {
  const plat = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  const naam = plat(String(name || '').replace(/\.[a-z0-9]{1,5}$/i, ''));
  if (!naam) return null;
  const vak = hoekVakken().find((v) => [v.naam, v.hoek].some((w) => { const p = plat(w); return p.length >= 4 && naam.includes(p); }));
  return vak ? vak.id : null;
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
    /* ── EEN NAAM DIE EEN HOEK NOEMT, GAAT NAAR DIE HOEK OF NAAR DE BAK ────────
       2 oktober 2026 (ronde 9, F23/F26). Twee fouten op één regel:
       · "cargo-olijf-driekwart.jpg" werd niet herkend als de bijbestelde hoek
         Driekwart — guessShot() kent alleen de vaste vier — en belandde in de
         bak, waar het menu die hoek niet eens aanbood;
       · stond het geraden vak al vol, dan ging het bestand stil naar het
         eerste LEGE vak. Live kwam zo een achterkant als voorkant binnen en een
         voorkant als "gedragen". Een naam die zegt welke hoek het is, gaat nu
         naar die hoek of naar de bak; alleen een naam die niets zegt, vult het
         eerste lege vak. */
    const guess = guessShot(en.file.name) || guessHoekVak(en.file.name);
    /* Een bestand met DEZELFDE naam als wat er al in het geraden vak zit, is een
       nieuwe versie van die foto (live: eerst een map met te kleine foto's, dan
       dezelfde map opnieuw op volle grootte). Dat vervangt; alles anders dat op
       een vol vak landt, gaat naar de bak in plaats van stil een ander vak te
       vullen. Nagespeeld met kladblok/_r9-f26.mjs. */
    const zelfdeNaam = guess && card.slots[guess] && card.slots[guess].file
      && card.slots[guess].file.name === en.file.name;
    const id = guess ? ((slotOpen(card, guess) || zelfdeNaam) ? guess : null) : firstOpenSlot(card);
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
  /* Een kaart die weggaat, gaat ook uit zijn look (levering 60). */
  ontkoppelAlles(card);
  card.lookVast = '';
  SHOT_IDS.forEach((id) => {
    const s = card.slots[id];
    // Back to the tray rather than to the bin. The customer answered a question
    // about the order, not a question about this photograph.
    if (s.file && s.status !== 'failed' && isEchtBestand(s.file)) trayAdd(s.file);
    clearSlot(card, id);
  });
  if (card.el) card.el.remove();
  cards = cards.filter((x) => x !== card);
}

function buildCard(card) {
  const li = document.createElement('li');
  li.className = 'pu-card';
  li.id = `pu-kaart-${card.key}`;
  /* De eerste kaart draagt de uitleg (een regel per vak, de tip bij het detail,
     de volgorde van kiezen); de rest alleen de namen. Een klasse uit card.n en
     geen :first-child in CSS — zie de noot bij de uitleg in buildSlot(). */
  if (card.n === 1) li.classList.add('is-uitleg');

  const head = document.createElement('div');
  head.className = 'pu-head';

  /* De tekst wordt in paintCard() gezet en niet hier: hij noemt ook het TOTAAL
     ("01 / 06"), en dat totaal verandert zodra er een product bij of af gaat. */
  const num = document.createElement('span');
  num.className = 'pu-n';

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

  const state = document.createElement('span');
  state.className = 'pu-state';

  /* ── EN WEER WEG — 4 september 2026 ──────────────────────────────────────
     Een product dat je per ongeluk toevoegde, moet je kunnen terugnemen. Alleen
     de LAATSTE kaart draagt de knop, en alleen boven het bestelde aantal (zie
     minCards): de kaarten heten `p1`, `p2`, `p3` en die sleutel staat bij elke
     geüploade foto in R2, dus uit het midden weghalen zou hernummeren vragen.
     Foto's op een kaart die weggaat, vallen in de bak (`trayAdd` in dropCard). */
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

  /* ── DE PRODUCTSOORT STAAT ÓP DE KAART — 11 oktober 2026 (F3) ────────────
     Stond onderaan stap 2 in "Wat je opstuurt", met een keuze voor de hele
     bestelling en een afwijking per rij. Nu staat hij in de kop van de kaart en
     neemt hij die van het vorige product over (zie syncSoorten). */
  const soort = buildSoort(card);

  head.append(num, input);
  if (soort) head.append(soort);
  head.append(state, weg);

  /* ── ÉÉN KNOP VOOR DE FOTO'S VAN DIT PRODUCT — 11 oktober 2026 (F3) ──────── */
  const kies = buildKies(card);

  const slots = document.createElement('div');
  slots.className = 'pu-slots';
  slots.id = `pu-slots-${card.key}`;
  SHOT_IDS.forEach((id) => slots.appendChild(buildSlot(card, id)));

  /* ── ALLES WAT NIET HOEFT, IN ÉÉN LADE: "MEER OVER DIT PRODUCT" ────────────
   *
   * 9 september 2026: "een kaart toont wat anders is, niet alles". Sinds
   * 11 oktober (F3) gaat dat een stap verder. Lucas koos: het gezicht kies je één
   * keer in stap 1, en per product afwijken kan onder een ingeklapt "Meer over
   * dit product" — en daar ook de rest van wat er per product gevraagd wordt en
   * niet verplicht is:
   *
   *   het gezicht     buildModelKeuze() — stond open op de kaart
   *   materiaal, kleur buildAbout() (attributes.js), met 4K en "kopieer naar
   *                   alle producten" op de eerste kaart
   *   de verhouding   buildRatios(), alleen bij lifestyle
   *   meer foto's     buildRefs() — de gratis referentievakken, stonden open
   *   erbij in beeld  buildErbij() — de contextstukken uit "Wat je opstuurt"
   *
   * De knop draagt de samenvatting van wat afwijkt, dus wie niets bijzonders
   * heeft ziet "Volgt de bestelling" en scrolt door. */
  const gezicht = buildModelKeuze(card);
  const about = buildAbout(card);
  const ratios = buildRatios(card);
  const refs = buildRefs(card);
  /* "Waarmee draagt het model dit?" staat sinds 17 oktober 2026 (levering 60,
     c-erbij) niet meer in de lade maar onder de foto's: hier denkt een klant aan
     de styling, en hier kiest hij welke stukken samen een look zijn. */
  const erbij = buildErbij(card);
  const meer = buildMeer(card, [gezicht, about, ratios, refs]);

  li.append(head);
  if (kies) li.append(kies);
  li.append(slots);
  if (erbij) li.append(erbij);
  li.append(meer);
  card.el = li;
  /* Het raster wordt later nog aangeraakt: syncHoekVakken() hangt er een vak in
     zodra er een hoek bij komt. */
  card.slotsEl = slots;
  card.numEl = num;
  card.input = input;
  card.stateEl = state;
  /* Er is geen inklapper meer: alle kaarten staan open onder elkaar en de balk
     bovenaan springt. paintCard() leest card.toggleEl nog null-veilig. */
  card.toggleEl = null;
  /* Een kaart die NU gebouwd wordt terwijl er al hoeken gekozen zijn — dat
     gebeurt zodra iemand het aantal producten verhoogt — krijgt zijn hoekvakken
     meteen mee. Zonder deze regel is de nieuwe kaart de enige zonder. */
  syncHoekVakken(card);
  paintCard(card);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DE KAART PER PRODUCT — 11 OKTOBER 2026 (F3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas vond stap 2 "moeizaam en chaotisch". Gemeten met vijf catalogproducten:
 * vijftien keer een fotokiezer (elk vak één foto), vijf keer verplicht "Sla deze
 * over", het gezicht twee keer per product en ±1.000 woorden. Hij koos
 * (afvinklijst 2, form = a) één kaart per product met:
 *
 *   ÉÉN KNOP voor 3–4 foto's tegelijk (buildKies). Ze vallen vanzelf in de vakken
 *     — eerst waar de bestandsnaam het zegt (guessShot), dan in de volgorde van
 *     kiezen: voorkant, achterkant, detail, gedragen, de bijbestelde hoeken —
 *     en wat er daarna over is in de gratis referentievakken (verdeelFotos).
 *   OMWISSELEN met één keuze per vak (wisselVakken). Een losse foto bijzetten of
 *     vervangen per vak blijft gewoon kunnen.
 *   DE PRODUCTSOORT op de kaart, die die van het vorige product overneemt
 *     (buildSoort, syncSoorten).
 *   DE DRAAGFOTO overslaan zonder klik: leeg is overgeslagen, met de aanname
 *     erbij ("Zonder draagfoto gaan we uit van een normale, rechte pasvorm").
 *
 * Uploads gaan precies zoals ervoor: elke foto apart, met product_key en shot,
 * door placeFile() → sendSlot() — met de herhaalpogingen, de voortgang, de
 * beeldkeuring en de daggrens. Er is aan de server niets veranderd.
 */

/** De knop "Kies de foto's van dit product", met zijn eigen meervoudige kiezer. */
function buildKies(card) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-kies';

  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'btn btn-primary pu-kies-knop';
  knop.dataset.puKies = card.key;
  knop.textContent = c('pu.kies');
  knop.setAttribute('aria-label', `${c('pu.kies')} — ${c('pu.product', { n: card.n })}`);

  /* `multiple` werkt ook op een telefoon: iOS en Android laten in de fotolijst
     meerdere foto's aantikken, in de volgorde waarin je ze aantikt. Uit de
     tabvolgorde: de knop is wat je bedient, het veld is wat hij opent. */
  const file = document.createElement('input');
  file.type = 'file';
  file.multiple = true;
  file.accept = 'image/*';
  file.className = 'pu-kies-input';
  file.tabIndex = -1;
  file.setAttribute('aria-hidden', 'true');
  file.addEventListener('change', () => {
    const gekozen = [...(file.files || [])];
    file.value = '';
    if (gekozen.length) verdeelFotos(card, gekozen);
  });
  knop.addEventListener('click', () => file.click());

  wrap.append(knop, file);

  /* De volgorde van kiezen, één keer, op de eerste kaart. */
  if (card.n === 1) {
    const hint = document.createElement('p');
    hint.className = 'pu-kies-hint';
    hint.textContent = c('pu.kiesHint');
    wrap.appendChild(hint);
  }
  card.kiesKnop = knop;
  return wrap;
}

/**
 * Een handvol foto's over de vakken van één kaart verdelen.
 *
 * VUL ALLEEN LEGE VAKKEN. Wie al een voorkant heeft en er nog drie kiest, bedoelt
 * de drie die nog ontbreken — niet een nieuwe voorkant. Vervangen doe je per vak.
 *
 * EERST DE NAAM, DAN DE VOLGORDE. Een bestand dat "achterkant" of "back" heet,
 * gaat naar de achterkant als die leeg is (dezelfde guessShot() als de map-route).
 * Een naam als IMG_0234 zegt niets; die volgen de volgorde van kiezen. Wat er
 * over blijft, gaat naar de gratis referentievakken, en pas daarna naar de bak
 * "Nog niet geplaatst" — weggegooid wordt er niets.
 */
function verdeelFotos(card, bestanden) {
  const volgorde = [...SHOT_IDS, ...hoekVakIds()].filter((id) => card.slots[id]);
  const vrij = (id) => card.slots[id] && slotOpen(card, id);
  const rest = [];
  const geplaatst = new Set();

  bestanden.forEach((f) => {
    const raad = guessShot(f.name) || guessHoekVak(f.name);
    if (raad && volgorde.includes(raad) && vrij(raad) && !geplaatst.has(raad)) {
      placeFile(card, raad, f);
      geplaatst.add(raad);
    } else {
      rest.push(f);
    }
  });

  const over = [];
  rest.forEach((f) => {
    const id = volgorde.find((v) => vrij(v) && !geplaatst.has(v));
    if (id) { placeFile(card, id, f); geplaatst.add(id); } else { over.push(f); }
  });

  /* Meer foto's dan vakken: de gratis referentievakken, zolang er plek is. */
  const max = Math.max(0, Math.floor(Number(cfg.maxRefPerProduct) || 0));
  over.forEach((f) => {
    let id = '';
    for (let i = 1; i <= (card.refs || 0); i += 1) {
      const rid = refShotId(i);
      if (card.slots[rid] && slotOpen(card, rid)) { id = rid; break; }
    }
    if (!id && card.voegRefToe && (card.refs || 0) < max) id = card.voegRefToe();
    if (id) placeFile(card, id, f); else trayAdd(f);
  });

  /* Zijn er referentievakken bijgekomen, dan staat de lade open: anders staat de
     foto in een vak dat je niet ziet. */
  if (over.length && card.meerKnop && !card.meerOpen) { card.meerOpen = true; paintMeer(card); }
  refreshUploader();
}

/**
 * Twee vakken van plaats wisselen.
 *
 * DE SERVER VERANDERT NIET, dus wisselen is: beide bestanden opnieuw plaatsen.
 * placeFile() haalt het oude object weg (DELETE) en stuurt het bestand opnieuw met
 * het nieuwe `shot` — precies wat er ook gebeurt als je per vak vervangt. Een
 * upload die nog onderweg was, landt in een vak dat niet meer bestaat en wordt
 * door verstuurSlot() meteen weer weggehaald (`live()`).
 *
 * Alleen met bestanden die deze pagina zelf nog heeft. Een foto die na het
 * terugkomen uit de opslag is hersteld (1.04), is er alleen als sleutel; die kan
 * niet opnieuw verstuurd worden en staat daarom niet in het wissellijstje.
 */
function wisselVakken(card, a, b) {
  const sa = card.slots[a];
  const sb = card.slots[b];
  if (!sa || !sb || a === b) return;
  const fa = isEchtBestand(sa.file) ? sa.file : null;
  const fb = isEchtBestand(sb.file) ? sb.file : null;
  if ((sa.file && !fa) || (sb.file && !fb)) return;
  if (!fa && !fb) return;
  if (fb) placeFile(card, a, fb); else clearSlot(card, a);
  if (fa) placeFile(card, b, fa); else clearSlot(card, b);
  refreshUploader();
  /* De blik naar het vak waar de foto nu staat: wie met het toetsenbord wisselt,
     staat anders op een keuzelijst die net is leeggemaakt. */
  const doel = card.slots[b] && card.slots[b].el;
  if (doel && doel.btn) { try { doel.btn.focus({ preventScroll: true }); } catch { /* ok */ } }
}

/** Een File (of Blob) die we opnieuw kunnen versturen — geen herstelde sleutel. */
function isEchtBestand(f) {
  return typeof Blob !== 'undefined' && f instanceof Blob;
}

/**
 * Het wissellijstje van één vak bijwerken: alle andere vaste vakken en
 * hoekvakken op deze kaart, met wat erin zit. Alleen zichtbaar als dit vak een
 * foto heeft die we opnieuw kunnen versturen.
 */
function paintWissel(card, id) {
  const s = card.slots[id];
  const sel = s && s.el && s.el.wissel;
  if (!sel) return;
  const kan = isEchtBestand(s.file) && s.status !== 'failed';
  sel.hidden = !kan;
  if (!kan) return;
  const anderen = [...SHOT_IDS, ...hoekVakIds()]
    .filter((x) => x !== id && card.slots[x] && card.slots[x].el)
    .filter((x) => !card.slots[x].file || isEchtBestand(card.slots[x].file));
  const sig = anderen.map((x) => `${x}:${shotLabel(x)}`).join('|');
  if (sel.dataset.sig === sig) return;
  sel.dataset.sig = sig;
  sel.textContent = '';
  const leeg = document.createElement('option');
  leeg.value = '';
  leeg.textContent = c('pu.wissel');
  sel.appendChild(leeg);
  anderen.forEach((x) => {
    const o = document.createElement('option');
    o.value = x;
    o.textContent = c('pu.wisselMet', { shot: shotLabel(x).toLocaleLowerCase() });
    sel.appendChild(o);
  });
  sel.value = '';
}

/* ── DE PRODUCTSOORT ─────────────────────────────────────────────────────── */

/**
 * De keuzelijst op de kaart. `garment_pN`, zoals de rijen in "Wat je opstuurt"
 * hem al postten; /api/order leest hem tegen het type van de bestelling
 * (`garment`, een verborgen veld dat syncSoorten() op het eerste product zet) en
 * gooit een gelijke waarde weg. Er verandert aan de server dus niets.
 *
 * NEEMT DIE VAN HET VORIGE PRODUCT OVER zolang de klant hier niet zelf iets
 * kiest: een merk stuurt meestal twaalf keer hetzelfde soort. Wie hier wél kiest,
 * zet `card.soortEigen`, en vanaf dan volgt deze kaart niet meer.
 */
function buildSoort(card) {
  /* Niet op de €1-proef: daar stond "Wat je opstuurt" ook nooit (zie OrderFlow,
     `!isSample`). Eén product, één beeld, wij kiezen de styling. */
  if (cfg.sample) return null;
  if (!cfg.styling || !Array.isArray(cfg.styling.garments) || !cfg.styling.garments.length) return null;
  const wrap = document.createElement('label');
  wrap.className = 'pu-soort';
  const t = document.createElement('span');
  t.className = 'pu-sr';
  t.textContent = `${c('pu.soort')} — ${c('pu.product', { n: card.n })}`;
  const sel = document.createElement('select');
  sel.className = 'select pu-soort-sel';
  sel.name = `garment_${card.key}`;
  const leeg = document.createElement('option');
  leeg.value = '';
  leeg.textContent = c('pu.soortKies');
  sel.appendChild(leeg);
  cfg.styling.garments.forEach((g) => {
    const o = document.createElement('option');
    o.value = g.id;
    o.textContent = g.naam;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    card.soortEigen = true;
    /* Een andere soort past niet meer op dezelfde plekken: de look gaat los. */
    ontkoppelAlles(card);
    syncSoorten();
    vulLookVast(card);
    naLookWijziging(card);
    paintMeer(card);
  });
  wrap.append(t, sel);
  card.soortEl = sel;
  card.soortEigen = false;
  return wrap;
}

/** De soort van dit product: wat er staat, of '' zolang er niets gekozen is. */
function soortVan(card) {
  return card && card.soortEl ? card.soortEl.value : '';
}

/**
 * Elke kaart die niet zelf gekozen heeft, krijgt de soort van de kaart erboven.
 * Daarna het verborgen veld `garment` voor de hele bestelling: de soort van het
 * eerste product, zodat de server een geldig type heeft om tegen te lezen.
 */
function syncSoorten() {
  if (cfg.sample || !cfg.styling) return;
  let vorige = '';
  cards.forEach((card) => {
    if (!card.soortEl) return;
    if (!card.soortEigen && vorige && card.soortEl.value !== vorige) {
      card.soortEl.value = vorige;
      ontkoppelAlles(card);
      paintErbij(card);
    }
    vorige = card.soortEl.value || vorige;
  });
  let veld = q('input[name="garment"]');
  const eerste = cards[0] ? soortVan(cards[0]) : '';
  if (!veld) {
    veld = document.createElement('input');
    veld.type = 'hidden';
    veld.name = 'garment';
    form.appendChild(veld);
  }
  veld.value = eerste;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * WAARMEE DRAAGT HET MODEL DIT? — 17 oktober 2026 (levering 60, afvinklijst 38)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hier stond "Erbij in beeld", verstopt in Meer over dit product: per plek in
 * het beeld (de schoen onder een broek, de broek onder een hoodie) een
 * uploadvakje, en een verborgen veld `context_<plek>_pN` dat `own` was zodra er
 * een foto in zat en anders `ours`. De outfit van € 50 stond los daarvan, als
 * getal in stap 1. Twee ideeën over bijna hetzelfde, op twee plekken.
 *
 * Nu staat het onder de foto's van elk product, met per plek drie keuzes als
 * één vorm met de snede ertussen (c-erbij):
 *
 *   Wij kiezen          effen, één kleur, een andere toon (gratis)     → ours
 *   Eigen stuk          je eigen stuk als bijzaak, met een foto        → own
 *   Uit je bestelling   een ander product uit deze bestelling: samen   → look
 *                       een complete look (€ 50 per look, lifestyle)
 *
 * Catalog krijgt alleen de eerste twee: daar bestaan geen looks.
 *
 * ── DE STAAT STAAT OP DE KAART ──────────────────────────────────────────────
 *
 * `card.plek[plek] = { keuze: 'wij'|'eigen'|'uit', bron: '<kaartsleutel>' }`.
 * Een look is wat er via `bron` aan elkaar hangt (kaartLooks), en de letter volgt
 * de volgorde van het eerste product, net als op de server (schoonLooks in
 * looks.js). Koppel je de hoodie aan de broek, dan staat de broek ook bij de
 * hoodie: de koppeling gaat twee kanten op (koppel), zodat je een look één keer
 * samenstelt. Niets hiervan staat bovenaan het bestand: alleen functies, die in
 * init() pas worden aangeroepen als de kaarten bestaan (zie de noot bij boot).
 *
 * ── WAT ER WORDT VERSTUURD ─────────────────────────────────────────────────
 *
 * Dezelfde velden als altijd (`context_<plek>_pN`), met `look` als derde waarde,
 * plus `look_pN` (de letter) en `look_notitie_<letter>`. De server rekent en
 * controleert alles opnieuw; zie de kop van src/data/looks.js.
 */
function lookAan() {
  return !!(cfg && cfg.look) && kindOf() === 'lifestyle';
}

function lookPrijs() {
  return Number((cfg && cfg.look && cfg.look.prijs) || 0);
}

function lookBeeldenNu() {
  return lookCount() * Number((cfg && cfg.look && cfg.look.beelden) || 0);
}

function erbijTekst() {
  return (cfg && cfg.erbij) || {};
}

function plekStaat(card, plek) {
  if (!card.plek) card.plek = {};
  if (!card.plek[plek]) card.plek[plek] = { keuze: 'wij', bron: '' };
  return card.plek[plek];
}

function kaartMetKey(key) {
  return cards.find((k) => k.key === key) || null;
}

/** De plekken van deze kaart, uit de soort (garments.js via CTX_BY_GARMENT). */
function plekkenVan(card) {
  const type = soortVan(card);
  return (type && CTX_BY_GARMENT[type]) || [];
}

/**
 * De looks zoals ze nu op de kaarten staan: [{ letter, kaarten: [card, …] }].
 * Wat via een `bron` aan elkaar hangt, is één look; een groep van één is geen
 * look. Alleen bij lifestyle.
 */
function kaartLooks() {
  if (!lookAan()) return [];
  const ouder = new Map(cards.map((k) => [k.key, k.key]));
  const wortel = (x) => {
    let r = x;
    while (ouder.get(r) !== r) r = ouder.get(r);
    return r;
  };
  cards.forEach((k) => {
    const mag = plekkenVan(k);
    Object.entries(k.plek || {}).forEach(([plek, st]) => {
      if (!mag.includes(plek) || st.keuze !== 'uit' || !st.bron || !ouder.has(st.bron)) return;
      ouder.set(wortel(st.bron), wortel(k.key));
    });
  });
  /* Een indeling die uit een kopie komt (zetLookIndeling): die stukken horen samen,
     ook voordat de plekken zijn ingevuld. */
  const vast = new Map();
  cards.forEach((k) => {
    if (!k.lookVast) return;
    if (vast.has(k.lookVast)) ouder.set(wortel(k.key), wortel(vast.get(k.lookVast)));
    else vast.set(k.lookVast, k.key);
  });
  const groep = new Map();
  cards.forEach((k) => {
    const w = wortel(k.key);
    if (!groep.has(w)) groep.set(w, []);
    groep.get(w).push(k);
  });
  const letters = String(cfg.look.letters || 'ABCDEFGHIJ');
  /* Dezelfde controle als de server (lookKlopt): een groep die daar niet door komt
     (twee broeken, na een andere soort), telt hier ook niet als look. */
  return [...groep.values()]
    .filter((g) => g.length > 1 && lookKlopt(g.map((k) => ({ n: k.n, garment: soortVan(k) || 'other', context: plekContext(k) }))).ok)
    .sort((a, b) => a[0].n - b[0].n)
    .map((kaarten, i) => ({ letter: letters[i] || '', kaarten }));
}

function lookVanKaart(card, looks = kaartLooks()) {
  return looks.find((l) => l.kaarten.includes(card)) || null;
}

/** De keuzes per plek van een kaart in de vorm van looks.js (voor lookKlopt). */
function plekContext(card, extra = {}) {
  const uit = {};
  plekkenVan(card).forEach((plek) => {
    const st = plekStaat(card, plek);
    uit[plek] = st.keuze === 'uit' && st.bron ? 'look' : 'ours';
  });
  return { ...uit, ...extra };
}

/**
 * Mag `q` op plek `plek` van kaart `p`? { mag, waarom }.
 * Dezelfde regels als de server (b-regels): het stuk past op die plek, zit niet
 * al in een andere look, de look wordt niet groter dan drie, en er komen geen
 * twee stukken op dezelfde plek.
 */
function magOpPlek(p, plek, q, looks = kaartLooks()) {
  const t = erbijTekst();
  if (!q || q === p || !pastOp(plek, soortVan(q) || 'other')) return { mag: false };
  const lp = lookVanKaart(p, looks);
  const lq = lookVanKaart(q, looks);
  if (lq && lp && lq === lp) return { mag: true };
  if (lq) return { mag: false, waarom: String(t.alInLook || '').replace('{l}', lq.letter) };
  const leden = lp ? lp.kaarten : [p];
  if (leden.length + 1 > Number(cfg.look.max || 3)) return { mag: false, waarom: t.vol || '' };
  const proef = [...leden, q].map((k) => ({
    n: k.n,
    garment: soortVan(k) || 'other',
    context: plekContext(k, k === p ? { [plek]: 'look' } : {}),
  }));
  const oordeel = lookKlopt(proef);
  if (!oordeel.ok && oordeel.waarom === 'dubbel') return { mag: false, waarom: t.dubbel || '' };
  return { mag: true };
}

/** Koppel kaart q op plek `plek` van kaart p, en de andere kant op als dat past. */
function koppel(p, plek, q) {
  ontkoppel(p, plek);
  const st = plekStaat(p, plek);
  st.keuze = 'uit';
  st.bron = q.key;
  /* De laag eronder koppelt niet terug: de hoodie zit niet "onder" het T-shirt. */
  if (plek === 'underlayer') return;
  const terug = plekkenVan(q).find((x) => x !== 'underlayer' && pastOp(x, soortVan(p) || 'other'));
  if (terug) {
    const t = plekStaat(q, terug);
    if (!t.bron || !kaartMetKey(t.bron)) { t.keuze = 'uit'; t.bron = p.key; }
  }
}

/** Haal het stuk van plek `plek` van kaart p weg, en de koppeling terug. De keuze blijft "Uit je bestelling". */
function ontkoppel(p, plek) {
  const st = plekStaat(p, plek);
  const q = st.bron ? kaartMetKey(st.bron) : null;
  st.bron = '';
  if (!q) return;
  Object.values(q.plek || {}).forEach((t) => {
    if (t.bron === p.key) { t.bron = ''; t.keuze = 'wij'; }
  });
}

/** Alles van en naar deze kaart los: bij een andere soort, of als de kaart weggaat.
    Een indeling uit een kopie (lookVast) blijft: die gaat pas weg met de kaart of
    met "Haal de look uit elkaar". */
function ontkoppelAlles(p) {
  Object.values(p.plek || {}).forEach((st) => {
    if (st.keuze === 'uit') st.keuze = 'wij';
    st.bron = '';
  });
  cards.forEach((k) => Object.values(k.plek || {}).forEach((t) => {
    if (t.bron === p.key) { t.bron = ''; t.keuze = 'wij'; }
  }));
}

/** "Haal de look uit elkaar": elke koppeling binnen de look los, terug op Wij kiezen. */
function lookUitElkaar(look) {
  look.kaarten.forEach((k) => {
    k.lookVast = '';
    Object.values(k.plek || {}).forEach((st) => {
      if (st.bron) { st.bron = ''; st.keuze = 'wij'; }
    });
  });
}

/**
 * Een stuk uit een gekopieerde indeling krijgt zijn soort: vul de plekken waar
 * precies één ander stuk uit dezelfde groep op past, zolang de klant daar nog
 * niets koos. Zo staat de look er weer zodra de soorten er zijn.
 */
function vulLookVast(card) {
  if (!card || !card.lookVast || !lookAan()) return;
  const leden = cards.filter((k) => k !== card && k.lookVast === card.lookVast);
  plekkenVan(card).forEach((plek) => {
    const st = plekStaat(card, plek);
    if (st.bron || st.keuze !== 'wij') return;
    const past = leden.filter((o) => pastOp(plek, soortVan(o) || 'other'));
    if (past.length === 1 && magOpPlek(card, plek, past[0]).mag) koppel(card, plek, past[0]);
  });
  leden.forEach((o) => plekkenVan(o).forEach((plek) => {
    const st = plekStaat(o, plek);
    if (st.bron || st.keuze !== 'wij') return;
    const past = [card, ...leden].filter((x) => x !== o && pastOp(plek, soortVan(x) || 'other'));
    if (past.length === 1 && magOpPlek(o, plek, past[0]).mag) koppel(o, plek, past[0]);
  }));
}

/* De velden die meegaan: per plek ours/own/look, per kaart de letter, per look de notitie. */
function syncPlekVelden(card, looks = kaartLooks()) {
  const st = card && card.erbij;
  if (!st) return;
  const look = lookVanKaart(card, looks);
  plekkenVan(card).forEach((plek) => {
    const spec = cfg.styling.slots[plek];
    const veld = spec && st.velden[spec.shot];
    if (!veld) return;
    const p = plekStaat(card, plek);
    let waarde = 'ours';
    if (p.keuze === 'uit' && p.bron && look && look.kaarten.some((k) => k.key === p.bron)) waarde = 'look';
    else if (p.keuze === 'eigen' && slotFilled(card, spec.shot) && card.slots[spec.shot].status !== 'failed') waarde = 'own';
    veld.value = waarde;
  });
  if (st.lookVeld) st.lookVeld.value = look ? look.letter : '';
}

function syncLookNotities(looks = kaartLooks()) {
  let host = q('[data-wk-look-notities]');
  if (!host && form) {
    host = document.createElement('div');
    host.hidden = true;
    host.dataset.wkLookNotities = '';
    form.appendChild(host);
  }
  if (!host) return;
  host.textContent = '';
  looks.forEach((l) => {
    const tekst = (l.kaarten.find((k) => k.lookNotitie) || {}).lookNotitie || '';
    if (!tekst.trim()) return;
    const v = document.createElement('input');
    v.type = 'hidden';
    v.name = `look_notitie_${l.letter}`;
    v.value = tekst.trim().slice(0, Number(cfg.look.notitieMax) || 300);
    host.appendChild(v);
  });
}

function buildErbij(card) {
  if (cfg.sample || !cfg.styling || !cfg.styling.slots) return null;
  const t = erbijTekst();
  const wrap = document.createElement('div');
  wrap.className = 'wk-draagt';
  const label = document.createElement('p');
  label.className = 'wk-label wk-draagt-label';
  label.setAttribute('aria-hidden', 'true');
  label.append(document.createElement('i'), document.createTextNode(t.label || ''));
  const h = document.createElement('h3');
  h.className = 'wk-draagt-h';
  h.id = `wk-draagt-h-${card.key}`;
  h.textContent = t.kop || c('pu.erbijH');
  const zin = document.createElement('p');
  zin.className = 'wk-draagt-zin';
  const rijen = document.createElement('div');
  rijen.className = 'wk-plekken';
  const kaart = document.createElement('div');
  kaart.className = 'wk-lookkaart-host';
  const hint = document.createElement('p');
  hint.className = 'wk-uitleg wk-draagt-hint';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-labelledby', h.id);
  wrap.append(label, h, zin, rijen, kaart, hint);
  /* De letter van de look, voor de server. */
  const lookVeld = document.createElement('input');
  lookVeld.type = 'hidden';
  lookVeld.name = `look_${card.key}`;
  wrap.appendChild(lookVeld);
  card.erbij = { wrap, rij: rijen, rijen, kaart, hint, zin, lookVeld, slotIds: [], velden: {}, plekEl: {} };

  /* Eén luisteraar per kaart: de knoppen worden bij elke verandering opnieuw getekend. */
  wrap.addEventListener('click', (e) => {
    const knop = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!knop || !wrap.contains(knop)) return;
    const plek = knop.dataset.wkPlek;
    if (knop.dataset.wkK && plek) {
      const st = plekStaat(card, plek);
      const k = knop.dataset.wkK;
      if (k !== 'uit' && st.bron) ontkoppel(card, plek);
      st.keuze = k;
      naLookWijziging(card, `[data-wk-plek="${plek}"][data-wk-k="${k}"]`);
      return;
    }
    if (knop.dataset.wkStuk && plek) {
      const q2 = kaartMetKey(knop.dataset.wkStuk);
      const st = plekStaat(card, plek);
      if (q2 && st.bron === q2.key) ontkoppel(card, plek);
      else if (q2 && magOpPlek(card, plek, q2).mag) koppel(card, plek, q2);
      naLookWijziging(card, `[data-wk-plek="${plek}"][data-wk-stuk="${knop.dataset.wkStuk}"]`);
      return;
    }
    if (knop.dataset.wkToe && plek) {
      lookStukToevoegen(card, plek);
      return;
    }
    if (knop.hasAttribute('data-wk-uit-elkaar')) {
      const look = lookVanKaart(card);
      if (look) lookUitElkaar(look);
      naLookWijziging(card, `[data-wk-plek] [data-wk-k="wij"]`);
    }
  });
  wrap.addEventListener('input', (e) => {
    const veld = e.target;
    if (!veld || !veld.hasAttribute || !veld.hasAttribute('data-wk-look-notitie')) return;
    const look = lookVanKaart(card);
    (look ? look.kaarten : [card]).forEach((k) => {
      k.lookNotitie = veld.value;
      /* Dezelfde look staat op elke kaart van de look: de andere velden lopen mee,
         zonder die kaarten opnieuw te tekenen (dan zou de blik hier wegspringen). */
      const ander = k !== card && k.erbij ? k.erbij.wrap.querySelector('[data-wk-look-notitie]') : null;
      if (ander) ander.value = veld.value;
    });
    syncLookNotities();
    bewaarConcept();
  });
  return wrap;
}

/** Na elke keuze: alle kaarten opnieuw (een look raakt er meer dan één), het totaal en de balk. */
function naLookWijziging(card, focusSel) {
  cards.forEach(paintErbij);
  syncLookNotities();
  paintRail();
  syncTotal();
  syncSummaries();
  bewaarConcept();
  if (focusSel && card && card.erbij) {
    const doel = card.erbij.wrap.querySelector(focusSel);
    if (doel) { try { doel.focus({ preventScroll: true }); } catch { /* ok */ } }
  }
}

/**
 * "Schoenen toevoegen" bij Uit je bestelling (c-toevoegen): één product erbij,
 * het aantal en het totaal lopen mee, het krijgt de soort die op die plek past en
 * zit meteen in de look. De klant blijft bij het product waar hij was.
 */
function lookStukToevoegen(card, plek) {
  if (!kanErbij()) return;
  const n = productCount();
  const sel = q('select[name="products"]');
  if (!Number.isInteger(n) || !sel) return;
  telViaKnop = true;
  sel.value = String(n + 1);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  telViaKnop = false;
  syncAddKnop();
  const nieuw = cards[cards.length - 1];
  const soort = (cfg.erbij && cfg.erbij.toeSoort && cfg.erbij.toeSoort[plek]) || '';
  if (nieuw && nieuw !== card && nieuw.soortEl && soort) {
    nieuw.soortEl.value = soort;
    nieuw.soortEigen = true;
    syncSoorten();
    paintErbij(nieuw);
    if (magOpPlek(card, plek, nieuw).mag) koppel(card, plek, nieuw);
  }
  const i = cards.indexOf(card);
  if (i >= 0 && rijNu !== i) naarKaart(i, false);
  naLookWijziging(card, `[data-wk-plek="${plek}"][data-wk-stuk="${nieuw ? nieuw.key : ''}"]`);
}

/** Het plaatje van een kaart voor de stukjes: de voorkant als die er is. */
function kaartDuim(k) {
  const span = document.createElement('span');
  span.className = 'wk-duim';
  span.setAttribute('aria-hidden', 'true');
  const sl = k && k.slots && (k.slots.front || k.slots.worn);
  if (sl && sl.url && sl.thumb) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = sl.url;
    span.appendChild(img);
  } else {
    span.classList.add('is-leeg');
    span.textContent = String(k ? k.n : '').padStart(2, '0');
  }
  return span;
}

function soortNaam(k) {
  const g = (cfg.styling.garments || []).find((x) => x.id === soortVan(k));
  return g ? g.naam : '';
}

function paintErbij(card) {
  const st = card && card.erbij;
  if (!st) return;
  const t = erbijTekst();
  const type = soortVan(card);
  const plekken = plekkenVan(card);
  const looks = kaartLooks();
  const metLook = lookAan();
  const look = lookVanKaart(card, looks);
  const wil = plekken.map((p) => cfg.styling.slots[p] && cfg.styling.slots[p].shot).filter(Boolean);
  st.zin.textContent = metLook ? (t.zin || '') : (t.zinCatalog || t.zin || '');

  /* Vakjes van een plek die er niet meer bij hoort: weg, met het bestand terug
     in de bak, net als bij een hoek die uit gaat. */
  for (const id of [...st.slotIds]) {
    if (wil.includes(id)) continue;
    const sl = card.slots[id];
    if (sl) {
      if (sl.file && sl.status !== 'failed' && isEchtBestand(sl.file)) trayAdd(sl.file);
      clearSlot(card, id);
      if (sl.el && sl.el.wrap) sl.el.wrap.remove();
      delete card.slots[id];
    }
    if (st.velden[id]) { st.velden[id].remove(); delete st.velden[id]; }
    st.slotIds = st.slotIds.filter((x) => x !== id);
  }
  Object.keys(st.plekEl).forEach((plek) => {
    if (!plekken.includes(plek)) { st.plekEl[plek].remove(); delete st.plekEl[plek]; }
  });

  plekken.forEach((plek) => {
    const spec = cfg.styling.slots[plek];
    if (!spec) return;
    const id = spec.shot;
    /* De rij van deze plek: één keer gebouwd, daarna alleen bijgewerkt. */
    let rij = st.plekEl[plek];
    if (!rij) {
      rij = document.createElement('div');
      rij.className = 'wk-plek';
      rij.dataset.wkPlekRij = plek;
      const naam = document.createElement('p');
      naam.className = 'wk-plek-naam';
      const b = document.createElement('b');
      b.textContent = spec.naam;
      const small = document.createElement('small');
      small.textContent = spec.waar || '';
      naam.append(b, small);
      const binnen = document.createElement('div');
      binnen.className = 'wk-plek-in';
      const drie = document.createElement('div');
      drie.className = 'wk-drie';
      drie.setAttribute('role', 'group');
      drie.setAttribute('aria-label', String(t.groepLabel || '{plek}').replace('{plek}', spec.naam));
      const paneel = document.createElement('div');
      paneel.className = 'wk-plek-paneel';
      const eigen = document.createElement('div');
      eigen.className = 'wk-plek-eigen';
      const eigenZin = document.createElement('p');
      eigenZin.className = 'wk-uitleg';
      eigen.append(eigenZin);
      binnen.append(drie, paneel, eigen);
      rij.append(naam, binnen);
      st.plekEl[plek] = rij;
      rij.drie = drie;
      rij.paneel = paneel;
      rij.eigen = eigen;
      rij.eigenZin = eigenZin;
    }
    /* Het uploadvakje voor het eigen stuk, in de rij van zijn plek. */
    if (!st.slotIds.includes(id) || !card.slots[id] || !card.slots[id].el) {
      if (!card.slots[id]) card.slots[id] = EMPTY_SLOT();
      rij.eigen.prepend(buildSlot(card, id));
      if (!st.slotIds.includes(id)) st.slotIds.push(id);
      const veld = document.createElement('input');
      veld.type = 'hidden';
      veld.name = `context_${plek}_${card.key}`;
      veld.value = 'ours';
      st.wrap.appendChild(veld);
      st.velden[id] = veld;
      paintSlot(card, id);
    } else if (card.slots[id].el.wrap.parentElement !== rij.eigen) {
      rij.eigen.prepend(card.slots[id].el.wrap);
    }
    st.rijen.appendChild(rij);

    const p = plekStaat(card, plek);
    /* Een foto die er al in zit (een concept, een kopie) is een eigen stuk. */
    if (p.keuze === 'wij' && !p.bron && slotFilled(card, id)) p.keuze = 'eigen';
    if (!metLook && p.keuze === 'uit') { p.keuze = 'wij'; p.bron = ''; }

    /* De drie (of bij catalog twee) knoppen. */
    rij.drie.textContent = '';
    const knop = (k, tekst, klein) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.wkPlek = plek;
      b.dataset.wkK = k;
      b.setAttribute('aria-pressed', String(p.keuze === k));
      b.append(document.createTextNode(tekst));
      if (klein) {
        const i = document.createElement('i');
        i.textContent = klein;
        b.append(i);
      }
      rij.drie.appendChild(b);
    };
    knop('wij', t.wij || '');
    knop('eigen', t.eigen || '', t.gratis || '');
    if (metLook) knop('uit', t.uit || '', look ? String(t.lookLetter || '{l}').replace('{l}', look.letter) : `+ ${euro(lookPrijs())}`);
    rij.drie.classList.toggle('is-twee', !metLook);

    /* Wat er onder de knoppen staat. */
    rij.paneel.textContent = '';
    rij.eigen.hidden = p.keuze !== 'eigen';
    rij.eigenZin.textContent = String(t.eigenUitleg || '').replace('{gezien}', spec.gezien || '');
    if (p.keuze === 'wij') {
      const zin = document.createElement('p');
      zin.className = 'wk-uitleg';
      zin.textContent = String(t.wijUitleg || '').replace('{standaard}', spec.standaard || '');
      rij.paneel.appendChild(zin);
    } else if (p.keuze === 'uit') {
      if (!look) {
        const zin = document.createElement('p');
        zin.className = 'wk-uitleg';
        const b = document.createElement('b');
        b.textContent = t.uitKop || '';
        zin.append(b, document.createTextNode(` ${t.uitUitleg || ''}`));
        rij.paneel.appendChild(zin);
      }
      const lijst = document.createElement('ul');
      lijst.className = 'wk-stukken';
      cards.filter((k) => k !== card && pastOp(plek, soortVan(k) || 'other')).forEach((k) => {
        const m = magOpPlek(card, plek, k, looks);
        const aan = p.bron === k.key;
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wk-stuk';
        b.dataset.wkPlek = plek;
        b.dataset.wkStuk = k.key;
        b.setAttribute('aria-pressed', String(aan));
        if (!m.mag && !aan) b.disabled = true;
        const tekst = document.createElement('span');
        const naam = document.createElement('b');
        naam.textContent = cardLabel(k);
        const sub = document.createElement('small');
        sub.textContent = aan ? (t.inLook || '') : (m.waarom || `${String(k.n).padStart(2, '0')} · ${soortNaam(k)}`);
        tekst.append(naam, sub);
        b.append(kaartDuim(k), tekst);
        li.appendChild(b);
        lijst.appendChild(li);
      });
      if (!p.bron && kanErbij() && (cfg.erbij && cfg.erbij.toeSoort && cfg.erbij.toeSoort[plek])) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wk-stuk wk-stuk-toe';
        b.dataset.wkPlek = plek;
        b.dataset.wkToe = '1';
        const duim = document.createElement('span');
        duim.className = 'wk-duim';
        duim.setAttribute('aria-hidden', 'true');
        duim.innerHTML = ikoon('plus');
        const tekst = document.createElement('span');
        const naam = document.createElement('b');
        naam.textContent = spec.toevoegen || '';
        const sub = document.createElement('small');
        const n = productCount();
        const rate = Number.isInteger(n) ? rateFor(kindOf(), n + 1) : null;
        sub.textContent = String(t.toeSub || '').replace('{prijs}', rate !== null && rate !== undefined ? euro(rate) : '');
        tekst.append(naam, sub);
        b.append(duim, tekst);
        li.appendChild(b);
        lijst.appendChild(li);
      }
      rij.paneel.appendChild(lijst);
    }
  });

  /* De kaart van de look, onder de plekken (c-look). */
  st.kaart.textContent = '';
  if (look) st.kaart.appendChild(lookKaartEl(look));

  st.rijen.hidden = !plekken.length;
  st.hint.hidden = !!(type && plekken.length);
  st.hint.textContent = !type ? (t.eerst || c('pu.erbijEerst')) : (plekken.length ? '' : (t.geenPlek || c('pu.erbijGeen')));
  syncPlekVelden(card, looks);
}

function lookKaartEl(look) {
  const t = erbijTekst();
  const wrap = document.createElement('div');
  wrap.className = 'wk-lookkaart';
  wrap.dataset.wkLook = look.letter;
  const kop = document.createElement('div');
  kop.className = 'wk-lookkaart-kop';
  const links = document.createElement('div');
  const label = document.createElement('p');
  label.textContent = String(t.lookLabel || '').replace('{l}', look.letter).replace('{n}', String(look.kaarten.length));
  const h = document.createElement('h4');
  h.textContent = t.lookH || '';
  links.append(label, h);
  const prijs = document.createElement('span');
  prijs.className = 'wk-lookkaart-prijs';
  prijs.textContent = `+ ${euro(lookPrijs())}`;
  kop.append(links, prijs);
  const namen = look.kaarten.map((k) => cardLabel(k));
  const en = t.en || '&';
  const zinNamen = namen.length > 1 ? `${namen.slice(0, -1).join(', ')} ${en} ${namen[namen.length - 1]}` : namen[0];
  const wie = document.createElement('p');
  wie.className = 'wk-lookkaart-wie';
  wie.textContent = String(t.lookWie || '{namen}').replace('{namen}', zinNamen);
  const samen = document.createElement('span');
  samen.className = 'wk-lookkaart-samen';
  look.kaarten.forEach((k) => samen.appendChild(kaartDuim(k)));
  const ul = document.createElement('ul');
  (Array.isArray(t.lookPunten) ? t.lookPunten : []).forEach((punt) => {
    const li = document.createElement('li');
    const i = document.createElement('span');
    i.className = 'wk-lookkaart-vink';
    i.setAttribute('aria-hidden', 'true');
    i.innerHTML = ikoon('vink');
    const s = document.createElement('span');
    s.textContent = punt;
    li.append(i, s);
    ul.appendChild(li);
  });
  const veld = document.createElement('label');
  veld.className = 'wk-lookkaart-notitie';
  const vt = document.createElement('span');
  vt.textContent = t.notitieLabel || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.maxLength = Number(cfg.look.notitieMax) || 300;
  input.placeholder = t.notitiePlaceholder || '';
  input.setAttribute('data-wk-look-notitie', look.letter);
  input.value = (look.kaarten.find((k) => k.lookNotitie) || {}).lookNotitie || '';
  veld.append(vt, input);
  const uit = document.createElement('button');
  uit.type = 'button';
  uit.className = 'wk-lookkaart-uit';
  uit.setAttribute('data-wk-uit-elkaar', '');
  uit.textContent = t.uitElkaar || '';
  wrap.append(kop, wie, samen, ul, veld, uit);
  return wrap;
}

/**
 * De indeling van een eerdere bestelling terugzetten (afvinklijst 38, d-kopie):
 * welke plaatsen samen een look zijn, met de plekken leeg om in te vullen zolang
 * de soorten er nog niet zijn. `indeling` is [[1, 2], [3, 4, 5]] (productnummers).
 * Waar de soorten al passen (een kopie neemt ze niet mee, een concept wel), komt
 * de koppeling er meteen in. Geeft true als er iets is teruggezet.
 */
function zetLookIndeling(indeling) {
  if (!lookAan() || !Array.isArray(indeling)) return false;
  let iets = false;
  indeling.forEach((groep, gi) => {
    const leden = (Array.isArray(groep) ? groep : []).map((n) => cards[Number(n) - 1]).filter(Boolean);
    if (leden.length < 2 || leden.length > Number(cfg.look.max || 3) || leden.some((k) => k.lookVast)) return;
    iets = true;
    leden.forEach((k) => { k.lookVast = `kopie${gi + 1}`; });
    for (const k of leden) {
      for (const plek of plekkenVan(k)) {
        const ander = leden.find((o) => o !== k && pastOp(plek, soortVan(o) || 'other') && magOpPlek(k, plek, o).mag);
        if (ander && !plekStaat(k, plek).bron) koppel(k, plek, ander);
      }
    }
  });
  if (iets) naLookWijziging(null);
  return iets;
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
  pijl.innerHTML = ikoon('uitklap');

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

  /* Het gezicht: de naam zoals hij op de tegel staat, en niet de sleutel. Leeg
     betekent "volgt de bestelling" en hoort dus niet in een regel die opsomt
     wat er AFWIJKT. */
  const gezicht = modelNaamVan(card);
  if (gezicht) uit.push(gezicht);

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
    /* 11 oktober 2026: de uitleg bij deze vraag stond in de lijst "Wat je
       opstuurt", en die is met de productkaart (F3) weggegaan. Hij staat nu op
       de eerste kaart tussen label en veld, net als de regel bij elk fotovak;
       de velden op de andere kaarten verwijzen ernaar. Tussen label en veld,
       niet eronder: het kleurvlakje staat onderaan het veld (absolute). */
    let uitleg = null;
    if (buys && card.n === 1 && !document.getElementById(`pu-q-${qn.id}-buys`)) {
      uitleg = document.createElement('p');
      uitleg.className = 'pu-q-uitleg';
      uitleg.id = `pu-q-${qn.id}-buys`;
      uitleg.textContent = buys;
    }
    if (uitleg || document.getElementById(`pu-q-${qn.id}-buys`)) {
      ctrl.setAttribute('aria-describedby', `pu-q-${qn.id}-buys`);
    }

    field.append(...[label, uitleg, ctrl].filter(Boolean));

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
        /* Sinds 5.03 (8 oktober 2026) vraagt het veld naam én code; de code
           mag dus midden in de tekst staan, met een # ervoor. */
        const hex = hexUit(ctrl.value);
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

  const tpl = q('[data-pu-model]');
  if (!tpl || !tpl.content) return null;
  const wrap = tpl.content.firstElementChild.cloneNode(true);

  wrap.setAttribute('aria-label', `${c('pu.modelH')} — ${c('pu.product', { n: card.n })}`);
  const kop = wrap.querySelector('.pu-mk-h');
  if (kop) kop.textContent = c('pu.modelLabel');
  const hint = wrap.querySelector('.pu-mk-hint');
  if (hint) hint.textContent = c('pu.modelHint');

  const rij = wrap.querySelector('.pu-mk-rij');
  if (!rij) return null;
  rij.setAttribute('aria-label', c('pu.modelLabel'));
  card.modelRij = rij;
  card.modelNaam = `model_${card.key}`;
  vulModelTegels(card);
  return wrap;
}

/**
 * De waarde die dit product nu draagt: leeg betekent "volg de bestelling".
 *
 * Eén functie en geen `card.modelSel.value` meer op vier plekken: de vorm van
 * het besturingselement is sinds 18 september een rij radio's en niet langer een
 * keuzelijst, en dat hoort maar op één plek te staan.
 */
function modelVan(card) {
  if (!card || !card.modelRij) return '';
  const aan = card.modelRij.querySelector('input[type="radio"]:checked');
  return aan ? aan.value : '';
}

/** De naam van het gekozen gezicht van dit product, of '' als het de bestelling volgt. */
function modelNaamVan(card) {
  const waarde = modelVan(card);
  if (!waarde) return '';
  const aan = card.modelRij.querySelector('input[type="radio"]:checked');
  const naam = aan && aan.closest('.pu-mk-tegel');
  const t = naam && naam.querySelector('.pu-mk-naam');
  return ((t && t.textContent) || waarde).trim();
}

/** Het portret dat bij een gezicht-radio hoort, zoals het in de kiezer staat. */
function modelBeeld(radio) {
  const lab = radio && radio.closest('label');
  const img = lab ? lab.querySelector('.mp-thumb') : null;
  return (img && (img.currentSrc || img.src)) || '';
}

/**
 * De tegelrij van één kaart vullen uit de gezichtenkiezer van de bestelling.
 *
 * ── DE OPTIES KOMEN VAN DE RADIO'S EN NIET UIT EEN EIGEN LIJST ─────────────
 * De tien gedeelde modellen staan in de HTML; de eigen merkmodellen van een
 * ingelogde klant zet addBrandModels() er later bij. Een tweede lijst hier zou
 * die tweede groep missen — en dat is precies het gezicht dat een merk het
 * liefst per product kiest.
 *
 * ── DE EERSTE TEGEL IS "HETZELFDE ALS DE BESTELLING" ──────────────────────
 * Met het portret van het gezicht dat bovenaan gekozen is, zodat je op de kaart
 * niet hoeft te onthouden wie dat was. Zijn waarde is leeg: wie niets doet,
 * post niets, en de server hoeft geen lijst met dertig keer hetzelfde gezicht te
 * lezen.
 */
function vulModelTegels(card) {
  const rij = card && card.modelRij;
  if (!rij) return;
  const radios = qa('input[name="model"]');
  if (!radios.length) return;
  const tpl = q('[data-pu-model-tegel]');
  if (!tpl || !tpl.content) return;

  /* De keuze van de klant overleeft het opnieuw vullen — anders springt elke
     kaart terug naar "hetzelfde als de bestelling" zodra hij bovenaan een ander
     gezicht aanwijst, en dat is precies het tegenovergestelde van wat een
     afwijking per product moet doen. */
  const had = modelVan(card);

  const gekozen = radios.filter((r) => r.checked)[0];
  const naamBoven = gekozen && gekozen.value && gekozen.value !== 'any' ? modelNaam(gekozen) : '';
  /* Het portret van de eerste tegel. Staat er bovenaan nog niets aangevinkt —
     op catalog is de keuze verplicht en ship't er dus niets als gekozen — dan
     het merkteken van "wij kiezen er een", gelezen uit die tegel en niet als pad
     overgetypt: het bestand is daar één keer gekozen en hoort daar te blijven. */
  /* ── GEEN MERKTEKEN MEER ALS PORTRET — 19 september 2026 ──────────────────
     Tot vandaag leende de tegel het beeld van "wij kiezen er een" (het lime
     vlak met de V) zodra er bovenaan geen gezicht stond. Dat V-beeldmerk is
     afgeschaft en hoort nergens meer te staan, en het las bovendien als een
     keuze voor iets. "Zelfde" zonder gezicht is nu een stille tegel met een
     =-teken: hetzelfde als de bestelling, wat dat ook wordt. Alleen een écht
     gekozen gezicht komt als portret bovenaan. */
  const beeldBoven = (gekozen && gekozen.value !== 'any' && modelBeeld(gekozen)) || '';

  const tegel = (waarde, beeld, kort, volledig) => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    const inp = el.querySelector('input');
    const img = el.querySelector('.pu-mk-beeld');
    const naam = el.querySelector('.pu-mk-naam');
    inp.name = card.modelNaam;
    inp.value = waarde;
    /* De volledige zin is de toegankelijke naam, het korte woord staat op het
       scherm. Twee teksten en niet twee tegels — dezelfde zet als bij "wij
       kiezen er een" in ModelPicker.astro. */
    inp.setAttribute('aria-label', volledig);
    if (beeld) {
      img.src = beeld;
    } else {
      const leeg = document.createElement('span');
      leeg.className = 'pu-mk-leeg';
      leeg.setAttribute('aria-hidden', 'true');
      leeg.textContent = '=';
      img.replaceWith(leeg);
    }
    naam.textContent = kort;
    return el;
  };

  rij.textContent = '';
  const zelfdeZin = naamBoven ? c('pu.modelSame', { naam: naamBoven }) : c('pu.modelSamePlain');
  rij.appendChild(tegel('', beeldBoven, c('pu.modelZelfdeKort'), zelfdeZin));

  radios.forEach((r) => {
    /* Een radio die uitstaat omdat de vraag niet van toepassing is (zie
       syncStyle en syncBackground) hoort hier ook niet te staan. En "wij kiezen
       er een" evenmin: dat IS wat "hetzelfde als de bestelling" betekent zolang
       er bovenaan niets anders staat, en twee tegels voor één antwoord is een
       keuze die niets verandert. */
    if (r.disabled || r.value === 'any') return;
    /* En het gezicht dat bovenaan gekozen IS, krijgt hier geen tweede tegel:
       dat is precies wat de eerste tegel al betekent, en twee identieke
       portretten naast elkaar leest als een fout. */
    if (gekozen && r === gekozen) return;
    const naam = modelNaam(r);
    rij.appendChild(tegel(r.value, modelBeeld(r), naam, naam));
  });

  const terug = qa('input', rij).filter((i) => i.value === had)[0];
  (terug || rij.querySelector('input')).checked = true;
  /* De regel op de lade noemt wat er afwijkt, en die kan door het opnieuw
     vullen veranderd zijn: koos je bovenaan het gezicht dat dit product al
     apart had, dan volgt dit product de bestelling weer en hoort er geen naam
     meer te staan. Zonder deze regel bleef daar de oude naam hangen. */
  if (card.el) paintMeer(card);

  if (!rij.dataset.plGebonden) {
    rij.dataset.plGebonden = '1';
    /* Eén luisteraar op de rij en niet één per tegel: de tegels worden opnieuw
       gemaakt zodra er bovenaan iets verandert, en dan zouden de luisteraars
       meeverdwijnen of zich opstapelen. */
    rij.addEventListener('change', () => { paintCard(card); syncCopyDown(cards[0]); });
  }
}

/** De naam die bij een gezicht-radio hoort, zoals hij op het scherm staat. */
function modelNaam(radio) {
  const lab = radio.closest('label');
  const t = lab ? lab.querySelector('.mp-name') : null;
  return ((t && t.textContent) || radio.value || '').trim();
}

/** Alle tegelrijen bijwerken: na een wissel bovenaan, en na addBrandModels(). */
function paintModelDefaults() {
  cards.forEach((card) => { if (card.modelRij) vulModelTegels(card); });
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
/**
 * De gratis referentievakken.
 *
 * ── ZE STAAN SINDS 17 SEPTEMBER 2026 IN EEN EIGEN STROOK ────────────────────
 * Lucas, 13 augustus: *"een plusje naast de 4 aanbevolen foto's"*, en zo stond
 * het ook: als vijfde cel van hetzelfde raster, even groot als een uploadvak.
 *
 * Vandaag heeft hij het andersom gevraagd — de rustige indeling van
 * /concept/bestelrij, waar dit *"kleine duimnagels in plaats van een plus-tegel
 * op vol formaat"* zijn. Dat is geen smaakverschil met augustus maar een gevolg
 * van wat er tussendoor veranderd is: toen waren de vier vakken 96 pixels hoog
 * en paste een vijfde er zonder gewicht bij; nu zijn het staande beelden van
 * 3/4, en een vijfde van dat formaat maakt van een aanbod een vijfde verzoek.
 *
 * De vakken zelf blijven wat ze waren — zelfde buildSlot(), zelfde sleepgedrag,
 * zelfde weghaalknop op het laatste. Alleen het formaat en de plek wijzigen.
 */
function buildRefs(card) {
  const max = Math.max(0, Math.floor(Number(cfg.maxRefPerProduct) || 0));
  if (!max) return null;

  card.refs = 0;

  const strip = document.createElement('div');
  strip.className = 'pu-refs';

  const vakken = document.createElement('div');
  vakken.className = 'pu-refs-rij';

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

  /* De vraag vooraan en vet, de uitleg erachter op dezelfde regel — zoals op
     /concept/bestelrij. Eén regel en geen kopje: dit is een aanbod tussen twee
     taken door, en een kopje zou er een derde taak van maken. */
  const hint = document.createElement('p');
  hint.className = 'pu-ref-hint';
  hint.id = `pu-ref-hint-${card.key}`;
  const lead = document.createElement('b');
  lead.className = 'pu-ref-lead';
  lead.textContent = c('pu.refLead');
  const hintTekst = document.createElement('span');
  hintTekst.className = 'pu-ref-hint-tekst';
  hint.append(lead, ' ', hintTekst);
  add.setAttribute('aria-describedby', hint.id);
  /* Hier stond: op kaart twee en verder `.is-stil`, zodat de uitleg alleen op de
     eerste kaart te lezen was. Sinds 11 oktober 2026 (F3) staat deze strook in de
     ingeklapte lade "Meer over dit product", en wie die opent, vraagt erom. */

  /* ── EN WAAR JE WÉL MEER BEELDEN BESTELT ────────────────────────────────
     De zin hierboven zegt dat deze foto's geen extra beelden opleveren. Dat is
     waar, en het laat de vraag staan waar dat dan wél kan — precies hier, want
     dit is het vak waar iemand aan het bijleggen is. Eén regel, onder de
     uitleg, en op dezelfde manier stil op kaart twee en verder.

     Alleen als er iets bij te bestellen ís: staat de bovengrens op nul, dan is
     de zin een verwijzing naar een keuze die niet bestaat. */
  const extraMax = Math.max(0, Math.floor(Number(cfg.maxExtraPerProduct) || 0));
  /* ── EN ALLEEN WAAR "EEN HOEK ERBIJ" BESTAAT — 2 oktober 2026 (ronde 9, F2) ──
     De zin stond ook op de €1-proef en bij lifestyle, waar stap 1 geen "Een hoek
     erbij" heeft: een verwijzing naar een knop die er niet is. De hoekkiezer
     moet op de pagina staan, de dienst moet een catalogset hebben, en een proef
     (vaste prijs) bestelt niets bij. */
  const hoekBox = angleBoxEl();
  const hoekKan = !!hoekBox && !hoekBox.closest('[hidden]') && cfg.samplePrice == null
    && String(kindOf() || '') === 'catalog';
  const terug = document.createElement('p');
  if (extraMax && hoekKan) {
    terug.className = 'pu-ref-terug hint';
    terug.textContent = c('pu.refTerug', { max: extraMax });
  }

  const paint = () => {
    const vol = card.refs >= max;
    add.hidden = vol;
    // De uitleg verdwijnt met de knop mee: als er niets meer bij kan, is "gratis,
    // je krijgt nog steeds je vier beelden" een antwoord op een vraag die niemand
    // meer kan stellen.
    // {n} pas HIER invullen en niet bij het bouwen: het aantal verandert zodra
    // er in stap 1 een hoek bij of af gaat, en dan draait paintAngles() deze
    // functie opnieuw. Zie beeldenPerProductNu().
    hintTekst.textContent = vol
      ? c('pu.refFull', { max })
      : c('pu.refHint', { n: beeldenPerProductNu() });
    lead.hidden = vol;
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

  /* Eén vak erbij, en zijn id terug. Los van de knop, zodat de meervoudige
     kiezer bovenaan de kaart (verdeelFotos, F3) er ook een kan aanvragen voor de
     foto's die na de vaste vakken over zijn. */
  const voegToe = () => {
    if (card.refs >= max) return '';
    card.refs += 1;
    const id = refShotId(card.refs);
    if (!card.slots[id]) card.slots[id] = EMPTY_SLOT();
    // VÓÓR de knop invoegen, zodat het plusje het laatste vakje van de rij blijft
    // en niet halverwege komt te staan zodra er één bij is.
    vakken.insertBefore(buildSlot(card, id), add);
    // buildSlot() bouwt alleen; zonder deze regel staan Vervangen en Verwijderen
    // onder een leeg vak — precies de fout die buildExtras() hierboven noemt.
    paintSlot(card, id);
    paintAll();
    return id;
  };
  card.voegRefToe = voegToe;

  add.addEventListener('click', () => {
    const id = voegToe();
    if (!id) return;
    refreshUploader();
    // De focus naar het vak dat er net bij kwam. Wie met het toetsenbord werkt,
    // staat anders op een knop die naar beneden is opgeschoven of verdwenen is.
    const btn = q(`[data-pu-slot="${id}"] .pu-slot-btn`, vakken);
    if (btn) btn.focus({ preventScroll: false });
  });

  /* De vakjes en het plusje in een eigen rij, de uitleg eronder over de volle
     breedte — die zin ("je krijgt er geen extra beelden door") zet een
     verwachting recht en wordt in een kolom van een duimnagel breed zes regels
     die niemand leest. */
  vakken.append(add);
  strip.append(hint, vakken);
  if (extraMax && hoekKan) strip.append(terug);
  /* Naar buiten, want de weghaalknop op een vakje moet de knop en de uitleg weer
     terug kunnen zetten — die zit in buildSlot() en kan hier niet bij. */
  card.paintRefs = paintAll;
  paint();
  return strip;
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
  /* ── EN DE EIS VOLGT DE ZICHTBAARHEID ─────────────────────────────────────
     De omschrijving bij de zelfbedachte hoek draagt `data-pl-req="1"` en wordt
     pas verplicht als hij in beeld staat; syncRequired() beslist dat op
     zichtbaarheid. Die stond hier niet, dus het veld verscheen wél en werd nooit
     verplicht — gemeten: `verplicht: false` na aanvinken. Bij een zelfbedachte
     hoek is die zin de hele opdracht, dus dat is geen schoonheidsfoutje: het is
     een bestelling waarvan wij niet weten wat we moeten maken. */
  syncRequired();

  /* Met credits: "2 credits per foto, per product", zonder btw-regel. */
  const prijsTekst = (eur) => (prijzenInCredits ? `${eur} credits` : euro(eur));
  const tariefNu = prijzenInCredits ? EXTRA_CREDITS.photo : tarief;
  const rate = q('[data-pl-angle-rate]', angleBox);
  if (rate) {
    const sjab = prijzenInCredits ? (angleBox.dataset.perKaal || angleBox.dataset.per || '') : (angleBox.dataset.per || '');
    const per = sjab.replace('{price}', prijsTekst(tariefNu));
    rate.textContent = vol ? `${per} — ${angleBox.dataset.full || ''}`.trim() : per;
  }

  /* Het zijpaneel "Wat je krijgt" (15 oktober 2026): elke aangevinkte hoek als
     tegel bij de vier, en "5 beelden per product". De eigen hoek draagt de naam
     die de klant typte, anders "Eigen hoek". */
  const gekozenIds = new Set(gekozen.map((b) => String(b.name || '').slice('angle_'.length)));
  document.querySelectorAll('[data-bo-hoek]').forEach((li) => {
    const id = li.getAttribute('data-bo-hoek');
    li.hidden = !gekozenIds.has(id);
    const naam = li.querySelector('[data-bo-hoek-naam]');
    if (naam) {
      const veld = q(`[name="angle_name_${id}"], [data-pl-angle-name="${id}"]`, angleBox);
      const getypt = veld && 'value' in veld ? String(veld.value || '').trim() : '';
      naam.textContent = getypt ? getypt.slice(0, 28) : naam.getAttribute('data-bo-hoek-naam');
    }
  });
  const perEl = document.querySelector('[data-bo-per]');
  if (perEl) perEl.textContent = perEl.getAttribute('data-bo-per').replace('{n}', String(beeldenPerProductNu() || 4));

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
  const totaal = n * p * tariefNu;
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
    .replace('{price}', prijsTekst(tariefNu))
    .replace('{sum}', prijsTekst(totaal));
  som.hidden = false;
}

function bindAngles() {
  const angleBox = angleBoxEl();
  if (!angleBox) return;

  /* ── DE NAAM VAN DE ZELFBEDACHTE HOEK LOOPT MEE TERWIJL JE TYPT ───────────
     Wat de klant hier intypt, is de naam boven zijn uploadvak in stap 2 (zie
     hoekNaam). Zonder deze luisteraar blijft daar "Zelf bedenken" staan tot er
     iets ANDERS verandert, en dan lijkt het vakje niet bij zijn eigen hoek te
     horen. `input` en niet `change`: je wilt het zien terwijl je typt. */
  qa('input[name^="angle_note_eigen-"]', angleBox).forEach((veld) => {
    veld.addEventListener('input', () => { syncHoekVakken(); });
  });
  qa('input[data-pl-angle]', angleBox).forEach((b) => {
    b.addEventListener('change', () => {
      paintAngles();
      syncTotal();
      /* De regel onder het plusje noemt het aantal beelden per product, en dat
         aantal verandert hier. Zonder deze lus blijft er "het blijven er 4"
         staan terwijl de klant er net een vijfde bij heeft gekozen. */
      cards.forEach((k) => { if (k.paintRefs) k.paintRefs(); });
      /* En de kaarten krijgen het vak erbij waar die hoek om vraagt. */
      syncHoekVakken();
      refreshUploader();
    });
  });
  paintAngles();
}

/**
 * Hoeveel beelden dit product oplevert, NU — inclusief de hoeken die de klant
 * in stap 1 heeft bijbesteld.
 *
 * ── WAAROM DIT EEN FUNCTIE IS EN GEEN GETAL — 17 september 2026 ─────────────
 * `cfg.beeldenPerProduct` komt uit `beeldenVoor(service)` en wordt bij de BOUW
 * vastgezet. Dat is het aantal van de dienst zelf: vier bij een catalogset.
 * Zodra iemand er in stap 1 een hoek bij kiest, krijgt élk product er een beeld
 * bij — en dat gebeurt in de browser, lang nadat dat getal is ingebakken.
 *
 * Lucas: *"het getal van je 'krijgt nog steeds 4 foto's' moet aangepast worden
 * wanneer iemand een extra angle heeft toegevoegd, omdat ze anders denken hoezo
 * krijg ik er 4 wanneer ik er 5 in totaal zou moeten hebben."*
 *
 * Hij noemde één zin, maar het getal stond op twee plekken en allebei zeiden ze
 * hetzelfde te weinig: de regel onder het plusje, en het meelopende overzicht
 * bij het totaal ("je krijgt 24 beelden"). Nu rekenen ze allebei hiermee.
 *
 * PER PRODUCT en niet voor de hele bestelling: een gekozen hoek geldt voor elk
 * product, dus hij telt hier één keer op. extrasCount() hiernaast doet de andere
 * som — hoeken × producten — en die twee moeten niet door elkaar lopen.
 */
function beeldenPerProductNu() {
  const basis = Math.max(0, Math.floor(Number(cfg.beeldenPerProduct) || 0));
  if (!basis) return 0;
  return basis + anglesChosen().length;
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
    /* Het gezicht gaat mee op dezelfde voorwaarde als de rest: alleen naar een
       kaart die zelf nog niets afwijkends heeft. Een product dat je al op een
       ander gezicht hebt gezet, is een keuze en geen leeg veld. */
    const gezicht = modelVan(from);
    if (gezicht && card.modelRij && !modelVan(card)) {
      const doel = qa('input', card.modelRij).filter((i) => i.value === gezicht)[0];
      if (doel && !doel.checked) { doel.checked = true; paintCard(card); touched = true; }
    }
    if (touched) n += 1;
  });
  return n;
}

/** The copy-down only makes sense with an answer to copy and a card to copy to. */
function syncCopyDown(card) {
  if (!card || !card.copyRow) return;
  card.copyRow.hidden = cards.length < 2;
  if (!card.copyBtn) return;
  const heeftAntwoord = PRODUCT_QUESTIONS.some((qn) => {
    const el = card.answers && card.answers[qn.id];
    return el && String(el.value || '').trim();
  });
  /* ── EN HET GEZICHT TELT MEE — 18 september 2026 ─────────────────────────
     Lucas: *"De klant kiest bij het eerste product een model en kan dan kiezen
     om deze aan alle producten alvast toe te voegen."* Dat is precies wat deze
     knop doet; hij keek alleen naar de vragen uit attributes.js, dus een
     afwijkend gezicht op product 1 liet hem uit staan. */
  card.copyBtn.disabled = !heeftAntwoord && !modelVan(card);
}

function buildSlot(card, id) {
  const wrap = document.createElement('div');
  wrap.className = 'pu-slot';
  wrap.dataset.puSlot = id;
  wrap.dataset.state = 'empty';
  /* Doorlopende rand = we wachten hierop, onderbroken rand = het mag ontbreken.
     Een attribuut en geen klasse, zodat het naast `data-state` staat en in de
     CSS als hetzelfde soort feit leest. */
  wrap.dataset.req = (isRequiredShot(id) || extraSlotNumber(id)) ? '1' : '';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pu-slot-btn';

  /* ── EEN PLUSJE EN NIET DE HOEKTEKENING — 17 september 2026 ───────────────
     Tot vandaag stond in elk leeg vak de tekening van die hoek (ShotDiagram).
     Lucas wees op /concept/bestelrij: daar is een leeg vak een omlijnde open
     plek met een plus erin, en dat is wat hij wil zien.

     Wat de tekening zei, zegt het bijschrift eronder nu met zoveel woorden
     ("Het hele product, plat of hangend, recht van voren"), en de tekeningen
     staan nog steeds in de gids bovenaan deze stap — daar staan ze naast elkaar,
     wat ze pas echt uitlegbaar maakt. Vier tekeningen van 44 pixels verspreid
     over vier vakken zijn vier plaatjes die je moet ontcijferen; één plus is een
     plek waar iets hoort.

     `dia` blijft bestaan als element, want paintSlot() verbergt hem zodra er
     een foto in zit en toont hem weer als je die weghaalt. */
  const dia = document.createElement('span');
  dia.className = 'pu-slot-dia';
  dia.setAttribute('aria-hidden', 'true');
  dia.innerHTML = ikoon('plus');

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
  vink.innerHTML = ikoon('vink');

  /* ── DE WOORDEN STAAN ONDER HET BEELD, NIET ERIN — 17 september 2026 ──────
     Lucas, over de rij naast het concept: *"Ik vind die nieuwe juist wel
     rustiger ogen."*

     Tot vandaag zaten naam, uitleg én een VERPLICHT-badge alle drie BINNEN de
     knop, over de tekening heen. Vier van die vakken naast elkaar is vier
     blokjes tekst in vier kadertjes; het concept op /concept/bestelrij is
     rustiger om precies één reden: daar is de knop alleen het BEELD en staan de
     woorden eronder, als bijschrift.

     Het is bovendien de grammatica die de rest van het formulier al spreekt.
     Stap 3 zet boven elk veld `MERK- OF SHOPNAAM *` en `WEBSITE OF SHOPLINK
     optioneel` — een naam met een klein eis-woord ernaast. Dit vakje deed dat
     als enige anders. Nu niet meer: `Voorkant VERPLICHT`, `Gedragen OPTIONEEL`,
     zelfde maat, zelfde plek, zelfde toon.

     DE KNOP HOUDT ZIJN NAAM. Wat eruit gaat is zichtbare tekst, geen
     toegankelijke naam: paintSlot() zet `aria-label` op de knop met de naam én
     de bestandsnaam erin, en die regel is niet aangeraakt. Een schermlezer
     hoort dus hetzelfde als gisteren. */
  const woord = document.createElement('span');
  woord.className = 'pu-slot-woord';

  const nameEl = document.createElement('span');
  nameEl.className = 'pu-slot-name';
  nameEl.textContent = shotLabel(id);
  woord.appendChild(nameEl);

  btn.append(dia, img, vink);

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
  /* ── HET EIS-WOORD STAAT OP ELK VAK, OOK OP DE OPTIONELE ──────────────────
     Vroeger droeg alleen een verplicht vak een merkje, en dan nog als gevulde
     badge in de hoek. Drie uitroeptekens op een rij van vier, en het vierde vak
     zei niets — waardoor "optioneel" iets was dat je moest afleiden uit een
     ontbrekende badge. Nu zegt elk vak wat het is, in hetzelfde kleine woord.

     GEEN EIS-WOORD OP EEN BIJBESTELD OF GRATIS REFERENTIEVAK: die twee zijn
     geen vaste hoek waar de kaart op wacht. cardReady() loopt over SHOT_IDS en
     kijkt er niet naar, dus "verplicht" of "optioneel" zou er een belofte doen
     die nergens wordt nagekeken. Zie het blok bij skipBtn hieronder, dat om
     dezelfde reden geen overslaan-knop op die vakken zet. */
  if (!refShotNumber(id)) {
    /* Het woord zelf, klein en in kapitaal naast de naam — NODIG of OPTIONEEL,
       zoals op /concept/bestelrij. Ik heb hier een halve dag een sterretje
       gehad, geleend van het veldlabel in stap 3; dat was consequent en het zag
       er niet uit. Zie het blok bij .pu-slot-eis in ProductUploader.astro. */
    const eis = document.createElement('span');
    eis.className = 'pu-slot-eis';
    /* Een bijbestelde hoek is VERPLICHT. Lucas, 16 september: *"krijgt dan een
       foto-upload erbij specifiek voor die angle, verplicht."* Hij heeft die
       hoek besteld en betaald; wij kunnen hem niet maken zonder te zien wat hij
       ermee bedoelt. Vandaar `|| extraSlotNumber(id)` en niet alleen
       isRequiredShot(): dat laatste gaat over de vier vaste hoeken uit
       shots.js, en dit vak bestaat daar niet. */
    /* De draagfoto is bij lifestyle AANBEVOLEN en niet alleen optioneel (14 oktober
       2026, afvinklijst 23): drie van de vier beelden zijn dan op een model, en daar
       helpt hij het meest bij pasvorm en lengte. Leeg laten blijft gewoon mogen. */
    const aanbevolen = id === 'worn' && kindOf() === 'lifestyle';
    eis.textContent = (isRequiredShot(id) || extraSlotNumber(id)) ? c('pu.required') : aanbevolen ? c('pu.aanbevolen') : c('pu.optional');
    woord.appendChild(eis);
  }

  wrap.appendChild(btn);
  wrap.appendChild(woord);

  /* ── DE REGEL EN HET VOORBEELD — 11 oktober 2026 (F3, 5.07) ──────────────
     `regel` uit shots.js in de plaats van `how`: één korte regel per vak, en bij
     de draagfoto de aanname erachter ("Zonder draagfoto gaan we uit van een
     normale, rechte pasvorm"). Bij het detailvak de tip met het witte vel
     (5.03). Een voorbeeldfoto van ±64 px alleen als het bestand er echt is —
     OrderFlow vraagt dat bij de bouw aan isEcht() en geeft anders '' mee.

     OP DE EERSTE KAART, en daarna niet meer: wat de eerste kaart leert, weet je
     bij de tweede al, en bij twintig producten zijn het anders tachtig regels.
     Op de andere kaarten draagt de knop de regel als `title`, en een
     schermlezer hoort hem via aria-describedby op elke kaart. */
  const regel = lookup(`pu.regel.${id}`);
  const tip = lookup(`pu.tip.${id}`);
  const vb = cfg.voorbeeld && cfg.voorbeeld[id] ? cfg.voorbeeld[id] : '';
  if (regel) {
    if (card.n === 1) {
      const uitleg = document.createElement('span');
      uitleg.className = 'pu-slot-uitleg';
      if (vb) {
        const eg = document.createElement('img');
        eg.className = 'pu-slot-vb';
        eg.src = vb;
        eg.alt = '';
        eg.width = 64;
        eg.height = 64;
        eg.loading = 'lazy';
        eg.decoding = 'async';
        uitleg.appendChild(eg);
      }
      const r = document.createElement('span');
      r.className = 'pu-slot-regel';
      r.id = `pu-regel-${card.key}-${id}`;
      r.textContent = tip ? `${regel} ${tip}` : regel;
      uitleg.appendChild(r);
      wrap.appendChild(uitleg);
      btn.setAttribute('aria-describedby', r.id);
    } else {
      btn.title = tip ? `${regel} ${tip}` : regel;
    }
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
  /* ── GEEN "SLA DEZE OVER" MEER — 11 oktober 2026 (F3) ────────────────────
     Lucas koos: de draagfoto overslaan zonder klik. Sinds 19 september telde
     een leeg vak al als overgeslagen (`mustDecide: false` in shots.js), maar de
     knop stond er nog — en bij vijf producten lazen klanten vijf keer "sla deze
     over" bij een vak dat optioneel heet als iets wat moest. Wat er gebeurt als
     het vak leeg blijft, staat nu in de regel bij het vak (`zonder`). De
     velden blijven bestaan, leeg: paintSlot() leest ze null-veilig, en de
     derde soort vakje (`mustDecide`) kan in shots.js terugkomen zonder dat hier
     iets stuk is. */
  const skipBtn = null;
  const undoBtn = null;

  /* ── WISSELEN MET ÉÉN KEUZE — 11 oktober 2026 (F3) ───────────────────────
     Een keuzelijst en geen sleepbeweging: werkt met een duim, met een muis en
     met het toetsenbord, en een schermlezer leest hem als "Wissel voorkant met
     een ander vak". Alleen op de vaste vakken en de bijbestelde hoeken: een
     referentie- of contextvak is geen plek die de kaart verwacht. paintWissel()
     vult de opties en zet hem zichtbaar zodra er een foto in zit. */
  let wissel = null;
  if (SHOT_IDS.includes(id) || extraSlotNumber(id)) {
    wissel = document.createElement('select');
    wissel.className = 'pu-wissel';
    wissel.hidden = true;
    wissel.setAttribute('aria-label', c('pu.wisselLabel', { shot: shotLabel(id).toLocaleLowerCase() }));
    wissel.addEventListener('change', () => {
      const naar = wissel.value;
      wissel.value = '';
      if (naar) wisselVakken(card, id, naar);
    });
  }

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

  /* btn en de woorden staan er al (zie hierboven); bar/msg/acts/file sluiten
     de rij af. De volgorde in de DOM is de leesvolgorde: beeld, naam, uitleg,
     voortgang, melding, knoppen. */
  wrap.append(bar, msg, acts);
  if (wissel) wrap.appendChild(wissel);
  wrap.appendChild(file);

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

  card.slots[id].el = { wrap, btn, dia, img, nameEl, bar, msg, retryBtn, replaceBtn, removeBtn, skipBtn, undoBtn, dropBtn, wissel };
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
  paintWissel(card, id);
  /* Een contextvak: het verborgen veld volgt het bestand (own / ours). Hier en
     niet met een MutationObserver zoals in de oude rijen — paintSlot() is de
     ene plek waar de staat van een vak op het scherm komt. */
  /* Sinds levering 60 zegt de keuze per plek (Wij kiezen, Eigen stuk, Uit je
     bestelling) wat het veld wordt; het bestand telt alleen bij Eigen stuk. */
  if (card.erbij && card.erbij.velden && card.erbij.velden[id]) syncPlekVelden(card);
}

/** De regel op de kaart: af, of wat er nog moet. */
function cardStateText(card, ready) {
  if (ready) return c('pu.ready');
  const mist = missingRequired(card);
  if (mist.length) return c('pu.needsShots', { list: shotListText(mist) });
  const kiezen = undecided(card);
  if (kiezen.length) return c('pu.needsChoice', { shot: shotLabel(kiezen[0]).toLocaleLowerCase() });
  /* Onbereikbaar zolang cardReady() uit deze twee is opgebouwd; blijft staan
     zodat een derde soort blokkade hier niet stil een lege regel oplevert. */
  return c('pu.needsShots', { list: '' });
}

function paintCard(card) {
  if (!card.el) return;
  const ready = cardReady(card);

  /* ── GEEN INKLAPPEN MEER — 11 oktober 2026 (F3) ──────────────────────────
     Een kaart die af was, klapte dicht en opende de volgende. Met de knop voor
     3–4 foto's tegelijk is "af" het moment waarop de klant wil zien waar zijn
     foto's terecht zijn gekomen en ze wil kunnen wisselen — precies dan mag de
     kaart niet dichtklappen. Alle kaarten staan open onder elkaar; de balk
     bovenaan springt naar een product. */
  card.collapsed = false;
  card.wasReady = ready;

  /* "01 / 06", zoals op /concept/bestelrij. Bij één product alleen "01":
     "01 / 01" is een breuk die niets deelt. */
  if (card.numEl) {
    const eigen = String(card.n).padStart(2, '0');
    card.numEl.textContent = cards.length > 1
      ? `${eigen} / ${String(cards.length).padStart(2, '0')}`
      : eigen;
  }

  card.el.classList.toggle('is-ready', ready);
  card.el.classList.remove('is-collapsed');
  /* De verwijderknop hoort bij de laatste kaart, en alleen boven het bestelde
     aantal. Hier geschilderd en niet bij het bouwen, want beide voorwaarden
     veranderen terwijl de kaart al bestaat. */
  if (card.wegEl) card.wegEl.hidden = !(cards[cards.length - 1] === card && cards.length > minCards());
  if (card.stateEl) card.stateEl.textContent = cardStateText(card, ready);
  /* De knop bovenaan de kaart: vol als er nog niets in zit, rustig ("Foto's
     bijzetten") zodra er iets staat — dan is hij niet meer de eerste handeling. */
  if (card.kiesKnop) {
    const iets = [...SHOT_IDS, ...hoekVakIds()].some((id) => card.slots[id] && slotFilled(card, id));
    card.kiesKnop.textContent = iets ? c('pu.kiesNog') : c('pu.kies');
    card.kiesKnop.setAttribute('aria-label', `${iets ? c('pu.kiesNog') : c('pu.kies')} — ${cardLabel(card)}`);
    card.kiesKnop.classList.toggle('btn-primary', !iets);
    card.kiesKnop.classList.toggle('btn-ghost', iets);
  }
  /* Alle vakken die op deze kaart staan, en niet alleen de vaste vier: er kunnen
     hoekvakken, referentievakken en contextvakken bij staan. */
  Object.keys(card.slots).forEach((id) => paintSlot(card, id));
  /* De regel op de lade hoort bij de kaart: het gezicht van de BESTELLING kan
     wijzigen (paintModelDefaults) en dan verandert wat "volgt de bestelling"
     betekent. */
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
  /* De soorten eerst: een kaart die de soort van zijn voorganger overneemt,
     moet zijn contextvakjes al hebben voordat hij geschilderd wordt. */
  syncSoorten();
  cards.forEach(paintErbij);
  cards.forEach(paintCard);
  // The card count moves with the count on step 1, and the copy-down has
  // nothing to say while there is one card.
  syncCopyDown(cards[0]);
  const out = q('[data-pl-progress]');
  if (out) out.textContent = progressText();
  syncAddKnop();
  renderTray();
  paintRij();
  bewaarConcept();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DE RIJ — ÉÉN PRODUCT TEGELIJK, 17 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Zie de noot bij `data-pl-rij` in ProductUploader.astro voor het waarom. Hier
 * staat alleen hoe.
 *
 * ── DE KAARTEN BLIJVEN ALLEMAAL IN DE DOM ─────────────────────────────────
 *
 * Er wordt niets weggehaald of opnieuw gebouwd bij het verplaatsen; alleen de
 * NIET-actieve kaarten krijgen `hidden`. Dat is niet luiheid maar noodzaak:
 * aan elke kaart hangen bestandsobjecten, uploadstatussen, sleepluisteraars en
 * de verwijzingen in `card.slots`. Een kaart die uit de DOM gaat en terugkomt,
 * is een kaart waarvan de helft van die dingen stil niet meer werkt — en het
 * formulier POST bovendien de naamvelden van álle producten, ook die je nu
 * niet ziet. `hidden` houdt ze in het formulier en uit beeld.
 *
 * ── EN DE INKLAPPER GAAT UIT ──────────────────────────────────────────────
 *
 * Een kaart die je toch al als enige ziet, hoeft niet dicht te kunnen. De
 * inklaplogica (open de volgende zodra deze af is) zou bovendien met de rij
 * vechten: die twee zouden allebei beslissen waar je naartoe gaat. In de rij
 * beslist de rij.
 */
let rijNu = 0;

/* ── SINDS 11 OKTOBER 2026 (F3) IS DE RIJ GEEN BLADERAAR MEER ───────────────
 * Hij toonde één kaart tegelijk met "Vorige" en "Volgend product" eronder: een
 * stappenplan in het stappenplan, naast "Verder" van de stap zelf. Nu staan alle
 * kaarten open onder elkaar, en blijft van de rij alleen de balk over: één
 * vierkantje per product met een streepje per verplichte foto, aanklikbaar om
 * naar dat product te springen. `rijNu` is het product waar de klant het laatst
 * was (de dikke rand), en `rijAan()` zegt of de balk er staat. */

/** Staat de balk er? Onder de twee producten is er niets om naartoe te springen. */
function rijAan() {
  return cards.length > 1 && !!q('[data-pl-rij]');
}

function naarKaart(i, verplaats = true) {
  if (!cards.length) return;
  rijNu = Math.max(0, Math.min(cards.length - 1, Math.floor(i) || 0));
  paintRail();
  paintWkKaarten();
  const kaart = cards[rijNu];
  if (verplaats && kaart && kaart.el) {
    kaart.el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    /* De naam is het eerste dat je invult; daarna de knop voor de foto's. Focus
       zetten is geen luxe: wie met het toetsenbord werkt, staat anders nog op
       het vierkantje in de balk. */
    const doel = kaart.input || kaart.kiesKnop;
    if (doel) { try { doel.focus({ preventScroll: true }); } catch { /* ok */ } }
  }
}

function paintRij() {
  const rij = q('[data-pl-rij]');
  const aan = rijAan();
  if (rij) rij.hidden = !aan;
  cards.forEach((k) => { if (k.el) k.el.hidden = false; });
  if (rijNu > cards.length - 1) rijNu = Math.max(0, cards.length - 1);
  const out = q('[data-pl-progress]');
  if (out) out.textContent = progressText();
  if (aan) paintRail();
  paintWkKaarten();
}

/* ── ÉÉN PRODUCT TEGELIJK — levering 59 (afvinklijst 36, b-stap2) ──────────────────
   In de werkplaats staat alleen de kaart van het product waar je bent; de knoppen
   bovenaan (de balk hierboven) en Vorig en Volgend product onderaan wisselen. Elke
   kaart blijft in de pagina, met al zijn velden: verborgen, niet uitgeschakeld, dus hij
   post en wordt bewaard zoals altijd. Op 11 oktober 2026 werd dit één lange lijst
   (afvinklijst 2, form a); deze keuze draait dat terug. */
function paintWkKaarten() {
  if (!werkAan()) return;
  const meer = cards.length > 1;
  cards.forEach((k, i) => { if (k.el) k.el.hidden = meer && i !== rijNu; });
  const balk = q('[data-wk-bladeren]');
  if (!balk) return;
  balk.hidden = !meer;
  if (!meer) return;
  const t = q('[data-wk-bladeren-t]', balk);
  if (t) t.textContent = String(balk.dataset.wkVan || '{i}/{n}').replace('{i}', String(rijNu + 1)).replace('{n}', String(cards.length));
  const vorige = q('[data-wk-vorige]', balk);
  const volgende = q('[data-wk-volgende]', balk);
  if (vorige) vorige.disabled = rijNu === 0;
  if (volgende) volgende.hidden = rijNu >= cards.length - 1;
  if (!balk.dataset.wkGebonden) {
    balk.dataset.wkGebonden = '1';
    const naar = (d) => {
      naarKaart(rijNu + d, false);
      const stap = stepNode(2);
      const top = stap ? stap.getBoundingClientRect().top + window.scrollY - 96 : 0;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      const kaart = cards[rijNu];
      const doel = kaart && (kaart.input || kaart.kiesKnop);
      if (doel) { try { doel.focus({ preventScroll: true }); } catch { /* ok */ } }
    };
    if (vorige) vorige.addEventListener('click', () => naar(-1));
    if (volgende) volgende.addEventListener('click', () => naar(1));
  }
}

/* ── BOVEN HOEVEEL PRODUCTEN DE STREEPJES RUIS WORDEN ────────────────────────
   Twintig producten maal vijf verplichte foto's is honderd streepjes van drie
   pixels op één regel. Dan telt niemand meer mee: je ziet een gearceerde balk
   en geen gat. Tot en met acht producten is het een signaal — "bij dit ene
   product mist er nog één" — en daarboven doet het vierkantje zijn oude werk
   weer alleen: af of niet af, en openklikken voor de rest. */
const RAIL_VAKJES_MAX = 8;

/* De balk. Eén vierkantje per product, gekloond uit het <li> in de markup —
   nooit met createElement gebouwd, want dan draagt het geen scope-attribuut en
   krijgt het geen enkele regel uit de <style> van dit onderdeel.

   De streepjes ERIN zijn de uitzondering: hoeveel het er zijn hangt af van de
   hoeken die in stap 1 bijbesteld zijn, dus die kunnen niet in de markup staan.
   Ze worden hier gemaakt en hun opmaak staat daarom onder `:global()` in
   ProductUploader.astro — met een <i> en niet een <span>, zodat de selector
   daar geen klassenaam nodig heeft die iemand hier ooit kan hernoemen. */
function paintRail() {
  const rail = q('[data-pl-rail]');
  if (!rail || !rail.firstElementChild) return;
  const model = rail.firstElementChild;
  while (rail.children.length < cards.length) rail.appendChild(model.cloneNode(true));
  while (rail.children.length > cards.length) rail.removeChild(rail.lastElementChild);

  /* Dezelfde reeks als op de kaart en in missingRequired(): de vaste hoeken
     eerst, de bijbestelde daarna. Eén keer bepaald en niet per kaart, want hij
     is voor elk product in de rij gelijk — zo staat het streepje van de
     achterkant bij elk product op dezelfde plek en kun je een kolom lezen.

     ── EN DE DRAAGFOTO STAAT ER OOK BIJ ────────────────────────────────────
     Die is niet verplicht, maar hij houdt de kaart wél tegen tot je hem
     beantwoordt — sturen of overslaan, zie undecided(). Zonder dat streepje
     zou een kaart met alle streepjes vol toch niet afgevinkt zijn, en dan
     wijst de balk naar een gat dat er niet is. Vol betekent hier dus
     "beantwoord" en niet "opgestuurd". */
  /* Ontdubbeld: als shots.js ooit een verplichte foto óók als te-beslissen
     markeert, staat hij hier anders twee keer als streepje. */
  const vakIds = [...REQUIRED_SHOT_IDS, ...hoekVakIds(), ...MUST_DECIDE_SHOT_IDS]
    .filter((id, i, rij) => rij.indexOf(id) === i);
  const vakAf = (kaart, id) => slotFilled(kaart, id)
    || (mustDecideShot(id) && kaart.slots[id] && kaart.slots[id].status === 'skipped');
  const toonVakjes = cards.length <= RAIL_VAKJES_MAX && vakIds.length > 0;

  cards.forEach((kaart, i) => {
    const li = rail.children[i];
    const knop = li ? li.querySelector('[data-pl-rail-knop]') : null;
    if (!knop) return;
    const klaar = cardReady(kaart);
    knop.classList.toggle('is-af', klaar);
    knop.classList.toggle('is-nu', i === rijNu);
    const naam = kaart.input && kaart.input.value.trim();
    const label = naam || c('pu.railNaam', { i: i + 1 });
    knop.setAttribute('aria-label', `${label} — ${klaar ? c('pu.ready') : cardStateText(kaart, false)}`);
    knop.setAttribute('aria-current', i === rijNu ? 'true' : 'false');
    /* Roving tabindex: één stop in de balk en niet twintig. Wie met Tab door
       het formulier loopt, komt op het vierkantje waar hij staat en gaat met
       de pijltjes verder — zie bindRailToetsen(). */
    knop.tabIndex = i === rijNu ? 0 : -1;
    const tekst = knop.querySelector('[data-pl-rail-naam]');
    if (tekst) tekst.textContent = label;
    /* De werkplaats toont de knop met nummer, naam en telling (levering 59). */
    const wkNr = knop.querySelector('[data-wk-rail-nr]');
    if (wkNr) wkNr.textContent = String(i + 1).padStart(2, '0');
    const wkNaam = knop.querySelector('[data-wk-rail-naam]');
    if (wkNaam) wkNaam.textContent = label;
    const wkTel = knop.querySelector('[data-wk-rail-tel]');
    if (wkTel) wkTel.textContent = klaar || !vakIds.length ? '' : `${vakIds.filter((id) => vakAf(kaart, id)).length}/${vakIds.length}`;

    /* ── WAAR HET GAT ZIT ───────────────────────────────────────────────────
       Het vierkantje zei tot nu toe alleen "af" of "niet af". Eén streepje per
       verplichte foto zegt er bij hoeveel er nog missen, zonder de kaart te
       openen. De streepjes staan NIET in het aria-label: dat draagt al de zin
       uit cardStateText(), die in woorden zegt wat er ontbreekt, en een
       schermlezer heeft niets aan "streepje 3 van 5". Vandaar aria-hidden op
       de strook in de markup. */
    const strip = knop.querySelector('[data-pl-rail-vakjes]');
    if (strip) {
      knop.classList.toggle('heeft-vakjes', toonVakjes);
      if (!toonVakjes) {
        strip.textContent = '';
      } else {
        while (strip.children.length < vakIds.length) strip.appendChild(document.createElement('i'));
        while (strip.children.length > vakIds.length) strip.removeChild(strip.lastElementChild);
        vakIds.forEach((id, k) => {
          strip.children[k].classList.toggle('is-vol', !!vakAf(kaart, id));
        });
      }
    }
    if (!knop.dataset.plRailGebonden) {
      knop.dataset.plRailGebonden = '1';
      knop.addEventListener('click', () => naarKaart(i));
    }
  });
  paintRailLooks(rail);
}

/* ── DE STUKKEN VAN EEN LOOK ALS ÉÉN VORM — levering 60 (c-look) ─────────────
   De knoppen van een look staan naast elkaar onder LOOK A, met de snede ertussen.
   De volgorde in de DOM blijft die van de producten (rail.children[i] hoort bij
   cards[i], en de pijltjes volgen de producten); alleen de volgorde OP HET SCHERM
   schuift, met `order`. De opmaak staat in werkplaats.css. */
function paintRailLooks(rail) {
  const looks = kaartLooks();
  const t = erbijTekst();
  let plek = 0;
  const gezet = new Set();
  cards.forEach((kaart) => {
    if (gezet.has(kaart)) return;
    const look = looks.find((l) => l.kaarten.includes(kaart));
    const rij = look ? look.kaarten : [kaart];
    rij.forEach((k, j) => {
      gezet.add(k);
      const li = rail.children[cards.indexOf(k)];
      if (!li) return;
      li.style.order = String(plek++);
      if (look) {
        li.dataset.wkLook = look.letter;
        li.dataset.wkLookPos = j === 0 ? 'eerst' : (j === rij.length - 1 ? 'laatst' : 'midden');
        li.dataset.wkLookLabel = String(t.railLook || 'Look {l}').replace('{l}', look.letter);
      } else {
        delete li.dataset.wkLook;
        delete li.dataset.wkLookPos;
        delete li.dataset.wkLookLabel;
      }
    });
  });
}

/* ── PIJLTJESTOETSEN DOOR DE RIJ ─────────────────────────────────────────────
 *
 * Op /concept/bestelrij luisterde dit op de hele stap: waar je ook stond, een
 * pijltje sprong naar het volgende product. Hier niet, en dat is een bewuste
 * afwijking van het prototype. Het echte formulier staat vol met dingen die de
 * pijltjes zelf gebruiken — een keuzelijst, een radiogroep, een getalveld, een
 * vouw — en een formulier dat je keuze verspringt terwijl je een achtergrond
 * aanwijst, is erger kapot dan een formulier zonder sneltoetsen.
 *
 * Dus luistert het op de balk. Daar staat de blik al op "welk product", de
 * pijltjes betekenen daar niets anders, en het is de patroonafspraak die een
 * schermlezer ook verwacht bij een roving tabindex. Home en End zitten erbij
 * omdat ze bij datzelfde patroon horen en niets kosten.
 *
 * De poort wordt hier niet omzeild: de balk laat je met een muis ook naar elk
 * product springen. Wat de poort tegenhoudt is de knop "volgende" — en die
 * hoort niet op een pijltje te reageren, anders is de poort met één toets van
 * tafel.
 */
function bindRailToetsen() {
  const rail = q('[data-pl-rail]');
  if (!rail || rail.dataset.plToetsen) return;
  rail.dataset.plToetsen = '1';
  rail.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const naar = { ArrowRight: rijNu + 1, ArrowLeft: rijNu - 1, Home: 0, End: cards.length - 1 }[e.key];
    if (naar === undefined) return;
    const doel = Math.max(0, Math.min(cards.length - 1, naar));
    e.preventDefault();
    if (doel === rijNu) return;
    /* Zonder verplaatsing: naarKaart() zet de blik anders in het naamveld van
       het product, en dan doet het vólgende pijltje niets meer omdat de balk
       de blik kwijt is. De kaart komt hieronder wél in beeld. */
    naarKaart(doel, false);
    const kaart = cards[rijNu];
    if (kaart && kaart.el) kaart.el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
    const li = rail.children[rijNu];
    const knop = li && li.querySelector('[data-pl-rail-knop]');
    if (knop) { try { knop.focus({ preventScroll: true }); } catch { /* ok */ } }
  });
}

function bindRij() {
  bindRailToetsen();
  /* Waar de klant is, volgt waar hij werkt: een veld of knop op een kaart die de
     focus krijgt, maakt die kaart de huidige in de balk. Eén luisteraar op de
     lijst, want de kaarten komen en gaan met het aantal. */
  const host = q('[data-pl-cards]');
  if (host && !host.dataset.plNuGebonden) {
    host.dataset.plNuGebonden = '1';
    host.addEventListener('focusin', (e) => {
      const li = e.target && e.target.closest ? e.target.closest('.pu-card') : null;
      const i = li ? cards.findIndex((k) => k.el === li) : -1;
      if (i >= 0 && i !== rijNu) { rijNu = i; if (rijAan()) paintRail(); }
    });
  }
  paintRij();
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
  /* Ook het vak van een bijbestelde hoek (ronde 9, F23). */
  return SHOT_IDS.indexOf(id) !== -1 || hoekVakIds().indexOf(id) !== -1;
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
    /* GEEN STILLE VOORKEUZE (ronde 9, F23). Zonder deze lege eerste optie stond
       elk menu op "product 1 · Voorkant", en één klik op Plaats deze verving dus
       de voorkant van product 1. Nu kies je eerst; leeg doet niets. */
    const leeg = document.createElement('option');
    leeg.value = '';
    leeg.textContent = c('pu.placeIn');
    leeg.selected = true;
    leeg.disabled = true;
    pick.appendChild(leeg);
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
      /* De vakken van de bijbestelde hoeken horen erbij: ze zijn verplicht, en
         wie ze uit de bak wilde plaatsen kon dat niet (ronde 9, F23). */
      SHOT_IDS.concat(hoekVakIds(), refIds).forEach((id) => {
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
      /* Onthouden dat de MEETING weigerde, zodat een upload die al onderweg was
         het vakje niet alsnog op "Verstuurd" zet (verstuurSlot). */
      s.geweigerd = true;
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
  /* Ook na de daggrens is "Opnieuw" een nieuw besluit van een mens: misschien
     is het inmiddels een nieuwe dag. Het blok blijft staan; zegt de server
     opnieuw nee, dan weet de klant waarom. */
  uploadsVol = false;

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

/* ── HET EERSTE BESTAND BEGINT EEN BATCH, EN DAT VRAAGT DE BOTCHECK — o03 ──
   8 oktober 2026. /api/upload maakt voor een upload zonder batch een nieuwe
   aan; dat is het moment waarop een script opslag kan gaan vullen. Alleen dan
   gaat er een token mee. De wachtrij is één voor één (`chain`), dus het tweede
   bestand heeft de batch van het eerste al. */
function sendSlot(card, id) {
  const s0 = card.slots[id];
  const voor = !batch && !uploadsOff && !uploadsVol && s0 && s0.file && s0.status === 'sending'
    ? botToken(form, 'upload')
    : Promise.resolve('');
  return voor.then((token) => verstuurSlot(card, id, token));
}

function verstuurSlot(card, id, token) {
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
    /* ── EN IS HIJ INTUSSEN NIET GEWEIGERD — 14 oktober 2026 ──────────────────
       De beeldkeuring loopt naast de upload (placeFile). Landt de meting "te
       klein" terwijl dit verzoek al onderweg is, dan zette het antwoord het vakje
       hierna gewoon op "Verstuurd" en kwam de foto alsnog bij de bestelling —
       en bij een netwerkfout probeerde failSlot() hem zelfs opnieuw. Gevonden
       doordat tests/stap2-kaart-browser.test.mjs op Lucas' pc (UITROLLEN.bat)
       en hier onder drukte "filled" las waar "failed" hoorde: in de toets is het
       verzoek meestal sneller dan de meting, live is het andersom. */
    const geweigerd = () => s.geweigerd === true;

    if (uploadsOff) {
      s.status = 'failed';
      s.msg = c('upload.err.unavailable');
      paintSlot(card, id);
      refreshUploader();
      return resolve();
    }
    if (uploadsVol) {
      s.status = 'failed';
      s.msg = c('upload.err.dag-limiet');
      paintSlot(card, id);
      refreshUploader();
      return resolve();
    }

    const fd = new FormData();
    fd.append('file', s.file);
    if (batch) fd.append('batch', batch);
    else if (token) fd.append('turnstile', token);
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
      if (!live() || geweigerd()) return resolve();
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
        if (!live() || geweigerd()) {
          // Uploaded into a slot that is gone, or that the measurement refused
          // while this was in flight. Take it straight back out — `staged` is
          // what decides the order’s files, and this never joins it.
          removeStaged(body.file.key);
          if (live()) { paintSlot(card, id); refreshUploader(); }
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
      /* De daggrens: niet opnieuw proberen (retryableUpload kent `dag-limiet`
         niet), de rest van de wachtrij laten staan, en één keer de uitleg. */
      if (code === 'dag-limiet') {
        uploadsVol = true;
        const vol = q('[data-pl-upload-note="limiet"]');
        if (vol) vol.hidden = false;
      }

      if (live() && !geweigerd()) {
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

/* Is er een ingelogde klant? Dan gaat de bestelling via /account/order — zie
   submit hieronder. Blijft false bij een uitgelogde bezoeker of een mislukte
   /account/me: dan gewoon /api/order, zoals altijd. */
let ingelogdBestellen = false;
/* Het tegoed van de ingelogde klant, in centen — ook voor de betaalregel in
   stap 5 (ronde 9, F52). */
let tegoedMeCents = 0;

function toonTegoed(me) {
  const el = q('[data-pl-tegoed]');
  const cents = Math.round(Number(me && me.tegoedCents) || 0);
  tegoedMeCents = cents > 0 ? cents : 0;
  if (!el || !(cents > 0)) return;
  const nl = document.documentElement.lang === 'nl';
  const bedrag = '€ ' + new Intl.NumberFormat(nl ? 'nl-NL' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
  el.textContent = String(el.dataset.tekst || '').replace('{bedrag}', bedrag);
  el.hidden = false;
}

/* ── CREDITS IN STAP 5 — 8 oktober 2026 (ronde B, §28.2, 6.06) ───────────────
 *
 * Een ingelogde abonnee betaalt met credits: stap 5 zegt "Deze bestelling kost
 * 48 credits · je hebt er 120 · daarna 72" en de knop heet "Bestellen met
 * credits". Kan het niet — voorrang of een eigen look met toeslag (een complete
 * look kan sinds 17 oktober 2026 wel: 4 credits per look),
 * of te weinig credits — dan zegt het waarom, wat wél past, wanneer er nieuwe
 * credits komen en wat het via Mollie kost. Nooit gemengd.
 *
 * Alleen tekst: /account/order rekent zelf en boekt zelf af. Zonder script
 * blijft dit blok verborgen en beslist de server precies hetzelfde.
 */
function toonCredits(me) {
  const c = me && me.credits;
  creditsMe = c && (Number(c.saldo) > 0 || c.nieuw) ? c : null;
  syncCredits();
}

/* Een {veld} in een tekst invullen. Alleen textContent verderop, nooit HTML. */
function vul(tekst, velden) {
  return String(tekst || '').replace(/\{(\w+)\}/g, (_, k) => (k in velden ? String(velden[k]) : ''));
}

/* 6 november / 6 November, zonder jaar: het gaat altijd om de komende maanden. */
/* De dag vóór een vervaldatum: "vervalt op 14 januari" = "geldig tot en met 13
   januari" (doorloop 27, B21; zie dagErvoor in src/lib/creditWeergave.js). */
function dagVoor(iso) {
  const t = Date.parse(`${String(iso || '').slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - 864e5).toISOString().slice(0, 10) : String(iso || '');
}

function creditDatum(iso) {
  try {
    return new Intl.DateTimeFormat(cfg.lang === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`));
  } catch { return String(iso || ''); }
}

/* De dienst die het formulier echt post. Een proef draagt hier 'test-sample',
   ook als kindOf() 'catalog' zegt — die kan nooit met credits. */
function geposteDienst() {
  const r = q('input[name="service"]:checked') || q('input[name="service"]');
  return r ? String(r.value || '') : '';
}

function syncCredits() {
  const box = q('[data-pl-credits]');
  if (!box) return;
  let t = {};
  try { t = JSON.parse(box.dataset.tekst || '{}'); } catch { t = {}; }
  const submit = q('[data-pl-submit]');
  if (submit && !submit.dataset.plGewoon) submit.dataset.plGewoon = submit.textContent;
  const tegoedEl = q('[data-pl-tegoed]');
  if (tegoedEl && !tegoedEl.dataset.plGewoon && tegoedEl.textContent) tegoedEl.dataset.plGewoon = tegoedEl.textContent;

  /* Mollie of credits: de Mollie-zinnen in "wat er gebeurt", de knoptekst en de
     tegoedregel volgen mee. */
  const mollie = (aan) => {
    qa('[data-pl-mollie]').forEach((el) => { el.hidden = !aan; });
    if (submit && submit.dataset.plGewoon) submit.textContent = aan ? submit.dataset.plGewoon : (t.submit || submit.dataset.plGewoon);
    if (tegoedEl && tegoedEl.dataset.plGewoon) {
      tegoedEl.textContent = aan
        ? tegoedEl.dataset.plGewoon
        : vul(t.tegoed, { bedrag: euro(tegoedMeCents / 100) });
    }
  };
  /* Extra credits bijkopen (12 oktober 2026): de regel met de link, en de hint. */
  const bijEl = q('[data-pl-credits-bij]', box);
  const hintEl = q('[data-pl-credits-hint]', box);
  const zetRegel = (el, tekst, href, label) => {
    if (!el) return;
    el.hidden = !tekst;
    const s = q('span', el);
    const a = q('a', el);
    if (s) s.textContent = tekst || '';
    if (a) { a.textContent = label || ''; if (href) a.setAttribute('href', href); }
  };
  zetRegel(bijEl, '');
  zetRegel(hintEl, '');
  const uit = (inCredits = false) => { box.hidden = true; box.classList.remove('is-credits'); mollie(true); creditsKosten = 0; zetGeldRegels(); zetCreditPrijzen(inCredits); };

  /* `creditsMe` eerst: zolang die leeg is (ook tijdens het laden), wordt
     `ingelogdBestellen` niet gelezen. */
  if (!creditsMe) return uit();
  const dienst = geposteDienst();
  if (!ingelogdBestellen || !CREDIT_DIENSTEN.includes(dienst)) return uit();
  const n = productCount();
  const kost = creditKosten({
    service: dienst, products: n, extras: extrasCount(), hoogRes: hoogResCount(),
    looks: lookCount(), voorrang: voorrangAan(), toeslagCents: Math.round(stijlToeslagNu() * 100),
  });
  const saldo = Math.max(0, Math.floor(Number(creditsMe.saldo) || 0));
  /* Geen creditprijs ("meer dan 30", nog geen aantal): dan niets zeggen. Wel de
     prijzen in credits zolang er niets is gekozen dat niet met credits kan. */
  if (kost.credits === null) return uit(saldo > 0 && !voorrangAan() && stijlToeslagNu() === 0);

  const net = totaalBij(kindOf(), n);
  const bedrag = Number.isFinite(net) ? euro(net) : '';
  const regels = [];
  let kop = '';
  let metCredits = false;

  if (!kost.kan) {
    const woorden = kost.nietMet.map((k) => t.opties && t.opties[k]).filter(Boolean);
    const opties = woorden.length > 1
      ? `${woorden.slice(0, -1).join(', ')} ${t.en || '&'} ${woorden[woorden.length - 1]}`
      : (woorden[0] || '');
    kop = vul(t.optie, { opties, bedrag });
    if (saldo >= kost.credits) regels.push(vul(t.zonder, { kosten: kost.credits, saldo }));
  } else if (saldo >= kost.credits) {
    metCredits = true;
    kop = vul(t.kost, { kosten: kost.credits, saldo, daarna: saldo - kost.credits });
    /* Oudste eerst (6.03): welke credits hiermee opgaan, en wat er daarna
       binnenkort nog vervalt. */
    const vervalt = Array.isArray(creditsMe.vervalt) ? creditsMe.vervalt : [];
    const op = oudsteEerst(vervalt, kost.credits);
    const grens = new Date(Date.now() + CREDITS_BINNENKORT_DAGEN * 864e5).toISOString().slice(0, 10);
    if (op.length && op[0].op && op[0].op <= grens) regels.push(vul(t.oudste, { aantal: op[0].aantal, datum: creditDatum(dagVoor(op[0].op)) }));
    let rest = kost.credits;
    for (const g of vervalt) {
      const over = Math.max(0, Number(g.aantal) - rest);
      rest = Math.max(0, rest - Number(g.aantal));
      if (over > 0) {
        if (g.op <= grens) regels.push(vul(t.binnenkort, { aantal: over, datum: creditDatum(dagVoor(g.op)) }));
        break;
      }
    }
    /* Het spaarplafond (12 oktober 2026): komt hij na deze bestelling bij de
       volgende termijn nog boven zijn plafond, dan zegt stap 5 hoeveel er dan
       wegvalt. Bijgekochte credits gaan eerst op en tellen niet mee. */
    const nw = creditsMe.nieuw;
    const plafond = Math.max(0, Math.floor(Number(creditsMe.plafond) || 0));
    if (plafond && nw && nw.op && t.boven) {
      const abo = Math.max(0, Math.floor(Number(creditsMe.aboSaldo) || 0));
      const bij = Math.max(0, saldo - abo);
      const aboNa = Math.max(0, abo - Math.max(0, kost.credits - bij));
      const bovenNa = Math.max(0, aboNa + Math.floor(Number(nw.aantal) || 0) - plafond);
      if (bovenNa > 0) regels.push(vul(t.boven, { datum: creditDatum(nw.op), aantal: nw.aantal, eraf: bovenNa }));
    }
    regels.push(t.na);
  } else {
    kop = vul(t.teWeinig, { kosten: kost.credits, saldo });
    const p = watPast({ service: dienst, products: n, extrasPerProduct: anglesChosen().length, hoogRes: hoogResCount(), saldo });
    const woord = (paar, k) => (Array.isArray(paar) ? paar[k === 1 ? 0 : 1] : '');
    if (p && p.past > 0) {
      regels.push(vul(t.past, {
        past: p.past, dienst: woord(t.dienst && t.dienst[dienst], p.past),
        eraf: p.eraf, producten: woord(t.product, p.eraf),
      }));
    }
    if (creditsMe.nieuw && creditsMe.nieuw.op) regels.push(vul(t.nieuw, { datum: creditDatum(creditsMe.nieuw.op), aantal: creditsMe.nieuw.aantal }));
    /* Bijkopen (ab-v4 = b): het kleinste pakket dat het tekort dekt en binnen
       de ruimte van deze maand past, met een link naar Studio. Daar staat het
       pakket al gekozen; na het betalen brengt "Verder met je bestelling" de
       klant hier terug, waar het concept (1.04) op hem wacht. */
    const bk = creditsMe.bijkoop;
    const tekort = kost.credits - saldo;
    if (bk && Array.isArray(bk.pakketten) && tekort > 0) {
      const ruimte = Math.max(0, Math.floor(Number(bk.ruimte) || 0));
      const p = bk.pakketten.filter((x) => x.credits >= tekort && x.credits <= ruimte).sort((a, b) => a.credits - b.credits)[0];
      const terug = encodeURIComponent(location.pathname);
      if (p) {
        zetRegel(bijEl, vul(t.tekort, { tekort, pakket: p.credits, bedrag: euro(p.euros) }),
          `/account/plan/?pakket=${p.credits}&verder=${terug}#bijkopen`, t.bijkoopLink);
        if (p.hint) zetRegel(hintEl, vul(t.hint, { plan: p.hint.naam, bedrag: euro(p.hint.bedrag), credits: p.hint.credits }), `/account/plan/?tab=plan${p.hint.naar ? `&naar=${encodeURIComponent(p.hint.naar)}` : ''}#overstappen`, t.hintLink);
      } else if (ruimte >= tekort) {
        zetRegel(bijEl, vul(t.tekortAlgemeen, { tekort, ruimte }), `/account/plan/?verder=${terug}#bijkopen`, t.bijkoopLink);
      }
    }
    if (bedrag) regels.push(vul(t.mollie, { bedrag }));
  }

  const kopEl = q('[data-pl-credits-kop]', box);
  if (kopEl) kopEl.textContent = kop;
  const lijst = q('[data-pl-credits-regels]', box);
  if (lijst) {
    lijst.textContent = '';
    for (const r of regels) {
      const li = document.createElement('li');
      li.textContent = r;
      lijst.appendChild(li);
    }
  }
  box.classList.toggle('is-credits', metCredits);
  box.hidden = false;
  if (current === 5) toonTip('credits');
  mollie(!metCredits);
  creditsKosten = metCredits ? kost.credits : 0;
  zetGeldRegels();
  zetCreditPrijzen(metCredits);
}

/* De prijzen in stap 1 in credits (zie `prijzenInCredits` bovenaan). Alleen
   tekst en zichtbaarheid; rekenen doen creditKosten() en de server. */
function zetCreditPrijzen(aan) {
  prijzenInCredits = !!aan;
  /* De euroladder ("nog 3 producten en het tarief zakt van €89 naar €65") en de
     besparingsregel gelden niet voor credits: die zijn per product vast. */
  if (prijzenInCredits) qa('[data-pl-rung], [data-pl-besparing]').forEach((el) => { el.hidden = true; });
  qa('.pl-total-vatnote').forEach((el) => { el.hidden = prijzenInCredits; });
  /* document en niet `form`: de zin onder de paginakop staat buiten het formulier. */
  document.querySelectorAll('[data-pl-alleen-credits]').forEach((el) => { el.hidden = !prijzenInCredits; });
  document.querySelectorAll('[data-pl-alleen-euro]').forEach((el) => { el.hidden = prijzenInCredits; });
  paintAngles();
}

/* ── MET CREDITS: GEEN EUROREGELS IN DE SAMENVATTING — 14 oktober 2026 ──────
   (doorloop 27, B26) Onder "Deze bestelling kost 8 credits · daarna 37" stond
   in dezelfde stap "Orderbedrag € 178 · Je betaalt bij Mollie € 215,38". Twee
   prijzen voor één bestelling, en de knop zei "Bestellen met credits". De
   euroregels dragen data-pl-geld (renderSummary); bij credits gaan ze weg en
   staat er één regel "Betaling · 8 credits van je abonnement". */
function zetGeldRegels() {
  const credits = creditsKosten > 0;
  /* Het totaal zelf ook (doorloop 27, B26b): het meelopende overzicht naast
     het formulier en het totaal in stap 1 zeiden bij betalen met credits nog
     "Totaal € 178 excl. btw · € 89 per product × 2". Met credits staat er
     "8 credits" en de creditregel; zonder komt de euroregel terug zoals
     syncTotal() hem het laatst schreef. */
  for (const el of qa('[data-pl-total]')) {
    if (credits) { el.textContent = c('sum.creditsTotaal', { n: creditsKosten }); el.dataset.plMetCredits = '1'; }
    else if (el.dataset.plMetCredits) { el.textContent = totaalEuro; delete el.dataset.plMetCredits; }
  }
  for (const el of qa('[data-pl-total-note]')) {
    if (credits) { el.textContent = c('sum.creditsWaarde', { n: creditsKosten }); el.dataset.plMetCredits = '1'; }
    else if (el.dataset.plMetCredits) { el.textContent = totaalNoot; delete el.dataset.plMetCredits; }
  }
  qa('.bo-totaal-s, .pl-total-excl').forEach((el) => { el.hidden = credits; });
  const host = q('[data-pl-summary]');
  if (!host) return;
  qa('[data-pl-geld]', host).forEach((el) => { el.hidden = credits; });
  qa('[data-pl-geld-credits]', host).forEach((el) => { el.hidden = !credits; });
  const dd = q('dd[data-pl-geld-credits]', host);
  if (dd && credits) dd.textContent = c('sum.creditsWaarde', { n: creditsKosten });
}

function bindPrefill() {
  accountMe()
    .then((me) => {
      if (!form) return;
      if (me) {
        ingelogdBestellen = !!me.email;
        if (ingelogdBestellen) form.setAttribute('action', '/account/order');
        toonTegoed(me);
        toonCredits(me);
        applyAccount(me);
        return;
      }
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
    .catch(() => {}) // offline of /account/me onbereikbaar — het formulier werkt leeg ook
    /* 8.06: pas NA de opgeslagen gegevens, zodat het land uit het account altijd
       voorgaat op het land van het ip-adres. */
    .then(() => vulLandVoor());
}

/*
 * ── HET LAND, VOORGEVULD MET HET LAND VAN DE BEZOEKER — 8 oktober 2026 (8.06) ──
 *
 * Uit Cloudflare (GET /api/land, zie functions/api/land.js). Een voorzet en geen
 * keuze: het veld staat gewoon zichtbaar in stap 3 en is te wijzigen, want een
 * vpn of een zakenreis geeft een ander land. NOOIT OVERSCHRIJVEN: staat er al
 * een land (uit het account, of de klant koos er zelf een terwijl het verzoek
 * onderweg was), dan blijft dat staan. Het `change`-event laat het btw-veld, de
 * vorm van het nummer en het registratienummer meteen meegaan, net als bij een
 * keuze met de hand.
 */
function vulLandVoor() {
  const select = q('select[name="country"]');
  if (!select || select.value || typeof fetch !== 'function') return undefined;
  return fetch('/api/land', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((uit) => {
      const land = uit && typeof uit.land === 'string' ? uit.land : '';
      if (!land || select.value) return;
      if (!Array.from(select.options).some((o) => o.value === land)) return;
      select.value = land;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })
    .catch(() => {});
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
  /* Zonder vis_in is er niemand ingelogd (v31-me = a, src/data/cookies.js). */
  try { if (!/(?:^|;\s*)vis_in=1(?:;|$)/.test(document.cookie)) return Promise.resolve(null); } catch { /* dan vragen */ }
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
  /* O33 (ronde 9): sinds het KVK-nummer in Nederland altijd gevraagd wordt (29
     september), stond het blok open zonder vinkje — en vulde deze regel het
     niet meer in, omdat hij op het vinkje wachtte. Nu: invullen zodra het blok
     te zien is, ongeacht waarom. syncReg() eerst, zodat het land dat hierboven
     is ingevuld al heeft bepaald of het blok er staat. */
  const reg = q('input[name="reg_number"]');
  syncReg();
  const regBlok = q('[data-pl-reg]');
  if (reg && me.regNumber && !reg.value && regBlok && !regBlok.hidden) reg.value = me.regNumber;

  applySavedBackground(me);
  // Tiles first: applyBrandKit() may want to preselect one of them.
  addBrandModels(me);
  addOwnStyles(me);
  applyBrandKit(me);
  /* Een eigen merkmodel (?face=c<id>) bestaat pas nu; de link gaat vóór de
     brand kit, want dat is een keuze van zojuist (punt 3.07). */
  applyLookUitUrl({ alleenGezicht: true });
  /* Werklijst 33: "Opnieuw bestellen met alle instellingen" (?van=<id>), als
     laatste: de keuzes van die bestelling gaan voor de brand kit. */
  applyVanBestelling(me);

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
     radiogroep — zie vulModelTegels(). Zonder deze regel mist elke productkaart
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
  const passend = styles.filter((st) => st && st.id && (st.service === 'both' || st.service === kind));
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
      /* De toeslag per product, zodat het lopende totaal hem meetelt. Zie
         stijlToeslagNu(). /account/me geeft hem als `surchargeCents`. */
      input.dataset.plStyleSurcharge = String(Number(st.surchargeCents) || 0);
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
  /* In de werkplaats (levering 59) staat de achtergrond verborgen; het blok komt dan bij
     01 Stijl, onder de kaarten. */
  const wkHost = q('[data-wk-eigen-stijl]');
  const box = document.createElement('fieldset');
  box.className = 'pl-fieldset pl-own-look';
  box.setAttribute('data-pl-own-look', '');
  const label = c('pu.ownLookH') || 'Your own look';
  const rows = [`<label class="own-look-opt"><input type="radio" name="style" value=""${wanted ? '' : ' checked'}><span class="own-look-text"><span class="own-look-name">${escHtml(c('pu.ownLookNone') || 'Standard look')}</span></span></label>`]
    .concat(passend.map((st) => `<label class="own-look-opt${st.preview ? ' has-img' : ''}">
        <input type="radio" name="style" value="cs-${st.id}" data-pl-style-name="${escHtml(st.name)}" data-pl-style-surcharge="${Number(st.surchargeCents) || 0}"${wanted === `cs-${st.id}` ? ' checked' : ''}>
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
  const rij = wkHost ? null : bg.closest('details.dc');
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
  } else if (wkHost) {
    wkHost.appendChild(box);
    wkHost.hidden = false;
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1C1D18"/><text x="24" y="264" font-family="Hanken Grotesk, Arial, sans-serif" font-size="22" font-weight="700" fill="#4A1FFF">${tekst}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/* ── "BESTEL MET DEZELFDE LOOK" — 8 oktober 2026 (punt 3.07) ─────────────────
 *
 * De knop op de privélink en in Studio (src/lib/herbestel.js) opent dit
 * formulier met de keuzes van een eerdere bestelling: ?style= (al gelezen door
 * StylePicker en, voor een eigen look, addOwnStyles()), en ?bg=, ?ratio= en
 * ?face=, die hier gelezen worden. Naam, KVK en adres zitten er nooit in (V28 = a).
 *
 * DEZELFDE DISCIPLINE ALS StylePicker: een waarde uit de URL gaat nergens de
 * pagina in. Hij wordt gefilterd en daarna alleen vergeleken met een radio die
 * de pagina zelf heeft gerenderd; bestaat die niet, dan blijft staan wat er
 * stond. Een uitgezette radio (bijv. wit verplicht bij een marktplaats) wordt
 * niet aangevinkt. Stap 2 zelf wordt niet aangeraakt: het gezicht is de radio
 * waar de productkaarten hun standaard uit halen (paintModelDefaults()).
 */
function applyLookUitUrl({ alleenGezicht = false } = {}) {
  let qs;
  try { qs = new URLSearchParams(location.search); } catch { return; }
  const kies = (r) => {
    if (!r || r.disabled || r.checked) return;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (!alleenGezicht) {
    kiesAchtergrond(String(qs.get('bg') || ''), kies);
    const ratio = String(qs.get('ratio') || '');
    if (/^[a-z0-9-]{2,16}$/.test(ratio)) kies(qa('input[name="ratio"]').find((r) => r.value === ratio));
  }
  const face = String(qs.get('face') || '');
  if (/^[a-z0-9-]{1,24}$/.test(face)) {
    const r = qa('input[name="model"]').find((x) => x.value === face);
    if (r && !r.checked) {
      kies(r);
      paintModelDefaults();
    }
  }
  syncSummaries();
}

/** Een achtergrond als hexcode kiezen: een vaste tegel als die er is, anders de
    eigen kleur (zelfde vorm als applySavedBackground()). true als het lukte. */
function kiesAchtergrond(waarde, kies) {
  const bg = String(waarde || '').replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(bg)) return false;
  const hex = `#${bg}`;
  const vast = qa('input[name="background"]').find((r) => (r.dataset.plBgHex || '').toUpperCase() === hex);
  if (vast) { if (vast.disabled) return false; kies(vast); return true; }
  const eigen = q('input[name="background"][data-pl-bg-custom]');
  if (!eigen || eigen.disabled) return false;
  const text = q('[data-pl-bg-text]');
  const color = q('[data-pl-bg-color]');
  if (text) text.value = hex;
  if (color) color.value = hex;
  kies(eigen);
  syncBackground(kindOf());
  return true;
}

/* ── OPNIEUW BESTELLEN MET ALLE INSTELLINGEN — 15 oktober 2026 (werklijst 33) ──
 *
 * De link in Studio (herbestelAllesKnop() in src/lib/herbestel.js) opent dit
 * formulier met ?van=<id>. Voor een ingelogde klant haalt dit de instellingen van
 * die bestelling op (GET /account/orders/<id>/instellingen, alleen de eigenaar)
 * en zet ze in het formulier: de kanalen (eerst, want een marktplaats zet de
 * grond vast), de look, de achtergrond, de verhouding, het gezicht, de extra
 * hoeken met wat de klant bij een eigen hoek typte, de notitie en het aantal
 * outfits. Daarna zegt het blok bovenaan wat er overgenomen is, zodat de klant
 * het naloopt; het blok is weg te klikken. Producten, foto's en voorrang gaan
 * niet mee.
 *
 * DEZELFDE DISCIPLINE ALS applyLookUitUrl(): elke waarde wordt alleen vergeleken
 * met een veld dat de pagina zelf tekent. Wat er niet (meer) is, wordt
 * overgeslagen. Uitgelogd of een bestelling van iemand anders: niets.
 */
function applyVanBestelling(me) {
  let id = 0;
  try { id = Number.parseInt(new URLSearchParams(location.search).get('van') || '', 10) || 0; } catch { return; }
  const box = q('[data-pl-van]');
  if (!id || id < 1 || !box || !me || typeof fetch !== 'function') return;
  const wat = q('[data-pl-van-wat]', box);
  const toon = (tekst) => {
    if (wat) wat.textContent = tekst;
    box.hidden = false;
    const sluit = q('[data-pl-van-sluit]', box);
    if (sluit && !sluit.dataset.plGebonden) {
      sluit.dataset.plGebonden = '1';
      sluit.addEventListener('click', () => { box.hidden = true; });
      box.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.hidden = true; });
    }
  };
  fetch(`/account/orders/${id}/instellingen`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((inst) => {
      if (!inst || !inst.dienst) { toon(c('van.fout')); return; }
      if (inst.dienst !== kindOf()) return;
      const kies = (r) => {
        if (!r || r.disabled) return false;
        if (!r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
        return true;
      };
      const delen = [];
      /* LEVERING 58 (afvinklijst 36, v36-aantal = a): het aantal producten eerst, want
         de kaarten, de outfits en de vorm per foto hangen eraan. Alleen als de klant
         hier nog niets koos: wat hij net zelf intikte, gaat voor. Via het getalveld,
         zodat het dezelfde weg loopt als een klik (bindQty). */
      const aantalVeld = q('[data-pl-qty-input]');
      const aantalSel = q('select[name="products"]');
      const aantal = Number(inst.aantal) || 0;
      if (aantal > 0 && aantalVeld && aantalSel && (!/^\d+$/.test(String(aantalSel.value || '')) || aantalSel.dataset.wkStandaard === '1')) {
        const max = Number.parseInt(aantalVeld.max, 10) || aantal;
        if (aantal <= max) {
          aantalVeld.value = String(aantal);
          aantalVeld.dispatchEvent(new Event('input', { bubbles: true }));
          delen.push(aantal === 1 ? c('van.aantal1') : c('van.aantalN', { n: aantal }));
        }
      }
      /* De kanalen eerst: precies die van toen. */
      const kanalen = Array.isArray(inst.kanalen) ? inst.kanalen : [];
      const vakjes = qa('input[name="channels"]');
      if (vakjes.length && kanalen.length) {
        let n = 0;
        vakjes.forEach((b) => {
          const aan = kanalen.includes(b.value);
          if (b.disabled) return;
          if (b.checked !== aan) { b.checked = aan; b.dispatchEvent(new Event('change', { bubbles: true })); }
          if (aan) n += 1;
        });
        if (n) delen.push(n === 1 ? c('van.kanaal1') : c('van.kanaalN', { n }));
      }
      if (inst.style && kies(qa('input[name="style"]').find((x) => x.value === inst.style))) delen.push(c('van.look'));
      if (inst.bg && kiesAchtergrond(inst.bg, kies)) delen.push(c('van.achtergrond'));
      if (inst.ratio && kies(qa('input[name="ratio"]').find((x) => x.value === inst.ratio))) delen.push(c('van.verhouding'));
      if (inst.model) {
        const r = qa('input[name="model"]').find((x) => x.value === inst.model);
        if (kies(r)) { paintModelDefaults(); delen.push(c('van.model')); }
      }
      const namen = [];
      for (const h of (Array.isArray(inst.hoeken) ? inst.hoeken : [])) {
        const b = q(`input[name="angle_${h.id}"]`);
        if (!b || b.disabled) continue;
        const veld = q(`input[name="angle_note_${h.id}"]`);
        if (veld && h.note && !veld.value) { veld.value = String(h.note); veld.dispatchEvent(new Event('input', { bubbles: true })); }
        kies(b);
        namen.push(hoekNaam(h.id) || h.id);
      }
      if (namen.length) delen.push(namen.length === 1 ? c('van.hoek1', { namen: namen[0] }) : c('van.hoekN', { n: namen.length, namen: namen.join(', ') }));
      /* De achtergrond per foto (werklijst 27, en v29-hex = b: ook een eigen
         kleur). Na de hoeken, want een hoek heeft pas een rij als hij gekozen is. */
      syncSummaries();
      let perBeeld = 0;
      for (const b of (Array.isArray(inst.beelden) ? inst.beelden : [])) {
        const hex = normalizeHex(b && b.hex);
        const rij = hex && q(`[data-pl-bgfoto-beeld="${String(b.sleutel || '').replace(/[^a-z0-9-]/g, '')}"]`);
        const sel = rij && q('[data-pl-bgfoto-select]', rij);
        if (!sel || sel.disabled || rij.hidden) continue;
        const aanbevolen = [...sel.options].find((o) => String(o.value).toUpperCase() === hex);
        if (aanbevolen) sel.value = aanbevolen.value;
        else {
          const hx = q('[data-pl-bgfoto-hex]', rij);
          const kl = q('[data-pl-bgfoto-kleur]', rij);
          if (!hx) continue;
          sel.value = 'eigen'; hx.disabled = false; hx.value = hex; if (kl) kl.value = hex;
        }
        perBeeld += 1;
      }
      if (perBeeld) delen.push(perBeeld === 1 ? c('van.beeld1') : c('van.beeldN', { n: perBeeld }));
      /* c-kopie: de vorm per foto, als die bij alle producten van toen gelijk was
         (bestelInstellingen() geeft alleen die). Na het aantal, want dan staan de
         kaarten er; per kaart het keuzeveld van die foto, alleen als het die vorm kent. */
      const vormNrs = [];
      for (const v of (Array.isArray(inst.vormen) ? inst.vormen : [])) {
        const nr = Number(v && v.beeld) || 0;
        const r = String((v && v.ratio) || '');
        if (!nr || !/^[a-z0-9-]{2,16}$/.test(r)) continue;
        const velden = qa(`select[data-pl-ratio-each][name$="_${nr}"]`).filter((sel) => /^ratio_p\d+_\d+$/.test(sel.name) && !sel.disabled && [...sel.options].some((o) => o.value === r));
        if (!velden.length) continue;
        velden.forEach((sel) => { if (sel.value !== r) { sel.value = r; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
        vormNrs.push(nr);
      }
      if (vormNrs.length) delen.push(c(vormNrs.length === 1 ? 'van.vorm1' : 'van.vormN', { nrs: vormNrs.length > 1 ? `${vormNrs.slice(0, -1).join(', ')} ${c('van.en')} ${vormNrs[vormNrs.length - 1]}` : String(vormNrs[0]) }));
      /* v36-bericht = a: het bericht niet invullen, wel een knop ernaast. Het ging vaak
         over die ene levering ("voor de zomercollectie"); met de knop is het één tik
         als het wel weer klopt. */
      const noot = q('textarea[name="message"]');
      const berichtKnop = q('[data-pl-van-bericht]');
      if (noot && berichtKnop && inst.notitie) {
        berichtKnop.textContent = c('van.berichtKnop', { ref: String(inst.ref || '') });
        berichtKnop.hidden = false;
        if (!berichtKnop.dataset.plGebonden) {
          berichtKnop.dataset.plGebonden = '1';
          berichtKnop.addEventListener('click', () => {
            const tekst = String(inst.notitie);
            noot.value = noot.value.trim() ? `${noot.value.replace(/\s+$/, '')}\n${tekst}` : tekst;
            noot.dispatchEvent(new Event('input', { bubbles: true }));
            berichtKnop.hidden = true;
            noot.focus();
          });
        }
        delen.push(c('van.bericht'));
      }
      /* De indeling van de looks (afvinklijst 38, d-kopie): welke plaatsen samen
         een look zijn. Net als bij v36-outfits alleen samen met het aantal
         (bestelInstellingen() geeft anders niets), en na het aantal, want de
         kaarten bestaan pas dan. De stukken zelf vul je opnieuw in. */
      if (Array.isArray(inst.looks) && inst.looks.length && zetLookIndeling(inst.looks)) delen.push(c('van.looks'));
      syncSummaries();
      const en = c('van.en');
      const lijst = delen.length > 1 ? `${delen.slice(0, -1).join(', ')} ${en} ${delen[delen.length - 1]}` : (delen[0] || c('van.niets'));
      toon(c('van.wat', { ref: String(inst.ref || ''), lijst }));
    })
    .catch(() => toon(c('van.fout')));
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
  /* ── ALS ADRESKAART, NIET ALS KALE REGELS — 19 september 2026 ─────────────
     Dertien losse regels zonder label ("Test", "NL", "7531HK") lazen als een
     dump. Nu drie of vier regels zoals ze op een envelop staan: wie, hoe te
     bereiken, waar, en het btw-nummer met het woord van zijn eigen veldlabel
     ervoor. `select` erbij: country is een keuzelijst — de landnaam en niet de
     code. */
  const waarde = (key) => {
    const input = q(`input[name="${key}"], select[name="${key}"]`);
    if (!input) return '';
    if (input.tagName === 'SELECT') {
      const opt = input.options[input.selectedIndex];
      return opt && input.value ? (opt.textContent || input.value).trim() : '';
    }
    return input.value.trim();
  };
  const labelVan = (key) => {
    const input = q(`input[name="${key}"], select[name="${key}"]`);
    const lab = input && input.id ? q(`label[for="${input.id}"]`) : null;
    return lab ? lab.textContent.replace(/\*/g, '').replace(/\s+/g, ' ').trim() : key;
  };
  const regel = (delen, sep = ' · ') => {
    const t = delen.filter(Boolean).join(sep);
    if (!t) return;
    const li = document.createElement('li');
    li.textContent = t;
    list.appendChild(li);
  };
  regel([[waarde('first_name'), waarde('last_name')].filter(Boolean).join(' '), waarde('brand')]);
  regel([waarde('email'), waarde('phone'), waarde('website')]);
  regel([
    [waarde('address_line1'), waarde('address_line2')].filter(Boolean).join(', '),
    [waarde('postal_code'), waarde('city')].filter(Boolean).join(' '),
    waarde('region'), waarde('country'),
  ], ', ');
  if (waarde('vat')) regel([`${labelVan('vat')}: ${waarde('vat')}`]);
  if (!list.children.length) return false;

  fields.hidden = true;
  panel.hidden = false;
  /* De verklaring voor verlegde btw zat tot 8 oktober 2026 als apart vinkje in
     deze groep (en verhuisde hier naar onder de adreskaart, ronde 8 B-B9). Sinds
     8.06 staat ze in het zakelijk-vinkje van stap 5; dit zet die zin gelijk met
     de zojuist ingevulde gegevens. */
  syncVatConfirm();

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

function runGate(from = null) {
  // The tier the count earned, read back from the field the server will read.
  // Not re-derived: two places deciding which orders get a window is how one of
  // them ends up asking the calendar a question the other never sends.
  const attended = value('tier') === 'attended';
  /* Bladeren ("eerder"/"later") houdt de gekozen datum vast; een verse
     controle (na een stapwissel of "opnieuw checken") begint leeg. */
  if (from === null) { clearWindow(); gateStapel.length = 0; }

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
      qa('[data-pl-cap-max]').forEach((el) => { el.textContent = String(cfg.maxProducts); });
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

  const vanaf = typeof from === 'string' ? `&from=${encodeURIComponent(from)}` : '';

  fetch(`/api/capacity?products=${encodeURIComponent(products)}&tier=attended${svcDeel}${vanaf}`, {
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
  /* ── EIGEN HAAK, NIET `[data-max]` — 2 oktober 2026 (ronde 9, F25) ─────────
     Hier stond een selector op elk [data-max]. De hoekkiezer (AnglePicker.astro) draagt óók
     `data-max` — het maximum aantal hoeken per product — en dus zette elke
     bestelling vanaf 10 producten, op het moment dat stap 4 de agenda ophaalde,
     de textContent van de hele hoekkiezer op "39". Alle aangevinkte hoeken
     verdwenen uit het formulier, het overzicht en de post: live bestelde
     VIS-VS4X-BRJ 12 producten met 2 hoeken (€ 1.308 in de zijbalk) en betaalde
     € 612. De twee getallen hebben nu elk hun eigen naam. */
  if (Number.isFinite(Number(body.max))) {
    qa('[data-pl-cap-max]').forEach((n) => {
      n.textContent = String(body.max);
    });
  }

  if (panel === 'ok') renderWindows(body.windows || [], { from: body.from, earlier: body.earlier, more: body.more });
  gateShow(panel);
}

/*
 * ── DE LEVERDATA ALS RIJ DAGKAARTEN — 19 september 2026 ─────────────────────
 *
 * Van 10 tot 19 september stond hier een maandruit (Lucas: *"als een agenda
 * waar de klant kan klikken op een beschikbare datum"*). De doorlichting met
 * een bestelling van twintig producten liet zien wat die ruit deed: heel
 * september getekend, 1–18 grijs, 28–30 grijs, alleen 22–27 klikbaar, geen
 * oktober en geen manier om verder te kijken. Wie over drie weken een launch
 * heeft, kon niets kiezen — en de cellen sprongen van 112 naar 56 px zodra je
 * er een aanklikte.
 *
 * Nu: alleen het kiesbare venster, als rij van zes dagkaarten, met "eerder" en
 * "later" om per zes dagen te schuiven. De poort levert per aanroep zes
 * vensters vanaf een startdag (`from`) en zegt of er ervoor of erna nog iets
 * is (`earlier`, `more`). Eén kaart is één startdag; de tweede dag van het
 * venster staat op de kaart zelf ("– wo 23"), zodat niemand een zaterdag kiest
 * en pas in de bevestiging leest dat er een zondag bij hoort.
 *
 * VASTE HOOGTE. De kaart heeft dezelfde maat vóór en na de keuze; wat
 * verandert is de rand en de kleur, nooit de hoogte. De gekozen datum blijft
 * bewaard als je verder bladert: de verborgen velden en de regel eronder
 * volgen de keuze, niet de bladzijde.
 *
 * De weekdag- en maandnamen komen uit Intl, niet uit de copy — elke browser
 * kent ze in beide talen.
 */
let gateFrom = null;   // de startdag van de rij die nu op het scherm staat
const gateStapel = []; // de startdagen van eerdere bladzijden, voor "eerder"

function renderWindows(windows, meta) {
  const host = q('[data-pl-windows]');
  if (!host) return;
  /* De regel onder de rij die de gekozen periode uitschrijft. Hij overleeft
     het bladeren: staat er al één, dan blijft die staan — dus ophalen VÓÓR
     het vak wordt leeggemaakt. */
  let keuze = q('[data-pl-kal-keuze]', host);
  host.textContent = '';
  const info = meta || {};
  gateFrom = typeof info.from === 'string' ? info.from : null;

  const geldig = (windows || []).filter((w) => w && typeof w.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.start));
  const taal = cfg.lang === 'nl' ? 'nl-NL' : 'en-GB';
  const gekozen = value('window_start') || '';

  if (!keuze) {
    keuze = document.createElement('p');
    keuze.className = 'pl-kal-keuze';
    keuze.setAttribute('data-pl-kal-keuze', '');
    keuze.hidden = true;
  }

  const rij = document.createElement('div');
  rij.className = 'pl-dagen';
  rij.setAttribute('role', 'group');
  rij.setAttribute('aria-label', c('gate.windowSub'));

  if (!geldig.length) {
    const leeg = document.createElement('p');
    leeg.className = 'pl-kal-leegzin';
    leeg.textContent = c('gate.none');
    rij.appendChild(leeg);
  }

  geldig.forEach((w) => {
    const eind = w.end || w.start;
    const knop = button('', 'pl-dag');
    knop.dataset.start = w.start;
    knop.dataset.end = eind;
    knop.setAttribute('aria-pressed', w.start === gekozen ? 'true' : 'false');
    if (w.start === gekozen) knop.classList.add('is-picked');
    knop.setAttribute('aria-label', eind !== w.start ? `${day(w.start)} – ${day(eind)}` : day(w.start));

    const wd = document.createElement('span');
    wd.className = 'pl-dag-wd';
    wd.textContent = deel(taal, w.start, { weekday: 'short' });
    const nr = document.createElement('span');
    nr.className = 'pl-dag-nr';
    nr.textContent = deel(taal, w.start, { day: 'numeric' });
    const mnd = document.createElement('span');
    mnd.className = 'pl-dag-mnd';
    mnd.textContent = deel(taal, w.start, { month: 'short' });
    knop.append(wd, nr, mnd);
    if (eind !== w.start) {
      const tot = document.createElement('span');
      tot.className = 'pl-dag-tot';
      tot.textContent = `– ${deel(taal, eind, { weekday: 'short', day: 'numeric' })}`;
      knop.appendChild(tot);
    }
    knop.addEventListener('click', () => kiesVenster(knop, host, keuze));
    rij.appendChild(knop);
  });
  host.appendChild(rij);

  /* Eerder / later. Alleen tonen wat er is: een knop naar een lege bladzijde
     is een belofte die niet uitkomt. */
  const nav = document.createElement('div');
  nav.className = 'pl-dagen-nav';
  const eerder = button(c('gate.earlier'), 'pl-dagen-knop');
  eerder.hidden = !(info.earlier && gateStapel.length);
  eerder.addEventListener('click', () => {
    const terug = gateStapel.pop();
    runGate(terug === undefined ? null : terug);
  });
  const later = button(c('gate.later'), 'pl-dagen-knop');
  later.hidden = !info.more || !geldig.length;
  later.addEventListener('click', () => {
    gateStapel.push(gateFrom);
    const laatste = geldig[geldig.length - 1];
    runGate(dagNa(laatste.start));
  });
  const bereik = document.createElement('span');
  bereik.className = 'pl-dagen-bereik';
  if (geldig.length) {
    const a = geldig[0].start;
    const b = geldig[geldig.length - 1].start;
    bereik.textContent = `${deel(taal, a, { day: 'numeric', month: 'short' })} – ${deel(taal, b, { day: 'numeric', month: 'short' })}`;
  }
  nav.append(eerder, bereik, later);
  if (!eerder.hidden || !later.hidden) host.appendChild(nav);

  host.appendChild(keuze);
}

/** Eén deel van een datum, in de taal van de pagina. */
function deel(taal, iso, opties) {
  try {
    return new Intl.DateTimeFormat(taal, { ...opties, timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`)).replace(/\.$/, '');
  } catch { return iso; }
}

/** De dag na een ISO-datum, als ISO-datum. */
function dagNa(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Eén venster kiezen: de kaart aan, de velden gezet, de regel eronder gevuld. */
function kiesVenster(knop, host, keuze) {
  qa('.pl-dag', host).forEach((o) => {
    o.classList.remove('is-picked');
    o.setAttribute('aria-pressed', 'false');
  });
  knop.classList.add('is-picked');
  knop.setAttribute('aria-pressed', 'true');

  const start = knop.dataset.start;
  const eind = knop.dataset.end;
  setHidden('window_start', start);
  setHidden('window_end', eind);

  keuze.hidden = false;
  keuze.textContent = eind !== start
    ? `${c('gate.chosen')}: ${day(start)} – ${day(eind)}`
    : `${c('gate.chosen')}: ${day(start)}`;
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

/*
 * ── WANNEER HET KOMT, BOVEN DE KNOP — 8 oktober 2026 (1.07) ───────────────────
 * Eén regel in "Wat er gebeurt nadat je op de knop drukt": de gekozen datum
 * (vanaf de drempel), voorrang, of de gewone levertijd uit turnaround(), en
 * daarachter de revisieronde met REVISIE_DAGEN. De proef heeft geen revisieronde
 * (§2.8 van het overzicht), dus daar alleen de levertijd.
 */
function syncWanneer(attended, ws, we) {
  const el = q('[data-pl-wanneer]');
  if (!el) return;
  let zin;
  if (attended && ws) zin = c('wanneer.venster', { datum: we && we !== ws ? `${day(ws)} – ${day(we)}` : day(ws) });
  else if (attended) zin = c('wanneer.later');
  else if (voorrangAan()) zin = c('wanneer.voorrang');
  else zin = c('wanneer.snel');
  el.textContent = cfg.sample ? zin : `${zin} ${c('wanneer.revisie')}`;
}

function renderSummary() {
  const host = q('[data-pl-summary]');
  if (!host) return;
  host.textContent = '';

  const kind = kindOf();
  const n = productCount();
  const attended = value('tier') === 'attended';
  const select = q('select[name="products"]');
  const count = select ? select.options[select.selectedIndex] : null;
  const lookN = lookCount();

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
    /* "we leveren op zuiver wit" klopt alleen als de achtergrond ook wit is. Bij
       een eigen kleur stond er "Niet gezegd — we leveren op zuiver wit" boven
       "Achtergrond: Je eigen kleur — #1E3A5F". 24 september 2026. */
    const bgNu = String(value('background_hex') || '').toUpperCase();
    const geenKanaal = (!bgNu || bgNu === '#FFFFFF') ? c('sum.channelsNone') : c('sum.channelsNoneKort');
    rows.push([c('sum.channels'), namen.length ? namen.join(', ') : geenKanaal]);
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
  /* EEN EIGEN CATALOGLOOK (24 september 2026). Op /start/catalog komen de eigen
     looks van de klant als `style=cs-…` naast de catalogstijl. Het overzicht
     zei dan "Stijl · catalog: Classic" én "Stijl · lifestyle: <eigen look>" bij
     een bestelling zonder lifestyle. Bij catalog is de eigen look DE stijl. */
  const eigen = q('input[name="style"]:checked');
  if (kindOf() === 'catalog' && eigen && !eigen.matches(':disabled') && /^cs-/.test(eigen.value)) {
    stijlRij('style', 'sum.style');
  } else {
    const heeftBeide = !!q('[name="catalog_style"]') && !!q('[name="style"]');
    stijlRij('catalog_style', heeftBeide ? 'sum.styleCatalog' : 'sum.style');
    stijlRij('style', heeftBeide ? 'sum.styleLifestyle' : 'sum.style');
  }

  // De verhouding. Altijd, want elke bestelling heeft er een — er is geen
  // stroom waar deze vraag niet wordt gesteld, en dus geen leeg antwoord dat
  // "niet gevraagd" zou kunnen betekenen. Wat een enkel beeld afwijkt, staat
  // niet op deze regel: dertig kaarten × drie beelden is geen bevestigingsscherm
  // meer, en de afwijking staat op de kaart waar hij gezet is.
  const ratioId = ratioNow();
  if (ratioId) rows.push([c('sum.ratio'), c(`ratio.name.${ratioId}`)]);
  /* RONDE 9, F11 — de boetiek zette beeld 3 van product 1 op 16:9 en zag hier
     alleen "4:5". Geen dertig regels (zie hierboven), wel één: tot drie
     afwijkingen bij naam, daarboven het aantal en waar ze staan. */
  const afwijk = qa('select[data-pl-ratio-each]').filter((sel) => sel.value && !sel.disabled && sel.isConnected);
  if (afwijk.length) {
    const naam = (sel) => {
      const m = /^ratio_p(\d+)_(\d+)$/.exec(sel.name || '');
      return m ? `${c('pu.product', { n: m[1] })} · ${c('pu.ratioImage', { n: m[2] }).toLowerCase()}: ${c(`ratio.name.${sel.value}`)}` : c(`ratio.name.${sel.value}`);
    };
    rows.push([c('sum.ratioAfwijk'), afwijk.length <= 3
      ? afwijk.map(naam).join('; ')
      : c('sum.ratioAfwijkVeel', { n: afwijk.length })]);
  }

  // De complete looks (levering 60): een regel met het aantal en de prijs per look.
  if (lookN > 0) rows.push([c('sum.look'), c('sum.lookN', { price: euro(lookPrijs()), n: lookN })]);

  /* ── DE TWEE BETAALDE KEUZES VAN 9 SEPTEMBER ──────────────────────────────
     Ze staan hier om dezelfde reden als het setje erboven: het zijn de enige
     twee dingen op dit scherm die het bedrag veranderen zonder dat er een
     product bij komt. Wie ze niet koos, ziet ze niet — een regel "0 producten
     in 4K" is ruis. */
  const hoogN = hoogResCount();
  if (hoogN > 0) rows.push([c('sum.hoogRes'), c(hoogN === 1 ? 'sum.hoogRes1' : 'sum.hoogResN', { n: hoogN, px: String((cfg.hoogRes && cfg.hoogRes.hoog) || '') })]);
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
    /* ── HETZELFDE GETAL ALS IN DE ZIJBALK — 19 september 2026 ──────────────
       Dit stond als quoteFor(kind, n, outfits): zonder extra hoeken, zonder
       hoge resolutie en zonder voorrang. Gemeten op de livesite: zijbalk
       "€492" (5 × €82 + €82 voorrang), samenvatting "Orderbedrag €410". Het
       scherm dat vraagt of alles klopt, noemde een ander bedrag dan de kassa.
       Nu dezelfde som als syncTotal(). */
    const quote = kind ? quoteFor(kind, n, lookN, extrasCount(), hoogResCount()) : null;
    if (quote) {
      const voorrang = voorrangAan() ? voorrangBedragNu(quote.net) : null;
      const net = voorrang !== null ? round2(quote.net + voorrang) : quote.net;
      rows.push([c('sum.net'), euro(net), 'geld']);
      /* De vervangende regel voor betalen met credits; zetGeldRegels() kiest. */
      rows.push([c('sum.credits'), c('sum.creditsWaarde', { n: creditsKosten || 0 }), 'credits']);
      /* ── WAT MOLLIE ZO meteen VRAAGT — 2 oktober 2026 (ronde 9, F7) ──────
         Tot vandaag stond hier alleen het bedrag excl. btw, en vroeg Mollie
         één klik later € 107,69 voor een bestelling die hier € 89 heette. De
         regel in de lijst hierboven ("geen bruto bedrag, want het tarief hangt
         van het land af") klopte in stap 1, waar het land nog niet bekend is.
         In stap 5 IS het land bekend, en dan is het tarief op drie van de vier
         paden zeker. Het vierde — EU met btw-nummer — hangt aan VIES op de
         server, dus daar noemen we beide uitkomsten in plaats van te raden.
         Zelfde regel als vatDecision(): twijfel is 21%. */
      /* NIET value('country'): die leest alleen <input>, en het land is een
         <select>. De eerste versie van deze regel bleef daardoor altijd leeg. */
      const land = String((q('select[name="country"]') || {}).value || '').trim().toUpperCase();
      const btwNr = String(value('vat') || '').trim();
      const geenNr = !!(q('input[type="checkbox"][name="no_vat"]') || {}).checked;
      if (land) {
        const bruto = round2(net * (1 + VAT_RATE));
        const pct = String(Math.round(VAT_RATE * 100));
        const buiten = !isEu(land) && land !== HOME_COUNTRY;
        const verlegd = !buiten && land !== HOME_COUNTRY && btwNr && !geenNr;
        if (buiten) {
          rows.push([c('sum.pay'), c('sum.payOutside', { net: euro(net) }), 'geld']);
        } else if (verlegd) {
          rows.push([c('sum.pay'), c('sum.payReverse', { net: euro(net), gross: euro(bruto), pct }), 'geld']);
        } else {
          rows.push([c('sum.pay'), c('sum.payGross', { gross: euro(bruto), pct }), 'geld']);
        }
        /* ── EN HET TEGOED ERAF — ronde 9, F52 ────────────────────────────
           De regel hierboven noemde € 107,69 terwijl Mollie € 82,69 vroeg: de
           server haalt het tegoed van het bedrag incl. btw af (zie
           src/lib/tegoedVerrekening.js). Bij verleggen hangt het bedrag aan
           VIES, dus daar alleen dát het eraf gaat. */
        if (tegoedMeCents > 0) {
          const tegoed = tegoedMeCents / 100;
          if (verlegd) {
            rows.push([c('sum.tegoed'), c('sum.tegoedAf', { tegoed: euro(tegoed) }), 'geld']);
          } else {
            const rest = Math.max(0, round2((buiten ? net : bruto) - tegoed));
            rows.push([c('sum.tegoed'), rest > 0
              ? c('sum.tegoedRest', { tegoed: euro(tegoed), rest: euro(rest) })
              : c('sum.tegoedNul', { tegoed: euro(tegoed) }), 'geld']);
          }
        }
      }
    }
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
  /* Met voorrang staat de leverregel al hierboven ("we mikken op 24 uur") —
     een tweede regel "Standaard levertijd" eronder spreekt hem tegen. */
  /* De zin "een vastgezette leverdatum blijft zeven dagen voor je staan" in het
     blok eronder hoort alleen bij een bestelling MET een leverdatum (ronde 9, F3). */
  const naVenster = q('[data-pl-after-window]');
  if (naVenster) naVenster.hidden = !(attended && ws);
  syncWanneer(attended, ws, we);
  /* 8.06: het merk kan zonder invoer-event zijn ingevuld (opgeslagen gegevens),
     dus de verleggingszin in het zakelijk-vinkje hier nog één keer gelijkzetten. */
  syncVatConfirm();
  if (attended && ws) rows.push([c('sum.window'), we && we !== ws ? `${day(ws)} – ${day(we)}` : day(ws)]);
  else if (attended) rows.push([c('sum.window'), c('sum.windowLater')]);
  else if (!voorrangAan()) rows.push([c('sum.window'), c('sum.queue')]);

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

  rows.forEach(([k, v, soort]) => {
    if (!k || !v) return;
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    if (soort === 'geld') { dt.dataset.plGeld = ''; dd.dataset.plGeld = ''; }
    if (soort === 'credits') { dt.dataset.plGeldCredits = ''; dd.dataset.plGeldCredits = ''; }
    host.appendChild(dt);
    host.appendChild(dd);
  });
  zetGeldRegels();
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
    /* RONDE 9, F6 — hier stond het voorbeeldbeeld van de achtergrondkiezer op
       (een zwart T-shirt). Naast de roze jeans van de klant las dat als "jullie
       maken het verkeerde product". De kleur zegt genoeg; een staal is een staal. */
  }
  if (ratioId) {
    const tile = q(`[data-pl-ratio-tile="${ratioId}"] .ratio-shape`);
    const t = item(c(`ratio.name.${ratioId}`), 'is-ratio');
    t.style.aspectRatio = tile && tile.style.aspectRatio ? tile.style.aspectRatio : '1 / 1';
    t.style.height = '84px';
    /* Het kader met de EIGEN voorkant erin (F6), niet het voorbeeldshirt: zo
       zie je je eigen product in de verhouding die je koos. Geen foto (nog):
       dan een leeg kader in de juiste vorm. */
    const eigen = shown[0] && shown[0].slots[front].url;
    if (eigen) {
      const im = document.createElement('img');
      im.alt = '';
      im.src = eigen;
      t.appendChild(im);
    }
  }
  strip.hidden = !strip.childElementCount;
}

/**
 * ── NIET ZOMAAR WEG — 2 oktober 2026 (ronde 9, F33) ─────────────────────────
 *
 * De stappen van dit formulier hebben geen eigen adres. De terugknop van de
 * browser gaat dus niet naar de vorige STAP maar weg van de pagina, en verversen
 * begint helemaal opnieuw: aantal, productnamen, keuzes en de koppeling met de
 * al geüploade foto's zijn weg. De starter die "veel terug klikt" verloor zo
 * alles zonder één woord.
 *
 * Nu vraagt de browser het eerst ("Wil je deze site verlaten?"), maar alleen
 * als er iets te verliezen is: voorbij stap 1, of met foto's in de bak. Tijdens
 * het versturen niet — dan gaat de pagina met opzet naar Mollie of de
 * bedankpagina.
 */
function bindVertrekWaarschuwing() {
  window.addEventListener('beforeunload', (e) => {
    if (busy) return;
    if (current <= 1 && !staged.length) return;
    e.preventDefault();
    e.returnValue = '';
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

  /* Een ingelogde klant bestelt via /account/order (29 september 2026): alleen
     daar ziet de server de sessie, en dus het tegoed. Zie account.js. */
  /* ── EERST HET TOKEN VAN DE BOTCHECK — 8 oktober 2026 (o03) ─────────────
     Hooguit zes seconden, en alleen als de botcheck aan staat. Komt er geen,
     dan gaat de bestelling zonder: de server laat hem door en markeert hem.
     Een ingelogde klant hoeft het niet (de server kijkt er dan niet naar),
     maar het kost hem niets, dus één weg voor iedereen. */
  botToken(form, 'bestelling')
    .then((token) => { if (token) fd.set('turnstile', token); })
    .then(() => fetch(ingelogdBestellen ? '/account/order' : '/api/order', { method: 'POST', body: fd, headers: { accept: 'application/json' } }))
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
    /* 1.04: de bestelling staat; het concept op dit apparaat is klaar. */
    wisConcept();
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
      /* Het kenmerk erbij (ronde 9, F38): de bedankpagina gebruikt deze waarden
         alleen als ze bij DEZE bestelling horen. Anders toonde een aanvraag
         daarna in hetzelfde tabblad het adres van de vorige bestelling. */
      let tyRef = String(body.ref || '');
      if (!tyRef) { try { tyRef = new URL(body.redirect, location.href).searchParams.get('ref') || ''; } catch { tyRef = ''; } }
      sessionStorage.setItem('vis-ty-ref', tyRef.toUpperCase());
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
      /* De vastgezette leverdata, zodat de bedankpagina niet "zo snel mogelijk"
         zegt bij een bestelling met een venster (ronde 9, F29). Leeg = wachtrij. */
      const ws = value('window_start');
      const we = value('window_end');
      if (ws) sessionStorage.setItem('vis-ty-venster', we && we !== ws ? `${day(ws)} – ${day(we)}` : day(ws));
      else sessionStorage.removeItem('vis-ty-venster');
      /* Voorrang (naloop A2, 8 okt 2026): anders zei de bedankpagina "zo snel
         mogelijk" bij een bestelling met voorrang. Alleen een vlag, geen bedrag. */
      if (voorrangAan()) sessionStorage.setItem('vis-ty-voorrang', '1');
      else sessionStorage.removeItem('vis-ty-voorrang');
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
    /* Onthouden welke bestelling er in dit tabblad net is geplaatst, voor als
       de klant op de betaalpagina op "terug" drukt — zie checkOpenOrder(). */
    try { if (body.ref) sessionStorage.setItem('vis-open-order', JSON.stringify({ ref: body.ref, t: Date.now() })); } catch { /* geen opslag */ }
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

  /* ── DE WEIGERING DIE DE PAGINA AL KENT — 23 september 2026 ──────────────
     /test-sample heeft voor 'sample-used' (één proef per bedrijf) een eigen
     kader met uitleg en twee uitwegen, maar dat kader werd alleen getoond op
     de omleiding ?error=… van een gewone POST. Deze fetch kreeg dezelfde
     weigering als JSON en zette er "je bestelling kwam niet aan op onze
     server" onder — onwaar, en zonder de reden. Staat er voor deze code een
     [data-form-refusal], dan is dát het antwoord. */
  if (status >= 400 && body && body.error && typeof document.querySelector === 'function') {
    const kader = document.querySelector(`[data-form-refusal="${String(body.error).replace(/[^a-z0-9-]/gi, '')}"]`);
    if (kader) {
      kader.hidden = false;
      try { kader.focus({ preventScroll: false }); } catch { kader.scrollIntoView({ block: 'center' }); }
      return;
    }
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

  /* ── DE BESTELLIMIET — 14 oktober 2026 (doorloop 27, B06) ─────────────────
     /api/order weigert na een paar bestellingen kort na elkaar met 429 en
     { error: 'rate', retryAfter } (functions/api/order.js, checkRate). Hier
     stond dan "je bestelling kwam niet aan op onze server" — onwaar. Een bureau
     dat vijf merken achter elkaar bestelt, of een kantoor met één IP-adres,
     raakt die grens. Nu de echte reden en hoe lang het duurt. */
  if (status === 429 && body && body.error === 'rate') {
    const sec = Math.max(60, Number(body.retryAfter) || 600);
    const min = Math.ceil(sec / 60);
    const nl = (document.documentElement.lang || '').startsWith('nl');
    const duur = nl ? `${min} ${min === 1 ? 'minuut' : 'minuten'}` : `${min} ${min === 1 ? 'minute' : 'minutes'}`;
    setError(c('submit.rate', { min: duur }));
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
  /* In beeld, en niet achter de vaste balk: de melding stond na een
     geweigerde verzending half onder de navigatie. scroll-margin-top staat
     in de css van .pl-error. */
  if (text) { try { box.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch { /* ok */ } }
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
/* Zelfde reden als bij setSummary() hierboven: `data-pl-total` staat sinds het
   meelopende overzicht op twee plekken. */
function setText(sel, text) {
  for (const el of qa(sel)) el.textContent = text || '';
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

/**
 * ── TERUG VAN DE BETAALPAGINA — 24 september 2026 ──────────────────────────
 *
 * Staat er in dit tabblad een bestelling van het afgelopen uur die nog niet
 * betaald is, dan zegt het formulier dat bovenaan, met een knop die er een
 * verse betaling voor maakt (/api/order-pay) en een knop om toch opnieuw te
 * beginnen. Betaald, geannuleerd of niet te lezen: het blok blijft weg en de
 * sleutel verdwijnt. Alleen sessionStorage — één tabblad, weg bij sluiten.
 */
function checkOpenOrder() {
  let open = null;
  try { open = JSON.parse(sessionStorage.getItem('vis-open-order') || 'null'); } catch { open = null; }
  const blok = q('[data-pl-open]');
  if (!open || !open.ref || !blok) return;
  const vergeet = () => { try { sessionStorage.removeItem('vis-open-order'); } catch { /* geen opslag */ } };
  if (!(Date.now() - Number(open.t || 0) < 60 * 60 * 1000)) { vergeet(); return; }
  if (!/^VIS-[A-Z0-9-]{3,20}$/i.test(open.ref)) { vergeet(); return; }
  const taal = (q('input[name="lang"]') || {}).value === 'nl' ? 'nl' : 'en';
  fetch(`/api/order-status?ref=${encodeURIComponent(open.ref)}`, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((st) => {
      if (!st || st.paid || st.cancelled || !st.payable) { vergeet(); return; }
      const ref = q('[data-pl-open-ref]', blok);
      if (ref) ref.textContent = open.ref;
      const pay = q('[data-pl-open-pay]', blok);
      if (pay) pay.href = `/api/order-pay?ref=${encodeURIComponent(open.ref)}&lang=${taal}`;
      const nieuw = q('[data-pl-open-new]', blok);
      if (nieuw) nieuw.addEventListener('click', () => { vergeet(); blok.hidden = true; }, { once: true });
      blok.hidden = false;
      /* De browser zet de scrollpositie terug op waar de verstuurknop stond —
         op een formulier dat nu weer op stap 1 staat is dat de footer. */
      try { blok.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch { /* oude browser */ }
    })
    .catch(() => { /* niets te melden: het formulier werkt gewoon */ });
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HET FORMULIER ONTHOUDT DE KEUZES EN DE FOTO'S, NIET DE GEGEVENS
 * 11 oktober 2026 (F3, punt 1.04, V51 = a)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Op een telefoon gooit de browser het tabblad weg als de klant naar zijn camera
 * of WhatsApp gaat, of hij komt via Instagram terug in een nieuw tabblad. Dan
 * was alles weg: de look, het aantal, en de foto's die al bij ons stonden.
 *
 * WAT ER BEWAARD WORDT (localStorage, `vis-bestelling`, zie cookies.js): de
 * velden van stap 1 en 2 — look, aantal, opties, per product de naam, soort,
 * materiaal, kleur en gezicht — en van de foto's alleen het batchkenmerk en
 * welke foto in welk vak stond. NOOIT stap 3: naam, e-mail, telefoon, adres en
 * btw staan daar, en die worden niet eens gelezen. Geen bestanden: die staan al
 * in R2.
 *
 * BIJ TERUGKOMST vraagt het formulier eerst aan /api/upload welke foto's er van
 * die batch nog staan (alleen eigen uploads: het kenmerk is de sleutel). Dan het
 * blok "Je was bezig met een bestelling" met Verder gaan en Opnieuw beginnen.
 * Wat er nog staat, komt terug in zijn vak (zonder voorbeeld — het bestand is
 * niet meer op het apparaat — maar met het vinkje en de naam); wat weg is, wordt
 * genoemd. Opnieuw beginnen wist het concept en begint een nieuwe batch; de oude
 * ruimt de nacht vanzelf op (cron, INTAKE_TTL_DAYS).
 *
 * NA EEN GEPLAATSTE BESTELLING wordt alles gewist (finishSubmit).
 *
 * Elke lees- en schrijfactie staat in try/catch: in een privévenster of met
 * geblokkeerde opslag werkt het formulier precies zoals zonder dit punt.
 */
function leesConcept() {
  try {
    const raw = localStorage.getItem(CONCEPT_SLEUTEL);
    if (!raw) return null;
    const c0 = JSON.parse(raw);
    return c0 && typeof c0 === 'object' && c0.v === 1 ? c0 : null;
  } catch { return null; }
}

function wisConcept() {
  try { localStorage.removeItem(CONCEPT_SLEUTEL); } catch { /* geen opslag */ }
}

/** De velden van stap 1 en 2, als [naam, waarde, aan]. Nooit stap 3 en verder. */
function conceptVelden() {
  const uit = [];
  [1, 2].forEach((n) => {
    const node = stepNode(n);
    if (!node) return;
    qa('input, select, textarea', node).forEach((f) => {
      if (!f.name || f.disabled) return;
      if (f.type === 'file' || f.type === 'hidden' || f.type === 'password') return;
      if (f.type === 'radio') { if (f.checked) uit.push([f.name, f.value, 1]); return; }
      if (f.type === 'checkbox') { uit.push([f.name, f.value, f.checked ? 1 : 0]); return; }
      uit.push([f.name, String(f.value || '').slice(0, 300)]);
    });
  });
  return uit;
}

/** Schrijven, een halve seconde na de laatste wijziging. */
function bewaarConcept() {
  if (!conceptKlaar || !cfg || !form) return;
  if (conceptTimer) clearTimeout(conceptTimer);
  conceptTimer = setTimeout(() => {
    conceptTimer = 0;
    if (!conceptKlaar || !form || !document.contains(form)) return;
    const fotos = [];
    cards.forEach((card) => {
      Object.keys(card.slots).forEach((id) => {
        const sl = card.slots[id];
        if (sl && sl.key && sl.status === 'done') fotos.push({ p: card.key, s: id, k: sl.key });
      });
    });
    const velden = conceptVelden();
    const aantal = productCount();
    /* Niets gekozen en niets gestuurd: dan is er ook niets om naar terug te keren. */
    if (!fotos.length && !Number.isInteger(aantal)) { wisConcept(); return; }
    const concept = {
      v: 1,
      t: Date.now(),
      pad: location.pathname,
      stap: Math.min(current, 2),
      velden,
      eigen: cards.filter((k) => k.soortEigen).map((k) => k.key),
      refs: Object.fromEntries(cards.filter((k) => k.refs).map((k) => [k.key, k.refs])),
      hoeken: { ...hoekVak },
      /* Wat er per plek gekozen is en welke stukken samen een look zijn (levering 60). */
      plekken: Object.fromEntries(cards.filter((k) => k.plek).map((k) => [k.key, k.plek])),
      lookNotities: Object.fromEntries(cards.filter((k) => k.lookNotitie).map((k) => [k.key, k.lookNotitie])),
      lookVast: Object.fromEntries(cards.filter((k) => k.lookVast).map((k) => [k.key, k.lookVast])),
      batch: fotos.length ? batch : '',
      fotos,
    };
    try { localStorage.setItem(CONCEPT_SLEUTEL, JSON.stringify(concept)); } catch { /* vol of geblokkeerd: dan niet */ }
  }, 500);
}

function bindConcept() {
  /* Elke wijziging in stap 1 en 2 bewaart. Stap 3 en verder niet: daar staan de
     gegevens, en die horen hier niet. */
  const bewaar = (e) => {
    const stap = e.target && e.target.closest ? e.target.closest('[data-pl-step]') : null;
    const n = stap ? Number(stap.dataset.plStep) : 0;
    if (n !== 1 && n !== 2) return;
    /* Laat de klant het blok links liggen en begint hij gewoon te kiezen, dan
       is dat opnieuw beginnen: het blok gaat weg en vanaf nu wordt dít bewaard.
       Alleen bij een echte handeling (isTrusted), niet bij het terugzetten. */
    const blok0 = q('[data-pl-concept]');
    if (blok0 && !blok0.hidden && e.isTrusted) { blok0.hidden = true; conceptKlaar = true; }
    bewaarConcept();
  };
  form.addEventListener('change', bewaar);
  form.addEventListener('input', bewaar);
  const blok = q('[data-pl-concept]');
  if (!blok) return;
  const verder = q('[data-pl-concept-verder]', blok);
  const opnieuw = q('[data-pl-concept-opnieuw]', blok);
  if (opnieuw) opnieuw.addEventListener('click', () => {
    wisConcept();
    blok.hidden = true;
    conceptKlaar = true;
  });
  if (verder) verder.addEventListener('click', () => {
    const c0 = blok.__concept;
    blok.hidden = true;
    if (c0) herstelConcept(c0.concept, c0.daar);
    conceptKlaar = true;
    bewaarConcept();
  });
}

/** Bij het openen: staat er een concept voor deze pagina, en wat is er nog van? */
function checkConcept() {
  const c0 = leesConcept();
  const blok = q('[data-pl-concept]');
  const klaar = () => { conceptKlaar = true; };
  if (!c0 || !blok) { klaar(); return; }
  /* Levering 57 (17 oktober 2026). Wie in Studio "Opnieuw bestellen met alle
     instellingen" kiest (?van=<id>), kreeg bovenaan twee blokken onder elkaar:
     "Instellingen overgenomen" en "Je was nog bezig met een bestelling". Die
     spreken elkaar tegen. De kopie is een keuze van zojuist, dus die gaat voor;
     het concept blijft bewaard tot de klant iets verandert (dan bewaart bindConcept
     de nieuwe stand, zoals bij opnieuw beginnen). */
  let van = '';
  try { van = new URLSearchParams(location.search).get('van') || ''; } catch { /* dan niet */ }
  if (/^\d{1,12}$/.test(van)) { klaar(); return; }
  const oud = !(Date.now() - Number(c0.t || 0) < CONCEPT_DAGEN * 864e5);
  if (oud || c0.pad !== location.pathname) {
    /* Te oud: weg. Van een andere bestelpagina: laten staan voor die pagina. */
    if (oud) wisConcept();
    klaar();
    return;
  }
  const fotos = Array.isArray(c0.fotos) ? c0.fotos : [];
  const toon = (daar) => {
    const aantal = Number((c0.velden || []).find((v) => v[0] === 'products')?.[1]) || 0;
    const nog = daar.length;
    const producten = aantal === 1 ? c('concept.product1') : c('concept.productN', { n: aantal || '?' });
    const fotoTekst = !nog ? c('concept.foto0') : nog === 1 ? c('concept.foto1') : c('concept.fotoN', { n: nog });
    const wat = q('[data-pl-concept-wat]', blok);
    if (wat) wat.textContent = c('concept.wat', { dienst: c('concept.dienst'), producten, fotos: fotoTekst });
    const daarSleutels = new Set(daar.map((f) => f.key));
    const weg = fotos.filter((f) => !daarSleutels.has(f.k)).length;
    const wegEl = q('[data-pl-concept-weg]', blok);
    if (wegEl) {
      wegEl.hidden = weg <= 0;
      wegEl.textContent = weg === 1 ? c('concept.weg1') : weg > 1 ? c('concept.wegN', { n: weg }) : '';
    }
    blok.__concept = { concept: c0, daar };
    blok.hidden = false;
  };
  if (!fotos.length || !c0.batch) { toon([]); return; }
  /* Welke foto's staan er nog? Alleen eigen uploads: het kenmerk is de sleutel.
     Lukt het niet om dat te vragen, dan beloven we geen foto's die er misschien
     niet meer zijn: dan komen alleen de keuzes terug, met een nieuwe batch. */
  fetch(`/api/upload?batch=${encodeURIComponent(c0.batch)}`, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      const lijst = body && body.ok && Array.isArray(body.files) ? body.files : null;
      if (!lijst) { toon([]); return; }
      /* ALLES wat er in de batch staat, en niet alleen wat het concept noemt: de
         server hangt bij het bestellen de hele batch aan de bestelling. Een foto
         die vlak voor het sluiten nog binnenkwam en niet meer in het concept
         stond, moet dus óók terug in zijn vak (of weg) — anders gaat hij
         onzichtbaar mee. De plek komt uit wat /api/upload bij de foto bewaarde. */
      toon(lijst.filter((f) => f && f.key));
    })
    .catch(() => toon([]));
}

/** Een veld terugzetten zoals de klant het had, met het event dat erbij hoort. */
function zetVeld(naam, waarde, aan) {
  const els = qa('input, select, textarea').filter((f) => f.name === naam && !f.disabled);
  if (!els.length) return;
  const el0 = els[0];
  if (el0.type === 'radio') {
    const r = els.find((f) => f.value === waarde);
    if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  if (el0.type === 'checkbox') {
    const b = els.find((f) => f.value === waarde) || el0;
    if (b.checked !== !!aan) { b.checked = !!aan; b.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  if (el0.value === waarde) return;
  el0.value = waarde;
  el0.dispatchEvent(new Event('input', { bubbles: true }));
  el0.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Een foto die nog in R2 staat, terug in zijn vak — zonder bestand op het apparaat. */
function herstelVak(card, id, f) {
  const sl = card.slots[id];
  if (!sl || sl.file) return false;
  sl.status = 'done';
  sl.key = f.key;
  sl.file = { name: f.name || id, size: Number(f.bytes) || 0, hersteld: true };
  sl.url = '';
  sl.pct = 100;
  sl.thumb = false;
  sl.msg = c('upload.done');
  staged.push({ key: f.key, name: f.name, bytes: Number(f.bytes) || 0, product: card.key, shot: id });
  paintSlot(card, id);
  return true;
}

function herstelConcept(c0, daar) {
  const velden = Array.isArray(c0.velden) ? c0.velden : [];
  /* Het aantal eerst: daarmee ontstaan de kaarten. Via het getalveld, zodat de
     knoppen en de lijst gelijk blijven (bindQty). */
  const aantal = velden.find((v) => v[0] === 'products');
  if (aantal) {
    const veld = q('[data-pl-qty-input]');
    if (veld && /^\d+$/.test(String(aantal[1]))) {
      veld.value = String(aantal[1]);
      veld.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      zetVeld('products', String(aantal[1]));
    }
  }
  /* De hoeken houden hun vaknummer (extra1, extra2, …): de foto's in R2 dragen
     dat nummer. */
  if (c0.hoeken && typeof c0.hoeken === 'object') {
    Object.entries(c0.hoeken).forEach(([h, nr]) => { if (Number.isInteger(nr) && nr > 0) hoekVak[h] = nr; });
  }
  /* Stap 1, dan de kaarten. De soort vóór de rest van de kaart: daar hangen de
     contextvakjes aan. */
  const isKaartVeld = (naam) => /_p\d+$/.test(naam) || /_p\d+_\d+$/.test(naam);
  velden.filter((v) => v[0] !== 'products' && !isKaartVeld(v[0])).forEach((v) => zetVeld(v[0], v[1], v[2]));
  const eigen = new Set(Array.isArray(c0.eigen) ? c0.eigen : []);
  cards.forEach((card) => { if (eigen.has(card.key)) card.soortEigen = true; });
  velden.filter((v) => /^garment_p\d+$/.test(v[0])).forEach((v) => zetVeld(v[0], v[1], v[2]));
  syncSoorten();
  /* De keuzes per plek en de looks, vóór de kaarten geschilderd worden. Alleen de
     vorm die het concept zelf schreef; een kaart die er niet meer is, valt weg. */
  if (c0.plekken && typeof c0.plekken === 'object') {
    cards.forEach((card) => {
      const p = c0.plekken[card.key];
      if (!p || typeof p !== 'object') return;
      card.plek = {};
      Object.entries(p).forEach(([plek, st]) => {
        if (!st || !['wij', 'eigen', 'uit'].includes(st.keuze)) return;
        const bron = typeof st.bron === 'string' && cards.some((k) => k.key === st.bron) ? st.bron : '';
        card.plek[plek] = { keuze: st.keuze, bron };
      });
    });
  }
  if (c0.lookVast && typeof c0.lookVast === 'object') {
    cards.forEach((card) => { if (typeof c0.lookVast[card.key] === 'string') card.lookVast = c0.lookVast[card.key].slice(0, 12); });
  }
  if (c0.lookNotities && typeof c0.lookNotities === 'object') {
    cards.forEach((card) => { if (typeof c0.lookNotities[card.key] === 'string') card.lookNotitie = c0.lookNotities[card.key]; });
  }
  cards.forEach(paintErbij);
  syncLookNotities();
  velden.filter((v) => isKaartVeld(v[0]) && !/^garment_p\d+$/.test(v[0])).forEach((v) => zetVeld(v[0], v[1], v[2]));
  /* Referentievakken zoals ze er stonden. */
  if (c0.refs && typeof c0.refs === 'object') {
    cards.forEach((card) => {
      const n = Math.min(Number(c0.refs[card.key]) || 0, Number(cfg.maxRefPerProduct) || 0);
      while ((card.refs || 0) < n && card.voegRefToe) { if (!card.voegRefToe()) break; }
    });
  }
  /* De foto's die er nog staan. Het batchkenmerk alleen als er iets terugkomt;
     anders begint de eerste nieuwe foto een nieuwe batch. */
  if (daar && daar.length) {
    batch = c0.batch;
    setHidden('upload_batch', batch);
    const plek = new Map((c0.fotos || []).map((f) => [f.k, f]));
    daar.forEach((f) => {
      /* De plek die de server bij de foto bewaarde (customMetadata), anders die
         uit het concept. */
      const waar = plek.get(f.key);
      const productKey = f.product || (waar && waar.p) || '';
      const id = f.shot || (waar && waar.s) || '';
      const card = productKey ? cards.find((k) => k.key === productKey) : null;
      if (card && id && refShotNumber(id)) {
        while ((card.refs || 0) < refShotNumber(id) && card.voegRefToe) { if (!card.voegRefToe()) break; }
      }
      if (!card || !id || !herstelVak(card, id, f)) {
        /* Geen vak meer voor deze foto (de kaart of het vak bestaat niet meer, of
           er staat al een foto): weghalen, anders gaat hij onzichtbaar mee met
           de bestelling. */
        removeStaged(f.key);
      }
    });
  }
  syncOrder();
  refreshUploader();
  /* Terug naar de stap waar de klant was, als stap 1 nog klopt. */
  if (Number(c0.stap) === 2 && validateStep(1)) show(2);
}
