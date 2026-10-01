import fs from 'node:fs';
import { start, foto, tekst, sql, SITE } from './_dl.mjs';
import { verder, stap, stapFout, FOTOS } from './_bestel.mjs';
const s = await start(); const { page } = s;
fs.writeFileSync('/tmp/claude-0/dl/nep.txt', 'geen foto');
fs.writeFileSync('/tmp/claude-0/dl/nep.jpg', 'dit is geen jpeg');
const groot = '/tmp/claude-0/dl/groot.jpg'; if (!fs.existsSync(groot)) { const b = Buffer.alloc(31 * 1024 * 1024, 7); fs.copyFileSync(FOTOS[0], groot); fs.appendFileSync(groot, b); }
await page.goto(SITE + '/nl/start/catalog', { waitUntil: 'load' }); await page.waitForSelector('#pl-form.is-live');
await page.fill('[data-pl-qty-input]', '1'); await page.dispatchEvent('[data-pl-qty-input]', 'change'); await verder(page);
const slot = page.locator('.pu-card:not([hidden]) .pu-slot-input');
for (const [naam, f] of [['txt', '/tmp/claude-0/dl/nep.txt'], ['kapotte jpg', '/tmp/claude-0/dl/nep.jpg'], ['31MB', groot]]) {
  await slot.nth(0).setInputFiles(f); await page.waitForTimeout(2500);
  const m = await page.evaluate(() => [...document.querySelectorAll('.pu-card:not([hidden]) [role=alert], .pu-card:not([hidden]) .pu-slot-err, .pu-card:not([hidden]) .pu-err, .pu-card:not([hidden]) .is-error')].filter(e => e.offsetParent).map(e => e.innerText.trim()).join(' | '));
  const kaart = (await tekst(page, '.pu-card:not([hidden]) .pu-slot')).replace(/\s+/g, ' ').slice(0, 200);
  console.log(`${naam}: melding="${m}" slot="${kaart}"`);
  await foto(page, `fout-upload-${naam.replace(/\W/g, '')}`);
}
// stap 2 zonder foto's → verder
try { await verder(page); console.log('stap 2 zonder fotos ging door!'); } catch (e) { console.log('stap2 leeg:', e.message); }
console.log(s.fouten); await s.stop();
