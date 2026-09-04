/* axe-core over de gebouwde site, achter de ECHTE CSP-header. Niet één pagina:
   elke pagina, en op twee breedtes, want de mobiele lade is een ander document.
   axe-core staat met --no-save geïnstalleerd — dit is gereedschap, geen afhankelijkheid. */
import { createServer } from 'node:http';
import { readFile, readFileSync, existsSync, globSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = '/tmp/vb/dist';
const AXE = readFileSync('/tmp/vb/node_modules/axe-core/axe.min.js', 'utf8');
const headers = readFileSync(join(DIST, '_headers'), 'utf8');
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)[1].trim();

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nope'); }
    /* axe wordt met addInitScript geïnjecteerd; dat valt buiten de CSP van de
       pagina, dus de header kan gewoon de echte blijven. */
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'Content-Security-Policy': csp });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(8098, r));

const alle = globSync(join(DIST, '**/index.html'))
  .map((f) => f.slice(DIST.length).replace(/\\/g, '/').replace(/\/index\.html$/, '') || '/');

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});

const BREEDTES = [[1440, 900], [390, 844]];
const bevindingen = new Map();   // ruleId → { impact, help, plekken: [] }

for (const [w, h] of BREEDTES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await ctx.addInitScript(AXE);
  for (const pad of alle) {
    const page = await ctx.newPage();
    try {
      await page.goto(`http://127.0.0.1:8098${pad}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(150);
      const r = await page.evaluate(async () => {
        const res = await window.axe.run(document, {
          resultTypes: ['violations'],
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
        });
        return res.violations.map((v) => ({
          id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        }));
      });
      for (const v of r) {
        if (!bevindingen.has(v.id)) bevindingen.set(v.id, { impact: v.impact, help: v.help, plekken: [] });
        bevindingen.get(v.id).plekken.push(`${w}px ${pad} — ${v.nodes.join(' | ')}`);
      }
    } catch (e) {
      console.log(`  ?  ${w}px ${pad}: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
  await ctx.close();
  console.log(`${w}px klaar (${alle.length} pagina's)`);
}

await browser.close();
server.close();

const orde = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const rijen = [...bevindingen.entries()].sort((a, b) => (orde[a[1].impact] ?? 9) - (orde[b[1].impact] ?? 9));
console.log(`\n${rijen.length} soort(en) bevinding over ${alle.length} pagina's × ${BREEDTES.length} breedtes\n`);
for (const [id, v] of rijen) {
  console.log(`── ${String(v.impact).toUpperCase()} · ${id} — ${v.help}`);
  console.log(`   ${v.plekken.length} plek(ken); eerste drie:`);
  for (const p of v.plekken.slice(0, 3)) console.log(`     ${p}`);
  console.log('');
}
