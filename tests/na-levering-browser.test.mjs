/**
 * Ronde A3 "na de levering" in de echte Worker en een echte browser — 8 oktober 2026.
 *
 * Punten 3.01, 3.05, 3.07, 3.08 en 10.05. Draait via $S/zwaar.sh (start
 * wrangler en chromium) en vraagt een verse build. Wat hier vastligt:
 *   · de privélink in vier standen (onbetaald, geleverd, afgerond, proef) op 390
 *     en 1280 px: het "wat nu"-blok bovenaan, geen horizontale scroll, tekst
 *     minstens 11,5 px, contrast minstens 4,5:1, geen script;
 *   · het Studio-overzicht en het afrondblok in Studio, licht en donker;
 *   · het bestelformulier vult achtergrond, verhouding en gezicht in uit de
 *     link van "Bestel met dezelfde look".
 * Met NA_LEVERING_SHOTS=<map> komen er schermafdrukken bij.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.NA_LEVERING_SHOTS || '';

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

/* De seed (studio-seed.mjs): 7092 onbetaald, 7090 geleverd en afgerond, 7088 de
   proef (geleverd). Erbij: 7097, geleverd en nog te bekijken. Verzonnen merk. */
const OPEN = 7097;
const tokens = { onbetaald: [7092, mintToken()], geleverd: [OPEN, mintToken()], afgerond: [7090, mintToken()], proef: [7088, mintToken()] };
const extraSql = [
  `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, delivery_mailed_at, details_json)
   VALUES (${OPEN}, 'VIS-2610-0097', ${VOLT.id}, 'catalog', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 19600, 'nl', '2026-10-06 09:00', 'unattended', 2, 'paid', 'mollie', '2026-10-06', 4116, 0.21, 'nl_standard', datetime('now'), datetime('now'), '{"background":"off-white","background_hex":"#F7F5F1","ratio":"portrait45","model":"ava"}')`,
  `INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, review_state, product_key, shot) VALUES
     (70971, ${OPEN}, 'delivery', 'proef/7090/p1-front.webp', 'VOLT-p1-front.webp', 180000, 'pending', 'p1', 'front'),
     (70972, ${OPEN}, 'delivery', 'proef/7090/p2-front.webp', 'VOLT-p2-front.webp', 180000, 'pending', 'p2', 'front')`,
  `UPDATE orders SET details_json = '{"sample_type":"catalog","background":"white","background_hex":"#FFFFFF","ratio":"square","model":"ava"}' WHERE id = 7088`,
  ...await Promise.all(Object.values(tokens).map(async ([id, t]) => `INSERT INTO order_tokens (order_id, token_hash) VALUES (${id}, '${await hashToken(t)}')`)),
];

const studio = await startStudio({ extraSql });
const browser = await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const host = new URL(studio.url).hostname;

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

const PORTAAL_SEL = '.nu-zin, .nu-datums span, .nu-knoppen .btn, .nu-link, .pad li, .nu-lever, .folder h2, .folder-n, .folder-meta, .folder-datum, .folder-note, .folder .btn, .fb h3, .fb-lede, .fb-scale, .fb-star, .fb h4, .fb-toon-h, .fb-toon-groep legend, .fb-toon-keuze span, .fb-hint, .fb-actions .btn, .fb-link, .herbestel h2, .herbestel .btn, .herbestel-delen, .herbestel-regel, .herbestel-uitleg';
const STUDIO_SEL = '.st-watnu-zin, .st-watnu-datums span, .st-watnu-knoppen .btn, .st-watnu-knoppen .st-link, .st-nogmeer-kop, .st-lopend .st-meta, .st-cijfer-label, .st-cijfer-n, .st-map-tekst p, .st-map-datum, .st-map .btn, .st-herbestel h3, .st-herbestel .btn, .st-herbestel .st-meta, .st-herbestel-regel, .st-tevreden h3, .st-tevreden .fb-lede, .st-tevreden .fb-star';

