/* Het adminscherm als plaatje. `npm run admin:render`
 *
 * Tweelingbroer van scripts/account-render.mjs, en om dezelfde reden: het
 * werkbord op /admin/orders/<id>/files is niet te zien zonder sessie, database
 * en deploy, en een scherm dat je pas na een deploy kunt beoordelen, beoordeel
 * je niet. Nepdata, echte CSS, echte renderfunctie.
 *
 *   node scripts/admin-render.mjs                     → de bestandenpagina
 *   node scripts/admin-render.mjs /admin              → het dashboard
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { adminGet } from '../src/lib/admin.js';
import { mintToken } from '../src/lib/token.js';
import { browserPad } from './lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

const SECTION = process.argv[2] || '/admin/orders/90/files';

const ORDER = {
  id: 90, customer_id: 8, ref: 'VIS-2607-9920', service: 'catalog', status: 'delivered',
  tier: 'attended', brand: 'VOLT', name: 'Mara', email: 'studio@voltbrand.nl',
  lang: 'nl', product_count: 3, payment_status: 'paid', created_at: '2026-07-28',
  delivered_at: '2026-08-02', delivery_mailed_at: '2026-08-02 09:30',
  redelivery_mailed_at: null, redelivery_count: 0, file_count: 9,
  /* Stond niet in de nepdata, en het paneel zette er `undefined\u00d7 aangevraagd`
     neer. Een schermafdruk die iets toont wat in productie nooit zo staat, is
     een schermafdruk waar je de verkeerde dingen op nakijkt. */
  revision_count: 1, revisions_revoked_at: null,
  /* ── WAT DE KLANT KOOS, PER PRODUCT — 22 september 2026 ─────────────────
     Het bord toont sinds vandaag per product de brief: type, gezicht, wat er
     binnenkwam en wat erbij gezet is. Zonder deze velden zou de schermafdruk
     drie lege briefjes tonen en dus niets nakijken. Verzonnen namen, geen
     echte SKU's. */
  details_json: JSON.stringify({
    garment: 'top', garment_p2: 'trousers',
    product_p1: 'Boxy hoodie · washed black', product_p2: 'Wide-leg jeans · ecru', product_p3: 'Ribbed longsleeve',
    model: 'any', model_p2: 'ava',
    material_p1: 'katoen, 400 gsm',
    context_underlayer_p1: 'own', context_bottom_p1: 'ours',
    context_shoes_p2: 'ours', context_top_p2: 'ours',
    context_underlayer_p3: 'ours', context_bottom_p3: 'ours',
  }),
};

/* Product 1 compleet en gemeld, product 2 half af met één revisie, product 3
 * nog leeg — de drie toestanden die het bord moet kunnen laten zien. */
const SHOTS = ['front', 'back', 'detail', 'worn'];
const FILES = [];
let fid = 500;
for (const shot of SHOTS) {
  FILES.push({ id: fid++, kind: 'delivery', filename: `VOLT-p1-${shot}.webp`, bytes: 1_200_000, product_key: 'p1', shot, created_at: '2026-08-01', review_state: 'approved', announced_at: '2026-08-02 09:30', superseded_at: null });
}
FILES.push({ id: fid++, kind: 'delivery', filename: 'VOLT-p2-front.webp', bytes: 1_100_000, product_key: 'p2', shot: 'front', created_at: '2026-08-01', review_state: 'revision_requested', announced_at: '2026-08-02 09:30', superseded_at: null });
FILES.push({ id: fid++, kind: 'delivery', filename: 'VOLT-p2-back.webp', bytes: 1_150_000, product_key: 'p2', shot: 'back', created_at: '2026-08-06', review_state: 'pending', announced_at: null, superseded_at: null });
/* Wat de klant instuurde: product 1 compleet mét een eigen stuk eronder,
   product 2 twee hoeken en een referentie, product 3 nog niets. */
for (const shot of ['front', 'back', 'detail', 'worn']) {
  FILES.push({ id: fid++, kind: 'upload', filename: `IMG_10${fid}.jpg`, bytes: 2_400_000, product_key: 'p1', shot, created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });
}
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1099.jpg', bytes: 1_900_000, product_key: 'p1', shot: 'ctx-underlayer', created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1101.jpg', bytes: 2_500_000, product_key: 'p2', shot: 'front', created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1102.jpg', bytes: 2_500_000, product_key: 'p2', shot: 'back', created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });
FILES.push({ id: fid++, kind: 'upload', filename: 'IMG_1103.jpg', bytes: 2_100_000, product_key: 'p2', shot: 'ref1', created_at: '2026-07-28', review_state: null, announced_at: null, superseded_at: null });

