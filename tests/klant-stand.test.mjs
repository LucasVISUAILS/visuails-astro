/**
 * De klant op de site — 14 oktober 2026, afvinklijst 23 (k-klant).
 *
 * Wat hier vastligt:
 *   1 · elke soort uit nuZin() heeft een korte stand, in beide talen, en "in de
 *       maak" zegt welke stap het is (of dat een aanvraag bij ons ligt);
 *   2 · klantStandVan() kiest dezelfde bestelling als het Studio-overzicht, geeft
 *       nooit een betaalformulier of zip als knop, alleen een geleverde
 *       bestelling wordt een herbestelling, een afgeronde is niet "lopend";
 *   3 · /account/me zonder ?stand=1 is wat hij was; mét geeft hij de stand, en
 *       alleen van deze klant;
 *   4 · de WhatsApp-zin is letterlijk die van Studio;
 *   5 · in dist/: de klantknoppen staan verborgen naast de proef, de
 *       abonnementsknop heeft geen data-vis-in meer, de zwevende knop draagt de
 *       zin. Draai `npm run build` eerst.
 *   6 · in de browser (met een nagebootst /account/me): uitgelogd verandert er
 *       niets; ingelogd staan welkom, herbestelling, credits en de WhatsApp-zin
 *       goed, en een vreemde link in het antwoord wordt niet overgenomen.
 */
import { readFileSync, existsSync } from 'node:fs';
import { metVisIn } from './lib/vis-in.mjs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAND_KORT, standKort, RANG } from '../src/lib/nuzin.js';
import { klantStandVan, accountGet, COPY } from '../src/lib/account.js';
import { KLANT } from '../src/data/klant.js';
import { hashToken } from '../src/lib/token.js';
import { verseDb, d1 } from './lib/d1sqlite.mjs';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const sqlNu = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

console.log('\nVISUAILS — de klant op de site (k-klant)\n');

/* ── 1 · DE KORTE STAND ────────────────────────────────────────────────────── */
console.log('1 · de korte stand');
for (const L of ['nl', 'en']) {
  const mist = RANG.filter((s) => !STAND_KORT[L][s]);
  ok(`${L}: elke soort uit RANG heeft een korte stand`, mist.length === 0, mist.join(', '));
  ok(`${L}: dezelfde sleutels in beide talen`, JSON.stringify(Object.keys(STAND_KORT.nl).sort()) === JSON.stringify(Object.keys(STAND_KORT[L]).sort()));
  ok(`${L}: geen bedragen en geen datums`, !/€|\d/.test(JSON.stringify(STAND_KORT[L])));
}
ok('in de maak zegt de stap: Ontvangen', standKort('inDeMaak', 'nl', { status: 'received', service: 'catalog' }) === 'Ontvangen');
ok('  In productie', standKort('inDeMaak', 'nl', { status: 'in_production', service: 'catalog' }) === 'In productie');
ok('  Wordt nagekeken', standKort('inDeMaak', 'nl', { status: 'human_check', service: 'catalog' }) === 'Wordt nagekeken');
ok('  en bij een aanvraag: die ligt bij ons, er wordt nog niets gemaakt', standKort('inDeMaak', 'nl', { status: 'received', service: 'lifestyle', details_json: '{"request":"eigen look"}' }) === 'Je aanvraag ligt bij ons' && standKort('inDeMaak', 'en', { status: 'received', details_json: { request: 'x' } }) === 'Your request is with us');
ok('een onbekende soort geeft niets', standKort('bestaatniet', 'nl') === '');

