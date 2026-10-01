// Btw-controle in /admin: elke wachtende bestelling goedkeuren → betaallink → klant betaalt.
import { start, foto, tekst, mails, mailtekst, sql, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { betaal } from './_bestel.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
await page.goto(SITE + '/admin/vat', { waitUntil: 'load' });
console.log('BTW-CONTROLE:\n' + (await tekst(page, 'body')).replace(/\n{2,}/g, '\n').slice(0, 3500));
await foto(page, 'admin-vat', { vol: true });
console.log(await page.evaluate(() => [...document.querySelectorAll('form[action*="/vat"]')].map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].map((e) => `${e.tagName}/${e.type} ${e.name}=${e.value}`).join(', '))));
console.log(s.fouten);
await s.stop();
