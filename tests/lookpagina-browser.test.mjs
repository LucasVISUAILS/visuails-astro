/* VISUAILS — de lookpagina's, kort en beeldvullend, in de browser. 11 oktober 2026 (k101 = a, K5 punt 5).
 * Sinds 12 oktober 2026 (avond) in de hal: LookDetailHal.astro (afvinklijst 8,
 * k-looks "doen"). Dezelfde eisen, op de haakjes van de hal (.h-lk, .h-lk-slot,
 * .h-lk-held, de koppen als pil).
 *
 *   npx astro build && node tests/lookpagina-browser.test.mjs     (via zwaar.sh)
 *
 * Elke /lifestyle/<slug> en /catalog/<slug>, NL en EN, uit dist/:
 *   · titel, meta-beschrijving, canonical en JSON-LD staan er (ongewijzigd door de
 *     route; hier: aanwezig en wijzend naar de eigen url);
 *   · alleen echte beelden: geen plaatshouder ("FOTO VOLGT"), geen getekend vak;
 *   · de drie korte koppen uit de lookdata (kleding, gevoel, kanalen);
 *   · de lange uitleg in een ingeklapte <details>;
 *   · onderaan "Kies deze look" naar het formulier met de look gekozen, en
 *     "Probeer VISUAILS · €1" naar de proef met de look.
 * Dan in Chromium, op 390 en 1280 px: geen horizontale scroll, tekst minstens
 * 11,5 px en 4,5:1, het eerste beeld vult de breedte. Schermafdrukken van twee
 * pagina's in .render/ (look-*.png).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { styles as lsEn } from '../src/data/styles.js';
import { styles as lsNl } from '../src/data/styles.nl.js';
import { catalogStyles as catEn } from '../src/data/catalogStyles.js';
import { catalogStyles as catNl } from '../src/data/catalogStyles.nl.js';
import { TEST_SAMPLE } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.render');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!fs.existsSync(path.join(DIST, 'lifestyle/flash/index.html'))) { console.log(' FAIL er is geen dist/ — bouw eerst'); process.exit(1); }
const ontsnap = (s) => String(s).replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

/* ── 1 · DE HTML ─────────────────────────────────────────────────────────── */
const KOPPEN = { nl: ['Voor welke kleding', 'Welk gevoel', 'Welke kanalen'], en: ['What clothing', 'What it feels like', 'Which channels'] };
const paginas = [];
for (const [lang, pre, ls, cat] of [['en', '', lsEn, catEn], ['nl', 'nl/', lsNl, catNl]]) {
  for (const [dienst, lijst] of [['lifestyle', ls], ['catalog', cat]]) {
    for (const s of lijst) {
      const rel = `${pre}${dienst}/${s.slug}/index.html`;
      const html = ontsnap(fs.readFileSync(path.join(DIST, rel), 'utf8'));
      const url = `https://visuails.com/${pre}${dienst}/${s.slug}/`.replace(/\/$/, '');
      const tag = `${lang} /${dienst}/${s.slug}`;
      paginas.push({ lang, pre, dienst, s, url: `/${pre}${dienst}/${s.slug}/` });
      ok(`${tag}: titel en meta`, new RegExp(`<title>${s.name} — `).test(html) && /<meta name="description" content="[^"]{40,}"/.test(html));
      ok(`${tag}: canonical naar zichzelf`, new RegExp(`<link rel="canonical" href="${url.replace(/[.]/g, '\\.')}/?"`).test(html), (html.match(/<link rel="canonical"[^>]*>/) || [''])[0]);
      ok(`${tag}: JSON-LD met het kruimelpad`, /<script type="application\/ld\+json">[\s\S]*BreadcrumbList/.test(html));
      ok(`${tag}: geen plaatshouder of getekend vak`, !/FOTO VOLGT|PHOTO TO FOLLOW|class="[^"]*\bscene\b|ps-icon/.test(html));
      const begin = html.indexOf('class="h-pagina h-lk');
      ok(`${tag}: de lookpagina staat in de hal (.h-lk)`, begin > 0);
      const lk = begin > 0 ? html.slice(begin, html.lastIndexOf('</main>') > begin ? html.lastIndexOf('</main>') : undefined) : '';
      for (const [i, k] of ['kleding', 'gevoel', 'kanalen'].entries()) {
        ok(`${tag}: kop "${KOPPEN[lang][i]}" met de regel uit de lookdata`, lk.includes(`<span>${KOPPEN[lang][i]}</span></h2>`) && lk.includes(s.kort[k]));
      }
      ok(`${tag}: de lange uitleg ingeklapt (<details> zonder open)`, /<details class="dc dc-plain"(?![^>]*\sopen)[^>]*>\s*<summary class="dc-sum"[^>]*>\s*<span class="dc-label"[^>]*>(Meer over|More about) /.test(lk));
      const kies = s.orderLabel ?? (lang === 'nl' ? 'Kies deze look' : 'Choose this look');
      const slot = lk.slice(lk.indexOf('class="h-lk-slot'));
      /* De inktknop van de hal draagt na zijn woorden een pijl (<span class="o">). */
      const knop = (href, label) => new RegExp(`href="${href.replace(/[?.]/g, '\\$&')}"[^>]*>${label.replace(/[.·]/g, '\\$&')}(?:<span class="o"[^>]*>[\\s\\S]*?</span>)?</a>`).test(slot);
      ok(`${tag}: onderaan "${kies}" naar ${s.orderHref}`, knop(s.orderHref, kies), (slot.match(/<a class="h-knop h-knop-inkt"[^>]*>[^<]*/) || [''])[0]);
      const proef = s.slug === 'custom' ? `/${pre}test-sample/` : `/${pre}test-sample/?style=${s.slug}`;
      ok(`${tag}: en "${TEST_SAMPLE[lang].cta}" naar de proef${s.slug === 'custom' ? '' : ' met de look'}`, knop(proef, TEST_SAMPLE[lang].cta));
      if (dienst === 'lifestyle' && s.slug !== 'custom') ok(`${tag}: het formulier krijgt de look mee (?style=${s.slug})`, s.orderHref.includes(`?style=${s.slug}`));
    }
  }
}

