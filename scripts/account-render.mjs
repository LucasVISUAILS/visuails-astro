/* Het klantdashboard als plaatje. `npm run account:render`
 *
 * WAAROM DIT BESTAAT. Het dashboard is de enige plek in dit project waar de
 * opmaak niet te zien is zonder een echte sessie, een echte database en een
 * deploy. Dat is precies de reden dat de fotogalerij in augustus 2026 op volle
 * breedte live ging: de HTML klopte, de CSS klopte, en niemand had het gezien.
 * Een pagina die je pas na een deploy kunt beoordelen, beoordeel je niet.
 *
 * WAT HET DOET. Het roept accountGet() aan met dezelfde domme D1-stub als
 * tests/account-brand-kit.test.mjs — geen wrangler, geen miniflare — vangt de
 * HTML op, en zet die in Chromium neer met public/account.css ervoor en echte
 * foto's op de plek van /account/files/<id>/f. Uit komt een PNG per taal en per
 * breedte, in .render/ (niet in public/, dit is gereedschap en geen bestand dat
 * de site uitserveert).
 *
 * WAT HET NIET IS. Geen test. Er wordt niets beweerd en niets afgekeurd; het
 * enige wat dit script levert is een beeld waar een mens naar kan kijken. De
 * beweringen staan in tests/.
 *
 *   node scripts/account-render.mjs                 → /account, nl + en, 1280 en 420
 *   node scripts/account-render.mjs /account/orders → een andere sectie
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { accountGet } from '../src/lib/account.js';
import { mintToken } from '../src/lib/token.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

const SECTION = process.argv[2] || '/account';

/* Letterlijk de header uit html() in src/lib/account.js. Verandert die daar, dan
   hoort hij hier mee te veranderen — en scripts/csp-probe.mjs draagt dezelfde
   regel, om dezelfde reden. */
const CSP = "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const WIDTHS = [[1280, 'breed'], [420, 'telefoon']];

/* ── de nepdatabase ──────────────────────────────────────────────────────────
 * Genoeg orders om de vier tellers te vullen en genoeg geleverde bestanden om
 * de strook twee rijen te laten halen. De cijfers zijn verzonnen; de vorm van
 * de rijen komt uit de echte queries in account.js. */
const CUSTOMER = { customer_id: 7, email: 'studio@voltbrand.nl', brand: 'VOLT', name: 'Mara' };

/* De betaalkolommen staan er sinds 7 augustus 2026 bij, want anders rendert
 * paymentBlock() niets en is precies het blok dat toen is toegevoegd het enige
 * dat je op deze plaatjes niet ziet. Vier bestellingen, vier toestanden:
 * onbetaald met een aflopend venster, betaald, betaald, en een proefvisual. */
const ORDERS = [
  { id: 91, ref: 'VIS-2608-4471', service: 'catalog', status: 'in_production', tier: 'attended', product_count: 30, window_start: '2026-08-10', window_end: '2026-08-14', lang: 'nl', created_at: '2026-08-01', closed_at: null, revisions_revoked_at: null,
    payment_status: 'unpaid', payment_provider: null, paid_at: null, total_cents: 63000, vat_cents: 13230, vat_rate: 0.21, vat_treatment: 'nl_standard', currency: 'EUR', refunded_cents: 0, window_expires_at: '2026-08-08 12:00' },
  /* AFGEROND, zodat de tevredenheidsvraag op de schermafdruk staat. `closed_at`
     is de trigger uit reviewverzamelingspecificatie.md §2 stap 1, en een blok dat
     alleen bij een afgeronde bestelling verschijnt, zie je op nepdata nooit als er
     geen afgeronde bestelling in zit. */
  { id: 90, ref: 'VIS-2607-9920', service: 'lifestyle', status: 'delivered', tier: 'attended', product_count: 12, window_start: null, window_end: null, lang: 'nl', created_at: '2026-07-28', closed_at: '2026-08-02 09:31', revisions_revoked_at: null,
    payment_status: 'paid', payment_provider: 'mollie', paid_at: '2026-07-28', total_cents: 32400, vat_cents: 6804, vat_rate: 0.21, vat_treatment: 'nl_standard', currency: 'EUR', refunded_cents: 0, window_expires_at: null },
  { id: 89, ref: 'VIS-2607-3312', service: 'catalog', status: 'human_check', tier: 'attended', product_count: 8, window_start: null, window_end: null, lang: 'nl', created_at: '2026-07-24', closed_at: null, revisions_revoked_at: null,
    payment_status: 'paid', payment_provider: 'mollie', paid_at: '2026-07-24', total_cents: 20800, vat_cents: 0, vat_rate: 0, vat_treatment: 'eu_reverse_charge', currency: 'EUR', refunded_cents: 0, window_expires_at: null },
  { id: 88, ref: 'VIS-2607-1180', service: 'test-sample', status: 'delivered', tier: 'unattended', product_count: 1, window_start: null, window_end: null, lang: 'nl', created_at: '2026-07-19', closed_at: null, revisions_revoked_at: null,
    /* €1 en geen 0,99, en vat_cents 0: de proefvisual wordt sinds 8 augustus
     * 2026 als één vast bedrag afgerekend (AMOUNT.testSample), en
     * quoteTestSample() zet er geen btw bovenop. */
    payment_status: 'paid', payment_provider: 'mollie', paid_at: '2026-07-19', total_cents: 100, vat_cents: 0, vat_rate: 0, vat_treatment: 'nl_standard', currency: 'EUR', refunded_cents: 0, window_expires_at: null },
];

