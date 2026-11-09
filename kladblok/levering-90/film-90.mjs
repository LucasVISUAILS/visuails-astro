/**
 * VISUAILS — de film van levering 90: de opening op 1440 × 900, van rust tot Wat we maken en terug.
 *
 *   node kladblok/levering-90/film-90.mjs <uitmap> [breed,hoog]     (na de build: leest dist/)
 *
 * Zonder grafische kaart haalt de browser maar ± 9 schermbeelden per seconde. Daarom draait de pagina hier TRAAG keer zo
 * langzaam (de video, de css-overgangen en de timers van de pagina) en wordt de film daarna weer op echte snelheid gezet:
 * dan zie je elk beeld, op de klok van de site. Scrollen gaat hier in kleine stapjes (in het echt doet zacht scrollen dat).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const DIST = path.resolve('dist');
const UIT = path.resolve(process.argv[2] || 'kladblok/levering-90/film');
const [VW, VH] = (process.argv[3] || '1440,900').split(',').map(Number);
const TRAAG = 8;
fs.rmSync(UIT, { recursive: true, force: true }); fs.mkdirSync(path.join(UIT, 'b'), { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer((q, r) => { let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const B = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const fouten = []; page.on('pageerror', (e) => fouten.push(String(e)));
await page.goto(B + '/nl/', { waitUntil: 'load' });
await page.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
await page.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
const top = await page.evaluate(() => document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56);
await page.evaluate((t) => scrollTo(0, t), top);
await page.waitForFunction(() => window.__o8Stand?.().kanSpelen && document.querySelector('[data-o8-beeld]').complete, null, { timeout: 60000 });
await page.waitForTimeout(1500);
/* vanaf hier TRAAG keer zo langzaam: de timers en de video van de pagina, en (via CDP) de css-overgangen */
await page.evaluate((T) => {
  const st = window.setTimeout.bind(window);
  window.setTimeout = (f, d, ...a) => st(f, (Number(d) || 0) * T, ...a);
  const pr = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', { configurable: true, get() { return pr.get.call(this) * T; }, set(v) { pr.set.call(this, v / T); } });
}, TRAAG);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Animation.enable');
await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / TRAAG });
const beelden = [];
cdp.on('Page.screencastFrame', async (f) => { const i = beelden.length; const p = path.join(UIT, 'b', `${String(i).padStart(5, '0')}.jpg`); fs.writeFileSync(p, Buffer.from(f.data, 'base64')); beelden.push([p, f.metadata.timestamp]); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: VW, maxHeight: VH, everyNthFrame: 1 });
const st = () => page.evaluate(() => window.__o8Stand());
const film = (s) => page.waitForTimeout(s * 1000 * TRAAG);
const wacht = async (f, ms = 120000) => { const t = Date.now(); for (;;) { const s = await st(); if (f(s)) return s; if (Date.now() - t > ms) return s; await page.waitForTimeout(100); } };
/* scrol `dy` px in `s` seconden film (gelijkmatig, met een zachte begin en eind) */
const scrol = async (dy, s) => { const y0 = await page.evaluate(() => scrollY), n = Math.round(s * 30); for (let k = 1; k <= n; k++) { const t = k / n, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(y0 + dy * e)); await page.waitForTimeout((s * 1000 * TRAAG) / n); } };
await film(1.2);
await page.mouse.move(700, 500);
await page.mouse.wheel(0, 120);
console.log('klaar', JSON.stringify(await wacht((s) => s.fase === 'klaar')));
await film(0.6);
await scrol(VH * 1.6, 1.8);
await film(0.8);
await scrol(-(VH * 1.6 - 20), 1.8);
console.log('rust', JSON.stringify(await wacht((s) => s.fase === 'rust')));
await film(1.4);
await cdp.send('Page.stopScreencast');
await page.waitForTimeout(500);
await browser.close(); server.close();
/* op echte snelheid: elk beeld zo lang tot het volgende (tijd / TRAAG), dan 30 per seconde */
const t0 = beelden[0][1];
const lijst = beelden.map(([p, t], i) => `file '${p}'\nduration ${(((beelden[i + 1]?.[1] ?? t + 0.1) - t) / TRAAG).toFixed(4)}`).join('\n') + `\nfile '${beelden[beelden.length - 1][0]}'\n`;
fs.writeFileSync(path.join(UIT, 'lijst.txt'), lijst);
const mp4 = path.join(UIT, `opening-90-${VW}x${VH}.mp4`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(UIT, 'lijst.txt'), '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', '-an', mp4]);
console.log('film', mp4, beelden.length, 'beelden over', ((beelden[beelden.length - 1][1] - t0) / TRAAG).toFixed(1), 's · fouten', JSON.stringify(fouten));
