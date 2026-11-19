/* VISUAILS — levering 119 (18 november 2026), herstel na het naspelen (N5 → hersteller H10).
 *
 *   node tests/levering-119-herstel.test.mjs     (geen build: echte functies met een SQLite-D1, een vm, en de bron)
 *
 *   L-04    het controlescherm leest het bericht uit de <textarea>;
 *   P1-13   de WhatsApp-knop meet opnieuw na een overgang, een animatie en na het scrollen;
 *   P10-02  de studiomail "Nieuwe bestelling": "Per product" en "Wat ontbreekt" breken lange namen;
 *   D1-07   de maatregels voor de vijf koppen op 320 – 374 px;
 *   P6-26   proefKnoppenStand ook voor de voetlink, het telefoonmenu en de knop in de €1-melding;
 *   D1-13   het Studiobrief-veld even breed als de knop als ze onder elkaar staan;
 *   video   de video-intake noemt geen optieprijzen zolang video op aanvraag is;
 *   W2-12   de aanvraagmail aan de klant geeft geen vrije tekst en geen links terug (o04); de melding aan Lucas wel;
 *   W1-11   "Testklanten weer gewoon tonen" maakt hidden_at leeg voor precies de bestellingen die het opruimen verborg;
 *   P3-07   /api/capacity: "Toch open" geldt meteen, ook als dezelfde vraag nog in de randcache stond.
 * De metingen in de browser (regels, breedtes, de knop stilstaand) doet levering-119-herstel-browser (na een build).
 * Verzonnen namen en adressen (Teststraat 1, 1234 AB Teststad); niets hiervan bestaat.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const functie = (bron, naam) => { const i = bron.indexOf(`function ${naam}(`); return i < 0 ? '' : bron.slice(i, bron.indexOf('\n}\n', i) + 2); };
const stil = () => { const l = console.log, e = console.error, w = console.warn; console.log = console.error = console.warn = () => {}; return () => { console.log = l; console.error = e; console.warn = w; }; };

const pipe = lees('src/scripts/pipeline.js');
const inter = lees('src/scripts/interactions.js');

/* ── L-04 ── */
console.log('\nL-04 · "Je bericht" op het controlescherm');
{
  const som = functie(pipe, 'renderSummary');
  const stuk = som.slice(som.indexOf('const berichtVeld'), som.indexOf("if (bericht) rows.push"));
  ok('renderSummary leest textarea[name="message"], niet value() (die zoekt alleen een <input>)', !!stuk && !/value\('message'\)/.test(som));
  const ctx = { q: (s) => (s === 'textarea[name="message"]' ? { value: '  Graag snel.\nTweede regel  ' } : null) };
  vm.createContext(ctx);
  vm.runInContext(`${stuk}; this.uit = bericht;`, ctx);
  ok('met een textarea: het bericht met zijn regels', ctx.uit === 'Graag snel.\nTweede regel', JSON.stringify(ctx.uit));
  ok('het formulier heeft een <textarea name="message">', /<textarea[^>]*name="message"/.test(lees('src/components/order/OrderFlow.astro')));
}

/* ── P1-13 ── */
console.log('\nP1-13 · de WhatsApp-knop meet opnieuw');
{
  const dock = functie(inter, 'initWaDock');
  ok('na een overgang en een animatie op de pagina', /addEventListener\('transitionend', plan, true\)/.test(dock) && /addEventListener\('animationend', plan, true\)/.test(dock));
  ok('ook tekst die buiten zijn ouder staat (elementsFromPoint op zestien punten, tekstOpPunten)', /\|\| tekstOpPunten\(\{ left: x0 - 4, top: y0 - 4, right: x0 \+ w \+ 4, bottom: y0 \+ h \+ 4 \}, dock\)/.test(dock) && /document\.elementsFromPoint\(x, y\)/.test(functie(inter, 'tekstOpPunten')));
  ok('na scroll, wieltje en vegen nog vier keer (0,25 · 0,7 · 1,5 · 3 s)', /\[250, 700, 1500, 3000\]\.map\(\(ms\) => setTimeout\(plan, ms\)\)/.test(dock) && ['scroll', 'wheel', 'touchend'].every((t) => dock.includes(`addEventListener('${t}', naMeten`)));
}

