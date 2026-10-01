/* Eén bestelling plaatsen zoals een klant dat doet, in de echte browser. */
import { SITE, tekst, velden, foto } from './_dl.mjs';

export const FOTOS = ['/tmp/claude-0/dl/voor.jpg', '/tmp/claude-0/dl/achter.jpg', '/tmp/claude-0/dl/detail.jpg', '/tmp/claude-0/dl/gedragen.jpg'];
export const KLANT = { first_name: 'Sanne', last_name: 'Proef', brand: 'Proefmerk', email: 'sanne@proefmerk.test', phone: '0612345678', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' };

export const stap = (page) => page.evaluate(() => Number(document.querySelector('.pl-step.is-current')?.dataset.plStep || 0));
export const stapFout = (page) => page.evaluate(() => [...document.querySelectorAll('.pl-step.is-current [data-pl-step-error], .pl-step.is-current .pl-step-err, .pl-step.is-current [data-pl-missing]')].map((e) => e.innerText.trim()).filter(Boolean).join(' | '));
export async function verder(page) {
  const voor = await stap(page);
  const geklikt = await page.evaluate(() => { const b = document.querySelector('.pl-step.is-current [data-pl-next]'); if (!b) return false; b.scrollIntoView(); b.click(); return true; });
  if (!geklikt) throw new Error(`stap ${voor}: geen doorgaan-knop`);
  await page.waitForTimeout(600);
  const na = await stap(page);
  if (na === voor) throw new Error(`stap ${voor} blokkeert: ${await stapFout(page)}`);
  return na;
}

/**
 * @param {import('playwright').Page} page
 * @param {{ pad: string, aantal?: number, look?: string, model?: string, fotos?: number, garment?: string,
 *   voorrang?: boolean, extra?: number, hires?: boolean, outfit?: boolean, angles?: string[], background?: string, ratio?: string,
 *   klant?: object, land?: string, vat?: string|null, bewaar?: boolean, venster?: 'eerste'|null, stap1?: (page)=>Promise<void>, stap2?: (page)=>Promise<void> }} o
 */
export async function bestel(page, o) {
  const log = [];
  await page.goto(SITE + o.pad, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 15000 });
  /* stap 1 */
  const openBij = (sel) => page.evaluate((sel) => { const d = document.querySelector(sel)?.closest('details'); if (d && !d.open) d.querySelector('summary')?.click(); }, sel);
  if (o.aantal && await page.$('[data-pl-qty-input]')) {
    await page.fill('[data-pl-qty-input]', String(o.aantal));
    await page.dispatchEvent('[data-pl-qty-input]', 'input');
    await page.dispatchEvent('[data-pl-qty-input]', 'change');
  }
  const klikRadio = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); if (!r) return false; (r.closest('label') || r).click(); if (!r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); } return true; }, sel);
  if (o.look) {
    const sel = page.locator('select[name="style"]');
    if (await sel.count()) await sel.selectOption(o.look);
    else if (!await klikRadio(`input[name="style"][value="${o.look}"]`)) log.push(`look ${o.look} niet gevonden`);
  } else {
    await page.evaluate(() => { const v = document.querySelector('[data-pl-look]'); const r = v && !v.hidden && v.querySelector('input[name="style"]'); if (r && !v.querySelector('input[name="style"]:checked')) r.closest('label')?.click(); });
  }
  await page.evaluate(() => document.querySelectorAll('.pl-step.is-current details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(200);
  if (o.background) { await openBij(`input[name="background"]`); await page.waitForTimeout(250); if (!await klikRadio(`input[name="background"][value="${o.background}"]`)) log.push('achtergrond niet gevonden'); }
  if (o.ratio) { await openBij(`input[name="ratio"]`); await page.waitForTimeout(250); if (!await klikRadio(`input[name="ratio"][value="${o.ratio}"]`)) log.push('ratio niet gevonden'); }
  if (o.voorrang) { const v = page.locator('label:has(input[name="voorrang"])'); if (await v.count()) await v.first().click(); else log.push('voorrang niet te kiezen'); }
  for (const a of o.angles || []) { await openBij(`input[name="angle_${a}"]`); await page.waitForTimeout(250); const l = page.locator(`label:has(input[name="angle_${a}"])`); if (await l.count()) await l.first().click(); else log.push(`hoek ${a} niet gevonden`); }
  if (o.outfit) { const sel = page.locator('select[name="outfit_count"]'); if (await sel.count()) await sel.selectOption(String(o.outfit)); else log.push('outfit_count niet gevonden'); }
  if (o.stap1) await o.stap1(page);
  await page.waitForTimeout(300);
  log.push(`stap1 totaal: ${await page.evaluate(() => document.querySelector('[data-pl-total], .pl-total, .pl-som')?.innerText?.replace(/\s+/g, ' ').slice(0, 80))}`);
  await verder(page);
  /* stap 2 */
  const n = await page.evaluate(() => document.querySelectorAll('.pu-card').length);
  for (let p = 1; p <= n; p++) {
    const naam = page.locator(`input[name="product_p${p}"]`);
    if (await naam.count()) await naam.fill(`${o.naam || 'Proefproduct'} ${p}`);
    const inputs = page.locator('.pu-card:not([hidden]) .pu-slot-input');
    const k = o.fotos ?? 3;
    for (let i = 0; i < k; i++) { await inputs.nth(i).setInputFiles(FOTOS[i % FOTOS.length]); await page.waitForTimeout(600); }
    if (o.extra) {
      const sel = page.locator('.pu-card:not([hidden]) .pu-extra select');
      if (await sel.count()) await sel.first().selectOption(String(o.extra)); else log.push('extra-beelden vak niet gevonden');
    }
    if (o.hires) {
      if (!await klikRadio('.pu-card:not([hidden]) input[name^="hi_"]')) log.push('hoge resolutie niet gevonden op de kaart');
    }
    if (o.garment) { const g = page.locator(`select[name="garment_p${p}"]`); if (await g.count()) await g.selectOption(o.garment); }
    await page.waitForTimeout(1200);
    if (p < n) { const v = page.locator('.pl-step.is-current button[data-pl-volgende]'); if (await v.count()) await v.first().click(); }
  }
  if (o.model !== null) {
    const m = page.locator(`label:has(input[name="model"][value="${o.model || 'any'}"])`);
    if (await m.count()) { await m.first().scrollIntoViewIfNeeded(); await m.first().click(); }
  }
  if (o.stap2) await o.stap2(page);
  await page.waitForTimeout(800);
  await verder(page);
  /* stap 3 */
  for (const [k, v] of Object.entries({ ...KLANT, ...(o.klant || {}) })) { const f = page.locator(`.pl-step.is-current [name="${k}"]`); if (await f.count()) await f.fill(v); }
  await page.selectOption('.pl-step.is-current select[name="country"]', o.land || 'NL');
  if (o.vat === null) { const nv = page.locator('.pl-step.is-current label:has(input[name="no_vat"])'); if (await nv.count() && !(await page.locator('.pl-step.is-current input[name="no_vat"]').first().isChecked())) await nv.first().click(); }
  else { const f = page.locator('.pl-step.is-current [name="vat"]'); if (await f.count() && await f.isVisible()) await f.fill(o.vat || 'NL123456789B01'); }
  await page.waitForTimeout(300);
  for (const nm of ['vat_confirmed', 'business_declaration']) { const c = page.locator(`.pl-step.is-current input[name="${nm}"]`); if (await c.count() && await c.first().isVisible() && !(await c.first().isChecked())) await c.first().click(); }
  const reg = page.locator('.pl-step.is-current input[name="reg_number"]'); if (await reg.count() && await reg.first().isVisible()) await reg.first().fill((o.land || 'NL') === 'NL' ? '12345678' : 'REG-12345');
  if (o.stap3) await o.stap3(page);
  let s = await verder(page);
  /* stap 4: levertijd (alleen vanaf 10 producten) */
  const isLaatste = await page.evaluate(() => !!document.querySelector('.pl-step.is-current button[type="submit"]'));
  if (s === 4 && !isLaatste) {
    log.push('stap4: ' + (await tekst(page, '.pl-step.is-current')).replace(/\s+/g, ' ').slice(0, 300));
    const eerste = page.locator('.pl-step.is-current label:has(input[type="radio"])');
    if (o.venster !== null && await eerste.count()) await eerste.first().click();
    s = await verder(page);
  }
  /* laatste stap */
  const overzicht = (await tekst(page, '.pl-step.is-current')).replace(/\n{2,}/g, '\n');
  for (const nm of ['business_declaration', 'withdrawal_consent']) { const c = page.locator(`.pl-step.is-current label:has(input[name="${nm}"])`); if (await c.count()) await c.first().click(); }
  if (o.bewaar) { const c = page.locator('.pl-step.is-current label:has(input[type="checkbox"]:not([name]))'); if (await c.count()) await c.first().click(); }
  const submit = page.locator('.pl-step.is-current button[type="submit"], #pl-form button[type="submit"]');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /\/(api|account)\/order\b/.test(r.url()), { timeout: 30000 }).catch(() => null),
    o.dubbel ? submit.first().dblclick() : submit.first().click(),
  ]);
  await page.waitForTimeout(1500);
  const apiStatus = resp ? resp.status() : null;
  let apiBody = null; try { apiBody = resp ? await resp.text() : null; } catch { /* stroom al weg */ }
  return { log, overzicht, apiStatus, apiBody: apiBody ? apiBody.slice(0, 400) : null, url: page.url() };
}

/** Op de nep-Mollie pagina: betalen (of iets anders) en terug naar de site. */
export async function betaal(page, status = 'paid') {
  if (!/(localhost:4478|nep-mollie\.test)\/checkout/.test(page.url())) throw new Error('niet op de nep-betaalpagina: ' + page.url());
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click(`button[data-pay="${status}"]`)]);
  await page.waitForTimeout(800);
  return page.url();
}
