/* Keten deel 4c: de klant keurt de rest goed via de link uit de herleveringsmail
   (het portaal, zonder inloggen), de bestelling sluit, de tevredenheidsvraag. */
import { start, sql, mails, mailtekst, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const OUT = '/tmp/claude-0/r8'; const [id] = process.argv.slice(2);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);
const lijst = await mails(); const m = [...lijst].reverse().find((x) => /revisie staat klaar/i.test(x.subject));
const link = (String(await mailtekst(m.n)).match(/http:\/\/localhost:4477\/o\/[A-Za-z0-9_-]+/) || [])[0];
log('link', link);
const s = await start({ mobiel: true });
await s.page.goto(link.replace('http://localhost:4477', SITE), { waitUntil: 'load' });
await shot(s.page, '17-portaal-na-herlevering-mobiel');
const knoppen = await s.page.evaluate(() => [...document.querySelectorAll('form button')].map((b) => `${b.name}=${b.value}:${b.textContent.trim().slice(0, 30)}`).slice(0, 20));
log('knoppen', knoppen.join(' | '));
for (let i = 0; i < 12; i++) {
  const alles = s.page.locator('button:has-text("Alles goedkeuren"), button:has-text("alles goedkeuren"), button[value="approve-all"], button[value="approve-order"]').first();
  if (await alles.count()) { await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), alles.click()]); continue; }
  const goed = s.page.locator('button[value="approve"]').first();
  if (!(await goed.count())) break;
  await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), goed.click()]);
}
log('order', JSON.stringify(await sql(`SELECT status, closed_at FROM orders WHERE id=${id}`)));
log('staten', JSON.stringify(await sql(`SELECT review_state, count(*) n FROM files WHERE order_id=${id} AND kind='delivery' AND superseded_at IS NULL GROUP BY 1`)));
await shot(s.page, '18-portaal-afgerond-mobiel');
const ster = s.page.locator('button.fb-star[value="5"]').first();
log('sterren', await s.page.locator('button.fb-star').count());
if (await ster.count()) await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), ster.click()]);
await shot(s.page, '19-portaal-na-feedback');
log('feedback', JSON.stringify(await sql(`SELECT * FROM order_feedback WHERE order_id=${id}`)).slice(0, 300));
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
await shot(a.page, '20-admin-afgerond');
const tekst = await a.page.evaluate(() => document.body.innerText);
log('admin regel score', (tekst.match(/.*(tevreden|score).*/i) || [''])[0].slice(0, 120));
const ms = await mails(); log('laatste mails', ms.slice(-3).map((x) => `${x.subject} → ${x.to}`).join(' | '));
await s.stop(); await a.stop();
