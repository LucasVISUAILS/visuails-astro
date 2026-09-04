/* De publieke site doorgelicht: schermafdrukken in tegels + cijfers per pagina.
   4 september 2026.  node kladblok/doorlichting-site.mjs
   → kladblok/doorlichting/<pad>-<breedte>-<n>.png en kladblok/doorlichting/cijfers.json */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve('dist');
const OUT = path.resolve('kladblok/doorlichting');
await mkdir(OUT, { recursive: true });
const PORT = 8099;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  try { if ((await stat(p)).isDirectory()) p = path.join(p, 'index.html'); } catch { /* */ }
  try { const body = await readFile(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(url.pathname.startsWith('/api/') ? 401 : 404); res.end('{}'); }
}).listen(PORT);

const PADEN = process.argv.slice(2).length ? process.argv.slice(2) : [
  '/nl/', '/nl/catalog/', '/nl/lifestyle/', '/nl/video/', '/nl/custom-models/', '/nl/hooks/', '/nl/editions/',
  '/nl/pricing/', '/nl/plans/', '/nl/how-it-works/', '/nl/gallery/', '/nl/compare/', '/nl/faq/', '/nl/start/',
  '/nl/proef/', '/nl/about/', '/nl/contact/', '/nl/models/',
];
const TEGEL = 1300;
const browser = await chromium.launch({ executablePath: browserPad() });
const cijfers = {};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: w < 500, hasTouch: w < 500 });
  // De cookiebalk als beantwoord: anders ligt hij over elke eerste tegel.
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: new Date().toISOString() })), domain: '127.0.0.1', path: '/' }]);
  for (const p of PADEN) {
    const page = await ctx.newPage();
    let bytes = { js: 0, css: 0, img: 0, font: 0, n: 0 };
    page.on('response', async (r) => {
      try {
        const ct = r.headers()['content-type'] || '';
        const b = (await r.body().catch(() => null))?.length || 0;
        bytes.n++;
        if (ct.includes('javascript')) bytes.js += b; else if (ct.includes('css')) bytes.css += b;
        else if (ct.startsWith('image/')) bytes.img += b; else if (ct.includes('font')) bytes.font += b;
      } catch { /* */ }
    });
    await page.goto(`http://127.0.0.1:${PORT}${p}`, { waitUntil: 'networkidle' }).catch(() => {});
    // alles laden wat lui is: langzaam naar beneden scrollen
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y < H; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const tekst = document.body.innerText || '';
      const secties = [...document.querySelectorAll('main section, main > div > section, section')].filter(vis).map((s) => {
        const r = s.getBoundingClientRect();
        const kop = s.querySelector('h1,h2,h3');
        return { kop: (kop?.textContent || '').trim().slice(0, 70), top: Math.round(r.top + scrollY), h: Math.round(r.height), id: s.id || s.className.split(' ')[0] || '' };
      });
      const knoppen = [...document.querySelectorAll('a.btn, button, a[class*="btn"], a[class*="cta"]')].filter(vis);
      const klein = [...document.querySelectorAll('a, button')].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.height < 28 || r.width < 28; }).length;
      const kleineTekst = [...document.querySelectorAll('p, li, span, a, small')].filter(vis).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 13).length;
      const imgs = [...document.querySelectorAll('img')].filter(vis);
      const plaats = tekst.match(/FOTO VOLGT|BEELD VOLGT|Voorbeeld volgt|placeholder/gi)?.length || 0;
      return {
        hoogte: document.documentElement.scrollHeight,
        overloopX: document.documentElement.scrollWidth > innerWidth + 1,
        woorden: tekst.split(/\s+/).filter(Boolean).length,
        h1: document.querySelectorAll('h1').length,
        h2: [...document.querySelectorAll('h2')].filter(vis).map((h) => h.textContent.trim().slice(0, 60)),
        h3: [...document.querySelectorAll('h3')].filter(vis).length,
        secties,
        knoppen: knoppen.length,
        knopTeksten: [...new Set(knoppen.map((k) => k.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)))],
        links: [...document.querySelectorAll('a[href]')].filter(vis).length,
        kleineTikdoelen: klein,
        kleineTekst,
        imgs: imgs.length, imgsLazy: imgs.filter((i) => i.loading === 'lazy').length,
        imgsZonderAlt: imgs.filter((i) => !i.getAttribute('alt')).length,
        details: document.querySelectorAll('details').length,
        plaatshouders: plaats,
        dom: document.getElementsByTagName('*').length,
        video: document.querySelectorAll('video').length,
      };
    });
    m.bytes = bytes;
    const naam = `${p.replace(/\//g, '-').replace(/^-|-$/g, '') || 'home'}-${w}`;
    const full = path.join(OUT, `${naam}.png`);
    await page.screenshot({ path: full, fullPage: true });
    // tegels
    const meta = await sharp(full).metadata();
    let n = 0;
    for (let top = 0; top < meta.height; top += TEGEL) {
      const hh = Math.min(TEGEL, meta.height - top);
      await sharp(full).extract({ left: 0, top, width: meta.width, height: hh }).toFile(path.join(OUT, `${naam}-${String(++n).padStart(2, '0')}.png`));
    }
    m.tegels = n;
    cijfers[`${p} @${w}`] = m;
    console.log(`${naam.padEnd(28)} ${String(m.hoogte).padStart(6)}px  ${String(m.woorden).padStart(5)} w  h2=${m.h2.length}  knoppen=${m.knoppen}  tegels=${n}${m.overloopX ? '  OVERLOOP-X' : ''}`);
    await page.close();
  }
  await ctx.close();
}
await writeFile(path.join(OUT, 'cijfers.json'), JSON.stringify(cijfers, null, 2));
await browser.close();
server.close();
