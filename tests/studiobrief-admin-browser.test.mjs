/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * /admin/studiobrief IN EEN ECHTE BROWSER — 9 november 2026 (ronde 92)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het scherm van de Studiobrief op 1440 en 390 px, licht en donker:
 *   · geen horizontale schuif;
 *   · alle tekst in <main> minstens 11,5 px en contrast minstens 4,5 : 1;
 *   · de hoeken (docs/DESIGN.md "Hoeken"): de kaarten 24 rond aan alle vier de hoeken,
 *     de knoppen en de velden van één regel een pil — nergens de vorm met één zachte hoek;
 *   · het voorbeeld van de brief laadt in zijn frame, met onderaan de afmeldregel.
 * Schermafdrukken in .render/ (studiobrief-*.png); STUDIOBRIEF_SHOTS=<map> schrijft ze ook daar.
 *
 * Start een server op een vaste poort en een browser. Verzonnen adressen (@voorbeeld.test),
 * geen echte Resend: de pagina's worden vooraf getekend met adminGet().
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { adminGet } from '../src/lib/admin.js';
import { mintToken, hashToken } from '../src/lib/token.js';
import { briefHtml } from '../src/lib/studiobriefBeheer.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(ROOT, '.render');
const EXTRA = process.env.STUDIOBRIEF_SHOTS || '';
fs.mkdirSync(OUT, { recursive: true });
if (EXTRA) fs.mkdirSync(EXTRA, { recursive: true });

let pass = 0;
let fail = 0;
function ok(name, cond, extra = '') {
  if (cond) pass++; else fail++;
  console.log(`${cond ? ' ok  ' : ' FAIL'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('het schema laadt', mislukt.length === 0);
const brief = {
  taal: 'nl', onderwerp: 'Nieuw in november: drie looks voor de winter', voorvertoning: 'Drie looks en een kortere levertijd.',
  kop: 'Drie nieuwe looks', knop_tekst: 'Bekijk de looks', knop_link: 'https://visuails.com/nl/lifestyle',
  tekst: 'Deze maand staan er drie nieuwe looks klaar voor je winterreeks.\n\n## Wat er verandert\nLevering binnen vijf werkdagen. Lees er meer over in de [veelgestelde vragen](https://visuails.com/nl/faq).\n\nTot de volgende brief.',
};
db.prepare(`INSERT INTO studiobrieven (id, taal, onderwerp, voorvertoning, kop, tekst, knop_tekst, knop_link, html, status, bijgewerkt_op)
  VALUES (1, 'nl', ?, ?, ?, ?, ?, ?, ?, 'concept', datetime('now', '-1 hour'))`)
  .run(brief.onderwerp, brief.voorvertoning, brief.kop, brief.tekst, brief.knop_tekst, brief.knop_link, briefHtml(brief));
db.exec(`
  INSERT INTO studiobrieven (id, taal, onderwerp, html, resend_id, status, gepland_op) VALUES
    (2, 'en', 'Three new looks for winter', '<p>x</p>', 'bc-gepland', 'gepland', datetime('now', '+3 days'));
  INSERT INTO studiobrieven (id, taal, onderwerp, html, resend_id, status, verstuurd_op) VALUES
    (3, 'nl', 'De Studiobrief van oktober', '<p>x</p>', 'bc-oud', 'verstuurd', datetime('now', '-9 days'));
  INSERT INTO subscribers (email, source, created_at, unsubscribed_at) VALUES
    ('anna.lang.adres.voor.de.test@voorbeeld.test', 'studiobrief-voet-nl', datetime('now', '-20 days'), NULL),
    ('bram@voorbeeld.test', 'studiobrief-gidsen-nl', datetime('now', '-12 days'), NULL),
    ('chris@voorbeeld.test', 'studiobrief-editions-en', datetime('now', '-8 days'), NULL),
    ('dana@voorbeeld.test', 'studiobrief-voet-nl', datetime('now', '-30 days'), datetime('now', '-2 days')),
    ('eva@voorbeeld.test', 'checklist', datetime('now', '-40 days'), NULL);
  INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'studio@voorbeeld.test', 'x');
`);
const token = await mintToken();
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));
/* Sleutel en NL-segment staan, EN-segment en webhook niet: dan staat "Zo zet je het aan" open. */
const env = { DB: d1(db), RESEND_API_KEY: 're_test', RESEND_SEGMENT_NL: 'seg-nl' };
const admin = async (pad, donker) => {
  const res = await adminGet({ request: new Request(`https://visuails.com${pad}`, { headers: { cookie: `vis_admin=${token}${donker ? '; vis_thema=donker' : ''}` } }), env, waitUntil() {} });
  return { body: await res.text(), csp: res.headers.get('content-security-policy') || '' };
};

const PAD = '/admin/studiobrief?brief=1';
const vooraf = new Map();
for (const donker of [false, true]) vooraf.set(`${donker ? '/donker' : ''}${PAD}`, (await admin(PAD, donker)).body);
const vb = await admin('/admin/studiobrief/1/voorbeeld', false);
vooraf.set('/admin/studiobrief/1/voorbeeld', vb.body);
vooraf.set('/donker/admin/studiobrief/1/voorbeeld', vb.body);
ok('de pagina heeft het voorbeeldframe en de lijst', /<iframe class="sb-voorbeeld" src="\/admin\/studiobrief\/1\/voorbeeld"/.test(vooraf.get(PAD)) && /anna\.lang/.test(vooraf.get(PAD)));
ok('het voorbeeld heeft zijn eigen CSP: inline stijl, geen script, alleen in een frame van deze site',
  /style-src 'unsafe-inline'/.test(vb.csp) && !/script-src/.test(vb.csp) && /frame-ancestors 'self'/.test(vb.csp));

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const PORT = 4392;
const server = http.createServer((req, res) => {
  const vol = decodeURIComponent(String(req.url));
  if (vooraf.has(vol)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(vol)); }
  const p = vol.split('?')[0].replace(/\/+$/, '') || '/';
  if (vooraf.has(p)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(vooraf.get(p)); }
  const f = path.join(PUB, p);
  if (f.startsWith(PUB) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
    return res.end(fs.readFileSync(f));
  }
  res.writeHead(404); return res.end('niet gevonden');
});
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });

