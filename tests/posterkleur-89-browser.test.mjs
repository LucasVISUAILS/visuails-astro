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
  ok(`${f}: "geleverd" in het stukje ${GELEVERD} met korrel, wit erop`, lees(f).includes(`url(/img/stuk/${GELEVERD}.webp) 50% 50% / cover no-repeat, #090D0B !important; color: #FFFFFF !important;`));
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
  ok(`in ${paginas.length} pagina's hoogstens ${HOOGSTENS} vaste stukjes (${metStuk} pagina's hebben er)`, teVeel.length === 0 /* sinds lijst 86 heeft het slot geen stukje meer: de meeste pagina's hebben er nu geen (9 november 2026) */, teVeel.slice(0, 5).join(', '));
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
  /* (levering 90: met het effect op de rustplek van de laptop, het podium onder de balk; verder in de baan start de video) */
  if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8') && document.documentElement.classList.contains('o8-aan'), wortel)) {
    await page.evaluate(() => scrollTo({ top: document.querySelector('.o8-baan').getBoundingClientRect().top + scrollY - 56, behavior: 'instant' }));
    await page.waitForFunction(() => window.__o8Stand?.().fase === 'rust' && document.querySelector('[data-o8-beeld]').complete, null, { timeout: 30000 }).catch(() => {});
  } else if (await page.evaluate((w) => !!document.querySelector(w).closest('.o8'), wortel)) await el.scrollIntoViewIfNeeded();
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

/* de poster: sinds levering 106 weg van de voorpagina (lijst 114, V4: "Deze poster mag voor nu weg want voegt niet veel toe");
   tot levering 105 stond hier de logoposter (HalPoster89) met zijn scroll en zijn zachte randen. */
{
  const { ctx, page } = await open();
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  ok('geen poster meer op de voorpagina (het veld met de V niet, en geen foto in zijn plaats)', await page.evaluate(() => !document.querySelector('[data-p9], .r105-poster')));
  await ctx.close();
}

/* tekst op een stukje: minstens 4,5 : 1 op het slechtste beeldpunt, met de korrel */
{
  const { ctx, page } = await open({ deviceScaleFactor: 2 });
  await page.goto(`${BASIS}/nl/editions/`, { waitUntil: 'networkidle' });
  /* E3 VERVALLEN 13 november 2026 (levering 99, lijst 100 D2 a): Bestellen bovenin is een witte knop met inkt op de zwevende
     inktbalk (balk-99.css), geen stukje meer; 8 px (lijst 100 D3 a). Hier: dat er geen stukje meer op staat. */
  const cta = await page.$eval('.site-header .nav-cta', (e) => { const c = getComputedStyle(e); return { kl: c.className, bg: c.backgroundColor, img: c.backgroundImage, tekst: c.color, r: c.borderTopLeftRadius, pk: e.className.includes('pk') }; });
  ok('Bestellen bovenin (E3 vervallen, levering 99): wit met inkt, geen stukje, 8 px', !cta.pk && !/stuk\//.test(cta.img) && cta.tekst === 'rgb(9, 13, 11)' && parseFloat(cta.r) === 8, JSON.stringify(cta));
  await page.mouse.move(700, 600);
  /* E2 (het slot) VERVALLEN 9 november 2026: lijst 86 zet daar een vaste foto met glas (tests/fotoblok-browser.test.mjs meet het) */
  const slotKlasse = await page.$eval('.h-lk-slot', (e) => e.className);
  ok('het slot onderaan heeft geen stukje meer (lijst 86: de fotoblokken)', !/ pk /.test(` ${slotKlasse} `), slotKlasse);
  /* "geleverd" en de initialen staan in Studio, /admin en het portaal; hier in een site-pagina gezet, met dezelfde css.
     Op /nl/editions/ en niet op /nl/: daar loopt het veld van de poster mee in elke foto (zie FOTO_MS), en dat meet hier niets. */
  await page.evaluate(() => {
    const d = document.createElement('div'); d.id = 'meet-pk'; d.style.cssText = 'position:fixed;left:40px;top:200px;z-index:99999;display:flex;gap:24px;align-items:center;background:#FFFFFF;padding:24px';
    d.innerHTML = '<span class="stand is-done is-geleverd">Geleverd</span><span class="st-wie-letter pk pk-n-vk-0" style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:600 13px/1 \'DM Sans\',sans-serif">AK</span>';
    document.body.append(d); document.body.classList.add('studio');
  });
  const pil = await slechtsteTekst(page, '#meet-pk .stand', ['']);
  ok(`"geleverd" (E5): wit op het stukje nacht minstens 4,5 : 1 (slechtste ${pil.r.toFixed(2)})`, pil.r >= 4.5 && pil.n > 20);
  let vkSlechtst = 99; const vkPer = [];
  for (const n of STUKKEN.vk) {
    await page.evaluate((n) => { const e = document.querySelector('#meet-pk .st-wie-letter'); e.className = `st-wie-letter pk pk-${n}`; }, n);
    await page.waitForTimeout(80);
    const r = (await slechtsteTekst(page, '#meet-pk .st-wie-letter', [''])).r; vkPer.push(`${n} ${r.toFixed(2)}`);
    vkSlechtst = Math.min(vkSlechtst, r);
  }
  ok(`de initialen (E4): wit op elk van de ${STUKKEN.vk.length} stukjes minstens 4,5 : 1 (slechtste ${vkSlechtst.toFixed(2)})`, vkSlechtst >= 4.5, vkPer.join(' · '));
  await ctx.close();
}
/* het €1-blok staat alleen op /nl/: als laatste, in een eigen venster, en daarna dicht (zie FOTO_MS) */
{
  const { ctx, page } = await open({ deviceScaleFactor: 2 });
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('.h-proef').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900);
  /* B4 op het €1-blok VERVALLEN 9 november 2026 (lijst 86; tests/fotoblok-browser.test.mjs meet het contrast) */
  const proefKlasse = await page.$eval('.h-proef > .h-proef-woord', (e) => e.className);
  ok('het €1-blok heeft geen stukje meer (lijst 86: de fotoblokken)', !/ pk /.test(` ${proefKlasse} `), proefKlasse);
  await ctx.close();
}

