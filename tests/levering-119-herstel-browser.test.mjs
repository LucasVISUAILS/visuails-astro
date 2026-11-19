/* VISUAILS — levering 119 (18 november 2026), herstel na het naspelen (N5 → hersteller H10), in een echte browser.
 *
 *   node tests/levering-119-herstel-browser.test.mjs     (vraagt een verse build: npx astro build)
 *
 *   L-04    het bestelformulier heeft het bericht als <textarea name="message">, en het controlescherm leest dat veld
 *           (in de gebouwde pagina: de nep-DOM van levering-119-bestelformulier zag het verschil niet);
 *   P1-13   de WhatsApp-knop ligt op 390 px stilstaand nooit over tekst die net binnenkwam (1,5 s per stap);
 *   D1-07   alle koppen (h1, h2, h3, ook die nog binnenkomen) hoogstens twee regels op 320, 340, 360 en 390 px, NL en
 *           EN; de Engelse voorpagina met een Engelse browser;
 *   P6-26   bij een dichte proef zegt ook de voetlink, het telefoonmenu en de knop in de €1-melding "op de wachtlijst";
 *   D1-13   het Studiobrief-veld is op 768 en 1000 px even breed als de knop en staat links;
 *   besluit video op aanvraag: de video-intake in Studio noemt geen optieprijzen (door de echte Studio-Worker; niet
 *           tegelijk met test:opmaat-browser en opmaat3d-browser draaien, zie notities H9).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!existsSync(path.join(DIST, 'nl/start/catalog/index.html'))) {
  console.log(' FAIL er is geen dist/ — bouw eerst (npx astro build)');
  process.exit(1);
}

const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const SITE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: browserPad() });
const KEUZE = encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-11-18T00:00:00.000Z' }));
async function open(pad, breed, { locale = 'nl-NL', proef = 'open', hoog = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, locale });
  await ctx.addCookies([{ name: 'vis_consent', value: KEUZE, url: SITE }]);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  /* de laatste route gaat voor: de stand van de proef */
  await ctx.route('**/api/proef-stand', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stand: proef }) }));
  await ctx.route('**/account/me**', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: 'null' }));
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(e.message));
  await page.goto(SITE + pad, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, fouten };
}

