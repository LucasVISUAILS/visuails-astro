// VISUAILS — the customer dashboard's brand kit, its details form, and the
// status filter. August 2026.
//
// WHY THIS FILE EXISTS
// The brand kit stopped being two <select> elements and became a grid of
// portraits and colour swatches. Every radio it renders has to be a value
// handleLockUpdate() will actually store, and that is a CONTRACT BETWEEN TWO
// FUNCTIONS THAT NEVER CALL EACH OTHER — one renders markup, the other reads a
// POST body, and nothing in the language connects them. A renderer that emits
// `roster:ava` while the handler expects `rava` produces no error anywhere: the
// customer picks a face, presses save, and the page comes back with nothing
// selected. That silence is what this file is for. §2 posts every single value
// the picker draws and insists each one lands in the database.
//
// §1 covers the other silent failure introduced the same day. /account/details
// has two callers that disagree about backgrounds — the page's own form, which
// no longer asks, and /start's "save my details", which does. An unconditional
// UPDATE breaks exactly one of them depending on which way it is written, and
// breaks it quietly in both directions. See handleDetails()' own comment.
//
// HOW IT RUNS. Plain `node`, no wrangler and no miniflare, against a hand-built
// D1 stub — the same reason src/lib/account.js exists outside functions/ at all
// (see its header). The stub answers by matching SQL text, records every write,
// and is deliberately dumb: a test that reimplements SQLite proves nothing about
// the statements this code sends.
//
// ── 6 SEPTEMBER 2026: DE STAAT, NIET DE HTML ────────────────────────────────
// Tot vandaag las dit bestand de HTML van accountGet(). Die HTML tekent niemand
// meer — Studio is een stel Astro-pagina's op studioScreen() — en de bouwers
// zijn weg. `get()` geeft nu wat de pagina krijgt: de gedeelde staat (`st`) en
// de staat van de sectie (`view`), uit precies dezelfde functie als de pagina.
// Wat een klant ZIET (één h1, geen inline style, de kaders, de chips) staat in
// tests/studio-vorm.test.mjs, door de echte Worker.
import { studioScreen, accountPost, progressView } from '../src/lib/account.js';
import { mintToken } from '../src/lib/token.js';

const CUSTOMER = { customer_id: 7, email: 'studio@voltbrand.nl', brand: 'VOLT', name: 'Mara' };

const ORDERS = [
  { id: 91, ref: 'VIS-8K2-QQ1', service: 'catalog', status: 'in_production', tier: 'attended', product_count: 30, window_start: '2026-08-10', window_end: '2026-08-14', lang: 'en', created_at: '2026-08-01', closed_at: null },
  { id: 90, ref: 'VIS-7F4-M3A', service: 'lifestyle', status: 'delivered', tier: 'attended', product_count: 12, window_start: null, window_end: null, lang: 'en', created_at: '2026-07-28', closed_at: null },
  { id: 88, ref: 'VIS-5D1-XX8', service: 'catalog', status: 'delivered', tier: 'unattended', product_count: 4, window_start: null, window_end: null, lang: 'en', created_at: '2026-07-19', closed_at: null },
];

// Two of this brand's own faces are usable and one is still being made. The
// third one matters: it must appear on the page and must NOT be offered as a
// choice, which is the rule ownModelsSection() and lockSection() split on.
const MODELS = [
  { id: 31, label: 'Nadia', status: 'approved', has_preview: 1 },
  { id: 32, label: 'Tomas', status: 'locked', has_preview: 1 },
  { id: 33, label: 'Autumn face', status: 'in_design', has_preview: 0 },
];

const DETAILS = {
  name: 'Mara', brand: 'VOLT', email: CUSTOMER.email, phone: '+31 6 1234 5678',
  website: 'https://voltbrand.nl', vat_number: 'NL001234567B01',
  default_background: 'white', default_background_hex: null, details_saved_at: '2026-07-20',
};

/* ── HET ABONNEMENT VOOR /account/plan ──────────────────────────────────────
   Uitgerekende maanden en geen vaste strings: een vast '2026-08' valt buiten het
   doorschuifvenster zodra de maand omslaat, en dan tekent het scherm stilletjes
   iets anders dan deze toets denkt te controleren. */