/* het veld achter de laptop (B1 Horizon) en de 404 (B4 met de witte V) */
{
  const { ctx, page } = await open({ deviceScaleFactor: 1 });
  await page.goto(`${BASIS}/nl/`, { waitUntil: 'networkidle' });
  /* levering 90: met het effect zit het veld in de video (de foto is beeld 0); het vlak erboven is het wit van zijn bovenkant */
  const vlak = await page.$eval('.o8-vlak', (e) => ({ beeld: getComputedStyle(e).backgroundImage, kleur: getComputedStyle(e).backgroundColor, aan: document.documentElement.classList.contains('o8-aan'), foto: document.querySelector('[data-o8-beeld]').currentSrc }));
  /* 8 november 21:44: zonder korrel (Lucas: de korrel maakte de overloop tussen de secties niet glad) */
  /* levering 94 (Lucas, 12 november 07:50: "Verwijder de kleuren achter de laptop"): achter de laptop de grond, geen veld;
     de video is op die grond gemaakt (laptop-video-90.py met VELD=wit) */
  /* levering 107: de grond is #FCFCFC; de laptop (puur wit) ligt er met multiply op, dus ook daar de grond */
  ok('achter de laptop de grond (#FCFCFC), geen veld meer',
    vlak.beeld === 'none' && vlak.kleur === 'rgb(252, 252, 252)', JSON.stringify(vlak).slice(0, 200));
  ok('… en de video is op de grond gemaakt', /^(wit|puur wit)/.test(JSON.parse(lees('src/data/laptopVideo90.json')).veld) && /VELD == '(wit|puur)'/.test(lees('scripts/laptop-video-90.py')));
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
  ok(`de 404: de witte V (sinds lijst 86 op de vaste foto) minstens 3 : 1 (slechtste ${v.r.toFixed(2)})`, !/ pk /.test(` ${nk} `) && v.r >= 3 && v.n > 200, nk);
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
  /* levering 99: de balk is inkt (balk-99.css); daar kleurt het tekstlogo onder de muis alleen (blauw licht), zonder venster:
     een venster op de snede haalde op inkt geen 3 : 1. Het venster en zijn meting staan nu op het tekstlogo in de voet (op wit). */
  ok('het tekstlogo in de balk (inkt): geen venster meer', (await page.$$('.site-header .hal-wm-balk .mk-raam')).length === 0);
  /* levering 100 (lijst 104): de voet is zwart en het logo erin wit; het venster haalde daar geen 3 : 1 (2,72). Het logo in de voet
     heeft geen venster meer en wordt onder de muis mint (kleur-100.css). VERVALLEN: het venster in de voet en zijn meting. */
  await page.evaluate(() => document.querySelector('.site-footer .hal-wm-voet').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  const raamVoet = await page.$eval('.site-footer .hal-wm-voet .mk-raam', (e) => getComputedStyle(e).display).catch(() => 'none');
  await page.hover('.site-footer .footer-brand .brand'); await page.waitForTimeout(900);
  /* de kleur loopt in 0,7 s over; met het kaartveld (WebGL, in de toets software) soms trager: wacht op het eind, hoogstens 4 s */
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.site-footer .hal-wm-voet use')).fill === 'rgb(61, 255, 176)', null, { timeout: 4000 }).catch(() => {});
  const vulVoet = await page.$eval('.site-footer .hal-wm-voet use', (e) => getComputedStyle(e).fill);
  ok('het tekstlogo in de voet (zwart, levering 100): geen venster; onder de muis mint', raamVoet === 'none' && vulVoet === 'rgb(61, 255, 176)', `${raamVoet} · ${vulVoet}`);
  ok('het grote woordmerk onderaan houdt zijn uitloop (geen venster, lijst 78 C4)', (await page.$$('.hal-wm-reus .mk-raam')).length === 0);
  /* met de toets erop */
  await page.mouse.move(700, 450);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
  await page.keyboard.press('Tab');
  let n2 = 0;
  await page.focus('.site-footer .footer-brand .brand'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  await page.waitForTimeout(900);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.site-footer .hal-wm-voet use')).fill === 'rgb(61, 255, 176)', null, { timeout: 4000 }).catch(() => {});
  const vulToets = await page.$eval('.site-footer .hal-wm-voet use', (e) => getComputedStyle(e).fill);
  ok('… en met de toets erop (focus-visible): mint (levering 100)', vulToets === 'rgb(61, 255, 176)', JSON.stringify({ fill: vulToets, focus: await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName) }));
  await ctx.close();
  const rustig = await open({ reducedMotion: 'reduce' });
  await rustig.page.goto(`${BASIS}/nl/pricing/`, { waitUntil: 'networkidle' });
  await rustig.page.hover('.site-footer .footer-brand .brand'); await rustig.page.waitForTimeout(60);
  ok('minder beweging: meteen mint, zonder overgang (levering 100)', (await rustig.page.$eval('.site-footer .hal-wm-voet use', (e) => [getComputedStyle(e).fill, getComputedStyle(e).transitionDuration])).join() === 'rgb(61, 255, 176),0s');
  await rustig.ctx.close();
}

ok('geen scriptfouten', fouten.length === 0, fouten.slice(0, 3).join(' | '));
await browser.close();
server.close();
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
