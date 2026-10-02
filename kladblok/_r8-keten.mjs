/* Ronde 8 — de hele keten: bestellen (mobiel), betalen, admin levert, Studio
   keurt en vraagt een revisie, admin vervangt, Studio rondt af. Schermafdrukken
   in /tmp/claude-0/r8. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
import { bestel, betaal } from './_bestel.mjs';
const OUT = '/tmp/claude-0/r8';
const email = `keten${Date.now() % 100000}@merk.test`;
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);

const k = await start({ mobiel: true });
const r = await bestel(k.page, { pad: '/nl/start/catalog', aantal: 2, klant: { email, first_name: 'Sanne', last_name: 'Keten', brand: 'Keten Studio' }, land: 'NL' });
log('bestel', r.apiStatus, r.url.slice(0, 60));
if (/nep-mollie/.test(k.page.url())) { await betaal(k.page); }
await k.page.waitForTimeout(2500);
await shot(k.page, '01-bedankt-mobiel');
const [o] = await sql(`SELECT id, ref, payment_status, status FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
log('order', JSON.stringify(o));

const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + '/admin', { waitUntil: 'load' }); await shot(a.page, '02-admin-dashboard');
await a.page.goto(SITE + `/admin/orders/${o.id}/files`, { waitUntil: 'load' }); await shot(a.page, '03-admin-bestelling-leeg');
/* per vakje uploaden */
const vakken = await a.page.evaluate(() => [...document.querySelectorAll('form[action$="/deliver"]')].map((f, i) => ({ i, p: f.querySelector('[name=product]')?.value, s: f.querySelector('[name=shot]')?.value })).filter((x) => x.p && x.s));
log('vakken', vakken.length);
for (const v of vakken) {
  const f = a.page.locator(`form[action$="/deliver"]:has(input[name=product][value="${v.p}"]):has(input[name=shot][value="${v.s}"])`).first();
  if (!(await f.count())) { log('vak weg', v.p, v.s); continue; }
  await f.locator('input[type=file]').setInputFiles(proefbeeld(`lever-${v.p}-${v.s}.webp`));
  const knop = f.locator('button[type=submit]');
  if (await knop.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), knop.first().click()]);
  else await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), f.evaluate((el) => el.requestSubmit())]);
  const verder = a.page.locator('a:has-text("Verder naar de bestanden"), button:has-text("Verder naar de bestanden")');
  if (await verder.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), verder.first().click()]);
}
await shot(a.page, '04-admin-na-upload');
const melden = a.page.locator(`form[action="/admin/orders/${o.id}/announce"] button`);
log('meldknop', await melden.count());
if (await melden.count()) await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), melden.first().click()]);
await shot(a.page, '05-admin-na-melden');
log('status na melden', JSON.stringify(await sql(`SELECT status, closed_at FROM orders WHERE id=${o.id}`)));
const lijst = await mails(); log('laatste mail', lijst[lijst.length - 1]?.subject);

const s = await start({ mobiel: true });
await studioLogin(s.page, email);
await s.page.goto(SITE + '/account/orders', { waitUntil: 'load' }); await shot(s.page, '06-studio-bestellingen-mobiel');
await s.stop(); await a.stop(); await k.stop();
console.log(JSON.stringify({ email, id: o.id, ref: o.ref }));
