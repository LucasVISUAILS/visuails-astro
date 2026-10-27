/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE HAL ALS VOORPAGINA  ·  npm run test:halvoorbeeld
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 12 oktober 2026. Lucas koos in afvinklijst 5 de witte hal (ontwerpplan versie
 * 9). Eerst stond hij als voorbeeld op /voorbeeld/ en /nl/voorbeeld/; om 17:42
 * zei Lucas *"Voorbeeld is goed"* en om 18:26 koos hij "direct live bij je
 * volgende UITROLLEN". De hal staat nu op / en /nl/, en de voorbeeldpagina's
 * sturen met een 301 door. (De toets heet nog naar het voorbeeld, zodat zijn
 * plek in de keten en in package.json gelijk blijft.) Hij bewaakt:
 *
 *   1. HET LEKT NIET. Alleen / en /nl/ dragen body.hal, ze staan NIET op
 *      noindex en wel in de sitemap, /voorbeeld/ bestaat niet meer en stuurt
 *      door (de voorbeelden per groep op /voorbeeld/<pagina>/ dragen de hal ook,
 *      met noindex en buiten de sitemap), en elke regel in hal.css hangt onder de hal (anders verandert er
 *      ongemerkt iets op een andere pagina die nog in de oude huid staat).
 *   2. DE REGELS UIT HET PLAN. Contrast van de kleurparen uitgerekend uit de
 *      waarden in hal.css (niet overgeschreven), geen letter onder 11,5 px, en
 *      "minder beweging" zet alles stil.
 *   3. EEN BELOFTE DIE NIET KLOPTE. Stap 3 liet drie vormen zien (1:1, 4:5,
 *      9:16) en de band zei "de uitsnede per kanaal": dat las als "je krijgt
 *      alle formaten", terwijl de klant er één kiest (ratios.js). Nu staat er
 *      "het formaat dat je kiest", en stap 3 toont goedkeuren per beeld.
 *   4. WAT ER BIJ HET BOUWEN MISGING en nu gemeten wordt in een browser: geen
 *      zijwaarts scrollen, de twee belletjes bij de laptop raken elkaar niet en
 *      vallen niet achter de balk (op 1024 gebeurde dat), en de bediening staat
 *      binnen het scherm (op 1440 stak hij er eerst 64 px buiten).
 *
 * Leest dist/: draai eerst `npm run build` (de rest van de keten doet dat ook).
 */
