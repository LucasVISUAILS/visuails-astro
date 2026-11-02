/**
 * VISUAILS — de letter en de lucht van 80 in Studio, de privélink en /admin (levering 82, 2 november 2026).
 *
 *   node tests/werkplaats-82.test.mjs        (npm run test:werkplaats82; draai eerst de build)
 *
 * Lucas, 01:52: "Ja door met Studio en admin". Zijn keuzes: de letter van 80 in alle drie (lopende tekst 370,
 * wat 500 was 450); alleen de paginakop van Studio en de privélink in VISUAILS Display, in hoofdletters (kleine
 * koppen in kaarten en heel /admin blijven DM Sans); Studio en de privélink één stap ruimer op de 4 : 3-schaal,
 * /admin blijft dicht. De maten staan in studio-hal.css en portal.css (blok "LEVERING 82").
 *
 *   1 · de bestanden: VISUAILS Display als @font-face in studio-hal.css en in /fonts/gedeeld.css (de privélink),
 *       vooraf geladen in StudioLayout en op de privélink;
 *   2 · Studio in de browser (NL en EN, 1280 en 390): de letter 370 en nergens DM Sans op 400 of 500, de kop in
 *       Display Bold in hoofdletters op hoogstens twee regels (ook met een lange voornaam), de marge 51 / 21, de
 *       blokken 51 uit elkaar, niets zijwaarts;
 *   3 · de privélink: idem, de kop "Je bestelling" en de pagina's zonder bestelling, de marge 28 / 21, de blokken
 *       28 uit elkaar;
 *   4 · /admin: de letter 370 en nergens DM Sans op 400 of 500; de kop blijft DM Sans.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startStudio, VOLT } from './lib/studio-worker.mjs';
import { mintToken, hashToken } from '../src/lib/token.js';
import { browserPad } from '../scripts/lib/browserpad.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let goed = 0, fout = 0;
const ok = (naam, cond, extra = '') => { if (cond) goed++; else fout++; console.log(`${cond ? ' ok  ' : ' FAIL'} ${naam}${cond || !extra ? '' : ` — ${extra}`}`); };

/* ── 1 · de bestanden ────────────────────────────────────────────────────── */
console.log('\n1 · de bestanden');
const face = /@font-face \{ font-family: ['"]VISUAILS Display['"]; font-style: normal; font-weight: 700;[^}]*\/fonts\/visuails-display\/VISUAILSDisplay-Bold\.woff2/;
ok('studio-hal.css: VISUAILS Display Bold als @font-face', face.test(lees('src/styles/studio-hal.css')));
ok('/fonts/gedeeld.css (de privélink): VISUAILS Display Bold', face.test(lees('scripts/fonts-voor-worker.mjs')));
const voor = /<link rel="preload" as="font" type="font\/woff2" href="\/fonts\/visuails-display\/VISUAILSDisplay-Bold\.woff2" crossorigin/;
ok('vooraf geladen in StudioLayout en op de privélink', voor.test(lees('src/layouts/StudioLayout.astro')) && voor.test(lees('src/lib/portal.js')));
ok('/admin laadt hem niet vooraf (daar staat geen kop in die letter)', !/visuails-display/.test(lees('src/lib/admin.js')));

/* ── de browser ──────────────────────────────────────────────────────────── */
const adminToken = await mintToken();
const portaal = await mintToken();
const studio = await startStudio({ extraSql: [
  `INSERT INTO admin_users (id, email, password_hash) VALUES (982, 'studio@visuails.com', 'x')`,
  `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (982, 982, '${await hashToken(adminToken)}', '2099-01-01T00:00:00Z')`,
  `INSERT INTO order_tokens (order_id, token_hash) VALUES (7090, '${await hashToken(portaal)}')`,
] });
const host = new URL(studio.url).hostname;
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

/* Wat elke pagina meet: de letter van body, DM Sans op 400 of 500 met eigen tekst, de kop, de marge en de gaten. */
const METING = (sel) => {
  const dik = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('svg, option, select, [aria-hidden="true"]')) continue;
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(e);
    if (s.display === 'none' || !/DM Sans/.test(s.fontFamily.split(',')[0])) continue;
    if (s.fontWeight === '400' || s.fontWeight === '500') dik.push(`${s.fontWeight} ${e.tagName}.${String(e.className).split(' ')[0]}`);
  }
  const h = document.querySelector('h1');
  const hs = getComputedStyle(h);
  const regels = () => Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight));
  const kop = { fam: hs.fontFamily.split(',')[0].replace(/"/g, ''), fw: hs.fontWeight, tt: hs.textTransform, regels: regels() };
  /* de langste welkomstkop: een lange voornaam */
  if (h.classList.contains('st-h1') && h.querySelector('.l')) { const n = h.lastChild; const oud = n.textContent; n.textContent = ' Maximiliaan'; kop.lang = regels(); n.textContent = oud; }
  const blok = sel ? document.querySelector(sel.blok) : null;
  const k = blok ? [...blok.children].filter((c) => c.getBoundingClientRect().height > 0) : [];
  const gaten = []; for (let i = 1; i < k.length; i++) gaten.push(Math.round(k[i].getBoundingClientRect().top - k[i - 1].getBoundingClientRect().bottom));
  const rand = sel ? Math.round(parseFloat(getComputedStyle(document.querySelector(sel.rand)).paddingLeft)) : 0;
  return { body: getComputedStyle(document.body).fontWeight, dik: [...new Set(dik)], kop, gaten, rand, zij: document.documentElement.scrollWidth > innerWidth + 1 };
};
async function open(pad, breed, koekjes) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: 900 } });
  await ctx.addCookies(koekjes.map(([name, value]) => ({ name, value, domain: host, path: '/' })));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 160)));
  const r = await page.goto(studio.url + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.load('700 40px "VISUAILS Display"').then(() => document.fonts.ready));
  return { ctx, page, fouten, status: r.status() };
}

