/**
 * Alle mails in een browser — 17 oktober 2026.
 *
 *   node tests/mails-merk-browser.test.mjs
 *
 * D · DE DONKERE STAND VAN GMAIL. Lucas' schermafdruk: in de Gmail-app op zijn
 *     telefoon (donker) stond het woordmerk donker op donker. Chromium kan een
 *     pagina op dezelfde manier donker maken als de Gmail-app (algoritmisch: de
 *     vlakken donker, de letters licht, beelden zoals ze zijn). In die stand moet
 *     de pil van het woordmerk wit zijn en het woordmerk erin donker, en in de
 *     lichte stand moet de pil onzichtbaar zijn (wit op wit).
 * L · LEESBAAR, in alle mails op 390 en 640: geen tekst onder 12 px, contrast
 *     minstens 4,5:1, niets breder dan het scherm, en elke letter Arial (een
 *     alinea zonder font-family valt in sommige mailapps terug op een schreef).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPad } from '../scripts/lib/browserpad.mjs';
import { alleMails } from './lib/alle-mails.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(86)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
/* De beelden van public/img/mail als data-URI: de toets kent de live site niet. */
const lokaal = (html) => html.replace(/https:\/\/visuails\.com\/img\/mail\/([A-Za-z0-9_-]+\.png)/g, (m, f) => {
  const p = path.join(ROOT, 'public/img/mail', f);
  return fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p).toString('base64')}` : m;
});

console.log('\nVISUAILS — alle mails in een browser\n');
const mails = (await alleMails()).filter((m) => m.html);
ok(`${mails.length} mails om te tekenen`, mails.length >= 60, true);

/* ── D · de donkere stand ─────────────────────────────────────────────────── */
console.log('D · Gmail donker: het woordmerk blijft te lezen');
const PROEF = ['order-confirmation', 'sign-in-code', 'subscription-paused', 'payment-reminder', 'studio-paid', 'studio-nightly-report', 'contact-copy'];
/* Welke Chrome. De donkere stand (WebContentsForceDark) kan alleen de volledige Chromium in de
   nieuwe headless-stand; de kleine "headless shell" die Playwright op een gewone laptop standaard
   start, kan het niet en liet de achtergrond wit (uitrollen op 17 oktober 2026, 7 × FAIL bij D).
   Dus: een vast pad als dat er is, anders eerst de volledige Chromium van Playwright (channel
   "chromium"), dan de Chrome van de computer zelf, en pas dan de standaard. */
async function start(args) {
  const pad = process.env.CHROME || browserPad();
  if (pad) return chromium.launch({ executablePath: pad, args });
  for (const channel of ['chromium', 'chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args }); } catch { /* de volgende */ }
  }
  return chromium.launch({ args });
}
async function kop(args, html) {
  const b = await start(args);
  const p = await (await b.newContext({ viewport: { width: 412, height: 700 }, deviceScaleFactor: 1 })).newPage();
  await p.route(/^https?:/, (r) => r.abort());
  await p.setContent(lokaal(html), { waitUntil: 'load' });
  const box = await p.evaluate(() => { const i = document.querySelector('img[alt="VISUAILS"]'); const r = i.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const png = await p.screenshot({ clip: { x: Math.floor(box.x) - 6, y: Math.floor(box.y) - 6, width: Math.ceil(box.w) + 12, height: Math.ceil(box.h) + 12 } });
  /* Pixels lezen in de pagina zelf: een canvas met de schermafdruk. */
  const meting = await p.evaluate(async (data) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3));
    const L = ([r, gg, bb]) => 0.2126 * r + 0.7152 * gg + 0.0722 * bb;
    /* buiten de pil (6 px van de rand), de pil zelf (een plek zonder letter: links
       in de pil), en de donkerste pixel in de pil (een letter) */
    const buiten = L(px(1, 1));
    const pil = L(px(14, Math.floor(img.height / 2)));
    let donkerst = 255;
    for (let x = 20; x < img.width - 20; x += 2) for (let y = 14; y < img.height - 14; y += 2) donkerst = Math.min(donkerst, L(px(x, y)));
    return { buiten: Math.round(buiten), pil: Math.round(pil), donkerst: Math.round(donkerst) };
  }, png.toString('base64'));
  await b.close();
  return meting;
}
/* Kan deze Chrome de donkere stand wel nadoen? Een witte pagina die wit blijft, zegt dat hij het
   niet kan: dan meet D niets over de mails, en staat er een duidelijke melding in plaats van zeven
   keer FAIL. (Waar het wel kan, zoals in de werkkopie, worden alle zeven gemeten.) */
const proef = await (async () => {
  const b = await start(['--enable-features=WebContentsForceDark']);
  const p = await (await b.newContext({ viewport: { width: 100, height: 100 } })).newPage();
  await p.setContent('<body style="margin:0;background:#fff"><p style="color:#000">a</p></body>');
  const png = await p.screenshot({ clip: { x: 60, y: 60, width: 4, height: 4 } });
  const l = await p.evaluate(async (d) => { const i = new Image(); i.src = `data:image/png;base64,${d}`; await i.decode(); const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const [r, gg, bb] = g.getImageData(1, 1, 1, 1).data; return 0.2126 * r + 0.7152 * gg + 0.0722 * bb; }, png.toString('base64'));
  await b.close();
  return l < 80;
})();
if (!proef) console.log(' --   overgeslagen: deze Chrome kan de donkere stand van Gmail niet nadoen (de headless shell). Zet PW_CHROME op een volledige Chrome om D te meten.');
for (const id of (proef ? PROEF : [])) {
  const m = mails.find((x) => x.id === id);
  if (!m) { ok(`${id}: gevangen`, false); continue; }
  const donker = await kop(['--enable-features=WebContentsForceDark'], m.html);
  ok(`${id}: donker — de achtergrond is donker gemaakt (${donker.buiten})`, donker.buiten < 80, true);
  ok(`${id}: donker — de pil is wit (${donker.pil}) en het woordmerk erin donker (${donker.donkerst})`, donker.pil > 235 && donker.donkerst < 60, true);
  const licht = await kop([], m.html);
  ok(`${id}: licht — de pil valt weg tegen het wit (${licht.buiten} / ${licht.pil})`, Math.abs(licht.buiten - licht.pil) <= 2 && licht.pil > 245, true);
}

/* ── L · leesbaar, in alle mails ──────────────────────────────────────────── */
console.log('\nL · leesbaar en binnen het scherm, alle mails');
const b = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
const fouten = { klein: [], contrast: [], breed: [], letter: [] };
for (const breed of [390, 640]) {
  const p = await (await b.newContext({ viewport: { width: breed, height: 900 } })).newPage();
  await p.route(/^https?:/, (r) => r.abort());
  for (const m of mails) {
    await p.setContent(lokaal(m.html), { waitUntil: 'load' });
    const r = await p.evaluate(() => {
      const parse = (c) => { const v = String(c).match(/[\d.]+/g); if (!v) return [255, 255, 255, 0]; const [r, g, b, a = 1] = v.map(Number); return [r, g, b, a]; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const achter = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c[3] > 0.5) return c; const at = n.getAttribute && n.getAttribute('bgcolor'); if (at) { const d = document.createElement('div'); d.style.color = at; document.body.appendChild(d); const cc = parse(getComputedStyle(d).color); d.remove(); return cc; } } return [255, 255, 255, 1]; };
      const uit = { klein: [], contrast: [], letter: [] };
      for (const e of document.querySelectorAll('body *')) {
        if (!e.offsetParent || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const s = getComputedStyle(e);
        if (s.display === 'none' || parseFloat(s.maxHeight) === 0 || s.opacity === '0') continue;
        const t = e.textContent.trim().slice(0, 30);
        if (parseFloat(s.fontSize) < 12) uit.klein.push(`${s.fontSize} "${t}"`);
        const [l1, l2] = [lum(parse(s.color)), lum(achter(e))].sort((a, b) => b - a);
        const c = (l1 + 0.05) / (l2 + 0.05);
        if (c < 4.5) uit.contrast.push(`${c.toFixed(2)}:1 "${t}"`);
        /* Sinds levering 55 staan labels, kenmerken en stapnummers in de mono van elke computer (MONO in mailTemplate.js). */
        if (!/^(Arial|monospace|Menlo, Consolas, monospace)/i.test(s.fontFamily)) uit.letter.push(`${s.fontFamily} "${t}"`);
      }
      return { ...uit, sw: document.documentElement.scrollWidth };
    });
    for (const k of ['klein', 'contrast', 'letter']) for (const x of r[k]) fouten[k].push(`${breed} ${m.id}: ${x}`);
    if (r.sw > breed) fouten.breed.push(`${breed} ${m.id}: ${r.sw}`);
  }
}
await b.close();
ok('geen tekst kleiner dan 12 px', fouten.klein.slice(0, 5), []);
ok('overal minstens 4,5:1', fouten.contrast.slice(0, 5), []);
ok('niets breder dan het scherm (390 en 640)', fouten.breed.slice(0, 5), []);
ok('elke letter is Arial (of de mono: de pre in de studiomail, labels, kenmerken, stapnummers)', fouten.letter.slice(0, 5), []);

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
