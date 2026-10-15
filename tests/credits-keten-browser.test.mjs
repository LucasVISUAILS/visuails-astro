/*
 * BESTELLEN MET CREDITS, DE HELE KETEN IN DE BROWSER — ronde B, 8 oktober 2026
 *
 * Het gebouwde formulier tegen de echte Worker (tests/lib/studio-worker.mjs, met
 * nepdata): een ingelogde abonnee met 120 credits bestelt drie catalogsets via
 * het gewone formulier. Daarna:
 *   · stap 5 zei "kost 12 credits · je hebt er 120 · daarna 108" en de knop
 *     heette "Bestellen met credits";
 *   · de bedankpagina zegt betaald (`paid=`);
 *   · /account/me geeft nog 108 credits (het creditboek is afgeschreven);
 *   · Studio → Bestellingen zet de pil "Credits" naast het kenmerk, en /admin ook;
 *   · contrast en lettergrootte van de pil; 390 en 1280 px.
 * Draai via de wachtrij, na een build:
 *   $S/zwaar.sh node tests/credits-keten-browser.test.mjs
 * Schermafdrukken in .render/credits-keten-*.png.
 */
import fs from 'node:fs';
import { metVisIn } from './lib/vis-in.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { SERVICE_CREDITS } from '../src/data/pricing.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(74)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const adminToken = await mintToken();
const nu = new Date().toISOString().slice(0, 19).replace('T', ' ');
const over = (dagen) => new Date(Date.now() + dagen * 864e5).toISOString().slice(0, 10);
/* Verzonnen credits voor de nepklant VOLT; zijn abonnement (Studio) staat al in
   de gedeelde nepdata (tests/lib/studio-seed.mjs). */
const extraSql = [
  `INSERT INTO credit_boek (customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
   VALUES (${VOLT.id}, (SELECT id FROM subscriptions WHERE customer_id = ${VOLT.id} ORDER BY id DESC LIMIT 1), '${nu}', 120, 'termijn', '${nu.slice(0, 7)}', '${over(90)}', 120, 'termijn:proef:${nu.slice(0, 7)}', 'test')`,
  `INSERT INTO admin_users (id, email, password_hash) VALUES (902, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (902, 902, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
];

const studio = await startStudio({ extraSql });
const browser = metVisIn(await chromium.launch({ executablePath: process.env.CHROME || browserPad() }));
const host = new URL(studio.url).hostname;

const tekst = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const huidigeStap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));

let ref = '';
try {
  /* ── 1 · het formulier ─────────────────────────────────────────────────── */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }]);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(`${studio.url}/nl/start/catalog`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.fill('[data-pl-qty-input]', '3');
  await page.waitForTimeout(200);
  for (let i = 0; i < 6 && (await huidigeStap(page)) !== 5; i += 1) {
    await page.evaluate(() => {
      const kies = (naam) => {
        const r = document.querySelector(`.pl-step.is-current input[name="${naam}"]`);
        if (r && !document.querySelector(`input[name="${naam}"]:checked`)) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      kies('style'); kies('model');
      const vul = (naam, w) => {
        const el = document.querySelector(`.pl-step.is-current [name="${naam}"]`);
        if (el && !el.value) { el.value = w; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
      };
      vul('first_name', 'Mara'); vul('last_name', 'Proef'); vul('brand', 'VOLT'); vul('phone', '+31 6 00000000');
      vul('address_line1', 'Verzonnenstraat 1'); vul('postal_code', '1234 AB'); vul('city', 'Nergenshuizen'); vul('reg_number', '12345678');
    });
    await page.click('.pl-step.is-current [data-pl-next]');
    await page.waitForTimeout(500);
    if (await page.$('[data-pl-missing]:not([hidden]) [data-pl-missing-go]')) { await page.click('[data-pl-missing-go]'); await page.waitForTimeout(400); }
  }
  ok('stap 5 bereikt', await huidigeStap(page), 5);
  const kost = 3 * SERVICE_CREDITS.catalog;
  ok('stap 5: "kost 12 credits · je hebt er 120 · daarna 108"', await tekst(page, '[data-pl-credits-kop]'),
    `Deze bestelling kost ${kost} credits · je hebt er 120 · daarna ${120 - kost}`);
  ok('de knop heet "Bestellen met credits"', await tekst(page, '[data-pl-submit]'), 'Bestellen met credits');
  await page.check('input[name="business_declaration"]');
  await Promise.all([
    page.waitForURL(/thank-you/, { timeout: 30000 }),
    page.click('[data-pl-submit]'),
  ]);
  const url = new URL(page.url());
  ref = url.searchParams.get('paid') || '';
  ok('de bedankpagina komt met paid= (betaald met credits)', /^VIS-/.test(ref), true);
  ok('en geen Mollie-betaallink', url.searchParams.get('pay'), null);
  await page.waitForTimeout(1200);
  ok('de bedankpagina zegt "Betaald"', /Betaald/.test(await tekst(page, '[data-ty-title]') || ''), true);
  ok('geen scriptfouten in het formulier', fouten, []);

  /* ── 2 · het creditboek, via /account/me ───────────────────────────────── */
  const me = await (await studio.fetch('/account/me', { headers: { accept: 'application/json' } })).json();
  ok('/account/me: nog 108 credits (afgeboekt in het creditboek)', me.credits && me.credits.saldo, 120 - kost);

  /* ── 3 · Studio en /admin ──────────────────────────────────────────────── */
  for (const breed of [390, 1280]) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: breed, height: breed < 600 ? 844 : 900 });
    await p.goto(`${studio.url}/account/orders`, { waitUntil: 'load' });
    const kop = p.locator('.st-bestelling', { hasText: ref }).first();
    ok(`Studio ${breed}px: de bestelling staat in Bestellingen`, await kop.count() > 0, true);
    const pil = kop.locator('.credits-pil');
    ok(`Studio ${breed}px: met de pil "Credits" naast het kenmerk`, (await pil.count()) ? (await pil.locator('[aria-hidden="true"]').innerText()).trim() : '', 'Credits');
    ok(`Studio ${breed}px:   voorgelezen als "Betaald met credits van je abonnement"`, (await pil.count()) ? (await pil.locator('.sr-only').textContent()).trim() : '', 'Betaald met credits van je abonnement');
    const maat = await pil.evaluate((el) => {
      const lum = (c) => { const d = String(c).match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; };
      let n = el; let bg = 'rgb(255,255,255)';
      while (n) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { bg = b; break; } n = n.parentElement; }
      const a = lum(getComputedStyle(el).color); const b = lum(bg);
      return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), px: parseFloat(getComputedStyle(el).fontSize) };
    }).catch(() => null);
    ok(`Studio ${breed}px: pil contrast ≥ 4,5 en ≥ 11,5 px`, !!maat && maat.ratio >= 4.5 && maat.px >= 11.5);
    ok(`Studio ${breed}px: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    await kop.scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: path.join(OUT, `credits-keten-studio-${breed}.png`) });
    await p.close();
  }
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addCookies([{ name: 'vis_admin', value: adminToken, domain: host, path: '/' }]);
  const ap = await actx.newPage();
  await ap.goto(`${studio.url}/admin`, { waitUntil: 'load' });
  const rij = ap.locator('.or-ref', { hasText: ref }).first();
  ok('/admin: de pil "Credits" naast het kenmerk in de lijst', (await rij.locator('.credits-pil').count()) > 0, true);
  await rij.scrollIntoViewIfNeeded().catch(() => {});
  await ap.screenshot({ path: path.join(OUT, 'credits-keten-admin-1280.png') });
  await actx.close();
  await ctx.close();
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
