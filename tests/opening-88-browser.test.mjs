/**
 * VISUAILS — de opening van levering 88 (4 november 2026; lijst 76, de metro N3, vanzelf). Bouwt voort op die van
 * levering 87 (lijst 74: fade f2, klik k1) en vervangt tests/opening-87-browser.test.mjs.
 *
 *   node tests/opening-88-browser.test.mjs      (npm run test:opening88; na de build: leest dist/)
 *
 * Lucas (lijst 75): "een soort metro gevoel met de motion blur … alsof het blauwe weg racet smooth naar het witte waarna
 * de service omhoog komen." (12:13) "naar beneden … niet van de zijkant." (16:05) "De metro animatie mag ongeveer
 * tegelijkertijd met de laptop verdwijnen. Misschien iets later als dat beter oogt."
 *
 * Lucas (lijst 74, bij f2): "Met scroll wil ik een soort korte energetic motion blur effect van blauw uur naar weer
 * wit. Ook wil ik dat op de eerste sectie geen scroll effect zit met de snappy scroll, dit staat buiten het motion blur
 * effect, dus je scrollt dus normaal naar de laptop waarna de laptop sectie sticky is en als je door scrollt je de
 * animatie van de laptop krijgt en je het motion blur effect krijgt tot de sectie wit is en de services komen. Het
 * motion blur effect moet overigens kort en subtiel zijn en niet te heftig."
 * Vervangt tests/opening-85.test.mjs (de golf en de sprong bestaan niet meer).
 *
 * Levering 88b (Lucas, 4 november: "In de video lagged de laptop een beetje"): tijdens de rit houdt de video beeld 86
 * vast en schuift het doek de laptop op de klok van de rit, elk schermbeeld (laptopdoek.js, uSchuif). Eén doel voor de
 * video (videoDoel), geen METRO_VOOR meer.
 *
 *   1 · de bron: geen wiel meer afvangen; het scrollen kiest het beeld (DEEL, de tabel loop uit
 *       kladblok/levering-87/beweging.py); de video als blob (Cloudflare geeft statische bestanden zonder Range, en
 *       zonder Range kan een browser niet terugspoelen), dus media-src 'self' blob:; een sleutelbeeld elke 6 beelden;
 *       de bewegingsonscherpte hoogstens 0,03 en weer scherp als je stopt;
 *   2 · in de browser op 1440 × 900: bij het laden beweegt niets; gewoon scrollen tot de laptop, die blijft dan staan
 *       (sticky onder de balk) terwijl het scrollen de video afspeelt, vooruit en terug; bij beeld 86 vertrekt de metro
 *       (o8-rijdt): het blauw valt in banen naar beneden weg en neemt de laptop mee (de video loopt door tot het eind);
 *       daarna is het wit (o8-wit) en komt Wat we maken omhoog (pas dan, niet eerder); terug laat hem terugrijden en
 *       Wat we maken gaat weer dicht; wie ver vooruit scrolt, krijgt een rit die inhaalt; terug naar boven staat alles
 *       er weer; de streepjes (k1) kiezen een stand met de muis en met de pijltjes;
 *   3 · op de telefoon en bij minder beweging: geen baan, alles staat stil; geen scriptfouten.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

/* ── 1 · de bron ── */
console.log('\n1 · de bron');
const opening = lees('src/components/HalOpening80.astro');
const doek = lees('src/scripts/laptopdoek.js');
const data = JSON.parse(lees('src/data/laptopVideo.json'));
ok('de opening vangt het wiel niet meer af en springt nergens heen', !/addEventListener\('wheel'/.test(opening) && !/const GLIJ =|golf\(/.test(opening));
const metro = lees('src/scripts/metro.js');
ok('de metro: de video over 60 % van de baan, vertrek bij beeld 86, de laptop daarna op de klok van de rit',
  /const METRO_VIDEO = 0\.6, METRO_BEELD = 86, METRO_MEE = 1\.125,/.test(opening) && /metro = 'n3' \}/.test(opening) && /import \{ maakMetro, SOORTEN, SLUIT \} from '\.\.\/scripts\/metro\.js'/.test(opening));
ok('… geen schakelaar in de adresbalk meer (de proef van lijst 76)', !/URLSearchParams/.test(opening));
ok('88b: één doel voor de video (de scroll en de rit allebei via videoDoel), geen METRO_VOOR meer',
  /const videoDoel = \(\) => \(metroAan && rit\.u > 0 \? Math\.max\(doelScroll, METRO_BEELD\) : doelScroll\);/.test(opening)
  && (opening.match(/doelBeeld = videoDoel\(\)|doelBeeld = vd;/g) || []).length === 2 && !/METRO_VOOR/.test(opening) && !/doelBeeld = Math\.max\(doelScroll, ritBeeld\(\)\)/.test(opening));
ok('88b: de laptop schuift op het doek, 38,0 per beeld op 1920 (gemeten), met de sluiter van de banen',
  /const SCHUIF_LAPTOP = 38\.0 \/ 1920, SCHUIF_TELEFOON = 12\.5 \/ 1920;/.test(opening) && /const ritSluit = /.test(opening)
  && /uniform vec3 uSchuif;/.test(doek) && /if \(w\.x < uSchuif\.z - uSchuif\.x\) w\.x \+= uSchuif\.x;/.test(doek) && /export const SCHUIF_GRENS = 0\.75;/.test(doek));
ok('… n3: tien banen op de snede, van rechts naar links als één golf, in 0,8 s, met een sluiter van 0,07 s (lijst 77)', /n3: \{ naam: 'Lamellen', duur: 800, banen: 10, wacht: 0\.5, macht: 2\.2, strepen: false, vanRechts: true, sluit: 0\.07 \}/.test(metro) && /uniform vec4 uBaan\[12\];/.test(metro) && /const SNEDE = 0\.75;/.test(metro));
ok('de tabellen vaart en loop: 111 beelden, loop van 0 naar 1 en nooit terug',
  Array.isArray(data.vaart) && data.vaart.length === 111 && Array.isArray(data.loop) && data.loop.length === 111
  && data.loop[0] === 0 && data.loop[110] === 1 && data.loop.every((v, i) => i === 0 || v >= data.loop[i - 1]));
ok('de video als blob (terugspoelen zonder Range), en elk getoond beeld getekend', /URL\.createObjectURL/.test(opening) && /requestVideoFrameCallback/.test(opening) && /URL\.revokeObjectURL/.test(opening));
ok('een sleutelbeeld elke 6 beelden (x264 en VP9)', /keyint=6:min-keyint=6:scenecut=0/.test(lees('scripts/laptop-video.mjs')) && /'-g', '6'/.test(lees('scripts/laptop-video.mjs')));
ok('de bewegingsonscherpte: hoogstens 0,03 als de video speelt en 0,05 in de rit, alleen als hij beweegt', /export const MAX_VEEG = 0\.03, MAX_VEEG_RIT = 0\.05;/.test(doek) && /Math\.min\(schuif \? MAX_VEEG_RIT : MAX_VEEG, veeg \|\| 0\)/.test(doek) && /if \(uVeeg < \.0004\) \{ gl_FragColor = punt\(v\); return; \}/.test(doek));
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
ok("de CSP laat de blob toe: media-src 'self' blob:", /media-src 'self' blob:/.test(fs.readFileSync(path.join(DIST, '_headers'), 'utf8')));

/* ── 2 · in de browser ── */
console.log('\n2 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
/* zonder Range, zoals Cloudflare: de opening moet het dan zelf redden (de blob) */
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
    return { aan: document.documentElement.classList.contains('o8-aan'), boven: kop.top - 56, px: parseFloat(getComputedStyle(document.querySelector('.o8-kop')).fontSize), sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, cls: document.querySelector('.o8').className };
  });
  ok('het effect staat aan (html.o8-aan), de kop op 104 px met ruimte erboven, niets zijwaarts', m.aan && Math.abs(m.px - 104) < 0.5 && m.boven >= 40 && m.sw <= m.vw, JSON.stringify(m));
  await wacht(page, 1200);
  const rust = await page.evaluate(() => ({ cls: document.querySelector('.o8').className, s: window.__o8Stand?.() }));
  ok('bij het laden beweegt niets: niet onderweg, het doelbeeld 0', !/o8-onderweg|o8-veegt|o8-wit/.test(rust.cls) && !!rust.s && rust.s.doel === 0, JSON.stringify(rust));

  const baan = await page.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'); return { top: b.getBoundingClientRect().top + scrollY, R: b.offsetHeight - p.offsetHeight }; });
  ok('er is een baan om door te scrollen (de laptop blijft staan)', baan.R > 600, JSON.stringify(baan));
  const naar = async (f) => {
    const y = Math.round(baan.top - 56 + f * baan.R);
    await page.evaluate(async (y) => { const van = scrollY; for (let i = 1; i <= 8; i++) { scrollTo(0, van + (y - van) * i / 8); await new Promise((r) => requestAnimationFrame(r)); } }, y);
  };
  const stand = () => page.evaluate(() => ({ s: window.__o8Stand(), cls: document.querySelector('.o8').className, podium: Math.round(document.querySelector('.o8-podium').getBoundingClientRect().top), m8: Math.round(document.querySelector('.m8')?.getBoundingClientRect().top ?? 99999), h: innerHeight }));
  /* gewoon scrollen naar de laptop: de pagina loopt mee, geen sprong */
  await page.mouse.move(720, 450); await page.mouse.wheel(0, 120); await wacht(page, 900);
  const y1 = await page.evaluate(() => scrollY);
  ok('de eerste scroll is gewoon scrollen (geen sprong naar de laptop)', y1 >= 60 && y1 <= 240, String(y1));
  await naar(0); await page.waitForFunction(() => window.__o8Stand && window.__o8Stand().kanSpelen, null, { timeout: 25000 }).catch(() => {});
  await naar(0.3); await wacht(page, 1500);
  const a = await stand();
  ok('in de baan staat de laptop stil onder de balk (sticky)', Math.abs(a.podium - 56) <= 2, String(a.podium));
  ok('… en het scrollen speelt de video af (30 % van de baan: voorbij beeld 10)', a.s.kanSpelen && a.s.doel > 10 && a.s.beeld > 10, JSON.stringify(a.s));
  await naar(0.42); await wacht(page, 1500);
  const b = await stand();
  ok('voor het vertrek (42 %): de video ver gevorderd, nog geen rit, nog stil onder de balk', b.s.doel >= 60 && b.s.rit === 0 && !/o8-rijdt|o8-wit/.test(b.cls) && Math.abs(b.podium - 56) <= 2, JSON.stringify({ s: b.s, cls: b.cls, podium: b.podium }));
  ok('… het getekende beeld is het doel, niet verder (geen beeld voorbij en terug)', Math.abs(b.s.getekend - b.s.doel) <= 2 && b.s.beeld <= b.s.doel + 1, JSON.stringify(b.s));
  const dicht0 = await page.evaluate(() => document.querySelector('.m8').classList.contains('m8-dicht'));
  ok('… Wat we maken staat nog dicht', dicht0);
  /* 88b: elk schermbeeld van de rit vastleggen: welk videobeeld, hoe ver het doek de laptop schuift */
  await page.evaluate(() => { window.__ritLog = []; const stap = () => { const s = window.__o8Stand(); window.__ritLog.push([s.rit, s.getekend, s.schuif || 0, s.zoekt]); if (s.rit < 1 && window.__ritLog.length < 4000) requestAnimationFrame(stap); }; requestAnimationFrame(stap); });
  await naar(0.56);
  await page.waitForFunction(() => document.querySelector('.o8').classList.contains('o8-rijdt'), null, { timeout: 5000 }).catch(() => {});
  const c = await stand();
  const c2 = await page.evaluate(() => ({ doek: !document.querySelector('[data-o8-metro]').hidden, vlak: getComputedStyle(document.querySelector('.o8-vlak')).visibility, m8: document.querySelector('.m8').className }));
  ok('voorbij beeld 86: de metro vertrekt (o8-rijdt), het doek tekent het blauw, het vlak is weg', /o8-rijdt/.test(c.cls) && c.s.rit > 0 && c.s.rit < 1 && c2.doek && c2.vlak === 'hidden', JSON.stringify({ s: c.s, ...c2 }));
  ok('… Wat we maken wacht tot het blauw weg is', /m8-dicht/.test(c2.m8), c2.m8);
  await page.waitForFunction(() => window.__o8Stand().rit >= 1, null, { timeout: 15000 }).catch(() => {});
  await wacht(page, 900);
  const d = await stand();
  const d2 = await page.evaluate(() => ({ doek: !document.querySelector('[data-o8-metro]').hidden, m8: document.querySelector('.m8').className }));
  ok('aangekomen: alles wit (o8-wit), het doek weg, de laptop is mee (88b: de video op beeld 86, het doek schoof hem 0,4 van de breedte op)', /o8-wit/.test(d.cls) && !/o8-rijdt/.test(d.cls) && !d2.doek && d.s.beeld <= 87 && d.s.schuif > 0.35, JSON.stringify({ s: d.s, cls: d.cls }));
  /* 88b: de rechterrand van de laptop (breukdeel van de breedte) = waar hij in het videobeeld staat − hoe ver het doek hem schuift */
  const ritLog = (await page.evaluate(() => window.__ritLog)).filter(([u]) => u > 0 && u < 1);
  const rand = ritLog.map(([, b, sch]) => (743 - 38.0 * (b - 86)) / 1920 - sch);
  const terug = rand.findIndex((x, i) => i > 0 && x > rand[i - 1] + 1e-6);
  const stil = rand.filter((x, i) => i > 0 && x > 0.09 && Math.abs(x - rand[i - 1]) < 1e-7 && ritLog[i][0] > ritLog[i - 1][0]).length;
  ok('88b: tijdens de rit speelt de video niet verder dan beeld 86', ritLog.length >= 3 && ritLog.every(([, b]) => b <= 86), JSON.stringify(ritLog.slice(0, 6)));
  ok('88b: de laptop gaat elk schermbeeld verder naar links: nooit terug, nooit stil zolang hij in beeld is', ritLog.length >= 3 && terug === -1 && stil === 0, JSON.stringify({ n: ritLog.length, terug, stil, rand: rand.slice(0, 8).map((x) => +x.toFixed(4)) }));
  ok('… en dan komt Wat we maken omhoog, in beeld', /m8-open/.test(d2.m8) && d.m8 < d.h, JSON.stringify({ m8: d2.m8, top: d.m8 }));
  await naar(0.1); await wacht(page, 300);
  await page.waitForFunction(() => window.__o8Stand().rit === 0, null, { timeout: 15000 }).catch(() => {});
  await wacht(page, 1500);
  const e = await stand();
  const e2 = await page.evaluate(() => document.querySelector('.m8').className);
  ok('terug: de metro rijdt terug, het wit gaat weg, de video loopt terug en Wat we maken is weer dicht', e.s.rit === 0 && !/o8-wit|o8-rijdt/.test(e.cls) && e.s.doel < b.s.doel && e.s.beeld < b.s.beeld && /m8-dicht/.test(e2), JSON.stringify({ s: e.s, m8: e2 }));
  /* wie ver vooruit scrolt: de rit haalt in */
  await naar(0.45); await wacht(page, 800);
  await naar(0.98);
  const t0 = Date.now();
  await page.waitForFunction(() => window.__o8Stand().rit >= 1, null, { timeout: 15000 }).catch(() => {});
  const inhaal = Date.now() - t0;
  ok('ver vooruit gescrold: de rit komt aan, ook zonder te wachten', (await page.evaluate(() => window.__o8Stand().rit)) >= 1, String(inhaal));
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => scrollY === 0, null, { timeout: 5000 }).catch(() => {}); await wacht(page, 900);
  /* de metro rijdt eerst terug (0,67 s; zonder grafische kaart, zoals hier, duurt dat langer) */
  await page.waitForFunction(() => window.__o8Stand().rit === 0, null, { timeout: 20000 }).catch(() => {}); await wacht(page, 300);
  const f = await stand();
  ok('helemaal boven: alles staat er weer, niet onderweg', !/o8-onderweg|o8-wit|o8-veegt|o8-rijdt/.test(f.cls) && f.s.rit === 0, f.cls);

  /* k1: de streepjes, met de laptop op zijn plek (bovenaan de baan; verder in de baan staat de stand vast) */
  await naar(0); await wacht(page, 800);
  const k = await page.evaluate(() => [...document.querySelectorAll('.o8-kies')].map((e) => ({ druk: e.getAttribute('aria-pressed'), label: e.getAttribute('aria-label') || '' })));
  ok('de streepjes (k1): één per stand, elk met een naam, één ingedrukt', k.length >= 2 && k.every((x) => x.label.trim()) && k.filter((x) => x.druk === 'true').length === 1, JSON.stringify(k));
  if (k.length >= 2) {
    /* de standen lopen vanzelf door na de eerste beweging: kies dus de stand die nu niet staat */
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
    const r = await p2.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'); return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
    ok(`${naam}: geen baan en geen effect, alles staat stil, niets zijwaarts`, !r.aan && r.extra <= 1 && r.sw <= r.vw, JSON.stringify(r));
    await c2.close();
  }
  /* ── 4 · als het niet kan: zonder WebGL, of als de video niet laadt ── */
  console.log('\n4 · zonder WebGL of zonder video');
  {
    const b2 = await chromium.launch({ executablePath: browserPad(), args: ['--disable-webgl', '--disable-3d-apis'] });
    const c3 = await b2.newContext({ viewport: { width: 1440, height: 900 } }); const p3 = await c3.newPage();
    await p3.goto(BASIS + '/nl/', { waitUntil: 'load' });
    await p3.waitForFunction(() => !document.documentElement.classList.contains('o8-aan'), null, { timeout: 15000 }).catch(() => {});
    const r = await p3.evaluate(() => { const b = document.querySelector('.o8-baan'), p = document.querySelector('.o8-podium'); return { aan: document.documentElement.classList.contains('o8-aan'), extra: b.offsetHeight - p.offsetHeight }; });
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
    await p4.evaluate((y) => scrollTo(0, y + 300), top);
    await p4.waitForFunction(() => !document.documentElement.classList.contains('o8-aan'), null, { timeout: 15000 }).catch(() => {});
    const r = await p4.evaluate(() => ({ aan: document.documentElement.classList.contains('o8-aan'), laden: !document.querySelector('[data-o8-laden]').hidden }));
    ok('zonder video: het effect gaat uit en het vlagje staat niet eindeloos te laden', !r.aan && !r.laden, JSON.stringify(r));
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
