/**
 * Levering 89 (5 november 2026) — de logoposter, posterkleur in het klein en het venster in het logo.
 * Lucas, 08:00: *"Nooit harde randen bij dit soort grote achtergrond secties."* 08:41: *"Nieuwe kleuren ook aan kleine
 * dingen op de website toepassen waar mogelijk en het niet overheersend word … het mag juist wat random zijn zoals in de
 * posters en korrel bevatten."* Lijst 81 (poster C1, scroll), lijst 82 (E1 – E7 goed, E8 niet, E9 a), lijst 78 C1 – C4.
 * Wat hier vastligt:
 *   1 · de bron: de stukjes bestaan en zijn gemeten (het venster minstens 3 : 1 op de grond en zonder roze); de keuze is
 *       vast per sleutel en twee buren krijgen nooit hetzelfde; "geleverd" is de enige stand die verandert; elke pagina
 *       heeft in de HTML hoogstens drie stukjes buiten de grote plekken;
 *   2 · in de browser: de scroll drijft de poster (de kop komt op, het eind), en de poster heeft geen harde rand;
 *       tekst op een stukje haalt op het slechtste beeldpunt, met de korrel, minstens 4,5 : 1 (Bestellen, het slot, het
 *       €1-blok, "geleverd", de initialen, de tekst op het veld achter de laptop) en de witte V op de 404 minstens 3 : 1;
 *       de lege fotoplek: buren nooit hetzelfde stukje, weg zodra het beeld er is; hoogstens drie stukjes per pagina;
 *       het venster: onder de muis en met de toets erop, bij minder beweging meteen, minstens 3 : 1 op de grond.
 * Alleen Playwright en sharp (uit package.json); geen ffmpeg of ander gereedschap.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { STUKKEN, kies, rij, rijUniek, GELEVERD, HOOGSTENS } from '../src/data/stukken.js';
import { standKlasse } from '../src/data/status.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const GROND = L(0xFB, 0xFC, 0xFF);

/* ── 1 · de bron ── */
console.log('\n1 · de bron');
const STUK = path.join(ROOT, 'public', 'img', 'stuk');
const alleNamen = [...new Set(Object.values(STUKKEN).flat())];
ok(`alle ${alleNamen.length} stukjes en de twee korreltegels staan in public/img/stuk`, alleNamen.every((n) => fs.existsSync(path.join(STUK, `${n}.webp`))) && ['korrel-128', 'korrel-256'].every((n) => fs.existsSync(path.join(STUK, `${n}.webp`))),
  alleNamen.filter((n) => !fs.existsSync(path.join(STUK, `${n}.webp`))).join(', '));