/* ── 2 · IN DE BROWSER ─────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
/* Een vrije poort, gekozen bij het starten (14 oktober 2026). Hier stond een vaste
   poort die drie toetsen deelden; UITROLLEN.bat draait vier toetsen tegelijk, en
   dan viel de tweede om op een bezette poort. */
let PORT = 0;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(String(req.url).split('?')[0]);
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, () => { PORT = server.address().port; r(); }));
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

const METING = `(() => {
  const rgba = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const uit = { gemeten: 0, klein: [], laag: [] };
  for (const el of document.querySelectorAll('.h-lk h1, .h-lk .h-lk-tagline, .h-lk .h-pil, .h-lk .h-lk-regel, .h-lk .h-lk-bewijs-tekst *, .h-lk .dc-label, .h-lk .h-lk-slot h2, .h-lk .h-lk-slot .h-feiten li, .h-lk .h-lk-queue, .h-lk .h-lk-slot .h-knop')) {
    if (el.closest('[hidden]') || !el.getClientRects().length) continue;
    const t = (el.innerText || '').trim(); if (!t) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(getComputedStyle(el).color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(getComputedStyle(el).fontSize);
    uit.gemeten++;
    if (px < 11.5) uit.klein.push(t.slice(0, 30) + ' ' + px + 'px');
    if (ratio + 0.01 < 4.5) uit.laag.push(t.slice(0, 30) + ' ' + ratio.toFixed(2));
  }
  const held = document.querySelector('.h-lk-held');
  uit.held = held ? Math.round(held.getBoundingClientRect().width / window.innerWidth * 100) : 0;
  uit.heldSoort = held ? (/paar-916-916/.test(held.className) ? 'twee hoge' : held.className.match(/is-(paar|staand|liggend)/)?.[1]) : '';
  /* Niets bijgesneden in het eerste beeld: de verhouding van het vak is die van het beeld (±20%). */
  uit.heldKlopt = !held || [...held.querySelectorAll('img')].every((i) => { const r = i.getBoundingClientRect(); const vak = r.width / r.height; const echt = i.naturalWidth / i.naturalHeight; return !i.naturalWidth || Math.abs(vak / echt - 1) < 0.2; });
  uit.beelden = [...document.querySelectorAll('.h-lk img')].map((i) => i.getAttribute('src'));
  uit.kapot = [...document.querySelectorAll('.h-lk img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src'));
  uit.scroll = document.documentElement.scrollWidth - window.innerWidth;
  return uit;
})()`;

const FOTO = new Set(['/lifestyle/flash/', '/nl/catalog/classic/']);
try {
  for (const p of paginas) {
    for (const breed of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: breed, height: 900 } });
      await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-10-11T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}${p.url}`, { waitUntil: 'load' });
      /* Alle beelden echt laden (ze staan op lazy): eager zetten, door de pagina
         lopen en wachten tot elk beeld geladen of mislukt is. */
      await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('.h-lk img')];
        for (const i of imgs) i.loading = 'eager';
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 4000); }))));
        window.scrollTo(0, 0);
      });
      const m = await page.evaluate(METING);
      const tag = `${p.lang} ${p.url} ${breed}px`;
      ok(`${tag}: geen horizontale scroll`, m.scroll <= 1, `${m.scroll}px`);
      ok(`${tag}: tekst minstens 11,5 px en 4,5:1`, m.gemeten >= 8 && !m.klein.length && !m.laag.length, `${m.gemeten} · ${m.klein.concat(m.laag).slice(0, 4).join(' | ')}`);
      if (m.beelden.length) ok(`${tag}: het eerste beeld vult de breedte (${m.held}%, ${m.heldSoort})`, m.heldSoort === 'staand' || m.held >= (m.heldSoort === 'twee hoge' && breed > 700 ? 70 : breed === 390 ? 85 : 90));
      if (m.beelden.length) ok(`${tag}: het eerste beeld is niet zwaar bijgesneden`, m.heldKlopt);
      ok(`${tag}: geen kapot beeld`, !m.kapot.length, m.kapot.join(', '));
      if (FOTO.has(p.url)) await page.screenshot({ path: path.join(OUT, `look-${p.url.replace(/\//g, '-').replace(/^-|-$/g, '')}-${breed}.png`), fullPage: true });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
