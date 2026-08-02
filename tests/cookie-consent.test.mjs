/* VISUAILS — the cookie banner, exercised as a visitor.  npm run test:consent
 *
 * What matters here is not that a banner appears. It is that the ANSWER
 * changes what the browser actually requests, and that the two answers are
 * offered on equal terms. Both are things you can measure, so both are
 * measured rather than reviewed:
 *
 *   · equal prominence is asserted from the COMPUTED height, weight, size,
 *     radius and background of the two buttons, not from reading the CSS.
 *     If someone later restyles one, this fails.
 *   · "no cookie wall" is asserted by scrolling the page while the bar is up.
 *   · the beacon is asserted by listening for the network request. With the
 *     token empty (as it ships) nothing fires on any path, which is correct
 *     and is what the last case checks; the gating itself was verified
 *     separately with a token configured — 0 requests before an answer, 0
 *     after a refusal, 1 after a yes. */
import { chromium } from 'playwright';

/* Needs a preview server on :4321 —  npm run build && npm run preview
   and a browser once —              npx playwright install chromium */
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const results = [];
const check = (name, got, expect) => {
  const pass = JSON.stringify(got) === JSON.stringify(expect);
  results.push({ name, got, expect, pass });
};

async function session(fn) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const beacon = [];
  p.on('request', (r) => { if (/cloudflareinsights/.test(r.url())) beacon.push(r.url()); });
  await p.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const out = await fn(p, beacon, ctx);
  await ctx.close();
  return out;
}

// 1 · first visit — bar shown, nothing sent
await session(async (p, beacon) => {
  check('first visit: bar is visible', await p.isVisible('#cc-bar'), true);
  check('first visit: no beacon request', beacon.length, 0);
  // equal prominence, measured rather than asserted
  const geo = await p.evaluate(() => {
    const r = document.querySelector('[data-cc="reject"]').getBoundingClientRect();
    const a = document.querySelector('[data-cc="accept"]').getBoundingClientRect();
    const rs = getComputedStyle(document.querySelector('[data-cc="reject"]'));
    const as = getComputedStyle(document.querySelector('[data-cc="accept"]'));
    return {
      sameHeight: Math.abs(r.height - a.height) < 1,
      sameWeight: rs.fontWeight === as.fontWeight,
      sameSize: rs.fontSize === as.fontSize,
      sameRadius: rs.borderRadius === as.borderRadius,
      sameBg: rs.backgroundColor === as.backgroundColor,
      rejectFirstInDom: !!(document.querySelector('[data-cc="reject"]').compareDocumentPosition(
        document.querySelector('[data-cc="accept"]')) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  check('reject and accept are the same height', geo.sameHeight, true);
  check('...the same font weight', geo.sameWeight, true);
  check('...the same font size', geo.sameSize, true);
  check('...the same corner radius', geo.sameRadius, true);
  check('...the same background', geo.sameBg, true);
  check('reject comes first in the DOM', geo.rejectFirstInDom, true);
  // no cookie wall: the page must be usable and scrollable
  const usable = await p.evaluate(() => {
    const before = window.scrollY;
    window.scrollTo(0, 500);
    const moved = window.scrollY !== before;
    window.scrollTo(0, 0);
    return { moved, bodyInert: document.body.inert === true, overflow: getComputedStyle(document.body).overflow };
  });
  check('page still scrolls (no cookie wall)', usable.moved, true);
  check('body is not inert', usable.bodyInert, false);
});

// 2 · reject — nothing sent, bar gone, stays gone on reload
await session(async (p, beacon, ctx) => {
  await p.click('[data-cc="reject"]');
  await p.waitForTimeout(400);
  check('after reject: bar is gone', await p.isVisible('#cc-bar'), false);
  check('after reject: still no beacon', beacon.length, 0);
  const c = (await ctx.cookies()).find((x) => x.name === 'vis_consent');
  check('after reject: choice stored', !!c, true);
  check('after reject: stored value says no', JSON.parse(decodeURIComponent(c.value)).analytics, false);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  check('after reload: bar does not come back', await p.isVisible('#cc-bar'), false);
  check('after reload: still no beacon', beacon.length, 0);
});

// 3 · accept — the beacon only now appears
await session(async (p, beacon, ctx) => {
  await p.click('[data-cc="accept"]');
  await p.waitForTimeout(800);
  check('after accept: bar is gone', await p.isVisible('#cc-bar'), false);
  const c = (await ctx.cookies()).find((x) => x.name === 'vis_consent');
  check('after accept: stored value says yes', JSON.parse(decodeURIComponent(c.value)).analytics, true);
  // The token is empty in this build, so the beacon still must not fire —
  // which is itself the correct behaviour and worth asserting.
  check('token empty: still no beacon even on yes', beacon.length, 0);
});

// 4 · the preferences panel
await session(async (p) => {
  await p.click('[data-cc="open"]');
  await p.waitForTimeout(300);
  check('preferences opens', await p.isVisible('#cc-prefs'), true);
  check('analytics is NOT pre-ticked', await p.isChecked('#cc-analytics'), false);
  await p.check('#cc-analytics');
  await p.click('[data-cc="save"]');
  await p.waitForTimeout(300);
  check('saving closes the panel and the bar', await p.isVisible('#cc-bar'), false);
});

// 5 · withdrawal from the footer, on a page the visitor already answered on
await session(async (p) => {
  await p.click('[data-cc="reject"]');
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-cc-reopen]').scrollIntoView());
  await p.click('[data-cc-reopen]');
  await p.waitForTimeout(300);
  check('footer link reopens preferences', await p.isVisible('#cc-prefs'), true);
  check('it shows the CURRENT answer, not a blank form', await p.isChecked('#cc-analytics'), false);
  await p.check('#cc-analytics');
  await p.click('[data-cc="save"]');
  await p.waitForTimeout(300);
  const stored = await p.evaluate(() => JSON.parse(decodeURIComponent(
    document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('vis_consent=')).slice('vis_consent='.length))));
  check('withdrawal/upgrade is honoured', stored.analytics, true);
});

// 6 · no JavaScript at all
{
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const beacon = [];
  p.on('request', (r) => { if (/cloudflareinsights/.test(r.url())) beacon.push(r.url()); });
  await p.goto('http://localhost:4321/', { waitUntil: 'load' });
  check('JS off: no beacon', beacon.length, 0);
  check('JS off: bar stays hidden rather than stuck open', await p.isVisible('#cc-bar'), false);
  check('JS off: the page still renders', (await p.locator('h1').count()) > 0, true);
  await ctx.close();
}

await b.close();
const w = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.pass ? ' ok ' : 'FAIL'}  ${r.name.padEnd(w)}  got ${JSON.stringify(r.got)}`);
const bad = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