/* ── 2 · klantStandVan() ───────────────────────────────────────────────────── */
console.log('\n2 · klantStandVan()');
const vandaagSql = sqlNu(new Date());
const orderRij = (x) => ({
  id: 1, ref: 'VIS-TEST-4001', service: 'catalog', status: 'delivered', tier: 'unattended', product_count: 2, lang: 'nl',
  created_at: '2026-10-01 10:00:00', details_json: JSON.stringify({ background_hex: '#FFFFFF', ratio: "portrait45" }),
  payment_status: 'paid', total_cents: 9800, delivery_mailed_at: vandaagSql, delivered_at: vandaagSql, ...x,
});
const beelden = (orderId, state = 'pending') => [1, 2].map((i) => ({ id: orderId * 10 + i, order_id: orderId, kind: 'delivery', review_state: state, product_key: `p${i}`, shot: 'front', filename: `b${i}.jpg`, r2_key: `k${i}` }));
const kaart = (orders, files = []) => {
  const m = new Map();
  for (const f of files) { if (!m.has(f.order_id)) m.set(f.order_id, []); m.get(f.order_id).push(f); }
  return m;
};
const ROW = { email: 'studio@voorbeeld-volt.nl', name: 'Mara Jansen', first_name: 'Mara', brand: 'VOLT' };
{
  const o = orderRij();
  const s = klantStandVan({ lang: 'nl', row: ROW, orders: [o], filesByOrder: kaart([o], beelden(1)) });
  ok('geleverd met open beelden: "Geleverd, wacht op je goedkeuring"', s.laatste?.stand === 'Geleverd, wacht op je goedkeuring', JSON.stringify(s.laatste));
  ok('  met het kenmerk', s.laatste?.ref === 'VIS-TEST-4001');
  ok('  en "Bekijk je beelden" naar de bestelkaart', s.laatste?.knop?.label === COPY.nl.nuBekijkBeelden && s.laatste?.knop?.href === '/account/orders?order=1#order-1', JSON.stringify(s.laatste?.knop));
  ok('  de herbestelling uit Studio, met achtergrond en verhouding', !!s.herbestel && /^\/nl\/start\/catalog\/\?/.test(s.herbestel.href) && /bg=FFFFFF/.test(s.herbestel.href) && /ratio=portrait45/.test(s.herbestel.href), s.herbestel?.href);
  ok('  lopend: het kenmerk (de revisietijd loopt nog)', s.lopend === 'VIS-TEST-4001');
  ok('  de voornaam, niet het merk (zoals Studio sinds ronde 8)', s.naam === 'Mara');
  const en = klantStandVan({ lang: 'en', row: ROW, orders: [o], filesByOrder: kaart([o], beelden(1)) });
  ok('  in het Engels: "Delivered, waiting for your approval" en /start/ zonder /nl', en.laatste?.stand === 'Delivered, waiting for your approval' && /^\/start\/catalog\//.test(en.herbestel?.href || ''));
}
{
  const o = orderRij({ status: 'received', payment_status: 'unpaid', delivery_mailed_at: null, delivered_at: null });
  const s = klantStandVan({ lang: 'nl', row: ROW, orders: [o], filesByOrder: new Map() });
  ok('onbetaald: "Wacht op je betaling"', s.laatste?.stand === 'Wacht op je betaling');
  ok('  en de knop opent de bestelling: niet blind betalen vanaf de voorpagina', s.laatste?.knop?.href === '/account/orders?order=1#order-1' && s.laatste?.knop?.label === COPY.nl.ovOpenOrder, JSON.stringify(s.laatste?.knop));
  ok('  geen herbestelling (er is niets geleverd)', s.herbestel === null);
  ok('  wel lopend', s.lopend === 'VIS-TEST-4001');
}
{
  const o = orderRij({ closed_at: '2026-10-05 10:00:00' });
  const s = klantStandVan({ lang: 'nl', row: ROW, orders: [o], filesByOrder: kaart([o], beelden(1, 'approved')), feedbackByOrder: new Map([[1, { score: 5 }]]) });
  ok('afgerond: geen download-zip als knop, maar de bestelling', s.laatste?.knop?.href === '/account/orders?order=1#order-1' && !/zip/.test(JSON.stringify(s.laatste)), JSON.stringify(s.laatste));
  ok('  wel een herbestelling', !!s.herbestel);
  ok('  en niets lopends, dus geen kenmerk voor WhatsApp', s.lopend === '');
}
{
  const oud = orderRij({ id: 1, ref: 'VIS-TEST-4001', closed_at: '2026-10-05 10:00:00' });
  const nieuw = orderRij({ id: 2, ref: 'VIS-TEST-4002', status: 'in_production', created_at: '2026-10-10 10:00:00', delivery_mailed_at: null, delivered_at: null });
  const s = klantStandVan({ lang: 'nl', row: ROW, orders: [nieuw, oud], filesByOrder: kaart([], beelden(1, 'approved')), feedbackByOrder: new Map([[1, { score: 5 }]]) });
  ok('twee bestellingen: de lopende staat bovenaan, zoals in Studio', s.laatste?.ref === 'VIS-TEST-4002' && s.laatste?.stand === 'In productie', JSON.stringify(s.laatste));
  ok('  de herbestelling komt uit de geleverde', /bg=FFFFFF/.test(s.herbestel?.href || ''));
  ok('  lopend is de nieuwe', s.lopend === 'VIS-TEST-4002');
}
{
  const o = orderRij({ status: 'cancelled' });
  const s = klantStandVan({ lang: 'nl', row: ROW, orders: [o] });
  ok('geannuleerd: geen herbestelling en niet lopend', s.herbestel === null && s.lopend === '');
}
{
  const s = klantStandVan({ lang: 'nl', row: { email: 'x@voorbeeld.nl' }, orders: [] });
  ok('zonder bestellingen: geen laatste, geen herbestelling, geen naam (geen e-mailadres als groet)', s.laatste === null && s.herbestel === null && s.naam === '');
  const c = klantStandVan({ lang: 'nl', row: ROW, orders: [], abonnee: true, saldo: 48.9 });
  ok('credits: het saldo heel, en of er een abonnement loopt', c.saldo === 48 && c.abonnee === true);
}

/* ── 3 · /account/me ───────────────────────────────────────────────────────── */
console.log('\n3 · /account/me?stand=1');
{
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema: ' + mislukt.join(' | '));
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (1, 'studio@voorbeeld-volt.nl', 'Mara Jansen', 'VOLT')");
  db.exec("INSERT INTO customers (id, email, name, brand) VALUES (2, 'inkoop@voorbeeld-noord.nl', 'Joris Bakker', 'NOORD')");
  db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, email, lang, name, brand, total_cents, vat_cents, vat_rate, payment_status, created_at, details_json, delivery_mailed_at)
    VALUES (1, 'VIS-TEST-5001', 1, 'catalog', 'delivered', 'unattended', 2, 'studio@voorbeeld-volt.nl', 'nl', 'Mara', 'VOLT', 9800, 2058, 0.21, 'paid', '2026-10-01 10:00:00', '{"background_hex":"#FFFFFF","ratio":"portrait45"}', '${vandaagSql}')`);
  db.exec(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES (1, 1, 'delivery', 'k1', 'b1.jpg', 1000, 'pending', 'p1', 'front')`);
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (1, ?, '2099-01-01T00:00:00Z')").run(await hashToken('t-mara'));
  db.prepare("INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (2, ?, '2099-01-01T00:00:00Z')").run(await hashToken('t-joris'));
  const env = { DB: d1(db) };
  const me = async (q, token) => {
    const r = await accountGet({ request: new Request(`https://visuails.com/account/me${q}`, { headers: { cookie: `vis_account=${token}` } }), env, waitUntil() {} });
    return { status: r.status, body: await r.json() };
  };
  const zonder = await me('', 't-mara');
  ok('zonder ?stand=1: geen stand (het formulier betaalt er niet voor)', zonder.status === 200 && !('stand' in zonder.body));
  const met = await me('?stand=1&taal=nl', 't-mara');
  ok('met ?stand=1: de stand van deze klant', met.body.stand?.laatste?.ref === 'VIS-TEST-5001' && met.body.stand?.laatste?.stand === 'Geleverd, wacht op je goedkeuring', JSON.stringify(met.body.stand));
  ok('  en de herbestelling', /^\/nl\/start\/catalog\//.test(met.body.stand?.herbestel?.href || ''));
  ok('  geen bedragen, geen bestandsnamen, geen adres in de stand', !/9800|b1\.jpg|k1|€/.test(JSON.stringify(met.body.stand)));
  const en = await me('?stand=1&taal=en', 't-mara');
  ok('  ?taal=en: in het Engels', en.body.stand?.laatste?.stand === 'Delivered, waiting for your approval');
  const ander = await me('?stand=1&taal=nl', 't-joris');
  ok('een andere klant ziet er niets van', ander.body.stand?.laatste === null && ander.body.stand?.lopend === '' && !/5001/.test(JSON.stringify(ander.body)));
  const uit = await me('?stand=1', 'geen-sessie');
  ok('uitgelogd: 401, zoals altijd', uit.status === 401);
}