const pkCss = lees('src/styles/posterkleur.css');
const metKlasse = Object.entries(STUKKEN).filter(([s]) => s !== 'raam').flatMap(([, l]) => l);
ok('elk stukje heeft zijn klasse in posterkleur.css (.pk-<naam>)', metKlasse.every((n) => pkCss.includes(`.pk-${n} { --pk: url(/img/stuk/${n}.webp); }`)), metKlasse.filter((n) => !pkCss.includes(`.pk-${n} `)).join(', '));
ok('de keuze is vast per sleutel (dezelfde sleutel, hetzelfde stukje)', kies('fp', '/nl/gallery:fp:3') === kies('fp', '/nl/gallery:fp:3') && kies('knop', '/') === kies('knop', '/'));
{
  const r1 = rij('fp', 'proef', 400), r2 = rij('fp', 'raster', 400, 4), r3 = rijUniek('fp', 'studio', 400, 5);
  ok('op een rij nooit twee buren met hetzelfde stukje', r1.every((n, i) => i === 0 || n !== r1[i - 1]));
  ok('in een raster van vier ook niet boven en onder', r2.every((n, i) => (i === 0 || n !== r2[i - 1]) && (i < 4 || n !== r2[i - 4])));
  ok('in Studio (breedte onbekend) verschilt elk stukje van de vijf ervoor', r3.every((n, i) => !r3.slice(Math.max(0, i - 5), i).includes(n)));
  ok('en het is toeval: van de tien fotoplekstukjes komen er op 400 plekken minstens acht voor', new Set(r1).size >= 8, String(new Set(r1).size));
}
ok('"geleverd" is de enige stand die een stukje krijgt (E5); de stand zelf blijft done', standKlasse('delivered') === 'stand is-done is-geleverd' && standKlasse('paid') === 'stand is-done' && standKlasse('approved') === 'stand is-done' && standKlasse('in_production') === 'stand is-work');
for (const f of ['src/styles/posterkleur.css', 'public/account.css', 'public/admin.css', 'public/portal.css']) {
  ok(`${f}: "geleverd" in het stukje ${GELEVERD} met korrel, wit erop`, lees(f).includes(`url(/img/stuk/${GELEVERD}.webp) 50% 50% / cover no-repeat, #0F1217 !important; color: #FFFFFF !important;`));
}
for (const f of ['src/styles/global.css', 'public/account.css', 'public/admin.css', 'public/portal.css']) {
  const css = lees(f);
  ok(`${f}: het venster (E7) onder de muis en met de toets erop, in plaats van de schommel, bij minder beweging meteen`,
    css.includes(':is(.mk:hover, a:hover > .mk, a:focus-visible > .mk, button:hover > .mk, button:focus-visible > .mk) .mk-raam { opacity: 1; transition-duration: .6s; }')
    && css.includes('.mk.mk-venster .mk-kleur { display: none; }') && css.includes('@media (prefers-reduced-motion: reduce) { .mk .mk-raam { transition: none; } }'));
}
ok('… in /admin en /account op een donkere grond niet: daar blijft de schommel', /:root\[data-thema="donker"\] \.mk\.mk-venster \.mk-raam \{ display: none; \}/.test(lees('public/admin.css')) && /html:not\(\[data-thema="licht"\]\) \.mk\.mk-venster \.mk-raam \{ display: none; \}/.test(lees('public/account.css')));
{
  /* het venster: elk beeldpunt minstens 3 : 1 op de grond, en geen roze (in een blauw veld is blauw altijd het sterkst) */
  let slechtst = 99, roze = 0;
  for (const n of STUKKEN.raam) {
    const { data, info } = await sharp(path.join(STUK, `${n}.webp`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < info.width * info.height * 3; i += 3) {
      slechtst = Math.min(slechtst, ratio(GROND, L(data[i], data[i + 1], data[i + 2])));
      if (data[i] > data[i + 2] - 8) roze++;
    }
  }
  ok(`het venster: elk punt van elk stukje minstens 3 : 1 op de grond (slechtste ${slechtst.toFixed(2)} : 1)`, slechtst >= 3);
  ok('… en zonder roze: roze komt nooit in een logo', roze === 0, `${roze} punten`);
}
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
{
  /* in de HTML: hoogstens drie vaste stukjes per pagina (de lege fotoplek, het €1-blok en de 404 tellen niet) */
  const paginas = [];
  (function zoek(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) zoek(p); else if (e.name.endsWith('.html')) paginas.push(p); } })(DIST);
  const teVeel = [];
  let metStuk = 0;
  for (const p of paginas) {
    const html = fs.readFileSync(p, 'utf8');
    const n = [...html.matchAll(/class="([^"]*)"/g)].map((m) => ` ${m[1]} `).filter((c) => c.includes(' pk ') && !/ (pk-fp|pk-fp-onder|h-proef-woord|h-nf-getal) /.test(c)).length;
    if (n) metStuk++;
    if (n > HOOGSTENS) teVeel.push(`${path.relative(DIST, p)} (${n})`);
  }
  ok(`in ${paginas.length} pagina's hoogstens ${HOOGSTENS} vaste stukjes (${metStuk} pagina's hebben er)`, teVeel.length === 0 && metStuk > 50, teVeel.slice(0, 5).join(', '));
}

