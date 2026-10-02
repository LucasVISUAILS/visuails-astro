// Ronde 9 · klanttype 1, b): de klant die veel terugklikt — terugknop, verversen, dubbelklik op versturen.
// Plus i): de zip uit Studio openmaken (in de testomgeving, dus niets op Lucas' computer).
import { start, SITE, sql } from './_dl.mjs';
import { bestel, betaal, stap, verder, FOTOS } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
import { adminLogin } from './_admin.mjs';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const email = `terug${Date.now() % 100000}@merk.test`;
const k = await start();
const { page } = k;
const log = [];

/* 1 · Stap 2 → terugknop van de browser → waar sta je, wat is er bewaard? */
await page.goto(SITE + '/nl/start/catalog'); await page.waitForSelector('#pl-form.is-live');
await page.fill('[data-pl-qty-input]', '2'); await page.dispatchEvent('[data-pl-qty-input]', 'input');
await verder(page);
await page.locator('.pu-card:not([hidden]) .pu-slot-input').nth(0).setInputFiles(FOTOS[0]); await page.waitForTimeout(800);
const urlStap2 = page.url();
await page.goBack(); await page.waitForTimeout(1200);
log.push(`terugknop op stap 2: url ${page.url().replace(SITE, '')} (was ${urlStap2.replace(SITE, '')}), stap ${await stap(page).catch(() => '?')}, aantal ${await page.inputValue('[data-pl-qty-input]').catch(() => '?')}`);
await page.goForward(); await page.waitForTimeout(1200);
log.push(`vooruit: stap ${await stap(page).catch(() => '?')}, foto nog in vak 1: ${await page.evaluate(() => !!document.querySelector('.pu-card .pu-slot.is-filled, .pu-card [data-state="done"], .pu-slot-img:not([hidden])'))}`);

/* 2 · Verversen op stap 2. */
await page.reload(); await page.waitForSelector('#pl-form.is-live'); await page.waitForTimeout(1200);
log.push(`verversen: stap ${await stap(page)}, aantal ${await page.inputValue('[data-pl-qty-input]')}, foto's terug: ${await page.evaluate(() => document.querySelectorAll('.pu-slot-img:not([hidden])').length)}`);

/* 3 · Dubbelklik op "Bestellen en betalen": één bestelling of twee? */
const r = await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Ties', brand: 'Merk Terug' }, land: 'NL', vat: null, dubbel: true });
await page.waitForTimeout(2500);
const rijen = await sql(`SELECT ref, payment_status FROM orders WHERE email='${email}'`);
log.push(`dubbelklik: api ${r.apiStatus}, ${rijen.length} bestelling(en): ${rijen.map((x) => x.ref).join(', ')}`);
if (/4478|nep-mollie/.test(page.url())) await betaal(page);

/* 4 · Terug na betalen: de terugknop vanaf de bedankpagina. */
await page.goBack(); await page.waitForTimeout(1500);
log.push(`terug na betalen: ${page.url().replace(SITE, '')} — ${(await page.evaluate(() => document.querySelector('h1')?.textContent || '')).trim().slice(0, 80)}`);

/* 5 · Leveren en de zip openmaken. */
const [o] = await sql(`SELECT id, ref FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
const admin = await k.ctx.newPage();
await adminLogin(admin);
await admin.goto(`${SITE}/admin/orders/${o.id}/files`);
for (const shot of ['front', 'back', 'detail', 'worn']) {
  const form = admin.locator(`form:has(input[name="shot"][value="${shot}"]):has(input[name="product"][value="p1"])`).first();
  if (!(await form.count())) continue;
  await form.locator('input[type=file]').setInputFiles(FOTOS[['front', 'back', 'detail', 'worn'].indexOf(shot)]);
  await Promise.all([admin.waitForNavigation(), form.locator('button[type=submit]').click()]);
  await admin.goto(`${SITE}/admin/orders/${o.id}/files`);
}
const lever = admin.locator('form:has(button:text-matches("geleverd zetten", "i"))').first();
await Promise.all([admin.waitForNavigation(), lever.locator('button').click()]);
await studioLogin(page, email);
const zip = await page.request.get(`${SITE}/account/orders/${o.id}/zip?lang=nl`);
const buf = await zip.body();
writeFileSync('/tmp/claude-0/kb/test.zip', buf);
log.push(`zip: ${zip.status()} ${zip.headers()['content-type']} ${zip.headers()['content-disposition']} ${buf.length} bytes`);
log.push(execSync('unzip -l /tmp/claude-0/kb/test.zip').toString().trim().split('\n').slice(0, 20).join('\n'));
try { log.push('LEESMIJ:\n' + execSync('unzip -p /tmp/claude-0/kb/test.zip "*LEESMIJ*" "*README*" 2>/dev/null | head -30').toString()); } catch { /* geen leesmij */ }
console.log(log.join('\n'));
process.exit(0);
