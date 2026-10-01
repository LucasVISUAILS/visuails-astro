// Eigen look voor Tom aanmaken in admin (in ontwerp → actief), dan in Studio kijken.
import { start, foto, tekst, velden, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
const [c] = await sql("SELECT id, email FROM customers WHERE email='tom@foto.test'");
console.log('klant', c);
await page.goto(SITE + `/admin/customers/${c.id}`, { waitUntil: 'load' });
const t = (await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n');
console.log(t.slice(0, 4000));
await foto(page, 'admin-klant-tom', { vol: true });
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.tagName}/${e.type} ${e.name}=${(e.value||'').slice(0,30)}`).join(', '))), null, 1));
console.log(s.fouten); await s.stop();