/* ── 2 · in de browser ── */
console.log('\n2 · in de browser');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = http.createServer((q, r) => {
  let f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
/* Een schermfoto of een pagina mag hier 120 s duren in plaats van de gewone 30 s (8 november 2026). Op Lucas' pc duurde een
   foto op /nl/ langer dan 30 s, ook toen de test los draaide, en daarna het wegklikken van /nl/ naar /nl/editions/ ook. Op /nl/
   loopt het levende veld van de poster (WebGL zonder grafische kaart, op 2× scherpte 2160 × 1350 beeldpunten); in de werkruimte
   kost een foto daar 1,7 – 5 s, op /nl/editions/ 0,06 s. Daarom ook: van /nl/ klikken we nooit door naar een andere pagina,
   elke pagina na /nl/ krijgt een eigen, nieuw venster. */
const FOTO_MS = 120000;
const browser = await chromium.launch({ executablePath: browserPad(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fouten = [];
async function open(opties = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opties });
  const page = await ctx.newPage();
  /* alles mag hier 120 s duren in plaats van 30 s (zie FOTO_MS) */
  page.setDefaultTimeout(FOTO_MS); page.setDefaultNavigationTimeout(FOTO_MS);
  page.on('pageerror', (e) => fouten.push(`${page.url()}: ${e}`));
  /* de cookiebalk en de WhatsApp-knop niet in beeld (ze kunnen over de tekst liggen die we meten) */
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#cc-bar, .wa-dock { display: none !important; }'; document.head.append(s); }); });
  return { ctx, page };
}
const STIL = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; } #cc-bar, .wa-dock { display: none !important; }';
const pixels = async (buf) => { const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };

/**
 * Het slechtste beeldpunt onder de tekst: drie keer dezelfde plek. `kaal` zonder de tekst (de grond met korrel), `masker` de
 * tekst zwart op wit (alles wat geen tekst is weg). Onder het masker, 2 px verbreed, de laagste verhouding tussen de kleur
 * van de tekst en de grond eronder.
 */
async function slechtsteTekst(page, wortel, tekst, tekstKleur = [255, 255, 255]) {
  const el = await page.$(wortel);
  if (!el) return { r: 0, n: 0, fout: `${wortel} niet gevonden` };
  /* in het midden van het scherm, weg van de balk bovenin (die er anders overheen kan liggen) */
  /* (niet in de opening: een sprong daar start de rit) */
  if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8'), wortel)) await el.scrollIntoViewIfNeeded();
  else await page.evaluate((w) => { const e = document.querySelector(w); if (!e.closest('.site-header')) e.scrollIntoView({ block: 'center' }); }, wortel);
  await page.waitForTimeout(350);
  const vak = await el.boundingBox();
  const vp = page.viewportSize();
  const clip = { x: Math.max(0, vak.x), y: Math.max(0, vak.y), width: Math.min(vak.width, vp.width - Math.max(0, vak.x)), height: Math.min(vak.height, vp.height - Math.max(0, vak.y)) };
  if (tekstKleur === 'auto') tekstKleur = await page.$eval(`${wortel} ${tekst[0]}`.trim(), (e) => getComputedStyle(e).color.match(/\d+/g).slice(0, 3).map(Number));
  /* De site staat in @layer basis, en daar wint een !important van elke !important buiten een laag. Een style-attribuut
     met !important gaat er wel boven (de cascade kijkt eerst naar het element, dan naar de lagen): dus zetten we het zo. */
  const zet = (stap) => page.evaluate(([wortel, tekst, stap, stil]) => {
    let st = document.getElementById('meet-stil'); if (!st) { st = document.createElement('style'); st.id = 'meet-stil'; st.textContent = stil; document.head.append(st); }
    const root = document.querySelector(wortel);
    const alle = [root, ...root.querySelectorAll('*')];
    for (const e of [document.documentElement, document.body]) if (e.hasAttribute('data-m-oud')) { const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); if (stap === 'terug') e.removeAttribute('data-m-oud'); }
    for (const e of alle) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); const o = e.getAttribute('data-m-oud'); if (o === '\u0001') e.removeAttribute('style'); else e.setAttribute('style', o); }
    if (stap === 'terug') { for (const e of alle) e.removeAttribute('data-m-oud'); st.remove(); return; }
    const tk = new Set(tekst.flatMap((t) => (t ? [...root.querySelectorAll(t)] : [root])).flatMap((e) => [e, ...e.querySelectorAll('*')]));
    const z = (e, k, v) => e.style.setProperty(k, v, 'important');
    if (stap === 'kaal') {
      /* ook de achtergrond van de letters zelf (een kop in de kopletter kan zijn kleur als background-clip: text dragen) */
      for (const e of tk) { z(e, 'color', 'transparent'); z(e, '-webkit-text-fill-color', 'transparent'); z(e, 'text-decoration-color', 'transparent'); z(e, 'fill', 'transparent'); z(e, 'stroke', 'transparent'); if (e !== root) z(e, 'background', 'transparent'); }
    } else {
      for (const e of alle) {
        if (tk.has(e)) { z(e, 'visibility', 'visible'); z(e, 'color', '#000'); z(e, '-webkit-text-fill-color', '#000'); z(e, 'fill', '#000'); z(e, 'stroke', 'none'); z(e, 'text-shadow', 'none'); if (e !== root) { z(e, 'background', 'transparent'); z(e, 'box-shadow', 'none'); } }
        else z(e, 'visibility', 'hidden');
      }
      z(root, 'visibility', 'visible'); z(root, 'background', '#fff'); z(root, 'box-shadow', 'none');
      /* de rest van de pagina weg (wat over de plek heen valt, telt niet als tekst op het stukje) */
      for (const e of [document.documentElement, document.body]) { if (!e.hasAttribute('data-m-oud')) e.setAttribute('data-m-oud', e.getAttribute('style') ?? '\u0001'); }
      z(document.body, 'visibility', 'hidden'); z(document.documentElement, 'background', '#fff'); z(document.body, 'background', '#fff');
    }
  }, [wortel, tekst, stap, STIL]);
  await zet('kaal'); await page.waitForTimeout(60);
  const kaal = await pixels(await page.screenshot({ clip, timeout: FOTO_MS }));
  await zet('masker'); await page.waitForTimeout(60);
  const mBuf = await page.screenshot({ clip, timeout: FOTO_MS }); const masker = await pixels(mBuf);
  if (process.env.MEET_UIT) { fs.mkdirSync(process.env.MEET_UIT, { recursive: true }); const k = wortel.replace(/[^a-z0-9]+/gi, '_'); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-masker.png`), mBuf); fs.writeFileSync(path.join(process.env.MEET_UIT, `${k}-kaal.png`), await sharp(kaal.data, { raw: { width: kaal.w, height: kaal.h, channels: 3 } }).png().toBuffer()); }
  await zet('terug');
  const { w, h } = kaal, aan = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (masker.data[i * 3] < 140 && masker.data[i * 3 + 2] < 140) aan[i] = 1;
  const breed = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!aan[y * w + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) breed[Y * w + X] = 1; } }
  const Lt = L(...tekstKleur);
  let r = 99, n = 0;
  for (let i = 0; i < w * h; i++) { if (!breed[i]) continue; n++; r = Math.min(r, ratio(Lt, L(kaal.data[i * 3], kaal.data[i * 3 + 1], kaal.data[i * 3 + 2]))); }
  return { r, n };
}

/* de poster: de scroll drijft hem, en hij heeft geen harde rand */
{
  const { ctx, page } = await open();
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  /* de poster begint pas als hij in de buurt komt: eerst erheen springen */
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-p9]').getBoundingClientRect().top + scrollY - 200));
  await page.waitForFunction(() => document.querySelector('[data-p9]')?.classList.contains('p9-aan'), null, { timeout: 60000 });
  const baan = await page.evaluate(() => { const b = document.querySelector('[data-p9-baan]'); const r = b.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, podium: document.querySelector('[data-p9-podium]').offsetHeight }; });
  const naar = async (q) => { await page.evaluate((y) => window.scrollTo(0, y), Math.round(baan.top + q * (baan.h - baan.podium))); await page.waitForTimeout(700); };
  const kop = () => page.evaluate(() => document.querySelector('[data-p9] [data-p9-kop]')?.classList.contains('is-aan') ?? null);
  const eind = () => page.evaluate(() => document.querySelector('[data-p9]').classList.contains('is-eind'));
  /* de getoonde stand ijlt licht na (en zonder grafische kaart is alles trager): wachten tot hij er is */
  const tot = (f) => page.waitForFunction(f, null, { timeout: 20000 }).then(() => true, () => false);
  await naar(0.2); await page.waitForTimeout(1500); const kop1 = await kop(), eind1 = await eind();
  await naar(0.65); const kop2 = await tot(() => document.querySelector('[data-p9] [data-p9-kop]')?.classList.contains('is-aan'));
  await naar(0.97); const eind3 = await tot(() => document.querySelector('[data-p9]').classList.contains('is-eind'));
  ok('de scroll drijft de poster: eerst geen kop, halverwege de kop, aan het eind het eind', kop1 === false && kop2 === true && eind1 === false && eind3 === true, JSON.stringify({ kop1, kop2, eind1, eind3 }));
  await naar(0.65);
  const veld = await page.evaluate(() => document.querySelector('[data-p9]').classList.contains('p9-veld-aan'));
  ok('… het veld leeft (WebGL), het stille beeld staat eronder voor wie het niet heeft', veld);
  /* geen harde rand: de rij boven en onder de poster lopen over, nergens een sprong van meer dan 6 van rij tot rij */
  const randen = await page.evaluate(() => { const r = document.querySelector('[data-p9-podium]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
  const shot = await pixels(await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 }, timeout: FOTO_MS }));
  let sprong = 0;
  const rijGem = (y) => { let s = 0; for (let x = 0; x < 1440; x++) { const i = (y * 1440 + x) * 3; s += (shot.data[i] + shot.data[i + 1] + shot.data[i + 2]) / 3; } return s / 1440; };
  for (const rand of [randen.top, randen.bottom]) {
    if (rand < 6 || rand > 894) continue;
    for (let y = Math.max(1, Math.round(rand) - 24); y < Math.min(899, Math.round(rand) + 24); y++) sprong = Math.max(sprong, Math.abs(rijGem(y) - rijGem(y - 1)));
  }
  ok(`de poster heeft geen harde rand (de grootste sprong van rij tot rij ${sprong.toFixed(1)}, hoogstens 6)`, sprong <= 6);
  await ctx.close();
}

/* tekst op een stukje: minstens 4,5 : 1 op het slechtste beeldpunt, met de korrel */
{
  const { ctx, page } = await open({ deviceScaleFactor: 2 });
  await page.goto(`${BASIS}/nl/editions/`, { waitUntil: 'networkidle' });
  const cta = await slechtsteTekst(page, '.site-header .nav-cta', ['']);
  ok(`Bestellen bovenin (E3, een pil): wit op het stukje minstens 4,5 : 1 (slechtste ${cta.r.toFixed(2)})`, cta.r >= 4.5 && cta.n > 50, cta.fout || '');
  const vorm = await page.$eval('.site-header .nav-cta', (e) => getComputedStyle(e).borderTopLeftRadius);
  ok('… en een pil (999px), niet de oude zachte hoek', parseFloat(vorm) >= 20, vorm);
  await page.hover('.site-header .nav-cta'); await page.waitForTimeout(450);
  const onder = await slechtsteTekst(page, '.site-header .nav-cta', ['']);
  ok(`… onder de muis donkerder, dus nooit slechter leesbaar (${onder.r.toFixed(2)} ≥ ${cta.r.toFixed(2)})`, onder.r >= cta.r - 0.05);
  await page.mouse.move(700, 600);
  const slot = await slechtsteTekst(page, '.h-lk-slot', [':scope > .h-kop', ':scope > .h-pil', ':scope > p:not(.h-acties)', ':scope > .h-feiten']);
  const slotKlasse = await page.$eval('.h-lk-slot', (e) => e.className);
  ok(`het slot onderaan (E2, het ene inktblok): een stukje, wit erop minstens 4,5 : 1 (slechtste ${slot.r.toFixed(2)})`, / pk pk-[nt]-blok-\d/.test(` ${slotKlasse}`) && slot.r >= 4.5, slotKlasse);
  /* "geleverd" en de initialen staan in Studio, /admin en het portaal; hier in een site-pagina gezet, met dezelfde css.
     Op /nl/editions/ en niet op /nl/: daar loopt het veld van de poster mee in elke foto (zie FOTO_MS), en dat meet hier niets. */
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'meet-pk'; d.style.cssText = 'position:fixed;left:40px;top:200px;z-index:99999;display:flex;gap:24px;align-items:center;background:#FBFCFF;padding:24px';
    d.innerHTML = '<span class="stand is-done is-geleverd">Geleverd</span><span class="st-wie-letter pk pk-n-vk-0" style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:600 13px/1 \'DM Sans\',sans-serif">AK</span>';
    document.body.append(d); document.body.classList.add('studio');
  });
  const pil = await slechtsteTekst(page, '#meet-pk .stand', ['']);
  ok(`"geleverd" (E5): wit op het stukje nacht minstens 4,5 : 1 (slechtste ${pil.r.toFixed(2)})`, pil.r >= 4.5 && pil.n > 20);
  let vkSlechtst = 99;
  for (const n of STUKKEN.vk) {
    await page.evaluate((n) => { const e = document.querySelector('#meet-pk .st-wie-letter'); e.className = `st-wie-letter pk pk-${n}`; }, n);
    await page.waitForTimeout(80);
    vkSlechtst = Math.min(vkSlechtst, (await slechtsteTekst(page, '#meet-pk .st-wie-letter', [''])).r);
  }
  ok(`de initialen (E4): wit op elk van de ${STUKKEN.vk.length} stukjes minstens 4,5 : 1 (slechtste ${vkSlechtst.toFixed(2)})`, vkSlechtst >= 4.5);
  await ctx.close();
}
/* het €1-blok staat alleen op /nl/: als laatste, in een eigen venster, en daarna dicht (zie FOTO_MS) */
{
  const { ctx, page } = await open({ deviceScaleFactor: 2 });
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.h-proef').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900);
  const proef = await slechtsteTekst(page, '.h-proef > .h-proef-woord', [':scope > .h-kop', ':scope > .h-pil', ':scope > p:not(.h-acties)']);
  const proefKlasse = await page.$eval('.h-proef > .h-proef-woord', (e) => e.className);
  ok(`het €1-blok (B4 Nacht): wit erop minstens 4,5 : 1 (slechtste ${proef.r.toFixed(2)})`, / pk pk-n-blok-\d/.test(` ${proefKlasse}`) && proef.r >= 4.5, proefKlasse);
  await ctx.close();
}

/* het veld achter de laptop (B1 Horizon) en de 404 (B4 met de witte V) */
{
  const { ctx, page } = await open({ deviceScaleFactor: 1 });
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  const vlak = await page.$eval('.o8-vlak', (e) => getComputedStyle(e).backgroundImage);
  ok('achter de laptop het veld B1 Horizon (een beeld met korrel), niet meer de fade alleen', /veld-b1\.webp/.test(vlak) && /korrel-128/.test(await page.$eval('.o8-vlak', (e) => getComputedStyle(e, '::after').backgroundImage)), vlak.slice(0, 120));
  ok('… en de metro tekent hetzelfde veld in zijn banen', /texture2D\(uVeld/.test(lees('src/scripts/metro.js')) && /veld-b1-staand\.webp/.test(lees('src/scripts/metro.js')));
  await ctx.close();
  /* de tekst op het veld: de naam van de stand, onder de laptop (op de telefoon staat hij onder het podium op de grond) */
  const maten = [];
  for (const [b, h] of [[1440, 900], [1280, 800], [1920, 1080], [390, 844]]) {
    const o = await open({ viewport: { width: b, height: h }, deviceScaleFactor: 1, ...(b < 600 ? { isMobile: true, hasTouch: true } : {}) });
    await o.page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' }); await o.page.waitForTimeout(400);
    if (await o.page.$('.o8-stand-naam')) { const t = await slechtsteTekst(o.page, '.o8-podium', ['.o8-stand-naam'], 'auto'); maten.push([`${b}`, t.r, t.n]); }
    await o.ctx.close();
  }
  ok(`… de tekst op het veld (de naam van de stand) haalt overal minstens 4,5 : 1 (${maten.map(([b, r]) => `${b}: ${r.toFixed(2)}`).join(', ')})`, maten.length >= 3 && maten.every(([, r, n]) => n > 20 && r >= 4.5));
  const t2 = await open({ deviceScaleFactor: 1 });
  const page2 = t2.page;
  await page2.goto(`${BASIS}/nl/404.html`, { waitUntil: 'networkidle' });
  const v = await slechtsteTekst(page2, '.h-nf-getal', ['.h-nf-v']);
  const nk = await page2.$eval('.h-nf-getal', (e) => e.className);
  ok(`de 404: het veld Nacht met de witte V, de V minstens 3 : 1 (slechtste ${v.r.toFixed(2)})`, / pk pk-n-blok-\d/.test(` ${nk}`) && v.r >= 3 && v.n > 200, nk);
  await t2.ctx.close();
}

/* de lege fotoplek: een stukje zolang het beeld laadt, buren nooit hetzelfde, weg zodra het er is */
{
  const { ctx, page } = await open();
  let los = null; const wachtOp = new Promise((r) => { los = r; });
  await page.route('**/*', async (route) => {
    const u = route.request().url();
    if (route.request().resourceType() === 'image' && !u.includes('/img/stuk/')) { await wachtOp; }
    route.continue();
  });
  await page.goto(`${BASIS}/nl/gallery/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.click('label[for="gw-alles"]'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.h-gl-raster').scrollIntoView()); await page.waitForTimeout(800);
  const plekken = await page.$$eval('img.pk-fp', (l) => l.map((i) => { const r = i.getBoundingClientRect(); return { n: i.dataset.pk, x: r.left, y: r.top, r: r.right, b: r.bottom }; }));
  let gelijk = 0;
  for (const a of plekken) for (const b of plekken) {
    if (a === b) continue;
    const naast = Math.abs(b.x - a.r) < 24 && b.y < a.b - 4 && b.b > a.y + 4, onder = Math.abs(b.y - a.b) < 24 && b.x < a.r - 4 && b.r > a.x + 4;
    if ((naast || onder) && a.n === b.n) gelijk++;
  }
  ok(`de lege fotoplek (E1): ${plekken.length} plekken met een stukje, licht en donker door elkaar (${new Set(plekken.map((p) => p.n)).size} soorten)`, plekken.length >= 6 && new Set(plekken.map((p) => p.n)).size >= 4);
  ok('… en nooit twee buren met hetzelfde stukje', gelijk === 0, `${gelijk} keer`);
  los();
  await page.waitForTimeout(2500);
  ok('… weg zodra het beeld er is', (await page.$$eval('img.pk-fp', (l) => l.length)) === 0);
  await ctx.close();
}

/* hoogstens drie stukjes per pagina, ook met wat het script zet */
{
  const telling = [];
  /* elke pagina een eigen venster: van /nl/ niet doorklikken (zie FOTO_MS) */
  for (const p of ['/nl/', '/', '/nl/editions/', '/nl/lifestyle/', '/nl/pricing/', '/nl/gallery/', '/nl/hooks/', '/nl/404.html']) {
    const { ctx, page } = await open();
    await page.goto(`${BASIS}${p}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
    telling.push([p, await page.$$eval('.pk:not(.pk-fp):not(.pk-fp-onder):not(.h-proef-woord):not(.h-nf-getal)', (l) => l.length)]);
    await ctx.close();
  }
  ok(`op elke pagina hoogstens ${HOOGSTENS} stukjes buiten de grote plekken (${telling.map(([p, n]) => `${p} ${n}`).join(', ')})`, telling.every(([, n]) => n <= HOOGSTENS));
}

/* het venster in het logo (E7) */
const totVol = (page, raam) => page.waitForFunction((r) => Number(getComputedStyle(document.querySelector(r)).opacity) === 1, raam, { timeout: 10000 }).catch(() => {});
async function venster(page, sel, link) {
  const raam = `${sel} .mk-raam`;
  const op = () => page.$eval(raam, (e) => Number(getComputedStyle(e).opacity));
  const voor = await op();
  /* tot het venster er helemaal is (hoogstens 10 s): op een trage pc is de overgang van 0,7 s niet na 0,9 s klaar */
  await page.hover(link); await page.waitForTimeout(900); await totVol(page, raam);
  const onder = await op();
  const kleurLaag = await page.$eval(`${sel} .mk-kleur`, (e) => getComputedStyle(e).display);
  return { voor, onder, kleurLaag };
}
{
  const { ctx, page } = await open({ deviceScaleFactor: 2 });
  await page.goto(`${BASIS}/nl/pricing/`, { waitUntil: 'networkidle' });
  const balk = await venster(page, '.site-header .hal-vm-balk', '.site-header .brand');
  ok('de V in de balk: onder de muis een venster op de snede (0 → 1), de schommel staat uit', balk.voor === 0 && balk.onder === 1 && balk.kleurLaag === 'none', JSON.stringify(balk));
  /* minstens 3 : 1 op de grond: de V onder de muis tegen dezelfde plek zonder V */
  const vak = await page.$eval('.site-header .hal-vm-balk', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const met = await pixels(await page.screenshot({ clip: vak, timeout: FOTO_MS }));
  await page.addStyleTag({ content: '.site-header .hal-vm-balk { visibility: hidden !important; }' });
  const zonder = await pixels(await page.screenshot({ clip: vak, timeout: FOTO_MS }));
  let slechtst = 99, n = 0;
  const binnen = (i) => { const d = Math.abs(met.data[i] - zonder.data[i]) + Math.abs(met.data[i + 1] - zonder.data[i + 1]) + Math.abs(met.data[i + 2] - zonder.data[i + 2]); return d > 240; };
  for (let y = 1; y < met.h - 1; y++) for (let x = 1; x < met.w - 1; x++) {
    const i = (y * met.w + x) * 3;
    if (!binnen(i) || !binnen(i - 3) || !binnen(i + 3) || !binnen(i - met.w * 3) || !binnen(i + met.w * 3)) continue;
    n++; slechtst = Math.min(slechtst, ratio(L(met.data[i], met.data[i + 1], met.data[i + 2]), L(zonder.data[i], zonder.data[i + 1], zonder.data[i + 2])));
  }
  ok(`… het venster minstens 3 : 1 op de grond (slechtste ${slechtst.toFixed(2)} over ${n} punten)`, n > 100 && slechtst >= 3);
  await page.reload({ waitUntil: 'networkidle' });
  const voet = await venster(page, '.site-footer .hal-wm-voet', '.site-footer .footer-brand .brand');
  ok('het tekstlogo in de voet: onder de muis het venster, de schommel uit', voet.voor === 0 && voet.onder === 1 && voet.kleurLaag === 'none', JSON.stringify(voet));
  ok('het grote woordmerk onderaan houdt zijn uitloop (geen venster, lijst 78 C4)', (await page.$$('.hal-wm-reus .mk-raam')).length === 0);
  /* met de toets erop */
  await page.mouse.move(700, 450);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
  await page.keyboard.press('Tab');
  let n2 = 0;
  while (n2++ < 6 && !(await page.evaluate(() => document.activeElement?.matches('.site-header .brand')))) await page.keyboard.press('Tab');
  await page.waitForTimeout(900); await totVol(page, '.site-header .hal-vm-balk .mk-raam');
  const opToets = await page.$eval('.site-header .hal-vm-balk .mk-raam', (e) => Number(getComputedStyle(e).opacity));
  ok('… en met de toets erop (focus-visible)', opToets === 1, JSON.stringify({ opacity: opToets, focus: await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName) }));
  await ctx.close();
  const rustig = await open({ reducedMotion: 'reduce' });
  await rustig.page.goto(`${BASIS}/nl/pricing/`, { waitUntil: 'networkidle' });
  await rustig.page.hover('.site-header .brand'); await rustig.page.waitForTimeout(60);
  ok('minder beweging: meteen het venster, zonder overgang', (await rustig.page.$eval('.site-header .hal-vm-balk .mk-raam', (e) => [Number(getComputedStyle(e).opacity), getComputedStyle(e).transitionDuration])).join() === '1,0s');
  await rustig.ctx.close();
}

ok('geen scriptfouten', fouten.length === 0, fouten.slice(0, 3).join(' | '));
await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