/* ── 4 · DE WHATSAPP-ZIN ───────────────────────────────────────────────────── */
console.log('\n4 · de WhatsApp-zin');
{
  const src = lees('src/lib/account.js');
  ok('NL letterlijk de zin van de bestelkaart in Studio', src.includes('`' + KLANT.nl.wa.replace('{ref}', '${o.ref}') + '`'));
  ok('EN letterlijk de zin van de bestelkaart in Studio', src.includes('`' + KLANT.en.wa.replace('{ref}', '${o.ref}') + '`'));
}

/* ── 5 · dist/ ─────────────────────────────────────────────────────────────── */
console.log('\n5 · in de gebouwde pagina’s');
const dist = (p) => { const f = path.join(ROOT, 'dist', p); return existsSync(f) ? readFileSync(f, 'utf8') : ''; };
{
  const thuis = dist('nl/index.html');
  if (!thuis) { ok('dist/ bestaat (npm run build)', false); } else {
    /* 14 oktober 2026, 11:14: de welkomstregel is een melding onderin het scherm
       (KlantMelding.astro), en het label van de opening staat er weer voor iedereen. */
    ok('voorpagina: de melding met de stand staat verborgen in de pagina', /<aside class="h-melding"[^>]*data-vis-klant="melding"[^>]*hidden/.test(thuis));
    ok('  en de proef-melding ook', /<aside class="h-melding h-melding-proef"[^>]*data-vis-proef[^>]*hidden/.test(thuis));
    ok('  zonder naam of kenmerk in de html', !/Welkom terug, [A-Z]|VIS-\d/.test(thuis));
    ok('  het label van de opening staat er voor iedereen', /class="h-pil h-op[^"]*"[^>]*>/.test(thuis) && !/class="h-pil h-op[^"]*"[^>]*data-vis-uit/.test(thuis));
    ok('  de oude welkomstregel bovenin is weg', !/class="h-welkom"/.test(thuis));
    /* 14 oktober 2026 (v26-proefblok a): de abonnementsknop staat niet meer in
       het proefblok, alleen nog in de opening. */
    ok('  de abonnementsknop draagt de creditszin, geen data-vis-in meer', (thuis.match(/data-vis-klant="plan"/g) || []).length === 1 && !/data-vis-in\b/.test(thuis) && thuis.includes('data-vis-credits="Bestel met je credits · {n} over"'));
    ok('  het proefblok draagt een verborgen klantversie', /data-vis-klant="proefblok"/.test(thuis) && /data-vis-proefklant hidden/.test(thuis) && thuis.includes('data-vis-her="Bestel met je look."'));
    ok('  de zwevende WhatsApp-knop draagt de zin', /class="wa-launcher"[^>]*data-vis-wa="Hallo VISUAILS, een vraag over bestelling \{ref\}:"/.test(thuis));
    for (const [pad, soort] of [['nl/how-it-works/index.html', 'herbestel'], ['nl/pricing/index.html', 'herbestel'], ['nl/upload-guidelines/index.html', 'herbestel-of-start'], ['nl/upload-guidelines/index.html', 'start-naast'], ['how-it-works/index.html', 'herbestel']]) {
      const h = dist(pad);
      ok(`${pad}: ${soort} staat verborgen klaar`, new RegExp(`data-vis-klant="${soort}"[^>]*hidden`).test(h));
    }
    const ug = dist('nl/upload-guidelines/index.html');
    ok('/upload-guidelines: de tweede "Start" verdwijnt voor een klant (anders twee keer)', /href="\/nl\/start\/" data-vis-uit/.test(ug));
    const look = dist('nl/lifestyle/street/index.html') || dist('nl/lifestyle/studio/index.html');
    if (look) ok('een lookpagina: de herbestelling staat naast de proef', /data-vis-klant="herbestel"/.test(look));
  }
}

