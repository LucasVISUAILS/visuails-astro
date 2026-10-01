import { start, foto, tekst, sql, sqlw, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
import { bestel, betaal } from './_bestel.mjs';
const s2 = await start(); const p2 = s2.page;
await studioLogin(p2, 'tom@foto.test');
await p2.goto(SITE + '/account/brand-kit/', { waitUntil: 'load' });
console.log('BRAND KIT (in ontwerp):\n' + (await tekst(p2, 'main')).replace(/\n{2,}/g, '\n').slice(0, 1800));
await foto(p2, 'studio-tom-brandkit-ontwerp', { vol: true });
// admin: actief maken
const s = await start(); const { page } = s;
await adminLogin(page);
await page.goto(SITE + '/admin/customers/7011', { waitUntil: 'load' });
const mf = page.locator('form[action$="/manage"][action^="/admin/styles/"]').first();
await mf.locator('[name="status"]').selectOption('active');
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), mf.locator('button[type="submit"]:has-text("Opslaan")').click()]);
console.log(JSON.stringify(await sql('SELECT id, status FROM customer_styles')));
await p2.goto(SITE + '/account/brand-kit/', { waitUntil: 'load' });
console.log('BRAND KIT (actief):\n' + (await tekst(p2, 'main')).replace(/\n{2,}/g, '\n').slice(0, 1200));
await foto(p2, 'studio-tom-brandkit-actief', { vol: true });
// bestelformulier lifestyle: staat de look erbij?
const href = await p2.locator('a:has-text("Bestel in deze look")').first().getAttribute('href'); console.log('href', href);
await p2.goto(SITE + href, { waitUntil: 'load' });
await p2.waitForTimeout(1500);
const looks = await p2.evaluate(() => [...document.querySelectorAll('input[name="style"]')].map((r) => `${r.value}${r.checked ? '*' : ''} :: ${(r.closest('label')?.innerText || '').replace(/\s+/g, ' ').slice(0, 80)} ${r.closest('[hidden]') ? '(verborgen)' : ''}`));
console.log('LOOKS lifestyle:', looks);
const eigen = looks.find((l) => l.startsWith('cs-'));
if (eigen) {
  const r = await bestel(p2, { pad: href, aantal: 2, look: eigen.split(' ')[0].replace('*', ''), klant: { email: 'tom@foto.test', first_name: 'Tom', last_name: 'Foto', brand: 'Tom Foto' }, land: 'DE', vat: 'DE123456789' });
  console.log(r.log.join('\n')); console.log('OVERZICHT:\n' + r.overzicht.slice(0, 1500)); console.log(r.apiStatus, r.url);
  if (/nep-mollie/.test(p2.url())) { console.log(await betaal(p2)); await p2.waitForTimeout(4000); }
  console.log(JSON.stringify(await sql("SELECT id, ref, service, total_cents, vat_cents, vat_treatment, payment_status, json_extract(details_json,'$.style') st, json_extract(details_json,'$.style_surcharge_cents') sc FROM orders ORDER BY id DESC LIMIT 1")));
}
console.log(s.fouten, s2.fouten.filter(x=>!/account\/me/.test(x))); await s.stop(); await s2.stop();
