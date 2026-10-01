import { start, foto, tekst, velden, mails, mailtekst, sql, SITE } from './_dl.mjs';
import { studioLogin } from './_studio.mjs';
const s = await start(); const { page } = s;
await studioLogin(page, 'henk@kledingzaak.test');
await page.goto(SITE + '/account/details', { waitUntil: 'load' });
console.log((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 2500));
console.log((await velden(page, 'main')).filter(v => v.zichtbaar).map(v => `${v.tag}/${v.type} ${v.name}${v.required ? '*' : ''}=${v.value} "${v.label.replace(/\s+/g, ' ').slice(0, 40)}"`).join('\n'));
await foto(page, 'studio-gegevens', { vol: true });
// e-mail wijzigen
const voor = (await mails()).length;
const fe = page.locator('main form[action="/account/email"]');
console.log('email-form:', await fe.count());
if (await fe.count()) {
  await fe.locator('input[type="email"]').fill('henk2@kledingzaak.test');
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), fe.locator('button[type="submit"]').click()]);
  console.log('na e-mail:', page.url(), (await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 300));
  for (const m of (await mails()).slice(voor)) { console.log(`MAIL #${m.n} → ${JSON.stringify(m.to)} "${m.subject}"`); console.log((await mailtekst(m.n)).slice(0, 700)); }
}
console.log(s.fouten);
await s.stop();
