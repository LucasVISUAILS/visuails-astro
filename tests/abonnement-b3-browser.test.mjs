/*
 * DE ABONNEMENTSPAGINA, DE SALDO-STROOK EN /admin IN DE BROWSER — ronde B (B3), 8 oktober 2026
 *
 * Het gebouwde Studio tegen de echte Worker (tests/lib/studio-worker.mjs, met
 * nepdata), in vijf standen van een abonnee: actief (met tegoed én credits),
 * gepauzeerd, weinig credits, credits die bijna vervallen, en teruggeboekt.
 * Per pagina op 390 en 1280 px, licht en donker:
 *   · geen horizontale scroll;
 *   · elke tekst in de nieuwe blokken ≥ 11,5 px en contrast ≥ 4,5:1;
 *   · de blokken staan er (saldo, bestelknoppen, creditboek, je plan, stand).
 * Plus het Studio-Overzicht (strook "Je saldo") en de klantpagina in /admin.
 * Draai via de wachtrij, na een build:
 *   $S/zwaar.sh node tests/abonnement-b3-browser.test.mjs
 * Schermafdrukken in .render/b3-*.png.
 */
import fs from 'node:fs';
import { metVisIn } from './lib/vis-in.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(78)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const moment = (d) => `${dag(d)} 10:00:00`;
const maand = new Date().toISOString().slice(0, 7);
const begin = `${maand}-01 09:00:00`;
const adminToken = await mintToken();

