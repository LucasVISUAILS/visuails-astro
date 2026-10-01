import { start, foto, velden, tekst, mails, mailtekst, sql, SITE } from './_dl.mjs';
import { betaal } from './_bestel.mjs';
const s = await start(); const { page } = s;
const voor = (await mails()).length;
await page.goto(SITE + '/nl/start/brand-model', { waitUntil: 'load' });
const form = page.locator('form[action="/api/order"]');
const stapTekst = async () => (await page.evaluate(() => document.querySelector('[data-bm-step].is-current, .bm-step.is-current, .is-current')?.innerText || ''));
const verder = async () => { const b = form.locator('button:visible:has-text("VERDER"), button:visible:has-text("Verder")'); await b.last().click(); await page.waitForTimeout(500); };
const klik = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel); (r?.closest('label') || r)?.click(); }, sel);
await klik('input[name="bm_track"][value="ours"]'); await verder();
console.log('STAP 2 zichtbaar:', (await velden(page, 'form[action="/api/order"]')).filter(v => v.zichtbaar && v.tag !== 'button').map(v => v.name).join(', '));
await form.locator('[name="bm_audience"]').fill('Vrouwen 25-40 die duurzame basics kopen.');
await form.locator('[name="bm_link"]').fill('https://merk.test');
await klik('input[name="bm_usage"][value="both"]');
await verder();
console.log('STAP 3 zichtbaar:', (await velden(page, 'form[action="/api/order"]')).filter(v => v.zichtbaar && v.tag !== 'button').map(v => v.name).join(', '));
for (const [n, v] of [['bm_presentation', 'open'], ['bm_age', '25-35'], ['bm_build', 'open']]) await klik(`input[name="${n}"][value="${v}"]`);
await verder();
console.log('STAP 4 zichtbaar:', (await velden(page, 'form[action="/api/order"]')).filter(v => v.zichtbaar && v.tag !== 'button').map(v => v.name).join(', '));
for (const [k, v] of Object.entries({ first_name: 'Yara', last_name: 'Merk', brand: 'Merk BV', phone: '0611111111', email: 'yara@merk.test', address_line1: 'Teststraat 2', postal_code: '1234 AB', city: 'Teststad' })) { const f = form.locator(`[name="${k}"]:visible`); if (await f.count()) await f.first().fill(v); else console.log('geen', k); }
await form.locator('select[name="country"]:visible').selectOption('NL');
await form.locator('[name="vat"]:visible').fill('NL123456789B01');
await verder();
console.log('STAP 5:', (await tekst(page, 'form[action="/api/order"]')).replace(/\n{2,}/g, '\n').slice(-1800));
for (const nm of ['business_declaration', 'withdrawal_consent']) await klik(`input[name="${nm}"]`);
await foto(page, 'bm-stap5', { vol: true });
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('nav →', f.url()); }); console.log('ongeldig:', await form.evaluate((f) => [...f.elements].filter((e) => e.willValidate && !e.checkValidity()).map((e) => e.name + ':' + e.validationMessage))); page.on('request', (r) => { if (!/\.(css|js|webp|svg|woff2|png|avif)/.test(r.url())) console.log('req', r.method(), r.url(), r.resourceType()); }); page.on('response', (r) => { if (/api\/order|nep-mollie/.test(r.url())) console.log('resp', r.status(), r.url(), r.headers()['location'] || ''); }); const resp = null; await form.locator('button[type="submit"]:visible').first().click(); await page.waitForTimeout(5000);
await page.waitForTimeout(1500);
console.log('api:', resp?.status(), 'url:', page.url());
if (/checkout/.test(page.url())) { console.log('betaalpagina:', (await tekst(page)).replace(/\s+/g, ' ').slice(0, 200)); console.log('terug op', await betaal(page, 'paid')); }
console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 800));
for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log((await mailtekst(m.n)).slice(0, 700)); }
console.log(await sql("SELECT id, ref, service, status, payment_status, total_cents, vat_cents FROM orders ORDER BY id DESC LIMIT 1"));
console.log(s.fouten.filter(f => !/account\/me/.test(f)));
await s.stop();