/* De facturen bij de drie betaalde bestellingen hierboven. Eén ervan staat op
 * 'pending' — dat is de toestand waarin het nummer al is uitgegeven en de pdf
 * nog niet bestaat, en het is de enige rij in dit overzicht die géén knop
 * krijgt. Zonder hem in de nepdata is dat precies het geval dat je op een
 * schermafdruk nooit ziet. */
const snap = (over) => JSON.stringify({
  number: over.number, date: over.date, lang: 'nl',
  netCents: over.net, vatCents: over.vat, grossCents: over.net + over.vat,
  vatRate: over.vat ? 0.21 : 0, treatment: over.treatment || 'nl_standard',
  customer: { name: 'Mara' }, lines: [],
});
const INVOICES = [
  { id: 31, number: 'VIS-2026-0031', status: 'issued', pdf_key: 'invoices/2026/VIS-2026-0031.pdf', pdf_bytes: 2310,
    snapshot_json: snap({ number: 'VIS-2026-0031', date: '2026-07-28', net: 32400, vat: 6804 }), lang: 'nl',
    issued_at: '2026-07-28 09:31', created_at: '2026-07-28 09:31', ref: 'VIS-2607-9920', service: 'lifestyle', paid_at: '2026-07-28' },
  { id: 30, number: 'VIS-2026-0030', status: 'issued', pdf_key: 'invoices/2026/VIS-2026-0030.pdf', pdf_bytes: 2288,
    snapshot_json: snap({ number: 'VIS-2026-0030', date: '2026-07-24', net: 20800, vat: 0, treatment: 'eu_reverse_charge' }), lang: 'nl',
    issued_at: '2026-07-24 12:02', created_at: '2026-07-24 12:02', ref: 'VIS-2607-3312', service: 'catalog', paid_at: '2026-07-24' },
  { id: 29, number: 'VIS-2026-0029', status: 'pending', pdf_key: null, pdf_bytes: null,
    snapshot_json: snap({ number: 'VIS-2026-0029', date: '2026-07-19', net: 100, vat: 0 }), lang: 'nl',
    issued_at: null, created_at: '2026-07-19 15:10', ref: 'VIS-2607-1180', service: 'test-sample', paid_at: '2026-07-19' },
];

const SHOTS = ['front', 'back', 'detail', 'worn'];
const FILES = [];
let fid = 400;
/* Drie producten per bestelling, elk vier shots — de vorm die de
 * productkaarten op het dashboard moeten laten zien. Eén beeld staat op
 * 'revision_requested', want de amberkleurige rand is een van de dingen die
 * alleen op een plaatje te beoordelen zijn. */
for (const o of ORDERS) {
  const products = o.status === 'delivered' ? 3 : o.status === 'human_check' ? 2 : 0;
  for (let p = 1; p <= Math.max(products, 2); p++) {
    FILES.push({ id: fid++, order_id: o.id, kind: 'upload', filename: `IMG_${1000 + p}.jpg`, bytes: 2_400_000, expires_at: null, review_state: null, review_note: null, reviewed_at: null, product_key: `p${p}`, shot: null });
  }
  for (let p = 1; p <= products; p++) {
    for (const shot of SHOTS) {
      const revising = o.id === 90 && p === 2 && shot === 'back';
      FILES.push({
        id: fid++, order_id: o.id, kind: 'delivery',
        filename: `VOLT-p${p}-${shot}.webp`, bytes: 1_800_000, expires_at: '2026-12-31',
        review_state: revising ? 'revision_requested' : (p === 1 ? 'approved' : 'pending'),
        review_note: revising ? 'De achtergrond trekt naar grijs, en de mouw hangt scheef.' : null,
        reviewed_at: revising ? '2026-08-05' : null,
        product_key: `p${p}`, shot,
      });
    }
  }
}

