import { SITE, mails, mailtekst } from './_dl.mjs';
export async function studioLogin(page, email) {
  await page.goto(SITE + '/account/login?lang=nl', { waitUntil: 'load' });
  await page.fill('input[type="email"]', email);
  const voor = (await mails()).length;
  await page.click('form button[type="submit"]');
  let m = null;
  for (let i = 0; i < 20 && !m; i++) {
    await page.waitForTimeout(300);
    const lijst = await mails();
    m = lijst.slice(voor).reverse().find((x) => /inlogcode|sign-in code|login code/i.test(x.subject || '')) || null;
  }
  if (!m) { const lijst = await mails(); m = lijst[lijst.length - 1]; }
  const t = await mailtekst(m.n);
  const code = (t.match(/(\d{3}) (\d{3})/) || []);
  if (!code[1]) throw new Error('geen code in mail: ' + m.subject);
  await page.fill('input[name="code"], input[inputmode="numeric"]', code[1] + code[2]);
  await Promise.all([page.waitForNavigation(), page.click('form button[type="submit"]')]);
  if (!/\/account\/?(\?|#|$)/.test(page.url())) throw new Error('studioLogin mislukt voor ' + email + ' — ' + page.url());
  return page.url();
}
