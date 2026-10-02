// Ronde 9 · F45: merkmodelformulier — fout telefoonnummer en terug van de server met de antwoorden erin.
import { start, SITE } from './_dl.mjs';
const k = await start({ mobiel: true }); const { page } = k;
await page.goto(SITE + '/nl/start/brand-model', { waitUntil: 'load' });
const verder = () => page.locator('[data-bm-next]').click();
await page.locator('input[name=bm_track][value=ours]').check({ force: true }); await verder();
await page.fill('[name=bm_audience]', 'TEST vrouwen 30+'); await page.fill('[name=bm_link]', 'https://example.com'); await verder();
await page.locator('[data-bm-step="3"][data-bm-track="ours"] [name=bm_avoid]').fill('TEST'); await verder();
const vul = { first_name: 'Mila', last_name: 'Model', brand: 'Merk Model', phone: '0612', email: 'mila@model.test', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' };
for (const [n, v] of Object.entries(vul)) await page.fill(`[name=${n}]`, v);
await page.selectOption('[name=country]', 'NL');
await page.locator('[name=no_vat]').check({ force: true });
await page.fill('[name=reg_number]', '12345678');
await verder();
console.log('na Verder met 0612:', await page.evaluate(() => ({ stap: [...document.querySelectorAll('[data-bm-step].is-on h2')].map(h => h.textContent.trim()), actief: document.activeElement?.name, melding: document.activeElement?.validationMessage })));
// nu een e-mailadres dat de browser goedvindt en de server niet ("a@b"), om de terugweg te testen
await page.fill('[name=phone]', '06 1234 5678');
await page.fill('[name=email]', 'mila@model');
await verder();
console.log('na Verder met mila@model:', await page.evaluate(() => ({ stap: [...document.querySelectorAll('[data-bm-step].is-on h2')].map(h => h.textContent.trim()), actief: document.activeElement?.name })));
await page.fill('[name=email]', 'mila@model.test');
await verder();
// de server-terugweg: het adres buiten de browsercontrole om fout zetten (zonder input-event)
await page.evaluate(() => { document.querySelector('[name=email]').value = 'mila@model'; });
console.log('stap voor verzenden:', await page.evaluate(() => [...document.querySelectorAll('[data-bm-step].is-on h2')].map(h => h.textContent.trim())));
await page.evaluate(() => { const c = document.querySelector('[name=business_declaration]'); if (!c.checked) c.click(); });
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('form[data-bm-form] button[type=submit]').click()]);
await page.waitForTimeout(600);
console.log('terug op:', page.url().replace(SITE, ''));
console.log(await page.evaluate(() => ({
  melding: document.querySelector('.form-terug')?.textContent,
  stap: [...document.querySelectorAll('[data-bm-step].is-on h2')].map(h => h.textContent.trim()),
  route: document.querySelector('input[name=bm_track]:checked')?.value,
  audience: document.querySelector('[name=bm_audience]').value,
  phone: document.querySelector('[name=phone]').value,
  email: document.querySelector('[name=email]').value,
  actief: document.activeElement?.name,
  hp: document.querySelector('[name=company_hp]').value,
})));
await page.screenshot({ path: '/tmp/claude-0/f45.png' });
console.log(k.fouten);
process.exit(0);
