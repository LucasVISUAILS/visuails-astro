/*
 * RONDE 91 · D01 — DE VOORPAGINA BLIJFT NIET VAST ALS DE BROWSER HET AFSPELEN WEIGERT
 * 9 november 2026
 *
 * Safari met "Automatisch afspelen: Nooit" (per site in te stellen) weigert play() ook voor een stomme
 * video. De opening (HalOpening80.astro) zette de pagina vast, riep play() aan en slikte de weigering in
 * met `.catch(() => {})`. Er kwam dan nooit een `ended`, en wiel, PageDown en spatie deden niets meer:
 * de bezoeker stond op 504 px en kon alleen nog met de schuifbalk verder.
 *
 * Deze toets bundelt het script van de opening UIT DE BRON (esbuild, zoals Astro het doet), zet het in de
 * gebouwde voorpagina in plaats van de oude bundel, laat play() weigeren zoals Safari dat doet, en kijkt
 * of het wiel de pagina nog verder krijgt. Zo toetst hij de bron en niet een dist/ van gisteren.
 *
 * Nodig: een build (dist/index.html) en een Chromium met H.264 (anders speelt de opening nooit en is er
 * niets te toetsen: dan overgeslagen, met de reden).
 *
 *   node tests/blind91-d-opening-play.test.mjs
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}
console.log('\nVISUAILS — ronde 91 D01: de opening als de browser play() weigert\n');

const BRON = fs.readFileSync(path.join(ROOT, 'src/components/HalOpening80.astro'), 'utf8');
ok('geen enkele play() slikt een weigering meer stil in', !/\.play\(\)\.catch\(\(\) => \{\}\)/.test(BRON));
ok('heen: een weigering geeft het op (opgeven)', /sp\.v\.play\(\)\.catch\(\(\) => \{ if \(fase === 'speelt' && speler\(\) === sp\) opgeven\(\); \}\)/.test(BRON));

const html = path.join(DIST, 'index.html');
if (!fs.existsSync(html)) { console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)'); console.log(`\n${pass} goed, ${fail} fout`); process.exit(fail ? 1 : 0); }
const chunk = (/src="\/_astro\/(HalOpening80[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];

/* Het script uit de bron, gebundeld. */
const m = /\n<script>\n([\s\S]*?)\n<\/script>/.exec(BRON);
const esbuild = await import('esbuild');
const gebundeld = (await esbuild.build({
  stdin: { contents: m[1], resolveDir: path.join(ROOT, 'src/components'), loader: 'ts', sourcefile: 'HalOpening80.ts' },
  bundle: true, format: 'esm', write: false, logLevel: 'silent',
})).outputFiles[0].text;
ok('het script uit de bron bundelt', gebundeld.length > 1000);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  if (chunk && p === `/_astro/${chunk}`) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(gebundeld); }
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad(), args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const weiger of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    if (weiger) await ctx.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('niet toegestaan', 'NotAllowedError')); }; });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    let klaar = false;
    for (let i = 0; i < 60 && !klaar; i++) { await page.waitForTimeout(250); klaar = await page.evaluate(() => !!(window.__o8Stand && window.__o8Stand().kanSpelen)); }
    if (!klaar) { console.log(`      (${weiger ? 'weiger' : 'gewoon'}: overgeslagen — de video speelt hier niet; Chromium zonder H.264?)`); await ctx.close(); continue; }
    await page.mouse.move(700, 450);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(500); }
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(600);
    const y = await page.evaluate(() => window.scrollY);
    const stand = await page.evaluate(() => window.__o8Stand());
    ok(`${weiger ? 'play() geweigerd' : 'play() mag'}: de pagina scrolt door (scrollY ${Math.round(y)} > 1200)`, y > 1200, JSON.stringify({ fase: stand.fase, stap: stand.stap }));
    if (weiger) ok('play() geweigerd: niet meer vast (fase niet "speelt")', stand.fase !== 'speelt', stand.fase);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
