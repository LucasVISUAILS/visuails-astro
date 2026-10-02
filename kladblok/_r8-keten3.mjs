/* Ronde 8 — keten deel 3: product 1 in één keer goed, één beeld van product 2
   aanmerken en de revisieronde versturen; admin bekijkt de revisie. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const OUT = '/tmp/claude-0/r8';
const [id, email] = process.argv.slice(2);
const shot = (p, n, vol = true) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: vol });
const log = (...a) => console.log('»', ...a);
const s = await start();
await studioLogin(s.page, email);
await s.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
/* product 1 open en "alles goed" */
await s.page.evaluate(() => document.querySelectorAll('details.st-product').forEach((d, i) => { if (i === 0) d.open = true; }));
await shot(s.page, '10-studio-product-open');
const alles = s.page.locator('form.st-keur-alles button').first();
log('alles-goed per product', await alles.count());
if (await alles.count()) await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), alles.click()]);
log('na product 1', JSON.stringify(await sql(`SELECT product_key, review_state, count(*) n FROM files WHERE order_id=${id} AND kind='delivery' AND superseded_at IS NULL GROUP BY 1,2`)));
await s.page.goto(SITE + `/account/orders?order=${id}#order-${id}`, { waitUntil: 'load' });
await s.page.evaluate(() => document.querySelectorAll('details.st-product').forEach((d) => { d.open = true; }));
/* één beeld van product 2 aanmerken met notitie */
const vink = s.page.locator('.st-vink input[type=checkbox]').first();
log('vinkjes', await s.page.locator('.st-vink input[type=checkbox]').count());
await vink.check();
const nota = s.page.locator('textarea.st-veld-klein').first();
await nota.fill('De kraag moet iets hoger, en het licht links is te hard.');
await shot(s.page, '11-studio-aanmerken');
const stuur = s.page.locator('form.st-ronde.is-form button[type=submit]');
await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), stuur.click()]);
await shot(s.page, '12-studio-ronde-nakijken');
const echt = s.page.locator('button:has-text("revisieronde versturen")').first();
if (await echt.count()) await Promise.all([s.page.waitForNavigation({ waitUntil: 'load' }), echt.click()]);
await shot(s.page, '12b-studio-na-ronde');
log('na ronde', JSON.stringify(await sql(`SELECT review_state, count(*) n FROM files WHERE order_id=${id} AND kind='delivery' AND superseded_at IS NULL GROUP BY 1`)));
log('rr', JSON.stringify(await sql(`SELECT * FROM revision_requests WHERE order_id=${id}`)).slice(0, 400));
const m = await mails(); log('mails', m.slice(-3).map((x) => `${x.subject} → ${x.to}`).join(' | '));
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + '/admin', { waitUntil: 'load' }); await shot(a.page, '13-admin-dashboard-revisie');
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' }); await shot(a.page, '14-admin-bestelling-revisie');
await s.stop(); await a.stop();
