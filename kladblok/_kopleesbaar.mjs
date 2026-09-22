/* ══════════════════════════════════════════════════════════════════════════
 * IS DE TOPBALK NOG LEESBAAR NU HIJ DOORZICHTIG IS?
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: "Let wel op of op alle pagina's de tekst nog wel goed leesbaar is."
 *
 * Een contrastmeting die de ACHTERGRONDKLEUR van de ouders optelt (zoals
 * keuring.mjs doet) kan dit niet beantwoorden: de balk is doorzichtig, dus wat
 * er achter staat is een foto, een verloop of een paneel — en dat is geen
 * kleur maar pixels. Dus meten we pixels: van elke tekst in de balk wordt het
 * vlak eronder uitgesneden en de helderste en donkerste band erin bepaald.
 * Het SLECHTSTE contrast binnen dat vlak telt, niet het gemiddelde — een letter
 * die over een lichte plek valt, is daar onleesbaar, ook al klopt het gemiddelde.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const paden = JSON.parse(readFileSync('kladblok/_paden.json', 'utf8'));
const lum = (r, g, b) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const parse = (c) => (String(c).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const slecht = [];
let gemeten = 0;

for (const pad of paden) {
  try {
    await p.goto('http://localhost:4399' + pad, { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(250);
    /* De balk even verbergen, zodat we zien wat eronder ligt. */
    const vakken = await p.evaluate(() => {
      const h = document.querySelector('.site-header');
      if (!h) return null;
      const uit = [];
      for (const el of h.querySelectorAll('a, button, span, .mk')) {
        const t = (el.textContent || '').trim();
        const r = el.getBoundingClientRect();
        if (r.height < 6 || r.width < 6 || r.top > 90) continue;
        if (!t && !el.classList.contains('mk')) continue;
        if (el.querySelector('a, button')) continue;           // alleen de bladeren
        const cs = getComputedStyle(el);
        /* Een knop met een eigen dekkende grond meet zichzelf, niet de pagina. */
        const eigenGrond = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/,\s*0\)$/.test(cs.backgroundColor);
        if (eigenGrond) continue;
        uit.push({ t: t.slice(0, 18) || 'merkteken', kleur: cs.color,
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), hh: Math.round(r.height) });
      }
      h.style.visibility = 'hidden';
      return uit;
    });
    if (!vakken || !vakken.length) continue;
    const buf = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 90 } });
    await p.evaluate(() => { const h = document.querySelector('.site-header'); if (h) h.style.visibility = ''; });
    const png = PNG.sync.read(buf);
    for (const v of vakken) {
      gemeten += 1;
      const [tr, tg, tb] = parse(v.kleur);
      const tl = lum(tr, tg, tb);
      let ergste = Infinity;
      for (let y = v.y; y < Math.min(v.y + v.hh, png.height); y += 1) {
        for (let x = v.x; x < Math.min(v.x + v.w, png.width); x += 2) {
          const i = (png.width * y + x) << 2;
          const c = contrast(tl, lum(png.data[i], png.data[i + 1], png.data[i + 2]));
          if (c < ergste) ergste = c;
        }
      }
      if (ergste < 4.5) slecht.push([pad, v.t, ergste.toFixed(2)]);
    }
  } catch (e) { slecht.push([pad, 'FOUT', e.message.slice(0, 50)]); }
}
await b.close();
console.log(`gemeten: ${gemeten} teksten op ${paden.length} pagina's`);
if (!slecht.length) console.log('alles boven 4,5:1');
else { console.log(`ONDER 4,5:1 — ${slecht.length}:`); for (const r of slecht.slice(0, 40)) console.log('  ', r.join(' · ')); }
