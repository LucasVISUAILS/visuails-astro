/**
 * Afvinklijst 31 (levering 52), in een browser.
 *
 *   npm run build && node tests/abo-qa-52-browser.test.mjs
 *
 *   M · een bezoeker zonder account vraagt /account/me niet meer (geen 401 in de
 *       console); met vis_in en een sessie wel; een achtergebleven vis_in wordt
 *       na één 401 weggehaald.
 *   A · /admin/abonnees en de klantpagina: leesbaar (contrast ≥ 4,5:1, tekst
 *       ≥ 11,5 px) en niet breder dan het scherm, op 1440 en 390.
 */
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { hashToken } from '../src/lib/token.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

console.log('\nVISUAILS — afvinklijst 31 in een browser\n');
const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const adminToken = 'q52b-admin-sessie-00000000000000000001';
const extraSql = [
  `INSERT INTO admin_users (id, email, password_hash) VALUES (952, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (952, 952, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
  `INSERT INTO customers (id, email, name, first_name, brand, phone, country, address_line1, postal_code, city) VALUES (9521, 'stil@voorbeeld-stil.test', 'Proef Stil', 'Proef', 'STILTE', '06 12345678', 'NL', 'Verzonnenstraat 1', '1234 AB', 'Nergenshuizen')`,
  `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at, paused_at, pause_reason, mollie_customer_id, mollie_mandate_id) VALUES (9521, 9521, 'SUB-STILTE', 'studio', 'monthly', 'paused', '${dag(-30)} 09:00:00', '${dag(-2)} 09:00:00', 'chargeback', 'cst_stil', 'mdt_stil')`,
  `INSERT INTO subscription_payments (subscription_id, external_id, status, amount_cents, month) VALUES (9521, 'tr_stil1', 'paid', 95590, '${dag(-30).slice(0, 7)}')`,
  `INSERT INTO admin_log (admin_id, admin_email, action, customer_id, detail) VALUES (NULL, NULL, 'plan.chargeback', 9521, 'SUB-STILTE: tr_stil1 95590 cent teruggeboekt')`,
];
const studio = await startStudio({ extraSql });
const host = new URL(studio.url).hostname;
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
try {
  /* ── M · /account/me ─────────────────────────────────────────────────── */
  console.log('M · /account/me alleen als er iemand is ingelogd');
  const bezoek = async (cookies, pad = '/nl/') => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (cookies.length) await ctx.addCookies(cookies.map(([name, value]) => ({ name, value, domain: host, path: '/' })));
    const p = await ctx.newPage();
    await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
    const vragen = [];
    const fouten = [];
    p.on('response', (r) => { if (new URL(r.url()).pathname === '/account/me') vragen.push(r.status()); });
    p.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
    await p.goto(`${studio.url}${pad}`, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const inBalk = await p.evaluate(() => [...document.querySelectorAll('[data-acct="in"]')].some((e) => !e.hidden));
    const koek = await p.evaluate(() => document.cookie);
    await ctx.close();
    return { vragen, fouten: fouten.filter((f) => /401|account\/me/.test(f)), inBalk, koek };
  };
  let b = await bezoek([['vis_consent', 'necessary']]);
  ok('een bezoeker zonder account: geen enkele vraag naar /account/me', b.vragen, []);
  ok('  en geen 401 in de console', b.fouten, []);
  b = await bezoek([['vis_consent', 'necessary']], '/nl/start/plan/');
  ok('  ook niet op /start/plan (het formulier vult niets in)', b.vragen, []);
  b = await bezoek([['vis_consent', 'necessary'], ['vis_in', '1']]);
  ok('een achtergebleven vis_in zonder sessie: één vraag, 401', b.vragen, [401]);
  ok('  daarna is vis_in weg', /vis_in=1/.test(b.koek), false);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([
    { name: 'vis_consent', value: 'necessary', domain: host, path: '/' },
    { name: 'vis_in', value: '1', domain: host, path: '/' },
    { name: 'vis_account', value: VOLT.token, domain: host, path: '/account' },
  ]);
  const p = await ctx.newPage();
  await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  const vragen = [];
  p.on('response', (r) => { if (new URL(r.url()).pathname === '/account/me') vragen.push(r.status()); });
  await p.goto(`${studio.url}/nl/`, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  ok('ingelogd (vis_in en een sessie): /account/me antwoordt 200', vragen.length > 0 && vragen.every((s) => s === 200), true);
  ok('  en de balk staat op ingelogd', await p.evaluate(() => [...document.querySelectorAll('[data-acct="in"]')].some((e) => !e.hidden)), true);
  await ctx.close();
  const s2 = await browser.newContext();
  await s2.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/account' }]);
  const sp = await s2.newPage();
  const antw = await sp.goto(`${studio.url}/account`, { waitUntil: 'load' });
  ok('een sessie van vóór vandaag (zonder vis_in) krijgt hem in Studio', /vis_in=1/.test((await antw.allHeaders())['set-cookie'] || ''), true);
  await s2.close();

  /* ── A · /admin/abonnees en de klantpagina ─────────────────────────────── */
  console.log('\nA · Abonnees: leesbaar en binnen het scherm');
  const meet = (page, selectors) => page.evaluate((sels) => {
    const parse = (c) => { const m = String(c).match(/[\d.]+/g); if (!m) return [255, 255, 255, 1]; const [r, g, b2, a = 1] = m.map(Number); return [r, g, b2, a]; };
    const mix = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
    const lum = ([r, g, b2]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2); };
    const achter = (el) => { const lagen = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0) lagen.push(c); if (c[3] >= 1) break; } let k = [255, 255, 255, 1]; for (const l of lagen.reverse()) k = mix(l, k); return k; };
    const uit = [];
    for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
      if (!el.textContent.trim() || !el.getClientRects().length) continue;
      const cs = getComputedStyle(el);
      const kl = mix(parse(cs.color), achter(el));
      const [l1, l2] = [lum(kl), lum(achter(el))].sort((x, y) => y - x);
      uit.push({ sel, px: parseFloat(cs.fontSize), c: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100, t: el.textContent.trim().slice(0, 30) });
    }
    return uit;
  }, selectors);
  for (const [breed, pad] of [[1440, '/admin/abonnees'], [390, '/admin/abonnees'], [1440, '/admin/customers/9521']]) {
    const actx = await browser.newContext({ viewport: { width: breed, height: 900 } });
    await actx.addCookies([{ name: 'vis_admin', value: adminToken, domain: host, path: '/admin' }]);
    const ap = await actx.newPage();
    const r = await ap.goto(`${studio.url}${pad}`, { waitUntil: 'load' });
    ok(`${breed} ${pad}: de pagina laadt`, r.status(), 200);
    const m = await meet(ap, ['.abo-telling span', '.abo-signaal', '.abo-lijst td', '.weer-lopen .warnline', '.weer-lopen .check', '#abonnement .files td']);
    ok(`${breed} ${pad}: alle tekst ≥ 11,5 px en ≥ 4,5:1 (${m.length} gemeten)`, m.filter((x) => x.px < 11.5 || x.c < 4.5).map((x) => `${x.sel} ${x.px}px ${x.c}:1 "${x.t}"`), []);
    ok(`${breed} ${pad}: niet breder dan het scherm`, await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    if (pad === '/admin/abonnees') ok(`${breed}: de stilgezette staat bovenaan, met "Terugboeking: de incasso is gestopt"`, await ap.evaluate(() => { const r1 = document.querySelector('.abo-lijst tbody tr'); return !!r1 && /STILTE/.test(r1.textContent) && /Terugboeking: de incasso is gestopt/.test(r1.textContent); }), true);
    else ok('de klantpagina: de termijn als "teruggeboekt", en de knop', await ap.evaluate(() => /teruggeboekt/.test(document.querySelector('#abonnement').textContent) && !!document.querySelector('form.weer-lopen button')), true);
    await actx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
