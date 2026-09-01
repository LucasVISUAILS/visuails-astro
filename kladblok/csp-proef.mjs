/* Draait de gebouwde site achter de ECHTE header uit dist/_headers en kijkt of er
   iets geblokkeerd wordt. Een CSP die je niet in een browser hebt gezien, is een
   CSP waarvan je hoopt dat hij klopt. */
import { createServer } from 'node:http';
import { readFile, readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const DIST = '/tmp/vb/dist';
const headers = readFileSync(join(DIST, '_headers'), 'utf8');
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)[1].trim();
console.log('CSP lengte:', csp.length, 'bytes\n');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'Content-Security-Policy': csp });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(8099, r));

const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
import { globSync } from 'node:fs';
const alle = globSync(join(DIST, '**/index.html')).map((f) => f.slice(DIST.length).replace(/\\/g, '/').replace(/\/index\.html$/, '') || '/');
/* Elke pagina, niet een greep eruit: het hele punt van een hash-lijst is dat er geen
   pagina buiten valt, en negen hashes over 93 pagina's is precies waar dat misgaat. */
const PAGINAS = alle;
let stuk = 0;
for (const pad of PAGINAS) {
  const page = await browser.newPage();
  const meldingen = [];
  const mist = new Set();
  page.on('console', (m) => { if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) meldingen.push(m.text()); });
  page.on('requestfailed', () => {});
  page.on('response', (r) => { if (r.status() === 404) mist.add(new URL(r.url()).pathname); });
  page.on('pageerror', (e) => meldingen.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    window.__viol = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__viol.push(`${e.violatedDirective} → ${e.blockedURI} (${String(e.sourceFile || '')}:${e.lineNumber})`);
    });
  });
  const res = await page.goto(`http://localhost:8099${pad}`, { waitUntil: 'networkidle' }).catch(() => null);
  /* Scrollen hoort erbij: de helft van de bewegingen op deze site hangt aan
     ScrollTrigger, en die schrijft pas stijl als je langskomt. Een CSP-proef die
     alleen de bovenkant laadt, meet de helft van de pagina. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  }).catch(() => {});
  await page.waitForTimeout(400);
  const viol = await page.evaluate(() => window.__viol || []);
  const status = res ? res.status() : '—';
  if (viol.length || meldingen.length) {
    stuk += 1;
    console.log(`FAIL ${pad} (${status})`);
    for (const v of viol) console.log('     CSP:', v);
    for (const m of meldingen.slice(0, 4)) console.log('     con:', m.slice(0, 200));
  } else {
    console.log(` ok  ${pad} (${status})${mist.size ? `  [404: ${[...mist].join(', ')}]` : ''}`);
  }
  await page.close();
}
await browser.close();
server.close();
console.log(stuk ? `\n${stuk} pagina('s) met meldingen` : '\ngeen enkele overtreding');
