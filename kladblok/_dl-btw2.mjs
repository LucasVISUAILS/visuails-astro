// Btw-controle: US goedkeuren (0% blijft), Henk btw alsnog rekenen → mails → betalen.
import { start, foto, tekst, mails, mailtekst, sql, paneel, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { betaal } from './_bestel.mjs';
const s = await start(); const { page } = s;
await adminLogin(page);
const mailsVoor = (await mails()).length;
async function kies(id, actie) {
  await page.goto(SITE + '/admin/vat', { waitUntil: 'load' });
  const knop = page.locator(`form[action="/admin/orders/${id}/vat"]:has(input[name="action"][value="${actie}"]) button`);
  console.log(`knop ${id}/${actie}:`, await knop.count(), await knop.first().innerText().catch(() => '-'));
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), knop.first().click()]);
  console.log('na', actie, '→', page.url());
  console.log((await tekst(page, 'main, body')).replace(/\n{2,}/g, '\n').slice(0, 900));
  await foto(page, `admin-vat-${actie}`);
}
await kies(7094, 'approve');
await kies(7093, 'charge_vat');
console.log('DB:', JSON.stringify(await sql("SELECT id, ref, status, payment_status, vat_treatment, total_cents, vat_cents FROM orders WHERE id IN (7093,7094)")));
const alle = await mails();
const nieuw = alle.slice(mailsVoor);
console.log('NIEUWE MAILS:', nieuw.map((m, i) => `${mailsVoor + i + 1}: ${JSON.stringify(m.to)} | ${m.subject}`));
for (let i = 0; i < nieuw.length; i++) {
  const t = await mailtekst(mailsVoor + i + 1);
  console.log(`\n=== MAIL ${mailsVoor + i + 1} ===\n` + String(t).slice(0, 1600));
}
// betaallinks volgen
for (let i = 0; i < nieuw.length; i++) {
  const t = String(await paneel(`/mail/${mailsVoor + i + 1}`));
  const hrefs = [...t.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  console.log('links mail', mailsVoor + i + 1, hrefs);
  const link = hrefs.find((h) => /\/(betaal|pay|api\/pay)/i.test(h));
  if (!link) continue;
  const url = link.replace(/^https?:\/\/[^/]+/, SITE);
  console.log('\nBETAALLINK', link, '→', url);
  await page.goto(url, { waitUntil: 'load' });
  console.log('landt op', page.url());
  console.log((await tekst(page, 'body')).replace(/\n{2,}/g, '\n').slice(0, 700));
  await foto(page, `betaallink-${i}`);
  if (/nep-mollie|4478/.test(page.url())) {
    const eind = await betaal(page, 'paid');
    await page.waitForTimeout(4000);
    console.log('na betalen →', eind);
    console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 700));
  }
}
console.log('DB na:', JSON.stringify(await sql("SELECT id, status, payment_status FROM orders WHERE id IN (7093,7094)")));
console.log(s.fouten);
await s.stop();