const DETAILS = {
  name: 'Mara', brand: 'VOLT', email: CUSTOMER.email, phone: '',
  website: 'https://voltbrand.nl', vat_number: 'NL001234567B01',
  default_background: 'white', default_background_hex: null, details_saved_at: '2026-07-20',
};

const MODELS = [
  { id: 31, label: 'Nadia', status: 'approved', has_preview: 1 },
  { id: 32, label: 'Tomas', status: 'locked', has_preview: 1 },
];

/* Gebeurtenissen voor de tijdlijn — de rijen die admin bij elke
 * statuswijziging wegschrijft, inclusief een handmatige notitie. */
const EVENTS = [
  { order_id: 91, status: 'received', note: null, created_at: '2026-08-01 09:12' },
  { order_id: 91, status: 'in_production', note: 'Ingepland voor donderdag.', created_at: '2026-08-03 10:40' },
  { order_id: 90, status: 'received', note: null, created_at: '2026-07-28 08:03' },
  { order_id: 90, status: 'in_production', note: null, created_at: '2026-07-29 11:20' },
  { order_id: 90, status: 'human_check', note: null, created_at: '2026-08-01 16:05' },
  { order_id: 90, status: 'delivered', note: '12 beelden geleverd.', created_at: '2026-08-02 09:30' },
  { order_id: 89, status: 'received', note: null, created_at: '2026-07-24 12:00' },
  { order_id: 89, status: 'human_check', note: null, created_at: '2026-07-30 15:41' },
  { order_id: 88, status: 'delivered', note: null, created_at: '2026-07-20 10:00' },
];

/* Het antwoord op de tevredenheidsvraag. Standaard leeg — dan staat de vraag zelf
   op de plaat, en dat is de toestand die een klant het eerst ziet. Zet er een rij
   met score 2 of 5 in om de twee vervolgtoestanden te bekijken. */
const FEEDBACK = [];

/* ── HET ABONNEMENT ─────────────────────────────────────────────────────────
 * Zonder deze rijen rendert /account/plan de kaart voor een klant ZONDER
 * abonnement, en dat is precies het scherm dat je niet hoeft te controleren.
 * Een lopend Studio-abonnement met een halfvol saldo, drie dingen op de lijst
 * en twee die al gemaakt zijn — de toestand waarin de pagina het meeste te
 * tonen heeft.
 *
 * De maand is opzettelijk `datum()` en geen vaste string: subscription.js
 * vergelijkt met de HUIDIGE maand, en een vastgezette '2026-08' zou deze
 * schermafdruk in september stilletjes op "nog niet betaald" laten vallen. */
const NU = new Date().toISOString().slice(0, 7);
const SUBSCRIPTION = {
  id: 4, ref: 'SUB-4K2P-9XT', customer_id: 7, plan: 'studio', term: 'yearly',
  status: 'active', window_day: 8,
  mollie_customer_id: 'cst_voorbeeld', mollie_mandate_id: 'mdt_voorbeeld', mollie_subscription_id: 'sub_voorbeeld',
  started_at: '2026-05-08', cancelled_at: null, cancel_reason: null,
  paused_at: null, pause_reason: null, created_at: '2026-05-06',
};
/* Twee maanden: de vorige met een overschot dat doorschuift, en deze. Zo staan de
   drie soorten vakje allemaal op de schermafdruk — verbruikt, open, doorgeschoven
   — en is de vervalregel te lezen. `VORIGE` is een echte vorige maand en geen
   vaste string, om dezelfde reden als bij NU. */