/* ── 6 · DE BROWSER ────────────────────────────────────────────────────────── */
console.log('\n6 · in de browser');
if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) { ok('dist/ bestaat', false); }
else {
  const { chromium } = await import('playwright');
  const { browserPad } = await import('../scripts/lib/browserpad.mjs');
  const DIST = path.join(ROOT, 'dist');
  /* Een vrije poort, gekozen bij het starten (14 oktober 2026). Hier stond een vaste
     poort die drie toetsen deelden; UITROLLEN.bat draait vier toetsen tegelijk, en
     dan viel de tweede om op een bezette poort. */
  let PORT = 0;
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(DIST, p);
    if (!f.startsWith(DIST) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
    const ext = path.extname(f);
    res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png' }[ext] || 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
  const browser = metVisIn(await chromium.launch({ executablePath: browserPad() }));
  const STAND = {
    naam: 'Mara',
    laatste: { ref: 'VIS-2041', stand: 'Geleverd, wacht op je goedkeuring', knop: { label: 'Bekijk je beelden', href: '/account/orders?order=7#order-7' } },
    herbestel: { href: '/nl/start/catalog/?bg=FFFFFF&ratio=portrait45', label: 'Catalog bestellen — Classic · wit · 4:5' },
    lopend: 'VIS-2041', abonnee: true, saldo: 48,
  };
  /* De cookiekeuze staat erin: de melding wacht daar anders op (zie 7). */
  const KEUZE = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-14T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' };
  const bekijk = async (url, antwoord) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.context().addCookies([KEUZE]);
    const vragen = [];
    const fouten = [];
    page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
    await page.route('**/account/me**', (r) => {
      vragen.push(r.request().url());
      return antwoord ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'x', stand: antwoord }) }) : r.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });
    await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.klantstand === 'gezet', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const st = await page.evaluate(() => {
      const zicht = (el) => !!el && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
      const w = document.querySelector('[data-vis-klant="melding"]');
      const plan = [...document.querySelectorAll('[data-vis-klant="plan"]')];
      const her = [...document.querySelectorAll('[data-vis-klant^="herbestel"]')];
      const wa = document.querySelector('.wa-launcher');
      return {
        welkom: !!w && !w.hidden && w.classList.contains('is-open'), kop: w?.querySelector('[data-vis-welkom-kop]')?.textContent, regel: w?.querySelector('[data-vis-welkom-stand]')?.textContent,
        knop: w?.querySelector('[data-vis-welkom-knop]')?.getAttribute('href'), knopLabel: w?.querySelector('[data-vis-welkom-knop]')?.textContent?.trim(),
        plan: plan.map((p) => [zicht(p), p.textContent.trim(), p.getAttribute('href')]),
        start: (() => { const s0 = document.querySelector('[data-vis-klant="start-credits"]'); return s0 ? `${s0.querySelector('[data-vis-label]')?.textContent.trim()} · ${s0.getAttribute('href')}` : ''; })(),
        her: her.map((p) => [p.dataset.visKlant, zicht(p), p.textContent.trim(), p.getAttribute('href')]),
        proef: [...document.querySelectorAll('a.h-knop[href$="/test-sample/"]')].filter((a) => !a.closest('.h-melding')).filter(zicht).length,
        wa: wa?.getAttribute('href'),
      };
    });
    await page.close();
    return { st, vragen, fouten };
  };
  {
    const { st, vragen, fouten } = await bekijk('/nl/', null);
    ok('uitgelogd: geen welkom, geen klantknoppen, de proef staat er', !st.welkom && st.plan.every(([z]) => !z) && st.proef > 0, JSON.stringify(st));
    /* Sinds de melding op bijna elke pagina staat: wie niet is ingelogd, kost
       alleen de vraag die de kop van de site toch al stelt (window.visAccount). */
    ok('  één vraag, die van de kop: de stand wordt niet gevraagd', vragen.length === 1 && !vragen.some((u) => /stand=1/.test(u)), vragen.join(' '));
    ok('  de WhatsApp-zin is de gewone', /text=Hallo%20VISUAILS%2C%20ik%20heb/.test(st.wa || ''), st.wa);
    ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  }
  {
    const { st, fouten } = await bekijk('/nl/', STAND);
    ok('ingelogd: "Welkom terug, Mara"', st.welkom && st.kop === 'Welkom terug, Mara', JSON.stringify(st));
    ok('  "VIS-2041 · Geleverd, wacht op je goedkeuring"', st.regel === 'VIS-2041 · Geleverd, wacht op je goedkeuring', st.regel);
    ok('  de knop "Bekijk je beelden" naar de bestelkaart', st.knop === '/account/orders?order=7#order-7' && st.knopLabel === 'Bekijk je beelden');
    /* 15 oktober 2026: de hoofdknop zegt "Bestel met je credits · 48 over" (naar
       /start), de tweede knop gaat naar het abonnement — niet twee keer /start. */
    ok('  "Je abonnement" naar Studio', st.plan.length === 1 && st.plan.every(([z, t, h]) => z && t === 'Je abonnement' && h === '/account/plan'), JSON.stringify(st.plan));
    ok('  en de hoofdknop "Bestel met je credits · 48 over" naar het beginscherm', st.start === 'Bestel met je credits · 48 over · /nl/start/', st.start);
    ok('  geen proef meer zichtbaar', st.proef === 0);
    ok('  WhatsApp begint met het kenmerk', decodeURIComponent((st.wa || '').split('text=')[1] || '') === 'Hallo VISUAILS, een vraag over bestelling VIS-2041:', st.wa);
    ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  }
  {
    const { st } = await bekijk('/nl/', { ...STAND, abonnee: false, saldo: 0 });
    ok('ingelogd zonder credits: "Sluit een abonnement af" blijft', st.plan.every(([z, t, h]) => z && t === 'Sluit een abonnement af' && h === '/nl/start/plan/'), JSON.stringify(st.plan));
  }
  {
    const { st } = await bekijk('/nl/', { ...STAND, laatste: { ...STAND.laatste, knop: { label: 'Klik', href: 'https://elders.example/x' } }, herbestel: { href: 'javascript:alert(1)', label: 'x' } });
    ok('een vreemde link in het antwoord wordt niet overgenomen', st.knop === '/account', st.knop);
  }
  {
    const { st } = await bekijk('/nl/pricing/', STAND);
    const her = st.her.find(([s]) => s === 'herbestel');
    ok('/pricing ingelogd: "Bestel opnieuw met je look" met de link uit Studio', !!her && her[1] && her[2] === 'Bestel opnieuw met je look' && her[3] === '/nl/start/catalog/?bg=FFFFFF&ratio=portrait45', JSON.stringify(st.her));
    const zonder = await bekijk('/nl/pricing/', { ...STAND, herbestel: null });
    ok('  zonder geleverde bestelling: geen herbestelknop (de Start-knop staat er al)', zonder.st.her.every(([, z]) => !z), JSON.stringify(zonder.st.her));
  }
  {
    const { st } = await bekijk('/nl/upload-guidelines/', STAND);
    const hoofd = st.her.find(([s]) => s === 'herbestel-of-start');
    ok('/upload-guidelines ingelogd: de hoofdknop is de herbestelling', !!hoofd && hoofd[1] && hoofd[2] === 'Bestel opnieuw met je look', JSON.stringify(st.her));
    const zonder = await bekijk('/nl/upload-guidelines/', { ...STAND, herbestel: null });
    const h2 = zonder.st.her.find(([s]) => s === 'herbestel-of-start');
    ok('  zonder: de hoofdknop is "Start een bestelling"', !!h2 && h2[1] && h2[2] === 'Start een bestelling' && h2[3] === '/nl/start/', JSON.stringify(zonder.st.her));
  }

  /* ── 7 · DE MELDING ONDERIN HET SCHERM — 14 oktober 2026 ──────────────────
     Lucas, 11:14 en 11:15: de stand als pop-up die blijft tot je hem wegklikt;
     voor wie niet is ingelogd of nieuw is de proef, die na wegklikken een tijd
     wegblijft (PROEF_WEG_DAGEN); op een telefoon klein en compact. */
  console.log('\n7 · de melding onderin het scherm');
  const { PROEF_WEG_DAGEN, MELDING_SLEUTEL } = await import('../src/data/cookies.js');
  const melding = async (url, antwoord, { keuze = true, opslag = null, breed = 1440, hoog = 900 } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: breed, height: hoog } });
    if (keuze) await ctx.addCookies([KEUZE]);
    if (opslag) await ctx.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem('zet-eenmaal')) { localStorage.setItem(k, v); sessionStorage.setItem('zet-eenmaal', '1'); } } catch {} }, [MELDING_SLEUTEL, JSON.stringify(opslag)]);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
    let stand = antwoord;
    await page.route('**/account/me**', (r) => stand ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'x', stand }) }) : r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.klantstand === 'gezet', null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(250);
    const lees = () => page.evaluate(() => {
      const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
      const m = (sel) => { const el = document.querySelector(sel); return el && !el.hidden && el.classList.contains('is-open') ? el : null; };
      const st = m('.h-melding[data-vis-klant="melding"]');
      const pr = m('.h-melding[data-vis-proef]');
      const open = st || pr;
      const knop = open?.querySelector('.h-melding-knop');
      let notitie = null;
      try { notitie = JSON.parse(localStorage.getItem('vis-melding') || 'null'); } catch {}
      return {
        stand: !!st, proef: !!pr, rect: rect(open), wa: rect(document.querySelector('.wa-launcher')),
        tekst: open?.querySelector('.h-melding-tekst')?.innerText.replace(/\s+/g, ' ').trim(),
        knop: knop ? [knop.getAttribute('href'), knop.textContent.trim(), ...rect(knop).slice(2)] : null,
        sluit: open?.querySelector('[data-vis-melding-sluit]')?.getAttribute('aria-label'),
        notitie, vw: innerWidth, vh: innerHeight,
      };
    });
    return { ctx, page, lees, fouten, zet: (a) => { stand = a; } };
  };
  const scrolNaar = async (page, y) => { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(400); };
  /* Wachten TOT iets er is, en niet een vaste tijd (14 oktober 2026): met vier
     toetsen tegelijk op Lucas' pc (UITROLLEN.bat) was 400 ms soms te kort voor
     een melding die wel kwam. Een melding die NIET mag komen, krijgt de vaste
     tijd: daar maakt wachten de toets alleen strenger. */
  const totDat = async (lees, wil, ms = 8000) => { let m; for (let t = 0; t < ms; t += 150) { m = await lees(); if (wil(m)) return m; await new Promise((r) => setTimeout(r, 150)); } return m; };
  const raakt = (a, b) => !!a && !!b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  {
    const { ctx, page, lees, fouten, zet } = await melding('/nl/', STAND);
    let m = await totDat(lees, (x) => x.stand);
    /* En het inschuiven uit laten lopen, want de maat hieronder leest de plek. */
    await page.evaluate(() => Promise.all([...document.querySelectorAll('.h-melding')].flatMap((e) => e.getAnimations()).map((x) => x.finished.catch(() => {}))));
    m = await lees();
    ok('ingelogd: de melding met de stand staat er meteen', m.stand && !m.proef, JSON.stringify(m));
    ok('  "Welkom terug, Mara · VIS-2041 · Geleverd, wacht op je goedkeuring"', m.tekst === 'Welkom terug, Mara VIS-2041 · Geleverd, wacht op je goedkeuring', m.tekst);
    ok('  de knop "Bekijk je beelden" naar de bestelkaart', m.knop && m.knop[0] === '/account/orders?order=7#order-7' && m.knop[1] === 'Bekijk je beelden', JSON.stringify(m.knop));
    ok('  linksonder, 16 px van de rand, 420 breed', m.rect && m.rect[0] === 16 && m.rect[2] === 420 && m.vh - (m.rect[1] + m.rect[3]) === 16, JSON.stringify(m.rect));
    ok('  en niet over de WhatsApp-knop', !raakt(m.rect, m.wa), JSON.stringify([m.rect, m.wa]));
    ok('  het kruisje heet "Sluit deze melding"', m.sluit === 'Sluit deze melding');
    await scrolNaar(page, 3000);
    ok('  blijft staan als je scrolt', (await lees()).stand);
    await page.click('.h-melding.is-open [data-vis-melding-sluit]');
    await page.waitForTimeout(700);
    m = await lees();
    ok('  het kruisje: weg, en de notitie onthoudt deze bestelling en stand', !m.stand && m.notitie && m.notitie.s === 'VIS-2041|Geleverd, wacht op je goedkeuring', JSON.stringify(m.notitie));
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(300);
    ok('  na herladen blijft hij weg', !(await lees()).stand);
    zet({ ...STAND, laatste: { ...STAND.laatste, stand: 'Afgerond, download je beelden' } });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(300);
    ok('  een nieuwe stand: dan komt hij terug', (await totDat(lees, (x) => x.stand)).stand);
    ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/', STAND, { keuze: false });
    ok('ingelogd zonder cookiekeuze: nog niet (de cookiekaart staat op die plek)', !(await lees()).stand);
    const knop = await page.$('[data-cc-bar] button');
    if (knop) { await knop.click(); await page.waitForTimeout(500); }
    ok('  na de keuze komt hij, zonder te scrollen', !!knop && (await totDat(lees, (x) => x.stand)).stand);
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/', { ...STAND, laatste: null, nieuw: false });
    await scrolNaar(page, 2000);
    const m = await lees();
    ok('ingelogd met bestellingen maar niets bovenaan: geen melding, ook geen proef', !m.stand && !m.proef, JSON.stringify(m));
    await ctx.close();
  }
  {
    const { ctx, page, lees, fouten } = await melding('/nl/', null);
    ok('niet ingelogd: bovenaan nog geen proef (de opening noemt hem al)', !(await lees()).proef);
    const blok = await page.evaluate(() => { const b = document.querySelector('section.h-proef'); return b ? b.getBoundingClientRect().top + scrollY : 0; });
    await scrolNaar(page, Math.max(0, blok - 100));
    ok('  ook niet met het proefblok in beeld', !(await lees()).proef);
    await scrolNaar(page, 1400);
    let m = await totDat(lees, (x) => x.proef);
    ok('  voorbij de opening: "Eerst zien? Eén product voor €1"', m.proef && /^Eerst zien\? Eén product voor €1/.test(m.tekst || ''), JSON.stringify(m));
    ok('  de knop "Probeer VISUAILS · €1" naar /nl/test-sample/', m.knop && m.knop[0] === '/nl/test-sample/' && m.knop[1] === 'Probeer VISUAILS · €1', JSON.stringify(m.knop));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    m = await lees();
    const dagen = m.notitie ? (m.notitie.p - Date.now()) / 86400000 : 0;
    ok(`  Escape sluit hem, en hij blijft ${PROEF_WEG_DAGEN} dagen weg`, !m.proef && Math.abs(dagen - PROEF_WEG_DAGEN) < 0.01, String(dagen));
    await page.reload({ waitUntil: 'networkidle' }); await scrolNaar(page, 1400);
    ok('  na herladen en scrollen: weg', !(await lees()).proef);
    ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/pricing/', null, { opslag: { s: '', p: Date.now() - 1000 } });
    await scrolNaar(page, 1400);
    ok('niet ingelogd, de wegtijd voorbij: de proef komt weer', (await totDat(lees, (x) => x.proef)).proef);
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/pricing/', { naam: 'Mara', laatste: null, herbestel: null, lopend: '', abonnee: false, saldo: 0, nieuw: true });
    await scrolNaar(page, 1400);
    const m = await lees();
    ok('ingelogd en nieuw (nog nooit besteld): de proef', m.proef && !m.stand, JSON.stringify(m));
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/', STAND, { breed: 390, hoog: 844 });
    let m = await lees();
    ok('telefoon: de stand op één rij, klein', m.stand && m.rect[0] === 12 && m.rect[2] === 366 && m.rect[3] <= 96, JSON.stringify(m.rect));
    ok('  het pijltje is 40 × 40 en heet nog "Bekijk je beelden"', m.knop && m.knop[1] === 'Bekijk je beelden' && m.knop[2] === 40 && m.knop[3] === 40, JSON.stringify(m.knop));
    await page.waitForTimeout(500);
    m = await lees();
    ok('  de WhatsApp-knop staat erboven, niet eroverheen', !raakt(m.rect, m.wa) && m.wa[1] + m.wa[3] <= m.rect[1], JSON.stringify([m.rect, m.wa]));
    await ctx.close();
  }
  {
    const { ctx, page, lees } = await melding('/nl/pricing/', null, { breed: 390, hoog: 844 });
    await scrolNaar(page, 1400);
    await page.waitForTimeout(400);
    const m = await lees();
    ok('telefoon: de proef op één rij, zonder beeld en zonder de opsomming', m.proef && m.rect[3] <= 96 && m.tekst === 'Eerst zien? Eén product voor €1', JSON.stringify([m.rect, m.tekst]));
    ok('  en de WhatsApp-knop erboven', !raakt(m.rect, m.wa), JSON.stringify([m.rect, m.wa]));
    await ctx.close();
  }
  {
    /* Speelt er een uitleg terwijl de melding staat, dan plakt de balk met de
       zin erboven en niet erachter (UitlegBalk.astro, hal.css). */
    const { ctx, page, lees } = await melding('/nl/', null, { breed: 390, hoog: 844 });
    const y = await page.evaluate(() => { const e = document.querySelector('.h-hoe'); return e ? e.getBoundingClientRect().top + scrollY + 200 : 0; });
    await scrolNaar(page, y);
    await page.waitForTimeout(1500);
    const m = await lees();
    const balk = await page.evaluate(() => { const b = [...document.querySelectorAll('.u-balk')].find((x) => getComputedStyle(x).position === 'sticky'); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    ok('telefoon: de plakkende uitlegbalk staat boven de melding', m.proef && !!balk && balk[1] + balk[3] <= m.rect[1], JSON.stringify([balk, m.rect]));
    await ctx.close();
  }
  for (const pad of ['/nl/start/', '/nl/test-sample/', '/start/catalog/']) {
    const { ctx, page } = await melding(pad, null);
    ok(`${pad}: geen melding in de pagina`, (await page.$$('.h-melding')).length === 0);
    await ctx.close();
  }
  {
    /* Een zachte navigatie (ClientRouter): de melding staat er op de volgende
       pagina meteen weer, zonder opnieuw in te schuiven. */
    const { ctx, page, lees } = await melding('/nl/', STAND);
    await page.evaluate(() => { const a = document.querySelector('a[href="/nl/pricing/"]'); a?.click(); });
    await page.waitForURL('**/nl/pricing/');
    const m = await totDat(lees, (x) => x.stand, 4000);
    ok('na een zachte navigatie staat hij er meteen weer', m.stand, JSON.stringify(m));
    await ctx.close();
  }

  /* ── 8 · HET PROEFBLOK VOOR EEN KLANT — 14 oktober 2026 ───────────────────
     v26-proefblok a en Lucas' notitie: voor wie al bestelde geen "€1" meer,
     andere tekst en zijn eigen beelden (hij koos zijn eigen levering). */
  console.log('\n8 · het proefblok voor een klant');
  const BEELD = readFileSync(path.join(DIST, 'img', 'ba2-na-achter.webp'));
  const blok = async (url, antwoord) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addCookies([KEUZE]);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
    const beeldVragen = [];
    await page.route('**/account/me**', (r) => antwoord ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'x', stand: antwoord }) }) : r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.route('**/account/files/**', (r) => { beeldVragen.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'image/webp', body: BEELD }); });
    await page.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.klantstand === 'gezet', null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.querySelector('section.h-proef')?.scrollIntoView());
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => {
      const zicht = (el) => !!el && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
      const s = document.querySelector('section.h-proef');
      const woord = s.querySelector('[data-vis-proefwoord]');
      const klant = s.querySelector('[data-vis-proefklant]');
      const deel = zicht(klant) ? klant : woord;
      const knop = deel.querySelector('.h-acties a');
      const imgs = [...s.querySelectorAll('.h-vier img')];
      return {
        klant: zicht(klant), woord: zicht(woord),
        kop: deel.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
        zin: deel.querySelector('.h-proef-zin').textContent.trim(),
        credits: zicht(s.querySelector('[data-vis-proefklant-credits]')) ? s.querySelector('[data-vis-proefklant-credits]').textContent : null,
        knop: knop ? [knop.getAttribute('href'), knop.textContent.trim()] : null,
        studio: zicht(klant) ? klant.querySelector('a[href="/account"]')?.textContent.trim() : null,
        label: s.getAttribute('aria-labelledby'), labelZicht: zicht(document.getElementById(s.getAttribute('aria-labelledby'))),
        beelden: imgs.map((i) => i.getAttribute('src')), bronnen: s.querySelectorAll('.h-vier source').length,
        geladen: imgs.every((i) => i.complete && i.naturalWidth > 0),
        een: zicht(deel.querySelector('.h-een')),
      };
    });
    await ctx.close();
    return { st, fouten, beeldVragen };
  };
  const EIGEN = ['/account/files/11/f', '/account/files/12/f', '/account/files/13/f', '/account/files/14/f'];
  const MET = { ...STAND, herbestel: { ...STAND.herbestel, ref: 'VIS-2041', beelden: EIGEN } };
  {
    const { st, fouten, beeldVragen } = await blok('/nl/', MET);
    ok('klant met levering: de klantversie, niet de proef', st.klant && !st.woord, JSON.stringify(st));
    ok('  "Meer producten? Bestel met je look."', st.kop === 'Meer producten? Bestel met je look.', st.kop);
    ok('  de zin noemt zijn bestelling', st.zin === 'Het formulier opent met de keuzes van VIS-2041. Je voegt alleen de nieuwe producten toe.', st.zin);
    ok('  de knop is de herbestelling uit Studio', st.knop && st.knop[0] === '/nl/start/catalog/?bg=FFFFFF&ratio=portrait45' && st.knop[1] === 'Bestel opnieuw met je look', JSON.stringify(st.knop));
    ok('  en de tweede gaat naar Studio', st.studio === 'Naar VISUAILS Studio', st.studio);
    ok('  geen €1 meer', !st.een);
    ok('  de credits als regel: "Je hebt nog 48 credits."', st.credits === 'Je hebt nog 48 credits.', st.credits);
    ok('  zijn eigen vier beelden, zonder de AVIF van het voorbeeld', JSON.stringify(st.beelden) === JSON.stringify(EIGEN) && st.bronnen === 0 && st.geladen && JSON.stringify([...new Set(beeldVragen.map((u) => new URL(u).pathname))].sort()) === JSON.stringify(EIGEN), JSON.stringify([st.beelden, st.bronnen, beeldVragen.length]));
    ok('  de sectie heet naar de kop die je ziet', st.label === 'h-proef-klant' && st.labelZicht, `${st.label} ${st.labelZicht}`);
    ok('  geen scriptfout', fouten.length === 0, fouten.join(' | '));
  }
  {
    const { st } = await blok('/nl/', { ...MET, saldo: 0, abonnee: false });
    ok('zonder credits: geen creditsregel', st.klant && st.credits === null, JSON.stringify(st.credits));
  }
  {
    const { st } = await blok('/nl/', { ...MET, herbestel: { ...MET.herbestel, beelden: EIGEN.slice(0, 2) } });
    ok('minder dan vier eigen beelden: het voorbeeld blijft staan', st.klant && st.beelden.every((b) => /ba2-na/.test(b)), JSON.stringify(st.beelden));
  }
  {
    const { st } = await blok('/nl/', { ...MET, herbestel: { ...MET.herbestel, beelden: ['https://elders.example/a.jpg', ...EIGEN.slice(1)] } });
    ok('een vreemde beeldlink: het voorbeeld blijft staan', st.beelden.every((b) => /ba2-na/.test(b)), JSON.stringify(st.beelden));
  }
  {
    const { st } = await blok('/nl/', { ...STAND, herbestel: null });
    ok('klant zonder levering: "Meer producten? Start je volgende bestelling."', st.klant && st.kop === 'Meer producten? Start je volgende bestelling.', st.kop);
    ok('  met de knop "Start een bestelling" en het voorbeeld', st.knop && st.knop[0] === '/nl/start/' && st.knop[1] === 'Start een bestelling' && st.beelden.every((b) => /ba2-na/.test(b)), JSON.stringify([st.knop, st.beelden]));
  }
  {
    const { st } = await blok('/nl/', { naam: 'Mara', laatste: null, herbestel: null, lopend: '', abonnee: false, saldo: 0, nieuw: true });
    ok('nieuw account (nog nooit besteld): de proef, met de proefknop', st.woord && !st.klant && st.een && st.knop && /\/nl\/test-sample\/$/.test(st.knop[0]), JSON.stringify(st));
  }
  {
    const { st } = await blok('/nl/', null);
    ok('niet ingelogd: de proef', st.woord && !st.klant && st.een && st.label === 'h-proef', JSON.stringify(st));
  }
  {
    const { st } = await blok('/how-it-works/', { ...MET, laatste: { ...MET.laatste, stand: 'Delivered, waiting for your approval' } });
    ok('EN: "More products? Order in your look."', st.kop === 'More products? Order in your look.' && st.knop && st.knop[1] === 'Order again in your look', JSON.stringify([st.kop, st.knop]));
  }
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
