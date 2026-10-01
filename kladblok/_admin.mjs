import { SITE } from './_dl.mjs';
export async function adminLogin(page) {
  await page.goto(SITE + '/admin/login', { waitUntil: 'load' });
  await page.fill('input[name="email"]', 'hello@visuails.com');
  await page.fill('input[name="password"]', 'proef-wachtwoord');
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);
  return page.url();
}
