import { start, sql, mails, mailtekst, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const OUT='/tmp/claude-0/r8'; const [id, email] = process.argv.slice(2);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); const log = (...a) => console.log('»', ...a);
const a = await start(); await adminLogin(a.page);
const s = await start();
await studioLogin(s.page, email);
await s.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
await s.page.evaluate(() => document.querySelectorAll('details.st-product').forEach((d) => { d.open = true; }));
await shot(s.page, '17-studio-na-herlevering');
/* de rest van het product goedkeuren, product voor product */
for (let i = 0; i < 3; i++) {
  const alles = s.page.locator('form.st-keur-alles button').first();
  if (!(await alles.count())) break;
  await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), alles.click()]);
}
/* en losse beelden die nog open staan */
for (let i = 0; i < 6; i++) {
  const goed = s.page.locator('button[value="approve"]').first();
  if (!(await goed.count())) break;
  await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), goed.click()]);
}
log('order', JSON.stringify(await sql(`SELECT status, closed_at FROM orders WHERE id=${id}`)));
log('staten', JSON.stringify(await sql(`SELECT review_state, count(*) n FROM files WHERE order_id=${id} AND kind='delivery' AND superseded_at IS NULL GROUP BY 1`)));
await s.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
await shot(s.page, '18-studio-afgerond');
const ster = s.page.locator('button.fb-star[value="5"]').first();
log('sterren', await s.page.locator('button.fb-star').count());
if (await ster.count()) await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), ster.click()]);
await shot(s.page, '19-studio-na-feedback');
log('feedback', JSON.stringify(await sql(`SELECT * FROM order_feedback WHERE order_id=${id}`)).slice(0, 300));
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
await shot(a.page, '20-admin-afgerond');
const tekst = await a.page.evaluate(() => document.body.innerText);
log('admin toont score', /tevreden|score|★|5\/5|5 van 5/i.test(tekst));
m = await mails(); log('laatste mails', m.slice(-4).map((x) => `${x.subject} → ${x.to}`).join(' | '));
await s.stop(); await a.stop();
