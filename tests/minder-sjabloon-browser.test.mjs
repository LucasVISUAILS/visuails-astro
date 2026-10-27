/**
 * VISUAILS — minder sjabloon (levering 61, afvinklijst 39, 18 oktober 2026).
 *
 *   node tests/minder-sjabloon-browser.test.mjs     (npm run test:sjabloon; draai eerst de build)
 *
 * Lucas stuurde een reel over wat een website "AI-achtig" maakt. Wat hij koos (lijst 39):
 * geen glas, geen zachte schaduwen, niet alles even rond, geen ✦ of emoji als
 * versiering, hover springt in plaats van te glijden, en de gedachtestreepjes kiest hij
 * zelf per zin (in de tekstronde). Deze toets houdt dat zo, op de gebouwde site:
 *   - glas: geen backdrop-filter, op geen enkel element of ::before/::after — met één
 *     uitzondering (afvinklijst 42, 19 oktober 2026, glas 1): het violette glaspaneel van
 *     het €1-blok (.h-proef > .h-proef-woord), want daar staat een bewogen beeld achter;
 *     Sinds levering 74 (25 oktober 2026, 15:24, Lucas: "gebruik voor plekken als top bar
 *     wel glas") ook wat boven de pagina zweeft: de balk, zijn uitklapmenu's, de
 *     WhatsApp-knop en de uitlegbalk zolang hij onderin plakt (ZWEEFT hieronder);
 *   - schaduw: geen schaduw met vervaging (een rand als inset of zonder blur mag), behalve
 *     onder wat zweeft (een glazen laag ligt ergens op) en de gloed in blauw uur onder
 *     Bestellen bovenin ("Gloed mag in accentkleur", dezelfde dag);
 *   - hoeken: geen knop, veld, chip of pil met vier gelijke ronde hoeken van 10 px of meer
 *     (cirkels en pillen die een cirkel zijn tellen niet): wat je bedient heeft één zachte
 *     hoek, linksboven. Tot 25 oktober 2026 gold dit voor elk vlak ("een vlak heeft één
 *     zachte hoek, linksboven"). Die dag veranderde Lucas het: "Wat ik overigens wel aan de
 *     style wil aanpassen is het 1 zachte hoek en de rest harde hoeken systeem voor alles.
 *     Ik wil dit alleen op hele specifieke plekken behouden en niet voor grote kaarten of
 *     objecten en puur alleen voor bijvoorbeeld knoppen. De hoeken van kaarten worden
 *     gewoon heel rond." Een kaart is nu 24 rond aan alle vier de hoeken en een groot vlak
 *     32; dat bewaakt tests/hoekregel-browser. Hier blijft over dat een knop of chip niet
 *     even rond wordt als een kaart. Uitzondering sinds levering 75: Bestellen in de balk, die
 *     zelf een pil is (Lucas koos "een pil van licht glas, zwevend");
 *   - geen ✦, ✧, ✨, ★ of emoji in de zichtbare tekst;
 *   - gedachtestreepjes: niet méér dan nu. Het aantal per pagina staat hieronder vast;
 *     Lucas kiest per zin in de tekstronde, en een nieuw streepje valt hier op;
 *   - hover: geen regel die bij :hover, :focus-visible of :active iets laat verschuiven,
 *     schalen of draaien. Een pijl mag springen, in stappen; de hover van het logo blijft.
 */
import { existsSync } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildStaat } from './lib/build.mjs';

let pass = 0, fail = 0;
const check = (naam, goed, uitleg = '') => {
  if (goed) pass++; else fail++;
  console.log(`${goed ? ' ok  ' : ' FAIL'} ${String(naam).padEnd(64)} ${goed ? '' : uitleg}`);
};

const staat = buildStaat(new URL('../dist/index.html', import.meta.url));
if (!staat.er || staat.oud) {
  console.log(`geen bruikbare build — ${staat.uitleg}`);
  process.exit(1);
}
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const clean = decodeURIComponent(url.pathname).split('/').filter((p) => p && p !== '..');
    let file = join(DIST, ...clean);
    let info = await stat(file).catch(() => null);
    if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
    if (!info) { res.writeHead(404); return res.end('nope'); }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(500); res.end('stuk'); }
});
const poort = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const BASIS = `http://127.0.0.1:${poort}`;