import { readFileSync, existsSync, readFile, globSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const lees = (p) => readFileSync(join(ROOT, p), 'utf8');

let goed = 0, totaal = 0;
const check = (naam, kreeg, wil) => {
  totaal++;
  const g = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (g) goed++;
  console.log(`${g ? ' ok  ' : 'FAIL '} ${String(naam).padEnd(64)} ${g ? '' : `verwacht ${JSON.stringify(wil)} kreeg ${JSON.stringify(kreeg)}`}`);
};

const HAL = ['/', '/nl/'];
/* De pagina's die na de voorpagina in de hal kwamen (afvinklijst 7 en 8, alles
   "doen", 12 oktober 2026): start, de prijzen, catalog en lifestyle met hun
   lookpagina's. Eerst als voorbeeld op /voorbeeld/<pagina>/, nu op hun eigen route;
   het voorbeeld stuurt met een 301 door. Komt er een groep bij, dan komt hij hier. */
const GROEPEN = ['start', 'pricing', 'plans', 'per-product', 'catalog', 'catalog/classic', 'catalog/custom', 'lifestyle', 'lifestyle/dunes', 'lifestyle/flash', 'lifestyle/glow', 'lifestyle/phone-made', 'lifestyle/custom', 'test-sample', 'start/catalog', 'start/lifestyle', 'start/plan', 'start/brand-model', 'start/custom-look', 'start/video', 'thank-you', 'how-it-works', 'models', 'custom-models', 'compare', 'guides', 'faq', 'upload-guidelines', 'about', 'contact', 'video', 'video/motion', 'video/lifestyle', 'video/campaign', 'video/custom', 'hooks', 'editions', 'gallery', 'studio', 'terms', 'privacy', 'cookie-policy', 'data-processing-agreement', 'ai-act'];
const LIVE = GROEPEN.flatMap((p) => [`/${p}/`, `/nl/${p}/`]);
/* De groep die nu als voorbeeld klaarstaat (v-vorm = a): een echte pagina op
   /voorbeeld/<pagina>/, in de hal, noindex en niet in de sitemap. Gaat hij live,
   dan verhuist hij naar GROEPEN en krijgt zijn voorbeeld een 301. */
/* De proef ging op 12 oktober 2026 (afvinklijst 9) live, de formulieren en de
   bedankpagina op 13 oktober (afvinklijst 10), hoe het werkt dezelfde nacht
   (afvinklijst 11), de modellen ook (afvinklijst 12), vergelijken ook (afvinklijst 13), de
   leespagina's ook (afvinklijst 14), over ons en contact ook (afvinklijst 15), video met zijn
   stijlen, hooks en editions ook (afvinklijst 16). Nu klaar als voorbeeld: de galerij
   (afvinklijst 16, v16-volgende a); die ging live met afvinklijst 17. Studio stond klaar als
   voorbeeld (afvinklijst 17, v17-volgende a) en ging live met afvinklijst 18. De volgende
   groep: de juridische pagina’s, de AI Act-pagina en 404 (v18-volgende a). */
/* De juridische pagina's, de AI Act en de 404 gingen live met afvinklijst 19: de hele site staat
   nu in de hal, en er staat geen voorbeeld meer klaar. */
/* De openingen met een beeld stonden als voorbeeld op /voorbeeld/opening/<pagina>/ (afvinklijst 20) en staan sinds
   afvinklijst 21 op de pagina's zelf; het voorbeeld stuurt door. Sinds 14 oktober 2026 staan er weer twee klaar:
   de uitleg in beweging (afvinklijst 24), los (/voorbeeld/uitleg/) en op de voorpagina (/voorbeeld/voorpagina/). */
const VOORBEELD = ['uitleg', 'voorpagina'];
const VOORBEELDEN = VOORBEELD.flatMap((p) => [`/voorbeeld/${p}/`, `/nl/voorbeeld/${p}/`]);

/* ── 1 · de bron ─────────────────────────────────────────────────────────── */
console.log('\nde bron');
for (const [pad, taal] of [['src/pages/index.astro', 'en'], ['src/pages/nl/index.astro', 'nl']]) {
  const s = lees(pad);
  check(`${pad}: VoorpaginaHal, huid="hal", lang=${taal}, geen noindex`, [/<VoorpaginaHal\b/.test(s), /huid="hal"/.test(s), new RegExp(`lang="${taal}"`).test(s), /\bnoindex\b/.test(s)], [true, true, true, false]);
}
check('de voorbeeldpagina\'s bestaan niet meer', ['src/pages/voorbeeld.astro', 'src/pages/nl/voorbeeld.astro'].map((p) => existsSync(join(ROOT, p))), [false, false]);
{
  const r = lees('public/_redirects').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));
  const doel = (bron) => (r.find(([b]) => b === bron) || []).slice(1);
  check('/voorbeeld stuurt met een 301 naar / (met en zonder slash)', [doel('/voorbeeld'), doel('/voorbeeld/')], [['/', '301'], ['/', '301']]);
  check('/nl/voorbeeld stuurt met een 301 naar /nl/', [doel('/nl/voorbeeld'), doel('/nl/voorbeeld/')], [['/nl/', '301'], ['/nl/', '301']]);
}
{
  /* 3 · de belofte: geen "uitsnede per kanaal" en geen rij formaten in stap 3 */
  const bron = lees('src/components/VoorpaginaHal.astro').replace(/\/\*[\s\S]*?\*\//g, '');
  check('de band zegt "het formaat dat je kiest" / "the format you choose"', [/het formaat dat je kiest/.test(bron), /the format you choose/.test(bron)], [true, true]);
  check('en niet meer "uitsnede per kanaal" / "crop for each channel"', /uitsnede per kanaal|crop for each channel/i.test(bron), false);
  check('stap 3 heeft geen rij formaten meer (h-vormen)', /h-vormen/.test(bron), false);
}
/* elke regel in hal.css hangt onder de hal */
const css = lees('src/styles/hal.css').replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = [];
{
  let buf = '';
  const stapel = [];
  for (const ch of css) {
    if (ch === '{') {
      const kop = buf.trim(); buf = '';
      const isAt = kop.startsWith('@');
      const frames = /^@(-webkit-)?keyframes/.test(kop);
      stapel.push(frames ? 'frames' : isAt ? 'at' : 'regel');
      if (!isAt && !stapel.slice(0, -1).includes('frames')) selectors.push(...kop.split(',').map((x) => x.trim()));
    } else if (ch === '}') { stapel.pop(); buf = ''; }
    else buf += ch;
  }
}
const los = selectors.filter((s) => !/(^|[\s(])(body\.hal|\.hal|html\.h-js body\.hal|\.h-pagina)\b/.test(s) && !/:root/.test(s));
check(`alle ${selectors.length} selectors in hal.css hangen onder .hal of .h-pagina`, los, []);
check('hal.css heeft een blok voor "minder beweging" dat alles stilzet', /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*animation: none !important; transition: none !important;/.test(css), true);

/* geen letter onder 11,5 px */
const klein = [];
for (const m of css.matchAll(/font(?:-size)?\s*:\s*([^;}]+)/g)) {
  const px = [...m[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
  /* in een `font:`-afkorting is het eerste px-getal de lettergrootte */
  const maat = px[0];
  if (maat !== undefined && maat < 11.5) klein.push(m[0].trim());
}
/* Let op: de schermen IN de laptop (sc-*) zijn op schermmaat opgebouwd (16–46
   px) en worden verkleind getoond. Dat is een afbeelding van een webshop onder
   aria-hidden, geen tekst van ons; ze halen deze regel in de bron vanzelf. */
check('geen letter onder 11,5 px in hal.css', klein, []);

/* contrast, uitgerekend uit de tokens in hal.css */
const token = (n) => { const m = css.match(new RegExp(`--h-${n}:\\s*(#[0-9A-Fa-f]{6})`)); return m && m[1]; };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return Math.max(x, y) / Math.min(x, y); };
const PAREN = [
  ['inkt', 'wit', 4.5], ['inkt-2', 'wit', 4.5], ['inkt-3', 'wit', 4.5], ['inkt-2', 'nevel', 4.5], ['inkt-3', 'nevel', 4.5], ['inkt-3', 'vak', 4.5],
  ['kop-licht', 'wit', 3], ['nacht', 'mist', 4.5], ['inkt', 'mist', 4.5], ['inkt', 'lila', 4.5], ['inkt', 'waas', 4.5],
];
check('alle kleurparen halen hun eis', PAREN.filter(([v, a, eis]) => !(token(v) && token(a) && cr(token(v), token(a)) >= eis)).map(([v, a]) => `${v} op ${a}`), []);
check('wit op violet, violet diep en nacht minstens 4,5:1', ['violet', 'violet-diep', 'nacht'].filter((n) => cr('#FFFFFF', token(n)) < 4.5), []);

/* ── 2 · de gebouwde site ─────────────────────────────────────────────────── */
console.log('\nde gebouwde site');
if (!existsSync(join(DIST, 'index.html'))) {
  console.log('dist/ heeft geen voorpagina — draai eerst `npm run build`. De rest slaat over.');
  console.log(`\n${goed}/${totaal} geslaagd`);
  process.exit(goed === totaal ? 0 : 1);
}
const html = Object.fromEntries(HAL.map((p) => [p, readFileSync(join(DIST, p, 'index.html'), 'utf8')]));
for (const p of HAL) {
  const h = html[p];
  check(`${p}: geen noindex, body.hal, het woordmerk als symbool`, [/<meta name="robots" content="noindex/.test(h), /<body[^>]*class="[^"]*\bhal\b/.test(h), /<symbol id="woordmerk"/.test(h)], [false, true, true]);
  /* levering 76: de letter is Instrument Sans (Lijst 58) */
  check(`${p}: de letter (Instrument Sans) wordt vooraf geladen`, /<link rel="preload"[^>]+instrument-sans[^>]+\.woff2/i.test(h), true);
  /* stap 3: vier beelden, vier vinkjes, "4 van 4". Levering 76 (Lucas, 26 oktober, 12:29: "De format
     sectie mag wel subtiel/klein toegevoegd worden aan how it works animatie"): het formaat staat er
     nu klein bij, als één keuze tegelijk (de gekozen in inkt, is-eind), niet als "alle drie". */
  const i3 = h.indexOf('class="h-well h-keur');
  const stap3 = i3 < 0 ? '' : h.slice(i3, h.indexOf('</figure>', i3));
  /* levering 74: de band "Wij doen de rest" (h-rest) is weg; de stappen lopen tot de balk
     eronder (class="o-voet", HalOpening.astro) */
  const s0 = h.indexOf('class="h-stappen"');
  const stappen = h.slice(s0, h.indexOf('class="o-voet"', s0));
  const fmt = (stap3.match(/<span class="o-fmt[^"]*"[^>]*>[\s\S]*?<\/span>/) || [''])[0];
  check(`${p}: stap 3 toont vier beelden met elk een vinkje, en het formaat als één keuze`, [(stap3.match(/class="h-vink"/g) || []).length, (fmt.match(/is-eind/g) || []).length, /9:16/.test(fmt)], [4, 1, false]);
  check(`${p}: met "4 van 4 goedgekeurd" / "4 of 4 approved"`, /4 (van|of) 4 (goedgekeurd|approved)/.test(stap3), true);
}
const metHal = globSync('dist/**/index.html').map((f) => f.replace(/\\/g, '/'))
  .filter((f) => /<body[^>]*class="[^"]*\bhal\b/.test(readFileSync(f, 'utf8')))
  .map((f) => f.replace(/^dist/, '').replace(/index\.html$/, '')).sort();
/* /nl/404/: Astro bouwt src/pages/nl/404.astro als map (scripts/sitemap-and-404.mjs kopieert hem
   daarna naar nl/404.html); sinds afvinklijst 19 draagt hij, zoals alles, de hal. */
check('alleen de voorpagina, de groepen en het voorbeeld dragen body.hal', metHal, [...HAL, ...LIVE, ...VOORBEELDEN, '/nl/404/'].sort());
{
  /* onder /voorbeeld/ staat alleen nog het voorbeeld van de groep die klaarstaat */
  const onder = (d) => (existsSync(join(DIST, d)) ? globSync(`${d}/**/index.html`, { cwd: DIST }).map((f) => `/${f.replace(/\\/g, '/').replace(/index\.html$/, '')}`) : []);
  check('dist/voorbeeld/ heeft alleen het voorbeeld (de rest stuurt door)', [...onder('voorbeeld'), ...onder('nl/voorbeeld')].sort(), [...VOORBEELDEN].sort());
}
for (const p of VOORBEELDEN) {
  const h = readFileSync(join(DIST, p, 'index.html'), 'utf8');
  check(`${p}: body.hal en noindex`, [/<body[^>]*class="[^"]*\bhal\b/.test(h), /<meta name="robots" content="noindex/.test(h)], [true, true]);
}
/* De bedankpagina was altijd al noindex (je komt er alleen na een bestelling), en blijft dat. */
const ALTIJD_NOINDEX = ['/thank-you/', '/nl/thank-you/'];
for (const p of LIVE) {
  const h = readFileSync(join(DIST, p, 'index.html'), 'utf8');
  const nooit = ALTIJD_NOINDEX.includes(p);
  check(`${p}: body.hal en ${nooit ? 'noindex, zoals altijd' : 'geen noindex'}`, [/<body[^>]*class="[^"]*\bhal\b/.test(h), /<meta name="robots" content="noindex/.test(h)], [true, nooit]);
}
{
  const r = lees('public/_redirects').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));
  const doel = (bron) => (r.find(([b]) => b === bron) || []).slice(1).join(' ');
  const mis = GROEPEN.flatMap((p) => [['', `/${p}`], ['/nl', `/nl/${p}`]].flatMap(([pre, naar]) => [`${pre}/voorbeeld/${p}`, `${pre}/voorbeeld/${p}/`].filter((b) => doel(b) !== `${naar} 301`)));
  check('elk voorbeeld stuurt met een 301 naar zijn pagina (met en zonder slash)', mis, []);
}
const sitemap = existsSync(join(DIST, 'sitemap.xml')) ? readFileSync(join(DIST, 'sitemap.xml'), 'utf8') : '';
check('de sitemap noemt geen /voorbeeld/', /voorbeeld/.test(sitemap), false);
check('de sitemap heeft de voorpagina in beide talen', [/<loc>https:\/\/visuails\.com\/<\/loc>/.test(sitemap), /<loc>https:\/\/visuails\.com\/nl\/<\/loc>/.test(sitemap)], [true, true]);
/* Sinds 13 oktober 2026 (afvinklijst 15) staan ook over ons en contact in de hal; de juridische
   pagina's komen als laatste, dus die zijn hier de pagina's die nog niet in de hal staan. */
/* Sinds 13 oktober 2026 (afvinklijst 19) staan ook de juridische pagina's in de hal; er is geen
   gebouwde pagina meer zonder. De twee 404's zijn geen index.html, dus die met naam. (De app —
   inloggen, je account, de privélink — rendert de Worker; die staat niet in dist/.) */
const fout = ['404.html', 'nl/404.html'].map((f) => readFileSync(join(DIST, f), 'utf8'));
check('de 404 draagt de hal, in beide talen', fout.map((h) => /<body[^>]*class="[^"]*\bhal\b/.test(h)), [true, true]);

/* ── 3 · in een browser ──────────────────────────────────────────────────── */
console.log('\nin een browser');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = join(DIST, p);
  if (!extname(f)) f = join(f, 'index.html');
  readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, r));
const BASIS = `http://127.0.0.1:${server.address().port}`;
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const fouten = [];
const meting = [];
/* Levering 74 (25 oktober 2026): de voorpagina heeft geen laptop meer (de opening is een
   scrollvideo, HalOpening.astro; zie tests/opening-74.test.mjs). De laptop staat nog op
   /catalog, /lifestyle en /video; de metingen van de laptop lopen daarom op /catalog, de
   algemene (zijwaarts, fouten) op alle vier. */
const LAPTOP = ['/catalog/', '/nl/catalog/'];
for (const pad of [...HAL, ...LAPTOP]) {
  for (const w of [1440, 1280, 1024, 900, 760, 390, 320]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, reducedMotion: 'reduce' });
    /* zonder cookiebalk: die is van de site, niet van het voorbeeld */
    await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-12T00:00:00Z' })), url: BASIS }]);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fouten.push(`${w}px ${pad} — ${e.message.split('\n')[0]}`));
    page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) fouten.push(`${w}px ${pad} — ${m.text().slice(0, 120)}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !/\/account\/me/.test(r.url())) fouten.push(`${w}px ${pad} — ${r.status()} ${new URL(r.url()).pathname}`); });
    await page.goto(BASIS + pad, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    meting.push(await page.evaluate((w) => {
      const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
      const lap = box('.hl-bel-lap'), fon = box('.hl-bel-fon'), balk = box('.site-header .nav'), bed = box('.hl-bediening'), laag = document.querySelector('.hl');
      const raken = lap && fon && !(lap.r <= fon.l || fon.r <= lap.l || lap.b <= fon.t || fon.b <= lap.t);
      /* Levering 64 (afvinklijst 43): op de telefoon eerst kop en knoppen, dan de foto,
         dan de zin en de labels; en de foto loopt tot de rechterrand van het venster. */
      const knop = box('.h-opening .h-acties'), raam = box('.h-opening .hl-raam'), uitleg = box('.h-opening .hl-uitleg'),
        kop = box('.h-opening .h-kop'), zin = box('.h-opening .h-lede'), feiten = box('.h-opening .h-feiten');
      const volgorde = !!(knop && raam && uitleg && kop && zin && feiten) && kop.b <= knop.t && knop.b <= raam.t && uitleg.b <= zin.t && zin.b <= feiten.t;
      const rand = !!raam && Math.abs(raam.r - document.documentElement.clientWidth) < 0.5;
      return {
        w, volgorde, rand, laptop: !!laag,
        zijwaarts: document.documentElement.scrollWidth > w,
        raken,
        achterBalk: w > 900 && balk && [lap, fon].some((b) => b && b.t < balk.b),
        bedieningBuiten: bed && (bed.r > w + 0.5 || bed.l < -0.5),
        leeft: !!laag && laag.classList.contains('hl-leeft'),
      };
    }, w));
    meting[meting.length - 1].pad = pad;
    await ctx.close();
  }
}
/* ── ZACHTE NAVIGATIE: VAN DE KANTIGE HUID NAAR DE HAL EN TERUG ───────────────
   Sinds de hal de voorpagina is, komt een bezoeker er vaak via het logo op een
   andere pagina binnen, en dan wisselt de ClientRouter de pagina zonder het
   venster te verversen. Dan moet de hal er net zo staan als bij een harde
   laadbeurt (letter, opening, binnenkomende delen), en op de weg terug mag er
   niets van de hal achterblijven op een pagina in de kantige huid. */
const zf = [];
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-12T00:00:00Z' })), url: BASIS }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => zf.push(e.message.split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) zf.push(m.text().slice(0, 120)); });
  await page.goto(BASIS + '/privacy/', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__zacht = 1; });
  await page.click('.site-header a.brand[href="/"]');
  await page.waitForFunction(() => location.pathname === '/' && document.body.classList.contains('hal'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const heen = await page.evaluate(() => ({
    zacht: window.__zacht === 1,
    hal: document.body.classList.contains('hal'),
    letter: /^"?Instrument Sans/i.test(getComputedStyle(document.querySelector('.h-h1') || document.body).fontFamily),
    /* levering 74: de opening is het podium met de scrollvideo (HalOpening.astro) */
    opening: (document.querySelector('[data-o-podium]')?.getBoundingClientRect().height || 0) > 300,
    inBeeld: [...document.querySelectorAll('[data-o-kop], [data-o-lede]')].every((e) => getComputedStyle(e).opacity !== '0' && getComputedStyle(e).visibility !== 'hidden'),
  }));
  check('zacht naar de hal: zelfde venster, body.hal, Instrument Sans, de opening staat', heen, { zacht: true, hal: true, letter: true, opening: true, inBeeld: true });
  await page.locator('.h-vertrouwen').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  check('en wat in beeld scrolt, komt binnen (is-in)', await page.evaluate(() => document.querySelector('.h-vertrouwen')?.classList.contains('is-in')), true);
  /* van de hal naar de hal: /pricing staat er sinds 12 oktober ook in */
  await page.click('.site-footer a[href="/pricing/"], footer a[href="/pricing/"]');
  await page.waitForFunction(() => location.pathname === '/pricing/', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.locator('.h-pr-som').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  const verder = await page.evaluate(() => ({
    zacht: window.__zacht === 1,
    hal: document.body.classList.contains('hal'),
    kop: !!document.querySelector('.h-paginakop .h-h1'),
    inBeeld: document.querySelector('.h-pr-som')?.classList.contains('is-in') === true,
  }));
  check('zacht van de hal naar /pricing: hal, de kop, en wat in beeld scrolt komt binnen', verder, { zacht: true, hal: true, kop: true, inBeeld: true });
  await page.click('.site-footer a[href="/privacy/"], footer a[href="/privacy/"]');
  await page.waitForFunction(() => location.pathname === '/privacy/', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  const terug = await page.evaluate(() => ({
    zacht: window.__zacht === 1,
    kantig: document.body.classList.contains('huid-kantig'),
    hal: document.body.classList.contains('hal'),
    letter: /urbanist/i.test(getComputedStyle(document.querySelector('.h-h1') || document.body).fontFamily),
    kop: !!document.querySelector('.h-jur-kop .h-h1'),
  }));
  /* Sinds afvinklijst 19 staat ook /privacy in de hal: de weg terug blijft in de hal, met zijn letter
     en de kop van een juridisch document (JuridischHal). */
  check('en terug naar /privacy: ook de hal, zonder kantige huid', terug, { zacht: true, kantig: false, hal: true, letter: true, kop: true });
  await ctx.close();
}
check('zacht navigeren: geen JS-fout of console-melding', zf, []);

await browser.close();
await new Promise((r) => setTimeout(r, 300));
server.close();
check('geen JS-fout, console-melding of mislukt verzoek', fouten, []);
check('nergens zijwaarts scrollen', meting.filter((m) => m.zijwaarts).map((m) => m.w), []);
check('de twee belletjes raken elkaar nergens', meting.filter((m) => m.raken).map((m) => m.w), []);
check('boven 900 px valt geen belletje achter de balk', meting.filter((m) => m.achterBalk).map((m) => m.w), []);
check('de bediening staat overal binnen het scherm', meting.filter((m) => m.bedieningBuiten).map((m) => m.w), []);
check('/catalog: het script zet de schermen aan (hl-leeft)', meting.filter((m) => LAPTOP.includes(m.pad) && !m.leeft).map((m) => m.w), []);
check('/catalog: de laptop staat erin, de voorpagina heeft hem niet meer', [meting.filter((m) => LAPTOP.includes(m.pad)).every((m) => m.laptop), meting.filter((m) => HAL.includes(m.pad)).some((m) => m.laptop)], [true, false]);
/* De volgorde op de telefoon (kop, knoppen, foto, zin, labels) en de foto tot de rand waren
   van de opening van de voorpagina (levering 64); die is vervangen (levering 74). */

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
