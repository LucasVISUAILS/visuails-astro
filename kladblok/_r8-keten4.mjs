/* Ronde 8 — keten deel 4: admin vervangt het aangemerkte beeld en meldt het,
   de klant keurt de rest goed, de bestelling sluit en de tevredenheidsvraag
   verschijnt; de klant geeft 5 sterren. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const OUT = '/tmp/claude-0/r8';
const [id, email] = process.argv.slice(2);
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);

const [rev] = await sql(`SELECT f.id, f.product_key, f.shot FROM files f WHERE f.order_id=${id} AND f.kind='delivery' AND f.superseded_at IS NULL AND f.review_state='revision_requested'`);
log('aangemerkt', JSON.stringify(rev));

const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
const vak = a.page.locator(`form[action$="/deliver"]:has(input[name=product][value="${rev.product_key}"]):has(input[name=shot][value="${rev.shot}"])`).first();
log('vak gevonden', await vak.count());
await vak.locator('input[type=file]').setInputFiles(proefbeeld(`revisie-${rev.product_key}-${rev.shot}.webp`));
const knop = vak.locator('button[type=submit]');
if (await knop.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), knop.first().click()]);
else await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), vak.evaluate((el) => el.requestSubmit())]);
log('na upload url', a.page.url().replace(SITE, ''));
await shot(a.page, '15-admin-na-vervangen');
log('bestanden p', JSON.stringify(await sql(`SELECT id, review_state, superseded_at IS NOT NULL AS weg, announced_at IS NOT NULL AS gemeld FROM files WHERE order_id=${id} AND kind='delivery' AND product_key='${rev.product_key}' AND shot='${rev.shot}'`)));

const push = a.page.locator(`form.board-push:has(input[name=product][value="${rev.product_key}"]) button`);
const meld = a.page.locator(`form[action="/admin/orders/${id}/announce"]:has(input[name=note]) button`);
log('product-knop', await push.count(), 'meldknop', await meld.count());
if (await meld.count()) {
  await a.page.fill(`form[action="/admin/orders/${id}/announce"] input[name=note]`, 'Kraag hoger gezet en het licht links zachter.');
  await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), meld.first().click()]);
} else if (await push.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), push.first().click()]);
await shot(a.page, '16-admin-na-melden-revisie');
log('rr', JSON.stringify(await sql(`SELECT resolved_at IS NOT NULL AS opgelost, resolution_note FROM revision_requests WHERE order_id=${id}`)));
let m = await mails(); const naLev = m[m.length - 1];
log('mail', naLev?.subject, '→', naLev?.to);
log('mailtekst', String(await mailtekst(naLev.n)).replace(/\s+/g, ' ').slice(0, 520));

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
