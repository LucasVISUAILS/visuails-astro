/*
 * RONDE 91 · C06 (formulier) — GEEN VOORRANG AANBIEDEN ALS DE AGENDA DICHT STAAT
 * 9 november 2026 (ronde 91, R)
 *
 * C-06 zette de server goed: /api/order rekent geen voorrang en geen toeslag als een van de twee werkdagen van
 * de belofte dicht staat. Het formulier wist dat niet en toonde het vinkje én de toeslag. Nu:
 *
 *   1 · /api/capacity?voorrang=1 geeft `voorrangOpen` (dezelfde som: voorrangAgendaOpen), en de agenda-poort
 *       (tier=attended) geeft hem ook mee; is de agenda niet te lezen, dan 503 en geen ja of nee;
 *   2 · het bestelformulier (gebouwde HTML, pipeline.js uit de bron gebundeld): dicht → het blok blijft staan,
 *       het vinkje staat uit en een korte zin zegt waarom; open → zoals altijd.
 *
 *   node tests/blind91-r-voorrang-formulier.test.mjs        (bouw eerst: npx astro build)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestGet } from '../functions/api/capacity.js';
import { voorrangWerkdagen } from '../src/data/pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 C06: het voorrangsvinkje en de dichte agenda\n');

const w = voorrangWerkdagen(null);
function agenda(dicht = []) {
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  for (const d of dicht) db.prepare("INSERT INTO blackout_days (day, reason) VALUES (?, 'Testsluiting')").run(d);
  return { DB: d1(db) };
}
const vraag = async (env, q) => {
  const res = await onRequestGet({ request: new Request(`https://visuails.com/api/capacity?${q}`), env, waitUntil() {} });
  return { status: res.status, body: await res.json(), cache: res.headers.get('cache-control') };
};

console.log('1 · /api/capacity');
{
  const open = await vraag(agenda([]), 'voorrang=1');
  ok('?voorrang=1, niets dicht: voorrangOpen true', [open.status, open.body.voorrangOpen], [200, true]);
  ok('  met de twee werkdagen erbij', [open.body.start, open.body.klaar], [w.start, w.klaar]);
  const dichtStart = await vraag(agenda([w.start]), 'voorrang=1');
  ok('de startdag dicht: voorrangOpen false', dichtStart.body.voorrangOpen, false);
  const dichtKlaar = await vraag(agenda([w.klaar]), 'voorrang=1');
  ok('de leverdag dicht: voorrangOpen false', dichtKlaar.body.voorrangOpen, false);
  const kapot = await vraag({ DB: { prepare() { throw new Error('D1 weg'); } } }, 'voorrang=1');
  ok('agenda niet te lezen: 503, geen ja of nee, niet in de cache', [kapot.status, kapot.body.voorrangOpen, kapot.cache], [503, null, 'no-store']);
  const poort = await vraag(agenda([w.start]), 'products=12&tier=attended&service=catalog');
  ok('de agenda-poort (tier=attended) geeft voorrangOpen ook mee', poort.body.voorrangOpen, false);
  const rij = await vraag(agenda([]), 'products=3');
  ok('de wachtrij zonder ?voorrang=1 blijft zoals hij was (geen D1, geen veld)', [rij.body.reason, 'voorrangOpen' in rij.body], ['queue', false]);
}

const html = path.join(DIST, 'nl/start/catalog/index.html');
if (!fs.existsSync(html)) { console.log('      (browserdeel overgeslagen — geen dist/; bouw eerst)'); console.log(`\n${pass} goed, ${fail} fout`); process.exit(fail ? 1 : 0); }

console.log('\n2 · het bestelformulier');
const chunk = (/src="\/_astro\/(OrderFlow\.astro_astro_type_script[^"]+\.js)"/.exec(fs.readFileSync(html, 'utf8')) || [])[1];
ok('de bestelpagina laadt pipeline.js als eigen bundel', !!chunk);
const esbuild = await import('esbuild');
const bundel = (await esbuild.build({ entryPoints: [path.join(ROOT, 'src/scripts/pipeline.js')], bundle: true, format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.woff2': 'font/woff2' };
let env = agenda([]);
let voorrangVragen = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);
  if (p.startsWith('/api/') || p.startsWith('/account/me')) {
    let r;
    if (p === '/api/capacity') {
      if (url.searchParams.get('voorrang') === '1') voorrangVragen += 1;
      r = await onRequestGet({ request: new Request(`http://localhost${req.url}`), env, waitUntil() {} });
    } else if (p === '/api/land') r = Response.json({ land: 'NL' });
    else if (p === '/api/botcheck') r = Response.json({ sleutel: null });
    else if (p === '/api/step') r = new Response(null, { status: 204 });
    else r = new Response('null', { status: 401, headers: { 'content-type': 'application/json' } });
    const h = {};
    r.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(r.status, h);
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  if (p === `/_astro/${chunk}`) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(bundel); }
  let f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end('niet gevonden'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  return res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const { chromium } = await import('playwright');
const { browserPad } = await import('../scripts/lib/browserpad.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

async function stand(taal, dicht, breedte = 390) {
  env = agenda(dicht);
  voorrangVragen = 0;
  const ctx = await browser.newContext({ viewport: { width: breedte, height: 844 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e).slice(0, 160)));
  await page.goto(`http://localhost:${PORT}${taal === 'nl' ? '/nl' : ''}/start/catalog`, { waitUntil: 'load' });
  await page.waitForSelector('#pl-form.is-live', { timeout: 20000 });
  await page.fill('[data-pl-qty-input]', '3').catch(() => {});
  await page.dispatchEvent('[data-pl-qty-input]', 'change').catch(() => {});
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => {
    const blok = document.querySelector('[data-pl-voorrang]');
    const box = blok && blok.querySelector('input[name="voorrang"]');
    const zin = blok && blok.querySelector('[data-pl-voorrang-dicht]');
    const st = zin && getComputedStyle(zin);
    const r = zin && zin.getBoundingClientRect();
    return {
      blok: !!blok && !blok.hidden,
      uit: !!box && box.disabled,
      dichtKlas: !!blok && blok.classList.contains('is-dicht'),
      zin: !!zin && !zin.hidden && st.display !== 'none',
      tekst: zin ? zin.textContent.trim() : '',
      px: st ? parseFloat(st.fontSize) : 0,
      kleur: st ? st.color : '',
      binnen: r ? r.right <= window.innerWidth + 0.5 && r.left >= -0.5 : false,
      scrollX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  /* Klikken op het vinkje als het uit staat: hij blijft uit. */
  if (s.uit) { await page.click('[data-pl-voorrang] label').catch(() => {}); s.naKlik = await page.evaluate(() => document.querySelector('input[name="voorrang"]').checked); }
  await ctx.close();
  return { s, fouten, vragen: voorrangVragen };
}

