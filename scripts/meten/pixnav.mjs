/* Pixel-sampling contrast audit for chrome that stands on a PHOTOGRAPH.
 *
 * A DOM-walking audit resolves the ground by climbing to the nearest element
 * with an opaque background. Over a hero image there is no such element — the
 * ground is whatever the photographer's exposure happened to put behind the
 * glyph — so the sticky nav's real contrast is invisible to it by construction.
 * This one reads the rendered pixels instead.
 *
 * TWO THINGS THIS HAS TO GET RIGHT, and the first version got both wrong:
 *
 * 1. Do not sample inside the glyph box. Antialiased glyph edges are pixels
 *    halfway between ink and ground, and if you search a box for its
 *    worst-contrast pixel you will always find one of those and always report
 *    ~1.2:1. The ring below is strictly OUTSIDE the element rect.
 * 2. Do not report the single worst pixel of the ring either. One bright speck
 *    in a photograph is not the ground; it is a speck. The reported number is
 *    the ring's 10th-percentile contrast — the ground under the least
 *    favourable tenth of the text's footprint.
 */
import { chromium } from 'playwright';
import pngjs from 'pngjs';
const { PNG } = pngjs;

/* Needs a browser once:  npx playwright install chromium
   Point it at a preview server:  npm run build && npm run preview
   then in another shell:  ROUTES='["/","/catalog/"]' npm run audit:nav */

const lum = (r, g, b) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

const ROUTES = JSON.parse(process.env.ROUTES || '[]');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const out = [];

for (const route of ROUTES) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  try { await p.goto('http://localhost:4321' + route, { waitUntil: 'networkidle', timeout: 20000 }); } catch { await p.close(); continue; }
  await p.waitForTimeout(1000);
  for (const state of ['top', 'scrolled']) {
    if (state === 'scrolled') { await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(700); }
    const items = await p.evaluate(() => {
      const res = [];
      const SEL = '.site-header a, .site-header button, .site-header .ls, .convbar a, .convbar em, .hv-plinth *, .hero-cover *, .hv-hero-copy *';
      for (const el of document.querySelectorAll(SEL)) {
        const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
        if (!t) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 6 || r.height < 6 || r.top < 0 || r.bottom > innerHeight) continue;
        const cs = getComputedStyle(el);
        if (parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden') continue;

        /* THE THREE EXCLUSIONS, each of which is a false positive this audit
           produced before it had them.

           (a) An element that paints its own opaque ground — the nav's primary
               button, the language chip — puts its label INSIDE that fill. A
               ring outside the rect samples the header, not the label's actual
               ground, and reports a near-black label on a near-black header at
               1.02:1 while the button is in fact 10.43:1. These have a ground
               a DOM walk can resolve, so the DOM audit owns them.
           (b) Same for an element with an opaque ancestor before the section:
               it is not standing on a photograph.
           (c) Multi-line text. The ring around a wrapped block runs THROUGH
               the neighbouring line, so a white H1 measures itself against its
               own glyphs. Only single-line boxes are measured here; the H1's
               ground is covered by its own scrim, which the DOM audit sees. */
        /* 0.92, not 1.0 and not 0.5. A scrim at 86% over a photograph is NOT a
           resolvable ground — the photo still shows through it and the DOM audit
           cannot see what colour arrives — so it must be pixel-measured. Only a
           near-solid fill is handed back to the DOM audit. */
        const opaque = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return false; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return (p.length > 3 ? p[3] : 1) > 0.92; };
        if (opaque(cs.backgroundColor) || cs.backgroundImage !== 'none') continue;          // (a)
        let n = el.parentElement, blocked = false;
        while (n && n !== document.body) {
          const pcs = getComputedStyle(n);
          if (opaque(pcs.backgroundColor)) { blocked = true; break; }
          if (pcs.backgroundImage !== 'none' && !/gradient/.test(pcs.backgroundImage)) break;  // a photo: measure it
          n = n.parentElement;
        }
        if (blocked) continue;                                                               // (b)
        /* against the CONTENT box, not the padded one — a 41px nav link with
           16px of vertical padding is one line, and comparing its border box to
           a line height called every link in the header multi-line. */
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
        const content = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
                                 - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
        if (content > lh * 1.6) continue;                                                    // (c)

        res.push({ t: t.slice(0, 30), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, color: cs.color, size: parseFloat(cs.fontSize), wt: parseInt(cs.fontWeight) || 400 });
      }
      return res;
    });
    if (!items.length) continue;
    const png = PNG.sync.read(await p.screenshot());
    for (const it of items) {
      const m = it.color.match(/rgba?\(([^)]+)\)/); if (!m) continue;
      const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
      const [fr, fg, fb] = parts;
      const alpha = parts.length > 3 ? parts[3] : 1;
      const fl0 = lum(fr, fg, fb);

      const px = [];
      const X0 = Math.round(it.rect.x), Y0 = Math.round(it.rect.y);
      const X1 = Math.round(it.rect.x + it.rect.w), Y1 = Math.round(it.rect.y + it.rect.h);
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
        if (x >= X0 - 1 && x <= X1 + 1 && y >= Y0 - 1 && y <= Y1 + 1) return;   // never inside
        const i = (png.width * y + x) << 2;
        px.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
      };
      for (let d = 2; d <= 6; d++) {
        for (let x = X0 - d; x <= X1 + d; x++) { push(x, Y0 - d); push(x, Y1 + d); }
        for (let y = Y0 - d; y <= Y1 + d; y++) { push(X0 - d, y); push(X1 + d, y); }
      }
      if (px.length < 12) continue;

      const ratios = px.map(([r, g, bl]) => {
        const gl = lum(r, g, bl);
        const cr = fr * alpha + r * (1 - alpha), cg = fg * alpha + g * (1 - alpha), cb = fb * alpha + bl * (1 - alpha);
        const fl = alpha === 1 ? fl0 : lum(cr, cg, cb);
        return (Math.max(fl, gl) + 0.05) / (Math.min(fl, gl) + 0.05);
      }).sort((a, c) => a - c);
      const p10 = ratios[Math.floor(ratios.length * 0.10)];

      const large = it.size >= 24 || (it.size >= 18.66 && it.wt >= 700);
      const floor = large ? 3 : 4.5;
      out.push({ route, state, t: it.t, ratio: +p10.toFixed(2), floor, color: it.color, fail: p10 < floor - 0.005 });
    }
  }
  await p.close();
}
await b.close();
const fails = out.filter(o => o.fail);
console.log(JSON.stringify({ measured: out.length, failures: fails.length, tightest: out.slice().sort((a, c) => a.ratio - c.ratio).slice(0, 10), fails: fails.slice(0, 40) }, null, 1));
