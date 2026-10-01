import { start, foto, tekst, mails, mailtekst, sql, paneel, SITE } from './_dl.mjs';
import { betaal } from './_bestel.mjs';
const plan = process.argv[2] || 'studio'; const term = process.argv[3] || 'monthly'; const email = process.argv[4] || 'yara@merk.test'; const uitkomst = process.argv[5] || 'paid';
const s = await start(); const { page } = s;
const voor = (await mails()).length;
await page.goto(SITE + `/nl/start/plan?plan=${plan}`, { waitUntil: 'load' });
const form = page.locator('form[action="/api/plan"]');
const klik = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); (r?.closest('label') || r)?.click(); return !!r; }, sel);
await klik(`input[name="plan"][value="${plan}"]`);
if (plan === 'maat') { await form.locator('input[name="credits"]').fill('120'); await page.dispatchEvent('input[name="credits"]', 'input'); }
await klik(`input[name="term"][value="${term}"]`);
await form.locator('select[name="window_day"]').selectOption('10');
for (const [k, v] of Object.entries({ first_name: 'Yara', last_name: 'Merk', email, phone: '0611111111', brand: 'Merk BV', address_line1: 'Teststraat 3', postal_code: '1234 AB', city: 'Teststad' })) await form.locator(`[name="${k}"]`).fill(v);
await klik('input[name="business_declaration"]'); await klik('input[name="withdrawal_consent"]');
console.log('SAMENVATTING:', (await page.evaluate(() => document.querySelector('[data-ps-maat], .ps-plaat, .ps-som, [data-ps-summary]')?.innerText || '')).replace(/\s+/g, ' ').slice(0, 400));
await foto(page, `plan-${plan}-${term}-voor`, { vol: true });
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), form.locator('button[type="submit"]').click()]);
console.log('na submit:', page.url());
console.log((await tekst(page, 'body')).replace(/\n{2,}/g, '\n').slice(0, 700));
await foto(page, `plan-${plan}-${term}-offsite`);
// offsite → mollie
const link = page.locator('a[href*="/checkout/"]');
if (await link.count()) { await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), link.first().click()]); }
else { await page.waitForTimeout(3000); }
console.log('nu op:', page.url());
if (/checkout/.test(page.url())) { console.log('betaalpagina:', (await tekst(page)).replace(/\s+/g, ' ').slice(0, 250)); console.log('terug op', await betaal(page, uitkomst)); }
console.log((await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n').slice(0, 1800));
await foto(page, `plan-${plan}-${term}-na`, { vol: true });
for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log((await mailtekst(m.n)).slice(0, 1500)); }
console.log(await sql("SELECT id, customer_id, ref, plan, term, status, window_day, amount_cents, slots_json, mollie_customer_id, mollie_subscription_id, started_at, mandate_id FROM subscriptions ORDER BY id DESC LIMIT 1"));
console.log(await sql("SELECT * FROM subscription_slots ORDER BY id DESC LIMIT 3"));
console.log(await paneel('/subs'));
console.log(s.fouten.filter(f => !/account\/me/.test(f)));
await s.stop();
