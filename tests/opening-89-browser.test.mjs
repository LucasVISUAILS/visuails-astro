/**
 * VISUAILS — de opening van levering 88c (5 november 2026): één scroll speelt alles. Vervangt
 * tests/opening-88-browser.test.mjs (daar stuurde het scrollen de video).
 *
 *   node tests/opening-89-browser.test.mjs      (npm run test:opening89; na de build: leest dist/)
 *
 * Lucas, 5 november 07:08: "De laptop op de website lagged nu nog meer dan eerst en hij speelt niet zelf af, je moet nu
 * zelf scrollen om er langs te gaan terwijl ik wil dat hij afspeelt bij 1 scroll omlaag."
 *
 *   1 · de bron: het wiel wordt weer afgevangen (vóór zacht scrollen), de video speelt op een snelheid per beeld (TEMPO) en
 *       wordt niet meer door het scrollen gezocht; terug speelt een omgekeerde video (111 beelden, ook als webm); het doek
 *       tekent de rit op 0,6 van de punten; de metro, de schuif van 88b en de blob blijven;
 *   2 · in de browser op 1440 × 900: bij het laden beweegt niets; de eerste scroll is gewoon scrollen; op het podium speelt
 *       één scroll omlaag alles tot wit en Wat we maken open, zonder verdere invoer en zonder één keer te zoeken; zolang hij
 *       speelt staat de pagina vast; in de rit houdt de video zijn beeld en schuift de laptop elk schermbeeld verder; één
 *       scroll omhoog speelt alles terug tot de laptop weer open staat onder de balk; nog een scroll laat hem inhalen; een
 *       grote sleep met de schuifbalk maakt hem af; een sprong (#maken) zet meteen de eindstand; de streepjes (k1);
 *   3 · op de telefoon en bij minder beweging: geen baan, alles staat stil;
 *   4 · zonder WebGL of zonder video staat de opening stil en zit de pagina niet vast; weg van de voorpagina wordt de video
 *       vrijgegeven; geen scriptfouten.
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
const doek = lees('src/scripts/laptopdoek.js');
const metro = lees('src/scripts/metro.js');
const zacht = lees('src/scripts/zachtscrollen.js');
const data = JSON.parse(lees('src/data/laptopVideo.json'));
ok('het wiel wordt weer afgevangen, vóór zacht scrollen (capture, niet passief), en zacht scrollen kan gestopt worden',
  /window\.addEventListener\('wheel', opWiel, \{ passive: false, capture: true \}\)/.test(opening) && /window\.__visZachtStop = stop;/.test(zacht) && /__visZachtStop\?\.\(\)/.test(opening));
ok('de video speelt op een snelheid per beeld (TEMPO 1,4 – 3,0) en wordt niet meer door het scrollen gezocht',
  /const TEMPO = \{ k: 1\.4, min: 1\.4, max: 3\.0, glad: 4 \};/.test(opening) && /sp\.v\.play\(\)/.test(opening) && !/beeldBij|DEEL\.video|doelScroll|MAX_SNEL/.test(opening));
ok('nog een scroll laat hem inhalen (1,6 ×); wat sleept voorbij 400 px maakt hem af', /const INHAAL = 1\.6;/.test(opening) && /const DREMPEL = 8, SLEEP = 400;/.test(opening));
ok('de metro: vertrek bij beeld 86, de laptop daarna op de klok van de rit (88b), n3', /const METRO_BEELD = 86, METRO_MEE = 1\.125;/.test(opening) && /metro = 'n3' \}/.test(opening)
  && /const SCHUIF_LAPTOP = 38\.0 \/ 1920, SCHUIF_TELEFOON = 12\.5 \/ 1920;/.test(opening) && /n3: \{ naam: 'Lamellen', duur: 800, banen: 10/.test(metro));
ok('geen harde randen (Lucas, 08:00): de banen van de metro lopen 32 px in elkaar over, en zonder het effect loopt het blauw uit in de grond',
  /export const ZACHT = 32;/.test(metro) && /smoothstep\(-uZacht, uZacht, f\)/.test(metro) && /html:not\(\.o8-aan\) \.o8-baan::after \{ content: ""; display: block; height: var\(--o8-uit\);/.test(lees('src/styles/opening-80.css')));
ok('de veeg van levering 87 is weg (de metro is er altijd)', !/o8-veeg|data-o8-veeg/.test(opening) && !/\.o8-veeg/.test(lees('src/styles/opening-80.css')));
ok('het doek: de rit op 0,6 van de punten, en het kan van video wisselen (heen en terug)', /export const RIT_SCHAAL = 0\.6;/.test(doek) && /maat\(schuif \? RIT_SCHAAL : 1\)/.test(doek) && /function bron\(v\)/.test(doek) && /return \{ teken, zetBeelden, bron, weg \};/.test(doek));
const vd = path.join(ROOT, 'public', 'img', 'hal', 'laptop-video');
const terugBestanden = ['1280', '1920', '2400'].map((b) => `laptop-84-${b}-terug.mp4`).concat(['1280', '1920'].map((b) => `laptop-84-${b}-terug.webm`));
ok('de omgekeerde video\'s staan er (mp4 1280 – 2400, webm 1280 en 1920)', terugBestanden.every((f) => fs.existsSync(path.join(vd, f)) && fs.statSync(path.join(vd, f)).size > 100000), terugBestanden.filter((f) => !fs.existsSync(path.join(vd, f))).join(', '));
/* de maat en het aantal beelden uit de mp4 zelf (moov → trak met hdlr 'vide' → tkhd en stsz), zonder ffprobe:
   op Lucas' computer staat geen ffmpeg, en dan faalde deze controle (uitrol 5 november, 10:15) */
