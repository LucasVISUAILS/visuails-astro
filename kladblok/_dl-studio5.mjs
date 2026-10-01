import { start, foto, tekst, sql, mails, mailtekst, SITE } from './_dl.mjs';
import { studioLogin } from './_studio.mjs';
const s = await start(); const { page } = s;
// studiobrief in de voet
for (const [naam, mail] of [['geldig', 'nieuw@merk.test'], ['dubbel', 'nieuw@merk.test'], ['ongeldig', 'geen-adres']]) {
  await page.goto(SITE + '/nl/', { waitUntil: 'load' });
  const f = page.locator('form#studiobrief-voet, form[action="/api/studiobrief"]').first();
  await f.locator('input[type="email"]').fill(mail);
  const voor = (await mails()).length;
  const [resp] = await Promise.all([page.waitForResponse((r) => /studiobrief/.test(r.url()), { timeout: 8000 }).catch(() => null), f.locator('button[type="submit"]').click()]);
  await page.waitForTimeout(1500);
  const melding = await page.evaluate(() => [...document.querySelectorAll('[data-sb-status], .sb-status, [role=status], [role=alert]')].filter(e => e.offsetParent && e.innerText.trim()).map(e => e.innerText.trim()).join(' | '));
  const invalid = await f.locator('input[type="email"]').evaluate((e) => e.validationMessage);
  console.log(`studiobrief ${naam}: api=${resp?.status()} url=${page.url()} melding="${melding}" native="${invalid}" mails=${(await mails()).slice(voor).map(m => m.subject).join(' / ')}`);
}
// login: verkeerde code
await page.goto(SITE + '/account/login?lang=nl', { waitUntil: 'load' });
await page.fill('input[type="email"]', 'henk@kledingzaak.test');
await page.click('form button[type="submit"]'); await page.waitForTimeout(1000);
await page.fill('input[name="code"], input[inputmode="numeric"]', '000000');
await Promise.all([page.waitForNavigation().catch(() => {}), page.click('form button[type="submit"]')]);
console.log('verkeerde code →', page.url(), (await tekst(page, 'main')).replace(/\n{2,}/g, ' / ').slice(0, 300));
// onbekend adres
await page.goto(SITE + '/account/login?lang=nl', { waitUntil: 'load' });
await page.fill('input[type="email"]', 'onbekend@nergens.test');
const m0 = (await mails()).length;
await page.click('form button[type="submit"]'); await page.waitForTimeout(1000);
console.log('onbekend adres →', page.url(), (await tekst(page, 'main')).replace(/\n{2,}/g, ' / ').slice(0, 300), 'mails:', (await mails()).slice(m0).map(m => m.subject));
// echte login + facturen-pdf
console.log('login', await studioLogin(page, 'henk@kledingzaak.test'));
await page.goto(SITE + '/account/invoices/', { waitUntil: 'load' });
const hrefs = await page.locator('a:has-text("PDF"), a[href*="pdf"]').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
console.log('pdf-links', hrefs);
for (const h of hrefs.slice(0, 2)) { const r = await page.request.get(SITE + h); console.log(h, r.status(), r.headers()['content-type'], r.headers()['content-disposition'], (await r.body()).slice(0, 5).toString()); }
// gegevens opslaan
await page.goto(SITE + '/account/details/', { waitUntil: 'load' });
console.log('GEGEVENS:', (await tekst(page, 'main')).replace(/\n{2,}/g, ' / ').slice(0, 600));
// uitloggen
const uit = page.locator('form[action="/account/logout"] button, a[href="/account/logout"]').first();
console.log('uitlogknop', await uit.count());
if (await uit.count()) { await Promise.all([page.waitForNavigation(), uit.click()]); console.log('na uitloggen', page.url()); await page.goto(SITE + '/account/', { waitUntil: 'load' }); console.log('daarna /account →', page.url()); }
console.log(s.fouten.filter(x => !/account\/me/.test(x))); await s.stop();