/* ── L-04 ──────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nL-04 · "Je bericht" op het controlescherm');
{
  const { ctx, page } = await open('/nl/start/catalog/', 1280);
  const v = await page.evaluate(() => ({ ta: document.querySelectorAll('#pl-form textarea[name="message"]').length, inp: document.querySelectorAll('#pl-form input[name="message"]').length }));
  ok('het bericht is een <textarea name="message"> (geen <input>)', v.ta === 1 && v.inp === 0, JSON.stringify(v));
  await ctx.close();
  const pipe = readFileSync(path.join(ROOT, 'src/scripts/pipeline.js'), 'utf8');
  const i = pipe.indexOf('function renderSummary(');
  const som = pipe.slice(i, pipe.indexOf('\nfunction ', i + 10));
  ok('renderSummary leest textarea[name="message"] (value() zoekt alleen een input)', /q\('textarea\[name="message"\]'\)/.test(som) && !/value\('message'\)/.test(som));
}

/* ── P1-13 ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP1-13 · de WhatsApp-knop stilstaand nooit over tekst (390 px, elke 120 px, 1,2 s per stap)');
const meetWa = () => {
  const d = document.querySelector('.wa-dock');
  if (!d) return { zicht: false };
  const knop = d.querySelector('.wa-launcher') || d; const q = knop.getBoundingClientRect(); const cs = getComputedStyle(d);
  const zicht = q.width > 0 && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.1 && !d.classList.contains('is-weg') && !d.classList.contains('is-wacht');
  if (!zicht) return { zicht: false };
  const raak = (r) => r.right > q.left && r.left < q.right && r.bottom > q.top && r.top < q.bottom && r.width > 0;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const onder = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.textContent.trim() || d.contains(n)) continue;
    const pe = n.parentElement; if (pe.closest('.wa-dock, .h-melding, [aria-hidden="true"]')) continue;
    let el = pe, o = 1; while (el) { o *= parseFloat(getComputedStyle(el).opacity); el = el.parentElement; }
    if (o < 0.5) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) if (raak(r)) { onder.push(n.textContent.trim().slice(0, 40)); break; }
  }
  return { zicht: true, onder };
};
for (const pad of ['/nl/', '/nl/how-it-works/', '/nl/pricing/']) {
  const { ctx, page, fouten } = await open(pad, 390, { hoog: 780 });
  await page.waitForTimeout(1500);
  await page.locator('[data-vis-melding-sluit]').first().click({ timeout: 1500 }).catch(() => {});
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  let zicht = 0; const over = [];
  for (let y = 0; y < H - 780; y += 120) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(meetWa);
    if (r.zicht) { zicht++; if (r.onder.length) over.push(r.onder[0]); }
  }
  ok(`${pad}: ${zicht}× zichtbaar, 0× over tekst`, zicht > 0 && over.length === 0, over.slice(0, 4).join(' | '));
  ok('  geen scriptfouten', !fouten.length, fouten.join(' | '));
  await ctx.close();
}

/* ── D1-07 ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nD1-07 · koppen hoogstens twee regels op 320 – 390 px (ook die nog binnenkomen)');
const telKoppen = () => {
  const uit = [];
  for (const h of document.querySelectorAll('h1, h2, h3')) {
    if (h.closest('.sr-only, .visually-hidden, [hidden], dialog:not([open]), details:not([open]) > :not(summary)')) continue;
    let el = h, weg = false; while (el) { const c = getComputedStyle(el); if (c.display === 'none' || c.visibility === 'hidden') { weg = true; break; } el = el.parentElement; }
    if (weg) continue;
    const r = h.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) continue;
    const cs = getComputedStyle(h); if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') continue;
    const tops = []; const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim() || n.parentElement.closest('.h-een, .b94-aanloop')) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; const m = q.top + q.height / 2; if (!tops.some((t) => Math.abs(t - m) < Math.max(4, q.height * 0.45))) tops.push(m); }
    }
    if (tops.length > 2) uit.push(`${h.tagName} "${h.innerText.replace(/\s+/g, ' ').slice(0, 50)}" (${tops.length})`);
  }
  return uit;
};
for (const [locale, paginas] of [
  ['en-GB', ['/', '/about/', '/editions/', '/hooks/', '/upload-guidelines/']],
  ['nl-NL', ['/nl/', '/nl/about/', '/nl/editions/', '/nl/hooks/', '/nl/upload-guidelines/']],
]) {
  const { ctx, page } = await open(paginas[0], 1280, { locale });
  for (const pad of paginas) {
    await page.goto(SITE + pad, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const te = [];
    for (const w of [320, 340, 360, 390]) {
      await page.setViewportSize({ width: w, height: 844 });
      await page.waitForTimeout(120);
      for (const t of await page.evaluate(telKoppen)) te.push(`${w}: ${t}`);
    }
    ok(`${locale} ${pad}: geen kop op drie regels (320, 340, 360, 390)`, !te.length, te.slice(0, 4).join(' | '));
  }
  if (locale === 'en-GB') {
    const lang = await page.evaluate(() => document.documentElement.lang);
    ok('  de Engelse voorpagina is echt Engels (html lang="en")', lang === 'en', lang);
  }
  await ctx.close();
}

/* ── P6-26 ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nP6-26 · bij een dichte proef: ook voet, telefoonmenu en €1-melding');
for (const [pad, wacht] of [['/nl/', /op de wachtlijst/], ['/pricing/', /join the waitlist/]]) {
  const { ctx, page, fouten } = await open(pad, 390, { proef: 'dicht', locale: pad.startsWith('/nl/') ? 'nl-NL' : 'en-GB' });
  await page.waitForTimeout(800);
  const s = await page.evaluate(() => {
    const tekst = (a) => (a ? a.textContent.replace(/\s+/g, ' ').trim() : null);
    const alle = [...document.querySelectorAll('a[href*="test-sample"]')];
    return {
      voet: tekst(document.querySelector('footer [data-vis-uit] a[href*="test-sample"]')),
      menu: tekst(document.querySelector('#mobile-nav a[href*="test-sample"]')),
      melding: tekst(document.querySelector('.h-melding-proef a[href*="test-sample"]')),
      oud: alle.filter((a) => /Probeer VISUAILS|Try VISUAILS/.test(a.textContent)).map((a) => a.className || a.parentElement.className),
    };
  });
  ok(`${pad}: de voetlink "${s.voet}"`, s.voet !== null && wacht.test(s.voet), JSON.stringify(s));
  ok(`  het telefoonmenu "${s.menu}"`, s.menu !== null && wacht.test(s.menu));
  ok(`  de knop in de €1-melding "${s.melding}"`, s.melding === null || wacht.test(s.melding));
  ok('  nergens nog "Probeer VISUAILS" / "Try VISUAILS" op een proeflink', !s.oud.length, s.oud.join(' | '));
  ok('  geen scriptfouten', !fouten.length, fouten.join(' | '));
  await ctx.close();
}
{
  const { ctx, page } = await open('/nl/', 390, { proef: 'open' });
  await page.waitForTimeout(800);
  const voet = await page.evaluate(() => document.querySelector('footer [data-vis-uit] a[href*="test-sample"]')?.textContent.trim());
  ok(`open proef: de voetlink blijft "${voet}"`, /€\s?\d/.test(voet || '') && !/wachtlijst/.test(voet || ''));
  await ctx.close();
}

/* ── D1-13 ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('\nD1-13 · het Studiobrief-veld onder de knop: even breed, links');
for (const w of [768, 1000, 390]) {
  const { ctx, page } = await open('/nl/editions/', w);
  const m = await page.evaluate(() => {
    const i = document.getElementById('studiobrief-editions-email');
    const b = i.closest('.sb-veld').querySelector('button');
    const ri = i.getBoundingClientRect(), rb = b.getBoundingClientRect(), rv = i.closest('.sb-veld').getBoundingClientRect();
    return { veld: Math.round(ri.width), knop: Math.round(rb.width), links: Math.round(ri.left - rb.left), vakLinks: Math.round(ri.left - rv.left), onder: ri.bottom <= rb.top + 1 || rb.bottom <= ri.top + 1 };
  });
  ok(`${w} px: veld ${m.veld} = knop ${m.knop}, links gelijk (${m.links}), onder elkaar`, Math.abs(m.veld - m.knop) <= 1 && Math.abs(m.links) <= 1 && m.vakLinks === 0 && m.onder, JSON.stringify(m));
  await ctx.close();
}

await browser.close();
server.close();

/* ── VIDEO OP AANVRAAG: GEEN OPTIEPRIJZEN ─────────────────────────────────────────────────────────── */
console.log('\nBesluit Lucas · de video-intake in Studio noemt geen bedrag');
{
  const { startStudio, VOLT } = await import('./lib/studio-worker.mjs');
  const studio = await startStudio();
  try {
    for (const taal of ['nl', 'en']) {
      const html = await (await studio.fetch('/account/op-maat?dienst=video', { token: VOLT.token, cookie: `vis_lang=${taal}` })).text();
      const blok = (id) => { const i = html.indexOf(`id="${id}"`); return i < 0 ? '' : html.slice(i, html.indexOf('</section>', i)); };
      const idee = blok('om-idee'), keuzes = blok('om-keuzes');
      ok(`${taal}: de video-intake opent (idee en keuzes)`, !!idee && !!keuzes && /data-rij-erbij="shots"/.test(keuzes), `${idee.length} ${keuzes.length}`);
      const bedragen = [...(idee + keuzes).matchAll(/€\s?\d[\d.,]*/g)].map((x) => x[0]);
      ok(`  in het ${taal === 'nl' ? 'Nederlands' : 'Engels'} (${taal === 'nl' ? 'Wie bedenkt het idee?' : 'Who comes up with the idea?'})`, taal === 'nl' ? /Wie bedenkt het idee\?/.test(idee) : /Who comes up with the idea\?/.test(idee));
      ok(`  geen bedrag in "Het idee" en "Je video" (was €45, €150, + €10 …)`, bedragen.length === 0, bedragen.join(' '));
      ok('  "+ Shot" zonder bedrag', /data-rij-erbij="shots">\+ Shot</.test(keuzes));
      ok('  de prijs staat "op aanvraag"', /id="om-totaal">[^<]*(aanvraag|request)/i.test(html));
    }
    const hooks = await (await studio.fetch('/account/op-maat?dienst=hooks', { token: VOLT.token })).text();
    ok('hooks (geen aanvraag-dienst) noemt zijn opties nog met bedrag', /€\s?\d/.test(hooks.slice(hooks.indexOf('id="om-keuzes"'))));
  } finally {
    await studio.dispose();
  }
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
