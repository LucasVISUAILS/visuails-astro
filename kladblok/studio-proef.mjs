/**
 * Studio in de echte Worker, met nepdata — schermafdrukken om naar te kijken.
 *
 *   node kladblok/studio-proef.mjs            # bouwt niet; draai eerst `npm run build`
 *
 * Wat hij doet: start de gebouwde Worker in dit proces op een verse D1 en R2
 * met de nepdata uit tests/lib/studio-seed.mjs (VOLT met werk, NOORD zonder) —
 * dezelfde opstelling als tests/studio-vorm.test.mjs, via
 * tests/lib/studio-worker.mjs — logt in met de sessiecookie en fotografeert
 * elk scherm: breed en telefoon, licht en donker, naar kladblok/studio/*.png.
 *
 * 6 september 2026: geen `wrangler d1 execute` en geen `wrangler dev` meer als
 * subproces (spawn('npx') gaf op Windows ENOENT), en niets raakt .wrangler/state.
 * scripts/account-render.mjs deed dit ooit voor de oude renderer; die is weg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { startStudio, VOLT, NOORD } from '../tests/lib/studio-worker.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'kladblok', 'studio');
fs.mkdirSync(OUT, { recursive: true });

const studio = await startStudio();
console.log(`▶ Worker op ${studio.url}, nepdata staat erin`);

const browser = await chromium.launch({ executablePath: browserPad() });
const SHOTS_TO_TAKE = [
  ['overzicht', '/account', true],
  ['overzicht-dicht', '/account?nav=dicht', true],
  ['bestellingen', '/account/orders', true],
  ['facturen', '/account/invoices', true],
  ['gegevens', '/account/details', true],
  ['vastelook', '/account/brand-kit', true],
  ['abonnement', '/account/plan', true],
  ['abonnement-lijst', '/account/plan?tab=bestellen', true],
  ['abonnement-beheer', '/account/plan?tab=facturering', true],
  ['abonnement-look', '/account/plan?tab=look', true],
  ['abonnement-leeg', '/account/plan', NOORD.token],
  ['abonnement-terug', '/account/plan/return?ref=onzin', true],
  ['inloggen', '/account/login', false],
  ['code', 'POST:/account/login', false],
  ['dode-link', '/account/verify/geen-echte-token-1234567890abcdef', false],
];
try {
  /* Sinds sectie 21 is licht de beginstand (geen cookie); donker is de keuze. */
  for (const [thema, themaCookie] of [['licht', null], ['donker', 'donker']]) {
    for (const [w, naam] of [[1280, 'breed'], [420, 'telefoon']]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
      const cookies = [];
      if (themaCookie) cookies.push({ name: 'vis_thema', value: themaCookie, url: studio.url });
      for (const [label, url, ingelogd] of SHOTS_TO_TAKE) {
        const page = await ctx.newPage();
        const jar = [...cookies];
        if (ingelogd) jar.push({ name: 'vis_account', value: typeof ingelogd === 'string' ? ingelogd : VOLT.token, url: studio.url });
        await ctx.clearCookies();
        if (jar.length) await ctx.addCookies(jar);
        const fouten = [];
        page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
        if (url.startsWith('POST:')) {
          await page.goto(`${studio.url}/account/login`, { waitUntil: 'load' });
          await page.fill('input[name=email]', VOLT.email);
          await Promise.all([page.waitForLoadState('load'), page.click('button[type=submit]')]);
        } else {
          await page.goto(`${studio.url}${url}`, { waitUntil: 'load' });
        }
        /* Lazy beelden onder de vouw laden pas bij scrollen; een volle afdruk
           zonder scrollen toont dan lege tegels. Dus eerst even naar beneden. */
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(500);
        const file = path.join(OUT, `${label}-${thema}-${naam}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const status = await page.evaluate(() => document.title);
        console.log(`  ${path.relative(ROOT, file)}  «${status}»${fouten.length ? `  ⚠ ${fouten.join(' | ')}` : ''}`);
        await page.close();
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await studio.dispose();
}
console.log('▶ klaar');
