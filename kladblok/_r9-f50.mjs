// Ronde 9 · F50: abonnement zonder account — het adres zoals getypt (plus-adres), en "al een abonnement" met uitleg.
import { start, SITE, sql, sqlw } from './_dl.mjs';
const basis = `abo${Date.now() % 100000}@merk.test`;
const plus = basis.replace('@', '+tweede@');
async function aanmelden(email) {
  const k = await start(); const { page } = k;
  await page.goto(SITE + '/nl/start/plan/?plan=studio', { waitUntil: 'load' });
  const f = page.locator('main form[action="/api/plan"]');
  for (const [n, v] of Object.entries({ first_name: 'Anouk', last_name: 'Abo', email, phone: '06 1234 5678', brand: 'Merk Abo', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' })) await f.locator(`[name=${n}]`).fill(v);
  await f.locator('[name=country]').selectOption('NL');
  await page.evaluate(() => { const c = document.querySelector('[name=no_vat]'); if (!c.checked) c.click(); });
  await f.locator('[name=reg_number]').fill('12345678');
  await f.locator('[name=window_day]').selectOption('4');
  await page.evaluate(() => { const c = document.querySelector('[name=business_declaration]'); if (!c.checked) c.click(); });
  await Promise.all([page.waitForNavigation().catch(() => {}), f.locator('button[type=submit]').last().click()]);
  await page.waitForTimeout(1200);
  const uit = { url: page.url().replace(SITE, ''), melding: await page.evaluate(() => [...document.querySelectorAll('[data-plan-fout]')].filter((e) => !e.hidden).map((e) => e.textContent.trim()).join(' ')), email: await page.evaluate(() => document.querySelector('main [name=email]')?.value || ''), merk: await page.evaluate(() => document.querySelector('main [name=brand]')?.value || '') };
  await k.stop();
  return uit;
}
console.log('1 basis:', await aanmelden(basis));
// de eerste aanmelding betaald laten lijken: dan is er "al een abonnement"
await sqlw(`UPDATE subscriptions SET status='active', mollie_mandate_id='mdt_test' WHERE customer_id=(SELECT id FROM customers WHERE email='${basis}')`);
console.log('2 plus-adres:', await aanmelden(plus));
console.log('   klanten:', await sql(`SELECT id, email FROM customers WHERE email IN ('${basis}','${plus}')`));
console.log('3 basis opnieuw:', await aanmelden(basis));
process.exit(0);
