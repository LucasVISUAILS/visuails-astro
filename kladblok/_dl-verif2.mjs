import { start, foto, tekst, sql, SITE } from './_dl.mjs';
import { bestel, stapFout } from './_bestel.mjs';
const s = await start(); const { page } = s;
let fout = null;
try {
  await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email: 'henk@kledingzaak.test', first_name: 'Henk' }, land: 'NL', vat: null,
    stap3: async (p) => {
      console.log('label:', await p.locator('label[for="pl-reg"]').innerText());
      console.log('pattern:', await p.locator('#pl-reg').getAttribute('pattern'), 'inputmode:', await p.locator('#pl-reg').getAttribute('inputmode'));
      await p.fill('#pl-reg', 'REG-12345');
    } });
} catch (e) { fout = e.message; }
console.log('met REG-12345:', fout);
await foto(page, 'verif-kvk-fout');
await page.fill('.pl-step.is-current input[name="reg_number"]', '1234 5678');
const verder = await page.evaluate(() => { const b = document.querySelector('.pl-step.is-current [data-pl-next]'); b.click(); return true; });
await page.waitForTimeout(700);
console.log('na 1234 5678, stap:', await page.evaluate(() => document.querySelector('.pl-step.is-current')?.dataset.plStep), await stapFout(page));
// land naar BE: label terug
await page.goto(SITE + '/start/catalog', { waitUntil: 'load' });
console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