try {
  /* ── 2 · Studio ── */
  console.log('\n2 · Studio');
  for (const breed of [1280, 390]) {
    for (const pad of ['/account', '/account/orders', '/account/plan', '/account/plan?tab=credits', '/account/invoices', '/account/details', '/account/brand-kit', '/account?lang=en', '/account/plan?lang=en']) {
      const { ctx, page, fouten, status } = await open(pad, breed, [['vis_account', VOLT.token]]);
      const m = await page.evaluate(METING, { blok: '.st-main', rand: '.st-main' });
      const tag = `${breed} ${pad}`;
      ok(`${tag}: lopende tekst 370, nergens DM Sans op 400 of 500`, status === 200 && m.body === '370' && !m.dik.length, `${status} ${m.body} ${m.dik.slice(0, 3).join(', ')}`);
      ok(`${tag}:   de kop in VISUAILS Display 700, hoofdletters, hoogstens twee regels${m.kop.lang ? ' (ook met een lange naam)' : ''}`, m.kop.fam === 'VISUAILS Display' && m.kop.fw === '700' && m.kop.tt === 'uppercase' && m.kop.regels <= 2 && (m.kop.lang ?? 1) <= 2, JSON.stringify(m.kop));
      ok(`${tag}:   de marge ${breed > 720 ? 51 : 21}, de blokken 51 uit elkaar (of 49 na de filters), niets zijwaarts, geen scriptfout`, m.rand === (breed > 720 ? 51 : 21) && m.gaten.every((g) => g === 51 || g === 49) && !m.zij && !fouten.length, `${m.rand} [${m.gaten.join(' ')}] ${m.zij ? 'ZIJWAARTS' : ''} ${fouten[0] || ''}`);
      await ctx.close();
    }
  }

  /* ── 3 · de privélink ── */
  console.log('\n3 · de privélink');
  for (const breed of [1280, 390]) {
    {
      const { ctx, page, fouten, status } = await open(`/o/${portaal}`, breed, []);
      const m = await page.evaluate(METING, { blok: '.wrap > main', rand: '.wrap' });
      ok(`${breed} /o/…: lopende tekst 370, nergens DM Sans op 400 of 500`, status === 200 && m.body === '370' && !m.dik.length, `${status} ${m.body} ${m.dik.slice(0, 3).join(', ')}`);
      ok(`${breed} /o/…:   de kop in VISUAILS Display 700, hoofdletters, hoogstens twee regels`, m.kop.fam === 'VISUAILS Display' && m.kop.fw === '700' && m.kop.tt === 'uppercase' && m.kop.regels <= 2, JSON.stringify(m.kop));
      /* De tip ligt tegen de kop (0); de noot onder de feiten 21; de rest 28. */
      ok(`${breed} /o/…:   de marge ${breed > 560 ? 28 : 21}, de blokken 28 uit elkaar (de noot 21), niets zijwaarts`, m.rand === (breed > 560 ? 28 : 21) && m.gaten.length >= 4 && m.gaten.every((g) => [0, 21, 28].includes(g)) && !m.zij && !fouten.length, `${m.rand} [${m.gaten.join(' ')}] ${fouten[0] || ''}`);
      await ctx.close();
    }
    for (const breed2 of [breed, 341]) {
      const { ctx, page, status } = await open('/o/bestaat-niet-0000000000000000000000', breed2, []);
      /* de langste kop van een pagina zonder bestelling erin */
      const r = await page.evaluate(() => { const h = document.querySelector('h1'); const uit = []; for (const t of ['We kunnen je bestelling nu niet bereiken', 'We cannot reach your order right now', 'Je bestelling staat achter een privélink']) { h.textContent = t; uit.push(Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight))); } return uit; });
      ok(`${breed2} een pagina zonder bestelling: de langste koppen op hoogstens ${breed2 <= 340 ? 3 : 2} regels`, status >= 200 && r.every((n) => n <= (breed2 <= 340 ? 3 : 2)), r.join(' '));
      await ctx.close();
    }
  }

  /* ── 4 · /admin ── */
  console.log('\n4 · /admin');
  for (const breed of [1280, 390]) {
    for (const pad of ['/admin', '/admin/customers', `/admin/customers/${VOLT.id}`, '/admin/planning', '/admin/abonnees', '/admin/facturen', '/admin/log']) {
      const { ctx, page, fouten, status } = await open(pad, breed, [['vis_admin', adminToken]]);
      const m = await page.evaluate(METING, null);
      ok(`${breed} ${pad}: lopende tekst 370, nergens DM Sans op 400 of 500; de kop blijft DM Sans; geen scriptfout`, status === 200 && m.body === '370' && !m.dik.length && m.kop.fam === 'DM Sans' && !fouten.length, `${status} ${m.body} ${m.dik.slice(0, 3).join(', ')} ${m.kop.fam} ${fouten[0] || ''}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await studio.dispose();
}
console.log(`\n${goed} goed, ${fout} fout`);
process.exit(fout ? 1 : 0);
