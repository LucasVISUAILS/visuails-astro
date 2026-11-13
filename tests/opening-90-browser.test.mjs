/**
 * VISUAILS — de opening van levering 90 (8 november 2026): gewoon de video. Vervangt tests/opening-89-browser.test.mjs
 * (daar tekende WebGL de schermen, de rit en de metro).
 *
 *   node tests/opening-90-browser.test.mjs      (npm run test:opening90; na de build: leest dist/)
 *
 * Lucas, 8 november 15:59: "Gewoon de video gebruiken niet zelf animeren omdat de lag dan alleen maar erger word. Zorg dat
 * hij er strak uit komt te zien en perfect van foto naar video overgaat."
 *
 *   1 · de bron: een gewone video (geen WebGL, geen doek, geen metro), heen en terug per breedte, 112 beelden; de foto is
 *       beeld 0 (webp, geen avif); bij de start vervagen de winkel en de foto samen in de video (120 ms), de foto pas weg
 *       als hij doorzichtig is; het vak op hele pixels; zonder H.264 geen effect;
 *   2 · in de browser op 1440 × 900: bij het laden beweegt niets; de eerste scroll is gewoon scrollen; de foto en beeld 0
 *       van de video zijn hetzelfde beeld; één scroll omlaag speelt de video tot het eind, zonder te zoeken, met de pagina
 *       vast; daarna scrol je verder en schuift Wat we maken erover; één scroll omhoog in de rustzone speelt hem terug, de
 *       foto en de winkel komen terug en pas dan wisselt eronder de video; inhalen, een grote sleep, een sprong; de streepjes;
 *   3 · op de telefoon en bij minder beweging: geen baan, alles staat stil;
 *   4 · zonder H.264, zonder video, en weg van de voorpagina; geen scriptfouten.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

/* ── 1 · de bron ── */
console.log('\n1 · de bron');
const opening = lees('src/components/HalOpening80.astro');
const css = lees('src/styles/opening-80.css');
const zacht = lees('src/scripts/zachtscrollen.js');
const V90 = JSON.parse(lees('src/data/laptopVideo90.json'));
ok('gewoon de video: geen WebGL, geen doek, geen metro (alleen schermvlak.js voor de stilstaande schermen)',
  /from '\.\.\/scripts\/schermvlak\.js'/.test(opening) && !/from '\.\.\/scripts\/(laptopdoek|metro)/.test(opening) && !/getContext\(|data-o8-doek|data-o8-metro/.test(opening) && /v\.className = 'o8-video'/.test(opening));
ok('het wiel wordt afgevangen vóór zacht scrollen (capture, niet passief), en zacht scrollen kan gestopt worden',
  /window\.addEventListener\('wheel', opWiel, \{ passive: false, capture: true \}\)/.test(opening) && /window\.__visZachtStop = stop;/.test(zacht) && /__visZachtStop\?\.\(\)/.test(opening));
/* 8 november 21:44 (Lucas: "kan toch wel sneller (tussen de 1.5 en 2.5 seconden …)"): 60 per seconde op 1 ×, 1,87 s */
/* levering 93 (lijst 90, B2 b en B3 a): de video op 1,4 s (1,336 ×); elke scroll terwijl het loopt een tree sneller (1,8 · 3 · 4 ×) */
const duur93 = V90.beelden / V90.fps / V90.snelheid;
ok('60 per seconde op 1,336 × (1,4 s), een scroll versnelt zacht (1,8 · 3 · 4 ×); wat sleept voorbij 400 px maakt hem af',
  Math.abs(V90.snelheid - 1.336) < 1e-9 && duur93 >= 1.3 && duur93 <= 1.5 && /const TREDEN = \[1\.8, 3, 4\], GLIJ = 0\.18;/.test(opening) && /const DREMPEL = 8, SLEEP = 400;/.test(opening));
ok('na de video zinkt het veld (480 ms, ease-in) en springt de pagina naar Wat we maken (lijst 90, B1 c)',
  /const ZINK = 480, WIT = 60, TERUG = 380;/.test(opening) && /function spring\(\)/.test(opening) && /\.o8\.o8-weg :is\(\.o8-vlak, \.o8-foto\) \{ opacity: 0; \}/.test(css));
ok('de video: 112 beelden op 60 per seconde, 2944 × 1248, de klep staat de eerste 7 beelden stil', V90.beelden === 112 && V90.fps === 60 && V90.b === 2944 && V90.h === 1248 && V90.stilTot === 7);
/* de maat en het aantal beelden uit de mp4 zelf (moov → trak met hdlr 'vide' → tkhd en stsz), zonder ffprobe (op Lucas'
   computer staat geen ffmpeg) */
function mp4(bestand) {
  const b = fs.readFileSync(bestand);
  const dozen = (s, e) => { const uit = []; let i = s;
    while (i + 8 <= e) { let n = b.readUInt32BE(i), h = 8; const t = b.toString('latin1', i + 4, i + 8);
      if (n === 1) { n = Number(b.readBigUInt64BE(i + 8)); h = 16; } else if (n === 0) n = e - i;
      if (n < h || i + n > e) break; uit.push({ t, s: i + h, e: i + n }); i += n; }
    return uit; };
  const top = dozen(0, b.length), moov = top.find((d) => d.t === 'moov'), mdat = top.find((d) => d.t === 'mdat'); if (!moov) return null;
  const sporen = dozen(moov.s, moov.e).filter((d) => d.t === 'trak');
  for (const trak of sporen) {
    const tk = dozen(trak.s, trak.e), mdia = tk.find((d) => d.t === 'mdia'); if (!mdia) continue;
    const md = dozen(mdia.s, mdia.e), hdlr = md.find((d) => d.t === 'hdlr');
    if (!hdlr || b.toString('latin1', hdlr.s + 8, hdlr.s + 12) !== 'vide') continue;
    const tkhd = tk.find((d) => d.t === 'tkhd'), minf = md.find((d) => d.t === 'minf');
    const stbl = minf && dozen(minf.s, minf.e).find((d) => d.t === 'stbl'), stsz = stbl && dozen(stbl.s, stbl.e).find((d) => d.t === 'stsz');
    const stsd = stbl && dozen(stbl.s, stbl.e).find((d) => d.t === 'stsd');
    if (!tkhd || !stsz || !stsd) return null;
    return { b: b.readUInt32BE(tkhd.e - 8) / 65536, h: b.readUInt32BE(tkhd.e - 4) / 65536, beelden: b.readUInt32BE(stsz.s + 8),
      avc: b.toString('latin1', stsd.s + 12, stsd.s + 16) === 'avc1', sporen: sporen.length, snelstart: !!mdat && moov.s < mdat.s };
  }
  return null;
}
const vd = path.join(ROOT, 'public', 'img', 'hal', 'laptop-video'), fd = path.join(ROOT, 'public', 'img', 'hal', 'opening');
const vids = V90.maten.flatMap((b) => ['', '-terug'].map((k) => ({ f: `laptop-90-${b}${k}.mp4`, b })));
const gemeten = vids.map(({ f, b }) => ({ f, b, m: fs.existsSync(path.join(vd, f)) ? mp4(path.join(vd, f)) : null }));
ok(`heen en terug per breedte (${V90.maten.join(', ')}): H.264, 112 beelden, 92 : 39, alleen beeld, de index vooraan`,
  V90.maten.every((b) => b % 92 === 0) && gemeten.every(({ b, m }) => m && m.b === b && m.h === (b / 92) * 39 && m.beelden === 112 && m.avc && m.sporen === 1 && m.snelstart),
  JSON.stringify(gemeten.filter(({ b, m }) => !(m && m.b === b && m.beelden === 112 && m.snelstart && m.sporen === 1))));
ok('… en hoogstens 4 MB per video (de grootste is 2944 breed)', gemeten.every(({ f }) => fs.existsSync(path.join(vd, f)) && fs.statSync(path.join(vd, f)).size < 4.2e6));
ok('het teken achter de video telt heen en terug mee (een nieuwe video wordt opnieuw gehaald)', /laptop-90-\$\{b\}\$\{k\}\.mp4/.test(opening) && /for \(const k of \['', '-terug'\]\)/.test(opening));
ok('de foto met het effect is beeld 0, als webp (geen avif: die strijkt de korrel glad), per breedte',
  V90.maten.every((b) => fs.existsSync(path.join(fd, `laptop-90-${b}.webp`)) && !fs.existsSync(path.join(fd, `laptop-90-${b}.avif`)))
  && /<source media=\{MEDIA90\} type="image\/webp" srcset=\{SET90\} sizes=\{SIZES90\} data-o8-90 \/>/.test(opening));
ok('de video als blob (Cloudflare geeft geen Range), weer vrijgegeven', /URL\.createObjectURL/.test(opening) && /URL\.revokeObjectURL/.test(opening));
ok('de overgang: de winkel en de foto vervagen samen in de video (120 ms, de foto lineair, binnen de 133 ms dat de klep stilstaat), de foto pas daarna echt weg',
  /html\.o8-aan \.o8\.o8-winkel-uit \.o8-beeld \{ opacity: 0; visibility: hidden; transition: opacity \.12s linear, visibility 0s \.12s; \}/.test(css)
  && /\.o8\.o8-winkel-uit \.o8-sc \{ opacity: 0; visibility: hidden; transition: opacity \.12s/.test(css)
  && /uitTimer = window\.setTimeout\(fotoWeg, UIT \+ 40\);/.test(opening) && /const UIT = 120/.test(opening) && 120 <= (V90.stilTot + 1) / V90.fps * 1000);
/* levering 94: het veld is weg (VELD=wit), dus ook geen korrel; levering 95: zuiver wit (VELD=puur), met multiply op de grond */
ok('geen korrel achter de laptop: niet in de video, niet op het vlak (8 november 21:44)', /zonder korrel|^wit|^puur wit/.test(V90.veld) && !/\.o8-vlak::after/.test(css));
ok('… en de laptop ligt met multiply op de grond, zodat het witte veld in elke browser precies de grond is (levering 95)', /\.o8\.o8-alleen \.o8-foto \{ mix-blend-mode: multiply; \}/.test(css));
ok('… nooit een video bovenop die nog een ander beeld toont (eerst zoeken, dan tonen), en terug pas wisselen als de foto weer op is',
  /function opBeeld\(sp: Speler, j: number, f: \(\) => void\)/.test(opening) && /function naFotoOp\(/.test(opening) && /naFotoOp\(\(\) => rustig\(heenOpNul\)\)/.test(opening));
ok('het vak van de foto en de video op hele pixels (dan zet de browser ze precies gelijk neer)', /@supports \(width: round\(1px, 1px\)\)/.test(css) && /--o8-fwh: round\(var\(--o8-fw\), 2px\)/.test(css));
ok('zonder H.264 geen effect (ook niet in het eerste beeld)', /canPlayType\('video\/mp4; codecs="avc1\.640032"'\)\) document\.documentElement\.classList\.add\('o8-aan'\)/.test(opening) && /const kanHet = \(\) => h264 &&/.test(opening));
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
ok("de CSP laat de blob toe: media-src 'self' blob:", /media-src 'self' blob:/.test(fs.readFileSync(path.join(DIST, '_headers'), 'utf8')));

/* ── 2 · in de browser ── */
console.log('\n2 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
/* zonder Range, zoals Cloudflare */
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const fouten = [];
const wacht = (p, ms) => p.waitForTimeout(ms);
/* zonder grafische kaart (SwiftShader) gaat alles veel trager dan in het echt: ruime tijden, en wachten op de stand */
const LANG = 60000;
async function open(opties) {
  const ctx = await browser.newContext(opties);
  const page = await ctx.newPage();
  page.setDefaultTimeout(LANG);
  page.on('pageerror', (e) => fouten.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) fouten.push(m.text()); });
  await page.goto(BASIS + '/nl/', { waitUntil: 'load' });
  await page.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
  await page.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
  return { ctx, page };
}
/* het verschil tussen twee schermafdrukken (grootste kanaal per punt), onder de balk en buiten de vakken `zonder` */
async function verschil(a, b, vanaf, zonder = []) {
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  const hist = new Uint32Array(256); let n = 0, som = 0;
  /* Ronde 91: waar de grote verschillen zitten (> 60), zodat een rode regel meteen zegt wélk stuk van het beeld afwijkt. */
  const vak = [1e9, 1e9, -1, -1]; let groot = 0;
  for (let r = vanaf; r < x.info.height; r++) for (let c = 0; c < x.info.width; c++) {
    if (zonder.some(([x0, y0, x1, y1]) => c >= x0 && c <= x1 && r >= y0 && r <= y1)) continue;
    const i = (r * x.info.width + c) * 3; let d = 0;
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(x.data[i + k] - y.data[i + k]));
    hist[d]++; som += d; n++;
    if (d > 60) { groot++; vak[0] = Math.min(vak[0], c); vak[1] = Math.min(vak[1], r); vak[2] = Math.max(vak[2], c); vak[3] = Math.max(vak[3], r); }
  }
  const pct = (p) => { let k = 0; for (let d = 0; d < 256; d++) { k += hist[d]; if (k >= p * n) return d; } return 255; };
  return { gem: +(som / n).toFixed(2), p99: pct(0.99), p999: pct(0.999), groot, vak: groot ? vak : null };
}
try {
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const m = await page.evaluate(() => {
    /* levering 94: de laptop staat onder Wat we maken (alleenLaptop), zonder kop */
    return { aan: document.documentElement.classList.contains('o8-aan'), alleen: document.querySelector('.o8').classList.contains('o8-alleen'), sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
  });
  ok('het effect staat aan (html.o8-aan), alleen de laptop, niets zijwaarts', m.aan && m.alleen && m.sw <= m.vw, JSON.stringify(m));
  await wacht(page, 1200);
  const rust = await page.evaluate(() => ({ cls: document.querySelector('.o8').className, s: window.__o8Stand?.() }));
  ok('bij het laden beweegt niets: in rust, de foto op, de winkel aan', !!rust.s && rust.s.fase === 'rust' && !/o8-onderweg|o8-winkel-uit|o8-speelt/.test(rust.cls), JSON.stringify({ fase: rust.s?.fase, cls: rust.cls }));
  const baan = await page.evaluate(() => { const b = document.querySelector('.o8-baan'); return { top: b.getBoundingClientRect().top + scrollY - 56 }; });
  const stand = () => page.evaluate(() => { const s = window.__o8Stand(); const b = document.querySelector('[data-o8-beeld]');
    return { ...s, y: Math.round(scrollY), cls: document.querySelector('.o8').className, m8: document.querySelector('.m8').className,
      m8top: Math.round(document.querySelector('.m8').getBoundingClientRect().top), podium: Math.round(document.querySelector('.o8-podium').getBoundingClientRect().top),
      foto: parseFloat(getComputedStyle(b).opacity), fotoZicht: getComputedStyle(b).visibility, fotoSrc: b.currentSrc }; });

  /* gewoon scrollen naar de laptop: de pagina loopt mee, geen sprong */
  await page.mouse.move(720, 450); await page.mouse.wheel(0, 120); await wacht(page, 900);
  const y1 = await page.evaluate(() => scrollY);
  ok('de eerste scroll is gewoon scrollen (geen sprong naar de laptop, niets speelt)', y1 >= 60 && y1 <= 240 && (await stand()).fase === 'rust', String(y1));
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(baan.top));
  await page.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen && document.querySelector('[data-o8-beeld]').complete, null, { timeout: LANG }).catch(() => {});
  await wacht(page, 800);
  const a = await stand();
  const fotoB = Number((/laptop-90-(\d+)\.webp/.exec(a.fotoSrc) || [])[1]);
  ok('de laptop staat onder de balk (sticky), in rust, de video klaar, even breed als de foto', Math.abs(a.podium - 56) <= 2 && a.fase === 'rust' && a.kanSpelen && fotoB > 0 && a.breedte === fotoB, JSON.stringify({ podium: a.podium, fase: a.fase, kan: a.kanSpelen, foto: fotoB, video: a.breedte }));
  const vak = await page.evaluate(() => { const r = document.querySelector('[data-o8-foto]').getBoundingClientRect(); return [r.x, r.width, r.height]; });
  ok('het vak op hele pixels', vak.every((v) => Math.abs(v - Math.round(v)) < 0.02), JSON.stringify(vak));
  /* de foto tegen beeld 0 van de video: de winkel even weg, dan de foto weg */
  {
    const vanaf = 60;
    /* De feitenregel ook weg (doorloop 90): die gaat sinds 21:44 mee met de winkel, dus met o8-speelt
       verdwijnt hij, en dan meet je zijn tekst in plaats van het verschil tussen foto en video. */
    const weg = await page.addStyleTag({ content: '.o8-sc, .o8-feiten { opacity: 0 !important; visibility: hidden !important; transition: none !important; }' });
    await wacht(page, 400);
    const metFoto = await page.screenshot();
    await page.evaluate(() => document.querySelector('[data-o8]').classList.add('o8-speelt'));
    await wacht(page, 400);
    const zonder = await page.screenshot();
    await page.evaluate(() => document.querySelector('[data-o8]').classList.remove('o8-speelt'));
    await weg.evaluate((e) => e.remove());
    await wacht(page, 600);
    /* de schermen zelf niet (daar is de foto open, met alleen de rand van het toestel erin; daar ligt de winkel op) */
    const schermen = await page.evaluate(() => { const r = document.querySelector('[data-o8-foto]').getBoundingClientRect(); const d = JSON.parse(document.querySelector('[data-o8-data]').textContent);
      return d.video.stil90.map((q) => { const xs = q.map((p) => r.x + p[0] * r.width), ys = q.map((p) => r.y + p[1] * r.height); return [Math.min(...xs) - 4, Math.min(...ys) - 4, Math.max(...xs) + 4, Math.max(...ys) + 4]; }); });
    const v = await verschil(metFoto, zonder, vanaf, schermen);
    if (process.env.O90_OPNAMES && !(v.gem <= 2.5 && v.p999 <= 30)) { fs.writeFileSync(path.join(process.env.O90_OPNAMES, 'met.png'), metFoto); fs.writeFileSync(path.join(process.env.O90_OPNAMES, 'zonder.png'), zonder); }
    ok('de foto is beeld 0 van de video: zonder de foto verandert er (bijna) niets (gemiddeld ≤ 2,5, 99,9 % ≤ 30)', v.gem <= 2.5 && v.p999 <= 30, JSON.stringify(v));
  }

  /* elk schermbeeld vastleggen: de stand, het beeld, de foto, de scroll */
  await page.evaluate(() => {
    window.__zoek = 0; for (const v of document.querySelectorAll('.o8-video')) v.addEventListener('seeking', () => window.__zoek++);
    window.__log = []; const b = document.querySelector('[data-o8-beeld]');
    const stap = () => { const s = window.__o8Stand(); window.__log.push([s.fase, s.stap, s.beeld, +getComputedStyle(b).opacity, s.fotoWeg, Math.round(scrollY), s.vast, s.winkelUit, Math.round(performance.now())]); if (window.__log.length < 20000) requestAnimationFrame(stap); };
    requestAnimationFrame(stap); });
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 3000 }).catch(() => {});
  const b = await stand();
  ok('één scroll omlaag op het podium: hij speelt (heen), de pagina staat vast, de winkel gaat uit', b.fase === 'speelt' && b.richting === 1 && b.vast >= 0, JSON.stringify({ fase: b.fase, r: b.richting, vast: b.vast }));
  /* vast: een stukje scrollen (zoals de schuifbalk) wordt teruggezet */
  await page.evaluate((y) => scrollTo({ top: y + 120, behavior: 'instant' }), b.vast);
  await page.waitForFunction((v) => Math.abs(scrollY - v) <= 1 || window.__o8Stand().fase !== 'speelt', b.vast, { timeout: 8000 }).catch(() => {});
  const b2 = await stand();
  ok('… zolang hij speelt, zet hij de pagina terug als je een stukje scrolt', b2.fase !== 'speelt' || Math.abs(b2.y - b.vast) <= 1, JSON.stringify({ y: b2.y, vast: b.vast }));
  await page.waitForFunction(() => window.__o8Stand().fase === 'klaar', null, { timeout: LANG }).catch(() => {});
  await wacht(page, 600);
  const c = await stand();
  /* levering 94: onder de laptop staat geen Wat we maken meer (die staat erboven), dus geen zinken en geen sprong: de pagina los */
  ok('zonder verdere invoer aan het eind: beeld 111, de foto weg, de pagina los (geen sprong: Wat we maken staat erboven)',
    c.fase === 'klaar' && c.beeld === 111 && c.fotoWeg && c.vast === -1 && !(c.springY >= 0), JSON.stringify({ fase: c.fase, beeld: c.beeld, foto: c.fotoWeg, vast: c.vast, springY: c.springY }));
  const log = await page.evaluate(() => { const l = window.__log; window.__log = []; return { l, zoek: window.__zoek }; });
  const heen = log.l.filter((r) => r[0] === 'speelt');
  ok('… de video speelde vooruit tot het eind en zocht niet één keer', heen.length > 5 && heen.every((r, i) => i === 0 || r[2] >= heen[i - 1][2]) && log.zoek === 0, JSON.stringify({ n: heen.length, zoek: log.zoek, beelden: heen.filter((_, i) => i % 10 === 0).map((r) => r[2]) }));
  /* de overgang: zolang de foto nog (half) op is, staat de klep stil (beeld ≤ 7); de foto vervaagt (er zijn tussenstanden) */
  const tussen = heen.filter((r) => r[3] > 0.02 && r[3] < 0.98);
  /* Ronde 91 (F01): de log leest de dekking op de hoofddraad. Staat die even stil (4 toetsen tegelijk onder UITROLLEN.bat, een
     drukke computer), dan begint de vervaging later dan de video, en meet je de belasting in plaats van de opening. Een regel
     telt daarom alleen als de hoofddraad vlak ervoor gewoon tekende (≤ 50 ms sinds de vorige regel). */
  const metGat = heen.map((r, i) => [r, i ? r[8] - heen[i - 1][8] : 0]);
  const teVroeg = metGat.filter(([r, g]) => r[3] > 0.02 && r[2] > 7 && g <= 50).map(([r]) => r);
  const stil = metGat.filter(([r, g]) => r[3] > 0.02 && r[2] > 7 && g > 50).length;
  ok('… de foto vervaagde in de video terwijl de klep nog stilstond (geen harde wissel)', teVroeg.length === 0 && heen.some((r) => r[7]), JSON.stringify({ tussen: tussen.length, teVroeg: teVroeg.slice(0, 3), nietTeMeten: stil }));
  ok('… de pagina stond vast tot het eind', heen.filter((r) => r[6] >= 0).every((r) => Math.abs(r[5] - r[6]) <= 120), JSON.stringify(heen.slice(0, 3)));

  /* Wat we maken staat er al (levering 93); een beetje verder scrollen kan gewoon */
  const yVoor = (await stand()).y;
  for (let k = 0; k < 2; k++) { await page.mouse.wheel(0, 120); await wacht(page, 350); }
  await wacht(page, 400);
  const sch = await stand();
  ok('daarna scrol je gewoon verder (de pagina loopt mee)', sch.fase === 'klaar' && sch.y > yVoor, JSON.stringify({ fase: sch.fase, y: sch.y, yVoor }));

  /* terug: omhoog tot in de rustzone */
  await page.waitForFunction(() => window.__o8Stand().terugKlaar, null, { timeout: LANG }).catch(() => {});
  for (let k = 0; k < 16; k++) { await page.mouse.wheel(0, -200); await wacht(page, 350); if ((await stand()).fase !== 'klaar') break; }
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 5000 }).catch(() => {});
  const d = await stand();
  ok('omhoog tot het podium weer helemaal in beeld is: hij speelt terug', d.fase === 'speelt' && d.richting === -1 || d.fase === 'rust', JSON.stringify({ fase: d.fase, r: d.richting }));
  await page.waitForFunction(() => window.__o8Stand().fase === 'rust', null, { timeout: LANG }).catch(() => {});
  await page.waitForFunction(() => window.__o8Stand().zichtbaar.join() === 'heen', null, { timeout: 15000 }).catch(() => {});
  /* Ronde 91 (F01): wachten tot de foto echt op is, niet een vaste 300 ms. Onder belasting (4 toetsen tegelijk, zoals bij
     UITROLLEN.bat) tekent Chromium soms een paar honderd ms geen beeld, en dan loopt ook de overgang niet door. Komt de foto
     nooit op, dan verloopt dit en faalt de regel eronder alsnog. */
  await page.waitForFunction(() => +getComputedStyle(document.querySelector('[data-o8-beeld]')).opacity >= 0.999, null, { timeout: 8000 }).catch(() => {});
  const e = await stand();
  ok('terug aangekomen: de foto en de winkel weer op, de pagina los, en eronder weer de heenweg op beeld 0',
    e.fase === 'rust' && e.foto === 1 && e.fotoZicht === 'visible' && !/o8-winkel-uit|o8-onderweg|o8-speelt/.test(e.cls) && e.vast === -1 && e.zichtbaar.join() === 'heen' && e.beeld === 0,
    JSON.stringify({ fase: e.fase, foto: e.foto, cls: e.cls, vast: e.vast, zichtbaar: e.zichtbaar, beeld: e.beeld }));
  const terugLog = (await page.evaluate(() => window.__log)).filter((r) => r[0] === 'speelt' && r[1] === 'video');
  ok('… de video speelde terug (het beeld liep naar 0)', terugLog.length >= 2 && terugLog[0][2] > terugLog[terugLog.length - 1][2], JSON.stringify(terugLog.filter((_, i) => i % 8 === 0).map((r) => r[2]).slice(0, 12)));
  /* de wissel van de video's eronder kwam pas toen de foto weer helemaal op was */
  const naRust = (await page.evaluate(() => window.__log)).filter((r) => r[0] === 'rust');
  /* Ronde 91 (F01): de log volgt de beelden die Chromium tekent. Tekende hij tijdens het opkomen (300 ms) geen beeld (een gat
     van ≥ 250 ms tussen twee regels vóór de foto op was), dan kún je geen tussenstand zien; dan telt dat de overgang er staat. */
  const voorOp = naRust.filter((r, i) => i === 0 || naRust[i - 1][3] < 0.999);
  const gat = voorOp.reduce((m, r, i) => (i ? Math.max(m, r[8] - voorOp[i - 1][8]) : m), 0);
  const overgang = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('[data-o8-beeld]')); return cs.transitionProperty.includes('opacity') && /0\.3s/.test(cs.transitionDuration); });
  ok('… en de foto kwam vervagend terug (er zijn tussenstanden)', naRust.some((r) => r[3] > 0.02 && r[3] < 0.98) || naRust.length < 4 || (gat >= 250 && overgang),
    JSON.stringify({ op: naRust.slice(0, 6).map((r) => r[3]), gat, overgang }));

  /* inhalen: nog een scroll omlaag terwijl hij speelt */
  const top0 = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 3000 }).catch(() => {});
  await wacht(page, 300);
  await page.mouse.wheel(0, 100);
  await wacht(page, 150);
  const f = await stand();
  ok('nog een scroll omlaag terwijl hij speelt: een tree sneller (1,8 ×, het tempo glijdt erheen), de pagina blijft vast', (f.fase === 'speelt' && f.doelTempo >= 1.8 && f.snel > 1 && f.vast >= 0 && Math.abs(f.y - f.vast) <= 1) || f.fase === 'klaar', JSON.stringify({ fase: f.fase, doel: f.doelTempo, snel: f.snel, y: f.y, vast: f.vast, top0 }));
  /* een grote sleep met de schuifbalk maakt hem af */
  if (f.fase === 'speelt') {
    await page.evaluate((y) => scrollTo({ top: y + 800, behavior: 'instant' }), f.vast);
    await page.waitForFunction(() => window.__o8Stand().fase !== 'speelt', null, { timeout: 15000 }).catch(() => {});
    await wacht(page, 300);
    const g = await stand();
    ok('een grote sleep (meer dan 400 px) maakt hem meteen af: het eindbeeld, de pagina los', g.fase === 'klaar' && g.fotoWeg && g.vast === -1, JSON.stringify({ fase: g.fase, foto: g.fotoWeg, vast: g.vast }));
  }
  await page.waitForFunction(() => window.__o8Stand().fase !== 'speelt', null, { timeout: LANG }).catch(() => {});
  /* helemaal naar boven (de schuifbalk, Home): meteen de beginstand */
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.__o8Stand().fase === 'rust', null, { timeout: 15000 }).catch(() => {});
  /* Ronde 91 (F01): tot de foto op is (zie hierboven), niet een vaste 600 ms. */
  await page.waitForFunction(() => +getComputedStyle(document.querySelector('[data-o8-beeld]')).opacity >= 0.999, null, { timeout: 8000 }).catch(() => {});
  const h = await stand();
  ok('helemaal naar boven: meteen de beginstand (in rust, de foto en de winkel op)', h.fase === 'rust' && !/o8-winkel-uit|o8-onderweg|o8-speelt/.test(h.cls) && h.foto === 1, JSON.stringify({ fase: h.fase, cls: h.cls, foto: h.foto }));
  /* een sprong voorbij de laptop (levering 94: naar de galerij, #looks, die nu onder de laptop staat): meteen de eindstand */
  await page.evaluate(() => { const m = document.getElementById('looks'); scrollTo({ top: m.getBoundingClientRect().top + scrollY - 56, behavior: 'instant' }); });
  await page.waitForFunction(() => window.__o8Stand().fase === 'klaar', null, { timeout: 15000 }).catch(() => {}); await wacht(page, 400);
  const k0 = await stand();
  ok('een sprong voorbij de laptop: meteen de eindstand, niets speelt', k0.fase === 'klaar' && k0.vast === -1, JSON.stringify({ fase: k0.fase, vast: k0.vast }));
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await wacht(page, 500);

  /* k1: de streepjes, met de laptop op zijn plek */
  await page.evaluate((y) => scrollTo({ top: y - 30, behavior: 'instant' }), Math.round(baan.top)); await wacht(page, 800);
  const k = await page.evaluate(() => [...document.querySelectorAll('.o8-kies')].map((e) => ({ druk: e.getAttribute('aria-pressed'), label: e.getAttribute('aria-label') || '' })));
  ok('de streepjes (k1): één per stand, elk met een naam, één ingedrukt', k.length >= 2 && k.every((x) => x.label.trim()) && k.filter((x) => x.druk === 'true').length === 1, JSON.stringify(k));
  if (k.length >= 2) {
    const nu0 = await page.evaluate(() => [...document.querySelectorAll('.o8-kies')].findIndex((e) => e.getAttribute('aria-pressed') === 'true'));
    const doel = (nu0 + 1) % k.length;
    const naam0 = await page.evaluate(() => document.querySelector('[data-o8-naam]')?.textContent.trim());
    await page.locator('.o8-kies').nth(doel).click(); await wacht(page, 500);
    const na = await page.evaluate(() => ({ druk: [...document.querySelectorAll('.o8-kies')].map((e) => e.getAttribute('aria-pressed')), naam: document.querySelector('[data-o8-naam]')?.textContent.trim() }));
    ok('… een klik kiest die stand', na.druk[doel] === 'true' && na.naam !== naam0, JSON.stringify({ nu0, doel, naam0, ...na }));
    await page.locator('.o8-kies').nth(doel).focus(); await page.keyboard.press('ArrowRight'); await wacht(page, 500);
    const pijl = await page.evaluate(() => [...document.querySelectorAll('.o8-kies')].map((e) => e.getAttribute('aria-pressed')));
    ok('… en met het pijltje naar rechts de volgende', pijl[(doel + 1) % k.length] === 'true', JSON.stringify(pijl));
  }
  await ctx.close();

  /* ── 3 · telefoon en minder beweging ── */
  console.log('\n3 · telefoon en minder beweging');
  for (const [naam, opties] of [['de telefoon', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['minder beweging', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }]]) {
    const { ctx: c2, page: p2 } = await open(opties);
    /* de baan is dan alleen het podium plus de uitloop van het blauw in de grond (::after) */
    const r = await p2.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'), u = parseFloat(getComputedStyle(b, '::after').height) || 0;
      return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight - u, uit: u, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
        video: document.querySelectorAll('.o8-video:not([hidden])').length, foto: document.querySelector('[data-o8-beeld]').currentSrc.replace(/^.*\/img/, '') }; });
    ok(`${naam}: geen baan, geen effect en geen video, de foto van altijd, niets zijwaarts`, !r.aan && r.extra <= 1 && r.sw <= r.vw && r.video === 0 && !/laptop-90-/.test(r.foto), JSON.stringify(r));
    /* levering 94: geen kleuren meer achter de laptop, dus ook geen uitloop van het blauwe uur */
    ok(`${naam}: geen uitloop van het blauwe uur onder het podium (het veld is weg): de baan is het podium`, Math.abs(r.extra + r.uit) <= 1, JSON.stringify(r));
    /* geen harde rand onder het podium: in de marge (geen foto, geen tekst) van rij tot rij hoogstens 6 op 255 */
    await p2.addStyleTag({ content: '.o8-foto, header, .o8-stand, #cc-bar, .wa-launcher, .m8 *, .g8 * { visibility: hidden !important; }' });
    const onder = await p2.evaluate(() => { const po = document.querySelector('.o8-podium'); const y = Math.round(po.getBoundingClientRect().bottom + scrollY - innerHeight * 0.5); scrollTo(0, y); return Math.round(po.getBoundingClientRect().bottom); });
    await wacht(p2, 400);
    const strook = { x: 2, y: Math.max(0, onder - 60), width: 14, height: 300 };
    const { data: px, info } = await sharp(await p2.screenshot({ clip: strook })).raw().toBuffer({ resolveWithObject: true });
    const rij = []; for (let y = 0; y < info.height; y++) { let s = 0; for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; } rij.push(s / info.width); }
    const sprong = Math.max(...rij.slice(1).map((v, i) => Math.abs(v - rij[i])));
    ok(`${naam}: geen harde rand onder het podium (de grootste sprong van rij tot rij hoogstens 6)`, sprong <= 6, sprong.toFixed(1));
    if (!opties.isMobile) { const y0 = await p2.evaluate(() => scrollY); await p2.mouse.move(720, 450); await p2.mouse.wheel(0, 600); await wacht(p2, 700); const y = await p2.evaluate(() => scrollY); ok(`${naam}: het wiel scrolt gewoon`, y - y0 >= 300, `${y0} → ${y}`); }
    await c2.close();
  }

  /* ── 4 · als het niet kan ── */
  console.log('\n4 · zonder H.264, zonder video, en weg van de voorpagina');
  {
    const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p3 = await c3.newPage();
    await p3.addInitScript(() => { HTMLMediaElement.prototype.canPlayType = () => ''; });
    await p3.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p3.evaluate(() => { document.getElementById('cc-bar')?.remove(); });
    await wacht(p3, 800);
    const r = await p3.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'), u = parseFloat(getComputedStyle(b, '::after').height) || 0; return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight - u, video: document.querySelectorAll('.o8-video').length, foto: document.querySelector('[data-o8-beeld]').currentSrc.replace(/^.*\/img/, '') }; });
    ok('zonder H.264: geen effect, geen baan, er wordt geen video gehaald, de foto van altijd (de opening staat stil)', !r.aan && r.extra <= 1 && r.video === 0 && !/laptop-90-/.test(r.foto) && /laptop/.test(r.foto), JSON.stringify(r));
    await c3.close();
  }
  {
    const c4 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p4 = await c4.newPage();
    p4.on('pageerror', (e) => fouten.push(String(e)));
    await p4.route(/laptop-video/, (r) => r.fulfill({ status: 404, body: '' }));
    await p4.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p4.evaluate(() => { document.getElementById('cc-bar')?.remove(); });
    await p4.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
    const top = await p4.evaluate(() => document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56);
    await p4.evaluate((y) => scrollTo(0, y), top);
    await wacht(p4, 1500);
    await p4.mouse.move(720, 450); await p4.mouse.wheel(0, 120);
    /* het vlagje mag even laden; binnen 8 s geeft hij het op en scrol je gewoon verder */
    await p4.waitForFunction(() => window.__o8Stand?.().fase === 'rust', null, { timeout: 15000 }).catch(() => {});
    await wacht(p4, 600);
    await p4.mouse.wheel(0, 400); await wacht(p4, 900);
    const r = await p4.evaluate((t) => ({ fase: window.__o8Stand?.().fase, laden: !document.querySelector('[data-o8-laden]').hidden, verder: scrollY > t + 200, vast: window.__o8Stand?.().vast }), top);
    ok('zonder video: het vlagje staat niet eindeloos te laden, de laptop blijft in rust en de pagina scrolt gewoon door', r.fase === 'rust' && !r.laden && r.verder && r.vast === -1, JSON.stringify(r));
    await c4.close();
  }
  {
    /* weg van de voorpagina (de site wisselt pagina's zonder herladen): de video in het geheugen wordt vrijgegeven */
    const c5 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p5 = await c5.newPage();
    await p5.addInitScript(() => { const m = URL.createObjectURL.bind(URL), v = URL.revokeObjectURL.bind(URL); window.__blob = { gemaakt: 0, weg: 0 };
      URL.createObjectURL = (o) => { if (o instanceof Blob && /video/.test(o.type)) window.__blob.gemaakt++; return m(o); };
      URL.revokeObjectURL = (u) => { window.__blob.weg++; return v(u); }; });
    await p5.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p5.evaluate(() => { document.getElementById('cc-bar')?.remove(); });
    await p5.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 30000 }).catch(() => {});
    await p5.evaluate(() => document.querySelector('a[href="/nl/pricing/"]')?.click());
    await p5.waitForFunction(() => location.pathname.startsWith('/nl/pricing'), null, { timeout: 15000 }).catch(() => {});
    await wacht(p5, 800);
    const t = await p5.evaluate(() => ({ ...window.__blob, aan: document.documentElement.classList.contains('o8-aan'), pad: location.pathname }));
    ok('weg van de voorpagina: de video in het geheugen is vrijgegeven en het effect staat uit', t.gemaakt >= 1 && t.weg >= t.gemaakt && !t.aan, JSON.stringify(t));
    await c5.close();
  }
  ok('geen scriptfouten', fouten.length === 0, fouten.slice(0, 3).join(' | '));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
