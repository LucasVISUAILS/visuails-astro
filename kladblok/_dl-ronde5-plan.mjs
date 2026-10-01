// Ronde 5 · A5.2: het abonnementsformulier per land (NL met KVK, US zonder nummer, DE zonder btw).
import { start, sql, SITE } from './_dl.mjs';
const gevallen = [
  { land: 'US', email: 'plan-us@merk.test', reg: '' },
  { land: 'NL', email: 'plan-nl@merk.test', reg: '12345678' },
  { land: 'DE', email: 'plan-de@merk.test', reg: 'HRB 12345', geenBtw: true },
];
for (const g of gevallen) {
  const s = await start(); const { page } = s;
  await page.goto(SITE + '/nl/start/plan?plan=studio', { waitUntil: 'load' });
  const form = page.locator('form[action="/api/plan"]');
  const klik = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); (r?.closest('label') || r)?.click(); return !!r; }, sel);
  await klik('input[name="plan"][value="studio"]'); await klik('input[name="term"][value="monthly"]');
  await form.locator('select[name="window_day"]').selectOption('10');
  for (const [k, v] of Object.entries({ first_name: 'Yara', last_name: 'Merk', email: g.email, phone: '0611111111', brand: `Merk ${g.land}`, address_line1: 'Teststraat 3', postal_code: '1234 AB', city: 'Teststad' })) await form.locator(`[name="${k}"]`).fill(v);
  await form.locator('select[name="country"]').selectOption(g.land);
  await page.waitForTimeout(300);
  if (g.geenBtw) await klik('input[name="no_vat"]');
  await page.waitForTimeout(200);
  const reg = form.locator('input[name="reg_number"]');
  if (g.reg && await reg.isVisible()) await reg.fill(g.reg);
  const zicht = await page.evaluate(() => [...document.querySelectorAll('form[action="/api/plan"] input, form[action="/api/plan"] select')].filter((e) => e.offsetParent !== null && /vat|reg|no_vat|brand|country/.test(e.name)).map((e) => `${e.name}${e.required ? '*' : ''}`).join(' '));
  const hint = await page.evaluate(() => [...document.querySelectorAll('[data-ps-reg-hint]')].filter((e) => e.offsetParent !== null).map((e) => e.innerText).join(' | '));
  await klik('input[name="business_declaration"]'); await klik('input[name="withdrawal_consent"]');
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => null), form.locator('button[type="submit"]').click()]);
  await page.waitForTimeout(800);
  console.log(`\n## ${g.land}: velden ${zicht}\n   hint: ${hint}\n   na submit: ${page.url()}`);
  const fout = await page.evaluate(() => [...document.querySelectorAll('.ps-fout, [role="alert"], .warnline')].map((e) => e.innerText.trim()).filter(Boolean).join(' | '));
  if (fout) console.log('   melding:', fout.slice(0, 300));
  console.log(await sql(`SELECT s.ref, s.vat_treatment, s.vat_rate, s.vat_country, c.reg_number, c.no_vat_number, c.brand FROM subscriptions s JOIN customers c ON c.id = s.customer_id WHERE c.email = '${g.email}' ORDER BY s.id DESC LIMIT 1`));
  console.log('   fouten:', s.fouten.filter((f) => !/account\/me/.test(f)));
  await s.stop();
}
