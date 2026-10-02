/* Admin levert een bestelling: elk vak een beeld, dan op geleverd. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const id = process.argv[2]; const log = (...a) => console.log('»', ...a);
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
const vakken = await a.page.evaluate(() => [...document.querySelectorAll('form[action$="/deliver"]')].map((f) => ({ p: f.querySelector('[name=product]')?.value, s: f.querySelector('[name=shot]')?.value })).filter((x) => x.p && x.s));
log('vakken', vakken.length);
for (const v of vakken) {
  const f = a.page.locator(`form[action$="/deliver"]:has(input[name=product][value="${v.p}"]):has(input[name=shot][value="${v.s}"])`).first();
  await f.locator('input[type=file]').setInputFiles(proefbeeld(`l-${v.p}-${v.s}.webp`));
  const knop = f.locator('button[type=submit]');
  if (await knop.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), knop.first().click()]);
  else await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), f.evaluate((el) => el.requestSubmit())]);
}
const g = a.page.locator('button:has-text("geleverd zetten")');
if (await g.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), g.first().click()]);
log('na', a.page.url().replace(SITE, ''), JSON.stringify(await sql(`SELECT status, delivery_mailed_at IS NOT NULL AS gemaild FROM orders WHERE id=${id}`)));
const m = (await mails()).slice(-1)[0]; log('mail', m.subject, JSON.stringify(m.to), String(await mailtekst(m.n)).replace(/\s+/g, ' ').slice(0, 300));
await a.page.screenshot({ path: `/tmp/claude-0/r8/31-admin-lever-${id}.png`, fullPage: true });
await a.stop();
