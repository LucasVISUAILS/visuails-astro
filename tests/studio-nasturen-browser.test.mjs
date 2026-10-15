/**
 * Nasturen per vak en de bestelkaart, in een echte browser — punten 2.05 en
 * 2.03, 8 oktober 2026.
 *
 * De gebouwde Worker (tests/lib/studio-worker.mjs) met de gedeelde nepdata plus
 * één lopende bestelling met lege fotovakken en een adminsessie. Chromium
 * bekijkt /account/orders op 390 en 1280 px, licht en donker:
 *   · geen horizontale scroll; tekst in de nieuwe blokken minstens 11,5 px en
 *     minstens 4,5:1 tegen zijn ondergrond;
 *   · de lijst "wat ontbreekt" bovenaan de foto's, lege en gevulde vakken;
 *   · de dichte kaart met de Nu-zin en één knop; open verdwijnt die knop;
 *     afgeronde bestellingen ingeklapt onder "Afgerond (N)".
 * Daarna end-to-end: een foto in een leeg vak kiezen en versturen → hij staat
 * in het goede vak, de lijst wordt korter, en /admin toont hem als
 * "nagestuurd" (en de bestelrij telt mee).
 *
 * Zwaar (build + Worker + browser): draaien via zwaar.sh. Schermafdrukken gaan
 * naar de map in $NASTUREN_SHOTS als die gezet is.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.NASTUREN_SHOTS || '';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const ORDER = 7095;
const adminToken = await mintToken();
/* Verzonnen merk en verzonnen nummer; niets hiervan bestaat. */
const extraSql = [
  `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, phone, country, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, details_json)
   VALUES (${ORDER}, 'VIS-2610-0001', ${VOLT.id}, 'catalog', 'in_production', 'Mara', 'VOLT', '${VOLT.email}', '+31 6 1234 5678', 'NL', 14700, 'nl', '2026-10-07 09:00', 'unattended', 3, 'paid', 'mollie', '2026-10-07', 3087, 0.21, 'nl_standard', '{"product_p1":"Hoodie zwart"}')`,
  `INSERT INTO order_events (order_id, status, note, created_at) VALUES (${ORDER}, 'received', NULL, '2026-10-07 09:00'), (${ORDER}, 'in_production', NULL, '2026-10-07 12:00')`,
  `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, product_key, shot) VALUES
     (70901, ${ORDER}, 'upload', 'intake/proefbatch/001-voor.webp', 'voor.webp', 20000, 'p1', 'front'),
     (70902, ${ORDER}, 'upload', 'intake/proefbatch/002-achter.webp', 'achter.webp', 20000, 'p1', 'back'),
     (70903, ${ORDER}, 'upload', 'intake/proefbatch/003-voor2.webp', 'voor2.webp', 20000, 'p2', 'front'),
     (70904, ${ORDER}, 'upload', 'intake/proefbatch/004-voor3.webp', 'voor3.webp', 20000, 'p3', 'front'),
     (70905, ${ORDER}, 'upload', 'intake/proefbatch/005-achter3.webp', 'achter3.webp', 20000, 'p3', 'back'),
     (70906, ${ORDER}, 'upload', 'intake/proefbatch/006-detail3.webp', 'detail3.webp', 20000, 'p3', 'detail')`,
  `INSERT INTO admin_users (id, email, password_hash) VALUES (901, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (901, 901, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
];
const BEELD = 'lifestyle-flash-01-w380.webp';
const extraR2 = ['001-voor', '002-achter', '003-voor2', '004-voor3', '005-achter3', '006-detail3'].map((n) => [`intake/proefbatch/${n}.webp`, BEELD]);

const studio = await startStudio({ extraSql, extraR2 });
const browser = await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const host = new URL(studio.url).hostname;

/* Contrast en lettergrootte van de tekst in de nieuwe blokken, in de browser. */
const METING = (selectors) => `(() => {
  const lum = (c) => {
    const d = String(c).match(/[\\d.]+/g);
    if (!d || d.length < 3) return null;
    const [r, g, b] = d.slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); if (l1 === null || l2 === null) return null; return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const grond = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) return bg;
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

const STUDIO_SEL = '.st-nu-zin, .st-nu-datum, .st-nu-knop .btn, .st-ontbreekt-h, .st-ontbreekt li, .st-ontbreekt .st-meta, .st-vak-legend, .st-vak-naam, .st-vak-staat, .st-vak-ander span, .st-vak-compleet > summary, .st-afgerond > summary, .st-vakform > p, .st-vakform .st-meta, .st-map-tekst p, .st-map .btn';

try {
  for (const breed of [390, 1280]) {
    for (const thema of ['licht', 'donker']) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
      await ctx.addCookies([
        { name: 'vis_account', value: VOLT.token, domain: host, path: '/' },
        ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/' }] : []),
      ]);
      const page = await ctx.newPage();
      const res = await page.goto(`${studio.url}/account/orders?order=${ORDER}#order-${ORDER}`, { waitUntil: 'load' });
      const tag = `${breed}px ${thema}`;
      ok(`${tag}: de pagina laadt`, res.status() === 200, String(res.status()));
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: geen horizontale scroll`, scroll <= 1, `${scroll}px te breed`);
      const m = await page.evaluate(METING(STUDIO_SEL));
      ok(`${tag}: er is tekst gemeten in de nieuwe blokken`, m.gemeten >= 12, String(m.gemeten));
      ok(`${tag}: tekst minstens 11,5 px`, m.klein.length === 0, m.klein.slice(0, 4).join(' | '));
      ok(`${tag}: contrast minstens 4,5:1`, m.laag.length === 0, m.laag.slice(0, 4).join(' | '));
      if (breed === 1280 && thema === 'licht') {
        const kaart = page.locator(`#order-${ORDER}`);
        ok('de lopende bestelling staat open, met de Nu-zin over de ontbrekende foto', await kaart.evaluate((d) => d.open) && /Er ontbreekt nog een foto: Product 1 · Hoodie zwart · detail/.test(await kaart.locator('.st-nu-zin').innerText()));
        ok('de lijst "wat ontbreekt" staat bovenaan de foto’s', (await page.locator(`#fotos-${ORDER} .st-ontbreekt li`).allInnerTexts()).join(' | ') === 'Product 1 · Hoodie zwart: geen detail | Product 2: geen achterkant, geen detail');
        ok('gevulde vakken tonen een kleine weergave', await page.locator(`#fotos-${ORDER} .st-vak.is-gevuld img`).count() >= 3);
        ok('lege verplichte vakken: gestippeld, met "Nog niet ontvangen" en een eigen veld', await page.locator(`#fotos-${ORDER} .st-vak.is-mist input[type=file]`).count() === 3);
        const zichtbareKnoppen = await page.locator('.st-nu-knop:visible').count();
        const alleKnoppen = await page.locator('.st-nu-knop').count();
        ok('dichte kaarten tonen hun ene knop; de open kaart niet', zichtbareKnoppen >= 1 && zichtbareKnoppen < alleKnoppen, `${zichtbareKnoppen}/${alleKnoppen}`);
        ok('afgeronde bestellingen staan ingeklapt onder "Afgerond (N)"', /^Afgerond \(1\)$/.test((await page.locator('.st-afgerond > summary').innerText()).trim()) && !(await page.locator('.st-afgerond').evaluate((d) => d.open)));
        const sample = page.locator('#order-7088');
        ok('een geleverde bestelling (de proef) noemt de regel zonder revisie', (await sample.locator('.st-nu-datum').count()) === 0 || /geen revisieronde/.test(await sample.locator('.st-nu-datum').first().innerText()));
      }
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.locator(`#order-${ORDER}`).screenshot({ path: path.join(SHOTS, `studio-${breed}-${thema}.png`) });
      }
      await ctx.close();
    }
  }

  /* ── END-TO-END: EEN FOTO IN EEN LEEG VAK ─────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
    await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }]);
    const page = await ctx.newPage();
    await page.goto(`${studio.url}/account/orders?order=${ORDER}#order-${ORDER}`, { waitUntil: 'load' });
    const voor = await page.locator(`#fotos-${ORDER} .st-vak.is-mist`).count();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nasturen-'));
    const foto = path.join(tmp, 'achterkant-hoodie.webp');
    fs.copyFileSync(path.join(ROOT, 'public', 'img', BEELD), foto);
    await page.setInputFiles('input[name="vak_p2_back"]', foto);
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator(`#fotos-${ORDER} button[type=submit]`).click()]);
    ok('versturen: terug op dezelfde bestelling met een melding', /order=7095&fotos=1/.test(page.url()) && /1 foto toegevoegd/.test(await page.locator(`#order-${ORDER} .st-melding`).first().innerText()), page.url());
    const na = await page.locator(`#fotos-${ORDER} .st-vak.is-mist`).count();
    ok('versturen: de lijst "wat ontbreekt" wordt korter', na === voor - 1, `${voor} → ${na}`);
    ok('versturen: de achterkant van product 2 is nu gevuld', /Product 2: geen detail/.test((await page.locator(`#fotos-${ORDER} .st-ontbreekt li`).allInnerTexts()).join(' | ')));
    fs.rmSync(tmp, { recursive: true, force: true });
    await ctx.close();
  }

  /* ── /admin: NAGESTUURD, HET BORD EN DE BESTELRIJ ────────────────────── */
  for (const thema of ['licht', 'donker']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
    await ctx.addCookies([
      { name: 'vis_admin', value: adminToken, domain: host, path: '/' },
      ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/admin' }] : []),
    ]);
    const page = await ctx.newPage();
    const res = await page.goto(`${studio.url}/admin/orders/${ORDER}/files`, { waitUntil: 'load' });
    ok(`admin ${thema}: het bord laadt`, res.status() === 200, String(res.status()));
    ok(`admin ${thema}: de nagestuurde foto staat in zijn vak, met "nagestuurd"`, (await page.locator('#p2 .brief-nagestuurd').count()) === 1);
    ok(`admin ${thema}: rood leeg vak bij wat nog ontbreekt`, (await page.locator('.brief-vak.is-mist').count()) === 2);
    ok(`admin ${thema}: het blok met de vaste tekst, bellen en appen`, (await page.locator('#ontbreekt a[href^="tel:"]').count()) === 1 && (await page.locator('#ontbreekt a[href^="https://wa.me/"]').count()) === 1);
    const m = await page.evaluate(METING('.ontbreekt-blok p, .brief-mist, .brief-nagestuurd, .brief-vak.is-mist .brief-vak-l, .board-row .or-let.is-rood'));
    ok(`admin ${thema}: tekst minstens 11,5 px en 4,5:1`, m.gemeten >= 4 && !m.klein.length && !m.laag.length, `${m.gemeten} · ${m.klein.concat(m.laag).slice(0, 4).join(' | ')}`);
    if (SHOTS) await page.locator('#ontbreekt').screenshot({ path: path.join(SHOTS, `admin-blok-${thema}.png`) });
    if (SHOTS) await page.locator('#p2').screenshot({ path: path.join(SHOTS, `admin-p2-${thema}.png`) });
    const dash = await page.goto(`${studio.url}/admin`, { waitUntil: 'load' });
    ok(`admin ${thema}: de bestelrij zegt "2 foto’s ontbreken" na het nasturen`, dash.status() === 200 && /2 foto’s ontbreken/.test(await page.locator(`#order-${ORDER} .or-rij`).innerText()));
    await ctx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
