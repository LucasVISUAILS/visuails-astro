// Ronde 9 · F54: land bij een klant via /admin — keuzelijst, geen "Ne" (Niger), en achteraf te corrigeren.
import { start, SITE, sql } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const email = `whatsapp${Date.now() % 100000}@merk.test`;
const k = await start(); const { page, ctx } = k;
await adminLogin(page);
await page.goto(`${SITE}/admin/customers`);
const keuze = await page.evaluate(() => { const s = document.querySelector('#nieuwe-klant select[name=country]'); return s ? `${s.value} · ${s.options.length} landen` : 'geen select'; });
console.log('nieuwe klant, land:', keuze);
// oude manier (tekst "NE") gaat niet meer door
const r = await ctx.request.post(`${SITE}/admin/customers/new`, { headers: { origin: SITE }, form: { first_name: 'Willem', last_name: 'Wapp', email, phone: '0612345678', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', country: 'NE' }, maxRedirects: 0 });
console.log('POST country=NE:', r.status(), (await r.text()).match(/staat niet in de landenlijst[^<]*/)?.[0]);
console.log('klant aangemaakt?', JSON.stringify(await sql(`SELECT id FROM customers WHERE email='${email}'`)));
// via het formulier
await page.evaluate((em) => { const f = document.querySelector('#nieuwe-klant form'); const v = { first_name: 'Willem', last_name: 'Wapp', email: em, phone: '0612345678', brand: 'Merk WhatsApp', vat_or_reg: '12345678', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' }; for (const k in v) f.elements[k].value = v[k]; f.requestSubmit(f.querySelector('button')); }, email);
await page.waitForURL(/\/admin\/customers\/\d+/); 
console.log('kop:', await page.evaluate(() => document.querySelector('main .lede')?.textContent));
const [c] = await sql(`SELECT id, country FROM customers WHERE email='${email}'`);
console.log('db land:', c.country);
// achteraf corrigeren: naar Duitsland en weer terug
await page.evaluate(() => { const f = document.querySelector('form[action$="/details"]'); f.closest('details').open = true; f.elements.country.value = 'DE'; f.elements.city.value = 'Teststadt'; f.requestSubmit(f.querySelector('button')); });
await page.waitForLoadState('load'); await page.waitForTimeout(800);
console.log('na corrigeren:', JSON.stringify(await sql(`SELECT country, city, billing_address FROM customers WHERE id=${c.id}`)), '| kop:', await page.evaluate(() => document.querySelector('main .lede')?.textContent));
await sql(`UPDATE customers SET country='NE' WHERE id=${c.id}`).catch(() => {});
process.exit(0);
