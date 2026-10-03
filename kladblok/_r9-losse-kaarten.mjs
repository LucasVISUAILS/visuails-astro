// Herontwerp 3 oktober 2026: de losse kaartschermen uit account.js (fout, 404, adreswijziging), licht en donker, 1280 en 390.
import { start, SITE } from './_dl.mjs';
import fs from 'node:fs';
const D = process.argv[2] || '/tmp/claude-0/losse-kaarten';
fs.mkdirSync(D, { recursive: true });
const volt = await fetch('http://localhost:4478/').then((r) => r.json()).then((j) => j.volt);
const schermen = [['404', '/account/orders/999999/bestaatniet'], ['adres', '/account/email/' + 'x'.repeat(43)], ['adres-terug', '/account/email/undo/' + 'x'.repeat(43)]];
for (const thema of ['licht', 'donker']) for (const [w, mob] of [[1280, false], [390, true]]) {
  const k = await start({ mobiel: mob, viewport: mob ? null : { width: w, height: 800 } });
  await k.ctx.addCookies([{ name: 'vis_account', value: volt.token, url: SITE }]);
  await k.page.goto(SITE + `/account?thema=${thema}`);
  for (const [n, p] of schermen) {
    const r = await k.page.goto(SITE + p); await k.page.waitForTimeout(200);
    const m = await k.page.evaluate(() => ({ scroll: document.documentElement.scrollWidth - innerWidth, h1: document.querySelector('h1')?.textContent, kaart: !!document.querySelector('.authcard') }));
    console.log(`${thema} ${w} ${n}: ${r.status()} ${JSON.stringify(m)}`);
    await k.page.screenshot({ path: `${D}/${n}-${thema}-${w}.png` });
  }
  await k.ctx.close?.();
}
process.exit(0);
