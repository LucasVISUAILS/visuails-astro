/**
 * "Opnieuw bestellen met alle instellingen" in de echte Worker en een echte browser —
 * levering 58, 17 oktober 2026 (afvinklijst 36: v36-aantal a, v36-bericht a,
 * v36-outfits a en c-kopie); sinds levering 60 de indeling van de complete looks
 * (afvinklijst 38, d-kopie).
 *
 * Wat hier vastligt, ingelogd als de testklant (VOLT, verzonnen):
 *   · lifestyle: het oude aantal staat ingevuld, de looks erna (welke plaatsen samen
 *     een look zijn); het bericht gaat
 *     NIET vanzelf mee, maar staat klaar achter een knop die het met één klik invult;
 *   · catalog: de vorm per foto die bij alle producten gelijk was, staat op elke kaart;
 *   · het blok bovenaan noemt wat er overgenomen is.
 * Vraagt een verse build (npm run build).
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { metVisIn } from './lib/vis-in.mjs';
import { startStudio, VOLT } from './lib/studio-worker.mjs';

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const LS = 7111, CAT = 7112;
const rij = (id, ref, dienst, aantal, det) => `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at, details_json)
   VALUES (${id}, '${ref}', ${VOLT.id}, '${dienst}', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 30000, 'nl', '2026-10-10 09:00', 'unattended', ${aantal}, 'paid', 'mollie', '2026-10-10', 6300, 0.21, 'nl_standard', datetime('now'), '${JSON.stringify(det)}')`;
const extraSql = [
  /* De vorm per foto bestaat alleen bij lifestyle (buildRatios in pipeline.js). */
  rij(LS, 'VIS-2610-1111', 'lifestyle', 3, { style: 'glow', model: 'ava', ratio: 'square', look_p1: 'A', look_p2: 'A', message: 'Voor de zomercollectie', ratio_p1_4: 'portrait45', ratio_p2_4: 'portrait45', ratio_p3_4: 'portrait45', ratio_p1_2: 'story' }),
  rij(CAT, 'VIS-2610-1112', 'catalog', 2, { background: 'light-grey', background_hex: '#F5F5F5', ratio: 'square', model: 'ava' }),
];

const studio = await startStudio({ extraSql });
const browser = metVisIn(await chromium.launch(fs.existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {}));
const host = new URL(studio.url).hostname;

async function open(pad) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
  await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }]);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  const res = await page.goto(`${studio.url}${pad}`, { waitUntil: 'load' });
  await page.locator('[data-pl-van]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(250);
  return { ctx, page, fouten, status: res ? res.status() : 0 };
}

try {
  /* ── LIFESTYLE: AANTAL, OUTFITS EN DE KNOP VOOR HET BERICHT ──────────────── */
  {
    const { ctx, page, fouten, status } = await open(`/nl/start/lifestyle/?van=${LS}`);
    ok('lifestyle: het formulier laadt', status === 200, String(status));
    const blok = (await page.locator('[data-pl-van-wat]').textContent().catch(() => '')) || '';
    ok('  het blok noemt het kenmerk en het aantal', /VIS-2610-1111/.test(blok) && /3 producten/.test(blok), blok);
    ok('  het getalveld staat op 3', (await page.locator('[data-pl-qty-input]').inputValue()) === '3');
    ok('  en de keuzelijst eronder ook (die post)', (await page.locator('select[name="products"]').inputValue()) === '3');
    /* d-kopie: product 1 en 2 waren samen een look; de plaatsen gaan mee, de stukken vul je in. */
    const looks = await page.evaluate(() => [1, 2, 3].map((n) => document.querySelector(`input[name="look_p${n}"]`)?.value ?? 'ontbreekt'));
    ok('  de indeling van de looks gaat mee, na het aantal (d-kopie)', JSON.stringify(looks) === '["A","A",""]', JSON.stringify(looks));
    ok('  en "Wat je krijgt" telt hem: 1 × €50', ((await page.locator('[data-wk-sum-looks]').textContent()) || '').trim() === '1 × €50');
    ok('  het blok noemt de looks', /welke producten samen een look zijn/.test(blok), blok);
    const noot = page.locator('textarea[name="message"]');
    ok('  het bericht staat er NIET vanzelf (v36-bericht a)', (await noot.inputValue()) === '');
    const knop = page.locator('[data-pl-van-bericht]');
    const tekst = ((await knop.textContent()) || '').trim();
    ok('  de knop staat klaar, met het kenmerk', (await knop.getAttribute('hidden')) === null && tekst === 'Neem je bericht van VIS-2610-1111 over', tekst);
    ok('  het blok zegt dat het bericht klaarstaat', /je bericht staat klaar/.test(blok), blok);
    await knop.evaluate((b) => b.click());
    ok('  één klik zet het bericht erin', (await noot.inputValue()) === 'Voor de zomercollectie', await noot.inputValue());
    ok('  en de knop gaat weg', (await knop.getAttribute('hidden')) !== null);
    const v = await Promise.all([1, 2, 3].map((p) => page.locator(`select[name="ratio_p${p}_4"]`).inputValue().catch(() => 'ontbreekt')));
    ok('  de vorm van foto 4 staat op elke kaart (c-kopie)', v.every((x) => x === 'portrait45'), v.join(' / '));
    const v12 = await page.locator('select[name="ratio_p1_2"]').inputValue().catch(() => 'ontbreekt');
    ok('  een vorm die maar bij één product stond, niet', v12 === '', v12);
    ok('  het blok noemt de vorm van foto 4', /de vorm van foto 4/.test(blok), blok);
    ok('  geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }

  /* ── CATALOG: HET AANTAL EN DE ACHTERGROND ──────────────────────────────── */
  {
    const { ctx, page, fouten, status } = await open(`/nl/start/catalog/?van=${CAT}`);
    ok('catalog: het formulier laadt', status === 200, String(status));
    const blok = (await page.locator('[data-pl-van-wat]').textContent().catch(() => '')) || '';
    ok('  het aantal: 2 producten', (await page.locator('select[name="products"]').inputValue()) === '2' && /2 producten/.test(blok), blok);
    ok('  de achtergrond lichtgrijs', await page.locator('input[name="background"][value="light-grey"]').isChecked().catch(() => false));
    ok('  catalog heeft geen berichtveld, dus ook geen knop', (await page.locator('[data-pl-van-bericht]').count()) === 0);
    ok('  geen scriptfouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
} finally {
  await browser.close();
  await studio.dispose();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
process.exit(fail ? 1 : 0);