const VORIGE = (() => {
  const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
const LOCKS = [
  { style: 'catalog', custom_model_id: 31, roster_model: null, background_hex: '#F7F5F1', ratio: 'portrait45', channels: 'own,bol' },
  { style: 'lifestyle', custom_model_id: 31, roster_model: null, background_hex: null, ratio: 'portrait45', channels: null },
];
const SUB_MONTHS = [
  { month: VORIGE, granted: 12, used: 9, clips_granted: 2, clips_used: 2 },
  { month: NU, granted: 12, used: 7, clips_granted: 2, clips_used: 1 },
];
const QUEUE = [
  { id: 21, position: 0, name: 'Winterjas, zwart', note: 'graag op straat, niet in de studio', upload_batch: null, created_at: '2026-08-14' },
  { id: 22, position: 1, name: 'Wollen sjaal — drie kleuren', note: null, upload_batch: null, created_at: '2026-08-14' },
  { id: 23, position: 2, name: 'Handschoenen', note: 'detailopname van de naad', upload_batch: null, created_at: '2026-08-15' },
];
const TAKEN = [
  { id: 19, name: 'Regenjas, olijf', taken_at: '2026-08-08', order_id: 91, order_ref: 'VIS-2608-4471' },
  { id: 18, name: 'Trui, gebroken wit', taken_at: '2026-07-08', order_id: 90, order_ref: 'VIS-2607-9920' },
];

function makeDb() {
  const pick = (sql) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('FROM subscriptions')) return SUBSCRIPTION;
    if (s.includes('FROM subscription_months')) return SUB_MONTHS;
    if (s.includes('FROM plan_queue q')) return TAKEN;
    if (s.includes('FROM plan_queue')) return QUEUE;
    if (s.includes('FROM account_sessions')) return { ...CUSTOMER, expires_at: '2099-01-01' };
    if (s.includes('FROM rate_limits')) return null;
    if (s.includes('FROM order_events')) return EVENTS;
    if (s.includes('FROM files f JOIN orders')) return FILES;
    if (s.includes('FROM custom_models')) return MODELS;
    /* ECHTE VASTGELEGDE VOORKEUREN. Met een lege lijst rendert /account/plan drie
       keer "nog niet ingesteld" plus de nudge, en dan is precies de kaart die het
       abonnement draagt de kaart die je niet kunt beoordelen. Catalog en lifestyle
       staan vast, video niet — zo staan beide toestanden op één schermafdruk. */
    if (s.includes('FROM customer_style_locks')) return LOCKS;
    if (s.includes('FROM order_feedback')) return FEEDBACK;
    if (s.includes('FROM invoices i')) return INVOICES;
    if (s.includes('FROM customers WHERE id')) return DETAILS;
    if (s.includes('FROM orders')) return ORDERS;
    return null;
  };
  return {
    prepare(sql) {
      const st = {
        bind() { return st; },
        async first() { const r = pick(sql); return Array.isArray(r) ? r[0] : r; },
        async all() { const r = pick(sql); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
        async run() { return { success: true }; },
      };
      return st;
    },
    async batch() { return []; },
  };
}

async function render(section, lang) {
  const token = await mintToken();
  const url = new URL(`https://visuails.com${section}`);
  /* DE TAAL KOMT UIT DE COOKIE, niet uit ?lang= — sinds 7 augustus 2026 zet die
   * parameter de keuze vast en stuurt hij door naar dezelfde pagina zónder hem.
   * Dit script kreeg daardoor een 303 met een lege body terug en maakte een
   * schermafdruk van niets: een witte PNG die er precies zo uitziet als een
   * stuk dashboard. Precies de reden dat dit script bestaat, en precies de
   * manier waarop het zelf kon liegen. */
  const request = new Request(url, {
    headers: {
      /* Met VISUAILS_NAV=dicht rendert dit script de INGEKLAPTE balk. Dat is de
         enige manier om die stand te zien: hij komt uit een cookie, want de CSP van
         dit dashboard laat geen script toe. Zie navCookie() in account.js. */
      cookie: `vis_account=${token}; vis_lang=${lang}`
        + (process.env.VISUAILS_NAV === 'dicht' ? '; vis_nav=dicht' : ''),
      'accept-language': lang === 'nl' ? 'nl-NL,nl;q=0.9' : 'en-GB,en;q=0.9',
    },
  });
  const res = await accountGet({ request, env: { DB: makeDb() }, waitUntil() {} });
  const body = await res.text();
  if (res.status !== 200 || body.length < 500) {
    throw new Error(`account-render: ${section} (${lang}) gaf ${res.status} met ${body.length} tekens — dat is geen pagina.`);
  }
  /* Met VISUAILS_DUMP_HTML=<map> wordt de html óók weggeschreven. Alleen voor het
     doormeten van computed styles: een schermafdruk laat zien dát iets te groot is, de
     html laat een browser vertellen hoeveel px het is. */
  if (process.env.VISUAILS_DUMP_HTML) {
    const out = path.join(process.env.VISUAILS_DUMP_HTML, `${section.replace(/\//g, '_') || 'root'}-${lang}.html`);
    fs.mkdirSync(process.env.VISUAILS_DUMP_HTML, { recursive: true });
    fs.writeFileSync(out, body);
  }
  return body;
}

/* De foto's. /account/files/<id>/f haalt normaal uit R2; hier draaien we door
 * een handjevol echte beelden heen zodat de tegels de verhouding en de
 * uitsnede krijgen die ze in het echt ook krijgen. Een grijs vlak zou elke
 * fout in object-fit verbergen. */
const PHOTOS = fs.readdirSync(path.join(ROOT, 'public/img'))
  .filter((f) => /^(banners|lifestyle|custom-models|catalog)/.test(f) && /\.webp$/.test(f))
  .sort()
  .map((f) => path.join(ROOT, 'public/img', f));
if (!PHOTOS.length) throw new Error('account-render: geen voorbeeldfotos in public/img');

/* ── WELKE CHROME — 26 augustus 2026 ─────────────────────────────────────────
   Hier stond een hard pad naar /opt/pw-browsers. Dat is de map van de
   Linux-container waarin dit project ook wordt gebouwd, en op Lucas' machine
   bestaat /opt niet eens: dit script viel daar dus om nog voordat het iets deed.
   scripts/lib/browserpad.mjs bestaat precies hiervoor en waarschuwt er in zijn
   eigen noot voor — hij werd alleen door één script gebruikt. */
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
const context = await browser.newContext();

await context.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.pathname === '/account.css' || u.pathname.endsWith('.css')) {
    const file = path.join(ROOT, 'public', u.pathname.replace(/^\//, ''));
    if (fs.existsSync(file)) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(file) });
  }
  if (/^\/account\/files\/(\d+)\//.test(u.pathname)) {
    const n = Number(u.pathname.match(/^\/account\/files\/(\d+)\//)[1]);
    return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(PHOTOS[n % PHOTOS.length]) });
  }
  if (u.pathname === '/__page') {
    return route.fulfill({
      contentType: 'text/html',
      /* ── MET DE ECHTE CSP EROP — 13 AUGUSTUS 2026 ──────────────────────────
       *
       * Dit script rendeerde de pagina ZONDER header, en daardoor was het beeld
       * dat het opleverde vriendelijker dan de werkelijkheid. De beeldverhouding
       * in de brand kit werd getekend met `style="aspect-ratio:4 / 5"`: hier
       * stonden vier keurige vormen, en op Lucas' scherm vier streepjes van één
       * pixel, want `style-src 'self'` weigert style-ATTRIBUTEN. Ik heb hem een
       * uitsnede gestuurd waarop het goed stond, van een pagina die stuk was.
       *
       * Dezelfde header als in html() in src/lib/account.js, letterlijk. Een
       * render die iets toont wat de browser weigert, is erger dan geen render:
       * hij geeft vertrouwen in plaats van zicht. */
      headers: { 'content-security-policy': CSP },
      body: globalThis.__html,
    });
  }
  return route.fulfill({ status: 204, body: '' });
});

for (const lang of ['nl', 'en']) {
  globalThis.__html = await render(SECTION, lang);
  for (const [w, name] of WIDTHS) {
    const page = await context.newPage();
    /* EEN HOOG VENSTER, EXPRES. De tegels staan op loading="lazy", en een
     * fullPage-opname rekt het beeld op zonder alsnog te laden wat buiten het
     * oorspronkelijke venster viel — dan komen de onderste tegels als zwarte
     * vlakken op de foto en lijkt de opmaak stuk. Met een venster van 2000px
     * valt alles binnen bereik en wacht networkidle ze netjes af. */
    await page.setViewportSize({ width: w, height: 2000 });
    await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });

    /* Terug naar een normale hoogte voordat de opname wordt gemaakt, anders
     * krijgt de PNG onderaan honderden pixels leegte van het hoge venster. */
    await page.setViewportSize({ width: w, height: 900 });
    const slug = SECTION.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'account';
    const file = path.join(OUT, `${slug}-${lang}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await page.close();
    console.log(`  .render/${path.basename(file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
  }
}

await browser.close();
console.log('\n▶ nepdata, echte CSS — dit is om naar te kijken, niet om iets mee te bewijzen');
