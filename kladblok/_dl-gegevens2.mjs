import { start, tekst, sql, SITE, foto } from './_dl.mjs';
import { studioLogin } from './_studio.mjs';
const s = await start(); const { page } = s;
await studioLogin(page, 'lever@merk.test');
async function bewaar(vul, naam) {
  await page.goto(SITE + '/account/details/', { waitUntil: 'load' });
  const f = page.locator('form:has([name="phone"])').first();
  for (const [k, v] of Object.entries(vul)) { const el = f.locator(`[name="${k}"]`); if (!(await el.count())) { console.log('geen veld', k); continue; } if ((await el.evaluate((e) => e.tagName)) === 'SELECT') await el.selectOption(v); else await el.fill(v); }
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), f.locator('button[type="submit"]').first().click()]);
  await page.waitForTimeout(500);
  const melding = await page.evaluate(() => [...document.querySelectorAll('[role=status], [role=alert], .st-melding, .st-fout, .st-gelukt')].filter((e) => e.offsetParent).map((e) => e.innerText.trim()).join(' | '));
  const native = await f.evaluate((form) => [...form.elements].filter((e) => e.validationMessage).map((e) => `${e.name}: ${e.validationMessage}`).join(' | ')).catch(() => '');
  console.log(`${naam}: ${page.url()} melding="${melding}" native="${native}"`);
  await foto(page, 'gegevens-' + naam);
}
console.log('velden:', await page.goto(SITE + '/account/details/').then(() => page.locator('form:has([name="phone"]) [name]').evaluateAll((a) => a.map((e) => `${e.name}${e.required ? '*' : ''}`).join(', '))));
await bewaar({ phone: '0698765432', address_line1: 'Proeflaan 9', postal_code: '9999 ZZ', city: 'Proefdorp' }, 'adres');
console.log(JSON.stringify(await sql("SELECT phone, address_line1, postal_code, city, country, vat_number FROM customers WHERE email='lever@merk.test'")));
await bewaar({ country: 'DE', vat: 'NL123' }, 'btw-fout');
await bewaar({ country: 'DE', vat: 'DE123456789' }, 'btw-goed');
console.log(JSON.stringify(await sql("SELECT phone, address_line1, postal_code, city, country, vat_number FROM customers WHERE email='lever@merk.test'")));
await bewaar({ first_name: '' }, 'leeg-verplicht');
console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
