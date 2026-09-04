/* axe-core over het ADMINSCHERM. Dat wordt door Pages Functions gerenderd en
   staat dus niet in dist/ — alle andere toegankelijkheidsrondes zijn er nooit
   langs geweest, terwijl dit de plek is waar een BETALENDE klant woont.

   De html komt uit scripts/account-render.mjs met VISUAILS_DUMP_HTML, dus met
   dezelfde nepdatabase waarmee de schermafdrukken worden gemaakt. De echte CSP
   en public/admin.css gaan mee, want zonder die twee meet je een pagina die
   niemand krijgt. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { chromium } from 'playwright';

const MAP = process.argv[2] || '/tmp/adm';
const ROOT = '/tmp/vb';
const AXE = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const CSS = readFileSync(join(ROOT, 'public/admin.css'), 'utf8');
const CSP = "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const FOTOS = readdirSync(join(ROOT, 'public/img')).filter((f) => /\.webp$/.test(f)).map((f) => join(ROOT, 'public/img', f));

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const bevindingen = new Map();

for (const [w, h] of [[1280, 900], [420, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ctx.addInitScript(AXE);
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: CSS });
    if (/^\/admin\/files\/(\d+)$/.test(u.pathname) || u.pathname.startsWith('/img/')) {
      const n = Math.abs([...u.pathname].reduce((a, c) => a + c.charCodeAt(0), 0));
      return route.fulfill({ contentType: 'image/webp', body: readFileSync(FOTOS[n % FOTOS.length]) });
    }
    if (u.pathname === '/__page') {
      return route.fulfill({ contentType: 'text/html', headers: { 'content-security-policy': CSP }, body: globalThis.__html });
    }
    return route.fulfill({ status: 204, body: '' });
  });

  for (const f of readdirSync(MAP).filter((x) => x.endsWith('.html')).sort()) {
    globalThis.__html = readFileSync(join(MAP, f), 'utf8');
    const page = await ctx.newPage();
    await page.goto('https://visuails.com/__page', { waitUntil: 'load' });
    await page.waitForTimeout(200);
    const r = await page.evaluate(async () => {
      const res = await window.axe.run(document, {
        resultTypes: ['violations'],
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
      });
      return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        waarom: (v.nodes[0].any.concat(v.nodes[0].all)).map((c) => c.message).join(' ~ ') }));
    });
    for (const v of r) {
      if (!bevindingen.has(v.id)) bevindingen.set(v.id, { impact: v.impact, help: v.help, waarom: v.waarom, plekken: [] });
      bevindingen.get(v.id).plekken.push(`${w}px ${basename(f, '.html')} (${v.n}×) ${v.nodes[0]}`);
    }
    await page.close();
  }
  await ctx.close();
  console.log(`${w}px klaar`);
}
await b.close();

const orde = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const rijen = [...bevindingen.entries()].sort((a, b) => (orde[a[1].impact] ?? 9) - (orde[b[1].impact] ?? 9));
console.log(`\n${rijen.length} soort(en) bevinding op het dashboard\n`);
for (const [id, v] of rijen) {
  console.log(`── ${String(v.impact).toUpperCase()} · ${id} — ${v.help}`);
  console.log(`   ${v.waarom}`);
  console.log(`   ${v.plekken.length} plek(ken); eerste drie:`);
  for (const p of v.plekken.slice(0, 3)) console.log(`     ${p}`);
  console.log('');
}
