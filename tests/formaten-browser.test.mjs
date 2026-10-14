/**
 * "Ook als PNG" / "Ook als WebP" en /admin/formaten, in een echte browser —
 * K5 punt 1 (k401), 11 oktober 2026.
 *
 * De gebouwde Worker (tests/lib/studio-worker.mjs) met de gedeelde nepdata plus
 * één geleverde catalogbestelling waarvoor PNG al is aangevraagd, en een
 * adminsessie. Chromium bekijkt:
 *   · /account/orders op 390 en 1280 px, licht en donker: het blok onder de
 *     map, de knop "Ook als WebP" en de regel "PNG aangevraagd · …"; tekst
 *     minstens 11,5 px en 4,5:1; geen horizontale scroll;
 *   · end-to-end: op "Ook als WebP" drukken → terug op de kaart met de melding
 *     en "WebP aangevraagd";
 *   · /admin/formaten licht en donker op 390 en 1280: twee open rijen, Klaar
 *     drukken → in Studio "PNG geleverd".
 *
 * Zwaar (build + Worker + browser): draaien via zwaar.sh. Schermafdrukken in
 * .render/ (formaten-*.png). Verzonnen merk; niets hiervan bestaat.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const ORDER = 7097;
const adminToken = await mintToken();
const extraSql = [
  `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, country, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, details_json)
   VALUES (${ORDER}, 'VIS-2610-0097', ${VOLT.id}, 'catalog', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 'NL', 14700, 'nl', '2026-10-01 09:00', 'unattended', 1, 'paid', 'mollie', '2026-10-01', 3087, 0.21, 'nl_standard', datetime('now', '-1 day'), '{"product_p1":"Hoodie zwart"}')`,
  `INSERT INTO order_events (order_id, status, note, created_at) VALUES (${ORDER}, 'received', NULL, '2026-10-01 09:00'), (${ORDER}, 'in_production', NULL, '2026-10-02 09:00'), (${ORDER}, 'delivered', NULL, datetime('now', '-1 day'))`,
  `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, expires_at, review_state, product_key, shot) VALUES
     (70971, ${ORDER}, 'delivery', 'proef/${ORDER}/p1-front.webp', 'VIS-2610-0097-p1-voorkant.jpg', 180000, '2099-12-31', 'approved', 'p1', 'front'),
     (70972, ${ORDER}, 'delivery', 'proef/${ORDER}/p1-back.webp', 'VIS-2610-0097-p1-achterkant.jpg', 180000, '2099-12-31', 'approved', 'p1', 'back')`,
  `INSERT INTO formaat_verzoeken (order_id, formaat, aangevraagd_at) VALUES (${ORDER}, 'png', '2026-10-10 10:00:00')`,
  `INSERT INTO admin_users (id, email, password_hash) VALUES (902, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (902, 902, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
];
const BEELD = 'lifestyle-flash-01-w380.webp';
const extraR2 = [[`proef/${ORDER}/p1-front.webp`, BEELD], [`proef/${ORDER}/p1-back.webp`, BEELD]];

const studio = await startStudio({ extraSql, extraR2 });
const browser = await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const host = new URL(studio.url).hostname;

const METING = (selectors) => `(() => {
  const lum = (c) => {
    const d = String(c).match(/[\\d.]+/g);
    if (!d || d.length < 3) return null;
    const [r, g, b] = d.slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const rgba = (c) => { const d = String(c).match(/[\\d.]+/g) || []; return d.length >= 4 ? Number(d[3]) : 1; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); if (l1 === null || l2 === null) return null; return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const grond = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && rgba(bg) > 0.99) return bg;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  };
  const uit = { gemeten: 0, klein: [], laag: [] };
  for (const el of document.querySelectorAll(${JSON.stringify(selectors)})) {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const tekst = (el.innerText || el.value || '').trim();
    if (!tekst) continue;
    uit.gemeten++;
    const px = parseFloat(st.fontSize);
    if (px < 11.5) uit.klein.push(tekst.slice(0, 30) + ' ' + px + 'px');
    const c = ratio(st.color, grond(el));
    if (c !== null && c + 0.01 < 4.5) uit.laag.push(tekst.slice(0, 30) + ' ' + c.toFixed(2) + ':1');
  }
  return uit;
})()`;

const SEL = `#formaten-${ORDER} .st-formaten-uitleg, #formaten-${ORDER} .st-formaten-kop, #formaten-${ORDER} .btn, #formaten-${ORDER} .st-formaat-staat, #formaten-${ORDER} .st-formaten-melding`;

const studioPagina = async (breed, thema, pad = `/account/orders?order=${ORDER}#order-${ORDER}`) => {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
  await ctx.addCookies([
    { name: 'vis_account', value: VOLT.token, domain: host, path: '/' },
    ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/' }] : []),
  ]);
  const page = await ctx.newPage();
  const res = await page.goto(`${studio.url}${pad}`, { waitUntil: 'load' });
  return { ctx, page, res };
};

try {
  for (const breed of [390, 1280]) {
    for (const thema of ['licht', 'donker']) {
      const { ctx, page, res } = await studioPagina(breed, thema);
      const tag = `studio ${breed}px ${thema}`;
      ok(`${tag}: de pagina laadt`, res.status() === 200, String(res.status()));
      const blok = page.locator(`#formaten-${ORDER}`);
      ok(`${tag}: het blok staat er`, (await blok.count()) === 1);
      ok(`${tag}: "Ook als WebP" is een knop, PNG een regel met de datum`,
        (await blok.locator('button[name=formaat][value=webp]').innerText()).trim() === 'Ook als WebP'
        && (await blok.locator('.st-formaat-staat').innerText()).trim() === 'PNG aangevraagd · 10 okt');
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: geen horizontale scroll`, scroll <= 1, `${scroll}px te breed`);
      const m = await page.evaluate(METING(SEL));
      ok(`${tag}: tekst minstens 11,5 px en 4,5:1`, m.gemeten >= 3 && !m.klein.length && !m.laag.length, `${m.gemeten} · ${m.klein.concat(m.laag).slice(0, 4).join(' | ')}`);
      await page.locator(`#order-${ORDER} .st-afrond, #order-${ORDER} .st-map`).first().scrollIntoViewIfNeeded().catch(() => {});
      const kaartBody = page.locator(`#order-${ORDER} .st-bestelling-body`);
      await kaartBody.screenshot({ path: path.join(OUT, `formaten-studio-${breed}-${thema}.png`), clip: undefined }).catch(() => {});
      await blok.screenshot({ path: path.join(OUT, `formaten-blok-${breed}-${thema}.png`) });
      if (breed === 1280 && thema === 'licht') {
        ok('de proef (7088) en de oude lifestylebestelling: de proef heeft geen knoppen', (await page.locator('#formaten-7088').count()) === 0);
      }
      await ctx.close();
    }
  }

  /* ── END-TO-END: OP "OOK ALS WEBP" DRUKKEN ─────────────────────────────── */
  {
    const { ctx, page } = await studioPagina(1280, 'licht');
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator(`#formaten-${ORDER} button[value=webp]`).click()]);
    ok('drukken: terug op de kaart met ?formaat=webp', /order=7097&formaat=webp/.test(page.url()), page.url());
    ok('  de melding staat erbij', /Genoteerd: we maken de beelden van deze bestelling ook als WebP\./.test(await page.locator(`#formaten-${ORDER} .st-formaten-melding`).innerText()));
    ok('  en beide knoppen zijn nu regels', (await page.locator(`#formaten-${ORDER} button`).count()) === 0 && (await page.locator(`#formaten-${ORDER} .st-formaat-staat`).count()) === 2);
    await page.locator(`#formaten-${ORDER}`).screenshot({ path: path.join(OUT, 'formaten-blok-na-klik.png') });
    await ctx.close();
  }

  /* ── /admin/formaten ──────────────────────────────────────────────────── */
  for (const breed of [1280, 390]) {
    for (const thema of ['licht', 'donker']) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
      await ctx.addCookies([
        { name: 'vis_admin', value: adminToken, domain: host, path: '/' },
        ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/admin' }] : []),
      ]);
      const page = await ctx.newPage();
      const res = await page.goto(`${studio.url}/admin/formaten`, { waitUntil: 'load' });
      const tag = `admin ${breed}px ${thema}`;
      ok(`${tag}: de pagina laadt`, res.status() === 200, String(res.status()));
      ok(`${tag}: twee open verzoeken met Klaar`, (await page.locator('table.files button', { hasText: 'Klaar' }).count()) === 2);
      ok(`${tag}: "Formaten" in het menu, actief`, (await page.locator('.bar-link.is-active', { hasText: 'Formaten' }).count()) === 1);
      const m = await page.evaluate(METING('h1, .lede, table.files th, table.files td, table.files a, table.files .btn, .bar-link'));
      ok(`${tag}: tekst minstens 11,5 px en 4,5:1`, m.gemeten >= 8 && !m.klein.length && !m.laag.length, `${m.gemeten} · ${m.klein.concat(m.laag).slice(0, 4).join(' | ')}`);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: geen horizontale scroll van de pagina`, scroll <= 1, `${scroll}px te breed`);
      await page.screenshot({ path: path.join(OUT, `formaten-admin-${breed}-${thema}.png`), fullPage: true });
      await ctx.close();
    }
  }

  /* ── KLAAR → IN STUDIO "PNG GELEVERD" ─────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
    await ctx.addCookies([{ name: 'vis_admin', value: adminToken, domain: host, path: '/' }]);
    const page = await ctx.newPage();
    await page.goto(`${studio.url}/admin/formaten`, { waitUntil: 'load' });
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('table.files button', { hasText: 'Klaar' }).first().click()]);
    ok('admin Klaar: "Op klaar gezet." en één rij open', /Op klaar gezet\./.test(await page.locator('.okline').innerText()) && (await page.locator('table.files button', { hasText: 'Klaar' }).count()) === 1);
    await ctx.close();
    const s = await studioPagina(1280, 'licht');
    ok('studio: "PNG geleverd · <vandaag>"', /^PNG geleverd · \d{1,2} [a-z]{3}$/.test((await s.page.locator(`#formaten-${ORDER} .st-formaat-staat.is-klaar`).innerText()).trim()));
    await s.ctx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
