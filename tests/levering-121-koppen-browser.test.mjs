/* VISUAILS — levering 121 (19 november 2026, lijst 134): alle koppen in VISUAILS Display 2 Medium 500, in de GEBOUWDE site.
 *
 *   node tests/levering-121-koppen-browser.test.mjs      (vraagt een build: serveert dist/ zelf op een vrije poort en stopt hem)
 *   KOP_BREED=390,1440 KOP_PAD=/,/nl/ node tests/…        (alleen die breedtes / pagina's)
 *
 * Op ELKE gebouwde pagina (Engels en Nederlands, ook 404) en op 320, 360, 390, 768, 1280, 1440 en 1920 px, voor elke kop
 * die in beeld is (h1 – h6, .h-kop en de kaartkoppen uit hal.css, behalve de mono-labels .h-pil en .sr-only):
 *   - de letter is VISUAILS Display 2 en hij is echt geladen; gewicht 500 (de videokop .b94-kop: 300, Light);
 *   - geen hoofdletters (text-transform none);
 *   - hoogstens twee regels (de regels geteld met een Range, zoals levering 119; de grote €1 telt niet mee);
 *   - contrast ≥ 4,5 : 1 (≥ 3 : 1 vanaf 24 px, of 18,66 px vet) op de effen grond eronder; een kop op een beeld wordt gemeld;
 *   - letter ≥ 11,5 px; niet afgesneden door een ouder met overflow; niets anders ligt over de tekst; de kop overlapt het
 *     blok ervoor of erna niet;
 *   - geen horizontale schuifbalk op de pagina.
 * Daarna Studio (/account, de paginakop .st-h1) en de privélink (/o/…, h1) in de gebouwde Worker (tests/lib/studio-worker.mjs),
 * op dezelfde breedtes: Display 2, 500, geen hoofdletters, hoogstens twee regels, geen schuifbalk. (KOP_STUDIO=0 slaat dat over.)
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
if (!existsSync(path.join(DIST, 'index.html'))) { console.log('dist/ heeft geen voorpagina — draai eerst de build.'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
const srv = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${srv.address().port}`;
const { chromium } = await import('playwright');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});
const CONSENT = { name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: new Date().toISOString() })), url: SITE };

/* alle gebouwde pagina's (de statische site; Studio, de privélink en /admin draaien in de Worker) */
const ALLE = [];
(function loop(d) { for (const n of readdirSync(d)) { const f = path.join(d, n); if (statSync(f).isDirectory()) { if (!/^(_astro|server|img|fonts)$/.test(n) || d !== DIST) loop(f); } else if (n === 'index.html' || n === '404.html') ALLE.push('/' + path.relative(DIST, f).replace(/index\.html$/, '')); } })(DIST);
const PADEN = process.env.KOP_PAD ? process.env.KOP_PAD.split(',') : ALLE.sort();
const BREED = (process.env.KOP_BREED || '320,360,390,768,1280,1440,1920').split(',').map(Number);

