/*
 * VISUAILS — levering 86: het blauwe uur in de details (3 november 2026, lijst 72).
 *
 *   node tests/blauw-uur-86.test.mjs          (npm run test:blauwuur86; na de build: leest dist/)
 *
 * Lucas, 12:54: "Wellicht kan je wel een plan maken om deze blue hour style meer in details zoals knoppen te
 * verwerken en ik wil meer fade kleuren gebruiken voor kleine details waar mogelijk. Ook het logo wil ik witte
 * achtergrond met fade blue hour VISUAILS logo maken, om met het blauw door het wit te snijden."
 * Bij K2: "De gloed van onder mag bij alle knoppen weg, dit voelt generiek en ai achtig. Ik zou het beter
 * vinden bij deze specifieke knop om de gehele knop te vullen met blauw on hover."
 *
 * Deze toets houdt vast wat hij koos (lijst 72): logo a (de snede), schommel a (het licht schommelt),
 * favicon b (wit op de snede), de gloed weg bij alle knoppen, K1 – K4 en D1 – D8, ook in Studio, het portaal,
 * /admin, het account, de mail en de favicons. En de regel: alleen kleuren uit het schema, langs de snede
 * (126,87°), elke stop met wit 6,2 : 1 of meer. Daarna in de browser, op de echte pagina's: wat er in rust,
 * onder de muis en met de toets staat, gemeten in de pixels.
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

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (k) => { const [r, g, b] = typeof k === 'string' ? rgb(k) : k; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const SNEDE = ['#1A4279', '#25508B', '#2D61A8'];
const LICHT = ['#25508B', '#2D61A8', '#44699D'];

/* ── 1 · de regel: alleen kleuren uit het schema, gemeten ── */
console.log('\n1 · de regel');
const schema = lees('docs/KLEURENSCHEMA.md');
const hal = lees('src/styles/hal.css');
const blok = hal.slice(hal.indexOf('LEVERING 86 · BLAUW UUR IN DE DETAILS'));
ok('het blok van levering 86 staat onderaan hal.css', blok.length > 1000 && hal.lastIndexOf('LEVERING 86 · BLAUW UUR IN DE DETAILS') > hal.lastIndexOf('LEVERING 83'));
const kleuren = [...new Set((blok.replace(/\/\*[\s\S]*?\*\//g, '').match(/#[0-9A-Fa-f]{6}\b|%23[0-9A-Fa-f]{6}\b/g) || []).map((k) => k.replace('%23', '#').toUpperCase()))];
const inSchema = (k) => schema.toUpperCase().includes(k);
ok('elke kleur in het blok staat in docs/KLEURENSCHEMA.md', kleuren.length >= 10 && kleuren.every(inSchema), kleuren.filter((k) => !inSchema(k)).join(' '));
ok('de snede: wit op elke stop 6,2 : 1 of meer, en elke stop op wit', SNEDE.every((k) => contrast(k, '#FFFFFF') >= 6.2 && contrast(k, '#FBFCFF') >= 6.0), SNEDE.map((k) => contrast(k, '#FFFFFF').toFixed(2)).join(' · '));
ok('de schommel naar het licht: elke stop op wit 5,6 : 1 of meer (het logo blijft leesbaar)', LICHT.every((k) => contrast(k, '#FFFFFF') >= 5.55), LICHT.map((k) => contrast(k, '#FFFFFF').toFixed(2)).join(' · '));
ok('de witte knop vult zich met blauw licht en nevel: inkt erop 7 : 1 of meer', ['#80A7DD', '#A2B7D2'].every((k) => contrast(k, '#0F1217') >= 7), ['#80A7DD', '#A2B7D2'].map((k) => contrast(k, '#0F1217').toFixed(2)).join(' · '));
const hoeken = blok.match(/linear-gradient\((\d+(?:\.\d+)?)deg/g) || [];
ok('elke schuine fade loopt langs de snede (126,87°); verder alleen recht (90° of 180°)', hoeken.length >= 10 && hoeken.every((h) => /\((126\.87|90|180)deg/.test(h)), [...new Set(hoeken)].join(' '));
ok('geen fade in een kop of woord (geen background-clip: text)', !/background-clip:\s*text/.test(blok));

/* ── 2 · het logo, alleen herkleurd ── */
console.log('\n2 · het logo');
const lay = lees('src/layouts/Layout.astro');
const grad = (id) => (lay.match(new RegExp(`<linearGradient id="${id}"[^>]*>[\\s\\S]*?</linearGradient>`)) || [''])[0];
const stops = (g) => [...g.matchAll(/stop-color="(#[0-9A-F]{6})"/g)].map((m) => m[1]);
ok('de V in de snede en in het licht: in de maten van #markglyph, langs de snede (0,8 · 0,6 × 1049,55)', /x1="0" y1="0" x2="839\.64" y2="629\.73"/.test(grad('vs-v-snede')) && stops(grad('vs-v-snede')).join() === SNEDE.join() && stops(grad('vs-v-licht')).join() === LICHT.join());
ok('het woordmerk in de snede en in het licht: in de maten van #woordmerk (0 -797,25, 0,8 · 0,6 × 4209,29)', /x1="0" y1="-797\.25" x2="3367\.43" y2="1728\.32"/.test(grad('vs-w-snede')) && stops(grad('vs-w-snede')).join() === SNEDE.join() && stops(grad('vs-w-licht')).join() === LICHT.join());
ok('het grote woordmerk loopt het wit in (blauw uur → nevel), en schommelt een stap lichter', stops(grad('vs-w-uitloop')).join() === '#25508B,#6283AF,#A2B7D2' && stops(grad('vs-w-uitloop-licht')).join() === '#2D61A8,#829DC0,#B9C7DE' && /y1="-797\.25" x2="0" y2="16\.58"/.test(grad('vs-w-uitloop')));
const sym = (lay.match(/<symbol id="markglyph" viewBox=[\s\S]*?<\/symbol>/) || [''])[0];
ok('de paden van het V-merk zijn niet aangeraakt (geen fill in het symbool)', sym.includes('M 0.0 16.0 L 144.25 266.75 L 463.25 813.25') && !/fill=/.test(sym.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')));
const wmp = lees('src/data/wordmarkPath.js');
ok('Studio, het portaal, /admin en het account: het woordmerk draagt zijn eigen fades (vs-wi-)', /id="vs-wi-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-797\.25" x2="3367\.43" y2="1728\.32"/.test(wmp) && /id="vs-wi-licht"/.test(wmp) && /\$\{WM_FADES\}<path class="mk-fill"/.test(wmp));
const studio = lees('src/styles/studio-hal.css'), admin = lees('public/admin.css'), account = lees('public/account.css'), portal = lees('public/portal.css');
ok('… licht in de snede, op inkt blijft het licht (Studio on-ink, /admin donker, het account donker)',
  studio.includes('body.studio:not(.on-ink) .st-merk .mk-fill { fill: url(#vs-wi-snede); }') && admin.includes(':root:not([data-thema="donker"]) .mark .mk .mk-fill { fill: url(#vs-wi-snede); }')
  && account.includes('html[data-thema="licht"] .mark .mk .mk-fill { fill: url(#vs-wi-snede); }') && portal.includes('html body .mark .mk .mk-fill { fill: url(#vs-wi-snede); }'));
const vl = lees('src/components/Voorlader80.astro'), op = lees('src/components/HalOpening80.astro');
ok('D8 · het vlagje vult zich met de snede (laadscherm en de laptopvideo)', /<path d=\{VLAG\} fill="url\(#vl8-snede\)" clip-path="url\(#vl8-vlag\)" \/>/.test(vl) && /id="vl8-snede" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="839\.64" y2="629\.73"/.test(vl) && /<path fill="url\(#vs-v-snede\)" clip-path="url\(#o8-vlag\)"/.test(op));

/* ── 3 · de favicons en de mail ── */
console.log('\n3 · de favicons en de mail');
const fav = lees('public/favicon.svg');
ok('favicon.svg: wit op de snede (lijst 72, favicon b), van hoek tot hoek over de tegel', /<linearGradient id="snede" gradientUnits="userSpaceOnUse" x1="-3\.84" y1="5\.12" x2="67\.84" y2="58\.88">/.test(fav) && /<rect width="64" height="64" rx="16" ry="16" fill="url\(#snede\)"\/>/.test(fav) && /<path fill="#FBFCFF"/.test(fav));
const pix = async (f, x, y) => { const { data, info } = await sharp(path.join(ROOT, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const i = (Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
const dichtbij = (a, h, d = 14) => rgb(h).every((v, i) => Math.abs(v - a[i]) <= d);
{
  const lb = await pix('public/favicon-512.png', 0.22, 0.12), rb = await pix('public/favicon-512.png', 0.88, 0.8), ap = await pix('public/apple-touch-icon.png', 0.03, 0.03), ar = await pix('public/apple-touch-icon.png', 0.97, 0.97);
  ok('de favicons (16 – 512, apple-touch-icon): donker linksboven, het licht rechtsonder', dichtbij(lb, '#1E487F', 20) && dichtbij(rb, '#2B5CA0', 20) && dichtbij(ap, '#1A4279') && dichtbij(ar, '#2D61A8'), [lb, rb, ap, ar].map((p) => p.slice(0, 3).join(',')).join(' · '));
}
const mail = lees('scripts/make-mail-assets.mjs');
ok('de mail: het woordmerk op het witte plaatje in de snede, het streepje in de snede, het woordmerk in de voet loopt uit (nevel → mist)',
  /\$\{WM_SNEDE\}<path fill="url\(#s\)" fill-rule="evenodd"/.test(mail) && /<path fill="url\(#s\)" d="M0 0H\$\{SW\}/.test(mail) && /stop-color="#A2B7D2"\/><stop offset="\.55" stop-color="#C4CEE0"\/><stop offset="1" stop-color="#E4E7ED"/.test(mail));
{
  /* in het plaatje: de V links is donkerder blauw dan de S rechts (de snede), en geen inkt meer */
  const { data, info } = await sharp(path.join(ROOT, 'public/img/mail/woordmerk-plaat.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blauw = [];
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) { const i = (y * info.width + x) * 4; const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]; if (a > 250 && b > r + 50 && b - r < 140) blauw.push([x, r, g, b]); }
  const links = blauw.filter((p) => p[0] < info.width * 0.3), rechts = blauw.filter((p) => p[0] > info.width * 0.7);
  const gem = (l) => l.reduce((s, p) => s + p[3], 0) / l.length;
  ok('… in het plaatje gemeten: blauw van links (diep) naar rechts (licht)', links.length > 200 && rechts.length > 200 && gem(rechts) > gem(links) + 15, `${links.length} · ${rechts.length} · ${gem(links).toFixed(0)} → ${gem(rechts).toFixed(0)}`);
}

/* ── 3b · elk ander logo (Lucas, 15:04: "Fix ook alle logo's in de map met de nieuwe looks") ── */
console.log('\n3b · elk ander logo');
{
  const og = await pix('public/img/og-nl.png', 0.06, 0.115), ogR = await pix('public/img/og-nl.png', 0.165, 0.115);
  const tegel = [await pix('public/img/merk-tegel.webp', 0.02, 0.02), await pix('public/img/merk-tegel.webp', 0.98, 0.98)];
  const mark = await pix('public/img/logo-mark.webp', 0.5, 0.5);
  ok('het deelplaatje: het woordmerk linksboven in de snede', [og, ogR].some((p) => p[2] > p[0] + 40) && !rgb('#0F1217').every((v, i) => Math.abs(v - og[i]) < 10), `${og} · ${ogR}`);
  ok('de V-tegel (avatar): wit op de snede, donker linksboven en licht rechtsonder', dichtbij(tegel[0], '#1A4279', 16) && dichtbij(tegel[1], '#2D61A8', 16), tegel.join(' · '));
  ok('de oude ongebruikte logobeelden zijn het huidige logo geworden (logo-mark: wit met de V in de snede)', mark[2] > mark[0] + 40 || dichtbij(mark, '#FBFCFF', 6), String(mark));
  ok('de fotogids en het deelplaatje: het woordmerk in de snede in hun script', /id="vs-fg-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-797\.25" x2="3367\.43" y2="1728\.32"/.test(lees('scripts/lib/fotogids-html.mjs')) && /x1="0" y1="-797\.25" x2="3367\.43" y2="1728\.32"/.test(lees('scripts/make-og.mjs')));
  const fac = lees('src/lib/invoicePdf.js');
  ok('de factuur: het woordmerk als knipvlak met één axiaal verloop (ShadingType 2), langs de snede', /function svgSnede\(/.test(fac) && /ShadingType: 2/.test(fac) && (fac.match(/sheet\.svgSnede\(WOORDMERK_D/g) || []).length === 2 && !/sheet\.svg\(WOORDMERK_D/.test(fac));
}

/* ── 3c · de posters in de letters en regels van de site (Lucas, 4 november 01:22: "Posters moeten ook gebruik
   maken van de nieuwe lettertypes en ontwerp rules.") ── */
console.log('\n3c · het deelplaatje en de fotogids in de letters van de site');
{
  const og = lees('scripts/make-og.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('het deelplaatje: VISUAILS Display, DM Sans en IBM Plex Mono uit public/fonts, geen Urbanist meer',
    /public\/fonts\/visuails-display\/VISUAILSDisplay-Bold\.woff2/.test(og) && /public\/fonts\/dm-sans\/dm-sans-latin\.woff2/.test(og) && /public\/fonts\/ibm-plex-mono\/IBMPlexMono-600\.woff2/.test(og) && !/urbanist/i.test(og));
  ok('  de kop zoals elke kop in hoofdletters op de site (-0,01 em, 0,92), het etiket als sectielabel, 40 px tussen kop en foto',
    /text-transform: uppercase; letter-spacing: -\.01em;/.test(og) && /\/\.92 'VISUAILS Display'/.test(og) && /\.foot \{[^\n]*IBM Plex Mono[^\n]*letter-spacing: \.1em; text-transform: uppercase;/.test(og) && /NAAST = 40/.test(og));
  const hl = lees('scripts/handleiding.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('de fotogids: dezelfde drie letters uit public/fonts, geen Urbanist meer',
    ['VISUAILS Display', 'DM Sans', 'IBM Plex Mono'].every((f) => hl.includes(`['${f}', 'public/fonts/`)) && !/urbanist/i.test(hl));
  const fg = lees('scripts/lib/fotogids-html.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('  koppen in VISUAILS Display in hoofdletters, het etiket als sectielabel (streep in de snede, mono)',
    /h1, h2 \{ font-family: var\(--kop\); font-weight: 700; text-transform: uppercase; letter-spacing: -\.01em; line-height: \.92;/.test(fg) && /\.etiket \{[^}]*font-family: var\(--mono\)[^}]*letter-spacing: \.1em; text-transform: uppercase;/.test(fg) && /id="vs-fg-streep"/.test(fg));
  /* levering 87 (lijst 74, knop pil): het statusplaatje is een pil zonder stip, zoals op de site */
  ok('  geen stip en geen bolletje meer; Nodig en Optioneel als pil (levering 87), het vinkje uit de kit',
    !/pil-kop|border-radius: 99mm|border-radius: 50%/.test(fg) && /\.label \{[^}]*border-radius: 999px;/.test(fg) && /IKOON\.vink/.test(fg));
  ok('  de hoekregel: kaarten 24, de brede vlakken 32, het inktblok uit de nacht met zijn snede rechtsonder',
    /--r-kaart: 24px; --r-vlak: 32px;/.test(fg) && /--nacht: #0F1217 linear-gradient\(126\.87deg, #0F1217 0%, #0F1217 38%, #172945 72%, #1A4279 100%\);/.test(fg)
    && /clip-path: polygon\(0 0, 100% 0, 100% calc\(100% - 40px\), calc\(100% - 30px\) 100%, 0 100%\);/.test(fg));
}

/* ── 4 · de knoppen, in de bron ── */
console.log('\n4 · de knoppen');
ok('de gloed weg bij alle knoppen (h-knop::before), ook de schaduw onder Bestellen', /html body\.hal \.h-knop::before \{ content: none; display: none; \}/.test(blok) && /\.nav-cta[^{]*\{\n  background: #1A4279 linear-gradient[^}]*box-shadow: none !important;/.test(blok));
ok('K2 · de inktknop: nacht in rust, onder de muis en met de toets de snede, langs de snede geschoven', /html body\.hal \.h-knop-inkt \{\n  background: #0F1217 linear-gradient\(126\.87deg, #0F1217 0%, #172945 17\.5%, #1A4279 50%, #25508B 77\.5%, #2D61A8 100%\) -2px -2px \/ calc\(200% \+ 4px\) calc\(200% \+ 4px\) no-repeat;/.test(blok)
  && /html body\.hal \.h-knop-inkt:hover, html body\.hal \.h-knop-inkt:focus-visible \{\n  background: #0F1217 linear-gradient\([^)]*\) calc\(100% \+ 2px\) calc\(100% \+ 2px\)/.test(blok));
ok('K1 · Bestellen in de snede; onder de muis schuift het licht door de knop', /#1A4279 0%, #25508B 27\.5%, #2D61A8 50%, #25508B 72\.5%, #1A4279 100%\) -2px -2px/.test(blok) && /\.container\.nav \.nav-cta:focus-visible/.test(blok));
ok('K3 · de lijnknop: onder de muis een ring van 1 px in de snede (masker), op het inktblok niet', /\.h-knop-lijn::after \{ content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px;/.test(blok) && /mask: linear-gradient\(#000 0 0\) content-box exclude, linear-gradient\(#000 0 0\);/.test(blok) && /\.h-lk-slot \.h-knop-lijn::after, html body\.hal \.h-proef \.h-knop-lijn::after \{ content: none; \}/.test(blok));
const paar = lees('src/scripts/knoppaar.js');
ok('K4 · de kier: het script zet de lucht alleen in de strook van de kier, niet op inkt of bij een witte knop', /const LUCHT = 'linear-gradient\(180deg, #25508B 0%, #2D61A8 100%\)';/.test(paar) && /rij\.closest\('\.h-lk-slot, \.h-proef-woord'\)/.test(paar) && /h-knop-wit'\) \|\| k\.classList\.contains\('h-knop-lijnwit'\)/.test(paar) && /ra\.right - rr\.left - rij\.clientLeft - snede - 1/.test(paar) && !/addEventListener\('resize'/.test(paar));
ok('D3 · de focusrand van een knop in de snede (2 px, 2 px buiten de knop); hoog contrast de gewone rand', /\.h-knop:focus-visible \{ outline: 2px solid transparent; outline-offset: 2px; \}/.test(blok) && /\.h-knop:focus-visible::after \{ content: ""; position: absolute; inset: -4px;/.test(blok) && /@media \(forced-colors: active\) \{\n  html body\.hal \.h-knop:focus-visible \{ outline: 2px solid CanvasText; \}/.test(blok));
ok('minder beweging: geen overgang op de knoppen, kaarten en Bestellen', /@media \(prefers-reduced-motion: reduce\) \{\n  html body\.hal \.h-knop-inkt, html body\.hal \.h-knop-wit, html body\.hal \.h-knop-lijn::after,/.test(blok));

/* ── 5 · in de browser ── */
console.log('\n5 · in de browser');
const DIST = path.join(ROOT, 'dist');
if (!fs.existsSync(path.join(DIST, 'nl', 'index.html'))) { ok('dist/nl/index.html bestaat (eerst de build)', false); process.exit(1); }
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
const browser = await chromium.launch({ executablePath: browserPad() });
async function open(pad, { breed = 1440, hoog = 900, stil = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, reducedMotion: stil ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 200)));
  await page.goto(BASIS + pad, { waitUntil: 'load' });
  await page.evaluate(() => { document.documentElement.classList.remove('vl8-aan'); document.getElementById('vl8')?.remove(); document.querySelector('.cookie-kaart, [data-cookie]')?.remove(); });
  await page.waitForTimeout(400);
  return { ctx, page, fouten };
}
/* een pixel van een element in een schermafdruk (1×), in css-pixels binnen het element */
async function pixel(page, sel, fx, fy) {
  const r = await page.locator(sel).first().boundingBox();
  const buf = await page.screenshot({ clip: { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) } });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const x = Math.min(info.width - 1, Math.max(0, Math.round(fx * (info.width - 1)))), y = Math.min(info.height - 1, Math.max(0, Math.round(fy * (info.height - 1))));
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
}
const isBlauw = (p) => p[2] > p[0] + 40 && p[2] > 90;
/* het blauwste pixel in een strookje rond (x, y), 1×: een rand van 1 px valt zelden precies op een pixel */
async function blauwste(page, x, y, w = 1, h = 6) {
  const buf = await page.screenshot({ clip: { x: Math.floor(x - w / 2), y: Math.floor(y - h / 2), width: Math.max(1, w), height: Math.max(1, h) } });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let best = [255, 255, 255];
  for (let i = 0; i < info.width * info.height; i++) { const q = [data[i * info.channels], data[i * info.channels + 1], data[i * info.channels + 2]]; if (q[2] - q[0] > best[2] - best[0]) best = q; }
  return best;
}
try {
  {
    const { ctx, page, fouten } = await open('/nl/');
    const logo = await page.evaluate(() => { const v = document.querySelector('.site-header .hal-vm-balk'); const f = v.querySelector('.mk-fill'), k = v.querySelector('.mk-kleur'); return [getComputedStyle(f).fill, getComputedStyle(k).fill]; });
    ok('het V-merk in de balk: in de snede, de schommel naar het licht', logo[0] === 'url("#vs-v-snede")' && logo[1] === 'url("#vs-v-licht")', logo.join(' · '));
    const p1 = await pixel(page, '.site-header .hal-vm-balk', 0.12, 0.08), p2 = await pixel(page, '.site-header .hal-vm-balk', 0.954, 0.246);
    ok('… gemeten: blauw, en het vlagje rechtsboven lichter dan de V linksboven', isBlauw(p1) && isBlauw(p2) && lum(p2) > lum(p1), `${p1} → ${p2}`);
    const voet = await page.evaluate(() => [getComputedStyle(document.querySelector('.site-footer .hal-wm-voet .mk-fill')).fill, getComputedStyle(document.querySelector('.hal-wm-reus .mk-fill')).fill]);
    ok('het woordmerk in de voet in de snede, het grote woordmerk loopt het wit in (D7)', voet[0] === 'url("#vs-w-snede")' && voet[1] === 'url("#vs-w-uitloop")', voet.join(' · '));
    const gloed = await page.evaluate(() => [...document.querySelectorAll('.h-knop')].filter((k) => getComputedStyle(k, '::before').content !== 'none').length);
    ok('geen gloed onder een knop (::before is weg)', gloed === 0, String(gloed));

    /* K2: de inktknop */
    const K = '.o8-acties .h-knop-inkt';
    await page.locator(K).scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    /* levering 87: de knop is een pil, dus de hoeken van zijn vak liggen erbuiten; meet binnen de ronde uiteinden */
    const rust = [await pixel(page, K, 0.05, 0.5), await pixel(page, K, 0.9, 0.62)];
    /* levering 87: als pil valt de hoek linksboven weg; het donkerste zichtbare punt is het linker uiteinde (#172945 op 17,5 %) */
    ok('K2 · in rust de nacht: inkt links, blauw rechtsonder', dichtbij(rust[0], '#0F1217', 28) && isBlauw(rust[1]) && rust[1][2] < 140, rust.join(' · '));
    await page.hover(K); await page.waitForTimeout(700);
    const muis = [await pixel(page, K, 0.15, 0.2), await pixel(page, K, 0.5, 0.15), await pixel(page, K, 0.995, 0.5), await pixel(page, K, 0.5, 0.995)];
    ok('… onder de muis helemaal blauw (de snede), ook aan het linker uiteinde', muis.every(isBlauw) && lum(muis[0]) < lum(muis[1]), muis.join(' · '));
    ok('… en geen haarlijn inkt aan de rechter- of onderrand', muis.slice(2).every((p) => !dichtbij(p, '#0F1217', 12)), muis.slice(2).join(' · '));
    const wit = await page.evaluate((k) => { const c = getComputedStyle(document.querySelector(k)); return c.color; }, K);
    ok('… de letters blijven wit (6,2 : 1 of meer op elke stop)', wit === 'rgb(255, 255, 255)', wit);

    /* K1: Bestellen */
    const C = '.site-header .nav-cta';
    await page.mouse.move(5, 600); await page.waitForTimeout(700);
    const c1 = [await pixel(page, C, 0.14, 0.5), await pixel(page, C, 0.86, 0.5)];
    await page.hover(C); await page.waitForTimeout(800);
    const c2 = [await pixel(page, C, 0.14, 0.5), await pixel(page, C, 0.86, 0.5)];
    ok('K1 · Bestellen: in rust diep links, het licht rechts; onder de muis schuift het licht naar links', c1.every(isBlauw) && c2.every(isBlauw) && lum(c1[1]) > lum(c1[0]) && lum(c2[0]) > lum(c2[1]), `${c1.join(' · ')} → ${c2.join(' · ')}`);
    const schaduw = await page.evaluate((c) => getComputedStyle(document.querySelector(c)).boxShadow, C);
    ok('… zonder gloed eronder', schaduw === 'none', schaduw);

    /* D3: de focusrand */
    await page.mouse.move(5, 600);
    await page.keyboard.press('Tab');
    await page.evaluate((k) => document.querySelector(k).focus(), K);
    await page.waitForTimeout(500);
    const ring = await page.evaluate((k) => { const e = document.querySelector(k); const a = getComputedStyle(e, '::after'); return { fv: e.matches(':focus-visible'), inhoud: a.content, inset: a.top, bg: a.backgroundImage.slice(0, 40), outline: getComputedStyle(e).outlineColor }; }, K);
    ok('D3 · met de toets: een rand in de snede 2 px buiten de knop, geen blauwe outline', ring.fv && ring.inhoud === '""' && ring.inset === '-4px' && ring.bg.startsWith('linear-gradient(126.87deg') && ring.outline === 'rgba(0, 0, 0, 0)', JSON.stringify(ring));
    const r = await page.locator(K).boundingBox();
    const buf = await page.screenshot({ clip: { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 } });
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    /* het rechte stuk van de rand (de knop is een pil: de uiteinden buigen naar beneden) */
    const eind = Math.round(info.width * r.height / 2 / (r.width + 12)) + 16;
    const rand = []; for (let x = eind; x < info.width - eind; x += 7) { const i = (3 * info.width + x) * info.channels; rand.push([data[i], data[i + 1], data[i + 2]]); }
    ok('… gemeten: de rand boven de knop is blauw, van donker naar licht', rand.filter(isBlauw).length >= rand.length * 0.8 && lum(rand[rand.length - 1]) > lum(rand[0]), `${rand[0]} → ${rand[rand.length - 1]}`);

    /* D6: het inktblok */
    const proef = await page.evaluate(() => getComputedStyle(document.querySelector('.h-proef > .h-proef-woord')).backgroundImage);
    ok('D6 · het inktblok uit de nacht: inkt, en naar de snede rechtsonder blauw diep', /linear-gradient\(126\.87deg, rgb\(15, 18, 23\) 0%, rgb\(15, 18, 23\) 38%, rgb\(23, 41, 69\) 72%, rgb\(26, 66, 121\) 100%\)/.test(proef), proef.slice(0, 120));
    const tekst = await page.evaluate(() => { const blok = document.querySelector('.h-proef > .h-proef-woord'); const br = blok.getBoundingClientRect(); return [...blok.querySelectorAll('p, h1, h2, span, a')].filter((e) => e.textContent.trim() && e.getBoundingClientRect().width).map((e) => { const g = document.createRange(); g.selectNodeContents(e); const r = g.getBoundingClientRect(); return { x: (r.right - br.left) / br.width, y: (r.bottom - br.top) / br.height, kleur: getComputedStyle(e).color }; }); });  /* de tekst zelf, niet zijn vak: sinds levering 87 loopt het vak van een korte zin tot de rand (h-1r) */
    /* het lichtste punt onder tekst: de rechteronderhoek van het verste tekstvak, op de fade */
    const t = Math.max(...tekst.filter((e) => /255, 255, 255/.test(e.kleur)).map((e) => { const b = 0.8 * e.x + 0.6 * e.y; return b / 1.4; }));
    const meng = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    const kleurOp = (tt) => tt <= 0.38 ? rgb('#0F1217') : tt <= 0.72 ? meng(rgb('#0F1217'), rgb('#172945'), (tt - 0.38) / 0.34) : meng(rgb('#172945'), rgb('#1A4279'), (tt - 0.72) / 0.28);
    const wit86 = meng(kleurOp(t), [255, 255, 255], 0.86);
    /* levering 87: een korte zin staat nu op één regel (Lucas, 03:23) en loopt in het inktblok verder de fade in;
       de eis gaat van 10 : 1 naar AAA (7 : 1), ruim boven de huisregel van 4,5 */
    ok('… de tekst staat waar het donker is: wit op 86 % haalt daar 7 : 1 of meer (AAA)', contrast(wit86, kleurOp(t)) >= 7, `${(t * 100).toFixed(0)} % van de fade · ${contrast(wit86, kleurOp(t)).toFixed(2)}`);
    ok('… zonder fouten op de voorpagina', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  /* K3, K4 en D2 op /catalog en /how-it-works */
  {
    const { ctx, page, fouten } = await open('/nl/catalog/');
    const rij = '.h-acties[data-h-kier]';
    const n = await page.locator(rij).count();
    ok('K4 · een knoppenpaar op wit krijgt de lucht in zijn kier (data-h-kier)', n >= 1, String(n));
    if (n) {
      await page.locator(rij).first().scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
      const kier = await page.evaluate((s) => { const r = document.querySelector(s); const [a, b] = [...r.children].filter((k) => k.classList.contains('h-knop')); const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); const sn = parseFloat(getComputedStyle(a).getPropertyValue('--h-snede')), k = parseFloat(getComputedStyle(a).getPropertyValue('--h-kier')); const x = (dy) => ra.right - (sn / ra.height) * dy + k / 2; return { boven: [x(4), ra.top + 4], onder: [x(ra.height - 4), ra.bottom - 4], achter: [rb.right + 20, rb.top + rb.height / 2], bg: r.style.backgroundImage }; }, rij);
      const shot = async ([x, y]) => { const b2 = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } }); const { data: d } = await sharp(b2).raw().toBuffer({ resolveWithObject: true }); return [d[0], d[1], d[2]]; };
      const [kb, ko, ka] = [await shot(kier.boven), await shot(kier.onder), await shot(kier.achter)];
      ok('… gemeten: in de kier blauw, bovenaan blauw uur en onderaan lichter', isBlauw(kb) && isBlauw(ko) && lum(ko) > lum(kb), `${kb} → ${ko}`);
      ok('… en niet buiten de kier (naast het paar staat de grond)', !isBlauw(ka) && lum(ka) > 0.8, String(ka));
      /* K3: de lijnknop onder de muis */
      const L = `${rij} > .h-knop-lijn`;
      const voor = await page.evaluate((s) => getComputedStyle(document.querySelector(s), '::after').opacity, L);
      await page.hover(L); await page.waitForTimeout(600);
      const na = await page.evaluate((s) => getComputedStyle(document.querySelector(s), '::after').opacity, L);
      const lr = await page.locator(L).first().boundingBox();
      const rr = await blauwste(page, lr.x + lr.width * 0.6, lr.y + 0.5, 1, 4);
      ok('K3 · de lijnknop: onder de muis wordt de haarlijn de snede', voor === '0' && na === '1' && isBlauw(rr), `${voor} → ${na} · ${rr}`);
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
    const tel = await page.evaluate(() => [...document.querySelectorAll('.h-acties')].filter((r) => 'hKier' in r.dataset).every((r) => r.classList.contains('h-passen') || getComputedStyle(r.querySelector('.h-knop')).clipPath !== 'none'));
    ok('… op de telefoon alleen waar de knoppen nog één vorm zijn', tel);
    ok('… zonder fouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/catalog/classic/');
    const slot = await page.evaluate(() => { const s = document.querySelector('.h-lk-slot'); const r = s.querySelector('.h-acties'); return { bg: getComputedStyle(s).backgroundImage.slice(0, 30), kier: 'hKier' in r.dataset, svc: getComputedStyle(s.querySelector('.svcsw-a')).backgroundImage }; });
    ok('D6 · het slot onderaan uit de nacht; K4 niet op het inktblok; de links daar wit', slot.bg.startsWith('linear-gradient(126.87deg') && !slot.kier && /255, 255, 255/.test(slot.svc), JSON.stringify(slot).slice(0, 220));
    const K = '.h-lk-slot .h-knop-inkt';
    await page.locator(K).scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
    const a = await pixel(page, K, 0.15, 0.2);
    await page.hover(K); await page.waitForTimeout(700);
    const b = await pixel(page, K, 0.15, 0.2), kl = await page.evaluate((k) => getComputedStyle(document.querySelector(k)).color, K);
    ok('de witte knop op het inktblok vult zich met blauw licht, de letters blijven inkt', dichtbij(a, '#FFFFFF', 4) && isBlauw(b) && b[0] > 110 && kl === 'rgb(15, 18, 23)', `${a} → ${b} · ${kl}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/how-it-works/');
    /* D1: de streep van het sectielabel */
    const pil = await page.evaluate(() => { const p = [...document.querySelectorAll('p.h-pil')].find((e) => !e.closest('.h-lk-slot, .h-proef') && !e.classList.contains('h-pil-donker')); const d = document.querySelector('p.h-pil-donker'); return [getComputedStyle(p, '::before').backgroundImage, d ? getComputedStyle(d, '::before').backgroundImage : 'geen']; });
    ok('D1 · de streep van het sectielabel in de snede; op het inktblok en een donkere band wit', /linearGradient/.test(pil[0]) && /%231A4279/.test(pil[0]) && (pil[1] === 'geen' || /%23FFFFFF/.test(pil[1])), pil.map((p) => p.slice(60, 140)).join(' | '));

    const L = '.h-hw-details a';
    const d2 = await page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return [c.textDecorationLine, c.backgroundImage, c.backgroundSize]; }, L);
    ok('D2 · een link in de tekst: geen streep van de browser, maar 2 px die het wit in loopt', d2[0] === 'none' && /linear-gradient\(90deg, rgb\(37, 80, 139\), rgba\(37, 80, 139, 0\.5\) 45%, rgba\(37, 80, 139, 0\)\)/.test(d2[1]) && d2[2] === '100% 2px', d2.join(' · '));
    await page.hover(L); await page.waitForTimeout(200);
    const vol = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundImage, L);
    ok('… onder de muis vol', vol === 'linear-gradient(90deg, rgb(37, 80, 139), rgb(37, 80, 139))', vol);
    const K = '.h-hw-dienst';
    const k0 = await page.evaluate((s) => getComputedStyle(document.querySelector(s), '::after').opacity, K);
    await page.hover(K); await page.waitForTimeout(600);
    const k1 = await page.evaluate((s) => getComputedStyle(document.querySelector(s), '::after').opacity, K);
    const kr = await page.locator(K).first().boundingBox();
    const rk = await blauwste(page, kr.x + kr.width * 0.25, kr.y + 0.5, 1, 4);
    ok('D5 · een kaart onder de muis: de haarlijn vangt het licht vanuit de hoek linksboven', k0 === '0' && k1 === '1' && isBlauw(rk), `${k0} → ${k1} · ${rk}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/lifestyle/');
    const d4 = await page.evaluate(() => { const i = document.querySelector('.h-lijntje i'); return i ? getComputedStyle(i).backgroundImage : 'geen'; });
    ok('D4 · het balkje met de schuine kop: van blauw diep naar het licht', /linear-gradient\(90deg, rgb\(26, 66, 121\) 0%, rgb\(37, 80, 139\) 60%, rgb\(45, 97, 168\) 100%\)/.test(d4), d4.slice(0, 100));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/', { stil: true });
    const t = await page.evaluate(() => [getComputedStyle(document.querySelector('.h-knop-inkt')).transitionDuration, getComputedStyle(document.querySelector('.site-header .nav-cta')).transitionDuration]);
    ok('minder beweging: de knop vult en het licht schuift zonder overgang', t.every((d) => d.split(',').every((x) => parseFloat(x) === 0)), t.join(' · '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${goed} van ${goed + fout} goed`);
if (fout) process.exit(1);