/* Het aantal gedachtestreepjes (—) in de zichtbare tekst, per pagina, zoals het op
   18 oktober 2026 stond. Minder mag (dan zegt de toets dat het getal omlaag kan); meer
   niet. Lucas kiest per zin in de tekstronde (lijst 39, v39-streep b). */
const STREEPJES = {
  '/': 1, '/about/': 1, '/ai-act/': 9, '/catalog/': 6, '/catalog/classic/': 2, '/catalog/custom/': 1, '/compare/': 4,
  '/contact/': 2, '/cookie-policy/': 15, '/custom-models/': 2, '/data-processing-agreement/': 28, '/editions/': 2,
  '/faq/': 1, '/gallery/': 1, '/guides/': 3, '/how-it-works/': 3, '/lifestyle/': 3, '/lifestyle/custom/': 1,
  '/lifestyle/dunes/': 2, '/lifestyle/flash/': 2, '/lifestyle/glow/': 2, '/lifestyle/phone-made/': 2, '/models/': 1,
  '/nl/': 1, '/nl/404/': 1, '/nl/about/': 1, '/nl/ai-act/': 9, '/nl/catalog/': 5, '/nl/catalog/classic/': 1,
  '/nl/catalog/custom/': 1, '/nl/compare/': 4, '/nl/contact/': 2, '/nl/cookie-policy/': 15, '/nl/custom-models/': 2,
  '/nl/data-processing-agreement/': 28, '/nl/editions/': 2, '/nl/faq/': 1, '/nl/gallery/': 1, '/nl/guides/': 3,
  '/nl/how-it-works/': 2, '/nl/lifestyle/': 2, '/nl/lifestyle/custom/': 1, '/nl/lifestyle/dunes/': 1, '/nl/lifestyle/flash/': 1,
  '/nl/lifestyle/glow/': 1, '/nl/lifestyle/phone-made/': 1, '/nl/models/': 1, '/nl/per-product/': 4, '/nl/plans/': 1,
  '/nl/pricing/': 3, '/nl/privacy/': 51, '/nl/start/': 1, '/nl/start/brand-model/': 1, '/nl/start/catalog/': 1,
  '/nl/start/custom-look/': 4, '/nl/start/lifestyle/': 1, '/nl/start/plan/': 6, '/nl/start/video/': 3, '/nl/studio/': 8,
  '/nl/terms/': 59, '/nl/test-sample/': 3, '/nl/thank-you/': 4, '/nl/upload-guidelines/': 4, '/nl/video/': 6,
  '/nl/video/campaign/': 4, '/nl/video/custom/': 6, '/nl/video/lifestyle/': 6, '/nl/video/motion/': 4, '/per-product/': 4,
  '/plans/': 1, '/pricing/': 3, '/privacy/': 50, '/start/': 1, '/start/brand-model/': 1, '/start/catalog/': 1,
  '/start/custom-look/': 4, '/start/lifestyle/': 1, '/start/plan/': 6, '/start/video/': 3, '/studio/': 7,
  '/terms/': 57, '/test-sample/': 3, '/thank-you/': 4, '/upload-guidelines/': 4, '/video/': 6, '/video/campaign/': 4,
  '/video/custom/': 6, '/video/lifestyle/': 6, '/video/motion/': 4,
};

const PAGINAS = Object.keys(STREEPJES);
const BREEDTES = [1440, 390];