/* de meting in de pagina */
function meet() {
  const KIEZER = 'h1, h2, h3, h4, h5, h6, .h-kop, .sb-kop, .h-pk-naam, .h-st-stap-naam, .h-hw-dienst-naam, .h-md-deur-kop, .h-dienst-extra-kop, .h-ed-vgl-kop, .st2-naam, .h-gl-naam, .w8-woord';
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), m[3] ?? 1]; };
  const verh = (a, b) => { const [x] = lum(a), [y] = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const grond = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.backgroundImage !== 'none' && !/gradient/.test(c.backgroundImage)) return { beeld: true }; const m = c.backgroundColor.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.5)) return { kleur: c.backgroundColor }; } return { kleur: 'rgb(255, 255, 255)' }; };
  const zichtbaar = (h) => {
    if (!h.getClientRects().length || h.closest('.sr-only, [hidden], [aria-hidden="true"], details:not([open]), dialog:not([open])')) return false;
    for (let e = h; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; }
    const r = h.getBoundingClientRect(); return r.width > 2 && r.height > 2;
  };
  const uit = [];
  for (const h of document.querySelectorAll(KIEZER)) {
    if (h.matches('.h-pil, .sr-only') || (h.parentElement && h.parentElement.closest(KIEZER) && !h.matches('h1,h2,h3,h4,h5,h6'))) continue;
    if (!zichtbaar(h)) continue;
    const c = getComputedStyle(h);
    const tekst = h.innerText.replace(/\s+/g, ' ').trim(); if (!tekst) continue;
    /* regels */
    const tops = []; const rg = document.createRange();
    const delen = h.querySelector('.h-een') ? [...h.childNodes].filter((n) => !(n.classList && n.classList.contains('h-een'))) : [h];
    for (const el of delen) { rg.selectNodeContents(el); for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; const m = q.top + q.height / 2; if (!tops.some((t) => Math.abs(t - m) < Math.max(4, q.height * 0.45))) tops.push(m); } }
    /* afgesneden: een ouder met overflow die de kop niet helemaal bevat */
    const r = h.getBoundingClientRect(); let knip = null;
    for (let e = h.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e); if (!/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) continue;
      const q = e.getBoundingClientRect(); const sw = e.scrollWidth > e.clientWidth + 1 && /auto|scroll/.test(s.overflowX);
      if (sw) continue; /* een rij die zelf schuift (de tegels) */
      if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) { knip = (e.className || e.tagName).toString().slice(0, 30); break; }
    }
    /* iets over de kop: op het midden van elke regel moet de kop (of iets erin) bovenop liggen */
    let over = null;
    if (r.top >= 0 && r.bottom <= innerHeight) {
      rg.selectNodeContents(h);
      for (const q of [...rg.getClientRects()].filter((q) => q.width > 4)) {
        for (const x of [q.left + 2, q.left + q.width / 2, q.right - 2]) {
          const top = document.elementFromPoint(x, q.top + q.height / 2);
          if (top && !h.contains(top) && !top.contains(h) && getComputedStyle(top).pointerEvents !== 'none') { over = (top.className || top.tagName).toString().slice(0, 30); break; }
        }
        if (over) break;
      }
    }
    /* botsing: de kop overlapt zijn buren (het blok ervoor of erna) */
    let botst = null;
    for (const b of [h.previousElementSibling, h.nextElementSibling]) {
      if (!b || !b.getClientRects().length || getComputedStyle(b).position === 'absolute' && getComputedStyle(b).pointerEvents === 'none') continue;
      const q = b.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue;
      const x = Math.min(r.right, q.right) - Math.max(r.left, q.left), y = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (x > 1 && y > 1) { botst = `${(b.className || b.tagName).toString().slice(0, 30)} (${Math.round(y)} px)`; break; }
    }
    const g = grond(h);
    const kids = [...h.querySelectorAll('.l, .d, .h-regel-in, :scope > span:not([class])')].map((k) => getComputedStyle(k));
    uit.push({
      tekst: tekst.slice(0, 60), cls: `${h.tagName.toLowerCase()}.${[...h.classList].slice(0, 2).join('.')}`,
      ff: c.fontFamily, fw: c.fontWeight, tt: c.textTransform, fs: parseFloat(c.fontSize), lh: c.lineHeight, ls: c.letterSpacing, regels: tops.length,
      kidsGoed: kids.every((k) => k.fontFamily === c.fontFamily && k.fontWeight === c.fontWeight && k.textTransform === 'none'),
      contrast: g.beeld ? null : Math.round(verh(c.color, g.kleur) * 100) / 100, knip, over, botst, b94: h.classList.contains('b94-kop'),
    });
  }
  const geladen = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'VISUAILS Display 2' && f.status === 'loaded').map((f) => f.weight);
  return { koppen: uit, schuif: document.documentElement.scrollWidth - innerWidth, geladen };
}

