/* WAT STAAT ER TE DICHT OP ELKAAR — IN VISUAILS STUDIO EN /ADMIN
 * ═══════════════════════════════════════════════════════════════════════════
 * Lucas: *"Ik wil dat je ook alle pagina's (dus ook visuails studio en /admin)
 * afgaat en in browser scant om nauwkeurig en foutloos per element te kijken
 * waar te weinig ruimte zit tussen teksten, blokken en andere elementen."*
 *
 * kladblok/te-dicht.mjs doet dat voor de site, maar die draait op de statische
 * dist en deze twee schermen bestaan daar niet: Studio heeft een sessie en een
 * database nodig, /admin een token en nepdata. Dezelfde meter — hij staat in
 * kladblok/lib/dichtmeter.mjs — met twee andere opstellingen eromheen.
 *
 *   node kladblok/te-dicht-studio.mjs           (vereist: npm run build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';
import { meetDicht } from './lib/dichtmeter.mjs';

const ROOT = process.cwd();
const DAG = new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10);
const STUDIO_PADEN = [
  '/account', '/account/orders', '/account/invoices', '/account/details',
  '/account/brand-kit', '/account/plan', '/account/plan?tab=planning',
  '/account/plan?tab=planning&dag=' + DAG, '/account/plan?tab=bestellen',
  '/account/plan?tab=facturering',
];
const ADMIN_PADEN = ['/admin', '/admin/orders', '/admin/orders/90/files', '/admin/planning'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let totaal = 0;

async function meet(page, label) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  const uit = await page.evaluate(meetDicht);
  const n = uit.dicht.length + uit.scheef.length;
  totaal += n;
  if (n) {
    console.log('\n' + label);
    for (const r of uit.dicht.slice(0, 8)) console.log('   te dicht : ' + r);
    for (const r of uit.scheef.slice(0, 6)) console.log('   scheef   : ' + r);
    if (uit.dicht.length > 8) console.log('   … en nog ' + (uit.dicht.length - 8) + ' te dicht');
    if (uit.scheef.length > 6) console.log('   … en nog ' + (uit.scheef.length - 6) + ' scheef');
  }
}

/* ── 1 · VISUAILS STUDIO ── */
{
  const studio = await startStudio();
  for (const [w, maat] of [[1280, 'breed'], [390, 'telefoon']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
    const page = await ctx.newPage();
    for (const pad of STUDIO_PADEN) {
      await page.goto(studio.url + pad, { waitUntil: 'load' }).catch(() => null);
      await meet(page, 'studio ' + pad + '  (' + maat + ')');
    }
    await ctx.close();
  }
  await studio.dispose();
}

/* ── 2 · /ADMIN ──
   scripts/admin-render.mjs bouwt de html met nepdata; wij zetten hem in een
   pagina neer en laten de css uit public/ en dist/ erbij laden. Dezelfde
   opstelling als kladblok/_adminmaat.mjs. */
{
  const DUMP = path.join(ROOT, 'kladblok', '_adminhtml');
  fs.mkdirSync(DUMP, { recursive: true });
  for (const p of ADMIN_PADEN) {
    try { execFileSync('node', ['scripts/admin-render.mjs', p], { env: { ...process.env, VISUAILS_DUMP_HTML: DUMP }, stdio: 'pipe' }); }
    catch (e) { console.log('kon', p, 'niet renderen'); }
  }
  for (const [w, maat] of [[1280, 'breed'], [390, 'telefoon']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    await ctx.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname.endsWith('.css')) {
        const file = ['public', 'dist'].map((d) => path.join(ROOT, d, u.pathname.replace(/^\//, ''))).find((f) => fs.existsSync(f));
        if (file) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(file) });
      }
      if (u.pathname.endsWith('.woff2')) {
        const file = path.join(ROOT, 'dist', u.pathname.replace(/^\//, ''));
        if (fs.existsSync(file)) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(file) });
      }
      return route.fulfill({ status: 204, body: '' });
    });
    for (const naam of fs.readdirSync(DUMP)) {
      const page = await ctx.newPage();
      await ctx.route('**/__p', (r) => r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(DUMP, naam), 'utf8') }));
      await page.goto('https://visuails.com/__p', { waitUntil: 'load' });
      await meet(page, 'admin ' + naam.replace(/_/g, '/').replace('.html', '') + '  (' + maat + ')');
      await page.close();
    }
    await ctx.close();
  }
}

console.log('\n' + totaal + ' plek(ken) gevonden in Studio en /admin');
await browser.close();
