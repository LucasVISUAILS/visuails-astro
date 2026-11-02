import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
const [basis, uit, bw = '1440', bh = '900', ...lijst] = process.argv.slice(2);
const PAGINAS = lijst.length ? lijst : JSON.parse(fs.readFileSync(new URL('./paginas.json', import.meta.url)));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +bw, height: +bh }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const res = {};
for (const p of PAGINAS) {
  try { await page.goto(basis + p, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { res[p] = { fout: String(e).slice(0, 200) }; continue; }
  await page.waitForTimeout(200);
  res[p] = await page.evaluate(() => {
    const vw = innerWidth;
    const rgb = (s) => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const naam = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; const k = [...el.classList].filter((c) => !/^vs-|^is-in$|^h-in$|^h-op$/.test(c)).slice(0, 3).join('.'); if (k) s += '.' + k; return s; };
    const pad = (el) => { const d = []; let e = el; for (let i = 0; e && i < 3; i++, e = e.parentElement) d.unshift(naam(e)); return d.join(' > '); };
    const isWit = (c) => c && c.a > 0.9 && c.r >= 254 && c.g >= 254 && c.b >= 254;
    const isVlak = (c) => c && c.a > 0.9 && Math.abs(c.r - 244) <= 1 && Math.abs(c.g - 245) <= 1 && Math.abs(c.b - 247) <= 1;
    const eigen = (el) => { const c = rgb(getComputedStyle(el).backgroundColor); return c && c.a > 0.05 ? c : null; };
    const onder = (el) => { let e = el.parentElement; while (e && e !== document.body) { const c = eigen(e); if (c) return { el: e, c }; e = e.parentElement; } return null; };
    const uit = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      const c = eigen(el); if (!c) continue;
      const wit = isWit(c), vlak = isVlak(c);
      if (!wit && !vlak) continue;
      const o = onder(el);
      // staat dit element op de grond? (geen gekleurde voorouder, of alleen witte voorouders zonder rand)
      let opGrond = !o;
      if (o && isWit(o.c)) { const ocs = getComputedStyle(o.el); const rand = ['Top','Right','Bottom','Left'].some((z) => parseFloat(ocs['border'+z+'Width']) > 0 && (rgb(ocs['border'+z+'Color'])||{a:0}).a > 0.1); opGrond = !rand && ocs.boxShadow === 'none'; }
      const randen = ['Top','Right','Bottom','Left'].map((z) => { const w = parseFloat(cs['border'+z+'Width']); const k = rgb(cs['border'+z+'Color']); return w > 0 && k && k.a > 0.1 && !isWit(k) ? w : 0; });
      uit.push({ pad: pad(el), soort: wit ? 'wit' : 'vlak', opGrond, b: Math.round(r.width), h: Math.round(r.height), rand: randen.join('/'), hoek: cs.borderTopLeftRadius, schaduw: cs.boxShadow !== 'none', vast: cs.position === 'fixed' || cs.position === 'sticky' });
    }
    return uit;
  });
}
await browser.close();
fs.writeFileSync(uit, JSON.stringify(res));
console.log('klaar', Object.keys(res).length);
