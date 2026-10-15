/*
 * HET SPAARPLAFOND IN DE BROWSER — 12 oktober 2026 (afvinklijst 4, ab-v1 = c, ab-v2 = a)
 *
 * Het gebouwde Studio tegen de echte Worker (tests/lib/studio-worker.mjs, met
 * nepdata), in de standen van een abonnee: actief, aan het plafond, gepauzeerd,
 * gestopt en (deel 2) met bijgekochte credits. Per pagina op 390 en 1280 px,
 * licht en donker:
 *   · geen horizontale scroll;
 *   · elke tekst in de blokken ≥ 11,5 px en contrast ≥ 4,5:1;
 *   · de zin die bij de stand hoort: "(je kunt er 360 sparen)", "gebruik er
 *     vóór die dag …", of "Je credits blijven geldig tot en met …";
 *   · het blok "Extra credits bijkopen" (een formulier zonder script) alleen bij
 *     een lopend abonnement, met drie keuzerondjes en de knop.
 * Plus de strook "Je saldo" en de klantpagina in /admin.
 * Draai via de wachtrij, na een build:
 *   $S/zwaar.sh node tests/spaarplafond-browser.test.mjs
 * Schermafdrukken in .render/sp-*.png.
 */
import fs from 'node:fs';
import { metVisIn } from './lib/vis-in.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { spaarPlafond, PLAN_CREDITS } from '../src/data/pricing.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(80)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}

const dag = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const moment = (d) => `${dag(d)} 10:00:00`;
const maand = new Date().toISOString().slice(0, 7);
const begin = `${maand}-01 09:00:00`;
const adminToken = await mintToken();
const PLAFOND = spaarPlafond(PLAN_CREDITS.studio);

