// Portaal: alles goedkeuren, lage score, privénotitie; dan admin /admin/testimonials.
import { start, tekst, sql, mails, mailtekst, paneel, SITE, foto } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const email = process.argv[2]; const score = process.argv[3] || '2';
const lijst = await mails();
const m = [...lijst].reverse().find((x) => JSON.stringify(x.to).includes(email) && /staat klaar/.test(x.subject));
const link = [...String(await paneel('/mail/' + m.n)).matchAll(/href="([^"]+)"/g)].map((x) => x[1]).find((h) => /\/o\//.test(h));
const s = await start(); const { page } = s;
for (let i = 0; i < 4; i++) {
  await page.goto(link, { waitUntil: 'load' });
  const k = page.locator('button[name="action"][value="approve"]');
  if (!(await k.count())) break;
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), k.first().click()]);
}
const t = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
const i = t.search(/tevreden/i); console.log('NA GOEDKEUREN:\n' + t.slice(Math.max(0, i - 300), i + 500));
const b = page.locator(`button[name="score"][value="${score}"]`);
console.log('scoreknoppen', await b.count());
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), b.first().click()]);
const t2 = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
const j = t2.search(/Bedankt|Dank/i); console.log('NA SCORE:\n' + t2.slice(Math.max(0, j - 50), j + 900));
await foto(page, 'portaal-laag', { vol: true });
console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('form')].map((f) => [...f.elements].filter(e => e.name).map((e) => `${e.type} ${e.name}=${e.value}`).join(', ')))));
const note = page.locator('textarea[name="note"], textarea[name="private_note"], textarea').first();
const voor = (await mails()).length;
if (await note.count()) {
  await note.fill('De kleur van de jas klopte niet, hij is donkerder.');
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), note.locator('xpath=ancestor::form[1]').locator('button[type="submit"]').first().click()]);
  const t3 = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
  const k2 = t3.search(/Bedankt|Dank|gelezen/i); console.log('NA NOTITIE:\n' + t3.slice(Math.max(0, k2 - 50), k2 + 500));
}
for (const x of (await mails()).slice(voor)) { console.log(`MAIL → ${JSON.stringify(x.to)} "${x.subject}"`); console.log(String(await mailtekst(x.n)).slice(0, 800)); }
console.log(JSON.stringify(await sql('SELECT order_id, score, private_note, platforms_clicked FROM order_feedback')));
const a = await start(); await adminLogin(a.page);
await a.page.goto(SITE + '/admin/testimonials', { waitUntil: 'load' });
console.log('ADMIN AANBEVELINGEN:\n' + (await tekst(a.page, 'main, body')).replace(/\n{2,}/g, '\n').slice(0, 1500));
console.log(s.fouten, a.fouten); await s.stop(); await a.stop();