const _nu = new Date();
const _deze = _nu.toISOString().slice(0, 7);
const _vorig = new Date(Date.UTC(_nu.getUTCFullYear(), _nu.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
const SUBSCRIPTION = {
  id: 3, ref: 'SUB-TEST-001', customer_id: 1, plan: 'studio', term: 'monthly',
  status: 'active', window_day: 8, created_at: `${_deze}-01`,
};
const SUB_MONTHS = [
  { month: _vorig, granted: 12, used: 9, clips_granted: 2, clips_used: 0 },
  { month: _deze,  granted: 12, used: 2, clips_granted: 2, clips_used: 1 },
];
const SUB_SLOTS = [
  { month: _vorig, kind: 'complete',     granted: 12, used: 9 },
  { month: _deze,  kind: 'complete',     granted: 12, used: 2 },
  { month: _deze,  kind: 'video-motion', granted: 2,  used: 1 },
];
const QUEUE = [
  { id: 91, position: 0, name: 'Winterjas, zwart', note: null, upload_batch: 'b-1', kind: 'complete', locked_at: `${_deze}-02 10:00:00`, created_at: `${_deze}-01` },
  { id: 92, position: 1, name: 'Cargobroek, sand', note: null, upload_batch: null,  kind: 'complete', locked_at: null, created_at: `${_deze}-01` },
];

function makeDb({ locks = [], models = MODELS, files = [], events = [], finish = null } = {}) {
  const writes = [];
  const pick = (sql, binds) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM account_sessions')) return { ...CUSTOMER, expires_at: '2099-01-01' };
    // De telling van maybeClose(): hoeveel levende beelden zijn er, en hoeveel
    // daarvan zijn goedgekeurd.
    if (s.includes('AS live') && s.includes('AS approved')) return finish;
    if (s.includes('FROM rate_limits')) return null;
    /* ── HET ABONNEMENT, ZODAT /account/plan ZIJN SLOTS TEKENT ────────────────
     *
     * Deze stub gaf hier niets terug, en daardoor rendeerde /account/plan het
     * lege scherm — het scherm zonder abonnement. Alle controles hieronder
     * (geen script, geen inline style, één h1) liepen dus over een pagina die de
     * helft van zijn code niet aanraakte.
     *
     * Dat is precies hoe een inline `style="width:17%"` er op 29 augustus 2026
     * doorheen kwam terwijl de controle op style-attributen er al stond: de
     * bewaking was in orde, de fixture bereikte de code niet. Vandaar deze drie
     * regels, met opzet in een plan dat doorschuift — dan tekent hij én de balk
     * van deze maand én die van vorige. */
    if (s.includes('FROM subscriptions')) return SUBSCRIPTION;
    if (s.includes('FROM subscription_months')) return SUB_MONTHS;
    if (s.includes('FROM subscription_slots')) return SUB_SLOTS;
    if (s.includes('FROM plan_queue')) return QUEUE;
    if (s.includes('FROM order_events')) return events;
    if (s.includes('FROM files f JOIN orders')) return files;
    if (s.includes('FROM custom_models WHERE id')) {
      // The ownership check in handleLockUpdate. Only ids this customer owns.
      const id = binds[0];
      return models.some((m) => m.id === id) ? { id } : null;
    }
    if (s.includes('FROM custom_models')) return models;
    if (s.includes('FROM customer_style_locks')) return locks;
    if (s.includes('FROM customers WHERE id')) return DETAILS;
    if (s.includes('FROM orders')) return ORDERS;
    return null;
  };
  const db = {
    writes,
    prepare(sql) {
      const st = {
        _b: [],
        bind(...a) { st._b = a; return st; },
        async first() { const r = pick(sql, st._b); return Array.isArray(r) ? r[0] : r; },
        async all() { const r = pick(sql, st._b); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
        async run() {
          if (/^\s*(UPDATE|INSERT|DELETE)/i.test(sql)) writes.push({ sql: sql.replace(/\s+/g, ' '), binds: st._b });
          return { success: true };
        },
      };
      return st;
    },
    // Een batch schrijft net zo goed als een losse run — hij werd hier alleen
    // niet opgeschreven, waardoor alles wat via batch() gaat (de revisie, het
    // afronden) onzichtbaar was voor elke test die naar writes kijkt.
    async batch(list) { for (const st of list) await st.run(); return list.map(() => ({ success: true })); },
  };
  return db;
}

/* Welke sectie bij welk pad hoort — dezelfde koppeling als src/pages/account/. */
const SECTIE = { '/account': 'overview', '/account/orders': 'orders', '/account/brand-kit': 'brand', '/account/details': 'details', '/account/invoices': 'invoices', '/account/plan': 'plan' };
async function get(path, opts = {}) {
  const token = await mintToken();
  const db = makeDb(opts);
  const request = new Request(`https://visuails.com${path}`, {
    headers: { cookie: `vis_account=${token}`, 'accept-language': 'en-GB,en;q=0.9' },
  });
  const r = await studioScreen({ request, env: { DB: db }, waitUntil() {} }, SECTIE[path.split('?')[0]]);
  if (r instanceof Response) return { status: r.status, res: r, db };
  return { status: 200, st: r.st, view: r.v, db };
}

async function post(path, fields, opts = {}) {
  const token = await mintToken();
  const db = makeDb(opts);
  const request = new Request(`https://visuails.com${path}`, {
    method: 'POST',
    body: new URLSearchParams(fields),
    headers: {
      cookie: `vis_account=${token}`,
      origin: 'https://visuails.com',
      'content-type': 'application/x-www-form-urlencoded',
    },
  });
  const res = await accountPost({ request, env: { DB: db }, waitUntil() {} });
  return { status: res.status, location: res.headers.get('location'), writes: db.writes };
}

// currentCustomer() refreshes account_sessions on every authenticated request,
// so the write log always opens with an UPDATE nobody here is asking about.
// Every assertion below names the table it means.
const writeTo = (writes, re) => writes.find((w) => re.test(w.sql)) || { sql: '', binds: [] };

/*
 * WAT ER IN KOLOM X BELANDT, ZONDER DE PLAATS TE TELLEN.
 *
 * Deze assertions lazen `w.binds[6]` en `/default_background = \?7/`. Dat werkte
 * zolang de UPDATE een vaste kop had, en brak op 7 augustus 2026 toen `name`
 * uit de vaste set verdween ten gunste van first_name/last_name — alles schoof
 * één op, en vier tests werden rood terwijl er inhoudelijk niets mis was.
 *
 * Een test die op een positie leunt, test de volgorde van de SQL en niet wat er
 * wordt opgeslagen. Deze zoekt het nummer op bij de kolomnaam, dus hij blijft
 * kloppen als er een veld tussen komt en wordt rood als de kolom de verkeerde
 * waarde krijgt — wat het punt was.
 */
function valueFor(w, column) {
  const m = new RegExp(`\\b${column} = \\?(\\d+)`).exec(w.sql || '');
  if (!m) return undefined;              // de kolom staat niet in deze UPDATE
  return w.binds[Number(m[1]) - 1];      // binds[0] is ?1 (het klant-id), dus ?n is binds[n-1]
}
const writes = (w, column) => new RegExp(`\\b${column} = \\?\\d+`).test(w.sql || '');
const CUSTOMERS = /UPDATE customers/;
const LOCK_INSERT = /INSERT INTO customer_style_locks/;
const LOCK_DELETE = /DELETE FROM customer_style_locks/;

let fails = 0;
const check = (name, cond, got = '') => {
  console.log(`${cond ? ' ok  ' : 'FAIL '} ${String(name).padEnd(60)} ${got}`);
  if (!cond) fails++;
};
const section = (n) => console.log(`\n${n}`);

// ─────────────────────────────────────────────────────────────────────────────
section('§1 · /account/details — two callers, one endpoint');
// ─────────────────────────────────────────────────────────────────────────────

// The page's own form. It has no background control at all since August 2026,
// so the request carries no such field and the columns must be left untouched.
{
  const r = await post('/account/details', { name: 'Mara', brand: 'VOLT', phone: '+31 6 1', vat: 'NL001234567B01' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a form with no background leaves the columns alone', !/default_background/.test(w.sql));
  check('and writes only the fields it was sent', !writes(w, 'country') && !writes(w, 'city'));
  check('and returns to its own page, not the brand kit', r.location === '/account/details?saved=1#details', r.location);
}

// /start's save-my-details, which does carry the background just chosen.
{
  const r = await post('/account/details', { name: 'Mara', background: 'beige' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a request carrying a background writes it', writes(w, 'default_background'));
  check('and stores the id it was handed', valueFor(w, 'default_background') === 'beige', JSON.stringify(valueFor(w, 'default_background')));
  check('with no second hex beside a recommended id', valueFor(w, 'default_background_hex') === null, JSON.stringify(valueFor(w, 'default_background_hex')));
}

// The custom swatch is the one option whose answer lives in the hex.
{
  const r = await post('/account/details', { name: 'Mara', background: 'custom', background_custom: '#eee' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a custom colour keeps its expanded hex', valueFor(w, 'default_background_hex') === '#EEEEEE', valueFor(w, 'default_background_hex'));
}

// A colour this site does not offer is "ask me per order" — not a 400.
{
  const r = await post('/account/details', { name: 'Mara', background: 'chartreuse' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('an unknown background stores as no preference', valueFor(w, 'default_background') === null, JSON.stringify(valueFor(w, 'default_background')));
}

// Present-but-empty is an answer ("clear it"), which is why presence and not
// emptiness is what handleDetails tests.
{
  const r = await post('/account/details', { name: 'Mara', background: '' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('an empty background field still counts as an answer',
    writes(w, 'default_background') && valueFor(w, 'default_background') === null);
}

// ─────────────────────────────────────────────────────────────────────────────
section('§1b · wat er verplicht is, en hoe het wordt samengesteld');
// ─────────────────────────────────────────────────────────────────────────────
//
// 7 augustus 2026. Lucas: *"Is factuuradres in 1 regel wel handig, dit doen ze
// toch vaak apart"*, *"Aanpassen naar naam en achternaam"* en *"Deze gegevens
// zijn ook verplicht inclusief btw-nummer met een checkbox bij btw-nummer toch
// te skippen als de klant geen btw-nummer heeft of buiten de eu komt."*
//
// Drie dingen die alle drie fout kunnen zonder dat iemand het merkt: een half
// opgeslagen adres, een samengestelde weergave die niet klopt met de losse
// velden, en een verplichting die je met een leeg vakje omzeilt.

const FULL = {
  first_name: 'Mara', last_name: 'de Groot', brand: 'VOLT',
  country: 'NL', address_line1: 'Vaarwerkhorst 17', address_line2: '',
  postal_code: '7531 HK', city: 'Enschede', region: '',
  vat: 'NL001234567B01', phone: '', website: '',
};

{
  const r = await post('/account/details', FULL);
  const w = writeTo(r.writes, CUSTOMERS);
  check('a complete form saves', r.location === '/account/details?saved=1#details', r.location);
  check('the two name fields are stored apart',
    valueFor(w, 'first_name') === 'Mara' && valueFor(w, 'last_name') === 'de Groot');
  // "de Groot" is precies waarom `name` niet achteraf gesplitst wordt maar
  // vooraf samengesteld — zie migrations/0016.
  check('and `name` is the two of them joined', valueFor(w, 'name') === 'Mara de Groot', valueFor(w, 'name'));
  check('every address line lands in its own column',
    valueFor(w, 'address_line1') === 'Vaarwerkhorst 17'
    && valueFor(w, 'postal_code') === '7531 HK'
    && valueFor(w, 'city') === 'Enschede');
  check('an empty optional line is stored as nothing, not as ""',
    valueFor(w, 'address_line2') === null && valueFor(w, 'region') === null);
  // Postcode en plaats op één regel, straat erboven — de vorm die een envelop
  // aanhoudt. Het land staat er met opzet NIET bij; zie composeAddress().
  check('and the composed block reads like an address',
    valueFor(w, 'billing_address') === 'Vaarwerkhorst 17\n7531 HK Enschede',
    JSON.stringify(valueFor(w, 'billing_address')));
}

{
  const r = await post('/account/details', { ...FULL, city: '' });
  check('a required field sent empty saves NOTHING',
    !writeTo(r.writes, CUSTOMERS).sql, writeTo(r.writes, CUSTOMERS).sql.slice(0, 40));
  check('and says so instead of pretending it worked',
    r.location === '/account/details?missing=1#details', r.location);
}

{
  const r = await post('/account/details', { ...FULL, last_name: '' });
  check('a missing surname is refused too', r.location === '/account/details?missing=1#details', r.location);
}

// Het vinkje. Drie toestanden, en ze zijn niet inwisselbaar.
{
  const r = await post('/account/details', { ...FULL, vat: '', no_vat: '1' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('"I have no VAT number" is an answer, and saves', !!w.sql);
  check('it stores no number', valueFor(w, 'vat_number') === null);
  check('and records that the answer was given', valueFor(w, 'no_vat_number') === 1, valueFor(w, 'no_vat_number'));
}

{
  const r = await post('/account/details', { ...FULL, vat: '' });
  check('an empty VAT number with no tick is refused',
    r.location === '/account/details?missing=1#details', r.location);
}

{
  // Wie allebei doet, heeft er een. Het formulier hoort niet te gokken welke
  // van de twee hij meende.
  const r = await post('/account/details', { ...FULL, no_vat: '1' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a filled number beats its own checkbox', valueFor(w, 'vat_number') === 'NL001234567B01');
  check('and clears the "no number" flag', valueFor(w, 'no_vat_number') === 0, valueFor(w, 'no_vat_number'));
}

{
  // /start's opslag-vinkje stuurt niet noodzakelijk alles. Een veld dat niet
  // meekomt, is niet leeg — het is niet ter sprake, en mag niet gewist worden
  // en ook niet als ontbrekend gelden.
  const r = await post('/account/details', { phone: '+31 6 25436130' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a partial caller is not held to the required set', !!w.sql && r.location.includes('saved=1'));
  check('and leaves the fields it did not send alone',
    !writes(w, 'city') && !writes(w, 'first_name') && !writes(w, 'country'));
}

{
  // DE DUURSTE VAN DE DRIE. `brand` stond onvoorwaardelijk in de UPDATE, dus
  // een POST met alleen een telefoonnummer schreef `brand = NULL` mee — en
  // `brand` is verplicht. Een deelaanroeper kon zo een verplicht veld
  // leegmaken zonder er ooit naar gevraagd te hebben, en de controle erboven
  // ziet dat niet omdat die juist alleen naar het GESTUURDE kijkt.
  const r = await post('/account/details', { phone: '+31 6 25436130' });
  const w = writeTo(r.writes, CUSTOMERS);
  check('a partial caller cannot null a field it never sent',
    !writes(w, 'brand') && !writes(w, 'website') && !writes(w, 'vat_number'),
    w.sql.replace(/\s+/g, ' ').slice(0, 90));
  check('and the one field it did send is written', valueFor(w, 'phone') === '+31 6 25436130');
}

{
  // Niets bekends erin: geen kolommen, wel details_saved_at. Zonder de
  // lege-sets-tak zou de SET met een komma beginnen en de query stuklopen.
  const r = await post('/account/details', {});
  const w = writeTo(r.writes, CUSTOMERS);
  check('an empty post still marks the record as saved',
    /details_saved_at = datetime/.test(w.sql) && !/SET\s*,/.test(w.sql),
    w.sql.replace(/\s+/g, ' ').slice(0, 70));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§2 · the brand kit renders only values the lock handler accepts');
// ─────────────────────────────────────────────────────────────────────────────

const kit = await get('/account/brand-kit');
check('the brand kit renders', kit.status === 200, kit.status);

// Pull the picker apart the way the page does: every radio value, per group.
const catalogKaart = kit.view.kaarten.find((k) => k.style === 'catalog');
const faces = [...new Set(catalogKaart.tegels.map((tg) => tg.value))];
const grounds = [...new Set(catalogKaart.achtergronden.map((b) => b.hex))];

check('it offers faces at all', faces.length > 5, `${faces.length} distinct`);
check('it offers grounds at all', grounds.length > 1, `${grounds.length} distinct`);
check('the brand\'s two usable faces are offered', faces.includes('c31') && faces.includes('c32'));
// The one still being made: shown as a card, never as a choice.
check('a model still in the making is NOT offered', !faces.includes('c33'));
check('but it IS on the page', kit.view.eigenModellen.some((m) => m.label === 'Autumn face' && !m.ready));
check('the standard roster is offered', faces.includes('rava') && faces.includes('rseme'));
check('"no preference" is a real option', faces.includes('') && grounds.includes(''));

// THE CONTRACT. Every one of those values, posted for every service, has to end
// in a write. An unrecognised face or ground is dropped silently by design — so
// a value the renderer invents shows up here as a missing write, not an error.
{
  let stored = 0;
  let dropped = [];
  for (const style of ['catalog', 'lifestyle', 'video']) {
    for (const face of faces) {
      /* Sinds 3 september 2026 bestaat de achtergrond alleen bij catalog; bij
         lifestyle en video is de VERHOUDING het tweede antwoord dat een rij
         rechtvaardigt (video kent geen verhouding — daar draagt de lege face
         terecht geen rij, dus die combinatie slaan we over). */
      if (style === 'video' && !face) continue;
      const r = await post('/account/lock', { style, face, background_hex: '#FFFFFF', ratio: 'square' });
      // A face of '' with a background still stores a row (the background is
      // the answer); what must never happen is no write at all.
      if (LOCK_INSERT.test(writeTo(r.writes, LOCK_INSERT).sql)) stored++;
      else dropped.push(`${style}/${face || '(none)'}`);
    }
  }
  check('every face the picker draws is stored, for every service',
    dropped.length === 0, dropped.length ? dropped.join(', ') : `${stored} combinations`);
}

{
  let dropped = [];
  for (const hex of grounds.filter(Boolean)) {
    const r = await post('/account/lock', { style: 'catalog', face: 'rava', background_hex: hex });
    const w = writeTo(r.writes, LOCK_INSERT);
    if (w.binds[4] !== hex.toUpperCase()) dropped.push(hex);
  }
  check('every ground the picker draws is stored as its own hex',
    dropped.length === 0, dropped.length ? dropped.join(', ') : `${grounds.length - 1} colours`);
}

// Clearing everything deletes the row rather than storing three nulls — "no
// row" has to stay the single meaning of "no preference".
{
  const r = await post('/account/lock', { style: 'catalog', face: '', background_hex: '' });
  check('clearing both answers deletes the row', LOCK_DELETE.test(writeTo(r.writes, LOCK_DELETE).sql));
}

// A face belonging to somebody else must not be storable, whatever the form says.
{
  const r = await post('/account/lock', { style: 'catalog', face: 'c9999', background_hex: '' });
  check('a custom model this brand does not own is refused',
    LOCK_DELETE.test(writeTo(r.writes, LOCK_DELETE).sql) && !LOCK_INSERT.test(writeTo(r.writes, LOCK_INSERT).sql),
    'treated as no preference');
}

// A roster id that is not in ROSTER is a hand-built post, not a picker click.
{
  const r = await post('/account/lock', { style: 'catalog', face: 'rnobody', background_hex: '' });
  check('a roster id we do not have is refused',
    LOCK_DELETE.test(writeTo(r.writes, LOCK_DELETE).sql) && !LOCK_INSERT.test(writeTo(r.writes, LOCK_INSERT).sql),
    'treated as no preference');
}

// ─────────────────────────────────────────────────────────────────────────────
section('§3 · a saved lock comes back selected, and reads back in the summary');
// ─────────────────────────────────────────────────────────────────────────────

{
  const saved = await get('/account/brand-kit', {
    locks: [
      { style: 'catalog', custom_model_id: 31, roster_model: null, background_hex: '#FFFFFF' },
      /* Lifestyle draagt sinds 3 september 2026 een STIJL (look) en geen
         achtergrond meer — zie migratie 0039 en lockSection(). */
      { style: 'lifestyle', custom_model_id: null, roster_model: 'ava', background_hex: null, look: 'glow' },
    ],
  });
  const kaart = (style) => saved.view.kaarten.find((k) => k.style === style);
  const gekozen = (lijst, key) => (lijst || []).find((x) => x.checked)?.[key];
  check('the brand\'s own face is the checked one', gekozen(kaart('catalog').tegels, 'value') === 'c31');
  check('a roster face is the checked one for the other service', gekozen(kaart('lifestyle').tegels, 'value') === 'rava');
  check('the catalog ground comes back checked, and the lifestyle look',
    gekozen(kaart('catalog').achtergronden, 'hex') === '#FFFFFF' && gekozen(kaart('lifestyle').looks, 'slug') === 'glow');
  check('and lifestyle offers no ground at all', kaart('lifestyle').achtergronden === null && kaart('lifestyle').bgApplies === false);
  // The folded card has to say what it holds, or the accordion has hidden the
  // only thing the page is for.
  check('the folded summary names the chosen face', kaart('catalog').samenvatting[0] === 'Nadia');
  check('and the chosen look, by name', kaart('lifestyle').samenvatting.slice(0, 2).join(' · ') === 'Ava · Glow');
  check('an unset service says so once, not twice', kaart('video').samenvatting.length === 1);
  check('and says it as a whole answer', kaart('video').samenvatting[0] === 'Asked per order');
}

// ─────────────────────────────────────────────────────────────────────────────
section('§4 · the status filter on the order list');
// ─────────────────────────────────────────────────────────────────────────────

{
  /* ── READ THE LIST, NOT THE PAGE — 27 August 2026 ─────────────────────────
   *
   * These checks used to search the whole document for an order reference. That
   * worked while the page was a sidebar and a list; it stopped working the day
   * the status column arrived, because that column names what is RUNNING on
   * every route and does not care what the list is filtered to. "In production"
   * showing up beside a delivered-only list is the column doing its job, and a
   * test that reads the whole page calls it a bug.
   *
   * Same lesson, same shape as the note in tests/revisieronde.test.mjs about
   * counting checkboxes per order instead of per page: when a page grows a
   * second place that can mention the same thing, a test has to say WHICH place
   * it means. Here that is the middle column — <main class="main">, which
   * shellBody() draws around whatever the section rendered. */
  const refs = (r) => r.view.shown.map((o) => o.ref);
  const chips = (r) => r.view.filters.map((f) => f.key);

  const all = await get('/account/orders');
  check('unfiltered, every order is listed',
    ['VIS-8K2-QQ1', 'VIS-7F4-M3A', 'VIS-5D1-XX8'].every((r) => refs(all).includes(r)));
  check('a chip is offered per status this customer actually has',
    chips(all).includes('in_production') && chips(all).includes('delivered'));
  // No chip for a status with no orders — a filter that resolves to nothing
  // looks like a feature and is a dead end.
  check('no chip for a status this customer has never had', !chips(all).includes('cancelled'));
  check('"all" is the active chip', all.view.filters.find((f) => f.active)?.label === 'All');

  const one = await get('/account/orders?status=delivered');
  check('filtered, the two delivered orders are listed',
    refs(one).includes('VIS-7F4-M3A') && refs(one).includes('VIS-5D1-XX8'));
  check('and the in-production one is not', !refs(one).includes('VIS-8K2-QQ1'));
  check('the heading counts the filtered set', one.view.shown.length === 2 && one.view.kaarten.length === 2);
  check('the active chip is the one asked for', one.view.filters.find((f) => f.active)?.label === 'Delivered');

  // A status nobody can see the name of must not look like an empty account.
  const bogus = await get('/account/orders?status=not_a_status');
  check('an unknown status falls back to no filter', refs(bogus).includes('VIS-8K2-QQ1') && bogus.st.statusFilter === '');

  const empty = await get('/account/orders?status=cancelled');
  check('a real but empty status explains itself and offers a way back',
    empty.view.shown.length === 0 && empty.view.empty.text === 'No orders with this status.' && empty.view.empty.clear === 'Show all orders');
}

// ─────────────────────────────────────────────────────────────────────────────
section('§5 · the page keeps its promises about itself');
// ─────────────────────────────────────────────────────────────────────────────

{
  /* Geen script, geen inline style, één h1: dat toetst tests/studio-vorm.test.mjs
     op de echte pagina's. Hier alleen wat de STAAT belooft. */
  const det = await get('/account/details');
  check('the details page renders the form', det.status === 200 && det.view.rijen.length === 2 && det.view.adres.length === 2, det.status);
  const velden = [...det.view.rijen.flat(), ...det.view.adres.flat(), det.view.phone, det.view.region].map((v) => v.name);
  check('with no background control on it', !velden.includes('background') && !velden.includes('background_custom'));
  check('the email is text, not an editable field', det.view.email.value === CUSTOMER.email && !velden.includes('email'));
  check('and the saved details come back in the fields', velden.includes('brand') && det.view.rijen[1][0].value === 'VOLT' && det.view.vat.value === 'NL001234567B01');
}

// ─────────────────────────────────────────────────────────────────────────────
section('§6 · het dashboard groepeert per product');
// ─────────────────────────────────────────────────────────────────────────────
//
// Uploads droegen product_key en shot, leveringen niet, dus stonden er twee
// stapels beelden naast elkaar zonder verband. Nu leveringen wél ingedeeld
// worden, hoort het dashboard ze per product te tonen — en hoort de kaart van
// een product waarop een revisie loopt open te staan en op te lichten, want dat
// is het product waar de klant voor terugkwam.

const FILE = (id, kind, product, shot, extra = {}) => ({
  id, order_id: 91, kind, filename: `f${id}.webp`, bytes: 1000,
  expires_at: null, review_state: 'pending', review_note: null, reviewed_at: null,
  product_key: product, shot, ...extra,
});

{
  const r = await get('/account/orders', {
    files: [
      FILE(1, 'upload', 'p1', null),
      FILE(2, 'delivery', 'p1', 'front', { review_state: 'approved' }),
      FILE(3, 'delivery', 'p1', 'back'),
      FILE(4, 'upload', 'p2', null),
      FILE(5, 'delivery', 'p2', 'front', { review_state: 'revision_requested', review_note: 'Achtergrond trekt naar grijs.' }),
    ],
  });
  const kaart = r.view.kaarten.find((k) => k.o.id === 91).view;
  const cards = (kaart.products || []).length;
  check('one card per product, not one pile per direction', cards === 2, `${cards} card(s)`);
  const revising = (kaart.products || []).find((p) => p.revising);
  check('the product with an open revision is marked', !!revising && revising.key === 'p2');
  check('and its order is open, because that is what they came back for', kaart.openNow === true);
  check('both directions live inside the card', revising.delivered.length === 1 && revising.uploaded.length === 1);
  check('the note the customer left is shown back to them', revising.delivered[0].said.some((z) => z.text === 'Achtergrond trekt naar grijs.'));
  check('and there is a way to reach a human about it', /wa\.me\/31625436130/.test(revising.waHref));
  // Het productnummer staat in de kop; het per foto herhalen maakt vier
  // bijschriften die alleen achteraan verschillen.
  check('the tile captions do not repeat the product number', kaart.products[0].delivered.every((sh) => !sh.caption.startsWith('#1')));
}

// Niets ingedeeld: dan is groeperen een kaart met "overige" eromheen, en doet
// het scherm wat het altijd deed.
{
  const r = await get('/account/orders', {
    files: [FILE(6, 'upload', null, null), FILE(7, 'delivery', null, null)],
  });
  const kaart = r.view.kaarten.find((k) => k.o.id === 91).view;
  check('with nothing mapped it falls back to the two columns',
    kaart.products === null && !!kaart.sides && kaart.sides.delivered.shots.length === 1 && kaart.sides.uploaded.shots.length === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
section('§7 · de tijdlijn staat op het dashboard, voor elke trede');
// ─────────────────────────────────────────────────────────────────────────────
//
// order_events werd alleen gelezen door portal.js, en dáár alleen voor
// `attended`. Een klant met een account zag dus MINDER over zijn eigen
// bestelling dan iemand met een doorgestuurd linkje, en op de goedkoopste trede
// zag hij niets. Deze sectie legt de drie dingen vast die dat omkeren: de
// tijdlijn staat er, hij staat er ongeacht de trede, en er staat een zin over
// wat er nu gebeurt in plaats van de kolomwaarde.

const EVENTS = [
  { order_id: 88, status: 'received', note: null, created_at: '2026-07-19 09:00' },
  { order_id: 88, status: 'delivered', note: 'Alles in één keer geleverd.', created_at: '2026-07-21 14:00' },
  { order_id: 91, status: 'received', note: null, created_at: '2026-08-01 09:00' },
];

{
  const r = await get('/account', { events: EVENTS });
  const p = progressView(r.st.t, r.st.lang, r.view.featured, r.st.eventsByOrder.get(r.view.featured.id) || []);
  check('the overview leads with one order and its timeline', r.view.featured?.id === 91 && p.steps.length === 4);
  check('with a sentence about what happens now, not a column value',
    p.now.startsWith('Our studio is making your images') && !/in_production/.test(p.now));
  check('and the four steps, with the current one marked',
    p.steps.some((s) => s.state === 'is-now') && p.steps.some((s) => s.state === 'is-todo'));
  check('the history is there', p.history.length === 1 && p.history[0].what !== 'received');
  // Met één lopende bestelling hoort er geen klapje te staan: een knop die
  // "nog 0 bestellingen" opent is erger dan geen knop.
  check('with only one order in progress there is nothing to unfold', r.view.rest.length === 0);
}

{
  // Twee lopende bestellingen: dan pas verschijnt het klapje, en het telt
  // alleen wat er nog loopt — geleverde bestellingen staan al in de strook
  // eronder.
  const delivered = ORDERS.find((o) => o.id === 90);
  const prev = delivered.status;
  delivered.status = 'in_production';
  const r = await get('/account', { events: EVENTS });
  check('two in progress: one control, counting only those',
    r.view.rest.length === 1 && r.view.rest[0].id === 90 && r.view.active.length === 2);
  delivered.status = prev;
}

{
  /* ── ONE CARD AT A TIME — 27 August 2026 ─────────────────────────────────
   *
   * /account/orders used to render every order as a card. It now renders a table
   * of all of them plus the ONE that is open, so "count the flowboxes on the
   * page" answers a question the page no longer asks.
   *
   * Opening each order in turn is the same check and a sharper one: it proves
   * every order gets a timeline, including the unattended one, rather than
   * proving that three of something exist somewhere. Order 88 is the unattended
   * one in this fixture; the portal would show it no timeline at all, and the
   * dashboard must not care about the tier. */
  const kaartVan = (r, id) => r.view.kaarten.find((k) => k.o.id === id).view;
  for (const o of ORDERS) {
    const r = await get(`/account/orders?order=${o.id}`, { events: EVENTS });
    check(`order ${o.id} carries a timeline`, kaartVan(r, o.id).progress.steps.length === 4 && kaartVan(r, o.id).openNow === true);
  }
  const delivered = await get('/account/orders?order=90', { events: EVENTS });
  check('the delivered one says the images are ready',
    kaartVan(delivered, 90).progress.now.startsWith('Your images are ready'));
  /* The hand-typed note lives on order 88's timeline, not 90's — so ask for 88.
     Reading it off whichever card happened to render was the same page-wide
     shortcut this block just stopped taking. */
  const unattended = await get('/account/orders?order=88', { events: EVENTS });
  check('and a note typed by hand travels to the customer',
    kaartVan(unattended, 88).progress.history.some((e) => e.note === 'Alles in één keer geleverd.'));
}

// De mededeling die admin schrijft, aan de kant waar hij gelezen wordt.
{
  const o = ORDERS.find((x) => x.id === 91);
  o.customer_note = 'De stof op product 4 kwam donkerder uit dan op je foto, dus we hebben de belichting opgetrokken.';
  const r = await get('/account/orders', { events: EVENTS });
  const kaart = r.view.kaarten.find((k) => k.o.id === 91).view;
  check('the studio note reaches the customer', /belichting opgetrokken/.test(kaart.note));
  check('as its own field, not as system text', typeof kaart.note === 'string' && !/customer_note/.test(JSON.stringify(kaart.progress)));
  // De garantie uit migratie 0013: interne aantekeningen staan in een tabel die
  // deze kant niet kent. Een dashboard dat order_notes zou lezen, zou hier te
  // vinden zijn.
  check('and nothing on this page reads the internal log',
    !JSON.stringify(kaart).includes('order_notes'));
  delete o.customer_note;
}

// ─────────────────────────────────────────────────────────────────────────────
section('§8 · stap 6: afgerond zodra het laatste beeld is goedgekeurd');
// ─────────────────────────────────────────────────────────────────────────────
//
// closed_at bestond en werd nergens gezet, dus een bestelling bleef eeuwig open
// staan met revisieknoppen erop. Nu sluit hij zichzelf op het enige moment dat
// het waar kan zijn: de klant keurt zijn laatste beeld goed. Drie dingen die
// mis kunnen gaan liggen hier vast — te vroeg sluiten, een lege bestelling voor
// "alles goedgekeurd" aanzien, en een al gesloten bestelling opnieuw sluiten.

{
  const r = await post('/account/review', { file: '2', action: 'approve' },
    { files: [{ id: 2, order_id: 91, revisions_revoked_at: null }],
      finish: { live: 4, approved: 4, status: 'delivered', closed_at: null } });
  const closing = r.writes.find((w) => /UPDATE orders SET closed_at/.test(w.sql));
  check('the last approval closes the order', !!closing);
  check('and only if it was still open', /closed_at IS NULL/.test(closing?.sql || ''));
  check('the customer sees it on their timeline',
    r.writes.some((w) => /INSERT INTO order_events/.test(w.sql) && /afgerond/.test(String(w.binds?.[1] || ''))));
}

{
  const r = await post('/account/review', { file: '2', action: 'approve' },
    { files: [{ id: 2, order_id: 91, revisions_revoked_at: null }],
      finish: { live: 4, approved: 3, status: 'delivered', closed_at: null } });
  check('three out of four approved does NOT close it',
    !r.writes.some((w) => /UPDATE orders SET closed_at/.test(w.sql)));
}

{
  // Nul beelden is geen afgeronde bestelling maar een lege.
  const r = await post('/account/review', { file: '2', action: 'approve' },
    { files: [{ id: 2, order_id: 91, revisions_revoked_at: null }],
      finish: { live: 0, approved: 0, status: 'delivered', closed_at: null } });
  check('an order with nothing delivered is not "all approved"',
    !r.writes.some((w) => /UPDATE orders SET closed_at/.test(w.sql)));
}

{
  const r = await post('/account/review', { file: '2', action: 'approve' },
    { files: [{ id: 2, order_id: 91, revisions_revoked_at: null }],
      finish: { live: 2, approved: 2, status: 'delivered', closed_at: '2026-08-01' } });
  check('an order that already closed is left alone',
    !r.writes.some((w) => /UPDATE orders SET closed_at/.test(w.sql)));
}

// ─────────────────────────────────────────────────────────────────────────────
section('§9 · het dashboard is tweetalig, en de klant mag kiezen');
// ─────────────────────────────────────────────────────────────────────────────
//
// Beide talen bestonden volledig, maar de taal kwam uit de laatste BESTELLING
// en verder nergens uit. Een merk dat één keer in het Nederlands bestelde kon
// daarna nooit meer een Engels scherm krijgen — ook niet als degene die inlogt
// de inkoper uit Berlijn is. Er waren twee talen en één deur.

{
  const token = await mintToken();
  const db = makeDb();
  const req = new Request('https://visuails.com/account?lang=nl', {
    headers: { cookie: `vis_account=${token}`, 'accept-language': 'en-GB,en;q=0.9' },
  });
  const res = await studioScreen({ request: req, env: { DB: db }, waitUntil() {} }, 'overview');
  check('choosing a language redirects and remembers it', res instanceof Response && res.status === 303, res.status);
  check('the parameter is dropped so a shared link cannot force it',
    res.headers.get('location') === '/account', res.headers.get('location'));
  check('and the cookie is scoped to the dashboard, not the whole site',
    /vis_lang=nl/.test(res.headers.get('set-cookie') || '') && /Path=\/account/.test(res.headers.get('set-cookie') || ''));
}

{
  const token = await mintToken();
  const db = makeDb();
  // De bestellingen in deze fixture staan op 'en'; de cookie moet daaroverheen.
  const req = new Request('https://visuails.com/account', {
    headers: { cookie: `vis_account=${token}; vis_lang=nl`, 'accept-language': 'en-GB,en;q=0.9' },
  });
  const { st } = await studioScreen({ request: req, env: { DB: db }, waitUntil() {} }, 'overview');
  check('the choice beats the language of the last order', st.lang === 'nl' && st.t.ovWelcome === 'Welkom terug');
  /* En de schakelaar biedt de weg terug: StudioLayout tekent `?lang=<andere>`
     uit dezelfde `lang` — zie tests/studio-vorm.test.mjs voor de pagina zelf. */
}

/* ══ DE VORM VAN ELKE SECTIE ═══════════════════════════════════════════════
 *
 * Hier stond een blok dat de zes secties als HTML las: één <h1>, één bovenbalk,
 * geen inline style, geen <script>, de slotbalk als <progress>, de edities uit
 * AMOUNT. Dat staat sinds 6 september 2026 in tests/studio-vorm.test.mjs, op
 * de echte pagina's uit de gebouwde Worker — wat een klant ziet, en niet een
 * bouwer die niemand meer aanroept. Wat hier blijft is dat elke sectie zijn
 * staat oplevert, en dat de abonnementstaat zijn slots per soort telt.
 */
console.log('\nde staat van elke sectie');
{
  for (const pad of Object.keys(SECTIE)) {
    const r = await get(pad);
    check(`${pad} levert zijn staat`, r.status === 200 && r.view && typeof r.view === 'object', r.status);
  }
  const plan = await get('/account/plan');
  check('/account/plan telt zijn slots per soort', plan.view.geen === false && plan.view.saldo.slots.length === 2);
  check('en tekent twaalf kaders voor deze maand', plan.view.saldo.slots[0].frames.length === 12);
  const lijst = await get('/account/plan?tab=bestellen');
  check('de besteltab draagt de lijst met een vastzetknop per item', lijst.view.nu === 'bestellen' && lijst.view.wachtrij.length === 2 && lijst.view.wachtrij.every((q) => ['lock', 'unlock'].includes(q.lockDo)));
  const { AMOUNT: BEDRAG, euro: euroBedrag } = await import('../src/data/pricing.js');
  const ed = await get('/account/plan?tab=edities');
  check('de editions-tab is een tab met vier kleine beelden en een mailto', ed.view.nu === 'edities' && ed.view.edities.beelden.length === 4 && ed.view.edities.beelden.every((b) => /-w380\.webp$/.test(b.src) && b.alt) && /^mailto:hello@visuails\.com\?subject=/.test(ed.view.edities.mailto));
  check('en het bedrag komt uit AMOUNT, geen vanaf-prijs', typeof BEDRAG.editions === 'number' && euroBedrag(BEDRAG.editions, 'en').startsWith('€') && !/\bfrom €|vanaf €/i.test(ed.st.t.edPrice));
}

console.log(`\n${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