/* Verzonnen abonnees, elk met een eigen sessie en een verzonnen adres. */
const KLANTEN = {
  actief: { id: 8201, brand: 'ORIA' },
  plafond: { id: 8202, brand: 'VENTA' },
  pauze: { id: 8203, brand: 'MIRO' },
  gestopt: { id: 8204, brand: 'TALO' },
  bijgekocht: { id: 8205, brand: 'NIVA' },
};
const extraSql = [
  `INSERT INTO admin_users (id, email, password_hash) VALUES (904, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (904, 904, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
];
for (const [stand, k] of Object.entries(KLANTEN)) {
  k.token = `sp-sessie-${stand}-0000000001`;
  extraSql.push(
    `INSERT INTO customers (id, email, name, first_name, brand, phone, country, address_line1, postal_code, city) VALUES (${k.id}, '${stand}@voorbeeld-${stand}.test', 'Proef ${stand}', 'Proef', '${k.brand}', '06 12345678', 'NL', 'Verzonnenstraat 1', '1234 AB', 'Nergenshuizen')`,
    `INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (${k.id}, '${await hashToken(k.token)}', datetime('now'), datetime('now', '+30 days'))`,
  );
}
const sub = (k, status) => `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, started_at) VALUES (${k.id}, ${k.id}, 'SUB-${k.brand}', 'studio', 'monthly', '${status}', '${begin}')`;
const partij = (k, id, aantal, rest, binnen, vervalt) => `INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, maand, vervalt_op, rest, sleutel, door)
  VALUES (${id}, ${k.id}, ${k.id}, '${moment(binnen)}', ${aantal}, 'termijn', '${dag(binnen).slice(0, 7)}', '${dag(vervalt)}', ${rest}, 'termijn:${k.id}:${id}', 'test')`;
const maandRij = (k) => `INSERT INTO subscription_months (subscription_id, month, granted) VALUES (${k.id}, '${maand}', 12)`;
{
  const k = KLANTEN.actief;
  extraSql.push(sub(k, 'active'), maandRij(k), partij(k, 82011, 120, 120, -2, 88));
}
{
  /* Aan het plafond: drie termijnen, na de laatste allemaal op één datum
     (zoals boekTermijnBij() ze laat staan), samen 356. */
  const k = KLANTEN.plafond;
  extraSql.push(sub(k, 'active'), maandRij(k),
    partij(k, 82021, 120, 116, -62, 88), partij(k, 82022, 120, 120, -32, 88), partij(k, 82023, 120, 120, -2, 88));
}
{
  const k = KLANTEN.pauze;
  extraSql.push(sub(k, 'paused'), `UPDATE subscriptions SET paused_at = '${moment(-10)}', pause_reason = 'customer', stop_reden = 'rustig' WHERE id = ${k.id}`,
    partij(k, 82031, 120, 80, -40, 50), partij(k, 82032, 120, 120, -40, 50));
}
{
  const k = KLANTEN.gestopt;
  extraSql.push(sub(k, 'cancelled'), `UPDATE subscriptions SET cancelled_at = '${moment(-20)}', stop_reden = 'budget' WHERE id = ${k.id}`,
    partij(k, 82041, 120, 90, -50, 40));
}

{
  /* Met 25 bijgekochte credits (eigen datum, eerst op, buiten het plafond). */
  const k = KLANTEN.bijgekocht;
  extraSql.push(sub(k, 'active'), maandRij(k), partij(k, 82051, 120, 120, -2, 88),
    `INSERT INTO credit_boek (id, customer_id, subscription_id, datum, aantal, reden, vervalt_op, rest, sleutel, door, soort)
       VALUES (82052, ${k.id}, ${k.id}, '${moment(-5)}', 25, 'bijgekocht', '${dag(85)}', 25, 'bijgekocht:8205', 'systeem', 'bijgekocht')`,
    `INSERT INTO credit_aankopen (customer_id, subscription_id, pakket, net_cents, vat_cents, gross_cents, vat_treatment, plan_label, maand, status, mollie_payment_id, created_at, paid_at)
       VALUES (${k.id}, ${k.id}, 25, 15700, 3297, 18997, 'nl_standard', 'Pro', '${dag(0).slice(0, 7)}', 'paid', 'tr_Proefbijkoop1', '${moment(-5)}', '${moment(-5)}')`);
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

const STUDIO_BLOKKEN = ['.st-abo-stand', '.st-abo-saldo', '.st-abo-bestel', '.st-boek', '#je-plan', '.st-bespreek', '#bijkopen'];
const ADMIN_BLOKKEN = ['#abonnement'];
const saldoTekst = (p) => p.evaluate(() => document.querySelector('.st-abo-saldo')?.textContent.replace(/\s+/g, ' ').trim() || '');

try {
  for (const thema of ['licht', 'donker']) {
    for (const breed of [390, 1280]) {
      for (const [stand, k] of Object.entries(KLANTEN)) {
        const ctx = await browser.newContext({ viewport: { width: breed, height: breed < 600 ? 844 : 900 } });
        await ctx.addCookies([
          { name: 'vis_account', value: k.token, domain: host, path: '/' },
          { name: 'vis_lang', value: 'nl', domain: host, path: '/' },
          { name: 'vis_thema', value: thema, domain: host, path: '/' },
        ]);
        const p = await ctx.newPage();
        await p.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
        await p.goto(`${studio.url}/account/plan`, { waitUntil: 'load' });
        const label = `${stand} ${breed}px ${thema}`;
        ok(`/account/plan ${label}: het saldo staat er`, await p.evaluate(() => !!document.querySelector('.st-abo-saldo')), true);
        ok(`/account/plan ${label}: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        const m = await meet(p, STUDIO_BLOKKEN);
        ok(`/account/plan ${label}: ${m.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, m.fout, []);
        const tekst = await saldoTekst(p);
        if (stand === 'actief') {
          ok(`${label}: "(je kunt er ${PLAFOND} sparen)" en wanneer er nieuwe bijkomen`, tekst.includes(`Je hebt 120 credits (je kunt er ${PLAFOND} sparen)`) && /Op \d+ [a-z]+( \d{4})? komen er 120 bij\./.test(tekst), true);
          ok(`${label}: geen vervaldatum bij een lopend abonnement`, /vervall?en op|geldig tot en met/.test(tekst), false);
        }
        if (stand === 'plafond') {
          ok(`${label}: "gebruik er vóór die dag 116, anders vallen ze weg"`, tekst.includes(`Je hebt 356 credits (je kunt er ${PLAFOND} sparen)`) && /komen er 120 bij: gebruik er vóór die dag 116, anders vallen ze weg\./.test(tekst), true);
          ok(`${label}: die zin valt op`, await p.evaluate(() => !!document.querySelector('.st-abo-nieuw.is-boven')), true);
        }
        const heeftSpaar = await p.evaluate(() => !!document.querySelector('.st-abo-spaar'));
        await p.screenshot({ path: path.join(OUT, `sp-plan-${stand}-${breed}-${thema}.png`), fullPage: true });
        /* Bijkopen en het creditboek staan sinds 15 oktober 2026 op de tab Credits. */
        await p.goto(`${studio.url}/account/plan?tab=credits`, { waitUntil: 'load' });
        ok(`/account/plan?tab=credits ${label}: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        const mc = await meet(p, STUDIO_BLOKKEN);
        ok(`/account/plan?tab=credits ${label}: ${mc.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, mc.fout, []);
        if (stand === 'pauze' || stand === 'gestopt') {
          ok(`${label}: "Je credits blijven geldig tot en met …"`, /Je credits blijven geldig tot en met \d+ [a-z]+( \d{4})?\./.test(tekst), true);
          ok(`${label}: geen plafond meer naast het saldo`, heeftSpaar, false);
          ok(`${label}: geen bijkoopblok zonder lopend abonnement`, await p.evaluate(() => !document.querySelector('#bijkopen')), true);
        } else {
          ok(`${label}: het bijkoopblok: een formulier zonder script, drie keuzerondjes, één gekozen`, await p.evaluate(() => {
            const f = document.querySelector('#bijkopen form[method="post"][action="/account/plan/bijkopen"]');
            return !!f && f.querySelectorAll('input[type="radio"][name="pakket"]').length === 3 && f.querySelectorAll('input[name="pakket"]:checked').length === 1
              && !!f.querySelector('button[type="submit"]') && !document.querySelector('#bijkopen script');
          }), true);
        }
        if (stand === 'bijgekocht') {
          ok(`${label}: "Waarvan 25 bijgekocht: die gaan als eerste op …"`, /Waarvan 25 bijgekocht: die gaan als eerste op en tellen niet mee voor je spaarplafond; ze blijven geldig tot en met/.test(tekst), true);
          ok(`${label}: het saldo is 145, het plafond blijft 360`, tekst.includes(`Je hebt 145 credits (je kunt er ${PLAFOND} sparen)`), true);
          ok(`${label}: "Eerder bijgekocht" met de aankoop`, await p.evaluate(() => /Eerder bijgekocht \(1\)/.test(document.querySelector('#bijkopen')?.textContent.replace(/\s+/g, ' ') || '')), true);
          ok(`${label}: in het creditboek "Extra credits bijgekocht"`, await p.evaluate(() => [...document.querySelectorAll('.st-boek tr[data-reden="bijgekocht"]')].some((r) => /Extra credits bijgekocht/.test(r.textContent))), true);
          ok(`${label}: nog 75 bij te kopen deze maand`, await p.evaluate(() => /Deze maand kun je nog 75 credits bijkopen/.test(document.querySelector('#bijkopen')?.textContent || '')), true);
          await p.locator('#bijkopen').screenshot({ path: path.join(OUT, `sp-bijkopen-${breed}-${thema}.png`) });
        }
        await p.screenshot({ path: path.join(OUT, `sp-credits-${stand}-${breed}-${thema}.png`), fullPage: true });
        if (stand === 'plafond') {
          await p.goto(`${studio.url}/account`, { waitUntil: 'load' });
          const strook = await p.evaluate(() => document.querySelector('.st-saldostrook')?.textContent.replace(/\s+/g, ' ') || '');
          ok(`Overzicht ${label}: de strook noemt het plafond en de plafondzin`, strook.includes(`(je kunt er ${PLAFOND} sparen)`) && /gebruik er vóór die dag 116/.test(strook), true);
          ok(`Overzicht ${label}: geen horizontale scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
          const s = await meet(p, ['.st-saldostrook']);
          ok(`Overzicht ${label}: ${s.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, s.fout, []);
          await p.locator('.st-saldostrook').screenshot({ path: path.join(OUT, `sp-saldostrook-${breed}-${thema}.png`) });
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
      for (const stand of ['plafond', 'gestopt', 'bijgekocht']) {
        await ap.goto(`${studio.url}/admin/customers/${KLANTEN[stand].id}`, { waitUntil: 'load' });
        const label = `${stand} ${breed}px ${thema}`;
        const t = await ap.evaluate(() => document.querySelector('#abonnement')?.textContent.replace(/\s+/g, ' ') || '');
        ok(`/admin klant ${label}: de zin die bij de stand hoort`, stand === 'plafond'
          ? t.includes(`(je kunt er ${PLAFOND} sparen)`) && /gebruik er vóór die dag 116/.test(t)
          : stand === 'bijgekocht'
            ? /Extra credits gekocht/.test(t) && /25 credits · Pro/.test(t) && /Waarvan 25 bijgekocht/.test(t)
            : /Je credits blijven geldig tot en met/.test(t), true);
        ok(`/admin klant ${label}: geen horizontale scroll`, await ap.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
        const m = await meet(ap, ADMIN_BLOKKEN);
        ok(`/admin klant ${label}: ${m.geteld} teksten ≥ 11,5 px en ≥ 4,5:1`, m.fout, []);
        await ap.locator('#abonnement').screenshot({ path: path.join(OUT, `sp-admin-${stand}-${breed}-${thema}.png`) });
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
