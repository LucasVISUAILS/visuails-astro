// Ronde 9 · O19/O20/O22: bedanktkop bij nakijken, terugmelding /admin/vat, /admin/orders/<id>.
import { start, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
for (const u of ['akkoord', 'mislukt', 'afgewezen', 'tegoed', 'x']) {
  await page.goto(`${SITE}/admin/vat?ref=VIS-AB12-CDE%3Cb%3E&uit=${u}`, { waitUntil: 'load' });
  const r = await page.evaluate(() => { const p = document.querySelector('p.okline, p.warnline.is-rood'); return p ? p.textContent : '(geen regel)'; });
  console.log(u, '→', r);
}
const resp = await page.goto(`${SITE}/admin/orders/1`, { waitUntil: 'load' });
console.log('O22 →', page.url(), resp.status());
for (const lang of ['', '/nl']) {
  await page.goto(`${SITE}${lang}/thank-you/?ref=VIS-AB12-CDE&nakijk=1`, { waitUntil: 'load' }).catch(() => {});
  console.log('O19', lang || '/', '→', page.url(), '|', await page.evaluate(() => document.querySelector('[data-ty-title]')?.textContent), '|', await page.evaluate(() => document.querySelector('[data-ty-flow]')?.textContent.slice(0, 60)));
}
await s.close?.();
process.exit(0);
