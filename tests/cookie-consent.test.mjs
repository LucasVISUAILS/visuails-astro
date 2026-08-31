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
import { existsSync, statSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStaat } from './lib/build.mjs';

/* ── HIJ ZET ZIJN EIGEN SERVER OP — 30 AUGUSTUS 2026 ────────────────────────
 *
 * Hier stond: *"Needs a preview server on :4321 — npm run build && npm run
 * preview"*. Dat is de reden dat deze suite als enige van de tweeëntachtig NIET
 * in de `npm test`-ketting stond: hij zou omvallen bij iedereen die geen server
 * had draaien, en dus is hij er ooit uitgelaten.
 *
 * Het gevolg is precies de fout die dit project al twee keer heeft opgeschreven
 * (zie WERKLIJST.md over de vier suites die nergens in `npm test` stonden): een
 * toets die je denkt te hebben. Achtentwintig controles op de cookiebanner —
 * een juridisch oppervlak — die alleen liepen als iemand er met de hand aan
 * dacht.
 *
 * Dus doet hij nu wat a11y.test.mjs en de kruipronde al doen: hij serveert
 * dist/ zelf, op een poort die het besturingssysteem uitdeelt. Geen vaste 4321
 * meer, dus hij botst ook niet met een `astro dev` die toevallig draait.
 *
 * De banner is één script en één stylesheet uit public/ — statisch serveren is
 * genoeg, en het is bovendien dichter bij wat Cloudflare Pages doet dan een
 * dev-server met hot reload ertussen. */
const HIER = dirname(fileURLToPath(import.meta.url));
const DIST = join(HIER, '..', 'dist');

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json',
  '.xml': 'application/xml', '.txt': 'text/plain',
};
const srv = createServer((q, r) => {
  let f = join(DIST, decodeURIComponent(q.url.split('?')[0]));
  try { if (statSync(f).isDirectory()) f = join(f, 'index.html'); } catch { /* geen map */ }
  try { statSync(f); } catch { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(r);
});
await new Promise((res) => srv.listen(0, res));
const BASIS = `http://127.0.0.1:${srv.address().port}`;

/* Een browser is er wel één keer voor nodig — npx playwright install chromium */
/* ── ZIE scripts/lib/browserpad.mjs — 26 augustus 2026 ──────────────────────
   Dit was een hard pad zonder controle, en dus een toets die op Lucas' machine
   omvalt op de browser in plaats van op de site. De andere browsertoetsen
   (a11y, homerail, pipeline-steps, upload-retry, zachte-navigatie) hebben
   allemaal al een existsSync-vangnet; deze was de enige zonder. */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});

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
  await p.goto(`${BASIS}/`, { waitUntil: 'networkidle' });
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
  await p.goto(`${BASIS}/`, { waitUntil: 'load' });
  check('JS off: no beacon', beacon.length, 0);
  check('JS off: bar stays hidden rather than stuck open', await p.isVisible('#cc-bar'), false);
  check('JS off: the page still renders', (await p.locator('h1').count()) > 0, true);
  await ctx.close();
}

await b.close();
srv.close();
const w = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.pass ? ' ok ' : 'FAIL'}  ${r.name.padEnd(w)}  got ${JSON.stringify(r.got)}`);
const bad = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - bad}/${results.length} passed`);
process.exit(bad ? 1 : 0);
