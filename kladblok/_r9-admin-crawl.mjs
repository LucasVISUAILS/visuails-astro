// Ronde 9 · stap 5: elke /admin-pagina op 1280, 390 en donker — status, consolefouten, horizontale scroll, Engelse resten.
import { start, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
const D = '/tmp/claude-0/kb';
const k = await start(); const { page, fouten } = k;
await adminLogin(page);
await page.goto(SITE + '/admin');
const links = [...new Set(await page.evaluate(() => [...document.querySelectorAll('header a, nav a, .admin-nav a, details a')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/admin') && !/logout/.test(h))))];
/* Een bestelling en een klant om de detailpagina's ook te zien. */
const extra = await page.evaluate(() => [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')).filter((h) => /^\/admin\/(orders|customers)\/\d+/.test(h || '')).slice(0, 2));
const paginas = [...links, ...extra];
const ENGELS = /\b(Order|Orders|Customer|Customers|Save|Submit|Delete|Cancel|Refund|Invoice|Settings|Upload|Search|Status|Paid|Unpaid|Delivered|Received)\b/;
const uit = [];
for (const [w, naam] of [[1280, '1280'], [390, '390']]) {
  await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
  for (const p of paginas) {
    const voor = fouten.length;
    const r = await page.goto(SITE + p).catch(() => null);
    await page.waitForTimeout(300);
    const info = await page.evaluate((src) => {
      const re = new RegExp(src);
      const tekst = [...document.querySelectorAll('main button, main a.btn, main h1, main h2, main th, main label, main summary')].map((e) => e.textContent.trim()).filter((t) => re.test(t)).slice(0, 4);
      return { sw: document.documentElement.scrollWidth, h1: (document.querySelector('main h1')?.textContent || '').trim().slice(0, 40), engels: tekst };
    }, ENGELS.source);
    uit.push(`${naam} ${p.padEnd(34)} ${r ? r.status() : 'x'} · "${info.h1}" · breedte ${info.sw}${info.sw > w + 1 ? ' ← SCROLLT' : ''}${info.engels.length ? ' · Engels? ' + info.engels.join(' | ') : ''}${fouten.length > voor ? ' · fouten: ' + fouten.slice(voor).join(' ; ').slice(0, 160) : ''}`);
    if (naam === '390') await page.screenshot({ path: `${D}/adm${p.replace(/\//g, '-')}-390.png` });
  }
}
/* Donker: het thema-knopje bovenaan. */
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(SITE + '/admin');
const thema = page.locator('header a:has-text("Licht"), header a:has-text("Donker"), header button:has-text("Licht"), header button:has-text("Donker"), a:has-text("LICHT")').first();
if (await thema.count()) { await Promise.all([page.waitForNavigation().catch(() => null), thema.click()]); await page.waitForTimeout(300); }
uit.push(`thema na klik: achtergrond ${await page.evaluate(() => getComputedStyle(document.body).backgroundColor)}`);
await page.screenshot({ path: `${D}/adm-dashboard-donker.png` });
console.log(uit.join('\n'));
process.exit(0);
