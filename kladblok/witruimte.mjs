/* WITRUIMTE-METING — 4 september 2026.
   Lucas: "de knop Pay now staat letterlijk onderaan het orderblok op de rand;
   er mag wel wat meer whitespace gebruikt worden over het algemeen."

   Meet, per pagina, elk knop-, veld- en tekstelement tegen wat er onder staat
   en tegen de rand van zijn eigen kader:
     · KRAP-ONDER   : minder dan MIN_GAP px tot het volgende zichtbare element
     · OP-DE-RAND   : minder dan MIN_EDGE px tot de onderrand van een omkaderd
                      voorouder-blok (rand, schaduwlijn of eigen achtergrond)
   Bronnen: de Studio- en adminschermen uit kladblok/keten/*.html (echte
   renders) en de publieke pagina's uit dist/.

     node kladblok/witruimte.mjs            → alle bronnen
     node kladblok/witruimte.mjs studio     → alleen kladblok/keten/*studio*.html
*/
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const MIN_GAP = 12;
const MIN_EDGE = 14;
const ROOT = path.resolve('.');
const filter = process.argv[2] || '';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
  for (const base of ['dist', 'public']) {
    let p = path.join(ROOT, base, decodeURIComponent(url.pathname));
    try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch { continue; }
    if (fs.existsSync(p) && fs.statSync(p).isFile()) { res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); return res.end(fs.readFileSync(p)); }
  }
  res.writeHead(404); res.end('');
}).listen(8099);

const PROBE = ({ MIN_GAP, MIN_EDGE }) => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const framed = (el) => { const cs = getComputedStyle(el); return parseFloat(cs.borderBottomWidth) > 0 || /inset/.test(cs.boxShadow) || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'); };
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
  const targets = [...document.querySelectorAll('button, a.btn, .btn, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea, h1, h2, h3, p, li, dl, .pill')].filter(vis);
  const all = [...document.querySelectorAll('body *')].filter((e) => vis(e) && !['SCRIPT', 'STYLE', 'SVG', 'PATH', 'SPAN', 'B', 'STRONG', 'EM', 'I', 'CODE'].includes(e.tagName));
  const out = [];
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    if (el.closest('nav, header, footer, .bar, .topbar, .sidebar, [class*="nav"]')) continue;
    // 1. te weinig lucht naar het volgende element eronder (dat niet in el zit en el niet bevat)
    let best = null;
    for (const o of all) {
      if (o === el || el.contains(o) || o.contains(el)) continue;
      const q = o.getBoundingClientRect();
      const overlapX = Math.min(r.right, q.right) - Math.max(r.left, q.left);
      if (overlapX <= 8) continue;
      const gap = q.top - r.bottom;
      if (gap >= -1 && (best === null || gap < best.gap)) best = { gap, o };
    }
    if (best && best.gap < MIN_GAP && !(el.tagName === 'LI' && best.o.tagName === 'LI') && !(el.tagName === 'P' && best.o.tagName === 'P' && best.gap >= 4)) {
      // knoppen in één rij naast elkaar zijn geen boven/onder-paar
      out.push({ soort: 'KRAP-ONDER', gap: Math.round(best.gap), el: label(el), volgend: label(best.o) });
    }
    // 2. op de rand van het eigen kader
    let p = el.parentElement;
    while (p && p !== document.body) {
      if (framed(p)) {
        const q = p.getBoundingClientRect();
        const cs = getComputedStyle(p);
        const edge = q.bottom - r.bottom - parseFloat(cs.borderBottomWidth || 0);
        if (edge >= 0 && edge < MIN_EDGE && /button|btn|input|select|textarea/i.test(el.tagName + ' ' + el.className)) out.push({ soort: 'OP-DE-RAND', gap: Math.round(edge), el: label(el), volgend: label(p) });
        break;
      }
      p = p.parentElement;
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const bronnen = [];
for (const f of fs.readdirSync('kladblok/keten').filter((f) => f.endsWith('.html')).sort()) {
  if (filter && !f.includes(filter)) continue;
  bronnen.push({ naam: `keten/${f}`, html: fs.readFileSync(path.join('kladblok/keten', f), 'utf8') });
}
if (!filter || filter === 'site') {
  for (const p of ['/nl/', '/nl/pricing/', '/nl/catalog/', '/nl/lifestyle/', '/nl/how-it-works/', '/nl/faq/', '/nl/contact/', '/nl/start/catalog/', '/nl/test-sample/', '/nl/plans/', '/nl/studio/', '/nl/gallery/', '/nl/about/', '/nl/thank-you/']) bronnen.push({ naam: p, url: `http://127.0.0.1:8099${p}` });
}
let totaal = 0;
for (const b of bronnen) {
  const page = await ctx.newPage();
  if (b.url) await page.goto(b.url, { waitUntil: 'networkidle' }).catch(() => {});
  else {
    await page.route('**/__p', (r) => r.fulfill({ contentType: 'text/html', body: b.html }));
    await page.route(/\.(css|woff2|webp|png|svg)$/, (r) => { const p = path.join(ROOT, 'public', new URL(r.request().url()).pathname); fs.existsSync(p) ? r.fulfill({ body: fs.readFileSync(p), contentType: p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }) : r.fulfill({ status: 204, body: '' }); });
    await page.route(/\/(files|models|f)\/\d+|\/f$|\/preview$/, (r) => r.fulfill({ status: 204, body: '' }));
    await page.goto('http://127.0.0.1:8099/__p', { waitUntil: 'networkidle' }).catch(() => {});
    await page.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
  }
  await page.waitForTimeout(300);
  const uit = await page.evaluate(PROBE, { MIN_GAP, MIN_EDGE });
  const uniek = [...new Map(uit.map((u) => [`${u.soort}|${u.el}|${u.volgend}`, u])).values()];
  if (uniek.length) {
    console.log(`\n${b.naam}`);
    for (const u of uniek) console.log(`  ${u.soort.padEnd(11)} ${String(u.gap).padStart(3)}px  ${u.el}  →  ${u.volgend}`);
  }
  totaal += uniek.length;
  await page.close();
}
await browser.close();
server.close();
console.log(`\n${totaal} meldingen`);