/* De afgeleide formaten per beeld — zie de noot bij `FROM file_assets` in
   makeEnv(). 500 t/m 503 zijn compleet, 504 mist zijn webp, 505 heeft niets. */
/* Drie bestellingen voor /admin/planning — zie de noot bij `FROM orders` in
   makeEnv(). De dagen worden vanaf vandaag gerekend, zodat de schermafdruk niet
   over een maand naar een lege agenda kijkt. */
const _vandaag = new Date();
const _dag = (n) => new Date(_vandaag.getTime() + n * 86400000).toISOString().slice(0, 10);
const PLANNING_ORDERS = [
  { ...ORDER, id: 90, ref: 'VIS-2607-9920', brand: 'VOLT', status: 'in_production', tier: 'attended',
    product_count: 6, window_start: _dag(2), window_end: _dag(3), payment_status: 'paid', created_at: _dag(-4) },
  { ...ORDER, id: 91, ref: 'VIS-2609-1140', brand: 'NOORD', status: 'received', tier: 'attended',
    product_count: 14, window_start: _dag(5), window_end: _dag(6), payment_status: 'paid', created_at: _dag(-2) },
  { ...ORDER, id: 92, ref: 'VIS-2609-2277', brand: 'KADE', status: 'received', tier: 'unattended',
    product_count: 3, window_start: null, window_end: null, payment_status: 'unpaid', created_at: _dag(-1) },
];

const ASSETS = [];
for (const id of [500, 501, 502, 503]) for (const format of ['jpg', 'png', 'webp']) ASSETS.push({ id, format });
for (const format of ['jpg', 'png']) ASSETS.push({ id: 504, format });

/* Verzonnen, en met opzet niet zoals een echte klant schrijft: één korte en één
   die over drie alinea's gaat, zodat de opmaak van allebei te beoordelen is. Geen
   echte bedrijfsnaam en geen echt adres — zie de regel daarover in FigDash.astro. */
const TESTIMONIALS = [
  {
    order_id: 90, ref: 'VIS-2607-9920', brand: 'VOLT', service: 'catalog', lang: 'nl',
    testimonial_text: 'Binnen vier dagen stonden er twaalf producten online die er eindelijk bij elkaar uitzien.',
    testimonial_name: 'Mara', testimonial_approved: 0,
    updated_at: '2026-08-09 11:12', asked_at: '2026-08-08', email: 'studio@voorbeeldmerk.nl',
    closed_at: '2026-08-08',
  },
  {
    order_id: 89, ref: 'VIS-2607-3312', brand: 'NOORD', service: 'lifestyle', lang: 'nl',
    testimonial_text: 'We hadden al een fotograaf en die blijven we houden voor de campagnes.\n\nWaar dit het verschil maakte is de lange staart: dertig artikelen die het budget van een shoot nooit gaan halen, en die er nu wel netjes bij staan.\n\nDe achtergrond klopte meteen met wat er al stond, dat scheelde het meeste werk.',
    testimonial_name: 'Joris', testimonial_approved: 1,
    updated_at: '2026-08-04 16:40', asked_at: '2026-08-03', email: 'inkoop@voorbeeldmerk.nl',
    closed_at: '2026-08-03',
  },
];