/* ── P6-26 ── */
console.log('\nP6-26 · de proefknoppen bij een dichte proef');
{
  const tekst = (t) => ({ nodeType: 3, textContent: t });
  const el = (kind, extra = {}) => ({ nodeType: 1, dataset: {}, childNodes: kind, matches: () => false, ...extra });
  const voet = el([tekst('Probeer VISUAILS · €1')]);
  const melding = el([el([tekst('Probeer VISUAILS · €1')]), el([tekst('pijl')], { matches: (s) => s.includes('svg') })]);
  const menu = el([tekst('Probeer VISUAILS · €1')]);
  const kiezers = [];
  const ctx = {
    document: { querySelectorAll: (s) => { kiezers.push(s); return s === 'a[data-vis-uit][href*="test-sample"]' ? [] : [voet, melding, menu]; } },
    I18N: { nl: { proefWacht: 'Proef {bedrag} · op de wachtlijst', proefWachtKaal: 'Proef · op de wachtlijst' } },
    pageLang: () => 'nl', sessionStorage: { getItem: () => null, setItem() {} }, Date, JSON,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ stand: 'dicht' }) }),
  };
  vm.createContext(ctx);
  vm.runInContext(`const PROEF_STAND_SLEUTEL = 'vis-proef-stand'; ${functie(inter, 'proefKnoppenStand')}; proefKnoppenStand();`, ctx);
  await new Promise((r) => setTimeout(r, 20));
  ok('zoekt ook [data-vis-uit] a (voet, menu) en .h-melding-proef a', kiezers.some((s) => s.includes('[data-vis-uit] a[href*="test-sample"]') && s.includes('.h-melding-proef a[href*="test-sample"]')));
  ok('de voetlink: "Proef €1 · op de wachtlijst"', voet.childNodes[0].textContent === 'Proef €1 · op de wachtlijst', voet.childNodes[0].textContent);
  ok('de knop in de melding: de tekst in zijn <span>, het ikoon blijft', melding.childNodes[0].childNodes[0].textContent === 'Proef €1 · op de wachtlijst' && melding.childNodes[1].childNodes[0].textContent === 'pijl');
  ok('het telefoonmenu ook', menu.childNodes[0].textContent === 'Proef €1 · op de wachtlijst');
}

