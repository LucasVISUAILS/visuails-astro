import { SITE, mails, mailtekst } from './_dl.mjs';
export async function studioLogin(page, email) {
  await page.goto(SITE + '/account/login?lang=nl', { waitUntil: 'load' });
  await page.fill('input[type="email"]', email);
  await page.click('form button[type="submit"]'); await page.waitForTimeout(800);
  const lijst = await mails(); const m = lijst[lijst.length - 1]; const t = await mailtekst(m.n);
  const code = (t.match(/(\d{3}) (\d{3})/) || []);
  if (!code[1]) throw new Error('geen code in mail: ' + m.subject);
  await page.fill('input[name="code"], input[inputmode="numeric"]', code[1] + code[2]);
  await Promise.all([page.waitForNavigation(), page.click('form button[type="submit"]')]);
  if (!/\/account\/?(\?|#|$)/.test(page.url())) throw new Error('studioLogin mislukt voor ' + email + ' — ' + page.url());
  return page.url();
}