/* Vijf verzonnen abonnees, elk met een eigen sessie. */
const KLANTEN = {
  actief: { id: 8101, brand: 'VOLTA' },
  pauze: { id: 8102, brand: 'NORDA' },
  weinig: { id: 8103, brand: 'LUMA' },
  bijna: { id: 8104, brand: 'KORA' },
  teruggeboekt: { id: 8105, brand: 'SELVA' },
};
const extraSql = [
  `INSERT INTO admin_users (id, email, password_hash) VALUES (903, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (903, 903, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
];
for (const [stand, k] of Object.entries(KLANTEN)) {
  k.token = `b3-sessie-${stand}-0000000001`;
  extraSql.push(
    `INSERT INTO customers (id, email, name, first_name, brand, phone, country, address_line1, postal_code, city) VALUES (${k.id}, '${stand}@voorbeeld-${stand}.test', 'Proef ${stand}', 'Proef', '${k.brand}', '06 12345678', 'NL', 'Verzonnenstraat 1', '1234 AB', 'Nergenshuizen')`,
    `INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (${k.id}, '${await hashToken(k.token)}', datetime('now'), datetime('now', '+30 days'))`,
  );
}
const sub = (k, status, extra = '') => `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at${extra ? `, ${extra.split('=')[0]}` : ''}) VALUES (${k.id}, ${k.id}, 'SUB-${k.brand}', 'studio', 'monthly', '${status}', '${begin}'${extra ? `, ${extra.split('=').slice(1).join('=')}` : ''})`;
const partij = (k, id, aantal, rest, binnen, vervalt) => `INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
  VALUES (${id}, ${k.id}, ${k.id}, '${moment(binnen)}', ${aantal}, 'termijn', '${dag(binnen).slice(0, 7)}', '${dag(vervalt)}', ${rest}, 'termijn:${k.id}:${id}', 'test')`;
{
  const k = KLANTEN.actief;
  extraSql.push(sub(k, 'active'),
    `INSERT INTO subscription_months (subscription_id, month, granted) VALUES (${k.id}, '${maand}', 12)`,
    partij(k, 81011, 20, 8, -80, 10), partij(k, 81012, 120, 120, -2, 88),
    `INSERT INTO orders (id, ref, customer_id, email, name, brand, service, status, payment_status, credits_used, product_count, total_cents, lang) VALUES (81010, 'VIS-VO81-A1B', ${k.id}, 'actief@voorbeeld-actief.test', 'Proef', 'VOLTA', 'catalog', 'delivered', 'credits', 12, 3, 0, 'nl')`,
    `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, order_id, order_ref, partijen, sleutel, door) VALUES (${k.id}, ${k.id}, '${moment(-1)}', -12, 'bestelling', 81010, 'VIS-VO81-A1B', '[{"id":81011,"n":12}]', 'bestelling:81010', 'klant')`,
    `INSERT INTO customer_style_locks (customer_id, style, background_hex, ratio) VALUES (${k.id}, 'catalog', '#F5F5F5', 'portrait45')`,
    `INSERT INTO customer_style_locks (customer_id, style, look, ratio, roster_model) VALUES (${k.id}, 'lifestyle', 'glow', 'portrait45', 'ava')`,
    `INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${k.id}, 5000, 'annulering')`);
}
{
  const k = KLANTEN.pauze;
  extraSql.push(sub(k, 'paused', `pause_reason='customer'`), `UPDATE subscriptions SET paused_at = '${moment(-10)}', stop_reden = 'credits' WHERE id = ${k.id}`,
    partij(k, 81021, 120, 60, -30, 60));
}
{
  const k = KLANTEN.weinig;
  extraSql.push(sub(k, 'active'), `INSERT INTO subscription_months (subscription_id, month, granted) VALUES (${k.id}, '${maand}', 12)`, partij(k, 81031, 45, 2, -5, 85));
}
{
  const k = KLANTEN.bijna;
  extraSql.push(sub(k, 'active'), `INSERT INTO subscription_months (subscription_id, month, granted) VALUES (${k.id}, '${maand}', 12)`,
    /* Morgen en niet over 3 dagen (12 oktober 2026, spaarplafond): bij een
       lopend abonnement noemt de pagina alleen een datum die vóór de volgende
       termijn (de 1e van volgende maand) valt, en morgen doet dat altijd. */
    partij(k, 81041, 120, 40, -87, 1), partij(k, 81042, 120, 120, -2, 88));
}
{
  const k = KLANTEN.teruggeboekt;
  extraSql.push(sub(k, 'paused', `pause_reason='chargeback'`), `UPDATE subscriptions SET paused_at = '${moment(-1)}' WHERE id = ${k.id}`,
    partij(k, 81051, 120, 80, -3, 87),
    `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, payment_id, partijen, sleutel, door) VALUES (${k.id}, ${k.id}, '${moment(-1)}', -40, 'bevroren', '${maand}', 'tr_x', '[{"id":81051,"n":40}]', 'bevroren:81051:1', 'systeem')`);
}

const studio = await startStudio({ extraSql });
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));
const host = new URL(studio.url).hostname;

/* Alle tekst in de gegeven blokken: maat en contrast (met doorzichtige lagen gemengd). */
const meet = (page, selectors) => page.evaluate((sels) => {
  const parse = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return [255, 255, 255, 1]; const [r, g, b, a = 1] = m.map(Number); return [r, g, b, a]; };
  const mix = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const achtergrond = (el) => {
    const lagen = [];
    for (let n = el; n; n = n.parentElement) { const b = parse(getComputedStyle(n).backgroundColor); if (b[3] > 0) lagen.push(b); if (b[3] >= 1) break; }
    let kleur = [255, 255, 255, 1];
    for (const l of lagen.reverse()) kleur = mix(l, kleur);
    return kleur;
  };
  const fout = [];
  let geteld = 0;
  for (const sel of sels) {
    for (const blok of document.querySelectorAll(sel)) {
      const walker = document.createTreeWalker(blok, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent.trim()) continue;
        const el = t.parentElement;
        if (!el || el.closest('.sr-only, [hidden], details:not([open]) > :not(summary)')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        geteld += 1;
        const bg = achtergrond(el);
        const fg = mix(parse(cs.color), bg);
        const a = lum(fg); const b = lum(bg);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const px = parseFloat(cs.fontSize);
        if (ratio < 4.5 || px < 11.5) fout.push(`${t.textContent.trim().slice(0, 40)} (${px}px, ${ratio.toFixed(2)}:1)`);
      }
    }
  }
  return { geteld, fout: fout.slice(0, 6) };
}, selectors);

const STUDIO_BLOKKEN = ['.st-abo-tabs', '.st-abo-stand', '.st-abo-saldo', '.st-abo-bestel', '.st-boek', '#je-plan', '.st-bespreek', '.ck', '.st-saldostrook', '.st-tabelvlak'];
const ADMIN_BLOKKEN = ['#abonnement'];

try {
  for (const thema of ['licht', 'donker']) {
    for (const breed of [390, 1280]) {
      for (const [stand, k] of Object.entries(KLANTEN)) {
        /* Elke context een eigen adres: sinds de tabs (15 oktober 2026) laadt
           deze toets vier keer zoveel Studio-pagina's, en de paginalimiet
           (PAGE_LIMIT in account.js) telt per adres. */
        const ctx = await browser.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 }, extraHTTPHeaders: { 'CF-Connecting-IP': `10.49.${breed % 250}.${(thema === 'licht' ? 0 : 100) + Object.keys(KLANTEN).indexOf(stand)}` } });
        await ctx.addCookies([
          { name: 'vis_account', value: k.token, domain: host, path: '/' },
          { name: 'vis_lang', value: 'nl', domain: host, path: '/' },
          { name: 'vis_thema', value: thema, domain: host, path: '/' },
        ]);
        const p = await ctx.newPage();
        await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
        await p.goto(`${studio.url}/account/plan`, { waitUntil: 'load' });
        const label = `${stand} ${breed}px ${thema}`;
        if (stand === 'pauze' || stand === 'teruggeboekt') {
          ok(`/account/plan ${label}: de stand staat bovenaan`, await p.evaluate(() => !!document.querySelector('.st-abo-stand')), true);
        }
        if (stand === 'pauze') ok(`/account/plan ${label}: "bespreek je credits" groot in beeld (reden credits)`, await p.evaluate(() => !!document.querySelector('.st-bespreek.is-nadruk')), true);
        if (stand === 'bijna') ok(`/account/plan ${label}: wat bijna vervalt valt op`, await p.evaluate(() => !!document.querySelector('.st-abo-verval.is-bijna')), true);
        /* Vier tabs sinds 15 oktober 2026 (v28-abotabs = a): elke tab gemeten. */
        const WAT = { '': ['.st-abo-tabs', '.st-abo-saldo', '.st-abo-knoppen'], credits: ['.st-boek', '.ck'], facturen: ['#abo-facturen-h'], plan: ['#je-plan'] };
        for (const [tab, moet] of Object.entries(WAT)) {
          if (tab) await p.goto(`${studio.url}/account/plan?tab=${tab}`, { waitUntil: 'load' });
          const naam = tab || 'overzicht';
          ok(`/account/plan ${label} · ${naam}: ${moet.join(', ')}`, await p.evaluate((m) => m.every((s) => !!document.querySelector(s)), moet), true);
          ok(`/account/plan ${label} · ${naam}: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
          const m = await meet(p, STUDIO_BLOKKEN);
          ok(`/account/plan ${label} · ${naam}: ${m.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, m.fout, []);
          await p.screenshot({ path: path.join(OUT, `b3-plan-${stand}-${naam}-${breed}-${thema}.png`), fullPage: true });
        }
        if (stand === 'actief') {
          /* Opzeggen openklappen: het aanbod om te pauzeren, de redenen, de knoppen. */
          await p.click('#opzeggen > summary');
          await p.mouse.move(0, 0);
          await p.waitForTimeout(500); /* knopovergangen (achtergrondkleur) laten uitlopen vóór het meten */
          const o = await meet(p, ['#opzeggen']);
          ok(`opzeggen ${label}: ${o.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, o.fout, []);
          ok(`opzeggen ${label}: eerst het aanbod om te pauzeren`, await p.evaluate(() => !!document.querySelector('#opzeggen .st-stop-aanbod')), true);
          await p.locator('#opzeggen').screenshot({ path: path.join(OUT, `b3-opzeggen-${breed}-${thema}.png`) });
          /* Het Overzicht met de strook "Je saldo". */
          await p.goto(`${studio.url}/account`, { waitUntil: 'load' });
          ok(`Overzicht ${label}: de strook met tegoed én credits`, await p.evaluate(() => document.querySelectorAll('.st-saldostrook .st-saldovak').length), 2);
          ok(`Overzicht ${label}: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
          const s = await meet(p, ['.st-saldostrook']);
          ok(`Overzicht ${label}: ${s.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, s.fout, []);
          await p.locator('.st-saldostrook').screenshot({ path: path.join(OUT, `b3-saldostrook-${breed}-${thema}.png`) });
        }
        await ctx.close();
      }
      /* /admin: de klantpagina met saldo en creditboek. */
      const actx = await browser.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
      await actx.addCookies([
        { name: 'vis_admin', value: adminToken, domain: host, path: '/' },
        { name: 'vis_thema', value: thema, domain: host, path: '/' },
      ]);
      const ap = await actx.newPage();
      for (const stand of ['actief', 'teruggeboekt']) {
        await ap.goto(`${studio.url}/admin/customers/${KLANTEN[stand].id}`, { waitUntil: 'load' });
        const label = `${stand} ${breed}px ${thema}`;
        ok(`/admin klant ${label}: saldo en creditboek in het paneel`, await ap.evaluate(() => { const b = document.querySelector('#abonnement'); return !!b && /Je hebt \d+ credits/.test(b.textContent) && /Creditboek/.test(b.textContent); }), true);
        ok(`/admin klant ${label}: geen horizontale scroll`, await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        const m = await meet(ap, ADMIN_BLOKKEN);
        ok(`/admin klant ${label}: ${m.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, m.fout, []);
        await ap.locator('#abonnement').screenshot({ path: path.join(OUT, `b3-admin-${stand}-${breed}-${thema}.png`) });
      }
      await actx.close();
    }
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