/* ── D1-07 en D1-13 ── */
console.log('\nD1-07 · de vijf koppen · D1-13 · het Studiobrief-veld');
{
  const hal = lees('src/styles/hal.css');
  const blok = hal.slice(hal.indexOf('proefronde D1-07, hersteller H10'));
  for (const [sel, k] of [['h-ab', '11.35'], ['h-ed', '11.95'], ['h-hk', '11.5'], ['h-ug', '11.65']]) {
    ok(`.${sel} h1: kolom (100vw − 40 px) / ${k}, nooit groter dan de oude maat`, blok.includes(`.h-pagina.${sel}:not(.h-voor) .h-kop.h-h1 { font-size: max(18px, min(44px, 7.4vw, calc((100vw - 40px) / ${k}))); }`) && blok.includes(`.h-pagina.${sel}:not(.h-voor) .h-kop.h-h1 { font-size: max(18px, min(26px, calc((100vw - 40px) / ${k}))); }`));
  }
  ok('#m8-kop (EN): (100vw − 40 px) / 8,2, hoogstens 40', /html\[lang="en"\] body\.hal \.h-voor #m8-kop\.sk-kop\.h-kop \{ font-size: max\(18px, min\(40px, calc\(\(100vw - 40px\) \/ 8\.2\)\)\); \}/.test(blok));
  ok('alleen tot 374 px (daarboven verandert niets)', /@media \(max-width: 374px\)/.test(blok));
  const sb = lees('src/components/Studiobrief.astro');
  const tablet = sb.slice(sb.indexOf('@media (min-width: 761px) and (max-width: 1000px)'));
  ok('Studiobrief 761 – 1000 en ≤ 420: veld en knop 100 % en uitgerekt', (tablet.match(/\.sb-veld input, \.sb-veld button \{ width: 100%; align-self: stretch; box-sizing: border-box; \}/g) || []).length === 2 && (tablet.match(/align-items: stretch/g) || []).length === 2);
}

/* ── video op aanvraag ── */
console.log('\nBesluit Lucas · geen optieprijzen in de video-intake');
{
  const om = lees('src/pages/account/op-maat.astro');
  const video = om.slice(om.indexOf("{dienst === 'video' && ("), om.indexOf('<section class="om-blok" id="om-smaak">'));
  const kaal = video.split('\n').filter((r) => /€/.test(r) && !/videoOpAanvraag|vPrijs\(|VIDEO_OP_AANVRAAG \?/.test(r));
  ok('elke regel met € in "Je video" hangt aan videoOpAanvraag, VIDEO_OP_AANVRAAG of vPrijs()', video.length > 1000 && !kaal.length, kaal.map((r) => r.trim().slice(0, 80)).join(' | '));
  ok('vPrijs() en camPrijs() geven niets bij video op aanvraag', /const vPrijs = \(tekst: string\) => \(videoOpAanvraag \? '' : tekst\);/.test(om) && /const camPrijs = \(g: string\) => \(!videoOpAanvraag && /.test(om));
  ok('"Het idee" bij video: zonder bedrag als het op aanvraag is', /videoOpAanvraag \? L\('Wij schrijven het uit tot een shotlijst'/.test(om) && /videoOpAanvraag \? L\('Wij maken de shotlijst'/.test(om));
}

/* ── W2-12 en P10-02: de echte /api/order ── */
const mails = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments')) return json({ id: 'tr_h10', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_h10' } } }, 201);
  if (u.includes('resend')) { try { mails.push(JSON.parse(String(opts.body))); } catch { /* geen json */ } }
  return json({ id: 'msg_test' });
};
const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0, mislukt.slice(0, 1).join(''));
const env = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test',
  FROM_EMAIL: 'VISUAILS <orders@voorbeeld.test>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db), PORTAL_SALT: 'zout',
  UPLOADS: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; }, async list() { return { objects: [] }; } },
};
const { onRequestPost: bestelPost } = await import('../functions/api/order.js');
let ip = 1;
async function bestel(velden) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) if (v !== undefined) fd.append(k, v);
  const terug = stil();
  try { return await (await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': `10.119.10.${ip++}` } }), env, waitUntil: () => {} })).json().catch(() => ({})); } finally { terug(); }
}
const naar = (adres) => (m) => (Array.isArray(m.to) ? m.to.includes(adres) : String(m.to) === adres);

console.log('\nW2-12 · de aanvraagmail aan de klant: alleen vaste keuzes (o04)');
{
  const adres = 'aanvraag-h10@voorbeeld.test';
  await bestel({
    service: 'custom', request: 'custom-look', first_name: 'Testa', last_name: 'Proef', brand: 'PROEFMERK', email: adres,
    phone: '+31 6 12345678', country: 'NL', lang: 'nl', mode: 'json',
    look_concept: 'us', look_service: 'both', look_world: 'Koop nu goedkoop bij spam.example', look_references: 'https://spam.example/a',
    look_avoid: 'Studio-wit', look_products: 'https://spam.example/b', look_when: 'month', message: 'Klik hier: https://spam.example/c',
  });
  const k = mails.filter(naar(adres)).pop();
  const s = mails.filter(naar('studio@voorbeeld.test')).pop();
  const kh = k?.html || '';
  ok('er is een klantmail en een melding', !!k && !!s, `${k?.subject} | ${s?.subject}`);
  ok('klant: "Wat je ons vroeg" met de keuzes uit de lijsten', /Wat je ons vroeg/.test(kh) && /Bedenk het voor ons/.test(kh) && /Allebei/.test(kh) && /Binnen een maand/.test(kh));
  ok('  zonder de wereld, de referenties, "nooit" en het bericht', !/spam\.example|Studio-wit|Koop nu|Klik hier/.test(kh), (kh.match(/.{40}spam\.example.{20}/) || [''])[0]);
  ok('  een waarde die niet in de lijst staat komt niet terug ("Ongeveer hoeveel producten")', !/Ongeveer hoeveel producten/.test(kh));
  ok('melding aan Lucas: alles staat erin', /spam\.example\/a/.test(s?.html || '') && /Koop nu goedkoop/.test(s?.html || '') && /Klik hier/.test(s?.html || ''));
  const { aanvraagBriefRegels } = await import('../src/lib/aanvraagBrief.js');
  const r = aanvraagBriefRegels({ style: 'Koop https://x', clips: '3 en https://x', voor: 'spam', look_when: 'asap' }, 'en', { stijlNaam: () => '' });
  ok('aanvraagBriefRegels: geen getypte stijl, geen tekst als aantal clips, geen "waarvoor"', JSON.stringify(r) === JSON.stringify([['First set needed', 'As soon as it is ready']]), JSON.stringify(r));
  ok('  een bekende stijl en een aantal wel', JSON.stringify(aanvraagBriefRegels({ style: 'reveal', clips: '4' }, 'nl', { stijlNaam: () => 'Reveal' })) === JSON.stringify([['Soort video', 'Reveal'], ['Hoeveel clips', '4']]));
}

console.log('\nP10-02 · de studiomail "Nieuwe bestelling" met een naam van 80 tekens');
{
  const lang = 'TESTX'.repeat(16);
  await bestel({
    service: 'catalog', products: '2', first_name: 'Testa', last_name: 'Proef', brand: 'PROEFMERK', email: 'lang-h10@voorbeeld.test', phone: '+31 6 12345678',
    country: 'NL', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', style: 'classic', background: 'studio-white',
    business_version: 'v1', no_vat_number: '1', reg_number: '12345678', product_p1: lang, product_p2: 'Product 2', mode: 'json',
  });
  const s = mails.filter((m) => naar('studio@voorbeeld.test')(m) && /Nieuwe bestelling/.test(m.subject || '')).pop();
  const h = s?.html || '';
  const i = h.indexOf('>Per product</h3>');
  const p = i < 0 ? '' : h.slice(i, h.indexOf('</p>', i));
  ok('de melding heeft "Per product" met de lange naam', !!p && p.includes(lang), (s?.subject || 'geen melding'));
  ok('  die <p> breekt (word-break en overflow-wrap)', /<p style="[^"]*word-break:break-word;overflow-wrap:anywhere"/.test(p));
  ok('  ook een vlak ("Wat ontbreekt") breekt', /const vlak = [\s\S]{0,200}border-radius:12px;word-break:break-word;overflow-wrap:anywhere/.test(lees('functions/api/order.js')));
}

/* ── W1-11 ── */
console.log('\nW1-11 · testklanten opruimen en weer tonen');
{
  const { adminPost } = await import('../src/lib/admin.js');
  db.exec(`
    INSERT INTO customers (id, email, name, first_name, brand, country) VALUES
      (910, 'echt-h10@voorbeeld.test', 'Echte Klant', 'Echte', 'ECHTMERK', 'NL'),
      (911, 'test-h10@voorbeeld.test', 'Proef Een', 'Proef', 'PROEFHUIS', 'NL');
    INSERT INTO admin_users (id, email, password_hash) VALUES (91, 'studio-h10@voorbeeld.test', 'x');
  `);
  const o = (id, cid, extra) => db.prepare(`INSERT INTO orders (id, ref, customer_id, status, lang, service, product_count, tier, details_json, total_cents, vat_cents, email, name, payment_status, testmodus, hidden_at)
    VALUES (?, ?, ?, 'delivered', 'nl', 'catalog', 1, 'unattended', '{}', 9000, 1890, 'x@voorbeeld.test', 'X', ?, ?, ?)`).run(id, `VIS-H10-${id}`, cid, extra.betaald || 'paid', extra.test ? 1 : 0, extra.verborgen || null);
  o(9101, 910, {});
  o(9102, 910, { verborgen: '2026-11-01 10:00:00' });             // echte klant, door Lucas zelf verborgen
  o(9111, 911, { test: 1 });
  o(9112, 911, { test: 1 });
  o(9113, 911, { test: 1, verborgen: '2026-11-02 11:00:00' });   // testklant, al eerder door Lucas verborgen
  const token = await mintToken();
  db.prepare("INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (91, 91, ?, '2099-01-01T00:00:00Z')").run(await hashToken(token));
  const headers = { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' };
  const post = async (actie) => { const fd = new FormData(); fd.set('actie', actie); const t = stil(); try { return await adminPost({ request: new Request('https://visuails.com/admin/customers/test-opruimen', { method: 'POST', body: fd, headers }), env, waitUntil() {} }); } finally { t(); } };
  const verborgen = () => db.prepare('SELECT id FROM orders WHERE id BETWEEN 9100 AND 9120 AND hidden_at IS NOT NULL ORDER BY id').all().map((r) => r.id).join(',');
  await post('opruimen');
  ok('opruimen verbergt 9111 en 9112 (9102 en 9113 waren al verborgen)', verborgen() === '9102,9111,9112,9113', verborgen());
  const teken = db.prepare("SELECT value FROM app_settings WHERE key = 'klanten_test_verborgen'").get()?.value;
  ok('  met één merkteken (tot op de milliseconde), ook in app_settings', /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/.test(teken || '') && Number(telling(db, `SELECT COUNT(*) FROM orders WHERE id IN (9111, 9112) AND hidden_at = '${teken}'`)) === 2, teken);
  o(9114, 911, { test: 1 });
  await post('opruimen');
  ok('  nog eens opruimen (een nieuwe testbestelling) gebruikt hetzelfde merkteken', Number(telling(db, `SELECT COUNT(*) FROM orders WHERE id IN (9111, 9112, 9114) AND hidden_at = '${teken}'`)) === 3);
  await post('tonen');
  ok('weer gewoon tonen: 9111, 9112 en 9114 weer zichtbaar; 9102 en 9113 (door Lucas verborgen) blijven verborgen', verborgen() === '9102,9113', verborgen());
  ok('  de instelling is weg', !db.prepare("SELECT value FROM app_settings WHERE key = 'klanten_test_verborgen'").get());
  const log = JSON.stringify(db.prepare("SELECT * FROM admin_log WHERE action = 'customer.test.tonen'").all());
  ok('  het logboek noemt hoeveel er terugkwamen', /\d+ bestelling\(en\) weer zichtbaar/.test(log), log.slice(0, 200));
}

/* ── P3-07 ── */
console.log('\nP3-07 · "Toch open" geldt meteen in /api/capacity (ook met de randcache)');
{
  const echtNu = Date.now;
  Date.now = () => Date.parse('2026-11-18T10:00:00Z');
  const bewaard = new Map();
  globalThis.caches = { default: {
    async match(req) { const r = bewaard.get(req.url); return r ? r.clone() : undefined; },
    async put(req, res) { bewaard.set(req.url, res.clone()); },
  } };
  try {
    const { onRequestGet } = await import('../functions/api/capacity.js');
    const { zetFeestdagOpen } = await import('../src/lib/agenda.js');
    const vraag = async () => {
      const r = await onRequestGet({ request: new Request('https://visuails.com/api/capacity?products=12&tier=attended&service=catalog&from=2026-12-23'), env, waitUntil: () => {} });
      return [...new Set(((await r.json()).windows || []).flatMap((w) => w.days))];
    };
    const dicht = await vraag();
    ok('dicht: 25 en 26 december komen niet voor', dicht.length > 0 && !dicht.includes('2026-12-25') && !dicht.includes('2026-12-26'), dicht.join(' '));
    ok('  het antwoord staat in de randcache', bewaard.size >= 1);
    await zetFeestdagOpen(env, '2026-12-25', true, '2026-11-18');
    await zetFeestdagOpen(env, '2026-12-26', true, '2026-11-18');
    const open = await vraag();
    ok('meteen na "Toch open" (zelfde vraag, binnen de minuut): 25 en 26 december wel', open.includes('2026-12-25') && open.includes('2026-12-26'), open.join(' '));
    await zetFeestdagOpen(env, '2026-12-25', false, '2026-11-18');
    await zetFeestdagOpen(env, '2026-12-26', false, '2026-11-18');
    const weer = await vraag();
    ok('en na "Weer dicht" meteen weer dicht', JSON.stringify(weer) === JSON.stringify(dicht), weer.join(' '));
  } finally {
    Date.now = echtNu;
    delete globalThis.caches;
  }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
