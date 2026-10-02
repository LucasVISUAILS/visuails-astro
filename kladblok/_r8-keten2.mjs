/* Ronde 8 — keten deel 2: admin zet op geleverd, klant keurt in Studio, vraagt revisie. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const OUT = '/tmp/claude-0/r8';
const [id, email] = process.argv.slice(2);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
const geleverd = a.page.locator('button:has-text("geleverd zetten")');
log('geleverd-knop', await geleverd.count());
if (await geleverd.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), geleverd.first().click()]);
log('status', JSON.stringify(await sql(`SELECT status, closed_at FROM orders WHERE id=${id}`)));
const m = await mails(); const laatste = m[m.length - 1]; log('mail', laatste?.subject, laatste?.to);
const t = await mailtekst(laatste.n); log('mailtekst', String(t).replace(/\s+/g, ' ').slice(0, 600));

const s = await start({ mobiel: true });
await studioLogin(s.page, email);
await s.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
await shot(s.page, '07-studio-geleverd-mobiel');
const d = await start();
await studioLogin(d.page, email);
await d.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
await shot(d.page, '08-studio-geleverd-desktop');
await d.page.goto(SITE + `/account`, { waitUntil: 'load' }); await shot(d.page, '09-studio-overzicht');
await s.stop(); await d.stop(); await a.stop();
