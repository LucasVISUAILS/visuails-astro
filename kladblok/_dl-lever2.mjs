import fs from 'node:fs';
import { start, foto, tekst, sql, mails, mailtekst, SITE, proefbeeld } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';
const email = process.argv[3] || 'lever@merk.test'; const score = process.argv[4] || '5';
const id = Number(process.argv[2]) || (await sql(`SELECT id FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`))[0].id;
const a = await start(); const ap = a.page; await adminLogin(ap);
const bron = proefbeeld('lever.webp');
for (const shot of ['front', 'back', 'detail', 'worn']) {
  await ap.goto(SITE + `/admin/orders/${id}/files`, { waitUntil: 'load' });
  const f = ap.locator(`form[action="/admin/orders/${id}/deliver"]:has(input[name="shot"][value="${shot}"])`);
  const kopie = `/tmp/claude-0/dl/lever-${shot}.webp`; fs.copyFileSync(bron, kopie);
  await f.locator('input[type="file"]').setInputFiles(kopie);
  const knop = f.locator('button[type="submit"]');
  if (await knop.count()) await Promise.all([ap.waitForNavigation({ waitUntil: 'load' }), knop.click()]);
  else await Promise.all([ap.waitForNavigation({ waitUntil: 'load' }), f.evaluate((x) => x.requestSubmit())]);
}
console.log('geleverd:', JSON.stringify(await sql(`SELECT shot, review_state FROM files WHERE order_id=${id} AND kind='delivery'`)));
let voor = (await mails()).length;
await ap.goto(SITE + '/admin', { waitUntil: 'load' });
const form = ap.locator(`form[action="/admin/orders/${id}/status"]`);
await form.evaluate((f) => { const d = f.closest('details'); if (d) d.open = true; });
await form.locator('select[name="status"]').selectOption('delivered');
await Promise.all([ap.waitForNavigation({ waitUntil: 'load' }), form.locator('button[type="submit"]').first().click()]);
for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log(String(await mailtekst(m.n)).slice(0, 900)); }
if (process.argv[5] === 'portaal') { await a.stop(); process.exit(0); }
const s = await start(); const { page } = s;
await studioLogin(page, email);
await page.goto(SITE + '/account/orders/', { waitUntil: 'load' });
await page.locator('text=Bekijk de foto’s').first().click(); await page.waitForTimeout(500);
voor = (await mails()).length;
const alles = page.locator('button:has-text("keur dit product goed")');
console.log('goedkeurknop:', await alles.count());
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), alles.first().click()]);
console.log('na goedkeuren:', page.url());
const t = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
const i = t.search(/Hoe tevreden|Hoe was|tevreden/i);
console.log('FEEDBACK-BLOK:\n' + (i >= 0 ? t.slice(i - 100, i + 900) : t.slice(0, 1200)));
await foto(page, 'feedback-vraag', { vol: true });
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].filter(f => /feedback/.test(f.action)).map((f) => f.getAttribute('action') + ' :: ' + [...f.elements].filter(e => e.name).map((e) => `${e.type} ${e.name}=${e.value}`).join(', ')))));
const fb = page.locator('form[action*="feedback"]').first();
if (await fb.count()) {
  const r = fb.locator(`input[name="score"][value="${score}"]`);
  if (await r.count()) await r.evaluate((x) => (x.closest('label') || x).click()); else { const b = fb.locator(`button[name="score"][value="${score}"]`); if (await b.count()) { await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), b.click()]); } }
  const ta = fb.locator('textarea');
  if (await ta.count() && await ta.first().isVisible()) await ta.first().fill(score >= 4 ? 'Mooi gedaan, snel geleverd.' : 'De kleuren klopten niet helemaal.');
  const sub = fb.locator('button[type="submit"]:not([name="score"])');
  if (await sub.count() && await sub.first().isVisible()) await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), sub.first().click()]);
  const t2 = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
  const j = t2.search(/Bedankt|Dank|review|Google|Trustpilot/i);
  console.log('NA FEEDBACK:\n' + (j >= 0 ? t2.slice(Math.max(0, j - 200), j + 900) : t2.slice(0, 800)));
  await foto(page, 'feedback-na', { vol: true });
}
for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log(String(await mailtekst(m.n)).slice(0, 900)); }
console.log(JSON.stringify(await sql(`SELECT status, closed_at FROM orders WHERE id=${id}`)), JSON.stringify(await sql(`SELECT * FROM feedback WHERE order_id=${id}`)));
console.log(a.fouten, s.fouten.filter(x => !/account\/me/.test(x))); await a.stop(); await s.stop();
