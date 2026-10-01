// Verlopen code en verlopen link: wat ziet de klant?
import { start, tekst, sqlw, mails, mailtekst, paneel, SITE, foto } from './_dl.mjs';
const s = await start(); const { page } = s;
await page.goto(SITE + '/account/login?lang=nl', { waitUntil: 'load' });
await page.fill('input[type="email"]', 'lever@merk.test');
await page.click('form button[type="submit"]'); await page.waitForTimeout(1000);
const lijst = await mails(); const m = lijst[lijst.length - 1];
const t = String(await mailtekst(m.n)); const code = (t.match(/(\d{3}) (\d{3})/) || []);
const link = [...String(await paneel('/mail/' + m.n)).matchAll(/href="([^"]+)"/g)].map((x) => x[1]).find((h) => /verify/.test(h));
console.log('code', code[0], 'link', link);
await sqlw("UPDATE account_tokens SET code_expires_at = datetime('now','-1 minute'), expires_at = datetime('now','-1 minute')");
await page.fill('input[name="code"], input[inputmode="numeric"]', code[1] + code[2]);
await Promise.all([page.waitForNavigation().catch(() => {}), page.click('form button[type="submit"]')]);
console.log('VERLOPEN CODE →', page.url(), '\n ', (await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 400));
await foto(page, 'code-verlopen');
await page.goto(link.replace('https://visuails.com', SITE), { waitUntil: 'load' });
console.log('VERLOPEN LINK →', page.url(), '\n ', (await tekst(page, 'main')).replace(/\s+/g, ' ').slice(0, 400));
await foto(page, 'link-verlopen');
console.log(s.fouten); await s.stop();