try {
  /* ── DE PRIVÉLINK, VIER STANDEN ─────────────────────────────────────────── */
  for (const [stand, [id, token]] of Object.entries(tokens)) {
    for (const breed of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
      const page = await ctx.newPage();
      const res = await page.goto(`${studio.url}/o/${token}${stand === 'afgerond' || stand === 'proef' ? '#afgerond' : ''}`, { waitUntil: 'load' });
      const tag = `privélink ${stand} ${breed}px`;
      ok(`${tag}: 200`, res.status() === 200, String(res.status()));
      ok(`${tag}: het wat-nu-blok staat onder de kop`, await page.evaluate(() => { const nu = document.querySelector('.nu'); const h1 = document.querySelector('h1'); return !!nu && !!h1 && (h1.compareDocumentPosition(nu) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }));
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: geen horizontale scroll`, scroll <= 1, `${scroll}px`);
      const m = await page.evaluate(METING(PORTAAL_SEL));
      ok(`${tag}: tekst minstens 11,5 px`, m.klein.length === 0, m.klein.slice(0, 4).join(' | '));
      ok(`${tag}: contrast minstens 4,5:1`, m.laag.length === 0, m.laag.slice(0, 4).join(' | '));
      ok(`${tag}: geen script`, (await page.locator('script').count()) === 0);
      if (stand === 'geleverd') {
        ok(`${tag}: violet "Alles goed — naar je downloads"`, /Alles goed — naar je downloads/.test(await page.locator('.nu-knoppen .btn-primary').innerText()));
      }
      if (stand === 'proef') {
        ok(`${tag}: "Bestel in deze look" met de vanaf-regel`, (await page.locator('.herbestel .btn').innerText()) === 'Bestel in deze look' && /catalogfoto’s vanaf €\d+ per product/.test(await page.locator('.herbestel-regel').innerText()));
      }
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: path.join(SHOTS, `privelink-${stand}-${breed}.png`), fullPage: true });
      }
      await ctx.close();
    }
  }

  /* "Alles goed" in de browser: van de privélink naar #afgerond, met het toestemmingsblok. */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'nl-NL' });
    const page = await ctx.newPage();
    await page.goto(`${studio.url}/o/${tokens.geleverd[1]}`, { waitUntil: 'load' });
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('.nu-knoppen .btn-primary').click()]);
    ok('"Alles goed" landt op #afgerond', /#afgerond$/.test(page.url()) && (await page.locator('#afgerond .folder').count()) === 1, page.url());
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('.fb-star[value="5"]').click()]);
    ok('na een 5: het toestemmingsblok, "Liever niet" aan', (await page.locator('.fb-toon-groep').count()) === 2 && (await page.locator('input[name="toon_beelden"][value="nee"]').isChecked()));
    const m = await page.evaluate(METING(PORTAAL_SEL));
    ok('toestemmingsblok 390px: tekst en contrast', m.klein.length === 0 && m.laag.length === 0, m.klein.concat(m.laag).slice(0, 4).join(' | '));
    if (SHOTS) await page.locator('#afgerond').screenshot({ path: path.join(SHOTS, 'afrond-toestemming-390.png') });
    await page.fill('#fb-tekst', 'Snel, precies en mooi licht.');
    await page.check('input[name="toon_beelden"][value="merk"]');
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('.fb-quote button[type=submit]').click()]);
    ok('na versturen: de tekst om te kopiëren en de reviewknoppen', (await page.locator('.fb-kopie').inputValue()) === 'Snel, precies en mooi licht.' && /Review op Trustpilot/.test(await page.locator('.fb-na .btn-primary').innerText()));
    const m2 = await page.evaluate(METING(PORTAAL_SEL + ', .fb-kopie, .fb-thanks'));
    ok('na versturen 390px: tekst en contrast', m2.klein.length === 0 && m2.laag.length === 0, m2.klein.concat(m2.laag).slice(0, 4).join(' | '));
    if (SHOTS) await page.locator('#afgerond').screenshot({ path: path.join(SHOTS, 'afrond-na-versturen-390.png') });
    await ctx.close();
  }

  /* ── STUDIO: HET OVERZICHT EN HET AFRONDBLOK, LICHT EN DONKER ───────────── */
  for (const breed of [390, 1280]) {
    for (const thema of ['licht', 'donker']) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 }, locale: 'nl-NL' });
      await ctx.addCookies([
        { name: 'vis_account', value: VOLT.token, domain: host, path: '/' },
        ...(thema === 'donker' ? [{ name: 'vis_thema', value: 'donker', domain: host, path: '/' }] : []),
      ]);
      const page = await ctx.newPage();
      const tag = `Studio ${breed}px ${thema}`;
      const res = await page.goto(`${studio.url}/account`, { waitUntil: 'load' });
      ok(`${tag}: overzicht 200`, res.status() === 200, String(res.status()));
      ok(`${tag}: "wat nu" vóór de tegels`, await page.evaluate(() => { const a = document.querySelector('.st-watnu-blok'); const b = document.querySelector('.st-cijfers'); return !!a && (!b || (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) > 0); }));
      ok(`${tag}: geen tegel met 0`, (await page.locator('.st-cijfer-n.is-nul').count()) === 0);
      let scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: overzicht zonder horizontale scroll`, scroll <= 1, `${scroll}px`);
      let m = await page.evaluate(METING(STUDIO_SEL));
      ok(`${tag}: overzicht tekst en contrast`, m.gemeten > 3 && m.klein.length === 0 && m.laag.length === 0, `${m.gemeten} · ${m.klein.concat(m.laag).slice(0, 4).join(' | ')}`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `studio-overzicht-${breed}-${thema}.png`), fullPage: true });
      await page.goto(`${studio.url}/account/orders?order=7090#afgerond-7090`, { waitUntil: 'load' });
      ok(`${tag}: het afrondblok van een afgeronde bestelling`, (await page.locator('#afgerond-7090 .st-map').count()) === 1 && (await page.locator('#afgerond-7090 .st-herbestel').count()) === 1);
      scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${tag}: bestellingen zonder horizontale scroll`, scroll <= 1, `${scroll}px`);
      m = await page.evaluate(METING(STUDIO_SEL));
      ok(`${tag}: afrondblok tekst en contrast`, m.klein.length === 0 && m.laag.length === 0, m.klein.concat(m.laag).slice(0, 4).join(' | '));
      if (SHOTS) await page.locator('#order-7090').screenshot({ path: path.join(SHOTS, `studio-afrond-${breed}-${thema}.png`) });
      await ctx.close();
    }
  }

  /* ── HET FORMULIER VULT DE LOOK IN ──────────────────────────────────────── */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
    const page = await ctx.newPage();
    const res = await page.goto(`${studio.url}/nl/start/catalog/?bg=F7F5F1&ratio=portrait45&face=ava`, { waitUntil: 'load' });
    if (res && res.status() === 200) {
      await page.waitForTimeout(300);
      ok('formulier: achtergrond gebroken wit uit de link', await page.locator('input[name="background"][value="off-white"]').isChecked());
      ok('formulier: verhouding 4:5 uit de link', await page.locator('input[name="ratio"][value="portrait45"]').isChecked().catch(() => false));
      ok('formulier: gezicht uit de link', await page.locator('input[name="model"][value="ava"]').isChecked().catch(() => false));
    } else {
      ok('formulier: /nl/start/catalog/ laadt in de testworker', false, String(res && res.status()));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