function mp4Beeld(bestand) {
  const b = fs.readFileSync(bestand);
  const dozen = (s, e) => { const uit = []; let i = s;
    while (i + 8 <= e) { let n = b.readUInt32BE(i), h = 8; const t = b.toString('latin1', i + 4, i + 8);
      if (n === 1) { n = Number(b.readBigUInt64BE(i + 8)); h = 16; } else if (n === 0) n = e - i;
      if (n < h || i + n > e) break; uit.push({ t, s: i + h, e: i + n }); i += n; }
    return uit; };
  const moov = dozen(0, b.length).find((d) => d.t === 'moov'); if (!moov) return '';
  for (const trak of dozen(moov.s, moov.e).filter((d) => d.t === 'trak')) {
    const tk = dozen(trak.s, trak.e), mdia = tk.find((d) => d.t === 'mdia'); if (!mdia) continue;
    const md = dozen(mdia.s, mdia.e), hdlr = md.find((d) => d.t === 'hdlr');
    if (!hdlr || b.toString('latin1', hdlr.s + 8, hdlr.s + 12) !== 'vide') continue;
    const tkhd = tk.find((d) => d.t === 'tkhd'), minf = md.find((d) => d.t === 'minf');
    const stbl = minf && dozen(minf.s, minf.e).find((d) => d.t === 'stbl'), stsz = stbl && dozen(stbl.s, stbl.e).find((d) => d.t === 'stsz');
    if (!tkhd || !stsz) return '';
    return `${b.readUInt32BE(tkhd.e - 8) / 65536},${b.readUInt32BE(tkhd.e - 4) / 65536},${b.readUInt32BE(stsz.s + 8)}`;
  }
  return '';
}
let beelden = [];
try { beelden = ['1280', '1920', '2400'].map((b) => mp4Beeld(path.join(vd, `laptop-84-${b}-terug.mp4`))); } catch { beelden = []; }
ok('… elk 111 beelden, even groot als de gewone', beelden.length === 3 && beelden.every((r) => r.endsWith(',111')) && beelden[1].startsWith('1920,1360'), beelden.join(' | '));
ok('… en het teken achter de video telt ze mee (een nieuwe omgekeerde video wordt opnieuw gehaald)', /for \(const k of \['', '-terug'\]\)/.test(opening));
ok('de tabellen vaart en loop: 111 beelden, loop van 0 naar 1 en nooit terug',
  Array.isArray(data.vaart) && data.vaart.length === 111 && Array.isArray(data.loop) && data.loop.length === 111
  && data.loop[0] === 0 && data.loop[110] === 1 && data.loop.every((v, i) => i === 0 || v >= data.loop[i - 1]));
