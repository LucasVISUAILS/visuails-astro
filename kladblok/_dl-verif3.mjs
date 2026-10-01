import { start, tekst, sql, mails, SITE, foto, paneel } from './_dl.mjs';
import { verder } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const s = await start(); const { page } = s;
// 1 studiobrief
await page.goto(SITE + '/nl/', { waitUntil: 'load' }); await page.waitForTimeout(800);
const f = page.locator('form[data-studiobrief]').last(); await f.scrollIntoViewIfNeeded();
await f.locator('input[type="email"]').fill('brief@merk.test');
const [r] = await Promise.all([page.waitForResponse((x) => /studiobrief/.test(x.url())), f.locator('button[type="submit"]').click()]);
await page.waitForTimeout(1000);
console.log('1 studiobrief', r.status(), await f.evaluate((x) => x.className + ' | ' + [...x.querySelectorAll('.sb-ok,.sb-fout')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.innerText).join('')));
// 2 kapotte jpg
await page.goto(SITE + '/nl/start/catalog', { waitUntil: 'load' }); await page.waitForSelector('#pl-form.is-live');
await page.fill('[data-pl-qty-input]', '1'); await page.dispatchEvent('[data-pl-qty-input]', 'change'); await verder(page);
await page.locator('.pu-card:not([hidden]) .pu-slot-input').nth(0).setInputFiles('/tmp/claude-0/dl/nep.jpg'); await page.waitForTimeout(2500);
console.log('2 kapotte jpg:', (await tekst(page, '.pu-card:not([hidden]) .pu-slot')).replace(/\s+/g, ' ').slice(0, 160));
// 3 abonnement mislukt
await page.goto(SITE + '/nl/start/plan?plan=starter', { waitUntil: 'load' });
const form = page.locator('form[action="/api/plan"]');
const klik = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); (r?.closest('label') || r)?.click(); }, sel);
await klik('input[name="plan"][value="starter"]'); await klik('input[name="term"][value="monthly"]');
await form.locator('select[name="window_day"]').selectOption('10');
for (const [k, v] of Object.entries({ first_name: 'Mis', last_name: 'Lukt', email: 'mis@merk.test', phone: '0611111111', brand: 'Mis BV', address_line1: 'Teststraat 3', postal_code: '1234 AB', city: 'Teststad' })) await form.locator(`[name="${k}"]`).fill(v);
await klik('input[name="business_declaration"]'); await klik('input[name="withdrawal_consent"]');
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), form.locator('button[type="submit"]').click()]);
const link = page.locator('a[href*="/checkout/"]'); if (await link.count()) await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), link.first().click()]); else await page.waitForTimeout(3000);
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('button[data-pay="failed"]')]);
await page.waitForTimeout(800);
console.log('3 na mislukte betaling:', page.url(), '\n  ', (await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 330));
await foto(page, 'verif-abo-mislukt');
const s2 = await start(); await studioLogin(s2.page, 'mis@merk.test');
await s2.page.goto(SITE + '/account/plan/', { waitUntil: 'load' });
const t = (await tekst(s2.page, 'main')).replace(/\s+/g, ' ');
console.log('  studio:', (t.match(/Je eerste betaling[^.]*\.[^.]*\./) || ['(geen melding)'])[0], '| knop:', await s2.page.locator('a:has-text("Opnieuw aanmelden")').getAttribute('href').catch(() => '-'), '| credits op?', /credits voor deze maand zijn op/.test(t));
// opnieuw aanmelden
await page.goto(SITE + '/nl/start/plan?plan=starter', { waitUntil: 'load' });
await klik('input[name="plan"][value="starter"]'); await klik('input[name="term"][value="monthly"]');
await form.locator('select[name="window_day"]').selectOption('10');
for (const [k, v] of Object.entries({ first_name: 'Mis', last_name: 'Lukt', email: 'mis@merk.test', phone: '0611111111', brand: 'Mis BV', address_line1: 'Teststraat 3', postal_code: '1234 AB', city: 'Teststad' })) await form.locator(`[name="${k}"]`).fill(v);
await klik('input[name="business_declaration"]'); await klik('input[name="withdrawal_consent"]');
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), form.locator('button[type="submit"]').click()]);
const link2 = page.locator('a[href*="/checkout/"]'); if (await link2.count()) await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), link2.first().click()]); else await page.waitForTimeout(3000);
console.log('  tweede poging →', page.url());
if (/checkout/.test(page.url())) { await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('button[data-pay="paid"]')]); await page.waitForTimeout(800); console.log('  na betalen:', (await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 140)); }
console.log('  rijen:', JSON.stringify(await sql("SELECT s.ref, s.status, s.cancel_reason FROM subscriptions s JOIN customers c ON c.id=s.customer_id WHERE c.email='mis@merk.test'")));
console.log(s.fouten.filter(x => !/account\/me/.test(x)), s2.fouten); await s2.stop(); await s.stop();