try {
  {
    const { s, fouten, vragen } = await stand('nl', [w.start]);
    ok('NL dicht: het formulier vroeg /api/capacity?voorrang=1', vragen >= 1, true);
    ok('NL dicht: het blok blijft staan, het vinkje staat uit', [s.blok, s.uit, s.dichtKlas], [true, true, true]);
    ok('NL dicht: de zin staat er', [s.zin, s.tekst.startsWith('Nu niet te kiezen: de studio is dicht')], [true, true]);
    ok('NL dicht: klikken zet hem niet aan', s.naKlik, false);
    ok('NL dicht: leesbaar (≥ 13 px), binnen de breedte van 390 px, geen zijwaarts scrollen', [s.px >= 13, s.binnen, s.scrollX], [true, true, false]);
    ok('NL dicht: geen scriptfouten', fouten, []);
  }
  {
    const { s, fouten } = await stand('en', [w.klaar], 320);
    ok('EN dicht (320 px): vinkje uit, Engelse zin', [s.uit, s.tekst.startsWith('Not available right now')], [true, true]);
    ok('EN dicht (320 px): binnen de breedte', [s.binnen, s.scrollX], [true, false]);
    ok('EN: geen scriptfouten', fouten, []);
  }
  {
    const { s, fouten } = await stand('nl', []);
    ok('NL open: vinkje aan te zetten, geen zin, geen dicht-klasse', [s.blok, s.uit, s.zin, s.dichtKlas], [true, false, false, false]);
    ok('NL open: geen scriptfouten', fouten, []);
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
