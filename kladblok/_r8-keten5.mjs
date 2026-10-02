/* Ronde 8 — keten deel 5:
   A · lifestyle op desktop (oudere klant, NL) met 4K en een andere beeldvorm, betalen;
   B · Engelstalige klant: catalog, betalen, admin levert → mail en tijdlijn in het Engels;
   C · annuleren: onbetaalde bestelling annuleren, nog een keer annuleren, heropenen
       via het statuslijstje en betalen na annuleren — alle drie geweigerd. */
import { start, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { bestel, betaal } from './_bestel.mjs';
const OUT = '/tmp/claude-0/r8';
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);
const nr = Date.now() % 100000;

/* ── C · annuleren ─────────────────────────────────────────────────────── */
{
  const email = `jan${nr}@winkel.test`;
  const k = await start({ mobiel: true });
  const r = await bestel(k.page, { pad: '/nl/start/catalog', aantal: 2, klant: { email, first_name: 'Jan', last_name: 'Winkel', brand: 'Winkel Jan' }, land: 'NL' });
  log('C bestel', r.apiStatus);
  /* niet betalen: terug van de checkout zonder te betalen */
  const [o] = await sql(`SELECT id, ref, status, payment_status FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
  log('C order', JSON.stringify(o));
  const a = await start(); await adminLogin(a.page);
  await a.page.goto(SITE + `/admin/orders/${o.id}/files#annuleren`, { waitUntil: 'load' });
  const annuleer = a.page.locator(`form[action="/admin/orders/${o.id}/cancel"]`).first();
  log('C annuleerformulier', await annuleer.count());
  if (await annuleer.count()) {
    await annuleer.evaluate((f) => { const d = f.closest('details'); if (d) d.open = true; f.querySelectorAll('input[type=checkbox][required]').forEach((c) => { c.checked = true; }); const t = f.querySelector('textarea, input[name=reason]'); if (t && !t.value) t.value = 'Klant zag ervan af.'; const conf = f.querySelector('input[name=confirm]'); if (conf) conf.value = conf.placeholder || 'ANNULEER'; });
    await Promise.all([a.page.waitForNavigation({ waitUntil: 'load' }), annuleer.locator('button[type=submit]').first().click()]);
  }
  log('C na annuleren', a.page.url().replace(SITE, ''), JSON.stringify(await sql(`SELECT status FROM orders WHERE id=${o.id}`)));
  const voor = (await mails()).length;
  /* tweede keer annuleren, rechtstreeks */
  const post = async (pad, data) => { const r = await a.page.request.post(SITE + pad, { form: data, maxRedirects: 0, headers: { Origin: SITE, Referer: SITE + pad } }); return [r.status(), r.headers()['location']]; };
  const r2 = await post(`/admin/orders/${o.id}/cancel`, { reason: 'nog eens' });
  log('C tweede keer', JSON.stringify(r2), 'nieuwe mails', (await mails()).length - voor);
  /* heropenen via het statuslijstje */
  const r3 = await post(`/admin/orders/${o.id}/status`, { status: 'in_production', back: 'files' });
  log('C heropenen', JSON.stringify(r3), JSON.stringify(await sql(`SELECT status FROM orders WHERE id=${o.id}`)));
  await a.page.goto(SITE + `/admin/orders/${o.id}/files`, { waitUntil: 'load' });
  await shot(a.page, '23-admin-geannuleerd');
  /* betalen na annuleren: de betaallink uit de bevestiging */
  const bev = (await mails()).filter((x) => JSON.stringify(x.to).includes(email));
  log('C klantmails', bev.map((x) => x.subject).join(' | '));
  const bevMail = bev.find((x) => /hebben je bestelling/i.test(x.subject));
  const payLink = bevMail ? (String(await mailtekst(bevMail.n)).match(/http:\/\/localhost:4477\/api\/order-pay[^\s)]+/) || [])[0] : null;
  log('C betaallink in bevestiging', payLink ? 'ja' : 'nee');
  if (payLink) { await k.page.goto(payLink.replace('http://localhost:4477', SITE), { waitUntil: 'load' }); log('C betaallink na annuleren →', k.page.url().replace(SITE, ''), (await k.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200)); await shot(k.page, '24-betalen-na-annuleren'); }
  await a.stop(); await k.stop();
}
