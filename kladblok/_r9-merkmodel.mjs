// Ronde 9 · klanttype 8: merkmodel vastleggen → klant gemaild, bestelling af (F48); briefing en naam in admin (F47, F49).
import { start, SITE, sql, sqlw, mails, mailtekst } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { adminLogin } from './_admin.mjs';
const email = `model${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;
// merkmodel bestellen via het formulier
await page.goto(SITE + '/nl/start/brand-model', { waitUntil: 'load' });
const verder = () => page.locator('[data-bm-next]').click();
await page.locator('input[name=bm_track][value=ours]').check({ force: true }); await verder();
await page.fill('[name=bm_audience]', 'TEST vrouwen 30+'); await page.fill('[name=bm_link]', 'https://example.com');
await page.locator('input[name=bm_usage][value=both]').check({ force: true }); await verder();
await page.locator('[data-bm-step="3"][data-bm-track="ours"] [name=bm_avoid]').fill('TEST geen make-up'); await verder();
for (const [n, v] of Object.entries({ first_name: 'Mila', last_name: 'Model', brand: 'Merk Model', phone: '06 1234 5678', email, address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' })) await page.fill(`[name=${n}]`, v);
await page.selectOption('[name=country]', 'NL'); await page.locator('[name=no_vat]').check({ force: true }); await page.fill('[name=reg_number]', '12345678');
await verder();
console.log('stap 5:', await page.evaluate(() => [...document.querySelectorAll('[data-bm-step].is-on h2')].map(h => h.textContent.trim())));
await page.evaluate(() => { const c = document.querySelector('[name=business_declaration]'); if (!c.checked) c.click(); });
const [resp] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/order') && r.request().method() === 'POST'), page.locator('form[data-bm-form] button[type=submit]').click()]);
const loc = resp.headers().location;
console.log('api/order →', resp.status(), loc);
await page.goto(loc, { waitUntil: 'load' }).catch(() => {});
await page.waitForTimeout(500);
if (!/checkout/.test(page.url())) await page.goto(loc, { waitUntil: 'load' });
await betaal(page);
await page.waitForTimeout(1200);
console.log('bedankt:', page.url().replace(SITE, ''), '|', await page.evaluate(() => document.querySelector('[data-ty-flow]')?.textContent.slice(0, 90)), '| levertijd zichtbaar:', await page.evaluate(() => [...document.querySelectorAll('dd[data-ty-timing]')].some((d) => !(d.closest('.ty-row') || d).hidden)));
const [o] = await sql(`SELECT id, customer_id, ref, status FROM orders WHERE email='${email}'`);
const a = await start(); await adminLogin(a.page);
await a.page.goto(`${SITE}/admin/orders/${o.id}/files`, { waitUntil: 'load' });
console.log('briefing in admin:', await a.page.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((x) => /Briefing merkmodel/.test(x.textContent)); return h ? h.nextElementSibling.innerText.replace(/\s+/g, ' ').slice(0, 200) : '(geen)'; }));
// model aanmaken met foto, vastleggen
await a.page.goto(`${SITE}/admin/customers/${o.customer_id}`, { waitUntil: 'load' });
const f = a.page.locator(`form[action="/admin/customers/${o.customer_id}/models"]`);
await f.locator('[name=label]').fill('Mila (TEST)');
await f.locator('[name=preview]').setInputFiles('/tmp/claude-0/dl/voor.jpg');
await Promise.all([a.page.waitForNavigation(), f.locator('button[type=submit]').click()]);
const [m] = await sql(`SELECT id FROM custom_models WHERE customer_id=${o.customer_id} ORDER BY id DESC LIMIT 1`);
const voor = (await mails()).length;
const sf = a.page.locator(`form[action="/admin/models/${m.id}/status"]`);
await sf.locator('[name=status]').selectOption('locked');
await Promise.all([a.page.waitForNavigation(), sf.locator('button[type=submit]').click()]);
for (const mm of (await mails()).slice(voor)) console.log(`MAIL → ${mm.to} "${mm.subject}"`, (await mailtekst(mm.n)).replace(/\s+/g, ' ').slice(0, 260));
console.log('bestelling nu:', await sql(`SELECT status, closed_at IS NOT NULL AS af FROM orders WHERE id=${o.id}`));
// nogmaals vastleggen: geen tweede mail
const voor2 = (await mails()).length;
await sf.locator('[name=status]').selectOption('locked').catch(() => {});
await Promise.all([a.page.waitForNavigation(), a.page.locator(`form[action="/admin/models/${m.id}/status"] button[type=submit]`).click()]);
console.log('tweede keer vastleggen, nieuwe mails:', (await mails()).length - voor2);
// een catalogbestelling met dit model: admin toont naam
await sql(`SELECT 1`);
await sqlw(`UPDATE orders SET details_json = json_set(COALESCE(details_json,'{}'), '$.model', 'c${m.id}') WHERE id = ${o.id}`);
await sqlw(`UPDATE orders SET service='catalog', product_count=1 WHERE id = ${o.id}`);
await a.page.goto(`${SITE}/admin/orders/${o.id}/files`, { waitUntil: 'load' });
console.log('gezicht in admin:', await a.page.evaluate(() => { const dt = [...document.querySelectorAll('dt')].find((d) => d.textContent.trim() === 'Gezicht'); return dt ? dt.nextElementSibling.innerHTML.replace(/\s+/g, ' ').slice(0, 200) : '(geen)'; }));
process.exit(0);