const fouten = { botst: [], letter: [], gewicht: [], hoofd: [], regels: [], contrast: [], maat: [], knip: [], over: [], schuif: [], kind: [], laden: [] };
const beeld = new Set(); let aantal = 0; const perPagina = new Map();
try {
  /* per breedte een eigen tabblad, vier tegelijk */
  const werk = async (w) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: 'nl-NL', reducedMotion: 'reduce' });
    await ctx.addCookies([CONSENT]); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    const p = await ctx.newPage();
    for (const pad of PADEN) {
      try { await p.goto(SITE + pad, { waitUntil: 'load', timeout: 30000 }); } catch { fouten.laden.push(`${w} ${pad}`); continue; }
      await p.evaluate(() => document.fonts.ready);
      /* het laadscherm van de voorpagina (Voorlader80) eerst weg */
      await p.waitForFunction(() => !document.querySelector('.vl8.is-zichtbaar') && !document.documentElement.classList.contains('vl8-aan'), null, { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(120);
      const m = await p.evaluate(meet);
      if (m.schuif > 0) fouten.schuif.push(`${w} ${pad} (+${m.schuif} px)`);
      if (m.koppen.some((k) => !k.b94) && !m.geladen.includes('500')) fouten.laden.push(`${w} ${pad}: Medium niet geladen`);
      for (const k of m.koppen) {
        aantal++; perPagina.set(pad, (perPagina.get(pad) || 0) + 1);
        const wie = `${w} ${pad} ${k.cls} «${k.tekst}»`;
        if (!k.ff.startsWith('"VISUAILS Display 2"')) fouten.letter.push(`${wie} ${k.ff.slice(0, 30)}`);
        if (k.fw !== (k.b94 ? '300' : '500')) fouten.gewicht.push(`${wie} ${k.fw}`);
        if (k.tt !== 'none') fouten.hoofd.push(`${wie} ${k.tt}`);
        if (!k.kidsGoed) fouten.kind.push(wie);
        if (k.regels > 2) fouten.regels.push(`${wie} (${k.regels} regels, ${k.fs} px)`);
        if (k.fs < 11.5) fouten.maat.push(`${wie} ${k.fs} px`);
        if (k.b94) { /* de videokop: zijn kleur loopt met de video mee (levering 120), hier niet gemeten */ }
        else if (k.contrast === null) beeld.add(`${pad} ${k.cls}`);
        else if (k.contrast < (k.fs >= 24 ? 3 : 4.5)) fouten.contrast.push(`${wie} ${k.contrast} : 1`);
        if (k.knip) fouten.knip.push(`${wie} in ${k.knip}`);
        if (k.over && !k.b94) fouten.over.push(`${wie} onder ${k.over}`);
        if (k.botst) fouten.botst.push(`${wie} raakt ${k.botst}`);
      }
    }
    await ctx.close();
  };
  for (let i = 0; i < BREED.length; i += 4) await Promise.all(BREED.slice(i, i + 4).map(werk));

  console.log(`\n${PADEN.length} pagina's × ${BREED.length} breedtes (${BREED.join(', ')}): ${aantal} koppen gemeten`);
  ok(`elke pagina laadt en heeft koppen in beeld`, fouten.laden.length === 0 && PADEN.every((p) => perPagina.get(p) > 0), fouten.laden.slice(0, 8).join(' | ') + ' ' + PADEN.filter((p) => !perPagina.get(p)).join(' '));
  ok('elke kop in VISUAILS Display 2', fouten.letter.length === 0, fouten.letter.slice(0, 8).join(' | '));
  ok('gewicht 500 (de videokop 300)', fouten.gewicht.length === 0, fouten.gewicht.slice(0, 8).join(' | '));
  ok('geen hoofdletters (text-transform none)', fouten.hoofd.length === 0, fouten.hoofd.slice(0, 8).join(' | '));
  ok('de tonen in een kop (.l, .d) in dezelfde letter en hetzelfde gewicht', fouten.kind.length === 0, fouten.kind.slice(0, 8).join(' | '));
  ok('elke kop hoogstens twee regels', fouten.regels.length === 0, fouten.regels.slice(0, 12).join(' | '));
  ok('letter ≥ 11,5 px', fouten.maat.length === 0, fouten.maat.slice(0, 8).join(' | '));
  ok('contrast ≥ 4,5 : 1 (≥ 3 : 1 vanaf 24 px) op effen grond', fouten.contrast.length === 0, fouten.contrast.slice(0, 8).join(' | '));
  ok('geen kop afgesneden', fouten.knip.length === 0, fouten.knip.slice(0, 8).join(' | '));
  ok('niets ligt over een kop', fouten.over.length === 0, fouten.over.slice(0, 8).join(' | '));
  ok('geen kop valt over het blok ervoor of erna', fouten.botst.length === 0, fouten.botst.slice(0, 8).join(' | '));
  ok('geen horizontale schuifbalk', fouten.schuif.length === 0, fouten.schuif.slice(0, 8).join(' | '));
  if (beeld.size) console.log(`  (op een beeld, met het oog gecontroleerd: ${[...beeld].slice(0, 12).join(' · ')})`);

  if (process.env.KOP_STUDIO !== '0') {
    console.log('\nStudio en de privélink (de gebouwde Worker)');
    const { startStudio, VOLT } = await import('./lib/studio-worker.mjs');
    const { mintToken, hashToken } = await import('../src/lib/token.js');
    const portaal = await mintToken();
    const studio = await startStudio({ extraSql: [`INSERT INTO order_tokens (order_id, token_hash) VALUES (7090, '${await hashToken(portaal)}')`] });
    const host = new URL(studio.url).hostname; const mis = [];
    try {
      for (const w of BREED) {
        const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
        await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, domain: host, path: '/' }]);
        const p = await ctx.newPage();
        for (const pad of ['/account', '/account/orders', '/account/plan', '/account?lang=en', `/o/${portaal}`]) {
          const r = await p.goto(studio.url + pad, { waitUntil: 'load' });
          await p.evaluate(() => document.fonts.load('500 40px "VISUAILS Display 2"').then(() => document.fonts.ready));
          const m = await p.evaluate(() => {
            const h = document.querySelector('h1'); const c = getComputedStyle(h); const rg = document.createRange(); rg.selectNodeContents(h);
            const tops = []; for (const q of rg.getClientRects()) { if (q.width < 1) continue; const y = q.top + q.height / 2; if (!tops.some((t) => Math.abs(t - y) < Math.max(4, q.height * 0.45))) tops.push(y); }
            const l = h.querySelector('.l');
            return { ff: c.fontFamily, fw: c.fontWeight, tt: c.textTransform, regels: tops.length, l: l ? getComputedStyle(l).fontWeight : c.fontWeight, schuif: document.documentElement.scrollWidth - innerWidth, geladen: document.fonts.check('500 40px "VISUAILS Display 2"'), t: h.textContent.trim().slice(0, 40) };
          });
          if (r.status() !== 200 || !m.ff.startsWith('"VISUAILS Display 2"') || m.fw !== '500' || m.l !== '500' || m.tt !== 'none' || m.regels > 2 || m.schuif > 0 || !m.geladen) mis.push(`${w} ${pad.slice(0, 16)} ${r.status()} ${JSON.stringify(m)}`);
        }
        await ctx.close();
      }
    } finally { await studio.dispose(); }
    ok(`Studio (4 pagina's) en de privélink op ${BREED.length} breedtes: de kop in Display 2 Medium, geen hoofdletters, ≤ 2 regels, geen schuifbalk`, mis.length === 0, mis.slice(0, 6).join(' | '));
  }
} finally {
  await browser.close(); srv.close();
}
console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
