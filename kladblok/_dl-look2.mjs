import { start, foto, tekst, sql, mails, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
const cid = 7011;
async function maakLook(status) {
  await page.goto(SITE + `/admin/customers/${cid}?look=7096`, { waitUntil: 'load' });
  const f = page.locator(`form[action="/admin/customers/${cid}/styles"]`);
  console.log('request_order_id:', await f.locator('[name="request_order_id"]').inputValue());
  await f.locator('[name="name"]').fill('Tom Warm Atelier');
  await f.locator('[name="service"]').selectOption('lifestyle');
  await f.locator('[name="description"]').fill('Warm licht, houten atelier, zachte schaduw');
  await f.locator('[name="surcharge"]').fill('10');
  await f.locator('[name="status"]').selectOption(status);
  await f.locator('[name="prompt_note"]').fill('warm tungsten, oak workbench');
  try { await f.locator('[name="preview"]').setInputFiles(proefbeeld('look.webp')); } catch (e) { console.log('geen voorbeeld', e.message); }
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), f.locator('button[type="submit"]').click()]);
  console.log('na look →', page.url());
  const t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
  console.log(t.slice(t.indexOf('EIGEN LOOKS'), t.indexOf('EIGEN LOOKS') + 900));
}
await maakLook('proposed');
console.log(JSON.stringify(await sql('SELECT * FROM customer_styles')).slice(0, 800));
// klant kijkt in Studio
const s2 = await start(); const p2 = s2.page;
console.log('studio:', await studioLogin(p2, 'tom@foto.test'));
const st = (await tekst(p2, 'main')).replace(/\n{2,}/g, '\n');
console.log('STUDIO OVERZICHT:\n' + st.slice(0, 2500));
await foto(p2, 'studio-tom', { vol: true });
for (const pad of ['/account/brand', '/account/brandkit', '/account/merk', '/account/looks']) {
  const r = await p2.goto(SITE + pad, { waitUntil: 'load' }); if (r.status() === 200) { console.log(`\n${pad}:\n` + (await tekst(p2, 'main')).replace(/\n{2,}/g, '\n').slice(0, 1500)); await foto(p2, 'studio-tom' + pad.replace(/\W/g, '-'), { vol: true }); }
}
console.log(p2.url(), JSON.stringify(await p2.evaluate(() => [...document.querySelectorAll('nav a, .acc-nav a, aside a')].map(a => a.textContent.trim() + ' ' + a.getAttribute('href')))));
console.log(s.fouten, s2.fouten); await s2.stop(); await s.stop();