function makeEnv() {
  const pick = (sql) => {
    const s = sql.replace(/\s+/g, ' ');
    /* ── DE AFGELEIDE FORMATEN — 13 september 2026 ───────────────────────────
       De bestandenpagina toont sinds vandaag per beeld of er een jpg, png en
       webp van is (zie de formaatkolom in admin.js). Zonder deze fixture staat
       er op elke schermafdruk "nog niet omgezet", en dan is precies de kolom
       die je wilt beoordelen de enige die je niet ziet.

       Met opzet niet alle beelden compleet: het eerste heeft alle drie, het
       tweede mist de webp (een omzetting die halverwege stopte) en het derde
       heeft er geen — dat zijn de drie toestanden die de kolom kan tonen. */
    if (s.includes('FROM file_assets a')) return ASSETS;
    if (s.includes('FROM admin_sessions') || s.includes('FROM admin_users')) {
      return { admin_id: 1, id: 1, email: 'hello@visuails.com', expires_at: '2099-01-01' };
    }
    if (s.includes('FROM rate_limits')) return null;
    /* ── HET ABONNEMENTSPANEEL — 30 augustus 2026 ─────────────────────────────
       Zonder deze rijen rendert /admin/customers/<id> het paneel helemaal niet,
       en dan staat er op de schermafdruk precies niets van het scherm waar sinds
       migratie 0035 het meeste aan veranderd is: het saldo per soort, de lijst
       met vastgezet-of-concept, en de knop om slots bij te stellen.

       Dezelfde les als bij scripts/account-render.mjs eerder deze week: een
       fixture die de code niet bereikt, is een controle die niets controleert. */
    if (s.includes('FROM subscriptions')) return SUB;
    if (s.includes('FROM subscription_months')) return SUB_MONTHS;
    if (s.includes('FROM subscription_slots')) return SUB_SLOTS;
    if (s.includes('FROM plan_queue')) return QUEUE;
    if (s.includes('FROM customers WHERE id')) return KLANT;
    /* De aanbevelingen — 14 augustus 2026. Twee rijen en niet één: het scherm
       splitst op "wacht op je" en "goedgekeurd", en met alleen een wachtende rij
       is de helft van de opmaak op de schermafdruk niet te zien. Zie de kop van
       renderTestimonials() in src/lib/admin.js. */
    if (s.includes('FROM order_feedback f')) return TESTIMONIALS;
    if (s.includes('SELECT status, COUNT(*)')) return [{ status: 'delivered', n: 41 }];
    if (s.includes('COUNT(*) AS n')) return { n: 2 };
    if (s.includes('FROM files WHERE order_id')) return FILES;
    if (s.includes('FROM custom_models')) return [];
    if (s.includes('FROM customer_style_locks')) return [];
    if (s.includes('FROM orders WHERE id')) return ORDER;
    /* ── DE PLANNING HEEFT MEER DAN ÉÉN BESTELLING NODIG — 13 september 2026 ─
       /admin/planning tekent veertien dagen met de bestellingen erin, en met
       één rij (die bovendien al geleverd is) is elke dag leeg. Dan staat er op
       de schermafdruk precies niets van wat je wilt beoordelen: de chips, de
       bezetting, en sinds vandaag de neerzetknoppen.

       De data zijn met opzet ongelijk: één vastgelegd paar dat vandaag begint,
       één zwaar paar verderop, en één zonder vaste dag ("zo snel mogelijk").
       Dat zijn de drie manieren waarop werk op deze planning terechtkomt. */
    if (s.includes('FROM orders')) return PLANNING_ORDERS;
    if (s.includes("review_state = 'revision_requested'")) return [];
    return null;
  };
  const DB = {
    prepare(sql) {
      const st = {
        bind() { return st; },
        async first() { const r = pick(sql); return Array.isArray(r) ? r[0] : r; },
        async all() { const r = pick(sql); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
        async run() { return { success: true }; },
      };
      return st;
    },
    async batch(list) { return list.map(() => ({ success: true })); },
  };
  return { DB };
}

/* ── DE ABONNEE ──────────────────────────────────────────────────────────────
   Uitgerekende maanden en geen vaste strings, om dezelfde reden als in
   tests/account-brand-kit.test.mjs: een vast '2026-08' valt buiten het
   doorschuifvenster zodra de maand omslaat, en dan tekent het paneel stilletjes
   iets anders dan waar je naar denkt te kijken. */
const _nu = new Date();
const _deze = _nu.toISOString().slice(0, 7);
const _vorig = new Date(Date.UTC(_nu.getUTCFullYear(), _nu.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
const KLANT = { id: 8, email: 'studio@voltbrand.nl', name: 'Mara', brand: 'VOLT', created_at: '2026-06-01' };
const SUB = {
  id: 3, ref: 'SUB-2608-001', customer_id: 8, plan: 'studio', term: 'monthly',
  status: 'active', window_day: 8, created_at: `${_deze}-01`,
};
const SUB_MONTHS = [
  { month: _vorig, granted: 12, used: 9, clips_granted: 2, clips_used: 0 },
  { month: _deze, granted: 12, used: 2, clips_granted: 2, clips_used: 1 },
];
const SUB_SLOTS = [
  { month: _vorig, kind: 'complete', granted: 12, used: 9 },
  { month: _deze, kind: 'complete', granted: 12, used: 2 },
  { month: _deze, kind: 'video-motion', granted: 2, used: 1 },
];
/* Drie toestanden, want het paneel kan er drie tonen: vastgezet, concept met
   foto's, en concept zonder. Alle drie op de afdruk of geen van drieën. */
const QUEUE = [
  { id: 61, position: 0, name: 'Winterjas, zwart', note: null, upload_batch: 'b-1', kind: 'complete', locked_at: `${_deze}-02 10:00:00`, order_id: null, taken_at: null, created_at: `${_deze}-01` },
  { id: 62, position: 1, name: 'Cargobroek, sand', note: null, upload_batch: 'b-2', kind: 'complete', locked_at: null, order_id: null, taken_at: null, created_at: `${_deze}-01` },
  { id: 63, position: 2, name: 'Motion voor de winterjas', note: null, upload_batch: null, kind: 'video-motion', locked_at: null, order_id: null, taken_at: null, created_at: `${_deze}-02` },
];

const PHOTOS = fs.readdirSync(path.join(ROOT, 'public/img'))
  .filter((f) => /^(banners|lifestyle|custom-models|catalog)/.test(f) && /\.webp$/.test(f))
  .sort()
  .map((f) => path.join(ROOT, 'public/img', f));

const token = await mintToken();
const request = new Request(`https://visuails.com${SECTION}`, { headers: { cookie: `vis_admin=${token}` } });
const res = await adminGet({ request, env: makeEnv(), waitUntil() {} });
const body = await res.text();

/* Met VISUAILS_DUMP_HTML=<map> wordt de html óók weggeschreven — dezelfde
   schakelaar als in account-render.mjs, en om dezelfde reden: een schermafdruk
   laat zien DAT er iets mis is, de html laat een browser vertellen wat. Zo kan
   kladblok/axe-dashboard.mjs ook over het adminscherm heen. */
if (process.env.VISUAILS_DUMP_HTML) {
  fs.mkdirSync(process.env.VISUAILS_DUMP_HTML, { recursive: true });
  fs.writeFileSync(path.join(process.env.VISUAILS_DUMP_HTML,
    `${SECTION.replace(/\//g, '_') || 'root'}.html`), body);
}

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
  if (u.pathname.endsWith('.css')) {
    /* Eerst public/, dan dist/: /fonts/gedeeld.css schrijft de build (zie
       scripts/fonts-voor-worker.mjs) en staat niet in public/. */
    const file = ['public', 'dist'].map((d) => path.join(ROOT, d, u.pathname.replace(/^\//, ''))).find((p) => fs.existsSync(p));
    if (file) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(file) });
  }
  if (u.pathname.endsWith('.woff2')) {
    const file = path.join(ROOT, 'dist', u.pathname.replace(/^\//, ''));
    if (fs.existsSync(file)) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(file) });
  }
  const m = /^\/admin\/files\/(\d+)$/.exec(u.pathname);
  if (m) return route.fulfill({ contentType: 'image/webp', body: fs.readFileSync(PHOTOS[Number(m[1]) % PHOTOS.length]) });
  if (u.pathname === '/__page') return route.fulfill({ contentType: 'text/html', body });
  return route.fulfill({ status: 204, body: '' });
});

/* ── DE DONKERE STAND — 20 september 2026 ─────────────────────────────────
   VIS_NACHT=1 zet `data-thema="donker"` op <html>, precies zoals de Worker dat
   doet als het `vis_thema`-cookie op donker staat (zie metThema() in
   src/lib/admin.js). De kleuren komen uit admin.css zelf — de proef-CSS in
   kladblok/ is niet meer nodig en de stand is geen proef meer.

   Er wordt hier dus NIETS geïnjecteerd: wat je op de afdruk ziet, is wat de
   browser van een echte sessie te zien krijgt. */
const NACHT = process.env.VIS_NACHT === '1';
const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 2000 });
await page.goto('https://visuails.com/__page', { waitUntil: 'networkidle' });
if (NACHT) {
  await page.evaluate(() => document.documentElement.setAttribute('data-thema', 'donker'));
  await page.waitForTimeout(200);
}
await page.setViewportSize({ width: 1280, height: 900 });
/* VIS_OPEN=1 klapt elke <details> open voordat er gemeten wordt. De inhoud van
   een dichte <details> wordt overgeslagen (zie de noot bij checkVisibility
   hieronder), en dat is juist waar de helft van dit paneel in zit. */
