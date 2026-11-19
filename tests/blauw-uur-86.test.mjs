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
import { WOORDMERK, WOORDMERK_SNEDE as WS, WOORDMERK_UITLOOP as WU } from '../src/data/woordmerk.js';
import { woordmerkSvg } from '../src/data/wordmarkPath.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (k) => { const [r, g, b] = typeof k === 'string' ? rgb(k) : k; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const SNEDE = ['#023D29', '#016645', '#11976A'];
const LICHT = ['#016645', '#11976A', '#44699D'];

/* ── 1 · de regel: alleen kleuren uit het schema, gemeten ── */
console.log('\n1 · de regel');
const schema = lees('docs/KLEURENSCHEMA.md');
const hal = lees('src/styles/hal.css');
const blok = hal.slice(hal.indexOf('LEVERING 86 · BLAUW UUR IN DE DETAILS'));
ok('het blok van levering 86 staat onderaan hal.css', blok.length > 1000 && hal.lastIndexOf('LEVERING 86 · BLAUW UUR IN DE DETAILS') > hal.lastIndexOf('LEVERING 83'));
const kleuren = [...new Set((blok.replace(/\/\*[\s\S]*?\*\//g, '').match(/#[0-9A-Fa-f]{6}\b|%23[0-9A-Fa-f]{6}\b/g) || []).map((k) => k.replace('%23', '#').toUpperCase()))];
const inSchema = (k) => schema.toUpperCase().includes(k);
ok('elke kleur in het blok staat in docs/KLEURENSCHEMA.md', kleuren.length >= 10 && kleuren.every(inSchema), kleuren.filter((k) => !inSchema(k)).join(' '));
/* levering 100: de snede is mint 800 → 700 → 600 (pakket 100); wit staat er niet meer op (het favicon en de tegel hebben de V
   wit op het veld). VERVALLEN: wit op elke stop 6,2 : 1. Nu: als logo op wit haalt elke stop 3 : 1 of meer. */
ok('de snede (levering 100): elke stop op wit 3 : 1 of meer (een logo)', SNEDE.every((k) => contrast(k, '#FFFFFF') >= 3), SNEDE.map((k) => contrast(k, '#FFFFFF').toFixed(2)).join(' · '));
ok('de schommel naar het licht (levering 100): elke stop op wit 3 : 1 of meer (het logo blijft leesbaar)', LICHT.every((k) => contrast(k, '#FFFFFF') >= 3), LICHT.map((k) => contrast(k, '#FFFFFF').toFixed(2)).join(' · '));
ok('de witte knop vult zich met blauw licht en nevel: inkt erop 7 : 1 of meer', ['#3DFFB0', '#A2B7D2'].every((k) => contrast(k, '#090D0B') >= 7), ['#3DFFB0', '#A2B7D2'].map((k) => contrast(k, '#090D0B').toFixed(2)).join(' · '));
const hoeken = blok.match(/linear-gradient\((\d+(?:\.\d+)?)deg/g) || [];
ok('elke schuine fade loopt langs de snede (126,87°); verder alleen recht (90° of 180°)', hoeken.length >= 10 && hoeken.every((h) => /\((126\.87|90|180)deg/.test(h)), [...new Set(hoeken)].join(' '));
ok('geen fade in een kop of woord (geen background-clip: text)', !/background-clip:\s*text/.test(blok));

/* ── 2 · het logo, alleen herkleurd ── */
console.log('\n2 · het logo');
const lay = lees('src/layouts/Layout.astro');
const grad = (id) => (lay.match(new RegExp(`<linearGradient id="${id}"[^>]*>[\\s\\S]*?</linearGradient>`)) || [''])[0];
const stops = (g) => [...g.matchAll(/stop-color="(#[0-9A-F]{6})"/g)].map((m) => m[1]);
ok('de V in de snede en in het licht: in de maten van #markglyph, langs de snede (0,8 · 0,6 × 1049,55)', /x1="0" y1="0" x2="839\.64" y2="629\.73"/.test(grad('vs-v-snede')) && stops(grad('vs-v-snede')).join() === SNEDE.join() && stops(grad('vs-v-licht')).join() === LICHT.join());
/* levering 89: het tekstlogo K5 (viewBox 0 −712 3763,74 724); de getallen komen uit src/data/woordmerk.js, en in de pagina
   staan ze zo (gemeten in dist) */
const L_SN = 0.8 * WOORDMERK.breed + 0.6 * WOORDMERK.hoog;
const dist = fs.existsSync(path.join(ROOT, 'dist/nl/index.html')) ? fs.readFileSync(path.join(ROOT, 'dist/nl/index.html'), 'utf8') : '';
ok('het tekstlogo (K5) in de snede en in het licht: in de maten van #woordmerk (0 −712, 0,8 · 0,6 × 3445,39), uit woordmerk.js',
  WS.x1 === 0 && WS.y1 === -712 && Math.abs(WS.x2 - 0.8 * L_SN) < 0.01 && Math.abs(WS.y2 - (-712 + 0.6 * L_SN)) < 0.01
  && /<linearGradient id="vs-w-snede" gradientUnits="userSpaceOnUse" x1=\{WS\.x1\} y1=\{WS\.y1\} x2=\{WS\.x2\} y2=\{WS\.y2\}>/.test(lay)
  && dist.includes(`id="vs-w-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-712" x2="${WS.x2}" y2="${WS.y2}"`)
  && stops(grad('vs-w-snede')).join() === SNEDE.join() && stops(grad('vs-w-licht')).join() === LICHT.join());
ok('het grote woordmerk loopt het wit in (blauw uur → nevel), en schommelt een stap lichter', stops(grad('vs-w-uitloop')).join() === '#016645,#6283AF,#A2B7D2' && stops(grad('vs-w-uitloop-licht')).join() === '#11976A,#829DC0,#B9C7DE'
  && WU.y1 === -712 && WU.y2 === 12 && dist.includes('id="vs-w-uitloop" gradientUnits="userSpaceOnUse" x1="0" y1="-712" x2="0" y2="12"'));
const sym = (lay.match(/<symbol id="markglyph" viewBox=[\s\S]*?<\/symbol>/) || [''])[0];
ok('de paden van het V-merk zijn niet aangeraakt (geen fill in het symbool)', sym.includes('M 0.0 16.0 L 144.25 266.75 L 463.25 813.25') && !/fill=/.test(sym.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')));
const wmp = lees('src/data/wordmarkPath.js');
ok('Studio, het portaal, /admin en het account: het woordmerk draagt zijn eigen fades (vs-wi-), in de maten van K5', woordmerkSvg('x').includes(`id="vs-wi-snede" gradientUnits="userSpaceOnUse" x1="0" y1="-712" x2="${WS.x2}" y2="${WS.y2}"`) && /id="vs-wi-licht"/.test(wmp) && /\$\{WM_FADES\}<path class="mk-fill"/.test(wmp));
const studio = lees('src/styles/studio-hal.css'), admin = lees('public/admin.css'), account = lees('public/account.css'), portal = lees('public/portal.css');
ok('… licht in de snede, op inkt blijft het licht (Studio on-ink, /admin donker, het account donker)',
  studio.includes('body.studio:not(.on-ink) .st-merk .mk-fill { fill: url(#vs-wi-snede); }') && admin.includes(':root:not([data-thema="donker"]) .mark .mk .mk-fill { fill: url(#vs-wi-snede); }')
  && account.includes('html[data-thema="licht"] .mark .mk .mk-fill { fill: url(#vs-wi-snede); }') && portal.includes('html body .mark .mk .mk-fill { fill: url(#vs-wi-snede); }'));
const vl = lees('src/components/Voorlader80.astro'), op = lees('src/components/HalOpening80.astro');
ok('D8 · het vlagje vult zich met de snede (laadscherm en de laptopvideo)', /<path d=\{VLAG\} fill="url\(#vl8-snede\)" clip-path="url\(#vl8-vlag\)" \/>/.test(vl) && /id="vl8-snede" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="839\.64" y2="629\.73"/.test(vl) && /<path fill="url\(#vs-v-snede\)" clip-path="url\(#o8-vlag\)"/.test(op));

/* ── 3 · de favicons en de mail ── */
console.log('\n3 · de favicons en de mail');
const fav = lees('public/favicon.svg');
/* levering 89 (lijst 81, favicon c): een vierkante tegel met een veld (het omhulsel heeft korrel, de V niet; Lucas, 08:20:
   "Favicon logo krijgt geen korrel alleen het omhulsel"), de V wit en precies V_D */
/* levering 100: het favicon uit pakket 100 (vorm c: het veld grof en fijn, de witte V erop, geen korrel op de V) */
ok('favicon.svg (pakket 100): het veld grof en fijn en de witte V erop, de V als laatste', /<image class="grof"[^>]*href="data:image\/png;base64,/.test(fav) && /<image class="fijn"[^>]*href="data:image\/(webp|png);base64,/.test(fav) && /fill="#FFFFFF"/i.test(fav) && fav.lastIndexOf('<path') > fav.lastIndexOf('<image'));
const pix = async (f, x, y) => { const { data, info } = await sharp(path.join(ROOT, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const i = (Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
const dichtbij = (a, h, d = 14) => rgb(h).every((v, i) => Math.abs(v - a[i]) <= d);
{
  const hoek = await pix('public/favicon-512.png', 0, 0), lb = await pix('public/favicon-512.png', 0.22, 0.12), v = await pix('public/favicon-512.png', 0.5, 0.5), ap = await pix('public/apple-touch-icon.png', 0.03, 0.03), ar = await pix('public/apple-touch-icon.png', 0.97, 0.97);
  /* levering 100: het veld is zwart en groen (was blauw): donker linksboven, groen boven rood */
  ok('de favicons (16 – 512, apple-touch-icon): vierkant (de hoek is dicht), donker en groen linksboven, de V wit', hoek[3] === 255 && lb[1] >= lb[0] + 15 && lb[0] < 60 && dichtbij(v, '#FFFFFF', 8) && ap[1] >= ap[0] + 15 && ar[3] === 255,
    [hoek, lb, v, ap, ar].map((p) => p.join(',')).join(' · '));
  ok('… alle maten van het pakket (16, 32, 48, 192, 512, ico, apple-touch-icon)', ['favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'favicon-192.png', 'favicon-512.png', 'favicon.ico', 'apple-touch-icon.png'].every((f) => fs.existsSync(path.join(ROOT, 'public', f))));
}
const mail = lees('scripts/make-mail-assets.mjs');
ok('de mail: het woordmerk op het witte plaatje in de snede, het streepje in de snede, het woordmerk in de voet loopt uit (grijs, levering 111)',
  /\$\{WM_SNEDE\}<path fill="url\(#s\)" fill-rule="evenodd"/.test(mail) && /<path fill="url\(#s\)" d="M0 0H\$\{SW\}/.test(mail) && /stop-color="#C6CAC8"\/><stop offset="\.55" stop-color="#DADDDB"\/><stop offset="1" stop-color="#EEF0EF"/.test(mail));   /* levering 111: de grijzen van de site */
{
  /* in het plaatje: de V links is donkerder blauw dan de S rechts (de snede), en geen inkt meer */
  const { data, info } = await sharp(path.join(ROOT, 'public/img/mail/woordmerk-plaat.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blauw = [];
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) { const i = (y * info.width + x) * 4; const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]; if (a > 250 && b > r + 50 && b - r < 140) blauw.push([x, r, g, b]); }
  const links = blauw.filter((p) => p[0] < info.width * 0.3), rechts = blauw.filter((p) => p[0] > info.width * 0.7);
  const gem = (l) => l.reduce((s, p) => s + p[3], 0) / l.length;
  /* levering 111 (lijst 123): het woordmerk is zwart #090D0B, er staat geen blauw meer in het plaatje */
  const zwart = []; for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) { const i = (y * info.width + x) * 4; if (data[i + 3] > 250 && data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40) zwart.push(x); }
  ok('… in het plaatje gemeten: zwart en geen blauw (levering 111)', blauw.length === 0 && zwart.length > 400, `${blauw.length} blauw · ${zwart.length} zwart`);
}

/* ── 3b · elk ander logo (Lucas, 15:04: "Fix ook alle logo's in de map met de nieuwe looks") ── */
console.log('\n3b · elk ander logo');
{
  const ogs = ['og-nl', 'og-en', 'og-voorpagina-nl', 'og-voorpagina-en', 'og-logo'];
  const maten = await Promise.all(ogs.map(async (n) => { const f = path.join(ROOT, 'public/img', `${n}.jpg`); if (!fs.existsSync(f)) return null; const m = await sharp(f).metadata(); return [m.format, m.width, m.height, fs.statSync(f).size]; }));
  const tegel = [await pix('public/img/merk-tegel.webp', 0.02, 0.02), await pix('public/img/merk-tegel.webp', 0.98, 0.98)];
  const mark = await pix('public/img/logo-mark.webp', 0.5, 0.5);
  ok('de deelplaatjes (levering 89, op het raster): C1 voor elke pagina, C2b "Venster" voor de voorpagina, C3 voor de pagina\'s zonder kop; jpeg, 1200 × 630, hoogstens 300 kB',
    maten.every((m) => m && m[0] === 'jpeg' && m[1] === 1200 && m[2] === 630 && m[3] <= 300 * 1024) && !fs.existsSync(path.join(ROOT, 'public/img/og-nl.png')) && !fs.existsSync(path.join(ROOT, 'public/img/og-en.png')), JSON.stringify(maten));
  ok('… de pagina\'s wijzen ernaar: standaard og-<taal>.jpg, de voorpagina het venster, de 404 het logo', /const ogImage = ogEigen \?\? `\/img\/og-\$\{lang === 'nl' \? 'nl' : 'en'\}\.jpg`;/.test(lay) && /ogImage="\/img\/og-voorpagina-nl\.jpg"/.test(lees('src/pages/nl/index.astro')) && /ogImage="\/img\/og-voorpagina-en\.jpg"/.test(lees('src/pages/index.astro')) && /ogImage="\/img\/og-logo\.jpg"/.test(lees('src/pages/404.astro')));
  ok('de V-tegel (avatar): wit op de snede, donker linksboven en licht rechtsonder', dichtbij(tegel[0], '#023D29', 16) && dichtbij(tegel[1], '#11976A', 16), tegel.join(' · '));
  ok('de oude ongebruikte logobeelden zijn het huidige logo geworden (logo-mark: wit met de V in de snede)', mark[2] > mark[0] + 40 || dichtbij(mark, '#FFFFFF', 6), String(mark));
  ok('de fotogids: het tekstlogo K5 in de snede (snedeAttr uit woordmerk.js); het deelplaatje: K5 en de lockup uit woordmerk.js', /<linearGradient id="vs-fg-snede" \$\{snedeAttr\(\)\}>/.test(lees('scripts/lib/fotogids-html.mjs')) && /const \{ WOORDMERK, LOCKUP \} = await import\('\.\.\/src\/data\/woordmerk\.js'\);/.test(lees('scripts/make-og.mjs')));
  const fac = lees('src/lib/invoicePdf.js');
  ok('de factuur: het woordmerk als knipvlak met één axiaal verloop (ShadingType 2), langs de snede', /function svgSnede\(/.test(fac) && /ShadingType: 2/.test(fac) && (fac.match(/sheet\.svgSnede\(WOORDMERK_D/g) || []).length === 2 && !/sheet\.svg\(WOORDMERK_D/.test(fac));
}

/* ── 3c · de posters in de letters en regels van de site (Lucas, 4 november 01:22: "Posters moeten ook gebruik
   maken van de nieuwe lettertypes en ontwerp rules.") ── */
console.log('\n3c · het deelplaatje en de fotogids in de letters van de site');
{
  const og = lees('scripts/make-og.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  /* levering 89: het deelplaatje op het raster (u = korte zijde / 12; kladblok/levering-89, 89/l82/raster.json) */
  /* levering 112 (fase 5 van levering 100): de kop is de titel van de voorpagina (banner94.js) in VISUAILS Display Blok, de
     grond het kaartveld van de site; het raster blijft */
  /* levering 120 (19 november 2026, lijst 130 – 133): de titel (BANNER[lang].titel) in VISUAILS Display 2 Light, in gewone
     schrijfwijze en zonder aanloop, zoals op de voorpagina (was VISUAILS Display Blok in hoofdletters) */
  ok('het deelplaatje: de kop is de titel uit banner94.js in VISUAILS Display 2 Light uit public/fonts, geen Urbanist',
    /import \{ BANNER \} from '\.\.\/src\/data\/banner94\.js';/.test(og) && /lees\('public\/fonts\/visuails-display\/VISUAILSDisplay2-Light\.woff2'\)/.test(og) && /BANNER\[lang\]\.titel/.test(og) && !/urbanist/i.test(og) && !/TAGLINE/.test(og));
  ok('  op het raster: u = 630 / 12, de titel in gewone schrijfwijze (300), de basislijn van de laatste regel op 11 u; de grond is het kaartveld',
    /const W = 1200, H = 630, U = H \/ 12;/.test(og) && /font-weight: 300;[^}]*text-transform: none;/.test(og) && /11 \* \$\{U\}/.test(og) && /src\/scripts\/kaartveld\.js/.test(og) && !/scripts\/veld\.js/.test(og) && !/mask-image/.test(og));
  const hl = lees('scripts/handleiding.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('de fotogids: dezelfde drie letters uit public/fonts, geen Urbanist meer',
    ['VISUAILS Display', 'DM Sans', 'IBM Plex Mono'].every((f) => hl.includes(`['${f}', 'public/fonts/`)) && !/urbanist/i.test(hl));
  const fg = lees('scripts/lib/fotogids-html.mjs').replace(/\/\*[\s\S]*?\*\//g, '');
  ok('  koppen in VISUAILS Display in hoofdletters, het etiket als sectielabel (streep in de snede, mono)',
    /h1, h2 \{ font-family: var\(--kop\); font-weight: 700; text-transform: uppercase; letter-spacing: -\.01em; line-height: \.92;/.test(fg) && /\.etiket \{[^}]*font-family: var\(--mono\)[^}]*letter-spacing: \.1em; text-transform: uppercase;/.test(fg) && /id="vs-fg-streep"/.test(fg));
  /* levering 87 (lijst 74, knop pil): het statusplaatje is een pil zonder stip, zoals op de site */
  ok('  geen stip en geen bolletje meer; Nodig en Optioneel als pil (levering 87), het vinkje uit de kit',
    !/pil-kop|border-radius: 99mm|border-radius: 50%/.test(fg) && /\.label \{[^}]*border-radius: 999px;/.test(fg) && /IKOON\.vink/.test(fg));
  /* de fotogids (een pdf, gemaakt door scripts/lib/fotogids-html.mjs): sinds levering 112 (fase 5 van levering 100) in zwart,
     wit en mint; de indeling en de hoeken zijn gebleven */
  ok('  de hoekregel: kaarten 24, de brede vlakken 32, het inktblok van zwart naar mint 700 met zijn snede rechtsonder; geen blauw uur meer',
    /--r-kaart: 24px; --r-vlak: 32px;/.test(fg) && /--nacht: #090D0B linear-gradient\(126\.87deg, #090D0B 0%, #090D0B 38%, #023D29 72%, #016645 100%\);/.test(fg) && !/#1A4279|#25508B|#2D61A8|#172945|#0F1217/i.test(fg));
}

/* ── 4 · de knoppen, in de bron ── */
console.log('\n4 · de knoppen');
ok('de gloed weg bij alle knoppen (h-knop::before), ook de schaduw onder Bestellen', /html body\.hal \.h-knop::before \{ content: none; display: none; \}/.test(blok) && /\.nav-cta[^{]*\{\n  box-shadow: none !important;/.test(blok));
/* knoppensysteem lijst 88/89: de inktknop staat sinds het knoppensysteem in src/styles/knoppen.css (.k-vol, --knop-inkt van lijst 84 A2 b) */
const knoppenCss = lees('src/styles/knoppen.css');
/* levering 97 (lijst 96, B1 a "strak"): onder de muis schuift blauw uur van links naar rechts door de knop (was: de snede vanuit de hoek) */
ok('K2 · de inktknop: inkt in rust; onder de muis en met de toets schuift blauw uur van links naar rechts (levering 97)', /background: var\(--k-inkt\) var\(--k-schuif\) 100% 0 \/ 200% 100% no-repeat;/.test(knoppenCss)
  && /background: var\(--k-blauw\) var\(--k-schuif\) 0 0 \/ 200% 100% no-repeat;/.test(knoppenCss));
/* levering 98 (lijst 99, A4): de snede is uit hal.css; Bestellen staat in knoppen.css (sectie I) */
/* levering 99 (lijst 100, D2 a): Bestellen bovenin is een witte knop op de inktbalk (balk-99.css); onder de muis schuift
   lijn (#E7EAE8) van links naar rechts. De snede staat nergens meer. */
const balkCss = lees('src/styles/balk-99.css');
ok('K1 · Bestellen: wit op de inktbalk; onder de muis schuift lijn van links naar rechts (balk-99.css)', /background: #FFFFFF linear-gradient\(90deg, #E7EAE8 0 50%, #FFFFFF 50% 100%\) 100% 0 \/ 200% 100% no-repeat !important;/.test(balkCss)
  && /background: #E7EAE8 linear-gradient\(90deg, #E7EAE8 0 50%, #FFFFFF 50% 100%\) 0 0 \/ 200% 100% no-repeat !important;/.test(balkCss)
  && /background: #090D0B !important; border-radius: var\(--b99-r\) !important;/.test(balkCss)
  && !/#016645 27\.5%, #11976A 50%, #016645 72\.5%/.test(blok));
/* knoppensysteem lijst 88/89: de lijnknop krijgt onder de muis het vlak en een lijn in inkt (lijst 88 regel 1); de ring in de snede is weg */
ok('K3 · de lijnknop: onder de muis het vlak #F4F5F4 en de lijn in inkt', /:is\(\.k, \.btn, \.knop\):hover:not\(#k\), :is\(\.k, \.btn, \.knop\):focus-visible:not\(#k\) \{ background: var\(--k-vlak\); box-shadow: inset 0 0 0 1\.5px var\(--k-inkt\);/.test(knoppenCss));
const paar = lees('src/scripts/knoppaar.js');
ok('K4 · de kier: het script zet de lucht alleen in de strook van de kier, niet op inkt of bij een witte knop', /const LUCHT = 'linear-gradient\(180deg, #016645 0%, #11976A 100%\)';/.test(paar) && /rij\.closest\('\.h-lk-slot, \.h-proef-woord'\)/.test(paar) && /k\.classList\.contains\('k-wit'\) \|\| k\.closest\('\.k-inkt'\)/.test(paar) && /ra\.right - rr\.left - rij\.clientLeft - snede - 1/.test(paar) && !/addEventListener\('resize'/.test(paar));
/* knoppensysteem lijst 88/89: de focusrand is 2 px blauw uur, 2 px buiten de knop (SPEC: #016645 offset 2, op inkt #3DFFB0) */
ok('D3 · de focusrand van een knop: 2 px blauw uur, 2 px buiten de knop; op inkt blauw licht', /:is\(\.k, \.btn, \.knop\):focus-visible:not\(#k\) \{ outline: 2px solid var\(--k-blauw\); outline-offset: 2px; \}/.test(knoppenCss) && /outline-color: var\(--k-blauw-licht\)/.test(knoppenCss));
/* knoppensysteem lijst 88/89: de knop zelf staat bij minder beweging stil in knoppen.css */
ok('minder beweging: geen overgang op de knoppen, kaarten en Bestellen', /@media \(prefers-reduced-motion: reduce\) \{\n  \[data-rol\] \.ik \.ik-a \{ transition: none !important; transform: none !important; \}\n  :is\(\.k, \.btn, \.knop\):not\(#k\) \{ transition: none; \}/.test(knoppenCss) && /@media \(prefers-reduced-motion: reduce\) \{\n  html body\.hal \.h-knop-inkt, html body\.hal \.h-knop-wit, html body\.hal \.h-knop-lijn::after,/.test(blok));

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
    /* levering 94: helemaal bovenaan is de balk weg (lijst 92); een klein stukje omlaag staat hij er */
    await page.evaluate(() => scrollTo(0, 40)); await page.waitForTimeout(500);
    /* levering 99 (lijst 100, D3 a): in de balk staat het woordmerk, wit op inkt */
    const logo = await page.evaluate(() => { const v = document.querySelector('.site-header .hal-wm-balk'); return v ? getComputedStyle(v.querySelector('.mk-fill, .wm-vorm, path')).fill : 'geen'; });
    ok('het woordmerk in de balk: wit op inkt (levering 99)', logo === 'rgb(255, 255, 255)', logo);
    const voet = await page.evaluate(() => [getComputedStyle(document.querySelector('.site-footer .hal-wm-voet .mk-fill')).fill, getComputedStyle(document.querySelector('.hal-wm-reus .mk-fill')).fill]);
    /* levering 100: de voet is zwart; het woordmerk erin en het grote woordmerk eronder zijn wit (kleur-100.css). VERVALLEN: D7 */
    ok('het woordmerk in de voet en het grote woordmerk: wit op de zwarte voet (levering 100)', voet[0] === 'rgb(255, 255, 255)' && voet[1] === 'rgb(255, 255, 255)', voet.join(' · '));
    const gloed = await page.evaluate(() => [...document.querySelectorAll('.h-knop')].filter((k) => getComputedStyle(k, '::before').content !== 'none').length);
    ok('geen gloed onder een knop (::before is weg)', gloed === 0, String(gloed));

    /* K2: de inktknop */
    /* levering 95 (lijst 94, A4): de inktknop van de banner staat op het witte vlak en is altijd zwart. De video stil */
    const K = '.b94-knop .h-knop.k-vol';  // knoppensysteem lijst 88/89: de inktknop heet .k-vol
    await page.evaluate(() => { scrollTo(0, 0); const v = document.querySelector('[data-b94-video]'); v.pause(); v.currentTime = 0; });
    /* de cookiebalk ligt op 1440 × 900 over de knop rechtsonder in de banner */
    await page.addStyleTag({ content: '#cc-bar { display: none !important; }' });
    await page.waitForTimeout(300);
    await page.locator(K).scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5); await page.waitForTimeout(500);
    /* levering 87: de knop is een pil, dus de hoeken van zijn vak liggen erbuiten; meet binnen de ronde uiteinden */
    const rust = [await pixel(page, K, 0.05, 0.5), await pixel(page, K, 0.9, 0.62)];
    /* levering 87: als pil valt de hoek linksboven weg; het donkerste zichtbare punt is het linker uiteinde (#172945 op 17,5 %) */
    /* 9 november 2026 (lijst 84, A2 = b): in rust gewoon inkt, overal (was: de nacht, inkt links en blauw rechtsonder) */
    ok('K2 · in rust de actiekleur mint, van links tot rechtsonder (levering 99, lijst 101)', dichtbij(rust[0], '#3DFFB0', 8) && dichtbij(rust[1], '#3DFFB0', 8), rust.join(' · '));
    await page.hover(K); await page.waitForTimeout(700);
    const muis = [await pixel(page, K, 0.15, 0.2), await pixel(page, K, 0.5, 0.15), await pixel(page, K, 0.995, 0.5), await pixel(page, K, 0.5, 0.995)];
    /* onder de muis de snede: vanuit de hoek rechtsonder blauw, naar links toe donkerder (de tweede helft van het verloop) */
    /* levering 97: onder de muis is de hele knop blauw uur (het blauw is van links naar rechts doorgeschoven) */
    ok('… onder de muis de diepe mint, van links tot rechts (levering 99)', muis.every((p) => dichtbij(p, '#1FEA9C', 8)), muis.join(' · '));
    ok('… en geen haarlijn inkt aan de rechter- of onderrand', muis.slice(2).every((p) => !dichtbij(p, '#090D0B', 12)), muis.slice(2).join(' · '));
    const wit = await page.evaluate((k) => { const c = getComputedStyle(document.querySelector(k)); return c.color; }, K);
    ok('… de letters inkt (14,7 : 1 op mint; levering 99)', wit === 'rgb(9, 13, 11)', wit);

    /* K1: Bestellen */
    await page.evaluate(() => scrollTo(0, 40)); await page.waitForTimeout(500);   /* de balk terug (levering 94) */
    const C = '.site-header .nav-cta';
    await page.mouse.move(5, 600); await page.waitForTimeout(700);
    /* knoppensysteem lijst 88/89: Bestellen draagt nu de pijl uit het kit rechts in het midden; meet erboven (20 % van de hoogte) */
    const c1 = [await pixel(page, C, 0.14, 0.2), await pixel(page, C, 0.86, 0.2)];
    await page.hover(C); await page.waitForTimeout(800);
    const c2 = [await pixel(page, C, 0.14, 0.2), await pixel(page, C, 0.86, 0.2)];
    /* 9 november 2026 (lijst 84, A1 = c): de snede, schoon — geen stukje met korrel meer. In rust rechts lichter; onder de
       muis schuift het licht door de knop, dan is links het lichtst. */
    /* levering 97: in rust blauw uur; onder de muis schuift blauw diep van links naar rechts door de knop */
    /* levering 99 (lijst 100, D2 a): wit op de inktbalk; onder de muis lijn #E7EAE8, van links tot rechts */
    /* levering 100: Bestellen in de balk is mint; onder de muis schuift de diepe mint van links naar rechts (kleur-100.css) */
    ok('K1 · Bestellen (levering 100): mint op de zwarte balk; onder de muis de diepe mint, van links tot rechts', c1.every((p) => dichtbij(p, '#3DFFB0', 10)) && c2.every((p) => dichtbij(p, '#1FEA9C', 10)) && !(await page.$eval(C, (e) => e.classList.contains('pk'))), `${c1.join(' · ')} → ${c2.join(' · ')}`);
    const schaduw = await page.evaluate((c) => getComputedStyle(document.querySelector(c)).boxShadow, C);
    ok('… zonder gloed eronder (alleen een laag binnen de knop)', schaduw === 'none' || schaduw.split(/,(?![^(]*\))/).every((d) => d.includes('inset')), schaduw);

    /* D3: de focusrand */
    await page.mouse.move(5, 600);
    await page.keyboard.press('Tab');
    await page.evaluate((k) => document.querySelector(k).focus(), K);
    await page.waitForTimeout(500);
    const ring = await page.evaluate((k) => { const e = document.querySelector(k); const a = getComputedStyle(e, '::after'); return { fv: e.matches(':focus-visible'), inhoud: a.content, inset: a.top, bg: a.backgroundImage.slice(0, 40), outline: getComputedStyle(e).outlineColor }; }, K);
    // knoppensysteem lijst 88/89: de focusrand is een outline van 2 px blauw uur, 2 px buiten de knop (geen ring in de snede meer)
    const ring2 = await page.evaluate((k) => { const e = document.querySelector(k); const c = getComputedStyle(e); return { fv: e.matches(':focus-visible'), kleur: c.outlineColor, dik: c.outlineWidth, af: c.outlineOffset, stijl: c.outlineStyle }; }, K);
    ok('D3 · met de toets: 2 px zwart, 2 px buiten de knop (lijst 106: blauw b)', ring2.fv && ring2.kleur === 'rgb(9, 13, 11)' && ring2.dik === '2px' && ring2.af === '2px' && ring2.stijl === 'solid', JSON.stringify(ring2));

    /* D6: het inktblok */
    const proef = await page.evaluate(() => getComputedStyle(document.querySelector('.h-proef > .h-proef-woord')).backgroundImage);
    /* levering 89 (lijst 78 C2): het €1-blok is het veld B4 Nacht, een stukje nacht met korrel, het licht rechtsonder */
    /* lijst 86 (9 november 2026): het €1-blok heeft zijn vaste foto (fotoblok.css); tests/fotoblok-browser meet het */
    /* levering 115 (lijst 124): een stuk van het doek met korrel (kaart-115.css), in plaats van het kaartveld */
    ok('D6 · het €1-blok is een stuk van het doek met korrel (levering 115; was het kaartveld van levering 100)', /\/img\/doek\/korrel\.webp/.test(proef) && /\/img\/doek\/stuk-\d\.webp/.test(proef), proef.slice(0, 160));
    const tekst = await page.evaluate(() => { const blok = document.querySelector('.h-proef > .h-proef-woord'); const br = blok.getBoundingClientRect(); return [...blok.querySelectorAll('p, h1, h2, span, a')].filter((e) => e.textContent.trim() && e.getBoundingClientRect().width).map((e) => { const g = document.createRange(); g.selectNodeContents(e); const r = g.getBoundingClientRect(); return { x: (r.right - br.left) / br.width, y: (r.bottom - br.top) / br.height, kleur: getComputedStyle(e).color }; }); });  /* de tekst zelf, niet zijn vak: sinds levering 87 loopt het vak van een korte zin tot de rand (h-1r) */
    /* het lichtste punt onder tekst: de rechteronderhoek van het verste tekstvak, op de fade */
    const t = Math.max(...tekst.filter((e) => /255, 255, 255/.test(e.kleur)).map((e) => { const b = 0.8 * e.x + 0.6 * e.y; return b / 1.4; }));
    const meng = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    const kleurOp = (tt) => tt <= 0.38 ? rgb('#090D0B') : tt <= 0.72 ? meng(rgb('#090D0B'), rgb('#172945'), (tt - 0.38) / 0.34) : meng(rgb('#172945'), rgb('#023D29'), (tt - 0.72) / 0.28);
    const wit86 = meng(kleurOp(t), [255, 255, 255], 0.86);
    /* levering 87: een korte zin staat nu op één regel (Lucas, 03:23) en loopt in het inktblok verder de fade in;
       de eis gaat van 10 : 1 naar AAA (7 : 1), ruim boven de huisregel van 4,5 */
    /* de tekst op het veld meet tests/posterkleur-89-browser.test.mjs op het slechtste beeldpunt (met de korrel); hier
       blijft de rekensom op de fade als ondergrens, voor als het beeld er niet is */
    ok('… de tekst staat waar het donker is: wit op 86 % haalt op de fade eronder 7 : 1 of meer (AAA)', contrast(wit86, kleurOp(t)) >= 7, `${(t * 100).toFixed(0)} % van de fade · ${contrast(wit86, kleurOp(t)).toFixed(2)}`);
    ok('… zonder fouten op de voorpagina', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  /* K3, K4 en D2 op /catalog en /how-it-works */
  {
    const { ctx, page, fouten } = await open('/nl/catalog/');
    /* 14 november 2026 (Lucas 03:36, 03:48: "Die hoeken hoeven op geen enkele manier behouden te worden"): geen snede meer
       tussen twee knoppen, dus ook geen lucht in een kier (data-h-kier). De knoppen staan los, 10 px ertussen, 8 px rond. */
    const rij = '.h-acties:has(> .h-knop ~ .h-knop)';
    const los = await page.evaluate((s) => [...document.querySelectorAll(s)].map((r) => { const k = [...r.children].filter((x) => x.classList.contains('h-knop') && !x.hidden); if (k.length < 2) return true; const a = k[0].getBoundingClientRect(), b = k[1].getBoundingClientRect(); return k.every((x) => getComputedStyle(x).clipPath === 'none') && (b.left - a.right >= 9 || b.top >= a.bottom); }), rij);
    ok('K4 · een knoppenpaar: geen snede meer, de knoppen los (minstens 9 px ertussen of onder elkaar)', los.length >= 1 && los.every(Boolean), JSON.stringify(los));
    ok('… en nergens nog data-h-kier', (await page.locator('.h-acties[data-h-kier]').count()) === 0);
    {
      /* K3: de lijnknop onder de muis */
      // knoppensysteem lijst 88/89: onder de muis het vlak #F4F5F4 en de lijn in inkt
      const L = `${rij} > .h-knop.k-lijn`;
      await page.locator(L).first().scrollIntoViewIfNeeded(); await page.locator(L).first().hover(); await page.waitForTimeout(600);
      const na = await page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return [c.backgroundColor, c.boxShadow]; }, L);
      ok('K3 · de lijnknop: onder de muis het vlak en de lijn in inkt', na[0] === 'rgb(244, 245, 244)' && /rgb\(9, 13, 11\) 0px 0px 0px 1\.5px inset/.test(na[1]), na.join(' · '));
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
    const tel = true || await page.evaluate(() => [...document.querySelectorAll('.h-acties')].filter((r) => 'hKier' in r.dataset).every((r) => r.classList.contains('h-passen') || getComputedStyle(r.querySelector('.h-knop')).clipPath !== 'none'));
    ok('… op de telefoon ook geen snede (er is geen vorm van twee knoppen meer)', await page.evaluate(() => [...document.querySelectorAll('.h-acties > .h-knop')].every((k) => getComputedStyle(k).clipPath === 'none')));
    ok('… zonder fouten', fouten.length === 0, fouten.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/catalog/classic/');
    await page.evaluate(() => document.querySelector('.h-lk-slot').scrollIntoView()); await page.waitForTimeout(300);
    const slot = await page.evaluate(() => { const s = document.querySelector('.h-lk-slot'); const r = s.querySelector('.h-acties'); return { bg: getComputedStyle(s).backgroundImage, kier: 'hKier' in r.dataset, svc: getComputedStyle(s.querySelector('.svcsw-a')).backgroundImage }; });
    /* levering 89 (lijst 82, E2): het ene inktblok is een stukje nacht of snede met korrel (posterkleur.js) */
    ok('D6 · het slot onderaan (levering 100: een kaart, geen foto meer); K4 niet op het inktblok; de links daar wit', !slot.kier && /255, 255, 255/.test(slot.svc), JSON.stringify(slot).slice(0, 260));
    const K = '.h-lk-slot .h-knop.k-vol';  // knoppensysteem lijst 88/89: de volle knop op inkt is wit, onder de muis mist (#E7EAE8)
    await page.locator(K).scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(400);
    const a = await pixel(page, K, 0.15, 0.2);
    await page.hover(K); await page.waitForTimeout(700);
    const b = await pixel(page, K, 0.15, 0.2), kl = await page.evaluate((k) => getComputedStyle(document.querySelector(k)).color, K);
    ok('de bestelknop op het inktblok is mint en wordt onder de muis diepe mint, de letters inkt (levering 99)', dichtbij(a, '#3DFFB0', 8) && dichtbij(b, '#1FEA9C', 8) && kl === 'rgb(9, 13, 11)', `${a} → ${b} · ${kl}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/how-it-works/');
    /* D1: de streep van het sectielabel */
    const pil = await page.evaluate(() => { const p = [...document.querySelectorAll('p.h-pil')].find((e) => !e.closest('.h-lk-slot, .h-proef') && !e.classList.contains('h-pil-donker')); const d = document.querySelector('p.h-pil-donker'); return [getComputedStyle(p, '::before').backgroundImage, d ? getComputedStyle(d, '::before').backgroundImage : 'geen']; });
    ok('D1 · de streep van het sectielabel in de snede; op het inktblok en een donkere band wit', /linearGradient/.test(pil[0]) && /%23023D29/.test(pil[0]) && (pil[1] === 'geen' || /%23FFFFFF/.test(pil[1])), pil.map((p) => p.slice(60, 140)).join(' | '));

    const L = '.h-hw-details a';
    const d2 = await page.evaluate((s) => { const c = getComputedStyle(document.querySelector(s)); return [c.textDecorationLine, c.backgroundImage, c.backgroundSize]; }, L);
    ok('D2 · een link in de tekst: geen streep van de browser, maar 2 px die het wit in loopt', d2[0] === 'none' && /linear-gradient\(90deg, rgb\(1, 102, 69\), rgba\(1, 102, 69, 0\.5\) 45%, rgba\(1, 102, 69, 0\)\)/.test(d2[1]) && d2[2] === '100% 2px', d2.join(' · '));
    await page.hover(L); await page.waitForTimeout(200);
    const vol = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundImage, L);
    ok('… onder de muis vol', vol === 'linear-gradient(90deg, rgb(1, 102, 69), rgb(1, 102, 69))', vol);
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
    /* levering 111 (lijst 123, KL): het balkje is zwart, zonder stukje (was levering 89, E6: een blauw stukje snede) */
    const d4k = await page.evaluate(() => getComputedStyle(document.querySelector('.h-lijntje i')).backgroundColor);
    ok('D4 · het balkje met de schuine kop is zwart, zonder stukje (levering 111)', d4 === 'none' && d4k === 'rgb(9, 13, 11)', `${d4.slice(0, 60)} · ${d4k}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await open('/nl/', { stil: true });
    const t = await page.evaluate(() => [getComputedStyle(document.querySelector('.h-knop.k-vol')).transitionDuration,  /* knoppensysteem lijst 88/89 */ getComputedStyle(document.querySelector('.site-header .nav-cta')).transitionDuration]);
    ok('minder beweging: de knop vult en het licht schuift zonder overgang', t.every((d) => d.split(',').every((x) => parseFloat(x) === 0)), t.join(' · '));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${goed} van ${goed + fout} goed`);
if (fout) process.exit(1);
