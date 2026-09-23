// Knoppenscan — 23 september 2026. Lucas: *"Sommige knoppen zijn niet goed te
// lezen of de knoppen zijn niet goed te zien."* Per knop op elke pagina:
//   T  tekstcontrast tegen de werkelijke grond (≥ 4,5:1, of 3:1 bij groot/vet)
//   V  is de knop zelf zichtbaar: eigen vulling die verschilt van de grond
//      (≥ 1,3:1), of een rand die ≥ 1,8:1 van de grond afwijkt.
// Gebruik: node kladblok/_knoppenscan.mjs [pad ...]  (dist-server op 4399)
import { chromium } from 'playwright';
import { globSync } from 'node:fs';

const alle = globSync('dist/**/index.html').map((f) => '/' + f.replace(/^dist\//, '').replace(/index\.html$/, ''))
  .filter((p) => !/\/(account|admin|o|portal|concept)\//.test(p) && !/^\/(nl\/)?(terms|privacy|cookie-policy|data-processing-agreement)\//.test(p));
const PADEN = process.argv.length > 2 ? process.argv.slice(2) : alle;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const fouten = new Map();
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: 'essential', domain: '127.0.0.1', path: '/' }]);
  /* INGELOGD=1: doen alsof er een klant ingelogd is, zodat de knoppen met
     data-vis-in (alleen voor klanten) ook gemeten worden. */
  if (process.env.INGELOGD) await ctx.route('**/account/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  for (const pad of PADEN) {
    const p = await ctx.newPage();
    try { await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch { await p.close(); continue; }
    await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .reveal,.pending{opacity:1!important;transform:none!important}' });
    await p.waitForTimeout(process.env.INGELOGD ? 600 : 150);
    const r = await p.evaluate(() => {
      const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
      // De grond achter een element: wat er ÉCHT onder ligt, op het midden van
      // het element (elementsFromPoint), en niet de voorouders — een vaste kop
      // ligt over een paneel dat geen voorouder van hem is.
      const grond = (el, zelf) => {
        const r = el.getBoundingClientRect();
        const x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2));
        const y = Math.min(innerHeight - 2, Math.max(1, r.top + r.height / 2));
        const stapel = document.elementsFromPoint(x, y);
        const lagen = []; let beeld = false;
        const start = stapel.indexOf(zelf);
        for (const n of stapel.slice(start >= 0 ? start + 1 : 0)) {
          if (n.tagName === 'IMG' || n.tagName === 'VIDEO' || n.tagName === 'CANVAS') { beeld = true; break; }
          const cs = getComputedStyle(n);
          if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) { beeld = true; }
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0) { lagen.push(c); if (c.a >= 0.99) break; }
        }
        let c = { r: 255, g: 255, b: 255, a: 1 };
        for (let i = lagen.length - 1; i >= 0; i--) c = mix(lagen[i], c);
        return { c, beeld };
      };
      const uit = [];
      const sel = 'a.knop, a.btn, button.knop, button.btn, .knop, .btn, [class*="knop-"], button:not([aria-hidden="true"]), [class*="tag"], [class*="chip"], [class*="pil"], [class*="badge"]';
      /* Labels (tag/chip/pil/badge) tellen alleen als ze een eigen vulling hebben
         — een pil op een foto, zoals VOOR/NA — en dan alleen op tekstcontrast. */
      const isLabel = (el) => !/knop|btn/.test(el.className) && el.tagName !== 'BUTTON' && el.tagName !== 'A';
      for (const el of document.querySelectorAll(sel)) {
        if (el.closest('[hidden], .site-footer .foot-social, .cookie, [aria-hidden="true"]')) continue;
        /* Een kop met mix-blend-mode keert zijn letters om tegen wat eronder
           ligt; dat kan deze rekensom niet nabootsen, en het werkt. */
        let blend = false; for (let n = el; n; n = n.parentElement) { if (getComputedStyle(n).mixBlendMode !== 'normal') { blend = true; break; } }
        if (blend || /\bnt-btn\b/.test(el.className)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) < 0.2 || cs.display === 'none') continue;
        const tekst = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
        if (!tekst) continue;
        el.scrollIntoView({ block: 'center' });
        const ouder = grond(el, el);
        const eigen = parse(cs.backgroundColor);
        const vlak = eigen && eigen.a > 0.05 ? mix(eigen, ouder.c) : ouder.c;
        const kleur = parse(cs.color); if (!kleur) continue;
        const tc = ratio(mix(kleur, vlak), vlak);
        const groot = parseFloat(cs.fontSize) >= 18.66 || (parseFloat(cs.fontSize) >= 14 && Number(cs.fontWeight) >= 700);
        const tekstFout = tc < (groot ? 3 : 4.5);
        if (isLabel(el)) { if (!(eigen && eigen.a > 0.3) || el.children.length > 3) continue; }
        let vorm = 'vulling', vormFout = false;
        const vulVerschil = eigen && eigen.a > 0.05 ? ratio(vlak, ouder.c) : 1;
        if (vulVerschil < 1.3 && !isLabel(el)) {
          const bw = parseFloat(cs.borderTopWidth) || 0;
          const bc = parse(cs.borderTopColor);
          const shadow = cs.boxShadow && cs.boxShadow !== 'none';
          if (bw > 0 && bc && bc.a > 0) { const rc = ratio(mix(bc, ouder.c), ouder.c); vorm = `rand ${rc.toFixed(2)}`; vormFout = rc < 1.8; }
          else if (shadow && /inset/.test(cs.boxShadow)) { vorm = 'schaduwrand'; }
          else { vorm = 'geen vorm'; vormFout = /knop|btn/.test(el.className) && !/pijl|link|tekst/.test(el.className); }
        }
        if (tekstFout || vormFout) {
          uit.push({ klas: (typeof el.className === 'string' ? el.className : '').replace(/\s*astro-\S+/g, '').replace(/data-astro\S*/g, '').trim().slice(0, 60), tekst: tekst.slice(0, 40), tc: tc.toFixed(2), vorm, tekstFout, vormFout, beeld: ouder.beeld });
        }
      }
      return uit;
    });
    for (const f of r) {
      const k = `${f.tekstFout ? 'T' : ' '}${f.vormFout ? 'V' : ' '} ${f.klas} "${f.tekst}" · tekst ${f.tc} · ${f.vorm}${f.beeld ? ' · op beeld' : ''}`;
      if (!fouten.has(k)) fouten.set(k, new Set());
      fouten.get(k).add(`${pad} ${w}`);
    }
    await p.close();
  }
  await ctx.close();
}
await b.close();
const lijst = [...fouten.entries()].sort((a, b) => b[1].size - a[1].size);
for (const [k, v] of lijst) console.log(`${k}\n      ${[...v].slice(0, 4).join(', ')}${v.size > 4 ? ` +${v.size - 4}` : ''}`);
console.log(`\n${lijst.length} soorten · ${PADEN.length} pagina's × 2 breedtes`);
