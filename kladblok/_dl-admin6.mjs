// Admin: merkmodel toevoegen, tegoed boeken, klant wissen (AVG).
import { start, tekst, sql, mails, mailtekst, SITE, foto, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const email = process.argv[2] || 'lever@merk.test';
const [c] = await sql(`SELECT id FROM customers WHERE email='${email}'`);
const s = await start(); const { page } = s; await adminLogin(page);
const naar = () => page.goto(SITE + `/admin/customers/${c.id}`, { waitUntil: 'load' });
// merkmodel
await naar();
const mf = page.locator(`form[action="/admin/customers/${c.id}/models"]`);
await mf.locator('input[name="label"]').fill('Lies — merkgezicht');
await mf.locator('input[type="file"]').setInputFiles(proefbeeld('model.webp'));
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), mf.locator('button[type="submit"]').click()]);
let t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log('MERKMODEL:\n' + t.slice(t.indexOf('EIGEN MODELLEN'), t.indexOf('EIGEN MODELLEN') + 500));
console.log(JSON.stringify(await sql(`SELECT id, label, status, customer_id FROM brand_models WHERE customer_id=${c.id}`).catch((e) => String(e))));
// tegoed
await naar();
const cf = page.locator(`form[action="/admin/customers/${c.id}/credits"]`);
for (const [bedrag, reden] of [['25', 'Excuus voor de late levering'], ['2000', 'typefout'], ['-10', 'Verrekend op VIS-…']]) {
  await naar();
  await cf.locator('input[name="amount"]').fill(bedrag); await cf.locator('input[name="reason"]').fill(reden);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), cf.locator('button[type="submit"]').click()]);
  t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
  const i = t.indexOf('TEGOED'); console.log(`TEGOED na ${bedrag}:\n` + t.slice(i, i + 450));
}
// wat ziet de klant in Studio van het tegoed?
const k = await start(); await studioLogin(k.page, email);
for (const pad of ['/account/', '/account/invoices/']) { await k.page.goto(SITE + pad, { waitUntil: 'load' }); const x = (await tekst(k.page, 'main')).replace(/\s+/g, ' '); console.log(pad, 'noemt tegoed:', /tegoed|€ ?15/i.test(x)); }
await k.stop();
// wissen
await naar();
const wf = page.locator(`form[action="/admin/customers/${c.id}/wipe"]`);
await wf.evaluate((f) => { let d = f.closest('details'); while (d) { d.open = true; d = d.parentElement.closest('details'); } });
console.log('WISSEN-BLOK:', (await wf.innerText()).replace(/\s+/g, ' ').slice(0, 400));
await wf.locator('input[name="confirm"]').fill('verkeerd');
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), wf.locator('button[type="submit"]').click()]);
console.log('verkeerde bevestiging →', page.url(), (await tekst(page, 'main, body')).replace(/\s+/g, ' ').slice(0, 200));
console.log(s.fouten); await s.stop();