function meet() {
  /* Een pijl mag bij hover springen: in stappen (steps) of zonder overgang. Wat glijdt
     of doorveert, faalt. De enige uitzondering is de hover van het logo in de balk (het
     V-merk met zijn echo, .mk): die blijft zoals hij is (lijst 39, c-hover). Alleen de
     pijlen en plaatjes mogen bewegen; een kaart, foto of knop zelf niet. */
  const LOGO = /\.mk\b|mk-line/;
  const PIJL = /ik-kop|ik-schacht|ik-pijl|\.h-cirkel|h-look-pijl|h-ug-pijl|nav-cta[^,{]*::after|svg|path/;
  const naam = (el, ps = '') => (el.tagName.toLowerCase() + [...el.classList].filter((c) => !/^(vs-|astro-)/.test(c)).slice(0, 3).map((c) => '.' + c).join('') + ps);
  const zacht = (s) => {
    if (!s || s === 'none') return false;
    return s.split(/,(?![^(]*\))/).some((laag) => {
      if (/inset/.test(laag)) return false;
      const maten = laag.replace(/rgba?\([^)]*\)|#[0-9a-f]+/gi, ' ').trim().split(/\s+/).filter((w) => /^-?[\d.]+px$/.test(w));
      return maten.length >= 3 && parseFloat(maten[2]) > 0;
    });
  };
  const uit = { glas: [], schaduw: [], hoek: [], teken: [], streepjes: 0, hover: [] };
  for (const el of document.querySelectorAll('body *')) {
    const rc = el.getBoundingClientRect(); if (rc.width < 1 || rc.height < 1) continue;
    for (const ps of ['', '::before', '::after']) {
      const cs = getComputedStyle(el, ps || null);
      if (ps && (cs.content === 'none' || cs.content === 'normal')) continue;
      const bd = cs.backdropFilter || cs.webkitBackdropFilter;
      // het €1-blok mag glas dragen (lijst 42), en wat boven de pagina zweeft (levering 74)
      const zweeft = el.matches('.site-header .nav, .site-header .nav-menu, .wa-launcher, .u-balk');
      const glasMag = (!ps && el.matches('.h-proef > .h-proef-woord')) || zweeft;
      if (bd && bd !== 'none' && !glasMag) uit.glas.push(naam(el, ps));
      if (zacht(cs.boxShadow) && !zweeft && !el.matches('.site-header .nav-cta')) uit.schaduw.push(`${naam(el, ps)} ${cs.boxShadow.slice(0, 60)}`);
      if (ps && /[✦✧✨★☆]/u.test(cs.content)) uit.teken.push(`${naam(el, ps)} ${cs.content}`);
      if (ps) continue;
      const rs = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
      /* alleen wat je bedient (25 oktober 2026): een kaart mag rondom rond zijn */
      const bediening = el.matches('button, input:not([type="checkbox"]):not([type="radio"]), select, textarea, [role="button"], [role="tab"], .h-chip, .h-pil, .chip, .pill')
        || (el.tagName === 'A' && /(^|[\s-])(knop|btn|cta)/.test(el.className || ''));
      /* levering 75 (25 oktober 2026, 23:35): Lucas koos de balk als zwevende pil van licht glas,
         met Bestellen erin als pil (de vorm van de balk); de knop in de balk telt hier niet */
      const inPil = el.matches('.site-header .nav-cta');
      if (bediening && !inPil && rs.every((x) => x === rs[0]) && rs[0] !== '0px' && !rs[0].includes('%')) {
        const v = parseFloat(rs[0]);
        const rond = Math.abs(rc.width - rc.height) <= 1.5 && v >= rc.width / 2 - 1;
        const zichtbaar = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderTopWidth !== '0px' || cs.boxShadow !== 'none' || el.tagName === 'IMG' || cs.overflow === 'hidden';
        if (v >= 10 && !rond && zichtbaar && rc.width >= 24 && rc.height >= 16 && cs.visibility !== 'hidden') uit.hoek.push(`${naam(el)} ${rs[0]} ${Math.round(rc.width)}x${Math.round(rc.height)}`);
      }
    }
  }
  const tekst = document.body.innerText;
  const tekens = tekst.match(/[✦✧✨★☆]|(?![©®™])\p{Emoji_Presentation}/gu);
  if (tekens) uit.teken.push(...new Set(tekens));
  uit.streepjes = (tekst.match(/—/g) || []).length;
  /* De stijlregels zelf: een hover die verschuift, schaalt of draait. Een regel die
     het terugzet (scale: 1, translate: 0, transform: none) beweegt niets. */
  const rust = (p, v) => {
    if (v === 'none' || v === 'initial' || v === 'unset') return true;
    const getallen = (t) => (t.match(/-?[\d.]+/g) || []).map(Number);
    if (p === 'scale') return getallen(v).every((x) => x === 1);
    if (p === 'translate' || p === 'rotate') return getallen(v).every((x) => x === 0);
    return [...v.matchAll(/(\w+)\(([^)]*)\)/g)].every(([, f, a]) => (/^scale/.test(f) ? getallen(a).every((x) => x === 1) : getallen(a).every((x) => x === 0)));
  };
  const regels = [];
  const loop = (lijst) => { for (const r of lijst) { if (r.cssRules && !r.selectorText) loop(r.cssRules); else if (r.selectorText) regels.push(r); } };
  for (const sh of document.styleSheets) { try { loop(sh.cssRules); } catch { /* andere bron */ } }
  for (const r of regels) {
    if (!/:hover|:focus-visible|:active/.test(r.selectorText)) continue;
    for (const p of ['transform', 'translate', 'scale', 'rotate']) {
      const v = r.style.getPropertyValue(p).trim();
      if (!v || rust(p, v)) continue;
      const naamRegel = `${r.selectorText.slice(0, 90)} { ${p}: ${v} }`;
      if (LOGO.test(r.selectorText)) continue;
      if (!PIJL.test(r.selectorText)) { uit.hover.push(naamRegel); continue; }
      /* Een pijl: kijk naar de elementen zelf. Hun overgang voor transform moet in
         stappen zijn, of er is geen overgang. */
      const zonder = r.selectorText.replace(/:(hover|focus-visible|focus-within|active)/g, '').replace(/::(before|after)/g, '');
      let els = [];
      try { els = [...document.querySelectorAll(zonder)].slice(0, 6); } catch { /* selector die niet zonder kan */ }
      for (const el of els) {
        const ps = /::after/.test(r.selectorText) ? '::after' : /::before/.test(r.selectorText) ? '::before' : null;
        const c = getComputedStyle(el, ps);
        const props = c.transitionProperty.split(/,\s*/);
        const tf = c.transitionTimingFunction.split(/,(?![^(]*\))\s*/);
        const du = c.transitionDuration.split(/,\s*/);
        let k = props.findIndex((q) => /^(transform|translate|scale|rotate)$/.test(q));
        if (k < 0) k = props.indexOf('all');
        if (k < 0) continue;
        const t = tf[k % tf.length], d = parseFloat(du[k % du.length]);
        if (d > 0 && !/steps|step-/.test(t)) { uit.hover.push(`${naamRegel} glijdt (${d}s ${t.slice(0, 30)})`); break; }
      }
    }
  }
  return uit;
}

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXECUTABLE) ? { executablePath: EXECUTABLE } : {});
const hoverFout = new Set();
const zakken = [];
try {
  for (const w of BREEDTES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    for (const p of PAGINAS) {
      await page.goto(BASIS + p, { waitUntil: 'load' });
      await page.waitForTimeout(120);
      const r = await page.evaluate(meet);
      check(`${p} op ${w}: geen glas`, r.glas.length === 0, r.glas.slice(0, 3).join(' · '));
      check(`${p} op ${w}: geen zachte schaduw`, r.schaduw.length === 0, r.schaduw.slice(0, 3).join(' · '));
      check(`${p} op ${w}: geen knop of chip met vier gelijke ronde hoeken`, r.hoek.length === 0, r.hoek.slice(0, 3).join(' · '));
      check(`${p} op ${w}: geen ✦ of emoji`, r.teken.length === 0, r.teken.slice(0, 5).join(' '));
      check(`${p} op ${w}: niet meer gedachtestreepjes (${r.streepjes} van ${STREEPJES[p]})`, r.streepjes <= STREEPJES[p], `nieuw: ${r.streepjes - STREEPJES[p]}`);
      if (w === 1440 && r.streepjes < STREEPJES[p]) zakken.push(`${p}: ${r.streepjes}`);
    }
    await ctx.close();
  }
  /* De overgangen bij hover: zonder "minder beweging", want die zet alle overgangen
     op nul en dan zou een glijdende pijl hier niet opvallen. */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const p of PAGINAS) {
    await page.goto(BASIS + p, { waitUntil: 'load' });
    const r = await page.evaluate(meet);
    for (const h of r.hover) hoverFout.add(`${h} (${p})`);
  }
  await ctx.close();
  check('hover laat niets glijden (verschuiven, schalen, draaien)', hoverFout.size === 0, [...hoverFout].slice(0, 4).join(' · '));
} finally {
  await browser.close();
  server.close();
}
if (zakken.length) console.log(`\n(minder streepjes dan vastgelegd, het getal kan omlaag: ${zakken.join(', ')})`);
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