ok('de video als blob (Cloudflare geeft geen Range), elk getoond beeld getekend, de blob weer vrijgegeven', /URL\.createObjectURL/.test(opening) && /requestVideoFrameCallback/.test(opening) && /URL\.revokeObjectURL/.test(opening));
ok('een sleutelbeeld elke 6 beelden (x264 en VP9), ook achterstevoren', /keyint=6:min-keyint=6:scenecut=0/.test(lees('scripts/laptop-video.mjs')) && /keyint=6:min-keyint=6:scenecut=0/.test(lees('scripts/laptop-video-terug.mjs')) && /'-g', '6'/.test(lees('scripts/laptop-video-terug.mjs')));
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
ok("de CSP laat de blob toe: media-src 'self' blob:", /media-src 'self' blob:/.test(fs.readFileSync(path.join(DIST, '_headers'), 'utf8')));

/* ── 2 · in de browser ── */
console.log('\n2 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
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
/* zonder grafische kaart (SwiftShader) gaat alles veel trager dan in het echt: ruime tijden */
const LANG = 60000;
async function open(opties) {
  const ctx = await browser.newContext(opties);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fouten.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) fouten.push(m.text()); });
  await page.goto(BASIS + '/nl/', { waitUntil: 'load' });
  await page.evaluate(() => { document.getElementById('cc-bar')?.remove(); document.querySelector('.wa-launcher')?.remove(); });
  await page.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
  return { ctx, page };
}
try {
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const m = await page.evaluate(() => {
    const kop = document.querySelector('.o8-kop').getBoundingClientRect();
    return { aan: document.documentElement.classList.contains('o8-aan'), boven: kop.top - 56, px: parseFloat(getComputedStyle(document.querySelector('.o8-kop')).fontSize), sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
  });
  ok('het effect staat aan (html.o8-aan), de kop op 104 px met ruimte erboven, niets zijwaarts', m.aan && Math.abs(m.px - 104) < 0.5 && m.boven >= 40 && m.sw <= m.vw, JSON.stringify(m));
  await wacht(page, 1200);
  const rust = await page.evaluate(() => ({ cls: document.querySelector('.o8').className, s: window.__o8Stand?.() }));
  ok('bij het laden beweegt niets: in rust, geen rit, niet onderweg', !!rust.s && rust.s.fase === 'rust' && rust.s.rit === 0 && !/o8-onderweg|o8-wit|o8-rijdt/.test(rust.cls), JSON.stringify({ fase: rust.s?.fase, cls: rust.cls }));
  const baan = await page.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'); return { top: b.getBoundingClientRect().top + scrollY - 56, R: b.offsetHeight - p.offsetHeight }; });
  const stand = () => page.evaluate(() => { const s = window.__o8Stand(); return { fase: s.fase, richting: s.richting, stap: s.stap, pos: s.pos, snel: s.snel, rit: s.rit, beeld: s.beeld, getekend: s.getekend, schuif: s.schuif, zoekTel: s.zoekTel, sKlaar: s.sKlaar, vast: s.vast, terugKlaar: s.terugKlaar, kanSpelen: s.kanSpelen,
    y: Math.round(scrollY), cls: document.querySelector('.o8').className, m8: document.querySelector('.m8').className, m8top: Math.round(document.querySelector('.m8').getBoundingClientRect().top), podium: Math.round(document.querySelector('.o8-podium').getBoundingClientRect().top), doek: !document.querySelector('[data-o8-doek]').hidden }; });

  /* gewoon scrollen naar de laptop: de pagina loopt mee, geen sprong */
  await page.mouse.move(720, 450); await page.mouse.wheel(0, 120); await wacht(page, 900);
  const y1 = await page.evaluate(() => scrollY);
  ok('de eerste scroll is gewoon scrollen (geen sprong naar de laptop, niets speelt)', y1 >= 60 && y1 <= 240 && (await stand()).fase === 'rust', String(y1));
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(baan.top));
  await page.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 30000 }).catch(() => {});
  await wacht(page, 600);
  const a = await stand();
  ok('de laptop staat onder de balk (sticky), in rust, de video klaar', Math.abs(a.podium - 56) <= 2 && a.fase === 'rust' && a.kanSpelen, JSON.stringify({ podium: a.podium, fase: a.fase, kan: a.kanSpelen }));

  /* elk schermbeeld vastleggen: de stand, de scroll, en in de rit het beeld en hoe ver het doek de laptop schuift */
  await page.evaluate(() => { window.__log = []; const stap = () => { const s = window.__o8Stand(); window.__log.push([s.fase, s.stap, s.rit, s.getekend, s.schuif || 0, s.beeld, Math.round(scrollY), s.vast]); if (window.__log.length < 20000) requestAnimationFrame(stap); }; requestAnimationFrame(stap); });
  const zoek0 = a.zoekTel;
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 3000 }).catch(() => {});
  const b = await stand();
  ok('één scroll omlaag op het podium: hij speelt (heen), de pagina staat vast', b.fase === 'speelt' && b.richting === 1 && b.vast >= 0, JSON.stringify({ fase: b.fase, r: b.richting, vast: b.vast }));
  /* vast: een stukje scrollen (zoals de schuifbalk) wordt teruggezet */
  await page.evaluate((y) => scrollTo({ top: y + 120, behavior: 'instant' }), b.vast);
  /* zonder grafische kaart kan één beeld honderden milliseconden duren: wacht op de stand, niet op de klok */
  await page.waitForFunction((v) => Math.abs(scrollY - v) <= 1 || window.__o8Stand().fase !== 'speelt', b.vast, { timeout: 8000 }).catch(() => {});
  const b2 = await stand();
  ok('… zolang hij speelt, zet hij de pagina terug als je een stukje scrolt', b2.fase === 'speelt' && Math.abs(b2.y - b.vast) <= 1, JSON.stringify({ y: b2.y, vast: b.vast }));
  ok('… Wat we maken staat nog dicht', /m8-dicht/.test(b2.m8), b2.m8);
  await page.waitForFunction(() => window.__o8Stand().fase === 'klaar', null, { timeout: LANG }).catch(() => {});
  await wacht(page, 900);
  const c = await stand();
  ok('zonder verdere invoer aangekomen: alles wit (o8-wit), de metro weg, Wat we maken open met zijn bovenkant onder de balk',
    c.fase === 'klaar' && /o8-wit/.test(c.cls) && !/o8-rijdt/.test(c.cls) && /m8-open/.test(c.m8) && Math.abs(c.m8top - 56) <= 2 && c.y === c.sKlaar && c.vast === -1, JSON.stringify(c));
  ok('… en de video heeft niet één keer gezocht', c.zoekTel === zoek0, `${zoek0} → ${c.zoekTel}`);
  const log = await page.evaluate(() => { const l = window.__log; window.__log = []; return l; });
  const heen = log.filter((r) => r[0] === 'speelt');
  ok('… de pagina stond vast tot het eind (de scroll alleen veranderd door het terugzetten)', heen.length > 5 && heen.filter((r) => r[7] >= 0).every((r) => Math.abs(r[6] - r[7]) <= 120), JSON.stringify(heen.slice(0, 3)));
  const ritLog = heen.filter((r) => r[1] === 'rit' && r[2] > 0 && r[2] < 1);
  const rand = ritLog.map((r) => (743 - 38.0 * (r[3] - 86)) / 1920 - r[4]);
  const terug = rand.findIndex((x, i) => i > 0 && x > rand[i - 1] + 1e-6);
  const stil = rand.filter((x, i) => i > 0 && x > 0.09 && Math.abs(x - rand[i - 1]) < 1e-7 && ritLog[i][2] > ritLog[i - 1][2]).length;
  ok('in de rit houdt de video zijn beeld vast', ritLog.length >= 2 && ritLog.every((r) => r[5] === ritLog[0][5]), JSON.stringify(ritLog.slice(0, 4)));
  ok('… en gaat de laptop elk schermbeeld verder naar links: nooit terug, nooit stil zolang hij in beeld is', ritLog.length >= 2 && terug === -1 && stil === 0, JSON.stringify({ n: ritLog.length, terug, stil }));

  /* terug: één scroll omhoog bij Wat we maken */
  await page.waitForFunction(() => window.__o8Stand().terugKlaar, null, { timeout: 30000 }).catch(() => {});
  await page.mouse.wheel(0, -100);
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 3000 }).catch(() => {});
  const d = await stand();
  ok('één scroll omhoog bij Wat we maken: hij speelt terug, Wat we maken gaat eerst dicht', d.fase === 'speelt' && d.richting === -1 && /m8-dicht/.test(d.m8), JSON.stringify({ fase: d.fase, r: d.richting, m8: d.m8 }));
  await page.waitForFunction(() => window.__o8Stand().fase === 'rust', null, { timeout: LANG }).catch(() => {});
  await wacht(page, 600);
  const e = await stand();
  ok('terug aangekomen: de laptop staat weer open onder de balk (de foto, niet het doek), niets wit, de pagina los',
    e.fase === 'rust' && Math.abs(e.y - Math.round(baan.top)) <= 1 && Math.abs(e.podium - 56) <= 2 && !e.doek && !/o8-wit|o8-rijdt|o8-onderweg|o8-speelt/.test(e.cls) && e.vast === -1 && /m8-dicht/.test(e.m8), JSON.stringify(e));
  const terugLog = (await page.evaluate(() => window.__log)).filter((r) => r[0] === 'speelt' && r[1] === 'video');
  ok('… de video speelde terug (het beeld liep van 86 naar 0)', terugLog.length >= 2 && terugLog[0][3] >= terugLog[terugLog.length - 1][3], JSON.stringify(terugLog.filter((_, i) => i % 8 === 0).map((r) => r[3]).slice(0, 12)));

  /* inhalen: nog een scroll omlaag terwijl hij speelt */
  await page.mouse.wheel(0, 100);
  await page.waitForFunction(() => window.__o8Stand().fase === 'speelt', null, { timeout: 3000 }).catch(() => {});
  await wacht(page, 400);
  await page.mouse.wheel(0, 100);
  await wacht(page, 200);
  const f = await stand();
  ok('nog een scroll omlaag terwijl hij speelt: hij haalt in (1,6 ×), de pagina blijft vast', f.fase === 'speelt' && Math.abs(f.snel - 1.6) < 1e-9 && f.vast >= 0 && Math.abs(f.y - f.vast) <= 1, JSON.stringify({ fase: f.fase, snel: f.snel, y: f.y, vast: f.vast }));
  /* een grote sleep met de schuifbalk maakt hem af */
  await page.evaluate((y) => scrollTo({ top: y + 800, behavior: 'instant' }), f.vast);
  /* zonder grafische kaart duurt één beeld hier honderden milliseconden: wacht op de stand, niet op de klok */
  await page.waitForFunction(() => window.__o8Stand().fase !== 'speelt', null, { timeout: 15000 }).catch(() => {});
  await wacht(page, 300);
  const g = await stand();
  ok('een grote sleep (meer dan 400 px) maakt hem meteen af: wit, Wat we maken open, de pagina los', g.fase === 'klaar' && /o8-wit/.test(g.cls) && /m8-open/.test(g.m8) && g.vast === -1, JSON.stringify({ fase: g.fase, cls: g.cls, m8: g.m8, vast: g.vast }));
  /* helemaal naar boven (de schuifbalk, Home): meteen de beginstand, zonder animatie */
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.__o8Stand().fase === 'rust', null, { timeout: 15000 }).catch(() => {}); await wacht(page, 300);
  const h = await stand();
  ok('helemaal naar boven: meteen de beginstand (in rust, niets wit, de foto)', h.fase === 'rust' && !/o8-wit|o8-onderweg|o8-rijdt/.test(h.cls) && !h.doek, JSON.stringify({ fase: h.fase, cls: h.cls }));
  /* een sprong naar #maken (het menu): meteen de eindstand */
  await page.evaluate(() => { const m = document.getElementById('maken'); scrollTo({ top: m.getBoundingClientRect().top + scrollY - 56, behavior: 'instant' }); });
  await page.waitForFunction(() => window.__o8Stand().fase === 'klaar', null, { timeout: 15000 }).catch(() => {}); await wacht(page, 300);
  const k0 = await stand();
  ok('een sprong naar Wat we maken: meteen de eindstand, Wat we maken open, niets speelt', k0.fase === 'klaar' && /o8-wit/.test(k0.cls) && /m8-open/.test(k0.m8) && k0.vast === -1, JSON.stringify({ fase: k0.fase, m8: k0.m8 }));
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
    /* de baan is dan alleen het podium plus de uitloop van het blauw in de grond (levering 88c, ::after) */
    const r = await p2.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'), u = parseFloat(getComputedStyle(b, '::after').height) || 0; return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight - u, uit: u, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
    ok(`${naam}: geen baan en geen effect, alles staat stil, niets zijwaarts`, !r.aan && r.extra <= 1 && r.sw <= r.vw, JSON.stringify(r));
    ok(`${naam}: het blauwe uur loopt onder het podium uit in de grond (96 – 180 px)`, r.uit >= 96 && r.uit <= 180, JSON.stringify(r));
    /* geen harde rand onder het podium: in de marge (geen foto, geen tekst) van rij tot rij hoogstens 6 op 255 */
    await p2.addStyleTag({ content: '.o8-foto, header, .o8-stand, #cc-bar, .wa-launcher, .m8 * { visibility: hidden !important; }' });
    const onder = await p2.evaluate(() => { const po = document.querySelector('.o8-podium'); const y = Math.round(po.getBoundingClientRect().bottom + scrollY - innerHeight * 0.5); scrollTo(0, y); return Math.round(po.getBoundingClientRect().bottom); });
    await wacht(p2, 400);
    const vak = { x: 2, y: Math.max(0, onder - 60), width: 14, height: 300 };
    const { data: px, info } = await sharp(await p2.screenshot({ clip: vak })).raw().toBuffer({ resolveWithObject: true });
    const rij = []; for (let y = 0; y < info.height; y++) { let s = 0; for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * info.channels; s += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; } rij.push(s / info.width); }
    const sprong = Math.max(...rij.slice(1).map((v, i) => Math.abs(v - rij[i])));
    ok(`${naam}: geen harde rand onder het podium (de grootste sprong van rij tot rij hoogstens 6)`, sprong <= 6, sprong.toFixed(1));
    /* en de pagina scrolt gewoon (niets vangt het wiel af) */
    if (!opties.isMobile) { const y0 = await p2.evaluate(() => scrollY); await p2.mouse.move(720, 450); await p2.mouse.wheel(0, 600); await wacht(p2, 700); const y = await p2.evaluate(() => scrollY); ok(`${naam}: het wiel scrolt gewoon`, y - y0 >= 300, `${y0} → ${y}`); }
    await c2.close();
  }
  /* ── 4 · als het niet kan ── */
  console.log('\n4 · zonder WebGL of zonder video');
  {
    const b2 = await chromium.launch({ executablePath: browserPad(), args: ['--disable-webgl', '--disable-3d-apis'] });
    const c3 = await b2.newContext({ viewport: { width: 1440, height: 900 } }); const p3 = await c3.newPage();
    await p3.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p3.waitForFunction(() => !document.documentElement.classList.contains('o8-aan'), null, { timeout: 15000 }).catch(() => {});
    const r = await p3.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'), u = parseFloat(getComputedStyle(b, '::after').height) || 0; return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight - u }; });
    ok('zonder WebGL: het effect gaat uit en de baan valt weg (de opening staat stil)', !r.aan && r.extra <= 1, JSON.stringify(r));
    await b2.close();
  }
  {
    const c4 = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p4 = await c4.newPage();
    await p4.route(/laptop-video/, (r) => r.fulfill({ status: 404, body: '' }));
    await p4.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p4.evaluate(() => { document.getElementById('cc-bar')?.remove(); });
    await p4.waitForFunction(() => !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 15000 }).catch(() => {});
    const top = await p4.evaluate(() => document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56);
    await p4.evaluate((y) => scrollTo(0, y + 30), top);
    await p4.waitForFunction(() => !document.documentElement.classList.contains('o8-aan'), null, { timeout: 15000 }).catch(() => {});
    await wacht(p4, 300);
    await p4.mouse.move(720, 450); await p4.mouse.wheel(0, 400); await wacht(p4, 700);
    const r = await p4.evaluate((t) => ({ aan: document.documentElement.classList.contains('o8-aan'), laden: !document.querySelector('[data-o8-laden]').hidden, verder: scrollY > t + 200 }), top);
    ok('zonder video: het effect gaat uit, het vlagje staat niet eindeloos te laden en de pagina scrolt gewoon door', !r.aan && !r.laden && r.verder, JSON.stringify(r));
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
    await p5.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 25000 }).catch(() => {});
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
