// Ronde 9 · F55: bestelling namens de klant zonder foto's → mail wijst naar Studio → klant zet ze er zelf bij.
import { start, SITE, sql, mails, mailtekst } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
import { FOTOS } from './_bestel.mjs';
const email = `wapp${Date.now() % 100000}@merk.test`;
const k = await start(); const { page, ctx } = k;
const admin = await ctx.newPage();
await adminLogin(admin);
await admin.goto(`${SITE}/admin/customers`);
await admin.evaluate((em) => { const f = document.querySelector('#nieuwe-klant form'); const v = { first_name: 'Willem', last_name: 'Wapp', email: em, phone: '0612345678', brand: 'Merk WhatsApp', vat_or_reg: '12345678', address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad' }; for (const k in v) f.elements[k].value = v[k]; f.requestSubmit(f.querySelector('button')); }, email);
await admin.waitForURL(/\/admin\/customers\/\d+/);
const voor = (await mails()).length;
await admin.evaluate(() => { const f = document.querySelector('form[action$="/order"]'); f.elements.service.value = 'catalog'; f.elements.products.value = '1'; f.requestSubmit(f.querySelector('button[type=submit],button:not([type])')); });
await admin.waitForURL(/\/admin\/orders\/\d+/);
const [o] = await sql(`SELECT id, ref FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
await page.waitForTimeout(1500);
const m = (await mails()).slice(voor).find((x) => /We hebben je bestelling/.test(x.subject));
const tekst = m ? await mailtekst(m.n) : '';
console.log('mail:', (tekst.match(/We hebben nog geen foto[^\n]*/) || ['(geen fotozin)'])[0].slice(0, 120), '|', /Foto’s toevoegen in Studio/.test(tekst));
await studioLogin(page, email);
await page.goto(`${SITE}/account/orders?order=${o.id}#order-${o.id}`);
console.log('studio blok:', await page.evaluate((id) => document.querySelector(`#order-${id} .st-fotos`)?.innerText.replace(/\s+/g, ' ').slice(0, 220) || 'geen', o.id));
await page.setInputFiles(`#order-${o.id} .st-fotos input[type=file]`, FOTOS.slice(0, 3));
await Promise.all([page.waitForNavigation(), page.click(`#order-${o.id} .st-fotos button`)]);
console.log('na upload url:', page.url().replace(SITE, ''));
console.log('melding:', await page.evaluate((id) => document.querySelector(`#order-${id} .st-melding`)?.textContent, o.id));
console.log('uploads:', await page.evaluate((id) => document.querySelectorAll(`#order-${id} .st-beelden img, #order-${id} .st-beelden a`).length, o.id), '| blok nu:', await page.evaluate((id) => document.querySelector(`#order-${id} .st-fotos p`)?.textContent, o.id));
console.log('db:', JSON.stringify(await sql(`SELECT kind, r2_key, filename FROM files WHERE order_id=${o.id}`)));
console.log('tijdlijn:', JSON.stringify(await sql(`SELECT status, note, actor FROM order_events WHERE order_id=${o.id} ORDER BY id DESC LIMIT 1`)));
await page.waitForTimeout(800);
console.log('studiomail:', (await mails()).slice(voor).map((x) => x.subject).filter((s) => /Foto/.test(s)));
// een foto openen
const src = await page.evaluate((id) => document.querySelector(`#order-${id} .st-beelden img`)?.getAttribute('src'), o.id);
if (src) { const r = await page.request.get(SITE + src); console.log('foto openen:', r.status(), r.headers()['content-type']); }
await admin.goto(`${SITE}/admin/orders/${o.id}/files`);
console.log('admin aangeleverd:', await admin.evaluate(() => [...document.querySelectorAll('summary')].map((s) => s.textContent.trim()).find((t) => /Aangeleverd/.test(t))));
// van een andere klant: weigeren
const r2 = await ctx.request.post(`${SITE}/account/orders/1/fotos`, { headers: { origin: SITE }, multipart: { fotos: { name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') } }, maxRedirects: 0 });
console.log('andermans bestelling:', r2.status(), r2.headers().location);
process.exit(0);