/* Alle tekst in <main>: de kleinste maat en het slechtste contrast, met waar dat is. */
const tekstScan = (page) => page.evaluate(() => {
  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const uit = { ratio: 99, px: 99, waarRatio: '', waarPx: '' };
  for (const el of document.querySelectorAll('main *')) {
    if (!el.getClientRects().length || el.closest('.sr-only')) continue;
    const eigen = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!eigen) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    let bg = [255, 255, 255, 1];
    for (let n = el; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); if (b[3] > 0.99) { bg = b; break; } }
    const fg = rgba(cs.color);
    const mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mix), lum(bg.slice(0, 3))];
    const ratio = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
    const px = parseFloat(cs.fontSize);
    const naam = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${el.textContent.trim().slice(0, 30)}"`;
    if (ratio < uit.ratio) { uit.ratio = ratio; uit.waarRatio = naam; }
    if (px < uit.px) { uit.px = px; uit.waarPx = naam; }
  }
  return uit;
});

const hoeken = (page) => page.evaluate(() => {
  const r = (el) => { const cs = getComputedStyle(el); return [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(parseFloat); };
  const zicht = (s) => [...document.querySelectorAll(s)].filter((el) => el.getClientRects().length);
  const kaarten = zicht('main .card').map(r);
  /* levering 99 (lijst 100, D3 a): een knop 8 px op alle hoeken (was levering 97: scherp); velden en pillen blijven een pil */
  const pillen = [...zicht('main .btn').map((el) => r(el).every((x) => Math.abs(x - 8) < 0.6)),
    ...zicht('main .sb-veld input:not([type=checkbox]):not([type=radio]), main .pill').map((el) => {
    const h = el.getBoundingClientRect().height; return r(el).every((x) => x >= h / 2 - 0.5);
  })];
  return {
    kaarten: kaarten.length, kaart24: kaarten.every((k) => k.every((x) => x === 24)),
    pillen: pillen.length, allePil: pillen.every(Boolean),
    eenZachteHoek: zicht('main *').some((el) => { const k = r(el); return k.some((x) => x > 0) && new Set(k).size > 1; }),
  };
});

try {
  for (const breed of [1440, 390]) {
    for (const donker of [false, true]) {
      const tag = `${breed}px ${donker ? 'donker' : 'licht'}`;
      const page = await browser.newPage({ viewport: { width: breed, height: 1000 } });
      /* De beelden van de mail (https://visuails.com/img/mail/…) uit public/, zonder netwerk. */
      await page.route('https://visuails.com/**', (route) => {
        const f = path.join(PUB, new URL(route.request().url()).pathname);
        return f.startsWith(PUB) && fs.existsSync(f) ? route.fulfill({ path: f }) : route.fulfill({ status: 404, body: '' });
      });
      await page.goto(`http://localhost:${PORT}${donker ? '/donker' : ''}${PAD}`);
      await page.waitForLoadState('networkidle');
      const t = await tekstScan(page);
      ok(`${tag}: tekst in main ≥ 11,5 px (${t.px}, ${t.waarPx})`, t.px >= 11.5);
      ok(`${tag}: contrast in main ≥ 4,5 (${t.ratio}, ${t.waarRatio})`, t.ratio >= 4.5);
      ok(`${tag}: geen horizontale schuif`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      const h = await hoeken(page);
      ok(`${tag}: ${h.kaarten} kaarten, alle vier de hoeken 24`, h.kaarten >= 3 && h.kaart24);
      ok(`${tag}: ${h.pillen} knoppen 8 px, velden en pillen een pil`, h.pillen >= 8 && h.allePil);
      ok(`${tag}: nergens een vorm met één afwijkende hoek`, !h.eenZachteHoek);
      /* Het frame laadt lui: eerst in beeld halen. */
      await page.locator('iframe.sb-voorbeeld').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('iframe.sb-voorbeeld')?.contentDocument !== undefined).catch(() => {});
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      const frame = page.frames().find((f) => /\/voorbeeld$/.test(f.url()));
      const regel = frame ? await frame.evaluate(() => document.body.innerText) : '';
      ok(`${tag}: het voorbeeld laadt, met de kop, de knop en "Afmelden kan onderaan elke brief."`,
        /Drie nieuwe looks/.test(regel) && /Bekijk de looks/.test(regel) && /Afmelden kan onderaan elke brief\./.test(regel));
      const naam = `studiobrief-${breed}-${donker ? 'donker' : 'licht'}.png`;
      /* Geen fullPage: dan tekent Chrome het frame van het voorbeeld niet mee. Het venster zo hoog als de pagina. */
      await page.setViewportSize({ width: breed, height: await page.evaluate(() => document.documentElement.scrollHeight) });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, naam) });
      if (EXTRA) fs.copyFileSync(path.join(OUT, naam), path.join(EXTRA, naam));
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
