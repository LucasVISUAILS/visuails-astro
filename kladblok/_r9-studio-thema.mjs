// Ronde 9 · stap 4: Studio — donker scherm en taalwissel via de links onderaan, en ze blijven staan.
import { start, SITE, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const email = `thema${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;
await sqlw('DELETE FROM rate_limits');
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Thea', brand: 'Merk Thema' }, land: 'NL', vat: null });
if (/4478|nep-mollie/.test(page.url())) await betaal(page);
await studioLogin(page, email);
await page.goto(SITE + '/account/orders');
const stand = () => page.evaluate(() => ({ thema: document.documentElement.dataset.theme || document.documentElement.className, bg: getComputedStyle(document.body).backgroundColor, kop: document.querySelector('main h1')?.textContent.trim(), lang: document.documentElement.lang }));
console.log('begin:', JSON.stringify(await stand()));
await Promise.all([page.waitForNavigation(), page.click('a:has-text("Donker scherm")')]);
console.log('na donker:', page.url().replace(SITE, ''), JSON.stringify(await stand()));
await page.goto(SITE + '/account/invoices'); console.log('andere pagina:', JSON.stringify(await stand()));
await Promise.all([page.waitForNavigation(), page.click('a:has-text("English")')]);
console.log('na English:', page.url().replace(SITE, ''), JSON.stringify(await stand()));
await page.goto(SITE + '/account/details'); console.log('gegevens EN:', JSON.stringify(await stand()));
const terugNl = page.locator('a:has-text("Nederlands")'); if (await terugNl.count()) { await Promise.all([page.waitForNavigation(), terugNl.first().click()]); console.log('terug NL:', JSON.stringify(await stand())); }
const licht = page.locator('a:has-text("Licht scherm"), a:has-text("Light")'); if (await licht.count()) { await Promise.all([page.waitForNavigation(), licht.first().click()]); console.log('terug licht:', JSON.stringify(await stand())); }
process.exit(0);