if (process.env.VIS_OPEN === '1') {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(150);
}
if (process.env.VIS_REGEL) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const doc = await cdp.send('DOM.getDocument');
  const q = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: process.env.VIS_REGEL });
  if (q.nodeId) {
    const m = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: q.nodeId });
    for (const r of m.matchedCSSRules || []) {
      const k = r.rule.style.cssProperties.find((x) => x.name === 'color');
      if (k) console.log(r.rule.origin, r.rule.selectorList.text.slice(0, 70), '=>', k.value);
    }
    console.log(JSON.stringify(await page.evaluate((sel) => {
      const el = document.querySelector(sel); const c = getComputedStyle(el);
      const keten = []; for (let n = el; n && n !== document.body; n = n.parentElement) keten.push(n.tagName + '.' + String(n.className).slice(0, 24));
      return { kleur: c.color, vul: c.webkitTextFillColor, ink: c.getPropertyValue('--ink'), keten, bladen: [...document.styleSheets].map((x) => x.href || 'inline') };
    }, process.env.VIS_REGEL)));
  } else console.log('niet gevonden:', process.env.VIS_REGEL);
}
if (process.env.VIS_CONTRAST) {
  console.log(JSON.stringify(await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const meng = (voor, achter) => { const a = Number((voor.match(/[\d.]+/g) || [])[3] ?? 1); const v = voor.match(/[\d.]+/g).map(Number); const w = achter.match(/[\d.]+/g).map(Number); return `rgb(${v[0] * a + w[0] * (1 - a)}, ${v[1] * a + w[1] * (1 - a)}, ${v[2] * a + w[2] * (1 - a)})`; };
    const uit = [];
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length || !(el.textContent || '').trim()) continue;
      /* ── ALLEEN WAT ER ÉCHT STAAT ──────────────────────────────────────
         `display`/`visibility` op het element zelf is niet genoeg: de inhoud
         van een DICHTE <details> heeft gewoon `display: inline-flex`, staat
         niet in de flat tree, en dan geeft Chromium voor `color` de
         UA-waarde terug in plaats van de berekende. Drie "Mail <klant>"-
         knoppen op /admin/planning kwamen zo als linkblauw op 1,93:1 binnen,
         terwijl ze opengeklapt gewoon 9:1 halen — gecontroleerd door het
         paneel open te zetten. checkVisibility() kent de flat tree wél. */
      if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const c = getComputedStyle(el);
      if (c.visibility === 'hidden' || c.display === 'none') continue;
      /* ── DE GROND IS EEN STAPEL, GEEN KLEUR ────────────────────────────
         Eerste versie pakte de eerste voorouder met een backgroundColor en
         klaar. Op dit paneel is dat vaak `rgba(242,243,245,.10)` — de
         spookknop — en dan rekende hij die 10 % papier tegen WIT af in plaats
         van tegen de zwarte kaart eronder. Uitslag: drie knoppen op 1,00:1 die
         in het echt 9:1 halen. Een veeg die onzin meldt, ga je negeren, en dan
         mist hij de keer dat het wél waar is.

         Nu wordt de hele stapel verzameld tot de eerste ONDOORZICHTIGE grond
         en van onder naar boven over elkaar gelegd. */
      const stapel = [];
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)') continue;
        stapel.push(bg);
        if (Number((bg.match(/[\d.]+/g) || [])[3] ?? 1) >= 1) break;
      }
      let g = 'rgb(255, 255, 255)';
      for (let i = stapel.length - 1; i >= 0; i--) g = meng(stapel[i], g);
      const px = parseFloat(c.fontSize); const vet = Number(c.fontWeight) >= 700;
      const norm = (px >= 24 || (px >= 18.66 && vet)) ? 3 : 4.5;
      const l1 = lum(meng(c.color, g)); const l2 = lum(g);
      const r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (r < norm) uit.push(`${r.toFixed(2)}:1 (eis ${norm}) ${el.tagName}.${String(el.className).slice(0, 24)} — "${(el.textContent || '').trim().slice(0, 28)}" ${Math.round(px)}px ${c.color} op ${g}`);
    }
    return uit;
  }), null, 1));
}
if (process.env.VIS_METEN) {
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.stand')].slice(0, 6).map((e) => {
    const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
    const o = e.parentElement; const oc = getComputedStyle(o);
    return { w: Math.round(r.width), h: Math.round(r.height), disp: c.display, wrap: c.flexWrap, ws: c.whiteSpace, ouder: o.className, ouderDisp: oc.display };
  })), null, 1));
}
const slug = (NACHT ? 'nacht-' : '') + SECTION.replace(/\W+/g, '-').replace(/^-|-$/g, '');
const file = path.join(OUT, `${slug}.png`);
await page.screenshot({ path: file, fullPage: true });
await browser.close();
console.log(`  .render/${path.basename(file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} kB`);
