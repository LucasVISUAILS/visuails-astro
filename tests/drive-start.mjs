// Drives every /start route in both locales against the static build on :4460.
// Checks: preselected service, running total vs ladderTotal(), background
// picker only on catalog+complete, console errors, horizontal overflow at 390.
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
import { ladderTotal, OUTFIT_SURCHARGE } from '../src/data/pricing.js';
import fs from 'node:fs';

const BASE = 'http://localhost:4460';
const SHOTS = '/tmp/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const FLOWS = [
  { path: '/start/catalog', kind: 'catalog', wire: 'catalog', bg: true },
  { path: '/start/lifestyle', kind: 'lifestyle', wire: 'lifestyle', bg: false },
  { path: '/start/complete', kind: 'complete', wire: 'drop', bg: true },
];
const HOLDS = [
  { path: '/start/video', wire: 'video' },
  { path: '/start/brand-model', wire: 'custom' },
  { path: '/start/plan', wire: 'custom' },
];
const ALL = ['/start', ...FLOWS.map((f) => f.path), ...HOLDS.map((h) => h.path)];

const fails = [];
const note = (ok, msg) => { console.log(`${ok ? '  ok  ' : ' FAIL '} ${msg}`); if (!ok) fails.push(msg); };

const browser = await pw.chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

for (const locale of ['', '/nl']) {
  for (const route of ALL) {
    const url = BASE + locale + route + '/';
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    // /account/me is a Cloudflare Pages Function (functions/account/index.js).
    // It cannot exist on a static file server, and both callers already treat
    // "no answer" as "nobody is signed in" — so its 404 is an artefact of how
    // this test serves the build, not a page error. Site-wide, not ours.
    const IGNORE = /account\/me/;
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text() + m.location().url)) errs.push(m.text()); });
    page.on('response', (r) => {
      if (r.status() >= 400 && !IGNORE.test(r.url())) errs.push(`${r.status()} ${r.url()}`);
    });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    console.log(`\n== ${locale || '/en'} ${route} (${res.status()})`);
    note(res.status() === 200, `${url} 200`);

    const flow = FLOWS.find((f) => f.path === route);
    const hold = HOLDS.find((h) => h.path === route);

    if (flow || hold) {
      const wire = await page.getAttribute('input[name="service"]', 'value');
      note(wire === (flow || hold).wire, `service="${wire}" (want ${(flow || hold).wire})`);
      // The visitor is never asked to pick a service again.
      const svcRadios = await page.locator('input[type=radio][name="service"]').count();
      note(svcRadios === 0, `no service radio to re-pick (${svcRadios})`);
    }

    if (flow) {
      const bgCount = await page.locator('[data-pl-bg]').count();
      note(!!bgCount === flow.bg, `background picker ${bgCount ? 'present' : 'absent'} (want ${flow.bg ? 'present' : 'absent'})`);
      const styleCount = await page.locator('input[name="style"]').count();
      note((styleCount > 0) === !flow.bg, `style picker ${styleCount ? 'present' : 'absent'}`);

      // aria-live on the running total.
      const live = await page.locator('[aria-live="polite"]').filter({ has: page.locator('[data-pl-total]') }).count();
      note(live > 0, 'running total inside aria-live region');

      // radiogroup semantics survive.
      const rg = await page.locator('[role="radiogroup"]').count();
      note(rg > 0, `role=radiogroup present (${rg})`);

      // Totals: drive the count select and compare to ladderTotal().
      for (const n of [1, 4, 9, 10, 25]) {
        await page.selectOption('select[name="products"]', String(n));
        await page.waitForTimeout(60);
        const shown = (await page.textContent('[data-pl-total]')).trim();
        const want = ladderTotal(flow.kind, n);
        const digits = shown.replace(/[^\d]/g, '');
        note(digits === String(want), `${n} products → ${shown} (ladderTotal=${want})`);
      }
      // Outfit surcharge rides on top.
      if (await page.locator('select[name="outfit_count"]').count()) {
        await page.selectOption('select[name="products"]', '10');
        await page.selectOption('select[name="outfit_count"]', '2');
        await page.waitForTimeout(60);
        const shown = (await page.textContent('[data-pl-total]')).trim();
        const want = ladderTotal(flow.kind, 10) + 2 * OUTFIT_SURCHARGE;
        note(shown.replace(/[^\d]/g, '') === String(want), `10 products + 2 outfits → ${shown} (want ${want})`);
        await page.selectOption('select[name="outfit_count"]', '0');
      }
      // tier flips at WINDOW_THRESHOLD.
      await page.selectOption('select[name="products"]', '10');
      await page.waitForTimeout(60);
      const tier = await page.getAttribute('input[name="tier"]', 'value');
      note(tier === 'attended', `tier at 10 products = ${tier}`);
    }

    if (hold) {
      const action = await page.getAttribute('form[action="/api/order"]', 'action');
      note(action === '/api/order', 'request form posts to /api/order');
      const req = await page.getAttribute('input[name="request"]', 'value');
      note(!!req, `request="${req}"`);
    }

    // No gross/incl-VAT figure anywhere.
    const body = await page.textContent('body');
    note(!/incl\.? ?(VAT|btw)/i.test(body), 'no incl-VAT figure');

    await page.screenshot({ path: `${SHOTS}/${(locale || 'en').replace(/\//g, '')}-${route.replace(/\//g, '_')}-1440.png`, fullPage: false });

    // 390x844: overflow + screenshot.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const over = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      wide: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 4)
        .map((el) => el.tagName + '.' + (el.className && el.className.baseVal !== undefined ? '' : String(el.className)).slice(0, 40)),
    }));
    note(over.sw <= over.cw + 1, `no h-overflow at 390 (scrollWidth ${over.sw} / ${over.cw})${over.sw > over.cw ? ' :: ' + JSON.stringify(over.wide) : ''}`);
    await page.screenshot({ path: `${SHOTS}/${(locale || 'en').replace(/\//g, '')}-${route.replace(/\//g, '_')}-390.png`, fullPage: false });

    note(errs.length === 0, `no console errors${errs.length ? ' :: ' + errs.slice(0, 3).join(' | ') : ''}`);
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${fails.length ? 'FAILURES (' + fails.length + '):\n' + fails.map((f) => ' - ' + f).join('\n') : 'ALL CHECKS PASSED'}`);
process.exit(fails.length ? 1 : 0);
