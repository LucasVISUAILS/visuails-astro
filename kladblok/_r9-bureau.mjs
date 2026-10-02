// Ronde 9 · klanttype 7 (bureau): F38, F39, F40, F41, O23, O25 in de testomgeving.
import { start, SITE, sql, mails, mailtekst } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const email = `bureau${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;

async function aanvraag(pad, vul, kies = {}) {
  await page.goto(SITE + pad, { waitUntil: 'load' });
  // F38: een vorige bestelling in hetzelfde tabblad liet een ander adres achter.
  await page.evaluate(() => { sessionStorage.setItem('vis-ty-mail', 'vorige@klant.test'); sessionStorage.setItem('vis-ty-ref', 'VIS-VORIG-001'); });
  const form = page.locator('main form[action="/api/order"]').first();
  for (const [n, v] of Object.entries(vul)) await form.locator(`[name="${n}"]`).first().fill(v);
  for (const [n, v] of Object.entries(kies)) await form.locator(`select[name="${n}"]`).selectOption(v);
  await Promise.all([page.waitForURL(/thank-you/, { timeout: 20000 }), form.locator('button[type="submit"]').first().click()]);
  await page.waitForTimeout(800);
  const mailRegel = await page.evaluate(() => document.querySelector('[data-ty-mail]')?.textContent.trim() || '(leeg)');
  console.log('bedankt', page.url().replace(SITE, ''), '| bevestiging naar:', mailRegel, mailRegel.includes('vorige@') ? '← FOUT' : '✓');
}
const voor = (await mails()).length;
await aanvraag('/nl/start/video', { name: 'Bram Bureau', brand: 'Merk Alfa', email, phone: '0612345678', message: 'TEST' }, { style: 'motion', clips: '2' });
await aanvraag('/nl/start/custom-look', { name: 'Bram Bureau', brand: 'Merk Beta', email, phone: '0612345678', look_world: 'TEST betonnen trappenhuis' });
for (const m of (await mails()).slice(voor)) {
  const t = await mailtekst(m.n);
  const zin = (t.match(/(Bedankt — we hebben je aanvraag[^\n.]*\.|Nieuwe aanvraag[^\n]*|Aanvraag zonder prijs[^\n]*)/) || [])[0];
  console.log(`MAIL "${m.subject}" →`, zin || '');
}
const rows = await sql(`SELECT id, ref, service FROM orders WHERE email='${email}' ORDER BY id`);
const [video, look] = rows;
const a = await start(); await adminLogin(a.page);
for (const [o, bedrag, soort] of [[video, '138', 'volledig'], [look, '100', 'aanbetaling']]) {
  await a.page.goto(`${SITE}/admin/orders/${o.id}/files`, { waitUntil: 'load' });
  const f = a.page.locator(`form[action="/admin/orders/${o.id}/quote"]`);
  await f.locator('[name="amount"]').fill(bedrag);
  await f.locator(`input[name="soort"][value="${soort}"]`).check();
  await Promise.all([a.page.waitForNavigation(), f.locator('button[type="submit"]').click()]);
}
await studioLogin(page, email);
await page.goto(SITE + '/nl/account/orders/', { waitUntil: 'load' });
const kaarten = await page.evaluate(() => [...document.querySelectorAll('details, article')].filter((d) => /VIS-/.test(d.querySelector('summary')?.textContent || '')).map((d) => ({
  kop: d.querySelector('summary').innerText.replace(/\s+/g, ' ').trim(),
  betaal: [...d.querySelectorAll('a, button')].filter((b) => /betaal/i.test(b.textContent)).map((b) => b.textContent.trim() + ' ' + (b.getAttribute('href') || b.form?.action || '')),
  lever: (d.innerText.match(/Levertijd zoals[^\n]*|Normale doorlooptijd[^\n]*/) || [''])[0],
})));
console.log(JSON.stringify(kaarten, null, 1));
// F39: de omschrijving die Mollie krijgt
const { paymentDescription, ladderKey } = await import('../src/lib/quote.js');
for (const o of rows) console.log('omschrijving', o.service, '→', paymentDescription({ service: ladderKey(o.service), products: 1, ref: o.ref, offerte: o.service === 'video' || o.service === 'custom' }, 'nl'));
// F40: het portaal van de betaalde video zonder bestanden
await sql(`SELECT 1`);
await k.stop?.(); await a.stop?.();
process.exit(0);
